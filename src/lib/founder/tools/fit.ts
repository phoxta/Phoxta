import type { Tool } from "../types";

// Stage 0 — Founder fit.
// Handbook ch 1 supplies the trait clusters; the 2026 layer (S13) supplies the
// evidence, which contradicts the trait model. Both are shown on purpose.

const FOUNDER_MARKET_FIT: Tool = {
    id: "founder-market-fit",
    slug: "founder-market-fit",
    stage: "fit",
    kind: "quiz",
    title: "Founder-market fit score",
    blurb:
        "The strongest published predictor of founder success is not personality, it is knowing your market. Score yourself on six dimensions.",
    ref: "modern/S13-founder-evidence-and-pitching-2026.md",
    basedOn: "Azoulay, Jones, Kim & Miranda (2020); founder-market fit as used since 2020",
    featured: true,
    spec: {
        questions: [
            {
                id: "years",
                prompt: "How long have you worked in the industry this business serves?",
                group: "Domain",
                help: "Direct experience of the problem, not adjacent interest.",
                options: [
                    { label: "Less than a year, or none", score: 0 },
                    { label: "1 to 2 years", score: 1 },
                    { label: "3 to 5 years", score: 2 },
                    { label: "6 to 10 years", score: 3 },
                    {
                        label: "More than 10 years",
                        score: 4,
                        note: "Prior same-industry experience is the dimension the research actually supports.",
                    },
                ],
            },
            {
                id: "contacts",
                prompt: "How many potential customers could you call this week and get answered?",
                group: "Access",
                help: "People who would take your call, not names on a list you bought.",
                options: [
                    { label: "None", score: 0 },
                    { label: "1 to 4", score: 1 },
                    { label: "5 to 14", score: 2 },
                    { label: "15 to 49", score: 3 },
                    { label: "50 or more", score: 4, note: "This is your unfair advantage in the first year." },
                ],
            },
            {
                id: "insight",
                prompt: "Do you hold a view about this market that most insiders would disagree with?",
                group: "Insight",
                help: "Something you learned by being there that is not obvious from the outside.",
                options: [
                    { label: "No, my view is the consensus", score: 0 },
                    { label: "A hunch I cannot yet defend", score: 1 },
                    { label: "A view I can argue, but have not tested", score: 2 },
                    { label: "A view I have tested with a few customers", score: 3 },
                    { label: "A tested view that keeps proving right", score: 4 },
                ],
            },
            {
                id: "hiring",
                prompt: "Could you name the first three people you would hire, and would they come?",
                group: "Team",
                options: [
                    { label: "No idea who I would hire", score: 0 },
                    { label: "I know the roles, not the people", score: 1 },
                    { label: "I know one person who might come", score: 2 },
                    { label: "I know two or three who probably would", score: 3 },
                    { label: "Three people who would say yes this month", score: 4 },
                ],
            },
            {
                id: "conviction",
                prompt: "Can you see yourself still working on this in ten years?",
                group: "Conviction",
                help: "Not whether you must, whether you would want to.",
                options: [
                    { label: "No, this is an opportunity I spotted", score: 0 },
                    { label: "Maybe two or three years", score: 1 },
                    { label: "Probably five years", score: 2 },
                    { label: "Yes, I expect so", score: 3 },
                    { label: "Yes, and I would do it unpaid for a while", score: 4 },
                ],
            },
            {
                id: "distribution",
                prompt: "Do you already have a way to reach buyers that a stranger would not?",
                group: "Distribution",
                help: "An audience, a reputation, a partner, a channel, a former employer's network.",
                options: [
                    { label: "No, I would start from zero", score: 0 },
                    { label: "A small personal network", score: 1 },
                    { label: "A professional reputation in the field", score: 2 },
                    { label: "An audience or partner who reaches buyers", score: 3 },
                    { label: "A channel I control that buyers already use", score: 4 },
                ],
            },
        ],
        bands: [
            {
                minPct: 75,
                label: "Strong founder-market fit",
                verdict: "go",
                advice: "You have the advantage the evidence values most. Spend it: go and talk to the people who would take your call, before you build anything.",
            },
            {
                minPct: 45,
                label: "Partial fit, one or two real gaps",
                verdict: "learn",
                advice: "Look at your lowest dimension. Most gaps are closable in months, by working in the industry, building an audience, or taking on a co-founder who has what you lack.",
            },
            {
                minPct: 0,
                label: "Weak fit for this market",
                verdict: "stop",
                advice: "This does not mean do not start. It means this particular market is one where you have no edge. Either earn the edge first, or pick a market where you already have one.",
            },
        ],
        caveat:
            "What the research actually says: in a study of the fastest-growing 0.1% of US ventures, the mean founding age was 45, and the effect came from prior same-industry experience rather than age itself (Azoulay, Jones, Kim & Miranda, 2020). Treat this score as a prompt for honesty, not a verdict on you.",
    },
};

