// Phoxta — idea-run: generates one step of a validation run.
//
// One step per call, not the whole run in a loop. Supabase kills a function at
// 150s idle and the full chain is minutes of model time, so a single request
// that "does everything" would die partway with some steps saved and no record
// of where it stopped. The client drives the chain and this advances it one
// step, which also means a dropped connection loses one step rather than all of
// them, and a reload can resume from what is already stored.
//
// Ported from the earlier Next.js Phoxta's /api/idea/[id]/generate-* routes.
// The prompts are carried over; the day numbering they used is not — see
// migration 0109.
import { preflight, json } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { callJson } from "../_shared/anthropic.ts";
import { modelFor } from "../_shared/models.ts";
import { searchStock } from "../_shared/stock.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

type Step = "problem" | "market" | "value" | "customer" | "model" | "report" | "strategy";

const ORDER: Step[] = ["problem", "market", "value", "customer", "model", "report", "strategy"];

/**
 * What each step asks for, and the shape it must answer in.
 *
 * Kept as data rather than a switch so the chain, the UI's step list and these
 * prompts cannot drift out of step with each other — adding a step is one entry.
 * Every money figure is GBP, matching the rest of the platform.
 */
const PROMPTS: Record<Step, { system: string; user: (ctx: string, idea: Json) => string; tier: "balanced" | "complex" }> = {
  problem: {
    system: "You are a startup validation strategist. Reply with JSON only.",
    tier: "balanced",
    user: (ctx, idea) => `${ctx}
Define the problem this business solves.

Return JSON: {
  "statement": string — the core problem in one sharp sentence,
  "audience": { "who": string, "demographics": string, "behaviours": string },
  "painPoints": [{ "pain": string, "evidence": string, "severity": "Low"|"Medium"|"High" }] — 3 to 5,
  "currentSolutions": [{ "name": string, "shortfall": string }] — 2 to 4,
  "whyNow": string — what changed that makes this solvable now,
  "imageQuery": string — 3 to 6 words naming something PHOTOGRAPHABLE and specific to this business that illustrates this stage (e.g. "dark store order picking", "family eating dinner at home"). A concrete scene, never an abstract noun like "growth" or "strategy"
}
The idea: "${idea.idea_seed}"`,
  },
  market: {
    system: "You are a market analyst. Reply with JSON only. All figures in GBP.",
    tier: "complex",
    user: (ctx, idea) => `${ctx}
Size this market and map who is already in it.

Return JSON: {
  "tam": { "value": string, "basis": string },
  "sam": { "value": string, "basis": string },
  "som": { "value": string, "basis": string },
  "cagr": string,
  "trends": [{ "trend": string, "impact": "Supports"|"Threatens", "note": string }] — 3 to 4,
  "segments": [{ "name": string, "size": string, "willingnessToPay": string }] — 2 to 4,
  "competitors": [{ "name": string, "positioning": string, "weakness": string }] — 3 to 5 real companies,
  "imageQuery": string — 3 to 6 words naming something PHOTOGRAPHABLE and specific to this business that illustrates this stage (e.g. "dark store order picking", "family eating dinner at home"). A concrete scene, never an abstract noun like "growth" or "strategy"
}
The idea: "${idea.idea_seed}"`,
  },
  value: {
    system: "You are a positioning strategist. Reply with JSON only.",
    tier: "balanced",
    user: (ctx, idea) => `${ctx}
Define the value proposition and what makes it defensible.

Return JSON: {
  "statement": string — one sentence a customer would repeat,
  "advantages": [{ "advantage": string, "why": string }] — 3 to 4,
  "differentiators": [{ "differentiator": string, "moat": string }] — 2 to 3 that are hard to copy,
  "positioningAgainst": [{ "competitor": string, "ourAngle": string }] — 2 to 3,
  "imageQuery": string — 3 to 6 words naming something PHOTOGRAPHABLE and specific to this business that illustrates this stage (e.g. "dark store order picking", "family eating dinner at home"). A concrete scene, never an abstract noun like "growth" or "strategy"
}
The idea: "${idea.idea_seed}"`,
  },
  customer: {
    system: "You are a customer research analyst. Reply with JSON only. All figures in GBP.",
    tier: "complex",
    user: (ctx, idea) => `${ctx}
Assess real demand using public evidence.

Return JSON: {
  "demandSignals": [{ "source": string, "signal": string, "strength": "Weak"|"Moderate"|"Strong" }] — 3 to 5,
  "willingnessToPay": { "evidence": string, "range": string },
  "risks": [{ "risk": string, "test": string }] — 2 to 3 with the cheapest way to test each,
  "interviewQuestions": string[] — 5 questions that would disprove this idea fastest,
  "imageQuery": string — 3 to 6 words naming something PHOTOGRAPHABLE and specific to this business that illustrates this stage (e.g. "dark store order picking", "family eating dinner at home"). A concrete scene, never an abstract noun like "growth" or "strategy"
}
The idea: "${idea.idea_seed}"`,
  },
  model: {
    system: "You are a business model strategist. Reply with JSON only. All figures in GBP.",
    tier: "complex",
    user: (ctx, idea) => `${ctx}
Design the revenue model and the economics under it.

Return JSON: {
  "revenueModel": string,
  "tiers": [{ "name": string, "price": string, "includes": string }] — 2 to 3, benchmarked against real competitors,
  "unitEconomics": { "cac": string, "ltv": string, "ltvCacRatio": string, "grossMargin": string },
  "breakEven": { "customers": string, "timeline": string, "assumptions": string },
  "costs": [{ "item": string, "monthly": string }] — the 4 to 6 that matter,
  "imageQuery": string — 3 to 6 words naming something PHOTOGRAPHABLE and specific to this business that illustrates this stage (e.g. "dark store order picking", "family eating dinner at home"). A concrete scene, never an abstract noun like "growth" or "strategy"
}
The idea: "${idea.idea_seed}"`,
  },
  report: {
    system: "You are a senior validation strategist writing for a founder deciding whether to commit. Reply with JSON only.",
    tier: "complex",
    user: (ctx, idea) => `${ctx}
Judge this idea on everything gathered above. Be honest — a founder acts on this.

Return JSON: {
  "summary": string — 4 to 6 sentences citing specific numbers from the analysis,
  "overallScore": number 1-10,
  "marketScore": number 1-10,
  "productScore": number 1-10,
  "competitivePosition": number 1-10,
  "customerDemand": number 1-10,
  "financialViability": number 1-10,
  "riskLevel": "Low"|"Medium"|"High"|"Critical",
  "verdict": "Pursue"|"Refine"|"Reconsider",
  "strengths": string[] — 4 to 5, each citing evidence,
  "weaknesses": string[] — 4 to 5, each citing a real gap,
  "recommendations": string[] — 4 to 6 concrete next actions,
  "swot": { "strengths": string[], "weaknesses": string[], "opportunities": string[], "threats": string[] },
  "imageQuery": string — 3 to 6 words naming something PHOTOGRAPHABLE and specific to this business that illustrates this stage (e.g. "dark store order picking", "family eating dinner at home"). A concrete scene, never an abstract noun like "growth" or "strategy"
}
The idea: "${idea.idea_seed}"`,
  },
  strategy: {
    system: "You are writing an investor-grade business plan. Reply with JSON only. All figures in GBP.",
    tier: "complex",
    user: (ctx, idea) => `${ctx}
Write the business plan.

Return JSON: {
  "executiveSummary": string,
  "sections": [{ "heading": string, "body": string }] — Market, Product, Go-to-market, Operations, Team, Risks,
  "financials": {
    "assumptions": string[],
    "projection": [{ "period": string, "revenue": string, "costs": string, "net": string }] — 4 periods
  },
  "milestones": [{ "when": string, "target": string }] — 4 to 6, each with a number,
  "fundingNeed": { "amount": string, "use": string },
  "imageQuery": string — 3 to 6 words naming something PHOTOGRAPHABLE and specific to this business that illustrates this stage (e.g. "dark store order picking", "family eating dinner at home"). A concrete scene, never an abstract noun like "growth" or "strategy"
}
The idea: "${idea.idea_seed}"`,
  },
};

