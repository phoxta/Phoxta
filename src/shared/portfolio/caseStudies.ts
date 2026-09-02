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
    outcome: string[];
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
            { name: "Primary", hex: "#6C5DD3" },
            { name: "Primary soft", hex: "#EEEBFB", ink: true },
            { name: "Ink", hex: "#1B1B23" },
            { name: "Page", hex: "#F6F6FA", ink: true },
            { name: "Accent warm", hex: "#E5623B" },
        ],
        typeNote:
            "Plus Jakarta Sans throughout, on a tight 12 / 14 / 16 / 20 / 30px scale. Captions stay muted and quiet; headings carry weight without shouting — the type does the ranking so the layout doesn't have to.",
        components: ["Stat card", "Course card", "Colour-coded avatar system", "Completion ring & bar chart", "Category & type pills", "Left nav rail", "Mobile tab bar"],
        outcome: [
            "The three-intent hierarchy held up on both breakpoints with no special-casing — proof it was the structure, not the specific layout, doing the work.",
            "Prototyping in real HTML/CSS caught spacing and reflow issues Figma had hidden, and handed engineering a build-ready front-end reference instead of a redline.",
            "Clear next steps: an onboarding empty-state for brand-new learners and a streak-recovery flow, so motivation survives a missed day.",
        ],
    },
];

export const findCaseStudy = (slug?: string): CaseStudy | undefined =>
    CASE_STUDIES.find((c) => c.slug === slug);
