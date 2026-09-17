import type { Tool } from "../types";

// Stage 9 - Exit and harvest.
// Handbook ch 13 supplies the mechanisms (IPO, M&A, ESOP, MBO, sale to a new
// owner, shearing) and appendix C supplies the valuation maths, including the
// equity-versus-enterprise rule. Neither publishes a single multiple or discount
// rate, so every current figure here comes from the 2026 layer (S12).
//
// Nothing in this file is a valuation, an offer, or advice on selling
// securities. It is arithmetic and published benchmarks, for orientation only.

/** Treat missing, NaN and negative entries as zero so the maths never breaks. */
const clean = (value: number | undefined): number =>
    typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;

/** The sentence that has to appear wherever a number could be mistaken for a price. */
const NOT_A_VALUATION =
    "This is an indicative range for orientation, not a valuation. It is not an offer, a price, or advice on selling shares. A real transaction needs a qualified business appraiser, an accountant and a lawyer, engaged before you talk to a buyer about price.";

const EXIT_ROUTE: Tool = {
    id: "exit-route",
    slug: "exit-route",
    stage: "harvest",
    kind: "quiz",
    title: "Which exit is actually open to you?",
    blurb:
        "Seven questions on size, profit, owner dependence, buyers, motivation and time. The answer is the mechanism the market will give you, not the one you would pick.",
    ref: "modern/S12-exit-and-liquidity-2026.md",
    basedOn:
        "HBR's Entrepreneur's Handbook, ch 13 harvesting mechanisms; 2026 route screen and buyer classes from S12",
    featured: true,
    spec: {
        questions: [
            {
                id: "size",
                prompt: "What does the business turn over in a year?",
                group: "Scale",
                help: "Size does not decide whether a business is good. It decides who is allowed to buy it.",
                options: [
                    { label: "Under 250k", score: 0 },
                    { label: "250k to 1M", score: 1 },
                    {
                        label: "1M to 5M",
                        score: 2,
                        note: "Business-broker territory. Brokers cluster below about $20M of value, and their fee is a commission paid mostly at close (HBR's Entrepreneur's Handbook, ch 13, 2018).",
                    },
                    { label: "5M to 25M", score: 3 },
                    {
                        label: "Over 25M",
                        score: 4,
                        note: "Above roughly $20M of value you are past brokers and into banker territory, and merger clearance starts to matter: the US HSR size-of-transaction threshold is $133.9M from 17 Feb 2026 (FTC, 2026), and the UK turnover threshold rose from £70M to £100M under the DMCCA (2025).",
                    },
                ],
            },
            {
                id: "profit",
                prompt:
                    "After paying someone a market wage to do your job, what does the business earn in a year?",
                group: "Scale",
                help: "This is the number a buyer values. Your own salary comes out of it first, because the buyer will have to pay a manager to replace you.",
                options: [
                    {
                        label: "It loses money",
                        score: 0,
                        note: "A loss-making business has a very short buyer list. Either the loss is a deliberate growth investment you can prove, or the realistic routes are an asset sale and a wind-down.",
                    },
                    { label: "It roughly breaks even", score: 1 },
                    {
                        label: "A modest profit, under 100k",
                        score: 2,
                        note: "The median small business that actually sold went for $349,250, at 94% of asking (BizBuySell closed-deal data, 2026). Small is normal, and small still sells.",
                    },
                    { label: "100k to 1M", score: 3 },
                    { label: "Over 1M", score: 4 },
                ],
            },
            {
                id: "dependence",
                prompt: "If you stopped working tomorrow, how long would the business keep running?",
                group: "Transferability",
                help: "Most of what you are selling is the business continuing without you in it.",
                options: [
                    {
                        label: "It would stop within weeks",
                        score: 0,
                        note: "This is the single biggest discount a buyer applies. If the business is you, there is very little to sell.",
                    },
                    { label: "A couple of months, then it would drift", score: 1 },
                    { label: "About six months", score: 2 },
                    { label: "A year, with a team already doing the work", score: 3 },
                    {
                        label: "Indefinitely, I am not in the operating chain",
                        score: 4,
                        note: "Diligence asks this directly: what happens to the business if you leave in six months? Being able to answer it calmly is worth more than any pitch deck.",
                    },
                ],
            },
            {
                id: "buyers",
                prompt: "Who buys businesses like yours right now?",
                group: "Demand",
                help: "Not who might in theory. Who has closed a deal in your category in the last year.",
                options: [
                    { label: "I do not know of anyone who buys businesses like mine", score: 0 },
                    { label: "Individual buyers, if anyone", score: 1 },
                    { label: "Local competitors, if I approached them", score: 2 },
                    {
                        label: "An active class of trade buyers or consolidators",
                        score: 3,
                        note: "If you run a labour-intensive services firm on thin margins, you now have a bidder class that did not exist in 2018: more than $3B has been committed to AI roll-ups across General Catalyst, Thrive, Khosla, Elad Gil, Bessemer and GV (2026). They are also your future competitors.",
                    },
                    {
                        label: "Public companies or PE funds bid in my category every quarter",
                        score: 4,
                        note: "Announced global M&A hit a record $2.8T in the first half of 2026, up 48% year on year, with technology leading at $649B (LSEG data, 2026). Sale by acquisition, not an IPO, is still where nearly every harvest happens.",
                    },
                ],
            },
            {
                id: "team",
                prompt: "Could your managers or employees afford to buy you out?",
                group: "Inside buyers",
                help: "The inside buyer is the route most founders never price. It is slower and usually cheaper, and it is the one that keeps the business intact.",
                options: [
                    { label: "There is no management team", score: 0 },
                    { label: "There is a team, but no interest or capacity to buy", score: 1 },
                    {
                        label: "They would buy if I financed most of it",
                        score: 2,
                        note: "That makes you the lender. The handbook is blunt about it: with junk-bond funding gone, the seller often takes a collateral-backed note and is paid over many years, carrying the buyers' risk (ch 13, 2018).",
                    },
                    { label: "They could raise a real share of the price", score: 3 },
                    { label: "They could fund it with a bank and little seller paper", score: 4 },
                ],
            },
            {
                id: "motivation",
                prompt: "Why now?",
                group: "Motivation",
                help: "The handbook's three motivations are diversifying your wealth, the business reaching the end of its line under you, and wanting to begin again. Retirement and an unrefusable offer are the other two.",
                options: [
                    {
                        label: "I want cash out, but I do not want to stop running it",
                        score: 0,
                        note: "Then you do not want an exit, you want liquidity. The handbook calls the low-tech version shearing: pocket the cash flow you do not need to reinvest. No sale, no buyer, no valuation.",
                    },
                    {
                        label: "The business has gone as far as it can under me",
                        score: 1,
                        note: "A real signal, and the handbook names it, but it also shortens your buyer list. Buyers can tell the difference between a business you have finished with and one that has finished.",
                    },
                    { label: "I want to start something else", score: 2 },
                    {
                        label: "Nearly all my net worth is in this one company",
                        score: 3,
                        note: "Concentration is the handbook's first motivation to harvest. One technology shift or one strong new competitor can take the lot.",
                    },
                    { label: "I am retiring, or I have an offer I cannot ignore", score: 4 },
                ],
            },
            {
                id: "time",
                prompt: "How long do you have before you need this done?",
                group: "Time",
                options: [
                    {
                        label: "Three months or less",
                        score: 0,
                        note: "A rushed sale is a discounted sale. Under three months the realistic options narrow to a fast asset sale or an orderly wind-down.",
                    },
                    { label: "Six months to a year", score: 1 },
                    { label: "One to two years", score: 2 },
                    {
                        label: "Two to five years",
                        score: 3,
                        note: "Enough time to fix owner dependence and clean the books, which is where most of the price actually is.",
                    },
                    {
                        label: "No deadline at all",
                        score: 4,
                        note: "Patience is a prerequisite rather than a virtue: the median time to a tech IPO is now about 11.5 years, and 45% of unicorns have sat in portfolios nine years or more (PitchBook, 2025).",
                    },
                ],
            },
        ],
        bands: [
            {
                minPct: 86,
                label: "An IPO is theoretically open, a large trade sale is far likelier",
                verdict: "go",
                advice:
                    "What is good about it: a public market gives the highest price when investor appetite is strong, and gives everyone liquidity over time. What is not: very few firms qualify, the costs, scrutiny and reporting burden are permanent, and you cannot sell on day one. US insiders face Rule 144 monthly caps and a lockup that is standard at 180 days (Cooley, 2025). There were 202 US IPOs raising $44.0B in 2025, and the class split violently after listing (Renaissance Capital, 2025). Meanwhile M&A is where the harvest actually happens. Run both as options, expect the trade sale, and if you do not want to leave at all, read the liquidity band below instead.",
            },
            {
                minPct: 72,
                label: "Trade sale to a strategic buyer",
                verdict: "go",
                advice:
                    "What is good about it: a strategic buyer pays for what completes its own set, which is why it can pay above what the business is worth on its own numbers. It can be a clean cash exit. What is not: the handbook's three issues decide the outcome, and founders concede all three by default. How the deal is valued, how payment is structured, and what your post-deal role is. Prefer cash. If you are offered acquirer stock, judge it as an investment you would buy today. Negotiate against the published distribution, not anecdote: in middle-market private deals earnouts appeared in 18%, rep and warranty insurance in 63%, and no survival of reps in 41% (ABA Private Target Deal Points Study, 2025). Never do this without an M&A lawyer and an accountant.",
            },
            {
                minPct: 58,
                label: "Sale to a financial buyer: private equity, a search fund or a roll-up",
                verdict: "go",
                advice:
                    "What is good about it: financial buyers buy predictable profit, they buy small, and there are more of them every year. Buying a business is now a mainstream path, with the international search-fund universe growing from 83 funds in 2018 to 503 by the end of 2025 (IESE, 2026). What is not: they underwrite hard. They will want a quality of earnings report, they will discount owner dependence and customer concentration, and part of the price usually arrives later as an earnout, a holdback or a seller note. Only 14% of deals require the buyer to run the business as before (ABA, 2025), so an earnout metric is the buyer's to move unless you write a covenant.",
            },
            {
                minPct: 44,
                label: "Management buyout",
                verdict: "learn",
                advice:
                    "What is good about it: the buyers already know the business and the industry, there is continuity for staff and customers, and you do not have to open your books to a competitor. The handbook's fit test is a business with predictable free cash flow, low capital spending, little existing debt and some nonessential assets. What is not: the price is usually lower, and you will probably be the lender. Debt-to-equity after a leveraged buyout can reach 10 to 1, and the buyers then run the standard playbook of selling non-core units and cutting headcount, costs and inventory to service it. If you finance it, you are carrying their risk for years. Model what happens if they miss.",
            },
            {
                minPct: 30,
                label: "Employee ownership: an ESOP in the US, an EOT in the UK",
                verdict: "learn",
                advice:
                    "What is good about it: it creates a market for shares where none exists, it is gradual and tax-favoured, and the culture survives. This is a large route, not a fringe one: 6,609 US ESOPs cover 15.1M participants and $2.1T of assets (NCEO, 2026), and the UK reached 2,824 employee-owned businesses by March 2026 with about 500 transitioning in 2025 alone (Employee Ownership Association, 2026). What is not: an independent appraisal every year, which is a real cost for a small firm, employees eventually owning the majority, and employees carrying their job and their retirement in the same company. UK founders should check the Budget 2025 changes to EOT relief before modelling any tax outcome, with an adviser.",
            },
            {
                minPct: 16,
                label: "Liquidity without an exit: shearing, or a secondary if you are funded",
                verdict: "learn",
                advice:
                    "What is good about it: you get capital without selling, without a valuation fight and without a new owner. If the business throws off cash, take the cash you do not need to reinvest, which is the handbook's shearing. If you are venture-backed, the modern version is a company-sanctioned tender offer: a record 16,538 employees sold shares in Carta-administered tenders in 2025, and the median subscription was 99.9% (Carta, 2025). The typical third-party cap is about 20% of a holder's stake. What is not: shearing limits internally funded growth, so if growth still matters you are substituting debt for retained cash. A tender needs board and investor consent, a defensible price basis and a check on transfer restrictions, and it is a securities transaction, so it needs a lawyer from the start.",
            },
            {
                minPct: 0,
                label: "An orderly wind-down, or a quiet asset sale",
                verdict: "stop",
                advice:
                    "This is the honest answer more often than founders are told, and doing it well protects you. What is good about it: you choose the timing, you can still sell the parts that have value, and you stop the losses. What is not: it ends the business, and the three things that follow you personally are personal guarantees, director liabilities and unpaid payroll taxes. Move quickly. Board and shareholder approval, stop incurring new obligations, notify and pay employees, sell or license the assets that decay fastest such as IP, domains, customer lists and data, notice creditors, then file the dissolution and the final tax returns. Drifting is the expensive option: startup shutdowns rose 25.6% to 966 in 2024, and the later cohorts died with more capital and more obligations still on the books (Carta and SimpleClosure, 2024 to 2026).",
            },
        ],
        caveat:
            NOT_A_VALUATION +
            " This quiz is a prompt for a conversation with those advisers, not a recommendation to sell, to stay, or to buy or sell any security. It scores one axis only, which is how much transferable value a third party could buy, so it will not know your tax position, your shareholder agreement, your lender's consent rights or your family. The rules also differ by country: Rule 144, lockups, ESOP qualification and the US broker associations named in the handbook are US-only, and the economic logic travels while the rulebook does not.",
    },
};