const FOUNDER_TRAITS: Tool = {
    id: "founder-fit",
    slug: "founder-traits",
    stage: "fit",
    kind: "quiz",
    title: "The classic founder-traits check",
    blurb:
        "The handbook's five trait clusters, scored honestly. Useful for spotting what to delegate. Weak as a prediction of success, and we show you why.",
    ref: "01-founder-fit.md",
    basedOn: "HBR's Entrepreneur's Handbook, Table 1-1",
    spec: {
        questions: [
            {
                id: "ideas",
                prompt: "I spot problems other people miss, and imagine new solutions to them.",
                group: "Ideas and drive",
                options: [
                    { label: "Rarely", score: 0 },
                    { label: "Sometimes", score: 1 },
                    { label: "Often", score: 2 },
                    { label: "This is how I think", score: 3 },
                ],
            },
            {
                id: "vision",
                prompt: "I can describe the change I want to make clearly enough that others repeat it.",
                group: "Ideas and drive",
                options: [
                    { label: "Rarely", score: 0 },
                    { label: "Sometimes", score: 1 },
                    { label: "Often", score: 2 },
                    { label: "Always", score: 3 },
                ],
            },
            {
                id: "outreach",
                prompt: "I am comfortable approaching strangers: customers, investors, potential hires.",
                group: "People skills",
                options: [
                    { label: "I avoid it", score: 0 },
                    { label: "I push myself to", score: 1 },
                    { label: "I am fine with it", score: 2 },
                    { label: "I enjoy it", score: 3 },
                ],
            },
            {
                id: "persuade",
                prompt: "People get behind my ideas when I explain them.",
                group: "People skills",
                options: [
                    { label: "Rarely", score: 0 },
                    { label: "Sometimes", score: 1 },
                    { label: "Usually", score: 2 },
                    { label: "Reliably", score: 3 },
                ],
            },
            {
                id: "listen",
                prompt: "When a customer criticises my work, I change course rather than defend it.",
                group: "People skills",
                help: "The handbook names ignoring customer complaints as the most common early selling mistake.",
                options: [
                    { label: "I tend to defend", score: 0 },
                    { label: "I listen, then usually carry on", score: 1 },
                    { label: "I often adjust", score: 2 },
                    { label: "I actively hunt for the criticism", score: 3 },
                ],
            },
            {
                id: "selfdrive",
                prompt: "I set my own goals and hit them with nobody checking.",
                group: "Work style",
                options: [
                    { label: "I need structure from others", score: 0 },
                    { label: "Sometimes", score: 1 },
                    { label: "Usually", score: 2 },
                    { label: "Always", score: 3 },
                ],
            },
            {
                id: "uncertainty",
                prompt: "I can decide and act without all the information I would like.",
                group: "Work style",
                help: "A manager can wait for more data. A founder usually cannot.",
                options: [
                    { label: "I freeze without data", score: 0 },
                    { label: "It costs me sleep", score: 1 },
                    { label: "I manage", score: 2 },
                    { label: "I am comfortable there", score: 3 },
                ],
            },
            {
                id: "small",
                prompt: "I would rather start small and test than commit big and be right.",
                group: "Work style",
                options: [
                    { label: "I prefer to commit", score: 0 },
                    { label: "Depends", score: 1 },
                    { label: "Usually test first", score: 2 },
                    { label: "Always test first", score: 3 },
                ],
            },
            {
                id: "quit",
                prompt: "I can tell the difference between persevering and refusing to quit.",
                group: "Work style",
                options: [
                    { label: "I hang on too long", score: 0 },
                    { label: "Sometimes too long", score: 1 },
                    { label: "Usually", score: 2 },
                    { label: "I cut losses cleanly", score: 3 },
                ],
            },
            {
                id: "finance",
                prompt: "I can read a balance sheet, an income statement and a cash-flow statement.",
                group: "Financial savvy",
                help: "If not, this is the most learnable gap on the list.",
                options: [
                    { label: "No", score: 0 },
                    { label: "Roughly", score: 1 },
                    { label: "Yes", score: 2 },
                    { label: "Yes, and I use them monthly", score: 3 },
                ],
            },
            {
                id: "background",
                prompt: "Family or close friends have run their own business, or I have worked in one.",
                group: "Background",
                options: [
                    { label: "Neither", score: 0 },
                    { label: "A distant example", score: 1 },
                    { label: "Yes, close to me", score: 2 },
                    { label: "Yes, and I worked in it", score: 3 },
                ],
            },
        ],
        bands: [
            {
                minPct: 70,
                label: "Few gaps to cover",
                verdict: "go",
                advice: "Your weakest cluster is the one to delegate or learn. Financial savvy is the most learnable; people skills are the hardest to outsource.",
            },
            {
                minPct: 40,
                label: "Clear gaps worth covering",
                verdict: "learn",
                advice: "Name your weakest cluster and decide now: learn it, hire it, or take a co-founder who has it. The handbook is blunt that a great plan with weak motivation fails, and so does the reverse.",
            },
            {
                minPct: 0,
                label: "Several clusters are thin",
                verdict: "learn",
                advice: "This is a prompt to build a team, not to give up. Almost every gap here is coverable by one well-chosen partner.",
            },
        ],
        caveat:
            "Read this honestly: the handbook itself says these tests are a rough gauge only, and the 2026 evidence goes further. Personality traits are weak predictors of founder success; prior experience in the market is a strong one. If this score and your founder-market fit score disagree, believe the other one.",
    },
};

