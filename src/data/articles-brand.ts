// Phoxta — the brand & design editorial set.
//
// Four articles on brand identity, surfaced on /brand-design (the Insights for
// Founders grid) and on /blog alongside the main editorial set. Kept in its own
// file so the section imports only what it renders; the aggregate blog imports
// this file, so this file must only ever import *types* from articles.ts.

import type { Article } from "@/data/articles";

export const BRAND_ARTICLES: Article[] = [
    {
        slug: "what-makes-a-brand-identity-distinctive",
        title: "What Makes a Brand Identity Truly Distinctive",
        excerpt:
            "Most small brands chase differentiation and skip distinctiveness — the humbler, more valuable property of simply being recognised. Here is the difference, and how to build for it.",
        category: "playbooks",
        img: "/assets/imgs/pages/home-7/insight-1-retro.webp",
        hero: "/assets/imgs/pages/bg-img-2.webp",
        author: "Phoxta",
        date: "July 3, 2026",
        iso: "2026-07-03",
        readMinutes: 8,
        body: [
            {
                kind: "lead",
                text: "Ask a room of business owners what makes a brand strong and most will answer with some version of \"standing out\". It is the right instinct pointed at the wrong target. The brands that win in small-business categories are rarely the most unusual ones. They are the most recognisable ones — and recognisable is a property you can build deliberately, on a budget, starting this week.",
            },
            {
                kind: "p",
                text: "The distinction matters because it changes what you spend your effort on. Chasing \"different\" leads to a novel logo, a clever name and a launch — and then a slow drift back to looking like everyone else, because different is exhausting to maintain. Building \"recognisable\" leads somewhere else entirely: a small set of assets, used with almost boring consistency, until customers can identify you from a corner of a photo.",
            },
            { kind: "h", text: "Distinctive is not the same as different" },
            {
                kind: "p",
                text: "Differentiation is a claim about the product — we are faster, kinder, organic, cheaper. Distinctiveness is a property of the presentation — when people see you, they know it is you. The two are often confused because both get filed under \"branding\", but they fail in different ways. A differentiated brand nobody recognises has an argument nobody hears. A distinctive brand with no differentiation at least gets remembered, and memory is what people buy from.",
            },
            {
                kind: "p",
                text: "For a small business the order of operations is unambiguous: distinctiveness first. Your customers do not compare you against a spreadsheet of competitors; they half-remember you from an Instagram post, a bag on a café table, a friend's mention. The brand's job in that moment is not to persuade. It is to be findable in someone's memory.",
            },
            { kind: "h", text: "Brand codes: the assets that do the remembering" },
            {
                kind: "p",
                text: "The practical unit of distinctiveness is the brand code — a repeatable, ownable element that shows up everywhere you do. Not the whole identity: a piece of it, small enough to survive being cropped, shrunk, printed badly and glimpsed in passing.",
            },
            {
                kind: "list",
                items: [
                    "A colour used with unreasonable commitment — not \"blue\", but one blue, on everything, until the colour alone reads as you.",
                    "A shape or device: a border, a sticker, an underline, a way of framing photographs.",
                    "A verbal tic — how you open emails, how you name products, a sign-off customers start quoting back.",
                    "A typographic voice: one or two typefaces, set the same way, everywhere from the storefront to the shipping label.",
                ],
            },
            {
                kind: "p",
                text: "Notice what is not on that list: the logo on its own. A logo is a brand code, but it is the one every competitor also has, and the one customers see least often at full size. The brands people recognise from across a room are running three or four codes at once, and most of them are cheaper than a logo redesign.",
            },
            {
                kind: "duo",
                left: {
                    h: "Codes compound; campaigns expire",
                    p: "A campaign is spending that stops working when it stops running. A code is spending that accumulates — every appearance makes the next one slightly more effective. Small budgets should be biased almost entirely towards codes.",
                },
                right: {
                    h: "Ownable beats beautiful",
                    p: "A tasteful identity that looks like the rest of the category is a rounding error in memory. An idiosyncratic one — slightly too orange, oddly formal, weirdly specific — is a hook. If nothing about your identity makes a designer wince a little, it may be too safe to stick.",
                },
            },
            {
                kind: "figure",
                img: "/assets/imgs/pages/home-7/sec-7-photo.webp",
                alt: "A workspace with brand materials laid out for review",
                caption: "The test is not the mood board. It is whether a cropped corner still reads as you.",
            },
            { kind: "h", text: "Consistency is the multiplier" },
            {
                kind: "p",
                text: "Every brand code is worthless the day it launches and valuable in proportion to how often it has been repeated. This is where small brands actually fail — not at choosing assets but at holding them. The owner gets bored long before the customer gets familiar, refreshes the look at month eight, and resets the memory-building to zero. The boredom is a signal that it is working: you see your own brand a hundred times more often than any customer does.",
            },
            {
                kind: "quote",
                text: "Customers cannot be loyal to a brand they cannot recognise. Consistency is not a design virtue; it is the mechanism by which recognition exists at all.",
            },
            { kind: "h", text: "The small-business advantage" },
            {
                kind: "p",
                text: "Large brands buy distinctiveness with reach — enough impressions to make even a bland identity familiar. Small brands cannot, which sounds like a disadvantage until you notice the compensation: a small brand can be far more idiosyncratic than a large one, because it does not have to please a committee or travel across forty markets. Specificity is your budget. Spend it.",
            },
            {
                kind: "p",
                text: "The operational side of consistency is worth automating out of existence. On a Phoxta business the brand lives in one place — logo, palette, fonts — and the storefront applies it everywhere, so the checkout, the product pages and the emails cannot drift out of step with each other. That does not choose your codes for you. It just removes the hundred small moments where consistency usually leaks.",
            },
            {
                kind: "p",
                text: "Start smaller than feels ambitious: pick two codes you can commit to for a year, put them on everything, and resist the refresh. Distinctiveness is not a launch. It is a habit with compound interest.",
            },
        ],
    },
    {
        slug: "anatomy-of-a-brand-logo-palette-type-voice",
        title: "Logo, Palette, Type, Voice: The Anatomy of a Brand",
        excerpt:
            "An identity system is four instruments doing different jobs, not one logo doing everything. A working tear-down of what each part is for — and the failure mode each one has.",
        category: "tear-downs",
        img: "/assets/imgs/pages/home-7/insight-2-office.webp",
        hero: "/assets/imgs/pages/bg-img-3.webp",
        author: "Phoxta",
        date: "July 8, 2026",
        iso: "2026-07-08",
        readMinutes: 9,
        body: [
            {
                kind: "lead",
                text: "When a small-business owner says \"I need branding\", they almost always mean a logo. But a logo is one instrument in a four-piece band, and it is not even the one doing most of the work. This tear-down takes the identity system apart — logo, palette, type, voice — and asks the only useful question about each part: what job does it do, and how do you know when it is failing?",
            },
            {
                kind: "p",
                text: "The framing matters because it changes where you spend. Owners routinely put ninety percent of the brand budget into the logo and improvise the rest — which is exactly backwards, because customers meet the palette, the type and the voice far more often than they study the mark.",
            },
            { kind: "h", text: "The logo: a signature, not a summary" },
            {
                kind: "p",
                text: "The most common logo mistake is asking it to explain the business — to somehow contain the product, the values and the founding story in one mark. Logos cannot carry meaning at the start; they collect it over time, the way a signature means nothing until you know the person. The design brief is therefore mostly mechanical: legible at 32 pixels, works in one colour, survives being embroidered, printed and cropped.",
            },
            {
                kind: "p",
                text: "The failure mode is over-description — a mark so busy explaining that it dies at small sizes, which is where logos live now. If yours is unreadable as a favicon or a social avatar, it is failing at its actual job regardless of how good it looks on the deck.",
            },
            { kind: "h", text: "The palette: recognition at a distance" },
            {
                kind: "p",
                text: "Colour is the fastest signal in the system — it is read before the name, before the type, sometimes before conscious attention. Which is why the useful palette decision is not \"which colours are nice\" but \"which colour will we own\". One dominant colour used relentlessly beats five used tastefully, because ownership requires repetition and repetition divided five ways is dilution.",
            },
            { kind: "h", text: "Type: the voice you can see" },
            {
                kind: "p",
                text: "Typography is the part of the identity customers read for minutes at a time without noticing it exists — which is precisely its power. A geometric sans and a bookish serif say different things before the first word lands. Two typefaces are enough: one for headlines with some character, one for body text that disappears politely. The failure mode is accumulation — a third face for the promo, a fourth on the menu — until nothing reads as belonging to anything.",
            },
            { kind: "h", text: "Voice: the part most owners skip" },
            {
                kind: "p",
                text: "Voice is the identity element with no artwork, which is why it gets skipped — and the one customers now encounter most, because so much of a modern business is text: product pages, order emails, chat replies, the answer at eleven at night. An identity with a beautiful palette and an inconsistent voice reads as two different companies.",
            },
            {
                kind: "list",
                items: [
                    "Decide the register: do you write like a knowledgeable friend, a concierge, a workshop? Pick one and write it down.",
                    "Set three words you always sound like and three you never sound like — this does more work than a page of guidelines.",
                    "Cover the unglamorous surfaces: refund emails, out-of-stock notices, delivery delays. Voice is proven under bad news, not in the hero headline.",
                    "If an AI agent answers your customers, its instructions are a brand document. Give it the same register, and the 3 a.m. reply stays in character.",
                ],
            },
            {
                kind: "table",
                caption: "The four instruments, and how each one fails.",
                head: ["Element", "The job it does", "The common failure"],
                rows: [
                    ["Logo", "A recognisable signature at any size", "Over-explains; dies at small sizes"],
                    ["Palette", "Instant recognition before reading", "Five nice colours, none owned"],
                    ["Type", "Sets tone through every sentence", "Accumulates faces until tone dissolves"],
                    ["Voice", "Keeps every message in character", "Undefined, so it varies by mood and author"],
                ],
            },
            {
                kind: "duo",
                left: {
                    h: "The system is the asset",
                    p: "No single element carries the brand. Recognition comes from the elements agreeing with each other — the palette that matches the voice that matches the type. Coherence is what customers actually perceive as \"professional\".",
                },
                right: {
                    h: "Consistency is infrastructure",
                    p: "Agreement across every surface is not a discipline problem; it is a tooling problem. On a Phoxta storefront the logo, palette and fonts are stored once as the business's brand and applied across the whole storefront — so the system cannot drift apart page by page.",
                },
            },
            {
                kind: "quote",
                text: "A brand identity is not a logo with accessories. It is four instruments playing the same song — and customers only notice when one is out of tune.",
            },
            { kind: "h", text: "Where to actually spend" },
            {
                kind: "p",
                text: "If the budget is small, invert the usual allocation: get a competent, legible logo quickly, then spend the remaining money and attention on the palette decision, the two typefaces and a one-page voice document. Those three are what customers experience daily, and they are also the three that owners improvise. A modest mark inside a coherent system beats a beautiful mark inside chaos every time.",
            },
            {
                kind: "p",
                text: "And write the system down — even a single page. The anatomy only works when everyone applying it, human or software, is reading from the same sheet.",
            },
        ],
    },
    {
        slug: "how-ai-is-changing-the-design-studio",
        title: "How AI Is Changing the Modern Design Studio",
        excerpt:
            "A composite look at how studio work has actually changed — exploration is wider, production is quieter, and the parts that were always the point are still human. With honest limits.",
        category: "case-studies",
        img: "/assets/imgs/pages/home-7/insight-3-fabric.webp",
        hero: "/assets/imgs/pages/bg-img-5.webp",
        author: "Phoxta",
        date: "July 12, 2026",
        iso: "2026-07-12",
        readMinutes: 8,
        body: [
            {
                kind: "lead",
                text: "The public conversation about AI and design swings between two fantasies: the studio that no longer needs designers, and the studio where nothing has really changed. Neither survives contact with an actual working week. What has changed is specific and worth being precise about — because if you run a small business buying design, or a studio selling it, the new shape of the work changes what you should pay for.",
            },
            {
                kind: "p",
                text: "What follows is a composite of how studios — ours included — actually work now, rather than a prediction. The pattern is consistent: two phases of the work got dramatically faster, and the two phases that were always the point did not.",
            },
            { kind: "h", text: "Exploration: from three options to thirty" },
            {
                kind: "p",
                text: "The traditional identity process showed a client three directions, because three was what a human team could take to a presentable standard in the time available. The constraint was never imagination; it was rendering hours. That constraint is gone. A studio can now put thirty credible directions on the wall in the time three used to take — different palettes, type pairings, layout languages, all real enough to judge.",
            },
            {
                kind: "p",
                text: "The subtle consequence: the scarce skill moved from making options to judging them. Thirty directions on a wall is worthless without someone who can say which two are right for this business and why — and \"why\" is a question about the market, the customer and the positioning, not about the pixels.",
            },
            {
                kind: "duo",
                left: {
                    h: "Wider search, faster dead ends",
                    p: "The cheap thing AI buys is the ability to be wrong quickly. Directions that would have consumed a week each now cost an afternoon, which means the bad ones die before anyone is invested in defending them.",
                },
                right: {
                    h: "Taste became the bottleneck",
                    p: "When generation is abundant, selection is the craft. The designer's eye — for what is ownable, what will age, what the client's customers will actually feel — is now the most expensive thing in the room, and rightly so.",
                },
            },
            { kind: "h", text: "Production: the quiet revolution" },
            {
                kind: "p",
                text: "Less discussed and probably more consequential: the long tail of production work — resizing, versioning, retouching, building the forty-eighth variant of the same banner — is evaporating as a human task. This was the work that filled junior designers' weeks and studio invoices, and it was also the work nobody loved. Studios that priced on production hours are repricing; studios that priced on judgment are fine.",
            },
            {
                kind: "figure",
                img: "/assets/imgs/pages/home-7/sec2-img-2.webp",
                alt: "A designer reviewing work in a studio",
                caption: "Generation got cheap. Judgment did not.",
            },
            { kind: "h", text: "What stays human" },
            {
                kind: "list",
                items: [
                    "Strategy — deciding what the brand should mean and to whom. AI can render a position; it cannot choose one, because choosing requires accountability for the outcome.",
                    "Distinctiveness — models are trained on what exists, so their unguided output regresses to the category's average look. Ownable weirdness still has to be insisted upon by a person.",
                    "The client relationship — the interviews, the pushback, the moment someone says \"that is not us\" and a person hears what is underneath it.",
                    "Responsibility — someone has to check the output is legally, culturally and factually safe to ship. That someone is never the model.",
                ],
            },
            {
                kind: "quote",
                text: "AI moved the studio's centre of gravity from the hand to the eye. The hours changed owners; the judgment did not.",
            },
            { kind: "h", text: "The honest limits" },
            {
                kind: "p",
                text: "Being straight about where the tools still fall down: unguided output is generic by construction — ask for \"a modern logo for a coffee brand\" and you will receive the statistical average of every coffee brand ever made. Fine control is still fiddly; getting a mark exactly right remains faster by hand past a certain point. And a system prompt is not a strategy — feeding a model a bad brief produces a beautiful rendering of a bad idea, faster than ever.",
            },
            {
                kind: "p",
                text: "This is the shape we built Phoxta's own brand tooling around. The AI brand generator drafts a coherent starting point — logo direction, palette, fonts — from a plain-English description of the business, and the Studio page builder lets an owner reshape their pages with the same mix of direct control and AI assistance. Both are explicitly the exploration-and-production half of the work. Which two directions are right, and what the brand should stand for — that part still belongs to a person, because it always did.",
            },
            {
                kind: "p",
                text: "The practical takeaway for a business owner: expect more options, faster turnarounds and cheaper production — and keep paying, without resentment, for the judgment. That was always the product. It is just easier to see now.",
            },
        ],
    },
    {
        slug: "rebranding-when-and-how-to-do-it-right",
        title: "Rebranding: When and How to Do It Right",
        excerpt:
            "Most rebrands are boredom wearing a strategy costume. The triggers that actually justify one, the risks nobody budgets for, and a staged rollout that protects what you have already earned.",
        category: "playbooks",
        img: "/assets/imgs/pages/home-7/insight-4-conference.webp",
        hero: "/assets/imgs/pages/bg-img-6.webp",
        author: "Phoxta",
        date: "July 17, 2026",
        iso: "2026-07-17",
        readMinutes: 9,
        body: [
            {
                kind: "lead",
                text: "A rebrand is the only marketing project that starts by spending an asset you already own. Every hour of recognition your identity has accumulated — every customer who can spot your packaging across a shop — is capital, and a rebrand puts some of it in the shredder on day one. Sometimes that trade is right. But the bar should be high, and for most small businesses considering it, the honest answer is: not yet, and not for that reason.",
            },
            {
                kind: "p",
                text: "The most common driver of a rebrand is not strategy. It is that the owner is bored — they have seen their own identity ten thousand times and mistaken their fatigue for the market's. Customers, who see the brand a fraction as often, were often just getting to know it.",
            },
            { kind: "h", text: "Triggers that justify a rebrand" },
            {
                kind: "list",
                items: [
                    "The business actually changed — new offer, new market, new price point — and the identity now promises something you no longer sell.",
                    "The identity is a working liability: illegible at digital sizes, incoherent across surfaces, or genuinely indistinguishable from a competitor's.",
                    "A legal or naming conflict forces the issue — the one trigger with no discretion in it.",
                    "You are shedding a reputation deliberately: the brand is well known for something you need it to stop being known for.",
                    "A merger, acquisition or partnership makes the old identity untrue.",
                ],
            },
            { kind: "h", text: "Triggers that don't" },
            {
                kind: "p",
                text: "Boredom, a new competitor with a nicer website, a design trend, or a new owner wanting to leave a mark. Each of these justifies a refresh at most — tightening the type, cleaning up the palette, redrawing the logo without changing what it is. A refresh keeps the recognition capital and upgrades the container. Most businesses that think they need a rebrand need exactly this.",
            },
            {
                kind: "duo",
                left: {
                    h: "Refresh: evolve the container",
                    p: "Same name, same recognisable codes, better execution. Customers should barely notice — and that is the point. The equity carries over intact because nothing they use to recognise you was touched.",
                },
                right: {
                    h: "Rebrand: change the promise",
                    p: "New name or new codes, because the business is making a different promise. Expensive by design — you are deliberately trading recognition for repositioning, so the repositioning had better be real.",
                },
            },
            { kind: "h", text: "The risks nobody budgets for" },
            {
                kind: "p",
                text: "The visible costs of a rebrand — design fees, new packaging, new signage — are the small half. The expensive half is operational: the months where old and new identities coexist and confuse, the regulars who assume you were sold, the search traffic that quietly detaches from a renamed business, the printed materials and directory listings that surface the old brand for years. Rebrand budgets fail because they price the artwork and not the transition.",
            },
            {
                kind: "quote",
                text: "A rebrand is not a new coat of paint. It is asking every customer who already knows you to learn you again — and hoping they think it is worth the effort.",
            },
            { kind: "h", text: "A staged rollout" },
            {
                kind: "p",
                text: "If the trigger is real, the discipline that protects you is sequencing. A big-bang rebrand — everything changes overnight — maximises confusion and gives you no exit if something is wrong. Staging does the opposite:",
            },
            {
                kind: "list",
                items: [
                    "Decide and document first: the new identity system — logo, palette, type, voice — finished and written down before anything ships. A rebrand rolled out while still being designed becomes two rebrands.",
                    "Tell your own people before the market: staff, suppliers, your AI agent's instructions. The worst reveal is a customer knowing before the person answering your phone does.",
                    "Bridge in public: run \"new name, same team\" messaging on every surface for a full season. Announce once, then remind relentlessly — customers miss announcements.",
                    "Flip the digital core in one move: storefront, social handles, email templates should change together, because a mixed-identity checkout reads as a phishing attempt.",
                    "Let the long tail lag deliberately: packaging stock, signage and print can follow as they are replaced. Planned inconsistency is fine; unplanned inconsistency is what erodes trust.",
                    "Measure for a quarter: direct traffic, repeat rate, and customers asking \"did you close?\" — the early-warning metric that the bridge messaging is not landing.",
                ],
            },
            {
                kind: "figure",
                img: "/assets/imgs/pages/home-7/sec2-img-1.webp",
                alt: "Brand applications reviewed side by side during a transition",
                caption: "Stage the rollout: core surfaces flip together, the long tail follows deliberately.",
            },
            {
                kind: "p",
                text: "The digital flip is the stage modern tooling has genuinely improved. On a Phoxta business the brand — logo, palette, fonts — is data applied across the storefront rather than something rebuilt page by page, so the core changes in one motion instead of leaking out over weeks, and the AI brand generator gives the new direction a coherent draft to react to before you commit. The judgment about whether to rebrand at all is untouched by any of this. That one is still yours.",
            },
            {
                kind: "p",
                text: "The test worth running before any of it: write one sentence explaining the rebrand to your best customer. If the sentence is about them — what changed in what you do for them — proceed with the stages above. If the sentence is about you, save the money and do the refresh.",
            },
        ],
    },
];
