import type { Tool } from "../types";

// Stage 7 - Growth funding.
// Handbook ch 7 supplies the lender's test (the three questions, the five
// ratios, the matching principle) and ch 8 supplies the equity path (angels,
// VCs, convertible preferred, the four downsides). The 2026 layer supplies the
// numbers a founder is actually measured against: S06 for round sizes,
// dilution, post-money SAFEs and Cooley's term-sheet norms, S05 for the metrics
// investors diligence by stage.
//
// Nothing in this file is advice. Every tool carries the disclaimer in a field
// the renderer shows on screen: `caveat` on the quizzes, `rule` on the
// calculators, and a "Read this first" group on the checklist.

/** The disclaimer every tool in this stage must show. Keep it unambiguous. */
const NOT_ADVICE =
    "This is general information, not investment, financial, tax or legal advice. Phoxta is not a regulated adviser, and nothing here is an offer, a recommendation, or a solicitation to buy or sell any security. A term sheet, a loan agreement or a share issue is a binding legal document: have your own lawyer, and usually an accountant, review it before you sign anything.";

/** Treat missing, NaN and negative entries as zero so the maths never breaks. */
const clean = (value: number | undefined): number =>
    typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;

/** Clamp a percentage into 0-100 so a stray input cannot produce nonsense. */
const pct = (value: number | undefined): number => Math.min(clean(value), 100);

/** Safe division: returns 0 rather than Infinity or NaN when the divisor is 0. */
const ratio = (numerator: number, divisor: number): number =>
    divisor > 0 ? numerator / divisor : 0;

