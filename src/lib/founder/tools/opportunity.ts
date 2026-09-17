import type { Tool } from "../types";

// Stage 1 - The opportunity.
// Handbook ch 2 supplies the method (the ten market questions, the Table 2-1
// habit of rating confidence and planning a test, the five characteristics, the
// risk-return line). Appendix B supplies the breakeven maths. The 2026 layer
// (S10) supplies what "it is working" looks like now.
//
// Convention for the calculators here: any output formatted as a percent is in
// percentage points, so 70.7 means 70.7%.

/** Guards against NaN and missing fields so every compute stays total. */
const num = (value: number | undefined): number =>
    typeof value === "number" && Number.isFinite(value) ? value : 0;

const MARKET_EVALUATION: Tool = {
    id: "market-evaluation",
    slug: "market-evaluation",
    stage: "opportunity",
    kind: "worksheet",
    title: "Market evaluation worksheet",
    blurb:
        "The ten questions that turn an idea into an opportunity. Answer each one, say how confident you are, and write down the test that would settle it.",
    ref: "02-opportunity.md",
    basedOn:
        "HBR's Entrepreneur's Handbook, ch 2: the customer and market questions plus the Table 2-1 worksheet",
    featured: true,
    spec: {
        intro:
            "The book's worked example puts an 18% market share in the answer column and the word 'guess' in the confidence column. That honesty is the whole point of this sheet. Answer every row twice if the person who uses your product is not the person who pays for it, because their answers differ. Then look only at the rows where your confidence is low and your business depends on the answer. Those are your next experiments.",
        rows: [
            {
                id: "problem",
                label: "What problem are you solving for your customers or users?",
                help: "Describe the problem, not your solution. If you cannot describe it in detail, you are not ready to build.",
                placeholder:
                    "Who has this problem, how often it bites them, and what it costs them when it does.",
                wantsEvidence: true,
            },
            {
                id: "market-size",
                label: "How many people have this problem?",
                help: "A count of people or businesses, not a research total in billions. You need a number you could sanity-check yourself.",
                placeholder:
                    "e.g. two million electric vehicles on the road worldwide, of which X within twenty miles of me.",
                wantsEvidence: true,
            },
            {
                id: "awareness",
                label: "Do they know they have the problem, or is the need latent?",
                help: "A latent need is not a smaller problem, it is a much more expensive one: you pay to teach the market before you can sell to it.",
                placeholder: "What they say when you describe the problem back to them, in their words.",
                wantsEvidence: true,
            },
            {
                id: "growth",
                label: "Is the market stable or growing, and at what annual rate?",
                help: "Ask whether the local rate matches the national one. It often does not, and you sell locally first.",
                placeholder:
                    "e.g. 32% compound annual growth nationally over four years, local rate unknown.",
                wantsEvidence: true,
            },
            {
                id: "benefit",
                label: "How will your solution benefit them?",
                help: "Name the benefit they would pick, not the one you would. The book's cautionary case assumes buyers want a lower price when what they actually want is convenience.",
                placeholder: "The single change in their day, and how you know they value it.",
                wantsEvidence: true,
            },
            {
                id: "share",
                label: "What share of that market could you reasonably capture in the next few years?",
                help: "This is the row founders are least honest about. Write the number, then write how you would find out whether it is achievable.",
                placeholder: "e.g. 18% of service business within a twenty-mile radius in five years.",
                wantsEvidence: true,
            },
            {
                id: "competition",
                label: "What already fills part of this demand?",
                help: "Include the ugly answers: a spreadsheet, an assistant doing it by hand, doing nothing at all. Those are your real competitors early on.",
                placeholder: "Who or what they use today, and what it costs them.",
                wantsEvidence: true,
            },
            {
                id: "customers",
                label: "Who exactly are the customers? Can you name them and describe them?",
                help: "If you cannot name ten real people or companies, you have a category, not a customer.",
                placeholder: "Ten names, and what they have in common.",
                wantsEvidence: true,
            },
            {
                id: "reach",
                label: "How will you reach them and complete a transaction?",
                help: "Directly, through a distributor or app store, or through an existing retail channel. Each one changes your costs and your margin.",
                placeholder: "The channel, what it costs to use, and the cheapest test of whether it works.",
                wantsEvidence: true,
            },
            {
                id: "substitutes",
                label: "How does the usefulness of your product compare with the substitutes?",
                help: "Be specific about what yours is worse at. A tablet is easier to carry than a laptop and does less. Both halves matter.",
                placeholder: "Better at: ... Worse at: ... Why they would still switch.",
                wantsEvidence: true,
            },
        ],
    },
};

