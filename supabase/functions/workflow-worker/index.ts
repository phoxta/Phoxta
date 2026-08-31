// Phoxta — workflow-worker: executes the durable workflow engine.
// Processes pending workflow_runs (fanned out by triggers when automations fire),
// running each step and recording observable, replayable state. Email send is
// pluggable (Resend) and degrades to "simulated" without keys.
//
// Schedule-only. requireUser used to admit any signed-in user of any tenant,
// who could then drain (and so send the automation emails of) every business
// on the platform. Nothing in the console calls this — drainWorkflows() in
// src/lib/db/ops/ai.ts is exported and unused — so there is no member leg to
// keep: the cron tick (integrations/worker-cron/ping.sh) is the only caller.
import { preflight, json } from "../_shared/cors.ts";
import { requireCron } from "../_shared/auth.ts";
import { adminClient, type SupabaseClient } from "../_shared/supabaseAdmin.ts";
import { orgReplyTo } from "../_shared/conversationEmail.ts";
import { renderSimple } from "../_shared/email.ts";

// deno-lint-ignore no-explicit-any
type Json = any;
const BATCH = 20;
/** A run 'running' for longer than this was abandoned by a worker that died. */
const STALE_MINUTES = 10;

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

/**
 * One automation email, from the BUSINESS.
 *
 * `replyTo` is not optional. This mail is sent to a tenant's customer and its
 * default body literally says "just reply to this email" — and it set no
 * Reply-To at all, so a reply went to RESEND_FROM, whose subdomain has no MX and
 * hard-bounces. Where it did reach a mailbox it reached PHOXTA's, which
 * dogfoods gmail-sync, so another company's customer ended up in a threaded
 * exchange with the wrong business. The caller resolves the tenant's own address
 * and does not send without one.
 */
async function sendEmail(to: string, subject: string, body: string, replyTo: string): Promise<{ status: string }> {
  const key = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM");
  if (!key || !from || !to) return { status: "simulated" };
  if (!replyTo) return { status: "no-reply-address" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, reply_to: replyTo, ...(() => {
        const m = renderSimple(subject, body);
        return { html: m.html, text: m.text };
      })() }),
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

  const gate = requireCron(req);
  if (gate.error) return gate.error;

  const admin = adminClient();
  // A heartbeat, so cron_heartbeats proves THIS worker ran rather than only
  // proving the loop that pings it is alive.
  const beat = async (ok: boolean, detail: string) => {
    try { await admin.rpc("app_cron_beat", { p_worker: "workflow-worker", p_ok: ok, p_detail: detail }); } catch { /* the tick still ran */ }
  };

  try {
    // Reaper: a run left 'running' by a worker that died is failed with a
    // reason rather than shown as running for ever. Not retried — its steps may
    // have half-happened (an email sent, a tag added) and the console can show
    // exactly which from `steps`.
    const cutoff = new Date(Date.now() - STALE_MINUTES * 60_000).toISOString();
    const { data: stale } = await admin
      .from("workflow_runs")
      .update({ status: "failed", error: "the worker stopped before this run finished" })
      .eq("status", "running")
      .lt("updated_at", cutoff)
      .select("id");
    const reaped = ((stale as { id: string }[] | null) ?? []).length;

    const { data: pending } = await admin
      .from("workflow_runs")
      .select("id, organization_id, automation_id, trigger, input")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(BATCH);

    const candidates = (pending as { id: string; organization_id: string; automation_id: string | null; trigger: string; input: Json }[] | null) ?? [];
    let processed = 0;
    let failed = 0;
    let taken = 0;

    for (const r of candidates) {
      // The claim: pending → running WITH the status predicate. Two overlapping
      // ticks (or the tick and a future console nudge) both read the same
      // pending rows; an UPDATE … WHERE status = 'pending' either takes the row
      // or takes nothing, so a run cannot execute twice.
      const { data: got } = await admin
        .from("workflow_runs")
        .update({ status: "running" })
        .eq("id", r.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      if (!got) continue;
      taken++;
      const steps: Json[] = [];
      try {
        const { data: automation } = await admin.from("automations").select("name, action, config, runs").eq("id", r.automation_id).maybeSingle();
        const action = automation?.action ?? "notify";
        const source = await loadSource(admin, r.trigger, r.input?.source_id);
        const recipient = source?.customer_email || source?.email || "";
        const who = source?.customer_name || source?.name || "a customer";

        if (action === "send_email") {
          // Owner-authored subject/body from the automation's config, with
          // {{name}} / {{business}} substitution; sensible defaults otherwise.
          const { data: orgRow } = await admin.from("organizations").select("name").eq("id", r.organization_id).maybeSingle();
          const business = (orgRow as { name?: string } | null)?.name || "your business";
          const fill = (s: string) => s.replaceAll("{{name}}", who).replaceAll("{{business}}", business);
          const cfg = (automation?.config ?? {}) as Json;
          const subject = fill(
            String(cfg?.subject ?? "").trim() || `${automation?.name ?? "An update"} from ${business}`,
          );
          const bodyText = fill(
            String(cfg?.body ?? "").trim() || `Hi ${who}, thanks for being a customer of ${business}. This is a quick automated update from us — just reply to this email if you have any questions.`,
          );
          const res = await sendEmail(recipient, subject, bodyText, await orgReplyTo(admin, r.organization_id));
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
        failed++;
      }
    }

    const detail = `${processed} succeeded, ${failed} failed of ${taken} claimed` + (reaped ? `; ${reaped} stale run(s) failed by the reaper` : "");
    // Every claimed run failing is a broken tick, and a broken tick says so in
    // its status code: the VM log sees only that.
    const totalFailure = taken > 0 && processed === 0;
    await beat(!totalFailure, detail);
    return json({ processed, failed, reaped }, totalFailure ? 502 : 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("workflow-worker error", msg);
    await beat(false, msg);
    return json({ error: "Worker error.", detail: msg, processed: 0 }, 500);
  }
});