const BASE_RATES: Tool = {
    id: "base-rates",
    slug: "base-rates",
    stage: "fit",
    kind: "reference",
    title: "Base-rate buster",
    blurb:
        "The things founders believe, next to what the published data actually says, and what each study really measured.",
    ref: "modern/S13-founder-evidence-and-pitching-2026.md",
    featured: true,
    spec: {
        columns: ["The belief", "What the data says", "What was actually measured"],
        rows: [
            [
                "I am too old to start a business",
                {
                    value: "Mean founding age 45.0",
                    context: "the fastest-growing 0.1% of US ventures",
                    source: "Azoulay, Jones, Kim & Miranda, AER: Insights",
                    year: 2020,
                    ref: "modern/S13",
                },
                "US administrative data on firms, workers and owners. The effect traces to prior same-industry experience, not to age itself.",
            ],
            [
                "I need a co-founder or nobody will fund me",
                {
                    value: "36% of new incorporations are solo",
                    context: "up from 23.7% in 2019; solo founders take 14.7% of priced-round cash",
                    source: "Carta",
                    year: 2026,
                    ref: "modern/S13",
                },
                "Companies on one cap-table platform. Solo founders do raise priced rounds, just less often, and they keep far more of what they build.",
            ],
            [
                "Co-founder splits are permanent",
                {
                    value: "About 1 in 4 teams sees a departure by year 4",
                    source: "Carta",
                    year: 2025,
                    ref: "modern/S13",
                },
                "Which is the entire argument for vesting and a written agreement before you need one.",
            ],
            [
                "Most businesses fail in the first year",
                {
                    value: "About 78% survive year one",
                    context: "49.8% to 57.3% survive five years depending on the cohort",
                    source: "US Bureau of Labor Statistics, Business Employment Dynamics",
                    year: 2025,
                    ref: "modern/S13",
                },
                "Establishments, not firms, in the US. Survival is far better than folklore suggests, but half are gone by year five.",
            ],
            [
                "Raising money makes you safer",
                {
                    value: "136 of 254 shutdowns had raised a priced round",
                    context: "first such quarter in five years; 966 shutdowns in 2024, up 25.6%",
                    source: "Carta",
                    year: 2024,
                    ref: "modern/S13",
                },
                "Companies on one platform. Funding raises the burn and the expectations along with the runway.",
            ],
            [
                "Having done it before barely matters",
                {
                    value: "30% of repeat founders reach IPO vs 18% of first-timers",
                    context: "VC-backed US founders",
                    source: "Gompers et al., Journal of Financial Economics",
                    year: 2010,
                    ref: "modern/S13",
                },
                "A classic study of venture-backed companies only. It says nothing about the far larger population of businesses that never raise venture capital.",
            ],
            [
                "I have to start something from nothing",
                {
                    value: "800+ tracked search funds, from about 20 in the mid-1990s",
                    context: "SBA acquisition lending $8.29B in FY2025, up about 35%",
                    source: "search-fund census; US SBA via ETA trackers",
                    year: 2026,
                    ref: "modern/S13",
                },
                "Buying a profitable small business is now a mainstream founder path with its own financing. See the start-or-buy comparison.",
            ],
            [
                "Everyone else is coping fine",
                {
                    value: "72% of founders report an impact on mental health",
                    context: "37% anxiety, 36% burnout; 81% are not open about it and 77% never access therapy",
                    source: "Startup Snapshot",
                    year: 2024,
                    ref: "modern/S13",
                },
                "A survey of 400+ founders. The silence is the finding: almost everyone struggles and almost nobody says so.",
            ],
        ],
        note:
            "Every figure here is quoted with its population, because the population is usually the catch. Cap-table platform data describes funded startups, not all businesses. Venture studies describe the small slice that raises venture capital.",
    },
};

