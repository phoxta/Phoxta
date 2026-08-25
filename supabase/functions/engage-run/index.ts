// Phoxta — engage-run: the Engage tab's runtime tick. Dual-mode like
// automation-run (verify_jwt=false; each leg is guarded in-body):
//   - a member with { action:'setup', orgId }  → authorize() membership, then
//     ensureEngageSchema() — how the frontend heals a missing schema.
//   - the scheduler with x-cron-secret         → ensure schema, then
//       (a) WAKE:    waiting runs whose wake_at has passed advance through the
//                    graph executor (delays elapsing in flows AND journeys);
//       (b) TRIGGER: every live journey polls its event source past last_cursor
//                    (orders paid/fulfilled · reservations confirmed · contact
//                    tag additions) and starts one run per matched contact;
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
type EventMatch = { contactId: string | null; email: string; at: string };

async function pollJourneyEvents(admin: SupabaseClient, flow: Json, event: string, tag: string, cursor: string): Promise<EventMatch[]> {
  if (event === "order_placed") {
    // Status transitions touch updated_at (trg_orders_touch), so "paid since the
    // cursor" is the honest signal for an order having been placed/paid.
    const { data } = await admin
      .from("orders")
      .select("contact_id, customer_email, updated_at")
      .eq("organization_id", flow.organization_id)
      .in("status", ["paid", "fulfilled"])
      .gt("updated_at", cursor)
      .order("updated_at", { ascending: true })
      .limit(PER_FLOW_EVENTS);
    return (((data as Json[]) ?? [])).map((r) => ({ contactId: r.contact_id ?? null, email: String(r.customer_email ?? ""), at: r.updated_at }));
  }
  if (event === "reservation_confirmed") {
    const { data } = await admin
      .from("reservations")
      .select("contact_id, customer_email, updated_at")
      .eq("organization_id", flow.organization_id)
      .eq("status", "confirmed")
      .gt("updated_at", cursor)
      .order("updated_at", { ascending: true })
      .limit(PER_FLOW_EVENTS);
    return (((data as Json[]) ?? [])).map((r) => ({ contactId: r.contact_id ?? null, email: String(r.customer_email ?? ""), at: r.updated_at }));
  }
  if (event === "contact_tagged") {
    if (!tag) return [];
    // Tags live on crm_contacts.tags (text[]); the touch trigger bumps
    // updated_at on every tag write, so "has the tag + updated since the
    // cursor" approximates a tag ADDITION (the 24h run-dedupe absorbs the
    // false re-fires an unrelated contact edit could cause).
    const { data } = await admin
      .from("crm_contacts")
      .select("id, email, updated_at")
      .eq("organization_id", flow.organization_id)
      .contains("tags", [tag])
      .gt("updated_at", cursor)
      .order("updated_at", { ascending: true })
      .limit(PER_FLOW_EVENTS);
    return (((data as Json[]) ?? [])).map((r) => ({ contactId: r.id, email: String(r.email ?? ""), at: r.updated_at }));
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
      const matches = await pollJourneyEvents(admin, flow, event, tag, flow.last_cursor);
      let maxAt = flow.last_cursor;
      const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      for (const m of matches) {
        if (m.at > maxAt) maxAt = m.at;
        if (budget.left <= 0) break;
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
        // Dedupe: an in-flight run, or one finished <24h ago, blocks a restart.
        const { data: dupe } = await admin
          .from("engage_runs")
          .select("id")
          .eq("flow_id", flow.id)
          .eq("contact_id", contactId)
          .or(`status.in.(active,waiting),updated_at.gt.${dayAgo}`)
          .limit(1);
        if ((dupe as Json[] | null)?.length) continue;

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
            state: {},
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
      if (maxAt !== flow.last_cursor) {
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
