// Long-form project case studies for femi.phoxta.com/work/:slug.
// One entry per project that has a dedicated study page.
//
// The page is a DECISION RECORD, not a feature tour. A decision is a moment
// named, the question a specific person is asking at that moment, the thing that
// was built to answer it, the option that lost, what the choice cost, and the standard
// it was held to. Written in project voice, not first person.
//
// HONESTY MECHANISM — read before authoring.
// Every number on the page passes through `Measure`, whose `provenance` is
// required, is rendered as a visible chip, and is a discriminated union: a
// "reported" measure will not compile without a `source`. A "target" is the standard
// the design was held to and is phrased in the design's voice ("designed to
// resume in under a second") — never in the past tense, never with a percentage
// the project has no way to observe. A counted measure states the unit it
// counted and carries a `check`: the file, route or page a stranger can open in
// under a minute. A fact with no honest verification path gets cut.
//
// Deliberately NOT in this type, and not to be reintroduced:
//   • `outcome?: string[]` — an untyped free-text slot in which a result could be
//     asserted with no provenance. Deleted. Targets and counts live in `bar`.
//   • a `met: "met" | "partly" | "not yet"` flag on a measure — a result claim
//     wearing a target's costume, inside a model built to keep the two apart.
//   • a REQUIRED subject/persona field — a required persona on studies with no
//     research manufactures people. `subjects` is optional, and `Subject.name`
//     may only be filled where a repo document names a real person. No study
//     among these seven qualifies.
//   • a "Written before the work" caption on `definitionOfDone` — it asserts a
//     history the repo cannot corroborate.

export type MetaItem = { label: string; value: string };
export type Swatch = { name: string; hex: string; ink?: boolean };

/** IBM Carbon's "Building experiences" journey phases, demoted to an optional tag. */
export type JourneyPhase =
    | "Discover"
    | "Learn"
    | "Try"
    | "Buy"
    | "Onboard"
    | "Use"
    | "Get help"
    | "Expand"
    | "End use";

/**
 * The one way a number reaches this page.
 * `provenance` is required and rendered as a chip whose BORDER STYLE carries the
 * meaning (dashed = target, solid = counted), so it survives greyscale and a squint.
 */
type MeasureBase = { metric: string; definition?: string; value: string };
export type Measure =
    /** A bar the design was held to. It has no verification path, by type. */
    | (MeasureBase & { provenance: "target"; setAt?: string; check?: undefined; source?: undefined })
    /** Something counted in the artefact. `check` is the file, route or page to open. */
    | (MeasureBase & { provenance: "in-build" | "in-repo" | "in-doc"; check?: string; source?: undefined })
    /** The only class capable of fabrication is the only one that cannot compile without saying where it came from. */
    | (MeasureBase & { provenance: "reported"; source: string; check?: string });

/** Who was on the other side of the screen. `name` only where a repo document names a real person. */
export type Subject = { label: string; name?: string; context: string; judges: string };

/** What was deliberately left out, and why. Absence is verifiable by opening the artefact. */
export type Tradeoff = { title: string; body: string };

export type Highlight = { title: string; body: string; image?: string; imageAlt?: string; wide?: boolean };

type DecisionBase = Highlight & {
    /** The moment this decision serves — a verb phrase, or the "First X" event construction. */
    moment?: string;
    /** Carbon's taxonomy as a tag. Sparse by design; a brand study carries none. */
    phase?: JourneyPhase;
    /** Who is asking, at this moment. */
    subject?: string;
    /** The screens, states, components and emails that shipped. */
    touchpoints?: string[];
    /** At most two, authored as a matched pair (speed + completion), never speed alone. */
    bar?: Measure[];
};

/**
 * A decision that carries a `question` MUST carry an `instead` — a decision
 * cannot be authored without a fork in it. A decision with no genuine rejected
 * alternative simply is not promoted to a question-bearing decision and stays a
 * plain highlight; the asymmetry is itself honest.
 */
export type Decision =
    | (DecisionBase & { question: string; instead: string; cost?: string })
    | (DecisionBase & { question?: undefined; instead?: string; cost?: string });

export type CaseStudy = {
    slug: string;
    name: string;
    kicker: string;
    tagline: string;
    summary: string;
    hero: string;
    heroAlt: string;
    accent: string;
    meta: MetaItem[];
    tags: string[];
    prototypeUrl?: string;
    /** Label for the prototype button — defaults to "View live prototype". */
    prototypeLabel?: string;
    /** Heading for the process section — defaults to a generic line. */
    processTitle?: string;
    challenge: string;
    /** The ninety-second layer, authored rather than hoped for. Required: no thesis, no study. */
    atAGlance: { problem: string; move: string };
    /** One sentence on the specific prior state the design replaced. */
    before?: string;
    /** The single hardest thing the design had to survive. A decision without one reads as a preference. */
    constraint?: string;
    /** What "working" meant. Rendered above the standards, never captioned as pre-dating the work. */
    definitionOfDone?: string;
    /**
     * Required. Rendered in small muted type above the first quoted question,
     * because quoted first-person questions read as research output whether or
     * not that is intended.
     */
    evidenceNote: string;
    /** One line on why this study covers the journey phases it covers, and not the others. */
    phaseNote?: string;
    subjects?: Subject[];
    goals: { title: string; body: string }[];
    /** Roughly six rows. Scarcity is the credibility signal; thirty pills are wallpaper. */
    bar?: Measure[];
    process: { phase: string; body: string; changed?: string }[];
    decisions: Decision[];
    notDesigned?: Tradeoff[];
    /** What forced the hand. Rendered under the "deliberately not designed" band. */
    constraints?: string[];
    /** "What I'd test next" — the honesty valve where measured outcomes do not exist. */
    unknowns?: string[];
    palette: Swatch[];
    typeNote: string;
    components: string[];
    designSystemUrl?: string;
    /** Heading + button text for that block — defaults to "Design system" (a brand study calls it its guideline). */
    designSystemLabel?: string;
    designSystemImage?: string;
    designSystemBlurb?: string;
};

