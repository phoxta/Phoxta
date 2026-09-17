import type { Tool } from "../types";

// Stage 6 - Launch and operate.
// The handbook has no chapter on sales, marketing, hiring or day-to-day
// operations, so every tool here comes from the 2026 layer: S01 (sales),
// S02 (marketing), S03 (hiring and people), S04 (operations) and
// S05 (metrics and unit economics).
//
// This is the stage where a business either starts paying for itself or
// quietly stops. The numbers are deliberately uncomfortable.

// ---------------------------------------------------------------- sales

const ICP_BUILDER: Tool = {
    id: "icp-builder",
    slug: "icp-builder",
    stage: "operate",
    kind: "worksheet",
    title: "ICP and trigger builder",
    blurb:
        "Who buys, who inside them owns the pain, and what event makes it urgent this quarter. Every other sales tool depends on this one.",
    ref: "modern/S01-sales.md",
    basedOn: "Pete Kazanjy, Founding Sales; SPICED (Winning by Design); The Mom Test",
    spec: {
        intro:
            "Kazanjy writes the ideal customer profile as three nested answers: which companies, who inside them, and what makes it urgent now. The third one is the one founders skip, and it is the one that decides whether a deal closes or dies in no decision. Write this from customers you have actually spoken to, not from a market you imagine. In the Ebsta and Pavilion dataset of 655,000 opportunities, the top sellers were 55% better at discovery and 24% more likely to walk away from a deal outside the profile early, and teams that held the line on the profile saw quota attainment 90% higher.",
        rows: [
            {
                id: "companies",
                label: "Which companies have paid you, piloted with you, or leaned in hardest?",
                help:
                    "Size, sector, tools they already run, region, how they are funded. Narrow it until it feels uncomfortable. A list you can count is worth more than a market you can only estimate.",
                placeholder:
                    "e.g. UK and Nigerian clinics with 3 to 10 practitioners, already paying for a booking tool they complain about",
                wantsEvidence: true,
            },
            {
                id: "not-for",
                label: "Who is this explicitly not for?",
                help:
                    "Name the disqualifiers you will act on: too small, wrong stack, no budget holder, needs something you will not build. If you cannot say no early, you will spend the year on deals that end in no decision.",
                placeholder: "e.g. single-person practices, anyone who needs on-premise hosting",
            },
            {
                id: "buying-group",
                label: "Inside that company, who owns the pain, who signs, who blocks, who uses it?",
                help:
                    "Four different people in most businesses, and often four different arguments. Deals where the economic buyer is in the room early win 55% more often.",
                placeholder: "Owns the pain: ... | Signs: ... | Blocks: ... | Uses it daily: ...",
                wantsEvidence: true,
            },
            {
                id: "trigger",
                label: "What event makes this urgent this quarter rather than next year?",
                help:
                    "A funding round, a new hire in the role, a launch, a missed number, a regulation date, a contract renewal, a system that finally broke. This is the critical event in SPICED. Without one, the honest forecast is no decision.",
                placeholder: "e.g. their current contract renews in March, or they just hired their first ops manager",
                wantsEvidence: true,
            },
            {
                id: "detect",
                label: "How would you detect that trigger from the outside, at scale?",
                help:
                    "Job posts, funding news, planning applications, app-store updates, a change on their site, a question in a community. If you cannot detect it, your outreach is timing-blind and you are relying on luck.",
                placeholder: "e.g. watch for the job title appearing on their careers page",
            },
            {
                id: "alternatives",
                label: "What do they do today instead, including doing nothing?",
                help:
                    "Spreadsheets, an intern, a competitor, or living with it. Doing nothing is the most common answer and the most common competitor: 40 to 60% of lost deals end in no decision, not in a rival win.",
                placeholder: "e.g. two spreadsheets and a WhatsApp group, updated by the owner at midnight",
                wantsEvidence: true,
            },
            {
                id: "impact",
                label: "What does the problem cost them, in their numbers, not yours?",
                help:
                    "Money, hours, risk, lost customers. If they cannot put a number on it, you have a nice-to-have and your pricing conversation will be brutal.",
                placeholder: "e.g. about 6 hours a week of the owner's time, and 1 in 10 bookings lost",
                wantsEvidence: true,
            },
            {
                id: "lost",
                label: "Who said no, and what was the real reason?",
                help:
                    "Write the reason they gave and the reason you believe. The gap between the two is usually where your profile is wrong.",
                placeholder: "e.g. said 'too expensive', actually had no one to own the rollout",
            },
            {
                id: "accounts",
                label: "Name 75 to 100 specific accounts or people who fit. Where does the list come from?",
                help:
                    "Kazanjy's prospecting base before you hire anyone. Source it from your own network, advisors, communities and warm introductions before you touch cold channels. If you cannot build the list, the profile is still too vague.",
                placeholder: "e.g. 40 from the trade association directory, 25 from my last employer, 20 from the Slack group",
                wantsEvidence: true,
            },
            {
                id: "proof",
                label: "What proof do you have that this specific type of buyer gets a result?",
                help:
                    "One named outcome with a number beats five logos. Bessemer's advice is to win at least one of your first customers from a total skeptic, because that is the one who tests whether the argument works without your charm.",
                placeholder: "e.g. clinic X cut no-shows from 18% to 7% in six weeks",
                wantsEvidence: true,
            },
        ],
    },
};

