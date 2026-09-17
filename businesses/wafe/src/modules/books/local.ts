import type { RepoContext } from "@/data/core";
import { seedContext } from "@/data/coreSeed";
import { uid } from "@/lib/format";
import { canSeeBook, markQuiz, pctFromPage, visibleTo, weeksOf } from "./derive";
import { seed } from "./seed";
import type { Book, BooksRepo, BooksState, Course, CourseItem, CourseItemType, CourseUnit, CourseWeek, NewBook, NewCourse, NewPlan, QuizAttempt, ReadingPlan } from "./types";

/**
 * The demo shelf, persisted in this browser.
 *
 * Every write is real and lands in localStorage, so a visitor can add a book,
 * move a bookmark, generate a course, edit it, publish it, enrol a child, sit
 * the quiz and export the whole thing to Curricula — and still have it there
 * after a reload. The permission checks are the same ones the live policies
 * enforce, so "Not allowed" means the same thing in both modes: a guest cannot
 * write at all, and a child can only move their own bookmark and tick their
 * own boxes.
 */

const KEY = "wafe:demo:books:v2";

function isState(v: unknown): v is BooksState {
    if (!v || typeof v !== "object") return false;
    const s = v as Partial<BooksState>;
    return Array.isArray(s.books) && Array.isArray(s.courses) && Array.isArray(s.weeks);
}

const now = (): string => new Date().toISOString();

/**
 * Demo storage written before the goal picker existed carries invented goal
 * ids ("goal-unhurried"), which point at nothing. Rewrite them to the goals
 * the seed always meant, so a browser that has already opened the demo gets
 * the same real links a fresh one does.
 */
const STALE_GOAL_IDS: Record<string, { id: string; label: string }> = {
    "goal-unhurried": { id: "goal-3", label: "Read four books together this year" },
    "goal-gcse": { id: "goal-1", label: "Prepare the children for the new school year" },
};

function migrateGoalLinks(s: BooksState): BooksState {
    const stale = (id: string | undefined): boolean => Boolean(id && id in STALE_GOAL_IDS);
    if (!s.books.some((b) => stale(b.goalId)) && !s.plans.some((p) => stale(p.goalId))) return s;
    return {
        ...s,
        books: s.books.map((b) => (stale(b.goalId) ? { ...b, goalId: STALE_GOAL_IDS[b.goalId!].id, goalLabel: STALE_GOAL_IDS[b.goalId!].label } : b)),
        plans: s.plans.map((p) => (stale(p.goalId) ? { ...p, goalId: STALE_GOAL_IDS[p.goalId!].id } : p)),
    };
}

const DEFAULT_ITEMS: Array<{ type: CourseItemType; title: string }> = [
    { type: "read", title: "Read this week's chapters" },
    { type: "discuss", title: "Talk through the three questions" },
    { type: "activity", title: "Do the family activity" },
    { type: "quiz", title: "Take the quiz" },
];

export class LocalBooksRepo implements BooksRepo {
    private cache: BooksState | null = null;

    constructor(private ctx: RepoContext) {}

    // -- storage -------------------------------------------------------------

    private all(): BooksState {
        if (this.cache) return this.cache;
        try {
            const raw = localStorage.getItem(KEY);
            const parsed: unknown = raw ? JSON.parse(raw) : null;
            if (isState(parsed)) {
                const migrated = migrateGoalLinks(parsed);
                if (migrated !== parsed) {
                    this.save(migrated);
                    return migrated;
                }
                this.cache = parsed;
                return parsed;
            }
        } catch {
            /* a stale or foreign blob must never break the demo */
        }
        const fresh = seed(seedContext(this.ctx.space, this.ctx.members, this.ctx.today));
        this.save(fresh);
        return fresh;
    }

    private save(s: BooksState): void {
        this.cache = s;
        try {
            localStorage.setItem(KEY, JSON.stringify(s));
        } catch {
            /* private browsing: the session still works, it just won't persist */
        }
    }

    private write(fn: (s: BooksState) => void): void {
        const s = { ...this.all() };
        fn(s);
        this.save(s);
    }

    // -- permissions ---------------------------------------------------------

    private deny(): never {
        throw new Error("Not allowed");
    }

