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
        slug: "coir-six",
        name: "Coir Six",
        kicker: "E-learning platform · Product Design",
        tagline: "A calm, glance-first learning dashboard that keeps self-paced students coming back.",
        summary:
            "Coir Six is an online-learning platform where the hardest problem isn't the content — it's momentum. I designed the learner's home: a single screen that answers “where was I, how am I doing, and what's next?” the moment it loads, and holds its shape from a three-pane desktop console down to a one-handed mobile app.",
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
            "Ferne is a small-batch botanical skincare brand whose whole promise is traceability — every active tied to a farm you can name. I designed and built the full storefront: an editorial homepage, a faceted shop, rich product pages and a friction-light cart-to-confirmation flow. A complete, shoppable experience — not a landing page.",
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
                body: "Faceted filters — category, concern, price, stock, refillable — plus sort, live search and deep links (?cat=face). The catalogue is data-driven, so it swaps to a real commerce API without the UI changing.",
                image: "/assets/imgs/portfolio/ferne-shop.webp",
                imageAlt: "Ferne shop with faceted filters",
            },
            {
                title: "A product page built for a considered buy",
                body: "Gallery, size variants with live pricing, honest stock (“ships today before 2pm”), a full ingredient list traced to farm, a rating breakdown and write-a-review — plus a mobile sticky buy-bar so the action is always in reach.",
                image: "/assets/imgs/portfolio/ferne-product.webp",
                imageAlt: "Ferne product page",
            },
            {
                title: "Cart to confirmation, no dead ends",
                body: "The cart has line editing, save-for-later, promo codes and a free-delivery progress bar; the checkout is three steps with real validation (email, UK postcode, card) and a receipt-style confirmation. Cart, wishlist and orders persist, so nothing is ever lost.",
            },
            {
                title: "One brand, every breakpoint",
                body: "A sticky header, mini-cart and menu drawers, a ⌘K search palette and toasts tie the store together; below 768px it becomes a clean, thumb-first mobile shop — the same system, re-weighted for one hand.",
                image: "/assets/imgs/portfolio/ferne-mobile.webp",
                imageAlt: "Ferne responsive mobile storefront",
                wide: true,
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
];

export const findCaseStudy = (slug?: string): CaseStudy | undefined =>
    CASE_STUDIES.find((c) => c.slug === slug);