const LOAN_READINESS: Tool = {
    id: "loan-readiness",
    slug: "loan-readiness",
    stage: "growth",
    kind: "quiz",
    title: "Would a lender say yes yet?",
    blurb:
        "A banker asks three questions before lending: can you repay, will you repay, and what can I take if you do not. Score yourself on all three before you fill in an application.",
    ref: "07-growth-financing.md",
    basedOn: "HBR's Entrepreneur's Handbook, ch 7: the banker's three questions (p. 116) and the five lender ratios (pp. 117-120)",
    featured: true,
    spec: {
        questions: [
            {
                id: "market",
                prompt: "Can you show a lender that you understand this market and have a workable plan for serving it?",
                group: "1. Ability to repay",
                help: "The first of the four sub-questions behind the banker's first question. Evidence, not enthusiasm.",
                options: [
                    { label: "I would be describing a hope", score: 0 },
                    { label: "I know the market, but have written none of it down", score: 1 },
                    { label: "Written up, with some customer evidence", score: 2 },
                    {
                        label: "Written up, with named customers and real sales history",
                        score: 3,
                        note: "A lender is buying your cash flow, and cash flow comes from customers who already pay.",
                    },
                ],
            },
            {
                id: "experience",
                prompt: "Do you have the experience or the knowledge needed to run this particular kind of business?",
                group: "1. Ability to repay",
                options: [
                    { label: "Neither, this is a new field for me", score: 0 },
                    { label: "Knowledge, but no operating experience", score: 1 },
                    { label: "A few years running something like it", score: 2 },
                    { label: "Years of it, and I can name what I learned the hard way", score: 3 },
                ],
            },
            {
                id: "plan",
                prompt: "Is your business plan realistic, complete, and built on assumptions you could defend line by line?",
                group: "1. Ability to repay",
                help: "Bankers read plans for the assumptions, not the vision.",
                options: [
                    { label: "No written plan", score: 0 },
                    { label: "A deck, not a plan", score: 1 },
                    { label: "A full plan, assumptions mostly untested", score: 2 },
                    { label: "A full plan whose assumptions I have tested against actuals", score: 3 },
                ],
            },
            {
                id: "cashflow",
                prompt: "Are your revenue and cost projections conservative, and does projected cash flow comfortably cover the repayments?",
                group: "1. Ability to repay",
                help: "Repayments come out of cash flow, not out of profit and not out of the asset you bought.",
                options: [
                    { label: "I have not modelled cash flow", score: 0 },
                    { label: "Modelled, and it only works on the good case", score: 1 },
                    { label: "Modelled conservatively, it covers the payments", score: 2 },
                    {
                        label: "Modelled conservatively, and it still covers the payments if revenue falls a third",
                        score: 3,
                        note: "This is the version a lender is actually testing for.",
                    },
                ],
            },
            {
                id: "credit",
                prompt: "What does your credit history say about whether you pay bills on schedule?",
                group: "2. Character",
                help: "The handbook is blunt that character is judged from credit history, personal as well as business.",
                options: [
                    { label: "Defaults or arrears in the last three years", score: 0 },
                    { label: "A few late payments", score: 1 },
                    { label: "Clean, but thin and short", score: 2 },
                    { label: "Clean and long, personal and business", score: 3 },
                ],
            },
            {
                id: "covenants",
                prompt: "Have you ever breached a loan covenant, missed a supplier payment run, or had credit withdrawn?",
                group: "2. Character",
                help: "Lenders write maximum debt levels into loan documents and can call the loan when they are breached.",
                options: [
                    { label: "Yes, in the last two years", score: 0 },
                    { label: "Yes, but longer ago and resolved", score: 1 },
                    { label: "No, though I have never been tested", score: 2 },
                    { label: "No, and I have serviced borrowing through a bad year", score: 3 },
                ],
            },
            {
                id: "collateral",
                prompt: "What marketable assets could you pledge, valued at what a buyer would actually pay?",
                group: "3. Collateral",
                help: "Current assets (cash, stock, receivables) and fixed assets (vehicles, buildings, equipment). Resale value, not book value.",
                options: [
                    { label: "Nothing pledgeable", score: 0 },
                    { label: "Some, worth well under the loan", score: 1 },
                    { label: "Assets worth roughly the loan", score: 2 },
                    { label: "Assets comfortably worth more than the loan", score: 3 },
                ],
            },
            {
                id: "guarantee",
                prompt: "Have you checked whether a government guarantee scheme could stand in for the collateral you lack?",
                group: "3. Collateral",
                help: "In the US that is the SBA, which sets guidelines and guarantees rather than lending. Elsewhere look for the local equivalent, such as the UK's Start Up Loans and British Business Bank guarantees.",
                options: [
                    { label: "Have not looked", score: 0 },
                    { label: "Heard of it, not checked eligibility", score: 1 },
                    { label: "Checked eligibility", score: 2 },
                    {
                        label: "Checked, and found a participating lender",
                        score: 3,
                        note: "Guarantee schemes move with policy. SBA's June 2025 rules pushed 350K to 500K dollar loans out of streamlined processing, and approvals of loans at or under 500K fell about 38% by count.",
                    },
                ],
            },
            {
                id: "ratios",
                prompt: "Could you produce your current, acid-test, debt, debt-to-equity and times-interest-earned ratios today?",
                group: "4. The numbers a lender will run anyway",
                help: "They will calculate them whether or not you do. Knowing them first is the difference between a conversation and an interrogation.",
                options: [
                    { label: "I could not calculate any of them", score: 0 },
                    { label: "I could work out one or two", score: 1 },
                    { label: "I have all five", score: 2 },
                    {
                        label: "I have all five, plus the result with EBIT halved",
                        score: 3,
                        note: "The times-interest-earned stress test: if a bad year halved operating profit, could you still cover the interest?",
                    },
                ],
            },
            {
                id: "lender",
                prompt: "Who are you planning to ask first?",
                group: "4. The numbers a lender will run anyway",
                help: "The handbook says start with a small community bank or credit union, which approve more and satisfy more small borrowers than big banks.",
                options: [
                    { label: "A big national bank only", score: 0 },
                    {
                        label: "An online or alternative lender only",
                        score: 1,
                        note: "Alternative lenders approve more but cost more, and borrowers report lower satisfaction than with a small bank.",
                    },
                    { label: "Have not decided", score: 1 },
                    {
                        label: "A community bank, credit union or CDFI first",
                        score: 3,
                        note: "Approval rates in 2026 run about 13-15% at big banks, 18-20% at small banks and 25-30% at alternative lenders.",
                    },
                ],
            },
            {
                id: "matching",
                prompt: "Does the loan type match what the money is for, and does the term match the life of the asset?",
                group: "4. The numbers a lender will run anyway",
                help: "The matching principle: short-term assets on short-term money, long-term assets on long-term debt or shareholders' capital.",
                options: [
                    { label: "I just want a general-purpose loan", score: 0 },
                    { label: "Roughly matched", score: 1 },
                    { label: "Matched: a line for working capital, an equipment loan for equipment", score: 2 },
                    {
                        label: "Matched, and I can show the asset's extra revenue or savings exceed the financing cost",
                        score: 3,
                        note: "Every borrowed pound has to buy something that earns more than it costs to borrow. The same test applies to your own capital.",
                    },
                ],
            },
        ],
        bands: [
            {
                minPct: 72,
                label: "A lender would take this seriously",
                verdict: "go",
                advice: "Assemble the pack before the meeting: the plan, conservative projections with monthly cash flow, the five ratios plus the EBIT-halved result, evidence of credit history, and a collateral list with resale values. Take it to a community bank or credit union first, and ask what covenants would come with the money before you talk about the rate.",
            },
            {
                minPct: 42,
                label: "Fixable gaps, but not yet",
                verdict: "learn",
                advice: "Find your lowest-scoring group and close it before applying, because a refusal is recorded. If it is ability to repay, build the cash-flow model. If it is character, give the credit file six clean months. If it is collateral, list what you can pledge at resale value and check the government guarantee scheme in your country.",
            },
            {
                minPct: 0,
                label: "A lender would say no today",
                verdict: "stop",
                advice: "Banks lend short and secured to small firms because failure rates are high, and they rarely lend at all without satisfactory answers to all three questions. Fund this growth from operating cash flow, supplier terms or customer prepayments while you build the trading record that makes the loan possible later.",
            },
        ],
        caveat:
            NOT_ADVICE +
            " Context on the odds: small-business loan approval in 2026 runs about 13-15% at big banks, 18-20% at small banks and 25-30% at alternative lenders (Biz2Credit-derived figures, 2026), and SBA approvals of loans at or under 500K dollars fell about 38% by count after the June 2025 rule change (SBA lender analyses, 2025-26). Most small firms borrow small: 54% hold under 100,000 dollars of debt (HBR's Entrepreneur's Handbook, 2018). Debt is usually the cheapest outside capital because interest is deductible, but only once there is taxable income, and interest is contractual in bad years as well as good ones.",
    },
};

