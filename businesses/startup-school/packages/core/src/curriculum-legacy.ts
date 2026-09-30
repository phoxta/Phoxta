import type { Category, Course, Lesson, LessonBlock, Module, QuizQuestion } from "./types";

/**
 * Phoxta Startup School's authored, outcome-led curriculum.
 *
 * This file is deliberately a compact content source instead of a second UI
 * implementation. `seed.ts` exposes its derived rows to both the bundled demo
 * and the SQL seed, so a founder sees the same curriculum before and after
 * signing in. Each topic becomes one lesson and every course ends with the
 * business asset the founder has built while learning.
 */

type Topic = {
    title: string;
    objective: string;
    learn: string;
    activity: string;
};

type CheckQuestion = {
    prompt: string;
    options: string[];
    answer: number;
    explanation: string;
};

type CourseDraft = {
    id: string;
    slug: string;
    title: string;
    blurb: string;
    description: string;
    categoryId: Course["categoryId"];
    mentorId: string;
    level: Course["level"];
    theme: Course["theme"];
    outcomes: string[];
    finalProjectTitle: string;
    finalProjectDescription: string;
    template: string;
    example: string;
    modules: Array<{ title: string; lessons: Topic[] }>;
    check: CheckQuestion[];
};

/**
 * A short, standard vocabulary list for each course. These are business terms
 * founders will encounter in customer meetings, plans and financial models;
 * defining them here is clearer than replacing them with vague alternatives.
 */
const COURSE_TERM_GUIDES: Record<string, string> = {
    "c-opportunity": "**Customer:** the person or business with the problem.\n**Problem:** the costly or frustrating job they are trying to complete.\n**Alternative:** what they do today, including doing nothing.\n**Assumption:** something you believe but have not proved.\n**Validation test:** a small test designed to prove or disprove one assumption.",
    "c-market": "**Market segment:** a specific group of customers with a similar need and buying context.\n**TAM (total addressable market):** all potential demand if every suitable customer bought.\n**SAM (serviceable available market):** the part your offer can actually serve.\n**SOM (serviceable obtainable market):** the share you can realistically reach first.\n**Primary research:** evidence you collect directly from customers, such as interviews, observation or a demand test.",
    "c-business-model": "**Business model:** how a business creates value, delivers it and earns revenue.\n**Value proposition:** the clear outcome a customer receives and why it is worth choosing.\n**Revenue model:** how the business charges, such as a one-off sale, subscription or commission.\n**Gross margin:** revenue left after the direct cost of serving a customer.\n**Channel:** the route through which a customer finds, buys or receives the offer.",
    "c-brand": "**Brand:** the meaning people attach to a business from every interaction.\n**Positioning:** the place you choose to occupy in a customer's mind relative to alternatives.\n**Target customer:** the specific customer a message and offer are built for.\n**Message:** the promise you make in language that customer understands.\n**Proof:** evidence that makes the promise believable.",
    "c-mvp": "**MVP (minimum viable product):** the smallest credible product that can deliver a core outcome and create learning.\n**Core user journey:** the steps from a customer's trigger to first value.\n**Feature:** a capability in the product; it belongs only when it is necessary for the core outcome.\n**Prototype:** a low-cost representation used to test an idea before full build.\n**Product requirement:** a clear statement of what a user must be able to do and why.",
    "c-marketing": "**Go-to-market plan:** the choices that connect audience, offer, message, channel and measurement.\n**Customer acquisition channel:** a route used to reach potential customers, such as referrals, search or direct outreach.\n**Conversion:** a customer taking the action you asked for.\n**Call to action:** the one clear next step you ask a customer to take.\n**Marketing metric:** a measure used to decide what to keep, change or stop.",
    "c-sales": "**Lead:** a person or business that may become a customer.\n**Qualified lead:** a lead with enough fit, need, buying ability and timing to justify a sales conversation.\n**Discovery call:** a conversation that uncovers the customer's current situation, problem and decision process.\n**Sales pipeline:** the visible stages from first contact to closed business.\n**Retention:** customers continuing to receive enough value to stay.",
    "c-finance": "**Revenue:** money earned from customers.\n**Direct cost (cost of goods sold):** a cost that rises when you serve or deliver to another customer.\n**Gross profit:** revenue minus direct costs.\n**Cash flow:** money moving in and out of the business, including timing.\n**Break-even:** the sales level at which contribution covers fixed costs.",
    "c-launch": "**Launch:** a planned period of making an offer, serving early customers and learning from the result.\n**Offer:** what the customer receives, at what price and on what terms.\n**Onboarding:** the steps that help a new customer reach first value.\n**First value:** the first useful outcome a customer experiences.\n**Feedback:** evidence from behaviour, outcomes and conversations that improves the next decision.",
    "c-growth": "**Growth rate:** the change in a meaningful business measure over a defined period.\n**Retention:** the share of customers who continue to receive value and stay.\n**Churn:** customers or recurring revenue lost in a period.\n**Unit economics:** the revenue, direct cost and contribution connected to one customer or transaction.\n**Operating capacity:** the people, systems and cash available to deliver without lowering quality.",
};

const T = (title: string, objective: string, learn: string, activity: string): Topic => ({ title, objective, learn, activity });
const Q = (prompt: string, options: string[], answer: number, explanation: string): CheckQuestion => ({ prompt, options, answer, explanation });
const S = (title: string, learn: string, activity = `Write the decision you will make about ${title.toLowerCase()} and the evidence you still need.`): Topic =>
    T(title, `Apply ${title.toLowerCase()} to make a clear decision for your startup.`, learn, activity);

export const FINAL_CATEGORIES: Category[] = [
    { id: "start", name: "Validate", blurb: "Turn an idea into an evidence-backed opportunity and a business model." },
    { id: "fund", name: "Build", blurb: "Build the brand, MVP and financial foundation your business needs." },
    { id: "grow", name: "Launch & Grow", blurb: "Find customers, launch with focus and build repeatable growth." },
];

