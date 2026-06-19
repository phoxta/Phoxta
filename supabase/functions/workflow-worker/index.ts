// Phoxta — workflow-worker: executes the durable workflow engine.
// Processes pending workflow_runs (fanned out by triggers when automations fire),
// running each step and recording observable, replayable state. Email send is
// pluggable (Resend) and degrades to "simulated" without keys.
import { preflight, json } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { adminClient, type SupabaseClient } from "../_shared/supabaseAdmin.ts";

// deno-lint-ignore no-explicit-any
type Json = any;
const BATCH = 20;

const SOURCE_TABLE: Record<string, string> = {
  contact_created: "crm_contacts",
  order_paid: "orders",
  booking_created: "bookings",
  ticket_created: "tickets",
};

async function loadSource(admin: SupabaseClient, trigger: string, id: string): Promise<Json> {
  const table = SOURCE_TABLE[trigger];
  if (!table || !id) return null;
  const { data } = await admin.from(table).select("*").eq("id", id).maybeSingle();
  return data;
}

async function sendEmail(to: string, subject: string, body: string): Promise<{ status: string }> {
  const key = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM");
  if (!key || !from || !to) return { status: "simulated" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html: `<p>${body}</p>` }),
    });
    return { status: res.ok ? "sent" : "failed" };
  } catch (_) {
    return { status: "failed" };
  }
}

async function notifyOrgAdmins(admin: SupabaseClient, orgId: string, title: string, bodyText: string) {
  const { data: members } = await admin
    .from("organization_memberships")
    .select("user_id, role")
    .eq("organization_id", orgId)
    .in("role", ["owner", "admin"]);
  const rows = ((members as { user_id: string }[] | null) ?? []).map((m) => ({
    user_id: m.user_id,
    title,
    body: bodyText,
    kind: "info",
    link: "/dashboard/businesses",
  }));
  if (rows.length) await admin.from("notifications").insert(rows);
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  const auth = await requireUser(req);
  if ("error" in auth) return auth.error;

  try {
    const admin = adminClient();
    const { data: pending } = await admin
      .from("workflow_runs")
      .select("id, organization_id, automation_id, trigger, input")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(BATCH);

    const runs = (pending as { id: string; organization_id: string; automation_id: string | null; trigger: string; input: Json }[] | null) ?? [];
    let processed = 0;

    for (const r of runs) {
      await admin.from("workflow_runs").update({ status: "running" }).eq("id", r.id);
      const steps: Json[] = [];
      try {
        const { data: automation } = await admin.from("automations").select("name, action, config, runs").eq("id", r.automation_id).maybeSingle();
        const action = automation?.action ?? "notify";
        const source = await loadSource(admin, r.trigger, r.input?.source_id);
        const recipient = source?.customer_email || source?.email || "";
        const who = source?.customer_name || source?.name || "a customer";

        if (action === "send_email") {
          const subject = `${automation?.name ?? "Automation"} — ${r.trigger.replace("_", " ")}`;
          const res = await sendEmail(recipient, subject, `Hi ${who}, this is an automated message from your business.`);
          steps.push({ type: "send_email", to: recipient, status: res.status });
        } else if (action === "add_tag") {
          const tag = (automation?.config?.tag as string) || "automation";
          if (r.trigger === "contact_created" && source) {
            const tags = Array.isArray(source.tags) ? Array.from(new Set([...source.tags, tag])) : [tag];
            await admin.from("crm_contacts").update({ tags }).eq("id", source.id);
            steps.push({ type: "add_tag", tag, contact: source.id });
          } else {
            steps.push({ type: "add_tag", skipped: "no contact in scope" });
          }
        } else if (action === "create_task" || action === "notify") {
          await notifyOrgAdmins(admin, r.organization_id, automation?.name ?? "Automation ran", `${r.trigger.replace("_", " ")} for ${who}.`);
          steps.push({ type: action, notified: true });
        } else {
          steps.push({ type: action, skipped: "unsupported" });
        }

        await admin
          .from("workflow_runs")
          .update({ status: "succeeded", steps, output: { ok: true } })
          .eq("id", r.id);
        await admin.from("automations").update({ runs: ((automation as Json)?.runs ?? 0) + 1 }).eq("id", r.automation_id);
        processed++;
      } catch (e) {
        await admin
          .from("workflow_runs")
          .update({ status: "failed", steps, error: e instanceof Error ? e.message : String(e) })
          .eq("id", r.id);
      }
    }

    return json({ processed });
  } catch (err) {
    console.error("workflow-worker error", err);
    return json({ error: "Worker error.", processed: 0 }, 200);
  }
});
