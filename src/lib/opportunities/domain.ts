/** Phoxta 2.0: B §§5–9; P §§5–7 and appendices. No displayed success scores. */
export const LIFECYCLE_STATES = ['discovered', 'investigating', 'unproven', 'testing', 'promising', 'shaping', 'building', 'launching', 'learning', 'paused', 'rejected', 'archived'] as const;
export type LifecycleState = typeof LIFECYCLE_STATES[number];
export const ASSUMPTION_CLASSES = ['problem', 'customer', 'value', 'behaviour', 'payment', 'distribution', 'solution', 'operations', 'regulatory'] as const;
export const EVIDENCE_TYPES = ['external', 'customer_interview', 'behavioural', 'commercial', 'user_note', 'experiment', 'ai_hypothesis', 'legacy_ai_hypothesis'] as const;
export type EvidenceType = typeof EVIDENCE_TYPES[number];
export const EXPERIMENT_TYPES = ['interview', 'landing_page', 'concierge', 'prototype', 'waitlist', 'paid_pilot', 'pre_order', 'outreach', 'smoke_test'] as const;
export type ExperimentStatus = 'draft' | 'ready' | 'running' | 'completed' | 'inconclusive' | 'cancelled';
export type AssumptionStatus = 'unknown' | 'testing' | 'supported' | 'contradicted' | 'revised';
export const BRIEF_SECTIONS = [
    ['thesis', 'Executive thesis'], ['problem', 'Problem'], ['customer', 'Target customer'],
    ['context', 'Context'], ['alternatives', 'Current alternatives'], ['why_now', 'Why now?'],
    ['market', 'Market structure'], ['competition', 'Competitive landscape'],
    ['business_model', 'Business-model hypotheses'], ['distribution', 'Distribution hypotheses'],
    ['risks', 'Risks'], ['validation', 'Validation plan'],
] as const;
export type Claim = { text: string; kind: 'known' | 'inferred' | 'unknown'; evidence_ids: string[] };
export type Source = { id: string; workspace_id: string; canonical_url: string | null; title: string; publisher: string; source_type: string; published_at: string | null; retrieved_at: string; geography: string; };
export type Evidence = { id: string; workspace_id: string; source_id: string | null; evidence_type: EvidenceType; claim: string; excerpt_short: string; interpretation: string; geography: string; observed_at: string; confidence_label: string; created_at: string; };
export type Assumption = { id: string; workspace_id: string; class: typeof ASSUMPTION_CLASSES[number]; statement: string; importance: number; uncertainty: number; status: AssumptionStatus; };
export type Experiment = { id: string; workspace_id: string; assumption_id: string | null; type: string; hypothesis: string; method: string; success_criteria: string; status: ExperimentStatus; ends_at: string | null; learning: string; };
export type Workspace = { id: string; org_id: string; owner_user_id: string; title: string; thesis: string; lifecycle_state: LifecycleState; origin: string; geography: string; created_at: string; updated_at: string; };
export type Opportunity = { id: string; slug: string; title: string; thesis: string; customer: string; problem: string; why_now: string; key_uncertainty: string; primary_industry: string; geography: string; model: string; skills: string[]; evidence_strength: 'hypothesis' | 'emerging' | 'supported'; status: 'draft' | 'review' | 'published' | 'retired'; published_at: string | null; updated_at: string; };
export type DiscoveryProfile = { goals: string[]; skills: string[]; industries: string[]; markets: string[]; models: string[]; advantages: string[]; hours_weekly: number | null; capital_band: string; complexity: string; entry_mode: string; };
export const EMPTY_DISCOVERY_PROFILE: DiscoveryProfile = { goals: [], skills: [], industries: [], markets: [], models: [], advantages: [], hours_weekly: null, capital_band: '', complexity: '', entry_mode: 'browse' };
export type NextAction = { priority: number; title: string; tab: string; reason: string };