const PIPELINE_CALCULATOR: Tool = {
    id: "pipeline-calculator",
    slug: "pipeline-calculator",
    stage: "operate",
    kind: "calculator",
    title: "Reverse pipeline calculator",
    blurb:
        "Work backwards from the revenue you need to the number of conversations you have to hold this week. Most plans die here.",
    ref: "modern/S01-sales.md",
    basedOn: "Ebsta x Pavilion 2025 GTM Benchmarks; Kazanjy's founder-led funnel",
    featured: true,
    spec: {
        fields: [
            {
                id: "revenueTarget",
                label: "New revenue you need in the next 12 months",
                help: "New business only, in your own currency. Do not include renewals or expansion from customers you already have.",
                default: 250000,
                min: 0,
                step: 1000,
            },
            {
                id: "dealSize",
                label: "Average value of one deal, first year",
                help: "What one customer pays you in their first 12 months. If you do not know it yet, use the price you most recently charged, not the price you hope to charge.",
                default: 12000,
                min: 0,
                step: 500,
            },
            {
                id: "winRate",
                label: "Win rate on qualified opportunities",
                unit: "%",
                help: "Of the deals that reach a real opportunity, what share do you close? Count no-decision as a loss, because it is one.",
                default: 19,
                min: 1,
                max: 100,
                step: 1,
            },
            {
                id: "meetingRate",
                label: "Meetings that become real opportunities",
                unit: "%",
                help: "Of first meetings you hold, what share turn into a qualified opportunity with a budget holder and a reason to decide?",
                default: 35,
                min: 1,
                max: 100,
                step: 1,
            },
            {
                id: "cycleDays",
                label: "Sales cycle, first meeting to signature",
                unit: "days",
                help: "How long a deal takes once the first meeting happens. This is why the plan is tighter than it looks: a meeting held in month 11 does not become revenue this year.",
                default: 84,
                min: 1,
                max: 540,
                step: 1,
            },
        ],
        outputs: [
            {
                id: "dealsNeeded",
                label: "Deals you must close",
                formula: "revenue target / average deal size",
                format: "number",
                help:
                    "If this number is in the hundreds, you are running a high-velocity or self-serve business whether you meant to or not, and a one-by-one sales motion will not get you there.",
            },
            {
                id: "oppsNeeded",
                label: "Qualified opportunities you must create",
                formula: "deals needed / win rate",
                format: "number",
                help:
                    "This is the number that punishes an optimistic win rate. Halve the win rate and this doubles.",
                benchmark: {
                    value: "19%",
                    context: "B2B win rate across 655,000 opportunities and $48B of pipeline, down from 29% in 2024",
                    source: "Ebsta x Pavilion, 2025 GTM Benchmarks",
                    year: 2025,
                    ref: "modern/S01-sales.md",
                },
            },
            {
                id: "coverage",
                label: "Pipeline coverage your win rate implies",
                formula: "(opportunities needed x deal size) / revenue target",
                format: "multiple",
                help:
                    "How much open pipeline you need for every unit of revenue. It is just the inverse of your win rate, which is exactly why win rate is the most expensive number to be wrong about.",
                benchmark: {
                    value: "5.3x",
                    context: "pipeline coverage required at 2025 win rates",
                    source: "Ebsta x Pavilion, 2025 GTM Benchmarks",
                    year: 2025,
                    ref: "modern/S01-sales.md",
                },
                good: (outputs) => outputs.coverage > 0 && outputs.coverage <= 5.3,
            },
            {
                id: "meetingsNeeded",
                label: "First meetings you must hold",
                formula: "opportunities needed / meeting-to-opportunity rate",
                format: "number",
                help:
                    "Every one of these is an hour of your life plus the hours it took to book. This is the real cost of the revenue plan.",
                benchmark: {
                    value: "42% / 36%",
                    context: "qualified lead to opportunity, SMB and mid-market vs enterprise; pooled from 40+ studies, not primary research",
                    source: "The Digital Bloom, B2B SaaS funnel benchmarks",
                    year: 2025,
                    ref: "modern/S01-sales.md",
                },
            },
            {
                id: "meetingsPerWeek",
                label: "First meetings per week, allowing for the cycle",
                formula: "meetings needed / max(1, 52 weeks - sales cycle in weeks)",
                format: "number",
                help:
                    "A meeting held later than 52 weeks minus your cycle cannot close inside the year, so the selling window is shorter than the year. Above about 10 a week, one founder cannot carry this plan: cut the target, raise the price, or change the motion.",
                good: (outputs) => outputs.meetingsPerWeek > 0 && outputs.meetingsPerWeek <= 10,
            },
        ],
        compute: (inputs) => {
            const target = inputs.revenueTarget || 0;
            const deal = inputs.dealSize || 0;
            const win = (inputs.winRate || 0) / 100;
            const meetingRate = (inputs.meetingRate || 0) / 100;
            const cycleDays = inputs.cycleDays || 0;

            const dealsNeeded = deal > 0 ? target / deal : 0;
            const oppsNeeded = win > 0 ? dealsNeeded / win : 0;
            const meetingsNeeded = meetingRate > 0 ? oppsNeeded / meetingRate : 0;
            const coverage = target > 0 ? (oppsNeeded * deal) / target : 0;
            const sellingWeeks = Math.max(1, 52 - cycleDays / 7);
            const meetingsPerWeek = meetingsNeeded / sellingWeeks;

            return { dealsNeeded, oppsNeeded, coverage, meetingsNeeded, meetingsPerWeek };
        },
        rule:
            "Two rules make this honest. First, use a win rate you have actually observed: the 2025 market average fell to 19%, so a plan built on 40% needs evidence. Second, a deal that passes 50 days is at risk, because win rates roughly halve beyond that point. If the meetings-per-week number is impossible, the answer is almost never 'work harder': it is a higher price, a narrower profile so fewer meetings are wasted, or a self-serve motion.",
    },
};

const SALES_HIRE_GATE: Tool = {
    id: "sales-hire-gate",
    slug: "sales-hire-gate",
    stage: "operate",
    kind: "quiz",
    title: "Should you hire a salesperson yet?",
    blurb:
        "The first sales hire is one of the most expensive mistakes a founder makes. Seven questions against the published readiness rules.",
    ref: "modern/S01-sales.md",
    basedOn: "Jason Lemkin (SaaStr); Mark Roberge, The Science of Scaling; Bessemer Atlas; Elena Verna",
    featured: true,
    spec: {
        questions: [
            {
                id: "closed",
                prompt: "How many customers have you personally closed?",
                group: "Evidence",
                help: "Founder-closed, start to finish. Deals a friend bought as a favour do not count.",
                options: [
                    { label: "None yet", score: 0 },
                    { label: "1 to 4", score: 1 },
                    { label: "5 to 9", score: 2 },
                    {
                        label: "10 to 19",
                        score: 3,
                        note: "This is the threshold SaaStr, Bessemer and Data Driven VC all name.",
                    },
                    { label: "20 or more", score: 4 },
                ],
            },
            {
                id: "playbook",
                prompt: "How much of the selling motion is written down?",
                group: "Evidence",
                help: "A rep cannot reverse-engineer what is in your head. If it is not written, you are hiring someone to guess.",
                options: [
                    { label: "Nothing is written", score: 0 },
                    { label: "A customer profile and some notes", score: 1 },
                    { label: "Discovery guide and demo script", score: 2 },
                    { label: "Add objection handling and pricing rules", score: 3 },
                    {
                        label: "Full playbook including the hand-off to support",
                        score: 4,
                        note: "Kazanjy's test: document first, then hire the executor.",
                    },
                ],
            },
            {
                id: "retention",
                prompt: "Do customers hit a defined retention event, and how many?",
                group: "Evidence",
                help:
                    "Roberge's definition of fit: P% of customers do event E within time T. Pick the event that predicts they stay, then measure it.",
                options: [
                    { label: "We have not defined one", score: 0 },
                    { label: "Defined, not measured", score: 1 },
                    { label: "Measured, under 60% hit it", score: 2 },
                    {
                        label: "60 to 80% hit it",
                        score: 3,
                        note: "This is the band Roberge says you may start pacing hires in.",
                    },
                    { label: "Over 80% hit it", score: 4 },
                ],
            },
            {
                id: "payback",
                prompt: "How long does it take to earn back what a customer costs to acquire?",
                group: "Economics",
                help: "Gross-margin months, not revenue months. If you do not know, the answer is the first option.",
                options: [
                    { label: "I do not know", score: 0 },
                    { label: "Over 18 months", score: 1 },
                    { label: "12 to 18 months", score: 2 },
                    { label: "6 to 12 months", score: 3 },
                    { label: "Under 6 months", score: 4 },
                ],
            },
            {
                id: "dealsize",
                prompt: "What does an average customer pay you in a year?",
                group: "Economics",
                help:
                    "A human seller costs real money and must return several times their cost. Verna calls the minimum deal size that justifies one the sales floor, around $10,000 a year equivalent.",
                options: [
                    {
                        label: "Well under the cost of a day of someone's time",
                        score: 0,
                        note: "Below the sales floor. Route these buyers to self-serve, not to a person.",
                    },
                    { label: "Roughly a few days of a professional's billed time", score: 1 },
                    { label: "About a month of a professional's cost", score: 2 },
                    { label: "A budgeted line item needing sign-off", score: 3 },
                    { label: "A capital-sized purchase with procurement", score: 4 },
                ],
            },
            {
                id: "budget",
                prompt: "Can you fund two sellers for twelve months?",
                group: "Readiness",
                help:
                    "Lemkin's rule: hire two, not one. With one rep you cannot tell whether the person failed or the process did. Ramp alone is about six months for an experienced seller.",
                options: [
                    { label: "No", score: 0 },
                    { label: "One, for six months", score: 1 },
                    { label: "One, for twelve months", score: 2 },
                    { label: "Two, for six months", score: 3 },
                    { label: "Two, for twelve months or more", score: 4 },
                ],
            },
            {
                id: "founder",
                prompt: "Will you stay on sales calls for three to six months after they start?",
                group: "Readiness",
                help:
                    "A hired rep becomes a buffer between you and the customer signal you still need. The founders who hand it over cleanly are the ones who stayed in the room while it transferred.",
                options: [
                    { label: "No, hiring is how I get out of selling", score: 0 },
                    { label: "A few calls, when asked", score: 1 },
                    { label: "Most calls for the first month", score: 2 },
                    { label: "Every deal for three months, then sampling", score: 4 },
                ],
            },
        ],
        bands: [
            {
                minPct: 75,
                label: "Hire two, now",
                verdict: "go",
                advice:
                    "You have the evidence the rules ask for. Hire two at once and compare them, not one. Interview about 30 people to find them, and pass on anyone who has not sold at your price point without a famous brand behind them. Pay partly on the retention event, not only on signature, and set 30-day and 90-day checkpoints before day one. If neither converts anything like you did by month three to six, the process is broken, not the people.",
            },
            {
                minPct: 40,
                label: "Not yet, and you can name what is missing",
                verdict: "learn",
                advice:
                    "Look at your lowest answers. If it is customers closed, keep selling: the target is 10 to 20 you closed yourself. If it is the playbook, write it while you sell, one page per stage. If it is the retention event, define it and instrument it this month, because hiring sellers on top of a leaky product just buys churn faster. Most founders reach the gate in two to three quarters by doing exactly this.",
            },
            {
                minPct: 0,
                label: "Stay founder-led, possibly for good",
                verdict: "stop",
                advice:
                    "Two different situations land here. If your average customer pays less than roughly ten thousand a year, a human seller will never repay their cost: your job is self-serve, onboarding and expansion, not a sales hire. If your deals are big enough but you have closed almost nothing yourself, you are one to two years early, and the hire will fail in a way that costs you a year and the signal you needed. Either way, the next move is more founder selling, not a job advert.",
            },
        ],
        caveat:
            "The evidence is unusually consistent here. Techstars' mentor guidance is that your first sales hire is probably a mistake and that founders should lead sales for one to two years. Bessemer, SaaStr and Data Driven VC all put the gate at 10 to 20 founder-closed customers plus a written playbook, and a head of sales at $1M to $2M of recurring revenue with two reps already at quota. Hiring a big-company VP early buys you 90 to 180 days of decks and headcount plans instead of closed deals.",
    },
};

