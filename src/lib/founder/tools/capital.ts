import type { Tool } from "../types";

// Stage 5 - Startup capital.
// Handbook ch 6 supplies the method: size the number from an opening balance
// sheet, then stack sources cheapest first. The 2026 layer (S06) supplies the
// current round sizes, dilution and the honest odds on equity.

/** Treat missing, NaN and negative entries as zero so the maths never breaks. */
const clean = (value: number | undefined): number =>
    typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;

const STARTUP_CAPITAL: Tool = {
    id: "startup-capital",
    slug: "startup-capital",
    stage: "capital",
    kind: "calculator",
    title: "How much do you need to open the doors?",
    blurb:
        "The handbook's opening balance sheet as a calculator: runway cash, opening stock, equipment and prepaid costs add up to one number you can go and raise.",
    ref: "06-startup-financing.md",
    basedOn: "HBR's Entrepreneur's Handbook, Tables 6-1 and 6-2 (Amalgamated Hat Rack)",
    featured: true,
    spec: {
        fields: [
            {
                id: "monthlyFixed",
                label: "Monthly fixed costs",
                unit: "per month",
                help: "Rent, wages, software, insurance, loan payments. The costs that arrive whether or not you sell anything.",
                default: 2700,
                min: 0,
                step: 100,
            },
            {
                id: "runwayMonths",
                label: "Months of runway you want covered",
                unit: "months",
                help: "The months you expect costs to outstrip revenue. The handbook's worked example budgets three; three is thin if your sales cycle is long.",
                default: 3,
                min: 0,
                max: 36,
                step: 1,
            },
            {
                id: "stock",
                label: "Opening stock or inventory",
                help: "What you must hold before the first sale. Zero for most service and software businesses.",
                default: 7500,
                min: 0,
                step: 100,
            },
            {
                id: "equipment",
                label: "Equipment and fit-out",
                help: "Tools, vehicles, machines, fixtures, computers. Buy used where you can: the handbook's founder got a truck, two lathes, tools and benches for 10,000 dollars.",
                default: 10000,
                min: 0,
                step: 100,
            },
            {
                id: "prepaid",
                label: "Prepaid costs",
                help: "Deposits, licences, a year of insurance, rent paid up front, registration and legal fees. Do not count anything here that is already inside your monthly fixed costs.",
                default: 6500,
                min: 0,
                step: 100,
            },
            {
                id: "cushionPct",
                label: "Cash cushion",
                unit: "%",
                help: "Added on top for the things you have not thought of. Every launch budget is optimistic; this is where you admit it.",
                default: 15,
                min: 0,
                max: 100,
                step: 5,
            },
        ],
        outputs: [
            {
                id: "total",
                label: "Total launch capital",
                formula:
                    "(monthly fixed costs x months of runway + stock + equipment + prepaid) x (1 + cushion %)",
                help: "The number to put in front of any lender, family member or investor. Raise it before you leave the job, not after.",
                format: "money",
                benchmark: {
                    value: "$32,000",
                    context:
                        "the handbook's worked launch budget: $8,000 cash for a 3-month startup period, $7,500 inventory, $6,500 prepaid, $10,000 of used fixed assets. A 2018 book figure, so read it as a shape, not a price",
                    source: "HBR's Entrepreneur's Handbook, Tables 6-1 and 6-2",
                    year: 2018,
                    ref: "06-startup-financing.md",
                },
                good: (_outputs, inputs) => clean(inputs.cushionPct) >= 10,
            },
            {
                id: "runwayPortion",
                label: "Runway portion, held as cash",
                formula: "monthly fixed costs x months of runway + the cash cushion",
                help: "Money that must still be in the bank on opening day. Spending it on equipment is the classic way to run out in month four.",
                format: "money",
                benchmark: {
                    value: "3 months of cash",
                    context:
                        "the handbook budgets cash to cover the startup period when costs outstrip revenue, and its founder stayed employed until the whole amount was in hand",
                    source: "HBR's Entrepreneur's Handbook, Table 6-1",
                    year: 2018,
                    ref: "06-startup-financing.md",
                },
                good: (_outputs, inputs) => clean(inputs.runwayMonths) >= 3,
            },
            {
                id: "oneOff",
                label: "One-off portion, spent before you open",
                formula: "stock + equipment + prepaid",
                help: "Everything you buy once. This is the part you can shrink fastest: buy used, lease instead of own, hold less stock, open smaller.",
                format: "money",
                benchmark: {
                    value: "$10,000 of fixed assets, all used",
                    context:
                        "a used panel truck ($7,500), two used lathes ($900), tools ($800) and shop fixtures ($800) in the handbook's worked example, bought through industry contacts",
                    source: "HBR's Entrepreneur's Handbook, Table 6-2",
                    year: 2018,
                    ref: "06-startup-financing.md",
                },
            },
            {
                id: "monthlyBurn",
                label: "Monthly burn this funds",
                formula: "runway portion / months of runway",
                help: "What you can afford to spend each month before the cash runs out. If your real fixed costs are higher than this, the plan is already short.",
                format: "money",
            },
        ],
        compute: (inputs) => {
            const monthlyFixed = clean(inputs.monthlyFixed);
            const months = clean(inputs.runwayMonths);
            const stock = clean(inputs.stock);
            const equipment = clean(inputs.equipment);
            const prepaid = clean(inputs.prepaid);
            const cushionPct = Math.min(clean(inputs.cushionPct), 1000);

            const runwayCash = monthlyFixed * months;
            const oneOff = stock + equipment + prepaid;
            const cushion = (runwayCash + oneOff) * (cushionPct / 100);
            const runwayPortion = runwayCash + cushion;
            const total = runwayPortion + oneOff;
            const monthlyBurn = months > 0 ? runwayPortion / months : 0;

            return { total, runwayPortion, oneOff, monthlyBurn };
        },
        rule:
            "The handbook's rule: launch capital = cash for the months your costs exceed revenue + opening inventory + prepaid insurance and rent + fixed assets. Work the number out first, then go looking for money. Founders who do it the other way round raise what is offered rather than what they need, and pay for the difference in interest or in ownership.",
    },
};

