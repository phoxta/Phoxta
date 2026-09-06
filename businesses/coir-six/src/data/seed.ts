import type {
    Catalogue,
    Category,
    Course,
    Friend,
    Group,
    Lesson,
    LiveLesson,
    Mentor,
    Module,
    QuizQuestion,
    UserState,
} from "@/data/types";

/**
 * The bundled catalogue and a demo learner.
 *
 * The catalogue is the FALLBACK for a store with no backend configured and the
 * SEED for the live one (migration 0147 carries the same rows), so what a
 * visitor explores in demo mode is what a signed-up learner gets. Ids are
 * stable strings so progress, notes and bookmarks keep pointing at the right
 * thing in both worlds.
 *
 * Lectures are real, public YouTube videos on each lesson's subject (see the
 * `source` on each), played through the IFrame API so resume, progress and
 * study time work; photos are Pexels-licensed (public/images/CREDITS.md).
 */

const IMG = "/images/";

export const CATEGORIES: Category[] = [
    { id: "fe", name: "Front End", blurb: "HTML, CSS, JavaScript and the frameworks on top" },
    { id: "ux", name: "UI/UX Design", blurb: "Research, interaction, interface and design systems" },
    { id: "br", name: "Branding", blurb: "Identity, voice and the image a company puts out" },
];

export const MENTORS: Mentor[] = [
    { id: "m-padhang", name: "Padhang Satrio", role: "Product Designer · Mentor", bio: "Fifteen years designing products people keep. Runs design-system practice at a fintech and teaches the parts nobody writes down.", hue: "sky", photoUrl: IMG + "mentor-padhang.jpg", handle: "padhang", followers: 12800, expertise: ["ux", "br"] },
    { id: "m-zakir", name: "Zakir Horizontal", role: "Brand Strategist · Mentor", bio: "Names, voices and rebrands for companies that had outgrown their first logo. Believes a brand is what you do when nobody is watching.", hue: "peach", photoUrl: IMG + "mentor-zakir.jpg", handle: "zakir", followers: 8400, expertise: ["br"] },
    { id: "m-leonardo", name: "Leonardo Samsul", role: "Front-End Lead · Mentor", bio: "Ships front ends for a living and teaches the fundamentals underneath the frameworks. Patient with beginners, allergic to magic.", hue: "mint", photoUrl: IMG + "mentor-leonardo.jpg", handle: "leonardo", followers: 21500, expertise: ["fe"] },
    { id: "m-bayu", name: "Bayu Salto", role: "UX Researcher · Mentor", bio: "Turns interviews into decisions. Has run research sprints for three unicorns and one bakery, and rates the bakery highest.", hue: "rose", photoUrl: IMG + "mentor-bayu.jpg", handle: "bayu", followers: 6900, expertise: ["ux"] },
    { id: "m-amara", name: "Amara Osei", role: "CSS Specialist · Mentor", bio: "Layout is a language and she is fluent. Grid, container queries and the parts of CSS that make senior engineers nervous.", hue: "lilac", photoUrl: IMG + "mentor-amara.jpg", handle: "amara", followers: 9700, expertise: ["fe"] },
    { id: "m-mei", name: "Mei Tanaka", role: "Design Lead · Mentor", bio: "Leads design at a health-tech scale-up. Teaches how to run research that changes what gets built, not just what gets said.", hue: "plum", photoUrl: IMG + "mentor-mei.jpg", handle: "mei", followers: 5300, expertise: ["ux"] },
];

