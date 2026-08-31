// Phoxta — editorial content for the blog.
//
// Single source of truth for both the blog index (/blog) and each article
// (/blog/:slug). Adding a post here publishes it everywhere: the index grid, the
// homepage "From the blog" section, the category filter, and prev/next links.
//
// Deliberately avoids restating plan prices in prose — those live in
// src/lib/plans.ts and are rendered on /pricing, so articles link there instead
// of going stale whenever pricing moves.

export type ArticleBlock =
    /** Opening standfirst, rendered larger than body copy. */
    | { kind: "lead"; text: string }
    | { kind: "p"; text: string }
    | { kind: "h"; text: string }
    | { kind: "list"; items: string[] }
    | { kind: "quote"; text: string; cite?: string }
    | { kind: "figure"; img: string; alt: string; caption?: string }
    /** Two side-by-side sub-points (matches the template's paired columns). */
    | { kind: "duo"; left: { h: string; p: string }; right: { h: string; p: string } }
    | { kind: "table"; caption?: string; head: string[]; rows: string[][] };

export type ArticleCategory = "playbooks" | "tear-downs" | "case-studies";

export type Article = {
    slug: string;
    title: string;
    /** Short summary — used on the index grid and as the meta description. */
    excerpt: string;
    category: ArticleCategory;
    /** Card + social image. */
    img: string;
    /** Wide hero image on the article page. */
    hero: string;
    author: string;
    /** Display date; `iso` drives sorting and structured data. */
    date: string;
    iso: string;
    readMinutes: number;
    body: ArticleBlock[];
};

export const CATEGORY_LABELS: Record<ArticleCategory, string> = {
    playbooks: "Playbooks",
    "tear-downs": "Tear-downs",
    "case-studies": "Case studies",
};

