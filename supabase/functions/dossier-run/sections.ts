// Phoxta — the dossier's sections: what each one asks for, and the shape it must
// answer in.
//
// Kept as data rather than a switch so the chain, the console's section list and
// these prompts cannot drift out of step with each other — adding a section is
// one entry here plus one in ORDER. (The console keeps its own copy of the list
// in src/lib/dossier/sections.ts, because a browser bundle cannot import from a
// Deno function directory. Two hand-maintained lists that must agree, exactly as
// idea-run's ORDER and src/lib/ideas/steps.ts already are.)
//
// THE HONESTY RULE IS ENFORCED HERE, NOT PROMISED ELSEWHERE
//
// A language model has no industry data. Asked for "the UK fashion market" it
// will return a confident, precise, invented number, and someone is deciding
// whether to spend thousands of pounds partly on what this page says. There is
// no web search wired into these functions — only Pexels, for photographs — so
// citing real sources is not buildable today and pretending otherwise would be
// worse than saying nothing.
//
// So every quantity in every contract below is an ESTIMATE object rather than a
// scalar: a range, the sentence explaining what it was derived from, and the
// assumptions a reader can disagree with. The renderer refuses to draw a figure
// whose basis is missing, so a bare number cannot reach a slide even if a model
// returns one. `sources` is always emitted and always empty — that empty array
// is the seam a later research pass fills, with no migration and no rewrite.

export type Section =
  | "industry"
  | "competition"
  | "strategy"
  | "gtm"
  | "pricing"
  | "financials"
  | "operations"
  | "supply"
  | "risk";

export const ORDER: Section[] = [
  "industry",
  "competition",
  "strategy",
  "gtm",
  "pricing",
  "financials",
  "operations",
  "supply",
  "risk",
];

/** The one figure shape, quoted into every contract that carries a number. */
const EST =
  `an ESTIMATE object: { "label": string — what is being counted, "low": string, "high": string, ` +
  `"unit": string — e.g. "per month", "% gross margin", "customers", "weeks", ` +
  `"basis": string — one plain sentence saying what this range was worked out from, ` +
  `"assumptions": string[] — 2 to 4 inputs a reader could disagree with, each naming the number you assumed, ` +
  `"confidence": "low"|"medium"|"high", "sources": [] }`;

/** Appended to every system prompt. The rules, stated to the model in the same
 *  terms the page states them to the reader. */
const HOUSE = `
You have no live market data and no web access. The page says so to the reader, plainly, above everything you write. Therefore:
- Never give a single precise figure as though it had been measured. Every quantity is an ESTIMATE object with a range.
- Make the range honestly wide. "4.9 to 5.1" is a precise figure in a disguise.
- "basis" says what the range came from, in one sentence a shop owner would understand.
- "assumptions" names the inputs, with the numbers you assumed inside them, so a reader can change one and see the range move.
- "sources" is ALWAYS an empty array. Never invent a citation, a publisher, a report title, a survey or a URL.
- If you cannot justify a range, leave that estimate out. A short section is honest; a padded one is not.
- Write for the owner of a small business in plain British English. No "unlock", no "leverage", no "in today's fast-paced world", no exclamation marks. Money in GBP.
- Be specific to THIS trade. Advice that would fit any business is worth nothing to someone who has just paid for this one.`;

const IMG =
  `"imageQuery": string — 3 to 6 words naming something PHOTOGRAPHABLE and specific to this trade that illustrates this section ` +
  `(e.g. "seamstress pinning garment on mannequin", "mechanic checking used car engine"). A concrete scene, never an abstract noun like "growth" or "strategy"`;

export type SectionSpec = {
  system: string;
  tier: "balanced" | "complex";
  maxTokens: number;
  user: (ctx: string, brief: string) => string;
};

