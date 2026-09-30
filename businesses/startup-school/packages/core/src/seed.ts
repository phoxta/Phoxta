import type {
    AvailabilityRule,
    Booking,
    BookingAction,
    Catalogue,
    Category,
    Course,
    Experiment,
    Friend,
    Group,
    Lesson,
    LiveLesson,
    Mentor,
    Module,
    QuizQuestion,
    UserState,
    Venture,
    VentureClaim,
    VentureConfidence,
    VentureSection,
} from "./types";
import { FINAL_CATEGORIES, FINAL_COURSES, FINAL_LESSON_BLOCKS, FINAL_LESSONS, FINAL_MODULES, FINAL_QUIZ } from "./curriculum";

/**
 * The bundled catalogue and a demo founder.
 *
 * The catalogue is the FALLBACK for a store with no backend configured and the
 * SEED for the live one (migration 0155 carries the same rows), so what a
 * visitor explores in demo mode is what an enrolled founder gets. Ids are
 * stable strings so progress, notes and bookmarks keep pointing at the right
 * thing in both worlds.
 *
 * The curriculum is drawn from HBR's Entrepreneur's Handbook distilled in
 * `.claude/skills/entrepreneur-handbook` — fourteen chapters, four appendices
 * and thirteen researched 2026 supplements — mapped onto three tracks:
 *
 *   start  stages 0-4   founder fit, opportunity, model, legal form, plan
 *   fund   stages 5,7   opening capital, growth capital, angels and venture
 *   grow   stages 6,8,9 selling, operating, measuring, scaling, harvest
 *
 * Lessons are written rather than filmed on purpose. A founder school's video
 * is its own recorded cohort sessions — the classroom already records to
 * storage and attaches the recording to the session — so the catalogue carries
 * the durable written method and the live timetable carries the teaching.
 */

const IMG = "/images/";

export const LEGACY_TEMP_CATEGORIES: Category[] = [
    { id: "start", name: "Start", blurb: "Founder fit, the opportunity, the model, the legal form and a plan a stranger can back" },
    { id: "fund", name: "Fund", blurb: "What it costs to open, where growth money comes from, and what each source costs you" },
    { id: "grow", name: "Grow", blurb: "Selling, operating, measuring, scaling past yourself and the eventual harvest" },
];

export const MENTORS: Mentor[] = [
    { id: "m-phoxta-curriculum", handle: "phoxta", followers: 0, name: "Phoxta Curriculum", role: "Opportunity discovery and venture creation", bio: "Practical lessons connected to your opportunity workspace.", hue: "mint", expertise: ["start", "fund", "grow"], bookable: false },
    { id: "m-leonardo", name: "Leonardo Samsul", role: "Founder · Operator in residence", bio: "Started two companies, sold one and closed the other. Teaches the founder-fit and opportunity work he wishes someone had made him do before the second one.", hue: "mint", photoUrl: IMG + "mentor-leonardo.jpg", handle: "leonardo", followers: 14200, expertise: ["start"], bookable: true, timezone: "Europe/London", sessionMin: 45, bufferMin: 15, minNoticeMin: 240, horizonDays: 28 },
    { id: "m-amara", name: "Amara Osei", role: "Angel investor · Mentor", bio: "Writes cheques into about six companies a year and sits on four boards. Reads plans for a living, so she can tell you in ninety seconds why yours is not being read.", hue: "lilac", photoUrl: IMG + "mentor-amara.jpg", handle: "amara", followers: 18700, expertise: ["fund", "start"], bookable: true, timezone: "Africa/Lagos", sessionMin: 30, bufferMin: 10, minNoticeMin: 720, horizonDays: 21 },
    { id: "m-padhang", name: "Padhang Satrio", role: "Fractional CFO · Mentor", bio: "Builds the three statements for companies that had been running on a bank balance and a feeling. Believes a thirteen-week cash forecast has saved more businesses than any pitch deck.", hue: "sky", photoUrl: IMG + "mentor-padhang.jpg", handle: "padhang", followers: 9100, expertise: ["fund", "grow"], bookable: true, timezone: "Asia/Jakarta", sessionMin: 30, bufferMin: 10, minNoticeMin: 240, horizonDays: 28 },
    { id: "m-mei", name: "Mei Tanaka", role: "Go-to-market lead · Mentor", bio: "Took a product from its first ten customers to its first thousand, doing the selling herself for the first two hundred. Teaches positioning as a decision, not a workshop.", hue: "plum", photoUrl: IMG + "mentor-mei.jpg", handle: "mei", followers: 12400, expertise: ["grow", "start"], bookable: true, timezone: "America/New_York", sessionMin: 45, bufferMin: 15, minNoticeMin: 240, horizonDays: 28 },
    { id: "m-zakir", name: "Zakir Horizontal", role: "Startup counsel · Mentor", bio: "Corporate lawyer who has unpicked more founder agreements than he has drafted. Wants you to write down what happens if one of you leaves, before one of you leaves.", hue: "peach", photoUrl: IMG + "mentor-zakir.jpg", handle: "zakir", followers: 6800, expertise: ["start"] },
    { id: "m-bayu", name: "Bayu Salto", role: "Chair · Scale and exit", bio: "Has been the founder who would not let go and the chair who had to say so. Teaches the handover from managing the work to managing the context, and what a sale actually feels like.", hue: "rose", photoUrl: IMG + "mentor-bayu.jpg", handle: "bayu", followers: 7600, expertise: ["grow"], bookable: true, timezone: "Europe/London", sessionMin: 60, bufferMin: 15, minNoticeMin: 1440, horizonDays: 42 },
];

export const LEGACY_TEMP_COURSES: Course[] = [
    // ---- START -----------------------------------------------------------
    {
        id: "c-fit", slug: "founder-fit",
        title: "Founder fit: are you the right person for this one?",
        blurb: "Not 'do you have what it takes' — whether you have plan, execution and motivation for this particular business.",
        description: "The handbook opens with an uncomfortable question and refuses to flatter you about it. Most founder assessments test personality; this one tests three specific things an investor will test anyway — whether you have a plan, whether you can execute it, and whether your motivation will survive month fourteen.\n\nYou will profile yourself against five trait clusters, list the gaps honestly, and decide for each one whether you learn it, hire it, or find a co-founder who already has it. The output is a page you can hand to someone who is considering backing you.",
        categoryId: "start", mentorId: "m-leonardo", level: "Beginner", theme: "start", rating: 4.8, learners: 2140,
        outcomes: ["Profile yourself against the five trait clusters", "Name your three must-haves and your real gaps", "Decide learn / hire / co-found for each gap", "Answer the investor's three questions about yourself"],
        publishedAt: "2026-01-12T00:00:00.000Z",
    },
    {
        id: "c-opportunity", slug: "is-this-a-real-opportunity",
        title: "Is this a real opportunity, or just a good idea?",
        blurb: "Ten market questions, a confidence rating on each, and a test for every guess — before you spend a year finding out.",
        description: "An idea becomes an opportunity when someone will pay for it, often enough, at a price that leaves something over. This course puts your idea through the handbook's evaluation grid: ten customer and market questions, each answered with a confidence level and a test you could actually run this month.\n\nThen the five-characteristic scorecard, the risk-versus-return line that tells you when to walk away, and a competitor war-game where you ask what happens if a funded rival cuts price twenty per cent. Most ideas do not survive this. That is the point of doing it in four weeks rather than four years.",
        categoryId: "start", mentorId: "m-amara", level: "Beginner", theme: "fund", rating: 4.9, learners: 3180,
        outcomes: ["Answer the ten market questions with a confidence and a test for each", "Score the opportunity on all five characteristics", "Place it against the risk-return line", "War-game the worst thing a competitor could do to you"],
        publishedAt: "2026-01-20T00:00:00.000Z",
    },
    {
        id: "c-model", slug: "business-model-and-strategy",
        title: "The business model, and why anyone would pick you",
        blurb: "Five questions that define a model, two tests that break it, and the difference between a model and a strategy.",
        description: "A business model answers five questions: what value you create, how you take a share of it, why a customer picks you, how you keep them from being taken, and how anyone finds you in the first place. Most founders can answer three.\n\nYou will run Magretta's two tests — does the narrative hold together, and do the numbers add up — then separate the model from the strategy, because a model says how the business works and a strategy says how it beats the alternatives. The course ends with a positioning statement and a discovery plan, which is the part people leave until after launch and should not.",
        categoryId: "start", mentorId: "m-leonardo", level: "Intermediate", theme: "grow", rating: 4.7, learners: 1960,
        outcomes: ["Answer the five model questions in one page", "Apply the narrative test and the numbers test", "Choose a position and say what you are deliberately not", "Plan discovery inside the model rather than after it"],
        publishedAt: "2026-02-02T00:00:00.000Z",
    },
    {
        id: "c-legal", slug: "choosing-your-legal-form",
        title: "Choosing a legal form you will not have to undo",
        blurb: "Six forms, the tax and liability trade-offs, and the founder agreement to write while everyone still likes each other.",
        description: "The legal form is a decision most founders make by asking a friend, and a decision that is expensive to reverse once there are shareholders and a tax history. This course walks the comparison properly: liability, tax treatment, ownership flexibility, cost, fundraising fit and continuity.\n\nThe rules are simple once you see them. Early losses or cash distributions point one way; an exit by sale or an investor who needs preferred stock points another. Then the part nobody enjoys — the six issues a founder agreement must settle, written down before they are tested.\n\nThis is a course about frameworks, not advice. Every jurisdiction differs and the last lesson is a list of what to take to local counsel.",
        categoryId: "start", mentorId: "m-zakir", level: "Beginner", theme: "peach", rating: 4.6, learners: 1520,
        outcomes: ["Compare the six forms on liability, tax, ownership and continuity", "Apply the triggering rules to your own case", "Draft the six terms of a founder agreement", "Leave with a brief for local counsel"],
        publishedAt: "2026-02-09T00:00:00.000Z",
    },
    {
        id: "c-plan", slug: "plan-and-pitch",
        title: "The plan, and the pitch that gets it read",
        blurb: "Seven sections, two minutes for the summary, and the reader-lens check that catches what you cannot see.",
        description: "A business plan is not a document you write to raise money. It is the thinking that survives being written down, and the executive summary has about two minutes to earn the rest.\n\nYou will build the seven-section plan, then compress it three ways — a hundred words, one sentence, and two deck variants for the two different jobs a deck does. Along the way: Sahlman's fourteen questions about your team, the ten-point marketing checklist, and the rule that makes plans credible, which is stating the assumption behind every projection rather than hiding it.",
        categoryId: "start", mentorId: "m-mei", level: "Intermediate", theme: "mint", rating: 4.8, learners: 2740,
        outcomes: ["Write all seven sections at the right length", "Cut an executive summary that wins two minutes", "Produce a presentation deck and a reading deck", "State the assumption behind every number you project"],
        publishedAt: "2026-02-18T00:00:00.000Z",
    },
    // ---- FUND ------------------------------------------------------------
    {
        id: "c-startup-money", slug: "money-to-open",
        title: "Money to open the doors",
        blurb: "Size the number first, then stack the sources cheapest-first — and know which kind of business you are running.",
        description: "Most founders start with the question 'who will fund me' and should start with 'how much do I actually need'. This course does it in that order: an opening balance sheet that sizes the launch capital, then a source stack assembled from the cheapest money outward.\n\nIt also settles a question that quietly decides everything else — which of the three business types you are. Roughly seven in ten new businesses are Main Street, about one in six are supply-chain, and around three per cent are the high-growth kind venture capital is designed for. Founders who misidentify themselves raise the wrong money, or waste a year trying to.",
        categoryId: "fund", mentorId: "m-padhang", level: "Beginner", theme: "fund", rating: 4.8, learners: 2380,
        outcomes: ["Build an opening balance sheet and size the real number", "Identify which of the three business types you are", "Stack sources cheapest-first and see the gap", "Set terms for money from family that survive Christmas"],
        publishedAt: "2026-03-01T00:00:00.000Z",
    },
    {
        id: "c-growth-money", slug: "debt-equity-or-cash-flow",
        title: "Debt, equity or cash flow",
        blurb: "The banker's three questions, five ratios they run before meeting you, and the matching principle that keeps you solvent.",
        description: "Growth money is a different conversation from startup money, and debt is a different conversation from equity. A banker asks three questions — can you repay, will you repay, and what happens if you cannot — and runs five ratios before you walk in. You can run them yourself first.\n\nThe organising rule is the matching principle: short assets on short money, long assets on long money. Break it and a profitable business runs out of cash, which is the most common way profitable businesses die. You will also stress-test your own case with EBIT halved, because that is what the lender will do.",
        categoryId: "fund", mentorId: "m-amara", level: "Intermediate", theme: "start", rating: 4.7, learners: 1640,
        outcomes: ["Answer the banker's three questions with evidence", "Run the five lender ratios on your own numbers", "Apply the matching principle to every financing choice", "Stress-test the plan with EBIT halved"],
        publishedAt: "2026-03-10T00:00:00.000Z",
    },
    {
        id: "c-vc", slug: "angels-venture-and-the-term-sheet",
        title: "Angels, venture capital and the term sheet",
        blurb: "How the money actually flows, why a VC needs a ten-times return, and how to read the document before you sign it.",
        description: "Venture capital is a specific instrument for a specific kind of company, and most businesses are not it. Under one per cent of US companies ever raise venture capital; angels fund roughly sixteen times more companies than VCs do.\n\nThis course explains the machinery — the management fee, the carried interest, and the one-in-fifteen outcome the whole portfolio is built around — because once you understand why a fund needs a ten-times return in five to ten years, every term in the sheet stops being arbitrary. Then convertible preferred stock, feature by feature, and the four ways to delay giving away equity at all.",
        categoryId: "fund", mentorId: "m-amara", level: "Advanced", theme: "grow", rating: 4.9, learners: 2050,
        outcomes: ["Explain how a venture fund makes money and why that shapes the terms", "Tell angel-shaped businesses from venture-shaped ones", "Read convertible preferred stock feature by feature", "Ask how a valuation was derived — and derive your own"],
        publishedAt: "2026-03-22T00:00:00.000Z",
    },
    // ---- GROW ------------------------------------------------------------
    {
        id: "c-sell", slug: "founder-led-sales",
        title: "Founder-led sales to your first hundred customers",
        blurb: "You are the salesperson until roughly customer one hundred. This is how to be a good one.",
        description: "Nobody can sell an early product except the person who decided to build it, because the pitch is still changing every week and only the founder can change it mid-sentence. This course covers discovery that finds a real problem, qualification that saves you from a quarter of wasted meetings, and the pricing conversation most founders avoid until it is too late to have well.\n\nIt finishes with the two questions that decide your next year: what the pipeline maths says you need at the top to hit the bottom, and when — genuinely — to make the first sales hire.",
        categoryId: "grow", mentorId: "m-mei", level: "Intermediate", theme: "mint", rating: 4.8, learners: 2620,
        outcomes: ["Run a discovery call that finds the problem, not the compliment", "Qualify out early and without apology", "Hold a pricing conversation without discounting first", "Know the pipeline maths and when to hire for it"],
        publishedAt: "2026-04-05T00:00:00.000Z",
    },
    {
        id: "c-operate", slug: "running-the-place",
        title: "Running the place: cadence, cash and the three statements",
        blurb: "A weekly rhythm someone other than you can run, and a thirteen-week cash forecast that stops surprises.",
        description: "Operating is unglamorous and it is where most of the survival happens. The three financial statements, how they link, and why the profit-and-loss can look healthy while the bank account empties.\n\nThen the operating system: a weekly cadence with an owner and an agenda, a monthly metrics review, and the thirteen-week rolling cash forecast that turns 'are we fine?' into a number. The test of this course is whether the cadence still runs in a week when the founder is ill, which is the only honest test there is.",
        categoryId: "grow", mentorId: "m-padhang", level: "Intermediate", theme: "fund", rating: 4.7, learners: 1880,
        outcomes: ["Read the three statements and how they link", "Run a thirteen-week rolling cash forecast", "Install a weekly cadence with an owner and an agenda", "Write the SOPs that let someone else run it"],
        publishedAt: "2026-04-14T00:00:00.000Z",
    },
    {
        id: "c-metrics", slug: "the-numbers-that-tell-the-truth",
        title: "The numbers that tell the truth",
        blurb: "CAC, payback, retention and runway — and the specific metric set for your kind of business.",
        description: "Most dashboards measure what is easy rather than what is decisive. This course builds the small set that actually predicts whether the business works: what it costs to acquire a customer, how long until that cost is repaid, what share of them are still there a year later, and how many months of runway remain at the current burn.\n\nThen the variations, because the honest metric set for a marketplace is not the one for a services business or a hardware product. You will finish with a one-screen dashboard and, more usefully, a list of the vanity metrics you agree to stop reporting.",
        categoryId: "grow", mentorId: "m-padhang", level: "Intermediate", theme: "start", rating: 4.8, learners: 2210,
        outcomes: ["Calculate CAC, payback period and retention properly", "Read a cohort table and see what it is telling you", "Track burn and runway honestly", "Pick the metric set that fits your business model"],
        publishedAt: "2026-04-26T00:00:00.000Z",
    },
    {
        id: "c-scale", slug: "scaling-past-yourself",
        title: "Scaling past yourself",
        blurb: "The three post-startup questions, the four leadership modes, and the handover founders find hardest.",
        description: "Growth strains exactly the four things that made the company work at the start, and the founder is usually one of them. This course starts with the three questions that decide whether to scale at all, then moves to the transition the handbook is most direct about: from managing the work, to managing behaviours, to managing results, to managing context.\n\nAlong the way, which support functions have to scale before the strain shows, how to build an advisory board that tells you the truth, and the seven signals that the company now needs professional management — including the ones founders explain away.",
        categoryId: "grow", mentorId: "m-bayu", level: "Advanced", theme: "grow", rating: 4.7, learners: 1390,
        outcomes: ["Answer the three post-startup questions before scaling", "Identify which support functions must scale first", "Move deliberately between the four leadership modes", "Build a board that gives you objective feedback"],
        publishedAt: "2026-05-06T00:00:00.000Z",
    },
    {
        id: "c-ai", slug: "building-an-ai-native-company",
        title: "Building an AI-native company",
        blurb: "What the word actually claims, what the randomised evidence says, and the three disciplines that separate a working AI product from a pilot.",
        description: "Almost every deck now says AI-native and almost none of them mean anything by it. This course starts by making the claim testable, then spends most of its time on the evidence \u2014 including the trials that found AI made people slower while they believed it made them faster.\n\nThen the three disciplines that decide whether an AI feature survives contact with users: designing agentic workflows rather than single prompts, evaluating them by reading real failures rather than counting passes, and closing the security hole that no system prompt can fix.\n\nIt is deliberately unexcited. The numbers here move fast and several are softer than they look, so each is quoted with what kind of evidence it is.",
        categoryId: "grow", mentorId: "m-leonardo", level: "Advanced", theme: "start", rating: 4.9, learners: 1640,
        outcomes: ["Apply the remove test and say honestly which side you are on", "Separate the randomised evidence from the vendor numbers", "Design an agentic workflow instead of a single prompt", "Run error-analysis-first evals", "Spot the lethal trifecta before you ship an agent"],
        publishedAt: "2026-06-02T00:00:00.000Z",
    },
    {
        id: "c-exit", slug: "harvest-and-exit",
        title: "Harvest: what it is worth and how to get out",
        blurb: "Name the motivation first, then choose the mechanism — and get your own valuation before anyone offers you theirs.",
        description: "The exit is the part founders think about constantly and prepare for least. This course insists on the order the handbook does: name why you are selling before you choose how, because the mechanism that suits a tired founder is not the one that suits a founder chasing scale.\n\nThen valuation — three approaches, what a multiple actually encodes, and why the first number you hear should never be the only one you have. And the practical sequence: what a buyer will find in diligence, what to fix a year ahead, and what actually happens to the people who stay.",
        categoryId: "grow", mentorId: "m-bayu", level: "Advanced", theme: "peach", rating: 4.8, learners: 1180,
        outcomes: ["Name the motivation before choosing a mechanism", "Value the business three ways and hold a defensible range", "Prepare for diligence a year ahead of needing to", "Understand what changes for the team on the day"],
        publishedAt: "2026-05-18T00:00:00.000Z",
    },
];

