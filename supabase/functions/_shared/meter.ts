import { costCents } from "./pricing.ts";
import type { SupabaseClient } from "./supabaseAdmin.ts";

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
    await admin.from("ai_usage").insert({
      organization_id: opts.organizationId,
      user_id: opts.userId ?? null,
      conversation_id: opts.conversationId ?? null,
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
  } catch (_) {
    // Metering must never break the user-facing call.
  }
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