export const COURSES: Course[] = [
    {
        id: "c-fe-beginner", slug: "front-end-beginners-guide",
        coverUrl: IMG + "cover-fe-beginner.jpg",
        title: "Beginner's Guide to Becoming a Professional Front-End Developer",
        blurb: "From a blank file to a deployed site: HTML, CSS and JavaScript the way working engineers actually use them.",
        description: "This course takes you from zero to a front-end developer who can be trusted with a real ticket. You will build three small projects, learn to read documentation instead of copying tutorials, and finish with a portfolio site you deployed yourself.\n\nEvery lesson ends with something you can look at in a browser. There is no theory you will not use in the following lesson.",
        categoryId: "fe", mentorId: "m-leonardo", level: "Beginner", theme: "fe", rating: 4.9, learners: 18420,
        outcomes: ["Write semantic HTML a screen reader can navigate", "Lay out a page with Flexbox and Grid without a framework", "Fetch data and render it with plain JavaScript", "Deploy a static site and read Lighthouse honestly"],
        publishedAt: "2026-02-10T00:00:00.000Z",
    },
    {
        id: "c-fe-css", slug: "modern-css-layouts",
        coverUrl: IMG + "cover-fe-css.jpg",
        title: "Modern CSS Layouts: Grid, Flexbox and Container Queries",
        blurb: "Stop fighting the cascade. Layout that holds at every width, with the newest CSS that browsers finally agree on.",
        description: "A layout course for people who can already write CSS but still reach for a framework when things get hard. We cover the mental model of Grid, when Flexbox is the right tool, and container queries — components that respond to the space they are in, not the viewport.",
        categoryId: "fe", mentorId: "m-amara", level: "Intermediate", theme: "fe", rating: 4.8, learners: 7310,
        outcomes: ["Choose Grid or Flexbox for the right reasons", "Build a responsive card that never needs a media query", "Use subgrid and container queries in production", "Debug layout with the browser's own tools"],
        publishedAt: "2026-04-22T00:00:00.000Z",
    },
    {
        id: "c-fe-ts", slug: "typescript-for-react",
        coverUrl: IMG + "cover-fe-ts.jpg",
        title: "TypeScript for React Developers",
        blurb: "Types that catch the bug before your user does — without turning every component into a puzzle.",
        description: "You know React. This course adds the TypeScript you actually need: typing props and state, discriminated unions for UI state, generics where they earn their keep, and the compiler settings that make strict mode a friend rather than a wall.",
        categoryId: "fe", mentorId: "m-leonardo", level: "Intermediate", theme: "mint", rating: 4.7, learners: 5120,
        outcomes: ["Type props, children and event handlers correctly", "Model loading, error and success states with unions", "Write a generic hook once and reuse it safely", "Turn on strict mode without drowning in errors"],
        publishedAt: "2026-06-03T00:00:00.000Z",
    },
    {
        id: "c-ux-optimize", slug: "optimizing-user-experience",
        coverUrl: IMG + "cover-ux-optimize.jpg",
        title: "Optimizing User Experience with the Best UI/UX Design",
        blurb: "The difference between a screen that looks finished and one that works — measured, tested and shipped.",
        description: "Good UX is not taste; it is a series of decisions you can defend. This course walks the full loop — understand the task, sketch the flow, design the screen, test it with five people, fix what they stumbled on — using a real product as the running example.",
        categoryId: "ux", mentorId: "m-bayu", level: "Beginner", theme: "ux", rating: 4.9, learners: 22910,
        outcomes: ["Map a task before you draw a screen", "Establish hierarchy with weight and colour, not size", "Run a five-person usability test in an afternoon", "Write findings that engineers act on"],
        publishedAt: "2026-01-18T00:00:00.000Z",
    },
    {
        id: "c-ux-systems", slug: "design-systems-tokens-to-components",
        coverUrl: IMG + "cover-ux-systems.jpg",
        title: "Design Systems from Tokens to Components",
        blurb: "One source of truth for colour, type and spacing — and the component library that grows out of it.",
        description: "Design systems fail when they start with components. This course starts with tokens, builds primitives on top, and only then assembles the patterns teams actually reuse. You will document as you go, so the system explains itself to the next designer.",
        categoryId: "ux", mentorId: "m-padhang", level: "Advanced", theme: "ux", rating: 4.8, learners: 4880,
        outcomes: ["Name tokens by role, never by appearance", "Build a button that survives every state", "Decide what belongs in the system and what does not", "Ship documentation people read"],
        publishedAt: "2026-05-14T00:00:00.000Z",
    },
    {
        id: "c-ux-research", slug: "research-sprints",
        coverUrl: IMG + "cover-ux-research.jpg",
        title: "Research Sprints: Interviews to Insights",
        blurb: "Five days from a question to a decision, with real customers in the room.",
        description: "A research sprint is the fastest honest way to find out whether you are building the right thing. This course gives you the plan for a week: recruit, interview, synthesise, decide. Includes the scripts, the templates and the mistakes.",
        categoryId: "ux", mentorId: "m-mei", level: "Intermediate", theme: "peach", rating: 4.7, learners: 3260,
        outcomes: ["Recruit five of the right people in two days", "Run an interview that does not lead the witness", "Synthesise with affinity mapping in under three hours", "Present one decision, not forty findings"],
        publishedAt: "2026-07-01T00:00:00.000Z",
    },
    {
        id: "c-br-revive", slug: "reviving-company-image",
        coverUrl: IMG + "cover-br-revive.jpg",
        title: "Reviving and Refreshing Company Image",
        blurb: "When the brand no longer matches the business — how to change it without losing the people who already love it.",
        description: "Most rebrands are redesigns that forgot to ask why. This course is the strategy first: audit what the brand means today, decide what must survive, and only then touch the mark, the palette and the voice. Two full case studies from brief to launch.",
        categoryId: "br", mentorId: "m-padhang", level: "Intermediate", theme: "br", rating: 4.8, learners: 9140,
        outcomes: ["Audit a brand honestly, including the parts that work", "Write a brief a designer can actually use", "Evolve a mark without alienating existing customers", "Plan a rollout that does not surprise anyone"],
        publishedAt: "2026-03-08T00:00:00.000Z",
    },
    {
        id: "c-br-voice", slug: "brand-voice",
        coverUrl: IMG + "cover-br-voice.jpg",
        title: "Brand Voice: Writing that Sounds Like You",
        blurb: "A voice guide people actually follow — from the homepage headline to the error message.",
        description: "Every brand has a voice; most have it by accident. This course makes it deliberate: define three traits, write the rules that flow from them, and apply them to the hard cases — error states, legal copy, the apology email — where voice matters most.",
        categoryId: "br", mentorId: "m-zakir", level: "Beginner", theme: "br", rating: 4.6, learners: 6020,
        outcomes: ["Define a voice in three traits and their limits", "Write microcopy that stays in character under pressure", "Build a voice guide a team will keep using", "Audit existing copy in an hour"],
        publishedAt: "2026-06-20T00:00:00.000Z",
    },
];

