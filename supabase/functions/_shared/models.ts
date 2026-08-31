// Model tiering / cost governance. Maps a per-feature tier -> a concrete model
// for the active provider. AI_MODEL overrides everything (operator pin).
//
// Pick with LLM_PROVIDER=gemini|xai|anthropic|local. With it unset the first
// configured key wins, in that order.
//
// PER-TIER ROUTING: LLM_PROVIDER_CHEAP / _BALANCED / _COMPLEX override the
// global choice for one tier only. This exists so the short, latency-tolerant
// `cheap` jobs (inbound classification, QA scoring, memory summaries) can run
// on a self-hosted box for nothing while balanced and complex stay on the
// hosted provider. A tier override that names an UNCONFIGURED provider is
// ignored rather than honoured — setting LLM_PROVIDER_CHEAP=local before the
// box exists must not take the cheap tier down.
export type Tier = "cheap" | "balanced" | "complex";
export type Provider = "gemini" | "xai" | "anthropic" | "local";

/** What the self-hosted server calls the model it is serving. It MUST match
 *  the name the box answers to (vLLM's --served-model-name, the Ollama tag),
 *  because that string is also how `locate` recognises a local model id and
 *  therefore how the gateway knows which provider a call started on. */
const LOCAL_MODEL = Deno.env.get("LOCAL_MODEL") || "qwen3-4b-instruct";

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
    // Same model as balanced, deliberately. `complex` used to be gemini-2.5-pro
    // — a generation-old heavy reasoning model that was both the slowest and
    // the most expensive thing on the platform. The modern shape is one fast
    // model with MORE thinking, not an older bigger one: the gateway gives the
    // complex tier a higher reasoning_effort (see reasoningFor in anthropic.ts).
    complex: "gemini-3.7-flash",
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
  // One box, one model, so all three tiers name it. The tiers are not a claim
  // that a 4B model is three different models — they are landing pads for
  // translateModel when a call falls back TO local, and the reason `locate`
  // reports tier "cheap" for it (first match wins). Benign, because `cheap` is
  // the only tier routed here by design.
  local: {
    cheap: LOCAL_MODEL,
    balanced: LOCAL_MODEL,
    complex: LOCAL_MODEL,
  },
};

const TIERS: Tier[] = ["cheap", "balanced", "complex"];

/** Where each provider's credential lives. `local` is the odd one out: a box
 *  you run yourself needs no key, so what makes it "configured" is knowing
 *  where it is. Exported because the gateway builds its fallback order from
 *  the same list — two copies would drift the moment a provider is added. */
export const KEY_NAME: Record<Provider, string> = {
  gemini: "GEMINI_API_KEY",
  xai: "XAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  local: "LOCAL_BASE_URL",
};

export function configured(p: Provider): boolean {
  return !!Deno.env.get(KEY_NAME[p]);
}

function asProvider(v: string | null | undefined): Provider | null {
  return v === "gemini" || v === "xai" || v === "anthropic" || v === "local" ? v : null;
}

/** Which provider is in charge. Explicit setting first, then whichever key is
 *  actually configured — so adding a key is enough to start using it and
 *  removing one cannot leave the platform pointed at a provider it cannot
 *  authenticate against. */
export function providerFor(tier?: Tier): Provider {
  // Per-tier override first — this is what puts `cheap` on the self-hosted box
  // while everything else stays on the hosted provider. Gated on `configured`
  // so an override naming a provider with no base URL or key falls through to
  // the global choice instead of pointing every call of that tier at nothing.
  if (tier) {
    const t = asProvider(Deno.env.get(`LLM_PROVIDER_${tier.toUpperCase()}`));
    if (t && configured(t)) return t;
  }
  const p = asProvider(Deno.env.get("LLM_PROVIDER"));
  if (p) return p;
  // Auto-detect never picks `local`: a self-hosted box is a deliberate choice,
  // and inferring it from a stray LOCAL_BASE_URL would silently move every
  // feature onto a CPU that cannot carry them.
  if (Deno.env.get("GEMINI_API_KEY")) return "gemini";
  if (Deno.env.get("XAI_API_KEY")) return "xai";
  return "anthropic";
}

export function modelFor(tier: Tier): string {
  const override = Deno.env.get("AI_MODEL");
  if (override) return override;
  const table = TABLES[providerFor(tier)];
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

/** Which tier a model id belongs to — the gateway uses it to pick how hard the
 *  model should think. Null for an operator pin (AI_MODEL) we do not recognise. */
export function tierOf(model: string): Tier | null {
  return locate(model)?.tier ?? null;
}

/** Translate a model id to its same-tier equivalent on another provider —
 *  used by the fallback gateway when the primary provider is down. */
export function translateModel(model: string, target: Provider): string {
  return TABLES[target][locate(model)?.tier ?? "balanced"];
}
