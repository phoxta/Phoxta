import type { SeedContext, Visibility } from "@/data/core";
import { isoDate } from "@/lib/format";
import { youtubeThumb } from "@/components/player/YouTubePlayer";
import type { Completion, LearningPlan, LearningState, LearningTask, LessonVideo, PlanItem, Playlist, VideoNote } from "./types";

/**
 * The Adeyemis' Learning Hub.
 *
 * Four courses that say who this family is: the money-and-generosity study
 * Ifeoluwa set for everyone, Dami's GCSE physics revision, Oluwafemi's private cycling
 * training, and the wonder playlist Tobi and Ayo actually watch. Twenty-six
 * real, public YouTube lessons — every id verified against YouTube's oEmbed
 * endpoint, every title and channel exactly as YouTube gives them, so the demo
 * plays rather than pretends.
 *
 * Everything is relative to `ctx.today`: two plans already in flight, three of
 * Dami's eight physics lessons done, one lesson half-watched, a note pinned at
 * 12:34, an action item that has gone overdue and something to celebrate.
 */

type Spec = {
    yt: string;
    title: string;
    channel: string;
    dur: number;
    /** Days before today it was added. */
    added: number;
    by: string;
    childSafe: boolean;
    value?: string;
    captions?: boolean;
    description?: string;
};

