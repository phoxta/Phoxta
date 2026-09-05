// Long-form project case studies for femi.phoxta.com/work/:slug.
// One entry per project that has a dedicated study page. Content follows a
// standard product-design case-study spine: context → challenge → objectives →
// process → design decisions → visual system. Written in project voice, not
// first person: the engagement, the team, the decisions and the rationale.

export type MetaItem = { label: string; value: string };
export type Highlight = { title: string; body: string; image?: string; imageAlt?: string; wide?: boolean };
export type Swatch = { name: string; hex: string; ink?: boolean };

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
    /** Heading for the Process section — defaults to a generic line. */
    processTitle?: string;
    challenge: string;
    goals: { title: string; body: string }[];
    process: { phase: string; body: string }[];
    highlights: Highlight[];
    palette: Swatch[];
    typeNote: string;
    components: string[];
    designSystemUrl?: string;
    /** Heading + button text for that block — defaults to "Design system" (a brand study calls it its guideline). */
    designSystemLabel?: string;
    designSystemImage?: string;
    designSystemBlurb?: string;
    outcome?: string[];
};

export const CASE_STUDIES: CaseStudy[] = [
    {
        slug: "phoxta",
        name: "Phoxta",
        kicker: "AI business platform · Product Design",
        tagline: "An AI-native, multi-tenant platform that turns starting a business into choosing one.",
        summary:
            "Phoxta builds complete, ready-to-run businesses — storefronts, bookings, content sites — on one shared backend, packages each as a cloneable blueprint and sells it through a marketplace. Every buyer receives a working, AI-operated company on day one. The product-design remit covers the entire surface area: the marketing site, the marketplace, the owner dashboard and the multi-tenant operating console, delivered as a Figma-to-React design system and shipped in production code.",
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
        goals: [
            { title: "Ownership in one screen", body: "The dashboard answers “what do I own, is it live, what needs attention?” above the fold, before any navigation." },
            { title: "One console, every vertical", body: "CRM, commerce, content, engagement and billing as a single config-driven console — the same UI serves a restaurant and a fashion retailer." },
            { title: "Delegable AI", body: "An operator that reads, drafts and acts inside explicit permissions, an approval queue and an audit trail." },
            { title: "A system that ships", body: "A Figma-to-React design system that keeps the site, console and transactional email consistent while a small team moves fast." },
        ],
        process: [
            { phase: "Discovery & positioning", body: "The brief originated in three failed launches by capable founders — none needed a website builder; all needed a running business they could rebrand. Discovery mapped the buyer's day-one jobs to be done, then benchmarked site builders, commerce platforms and the emerging class of AI-agent products to locate where “AI-native” could be structural rather than a feature." },
            { phase: "Information architecture", body: "The product was structured as three surfaces on one core — public storefronts, the marketplace and the management console — with the console modelled as modules keyed by business type. A vertical is a configuration (which modules are enabled and how the site is composed), not a new design." },
            { phase: "Design system", body: "Tokens, a pill-and-card component language, one-line page headers with tabs, a distinct console theme and shared empty, loading and approval states were defined in Figma and implemented as React components, then reused across roughly thirty dashboard views so new features land looking native." },
            { phase: "Build, measure, iterate", body: "Design and engineering ran in the same codebase — React, TypeScript, Supabase — so prototypes graduated to production without a handoff gap. Every AI capability is metered and capped per tenant, which makes cost part of the design brief, and usage informs the roadmap." },
        ],
        highlights: [
            {
                title: "A front door that sells the outcome, not the software",
                body: "The cover above is the entire pitch in one viewport: “Own a business that already works.” over a shelf of live blueprints and the categories available to buy into — no feature grid, no jargon. The site's job is to make the promise credible within a scroll and route the visitor to the marketplace; the product proves itself once they are inside.",
            },
            {
                title: "A home that reads like ownership — with an operator that acts",
                body: "The owner's dashboard opens with what they own, whether it is live and what needs attention, and the AI operator sits at the centre as a conversation rather than a widget. It is not a chatbot: it has governed write tools, each set to off, ask-me or autopilot, an approval queue with reasoning attached, and daily limits on actions, calls and emails. Owners can run it from Telegram without opening the dashboard.",
            },
            {
                title: "A console that works like a task board",
                body: "Every business runs from the same config-driven console — Overview, Engage, CRM, Invoicing, Help Center, Graphics, Operator, Settings. Inbox conversations, marketing emails and voice calls land in one board grouped by status, so triage happens by glance rather than by application. Panels and terminology switch per business type.",
            },
            {
                title: "A content studio for non-designers",
                body: "Graphics turns a brand into a month of social content: eighteen template families, an AI planner that drafts the strategy and captions in the business's own voice, a scheduling calendar and a professional SVG canvas for edits. It is the surface owners touch most often, so it received the deepest polish.",
            },
            {
                title: "A marketplace of businesses — and the storefronts behind it",
                body: "Each blueprint is a live, verified business with a clickable demo and a one-time price: a fashion store, a restaurant with ordering, a car rental, guided experiences, a furniture shop. They are separate brands on one tenant-scoped API — products, orders and bookings flow straight into the console, each carries its own AI stylist, concierge or trip assistant, and branding is data applied at domain resolution.",
            },
            {
                title: "Responsive by system",
                body: "The site and console are responsive by system, not by exception: the hero, blueprint shelf and category chips reflow to a thumb-first layout, and the dashboard's one-line header-plus-tabs pattern keeps every console view usable on a small screen.",
            },
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
            { label: "Tools", value: "Figma · HTML/CSS prototype" },
        ],
        tags: ["Product Design", "Design System", "Dashboard", "Data-viz", "Responsive"],
        prototypeUrl: "/prototypes/coir-six/index.html",
        processTitle: "From momentum problem to daily habit.",
        challenge:
            "Self-paced learners churn the moment a platform makes them work to find their place. The incumbent dashboard buried progress inside a profile, gave five content types equal visual weight and offered no reason to return tomorrow. The brief: turn the home screen into a daily habit — motivating, instantly legible and honest about how far along the learner actually is — without adding onboarding or instruction.",
        goals: [
            { title: "Resume in a glance", body: "Answer “where was I?” in under a second; the learner continues rather than re-navigates." },
            { title: "Make progress felt", body: "Surface effort as visible momentum, not a number two screens deep." },
            { title: "One clear rhythm", body: "Give every content type — courses, lessons, mentors — a scannable, predictable place." },
            { title: "Hold on any screen", body: "One hierarchy that works at 1440px and at 390px, one-handed." },
        ],
        process: [
            { phase: "Discovery & competitive audit", body: "The self-paced learner journey was mapped and the returning-student experience of Coursera, Skillshare and DataCamp audited. Patterns that worked everywhere: a persistent progress anchor and a single “continue” shortcut. Patterns that failed: dense card grids without hierarchy and progress locked away in settings." },
            { phase: "Information architecture", body: "Content was reorganised into three intents — Navigate, Do, and Track & connect — each owning a column, so the eye knows which region answers which question before reading a word." },
            { phase: "Wireframes & validation", body: "Low-fidelity layouts pressure-tested the three-pane balance and, critically, the mobile reflow — settling column widths and what survives the collapse to a phone before any visual design." },
            { phase: "Visual design, prototype & handoff", body: "A lilac-led visual system was built into a working HTML/CSS prototype to validate spacing, motion and breakpoints in a real browser; the prototype doubled as the front-end reference for engineering." },
        ],
        highlights: [
            {
                title: "One screen, three intents",
                body: "Navigation sits on the left, the day's work in the centre, and progress and people stay pinned to the right. Splitting the home by intent rather than by feature means the learner never hunts across the page; each column has one job and keeps to it.",
                image: "/assets/imgs/portfolio/coir-six.webp",
                imageAlt: "Coir Six three-pane dashboard layout",
            },
            {
                title: "Progress you can feel",
                body: "A single completion ring, a weekly study-time chart and per-track “watched” counters convert invisible effort into visible momentum. The ring wraps the learner's own avatar so progress reads as personal — the quiet retention hook that brings the learner back tomorrow.",
            },
            {
                title: "Continue, don't restart",
                body: "The most-used action gets the most space. Resumable course cards lead with a live progress bar and the mentor behind each one, so picking up where you left off is the path of least resistance — a horizontal, swipeable shelf rather than a wall of choices.",
            },
            {
                title: "A social layer that motivates",
                body: "Mentors and peers keep self-paced learning from feeling solitary. Following, quick messages and “your mentor” live one tap away on the right rail — present enough to encourage, restrained enough never to crowd the work.",
            },
            {
                title: "Built to reflow, not rebuild",
                body: "The three-pane console collapses into a single focused column with a sticky greeting bar and a thumb-friendly bottom tab bar. Category chips and course shelves become edge-to-edge horizontal scrollers — the same system, re-weighted for one hand rather than redrawn.",
                image: "/assets/imgs/portfolio/coir-six-mobile.webp",
                imageAlt: "Coir Six responsive mobile app",
                wide: true,
            },
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
            "Ferne is a small-batch botanical skincare brand whose proposition is traceability — every active tied to a farm the customer can name. The engagement covered the complete direct-to-consumer storefront: an editorial homepage, a faceted shop, rich product detail pages and a friction-light cart-to-confirmation flow across ten page types, designed and implemented as a working front end rather than static screens.",
        hero: "/assets/imgs/portfolio/ferne.webp",
        heroAlt: "Ferne skincare storefront — homepage",
        accent: "#5F6F52",
        meta: [
            { label: "Role", value: "Product & Web Designer" },
            { label: "Timeline", value: "4 weeks" },
            { label: "Scope", value: "10 page types" },
            { label: "Tools", value: "Figma · HTML/CSS/JS" },
        ],
        tags: ["E-commerce", "Web Design", "Design System", "Front-end", "Responsive"],
        prototypeUrl: "/prototypes/ferne/index.html",
        processTitle: "From brand promise to confirmed order.",
        challenge:
            "Premium skincare converts on trust and flow. Shoppers bounce when a store feels generic, hides the “why”, or turns purchasing into a chore. Ferne's brand rests on a single claim — traceable, farm-named ingredients — so the storefront had to make that credible on every screen and then step aside, converting browsing into a bag and a bag into a confirmed order without a single dead end.",
        goals: [
            { title: "Make the promise felt", body: "Place traceability — farms, batch numbers, provenance — where it reassures, never where it clutters." },
            { title: "Browse without friction", body: "A shop that filters, sorts and searches the way a real catalogue is used — by concern, category, price and stock." },
            { title: "A product page that sells", body: "Everything a considered purchase needs — variants, honest stock, reviews, ingredients — in one calm scroll." },
            { title: "Checkout that never stalls", body: "Carry the shopper from cart to confirmation with real validation, clear costs and zero dead ends." },
        ],
        process: [
            { phase: "Brand & foundations", body: "Voice (warm, plain-spoken, editorial) and a token system — sage on warm sand, Fraunces with Manrope — were established before any page, so every screen would read as one brand." },
            { phase: "Journeys & IA", body: "The shopper paths — discover → compare → decide → buy → return — were mapped and ten page types structured around them: home, shop, product, cart, checkout, order, account, journal, about and contact." },
            { phase: "Interaction & prototype", body: "Flows were designed and then built as a working front end — data-driven catalogue, cart, wishlist, promo codes, ⌘K search, mini-cart drawer — so the whole journey could be tested in a browser rather than in static frames." },
            { phase: "Systemise & harden", body: "Product cards, drawers, filters and forms were componentised; responsive rules (tablet ≤1100px, mobile ≤768px) and form validation were specified so the store holds together on any device." },
        ],
        highlights: [
            {
                title: "An editorial hero that says why",
                body: "The homepage opens with a serif promise and the product in-hand — not a slider — followed by a trust row (dermatologist-tested, traceable, refillable glass) and a marquee of proof points that substantiate the botanical claim before the first scroll.",
                image: "/assets/imgs/portfolio/ferne.webp",
                imageAlt: "Ferne homepage hero",
            },
            {
                title: "A shop that works like a catalogue",
                body: "Faceted filters — category, skin concern, price, stock, refillable — sit in a quiet left rail with live counts, while every card leads with the product, an “Add to bag” and the price, then the name, a one-line promise and the size. The catalogue is data-driven, so it swaps to a live commerce API without the UI changing.",
                image: "/assets/imgs/portfolio/ferne-shop.webp",
                imageAlt: "Ferne shop with faceted filters",
            },
            {
                title: "A best-sellers shelf that sells the routine",
                body: "On the homepage the four best-sellers sit under one clinical, plant-led promise — calm, hydrate and rebuild the skin barrier — with The Ritual Set bundling cleanse, treat and seal. Each card shares the shop's anatomy, so a shopper can add to bag without leaving the home page or step across to “Shop all products”.",
                image: "/assets/imgs/portfolio/ferne-bestsellers.webp",
                imageAlt: "Ferne best-sellers shelf",
            },
            {
                title: "A product page built for a considered buy",
                body: "Gallery, size variants with live pricing, honest stock (“ships today before 2pm”), a full ingredient list traced to farm, a rating breakdown and write-a-review — plus a mobile sticky buy bar so the primary action is always within reach.",
            },
            {
                title: "Cart to confirmation, no dead ends",
                body: "The cart supports line editing, save-for-later, promo codes and a free-delivery progress bar; checkout is three steps with real validation (email, UK postcode, card) and a receipt-style confirmation. Cart, wishlist and orders persist, so nothing is lost between sessions.",
            },
            {
                title: "One brand, every breakpoint",
                body: "A sticky header, mini-cart and menu drawers, a ⌘K search palette and toasts tie the store together; below 768px it becomes a clean, thumb-first mobile shop — the same system, re-weighted for one hand.",
            },
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
        tagline: "A restaurant storefront that takes the order, books the table and answers the phone.",
        summary:
            "Saveur is Phoxta's restaurant blueprint: a digital-first kitchen with online ordering for pickup and dine-in, table reservations, special-order quotes for catering and events, live order tracking and an AI concierge that knows the order status. The engagement covered the full guest journey — seven page types on one editorial system — and the data model that lets the storefront clone for the next restaurant without redesign.",
        hero: "/assets/imgs/portfolio/saveur.webp",
        heroAlt: "Saveur restaurant storefront — homepage",
        accent: "#B45309",
        meta: [
            { label: "Role", value: "Lead Product Designer" },
            { label: "Timeline", value: "2026" },
            { label: "Scope", value: "Home · Menu · Special orders · Reservations · Track · Account" },
            { label: "Tools", value: "Figma · React · Supabase" },
        ],
        tags: ["Restaurant", "E-commerce", "Bookings", "AI", "Responsive"],
        prototypeUrl: "https://saveur-demo.dine.phoxta.com",
        prototypeLabel: "Visit the live site",
        processTitle: "From a menu online to a kitchen that never misses an order.",
        challenge:
            "Most restaurant websites are a PDF menu and a phone number, so the actual ordering happens on third-party delivery apps that take a commission and own the customer relationship. The brief was to make ordering, reserving and asking a question as easy as the aggregator apps — on the restaurant's own domain, in its own voice — with every order, booking and request landing with the operator rather than a marketplace.",
        goals: [
            { title: "Order in a scroll", body: "A menu that filters by course and dietary need and adds to a bag without leaving the page — no PDF, no phone call." },
            { title: "Book a table without a call", body: "Reservations and special orders — catering, bulk, custom bakes, events — as short forms that return a confirmation or a quote." },
            { title: "Never wonder where the food is", body: "A live order-status timeline with an honest ETA, and a concierge that answers “where is my order?” without staff." },
            { title: "One kitchen, one console", body: "Menu items are products, orders are orders — everything runs from the same Phoxta console the operator already uses." },
        ],
        process: [
            { phase: "Journeys & IA", body: "The four guest journeys — order for pickup or dine-in, reserve, request something special, track — were mapped and seven page types structured around them: home, menu, special orders, reservations, track, contact and account." },
            { phase: "Brand & foundations", body: "An editorial, evening-service tone was set: Playfair Display headlines over dark photographic heroes, Inter for menus and forms, warm cream pages, burgundy for the order action and copper for the highlight." },
            { phase: "Interaction & build", body: "The menu was built as a filterable catalogue with a bag, the reservation and special-order forms with real validation, the order-tracking timeline and the concierge launcher — as a working React storefront wired to the Phoxta backend." },
            { phase: "Blueprint & harden", body: "Everything was made data-driven — dishes as products, requests as records, branding as tenant data — and responsive rules were written, so the same site clones cleanly for the next restaurant." },
        ],
        highlights: [
            {
                title: "A front door set for evening service",
                body: "The cover above is the whole positioning in one frame: a full-bleed table scene, an established-date eyebrow, a serif headline about flavour and craft, and two actions — Order online, Reserve a table — with the concierge in the corner. Nothing else competes; the site's first job is appetite and the second is the order.",
            },
            {
                title: "A menu built to be ordered from",
                body: "Courses as pills, dietary filters a click away, GF/DF/V badges on each dish and a single “Add” on every row. Photography stays small and consistent so the list scans like a menu and behaves like a shop — the bag follows the guest across the site.",
            },
            {
                title: "Special orders without the phone tag",
                body: "Catering, bulk orders, custom bakes and private events share one request flow: choose the type, state when, how many and roughly how much, and the kitchen returns a quote. Everyday orders are redirected to the menu, because that is faster for everyone.",
            },
            {
                title: "Tracked like a parcel",
                body: "Received → In the kitchen → Ready → Completed, with an estimated time and the current step called out. The concierge is aware of order status, so the question that used to interrupt the pass now answers itself.",
            },
            {
                title: "A concierge that knows the room",
                body: "The AI concierge is grounded in the menu, hours and policies and can read live order status — so it answers allergen questions, suggests a dish and tells a guest their food is packed, in the restaurant's own tone. Anything it cannot answer routes to the operator's inbox.",
            },
            {
                title: "One-handed at the table",
                body: "Below the tablet breakpoint the hero, menu and forms reflow to a single thumb-first column with full-width actions — order, reserve and concierge always in reach — because much of restaurant traffic arrives from a phone at the table or on the way home.",
            },
        ],
        palette: [
            { name: "Copper", hex: "#B45309" },
            { name: "Burgundy", hex: "#7A1F2B" },
            { name: "Cream", hex: "#FBF7F0", ink: true },
            { name: "Ink", hex: "#1C1917" },
            { name: "Paper", hex: "#FFFFFF", ink: true },
        ],
        typeNote:
            "Playfair Display carries headlines and dish names for an evening-service, white-tablecloth register; Inter keeps menus, forms and the tracking timeline crisp. Pages sit on warm cream, heroes on dark photography, and colour is reserved for two jobs: burgundy for the order action, copper for the highlight and the concierge.",
        components: ["Menu row with dietary badges", "Course & dietary filter pills", "Bag", "Reservation form", "Special-order request", "Order-status timeline", "Concierge launcher"],
    },
    {
        slug: "wander",
        name: "Wander",
        kicker: "Experiences booking · Product Design",
        tagline: "Find, compare and book a guide-led experience — with a trip assistant a tap away.",
        summary:
            "Wander is Phoxta's experiences blueprint: a marketplace of guide-led activities where travellers search by place, dates and guests, filter thousands of listings and book from the detail page. The demo tenant runs as “Ceepii” — the same product, rebranded through data. The engagement covered the search, listing and booking journey, the responsive system around it and the per-tenant branding layer.",
        hero: "/assets/imgs/portfolio/wander.webp",
        heroAlt: "Wander experiences homepage",
        accent: "#2F7BF5",
        meta: [
            { label: "Role", value: "Lead Product Designer" },
            { label: "Timeline", value: "2026" },
            { label: "Scope", value: "Search · Categories · Listing · Booking · Wishlists · Blog" },
            { label: "Tools", value: "Figma · React · Supabase" },
        ],
        tags: ["Travel", "Bookings", "Marketplace", "AI", "Responsive"],
        prototypeUrl: "https://travel-demo.travel.phoxta.com",
        prototypeLabel: "Visit the live site",
        processTitle: "From “where to?” to a confirmed booking.",
        challenge:
            "Experience marketplaces are dense: dozens of filters, cards that all look alike and a booking step buried below the fold. Travellers arrive with three things in mind — where, when and how many — so the brief was to make those three the entire interface, keep listings comparable at a glance, and make booking on the detail page feel as light as saving to a wishlist.",
        goals: [
            { title: "Three inputs, then results", body: "Location, dates and guests as one pill — the search is the hero, and everything else waits until it is answered." },
            { title: "Cards you can compare", body: "Price per guest, duration, group size and rating in the same place on every card, so choosing is a scan rather than a study." },
            { title: "Book without leaving the page", body: "A booking card that stays in reach beside the gallery — date, guests, name, email — and a request that lands with the host." },
            { title: "Help on every screen", body: "An “Ask us” trip assistant available everywhere, grounded in the listings, so questions never dead-end." },
        ],
        process: [
            { phase: "Discovery & IA", body: "Leading experience marketplaces were benchmarked and the traveller's path — inspire, search, compare, decide, book, keep — mapped into home, search, category, listing, wishlist, blog and contact pages, with hosts as first-class objects." },
            { phase: "Design system", body: "A bright, optimistic kit: Sora headlines with an italic serif accent, Inter for UI, a vivid sky blue as the single brand colour, pill search and filter chips with counts, and one card anatomy reused for listings, categories and hosts." },
            { phase: "Interaction & build", body: "The search pill, filters, paginated results, the listing page with gallery and booking card, wishlists and the assistant were built as a working storefront on Phoxta's shared bookings model — availability and reservation requests come from the same backend as every other Phoxta business." },
            { phase: "Responsive & tenancy", body: "Mobile rules were written — a bottom tab bar for Home, Wishlists and Account, a compact search at the top — and branding was made tenant data, which is why the demo runs as Ceepii without a line of code changing." },
        ],
        highlights: [
            {
                title: "Three inputs, then the world",
                body: "The homepage is a search bar on a sky: location, a date range and guests, with social proof underneath and nothing competing. The headline pairs a bold sans with an italic serif for “experiences” — the one flourish in an otherwise plain system.",
                image: "/assets/imgs/portfolio/wander.webp",
                imageAlt: "Wander homepage search",
            },
            {
                title: "Cards you can compare at a glance",
                body: "Every experience card carries the same five facts in the same places — a badge, the title, the meeting point, chips for duration and group size, then price per guest and rating. Shelves such as “Experiences in Osaka” scroll sideways behind paired arrows, so a traveller skims eight thousand listings the way they would skim a shelf.",
                image: "/assets/imgs/portfolio/wander-shelf.webp",
                imageAlt: "Wander experience cards shelf",
            },
            {
                title: "Proof first, then the ask",
                body: "The host section leads with numbers a traveller can check — earnings paid out to hosts, guest arrivals, a 4.9 rating over tens of thousands of verified reviews — floated over one travel photograph, with “Become a host” and the community of hosts beneath. Trust is shown before anyone is asked to list.",
                image: "/assets/imgs/portfolio/wander-why.webp",
                imageAlt: "Wander — why customers rely on us",
            },
            {
                title: "Inspiration as a front door",
                body: "City cards — Mexico City, Ljubljana, Baceno, Wellington — carry a live count of available experiences and open straight into a category page that behaves exactly like search results. It gives the marketing team landing pages and gives travellers a way in when they do not yet know what to type.",
                image: "/assets/imgs/portfolio/wander-inspiration.webp",
                imageAlt: "Wander destination inspiration cards",
            },
            {
                title: "A listing page that books itself",
                body: "A four-photo gallery leads, then title, place, rating and a verified host. The booking card — price per person, date, guests, name, email — sits beside the content and stays in reach, so the decision and the action are never on different screens.",
            },
            {
                title: "Thumb-first on the road",
                body: "On a phone the search collapses to a single “Where to?” bar, the hero keeps its proof points, and a bottom tab bar — Home, Wishlists, Account — plus a floating “Ask us” keep the four things a traveller does within thumb reach.",
            },
        ],
        palette: [
            { name: "Sky", hex: "#2F7BF5" },
            { name: "Mint", hex: "#6EA69F" },
            { name: "Ink", hex: "#111111" },
            { name: "Paper", hex: "#FFFFFF", ink: true },
            { name: "Cloud", hex: "#F4F6F8", ink: true },
        ],
        typeNote:
            "Sora gives headlines a rounded, friendly confidence; an italic serif is used for exactly one word per headline; Inter runs everything else. One saturated sky blue does the branding on its own, with mint reserved for the assistant and the search action, so the photography in the cards stays the most colourful element on the page.",
        components: ["Search pill (location · dates · guests)", "Filter chips with counts", "Experience card", "Photo gallery", "Booking card", "Host badge", "Wishlist heart", "Bottom tab bar"],
    },
    {
        slug: "aurelia",
        name: "Aurelia",
        kicker: "Fashion e-commerce · Product Design",
        tagline: "A considered fashion store with an AI stylist — on a backend shared with every other Phoxta business.",
        summary:
            "Aurelia is Phoxta's flagship fashion blueprint: an editorial storefront with a filterable collection, product pages with size and colour variants, cart, checkout, order tracking and an AI stylist. It is a genuinely multi-tenant store — each buyer's copy resolves by hostname, seeds its own catalogue and applies its own branding — and products and orders flow straight into the operating console. The engagement covered the storefront end to end, from campaign hero to order confirmation.",
        hero: "/assets/imgs/portfolio/aurelia.webp",
        heroAlt: "Aurelia fashion storefront — homepage",
        accent: "#85ACD6",
        meta: [
            { label: "Role", value: "Lead Product Designer" },
            { label: "Timeline", value: "2026" },
            { label: "Scope", value: "Home · Shop · Product · Cart · Checkout · Track order · Account" },
            { label: "Tools", value: "Figma · React · Supabase" },
        ],
        tags: ["Fashion", "E-commerce", "Multi-tenant", "AI", "Responsive"],
        prototypeUrl: "https://aurelia-demo.aurelia.phoxta.com",
        prototypeLabel: "Visit the live site",
        processTitle: "From lookbook to checkout, one calm system.",
        challenge:
            "Fashion e-commerce lives on imagery and dies on friction. The store had to read as a campaign rather than a template, hold its composure with any catalogue — it is cloned for many buyers, each with different products — and help a shopper choose without upstaging the merchandise. The brief: editorial first, no dead ends from hero to order confirmation, and an AI stylist that behaves like a service rather than a widget.",
        goals: [
            { title: "Editorial first", body: "A hero and collection that read like a lookbook — big photography, quiet type, one accent." },
            { title: "Any catalogue, same store", body: "Cards, filters and product pages that stay composed whether a tenant sells twelve pieces or twelve hundred." },
            { title: "A product page that answers everything", body: "Sizes, colours, stock, shipping, returns, reviews and the stylist — in one scroll, with the buy action always visible." },
            { title: "Help choosing, on demand", body: "An AI stylist grounded in the tenant's own catalogue, one tap away on every page and silent until asked." },
        ],
        process: [
            { phase: "Brand & tokens", body: "Poppins for headlines, Inter for UI, near-white paper and a single powder-blue accent for actions — a palette that steps back so product photography carries the store, and one that tenants can swap through branding data." },
            { phase: "Journeys & IA", body: "Discover → browse → decide → buy → track was mapped into home, shop, product, cart, checkout, track-order, about, contact and account, with Women / Men / New In / Sale as the only top-level filters." },
            { phase: "Interaction & build", body: "The campaign hero, the collection with category pills and sort, the product page with variants, stock badges and quantity, the cart-to-checkout flow, order tracking and the stylist launcher were built as a working React storefront." },
            { phase: "Multi-tenancy", body: "Every copy resolves by hostname, auto-seeds its own catalogue on first visit and applies the owner's logo, palette and type at resolve time; products and orders sync to the Phoxta console, so the store and the business are one system." },
        ],
        highlights: [
            {
                title: "A hero that behaves like a campaign",
                body: "Season, headline, one line of promise and two actions over full-bleed photography — the same structure a fashion house uses for a drop. The header is airy and the accent stays out of the picture until there is something to click.",
                image: "/assets/imgs/portfolio/aurelia.webp",
                imageAlt: "Aurelia campaign hero",
            },
            {
                title: "The collection as a lookbook",
                body: "A collection banner, then Women / Men / New In / Sale pills, a sort control and a clean grid with New and Sale badges. Everything is data-driven, so a tenant with a different catalogue inherits the same composure — the layout never depends on how many products there are.",
                image: "/assets/imgs/portfolio/aurelia-shop.webp",
                imageAlt: "Aurelia shop collection with category pills",
            },
            {
                title: "A product page that answers everything",
                body: "A four-image gallery on the left; on the right, brand, name, price, a short description, size and colour variants with unavailable options struck through, quantity, Add to cart and Buy it now, then shipping, returns and reviews. Stock is shown honestly rather than hidden.",
                image: "/assets/imgs/portfolio/aurelia-product.webp",
                imageAlt: "Aurelia product page with variants",
            },
            {
                title: "A stylist, not a chatbot",
                body: "The AI stylist is scoped to the tenant's own catalogue and brand voice: it suggests pieces for an occasion, answers fit and fabric questions and links straight to product pages. It lives as a quiet corner button so the store never feels interrupted.",
            },
            {
                title: "Editorial on a phone",
                body: "The hero keeps its full-bleed photography and both actions on a small screen; the collection becomes a two-column lookbook and the product page stacks gallery over details with the buy actions kept in reach — the same system, re-weighted for one hand.",
                image: "/assets/imgs/portfolio/aurelia-mobile.webp",
                imageAlt: "Aurelia on mobile",
                wide: true,
            },
        ],
        palette: [
            { name: "Powder blue", hex: "#85ACD6" },
            { name: "Ink", hex: "#1B1B1B" },
            { name: "Paper", hex: "#FEFEFE", ink: true },
            { name: "Stone", hex: "#F2F2F2", ink: true },
            { name: "Muted", hex: "#6B7280" },
        ],
        typeNote:
            "Poppins gives headlines and product names a modern, geometric confidence; Inter handles everything transactional. The store is deliberately near-monochrome — near-white paper, soft stone panels, dark ink — with one powder-blue accent for actions and the stylist, so the photography is always the most vivid element on the page.",
        components: ["Campaign hero", "Category pills & sort", "Product card with badges", "Gallery grid", "Variant selector", "Cart & checkout", "Order tracking", "AI stylist launcher"],
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
        goals: [
            { title: "One mark, every size", body: "A symbol that holds at favicon size and on a billboard, with a specified fallback for where the wordmark cannot fit." },
            { title: "Trust first", body: "A palette and type hierarchy that read as established and precise — the qualities a payments customer is actually buying." },
            { title: "A system, not a logo", body: "Patterns, icons and shapes derived from the mark's own geometry, so every application is recognisably TechNest." },
            { title: "Usable without a designer", body: "Rules clear enough to hand to a marketing team: formats, alignment, imagery and templates." },
        ],
        process: [
            { phase: "Discovery & positioning", body: "The positioning was fixed first — finance technology, explore the future — along with the two ideas the identity had to carry: a nest (connection, security) and growth, which became the recurring line “Grow and Expand” across the pattern applications." },
            { phase: "Mark construction", body: "The logo icon was built from four primitives — a dotted ring, a heavier dotted ring, a hexagon and a T — on a strict grid, then stress-tested at favicon, app-icon and print sizes. A standalone logo mark was specified for the places the full lockup cannot be portrayed." },
            { phase: "Colour & typography", body: "Deep Blue was set as the primary with Bright Turquoise as the single accent and Charcoal for text, each with a ten-step tint ramp. Corbel was specified for print, with Sora and DM Sans as Google Fonts equivalents for the web, and a headline / sub-headline / body / numeric hierarchy was defined for each face." },
            { phase: "Pattern, icon & application system", body: "Three patterns — Quand, Propel and Cuboid — were drawn from the hexagon and dot geometry, alongside a four-icon contact set in line and hex-badge styles and a polygon library. The system was then applied to stationery, an HTML email signature, social and display templates, merchandise and out-of-home." },
            { phase: "Guideline & handoff", body: "Everything was documented in a 34-page brand guideline — usage, formats, alignment, imagery direction — with mockups showing the identity in situ, so the client team could produce on-brand work independently." },
        ],
        highlights: [
            {
                title: "A mark built from four primitives",
                body: "A dotted ring, a heavier dotted ring, a hexagon and a T combine into the TechNest symbol: a nest of connected points around a stable core. The construction grid fixes every dot's position and spacing, so the mark can be redrawn at any size without drift, and the wordmark is set in a rounded geometric sans that echoes the dots.",
                image: "/assets/imgs/portfolio/technest-mark.webp",
                imageAlt: "TechNest logo construction grid and final lockups",
            },
            {
                title: "Lockups for every ground",
                body: "The primary logo is specified in two configurations — horizontal for headers and letterheads, stacked for splash screens and merchandise — and in three treatments: Deep Blue on white, white on Deep Blue and white on the brand gradient. Alignment guides accompany each, and the standalone mark is reserved for contexts where the wordmark cannot be shown.",
                image: "/assets/imgs/portfolio/technest-logo.webp",
                imageAlt: "TechNest primary logo and logo formats",
            },
            {
                title: "Two colours and a discipline",
                body: "Deep Blue #1D1D63 does most of the work: it is the ground for the logo, the stationery and the campaign layouts. Bright Turquoise #08F4ED is the single accent — a highlighted second line, the tail of a gradient — and Charcoal #333333 carries body text. Each colour ships with a ten-step tint ramp, so hierarchy can be built without introducing a fourth hue.",
                image: "/assets/imgs/portfolio/technest-colour.webp",
                imageAlt: "TechNest colour palette with tint ramps",
            },
            {
                title: "Type for print and for the web",
                body: "Corbel is the primary typeface for printed collateral, with Sora and DM Sans specified as Google Fonts equivalents for digital work, so the brand renders consistently on a letterhead, a landing page and a social post. Each face is documented with its available weights and a four-level hierarchy — headline in Bold, sub-headline in Medium, body in Regular — plus a numeric and symbol set for pricing and transaction data.",
                image: "/assets/imgs/portfolio/technest-type.webp",
                imageAlt: "TechNest typography specimen — Sora",
            },
            {
                title: "Three patterns from one geometry",
                body: "Quand tessellates the hexagon into a cube lattice; Propel scatters Deep Blue and Turquoise dots in a graded field that reads as data in motion; Cuboid draws the isometric wireframe of the same cube. Each pattern is derived from the mark's own primitives, so a background, a billboard edge or an envelope flap is recognisably TechNest before the logo appears.",
                image: "/assets/imgs/portfolio/technest-pattern.webp",
                imageAlt: "TechNest Propel pattern — Grow and Expand",
            },
            {
                title: "Stationery that carries the system",
                body: "Business card, ID card, letterhead and envelope share one construction: a Deep Blue face carrying the mark over the Quand pattern, and a white face for information, with contact details set against the hex-badge icon set. Dimensions and paper stock are specified for each, so print reproduction matches the digital brand.",
                image: "/assets/imgs/portfolio/technest-stationery.webp",
                imageAlt: "TechNest stationery — ID card, business cards and pen",
            },
            {
                title: "Templates a marketing team can run",
                body: "Social posts and digital banners follow a documented grid: primary logo top-right, a headline stack with Turquoise on the second line, a paragraph, a CTA and a photograph aligned to the right edge over the brand gradient. The layout is shown in landscape, portrait and square with the alignment rules annotated, so in-house marketers can produce on-brand work without a designer.",
                image: "/assets/imgs/portfolio/technest-campaign.webp",
                imageAlt: "TechNest digital banner templates",
            },
            {
                title: "Icons and polygons",
                body: "Four contact icons — location, phone, web, mail — in a line style and a hex-badge style, and a polygon library of shapes lifted from the mark. They give layouts a supporting vocabulary that stays inside the brand's geometry.",
            },
            {
                title: "Imagery: focus on the user",
                body: "Photography is directed toward the customer rather than the product — real people reacting to a moment on their phone, warm and candid — with the benefit to the user stated as the priority for every visual and written communication.",
            },
            {
                title: "From screen to street",
                body: "Merchandise, drinkware, a billboard and the email signature were mocked up to prove the system at both extremes of scale — a favicon-sized mark and a roadside board — before the guideline was signed off.",
            },
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