const VALUATION: Tool = {
    id: "valuation",
    slug: "valuation",
    stage: "harvest",
    kind: "calculator",
    title: "What is it worth, roughly, and to whom?",
    blurb:
        "Normalised profit times a multiple, adjusted for debt and cash, cross-checked against revenue. Two methods, one range, and a straight answer about what the number is not.",
    ref: "C-valuation.md",
    basedOn:
        "HBR's Entrepreneur's Handbook, appendix C (earnings multiples, equity versus enterprise value, earnings normalisation); 2026 multiples from S12",
    featured: true,
    spec: {
        fields: [
            {
                id: "profit",
                label: "Normalised annual profit (SDE or EBITDA)",
                help: "Normalised means the appendix C checklist has been applied. Strip one-off write-offs and one-off gains, restate owner and family salaries to market, and check that maintenance and depreciation are neither starved nor padded. Under about 5M of revenue, buyers usually work in SDE, which adds your own compensation back. Above it they work in EBITDA, which does not. Use one or the other consistently, and never compare an SDE figure with an EBITDA multiple.",
                default: 120000,
                min: 0,
                step: 1000,
            },
            {
                id: "multiple",
                label: "The multiple to apply",
                unit: "x",
                help: "Take it from recent comparable transactions in your sector and size band, not from an index and not from a headline. US Main Street businesses closed at about 2.7x SDE in 2026 (BizBuySell). Private SaaS ran at a 4.5x ARR median (SaaS Capital, 2026). See the multiples table for the full published set, and remember the multiple is where almost all the argument is.",
                default: 2.7,
                min: 0,
                max: 50,
                step: 0.1,
            },
            {
                id: "debt",
                label: "Interest-bearing debt",
                help: "Short-term plus long-term borrowings: bank loans, invoice finance, asset finance, director loans that will be repaid, outstanding notes. Not trade creditors, not accruals. Appendix C is explicit that enterprise value equals equity value plus interest-bearing debt, so this is the line that decides how much of the price ever reaches you.",
                default: 0,
                min: 0,
                step: 1000,
            },
            {
                id: "cash",
                label: "Cash in the business",
                help: "Surplus cash, over and above the working capital the business needs to run. Small-business sales are usually quoted cash-free and debt-free, so the seller keeps the surplus cash and clears the debt out of the proceeds. Appendix C's own equation stops at equity plus debt and does not net cash, so if you are checking against the book, set this to zero.",
                default: 0,
                min: 0,
                step: 1000,
            },
            {
                id: "revenue",
                label: "Annual revenue (optional cross-check)",
                help: "Leave at zero to skip the revenue method. It exists because the appendix's rule is to run more than one method and reconcile the spread in writing.",
                default: 500000,
                min: 0,
                step: 1000,
            },
            {
                id: "revenueMultiple",
                label: "Revenue multiple (optional cross-check)",
                unit: "x",
                help: "US small businesses closed at about 0.7x revenue in 2026 (BizBuySell). Software is a different asset class: the SaaS Capital Index median read 3.8x ARR in July 2026 while the market-cap-weighted BVP Emerging Cloud Index read 6.3x. Those are not the same number and neither of them is your number.",
                default: 0.7,
                min: 0,
                max: 50,
                step: 0.1,
            },
        ],
        outputs: [
            {
                id: "evEarnings",
                label: "Enterprise value from earnings",
                formula: "normalised annual profit x the multiple",
                help: "The appendix's earnings-based method, capitalising earnings at a comparable multiple. It is backward-looking by construction, so it shortchanges a fast-growing business. If yours is growing fast, the handbook's own rule is to insist on a discounted cash flow as well, built with an appraiser.",
                format: "money",
                benchmark: {
                    value: "2.7x SDE",
                    context:
                        "US Main Street closed deals, up about 1% on 2.61x in 2025; by sector the earnings range ran 2.0x to 3.3x with a 2.58x average",
                    source: "BizBuySell closed-deal data, via a secondary summary of the Q2 2026 Insight Report",
                    year: 2026,
                    ref: "modern/S12-exit-and-liquidity-2026.md",
                },
            },
            {
                id: "equityValue",
                label: "Equity value, the part that could reach you",
                formula: "enterprise value from earnings - interest-bearing debt + surplus cash",
                help: "Appendix C's rule, applied in reverse: enterprise value equals equity value plus interest-bearing debt, so subtract the debt to get back to equity. Netting surplus cash is standard deal practice rather than the book's equation, which stops at equity plus debt. Confusing equity value with enterprise value is the most common mistake in this whole subject, and it is always the seller who pays for it. This is still before tax, fees, escrow, holdbacks and anything deferred into an earnout.",
                format: "money",
                good: (outputs) => (outputs.equityValue ?? 0) > 0,
                benchmark: {
                    value: "$349,250",
                    context:
                        "median price of a small business that actually closed, down 1% year on year, at about 94% of asking in 2025",
                    source: "BizBuySell, via a secondary summary",
                    year: 2026,
                    ref: "modern/S12-exit-and-liquidity-2026.md",
                },
            },
            {
                id: "evRevenue",
                label: "Enterprise value from revenue",
                formula: "annual revenue x the revenue multiple",
                help: "The cross-check. A revenue multiple ignores whether you make any money, which is why it flatters loss-making software and insults profitable services. If this number and the earnings number are far apart, that gap is the conversation, and writing down why they disagree is what an appraiser will ask you for first.",
                format: "money",
                good: (_outputs, inputs) =>
                    clean(inputs.revenue) > 0 && clean(inputs.revenueMultiple) > 0,
                benchmark: {
                    value: "0.7x revenue",
                    context:
                        "US Main Street closed deals, 0.69x in 2025; by sector the revenue range ran 0.42x to 1.2x with a 0.67x average",
                    source: "BizBuySell closed-deal data, via a secondary summary",
                    year: 2026,
                    ref: "modern/S12-exit-and-liquidity-2026.md",
                },
            },
            {
                id: "rangeLow",
                label: "Indicative range, low",
                formula: "the lower of the two equity values, after debt and cash",
                help: "Start negotiating knowing this number exists. A buyer will anchor here and justify it with your owner dependence, your customer concentration and anything diligence turns up.",
                format: "money",
            },
            {
                id: "rangeHigh",
                label: "Indicative range, high",
                formula: "the higher of the two equity values, after debt and cash",
                help: "The top of your own arithmetic, not a target and not an asking price. The only thing that reliably moves a real price above the range is a second bidder: one bidder sets a price, two set a market.",
                format: "money",
                benchmark: {
                    value: "3.8x versus 6.3x",
                    context:
                        "the same software market read two ways in 2026: the equal-weighted SaaS Capital Index median against the market-cap-weighted BVP Nasdaq Emerging Cloud Index. The gap between two honest indices is not negotiating room",
                    source: "SaaS Capital Index (Jul 2026) and BVP Nasdaq Emerging Cloud Index, both via trackers",
                    year: 2026,
                    ref: "modern/S12-exit-and-liquidity-2026.md",
                },
            },
        ],
        // Pure. Every input is cleaned to a finite non-negative number first, and
        // there are no divisions, so there is nothing to divide by zero.
        compute: (inputs) => {
            const profit = clean(inputs.profit);
            const multiple = clean(inputs.multiple);
            const debt = clean(inputs.debt);
            const cash = clean(inputs.cash);
            const revenue = clean(inputs.revenue);
            const revenueMultiple = clean(inputs.revenueMultiple);

            const evEarnings = profit * multiple;
            const evRevenue = revenue * revenueMultiple;

            const equityValue = evEarnings - debt + cash;
            const equityFromRevenue = evRevenue - debt + cash;

            const bases: number[] = [];
            if (profit > 0 && multiple > 0) bases.push(equityValue);
            if (revenue > 0 && revenueMultiple > 0) bases.push(equityFromRevenue);

            const rangeLow = bases.length > 0 ? Math.min(...bases) : 0;
            const rangeHigh = bases.length > 0 ? Math.max(...bases) : 0;

            return { evEarnings, equityValue, evRevenue, rangeLow, rangeHigh };
        },
        rule:
            NOT_A_VALUATION +
            " Value is always a range, and a single number is a fiction. Appendix C gives two structural reasons: different methods consistently disagree even when the arithmetic is perfect, and every method is only as good as inputs that are usually incomplete, unreliable or forecast. Two experienced appraisers using the same method will land on different numbers. That is why most appraisers run more than one method and negotiate inside the spread, and it is why the same business is worth different amounts to different buyers: a strategic buyer who is completing a set will rationally pay more than the numbers alone support. Three rules to carry into any conversation. Normalise the earnings before you apply any multiple. Take the multiple from recent comparable transactions, never from an index level and never from a headline. And keep equity value and enterprise value straight, because enterprise value equals equity plus interest-bearing debt, and quoting one while meaning the other is how sellers lose money without noticing.",
    },
};