const COURSE_DRAFTS: CourseDraft[] = [
    // COURSE_DRAFTS
    {
        id: "c-opportunity", slug: "from-idea-to-opportunity", title: "From Idea to Opportunity",
        blurb: "Turn a promising idea into a specific, testable opportunity before you invest serious time or money.",
        description: "A startup is not built on an idea alone. It is built on a problem that a defined group of people experiences often enough, painfully enough, and urgently enough to change what they do. This course helps founders move from intuition to an opportunity they can explain, test and improve.",
        categoryId: "start", mentorId: "m-leonardo", level: "Beginner", theme: "start",
        outcomes: ["Separate a customer problem from a product idea", "Write an evidence-led opportunity brief", "Map the people, pain and alternatives around a problem", "Choose the next test instead of guessing"],
        finalProjectTitle: "Opportunity Brief",
        finalProjectDescription: "A concise case for the opportunity: the customer, problem, existing alternatives, evidence, assumptions and immediate validation plan.",
        template: "1. Customer\n2. Problem and consequences\n3. Current alternatives\n4. Why now\n5. Evidence gathered\n6. Assumptions to test\n7. Next validation step",
        example: "Amara begins with an idea for CornerCart, a service for ordering household essentials from nearby shops. Interviews reveal the opportunity is not another delivery app: busy households lose time and trust when they cannot tell which nearby shop has the items they need. The useful problem is specific, costly and testable.",
        modules: [
            { title: "Find the problem worth solving", lessons: [
                T("What Makes a Business Opportunity?", "Distinguish an opportunity from an interesting concept.", "An opportunity connects a specific customer problem to a feasible way of creating and capturing value. Ideas become opportunities only when the problem, customer, timing and economics can all withstand scrutiny.", "Write your idea in one sentence, then rewrite it as: A specific customer struggles with a specific problem because..."),
                T("Ideas vs Problems", "Start with an existing struggle rather than a preferred solution.", "Ideas describe what you want to build; problems describe what another person is already trying to solve. Starting with the problem protects you from building a polished answer to a question nobody asked.", "List three moments when your intended customer currently loses time, money, certainty or status. Do not mention your product."),
                T("Identifying Real Customer Problems", "Recognise evidence that a problem is real and active.", "Real problems leave traces: workarounds, repeated complaints, budget, delays, risk or emotional friction. Interest in a future solution is weak evidence; past behaviour and present cost are stronger.", "Collect five verbatim examples of what people do today to handle the problem and what that workaround costs."),
                T("Understanding Pain Points", "Describe the functional, financial and emotional cost of a problem.", "A pain point is more than an inconvenience. Identify what the customer cannot achieve, what it costs them, who feels the consequence, and what happens if nothing changes.", "Complete a pain statement: When ___ tries to ___, they struggle because ___. This costs ___ and leaves them feeling ___."),
            ] },
            { title: "Frame and assess the opportunity", lessons: [
                T("Opportunity Mapping", "Map the ecosystem around a customer problem.", "Opportunity mapping connects the user, buyer, influencer, current alternative, constraint and trigger. It prevents a founder from interviewing one friendly person and mistaking them for the whole market.", "Draw your map. Mark who experiences the problem, who approves a purchase, who pays, and who could block adoption."),
                T("Market Need", "Estimate whether the need is frequent and urgent enough to matter.", "Need is not measured by how much people agree with you. Look for frequency, severity, urgency, willingness to switch and a reachable group of customers with the same underlying job to be done.", "Score the need from one to five for frequency, cost, urgency and willingness to change. Explain every score with evidence or mark it as a guess."),
                T("Problem-Solution Fit", "Form a clear hypothesis about how your approach reduces the customer's pain.", "Problem-solution fit is a hypothesis, not a launch milestone. State the customer, problem, promised outcome and the mechanism you believe creates that outcome; then find the cheapest way to challenge it.", "Write one testable statement: We believe ___ will use ___ to achieve ___ because ___. Name the smallest test you can run this week."),
                T("Opportunity Assessment", "Decide whether to pursue, reshape or pause an opportunity.", "Assess opportunities across customer pain, market access, founder fit, feasibility, economics and defensibility. A weak score is useful when it tells you what to test next; it is dangerous only when it is hidden.", "Create your Opportunity Brief and mark each major claim as guess, evidence or proven. Choose one claim to test before moving forward."),
            ] },
        ],
        check: [
            Q("What turns an idea into a business opportunity?", ["A clever feature", "A specific problem, customer, timing and feasible value exchange", "A large social-media following", "A detailed logo"], 1, "An opportunity must join a real customer problem to a feasible and sustainable value exchange."),
            Q("Which signal is strongest evidence of a customer problem?", ["They say the idea sounds useful", "They have already spent time or money on a workaround", "They follow similar brands", "They ask to be notified someday"], 1, "Past effort or spend demonstrates a real current cost."),
            Q("A good pain statement includes...", ["Only the product feature", "The user, their job, the obstacle and its consequence", "A market-size figure", "Your company mission"], 1, "The statement should make the struggle and cost observable before it proposes a solution."),
            Q("Problem-solution fit is best treated as...", ["Proof that you are ready to scale", "A hypothesis to test with customers", "A patent application", "A pricing decision"], 1, "Fit begins as a claim that must face evidence."),
            Q("What should you do with a weak opportunity-assessment score?", ["Hide it from the plan", "Turn it into a specific validation test", "Raise more money", "Add features"], 1, "A visible weak score directs the next piece of learning."),
        ],
    },
    {
        id: "c-market", slug: "market-research-and-validation", title: "Market Research & Validation",
        blurb: "Replace broad market claims with customer evidence, a clear segment and a practical validation report.",
        description: "Good market research does not try to make an idea look inevitable. It helps you learn where demand exists, who experiences it most sharply, what alternatives they use and which assumptions could make your plan wrong.",
        categoryId: "start", mentorId: "m-amara", level: "Beginner", theme: "fund",
        outcomes: ["Define a reachable market segment", "Estimate TAM, SAM and SOM transparently", "Run useful customer interviews and surveys", "Produce a Market Validation Report with evidence and caveats"],
        finalProjectTitle: "Market Validation Report",
        finalProjectDescription: "A documented view of your market, segment, competitors, customer evidence, demand tests and the assumptions that still require validation.",
        template: "1. Market definition\n2. TAM, SAM and reachable SOM\n3. Primary segment\n4. Competitors and alternatives\n5. Customer evidence\n6. Demand-test results\n7. Risks and next test",
        example: "The CornerCart founder first calls the market everyone who shops. Research narrows the initial segment to busy households in dense neighbourhoods who already rely on WhatsApp and nearby shops for weekly essentials. The smaller segment is far more useful because it can be reached and interviewed.",
        modules: [
            { title: "Understand the market", lessons: [
                T("Understanding Your Market", "Define a market around a customer job and context.", "A market is not everybody who could possibly use a product. Define it by the customer, the job they are trying to do, the setting in which it happens and the alternatives they consider.", "Write a market definition that begins with a customer type and a job, not an industry label."),
                T("TAM, SAM & SOM", "Use market sizing to make choices rather than decorate a deck.", "TAM is conceivable demand, SAM is what your offer can serve, and SOM is the share you can credibly reach first. Every number needs an assumption about price, customer count, geography and adoption.", "Show your TAM, SAM and first-year SOM calculation. Put a source or assumption beside every number."),
                T("Identifying Market Segments", "Choose an initial segment that is specific enough to learn from.", "Segments differ in problem intensity, buying process, ability to pay and reachability. A narrow early segment is a way to learn quickly enough to earn expansion.", "List three possible segments. Rank them by pain, access, urgency and ability to pay. Select one beachhead."),
                T("Competitor Research", "Research direct competitors, substitutes and do-nothing behaviour.", "Customers compare you with more than businesses with similar technology. They compare you with spreadsheets, agencies, a staff member, delay and doing nothing.", "Create a table of five alternatives with their promise, price, strengths, weaknesses and customer."),
            ] },
            { title: "Learn from customers", lessons: [
                T("Competitor Positioning", "Find the open position an early customer can understand.", "Positioning chooses who you serve, the category you belong to, the outcome you promise and the alternative you replace. It should make the right customer say this is for me.", "Write: For ___ who need ___, we are the ___ that ___ unlike ___."),
                T("Customer Research", "Plan research around decisions you need to make.", "Research is useful when it reduces a decision risk. State what you need to learn, who can answer from experience and what answer would change your next move.", "Create three decision questions, the people to speak to and the evidence that would change your mind."),
                T("Surveys & Interviews", "Use interviews for stories and surveys for patterns.", "Interviews uncover context and language; surveys test a pattern once you know what to ask. Avoid leading questions and future promises. Ask for a recent event, steps taken and the cost of the current approach.", "Write five interview questions in the past tense and recruit five people from your beachhead segment."),
                T("Testing Demand", "Run a small demand test before building the full product.", "Demand tests ask for a meaningful action: a deposit, booked call, pilot commitment, email reply or time configuring a prototype. Select the smallest action that exposes the assumption you most need to know.", "Define the audience, offer, action, success threshold and review date for one demand test."),
            ] },
            { title: "Make an evidence-led decision", lessons: [
                T("Validating Assumptions", "Track assumptions explicitly and update confidence with evidence.", "Every early plan rests on assumptions about customer, problem, value, willingness to pay and reachability. An assumption log turns uncertainty into a managed work queue.", "Create an assumption log with ten important claims. Mark the riskiest and schedule its test."),
                T("Interpreting Research", "Turn research findings into a decision, not a scrapbook.", "Evidence is not a vote count. Look for repeated patterns, counterexamples, source quality and what changed behaviour. State what the evidence supports, what it does not support and which decision follows.", "Finish your Market Validation Report with three findings, two open risks and one decision: continue, reshape or pause."),
            ] },
        ],
        check: [
            Q("SOM should represent...", ["Every potential customer worldwide", "The first share of the market you can credibly reach", "Only venture-backed companies", "Your total revenue goal"], 1, "SOM is the reachable early portion of a market, not a wishful share."),
            Q("The most useful interview question asks about...", ["A recent time the customer faced the problem", "What they might do in the future", "Whether they like your logo", "Which feature they want first"], 0, "Past behaviour is much more reliable than a prediction or a compliment."),
            Q("A demand test should ask for...", ["A meaningful action", "A five-star rating", "An investor introduction", "A long survey only"], 0, "A real action reveals more than stated interest."),
            Q("Competitor research should include...", ["Only identical products", "Direct competitors, substitutes and the current workaround", "Only market leaders", "Only local businesses"], 1, "The incumbent workflow is often the alternative you must beat."),
            Q("An assumption log is used to...", ["Make plans look cautious", "Turn uncertainty into testable work", "Avoid customer research", "Calculate TAM"], 1, "The log makes the riskiest beliefs visible and actionable."),
        ],
    },
    {
        id: "c-business-model", slug: "build-your-business-model", title: "Build Your Business Model",
        blurb: "Design how your startup creates value, reaches customers and earns enough to continue serving them.",
        description: "A business model is the logic of your business: who you serve, what they value, how they find you, what they pay, what it takes to deliver and where the economics can break. This course takes founders from disconnected ideas to a working, testable model.",
        categoryId: "start", mentorId: "m-leonardo", level: "Intermediate", theme: "grow",
        outcomes: ["Define each Business Model Canvas building block", "Make explicit choices about customers, value and revenue", "Test the assumptions behind a business model", "Complete a Business Model Canvas that guides experiments"],
        finalProjectTitle: "Business Model Canvas",
        finalProjectDescription: "A complete, testable view of customer segments, value proposition, channels, relationships, revenues, resources, activities, partners and cost structure.",
        template: "Customer segments\nValue proposition\nChannels\nCustomer relationships\nRevenue streams\nKey resources\nKey activities\nKey partners\nCost structure\nThree assumptions to test",
        example: "For CornerCart, the user is the household shopper, the buyer may be the same person, and the supply-side customer is the shop owner. The value is a reliable basket from a trusted nearby shop without the back-and-forth. That distinction changes the sales conversation, onboarding and price model.",
        modules: [
            { title: "Create and deliver value", lessons: [
                T("What Is a Business Model?", "Explain the model as the system that creates, delivers and captures value.", "A business model describes connected choices that make a company work. It is not a mission statement or feature list; it shows how a customer benefit becomes a repeatable, viable business.", "Describe your model in four sentences: customer, value, delivery and how money returns."),
                T("Customer Segments", "Separate users, buyers and stakeholders into useful segments.", "A segment groups people who share a meaningful problem, context and buying logic. When user and buyer differ, design for both rather than assuming one message works for everyone.", "Name your primary user, economic buyer, influencer and gatekeeper. Write what each needs to believe."),
                T("Value Proposition", "State the outcome your chosen customer receives and why it matters.", "A value proposition links a painful job to a clear, credible improvement. It should compare directly with the current alternative and name an outcome the customer cares about.", "Write: We help ___ achieve ___ without ___. Add the evidence needed for the claim to be believable."),
                T("Revenue Models", "Choose a revenue mechanism that matches how value is delivered.", "Subscription, transaction, usage, licence, service and marketplace models each change cash flow, sales motion and incentives. Pick a mechanism customers understand and that funds profitable delivery.", "Compare two revenue models. State when the customer pays, what triggers payment and what could make economics fail."),
            ] },
            { title: "Reach and retain customers", lessons: [
                T("Pricing", "Set a starting price from value, alternatives and delivery economics.", "Price signals who the product is for and funds the experience you promise. Start with customer value and alternatives, then check the margin, sales effort and support requirements.", "Choose a test price, what it includes and the trade you will make if a customer asks for a discount."),
                T("Distribution Channels", "Select the route by which a customer discovers, evaluates and buys.", "Channels belong inside the model, not in a campaign after the product is ready. A channel should be trusted by your segment, repeatable and affordable relative to the value created.", "Map awareness to paid use. Mark the highest-friction step and one experiment to reduce it."),
                T("Customer Relationships", "Decide how customers will be acquired, supported and kept.", "Relationship design ranges from high-touch advisory work to self-service adoption. Choose it from customer complexity, willingness to pay and support cost rather than a preference for automation.", "Define the relationship at acquisition, onboarding, first value, support and renewal."),
                T("Key Activities", "Identify the capabilities that must work for your model to deliver value.", "Key activities are not every item on a to-do list. They create the value proposition, reach the segment or keep the economics intact.", "List three key activities. For each, state what failure looks like and how you will know early."),
            ] },
            { title: "Make the economics work", lessons: [
                T("Key Resources", "Name the assets and capabilities without which the model cannot operate.", "Resources can be people, data, technology, capital, intellectual property, trust or access. The important question is whether you control enough of what the model depends on.", "List five resources. Mark which you own, rent, borrow or still need to obtain."),
                T("Key Partners", "Choose partners that strengthen the model without becoming a hidden dependency.", "Partners can improve reach, capability or economics, but every partner adds risk. Decide what they contribute, what motivates them and what happens if their terms change.", "For each key partner, write the value exchanged, dependency risk and an alternative."),
                T("Cost Structure", "Understand the fixed, variable and step costs behind the promise.", "Cost structure reveals whether growth improves or worsens the business. Separate costs that rise per customer from those that remain fixed until a capacity threshold.", "List your ten biggest costs. Label each fixed, variable or step-fixed and identify the likely surprise."),
                T("Building the Business Model Canvas", "Combine the nine building blocks into a coherent, testable whole.", "A canvas is useful only when its blocks agree. Read it as a story: this customer receives this value through this channel, pays this way, and the business can deliver it with these activities and costs.", "Complete your canvas. Circle three blocks built on the weakest evidence and turn each into an experiment."),
            ] },
        ],
        check: [
            Q("A business model explains...", ["Only how a company earns revenue", "How value is created, delivered and captured", "The founder's personal goals", "The marketing calendar"], 1, "Revenue is one part of the connected system that makes a business work."),
            Q("When the user and buyer differ, a founder should...", ["Treat them as one segment", "Design for both roles and their distinct needs", "Only speak to the user", "Only speak to the buyer"], 1, "Both roles influence adoption and payment."),
            Q("Channels belong in the model because...", ["They determine how customers find and buy value", "They matter only after launch", "They replace a value proposition", "They are always free"], 0, "A model without a viable route to customers is incomplete."),
            Q("A key activity is...", ["Every internal task", "A capability critical to delivering value, reach or economics", "A team social event", "Any task a founder enjoys"], 1, "Focus on what the model cannot do without."),
            Q("The best use of a Business Model Canvas is to...", ["Present certainty", "Expose connected assumptions that need testing", "Avoid financial planning", "Choose a logo"], 1, "The canvas makes the model testable rather than merely descriptive."),
        ],
    },
    {
        id: "c-brand", slug: "brand-strategy", title: "Brand Strategy for Startups",
        blurb: "Build a brand people can recognise, trust and choose before visual design becomes the whole conversation.",
        description: "Brand is the meaning people attach to your business after every interaction. It gives founders a disciplined way to make decisions about audience, positioning, message, name and visual expression so the business feels coherent as it grows.",
        categoryId: "fund", mentorId: "m-mei", level: "Beginner", theme: "mint",
        outcomes: ["Define a purposeful brand position", "Create a focused customer persona", "Develop a recognisable voice and story", "Produce a practical Brand Strategy Document"],
        finalProjectTitle: "Brand Strategy Document",
        finalProjectDescription: "A clear foundation for how your business is positioned, expressed and differentiated for its first customers.",
        template: "Purpose\nAudience and persona\nPositioning\nPersonality\nVoice\nName rationale\nVisual direction\nBrand story\nDifferentiation proof",
        example: "CornerCart is not branded as another marketplace. It is positioned as the reliable way for a household to get a complete essentials basket from the neighbourhood shops it already trusts.",
        modules: [
            { title: "Define the foundation", lessons: [
                S("Brand vs Business", "The business is what you do; the brand is the pattern of meaning, expectation and memory that makes people interpret what you do. A strong brand makes a useful business easier to recognise and choose.", "List three things your business does and three feelings or expectations customers should attach to it."),
                S("Brand Purpose", "Purpose explains the change your business exists to create beyond making a sale. It gives choices a direction, but it must connect to a real customer outcome rather than a broad slogan.", "Write one purpose statement that names the customer change you want to make."),
                S("Brand Positioning", "Positioning chooses the place you want to occupy in a customer's mind relative to an alternative. It is a decision about audience, category, promise and proof.", "Write a positioning statement and name the alternative you want to replace."),
                S("Target Audience", "A target audience is a priority group, not a demographic bucket. Define its context, unmet need, trigger, buying power and where it already pays attention.", "Describe your priority audience in five observable characteristics."),
            ] },
            { title: "Make the brand human", lessons: [
                S("Customer Persona", "A persona turns a segment into a decision tool by showing goals, frustrations, language, constraints and buying behaviour. It should be based on research, not a fictional biography.", "Create a one-page persona using interview evidence and flag every unsupported assumption."),
                S("Brand Personality", "Personality gives the brand a consistent manner. Choose a small number of traits and their opposites so teams know how the brand should and should not behave.", "Choose three personality traits and three traits you will deliberately avoid."),
                S("Brand Voice", "Voice is how personality sounds in words: vocabulary, rhythm, point of view and level of formality. It should help a customer understand and act, not merely sound clever.", "Write a voice guide with five do rules, five do-not rules and one sample message."),
                S("Naming", "A good name is memorable, pronounceable, distinctive and appropriate for the category and future direction. Test it with real people, domains and local language before committing.", "Generate ten names, score them for clarity and distinctiveness, then test your strongest three."),
            ] },
            { title: "Express and protect the difference", lessons: [
                S("Visual Identity", "Visual identity translates the strategy into repeatable signals such as colour, typography, imagery and layout. It should support recognition and accessibility, not conceal a weak position.", "Create a visual-direction mood board with three principles and three references to avoid."),
                S("Brand Story", "A brand story gives customers a meaningful before, tension and after. The customer is the hero; the business is the guide that helps them move forward.", "Write a 150-word story that starts with the customer's world before your business exists."),
                S("Brand Differentiation", "Differentiation is valuable when it is relevant, credible and difficult to copy. A claim becomes a position only when customers can see proof in the product and experience.", "List your three proposed differentiators and attach a proof point or an experiment to each."),
            ] },
        ],
        check: [
            Q("Brand is best understood as...", ["Only visual design", "The meaning and expectation people attach to a business", "A company registration", "A social-media account"], 1, "Visual identity is one expression of the wider brand."),
            Q("A positioning statement should name...", ["Every possible customer", "Audience, category, promise and alternative", "Only a logo colour", "The founder biography"], 1, "Positioning makes a deliberate choice about who and what you stand for."),
            Q("A useful persona is based on...", ["Research about goals, context and behaviour", "A made-up lifestyle", "Age alone", "The founder's preferences"], 0, "Personas should help decisions because they are grounded in evidence."),
            Q("Brand voice describes...", ["How personality sounds in language", "The company legal structure", "Only the product name", "A price list"], 0, "Voice makes the brand recognisable across written interactions."),
            Q("A differentiator needs...", ["A catchy claim only", "Relevance, credibility and proof", "A larger budget", "More social-media posts"], 1, "Customers must be able to see why the difference matters and believe it."),
        ],
    },
    {
        id: "c-mvp", slug: "mvp-blueprint", title: "Plan & Test Your MVP",
        blurb: "Define the smallest product that can produce a learning loop with your earliest customers.",
        description: "An MVP is not a small version of everything you imagine. It is the smallest credible experience that lets a defined customer make progress and lets your team learn what to build next. This course turns that principle into a tested product blueprint.",
        categoryId: "fund", mentorId: "m-leonardo", level: "Beginner", theme: "peach",
        outcomes: ["Define the core user and problem", "Prioritise a focused first release", "Create a user journey and product requirements", "Produce and test an MVP Blueprint"],
        finalProjectTitle: "MVP Blueprint",
        finalProjectDescription: "A focused plan for your earliest user, core problem, workflow, must-have features, prototype approach, test and feedback loop.",
        template: "Core user\nCore problem\nPromise\nUser journey\nMust-have features\nNot-now features\nPrototype/MVP format\nTest plan\nFeedback questions\nIteration decision",
        example: "CornerCart does not begin with a citywide marketplace. Its MVP lets a household send a shopping list, receive a confirmed basket from one nearby shop and choose pickup or delivery. Everything else waits until that workflow is proven useful.",
        modules: [
            { title: "Focus the first version", lessons: [
                S("What Is an MVP?", "An MVP is the smallest credible product or service that delivers a core outcome and produces evidence. Its job is learning, not impressing people with a reduced feature list.", "State the smallest outcome a customer must achieve for your MVP to be useful."),
                S("MVP vs Full Product", "A full product solves many adjacent needs reliably at scale; an MVP proves the most important customer and value assumptions. Confusing the two leads to overbuilding before learning.", "Create a two-column list: necessary to test now and valuable only after evidence."),
                S("Defining the Core User", "Choose one early user whose context and pain are specific enough to guide product decisions. Broad user definitions produce conflicting features and weak onboarding.", "Write the core user's role, trigger, current workaround and success moment."),
                S("Defining the Core Problem", "A core problem is the high-value obstacle in one user journey, not every inconvenience around it. Identify the moment where failure has a costly consequence.", "Map the user's current steps and circle the one failure your MVP will address first."),
            ] },
            { title: "Design the learning loop", lessons: [
                S("Feature Prioritisation", "Prioritise features by their contribution to the core outcome, evidence risk, effort and dependency. A feature that does not help a user reach first value belongs in the not-now list.", "Score each proposed feature as must-have, supporting or not-now, then remove one apparent must-have."),
                S("User Journey", "A user journey shows how a person moves from trigger to first value and repeat use. It reveals friction that feature lists hide, especially before and after the main task.", "Sketch the happy path in five to seven steps and label the likely drop-off at each step."),
                S("Product Requirements", "Requirements explain the user outcome, rules, constraints and success criteria without prematurely prescribing every technical implementation. Good requirements make a testable promise.", "Write a requirement for one workflow with user, need, acceptance criteria and a measure of success."),
                S("No-Code MVPs", "No-code tools, concierge services and manual back-office processes can test demand and workflow before custom software. The customer should experience the value even if the system behind it is temporary.", "Choose a no-code or manual route to deliver your core outcome within two weeks."),
            ] },
            { title: "Test and improve", lessons: [
                S("AI-Assisted MVP Development", "AI can accelerate prototypes, copy, research synthesis and routine implementation, but it does not validate the underlying customer problem. Keep a human review and test the result with customers.", "Choose one AI-assisted task and define the quality check a human must perform before use."),
                S("Testing Your MVP", "An MVP test needs a defined audience, task, observation method and threshold for what counts as evidence. Watch behaviour before asking for opinion.", "Recruit five target users and write the task you will ask each person to complete."),
                S("Gathering Feedback", "Useful feedback captures what the customer tried to do, where they hesitated, what they expected and what they did next. Requests for features are clues, not instructions.", "Create a feedback script with observation notes, three follow-ups and a post-test debrief."),
                S("Iterating", "Iteration is a decision to keep, change or remove something based on evidence. Change one important variable at a time where possible, so the next result teaches you something.", "Choose the one change you will make after your test and the evidence that would justify a different change."),
            ] },
        ],
        check: [
            Q("The primary job of an MVP is to...", ["Include every planned feature", "Deliver a core outcome and create learning", "Look complete to investors", "Replace future product work"], 1, "An MVP is a focused learning instrument for a real customer outcome."),
            Q("A feature belongs in an MVP when it...", ["Is easy to build", "Is necessary for the core user to reach first value", "Was requested by one friend", "Makes the product look advanced"], 1, "Prioritise the core outcome over appearance or novelty."),
            Q("A useful user journey maps...", ["Only screens", "Steps from trigger to value and repeat use", "The engineering roadmap", "Your competitors"], 1, "Journeys expose the friction around the product's core task."),
            Q("No-code or manual delivery can be valid because...", ["Customers never need quality", "It can test the value before full automation", "It removes the need for research", "It always costs nothing"], 1, "The early question is whether the outcome matters, not whether every backend process is automated."),
            Q("After an MVP test, an iteration should be based on...", ["The loudest opinion", "Observed evidence and a clear hypothesis", "A longer feature list", "Competitor announcements"], 1, "Evidence-led iteration helps the team learn what changed the result."),
        ],
    },
    {
        id: "c-marketing", slug: "go-to-market-marketing", title: "Go-to-Market & Marketing",
        blurb: "Turn a focused offer into a practical plan for reaching, converting and learning from your first market.",
        description: "Go-to-market connects audience, position, message, channel, offer and measurement. It is how a startup earns the right to scale marketing spend by first learning which messages and routes create qualified demand.",
        categoryId: "grow", mentorId: "m-mei", level: "Intermediate", theme: "grow",
        outcomes: ["Build a go-to-market strategy around a defined audience", "Create focused positioning and messaging", "Choose channels that match the customer journey", "Finish a measurable 90-Day Marketing Plan"],
        finalProjectTitle: "90-Day Marketing Plan",
        finalProjectDescription: "A ninety-day plan with audience, positioning, message, channel experiments, content, campaign calendar, budget assumptions and review metrics.",
        template: "Audience\nPositioning\nMessage pillars\nOffer\nChannel experiments\nContent calendar\nCampaign timeline\nBudget\nMetrics\nWeekly review cadence",
        example: "CornerCart starts with a direct message to households in one neighbourhood about the time lost chasing essentials, followed by a simple first-basket offer. It does not begin with generic posts about convenience.",
        modules: [
            { title: "Build the go-to-market foundation", lessons: [
                S("Understanding Go-To-Market", "Go-to-market is the coordinated plan for how a defined audience discovers, understands, buys and receives value from an offer. It aligns product, sales and marketing around the same first customer.", "Describe your route from first awareness to first value in one page."),
                S("Target Audience", "Marketing becomes efficient when it starts with a priority audience, their trigger, current behaviour and trusted sources of information. Reachability matters as much as size.", "Define the audience for your first ninety days and list where they already pay attention."),
                S("Positioning", "Marketing positioning repeats the business choice in language a buyer can use. It should make the product's category, promise and contrast with alternatives immediately clear.", "Write a homepage headline, subheading and comparison line for your chosen position."),
                S("Messaging", "Messaging translates positioning into claims, proof, objections and calls to action for a specific stage of the journey. Good messaging is specific enough to be tested.", "Create three message pillars, the proof behind each and one customer objection each must answer."),
            ] },
            { title: "Choose and run channels", lessons: [
                S("Marketing Channels", "Channels should be selected for audience fit, intent, speed of learning, cost and repeatability. Start with a few channel experiments rather than spreading effort across every platform.", "Choose three channels to test and set one success metric for each."),
                S("Content Strategy", "Content earns attention by helping an audience make progress before it asks for a purchase. Anchor content in recurring customer questions, proof and useful points of view.", "Plan four pieces of content that answer a real customer question at different buying stages."),
                S("Social Media", "Social media works when the format, platform and point of view match an existing audience behaviour. It is not a substitute for a clear offer or a way to avoid direct customer conversations.", "Choose one platform, one audience behaviour and a four-week posting experiment."),
                S("Email Marketing", "Email is most useful when it follows a permission-based relationship with a relevant message and one clear next action. Segment by customer context, not just by list size.", "Draft a three-email sequence for a new lead: problem, proof and invitation."),
            ] },
            { title: "Launch campaigns and learn", lessons: [
                S("Paid Advertising", "Paid advertising can accelerate a message that already has some evidence, but it will amplify an unclear offer just as efficiently. Begin with small controlled tests and measure qualified action, not impressions.", "Write one paid-test hypothesis with audience, message, spend cap and qualified-lead threshold."),
                S("Partnerships", "Partnerships work when both sides gain a clear outcome and reach an audience neither could serve as effectively alone. Treat them as a joint offer, not a request for free promotion.", "Identify three potential partners and write the value exchange for each."),
                S("Launch Campaign", "A campaign coordinates one audience, offer, message, timeline and call to action. It becomes manageable when every asset serves the same promise instead of announcing many things at once.", "Build a two-week campaign calendar with pre-launch, launch-day and follow-up actions."),
                S("Measuring Marketing Performance", "Measure each stage from attention to qualified action to revenue. A metric is useful only if its movement leads to a decision about audience, message, offer or channel.", "Choose five metrics for your plan and state the decision each one will inform."),
            ] },
        ],
        check: [
            Q("Go-to-market connects...", ["Only paid ads", "Audience, offer, channel, conversion and value delivery", "A brand logo and website", "Competitor research only"], 1, "A GTM plan coordinates the full path to first value."),
            Q("A sensible early channel strategy is to...", ["Use every channel at once", "Run a few focused experiments", "Avoid direct customer contact", "Choose channels by follower count"], 1, "Focused tests create faster learning about audience-channel fit."),
            Q("Message pillars should include...", ["Claims, proof and objections they answer", "Only slogans", "All product features", "The founder's CV"], 0, "Claims need credible proof and must address the questions buyers actually have."),
            Q("Paid advertising is most useful when...", ["The offer is still unclear", "You have a message worth testing against qualified action", "You need vanity metrics", "You have no audience hypothesis"], 1, "Spend should accelerate learning, not hide a weak offer."),
            Q("A useful marketing metric should...", ["Always increase", "Inform a decision about the plan", "Measure impressions only", "Be copied from another startup"], 1, "Metrics earn their place when they change what the team does next."),
        ],
    },
    {
        id: "c-sales", slug: "customer-acquisition-and-sales", title: "Customer Acquisition & Sales",
        blurb: "Build a repeatable, customer-respectful sales system from first outreach through retention.",
        description: "Early sales are how founders learn whether their positioning, product and price make sense in the real world. This course gives you a practical system for creating conversations, qualifying opportunities, running discovery and earning repeat business.",
        categoryId: "grow", mentorId: "m-mei", level: "Beginner", theme: "mint",
        outcomes: ["Generate relevant leads", "Qualify opportunities without wasting a quarter", "Run discovery and sales conversations", "Build a Customer Acquisition System"],
        finalProjectTitle: "Customer Acquisition System",
        finalProjectDescription: "A documented sales motion covering your ideal customer, lead sources, qualification, funnel stages, outreach, discovery, proposal, closing and retention.",
        template: "Ideal customer\nLead sources\nQualification criteria\nFunnel stages\nOutreach sequence\nDiscovery questions\nOffer and proposal\nObjection responses\nClosing process\nRetention plan",
        example: "CornerCart's founder does not market to every resident in a city. She targets busy households near partner shops, asks about the last incomplete or delayed grocery run, and offers a time-bound first-basket trial with clear success measures.",
        modules: [
            { title: "Create qualified conversations", lessons: [
                S("Understanding Sales", "Sales is a mutual decision process: diagnose whether a real problem exists, establish whether your offer can help and agree on a fair next step. It works best when it is built on evidence rather than pressure.", "Write the customer decision your sales conversation should help them make."),
                S("Lead Generation", "Lead generation creates a focused list of people or organisations likely to have the problem you solve. Quality comes from segment fit and a credible reason to contact them, not from the size of a spreadsheet.", "Choose two lead sources and create a first list of twenty relevant prospects."),
                S("Lead Qualification", "Qualification protects your time by checking pain, fit, urgency, authority and a workable buying path. It is respectful to disqualify a poor fit early rather than force a long sales process.", "Set five qualification questions and define the answer that means you should not proceed."),
                S("Sales Funnels", "A funnel makes the sales process visible from lead to conversation, proposal, win and renewal. It helps you see where prospects stop moving and what activity is needed at the top to create outcomes at the bottom.", "Draw your funnel stages and set one conversion measure for each."),
            ] },
            { title: "Run the sales process", lessons: [
                S("Outreach", "Effective outreach is short, relevant and based on a reason to believe the recipient has the problem. It earns a conversation by showing understanding, not by sending a product catalogue.", "Write a three-step outreach sequence for one qualified segment."),
                S("Discovery Calls", "Discovery asks about the customer's past: what happened, what they tried, what it cost and who was affected. Past behaviour is stronger evidence than a promise about what they might buy.", "Write six discovery questions that cannot be answered with a polite yes."),
                S("Presenting Your Solution", "A solution presentation should connect the customer's stated problem to a focused outcome and relevant proof. Demonstrate the workflow that matters rather than touring every feature.", "Create a ten-minute demo or presentation outline using the customer's own language."),
                S("Handling Objections", "Objections are information about risk, value, timing or buying process. Clarify which one you are hearing before answering; discounting is rarely the first or best response.", "List five likely objections, the question you will ask to understand each, and the proof you can offer."),
            ] },
            { title: "Close and retain", lessons: [
                S("Closing", "Closing is the act of agreeing a clear next commitment after value, fit and risk have been addressed. It should make the decision easy, specific and reversible enough for an early customer to trust.", "Write the next-step ask for your current offer, including scope, price, start date and success measure."),
                S("Customer Retention", "Retention begins with the promise made in the sale and the first value delivered after it. Track adoption, outcomes, risks and renewal conversations before the contract is due.", "Design a thirty-day onboarding and check-in plan for a new customer."),
            ] },
        ],
        check: [
            Q("Qualification is valuable because it...", ["Makes every prospect buy", "Protects time by identifying fit, pain and buying path", "Eliminates discovery", "Lets you skip pricing"], 1, "Qualification helps both sides avoid a process that cannot create value."),
            Q("Discovery questions should focus on...", ["Past behaviour and consequences", "Future promises only", "Your feature list", "Competitor rumours"], 0, "Specific past events reveal real context and cost."),
            Q("The best solution presentation...", ["Covers every feature", "Connects the customer's problem to a relevant outcome and proof", "Avoids questions", "Begins with the company history"], 1, "A presentation should answer the decision the customer is making."),
            Q("When an objection arises, first...", ["Offer a discount", "Clarify the risk or concern behind it", "End the call", "Add more features"], 1, "The same words can hide different concerns about timing, value, authority or risk."),
            Q("Retention begins...", ["At renewal time", "With the promise made and first value delivered", "After a complaint", "When marketing sends a newsletter"], 1, "What happens immediately after the sale determines whether customers stay."),
        ],
    },
    {
        id: "c-finance", slug: "startup-finance-essentials", title: "Startup Finance Essentials",
        blurb: "Use financial fundamentals to price clearly, manage cash and make funding decisions with your eyes open.",
        description: "Startup finance is not an accounting exercise reserved for later. It is how a founder understands the economic choices behind pricing, costs, cash, growth and funding. This course builds the working model you need to make those choices responsibly.",
        categoryId: "fund", mentorId: "m-padhang", level: "Beginner", theme: "fund",
        outcomes: ["Understand revenue, cost, margin and break-even", "Build a practical cash-flow and forecast model", "Compare funding paths", "Complete a 12-Month Financial Model"],
        finalProjectTitle: "12-Month Financial Model",
        finalProjectDescription: "A twelve-month model with revenue assumptions, costs, gross margin, break-even, cash flow, scenarios, funding needs and investor-readiness notes.",
        template: "Revenue assumptions\nPricing\nVariable costs\nFixed costs\nGross margin\nBreak-even\nCash-flow forecast\nBase, upside and downside scenarios\nFunding need\nInvestor-readiness gaps",
        example: "CornerCart earns a clear service fee on each completed basket. Its model separates shopper support, delivery and payment costs from contribution margin, then shows that a popular service can still run out of cash when supplier payments and customer collections fall out of step.",
        modules: [
            { title: "Understand the economics", lessons: [
                S("Understanding Startup Finance", "Finance translates your operating choices into numbers you can compare. Founders need enough fluency to see the difference between revenue, profit, cash and the assumptions beneath each.", "Write the three financial questions you need answered before committing to your next major decision."),
                S("Revenue", "Revenue is money earned from delivering a product or service, measured with a clear rule for when it is recognised. Separate recurring, one-off, contracted and collected revenue so the picture is honest.", "List your revenue streams and the trigger that creates each one."),
                S("Costs", "Costs include direct delivery costs, operating expenses and the working-capital effects that do not appear in a simple feature plan. Categorising them makes pricing and forecast decisions more realistic.", "List ten costs and label each direct, operating, fixed, variable or step-fixed."),
                S("Gross Margin", "Gross margin is what remains after the direct cost of serving customers. It tells you whether each additional sale helps fund the business or creates more work without enough return.", "Calculate a first gross-margin estimate for one customer or unit of service."),
            ] },
            { title: "Price and plan cash", lessons: [
                S("Pricing", "Financial pricing checks whether a value-based price also supports delivery, sales effort, support and a sustainable margin. Price is a strategic choice, but it must survive the arithmetic.", "Test three price points against your direct costs and expected customer volume."),
                S("Break-Even", "Break-even identifies the sales volume at which contribution covers fixed costs. It is a planning tool, not a promise; test it against realistic conversion, capacity and cash timing.", "Calculate your contribution per sale and the number of sales needed to cover monthly fixed costs."),
                S("Cash Flow", "Cash flow tracks when money actually enters and leaves the business. A profitable business can fail if customers pay late, inventory is bought early or debt payments arrive before cash does.", "Create a thirteen-week cash view with opening cash, expected receipts, payments and closing cash."),
                S("Financial Forecasting", "Forecasting turns assumptions into scenarios so you can see the decision points before they become emergencies. Update it frequently and compare forecast with actual results to improve judgement.", "Build base, upside and downside cases for the next twelve months."),
            ] },
            { title: "Fund responsibly", lessons: [
                S("Funding", "Funding is appropriate when it buys a specific path to evidence or growth that the business cannot finance from cash alone. Match the source and terms to the business model, asset life and risk.", "Write what a funding round would buy, the milestone it must achieve and what happens if it takes twice as long."),
                S("Bootstrapping", "Bootstrapping uses customer revenue, founder resources and disciplined scope to fund progress. It preserves control but still requires an honest view of opportunity cost, runway and pace.", "List three ways to reduce cash need without reducing the learning you must achieve."),
                S("Investor Readiness", "Investors look for a coherent story supported by evidence: market, team, traction, economics, use of funds and risks. Readiness is not a polished deck without underlying answers.", "Create an investor-readiness checklist and mark the evidence you can show today."),
            ] },
        ],
        check: [
            Q("Gross margin measures...", ["Revenue after direct delivery costs", "Cash in the bank", "All operating profit", "Market share"], 0, "Gross margin shows whether serving additional customers creates contribution."),
            Q("A profitable business can run out of cash when...", ["Cash timing and working capital absorb money", "It has no customers", "Its logo is weak", "It calculates margin"], 0, "Profit and cash are related but not the same measure."),
            Q("Break-even helps a founder understand...", ["The sales volume needed to cover fixed costs", "The company valuation", "Only tax due", "A competitor's price"], 0, "It links contribution per sale to the fixed-cost base."),
            Q("A useful forecast includes...", ["One optimistic number", "Base, upside and downside assumptions", "Only historic revenue", "No cash timing"], 1, "Scenarios make the risks and choices visible."),
            Q("Funding should be matched to...", ["A vague desire to grow", "A specific milestone, business model and risk", "The largest available cheque", "A competitor announcement"], 1, "The source and terms must fit what the money is meant to achieve."),
        ],
    },
    {
        id: "c-launch", slug: "launch-your-startup", title: "Launch Your Startup",
        blurb: "Plan a focused launch that earns early customers, captures feedback and creates a repeatable next step.",
        description: "A launch is not a single announcement. It is a coordinated period of preparation, offer-making, customer contact, delivery and learning. This course gives founders a launch plan that turns attention into evidence instead of noise.",
        categoryId: "grow", mentorId: "m-mei", level: "Beginner", theme: "peach",
        outcomes: ["Prepare a launch-ready offer and assets", "Build a focused launch strategy", "Reach and learn from early customers", "Complete a measurable Launch Plan"],
        finalProjectTitle: "Launch Plan",
        finalProjectDescription: "A complete pre-launch, launch-week and post-launch plan with offer, audience, assets, customer actions, feedback system and performance measures.",
        template: "Launch objective\nAudience\nOffer\nSuccess measure\nAssets\nLanding page\nSocial and email plan\nEarly-customer plan\nFeedback process\nPost-launch review",
        example: "CornerCart launches in one neighbourhood with five trusted shops, a simple order page and concierge support for the first baskets. It measures completed repeat baskets and reliable fulfilment, not social-media reach.",
        modules: [
            { title: "Prepare for launch", lessons: [
                S("Pre-Launch Planning", "Pre-launch aligns the audience, offer, promise, assets, operations and success measure before attention arrives. A launch plan should explain what happens when an interested customer says yes.", "Write a pre-launch checklist covering offer, audience, delivery capacity and measurement."),
                S("Building Your Launch Strategy", "A launch strategy makes a deliberate choice about audience, moment, offer, channel and desired action. It prioritises the learning or revenue outcome that matters most now.", "Write your launch objective and the single customer action that will prove progress."),
                S("Launch Assets", "Assets include the materials that let a customer understand, trust and act: message, demo, landing page, proof, FAQs, onboarding and support. Create only what supports the chosen action.", "List every launch asset and label it essential, useful later or unnecessary."),
                S("Landing Page", "A landing page should make the audience, problem, promise, proof and next action easy to understand. It earns a conversion by reducing uncertainty, not by explaining every feature.", "Draft a landing-page outline with headline, problem, promise, proof, FAQs and one call to action."),
            ] },
            { title: "Reach early customers", lessons: [
                S("Social Launch", "Social launch works when it gives a defined audience a useful reason to pay attention and a clear action to take. Use customer language and proof instead of announcing that you are excited.", "Create three launch posts: problem insight, product proof and invitation."),
                S("Email Launch", "Email launch lets you speak directly to people who have already granted permission. Segment the message, keep the promise clear and give each email one decision to make.", "Draft launch emails for an existing contact, a warm referral and a new lead."),
                S("Early Customers", "Early customers are collaborators in learning, not a crowd to acquire at any cost. Set expectations, provide high-touch support and make the success criteria explicit.", "Create an early-customer pilot offer with scope, price, onboarding and success measures."),
                S("Collecting Feedback", "Launch feedback should combine behaviour, outcomes and honest conversations. Build the collection method before launch so positive noise does not drown out the evidence you need.", "Set three feedback moments: onboarding, first value and two weeks after use."),
            ] },
            { title: "Learn and improve", lessons: [
                S("Measuring Launch Performance", "Measure performance from reach to qualified action to delivery and retention. Select metrics that tell you which decision to make about message, channel, offer or product.", "Choose five launch metrics and define the threshold that triggers a change."),
                S("Post-Launch Optimisation", "Post-launch work turns results into a clear decision: keep, improve, stop or repeat. Review the evidence with your original assumptions visible so the team learns rather than merely celebrates activity.", "Run a post-launch review: what happened, why, what surprised you and what you will change next."),
            ] },
        ],
        check: [
            Q("A launch is best understood as...", ["One announcement", "A coordinated period of offer, delivery and learning", "A finished product", "A social-media campaign only"], 1, "The work continues through customer delivery and review."),
            Q("A landing page should primarily help a visitor...", ["Read every feature", "Understand the promise, proof and next action", "Meet the whole team", "See every brand colour"], 1, "A focused page reduces uncertainty around one meaningful action."),
            Q("Early customers should be treated as...", ["A crowd to acquire at any cost", "Collaborators in a clear learning and delivery process", "Free testers with no support", "Proof that research can stop"], 1, "Their experience and outcomes teach the team what to improve."),
            Q("Launch feedback should include...", ["Only positive comments", "Behaviour, outcomes and conversations", "Only social engagement", "Only feature requests"], 1, "Different evidence types reveal different parts of the customer experience."),
            Q("A post-launch review should lead to...", ["More activity without changes", "A decision to keep, improve, stop or repeat", "A bigger logo", "Ignoring original assumptions"], 1, "The purpose is a better next experiment or operating decision."),
        ],
    },
    {
        id: "c-growth", slug: "growth-and-scale", title: "Growth & Scale",
        blurb: "Build durable growth through customer value, disciplined metrics, systems and responsible expansion.",
        description: "Growth is not simply more customers. It is the ability to create, deliver and retain value at a larger scale without breaking the economics, team or customer experience that made the business work. This course helps founders choose growth deliberately.",
        categoryId: "grow", mentorId: "m-bayu", level: "Intermediate", theme: "grow",
        outcomes: ["Define sustainable growth and its metrics", "Improve retention and referral loops", "Use automation and AI responsibly", "Complete a practical Growth Strategy"],
        finalProjectTitle: "Growth Strategy",
        finalProjectDescription: "A growth strategy covering your growth goal, metrics, retention, referrals, automation, operating capacity, team needs, systems and guardrails.",
        template: "Growth goal\nNorth-star and supporting metrics\nRetention plan\nReferral loop\nAutomation opportunities\nAI guardrails\nOperating capacity\nHiring needs\nSystems\nRisks and scale guardrails",
        example: "CornerCart grows only after households reorder and partner shops fulfil reliably. Its growth strategy adds a neighbour-referral loop, makes repeat baskets quick to rebuild and keeps a human support path for substitutions and failed deliveries.",
        modules: [
            { title: "Grow what works", lessons: [
                S("Understanding Growth", "Growth is the repeated expansion of customer value and business capacity. It becomes dangerous when acquisition rises faster than retention, margin, support or operational quality.", "Write the condition that must be true before you deliberately accelerate growth."),
                S("Growth Metrics", "Growth metrics connect customer behaviour to a business outcome. Choose a north-star measure that reflects delivered value, then supporting measures for acquisition, activation, retention, margin and capacity.", "Choose one north-star metric and four supporting measures. State the decision each informs."),
                S("Customer Retention", "Retention measures whether customers continue to receive enough value to stay. Improve it by understanding activation, usage, outcomes, risk signals and the moments a customer decides to leave.", "Map your retention journey and identify the earliest signal that a customer is at risk."),
                S("Referral Systems", "Referrals work when a satisfied customer has a natural moment, reason and easy path to introduce someone similar. Incentives can help, but they cannot create genuine value or trust.", "Design a referral loop with trigger, message, recipient, reward and measurement."),
            ] },
            { title: "Use leverage responsibly", lessons: [
                S("Automation", "Automation removes repeated low-judgement work and improves consistency when the underlying process is already understood. Automating a broken process simply produces errors faster.", "List five repeated processes. Choose one stable process to automate and one that still needs human learning."),
                S("AI for Business", "AI can help with research synthesis, drafting, support triage and internal workflows, but it needs defined inputs, review, privacy boundaries and evaluation. Use it to augment judgement, not manufacture customer evidence.", "Choose one AI use case, its expected benefit, a human reviewer and the harm you must prevent."),
                S("Operations", "Operations turn a growing business into dependable delivery through ownership, cadence, capacity planning and visible handoffs. The aim is consistency without losing the customer signal at the edge.", "Define the operating rhythm for weekly priorities, customer issues, metrics and decisions."),
                S("Hiring", "Hiring should solve a clear capacity or capability constraint, not just signal momentum. Define the outcome, level of ownership, success measures and support before opening a role.", "Write a role scorecard for your next hire: mission, outcomes, capabilities, first ninety days and interview evidence."),
            ] },
            { title: "Build systems that can scale", lessons: [
                S("Systems & Processes", "Systems make good work repeatable through a clear owner, trigger, steps, decision rights and review. Document the process that creates the most customer value before documenting every internal preference.", "Document one critical process so a capable new teammate can run it without you."),
                S("Scaling Responsibly", "Responsible scale preserves customer value, financial resilience, team health, security and compliance while capacity grows. Set explicit guardrails so growth decisions do not create damage that appears later.", "Write three scale guardrails: one for customers, one for cash and one for team or risk."),
            ] },
        ],
        check: [
            Q("Sustainable growth requires...", ["Acquisition alone", "Customer value, retention, economics and operating capacity", "A larger team only", "More marketing posts"], 1, "Growth that breaks retention, margin or delivery is not durable."),
            Q("A north-star metric should reflect...", ["A vanity number", "The customer value your business consistently delivers", "Only employee activity", "A competitor benchmark"], 1, "It is paired with supporting measures that explain how value is created."),
            Q("Automation should be applied first to...", ["A process nobody understands", "Stable repeated work with clear rules", "Every customer conversation", "High-risk decisions without review"], 1, "Automating an unstable process scales the confusion."),
            Q("A responsible AI use case needs...", ["No human oversight", "Defined inputs, review, privacy boundaries and evaluation", "Only a prompt", "Access to every data source"], 1, "Useful AI work must be accountable and safe in its real operating context."),
            Q("Scale guardrails help a founder...", ["Avoid all growth", "Protect customer value, cash and risk while expanding", "Hide problems", "Replace operating metrics"], 1, "Guardrails make the cost of growth visible before it becomes damage."),
        ],
    },
];