export const LEGACY_TEMP_MODULES: Module[] = [
    { id: "mod-fit-1", courseId: "c-fit", title: "The honest inventory", sort: 0 },
    { id: "mod-fit-2", courseId: "c-fit", title: "Closing the gaps", sort: 1 },
    { id: "mod-opp-1", courseId: "c-opportunity", title: "Interrogate the market", sort: 0 },
    { id: "mod-opp-2", courseId: "c-opportunity", title: "Score it", sort: 1 },
    { id: "mod-opp-3", courseId: "c-opportunity", title: "Assume you are not alone", sort: 2 },
    { id: "mod-mod-1", courseId: "c-model", title: "Five questions", sort: 0 },
    { id: "mod-mod-2", courseId: "c-model", title: "Model versus strategy", sort: 1 },
    { id: "mod-leg-1", courseId: "c-legal", title: "The comparison", sort: 0 },
    { id: "mod-leg-2", courseId: "c-legal", title: "What you write down", sort: 1 },
    { id: "mod-pln-1", courseId: "c-plan", title: "The seven sections", sort: 0 },
    { id: "mod-pln-2", courseId: "c-plan", title: "Compress it", sort: 1 },
    { id: "mod-sum-1", courseId: "c-startup-money", title: "Size the number", sort: 0 },
    { id: "mod-sum-2", courseId: "c-startup-money", title: "Stack the sources", sort: 1 },
    { id: "mod-gro-1", courseId: "c-growth-money", title: "How a lender thinks", sort: 0 },
    { id: "mod-gro-2", courseId: "c-growth-money", title: "Matching and stress", sort: 1 },
    { id: "mod-vc-1", courseId: "c-vc", title: "How the money flows", sort: 0 },
    { id: "mod-vc-2", courseId: "c-vc", title: "Reading the sheet", sort: 1 },
    { id: "mod-sel-1", courseId: "c-sell", title: "Finding the problem", sort: 0 },
    { id: "mod-sel-2", courseId: "c-sell", title: "Price and pipeline", sort: 1 },
    { id: "mod-ops-1", courseId: "c-operate", title: "The statements", sort: 0 },
    { id: "mod-ops-2", courseId: "c-operate", title: "The cadence", sort: 1 },
    { id: "mod-met-1", courseId: "c-metrics", title: "The core four", sort: 0 },
    { id: "mod-met-2", courseId: "c-metrics", title: "Your model's metrics", sort: 1 },
    { id: "mod-scl-1", courseId: "c-scale", title: "Should you scale?", sort: 0 },
    { id: "mod-scl-2", courseId: "c-scale", title: "The founder's transition", sort: 1 },
    { id: "mod-ai-1", courseId: "c-ai", title: "The claim, and the evidence", sort: 0 },
    { id: "mod-ai-2", courseId: "c-ai", title: "Making it work", sort: 1 },
    { id: "mod-ext-1", courseId: "c-exit", title: "Motivation and mechanism", sort: 0 },
    { id: "mod-ext-2", courseId: "c-exit", title: "What it is worth", sort: 1 },
];

const article = (id: string, courseId: string, moduleId: string, title: string, durationSec: number, body: string, sort: number, revision?: string): Lesson => ({
    id, courseId, moduleId, title, kind: "article", durationSec, body, sort, revision,
});

/**
 * The seven places the 2018 handbook and the 2026 research disagree.
 *
 * Every one is sourced, and every one is attached to the lesson it revises
 * rather than collected on a page nobody visits. Both sides are stated: a
 * course that quietly taught only the newer answer would be citing a book that
 * does not say that, and a founder needs to know which is which when a mentor
 * or an investor quotes the older one at them.
 *
 * These move. The financing, legal and valuation numbers were researched in
 * September 2026 and are good for roughly two quarters.
 */
const REVISIONS: Record<string, string> = {
    // ch 1 — the trait checklist
    "l-fit-2":
        "The trait clusters come from pre-2018 trait psychology, and the part that has held up is narrower than the chapter implies. Azoulay, Jones, Kim and Miranda (AER: Insights, 2020), working from US administrative data on the fastest-growing 0.1% of new ventures, found prior experience in the SPECIFIC industry to be the strong predictor — and the mean age at founding to be 45, not 25. A 2023 study of founder types (McCarthy et al.) found team personality DIVERSITY roughly doubled the odds of success, which is a claim about combinations rather than about any one person's score. Score yourself honestly by all means; then score your access to the industry, because that is the number with the evidence behind it.",

    // ch 2 — evaluate the opportunity once
    "l-opp-3":
        "The five characteristics are still the right screen, but the chapter treats fit as something you establish once and then build on. First Round's 2024 work (Todd Jackson) splits product-market fit into four levels — nascent, developing, strong, extreme — each with its own thresholds across satisfaction, demand and efficiency. Extreme fit takes two to six years, you move between levels by changing one of persona, problem, promise or product, and fit can be LOST when the market moves. Practically: score the five characteristics to decide whether to start, then measure fit continuously afterwards. Teams that stopped measuring because they had declared it are the ones who lost it without noticing.",

    // ch 4 — choosing a form
    "l-leg-1":
        "The six-way comparison is unchanged, but for US founders one input became financially material after the chapter was written. The One Big Beautiful Bill Act (4 July 2025) raised the QSBS per-issuer exclusion to $15M and the issuer gross-assets ceiling to $75M, and added tiers — 50% of the gain excluded at 3 years, 75% at 4, 100% at 5 — for stock acquired after that date; stock issued before it keeps the old 5-year rule. The clock only starts when C-corp stock is ISSUED, which prices the common 'LLC now, convert later' path in a way the chapter does not discuss. Date-stamp every issuance. None of this is advice — it is the reason to raise QSBS with counsel before you incorporate rather than after.",

    // ch 5 — the 40-page plan
    "l-pln-1":
        "The seven sections are still what has to be true. The forty-page document is not still the artefact. Since about 2020 the same story is told at four depths — a one-pager, a deck, a written memo and a data room — and the long plan has retreated to the readers who require it: banks, SBA-style lenders, grant bodies and visa applications. If you are in one of those conversations, write it. Otherwise, write the sections as thinking and publish the compressions. One number worth knowing before you design a deck: Papermark's 2026 analysis of 24,541 decks and 358,672 investor views found a median of 18 minutes of total attention per deck, 16% of views over inside ten seconds, and fewer than half reaching the last slide.",

    // ch 10 — grow when the strategy is sustainable
    "l-scl-1":
        "The three questions survive. What changed is the default answer to 'how fast'. Hoffman and Yeh's blitzscaling thesis — speed over efficiency while the outcome is uncertain — was the 2018 consensus and was repriced after 2022 towards capital efficiency, runway and staying default alive. There was no recantation; it was a shift in practice, and it showed up as efficiency ratios gating growth capital rather than growth rate alone. Read the chapter's caution about scaling before the strategy is sustainable as the stronger claim it has become.",

    // ch 11 — delegate and elevate
    "l-scl-3":
        "Content, behaviours, results, context is still the right chain. The chapter's conclusion — that the founder's job is to move up it and hire professional management — is now genuinely contested. Paul Graham's 2024 'founder mode' argues that the founder's unique asset is context rather than control, and that blanket delegation destroys exactly that. The reconciliation most operators land on is depth per TASK, not per personality: pick the handful of things where your context is irreplaceable and stay deep in those, delegate the rest properly rather than partially. Both positions are defensible; the question to answer is which functions, not whether.",

    // appx C — valuation methods with no multiples
    "l-ext-3":
        "The appendix gives you the methods and deliberately no numbers, which was the right call in 2018 and leaves a gap when you need a sanity check. As of 2026: US Main Street businesses close around 2.7x SDE and 0.7x revenue (BizBuySell closed-deal data, sector range roughly 2.0-3.3x earnings); public SaaS trades near a 3.8x equal-weighted median ARR multiple after touching a decade low in June 2026; private SaaS medians sit near 4.5x. The 2021 comparables a founder is usually quoted are not a benchmark — software clears nearer 15x EBITDA than 25x now. Triangulate, hold a range, and say which index any multiple came from.",
};

/** Attach the revisions to the lessons they revise. */
const withRevisions = (lessons: Lesson[]): Lesson[] =>
    lessons.map((l) => (REVISIONS[l.id] ? { ...l, revision: REVISIONS[l.id] } : l));
const quiz = (id: string, courseId: string, moduleId: string, title: string, sort: number): Lesson => ({
    id, courseId, moduleId, title, kind: "quiz", durationSec: 300, body: "A short check on the module. Three questions; you can retake it as often as you like.", sort,
});

