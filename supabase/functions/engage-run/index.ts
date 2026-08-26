// Phoxta — engage-run: the Engage tab's runtime tick. Dual-mode like
// automation-run (verify_jwt=false; each leg is guarded in-body):
//   - a member with { action:'setup', orgId }  → authorize() membership, then
//     ensureEngageSchema() — how the frontend heals a missing schema.
//   - the scheduler with x-cron-secret         → ensure schema, then
//       (a) WAKE:    waiting runs whose wake_at has passed advance through the
//                    graph executor (delays elapsing in flows AND journeys);
//       (b) TRIGGER: every live journey polls its event source past last_cursor
//                    (orders paid/fulfilled · reservations confirmed · contact
//                    tag additions), never looking back further than
//                    EVENT_LOOKBACK_MS, and starts at most one run per SOURCE
//                    EVENT (see the event key below);
//       (c) at most 100 run-advances per tick; every real send stamps
//                    engage_touches (attribution).
// Conversational flows do NOT run here — agent-inbound drives them on the
// actual inbound message (see engageHandleInbound in ./executor.ts).
import { preflight, json } from "../_shared/cors.ts";
import { authorize } from "../_shared/auth.ts";
import { adminClient, type SupabaseClient } from "../_shared/supabaseAdmin.ts";
import { ensureEngageSchema } from "../_shared/engageSchema.ts";
import { advanceRun, makeConversationDeliver, makeJourneyDeliver, type ExecCtx } from "./executor.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

const MAX_ADVANCES = 100; // per tick, shared by wakes + journey starts
const PER_FLOW_EVENTS = 20; // journey events consumed per flow per tick
// How far back a journey may ever look for trigger events. The cron ticks every
// few minutes, so this never truncates normal operation — it exists so a frozen
// cursor (a paused journey, a cron outage) can only ever release an hour of
// events on resume instead of a month's backlog.
const EVENT_LOOKBACK_MS = 60 * 60 * 1000;

async function loadContact(admin: SupabaseClient, id: string | null): Promise<Json | null> {
  if (!id) return null;
  const { data } = await admin.from("crm_contacts").select("*").eq("id", id).maybeSingle();
  return data ?? null;
}

// ── (a) wake sleeping runs ───────────────────────────────────────────────────
async function wakeDueRuns(admin: SupabaseClient, budget: { left: number }): Promise<number> {
  const nowIso = new Date().toISOString();
  const { data } = await admin
    .from("engage_runs")
    .select("*")
    .eq("status", "waiting")
    .not("wake_at", "is", null)
    .lte("wake_at", nowIso)
    .order("wake_at", { ascending: true })
    .limit(MAX_ADVANCES);
  let woke = 0;
  for (const run of ((data as Json[]) ?? [])) {
    if (budget.left <= 0) break;
    budget.left--;
    try {
      const { data: flow } = await admin
        .from("engage_flows")
        .select("id, name, kind, status, graph")
        .eq("id", run.flow_id)
        .maybeSingle();
      if (!flow || (flow as Json).status !== "live") {
        // The flow went away or was paused while this run slept — end it honestly.
        await admin.from("engage_runs").update({ status: "exited", wake_at: null, updated_at: nowIso }).eq("id", run.id);
        continue;
      }
      const contact = await loadContact(admin, run.contact_id ?? null);
      let conversation: Json | null = null;
      if (run.conversation_id) {
        const { data: c } = await admin.from("conversations").select("*").eq("id", run.conversation_id).maybeSingle();
        conversation = c ?? null;
      }
      const ctx: ExecCtx = {
        admin,
        orgId: run.organization_id,
        flow,
        run,
        contact,
        conversation,
        mode: conversation ? "flow" : "journey",
        deliver: conversation
          ? makeConversationDeliver(admin, flow, run, conversation)
          : makeJourneyDeliver(admin, flow, run, contact),
      };
      await advanceRun(ctx);
      woke++;
    } catch (e) {
      console.error("engage wake failed", run?.id, e); // keep draining
    }
  }
  return woke;
}