// ------------------------------------------------------------ marketing

const CHANNEL_PICKER: Tool = {
    id: "channel-picker",
    slug: "channel-picker",
    stage: "operate",
    kind: "quiz",
    title: "Which one channel should you prove first?",
    blurb:
        "Most companies get the large majority of their customers from a single channel. Six questions to pick the one to test, and only one.",
    ref: "modern/S02-marketing.md",
    basedOn: "Weinberg & Mares, Traction (Bullseye); Elena Verna on growth-model evolution; Emily Kramer, MKT1",
    spec: {
        questions: [
            {
                id: "buyer",
                prompt: "Who actually pays you?",
                group: "Buyer",
                options: [
                    { label: "A consumer spending their own money", score: 0 },
                    { label: "A small business owner who also does everything else", score: 2 },
                    { label: "A manager with a budget line", score: 4 },
                    {
                        label: "A committee: a user, a budget holder, and a legal or procurement check",
                        score: 6,
                        note: "The more people who must agree, the more the channel has to be a conversation rather than an advert.",
                    },
                ],
            },
            {
                id: "price",
                prompt: "How big is one purchase?",
                group: "Price",
                help:
                    "Described in effort rather than currency, because the same amount is a different decision in London, Lagos and New York.",
                options: [
                    { label: "An impulse buy, made without asking anyone", score: 0 },
                    { label: "A considered personal purchase, worth sleeping on", score: 2 },
                    { label: "A cost a small business signs off the same day", score: 4 },
                    { label: "A budgeted purchase that needs a short business case", score: 6 },
                    {
                        label: "A large commitment with procurement, legal and a security review",
                        score: 8,
                        note: "At this size the channel is you, in a room, for months.",
                    },
                ],
            },
            {
                id: "where",
                prompt: "Where are these buyers already spending attention?",
                group: "Attention",
                options: [
                    { label: "Scrolling short-form video and social feeds", score: 0 },
                    { label: "In messaging apps and group chats", score: 1 },
                    { label: "On a marketplace, app store or platform where they already shop", score: 2 },
                    { label: "Searching, or asking an AI assistant, when the problem bites", score: 3 },
                    { label: "In an industry community, conference or professional network", score: 4 },
                ],
            },
            {
                id: "repeat",
                prompt: "How often does the same buyer buy again?",
                group: "Attention",
                options: [
                    { label: "Monthly, or several times a year", score: 0 },
                    { label: "About once a year", score: 1 },
                    { label: "Rarely, but they refer other people", score: 2 },
                    { label: "Once, and that is it", score: 3 },
                ],
            },
            {
                id: "list",
                prompt: "Could you name 75 to 100 specific people or companies who should buy?",
                group: "Reachability",
                help: "Named, findable and reachable. Not a segment, a list.",
                options: [
                    { label: "No, my buyers are anonymous and there are millions of them", score: 0 },
                    { label: "I could build a list, but they are hard to identify", score: 2 },
                    { label: "Yes, I could write that list this week", score: 4 },
                ],
            },
            {
                id: "budget",
                prompt: "What can you put into a channel test in the next 60 days?",
                group: "Budget",
                options: [
                    {
                        label: "A real budget, enough for several creatives and audiences",
                        score: 0,
                        note: "Paid is open to you. It is also the most inflated option: Meta CPMs are about 89% above 2020 levels.",
                    },
                    { label: "Enough for one small paid test", score: 1 },
                    { label: "A token amount", score: 2 },
                    { label: "Almost no cash, but 10 or more hours a week of my own time", score: 3 },
                ],
            },
        ],
        bands: [
            {
                minPct: 72,
                label: "Prove founder-led direct outreach first",
                verdict: "go",
                advice:
                    "Your buyers are nameable, expensive and answer to someone. Build the list of 75 to 100 accounts, exhaust warm introductions and communities first, and only then run cold outreach from a properly authenticated secondary domain warmed up over four to six weeks. Judge it on positive replies and meetings held, not opens. Do not add a second channel until this one is either producing a predictable number of meetings a week or clearly dead: in Traction's data most companies get over 70% of customers from one channel at any stage, and running six half-channels is how founders lose a year.",
            },
            {
                minPct: 55,
                label: "Prove one community or partner channel first",
                verdict: "go",
                advice:
                    "Your buyers gather somewhere specific, which means you can be useful in public instead of buying attention. Pick the single community, event series or partner whose members are most concentrated with your profile, show up weekly with something that helps whether or not they buy, and track how many conversations it starts. Give it a fixed test window and a kill threshold before you start. Only once it is repeatably producing conversations do you add a second channel, and expect to add one roughly every 18 months as the first one decays.",
            },
            {
                minPct: 40,
                label: "Prove content that answers the buying question first",
                verdict: "go",
                advice:
                    "Your buyers go looking when the problem bites, so the job is to be the answer they find, and increasingly the answer they are told. Write the ten questions a buyer types before they are ready to buy, answer each one completely on a page with first-hand data, a named author and a direct answer in the first 200 words, and check who is currently cited for those prompts. Plan for citations rather than clicks: 68% of US searches now end without one. One channel, six months, then judge it. Adding paid on top before this works just buys traffic to pages that do not convert.",
            },
            {
                minPct: 25,
                label: "Prove owned messaging first: email or WhatsApp",
                verdict: "go",
                advice:
                    "Your buyers come back, which makes the cheapest channel the one you already own. Put capture on every entry point, then build flows before campaigns: welcome, abandoned browse or cart, post-purchase and win-back. Across 183,000 Klaviyo accounts, flows are 5.3% of sends and about 41% of email revenue, and the SMS equivalent is 7.6% of sends and 45.2% of revenue. In much of Africa, Latin America and South Asia the owned channel is WhatsApp rather than email, so build it there instead. Record consent properly for your country. Get this working before you scale any paid spend, or you will pay twice for the same customer.",
            },
            {
                minPct: 0,
                label: "Prove creators, then paid social behind what works",
                verdict: "go",
                advice:
                    "Cheap, visual, impulse purchases are won on attention, and creator content is currently the cheaper half of that. Start with nano and micro creators rather than paid ads: engagement is higher, budgets are moving there, and you can buy the content rights and reuse the winners as ads. Track with per-creator codes, because attribution is genuinely unsolved. Only put money behind a creative that already worked organically. One channel at a time: if your cold-traffic click-through is under about 1%, the message is wrong, not the channel, and no amount of extra spend fixes a positioning problem.",
            },
        ],
        caveat:
            "This routes you to one bet, it does not prove it. Run it as a Bullseye test: fixed budget, fixed duration, one success metric and a kill threshold written down before you start. Two facts should shape your expectations. Acquisition has got structurally dearer, with average US direct-to-consumer acquisition cost at $226.38 in 2024, up about 60% in five years. And every channel decays, so budget to add a new one roughly every 18 months and keep a fifth of your effort on exploration.",
    },
};