    /** Parents run this module. */
    private manage(): void {
        if (!this.ctx.can("books.manage")) this.deny();
    }

    /** A guest is read-only here, full stop. */
    private notGuest(): void {
        if (this.ctx.role === "guest") this.deny();
    }

    /** A plan can only be given to the household: a guest gets no plans, no progress and no shelf. */
    private household(ids: string[]): string[] {
        const inHouse = new Set(this.ctx.members.filter((m) => m.role !== "guest").map((m) => m.id));
        const kept = ids.filter((id) => inHouse.has(id));
        if (!kept.length) throw new Error("A reading plan needs someone in the house doing the reading.");
        return kept;
    }

    private mustSee(book: Book | undefined): Book {
        if (!book || !canSeeBook(book, this.ctx.me)) throw new Error("Not allowed");
        return book;
    }

    // -- load ----------------------------------------------------------------

    async load(): Promise<BooksState> {
        return visibleTo(this.all(), this.ctx);
    }

    // -- books ---------------------------------------------------------------

    async addBook(input: NewBook): Promise<Book> {
        this.manage();
        const book: Book = {
            id: uid("book"),
            spaceId: this.ctx.space.id,
            title: input.title.trim(),
            author: input.author.trim(),
            format: input.format,
            coverUrl: input.coverUrl,
            ownerMemberId: input.ownerMemberId,
            status: input.status,
            pages: Math.max(0, Math.round(input.pages)),
            rating: 0,
            notes: input.notes?.trim() ?? "",
            tags: input.tags ?? [],
            visibility: input.visibility,
            sharedWith: input.sharedWith ?? [],
            value: input.value,
            goalId: input.goalId,
            goalLabel: input.goalLabel,
            startedAt: input.status === "reading" ? this.ctx.today : null,
            finishedAt: input.status === "done" ? this.ctx.today : null,
            createdAt: now(),
        };
        this.write((s) => {
            s.books = [book, ...s.books];
        });
        return book;
    }

    async updateBook(id: string, patch: Partial<Omit<Book, "id" | "spaceId" | "createdAt">>): Promise<void> {
        this.notGuest();
        const book = this.mustSee(this.all().books.find((b) => b.id === id));
        const mine = book.ownerMemberId === this.ctx.me.id;
        if (!this.ctx.can("books.manage")) {
            // A child may rate and annotate their own book, and mark it finished — nothing else.
            const allowed = new Set(["rating", "notes", "status", "finishedAt"]);
            if (!mine || Object.keys(patch).some((k) => !allowed.has(k))) this.deny();
        }
        this.write((s) => {
            s.books = s.books.map((b) => {
                if (b.id !== id) return b;
                const next = { ...b, ...patch };
                if (patch.status === "done" && !next.finishedAt) next.finishedAt = this.ctx.today;
                if (patch.status === "reading" && !next.startedAt) next.startedAt = this.ctx.today;
                if (patch.status && patch.status !== "done") next.finishedAt = null;
                return next;
            });
        });
    }

    async removeBook(id: string): Promise<void> {
        this.manage();
        this.write((s) => {
            const courseIds = new Set(s.courses.filter((c) => c.bookId === id).map((c) => c.id));
            const weekIds = new Set(s.weeks.filter((w) => courseIds.has(w.courseId)).map((w) => w.id));
            s.books = s.books.filter((b) => b.id !== id);
            s.progress = s.progress.filter((p) => p.bookId !== id);
            s.plans = s.plans.filter((p) => p.bookId !== id);
            s.courses = s.courses.filter((c) => !courseIds.has(c.id));
            s.weeks = s.weeks.filter((w) => !weekIds.has(w.id));
            s.attempts = s.attempts.filter((a) => !weekIds.has(a.courseWeekId));
            s.units = s.units.filter((u) => !courseIds.has(u.courseId));
        });
    }