const DILUTION: Tool = {
    id: "dilution",
    slug: "dilution",
    stage: "growth",
    kind: "calculator",
    title: "What does this round cost you?",
    blurb:
        "Post-money, investor share, the option pool and what you are left holding, with the real 2026 medians next to each number so you can see whether the deal is market.",
    ref: "modern/S06-financing-2026.md",
    basedOn: "Carta round and cap-table data 2025-26; the option-pool shuffle as set out in Feld & Mendelson, Venture Deals (4th ed., 2019)",
    featured: true,
    spec: {
        fields: [
            {
                id: "preMoney",
                label: "Pre-money valuation",
                help: "The headline price, before the new money goes in. Ask any investor exactly how they arrived at it, then form your own view.",
                default: 20000000,
                min: 0,
                step: 500000,
            },
            {
                id: "raise",
                label: "Amount you are raising",
                help: "The new money in this round, including every investor in it.",
                default: 4300000,
                min: 0,
                step: 100000,
            },
            {
                id: "existingPoolPct",
                label: "Option pool already in the cap table",
                unit: "%",
                help: "Unissued and issued options as a share of today's fully diluted shares. If you have never granted options, this is zero.",
                default: 5,
                min: 0,
                max: 100,
                step: 1,
            },
            {
                id: "newPoolPct",
                label: "New pool top-up, as a share of the post-round cap table",
                unit: "%",
                help: "The pool the investor wants created for future hires. If it is carved out of the pre-money, which is normal, you pay for all of it.",
                default: 10,
                min: 0,
                max: 100,
                step: 1,
            },
        ],
        outputs: [
            {
                id: "postMoney",
                label: "Post-money valuation",
                formula: "pre-money valuation + amount raised",
                help: "The valuation the round sets, and the number the next round has to beat.",
                format: "money",
                benchmark: {
                    value: "$24.3M post on $4.1M raised",
                    context:
                        "median seed round; median Series A was $80M post on $14.4M raised and median Series B $191M post on $25M raised, software only, bridges excluded",
                    source: "Carta",
                    year: 2026,
                    ref: "modern/S06-financing-2026.md",
                    url: "https://carta.com/data/linkedin-vc-fundraising-benchmarks-2026/",
                },
            },
            {
                id: "investorPct",
                label: "Investor ownership after the round",
                formula: "amount raised / post-money valuation",
                help: "What the new money buys. It does not include the pool top-up, which you pay for separately.",
                format: "percent",
                benchmark: {
                    value: "18% dilution",
                    context:
                        "the median at both seed and Series A in Carta's 2026 benchmarks; across all rounds from seed to Series C, Carta's median dilution fell from about 18% to 16% over 2025",
                    source: "Carta",
                    year: 2026,
                    ref: "modern/S06-financing-2026.md",
                    url: "https://carta.com/data/linkedin-vc-fundraising-benchmarks-2026/",
                },
                good: (outputs) => outputs.investorPct > 0 && outputs.investorPct <= 20,
            },
            {
                id: "poolAfter",
                label: "Option pool after the round",
                formula: "new pool top-up + existing pool diluted by the round",
                help: "Options are real ownership. They come out of your column, not the investor's, whenever the top-up sits inside the pre-money.",
                format: "percent",
            },
            {
                id: "founderAfter",
                label: "Founders and existing shareholders after the round",
                formula: "(100% - investor % - new pool %) x (100% - existing pool %)",
                help: "Everything that is not new investor shares and not options. If you have co-founders or earlier angels, split this between you.",
                format: "percent",
                benchmark: {
                    value: "about 56% after seed, about 36% after Series A",
                    context:
                        "median founding-team ownership on Carta cap-table data; SAFEs and pool top-ups, not the headline round size, are what close the gap",
                    source: "Carta cap-table data, via Capitaly analysis",
                    year: 2026,
                    ref: "modern/S06-financing-2026.md",
                    url: "https://capitaly.substack.com/p/a-20-series-a-cannot-take-you-from",
                },
                good: (outputs) => outputs.founderAfter >= 56,
            },
            {
                id: "effectivePre",
                label: "Effective pre-money, after the pool carve-out",
                formula: "pre-money valuation - (new pool % x post-money valuation)",
                help: "The price you are really being paid. A pool created out of the pre-money is a price cut dressed as a hiring plan, so compare this figure, not the headline, when you compare two term sheets.",
                format: "money",
            },
        ],
        compute: (inputs) => {
            const preMoney = clean(inputs.preMoney);
            const raise = clean(inputs.raise);
            const existingPoolPct = pct(inputs.existingPoolPct);
            const newPoolPctRaw = pct(inputs.newPoolPct);

            const postMoney = preMoney + raise;
            const investorPct = ratio(raise, postMoney) * 100;

            // The new pool and the investors cannot together take more than 100%.
            const headroom = Math.max(100 - investorPct, 0);
            const newPoolPct = Math.min(newPoolPctRaw, headroom);

            // Everything not sold in this round and not put into the new pool.
            const remaining = Math.max(100 - investorPct - newPoolPct, 0);
            const poolAfter = newPoolPct + (remaining * existingPoolPct) / 100;
            const founderAfter = (remaining * (100 - existingPoolPct)) / 100;
            const effectivePre = preMoney - (newPoolPct / 100) * postMoney;

            return { postMoney, investorPct, poolAfter, founderAfter, effectivePre };
        },
        rule:
            "The arithmetic never changes: post-money is pre-money plus the new money, and the investor's share is the new money divided by the post-money. What moves the outcome is the option pool. A top-up carved out of the pre-money is paid for entirely by existing shareholders, which is why founders hold about 36% after a Series A that nominally sold about 20% (Carta cap-table data, 2026). Negotiate the pool size and the pool's timing as hard as you negotiate the price. " +
            NOT_ADVICE,
    },
};

