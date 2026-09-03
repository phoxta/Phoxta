// Content for femi.phoxta.com — Oluwafemi Adeyemi's product-design portfolio.
// One module so copy lives in one place and the sections stay presentational.
// Pulled from the CV and kept to industry-standard portfolio phrasing.

export const PROFILE = {
    name: "Oluwafemi Adeyemi",
    shortName: "Femi Adeyemi",
    monogram: "OA",
    role: "Product Designer",
    disciplines: "UX Research · Design Systems · Prototyping · Front-end",
    location: "United Kingdom",
    availability: "Open to select product design work",
    // The one-line thesis at the top of the hero.
    headline: "I design digital products people actually use — and ship them.",
    // The supporting paragraph beneath it.
    lede:
        "Product designer with 7+ years taking software from research and wireframes through to polished, production-ready interfaces. I pair UX craft — user research, journey mapping, interactive prototyping and scalable design systems in Figma — with hands-on front-end (React, Next.js, TypeScript), so the thing I design is the thing that ships.",
    email: "adeyemioluwafemi2018@gmail.com",
    phone: "+44 7350 172153",
    phoneHref: "+447350172153",
    // Portrait lives in public/ so it ships as a static asset. Sections fall
    // back to the monogram if the file isn't present yet.
    photo: "/assets/imgs/portfolio/femi-adeyemi.webp",
} as const;

// Social links render only when a href is set — add the real URLs here and they
// appear in the header and contact section automatically.
export const SOCIALS: { label: string; href: string }[] = [
    { label: "LinkedIn", href: "https://linkedin.com/in/femi-adeyemi-564430142" },
    { label: "GitHub", href: "https://github.com/oluwafemiadeyemi?tab=repositories" },
];

export const STATS = [
    { value: "7+", label: "Years in product design" },
    { value: "6", label: "Industries shipped in" },
    { value: "15k", label: "Users on a tool I designed & built" },
    { value: "∞", label: "Design handed off as production code" },
] as const;

// Header + section anchors. Order is the on-page order.
export const NAV = [
    { id: "work", label: "Work" },
    { id: "about", label: "About" },
    { id: "capabilities", label: "Capabilities" },
    { id: "experience", label: "Experience" },
    { id: "contact", label: "Contact" },
] as const;

// Logo row / marquee — where the work has happened.
export const CLIENTS = [
    "Phoxta",
    "Northern Light School Division",
    "Artstanding",
    "MOD Group",
    "Healthtracka",
    "Schneider Electric",
] as const;

export type Capability = { title: string; body: string; points: string[] };
export const CAPABILITIES: Capability[] = [
    {
        title: "Product & UX Design",
        body: "End-to-end ownership from problem framing and user flows to high-fidelity, shipped UI.",
        points: ["Problem framing", "User flows", "Hi-fi UI", "Handoff"],
    },
    {
        title: "UX Research & Testing",
        body: "Interviews, surveys and usability testing that turn user behaviour into design decisions.",
        points: ["Interviews", "Usability testing", "Journey mapping", "Synthesis"],
    },
    {
        title: "Design Systems",
        body: "Scalable component libraries — Figma to React — that keep product, marketing and email consistent.",
        points: ["Tokens", "Components", "Documentation", "Governance"],
    },
    {
        title: "Prototyping & Interaction",
        body: "Interactive, feasibility-aware prototypes that validate ideas before a line of code is written.",
        points: ["Figma prototypes", "Micro-interactions", "Motion", "Validation"],
    },
    {
        title: "Front-end Engineering",
        body: "Hands-on with React, Next.js, TypeScript and Tailwind — I close the gap between design and build.",
        points: ["React / Next.js", "TypeScript", "Tailwind CSS", "Responsive"],
    },
    {
        title: "Data-Informed Strategy",
        body: "Product analytics and SQL to measure adoption, learn what works and prioritise what's next.",
        points: ["Product analytics", "SQL", "Adoption metrics", "Prioritisation"],
    },
];

export type Project = {
    slug: string;
    name: string;
    kicker: string;
    role: string;
    period: string;
    summary: string;
    /** One line for the Selected-work card — the screenshot does the talking. */
    blurb: string;
    contributions: string[];
    tags: string[];
    image: string;
    tone: "light" | "dark";
    /** A live URL for the project, when one exists publicly. */
    link?: string;
};