/** P §5: one primary action, with deterministic tie-breaking. */
export function nextAction(input: {
    assumptions: Assumption[]; experiments: Experiment[]; evidence: Evidence[]; hasThesis: boolean;
    links?: { assumption_id: string; evidence_id: string; relation: string }[]; sources?: Source[];
    artifacts?: { artifact_type: string; status: string }[]; workspace?: Workspace;
    staleOrConflicting?: boolean; now?: number; freshnessDays?: Record<string, number>;
}): NextAction {
    const awaitingInput = [...input.experiments].filter(e => e.status === 'running' || e.status === 'ready').sort((a, b) => (a.ends_at ?? '9999').localeCompare(b.ends_at ?? '9999') || a.id.localeCompare(b.id))[0];
    if (awaitingInput) return { priority: 1, title: awaitingInput.status === 'ready' ? 'Start your planned experiment' : 'Record what your experiment is teaching you', tab: 'experiments', reason: awaitingInput.hypothesis };
    const observed = new Set(input.evidence.filter(e => !['ai_hypothesis', 'legacy_ai_hypothesis', 'user_note'].includes(e.evidence_type)).map(e => e.id));
    const unknown = [...input.assumptions].filter(a => a.status !== 'revised' && !(input.links ?? []).some(l => l.assumption_id === a.id && observed.has(l.evidence_id) && l.relation !== 'context')).sort((a, b) => b.importance * b.uncertainty - a.importance * a.uncertainty || a.id.localeCompare(b.id))[0];
    if (unknown) return { priority: 2, title: 'Test what must be true', tab: 'assumptions', reason: unknown.statement };
    const conflicting = input.assumptions.some(a => a.status === 'contradicted' || (input.links?.some(l => l.assumption_id === a.id && l.relation === 'support') && input.links.some(l => l.assumption_id === a.id && l.relation === 'contradict')));
    const freshness: Record<string, number> = { news: 30, trend: 30, search_result: 90, default: 365, ...input.freshnessDays };
    const stale = input.sources?.filter(s => Boolean(s.canonical_url) || ['news', 'trend', 'search_result', 'public_data', 'report'].includes(s.source_type)).some(s => !s.published_at || (input.now ?? Date.now()) - new Date(s.published_at).getTime() > (freshness[s.source_type] ?? freshness.default) * 86400000);
    if (input.staleOrConflicting || conflicting || stale) return { priority: 3, title: 'Review the evidence', tab: 'evidence', reason: conflicting ? 'Evidence challenges an assumption. Review the conflicting observations.' : 'Some sources are old or have unknown publication dates. Check whether they still apply.' };
    if (!input.hasThesis) return { priority: 4, title: 'Write your opportunity thesis', tab: 'brief', reason: 'Name the customer, problem and what remains uncertain.' };
    if (!input.assumptions.length) return { priority: 4, title: 'Name your critical assumptions', tab: 'assumptions', reason: 'Make what must be true explicit before you build.' };
    const stages: Record<string, [string, string, string]> = { shaping: ['mvp', 'shape', 'Define the first version worth testing'], building: ['task', 'build', 'Prepare your MVP backlog'], launching: ['launch_plan', 'launch', 'Prepare your launch plan'] };
    const stageArtifact = stages[input.workspace?.lifecycle_state ?? ''];
    if (stageArtifact && !input.artifacts?.some(a => a.artifact_type === stageArtifact[0] && a.status !== 'draft')) return { priority: 4, title: stageArtifact[2], tab: stageArtifact[1], reason: 'Complete the next artifact for this stage, keeping untested assumptions visible.' };
    return { priority: 5, title: 'Learn through your next artifact', tab: 'school', reason: 'Choose the lesson that helps answer your next question.' };
}

export function evidenceCounts(items: Evidence[]) {
    const inferred = items.filter(e => e.evidence_type === 'ai_hypothesis' || e.evidence_type === 'legacy_ai_hypothesis').length;
    const notes = items.filter(e => e.evidence_type === 'user_note').length;
    return { observed: items.length - inferred - notes, inferred, notes };
}

export function recommendationReasons(opportunity: Opportunity, profile: DiscoveryProfile): string[] {
    const reasons: string[] = [];
    if (profile.industries.some(x => x.toLowerCase() === opportunity.primary_industry.toLowerCase())) reasons.push(`Matches your interest in ${opportunity.primary_industry}`);
    if (profile.markets.some(x => x.toLowerCase() === opportunity.geography.toLowerCase())) reasons.push(`In your selected market: ${opportunity.geography}`);
    if (profile.models.some(x => x.toLowerCase() === opportunity.model.toLowerCase())) reasons.push(`Matches your ${opportunity.model} preference`);
    const skills = opportunity.skills.filter(x => profile.skills.some(s => s.toLowerCase() === x.toLowerCase()));
    if (skills.length) reasons.push(`Uses your ${skills.join(', ')} skills`);
    return reasons.length ? reasons : ['From the curated library; no specific profile match yet'];
}

export function rankOpportunities(items: Opportunity[], profile: DiscoveryProfile): Opportunity[] {
    const fit = (o: Opportunity) => recommendationReasons(o, profile).filter(r => !r.startsWith('From the curated')).length;
    return [...items].sort((a, b) => fit(b) - fit(a) || b.updated_at.localeCompare(a.updated_at) || a.id.localeCompare(b.id));
}

export function safeSourceUrl(raw: string): string | null {
    try { const u = new URL(raw); return ['http:', 'https:'].includes(u.protocol) && !u.username && !u.password ? u.href : null; } catch { return null; }
}

export function validateClaim(claim: Claim, evidence: Evidence[]): string | null {
    if (!claim.text.trim()) return 'Write a claim or mark the section unknown.';
    if (claim.kind !== 'known') return null;
    if (!claim.evidence_ids.length) return 'A known claim needs linked evidence.';
    const sources = evidence.filter(e => claim.evidence_ids.includes(e.id));
    if (sources.length !== claim.evidence_ids.length) return 'Every evidence reference must belong to this opportunity.';
    if (!sources.some(e => !['ai_hypothesis', 'legacy_ai_hypothesis', 'user_note'].includes(e.evidence_type))) return 'AI hypotheses and personal notes cannot establish a known claim.';
    return null;
}