// ── (b) journey trigger polling ──────────────────────────────────────────────
// `key` identifies the SOURCE ROW the match came from, stable across re-polls.
// Every source table carries a before-update touch trigger, so "in the trigger
// state AND updated_at > cursor" re-matches on any later edit (an order being
// marked fulfilled on Thursday looks exactly like it being paid on Monday).
// Enrolment therefore dedupes on this key, not on elapsed time.
type EventMatch = { contactId: string | null; email: string; at: string; key: string };

async function pollJourneyEvents(admin: SupabaseClient, flow: Json, event: string, tag: string, cursor: string): Promise<EventMatch[]> {
  if (event === "order_placed") {
    // Status transitions touch updated_at (trg_orders_touch), so "paid since the
    // cursor" is the honest signal for an order having been placed/paid.
    const { data } = await admin
      .from("orders")
      .select("id, contact_id, customer_email, updated_at")
      .eq("organization_id", flow.organization_id)
      .in("status", ["paid", "fulfilled"])
      .gt("updated_at", cursor)
      .order("updated_at", { ascending: true })
      .limit(PER_FLOW_EVENTS);
    return (((data as Json[]) ?? [])).map((r) => ({ contactId: r.contact_id ?? null, email: String(r.customer_email ?? ""), at: r.updated_at, key: `order:${r.id}` }));
  }
  if (event === "reservation_confirmed") {
    const { data } = await admin
      .from("reservations")
      .select("id, contact_id, customer_email, updated_at")
      .eq("organization_id", flow.organization_id)
      .eq("status", "confirmed")
      .gt("updated_at", cursor)
      .order("updated_at", { ascending: true })
      .limit(PER_FLOW_EVENTS);
    return (((data as Json[]) ?? [])).map((r) => ({ contactId: r.contact_id ?? null, email: String(r.customer_email ?? ""), at: r.updated_at, key: `reservation:${r.id}` }));
  }
  if (event === "contact_tagged") {
    if (!tag) return [];
    // Tags live on crm_contacts.tags (text[]); the touch trigger bumps
    // updated_at on every tag write, so "has the tag + updated since the
    // cursor" only approximates a tag ADDITION — the (contact, tag) key is what
    // makes it fire once: an unrelated later edit to the contact re-matches
    // here but is rejected at enrolment.
    const { data } = await admin
      .from("crm_contacts")
      .select("id, email, updated_at")
      .eq("organization_id", flow.organization_id)
      .contains("tags", [tag])
      .gt("updated_at", cursor)
      .order("updated_at", { ascending: true })
      .limit(PER_FLOW_EVENTS);
    return (((data as Json[]) ?? [])).map((r) => ({ contactId: r.id, email: String(r.email ?? ""), at: r.updated_at, key: `tag:${r.id}:${tag}` }));
  }
  return [];
}