// ------------------------------------------------------- unit economics

const CAC_PAYBACK: Tool = {
    id: "cac-payback",
    slug: "cac-payback",
    stage: "operate",
    kind: "calculator",
    title: "CAC and payback",
    blurb:
        "What one customer costs to win, and how many months of gross profit it takes to get that money back. The gate before any spending increase.",
    ref: "modern/S05-metrics-and-unit-economics.md",
    basedOn: "David Skok, SaaS Metrics 2.0; CRV 2026 startup KPIs",
    featured: true,
    spec: {
        fields: [
            {
                id: "spend",
                label: "Fully loaded acquisition spend for the period",
                help:
                    "Everything you spent to win customers in one period: ads, agency and tool fees, creative, commissions, and the salary cost of everyone selling and marketing, including your own time at a realistic rate. Platform cost alone understates the truth badly: on Meta the platform figure has been measured at roughly a fifth of the fully loaded one.",
                default: 20000,
                min: 0,
                step: 100,
            },
            {
                id: "newCustomers",
                label: "New customers won in that period",
                help: "Customers who first paid in the period. Not leads, not trials, not pilots you have not converted.",
                default: 40,
                min: 0,
                step: 1,
            },
            {
                id: "arpu",
                label: "Average revenue per customer per month",
                help: "For a business without subscriptions, divide a typical customer's annual spend with you by twelve.",
                default: 120,
                min: 0,
                step: 5,
            },
            {
                id: "grossMargin",
                label: "Gross margin",
                unit: "%",
                help:
                    "Revenue minus the cost of delivering it, as a percentage. Include hosting, support, payment fees, third-party APIs and, if you run AI features, inference. Inference is cost of goods, not research: AI-native businesses cluster at 50 to 60% margin rather than the 70 to 85% software has enjoyed.",
                default: 75,
                min: 0,
                max: 100,
                step: 1,
            },
        ],
        outputs: [
            {
                id: "cac",
                label: "Customer acquisition cost",
                formula: "fully loaded acquisition spend / new customers won",
                format: "money",
                help: "What one customer cost you, all in.",
                benchmark: {
                    value: "$226.38",
                    context: "average US direct-to-consumer acquisition cost, up 7% year on year and about 60% in five years",
                    source: "Shopify US retail DTC data, via Retainful",
                    year: 2024,
                    ref: "modern/S02-marketing.md",
                },
            },
            {
                id: "contribution",
                label: "Monthly gross profit per customer",
                formula: "average revenue per customer per month x gross margin",
                format: "money",
                help:
                    "The only money that can actually repay acquisition cost. Using revenue instead of gross profit here is the single most common way founders flatter their own economics.",
            },
            {
                id: "paybackMonths",
                label: "Months to get the money back",
                formula: "customer acquisition cost / monthly gross profit per customer",
                format: "months",
                help:
                    "Traffic light: under 6 months is green, 6 to 12 is amber, over 12 is red. Red means fix pricing or acquisition cost before you spend another unit on growth, because every new customer digs the hole deeper before it fills it.",
                benchmark: {
                    value: "about 20 months",
                    context: "what Series A investors now see as typical, against a historic 12 to 14 month norm",
                    source: "CRV, startup KPIs at seed and Series A",
                    year: 2026,
                    ref: "modern/S05-metrics-and-unit-economics.md",
                },
                good: (outputs) => outputs.paybackMonths > 0 && outputs.paybackMonths <= 12,
            },
            {
                id: "firstYearProfit",
                label: "First-year gross profit per customer after acquisition cost",
                formula: "(monthly gross profit x 12) - customer acquisition cost",
                format: "money",
                help:
                    "Negative means a customer who leaves inside a year loses you money. That is survivable if they stay much longer, and fatal if they do not, which is why this number must be read next to your churn.",
                good: (outputs) => outputs.firstYearProfit > 0,
            },
        ],
        compute: (inputs) => {
            const spend = inputs.spend || 0;
            const newCustomers = inputs.newCustomers || 0;
            const arpu = inputs.arpu || 0;
            const margin = (inputs.grossMargin || 0) / 100;

            const cac = newCustomers > 0 ? spend / newCustomers : 0;
            const contribution = arpu * margin;
            const paybackMonths = contribution > 0 ? cac / contribution : 0;
            const firstYearProfit = contribution * 12 - cac;

            return { cac, contribution, paybackMonths, firstYearProfit };
        },
        rule:
            "Skok's rule has held for fifteen years: recover acquisition cost inside 12 months, and the best subscription businesses do it in 5 to 7. Direct-to-consumer practice is tighter still, at 3 to 6 months healthy and 6 to 12 acceptable, because a retailer cannot finance a long payback. Two warnings. Payback is the number investors trust, because unlike a lifetime-value ratio it cannot be inflated by an optimistic assumption about the future. And model acquisition cost as rising, not flat: every channel decays, so a plan that only works at today's cost is not a plan.",
    },
};

