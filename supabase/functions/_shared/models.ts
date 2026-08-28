// Model tiering / cost governance. Maps a per-feature tier -> a concrete model
// for the active provider. AI_MODEL overrides everything (operator pin).
//
// Pick with LLM_PROVIDER=gemini|xai|anthropic. With it unset the first
// configured key wins, in that order.
export type Tier = "cheap" | "balanced" | "complex";
export type Provider = "gemini" | "xai" | "anthropic";

/**
 * One table per provider, the same three tiers, so a feature asks for "cheap"
 * and never for a model name.
 *
 * STABLE IDS ONLY. Google has already shut `gemini-3-pro-preview` down, which
 * is what a preview id is for — so `complex` takes the stable Pro rather than
 * the newer preview one, and the same rule applies to whatever replaces it.
 * An operator who wants a preview model can pin it with AI_MODEL, which is the
 * right place for a decision that comes with an expiry date.
 */
const TABLES: Record<Provider, Record<Tier, string>> = {
  gemini: {
    cheap: "gemini-3.5-flash-lite",
    balanced: "gemini-3.7-flash",
    complex: "gemini-2.5-pro",
  },
  xai: {
    cheap: "grok-4.20-0309-non-reasoning",
    balanced: "grok-4.3",
    complex: "grok-4.20-0309-reasoning",
  },
  anthropic: {
    cheap: "claude-haiku-4-5",
    balanced: "claude-sonnet-4-6",
    complex: "claude-opus-4-8",
  },
};

const TIERS: Tier[] = ["cheap", "balanced", "complex"];

/** Which provider is in charge. Explicit setting first, then whichever key is
 *  actually configured — so adding a key is enough to start using it and
 *  removing one cannot leave the platform pointed at a provider it cannot
 *  authenticate against. */
export function providerFor(): Provider {
  const p = Deno.env.get("LLM_PROVIDER");
  if (p === "gemini" || p === "xai" || p === "anthropic") return p;
  if (Deno.env.get("GEMINI_API_KEY")) return "gemini";
  if (Deno.env.get("XAI_API_KEY")) return "xai";
  return "anthropic";
}

export function modelFor(tier: Tier): string {
  const override = Deno.env.get("AI_MODEL");
  if (override) return override;
  const table = TABLES[providerFor()];
  return table[tier] || table.balanced;
}

/**
 * Whose model is this, and at what tier — BY LOOKUP, not by prefix.
 *
 * This used to read `model.startsWith("grok")`, which works exactly as long as
 * there are two providers and stops being true the moment there is a third: a
 * Gemini id is not a Grok id, so it was "therefore Anthropic", and the
 * fallback would have translated it to the wrong table without ever failing
 * loudly.
 */
function locate(model: string): { provider: Provider; tier: Tier } | null {
  for (const p of Object.keys(TABLES) as Provider[]) {
    for (const t of TIERS) if (TABLES[p][t] === model) return { provider: p, tier: t };
  }
  return null;
}

export function providerOf(model: string): Provider | null {
  return locate(model)?.provider ?? null;
}

/** Translate a model id to its same-tier equivalent on another provider —
 *  used by the fallback gateway when the primary provider is down. */
export function translateModel(model: string, target: Provider): string {
  return TABLES[target][locate(model)?.tier ?? "balanced"];
}