async function startJourneys(admin: SupabaseClient, budget: { left: number }): Promise<number> {
  const { data: journeys } = await admin
    .from("engage_flows")
    .select("*")
    .eq("kind", "journey")
    .eq("status", "live");
  let started = 0;
  for (const flow of ((journeys as Json[]) ?? [])) {
    if (budget.left <= 0) break;
    try {
      const trig = ((flow.graph?.nodes ?? []) as Json[]).find((n) => n?.type === "trigger_event");
      if (!trig) continue;
      const event = String(trig.data?.event ?? "");
      const tag = String(trig.data?.tag ?? "");
      const nowIso = new Date().toISOString();
      if (!flow.last_cursor) {
        // First tick: arm the cursor at NOW — a journey going live must never
        // replay months of historic orders/reservations onto customers.
        await admin.from("engage_flows").update({ last_cursor: nowIso }).eq("id", flow.id);
        continue;
      }
      // Clamp the cursor to the freshness window. A journey paused (status back
      // to 'draft') keeps a frozen last_cursor while events pile up, and this
      // poller only sees 'live' journeys — without the clamp, re-publishing (or
      // the cron coming back from an outage) would enrol the entire backlog in
      // one tick. Normal ticks are minutes apart, so continuity is untouched.
      const cursorMs = Date.parse(String(flow.last_cursor));
      const floorMs = Date.now() - EVENT_LOOKBACK_MS;
      const cursor = Number.isFinite(cursorMs) && cursorMs > floorMs
        ? String(flow.last_cursor)
        : new Date(floorMs).toISOString();

      const matches = await pollJourneyEvents(admin, flow, event, tag, cursor);
      let maxAt = cursor;
      for (const m of matches) {
        // Budget check BEFORE the watermark moves: an event this tick never got
        // to process must stay behind the cursor so the next tick re-polls it.
        if (budget.left <= 0) break;
        // Rows arrive ordered by updated_at ascending, so the last one we take a
        // decision on (enrol, dedupe, no contact) is the new watermark.
        maxAt = m.at;
        // Resolve the contact (orders/reservations may only carry an email).
        let contactId = m.contactId;
        if (!contactId && m.email) {
          const { data: c } = await admin
            .from("crm_contacts")
            .select("id")
            .eq("organization_id", flow.organization_id)
            .eq("email", m.email)
            .limit(1)
            .maybeSingle();
          contactId = (c as Json)?.id ?? null;
        }
        if (!contactId) continue; // no contact — nobody to walk through the journey
        // Dedupe on the SOURCE EVENT ROW. A time window can't do this job: the
        // same order re-matches whenever staff touch it (fulfilled, refunded,
        // a note edited), and once the window has lapsed the customer gets
        // thanked for that one order all over again. One run per event key,
        // forever. `state` is jsonb, so the key rides along on the run itself.
        const { data: seen } = await admin
          .from("engage_runs")
          .select("id")
          .eq("flow_id", flow.id)
          .eq("state->>event_key", m.key)
          .limit(1);
        if ((seen as Json[] | null)?.length) continue;
        // And never run the same contact through one journey twice at once.
        const { data: inflight } = await admin
          .from("engage_runs")
          .select("id")
          .eq("flow_id", flow.id)
          .eq("contact_id", contactId)
          .in("status", ["active", "waiting"])
          .limit(1);
        if ((inflight as Json[] | null)?.length) continue;

        budget.left--;
        const contact = await loadContact(admin, contactId);
        const { data: run, error: runErr } = await admin
          .from("engage_runs")
          .insert({
            flow_id: flow.id,
            organization_id: flow.organization_id,
            contact_id: contactId,
            node_id: trig.id,
            status: "active",
            state: { event_key: m.key },
          })
          .select("*")
          .single();
        if (runErr || !run) continue;
        const ctx: ExecCtx = {
          admin,
          orgId: flow.organization_id,
          flow,
          run,
          contact,
          conversation: null,
          mode: "journey",
          deliver: makeJourneyDeliver(admin, flow, run, contact),
        };
        await advanceRun(ctx);
        started++;
      }
      // Only a processed event moves the stored watermark. A stale cursor left
      // behind by a pause is harmless (the clamp above re-applies every tick)
      // and writing one every tick would churn engage_flows.updated_at, which
      // orders the console's list.
      if (maxAt !== cursor) {
        await admin.from("engage_flows").update({ last_cursor: maxAt }).eq("id", flow.id);
      }
    } catch (e) {
      console.error("engage journey poll failed", flow?.id, e); // keep going
    }
  }
  return started;
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const body = (await req.json().catch(() => ({}))) as Json;

    // Cron leg — same idiom as ops-maintenance.
    const presented = req.headers.get("x-cron-secret");
    const cronSecrets = [Deno.env.get("CRON_SECRET"), Deno.env.get("BILLING_CRON_SECRET")].filter(Boolean);
    const isCron = !!presented && cronSecrets.includes(presented);

    if (!isCron) {
      // Member leg: schema self-heal from the Engage tab.
      if (body?.action === "setup") {
        const a = await authorize(req, body?.orgId);
        if (a.error) return a.error;
        await ensureEngageSchema();
        return json({ ok: true });
      }
      return json({ error: "Cron only (members: action:'setup')." }, 401);
    }

    await ensureEngageSchema();
    const admin = adminClient();
    const budget = { left: MAX_ADVANCES };
    const woke = await wakeDueRuns(admin, budget);
    const started = await startJourneys(admin, budget);
    return json({ ok: true, woke, started, budget_left: budget.left });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