const RAW_LESSONS: Lesson[] = [
    // ---- Founder fit -----------------------------------------------------
    article("l-fit-1", "c-fit", "mod-fit-1", "Preparation beats passion", 480,
        "The most repeated advice to founders is to follow their passion, and it is the advice most likely to bankrupt them. Passion is an input, not a qualification. It tells you that you will keep going; it says nothing about whether you should.\n\nThe handbook replaces it with three must-haves, and an investor will test all three whether or not you have.\n\n**A plan.** Not a document — a coherent account of how this becomes a business. If you cannot describe the mechanism by which money arrives, you have an intention rather than a plan.\n\n**The ability to execute it.** Specifically this plan, not plans in general. A brilliant operator with no access to the customer is not the right founder for a business that lives or dies on access to that customer.\n\n**Motivation that survives.** The relevant question is not whether you are excited now. It is what you expect to be true in month fourteen, when the novelty is gone and the numbers are smaller than the plan said.\n\nWrite one honest paragraph on each. Where a paragraph is thin, you have found something to fix rather than something to hide.", 0),
    article("l-fit-2", "c-fit", "mod-fit-1", "Five trait clusters, scored honestly", 540,
        "The trait work is only useful if you are willing to score yourself badly. Take each cluster and mark yourself one to five, then — this is the part that matters — write the evidence.\n\nNot 'I am resilient' but 'I kept going for eleven months after the first product failed, and here is what I did in month nine'. A score with no evidence behind it is a preference, and preferences are exactly what this exercise is designed to get past.\n\nThe clusters cover how you handle uncertainty, how you relate to other people's money, how you make decisions without complete information, how you respond to being wrong in public, and what you do with a complaint.\n\nThat last one is worth dwelling on. The handbook is blunt that complaints are the cheapest market research available, and that most founders treat them as an attack to be managed rather than a signal to be mined. How you scored yourself there will predict a good deal about the next two years.\n\nWhen the five scores are down, do not average them. The average hides the one that will hurt you.", 1),
    article("l-fit-3", "c-fit", "mod-fit-2", "Learn it, hire it, or find a co-founder", 500,
        "Every gap has exactly three honest resolutions, and 'I will get better at it' is only one of them.\n\n**Learn it** when the gap is skill-shaped, the timeline allows, and the skill is close enough to something you already do. Reading financial statements is learnable in a month. Becoming a natural seller at forty-five, when you have never enjoyed it, generally is not.\n\n**Hire it** when the gap is a function rather than a founding capability — bookkeeping, payroll, a specialist compliance task. Note that hiring requires money you may not yet have, which means this resolution often has a date attached rather than being available now.\n\n**Find a co-founder** when the gap is both central and permanent. This is the expensive option: you are trading equity and autonomy, and you are acquiring a relationship that will be tested. It is also the only one that works when the missing capability is the one the business runs on.\n\nThe common failure is choosing 'learn it' for a gap that is really co-founder-shaped, because learning feels cheaper. It is cheaper in equity and dearer in years.", 2),
    quiz("l-fit-4", "c-fit", "mod-fit-2", "Module check: founder fit", 3),

    // ---- Opportunity -----------------------------------------------------
    article("l-opp-1", "c-opportunity", "mod-opp-1", "Define the problem before the solution", 520,
        "Almost every failed startup can describe its product in one sentence and needs five minutes for the problem. That is the wrong way round, and it is diagnostic.\n\nWrite the problem in the customer's language, not yours. 'Busy households lose an hour a week chasing a complete grocery basket across nearby shops' is a problem. 'There is no unified local-shopping platform' is a solution wearing a problem's coat — it presupposes that the absence of your product is the pain.\n\nThen ask the question that separates an opportunity from an irritation: what does the customer do today instead? There is always something. If the answer is 'nothing, they live with it', you are not looking at a market, you are looking at a preference. The existing workaround — the rushed store run, the WhatsApp group, the neighbour's errand — is your real competitor, and it is usually free and already installed.\n\nA problem worth building on is one where the workaround visibly costs something the customer can name. If they cannot name the cost, they will not pay to remove it.", 0),
    article("l-opp-2", "c-opportunity", "mod-opp-1", "Ten questions, a confidence, and a test", 600,
        "The evaluation grid is the most useful single page in the handbook, and it works because of the third column.\n\nFor each of the ten customer and market questions — who exactly buys, how many of them there are, what they pay now, how they decide, how you reach them, and so on — you write three things: your answer, how confident you are, and **the test that would settle it**.\n\nThe confidence rating stops you presenting a guess as a fact. The test column stops the exercise being theatre.\n\nA good test is cheap, fast and capable of proving you wrong. 'Interview twelve busy households and ask what an incomplete grocery run cost them last month' is a test. 'Do more research' is not. If a question's test would take three months and cost real money, that itself is a finding: you have identified the expensive unknown, and it should be the first thing you attack rather than the last.\n\nRun the grid before you build. Then run it again three months later and note which confidences moved. The direction of movement tells you more than any single answer.", 1),
    article("l-opp-3", "c-opportunity", "mod-opp-2", "The five characteristics, and the risk-return line", 560,
        "An opportunity has five characteristics, and a business that scores well on four is usually a business with a fatal flaw in the fifth.\n\n**It creates value** for someone identifiable. **It is profitable** at a realistic price and cost. **It fits** you — your access, your skills, your appetite. **It is durable**: the value does not evaporate in eighteen months. **It is financeable**: someone, somewhere, would fund it on terms you would accept.\n\nScore each one and refuse to average them.\n\nThen place it against the risk-return line. The principle is simple and widely ignored: the return has to compensate for the risk, measured against the risk-free alternative of doing nothing at all. A venture with a plausible twelve per cent return and a serious chance of total loss sits below the line. Being excited about it does not move it.\n\nThe comparison that founders skip is against doing nothing — keeping the job, keeping the savings. Run it explicitly. It is not an argument for timidity; it is the only way to know what the venture actually has to clear.", 2),
    article("l-opp-4", "c-opportunity", "mod-opp-2", "Breakeven, before optimism sets in", 480,
        "Breakeven is the least glamorous number in the plan and the one that most often turns out to be decisive.\n\nSplit costs into fixed and variable. Fixed costs are the ones that arrive whether or not you sell anything — rent, salaries, the software subscriptions nobody cancels. Variable costs move with each unit sold. The contribution per unit is price minus variable cost, and breakeven is simply fixed costs divided by that contribution.\n\nThe number it produces is usually uncomfortable, and the discomfort is the value. A founder who discovers they need four hundred customers a month at the current price has learned something specific: either the price is wrong, the cost base is wrong, or the market needs to be much larger than they assumed.\n\nRun it at three prices. Watch how violently breakeven moves when price changes by twenty per cent, and notice that price is usually the easiest of the three to change and the last one founders touch.", 3),
    article("l-opp-5", "c-opportunity", "mod-opp-3", "War-game the competitor", 500,
        "The competition section of most plans lists rivals and explains why each is inferior. That is not analysis, it is reassurance.\n\nThe useful version is a war-game. Pick the best-funded competitor and ask, concretely, what is the worst thing they could reasonably do to you in the next twelve months?\n\nThe handbook's standard case is a twenty per cent price cut. Model it. If a well-funded rival drops price twenty per cent, what happens to your breakeven, your runway, your pipeline? If the answer is that you are finished, you have not found a defensible position — you have found a window, and you should know that while it is still open.\n\nThen the harder version: what happens if an incumbent with an existing customer base simply bundles something adequate into what they already sell? Adequate and already-installed beats excellent and unfamiliar more often than founders like to admit.\n\nYou are not looking for a scenario where you win every time. You are looking for the specific moves that would kill you, so you can watch for them.", 4),
    quiz("l-opp-6", "c-opportunity", "mod-opp-3", "Module check: the opportunity", 5),

    // ---- Model and strategy ---------------------------------------------
    article("l-mod-1", "c-model", "mod-mod-1", "The five questions a model answers", 520,
        "A business model is not a revenue figure and it is not a canvas full of sticky notes. It is the answer to five questions, and the discipline is answering all five rather than the three you find interesting.\n\n**What value do you create, and for whom?** Specifically — not 'we help businesses grow'.\n\n**How do you capture a share of it?** The pricing model, not just the price. A per-seat subscription and a percentage of transactions describe very different businesses even at identical revenue.\n\n**Why does a customer pick you over the alternative?** Including the alternative of continuing to do nothing.\n\n**Why do you keep them?** What makes leaving cost something — data, habit, contract, integration, or genuinely just being better.\n\n**How does anyone find out you exist?** This is the question founders defer, and deferring it is how a good product ends up with no customers. Discovery belongs inside the model, not in a marketing plan written afterwards.\n\nOne page, five answers. If any answer needs a paragraph of throat-clearing, it is not yet an answer.", 0),
    article("l-mod-2", "c-model", "mod-mod-1", "The narrative test and the numbers test", 460,
        "Magretta's two tests are the fastest way to find out whether a model is real.\n\n**The narrative test.** Tell the story of the business as a sequence of events involving an actual person. A busy parent notices an empty cupboard, searches for a reliable nearby shop, finds CornerCart because a neighbour shared it, tries one basket, and reorders because it arrives complete. If the story requires a step where someone behaves in a way people do not actually behave — 'and then they read our white paper' — the model has a hole at exactly that step.\n\n**The numbers test.** Do the economics work at the volumes the story produces? Not at the volumes you hope for. The narrative usually implies a conversion rate and a sales cycle; put those numbers in and see whether the result pays for the cost base.\n\nMost broken models fail one test cleanly. A model that passes the narrative test and fails the numbers test is usually a pricing problem. A model that passes the numbers test and fails the narrative test is usually a distribution problem, and distribution problems are the more expensive of the two.", 1),
    article("l-mod-3", "c-model", "mod-mod-2", "A model is not a strategy", 500,
        "The distinction is worth being pedantic about, because conflating them produces companies that work on paper and lose anyway.\n\nA **model** describes how the business creates and captures value. A **strategy** describes how it does that better than the alternatives, in a way that lasts.\n\nTwo companies can share a model exactly — same pricing, same customers, same cost structure — and have opposite strategies. One competes on being the cheapest and organises everything around cost. The other competes on being the most specialised and organises everything around depth in one vertical. Both are coherent. A company that has not chosen is neither.\n\nThe test of a strategy is what it rules out. If your positioning statement does not imply a set of customers you will decline and features you will not build, it is a description rather than a strategy.\n\nWrite the sentence that says what you are deliberately not. Founders find it uncomfortable, which is the sign it is doing work.", 2),
    article("l-mod-4", "c-model", "mod-mod-2", "Do not scale early", 460,
        "Premature scaling is among the most reliable ways to kill a company that would otherwise have worked, and it rarely feels like a mistake at the time — it feels like ambition.\n\nThe sequence the handbook insists on is recognise, search, then pivot or persevere. You recognise a pattern, you search deliberately for whether it holds, and only then do you commit. Scaling before the search is finished means hiring against an assumption and building infrastructure for a customer who does not exist yet.\n\nThe practical markers are unglamorous. Are customers renewing without being chased? Does the sales motion work when someone other than the founder runs it? Can you say, with evidence, why the last ten customers bought?\n\nIf any of those is unclear, more spend makes the uncertainty more expensive rather than resolving it. Scale amplifies whatever is actually there, including the parts that do not work.", 3),
    quiz("l-mod-5", "c-model", "mod-mod-2", "Module check: model and strategy", 4),

    // ---- Legal form ------------------------------------------------------
    article("l-leg-1", "c-legal", "mod-leg-1", "Six forms and what actually separates them", 540,
        "The forms differ on six axes, and founders usually consider only the first.\n\n**Liability** — whether a creditor can reach your house. **Tax treatment** — whether profit is taxed once or twice, and whether early losses can offset your other income. **Ownership flexibility** — how easy it is to add, remove or differentiate owners. **Cost and admin** — formation and the annual burden. **Fundraising fit** — whether the investors you want can even invest. **Continuity** — what happens when an owner dies or leaves.\n\nThe triggering rules are simpler than the table suggests. If the business will make losses early and you have other income to offset, a pass-through form is attractive. If you intend to raise institutional equity or exit by sale, the corporate form investors expect is worth adopting before it becomes urgent, because converting later is an expense and a distraction at exactly the wrong moment.\n\nAnd plan the evolution. Choosing a form is not a one-time decision; it is choosing a starting point and knowing what would make you change.", 0),
    article("l-leg-2", "c-legal", "mod-leg-1", "Your jurisdiction is the whole answer", 420,
        "Everything in the previous lesson is a framework for thinking. None of it is advice, and the forms themselves differ by country in ways that are not cosmetic.\n\nA founder in the United States is choosing between sole proprietorship, partnership forms, an LLC and the two corporate forms. A founder in the United Kingdom is choosing between sole trader, partnership, LLP and a private limited company — and the tax treatment, the filing burden and the investor expectations attached to each are different from the American equivalents even where the names rhyme.\n\nThe pattern holds elsewhere. Nigeria, India, Germany and Singapore each have forms that look adjacent to the American list and behave differently on liability, minimum capital and foreign ownership.\n\nSo the output of this course is not a decision. It is a shortlist, the reasoning behind it, and a specific brief for local counsel — which turns an open-ended and expensive conversation into a cheap and narrow one.", 1),
    article("l-leg-3", "c-legal", "mod-leg-2", "Six things a founder agreement must settle", 560,
        "Write this while everyone still likes each other. That is not a joke about relationships; it is the only time the terms can be negotiated without one party being in a weak position.\n\n**Who owns what, and why.** Not just percentages — the reasoning, so it can be revisited honestly.\n\n**Vesting.** What happens to equity if someone leaves in month eight. Without it, a founder who quits early keeps a founder's stake for work they did not do, and every subsequent investor will make you fix it anyway.\n\n**Decision rights.** What needs unanimity, what needs a majority, and what one person can simply decide. Most founder disputes are not about money; they are about someone believing they had a vote.\n\n**Roles and commitment.** Full time or not, and from when. Written down, because memories diverge.\n\n**What happens if someone leaves** — voluntarily, involuntarily, or through illness.\n\n**How a deadlock is broken.** Two equal founders with no tiebreak is a structure that works right up until it does not.\n\nEach of these costs an awkward hour now. Each has ended companies when left undiscussed.", 2),
    quiz("l-leg-4", "c-legal", "mod-leg-2", "Module check: legal form", 3),

    // ---- Plan and pitch --------------------------------------------------
    article("l-pln-1", "c-plan", "mod-pln-1", "Seven sections, and what each is for", 560,
        "The plan has seven sections and each answers a question a reader is actually asking. Written in that spirit, it stops being a chore.\n\n**Executive summary** — can I understand this in two minutes and do I want to read on? Written last, read first, and the only section many readers finish.\n\n**The opportunity** — is there a real market, and how do you know?\n\n**Company, offering and strategy** — what exactly you sell, how the model works, how you win, and why that lasts.\n\n**Team** — who is doing this and why them. Investors will tell you this section outranks the financials, and they mean it.\n\n**Marketing** — how anyone finds out you exist. The section most often left thin, and the one most likely to be where the business fails.\n\n**Operating** — how the thing actually gets made and delivered.\n\n**Financial** — the numbers, with the assumption behind each one stated rather than buried.\n\nLength follows importance, not enthusiasm. Founders routinely write nine pages of product and half a page of marketing, which tells a reader something the founder did not intend.", 0),
    article("l-pln-2", "c-plan", "mod-pln-1", "People and model beat numbers", 480,
        "A five-year projection is a work of fiction and every experienced reader knows it. What they are actually assessing is whether the people are capable and whether the model is coherent — because those two things determine what happens when the projection turns out to be wrong, which it will.\n\nThis has a practical consequence for how you write. Do not defend the numbers; explain the assumptions. 'We project four hundred customers in year two' invites an argument. 'We project four hundred customers in year two, assuming the conversion rate we have seen across ninety trials holds and that we can sustain the current rate of outbound' invites a conversation about the assumption, which is the conversation you want.\n\nSahlman's team questions are the ones to pre-empt: what have these people done before, what do they know that others do not, who do they know, how hard are they willing to work, and — the one founders never answer — what happens if the plan needs to change completely?\n\nAnswer that last one in the plan. It signals that you have thought past your own optimism.", 1),
    article("l-pln-3", "c-plan", "mod-pln-2", "Three compressions: 100 words, one sentence, two decks", 500,
        "The plan is the thinking. The compressions are what people actually receive.\n\n**One hundred words.** The email. Problem, who has it, what you do, why you, what you want. If it needs a second paragraph to make sense, the model is not yet clear enough to explain.\n\n**One sentence.** Harder, and worth the afternoon. Not a slogan — a sentence a listener could repeat accurately to a colleague. The test is whether the repetition survives: if they relay it and get it wrong, the sentence is wrong.\n\n**Two decks, because they do different jobs.** A presentation deck supports you speaking and should be nearly wordless; a reading deck is sent ahead and must stand alone. Founders who send their presentation deck are sending something incomprehensible, and founders who present their reading deck are reading slides aloud. Build both; it is mostly the same content at two densities.\n\nAnd tell readers how they get their money out. A plan that never mentions exit leaves the most important question to the reader's imagination.", 2),
    article("l-pln-4", "c-plan", "mod-pln-2", "The reader-lens check", 440,
        "Before sending anything, read it once as each of three people. This catches more than another round of editing.\n\n**As a sceptical investor.** Where is the claim with no evidence? Which number would you challenge first? Is the ask specific, and does the use of funds actually follow from the plan?\n\n**As a potential employee.** Would you leave a job for this? Is it clear what the company will be like to work in, or only what it sells?\n\n**As the customer.** Is the problem described one you recognise, in words you would use? Founders drift into their own vocabulary within months, and the plan is usually where the drift first shows.\n\nMark every place where a reader would pause, and fix the pause rather than defending the sentence. A pause is a reader deciding whether to continue, and you do not get to argue with them at the time.", 3),
    quiz("l-pln-5", "c-plan", "mod-pln-2", "Module check: plan and pitch", 4),

    // ---- Startup money ---------------------------------------------------
    article("l-sum-1", "c-startup-money", "mod-sum-1", "Which of the three businesses are you?", 500,
        "This question decides which funding advice applies to you, and most bad funding advice is simply advice for a different type of business.\n\n**Main Street.** The large majority of new businesses — roughly seven in ten. A restaurant, an agency, a clinic, a trade. Funded by savings, family, bank debt and revenue. Venture capital is not merely unavailable; it is unsuitable, because the returns that make the business excellent for its owner are far below what a fund requires.\n\n**Supply-chain.** Around one in six. You sell into other businesses as a supplier or a component. Financing follows contracts and receivables, and the decisive relationship is with a small number of customers.\n\n**High-growth.** About three per cent. Large addressable market, a model with strong operating leverage, and a plausible path to an outcome big enough to return a fund.\n\nThe cost of misidentifying is a year. Founders of Main Street businesses who spend that year pitching venture funds are not failing at fundraising; they are succeeding at proving they were never in that category.", 0),
    article("l-sum-2", "c-startup-money", "mod-sum-1", "Compute the number before you ask for it", 520,
        "The opening balance sheet is the answer to 'how much do you need?', and it is embarrassing to be asked that question without one.\n\nList what you must buy to open: equipment, deposits, initial stock, the legal and registration costs, any prepaid software. That is the capital side.\n\nThen the part founders underestimate — working capital. You will pay suppliers and staff before customers pay you, and the gap has to be funded. Estimate months of operating cost until the business covers itself, and be pessimistic; the common error is assuming revenue starts in month two at the level the plan shows for month six.\n\nAdd a contingency and say what it is for.\n\nThe total is your launch capital. Now you can have a sensible conversation, because 'I need forty-two thousand, here is the sheet' is a different conversation from 'I'm looking to raise some money'. The first invites scrutiny of your reasoning. The second invites doubt about your competence.", 1),
    article("l-sum-3", "c-startup-money", "mod-sum-2", "Stack the sources, cheapest first", 540,
        "Money has a price, and the price is not only interest. It is control, obligation, and what happens to the relationship if things go badly.\n\nStack from cheapest outward. **Your own savings** fund most startups, and the reason is not virtue — it is that no one else will price the risk at this stage. **Revenue** is the cheapest external money there is, which is why selling something early beats raising something early whenever it is possible.\n\n**Family and friends** are cheap in interest and expensive in every other currency. If you take it, paper it: amount, terms, what happens if the business fails, and an explicit acknowledgement that they may lose it. The document is not for enforcement. It is so that everyone remembers the same conversation.\n\n**Bank debt** arrives when there is something to lend against. **Angels** and **institutional equity** follow a track record, not a plan — which is why they are at the far end of the stack rather than the start of it.\n\nWhen the stack does not reach the number, you have three moves: reduce the number, extend the timeline, or change the business. Pretending is not one of them.", 2),
    quiz("l-sum-4", "c-startup-money", "mod-sum-2", "Module check: opening capital", 3),

    // ---- Growth money ----------------------------------------------------
    article("l-gro-1", "c-growth-money", "mod-gro-1", "The banker's three questions", 520,
        "A lender is not evaluating your ambition. They are answering three questions, and knowing them lets you prepare the actual meeting rather than a pitch.\n\n**Can you repay?** Cash flow, not profit. They will look at whether the business generates enough cash to service the debt with room to spare, and they will do it on your historic numbers rather than your projections.\n\n**Will you repay?** Character, in the old sense — track record, how you have handled obligations before, whether the story you tell matches the documents. This is why a tidy set of accounts matters beyond compliance.\n\n**What if you cannot?** Collateral and personal guarantees. Understand precisely what you are pledging. A personal guarantee converts a business failure into a personal one, and founders sign them without reading them with a frequency that should worry everyone.\n\nPrepare all three deliberately. The meeting goes differently when you answer the question they are actually asking.", 0),
    article("l-gro-2", "c-growth-money", "mod-gro-1", "Five ratios they run before you arrive", 540,
        "These are computed from your accounts before anyone meets you. Run them first.\n\n**Current ratio** — current assets over current liabilities. Can you meet obligations due within the year?\n\n**Acid-test** — the same, excluding stock. Stock can be hard to convert quickly, and a business that looks liquid only because the warehouse is full is not liquid.\n\n**Debt ratio** — total debt over total assets. How much of the business is already someone else's claim.\n\n**Debt-to-equity** — how leveraged you are relative to what the owners put in. A high figure says the lender is taking risk the owners have not.\n\n**Times-interest-earned** — earnings over interest. The margin between servicing debt comfortably and not servicing it.\n\nCompute all five. Where one is weak, you have a choice: fix it before applying, or lead with it and explain. What does not work is hoping it goes unnoticed, because it is the first thing that gets noticed.", 1),
    article("l-gro-3", "c-growth-money", "mod-gro-2", "Short money, short assets", 480,
        "The matching principle is one line long and explains a large share of business failures: fund short-lived assets with short-term money, and long-lived assets with long-term money.\n\nBuying a building with an overdraft is the obvious violation. The common one is subtler — funding a hiring spree, whose payoff is eighteen months out, from a facility repayable in ninety days. The business is profitable, growing, and insolvent, all at once.\n\nThe reverse error is quieter but real: financing stock that turns over monthly with a five-year loan means paying interest long after the asset is gone.\n\nThe test to run on every financing decision is simply: how long will this asset generate cash, and how long do I have this money for? If the second number is smaller than the first, you have introduced a refinancing risk, and refinancing risk has a habit of arriving at exactly the moment credit tightens.", 2),
    article("l-gro-4", "c-growth-money", "mod-gro-2", "Stress-test with EBIT halved", 460,
        "Take your projection and halve operating profit. Now re-run everything: the ratios, the covenants, the runway, the repayment schedule.\n\nThis is not pessimism for its own sake. It is what the lender's credit committee will do, and it is a reasonable proxy for an ordinary bad year — a large customer leaving, a price war, a delayed launch. None of those is a catastrophe; all of them halve profit.\n\nWhat you are looking for is the first thing that breaks. Usually it is a covenant rather than the ability to pay, and covenant breaches trigger consequences disproportionate to the miss.\n\nIf the business survives EBIT halved with the covenants intact, you have a financing structure with genuine margin, and you can say so. If it does not, you have learned the size of the buffer you need before taking the money — which is far cheaper to learn now than in the quarter it happens.", 3),
    quiz("l-gro-5", "c-growth-money", "mod-gro-2", "Module check: growth money", 4),

    // ---- Angels and VC ---------------------------------------------------
    article("l-vc-1", "c-vc", "mod-vc-1", "How a venture fund actually makes money", 560,
        "Every term in a term sheet follows from this structure, so it is worth understanding before you negotiate against it.\n\nA fund raises capital from limited partners. It charges an annual management fee — typically in the region of two to three per cent — which pays salaries and keeps the lights on. The real money is **carried interest**, a share of the profits, commonly around twenty per cent.\n\nThe portfolio maths is the part founders miss. Most investments return little or nothing. A small number return capital. The fund's entire result depends on roughly one in fifteen producing an outsized outcome.\n\nSo when a partner asks whether this could be very large, they are not being greedy or dismissive of a solid business. They are asking the only question their structure permits them to ask. A company that will reliably return three times their money is a bad venture investment and an excellent business — those are not contradictory statements.\n\nUnderstanding this converts the conversation from a judgement on your worth into a question of fit. Which is what it always was.", 0),
    article("l-vc-2", "c-vc", "mod-vc-1", "Angels fund far more companies than VCs", 480,
        "The numbers are lopsided in a way that should change where most founders spend their time. Angels fund roughly sixteen times more companies than venture funds do, and well under one per cent of companies ever raise venture capital at all.\n\nAngels also invest differently. They write smaller cheques, decide faster, and answer to nobody — which means an angel can back a business because they understand the sector personally, where a fund must justify it against a portfolio thesis.\n\nThey broadly finance three kinds of company: ones in an industry they know intimately, ones solving a problem they have had themselves, and ones introduced by someone whose judgement they already trust. Notice that all three are relationship-shaped rather than deck-shaped.\n\nThe practical implication: an introduction from someone credible is worth more than a superb cold approach, and building that network is work you do months before you need it. Line up a venture raise six to eight months ahead; line up angels earlier than that, by knowing them before you need them.", 1),
    article("l-vc-3", "c-vc", "mod-vc-2", "Convertible preferred, feature by feature", 580,
        "Investors do not buy the shares you own. They buy convertible preferred stock, and the features are where the economics live.\n\n**Liquidation preference** — they get their money back before common shareholders get anything. At one times, non-participating, this is reasonable and standard. Multiples, or participation on top, change the outcome for founders dramatically in any sale that is not enormous. Model your own exit at several prices to see where you actually land.\n\n**Conversion** — the right to convert to common, which they take when that pays better. It means they choose whichever branch is more favourable, and you should model both.\n\n**Anti-dilution** — protection if a later round prices lower. Full-ratchet is punishing; broad-based weighted average is the common and more balanced form.\n\n**Protective provisions** — the list of things you cannot do without their consent. Read this list slowly. It is where control actually sits, more than board seats do.\n\n**Pro rata** — the right to maintain their percentage in later rounds.\n\nNone of these is unreasonable in itself. The combination determines what you own in the outcomes that actually happen.", 2),
    article("l-vc-4", "c-vc", "mod-vc-2", "Four ways to delay giving away equity", 460,
        "Equity is the most expensive money available, because you pay for it forever and you pay most when things go well. Delaying it is usually worth real effort.\n\n**Sell something.** Revenue is non-dilutive and it prices your company far better later. A round raised after twelve months of growth is a fundamentally different conversation from one raised on a plan.\n\n**Grants and competitions**, where they exist for your sector and geography. Slow and administratively tedious, and free.\n\n**Customer funding** — deposits, prepayments, a design partner who funds development in exchange for early access or favourable terms. Common in B2B and underused.\n\n**Debt against something real** — receivables, equipment, a contract. Available earlier than founders assume once there is an asset to lend against.\n\nEach of these buys months, and months buy valuation. The founder who raises at month eighteen instead of month six frequently gives away half as much for the same money — and by then knows enough to spend it well.", 3),
    quiz("l-vc-5", "c-vc", "mod-vc-2", "Module check: angels and venture", 4),

    // ---- Founder-led sales ----------------------------------------------
    article("l-sel-1", "c-sell", "mod-sel-1", "Discovery finds the problem, not the compliment", 520,
        "The failure mode of early sales calls is that they go well. The prospect is encouraging, says it sounds interesting, and does not buy.\n\nThat happens because the founder asked about the solution. People are polite about solutions and honest about problems, so ask about problems.\n\nThe most productive question is about the past, not the future: 'tell me about the last time this happened'. A story about last month cannot be flattering in the way a prediction can. Follow it — what did you do, who else was involved, how long did it take, what did it cost?\n\nWhat you are listening for is whether they have already tried to solve it. Someone who has built a spreadsheet, hired a temp, or bought something that did not work has demonstrated budget and intent. Someone who says 'yes, that is annoying' has demonstrated politeness.\n\nAnd when they compliment the idea, write it down and discount it. The only reliable signal at this stage is what they have already spent time or money on.", 0),
    article("l-sel-2", "c-sell", "mod-sel-1", "Qualify out early, without apology", 460,
        "The scarcest thing in early sales is not leads. It is the founder's hours, and they leak into deals that were never going to close.\n\nQualify on four things, early and directly. Is there a real problem, of a size they can name? Is there budget, or could there be? Is this person able to decide, or do they need someone who has not been in any of these conversations? And is there a reason to act now, rather than next year?\n\nA 'no' on any of these is not a failure. It is an hour returned.\n\nFounders resist this because every conversation feels like progress when there are so few. But a pipeline full of unqualified interest produces a forecast that is wrong in the specific direction that causes you to hire too early.\n\nSay it plainly: 'It sounds like this is not a priority this year — should we talk again in the autumn?' Most people are relieved. Some correct you, and those are the real deals.", 1),
    article("l-sel-3", "c-sell", "mod-sel-2", "The pricing conversation", 540,
        "Founders discount because they are afraid of the silence after they say the number. Everything else about pricing follows from managing that moment.\n\nSay the price plainly and then stop talking. The pause is not rejection; it is arithmetic. Filling it with a concession teaches the customer that your prices are an opening position, and that lesson is permanent for the relationship.\n\nWhen there is genuine pushback, find out what kind it is. 'It is more than we expected' is about the value not being clear, and the answer is to re-establish the cost of their problem. 'We cannot afford it this quarter' is about timing, and the answer is scope or phasing. 'We can get it cheaper' is about a competitor, and the answer is either a real difference or a considered decision to lose the deal.\n\nIf you must move, trade rather than discount. A lower price for a longer commitment, a case study, or a reference is an exchange. A lower price for nothing is a repricing.", 2),
    quiz("l-sel-4", "c-sell", "mod-sel-2", "Module check: founder-led sales", 3),

    // ---- Operate ---------------------------------------------------------
    article("l-ops-1", "c-operate", "mod-ops-1", "Three statements and how they link", 560,
        "The three statements answer three different questions, and a founder who only reads one is usually reading the wrong one.\n\n**The profit and loss** asks whether the business made money over a period. It is accrual-based: revenue is recorded when earned, costs when incurred, regardless of when cash moved.\n\n**The balance sheet** asks what the business owns and owes at a moment. Assets on one side, liabilities and equity on the other, always in balance.\n\n**The cash-flow statement** asks where the money actually went. This is the one that explains how a profitable business runs out.\n\nThe link matters. Profit flows into retained earnings on the balance sheet. Balance-sheet movements — a customer taking ninety days to pay, stock bought ahead of a season — explain the gap between profit and cash.\n\nThat gap is where businesses die. A company can show a healthy annual profit and be unable to make payroll in March, and nothing in the profit and loss will warn you.", 0),
    article("l-ops-2", "c-operate", "mod-ops-1", "The thirteen-week cash forecast", 520,
        "This is the single most useful operating document a small company can keep, and it takes about an hour a week.\n\nThirteen weeks, one column each. Opening balance, money in, money out, closing balance. Money in is by customer and by expected date, not by invoice date — what you believe will actually arrive. Money out is payroll, suppliers, rent, tax, and the recurring costs that are easy to forget until they clear.\n\nUpdate it weekly by rolling the window forward one week and correcting the previous week's guesses against what happened.\n\nTwo things make it valuable. First, it converts 'are we all right?' into a number and a date. Second — and this is the part that surprises people — the weekly correction makes you a rapidly better forecaster, because you are confronted with your own optimism at seven-day intervals.\n\nWhen the closing balance goes negative in week nine, you have nine weeks to act. Without the forecast you would have found out in week nine.", 1),
    article("l-ops-3", "c-operate", "mod-ops-2", "A cadence that runs without you", 540,
        "The test of an operating system is whether it still happens in a week when the founder is ill. Most do not, because the founder is the system.\n\nThe minimum is three rhythms.\n\n**Weekly, sixty minutes.** Same time, fixed agenda, a named owner who is not necessarily you. What moved, what is stuck, what we are doing about it, what we decided. Decisions are written down in the same place every week.\n\n**Monthly, ninety minutes.** The numbers. Management accounts, the metric set, the cash forecast. Comparison against what you expected — not just what happened, but why the expectation was wrong.\n\n**Quarterly, half a day.** What are we doing next, what are we stopping, has anything changed about the plan.\n\nWrite each as an SOP: who runs it, what they prepare, what the output is and where it lives. An SOP feels bureaucratic for a team of four and is the reason a team of twelve can exist at all. Every cadence that only works because you remember to run it is a constraint on the size the company can reach.", 2),
    quiz("l-ops-4", "c-operate", "mod-ops-2", "Module check: operating", 3),

    // ---- Metrics ---------------------------------------------------------
    article("l-met-1", "c-metrics", "mod-met-1", "CAC, honestly calculated", 500,
        "Customer acquisition cost is simple to define and almost universally calculated too favourably.\n\nTake everything spent to acquire customers in a period — advertising, the sales and marketing salaries, the tools, the commissions, the events, the agency — and divide by the number of new customers acquired in that period.\n\nThe common errors all point the same way. Leaving out salaries, which are usually the largest component. Counting customers who arrived through word of mouth in the denominator while excluding no cost from the numerator, which flatters the figure. Blending an efficient channel with an expensive one and reporting the average, which hides that one of them does not work.\n\nCalculate it per channel. The blended number is for the board; the per-channel number is what you act on.\n\nAnd pair it with **payback period** — how many months of gross margin from that customer it takes to earn the cost back. CAC alone is meaningless; CAC against payback tells you whether growth is funding itself or consuming the balance sheet.", 0),
    article("l-met-2", "c-metrics", "mod-met-1", "Retention is the metric that decides", 520,
        "Acquisition gets the attention and retention decides the outcome. A business with excellent acquisition and poor retention is a business that must keep spending to stand still, and it will eventually meet a quarter where it cannot.\n\nMeasure it in cohorts. Take everyone who arrived in a given month and follow that group: what fraction is still there at three months, six, twelve? Do not take an overall churn figure — it averages your best customers with your worst and hides the trend.\n\nWhat you are looking for is whether the curve flattens. A cohort that declines and then stabilises has found a group for whom the product genuinely works, and that plateau is the real business. A curve that keeps falling to zero means you have a leaky bucket, and no amount of acquisition fixes a leaky bucket.\n\nCompare cohorts against each other over time. If March's cohort retains better than January's, something you changed worked. That comparison is the most reliable product feedback you will get.", 1),
    article("l-met-3", "c-metrics", "mod-met-2", "Burn, runway, and what to do at nine months", 480,
        "Runway is cash divided by net monthly burn, expressed in months, and it is the number that determines how many options you have.\n\nCalculate it monthly and be strict about what counts as burn. Use actual cash out, not budget. Include the costs that arrive quarterly or annually, amortised — tax, insurance, the annual software renewals — because a runway figure that ignores them is wrong by exactly the amount that matters.\n\nThe thresholds are worth internalising. Below twelve months, a raise becomes urgent rather than optional, and urgency is expensive. Below six, you are negotiating from weakness and everyone in the room knows it. Below three, you are managing an emergency rather than a business.\n\nSo the decision point is at nine months, not three. That is when you either start the raise, cut to extend, or change the plan — while all three are still genuinely available. Founders who wait until six find that only one of them is.", 2),
    quiz("l-met-4", "c-metrics", "mod-met-2", "Module check: the numbers", 3),

    // ---- Scale -----------------------------------------------------------
    article("l-scl-1", "c-scale", "mod-scl-1", "Three questions before you scale", 520,
        "Scaling is not automatically the right move, and the three post-startup questions exist to make that a decision rather than a drift.\n\n**Is the strategy still right?** The one that got you here was built for a smaller company in a market that has since moved. Check it rather than assuming it.\n\n**Can the organisation keep up?** Growth strains the support functions first — finance, hiring, support, compliance — and they typically fail before the product does. Which of yours is closest to breaking?\n\n**Is the founder still the right leader for what comes next?** Asked early and honestly, this is a question about which skills to acquire. Asked late, it is a question the board asks without you.\n\nIf the answer to any of these is unclear, the correct move is to resolve it before adding load. Scale amplifies whatever is already true, including what does not work — and it converts a manageable weakness into an expensive one.", 0),
    article("l-scl-2", "c-scale", "mod-scl-1", "What must never be outsourced", 460,
        "Outsourcing buys capability without fixed cost, and it is genuinely useful. Two rules keep it from being a mistake.\n\n**Never outsource a customer-facing link.** The moment the customer's experience of you is delivered by someone whose incentives differ from yours, you have lost both the relationship and the information that comes with it. You also stop hearing complaints directly, which is the cheapest research you had.\n\n**Never depend on a single partner for something you cannot quickly replace.** A sole supplier of a critical component is a decision to accept their pricing and their reliability, permanently. The mitigation is a second source, even a more expensive one kept small.\n\nWithin those limits, outsource freely — payroll, infrastructure, specialist compliance, anything that is a cost centre rather than a differentiator.\n\nThe test: if this partner disappeared on Monday, how long until we are operating again? Under a week is a supplier. Over a month is a dependency, and dependencies belong on the risk register with an owner and a plan.", 1),
    article("l-scl-3", "c-scale", "mod-scl-2", "Content, behaviours, results, context", 560,
        "The founder's transition is the hardest thing in this course, and it has four stages that founders pass through in roughly this order — or fail to.\n\n**Managing content.** You do the work. Correct at three people, and the reason the company exists.\n\n**Managing behaviours.** You show people how you do the work and check that they do it that way. Necessary and temporary; founders who stay here become the bottleneck they complain about.\n\n**Managing results.** You agree the outcome and let people choose the method. This is where most founders get stuck, because someone else's method is visibly worse than yours at first, and the temptation to intervene is constant. It is also where the company starts being able to grow without you.\n\n**Managing context.** You shape the environment — the goals, the information, the incentives, who is in which seat — and the results follow from the context rather than from your instruction.\n\nThe move from behaviours to results is the painful one. It requires tolerating work done worse than you would do it, in exchange for a company that can be larger than you. There is no version where you get both.", 2),
    quiz("l-scl-4", "c-scale", "mod-scl-2", "Module check: scaling", 3),

    // ---- AI-native -------------------------------------------------------
    article("l-ai-1", "c-ai", "mod-ai-1", "The remove test", 520,
        "Nearly every company now describes itself as AI-native, and the word has stopped carrying information. There is a test that restores it, and it takes one question.\n\n**Turn the AI off. Does the product degrade, or does it stop?** If it degrades, you are AI-enabled: a real product with an AI feature on it. If it stops, you are AI-native. Neither is better \u2014 but only one of them is the claim you are making to investors.\n\nThe harder second question is the one founders avoid: **does a better foundation model make you more valuable, or redundant?** If the next release makes your product obviously better, you are riding the curve. If it makes your product unnecessary, you are a feature that has not been absorbed yet.\n\nAnd the version that actually predicts outcomes is neither. The evidence is consistent that the firms getting measurable results are the ones that **redesigned the workflow** \u2014 roughly three quarters of high performers, against a quarter of everyone else. Bolting a chatbot onto a human-shaped process is the standard failure, and it fails quietly.", 0),
    article("l-ai-2", "c-ai", "mod-ai-1", "What the evidence actually says", 640,
        "This lesson exists because the numbers in this field are unusually unreliable, and a founder who cannot sort them will make an expensive decision on a press release.\n\n**Randomised, and uncomfortable.** A controlled trial of sixteen experienced developers across 246 real tasks found them **19% slower** with AI tooling \u2014 while reporting they had been about 20% faster. They were wrong about their own speed by roughly forty points. Any claim of the form \u2018AI saves us X hours\u2019, with no control group, is a feeling rather than a finding.\n\n**Randomised, and encouraging.** A field experiment with 776 professionals found individuals working with AI matched the output of two-person teams without it, in about 16% less time. Both results are real. AI substitutes for a teammate on some tasks and costs you time on others, and which is which is an empirical question about your work.\n\n**The adoption gap.** Surveys report adoption near 90%. The nationally representative business survey puts the share of firms actually *using* AI in producing goods or services at **17-20%**. Roughly 80% of executives report productivity gains; about 37% report any effect on operating profit.\n\n**Treat vendor resolution rates as marketing.** Published deflection figures cluster far above independent tests of the same products.\n\nThe honest summary: the floor has risen, the ceiling is unproven, and the gap between them is filled almost entirely with self-report.", 1),
    article("l-ai-3", "c-ai", "mod-ai-2", "Agentic workflows beat better prompts", 540,
        "The single highest-leverage technique in applied AI is also the least glamorous: stop asking the model for the answer, and give it a process.\n\nThe loop is **outline \u2192 search \u2192 draft \u2192 self-critique \u2192 revise**. Each step is an ordinary call; the quality jump comes from the structure, and it is consistently larger than the jump from upgrading the underlying model. It is slower and dearer per request, which is exactly why people skip it and then conclude the model is not good enough.\n\nTwo practical consequences.\n\n**Pick concrete problems over vague ones.** \u2018Summarise this\u2019 has no evaluable output. \u2018Extract the five commitments made in this call and flag the ones without an owner\u2019 can be checked by a human in ten seconds, which means it can be improved.\n\n**Optimise for iteration speed.** The best predictor of whether an AI feature gets good is how many times you can go round the loop in a week, not how clever the first version was.\n\nAnd know which mode you are in. Accepting generated code without reading it is fine for a prototype you intend to throw away. It is not a way to run a system customers depend on, and the distinction is about the code\u2019s destination rather than the tool.", 2),
    article("l-ai-4", "c-ai", "mod-ai-2", "Evals: read the failures, then count them", 600,
        "The moment an AI feature has users, evaluation becomes the product discipline \u2014 and practitioners report that **60-80% of production AI development time is error analysis**, not model work. Founders consistently budget for the opposite.\n\nThe method is unglamorous and it works.\n\n**Read real traces by hand first.** Not synthetic cases \u2014 actual production conversations, fifty or a hundred of them, and write down what went wrong in your own words. Group those notes into failure modes. This is the step everyone skips and the one that tells you what to measure.\n\n**Then build judges for the top failure modes, and keep them binary.** \u2018Did the answer cite a real document: yes or no\u2019 is checkable and stable. \u2018Rate helpfulness one to five\u2019 is neither, and will drift.\n\n**Generate test cases from explicit dimensions**, not by asking a model to invent tests \u2014 otherwise you get what it finds easy to imagine.\n\n**A 100% pass rate means your evals are too easy.** It is the most common sign a team has stopped learning anything from them.\n\nOne economic note, because it changes the business rather than the feature: inference is a real line of cost of goods. AI-native gross margins have been running near the low fifties against 75-85% for conventional software, with inference around a fifth of product cost. A model that is ten times better and three times dearer is not automatically the right choice.", 3),
    article("l-ai-5", "c-ai", "mod-ai-2", "The lethal trifecta", 470,
        "Before you give an agent tools, there is one security shape to learn, because it is the one no system prompt fixes.\n\nAn agent becomes exfiltration-capable when it has all three of:\n\n1. **Access to private data**\n2. **Exposure to untrusted content** \u2014 a web page, an email, a user upload, a document someone else wrote\n3. **An outbound channel** \u2014 the ability to send, post, call an API, or write somewhere visible\n\nWith all three, untrusted content can instruct the agent to take private data and send it out. This is not a jailbreak to be patched; it is the architecture working as designed. Prompt-level defences reduce the rate and do not remove the capability.\n\n**The fix is to remove a leg.** Read-only agents can see private data and untrusted content, and have nothing to send with. Agents that act can be restricted to trusted inputs. If you genuinely need all three, the answer is sandboxing and logging every action for review \u2014 not a better instruction.\n\nAsk the question before the demo, not after the incident: which of the three does this agent have, and which one am I removing?", 4),
    quiz("l-ai-6", "c-ai", "mod-ai-2", "Module check: AI-native", 5),
    // ---- Exit ------------------------------------------------------------
    article("l-ext-1", "c-exit", "mod-ext-1", "Name the motivation before the mechanism", 500,
        "Founders choose an exit mechanism and then rationalise the reason. Doing it in that order produces exits people regret.\n\nThe honest motivations are few, and each points somewhere different.\n\n**I am tired.** Legitimate, common, and rarely said aloud. It points toward a trade sale with a short earn-out, and away from anything requiring three more years of your energy.\n\n**I want liquidity but not to leave.** Points toward a secondary sale or a partial recapitalisation, not a full exit.\n\n**The company needs an owner I cannot be.** Capital, distribution, a market I cannot reach. Points toward a strategic acquirer.\n\n**I want to maximise the number.** Points toward a competitive process, and toward waiting for the year that shows best.\n\nThese lead to different buyers, different timelines and different outcomes for your team. Naming the real one first is what makes the rest of the decisions coherent — and it is also the thing an adviser cannot do for you.", 0),
    article("l-ext-2", "c-exit", "mod-ext-1", "What a buyer finds in diligence", 520,
        "Diligence does not discover new problems. It discovers the problems you knew about and had not fixed, and it discovers them at the moment when fixing them is most expensive.\n\nThe recurring list: customer contracts that were never signed or have auto-renewed on unclear terms; intellectual property assigned to individuals rather than the company, especially from early contractors; a founder agreement that does not reflect what actually happened; revenue concentrated in a handful of customers; employment arrangements that were convenient and are not compliant; and accounts that require explanation rather than standing on their own.\n\nEach of these is cheap to fix a year out and costly to fix under a signed exclusivity with a deadline, because at that point the buyer knows you cannot walk away easily.\n\nSo run your own diligence early — ideally a year before you intend to sell, and honestly before you intend anything. The list you produce is a to-do list; produced later, the same list becomes a price reduction.", 1),
    article("l-ext-3", "c-exit", "mod-ext-2", "Three ways to value, one range to hold", 540,
        "Get your own valuation before anyone gives you theirs. The first number you hear anchors everything that follows, and you want the anchor to be yours.\n\n**Multiple of earnings.** The most common in practice. A multiple of profit, or of revenue for faster-growing companies, benchmarked against comparable transactions. The multiple is not arbitrary — it encodes growth rate, margin, customer concentration and how much of the business depends on you.\n\n**Discounted cash flow.** Project the cash the business will generate and discount it to today. Rigorous in structure and extremely sensitive to assumptions, which means it can be made to produce almost any answer. Useful for understanding the drivers; dangerous as a single figure.\n\n**Comparable transactions.** What similar businesses actually sold for. The hardest data to get and the most persuasive when you have it.\n\nRun all three. They will disagree, and the disagreement is informative — it tells you which assumptions the value hangs on.\n\nHold a range with reasoning, not a number with hope. And when a buyer states a valuation, ask exactly how they derived it. The answer tells you what they think they are buying.", 2),
    quiz("l-ext-4", "c-exit", "mod-ext-2", "Module check: harvest", 3),
];

