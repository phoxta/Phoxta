import type { SeedContext } from "@/data/core";
import { CANT_SEE } from "./context";
import { IMAGE_UNAVAILABLE, paletteFor } from "./generate";
import type { ChatMessage, CreativeProject, Source, StudioItem, StudioState } from "./types";

/**
 * The Adeyemis' studio, as the brief left it.
 *
 * Three songs the family actually sings (one of them written for the evening,
 * in G at 72), three storyboards — Ayo's Brave Ant with two generated pictures
 * and four photographs from the family's own albums, Tobi's volcano, and the
 * Christmas-in-Lagos story they are making for Mama Fọláké — one generated
 * picture, one honest typographic card, and twenty-four conversations with the
 * companion, the newest of which is Ifeoluwa asking what is left before Lagos and
 * getting an answer with its sources attached and a proposal she has not yet
 * confirmed.
 *
 * The meter sits at 61% of the month, which is where a family lands halfway
 * through September if the briefings run every morning and somebody wrote a
 * song at the weekend.
 */

const SPACE = (ctx: SeedContext) => ctx.space.id;

// ---------------------------------------------------------------------------
// Sources, written the way the companion writes them
// ---------------------------------------------------------------------------

const src = (moduleId: string, label: string, detail: string, href: string, sensitivity: Source["sensitivity"] = "general"): Source => ({ moduleId, label, detail, href, sensitivity });

const TRAVEL = (detail: string) => src("travel", "Travel & holiday planner", detail, "/live/travel");
const TASKS = (detail: string) => src("tasks", "Tasks & chores", detail, "/execute/tasks");
const CAL = (detail: string) => src("calendar", "Family calendar", detail, "/execute/calendar");
const LEARN = (detail: string) => src("learning", "Learning Hub", detail, "/grow/learning");
const BIBLE = (detail: string) => src("bible", "Bible, prayer & discipleship", detail, "/grow/bible");
const GOALS = (detail: string) => src("goals", "Goals & vision", detail, "/execute/goals");
const BOOKS = (detail: string) => src("books", "Library & courses", detail, "/grow/books");
const CURR = (detail: string) => src("curricula", "Children's curricula", detail, "/grow/curricula");
const FIN = (detail: string) => src("finance", "Household finances", detail, "/live/finance", "financial");
const PROJ = (detail: string) => src("projects", "Projects & research vault", detail, "/execute/projects", "documents");
const PEOPLE = (detail: string) => src("people", "People", detail, "/family/people");

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

interface ConvSpec {
    title: string;
    memberId: string;
    module: string;
    daysAgo: number;
    time: string;
    q: string;
    a: string;
    sources: Source[];
    blocked?: "safety" | "scope";
    proposal?: { kind: "task" | "plan" | "event" | "budget"; title: string; detail: string; href: string; dueInDays: number; status: "pending" | "accepted" | "dismissed" };
}

