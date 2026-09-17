import type { SeedContext } from "@/data/core";
import type { Blueprint, BlueprintLine, Celebration, ConnectionSample, Goal, GoalReview, GoalsState, KeyResult, MetricReading, Milestone, NewGoal, Okr, Pillar } from "./types";

/**
 * The Adeyemi family's vision, in September.
 *
 * Three versions of the blueprint (January, April, August — the family added
 * "Joy" to their values in the spring and it shows in the diff), twelve goals
 * across every pillar the house cares about, and the OKR the autumn actually
 * turns on: settling the new school rhythm.
 *
 * The seed is deliberately uneven, because families are: one goal finished and
 * celebrated, one finished and celebrated a month ago, one stalled since the
 * summer, one paused on purpose, two measured off numbers that move (the
 * deposit fund and the books read), Oluwafemi's 100 km ride private to him, and
 * Dami's grade-7 target shared with her parents and nobody else.
 *
 * Every date is relative to `ctx.today`, so the demo never goes stale.
 */

export function seed(ctx: SeedContext): GoalsState {
    const { at, uid, img } = ctx;

    /**
     * `ctx.day()` formats through `toISOString()`, so on a machine east of
     * Greenwich — British Summer Time included — it lands on the day before.
     * Every date in this seed is a calendar date the family would recognise
     * ("due today", "the medical forms on Thursday"), so we count days in
     * local time instead.
     */
    const day = (n: number): string => {
        const d = new Date(`${ctx.today}T00:00:00`);
        d.setDate(d.getDate() + n);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };
    const ife = "mem-ife";
    const tunde = "mem-tunde";
    const dami = "mem-dami";
    const tobi = "mem-tobi";
    const ayo = "mem-ayo";

    const goals: Goal[] = [];
    const milestones: Milestone[] = [];

    /** A goal plus its milestones, so the seed reads like the family's list. */
    const goal = (
        input: Omit<NewGoal, "milestones"> & {
            status?: Goal["status"];
            createdAt: string;
            updatedAt?: string;
            completedAt?: string | null;
            milestones?: Array<{ title: string; due: string | null; doneAt?: string }>;
        },
    ): Goal => {
        const id = uid("goal");
        const g: Goal = {
            id,
            spaceId: ctx.space.id,
            title: input.title,
            childSafeSummary: input.childSafeSummary,
            scope: input.scope,
            ownerMemberId: input.ownerMemberId,
            pillar: input.pillar,
            valueLabel: input.valueLabel,
            horizon: input.horizon,
            targetDate: input.targetDate,
            status: input.status ?? "active",
            description: input.description ?? "",
            why: input.why ?? "",
            progressMode: input.progressMode,
            manualPct: 0,
            metricRef: input.metricRef ?? null,
            coverUrl: input.coverUrl,
            visibility: input.visibility,
            sharedWith: input.sharedWith ?? [],
            createdAt: input.createdAt,
            updatedAt: input.updatedAt ?? input.createdAt,
            completedAt: input.completedAt ?? null,
        };
        goals.push(g);
        (input.milestones ?? []).forEach((m, i) => {
            milestones.push({
                id: `ms-${id}-${i + 1}`,
                goalId: id,
                title: m.title,
                due: m.due,
                order: i + 1,
                done: Boolean(m.doneAt),
                doneAt: m.doneAt ?? null,
            });
        });
        return g;
    };

    // -- The goals ----------------------------------------------------------

    // goal-1 · the autumn's whole preoccupation. Three of five done → 60%.
    goal({
        title: "Prepare the children for the new school year",
        childSafeSummary: "Getting everything ready for school",
        scope: "family",
        ownerMemberId: ife,
        pillar: "execute",
        valueLabel: "Diligence",
        horizon: "quarter",
        targetDate: day(24),
        progressMode: "milestones",
        visibility: "family",
        coverUrl: img("goals-schoolyear"),
        description: "Dami into Year 11, Tobi's home-education year planned, Ayo into Reception — with nothing done at midnight the night before.",
        why: "Because the first fortnight sets the tone for the whole year, and calm mornings are a gift we can actually give them.",
        createdAt: at(-64, "21:10"),
        updatedAt: at(-4, "17:30"),
        milestones: [
            { title: "Research schools and settle the plan", due: day(-42), doneAt: at(-40, "22:05") },
            { title: "Complete the applications and forms", due: day(-21), doneAt: at(-19, "09:40") },
            { title: "Buy uniform, shoes and school supplies", due: day(-6), doneAt: at(-4, "17:25") },
            { title: "Complete the medical forms", due: day(4), doneAt: undefined },
            { title: "Agree the morning routine and the bedtimes", due: day(18), doneAt: undefined },
        ],
    });

    // goal-2 · measured off the ledger. 54%, and a child is told only the summary.
    goal({
        title: "Save a deposit for a home of our own",
        childSafeSummary: "We're saving for our own home",
        scope: "family",
        ownerMemberId: ife,
        pillar: "money",
        valueLabel: "Diligence",
        horizon: "multi-year",
        targetDate: day(670),
        progressMode: "metric",
        metricRef: "fund-home-deposit",
        visibility: "family",
        coverUrl: img("goals-deposit"),
        description: "A 10% deposit on a three-bedroom house within twenty minutes of Grace Chapel. The number comes straight from the deposit pot in Finance — nobody types it.",
        why: "So the children finish school in one place, and so we stop paying off somebody else's mortgage.",
        createdAt: at(-410, "20:00"),
        updatedAt: at(-2, "08:15"),
    });

    // goal-3 · four books, two read. Measured off the shelf.
    goal({
        title: "Read four books together this year",
        childSafeSummary: "We're reading four books together",
        scope: "family",
        ownerMemberId: null,
        pillar: "grow",
        valueLabel: "Joy",
        horizon: "year",
        targetDate: day(116),
        progressMode: "metric",
        metricRef: "books-year-family",
        visibility: "child",
        coverUrl: img("goals-books"),
        description: "Read aloud after Sunday lunch, one chapter at a time, everyone in the room.",
        why: "It is the only hour of the week when all five of us are doing the same thing.",
        createdAt: at(-240, "13:20"),
        updatedAt: at(-16, "14:00"),
    });

    // goal-4 · Christmas in Lagos. One of four.
    goal({
        title: "Christmas in Lagos, all five of us",
        childSafeSummary: "We're going to Lagos for Christmas",
        scope: "family",
        ownerMemberId: tunde,
        pillar: "live",
        valueLabel: "Love",
        horizon: "quarter",
        targetDate: day(103),
        progressMode: "milestones",
        visibility: "child",
        coverUrl: img("goals-lagos"),
        description: "Two weeks in Lagos with Mama Fọláké, arriving the week before Christmas.",
        why: "Mama Fọláké is sixty-eight and has met Ayo twice. That is the whole reason.",
        createdAt: at(-51, "22:40"),
        updatedAt: at(-30, "10:10"),
        milestones: [
            { title: "Book the flights", due: day(-35), doneAt: at(-30, "10:05") },
            { title: "Renew Tobi's and Ayo's passports", due: day(40), doneAt: undefined },
            { title: "Reach £2,400 in the trip fund", due: day(70), doneAt: undefined },
            { title: "Plan the two weeks with Mama Fọláké", due: day(82), doneAt: undefined },
        ],
    });

    // goal-5 · finished nine days ago, and celebrated. The module's proof that
    // finishing is an event, not a status change.
    goal({
        title: "Read the Gospel of Mark together, all sixteen chapters",
        childSafeSummary: "We finished reading Mark together",
        scope: "family",
        ownerMemberId: tunde,
        pillar: "faith",
        valueLabel: "Faith",
        horizon: "quarter",
        targetDate: day(-7),
        status: "done",
        completedAt: at(-9, "20:50"),
        progressMode: "milestones",
        visibility: "child",
        coverUrl: img("goals-mark"),
        description: "Four chapters a fortnight, read aloud at the table on Tuesdays and Thursdays.",
        why: "Because we wanted the children to have heard a whole gospel, not just the famous bits.",
        createdAt: at(-120, "20:00"),
        updatedAt: at(-9, "20:50"),
        milestones: [
            { title: "Chapters 1–4", due: day(-92), doneAt: at(-90, "20:30") },
            { title: "Chapters 5–8", due: day(-64), doneAt: at(-62, "20:35") },
            { title: "Chapters 9–12", due: day(-36), doneAt: at(-34, "20:40") },
            { title: "Chapters 13–16", due: day(-8), doneAt: at(-9, "20:45") },
        ],
    });

    // goal-6 · Oluwafemi's, and private. Ifeoluwa cannot see this row at all.
    goal({
        title: "Ride 100 km in one go",
        childSafeSummary: "Dad is training for a long ride",
        scope: "me",
        ownerMemberId: tunde,
        pillar: "health",
        valueLabel: "Diligence",
        horizon: "year",
        targetDate: day(62),
        progressMode: "milestones",
        visibility: "private",
        coverUrl: img("goals-ride"),
        description: "Addiscombe Cycling Club's autumn century, Surrey Hills route.",
        why: "Forty-four, two stone heavier than I'd like, and I want to be the dad who can still keep up in ten years.",
        createdAt: at(-98, "06:30"),
        updatedAt: at(-12, "09:20"),
        milestones: [
            { title: "40 km without stopping", due: day(-70), doneAt: at(-68, "09:10") },
            { title: "60 km with the club", due: day(-30), doneAt: at(-12, "09:15") },
            { title: "80 km solo", due: day(21), doneAt: undefined },
            { title: "The century", due: day(62), doneAt: undefined },
        ],
    });

    // goal-7 · Dami's own, shared with her parents and nobody else.
    goal({
        title: "Grade 7 in GCSE Maths",
        childSafeSummary: "I'm working towards a grade 7 in Maths",
        scope: "me",
        ownerMemberId: dami,
        pillar: "grow",
        valueLabel: "Diligence",
        horizon: "year",
        targetDate: day(266),
        progressMode: "milestones",
        visibility: "shared",
        sharedWith: [ife, tunde],
        coverUrl: img("goals-maths"),
        description: "Higher paper. Algebra and trigonometry are the weak halves.",
        why: "I want Sixth Form Maths, and I'd rather do the work now than panic in May.",
        createdAt: at(-40, "18:00"),
        updatedAt: at(-25, "19:30"),
        milestones: [
            { title: "Finish the algebra unit", due: day(-28), doneAt: at(-25, "19:25") },
            { title: "A full past paper every fortnight", due: day(7), doneAt: undefined },
            { title: "Grade 6 or better in the mock", due: day(96), doneAt: undefined },
            { title: "Grade 7 in the summer paper", due: day(266), doneAt: undefined },
        ],
    });

    // goal-8 · stalled. Nothing has gone into it since the school shopping.
    goal({
        title: "Build a £5,000 emergency fund",
        childSafeSummary: "We're putting money aside for surprises",
        scope: "family",
        ownerMemberId: ife,
        pillar: "money",
        valueLabel: "Diligence",
        horizon: "year",
        targetDate: day(116),
        progressMode: "metric",
        metricRef: "fund-emergency",
        visibility: "family",
        coverUrl: img("goals-fund"),
        description: "Three months of the essentials, in an account we do not carry a card for.",
        why: "The boiler, the car and the roof will all happen. We would rather they happened to our savings than to our peace.",
        createdAt: at(-300, "21:00"),
        updatedAt: at(-27, "08:00"),
    });

    // goal-9 · Ayo's, in her own words, visible to every child in the house.
    goal({
        title: "Ayo reads twenty books",
        childSafeSummary: "I'm reading twenty books",
        scope: "me",
        ownerMemberId: ayo,
        pillar: "grow",
        valueLabel: "Joy",
        horizon: "year",
        targetDate: day(116),
        progressMode: "metric",
        metricRef: "books-ayo",
        visibility: "child",
        coverUrl: img("goals-books"),
        description: "Reception reading books, one a night with Mum or Dami.",
        why: "Because she asked for her own goal after Tobi got one.",
        createdAt: at(-140, "19:15"),
        updatedAt: at(-3, "19:20"),
    });

    // goal-10 · finished in the summer and celebrated. Ayo's first.
    goal({
        title: "Ayo swims 25 metres on her own",
        childSafeSummary: "I swam a whole length by myself",
        scope: "me",
        ownerMemberId: ayo,
        pillar: "health",
        valueLabel: "Joy",
        horizon: "quarter",
        targetDate: day(-45),
        status: "done",
        completedAt: at(-38, "17:30"),
        progressMode: "milestones",
        visibility: "child",
        coverUrl: img("goals-swim"),
        description: "Saturday lessons at Thornton Heath leisure centre.",
        why: "Every Adeyemi swims. Grandad made sure of it and so will we.",
        createdAt: at(-190, "17:00"),
        updatedAt: at(-38, "17:30"),
        milestones: [
            { title: "Face in the water, no crying", due: day(-160), doneAt: at(-158, "17:20") },
            { title: "Half a length with a float", due: day(-90), doneAt: at(-88, "17:25") },
            { title: "A whole length, no float", due: day(-45), doneAt: at(-38, "17:28") },
        ],
    });

    // goal-11 · paused on purpose. Parking a goal is not failing it.
    goal({
        title: "Redo the back garden",
        childSafeSummary: "One day we'll make the garden lovely",
        scope: "family",
        ownerMemberId: tunde,
        pillar: "home",
        valueLabel: "Joy",
        horizon: "multi-year",
        targetDate: day(400),
        status: "paused",
        progressMode: "milestones",
        visibility: "family",
        description: "Decking, a raised bed for the children, and the fence the storm took.",
        why: "Paused until the deposit fund is where it needs to be. Written down so it isn't forgotten.",
        createdAt: at(-260, "16:00"),
        updatedAt: at(-120, "16:00"),
        milestones: [
            { title: "Replace the fence panels", due: day(-200), doneAt: at(-198, "15:00") },
            { title: "Price the decking", due: null, doneAt: undefined },
            { title: "Build the raised bed with Tobi", due: null, doneAt: undefined },
        ],
    });

    // goal-12 · something to make, so Create is on the roadmap too.
    goal({
        title: "Record a song for Mama Fọláké's birthday",
        childSafeSummary: "We're making a song for Grandma",
        scope: "family",
        ownerMemberId: dami,
        pillar: "create",
        valueLabel: "Love",
        horizon: "quarter",
        targetDate: day(45),
        progressMode: "milestones",
        visibility: "child",
        description: "All three children singing, Dami on the keys, recorded on the phone in the front room.",
        why: "She turns sixty-nine in October and she is four thousand miles away.",
        createdAt: at(-20, "20:30"),
        updatedAt: at(-2, "19:40"),
        // The last milestone falls due TODAY: one tick finishes the goal and the
        // celebration dialog opens by itself. That is the loop, in one click.
        milestones: [
            { title: "Pick the song and write Ayo's line", due: day(-7), doneAt: at(-6, "19:55") },
            { title: "Practise it three times together", due: day(-2), doneAt: at(-2, "19:35") },
            { title: "Record it and send it to Ibadan", due: day(0), doneAt: undefined },
        ],
    });

    const id = (n: number): string => `goal-${n}`;

    // -- Measured numbers ---------------------------------------------------
    // A series, not a single value: the goal then has a history, and "no
    // progress in three weeks" is a fact rather than a guess.

    const reading = (ref: string, label: string, source: MetricReading["source"], unit: MetricReading["unit"], target: number, current: number, atIso: string): MetricReading => ({
        id: uid("metric"),
        spaceId: ctx.space.id,
        ref,
        label,
        source,
        unit,
        target,
        current,
        at: atIso,
    });

    const metrics: MetricReading[] = [
        // The deposit pot in Finance: £16,200 of £30,000 → 54%.
        reading("fund-home-deposit", "Home deposit pot", "finance-fund", "cents", 3000000, 1080000, at(-180, "08:00")),
        reading("fund-home-deposit", "Home deposit pot", "finance-fund", "cents", 3000000, 1170000, at(-150, "08:00")),
        reading("fund-home-deposit", "Home deposit pot", "finance-fund", "cents", 3000000, 1265000, at(-120, "08:00")),
        reading("fund-home-deposit", "Home deposit pot", "finance-fund", "cents", 3000000, 1360000, at(-90, "08:00")),
        reading("fund-home-deposit", "Home deposit pot", "finance-fund", "cents", 3000000, 1440000, at(-60, "08:00")),
        reading("fund-home-deposit", "Home deposit pot", "finance-fund", "cents", 3000000, 1530000, at(-30, "08:00")),
        reading("fund-home-deposit", "Home deposit pot", "finance-fund", "cents", 3000000, 1620000, at(-2, "08:15")),
        // The emergency fund: £3,900 of £5,000 → 78%, and untouched since August.
        reading("fund-emergency", "Emergency fund", "finance-fund", "cents", 500000, 300000, at(-150, "08:00")),
        reading("fund-emergency", "Emergency fund", "finance-fund", "cents", 500000, 345000, at(-90, "08:00")),
        reading("fund-emergency", "Emergency fund", "finance-fund", "cents", 500000, 390000, at(-27, "08:00")),
        // Books read together, from the shelf.
        reading("books-year-family", "Books read together", "books", "count", 4, 1, at(-150, "13:00")),
        reading("books-year-family", "Books read together", "books", "count", 4, 2, at(-16, "14:00")),
        // Ayo's twenty.
        reading("books-ayo", "Books Ayo has read", "books", "count", 20, 6, at(-90, "19:00")),
        reading("books-ayo", "Books Ayo has read", "books", "count", 20, 11, at(-30, "19:00")),
        reading("books-ayo", "Books Ayo has read", "books", "count", 20, 13, at(-3, "19:20")),
    ];

    // -- The quarterly roadmap ----------------------------------------------

    const okrs: Okr[] = [];
    const keyResults: KeyResult[] = [];
    const okr = (quarter: string, objective: string, goalIds: string[], krs: Array<[string, number, number, string]>, createdAt: string): void => {
        const okrId = uid("okr");
        okrs.push({ id: okrId, spaceId: ctx.space.id, quarter, objective, goalIds, createdAt });
        krs.forEach(([text, current, target, unit], i) => {
            keyResults.push({ id: uid("kr"), okrId, text, current, target, unit, order: i + 1 });
        });
    };

    const thisQuarter = `${new Date(`${ctx.today}T00:00:00`).getFullYear()}-Q${Math.floor(new Date(`${ctx.today}T00:00:00`).getMonth() / 3) + 1}`;
    const [qy, qn] = thisQuarter.split("-Q").map(Number);
    const nextQuarter = qn === 4 ? `${qy + 1}-Q1` : `${qy}-Q${qn + 1}`;
    const lastQuarter = qn === 1 ? `${qy - 1}-Q4` : `${qy}-Q${qn - 1}`;

    okr(
        thisQuarter,
        "Settle the new school rhythm",
        [id(1), id(3), id(7)],
        [
            ["Out of the door by 08:10", 13, 20, " school days"],
            ["Homework done before dinner", 9, 15, " evenings"],
            ["Every child's paperwork in", 1, 3, " children"],
        ],
        at(-64, "21:30"),
    );
    okr(
        nextQuarter,
        "Land in Lagos with nothing left undone",
        [id(4), id(8), id(12)],
        [
            ["Passports renewed", 0, 2, " passports"],
            ["Trip fund", 1450, 2400, " pounds"],
            ["Days planned with Mama Fọláké", 0, 14, " days"],
        ],
        at(-30, "22:00"),
    );
    okr(
        lastQuarter,
        "Get the whole house on one calendar",
        [id(5)],
        [
            ["Everyone's week visible by Sunday night", 12, 13, " weeks"],
            ["Sunday planning happened", 11, 13, " weeks"],
            ["Evening check-ins", 48, 60, " evenings"],
        ],
        at(-160, "20:00"),
    );

    // -- Celebrations -------------------------------------------------------

    const celebrations: Celebration[] = [
        {
            id: uid("cel"),
            spaceId: ctx.space.id,
            goalId: id(5),
            date: day(-9),
            photoUrl: img("goals-mark"),
            reflection:
                "Forty evenings and one whole gospel. Tobi asked why the disciples were always frightened, and none of us had a tidy answer, which was somehow the best part. Ayo fell asleep for most of chapter 14 and we let her.",
            cardLine: "Sixteen chapters. Forty evenings. One family, at one table.",
            memberIds: [ife, tunde, dami, tobi, ayo],
            createdAt: at(-9, "21:00"),
        },
        {
            id: uid("cel"),
            spaceId: ctx.space.id,
            goalId: id(10),
            date: day(-38),
            photoUrl: img("goals-swim"),
            reflection: "She came up at the far end grinning with her goggles round her chin, looked straight at Dami and said 'I did it by my own self'. Six months of Saturday mornings.",
            cardLine: "Twenty-five metres. No float, no feet down, no help.",
            memberIds: [ayo, ife, tobi],
            createdAt: at(-38, "18:10"),
        },
    ];

    // -- Reviews ------------------------------------------------------------

    const reviews: GoalReview[] = [
        {
            id: uid("review"),
            spaceId: ctx.space.id,
            kind: "sunday",
            period: day(-7),
            notes: "Three things this week: the medical forms, the passports, and one whole evening where nobody opens a laptop after eight.",
            focusGoalIds: [id(1), id(4), id(2)],
            authorMemberId: ife,
            createdAt: at(-7, "20:15"),
        },
        {
            id: uid("review"),
            spaceId: ctx.space.id,
            kind: "quarter",
            period: lastQuarter,
            notes:
                "We finished Mark, which we honestly did not expect to. The emergency fund moved twice and then stopped when the school shopping started — that is a real trade-off, not a failure, but it needs saying out loud. Oluwafemi's riding is going better than his sleeping. Next quarter is school and Lagos, and nothing else gets added.",
            focusGoalIds: [id(5), id(8), id(6)],
            authorMemberId: tunde,
            createdAt: at(-68, "21:40"),
        },
    ];

    // -- Connection metrics, stored nightly ---------------------------------
    // Twenty-one nights of "how much of what we do is attached to what we said
    // mattered". It climbs, because the family started linking tasks to goals
    // when the school-year goal went in.

    const connection: ConnectionSample[] = [];
    for (let i = 21; i >= 1; i--) {
        const t = Math.round(44 + (21 - i) * 1.15 + (i % 4 === 0 ? -3 : i % 3 === 0 ? 2 : 0));
        const g = Math.round(58 + (21 - i) * 0.75 + (i % 5 === 0 ? -4 : 0));
        connection.push({
            date: day(-i),
            tasksWithGoalPct: Math.max(0, Math.min(100, t)),
            goalsWithMilestonePct: Math.max(0, Math.min(100, g)),
            tasksCounted: 18 + (i % 5),
            goalsCounted: 9,
        });
    }

    // -- The blueprint, three versions --------------------------------------

    type Line = [Pillar, string, string];
    const line = ([pillar, text, why]: Line): BlueprintLine => ({ pillar, text, why });

    const blueprint = (
        version: number,
        createdAt: string,
        authorMemberId: string,
        note: string,
        valuesSnapshot: string[],
        mission: string,
        vision: string,
        y1: Line[],
        y3: Line[],
        y5: Line[],
    ): Blueprint => ({
        id: uid("bp"),
        spaceId: ctx.space.id,
        version,
        valuesSnapshot,
        mission,
        vision,
        goals1y: y1.map(line),
        goals3y: y3.map(line),
        goals5y: y5.map(line),
        note,
        authorMemberId,
        createdAt,
    });

    const blueprints: Blueprint[] = [
        blueprint(
            3,
            at(-33, "21:20"),
            ife,
            "After the Lagos decision and Dami's GCSE year starting.",
            ["Faith", "Love", "Diligence", "Generosity", "Joy"],
            "To raise a family that loves God, loves people and builds things that last.",
            "By 2031 we own a home within twenty minutes of Grace Chapel, three children who can cook, argue kindly and pray out loud, and a house that other people find it easy to walk into.",
            [
                ["faith", "Read a whole gospel together and pray as a house on Sunday evenings.", "The children should hear us pray, not just hear about praying."],
                ["execute", "Every school year begins prepared, not panicked.", "September sets the tone for the other eleven months."],
                ["money", "£5,000 in an emergency fund and £18,000 towards the deposit.", "Peace is cheaper than interest."],
                ["live", "Two weeks in Lagos at Christmas.", "Mama Fọláké has met Ayo twice."],
                ["grow", "Four books read aloud together.", "One hour a week where all five of us do the same thing."],
            ],
            [
                ["home", "In our own house, with a garden the children helped build.", "Somewhere the door does not have to be closed by a landlord."],
                ["grow", "Dami through A-levels; Tobi choosing his own reading; Ayo fluent and confident.", "Each of them further than we were at their age."],
                ["faith", "A house group meeting here twice a month.", "Our table is the point of the house."],
                ["money", "One income could carry the essentials if it had to.", "Room to be brave."],
            ],
            [
                ["live", "A family that has travelled together — Lagos, Ibadan, and one place none of us has been.", "Cousins should not be strangers."],
                ["create", "Something we made together that outlives us: recordings, a recipe book, the garden.", "Things that last."],
                ["health", "Five people who move: two parents still riding, three children who swim.", "We would like to be there for the grandchildren."],
            ],
        ),
        blueprint(
            2,
            at(-140, "20:45"),
            tunde,
            "Spring rewrite — we added Joy, because the list read like a job description.",
            ["Faith", "Love", "Diligence", "Generosity", "Joy"],
            "To raise a family that loves God, loves people and builds things that last.",
            "By 2031 we own a home near Grace Chapel, the children are confident and kind, and our house is easy to walk into.",
            [
                ["faith", "Read a whole gospel together.", "The children should hear us pray."],
                ["execute", "Every school year begins prepared.", "September sets the tone."],
                ["money", "£5,000 in an emergency fund.", "Peace is cheaper than interest."],
                ["grow", "Four books read aloud together.", "One hour a week, all of us."],
            ],
            [
                ["home", "In our own house.", "Somewhere the door is ours."],
                ["grow", "Dami through A-levels; Tobi choosing his own reading.", "Further than we were."],
                ["faith", "A house group meeting here twice a month.", "Our table is the point of the house."],
            ],
            [
                ["live", "A family that has travelled together.", "Cousins should not be strangers."],
                ["create", "Something we made together that outlives us.", "Things that last."],
            ],
        ),
        blueprint(
            1,
            at(-231, "21:00"),
            ife,
            "Written on the second Sunday in January, at the kitchen table, with the good pens.",
            ["Faith", "Love", "Diligence", "Generosity"],
            "To raise a family that loves God and works hard.",
            "A home of our own, three children who know they are loved, and enough put by that a bad month is not a crisis.",
            [
                ["faith", "Pray together on Sundays.", "Start somewhere."],
                ["money", "£3,000 in an emergency fund.", "Stop living to the pound."],
                ["execute", "One family calendar that everyone actually uses.", "We keep missing things."],
            ],
            [
                ["home", "In our own house.", "Somewhere the door is ours."],
                ["grow", "Dami through her GCSEs and into Sixth Form.", "She is the first."],
            ],
            [["live", "Take the children to Nigeria.", "They should know where they are from."]],
        ),
    ];

    return { blueprints, goals, milestones, okrs, keyResults, metrics, celebrations, reviews, connection };
}
