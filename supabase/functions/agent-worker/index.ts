// Phoxta — agent-worker: runs the outbound engine durably.
// (1) Auto-generates appointment-reminder tasks from upcoming bookings.
// (2) Drains due outbound_tasks: the agent writes the message, then it's
// dispatched via the transport adapters (Vapi/Retell voice, Twilio SMS, Resend
// email) — degrading to "simulated" without provider keys. pg_cron in prod.
import { preflight, json } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { adminClient, type SupabaseClient } from "../_shared/supabaseAdmin.ts";
import { callMessages } from "../_shared/anthropic.ts";
import { modelFor } from "../_shared/models.ts";
import { meter } from "../_shared/meter.ts";
import { dispatch, placeAiCall } from "../_shared/dispatch.ts";
import { loadConfig } from "../_shared/agentCore.ts";

// deno-lint-ignore no-explicit-any
type Json = any;
const BATCH = 20;

async function generateReminders(admin: SupabaseClient): Promise<number> {
  const soon = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
  const { data: bookings } = await admin
    .from("bookings")
    .select("id, organization_id, customer_name, customer_email, start_at, status")
    .gte("start_at", new Date().toISOString())
    .lte("start_at", soon)
    .in("status", ["pending", "confirmed"])
    .limit(50);
  let created = 0;
  for (const b of (bookings as Json[] | null) ?? []) {
    const { data: existing } = await admin
      .from("outbound_tasks")
      .select("id")
      .eq("organization_id", b.organization_id)
      .eq("type", "reminder")
      .contains("payload", { booking_id: b.id })
      .maybeSingle();
    if (existing) continue;
    await admin.from("outbound_tasks").insert({
      organization_id: b.organization_id,
      type: "reminder",
      channel: b.customer_email ? "email" : "sms",
      to_ref: b.customer_email || "",
      customer_name: b.customer_name,
      due_at: new Date().toISOString(),
      payload: { booking_id: b.id, start_at: b.start_at },
    });
    created++;
  }
  return created;
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  const auth = await requireUser(req);
  if ("error" in auth) return auth.error;

  try {
    const admin = adminClient();
    const reminders = await generateReminders(admin);

    const { data: pending } = await admin
      .from("outbound_tasks")
      .select("*")
      .eq("status", "queued")
      .lte("due_at", new Date().toISOString())
      .order("due_at", { ascending: true })
      .limit(BATCH);

    const tasks = (pending as Json[] | null) ?? [];
    let processed = 0;

    for (const t of tasks) {
      await admin.from("outbound_tasks").update({ status: "in_progress", attempts: (t.attempts ?? 0) + 1 }).eq("id", t.id);
      try {
        const { data: org } = await admin.from("organizations").select("id, name, vertical").eq("id", t.organization_id).maybeSingle();
        if (!org) {
          await admin.from("outbound_tasks").update({ status: "failed", outcome: "org missing" }).eq("id", t.id);
          continue;
        }
        const config = await loadConfig(admin, t.organization_id);
        const { data: campaign } = t.campaign_id
          ? await admin.from("outbound_campaigns").select("type, goal, script").eq("id", t.campaign_id).maybeSingle()
          : { data: null };
        const c = (campaign as Json) ?? { type: t.type, goal: "", script: "" };

        const subject = `${(org as Json).name}`;
        const system =
          `You are ${config.display_name}, the AI agent for "${(org as Json).name}". Persona: ${config.persona}. ` +
          `You are sending an outbound ${c.type} via ${t.channel}. Goal: ${c.goal || c.type}. ${c.script ? `Guide: ${c.script}.` : ""} ` +
          (t.payload?.start_at ? `Appointment at ${new Date(t.payload.start_at).toLocaleString()}. ` : "") +
          "Write one short, natural, human message. Respond only with the message text.";
        const t0 = Date.now();
        const r = await callMessages({ model: modelFor(config.model_tier ?? "balanced"), system, messages: [{ role: "user", content: `To: ${t.customer_name || "customer"}.` }], maxTokens: 300 });
        await meter(admin, { organizationId: t.organization_id, model: r.model, feature: "agent_outbound", tier: config.model_tier ?? "balanced", inTok: r.inTok, outTok: r.outTok, latencyMs: Date.now() - t0 });

        // Calls go through the business's own Pipecat agent (placeAiCall);
        // everything else through the messaging adapters.
        let res: { status: string; provider: string };
        if (t.channel === "call") {
          const { data: cfg } = await admin.from("agent_config").select("public_key").eq("organization_id", t.organization_id).maybeSingle();
          const cr = (cfg as Json)?.public_key ? await placeAiCall((cfg as Json).public_key, t.to_ref) : { ok: false, status: "simulated" as const };
          res = { status: cr.status, provider: cr.status === "simulated" ? "none" : "pipecat" };
        } else {
          res = await dispatch(t.channel, t.to_ref, subject, r.text);
        }

        if (t.channel === "call") {
          await admin.from("call_logs").insert({
            organization_id: t.organization_id,
            conversation_id: t.conversation_id,
            direction: "outbound",
            to_number: t.to_ref,
            outcome: res.status === "dialing" ? "dialing" : res.status,
          });
        }
        await admin
          .from("outbound_tasks")
          .update({ status: res.status === "failed" ? "failed" : "done", outcome: `${res.provider}:${res.status}`, payload: { ...t.payload, message: r.text } })
          .eq("id", t.id);
        processed++;
      } catch (e) {
        await admin.from("outbound_tasks").update({ status: "failed", outcome: e instanceof Error ? e.message : String(e) }).eq("id", t.id);
      }
    }

    return json({ processed, reminders });
  } catch (err) {
    console.error("agent-worker error", err);
    return json({ error: "Worker error.", processed: 0 }, 200);
  }
});