export const LEGACY_TEMP_LESSONS: Lesson[] = withRevisions(RAW_LESSONS);

export const LEGACY_TEMP_QUIZ: QuizQuestion[] = [
    { id: "q-fit-1", lessonId: "l-fit-4", prompt: "The three must-haves for a founder are…", options: ["Passion, funding and a network", "A plan, the ability to execute it, and lasting motivation", "Experience, credentials and capital", "An idea, a co-founder and a deadline"], answer: 1, explanation: "Passion is an input, not a qualification. An investor tests plan, execution and durable motivation." },
    { id: "q-fit-2", lessonId: "l-fit-4", prompt: "You score badly on a capability the business fundamentally runs on. The usual right answer is…", options: ["Learn it — you have time", "Ignore it and play to strengths", "Find a co-founder who already has it", "Hire a junior into the role"], answer: 2, explanation: "Central and permanent gaps are co-founder-shaped. Choosing 'learn it' because it feels cheaper costs years." },
    { id: "q-fit-3", lessonId: "l-fit-4", prompt: "Why does the handbook treat customer complaints as valuable?", options: ["They show engagement", "They are the cheapest market research available", "They improve retention when answered", "They are required for compliance"], answer: 1, explanation: "Complaints are free, specific and unsolicited — and most founders manage them as an attack rather than mining them." },

    { id: "q-opp-1", lessonId: "l-opp-6", prompt: "In the market-evaluation grid, the column that stops the exercise being theatre is…", options: ["Your answer", "Your confidence", "The test that would settle it", "The source"], answer: 2, explanation: "Naming a cheap, fast test that could prove you wrong converts an opinion into something resolvable." },
    { id: "q-opp-2", lessonId: "l-opp-6", prompt: "Your real competitor at the idea stage is usually…", options: ["The best-funded startup in the space", "The incumbent market leader", "Whatever workaround the customer uses today", "A future entrant"], answer: 2, explanation: "The spreadsheet, the intern or the WhatsApp group is free and already installed — that is what you displace." },
    { id: "q-opp-3", lessonId: "l-opp-6", prompt: "Breakeven is…", options: ["Revenue minus total costs", "Fixed costs divided by contribution per unit", "Variable costs divided by price", "Total costs divided by units sold"], answer: 1, explanation: "Contribution is price minus variable cost; breakeven is how many units of contribution cover the fixed base." },

    { id: "q-mod-1", lessonId: "l-mod-5", prompt: "Which question do founders most often leave out of their business model?", options: ["What value we create", "How we capture value", "How anyone discovers we exist", "Who the customer is"], answer: 2, explanation: "Discovery belongs inside the model. Deferring it is how a good product ends up with no customers." },
    { id: "q-mod-2", lessonId: "l-mod-5", prompt: "A model that passes the numbers test but fails the narrative test usually has…", options: ["A pricing problem", "A distribution problem", "A hiring problem", "A legal problem"], answer: 1, explanation: "The story breaks at the step where a real person would have to behave implausibly — normally how they find you." },
    { id: "q-mod-3", lessonId: "l-mod-5", prompt: "The test of a real strategy is…", options: ["That it is ambitious", "That it is written down", "What it rules out", "That investors like it"], answer: 2, explanation: "If it implies no customers you decline and no features you refuse, it is a description rather than a strategy." },

    { id: "q-leg-1", lessonId: "l-leg-4", prompt: "Early losses you can offset against other income point toward…", options: ["A C corporation", "A pass-through form", "A limited partnership only", "Any form — it makes no difference"], answer: 1, explanation: "Pass-through treatment lets early losses flow to the owners' returns; a corporation traps them in the entity." },
    { id: "q-leg-2", lessonId: "l-leg-4", prompt: "Why does vesting matter in a founder agreement?", options: ["It reduces tax", "It stops an early leaver keeping a founder's stake for work they did not do", "It is legally required", "It increases valuation"], answer: 1, explanation: "Without it, a founder who leaves in month eight keeps a full stake — and every later investor will force a fix anyway." },
    { id: "q-leg-3", lessonId: "l-leg-4", prompt: "The output of the legal-form course should be…", options: ["A registered company", "A decision you act on immediately", "A shortlist, the reasoning, and a brief for local counsel", "A signed shareholders' agreement"], answer: 2, explanation: "Forms and tax treatment differ by jurisdiction; the framework narrows an expensive conversation into a cheap one." },

    { id: "q-pln-1", lessonId: "l-pln-5", prompt: "Experienced readers assess a plan mainly on…", options: ["The five-year projections", "The people and the model", "The size of the market", "The quality of the design"], answer: 1, explanation: "Projections will be wrong; people and model determine what happens when they are." },
    { id: "q-pln-2", lessonId: "l-pln-5", prompt: "Why build both a presentation deck and a reading deck?", options: ["Investors ask for two", "They do different jobs — one supports you speaking, one must stand alone", "To show effort", "One is for email, one is for print"], answer: 1, explanation: "Sending a presentation deck sends something incomprehensible; presenting a reading deck means reading slides aloud." },
    { id: "q-pln-3", lessonId: "l-pln-5", prompt: "The most credible way to present a projection is to…", options: ["Use conservative numbers", "State the assumption behind it", "Show three scenarios", "Cite an analyst report"], answer: 1, explanation: "Naming the assumption turns an argument about your number into a conversation about a premise — which you want." },

    { id: "q-sum-1", lessonId: "l-sum-4", prompt: "Roughly what share of new businesses are the high-growth type venture capital is designed for?", options: ["About a third", "About 15%", "About 3%", "About half"], answer: 2, explanation: "Around 70% are Main Street and about 17% supply-chain; roughly 3% are venture-shaped." },
    { id: "q-sum-2", lessonId: "l-sum-4", prompt: "The cost founders most often underestimate when sizing launch capital is…", options: ["Equipment", "Working capital until the business covers itself", "Legal fees", "Marketing"], answer: 1, explanation: "You pay staff and suppliers before customers pay you, and the gap has to be funded." },
    { id: "q-sum-3", lessonId: "l-sum-4", prompt: "Money from family should be documented mainly because…", options: ["Tax authorities require it", "It makes enforcement possible", "Everyone should remember the same conversation", "Investors will ask for it"], answer: 2, explanation: "The paper is not for enforcement. It records the terms and the acknowledgement that the money may be lost." },

    { id: "q-gro-1", lessonId: "l-gro-5", prompt: "A banker assessing 'can you repay' looks primarily at…", options: ["Profit", "Cash flow", "Revenue growth", "Market size"], answer: 1, explanation: "Debt is serviced from cash, not from accrual profit — and from historic numbers rather than projections." },
    { id: "q-gro-2", lessonId: "l-gro-5", prompt: "The matching principle says…", options: ["Match revenue to costs in the same period", "Fund short-lived assets with short money and long-lived assets with long money", "Match debt to equity one to one", "Match each loan to a specific customer"], answer: 1, explanation: "Funding an eighteen-month payoff from ninety-day money is how a profitable, growing business becomes insolvent." },
    { id: "q-gro-3", lessonId: "l-gro-5", prompt: "When you stress-test with EBIT halved, the thing that usually breaks first is…", options: ["Payroll", "A covenant", "The tax bill", "Supplier terms"], answer: 1, explanation: "Covenant breaches trigger consequences out of proportion to the miss, which is why they break before payments do." },

    { id: "q-vc-1", lessonId: "l-vc-5", prompt: "A venture fund's returns depend mainly on…", options: ["Steady returns across the portfolio", "The management fee", "Roughly one investment in fifteen producing an outsized outcome", "Avoiding losses"], answer: 2, explanation: "Most investments return little; the fund's result rests on the rare very large outcome. Every term follows from that." },
    { id: "q-vc-2", lessonId: "l-vc-5", prompt: "Compared with venture funds, angels…", options: ["Invest larger amounts less often", "Fund roughly sixteen times more companies", "Only invest after a Series A", "Require board seats"], answer: 1, explanation: "Angels write smaller cheques, decide faster, and back relationships and sectors they know personally." },
    { id: "q-vc-3", lessonId: "l-vc-5", prompt: "Where does control most often actually sit in a term sheet?", options: ["Board composition", "The protective provisions", "The valuation", "The option pool"], answer: 1, explanation: "The list of things you cannot do without consent determines more day-to-day control than board seats do." },

    { id: "q-sel-1", lessonId: "l-sel-4", prompt: "The most reliable signal in a discovery call is…", options: ["That they say it sounds interesting", "That they ask for a demo", "That they have already spent time or money trying to solve it", "That they introduce you to a colleague"], answer: 2, explanation: "A spreadsheet, a temp or a failed purchase demonstrates budget and intent. Compliments demonstrate politeness." },
    { id: "q-sel-2", lessonId: "l-sel-4", prompt: "'It is more than we expected' usually means…", options: ["They cannot afford it", "A competitor is cheaper", "The value has not been established", "They want a longer contract"], answer: 2, explanation: "Price objections come in kinds. This one is answered by re-establishing what their problem costs them." },
    { id: "q-sel-3", lessonId: "l-sel-4", prompt: "If you must move on price, you should…", options: ["Discount quickly to keep momentum", "Trade the reduction for something", "Offer a free trial instead", "Hold firm and lose the deal"], answer: 1, explanation: "A lower price for a longer term or a reference is an exchange. A lower price for nothing is a repricing." },

    { id: "q-ops-1", lessonId: "l-ops-4", prompt: "A profitable business runs out of cash because…", options: ["Profit was miscalculated", "Balance-sheet movements absorb cash the P&L does not show", "Costs rose", "Tax was underestimated"], answer: 1, explanation: "Slow-paying customers and stock bought ahead consume cash while profit still looks healthy." },
    { id: "q-ops-2", lessonId: "l-ops-4", prompt: "The weekly discipline of the thirteen-week forecast makes you…", options: ["More conservative", "A measurably better forecaster", "Less reliant on accountants", "Faster at invoicing"], answer: 1, explanation: "Correcting last week's guess against what happened confronts your own optimism at seven-day intervals." },
    { id: "q-ops-3", lessonId: "l-ops-4", prompt: "The honest test of an operating cadence is…", options: ["That the team likes it", "That it produces a report", "That it still runs in a week the founder is ill", "That it takes under an hour"], answer: 2, explanation: "A cadence that only happens because you remember to run it is a ceiling on how large the company can get." },

    { id: "q-met-1", lessonId: "l-met-4", prompt: "The most common error in calculating CAC is…", options: ["Including tool costs", "Leaving out sales and marketing salaries", "Using a quarterly period", "Counting trials as customers"], answer: 1, explanation: "Salaries are usually the largest component, and omitting them flatters the number in the direction you want." },
    { id: "q-met-2", lessonId: "l-met-4", prompt: "In a cohort retention curve, the thing to look for is…", options: ["The starting number", "Whether the curve flattens", "The average across cohorts", "The steepest month"], answer: 1, explanation: "A plateau means you have found people for whom the product genuinely works. A curve to zero is a leaky bucket." },
    { id: "q-met-3", lessonId: "l-met-4", prompt: "The point at which you should decide to raise, cut or change plan is…", options: ["Three months of runway", "Six months of runway", "Nine months of runway", "Twelve months of runway"], answer: 2, explanation: "At nine months all three options are still genuinely open. By six you are negotiating from weakness." },

    { id: "q-scl-1", lessonId: "l-scl-4", prompt: "Under growth, what typically breaks first?", options: ["The product", "The support functions — finance, hiring, support, compliance", "Pricing", "The customer relationship"], answer: 1, explanation: "Product usually holds longer than the functions around it, which is why the three questions ask about the organisation." },
    { id: "q-scl-2", lessonId: "l-scl-4", prompt: "Which should never be outsourced?", options: ["Payroll", "Infrastructure", "A customer-facing link", "Specialist compliance"], answer: 2, explanation: "You lose both the relationship and the information — including complaints, your cheapest research." },
    { id: "q-scl-3", lessonId: "l-scl-4", prompt: "The hardest step in the founder's transition is from…", options: ["Content to behaviours", "Behaviours to results", "Results to context", "Context to content"], answer: 1, explanation: "It requires tolerating work done worse than you would do it, in exchange for a company larger than you." },

    { id: "q-ai-1", lessonId: "l-ai-6", prompt: "Under the remove test, a product that STOPS when you turn the AI off is\u2026", options: ["AI-enabled", "AI-native", "Over-engineered", "A wrapper"], answer: 1, explanation: "Degrades = AI-enabled; stops = AI-native. Neither is better \u2014 only one is the claim you are making." },
    { id: "q-ai-2", lessonId: "l-ai-6", prompt: "A randomised trial of experienced developers using AI tooling found they were\u2026", options: ["20% faster, as they reported", "About the same", "19% slower, while believing they were faster", "Faster only on new code"], answer: 2, explanation: "They misjudged their own speed by roughly forty points, which is why uncontrolled hours-saved claims are unusable." },
    { id: "q-ai-3", lessonId: "l-ai-6", prompt: "The lethal trifecta is private data, untrusted content and\u2026", options: ["A large context window", "An outbound channel", "Tool access", "A weak system prompt"], answer: 1, explanation: "All three together make exfiltration possible by design. The fix is removing a leg, not a better prompt." },
    { id: "q-ext-1", lessonId: "l-ext-4", prompt: "The handbook insists you decide which first?", options: ["The mechanism", "The valuation", "The motivation", "The adviser"], answer: 2, explanation: "Different motivations lead to different buyers and timelines. Choosing the mechanism first produces regretted exits." },
    { id: "q-ext-2", lessonId: "l-ext-4", prompt: "Diligence mainly surfaces…", options: ["Problems nobody knew about", "Problems you knew about and had not fixed", "Accounting errors", "Competitor threats"], answer: 1, explanation: "Cheap to fix a year out; under signed exclusivity the same list becomes a price reduction." },
    { id: "q-ext-3", lessonId: "l-ext-4", prompt: "When a buyer states a valuation, the most useful question is…", options: ["Can you go higher?", "How did you derive it?", "Who else are you looking at?", "When can you close?"], answer: 1, explanation: "The derivation tells you what they think they are buying — and lets you argue the assumption rather than the number." },
];

