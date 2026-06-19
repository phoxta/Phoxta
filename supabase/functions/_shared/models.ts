// Model tiering / cost governance. Maps a per-feature tier -> a concrete model
// for the active provider. AI_MODEL overrides everything (operator pin).
//   xAI Grok (default when XAI_API_KEY set): cheap=non-reasoning, balanced=4.3, complex=reasoning
//   Anthropic: Haiku / Sonnet / Opus
export type Tier = "cheap" | "balanced" | "complex";

const XAI: Record<Tier, string> = {
  cheap: "grok-4.20-0309-non-reasoning",
  balanced: "grok-4.3",
  complex: "grok-4.20-0309-reasoning",
};
const ANTHROPIC: Record<Tier, string> = {
  cheap: "claude-haiku-4-5",
  balanced: "claude-sonnet-4-6",
  complex: "claude-opus-4-8",
};

export function modelFor(tier: Tier): string {
  const override = Deno.env.get("AI_MODEL");
  if (override) return override;
  const provider = Deno.env.get("LLM_PROVIDER") || (Deno.env.get("XAI_API_KEY") ? "xai" : "anthropic");
  const table = provider === "xai" ? XAI : ANTHROPIC;
  return table[tier] || table.balanced;
}