const SOURCE_STACK: Tool = {
    id: "source-stack",
    slug: "source-stack",
    stage: "capital",
    kind: "worksheet",
    title: "Stack your sources, cheapest first",
    blurb:
        "Nine sources in order of what they cost you. Record how much you expect from each and on what terms, then check the total against your launch number.",
    ref: "06-startup-financing.md",
    basedOn: "HBR's Entrepreneur's Handbook, Figure 6-1 and Table 6-3; 2026 figures from S06",
    spec: {
        intro:
            "Size the number first with the launch capital calculator, then fill this in from the top down. The order is deliberate: each row costs you more than the one above it, in interest, in obligation or in ownership sold. Stop as soon as the running total covers your number. In the handbook's worked launch, $32,000 came from $25,000 of savings, a $5,000 zero-interest family loan repaid at $1,000 a year, and $2,000 of rewards crowdfunding (Tables 6-1 to 6-3, 2018). Equity sits last because it is the only row you can never pay back.",
        rows: [
            {
                id: "savings",
                label: "Your own savings",
                help: "The most common source there is: 67.2% of the Inc. 5000 fastest-growing US companies used personal savings, against 6.5% that used venture capital (Kauffman data reported in the handbook, Figure 6-1, 2014 survey). Decide now how much you are willing to lose, and keep the rest back.",
                placeholder: "Amount, and the floor you will not go below",
                wantsEvidence: true,
            },
            {
                id: "revenue",
                label: "Revenue and pre-orders",
                help: "Customer money is the cheapest capital there is: no interest, no ownership, and it proves demand while it funds you. Deposits, retainers, annual plans paid up front, pre-orders. What could you sell before you are fully open?",
                placeholder: "What you could pre-sell, to whom, by when",
                wantsEvidence: true,
            },
            {
                id: "familyFriends",
                label: "Friends and family, on written terms",
                help: "Used by 20.9% (family) and 7.5% (close friends) of the Inc. 5000 (Kauffman via the handbook, Figure 6-1, 2014). Write down the amount, the interest, the repayment schedule and what happens if the business fails, then both sign it. An unwritten loan from a relative is a family argument with a delay on it.",
                placeholder: "Amount, interest, repayment per year, what happens on failure",
                wantsEvidence: true,
            },
            {
                id: "tradeCredit",
                label: "Supplier trade credit",
                help: "30 to 60 day terms from suppliers finance your inventory at zero interest if you sell through before the bill falls due. The handbook's example: a shoe-store owner takes $3,000 of stock on 60-day terms and has sold it before payment. Ask every supplier for terms; many will give them once you have bought twice.",
                placeholder: "Which suppliers, how many days, on what value of stock",
                wantsEvidence: true,
            },
            {
                id: "grants",
                label: "Grants and non-dilutive programmes",
                help: "Slow, competitive and free. Only 3.8% of the Inc. 5000 used government grants (Kauffman via the handbook, 2014), but the money costs no ownership. US deep tech: SBIR/STTR was reauthorised on 13 April 2026 after a six-month lapse, with a new Phase II strategic breakthrough tier up to $30M over 48 months (Crowell & Moring; Granted AI, 2026). EU: the EIC Accelerator has a 634M euro indicative budget for 2026, with grants up to 2.5M euro (European Innovation Council, 2026). UK: SEIS and EIS are relief for your investors rather than a grant, and from 6 April 2026 EIS allows 10M a year and 24M lifetime (Finance Act 2026).",
                placeholder: "Which programme, deadline, amount, what it demands of you",
                wantsEvidence: true,
            },
            {
                id: "bankLoan",
                label: "Bank or government-backed loan",
                help: "Debt costs interest but no ownership, and 51.8% of the Inc. 5000 used bank loans (Kauffman via the handbook, 2014). Expect to be turned down somewhere: 2026 approval rates run about 13-15% at big banks, 18-20% at small banks and 25-30% at alternative lenders (Biz2Credit-derived, 2026). In the US, the SBA cut its Small Loan cap to $350K in June 2025 and approvals at or below $500K fell about 38% by count (SBA lender analyses, 2025-26). Small banks, credit unions and CDFIs are the realistic door.",
                placeholder: "Lender, amount, rate, term, security and personal guarantee",
                wantsEvidence: true,
            },
            {
                id: "crowdfunding",
                label: "Crowdfunding",
                help: "Rewards crowdfunding is pre-selling with a marketing campaign attached: it validates demand and tests your pricing and messaging. Equity crowdfunding under US Reg CF is capped at $5M per issuer per 12 months; Wefunder, the largest portal, closed $109M across 367 deals in 2025 and the market fell 28% year on year in Q1 2026 (platform league table, 2025-26). It works as a community event on top of a lead, not as the whole plan. Worth knowing: women are 13% more likely than men to succeed on Kickstarter (Mollick, via the handbook).",
                placeholder: "Platform, target, rewards you can actually ship, campaign dates",
                wantsEvidence: true,
            },
            {
                id: "angel",
                label: "Angel investment",
                help: "The first row where you sell ownership. 7.7% of the Inc. 5000 used angels (Kauffman via the handbook, 2014), and angels have organised since: US angel-group investment rose 12% to $491.3M in 2025, in bigger cheques to fewer companies through diligence-led syndicates (Angel Capital Association, 2026). Most pre-seed money now moves on a capped post-money SAFE, which fixes the investor's percentage at signing, so three SAFEs stack three lots of dilution onto you (Carta, 2025-26). UK founders: get SEIS/EIS advance assurance before the first meeting, because angels will ask.",
                placeholder: "Amount, instrument, cap, what they bring besides money",
                wantsEvidence: true,
            },
            {
                id: "venture",
                label: "Venture capital",
                help: "The last row, and the rarest: 6.5% of even the Inc. 5000 fastest-growing US companies used venture capital (Kauffman via the handbook, 2014), and high-growth firms are about 3% of US small businesses (Mills & McCarthy via the handbook, 2018). The 2026 median software seed round is $24.3M post-money on $4.1M raised for 18% dilution; Series A is $80M post on $14.4M (Carta, 2026). The bar for running a Series A process in 2026 is around $2M ARR growing 100-150% (Lemkin, SaaStr). Below that you are raising a seed extension, whatever you call it.",
                placeholder: "Amount, milestone it buys, ownership sold, next-round target",
                wantsEvidence: true,
            },
            {
                id: "total",
                label: "Add it up and compare",
                help: "Total the rows above and set them against your total launch capital, the way the handbook's opening balance sheet has to balance. If sources fall short, the usual answer is to cut the one-off portion rather than add an expensive row: buy used, lease, hold less stock, open smaller. If sources overshoot, take less and keep the ownership.",
                placeholder: "Total sources, total needed, and the gap either way",
            },
        ],
    },
};