    async setProgress(bookId: string, memberId: string, page: number | null, pctIn: number): Promise<void> {
        this.notGuest();
        const book = this.mustSee(this.all().books.find((b) => b.id === bookId));
        if (!this.ctx.can("books.manage") && memberId !== this.ctx.me.id) this.deny();
        const pct = page != null && book.pages > 0 ? pctFromPage(page, book.pages) : Math.max(0, Math.min(100, Math.round(pctIn)));
        this.write((s) => {
            const at = now();
            const found = s.progress.some((p) => p.bookId === bookId && p.memberId === memberId);
            s.progress = found
                ? s.progress.map((p) => (p.bookId === bookId && p.memberId === memberId ? { ...p, page, pct, updatedAt: at } : p))
                : [...s.progress, { bookId, memberId, page, pct, updatedAt: at }];
            // Moving the bookmark for the first time starts the book; reaching the end finishes it.
            s.books = s.books.map((b) => {
                if (b.id !== bookId) return b;
                if (pct >= 100) return { ...b, status: "done", finishedAt: b.finishedAt ?? this.ctx.today };
                if (b.status === "want") return { ...b, status: "reading", startedAt: b.startedAt ?? this.ctx.today };
                return b;
            });
        });
    }

    // -- plans ---------------------------------------------------------------

    async addPlan(input: NewPlan): Promise<ReadingPlan> {
        this.manage();
        const plan: ReadingPlan = {
            id: uid("plan"),
            spaceId: this.ctx.space.id,
            bookId: input.bookId,
            pace: { unit: input.pace.unit, amount: Math.max(1, Math.round(input.pace.amount)), daysPerWeek: Math.max(1, Math.min(7, Math.round(input.pace.daysPerWeek))) },
            assigneeMemberIds: this.household(input.assigneeMemberIds),
            startDate: input.startDate,
            endDate: input.endDate,
            goalId: input.goalId,
            createdAt: now(),
        };
        this.write((s) => {
            s.plans = [...s.plans, plan];
        });
        return plan;
    }

    async updatePlan(id: string, patch: Partial<Omit<ReadingPlan, "id" | "spaceId" | "createdAt">>): Promise<void> {
        this.manage();
        const next = patch.assigneeMemberIds ? { ...patch, assigneeMemberIds: this.household(patch.assigneeMemberIds) } : patch;
        this.write((s) => {
            s.plans = s.plans.map((p) => (p.id === id ? { ...p, ...next } : p));
        });
    }

    async removePlan(id: string): Promise<void> {
        this.manage();
        this.write((s) => {
            s.plans = s.plans.filter((p) => p.id !== id);
        });
    }

    // -- courses -------------------------------------------------------------

    async createCourse(input: NewCourse): Promise<Course> {
        this.manage();
        const id = uid("course");
        const course: Course = {
            id,
            spaceId: this.ctx.space.id,
            bookId: input.bookId,
            title: input.title.trim(),
            weeks: input.weeks.length,
            status: "draft",
            generatedBy: this.ctx.me.id,
            model: input.model,
            costCents: 0,
            sharedWithGuestIds: [],
            childSafe: input.childSafe,
            audience: input.audience,
            enrolled: [],
            unitId: null,
            createdAt: now(),
        };
        const weeks: CourseWeek[] = input.weeks.map((w, i) => {
            const weekId = uid("cw");
            const items = (w.items?.length ? w.items : DEFAULT_ITEMS).map((it, n) => ({
                id: uid("ci"),
                courseWeekId: weekId,
                type: it.type,
                title: it.title,
                order: n + 1,
                doneBy: [],
            }));
            return {
                id: weekId,
                courseId: id,
                week: w.week || i + 1,
                theme: w.theme,
                chapters: w.chapters,
                discussionQuestions: w.discussionQuestions,
                familyActivity: w.familyActivity,
                quiz: w.quiz,
                items,
            };
        });
        this.write((s) => {
            s.courses = [...s.courses, course];
            s.weeks = [...s.weeks, ...weeks];
        });
        return course;
    }

    async updateCourse(id: string, patch: Partial<Pick<Course, "title" | "audience" | "childSafe" | "status" | "sharedWithGuestIds">>): Promise<void> {
        this.manage();
        this.write((s) => {
            s.courses = s.courses.map((c) => {
                if (c.id !== id) return c;
                const next = { ...c, ...patch };
                // A course that stops being child-safe cannot keep a child enrolled.
                if (patch.childSafe === false) next.enrolled = next.enrolled.filter((m) => this.ctx.members.find((x) => x.id === m)?.role !== "child");
                return next;
            });
        });
    }

