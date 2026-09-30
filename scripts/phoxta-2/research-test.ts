import { canonicalUrl, retrieve, type SearchProvider, type SourceCandidate } from '../../workers/opportunity-research/providers.ts';
import { qualityGate } from '../../workers/opportunity-research/pipeline.ts';
import { reserveEstimate, safeResearchFailure, VERIFIED_RATES } from '../../workers/opportunity-research/budget.ts';
import { applyCritique, parsePlan } from '../../workers/opportunity-research/planning.ts';
const assert = (value: unknown, message = 'Assertion failed') => { if (!value) throw new Error(message); };
const source: SourceCandidate = { evidence_id: 'test-evidence', url: 'https://example.org/study', title: 'Study', publisher: 'Example', published_at: null, retrieved_at: '2026-09-26', geography: '', excerpt: 'An observation, not a market conclusion.' };
const provider = (name: string, search: SearchProvider['search']): SearchProvider => ({ name, search, healthCheck: () => true, costEstimate: () => .005 });
Deno.test('Each paid search attempt is reserved before the request; empty results permit fallback', async () => {
    const events: string[] = [];
    const result = await retrieve([provider('empty', async () => { events.push('first'); return []; }), provider('fallback', async () => { events.push('second'); return [source, source]; })], 'question', 5, new AbortController().signal, async () => { events.push('reserve'); });
    assert(JSON.stringify(events) === JSON.stringify(['reserve', 'first', 'reserve', 'second']));
    assert(result.sources.length === 1 && result.cost === .01 && result.provider === 'fallback');
});
Deno.test('No provider is called when budget reservation fails', async () => {
    let called = false; let rejected = false;
    try { await retrieve([provider('first', async () => { called = true; return [source]; })], 'q', 5, new AbortController().signal, async () => { throw new Error('Research cost budget exceeded.'); }); } catch { rejected = true; }
    assert(rejected && !called);
});
Deno.test('Unpriced model fallback fails closed and cache-write pricing is reserved', () => {
    const attempt = { provider: 'anthropic' as const, model: 'claude-sonnet-4-6', inputBytes: 1000, maxOutputTokens: 2400, hasImages: false };
    assert(reserveEstimate(attempt, VERIFIED_RATES) >= ((3048 * 3 * 1.25) + 2400 * 15) / 1e6);
    let rejected = false; try { reserveEstimate({ ...attempt, model: 'unpriced' }, VERIFIED_RATES); } catch { rejected = true; } assert(rejected);
});
Deno.test('Forged citations cannot become sourced claims; unknown dates need review', () => {
    const result = qualityGate({ claims: [{ text: 'Fake evidence', kind: 'sourced', evidence_ids: ['invented'] }, { text: source.excerpt, kind: 'sourced', evidence_ids: [source.evidence_id] }] }, [source]);
    assert(result.claims[0].kind === 'hypothesis'); assert(result.claims[1].kind === 'sourced');
    assert(result.quality_issues.some(s => s.includes('dates are unknown')));
});
Deno.test('Source URLs reject embedded credentials and research errors cannot leak provider bodies', () => {
    assert(canonicalUrl('https://example.org/study?utm_campaign=x#top') === source.url);
    assert(canonicalUrl('https://secret:password@example.org') === null);
    assert(!safeResearchFailure(new Error('upstream body contains private research and api-key')).includes('api-key'));
});
Deno.test('Planner preserves unknowns and caps retrieval queries', () => {
    const plan = parsePlan({ customer: 'Repair firms', problem: 'Scheduling', queries: ['one', 'two', 'three', 'four'], unknowns: ['Geography'], clarifying_questions: [] }, 'fallback');
    assert(plan.queries.length === 3);
    assert(plan.context === 'Unknown');
    const fallback = parsePlan({ customer: 'Unknown', problem: 'Unknown' }, 'What is changing?');
    assert(fallback.queries[0] === 'What is changing?');
});
Deno.test('Critic downgrades unsupported claims without deleting citations', () => {
    const review = { claims: [{ text: 'Supported', kind: 'sourced', evidence_ids: ['one'] }, { text: 'Overstated', kind: 'sourced', evidence_ids: ['two'] }], quality_issues: [] as string[] };
    const checked = applyCritique(review, { unsupported_claim_indices: [1, 99], conflicts: ['Signals conflict'], missing_context: ['Geography missing'] });
    assert(checked.claims[0].kind === 'sourced');
    assert(checked.claims[1].kind === 'hypothesis' && checked.claims[1].evidence_ids[0] === 'two');
    assert(checked.quality_issues.length === 3);
});