const START_OR_BUY: Tool = {
    id: "start-or-buy",
    slug: "start-or-buy",
    stage: "fit",
    kind: "quiz",
    title: "Start one or buy one?",
    blurb:
        "Buying a profitable business is a real alternative to starting from zero. Six questions on which path suits your capital, experience and timeline.",
    ref: "modern/S13-founder-evidence-and-pitching-2026.md",
    basedOn: "Ruback & Yudkoff, HBR Guide to Buying a Small Business; Stanford search-fund study 2024",
    spec: {
        questions: [
            {
                id: "capital",
                prompt: "How much capital could you put in or raise for a down payment?",
                help: "Acquisition usually needs equity plus debt. Starting up can need very little.",
                options: [
                    { label: "Under £10k", score: 0, note: "Starting lean is the realistic path." },
                    { label: "£10k to £50k", score: 1 },
                    { label: "£50k to £250k", score: 2 },
                    { label: "Over £250k, or investors behind me", score: 3 },
                ],
            },
            {
                id: "income",
                prompt: "How soon do you need this to pay you a living?",
                options: [
                    { label: "Immediately", score: 3, note: "An acquired business already has revenue. A startup usually does not." },
                    { label: "Within a year", score: 2 },
                    { label: "Within two or three years", score: 1 },
                    { label: "I can wait longer", score: 0 },
                ],
            },
            {
                id: "experience",
                prompt: "How much experience do you have running or managing an existing operation?",
                options: [
                    { label: "None", score: 0 },
                    { label: "Managed a team", score: 1 },
                    { label: "Ran a department or a P&L", score: 2 },
                    { label: "Ran a company or a business unit", score: 3 },
                ],
            },
            {
                id: "novelty",
                prompt: "How much of your motivation is building something that does not exist yet?",
                options: [
                    { label: "That is the whole point for me", score: 0 },
                    { label: "It matters a lot", score: 1 },
                    { label: "Somewhat", score: 2 },
                    { label: "I care more about owning a good business", score: 3 },
                ],
            },
            {
                id: "risk",
                prompt: "Which would you find harder to live with?",
                options: [
                    { label: "Carrying acquisition debt", score: 0 },
                    { label: "Both equally", score: 2 },
                    { label: "Years with no revenue", score: 3 },
                ],
            },
            {
                id: "edge",
                prompt: "Do you have a product insight nobody has built yet?",
                options: [
                    { label: "Yes, a specific one I believe in", score: 0 },
                    { label: "A rough idea", score: 1 },
                    { label: "Not really, I want to run something", score: 3 },
                ],
            },
        ],
        bands: [
            {
                minPct: 62,
                label: "Buying suits you better",
                verdict: "go",
                advice: "Look at acquisition entrepreneurship: brokers and micro-acquisition marketplaces, seller financing, and in the US an SBA 7(a) loan. Work through the exit stage of this toolkit from the buyer's side, since what a seller must prove is what you must check.",
            },
            {
                minPct: 38,
                label: "Either path could work",
                verdict: "learn",
                advice: "Run both in parallel for a month. Price two or three real businesses for sale, and test one startup idea with customers. The evidence you gather will decide it faster than reflection will.",
            },
            {
                minPct: 0,
                label: "Starting suits you better",
                verdict: "go",
                advice: "Carry on through the toolkit from the opportunity stage. Keep your costs low enough that the no-revenue period does not force a bad decision.",
            },
        ],
        caveat:
            "On search-fund returns: the widely quoted 35.1% IRR and 4.5x are aggregate, dollar-weighted and driven by a few big winners, and about 26% of acquisitions in that study lost money (Stanford GSB, 2024). Do not plan on the average.",
    },
};

export const FIT_TOOLS: Tool[] = [FOUNDER_MARKET_FIT, FOUNDER_TRAITS, BASE_RATES, START_OR_BUY];
