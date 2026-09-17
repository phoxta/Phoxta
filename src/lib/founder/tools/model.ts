import type { Tool } from "../types";

// Stage 2 - Model and strategy.
// Handbook ch 3 supplies the structure: the five questions (p41), Magretta's
// narrative and numbers tests (p42-43), Hamermesh & Marshall's four groups
// (p43), Johnson's model analogies (Table 3-1, p45) and Porter's three
// positions (p51-52). The 2026 layer (S10, S07) supplies the pricing evidence
// and replaces "moat" hand-waving with Helmer's benefit-plus-barrier test.

const FIVE_QUESTIONS: Tool = {
    id: "five-questions",
    slug: "five-questions",
    stage: "model",
    kind: "worksheet",
    title: "The five questions",
    blurb:
        "Five answers you must be able to give to anyone who asks, in a sentence each. If you cannot, you do not yet have a business model.",
    ref: "03-business-model-and-strategy.md",
    basedOn: "HBR's Entrepreneur's Handbook (2018), ch 3 p41; Magretta's two tests, p42-43",
    featured: true,
    spec: {
        intro:
            "The handbook opens chapter 3 with five questions and is blunt that every founder must have concise answers to all of them. Write each one as you would say it out loud to a customer, an investor or your first hire. Long answers are a sign you have not decided yet. Keep the two ideas apart in your head as you go: the model says who your customers are and how you profitably serve them, the strategy says why they pick you over a rival.",
        rows: [
            {
                id: "value",
                label: "1. How will the business create value for customers?",
                help: "Name the customer and the change you make for them. Value is what they get, not what you build. If you cannot say what a customer does differently on Tuesday because of you, you are describing a product, not value.",
                placeholder:
                    "We save independent letting agents about six hours a week by turning viewing requests into a filled diary without anyone retyping anything.",
                wantsEvidence: true,
            },
            {
                id: "profit",
                label: "2. How will it make a profit for you and your investors?",
                help: "Price, volume, and what it costs you to serve one more customer. The numbers test comes later, but the story has to be arithmetic even here: who pays, how much, how often, and what is left.",
                placeholder:
                    "£79 a month per branch, gross margin about 80% once support is staffed, and a branch pays back its acquisition cost inside five months.",
                wantsEvidence: true,
            },
            {
                id: "differentiate",
                label: "3. How will it differentiate itself from competitors?",
                help: "Bruce Henderson's rule, quoted in the handbook: two competitors cannot coexist doing business the same way, so one of you perishes. Being different is not enough either. The difference has to be one customers value, such as lower cost, convenience, reliability, speed, or how the thing looks and feels. Porter's three positions are the usual sources: variety-based (a narrow slice of the industry's offerings), need-based (all the needs of one identifiable group) or access-based (reaching customers others cannot reach easily).",
                placeholder:
                    "Need-based: we serve single-branch agents only, so the product assumes one person does everything, which the enterprise tools cannot assume.",
                wantsEvidence: true,
            },
            {
                id: "defend",
                label: "4. How will it defend its assets and position from competitors?",
                help: "Answer this one twice. First for today: what stops the nearest rival copying you this quarter? Then for the day after you are working: what happens when a copycat raises money, or when a large platform adds your idea as a feature? Work through the moat audit in this stage before you settle on an answer.",
                placeholder:
                    "Two years of matched viewing and outcome data per branch, plus a direct integration into the two CRMs these agents already run.",
                wantsEvidence: true,
            },
            {
                id: "discovered",
                label: "5. How will it be discovered?",
                help: "The handbook puts marketing at the centre of the model from day one, not downstream. Table-stakes channels do not count on their own: every rival buys the same ads and optimises the same store listing. Name at least one route to buyers that takes work or a relationship a competitor does not have.",
                placeholder:
                    "The regional agents' association newsletter, plus a monthly walk-in clinic in three towns. Paid search is the top-up, not the plan.",
                wantsEvidence: true,
            },
            {
                id: "narrative",
                label: "The narrative test: read your five answers back as one story",
                help: "Joan Magretta's first test, quoted in the handbook: does the model tell a logical, sensible story? Read the five answers aloud, in order, to somebody who does not work with you. If they have to ask a clarifying question about how one answer connects to the next, that joint is where the model is broken. Write down the objection they raised rather than the answer you gave them.",
                placeholder:
                    "Where it wobbled: I claim word of mouth between agents, but I also claim they compete fiercely with each other locally.",
            },
            {
                id: "unsure",
                label: "Which of these five are you least sure of, and how will you test it?",
                help: "The handbook's point about the business-model canvas is that most of what you have just written is a hypothesis, not a decision. Confidence rises sharply when you test the shaky ones before building the offering or approaching an investor. Pick the weakest answer and name the cheapest test that could prove it wrong this month.",
                placeholder:
                    "Question 5. Test: ask twenty agents where they found their last piece of software, before I spend anything on ads.",
                wantsEvidence: true,
            },
        ],
    },
};

