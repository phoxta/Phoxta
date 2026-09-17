import type { SeedContext } from "@/data/core";
import type { Book, BooksState, Course, CourseItem, CourseWeek, QuizAttempt, ReadingPlan, ReadingProgress } from "./types";

/**
 * The Adeyemi shelf.
 *
 * Twelve books that could only belong to this family: the parenting book Ifeoluwa
 * and Oluwafemi read together and turned into a family course, the habits book Ifeoluwa
 * is halfway through and keeps to herself, Oluwafemi's audiobook on hurry (linked
 * to the family goal "Read four books together this year"), Dami's GCSE set texts, Tobi's Percy Jackson
 * and the Charlotte's Web plan at ten pages a day, and Ayo's two picture books
 * — one finished, and read down the phone to Mama Fọláké.
 *
 * The course on "Habits of the Household" is live: published, child-safe, Dami
 * and Tobi enrolled, week one finished with Dami's quiz at 4/5, week two half
 * done — and shared with Pastor Dayo, who can read that one course and nothing
 * else on this shelf. A second course sits in DRAFT on Oluwafemi's audiobook, so
 * the editor is one click away without generating anything.
 */

export function seed(ctx: SeedContext): BooksState {
    const { day, at, img, space } = ctx;
    const [ife, tunde] = ctx.parents;
    const [dami, tobi, ayo] = ctx.kids;
    const dayo = ctx.guests.find((g) => g.relation === "Mentor") ?? ctx.guests[1];

    type BookSeed = Omit<Book, "id" | "spaceId" | "rating" | "notes" | "tags" | "sharedWith"> & {
        rating?: number;
        notes?: string;
        tags?: string[];
        sharedWith?: string[];
    };
    const book = (id: string, b: BookSeed): Book => ({ id, spaceId: space.id, rating: 0, notes: "", tags: [], sharedWith: [], ...b });

    const books: Book[] = [
        book("book-habits", {
            title: "Habits of the Household",
            author: "Justin Whitmer Earley",
            format: "physical",
            coverUrl: img("books-habits-household"),
            ownerMemberId: null,
            status: "done",
            pages: 224,
            rating: 5,
            notes: "The chapter on bedtime blessings changed our evenings. Worth doing as a family, slowly.",
            tags: ["parenting", "faith", "rhythms"],
            visibility: "child",
            value: "Faith",
            startedAt: day(-96),
            finishedAt: day(-38),
            createdAt: at(-120, "20:00"),
        }),
        book("book-atomic", {
            title: "Atomic Habits",
            author: "James Clear",
            format: "ebook",
            coverUrl: img("books-atomic-habits"),
            ownerMemberId: ife.id,
            status: "reading",
            pages: 320,
            notes: "Two-minute rule for the studio admin. Try it for a fortnight before deciding.",
            tags: ["habits", "work"],
            visibility: "private",
            value: "Diligence",
            startedAt: day(-51),
            createdAt: at(-60, "07:40"),
        }),
        book("book-hurry", {
            title: "The Ruthless Elimination of Hurry",
            author: "John Mark Comer",
            format: "audio",
            coverUrl: img("books-hurry"),
            ownerMemberId: tunde.id,
            status: "reading",
            // Audiobook: "pages" is minutes.
            pages: 330,
            notes: "Listening on the cycle home. Sabbath chapter is the one to talk about on Sunday.",
            tags: ["faith", "rest"],
            visibility: "family",
            value: "Faith",
            // A REAL goal id from the Goals module (goal-3, "Read four books
            // together this year"), not a slug made up from a label.
            goalId: "goal-3",
            goalLabel: "Read four books together this year",
            startedAt: day(-23),
            createdAt: at(-25, "18:20"),
        }),
        book("book-things", {
            title: "Things Fall Apart",
            author: "Chinua Achebe",
            format: "physical",
            coverUrl: img("books-nigeria"),
            ownerMemberId: dami.id,
            status: "reading",
            pages: 209,
            notes: "GCSE set text. Mum keeps saying to read the last three chapters twice.",
            tags: ["GCSE", "novel", "Nigeria"],
            visibility: "child",
            value: "Diligence",
            startedAt: day(-17),
            createdAt: at(-30, "16:10"),
        }),
        book("book-macbeth", {
            title: "Macbeth",
            author: "William Shakespeare",
            format: "physical",
            coverUrl: img("books-classic"),
            ownerMemberId: dami.id,
            status: "want",
            pages: 160,
            tags: ["GCSE", "drama"],
            visibility: "child",
            createdAt: at(-30, "16:12"),
        }),
        book("book-inspector", {
            title: "An Inspector Calls",
            author: "J. B. Priestley",
            format: "ebook",
            coverUrl: img("books-novel"),
            ownerMemberId: dami.id,
            status: "done",
            pages: 96,
            rating: 4,
            notes: "Read it in two evenings. Eva Smith essay plan is in my folder.",
            tags: ["GCSE", "drama"],
            visibility: "child",
            startedAt: day(-64),
            finishedAt: day(-58),
            createdAt: at(-70, "19:00"),
        }),
        book("book-percy", {
            title: "Percy Jackson and the Lightning Thief",
            author: "Rick Riordan",
            format: "physical",
            coverUrl: img("books-percy"),
            ownerMemberId: tobi.id,
            status: "reading",
            pages: 377,
            tags: ["adventure", "for Tobi"],
            visibility: "child",
            value: "Joy",
            startedAt: day(-26),
            createdAt: at(-30, "17:30"),
        }),
        book("book-charlotte", {
            title: "Charlotte's Web",
            author: "E. B. White",
            format: "physical",
            coverUrl: img("books-charlotte"),
            ownerMemberId: tobi.id,
            status: "reading",
            pages: 184,
            notes: "Ten pages a day with Mum at the kitchen table, before the science project.",
            tags: ["home-ed", "Year 5"],
            visibility: "child",
            value: "Love",
            startedAt: day(-9),
            createdAt: at(-12, "09:15"),
        }),
        book("book-gruffalo", {
            title: "The Gruffalo",
            author: "Julia Donaldson",
            format: "physical",
            coverUrl: img("books-picture"),
            ownerMemberId: ayo.id,
            status: "done",
            pages: 32,
            rating: 5,
            notes: "Ayo read the last page to Mama Fọláké on the phone. Nobody breathed.",
            tags: ["picture book", "read-aloud"],
            visibility: "child",
            value: "Joy",
            startedAt: day(-14),
            finishedAt: day(-4),
            createdAt: at(-20, "18:45"),
        }),
        book("book-handa", {
            title: "Handa's Surprise",
            author: "Eileen Browne",
            format: "physical",
            coverUrl: img("books-handa"),
            ownerMemberId: ayo.id,
            status: "reading",
            pages: 24,
            tags: ["picture book", "Reception"],
            visibility: "child",
            value: "Joy",
            startedAt: day(-3),
            createdAt: at(-6, "18:50"),
        }),
        book("book-marriage", {
            title: "The Meaning of Commitment",
            author: "Timothy Keller",
            format: "ebook",
            coverUrl: img("books-faith"),
            ownerMemberId: ife.id,
            status: "reading",
            pages: 288,
            notes: "One chapter each on a Thursday after the children are down. Ours, not the children's.",
            tags: ["relationship", "faith"],
            visibility: "shared",
            sharedWith: [tunde.id],
            value: "Love",
            startedAt: day(-40),
            createdAt: at(-44, "21:30"),
        }),
        book("book-chem", {
            title: "GCSE Chemistry: The Revision Guide",
            author: "CGP Books",
            format: "physical",
            coverUrl: img("books-gcse"),
            ownerMemberId: dami.id,
            status: "want",
            pages: 132,
            tags: ["GCSE", "revision"],
            visibility: "child",
            value: "Diligence",
            createdAt: at(-8, "16:40"),
        }),
    ];

    const progress: ReadingProgress[] = [
        { bookId: "book-atomic", memberId: ife.id, page: 198, pct: 62, updatedAt: at(-1, "22:10") },
        { bookId: "book-hurry", memberId: tunde.id, page: 149, pct: 45, updatedAt: at(-2, "08:05") },
        { bookId: "book-things", memberId: dami.id, page: 79, pct: 38, updatedAt: at(-1, "20:40") },
        { bookId: "book-percy", memberId: tobi.id, page: 154, pct: 41, updatedAt: at(-2, "19:20") },
        { bookId: "book-charlotte", memberId: tobi.id, page: 40, pct: 22, updatedAt: at(-3, "10:05") },
        { bookId: "book-handa", memberId: ayo.id, page: 12, pct: 50, updatedAt: at(-1, "18:30") },
        { bookId: "book-marriage", memberId: ife.id, page: 202, pct: 70, updatedAt: at(-5, "21:50") },
        { bookId: "book-marriage", memberId: tunde.id, page: 173, pct: 60, updatedAt: at(-5, "21:55") },
        { bookId: "book-habits", memberId: ife.id, page: 224, pct: 100, updatedAt: at(-38, "22:00") },
        { bookId: "book-habits", memberId: tunde.id, page: 224, pct: 100, updatedAt: at(-36, "22:00") },
        { bookId: "book-inspector", memberId: dami.id, page: 96, pct: 100, updatedAt: at(-58, "21:00") },
        { bookId: "book-gruffalo", memberId: ayo.id, page: 32, pct: 100, updatedAt: at(-4, "18:40") },
    ];

    const plans: ReadingPlan[] = [
        {
            id: "plan-charlotte",
            spaceId: space.id,
            bookId: "book-charlotte",
            // Ten pages a day, every day — so it is on today's list whatever
            // day of the week the demo is opened on.
            pace: { unit: "pages", amount: 10, daysPerWeek: 7 },
            assigneeMemberIds: [tobi.id],
            startDate: day(-6),
            endDate: day(+16),
            createdAt: at(-7, "09:00"),
        },
        {
            id: "plan-things",
            spaceId: space.id,
            bookId: "book-things",
            pace: { unit: "pages", amount: 8, daysPerWeek: 5 },
            assigneeMemberIds: [dami.id],
            startDate: day(-11),
            endDate: day(+9),
            goalId: "goal-1",
            createdAt: at(-12, "17:30"),
        },
        {
            id: "plan-hurry",
            spaceId: space.id,
            bookId: "book-hurry",
            pace: { unit: "minutes", amount: 25, daysPerWeek: 4 },
            assigneeMemberIds: [tunde.id],
            startDate: day(-9),
            endDate: day(+18),
            goalId: "goal-3",
            createdAt: at(-24, "18:30"),
        },
    ];

    // ---- The family course ---------------------------------------------------

    const courses: Course[] = [
        {
            id: "course-habits",
            spaceId: space.id,
            bookId: "book-habits",
            title: "Habits of the Household — four weeks for us",
            weeks: 4,
            status: "published",
            generatedBy: ife.id,
            model: "companion",
            costCents: 0,
            sharedWithGuestIds: [dayo.id],
            childSafe: true,
            audience: "The whole family, read aloud after Sunday lunch. Tobi is nine, Dami is fifteen.",
            enrolled: [dami.id, tobi.id],
            unitId: null,
            createdAt: at(-35, "20:15"),
        },
        {
            id: "course-hurry",
            spaceId: space.id,
            bookId: "book-hurry",
            title: "Unhurried — a draft for the two of us",
            weeks: 4,
            status: "draft",
            generatedBy: tunde.id,
            model: "companion",
            costCents: 0,
            sharedWithGuestIds: [],
            childSafe: false,
            audience: "Ifeoluwa and me, Thursday evenings. Practical, not preachy.",
            enrolled: [],
            unitId: null,
            createdAt: at(-4, "21:10"),
        },
    ];

    const item = (weekId: string, type: CourseItem["type"], title: string, order: number, doneBy: string[] = []): CourseItem => ({
        id: `${weekId}-i${order}`,
        courseWeekId: weekId,
        type,
        title,
        order,
        doneBy,
    });

    const bothKids = [dami.id, tobi.id];

    const weeks: CourseWeek[] = [
        {
            id: "cw-habits-1",
            courseId: "course-habits",
            week: 1,
            theme: "Waking: what we do first",
            chapters: "Introduction and chapters 1–2",
            discussionQuestions: [
                "What is the first thing each of us does in the morning — honestly?",
                "Which of our mornings would we not want a stranger to film, and why?",
                "What one sentence could we say to each other before anyone leaves the house?",
            ],
            familyActivity: "Write our morning sentence on a card and tape it inside the front door. Everyone signs it.",
            quiz: [
                { q: "The author calls the ordinary things we repeat every day…", options: ["habits of the household", "family rules", "chores", "traditions"], answer: 0, why: "It is the title, and the point: the small repeated things form us." },
                { q: "Why does he start with waking?", options: ["Because mornings are the busiest", "Because the first minutes set the shape of the day", "Because children wake first", "Because breakfast is a meal"], answer: 1 },
                { q: "A liturgy, in this book, means…", options: ["a church service", "a pattern we repeat that forms what we love", "a prayer book", "a hymn"], answer: 1 },
                { q: "What does he say about doing it imperfectly?", options: ["Start again tomorrow", "Give up and try another book", "Only do it if everyone agrees", "Wait until the children are older"], answer: 0, why: "Grace days, not streaks — the same rule Wàfè keeps." },
                { q: "Our family's morning sentence should be…", options: ["long and detailed", "different every day", "short enough to say at the door", "written by one parent alone"], answer: 2 },
            ],
            items: [
                item("cw-habits-1", "read", "Read the introduction and chapters 1–2", 1, bothKids),
                item("cw-habits-1", "discuss", "Three questions after Sunday lunch", 2, bothKids),
                item("cw-habits-1", "activity", "Write and sign our morning sentence", 3, bothKids),
                item("cw-habits-1", "quiz", "Take the week 1 quiz", 4, [dami.id, tobi.id]),
            ],
        },
        {
            id: "cw-habits-2",
            courseId: "course-habits",
            week: 2,
            theme: "Mealtimes: the table as an altar",
            chapters: "Chapters 3–4",
            discussionQuestions: [
                "When did we last eat with nobody holding a phone?",
                "Who should we invite to our table this month who has never been?",
                "What would we like said before we eat?",
            ],
            familyActivity: "Invite one person outside the family to Sunday lunch and let Tobi lay their place.",
            quiz: [
                { q: "Why does the author give mealtimes a whole chapter?", options: ["Because families eat three times a day", "Because the table is where a household practises welcome", "Because cooking is a skill", "Because food is expensive"], answer: 1 },
                { q: "What does he suggest about phones at the table?", options: ["Keep them face down", "Leave them in another room", "Use them for grace", "Allow them at breakfast only"], answer: 1 },
                { q: "Hospitality, he argues, begins…", options: ["with a big house", "with a tidy house", "with an open door and a spare chair", "with good cooking"], answer: 2 },
                { q: "Which of these is a habit the book recommends?", options: ["Saying one thing you are grateful for", "Eating in silence", "Serving the youngest last", "Finishing within ten minutes"], answer: 0 },
                { q: "What is the risk he names for busy families?", options: ["Eating too much", "Eating separately without noticing", "Cooking the same meals", "Spending too much on groceries"], answer: 1 },
            ],
            items: [
                item("cw-habits-2", "read", "Read chapters 3–4", 1, bothKids),
                item("cw-habits-2", "discuss", "Three questions at Sunday lunch", 2, [dami.id]),
                item("cw-habits-2", "activity", "Invite someone to the table", 3, []),
                item("cw-habits-2", "quiz", "Take the week 2 quiz", 4, []),
            ],
        },
        {
            id: "cw-habits-3",
            courseId: "course-habits",
            week: 3,
            theme: "Screens, work and rest",
            chapters: "Chapters 5–6",
            discussionQuestions: [
                "What does each of us reach for when we are bored?",
                "What would a good Saturday look like with no screens until lunch?",
                "Which of our habits would we be sad to pass on to our own children?",
            ],
            familyActivity: "A screen-free Saturday morning: bikes to Lloyd Park, then jollof at home.",
            quiz: [
                { q: "The book treats rest as…", options: ["a reward for finishing work", "a practice we plan for", "a luxury", "something only adults need"], answer: 1 },
                { q: "What does the author say about boredom in children?", options: ["It should be filled quickly", "It is where imagination starts", "It is a discipline problem", "It means they need more lessons"], answer: 1 },
                { q: "A household 'rule of life' is…", options: ["a punishment chart", "an agreed pattern the family keeps on purpose", "a list of banned things", "a chore rota"], answer: 1 },
                { q: "Which is a screen habit he recommends?", options: ["A charging place outside bedrooms", "One hour before bed", "Screens only at weekends", "No screens at all, ever"], answer: 0 },
                { q: "Why does he link work and rest in one chapter?", options: ["They both take time", "Neither means much without the other", "Both happen at home", "They are both in the Bible"], answer: 1 },
            ],
            items: [
                item("cw-habits-3", "read", "Read chapters 5–6", 1),
                item("cw-habits-3", "discuss", "Three questions after dinner", 2),
                item("cw-habits-3", "activity", "Screen-free Saturday morning", 3),
                item("cw-habits-3", "quiz", "Take the week 3 quiz", 4),
            ],
        },
        {
            id: "cw-habits-4",
            courseId: "course-habits",
            week: 4,
            theme: "Bedtime: blessing and forgiveness",
            chapters: "Chapters 7–8 and the conclusion",
            discussionQuestions: [
                "What do we want the last words of the day to be in this house?",
                "How do we say sorry here — and how quickly?",
                "Which one habit from these four weeks are we keeping?",
            ],
            familyActivity: "Write a bedtime blessing for each child in their own words, and use it tonight.",
            quiz: [
                { q: "A bedtime blessing, in the book, is…", options: ["a prayer the child says", "words a parent speaks over a child", "a bedtime story", "a goodnight routine chart"], answer: 1 },
                { q: "Why does he end with forgiveness?", options: ["Because days end badly sometimes", "Because it is the last chapter", "Because children argue", "Because it is easiest at night"], answer: 0 },
                { q: "The conclusion asks families to…", options: ["do all the habits at once", "choose a few and keep them for years", "read the book again", "teach the habits to others first"], answer: 1 },
                { q: "What does the author say about failure in a habit?", options: ["Start again the next day", "Change the habit", "Lower the standard", "Wait for a new year"], answer: 0 },
                { q: "Which habit are we choosing to keep?", options: ["Our morning sentence", "The open chair at the table", "Screen-free Saturday morning", "Whichever we decide together"], answer: 3, why: "The book's own answer: the family decides, out loud, together." },
            ],
            items: [
                item("cw-habits-4", "read", "Read chapters 7–8 and the conclusion", 1),
                item("cw-habits-4", "discuss", "Three questions at bedtime", 2),
                item("cw-habits-4", "activity", "Write a blessing for each child", 3),
                item("cw-habits-4", "quiz", "Take the week 4 quiz", 4),
            ],
        },
        {
            id: "cw-hurry-1",
            courseId: "course-hurry",
            week: 1,
            theme: "The problem of hurry",
            chapters: "Prologue and part 1",
            discussionQuestions: ["Where does hurry show up in our week?", "What did we say yes to that we should not have?"],
            familyActivity: "Write down every commitment in the next fortnight and cross one off together.",
            quiz: [],
            items: [item("cw-hurry-1", "read", "Listen to part 1 (about 55 minutes)", 1), item("cw-hurry-1", "discuss", "Two questions on Thursday", 2)],
        },
        // Weeks 2-4 of the draft are deliberately blank: this is what "edit it
        // before you publish it" looks like on the screen.
        {
            id: "cw-hurry-2",
            courseId: "course-hurry",
            week: 2,
            theme: "",
            chapters: "Part 2",
            discussionQuestions: ["", "", ""],
            familyActivity: "",
            quiz: [],
            items: [item("cw-hurry-2", "read", "Listen to part 2", 1), item("cw-hurry-2", "discuss", "Talk it through on Thursday", 2)],
        },
        {
            id: "cw-hurry-3",
            courseId: "course-hurry",
            week: 3,
            theme: "",
            chapters: "Part 3",
            discussionQuestions: ["", "", ""],
            familyActivity: "",
            quiz: [],
            items: [item("cw-hurry-3", "read", "Listen to part 3", 1), item("cw-hurry-3", "discuss", "Talk it through on Thursday", 2)],
        },
        {
            id: "cw-hurry-4",
            courseId: "course-hurry",
            week: 4,
            theme: "",
            chapters: "Part 4 and the epilogue",
            discussionQuestions: ["", "", ""],
            familyActivity: "",
            quiz: [],
            items: [item("cw-hurry-4", "read", "Listen to part 4", 1), item("cw-hurry-4", "discuss", "Decide what we are changing", 2)],
        },
    ];

    const attempts: QuizAttempt[] = [
        {
            id: "att-dami-w1",
            courseId: "course-habits",
            courseWeekId: "cw-habits-1",
            memberId: dami.id,
            answers: [0, 1, 1, 0, 1],
            score: 4,
            total: 5,
            attemptedAt: at(-12, "19:40"),
        },
        {
            id: "att-tobi-w1",
            courseId: "course-habits",
            courseWeekId: "cw-habits-1",
            memberId: tobi.id,
            answers: [0, 1, 2, 0, 2],
            score: 3,
            total: 5,
            attemptedAt: at(-11, "17:05"),
        },
    ];

    return { books, progress, plans, courses, weeks, attempts, units: [], yearGoal: 12, goalReading: [] };
}