const UNIT_ECONOMICS: Tool = {
    id: "unit-economics",
    slug: "unit-economics",
    stage: "operate",
    kind: "calculator",
    title: "Unit economics: lifetime value against acquisition cost",
    blurb:
        "Does one customer repay the cost of getting them, with enough left over to fund the company? Breakeven, moved from the product to the customer.",
    ref: "modern/S05-metrics-and-unit-economics.md",
    basedOn: "David Skok, SaaS Metrics 2.0; Bill Gurley on the seduction of the LTV formula",
    featured: true,
    spec: {
        fields: [
            {
                id: "cac",
                label: "Customer acquisition cost",
                help: "Take this from the CAC and payback tool rather than guessing. Fully loaded, not platform spend.",
                default: 500,
                min: 0,
                step: 10,
            },
            {
                id: "arpa",
                label: "Average revenue per account per month",
                help: "Recurring revenue divided by active accounts. Pick accounts or users and stay consistent, because mixing them silently doubles or halves everything below.",
                default: 120,
                min: 0,
                step: 5,
            },
            {
                id: "grossMargin",
                label: "Gross margin",
                unit: "%",
                help: "Revenue minus cost of delivery. The lifetime value below uses this, because the simple revenue version overstates the value of a customer by exactly the cost of serving them.",
                default: 75,
                min: 0,
                max: 100,
                step: 1,
            },
            {
                id: "monthlyChurn",
                label: "Monthly customer churn",
                unit: "%",
                help:
                    "Customers lost in a month divided by customers at the start of it. If you have fewer than a year of history, say so out loud: a lifetime assumption of five years from a two-year-old company is fiction.",
                default: 3,
                min: 0,
                max: 100,
                step: 0.1,
            },
            {
                id: "monthlyExpansion",
                label: "Monthly expansion revenue",
                unit: "%",
                help: "Extra revenue from existing customers each month, as a percentage of starting revenue: upgrades, seats, usage. Enter 0 if you do not sell more to existing customers.",
                default: 1,
                min: 0,
                max: 100,
                step: 0.1,
            },
        ],
        outputs: [
            {
                id: "lifetimeMonths",
                label: "Expected customer lifetime",
                formula: "1 / monthly customer churn rate",
                format: "months",
                help: "At 3% monthly churn this is 33 months. The arithmetic is unforgiving: at 5% it is 20 months, at 8% it is 12.",
            },
            {
                id: "ltv",
                label: "Lifetime value, gross-margin based",
                formula: "(average revenue per account x gross margin) / monthly churn rate",
                format: "money",
                help:
                    "The gross-margin version, which is the one to use. It is the total gross profit one average customer produces before they leave, with no discounting and no assumption that they spend more over time.",
            },
            {
                id: "ltvCac",
                label: "Lifetime value to acquisition cost",
                formula: "lifetime value / customer acquisition cost",
                format: "multiple",
                help:
                    "Below 3, do not scale acquisition. Above 5 or 6 with a short payback you are probably under-investing in growth and leaving the market to someone else.",
                benchmark: {
                    value: "above 3x",
                    context: "the viability threshold; the best subscription businesses run at 7 to 8x",
                    source: "David Skok, SaaS Metrics 2.0 (forEntrepreneurs)",
                    year: 2016,
                    ref: "modern/S05-metrics-and-unit-economics.md",
                },
                good: (outputs) => outputs.ltvCac >= 3,
            },
            {
                id: "paybackMonths",
                label: "Months to repay acquisition cost",
                formula: "customer acquisition cost / (average revenue per account x gross margin)",
                format: "months",
                help:
                    "Skok's second test, and the one a ratio cannot fake. A business can show a fine ratio and still die waiting for the cash.",
                benchmark: {
                    value: "under 12 months",
                    context: "best-in-class recover acquisition cost in 5 to 7 months",
                    source: "David Skok, SaaS Metrics 2.0 (forEntrepreneurs)",
                    year: 2016,
                    ref: "modern/S05-metrics-and-unit-economics.md",
                },
                good: (outputs) => outputs.paybackMonths > 0 && outputs.paybackMonths <= 12,
            },
            {
                id: "netChurn",
                label: "Net monthly revenue churn",
                formula: "monthly churn rate - monthly expansion rate",
                format: "percent",
                help:
                    "Negative is the prize: expansion from existing customers more than covers what you lose, so revenue grows even if you sell nothing new. When this is negative, the lifetime value above understates you, deliberately, because we will not print a number built on growth that has not happened yet.",
                benchmark: {
                    value: "2.5 to 5% good, under 1.5% great",
                    context: "monthly churn for business-to-business SMB and mid-market; consumer 3 to 5% good, enterprise 1 to 2%",
                    source: "ProfitWell, 13,000 anonymised SaaS companies, via Lenny Rachitsky",
                    year: 2022,
                    ref: "modern/S05-metrics-and-unit-economics.md",
                },
                good: (outputs) => outputs.netChurn <= 0,
            },
        ],
        compute: (inputs) => {
            const cac = inputs.cac || 0;
            const arpa = inputs.arpa || 0;
            const margin = (inputs.grossMargin || 0) / 100;
            const churn = (inputs.monthlyChurn || 0) / 100;
            const expansion = (inputs.monthlyExpansion || 0) / 100;

            const contribution = arpa * margin;
            const lifetimeMonths = churn > 0 ? 1 / churn : 0;
            const ltv = churn > 0 ? contribution / churn : 0;
            const ltvCac = cac > 0 ? ltv / cac : 0;
            const paybackMonths = contribution > 0 ? cac / contribution : 0;
            const netChurn = (churn - expansion) * 100;

            return { lifetimeMonths, ltv, ltvCac, paybackMonths, netChurn };
        },
        rule:
            "The verdict is two tests, not one. Healthy means lifetime value at least three times acquisition cost AND that cost repaid inside twelve months. Fail either and you do not scale acquisition, you fix pricing, margin or churn. Read it with Gurley's warning in mind: the variables are interdependent, not independent, so spending more to grow faster raises acquisition cost and often lowers the quality of the customer, and a ratio built on a five-year lifetime you have never observed is arithmetic, not evidence. Before you act on this, stress-test it: acquisition cost 30% higher and churn 50% worse. A plan that only survives the base case is not a plan.",
    },
};

// --------------------------------------------------------- running it

const CASH_FORECAST: Tool = {
    id: "cash-forecast",
    slug: "cash-forecast",
    stage: "operate",
    kind: "calculator",
    title: "Thirteen-week cash view",
    blurb:
        "Profit is an opinion, cash is a fact. The simplified version of the rolling forecast that every small business should run weekly.",
    ref: "modern/S04-operations.md",
    basedOn: "The rolling 13-week cash-flow forecast; JPMorgan Chase Institute cash-buffer research",
    spec: {
        fields: [
            {
                id: "openingCash",
                label: "Cash in the bank today",
                help: "What you could actually spend this morning. Not invoiced revenue, not an agreed credit line you have not drawn.",
                default: 40000,
                min: 0,
                step: 500,
            },
            {
                id: "weeklyReceipts",
                label: "Cash in per week",
                help:
                    "Money landing in the account, not invoices raised. If customers pay you 30 days late on average, the receipt belongs 30 days after the work, which is the whole point of doing this weekly.",
                default: 9000,
                min: 0,
                step: 100,
            },
            {
                id: "weeklyPayroll",
                label: "Payroll per week",
                help: "Salaries, contractors, your own draw, plus the employment taxes and pension costs that follow them. Separate from other costs because it is the one you cannot quietly delay.",
                default: 6000,
                min: 0,
                step: 100,
            },
            {
                id: "weeklyOther",
                label: "Other outgoings per week",
                help: "Rent, software, stock, fees, tax set-aside, everything else that recurs.",
                default: 2500,
                min: 0,
                step: 50,
            },
            {
                id: "oneOffCost",
                label: "One-off cost in the next 13 weeks",
                help: "The lumpy payment that catches people out: a tax bill, an annual renewal, a deposit, a stock order, a legal fee. Enter 0 if there is none.",
                default: 12000,
                min: 0,
                step: 500,
            },
            {
                id: "oneOffWeek",
                label: "Which week does it land?",
                unit: "week",
                help: "Week 1 is this week, week 13 is the last week of the quarter ahead.",
                default: 6,
                min: 1,
                max: 13,
                step: 1,
            },
        ],
        outputs: [
            {
                id: "weeklyNet",
                label: "Normal weekly net",
                formula: "cash in - payroll - other outgoings",
                format: "money",
                help: "What a week without surprises does to your balance. Everything else here is this number repeated thirteen times, with one shock.",
                good: (outputs) => outputs.weeklyNet >= 0,
            },
            {
                id: "cashAtWeek13",
                label: "Cash at the end of week 13",
                formula: "opening cash + (13 x weekly net) - the one-off cost",
                format: "money",
                help: "Where you land if nothing changes. It is not the number that kills businesses, though. The next one is.",
                good: (outputs) => outputs.cashAtWeek13 > 0,
            },
            {
                id: "lowestPoint",
                label: "Lowest point in the quarter",
                formula: "the smallest running balance across the 13 weeks",
                format: "money",
                help:
                    "Businesses fail at the low point, not at the end. If this is negative while the week-13 number is positive, you are solvent on paper and out of cash in practice, and you need to move the one-off, delay it, or find a facility before it lands.",
                good: (outputs) => outputs.lowestPoint > 0,
            },
            {
                id: "lowestWeek",
                label: "Which week the low point falls in",
                formula: "the week number of the smallest running balance (0 if cash never dips below today)",
                format: "number",
                help: "Put it in the calendar. This is the week to have already dealt with, not the week to discover.",
            },
            {
                id: "weeksOfCash",
                label: "Weeks of cash at this burn",
                formula: "cash in the bank / weekly net outflow (0 when receipts cover the week)",
                format: "number",
                help:
                    "A 0 here means you are not burning: receipts cover the week and the clock is not running. Any other number is how long today's balance lasts if nothing improves.",
                benchmark: {
                    value: "27 days",
                    context: "median cash buffer of 597,000 US small businesses; a quarter hold 13 days or fewer, the top quarter hold 62 or more",
                    source: "JPMorgan Chase Institute",
                    year: 2016,
                    ref: "modern/S04-operations.md",
                },
                good: (outputs, inputs) =>
                    inputs.weeklyReceipts >= inputs.weeklyPayroll + inputs.weeklyOther || outputs.weeksOfCash >= 13,
            },
        ],
        compute: (inputs) => {
            const openingCash = inputs.openingCash || 0;
            const receipts = inputs.weeklyReceipts || 0;
            const payroll = inputs.weeklyPayroll || 0;
            const other = inputs.weeklyOther || 0;
            const oneOff = inputs.oneOffCost || 0;
            const oneOffWeek = Math.min(13, Math.max(1, Math.round(inputs.oneOffWeek || 1)));

            const weeklyNet = receipts - payroll - other;

            let running = openingCash;
            let lowestPoint = openingCash;
            let lowestWeek = 0;
            for (let week = 1; week <= 13; week += 1) {
                running += weeklyNet;
                if (week === oneOffWeek) running -= oneOff;
                if (running < lowestPoint) {
                    lowestPoint = running;
                    lowestWeek = week;
                }
            }

            const burn = weeklyNet < 0 ? -weeklyNet : 0;
            const weeksOfCash = burn > 0 ? openingCash / burn : 0;

            return { weeklyNet, cashAtWeek13: running, lowestPoint, lowestWeek, weeksOfCash };
        },
        rule:
            "This is a simplified version of a tool you should eventually run properly: a rolling forecast where each week you drop week one, add a new week thirteen, and replace forecast with actuals. Weeks one to four should come out 90% accurate or better, and if they do not, your receivables and payables data is wrong, which is a more urgent problem than the forecast. Two habits pay for themselves. Ask every month whether you would still make payroll if your largest customer paid 30 days late, because in the UK 70% of small firms are hit by late payment with an average delay of 32 days. And if your runway is under six months, this forecast stops being a report and becomes the weekly meeting.",
    },
};

