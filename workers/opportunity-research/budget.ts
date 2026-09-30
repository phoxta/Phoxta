import type { JsonAttempt } from '../../supabase/functions/_shared/anthropic.ts';

// Verified 2026-09-26 against https://platform.claude.com/docs/en/models/sonnet-4-6/overview
// Cache writes cost 1.25x input. Other gateway models require explicit operator
// rates, so an unpriced fallback cannot silently spend outside the job budget.
export type ModelRates = Record<string, { input: number; output: number }>;
export const VERIFIED_RATES: ModelRates = { 'claude-sonnet-4-6': { input: 3, output: 15 } };
export function reserveEstimate(attempt: JsonAttempt, rates: ModelRates): number {
    const rate = rates[attempt.model];
    if (!rate || !Number.isFinite(rate.input) || !Number.isFinite(rate.output) || rate.input < 0 || rate.output < 0) throw new Error('Research model rates are unavailable. Configure a priced model before retrying.');
    if (attempt.hasImages) throw new Error('The research budget supports text input only.');
    // One token per UTF-8 byte is deliberately conservative for text; include
    // an envelope for provider message framing and charge cache-write rates.
    return Math.ceil(((attempt.inputBytes + 2048) * rate.input * 1.25 + attempt.maxOutputTokens * rate.output) / 1_000_000 * 100000) / 100000;
}

export function safeResearchFailure(error: unknown): string {
    const message = error instanceof Error ? error.message : '';
    if (/cost budget exceeded|rates are unavailable|budget supports text/.test(message)) return 'Research stopped before the next paid request because its cost budget or model pricing was unavailable.';
    if (/not configured/.test(message)) return 'Research providers are unavailable. Your existing work is saved; an administrator can restore the provider connection.';
    if (/No source candidates/.test(message)) return 'No source candidates were found. Try a narrower customer or a different market.';
    if (/question between/.test(message)) return 'Enter a research question between 1 and 4000 characters.';
    return 'Research could not finish. Your existing work is saved. Retry the job or ask an administrator to inspect its status.';
}