function conversations(ctx: SeedContext): ConvSpec[] {
    const ife = ctx.parents[0].id;
    const tunde = ctx.parents[1].id;
    const dami = ctx.kids[0].id;
    const tobi = ctx.kids[1].id;
    const ayo = ctx.kids[2].id;

    return [
        {
            title: "What do we need before Lagos?",
            memberId: ife,
            module: "travel",
            daysAgo: 0,
            time: "08:12",
            q: "What do we need before Lagos?",
            a: "Six things are still open on the trip, and two of them have dates that will bite:\n\n- **Passports.** Tobi's and Ayo's both expire in February. The Post Office check-and-send is three weeks at the moment, so this is a this-week job rather than a November one.\n- **The packing list is a third done** — 14 of 32 ticked, and everything unticked belongs to the children.\n- **Airport parking** is unassigned and gets dearer every week you leave it.\n- The other three are Mama Fọláké's gifts, the travel insurance and the currency, and none of those are urgent yet.\n\nIf you only do one thing today, do the passports.",
            sources: [
                TRAVEL("Christmas in Lagos · 21 Dec – 4 Jan · 6 items outstanding"),
                TRAVEL("Packing checklist: 14 of 32 ticked; the children's lists are untouched"),
                TASKS("Renew Tobi's passport — due in 9 days, assigned to Oluwafemi"),
                TASKS("Book airport parking — unassigned, no due date"),
            ],
            proposal: { kind: "task", title: "Start both children's passport renewals this week", detail: "Add a task for Oluwafemi, due Friday, linked to the Lagos trip. I have not written anything — confirm and it becomes yours to finish.", href: "/execute/tasks", dueInDays: 5, status: "pending" },
        },
        {
            title: "How are the children doing this week?",
            memberId: ife,
            module: "home",
            daysAgo: 1,
            time: "21:04",
            q: "How are the children doing this week — learning, chores, anything slipping?",
            a: "Steady, with one wobble.\n\n- **Dami** is on top of the revision blocks — five of six done — but has not touched the chemistry past paper since Tuesday.\n- **Tobi** finished the volcano project and has been feeding Bella without being asked all week.\n- **Ayo** read her memory verse aloud twice and has 155 points, which she will tell you about.\n\nThe wobble is Dami's chemistry. Everything else is where you would want it.",
            sources: [LEARN("Dami: 5 of 6 revision blocks done; chemistry paper 2 untouched since Tuesday"), CURR("Tobi: volcano project complete"), TASKS("Tobi: Bella's bowl — 7 of 7 days"), BIBLE("Ayo: memory verse read aloud twice this week")],
        },
        {
            title: "Are we living our values?",
            memberId: ife,
            module: "goals",
            daysAgo: 2,
            time: "22:15",
            q: "Are we living our values — Faith, Love, Diligence, Generosity, Joy?",
            a: "Faith and Diligence are the ones with a pulse this week: Bible study ran, the revision blocks held. Generosity is the quiet one — the giving envelope is untouched this month, which is not the same as ungenerous, but it is the only value with nothing attached to it.",
            sources: [BIBLE("Bible study ran Wednesday; 3 answered prayers logged"), GOALS("Our Future at 68% — 4 of 6 milestones"), FIN("Giving envelope: nothing spent this month")],
        },
        {
            title: "What should we do about the kitchen?",
            memberId: ife,
            module: "projects",
            daysAgo: 3,
            time: "13:40",
            q: "What is the state of the kitchen project?",
            a: "The worktop quotes are in — three of them — and the decision has been open for eleven days. Nothing else on the project moves until you pick one.",
            sources: [PROJ("Kitchen: 3 worktop quotes, decision open 11 days"), TASKS("Choose a worktop — overdue by 4 days")],
            proposal: { kind: "task", title: "Pick a worktop by Sunday", detail: "Add a decision task for both of you, due Sunday, linked to the kitchen project.", href: "/execute/tasks", dueInDays: 6, status: "accepted" },
        },
        {
            title: "A verse for a hard week",
            memberId: ife,
            module: "bible",
            daysAgo: 4,
            time: "06:50",
            q: "Give me a verse for a hard week, and something to pray for the family.",
            a: "Your reading plan is in Mark, and Mark 6:31 fits the week you have had: \"Come with me by yourselves to a quiet place and get some rest.\"\n\nFor the family: Oluwafemi's contract is still on the wall unanswered, and Dami's exams start in the spring. Those two are what I would pray.",
            sources: [BIBLE("Reading plan: Mark, day 12 of 30"), BIBLE("Prayer wall: Oluwafemi's contract — open 23 days")],
        },
        {
            title: "Can we afford the school trip?",
            memberId: ife,
            module: "finance",
            daysAgo: 5,
            time: "19:22",
            q: "Can we afford Tobi's school trip this term?",
            a: "Yes, but not out of the education envelope — that is at 88% with three weeks left. The fun envelope has room, and the Lagos fund should not be touched.",
            sources: [FIN("Education envelope: 88% used, £34 left"), FIN("Fun envelope: 41% used"), FIN("Lagos fund: £1,240 of £1,800")],
        },
        {
            title: "Who have we not seen for a while?",
            memberId: ife,
            module: "people",
            daysAgo: 7,
            time: "20:10",
            q: "Who have we not seen for a while?",
            a: "The Okonkwos — nothing logged since June — and Sister Bisi, who you last saw at the church picnic. Mama Fọláké you speak to weekly, so she is not on this list.",
            sources: [PEOPLE("The Okonkwos: last contact June"), PEOPLE("Sister Bisi: last contact at the church picnic")],
        },
        {
            title: "What is on next week?",
            memberId: ife,
            module: "calendar",
            daysAgo: 8,
            time: "07:30",
            q: "What is on for the family next week?",
            a: "Four fixed things: Bible study on Wednesday, Tobi's science fair on Thursday, swimming on Saturday morning and church on Sunday. Thursday is the only one that needs someone to take an afternoon.",
            sources: [CAL("Bible study Wed 19:30"), CAL("Science fair Thu 14:00"), CAL("Swimming Sat 09:00"), CAL("Church Sun 10:00")],
        },
        {
            title: "Is the reading goal realistic?",
            memberId: ife,
            module: "books",
            daysAgo: 10,
            time: "22:40",
            q: "Are we going to hit the reading goal this year?",
            a: "You are at 19 of 24 with just over three months left, which is comfortable — as long as the two half-finished ones get finished rather than restarted.",
            sources: [BOOKS("19 of 24 finished this year"), BOOKS("Two books at 40–60% and stalled")],
        },
        {
            title: "What did we say we would do?",
            memberId: ife,
            module: "home",
            daysAgo: 12,
            time: "21:55",
            q: "What did we decide at Sunday planning and did we do it?",
            a: "Three priorities: the passports, one evening with no screens, and Dami's chemistry plan. Two of the three happened. The screen-free evening did not.",
            sources: [src("home", "Home", "Week focus: passports · a screen-free evening · Dami's chemistry", "/"), TASKS("2 of 3 week priorities complete")],
        },
        // ---- Oluwafemi -----------------------------------------------------------
        {
            title: "Bible study for Wednesday",
            memberId: tunde,
            module: "bible",
            daysAgo: 1,
            time: "18:05",
            q: "Help me prepare Wednesday's Bible study on Mark 6.",
            a: "The group is on Mark 6 and eight people came last time. Three discussion questions that follow from the passage and from what the group actually said last week:\n\n- What does it cost the disciples to be sent out with nothing?\n- Where in your week are you feeding five thousand and forgetting to eat?\n- Who is the crowd you are avoiding?",
            sources: [BIBLE("Study group: Mark, week 4; 8 attended last week"), BIBLE("Last week's notes: 'we keep skipping the rest bit'")],
        },
        {
            title: "Lagos flights and dates",
            memberId: tunde,
            module: "travel",
            daysAgo: 2,
            time: "12:20",
            q: "Remind me of the Lagos dates and what is booked.",
            a: "21 December out, 4 January back. Flights are booked and paid. Accommodation is Mama Fọláké's, so nothing to book. Insurance and airport parking are not done.",
            sources: [TRAVEL("Christmas in Lagos · 21 Dec – 4 Jan · flights booked"), TASKS("Travel insurance — not started")],
        },
        {
            title: "A song for the evening",
            memberId: tunde,
            module: "studio",
            daysAgo: 3,
            time: "21:30",
            q: "Write us something to sing at the end of the day — an evening blessing, in G.",
            a: "Written and saved to the gallery as **Adeyemi Evening Blessing** — G, 72 bpm, two verses, a chorus and a bridge. The chords are simple enough for Dami's guitar and the chorus sits low enough for Ayo.",
            sources: [src("studio", "AI companion & generative studio", "Saved: Adeyemi Evening Blessing (G, 72 bpm)", "/create/studio/songs")],
        },
        {
            title: "The cycling club weekend",
            memberId: tunde,
            module: "calendar",
            daysAgo: 6,
            time: "07:45",
            q: "Does the cycling club weekend clash with anything?",
            a: "It clashes with the science fair on the Thursday before, which is fine, and with nothing on the weekend itself. Ifeoluwa has the co-op that Friday morning, so the children are covered.",
            sources: [CAL("Addiscombe CC ride — Sat"), CAL("Science fair Thu 14:00"), CAL("Home-ed co-op Fri 09:30")],
        },
        {
            title: "How is Dami's revision going?",
            memberId: tunde,
            module: "learning",
            daysAgo: 9,
            time: "20:00",
            q: "How is Dami's revision actually going?",
            a: "Better than she says. Five of six blocks done this week and the maths scores are climbing. Chemistry is the one she avoids, and the pattern is three weeks old now.",
            sources: [LEARN("Dami: 5 of 6 revision blocks"), LEARN("Chemistry: no session logged in 3 weeks")],
        },
        {
            title: "What is the wifi password",
            memberId: tunde,
            module: "home",
            daysAgo: 14,
            time: "16:12",
            q: "What is the wifi password?",
            a: CANT_SEE,
            sources: [],
            blocked: "scope",
        },
        // ---- Dami (young adult) ---------------------------------------------
        {
            title: "Chemistry paper 2",
            memberId: dami,
            module: "learning",
            daysAgo: 0,
            time: "16:40",
            q: "What should I revise for chemistry paper 2?",
            a: "Your plan has three topics left and you have done none of them: rates of reaction, electrolysis and organic chemistry. Rates is the shortest — forty minutes and it is off the list.",
            sources: [LEARN("Chemistry plan: 3 of 8 topics outstanding"), CAL("Revision block today 16:00")],
        },
        {
            title: "Can I afford the trainers?",
            memberId: dami,
            module: "finance",
            daysAgo: 4,
            time: "17:55",
            q: "Can I afford the trainers with my money?",
            a: "Your envelope has £18.40 left this month and the trainers are £65. If you put the next two months in, you get there in November — or you ask, which is also allowed.",
            sources: [FIN("Dami's envelope: £18.40 of £25 remaining")],
        },
        {
            title: "I've been feeling low",
            memberId: dami,
            module: "home",
            daysAgo: 6,
            time: "23:10",
            q: "I've been feeling really low and I don't want to tell anyone.",
            a: "This is bigger than me, and I'd get it wrong. Please talk to Mum or Dad — properly, today. They will not be cross with you for asking, and if it is easier I can let them know you want to talk.",
            sources: [],
            blocked: "safety",
        },
        {
            title: "Sixth form open evenings",
            memberId: dami,
            module: "projects",
            daysAgo: 11,
            time: "19:20",
            q: "When are the sixth form open evenings?",
            a: "Two are in the vault: Trinity on the 8th and Coloma on the 15th. Both are evenings, both need someone to come with you.",
            sources: [PROJ("Sixth form: Trinity 8th, Coloma 15th"), CAL("Nothing in the calendar for either")],
            proposal: { kind: "event", title: "Put both open evenings in the family calendar", detail: "Two evening events, one for each school, with Mum or Dad tagged.", href: "/execute/calendar", dueInDays: 2, status: "pending" },
        },
        // ---- Tobi (junior) ---------------------------------------------------
        {
            title: "Why do volcanoes erupt?",
            memberId: tobi,
            module: "learning",
            daysAgo: 1,
            time: "10:15",
            q: "Why do volcanoes erupt?",
            a: "Here's what I can see for you, Tobi:\n\n- Your lesson this week is **How volcanoes work** — 12 minutes and 3 questions.\n- Your project notes say the pressure builds under the rock until it has nowhere left to go, and then it goes up.\n\nIf something looks wrong, tell a grown-up and they can fix it.",
            sources: [LEARN("Lesson: How volcanoes work — 12 min, 3 questions"), PROJ("Science fair: volcano — notes and photos")],
        },
        {
            title: "What are my jobs today?",
            memberId: tobi,
            module: "tasks",
            daysAgo: 2,
            time: "07:50",
            q: "What are my jobs today?",
            a: "Three: Bella's bowl, your shoes by the door, and the dishwasher after tea. That is 30 points if you get all three.",
            sources: [TASKS("Bella's bowl · 10 pts"), TASKS("Shoes away · 5 pts"), TASKS("Dishwasher · 15 pts")],
        },
        {
            title: "Make me a story about a volcano",
            memberId: tobi,
            module: "studio",
            daysAgo: 5,
            time: "16:30",
            q: "Make me a story about someone who climbs into a volcano.",
            a: "Saved as **The Volcano Explorer** — six scenes, and you can put your own photos into any of them. Press Present and it goes full screen.",
            sources: [src("studio", "AI companion & generative studio", "Saved: The Volcano Explorer (6 scenes)", "/create/studio/stories")],
        },
        // ---- Ayo (little) ----------------------------------------------------
        {
            title: "What is my verse?",
            memberId: ayo,
            module: "bible",
            daysAgo: 1,
            time: "08:20",
            q: "What is my memory verse this week?",
            a: "Here's what I can see for you, Ayo:\n\n- Your verse is **\"Be kind to one another.\"** Ephesians 4, verse 32.\n- You have read it out loud two times this week. One more and it is finished.\n\nIf something looks wrong, tell a grown-up and they can fix it.",
            sources: [BIBLE("Ayo's verse: Ephesians 4:32 — 2 of 3 read-alouds")],
        },
    ];
}