/** Live mentor-led sessions, dated relative to today so the timetable is always alive. */
function at(daysFromNow: number, hour: number): string {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
}

/**
 * A session that is happening RIGHT NOW, whenever "now" is.
 *
 * The rest of the timetable is pinned to clock hours, which means a visitor
 * arriving at the wrong time of day sees a schedule and no way in — the live
 * classroom, the headline feature, reads as missing. One session always in
 * progress is what makes it demonstrable at 3am on a Sunday.
 */
function inProgress(startedMinAgo = 5): string {
    return new Date(Date.now() - startedMinAgo * 60000).toISOString();
}

export const LIVE_LESSONS: LiveLesson[] = [
    { id: "live-1", mentorId: "m-amara", categoryId: "start", title: "Opportunity clinic: bring one idea", description: "Send your ten market questions in advance. We take three ideas apart on screen and find the expensive unknown in each.", startsAt: at(-18, 16), durationMin: 60, joinUrl: "https://meet.example.com/startup-school/live-1" },
    { id: "live-2", mentorId: "m-mei", categoryId: "grow", title: "Office hours: your pricing conversation", description: "Bring the deal you are afraid to price. We rehearse the number, the silence afterwards, and the three kinds of pushback.", startsAt: inProgress(), durationMin: 45, joinUrl: "https://meet.example.com/startup-school/live-2" },
    { id: "live-3", mentorId: "m-padhang", categoryId: "grow", title: "Build a thirteen-week cash forecast, live", description: "We build one from a blank sheet using a real set of numbers, then roll it forward a week so you can see the correction.", startsAt: at(3, 13), durationMin: 60, joinUrl: "https://meet.example.com/startup-school/live-3" },
    { id: "live-4", mentorId: "m-zakir", categoryId: "start", title: "Founder agreement clinic", description: "The six terms, why each one ends companies when left undiscussed, and what to take to counsel in your jurisdiction.", startsAt: at(6, 17), durationMin: 50, joinUrl: "https://meet.example.com/startup-school/live-4" },
    { id: "live-5", mentorId: "m-amara", categoryId: "fund", title: "Read a term sheet with me", description: "A real, anonymised sheet. We go clause by clause and model what each one does to the founders at three exit prices.", startsAt: at(9, 12), durationMin: 75, joinUrl: "https://meet.example.com/startup-school/live-5" },
    { id: "live-6", mentorId: "m-bayu", categoryId: "grow", title: "The handover: managing results, not work", description: "For founders stuck between behaviours and results. Bring the task you cannot stop doing yourself.", startsAt: at(-5, 15), durationMin: 90, joinUrl: "https://meet.example.com/startup-school/live-6" },
];