const SAFE_STACK: Tool = {
    id: "safe-stack",
    slug: "safe-stack",
    stage: "growth",
    kind: "calculator",
    title: "What will your SAFEs actually convert into?",
    blurb:
        "Post-money SAFEs fix the investor's percentage on the day you sign, so they stack. Model the conversion before you sign the next one.",
    ref: "modern/S06-financing-2026.md",
    basedOn: "Y Combinator's post-money SAFE (2018 revision); Carta SAFE and pre-seed data 2025-26",
    featured: true,
    spec: {
        fields: [
            {
                id: "safeAmount",
                label: "Total raised on SAFEs",
                help: "Add up every SAFE at this cap. If your SAFEs have different caps, run the tool once per cap and add the ownership percentages together.",
                default: 1500000,
                min: 0,
                step: 50000,
            },
            {
                id: "cap",
                label: "Post-money valuation cap",
                help: "The cap is the only term most SAFE negotiations are really about. Leave it at zero to model a discount-only or uncapped SAFE.",
                default: 18000000,
                min: 0,
                step: 500000,
            },
            {
                id: "discountPct",
                label: "Discount to the priced round",
                unit: "%",
                help: "About two-thirds of SAFEs are cap-only, with no discount. Set zero if yours has none.",
                default: 0,
                min: 0,
                max: 50,
                step: 5,
            },
            {
                id: "roundPreMoney",
                label: "Pre-money valuation of the priced round",
                help: "The round the SAFEs convert into. If you cannot see a credible path to a price above your cap, that is the finding, not the calculator.",
                default: 60000000,
                min: 0,
                step: 1000000,
            },
            {
                id: "roundSize",
                label: "Size of the priced round",
                help: "New money in the priced round, on top of the SAFEs converting.",
                default: 14400000,
                min: 0,
                step: 500000,
            },
        ],
        outputs: [
            {
                id: "conversionBasis",
                label: "Conversion price basis",
                formula: "the lower of the valuation cap and the priced round's pre-money less the discount",
                help: "The valuation your SAFE money buys shares at. When the cap is the lower number, the cap is doing the work and the discount is decoration.",
                format: "money",
                benchmark: {
                    value: "$10M to $35M median caps",
                    context:
                        "median post-money SAFE caps by amount raised in Q2 2026: about $10M under $250K, $12M, $12.5M, $18M for $1M to $2.4M, and $35M at $2.5M and above",
                    source: "Carta, via Finro",
                    year: 2026,
                    ref: "modern/S06-financing-2026.md",
                    url: "https://www.finrofca.com/news/safe-valuation-caps-2026",
                },
            },
            {
                id: "safePct",
                label: "SAFE holders' ownership at conversion",
                formula: "SAFE amount / conversion price basis",
                help: "On a post-money SAFE this percentage is fixed the day you sign, before the priced round dilutes everyone else.",
                format: "percent",
                benchmark: {
                    value: "19-20% at the median",
                    context:
                        "pre-seed dilution on rounds of $1M to $2.4M; rounds of $2.5M to $4.9M dilute in the mid-20s, and rounds under $250K dilute 5-6%",
                    source: "Carta, State of Pre-Seed",
                    year: 2025,
                    ref: "modern/S06-financing-2026.md",
                    url: "https://carta.com/data/state-of-pre-seed-2025/",
                },
                good: (outputs) => outputs.safePct > 0 && outputs.safePct <= 20,
            },
            {
                id: "founderDilutionFromSafe",
                label: "Your dilution from the SAFEs alone",
                formula: "SAFE holders' ownership, taken entirely from existing shareholders",
                help: "This is the part founders miss. A post-money SAFE does not dilute the SAFE holders who came before it, so every new one lands on you and on your employees' options.",
                format: "percent",
                benchmark: {
                    value: "93% of pre-priced deals are SAFEs",
                    context:
                        "and about 90% of SAFEs are post-money, up from just over 60% in 2021, across 330,000+ SAFEs and notes tracked since 2021",
                    source: "Carta",
                    year: 2026,
                    ref: "modern/S06-financing-2026.md",
                    url: "https://carta.com/data/state-of-pre-seed-2025/",
                },
                good: (outputs) => outputs.founderDilutionFromSafe > 0 && outputs.founderDilutionFromSafe <= 20,
            },
            {
                id: "totalDilution",
                label: "Total dilution, SAFEs plus the priced round",
                formula: "100% - (100% - SAFE %) x (100% - priced round %)",
                help: "The two events compound rather than add. This is the number to compare against the medians before you decide the raise is done.",
                format: "percent",
                benchmark: {
                    value: "18% for the round alone",
                    context:
                        "median dilution at a 2026 seed round, before any SAFE stack is layered underneath it; median founding teams hold about 56% after seed",
                    source: "Carta",
                    year: 2026,
                    ref: "modern/S06-financing-2026.md",
                    url: "https://carta.com/data/linkedin-vc-fundraising-benchmarks-2026/",
                },
                good: (outputs) => outputs.totalDilution > 0 && outputs.totalDilution <= 30,
            },
        ],
        compute: (inputs) => {
            const safeAmount = clean(inputs.safeAmount);
            const cap = clean(inputs.cap);
            const discountPct = Math.min(pct(inputs.discountPct), 99);
            const roundPreMoney = clean(inputs.roundPreMoney);
            const roundSize = clean(inputs.roundSize);

            const discounted = roundPreMoney * (1 - discountPct / 100);

            // Cap-only, discount-only, both, or neither. Whichever gives the
            // SAFE holder the lower valuation wins, which is how SAFEs work.
            let conversionBasis = 0;
            if (cap > 0 && discounted > 0) conversionBasis = Math.min(cap, discounted);
            else if (cap > 0) conversionBasis = cap;
            else conversionBasis = discounted;

            const safePct = Math.min(ratio(safeAmount, conversionBasis) * 100, 100);
            const founderDilutionFromSafe = safePct;

            const roundPct = Math.min(ratio(roundSize, roundPreMoney + roundSize) * 100, 100);
            const totalDilution = 100 - ((100 - safePct) * (100 - roundPct)) / 100;

            return { conversionBasis, safePct, founderDilutionFromSafe, totalDilution };
        },
        rule:
            "Post-money SAFEs stack. Each one fixes its holder's percentage at signing, so a second SAFE does not dilute the first one, it dilutes you and your employees, and a third dilutes you again. That is why Carta sees 19-20% median dilution on pre-seed rounds of $1M to $2.4M, and mid-20s on $2.5M to $4.9M (Carta, 2025), before the priced round has happened at all. Two further honesties about this model: it ignores the option pool top-up that the priced round will also demand, so your real dilution is higher, and it follows the ordinary cap-versus-discount logic rather than the exact wording of your documents. A cap you cannot grow into is not a win, it is a hurdle: if the next round cannot price above it, you are looking at a down round or a structured one. " +
            NOT_ADVICE,
    },
};