const CADENCE_BUILDER: Tool = {
    id: "cadence-builder",
    slug: "cadence-builder",
    stage: "operate",
    kind: "checklist",
    title: "The operating rhythm",
    blurb:
        "The week, month and quarter that keep a small company from running on memory and adrenaline. Pick one system, then actually run it.",
    ref: "modern/S04-operations.md",
    basedOn: "EOS (Wickman); Scaling Up (Harnish); the Amazon weekly business review; the Mochary method",
    spec: {
        groups: [
            {
                title: "Set it up once",
                items: [
                    {
                        id: "pick-system",
                        label: "Pick one operating system and write down which one you picked",
                        help:
                            "EOS if you are an owner-led small business, Scaling Up if you already have several teams, the Amazon weekly business review if you have enough weekly volume for trends to mean something, the Mochary method if you are a solo founder-chief executive. Running one of them badly beats shopping for three. Under about 15 people, run one quarterly priority list, not company goals and quarterly rocks in parallel: two lists halve compliance with either.",
                    },
                    {
                        id: "scorecard",
                        label: "Write the scorecard: 5 to 15 weekly numbers, each with one named owner",
                        help:
                            "For every number: the exact definition, where it comes from, whether that source is automated, the target, and what counts as an exception worth discussing. Order controllable inputs before outputs and put finance last. You cannot act on revenue this week. You can act on price, response time, stock and the number of first meetings booked.",
                        critical: true,
                    },
                    {
                        id: "calendar",
                        label: "Put the whole rhythm in the calendar for the next quarter, as recurring invitations",
                        help:
                            "Daily huddle of 10 to 15 minutes if you are over ten people, weekly 60 to 90 minutes, monthly close review, a quarterly planning day, two days a year for the annual. A rhythm that is not in the calendar is a preference, not a system.",
                    },
                    {
                        id: "top-goal",
                        label: "Block two hours a day for the single most important thing",
                        help:
                            "Mochary's Top Goal. It is the first thing to disappear when the business gets busy, which is precisely why it is protected time rather than leftover time.",
                    },
                    {
                        id: "sops",
                        label: "Write down the seven processes the business cannot afford you to forget",
                        help:
                            "Customer onboarding, order or fulfilment, complaint handling, invoice approval, new-starter onboarding, weekly reporting, incident response. One page each: trigger, steps, owner, escalation, service level, last reviewed. The test is whether a new hire could do it from that page alone. If a task has been done the same way three times, it earns a page.",
                    },
                ],
            },
            {
                title: "Every week",
                items: [
                    {
                        id: "weekly-meeting",
                        label: "Run the weekly meeting: numbers top to bottom, exceptions only, strategy banned",
                        help:
                            "Amazon reviews 400 to 500 metrics in 60 minutes by discussing only the exceptions. Routine variation gets nothing said about it. Exceptional variation gets an owner explaining, or saying plainly that they do not know yet and are investigating. No metric is skipped, but most are silent. If the meeting overruns, you are doing strategy in it: split them.",
                        critical: true,
                    },
                    {
                        id: "ids",
                        label: "Spend the back half on the top three issues, and end with dated owners",
                        help:
                            "Identify, discuss, solve. Capture everything else to a list rather than debating it. Aim for 90% of last week's actions done, and say out loud when it is not.",
                    },
                    {
                        id: "cash-roll",
                        label: "Roll the 13-week cash forecast forward and replace forecast with actuals",
                        help:
                            "Drop week one, add a new week thirteen, log the variance on weeks one to four. This is the single habit that most reliably prevents a solvent business from running out of money. Below three months of runway it is not a report, it is the meeting.",
                        critical: true,
                    },
                    {
                        id: "collections",
                        label: "Chase every overdue invoice on a schedule, not on a mood",
                        help:
                            "Automated reminders three days before, then at plus 1, 7 and 14 days, with a written escalation at 30. In the UK around 11% of invoices run 30 days or more overdue and the average small firm is owed about 21,000 pounds. Unchased receivables mean you are financing your customers for free.",
                    },
                    {
                        id: "pipeline-check",
                        label: "Check the pipeline against the number of meetings the plan actually needs",
                        help: "Use the reverse pipeline calculator's meetings-per-week figure as the weekly number. It is a controllable input, which is what makes it worth a weekly meeting.",
                    },
                    {
                        id: "customer-contact",
                        label: "Take at least one customer call or read one support thread yourself",
                        help:
                            "The first thing a growing company loses is unfiltered customer signal, and it goes quietly. Founder contact with customers is the cheapest research you will ever run.",
                    },
                ],
            },
            {
                title: "Every month",
                items: [
                    {
                        id: "close",
                        label: "Close the books on a fixed date and publish the three statements by working day ten",
                        help: "Bank feeds reconciled, revenue recognised, payroll and taxes accrued. A fixed date matters more than a fast one, because it makes the numbers comparable month to month.",
                    },
                    {
                        id: "base-five",
                        label: "Recompute the base five: net new revenue, gross margin, net burn, runway, one retention number",
                        help:
                            "Gross revenue retention for business customers, cohort retention for consumers and marketplaces. Five numbers you can hold in your head beat a dashboard nobody opens.",
                    },
                    {
                        id: "cohorts",
                        label: "Read the cohort table, not the aggregate",
                        help:
                            "Rows are the month a customer first paid, columns are months since. The question is whether the curve flattens, and whether newer cohorts are better than older ones at the same age. Aggregate churn hides both.",
                    },
                    {
                        id: "one-to-ones",
                        label: "One to one with everyone who reports to you, their agenda first",
                        help:
                            "Thirty minutes, written notes, their topics before yours. This is where you hear the problem while it is still cheap, and it is the first thing a busy founder cancels.",
                    },
                    {
                        id: "tool-review",
                        label: "Review the subscription and tool list: cost, owner, which number it moves",
                        help:
                            "Ask what breaks if it is cancelled. Artificial-intelligence spend deserves particular attention: 95% of generative pilots showed no measurable profit impact, and the ones that worked paired an internal owner with outside help rather than being built by a tools team alone.",
                    },
                    {
                        id: "automate-one",
                        label: "Automate exactly one process, with a baseline measured before and after",
                        help:
                            "In this order: data entry, then routing and notification, then drafting, then decision support. If there is no measured baseline, it is not a deployment, it is a purchase.",
                    },
                ],
            },
            {
                title: "Every quarter",
                items: [
                    {
                        id: "priorities",
                        label: "Set three to five priorities for the quarter, each owned and dated, and score last quarter's out loud",
                        help: "Scoring the last set publicly is what stops the next set being fiction. Any more than five and you have a wish list.",
                    },
                    {
                        id: "check-ins",
                        label: "Written performance check-in with everyone",
                        help:
                            "Quarterly written check-ins are what high-performing people teams do: 39% of them review quarterly against 10% of low performers. Written, because spoken feedback is remembered selectively by both sides.",
                    },
                    {
                        id: "security",
                        label: "Access review, offboarding sweep, and one restore from backup you actually test",
                        help:
                            "A backup you have never restored from is a belief, not a backup. While you are there: password manager or single sign-on, two-factor everywhere, least privilege, a vendor list, a privacy notice, a named incident contact.",
                    },
                    {
                        id: "rebenchmark",
                        label: "Re-benchmark your numbers against published medians",
                        help: "The medians have moved every year since 2022, usually against you. Twice a year is enough, quarterly if you are raising.",
                    },
                    {
                        id: "founder-role",
                        label: "Ask what only you can do, then delegate or automate the rest",
                        help:
                            "The cue to hire an operations lead is a change in the founder's job, not a headcount number, though the first dedicated operations hire commonly lands around 10 to 12 employees. Prove the need with an operations lead or chief of staff before a chief operating officer.",
                    },
                    {
                        id: "uk-mtd",
                        label: "File the quarterly digital update for Making Tax Digital",
                        region: "GB",
                        help:
                            "Live from 6 April 2026 for sole traders and landlords with qualifying income above 50,000 pounds, roughly 864,000 taxpayers. The threshold falls to 30,000 in 2027 and 20,000 in 2028. Quarterly digital updates, not one annual return, with a 12-month grace on penalty points.",
                    },
                    {
                        id: "ng-ndpa",
                        label: "Diary the annual data-protection audit return",
                        region: "NG",
                        help:
                            "Under the Nigeria Data Protection Act and the 2025 general application directive, controllers and processors of major importance file an annual compliance audit return through a licensed compliance organisation. Penalties reach 10 million naira or 2% of annual gross revenue, and the commission has already served notices on 1,368 organisations. No operations calendar built in the US contains this.",
                    },
                    {
                        id: "us-nexus",
                        label: "Check sales-tax nexus in every state you sell into, and landed cost on every parcel",
                        region: "US",
                        help:
                            "Economic nexus is set state by state. And the 800-dollar de minimis exemption ended on 29 August 2025, so small imported parcels now clear at origin tariff rates: reprice, or hold inventory in-country.",
                    },
                ],
            },
        ],
    },
};

