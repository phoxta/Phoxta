// Dedicated durable worker: deno run --allow-env --allow-net workers/opportunity-research/main.ts
// Never imported into a browser bundle. Deployment and secret setup are explicit.
import { adminClient } from '../../supabase/functions/_shared/supabaseAdmin.ts';
import { callJson } from '../../supabase/functions/_shared/anthropic.ts';
import { reserveEstimate, safeResearchFailure, VERIFIED_RATES, type ModelRates } from './budget.ts';
import { braveProvider, tavilyProvider, retrieve } from './providers.ts';
import { qualityGate, SYNTHESIS_SYSTEM } from './pipeline.ts';
import { PLANNER_SYSTEM, CRITIC_SYSTEM, parsePlan, applyCritique } from './planning.ts';
import type { SourceCandidate } from './providers.ts';

const db = adminClient();
const providers = [braveProvider(Deno.env.get('BRAVE_SEARCH_API_KEY') ?? ''), tavilyProvider(Deno.env.get('TAVILY_API_KEY') ?? '')];
const rates: ModelRates = { ...VERIFIED_RATES, ...JSON.parse(Deno.env.get('OPPORTUNITY_MODEL_RATES') || '{}') };
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
let stopping = false;
for (const signal of ['SIGINT', 'SIGTERM'] as const) { try { Deno.addSignalListener(signal, () => { stopping = true; }); } catch { /* SIGTERM is unsupported on Windows. */ } }

async function rpc(name: string, args?: Record<string, unknown>) { const result = await db.rpc(name, args); if (result.error) throw new Error(result.error.message); return result.data; }
while (!stopping) {
    let job: { id: string; lease_token: string; query_plan: { question?: string; geography?: string }; max_sources: number; max_cost_usd: number; cost_usd: number } | null = null;
    try {
        job = await rpc('opportunity_claim_research');
        if (!job) { if (Deno.args.includes('--once')) break; await sleep(5000); continue; }
        const stage = (status: string, cost = 0) => rpc('opportunity_research_stage', { p_job: job!.id, p_lease: job!.lease_token, p_status: status, p_cost: cost });
        const question = job.query_plan.question?.trim();
        if (!question || question.length > 4000) throw new Error('A research question between 1 and 4000 characters is required.');
        const model = Deno.env.get('OPPORTUNITY_RESEARCH_MODEL') || 'claude-sonnet-4-6';
        const planResponse = await callJson({ model, system: PLANNER_SYSTEM, user: JSON.stringify(job.query_plan), maxTokens: 1000,
            beforeAttempt: attempt => stage('planning', reserveEstimate(attempt, rates)),
        });
        const plan = parsePlan(planResponse.data, question);
        await stage('fetching');
        // At most two fixed provider endpoints; no direct fetch of source URLs.
        const sources: SourceCandidate[] = []; const used = new Set<string>();
        for (const query of plan.queries) {
            const found = await retrieve(providers, `${query} ${job.query_plan.geography ?? ''}`, Math.min(4, job.max_sources - sources.length), AbortSignal.timeout(45000), cost => stage('fetching', cost));
            used.add(found.provider);
            for (const source of found.sources) if (!sources.some(s => s.url === source.url)) sources.push(source);
            if (sources.length >= job.max_sources) break;
        }
        if (!sources.length) throw new Error('No source candidates were found. Broaden the question or market.');
        await stage('extracting');
        const response = await callJson({ model, system: SYNTHESIS_SYSTEM, user: JSON.stringify({ question, plan, geography: job.query_plan.geography ?? null, evidence: sources }), maxTokens: 2400,
            beforeAttempt: attempt => stage('synthesizing', reserveEstimate(attempt, rates)),
        });
        const checked = qualityGate(response.data, sources);
        const critique = await callJson({ model, system: CRITIC_SYSTEM, user: JSON.stringify({ draft: checked, evidence: sources }), maxTokens: 1200,
            beforeAttempt: attempt => stage('synthesizing', reserveEstimate(attempt, rates)),
        });
        const review = applyCritique(checked, critique.data);
        await rpc('opportunity_finish_research', { p_job: job.id, p_lease: job.lease_token, p_sources: sources, p_artifact: { ...review, intake: plan, provider: [...used].join(','), model: response.model, token_usage: { input: planResponse.inTok + response.inTok + critique.inTok, output: planResponse.outTok + response.outTok + critique.outTok }, cost_kind: 'reserved_upper_estimate' } });
        console.log(JSON.stringify({ event: 'research_review_ready', job_id: job.id, source_count: sources.length }));
    } catch (error) {
        const message = safeResearchFailure(error);
        if (job) { try { await rpc('opportunity_finish_research', { p_job: job.id, p_lease: job.lease_token, p_sources: [], p_artifact: {}, p_error: message }); } catch { /* Cancellation or another lease won. Do not overwrite it. */ } }
        console.error(JSON.stringify({ event: 'research_failed', job_id: job?.id, message: message.slice(0, 250) }));
        if (!job) await sleep(5000);
    }
    if (Deno.args.includes('--once')) break;
}