const OPPORTUNITY_SCORE: Tool = {
    id: "opportunity-score",
    slug: "opportunity-score",
    stage: "opportunity",
    kind: "quiz",
    title: "Opportunity scorecard",
    blurb:
        "Five characteristics separate an opportunity from an idea: value, risk-adjusted profit, fit, durability and financeability. Score yours against all five.",
    ref: "02-opportunity.md",
    basedOn:
        "Timmons (2004), four characteristics; Alfred E. Osborne Jr., UCLA Price Center, adds financeability",
    featured: true,
    spec: {
        questions: [
            {
                id: "pain",
                prompt: "How badly does this problem hurt the people who have it?",
                group: "Value to customers",
                help: "Evidence of their pain beats enthusiasm about your solution.",
                options: [
                    { label: "Nobody has complained, I inferred it", score: 0 },
                    { label: "They call it annoying when asked", score: 1 },
                    {
                        label: "They have built their own workaround",
                        score: 2,
                        note: "A workaround is the strongest free evidence you get. Someone spent their own time to avoid this problem.",
                    },
                    { label: "They already pay someone to solve it badly", score: 3 },
                ],
            },
            {
                id: "premium",
                prompt: "Would they pay a premium to have it solved, or only switch if you are cheaper?",
                group: "Value to customers",
                help: "The definition of an opportunity includes a premium. Entering on price alone means the next entrant beats you the same way.",
                options: [
                    { label: "Only if I am the cheapest option", score: 0 },
                    { label: "At roughly what they pay today", score: 1 },
                    { label: "A little more, for a better job", score: 2 },
                    { label: "Clearly more, and one of them has said a number out loud", score: 3 },
                ],
            },
            {
                id: "economics",
                prompt: "Do you know whether you are a thin-margin, high-volume business or a fat-margin, low-volume one?",
                group: "Risk-adjusted profit",
                help: "Supermarket or custom furniture maker. The answer sets your capacity, your marketing and your breakeven.",
                options: [
                    { label: "I have not worked it out", score: 0 },
                    { label: "A rough sense, no numbers", score: 1 },
                    { label: "Modelled with real supplier quotes", score: 2 },
                    { label: "Modelled, and checked against actual sales", score: 3 },
                ],
            },
            {
                id: "payoff",
                prompt: "Does the expected return pay for the risk you are taking, next to a safe local alternative?",
                group: "Risk-adjusted profit",
                help: "The book is blunt about this: why accept a 5% return carrying business risk when a government bond pays nearly as much with none.",
                options: [
                    { label: "I have never compared the two", score: 0 },
                    { label: "The return is close to the safe rate", score: 1 },
                    { label: "Comfortably above it", score: 2 },
                    { label: "Far above it, and it still clears if I halve my revenue assumption", score: 3 },
                ],
            },
            {
                id: "capability",
                prompt: "Do you have the managerial, financial and technical capability this business needs?",
                group: "Fit with you and your team",
                help: "Where a skill is missing, the useful question is not whether you can learn it but whether you can hire it, what it would cost, and what could be contracted out instead.",
                options: [
                    { label: "Missing more than one of the three", score: 0 },
                    { label: "Missing one, with no plan for it", score: 1 },
                    { label: "Missing one, with a named plan to hire or contract it", score: 2 },
                    { label: "All three present in the founding team", score: 3 },
                ],
            },
            {
                id: "commitment",
                prompt: "Is your personal commitment equal to what this will take?",
                group: "Fit with you and your team",
                help: "Capability without commitment fails, and so does the reverse. Both sit inside the fit test.",
                options: [
                    { label: "This is a side interest", score: 0 },
                    { label: "I would commit if it showed early traction", score: 1 },
                    { label: "I am committing evenings and weekends now", score: 2 },
                    { label: "This is what I do, and I have arranged my life around it", score: 3 },
                ],
            },
            {
                id: "fad",
                prompt: "Will the need still be there in five years?",
                group: "Durability",
                help: "Fads die before customer requirements are even understood. It can be worth waiting to see whether a wave has staying power, even in digital markets.",
                options: [
                    { label: "It rides a trend that could pass", score: 0 },
                    { label: "Too new for anyone to say", score: 1 },
                    { label: "The underlying need predates the trend", score: 2 },
                    { label: "The need has existed for years and is growing", score: 3 },
                ],
            },
            {
                id: "barriers",
                prompt: "When your demand becomes visible, what stops the next ten people copying you?",
                group: "Durability",
                help: "Visible demand plus low barriers to entry is the deadly combination: supply floods in, prices fall, everybody suffers.",
                options: [
                    { label: "Nothing, anyone could start next month", score: 0 },
                    { label: "It would take them some effort", score: 1 },
                    { label: "A real barrier: relationships, licences, data, switching costs", score: 2 },
                    {
                        label: "A barrier that grows as we grow, such as a network effect",
                        score: 3,
                        note: "Network effects reward whoever reaches scale first, but only if you build trust between participants, target the right users, and design against being cut out of your own transactions.",
                    },
                ],
            },
            {
                id: "wargame",
                prompt: "Do you know the single worst thing a competitor could do to you, and your response?",
                group: "Durability",
                help: "Name it, such as a 20% price cut, model what it does to your numbers, and decide your answer now rather than in the week it happens.",
                options: [
                    { label: "I have not thought about it", score: 0 },
                    { label: "I can name it, but not its effect on me", score: 1 },
                    { label: "I have modelled the effect", score: 2 },
                    { label: "Modelled, with a response agreed in advance", score: 3 },
                ],
            },
            {
                id: "financeable",
                prompt: "If this needs outside money, would it get funded in today's climate?",
                group: "Financeability",
                help: "A promising idea is not automatically financeable. Investors starved perfectly good biotech ideas of capital from 2000 to 2004 because confidence had gone.",
                options: [
                    { label: "It needs money and I have no idea where from", score: 0 },
                    { label: "It needs money and the climate looks closed", score: 1 },
                    { label: "Fundable once I can show traction", score: 2 },
                    { label: "Fundable now, or it does not need outside money at all", score: 3 },
                ],
            },
        ],
        bands: [
            {
                minPct: 70,
                label: "An opportunity, not just an idea",
                verdict: "go",
                advice: "Answer the two closing questions before you commit. Is it still attractive once you price the risk, and is it better than every other option open to you, including doing nothing. If yes to both, move to the business model stage and start proving the revenue line.",
            },
            {
                minPct: 45,
                label: "Worth testing, not yet worth committing to",
                verdict: "learn",
                advice: "Take your two lowest-scoring characteristics and turn each into an experiment with a date on it. Most low scores here are cheap to fix with customer conversations and a pricing test, and expensive to ignore.",
            },
            {
                minPct: 0,
                label: "Not an opportunity yet",
                verdict: "stop",
                advice: "Stop building and go back to the problem. A low score here almost always traces to one thing: you know your solution far better than you know your customer. Work through the market evaluation sheet and score again in a month.",
            },
        ],
        caveat:
            "Evaluation is not a one-time event. The book treats these as questions you ask over and over as you experiment, not a gate you pass once. Two warnings it makes explicitly. Expense estimates can be built from your own experience, but revenue projections with no customers behind them are the most dangerous trap in the chapter. And every opportunity must be compared with the alternatives available to you, including leaving the money where it is.",
    },
};

