import { useOutletContext, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";
import type { OpsContext } from "@/layouts/OperatingLayout";
import type { Organization } from "@/lib/db/organizations";

/**
 * Shared data access for the Engage areas (Audience / Channels / Insights /
 * Broadcasts). The engage_* tables are being provisioned alongside the flow
 * engine, so every read here is FAIL-SOFT: a missing table is reported as
 * `missing: true` (the page shows a friendly "warming up" state), never as a
 * raw error.
 */

// ---------------------------------------------------------------------------
// Org identity. EngageLayout renders a bare <Outlet/>, which (react-router v6)
// shadows OperatingLayout's outlet context — so the context can arrive as
// undefined inside Engage areas. Fall back to the :id route param so these
// pages keep working either way; `org` is null only on the fallback path.
export function useEngageOps(): { orgId: string; org: Organization | null } {
  const ctx = useOutletContext<OpsContext | undefined>();
  const { id } = useParams<{ id: string }>();
  return { orgId: ctx?.orgId ?? id ?? "", org: ctx?.org ?? null };
}

// ---------------------------------------------------------------------------
// Missing-table detection (relation absent / PostgREST schema cache miss).
type DbError = { code?: string; message?: string } | null;

function classify(error: DbError): { missing: boolean; error: string | null } {
  if (!error) return { missing: false, error: null };
  const m = (error.message ?? "").toLowerCase();
  const missing =
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    m.includes("does not exist") ||
    m.includes("schema cache");
  return { missing, error: missing ? null : friendlyError(error.message) };
}

/** Copy for the shared "engine not provisioned yet" empty state. */
export const ENGAGE_WARMING = {
  title: "The engage engine is still warming up",
  body: "Flows, journeys and their tables are being provisioned. Check back in a little while — nothing is lost.",
};

export type EngageResult<T> = { data: T; missing: boolean; error: string | null };

// ---------------------------------------------------------------------------
// engage_flows — flows + journeys (member CRUD; read-only here).
export type EngageFlowKind = "flow" | "journey";
export type EngageFlow = {
  id: string;
  name: string;
  kind: EngageFlowKind;
  status: string;
};

export async function listEngageFlows(orgId: string): Promise<EngageResult<EngageFlow[]>> {
  const { data, error } = await supabase
    .from("engage_flows")
    .select("id, name, kind, status")
    .eq("organization_id", orgId)
    .order("name", { ascending: true });
  const c = classify(error);
  return { data: (data as EngageFlow[] | null) ?? [], ...c };
}

/** "live"/"active" count as running; anything else (draft, paused, off) doesn't. */
export function isFlowLive(f: EngageFlow): boolean {
  const s = f.status.toLowerCase();
  return s === "live" || s === "active";
}

// ---------------------------------------------------------------------------
// engage_touches — one row per contact touched by a flow/journey run.
export type EngageTouch = {
  flow_id: string | null;
  run_id: string | null;
  contact_id: string | null;
  conversation_id: string | null;
  channel: string | null;
  kind: string | null;
  created_at: string;
};

export const TOUCH_LIMIT = 2000;

export async function listEngageTouches(orgId: string, sinceIso: string): Promise<EngageResult<EngageTouch[]>> {
  const { data, error } = await supabase
    .from("engage_touches")
    .select("flow_id, run_id, contact_id, conversation_id, channel, kind, created_at")
    .eq("organization_id", orgId)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(TOUCH_LIMIT);
  const c = classify(error);
  return { data: (data as EngageTouch[] | null) ?? [], ...c };
}

// ---------------------------------------------------------------------------
// engage_segments — saved audience filters, `filter` = { conds: [...] }.
export type SegmentField = "has_tag" | "email_contains" | "created_after";
export type SegmentCond = { field: SegmentField; op: "has" | "contains" | "after"; value: string };
export type SegmentFilter = { conds: SegmentCond[] };

export type EngageSegment = {
  id: string;
  name: string;
  filter: SegmentFilter | null;
  created_at: string;
};

/** The op is implied by the field in v1 — stored anyway so the shape can grow. */
export const FIELD_META: Record<SegmentField, { label: string; op: SegmentCond["op"]; placeholder: string }> = {
  has_tag: { label: "Has tag", op: "has", placeholder: "e.g. vip" },
  email_contains: { label: "Email contains", op: "contains", placeholder: "e.g. @gmail.com" },
  created_after: { label: "Added after", op: "after", placeholder: "" },
};

export async function listEngageSegments(orgId: string): Promise<EngageResult<EngageSegment[]>> {
  const { data, error } = await supabase
    .from("engage_segments")
    .select("id, name, filter, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  const c = classify(error);
  return { data: (data as EngageSegment[] | null) ?? [], ...c };
}

export async function createEngageSegment(
  orgId: string,
  input: { name: string; filter: SegmentFilter },
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("engage_segments").insert({
    organization_id: orgId,
    name: input.name.trim(),
    filter: input.filter,
  });
  return { error: classify(error).error ?? (error ? friendlyError(error.message) : null) };
}

export async function renameEngageSegment(id: string, name: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("engage_segments").update({ name: name.trim() }).eq("id", id);
  return { error: friendlyError(error?.message) };
}

export async function deleteEngageSegment(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("engage_segments").delete().eq("id", id);
  return { error: friendlyError(error?.message) };
}

/** Client-side preview: does this contact match every condition (AND)? */
export function matchesFilter(
  contact: { tags: string[] | null; email: string; created_at: string },
  filter: SegmentFilter | null | undefined,
): boolean {
  const conds = filter?.conds ?? [];
  return conds.every((cond) => {
    const v = cond.value.trim().toLowerCase();
    if (!v) return true; // an unfinished condition filters nothing
    switch (cond.field) {
      case "has_tag":
        return (contact.tags ?? []).some((t) => t.toLowerCase() === v);
      case "email_contains":
        return contact.email.toLowerCase().includes(v);
      case "created_after":
        return contact.created_at >= cond.value; // ISO strings compare lexically
      default:
        return true;
    }
  });
}

/** Human description of a saved filter for list rows. */
export function describeFilter(filter: SegmentFilter | null | undefined): string {
  const conds = (filter?.conds ?? []).filter((cond) => cond.value.trim());
  if (conds.length === 0) return "All contacts";
  return conds
    .map((cond) => {
      switch (cond.field) {
        case "has_tag": return `tag "${cond.value}"`;
        case "email_contains": return `email contains "${cond.value}"`;
        case "created_after": return `added after ${cond.value}`;
        default: return cond.value;
      }
    })
    .join(" · ");
}

// ---------------------------------------------------------------------------
// Channel snapshot for the Channels map — only what's cheaply readable
// client-side: the agent's webchat public key + voice config, the Google
// (Gmail) connection, and per-channel conversation counts as a usage signal.
// Twilio credentials are server-side secrets, so SMS/WhatsApp state is
// inferred from traffic. Read-only by design: nothing here mutates config.
export type ChannelSnapshot = {
  publicKey: string | null;
  voiceConfigured: boolean;
  googleEmail: string | null;
  /** Conversation counts by channel_type over the most recent conversations. */
  counts: Record<string, number>;
  /** True when the conversation sample hit its cap (counts are then "at least"). */
  capped: boolean;
};

const CONV_SAMPLE = 1000;

export async function getChannelSnapshot(orgId: string): Promise<{ data: ChannelSnapshot; error: string | null }> {
  const [cfg, google, convs] = await Promise.all([
    supabase.from("agent_config").select("public_key, voice").eq("organization_id", orgId).maybeSingle(),
    supabase.from("google_connections").select("email").eq("organization_id", orgId).maybeSingle(),
    supabase
      .from("conversations")
      .select("channel_type")
      .eq("organization_id", orgId)
      .not("is_test", "is", true)
      .order("last_message_at", { ascending: false })
      .limit(CONV_SAMPLE),
  ]);

  const counts: Record<string, number> = {};
  const rows = (convs.data as { channel_type: string | null }[] | null) ?? [];
  for (const r of rows) {
    const ch = (r.channel_type ?? "").toLowerCase();
    if (ch) counts[ch] = (counts[ch] ?? 0) + 1;
  }

  const cfgRow = cfg.data as { public_key: string | null; voice: { provider?: string; voice_id?: string } | null } | null;
  const data: ChannelSnapshot = {
    publicKey: cfgRow?.public_key || null,
    voiceConfigured: Boolean(cfgRow?.voice?.provider),
    googleEmail: (google.data as { email: string } | null)?.email ?? null,
    counts,
    capped: rows.length >= CONV_SAMPLE,
  };
  // Everything is optional decoration on the map — surface only a total outage.
  const err = cfg.error && google.error && convs.error ? classify(convs.error).error : null;
  return { data, error: err };
}

// ---------------------------------------------------------------------------
// Revenue events for Insights attribution: paid/fulfilled orders + confirmed/
// completed reservations in the window, keyed by customer email (the only
// identity those tables carry). Both reads are individually fail-soft.
export type RevenueEvent = {
  id: string;
  email: string;
  cents: number;
  currency: string | null;
  created_at: string;
};

export const REVENUE_LIMIT = 500;

export async function listRecentRevenue(
  orgId: string,
  sinceIso: string,
): Promise<{ events: RevenueEvent[]; error: string | null }> {
  const [orders, reservations] = await Promise.all([
    supabase
      .from("orders")
      .select("id, customer_email, total_cents, currency, created_at")
      .eq("organization_id", orgId)
      .in("status", ["paid", "fulfilled"])
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(REVENUE_LIMIT),
    supabase
      .from("reservations")
      .select("id, customer_email, total_cents, currency, created_at")
      .eq("organization_id", orgId)
      .in("status", ["confirmed", "completed"])
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(REVENUE_LIMIT),
  ]);

  type Row = { id: string; customer_email: string | null; total_cents: number | null; currency: string | null; created_at: string };
  const toEvent = (prefix: string) => (r: Row): RevenueEvent => ({
    id: `${prefix}:${r.id}`,
    email: (r.customer_email ?? "").trim().toLowerCase(),
    cents: r.total_cents ?? 0,
    currency: r.currency,
    created_at: r.created_at,
  });

  const events: RevenueEvent[] = [
    ...((orders.data as Row[] | null) ?? []).map(toEvent("order")),
    ...((reservations.data as Row[] | null) ?? []).map(toEvent("res")),
  ].filter((e) => e.email);

  // Either source failing (e.g. a vertical without that table) shouldn't sink
  // the other — only report an error when BOTH reads failed.
  const err = orders.error && reservations.error ? classify(orders.error).error : null;
  return { events, error: err };
}