export const MODULES: Module[] = [
    { id: "mod-fe1-1", courseId: "c-fe-beginner", title: "Foundations", sort: 0 },
    { id: "mod-fe1-2", courseId: "c-fe-beginner", title: "Layout & style", sort: 1 },
    { id: "mod-fe1-3", courseId: "c-fe-beginner", title: "Behaviour & shipping", sort: 2 },
    { id: "mod-fe2-1", courseId: "c-fe-css", title: "The layout mental model", sort: 0 },
    { id: "mod-fe2-2", courseId: "c-fe-css", title: "Responding to space", sort: 1 },
    { id: "mod-fe3-1", courseId: "c-fe-ts", title: "Typing the UI", sort: 0 },
    { id: "mod-ux1-1", courseId: "c-ux-optimize", title: "Understand", sort: 0 },
    { id: "mod-ux1-2", courseId: "c-ux-optimize", title: "Design & test", sort: 1 },
    { id: "mod-ux2-1", courseId: "c-ux-systems", title: "Tokens first", sort: 0 },
    { id: "mod-ux3-1", courseId: "c-ux-research", title: "The sprint week", sort: 0 },
    { id: "mod-br1-1", courseId: "c-br-revive", title: "Strategy before style", sort: 0 },
    { id: "mod-br1-2", courseId: "c-br-revive", title: "The refresh", sort: 1 },
    { id: "mod-br2-1", courseId: "c-br-voice", title: "Finding the voice", sort: 0 },
];

/** Real lengths of the lectures, in seconds (from YouTube). */
const DURATION: Record<string, number> = {
    "9mY70fWMMdM": 107,
    "YOsMJQfwqow": 572,
    "c0kfcP_nD9E": 807,
    "cuEtnrL9-H0": 395,
    "rg7Fvvl3taU": 2223,
    "3_-Je5XpbqY": 1463,
    "1RPUt4es9Ns": 1524,
    "5KUNmgt_pvY": 196,
    "dsviXwJwslI": 226,
    "crGNE8cKQ9o": 2918,
    "JyCmacSyDY4": 792,
    "jy-QGuWE7PQ": 183,
    "frolJ7Qq_oc": 1046,
    "4S8Nf6KTwtM": 567,
    "Co75kmQtbaA": 2486,
    "uDaZZt91MVo": 58,
    "s91jO5UIfGY": 366,
    "C4nYxZxteJY": 283,
};

const video = (id: string, courseId: string, moduleId: string, title: string, yt: string, source: string, body: string, sort: number): Lesson => ({
    id, courseId, moduleId, title, kind: "video", durationSec: DURATION[yt] ?? 600, videoUrl: "https://www.youtube.com/watch?v=" + yt, source, body, sort,
});
const article = (id: string, courseId: string, moduleId: string, title: string, durationSec: number, body: string, sort: number): Lesson => ({
    id, courseId, moduleId, title, kind: "article", durationSec, body, sort,
});
const quiz = (id: string, courseId: string, moduleId: string, title: string, sort: number): Lesson => ({
    id, courseId, moduleId, title, kind: "quiz", durationSec: 300, body: "A short check on the module. Three questions; you can retake it as often as you like.", sort,
});

