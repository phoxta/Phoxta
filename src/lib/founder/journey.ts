import type { Stage, StageId } from "./types";

// The ten stages of the Founder Toolkit, mirroring the journey map in the
// `entrepreneur-handbook` skill. Handbook chapters give the method; the S-files
// give what is true in 2026.

export const STAGES: Stage[] = [
    {
        id: "fit",
        slug: "founder-fit",
        number: 0,
        title: "Founder fit",
        question: "Am I the right person to do this, and am I ready?",
        summary:
            "Check yourself honestly before you spend money. The evidence says what predicts success is not what most people think.",
        gate: "Plan, ability to execute and motivation all present",
        handbook: ["Ch 1"],
        modern: ["S13"],
        tools: ["founder-fit", "founder-market-fit", "base-rates", "start-or-buy"],
    },
    {
        id: "opportunity",
        slug: "opportunity",
        number: 1,
        title: "The opportunity",
        question: "Is there a real problem, a real market, and a real profit in this?",
        summary:
            "Turn an idea into a tested opportunity: define the problem, size the market, prove the economics before you build.",
        gate: "Five-characteristic scorecard passes and the two final questions answered",
        handbook: ["Ch 2", "App B"],
        modern: ["S10"],
        tools: ["market-evaluation", "opportunity-score", "risk-return", "breakeven", "pmf-level"],
    },
    {
        id: "model",
        slug: "business-model",
        number: 2,
        title: "Model and strategy",
        question: "How do we make money, and why would anyone pick us?",
        summary:
            "Build a model that passes both tests: a story that makes sense, and numbers that add up. Then price it.",
        gate: "Narrative and numbers tests pass; pricing model chosen",
        handbook: ["Ch 3"],
        modern: ["S10", "S05"],
        tools: ["five-questions", "model-builder", "pricing-designer", "moat-audit"],
    },
    {
        id: "legal",
        slug: "legal-structure",
        number: 3,
        title: "Legal structure",
        question: "Which entity, and what is written down between the owners?",
        summary:
            "Pick a form for where you are going, not where you are. Get the founder paperwork right before it costs you.",
        gate: "Form chosen for your country, founder terms drafted",
        handbook: ["Ch 4"],
        modern: ["S09"],
        tools: ["legal-form", "founder-hygiene", "vesting-designer"],
    },
    {
        id: "plan",
        slug: "plan-and-pitch",
        number: 4,
        title: "Plan and pitch",
        question: "Can a stranger understand this and back it in two minutes?",
        summary:
            "The long plan is now one of several artefacts. Build the one your reader actually wants, then pressure-test it.",
        gate: "Reader-lens review clean; ask, use of funds and exit all present",
        handbook: ["Ch 5"],
        modern: ["S13", "S02"],
        tools: ["plan-generator", "deck-doctor", "positioning", "team-check"],
    },
    {
        id: "capital",
        slug: "startup-capital",
        number: 5,
        title: "Startup capital",
        question: "How much do I need to open the doors, and where does it come from?",
        summary:
            "Size the number first, then stack the cheapest sources. Most businesses never raise venture capital and do not need to.",
        gate: "Launch capital sized and the source stack covers it",
        handbook: ["Ch 6", "App A"],
        modern: ["S06"],
        tools: ["startup-capital", "source-stack", "funding-router"],
    },
    {
        id: "operate",
        slug: "launch-and-operate",
        number: 6,
        title: "Launch and operate",
        question: "How do I actually get customers and run the place?",
        summary:
            "The part most startup advice skips. Sell, market, hire, run the week, and know your unit economics.",
        gate: "First customers, a weekly cadence, and monthly numbers you trust",
        handbook: ["App A", "App B"],
        modern: ["S01", "S02", "S03", "S04", "S05"],
        tools: [
            "icp-builder",
            "pipeline-calculator",
            "sales-hire-gate",
            "channel-picker",
            "cac-payback",
            "unit-economics",
            "cash-forecast",
            "cadence-builder",
            "first-hires",
            "offer-calculator",
        ],
    },
    {
        id: "growth",
        slug: "growth-funding",
        number: 7,
        title: "Growth funding",
        question: "Debt, equity or cash flow, and from whom?",
        summary:
            "Know what a lender asks and what an investor is really buying. Understand the dilution before you sign.",
        gate: "Lender questions answered or investor fit confirmed; efficiency in band",
        handbook: ["Ch 7", "Ch 8"],
        modern: ["S06", "S05"],
        tools: ["loan-readiness", "dilution", "safe-stack", "term-sheet", "investor-readiness"],
    },
    {
        id: "scale",
        slug: "scale",
        number: 8,
        title: "Scaling up",
        question: "Is the strategy still working, and can the organisation keep up?",
        summary:
            "Growth breaks what got you here. Change how you lead, build the operating system, keep the innovation alive.",
        gate: "Growth questions answered; an operating system someone else can run",
        handbook: ["Ch 10", "Ch 11", "Ch 12"],
        modern: ["S11", "S03"],
        tools: ["growth-gate", "leadership-mode", "founder-mode", "ai-native", "span-designer"],
    },
    {
        id: "harvest",
        slug: "exit",
        number: 9,
        title: "Exit and harvest",
        question: "What is this worth, and how do I turn paper into money?",
        summary:
            "Know your options long before you need them. Value is always a range, and liquidity no longer requires a sale.",
        gate: "Motivation named, mechanism chosen, valuation range agreed",
        handbook: ["Ch 9", "Ch 13", "App C"],
        modern: ["S12"],
        tools: ["exit-route", "valuation", "multiples", "diligence-ready"],
    },
];

export const STAGE_BY_SLUG: Record<string, Stage> = Object.fromEntries(
    STAGES.map((s) => [s.slug, s]),
);

export const STAGE_BY_ID: Record<StageId, Stage> = Object.fromEntries(
    STAGES.map((s) => [s.id, s]),
) as Record<StageId, Stage>;

/** Countries the regional content actually covers, in the order most useful here. */
export const COUNTRIES: { code: string; label: string }[] = [
    { code: "GB", label: "United Kingdom" },
    { code: "NG", label: "Nigeria" },
    { code: "US", label: "United States" },
    { code: "EU", label: "European Union" },
    { code: "IN", label: "India" },
    { code: "SG", label: "Singapore / SE Asia" },
    { code: "AE", label: "UAE / Gulf" },
    { code: "ZA", label: "South Africa" },
    { code: "KE", label: "Kenya" },
    { code: "CA", label: "Canada" },
    { code: "AU", label: "Australia" },
    { code: "OTHER", label: "Somewhere else" },
];

export const MODELS: { value: string; label: string; help: string }[] = [
    { value: "saas", label: "Software / SaaS", help: "Subscription software, per seat or usage" },
    { value: "marketplace", label: "Marketplace", help: "You connect buyers and sellers, take a cut" },
    { value: "ecommerce", label: "E-commerce / DTC", help: "You sell physical products directly" },
    { value: "services", label: "Services", help: "You sell people's time and expertise" },
    { value: "ai", label: "AI product", help: "Your product's core value comes from a model" },
    { value: "other", label: "Something else", help: "Retail, hospitality, trades, content and more" },
];