const TERM_SHEET: Tool = {
    id: "term-sheet",
    slug: "term-sheet",
    stage: "growth",
    kind: "checklist",
    title: "Term-sheet clauses to check",
    blurb:
        "Every clause worth arguing about, grouped the way Venture Deals groups them, each one with what the 2026 market actually does according to Cooley's quarterly data.",
    ref: "modern/S06-financing-2026.md",
    basedOn: "Cooley Q1 2026 Venture Financing Report (165 deals, $39.9B); Feld & Mendelson, Venture Deals (4th ed., 2019); HBR's Entrepreneur's Handbook ch 8",
    spec: {
        groups: [
            {
                title: "Read this first",
                items: [
                    {
                        id: "lawyer",
                        label: "Get your own startup lawyer onto the full legal agreement, not just the term sheet",
                        help: "This checklist is general information, not investment, financial or legal advice. Phoxta is not a regulated adviser and nothing here is an offer, a recommendation, or a solicitation to buy or sell any security. The handbook's warning is specific: the term sheet's concise language expands into legal detail that may be worse than you expected, so read the agreement, not the summary, and have a lawyer who does venture deals read it with you.",
                        critical: true,
                    },
                    {
                        id: "own-valuation",
                        label: "Form your own view of what the business is worth before you discuss the investor's number",
                        help: "If an investor says they have valued the company at a figure, ask for a detailed explanation of how it was determined. Valuation is part science and part art, and they do it far more often than you do. Bring your own professional help.",
                        critical: true,
                    },
                    {
                        id: "economics-control",
                        label: "Split the sheet into two lists, economics and control, and negotiate them separately",
                        help: "Feld and Mendelson's central point. Economics covers price, liquidation preference, pay-to-play, vesting and the pool. Control covers the board, protective provisions and drag-along. Trading a control term for an economic one by accident is the classic first-time mistake.",
                    },
                    {
                        id: "timing",
                        label: "Check you are negotiating from strength, not from a cash deadline",
                        help: "The handbook says to line up venture money six to eight months before you need it, and that a viable business which is not desperate gets materially better terms. Rounds fill over roughly six to sixteen weeks once the process starts.",
                    },
                ],
            },
            {
                title: "Economics",
                items: [
                    {
                        id: "price",
                        label: "Price per share and pre-money valuation, and whether this is an up round",
                        help: "Cooley recorded 86% of Q1 2026 rounds as up rounds, 2.6% flat and 11.4% down. Ask whether the price you are taking is one the next round can beat.",
                    },
                    {
                        id: "liq-pref-multiple",
                        label: "Liquidation preference is 1x",
                        help: "98.2% of deals in Cooley's Q1 2026 sample were 1x. A 2x or 3x preference means the investor takes two or three times their money out before you see anything, and it is off-market. Treat any multiple above 1x as a red flag to be argued.",
                        critical: true,
                    },
                    {
                        id: "participation",
                        label: "The preferred is non-participating",
                        help: "96.4% of Cooley's Q1 2026 deals were non-participating. Participating preferred takes the preference and then shares the rest as well, the so-called double dip, which costs you most in a mid-sized exit.",
                        critical: true,
                    },
                    {
                        id: "dividends",
                        label: "No accruing or cumulative dividends",
                        help: "Only 2.4% of Cooley's Q1 2026 deals carried accruing dividends. Cumulative dividends pile up unpaid and must be cleared before common shareholders see a penny.",
                        critical: true,
                    },
                    {
                        id: "pay-to-play",
                        label: "Pay-to-play, and what happens to investors who do not follow on",
                        help: "7.3% of Cooley's Q1 2026 deals, up from 6.3% the previous quarter. It forces existing investors to join the next round or lose preferred rights. It can protect you in a hard round, and it can also be used against you.",
                        critical: true,
                    },
                    {
                        id: "redemption",
                        label: "No redemption rights",
                        help: "6.1% of Cooley's Q1 2026 deals, up sharply from 1.8% a quarter earlier. A redemption right lets the investor require the company to buy its shares back, which can drain cash from an otherwise healthy business.",
                        critical: true,
                    },
                    {
                        id: "pool",
                        label: "Option pool size, and whether the top-up comes out of the pre-money",
                        help: "A pool created before the round is paid for by existing shareholders alone, so it is a price cut. It is the main reason founders hold about 36% after a Series A that nominally sold about 20% (Carta cap-table data, 2026). Model it in the dilution calculator before you agree a number.",
                        critical: true,
                    },
                    {
                        id: "anti-dilution",
                        label: "Anti-dilution protection, and which formula",
                        help: "Ask which form is proposed and what it does to your ownership in a down round. Our 2026 source set does not carry a frequency for anti-dilution variants, so do not take a market claim on trust here: ask your lawyer what is standard for your stage and country.",
                    },
                ],
            },
            {
                title: "Control",
                items: [
                    {
                        id: "board",
                        label: "Board composition and who appoints each seat",
                        help: "The common shorthand for a market Series A board is two founder seats, one investor seat and one independent agreed by both. Combined with a 1x non-participating preference, that is the shape investors describe as market economics.",
                    },
                    {
                        id: "protective",
                        label: "Protective provisions: the list of things you cannot do without investor consent",
                        help: "Typically raising more money, selling the company, changing share classes or altering the board. Read the list line by line and ask what each one blocks in a realistic bad month, not in theory.",
                        critical: true,
                    },
                    {
                        id: "removal",
                        label: "Who can remove you, and on what vote",
                        help: "The handbook is direct that a venture investor may hold enough control to fire you. Find the exact mechanism in the documents rather than assuming goodwill.",
                        critical: true,
                    },
                    {
                        id: "voting",
                        label: "Voting rights attached to the preferred, and the conversion ratio",
                        help: "Convertible preferred usually carries voting rights and the right to convert to common at the holder's discretion at a stated ratio, commonly one for one. Check the ratio and what triggers an automatic conversion.",
                    },
                    {
                        id: "drag",
                        label: "Drag-along: who can force a sale, and at what threshold",
                        help: "A drag-along lets a defined majority compel everyone else to sell. Check whether founders are inside or outside the group whose consent counts.",
                    },
                ],
            },
            {
                title: "Rights",
                items: [
                    {
                        id: "pro-rata",
                        label: "Pro rata rights: who can keep their percentage in later rounds",
                        help: "Pro rata rights are ordinary, but they consume allocation in your next round. Know who holds them before you promise space to a new lead.",
                    },
                    {
                        id: "information",
                        label: "Information rights and the reporting cadence you are agreeing to",
                        help: "Decide what you can actually produce every month before you commit to it. A monthly update covering headline metric, growth, cash and runway, wins, misses and one ask is the cadence most investors expect anyway.",
                    },
                    {
                        id: "mfn",
                        label: "Any most-favoured-nation clause in earlier SAFEs, and what it picks up",
                        help: "An MFN SAFE adopts the best terms issued before the next priced round, which is how the $375K tranche of Y Combinator's $500K standard deal works. If you have MFN paper outstanding, a generous term granted to one small investor propagates.",
                    },
                    {
                        id: "conversion-mechanics",
                        label: "How every outstanding SAFE and note converts in this round",
                        help: "List each instrument, its cap, its discount and whether it is pre-money or post-money, and produce the fully diluted cap table after conversion. Founders routinely discover the stack only at the priced round.",
                        critical: true,
                    },
                ],
            },
            {
                title: "Founder terms",
                items: [
                    {
                        id: "vesting-reset",
                        label: "Founder vesting, and whether the clock resets on equity you have already earned",
                        help: "A reset restarts vesting on shares you own today. Check the schedule, the cliff, and what happens to unvested shares if you leave or are removed. Ask specifically about acceleration on a change of control.",
                        critical: true,
                    },
                    {
                        id: "ownership-model",
                        label: "Your ownership after this round, modelled against the medians",
                        help: "Median founding teams hold about 56% after seed and about 36% after Series A (Carta cap-table data, 2026). If your model lands far below that, find out which term is doing it: usually the SAFE stack or the pool top-up.",
                    },
                    {
                        id: "employment",
                        label: "Employment terms, salary and what counts as good reason to leave",
                        help: "These sit in the deal documents, not in a separate conversation. Agree them while you still have negotiating leverage.",
                    },
                    {
                        id: "exit-horizon",
                        label: "The investor's exit horizon, and whether it matches your plan",
                        help: "Venture investors typically harvest after four or five years through a sale or a flotation. If you intend to build privately for a decade, say so before you sign rather than after.",
                    },
                    {
                        id: "cost-of-capital",
                        label: "What this capital really costs, next to the alternatives",
                        help: "The four standing objections to venture money are the distraction of raising it, terms that get worse in the legal detail, advice you must take whether or not you agree, and dilution. Most businesses never need outside equity at all: fewer than 1% of US companies have ever raised venture capital.",
                    },
                ],
            },
        ],
    },
};