// ------------------------------------------------------------ people

const FIRST_HIRES: Tool = {
    id: "first-hires",
    slug: "first-hires",
    stage: "operate",
    kind: "worksheet",
    title: "Sequencing the first ten hires",
    blurb:
        "Not job titles. For each of the first ten people: the outcome they own, what breaks without them, and whether it could be contracted instead.",
    ref: "modern/S03-hiring-and-people.md",
    basedOn: "Lenny Rachitsky's first-ten-hires study; Smart & Street, Who; Elad Gil, High Growth Handbook",
    spec: {
        intro:
            "Hire for the next 12 to 18 months, not forever. Shorter and they cannot scale with you, longer and you have bought a bored executive. Across 20 top business-to-business startups, more than two thirds hired an engineer first, every one had an engineer inside the first three, support and design showed up early, and sales only became common inside the first ten. For every line below, write three things: the outcome this person owns, what breaks in 90 days if nobody does it, and whether a contractor or an employer of record could do it instead. A failed hire is estimated to cost between 25,000 and 50,000 in salary terms, and 22% of new starters leave inside 90 days, so the cheapest hire is the one you correctly decided not to make.",
        rows: [
            {
                id: "outcomes",
                label: "What must be true in 18 months that is not true today?",
                help:
                    "Three to six outcomes with numbers and dates. Every hire below must trace to one of them. If a role does not, you are hiring for comfort.",
                placeholder: "e.g. 60 paying customers, support answered within 4 hours, product shipping fortnightly without me",
                wantsEvidence: true,
            },
            {
                id: "unowned",
                label: "Which of those outcomes has nobody who owns it today?",
                help: "This list, in order of what breaks first, is your hiring plan. Everything else is a preference.",
                placeholder: "e.g. nobody owns support after 6pm; nobody owns the outbound list",
            },
            {
                id: "hire-1",
                label: "Hire 1",
                help:
                    "In the study of 20 top startups, more than two thirds made this an engineer and all of them had one inside the first three. If the founders are technical, this is usually whatever the founders are worst at and the business most needs.",
                placeholder: "Outcome owned: ... | Breaks without them: ... | Contract instead? ...",
                wantsEvidence: true,
            },
            {
                id: "hire-2",
                label: "Hire 2",
                help: "Support or customer success, and design, both appear in the first three across the same sample. Support is also the role that most reliably gets the founder off the critical path.",
                placeholder: "Outcome owned: ... | Breaks without them: ... | Contract instead? ...",
            },
            {
                id: "hire-3",
                label: "Hire 3",
                help: "By now the founders should have handed over one whole area, not a pile of tasks. If all three hires still report every decision to you, the problem is not headcount.",
                placeholder: "Outcome owned: ... | Breaks without them: ... | Contract instead? ...",
            },
            {
                id: "hire-4",
                label: "Hire 4",
                help: "Second engineer, or the first person in whichever function is now the bottleneck. Write which one and why, because this is the first hire founders make out of habit rather than evidence.",
                placeholder: "Outcome owned: ... | Breaks without them: ... | Contract instead? ...",
            },
            {
                id: "hire-5",
                label: "Hire 5",
                help:
                    "The earliest defensible point for a first seller, and only if you have already closed 10 to 20 customers yourself and written the playbook down. Run the sales-hire gate before you fill this line in.",
                placeholder: "Outcome owned: ... | Breaks without them: ... | Contract instead? ...",
                wantsEvidence: true,
            },
            {
                id: "hire-6",
                label: "Hire 6",
                help: "If you hire a seller, hire two, because with one you cannot tell whether the person or the process failed.",
                placeholder: "Outcome owned: ... | Breaks without them: ... | Contract instead? ...",
            },
            {
                id: "hire-7",
                label: "Hire 7",
                help: "Product management commonly appears around here, when the founder can no longer hold every decision and the engineers are waiting on answers.",
                placeholder: "Outcome owned: ... | Breaks without them: ... | Contract instead? ...",
            },
            {
                id: "hire-8",
                label: "Hire 8",
                help:
                    "A recruiter recurs at hire 8 to 10 in companies planning 20 or more hires in a year. It feels absurd until you count the hours the founders are spending on sourcing.",
                placeholder: "Outcome owned: ... | Breaks without them: ... | Contract instead? ...",
            },
            {
                id: "hire-9",
                label: "Hire 9",
                help: "Operations or finance often lands here: the person who owns the close, the cash forecast and the tool stack so that you do not.",
                placeholder: "Outcome owned: ... | Breaks without them: ... | Contract instead? ...",
            },
            {
                id: "hire-10",
                label: "Hire 10",
                help: "Ten people is where things must start being written down. Name what this person makes possible that the first nine cannot.",
                placeholder: "Outcome owned: ... | Breaks without them: ... | Contract instead? ...",
            },
            {
                id: "contract-test",
                label: "For each role you marked as contractable: employee, contractor, or employer of record?",
                help:
                    "The test is the same in the US, the UK and Nigeria. Do you control how, when and where the work is done? Can they send a substitute? Do they work mainly for you? Is the work core to the business? Do you supply the tools? Is there ongoing mutual obligation? Three or more yes answers and they are an employee in substance whatever the contract says. To hire abroad without an entity, an employer of record runs about 499 to 599 a month per employee.",
                wantsEvidence: true,
            },
            {
                id: "equity-budget",
                label: "What is the total equity budget for these ten, and what does each level get?",
                help:
                    "Index Ventures' benchmarks for a seed-stage company: roughly 5% of fully diluted equity to the first ten in the US, 3 to 4% in Europe, with a senior engineer or product hire near 1.00%, a mid-level hire around 0.45% and a junior engineer around 0.15%. Carta puts the very first employee near 1.5%, tapering fast after that. Create about 10% as a pool at seed and top it up later rather than over-reserving now, because every unused option is dilution you gave away for nothing.",
                wantsEvidence: true,
            },
            {
                id: "scorecards",
                label: "Which of these roles could you write a one-page scorecard for this week?",
                help:
                    "Mission in one sentence, three to eight measurable dated outcomes, five to eight competencies, and the 90-day roadmap. If you cannot write it, you are not ready to hire: a job description is marketing, a scorecard is the contract you will both be judged against.",
            },
            {
                id: "stop-rule",
                label: "What would make you stop hiring?",
                help:
                    "Write the number now, while it is cheap. Pace hires so you can stop: if the retention event slips or cash tightens, the plan should pause rather than break. Average headcount at Series A fell from about 21 to about 16, so leaner is now normal rather than a sign of weakness.",
                wantsEvidence: true,
            },
        ],
    },
};