export const LESSONS: Lesson[] = [
    // Front End — beginner (6)
    video("l-fe1-1", "c-fe-beginner", "mod-fe1-1", "What a front-end developer actually does", "9mY70fWMMdM", "Codecademy", "Before a line of code: what the job is, what it is not, and the three skills that separate someone who can follow a tutorial from someone who can be handed a ticket.", 0),
    video("l-fe1-2", "c-fe-beginner", "mod-fe1-1", "HTML that means something", "YOsMJQfwqow", "Kevin Powell", "Semantic elements, the document outline, and why a screen reader is the fastest way to find out whether your HTML is any good.", 1),
    video("l-fe1-3", "c-fe-beginner", "mod-fe1-2", "The cascade, without the fear", "c0kfcP_nD9E", "Kevin Powell", "Specificity, inheritance and the box model — the three things that explain nearly every 'why is my CSS not working' question.", 2),
    article("l-fe1-4", "c-fe-beginner", "mod-fe1-2", "Flexbox in one page", 480, "Flexbox solves one problem: distributing space along a single line. Once you accept that, everything else is a property on either the container or the items.\n\nThe container decides the direction (`flex-direction`), whether items wrap (`flex-wrap`), and how leftover space is shared along the main axis (`justify-content`) and the cross axis (`align-items`).\n\nThe items decide how much they are allowed to grow (`flex-grow`), shrink (`flex-shrink`) and what they start at (`flex-basis`). The shorthand `flex: 1` means 'grow to fill, shrink if you must, start from nothing' — which is what you want nine times out of ten.\n\nThe mistake everyone makes: reaching for Flexbox to build a two-dimensional grid. If you find yourself nesting three flex containers to get rows and columns to line up, stop. That is what Grid is for, and it is the next lesson.", 3),
    video("l-fe1-5", "c-fe-beginner", "mod-fe1-3", "Fetching data and rendering it", "cuEtnrL9-H0", "Web Dev Simplified", "fetch, promises and the DOM: pulling a list from an API and turning it into elements without a framework, so you understand what the framework will later do for you.", 4),
    quiz("l-fe1-6", "c-fe-beginner", "mod-fe1-3", "Module check: foundations", 5),
    // Front End — CSS layouts (3)
    video("l-fe2-1", "c-fe-css", "mod-fe2-1", "Grid is a coordinate system", "rg7Fvvl3taU", "Kevin Powell", "Tracks, lines, areas. The mental model that makes Grid obvious, and the three properties you will use for 90% of layouts.", 0),
    video("l-fe2-2", "c-fe-css", "mod-fe2-2", "Container queries: components that respond to their box", "3_-Je5XpbqY", "Kevin Powell", "A card that is one column in a sidebar and three in the main area — with no media queries and no JavaScript.", 1),
    article("l-fe2-3", "c-fe-css", "mod-fe2-2", "Subgrid and when you need it", 420, "Subgrid lets a nested element take its track sizing from its parent grid, so card contents line up ACROSS cards, not just within them.\n\nThe classic case: a row of cards whose titles are different lengths. Without subgrid, the 'price' row in each card sits at a different height. With `grid-template-rows: subgrid` on each card, every card's rows share the parent's tracks and everything aligns.\n\nUse it when alignment across siblings matters. Do not use it as a general layout tool — a plain grid on the parent is usually simpler.", 2),
    // Front End — TypeScript (3)
    video("l-fe3-1", "c-fe-ts", "mod-fe3-1", "Typing props without fighting the compiler", "1RPUt4es9Ns", "Sunny Sood", "Interfaces vs types, children, optional props and the handful of React types you will look up constantly until you don't.", 0),
    article("l-fe3-2", "c-fe-ts", "mod-fe3-1", "Discriminated unions for UI state", 540, "Every async screen has at least three states: loading, error, and success with data. Modelling them as three booleans invites the impossible combinations — loading AND error, success with no data.\n\nA discriminated union makes the impossible states unrepresentable:\n\ntype State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: Item[] }\n\nNow `switch (state.status)` narrows the type in each branch, the compiler insists you handle every case, and adding a fourth state ('empty', say) produces errors exactly where the UI needs to change.\n\nThis single pattern removes a category of bugs from every data-driven component you write.", 1),
    quiz("l-fe3-3", "c-fe-ts", "mod-fe3-1", "Module check: typing the UI", 2),
    // UI/UX — optimizing (4)
    video("l-ux1-1", "c-ux-optimize", "mod-ux1-1", "Understand of UI/UX design", "5KUNmgt_pvY", "NNgroup", "What UX is measured by, what UI is responsible for, and why the two are argued about by people who have never shipped either.", 0),
    video("l-ux1-2", "c-ux-optimize", "mod-ux1-1", "Map the task before the screen", "dsviXwJwslI", "NNgroup", "A task flow on paper takes ten minutes and saves a week. How to draw one, and what it tells you that a wireframe never will.", 1),
    video("l-ux1-3", "c-ux-optimize", "mod-ux1-2", "Hierarchy through weight, not size", "crGNE8cKQ9o", "Design Pilot", "A tight type scale, three text colours and one loud accent — how a calm interface tells you where to look without shouting.", 2),
    article("l-ux1-4", "c-ux-optimize", "mod-ux1-2", "The five-person test", 600, "Five people find roughly 85% of the usability problems in a design. The sixth mostly finds what the first five already found.\n\nThe method fits in an afternoon. Write three tasks in the user's words ('find out how much delivery costs'), not the interface's ('locate the shipping information section'). Recruit five people who resemble your users. Sit beside each one, give them a task, and say nothing.\n\nWhen they get stuck, do not help. Ask 'what are you thinking?' and write down exactly what they say. The stumble IS the finding.\n\nAfterwards, list every stumble, count how many people hit each one, and fix the ones two or more hit. Then test again. The second round is faster and the design is measurably better — not prettier, better.", 3),
    // UI/UX — design systems (2)
    video("l-ux2-1", "c-ux-systems", "mod-ux2-1", "Tokens are the system", "JyCmacSyDY4", "Figma", "Colour, type, spacing, radius, elevation — named by role, never by appearance — and why every component that follows becomes easier because of it.", 0),
    quiz("l-ux2-2", "c-ux-systems", "mod-ux2-1", "Module check: tokens", 1),
    // UI/UX — research (2)
    video("l-ux3-1", "c-ux-research", "mod-ux3-1", "Day one: the question", "jy-QGuWE7PQ", "NNgroup", "A sprint is only as good as the question it starts with. How to write one you can actually answer in five days, and how to recruit around it.", 0),
    article("l-ux3-2", "c-ux-research", "mod-ux3-1", "Interviews that don't lead the witness", 540, "The worst interview question is 'would you use this?' Everyone says yes. The best one is 'tell me about the last time you…' — because a story about the past cannot be polite about the future.\n\nOpen with the story. Follow the thread: 'what happened next?', 'what did you do then?', 'how did that feel?'. Never suggest an answer; when you catch yourself about to, pause instead. Silence is the most productive question you own.\n\nRecord everything and take notes anyway — the notes are your first pass at synthesis. By the end of five interviews, patterns will already be visible in your own handwriting.", 1),
    // Branding — revive (5)
    video("l-br1-1", "c-br-revive", "mod-br1-1", "Audit before you touch anything", "frolJ7Qq_oc", "Elements Brand Management", "What the brand means to customers today — measured, not assumed — and the parts that are working which a rebrand must not break.", 0),
    video("l-br1-2", "c-br-revive", "mod-br1-1", "Writing the brief", "4S8Nf6KTwtM", "Will Paterson", "The one-page brief that keeps a rebrand honest: what must change, what must survive, and how you will know it worked.", 1),
    article("l-br1-3", "c-br-revive", "mod-br1-2", "Evolve the mark, don't replace it", 480, "The most expensive rebrands are the ones that threw away recognition. A mark carries years of accumulated meaning; a refresh should spend that equity, not burn it.\n\nStart by listing what people recognise: the silhouette, the colour, a letterform. Keep at least two. Modernise the rest — proportions, weight, how it behaves at 16 pixels — and test the old and new side by side with customers. If they can tell it is the same company at a glance, you have a refresh. If they cannot, you have a new brand and a marketing budget to match.", 2),
    video("l-br1-4", "c-br-revive", "mod-br1-2", "Palette and type for a refresh", "Co75kmQtbaA", "Flux Academy", "Choosing a palette that ages well and a type pairing that does the work of a hundred guidelines.", 3),
    quiz("l-br1-5", "c-br-revive", "mod-br1-2", "Module check: the refresh", 4),
    // Branding — voice (3)
    video("l-br2-1", "c-br-voice", "mod-br2-1", "Three traits and their limits", "uDaZZt91MVo", "The Futur", "'Friendly but not chummy. Confident but not smug.' A voice is defined as much by what it never does as what it does.", 0),
    article("l-br2-2", "c-br-voice", "mod-br2-1", "Voice under pressure: the error message", 420, "Anyone can sound like the brand on the homepage. The test is the 500 error, the declined card, the 'we are sorry' email.\n\nUnder pressure, three rules hold. Say what happened in plain words. Say what the person can do next. Do not perform sympathy you cannot back with action.\n\n'Something went wrong' fails all three. 'We could not save your changes — check your connection and try again; your draft is still here' passes, and it sounds like a company that has thought about you.", 1),
    quiz("l-br2-3", "c-br-voice", "mod-br2-1", "Module check: voice", 2),
];