export const GROUPS: Group[] = [
    { id: "g-cohort", name: "This Cohort", categoryId: "start", blurb: "Everyone who started this month. Weekly check-in: what moved, what is stuck, what you are asking for.", members: 214, imageUrl: IMG + "group-cohort.jpg" },
    { id: "g-idea", name: "Idea Clinic", categoryId: "start", blurb: "Post the problem you think you have found. Get the ten questions asked back at you, hard but kindly.", members: 1180, imageUrl: IMG + "group-idea.jpg" },
    { id: "g-raise", name: "Raising Right Now", categoryId: "fund", blurb: "Founders mid-raise comparing notes on terms, timelines and who actually replied. No introductions brokered here.", members: 640, imageUrl: IMG + "group-raise.jpg" },
    { id: "g-sales", name: "Founder-Led Sales", categoryId: "grow", blurb: "Call recordings, objection handling and the pricing conversations that went badly. Especially those.", members: 905, imageUrl: IMG + "group-sales.jpg" },
    { id: "g-numbers", name: "The Numbers", categoryId: "grow", blurb: "Cash forecasts, cohort tables and arguments about how to calculate CAC properly.", members: 508, imageUrl: IMG + "group-numbers.jpg" },
];

/**
 * Mentor availability — weekly wall-clock rules, plus overrides.
 *
 * Times are in each mentor's OWN zone (see `Mentor.timezone`), never UTC, so a
 * daylight-saving change moves nothing. `onDate` marks an override: same row
 * shape as the weekly rule, which is what keeps the model small enough to hold
 * in your head.
 */