// Selected work, most recent first. Images are decorative texture from the
// shared asset library — not literal product screenshots.
export const PROJECTS: Project[] = [
    {
        slug: "phoxta",
        name: "Phoxta",
        kicker: "AI operations platform",
        role: "Founder & Lead Product Designer",
        period: "2025 — Now",
        summary:
            "An AI-powered SaaS platform for planning, launching and scaling a business. I own the product design end to end — from problem framing to the shipped interface — and build the front end alongside it.",
        blurb: "An AI-native platform that builds, clones and runs whole businesses — marketplace, storefronts and an operating console on one backend.",
        contributions: [
            "Designed the multi-tenant operations console, marketplace and CRM, turning complex operator workflows into clear, task-focused screens.",
            "Built and maintain a Figma-to-React design system that keeps the web app, marketing site and emails consistent.",
            "Designed an AI social command centre (sentiment, forecasting, recommendations) and an AI graphics generator with layer decomposition and PSD export.",
            "Set up product analytics to measure feature adoption and feed insight back into prioritisation.",
        ],
        tags: ["SaaS", "Design System", "AI", "Front-end"],
        image: "/assets/imgs/portfolio/phoxta-project.webp",
        tone: "dark",
        link: "/work/phoxta",
    },
    {
        slug: "coir-six",
        name: "Coir Six",
        kicker: "E-learning platform",
        role: "Product Designer",
        period: "2024",
        summary:
            "A learning-management dashboard that turns scattered course progress, mentors and schedules into one calm, glanceable home — designed to keep self-paced learners motivated and returning every day.",
        blurb: "A glance-first learning dashboard that shows self-paced students where they are, how they're doing and what's next.",
        contributions: [
            "Designed the learner home end to end — goal tracking, continue-watching, mentors and lessons — around a single glance-first hierarchy.",
            "Built a lilac-led design system: reusable stat cards, course cards and a data-viz language for study streaks and weekly progress.",
            "Made it fully responsive — the three-pane desktop console reflows into a focused, thumb-friendly mobile app with a bottom tab bar.",
        ],
        tags: ["Product Design", "Design System", "Dashboard", "Responsive"],
        image: "/assets/imgs/portfolio/coir-six.webp",
        tone: "light",
        link: "/work/coir-six",
    },
    {
        slug: "ferne",
        name: "Ferne",
        kicker: "Botanical skincare storefront",
        role: "Product & Web Designer",
        period: "2024",
        summary:
            "The full storefront for a traceable, small-batch skincare brand — an editorial homepage, a faceted shop, rich product pages and a friction-light cart-to-checkout flow. A complete, shoppable experience, not a landing page.",
        blurb: "A complete botanical-skincare storefront — editorial home, faceted shop, rich product pages and a three-step checkout.",
        contributions: [
            "Designed and built the complete storefront — ten page types from homepage to order confirmation — as one coherent editorial brand.",
            "Built a data-driven, faceted catalogue (filter by concern, category, price, refillability) with live search, a ⌘K command palette and a mini-cart drawer.",
            "Shipped a considered product page (size variants, honest stock, farm-traced ingredients, reviews) and a validated three-step checkout that never stalls.",
        ],
        tags: ["E-commerce", "Web Design", "Design System", "Front-end"],
        image: "/assets/imgs/portfolio/ferne.webp",
        tone: "light",
        link: "/work/ferne",
    },
    {
        slug: "saveur",
        name: "Saveur",
        kicker: "Restaurant ordering & reservations",
        role: "Lead Product Designer · Phoxta",
        period: "2026",
        summary:
            "A digital-first restaurant storefront — online ordering for pickup and dine-in, table reservations, special-order quotes, live order tracking and an AI concierge — designed as a cloneable Phoxta blueprint.",
        blurb: "A restaurant storefront with online ordering, table reservations, catering quotes, live order tracking and an AI concierge.",
        contributions: [
            "Designed the full guest journey — menu to bag to tracked order — plus reservations and special-order requests, as seven page types on one editorial system.",
            "Turned the menu into a product catalogue with course and dietary filters, so ordering happens in a scroll rather than a phone call.",
            "Built the order-status timeline and wired the AI concierge to it, so “where's my food?” is answered without staff.",
        ],
        tags: ["Restaurant", "E-commerce", "Bookings", "AI"],
        image: "/assets/imgs/portfolio/saveur.webp",
        tone: "dark",
        link: "/work/saveur",
    },
    {
        slug: "wander",
        name: "Wander",
        kicker: "Experiences booking platform",
        role: "Lead Product Designer · Phoxta",
        period: "2026",
        summary:
            "A guide-led experiences marketplace — search by place, dates and guests, filter thousands of listings, book from the detail page and get help from an AI trip assistant — built as a Phoxta blueprint.",
        blurb: "An experiences booking site — search by place, dates and guests, browse thousands of listings and book with an AI trip assistant on hand.",
        contributions: [
            "Reduced the whole interface to three inputs — where, when, how many — and designed results that compare price, duration, group size and rating at a glance.",
            "Designed the listing page around a booking card that stays in reach, so reserving feels as light as saving to a wishlist.",
            "Shipped the responsive system — a thumb-first mobile layout with a bottom tab bar — and the per-tenant branding that lets the same product run as any brand.",
        ],
        tags: ["Travel", "Bookings", "Marketplace", "AI"],
        image: "/assets/imgs/portfolio/wander.webp",
        tone: "light",
        link: "/work/wander",
    },
    {
        slug: "aurelia",
        name: "Aurelia",
        kicker: "Fashion e-commerce storefront",
        role: "Lead Product Designer · Phoxta",
        period: "2026",
        summary:
            "A modern fashion store — editorial home, filterable collection, product pages with variants, cart, checkout and an AI stylist — running as a multi-tenant Phoxta blueprint that every buyer gets as their own branded copy.",
        blurb: "A modern fashion store — editorial collection, product pages with variants, cart and checkout, and an AI stylist that helps you choose.",
        contributions: [
            "Designed an editorial storefront that reads like a campaign, not a template — hero, lookbook-style collection and calm product pages.",
            "Specified the product page to answer everything a considered buy needs: sizes, colours, stock, shipping, returns and reviews in one scroll.",
            "Made it genuinely multi-tenant — each buyer's copy resolves by hostname, seeds its own catalogue and applies its own branding, with orders flowing into the console.",
        ],
        tags: ["Fashion", "E-commerce", "Multi-tenant", "AI"],
        image: "/assets/imgs/portfolio/aurelia.webp",
        tone: "light",
        link: "/work/aurelia",
    },
];