export function seed(ctx: SeedContext): LearningState {
    /**
     * A LOCAL calendar day N days from today. `ctx.day` rounds through UTC, so
     * in British Summer Time it lands a day early — and a due date that is a
     * day out is the difference between "due today" and "late". Dates are the
     * one thing this module cannot be casual about.
     */
    const d = (n: number): string => {
        const x = new Date(`${ctx.today}T00:00:00`);
        x.setDate(x.getDate() + n);
        return isoDate(x);
    };

    const ife = ctx.parents[0];
    const tunde = ctx.parents[1] ?? ife;
    const [dami, tobi, ayo] = ctx.kids;

    const videos: LessonVideo[] = [];
    const byKey: Record<string, string> = {};

    const add = (key: string, s: Spec, transcript = ""): string => {
        const id = ctx.uid("lv");
        videos.push({
            id,
            youtubeId: s.yt,
            url: `https://www.youtube.com/watch?v=${s.yt}`,
            title: s.title,
            channel: s.channel,
            thumbnailUrl: youtubeThumb(s.yt),
            durationS: s.dur,
            description: s.description ?? "",
            captionsAvailable: s.captions ?? true,
            childSafe: s.childSafe,
            valueId: s.value ?? null,
            addedBy: s.by,
            transcript,
            transcriptSource: transcript ? "captions" : null,
            summary: null,
            createdAt: ctx.at(-s.added, "20:40"),
        });
        byKey[key] = id;
        return id;
    };

    // ---- Money & Generosity — the family course ---------------------------
    add(
        "money-tricks",
        { yt: "DOisAG9yoNk", title: "3 psychological tricks to help you save money | The Way We Work, a TED series", channel: "TED", dur: 348, added: 26, by: ife.id, childSafe: true, value: "Generosity", description: "Behavioural economist Wendy De La Rosa on three small, practical changes that make saving automatic." },
        "We are not very good at saving money. But the problem isn't willpower — it's that we make the decision at the wrong moment. Trick one: change the frequency of your savings. Instead of saving once a month, save the day you're paid, in small amounts…",
    );
    add(
        "money-giving",
        { yt: "EG8V8UIXXQM", title: "How to start spending, saving, and giving better | David Delisle | TEDxVictoria", channel: "TEDx Talks", dur: 796, added: 24, by: ife.id, childSafe: true, value: "Generosity", description: "A father's three-jar system — spend, save, give — and why children understand generosity long before they understand interest." },
        "When my son was six I gave him ten pounds and three jars. One says spend. One says save. One says give. And I said: it is your money, but every pound has to go into one of the three…",
    );
    add(
        "money-dollar",
        { yt: "XNu5ppFZbHo", title: "What gives a dollar bill its value? - Doug Levinson", channel: "TED-Ed", dur: 231, added: 22, by: ife.id, childSafe: true, description: "Why a piece of paper is worth anything at all — trust, scarcity and a shared story." },
        "The value of money is not in the paper. It is in the agreement between everybody who uses it…",
    );
    add(
        "money-compound",
        { yt: "Rm6UdfRs3gw", title: "Compound interest introduction | Interest and debt | Finance & Capital Markets | Khan Academy", channel: "Khan Academy", dur: 397, added: 20, by: tunde.id, childSafe: true, value: "Diligence", description: "Sal Khan draws compound interest by hand, one year at a time." },
        "Let's say I lend you a hundred pounds and I charge you ten percent interest. After one year you owe me a hundred and ten. But in the second year the interest is charged on the hundred and ten…",
    );
    add(
        "money-generous",
        { yt: "62CliEkRCso", title: "This Lie Can Keep You From Living Generously", channel: "BibleProject", dur: 312, added: 18, by: tunde.id, childSafe: true, value: "Generosity", description: "The biblical picture of generosity as abundance rather than scarcity." },
        "There is a lie that says: there is not enough, so hold on tightly. The Scriptures tell a different story about a God who gives…",
    );

    // ---- Dami's GCSE physics ----------------------------------------------
    add("phy-energy", { yt: "JGwcDCeYRYo", title: "GCSE Physics - Energy Stores, Transferring Energy & Work Done", channel: "Cognito", dur: 309, added: 30, by: dami.id, childSafe: true, value: "Diligence", description: "Paper 1, topic 1. The eight energy stores and how work done transfers between them." });
    add("phy-circuits", { yt: "rFd-vzU4_pg", title: "GCSE Physics - Circuits: Introduction - Potential Difference | Current | Resistance (2026/27 exams)", channel: "Cognito", dur: 263, added: 30, by: dami.id, childSafe: true, description: "The three quantities every circuit question turns on." });
    add("phy-ohms", { yt: "BbizKa6eywo", title: "GCSE Physics - Voltage, Current & Resistance | V = IR Equation | IV Graphs (2026/27 exams)", channel: "Cognito", dur: 275, added: 30, by: dami.id, childSafe: true, description: "V = IR, and reading an I–V graph without panicking." });
    add("phy-waves", { yt: "1DFAy8MXkMA", title: "GCSE Physics - Longitudinal & Transverse Waves - Labelling & Calculating Wave Speed (2026/27 exams)", channel: "Cognito", dur: 400, added: 30, by: dami.id, childSafe: true, description: "Paper 2, topic 6. Labelling a wave and calculating wave speed." });
    add("phy-decay", { yt: "wvgT52mwM3Y", title: "GCSE Physics - Radioactive Decay & Half-life | How to Calculate Activity & Half-life (2026/27 exams)", channel: "Cognito", dur: 408, added: 12, by: dami.id, childSafe: true, description: "Half-life questions, worked slowly." });
    add("phy-forces", { yt: "Ry5-WEiTUs4", title: "GCSE Physics - Resolving Vectors & Scale Drawing | How to Find Resultant Forces (2026/27 exams)", channel: "Cognito", dur: 280, added: 12, by: dami.id, childSafe: true, description: "Scale drawings — the marks nobody revises for." });
    add("phy-magnets", { yt: "LTfP8yPAVFw", title: "GCSE Physics - Electromagnetism - Wires | Coils | Solenoids | Electromagnets (2026/27 exams)", channel: "Cognito", dur: 331, added: 12, by: dami.id, childSafe: true, description: "Fields around wires, coils and solenoids." });
    add("phy-particles", { yt: "zjkBMk5d3tM", title: "GCSE Physics - Particle Theory & States of Matter | Solids, Liquids & Gases (2026/27 exams)", channel: "Cognito", dur: 297, added: 12, by: dami.id, childSafe: true, description: "Paper 1, topic 3 — the easy marks." });

    // ---- Oluwafemi's private cycling training ---------------------------------
    add("cyc-climb", { yt: "v52aJrBc0SE", title: "Transform Your Climbing & Learn To Love The Hills!", channel: "Global Cycling Network", dur: 431, added: 40, by: tunde.id, childSafe: false, description: "Cadence, pacing and where to sit on a long drag." });
    add("cyc-mistakes", { yt: "CcU65BuXt1Q", title: "Climb Like A Pro Cyclist! | Top 5 Mistakes To Avoid", channel: "Global Cycling Network", dur: 448, added: 40, by: tunde.id, childSafe: false });
    add("cyc-clean", { yt: "pv9KMTaEgS8", title: "How To Clean Your Bike In 5 Minutes!", channel: "GCN Tech", dur: 449, added: 35, by: tunde.id, childSafe: false });
    add("cyc-maint", { yt: "VKBNDzCLzK8", title: "3 Essential Bike Maintenance Tips For Beginners | Maintenance Monday", channel: "GCN Tech", dur: 594, added: 35, by: tunde.id, childSafe: false });
    add("cyc-hiit40", { yt: "5-PtoExp6bU", title: "HIIT Indoor Cycling Workout | 40 Minute Muscular Endurance Intervals", channel: "Global Cycling Network", dur: 2403, added: 9, by: tunde.id, childSafe: false });
    add("cyc-hiit30", { yt: "ZiGE3-L4vyg", title: "HIIT Indoor Cycling Workout | 30 Minute Intervals: Fitness Training", channel: "Global Cycling Network", dur: 1800, added: 9, by: tunde.id, childSafe: false });

    // ---- Wonder & Wild — Tobi (9) and Ayo (5) -----------------------------
    add("kid-volcano", { yt: "0jKoOUZ1GBM", title: "Every Kind of Volcano | SciShow Kids", channel: "SciShow Kids", dur: 503, added: 6, by: ife.id, childSafe: true, value: "Joy", description: "Shield, cinder cone and composite volcanoes, with a model that actually erupts." });
    add("kid-volcano2", { yt: "K7Oq9_DU1Mc", title: "All About Volcanoes: How They Form, Eruptions & More!", channel: "SciShow Kids", dur: 184, added: 6, by: ife.id, childSafe: true, description: "The short one — good for a five-minute slot before lunch." });
    add("kid-water", { yt: "z5G4NCwWUxY", title: "The Great Aqua Adventure: Crash Course Kids #24.1", channel: "Crash Course Kids", dur: 268, added: 15, by: ife.id, childSafe: true, description: "Where a raindrop goes next." });
    add("kid-engineer", { yt: "owHF9iLyxic", title: "What's an Engineer? Crash Course Kids #12.1", channel: "Crash Course Kids", dur: 270, added: 13, by: ife.id, childSafe: true, value: "Diligence", description: "For the science fair: what engineers actually do all day." });
    add("kid-process", { yt: "fxJWin195kU", title: "The Engineering Process: Crash Course Kids #12.2", channel: "Crash Course Kids", dur: 317, added: 13, by: ife.id, childSafe: true, value: "Diligence", description: "Define, plan, build, test, improve — the loop behind Tobi's science fair project." });
    add("kid-sleep", { yt: "_aAmaCeq9v4", title: "Why Do We Need Sleep?", channel: "SciShow Kids", dur: 213, added: 4, by: ife.id, childSafe: true, description: "Bedtime, explained by someone who is not their mother." });
    add("kid-count", { yt: "k4i6fu0bTQ8", title: "@Numberblocks- Count to Ten | Learn to Count", channel: "Numberblocks", dur: 635, added: 4, by: ife.id, childSafe: true, value: "Joy", description: "Ayo's Reception maths, and she sings along to all of it." });

    const v = (k: string): string => byKey[k];

    // ---- A worked summary, from real captions ------------------------------
    const generous = videos.find((x) => x.id === v("money-giving"))!;
    generous.summary = {
        source: "captions",
        summary:
            "A father hands his six-year-old ten pounds and three jars — spend, save, give — and lets him decide the split. The point is not the maths; it is that a child who has divided their own money has already understood generosity as a choice rather than a rule.",
        takeaways: [
            "Give children real money and real choices, early and small.",
            "Three jars — spend, save, give — beat any lecture about money.",
            "Naming where money goes turns spending from a feeling into a decision.",
            "Generosity is learned by practice, not by being told it matters.",
            "The habit sticks when the amounts are small enough to fail safely.",
        ],
        actions: ["Give each child three labelled jars this week", "Agree the family's giving share for September", "Ask Dami to set her own split for her £25 envelope"],
        discussion: ["If you had £10, how would you split it between spend, save and give?", "What is something we could give that isn't money?", "Why do you think giving feels good?"],
        forKids: "Ten pounds, three jars: one to spend, one to keep, one to give away. You get to choose how much goes in each — and that choice is the whole lesson.",
        suggestedBand: "junior",
        model: "companion",
        at: ctx.at(-23, "21:05"),
    };

    // ---- A summary the companion had to infer ------------------------------
    const decay = videos.find((x) => x.id === v("phy-decay"))!;
    decay.summary = {
        source: "ai_from_description",
        summary: "Half-life questions come in three shapes — count back, count forward, or find the half-life from a graph. The video works one of each and shows the activity units examiners expect.",
        takeaways: ["Half-life is the time for activity to halve, not to reach zero.", "Halving three times leaves an eighth, not a third.", "Read activity off the graph in becquerels before you start dividing.", "Show the halvings as a chain — examiners give method marks for it."],
        actions: ["Do the three half-life questions in the AQA workbook", "Re-do the 2024 paper 2 question 5"],
        discussion: ["Why can we never say when one particular atom will decay?", "Where does half-life matter outside an exam?"],
        suggestedBand: "young-adult",
        model: "companion",
        at: ctx.at(-8, "17:20"),
    };

    // ---- Playlists ---------------------------------------------------------
    const pl = (name: string, note: string, owner: string, visibility: Visibility, childSafe: boolean, keys: string[], extra: Partial<Playlist> = {}): Playlist => ({
        id: ctx.uid("pl"),
        name,
        note,
        ownerMemberId: owner,
        visibility,
        sharedWith: [],
        childSafe,
        valueId: null,
        videoIds: keys.map(v),
        assignedTo: [],
        createdAt: ctx.at(-30, "21:00"),
        ...extra,
    });

    const money = pl("Money & Generosity", "Five lessons we watch together on Sunday afternoons, then talk about over dinner.", ife.id, "child", true, ["money-tricks", "money-giving", "money-dollar", "money-compound", "money-generous"], {
        valueId: "Generosity",
        coverUrl: ctx.img("learning-money"),
        assignedTo: [dami.id, tobi.id],
        createdAt: ctx.at(-27, "21:00"),
    });
    const physics = pl("GCSE Physics", "Paper 1 and paper 2, in the order Dami is revising them.", dami.id, "shared", true, ["phy-energy", "phy-circuits", "phy-ohms", "phy-waves", "phy-decay", "phy-forces", "phy-magnets", "phy-particles"], {
        sharedWith: [ife.id, tunde.id],
        coverUrl: ctx.img("learning-physics"),
        assignedTo: [dami.id],
        valueId: "Diligence",
        createdAt: ctx.at(-31, "19:30"),
    });
    const cycling = pl("Cycling training", "Winter block before the spring sportive. Mine.", tunde.id, "private", false, ["cyc-climb", "cyc-mistakes", "cyc-clean", "cyc-maint", "cyc-hiit40", "cyc-hiit30"], {
        coverUrl: ctx.img("learning-cycling"),
        createdAt: ctx.at(-41, "07:15"),
    });
    const wonder = pl("Wonder & Wild", "Tobi and Ayo's own shelf — volcanoes, water, engineers and counting.", ife.id, "child", true, ["kid-volcano", "kid-volcano2", "kid-water", "kid-engineer", "kid-process", "kid-sleep", "kid-count"], {
        coverUrl: ctx.img("learning-wonder"),
        assignedTo: [tobi.id, ayo.id],
        valueId: "Joy",
        createdAt: ctx.at(-16, "10:00"),
    });
    const playlists = [money, physics, wonder, cycling];

    // ---- Notes -------------------------------------------------------------
    const note = (videoId: string, memberId: string, timestampS: number, text: string, days: number, hhmm = "16:30"): VideoNote => ({
        id: ctx.uid("vn"),
        videoId,
        memberId,
        timestampS,
        text,
        createdAt: ctx.at(-days, hhmm),
    });
    const notes: VideoNote[] = [
        // The brief's note: video two of Money & Generosity, at 12:34.
        note(v("money-giving"), ife.id, 754, "Ask the children how they'd split £10.", 23, "20:12"),
        note(v("money-giving"), ife.id, 212, "The three jars — buy three tomorrow, label them in Ayo's handwriting.", 23, "20:05"),
        note(v("money-tricks"), tunde.id, 96, "Move the standing order to payday, not the 28th.", 25, "21:40"),
        note(v("money-compound"), dami.id, 118, "This is the same as the interest question in the maths mock.", 19, "18:02"),
        note(v("phy-ohms"), dami.id, 143, "I–V graph for a filament lamp curves because resistance rises with temperature.", 26, "17:15"),
        note(v("phy-ohms"), dami.id, 236, "Remember: ammeter in series, voltmeter in parallel. I keep getting this backwards.", 26, "17:19"),
        note(v("phy-decay"), dami.id, 187, "Three halvings = one eighth. Not one third!", 8, "17:26"),
        note(v("cyc-climb"), tunde.id, 168, "Sit back on the saddle on anything over 6% — that's the whole fix.", 38, "07:40"),
        note(v("kid-process"), tobi.id, 121, "Test it, then make it better. That is what I did with the ramp.", 12, "11:20"),
    ];

    // ---- Completions -------------------------------------------------------
    // A child's finished lesson is already paid for — the Sprouts are in their
    // balance — so it can be cleared and watched again without earning twice.
    const paid = (memberId: string, done: boolean): boolean => done && [dami.id, tobi.id, ayo.id].includes(memberId);
    const comp = (memberId: string, videoKey: string, pct: number, doneDays: number | null, markedBy: string | null = null): Completion => ({
        id: ctx.uid("lc"),
        memberId,
        itemType: "video",
        itemId: v(videoKey),
        progressPct: pct,
        completedAt: doneDays === null ? null : ctx.at(-doneDays, "18:30"),
        markedBy,
        pointsAwarded: paid(memberId, doneDays !== null),
        updatedAt: ctx.at(-(doneDays ?? 1), "18:30"),
    });
    const completions: Completion[] = [
        // Dami: three of eight physics lessons done, one half-watched.
        comp(dami.id, "phy-energy", 100, 22),
        comp(dami.id, "phy-circuits", 100, 20),
        comp(dami.id, "phy-ohms", 96, 19),
        comp(dami.id, "phy-decay", 46, null),
        // The family course: weeks one and two behind them, Dami all the way
        // through (there has to be something to celebrate), Tobi trailing.
        comp(ife.id, "money-tricks", 100, 25),
        comp(ife.id, "money-giving", 100, 23),
        comp(ife.id, "money-dollar", 100, 21),
        comp(ife.id, "money-compound", 100, 6),
        comp(tunde.id, "money-tricks", 100, 25),
        comp(tunde.id, "money-giving", 88, 23),
        comp(tunde.id, "money-dollar", 100, 20),
        comp(tunde.id, "money-compound", 100, 5),
        comp(dami.id, "money-tricks", 100, 24),
        comp(dami.id, "money-giving", 100, 22),
        comp(dami.id, "money-dollar", 100, 20),
        comp(dami.id, "money-compound", 100, 6),
        comp(dami.id, "money-generous", 100, 1),
        comp(tobi.id, "money-tricks", 100, 24, ife.id),
        comp(tobi.id, "money-giving", 63, null),
        comp(tobi.id, "money-dollar", 41, null),
        // The children's shelf.
        comp(tobi.id, "kid-volcano", 100, 2),
        comp(tobi.id, "kid-engineer", 100, 11),
        comp(tobi.id, "kid-process", 100, 11),
        comp(tobi.id, "kid-water", 62, null),
        comp(ayo.id, "kid-count", 100, 3, ife.id),
        comp(ayo.id, "kid-volcano2", 100, 2),
        // Oluwafemi's own block.
        comp(tunde.id, "cyc-climb", 100, 37),
        comp(tunde.id, "cyc-mistakes", 100, 36),
        comp(tunde.id, "cyc-hiit40", 34, null),
    ];

    // ---- Plans -------------------------------------------------------------
    const planItem = (itemType: PlanItem["itemType"], itemId: string | null, title: string, minutes: number, week: number, order: number, dueDay: number): PlanItem => ({
        id: ctx.uid("pi"),
        itemType,
        itemId,
        title,
        minutes,
        week,
        order,
        dueDate: d(dueDay),
    });

    const moneyPlan: LearningPlan = {
        id: ctx.uid("lp"),
        name: "Money & Generosity — 3 weeks",
        objective: "Every one of us can say what we spend, what we save and what we give — and why.",
        cadence: "weekly",
        assigneeIds: [ife.id, tunde.id, dami.id, tobi.id],
        goalId: null,
        valueId: "Generosity",
        startDate: d(-14),
        endDate: d(7),
        playlistId: money.id,
        ownerMemberId: ife.id,
        visibility: "child",
        sharedWith: [],
        items: [
            planItem("video", v("money-tricks"), "Watch: three tricks to save", 6, 1, 0, -14),
            planItem("video", v("money-giving"), "Watch: spend, save, give", 14, 1, 1, -12),
            planItem("activity", null, "Set up the three jars and label them", 20, 1, 2, -11),
            planItem("video", v("money-dollar"), "Watch: what gives money its value", 4, 2, 0, -7),
            planItem("video", v("money-compound"), "Watch: compound interest", 7, 2, 1, -5),
            planItem("activity", null, "Each of us names one thing we will give this month", 15, 2, 2, -4),
            planItem("video", v("money-generous"), "Watch: the lie that stops us being generous", 6, 3, 0, 0),
            planItem("activity", null, "Sunday table: how would you split £10?", 20, 3, 1, 2),
        ],
        createdAt: ctx.at(-15, "20:30"),
    };

    const physicsPlan: LearningPlan = {
        id: ctx.uid("lp"),
        name: "Physics revision",
        objective: "Cover paper 1 and paper 2 topics twice before the mocks, with a check question after each.",
        cadence: "twice-weekly",
        assigneeIds: [dami.id],
        goalId: null,
        valueId: "Diligence",
        startDate: d(-24),
        endDate: d(11),
        playlistId: physics.id,
        ownerMemberId: dami.id,
        visibility: "shared",
        sharedWith: [ife.id, tunde.id],
        items: [
            planItem("video", v("phy-energy"), "Energy stores & work done", 6, 1, 0, -24),
            planItem("video", v("phy-circuits"), "Circuits: the three quantities", 5, 1, 1, -21),
            planItem("video", v("phy-ohms"), "V = IR and I–V graphs", 5, 2, 0, -17),
            planItem("video", v("phy-particles"), "Particle theory & states of matter", 5, 2, 1, -14),
            planItem("video", v("phy-decay"), "Radioactive decay & half-life", 7, 3, 0, -3),
            planItem("video", v("phy-waves"), "Longitudinal & transverse waves", 7, 3, 1, 0),
            planItem("video", v("phy-forces"), "Resolving vectors & resultant forces", 5, 4, 0, 4),
            planItem("video", v("phy-magnets"), "Electromagnetism", 6, 4, 1, 7),
        ],
        createdAt: ctx.at(-25, "19:00"),
    };

    // The two family activities: everyone but Tobi has done them, which is
    // exactly the sort of thing "Needs attention" exists to notice.
    const didActivity = (memberId: string, item: PlanItem, days: number, hhmm: string): Completion => ({
        id: ctx.uid("lc"),
        memberId,
        itemType: "plan-item",
        itemId: item.id,
        progressPct: 100,
        completedAt: ctx.at(-days, hhmm),
        markedBy: null,
        pointsAwarded: paid(memberId, true),
        updatedAt: ctx.at(-days, hhmm),
    });
    for (const memberId of [ife.id, tunde.id, dami.id]) completions.push(didActivity(memberId, moneyPlan.items[2], 10, "19:00"));
    for (const memberId of [ife.id, tunde.id, dami.id]) completions.push(didActivity(memberId, moneyPlan.items[5], 3, "20:15"));

    // ---- Action items lifted from a summary --------------------------------
    const tasks: LearningTask[] = [
        { id: ctx.uid("lt"), videoId: v("money-giving"), title: "Give each child three labelled jars this week", memberId: ife.id, dueDate: d(-2), doneAt: null, createdBy: ife.id, createdAt: ctx.at(-9, "21:10") },
        { id: ctx.uid("lt"), videoId: v("money-giving"), title: "Agree the family's giving share for September", memberId: tunde.id, dueDate: d(1), doneAt: null, createdBy: ife.id, createdAt: ctx.at(-9, "21:11") },
        { id: ctx.uid("lt"), videoId: v("money-giving"), title: "Ask Dami to set her own split for her £25 envelope", memberId: ife.id, dueDate: d(-6), doneAt: ctx.at(-6, "18:40"), createdBy: ife.id, createdAt: ctx.at(-9, "21:12") },
        { id: ctx.uid("lt"), videoId: v("phy-decay"), title: "Do the three half-life questions in the AQA workbook", memberId: dami.id, dueDate: d(0), doneAt: null, createdBy: dami.id, createdAt: ctx.at(-8, "17:30") },
    ];

    return { videos, playlists, notes, plans: [moneyPlan, physicsPlan], completions, tasks };
}