export const AVAILABILITY: AvailabilityRule[] = [
    // Leonardo — London, Tue/Thu afternoons.
    { id: "av-leo-1", mentorId: "m-leonardo", weekday: 2, onDate: null, startTime: "14:00", endTime: "17:00", closed: false },
    { id: "av-leo-2", mentorId: "m-leonardo", weekday: 4, onDate: null, startTime: "14:00", endTime: "17:00", closed: false },
    // Amara — Lagos, three mornings; she keeps Friday for her own portfolio.
    { id: "av-ama-1", mentorId: "m-amara", weekday: 1, onDate: null, startTime: "09:00", endTime: "12:00", closed: false },
    { id: "av-ama-2", mentorId: "m-amara", weekday: 3, onDate: null, startTime: "09:00", endTime: "12:00", closed: false },
    { id: "av-ama-3", mentorId: "m-amara", weekday: 4, onDate: null, startTime: "15:00", endTime: "18:00", closed: false },
    // Padhang — Jakarta, early evenings so Europe can reach him.
    { id: "av-pad-1", mentorId: "m-padhang", weekday: 1, onDate: null, startTime: "18:00", endTime: "21:00", closed: false },
    { id: "av-pad-2", mentorId: "m-padhang", weekday: 3, onDate: null, startTime: "18:00", endTime: "21:00", closed: false },
    // Mei — New York, Mon/Wed/Fri late mornings.
    { id: "av-mei-1", mentorId: "m-mei", weekday: 1, onDate: null, startTime: "10:00", endTime: "13:00", closed: false },
    { id: "av-mei-2", mentorId: "m-mei", weekday: 3, onDate: null, startTime: "10:00", endTime: "13:00", closed: false },
    { id: "av-mei-3", mentorId: "m-mei", weekday: 5, onDate: null, startTime: "10:00", endTime: "12:00", closed: false },
    // Bayu — London, one long Wednesday. Hour-long sessions, a day's notice.
    { id: "av-bay-1", mentorId: "m-bayu", weekday: 3, onDate: null, startTime: "13:00", endTime: "18:00", closed: false },
];

export const CATALOGUE: Catalogue = {
    categories: FINAL_CATEGORIES,
    mentors: MENTORS,
    courses: FINAL_COURSES,
    modules: FINAL_MODULES,
    lessons: FINAL_LESSONS,
    lessonBlocks: FINAL_LESSON_BLOCKS,
    quiz: FINAL_QUIZ,
    liveLessons: LIVE_LESSONS,
    groups: GROUPS,
    availability: AVAILABILITY,
};
export { FINAL_CATEGORIES as CATEGORIES, FINAL_COURSES as COURSES, FINAL_MODULES as MODULES, FINAL_LESSONS as LESSONS, FINAL_LESSON_BLOCKS as LESSON_BLOCKS, FINAL_QUIZ as QUIZ };

// ---------------------------------------------------------------------------
// The demo founder. Tobi is six weeks in: an idea she has stopped being certain
// about, a cash forecast she built last week, and a pricing conversation
// tomorrow she is dreading.
// ---------------------------------------------------------------------------

export const DEMO_FRIENDS: Friend[] = [
    { id: "f-bagas", name: "Bagas Mahpie", hue: "plum", photoUrl: IMG + "friend-bagas.jpg", label: "Cohort" },
    { id: "f-dandy", name: "Sir Dandy", hue: "sky", photoUrl: IMG + "friend-dandy.jpg", label: "Previous cohort" },
    { id: "f-jhon", name: "Jhon Tosan", hue: "peach", photoUrl: IMG + "friend-jhon.jpg", label: "Cohort" },
];

function daysAgo(n: number, hour = 19): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
}

/**
 * Two sessions for the demo founder: one behind him with notes and an open
 * action, one ahead.
 *
 * Both land on a real availability rule (Amara's Wednesday morning in Lagos,
 * Mei's Monday in New York) rather than an arbitrary time, so the booking the
 * demo shows is one the slot grid would actually have offered.
 */
function demoBookings(): Booking[] {
    /** The next (or most recent) `weekday` at `hourUtc`, as an instant. */
    const nearest = (weekday: number, hourUtc: number, forward: boolean): Date => {
        const d = new Date();
        d.setUTCHours(hourUtc, 0, 0, 0);
        const delta = (weekday - d.getUTCDay() + 7) % 7;
        d.setUTCDate(d.getUTCDate() + (forward ? (delta === 0 ? 7 : delta) : delta - 7));
        return d;
    };
    // Amara keeps Wednesdays 09:00 Lagos; Lagos is UTC+1 all year (no DST).
    const past = nearest(3, 8, false);
    // Mei's Monday 10:00 New York.
    const next = nearest(1, 14, true);
    return [
        {
            id: "bk-past", mentorId: "m-amara",
            startsAt: past.toISOString(), endsAt: new Date(past.getTime() + 30 * 60000).toISOString(),
            bookedTz: "Africa/Lagos", status: "completed",
            agenda: "Ten market questions — which one would I bet the year on?",
            sharedNotes: "Test the 'they already pay someone to do this' answer first. Twelve interviews, ask what they spent last year, not whether they would pay.",
            cancelReason: "", createdAt: new Date(past.getTime() - 5 * 86400000).toISOString(),
        },
        {
            id: "bk-next", mentorId: "m-mei",
            startsAt: next.toISOString(), endsAt: new Date(next.getTime() + 45 * 60000).toISOString(),
            bookedTz: "Africa/Lagos", status: "confirmed",
            agenda: "The neighbourhood essentials pilot — five shops, and I keep wanting to say a small number.",
            sharedNotes: "", cancelReason: "", createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        },
    ];
}

/** Action items carried out of the demo founder's last session. */
export function demoBookingActions(bookingId: string): BookingAction[] {
    if (bookingId !== "bk-past") return [];
    const ago = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
    return [
        { id: "ba-1", bookingId, body: "Interview three busy households — ask what a failed grocery run cost them last month", doneAt: null, createdAt: ago(5) },
        { id: "ba-2", bookingId, body: "Re-run breakeven at three prices", doneAt: ago(2), createdAt: ago(5) },
        { id: "ba-3", bookingId, body: "Write down which of the ten answers I would bet the year on", doneAt: null, createdAt: ago(5) },
    ];
}

/**
 * Tobi's venture record.
 *
 * Written to agree with everything else in the demo — the CornerCart households in
 * his tasks, the WhatsApp-order note, the five-shop pilot he is afraid to
 * price. A venture record that contradicted the rest of the seed would be worse
 * than none, because every AI surface in the app reads this one object.
 *
 * Note what the claims do: two of his six are marked `guess`, and one of those
 * is the thing his whole model rests on. That is the record doing its job.
 */
function demoVenture(): Venture {
    const sec = (body: string, claims: VentureClaim[], days: number): VentureSection => ({
        body, claims, updatedAt: daysAgo(days),
    });
    const c = (id: string, text: string, confidence: VentureConfidence, test: string): VentureClaim =>
        ({ id, text, confidence, test });

    return {
        name: "CornerCart",
        oneLiner: "A trusted way for busy Nigerian households to order everyday essentials from nearby shops for pickup or delivery.",
        stage: "model",
        path: "build",
        country: "Nigeria",
        updatedAt: daysAgo(1),
        sections: {
            founder: sec(
                "Six years helping my family's neighbourhood shop buy stock and manage WhatsApp orders, so I know where a simple shopping list falls apart. I have never sold a service to households. That is the gap.",
                [
                    c("vc-1", "I can win the first fifty households myself", "guess",
                      "Get ten households to place a second paid basket without an introduction from someone I already know."),
                    c("vc-2", "I can run the first pilot without hiring a full team", "proven",
                      "Already true — five households have completed assisted orders over the last month."),
                ],
                12,
            ),
            opportunity: sec(
                "Busy households in Lagos who buy weekly essentials from nearby shops. Today it is a rushed store run or several WhatsApp messages, then a phone call when an item is missing. It works until a long list, traffic or a substitution turns a simple basket into an hour-long task.",
                [
                    c("vc-3", "An incomplete or delayed grocery run costs a household at least an hour each week", "evidence",
                      "Six households described a version of this. Ask three to log their next shopping trip."),
                    c("vc-4", "They will pay a clear convenience fee for a reliable complete basket", "guess",
                      "Offer the next five a paid basket with the fee shown before they confirm."),
                ],
                6,
            ),
            model: sec(
                "A clear fee on each completed basket, with delivery passed through where needed. We are deliberately not becoming a giant catalogue — the trusted nearby shop and a reliably complete list are the reason to use us.",
                [
                    c("vc-5", "A fixed service fee is clearer than a merchant commission here", "guess",
                      "Show both options to the five pilot shops and compare the objections."),
                    c("vc-6", "Staying focused on repeat essentials is a strength, not a gap", "evidence",
                      "Five households reordered the same staples before asking for wider catalogue options."),
                ],
                1,
            ),
            asks: sec(
                "Pricing the five-shop neighbourhood pilot. I keep wanting to say a small number and I cannot tell whether that is discipline or nerves.",
                [],
                0,
            ),
        },
    };
}