const RISK_RETURN: Tool = {
    id: "risk-return",
    slug: "risk-return",
    stage: "opportunity",
    kind: "calculator",
    title: "Risk and return line",
    blurb:
        "Higher risk has to buy higher return. Plot what you expect to earn against the risk you are taking and the safe rate you could have had instead.",
    ref: "02-opportunity.md",
    basedOn: "HBR's Entrepreneur's Handbook, figure 2-2: the risk-versus-return trade-off",
    spec: {
        fields: [
            {
                id: "expectedReturn",
                label: "Expected annual return",
                unit: "%",
                help: "Your realistic annual return on the money and time you put in, not the best case.",
                default: 25,
                min: -100,
                max: 500,
                step: 1,
            },
            {
                id: "riskRating",
                label: "Risk rating",
                help: "1 is a government bond. 10 is a new product in a new market with no customers yet. Most first ventures sit between 7 and 9.",
                default: 8,
                min: 1,
                max: 10,
                step: 1,
            },
            {
                id: "riskFree",
                label: "Local risk-free rate",
                unit: "%",
                help: "Your own government's bond yield, not a US one. The safe alternative is only safe in the currency you actually live in.",
                default: 4,
                min: 0,
                max: 40,
                step: 0.25,
            },
        ],
        outputs: [
            {
                id: "riskPremium",
                label: "Your risk premium",
                formula: "Expected return - risk-free rate",
                help: "What you are actually being paid for leaving the safe option. This is the number that matters, not the headline return.",
                format: "percent",
                good: (outputs) => outputs.riskPremium > 0,
            },
            {
                id: "requiredReturn",
                label: "Required return at this risk",
                formula: "Risk-free rate + (risk rating x 3 points)",
                help: "The book draws the diagonal without numbers, so the slope here is this toolkit's convention rather than a published figure: three points of extra return per point of risk, which asks a maximum-risk venture for 30 points above the safe rate. If you think that is too harsh or too generous, move it. What matters is having a line and refusing what sits below it.",
                format: "percent",
            },
            {
                id: "headroom",
                label: "Distance from the line",
                formula: "Expected return - required return",
                help: "Positive means above the diagonal and worth considering. Negative is the book's point E: the return does not pay for the risk, so reject it.",
                format: "percent",
                good: (outputs) => outputs.headroom >= 0,
            },
            {
                id: "premiumPerPoint",
                label: "Premium per point of risk",
                formula: "Risk premium / risk rating",
                help: "Useful for comparing two very different ideas. A safe business earning a modest premium often beats a wild one earning a large one.",
                format: "percent",
            },
        ],
        compute: (inputs) => {
            const expected = num(inputs.expectedReturn);
            const riskFree = num(inputs.riskFree);
            const rating = Math.min(Math.max(num(inputs.riskRating), 0), 10);
            const riskPremium = expected - riskFree;
            const requiredReturn = riskFree + rating * 3;
            return {
                riskPremium,
                requiredReturn,
                headroom: expected - requiredReturn,
                premiumPerPoint: rating > 0 ? riskPremium / rating : 0,
            };
        },
        rule:
            "Reject anything below the line. The test is not whether the return looks good on its own, it is whether it beats the safe alternative by enough to pay for the risk you carry. Run this again whenever your expected return changes, because it usually falls once real customers arrive.",
    },
};

