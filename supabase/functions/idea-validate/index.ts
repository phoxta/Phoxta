// Phoxta — idea-validate: the public homepage validator.
//
// Anonymous by design: a visitor types a sentence and gets a scored, evidence-
// led validation report back, with no account. That is the point — it is the
// strongest buying signal the marketing site produces, and asking for a signup
// first would lose most of it.
//
// Which also makes it the one endpoint a stranger can point at a several-
// thousand-token model call. So it is rate-limited per IP per UTC day inside a
// single atomic statement, before any model work starts.
//
// Ported from the Next.js Phoxta's /api/validate-idea. The eight-phase prompt
// is carried over intact — it is the product, not scaffolding — and the amounts
// it reasons in were already GBP, which is now the platform's currency too.
import { preflight, json } from "../_shared/cors.ts";
import { adminClient, type SupabaseClient } from "../_shared/supabaseAdmin.ts";
import { hashIp } from "../_shared/clientIp.ts";
import { callJson } from "../_shared/anthropic.ts";
import { modelFor } from "../_shared/models.ts";
import { meter, platformOrgId } from "../_shared/meter.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

const DAILY_LIMIT = 2;
const MIN_IDEA = 10;
const MAX_IDEA = 1200;

// A whole-day ceiling on the endpoint, claimed through the same atomic
// statement under a sentinel key. No header on an anonymous endpoint is fully
// trustworthy, so the per-caller limit alone can never be the only thing
// standing between a stranger and the model bill: whatever a caller does to
// look new, the day's total generations stop here. Sized far above real
// homepage traffic so an ordinary visitor never meets it; raise it with
// VALIDATOR_DAILY_CEILING rather than editing this.
//
// The sentinel cannot collide with a caller: hashIp only ever returns 32 hex
// characters.
const GLOBAL_KEY = "all:homepage-validator";
const envCeiling = Number(Deno.env.get("VALIDATOR_DAILY_CEILING"));
const GLOBAL_DAILY_LIMIT = Number.isFinite(envCeiling) && envCeiling > 0 ? Math.floor(envCeiling) : 300;

/**
 * Where this spend is recorded. There is no caller to bill — that is the whole
 * design — and ai_usage.organization_id is NOT NULL (0004, never relaxed), so
 * the row lands on Phoxta's own organisation, exactly as dossier-run books the
 * shared blueprint dossiers. This is the platform's marketing cost, and it is
 * the one model call a stranger can trigger; the day it stops appearing in
 * ai_usage is the day nobody can see what the homepage is costing. The IP and
 * global gates above stay the actual limit — there is no org to cap.
 */
