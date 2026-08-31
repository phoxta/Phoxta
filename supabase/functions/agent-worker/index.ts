// Phoxta — agent-worker: runs the outbound engine durably.
// (1) Auto-generates appointment-reminder tasks from upcoming bookings.
// (2) Drains due outbound_tasks: the agent writes the message, then it's
// dispatched via the transport adapters (Vapi/Retell voice, Twilio SMS, Resend
// email) — degrading to "simulated" without provider keys.
//
// Two ways in:
//   - the scheduler (x-cron-secret)  → every business's due tasks
//   - a signed-in member (the console's runAgentWorker nudge, src/lib/db/ops/
//     agent.ts) → ONLY the businesses they belong to. A member's session used
//     to drain the whole platform's queue.
//
// ── WHY TASKS ARE CLAIMED, AND WHY in_progress IS NO LONGER FOR EVER ─────────
//
// It used to SELECT twenty queued rows, then UPDATE each to in_progress with no
// status predicate. The dashboard nudge is fire-and-forget and the cron ticks
// every five minutes, so two runs routinely overlapped, both read the same
// rows, and a customer got the same reminder twice — on a channel that costs
// money per message. And a run that died mid-task (a function timeout, a
// provider hanging) left the row in_progress, which nothing ever looked at
// again: the task was neither done nor retried, and the console showed it
// "in progress" for ever.
//
// Now the claim is one statement (app_claim_outbound_tasks, 0129: FOR UPDATE
// SKIP LOCKED, queued → in_progress, attempts counted, claimed_at stamped), a
// reaper runs first each tick (in_progress older than ten minutes goes back to
// queued under three attempts, else failed with a reason), and one reminder per
// booking is a unique index rather than a read-then-insert.
import { preflight, json } from "../_shared/cors.ts";
import { isCronRequest, requireMemberOrgs } from "../_shared/auth.ts";
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
/** A claim older than this with no write-back is a run that died. */
const STALE_MINUTES = 10;

/** PostgREST's "that function does not exist" — the migration is behind the deploy. */
const isMissingFn = (e: { code?: string; message?: string } | null): boolean =>
  !!e && (e.code === "PGRST202" || e.code === "42883" || /schema cache|does not exist/i.test(e.message ?? ""));

/**
 * Claim due tasks. The RPC is the real thing; the fallback is for a deploy that
 * landed ahead of migration 0129 and is a per-row conditional update — an
 * UPDATE … WHERE status = 'queued' either takes the row or takes nothing, so
 * even the fallback cannot hand one task to two runs. What it lacks is SKIP
 * LOCKED, so two runs contend rather than divide the queue.
 */
async function claimTasks(admin: SupabaseClient, orgs: string[] | null): Promise<{ tasks: Json[]; claimed: boolean }> {
  const { data, error } = await admin.rpc("app_claim_outbound_tasks", { p_limit: BATCH, p_orgs: orgs });
  if (!error) return { tasks: (data as Json[] | null) ?? [], claimed: true };
  if (!isMissingFn(error)) throw new Error(`claim failed: ${error.message}`);
  console.warn("[phoxta] agent-worker: app_claim_outbound_tasks is missing (apply migration 0129) — claiming row by row");
  let q = admin
    .from("outbound_tasks")
    .select("*")
    .eq("status", "queued")
    .lte("due_at", new Date().toISOString())
    .order("due_at", { ascending: true })
    .limit(BATCH);
  if (orgs) q = q.in("organization_id", orgs);
  const { data: pending } = await q;
  const taken: Json[] = [];
  for (const t of (pending as Json[] | null) ?? []) {
    const { data: got } = await admin
      .from("outbound_tasks")
      .update({ status: "in_progress", attempts: (t.attempts ?? 0) + 1 })
      .eq("id", t.id)
      .eq("status", "queued")
      .select("*")
      .maybeSingle();
    if (got) taken.push(got);
  }
  return { tasks: taken, claimed: false };
}

/** Put abandoned claims back (or give up on them). Best-effort: a missing RPC
 *  means the migration is behind, and the tick still runs. */
async function reapStale(admin: SupabaseClient): Promise<{ requeued: number; failed: number }> {
  const { data, error } = await admin.rpc("app_reap_outbound_tasks", { p_stale_minutes: STALE_MINUTES });
  if (error) {
    if (!isMissingFn(error)) console.warn("[phoxta] agent-worker: reaper failed:", error.message);
    return { requeued: 0, failed: 0 };
  }
  const r = (data ?? {}) as { requeued?: number; failed?: number };
  return { requeued: Number(r.requeued ?? 0), failed: Number(r.failed ?? 0) };
}

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

