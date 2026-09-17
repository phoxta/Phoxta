import type { SeedContext } from "@/data/core";
import { addDaysIso } from "./derive";
import type { Assignment, Badge, BadgeAward, CharacterLog, CharacterTrack, CurriculaState, DevMilestone, Grade, Subject, Submission, Unit } from "./types";

/**
 * The Adeyemi school year, in the middle of the autumn term.
 *
 * Three children, three completely different shapes of education, all running
 * in one house: Dami is sitting GCSEs in the summer and has eight subjects, a
 * revision timetable and marks that average 78%; Tobi is home-educated three
 * mornings a week and has six subjects, a science-fair project and a reading
 * fluency milestone at seventy per cent; Ayo is in Reception, so her whole
 * curriculum is pictures, letters, numbers and Bible stories, and not one of
 * her tiles asks a five-year-old to type.
 *
 * The state is deliberately mid-flight. Work is overdue, work is waiting to be
 * marked, one of Tobi's marks has not been released to him yet, his times
 * tables milestone has just hit a hundred per cent and nobody has celebrated
 * it, and Ayo earned the Reader badge on Friday evening — the same badge the
 * core seed has already sent her a notification about. September's character
 * track is Diligence, one of the family's five values, and everybody's
 * challenge for today is still undone.
 */

