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
    latencyMs: number;
    status?: string;
  },
): Promise<void> {
  try {
    await admin.from("ai_usage").insert({
      organization_id: opts.organizationId,
      user_id: opts.userId ?? null,
      conversation_id: opts.conversationId ?? null,
      model: opts.model,
      feature: opts.feature,
      tier: opts.tier,
      input_tokens: opts.inTok,
      output_tokens: opts.outTok,
      latency_ms: opts.latencyMs,
      status: opts.status ?? "ok",
      cost_cents: costCents(opts.model, opts.inTok, opts.outTok),
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

export async function tokensUsedThisMonth(admin: SupabaseClient, orgId: string): Promise<number> {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const { data } = await admin
    .from("ai_usage")
    .select("input_tokens, output_tokens")
    .eq("organization_id", orgId)
    .gte("created_at", monthStart.toISOString());
  return ((data as { input_tokens: number; output_tokens: number }[] | null) ?? []).reduce(
    (s, r) => s + (r.input_tokens ?? 0) + (r.output_tokens ?? 0),
    0,
  );
}
