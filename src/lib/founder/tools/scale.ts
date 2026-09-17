import type { Tool } from "../types";

// Stage 8 - Scaling up.
// Handbook ch 10 supplies the three post-startup questions, the four mechanisms
// for barring the door to competitors and the outsourcing rules; ch 11 supplies
// Roberts' four leadership approaches. The 2026 layer (S11) supplies the founder
// mode argument, the span and layer evidence, and the numbers on how often AI
// reaches the P&L (S07).

/** Treat missing, NaN and negative entries as zero so the maths never breaks. */
const clean = (value: number | undefined): number =>
    typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;

const GROWTH_GATE: Tool = {
    id: "growth-gate",
    slug: "growth-gate",
    stage: "scale",
    kind: "quiz",
    title: "The growth gate",
    blurb:
        "The three questions the handbook says you must re-ask once revenue is growing, plus the one it treats as the quiet killer: can the back office keep up?",
    ref: "10-sustaining-growth.md",
    basedOn: "HBR's Entrepreneur's Handbook, ch 10, the three post-startup growth questions (p. 174)",
    featured: true,
    spec: {
        questions: [
            {
                id: "advantage",
                prompt: "What is your advantage actually based on?",
                group: "Is the strategy sustainable?",
                help: "The handbook's three candidates are a new or superior product or technology, a lower price, or extreme convenience. None of them lasts on its own.",
                options: [
                    {
                        label: "We are cheaper than the alternatives",
                        score: 0,
                        note: "The most copyable advantage there is. Someone will arrive cheaper, and they will have a lower cost base because they started later.",
                    },
                    { label: "A better product or technology than the alternatives", score: 1 },
                    { label: "Convenience customers would genuinely miss", score: 2 },
                    {
                        label: "Something customers have built into how they work",
                        score: 3,
                        note: "Switching cost is the advantage that survives a better competitor arriving.",
                    },
                ],
            },
            {
                id: "threat",
                prompt: "Could what happened to Blockbuster happen to you?",
                group: "Is the strategy sustainable?",
                help: "Blockbuster led the market in 1993. Netflix's mail service, then Redbox, then on-demand cable ate it; the last stores closed in 2013.",
                options: [
                    { label: "We have not looked at it that way", score: 0 },
                    { label: "We can name the threat but have done nothing about it", score: 1 },
                    { label: "We track the threat and have a plan on paper", score: 2 },
                    { label: "We are already building the thing that would replace us", score: 3 },
                ],
            },
            {
                id: "barriers",
                prompt: "How many of the four barriers are you actually building?",
                group: "Is the strategy sustainable?",
                help: "Exploit the learning curve; do not price for maximum profit; continually refresh the offer; stay vigilant about who will try to stop you.",
                options: [
                    { label: "None of them", score: 0 },
                    { label: "One", score: 1 },
                    { label: "Two", score: 2 },
                    { label: "Three or four", score: 3 },
                ],
            },
            {
                id: "pricing",
                prompt: "How do you price against what the market would bear?",
                group: "Is the strategy sustainable?",
                options: [
                    {
                        label: "At the maximum we can get",
                        score: 0,
                        note: "The handbook is blunt: high margins advertise the opportunity. You are paying for today's profit with tomorrow's competitor.",
                    },
                    { label: "Near the maximum, and we know it", score: 1 },
                    { label: "Below the maximum, mostly by accident", score: 2 },
                    {
                        label: "Deliberately modest, agreed with our investors",
                        score: 3,
                        note: "Only works if everyone funding you has accepted the smaller margin in advance.",
                    },
                ],
            },
            {
                id: "newmarkets",
                prompt: "Have you tested whether customers somewhere else have the same needs?",
                group: "Do the advantages travel?",
                help: "The rule is narrow: expand only where needs are the same or similar to the ones you serve now.",
                options: [
                    { label: "No, we assume they do", score: 0 },
                    { label: "We have desk research only", score: 1 },
                    { label: "We have talked to buyers in one new region", score: 2 },
                    { label: "We have sold to buyers in a new region and it worked the same way", score: 3 },
                ],
            },
            {
                id: "newuses",
                prompt: "Can the same product serve new uses or niches without new invention?",
                group: "Do the advantages travel?",
                help: "Baking soda sold more by becoming a fridge deodoriser and a cat-litter additive. Swatch built dozens of watches on identical movements and changed only the case.",
                options: [
                    { label: "No, growth depends on building something new", score: 0 },
                    { label: "Maybe, we have not tried", score: 1 },
                    { label: "We have one new use or niche variant in the market", score: 2 },
                    { label: "New uses and niche variants are a standing part of the plan", score: 3 },
                ],
            },
            {
                id: "capacity",
                prompt: "Can you add capacity fast enough to serve the demand you expect in twelve months?",
                group: "Is scaling practical?",
                help: "Service firms scale by hiring scarce, expensive people. Product firms commit capital a year or more before the first unit ships.",
                options: [
                    { label: "No, and we know demand will outrun us", score: 0 },
                    { label: "Probably not, we have not modelled it", score: 1 },
                    { label: "Yes, with a hiring or capital plan we have written down", score: 2 },
                    { label: "Yes, and we have already proved the mechanism once", score: 3 },
                ],
            },
            {
                id: "outsourcing",
                prompt: "What have you handed to a partner?",
                group: "Is scaling practical?",
                help: "Outsourcing lets you grow without owning fixed assets. The handbook draws one hard line.",
                options: [
                    {
                        label: "Sales, customer service, market research or product development",
                        score: 0,
                        note: "Never outsource the links to customers. Those links are how you learn about them and how they learn about you. Outsource them and they become your partner's customers.",
                    },
                    { label: "Some work that touches customers occasionally", score: 1 },
                    { label: "Nothing yet, we do it all ourselves", score: 2 },
                    { label: "Peripheral work only, with every customer link kept in-house", score: 3 },
                ],
            },
            {
                id: "partner",
                prompt: "What happens if your largest partner or supplier stops doing business with you?",
                group: "Is scaling practical?",
                options: [
                    { label: "We would be out of business for months", score: 0 },
                    { label: "We would be badly hurt and have no alternative lined up", score: 1 },
                    { label: "We have an alternative identified but not tested", score: 2 },
                    { label: "The work is split across more than one partner already", score: 3 },
                ],
            },
            {
                id: "finance",
                prompt: "Who keeps payments, collections and spending on an even keel?",
                group: "Can the support functions keep up?",
                help: "The handbook's warning is that without a knowledgeable finance function a growing enterprise can capsize and sink.",
                options: [
                    { label: "I do, between other jobs", score: 0 },
                    { label: "A bookkeeper, after the fact", score: 1 },
                    { label: "An accountant, with monthly management accounts", score: 2 },
                    { label: "A finance lead or CFO who owns the numbers", score: 3 },
                ],
            },
            {
                id: "support",
                prompt: "Which support functions have actually grown with sales?",
                group: "Can the support functions keep up?",
                help: "Customer service, marketing, transaction accounting, after-sales service, retention, and the HR capacity to recruit, comply with labour law and run benefits.",
                options: [
                    { label: "None, they are all where they were a year ago", score: 0 },
                    { label: "One or two", score: 1 },
                    { label: "Most of them", score: 2 },
                    { label: "All of them, and we staff them ahead of the sales curve", score: 3 },
                ],
            },
            {
                id: "funding",
                prompt: "How will you fund the growth, and do you know what that funding costs you?",
                group: "Can the support functions keep up?",
                help: "Debt raises your fixed expenses and therefore your risk. Outside equity dilutes your ownership, and your control.",
                options: [
                    { label: "We have not worked out what growth will cost in cash", score: 0 },
                    { label: "We know the number, not where it comes from", score: 1 },
                    { label: "We have a source lined up and have accepted its cost", score: 2 },
                    { label: "Growth is funded from operations, or from capital already raised", score: 3 },
                ],
            },
        ],
        bands: [
            {
                minPct: 70,
                label: "Scale",
                verdict: "go",
                advice: "The three questions come back yes and the back office can take the load. Go to the leadership stage next: at this point the constraint moves from the business to how you run it. Keep the four barriers on a standing agenda, because the advantage you have now is the one competitors are currently pricing.",
            },
            {
                minPct: 45,
                label: "Fix first",
                verdict: "learn",
                advice: "You have one or two answers that will break under volume. Look at your lowest-scoring group. If it is support functions, fix it before you push sales any harder: finance, HR and customer service are the things that sink companies quietly while the revenue line still looks good. If it is strategy, name what would replace you and build the barrier now rather than later.",
            },
            {
                minPct: 0,
                label: "Hold",
                verdict: "stop",
                advice: "Do not spend money accelerating this yet. Growth here would amplify problems rather than solve them. Pick the two weakest answers, fix them, and re-run this in a quarter. Growing into an unsustainable strategy or an unstaffed back office is how promising businesses fail after they start working.",
            },
        ],
        caveat:
            "Growth is a mixed blessing, especially fast growth. Keeping pace with demand normally needs outside capital, and every pound of it has a cost: debt raises your fixed expenses and your risk, outside equity dilutes your ownership and your control (HBR's Entrepreneur's Handbook, ch 10, 2018). On blitzscaling: Hoffman and Yeh's 2018 thesis of speed over efficiency was repriced after 2022 toward capital efficiency and runway. There is no formal recantation, so treat that as a shift in practice rather than a revision of the argument.",
    },
};