export const ARTICLES: Article[] = [
    {
        slug: "phoxta-everything-it-does",
        title: "Everything Phoxta Does: A Comprehensive Guide to Agentic Infrastructure",
        excerpt: "Discover the full capabilities of Phoxta, the autonomous operational console empowering agentic businesses with AI governance, unified commerce, and portfolio scale.",
        category: "playbooks",
        img: "/assets/imgs/pages/img-195.webp",
        hero: "/assets/imgs/pages/img-198.webp",
        author: "Phoxta",
        date: "October 15, 2026",
        iso: "2026-10-15",
        readMinutes: 10,
        body: [
            {
                kind: "lead",
                text: "Phoxta is the operational nervous system for the next generation of autonomous businesses. From precision appointment orchestration to unified portfolio management, we replace the fragmented tech stack of legacy operations with a unified, AI-native infrastructure designed to handle lifecycle management, omnichannel support, and commerce logic—autonomously.",
            },
            {
                kind: "p",
                text: "We provide an ecosystem of 18 meticulously designed, high-margin business models—ranging from elite car rentals to aesthetic clinics and high-volume e-commerce. You don't build; you acquire a production-ready blueprint that operates natively on Phoxta's agentic infrastructure.",
            },
            { kind: "h", text: "Why Phoxta is the New Way of Running a Business" },
            {
                kind: "p",
                text: "Legacy businesses scale by adding headcount: more support agents, more administrators, more operational friction. Agentic businesses scale through infrastructure. Phoxta eliminates the 'operational wall' by embedding specialized AI Operators directly into your commerce engine.",
            },
            {
                kind: "list",
                items: [
                    "Zero Context-Switching: Unified commerce, CRM, and omnichannel support in a single Agentic Operating Console.",
                    "Autonomous Lifecycle Management: Failed payments, rebookings, and support inquiries are handled 24/7 without human intervention.",
                    "Strategic Leverage: Focus your human capital on growth, M&A, and supplier negotiation, while the machine handles the labor.",
                ],
            },
            {
                kind: "figure",
                img: "/assets/imgs/pages/img-125-faq.webp",
                alt: "Phoxta Support and Team Operations",
                caption: "Scale your portfolio without scaling your stress. Let agents handle operations.",
            },
            { kind: "h", text: "The Business Models (The Blueprints)" },
            {
                kind: "p",
                text: "We have analyzed the unit economics of 18 distinct industries and pre-configured their operational logic into deployable assets. Examples include:",
            },
            {
                kind: "duo",
                left: {
                    h: "Service & Hospitality",
                    p: "Agentic Salons, Online Restaurants, and Travel Experiences. The AI orchestrates complex scheduling, allergen inquiries, and waitlist back-filling to maximize yield.",
                },
                right: {
                    h: "Asset & E-Commerce",
                    p: "Small Fleet Car Rental, Coffee Subscriptions, and DTC Brands. Autonomous operations mitigate churn, upsell extras, and manage inventory logic.",
                },
            },
            { kind: "h", text: "Enterprise AI Governance & HITL" },
            {
                kind: "p",
                text: "Scale safely. Phoxta provides granular control over your AI Operators. You dictate which actions are handled autonomously (e.g., policy FAQs, simple rebookings) and which require Human-in-the-Loop (HITL) approval (e.g., high-value refunds), ensuring your brand standards are never compromised.",
            },
            {
                kind: "figure",
                img: "/assets/imgs/template/wb2.webp",
                alt: "Agentic commerce and storefront dashboard overview",
                caption: "Wake up to a morning briefing of actions taken, and a clear queue of decisions requiring your strategic input.",
            },
            { kind: "h", text: "The Benefits of the Agentic Ecosystem" },
            {
                kind: "p",
                text: "By standardizing the operational spine, you unlock true portfolio leverage. You can operate three different businesses with the overhead of one.",
            },
            {
                kind: "table",
                caption: "The Infrastructure Advantage",
                head: ["Metric", "Legacy Model", "Agentic Ecosystem"],
                rows: [
                    ["Operational Overhead", "Scales linearly with revenue", "Fixed infrastructure cost"],
                    ["Responsiveness", "9-to-5, prone to leaks", "24/7 omnichannel immediate capture"],
                    ["Portfolio Management", "Requires siloed teams", "Unified across all blueprints"],
                ],
            },
            { kind: "h", text: "Transparent Platform Pricing" },
            {
                kind: "p",
                text: "Phoxta operates on a transparent SaaS model designed to grow with your portfolio. Access the full suite of AI Operators, the Agentic Console, and unlimited blueprint deployments starting at £75/month for Starter and £250/month for Growth. Our Scale tier (£1,500/month) unlocks advanced multi-brand governance, dedicated AI fine-tuning, and priority infrastructure support.",
            },
            {
                kind: "quote",
                text: "Phoxta transforms you from an operator fighting fires into a portfolio manager allocating strategy.",
            },
            {
                kind: "p",
                text: "Stop building redundant infrastructure. Explore the Phoxta Marketplace, acquire an agentic business blueprint, and deploy the future of autonomous commerce today.",
            },
        ],
    },

    {
        slug: "start-a-coffee-subscription-business",
        title: "How to Start a Coffee Subscription Business in 2026",
        excerpt:
            "Recurring coffee is one of the most forgiving first businesses you can run — predictable demand, simple logistics, and a customer who tells you when something is wrong. Here is the operating plan.",
        category: "playbooks",
        img: "/assets/imgs/pages/img-198.webp",
        hero: "/assets/imgs/pages/img-72.webp",
        author: "Phoxta",
        date: "July 3, 2026",
        iso: "2026-07-03",
        readMinutes: 8,
        body: [
            {
                kind: "lead",
                text: "Coffee subscriptions look crowded from the outside and are surprisingly open on the inside. The category rewards operators who are consistent rather than clever: roast on a schedule, ship on a schedule, and answer people quickly. Almost every failure in this business is an operations failure, not a taste failure.",
            },
            {
                kind: "p",
                text: "That is precisely why it makes a good first business. Demand is habitual — people who drink coffee drink it every day, which means you are not persuading someone to want the product, only to buy it from you. Your job narrows to three things: sourcing something genuinely good, delivering it on time, and making it effortless to change or pause an order.",
            },
            { kind: "h", text: "Pick a narrow position before you pick a roaster" },
            {
                kind: "p",
                text: "The most common early mistake is selling \"great coffee\" — a claim every competitor also makes and no customer can verify before buying. A position that can be checked at a glance converts far better: single-origin only, decaf that is actually worth drinking, espresso roasts for home machines, or beans roasted the same week they ship.",
            },
            {
                kind: "p",
                text: "A narrow position also simplifies every downstream decision. It tells you which roaster to approach, what your bag copy says, which questions your AI agent needs to answer well, and which customers to stop chasing. Breadth is something you earn after retention is proven, not a launch strategy.",
            },
            {
                kind: "list",
                items: [
                    "Choose one axis of difference you can prove on the packaging, not in an About page.",
                    "Offer two grind options at most at launch — whole bean and one ground size covers the vast majority of orders.",
                    "Price the subscription so a single skipped month does not wipe out the margin on the customer.",
                    "Decide your default cadence (most operators land on every two weeks or monthly) and make changing it a one-click action.",
                ],
            },
            { kind: "h", text: "The operational spine" },
            {
                kind: "p",
                text: "Subscriptions fail at the seams: a card expires, a delivery slips, someone moves house, a customer wants to pause for a holiday. Each of these is small individually and fatal in aggregate, because every one of them is a moment where a customer reconsiders the whole arrangement. The businesses that retain well are the ones where those moments are handled in minutes without a human noticing.",
            },
            {
                kind: "duo",
                left: {
                    h: "Make pausing easier than cancelling",
                    p: "A customer going away for three weeks who cannot easily pause will cancel instead, and cancelling is permanent in a way pausing is not. Surface pause, skip and reschedule at least as prominently as cancel — the churn you avoid here compounds every month.",
                },
                right: {
                    h: "Answer before they ask twice",
                    p: "\"Where is my order\" is the single highest-volume question in any subscription business. If it is answered instantly, at any hour, with the actual order status, it stops being a support ticket and never becomes a refund request.",
                },
            },
            {
                kind: "p",
                text: "This is the part a Phoxta storefront is built to absorb. Orders, subscriptions, customers and conversations sit in one operating console, and the AI agent answers on the channel the customer already used — web chat, SMS, WhatsApp or email — with the real order state behind it rather than a canned reply. Delivery questions, pause requests and address changes stop landing in a personal inbox at eleven at night.",
            },
            {
                kind: "figure",
                img: "/assets/imgs/pages/img-192.webp",
                alt: "A calm desk with a coffee mug, notebook and glasses",
                caption: "The goal is a business that runs quietly on a schedule.",
            },
            { kind: "h", text: "What to measure in the first ninety days" },
            {
                kind: "p",
                text: "Revenue is a lagging and slightly misleading number early on, because a launch spike flatters you for exactly one cycle. The honest signals are retention through the second and third delivery, and how much of your week the business actually consumes.",
            },
            {
                kind: "list",
                items: [
                    "Second-order rate — the share of first-time subscribers who receive a second delivery without intervention.",
                    "Involuntary churn — cancellations caused by failed payments rather than by a decision. This is recoverable and often the largest single leak.",
                    "Pause-to-cancel ratio — a healthy business sees far more pauses than cancellations.",
                    "Hours you personally spend per week. If this is not falling by month three, the operating model is wrong, not the marketing.",
                ],
            },
            {
                kind: "quote",
                text: "A subscription business is not a product you sell once with a recurring charge attached. It is a promise you keep on a schedule, and the schedule is the product.",
            },
            { kind: "h", text: "Launching without building" },
            {
                kind: "p",
                text: "None of the above requires writing software. The storefront, checkout, subscription handling, customer records and the agent that answers on every channel are the parts that take months to build well and are identical across every coffee business in the world. Buying that stack and spending your attention on sourcing and positioning is the trade that makes this viable as a first business.",
            },
            {
                kind: "p",
                text: "See what a running commerce storefront includes on the pricing page, then start from a blueprint rather than an empty repository. The interesting work in coffee is the coffee.",
            },
        ],
    },
    {
        slug: "ai-powered-salon-tear-down",
        title: "Tear-down: What an AI-Powered Salon Really Earns",
        excerpt:
            "An illustrative unit-economics model for a two-chair salon running an AI booking and reminder agent — where the money actually comes from, and which line item quietly decides whether it works.",
        category: "tear-downs",
        img: "/assets/imgs/pages/img-154.webp",
        hero: "/assets/imgs/pages/img-168.webp",
        author: "Phoxta",
        date: "July 8, 2026",
        iso: "2026-07-08",
        readMinutes: 9,
        body: [
            {
                kind: "lead",
                text: "Appointment businesses are usually described in terms of revenue per chair. That framing hides the number that actually decides profitability: how many booked appointments turn into paid appointments. This tear-down walks a modelled two-chair salon and shows where an AI agent changes the arithmetic — and where it does not.",
            },
            {
                kind: "p",
                text: "Everything below is an illustrative model built from typical service pricing and published no-show ranges for appointment-based businesses. It is a way of reasoning about the shape of the business, not a report of audited results from a specific salon. Your own numbers will differ; the structure of the argument should not.",
            },
            { kind: "h", text: "The baseline" },
            {
                kind: "p",
                text: "Take two chairs, six working days, and an average ticket of £45. At a realistic 70% chair utilisation you are looking at roughly 25–30 appointments a week per chair. The headline revenue number that produces looks healthy. Then the leaks start.",
            },
            {
                kind: "table",
                caption: "Illustrative weekly model, two chairs. Figures are modelled, not audited.",
                head: ["Line", "Baseline", "With an always-on agent"],
                rows: [
                    ["Booked appointments / week", "56", "64"],
                    ["No-shows and late cancellations", "9 (16%)", "4 (6%)"],
                    ["Completed appointments", "47", "60"],
                    ["Average ticket", "£45", "£45"],
                    ["Weekly service revenue", "£2,115", "£2,700"],
                    ["Admin hours spent on phone / rebooking", "~8", "~2"],
                ],
            },
            {
                kind: "p",
                text: "The revenue difference in that table is not driven by charging more or by adding a chair. It comes almost entirely from two places: appointments that were never booked because nobody answered the phone, and appointments that were booked but silently evaporated.",
            },
            { kind: "h", text: "Leak one: the unanswered enquiry" },
            {
                kind: "p",
                text: "A salon is busiest with clients precisely when it is busiest with enquiries. The phone rings mid-appointment and goes unanswered; the message arrives at nine in the evening and is read at nine the next morning, by which point the customer has booked elsewhere. This is invisible in the accounts because a booking that never happened leaves no trace.",
            },
            {
                kind: "p",
                text: "An agent that answers on the channel the customer used — call, SMS, WhatsApp or web chat — and can actually see the diary converts a meaningful share of those. The important detail is that it must hold real availability and be able to write the booking. An agent that only takes a message reproduces the original problem with extra steps.",
            },
            { kind: "h", text: "Leak two: the no-show" },
            {
                kind: "p",
                text: "No-shows are the most expensive line in an appointment business because the cost is total: the slot cannot be resold after the fact, and the stylist was present and paid regardless. Reminders reduce them, but the mechanism matters. A one-way reminder that cannot be replied to converts a no-show into a no-show that was warned about.",
            },
            {
                kind: "duo",
                left: {
                    h: "Reminders that can be answered",
                    p: "A reminder the customer can reply to — to confirm, move or cancel — turns a dead notification into a rebooking opportunity. A cancellation received the day before is a slot you can still fill; a cancellation received in the chair is revenue that is gone.",
                },
                right: {
                    h: "Filling the gap automatically",
                    p: "When a slot does free up, the value is in offering it immediately to people who wanted that window. Doing this by hand is unrealistic mid-shift, which is exactly why it usually does not happen at all.",
                },
            },
            {
                kind: "figure",
                img: "/assets/imgs/pages/img-177.webp",
                alt: "A finished salon cut and style",
                caption: "The chair is only earning when the appointment is actually kept.",
            },
            { kind: "h", text: "The line item that decides it" },
            {
                kind: "p",
                text: "Notice what did not change in the model: the average ticket. Operators reach for price increases first because they are the most visible lever, but a price rise applies to completed appointments only, while reducing no-shows increases the number of completed appointments outright. In a business running at 16% no-shows, recovering half of those is worth more than a 10% price rise — and it costs the customer nothing, so it carries no churn risk.",
            },
            {
                kind: "quote",
                text: "In appointment businesses, the cheapest revenue available is the revenue you already booked and then lost.",
            },
            { kind: "h", text: "What this does not fix" },
            {
                kind: "p",
                text: "Being straight about the limits: an agent does not make the haircut better, does not fix a bad location, and does not create demand where none exists. If the chairs are empty because nobody in the area wants the service at that price, automation makes an unprofitable business slightly more efficient at being unprofitable.",
            },
            {
                kind: "p",
                text: "Where it earns its place is in businesses with real demand and leaky operations — which, in practice, is most of them. The diagnostic is simple: count last month's no-shows and count the enquiries that went unanswered for more than an hour. If either number is uncomfortable, the model above is describing your salon.",
            },
        ],
    },
    {
        slug: "instagram-audience-to-dtc-brand",
        title: "From an Instagram Audience to a DTC Brand in Six Weeks",
        excerpt:
            "An audience is not a business, but it is the hardest part of one to build. Here is a realistic six-week sequence for turning followers into a storefront that holds up.",
        category: "case-studies",
        img: "/assets/imgs/pages/img-183.webp",
        hero: "/assets/imgs/pages/wbd2.jpg",
        author: "Phoxta",
        date: "July 12, 2026",
        iso: "2026-07-12",
        readMinutes: 7,
        body: [
            {
                kind: "lead",
                text: "If you have an engaged audience, you already own the expensive asset. Most people trying to start a brand are paying to acquire attention you were given. The work in front of you is narrower than it looks — turning attention into a transaction without spending it all in the process.",
            },
            {
                kind: "p",
                text: "Six weeks is realistic for this, not aggressive, provided you resist the urge to build. The sequence below assumes you are buying the commerce stack and spending your time on product, positioning and the launch itself.",
            },
            { kind: "h", text: "Weeks one and two — decide what you actually sell" },
            {
                kind: "p",
                text: "The instinct is to sell the thing your audience talks about. The better move is usually to sell the thing they ask you for. Those are different, and the gap between them is where most first products die. Go through your DMs and comments and count requests rather than compliments.",
            },
            {
                kind: "list",
                items: [
                    "Pick one product, in one variant range. A launch catalogue of three products with four variants each is a warehousing problem you have not earned yet.",
                    "Confirm supply before you confirm the date. A launch that sells out in an hour and cannot restock for nine weeks costs you the audience's patience.",
                    "Write the product page copy before the product exists — if you cannot make it compelling in text, a photograph will not save it.",
                ],
            },
            { kind: "h", text: "Weeks three and four — stand the storefront up" },
            {
                kind: "p",
                text: "This is the phase that historically consumed the whole timeline and now should not. You need a storefront on your own domain, a checkout that works on a phone, product and inventory records, and somewhere for customer conversations to land. None of that is differentiating and all of it is required.",
            },
            {
                kind: "p",
                text: "Starting from a running commerce blueprint rather than an empty project means the first two weeks of this phase are spent on brand, photography and copy instead of on payment integration and order emails. Put the storefront on your own domain early — sending a launch audience to a generic subdomain undercuts the brand you spent years building.",
            },
            {
                kind: "figure",
                img: "/assets/imgs/pages/wbd3.webp",
                alt: "A branded product storefront on a custom domain",
                caption: "Own the domain before launch day, not after it.",
            },
            { kind: "h", text: "Week five — rehearse the failure modes" },
            {
                kind: "p",
                text: "Launches do not usually fail on traffic. They fail on the hour after traffic arrives: a discount code that does not apply, a shipping estimate nobody can find, a question asked two hundred times that only you can answer. Every one of those turns a buyer into a refund or a silence.",
            },
            {
                kind: "duo",
                left: {
                    h: "Write the answers down first",
                    p: "Shipping times, returns, sizing, materials, restock timing. Load them into the agent that handles your storefront conversations so the two-hundredth person gets the same answer as the first — instantly, and while you are asleep.",
                },
                right: {
                    h: "Test the unhappy paths",
                    p: "Place a real order. Then cancel one, apply a promo code, and ask a question from a phone as a customer would. The bugs that hurt on launch day are always in the paths nobody rehearsed.",
                },
            },
            { kind: "h", text: "Week six — launch narrow, then widen" },
            {
                kind: "p",
                text: "Open to a subset first — your close followers, an email list, or a story with a limited-quantity framing. This is not a marketing trick; it is a load test with forgiving participants. You want the first fifty orders to surface the operational problems while the audience still assumes good faith.",
            },
            {
                kind: "quote",
                text: "Your audience will forgive a delay they were told about. They will not forgive silence, and silence is what happens when one person is doing support by hand.",
            },
            {
                kind: "p",
                text: "After launch, the metric that matters is not the launch-day total — that number is a function of audience size and says little about the business. Watch the second purchase, and watch how much of your week the storefront consumes. An audience-led brand that costs you thirty hours a week has replaced a job with a harder one.",
            },
            {
                kind: "p",
                text: "The point of buying the stack rather than building it is that the six weeks go into the parts only you can do. Nobody else can convert your audience. Plenty of software can take the order.",
            },
        ],
    },
    {
        slug: "buy-dont-build",
        title: "Buy, Don't Build: A Smarter Way to Start a Business",
        excerpt:
            "Building from scratch feels like the ambitious choice. Usually it is just the expensive one — and it spends your scarcest resource on the least differentiating work.",
        category: "playbooks",
        img: "/assets/imgs/pages/img-122.webp",
        hero: "/assets/imgs/pages/img-118.webp",
        author: "Phoxta",
        date: "July 17, 2026",
        iso: "2026-07-17",
        readMinutes: 6,
        body: [
            {
                kind: "lead",
                text: "There is a persistent belief that starting from nothing is the honest way to start a business, and that anything else is shortcutting. It is worth examining, because the belief costs founders more time than any other single idea in the category.",
            },
            {
                kind: "p",
                text: "The question is not whether building is admirable. It is what you are building, and whether a customer will ever be able to tell. Almost every new business needs authentication, payments, a customer record, an order or booking model, transactional email, a content system and somewhere for conversations to land. None of it is visible to a customer as a reason to buy.",
            },
            { kind: "h", text: "Where the months actually go" },
            {
                kind: "p",
                text: "Ask anyone who has launched from scratch where the time went and the answer is rarely the product. It went into the checkout edge case, the email that renders wrong in Outlook, the webhook that fires twice, the admin screen nobody outside the company will ever see. This work is real and it is necessary — it is simply identical to the same work at ten thousand other companies.",
            },
            {
                kind: "duo",
                left: {
                    h: "Undifferentiated by definition",
                    p: "No customer has ever chosen a brand because its password reset flow was elegant. Effort here is invisible at best; when it goes wrong it is only ever a negative signal.",
                },
                right: {
                    h: "Differentiated by definition",
                    p: "Your sourcing, your positioning, your audience, your service quality, the reason someone picks you over the alternative. This is the work that cannot be bought, and the only work that compounds.",
                },
            },
            {
                kind: "figure",
                img: "/assets/imgs/pages/FS2.webp",
                alt: "A live storefront running on its own domain",
                caption: "What buying should get you: a running storefront, not a repository.",
            },
            { kind: "h", text: "The honest case for building" },
            {
                kind: "p",
                text: "Building is the right call in one specific circumstance: when the thing you would be building is itself the differentiator. If your business is a novel matching algorithm, an unusual pricing engine, or a genuinely new interaction model, then that belongs to you and should be built by you.",
            },
            {
                kind: "p",
                text: "The failure is applying that reasoning to the surrounding scaffolding. Teams with a legitimately novel core routinely spend their first year building the ordinary parts around it, and arrive at the market late with a differentiator nobody has seen yet.",
            },
            {
                kind: "quote",
                text: "Build the part a customer would switch to you for. Buy the part they would only ever notice if it broke.",
            },
            { kind: "h", text: "What buying should actually get you" },
            {
                kind: "p",
                text: "\"Buy\" is doing a lot of work in that sentence, and the distinction that matters is between a template and a running business. A template is a set of files you now own and must operate. A running business is a live storefront, a working checkout, a customer and order model, and an operating console you log into on Monday morning.",
            },
            {
                kind: "list",
                items: [
                    "It should be live on day one, on a domain you control, not a project you still have to deploy.",
                    "It should come with the operational surface — orders, customers, conversations, content — not just a front end.",
                    "It should handle customer contact on the channels people actually use, rather than routing everything to a personal inbox.",
                    "You should be able to change the parts that make it yours — brand, catalogue, copy, pricing — without touching code.",
                ],
            },
            {
                kind: "p",
                text: "That last point is the one that separates buying a business from buying a website. If making it yours requires a developer, you have not bought a business; you have bought a maintenance obligation.",
            },
            { kind: "h", text: "The trade you are really making" },
            {
                kind: "p",
                text: "Building trades money for time and control. Buying trades money for time in the other direction — you give up the satisfaction of having made every part, and you get months back at the only stage where months are decisive. First revenue is not merely a milestone; it is the thing that tells you whether the idea survives contact with customers.",
            },
            {
                kind: "p",
                text: "Most businesses do not fail because the underlying software was bought rather than written. They fail because they took so long to reach a customer that the founder ran out of money, patience, or belief before finding out whether anyone wanted it.",
            },
        ],
    },
    {
        slug: "launch-online-restaurant-without-tech-team",
        title: "How to Launch an Online Restaurant Without Hiring a Tech Team",
        excerpt:
            "Online ordering is now half of a restaurant's front of house — and most operators bolt it on as an afterthought run by a tablet in the corner. Here is how to launch it as a real channel you own.",
        category: "playbooks",
        img: "/assets/imgs/pages/FS3.webp",
        hero: "/assets/imgs/pages/wbd1.webp",
        author: "Phoxta",
        date: "July 22, 2026",
        iso: "2026-07-22",
        readMinutes: 8,
        body: [
            {
                kind: "lead",
                text: "A restaurant is already two full-time jobs: the food, and the service. The mistake most operators make with online ordering is treating it as a third — a website project, an app relationship, a tablet on the counter that chirps at the worst possible moment. Done properly, the online side is not another job. It is the part of the business best suited to running itself.",
            },
            {
                kind: "p",
                text: "What \"online restaurant\" actually means in practice is narrower than the phrase suggests: a menu people can read on a phone, modifiers that capture how people really order, a checkout that works, order tracking that answers the where-is-it question before it is asked, and something that responds when a customer wants to change, add, or complain. Every one of those is a solved problem. None of them needs to be solved by you.",
            },
            { kind: "h", text: "Put the whole menu online — but not on day one" },
            {
                kind: "p",
                text: "Kitchens and websites fail the same way: too many items, each done slightly worse. Launch with the dishes that travel well and photograph honestly, and let the dine-in menu keep the rest. A short online menu also keeps your modifier logic sane — and modifiers are where online ordering is won or lost, because they are the difference between \"no onions, extra sauce\" arriving correctly and a refund conversation.",
            },
            {
                kind: "list",
                items: [
                    "Start with the ten to fifteen items you would defend in a review, not the full carte.",
                    "Model modifiers properly from the start — sizes, sides, spice levels, removals. Free-text instruction boxes are where mistakes and disputes breed.",
                    "Photograph the food you actually serve, in the containers it actually arrives in.",
                    "Decide your delivery radius and your quiet hours before launch, and let the ordering page enforce them so you never have to.",
                ],
            },
            { kind: "h", text: "The apps are a channel, not a home" },
            {
                kind: "p",
                text: "Marketplace apps bring you customers and charge you for the privilege — a commission on every order, and more importantly, ownership of the relationship. The customer who orders through an app is the app's customer; you cannot reach them, thank them, or bring them back. That is a fine trade for discovery. It is a terrible trade for regulars.",
            },
            {
                kind: "duo",
                left: {
                    h: "What the apps are for",
                    p: "Reach. People who have never heard of you scroll them hungry. Treat the commission as a marketing cost for acquiring a first order, because that is what it is.",
                },
                right: {
                    h: "What your storefront is for",
                    p: "Margin and memory. Direct orders keep the commission in the till, and the customer record — what they ordered, when, how often — belongs to you. Repeat business lives here.",
                },
            },
            {
                kind: "figure",
                img: "/assets/imgs/pages/img-165.webp",
                alt: "Front-of-house staff talking around a table by a window",
                caption: "Keep people where they matter — in the room, not on the phone.",
            },
            { kind: "h", text: "The phone is the hidden workload" },
            {
                kind: "p",
                text: "Ask any operator where the evening actually goes and it is not the pass — it is the phone. Where is my order. Are you open Sunday. Can you do it without nuts. Can I move my booking to eight. Each call is a minute of a person you are paying to be somewhere else, taken during the exact hours you are busiest.",
            },
            {
                kind: "p",
                text: "This is the workload a Phoxta restaurant absorbs outright. The agent answers on the channel the customer used — web chat, SMS, WhatsApp or the phone itself — with the real order status, the real menu, and the real table availability behind it. Allergen questions get consistent answers. Booking changes write straight to the diary. The tablet in the corner stops being a job title.",
            },
            { kind: "h", text: "What to watch in the first month" },
            {
                kind: "list",
                items: [
                    "Direct-to-marketplace order mix — the share of orders arriving through your own storefront should climb every week, because those are the orders with full margin.",
                    "Repeat rate at thirty days — a takeaway that people order twice is a business; one they order once was a promotion.",
                    "Time-to-acknowledge — how long an order sits before the customer knows the kitchen has it. Silence here generates the calls.",
                    "Refund rate by dish — one item usually accounts for most of the trouble. Fix it or drop it.",
                ],
            },
            {
                kind: "quote",
                text: "The kitchen closes at ten. The questions do not. The difference between those two clocks is either your evening or your software's.",
            },
            {
                kind: "p",
                text: "None of this requires hiring a developer or gluing six subscriptions together. A Phoxta restaurant starts as a running business — storefront, menu and modifiers, checkout, order tracking, reservations and the agent that answers — and the pricing page shows what running it costs. Your attention belongs on the food; the rest is the machine's job.",
            },
        ],
    },
    {
        slug: "small-car-rental-fleet-unit-economics",
        title: "Tear-down: The Unit Economics of a Small Car Rental Fleet",
        excerpt:
            "A rental fleet looks like an asset business, but it behaves like a calendar business — an illustrative model of six cars, and the two leaks that quietly decide whether the fleet pays for itself.",
        category: "tear-downs",
        img: "/assets/imgs/pages/wbd4.webp",
        hero: "/assets/imgs/pages/FS1.webp",
        author: "Phoxta",
        date: "July 26, 2026",
        iso: "2026-07-26",
        readMinutes: 9,
        body: [
            {
                kind: "lead",
                text: "Car rental is usually discussed as an asset business — what the cars cost, what they depreciate, what they fetch per day. That framing misses where small fleets actually live or die: the calendar. A car is a fixed cost every single day; it only becomes revenue on the days someone is holding the keys. Utilisation is the whole game, and utilisation is mostly a responsiveness problem.",
            },
            {
                kind: "p",
                text: "The numbers below are an illustrative model built from typical day rates and published utilisation ranges for independent operators — a way of reasoning about the shape of the business, not audited results from a specific fleet. Your rates, your market and your insurance will move the figures; they should not move the structure of the argument.",
            },
            { kind: "h", text: "The baseline: six cars" },
            {
                kind: "p",
                text: "Take a six-car fleet at an average of £48 a day. At 62% utilisation — a realistic figure for an operator handling enquiries by phone and message during business hours — the fleet earns around £1,250 a week. The interesting question is where the other 38% of days go.",
            },
            {
                kind: "table",
                caption: "Illustrative weekly model, six cars at £48/day average. Figures are modelled, not audited.",
                head: ["Line", "Baseline", "With an always-on booking agent"],
                rows: [
                    ["Fleet days available", "42", "42"],
                    ["Days rented (utilisation)", "26 (62%)", "31 (74%)"],
                    ["Average daily rate", "£48", "£48"],
                    ["Extras revenue (seats, insurance, delivery)", "£85", "£160"],
                    ["Weekly revenue", "£1,333", "£1,648"],
                    ["Admin hours on enquiries and paperwork", "~10", "~3"],
                ],
            },
            {
                kind: "p",
                text: "No price rise, no seventh car. The difference is made of enquiries that used to die waiting and extras that used to go unoffered. Those are the two leaks, and they compound.",
            },
            { kind: "h", text: "Leak one: the nine-o'clock enquiry" },
            {
                kind: "p",
                text: "People book cars the way they book flights — in the evening, comparing tabs, ready to commit. An enquiry sent at 21:40 and answered at 9:15 the next morning is not a delayed booking; most of the time it is someone else's booking. The operator never sees the loss because it arrives as silence.",
            },
            {
                kind: "p",
                text: "An agent that holds the real fleet calendar can quote availability, take the deposit and confirm the booking in the same conversation, at any hour, on the channel the enquiry arrived on. The bar to clear is the same as in every booking business: it must see true availability and be able to write to it. An autoresponder that promises a call-back tomorrow is the leak with a bow on it.",
            },
            { kind: "h", text: "Leak two: the unoffered extra" },
            {
                kind: "p",
                text: "Extras — child seats, additional drivers, excess reduction, delivery to the door — are close to pure margin, and they are chronically under-sold for an entirely human reason: the person at the counter is busy, and asking feels like upselling. Software does not get embarrassed. Offered consistently and neutrally at booking time, attach rates climb without a single price changing.",
            },
            {
                kind: "duo",
                left: {
                    h: "Deposits and terms up front",
                    p: "Most rental disputes are really surprise disputes — the deposit, the fuel policy, the mileage cap discovered at the counter. Terms stated plainly in the booking conversation convert fewer bookings into arguments and more of them into returns.",
                },
                right: {
                    h: "The no-show, priced in",
                    p: "A no-show in rental is a day of fleet cost with no revenue against it. Card-backed deposits and a reminder the customer can reply to — confirm, move, cancel — turn most of them into either kept bookings or resellable days.",
                },
            },
            {
                kind: "figure",
                img: "/assets/imgs/pages/img-140.webp",
                alt: "A repeating concrete facade of identical bays",
                caption: "A fleet is a set of identical bays. Empty ones cost the same as full ones.",
            },
            {
                kind: "quote",
                text: "A rental car loses money twice: on the day nobody rented it, and in the evening somebody tried to.",
            },
            { kind: "h", text: "What this does not fix" },
            {
                kind: "p",
                text: "Responsiveness multiplies demand; it does not create it. If the market is thin, the location wrong or the fleet mismatched to what people want to drive, an agent makes the phone quieter and the maths only slightly better. The diagnostic before investing in anything: count last month's enquiries that waited more than an hour for an answer, and count the days each car sat idle. If either number makes you wince, the model above is describing your fleet.",
            },
            {
                kind: "p",
                text: "A Phoxta rental business starts with the storefront, live availability, deposits, extras and the always-on agent already wired together — the pricing page shows what it includes. The cars are your job; the calendar can look after itself.",
            },
        ],
    },
    {
        slug: "what-an-ai-agent-does-at-3am",
        title: "What an AI Agent Actually Does for Your Storefront at 3 A.M.",
        excerpt:
            "A third of the clock happens outside your working hours. A walk through one night of a storefront that answers — and what governance has to look like for you to sleep through it safely.",
        category: "playbooks",
        img: "/assets/imgs/pages/img-100.webp",
        hero: "/assets/imgs/pages/img-110.webp",
        author: "Phoxta",
        date: "July 31, 2026",
        iso: "2026-07-31",
        readMinutes: 7,
        body: [
            {
                kind: "lead",
                text: "The order placed at three in the morning is not an edge case. Between evening browsers, other time zones and the simple fact that people shop when their day allows, a third of a storefront's clock runs while its owner is asleep. The question is not whether things happen overnight — they do — but whether anything answers.",
            },
            {
                kind: "p",
                text: "Here is what a typical night actually contains for a small storefront: a customer asking where yesterday's order is, someone abandoning a basket over a shipping question, a booking request from a customer six hours ahead of you, a size query on a product page, and one genuinely unhappy message composed at midnight with feeling. Five conversations. Each one is either answered in the moment or waiting to become something worse at breakfast.",
            },
            { kind: "h", text: "The four conversations that happen after hours" },
            {
                kind: "list",
                items: [
                    "Where is my order — the highest-volume question in commerce, and the easiest to answer perfectly if the agent can see real order state.",
                    "Can I change or cancel — time-sensitive by nature; an answer at 8 a.m. is often an answer to a question that no longer matters.",
                    "Does it fit, does it suit, is it in stock — pre-purchase questions where an instant answer is frequently the sale itself.",
                    "Something is wrong — the message that most needs acknowledgement in minutes, because grievance compounds overnight in a way gratitude does not.",
                ],
            },
            {
                kind: "p",
                text: "The common thread: none of these can be handled well by a canned reply. They are only worth automating if the agent is answering from the actual state of the business — the order record, the stock level, the booking calendar, the returns policy as written. An agent that answers confidently without that grounding is worse than voicemail.",
            },
            { kind: "h", text: "What \"answering\" has to mean" },
            {
                kind: "duo",
                left: {
                    h: "Reads the real state",
                    p: "The agent sees orders, inventory, bookings and the customer's own history — so \"where is it\" gets a tracking status, not a promise that someone will check.",
                },
                right: {
                    h: "Acts inside guardrails",
                    p: "Some actions it takes outright; some it queues for your approval; some it is simply not allowed. You set those lines per action, and every step is logged.",
                },
            },
            {
                kind: "p",
                text: "That second half is the part that lets you actually sleep. On a Phoxta business the agent's write-access is governed: each kind of action — issuing a refund, moving a booking, changing an order — is set to off, approve-first, or automatic. The overnight refund request does not silently empty the till; it sits in an approval queue with the conversation attached, and the audit trail records everything the agent did and why.",
            },
            {
                kind: "figure",
                img: "/assets/imgs/pages/img-195.webp",
                alt: "A desk with a keyboard and an open planner",
                caption: "The morning handover: what happened, what was handled, what needs you.",
            },
            { kind: "h", text: "The morning after" },
            {
                kind: "p",
                text: "The measure of a good overnight agent is what your first coffee looks like. Instead of an inbox of small fires, you get a briefing: conversations handled, orders taken, the two decisions that genuinely need a human, queued and contextualised. The number to watch is first-response time across the whole clock — when the 3 a.m. customer and the 3 p.m. customer get the same experience, the night has stopped being a liability.",
            },
            {
                kind: "quote",
                text: "Customers do not experience your working hours. They experience your response times.",
            },
            {
                kind: "p",
                text: "Every Phoxta business ships with this as standard equipment — the agent on every channel, the governance controls, the audit trail and the morning briefing. The pricing page shows the plans; the night shift is included.",
            },
        ],
    },
    {
        slug: "travel-experiences-margin-tear-down",
        title: "Tear-down: Where a Travel Experiences Business Makes Its Margin",
        excerpt:
            "Tours and experiences price like retail but perish like airline seats. An illustrative model of a small operator — and why the margin lives in the last three seats of departures you were running anyway.",
        category: "tear-downs",
        img: "/assets/imgs/pages/img-190.webp",
        hero: "/assets/imgs/pages/bg-img-4.webp",
        author: "Phoxta",
        date: "August 5, 2026",
        iso: "2026-08-05",
        readMinutes: 8,
        body: [
            {
                kind: "lead",
                text: "An experiences business — walking tours, kayak trips, tastings, day hikes — has retail prices and airline economics. The tour departs whether it is carrying six people or ten, and the cost of running it barely moves. That single fact decides where the margin is: not in raising prices, but in the seats you were already paying to move.",
            },
            {
                kind: "p",
                text: "As with every tear-down in this series, the model below is illustrative — built from typical group sizes and pricing for small operators, not audited from a specific business. The numbers will differ in your market. The shape will not.",
            },
            { kind: "h", text: "The baseline: two departures a day" },
            {
                kind: "p",
                text: "Take one guide running two departures a day, six days a week, with capacity for ten guests at £59 a head. The costs — the guide's day, insurance, kit, permits — are fixed per departure. Every guest after breakeven is close to pure margin, which is why average fill is the number that matters more than any other.",
            },
            {
                kind: "table",
                caption: "Illustrative weekly model, twelve departures, capacity 10, £59/guest. Figures are modelled, not audited.",
                head: ["Line", "Baseline", "With an always-on booking agent"],
                rows: [
                    ["Departures / week", "12", "12"],
                    ["Average fill", "5.8 / 10", "7.4 / 10"],
                    ["Guests / week", "70", "89"],
                    ["No-shows (no deposit vs deposit-backed)", "6", "2"],
                    ["Weekly revenue", "£4,130", "£5,251"],
                    ["Hours answering enquiries", "~9", "~2"],
                ],
            },
            {
                kind: "p",
                text: "The uplift is not a marketing miracle. It is three mundane mechanisms working the calendar: enquiries answered while the traveller is still deciding, empty seats resold inside the final forty-eight hours, and deposits quietly converting no-shows into either kept bookings or resellable places.",
            },
            { kind: "h", text: "Questions are bookings in disguise" },
            {
                kind: "p",
                text: "Nobody buys an experience without asking something first. Is it suitable for an eight-year-old. What happens if it rains. How much walking, really. Where do we meet. Travellers ask these at ten at night from a hotel bed, usually of three operators at once — and book with whichever one answers. Speed here is not customer service; it is the sales funnel.",
            },
            {
                kind: "p",
                text: "The agent's job is to answer from the actual product — real availability, real meeting points, the weather policy as written — and to take the booking in the same conversation. In a category where the alternative operator is one tab away, the answer and the checkout have to be the same moment.",
            },
            {
                kind: "duo",
                left: {
                    h: "Deposits, framed as holding the seat",
                    p: "A seat on a departure is inventory that expires at the meeting time. A small deposit reframes the booking as a reservation rather than an intention — and funds the difference between a no-show and a cancellation you can resell.",
                },
                right: {
                    h: "The same-day review ask",
                    p: "Reviews are the acquisition engine of this category, and willingness to write one peaks in the hours after the experience. An automatic, personal ask that evening — not a survey three days later — is worth more than most ad spend.",
                },
            },
            {
                kind: "figure",
                img: "/assets/imgs/pages/FS2.webp",
                alt: "A live travel experiences storefront",
                caption: "Availability, extras and checkout in one flow — the answer and the booking are the same moment.",
            },
            {
                kind: "quote",
                text: "The product perishes twice: the departure expires on its date, and the traveller's decision window expires days earlier. Margin lives in whichever one you answer faster.",
            },
            { kind: "h", text: "What this does not fix" },
            {
                kind: "p",
                text: "None of this rescues an experience people do not want, a meeting point nobody can find, or a guide having a bad season. Fill-rate mechanics amplify a good product; they cannot substitute for one. The honest diagnostic: if your reviews are strong and your departures leave half-empty, you have a calendar problem, and calendars are automatable. If the reviews are the problem, fix the walk before the funnel.",
            },
            {
                kind: "p",
                text: "A Phoxta experiences business starts with the storefront, live availability, deposits and the always-on agent already connected — see the pricing page for what is included. The guiding is yours; the filling of seats does not have to be.",
            },
        ],
    },
    {
        slug: "one-console-three-businesses",
        title: "One Console, Three Businesses: What Running a Portfolio Actually Looks Like",
        excerpt:
            "The second business used to cost as much as the first — same stack, same support burden, same nights. A composite look at the weekly rhythm of an operator running three storefronts from one console.",
        category: "case-studies",
        // Cropped variant — the full frame has malformed hands (generation artifact).
        img: "/assets/imgs/pages/img-125-faq.webp",
        hero: "/assets/imgs/pages/img-160.webp",
        author: "Phoxta",
        date: "August 10, 2026",
        iso: "2026-08-10",
        readMinutes: 7,
        body: [
            {
                kind: "lead",
                text: "The traditional maths of a second business is brutal: it costs roughly what the first one cost — another stack, another support inbox, another set of evenings. Which is why most owners never open one, however well the first is running. The interesting change of the last few years is that the maths broke. When the operations are shared, the second business costs a fraction of the first, and the third costs less than that.",
            },
            {
                kind: "p",
                text: "What follows is a composite — drawn from how multi-business operators actually structure the week when their storefronts share one operating console — rather than a diary of a single named owner. The point is the rhythm, and the rhythm generalises.",
            },
            { kind: "h", text: "The portfolio" },
            {
                kind: "p",
                text: "Picture three storefronts with nothing in common at the shop window: a fashion label, a small rental fleet, a neighbourhood restaurant doing online orders. Different customers, different rhythms, different brands on their own domains. Underneath, they are structurally identical — a catalogue or calendar, orders or bookings, customer conversations, and an agent answering on every channel. That structural sameness is the entire trick.",
            },
            { kind: "h", text: "The week, by rhythm" },
            {
                kind: "list",
                items: [
                    "Morning, daily: three briefings read with one coffee — what each agent handled overnight, what sold, what needs a decision.",
                    "The approvals queue, daily: refunds, booking changes and exceptions the agents were not authorised to settle alone. Ten minutes, with the full conversation attached to each item.",
                    "One business gets the afternoon, in rotation: new stock for the label, fleet and pricing for the rentals, menu and promotions for the restaurant.",
                    "Everything else is exceptions — and the console's job is to make sure exceptions are the only thing that interrupts.",
                ],
            },
            {
                kind: "duo",
                left: {
                    h: "What is shared",
                    p: "The console, the agent, the approval and audit machinery, billing, domains, the muscle memory. Learning it once means operating it three times — the second business arrives with no learning curve attached.",
                },
                right: {
                    h: "What stays distinct",
                    p: "Brand, catalogue, tone of voice, customers. Each storefront lives on its own domain with its own identity, and each agent answers in its business's voice with only that business's knowledge.",
                },
            },
            {
                kind: "figure",
                img: "/assets/imgs/pages/wbd3.webp",
                alt: "A branded storefront on its own custom domain",
                caption: "Each business keeps its own brand and domain. The operations underneath are the same machine.",
            },
            { kind: "h", text: "Where the owner's time actually goes" },
            {
                kind: "p",
                text: "The surprise of a working portfolio is not that it is busy — it is where the attention lands. Time stops being allocated to whichever inbox shouts loudest and starts going to whichever business has a genuine decision pending: a supplier negotiation, a pricing experiment, a second van. The businesses that are merely running do not ask for anything. That reallocation — from firefighting to deciding — is the entire return on sharing the operations.",
            },
            {
                kind: "quote",
                text: "A portfolio is not three jobs. It is one job with three profit lines — provided the operations are one machine.",
            },
            { kind: "h", text: "When to add the second" },
            {
                kind: "list",
                items: [
                    "The first business is quiet — its agent resolves most conversations and its week runs on the briefing-and-approvals rhythm.",
                    "Retention is proven, not hoped for. A portfolio of two leaky businesses is just two problems with one owner.",
                    "You know why the second vertical — a customer overlap, a season that balances the first, a margin profile you want. \"Because it is cheap now\" is a reason to be able to; it is not a reason to.",
                    "Your plan supports it — the pricing page shows which plans carry multiple businesses.",
                ],
            },
            {
                kind: "p",
                text: "The one-business owner and the portfolio operator used to be different species — one ran a shop, the other ran a company. Shared operations quietly abolished the distinction. What remains different is judgment: which businesses to own, and what to do with the attention the machine hands back.",
            },
        ],
    },
];