const FUNDING_ROUTER: Tool = {
    id: "funding-router",
    slug: "funding-router",
    stage: "capital",
    kind: "quiz",
    title: "Which funding path is actually yours?",
    blurb:
        "Five honest questions that sort you into bootstrap, credit and grants, angels and calm capital, or venture. Most businesses are not venture businesses, and that is not a failure.",
    ref: "modern/S06-financing-2026.md",
    basedOn:
        "Mills & McCarthy's three business types (handbook ch 6); Carta 2026 round data; Lemkin's Series A bar; Walling's calm-capital ladder",
    featured: true,
    spec: {
        questions: [
            {
                id: "type",
                prompt: "Which of these is the business you are actually building?",
                group: "Type",
                help: "The handbook splits US small businesses three ways, and each has a different financing life cycle.",
                options: [
                    {
                        label: "Main Street: a local business serving customers near me, run to support my income",
                        score: 0,
                        note: "About 70% of US small-employer firms. Financed by owner equity and credit, almost never by equity investors.",
                    },
                    {
                        label: "Supply-chain: a niche firm serving one industry, region or larger company",
                        score: 2,
                        note: "About 17% of firms, and they keep pursuing growth after startup. Debt, trade credit and occasionally a strategic investor.",
                    },
                    {
                        label: "High-growth: a product that could scale far beyond me, usually technology",
                        score: 4,
                        note: "About 3% of firms. This is the only group for which successive equity rounds are the normal path.",
                    },
                ],
            },
            {
                id: "ceiling",
                prompt: "Be honest about the ceiling: how big could annual revenue realistically get in five to seven years?",
                group: "Ceiling",
                options: [
                    { label: "Enough to pay me and a few other people well", score: 0 },
                    { label: "A few million", score: 1 },
                    {
                        label: "Ten to twenty million",
                        score: 2,
                        note: "The handbook is blunt that a business topping out at $10-20M of revenue is a fine business, just not a venture-scale one.",
                    },
                    { label: "Fifty million or more, in a market worth billions", score: 4 },
                ],
            },
            {
                id: "tenx",
                prompt: "Could an investor plausibly get ten times their money back within about ten years, and can you say how?",
                group: "Return",
                help: "A venture fund needs a handful of its investments to return the whole fund. If the maths cannot get there, venture is the wrong money, not a harder sell.",
                options: [
                    { label: "No, and I would not want to run the business that way", score: 0 },
                    { label: "Maybe, but I cannot show the maths", score: 1 },
                    { label: "Yes, if we hit the plan, and I can sketch the route", score: 3 },
                    { label: "Yes, and I can name recent comparable exits in this market", score: 4 },
                ],
            },
            {
                id: "control",
                prompt: "How do you feel about selling ownership, taking a board and owing someone an exit?",
                group: "Control",
                options: [
                    {
                        label: "I want to own this outright and decide everything myself",
                        score: 0,
                        note: "Then stay with customer money, debt and grants. Every equity row is permanent.",
                    },
                    { label: "I would sell a slice to the right person, and no more", score: 2 },
                    {
                        label: "I will trade ownership and control for speed",
                        score: 4,
                        note: "Know what that costs: median founding teams hold about 56% after seed and about 36% after Series A (Carta cap-table data, 2026).",
                    },
                ],
            },
            {
                id: "revenue",
                prompt: "Where is revenue today?",
                group: "Traction",
                options: [
                    { label: "None yet", score: 0 },
                    { label: "Early revenue, a handful of customers", score: 1 },
                    { label: "Meaningful recurring revenue, growing steadily", score: 2 },
                    {
                        label: "Around $2M of annual recurring revenue, growing 100% or more",
                        score: 4,
                        note: "That is roughly the 2026 Series A bar (Lemkin, SaaStr). Below it, investors price you as a seed extension.",
                    },
                ],
            },
        ],
        bands: [
            {
                minPct: 80,
                label: "Venture is genuinely open to you",
                verdict: "go",
                advice: "Raise for a milestone, not for a runway number. Under about $4M raised on a rolling basis the market instrument is a cap-only post-money SAFE: SAFEs were 93% of pre-priced deals and 89% of pre-priced dollars in Q4 2025 (Carta), so the negotiation is the cap, not the form. Model the stack before you sign the third one, because post-money SAFEs are additive and $1-2.4M of pre-seed already dilutes 19-20% at the median (Carta, 2025). Then test the cap against what the next round will demand: median 2026 software seed is $24.3M post on $4.1M raised, Series A $80M post on $14.4M (Carta, 2026). A cap you cannot grow into becomes a down round.",
            },
            {
                minPct: 55,
                label: "Angels, an accelerator or calm capital, not a Series A",
                verdict: "learn",
                advice: "You have a real growth story but not the Series A bar of about $2M ARR growing 100-150% (Lemkin, 2026). Look at organised angels, where US group investment rose 12% to $491.3M in 2025 (Angel Capital Association, 2026); at an accelerator only if you are genuinely high-growth and the programme has a record, since every accelerator takes equity and the handbook notes that graduates of top programmes raised and exited faster while other programmes showed no strong effect; and at calm capital such as TinySeed, which puts in $120K-$220K for 10-12% with no 100x mandate (Walling, 2026). Seed to Series A graduation is 14-17% at 24 months (Carta, 2026), so build the version of the plan where the A never arrives.",
            },
            {
                minPct: 30,
                label: "Credit and grants, not equity",
                verdict: "go",
                advice: "Your ladder is money you pay back, not ownership you sell. Trade credit first, then a small bank, credit union, CDFI or online lender: 2026 approval rates run about 13-15% at big banks, 18-20% at small banks and 25-30% at alternative lenders (Biz2Credit-derived, 2026), so apply in several places at once. Screen the non-dilutive programmes you qualify for: SBIR/STTR in the US, reauthorised in April 2026 with a Phase II tier up to $30M; the EIC Accelerator in the EU at 634M euro for 2026 with grants to 2.5M euro; SEIS and EIS relief for your investors in the UK. The handbook's reminder is that even among fast-growing firms about 40% of initial startup capital is bank debt, with an almost equal amount of owner equity (Kauffman).",
            },
            {
                minPct: 0,
                label: "Bootstrap it, and let customers fund the growth",
                verdict: "go",
                advice: "This is the majority path, not the consolation prize. Personal savings funded 67.2% of the Inc. 5000 fastest-growing US companies, and 13.6% used no outside finance at all (Kauffman via the handbook, Figure 6-1, 2014 survey). Keep the launch number small, get paid up front where you can, take supplier terms, and let revenue buy the next step. Rob Walling's stair-step version: one small product inside an existing ecosystem, replicate until it replaces your income, then build the standalone business with runway and a reputation behind you. You can always raise later from a position of strength. You cannot unsell equity.",
            },
        ],
        caveat:
            "Be clear how rare venture money is. High-growth firms are about 3% of US small businesses (Mills & McCarthy, via the handbook, 2018), and even among the Inc. 5000 fastest-growing US companies only 6.5% used venture capital and 7.7% used angels, against 67.2% using personal savings (Kauffman data, 2014 survey, handbook Figure 6-1). Across the whole population of businesses the share is smaller still. The pool is also narrowing: AI took 86% of US venture dollars in H1 2026 ($355.9B of $412.7B) and rounds of $100M or more took 87.5% of all capital, leaving seed, A and B to share the remaining 12.5% (PitchBook-NVCA Venture Monitor, 2026). A record funding headline is not evidence that your round got easier.",
    },
};

export const CAPITAL_TOOLS: Tool[] = [STARTUP_CAPITAL, SOURCE_STACK, FUNDING_ROUTER];