const publishedAt = "2026-09-19T00:00:00.000Z";

export const FINAL_COURSES: Course[] = COURSE_DRAFTS.map((course, index) => ({
    id: course.id,
    slug: course.slug,
    title: course.title,
    blurb: course.blurb,
    description: course.description,
    categoryId: course.categoryId,
    mentorId: course.mentorId,
    level: course.level,
    theme: course.theme,
    // A course should not carry a made-up rating before learners have rated it.
    rating: 0,
    learners: 0,
    outcomes: course.outcomes,
    finalProjectTitle: course.finalProjectTitle,
    finalProjectDescription: course.finalProjectDescription,
    publishedAt: new Date(new Date(publishedAt).getTime() + index * 86400000).toISOString(),
}));

type LessonSource = { lesson: Lesson; topic: Topic; course: CourseDraft };
const lessonSources: LessonSource[] = [];

/**
 * Every lesson shares one running case, but the decision changes with the
 * topic. This keeps the curriculum connected from opportunity through scale
 * instead of offering a detached generic example after every article.
 */
const founderLens = (topic: Topic) =>
    `**Business decision.** ${topic.activity} Record the result as evidence, a decision, or a named uncertainty — not simply a feeling that the idea is getting stronger.`;

const lessonBody = (topic: Topic) =>
    `**What you will learn.** ${topic.objective}\n\n**The business concept.** ${topic.learn}\n\n**How to use it.** ${topic.activity}\n\n**What good work looks like.** Leave this lesson with a written answer another person can inspect. Label estimates as estimates, keep customer evidence separate from opinion, and change the next decision when the evidence disagrees with your first view.`;