export type Role = { company: string; title: string; period: string; location: string; blurb: string };
export const EXPERIENCE: Role[] = [
    {
        company: "Phoxta",
        title: "Founder & Lead Product Designer",
        period: "Oct 2025 — Present",
        location: "United Kingdom",
        blurb: "Own end-to-end design for an AI-powered SaaS platform — from problem framing to shipped UI — and build the front end alongside it.",
    },
    {
        company: "Northern Light School Division",
        title: "Product Designer & Software Engineer (Contract)",
        period: "Jan 2025 — Mar 2025",
        location: "Canada (Remote)",
        blurb: "Designed and built a secure internal HR web app for ~15,000 staff, from prototype to production.",
    },
    {
        company: "Artstanding Creative Agency",
        title: "Co-Founder & CTO",
        period: "Mar 2024 — May 2025",
        location: "Lagos, Nigeria",
        blurb: "Led design and engineering teams delivering products and platforms, and set the standards they worked to.",
    },
    {
        company: "MOD Group",
        title: "Senior Digital Designer",
        period: "Dec 2020 — Feb 2024",
        location: "Lagos, Nigeria",
        blurb: "Drove visual design strategy across subsidiaries and introduced a modular framework that cut iteration cycles.",
    },
    {
        company: "Healthtracka",
        title: "Digital Designer (UX/UI)",
        period: "Jul 2022 — Mar 2023",
        location: "Lagos, Nigeria",
        blurb: "Took a consumer health product from concept to validated, prototyped, systemised UI.",
    },
    {
        company: "Schneider Electric",
        title: "Digital & UI/UX Designer",
        period: "Jan 2019 — Oct 2020",
        location: "Lagos, Nigeria",
        blurb: "Localised interfaces for West Africa and built the visual systems behind docs and executive reporting.",
    },
];

export const SKILL_GROUPS: { label: string; skills: string[] }[] = [
    {
        label: "Design",
        skills: ["Figma & FigJam", "Adobe Creative Suite", "Interaction & Visual (UI) Design", "Design Systems & Component Libraries", "Interactive Prototyping", "Accessibility & Responsive Design"],
    },
    {
        label: "Research & Strategy",
        skills: ["User Research & Usability Testing", "User Flows & Journey Mapping", "Wireframing & Information Architecture", "Product Analytics & SQL", "Data-Informed Product Strategy", "AI-Assisted Design Workflows"],
    },
    {
        label: "Engineering & Delivery",
        skills: ["HTML, CSS & Tailwind", "React, Next.js & TypeScript", "Agile, Project & Risk Management", "Cross-Functional Collaboration"],
    },
];

export const EDUCATION = [
    { title: "MSc International Business with Data Analytics", org: "Ulster University, UK", year: "2026" },
    { title: "BSc Mathematics", org: "University of Ibadan, Nigeria", year: "2016" },
] as const;

export const CERTIFICATIONS = [
    { title: "Applied AI and Data Science", org: "MIT Professional Education", year: "2026" },
    { title: "AI Engineering with LangChain", org: "DataCamp", year: "2026" },
    { title: "Python", org: "DataCamp", year: "2025" },
    { title: "Design Thinking", org: "Interaction Design Foundation (IxDF)", year: "2022" },
    { title: "Human–Computer Interaction", org: "Interaction Design Foundation (IxDF)", year: "2022" },
    { title: "Project Management Professional", org: "Stack Skills", year: "2020" },
    { title: "Risk Management Professional", org: "Stack Skills", year: "2020" },
] as const;

// femi.phoxta.com is the canonical home of this portfolio.
export const PORTFOLIO_URL = "https://femi.phoxta.com/";