const LEADERSHIP_MODE: Tool = {
    id: "leadership-mode",
    slug: "leadership-mode",
    stage: "scale",
    kind: "quiz",
    title: "Which leadership mode are you in?",
    blurb:
        "Roberts' four approaches: managing content, behaviours, results, context. Where the company is, how your week actually goes, and what you run on.",
    ref: "11-leadership.md",
    basedOn: "HBR's Entrepreneur's Handbook, ch 11, Table 11-1 (Roberts' four leadership approaches)",
    featured: true,
    spec: {
        questions: [
            {
                id: "headcount",
                prompt: "How many people work in the business, including you?",
                group: "Where the business is",
                help: "Roberts maps each mode to a situation: young and simple, somewhat larger, large and complex, very large and mature.",
                options: [
                    { label: "Up to 5", score: 0 },
                    { label: "6 to 20", score: 1 },
                    { label: "21 to 75", score: 2 },
                    { label: "More than 75", score: 3 },
                ],
            },
            {
                id: "experience",
                prompt: "How experienced are the people doing the work?",
                group: "Where the business is",
                help: "Inexperienced staff who need clear direction are the case for managing behaviours. Experienced people solving problems with no clear guidelines are the case for results or context.",
                options: [
                    { label: "New to the work, they need telling", score: 0 },
                    { label: "Capable if I prescribe how", score: 1 },
                    { label: "They reach better outcomes by their own means", score: 2 },
                    { label: "They are better at their jobs than I would be", score: 3 },
                ],
            },
            {
                id: "worktype",
                prompt: "What kind of work is it?",
                group: "Where the business is",
                help: "Rigid, by-the-book rules built McDonald's and would have wrecked IDEO. The mode has to fit the work, not only the size.",
                options: [
                    { label: "Repeatable, and there is a right way to do it", score: 0 },
                    { label: "Mostly repeatable with judgement at the edges", score: 1 },
                    { label: "Problems with no clear guidelines", score: 2 },
                    { label: "Work where the goal itself has to be invented", score: 3 },
                ],
            },
            {
                id: "week",
                prompt: "Where did most of your last working week actually go?",
                group: "How your week actually goes",
                help: "Answer from your calendar, not your intentions.",
                options: [
                    { label: "On the front line, doing the work or directly supervising it", score: 0 },
                    { label: "Writing process and procedure, and observing whether people follow it", score: 1 },
                    { label: "Reviews, plans, budgets, reports and memos", score: 2 },
                    { label: "Key hires, promotions and tone-setting events", score: 3 },
                ],
            },
            {
                id: "decisions",
                prompt: "How many decisions still have to come to you?",
                group: "How your week actually goes",
                help: "One of the seven signals that a firm needs professional management is that every decision must be made at the top.",
                options: [
                    { label: "Nearly all of them", score: 0 },
                    { label: "Anything outside the written rules", score: 1 },
                    { label: "Only the ones that change the plan or the budget", score: 2 },
                    { label: "Almost none; I set the context and hire the people", score: 3 },
                ],
            },
            {
                id: "timeleft",
                prompt: "As volume and scope grow, how much hands-on time do you still have?",
                group: "How your week actually goes",
                options: [
                    { label: "Enough, for now", score: 0 },
                    { label: "Less each month, and I feel it", score: 1 },
                    { label: "Very little, and I have stopped trying to keep it", score: 2 },
                    { label: "None, by design, and the business does not need it", score: 3 },
                ],
            },
            {
                id: "tools",
                prompt: "What does the business run on when you are not in the room?",
                group: "What you run on",
                help: "Each mode has its own tools: action and decisions; policies, procedures and behaviour audits; plans, budgets, structure and systems; communication and leadership by example.",
                options: [
                    { label: "Me. Nothing is written down", score: 0 },
                    { label: "Policies, procedures and someone checking they are followed", score: 1 },
                    { label: "Plans, budgets and an organising structure", score: 2 },
                    { label: "A stated mission, operating principles and people who were hired for them", score: 3 },
                ],
            },
            {
                id: "critics",
                prompt: "Who tells you objectively when your grip is too tight or too loose?",
                group: "What you run on",
                help: "The handbook's answer is the management team, the board, your funders, an advisory board or an executive coach. Someone has to be unafraid to say it.",
                options: [
                    { label: "Nobody, and I would probably not take it well", score: 0 },
                    { label: "Nobody, but I would listen", score: 1 },
                    { label: "One person does, occasionally", score: 2 },
                    { label: "Several people do, and it has changed what I did", score: 3 },
                ],
            },
        ],
        bands: [
            {
                minPct: 78,
                label: "Managing context, and the company is built for it",
                verdict: "go",
                advice: "Your tools are communication and leadership by example: key hires and promotions, the mission and operating principles, the events that set the tone. Spend your time selecting and developing people and almost none saying what or how. The thing to watch is whether you still have a way to hear what is really happening; context mode without a skip-level channel turns into ignorance mode.",
            },
            {
                minPct: 55,
                label: "Managing results, moving toward context",
                verdict: "go",
                advice: "You define what the outcome must look like and hand over the how, supplying resources, training and motivation. The tools of this mode are plans, budgets and an organising structure. The move to context is about shaping culture, values and structure so that competent people are attracted, stay, and do their best work without you defining each outcome. Start with who you hire and promote.",
            },
            {
                minPct: 32,
                label: "Managing behaviours, moving toward results",
                verdict: "learn",
                advice: "You codify how people should act in policies, rules, procedures and job design, then audit compliance. That frees your time while keeping control, and it is right when people are inexperienced. It rests on two assumptions: that the prescribed behaviour produces the result, and that it is the only route to it. When either fails, move to results: define the outcome, hand over the means, and switch your tools to plans, budgets and structure.",
            },
            {
                minPct: 0,
                label: "Managing content, moving toward behaviours",
                verdict: "learn",
                advice: "You do the work yourself or directly supervise those who do. That is the right mode for a young, small, simple business and it gives you maximum control. It fails when your own time and energy cannot keep pace, or when a new challenge needs skills you do not have. The next step is behaviours: write down what good looks like, put it into procedure and job design, then audit it. If your situation answers scored much higher than your week answers, you are late to this transition, and not recognising when content mode has stopped being appropriate is the failure that kills businesses.",
            },
        ],
        caveat:
            "Read the group scores, not only the total. The questions about where the business is measure what the situation demands; the questions about your week measure what you actually do. A gap between them is the diagnosis. Roberts' own position is that there is no best way to manage a business, only a best mode for a particular company at a particular point, that modes can be mixed (hands-on with a newly appointed manager while running the whole operation on results), and that the transitions between modes are where things break. Note also that the 2026 debate argues the opposite direction on purpose: see the founder mode table before you take this as an instruction to step back everywhere.",
    },
};

