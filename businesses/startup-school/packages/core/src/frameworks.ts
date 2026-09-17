import type { Advice, Venture, VentureSectionId, VentureStage } from "./types";

/**
 * The content layer shared by the venture record and the adviser.
 *
 * Two things live here rather than in a component, for the same reason the
 * catalogue lives in `seed.ts`: they are edited as content, they are read by
 * three surfaces (the record page, the demo adviser, the mentor brief), and a
 * ninth section or a fourteenth framework should be a data change.
 *
 * The frameworks are deliberately an INDEX, not a corpus. Every answer names
 * the framework and the chapter it came from so a founder can go and read the
 * actual thing — an adviser that paraphrases a book without saying which book
 * is indistinguishable from one making it up.
 */

// ---------------------------------------------------------------------------
// The venture record

export interface SectionSpec {
    id: VentureSectionId;
    title: string;
    /** What this section is for, in one line, on the page. */
    blurb: string;
    /** The question the body answers. Shown as the textarea's placeholder. */
    prompt: string;
    /** The stage at which this section stops being optional. */
    from: VentureStage;
    /** Examples of what belongs in the claims list. */
    claimHint: string;
}

export const VENTURE_SECTIONS: SectionSpec[] = [
    {
        id: "founder",
        title: "You",
        blurb: "The three must-haves: a plan, the ability to execute it, and motivation that outlasts the first bad quarter.",
        prompt: "What are you bringing to this that most people trying it would not have? And what is the gap you already know about?",
        from: "fit",
        claimHint: "e.g. “I can sell this myself for the first year” — guess, evidence or proven?",
    },
    {
        id: "opportunity",
        title: "The opportunity",
        blurb: "Who has the problem, how badly, and how you would know if you were wrong.",
        prompt: "Whose problem is this, what do they do about it today, and what does that cost them?",
        from: "opportunity",
        claimHint: "Each of the ten market questions belongs here, with what would settle it.",
    },
    {
        id: "model",
        title: "The model",
        blurb: "Value created, value captured, why you, why they stay, how they find you.",
        prompt: "Write the narrative test: who the customer is, what they value, and how you make money at a sensible cost. Then the numbers test.",
        from: "model",
        claimHint: "e.g. “They will pay monthly rather than per project.”",
    },
    {
        id: "legal",
        title: "Legal form",
        blurb: "Liability, tax, ownership, cost, fundraising fit, continuity — and always jurisdiction-dependent.",
        prompt: "Where will this be registered, what form are you leaning towards, and what have you agreed with any co-founder?",
        from: "legal",
        claimHint: "The six founder-agreement terms: split, vesting, decision rights, roles, exit, deadlock.",
    },
    {
        id: "plan",
        title: "The plan",
        blurb: "People and model outrank the numbers. State the assumption behind every figure.",
        prompt: "The one-sentence version, then the hundred-word version. What are you asking for, and what does it buy?",
        from: "plan",
        claimHint: "e.g. “Twelve months of runway gets us to 200 paying customers.”",
    },
    {
        id: "money",
        title: "Money",
        blurb: "Size the opening balance sheet first, then stack the sources cheapest-first.",
        prompt: "What does it cost to open the doors, where is that coming from, and how many months does it buy?",
        from: "capital",
        claimHint: "e.g. “Suppliers will give us 30 days” — have you asked, or are you assuming?",
    },
    {
        id: "traction",
        title: "Traction",
        blurb: "Customers, revenue, and the four or five numbers that actually move the decision.",
        prompt: "What is true today — customers, revenue, retention, burn? Not the pipeline. What has happened.",
        from: "launch",
        claimHint: "e.g. “Churn is seasonal, not a product problem.”",
    },
    {
        id: "asks",
        title: "What you need",
        blurb: "What you want help with. Your mentors read this before a session.",
        prompt: "What are you stuck on this month? Be specific enough that someone could actually help.",
        from: "fit",
        claimHint: "An ask is not a claim — leave this list empty unless something needs testing.",
    },
];

export const STAGE_ORDER: VentureStage[] = [
    "fit", "opportunity", "model", "legal", "plan",
    "capital", "launch", "growth", "scale", "harvest",
];

export const STAGE_LABEL: Record<VentureStage, string> = {
    fit: "Founder fit",
    opportunity: "Opportunity",
    model: "Model and strategy",
    legal: "Legal form",
    plan: "Plan and pitch",
    capital: "Startup money",
    launch: "Launch and operate",
    growth: "Growth money",
    scale: "Scale",
    harvest: "Harvest",
};