const MULTIPLES: Tool = {
    id: "multiples",
    slug: "multiples",
    stage: "harvest",
    kind: "reference",
    title: "What things actually sold for in 2026",
    blurb:
        "The published multiples and discount rates, with who measured them and what each one leaves out. The handbook supplies none of these, which is exactly why they are here.",
    ref: "modern/S12-exit-and-liquidity-2026.md",
    basedOn:
        "S12 benchmark table: BizBuySell, SaaS Capital, BVP, Aventis, Damodaran, Stanford GSB, ABA, Carta, PitchBook",
    spec: {
        columns: ["What is being valued", "The figure", "The source, and what it does not tell you"],
        rows: [
            [
                "A small business, on its cash flow to the owner",
                {
                    value: "2.7x SDE",
                    context: "US Main Street closed deals, up about 1% on 2.61x in 2025",
                    source: "BizBuySell closed-deal data",
                    year: 2026,
                    ref: "modern/S12",
                },
                "Reaches this toolkit through a secondary summary of BizBuySell's Q2 2026 Insight Report, so treat the decimal as approximate. Closed deals, not asking prices. SDE adds your own compensation back, so it is not comparable with an EBITDA multiple.",
            ],
            [
                "A small business, on its revenue",
                {
                    value: "0.7x revenue",
                    context: "US Main Street closed deals, 0.69x in 2025",
                    source: "BizBuySell closed-deal data",
                    year: 2026,
                    ref: "modern/S12",
                },
                "Same population and the same secondary-summary caveat. A revenue multiple says nothing about whether the business makes money, so it is only ever a cross-check.",
            ],
            [
                "Small businesses, sector by sector",
                {
                    value: "earnings 2.0x to 3.3x, revenue 0.42x to 1.2x",
                    context: "sector averages of 2.58x on earnings and 0.67x on revenue",
                    source: "BizBuySell industry valuation-multiple tables",
                    year: 2026,
                    ref: "modern/S12",
                },
                "The spread is the point. Your sector's band matters more than the headline average, and within a band the price still turns on owner dependence and customer concentration.",
            ],
            [
                "What a small business actually sold for",
                {
                    value: "$349,250 median price",
                    context: "down 1% year on year; $350,000 in 2025 at about 94% of asking",
                    source: "BizBuySell, via a secondary summary",
                    year: 2026,
                    ref: "modern/S12",
                },
                "Sold businesses only. It cannot tell you how many listings never sold, which is the number every seller would most like to know.",
            ],
            [
                "Public software, equal-weighted",
                {
                    value: "3.8x ARR",
                    context: "median of the index; it read 3.2x in June 2026, a decade low",
                    source: "SaaS Capital Index, July 2026 reading, via a tracker of SaaS Capital data",
                    year: 2026,
                    ref: "modern/S12",
                },
                "Equal-weighted, so every company counts once. This is the number a private seller should start from, and it moves month to month.",
            ],
            [
                "Public cloud, market-cap weighted",
                {
                    value: "6.3x revenue",
                    context: "the same software market, weighted by size",
                    source: "BVP Nasdaq Emerging Cloud Index, via a tracker",
                    year: 2026,
                    ref: "modern/S12",
                },
                "Weighting by market cap lets the largest companies set the number. If a valuation conversation opens above 6x, ask which index it came from before you argue about anything else.",
            ],
            [
                "Private software companies",
                {
                    value: "4.5x ARR median",
                    context: "equity-backed 5.3x against bootstrapped 4.8x",
                    source: "SaaS Capital survey of private companies",
                    year: 2026,
                    ref: "modern/S12",
                },
                "Self-reported survey data from private companies, which skews toward those willing to report. The bootstrapped and funded gap is smaller than founders expect.",
            ],
            [
                "AI companies acquired, on revenue",
                {
                    value: "mean 24.5x, median 13.1x",
                    context: "AI acquisitions dataset",
                    source: "Aventis Advisors",
                    year: 2026,
                    ref: "modern/S12",
                },
                "The distance between the mean and the median is the warning: a handful of strategic mega-deals carry the average. Price off closed deals in your own size band, not off this row.",
            ],
            [
                "AI companies, by what they actually are",
                {
                    value: "foundation models ~37.5x, AI-native SaaS 25x to 30x, applications 8x to 20x",
                    source: "secondary aggregation of public and private comparables",
                    year: 2026,
                    ref: "modern/S12",
                },
                "A secondary aggregation rather than a primary dataset, mixing public comparables with private deals. Useful for the shape of the ladder, not for a price.",
            ],
            [
                "AI companies, what advisers say actually clears",
                {
                    value: "8x to 12x revenue if defensible, 3x to 5x if it is a narrative",
                    source: "adviser observation, FE International",
                    year: 2026,
                    ref: "modern/S12",
                },
                "An observation from people who run sales, not a measured dataset. It is in the table because it is the most honest gap on the page: headline AI multiples are a public-comparable and mega-deal artefact.",
            ],
            [
                "Micro-SaaS and small online businesses",
                {
                    value: "about 2.85x to 6.13x annual profit",
                    context: "Empire Flippers listings run at roughly 40x to 50x monthly profit, which is about 3.3x to 4.2x annual",
                    source: "Acquire.com, Flippa and Empire Flippers, via a secondary summary",
                    year: 2026,
                    ref: "modern/S12",
                },
                "Marketplace data, so it reflects listings and platform-brokered deals rather than the whole market. Monthly-profit multiples and annual-profit multiples are constantly confused in this segment; convert before comparing.",
            ],
            [
                "A startup with no earnings, valued by the VC method",
                {
                    value: "30% to 70% discount rate",
                    context: "highest at pre-seed and seed, falling by stage; applied to a terminal value and adjusted for expected dilution",
                    source: "standard practice, via a secondary summary",
                    year: 2026,
                    ref: "modern/S12",
                },
                "Convention rather than a measured figure, and the range is so wide that the rate, not the exit value, is where the whole argument sits. Say your rate out loud and defend it.",
            ],
            [
                "The building block under any discount rate",
                {
                    value: "4.23% equity risk premium",
                    context: "forward-looking, at 1 January 2026; 4.45% US and 4.17% mature-market in July 2026. Historical averages would say anywhere from 5.5% to 14.5% depending on the window and method",
                    source: "Aswath Damodaran, NYU Stern, annual data update and ERP 2026 edition",
                    year: 2026,
                    ref: "modern/S12",
                },
                "A primary source, updated annually and published free. Build a discount rate from a current premium plus size and illiquidity premiums rather than borrowing a historical average, and keep terminal growth below long-run nominal GDP.",
            ],
            [
                "Pre-revenue, with no comparable at all",
                {
                    value: "up to $500K each for five milestones, about a $2M ceiling",
                    context: "the Berkus method: prototype, team, customer, financial performance, advisers. The Payne scorecard weights team 25%, opportunity 20%, product and technology 18%, sales and marketing 15%, funding need 10%, other 10%",
                    source: "Dave Berkus and Bill Payne, summarised by Allied Venture Partners",
                    year: 2026,
                    ref: "modern/S12",
                },
                "Conventions used by angel groups, not market evidence. They exist because a discounted cash flow on a pre-revenue company is a spreadsheet with an opinion in it.",
            ],
            [
                "Your own common shares against the preferred",
                {
                    value: "common is about 10% to 30% of preferred at seed, 45% to 70% late stage",
                    context: "discount for lack of marketability 20% to 35% at seed",
                    source: "409A valuation practice summary",
                    year: 2026,
                    ref: "modern/S12",
                },
                "A US tax-driven appraisal of common stock, and a practice summary rather than a dataset. It explains why a headline round valuation is not what your own shares are worth, and cheap-stock findings move price or delay a closing.",
            ],
            [
                "The terms attached to a private sale",
                {
                    value: "earnouts 18%, rep and warranty insurance 63%, no survival of reps 41%",
                    context: "middle-market private-target deals of $25M to $900M, CY2024 to Q1 2025; earnouts fell from 26% in the 2023 study and only 14% of deals require the buyer to run the business as before",
                    source: "ABA Private Target Mergers and Acquisitions Deal Points Study",
                    year: 2025,
                    ref: "modern/S12",
                },
                "A lawyer-compiled study of real signed agreements, which makes it the best benchmark on this page. It covers $25M-plus deals, so a smaller sale will differ, but the direction of travel is the same.",
            ],
            [
                "Selling part of your stake without selling the company",
                {
                    value: "16,538 employees sold in tender offers",
                    context: "a record, 20% of them former employees; median subscription 99.9%, participation 36.6% rising to 56%, typical third-party cap about 20% of a holding",
                    source: "Carta-administered tender offers",
                    year: 2025,
                    ref: "modern/S12",
                },
                "One cap-table platform's own book, so it describes venture-backed companies rather than businesses generally. Venture secondaries priced at roughly 78% of net asset value on average in 2025.",
            ],
            [
                "How long the wait to a listing actually is",
                {
                    value: "11.5 years median to IPO",
                    context: "technology companies; 45% of unicorns have been held nine years or more",
                    source: "PitchBook",
                    year: 2025,
                    ref: "modern/S12",
                },
                "Venture-backed technology companies only. It is here because the option to wait is not free: it is paid for in founder years and employee illiquidity.",
            ],
            [
                "What buying a business has returned, for the buyer across the table",
                {
                    value: "33.9% aggregate IRR, 4.75x ROI",
                    context: "US and Canadian search funds since 1984, data to 31 December 2025. Investor-level work finds 31% of funds returned less than 1x and 25% returned 5x or more",
                    source: "Stanford GSB Search Fund Study; distribution from a Yale investor-level study",
                    year: 2026,
                    ref: "modern/S12",
                },
                "Aggregate and dollar-weighted, so a few large winners carry it. Included because this is who is likely to be bidding for a profitable small business, and knowing their maths helps you read their offer.",
            ],
        ],
        note:
            NOT_A_VALUATION +
            " Every row is quoted with its population and its measurement, because the population is almost always the catch. An equal-weighted private median and a market-cap-weighted public index are different numbers about the same market. Rows marked as reaching this table through a secondary summary, an aggregation or an adviser observation are exactly that, and should be checked against the primary publisher before anyone relies on them. Multiples are also perishable: they move with buyer mood, and the handbook's oldest rule on this page is that the same business fetches far more when buyers are optimistic than when they are afraid. Use these to sanity-check a number someone gives you, then get three to five genuinely comparable recent transactions in your sector and size band, with the date, the size and whether the multiple was on revenue, SDE or EBITDA.",
    },
};