// ---------------------------------------------------------------------------
// The seed
// ---------------------------------------------------------------------------

export function seed(ctx: SeedContext): StudioState {
    const spaceId = SPACE(ctx);
    const ife = ctx.parents[0].id;
    const tunde = ctx.parents[1].id;
    const tobi = ctx.kids[1].id;
    const ayo = ctx.kids[2].id;
    const familyName = ctx.space.name.replace(/^The\s+/i, "").replace(/\s+family$/i, "");

    const projects: CreativeProject[] = [
        { id: ctx.uid("cproj"), spaceId, memberId: ife, name: "Christmas in Lagos", childSafe: true },
        { id: ctx.uid("cproj"), spaceId, memberId: tobi, name: "Science fair", childSafe: true },
        { id: ctx.uid("cproj"), spaceId, memberId: ife, name: "Sunday songs", childSafe: true },
    ];
    const [lagosProject, sciProject, songsProject] = projects;

    const items: StudioItem[] = [];

    // ---- Songs -------------------------------------------------------------

    items.push({
        id: ctx.uid("studio"),
        spaceId,
        kind: "song",
        title: `The ${familyName} Song`,
        memberId: ife,
        createdAt: ctx.at(-26, "20:40"),
        visibility: "child",
        sharedWith: [],
        childSafe: true,
        projectId: songsProject.id,
        costCents: 9,
        data: {
            songKind: "family",
            key: "G",
            tempo: 96,
            theme: "the life we are building",
            names: ["Ifeoluwa", "Oluwafemi", "Dami", "Tobi", "Ayo"],
            prompt: "A family anthem for the Adeyemis — Croydon, five of us, faith and a long table.",
            source: "ai",
            model: "companion",
            recording: null,
            structure: [
                { section: "Verse 1", chords: "G   D   Em   C", lyrics: "Morning at the kitchen door,\nshoes and bags across the floor,\nsomebody is running late again —\nand still we hold the line." },
                { section: "Chorus", chords: "C   G   D   Em", lyrics: "We are Adeyemi, we are five,\nwe tell the truth and we tell it kind,\nwe keep the door open, we keep the table long,\nand what we build, we build to last." },
                { section: "Verse 2", chords: "G   D   Em   C", lyrics: "Croydon rain on Sunday clothes,\nJollof steaming, everyone knows\nthere is always one more chair to find —\npull it up, you're one of ours." },
                { section: "Bridge", chords: "Em   C   G   D", lyrics: "And if the years should scatter us\nfrom Croydon to the sea,\nwhatever room you're standing in,\nyou're standing here with me." },
                { section: "Chorus", chords: "C   G   D   G", lyrics: "We are Adeyemi, we are five,\nwe tell the truth and we tell it kind,\nwe keep the door open, we keep the table long,\nand what we build, we build to last." },
            ],
        },
    });

    items.push({
        id: ctx.uid("studio"),
        spaceId,
        kind: "song",
        title: "Adeyemi Evening Blessing",
        memberId: tunde,
        createdAt: ctx.at(-3, "21:35"),
        visibility: "child",
        sharedWith: [],
        childSafe: true,
        projectId: songsProject.id,
        costCents: 9,
        data: {
            songKind: "worship",
            key: "G",
            tempo: 72,
            theme: "an evening blessing",
            names: [],
            prompt: "An evening blessing for the end of the day, in G, simple enough for a fifteen-year-old's guitar.",
            source: "ai",
            model: "companion",
            recording: null,
            structure: [
                { section: "Verse 1", chords: "G   D   Em   C", lyrics: "The light goes down on Croydon,\nthe kettle finds its rest,\nand every small unfinished thing\nis laid down and is blessed." },
                { section: "Chorus", chords: "C   G   D   Em", lyrics: "Keep us, Lord, and keep this house,\nthe loud ones and the small,\nkeep the ones who are far from home —\nyou have not lost them at all." },
                { section: "Verse 2", chords: "G   D   Em   C", lyrics: "For work that went unnoticed,\nfor patience nearly gone,\nfor mercy at the dinner table,\nwe thank you and sleep on." },
                { section: "Bridge", chords: "Em   C   G   D", lyrics: "Morning comes, and mercy with it,\nnew before we wake;\nnothing we have got wrong today\nis more than you can take." },
                { section: "Chorus", chords: "C   G   D   G", lyrics: "Keep us, Lord, and keep this house,\nthe loud ones and the small,\nkeep the ones who are far from home —\nyou have not lost them at all." },
            ],
        },
    });

    items.push({
        id: ctx.uid("studio"),
        spaceId,
        kind: "song",
        title: "Sleep, Little Ayo",
        memberId: ife,
        createdAt: ctx.at(-18, "19:50"),
        visibility: "child",
        sharedWith: [],
        childSafe: true,
        projectId: songsProject.id,
        costCents: 8,
        data: {
            songKind: "lullaby",
            key: "C",
            tempo: 60,
            theme: "sleep",
            names: ["Ayo"],
            prompt: "A lullaby for Ayo, five years old, who does not like the dark.",
            source: "ai",
            model: "companion",
            recording: null,
            structure: [
                { section: "Verse 1", chords: "C   Am   F   G", lyrics: "Sleep, little Ayo, the day is done,\nthe garden's dark, the birds have gone,\nyour shoes are by the bottom stair\nand nothing needs you anywhere." },
                { section: "Chorus", chords: "F   C   G   C", lyrics: "Hush now, hush now, close your eyes,\nthe moon is doing all the work tonight." },
                { section: "Verse 2", chords: "C   Am   F   G", lyrics: "Tomorrow there'll be things to do,\nbut none of them belong to you —\nthey'll wait outside the bedroom door\nuntil the morning, and no more." },
                { section: "Bridge", chords: "Am   F   C   G", lyrics: "And if you wake and it is dark,\nI am one small room away." },
            ],
        },
    });

    // ---- Storyboards -------------------------------------------------------

    items.push({
        id: ctx.uid("studio"),
        spaceId,
        kind: "story",
        title: "Ayo and the Brave Ant",
        memberId: ayo,
        createdAt: ctx.at(-9, "16:10"),
        visibility: "child",
        sharedWith: [],
        childSafe: true,
        projectId: null,
        costCents: 12,
        data: {
            audience: "little",
            prompt: "Ayo finds an ant carrying a crumb bigger than itself, and decides to help it get home.",
            source: "ai",
            model: "companion",
            reelId: null,
            sentToReelAt: null,
            scenes: [
                { n: 1, caption: "Where it starts", visual: "A little girl crouched on a garden path in the late sun, nose almost touching the ground.", narration: "Ayo was looking for nothing in particular when she found something in particular.", imageUrl: ctx.img("studio-garden"), imageKind: "family" },
                { n: 2, caption: "The ant", visual: "Macro: one ant on a bright green leaf, carrying a crumb twice its size.", narration: "It was an ant. It was carrying a crumb bigger than its whole self.", imageUrl: ctx.img("studio-ant"), imageKind: "ai" },
                { n: 3, caption: "The trouble", visual: "The crumb tumbling off the edge of a leaf into a wide crack in the path.", narration: "The crumb fell. The ant went very still, the way you do when something is too hard.", imageUrl: ctx.img("studio-leaf"), imageKind: "ai" },
                { n: 4, caption: "The try", visual: "A child's finger laid flat on the path like a bridge, ant approaching.", narration: "\"I can be a bridge,\" said Ayo, and she lay her finger down and waited, and waiting was the hard part.", imageUrl: ctx.img("studio-picnic"), imageKind: "family" },
                { n: 5, caption: "The turn", visual: "The ant walking across the finger, crumb held high.", narration: "The ant walked straight across her, as if it had been expecting her all along.", imageUrl: ctx.img("studio-hero"), imageKind: "family" },
                { n: 6, caption: "Home again", visual: "Evening light, the girl at the kitchen door, telling the story with her hands.", narration: "Ayo went in for tea and told everybody, twice. Bravery, she decided, is mostly carrying on.", imageUrl: ctx.img("studio-singing"), imageKind: "family" },
            ],
        },
    });

    items.push({
        id: ctx.uid("studio"),
        spaceId,
        kind: "story",
        title: "The Volcano Explorer",
        memberId: tobi,
        createdAt: ctx.at(-5, "16:35"),
        visibility: "child",
        sharedWith: [],
        childSafe: true,
        projectId: sciProject.id,
        costCents: 12,
        data: {
            audience: "junior",
            prompt: "A boy who climbs down inside a volcano to find out why it is angry.",
            source: "ai",
            model: "companion",
            reelId: null,
            sentToReelAt: null,
            scenes: [
                { n: 1, caption: "Where it starts", visual: "A boy with a notebook at the foot of a black mountain, steam on the ridge.", narration: "Everyone said the mountain was angry. Tobi wanted to know what it was angry about.", imageUrl: ctx.img("studio-volcano"), imageKind: "ai" },
                { n: 2, caption: "The wish", visual: "The notebook open, a hand-drawn cross-section of a volcano.", narration: "He drew it first, because drawing a thing is halfway to understanding it.", imageUrl: null, imageKind: "none" },
                { n: 3, caption: "The trouble", visual: "Ground shaking, small stones jumping on the path.", narration: "Halfway up, the mountain cleared its throat.", imageUrl: null, imageKind: "none" },
                { n: 4, caption: "The try", visual: "A rope, a ledge, and a very small figure against a red glow.", narration: "He went down anyway, slowly, checking every hold twice.", imageUrl: null, imageKind: "none" },
                { n: 5, caption: "The turn", visual: "Glowing lava seen from above, patterns in the crust.", narration: "It was not angry at all. It was full — and full things have to move.", imageUrl: null, imageKind: "none" },
                { n: 6, caption: "Home again", visual: "The boy back at the school hall, a model volcano on a trestle table.", narration: "He built one for the science fair. It only erupted once, which was once more than planned.", imageUrl: null, imageKind: "none" },
            ],
        },
    });

    items.push({
        id: ctx.uid("studio"),
        spaceId,
        kind: "story",
        title: "Christmas in Lagos",
        memberId: ife,
        createdAt: ctx.at(-2, "20:05"),
        visibility: "shared",
        sharedWith: [ctx.guests[0].id],
        childSafe: true,
        projectId: lagosProject.id,
        costCents: 12,
        data: {
            audience: "family",
            prompt: "The story of the journey to Grandma's at Christmas, to send to Mama Fọláké before we come.",
            source: "ai",
            model: "companion",
            reelId: null,
            sentToReelAt: null,
            scenes: [
                { n: 1, caption: "Where it starts", visual: "Five suitcases in a Croydon hallway, coats on, December dark outside.", narration: "It begins the way it always begins: too many bags and not enough hands.", imageUrl: null, imageKind: "none" },
                { n: 2, caption: "The wish", visual: "A phone screen showing a grandmother waving, held up so everyone can see.", narration: "\"Come and see me,\" she says, every Sunday, for a year.", imageUrl: null, imageKind: "none" },
                { n: 3, caption: "The trouble", visual: "A passport open on a kitchen table, an expiry date circled.", narration: "Two passports, both running out in February. Christmas nearly stayed in Croydon.", imageUrl: null, imageKind: "none" },
                { n: 4, caption: "The try", visual: "Night flight, five seats, three of them asleep.", narration: "Six and a half hours. Ayo slept through all of it and none of us did.", imageUrl: null, imageKind: "none" },
                { n: 5, caption: "The turn", visual: "Lagos at golden hour, skyline and water.", narration: "And then the doors open and the air is warm and it is not a photograph any more.", imageUrl: ctx.img("studio-lagos"), imageKind: "ai" },
                { n: 6, caption: "Home again", visual: "A long table outdoors, many hands reaching in.", narration: "Grandma counts us twice, in case. Then she feeds all of us until we cannot move.", imageUrl: null, imageKind: "none" },
            ],
        },
    });

    // ---- Pictures ----------------------------------------------------------

    items.push({
        id: ctx.uid("studio"),
        spaceId,
        kind: "image",
        title: "Brave Ant — cover",
        memberId: ife,
        createdAt: ctx.at(-9, "16:22"),
        visibility: "child",
        sharedWith: [],
        childSafe: true,
        projectId: null,
        costCents: 26,
        data: {
            prompt: "A warm storybook illustration of an ant carrying a crumb across a green leaf, soft watercolour, for a five-year-old.",
            url: ctx.img("studio-illustration"),
            status: "generated",
            model: "companion",
            note: "",
            palette: paletteFor("brave ant cover"),
        },
    });

    items.push({
        id: ctx.uid("studio"),
        spaceId,
        kind: "image",
        title: "Sunday table",
        memberId: tunde,
        createdAt: ctx.at(-1, "18:40"),
        visibility: "family",
        sharedWith: [],
        childSafe: true,
        projectId: null,
        costCents: 0,
        data: {
            prompt: "Our long Sunday table with every chair full and one spare, in the style of a woodcut.",
            url: null,
            status: "unavailable_typographic",
            model: null,
            note: IMAGE_UNAVAILABLE,
            palette: paletteFor("Our long Sunday table with every chair full and one spare"),
        },
    });

    // ---- Conversations -----------------------------------------------------

    for (const c of conversations(ctx)) {
        const at = ctx.at(-c.daysAgo, c.time);
        const answerAt = new Date(new Date(at).getTime() + 9000).toISOString();
        const messages: ChatMessage[] = [
            { id: ctx.uid("msg"), from: "me", text: c.q, at, sources: [], proposal: null, blocked: null },
            {
                id: ctx.uid("msg"),
                from: "wafe",
                text: c.a,
                at: answerAt,
                sources: c.sources,
                proposal: c.proposal
                    ? {
                          id: ctx.uid("prop"),
                          kind: c.proposal.kind,
                          title: c.proposal.title,
                          detail: c.proposal.detail,
                          memberId: null,
                          dueDate: ctx.day(c.proposal.dueInDays),
                          href: c.proposal.href,
                          status: c.proposal.status,
                          decidedAt: c.proposal.status === "pending" ? null : ctx.at(-c.daysAgo + 1, "09:00"),
                      }
                    : null,
                blocked: c.blocked ?? null,
            },
        ];
        const member = ctx.members.find((m) => m.id === c.memberId);
        items.push({
            id: ctx.uid("studio"),
            spaceId,
            kind: "chat",
            title: c.title,
            memberId: c.memberId,
            createdAt: at,
            visibility: "private",
            sharedWith: [],
            childSafe: false,
            projectId: null,
            costCents: 2,
            data: { moduleContext: c.module, messages, visibleToParents: member?.role === "child" },
        });
    }

    const costCents = items.reduce((n, i) => n + i.costCents, 0);

    return {
        items,
        projects,
        plan: "household",
        // 61% of the Household allowance — the seeded work above, plus the
        // briefings that have run every morning this month.
        usage: { month: ctx.today.slice(0, 7), tokens: 486_400, costCents: Math.max(732, costCents), capCents: 1200, warnedAt: null },
    };
}