export const QUIZ: QuizQuestion[] = [
    { id: "q-fe1-1", lessonId: "l-fe1-6", prompt: "Which element should wrap the main navigation of a page?", options: ["<div class=\"nav\">", "<nav>", "<menu>", "<section>"], answer: 1, explanation: "<nav> announces a navigation landmark to assistive technology; a div announces nothing." },
    { id: "q-fe1-2", lessonId: "l-fe1-6", prompt: "`flex: 1` on an item is shorthand for…", options: ["grow 1, shrink 0, basis auto", "grow 1, shrink 1, basis 0", "grow 0, shrink 1, basis auto", "grow 1, shrink 1, basis 100%"], answer: 1, explanation: "flex: 1 → 1 1 0: grow to fill, shrink if needed, start from nothing." },
    { id: "q-fe1-3", lessonId: "l-fe1-6", prompt: "Which fetches JSON correctly?", options: ["fetch(url).json()", "await fetch(url).then(r => r.json())", "JSON.parse(fetch(url))", "fetch(url, 'json')"], answer: 1, explanation: "fetch resolves to a Response; .json() reads and parses the body." },
    { id: "q-fe3-1", lessonId: "l-fe3-3", prompt: "The main benefit of a discriminated union for UI state is…", options: ["Shorter code", "Impossible states can't be represented", "Faster rendering", "No need for useState"], answer: 1, explanation: "Each variant carries only the fields valid for that state, so 'loading and error' cannot exist." },
    { id: "q-fe3-2", lessonId: "l-fe3-3", prompt: "How do you type a component's children?", options: ["children: string", "children: JSX", "children: React.ReactNode", "children: any"], answer: 2, explanation: "ReactNode covers elements, strings, numbers, fragments, null — everything React can render." },
    { id: "q-fe3-3", lessonId: "l-fe3-3", prompt: "When should you write a generic hook?", options: ["Always", "When two callers need different data shapes and the logic is identical", "Never in React", "Only for API calls"], answer: 1, explanation: "Generics earn their keep when the behaviour is shared and only the type varies." },
    { id: "q-ux2-1", lessonId: "l-ux2-2", prompt: "A well-named token is…", options: ["color-purple-600", "color-brand-primary", "color-button", "purple"], answer: 1, explanation: "Role, not appearance: a rebrand changes the value, and every use keeps meaning." },
    { id: "q-ux2-2", lessonId: "l-ux2-2", prompt: "What should a design system start with?", options: ["Components", "Tokens", "Page templates", "Icons"], answer: 1, explanation: "Components built before tokens each invent their own values and the system never converges." },
    { id: "q-ux2-3", lessonId: "l-ux2-2", prompt: "How many states must a button component handle at minimum?", options: ["Two: default and hover", "Three: default, hover, disabled", "Five: default, hover, focus, disabled, loading", "One"], answer: 2, explanation: "Focus is not optional — keyboard users depend on it — and loading prevents double submits." },
    { id: "q-br1-1", lessonId: "l-br1-5", prompt: "The first step of a rebrand is…", options: ["A new logo", "An audit of what the brand means today", "A new tagline", "Picking a palette"], answer: 1, explanation: "You cannot decide what to change until you know what is working." },
    { id: "q-br1-2", lessonId: "l-br1-5", prompt: "A refresh keeps at least…", options: ["The old website", "Two recognisable elements of the mark", "The same agency", "The founder's signature"], answer: 1, explanation: "Recognition is equity; keeping two elements lets customers tell it is still you." },
    { id: "q-br1-3", lessonId: "l-br1-5", prompt: "A good brief states…", options: ["Only the deliverables", "What must change, what must survive, and how success is measured", "The budget", "The colours"], answer: 1, explanation: "Without 'what must survive' the designer optimises for novelty." },
    { id: "q-br2-1", lessonId: "l-br2-3", prompt: "A brand voice is best defined by…", options: ["A list of adjectives", "Three traits with their limits", "The founder's personality", "The competitor's voice"], answer: 1, explanation: "'Confident but not smug' is actionable; 'confident' alone is not." },
    { id: "q-br2-2", lessonId: "l-br2-3", prompt: "The best test of a voice is…", options: ["The homepage headline", "The error message", "The logo", "The pitch deck"], answer: 1, explanation: "Anyone sounds good on the homepage; the voice is tested when something went wrong." },
    { id: "q-br2-3", lessonId: "l-br2-3", prompt: "A good error message does NOT…", options: ["Say what happened", "Say what to do next", "Perform sympathy it can't back with action", "Use plain words"], answer: 2, explanation: "'We're so sorry' with no remedy is a performance, not help." },
];