const MODEL_BUILDER: Tool = {
    id: "model-builder",
    slug: "model-builder",
    stage: "model",
    kind: "worksheet",
    title: "Business model builder",
    blurb:
        "The four groups of decisions the handbook says you must answer unambiguously before you approach any investor: revenue, costs, capital, and what must go right.",
    ref: "03-business-model-and-strategy.md",
    basedOn:
        "Hamermesh & Marshall's four groups, HBR's Entrepreneur's Handbook (2018) p43; model analogies adapted from Mark W. Johnson, Seizing the White Space, Table 3-1 p45",
    featured: true,
    spec: {
        intro:
            "A business model is a variation on the value chain: making (design, purchasing, production) plus selling (finding and reaching customers, transacting, delivering). Hamermesh and Marshall break the decisions into four groups. The handbook is direct about why this matters: ambiguous answers here are why investor conversations end early, and a model that fails either of Magretta's two tests should be fixed before you do anything else.",
        rows: [
            {
                id: "revenue-sources",
                label: "Revenue sources: where does the money come from?",
                help: "List every stream, not just the main one: product sales, service fees, subscriptions, commission on a transaction, advertising, licensing. For each, say who writes the cheque. In a marketplace or an ad-funded model the user and the payer are different people, and confusing the two is the classic error.",
                placeholder:
                    "1. Monthly subscription, paid by the branch owner. 2. One-off data migration fee. 3. Nothing from the tenant, ever.",
                wantsEvidence: true,
            },
            {
                id: "fixed-costs",
                label: "Cost drivers, part one: fixed costs you pay whether you sell anything or not",
                help: "Rent, salaries, insurance, software licences, and your own living costs if the business must cover them. The handbook asks you to separate fixed from variable explicitly, because breakeven is fixed costs divided by contribution per unit, and you cannot work that out until you have split them.",
                placeholder: "Rent £900/mo, two salaries £6,400/mo, tooling £310/mo, insurance £95/mo.",
            },
            {
                id: "variable-costs",
                label: "Cost drivers, part two: what rises with every extra sale",
                help: "Goods bought for resale, materials, delivery, payment fees, per-seat licences you pass on, and in an AI product the inference cost per task. Work out what it costs to serve one more customer for a month. If you cannot name that number, you cannot price.",
                placeholder:
                    "Payment fees 1.9% plus 20p, hosting about £0.40 per branch per month, model calls about £1.10 per branch per month.",
            },
            {
                id: "launch-capital",
                label: "Investment size, part one: capital to launch",
                help: "The measurable capital needed to reach the first sale: equipment, deposits, build cost, legal and registration, initial stock, the first version of the product. Count the work you will do unpaid as a real cost, because if you fall ill somebody has to be paid to do it.",
                placeholder:
                    "£14,000 total: laptop and test devices £2,300, legal and registration £900, build £8,000, first stock and deposits £2,800.",
            },
            {
                id: "working-capital",
                label: "Investment size, part two: working capital to keep operating",
                help: "The handbook treats this as a separate calculation on purpose, and it is the one founders skip. You need enough cash to cover the gap between paying your suppliers and being paid by your customers, for as long as that gap lasts. A business can be profitable on paper and still die in that gap. If your customers pay 60 days late, you are financing them.",
                placeholder: "Nine months of fixed costs (£69,000) plus one quarter of receivables at 45-day terms.",
                wantsEvidence: true,
            },
            {
                id: "success-factors",
                label: "Critical success factors: what must go right",
                help: "The handbook's own examples are a sustained new-product rollout and reaching critical mass within a set time. Write three at most, each one something that, if it failed, would end the business rather than dent it. Vague factors such as execute well or hire great people are not factors.",
                placeholder:
                    "1. Two CRM integrations approved by their vendors. 2. Forty paying branches inside twelve months. 3. Churn under 2% a month.",
                wantsEvidence: true,
            },
            {
                id: "untested",
                label: "Of those factors, which are you unsure about, and how will you test it before building or pitching?",
                help: "This is the instruction chapter 3 repeats: test the essential factors you are unsure of before you build the offering or approach investors, and confidence in success rises sharply. An incubator or accelerator is one way to speed this up, but a week of phone calls is usually faster and cheaper.",
                placeholder:
                    "The CRM integrations. Test: email both vendor partner teams this week and ask what approval actually requires. Cost: nothing.",
                wantsEvidence: true,
            },
            {
                id: "analogy",
                label: "Which model analogy fits the problem you are solving?",
                help: "Table 3-1 lists nineteen analogies, adapted from Mark W. Johnson's Seizing the White Space, and asks how each might apply to your problem: affinity club (pay royalties for exclusive access to a large organisation's members), brokerage (a fee per transaction between buyer and seller), bundling, tiered service levels, crowdsourcing, disintermediation (sell direct), fractionalization (sell partial use), freemium, leasing, low-touch (lower price by cutting service), negative operating cycle (get paid before you deliver), pay as you go, razor and blades, reverse razor and blades, reverse auction, product to service (sell what the product does, as Zipcar does), standardization, subscription, and user communities. Try several against your problem, including the ones that feel wrong. Most new models are old models moved into a new market.",
                placeholder:
                    "Subscription as the base, with a negative operating cycle: annual plans paid up front fund the support hires.",
            },
            {
                id: "numbers-test",
                label: "The numbers test: on a pro forma income statement with reasonable projections, is it profitable?",
                help: "Magretta's second test. Build the projection from the revenue and cost lines above, then check it against the breakeven calculator in the previous stage. Reasonable means a number you would defend to somebody who knows the industry. The handbook's worked example is deliberately mundane: a repair shop with a crew of five and 8,000 billable service-hours a year, where everything above breakeven is profit.",
                placeholder:
                    "Profitable in month 19 at 61 branches. Breakeven volume 44 branches. Assumes four new branches a month from month 6.",
                wantsEvidence: true,
            },
            {
                id: "what-changes",
                label: "What could change about these assumptions?",
                help: "For every hypothesis, the handbook asks what could change it. The stock example is having no competitors today and three next year. Add the ones specific to you: a supplier raising prices, a platform changing its terms, a regulation, a customer group whose ability to pay falls. This list is your risk register, and each line needs a mitigation you could actually execute.",
                placeholder:
                    "A CRM vendor ships this as a feature. Mitigation: hold the data rights and the branch relationship first, so their feature is a worse version of us.",
                wantsEvidence: true,
            },
        ],
    },
};

