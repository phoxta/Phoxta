import type { SeedContext } from "@/data/core";
import type { Clip, Comparison, ComparisonScore, Decision, Note, NoteBlock, Project, ProjectCard, ProjectCost, ProjectsState } from "./types";

/**
 * The Adeyemis' projects, as they would actually be on a Sunday in September.
 *
 * Seven of them, on purpose: the kitchen refresh mid-flight and slightly over
 * its quotes, the sixth-form search scored and undecided, Tobi's science fair
 * (his own board, his own cards), Christmas in Lagos shared with Mama Fọláké,
 * Dami's family website — a fifteen-year-old owning a project outright —
 * Ifeoluwa's consultancy sprint kept private, and Ayo's primary school archived
 * and read-only with the decision that closed it still on the header.
 *
 * Everything is relative to `ctx.today`, so the demo never goes stale.
 */

const slug = (s: string): string =>
    s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 28);

export function seed(ctx: SeedContext): ProjectsState {
    const [ife, tunde] = ctx.parents;
    const [dami, tobi, ayo] = ctx.kids;
    const [folake] = ctx.guests;

    const projects: Project[] = [];
    const cards: ProjectCard[] = [];
    const costs: ProjectCost[] = [];
    const clips: Clip[] = [];
    const notes: Note[] = [];
    const comparisons: Comparison[] = [];
    const scores: ComparisonScore[] = [];
    const decisions: Decision[] = [];

    const project = (p: Omit<Project, "id" | "spaceId" | "createdAt"> & { createdAt?: string }): Project => {
        const row: Project = { ...p, id: ctx.uid("proj"), spaceId: ctx.space.id, createdAt: p.createdAt ?? ctx.at(-45, "20:00") };
        projects.push(row);
        return row;
    };

    const card = (
        projectId: string,
        title: string,
        status: ProjectCard["status"],
        opts: { who?: string[]; due?: number | null; notes?: string; checklist?: Array<[string, boolean]>; childSafe?: boolean; doneDays?: number } = {},
    ): ProjectCard => {
        const order = cards.filter((c) => c.projectId === projectId && c.status === status).length;
        const row: ProjectCard = {
            id: ctx.uid("pcard"),
            spaceId: ctx.space.id,
            projectId,
            title,
            notes: opts.notes ?? "",
            assigneeMemberIds: opts.who ?? [],
            dueAt: opts.due === null || opts.due === undefined ? null : ctx.at(opts.due, "18:00"),
            status,
            order,
            checklist: (opts.checklist ?? []).map(([text, done]) => ({ id: ctx.uid("chk"), text, done })),
            childSafe: opts.childSafe ?? true,
            doneAt: status === "done" ? ctx.at(opts.doneDays ?? -6, "19:30") : null,
            createdAt: ctx.at(-30, "09:00"),
        };
        cards.push(row);
        return row;
    };

    const cost = (projectId: string, label: string, amountCents: number, days: number, stage: ProjectCost["stage"]): void => {
        costs.push({ id: ctx.uid("cost"), spaceId: ctx.space.id, projectId, label, amountCents, paidOn: ctx.day(days), stage, createdAt: ctx.at(days, "12:00") });
    };

    const clip = (c: Omit<Clip, "id" | "spaceId" | "createdAt"> & { days: number }): Clip => {
        const { days, ...rest } = c;
        const row: Clip = { id: ctx.uid("clip"), spaceId: ctx.space.id, createdAt: ctx.at(days, "21:15"), ...rest };
        clips.push(row);
        return row;
    };

    const blocks = (raw: Array<[NoteBlock["type"], string] | [NoteBlock["type"], string, boolean]>): NoteBlock[] =>
        raw.map(([type, text, done]) => ({ id: ctx.uid("blk"), type, text, done: done ?? false }));

    const note = (n: Omit<Note, "id" | "spaceId" | "createdAt" | "updatedAt"> & { days: number }): Note => {
        const { days, ...rest } = n;
        const row: Note = { id: ctx.uid("pnote"), spaceId: ctx.space.id, createdAt: ctx.at(days - 2, "20:00"), updatedAt: ctx.at(days, "20:40"), ...rest };
        notes.push(row);
        return row;
    };

    /** A comparison plus its whole score matrix, written the way a family fills it in. */
    const comparison = (
        projectId: string,
        title: string,
        criteria: Array<[string, number]>,
        options: Array<{ label: string; note?: string; link?: string; scores: number[] }>,
        days: number,
    ): Comparison => {
        const row: Comparison = {
            id: ctx.uid("cmp"),
            spaceId: ctx.space.id,
            projectId,
            title,
            criteria: criteria.map(([label, weight]) => ({ key: slug(label), label, weight })),
            options: options.map((o) => ({ key: slug(o.label), label: o.label, note: o.note ?? "", link: o.link ?? "" })),
            createdAt: ctx.at(days, "21:00"),
        };
        comparisons.push(row);
        options.forEach((o) => {
            row.criteria.forEach((cr, i) => {
                scores.push({ comparisonId: row.id, optionKey: slug(o.label), criterionKey: cr.key, score: o.scores[i] ?? 0 });
            });
        });
        return row;
    };

    const decide = (projectId: string, comparisonId: string | null, decision: string, because: string, by: string, days: number): Decision => {
        const row: Decision = { id: ctx.uid("dec"), spaceId: ctx.space.id, projectId, comparisonId, decision, because, decidedBy: by, decidedAt: ctx.at(days, "21:30") };
        decisions.push(row);
        return row;
    };

    // -----------------------------------------------------------------------
    // 1. Kitchen refresh — the big one, mid-flight, with a decision on it
    // -----------------------------------------------------------------------

    const kitchen = project({
        title: "Kitchen refresh",
        summary: "New units, a proper island and a floor that survives three children. Doing it once, doing it properly, and finishing before the Lagos trip.",
        kind: "home",
        status: "active",
        ownerMemberId: ife.id,
        members: [
            { memberId: ife.id, role: "owner" },
            { memberId: tunde.id, role: "member" },
            { memberId: dami.id, role: "watcher" },
        ],
        startDate: ctx.day(-40),
        endDate: ctx.day(26),
        coverUrl: ctx.img("projects-kitchen"),
        budgetCents: 650000,
        financeCategoryId: "housing",
        financeCategoryLabel: "Housing",
        goalId: "goal-1",
        goalLabel: "A home that welcomes people",
        tripId: null,
        valueId: "Diligence",
        tags: ["home", "kitchen", "2026"],
        visibility: "family",
        sharedWith: [],
        childSafe: true,
        archived: false,
        archivedAt: null,
        decisionId: null,
    });

    card(kitchen.id, "Measure up and draw the plan", "done", { who: [ife.id], due: -34, doneDays: -33 });
    card(kitchen.id, "Get three quotes", "done", { who: [ife.id, tunde.id], due: -26, doneDays: -24, checklist: [["Croydon Joinery Co", true], ["Kitchens Direct", true], ["Howdens + a fitter", true]] });
    card(kitchen.id, "Score the fitters together", "done", { who: [ife.id, tunde.id], due: -20, doneDays: -20 });
    card(kitchen.id, "Choose the fitter and sign", "done", { who: [ife.id], due: -17, doneDays: -17 });
    card(kitchen.id, "Pay the deposit", "done", { who: [tunde.id], due: -16, doneDays: -16 });
    card(kitchen.id, "Empty the cupboards into the garage", "done", { who: [tunde.id, dami.id], due: -6, doneDays: -6 });
    card(kitchen.id, "Choose the worktop", "doing", { who: [ife.id], due: 1, notes: "Quartz or oiled oak. Samples are on the windowsill — decide after church.", checklist: [["Order samples", true], ["Live with them for a week", true], ["Pick one", false]] });
    card(kitchen.id, "Book the electrician for the island", "doing", { who: [tunde.id], due: 2 });
    card(kitchen.id, "Confirm the appliance delivery slot", "todo", { who: [ife.id], due: -1, notes: "The oven is the long lead item; the slot needs confirming before Friday." });
    card(kitchen.id, "Order the handles and taps", "todo", { who: [ife.id], due: 5 });
    card(kitchen.id, "Arrange a skip for the old units", "todo", { who: [tunde.id], due: 9 });
    card(kitchen.id, "Paint the utility while the room is empty", "todo", { who: [tunde.id, dami.id], due: 14 });
    card(kitchen.id, "Snagging walk-through with the joiner", "todo", { who: [ife.id, tunde.id], due: 24 });
    card(kitchen.id, "Cook the first Sunday dinner in it", "todo", { who: [], due: 26, notes: "Jollof. Obviously." });

    cost(kitchen.id, "Croydon Joinery Co — deposit", 195000, -16, "deposit");
    cost(kitchen.id, "Units and carcasses", 148000, -12, "paid");
    cost(kitchen.id, "Appliances (oven, hob, extractor)", 61000, -8, "paid");
    cost(kitchen.id, "Electrician — island ring main", 42000, -3, "quote");
    cost(kitchen.id, "Flooring — engineered oak", 78000, -2, "quote");

    const fitters = comparison(
        kitchen.id,
        "Which fitter",
        [
            ["Lead time", 5],
            ["Reviews", 5],
            ["Price", 4],
            ["Warranty", 3],
            ["Handles the electrics", 2],
        ],
        [
            { label: "Croydon Joinery Co", note: "Local, three weeks, came recommended at church.", link: "https://www.checkatrade.com/", scores: [9, 9, 7, 8, 6] },
            { label: "Kitchens Direct", note: "Cheapest, but eleven weeks and a call centre.", link: "https://www.which.co.uk/", scores: [3, 5, 9, 7, 8] },
            { label: "Howdens + a fitter", note: "Good units, but we would be managing two trades.", link: "https://www.howdens.com/", scores: [6, 7, 6, 6, 3] },
        ],
        -21,
    );

    const kitchenDecision = decide(
        kitchen.id,
        fitters.id,
        "Chose the local joiner because of lead time and reviews",
        "Croydon Joinery Co can start in three weeks against eleven for Kitchens Direct, and every review we could find says they turn up when they say they will. We paid about £600 more than the cheapest quote and bought back two months of a working kitchen.",
        ife.id,
        -17,
    );
    kitchen.decisionId = kitchenDecision.id;

    clip({
        projectId: kitchen.id,
        folder: "Kitchen",
        url: "https://www.which.co.uk/reviews/fitted-kitchens/article/how-to-buy-the-best-fitted-kitchen",
        title: "How to buy the best fitted kitchen",
        excerpt: "Budget 10–15% on top of the quote for the things nobody quotes for: making good, waste, and the week you eat from a microwave in the hall.",
        imageUrl: ctx.img("projects-clip-worktop"),
        snapshotText:
            "A fitted kitchen is three costs pretending to be one: the units, the fitting, and everything the quote calls 'making good'. Plan the third at ten to fifteen per cent of the first two. Lead times matter more than headline price — a cheaper kitchen that lands in eleven weeks costs a family two months of cooking. Ask for the fitter's own last three jobs and phone one of them.",
        snapshotSource: "selection",
        tags: ["kitchen", "budget"],
        savedBy: ife.id,
        visibility: "family",
        sharedWith: [],
        childSafe: true,
        days: -30,
    });
    clip({
        projectId: kitchen.id,
        folder: "Kitchen",
        url: "https://www.homebuilding.co.uk/advice/kitchen-worktops",
        title: "Quartz vs oiled oak worktops, honestly compared",
        excerpt: "Oak wants oiling twice a year and forgives a scratch. Quartz forgives nothing and needs nothing.",
        imageUrl: ctx.img("projects-clip-worktop"),
        snapshotText:
            "Quartz is the low-maintenance answer: non-porous, heat-tolerant to a point, and unchanged in ten years. Oiled oak is the warm one: it marks, it patinas, and it wants oiling twice a year. With small children the real question is not durability but whether you mind the marks — oak hides crumbs and shows rings; quartz shows crumbs and hides everything else.",
        snapshotSource: "companion",
        tags: ["kitchen", "worktop"],
        savedBy: ife.id,
        visibility: "family",
        sharedWith: [],
        childSafe: true,
        days: -9,
    });
    clip({
        projectId: kitchen.id,
        folder: "Kitchen",
        url: "https://www.checkatrade.com/trades/croydonjoinery",
        title: "Croydon Joinery Co — 148 reviews, 9.8/10",
        excerpt: "Turned up on the day they said, cleaned up every evening, and the snagging list was two items.",
        imageUrl: ctx.img("projects-clip-joiner"),
        snapshotText:
            "One hundred and forty-eight reviews averaging 9.8. The pattern across the last twenty: arrives when promised, tidies nightly, and does the snagging without being chased. Two complaints, both about how long the quote took to arrive.",
        snapshotSource: "selection",
        tags: ["kitchen", "fitter"],
        savedBy: tunde.id,
        visibility: "family",
        sharedWith: [],
        childSafe: true,
        days: -23,
    });

    note({
        projectId: kitchen.id,
        folder: "Kitchen",
        title: "Call with the joiner — 3 September",
        blocks: blocks([
            ["h", "What we agreed"],
            ["p", "Three weeks from deposit to first day on site. He brings his own electrician for the island, which takes one trade off our hands."],
            ["ul", "Units in oak-effect, handleless on the island only"],
            ["ul", "He supplies the worktop template, we supply the worktop"],
            ["ul", "Ten-year guarantee on the carcasses, two on the fitting"],
            ["h", "Still to do"],
            ["todo", "Confirm the appliance delivery slot", false],
            ["todo", "Send him the electrics drawing", true],
            ["quote", "\"Nobody has ever regretted a wider island.\" — his words, not ours."],
        ]),
        tags: ["kitchen", "fitter"],
        sensitivity: "general",
        ownerMemberId: ife.id,
        visibility: "family",
        sharedWith: [],
        childSafe: true,
        days: -3,
    });

    // -----------------------------------------------------------------------
    // 2. Sixth-form search 2027 — three options, six criteria, nine clips
    // -----------------------------------------------------------------------

    const sixth = project({
        title: "Sixth-form search 2027",
        summary: "Where Dami goes after GCSEs. Chemistry, maths and biology, a sane journey, and somewhere she is known by name.",
        kind: "school",
        status: "active",
        ownerMemberId: ife.id,
        members: [
            { memberId: ife.id, role: "owner" },
            { memberId: tunde.id, role: "member" },
            { memberId: dami.id, role: "member" },
        ],
        startDate: ctx.day(-21),
        endDate: ctx.day(118),
        coverUrl: ctx.img("projects-sixthform"),
        budgetCents: null,
        financeCategoryId: null,
        financeCategoryLabel: "",
        goalId: null,
        goalLabel: "",
        tripId: null,
        valueId: "Diligence",
        tags: ["dami", "school", "2027"],
        visibility: "family",
        sharedWith: [],
        childSafe: true,
        archived: false,
        archivedAt: null,
        decisionId: null,
        createdAt: ctx.at(-21, "22:00"),
    });

    card(sixth.id, "List every option within 45 minutes", "done", { who: [ife.id], due: -18, doneDays: -18 });
    card(sixth.id, "Book the three open evenings", "done", { who: [dami.id], due: -12, doneDays: -13 });
    card(sixth.id, "Coloma open evening", "done", { who: [ife.id, dami.id], due: -7, doneDays: -7 });
    card(sixth.id, "Trinity open evening", "doing", { who: [tunde.id, dami.id], due: 4 });
    card(sixth.id, "Score all three together", "todo", { who: [ife.id, tunde.id, dami.id], due: 11, notes: "Dami scores first on her own, then we compare. Her weighting, not ours." });
    card(sixth.id, "Check the 119 bus at 7:40 on a wet Tuesday", "todo", { who: [dami.id], due: 8 });
    card(sixth.id, "Applications open", "todo", { who: [dami.id], due: 60 });
    card(sixth.id, "Decision, written down", "todo", { who: [ife.id, tunde.id, dami.id], due: 96 });

    comparison(
        sixth.id,
        "Three sixth forms",
        [
            ["Chemistry and maths results", 5],
            ["Journey", 4],
            ["Pastoral care", 5],
            ["Bursary and costs", 3],
            ["Music", 2],
            ["Where leavers go", 4],
        ],
        [
            { label: "Coloma Convent Girls", note: "25 minutes on the 119. Chapel, and she already knows three girls there.", link: "https://www.coloma.croydon.sch.uk/", scores: [8, 8, 9, 7, 8, 8] },
            { label: "Trinity School", note: "Strongest results of the three, but a 50-minute journey and a fee unless the bursary lands.", link: "https://www.trinity-school.org/", scores: [10, 4, 7, 4, 9, 9] },
            { label: "Harris Crystal Palace", note: "Twelve minutes door to door and free. Newer sixth form, smaller science cohort.", link: "https://www.harriscrystalpalace.org.uk/", scores: [6, 10, 7, 9, 4, 6] },
        ],
        -6,
    );

    const sixthClips: Array<[string, string, string, string, string, string[], boolean]> = [
        [
            "Coloma Convent Girls' School — sixth form results 2026",
            "https://www.coloma.croydon.sch.uk/sixth-form/results",
            "68% of A-level entries at A*–B; chemistry 74% A*–B across 41 entries.",
            "Sixty-eight per cent of A-level entries graded A*–B across the school. Chemistry is one of the larger cohorts at forty-one entries with seventy-four per cent A*–B, and further maths runs every year with a small group. Ninety-one per cent of leavers went to their first-choice university.",
            "projects-clip-school",
            ["coloma", "results"],
            true,
        ],
        [
            "Trinity School Sixth Form — entry and bursaries",
            "https://www.trinity-school.org/admissions/bursaries",
            "Means-tested bursaries up to 100% of fees; the application window closes in November.",
            "Bursaries are means-tested against household income and assets and run from ten to one hundred per cent of fees. The form opens in September and closes in November, ahead of the entrance assessment in January. The school asks for two years of accounts where a parent is self-employed.",
            "projects-clip-study",
            ["trinity", "bursary"],
            true,
        ],
        [
            "Harris Crystal Palace — sixth form prospectus",
            "https://www.harriscrystalpalace.org.uk/sixth-form",
            "Free, twelve minutes away, and a science block finished in 2024.",
            "A non-selective sixth form with an open entry requirement of five grade 5s including maths and English, and grade 6 in the subjects to be studied. Science moved into a new block in 2024. The sixth-form cohort is around one hundred and eighty, with chemistry taught in one group of eighteen.",
            "projects-clip-school",
            ["harris", "prospectus"],
            true,
        ],
        [
            "Ofsted report — Coloma Convent Girls' School",
            "https://reports.ofsted.gov.uk/provider/23/101234",
            "Outstanding for personal development; good for quality of education.",
            "Inspectors found pupils 'articulate, kind and unusually well known to staff'. Personal development is graded outstanding. The sixth form is graded good, with a note that the range of subjects is narrower than in larger providers.",
            "projects-clip-school",
            ["coloma", "ofsted"],
            true,
        ],
        [
            "The Good Schools Guide on choosing a sixth form",
            "https://www.goodschoolsguide.co.uk/choosing-a-school/sixth-form",
            "Ask who teaches the subject, not who runs the school.",
            "The guide's advice reduces to four questions: who actually teaches the A-level, how many take it, what happens to the ones who fall behind, and where last year's leavers went. Results tables answer none of these. Visit on an ordinary Tuesday rather than an open evening if the school will let you.",
            "projects-clip-study",
            ["advice"],
            true,
        ],
        [
            "TfL journey planner — Croydon to Shirley, 07:40",
            "https://tfl.gov.uk/plan-a-journey/",
            "119 bus, 24 minutes scheduled, 38 on a wet Tuesday in term time.",
            "Scheduled at twenty-four minutes with a single change to walk. Real-time data over the last fortnight puts the 07:40 at an average of thirty-one minutes and a worst case of thirty-eight. The alternative tram plus walk is more reliable and eight minutes longer.",
            "projects-clip-study",
            ["journey"],
            true,
        ],
        [
            "What A-levels do universities actually want for medicine?",
            "https://www.ucas.com/subject/medicine",
            "Chemistry plus one of biology, physics or maths, at A*AA for most schools.",
            "Nearly every UK medical school requires chemistry to A-level and one further science or maths. Typical offers sit at A*AA to AAA. The personal statement matters less than it used to; the admissions test and the interview matter more.",
            "projects-clip-results",
            ["ucas", "medicine"],
            true,
        ],
        [
            "Dami's own notes from the Coloma open evening",
            "https://www.coloma.croydon.sch.uk/sixth-form/open-evening",
            "The chemistry teacher let me titrate something. Nobody read a script at me.",
            "Dami's write-up: the chemistry department ran a real practical rather than a talk, the sixth-form common room is small but theirs, and two of the girls showing people round were doing the same subject combination she wants. Her one worry is that further maths depends on numbers each year.",
            "projects-clip-study",
            ["coloma", "dami"],
            true,
        ],
        [
            "Mumsnet thread — Trinity bursary, what they actually ask for",
            "https://www.mumsnet.com/talk/secondary_education/",
            "They asked for two years of accounts and the mortgage statement.",
            "Parents on the thread describe a thorough means test: two years of accounts for the self-employed, the mortgage statement, and a question about savings held in a child's name. Several note that the award is reviewed annually and can fall if income rises.",
            "projects-clip-study",
            ["trinity", "bursary", "money"],
            false,
        ],
    ];
    sixthClips.forEach(([title, url, excerpt, snapshot, img, tags, childSafe], i) => {
        clip({
            projectId: sixth.id,
            folder: "Sixth form",
            url,
            title,
            excerpt,
            imageUrl: ctx.img(img),
            snapshotText: snapshot,
            snapshotSource: i === 7 ? "typed" : i % 3 === 1 ? "companion" : "selection",
            tags,
            savedBy: i === 7 ? dami.id : i % 2 === 0 ? ife.id : tunde.id,
            visibility: "family",
            sharedWith: [],
            childSafe,
            days: -18 + i * 2,
        });
    });

    note({
        projectId: sixth.id,
        folder: "Sixth form",
        title: "Coloma open evening — what we saw",
        blocks: blocks([
            ["h", "The chemistry department"],
            ["p", "Small groups, one teacher for the whole two years, and a practical running rather than a slideshow. Dami spoke to two girls doing her exact combination."],
            ["ul", "Further maths runs, but numbers decide it each September"],
            ["ul", "Sixth-form common room is small and entirely theirs"],
            ["ul", "Chapel on Wednesdays, optional after Year 11"],
            ["h", "What Dami said in the car"],
            ["quote", "\"Nobody read a script at me. The chemistry teacher just handed me a burette.\""],
            ["todo", "Ask about the further maths numbers for 2027", false],
            ["todo", "Get the 119 timings on a wet Tuesday", true],
        ]),
        tags: ["coloma", "visit"],
        sensitivity: "general",
        ownerMemberId: ife.id,
        visibility: "family",
        sharedWith: [],
        childSafe: true,
        days: -7,
    });

    // Financial: hidden from Dami and from every guest, whatever the visibility says.
    note({
        projectId: sixth.id,
        folder: "Sixth form",
        title: "Fees, bursary and what we can actually carry",
        blocks: blocks([
            ["h", "Trinity, if the bursary does not land"],
            ["p", "Full fees are beyond us with the kitchen running and the Lagos flights booked. A 60% award makes it possible; anything less does not."],
            ["ul", "Bursary form needs two years of the consultancy's accounts"],
            ["ul", "Travel adds about £62 a month on top"],
            ["todo", "Talk to Oluwafemi before we let Dami fall in love with it", false],
        ]),
        tags: ["trinity", "money"],
        sensitivity: "financial",
        ownerMemberId: ife.id,
        visibility: "family",
        sharedWith: [],
        childSafe: false,
        days: -5,
    });

    // -----------------------------------------------------------------------
    // 3. Tobi's science fair — a nine-year-old with a real board
    // -----------------------------------------------------------------------

    const fair = project({
        title: "Tobi's science fair",
        summary: "A working volcano, a fair test, and a poster he can talk through without reading it.",
        kind: "school",
        status: "active",
        ownerMemberId: ife.id,
        members: [
            { memberId: ife.id, role: "owner" },
            { memberId: tobi.id, role: "member" },
            { memberId: ayo.id, role: "watcher" },
        ],
        startDate: ctx.day(-14),
        endDate: ctx.day(4),
        coverUrl: ctx.img("projects-sciencefair"),
        budgetCents: 4000,
        financeCategoryId: "education",
        financeCategoryLabel: "Education",
        goalId: null,
        goalLabel: "",
        tripId: null,
        valueId: "Joy",
        tags: ["tobi", "science"],
        visibility: "family",
        sharedWith: [],
        childSafe: true,
        archived: false,
        archivedAt: null,
        decisionId: null,
        createdAt: ctx.at(-14, "17:00"),
    });

    card(fair.id, "Pick the question", "done", { who: [tobi.id], due: -12, doneDays: -12, notes: "Does the shape of the crater change how far the lava goes?" });
    card(fair.id, "Build the cone", "done", { who: [tobi.id, tunde.id], due: -5, doneDays: -5 });
    card(fair.id, "Run the test three times and measure", "doing", { who: [tobi.id], due: 1, checklist: [["Run 1", true], ["Run 2", true], ["Run 3", false]] });
    card(fair.id, "Draw the results chart", "todo", { who: [tobi.id], due: 2 });
    card(fair.id, "Make the poster", "todo", { who: [tobi.id, ayo.id], due: 3, notes: "Ayo does the lettering. She has been promised this." });
    card(fair.id, "Practise saying it out loud", "todo", { who: [tobi.id], due: 3 });

    cost(fair.id, "Bicarbonate, vinegar and card", 1180, -6, "paid");

    clip({
        projectId: fair.id,
        folder: "Science fair",
        url: "https://www.sciencekids.co.nz/experiments/volcano.html",
        title: "The classic bicarbonate volcano, with the fair-test bit",
        excerpt: "Change one thing only. Measure the same way every time. Three runs, not one.",
        imageUrl: ctx.img("projects-clip-volcano"),
        snapshotText:
            "The reaction is bicarbonate of soda and vinegar making carbon dioxide, and the foam is washing-up liquid holding the gas. To make it an experiment rather than a demonstration, change one thing — the crater width — keep everything else the same, and measure the distance the foam travels three times for each width.",
        snapshotSource: "selection",
        tags: ["science", "tobi"],
        savedBy: ife.id,
        visibility: "child",
        sharedWith: [],
        childSafe: true,
        days: -11,
    });

    note({
        projectId: fair.id,
        folder: "Science fair",
        title: "Tobi's method",
        blocks: blocks([
            ["h", "My question"],
            ["p", "Does a wider crater make the lava go further?"],
            ["h", "What I keep the same"],
            ["ul", "2 spoons of bicarb every time"],
            ["ul", "100 ml of vinegar every time"],
            ["ul", "Same table, same tray"],
            ["h", "What I change"],
            ["p", "The hole at the top: 2 cm, 4 cm, 6 cm."],
            ["todo", "Run 1 done", true],
            ["todo", "Run 2 done", true],
            ["todo", "Run 3", false],
        ]),
        tags: ["science", "tobi"],
        sensitivity: "general",
        ownerMemberId: tobi.id,
        visibility: "child",
        sharedWith: [],
        childSafe: true,
        days: -2,
    });

    // -----------------------------------------------------------------------
    // 4. Christmas in Lagos — shared with Mama Fọláké, and nothing else is
    // -----------------------------------------------------------------------

    const lagos = project({
        title: "Christmas in Lagos: the planning",
        summary: "Five of us, three weeks, one December. Flights, passports, and what we carry for the family in Ibadan.",
        kind: "trip",
        status: "active",
        ownerMemberId: tunde.id,
        members: [
            { memberId: tunde.id, role: "owner" },
            { memberId: ife.id, role: "member" },
            { memberId: folake.id, role: "watcher" },
        ],
        startDate: ctx.day(-60),
        endDate: ctx.day(104),
        coverUrl: ctx.img("projects-lagos"),
        budgetCents: 480000,
        financeCategoryId: "travel",
        financeCategoryLabel: "Travel",
        goalId: "goal-2",
        goalLabel: "Christmas in Lagos, all five of us",
        tripId: "trip-1",
        valueId: "Love",
        tags: ["lagos", "christmas", "family"],
        visibility: "shared",
        sharedWith: [folake.id],
        childSafe: true,
        archived: false,
        archivedAt: null,
        decisionId: null,
        createdAt: ctx.at(-60, "21:00"),
    });

    card(lagos.id, "Book the flights", "done", { who: [tunde.id], due: -44, doneDays: -45 });
    card(lagos.id, "Renew Tobi's and Ayo's passports", "doing", { who: [ife.id], due: -2, notes: "Both expire in February. The forms are half done on the kitchen table." });
    card(lagos.id, "Yellow fever certificates", "todo", { who: [tunde.id], due: 20 });
    card(lagos.id, "Ask Mama Fọláké what to bring", "todo", { who: [tunde.id], due: 7 });
    card(lagos.id, "Work out the December handover at the office", "todo", { who: [tunde.id], due: 40 });

    cost(lagos.id, "Flights — five return", 412000, -45, "paid");

    clip({
        projectId: lagos.id,
        folder: "Lagos",
        url: "https://www.gov.uk/foreign-travel-advice/nigeria/entry-requirements",
        title: "Nigeria entry requirements — passports and yellow fever",
        excerpt: "Six months' validity on arrival, and a yellow fever certificate for everyone over nine months old.",
        imageUrl: null,
        snapshotText:
            "Passports must have at least six months' validity remaining on the date of arrival. A yellow fever vaccination certificate is required for all travellers over nine months of age and is checked on entry. Visas are required for British citizens without Nigerian nationality.",
        snapshotSource: "selection",
        tags: ["lagos", "passports"],
        savedBy: tunde.id,
        visibility: "family",
        sharedWith: [],
        childSafe: true,
        days: -20,
    });

    // -----------------------------------------------------------------------
    // 5. Dami's family website — a fifteen-year-old owns this one outright
    // -----------------------------------------------------------------------

    const site = project({
        title: "Our family website",
        summary: "A small private site for photos, the Lagos countdown and Grandma's recipes. Dami is building it; the parents are watching.",
        kind: "creative",
        status: "active",
        ownerMemberId: dami.id,
        members: [
            { memberId: dami.id, role: "owner" },
            { memberId: ife.id, role: "watcher" },
        ],
        startDate: ctx.day(-10),
        endDate: ctx.day(45),
        coverUrl: ctx.img("projects-website"),
        budgetCents: 2400,
        financeCategoryId: null,
        financeCategoryLabel: "",
        goalId: null,
        goalLabel: "",
        tripId: null,
        valueId: "Joy",
        tags: ["dami", "code"],
        visibility: "family",
        sharedWith: [],
        childSafe: true,
        archived: false,
        archivedAt: null,
        decisionId: null,
        createdAt: ctx.at(-10, "19:00"),
    });

    card(site.id, "Sketch the four pages", "done", { who: [dami.id], due: -8, doneDays: -8 });
    card(site.id, "Pick the colours from Mum's brand kit", "done", { who: [dami.id], due: -5, doneDays: -5 });
    card(site.id, "Build the home page", "doing", { who: [dami.id], due: 3 });
    card(site.id, "Type up three of Grandma's recipes", "todo", { who: [dami.id, ayo.id], due: 12 });
    card(site.id, "Ask Dad about the domain name", "todo", { who: [dami.id], due: 9 });

    clip({
        projectId: site.id,
        folder: "Website",
        url: "https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Grid",
        title: "CSS grid layout — MDN",
        excerpt: "Grid is for two dimensions. Flexbox is for one. Most layouts want both.",
        imageUrl: null,
        snapshotText:
            "CSS grid lays content out in rows and columns at the same time, which is what a page of cards wants. Flexbox handles a single direction and is better inside each card. The two are not rivals: grid the page, flex the parts.",
        snapshotSource: "selection",
        tags: ["code", "css"],
        savedBy: dami.id,
        visibility: "family",
        sharedWith: [],
        childSafe: true,
        days: -6,
    });

    // -----------------------------------------------------------------------
    // 6. Ifeoluwa's consultancy — a business project, kept private
    // -----------------------------------------------------------------------

    const sprint = project({
        title: "Aduke & Co — brand sprint",
        summary: "Two-week identity sprint for a Peckham food brand. Client work: my own project, not the family's.",
        kind: "business",
        status: "active",
        ownerMemberId: ife.id,
        members: [{ memberId: ife.id, role: "owner" }],
        startDate: ctx.day(-8),
        endDate: ctx.day(11),
        coverUrl: ctx.img("projects-brand"),
        budgetCents: 320000,
        financeCategoryId: null,
        financeCategoryLabel: "",
        goalId: null,
        goalLabel: "",
        tripId: null,
        valueId: "Diligence",
        tags: ["consultancy", "client", "brand"],
        visibility: "private",
        sharedWith: [],
        childSafe: false,
        archived: false,
        archivedAt: null,
        decisionId: null,
        createdAt: ctx.at(-8, "08:30"),
    });

    card(sprint.id, "Discovery call and brief", "done", { who: [ife.id], due: -7, doneDays: -7, childSafe: false });
    card(sprint.id, "Competitor sweep", "done", { who: [ife.id], due: -4, doneDays: -4, childSafe: false });
    card(sprint.id, "Three routes on the wall", "doing", { who: [ife.id], due: 2, childSafe: false });
    card(sprint.id, "Present routes to Aduke", "todo", { who: [ife.id], due: 5, childSafe: false });
    card(sprint.id, "Artwork and handover pack", "todo", { who: [ife.id], due: 10, childSafe: false });
    card(sprint.id, "Invoice on delivery", "todo", { who: [ife.id], due: 11, childSafe: false });

    cost(sprint.id, "Type licences", 18000, -3, "paid");

    clip({
        projectId: sprint.id,
        folder: "Aduke & Co",
        url: "https://www.itsnicethat.com/features/west-african-food-branding",
        title: "West African food brands that don't shout",
        excerpt: "Restraint reads as confidence. The loudest packet on the shelf is rarely the one people trust.",
        imageUrl: ctx.img("projects-brand"),
        snapshotText:
            "A survey of a dozen West African food brands making headway in UK retail. The pattern is restraint: one strong colour, a real story on the back, and typography borrowed from editorial rather than from packaging. The brands that shout sell once; the brands that explain sell again.",
        snapshotSource: "companion",
        tags: ["brand", "research"],
        savedBy: ife.id,
        visibility: "private",
        sharedWith: [],
        childSafe: false,
        days: -6,
    });

    note({
        projectId: sprint.id,
        folder: "Aduke & Co",
        title: "Discovery — Aduke, 29 August",
        blocks: blocks([
            ["h", "What she actually wants"],
            ["p", "Not a logo. A shelf presence that survives being next to a supermarket own-brand, and a way of writing about the food that sounds like her mother."],
            ["ul", "Three SKUs now, twelve within two years"],
            ["ul", "Wholesale first, D2C later"],
            ["h", "Commercials"],
            ["p", "£3,200 fixed for the sprint, half on start, half on delivery. Two rounds of revisions."],
            ["todo", "Send the contract", true],
            ["todo", "Invoice the balance on delivery", false],
        ]),
        tags: ["client", "brand"],
        sensitivity: "private",
        ownerMemberId: ife.id,
        visibility: "private",
        sharedWith: [],
        childSafe: false,
        days: -7,
    });

    // -----------------------------------------------------------------------
    // 7. Ayo's primary school — finished, archived, read-only
    // -----------------------------------------------------------------------

    const primary = project({
        title: "Choose Ayo's primary school",
        summary: "Settled in the spring. Kept because the reasons are worth having when Tobi's transfer comes round.",
        kind: "school",
        status: "done",
        ownerMemberId: ife.id,
        members: [
            { memberId: ife.id, role: "owner" },
            { memberId: tunde.id, role: "member" },
        ],
        startDate: ctx.day(-240),
        endDate: ctx.day(-150),
        coverUrl: ctx.img("projects-school"),
        budgetCents: null,
        financeCategoryId: null,
        financeCategoryLabel: "",
        goalId: null,
        goalLabel: "",
        tripId: null,
        valueId: "Love",
        tags: ["ayo", "school"],
        visibility: "family",
        sharedWith: [],
        childSafe: true,
        archived: true,
        archivedAt: ctx.at(-148, "20:00"),
        decisionId: null,
        createdAt: ctx.at(-240, "20:00"),
    });

    card(primary.id, "Visit all three", "done", { who: [ife.id, tunde.id], due: -200, doneDays: -198 });
    card(primary.id, "Score them the same evening", "done", { who: [ife.id, tunde.id], due: -180, doneDays: -180 });
    card(primary.id, "Submit the application", "done", { who: [ife.id], due: -168, doneDays: -168 });
    card(primary.id, "Accept the offer", "done", { who: [ife.id], due: -152, doneDays: -152 });

    const primaryCompare = comparison(
        primary.id,
        "Three primary schools",
        [
            ["The walk", 5],
            ["How the children looked", 5],
            ["Reception class size", 4],
            ["Wraparound care", 3],
            ["Nursery link", 3],
        ],
        [
            { label: "St Mary's", note: "Eleven minutes on foot, and Ayo's nursery feeds into it.", scores: [9, 9, 7, 8, 10] },
            { label: "Park Hill Infants", note: "Best results, but a drive and a car park war every morning.", scores: [4, 8, 8, 7, 4] },
            { label: "Oasis Academy", note: "Newest building, largest classes.", scores: [7, 6, 5, 9, 5] },
        ],
        -186,
    );

    const primaryDecision = decide(
        primary.id,
        primaryCompare.id,
        "Chose St Mary's because it is a walk and her nursery feeds into it",
        "Eleven minutes on foot beat fifteen in a car and a car park war, and half of Ayo's nursery class went with her. Park Hill had better results on paper; St Mary's had children who looked us in the eye.",
        ife.id,
        -170,
    );
    primary.decisionId = primaryDecision.id;

    // -----------------------------------------------------------------------
    // Loose in the vault: clips and a note with no project yet
    // -----------------------------------------------------------------------

    clip({
        projectId: null,
        folder: "Someday",
        url: "https://www.gardenersworld.com/how-to/grow-plants/raised-beds",
        title: "Raised beds in a small London garden",
        excerpt: "Two beds, 1.2 m by 2.4 m, and you can feed a family salad from May to October.",
        imageUrl: ctx.img("projects-vault"),
        snapshotText:
            "Two beds at 1.2 m by 2.4 m fit almost any London garden and give enough salad, beans and courgettes to matter from May to October. Scaffold boards last five years untreated; sleepers last fifteen and cost four times as much. Fill with three parts topsoil to one part compost.",
        snapshotSource: "selection",
        tags: ["garden", "someday"],
        savedBy: ife.id,
        visibility: "family",
        sharedWith: [],
        childSafe: true,
        days: -13,
    });
    clip({
        projectId: null,
        folder: "Someday",
        url: "https://www.bikeradar.com/advice/buyers-guides/best-family-bike-rack",
        title: "Family bike racks that fit a five-seat car",
        excerpt: "Towbar racks beat roof racks for anything over two bikes.",
        imageUrl: null,
        snapshotText:
            "For three or more bikes a towbar-mounted rack is easier to load, safer at speed and cheaper on fuel than a roof rack. The trade-off is boot access, which most tilting racks solve. Check the towbar's nose weight before buying.",
        snapshotSource: "selection",
        tags: ["bikes", "someday"],
        savedBy: tunde.id,
        visibility: "family",
        sharedWith: [],
        childSafe: true,
        days: -27,
    });

    note({
        projectId: null,
        folder: "Someday",
        title: "Things we keep saying we will do",
        blocks: blocks([
            ["h", "The list"],
            ["todo", "Raised beds along the back fence", false],
            ["todo", "Scan Grandpa's photographs before they fade", false],
            ["todo", "A proper bookshelf in the hall", true],
            ["p", "Rule: nothing comes off this list until the kitchen is finished."],
        ]),
        tags: ["someday"],
        sensitivity: "general",
        ownerMemberId: ife.id,
        visibility: "family",
        sharedWith: [],
        childSafe: true,
        days: -4,
    });

    return { projects, cards, costs, clips, notes, comparisons, scores, decisions };
}