export const PROMPTS: Record<Section, SectionSpec> = {
  /* ── 1. Industry & market ─────────────────────────────────────────────── */
  industry: {
    system: `You are an industry analyst briefing someone who has just bought this business and has never traded in it before. Reply with JSON only.${HOUSE}`,
    tier: "complex",
    maxTokens: 5000,
    user: (ctx, brief) => `${ctx}
Describe the industry this business trades in: how it works, how big the reachable part of it is, and what is moving.

Return JSON: {
  "headline": string — one sentence describing the shape of this industry as it stands today,
  "structure": string — 3 to 5 sentences on how the trade is actually organised: who sells, through which channels, where the margin ends up, and what a small independent's place in it is,
  "sizing": [ESTIMATE] — exactly 3, in this order and with these labels: "The whole market", "What an independent can reach", "A realistic first year". Each one narrower than the last, and each basis must explain how you got from the previous line to this one,
  "growth": ESTIMATE — how fast the market is moving, labelled "Annual growth",
  "demandDrivers": [{ "driver": string, "why": string, "direction": "Tailwind"|"Headwind" }] — 4 to 5, a mix of both directions,
  "segments": [{ "name": string, "who": string, "spend": ESTIMATE }] — 3 customer groups inside this market, with what each spends,
  "seasonality": [{ "period": string, "note": string }] — 3 to 4 covering a normal trading year, saying what actually changes in the till,
  ${IMG}
}
Where an ESTIMATE appears above it means ${EST}

The business: ${brief}`,
  },

  /* ── 2. Competitors ───────────────────────────────────────────────────── */
  competition: {
    system: `You are a competitive analyst. Reply with JSON only.${HOUSE}
Name real companies only where you are confident they exist and trade in this market. Where you are not, describe the TYPE of operator instead ("the local independent with one van", "the marketplace-only seller") and say so — an invented competitor is worse than a category.`,
    tier: "complex",
    maxTokens: 5000,
    user: (ctx, brief) => `${ctx}
Map who this business is up against, and where the room is.

Return JSON: {
  "headline": string — one sentence on how competition is really won in this trade,
  "landscape": string — 3 to 4 sentences: how many players there are, how they compete, and what customers switch for,
  "players": [{ "name": string, "kind": "National"|"Marketplace"|"Independent"|"Direct-to-consumer", "positioning": string, "strength": string, "weakness": string }] — 4 to 6,
  "whiteSpace": [{ "gap": string, "whyItExists": string, "howToTake": string }] — 2 to 3 gaps a small operator can actually take, with the reason nobody has,
  "barriers": [{ "barrier": string, "height": "Low"|"Medium"|"High", "note": string }] — 3 to 4 things that make it hard to enter this market, and what each really costs to clear,
  ${IMG}
}

The business: ${brief}`,
  },

  /* ── 3. Strategy ──────────────────────────────────────────────────────── */
  strategy: {
    system: `You are a strategist writing the one page the owner should re-read every month. Reply with JSON only.${HOUSE}
A strategy is a set of choices, and a choice means saying no to something. Every section below must contain a real refusal, not a list of everything that would be nice.`,
    tier: "complex",
    maxTokens: 5000,
    user: (ctx, brief) => `${ctx}
Set the strategy: where this business should play, and how it wins there.

Return JSON: {
  "headline": string — the strategic choice in one sentence, specific enough that a competitor could disagree with it,
  "positioning": { "statement": string — one sentence the owner could say out loud, "forWho": string, "against": string, "because": string },
  "whereToPlay": [{ "choice": string, "why": string }] — 2 to 3 deliberate narrowings: which customers, which products, which geography,
  "howToWin": [{ "move": string, "proof": string }] — 3 to 4 moves, each with what would prove it is working,
  "moat": [{ "advantage": string, "howItCompounds": string, "monthsToBuild": string }] — 2 to 3 advantages that get harder to copy over time,
  "notDoing": string[] — 3 to 4 things this business should deliberately refuse in year one, each with the reason in the same sentence,
  ${IMG}
}

The business: ${brief}`,
  },

  /* ── 4. Go-to-market & launch ─────────────────────────────────────────── */
  gtm: {
    system: `You are writing the launch plan someone will work through with a diary open. Reply with JSON only.${HOUSE}
Every action must be something a person can start on a Monday morning. "Build brand awareness" is not an action; "list twelve products and send the link to the forty people in your phone" is.`,
    tier: "complex",
    maxTokens: 5500,
    user: (ctx, brief) => `${ctx}
Write the first ninety days.

Return JSON: {
  "headline": string — one sentence on how the first customers will actually be found,
  "phases": [{ "phase": string — a name, "window": string — e.g. "Days 1-30", "goal": string, "actions": string[] — 3 to 5 concrete jobs, "target": ESTIMATE — what the end of this phase should look like in numbers }] — exactly 3, covering roughly the first 90 days,
  "channels": [{ "channel": string, "whatItIs": string — how it works in this trade specifically, "effort": "Low"|"Medium"|"High", "cac": ESTIMATE — cost to win one customer through it }] — 3 to 5, ordered by what to try first,
  "firstHundred": string[] — 4 to 6 concrete ways to find the first hundred customers without a marketing budget,
  "messaging": [{ "audience": string, "line": string — the actual sentence to use, not a description of it }] — 2 to 3,
  ${IMG}
}
Where an ESTIMATE appears above it means ${EST}

The business: ${brief}`,
  },

  /* ── 5. Pricing & unit economics ──────────────────────────────────────── */
  pricing: {
    system: `You are a pricing analyst. Reply with JSON only.${HOUSE}
Price ranges must be recognisable to anyone who has shopped in this market. If a range would look wrong to a customer standing in front of the shelf, it is wrong.`,
    tier: "complex",
    maxTokens: 5000,
    user: (ctx, brief) => `${ctx}
Set the pricing and show the economics under it.

Return JSON: {
  "headline": string — one sentence on how this business should be priced and why,
  "architecture": string — 3 to 4 sentences on the structure: what the customer is charged for, what is bundled, what is extra, and where the profit sits,
  "tiers": [{ "name": string, "price": ESTIMATE, "includes": string, "who": string — who buys this one }] — 2 to 3,
  "unitEconomics": [ESTIMATE] — 4 to 5, labelled plainly: average order value, gross margin, cost to win a customer, contribution after costs, and how long a customer pays back,
  "levers": [{ "lever": string, "effect": string — what moves, and roughly by how much }] — 3 to 4 things the owner can change when money is tight,
  "mistakes": string[] — 3 pricing mistakes people make in this specific trade, each with what it costs them,
  ${IMG}
}
Where an ESTIMATE appears above it means ${EST}

The business: ${brief}`,
  },

  /* ── 6. Financial projections ─────────────────────────────────────────── */
  financials: {
    system: `You are writing the money picture for someone who has to decide whether they can afford to run this. Reply with JSON only.${HOUSE}
Three scenarios, not one forecast. A single line through the middle of a range is the most dishonest way to show a projection, because it looks like a prediction.`,
    tier: "complex",
    maxTokens: 6000,
    user: (ctx, brief) => `${ctx}
Show what the first year could look like, and what it rests on.

Return JSON: {
  "headline": string — one sentence on what has to be true for this to make money,
  "scenarios": [{ "name": "Cautious"|"Base"|"Ambitious", "story": string — 2 sentences on what is happening in this version, "revenue": ESTIMATE — monthly revenue by month twelve, "volume": ESTIMATE — orders, bookings or customers a month by then }] — exactly 3, in that order,
  "costs": [{ "item": string, "when": "One-off"|"Monthly", "amount": ESTIMATE }] — 5 to 8, the ones that actually matter in this trade,
  "breakEven": ESTIMATE — how long until monthly revenue covers monthly costs, labelled "Months to break even",
  "cashNeeded": ESTIMATE — cash needed to get there without running out, labelled "Cash to break-even",
  "assumptions": string[] — 4 to 6 plain sentences naming the numbers the whole picture rests on,
  "watchouts": string[] — 3 things that would break this picture, each with the early sign of it happening,
  ${IMG}
}
Where an ESTIMATE appears above it means ${EST}

The business: ${brief}`,
  },

  /* ── 7. Operations manual ─────────────────────────────────────────────── */
  operations: {
    system: `You are writing the operations manual a new owner works from in week one, and hands to their first employee in month six. Reply with JSON only.${HOUSE}
Write instructions, not principles. Say what to open, what to check, and what to do when it is wrong.`,
    tier: "complex",
    maxTokens: 6000,
    user: (ctx, brief) => `${ctx}
Write how this business is run, day to day.

Return JSON: {
  "headline": string — one sentence on what running this well actually means,
  "daily": [{ "task": string, "when": string — e.g. "First thing", "minutes": string, "how": string — the actual steps }] — 4 to 6,
  "weekly": [{ "task": string, "how": string }] — 3 to 4,
  "monthly": [{ "task": string, "how": string }] — 2 to 4,
  "standards": [{ "standard": string, "target": string — a number or a time, "why": string — what goes wrong when it slips }] — 3 to 5 service standards a customer would notice,
  "roles": [{ "role": string, "does": string, "whenToHire": string — the trigger, in numbers, not a date }] — 2 to 4, starting with the owner,
  "tools": [{ "job": string, "tool": string, "note": string }] — 3 to 5, naming the job first so a different tool can be swapped in,
  ${IMG}
}

The business: ${brief}`,
  },

  /* ── 8. Suppliers & sourcing ──────────────────────────────────────────── */
  supply: {
    system: `You are a sourcing manager writing for someone about to make their first supplier call. Reply with JSON only.${HOUSE}
Never name a specific supplier company. You cannot check whether one still trades, still ships to the UK, or still has that minimum order — and a name in a document like this gets phoned. Describe the TYPE, where to find them, and what to ask.`,
    tier: "complex",
    maxTokens: 5000,
    user: (ctx, brief) => `${ctx}
Write the sourcing plan.

Return JSON: {
  "headline": string — one sentence on where supply risk really sits in this trade,
  "model": string — 3 to 4 sentences on how goods or capacity reach the customer, and who holds the stock or the risk at each step,
  "supplierTypes": [{ "type": string, "goodFor": string, "watchFor": string, "leadTime": string, "minimumOrder": ESTIMATE }] — 3 to 4, from easiest-to-start to best-margin,
  "selection": [{ "criterion": string, "howToCheck": string — something to do or ask, before money changes hands }] — 4 to 6,
  "terms": [{ "term": string, "openWith": string — what to ask for, "walkAwayAt": string — where the deal stops being worth doing }] — 3 to 4,
  "stockPolicy": [{ "rule": string, "why": string }] — 3 to 4 rules for how much to hold and when to reorder,
  ${IMG}
}
Where an ESTIMATE appears above it means ${EST}

The business: ${brief}`,
  },

  /* ── 9. Risk register ─────────────────────────────────────────────────── */
  risk: {
    system: `You are writing a risk register a bank manager would recognise. Reply with JSON only.${HOUSE}
Every risk needs an early signal: the thing that shows up in the numbers or the inbox BEFORE it becomes a problem. A risk with no early signal is a worry, not a register entry.`,
    tier: "complex",
    maxTokens: 5500,
    user: (ctx, brief) => `${ctx}
Write the risk register.

Return JSON: {
  "headline": string — one sentence naming the risk that actually kills businesses in this trade,
  "risks": [{ "risk": string, "likelihood": "Low"|"Medium"|"High", "impact": "Low"|"Medium"|"High", "earlySignal": string — what shows up first, and where it shows up, "mitigation": string — what to do now, "ifItHappens": string — what to do then }] — 6 to 8, covering demand, supply, cash, people, platform and regulation,
  "concentration": [{ "dependency": string, "exposure": string — how much of the business rides on it, "reduceBy": string }] — 2 to 3 places the business is dangerously dependent on one thing,
  "reviewCadence": string — one sentence on how often to re-read this and what to change when doing so,
  ${IMG}
}

The business: ${brief}`,
  },
};