const PRICING_DESIGNER: Tool = {
    id: "pricing-designer",
    slug: "pricing-designer",
    stage: "model",
    kind: "quiz",
    title: "Pricing model designer",
    blurb:
        "Six questions that route you to a pricing model: flat, per seat, usage, hybrid or outcome-based. Answer about what actually scales, not about what you would like to charge.",
    ref: "modern/S10-launch-method-2026.md",
    basedOn:
        "Madhavan Ramanujam & Georg Tacke, Monetizing Innovation (2016); Kyle Poyar's 2026 B2B and AI monetisation survey",
    spec: {
        questions: [
            {
                id: "value-metric",
                prompt: "What grows as a customer gets more value out of you?",
                group: "Value metric",
                help: "Ramanujam calls this the value metric: the thing you meter should be the thing that rises when the customer is winning. If your meter and their value move apart, every renewal becomes an argument.",
                options: [
                    { label: "Nothing much. The value is about the same every month", score: 0 },
                    {
                        label: "The number of people who use it",
                        score: 1,
                        note: "That is a seat metric, and it is the one most associated with an expansion-revenue problem.",
                    },
                    { label: "The amount of work the product does: jobs, messages, documents, calls", score: 3 },
                    { label: "The number of results it produces: tickets resolved, hires made, claims settled", score: 4 },
                ],
            },
            {
                id: "cost-per-use",
                prompt: "Does it cost you meaningfully more when a customer uses you more?",
                group: "Cost shape",
                help: "If serving heavy users costs you real money, flat pricing hands your best customers your margin. AI products get this wrong most often, because inference is a variable cost dressed up as a software cost.",
                options: [
                    { label: "No. My costs are essentially fixed", score: 0 },
                    { label: "A little, but it rounds to nothing", score: 1 },
                    { label: "Yes, noticeably: compute, delivery, materials or per-transaction fees", score: 3 },
                    {
                        label: "Yes, and it is one of the largest lines in my cost base",
                        score: 4,
                        note: "Poyar's 2026 survey found the median AI gross-margin target is 50%, and only 12% of companies aim at 80% or better. Price so the meter covers the cost.",
                    },
                ],
            },
            {
                id: "measurable",
                prompt: "How measurable is the result you produce?",
                group: "Measurability",
                help: "Outcome pricing only works when both sides see the same number in the same place and neither disputes it. Attribution arguments are where outcome deals die.",
                options: [
                    { label: "You cannot really measure it", score: 0 },
                    { label: "You could, with effort, and the customer would argue about it", score: 1 },
                    { label: "Measurable, but the credit is shared with things you do not control", score: 2 },
                    { label: "Both sides already see the same number in a shared system", score: 4 },
                ],
            },
            {
                id: "buyer-norm",
                prompt: "What do buyers in this market already buy today?",
                group: "Buyer expectation",
                help: "You can break a market's pricing convention, but you then pay for that education out of your first two years. Know which fight you are picking.",
                options: [
                    { label: "A one-off purchase or a project fee", score: 0 },
                    { label: "A flat licence or a per-person subscription", score: 1 },
                    { label: "A base fee with something metered on top", score: 3 },
                    { label: "Consumption or per-result contracts, already normal here", score: 4 },
                ],
            },
            {
                id: "expansion",
                prompt: "A year in, where does more revenue from an existing customer come from?",
                group: "Expansion path",
                help: "This separates a pricing model from a price. If the only way to grow an account is to raise the price, you have no expansion path, and net revenue retention will sit below 100% however happy your customers are.",
                options: [
                    {
                        label: "Nowhere, unless I put the price up",
                        score: 0,
                        note: "Fix this before launch. Retrofitting an expansion path onto a signed customer base is far harder than designing one.",
                    },
                    { label: "They add more people", score: 1 },
                    { label: "They run more work through the same account", score: 3 },
                    { label: "They give me a share of a bigger result", score: 4 },
                ],
            },
            {
                id: "predictability",
                prompt: "How predictable does the bill need to be for this buyer?",
                group: "Budget tolerance",
                help: "Procurement teams and small-business owners hate a bill that moves. A variable model in a fixed-budget market needs caps, commitments or prepaid credits, or it will lose deals you should have won.",
                options: [
                    { label: "Fixed budget. Any variability kills the deal", score: 0 },
                    { label: "They prefer predictable and will accept a cap or a commitment", score: 2 },
                    { label: "They are comfortable with a bill that moves month to month", score: 3 },
                    { label: "They already budget variably for this category, like cloud or advertising", score: 4 },
                ],
            },
        ],
        bands: [
            {
                minPct: 80,
                label: "Outcome-based: charge per result",
                verdict: "learn",
                advice:
                    "Your value, your costs and your measurement all point at charging per result, and investors agree in principle: in Kyle Poyar's 2026 survey of 230 B2B software and AI companies, 26% named outcome-based their preferred model, second only to hybrid. Treat it as the model to work towards rather than the one to launch on. Settle three things first: the exact event that counts as a result, who arbitrates a disputed one, and how you recognise the revenue, which Deloitte published specific guidance on for agentic AI products in 2026 because it is genuinely hard. The usual route is to launch hybrid, meter the results quietly for two quarters, then switch once the number is boring.",
            },
            {
                minPct: 64,
                label: "Usage-based: charge for what they consume",
                verdict: "go",
                advice:
                    "Meter the unit of work, not the person. Pick the unit the customer already counts in their own head, publish the rate, and let them start small. Two things to get right: a floor, so tiny accounts still cover your support cost, and a cap or an alert, so nobody receives a bill that ends the relationship. If you pay your costs before you are paid, watch the working-capital gap you wrote down in the model builder.",
            },
            {
                minPct: 46,
                label: "Hybrid: a subscription base plus consumption",
                verdict: "go",
                advice:
                    "This is where the market has landed. In Poyar's 2026 survey hybrid pricing rose from 25% to 37% of companies in twelve months, 29% now sell AI credits with a further 33% planning to inside a year, and 35% of investors named hybrid their preferred model, more than any other. The base covers the fixed cost of serving the account and makes the bill predictable enough for procurement. The meter captures the value and the variable cost. Size the credit pack so a normal month sits comfortably inside it and a great month spills over.",
            },
            {
                minPct: 28,
                label: "Per seat: charge per person",
                verdict: "learn",
                advice:
                    "Per seat is still real. In the same 2026 survey it remained the most common single model at 29% among companies above $150M ARR, and buyers understand it without explanation. But it is the model drifting hardest: one aggregate tracked seat-based pricing falling from 21% to 15%, and only 5% of investors named it their preferred model. Go per seat if value genuinely scales with headcount, and add a second meter for anything that costs you money per use, so growth in usage is not pure margin loss.",
            },
            {
                minPct: 0,
                label: "Flat fee or one-off: keep it simple",
                verdict: "go",
                advice:
                    "Nothing in your answers scales, so do not invent a meter to look modern. A flat monthly fee or a one-off price is honest and cheap to sell. Two cautions. A flat fee with no expansion path caps every account forever, so plan the second product or the premium tier now rather than later. And if you sell one-off, you start from zero every month, which changes what you can afford to spend to acquire a customer.",
            },
        ],
        caveat:
            "Where the numbers come from: the pricing-mix figures are Kyle Poyar's survey of 230 B2B software and AI companies run April to May 2026, so they describe B2B software, not shops, agencies or consumer products. One secondary aggregate reports seat-based pricing falling from 21% to 15%, and Gartner expects at least 40% of enterprise SaaS spend to be usage, agent or outcome based by 2030, which is a forecast rather than a measurement. The reason to do this before you build is Simon-Kucher's finding behind Monetizing Innovation (Ramanujam & Tacke, 2016): 72% of innovations miss their financial targets, mostly for pricing reasons rather than product reasons. Last, this quiz picks a model, not a price. For a price, ask what customers pay today for the workaround, use van Westendorp's four questions (1976) to get a range rather than a number, and then run a live test, because stated willingness to pay is reliably higher than actual.",
    },
};