/** An empty record, so a founder who has written nothing still has an object. */
export const emptyVenture = (): Venture => ({
    name: "",
    oneLiner: "",
    stage: "fit",
    country: "",
    sections: {},
    updatedAt: new Date().toISOString(),
});

// ---------------------------------------------------------------------------
// The framework index

export interface Framework {
    id: string;
    name: string;
    /** Chapter of the handbook, and the 2026 supplement that revises it. */
    source: string;
    stage: VentureStage;
    /** Matched against the question, lowercase, whole words not required. */
    keywords: string[];
    /** The framework in two or three sentences. */
    summary: string;
    /** The question it puts back to the founder. This is the actual work. */
    question: string;
    nextStep: string;
    /** Where the 2018 handbook and the 2026 research disagree. Both are shown. */
    revision?: string;
}

export const FRAMEWORKS: Framework[] = [
    {
        id: "founder-fit",
        name: "The three must-haves",
        source: "ch 1 · S13",
        stage: "fit",
        keywords: ["ready", "quit", "job", "co-founder", "cofounder", "partner", "skills", "am i", "right person", "solo"],
        summary:
            "A venture needs a plan, someone able to execute it, and motivation that lasts past the first bad quarter. Gaps in the second resolve three ways: learn it, hire it, or co-found it — and the choice is usually a question of how long you have.",
        question: "Which of the three is weakest right now, and is it a learn, a hire, or a co-found?",
        nextStep: "Write the gap down in the You section and mark which of the three it is.",
        revision:
            "2026: prior experience in the same industry is the predictor the administrative data supports (Azoulay et al., 2020); a single trait checklist is not. Team personality diversity roughly doubles the odds. Score the access and the combination, not one temperament.",
    },
    {
        id: "ten-questions",
        name: "The ten market questions",
        source: "ch 2 · appx B · S10",
        stage: "opportunity",
        keywords: ["market", "customer", "problem", "demand", "size", "tam", "competitor", "validate", "idea", "worth doing"],
        summary:
            "Ten questions about the market, each carrying a confidence and a test that could settle it. An opportunity is worth pursuing when it creates value, is profitable, fits you, is durable, and is financeable — five separate tests, not one feeling.",
        question: "Which of your ten answers is a guess you have been treating as a fact?",
        nextStep: "Pick your lowest-confidence claim and write the test that would settle it this week.",
    },
    {
        id: "pmf",
        name: "Product-market fit",
        source: "ch 3 · S10",
        stage: "model",
        keywords: ["product-market", "product market", "pmf", "fit", "retention", "churn", "are we there"],
        summary:
            "Fit is not a moment you cross. It has levels, it is measured continuously — retention curve flattening, organic pull, the 40% must-have survey — and it can be lost when the market moves.",
        question: "What is your retention curve doing at 90 days, and is it flattening or still falling?",
        nextStep: "Plot cohort retention by signup month. If no curve flattens, you do not have fit yet.",
        revision:
            "2026: the handbook treats fit as a threshold to reach before scaling. The current view is that it is a level you hold — teams that stopped measuring after declaring it are the ones who lost it.",
    },
    {
        id: "model-five",
        name: "The five model questions",
        source: "ch 3",
        stage: "model",
        keywords: ["business model", "pricing", "price", "revenue", "monetise", "monetize", "charge", "positioning", "strategy"],
        summary:
            "What value do you create, how do you capture some, why you rather than anyone, why do they stay, and how do they find you. Magretta's two tests: the narrative has to hold together, and the numbers have to add up.",
        question: "What does your strategy rule out? A strategy that rules nothing out is a wish.",
        nextStep: "Write the one sentence describing a customer you are deliberately not serving.",
    },
    {
        id: "legal-form",
        name: "Choosing a form",
        source: "ch 4 · S09",
        stage: "legal",
        keywords: ["company", "incorporate", "register", "llc", "ltd", "limited", "structure", "shares", "equity split", "vesting", "tax"],
        summary:
            "Six forms compared across liability, tax, ownership, cost, fundraising fit and continuity. The founder agreement needs six terms settled in writing: split, vesting, decision rights, roles, exit and deadlock.",
        question: "Which jurisdiction, and have the six founder terms been written down or just discussed?",
        nextStep: "Draft the six terms as a one-page brief and take it to local counsel. This is not a place for a template.",
        revision:
            "2026, US founders only: QSBS after 4 July 2025 excludes 50% of the gain at 3 years, 75% at 4 and 100% at 5, up to $15M per issuer — and the clock starts when C-corp stock is issued, which prices the 'LLC now, convert later' path. Raise it with counsel before incorporating.",
    },
    {
        id: "plan-pitch",
        name: "The plan and its compressions",
        source: "ch 5 · S13",
        stage: "plan",
        keywords: ["plan", "pitch", "deck", "investor", "business plan", "one-pager", "memo", "data room"],
        summary:
            "Seven sections, and the people and the model outrank the numbers. Every figure carries the assumption behind it. Then compress: a hundred words, one sentence, a deck to present from and a deck to read.",
        question: "What is the assumption behind your largest number, and where did it come from?",
        nextStep: "Write the one-sentence version. If it takes two, the model is not settled.",
        revision:
            "2026: the forty-page plan now survives mainly for banks, grants and visa applications. For everyone else it is a one-pager, a deck, a memo and a data room.",
    },
    {
        id: "startup-money",
        name: "Sizing and stacking the money",
        source: "ch 6 · appx A · S06",
        stage: "capital",
        keywords: ["funding", "raise", "money", "capital", "loan", "grant", "bootstrap", "investor", "angel", "runway"],
        summary:
            "Size the opening balance sheet first — you cannot stack sources against a number you have not worked out. Then cheapest-first. Roughly seven in ten businesses are Main Street, one in six supply-chain, and about three in a hundred high-growth; the funding path follows the type, not the ambition.",
        question: "Which of the three types is this, honestly? The answer decides who you should be talking to.",
        nextStep: "Build the opening balance sheet before the first funding conversation.",
    },
    {
        id: "founder-sales",
        name: "Founder-led sales",
        source: "S01 · S02",
        stage: "launch",
        keywords: ["sales", "sell", "customers", "first customer", "outreach", "discovery", "marketing", "leads", "growth"],
        summary:
            "The founder sells to roughly the first hundred customers, because that is where the model is actually learned. Discovery asks about the past — what they did, what it cost, what they tried — never about the future, because people are reliably wrong about what they will do.",
        question: "In your last ten conversations, how many asked what they did last time versus what they would do?",
        nextStep: "Rewrite your discovery questions in the past tense and run five calls.",
    },
    {
        id: "unit-economics",
        name: "The numbers that decide",
        source: "S04 · S05",
        stage: "launch",
        keywords: ["cac", "ltv", "unit economics", "burn", "runway", "cash", "margin", "forecast", "metrics", "profit"],
        summary:
            "Three statements and how they link; a rolling thirteen-week cash forecast; acquisition cost, payback period, cohort retention, burn and runway. Profit is an opinion, cash is a fact.",
        question: "How many months of runway, and what is the decision you will make when it reaches nine?",
        nextStep: "Start the thirteen-week forecast this week. It is the only one that catches a problem early enough.",
    },
    {
        id: "growth-money",
        name: "Debt, equity and the terms",
        source: "ch 7 · ch 8 · S06",
        stage: "growth",
        keywords: ["term sheet", "valuation", "dilution", "vc", "venture capital", "series a", "debt", "bank", "preference"],
        summary:
            "A banker asks three questions; a lender watches five ratios; the matching principle says the life of the loan matches the life of the asset. A venture fund needs one investment in fifteen to be very large, and that single fact explains the terms — liquidation preference, anti-dilution, protective provisions.",
        question: "Does this business have a plausible path to the outcome a fund needs, or are you raising the wrong kind of money?",
        nextStep: "Model what a 1x participating preference does to your own outcome at three exit prices.",
        revision:
            "2026: multiples compressed from the 2021 peak and have not returned. A valuation quoted from a 2021 comparable is a negotiating position, not a benchmark.",
    },
    {
        id: "scale",
        name: "Scaling without hollowing out",
        source: "ch 10–12 · S11",
        stage: "scale",
        keywords: ["hire", "hiring", "team", "delegate", "manage", "scale", "process", "culture", "outsource"],
        summary:
            "Content shapes behaviours, behaviours produce results, results set context. Two hard rules: never outsource a link the customer touches, and never depend on a single partner for something you cannot replace in a quarter.",
        question: "Which part of the business do you still need to be deep in, and which are you holding on to out of habit?",
        nextStep: "List every customer-facing link and mark which are yours and which are someone else's.",
        revision:
            "2026: the handbook's delegate-and-elevate advice now sits against the “founder mode” argument that selective depth beats blanket delegation. Both are defensible; the choice is which functions, not whether.",
    },
    {
        id: "harvest",
        name: "Harvest",
        source: "ch 13 · appx C · S12",
        stage: "harvest",
        keywords: ["exit", "sell the business", "acquisition", "acquire", "harvest", "valuation", "buyer", "succession"],
        summary:
            "Name the motivation before the mechanism — the reason for selling decides which mechanism is right. Three approaches to value; hold a range, never a number. Diligence surfaces what you knew and did not fix.",
        question: "Why now? The answer changes whether this is a sale, a succession, or a recapitalisation.",
        nextStep: "Run your own diligence a year early. Everything it finds is cheaper to fix now.",
    },
    {
        id: "ai-native",
        name: "AI-native, not AI-enabled",
        source: "S07",
        stage: "model",
        keywords: ["ai", "agent", "agentic", "llm", "model", "automate", "automation", "copilot", "prompt", "eval"],
        summary:
            "The remove test: turn the AI off. If the product degrades, it is AI-enabled; if it stops, it is AI-native. Evaluations come before scale — read real traces by hand first, then write binary judges; a suite that passes 100% is too easy to be telling you anything.",
        question: "If you turned the model off tomorrow, would your product degrade or stop?",
        nextStep: "Read twenty real traces by hand. Write down every failure you see before you write a single judge.",
        revision:
            "Security constraint that has no 2018 equivalent: private data, untrusted content and an outbound channel together are exploitable. Remove one of the three legs — mitigations do not hold.",
    },
];