    async removeCourse(id: string): Promise<void> {
        this.manage();
        this.write((s) => {
            const weekIds = new Set(s.weeks.filter((w) => w.courseId === id).map((w) => w.id));
            s.courses = s.courses.filter((c) => c.id !== id);
            s.weeks = s.weeks.filter((w) => w.courseId !== id);
            s.attempts = s.attempts.filter((a) => !weekIds.has(a.courseWeekId));
            s.units = s.units.filter((u) => u.courseId !== id);
        });
    }

    async publishCourse(id: string): Promise<void> {
        this.manage();
        const weeks = weeksOf(this.all(), id);
        if (!weeks.length) throw new Error("A course needs at least one week before you can publish it.");
        this.write((s) => {
            s.courses = s.courses.map((c) => (c.id === id ? { ...c, status: "published", weeks: weeks.length } : c));
        });
    }

    async enrol(courseId: string, memberId: string): Promise<void> {
        this.manage();
        const course = this.all().courses.find((c) => c.id === courseId);
        if (!course) throw new Error("Not allowed");
        const member = this.ctx.members.find((m) => m.id === memberId);
        if (!member) throw new Error("Not allowed");
        if (course.status !== "published") throw new Error("Publish the course before enrolling anyone.");
        if (member.role === "child" && !course.childSafe) throw new Error("Mark this course child-safe before enrolling a child.");
        if (member.role === "guest") throw new Error("Guests are given a course to read, not enrolled — use Share instead.");
        this.write((s) => {
            s.courses = s.courses.map((c) => (c.id === courseId && !c.enrolled.includes(memberId) ? { ...c, enrolled: [...c.enrolled, memberId] } : c));
        });
    }

    async unenrol(courseId: string, memberId: string): Promise<void> {
        this.manage();
        this.write((s) => {
            s.courses = s.courses.map((c) => (c.id === courseId ? { ...c, enrolled: c.enrolled.filter((m) => m !== memberId) } : c));
        });
    }

    async shareCourse(courseId: string, guestIds: string[]): Promise<void> {
        this.manage();
        const guests = new Set(this.ctx.members.filter((m) => m.role === "guest").map((m) => m.id));
        const clean = guestIds.filter((id) => guests.has(id));
        this.write((s) => {
            s.courses = s.courses.map((c) => (c.id === courseId ? { ...c, sharedWithGuestIds: clean } : c));
        });
    }

    // -- weeks and items -----------------------------------------------------

    async addWeek(courseId: string): Promise<CourseWeek> {
        this.manage();
        const existing = weeksOf(this.all(), courseId);
        const weekId = uid("cw");
        const week: CourseWeek = {
            id: weekId,
            courseId,
            week: existing.length + 1,
            theme: "",
            chapters: "",
            discussionQuestions: ["", "", ""],
            familyActivity: "",
            quiz: [],
            items: DEFAULT_ITEMS.map((it, n) => ({ id: uid("ci"), courseWeekId: weekId, type: it.type, title: it.title, order: n + 1, doneBy: [] })),
        };
        this.write((s) => {
            s.weeks = [...s.weeks, week];
            s.courses = s.courses.map((c) => (c.id === courseId ? { ...c, weeks: existing.length + 1 } : c));
        });
        return week;
    }

    async updateWeek(id: string, patch: Partial<Pick<CourseWeek, "theme" | "chapters" | "discussionQuestions" | "familyActivity" | "quiz">>): Promise<void> {
        this.manage();
        this.write((s) => {
            s.weeks = s.weeks.map((w) => (w.id === id ? { ...w, ...patch } : w));
        });
    }

    async removeWeek(id: string): Promise<void> {
        this.manage();
        this.write((s) => {
            const week = s.weeks.find((w) => w.id === id);
            s.weeks = s.weeks.filter((w) => w.id !== id).map((w) => (week && w.courseId === week.courseId && w.week > week.week ? { ...w, week: w.week - 1 } : w));
            s.attempts = s.attempts.filter((a) => a.courseWeekId !== id);
            if (week) s.courses = s.courses.map((c) => (c.id === week.courseId ? { ...c, weeks: s.weeks.filter((w) => w.courseId === c.id).length } : c));
        });
    }