const FOUNDER_MODE: Tool = {
    id: "founder-mode",
    slug: "founder-mode",
    stage: "scale",
    kind: "reference",
    title: "Founder mode versus stepping back",
    blurb:
        "A live disagreement about how deep a founder should go. Paul Graham's 2024 essay against the handbook's delegate-and-step-back model, with what supports and what argues against each claim.",
    ref: "modern/S11-leadership-and-scaling-2026.md",
    basedOn: "Graham, Founder Mode (2024); Yeh, evidence mode (2024); HBR's Entrepreneur's Handbook ch 11",
    spec: {
        columns: ["The claim", "What supports it", "What argues against it"],
        rows: [
            [
                "Founders should engage below the org chart, not only through direct reports",
                {
                    value: "Graham's essay, September 2024",
                    context:
                        "written after Brian Chesky's talk at Y Combinator; argues the standard advice to hire good people and give them room is manager-mode advice that leaves founders feeling gaslit. Jobs's annual retreat for Apple's 100 most important people, regardless of title, is the archetype",
                    source: "Paul Graham, Founder Mode",
                    year: 2024,
                    ref: "modern/S11",
                    url: "https://paulgraham.com/foundermode.html",
                },
                "Chesky says he never used the phrase, and frames the practice as being in the details without micromanaging (Skift, 2024). Graham concedes the mode is undescribed: as far as he knows there are no books specifically about it. An essay is a hypothesis, not a method.",
            ],
            [
                "Hire good people and give them room to do their jobs",
                "Roberts' four modes and Bhide's argument that sustainability comes from broadening the capabilities of the firm, not the entrepreneur (HBR's Entrepreneur's Handbook, ch 11, 2018). The book names three costs of a founder who will not adapt: employee initiative is smothered and the best people leave, opportunities are missed because the organisation can only run at the founder's pace, and the company's scope is capped by the founder's knowledge.",
                "Graham's charge is that this treats the team as a black box you are not allowed to open, and that founders are told it by people who have only ever been managers. The handbook's chapter 11 prescribes almost exactly the trajectory the essay attacks.",
            ],
            [
                "One side of this argument has been tested",
                "Neither has. The essay moved the debate within weeks because it named something founders recognised, not because it measured anything.",
                "Founder mode is a widely read blog essay: no trial, no dataset, no control group, no measured outcome. The delegate-and-step-back model is not a trial either; it rests on Roberts' framework and practitioner observation. Treat both as arguments, and be suspicious of anyone citing either as evidence.",
            ],
            [
                "Depth should vary by task, not by personality",
                "Grove's task-relevant maturity: go deep where the team is new to the problem, back off where it is not. This is the best reconciliation the 2024 to 2026 debate produced, and the handbook already allows it: Roberts says you can be hands-on with a newly appointed manager while running the overall operation on results.",
                "It asks you to judge your own bias honestly, and the founders who most need the rule are the least able to apply it. It also gives no answer at the moment of the decision, which is when you need one.",
            ],
            [
                "The founder may overrule anyone",
                "Yeh's evidence mode (2024) keeps the override but puts guardrails on it: you may overrule, but only on evidence and in the whole company's interest, and the rule is written down in advance.",
                "Yeh's own warning is that in weak hands founder mode becomes a solipsistic system of governance where anything and anyone might be overruled. Graham predicted the same failure: once the mode has a name, it becomes an excuse.",
            ],
            [
                "Flatter organisations move faster",
                {
                    value: "72% at four or fewer layers",
                    context:
                        "companies earning most revenue from AI, versus 56% of peers; about 300 software executives, 87% North America",
                    source: "ICONIQ, 2026 State of AI Report",
                    year: 2026,
                    ref: "modern/S11",
                },
                "The survey does not establish direction. Whether flat companies go faster, or fast companies end up flat, is not shown by it. Gallup finds no single optimal team size: what predicts engagement is manager quality, manager time spent on individual-contributor work, and weekly meaningful feedback.",
            ],
            [
                "Founders who cannot adapt should hand over",
                {
                    value: "About 25% replaced by Series A, more than 50% by Series C",
                    context: "founder-CEOs in a dataset of 10,000 startups; fewer than 40% still founder-led at Series D",
                    source: "Wasserman, Organization Science and HBR",
                    year: 2008,
                    ref: "modern/S11",
                },
                "That dataset is venture-backed companies from 2003 to 2008, and says nothing about the far larger population of businesses that never raise. The handbook's own failure mode also bites here: a founder who makes a show of turning over the reins and then keeps controlling everything has produced the illusion of letting go, not a handover.",
            ],
            [
                "Going deeper everywhere is sustainable for the founder",
                {
                    value: "37% anxiety, 36% burnout",
                    context:
                        "founders surveyed for the Untold Toll series; startup employees report worse on both, and a founder who cannot show vulnerability propagates it downward",
                    source: "Startup Snapshot",
                    year: 2025,
                    ref: "modern/S11",
                },
                "Nothing in the founder mode argument addresses the founder's own capacity, and the handbook's opposite case (personal energy and time are finite while the need to direct keeps growing) is the older half of the same point. If you are the only person with full context, the company is one burnout away from a crisis.",
            ],
        ],
        note:
            "This table exists to show the disagreement rather than resolve it. The useful working rule that both sides can live with: if you are the bottleneck on everything, that is manager-mode failure; if you are the bottleneck on nothing, that is founder-mode failure. Decide it per decision, write down the three areas you will stay deep in permanently and the three you have delegated with the authority to be wrong, and tell everyone which is which.",
    },
};