const BREAKEVEN: Tool = {
    id: "breakeven",
    slug: "breakeven",
    stage: "opportunity",
    kind: "calculator",
    title: "Breakeven calculator",
    blurb:
        "How much you must sell before you earn anything, and what each sale is worth after that. The first number every founder needs.",
    ref: "B-breakeven.md",
    basedOn: "HBR's Entrepreneur's Handbook, appendix B",
    featured: true,
    spec: {
        fields: [
            {
                id: "price",
                label: "Net revenue per unit",
                help: "The price after expected discounts and returns. Sales commission is a variable cost below, not a deduction here. Use one currency throughout.",
                default: 75,
                min: 0,
                step: 1,
            },
            {
                id: "variableCost",
                label: "Variable cost per unit",
                help: "What one more sale costs you: materials, direct labour, energy, payment fees, delivery, commission. Split hybrid costs first, because labour is usually part fixed and part variable.",
                default: 22,
                min: 0,
                step: 1,
            },
            {
                id: "fixedCosts",
                label: "Fixed costs per month",
                help: "Rent, insurance, salaried people, software, loan payments: what you owe at zero sales. Watch for step costs, where a second site or shift pushes this up a band.",
                default: 8000,
                min: 0,
                step: 100,
            },
            {
                id: "plannedVolume",
                label: "Planned units per month",
                help: "Optional. Your realistic monthly volume, used for the profit and safety lines. Leave it at zero if you do not have one yet.",
                default: 400,
                min: 0,
                step: 10,
            },
        ],
        outputs: [
            {
                id: "unitContribution",
                label: "Unit contribution margin",
                formula: "Net revenue per unit - variable cost per unit",
                help: "What each sale contributes towards fixed costs, and then straight to profit once they are covered. If this is zero or negative, no amount of volume saves you: change the price or the cost.",
                format: "money",
                good: (outputs) => outputs.unitContribution > 0,
            },
            {
                id: "contributionRatio",
                label: "Contribution margin ratio",
                formula: "Unit contribution margin / net revenue per unit",
                help: "The share of every unit of revenue left to cover fixed costs. It is what turns a revenue target into a breakeven figure.",
                format: "percent",
                benchmark: {
                    value: "70.7%",
                    context: "the book's worked example, 53 of a 75 price, plastic wall-mounted hat rack",
                    source: "HBR's Entrepreneur's Handbook, appendix B",
                    year: 2018,
                    ref: "B-breakeven.md",
                },
            },
            {
                id: "breakevenUnits",
                label: "Breakeven volume",
                formula: "Fixed costs / unit contribution margin, rounded up",
                help: "Now ask the question the book insists on. Is that many sales a realistic slice of the demand you found, given what competitors already hold, and how quickly can you get there.",
                format: "number",
                benchmark: {
                    value: "1,887 units",
                    context: "worked example: 75 price, 22 variable cost, 100,000 of new equipment",
                    source: "HBR's Entrepreneur's Handbook, appendix B",
                    year: 2018,
                    ref: "B-breakeven.md",
                },
            },
            {
                id: "breakevenRevenue",
                label: "Breakeven revenue",
                formula: "Fixed costs / contribution margin ratio",
                help: "The same answer in money, which is easier to compare with a sales target or with a competitor's turnover.",
                format: "money",
            },
            {
                id: "marginOfSafety",
                label: "Margin of safety",
                formula: "(Planned units - breakeven units) / planned units",
                help: "How far sales can fall short of plan before you are losing money. If demand comes in 25% under plan, this says whether that is survivable or fatal.",
                format: "percent",
                benchmark: {
                    value: "37.1%",
                    context: "worked example at a planned 3,000 units against 1,887 to break even",
                    source: "HBR's Entrepreneur's Handbook, appendix B (derived)",
                    year: 2018,
                    ref: "B-breakeven.md",
                },
                good: (outputs) => outputs.marginOfSafety >= 25,
            },
            {
                id: "profitAtPlanned",
                label: "Profit at planned volume",
                formula: "(Planned units x unit contribution margin) - fixed costs",
                help: "Monthly profit before tax if the plan holds. Breakeven is the floor, not the goal, and this is the number that says whether the floor is worth standing on.",
                format: "money",
                good: (outputs) => outputs.profitAtPlanned > 0,
            },
        ],
        compute: (inputs) => {
            const price = num(inputs.price);
            const variableCost = num(inputs.variableCost);
            const fixedCosts = num(inputs.fixedCosts);
            const plannedVolume = num(inputs.plannedVolume);

            const unitContribution = price - variableCost;
            const contributionRatio = price > 0 ? (unitContribution / price) * 100 : 0;
            const breakevenUnits = unitContribution > 0 ? Math.ceil(fixedCosts / unitContribution) : 0;
            const breakevenRevenue = contributionRatio > 0 ? fixedCosts / (contributionRatio / 100) : 0;
            const marginOfSafety =
                plannedVolume > 0 && breakevenUnits > 0
                    ? ((plannedVolume - breakevenUnits) / plannedVolume) * 100
                    : 0;
            const profitAtPlanned = plannedVolume > 0 ? plannedVolume * unitContribution - fixedCosts : 0;

            return {
                unitContribution,
                contributionRatio,
                breakevenUnits,
                breakevenRevenue,
                marginOfSafety,
                profitAtPlanned,
            };
        },
        rule:
            "High fixed costs with low variable costs give you a high breakeven and high profits beyond it. Low fixed with high variable gives a low breakeven and a thinner profit after it. Neither is right on its own: the question is how certain your demand is. The book's pharmaceutical example earns 99 of contribution on a 100 bottle but carries about 400 million of development cost first, which is extraordinary after breakeven and ruinous before it. A consulting firm has almost no fixed cost and almost no explosive upside.",
    },
};