const MOAT_AUDIT: Tool = {
    id: "moat-audit",
    slug: "moat-audit",
    stage: "model",
    kind: "quiz",
    title: "Moat audit",
    blurb:
        "Ten dimensions of defensibility, scored honestly. Most early businesses have a head start rather than a moat, and it is better to know that now.",
    ref: "modern/S10-launch-method-2026.md",
    basedOn:
        "Hamilton Helmer, 7 Powers (2016); NFX on network effects; the handbook's network-effects box (Van Alstyne, Parker & Choudary, HBR, April 2016)",
    spec: {
        questions: [
            {
                id: "switching",
                prompt: "What would a customer have to rip out to leave you?",
                group: "Switching costs",
                help: "Helmer's test for every power is a benefit plus a barrier. Here the barrier is the cost, risk and hassle of leaving. Count integrations, migrated history, retrained staff and rewritten processes, not how much they like you.",
                options: [
                    { label: "Nothing. They cancel and use something else on Monday", score: 0 },
                    { label: "Some data to export and a bit of retraining", score: 1 },
                    { label: "Data, settings and a process their team has learned", score: 2 },
                    { label: "Several integrations plus years of history they cannot take with them", score: 3 },
                    {
                        label: "A project with a budget, an owner and a real chance of going wrong",
                        score: 4,
                        note: "Helmer finds switching costs and scale economies to be the two most common powers in practice.",
                    },
                ],
            },
            {
                id: "network",
                prompt: "Does each new user measurably make the product better for the others?",
                group: "Network economies",
                help: "Be strict. More users making your company richer is not a network effect. More users making the product better for existing users is. If you cannot describe the mechanism in one sentence, you do not have one.",
                options: [
                    { label: "No. Users never encounter each other", score: 0 },
                    { label: "Only in a vague, marketing sense", score: 1 },
                    { label: "A little: benchmarks, templates or a community", score: 2 },
                    { label: "Yes, and I can name the mechanism and point at the metric", score: 3 },
                    {
                        label: "Yes, and one self-sustaining network already runs without me pushing it",
                        score: 4,
                        note: "The handbook warns against scaling a network business before the model is tested. VRBO preceded Airbnb and eBay preceded Alibaba in China, and neither first mover won.",
                    },
                ],
            },
            {
                id: "scale",
                prompt: "Does your cost per unit fall as you grow?",
                group: "Scale economies",
                help: "The classic supply-side advantage: bigger means cheaper per unit, so a smaller rival cannot match your price and survive. Service businesses usually score low here and should say so rather than pretend otherwise.",
                options: [
                    { label: "No. Every new customer costs roughly the same to serve", score: 0 },
                    { label: "Slightly, on overheads", score: 1 },
                    { label: "Yes, on purchasing or by spreading fixed costs", score: 2 },
                    { label: "Yes, meaningfully. Volume changes what I can charge", score: 3 },
                    { label: "Yes, and a rival at a tenth my size could not profitably match my price", score: 4 },
                ],
            },
            {
                id: "brand",
                prompt: "Do buyers choose you first, or pay more, because of who you are?",
                group: "Branding",
                help: "Brand counts as a power only when it changes behaviour or price, not when it means you have a nice logo. In 2026 a16z's Casado and Wang argued brand is becoming a genuine moat in AI applications, precisely because the underlying capability is available to everyone.",
                options: [
                    { label: "Nobody has heard of us", score: 0 },
                    { label: "A few customers know us", score: 1 },
                    { label: "We are one of the names mentioned in our niche", score: 2 },
                    { label: "We are the first name mentioned in our niche", score: 3 },
                    { label: "Buyers pay a premium for us over an equivalent product", score: 4 },
                ],
            },
            {
                id: "counter",
                prompt: "Is there something incumbents cannot copy without damaging their own business?",
                group: "Counter-positioning",
                help: "Helmer's counter-positioning: you adopt a model the established player will not follow, because following it would wreck their existing profits. It is the power that most often lets a small company beat a large one, and it is temporary, because one day their old business is small enough to abandon.",
                options: [
                    { label: "No. They could do exactly what we do tomorrow", score: 0 },
                    { label: "It would be awkward for them", score: 1 },
                    { label: "It would annoy an important channel or customer group of theirs", score: 2 },
                    { label: "It would cannibalise a profitable line they depend on", score: 3 },
                    { label: "It would break their business model, and I can explain exactly how", score: 4 },
                ],
            },
            {
                id: "resource",
                prompt: "Do you have exclusive access to something rivals cannot simply buy?",
                group: "Cornered resource",
                help: "A licence, a long-term exclusive contract, a patent that actually blocks, rights to a dataset, a location, or a team that will not leave. Ask what happens if a funded competitor offers double for it. If it is available at a price, it is not cornered.",
                options: [
                    { label: "No", score: 0 },
                    { label: "A head start that money would close", score: 1 },
                    { label: "A relationship that would take a rival a year to build", score: 2 },
                    { label: "A contract or right that is exclusive for now", score: 3 },
                    { label: "Exclusive, durable, and written down", score: 4 },
                ],
            },
            {
                id: "process",
                prompt: "Do you operate in a way a rival could not copy by hiring your people?",
                group: "Process power",
                help: "The hardest power to acquire and the slowest to build: an operating capability spread across a whole organisation, which is why it resists copying. Almost no startup has it in year one. Score honestly, and expect to score low.",
                options: [
                    { label: "No. It is me and a few good habits", score: 0 },
                    { label: "We are faster than rivals, for now", score: 1 },
                    { label: "We have documented processes that outperform the norm", score: 2 },
                    { label: "Our way of working consistently beats rivals on a measured metric", score: 3 },
                    { label: "Rivals have tried to copy it and failed", score: 4 },
                ],
            },
            {
                id: "workflow",
                prompt: "How much of the customer's actual work happens inside your product?",
                group: "Workflow depth",
                help: "One of the two moats the 2026 evidence says still holds in AI products. A tool used once a quarter is replaceable. A tool the team lives in all day, which holds the record of what happened, is not.",
                options: [
                    { label: "They use us occasionally, for one task", score: 0 },
                    { label: "One task, but a regular one", score: 1 },
                    { label: "Several connected tasks", score: 2 },
                    { label: "A whole workflow from start to finish", score: 3 },
                    { label: "We are where the work lives, and the record of it", score: 4 },
                ],
            },
            {
                id: "data",
                prompt: "What do you accumulate that a rival with the same technology could not buy or scrape within a quarter?",
                group: "Data loop",
                help: "Be sceptical of your own answer here. a16z argued in 2019 that most claimed data moats are empty. The test is not whether you have data, it is whether more of it measurably improves the product in a way customers feel, and whether a rival could get the same data elsewhere.",
                options: [
                    { label: "Nothing. Our data is public or purchasable", score: 0 },
                    { label: "We have data, but it does not improve the product", score: 1 },
                    { label: "Proprietary data that helps a bit", score: 2 },
                    { label: "Proprietary data that measurably improves results, and compounds", score: 3 },
                    { label: "A loop where using the product generates data that makes it better, which a rival cannot start", score: 4 },
                ],
            },
            {
                id: "distribution",
                prompt: "Do you own a route to buyers that a rival would have to pay for?",
                group: "Distribution",
                help: "The other moat that holds up in 2026, and the one founders undervalue because it is not technical. An audience, an exclusive partnership, a channel relationship, a place inside somebody else's product. The handbook makes the same point in reverse: relying only on table-stakes channels every rival also buys is not a plan.",
                options: [
                    { label: "No. We buy attention at the market rate, like everyone else", score: 0 },
                    { label: "A personal network", score: 1 },
                    { label: "An audience or a list we built", score: 2 },
                    { label: "A partner or channel that reaches buyers for us", score: 3 },
                    { label: "A channel we control that buyers already use daily", score: 4 },
                ],
            },
        ],
        bands: [
            {
                minPct: 55,
                label: "A real moat, in at least two places",
                verdict: "go",
                advice:
                    "Name your two strongest dimensions and write one sentence each: the benefit customers get, and the barrier that stops a competitor copying it. That pairing is Helmer's whole test, and the sentence is what an investor is actually asking for when they ask about defensibility. Then spend deliberately on those two rather than spreading effort evenly, and put a date in the calendar to check whether the barrier still holds.",
            },
            {
                minPct: 30,
                label: "A thin moat: a head start, not a barrier",
                verdict: "learn",
                advice:
                    "You have something, but nothing yet that would survive a well-funded copycat. The instruction from the 2026 evidence is to stack at least two of workflow depth, data loop, compliance and distribution, rather than hoping one deepens on its own. Pick the two you can move furthest in the next two quarters and make them explicit product decisions: which integration, whose data, which channel. Until then, assume your advantage is a head start measured in months and act with that urgency.",
            },
            {
                minPct: 0,
                label: "No moat yet",
                verdict: "stop",
                advice:
                    "Stop describing this as defensible, to investors and to yourself. That is not the same as stopping the business. Plenty of good businesses compete on speed, service or price in a niche too small to interest anyone larger, and that is a legitimate answer as long as you say it out loud. What you cannot do is plan as though you are protected. Decide which of the three you are actually playing, then pick one dimension above and start building it deliberately, because none of them appear by accident.",
            },
        ],
        caveat:
            "How to read this score: it is a structured self-assessment, not a measurement, and founders reliably over-score themselves on data and brand. The frameworks behind it are Hamilton Helmer's 7 Powers (2016), which holds that every durable power needs both a benefit and a barrier and finds scale economies and switching costs the most common; NFX's multi-year study attributing roughly 70% of technology value created since 1994 to network effects and cataloguing sixteen distinct types; and the handbook's own network-effects box (Van Alstyne, Parker & Choudary, HBR, April 2016), which warns that classic moat thinking misreads platforms, where outside participants add value rather than deplete it. The contested part is AI defensibility: a16z argued in 2019 that most data moats are empty, then argued in 2026 that value is accruing at the application layer and that brand is becoming a real moat, so treat any confident claim here with suspicion. One market signal worth knowing: inference costs fell more than 280 times between late 2022 and late 2024, and thin application wrappers have been changing hands at roughly 3 to 8 times revenue against 25 to 40 times for businesses with proprietary data and intellectual property. Finally, Rita McGrath's argument (2013 onward) applies to a high score as much as a low one: advantage is transient, so the question is never only what your moat is, but what will replace it when it goes.",
    },
};

export const MODEL_TOOLS: Tool[] = [FIVE_QUESTIONS, MODEL_BUILDER, PRICING_DESIGNER, MOAT_AUDIT];
