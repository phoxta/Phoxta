// Per-million-token prices (USD) for cost metering. xAI Grok prices are
// approximate — verify against your xAI billing and adjust.
export const PRICING: Record<string, { in: number; out: number }> = {
  // Anthropic
  "claude-opus-4-8": { in: 5, out: 25 },
  "claude-opus-4-7": { in: 5, out: 25 },
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-haiku-4-5": { in: 1, out: 5 },
  "claude-fable-5": { in: 10, out: 50 },
  // xAI Grok (approximate)
  "grok-4.3": { in: 3, out: 15 },
  "grok-4.20-0309-reasoning": { in: 3, out: 15 },
  "grok-4.20-0309-non-reasoning": { in: 1, out: 5 },
  "grok-4.20-multi-agent-0309": { in: 5, out: 25 },
  "grok-build-0.1": { in: 1, out: 5 },
};

export function costCents(model: string, inTok: number, outTok: number): number {
  const p = PRICING[model] ?? { in: 3, out: 15 };
  return Number(((inTok / 1e6) * p.in * 100 + (outTok / 1e6) * p.out * 100).toFixed(4));
}