const workedCase = (course: CourseDraft, topic: Topic) =>
    `**CornerCart in practice.** ${course.example}\n\n**Apply this lesson.** For ${topic.title.toLowerCase()}, the team starts with one concrete move: ${topic.activity} It counts as learning only when the answer changes the next test, message, workflow or financial assumption.`;

export const FINAL_MODULES: Module[] = COURSE_DRAFTS.flatMap((course) => {
    const topicModules = course.modules.map((module, moduleIndex) => ({
        id: `${course.id}-m-${moduleIndex + 1}`,
        courseId: course.id,
        title: module.title,
        sort: moduleIndex,
    }));
    return [...topicModules, {
        id: `${course.id}-m-final`, courseId: course.id, title: `Build your ${course.finalProjectTitle}`, sort: topicModules.length,
    }];
});

export const FINAL_LESSONS: Lesson[] = COURSE_DRAFTS.flatMap((course) => {
    const topics = course.modules.flatMap((module, moduleIndex) => module.lessons.map((topic, topicIndex) => ({ topic, moduleIndex, topicIndex })));
    const articles = topics.map(({ topic, moduleIndex }, lessonIndex) => {
        const lesson: Lesson = {
            id: `${course.id}-l-${lessonIndex + 1}`,
            courseId: course.id,
            moduleId: `${course.id}-m-${moduleIndex + 1}`,
            title: topic.title,
            kind: "article",
            durationSec: 600,
            body: `${lessonBody(topic)}\n\n${founderLens(topic)}`,
            sort: lessonIndex,
        };
        lessonSources.push({ lesson, topic, course });
        return lesson;
    });
    return [...articles, {
        id: `${course.id}-final`,
        courseId: course.id,
        moduleId: `${course.id}-m-final`,
        title: `${course.finalProjectTitle}: course assessment`,
        kind: "quiz",
        durationSec: 600,
        body: `${course.finalProjectDescription}\n\nComplete the five-question check, then use the project template to finish and share your own ${course.finalProjectTitle}.`,
        sort: articles.length,
    }];
});