const PROMPT = (idea: string) => `You are a senior startup validation strategist. Perform a comprehensive, multi-dimensional deep validation of the following business idea.

IDEA: "${idea}"

Before generating the output, you MUST internally work through ALL 8 validation phases. Use the insights from each phase to inform the scores, strengths, weaknesses, and recommendations in your output.

PHASE 1 - PROBLEM DEFINITION:
Define the core problem this idea solves. Identify the specific target audience (demographics, psychographics, behaviours). Map 3-5 concrete pain points with evidence. Assess how the problem is currently solved and where existing solutions fall short.

PHASE 2 - MARKET RESEARCH:
Size the market: estimate TAM, SAM, and SOM in GBP. Identify the market growth rate (CAGR). Research 3-4 current market trends that support or threaten this idea. Segment the target customers into 2-4 groups with size estimates and willingness-to-pay indicators.

PHASE 3 - VALUE PROPOSITION:
Craft a clear, specific value proposition statement. Identify 3-4 unique advantages this idea has over existing solutions. Define 2-3 key differentiators that would be hard for competitors to replicate.

PHASE 4 - CUSTOMER VALIDATION:
Assess demand signals from public data: forum discussions (Reddit, Indie Hackers, Quora), product reviews of adjacent tools, Google Trends, app store ratings. Evaluate willingness to pay based on comparable products. Flag 2-3 validation risks.

PHASE 5 - BUSINESS MODEL:
Design the most appropriate revenue model. Outline 2-3 pricing tiers with specific GBP prices based on competitor benchmarks. Estimate unit economics (CAC, LTV, LTV:CAC ratio). Project the break-even point in terms of subscribers/customers and timeline.

PHASE 6 - GO-TO-MARKET STRATEGY:
Plan the launch strategy (first 2 weeks). Prioritise 3-4 distribution channels with rationale. Set 3-5 time-based milestones with specific numeric targets. Identify 2-3 strategic partnership opportunities.

PHASE 7 - REPORT SYNTHESIS:
Synthesize the strongest evidence from phases 1-6 into a coherent investor-grade validation narrative with clear risk framing.

PHASE 8 - STRATEGY READINESS:
Evaluate strategic readiness for execution: business plan assumptions quality, operational feasibility, and implementation realism.

Now synthesise your analysis into the following JSON structure. Every field MUST be informed by the deep analysis above - reference specific numbers, markets, competitors, and data points from your research.

Return ONLY a JSON object with these exact fields:

"summary" (string): 4-6 sentence executive summary that references findings from all 8 phases. Include specific market size, growth rate, competitor names, and projected milestones.
"overallScore" (number 1-10): Overall validation confidence. 7+ requires strong evidence across all 8 phases.
"marketScore" (number 1-10): Based on Phase 2 market sizing and growth analysis
"productScore" (number 1-10): Based on Phase 1 problem-solution fit and Phase 3 value proposition strength
"teamReadiness" (number 1-10): Based on execution complexity and Phase 5 business model feasibility
"competitivePosition" (number 1-10): Based on Phase 3 differentiators and Phase 4 competitor gap analysis
"customerDemand" (number 1-10): Based on Phase 4 demand signals and willingness-to-pay evidence
"financialViability" (number 1-10): Based on Phase 5 unit economics and break-even analysis
"riskLevel" ("Low"|"Medium"|"High"|"Critical"): Overall risk based on all 8 phases
"strengths" (string[]): 4-5 validated strengths citing specific evidence from the 8 phases
"weaknesses" (string[]): 4-5 identified risks citing specific gaps found during analysis
"recommendations" (string[]): 4-6 specific, actionable next steps derived from Phase 6 GTM strategy and Phase 4 validation gaps
"competitorComparison" (array of {name: string, score: number 1-10, weakness: string}): 3-5 real competitors, using actual company or product names where possible
"swot" (object with "strengths", "weaknesses", "opportunities", "threats", each a string[] of 3-4 items)

Every monetary figure must be in GBP.`;

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    const body = (await req.json().catch(() => ({}))) as Json;
    const idea = String(body?.idea ?? "").trim();

    if (idea.length < MIN_IDEA) {
      return json({ error: "Tell us a little more about the idea — a sentence or two." }, 400);
    }
    if (idea.length > MAX_IDEA) {
      return json({ error: "That is longer than the validator can take. Trim it to the essentials." }, 400);
    }

    const admin = adminClient();
    const ipHash = await hashIp(req);

    // Claimed before any model call. Checking after would mean a refused
    // request had already cost a full generation.
    const { data: gate, error: gateErr } = await admin.rpc("consume_homepage_validation_attempt", {
      p_ip_hash: ipHash,
      p_limit: DAILY_LIMIT,
    });
    if (gateErr) return json({ error: "Could not start the validation just then." }, 500);

    const claim = (Array.isArray(gate) ? gate[0] : gate) as Json;
    if (claim && claim.allowed === false) {
      return json(
        {
          error: `That is ${DAILY_LIMIT} validations today. Create a free account to keep going — you get the full ten-day programme with it.`,
          limited: true,
          remaining: 0,
        },
        429,
      );
    }

    // Then the day's ceiling, claimed only for requests the per-caller limit
    // already allowed — counting refused ones would let an abuser exhaust the
    // whole endpoint for everyone else without spending a token.
    const { data: ceiling, error: ceilingErr } = await admin.rpc("consume_homepage_validation_attempt", {
      p_ip_hash: GLOBAL_KEY,
      p_limit: GLOBAL_DAILY_LIMIT,
    });
    if (ceilingErr) return json({ error: "Could not start the validation just then." }, 500);
    const ceilingClaim = (Array.isArray(ceiling) ? ceiling[0] : ceiling) as Json;
    if (ceilingClaim && ceilingClaim.allowed === false) {
      // Worth a log line: reaching this on a normal day means either real
      // demand outgrew the ceiling or someone is working around the per-caller
      // limit, and both want a human to look.
      console.error(`[phoxta] idea-validate daily ceiling reached (${ceilingClaim.attempt_count}/${GLOBAL_DAILY_LIMIT})`);
      return json(
        {
          error: "The validator is unusually busy today. Create a free account and you can run yours right away.",
          limited: true,
          remaining: 0,
        },
        429,
      );
    }

    const t0 = Date.now();
    const { data: report, inTok, outTok, cacheWriteTok, cacheReadTok, model } = await callJson<Json>({
      model: modelFor("complex"),
      system: "You are a senior startup validation strategist. Reply with JSON only — no prose, no code fences.",
      user: PROMPT(idea),
      maxTokens: 5000,
    });

    const meterOrg = await platformOrgId(admin, "idea-validate");
    if (meterOrg) {
      await meter(admin, {
        organizationId: meterOrg,
        model,
        feature: "idea-validate",
        tier: "complex",
        inTok, outTok, cacheWriteTok, cacheReadTok,
        latencyMs: Date.now() - t0,
      });
    }

    // The lead is the reason this endpoint is free. Recorded after the work
    // succeeds, so a failed generation does not look like interest.
    await admin.from("homepage_validator_leads").insert({
      idea_seed: idea,
      email: String(body?.email ?? "").trim() || null,
      phone: String(body?.phone ?? "").trim() || null,
      ip_hash: ipHash,
      user_agent: req.headers.get("user-agent"),
      referrer: String(body?.referrer ?? "") || req.headers.get("referer"),
    });

    return json({ report, remaining: claim?.remaining ?? null });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