const DILIGENCE_READY: Tool = {
    id: "diligence-ready",
    slug: "diligence-ready",
    stage: "harvest",
    kind: "checklist",
    title: "What a buyer will ask for",
    blurb:
        "The diligence request list, worked through before anyone sends it. Every item you cannot produce becomes a discount, a holdback or a dead deal.",
    ref: "modern/S12-exit-and-liquidity-2026.md",
    basedOn:
        "S12 buyer-readiness and valuation-prep checklists; HBR's Entrepreneur's Handbook ch 13 sale-structure checklist",
    spec: {
        groups: [
            {
                title: "Financial records",
                items: [
                    {
                        id: "accounts",
                        label: "Three years of accounts that reconcile to the bank statements",
                        help: "The first thing anyone checks and the most common reason a price moves after the letter of intent. AI has made diligence faster, not softer: the 2026 market is described as stabilising alongside stricter underwriting and deeper financial scrutiny (BizBuySell, 2026). Clean books still beat a good story.",
                        critical: true,
                    },
                    {
                        id: "normalised",
                        label: "A normalised earnings schedule with every add-back listed and defensible",
                        help: "Appendix C's normalisation: remove one-off write-offs and one-off gains, restate owner and family salaries to market, check maintenance and depreciation are neither starved nor padded. Produce SDE and EBITDA side by side so you can answer either question.",
                    },
                    {
                        id: "separation",
                        label: "Personal spending taken out of the company accounts",
                        help: "Cars, phones, family on payroll, holidays booked through the business. Each one is defensible as an add-back once and indefensible as a pattern. A buyer who finds one unlisted add-back stops believing the others.",
                    },
                    {
                        id: "tax",
                        label: "Tax filings up to date, with no open enquiries",
                    },
                    {
                        id: "qoe",
                        label: "A quality of earnings report, if the likely price is $3M or more",
                        help: "An independent review testing whether reported earnings are real, recurring and transferable. From 1 October 2026 a US SBA 7(a) lender orders one anyway at a price of $3M or more, and the deal must clear a 1.25x debt service coverage ratio on trailing rather than projected results (SOP 50 10 8.1, 2026).",
                    },
                    {
                        id: "forecast",
                        label: "A current-year forecast you would be willing to be measured against",
                        help: "If any part of the price is deferred into an earnout, this forecast becomes the metric. Earnouts appeared in 18% of middle-market private deals and only 14% of deals required the buyer to run the business as before (ABA, 2025), so agree who controls the metric and what covenant binds the buyer.",
                    },
                ],
            },
            {
                title: "Legal and ownership",
                items: [
                    {
                        id: "cap-table",
                        label: "One source of truth for the cap table, including SAFEs, notes and every option grant",
                        help: "Not a spreadsheet that disagrees with the company's own filings. Every share, option, warrant, convertible and side letter, with dates and vesting. A cap table that cannot be reconciled stops a deal dead, and it is the item founders most often assume is fine.",
                        critical: true,
                    },
                    {
                        id: "ip-assignment",
                        label: "Signed IP assignments from every contributor, including contractors",
                        help: "Founders, employees, freelancers, agencies, the designer who did the logo in 2019, and anyone whose work came out of an AI tool. If a contributor never assigned the rights, the buyer is not buying what they think they are buying. This is the item that is hardest to fix late and easiest to fix now.",
                        critical: true,
                    },
                    {
                        id: "records",
                        label: "Corporate records complete: board minutes, written consents, share certificates, registers",
                    },
                    {
                        id: "409a",
                        label: "409A history current and internally consistent",
                        help: "Cheap-stock findings move price or delay closing. Common stock is typically valued at about 10% to 30% of preferred at seed, rising to 45% to 70% late stage, with a discount for lack of marketability of 20% to 35% at seed (409A practice summary, 2026).",
                        region: "US",
                    },
                    {
                        id: "disputes",
                        label: "Every dispute, claim and threatened claim written down, open or closed",
                        help: "Disclose them. An asset sale leaves liabilities with you, and a stock sale moves them to the buyer, which is precisely why the buyer will hunt for them. The handbook's rule is that a stock sale usually favours the seller, so settle the structure with your lawyer before you discuss price.",
                    },
                    {
                        id: "clearance",
                        label: "Merger clearance checked, if the deal is large enough to need it",
                        help: "The US HSR size-of-transaction threshold is $133.9M from 17 February 2026 (FTC). In the UK the DMCCA raised the turnover threshold from £70M to £100M, with a £10M UK turnover floor for one party. Being under a threshold is not the same as being invisible: the 2023 US Merger Guidelines reach serial acquisitions and labour effects.",
                    },
                ],
            },
            {
                title: "Customers and revenue",
                items: [
                    {
                        id: "concentration",
                        label: "Top ten customers, each as a share of revenue, with tenure",
                        help: "Concentration is priced. One customer at 40% of revenue is a discount and often a holdback, whatever the headline multiple says.",
                    },
                    {
                        id: "change-of-control",
                        label: "Checked whether the top contracts assign on a change of control",
                        help: "A contract that terminates or needs consent on a change of control can unwind the value of the deal. Read the assignment clause in your ten largest contracts before a buyer does.",
                    },
                    {
                        id: "contracted",
                        label: "Contracted revenue separated from non-contracted, with renewal dates",
                    },
                    {
                        id: "retention",
                        label: "Churn, gross and net revenue retention, and cohort data",
                        help: "Software buyers price retention before growth. Services buyers price repeat rates. Either way, produce it yourself, from the billing system, before someone else calculates a worse version.",
                    },
                    {
                        id: "pipeline",
                        label: "A pipeline that does not depend on you personally selling",
                        help: "If every deal closes because the founder is in the room, the buyer is buying a job. Document how leads arrive, who converts them and what it costs.",
                    },
                    {
                        id: "pricing",
                        label: "A written price list, and the discount history that shows what you really charge",
                    },
                ],
            },
            {
                title: "Operations and people",
                items: [
                    {
                        id: "key-person",
                        label: "A straight answer to: what happens to this business if you leave in six months?",
                        help: "Diligence asks it in those words. Owner dependence is the largest single discount applied to small businesses, and it is the one thing you can genuinely fix in the two years before a sale.",
                    },
                    {
                        id: "employment",
                        label: "Employment contracts for every employee and contractor, with classification checked",
                        help: "Contractors who look like employees are a liability the buyer will price or make you indemnify. Check right-to-work records, notice periods, restrictive covenants and who is actually on the payroll.",
                    },
                    {
                        id: "owner-comp",
                        label: "A market-rate salary for your own role, shown inside the numbers",
                        help: "The buyer has to pay someone to do your job. Putting that cost in yourself is the difference between an EBITDA the buyer believes and an SDE argument you lose.",
                    },
                    {
                        id: "procedures",
                        label: "Written procedures for the things only you know how to do",
                        help: "The supplier who only answers your calls, the pricing rule in your head, the annual filing nobody else has seen. Write them down. This is transferable value, created for free.",
                    },
                    {
                        id: "suppliers",
                        label: "Supplier contracts, terms and single points of failure listed",
                    },
                    {
                        id: "insurance",
                        label: "Licences, permits, insurance and property leases current, with their assignment terms",
                    },
                ],
            },
            {
                title: "Technology and data",
                items: [
                    {
                        id: "asset-ownership",
                        label: "Domains, repositories, accounts and cloud billing owned by the company, not by you",
                        help: "Personal email addresses on the domain registrar and the app-store account are a surprisingly common reason a close slips. Move everything to company-controlled accounts and record who holds the credentials.",
                    },
                    {
                        id: "licences",
                        label: "Open-source and AI tool licences reviewed for commercial use and output rights",
                        help: "Two questions a 2026 buyer will ask: does any copyleft licence reach your product, and what do the terms of the AI tools you used say about ownership of their output. Answer both before diligence does.",
                    },
                    {
                        id: "privacy",
                        label: "Data protection in order: records of processing, processor agreements, a breach log",
                        help: "If you hold customer personal data, the buyer is acquiring that liability. Inconsistent consent records and missing processor agreements are cheap to fix now and expensive to explain later.",
                    },
                    {
                        id: "security",
                        label: "Access control and offboarding: who can reach what, and what happens when they leave",
                    },
                    {
                        id: "runbook",
                        label: "A runbook: how the product deploys, what infrastructure costs, who holds the keys",
                    },
                    {
                        id: "ai-disclosure",
                        label: "A clear statement of which parts of the product are AI, and whose models they run on",
                        help: "Advisers report that defensible AI businesses clear 8x to 12x revenue in an actual sale while narrative-only ones clear 3x to 5x (FE International, 2026). Overstating it is the fastest way to turn a premium into a discount in the second diligence call.",
                    },
                ],
            },
        ],
    },
};

export const HARVEST_TOOLS: Tool[] = [EXIT_ROUTE, VALUATION, MULTIPLES, DILIGENCE_READY];