const INVESTOR_READINESS: Tool = {
    id: "investor-readiness",
    slug: "investor-readiness",
    stage: "growth",
    kind: "quiz",
    title: "Are your metrics where investors expect?",
    blurb:
        "Score your revenue, growth, retention, burn and payback against what 2026 investors actually diligence, and find out whether you should be raising, building, or doing neither.",
    ref: "modern/S05-metrics-and-unit-economics.md",
    basedOn: "CRV and Benchmarkit 2026 stage expectations; David Sacks' burn-multiple bands (2020); Jason Lemkin's Series A bar (SaaStr, 2026)",
    spec: {
        questions: [
            {
                id: "arr",
                prompt: "What is your clean recurring revenue, excluding one-off services and unconverted pilots?",
                group: "Revenue",
                help: "Clean means contracted and recurring. Investors reprice everything else.",
                options: [
                    { label: "None yet", score: 0 },
                    { label: "Under $250K", score: 1 },
                    { label: "$250K to $1M", score: 2 },
                    { label: "$1M to $2.5M", score: 3 },
                    {
                        label: "$2.5M or more",
                        score: 4,
                        note: "The median Series A company had about $2.5M of recurring revenue in 2025, roughly 75% above the 2021 bar. AI-native companies are held to about $3.5M.",
                    },
                ],
            },
            {
                id: "growth",
                prompt: "How fast is that revenue growing year on year?",
                group: "Revenue",
                options: [
                    { label: "Flat or falling", score: 0 },
                    {
                        label: "Under 25%",
                        score: 1,
                        note: "Median private B2B SaaS growth was 22% in 2026, down from 25% the year before. Median is not investable, it is just normal.",
                    },
                    { label: "25% to 50%", score: 2 },
                    { label: "50% to 100%", score: 3 },
                    {
                        label: "100% or more",
                        score: 4,
                        note: "The Series A bar is roughly $2M of recurring revenue growing 100-150%, or $1M in a hot space growing fast.",
                    },
                ],
            },
            {
                id: "grr",
                prompt: "What is your gross revenue retention, before any expansion is counted?",
                group: "Retention",
                help: "Starting revenue minus churn and contraction, divided by starting revenue. It caps at 100% and it is the honest base.",
                options: [
                    { label: "I do not measure it", score: 0 },
                    { label: "Under 75%", score: 1 },
                    {
                        label: "75% to 84%",
                        score: 2,
                        note: "Median gross retention fell from 88% to 84% in Benchmarkit's 2026 panel, so the middle of the market is eroding.",
                    },
                    { label: "85% to 90%", score: 3 },
                    {
                        label: "Above 90%",
                        score: 4,
                        note: "Top-quartile gross retention fell from 95% to 91%, so above 90% is genuinely strong in 2026.",
                    },
                ],
            },
            {
                id: "nrr",
                prompt: "What is your net revenue retention, after expansion?",
                group: "Retention",
                help: "Read gross retention first. Expansion can hide a churning base, which is exactly the pattern the 2026 panels found.",
                options: [
                    { label: "I do not measure it", score: 0 },
                    { label: "Under 90%", score: 1 },
                    {
                        label: "90% to 100%",
                        score: 2,
                        note: "Seat-based pricing averages 98% net retention against 108% for usage-based, so the pricing model is part of the number.",
                    },
                    { label: "100% to 120%", score: 3 },
                    {
                        label: "Above 120%",
                        score: 4,
                        note: "AI-native Series A companies are expected to show 120% or better.",
                    },
                ],
            },
            {
                id: "burn",
                prompt: "What is your burn multiple: net burn divided by net new recurring revenue over the same period?",
                group: "Efficiency",
                help: "The catch-all metric. Product problems, churn, pricing and over-hiring all surface here as more burn per pound of new revenue.",
                options: [
                    { label: "Above 3x, or I have not calculated it", score: 0 },
                    {
                        label: "2x to 3x",
                        score: 1,
                        note: "Sacks' bands call 2 to 3 suspect and above 3 bad. Seed companies often run around 3x and Series A companies around 2x.",
                    },
                    { label: "1.5x to 2x", score: 2 },
                    { label: "1x to 1.5x", score: 3 },
                    {
                        label: "Under 1x",
                        score: 4,
                        note: "Under 1x is the band Sacks calls amazing. Below 1.5x with growing net new revenue, raising becomes optional rather than urgent.",
                    },
                ],
            },
            {
                id: "payback",
                prompt: "How many months does it take to recover customer acquisition cost in gross profit?",
                group: "Efficiency",
                help: "Acquisition cost divided by monthly revenue per account times gross margin. Payback is harder to flatter than a lifetime-value ratio.",
                options: [
                    { label: "Longer than 24 months, or unknown", score: 0 },
                    {
                        label: "20 to 24 months",
                        score: 1,
                        note: "About 20 months is what one 2026 Series A investor describes as typical, against a historic norm of 12 to 14. Typical is a market fact, not a target.",
                    },
                    { label: "12 to 20 months", score: 2 },
                    { label: "6 to 12 months", score: 3 },
                    {
                        label: "Under 6 months",
                        score: 4,
                        note: "The long-standing benchmark is recovery inside 12 months, with the best businesses at 5 to 7.",
                    },
                ],
            },
            {
                id: "margin",
                prompt: "What is your gross margin, with hosting, support, third-party APIs and model inference all counted as cost of sales?",
                group: "Efficiency",
                options: [
                    { label: "Under 40%, or I have never separated cost of sales", score: 0 },
                    { label: "40% to 55%", score: 1 },
                    {
                        label: "55% to 70%",
                        score: 2,
                        note: "AI-native margins cluster at 50-60% against 70-85% for classic software, and the median company now targets 50%.",
                    },
                    { label: "70% to 80%", score: 3 },
                    {
                        label: "Above 80%",
                        score: 4,
                        note: "80% has been the median software gross margin for four years running. For AI products the direction matters more than the level.",
                    },
                ],
            },
            {
                id: "cohorts",
                prompt: "Does your cohort retention curve flatten, and are newer cohorts better than older ones at the same age?",
                group: "Evidence",
                help: "At seed this is the quantitative evidence investors look for before they look at revenue.",
                options: [
                    { label: "I do not have a cohort table", score: 0 },
                    { label: "I have one, the curve still falls to zero", score: 1 },
                    { label: "It flattens, at a low level", score: 3 },
                    { label: "It flattens, and newer cohorts sit above older ones", score: 4 },
                ],
            },
            {
                id: "runway",
                prompt: "How many months of cash do you have at your current net burn?",
                group: "Evidence",
                help: "Median time between rounds is close to two years, against a median seed runway of about 10.8 months. The gap is where companies die.",
                options: [
                    { label: "Under 6 months", score: 0 },
                    { label: "6 to 12 months", score: 1, note: "Under 12 months of runway means you are already fundraising, whether or not you have started." },
                    { label: "12 to 18 months", score: 2 },
                    { label: "18 to 24 months", score: 3 },
                    { label: "More than 24 months, or default alive", score: 4 },
                ],
            },
            {
                id: "venture-scale",
                prompt: "Could this business credibly return about ten times an investor's money within five to ten years?",
                group: "Evidence",
                help: "Not whether it can be a good business. Whether it can be that particular kind of outcome, which is the only one a venture fund is built for.",
                options: [
                    {
                        label: "No, and I would not want to run it that way",
                        score: 0,
                        note: "That is a legitimate answer. Most businesses never need outside equity, and fewer than 1% of US companies have ever raised venture capital.",
                    },
                    { label: "Probably not", score: 1 },
                    { label: "Possibly, in the best case", score: 2 },
                    { label: "Yes, and I can show the arithmetic of the market and the model", score: 4 },
                ],
            },
        ],
        bands: [
            {
                minPct: 70,
                label: "Your numbers support a raise",
                verdict: "go",
                advice: "Build the data room before the first meeting: round story and use of proceeds, a 24-month model, historical financials, a fully diluted cap table with every SAFE stacked at its cap, and a metrics pack covering recurring revenue, growth, retention, burn multiple and payback. Warm your investor list for a quarter with monthly updates, then run the process as a sprint rather than a trickle.",
            },
            {
                minPct: 40,
                label: "Build first, raise later",
                verdict: "learn",
                advice: "Name the one number that is furthest from the bar and fix that, rather than starting a process you will lose. If gross retention is low, no acquisition spend will save you. If the burn multiple is above 2, treat it as a company-wide alarm and not a finance problem. A bridge or a seed extension from existing investors is a normal instrument here: bridges were 16.6% of all cash raised in one 2025 quarter, and calling a seed extension a Series A fools nobody.",
            },
            {
                minPct: 0,
                label: "Not venture-shaped, at least not yet",
                verdict: "stop",
                advice: "This is a finding, not a failure. The ladder for a business like this is credit, customer cash and calm capital rather than equity: bank or guaranteed lending, revenue-based finance, grants where you qualify, or a fund that backs profitable software without a hundred-times mandate. Use the loan-readiness tool instead, and revisit this one when the retention curve and the burn multiple have moved.",
            },
        ],
        caveat:
            NOT_ADVICE +
            " Three things worth knowing before you read your score as fate. First, the odds: only about 14-17% of a seed cohort raises a Series A within 24 months, against roughly 30% in the boom years (Carta, 2026). Second, the concentration: artificial intelligence took 86% of US venture dollars in the first half of 2026, $355.9B of $412.7B, and rounds of $100M or more took 87.5% of all capital, so a record headline does not mean your round got easier (PitchBook-NVCA Venture Monitor, 2026). Third, the population: every benchmark here comes from US-weighted panels of venture-backed software companies, so if you are outside that population, treat the numbers as directional rather than as a pass mark.",
    },
};

export const GROWTH_TOOLS: Tool[] = [
    LOAN_READINESS,
    DILUTION,
    SAFE_STACK,
    TERM_SHEET,
    INVESTOR_READINESS,
];