const PMF_LEVEL: Tool = {
    id: "pmf-level",
    slug: "pmf-level",
    stage: "opportunity",
    kind: "quiz",
    title: "Which level of product-market fit are you at?",
    blurb:
        "Product-market fit is not a switch. Score satisfaction, demand and efficiency to find your level, and learn what that level says you can safely ignore.",
    ref: "modern/S10-launch-method-2026.md",
    basedOn:
        "Todd Jackson / First Round Capital, Levels of PMF (2024); the Sean Ellis test; Rachitsky and Winters retention benchmarks (2020)",
    spec: {
        questions: [
            {
                id: "ellis",
                prompt: "What share of users say they would be very disappointed if they could no longer use your product?",
                group: "Satisfaction",
                help: "The Sean Ellis test, benchmarked on about 100 startups at a 40% threshold. Ask people who have actually used the thing recently.",
                options: [
                    { label: "I have not asked", score: 0 },
                    {
                        label: "Under 20%",
                        score: 1,
                        note: "Superhuman started at 22%, reached 33% in a single quarter and then 47%, by segmenting to the people who already loved it. A low score is a starting point, not a verdict.",
                    },
                    { label: "20% to 39%", score: 2 },
                    { label: "40% or more within my best segment", score: 3 },
                ],
            },
            {
                id: "segment",
                prompt: "Can you describe the person who is very disappointed, in enough detail to go and find more of them?",
                group: "Satisfaction",
                help: "The route up from a low score is to segment to the supporters, write the high-expectation-customer profile, and ignore the people who would not miss you.",
                options: [
                    { label: "No, I treat all users the same", score: 0 },
                    { label: "A rough sense of who they are", score: 1 },
                    { label: "A written profile", score: 2 },
                    { label: "A written profile that roadmap and acquisition decisions actually follow", score: 3 },
                ],
            },
            {
                id: "retention",
                prompt: "What do your cohort retention curves do?",
                group: "Satisfaction",
                help: "A curve that flattens is the real fit signal. The survey is a leading indicator of it, not a replacement for it.",
                options: [
                    { label: "I do not measure cohorts", score: 0 },
                    { label: "They decline towards zero", score: 1 },
                    { label: "Too early to tell", score: 2 },
                    {
                        label: "They flatten and hold",
                        score: 3,
                        note: "If your curve has not flattened, do not spend on acquisition. Paid growth leaks straight out of the bottom.",
                    },
                ],
            },
            {
                id: "retentionLevel",
                prompt: "Where does your month-six retention sit against your category?",
                group: "Satisfaction",
                help: "Good and great at month six: consumer social 25% and 45%, consumer transactional 30% and 50%, consumer SaaS 40% and 70%, SMB and mid-market SaaS 60% and 80%, enterprise SaaS 70% and 90% (Rachitsky with Winters, 2020, drawn from 20 growth practitioners and public data).",
                options: [
                    { label: "I do not know", score: 0 },
                    { label: "Below the good line", score: 1 },
                    { label: "At or above good", score: 2 },
                    { label: "At or above great", score: 3 },
                ],
            },
            {
                id: "traction",
                prompt: "Where are your revenue and customer count?",
                group: "Demand",
                help: "First Round's bands for B2B software (2024): Level 1 is 0 to 500K a year with 3 to 5 customers, Level 2 is 500K to 5M with 5 to 25, Level 3 is 5M to 25M, Level 4 is 25M and above.",
                options: [
                    { label: "No paying customers yet", score: 0 },
                    { label: "A handful of paying customers, under 500K a year", score: 1 },
                    { label: "500K to 5M a year", score: 2 },
                    { label: "Over 5M a year", score: 3 },
                ],
            },
            {
                id: "nrr",
                prompt: "What happens to revenue from the customers you already have, over a year?",
                group: "Demand",
                help: "Net revenue retention. Level 2 needs 100% or better, Level 3 is above 110%, Level 4 above 120%. Under 100% at 500K to 5M means you are below Level 2 and should not be raising on a fit story.",
                options: [
                    { label: "It shrinks noticeably", score: 0 },
                    { label: "Roughly flat, under 100%", score: 1 },
                    { label: "100% to 110%", score: 2 },
                    { label: "Above 110%", score: 3 },
                ],
            },
            {
                id: "pull",
                prompt: "How much new demand arrives without you chasing it?",
                group: "Demand",
                help: "Word of mouth above 10% of inbound is one of First Round's Level 3 markers. Below that, growth is still something you push rather than something that pulls.",
                options: [
                    { label: "None, every deal is chased", score: 0 },
                    { label: "The occasional referral", score: 1 },
                    { label: "A steady trickle of inbound", score: 2 },
                    { label: "More than one in ten new customers comes from word of mouth", score: 3 },
                ],
            },
            {
                id: "commitment",
                prompt: "What is the strongest thing your users have actually done?",
                group: "Demand",
                help: "The evidence ladder runs: said they liked it, gave an email, booked a call, spent real time in a pilot, introduced a colleague, paid, renewed. Only the last two count as demand.",
                options: [
                    { label: "Told me they like it", score: 0 },
                    { label: "Given me an email address or booked a call", score: 1 },
                    { label: "Spent real time in a pilot, or introduced a colleague", score: 2 },
                    { label: "Paid, and then renewed or expanded", score: 3 },
                ],
            },
            {
                id: "efficiency",
                prompt: "What do your gross margin and burn look like?",
                group: "Efficiency",
                help: "Level 2 wants gross margin of 50% or better and a burn multiple of 5x or less. Level 3 wants 60% to 70% margin, burn multiple 1x to 3x, and CAC payback under 18 months. Ignore this question entirely if you are at Level 1.",
                options: [
                    { label: "I do not track them", score: 0 },
                    { label: "Margin under 50%, or burn multiple above 5x", score: 1 },
                    { label: "Margin 50% to 70%, burn multiple 1x to 5x", score: 2 },
                    { label: "Margin above 70%, burn multiple under 1x", score: 3 },
                ],
            },
        ],
        bands: [
            {
                minPct: 80,
                label: "Level 4: Extreme fit",
                verdict: "go",
                advice: "Protect it. First Round's own framing is that extreme fit takes two to six years to reach and can be lost again, so keep the survey and the cohort curves running quarterly. The work now is holding the position: workflow depth, proprietary data, compliance and distribution, stacked at least two deep.",
            },
            {
                minPct: 58,
                label: "Level 3: Strong fit",
                verdict: "go",
                advice: "This is the level at which spending on growth is rational, because the bottom of the bucket is sealed. Use net revenue retention and CAC payback as the gate on every increase in spend, and keep the survey as a quarterly company objective rather than a one-off.",
            },
            {
                minPct: 33,
                label: "Level 2: Developing fit",
                verdict: "learn",
                advice: "You have real customers and real churn. The route up is Vohra's engine: segment to the users who would be very disappointed, study the somewhat-disappointed who value your main benefit, and split the roadmap roughly half to deepening what supporters love and half to removing what blocks the rest. Do not scale headcount or spend yet.",
            },
            {
                minPct: 0,
                label: "Level 1: Nascent fit",
                verdict: "learn",
                advice: "At this level churn, gross margin and burn multiple are noise. The only question is whether three to five customers genuinely need you, or whether you are still in the friend zone. Recruit users by hand, over-serve them, and ask about their past behaviour rather than their future intentions.",
            },
        ],
        caveat:
            "Two honest limits. First, the 40% line was never published with a vertical or a geography attached, and practitioners treat it as noise below about 100 responses, so if you have fewer users than that, read retention curves and interviews instead of a percentage. Second, First Round's thresholds come from US business software, so if you sell to consumers, sell offline, or sell outside the US, treat the bands as a shape rather than a scoreboard. The shape is what travels: satisfaction first, then demand, then efficiency, in that order.",
    },
};

export const OPPORTUNITY_TOOLS: Tool[] = [
    MARKET_EVALUATION,
    OPPORTUNITY_SCORE,
    RISK_RETURN,
    BREAKEVEN,
    PMF_LEVEL,
];
