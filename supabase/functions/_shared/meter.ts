import { costCents } from "./pricing.ts";
import type { SupabaseClient } from "./supabaseAdmin.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** ai_usage.user_id and conversation_id are uuid columns. A caller that passes a
 *  label ("automation", "cron") instead of an id used to make the INSERT fail —
 *  and because supabase-js reports failures as a return value, not a throw, the
 *  try/catch below never saw it. Every such call was silently unmetered. Coerce
 *  to null rather than fail: a row with no user is infinitely better than no row. */
const asUuid = (v: string | null | undefined): string | null => (v && UUID_RE.test(v) ? v : null);

/** Record one AI call into ai_usage (cost + eval/observability fields). Never throws. */
export async function meter(
  admin: SupabaseClient,
  opts: {
    organizationId: string;
    userId?: string | null;
    conversationId?: string | null;
    model: string;
    feature: string;
    tier: string;
    inTok: number;
    outTok: number;
    /** Prompt-cache tokens. `inTok` is only the uncached remainder, so these
     *  must be recorded separately or cached calls under-report cost + usage. */
    cacheWriteTok?: number;
    cacheReadTok?: number;
    latencyMs: number;
    status?: string;
  },
): Promise<void> {
  try {
    const cacheWrite = opts.cacheWriteTok ?? 0;
    const cacheRead = opts.cacheReadTok ?? 0;
    const { error } = await admin.from("ai_usage").insert({
      organization_id: opts.organizationId,
      user_id: asUuid(opts.userId),
      conversation_id: asUuid(opts.conversationId),
      model: opts.model,
      feature: opts.feature,
      tier: opts.tier,
      input_tokens: opts.inTok,
      output_tokens: opts.outTok,
      cache_write_tokens: cacheWrite,
      cache_read_tokens: cacheRead,
      latency_ms: opts.latencyMs,
      status: opts.status ?? "ok",
      cost_cents: costCents(opts.model, opts.inTok, opts.outTok, cacheWrite, cacheRead),
    });
    // Logged, never thrown. Metering must not break the user-facing call — but
    // a metering failure that nobody can see is how a whole feature's spend
    // went missing from the cap and the cost dashboard for months.
    if (error) console.error("[phoxta] ai_usage insert failed:", error.message, { feature: opts.feature, model: opts.model });
  } catch (e) {
    console.error("[phoxta] meter threw:", e instanceof Error ? e.message : String(e));
  }
}

/**
 * The plan whose allowance applies. ONE definition, because the two copies
 * that used to exist had drifted: the public agent floored a lapsed
 * subscription to starter, the dashboard assistant let it keep its paid cap.
 * A cancelled `scale` org must not keep 5M tokens a month anywhere.
 */
export function planFor(sub: { plan?: string | null; status?: string | null } | null | undefined): string {
  return sub?.status === "active" ? (sub?.plan ?? "starter") : "starter";
}

export function planCapFor(sub: { plan?: string | null; status?: string | null } | null | undefined): number {
  return MONTHLY_TOKEN_CAP[planFor(sub)] ?? MONTHLY_TOKEN_CAP.starter;
}

/**
 * The organisation that platform-level AI work is booked to — the public idea
 * validator, per-user startup-school runs, blueprint dossiers. None of those
 * has a tenant, and ai_usage.organization_id is NOT NULL, so without this row
 * their spend simply did not exist anywhere. Logged when missing: a null here
 * means the calls are unmetered again, and that should never be quiet.
 */
export async function platformOrgId(admin: SupabaseClient, feature = "platform"): Promise<string | null> {
  const { data } = await admin
    .from("organizations").select("id").eq("vertical", "platform").limit(1).maybeSingle();
  const id = (data as { id?: string } | null)?.id ?? null;
  if (!id) console.error(`[phoxta] ${feature}: no organisation with vertical = 'platform' — this call is unmetered`);
  return id;
}

export type CapCheck = { ok: boolean; cap: number; used: number; plan: string };

/** What the caller returns to a person when the cap is hit. One string, so the
 *  wording cannot drift between features either. */
export const CAP_REACHED_MESSAGE = "You've reached this month's AI usage for your plan. Upgrade to keep going.";

/**
 * The monthly-cap check every authenticated AI feature is expected to run
 * BEFORE calling the model. It existed in two places and was missing from the
 * other nineteen; a trialing org could spend 750K complex-tier tokens in the
 * page editor while its storefront agent was already refusing on the cap.
 * Reads the plan and the month's usage in parallel.
 */
export async function assertWithinCap(admin: SupabaseClient, orgId: string): Promise<CapCheck> {
  const [{ data: sub }, used] = await Promise.all([
    admin.from("subscriptions").select("plan, status").eq("organization_id", orgId).maybeSingle(),
    tokensUsedThisMonth(admin, orgId),
  ]);
  const plan = planFor(sub as { plan?: string | null; status?: string | null } | null);
  const cap = MONTHLY_TOKEN_CAP[plan] ?? MONTHLY_TOKEN_CAP.starter;
  return { ok: used < cap, cap, used, plan };
}

/** Per-org monthly token cap by plan (mirrors the gateway's allowance). */
export const MONTHLY_TOKEN_CAP: Record<string, number> = {
  trialing: 200_000,
  starter: 200_000,
  growth: 1_000_000,
  scale: 5_000_000,
  enterprise: Number.MAX_SAFE_INTEGER,
};

/**
 * Total tokens an org has spent this calendar month.
 *
 * Sums in the database. The previous implementation selected the month's
 * ai_usage rows and reduced them in JS, which silently truncated at PostgREST's
 * 1000-row response cap — so the monthly cap stopped firing for exactly the busy
 * orgs it exists to bound. app_org_ai_tokens_service is SECURITY DEFINER with no
 * auth.uid() dependency (the member-facing app_org_ai_tokens_this_month returns
 * 0 under the service role, so it can't be reused here).
 *
 * If the RPC is unavailable (e.g. a deploy that lands ahead of its migration),
 * fall back to the legacy client-side sum rather than hard-failing the agent —
 * it under-counts past 1000 rows, but a partial number still bounds spend and
 * keeps the product up.
 */
export async function tokensUsedThisMonth(admin: SupabaseClient, orgId: string): Promise<number> {
  const { data, error } = await admin.rpc("app_org_ai_tokens_service", { p_org: orgId });
  if (!error) return Number(data ?? 0);

  console.error("app_org_ai_tokens_service unavailable, falling back to row sum", error);
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const { data: rows } = await admin
    .from("ai_usage")
    .select("input_tokens, output_tokens, cache_write_tokens, cache_read_tokens")
    .eq("organization_id", orgId)
    .gte("created_at", monthStart.toISOString());
  type Row = { input_tokens: number; output_tokens: number; cache_write_tokens?: number; cache_read_tokens?: number };
  return ((rows as Row[] | null) ?? []).reduce(
    (s, r) => s + (r.input_tokens ?? 0) + (r.output_tokens ?? 0) + (r.cache_write_tokens ?? 0) + (r.cache_read_tokens ?? 0),
    0,
  );
}