/** Live mentor-led lessons, dated relative to today so the schedule is always alive. */
function at(daysFromNow: number, hour: number): string {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
}

export const LIVE_LESSONS: LiveLesson[] = [
    { id: "live-1", mentorId: "m-padhang", categoryId: "ux", title: "Understand of UI/UX design — live Q&A", description: "Bring a screen you are stuck on. We will pull three apart together and talk through hierarchy, spacing and the one change that fixes most of them.", startsAt: at(-18, 16), durationMin: 60, joinUrl: "https://meet.example.com/coir-six/live-1", recordingUrl: "https://www.youtube.com/watch?v=s91jO5UIfGY" },
    { id: "live-2", mentorId: "m-leonardo", categoryId: "fe", title: "Office hours: your first deploy", description: "Deploying a static site end to end, then debugging the three things that always go wrong on the first attempt.", startsAt: at(1, 18), durationMin: 45, joinUrl: "https://meet.example.com/coir-six/live-2" },
    { id: "live-3", mentorId: "m-bayu", categoryId: "ux", title: "Watch a usability test, live", description: "A real participant, a real prototype, and a running commentary on what to notice. The fastest way to learn to moderate.", startsAt: at(3, 13), durationMin: 60, joinUrl: "https://meet.example.com/coir-six/live-3" },
    { id: "live-4", mentorId: "m-zakir", categoryId: "br", title: "Brand voice clinic", description: "Send your homepage copy in advance; we rewrite the weakest paragraph on screen.", startsAt: at(6, 17), durationMin: 50, joinUrl: "https://meet.example.com/coir-six/live-4" },
    { id: "live-5", mentorId: "m-amara", categoryId: "fe", title: "Container queries in production", description: "Real components from a real codebase, refactored from media queries to container queries, with the gotchas.", startsAt: at(9, 12), durationMin: 60, joinUrl: "https://meet.example.com/coir-six/live-5" },
    { id: "live-6", mentorId: "m-mei", categoryId: "ux", title: "Synthesis workshop", description: "Bring five interviews' worth of notes. Leave with three themes and one decision.", startsAt: at(-5, 15), durationMin: 90, joinUrl: "https://meet.example.com/coir-six/live-6", recordingUrl: "https://www.youtube.com/watch?v=C4nYxZxteJY" },
];

export const GROUPS: Group[] = [
    { id: "g-fe-study", name: "Front-End Study Circle", categoryId: "fe", blurb: "Weekly accountability for the beginner's course. Share what you built, get unstuck.", members: 1240, imageUrl: IMG + "group-fe-study.jpg" },
    { id: "g-css", name: "CSS Layout Lab", categoryId: "fe", blurb: "Grid puzzles, container-query experiments and the occasional argument about margins.", members: 612, imageUrl: IMG + "group-css.jpg" },
    { id: "g-ux-crit", name: "UX Critique Club", categoryId: "ux", blurb: "Post a screen, get three honest critiques within a day. Be kind, be specific.", members: 2380, imageUrl: IMG + "group-ux-crit.jpg" },
    { id: "g-research", name: "Research Practitioners", categoryId: "ux", blurb: "Interview scripts, recruiting tips and synthesis templates from people doing it weekly.", members: 890, imageUrl: IMG + "group-research.jpg" },
    { id: "g-brand", name: "Brand Builders", categoryId: "br", blurb: "Rebrands in progress, voice guides in draft, and case studies dissected.", members: 731, imageUrl: IMG + "group-brand.jpg" },
];

export const CATALOGUE: Catalogue = {
    categories: CATEGORIES,
    mentors: MENTORS,
    courses: COURSES,
    modules: MODULES,
    lessons: LESSONS,
    quiz: QUIZ,
    liveLessons: LIVE_LESSONS,
    groups: GROUPS,
};

// ---------------------------------------------------------------------------
// The demo learner. Jason is the person the case study designed for: three
// courses under way, a five-day streak, a third of the way to this week's goal.
// ---------------------------------------------------------------------------

export const DEMO_FRIENDS: Friend[] = [
    { id: "f-bagas", name: "Bagas Mahpie", hue: "plum", photoUrl: IMG + "friend-bagas.jpg", label: "Friend" },
    { id: "f-dandy", name: "Sir Dandy", hue: "sky", photoUrl: IMG + "friend-dandy.jpg", label: "Old friend" },
    { id: "f-jhon", name: "Jhon Tosan", hue: "peach", photoUrl: IMG + "friend-jhon.jpg", label: "Friend" },
];

function daysAgo(n: number, hour = 19): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
}