const AI_NATIVE: Tool = {
    id: "ai-native",
    slug: "ai-native",
    stage: "scale",
    kind: "quiz",
    title: "Are you AI-native, AI-enabled or AI-decorated?",
    blurb:
        "The remove test and the model-swap test, plus the question that actually separates the two: how many workflows have been redesigned rather than merely assisted.",
    ref: "modern/S07-ai-native-company.md",
    basedOn: "CRV, What Is AI-Native? (2026); McKinsey State of AI (2026); MIT NANDA (2025)",
    spec: {
        questions: [
            {
                id: "remove",
                prompt: "Turn the AI off tomorrow morning. What happens to your product?",
                group: "The remove test",
                help: "CRV's test, March 2026: if it degrades you are AI-enabled, if it stops you are AI-native.",
                options: [
                    { label: "Nothing. The AI is internal tooling, not product", score: 0 },
                    {
                        label: "It gets slower or less polished, customers still get value",
                        score: 1,
                        note: "That is AI-enabled. It is a perfectly good business. It is not an architecture claim, so do not price or pitch it as one.",
                    },
                    { label: "One or two features stop working", score: 2 },
                    {
                        label: "The product stops. There is nothing left to sell",
                        score: 3,
                        note: "That is AI-native: the AI is the architecture, not a feature on top of it.",
                    },
                ],
            },
            {
                id: "modelswap",
                prompt: "A materially better base model ships tomorrow. What happens to you?",
                group: "The model-swap test",
                help: "The harder commercial question. Does a better model make you more valuable, or make you redundant?",
                options: [
                    {
                        label: "It probably does what we do, natively",
                        score: 0,
                        note: "Then you are a feature, and the countdown is running. Name what would survive the swap before you raise on this.",
                    },
                    { label: "No real change either way", score: 1 },
                    { label: "We get better, but so does every competitor", score: 2 },
                    { label: "We get materially more valuable, because of what sits around the model", score: 3 },
                ],
            },
            {
                id: "survives",
                prompt: "What survives if the model were swapped out tomorrow?",
                group: "The model-swap test",
                help: "The candidates that hold up: workflow, distribution, brand, data loops, deep integrations customers cannot rip out.",
                options: [
                    { label: "Honestly, the prompt", score: 0 },
                    { label: "Our interface and our users' habits", score: 1 },
                    { label: "Workflow and integrations customers have built around us", score: 2 },
                    { label: "All of that plus a data loop that gets better with use", score: 3 },
                ],
            },
            {
                id: "redesign",
                prompt: "Of your ten most time-consuming workflows, how many have been redesigned around AI rather than having AI bolted onto them?",
                group: "Operating model",
                help: "This is the question with the strongest evidence behind it. Bolting a chatbot onto a human-shaped process is the modal failure.",
                options: [
                    { label: "None", score: 0 },
                    { label: "One or two", score: 1 },
                    { label: "Three to five", score: 2 },
                    {
                        label: "Six or more",
                        score: 3,
                        note: "About 75% of the firms McKinsey classes as high performers redesigned workflows, against about 25% of everyone else.",
                    },
                ],
            },
            {
                id: "baseline",
                prompt: "Before the AI went in, did you measure the baseline?",
                group: "Operating model",
                help: "Time, volume, error rate and cost, recorded before the change. Without it you will report a feeling.",
                options: [
                    { label: "No, and we have claimed a productivity gain anyway", score: 0 },
                    { label: "No, but we have not claimed anything", score: 1 },
                    { label: "For some of it, roughly", score: 2 },
                    { label: "Yes, with before and after figures we would show a sceptic", score: 3 },
                ],
            },
            {
                id: "evals",
                prompt: "How do you know the output is good?",
                group: "Reliability",
                options: [
                    { label: "It seems fine", score: 0 },
                    { label: "We spot-check when something looks wrong", score: 1 },
                    { label: "We hand-read real traces and have named our failure modes", score: 2 },
                    { label: "That, plus binary judges and a regression alarm on every model or prompt change", score: 3 },
                ],
            },
            {
                id: "unitcost",
                prompt: "Do you know your inference cost per successful task?",
                group: "Reliability",
                help: "Per successful task, not per call. Inference runs at roughly 20 to 23% of AI product cost, and AI-native gross margins sit near 52% against 75 to 85% for conventional software.",
                options: [
                    { label: "No idea", score: 0 },
                    { label: "We know the monthly bill", score: 1 },
                    { label: "We know cost per call", score: 2 },
                    { label: "We know cost per successful task and route cheap models first", score: 3 },
                ],
            },
            {
                id: "humanloop",
                prompt: "Where being wrong is expensive and irreversible (refunds, pricing, contracts), who decides?",
                group: "Reliability",
                options: [
                    { label: "The model, unsupervised", score: 0 },
                    { label: "The model, with a review nobody really does", score: 1 },
                    { label: "A person approves before it goes out", score: 2 },
                    { label: "A person decides, and we automate only where errors are cheap and visible", score: 3 },
                ],
            },
        ],
        bands: [
            {
                minPct: 70,
                label: "AI-native",
                verdict: "go",
                advice: "You pass the remove test, you can name what survives a model swap, and the workflows behind it have actually been rebuilt. Keep two things current: the routing and cost work, because the blended token price fell 41% in six months and last quarter's architecture is often last quarter's cost, and the evals, because without hand-read traces you cannot tell a regression from a bad day.",
            },
            {
                minPct: 40,
                label: "AI-enabled",
                verdict: "learn",
                advice: "The AI improves a product whose value existed before it. That is a real business and most good companies are here. Do not claim AI-native to investors, because they apply these two tests now. If you want to move, the lever is workflow redesign rather than more tools: pick the three processes eating the most hours, instrument the baseline, then rebuild the process around what the model can actually do.",
            },
            {
                minPct: 0,
                label: "AI-decorated",
                verdict: "stop",
                advice: "There is a model in the product and very little behind it. The fix is unglamorous and it is the same one every time: map the ten workflows that eat the most team hours, classify each as automate, augment or leave alone, measure the baseline before you buy anything, and rebuild one process properly rather than adding a second chatbot. Also stop describing this as AI-native in public, because the tests above are now applied in diligence.",
            },
        ],
        caveat:
            "What the evidence actually says about AI reaching the P&L: MIT's NANDA study found 95% of enterprise generative-AI pilots delivered no measurable P&L impact (52 interviews, 153 surveys, 300 deployments, 2025). McKinsey's 2026 survey of 1,719 respondents found 80% reporting individual productivity gains against 37% reporting any EBIT impact, with high performers (5% or more of EBIT attributable to AI) at just 6%, flat year on year. Only 17 to 20% of US firms tell the Census Bureau they actually use AI in producing their goods or services (BTOS, 2025 to 2026), despite 88% organisational adoption in global surveys. METR's randomised trial found experienced developers were 19% slower with AI while believing they were 20% faster. Gartner expects more than 40% of agentic AI projects to be cancelled by end-2027. None of this says AI does not work. It says the gap between using it and banking it is where almost everyone is standing.",
    },
};

