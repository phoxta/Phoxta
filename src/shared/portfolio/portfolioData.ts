// Content for femi.phoxta.com — Oluwafemi Adeyemi's product-design portfolio.
// One module so copy lives in one place and the sections stay presentational.
// Pulled from the CV and kept to industry-standard portfolio phrasing.

export const PROFILE = {
    name: "Oluwafemi Adeyemi",
    shortName: "Femi Adeyemi",
    monogram: "OA",
    role: "Product Designer",
    disciplines: "UX Research · Design Systems · Prototyping · Front-end",
    location: "Birmingham, United Kingdom",
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
        contributions: [
            "Designed the multi-tenant operations console, marketplace and CRM, turning complex operator workflows into clear, task-focused screens.",
            "Built and maintain a Figma-to-React design system that keeps the web app, marketing site and emails consistent.",
            "Designed an AI social command centre (sentiment, forecasting, recommendations) and an AI graphics generator with layer decomposition and PSD export.",
            "Set up product analytics to measure feature adoption and feed insight back into prioritisation.",
        ],
        tags: ["SaaS", "Design System", "AI", "Front-end"],
        image: "/assets/imgs/pages/img-11.webp",
        tone: "dark",
        link: "https://www.phoxta.com",
    },
    {
        slug: "northern-light",
        name: "Northern Light School Division",
        kicker: "Internal HR platform",
        role: "Product Designer & Software Engineer (Contract)",
        period: "2025",
        summary:
            "A secure internal web app — timesheets, expenses and approvals — for a Canadian organisation of roughly 15,000 staff, designed and shipped to production.",
        contributions: [
            "Mapped employee and manager journeys, then designed role-based dashboards and approval flows that surface only what each user needs.",
            "Built responsive components in Tailwind, including dashboard analytics, data visualisation and animated statistics.",
            "Aligned the UX with Microsoft Entra ID single sign-on and row-level permissions, so people see only their own data.",
            "Owned delivery from prototype to production on Netlify — environment config and CI/CD included.",
        ],
        tags: ["Enterprise", "Dashboards", "SSO", "Delivery"],
        image: "/assets/imgs/pages/img-12.webp",
        tone: "light",
    },
    {
        slug: "healthtracka",
        name: "Healthtracka",
        kicker: "Consumer health product",
        role: "Digital Designer (UX/UI)",
        period: "2022 — 2023",
        summary:
            "Consumer health platform where I translated product concepts into flows, prototypes and a design system, validated with real users before build.",
        contributions: [
            "Turned concepts into user flows, journey maps, sketches and wireframes.",
            "Ran research with product and marketing — interviews, surveys and competitor analysis — to find real pain points.",
            "Built interactive prototypes and usability-tested them before development.",
            "Maintained a scalable design system for consistency across the product.",
        ],
        tags: ["Health", "Research", "Design System"],
        image: "/assets/imgs/pages/img-13.webp",
        tone: "light",
    },
    {
        slug: "mod-group",
        name: "MOD Group",
        kicker: "Brand & digital system",
        role: "Senior Digital Designer",
        period: "2020 — 2024",
        summary:
            "Led visual design strategy across MOD Group's subsidiaries and partners — campaign identities, web layouts and a modular framework that sped everything up.",
        contributions: [
            "Designed campaign identities, marketing visuals, website layouts and social content that strengthened brand recognition.",
            "Introduced a modular design framework and a structured feedback loop that cut iteration cycles.",
        ],
        tags: ["Brand", "Web", "Systems"],
        image: "/assets/imgs/pages/img-14.webp",
        tone: "dark",
    },
    {
        slug: "schneider-electric",
        name: "Schneider Electric",
        kicker: "West Africa UI localisation",
        role: "Digital & UI/UX Designer",
        period: "2019 — 2020",
        summary:
            "Localised application interfaces for the West Africa region and built the visual systems behind technical documentation and executive reporting.",
        contributions: [
            "Adapted app content and UI to regional user needs across the region.",
            "Developed wireframes, icons and infographics for documentation and training.",
            "Produced visual reports and presentations for C-level executives, and a standard template library that streamlined output.",
        ],
        tags: ["Enterprise", "Localisation", "Systems"],
        image: "/assets/imgs/pages/img-170.webp",
        tone: "light",
    },
    {
        slug: "artstanding",
        name: "Artstanding",
        kicker: "Creative technology studio",
        role: "Co-Founder & CTO",
        period: "2024 — 2025",
        summary:
            "Co-founded a studio delivering websites, digital products and creative-tech for clients, leading both the design and the engineering.",
        contributions: [
            "Led multidisciplinary design and engineering teams end to end.",
            "Set design and development standards, review processes and quality benchmarks.",
            "Introduced modern tooling and AI-assisted workflows that lifted quality and speed.",
        ],
        tags: ["Leadership", "Studio", "Delivery"],
        image: "/assets/imgs/pages/img-171.webp",
        tone: "dark",
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
    { title: "MSc International Business with Data Analytics", org: "Ulster University, Birmingham, UK", year: "2026" },
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