const block = (id: string, lessonId: string, type: LessonBlock["type"], title: string, content: string, sort: number, actionHref?: string, actionLabel?: string): LessonBlock => ({
    id, lessonId, type, title, content, sort, actionHref, actionLabel,
});

export const FINAL_LESSON_BLOCKS: LessonBlock[] = [
    ...lessonSources.flatMap(({ lesson, topic, course }) => [
        block(`${lesson.id}-objective`, lesson.id, "objective", "Learning objective", topic.objective, 0),
        block(`${lesson.id}-learn`, lesson.id, "learn", "Learn", topic.learn, 1),
        block(`${lesson.id}-example`, lesson.id, "example", "Worked case", workedCase(course, topic), 2),
        block(`${lesson.id}-activity`, lesson.id, "activity", "Put it into practice", topic.activity, 3),
        ...(lesson.sort === 0 && COURSE_TERM_GUIDES[course.id]
            ? [block(`${lesson.id}-terms`, lesson.id, "resource", "Business terms used in this course", COURSE_TERM_GUIDES[course.id], 4)]
            : []),
        block(`${lesson.id}-ai`, lesson.id, "ai_activity", "Use the Adviser well", "Open the Adviser with your real draft, customer notes or numbers. Ask it to challenge the assumptions behind this decision, identify what is still unknown, and suggest the smallest useful test. Do not ask it to invent evidence or write a fictional customer answer.", 5, "/adviser", "Open Adviser"),
        block(`${lesson.id}-template`, lesson.id, "template", `${course.finalProjectTitle} template`, course.template, 6, "/venture", "Open My Venture"),
    ]),
    ...COURSE_DRAFTS.map((course) => block(
        `${course.id}-final-project`, `${course.id}-final`, "activity", `Build your ${course.finalProjectTitle}`,
        `${course.finalProjectDescription}\n\nUse this structure:\n${course.template}`,
        0, "/venture", "Save in My Venture",
    )),
];

export const FINAL_QUIZ: QuizQuestion[] = COURSE_DRAFTS.flatMap((course) => course.check.map((question, index) => ({
    id: `${course.id}-q-${index + 1}`,
    lessonId: `${course.id}-final`,
    prompt: question.prompt,
    options: question.options,
    answer: question.answer,
    explanation: question.explanation,
})));