    async addItem(weekId: string, type: CourseItemType, title: string): Promise<CourseItem> {
        this.manage();
        const week = this.all().weeks.find((w) => w.id === weekId);
        const item: CourseItem = { id: uid("ci"), courseWeekId: weekId, type, title: title.trim(), order: (week?.items.length ?? 0) + 1, doneBy: [] };
        this.write((s) => {
            s.weeks = s.weeks.map((w) => (w.id === weekId ? { ...w, items: [...w.items, item] } : w));
        });
        return item;
    }

    async updateItem(id: string, patch: Partial<Pick<CourseItem, "title" | "type">>): Promise<void> {
        this.manage();
        this.write((s) => {
            s.weeks = s.weeks.map((w) => ({ ...w, items: w.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
        });
    }

    async removeItem(id: string): Promise<void> {
        this.manage();
        this.write((s) => {
            s.weeks = s.weeks.map((w) => ({ ...w, items: w.items.filter((i) => i.id !== id).map((i, n) => ({ ...i, order: n + 1 })) }));
        });
    }

    async toggleItem(itemId: string, memberId: string, done: boolean): Promise<void> {
        this.notGuest();
        if (!this.ctx.can("books.manage") && memberId !== this.ctx.me.id) this.deny();
        this.write((s) => {
            s.weeks = s.weeks.map((w) => ({
                ...w,
                items: w.items.map((i) => {
                    if (i.id !== itemId) return i;
                    const set = new Set(i.doneBy);
                    if (done) set.add(memberId);
                    else set.delete(memberId);
                    return { ...i, doneBy: [...set] };
                }),
            }));
        });
    }

    // -- quiz ----------------------------------------------------------------

    async recordAttempt(courseWeekId: string, memberId: string, answers: number[]): Promise<QuizAttempt> {
        this.notGuest();
        if (!this.ctx.can("books.manage") && memberId !== this.ctx.me.id) this.deny();
        const week = this.all().weeks.find((w) => w.id === courseWeekId);
        if (!week) throw new Error("That week is gone.");
        const attempt: QuizAttempt = {
            id: uid("att"),
            courseId: week.courseId,
            courseWeekId,
            memberId,
            answers,
            score: markQuiz(week, answers),
            total: week.quiz.length,
            attemptedAt: now(),
        };
        this.write((s) => {
            s.attempts = [...s.attempts, attempt];
            // Sitting the quiz ticks the quiz item off for that member.
            s.weeks = s.weeks.map((w) =>
                w.id !== courseWeekId
                    ? w
                    : { ...w, items: w.items.map((i) => (i.type === "quiz" && !i.doneBy.includes(memberId) ? { ...i, doneBy: [...i.doneBy, memberId] } : i)) },
            );
        });
        return attempt;
    }

    // -- export --------------------------------------------------------------

    async exportToCurricula(courseId: string): Promise<CourseUnit> {
        this.manage();
        const s0 = this.all();
        const course = s0.courses.find((c) => c.id === courseId);
        if (!course) throw new Error("That course is gone.");
        const book = s0.books.find((b) => b.id === course.bookId);
        const weeks = weeksOf(s0, courseId);
        const unit: CourseUnit = {
            id: uid("unit"),
            courseId,
            bookId: course.bookId,
            title: course.title,
            subject: book ? `Reading · ${book.author}` : "Reading",
            weeks: weeks.length,
            memberIds: course.enrolled,
            assignments: weeks.map((w) => ({
                id: uid("asn"),
                week: w.week,
                title: `Week ${w.week}: ${w.theme || w.chapters || "Reading"}`,
                href: `/grow/books/${course.bookId}/course?c=${courseId}&w=${w.week}`,
            })),
            createdAt: now(),
        };
        this.write((s) => {
            s.units = [...s.units.filter((u) => u.courseId !== courseId), unit];
            s.courses = s.courses.map((c) => (c.id === courseId ? { ...c, unitId: unit.id } : c));
        });
        return unit;
    }

    async setYearGoal(n: number): Promise<void> {
        this.manage();
        this.write((s) => {
            s.yearGoal = Math.max(0, Math.round(n));
        });
    }
}
