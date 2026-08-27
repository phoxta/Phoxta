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
import { callRateLimited, checkDestination } from "../_shared/telephony.ts";
import { orgReplyTo } from "../_shared/conversationEmail.ts";

// deno-lint-ignore no-explicit-any
type Json = any;
const BATCH = 20;

/** A usable email address, or "". A queue row's `to_ref` reached this worker
 *  straight off an anonymous web form, so it is checked here as well as where it
 *  was written — a row in a queue is not permission to send. */
const EMAIL_RE = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[a-z]{2,}$/i;

/**
 * Is this task's destination one we are allowed to reach?
 *
 * NOTHING checked this. `to_ref` is written by agent-inbound's instant-callback
 * branch from an unauthenticated request body, and the whole
 * HIGH_RISK_PREFIXES / CALLING_ALLOWED_PREFIXES policy lives in
 * checkDestination, which this worker never called — dispatch.ts's `dialable()`
 * only normalises to E.164, it permits nothing. So a queued row named a premium
 * -rate or satellite number and this worker dialled it, twenty at a time, every
 * five minutes. place-call and voice-outgoing have always run this check; the
 * queue is the third door into the same dialler and it was standing open.
 */
function taskDestination(channel: string, toRef: string): { ok: true; to: string } | { ok: false; error: string } {
  const raw = String(toRef ?? "").trim();
  if (!raw) return { ok: false, error: "the task has no destination on it" };
  if (channel === "call" || channel === "sms") {
    const dest = checkDestination(raw);
    return dest.ok ? { ok: true, to: dest.to } : { ok: false, error: dest.error };
  }
  if (channel === "email") {
    return EMAIL_RE.test(raw) && raw.length <= 254
      ? { ok: true, to: raw.toLowerCase() }
      : { ok: false, error: `"${raw}" is not a usable email address` };
  }
  return { ok: false, error: `unknown channel "${channel}"` };
}

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
    // No address, no reminder. `bookings` has no phone column, so the old
    // expression queued an SMS task with an EMPTY to_ref whenever the booking had
    // no email — a row that could never be delivered, retried on every run.
    const to = String(b.customer_email ?? "").trim();
    if (!to) continue;
    await admin.from("outbound_tasks").insert({
      organization_id: b.organization_id,
      type: "reminder",
      channel: "email",
      to_ref: to,
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

        // --- WHERE IS THIS GOING, AND MAY WE GO THERE? Before the model turn,
        //     because a destination we will not dial is not worth composing for,
        //     and — far more importantly — because this is the only thing between
        //     an anonymous web form and the shared platform dialler. ---
        const dest = taskDestination(String(t.channel), String(t.to_ref ?? ""));
        if (!dest.ok) {
          await admin.from("outbound_tasks").update({ status: "failed", outcome: dest.error }).eq("id", t.id);
          console.warn(`[phoxta] agent-worker refused task ${t.id}: ${dest.error}`);
          continue;
        }
        // The per-org outbound call ceiling, applied to the QUEUE as well as to
        // the console's click-to-call. Not a failure — the task goes back on the
        // queue for the next tick, so a genuine burst is spread rather than lost.
        if (t.channel === "call" && (await callRateLimited(admin, String(t.organization_id)))) {
          await admin
            .from("outbound_tasks")
            .update({
              status: "queued",
              attempts: t.attempts ?? 0,
              due_at: new Date(Date.now() + 15 * 60_000).toISOString(),
              outcome: "waiting: this business is over its hourly outbound-call limit",
            })
            .eq("id", t.id);
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
        await meter(admin, { organizationId: t.organization_id, model: r.model, feature: "agent_outbound", tier: config.model_tier ?? "balanced", inTok: r.inTok, outTok: r.outTok, cacheWriteTok: r.cacheWriteTok, cacheReadTok: r.cacheReadTok, latencyMs: Date.now() - t0 });

        // Calls go through the business's own Pipecat agent (placeAiCall);
        // everything else through the messaging adapters.
        let res: { status: string; provider: string };
        if (t.channel === "call") {
          const { data: cfg } = await admin.from("agent_config").select("public_key").eq("organization_id", t.organization_id).maybeSingle();
          // The CHECKED, normalised destination — never the raw queue value.
          const cr = (cfg as Json)?.public_key ? await placeAiCall((cfg as Json).public_key, dest.to) : { ok: false, status: "simulated" as const };
          res = { status: cr.status, provider: cr.status === "simulated" ? "none" : "pipecat" };
        } else {
          // WHOSE ADDRESS DOES THE REPLY GO TO? dispatch() defaults every
          // Reply-To to hello@phoxta.com, so an appointment reminder sent on a
          // tenant's behalf put PHOXTA's mailbox on it: the customer's reply left
          // the business entirely and landed with the platform, which dogfoods
          // gmail-sync and would then answer another company's customer as
          // Phoxta. orgReplyTo resolves the business's own address; when it
          // cannot, the mail is NOT sent — a reminder nobody can reply to beats
          // one that hands the conversation to a different company.
          const replyTo = await orgReplyTo(admin, String(t.organization_id));
          if (!replyTo) {
            await admin
              .from("outbound_tasks")
              .update({ status: "failed", outcome: "no address for this business could be found to receive the customer's reply — add a billing email in Settings, or connect Google" })
              .eq("id", t.id);
            continue;
          }
          res = await dispatch(String(t.channel), dest.to, subject, r.text, { replyTo });
        }

        if (t.channel === "call") {
          await admin.from("call_logs").insert({
            organization_id: t.organization_id,
            conversation_id: t.conversation_id,
            direction: "outbound",
            to_number: dest.to,
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