async function generateReminders(admin: SupabaseClient, orgs: string[] | null): Promise<number> {
  const soon = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
  let q = admin
    .from("bookings")
    .select("id, organization_id, customer_name, customer_email, start_at, status")
    .gte("start_at", new Date().toISOString())
    .lte("start_at", soon)
    .in("status", ["pending", "confirmed"])
    .limit(50);
  if (orgs) q = q.in("organization_id", orgs);
  const { data: bookings } = await q;
  let created = 0;
  for (const b of (bookings as Json[] | null) ?? []) {
    // Cheap pre-check, kept because it saves an insert on every tick for every
    // booking in the window. It is NOT what makes this correct: two overlapping
    // runs both pass it. The unique index (0129, one reminder per booking) is,
    // and its refusal is handled below.
    const { data: existing } = await admin
      .from("outbound_tasks")
      .select("id")
      .eq("organization_id", b.organization_id)
      .eq("type", "reminder")
      .contains("payload", { booking_id: b.id })
      .limit(1)
      .maybeSingle();
    if (existing) continue;
    // No address, no reminder. `bookings` has no phone column, so the old
    // expression queued an SMS task with an EMPTY to_ref whenever the booking had
    // no email — a row that could never be delivered, retried on every run.
    const to = String(b.customer_email ?? "").trim();
    if (!to) continue;
    const { error } = await admin.from("outbound_tasks").insert({
      organization_id: b.organization_id,
      type: "reminder",
      channel: "email",
      to_ref: to,
      customer_name: b.customer_name,
      due_at: new Date().toISOString(),
      payload: { booking_id: b.id, start_at: b.start_at },
    });
    if (error) {
      // 23505 = the other run got there first. Not a failure: the reminder exists.
      if (error.code !== "23505") console.warn("[phoxta] agent-worker: could not queue a reminder:", error.message);
      continue;
    }
    created++;
  }
  return created;
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  // Who is asking decides how wide the drain is.
  const cron = isCronRequest(req);
  let orgs: string[] | null = null;
  if (!cron) {
    const who = await requireMemberOrgs(req);
    if (who.error) return who.error;
    orgs = who.orgIds;
  }

  const admin = adminClient();
  // A heartbeat, so cron_heartbeats proves THIS worker ran rather than only
  // proving the loop that pings it is alive. Scheduled leg only.
  const beat = async (ok: boolean, detail: string) => {
    if (!cron) return;
    try { await admin.rpc("app_cron_beat", { p_worker: "agent-worker", p_ok: ok, p_detail: detail }); } catch { /* the tick still ran */ }
  };

  try {
    // Reap before claiming, so a task abandoned by the previous tick is back on
    // the queue in time to be taken by this one.
    const reaped = cron ? await reapStale(admin) : { requeued: 0, failed: 0 };
    const reminders = await generateReminders(admin, orgs);
    const { tasks, claimed } = await claimTasks(admin, orgs);
    let processed = 0;
    let failed = 0;

    for (const t of tasks) {
      // Already in_progress with this attempt counted — the claim did that.
      try {
        const { data: org } = await admin.from("organizations").select("id, name, vertical").eq("id", t.organization_id).maybeSingle();
        if (!org) {
          await admin.from("outbound_tasks").update({ status: "failed", outcome: "org missing" }).eq("id", t.id);
          failed++;
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
          failed++;
          continue;
        }
        // The per-org outbound call ceiling, applied to the QUEUE as well as to
        // the console's click-to-call. Not a failure — the task goes back on the
        // queue for the next tick, so a genuine burst is spread rather than lost.
        if (t.channel === "call" && (await callRateLimited(admin, String(t.organization_id)))) {
          // The claim counted an attempt; a rate-limit deferral is not one, so
          // it is handed back. (The RPC returned the row AFTER its increment.)
          await admin
            .from("outbound_tasks")
            .update({
              status: "queued",
              attempts: Math.max(0, Number(t.attempts ?? 1) - 1),
              claimed_at: null,
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
            failed++;
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
        if (res.status === "failed") failed++; else processed++;
      } catch (e) {
        await admin.from("outbound_tasks").update({ status: "failed", outcome: e instanceof Error ? e.message : String(e) }).eq("id", t.id);
        failed++;
      }
    }

    const detail =
      `${processed} sent, ${failed} failed of ${tasks.length} claimed; ${reminders} reminder(s) queued` +
      (reaped.requeued || reaped.failed ? `; reaper requeued ${reaped.requeued}, gave up on ${reaped.failed}` : "") +
      (claimed ? "" : " — ROW-BY-ROW CLAIM, apply migration 0129");
    // Claimed work and none of it went out is a broken tick; say so in the code.
    const totalFailure = tasks.length > 0 && processed === 0 && failed === tasks.length;
    await beat(!totalFailure && claimed, detail);
    return json({ processed, failed, reminders, reaped, ...(claimed ? {} : { warning: "row-by-row claim — apply migration 0129" }) }, totalFailure ? 502 : 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("agent-worker error", msg);
    await beat(false, msg);
    return json({ error: "Worker error.", detail: msg, processed: 0 }, 500);
  }
});