export function demoUserState(): UserState {
    const done = (lessonId: string, days: number): { lessonId: string; positionSec: number; completedAt: string; updatedAt: string } => ({
        lessonId, positionSec: 0, completedAt: daysAgo(days), updatedAt: daysAgo(days),
    });
    const sessions = [
        { id: "s1", lessonId: "c-market-l-2", minutes: 32, occurredAt: daysAgo(0, 8) },
        { id: "s2", lessonId: "c-sales-l-1", minutes: 24, occurredAt: daysAgo(1) },
        { id: "s3", lessonId: "c-market-l-1", minutes: 28, occurredAt: daysAgo(2) },
        { id: "s4", lessonId: "c-finance-l-2", minutes: 19, occurredAt: daysAgo(3) },
        { id: "s5", lessonId: "c-opportunity-l-2", minutes: 14, occurredAt: daysAgo(4) },
        { id: "s6", lessonId: "c-opportunity-l-1", minutes: 45, occurredAt: daysAgo(7) },
        { id: "s7", lessonId: "c-opportunity-l-3", minutes: 30, occurredAt: daysAgo(9) },
        { id: "s8", lessonId: "c-market-l-3", minutes: 26, occurredAt: daysAgo(11) },
        { id: "s9", lessonId: "c-finance-l-1", minutes: 50, occurredAt: daysAgo(13) },
        { id: "s10", lessonId: "c-sales-l-2", minutes: 41, occurredAt: daysAgo(16) },
        { id: "s11", lessonId: "c-market-l-4", minutes: 22, occurredAt: daysAgo(20) },
        { id: "s12", lessonId: "c-business-model-l-1", minutes: 35, occurredAt: daysAgo(24) },
        { id: "s13", lessonId: "c-opportunity-l-1", minutes: 18, occurredAt: daysAgo(27) },
    ];
    return {
        profile: {
            id: "demo-tobi",
            email: "tobi@startupschool.example",
            name: "Tobi Adeyemi",
            handle: "tobi",
            hue: "lilac",
            photoUrl: IMG + "learner-tobi.jpg",
            headline: "Six weeks in · local essentials ordering",
            weeklyGoalMin: 300,
            interests: ["start", "fund", "grow"],
            onboarded: true,
            createdAt: daysAgo(44),
        },
        friends: DEMO_FRIENDS,
        enrollments: [
            { courseId: "c-opportunity", enrolledAt: daysAgo(30), completedAt: daysAgo(9), lastLessonId: "c-opportunity-final" },
            { courseId: "c-market", enrolledAt: daysAgo(26), completedAt: null, lastLessonId: "c-market-l-5" },
            { courseId: "c-sales", enrolledAt: daysAgo(18), completedAt: null, lastLessonId: "c-sales-l-2" },
            { courseId: "c-finance", enrolledAt: daysAgo(14), completedAt: null, lastLessonId: "c-finance-l-2" },
            { courseId: "c-business-model", enrolledAt: daysAgo(24), completedAt: null, lastLessonId: "c-business-model-l-1" },
            { courseId: "c-brand", enrolledAt: daysAgo(10), completedAt: null, lastLessonId: null },
            { courseId: "c-mvp", enrolledAt: daysAgo(8), completedAt: null, lastLessonId: null },
            { courseId: "c-marketing", enrolledAt: daysAgo(5), completedAt: null, lastLessonId: null },
        ],
        progress: [
            done("c-opportunity-l-1", 27), done("c-opportunity-l-2", 20), done("c-opportunity-l-3", 13), done("c-opportunity-l-4", 9),
            done("c-opportunity-l-5", 8), done("c-opportunity-l-6", 8), done("c-opportunity-l-7", 8), done("c-opportunity-l-8", 8),
            done("c-opportunity-final", 9),
            done("c-market-l-1", 24), done("c-market-l-2", 19), done("c-market-l-3", 11), done("c-market-l-4", 6),
            { lessonId: "c-market-l-5", positionSec: 0, completedAt: null, updatedAt: daysAgo(0, 8) },
            done("c-sales-l-1", 16),
            { lessonId: "c-sales-l-2", positionSec: 0, completedAt: null, updatedAt: daysAgo(1) },
            done("c-finance-l-1", 13),
            { lessonId: "c-finance-l-2", positionSec: 0, completedAt: null, updatedAt: daysAgo(3) },
            { lessonId: "c-business-model-l-1", positionSec: 0, completedAt: null, updatedAt: daysAgo(24) },
        ],
        sessions,
        bookmarks: ["c-growth", "c-marketing"],
        follows: ["m-amara"],
        tasks: [
            { id: "t1", title: "Interview three busy households — ask what a failed grocery run cost them", courseId: "c-market", dueAt: daysAgo(-1, 18), doneAt: null, createdAt: daysAgo(3) },
            { id: "t2", title: "Re-run breakeven at three prices", courseId: "c-finance", dueAt: daysAgo(0, 20), doneAt: null, createdAt: daysAgo(2) },
            { id: "t3", title: "Write the sentence saying what we are deliberately not", courseId: "c-business-model", dueAt: daysAgo(-3, 18), doneAt: null, createdAt: daysAgo(4) },
            { id: "t4", title: "Build the first thirteen-week forecast", courseId: "c-finance", dueAt: daysAgo(2, 18), doneAt: daysAgo(2, 21), createdAt: daysAgo(6) },
            { id: "t5", title: "Bring the neighbourhood pilot to Mei's pricing office hours", courseId: null, dueAt: daysAgo(-5, 12), doneAt: null, createdAt: daysAgo(1) },
        ],
        notes: [
            { id: "n1", lessonId: "c-market-l-1", atSec: null, body: "Their workaround is a rushed store run plus WhatsApp messages. Free, installed, and they are not unhappy about it. That is the thing to beat.", createdAt: daysAgo(24) },
            { id: "n2", lessonId: "c-sales-l-1", atSec: null, body: "Stop asking whether they would use it. Ask what happened the last time a grocery list came back incomplete or late.", createdAt: daysAgo(16) },
        ],
        groupIds: ["g-cohort", "g-idea"],
        conversations: [
            { id: "cv-1", peerKind: "mentor", peerId: "m-mei", peerName: "Mei Tanaka", peerRole: "Mentor", peerHue: "plum", lastBody: "Bring it tomorrow and say the number out loud once before you say it to them. That is the whole trick.", updatedAt: daysAgo(0, 9), unread: 1 },
            { id: "cv-2", peerKind: "friend", peerId: "f-bagas", peerName: "Bagas Mahpie", peerRole: "Cohort", peerHue: "plum", lastBody: "Did your breakeven come out as ugly as mine? I need 340 customers a month and I have four.", updatedAt: daysAgo(1, 22), unread: 1 },
            { id: "cv-3", peerKind: "mentor", peerId: "m-amara", peerName: "Amara Osei", peerRole: "Mentor", peerHue: "lilac", lastBody: "Good. Now which of those ten answers would you bet the year on? That is the one to test first.", updatedAt: daysAgo(4, 11), unread: 0 },
            { id: "cv-4", peerKind: "friend", peerId: "f-dandy", peerName: "Sir Dandy", peerRole: "Previous cohort", peerHue: "sky", lastBody: "We closed the raise. The protective provisions were the bit I nearly missed — read that section twice.", updatedAt: daysAgo(8, 20), unread: 0 },
        ],
        notifications: [
            { id: "nt-1", kind: "message", title: "Mei Tanaka replied", body: "Bring it tomorrow and say the number out loud once…", href: "/inbox/cv-1", readAt: null, createdAt: daysAgo(0, 9) },
            { id: "nt-2", kind: "streak", title: "5-day streak", body: "Five days in a row. One more today keeps it alive.", href: "/progress", readAt: null, createdAt: daysAgo(0, 7) },
            { id: "nt-3", kind: "live", title: "Pricing office hours starting", body: "Mei's session is live now — bring the deal you are afraid to price.", href: "/lessons", readAt: null, createdAt: daysAgo(0, 6) },
            { id: "nt-4", kind: "task", title: "Task due today", body: "Re-run breakeven at three prices", href: "/tasks", readAt: daysAgo(0, 8), createdAt: daysAgo(0, 6) },
            { id: "nt-5", kind: "certificate", title: "Founder fit — complete", body: "Your certificate is ready.", href: "/progress", readAt: daysAgo(1), createdAt: daysAgo(9, 15) },
        ],
        attempts: [
            { id: "qa-1", lessonId: "c-opportunity-final", score: 5, total: 5, createdAt: daysAgo(9) },
            { id: "qa-2", lessonId: "c-market-final", score: 3, total: 5, createdAt: daysAgo(6) },
        ],
        certificates: [{ id: "cert-1", courseId: "c-opportunity", code: "SS-OPPORTUNITY-2026-0412", issuedAt: daysAgo(9) }],
        rsvps: ["live-2", "live-5"],
        attendance: [],
        bookings: demoBookings(),
        venture: demoVenture(),
        experiments: [
            {
                id: "exp-1", claimId: "vc-4", sectionId: "opportunity", title: "Show the convenience fee before checkout",
                hypothesis: "Busy households will pay a visible convenience fee for a reliable complete basket.",
                method: "Offer five households a paid basket with the fee displayed before they confirm.",
                threshold: "At least 3 of 5 households complete a paid order without a personal discount.",
                status: "running", evidenceType: "payment", evidence: "Two households accepted the fee after seeing a complete basket promise.",
                sourceUrl: "", result: "", decision: "", nextStep: "Run the remaining three offers by Friday.",
                dueAt: daysAgo(-2, 18), createdAt: daysAgo(3), updatedAt: daysAgo(0),
            },
            {
                id: "exp-2", claimId: "vc-5", sectionId: "model", title: "Compare a fixed fee with merchant commission",
                hypothesis: "A fixed service fee will create less friction than a merchant commission.",
                method: "Show both commercial options to five nearby shops and record the objection verbatim.",
                threshold: "Three shop owners can explain and accept the fixed-fee option without negotiation.",
                status: "planned", evidenceType: null, evidence: "", sourceUrl: "", result: "", decision: "", nextStep: "",
                dueAt: daysAgo(-4, 18), createdAt: daysAgo(1), updatedAt: daysAgo(1),
            },
        ] satisfies Experiment[],
    };
}

/** The demo conversation history, keyed by conversation id. */
export function demoMessages(conversationId: string): { fromMe: boolean; body: string; createdAt: string }[] {
    const M = (fromMe: boolean, body: string, d: number, h = 12) => ({ fromMe, body, createdAt: daysAgo(d, h) });
    switch (conversationId) {
        case "cv-1":
            return [
                M(true, "Mei — I have five nearby shops ready for a CornerCart pilot. I have no idea what to charge and I keep wanting to say a small number.", 1, 21),
                M(false, "What does an incomplete or delayed grocery run cost households now? Start there, not from your costs.", 1, 21),
                M(true, "They said a long shopping run easily takes an hour, and missing essentials mean a second trip or another delivery fee.", 0, 8),
                M(false, "Bring it tomorrow and say the number out loud once before you say it to them. That is the whole trick.", 0, 9),
            ];
        case "cv-2":
            return [
                M(false, "Did your breakeven come out as ugly as mine? I need 340 customers a month and I have four.", 1, 22),
                M(true, "Mine said 180. Then I ran it at double the price and it said 71, which was an uncomfortable afternoon.", 1, 22),
            ];
        case "cv-3":
            return [
                M(true, "Ten questions answered. Six of them I am confident about, four are guesses dressed up.", 5, 10),
                M(false, "Good. Now which of those ten answers would you bet the year on? That is the one to test first.", 4, 11),
            ];
        case "cv-4":
            return [
                M(false, "We closed the raise. The protective provisions were the bit I nearly missed — read that section twice.", 8, 20),
                M(true, "Noted. I am still four courses away from needing it, but noted.", 8, 20),
            ];
        default:
            return [];
    }
}

/** Seed posts for the cohort groups, dated relative to today. */
export function demoGroupPosts(groupId: string): Omit<import("./types").GroupPost, "id" | "mine">[] {
    const P = (authorName: string, authorHue: import("./format").Hue, body: string, d: number, h = 14) => ({ groupId, authorName, authorHue, body, createdAt: daysAgo(d, h) });
    switch (groupId) {
        case "g-cohort":
            return [
                P("Bagas Mahpie", "plum", "Week 6 check-in. Moved: twelve interviews done. Stuck: two of them said they would pay and then stopped replying. Asking for: how hard do you chase?", 1, 9),
                P("Mei Tanaka", "plum", "Chase twice, then put them in a 'revisit in 90 days' list and forget them. The ones who go quiet after enthusiasm are almost never budget — they are almost always not the decision-maker.", 1, 16),
                P("Jhon Tosan", "peach", "Reran my breakeven after the lesson and it was so bad I closed the laptop. Opened it again. Price was the problem, not the market.", 2, 20),
            ];
        case "g-idea":
            return [
                P("Amara Osei", "lilac", "Reminder on the ten questions: the confidence column is not decoration. If everything is marked 'high', you have not been honest and the grid will not help you.", 1, 15),
                P("Sofia R.", "peach", "Problem: freelance bookkeepers lose hours chasing receipts from clients. Current workaround: WhatsApp and nagging. Is 'nagging' a competitor?", 2, 11),
                P("Leonardo Samsul", "mint", "Yes, and a strong one — it is free and it works about 70% of the time. Your question is what the last 30% costs them.", 2, 12),
            ];
        case "g-raise":
            return [P("Sir Dandy", "sky", "Closed last week. Two things I would tell past me: get your own valuation first, and read the protective provisions before the board composition. Everyone warned me about the second one and it was the first that mattered.", 3, 10)];
        case "g-sales":
            return [P("Mei Tanaka", "plum", "This week's exercise: record one call, then count how many seconds you talked after saying your price. Post the number, not the recording.", 4, 13)];
        case "g-numbers":
            return [P("Padhang Satrio", "sky", "Monthly argument about CAC: if a customer arrives through word of mouth, they still go in the denominator. Excluding them makes the number prettier and useless.", 5, 17)];
        default:
            return [];
    }
}