// The per-solution editorial sets live in sibling files (they are surfaced on
// /marketing, /ai-tech and /brand-design as well as here). They import only
// TYPES from this file, so the value imports below are not circular.
import { MARKETING_ARTICLES } from "@/data/articles-marketing";
import { AI_ARTICLES } from "@/data/articles-ai";
import { BRAND_ARTICLES } from "@/data/articles-brand";

/** Every article, all sets. */
export const ALL_ARTICLES: Article[] = [...ARTICLES, ...MARKETING_ARTICLES, ...AI_ARTICLES, ...BRAND_ARTICLES];

/** Newest first — the order used by the index and the homepage. */
export const ARTICLES_BY_DATE: Article[] = [...ALL_ARTICLES].sort((a, b) => b.iso.localeCompare(a.iso));

export function getArticle(slug: string | undefined): Article | undefined {
    return ALL_ARTICLES.find((a) => a.slug === slug);
}

/** Previous/next in reading order, for the article footer links. */
export function getAdjacent(slug: string): { prev?: Article; next?: Article } {
    const i = ARTICLES_BY_DATE.findIndex((a) => a.slug === slug);
    if (i === -1) return {};
    return { prev: ARTICLES_BY_DATE[i + 1], next: ARTICLES_BY_DATE[i - 1] };
}