export function seed(ctx: SeedContext): CurriculaState {
    const { at, img, space } = ctx;
    /**
     * ISO date N days from today, done as calendar arithmetic on the date
     * string. `ctx.day()` derives its date from a UTC instant, which lands on
     * the previous day for anyone east of Greenwich — and this family lives in
     * London, where that is true for seven months of the year. Nothing in a
     * curriculum may be a day out: "due today" is the whole point of the feed.
     */
    const day = (n: number): string => addDaysIso(ctx.today, n);
    const [ife, tunde] = ctx.parents;
    const [dami, tobi, ayo] = ctx.kids;
    const sid = space.id;

    // -- subjects ------------------------------------------------------------

    const DAMI_TERM = "Year 11 · Autumn";
    const TOBI_TERM = "Year 5 · Autumn";
    const AYO_TERM = "Reception · Autumn";

    type SubjectSeed = Omit<Subject, "spaceId" | "archived" | "createdAt"> & { archived?: boolean; createdAt?: string };
    const subject = (s: SubjectSeed): Subject => ({ spaceId: sid, archived: false, createdAt: at(-40, "20:00"), ...s });

    const subjects: Subject[] = [
        // Dami — eight GCSEs.
        subject({ id: "sub-dami-maths", childMemberId: dami.id, name: "Maths", colour: "execute", term: DAMI_TERM, targetHoursWeek: 5, kind: "exam", note: "Edexcel · Higher tier", photoUrl: img("curricula-maths") }),
        subject({ id: "sub-dami-english", childMemberId: dami.id, name: "English Literature", colour: "plum", term: DAMI_TERM, targetHoursWeek: 4, kind: "exam", note: "AQA · Macbeth, An Inspector Calls", photoUrl: img("curricula-english") }),
        subject({ id: "sub-dami-science", childMemberId: dami.id, name: "Combined Science", colour: "grow", term: DAMI_TERM, targetHoursWeek: 6, kind: "exam", note: "AQA Trilogy · Biology, Chemistry, Physics", photoUrl: img("curricula-science") }),
        subject({ id: "sub-dami-history", childMemberId: dami.id, name: "History", colour: "ochre", term: DAMI_TERM, targetHoursWeek: 3, kind: "exam", note: "Edexcel · Medicine through time" }),
        subject({ id: "sub-dami-geography", childMemberId: dami.id, name: "Geography", colour: "sage", term: DAMI_TERM, targetHoursWeek: 3, kind: "exam", note: "AQA · Rivers and urban issues" }),
        subject({ id: "sub-dami-yoruba", childMemberId: dami.id, name: "Yorùbá", colour: "terra", term: DAMI_TERM, targetHoursWeek: 2, kind: "exam", note: "Home language · orals with Mama Fọláké", photoUrl: img("curricula-yoruba") }),
        subject({ id: "sub-dami-computing", childMemberId: dami.id, name: "Computer Science", colour: "mint", term: DAMI_TERM, targetHoursWeek: 3, kind: "exam", note: "OCR · Python and algorithms" }),
        subject({ id: "sub-dami-re", childMemberId: dami.id, name: "Religious Studies", colour: "create", term: DAMI_TERM, targetHoursWeek: 2, kind: "exam", note: "Christianity and ethics", photoUrl: img("curricula-bible") }),

        // Tobi — home education, three mornings a week.
        subject({ id: "sub-tobi-maths", childMemberId: tobi.id, name: "Maths", colour: "execute", term: TOBI_TERM, targetHoursWeek: 4, kind: "home-ed", note: "White Rose · Year 5 place value and fractions", photoUrl: img("curricula-maths") }),
        subject({ id: "sub-tobi-english", childMemberId: tobi.id, name: "English", colour: "plum", term: TOBI_TERM, targetHoursWeek: 4, kind: "home-ed", note: "Reading aloud, spelling, one piece of writing a week", photoUrl: img("curricula-reading") }),
        subject({ id: "sub-tobi-science", childMemberId: tobi.id, name: "Science", colour: "grow", term: TOBI_TERM, targetHoursWeek: 3, kind: "home-ed", note: "Earth and space · science fair on Thursday", photoUrl: img("curricula-science") }),
        subject({ id: "sub-tobi-yoruba", childMemberId: tobi.id, name: "Yorùbá", colour: "terra", term: TOBI_TERM, targetHoursWeek: 1, kind: "home-ed", note: "Greetings, numbers and the names of food", photoUrl: img("curricula-yoruba") }),
        subject({ id: "sub-tobi-bible", childMemberId: tobi.id, name: "Bible", colour: "create", term: TOBI_TERM, targetHoursWeek: 2, kind: "home-ed", note: "Mark's gospel with Dad on Wednesdays", photoUrl: img("curricula-bible") }),
        subject({ id: "sub-tobi-music", childMemberId: tobi.id, name: "Music", colour: "live", term: TOBI_TERM, targetHoursWeek: 2, kind: "school", note: "Keyboard at Croydon Music Centre, Saturday mornings", photoUrl: img("curricula-music") }),

        // Ayo — Reception, pictures only.
        subject({ id: "sub-ayo-letters", childMemberId: ayo.id, name: "Letters", colour: "plum", term: AYO_TERM, targetHoursWeek: 3, kind: "school", note: "Phonics, set 2 sounds", photoUrl: img("curricula-letters") }),
        subject({ id: "sub-ayo-numbers", childMemberId: ayo.id, name: "Numbers", colour: "execute", term: AYO_TERM, targetHoursWeek: 2, kind: "school", note: "Counting to twenty, one more and one less", photoUrl: img("curricula-numbers") }),
        subject({ id: "sub-ayo-bible", childMemberId: ayo.id, name: "Bible stories", colour: "create", term: AYO_TERM, targetHoursWeek: 1, kind: "home-ed", note: "Read aloud at bedtime, one story a week", photoUrl: img("curricula-bible") }),
        subject({ id: "sub-ayo-making", childMemberId: ayo.id, name: "Making", colour: "ochre", term: AYO_TERM, targetHoursWeek: 2, kind: "home-ed", note: "Cutting, sticking, painting — and tidying up after", photoUrl: img("curricula-art") }),
    ];

    // -- units ---------------------------------------------------------------

    type UnitSeed = Omit<Unit, "spaceId" | "summary" | "createdAt"> & { summary?: string; createdAt?: string };
    const unit = (u: UnitSeed): Unit => ({ spaceId: sid, summary: "", createdAt: at(-38, "20:10"), ...u });

    const units: Unit[] = [
        unit({ id: "unit-dami-maths-1", subjectId: "sub-dami-maths", title: "Algebra: quadratics and graphs", order: 1, summary: "Factorising, the formula, completing the square, and reading a graph properly." }),
        unit({ id: "unit-dami-maths-2", subjectId: "sub-dami-maths", title: "Trigonometry", order: 2, summary: "SOHCAHTOA, the sine and cosine rules, and the exact values worth memorising." }),
        unit({ id: "unit-dami-english-1", subjectId: "sub-dami-english", title: "Macbeth: ambition and guilt", order: 1, summary: "Six essays and every quotation on one side of A4." }),
        unit({ id: "unit-dami-science-1", subjectId: "sub-dami-science", title: "Chemistry paper 2: rates and energy", order: 1, summary: "Required practicals, rate graphs and the energy profile questions." }),
        unit({ id: "unit-dami-science-2", subjectId: "sub-dami-science", title: "Biology: homeostasis", order: 2 }),
        unit({ id: "unit-dami-history-1", subjectId: "sub-dami-history", title: "Medicine 1250–present", order: 1, summary: "The four factors, and the twelve-mark 'how far' answer." }),
        unit({ id: "unit-dami-geography-1", subjectId: "sub-dami-geography", title: "Rivers and flooding", order: 1 }),
        unit({ id: "unit-dami-yoruba-1", subjectId: "sub-dami-yoruba", title: "Orals: family, market, greetings", order: 1, summary: "Recorded with Mama Fọláké on Sunday evenings." }),
        unit({ id: "unit-dami-computing-1", subjectId: "sub-dami-computing", title: "Python: lists, files and functions", order: 1 }),
        // Imported from the Library: the course the family read together, kept as a unit
        // that still points back at the course it came from.
        unit({
            id: "unit-dami-re-1",
            subjectId: "sub-dami-re",
            title: "Habits of the Household — four weeks",
            order: 1,
            summary: "Exported from the Library course the whole family read after Sunday lunch.",
            sourceCourseId: "course-habits",
            sourceHref: "/grow/books/book-habits/course?c=course-habits",
            sourceLabel: "Habits of the Household · Library course",
            createdAt: at(-30, "21:15"),
        }),

        unit({ id: "unit-tobi-maths-1", subjectId: "sub-tobi-maths", title: "Fractions of amounts", order: 1, summary: "Halves, quarters, thirds — with the Lego, then on paper." }),
        unit({ id: "unit-tobi-maths-2", subjectId: "sub-tobi-maths", title: "Times tables to 12", order: 2 }),
        unit({ id: "unit-tobi-english-1", subjectId: "sub-tobi-english", title: "Reading aloud with expression", order: 1, summary: "Ten minutes a day, out loud, to whoever is in the kitchen." }),
        unit({ id: "unit-tobi-english-2", subjectId: "sub-tobi-english", title: "Writing: a letter and a report", order: 2 }),
        unit({ id: "unit-tobi-science-1", subjectId: "sub-tobi-science", title: "Earth, sun and moon", order: 1, summary: "Ending in the science fair model on Thursday." }),
        unit({ id: "unit-tobi-yoruba-1", subjectId: "sub-tobi-yoruba", title: "Greetings and food", order: 1 }),
        unit({ id: "unit-tobi-bible-1", subjectId: "sub-tobi-bible", title: "Mark 1–4 with Dad", order: 1 }),
        unit({ id: "unit-tobi-music-1", subjectId: "sub-tobi-music", title: "Keyboard grade 1 pieces", order: 1 }),

        unit({ id: "unit-ayo-letters-1", subjectId: "sub-ayo-letters", title: "Set 2 sounds", order: 1 }),
        unit({ id: "unit-ayo-numbers-1", subjectId: "sub-ayo-numbers", title: "Counting to twenty", order: 1 }),
        unit({ id: "unit-ayo-bible-1", subjectId: "sub-ayo-bible", title: "Stories Jesus told", order: 1 }),
        unit({ id: "unit-ayo-making-1", subjectId: "sub-ayo-making", title: "Cutting and sticking", order: 1 }),
    ];

    const subjectOfUnit = new Map(units.map((u) => [u.id, u.subjectId]));
    const childOfSubject = new Map(subjects.map((s) => [s.id, s.childMemberId]));

    type AssignmentSeed = Omit<Assignment, "spaceId" | "subjectId" | "childMemberId" | "instructions" | "attachments" | "pictureLed" | "linkedItemType" | "createdAt"> &
        Partial<Pick<Assignment, "instructions" | "attachments" | "pictureLed" | "linkedItemType" | "createdAt">>;
    /** Sprouts were paid the evening the work went in — see `assignment()`. */
    const paidOn = (date: string): string => new Date(`${date}T17:30:00`).toISOString();
    const assignment = (a: AssignmentSeed): Assignment => {
        const subjectId = subjectOfUnit.get(a.unitId) ?? "";
        const handedIn = a.status === "submitted" || a.status === "graded";
        return {
            spaceId: sid,
            subjectId,
            childMemberId: childOfSubject.get(subjectId) ?? "",
            instructions: "",
            attachments: [],
            pictureLed: false,
            linkedItemType: "none",
            // Work handed in weeks ago was paid for weeks ago. Leaving this null would
            // dangle Sprouts on every finished piece — the child's own page would offer
            // points for handing in something that is already marked.
            creditedAt: handedIn ? paidOn(a.dueDate) : null,
            createdAt: at(-20, "20:00"),
            ...a,
        };
    };

    // -- assignments ---------------------------------------------------------

    const assignments: Assignment[] = [
        // ---- Dami: marked work behind her, four pieces due this week --------
        assignment({ id: "asn-d-m1", unitId: "unit-dami-maths-1", title: "Quadratics: exam questions 1–14", instructions: "Do them in silence, then mark them against the scheme and write down what you got wrong and why.", dueDate: day(-24), status: "graded", sprouts: 25 }),
        assignment({ id: "asn-d-m2", unitId: "unit-dami-maths-1", title: "Completing the square — mini test", instructions: "Forty minutes, no calculator, kitchen table.", dueDate: day(-17), status: "graded", sprouts: 25 }),
        assignment({ id: "asn-d-m3", unitId: "unit-dami-maths-2", title: "Trigonometry: sine and cosine rule practice", dueDate: day(-6), status: "graded", sprouts: 25 }),
        assignment({ id: "asn-d-e1", unitId: "unit-dami-english-1", title: "Macbeth essay: is Lady Macbeth to blame?", instructions: "One side, PEE paragraphs, at least four quotations you can spell from memory.", dueDate: day(-21), status: "graded", sprouts: 30, linkedItemType: "book", linkedItemTitle: "Macbeth", linkedHref: "/grow/books" }),
        assignment({ id: "asn-d-e2", unitId: "unit-dami-english-1", title: "An Inspector Calls: Sheila's change", dueDate: day(-9), status: "graded", sprouts: 30 }),
        assignment({ id: "asn-d-s1", unitId: "unit-dami-science-1", title: "Rates of reaction: required practical write-up", dueDate: day(-19), status: "graded", sprouts: 25 }),
        assignment({ id: "asn-d-s2", unitId: "unit-dami-science-2", title: "Homeostasis: past paper section B", dueDate: day(-4), status: "graded", sprouts: 25 }),
        assignment({ id: "asn-d-h1", unitId: "unit-dami-history-1", title: "The Black Death: causes and treatments", dueDate: day(-22), status: "graded", sprouts: 20 }),
        assignment({ id: "asn-d-h2", unitId: "unit-dami-history-1", title: "Twelve-mark answer: how far did the NHS change medicine?", dueDate: day(-8), status: "graded", sprouts: 20 }),
        assignment({ id: "asn-d-g1", unitId: "unit-dami-geography-1", title: "River Tillingbourne fieldwork write-up", dueDate: day(-13), status: "graded", sprouts: 20 }),
        assignment({ id: "asn-d-y1", unitId: "unit-dami-yoruba-1", title: "Recorded oral: greeting an elder", instructions: "Record it on the phone with Mama Fọláké on the call, and listen back once before you send it.", dueDate: day(-11), status: "graded", sprouts: 20 }),
        assignment({ id: "asn-d-c1", unitId: "unit-dami-computing-1", title: "Python: reading a file into a list", dueDate: day(-5), status: "graded", sprouts: 20 }),

        // Due today, and the four due this week.
        assignment({ id: "asn-d-re1", unitId: "unit-dami-re-1", title: "Week 3: screens, work and rest — write your answer", instructions: "The three questions from week three of the course, in your own words.", dueDate: day(0), status: "in-progress", sprouts: 15, linkedItemType: "book", linkedItemTitle: "Habits of the Household · week 3", linkedHref: "/grow/books/book-habits/course?c=course-habits&w=3" }),
        assignment({ id: "asn-d-m4", unitId: "unit-dami-maths-2", title: "Trigonometry: exact values test", instructions: "Thirty minutes, no calculator. Learn the table first — it is nine numbers.", dueDate: day(1), status: "not-started", sprouts: 25 }),
        assignment({ id: "asn-d-s3", unitId: "unit-dami-science-1", title: "Chemistry paper 2: full past paper", instructions: "One hour fifteen, timed, phone in the drawer.", dueDate: day(2), status: "not-started", sprouts: 30, linkedItemType: "lesson", linkedItemTitle: "Chemistry revision block", linkedHref: "/grow/learning" }),
        assignment({ id: "asn-d-e3", unitId: "unit-dami-english-1", title: "Macbeth: learn twelve quotations", dueDate: day(3), status: "not-started", sprouts: 20 }),
        assignment({ id: "asn-d-g2", unitId: "unit-dami-geography-1", title: "Urban issues: case study on Lagos", instructions: "One page. Ask Dad — he grew up there — but write it yourself.", dueDate: day(5), status: "not-started", sprouts: 20 }),

        // Handed in on Friday, still waiting for a mark.
        assignment({ id: "asn-d-c2", unitId: "unit-dami-computing-1", title: "Python: the shopping-list program", instructions: "It should add, remove and total. Comment every function.", dueDate: day(-1), status: "submitted", sprouts: 20 }),

        // ---- Tobi: fourteen pieces, mixed ----------------------------------
        assignment({ id: "asn-t-m1", unitId: "unit-tobi-maths-1", title: "Fractions of amounts — page 12", dueDate: day(-12), status: "graded", sprouts: 15 }),
        assignment({ id: "asn-t-m2", unitId: "unit-tobi-maths-2", title: "Seven times table — speed test", instructions: "Two minutes. Beat Tuesday's score, not Dami's.", dueDate: day(-5), status: "graded", sprouts: 15 }),
        assignment({ id: "asn-t-m3", unitId: "unit-tobi-maths-2", title: "Eight times table — speed test", dueDate: day(-2), status: "graded", sprouts: 15 }),
        assignment({ id: "asn-t-e1", unitId: "unit-tobi-english-1", title: "Read chapter 6 of Charlotte's Web aloud", instructions: "To whoever is in the kitchen. Ten minutes. Use Wilbur's voice.", dueDate: day(-10), status: "graded", sprouts: 15, linkedItemType: "book", linkedItemTitle: "Charlotte's Web", linkedHref: "/grow/books" }),
        assignment({ id: "asn-t-e2", unitId: "unit-tobi-english-2", title: "Write a letter to Mama Fọláké", instructions: "Tell her about the science fair. Address, date, and a proper ending.", dueDate: day(-3), status: "graded", sprouts: 20 }),
        assignment({ id: "asn-t-sc1", unitId: "unit-tobi-science-1", title: "Draw the phases of the moon", dueDate: day(-7), status: "graded", sprouts: 15, attachments: [img("curricula-science")] }),
        assignment({ id: "asn-t-b1", unitId: "unit-tobi-bible-1", title: "Mark 2: the four friends and the roof", instructions: "Read it with Dad, then tell the story back in your own words.", dueDate: day(-6), status: "graded", sprouts: 10, linkedItemType: "bible", linkedItemTitle: "Mark 2", linkedHref: "/grow/bible" }),

        assignment({ id: "asn-t-sc2", unitId: "unit-tobi-science-1", title: "Science fair: finish the solar-system model", instructions: "Paint Jupiter, glue the labels, and practise saying it out loud twice.", dueDate: day(-2), status: "not-started", sprouts: 25, attachments: [img("curricula-science")] }),
        assignment({ id: "asn-t-y1", unitId: "unit-tobi-yoruba-1", title: "Learn ten food words in Yorùbá", dueDate: day(0), status: "not-started", sprouts: 10, attachments: [img("curricula-yoruba")] }),
        assignment({ id: "asn-t-e3", unitId: "unit-tobi-english-1", title: "Read aloud for ten minutes", dueDate: day(0), status: "in-progress", sprouts: 10, linkedItemType: "book", linkedItemTitle: "Charlotte's Web", linkedHref: "/grow/books" }),
        assignment({ id: "asn-t-m4", unitId: "unit-tobi-maths-1", title: "Fractions: the shaded-shape sheet", dueDate: day(1), status: "not-started", sprouts: 15 }),
        assignment({ id: "asn-t-mu1", unitId: "unit-tobi-music-1", title: "Practise 'Ode to Joy', hands together", instructions: "Fifteen minutes. Slowly first — speed is the last thing you add.", dueDate: day(2), status: "not-started", sprouts: 15, attachments: [img("curricula-music")] }),
        assignment({ id: "asn-t-sc3", unitId: "unit-tobi-science-1", title: "Science fair: present the model", dueDate: day(4), status: "not-started", sprouts: 30 }),

        // Handed in yesterday, waiting to be marked.
        assignment({ id: "asn-t-e4", unitId: "unit-tobi-english-2", title: "Report: how volcanoes work", instructions: "Three paragraphs, one diagram, one word you had to look up.", dueDate: day(-1), status: "submitted", sprouts: 20, linkedItemType: "lesson", linkedItemTitle: "How volcanoes work", linkedHref: "/grow/learning" }),

        // ---- Ayo: nine picture-led tiles, no typing anywhere ----------------
        assignment({ id: "asn-a-l1", unitId: "unit-ayo-letters-1", title: "Find the 'sh' sound", dueDate: day(-9), status: "graded", sprouts: 5, pictureLed: true, attachments: [img("curricula-letters")] }),
        assignment({ id: "asn-a-l2", unitId: "unit-ayo-letters-1", title: "Write your name three times", dueDate: day(-4), status: "graded", sprouts: 5, pictureLed: true, attachments: [img("curricula-letters")] }),
        assignment({ id: "asn-a-n1", unitId: "unit-ayo-numbers-1", title: "Count the buttons to twenty", dueDate: day(-6), status: "graded", sprouts: 5, pictureLed: true, attachments: [img("curricula-numbers")] }),
        assignment({ id: "asn-a-b1", unitId: "unit-ayo-bible-1", title: "The lost sheep — say it back", instructions: "Listen to the story, then tell it back with the toy sheep.", dueDate: day(-3), status: "graded", sprouts: 5, pictureLed: true, attachments: [img("curricula-bible")] }),
        assignment({ id: "asn-a-l3", unitId: "unit-ayo-letters-1", title: "Sound out the picture words", dueDate: day(0), status: "not-started", sprouts: 5, pictureLed: true, attachments: [img("curricula-letters")] }),
        assignment({ id: "asn-a-n2", unitId: "unit-ayo-numbers-1", title: "One more, one less", dueDate: day(0), status: "not-started", sprouts: 5, pictureLed: true, attachments: [img("curricula-numbers")] }),
        assignment({ id: "asn-a-mk1", unitId: "unit-ayo-making-1", title: "Cut out the shapes and stick them down", dueDate: day(1), status: "not-started", sprouts: 5, pictureLed: true, attachments: [img("curricula-art")] }),
        assignment({ id: "asn-a-b2", unitId: "unit-ayo-bible-1", title: "The two houses — build them both", dueDate: day(3), status: "not-started", sprouts: 5, pictureLed: true, attachments: [img("curricula-bible")] }),
        // Handed in with a photo — nothing typed.
        assignment({ id: "asn-a-mk2", unitId: "unit-ayo-making-1", title: "Paint the autumn tree", dueDate: day(-1), status: "submitted", sprouts: 5, pictureLed: true, attachments: [img("curricula-art")] }),
    ];

    // -- submissions ---------------------------------------------------------

    const submissions: Submission[] = [
        { id: "sbm-1", spaceId: sid, assignmentId: "asn-d-c2", memberId: dami.id, text: "Done. The remove function was the hard bit — I had to loop backwards or it skipped items. Comments are in.", mediaUrls: [], submittedAt: at(-1, "17:40") },
        { id: "sbm-2", spaceId: sid, assignmentId: "asn-t-e4", memberId: tobi.id, text: "Volcanoes happen when magma pushes up through a crack. The word I looked up was 'viscous'. My diagram has the magma chamber and the vent.", mediaUrls: [], submittedAt: at(-1, "11:20") },
        { id: "sbm-3", spaceId: sid, assignmentId: "asn-a-mk2", memberId: ayo.id, text: "", mediaUrls: [img("curricula-art")], submittedAt: at(-1, "15:05") },
        { id: "sbm-4", spaceId: sid, assignmentId: "asn-d-m3", memberId: dami.id, text: "Sine rule fine, cosine rule I kept rearranging wrong. Q7 I ran out of time.", mediaUrls: [], submittedAt: at(-6, "18:10") },
        { id: "sbm-5", spaceId: sid, assignmentId: "asn-t-e2", memberId: tobi.id, text: "I told Grandma about Jupiter and asked her about the rain in Ibadan.", mediaUrls: [], submittedAt: at(-3, "16:30") },
    ];

    // -- grades --------------------------------------------------------------
    // Dami's twelve marks average exactly 78%.

    const grade = (assignmentId: string, score: number, comment: string, gradedBy: string, daysAgo: number, visibleToChild = true, rubric: Grade["rubric"] = []): Grade => ({
        assignmentId,
        spaceId: sid,
        score,
        letter: score >= 90 ? "A*" : score >= 80 ? "A" : score >= 70 ? "B" : score >= 60 ? "C" : score >= 50 ? "D" : score >= 40 ? "E" : "U",
        rubric,
        comment,
        gradedBy,
        gradedAt: at(daysAgo, "20:30"),
        visibleToChild,
    });

    const grades: Grade[] = [
        grade("asn-d-m1", 82, "Strong. Two sign errors, both in the same place — check the middle term before you factorise.", ife.id, -23, true, [
            { criterion: "Method", score: 17, max: 20 },
            { criterion: "Accuracy", score: 16, max: 20 },
            { criterion: "Presentation", score: 8, max: 10 },
        ]),
        grade("asn-d-m2", 74, "Completing the square is nearly there. Redo questions 6 to 9 on Saturday.", ife.id, -16),
        grade("asn-d-m3", 79, "Sine rule secure. Write the cosine rule out before you start each question and it stops being a guess.", ife.id, -5, true, [
            { criterion: "Sine rule", score: 9, max: 10 },
            { criterion: "Cosine rule", score: 6, max: 10 },
            { criterion: "Working shown", score: 8, max: 10 },
        ]),
        grade("asn-d-e1", 71, "The argument is yours, which is the hard part. Quotations need to be shorter and inside the sentence.", tunde.id, -20),
        grade("asn-d-e2", 76, "Sheila's change is well tracked. Say what Priestley wanted the 1945 audience to do about it.", tunde.id, -8),
        grade("asn-d-s1", 85, "A proper write-up. Table, graph, conclusion, and you named the variable you couldn't control.", ife.id, -18),
        grade("asn-d-s2", 80, "Good on negative feedback. The six-marker needs a structure: what, why, what happens if it fails.", ife.id, -3),
        grade("asn-d-h1", 68, "You know the content. The marks are in 'how far' — you have to argue against yourself once.", tunde.id, -21),
        grade("asn-d-h2", 72, "Better. Two factors, one counter-argument, and a conclusion that actually decides.", tunde.id, -7),
        grade("asn-d-g1", 88, "Best piece this term. The fieldwork evaluation was honest about what went wrong.", ife.id, -12),
        grade("asn-d-y1", 91, "Mama Fọláké was proud, and so am I. The tone on 'ẹ káàárọ̀' was right every time.", tunde.id, -10),
        grade("asn-d-c1", 70, "It works. It isn't readable yet — name your variables like someone else will read them.", tunde.id, -4),

        // Tobi
        grade("asn-t-m1", 84, "Fractions of amounts: solid. You showed the working every time, which is why it's solid.", ife.id, -11),
        grade("asn-t-m2", 90, "Seven times table in ninety seconds. That is real progress from last month.", ife.id, -4),
        // Marked this morning and NOT released to him yet — a parent decides when he sees it.
        grade("asn-t-m3", 62, "Eights are the shaky ones. Ten minutes a day this week and we'll test again on Friday.", ife.id, 0, false),
        grade("asn-t-e1", 88, "Wonderful reading. You did Templeton's voice and Ayo laughed.", tunde.id, -9),
        grade("asn-t-e2", 92, "A beautiful letter. Address, date, ending — all correct, and Grandma has read it four times.", tunde.id, -2),
        grade("asn-t-sc1", 78, "Phases are right and in order. Label the terminator line and it's full marks.", ife.id, -6),
        grade("asn-t-b1", 95, "You told it better than the book. 'They made a hole in the roof because they wouldn't give up.'", tunde.id, -5),

        // Ayo — a score is a sticker at five, and every one is released.
        grade("asn-a-l1", 90, "Found every 'sh'. Ship, shell, shop, shoe.", ife.id, -8),
        grade("asn-a-l2", 85, "Three times, and the 'y' sat on the line the third time.", ife.id, -3),
        grade("asn-a-n1", 95, "Twenty buttons, twice, without losing count.", ife.id, -5),
        grade("asn-a-b1", 100, "She told the whole story to the toy sheep and then to Dad.", tunde.id, -2),
    ];

    // -- badges --------------------------------------------------------------

    type BadgeSeed = Omit<Badge, "spaceId" | "levels" | "createdAt"> & { levels?: string[]; createdAt?: string };
    const badge = (b: BadgeSeed): Badge => ({ spaceId: sid, levels: ["Bronze", "Silver", "Gold"], createdAt: at(-200, "19:00"), ...b });

    const badges: Badge[] = [
        badge({ id: "bdg-reader", name: "Reader", kind: "skill", virtueOrSkill: "Reading", criteria: "Finish twelve books, or read aloud every day for a month.", icon: "📚" }),
        badge({ id: "bdg-mathlete", name: "Mathlete", kind: "skill", virtueOrSkill: "Maths", criteria: "Average 80% or better across a term of maths.", icon: "➗" }),
        badge({ id: "bdg-scientist", name: "Scientist", kind: "skill", virtueOrSkill: "Science", criteria: "Plan, run and write up an investigation on your own.", icon: "🔬" }),
        badge({ id: "bdg-memory", name: "Memory Master", kind: "skill", virtueOrSkill: "Scripture", criteria: "Say twenty memory verses from memory, references and all.", icon: "🧠" }),
        badge({ id: "bdg-wordsmith", name: "Wordsmith", kind: "skill", virtueOrSkill: "Writing", criteria: "Write something a stranger would want to read.", icon: "✍️" }),
        badge({ id: "bdg-linguist", name: "Linguist", kind: "skill", virtueOrSkill: "Yorùbá", criteria: "Hold a five-minute conversation in Yorùbá with an elder.", icon: "🗣️" }),
        badge({ id: "bdg-coder", name: "Coder", kind: "skill", virtueOrSkill: "Computing", criteria: "Write a program someone else in the house actually uses.", icon: "💻" }),
        badge({ id: "bdg-musician", name: "Musician", kind: "skill", virtueOrSkill: "Music", criteria: "Play a piece all the way through, in front of people, without stopping.", icon: "🎹" }),
        badge({ id: "bdg-helper", name: "Helper", kind: "virtue", virtueOrSkill: "Service", criteria: "Do the job nobody asked you to do, three weeks running.", icon: "🤝" }),
        badge({ id: "bdg-kindness", name: "Kindness", kind: "virtue", virtueOrSkill: "Love", criteria: "Someone outside this house tells us you were kind to them.", icon: "💛" }),
        badge({ id: "bdg-diligence", name: "Diligence", kind: "virtue", virtueOrSkill: "Diligence", criteria: "Finish what you start, when it stopped being fun.", icon: "🌱" }),
        badge({ id: "bdg-courage", name: "Courage", kind: "virtue", virtueOrSkill: "Courage", criteria: "Do the thing you were afraid of, and tell us about it after.", icon: "🦁" }),
    ];

    const award = (id: string, badgeId: string, memberId: string, level: string, note: string, awardedBy: string, daysAgo: number, hhmm = "19:30"): BadgeAward => ({
        id,
        spaceId: sid,
        badgeId,
        memberId,
        level,
        note,
        awardedBy,
        awardedAt: at(daysAgo, hhmm),
    });

    const awards: BadgeAward[] = [
        // Dami — seven.
        award("awd-d-1", "bdg-reader", dami.id, "Gold", "Twelve books in a year, three of them set texts she didn't have to enjoy.", ife.id, -150),
        award("awd-d-2", "bdg-mathlete", dami.id, "Silver", "Eighty-one per cent across the summer term.", ife.id, -96),
        award("awd-d-3", "bdg-scientist", dami.id, "Silver", "The rates practical was planned and written up without help.", ife.id, -18),
        award("awd-d-4", "bdg-linguist", dami.id, "Gold", "Twenty minutes on the phone to Ibadan, entirely in Yorùbá.", tunde.id, -10),
        award("awd-d-5", "bdg-coder", dami.id, "Bronze", "The revision timer she wrote — and Tobi uses it.", tunde.id, -60),
        award("awd-d-6", "bdg-wordsmith", dami.id, "Silver", "The Macbeth essay argued something, which is rarer than it sounds.", tunde.id, -20),
        award("awd-d-7", "bdg-diligence", dami.id, "Silver", "Six weeks of revision blocks kept without being nagged.", ife.id, -30),

        // Tobi — five.
        award("awd-t-1", "bdg-reader", tobi.id, "Silver", "Read aloud every single day in August.", tunde.id, -37),
        award("awd-t-2", "bdg-scientist", tobi.id, "Bronze", "Built the model, and could explain why the moon changes shape.", ife.id, -6),
        award("awd-t-3", "bdg-memory", tobi.id, "Bronze", "Ten verses, references and all, at the Wednesday study.", tunde.id, -25),
        award("awd-t-4", "bdg-kindness", tobi.id, "Bronze", "Mrs Bassey next door told us he carried her shopping in, twice.", ife.id, -14),
        award("awd-t-5", "bdg-helper", tobi.id, "Bronze", "Fed Bella every morning for a month without one reminder.", ife.id, -9),

        // Ayo — three, the newest on Friday evening (the child screen celebrates it).
        award("awd-a-1", "bdg-helper", ayo.id, "Bronze", "Tidied the making table every single time.", ife.id, -20),
        award("awd-a-2", "bdg-courage", ayo.id, "Bronze", "First day of Reception. Walked in on her own.", ife.id, -12),
        award("awd-a-3", "bdg-reader", ayo.id, "Bronze", "Twelve books — and she read the last one to Mama Fọláké on the phone.", tunde.id, -2, "19:00"),
    ];

    // -- developmental milestones --------------------------------------------

    type MilestoneSeed = Omit<DevMilestone, "spaceId" | "note" | "createdAt"> & { note?: string; createdAt?: string };
    const milestone = (m: MilestoneSeed): DevMilestone => ({ spaceId: sid, note: "", createdAt: at(-120, "20:00"), ...m });

    const milestones: DevMilestone[] = [
        milestone({ id: "mil-t-reading", memberId: tobi.id, band: "junior", title: "Reading fluency", note: "Reads aloud at a natural pace, with expression, without tracking with a finger.", progressPct: 70, photoUrl: img("curricula-reading") }),
        // At a hundred per cent and not yet celebrated — the card asks the family to mark it.
        milestone({ id: "mil-t-tables", memberId: tobi.id, band: "junior", title: "Times tables to 12", note: "All twelve, in any order, inside two minutes.", progressPct: 100, achievedAt: day(-1), photoUrl: img("curricula-maths") }),
        milestone({ id: "mil-t-swim", memberId: tobi.id, band: "junior", title: "Swims 25 metres unaided", progressPct: 100, achievedAt: day(-45), celebratedAt: at(-44, "18:00"), photoUrl: img("home-swim") }),
        milestone({ id: "mil-t-write", memberId: tobi.id, band: "junior", title: "Writes a paragraph unaided", note: "Capital letters, full stops, and one connective that isn't 'and'.", progressPct: 45 }),

        milestone({ id: "mil-a-letters", memberId: ayo.id, band: "little", title: "Recognises all 26 letters", progressPct: 85, photoUrl: img("curricula-letters") }),
        milestone({ id: "mil-a-name", memberId: ayo.id, band: "little", title: "Writes her own name", progressPct: 100, achievedAt: day(-10), celebratedAt: at(-10, "19:00"), photoUrl: img("curricula-milestone") }),
        milestone({ id: "mil-a-shoes", memberId: ayo.id, band: "little", title: "Ties her own shoes", progressPct: 40 }),
        milestone({ id: "mil-a-twenty", memberId: ayo.id, band: "little", title: "Counts to twenty", progressPct: 95, photoUrl: img("curricula-numbers") }),

        milestone({ id: "mil-d-revision", memberId: dami.id, band: "young-adult", title: "Runs her own revision timetable", note: "Plans the week herself on Sunday and keeps it without being asked.", progressPct: 80, photoUrl: img("curricula-revision") }),
        milestone({ id: "mil-d-money", memberId: dami.id, band: "young-adult", title: "Manages her own money for a term", progressPct: 60 }),
    ];

    // -- character tracks ----------------------------------------------------

    const month = ctx.today.slice(0, 7);
    const prevMonth = day(-30).slice(0, 7);

    const SEPTEMBER: string[] = [
        "Make your bed before breakfast.",
        "Finish your maths before you open a screen.",
        "Put every shoe in the rack, not near it.",
        "Do one job nobody asked you to do.",
        "Read for ten minutes without stopping.",
        "Clear the table after supper without being asked.",
        "Practise the hard thing twice.",
        "Write neatly, even on the rough page.",
        "Finish before you rest.",
        "Help Ayo with her letters for five minutes.",
        "Start the thing you have been putting off.",
        "Check your work before you say you are done.",
        "Put your things away where they live.",
        "Do today's jobs today.",
        "Say what you will do, then do it.",
        "Work for twenty minutes with the door shut.",
        "Redo the question you got wrong.",
        "Feed Bella before you eat.",
        "Finish the last page, not the last paragraph.",
        "Tidy one drawer nobody can see.",
        "Ask for help before you give up.",
        "Learn one thing by heart.",
        "Do the washing-up properly, corners and all.",
        "Get ready for tomorrow tonight.",
        "Work when nobody is watching.",
        "Keep going for five more minutes.",
        "Put the tools back the way you found them.",
        "Do the boring bit first.",
        "Finish what you started in September.",
        "Tell someone what you finished this month.",
    ];

    const tracks: CharacterTrack[] = [
        {
            id: "trk-sep",
            spaceId: sid,
            month,
            virtue: "Diligence",
            valueLabel: "Diligence",
            intro: "Diligence is one of our five values, and this month it is the one we are practising on purpose. One small thing a day — finished, not started.",
            challenges: SEPTEMBER,
            sprouts: 10,
            createdAt: at(-6, "21:00"),
        },
        {
            id: "trk-aug",
            spaceId: sid,
            month: prevMonth,
            virtue: "Generosity",
            valueLabel: "Generosity",
            intro: "August was about giving things away — time, money, the last piece.",
            challenges: [
                "Give away something you still like.",
                "Do a job for someone else, for free.",
                "Put something in the offering yourself.",
                "Share the last one.",
                "Write a thank-you note.",
                "Invite someone in.",
                "Give the best seat away.",
            ],
            sprouts: 10,
            createdAt: at(-37, "21:00"),
        },
    ];

    const log = (id: string, memberId: string, daysAgo: number, challengeIndex: number, reflection: string): CharacterLog => ({
        id,
        spaceId: sid,
        trackId: "trk-sep",
        memberId,
        date: day(daysAgo),
        challengeIndex,
        reflection,
        sprouts: 10,
        createdAt: at(daysAgo, "19:45"),
    });

    // September 1st is five days before Sunday the 6th; nobody has done today's yet.
    const logs: CharacterLog[] = [
        log("clg-d-1", dami.id, -5, 0, "Bed made. It took forty seconds, which is annoying."),
        log("clg-d-2", dami.id, -4, 1, "Did the whole trig sheet before touching my phone. It was easier than I expected."),
        log("clg-d-3", dami.id, -3, 2, "Shoe rack. Everyone else's too, which was not the challenge."),
        log("clg-d-4", dami.id, -2, 3, "Hoovered the stairs. Nobody noticed, which I think is the point."),
        log("clg-d-5", dami.id, -1, 4, "Read for ten minutes with no phone in the room."),

        log("clg-t-1", tobi.id, -5, 0, "I made my bed and Bella got on it straight away."),
        log("clg-t-2", tobi.id, -4, 1, "Maths first. Then I played."),
        log("clg-t-3", tobi.id, -3, 2, "All the shoes. Even Ayo's."),
        log("clg-t-4", tobi.id, -1, 4, "I read about Jupiter for ten minutes and didn't stop once."),

        log("clg-a-1", ayo.id, -5, 0, "I made my bed with Mummy."),
        log("clg-a-2", ayo.id, -3, 2, "I put the shoes away."),
    ];

    return { subjects, units, assignments, submissions, grades, badges, awards, milestones, tracks, logs };
}