const OFFER_CALCULATOR: Tool = {
    id: "offer-calculator",
    slug: "offer-calculator",
    stage: "operate",
    kind: "calculator",
    title: "Offer calculator: cash against equity",
    blurb:
        "What you are really offering, in cash today and in paper that might be worth something. Check it against the benchmark before you send it.",
    ref: "modern/S03-hiring-and-people.md",
    basedOn: "Index Ventures Rewarding Talent; Carta and Pave compensation data",
    spec: {
        fields: [
            {
                id: "salaryOffered",
                label: "Annual cash you are offering",
                help: "Base plus any guaranteed bonus or commission at target. Use one number, in your own currency, and be honest about what is guaranteed.",
                default: 55000,
                min: 0,
                step: 1000,
            },
            {
                id: "salaryBenchmark",
                label: "Market salary for this role and location",
                help:
                    "Look it up before you guess. Pay varies enormously by location: back-end engineers in Lagos were reported at 1.2 to 2.5 million naira a month in late 2025, while annual engineering salaries ranged from roughly 7,500 to 11,000 dollars in Lagos to about 55,000 in Cape Town. Benchmark to where the person is, then say so out loud in the offer.",
                default: 65000,
                min: 0,
                step: 1000,
            },
            {
                id: "equityPct",
                label: "Equity offered",
                unit: "%",
                help: "Percentage of fully diluted equity, not of the option pool and not of the founders' shares.",
                default: 0.45,
                min: 0,
                max: 100,
                step: 0.05,
            },
            {
                id: "valuation",
                label: "Company valuation today",
                help:
                    "The last priced round, or your honest estimate. If you have never raised, this number is a story you are telling, and the candidate deserves to be told that it is one.",
                default: 6000000,
                min: 0,
                step: 100000,
            },
            {
                id: "vestingYears",
                label: "Vesting period",
                unit: "years",
                help: "Four years with a one-year cliff is still the default for a new hire in a private company. Founders vest too.",
                default: 4,
                min: 1,
                max: 10,
                step: 1,
            },
        ],
        outputs: [
            {
                id: "totalAnnual",
                label: "Total annual package at today's valuation",
                formula: "annual cash + (equity value / vesting years)",
                format: "money",
                help:
                    "Cash plus the annualised paper value of the grant. Read the two halves separately: the first is certain, the second is a claim on a future that may not arrive. Never present this single number to a candidate as though it were pay.",
            },
            {
                id: "vsBenchmark",
                label: "Cash against the benchmark",
                formula: "(annual cash - market salary) / market salary",
                format: "percent",
                help:
                    "Negative means you are asking the candidate to accept a discount. That is a legitimate trade, but only if you say it plainly and pay for it with above-benchmark equity rather than hoping they do not check.",
                benchmark: {
                    value: "about +5% since January 2024",
                    context: "startup new-hire salaries rose while equity grants stayed flat",
                    source: "Carta, State of Startup Compensation H1",
                    year: 2025,
                    ref: "modern/S03-hiring-and-people.md",
                },
                good: (outputs) => outputs.vsBenchmark >= 0,
            },
            {
                id: "equityValue",
                label: "Grant value at today's valuation",
                formula: "company valuation x equity percentage",
                format: "money",
                help:
                    "Paper, not money. It becomes real only on an exit or a secondary sale, it dilutes by roughly 20% at each priced round, and the candidate may have to find cash to exercise before they ever see any of it.",
                benchmark: {
                    value: "about 1.5%",
                    context: "typical first-employee grant, tapering quickly for later hires",
                    source: "Carta (Peter Walker)",
                    year: 2025,
                    ref: "modern/S03-hiring-and-people.md",
                },
            },
            {
                id: "annualEquity",
                label: "Equity vesting per year",
                formula: "grant value / vesting years",
                format: "money",
                help: "What vests in a year at today's valuation. Nothing at all vests before the one-year cliff, which is the part candidates most often misread.",
                benchmark: {
                    value: "4.0 years",
                    context: "median new-hire vesting at private companies; ongoing grants run about 3.5 years",
                    source: "Pave",
                    year: 2025,
                    ref: "modern/S03-hiring-and-people.md",
                },
            },
        ],
        compute: (inputs) => {
            const salaryOffered = inputs.salaryOffered || 0;
            const salaryBenchmark = inputs.salaryBenchmark || 0;
            const equityPct = (inputs.equityPct || 0) / 100;
            const valuation = inputs.valuation || 0;
            const vestingYears = inputs.vestingYears || 0;

            const equityValue = valuation * equityPct;
            const annualEquity = vestingYears > 0 ? equityValue / vestingYears : 0;
            const vsBenchmark = salaryBenchmark > 0 ? ((salaryOffered - salaryBenchmark) / salaryBenchmark) * 100 : 0;
            const totalAnnual = salaryOffered + annualEquity;

            return { totalAnnual, vsBenchmark, equityValue, annualEquity };
        },
        rule:
            "Sanity-check the equity percentage against the level, not against how much you like the person. At seed, Index Ventures' benchmarks put a senior engineering or product hire near 1.00% of fully diluted equity, a mid-level hire near 0.45% and a junior engineer near 0.15%, with the first ten hires together taking roughly 5% in the US and 3 to 4% in Europe. Advisors are usually asked for 1% and granted a median of about 0.25%. Then write the offer so it can be believed: strike price and the valuation basis, vesting and cliff, what happens on a change of control, how long they have to exercise after leaving, and the refresh policy. In the UK, grant under the enterprise management incentive scheme where you qualify, which from 6 April 2026 covers companies up to 6 million pounds of raised capital, 120 million pounds of gross assets and 500 employees. One last thing the benchmarks will not tell you: equity discounts for cheaper locations run far larger than cash discounts, roughly 29 to 36% against 11 to 16%, so a remote hire is usually being asked to take the bigger cut on the riskier half of the package.",
    },
};

export const OPERATE_TOOLS: Tool[] = [
    ICP_BUILDER,
    PIPELINE_CALCULATOR,
    SALES_HIRE_GATE,
    CHANNEL_PICKER,
    CAC_PAYBACK,
    UNIT_ECONOMICS,
    CASH_FORECAST,
    CADENCE_BUILDER,
    FIRST_HIRES,
    OFFER_CALCULATOR,
];