export function demoUserState(): UserState {
    const done = (lessonId: string, days: number): { lessonId: string; positionSec: number; completedAt: string; updatedAt: string } => ({
        lessonId, positionSec: 0, completedAt: daysAgo(days), updatedAt: daysAgo(days),
    });
    // Study sessions: the last five days for the streak, a couple of earlier
    // weeks for the chart, and ~96 minutes this week against a 300-minute goal
    // (the "32% of your target" the prototype shows).
    const sessions = [
        { id: "s1", lessonId: "l-fe1-1", minutes: 28, occurredAt: daysAgo(0, 8) },
        { id: "s2", lessonId: "l-ux1-1", minutes: 22, occurredAt: daysAgo(1) },
        { id: "s3", lessonId: "l-fe1-3", minutes: 31, occurredAt: daysAgo(2) },
        { id: "s4", lessonId: "l-br1-1", minutes: 15, occurredAt: daysAgo(3) },
        { id: "s5", lessonId: "l-fe1-2", minutes: 12, occurredAt: daysAgo(4) },
        { id: "s6", lessonId: "l-ux1-2", minutes: 40, occurredAt: daysAgo(7) },
        { id: "s7", lessonId: "l-fe1-1", minutes: 35, occurredAt: daysAgo(9) },
        { id: "s8", lessonId: "l-br1-2", minutes: 25, occurredAt: daysAgo(11) },
        { id: "s9", lessonId: "l-fe1-2", minutes: 52, occurredAt: daysAgo(13) },
        { id: "s10", lessonId: "l-ux1-1", minutes: 48, occurredAt: daysAgo(16) },
        { id: "s11", lessonId: "l-fe1-3", minutes: 20, occurredAt: daysAgo(20) },
        { id: "s12", lessonId: "l-br1-1", minutes: 30, occurredAt: daysAgo(24) },
        { id: "s13", lessonId: "l-fe1-4", minutes: 18, occurredAt: daysAgo(27) },
    ];
    return {
        profile: {
            id: "demo-jason",
            email: "jason@coirsix.example",
            name: "Jason Ranti",
            handle: "jason",
            hue: "lilac",
            photoUrl: IMG + "learner-jason.jpg",
            headline: "Product designer learning to code",
            weeklyGoalMin: 300,
            interests: ["fe", "ux", "br"],
            onboarded: true,
            createdAt: daysAgo(64),
        },
        friends: DEMO_FRIENDS,
        // Enrolled across the catalogue, three courses actively under way. The
        // per-category counts this produces — 6/12 Front End, 2/8 UI/UX, 3/8
        // Branding — are the case study's own numbers, derived rather than typed.
        enrollments: [
            { courseId: "c-fe-beginner", enrolledAt: daysAgo(30), completedAt: null, lastLessonId: "l-fe1-5" },
            { courseId: "c-ux-optimize", enrolledAt: daysAgo(21), completedAt: null, lastLessonId: "l-ux1-3" },
            { courseId: "c-br-revive", enrolledAt: daysAgo(14), completedAt: null, lastLessonId: "l-br1-4" },
            { courseId: "c-fe-css", enrolledAt: daysAgo(40), completedAt: null, lastLessonId: "l-fe2-3" },
            { courseId: "c-fe-ts", enrolledAt: daysAgo(6), completedAt: null, lastLessonId: null },
            { courseId: "c-ux-systems", enrolledAt: daysAgo(10), completedAt: null, lastLessonId: null },
            { courseId: "c-ux-research", enrolledAt: daysAgo(8), completedAt: null, lastLessonId: null },
            { courseId: "c-br-voice", enrolledAt: daysAgo(5), completedAt: null, lastLessonId: null },
        ],
        progress: [
            done("l-fe1-1", 27), done("l-fe1-2", 20), done("l-fe1-3", 13), done("l-fe1-4", 9),
            { lessonId: "l-fe1-5", positionSec: 6, completedAt: null, updatedAt: daysAgo(0, 8) },
            done("l-fe2-1", 38), done("l-fe2-2", 35),
            { lessonId: "l-fe2-3", positionSec: 0, completedAt: null, updatedAt: daysAgo(33) },
            done("l-ux1-1", 16), done("l-ux1-2", 7),
            { lessonId: "l-ux1-3", positionSec: 4, completedAt: null, updatedAt: daysAgo(1) },
            done("l-br1-1", 11), done("l-br1-2", 5), done("l-br1-3", 3),
            { lessonId: "l-br1-4", positionSec: 12, completedAt: null, updatedAt: daysAgo(3) },
        ],
        sessions,
        bookmarks: ["c-ux-systems", "c-fe-css"],
        follows: ["m-leonardo"],
        tasks: [
            { id: "t1", title: "Rebuild the pricing table with Grid", courseId: "c-fe-beginner", dueAt: daysAgo(-1, 18), doneAt: null, createdAt: daysAgo(3) },
            { id: "t2", title: "Write three task-flow scenarios", courseId: "c-ux-optimize", dueAt: daysAgo(0, 20), doneAt: null, createdAt: daysAgo(2) },
            { id: "t3", title: "Audit the current brand — collect 10 touchpoints", courseId: "c-br-revive", dueAt: daysAgo(-3, 18), doneAt: null, createdAt: daysAgo(4) },
            { id: "t4", title: "Read: Flexbox in one page", courseId: "c-fe-beginner", dueAt: daysAgo(2, 18), doneAt: daysAgo(2, 21), createdAt: daysAgo(6) },
            { id: "t5", title: "Book a slot in Leonardo's office hours", courseId: null, dueAt: daysAgo(-5, 12), doneAt: null, createdAt: daysAgo(1) },
        ],
        notes: [
            { id: "n1", lessonId: "l-fe1-3", atSec: 142, body: "Specificity: inline > id > class > element. Two classes beat one id? No — one id beats any number of classes.", createdAt: daysAgo(13) },
            { id: "n2", lessonId: "l-ux1-1", atSec: 88, body: "UX is measured by task success; UI is accountable for whether the path was findable.", createdAt: daysAgo(16) },
        ],
        groupIds: ["g-fe-study", "g-ux-crit"],
        conversations: [
            { id: "cv-1", peerKind: "mentor", peerId: "m-leonardo", peerName: "Leonardo Samsul", peerRole: "Mentor", peerHue: "mint", lastBody: "Push what you have and send me the link — half-finished is fine, that's what office hours are for.", updatedAt: daysAgo(0, 9), unread: 1 },
            { id: "cv-2", peerKind: "friend", peerId: "f-bagas", peerName: "Bagas Mahpie", peerRole: "Friend", peerHue: "plum", lastBody: "Grid study session tomorrow? I still don't get named areas.", updatedAt: daysAgo(1, 22), unread: 1 },
            { id: "cv-3", peerKind: "mentor", peerId: "m-padhang", peerName: "Padhang Satrio", peerRole: "Mentor", peerHue: "sky", lastBody: "Good audit. Now write down the two things you'd refuse to change.", updatedAt: daysAgo(4, 11), unread: 0 },
            { id: "cv-4", peerKind: "friend", peerId: "f-dandy", peerName: "Sir Dandy", peerRole: "Old friend", peerHue: "sky", lastBody: "Finished the CSS course. Container queries are witchcraft.", updatedAt: daysAgo(8, 20), unread: 0 },
        ],
        notifications: [
            { id: "nt-1", kind: "message", title: "Leonardo Samsul replied", body: "Push what you have and send me the link…", href: "/inbox/cv-1", readAt: null, createdAt: daysAgo(0, 9) },
            { id: "nt-2", kind: "streak", title: "5-day streak", body: "Five days in a row. One more today keeps it alive.", href: "/progress", readAt: null, createdAt: daysAgo(0, 7) },
            { id: "nt-3", kind: "live", title: "Office hours tomorrow", body: "Leonardo's 'your first deploy' session starts at 18:00.", href: "/lessons", readAt: null, createdAt: daysAgo(0, 6) },
            { id: "nt-4", kind: "task", title: "Task due today", body: "Write three task-flow scenarios", href: "/tasks", readAt: daysAgo(0, 8), createdAt: daysAgo(0, 6) },
            { id: "nt-5", kind: "group", title: "New post in UX Critique Club", body: "Mei shared a synthesis template.", href: "/groups/g-ux-crit", readAt: daysAgo(1), createdAt: daysAgo(1, 15) },
        ],
        attempts: [],
        certificates: [],
        rsvps: ["live-2"],
    };
}

