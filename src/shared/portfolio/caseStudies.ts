// Long-form project case studies for femi.phoxta.com/work/:slug.
// One entry per project that has a dedicated study page. Content follows a
// standard product-design case-study spine: context → challenge → goals →
// process → design decisions → system → outcome.

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
    designSystemImage?: string;
    designSystemBlurb?: string;
    outcome?: string[];
};

export const CASE_STUDIES: CaseStudy[] = [
    {
        slug: "phoxta",
        name: "Phoxta",
        kicker: "AI business platform · Product Design",
        tagline: "An AI-native platform that turns starting a business into choosing one — designed and built end to end.",
        summary:
            "Phoxta builds complete, ready-to-run businesses — storefronts, bookings, content sites — on one shared backend, packages each as a cloneable blueprint and sells it in a marketplace. Every buyer gets a working, AI-operated company on day one. As founder and lead product designer I own the whole surface — the marketing site, the marketplace, the owner dashboard and the multi-tenant operating console — and build the React front end that ships it.",
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
            "Shopify, WordPress and Salesforce are tools, not businesses — the buyer still has to assemble everything and design the AI layer themselves. Phoxta's promise is the opposite: a business that already works. That sets a hard design bar. A first-time owner has to understand what they've bought in one screen, run CRM, commerce, content, inbox and automations without training, and trust an AI operator to act on their behalf — while operators, buyers and investors all share one product without ever seeing each other's data.",
        goals: [
            { title: "Own it in one screen", body: "The dashboard answers “what do I own, is it live, what needs me?” before the owner scrolls." },
            { title: "One console, every business", body: "CRM, commerce, content, engagement and billing as one config-driven console — the same UI for a restaurant and a fashion store." },
            { title: "AI you can delegate to", body: "An operator that reads, drafts and acts — inside explicit permissions, approvals and an audit trail." },
            { title: "Design that ships", body: "A Figma-to-React system so the site, console and emails stay one brand while a small team moves fast." },
        ],
        process: [
            { phase: "Research & positioning", body: "Phoxta started from watching three capable friends fail to launch — none needed a website builder; all needed a running business they could rebrand. I mapped what a buyer actually needs on day one, then benchmarked site builders, commerce platforms and the new wave of AI-agent products to find where “AI-native” could be structural rather than a feature." },
            { phase: "Information architecture", body: "Split the product into three surfaces on one core — public storefronts, the marketplace and the management console — and modelled the console as modules keyed by business type. A vertical is “which modules are on and how the site is composed”, not a new design." },
            { phase: "Design system", body: "Built the system in Figma and shipped it as React: tokens, a pill-and-card language, one-line page headers with tabs, a distinct console theme, and shared empty / loading / approval states reused across roughly thirty dashboard tabs — so a new feature looks native the day it lands." },
            { phase: "Build, measure, iterate", body: "Designed in code alongside the build — React, TypeScript, Supabase — so prototypes became production. Every AI feature is metered and capped per business, which means the design of a feature includes what it costs, and usage feeds what gets built next." },
        ],
        highlights: [
            {
                title: "A front door that sells the outcome, not the software",
                body: "The cover above is the whole pitch in one screen: “Own a business that already works.” over a shelf of live blueprints and the categories you can buy into — no feature grid, no jargon. The site's job is to make the promise credible within a scroll and hand the visitor to the marketplace; the product proves itself once they're inside.",
            },
            {
                title: "A home that reads like ownership — with an operator that acts",
                body: "The owner's dashboard opens with what they own, whether it's live and what needs them, and the AI operator sits in the middle as a conversation rather than a widget. It isn't a chatbot: it has governed write tools, each set to off, ask-me or autopilot, an approval queue with the reasoning attached, and daily limits on actions, calls and emails. Owners can run it from Telegram without opening the dashboard at all.",
            },
            {
                title: "A console that works like a task board",
                body: "Every business runs from the same config-driven console — Overview, Engage, CRM, Invoicing, Help Center, Graphics, Operator, Settings. Inbox conversations, marketing emails and voice calls land in one board by status, so the owner triages by glance instead of by app. Panels and terminology switch per business type.",
            },
            {
                title: "A content studio for non-designers",
                body: "Graphics turns a brand into a month of social posts: eighteen template families, an AI planner that writes the strategy and captions in the business's own voice, a schedule calendar and a pro SVG canvas for edits. It's the surface owners touch most, so it got the most polish.",
            },
            {
                title: "A marketplace of businesses — and the storefronts behind it",
                body: "Each blueprint is a live, verified business with a demo you can click through and a one-time price: a fashion store, a restaurant with orders, a car rental, guided experiences, a furniture shop. They are separate brands on one tenant-scoped API — products, orders and bookings flow straight into the console, each gets its own AI stylist, concierge or trip assistant, and branding is data applied when the domain resolves.",
            },
            {
                title: "Built for the phone in the pocket",
                body: "The site and console are responsive by system, not by exception: the hero, blueprint shelf and category chips reflow to a thumb-first layout, and the dashboard's one-line header-plus-tabs pattern keeps every console tab usable on a small screen.",
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
            "DM Sans carries the marketing site — big, tight display sizes on a neutral scale from near-black to off-white — with one Phoxta orange reserved for actions and proof. The console switches to Figtree on a cooler white ground with a blue primary, so running a business feels distinct from buying one while staying the same family: pills, full-round radii, one-line headers with tabs, hairline borders.",
        components: ["Pill nav & tabs", "One-line page header", "Business card", "Kanban board", "Operator chat & approval queue", "Stat & setup cards", "Blueprint card", "Config-driven console modules", "Empty / loading / approval states"],
    },
    {
        slug: "coir-six",
        name: "Coir Six",
        kicker: "E-learning platform · Product Design",
        tagline: "A calm, glance-first learning dashboard that keeps self-paced students coming back.",
        summary:
            "Coir Six is a self-initiated concept: an online-learning platform where the hardest problem isn't the content — it's momentum. I designed the learner's home: a single screen that answers “where was I, how am I doing, and what's next?” the moment it loads, and holds its shape from a three-pane desktop console down to a one-handed mobile app.",
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
            "Self-paced learners drop off the moment a platform makes them work to find their place. The early Coir Six dashboard buried progress inside a profile, gave five different content types the same visual weight, and offered no reason to come back tomorrow. The brief was to turn the home screen into a daily habit — motivating, instantly legible, and honest about how far along you actually are.",
        goals: [
            { title: "Resume in a glance", body: "Answer “where was I?” in under a second — the learner should continue, never re-navigate." },
            { title: "Make progress felt", body: "Surface effort as visible momentum, not a number hidden two screens deep." },
            { title: "One clear rhythm", body: "Give every content type — courses, lessons, mentors — a scannable, predictable place." },
            { title: "Hold on any screen", body: "The same hierarchy has to work at 1440px and at 390px, one-handed." },
        ],
        process: [
            { phase: "Research & audit", body: "Mapped the self-paced learner journey and audited how Coursera, Skillshare and Datacamp handle a returning student. What worked everywhere: a persistent progress anchor and a single “continue” shortcut. What didn't: dense card grids with no hierarchy and progress locked away in settings." },
            { phase: "Information architecture", body: "Reorganised everything into three intents — Navigate, Do, and Track & connect — and gave each its own column, so the eye always knows which region answers which question before it reads a word." },
            { phase: "Wireframes", body: "Low-fidelity layouts pressure-tested the three-pane balance and, just as importantly, the mobile reflow — settling column widths and what survives the collapse to a phone before any colour went down." },
            { phase: "Visual design & prototype", body: "A lilac-led visual system, then a working HTML/CSS prototype to test real spacing, motion and the responsive breakpoints in a browser — which doubled as a clean front-end reference for engineering." },
        ],
        highlights: [
            {
                title: "One screen, three intents",
                body: "Navigation lives on the left, the day's work sits in the centre, and progress and people stay pinned to the right. Splitting the home by intent — not by feature — means the learner never hunts across the page for their place; each column has a job and keeps to it.",
                image: "/assets/imgs/portfolio/coir-six.webp",
                imageAlt: "Coir Six three-pane dashboard layout",
            },
            {
                title: "Progress you can feel",
                body: "A single completion ring, a weekly study-time chart and per-track “watched” counters turn invisible effort into visible momentum. The ring wraps the learner's own avatar, so progress feels personal — and it's the quiet reason to open the app again tomorrow.",
            },
            {
                title: "Continue, don't restart",
                body: "The most-used action gets the most space. Resumable course cards lead with a live progress bar and the mentor behind each one, so picking up where you left off is the path of least resistance — a horizontal, swipeable shelf rather than a wall of choices.",
            },
            {
                title: "A social layer that motivates",
                body: "Mentors and friends keep self-paced learning from feeling solitary. Following, quick messages and “your mentor” live one tap away on the right rail — present enough to encourage, quiet enough never to crowd the actual work.",
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
            "Everything on the screens traces back to one source of truth. I documented Coir Six as a full design system — four founding principles, tokenised colour, type, spacing, radius and elevation, a component library (buttons, inputs, tags, avatars, cards, navigation and data-viz) and the page + responsive patterns — and exported the tokens as CSS variables and JSON so a new feature feels native on day one.",
    },
    {
        slug: "ferne",
        name: "Ferne",
        kicker: "Skincare e-commerce · Product & Web Design",
        tagline: "A botanical skincare storefront built to earn trust and convert — from the hero to the last step of checkout.",
        summary:
            "Ferne is a self-initiated concept for a small-batch botanical skincare brand whose whole promise is traceability — every active tied to a farm you can name. I designed and built the full storefront: an editorial homepage, a faceted shop, rich product pages and a friction-light cart-to-confirmation flow. A complete, shoppable experience — not a landing page.",
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
            "Premium skincare lives or dies on trust and flow. Shoppers bounce when a store feels generic, hides the “why”, or turns buying into a chore. Ferne's brand rests on one claim — traceable, farm-named ingredients — so the storefront had to make that credible on every screen and then get out of the way, turning browsing into a bag and a bag into a confirmed order without a single stumble.",
        goals: [
            { title: "Make the promise felt", body: "Put traceability — farms, batch numbers, provenance — where it reassures, never where it clutters." },
            { title: "Browse without friction", body: "A shop that filters, sorts and searches the way a real catalogue is used — by concern, category, price, stock." },
            { title: "A product page that sells", body: "Everything a considered purchase needs — variants, honest stock, reviews, ingredients — in one calm scroll." },
            { title: "Checkout that never stalls", body: "Carry the shopper from cart to confirmation with real validation, clear costs and zero dead ends." },
        ],
        process: [
            { phase: "Brand & foundations", body: "Set the voice — warm, plain-spoken, editorial — and a token system (sage on warm sand, Fraunces + Manrope) before a single page, so every screen would read as one brand." },
            { phase: "Journeys & IA", body: "Mapped the real shopper paths — discover → compare → decide → buy → return — and structured ten page types around them (home, shop, product, cart, checkout, order, account, journal, about, contact)." },
            { phase: "Interaction & prototype", body: "Designed the flows, then built them as a working front end — data-driven catalogue, cart, wishlist, promo codes, ⌘K search, mini-cart drawer — to test the whole journey in a browser, not just static frames." },
            { phase: "Systemise & harden", body: "Componentised product cards, drawers, filters and forms; wrote the responsive rules (tablet ≤1100, mobile ≤768) and the form validation so the store holds together on any device." },
        ],
        highlights: [
            {
                title: "An editorial hero that says why",
                body: "The homepage opens with a serif promise and the product in-hand — not a slider — then a trust row (dermatologist-tested, traceable, refillable glass) and a marquee of proof points that back the botanical claim before the first scroll.",
                image: "/assets/imgs/portfolio/ferne.webp",
                imageAlt: "Ferne homepage hero",
            },
            {
                title: "A shop that works like a catalogue",
                body: "Faceted filters — category, skin concern, price, stock, refillable — sit in a quiet left rail with live counts, while every card leads with the product, an “Add to bag” and the price, then the name, a one-line promise and the size. The catalogue is data-driven, so it swaps to a real commerce API without the UI changing.",
                image: "/assets/imgs/portfolio/ferne-shop.webp",
                imageAlt: "Ferne shop with faceted filters",
            },
            {
                title: "A best-sellers shelf that sells the routine",
                body: "On the homepage the four best-sellers sit under one clinical, plant-led promise — calm, hydrate and rebuild the skin barrier — with The Ritual Set bundling cleanse, treat and seal. Each card shares the shop's anatomy, so a shopper can add to bag without leaving the home page, or step across to “Shop all products”.",
                image: "/assets/imgs/portfolio/ferne-bestsellers.webp",
                imageAlt: "Ferne best-sellers shelf",
            },
            {
                title: "A product page built for a considered buy",
                body: "Gallery, size variants with live pricing, honest stock (“ships today before 2pm”), a full ingredient list traced to farm, a rating breakdown and write-a-review — plus a mobile sticky buy-bar so the action is always in reach.",
            },
            {
                title: "Cart to confirmation, no dead ends",
                body: "The cart has line editing, save-for-later, promo codes and a free-delivery progress bar; the checkout is three steps with real validation (email, UK postcode, card) and a receipt-style confirmation. Cart, wishlist and orders persist, so nothing is ever lost.",
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
        tagline: "A restaurant site that takes the order, books the table and answers the phone.",
        summary:
            "Saveur is Phoxta's restaurant blueprint: a digital-first kitchen with online ordering for pickup and dine-in, table reservations, special-order quotes for catering and events, live order tracking and an AI concierge that knows where your food is. I designed the whole guest journey — seven page types on one editorial system — and the data model that lets it clone for the next restaurant.",
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
            "Most restaurant websites are a PDF menu and a phone number, so the actual ordering happens on delivery apps that take a commission and keep the customer relationship. The brief was to make ordering, reserving and asking a question as easy as the big apps — but on the restaurant's own domain, in its own voice, with every order, booking and request landing with the owner instead of a marketplace.",
        goals: [
            { title: "Order in a scroll", body: "A menu that filters by course and diet and adds to a bag without leaving the page — no PDF, no phone call." },
            { title: "Book a table without a call", body: "Reservations and special orders — catering, bulk, custom bakes, events — as short forms that come back with a confirmation or a quote." },
            { title: "Never wonder where the food is", body: "A live order-status timeline with an honest ETA, and a concierge that can answer “where's my order?” without staff." },
            { title: "One kitchen, one console", body: "Menu items are products, orders are orders — everything runs from the same Phoxta console the owner already uses." },
        ],
        process: [
            { phase: "Journeys & IA", body: "Mapped the four real guest journeys — order for pickup or dine-in, reserve, request something special, track — and structured seven page types around them: home, menu, special orders, reservations, track, contact and account." },
            { phase: "Brand & foundations", body: "Set an editorial, evening-service tone: Playfair Display headlines over dark photographic heroes, Inter for menus and forms, warm cream pages, burgundy for the order action and copper for the highlight." },
            { phase: "Interaction & build", body: "Built the menu as a filterable catalogue with a bag, the reservation and special-order forms with real validation, the order-tracking timeline and the concierge launcher — as a working React storefront, not static frames." },
            { phase: "Blueprint & harden", body: "Made everything data-driven — dishes as products, requests as records, branding as tenant data — and wrote the responsive rules, so the same site clones cleanly for the next restaurant." },
        ],
        highlights: [
            {
                title: "A menu built to be ordered from",
                body: "Courses as pills, dietary filters a click away, GF/DF/V badges on each dish and a single “Add” on every row. Photography stays small and consistent so the list scans like a menu and works like a shop — the bag follows the guest around the site.",
                image: "/assets/imgs/portfolio/saveur-menu.webp",
                imageAlt: "Saveur menu with course and dietary filters",
            },
            {
                title: "Special orders without the phone tag",
                body: "Catering, bulk orders, custom bakes and private events share one request flow: pick the type, say when, how many and roughly how much, and the kitchen comes back with a quote. Everyday orders are nudged back to the menu, because that's faster for everyone.",
                image: "/assets/imgs/portfolio/saveur-special.webp",
                imageAlt: "Saveur special orders request form",
            },
            {
                title: "Track it like a parcel",
                body: "Received → In the kitchen → Ready → Completed, with an estimated time and the current step called out. The concierge in the corner knows the order status, so the question that used to interrupt the pass now answers itself.",
                image: "/assets/imgs/portfolio/saveur-track.webp",
                imageAlt: "Saveur live order tracking",
            },
            {
                title: "A concierge that knows the room",
                body: "The AI concierge is trained on the menu, hours and policies, and can see live order status — so it answers allergen questions, suggests a dish and tells a guest their food is packed, in the restaurant's own tone. Anything it can't answer goes to the owner's inbox.",
            },
            {
                title: "One-handed at the table",
                body: "Below the tablet breakpoint the hero, menu and forms reflow to a single thumb-first column with full-width actions — order, reserve and concierge always in reach — because half of restaurant traffic arrives from a phone at the table or on the way home.",
                image: "/assets/imgs/portfolio/saveur-mobile.webp",
                imageAlt: "Saveur on mobile",
                wide: true,
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
            "Playfair Display carries headlines and dish names for an evening-service, white-tablecloth feel; Inter keeps menus, forms and the tracking timeline crisp. Pages sit on warm cream, heroes on dark photography, and colour is reserved for two jobs: burgundy for the order action, copper for the highlight and the concierge.",
        components: ["Menu row with dietary badges", "Course & dietary filter pills", "Bag", "Reservation form", "Special-order request", "Order-status timeline", "Concierge launcher"],
    },
    {
        slug: "wander",
        name: "Wander",
        kicker: "Experiences booking · Product Design",
        tagline: "Find, compare and book a guide-led experience — with a trip assistant a tap away.",
        summary:
            "Wander is Phoxta's experiences blueprint: a marketplace of guide-led activities where travellers search by place, dates and guests, filter thousands of listings and book from the detail page. The demo tenant runs as “Ceepii” — the same product, rebranded through data. I designed the search, listing and booking journey and the responsive system around it.",
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
            "Experience marketplaces are dense: dozens of filters, cards that all look alike and a booking step buried under the fold. Travellers arrive with three things in mind — where, when and how many — so the brief was to make those three the entire interface, keep listings comparable at a glance, and make booking on the detail page feel as light as saving something to a wishlist.",
        goals: [
            { title: "Three inputs, then results", body: "Location, dates and guests as one pill — the search is the hero, and everything else waits until you've answered it." },
            { title: "Cards you can compare", body: "Price per guest, duration, group size and rating in the same place on every card, so choosing is a scan rather than a study." },
            { title: "Book without leaving the page", body: "A booking card that stays in reach beside the gallery — date, guests, name, email — and a request that lands with the host." },
            { title: "Help on every screen", body: "An “Ask us” trip assistant available everywhere, trained on the listings, so questions never dead-end." },
        ],
        process: [
            { phase: "Research & IA", body: "Benchmarked the leading experience marketplaces and mapped the traveller's path — inspire, search, compare, decide, book, keep — into home, search, category, listing, wishlist, blog and contact pages, with hosts as first-class objects." },
            { phase: "Design system", body: "A bright, optimistic kit: Sora headlines with an italic serif accent, Inter for UI, a vivid sky blue as the single brand colour, pill search and filter chips with counts, and one card anatomy reused for listings, categories and hosts." },
            { phase: "Interaction & build", body: "Built the search pill, filters, paginated results, the listing page with gallery and booking card, wishlists and the assistant as a working storefront on Phoxta's shared bookings model — availability and reservation requests come from the same backend as every other Phoxta business." },
            { phase: "Responsive & tenancy", body: "Wrote the mobile rules — a bottom tab bar for Home, Wishlists and Account, a compact search at the top — and made branding tenant data, which is why the demo runs as Ceepii without a line of code changing." },
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
                body: "Every experience card carries the same five facts in the same places — a badge, the title, the meeting point, chips for duration and group size, then price per guest and rating. Shelves like “Experiences in Osaka” scroll sideways behind paired arrows, so a traveller skims eight thousand listings the way they'd skim a shelf.",
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
                body: "City cards — Mexico City, Ljubljana, Baceno, Wellington — carry a live count of available experiences and open straight into a category page that behaves exactly like search results. It gives the marketing team landing pages, and gives travellers a way in when they don't yet know what to type.",
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
            "Sora gives headlines a rounded, friendly confidence; an italic serif is used for exactly one word per headline; Inter runs everything else. One saturated sky blue does the branding on its own, with mint reserved for the assistant and the search action, so the photography in the cards stays the most colourful thing on the page.",
        components: ["Search pill (location · dates · guests)", "Filter chips with counts", "Experience card", "Photo gallery", "Booking card", "Host badge", "Wishlist heart", "Bottom tab bar"],
    },
    {
        slug: "aurelia",
        name: "Aurelia",
        kicker: "Fashion e-commerce · Product Design",
        tagline: "A considered fashion store with an AI stylist — on a backend it shares with every other Phoxta business.",
        summary:
            "Aurelia is Phoxta's flagship fashion blueprint: an editorial storefront with a filterable collection, product pages with size and colour variants, cart, checkout, order tracking and an AI stylist. It is a real multi-tenant store — each buyer's copy resolves by hostname, seeds its own catalogue and applies its own branding — and products and orders flow straight into the operating console.",
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
            "Fashion e-commerce lives on imagery and dies on friction. The store had to look like a campaign rather than a template, hold up with any catalogue — because it is cloned for many buyers, each with different products — and help a shopper choose without stealing the show. The brief: editorial first, no dead ends from hero to order confirmation, and an AI stylist that feels like a service, not a widget.",
        goals: [
            { title: "Editorial first", body: "A hero and collection that read like a lookbook — big photography, quiet type, one accent." },
            { title: "Any catalogue, same store", body: "Cards, filters and product pages that stay composed whether a tenant sells twelve pieces or twelve hundred." },
            { title: "A product page that answers everything", body: "Sizes, colours, stock, shipping, returns, reviews and the stylist — in one scroll, with the buy action always visible." },
            { title: "Help choosing, on demand", body: "An AI stylist trained on the tenant's own catalogue, one tap away on every page and silent until asked." },
        ],
        process: [
            { phase: "Brand & tokens", body: "Poppins for headlines, Inter for UI, near-white paper and a single powder-blue accent for actions — a palette that steps back so product photography carries the store, and that tenants can swap through branding data." },
            { phase: "Journeys & IA", body: "Mapped discover → browse → decide → buy → track into home, shop, product, cart, checkout, track-order, about, contact and account, with Women / Men / New In / Sale as the only top-level filters." },
            { phase: "Interaction & build", body: "Built the campaign hero, the collection with category pills and sort, the product page with variants, stock badges and quantity, the cart-to-checkout flow, order tracking and the stylist launcher as a working React storefront." },
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
                body: "A collection banner, then Women / Men / New In / Sale pills, a sort control and a clean grid with New and Sale badges. Everything is data-driven, so a tenant with a different catalogue gets the same composure — the layout never depends on how many products there are.",
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
];

export const findCaseStudy = (slug?: string): CaseStudy | undefined =>
    CASE_STUDIES.find((c) => c.slug === slug);