export const CASE_STUDIES: CaseStudy[] = [
    {
        slug: "phoxta",
        name: "Phoxta",
        kicker: "AI business platform · Product Design",
        tagline: "An AI-native, multi-tenant platform that turns starting a business into choosing one.",
        summary:
            "Phoxta combines a marketplace of business blueprints with an operating console for customer communication, tasks, commerce and AI-assisted work. I own the product direction, information architecture, interaction design and shared design system, and contribute to the production front end. The central challenge is making a broad set of capabilities understandable while giving business owners clear control over AI actions.",
        hero: "/assets/imgs/portfolio/phoxta-project.webp",
        heroAlt: "Phoxta — marketing site homepage",
        accent: "#F0460E",
        meta: [
            { label: "Role", value: "Founder & Lead Product Designer" },
            { label: "Timeline", value: "2025 — now" },
            { label: "Platform", value: "Multi-tenant web app" },
            { label: "Tools", value: "Figma · React · TypeScript · Supabase" },
        ],
        tags: ["SaaS", "Product Design", "Design System", "AI", "Front-end"],
        prototypeUrl: "https://www.phoxta.com",
        prototypeLabel: "Visit the live product",
        processTitle: "From an idea to a business that already works.",
        challenge:
            "Incumbent platforms — Shopify, WordPress, Salesforce — are tools, not businesses: the buyer still assembles everything and designs the AI layer themselves. Phoxta's value proposition is the inverse, a business that already works, and that sets a demanding design bar. A first-time owner has to understand what they have bought from a single screen, operate CRM, commerce, content, inbox and automations without training, and delegate to an AI operator with confidence — while operators, buyers and investors share one product under strict tenant isolation.",
        atAGlance: {
            problem:
                "Incumbent platforms sell tools, so a first-time owner still has to assemble a business out of a site builder, a commerce platform, a CRM and an AI layer they design themselves.",
            move:
                "Make a business type data rather than a product — one console, one design system and one governed AI, configured per vertical instead of redesigned per vertical.",
        },
        before:
            "What the design replaced was not a competitor's screen but an assembly job: four subscriptions, an integration project, and the running business still to be built afterwards.",
        constraint:
            "One deployment serves every tenant, and a business type arrives as a free-text string in a database column. No screen may assume a catalogue, a booking model, or even that a commerce module exists.",
        evidenceNote:
            "No user research was run on this engagement, and the product is pre-launch, so no telemetry sits behind any screen. The questions below are the assumptions the design was built on; the standards beside them are the ones it was held to.",
        phaseNote:
            "This study covers Discover, Onboard, Use and Expand. There is no Try phase to claim — a blueprint is bought outright, and what a buyer gets beforehand is a live demo of a business somebody else already runs. End use is not designed at all: a plan can be cancelled from Billing, but nothing exports a tenant's data or closes a business down. That is this journey's clearest gap, and it is named rather than quietly omitted.",
        subjects: [
            {
                label: "A first-time owner on day one",
                context: "Has just bought a blueprint, has never run a CRM, a catalogue or an approval queue, and opens the console before anyone has explained it.",
                judges: "Can I tell what I own, whether it is live and what needs me — without being taught?",
            },
            {
                label: "An operator running more than one business",
                context: "Switches between a restaurant and a car-hire fleet in the same session, from the console's own business switcher.",
                judges: "Does the second business behave the way the first one did?",
            },
            {
                label: "Phoxta itself, as a tenant of its own product",
                context: "Runs on the same console as every buyer — inbox, CRM, invoicing, its own agent — plus one cross-tenant module no tenant console could answer.",
                judges: "Does this hold up when the people who built it have to operate on it?",
            },
        ],
        definitionOfDone:
            "A console module counted as finished on three checkable properties rather than on a screenshot: the vertical configuration decides whether it appears at all; its empty, loading and error states are drawn; and the AI operator can reach its data through a named tool. Every one of the twenty-eight console screens can be held against that list.",
        goals: [
            { title: "Ownership in one screen", body: "The dashboard answers “what do I own, is it live, what needs attention?” above the fold, before any navigation." },
            { title: "One console, every vertical", body: "CRM, commerce, content, engagement and billing as a single config-driven console — the same UI serves a restaurant and a fashion retailer." },
            { title: "Delegable AI", body: "An operator that reads, drafts and acts inside explicit permissions, an approval queue and an audit trail." },
            { title: "A system that ships", body: "A Figma-to-React design system that keeps the site, console and transactional email consistent while a small team moves fast." },
        ],
        bar: [
            {
                metric: "Time to know what you own",
                definition: "What an owner has to read before navigating anywhere: what they own, whether it is live, and what needs attention.",
                value: "one screen, no navigation",
                provenance: "target",
            },
            {
                metric: "Business types served without a redesign",
                definition: "Distinct vertical configurations the same console renders from, each declaring its commerce label, item noun, booking model and module order.",
                value: "10",
                provenance: "in-repo",
                check: "src/lib/ops/consoleConfig.ts",
            },
            {
                metric: "Console screens behind those configurations",
                definition: "Non-redirect routes under /dashboard/businesses/:id/ops, twelve of them held inside the Engage layout.",
                value: "28",
                provenance: "in-build",
                check: "the ops route table in src/App.tsx",
            },
            {
                metric: "Write actions the agent cannot take unasked",
                definition: "Governed write tools, each behind a per-tool policy row; a tool with no row is treated as “ask me”, and “auto” is downgraded to “ask me” for any non-admin caller.",
                value: "37 of 37",
                provenance: "in-repo",
                check: "WRITE_TOOLS and executeAction in supabase/functions/_shared/actions.ts",
            },
            {
                metric: "Retired console URLs that still resolve",
                definition: "Old console paths kept as redirects after the IA reshuffle, each aimed at its final destination so there is only one hop.",
                value: "14 — thirteen carrying their query string",
                provenance: "in-repo",
                check: "the KeepSearch routes in src/App.tsx",
            },
            {
                metric: "Cost meets a sentence, never an invoice",
                definition: "Every AI call is metered and every business has a monthly token ceiling by plan, so the ceiling is reached inside the product rather than at the end of the month.",
                value: "one capped message, no overage",
                provenance: "target",
            },
        ],
        process: [
            {
                phase: "Discovery & positioning",
                body: "The brief originated in three failed launches by capable founders — none needed a website builder; all needed a running business they could rebrand. Discovery mapped the buyer's day-one jobs to be done, then benchmarked site builders, commerce platforms and the emerging class of AI-agent products to locate where “AI-native” could be structural rather than a feature.",
                changed: "The benchmark moved the pitch off the feature grid. Every builder competes on a list of capabilities, and a business that already works loses that comparison and wins the demo — so the homepage became a shelf of running businesses linking straight to their live sites.",
            },
            {
                phase: "Information architecture",
                body: "The product was structured as three surfaces on one core — public storefronts, the marketplace and the management console — with the console modelled as modules keyed by business type. A vertical is a configuration (which modules are enabled and how the site is composed), not a new design.",
                changed: "Modelling the vertical as data killed the per-vertical console: ten configurations replaced ten designs. The reshuffle that followed was made non-breaking on purpose — fourteen retired console URLs still resolve, thirteen of them carrying their query string to the new destination, because a hop that drops it is indistinguishable from the round trip never happening.",
            },
            {
                phase: "Design system",
                body: "Tokens, a pill-and-card component language, one-line page headers with tabs, a distinct console theme and shared empty, loading and approval states were defined in Figma and implemented as React components, then reused across the console's twenty-eight screens so new features land looking native.",
                changed: "The console was given its own scoped theme rather than the marketing site's — Figtree on a cooler white with a blue primary — and the split surfaced a responsive failure worth recording: the tab strip silently clipped its last tabs on a narrow laptop, and now scrolls on its own.",
            },
            {
                phase: "Build, measure, iterate",
                body: "Design and engineering ran in the same codebase — React, TypeScript, Supabase — so prototypes graduated to production without a handoff gap. Every AI capability is metered and capped per tenant, which makes cost part of the design brief.",
                changed: "Metering turned cost into a constraint the interface has to carry: every call records model, feature, tier, input and output tokens, cached-prompt reads and writes, latency and computed cost — the cache tokens separately, because the uncached remainder alone under-reports both spend and usage.",
            },
        ],
        decisions: [
            {
                title: "A front door that sells the outcome, not the software",
                moment: "First look at what is actually for sale",
                phase: "Discover",
                subject: "a founder who has failed to launch before, on the homepage for the first time",
                question: "What would I actually be getting?",
                body: "The cover above is the entire pitch in one viewport: “Own a business that already works.” over a shelf of live blueprints and the categories available to buy into. Each card on that shelf opens the running demo rather than a description, so the promise is checkable before an account exists; the product proves itself once the visitor is inside.",
                instead: "A feature grid was the obvious layout — every builder has one, and it is what a visitor arrives expecting. It also invites the comparison Phoxta loses: feature for feature, a mature builder has more. The shelf of running businesses was taken instead, because the only unusual claim here is that the thing already works.",
                cost: "The homepage states no capabilities, so a visitor who wants a specification has to reach the marketplace detail page or the pricing table to find one. And the shelf is only as persuasive as the demos behind it, which puts the argument's weight on seven separate deployments staying up.",
                touchpoints: ["Hero headline and one promise line", "Blueprint shelf linking to each live demo", "Category chips", "Marketplace detail page with “View live demo”"],
                bar: [
                    {
                        metric: "Blueprints a visitor can open and use before signing up",
                        definition: "Storefront deployments reachable from the homepage shelf and the marketplace card, each running against the shared backend.",
                        value: "7",
                        provenance: "in-build",
                        check: "the seven demo hosts on *.phoxta.com, one per folder in businesses/",
                    },
                    {
                        metric: "Steps from the homepage to a running business",
                        definition: "Clicks between the hero and a live storefront a stranger can browse.",
                        value: "one",
                        provenance: "target",
                    },
                ],
            },
            {
                title: "One console, ten verticals — a business type is data",
                moment: "First tab opened on a business the console has never seen",
                phase: "Use",
                subject: "a buyer opening the console for a restaurant, on a product designed around a shop",
                question: "Why am I being shown things I do not have?",
                body: "Ten vertical configurations drive one console. Each declares its commerce label, its item noun, its booking model and the order of its modules, drawing on seventeen module definitions in whatever combination it asks for — so “e-Commerce”, “boutique”, “car hire” and “academy” all resolve without anything new being designed. Resolution runs four passes in a fixed order, with the reason written into the code: “Car Rental” tokenises to car and rental, and car now means sales, so a phrase rule has to beat the token pass or a rental business is handed a dealership.",
                instead: "A superset console — every module for everybody, the irrelevant ones simply empty — was cheaper and was rejected: an empty Reservations tab on a takeaway teaches its owner that the product does not know what business they run. Designing a console per vertical was rejected from the other side, because ten designs is ten things to keep in step and a new vertical then becomes a project rather than a row.",
                cost: "The mapping is a maintained list — fifty-three vertical synonyms today — not something that generalises, so a business whose words are not in it lands on a default console rather than failing loudly. The density has its own price: eleven tabs clipped their last entries on a narrow laptop until the strip was given its own scroll.",
                touchpoints: ["Ten vertical configurations", "Seventeen module definitions", "Four-pass vertical resolver", "Scrolling console tab strip", "In-console business switcher"],
                bar: [
                    {
                        metric: "Vertical synonyms that resolve without a new design",
                        definition: "Words a business may describe itself with that land on an existing console configuration.",
                        value: "53",
                        provenance: "in-repo",
                        check: "BY_VERTICAL in src/lib/ops/consoleConfig.ts",
                    },
                    {
                        metric: "New screens required to serve a business type",
                        definition: "What it takes to support a vertical the product has not seen: a configuration object, or a design.",
                        value: "none — a config object",
                        provenance: "target",
                    },
                ],
            },
            {
                title: "Delegation is a setting per tool, and the safe default is “ask me”",
                moment: "First time the owner decides what an agent may touch",
                phase: "Onboard",
                subject: "an owner on day one, being asked to trust software with a price list",
                question: "What will it do without asking me?",
                body: "The operator has thirty-seven governed write tools and twenty-three read and memory tools, and every write passes a per-tool policy: off, ask me, or auto. A tool with no policy row is treated as “ask me”, and “auto” is downgraded to “ask me” for anyone who is not an admin, so the permissive setting is never one an owner arrives at by accident. Unprompted work carries daily ceilings on top — actions, calls and emails per business per day.",
                instead: "One autopilot switch is the design owners ask for and the one most products ship. It leaves only two positions — does nothing, or does everything — which is why it stays off. Policy moved down to the tool instead, where an owner can let the agent tag a contact and never let it send a campaign.",
                cost: "Thirty-seven tools is thirty-seven decisions an owner could make, so the list needs grouping, plain labels and a legend — and the legend has to be true of every row. It was not: “ask me” means held for approval on a write tool but stay-silent-and-notify on answering messages, so an owner who chose it went looking for drafts in an empty queue and concluded the feature was broken. The exception is now spelled out beneath the legend rather than left to be discovered.",
                touchpoints: ["Per-tool policy list, grouped by area", "Off · Ask me · Auto legend with its stated exception", "Approval queue", "Autopilot ceilings panel", "Telegram, for owners who never open the dashboard"],
                bar: [
                    {
                        metric: "Write tools under explicit policy",
                        definition: "Governed write actions with a per-tool mode; the default, when no row exists, is “ask me”.",
                        value: "37 of 37",
                        provenance: "in-repo",
                        check: "WRITE_TOOLS and policyMode in supabase/functions/_shared/actions.ts",
                    },
                    {
                        metric: "Ceiling on unprompted work",
                        definition: "Default daily limits per business on autonomous actions, phone calls and emails.",
                        value: "100 · 10 · 50 a day",
                        provenance: "in-repo",
                        check: "DEFAULT_CEILINGS in src/lib/db/ops/autopilot.ts",
                    },
                ],
            },
            {
                title: "An approval you can read, on the row you read it about",
                moment: "First queued action approved hours after it was asked for",
                phase: "Use",
                subject: "an owner clearing the queue on a phone, long after the agent asked",
                question: "Is this still the thing I looked at?",
                body: "Each queued action renders as a sentence with the current value struck through and the new one beside it — change this product, this price, from that to this — and message-shaped actions can be edited in the queue before Approve, so exactly what the owner read is what goes out. The row itself is resolved once, at the moment the action is queued, and its id travels with the action.",
                instead: "Approving used to re-resolve the reference by name when the button was pressed. That reads fine until a product is renamed or a second “John Smith” is created in the gap, and then the row the owner looked at and the row that changed are two different records. The raw-arguments view survives as the fallback for a tool with no sentence written for it — which is what the whole queue would otherwise look like.",
                cost: "An approval can now fail outright — the product this action was queued for no longer exists — where the looser design would have quietly acted on something. That is the right failure, and it is still a failure the owner has to read. And every new write tool needs its sentence written by hand, or it drops to the fallback: the queue's readability is maintained, not derived.",
                touchpoints: ["Plain-English action sentence with a struck-through before value", "Approve-with-edit for message-shaped tools", "The resolved row id stamped onto the queued action", "Audit row for every attempt, denials included"],
                bar: [
                    {
                        metric: "Ambiguous references acted on",
                        definition: "What the resolver does when two records match a name: it names both and refuses, unless exactly one matches the reference exactly.",
                        value: "none — it refuses",
                        provenance: "in-repo",
                        check: "resolveRow in supabase/functions/_shared/actions.ts",
                    },
                    {
                        metric: "Write attempts written to the audit log",
                        definition: "Governed write attempts recorded, including the ones policy blocked.",
                        value: "every one, denials included",
                        provenance: "in-repo",
                        check: "executeAction in supabase/functions/_shared/actions.ts",
                    },
                ],
            },
            {
                title: "Cost is part of the interface, not the invoice",
                moment: "First month the agent has been working the whole month",
                phase: "Expand",
                subject: "an owner whose AI has been answering since the day they bought the business",
                question: "Is this going to cost me?",
                body: "Every AI call is metered into one table with its model, feature, tier, input and output tokens, cached-prompt reads and writes, latency and computed cost. Spend is capped per business per calendar month by plan, and the ceiling is one shared sentence saying the month's usage is reached and an upgrade continues it — the same words wherever an owner meets it.",
                instead: "Unlimited AI with an invoice at the end of the month is the industry default, and it makes the bill the first honest signal an owner ever gets. Quietly routing to a cheaper model once spend rises was the other option and is worse: the product degrades and never says why.",
                cost: "A capped product stops mid-task, so the ceiling has to read as a plan boundary rather than a fault, and a tenant on the lower plan meets it sooner than one who paid more. Cost also had to be recorded more carefully than expected — cached prompt tokens are logged separately, because the uncached remainder alone under-reports both spend and usage, and an under-reported cap is a cap nobody trusts.",
                touchpoints: ["One usage row per AI call", "Per-plan monthly token ceiling", "One shared cap message", "Plan tiers in Billing"],
                bar: [
                    {
                        metric: "Monthly AI ceiling per business",
                        definition: "Tokens a business may spend in a calendar month before the product says so, by plan.",
                        value: "200k · 200k · 1M · 5M · uncapped",
                        provenance: "in-repo",
                        check: "MONTHLY_TOKEN_CAP in supabase/functions/_shared/meter.ts",
                    },
                    {
                        metric: "AI work that reaches a model unmetered",
                        definition: "Calls not written to the usage table — including platform work with no tenant behind it, which is booked to Phoxta's own organisation.",
                        value: "none by design",
                        provenance: "in-repo",
                        check: "meter.ts, including platformOrgId",
                    },
                ],
            },
            {
                title: "Layouts that come out of Figma, not out of a designer's hands",
                moment: "First month of social posts made without a designer",
                phase: "Use",
                subject: "an owner who has never opened a design tool",
                question: "Can I make something that looks like us?",
                body: "Graphics turns a brand into a month of posts: eighteen layouts, an AI planner that drafts the strategy and the captions in the business's own voice, a scheduling calendar and an SVG canvas for edits. The layouts are extracted from the Figma file by a script rather than transcribed, so geometry, fonts, weights, line heights, letter-spacing and colour are Figma's own numbers — and any subtree with no text in it is exported as one vector, which is what keeps the patterns, icons, badges and card shapes exact instead of redrawn.",
                instead: "It began as hand-written coordinates: about four hundred lines, accurate for the six frames they covered, and a day's careful work per family after that with a fresh chance of a two-pixel error every time the file changed. The file has changed twice already. The layout catalogue handed to the AI writer is computed from the pack for the same reason — the hand-maintained list had six entries in it while the pack had eighteen, so the writer could only ever choose from a third of the layouts and nothing anywhere said so.",
                cost: "The pack can hold only what is in the Figma file: a new layout is a new frame and a re-run of the script, not a code edit. Each text slot's character budget is derived from its own box geometry and is deliberately approximate — its job is to stop a paragraph being written into a chip, not to hyphenate — so it will occasionally be wrong at the margins in both directions.",
                touchpoints: ["Eighteen extracted layouts", "Computed layout catalogue with per-slot character budgets", "AI content planner", "Scheduling calendar", "SVG canvas"],
                bar: [
                    {
                        metric: "Layouts in the pack",
                        definition: "Templates extracted from the Figma file — twelve social layouts and six event layouts.",
                        value: "18",
                        provenance: "in-build",
                        check: "TEMPLATES via src/lib/designs/fromRaw.ts",
                    },
                    {
                        metric: "Layouts the AI writer can choose from",
                        definition: "Entries in the catalogue sent with the brief, computed from the pack rather than listed by hand.",
                        value: "18 of 18",
                        provenance: "in-repo",
                        check: "catalogue() in src/lib/designs/templates.ts",
                    },
                ],
            },
        ],
        notDesigned: [
            {
                title: "A free trial",
                body: "There is no trial path in the buying flow and none on the pricing page. What a buyer gets before paying is a live demo link on the blueprint card, opening a running business somebody else owns. A provisioned tenant that expires would have made the first thing the product teaches an owner be that it can be taken away.",
            },
            {
                title: "Reservations for the restaurant, a catalogue for Phoxta",
                body: "Modules are withheld per vertical, with the reason written beside each in the code. The restaurant blueprint is a digital-first kitchen with no dining room, so Reservations is absent and a special order arrives as an Inbox ticket to be answered and quoted. Phoxta's own console has no Commerce module, because what Phoxta sells lives in blueprints rather than products and a Catalog tab would render an empty product list. The learning console has no catalogue at all — courses, lessons and learners live inside the learning app.",
            },
            {
                title: "An exit",
                body: "Nothing exports a tenant's data or closes a business down. A plan can be cancelled from Billing, and the business keeps running to the end of the period before billing stops, but there is no take-everything-with-me path and no delete-this-business path. For a product whose whole pitch is ownership, that is the most conspicuous thing missing, and it is stated here rather than left to be found.",
            },
            {
                title: "The storefronts, from inside the console",
                body: "Each business's customer-facing site is its own deployment: it resolves its tenant from the request hostname, reads its own rows with the public key under row-level security, and the platform links out to it rather than building or embedding it. The console therefore designs one side of a written-down boundary — which is the reason a storefront can be redesigned without the console moving, and the reason the console can never promise what the storefront looks like.",
            },
        ],
        constraints: [
            "Phoxta is pre-launch and pre-revenue, so there is no telemetry to design against — every bar had to be something a reader can check inside the artefact.",
            "Storefronts connect with the public key under row-level security keyed on the organisation, and the service-role key never reaches a front end, so anything a storefront can show has to be safe to show.",
            "Every AI capability is metered and capped per tenant, which puts cost in the design brief rather than in the invoice.",
            "The platform never builds or embeds the business apps; it links out to each deployment, so the console cannot assume it controls the customer-facing surface.",
        ],
        unknowns: [
            "The approval queue has never been watched with an owner who did not build it. The first test is somebody approving a price change on a product they cannot see from the queue, and whether the struck-through previous value is enough to decide on.",
            "Nothing observes whether an owner ever moves a tool off “ask me”. If the safe default is never left, the delegation design has failed quietly and the policy list is a form nobody finishes.",
            "The vertical resolver is fifty-three maintained words. The test is a hundred real descriptions taken from sign-up: how many land on the default console, and what those businesses actually called themselves.",
            "Nobody has watched a first-time owner meet the monthly AI ceiling. The sentence is written; whether it reads as a plan boundary or as a fault is untested.",
        ],
        palette: [
            { name: "Brand", hex: "#F0460E" },
            { name: "Ink", hex: "#0F0F0F" },
            { name: "Paper", hex: "#FEFEFE", ink: true },
            { name: "Neutral 50", hex: "#F2F2F2", ink: true },
            { name: "Console blue", hex: "#195CE5" },
            { name: "Console orange", hex: "#FE5F2B" },
            { name: "Muted", hex: "#585959" },
            { name: "Line", hex: "#DFDFDF", ink: true },
        ],
        typeNote:
            "DM Sans carries the marketing site — large, tight display sizes on a neutral scale from near-black to off-white — with a single brand orange reserved for actions and proof points. The console switches to Figtree on a cooler white ground with a blue primary, so operating a business reads as distinct from buying one while staying in the same family: pills, full-round radii, one-line headers with tabs, hairline borders.",
        components: ["Pill nav & tabs", "One-line page header", "Business card", "Kanban board", "Operator chat & approval queue", "Stat & setup cards", "Blueprint card", "Config-driven console modules", "Empty / loading / approval states"],
    },
    {
        slug: "coir-six",
        name: "Coir Six",
        kicker: "E-learning platform · Product Design",
        tagline: "A glance-first learning dashboard designed to bring self-paced students back every day.",
        summary:
            "Coir Six is an online-learning platform where the core retention risk is momentum rather than content. The engagement redesigned the learner home — the return-visit surface — into a single screen that answers “where was I, how am I doing, and what is next?” on load, and defined a responsive system that carries the three-pane desktop console down to a one-handed mobile layout. Deliverables were the end-to-end UX, a documented design system and a working HTML/CSS prototype used as the front-end reference.",
        hero: "/assets/imgs/portfolio/coir-six.webp",
        heroAlt: "Coir Six learning dashboard — desktop",
        accent: "#6C5DD3",
        meta: [
            { label: "Role", value: "Product Designer — UX & UI" },
            { label: "Timeline", value: "3 weeks" },
            { label: "Platform", value: "Responsive web app" },
            { label: "Tools", value: "Figma · React · Supabase" },
        ],
        tags: ["Product Design", "Design System", "Dashboard", "Data-viz", "Responsive"],
        prototypeUrl: "https://demo.coir-six.phoxta.com",
        prototypeLabel: "Open the live app",
        processTitle: "From momentum problem to daily habit.",
        challenge:
            "Self-paced learners churn the moment a platform makes them work to find their place. The brief: turn the home screen into a daily habit — motivating, instantly legible and honest about how far along the learner actually is — without adding onboarding or instruction.",
        before:
            "The incumbent dashboard buried progress inside a profile, gave five content types equal visual weight and offered no reason to return tomorrow — so a learner coming back after a gap had to re-navigate to find their own place.",
        constraint:
            "One deployment serves every buyer of this blueprint. The app resolves which school it is serving from the request hostname at boot and reads that school's own catalogue, so no layout may assume a catalogue size, a category count or a brand colour — and every number on the home has to be derived from the signed-in learner's own rows rather than authored.",
        atAGlance: {
            problem:
                "Self-paced learners churn the moment a platform makes them work to find their place, and the incumbent home made them work for all three answers.",
            move:
                "Split the home by intent rather than by feature, so the eye knows which region answers which question before it reads a word.",
        },
        definitionOfDone:
            "The home was done when a learner returning after several days away could see where they were, how the week was going and what was next without navigating — and when those same three answers survived the collapse to one hand.",
        subjects: [
            {
                label: "A returning self-paced learner",
                context:
                    "Opens the app after a few days away, on a phone, between other things — two courses part-finished and no memory of which lesson was last.",
                judges: "Did it put me back where I was, or make me go looking?",
            },
            {
                label: "A first-week learner",
                context:
                    "Has signed up, answered two questions and watched one lesson. Nothing on the screen has any history behind it yet.",
                judges: "Does this look like it is for me, or like a page waiting for someone else's data?",
            },
            {
                label: "The school that bought the blueprint",
                context:
                    "A small course business handed this app on its own subdomain, with a seeded catalogue of 3 tracks, 6 mentors, 8 courses, 13 modules and 28 lessons on day one.",
                judges: "Does it look like ours without anyone touching the code?",
            },
        ],
        evidenceNote:
            "No user research was run on this engagement. The questions below are the assumptions the design was built on; the standards beside them are the ones it was held to.",
        phaseNote:
            "This engagement owns the returning learner's habit loop — Onboard and Use — and stops there. Discover and Buy belong to the marketplace that sells the school, not to the school itself; Get help was scoped to designed empty states and a message to a mentor rather than a support system; and End use is not this project's to claim, because nothing in the product designs a learner's exit — a learner who stops simply stops.",
        goals: [
            { title: "Resume in a glance", body: "Answer “where was I?” in under a second; the learner continues rather than re-navigates." },
            { title: "Make progress felt", body: "Surface effort as visible momentum, not a number two screens deep." },
            { title: "One clear rhythm", body: "Give every content type — courses, lessons, mentors — a scannable, predictable place." },
            { title: "Hold on any screen", body: "One hierarchy that works at 1440px and at 390px, one-handed." },
        ],
        bar: [
            {
                metric: "Questions the home answers before a click",
                definition: "Where was I, how am I doing, what is next — each with its own region of the screen.",
                value: "3",
                provenance: "in-build",
                check: "demo.coir-six.phoxta.com — the dashboard at load",
            },
            {
                metric: "Time to resume",
                definition: "How long a returning learner should need to find their place, before any navigation.",
                value: "under a second's reading",
                provenance: "target",
            },
            {
                metric: "Steps from the home to the lesson playing",
                definition: "Resume shelf card, then Continue on the course page. The shelf reaches the course, not the lesson.",
                value: "2 taps",
                provenance: "in-build",
                check: "demo.coir-six.phoxta.com — Continue Watching → any course → Continue",
            },
            {
                metric: "Questions asked before the dashboard",
                definition: "Onboarding asks for interests and a weekly goal — the two inputs the home cannot compute — and nothing else.",
                value: "2",
                provenance: "in-repo",
                check: "businesses/coir-six/src/pages/AuthPages.tsx — OnboardingPage",
            },
            {
                metric: "Numbers stored rather than derived",
                definition: "Progress, streak, weekly minutes, watched counts and recommendations are all computed from the learner's own events by 27 exported helpers.",
                value: "none",
                provenance: "in-repo",
                check: "businesses/coir-six/src/lib/derive.ts",
            },
            {
                metric: "System behind the 21 routes",
                definition: "Documented sections in the published guideline, backed by exported CSS custom properties and a token JSON.",
                value: "24 sections, 71 tokens",
                provenance: "in-doc",
                check: "/prototypes/coir-six/design-system.html and coir-six-tokens.css",
            },
        ],
        process: [
            {
                phase: "Discovery & competitive audit",
                body: "The self-paced learner journey was mapped and the returning-student experience of Coursera, Skillshare and DataCamp audited. Patterns that worked everywhere: a persistent progress anchor and a single “continue” shortcut. Patterns that failed: dense card grids without hierarchy and progress locked away in settings.",
                changed: "The audit removed the browsable catalogue from the home. Browsing moved to its own screen and the home shelf was restricted to unfinished enrolments, ordered by whichever was touched last.",
            },
            {
                phase: "Information architecture",
                body: "Content was reorganised into three intents — Navigate, Do, and Track & connect — each owning a column, so the eye knows which region answers which question before reading a word.",
                changed: "Content stopped being grouped by type. Courses, live sessions, mentors and progress had each been a section of their own; re-sorting them by intent is why lessons and mentors no longer sit side by side.",
            },
            {
                phase: "Wireframes & validation",
                body: "Low-fidelity layouts pressure-tested the three-pane balance and, critically, the mobile reflow — settling column widths and what survives the collapse to a phone before any visual design.",
                changed: "The right rail stopped being a column on small screens. It survives as a horizontal strip — ring on the left, the percentage as a sentence on the right — which is why the desktop greeting becomes a plain progress line on a phone.",
            },
            {
                phase: "Visual design, prototype & handoff",
                body: "A lilac-led visual system was built into a working HTML/CSS prototype to validate spacing, motion and breakpoints in a real browser; the prototype doubled as the front-end reference for engineering.",
                changed: "Building the categories in a browser is what forced colour to be tokenised by role rather than by appearance: Front End, UI/UX and Branding each got a hue, a soft tint and a separately contrast-checked ink, and no screen may hard-code a hex.",
            },
        ],
        decisions: [
            {
                phase: "Use",
                moment: "Resume in a glance",
                subject: "the learner, four days later",
                question: "Where was I, and what now?",
                title: "One screen, three intents",
                body: "Navigation sits on the left, the day's work in the centre, and progress and people stay pinned to the right. Splitting the home by intent rather than by feature means the learner never hunts across the page; each column has one job and keeps to it.",
                instead:
                    "A tabbed home was the obvious first draft — one surface, three tabs. Tabs hide two of the three answers behind a click, and the whole point was that all three are true at once.",
                cost:
                    "Three regions means the right rail is the first thing sacrificed: below 1280px it stacks under the main column, so on a tablet progress drops down the page instead of sitting beside the work.",
                touchpoints: ["216px left nav rail", "centre column — hero, category counters, resume shelf, Your Lesson", "340px right rail — ring, ten-day chart, mentors", "bottom tab bar under 768px"],
                image: "/assets/imgs/portfolio/coir-six.webp",
                imageAlt: "Coir Six three-pane dashboard layout",
            },
            {
                phase: "Use",
                moment: "Effort made visible",
                subject: "a learner who studied twice this week",
                question: "Is what I did this week enough?",
                title: "Progress you can feel",
                body: "A single completion ring, a ten-day study-time chart and per-track “watched” counters convert invisible effort into visible momentum. The ring wraps the learner's own avatar so progress reads as personal, and it is a percentage of that learner's own weekly goal rather than a raw total — which is why onboarding asks for the goal at all.",
                instead:
                    "The first draft put minutes studied in the ring. A number with no denominator cannot be felt: forty minutes is either a good week or a bad one, and the interface had no way to say which.",
                cost:
                    "The denominator is self-set and rarely revisited, so the ring is honest about effort against intent and says nothing about effort against the course. A learner who sets a low goal can sit at 100% and be barely moving.",
                touchpoints: ["completion ring around the avatar", "ten-day bar chart", "per-category watched counters", "streak line under the greeting", "Progress page"],
                bar: [
                    {
                        metric: "Days of effort shown on the home",
                        definition: "The rail's chart buckets the learner's last ten days of study sessions.",
                        value: "10",
                        provenance: "in-build",
                        check: "the Statistic panel on demo.coir-six.phoxta.com",
                    },
                ],
            },
            {
                phase: "Use",
                moment: "First return after a gap",
                subject: "the learner opening the app between other things",
                question: "What do I press to keep going?",
                title: "Continue, don't restart",
                body: "The most-used action gets the most space. The shelf carries only unfinished enrolments, ordered by whichever was touched last, each card leading with a live progress bar and the mentor behind it — a horizontal, swipeable rail rather than a wall of choices.",
                instead:
                    "A browsable catalogue on the home was the obvious move and was cut: browsing and resuming are different jobs done in different moods. Browsing went to its own screen, and the home shelf was restricted to courses already started.",
                cost:
                    "The shelf reaches the course, not the lesson — a second tap on Continue is still required. That checkpoint is deliberate for a learner returning after a long gap and is pure friction for one returning after a day.",
                touchpoints: ["resume shelf", "course card with progress bar and mentor", "“Start something” fallback heading", "scroll-back / scroll-forward buttons", "Continue button on the course page"],
                bar: [
                    {
                        metric: "The home shelf when nothing is started",
                        definition: "It swaps to three recommendations drawn from the learner's stated interests, and the heading changes from Continue Watching to Start something.",
                        value: "never empty",
                        provenance: "in-repo",
                        check: "businesses/coir-six/src/pages/DashboardPage.tsx",
                    },
                ],
            },
            {
                phase: "Use",
                moment: "The day a streak nearly breaks",
                subject: "a learner who has not opened the app yet today",
                question: "Have I lost it already?",
                title: "A streak that forgives today",
                body: "The streak counts backwards from today, and when today has no session logged it starts counting from yesterday instead — so a run is never shown as broken while the day is still open to save it. The Progress page says the same thing in words rather than in a number: “Nothing yet today. Ten minutes keeps the streak.”",
                instead:
                    "The strict rule — the streak breaks at midnight — was written first. It punishes a learner at the exact moment the product most wants them back, and it makes the number an accusation rather than an invitation.",
                cost:
                    "The count can read one day ahead of the effort behind it, so a learner sees “3-day streak” on a morning when they have done nothing. The honesty is bought back in the sentence beside it, not in the figure.",
                touchpoints: ["streak line under the greeting", "flame tile on the Progress page", "the “ten minutes keeps the streak” prompt", "fourteen-day activity strip"],
                bar: [
                    {
                        metric: "Grace before a streak breaks",
                        definition: "A run survives an empty day until that day ends.",
                        value: "until the end of today",
                        provenance: "in-repo",
                        check: "businesses/coir-six/src/lib/derive.ts — streak()",
                    },
                ],
            },
            {
                phase: "Onboard",
                moment: "First time a school opens the app in its own colours",
                subject: "the school that bought the blueprint, on day one",
                question: "Will this look like us, or like a template?",
                title: "One colour, a whole school",
                body: "Branding is data applied at boot, not a build. The tenant's saved brand is read on load and written as CSS custom properties on the root, so a single primary hex derives the fill, the hover, the ink, the soft tint, the hero glow and the progress track; the wordmark, buttons, active nav and tints all follow. A rebrand is a handful of variable writes and no screen changes.",
                instead:
                    "Letting a buyer set a full palette was the richer option and was refused: it hands over the six relationships the system depends on, and the first thing a buyer would break is the contrast between a brand fill and the text on it.",
                cost:
                    "Only the primary, page and ink are a buyer's to set. The semantic category colours stay fixed, so a school whose own brand is blue will find its accent sitting next to a blue that already means Front End.",
                touchpoints: ["applyBranding on boot", "brand token set derived from one hex", "wordmark", "active nav state", "tinted icon wells", "progress track"],
            },
            {
                phase: "Use",
                moment: "First one-handed session on a phone",
                subject: "the same learner, standing up",
                question: "Can I actually do this on my phone?",
                title: "Built to reflow, not rebuild",
                body: "One reflow is designed, at 768px, and the guideline states it as a rule rather than a suggestion: sidebar becomes a bottom tab bar, header becomes an app bar, grids become snap rails, tables become stacked rows, and the right panel becomes stacked cards. The desktop greeting even changes register on the way down — “Good evening, Jason” becomes “62% of your target done”, because a greeting is hospitality and a phone screen has room for one thing.",
                instead:
                    "A second, purpose-drawn tablet layout was the alternative and was rejected: between 769 and 1400 the composition holds and scales instead, on the argument that the composition is the product and a third layout is a third thing to keep true.",
                cost:
                    "On a small laptop the interface is smaller rather than re-laid-out, and the right rail simply drops below the main column rather than being redesigned for the middle. The tablet is the size this system serves least well, and that was a choice.",
                touchpoints: ["sticky app bar", "bottom tab bar", "edge-to-edge snap rails", "stat panel as a horizontal ring-and-sentence strip", "stacked table rows"],
                bar: [
                    {
                        metric: "Reflows designed",
                        definition: "One, at 768px. Between 769 and 1400 the shell scales proportionally and is not re-laid-out.",
                        value: "1",
                        provenance: "in-doc",
                        check: "/prototypes/coir-six/design-system.html — Responsive rules",
                    },
                    {
                        metric: "Minimum touch target on mobile",
                        definition: "Every tappable element, with the hit area extended by padding rather than by enlarging the visual.",
                        value: "44 × 44",
                        provenance: "in-doc",
                        check: "/prototypes/coir-six/design-system.html — Responsive rules",
                    },
                ],
                image: "/assets/imgs/portfolio/coir-six-mobile.webp",
                imageAlt: "Coir Six responsive mobile app",
                wide: true,
            },
        ],
        notDesigned: [
            {
                title: "A product tour",
                body: "The brief was to make the home legible without instruction, so there are no coach marks, no tooltips and no first-run overlay. Onboarding asks two questions — what the learner wants to get better at, and how much time they can give a week — because the ring and the recommendations cannot be computed without them, and the screen says so: “Two questions. Both can change later in Settings.” Anything the home needed a tour to explain was treated as a layout failure.",
            },
            {
                title: "A home feed",
                body: "Study groups, group posts, an inbox and mentor profiles all exist as screens, and none of them appears on the home. A feed has no end and competes with the resume shelf for the same glance; the rail carries three mentors and a link, so encouragement is a tap away but never in the way. The cost is that a learner who wants company has to go and get it.",
            },
            {
                title: "A leaderboard or any peer comparison",
                body: "Progress is measured against the learner's own weekly goal and nothing else. There is no ranking anywhere in the app, and the data model agrees with the design: every per-learner table sits under row-level security keyed on the signed-in user, so another learner's rows are not readable to build a comparison from.",
            },
            {
                title: "A separate tablet layout",
                body: "The guideline specifies one reflow, at 768px, and holds the composition between 769 and 1400 by scaling it. A third layout would have been a third set of decisions to keep true across 21 routes, and the honest consequence — a tablet gets a smaller desktop rather than a designed middle — is stated in the guideline rather than discovered later.",
            },
        ],
        constraints: [
            "One deployment serves every buyer of this blueprint: the tenant is resolved from the request hostname at boot, so no layout may depend on catalogue size and no colour may be hard-coded into a screen.",
            "No analytics package ships with the product — nothing in the bundle records what a learner does — so every bar the design was held to had to be checkable by opening the artefact rather than by reading a dashboard.",
            "Certificates are minted server-side only once every lesson in a course is complete, so the interface was never allowed to dress “nearly done” as done.",
        ],
        unknowns: [
            "The resume shelf has never been watched in a usability session. The first test would be a returning learner with two part-finished courses and a phone, timed from app open to the lesson playing.",
            "That path is two taps, not one — the shelf reaches the course, not the lesson. Whether the Continue button reads as a useful checkpoint or as one tap too many is the single most testable thing on the page.",
            "The weekly goal is set once at onboarding and rarely revisited, and nothing in the product yet notices a goal that is consistently missed. Whether an unreachable goal demotivates faster than a met one plateaus is untested.",
            "The streak deliberately forgives an empty day. Whether that reads as generous or as a number that cannot be trusted is exactly the sort of question five people would settle in an afternoon.",
        ],
        palette: [
            { name: "Brand", hex: "#6C5DD3" },
            { name: "Brand soft", hex: "#EEEBFB", ink: true },
            { name: "Ink", hex: "#1B1B23" },
            { name: "Page", hex: "#F6F6FA", ink: true },
            { name: "Front End", hex: "#4A8FE0" },
            { name: "UI/UX", hex: "#D35DB7" },
            { name: "Success", hex: "#2B8A61" },
            { name: "People", hex: "#C0692B" },
            { name: "Destructive", hex: "#E5623B" },
        ],
        typeNote:
            "Plus Jakarta Sans on a deliberately narrow 11–30px scale, ranked by weight — SemiBold for anything scannable, Regular for supporting copy — so colour (ink → muted → caption) carries the hierarchy and the layout never has to shout. Category colour is semantic: blue always means Front End, purple UI/UX, pink Branding — a colour means the same thing everywhere.",
        components: ["Stat card", "Course card", "Colour-coded avatar system", "Completion ring & bar chart", "Category & type pills", "Left nav rail", "Mobile tab bar"],
        designSystemUrl: "/prototypes/coir-six/design-system.html",
        designSystemImage: "/assets/imgs/portfolio/coir-six-ds.webp",
        designSystemBlurb:
            "Everything on the screens traces back to one source of truth. Coir Six is documented as a full design system — four founding principles, tokenised colour, type, spacing, radius and elevation, a component library (buttons, inputs, tags, avatars, cards, navigation and data-viz) and the page and responsive patterns — with tokens exported as CSS variables and JSON so a new feature feels native on day one.",
    },
    {
        slug: "ferne",
        name: "Ferne",
        kicker: "Skincare e-commerce · Product & Web Design",
        tagline: "A botanical skincare storefront built to earn trust and convert — from hero to order confirmation.",
        summary:
            "Ferne is a small-batch botanical skincare brand whose proposition is traceability — every active tied to a farm the customer can name. The engagement covered the complete direct-to-consumer storefront: an editorial homepage, a faceted shop, rich product detail pages and a friction-light cart-to-confirmation flow across fourteen page types, designed and implemented as a working front end rather than static screens.",
        hero: "/assets/imgs/portfolio/ferne.webp",
        heroAlt: "Ferne skincare storefront — homepage",
        accent: "#5F6F52",
        meta: [
            { label: "Role", value: "Product & Web Designer" },
            { label: "Timeline", value: "4 weeks" },
            { label: "Scope", value: "14 page types" },
            { label: "Tools", value: "Figma · React · Supabase" },
        ],
        tags: ["E-commerce", "Web Design", "Design System", "Front-end", "Responsive"],
        prototypeUrl: "https://demo.ferne.phoxta.com",
        prototypeLabel: "Visit the live site",
        processTitle: "From brand promise to confirmed order.",
        challenge:
            "Premium skincare converts on trust and flow. Shoppers bounce when a store feels generic, hides the “why”, or turns purchasing into a chore. Ferne's brand rests on a single claim — traceable, farm-named ingredients — so the storefront had to make that credible on every screen and then step aside, converting browsing into a bag and a bag into a confirmed order without a single dead end.",
        atAGlance: {
            problem:
                "A brand whose entire claim is traceability had static screens and no way to take an order — the promise was copy, and nothing on the page could be bought.",
            move:
                "Put the reason to trust on the buying path instead of on an About page, and let a stranger finish an order — and find it again later — without ever making an account.",
        },
        before:
            "A set of static front-end screens. Ferne began as a portfolio piece with no backend: prices, stock and orders were fixtures. This engagement re-engineered those screens into a multi-tenant store where the server, not the client, decides what anything costs.",
        constraint:
            "One deployment serves every buyer of this blueprint. The store resolves which business it is at boot from the hostname, so no layout may assume a catalogue size, a price ceiling or a review count — and the client is never allowed to decide money.",
        definitionOfDone:
            "The store is done when a stranger can go from the home page to a confirmed order without an account, name a farm behind one ingredient on the way, and find that order again later with nothing but the reference and the email they were sent.",
        evidenceNote:
            "No user research was run on this engagement. The questions below are the assumptions the design was built on; the standards beside them are the ones it was held to.",
        phaseNote:
            "Discover, Learn, Buy and Get help are this store's to claim. Onboard and Use belong to a bottle of oil in a bathroom, not to a website; Try was answered with a thirty-day open-returns policy rather than a sampling flow; Expand is a refill filter, not a subscription; and End use is a sentence in the privacy page, not a screen.",
        subjects: [
            {
                label: "A first-time visitor from an ad",
                context:
                    "Lands on the home page on a phone, has never heard the name, and is deciding in a few seconds whether a botanical claim is real or decorative.",
                judges: "Can I tell what makes this different before anyone asks me for anything?",
            },
            {
                label: "A shopper who knows the complaint, not the catalogue",
                context:
                    "Arrives with “redness” in mind and no idea which of nine formulas treats it — and no patience for a menu organised around the brand's own product families.",
                judges: "Did the store let me narrow by my problem rather than by its categories?",
            },
            {
                label: "A guest placing a first order",
                context:
                    "Will not create an account to buy a £30 oil, and will come back exactly once — to find out where the parcel is.",
                judges: "Can I find my order again with only the email I was sent?",
            },
        ],
        goals: [
            { title: "Make the promise felt", body: "Place traceability — farms, batch numbers, provenance — where it reassures, never where it clutters." },
            { title: "Browse without friction", body: "A shop that filters, sorts and searches the way a real catalogue is used — by concern, category, price and stock." },
            { title: "A product page that sells", body: "Everything a considered purchase needs — variants, honest stock, reviews, ingredients — in one calm scroll." },
            { title: "Checkout that never stalls", body: "Carry the shopper from cart to confirmation with real validation, clear costs and zero dead ends." },
        ],
        bar: [
            {
                metric: "Page types shipped",
                definition: "Distinct screens a shopper can reach, counted from the router.",
                value: "14, plus a 404",
                provenance: "in-repo",
                check: "businesses/ferne/src/App.tsx — 15 route entries over 13 page components",
            },
            {
                metric: "Steps from bag to confirmation",
                definition: "Screens between the cart and an order reference, each with a link back out.",
                value: "3",
                provenance: "in-build",
                check: "demo.ferne.phoxta.com/checkout — Information, Delivery, Payment",
            },
            {
                metric: "Facets that narrow the grid",
                definition: "Controls in the shop that actually filter, sort excluded.",
                value: "7",
                provenance: "in-build",
                check: "demo.ferne.phoxta.com/shop — the filter rail plus the search field",
            },
            {
                metric: "Filter state a shared link restores",
                definition: "How many of those seven round-trip through the query string.",
                value: "4 of 7",
                provenance: "in-repo",
                check: "businesses/ferne/src/pages/ShopPage.tsx — cat, q, refill and sort use useSearchParams",
            },
            {
                metric: "Dead ends in the buy flow",
                definition: "Screens reachable with no way forward and no way back.",
                value: "none",
                provenance: "target",
            },
            {
                metric: "Tokens the whole store is drawn from",
                definition: "Custom properties on :root — six surface and brand colours, five ink and line values, two families, five radii.",
                value: "18, in one 703-line stylesheet",
                provenance: "in-repo",
                check: "businesses/ferne/src/styles/ferne.css — the :root block, lines 1–6",
            },
        ],
        process: [
            {
                phase: "Brand & foundations",
                body: "Voice (warm, plain-spoken, editorial) and a token system — sage on warm sand, Fraunces with Manrope — were established before any page, so every screen would read as one brand.",
                changed:
                    "The token set was cut to eighteen and the accent given a single job — buttons, links and proof points — so a buyer's own brand colour could be swapped in at domain resolution without any page being redrawn.",
            },
            {
                phase: "Journeys & IA",
                body: "The shopper paths — discover → compare → decide → buy → return — were mapped and fourteen page types structured around them: home, shop, product, cart, checkout, order, guest tracking, account, journal, article, about, contact, privacy and terms.",
                changed:
                    "The receipt and the guest tracking form collapsed into one screen once the two paths were drawn side by side: the same lookup, with or without a reference in the URL.",
            },
            {
                phase: "Interaction & prototype",
                body: "Flows were designed and then built as a working front end — data-driven catalogue, cart, wishlist, promo codes, ⌘K search, mini-cart drawer — so the whole journey could be tested in a browser rather than in static frames.",
                changed:
                    "Filters moved out of component state and into the query string, because a filtered shop that cannot be linked to is a result nobody can send — and the footer needed to deep-link into four of them anyway.",
            },
            {
                phase: "Systemise & harden",
                body: "Product cards, drawers, filters and forms were componentised; responsive rules (tablet ≤1100px, mobile ≤768px) and form validation were specified so the store holds together on any device.",
                changed:
                    "The price slider's ceiling became a computed value rather than a stored number, after the demo catalogue's ceiling was found to strand the filter — and hide every product — the moment a live catalogue with a different top price loaded.",
            },
        ],
        decisions: [
            {
                moment: "First screen, before any scroll",
                phase: "Discover",
                subject: "a first-time visitor from an ad, on a phone",
                question: "Why should I believe this one?",
                title: "An editorial hero that says why",
                body:
                    "The homepage opens with a serif promise and the product in hand — not a slider — the traceability claim sitting in the subhead under the headline rather than on an About page. Beneath it a four-item trust strip states the facts flat (dermatologist tested, traceable botanicals, refillable glass, free UK delivery over £40) and a marquee carries the proof points that substantiate the botanical claim.",
                instead:
                    "A rotating hero carried three claims on three slides in the first draft. A carousel asks a stranger to wait for the argument, and this brand has one argument — so the slider was cut and the single claim took the whole viewport, with the trust strip carrying the rest as facts rather than as slides.",
                cost:
                    "One product becomes the face of the store and the other eight lose the first impression entirely; they have to be reintroduced by the best-sellers shelf a screen later.",
                touchpoints: [
                    "Static editorial hero",
                    "Floating product card with live price",
                    "Category chips with live counts",
                    "Four-item trust strip",
                    "Proof marquee",
                ],
                bar: [
                    {
                        metric: "Distance to the reason to trust",
                        definition: "Where the traceability claim sits relative to the first action.",
                        value: "in the subhead, under the headline",
                        provenance: "target",
                    },
                ],
                image: "/assets/imgs/portfolio/ferne.webp",
                imageAlt: "Ferne homepage hero",
            },
            {
                moment: "Narrowing nine formulas to two",
                phase: "Discover",
                subject: "a shopper who knows the complaint, not the catalogue",
                question: "Which one of these is for my redness?",
                title: "A shop that filters by the complaint, not the category",
                body:
                    "Seven controls narrow the grid — category, six multi-select skin concerns, a price ceiling computed from the dearest product, in-stock only, refillable only, and a free-text search that reads names, straplines, categories and concerns. Every option carries a live count, every active filter renders as a removable chip, and category, search, refillable and sort live in the URL, so a filtered shop is a link that can be sent.",
                instead:
                    "Category-first navigation — Face, Body, Sets — was the e-commerce default, and it was demoted to one facet among seven. Skincare is not bought by body part; it is bought by complaint, so the concern list became the rail's centre of gravity and “redness” finds the cleanser through the search index rather than through a menu.",
                cost:
                    "Those six concerns are the brand's vocabulary, not a dermatologist's. A shopper who types “rosacea” or “eczema” gets an empty grid, and the synonym layer that would fix it does not exist.",
                touchpoints: [
                    "Filter rail with live counts",
                    "Active-filter chips",
                    "Five sort orders",
                    "⌘K search palette",
                    "“Nothing matches those filters” empty state",
                ],
                bar: [
                    {
                        metric: "Concerns a shopper can combine",
                        definition: "Skin concerns in the rail, multi-select.",
                        value: "6",
                        provenance: "in-build",
                        check: "demo.ferne.phoxta.com/shop — the Skin concern group",
                    },
                    {
                        metric: "Active filters with no visible way out",
                        value: "none — each renders as a removable chip",
                        provenance: "in-build",
                        check: "demo.ferne.phoxta.com/shop?cat=face — the chip row above the grid",
                    },
                ],
                image: "/assets/imgs/portfolio/ferne-shop.webp",
                imageAlt: "Ferne shop with faceted filters",
            },
            {
                moment: "Deciding what to start with, without leaving the home page",
                phase: "Learn",
                subject: "a visitor sold on the brand but not on any one product",
                question: "What do I actually start with?",
                title: "A best-sellers shelf that sells the routine",
                body:
                    "Four best-sellers sit under one plant-led promise — calm, hydrate and rebuild the skin barrier — with The Ritual Set bundling cleanse, treat and seal as a single purchase. Every card is the same component the shop grid uses, so a shopper can add to bag and open the mini-cart without leaving the home page, or step across to the full catalogue.",
                instead:
                    "A five-question skin quiz was the category convention and the obvious alternative. A quiz charges a visitor before the store has earned anything, and returns a recommendation the shop cannot stand behind — so the routine was published as an answer instead: three named steps, sold as a set. The diagnostic conversation moved to the advisor, where asking is optional.",
                cost:
                    "One published routine leaves a shopper whose skin does not match it with no tailored path from the home page at all; they have to work the shop's filters, or ask.",
                touchpoints: [
                    "Shared product card",
                    "The Ritual Set bundle",
                    "Mini-cart drawer",
                    "Toast with a “View bag” action",
                    "“Shop all products” link",
                ],
                bar: [
                    {
                        metric: "Questions asked before a recommendation",
                        value: "none",
                        provenance: "in-build",
                        check: "demo.ferne.phoxta.com — the shelf under the hero",
                    },
                    {
                        metric: "Actions from a cold home page to a bag with something in it",
                        definition: "Taps, counted from first paint.",
                        value: "1",
                        provenance: "in-build",
                        check: "demo.ferne.phoxta.com — “Add to bag” on any shelf card",
                    },
                ],
                image: "/assets/imgs/portfolio/ferne-bestsellers.webp",
                imageAlt: "Ferne best-sellers shelf",
            },
            {
                moment: "The considered buy",
                phase: "Learn",
                subject: "a repeat skincare buyer down to a shortlist of two",
                question: "What is in it, and is it here now?",
                title: "A product page built for a considered buy",
                body:
                    "Gallery, size variants that reprice live, and a stock line that is specific rather than reassuring — “Only 4 left in this batch”, “In stock · ships today before 2pm”. The full ingredient list runs in INCI order with the traceable actives starred, above a rating breakdown and a review form; below 768px a fixed buy bar keeps the primary action within reach of one thumb.",
                instead:
                    "The rating was going to lead with the catalogue's seeded figure, which is what a demo store normally does. It leads with the reviews customers have actually written instead, and the seeded number stands in only until a shop has reviews of its own. Submitted reviews land pending for the owner to approve, and the form says so rather than implying the review is live.",
                cost:
                    "A newly launched tenant shows a thin review count and a lower average than the demo does — the worse-looking and the more honest of the two.",
                touchpoints: [
                    "Variant selector with live pricing",
                    "Specific stock line",
                    "INCI list with traceable actives starred",
                    "Rating breakdown",
                    "Review form that states the review is pending",
                    "Mobile sticky buy bar",
                ],
                bar: [
                    {
                        metric: "Priced size variants behind nine products",
                        value: "14, two of them refills",
                        provenance: "in-repo",
                        check: "businesses/ferne/src/data/catalogue.ts — the sizes arrays",
                    },
                    {
                        metric: "Reviews that publish without the owner",
                        value: "none — app_submit_review lands them pending",
                        provenance: "in-repo",
                        check: "businesses/ferne/README.md, “What is real”",
                    },
                ],
            },
            {
                moment: "First order placed without an account",
                phase: "Buy",
                subject: "a guest who will not sign up to buy a £30 oil",
                question: "How do I find this again later?",
                title: "Cart to confirmation to tracking, with no account in the way",
                body:
                    "Three checkout steps, each with a way back out, and validation that names the fault rather than shrugging — aria-invalid on the failing field and “Enter a valid UK postcode”, relaxed to a length check once the country is not the UK. Delivery is three options with their real terms — Standard £3.95 in 3–5 working days, Express £6.95 next day, collect in Birmingham free in two hours — over a free-delivery progress bar at £40. The receipt and the guest tracking form are one screen: with a reference it is the receipt, without one it is the lookup.",
                instead:
                    "An account gate before checkout was the alternative, and it is what makes order history, reorder and a mailing list work. It lost to the guest path: the lookup asks for the reference and the email together, so a shared link or a glance over a shoulder reveals nothing, and an account became something to want rather than something to survive.",
                cost:
                    "A guest order is recoverable only from the confirmation email — lose it and the shopper has to contact the shop — and the store forgoes the sign-up it could have taken at the highest-intent moment it will ever have.",
                touchpoints: [
                    "Three-step bar with completed ticks",
                    "Per-field errors with aria-invalid",
                    "Country-aware postcode test",
                    "Free-delivery progress bar",
                    "/order/:ref receipt",
                    "/track-order guest form",
                    "Four-stage order timeline",
                ],
                bar: [
                    {
                        metric: "Facts needed to open an order",
                        definition: "What the guest lookup requires before it returns anything.",
                        value: "2 — the reference and the email",
                        provenance: "in-repo",
                        check: "businesses/ferne/src/pages/OrderPage.tsx — the comment above the lookup",
                    },
                    {
                        metric: "Delivery options that state an ETA and a price",
                        value: "3",
                        provenance: "in-repo",
                        check: "businesses/ferne/src/config/brand.ts — STORE.shipping",
                    },
                ],
            },
            {
                moment: "First question a shopper would otherwise have emailed",
                phase: "Get help",
                subject: "a shopper stalled on a product page late at night",
                question: "Will this be too much for my skin?",
                title: "An advisor that knows when to stop talking",
                body:
                    "The skin advisor answers as the tenant's own business, from that tenant's catalogue, and every conversation lands in that owner's inbox. When a person picks the thread up in the console the widget says so — “A team member has joined the chat…” — and the scripted responder goes silent: the reply comes back deliberately empty, because honest silence while somebody types beats a bot speaking over them. The thread is held in session storage, so it survives navigation across the store.",
                instead:
                    "The cheap version is an always-on bot with a “contact us” link for when it fails, which is what most storefront widgets ship. It was rejected because the failure case — a shopper already let down by the bot — is precisely the moment a person is needed, so takeover was designed into the widget rather than bolted alongside it.",
                cost:
                    "The console has no push channel, so a person's replies arrive on a poll that idles after two minutes; a shopper who wanders off and comes back sees the answer late.",
                touchpoints: [
                    "Advisor panel with starter chips",
                    "Rich product cards inside a reply",
                    "“A team member has joined the chat…” status line",
                    "Local fallback responder when the backend is unreachable",
                    "Session-stored thread that survives navigation",
                ],
                bar: [
                    {
                        metric: "Scripted replies sent after a person takes the thread",
                        value: "none",
                        provenance: "in-repo",
                        check: "businesses/ferne/src/components/SkinAdvisor.tsx — the header comment and noteHuman",
                    },
                    {
                        metric: "Delay carrying a human reply into the widget",
                        definition: "The poll interval while the panel is open.",
                        value: "5 seconds",
                        provenance: "in-repo",
                        check: "businesses/ferne/src/components/SkinAdvisor.tsx — POLL_MS",
                    },
                ],
            },
        ],
        notDesigned: [
            {
                title: "No skin quiz",
                body:
                    "Every competitor opens with a five-question diagnostic. A quiz taxes a visitor before the store has earned anything and produces a recommendation the shop cannot stand behind, so the routine is published as an answer instead — cleanse, treat, seal, sold as one set — and the diagnostic conversation lives in the advisor, where asking is optional and a real person can take the thread over.",
            },
            {
                title: "No subscription",
                body:
                    "Replenishment is the standard skincare growth lever and it was left out. Refills are a product and a filter — /shop?refill=1, 20–25% cheaper than the first purchase — not a recurring commitment a shopper has to remember to cancel. The cost is real: nothing here produces predictable revenue.",
            },
            {
                title: "No account gate",
                body:
                    "Nothing on the buy path requires an account. The receipt and the guest tracking form are the same screen, and the lookup asks for the reference and the email together so a shared link reveals nothing. The store gives up the sign-up it could have taken at its highest-intent moment.",
            },
            {
                title: "No product comparison",
                body:
                    "Nine products across three categories: a compare table would be furniture. The shop's job is to get a shopper down to two candidates; the product page's job is to decide between them, which is why the ingredient list is complete and the stock line is specific rather than “available”.",
            },
        ],
        constraints: [
            "One deployment serves every buyer of this blueprint, resolved from the hostname at boot — so no layout may assume a catalogue size, a price ceiling or a review count.",
            "The client shows prices; the server charges them. app_place_order re-prices every line from the matched variant, so no total the interface draws can be trusted as the one that is taken.",
            "Payment is confirmed only from the server-side order record: a popup callback can fire for a payment that later fails, so a callback triggers a re-check rather than a success screen.",
            "No analytics exist on this storefront, so every bar had to be checkable by opening the artefact — routes, steps, states, facets.",
            "The same store had to hold at 1280px and be workable one-handed below 768px, which is why the primary buy action becomes a fixed bar rather than something to scroll back to.",
        ],
        unknowns: [
            "The six skin concerns are the brand's vocabulary. The first test is watching someone who says “rosacea” or “eczema” use the filter rail, because the search index has no synonyms and will hand them an empty grid.",
            "The three-step checkout has never been watched. The step to watch is Delivery: three options with different ETAs against a free-standard threshold at £40 is where a shopper does arithmetic, and arithmetic is where carts are abandoned.",
            "Nobody has yet tried to find an order with only the confirmation email in hand. It is the one flow with no account to fall back on, and the flow the guest-first decision is betting on.",
            "The advisor's human takeover has not been tested from the shopper's side — whether “A team member has joined the chat…” reads as reassurance or as an escalation.",
        ],
        palette: [
            { name: "Sage", hex: "#5F6F52" },
            { name: "Sage soft", hex: "#E3E8DC", ink: true },
            { name: "Canvas", hex: "#F3F0EA", ink: true },
            { name: "Sand", hex: "#E9E1D5", ink: true },
            { name: "Blush", hex: "#EFDDD4", ink: true },
            { name: "Ink", hex: "#17150F" },
            { name: "Muted", hex: "#5A5750" },
        ],
        typeNote:
            "Fraunces — an optical serif — carries headlines and product names for an editorial, apothecary feel; Manrope keeps body copy and UI crisp. Warm sand grounds the whole store and sage is the single accent, used for actions and proof points, never decoration. Corners stay soft (12–32px radii) so the brand feels calm and tactile.",
        components: ["Product card", "Faceted filter rail", "Mini-cart drawer", "Search palette (⌘K)", "Variant & quantity selector", "Review breakdown", "Multi-step checkout", "Toasts & cookie banner"],
    },
    {
        slug: "saveur",
        name: "Saveur",
        kicker: "Restaurant ordering · Product Design",
        tagline: "A restaurant storefront that takes the order, quotes the party and answers the phone.",
        summary:
            "Saveur is Phoxta's restaurant blueprint: a digital-first kitchen with online ordering for delivery and collection, special-order quotes for catering and events, live order tracking behind a real payment check, and an AI concierge grounded in the tenant's own menu. The engagement covered the full guest journey — nine screens and a 404 on one editorial system — and the data model that lets the storefront clone for the next restaurant without a redesign.",
        hero: "/assets/imgs/portfolio/saveur.webp",
        heroAlt: "Saveur restaurant storefront — homepage",
        accent: "#B45309",
        meta: [
            { label: "Role", value: "Lead Product Designer" },
            { label: "Timeline", value: "2026" },
            { label: "Scope", value: "Home · Menu · Special orders · Checkout · Track · Account" },
            { label: "Tools", value: "Figma · React · TypeScript · Supabase" },
        ],
        tags: ["Restaurant", "Ordering", "E-commerce", "AI", "Responsive"],
        prototypeUrl: "https://saveur-demo.dine.phoxta.com",
        prototypeLabel: "Visit the live site",
        processTitle: "From a menu online to a kitchen that never misses an order.",
        challenge:
            "Most restaurant websites are a PDF menu and a phone number, so the actual ordering happens on third-party delivery apps that take a commission and own the customer relationship. The brief was to make ordering, requesting and asking a question as easy as the aggregator apps — on the restaurant's own domain, in its own voice — with every order, request and question landing with the operator rather than a marketplace.",
        atAGlance: {
            problem:
                "A restaurant's own site is a PDF menu and a phone number, so the ordering — and the customer relationship — end up on an aggregator that charges for both.",
            move:
                "Design it as a digital-first kitchen with no dining room: order, request, track. The table booking was designed out rather than in, and everything a guest can ask for lands with the operator.",
        },
        before:
            "A menu to read and a number to ring, with a dine-in reservation widget occupying the most valuable block on the home page — a date-and-party-size form for a kitchen that has no dining room to fill.",
        constraint:
            "One deployment serves every restaurant that buys the blueprint. The menu, the courses, the branding and the concierge's agent key all arrive as tenant data resolved from the hostname at page load, so no layout may assume a dish count, a course count or a colour.",
        definitionOfDone:
            "A guest can go from the home page to a paid order with a reference number and a visible kitchen stage, and a caterer can describe a party of thirty and get a reply — neither of them phoning the restaurant, and every order, request and question landing in the console the owner already works in.",
        phaseNote:
            "This study covers Discover, Buy, Use and Get help. There is no Try — a restaurant's trial is the first order — and no Expand or End use, because the relationship is per-order and the owner-side surfaces belong to Phoxta's console rather than to this storefront.",
        evidenceNote:
            "No user research was run on this engagement. The questions below are the assumptions the design was built on; the standards beside them are the ones it was held to.",
        subjects: [
            {
                label: "A guest ordering dinner from a phone",
                context: "Somewhere between work and home, deciding in about two minutes whether to order here or open a delivery app.",
                judges: "Could I see what I'm allowed to eat, order it and know when it will be ready — without ringing anyone?",
            },
            {
                label: "Someone feeding thirty people next Friday",
                context: "Planning an office lunch or a party, with a date, a headcount, a budget and at least one dietary requirement to state before anyone can quote.",
                judges: "Did a person read what I actually need, and come back with a price?",
            },
            {
                label: "The owner of the kitchen",
                context: "Runs the restaurant from the Phoxta operating console and cannot afford a second inbox, a second catalogue or a second place to look.",
                judges: "Does every order, request and question land where I already work?",
            },
        ],
        goals: [
            { title: "Order in a scroll", body: "A menu that filters by course and dietary need and adds to a bag without leaving the page — no PDF, no phone call." },
            { title: "Quote a party without the phone tag", body: "Catering, bulk orders, custom bakes and events as one short request that returns a reference number and lands in the kitchen's inbox." },
            { title: "Never wonder where the food is", body: "A status timeline in the kitchen's own voice that only starts once the money has actually landed, and a concierge the page points the question at." },
            { title: "One kitchen, one console", body: "Menu items are products, orders are orders, requests are tickets — everything runs from the same Phoxta console the operator already uses." },
        ],
        bar: [
            {
                metric: "Screens from bag to a tracked order",
                definition: "Surfaces a guest passes through after adding a dish: the bag drawer, one checkout form, the tracking page.",
                value: "3",
                provenance: "in-build",
                check: "Add a dish at saveur-demo.dine.phoxta.com and follow it: bag drawer → /checkout → /track.",
            },
            {
                metric: "Guest screens shipped",
                definition: "Distinct routed screens, plus a 404 — home, menu, special orders, checkout, track, account, about, contact and an owner demo.",
                value: "9, plus a 404",
                provenance: "in-repo",
                check: "businesses/restaurant-orders/src/router.tsx — eleven route entries, one of which is a redirect and one a wildcard.",
            },
            {
                metric: "Dietary needs filterable without typing",
                definition: "Needs a guest can isolate from the menu with a single pill, alongside an All state.",
                value: "3 — vegetarian, gluten-free, dairy-free",
                provenance: "in-build",
                check: "The dietary filter row on /menu.",
            },
            {
                metric: "Widths the storefront reflows at",
                definition: "Breakpoints written into the storefront's own stylesheet, not inherited from a framework grid.",
                value: "3 — 1024, 768, 480",
                provenance: "in-repo",
                check: "The three @media blocks in businesses/restaurant-orders/src/index.css.",
            },
            {
                metric: "Everyday orders that need a phone call",
                definition: "The standard the whole storefront was set against: an order for delivery or collection completes on the restaurant's own domain, with no call and no aggregator in the middle.",
                value: "designed for none",
                provenance: "target",
            },
            {
                metric: "“Where is my order?” reaching a person",
                definition: "Designed so the tracking page and the concierge absorb the question that used to interrupt the pass — the page routes it in copy rather than leaving it to front of house.",
                value: "designed to be self-served",
                provenance: "target",
            },
        ],
        process: [
            {
                phase: "Journeys & IA",
                body: "Three guest journeys — order for delivery or collection, request something the menu cannot hold, track what has been placed — were mapped and structured as nine screens plus a 404, with an owner demo view alongside them.",
                changed: "The dine-in journey came out. Once the blueprint was a delivery-and-collection kitchen, the reservation flow had nowhere to land: /reservations became a redirect to the request form for old links, and the console's Reservations module was dropped from the restaurant vertical.",
            },
            {
                phase: "Brand & foundations",
                body: "An editorial, evening-service tone was set: Cormorant Garamond over dark photographic heroes, Josefin Sans for menus, forms and the tracking timeline, and warm cream as the ground for every page below the fold.",
                changed: "Colour was reduced to one job. Copper marks the action and nothing else — Add, Checkout, Send request and the active filter pill are the same colour — so a guest never has to work out which button is the order.",
            },
            {
                phase: "Interaction & build",
                body: "The filterable menu, the customisation sheet, the bag, the checkout, the status timeline and the concierge were built as a working React storefront wired to the Phoxta backend, with prices priced server-side and orders written to the owner's console.",
                changed: "The home page's reservation widget became an ordering block. The two things a visitor to a digital-first kitchen wants — start an order, find the one already placed — are each one field away, side by side, above the story.",
            },
            {
                phase: "Blueprint & harden",
                body: "Everything was made data-driven: dishes are products, requests are tickets, branding is tenant data applied at domain resolution, and the bundled demo menu is only a fallback for an unconfigured host.",
                changed: "Nothing stayed hard-coded, including the menu's own structure. Course tabs are derived from whatever the owner has published rather than from the demo's five courses, so a kitchen with three sections or nine needs no redesign.",
            },
        ],
        decisions: [
            {
                moment: "First visit, no order started",
                phase: "Discover",
                subject: "a hungry visitor on a phone, two minutes from opening a delivery app",
                question: "Where do I start an order?",
                title: "An ordering block where the reservation widget used to be",
                body: "The home page carries two cards side by side: start an order — delivery or collection as one pill pair, then the menu — and track one already placed, by the reference from the confirmation email. They sit under the featured dishes and above the story, because for a digital-first kitchen those are the only two things a returning guest ever wants.",
                instead: "The block held a dine-in reservation widget. Once the blueprint had no dining room, a date-and-party-size form was the most prominent thing on the page that the kitchen could not honour, so it was replaced by the order-and-track pair.",
                cost: "The hero above it still offers “Reserve a Table” as its second action, now redirected to the special-order form. A redirect covers an old bookmark honestly; it does not yet cover a hero that promises a table.",
                touchpoints: ["Order-now card with the delivery / collection pill", "Track-an-order card", "/reservations → special-order redirect", "Nav bag with a live count"],
            },
            {
                moment: "Deciding what to eat without ringing to ask",
                phase: "Discover",
                subject: "a guest with a dietary need, scanning on a phone",
                question: "What here can I actually eat?",
                title: "A menu built to be ordered from",
                body: "Courses as pills derived from whatever the kitchen has published, a dietary filter beside them, GF/DF/V badges on every row and a single Add. Photography stays small and consistent so the page scans like a menu and behaves like a shop, and the bag follows the guest across the site.",
                instead: "Dietary needs could have stayed in the order note — one free-text field, every row identical, and the guest trusting the kitchen to read it. Promoting the three commonest needs to a filter and a badge puts the answer on the row before anything is added; the note field stays for everything else.",
                cost: "Only three needs are filterable. A nut allergy still ends up as typed text in a note, which is the weakest link in the flow and the first thing worth testing.",
                touchpoints: ["Course pills derived from the live menu", "Dietary filter row", "Menu row with dietary badges and price", "“No dishes match that filter.” empty state"],
            },
            {
                moment: "First order placed without a phone call",
                phase: "Buy",
                subject: "a guest who wants it without the onions",
                question: "Can I ask for it a different way?",
                title: "One sheet between a dish and the bag",
                body: "Every Add opens a customisation sheet: the dish, its modifier groups, a special-instructions field, a quantity stepper and the running price on the button. Required groups pre-select their first option and the Add button stays disabled until every one of them is answered, so a line can never reach the kitchen half-specified.",
                instead: "A one-tap Add straight to the bag was the faster path and the one most menus take. It has no home for “no onions” — the request that otherwise becomes the phone call this storefront exists to remove.",
                cost: "Every dish costs a tap it does not need, and the demo menu defines no modifier groups at all, so the sheet a live kitchen would fill with options currently opens on a note field and a stepper. The behaviour is real in the code and invisible in the demo.",
                bar: [
                    {
                        metric: "Half-specified lines a guest can send",
                        definition: "Required modifier groups block the add until they are answered.",
                        value: "none — Add is disabled",
                        provenance: "in-repo",
                        check: "missingRequired in businesses/restaurant-orders/src/components/DishCustomize.tsx.",
                    },
                ],
                touchpoints: ["Customisation sheet", "Required modifier groups", "Special-instructions field", "Quantity stepper with running price", "Bag drawer"],
            },
            {
                moment: "Feeding thirty people next Friday",
                phase: "Buy",
                subject: "someone planning an office lunch, a week out",
                question: "Can you do this for thirty people?",
                title: "Special orders kept out of the cart",
                body: "Four named kinds — catering, bulk order, custom bake, event — each with a one-line explanation, then a short form: when, how many, budget and what you need. It returns a reference number and one honest promise: “We reply by email, usually within a few hours.” The request lands as a ticket in the kitchen's Inbox, the same surface as every other customer message, where it can be answered and turned into an invoice.",
                instead: "The obvious move was a large-quantity path through the same cart. The code records why it lost: quantity, date, budget and dietary needs have to be agreed first, so any price shown before that conversation is a price the kitchen cannot hold.",
                cost: "The guest leaves without a total. All the page can offer instead is a reference and a reply time — which is why the copy promises hours rather than minutes, and why everyday orders are sent back to the menu with “it's faster”.",
                bar: [
                    {
                        metric: "Promised reply to a request",
                        definition: "The commitment the confirmation screen prints, and the standard the Inbox routing was built to make keepable.",
                        value: "by email, usually within a few hours",
                        provenance: "target",
                    },
                ],
                touchpoints: ["Four kind cards with one-line blurbs", "Request form — date, headcount, budget, details", "Reference-number confirmation", "Pre-filled email for a signed-in customer", "Inbox ticket in the operating console"],
            },
            {
                moment: "Twenty minutes in, wondering",
                phase: "Use",
                subject: "a guest who has paid and is waiting",
                question: "Where is my food?",
                title: "Tracked like a parcel — and honest when it cannot be",
                body: "Four stages, each with a line in the kitchen's voice: Received, In the kitchen (“Our chefs are preparing it”), Ready (“Packed and ready”), Completed (“Enjoy your meal”). Where a tenant has payments configured the page opens on a payment state instead — “Your order is reserved — complete payment to confirm it with the kitchen” — and the kitchen progress only begins once the money has actually landed.",
                instead: "A thank-you page on form submit was the shorter build and the one checkout originally took. It tells a guest their order is placed before the payment has cleared, so the confirmation was moved behind a server-side check: the page polls the guest order lookup until the payment webhook confirms it.",
                cost: "The wait became visible. Polling runs for two minutes and then stops and says so, which is why the page has to carry a fallback sentence — “Already paid? Reopen this page from your confirmation email, or ask the concierge to check your order.”",
                bar: [
                    {
                        metric: "Kitchen stages a guest can see",
                        definition: "Named steps on the tracking page, each with its own line of copy.",
                        value: "4",
                        provenance: "in-build",
                        check: "/track on the live site.",
                    },
                    {
                        metric: "Payment confirmation",
                        definition: "How often the page re-checks the order lookup, and for how long, before it admits it cannot tell.",
                        value: "every 3 seconds, for 2 minutes",
                        provenance: "in-repo",
                        check: "POLL_MS and POLL_MAX_MS in businesses/restaurant-orders/src/pages/OrderTracking.tsx.",
                    },
                ],
                touchpoints: ["Four-step status timeline with a “Now” badge", "Awaiting-payment state", "Payment-received confirmation", "Poll-timeout fallback copy", "Concierge prompt beneath the timeline"],
            },
            {
                moment: "A question at eleven at night",
                phase: "Get help",
                subject: "a guest with nobody to ask",
                question: "Who do I ask at this hour?",
                title: "A concierge scoped to what the kitchen can honour",
                body: "The concierge is grounded in the tenant's own menu and addressed to the agent that business owns rather than the build's default, so each store's chats reach its own owner. Its four suggestion chips are the kitchen's actual jobs — recommend a dish, what's vegetarian, track my order, catering for an event — and when someone in the console takes a thread over, their replies arrive in the same panel under a Team label.",
                instead: "A contact form and a phone number were already on the site and would have covered the same questions. They answer tomorrow. The concierge was scoped instead to the three things answerable now — the menu, an order's status and a request — with everything else becoming a thread a person can take over.",
                cost: "A grounded assistant is only as honest as its grounding, so the chip set had to be pruned to what the kitchen can deliver. “Book a table” is absent by design: the code notes that suggesting it invites a request nobody can honour.",
                touchpoints: ["Concierge launcher on every page", "Four suggestion chips", "On-device menu fallback when the agent is unreachable", "“A team member has joined the chat…” takeover state", "Dish cards inside the chat"],
            },
        ],
        notDesigned: [
            {
                title: "Table reservations",
                body: "There is no dining room in this blueprint, so booking one was designed out rather than in. The console drops the Reservations module for the restaurant vertical, /reservations survives only as a redirect for old links, the reservation call in the storefront's own API client is left with nothing calling it, and the concierge's suggestion chips carry no “Book a table”.",
            },
            {
                title: "A driver map",
                body: "Delivery is a fulfilment choice and a fee at checkout, not a tracked vehicle. The four stages a guest sees end at the kitchen's door, because that is the last thing the kitchen actually knows — a moving dot would be the one element on the page nobody could verify.",
            },
            {
                title: "An account before you can order",
                body: "Checkout asks for a name, an email, a phone number and — for delivery — an address. Nothing else. The account page exists for the one question a returning customer really has, “what did I order and can I have it again”, and a signed-in guest gets their address pre-filled into the special-order form. Nobody is stopped at a sign-up wall to buy dinner.",
            },
        ],
        constraints: [
            "One deployment serves every restaurant that buys the blueprint, so the menu, the courses, the branding and the concierge's agent key all arrive as tenant data resolved from the hostname — no layout may assume a dish count or a colour.",
            "Prices are server-authoritative: the storefront displays them and never decides them, so nothing in the interface may imply a total the backend has not confirmed.",
            "The kitchen has one place to work — the Phoxta console — so a special order had to arrive as a ticket in the same Inbox as every other message rather than open a second queue.",
            "No analytics exist on this storefront, so every bar had to be checkable by opening the site or the repository.",
        ],
        unknowns: [
            "The tracking page has never been watched in a usability session. The first test would be a guest who paid, closed the tab and came back from the confirmation email — the path the two-minute polling window does not cover.",
            "The dietary filter offers three needs and a free-text note for everything else. Whether a guest with a nut allergy trusts a note field enough to place the order is the question the design does not answer.",
            "The four special-order kinds were named from what a kitchen sells, not from what guests ask for. A week of real requests would show whether “bulk order” and “custom bake” are the words anyone actually uses.",
            "The home page still offers “Reserve a Table” as its second action and redirects it to the request form. Whether a redirect is enough, or the hero needs rewriting to the kitchen it has become, is the first thing worth watching.",
        ],
        palette: [
            { name: "Copper", hex: "#B45309" },
            { name: "Copper light", hex: "#D97706" },
            { name: "Ink", hex: "#1C1917" },
            { name: "Warm ink", hex: "#292524" },
            { name: "Cream", hex: "#FBF7F0" },
            { name: "Cream dark", hex: "#F0E8DB" },
            { name: "Olive", hex: "#4D7C0F" },
            { name: "Success", hex: "#16A34A" },
        ],
        typeNote:
            "Cormorant Garamond — an optical serif — carries headlines, dish names and status labels for an evening-service register; Josefin Sans keeps menus, forms and the tracking timeline crisp. Pages sit on warm cream, heroes on dark photography, and colour does exactly one job: copper marks the action — Add, Checkout, Send request, the active filter, the current kitchen stage — and nothing else.",
        components: ["Menu row with dietary badges", "Course & dietary filter pills", "Dish customisation sheet", "Bag drawer", "Fulfilment pill pair", "Special-order request", "Order-status timeline", "Awaiting-payment state", "Concierge launcher with human takeover"],
    },
    {
        slug: "wamwam",
        name: "WamWam",
        kicker: "Experiences booking · Product Design",
        tagline: "Find, compare and book a guide-led experience — with a trip assistant a tap away.",
        summary:
            "WamWam is Phoxta's experiences blueprint: a storefront for guide-led activities where travellers search by place, dates and guests, compare listings on one card anatomy and book from the detail page without an account. One deployment serves every buyer, each store rebranded through data rather than a fork. The engagement covered the scope decision, the search, listing and booking journey, the responsive system around it and the per-tenant branding layer.",
        hero: "/assets/imgs/portfolio/wamwam.webp",
        heroAlt: "WamWam experiences homepage",
        accent: "#2F7BF5",
        meta: [
            { label: "Role", value: "Lead Product Designer" },
            { label: "Timeline", value: "2026" },
            { label: "Scope", value: "23 routes · 15 page modules · 7 layouts" },
            { label: "Tools", value: "Figma · React · TypeScript · Supabase" },
        ],
        tags: ["Travel", "Bookings", "Marketplace", "AI", "Responsive"],
        prototypeUrl: "https://demo.wamwam.phoxta.com",
        prototypeLabel: "Visit the live site",
        processTitle: "From “where to?” to a confirmed booking.",
        challenge:
            "Experience marketplaces are dense: dozens of filters, cards that all look alike and a booking step buried below the fold. Travellers arrive with three things in mind — where, when and how many — so the brief was to make those three the entire interface, keep listings comparable at a glance, and make booking on the detail page feel as light as saving to a wishlist.",
        before:
            "The predecessor was a four-vertical Next.js travel template — stays, flights, cars and experiences sharing one set of pages — whose listing sidebars declared a booking form that was never invoked on any of them.",
        constraint:
            "One deployment serves every buyer. Brand name, wordmark, favicon, catalogue, content and even the assistant's agent key arrive at runtime from the tenant record resolved by hostname, so no layout may assume its own name, its own colour, or how many listings it will be handed.",
        atAGlance: {
            problem:
                "Experience marketplaces bury the three things a traveller arrives with — where, when, how many — under dozens of filters and cards that all look alike, then put the booking two screens below the decision.",
            move:
                "Ship one vertical rather than four: stays, cars and flights were ported and then deliberately kept out of the route manifest, so every URL the store serves is one a traveller booking an experience actually needs.",
        },
        definitionOfDone:
            "A booking is done when a traveller who never signed in holds a reference, the operator holds a pending reservation in the console, and that reference plus the booking email brings the whole booking back on any device.",
        evidenceNote:
            "No user research was run on this engagement. The questions below are the assumptions the design was built on; the standards beside them are the ones it was held to.",
        subjects: [
            {
                label: "A traveller with three facts and no plan",
                context:
                    "Arrives on a phone knowing a place, a rough week and a number of people, and nothing else — usually between other things, usually with other tabs open.",
                judges: "Can I get from the search bar to a booking reference without opening a second tab or making a phone call?",
            },
            {
                label: "The buyer who owns this store",
                context:
                    "Bought the blueprint, has a logo, a handful of experiences and no engineer; never sees the code and never deploys anything.",
                judges: "Does it look like my business, and does a booking actually reach me?",
            },
        ],
        phaseNote:
            "Discover, Learn, Buy, Get help and Use are the phases this storefront genuinely has. There is no Try — an experience is not something you sample — and no Expand: the blueprint is bought once from the Phoxta marketplace, and everything after the booking lands in the operator's console rather than on the storefront.",
        goals: [
            { title: "Three inputs, then results", body: "Location, dates and guests as one pill — the search is the hero, and everything else waits until it is answered." },
            { title: "Cards you can compare", body: "Price per guest, duration, group size and rating in the same place on every card, so choosing is a scan rather than a study." },
            { title: "Book without leaving the page", body: "A booking card that stays in reach beside the gallery — date, guests, name, email — and a request that lands with the host." },
            { title: "Help on every screen", body: "An “Ask us” trip assistant available everywhere, grounded in the listings, so questions never dead-end." },
        ],
        bar: [
            {
                metric: "Steps from choosing to a booking reference",
                definition: "Screens between opening an experience and holding a reference.",
                value: "One — the detail page",
                provenance: "in-build",
                check: "Open any experience on demo.wamwam.phoxta.com and use the box beside the gallery",
            },
            {
                metric: "Routes shipped",
                definition: "Every URL the storefront serves, declared in one manifest.",
                value: "23 routes over 15 page modules and 7 layouts",
                provenance: "in-repo",
                check: "businesses/wamwam/src/routes/route-manifest.ts",
            },
            {
                metric: "Indexable URLs",
                definition: "Routes flagged for the sitemap — public, indexable, parameter-free.",
                value: "6 of the 23",
                provenance: "in-repo",
                check: "SITEMAP_PATHS in the manifest; scripts/gen-sitemap.mjs writes public/sitemap.xml at build",
            },
            {
                metric: "Facts every experience card carries",
                definition: "Slots each card fills in the same order, whatever the tenant supplied.",
                value: "Six — badge, title, meeting point, chips, price per guest, rating",
                provenance: "in-build",
                check: "src/components/cards/experiences-card.tsx, and any results grid on the live site",
            },
            {
                metric: "Payment confirmation lag",
                definition: "How often the page re-checks the server before it will call a booking paid.",
                value: "Every 3 seconds, for up to 2 minutes",
                provenance: "in-repo",
                check: "POLL_EVERY_MS and POLL_FOR_MS in src/hooks/use-reservation-payment.ts",
            },
            {
                metric: "Brand names the header must survive",
                definition: "Tenant names the wordmark has to hold inside its 96 × 35 box.",
                value: "Designed to hold any of them, before the webfont loads",
                provenance: "target",
            },
        ],
        process: [
            {
                phase: "Scope & the route manifest",
                body:
                    "Before any screen, every URL the store would ever serve was written into a single manifest — path, page module, layout, and whether it belongs in the sitemap — and only the experiences vertical was routed.",
                changed:
                    "It cut the site from four verticals to one, and became the source the router, the sitemap generator and the parity harness all read, so a URL cannot exist without being declared.",
            },
            {
                phase: "Port & parity gate",
                body:
                    "The app was rebuilt from Next.js onto Vite behind a harness that extracts every class string and every line of rendered copy from both trees and fails the build on any difference it cannot account for.",
                changed:
                    "It forced every visible difference to be written down: seven sanctioned changes, a catalogue of dead style variants the component library never emitted, and one genuinely new element — the contact form's failure message.",
            },
            {
                phase: "The booking path",
                body:
                    "Search pill, card anatomy, detail page, reserve box, the three payment states and the guest lookup were designed as one path and built against Phoxta's shared reservations model, where pricing and availability are enforced server-side.",
                changed:
                    "The predecessor's booking sidebar turned out to be dead code — declared on the stay, car and experience detail pages and invoked on none of them — so the box was designed from the reservation the console actually accepts rather than from inherited markup.",
            },
            {
                phase: "Tenancy & hardening",
                body:
                    "Brand, catalogue, content and the assistant's agent key were all made runtime tenant data resolved from the hostname, behind one single-flight lookup, with the bundled demo catalogue as the fallback when no tenant resolves.",
                changed:
                    "Four independent boot-time round trips collapsed into one shared promise, and only a successful resolve is cached — caching a failure would have left the assistant keyless for the whole session and swapped every reply for the fallback string.",
            },
        ],
        decisions: [
            {
                moment: "First search typed without reading the page",
                phase: "Discover",
                subject: "the traveller with three facts and no plan",
                question: "Where do I start, and what do I type?",
                title: "Three inputs, then the world",
                body:
                    "The homepage is a search pill on a sky — location, a date range, guests — with nothing competing for the same attention. On a phone it collapses to a single summary bar reading “Where to?”, “Any week”, “Add guests”, which opens a full-screen dialog with its own Clear all; the bottom bar keeps Home, Wishlists, Account and Menu in thumb reach underneath.",
                instead:
                    "The pattern every large marketplace opens with is a filter rail beside the hero. It asks a traveller to narrow before they have named anything, so all narrowing was moved to the results page and the front door was left with the three inputs a traveller already has in their head.",
                cost:
                    "Only the location is carried into the results URL. Dates and guests are collected in the pill and do not yet reach the grid — the search sets the intent, not the result set.",
                touchpoints: [
                    "Search pill (location · dates · guests)",
                    "Mobile summary bar and full-screen search dialog",
                    "Filter chips on the results page",
                    "Bottom bar — Home, Wishlists, Account, Menu",
                ],
                bar: [
                    {
                        metric: "Inputs before a first result",
                        definition: "Fields between landing and a results grid.",
                        value: "Three, in one control",
                        provenance: "in-build",
                        check: "The hero on demo.wamwam.phoxta.com",
                    },
                ],
                image: "/assets/imgs/portfolio/wamwam.webp",
                imageAlt: "WamWam homepage search",
            },
            {
                moment: "Choosing between two experiences without opening either",
                phase: "Learn",
                subject: "the traveller, eight tabs deep",
                question: "Which of these is worth my afternoon?",
                title: "Cards you can compare at a glance",
                body:
                    "Every card carries the same six facts in the same places — badge, title, meeting point, chips for duration and group size, then price per guest and rating — and the whole card is the link, so the heading and the price stay plain markup. Shelves such as “Experiences in Osaka” scroll sideways behind paired arrows, and imagery ships as 133 pre-sized WebP files at five widths so a card never downloads a hero-sized file.",
                instead:
                    "The straightforward option was to render whatever the tenant's product record happened to contain. Every live listing is instead mapped onto a template of the same vertical by position, so the meeting point, the chips and the gallery are present even when the record omits them — a ragged grid makes two cards impossible to compare, which is the one job a card has.",
                cost:
                    "A card can therefore show a detail that came from the template rather than from the business, which makes the seeding step matter more than it looks and puts a burden on the console rather than on the shopper.",
                touchpoints: [
                    "Experience card",
                    "Amenity chips with an icon fallback for unknown keys",
                    "Whole-card overlay link",
                    "Sideways shelves with paired arrows",
                    "Pre-sized WebP at 500–1600px",
                ],
                bar: [
                    {
                        metric: "Catalogue image variants shipped",
                        definition: "Pre-sized files so a card never pulls a hero-sized image.",
                        value: "133 WebP files at five widths",
                        provenance: "in-repo",
                        check: "businesses/wamwam/public/images/catalog/",
                    },
                ],
                image: "/assets/imgs/portfolio/wamwam-shelf.webp",
                imageAlt: "WamWam experience cards shelf",
            },
            {
                title: "Inspiration as a front door",
                body:
                    "City cards — Mexico City, Ljubljana, Baceno, Wellington — open straight into a category page that behaves exactly like search results, so a traveller who cannot yet name what they want has a way in and the operator has landing pages to point campaigns at. The counts on the cards come from the seeded category data rather than from a live query.",
                touchpoints: ["Destination cards", "/experience-categories", "Category page reusing the results grid"],
                image: "/assets/imgs/portfolio/wamwam-inspiration.webp",
                imageAlt: "WamWam destination inspiration cards",
            },
            {
                moment: "First booking placed without a phone call or an account",
                phase: "Buy",
                subject: "a traveller who has decided",
                question: "Can I just book it now, from here?",
                title: "A listing page that books itself",
                body:
                    "A four-photo gallery leads, then title, place, rating and a verified host; the booking box sits beside the content — date, guests, name, email — and never leaves the page. Pricing and availability are enforced server-side by the shared reservations model, and the booking lands in the owner's console as pending. Without a resolved tenant the box simulates a confirmation instead, so the demo never breaks.",
                instead:
                    "A cart and a multi-step checkout. The ported template's checkout screen is still routed and has no payment behind it — one experience on one date has nothing to put in a basket, so the booking path bypasses it entirely and the decision and the action stay on one screen.",
                cost:
                    "Anything a basket would have given — booking two experiences in one transaction, or holding a choice while browsing on — is not available, and the wishlist has to carry that job on its own.",
                touchpoints: [
                    "Reserve box beside the gallery",
                    "Date, guests, name, email fields",
                    "Server-enforced pricing and availability",
                    "Pending reservation in the operator's console",
                ],
            },
            {
                moment: "The moment after paying, before anything is confirmed",
                phase: "Buy",
                subject: "a traveller who has just closed a payment window",
                question: "Did that actually go through?",
                title: "No thank-you until the money lands",
                body:
                    "The booking box has three distinct end states, not one: reserved and awaiting payment, with the amount due and a Pay now button; payment received, with the reference and a link into the booking; and, where the business has no payments configured, a plain “booking requested, we'll confirm by email”. The screen will not say thank you until the server says paid.",
                instead:
                    "Trusting the payment popup's success callback, which is what the widget makes easiest. It never fires for a closed tab, a blocked script or the hosted-page fallback, so the traveller would be shown a confirmation the server never agreed to — or nothing at all. Confirmation is polled from the guest lookup instead, because the webhook the browser never sees is what actually marks the booking paid.",
                cost:
                    "Confirmation can take up to two minutes of quiet polling. After that the screen stops waiting and hands the traveller the booking lookup rather than an indefinite spinner — honest, but slower than a callback would have felt.",
                touchpoints: [
                    "“Complete your payment” state with amount due",
                    "Paystack popup with a hosted-page fallback",
                    "Poll-expired message linking to Manage booking",
                    "Payment return link carrying reference and email",
                ],
                bar: [
                    {
                        metric: "Payment confirmation lag",
                        definition: "How often the page re-checks the server before it calls a booking paid.",
                        value: "Every 3 seconds, for up to 2 minutes",
                        provenance: "in-repo",
                        check: "src/hooks/use-reservation-payment.ts",
                    },
                    {
                        metric: "End states the booking box handles",
                        definition: "Distinct screens after the form is submitted.",
                        value: "Three — awaiting payment, paid, pay later",
                        provenance: "in-repo",
                        check: "src/components/listing/reserve-box.tsx",
                    },
                ],
            },
            {
                moment: "First question the listing cannot answer",
                phase: "Get help",
                subject: "a traveller with a question and no phone number",
                question: "Is there anyone here who actually knows?",
                title: "Help that can end with a person",
                body:
                    "“Ask us” opens a trip assistant addressed to this tenant's own agent, and the conversation becomes a real thread in the business's console inbox — so the owner can read it, take it over and answer as themselves, with the widget switching to polling for their replies. The conversation id, cursor and thread token are held in session storage so moving around the site does not orphan a live human conversation, and when the backend is unreachable the widget answers with a short local reply rather than nothing. The launcher carries aria-expanded and aria-controls, the panel is a labelled dialog, and the transcript is a polite live region so replies are announced.",
                instead:
                    "A build-time agent key, which is how a single-tenant widget is normally wired. One deployment serves every buyer, so a build-time key would route every store's conversations into whichever business owned the build; the key is resolved from the hostname at runtime instead.",
                cost:
                    "The widget keeps a set of class names this app's stylesheet does not define, purely so a tenant's brand sheet has something to target — dead classes carried on purpose. The launcher also had to be repositioned after it was found covering the mobile bottom bar's Menu button.",
                touchpoints: [
                    "“Ask us” launcher",
                    "Assistant panel as a labelled dialog",
                    "Polite live transcript",
                    "Human takeover polled from the console inbox",
                    "Local fallback reply when the backend is unreachable",
                ],
            },
            {
                moment: "First return, days later, with only an email",
                phase: "Use",
                subject: "the traveller, four days on, on a different device",
                question: "What did I book, and is it still on?",
                title: "A booking you can find again",
                body:
                    "Manage booking takes a reference and the email it was booked with and returns the experience, the guest name, the dates, the number of guests, the total and a status — pending, confirmed, completed or cancelled. The link the payment screen hands over prefills both and runs the lookup on mount, so a traveller coming back from payment lands on their booking rather than on an empty form.",
                instead:
                    "An account. Requiring a sign-in to see a booking adds a password to a transaction that only ever needed an email — sign-in and create-account pages exist for people who want them, but the reference plus the booking email is the key, and nothing in the booking path asks anyone to register.",
                cost:
                    "The screen reads a booking and cannot alter one: changes and cancellations are routed to the confirmation email or the contact page, which puts that work back on the operator rather than on the traveller.",
                touchpoints: [
                    "/manage-booking lookup form",
                    "Prefilled lookup from the payment return",
                    "Status labels — pending, confirmed, completed, cancelled",
                    "“No booking found with that reference and email”",
                ],
            },
        ],
        notDesigned: [
            {
                title: "Three of the four verticals",
                body:
                    "Stays, cars and flights were ported in full and then left out of the route manifest, which says so in a comment. A marketplace advertising four things it cannot yet operate is worse than one that does a single thing properly — and the code stays ready for the day a tenant sells rooms.",
            },
            {
                title: "A new visual design",
                body:
                    "The presentation layer was deliberately not redrawn. The rewrite ran behind a parity gate that compares every class string and every line of copy against the predecessor app and fails the build on anything unexplained; seven visible changes were sanctioned and written down. The work here is scope, architecture and the booking path, not a fresh coat of paint.",
            },
            {
                title: "Self-service change and cancel",
                body:
                    "Manage booking reads a booking; it will not alter one. A cancellation touches money, availability and the operator's day, so it belongs in the console the owner already works in — the storefront routes amendments to the confirmation email or the contact page and says so plainly.",
            },
            {
                title: "An account you have to create",
                body:
                    "Nothing in the booking path requires a sign-up. Sign-in, create-account and password pages exist for people who want them — each on its own route so the two modes cannot leak into one another — but search, book, pay and look-it-up-again all run on a name, an email and a reference.",
            },
        ],
        constraints: [
            "One deployment serves every buyer, so no layout may depend on the tenant's name, colour or catalogue size.",
            "The brand name is configurable and the webfont loads late, so the wordmark pins its own width to the logo box rather than trusting font metrics.",
            "Payment is confirmed by a webhook the browser never sees, so the page had to converge on the server's answer rather than the payment widget's.",
            "There is no analytics on this storefront, so every bar had to be checkable by opening the repository or the live site.",
            "The rewrite had to clear a parity gate: any visible change needs a written reason or the build fails.",
        ],
        unknowns: [
            "The search pill has never been watched in a session. The first test is whether a traveller expects the dates and guests they typed to narrow the grid — today only the location reaches the results URL, and the results page does not filter at all.",
            "The three-state payment screen has only ever been exercised by its builder. The case worth watching is the traveller who closes the payment window and comes back: does the poll-expired message read as a way through or as a dead end?",
            "Nobody has been asked whether “Ask us” reads as a person or a bot, or whether the handover to a real person is noticed when it happens.",
            "Any test of card comparison has to run on a seeded tenant, not on the demo: the bundled fallback catalogue is eight listings whose copy is verbatim from the original template, which is why a title reads “Generate interactive markets”.",
            "The ported checkout and confirmation screens are still routed with no payment behind them and nothing in the booking path links to them — either they earn a job or they leave the manifest.",
        ],
        palette: [
            { name: "Ink", hex: "#0A0A0A" },
            { name: "Primary", hex: "#262626" },
            { name: "Paper", hex: "#FFFFFF", ink: true },
            { name: "Surface", hex: "#F5F5F5", ink: true },
            { name: "Line", hex: "#E5E7EB", ink: true },
            { name: "Muted", hex: "#6B7280" },
        ],
        typeNote:
            "Inter as a variable sans from 300 to 700 runs everything, with Playfair Display in italic as the single serif accent — one word per headline and no more. The system is deliberately achromatic: every colour token ships at zero chroma, so the primary action is ink on paper and the photography in the cards is the only saturated thing on the page. That is also what makes the store rebrandable — a tenant's palette is applied over a neutral system rather than fighting a house colour.",
        components: ["Search pill (location · dates · guests)", "Filter chips with counts", "Experience card", "Photo gallery", "Booking card", "Host badge", "Wishlist heart", "Bottom tab bar"],
    },
    {
        slug: "aurelia",
        name: "Aurelia",
        kicker: "Fashion e-commerce · Product Design",
        tagline: "A considered fashion store with an AI stylist — on a backend shared with every other Phoxta business.",
        summary:
            "Aurelia is Phoxta's flagship fashion blueprint: an editorial storefront with a filterable collection, product pages with size and colour variants, a bag drawer, checkout, order tracking and an AI stylist. It is a genuinely multi-tenant store — each buyer's copy resolves by hostname, seeds its own catalogue and applies its own branding — and products and orders flow straight into the operating console. The engagement covered the storefront end to end, from campaign hero to order confirmation.",
        hero: "/assets/imgs/portfolio/aurelia.webp",
        heroAlt: "Aurelia fashion storefront — homepage",
        accent: "#85ACD6",
        meta: [
            { label: "Role", value: "Lead Product Designer" },
            { label: "Timeline", value: "2026" },
            { label: "Scope", value: "8 screens over 11 routes — home, shop, product, checkout, track order, about, contact, account" },
            { label: "Tools", value: "Figma · React · TypeScript · Supabase" },
        ],
        tags: ["Fashion", "E-commerce", "Multi-tenant", "AI", "Responsive"],
        prototypeUrl: "https://aurelia-demo.aurelia.phoxta.com",
        prototypeLabel: "Visit the live site",
        processTitle: "From lookbook to checkout, one calm system.",
        challenge:
            "Fashion e-commerce lives on imagery and dies on friction. The store had to read as a campaign rather than a template, hold its composure with any catalogue — it is cloned for many buyers, each with different products — and help a shopper choose without upstaging the merchandise. The brief: editorial first, no dead ends from hero to order confirmation, and an AI stylist that behaves like a service rather than a widget.",
        atAGlance: {
            problem:
                "A fashion store lives on its photography and dies on friction — and this one is cloned for every buyer, so it has to hold its composure with a catalogue, a brand and an AI agent it will not meet until it boots.",
            move:
                "Tell the buyer the true state at every step — the exact stock, the order that is reserved rather than paid, the moment a person takes over the chat — and ask for no account in return.",
        },
        before:
            "The alternative on offer to a first-time fashion owner was a theme on a site builder: an empty catalogue to fill, a checkout to wire up and the AI layer to design themselves.",
        constraint:
            "One deployment is cloned for every buyer. The catalogue, the brand, the colours, the fonts and the AI agent all arrive at runtime from the hostname, so no screen may assume Aurelia's own twelve pieces — and every field a tenant leaves empty has to degrade into something that still looks like a shop.",
        definitionOfDone:
            "The store is done when a stranger who arrived from a campaign link can choose a size, pay and find that order again a week later without an account — and when the same build, pointed at another tenant's data, still reads as a shop rather than a template.",
        evidenceNote:
            "No user research was run on this engagement. The questions below are the assumptions the design was built on; the standards beside them are the ones it was held to.",
        phaseNote:
            "Discover, Learn, Buy, Use and Get help are the phases this store owns. There is no Try — a garment has no trial — and no Expand or End use: after the order, the relationship continues in the owner's console and inbox, not here. Onboard belongs to the owner buying the blueprint, which is Phoxta's study rather than Aurelia's.",
        subjects: [
            {
                label: "A first-time visitor who has never heard of the brand",
                context:
                    "Arrives on a shared campaign link, on a phone, with no account and no intention of making one.",
                judges: "Could I buy this — and find it again afterwards — without signing up for anything?",
            },
            {
                label: "The owner who bought the blueprint",
                context:
                    "Opens their own copy on day one: a different name, a different palette, their own products, none of Aurelia's.",
                judges: "Does it still look like a shop, or like a template with my logo on it?",
            },
        ],
        goals: [
            { title: "Editorial first", body: "A hero and collection that read like a lookbook — big photography, quiet type, one accent." },
            { title: "Any catalogue, same store", body: "Cards, filters and product pages that stay composed whether a tenant sells twelve pieces or twelve hundred." },
            { title: "A product page that answers everything", body: "Sizes, colours, stock, shipping, returns, reviews and the stylist — in one scroll, with the buy action always visible." },
            { title: "Help choosing, on demand", body: "An AI stylist grounded in the tenant's own catalogue, one tap away on every page and silent until asked." },
        ],
        bar: [
            { metric: "Steps from bag to confirmation", definition: "Screens between opening the bag and the confirmed order: drawer, checkout, confirmation.", value: "3", provenance: "in-build", check: "the cart drawer and /checkout on the live store" },
            { metric: "Sign-in walls before buying", definition: "Points where a buyer must create an account to continue. Checkout takes a name, an email and an address; tracking takes the reference and the same email.", value: "none", provenance: "in-build", check: "/checkout and /track-order on the live store" },
            { metric: "Payments confirmed from the browser", definition: "Times the page calls an order paid on a popup callback rather than on the server's own record.", value: "none — it polls the order every 3 seconds for up to two minutes", provenance: "in-build", check: "src/pages/CheckoutPage.tsx" },
            { metric: "States the checkout renders", definition: "Empty bag, form, submitting, error, awaiting payment, order confirmed, payment received.", value: "7", provenance: "in-build", check: "src/pages/CheckoutPage.tsx" },
            { metric: "Fallbacks that keep a tenant's store rendering", definition: "Places where missing tenant data degrades to a working default instead of an empty screen: catalogue, product fields, variant stock, colour swatch, assistant.", value: "5", provenance: "in-repo", check: "src/util/catalog.tsx, product-details/Section1Interactive.tsx, src/components/AIStylist.tsx" },
            { metric: "Composure at any catalogue size", definition: "Designed so no page rule is keyed to how many products a tenant sells — one responsive grid, five filters, one sort, and a count that reads honestly at 12 or at 1,200.", value: "no layout rule depends on the catalogue", provenance: "target" },
        ],
        process: [
            {
                phase: "Brand & tokens",
                body: "Type and tokens were fixed before any page — near-white paper, soft stone panels and dark ink for every action — a palette that steps back so product photography carries the store, and one that tenants can swap through branding data.",
                changed: "The store gave up its own type stack and took the platform's — one family, DM Sans, on near-monochrome neutrals — so that when a tenant's brand fonts arrive at runtime they have one family to displace rather than two.",
            },
            {
                phase: "Journeys & IA",
                body: "Discover → browse → decide → buy → track was mapped into home, shop, product, checkout, track-order, about, contact and account, with Women / Men / New In / Sale as the only top-level filters.",
                changed: "The map killed the cart page: with a drawer, a checkout and a confirmation there was nothing left for a /cart route to do, and it was never built.",
            },
            {
                phase: "Interaction & build",
                body: "The campaign hero, the collection with category pills and sort, the product page with variants, stock badges and quantity, the bag-to-checkout flow, order tracking and the stylist launcher were built as a working React storefront.",
                changed: "Building against a real payment popup exposed its callback as something that cannot be trusted, and moved the truth server-side — the page now believes only the order record.",
            },
            {
                phase: "Multi-tenancy",
                body: "Every copy resolves by hostname, auto-seeds its own catalogue on first visit and applies the owner's logo, palette and type at resolve time; products and orders sync to the Phoxta console, so the store and the business are one system.",
                changed: "Every assumption about the catalogue became a default — colours, sizes, image, brand and stock each acquired a fallback — and the faceted filter sidebar was abandoned for good, since no tenant can be relied on to have populated the facets.",
            },
        ],
        decisions: [
            {
                moment: "First landing from a shared campaign link",
                phase: "Discover",
                subject: "a first-time visitor who has never heard of the brand",
                question: "Whose shop is this, and what do they sell?",
                title: "A hero that behaves like a campaign",
                body:
                    "One frame: the season, a two-line headline, a single promise that names the stylist, and two actions that both lead into the collection. Nothing moves, nothing waits, and the accent stays out of the picture until there is something to click. Below it, three category doors and eight new arrivals — so a product page is one tap from landing.",
                instead:
                    "A rotating campaign carousel, the default answer for a fashion homepage. It was rejected because every extra slide is another campaign image each cloned store has to supply, and a promise that moves before it has been read is not a promise.",
                cost:
                    "One frame means one story: a tenant running two campaigns at once has to choose which of them the home page is for.",
                touchpoints: ["Season eyebrow", "Headline and promise line", "Two hero actions", "Three category doors", "New Arrivals row", "Two editorial promo panels"],
                bar: [
                    { metric: "Taps from landing to a product page", definition: "New Arrivals sits on the home page, so a product is reachable without navigating.", value: "1", provenance: "in-build", check: "the New Arrivals grid on the live home page" },
                ],
                image: "/assets/imgs/portfolio/aurelia.webp",
                imageAlt: "Aurelia campaign hero",
            },
            {
                moment: "Narrowing without learning a filter system",
                phase: "Discover",
                subject: "the same visitor, now looking for their own half of the shop",
                question: "Where are the ones for me?",
                title: "Five pills, one sort, and a count that tells the truth",
                body:
                    "The collection offers All, Women, Men, New In and Sale as buttons, one sort control and a line saying how many products are in view — then gets out of the way. Category lives in the URL, so a filtered collection is a link a shopper can share or return to, and an empty category says so in plain words rather than showing an empty grid.",
                instead:
                    "A faceted filter sidebar — size, colour, price, fabric — which is what a fashion store is expected to have. It was rejected because the store is cloned for tenants whose product rows may carry none of those fields, and a sidebar of empty facets reads as a broken shop.",
                cost:
                    "A tenant with several hundred pieces has only five pills, a sort and search to work with. Past that size the filter set has to become tenant-configurable, and this design has no answer for it yet.",
                touchpoints: ["Category pills", "Sort control", "Product count line", "New and Sale badges", "Empty-category message", "Search results title"],
                bar: [
                    { metric: "Controls a first-time visitor has to learn", definition: "Every filtering affordance on the collection page.", value: "5 pills and one sort", provenance: "in-build", check: "/shop on the live store" },
                ],
                image: "/assets/imgs/portfolio/aurelia-shop.webp",
                imageAlt: "Aurelia shop collection with category pills",
            },
            {
                moment: "The size decision, taken without trying it on",
                phase: "Learn",
                subject: "a shopper choosing between two sizes",
                question: "Will it fit, and is it actually there?",
                title: "A product page that answers before it sells",
                body:
                    "Six images on the left. On the right the stock badge comes first — an exact count where the tenant keeps variant stock, a plain “In Stock” where they do not — then size and colour, where sizes that cannot be had are struck through and disabled and colours that cannot be had are dimmed and labelled. Quantity, Add to cart and Buy it now sit above the fold; description, specification and reviews are tabs below, so detail is available without pushing the decision down the page.",
                instead:
                    "Hiding stock until checkout, the usual way to avoid losing a sale. It was rejected because the disappointment does not disappear — it moves to the last screen, where it costs the buyer more and the owner a refund.",
                cost:
                    "An exact count reads as pressure selling on a slow-moving catalogue, so it appears only where a tenant genuinely tracks variant stock and degrades to a plain in-stock badge everywhere else.",
                touchpoints: ["Stock badge", "Size buttons with unavailable state", "Colour swatches with out-of-stock labelling", "Quantity stepper", "Add to cart", "Buy it now", "Description / specification / reviews tabs", "Review form"],
                bar: [
                    { metric: "States a size or colour option can be in", definition: "Available, selected, unavailable — each with a visible treatment, not colour alone.", value: "3", provenance: "in-build", check: "product-details/Section1Interactive.tsx" },
                    { metric: "Fit answered before a scroll", definition: "Designed so stock, size and colour are all on the first screen of the product page.", value: "no scroll", provenance: "target" },
                ],
                image: "/assets/imgs/portfolio/aurelia-product.webp",
                imageAlt: "Aurelia product page with variants",
            },
            {
                moment: "First payment the page refuses to lie about",
                phase: "Buy",
                subject: "a buyer who has just closed the payment window",
                question: "Did that actually go through?",
                title: "Reserved is not paid",
                body:
                    "The order is written first and shown as reserved, with its reference and the amount due. The page then asks the server about that order every three seconds for up to two minutes, and only says “Payment received” when the record does. A cancelled window leaves the buyer on the same screen with Pay Now; if two minutes pass, a line explains where to look next instead of spinning forever.",
                instead:
                    "Trusting the payment popup's own success callback — the shortest path, and the one that tells a buyer their money arrived before anything server-side has seen it.",
                cost:
                    "A buyer who pays instantly can still wait a poll cycle to be told so. The honest state costs up to three seconds of doubt at the worst possible moment.",
                touchpoints: ["Reserved-order screen", "Amount due", "Pay Now", "Automatic re-open of the payment window", "Two-minute explanation", "Order reference", "Track Order link with the reference pre-filled"],
                bar: [
                    { metric: "Payment states taken on trust from the browser", definition: "Confirmations shown without the server's order record agreeing.", value: "none", provenance: "in-build", check: "the polling block in src/pages/CheckoutPage.tsx" },
                ],
            },
            {
                moment: "First question the product page cannot answer",
                phase: "Get help",
                subject: "a shopper hesitating between two sizes, late",
                question: "Can someone just tell me which one?",
                title: "A stylist that knows when to stop talking",
                body:
                    "The stylist is addressed to this tenant's own agent, so every cloned store answers as its own business. It opens as a corner panel with four starter questions and replies with product cards that link straight through. When the owner takes the thread over from their console, the panel says a team member has joined and the assistant goes quiet rather than talking over them — and the thread survives a page change, so a live conversation is never orphaned by navigation.",
                instead:
                    "A greeting bubble that opens itself on arrival, and a canned reply while the owner is typing. Both were rejected: the launcher stays silent until it is tapped, and an empty reply from a human-held thread is left empty.",
                cost:
                    "A launcher that never interrupts is a launcher plenty of shoppers never notice; the store trades reach for not talking over its own photography.",
                touchpoints: ["Corner launcher", "Four starter questions", "Product cards in chat", "“A team member has joined the chat…” notice", "Thread resumed across navigation", "Built-in replies when the backend is unreachable"],
                bar: [
                    { metric: "Pages the assistant is reachable from", definition: "It is mounted outside the router, with the bag and the account button, so navigation never unmounts it.", value: "every page", provenance: "in-build", check: "businesses/niche-apparel/src/App.tsx" },
                ],
            },
            {
                moment: "The same store, one-handed",
                phase: "Use",
                subject: "the first-time visitor again, on the phone the link arrived on",
                question: "Can I get through this standing up?",
                title: "One column, because the photography is the argument",
                body:
                    "The hero keeps its frame and both actions on a small screen; the collection stacks to a single column so each piece stays large; the bag arrives as a drawer covering almost the full width with the subtotal and Checkout pinned to the bottom edge. The buy actions on a product page stay within a thumb's reach of the variant choice they depend on.",
                instead:
                    "A two-column phone grid — twice the products per screen at half the size, in a store whose entire argument is the photography.",
                cost:
                    "One column means more scrolling to see the same collection, which puts more weight on the sort control and the product count than either was designed to carry.",
                touchpoints: ["Reflowed hero", "Single-column collection", "Full-height bag drawer with pinned subtotal", "Stacked gallery and variant column", "Two floating launchers kept to opposite corners"],
                image: "/assets/imgs/portfolio/aurelia-mobile.webp",
                imageAlt: "Aurelia on mobile",
                wide: true,
            },
        ],
        notDesigned: [
            {
                title: "A cart page",
                body:
                    "There is no /cart route. The bag is a drawer that opens on the add, carries quantity, removal and the subtotal, and hands straight to checkout — a page would have added a navigation step between deciding and paying and shown nothing new.",
            },
            {
                title: "A wishlist",
                body:
                    "Saving for later only pays off with returning-customer campaigns behind it, which belong to the owner's console rather than the shop. The bag persists in the browser instead, which covers the same “come back tomorrow” case without adding a screen or an account.",
            },
            {
                title: "An account gate",
                body:
                    "Accounts exist — order history, bookings, contact details — but nothing requires one: checkout is a guest form and tracking works from the reference plus the email used. The account lives in a floating button rather than the header, because each storefront runs a different header variant chosen at runtime and editing them would risk layouts for no gain.",
            },
            {
                title: "A size chart and a delivery date",
                body:
                    "Both are per-tenant facts a cloned store cannot know. A blueprint that shipped a size chart would be publishing somebody else's measurements, and a promised delivery date would be a commitment made on an owner's behalf, so the page states what it can — shipping calculated at checkout, free over the threshold, returns window — and no more.",
            },
        ],
        constraints: [
            "One deployment serves every tenant: catalogue, brand, colours, fonts and AI agent all resolve at runtime from the hostname.",
            "A tenant's product rows can arrive with no colours, no sizes, no image and no brand — each has a default in the mapper, because the alternative is a broken shop on somebody's launch day.",
            "The theme surface an owner can change is seven values — four colours, two fonts, one radius — so the layout had to be right without any of them.",
            "This storefront has no analytics, so every bar had to be something a stranger can check by opening the site or the repository.",
        ],
        unknowns: [
            "The bag has never been watched in a usability session. The first test would be a shopper adding from the collection grid, where the card silently chooses the first size and colour — the fastest add in the store and the one most likely to be wrong.",
            "The awaiting-payment screen is the riskiest surface in the flow: it needs a buyer who closes the window by accident, and one on a connection slow enough for the two-minute message to appear.",
            "Nothing is known about how a shopper reads an assistant labelled “AI Stylist”. The label may be doing more deterring than the panel behind it does helping.",
            "The store has only been exercised with twelve pieces. A tenant with several hundred would test the claim that five pills and one sort are enough — the first place this design should be expected to fail.",
        ],
        palette: [
            { name: "Ink", hex: "#1D1D1D" },
            { name: "Deep ink", hex: "#0F0F0F" },
            { name: "Paper", hex: "#FEFEFE", ink: true },
            { name: "Stone", hex: "#F2F2F2", ink: true },
            { name: "Line", hex: "#DFDFDF", ink: true },
            { name: "Muted", hex: "#585959" },
        ],
        typeNote:
            "One family carries the whole store: DM Sans, set tight and large for the campaign headline and quietly everywhere else, so headline and receipt come from the same voice. The palette is deliberately near-monochrome — near-white paper, stone panels, hairline rules, dark ink for every action — which leaves the photography as the only vivid thing on the page and leaves room for a tenant's own colours to arrive without a fight: an owner's brand can override four colours, two fonts and the corner radius, and nothing else.",
        components: ["Campaign hero", "Category pills & sort", "Product card with badges", "Gallery grid", "Variant selector", "Bag drawer & checkout", "Order tracking", "AI stylist launcher"],
    },
    {
        slug: "technest",
        name: "TechNest",
        kicker: "Fintech brand identity · Brand Design",
        tagline: "A brand system for a payments company — one mark, one geometry, every surface.",
        summary:
            "TechNest is a payments technology company positioned around one line: finance technology, explore the future. The engagement delivered its visual identity end to end — a constructed logo mark and wordmark with a full set of lockups, a two-colour palette with tint ramps, a three-typeface hierarchy for print and web, a family of three geometric patterns, an icon and polygon library, the stationery suite, campaign templates for social and digital display — and a 34-page brand guideline that governs how all of it is used.",
        hero: "/assets/imgs/portfolio/technest.webp",
        heroAlt: "TechNest brand guideline — cover",
        accent: "#1D1D63",
        meta: [
            { label: "Role", value: "Brand Designer — identity & guidelines" },
            { label: "Timeline", value: "August 2024" },
            { label: "Sector", value: "Payments · fintech" },
            { label: "Tools", value: "Adobe Illustrator" },
        ],
        tags: ["Brand Identity", "Logo Design", "Visual System", "Brand Guidelines", "Print & Digital"],
        processTitle: "From a letterform to a system that scales.",
        challenge:
            "A payments brand has to look trustworthy before anyone reads a word, and it has to survive reproduction everywhere — an app splash screen, a favicon, a roadside billboard, a printed hoodie, a PDF letterhead. The brief asked for an identity that felt like technology and growth without the fintech clichés of gradient blobs and anonymous sans-serifs, and for guidance tight enough that an in-house marketing team could produce on-brand work without a designer in the room.",
        atAGlance: {
            problem:
                "A payments company had to look established before anyone read a word — and then be reproduced, most of the time by people who are not designers, on everything from a favicon to a roadside billboard.",
            move:
                "Build the whole system out of the mark's own two primitives — a hexagon and a dot — and prove the mark in black and white before any colour exists, so every later surface is recognisably TechNest and nothing depends on colour to be legible.",
        },
        constraint:
            "The identity had to be reproduced, most of the time, by people who are not designers — in print and on a screen, at favicon size and at hoarding size. That is why section one of the guideline proves the mark entirely in black and white, and colour does not appear until section two.",
        definitionOfDone:
            "A marketer holding the PDF, with no design training and no designer to ask, can produce a social post, a letterhead and a business card that a stranger would place as the same company — without a new asset being drawn.",
        phaseNote:
            "Carbon's nine journey phases are not this project's to claim, so none are tagged below. A brand guideline has no trial, no checkout and no plan to expand from; its user is whoever is producing the next piece of work, and their journey is one short loop — find the rule, apply it, ship. Manufacturing a Buy phase for a logo would say more about the framework than about the work.",
        evidenceNote:
            "No user research was run on this engagement. The questions below are the assumptions the identity was built on; the standards beside them are the ones it was held to.",
        subjects: [
            {
                label: "An in-house marketer with a deadline",
                context:
                    "Opens the PDF the afternoon a post is due, has no design training, and has no designer in the room to ask.",
                judges: "Can I build the thing I need from this page, or do I have to invent something?",
            },
            {
                label: "A print supplier setting a job",
                context:
                    "Receives artwork by email and needs trim size, stock and ink before the press runs — a phone call costs a day.",
                judges: "Does this document tell me the size and the paper, or do I have to chase someone?",
            },
            {
                label: "A developer building the web surface",
                context:
                    "Needs a screen equivalent for a printed typeface, and an email signature that survives being pasted into a mail client.",
                judges: "Is there a font I can actually load, and markup I can actually paste?",
            },
        ],
        goals: [
            { title: "One mark, every size", body: "A symbol that holds at favicon size and on a billboard, with a specified fallback for where the wordmark cannot fit." },
            { title: "Trust first", body: "A palette and type hierarchy that read as established and precise — the qualities a payments customer is actually buying." },
            { title: "A system, not a logo", body: "Patterns, icons and shapes derived from the mark's own geometry, so every application is recognisably TechNest." },
            { title: "Usable without a designer", body: "Rules clear enough to hand to a marketing team: formats, alignment, imagery and templates." },
        ],
        bar: [
            {
                metric: "Reproduction range the mark was held to",
                definition: "The smallest and largest surface the symbol must stay legible on without being redrawn.",
                value: "favicon to billboard",
                provenance: "target",
            },
            {
                metric: "Work a marketer can produce unaided",
                definition: "What the guideline alone has to be enough for, with no designer involved.",
                value: "a social post, a letterhead and a business card",
                provenance: "target",
            },
            {
                metric: "Colours a layout may use",
                definition: "Hues specified in the palette, before tints.",
                value: "three",
                provenance: "in-doc",
                check: "Page 2.1 — Deep Blue, Bright Turquoise, Charcoal, and nothing else.",
            },
            {
                metric: "Tint steps available without adding a hue",
                definition: "Published steps on the brand colours' ramps.",
                value: "twenty — ten on each of the two brand hues",
                provenance: "in-doc",
                check: "Page 2.1; Charcoal deliberately ships without a ramp.",
            },
            {
                metric: "Primary-logo treatments specified",
                definition: "Lockup configurations multiplied by the grounds each is drawn on, plus the standalone fallback.",
                value: "six, plus the logo mark",
                provenance: "in-doc",
                check: "Pages 1.1 and 1.2 — horizontal and stacked, each on white, on Deep Blue and on the gradient.",
            },
            {
                metric: "Application surfaces documented",
                definition: "Named surfaces given a page of their own, from letterhead to hoarding.",
                value: "twelve",
                provenance: "in-doc",
                check: "Sections 5.1–5.4, 6.1–6.4 and 7.1–7.4 of the guideline.",
            },
        ],
        process: [
            {
                phase: "Discovery & positioning",
                body: "The positioning was fixed first — finance technology, explore the future — along with the two ideas the identity had to carry: a nest (connection, security) and growth, which became the recurring line “Grow and Expand” across the pattern applications.",
                changed: "Committing to two ideas rather than one ruled out a letterform monogram: a single letter carries the name and nothing else.",
            },
            {
                phase: "Mark construction",
                body: "The logo icon was built from four primitives — a ring of hollow dots, a ring of solid dots, a hexagon and a T — on a strict grid, then stress-tested at favicon, app-icon and print sizes. A standalone logo mark was specified for the places the full lockup cannot be portrayed.",
                changed: "Proving the mark in black and white meant colour never had to rescue it — which is why the whole of section one contains no colour at all.",
            },
            {
                phase: "Colour & typography",
                body: "Deep Blue was set as the primary with Bright Turquoise as the single accent and Charcoal for text. Corbel was specified for print, with Sora and DM Sans as Google Fonts equivalents for the web, and a headline / sub-headline / body / numeric hierarchy was defined for each face.",
                changed: "The ramps replaced the fourth colour: ten steps on each brand hue bought the hierarchy a new hue would otherwise have been introduced to buy.",
            },
            {
                phase: "Pattern, icon & application system",
                body: "Three patterns — Quand, Propel and Cuboid — were drawn from the hexagon and dot geometry, alongside a four-icon contact set in line and hex-badge styles and a polygon library. The system was then applied to stationery, an HTML email signature, social and display templates, merchandise and out-of-home.",
                changed: "Deriving everything from the mark's own two shapes removed the argument about whether a new surface is on-brand — if it is not made of the hexagon and the dot, it is not.",
            },
            {
                phase: "Guideline & handoff",
                body: "Everything was documented in a 34-page brand guideline — usage, formats, alignment, imagery direction — with mockups showing the identity in situ, so the client team could produce on-brand work independently.",
                changed: "Numbering the document 1.0 to 7.4 turned it from something to be read into something to be looked things up in — the contents page became the interface.",
            },
        ],
        decisions: [
            {
                moment: "First look, at whatever size it lands",
                subject: "the person placing the mark, at any size",
                question: "Will this still read when it is tiny?",
                title: "A mark built from four primitives",
                body:
                    "A ring of hollow dots, a ring of solid dots, a hexagon and a T combine into the TechNest symbol: a nest of connected points around a stable core. The construction grid fixes every dot's position and spacing, so the mark can be redrawn at any size without drift, and the wordmark is set in a rounded geometric sans that echoes the dots.",
                instead:
                    "A bare letterform monogram is the sector default and the cheaper route — it survives any size but carries neither of the two ideas the positioning had to hold. The T stayed and became the core of a hexagon inside two rings of dots, so the nest and the growth read before the letter does.",
                cost:
                    "More detail than a monogram means the outer ring of hollow dots is the first thing to close up. The system needs a fallback rather than a single asset, which is why the guideline reserves the standalone logo mark for anywhere the full lockup cannot be portrayed.",
                bar: [
                    {
                        metric: "Colours the mark needs to be legible",
                        definition: "Hues the symbol depends on to hold its shape.",
                        value: "one",
                        provenance: "in-doc",
                        check: "Section 1.1 is set entirely in black and white; colour is not introduced until 2.1.",
                    },
                ],
                touchpoints: ["Construction grid", "Standalone logo mark", "Reversed mark on black", "Rounded geometric wordmark"],
                image: "/assets/imgs/portfolio/technest-mark.webp",
                imageAlt: "TechNest logo construction grid and final lockups",
            },
            {
                moment: "First use by someone who did not draw it",
                subject: "a marketer choosing between two files",
                question: "Which version do I use here?",
                title: "Lockups chosen by situation, not by name",
                body:
                    "The primary logo is specified in two configurations and three treatments each — Deep Blue on white, white on Deep Blue and white on the brand gradient — with alignment guides on the construction page. The rule that picks between them is written as a test of the situation: the stacked lockup when the logo is the only element in view (an app splash screen, the back of a business card, a mug), the horizontal one when it sits beside other elements (a website header, a letterhead).",
                instead:
                    "The tidy answer is to name the two versions horizontal and stacked and leave the choice to whoever is producing the work. Naming them describes the asset; it does not tell a marketer which one is right for the surface in front of them, so the rule was written from the surface instead.",
                cost:
                    "A rule written as two situations decides those two and nothing between them. A producer with the logo beside a single headline and nothing else has to judge, and the document does not judge for them.",
                bar: [
                    {
                        metric: "Primary-logo treatments specified",
                        definition: "Configurations multiplied by the grounds each is drawn on.",
                        value: "six",
                        provenance: "in-doc",
                        check: "Page 1.2 — horizontal and stacked, each on white, on Deep Blue and on the gradient.",
                    },
                ],
                touchpoints: ["Horizontal lockup", "Stacked lockup", "Deep Blue on white", "White on Deep Blue", "White on the gradient", "Alignment guides"],
                image: "/assets/imgs/portfolio/technest-logo.webp",
                imageAlt: "TechNest primary logo and logo formats",
            },
            {
                moment: "Three layouts in, needing a fifth level of hierarchy",
                subject: "whoever is building the next layout",
                question: "Where do I get a third colour?",
                title: "Two colours and a discipline",
                body:
                    "Deep Blue #1D1D63 does most of the work: it is the ground for the logo, the stationery and the campaign layouts. Bright Turquoise #08F4ED is the single accent — a highlighted second line, the tail of a gradient — and Charcoal #333333 carries body text. The two brand hues each ship with a ten-step tint ramp, so depth can be built without introducing a fourth colour.",
                instead:
                    "A fourth hue is the obvious relief valve, and a palette of gradient-blended blues is the fintech default. The palette holds at three and buys its depth from twenty tint steps instead, so a dense layout can carry five levels and still read as one brand.",
                cost:
                    "Charcoal ships without a ramp, so hierarchy in text cannot come from grey — it has to come from weight. That is why all three typeface pages fix headline, sub-headline and body to named weights rather than to shades.",
                bar: [
                    {
                        metric: "Tint steps available without adding a hue",
                        definition: "Published steps on the two brand colours' ramps.",
                        value: "twenty",
                        provenance: "in-doc",
                        check: "Page 2.1 — 10% to 100% on Deep Blue and on Bright Turquoise.",
                    },
                ],
                touchpoints: ["Deep Blue #1D1D63", "Bright Turquoise #08F4ED", "Charcoal #333333", "Two ten-step ramps", "The Deep Blue to Turquoise gradient"],
                image: "/assets/imgs/portfolio/technest-colour.webp",
                imageAlt: "TechNest colour palette with tint ramps",
            },
            {
                moment: "First page set by someone with only a laptop",
                subject: "whoever sets the next page, in print or in a browser",
                question: "Will this look the same once it is printed?",
                title: "Type for print and for the web",
                body:
                    "Corbel is the primary typeface for printed collateral, with Sora and DM Sans specified as Google Fonts equivalents for digital work. Each face is documented with its available weights — Corbel in three, Sora across a 100–800 range with seven named styles, DM Sans in Regular, Medium and Bold — and each repeats the same four-level hierarchy: headline, sub-headline, body, and a numeric and symbol set for pricing and transaction data. The specimens are set reversed on Deep Blue, so the type is proved on the ground it will most often sit on.",
                instead:
                    "One typeface across everything is the tidier system and the one most guidelines specify. It forces a choice between a licensed face on every desk in the company and a web font on the letterhead; splitting the job avoids both, and the two web faces are ones anyone can load for nothing.",
                cost:
                    "Three faces to keep straight instead of one, so the hierarchy had to be fixed inside each rather than shared across them — and mixing faces on a piece that is both printed and posted is the failure mode the document has to be read to avoid.",
                touchpoints: ["Corbel — Light, Regular, Bold", "Sora — 100–800, seven named weights", "DM Sans — Regular, Medium, Bold", "Numeric and symbol set per face", "Specimens reversed on Deep Blue"],
                image: "/assets/imgs/portfolio/technest-type.webp",
                imageAlt: "TechNest typography specimen — Sora",
            },
            {
                moment: "A surface that must look like TechNest before the logo appears",
                subject: "someone laying out an envelope flap",
                question: "How do I fill this without the logo?",
                title: "Three patterns from one geometry",
                body:
                    "Quand tessellates the hexagon into a cube lattice; Cuboid draws the same cube as an isometric wireframe; Propel scatters the dot at two sizes into a graded field that reads as data in motion, carrying the line “Grow and Expand”. A four-icon contact set — location, phone, web, mail — in line and hex-badge styles and a polygon library come out of the same two shapes, so a background, a billboard edge or an envelope flap is recognisably TechNest before the logo appears.",
                instead:
                    "Licensing a decorative pattern, or drawing a fresh motif per surface, is faster and is how a brand quietly becomes a mood board. Every pattern, icon and polygon was derived from the mark's own hexagon and dot instead, which makes “is this on-brand?” a question with a checkable answer.",
                cost:
                    "A system built from one hexagon and one dot has a narrow range: there is nothing soft, organic or human anywhere in the geometry, so all the warmth in the brand has to come from the photography.",
                touchpoints: ["Quand", "Propel", "Cuboid", "Hex-badge icon set", "Line icon set", "Polygon library"],
                image: "/assets/imgs/portfolio/technest-pattern.webp",
                imageAlt: "TechNest Propel pattern — Grow and Expand",
            },
            {
                moment: "Handing artwork to someone outside the company",
                title: "Stationery that carries the system",
                body:
                    "Business card, identity card, letterhead and envelope share one construction: a Deep Blue face carrying the mark over the hexagon pattern, and a white face for information, with contact details set against the hex-badge icons. The business card and the envelope carry trim size and paper weight on the page, so a supplier can quote and print without a phone call.",
                bar: [
                    {
                        metric: "Stationery pieces carrying a full print spec",
                        definition: "Applications given both a trim size and a paper weight in the document.",
                        value: "two of four",
                        provenance: "in-doc",
                        check: "Business card 85 × 55 mm at 350 g/m² (5.2) and envelope 229 × 324 mm at 250 g/m² (5.3); the identity card gives a size only, the letterhead neither.",
                    },
                ],
                touchpoints: ["Letterhead", "Business card", "Envelope", "Identity card"],
                image: "/assets/imgs/portfolio/technest-stationery.webp",
                imageAlt: "TechNest stationery — ID card, business cards and pen",
            },
            {
                moment: "First on-brand post produced without a designer",
                subject: "the in-house marketer, the afternoon it is due",
                question: "Can I make this one myself?",
                title: "Templates a marketing team can run",
                body:
                    "Social posts and digital banners follow a documented grid, annotated on the page: primary logo alignment, primary image alignment, where the pattern runs, and the headline / paragraph / CTA stack with the second line in Turquoise. The layout is shown in landscape, portrait and square, and the email signature ships as real HTML.",
                instead:
                    "A marketing team usually asks for finished, exported posts, and finished posts answer exactly the posts they contain. Annotating the grid instead — alignment, stack, pattern — lets the team build the layout nobody anticipated, which is most of them.",
                cost:
                    "An annotated grid asks more of the person using it than a finished export does. It buys every future layout at the price of the first one taking longer to build.",
                bar: [
                    {
                        metric: "Work a marketer can produce unaided",
                        definition: "What the annotated templates alone have to be sufficient for.",
                        value: "a post, a banner and a signature, no designer in the room",
                        provenance: "target",
                    },
                ],
                touchpoints: ["Annotated social layout", "Landscape banner", "Portrait banner", "Square post", "HTML email signature"],
                image: "/assets/imgs/portfolio/technest-campaign.webp",
                imageAlt: "TechNest digital banner templates",
            },
            {
                moment: "Briefing the next shoot",
                subject: "whoever commissions the photography",
                question: "What am I meant to be photographing?",
                title: "Imagery: focus on the user",
                body:
                    "The imagery guide sets two rules — focus on the user, communicate emotion — and states that the benefit to the user should be the priority in every visual and written communication. The campaign photograph is a woman reacting to something on her phone, with the phone barely in frame.",
                instead:
                    "A payments brand photographs the product — the card, the phone, the dashboard — which is why every competitor's image library looks the same. The direction points at the person's reaction instead, and the product is allowed to fall out of focus.",
                cost:
                    "A reaction is harder to source than a product render, and the guideline says what to shoot without saying where to get it: there is no image library, no licensing note and no fallback for a team that cannot commission a shoot.",
                touchpoints: ["Imagery guide", "Campaign photography with the product out of focus"],
            },
            {
                moment: "The two extremes, side by side",
                title: "From screen to street",
                body:
                    "Section seven puts the identity on four surfaces the studio does not control — a T-shirt and hoodie, bottles and flasks, pens with ID and business cards, and a roadside billboard. They are mockups rather than photographs of production, and their job is to test the mark at the two ends of the range the brief named: the point where the dot rings start to close up, and the point where they finally have room to read as individual points.",
                touchpoints: ["Merchandise", "Bottles and flasks", "Pens, ID and business cards", "Billboard"],
            },
        ],
        notDesigned: [
            {
                title: "No motion system",
                body:
                    "The obvious extension is to animate the dot rings, and the guideline stops short of it. Nothing in the identity's documented surfaces — print, stationery, static display, out-of-home — runs motion, and a motion rule with no surface to run on is decoration. The one place a payments brand genuinely animates is the app launch, which belongs with whoever builds the app, on their timings.",
            },
            {
                title: "No product interface",
                body:
                    "Nothing here governs a screen: no components, no states, no focus or error rules. That is the boundary the document was drawn to. An identity tells a company how to present itself; a payments interface needs its own system with contrast, keyboard and error behaviour written into it, and half-specifying that from a brand deck would have been worse than leaving it open.",
            },
            {
                title: "No tone of voice",
                body:
                    "The document commits to one positioning line — finance technology, explore the future — and one imagery rule, and leaves a voice system unwritten rather than half-written. A page of adjectives nobody owns is the most-ignored page in any guideline; the copy on the templates is deliberately the only example given.",
            },
        ],
        constraints: [
            "The deliverable is a PDF, not a system that can be queried — every rule has to be findable by scanning a contents page, which is why the document is numbered 1.0 to 7.4 with one subject per spread.",
            "Print and web could not share a typeface without one of them paying for it: Corbel carries printed collateral, Sora and DM Sans carry the screen.",
            "Three colours and no fourth, so depth has to come from two ten-step ramps and from type weight.",
            "Anything the system adds has to be made of the mark's own two primitives — the hexagon and the dot.",
            "The mark had to survive a favicon and a roadside billboard from the same drawing, which is why it is proved in one colour before any is applied.",
        ],
        unknowns: [
            "The guideline publishes no contrast figures. Bright Turquoise appears only on Deep Blue or on the gradient throughout the document, which is the safe usage — but nothing written stops a producer setting it as text on white, where it would fail badly. A contrast rule is the first page I would add.",
            "The email signature in 6.1 ships real HTML that loads Inter — not either of the two web faces the typography section specifies. It is a small drift, and it is the clearest argument that a guideline needs a way of being checked rather than only read.",
            "There is no clear-space rule, no minimum size and no misuse page: the construction grid fixes the mark's internal proportions but says nothing about what surrounds it. The first test would be handing the lockup and the standalone mark to three people who did not draw them, asking each to place them at 16px, on a business card and on a hoarding, and watching where they disagree.",
        ],
        palette: [
            { name: "Deep Blue", hex: "#1D1D63" },
            { name: "Bright Turquoise", hex: "#08F4ED" },
            { name: "Charcoal", hex: "#333333" },
            { name: "Deep Blue 60%", hex: "#4D4DA1" },
            { name: "Turquoise 30%", hex: "#B5FCFA" },
        ],
        typeNote:
            "Corbel for print; Sora and DM Sans as Google Fonts equivalents for the web, each specified across its available weights. The hierarchy is fixed per face — Bold headline, Medium sub-headline, Regular body — with a dedicated numeric and symbol set, because a payments brand shows more figures than sentences.",
        components: ["Logo mark & wordmark", "Horizontal & stacked lockups", "Three colour treatments", "Ten-step tint ramps", "Quand · Propel · Cuboid patterns", "Hex-badge icon set", "Polygon library", "Stationery suite", "HTML email signature", "Social & banner templates"],
        designSystemUrl: "/prototypes/technest/brand-guideline.pdf",
        designSystemLabel: "Brand guideline",
        designSystemImage: "/assets/imgs/portfolio/technest-guideline.webp",
        designSystemBlurb:
            "The identity ships as a 34-page brand guideline: brand-mark construction and formats, the colour palette with tint ramps, three typeface specifications, the pattern, icon and polygon libraries, the stationery suite, design rules for email, social, banners and imagery, and mockups that show the system on merchandise, drinkware, print and out-of-home.",
    },
];

export const findCaseStudy = (slug?: string): CaseStudy | undefined =>
    CASE_STUDIES.find((c) => c.slug === slug);