/** The demo conversation history, keyed by conversation id. */
export function demoMessages(conversationId: string): { fromMe: boolean; body: string; createdAt: string }[] {
    const M = (fromMe: boolean, body: string, d: number, h = 12) => ({ fromMe, body, createdAt: daysAgo(d, h) });
    switch (conversationId) {
        case "cv-1":
            return [
                M(true, "Hi Leonardo — I'm stuck on the fetch lesson. The list renders but every item shows 'undefined'.", 1, 21),
                M(false, "Classic. You're probably reading `item.name` but the API returns `title`. Log one item and look at the keys.", 1, 21),
                M(true, "…it was `title`. Thank you. Also: can I bring my portfolio site to office hours even though it's not finished?", 0, 8),
                M(false, "Push what you have and send me the link — half-finished is fine, that's what office hours are for.", 0, 9),
            ];
        case "cv-2":
            return [
                M(false, "Did you get past the Grid lesson?", 2, 19),
                M(true, "Yes — the coordinate-system idea finally made it click.", 2, 19),
                M(false, "Grid study session tomorrow? I still don't get named areas.", 1, 22),
            ];
        case "cv-3":
            return [
                M(true, "Audit attached. Ten touchpoints, three of them embarrassing.", 5, 10),
                M(false, "Good audit. Now write down the two things you'd refuse to change.", 4, 11),
            ];
        case "cv-4":
            return [
                M(false, "Finished the CSS course. Container queries are witchcraft.", 8, 20),
                M(true, "Saving it for after the beginner's course. Don't spoil it.", 8, 20),
            ];
        default:
            return [];
    }
}

/** Seed posts for the study groups, dated relative to today. */
export function demoGroupPosts(groupId: string): Omit<import("@/data/types").GroupPost, "id" | "mine">[] {
    const P = (authorName: string, authorHue: import("@/lib/format").Hue, body: string, d: number, h = 14) => ({ groupId, authorName, authorHue, body, createdAt: daysAgo(d, h) });
    switch (groupId) {
        case "g-fe-study":
            return [
                P("Bagas Mahpie", "plum", "Week 3 check-in: built the pricing table with Grid, then rebuilt it with Flexbox to feel the difference. Grid wins for anything with columns.", 1, 9),
                P("Leonardo Samsul", "mint", "Reminder: office hours tomorrow at 18:00. Bring a deploy that failed — those are the useful ones.", 1, 16),
                P("Priya N.", "rose", "Does anyone else's fetch lesson return `title` instead of `name`? Spent an hour on that.", 2, 20),
            ];
        case "g-ux-crit":
            return [
                P("Mei Tanaka", "plum", "Shared a synthesis template in the files — the affinity-map version that fits on one whiteboard.", 1, 15),
                P("Sofia R.", "peach", "Critique request: onboarding screen for a budgeting app. Three steps, no skip button — is that a mistake?", 2, 11),
                P("Padhang Satrio", "sky", "It's a mistake if the third step isn't essential. Ask what breaks if they skip it. If nothing, let them.", 2, 12),
            ];
        case "g-css":
            return [P("Amara Osei", "lilac", "Puzzle of the week: a card grid where the tallest card sets the row height, without JavaScript. Post your solution.", 3, 10)];
        case "g-research":
            return [P("Bayu Salto", "rose", "Recruiting tip: a £30 voucher and a 20-minute slot beats a £60 voucher and an hour. People show up for short.", 4, 13)];
        case "g-brand":
            return [P("Zakir Horizontal", "peach", "Voice clinic next week. Send the paragraph you're least proud of.", 5, 17)];
        default:
            return [];
    }
}