/** Everything generated so far, so each step builds on the last instead of
 *  re-reasoning from the seed alone. Trimmed, because the whole profile would
 *  crowd out the instruction by the final steps. */
function contextFor(idea: Json, step: Step): string {
  const profile = (idea.ai_profile ?? {}) as Record<string, Json>;
  const earlier = ORDER.slice(0, ORDER.indexOf(step)).filter((k) => profile[k] || (k === "report" && idea.report));
  if (earlier.length === 0) return "";
  const parts = earlier.map((k) => `## ${k}\n${JSON.stringify(k === "report" ? idea.report : profile[k]).slice(0, 2500)}`);
  return `Work already completed for this idea:\n\n${parts.join("\n\n")}\n\n---\n`;
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    const who = await requireUser(req);
    if ("error" in who) return who.error;

    const body = (await req.json().catch(() => ({}))) as Json;
    const ideaId = String(body?.ideaId ?? "");
    const step = String(body?.step ?? "") as Step;
    if (!ideaId || !PROMPTS[step]) return json({ error: "Unknown step." }, 400);

    const admin = adminClient();

    // Scoped by user_id as well as id: the row id alone would let one account
    // generate against another's idea.
    const { data: idea } = await admin
      .from("ideas").select("*").eq("id", ideaId).eq("user_id", who.userId).maybeSingle();
    if (!idea) return json({ error: "That idea was not found." }, 404);

    const spec = PROMPTS[step];
    const { data: output } = await callJson<Json>({
      model: modelFor(spec.tier),
      system: spec.system,
      user: spec.user(contextFor(idea, step), idea),
      maxTokens: step === "strategy" ? 6000 : 4000,
    });

    // Resolve the stage's own photograph while we are here. The model named a
    // subject in imageQuery; this turns it into an actual picture, once, and
    // stores it — so the slide never searches at render time and the same stage
    // always shows the same photo. A failure leaves the field unset and the
    // client falls back to its curated set rather than to a grey box.
    if (output && typeof output === "object" && typeof output.imageQuery === "string") {
      const image = await searchStock(output.imageQuery);
      if (image) output.image = image;
    }

    // The report has its own column because completion is derived from it.
    const patch: Json = { current_step: step, run_error: null };
    if (step === "report") {
      patch.report = output;
    } else {
      patch.ai_profile = { ...((idea as Json).ai_profile ?? {}), [step]: output };
    }
    if (step === ORDER[ORDER.length - 1]) {
      patch.status = "completed";
      patch.run_finished_at = new Date().toISOString();
    }

    const { error: upErr } = await admin.from("ideas").update(patch).eq("id", ideaId);
    if (upErr) return json({ error: upErr.message }, 500);

    const idx = ORDER.indexOf(step);
    return json({ step, output, next: ORDER[idx + 1] ?? null, done: idx === ORDER.length - 1 });
  } catch (err) {
    // Recorded on the idea so a failed run shows why rather than looking idle.
    try {
      const b = (await req.clone().json().catch(() => ({}))) as Json;
      if (b?.ideaId) {
        await adminClient().from("ideas")
          .update({ run_error: String((err as Error)?.message || err).slice(0, 300) })
          .eq("id", b.ideaId);
      }
    } catch { /* the response below still carries the reason */ }
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
