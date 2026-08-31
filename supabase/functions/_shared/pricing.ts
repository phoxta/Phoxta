// Per-million-token prices (USD) for cost metering. xAI Grok prices are
// approximate — verify against your xAI billing and adjust.
export const PRICING: Record<string, { in: number; out: number }> = {
  // Anthropic — current generation
  "claude-opus-5": { in: 5, out: 25 },
  "claude-sonnet-5": { in: 3, out: 15 },
  "claude-fable-5": { in: 10, out: 50 },
  "claude-mythos-5": { in: 10, out: 50 },
  // Anthropic — previous generation (still active)
  "claude-opus-4-8": { in: 5, out: 25 },
  "claude-opus-4-7": { in: 5, out: 25 },
  "claude-opus-4-6": { in: 5, out: 25 },
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-haiku-4-5": { in: 1, out: 5 },
  // xAI Grok (approximate)
  "grok-4.3": { in: 3, out: 15 },
  "grok-4.20-0309-reasoning": { in: 3, out: 15 },
  "grok-4.20-0309-non-reasoning": { in: 1, out: 5 },
  "grok-4.20-multi-agent-0309": { in: 5, out: 25 },
  "grok-build-0.1": { in: 1, out: 5 },
  // Google Gemini (approximate list prices — verify against billing). These
  // rows were missing entirely, and Gemini is the DEFAULT provider: every
  // cheap-tier call was being costed at Sonnet's $3/$15 — roughly 30× reality —
  // so the Platform console's per-org margin was fiction.
  "gemini-3.5-flash-lite": { in: 0.1, out: 0.4 },
  "gemini-3.7-flash": { in: 0.3, out: 2.5 },
  "gemini-2.5-pro": { in: 1.25, out: 10 },
  // Self-hosted. The box costs the same whether or not it answers; per-token
  // cost is genuinely zero, which is the whole reason the cheap tier lives there.
  [Deno.env.get("LOCAL_MODEL") || "qwen3-4b-instruct"]: { in: 0, out: 0 },
};

/** Models we have been asked to price but have no row for — logged once each
 *  per isolate, so the gap is visible without flooding the log. */
const warned = new Set<string>();

// Prompt-caching multipliers on the base INPUT rate (Anthropic):
//   cache write (5-minute TTL) = 1.25x, cache read = 0.1x.
const CACHE_WRITE_MULT = 1.25;
const CACHE_READ_MULT = 0.1;

/**
 * Cost of one call in cents.
 *
 * `inTok` is the uncached remainder only — cached prompt tokens are billed at
 * the write/read rates above and must be passed separately, or every cached
 * request under-reports (the cache-write premium was previously invisible).
 */
export function costCents(model: string, inTok: number, outTok: number, cacheWriteTok = 0, cacheReadTok = 0): number {
  // An unknown model is costed at ZERO and logged, not guessed. The previous
  // default silently priced every unlisted model as Sonnet, which is how a
  // whole provider's spend was reported at 30× for months without anyone
  // noticing — a visible zero gets a row added; a plausible wrong number does not.
  let p = PRICING[model];
  if (!p) {
    if (!warned.has(model)) {
      warned.add(model);
      console.warn(`[phoxta] pricing: no row for model "${model}" — costing at 0. Add it to _shared/pricing.ts.`);
    }
    p = { in: 0, out: 0 };
  }
  const perTok = (tokens: number, rate: number) => (tokens / 1e6) * rate * 100;
  return Number(
    (
      perTok(inTok, p.in) +
      perTok(outTok, p.out) +
      perTok(cacheWriteTok, p.in * CACHE_WRITE_MULT) +
      perTok(cacheReadTok, p.in * CACHE_READ_MULT)
    ).toFixed(4),
  );
}