const BY_STAGE = (stage: VentureStage): Framework[] => FRAMEWORKS.filter((f) => f.stage === stage);

/** The frameworks that apply where this founder currently is. */
export const frameworksForStage = BY_STAGE;

/**
 * The demo adviser — a keyword match, and deliberately not pretending otherwise.
 *
 * The live app sends the question to a model grounded on this same index. The
 * demo has no backend, so it matches on keywords and hands back the framework's
 * own question rather than inventing an answer. The shape is the point: name
 * the framework, cite the chapter, and give the question back.
 */
export function localAdvice(question: string, venture?: Venture): Advice {
    const q = question.toLowerCase();
    let best: Framework | null = null;
    let bestScore = 0;
    for (const f of FRAMEWORKS) {
        let score = 0;
        for (const k of f.keywords) if (q.includes(k)) score += k.length;
        // A tie breaks towards where the founder actually is.
        if (venture && f.stage === venture.stage) score += 2;
        if (score > bestScore) { bestScore = score; best = f; }
    }

    // Asking it to do the work is the one case worth catching without a model,
    // because it is the most common thing anyone asks an adviser for.
    const doItForMe = /\b(write|draft|create|generate|make)\b.*\b(my|our|the)\b.*\b(plan|pitch|deck|strategy|positioning|analysis|model)\b/.test(q);
    if (doItForMe && best) {
        return {
            answer:
                `That one is yours to write, and not out of principle — the value of ${best.name.toLowerCase()} is in the ` +
                `deciding, and a draft handed to you skips exactly that. Here is the question it turns on: ${best.question}`,
            framework: best.name,
            source: best.source,
            nextStep: best.nextStep,
            refused: true,
        };
    }

    if (!best) {
        return {
            answer:
                "Nothing in the handbook's frameworks covers that directly, so I would rather say so than improvise one. " +
                "Try naming the stage you are at — the opportunity, the model, the money, the first customers — and ask again.",
            framework: "—",
            source: "—",
            nextStep: "Fill in the section of your venture record closest to the question and ask again.",
        };
    }

    const country = venture?.country?.trim();
    const jurisdiction =
        best.stage === "legal" || best.stage === "capital"
            ? country
                ? ` This is jurisdiction-dependent and you have ${country} on your record, so check it against local rules before acting.`
                : " This is jurisdiction-dependent and your record has no country on it — that is the first thing to fix."
            : "";

    return {
        answer: `${best.summary}${best.revision ? ` ${best.revision}` : ""}${jurisdiction} The question it puts back to you: ${best.question}`,
        framework: best.name,
        source: best.source,
        nextStep: best.nextStep,
    };
}