const SPAN_DESIGNER: Tool = {
    id: "span-designer",
    slug: "span-designer",
    stage: "scale",
    kind: "calculator",
    title: "Span and layer designer",
    blurb:
        "How many people each manager carries today, how many layers your target span implies, and how many managers you would actually need to run it.",
    ref: "modern/S11-leadership-and-scaling-2026.md",
    basedOn: "Gallup span-of-control analysis (2025); ICONIQ State of AI (2026)",
    spec: {
        fields: [
            {
                id: "headcount",
                label: "Total headcount",
                unit: "people",
                help: "Everyone in the business including you and including the managers.",
                default: 60,
                min: 1,
                max: 100000,
                step: 1,
            },
            {
                id: "managers",
                label: "How many of them manage people",
                unit: "people",
                help: "Anyone with at least one direct report, including you. Count the reality, not the job titles.",
                default: 6,
                min: 0,
                max: 100000,
                step: 1,
            },
            {
                id: "layers",
                label: "Layers today, from you to a junior contributor",
                unit: "layers",
                help: "Count yourself as layer one. If you have to ask someone, that is itself a finding.",
                default: 3,
                min: 1,
                max: 12,
                step: 1,
            },
            {
                id: "targetSpan",
                label: "Average team size you want",
                unit: "reports per manager",
                help: "Gallup's median across 92,252 teams is 5 to 6 and the mean is 12.1. Pick the number you can actually staff with managers who still give weekly feedback.",
                default: 8,
                min: 1,
                max: 60,
                step: 1,
            },
        ],
        outputs: [
            {
                id: "currentSpan",
                label: "Current average span",
                formula: "(total headcount - 1) / number of managers",
                help: "Everyone except you reports to someone, so this is the average number of direct reports each manager carries today.",
                format: "number",
                benchmark: {
                    value: "12.1 average, 5 to 6 median",
                    context: "92,252 teams across 104 organisations, 26 industries and 46 countries",
                    source: "Gallup, Span of Control analysis",
                    year: 2025,
                    ref: "modern/S11",
                },
                good: (outputs) => outputs.currentSpan >= 5 && outputs.currentSpan <= 12.1,
            },
            {
                id: "impliedLayers",
                label: "Layers implied by your target span",
                formula: "ceiling of log(headcount) / log(target span)",
                help: "The shallowest structure that fits everyone at your chosen team size. Compare it with the layers you run today: fewer means your target removes a layer, more means it adds one.",
                format: "number",
                benchmark: {
                    value: "72% at four layers or fewer",
                    context:
                        "companies earning most revenue from AI, versus 56% of peers; about 300 software executives surveyed. The survey does not show which way the causation runs",
                    source: "ICONIQ, 2026 State of AI Report",
                    year: 2026,
                    ref: "modern/S11",
                },
                good: (outputs, inputs) => outputs.impliedLayers > 0 && outputs.impliedLayers <= clean(inputs.layers),
            },
            {
                id: "managersNeeded",
                label: "Managers needed at that span",
                formula: "ceiling of (total headcount - 1) / target span",
                help: "How many people would have to be managing for your target team size to be real across the whole company.",
                format: "number",
                benchmark: {
                    value: "under 40% of a manager's time on individual-contributor work",
                    context:
                        "the threshold above which manager effectiveness drops in Gallup's meta-analysis; a manager who is mostly still doing the work is not one of these numbers",
                    source: "Gallup, Span of Control analysis",
                    year: 2025,
                    ref: "modern/S11",
                },
            },
            {
                id: "gap",
                label: "Gap against what you have",
                formula: "managers needed at target span - managers today",
                help: "Positive means you are short of managers and someone is carrying too many people. Negative means you have more managers than your target span needs, which is what a delayering decision actually looks like before anyone says the word.",
                format: "number",
                benchmark: {
                    value: "+15% ratio of individual contributors to managers",
                    context:
                        "Amazon's company-wide directive to every senior leadership team, announced September 2024 for delivery by end of Q1 2025",
                    source: "Amazon (Andy Jassy memo), via About Amazon and CNBC",
                    year: 2024,
                    ref: "modern/S11",
                },
                good: (outputs) => Math.abs(outputs.gap) <= 1,
            },
        ],
        compute: (inputs) => {
            const headcount = clean(inputs.headcount);
            const managers = clean(inputs.managers);
            const targetSpan = clean(inputs.targetSpan);

            const reports = headcount > 1 ? headcount - 1 : 0;
            const currentSpan = managers > 0 ? reports / managers : 0;
            const managersNeeded = targetSpan > 0 ? Math.ceil(reports / targetSpan) : 0;
            const impliedLayers =
                headcount <= 1 ? 1 : targetSpan > 1 ? Math.ceil(Math.log(headcount) / Math.log(targetSpan)) : 0;
            const gap = managersNeeded - managers;

            return { currentSpan, impliedLayers, managersNeeded, gap };
        },
        rule:
            "Span is the easy half. Gallup's finding is that there is no single optimal team size: what predicts engagement is manager quality, how much of a manager's week goes on individual-contributor work (best under 40%), and whether people get weekly meaningful feedback. About seven in ten employees are engaged at any team size when that feedback is there. So if this calculator tells you to widen spans, check manager IC time first, and if it tells you to remove managers, name who inherits the coaching they were doing. Delayering to a target number without redistributing the coaching produces directionless teams, which is slower, not faster.",
    },
};

export const SCALE_TOOLS: Tool[] = [GROWTH_GATE, LEADERSHIP_MODE, FOUNDER_MODE, AI_NATIVE, SPAN_DESIGNER];
