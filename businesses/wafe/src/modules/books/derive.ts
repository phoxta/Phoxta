import type { AgendaItem, AttentionItem, ChildCard, DashboardContribution, Member, Nudge, ProgressRing, RepoContext } from "@/data/core";
import { clamp, isoDate, pct as pctOf } from "@/lib/format";
import type { Book, BooksState, Course, CourseWeek, GoalReading, ReadingPlan, ReadingProgress } from "./types";

/**
 * Every number this module shows, as pure functions of state — and, first of
 * all, the one function both repos use to decide what a member is allowed to
 * receive. Filtering here rather than in the screens is what makes the demo
 * honest: a child's `load()` genuinely does not contain her mother's private
 * reading, and a mentor guest's genuinely contains one course and nothing else.
 */

const BASE = "/grow/books";

// ---------------------------------------------------------------------------
// Visibility
// ---------------------------------------------------------------------------

/** Core visibility semantics, applied to a book. Children never get "family". */
export function canSeeBook(b: Book, me: Member): boolean {
    if (b.ownerMemberId && b.ownerMemberId === me.id) return true;
    switch (b.visibility) {
        case "private":
            return b.ownerMemberId === me.id;
        case "shared":
            return b.sharedWith.includes(me.id);
        case "family":
            return me.role !== "child";
        case "child":
        default:
            return true;
    }
}

/**
 * What a guest may know about the book behind a course shared with them.
 *
 * Enough to recognise the book — title, author, format, cover — and nothing
 * the family wrote around it. The note ("the chapter on bedtime blessings
 * changed our evenings"), the rating, the tags, the goal it feeds, who else it
 * is shared with and the dates it was read are the household's, not the
 * mentor's, and a course does not buy access to them.
 */
function guestBookView(b: Book): Book {
    return { ...b, rating: 0, notes: "", tags: [], sharedWith: [], goalId: undefined, goalLabel: undefined, startedAt: null, finishedAt: null };
}

/** A child is told about goals by the Goals module, in its child-safe words — never by a goal title carried on a book. */
const childBookView = (b: Book): Book => (b.goalId || b.goalLabel ? { ...b, goalId: undefined, goalLabel: undefined } : b);

/**
 * The slice this member may receive.
 *
 * Guests are the sharp edge of the module: a mentor sees the published courses
 * explicitly shared with them, a redacted view of the book each course is
 * built on (a course without its book is not readable), and nothing else — no
 * shelf, no plans, no progress, no attempts. Guests are also strictly
 * READ-ONLY here; the repos refuse every write from a guest, so the module
 * matches the brief's read-only guest tier rather than quietly widening it.
 */
export function visibleTo(state: BooksState, ctx: RepoContext): BooksState {
    const me = ctx.me;

    if (me.role === "guest") {
        const courses = state.courses.filter((c) => c.status === "published" && c.sharedWithGuestIds.includes(me.id));
        const courseIds = new Set(courses.map((c) => c.id));
        const bookIds = new Set(courses.map((c) => c.bookId));
        return {
            books: state.books.filter((b) => bookIds.has(b.id)).map(guestBookView),
            progress: [],
            plans: [],
            courses,
            weeks: state.weeks.filter((w) => courseIds.has(w.courseId)),
            attempts: [],
            units: [],
            yearGoal: state.yearGoal,
            goalReading: [],
        };
    }

    const child = me.role === "child";
    const books = state.books.filter((b) => canSeeBook(b, me)).map((b) => (child ? childBookView(b) : b));
    const bookIds = new Set(books.map((b) => b.id));

    const parent = me.role === "parent";
    const courses = state.courses.filter((c) => {
        if (!bookIds.has(c.bookId)) return false;
        if (parent) return true;
        return c.status === "published" && c.enrolled.includes(me.id);
    });
    const courseIds = new Set(courses.map((c) => c.id));

    const filtered: BooksState = {
        books,
        progress: state.progress.filter((p) => bookIds.has(p.bookId)),
        plans: state.plans.filter((p) => bookIds.has(p.bookId) && (parent || p.assigneeMemberIds.includes(me.id))),
        courses,
        weeks: state.weeks.filter((w) => courseIds.has(w.courseId)),
        attempts: state.attempts.filter((a) => courseIds.has(a.courseId) && (parent || a.memberId === me.id)),
        units: parent ? state.units : [],
        yearGoal: state.yearGoal,
        goalReading: [],
    };
    filtered.goalReading = goalReading(filtered);
    return filtered;
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

export const bookById = (state: BooksState, id: string): Book | undefined => state.books.find((b) => b.id === id);

export const progressFor = (state: BooksState, bookId: string, memberId: string): ReadingProgress | undefined =>
    state.progress.find((p) => p.bookId === bookId && p.memberId === memberId);

/** Everyone with progress in this book, furthest along first. */
export const readersOf = (state: BooksState, bookId: string): ReadingProgress[] =>
    state.progress.filter((p) => p.bookId === bookId).sort((a, b) => b.pct - a.pct);

/** The percentage to show on a book card: mine if I have any, else the furthest reader. */
export function bookPct(state: BooksState, book: Book, memberId: string): number {
    if (book.status === "done") return 100;
    const mine = progressFor(state, book.id, memberId);
    if (mine) return clamp(Math.round(mine.pct), 0, 100);
    const best = readersOf(state, book.id)[0];
    return best ? clamp(Math.round(best.pct), 0, 100) : 0;
}

/** Page → percentage, guarding a book with no page count (and audiobooks in minutes). */
export const pctFromPage = (page: number, pages: number): number => (pages > 0 ? clamp(Math.round((page / pages) * 100), 0, 100) : 0);

export const unitWord = (b: Book): string => (b.format === "audio" ? "min" : "pages");

export const finishedThisYear = (state: BooksState, today: string): Book[] => {
    const year = today.slice(0, 4);
    return state.books.filter((b) => b.status === "done" && (b.finishedAt ?? "").slice(0, 4) === year);
};

// ---------------------------------------------------------------------------
// Reading plans
// ---------------------------------------------------------------------------

/** Which weekdays a "N days a week" pace lands on (0 = Sunday). */
const PLAN_DAYS: Record<number, number[]> = {
    1: [0],
    2: [2, 6],
    3: [1, 3, 5],
    4: [1, 2, 4, 5],
    5: [1, 2, 3, 4, 5],
    6: [1, 2, 3, 4, 5, 6],
    7: [0, 1, 2, 3, 4, 5, 6],
};

export function isPlanDay(plan: ReadingPlan, dateIso: string): boolean {
    const days = PLAN_DAYS[clamp(Math.round(plan.pace.daysPerWeek), 1, 7)] ?? PLAN_DAYS[7];
    return days.includes(new Date(`${dateIso}T00:00:00`).getDay());
}

function scheduledDaysBetween(plan: ReadingPlan, fromIso: string, toIso: string): number {
    const from = new Date(`${fromIso}T00:00:00`);
    const to = new Date(`${toIso}T00:00:00`);
    let n = 0;
    for (const d = new Date(from); d < to; d.setDate(d.getDate() + 1)) {
        if (isPlanDay(plan, isoDate(d))) n += 1;
        if (n > 3650) break;
    }
    return n;
}

export interface PlanStatus {
    plan: ReadingPlan;
    book: Book | undefined;
    memberId: string;
    /** Where the schedule says they should be (pages, or minutes for audio). */
    expected: number;
    actual: number;
    /** Positive = behind by this many pages/minutes. */
    behind: number;
    behindDays: number;
    dueToday: boolean;
    doneToday: boolean;
    pct: number;
    active: boolean;
}

export function planStatus(state: BooksState, plan: ReadingPlan, memberId: string, today: string): PlanStatus {
    const book = bookById(state, plan.bookId);
    const total = book?.pages ?? 0;
    const p = progressFor(state, plan.bookId, memberId);
    const actual = p?.page ?? (total ? Math.round(((p?.pct ?? 0) / 100) * total) : 0);
    const scheduled = scheduledDaysBetween(plan, plan.startDate, today);
    const expected = total ? Math.min(total, scheduled * plan.pace.amount) : scheduled * plan.pace.amount;
    const behind = Math.max(0, expected - actual);
    const active = today >= plan.startDate && today <= plan.endDate && (book?.status ?? "reading") !== "done";
    return {
        plan,
        book,
        memberId,
        expected,
        actual,
        behind,
        behindDays: plan.pace.amount > 0 ? Math.floor(behind / plan.pace.amount) : 0,
        dueToday: active && isPlanDay(plan, today),
        doneToday: (p?.updatedAt ?? "").slice(0, 10) === today,
        pct: total ? pctFromPage(actual, total) : 0,
        active,
    };
}

/** Every plan row a member should see today, one per assignee. */
export function planRows(state: BooksState, ctx: RepoContext): PlanStatus[] {
    const rows: PlanStatus[] = [];
    for (const plan of state.plans) {
        const who = ctx.role === "parent" ? plan.assigneeMemberIds : plan.assigneeMemberIds.filter((id) => id === ctx.me.id);
        for (const memberId of who) rows.push(planStatus(state, plan, memberId, ctx.today));
    }
    return rows;
}

// ---------------------------------------------------------------------------
// Courses
// ---------------------------------------------------------------------------

export const courseById = (state: BooksState, id: string): Course | undefined => state.courses.find((c) => c.id === id);

export const weeksOf = (state: BooksState, courseId: string): CourseWeek[] => state.weeks.filter((w) => w.courseId === courseId).sort((a, b) => a.week - b.week);

export const coursesForBook = (state: BooksState, bookId: string): Course[] => state.courses.filter((c) => c.bookId === bookId);

/** A week is done for a member when they have ticked every item on it. */
export function weekDoneFor(week: CourseWeek, memberId: string): boolean {
    if (!week.items.length) return false;
    return week.items.every((i) => i.doneBy.includes(memberId));
}

/**
 * Whose ticks a screen should read when it shows a week.
 *
 * Mine when I am enrolled. Otherwise mine AND the class's — never the class's
 * instead of mine: a parent who is not enrolled reads the same week with the
 * children, ticks the same boxes, and the header has to agree with the boxes
 * in front of them. Leaving `memberId` out here is what made a week say
 * "0/4 done" under four ticked checkboxes.
 */
export function weekViewers(course: Course, memberId: string): string[] {
    if (course.enrolled.includes(memberId)) return [memberId];
    return [...new Set([memberId, ...course.enrolled])];
}

export const weekDoneForAny = (week: CourseWeek, memberIds: string[]): boolean => memberIds.some((m) => weekDoneFor(week, m));

export const weekPctForAny = (week: CourseWeek, memberIds: string[]): number => (memberIds.length ? Math.max(...memberIds.map((m) => weekPctFor(week, m))) : 0);

export const weekItemsDoneForAny = (week: CourseWeek, memberIds: string[]): number => week.items.filter((i) => memberIds.some((m) => i.doneBy.includes(m))).length;

/** How far along a week is for one member, 0–100. */
export const weekPctFor = (week: CourseWeek, memberId: string): number => pctOf(week.items.filter((i) => i.doneBy.includes(memberId)).length, week.items.length);

/** Weeks done / total, for one member (a parent sees the family's furthest). */
export function courseProgress(state: BooksState, course: Course, memberId: string): { done: number; total: number; pct: number; currentWeek: CourseWeek | undefined } {
    const weeks = weeksOf(state, course.id);
    const who = weekViewers(course, memberId);
    const done = weeks.filter((w) => who.some((m) => weekDoneFor(w, m))).length;
    const currentWeek = weeks.find((w) => !who.some((m) => weekDoneFor(w, m))) ?? weeks[weeks.length - 1];
    return { done, total: weeks.length, pct: pctOf(done, weeks.length), currentWeek };
}

/** The best quiz score a member has on a week, or null when they have not sat it. */
export function bestScore(state: BooksState, weekId: string, memberId: string): { score: number; total: number; attempts: number } | null {
    const mine = state.attempts.filter((a) => a.courseWeekId === weekId && a.memberId === memberId);
    if (!mine.length) return null;
    const best = mine.reduce((a, b) => (b.score > a.score ? b : a));
    return { score: best.score, total: best.total, attempts: mine.length };
}

/** Best score on a week across everyone the caller can see (the parent view). */
export function bestScoreAny(state: BooksState, weekId: string): Array<{ memberId: string; score: number; total: number; attempts: number }> {
    const byMember = new Map<string, { memberId: string; score: number; total: number; attempts: number }>();
    for (const a of state.attempts.filter((x) => x.courseWeekId === weekId)) {
        const cur = byMember.get(a.memberId);
        if (!cur) byMember.set(a.memberId, { memberId: a.memberId, score: a.score, total: a.total, attempts: 1 });
        else byMember.set(a.memberId, { memberId: a.memberId, score: Math.max(cur.score, a.score), total: a.total, attempts: cur.attempts + 1 });
    }
    return [...byMember.values()];
}

export const markQuiz = (week: CourseWeek, answers: number[]): number => week.quiz.reduce((n, q, i) => (answers[i] === q.answer ? n + 1 : n), 0);

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------

/**
 * Reading that feeds a goal.
 *
 * `goalId` is a REAL id from the Goals module — books are linked with a picker
 * over `useModuleState<GoalsState>("goals")`, never with a label that mints an
 * id of its own, because an id nothing else recognises is not a link. What a
 * linked book contributes is a percentage the Goals module can read straight
 * off our slice (`state.goalReading`) without importing our maths: group the
 * rows by `goalId` and average their `pct`. Updating a page on a linked book
 * moves those rows the moment the slice reloads.
 *
 * Children never receive these rows (see `childBookView`): a goal reaches a
 * child through the Goals module, in its child-safe words.
 */
export function goalReading(state: BooksState): GoalReading[] {
    const out: GoalReading[] = [];
    for (const b of state.books) {
        if (!b.goalId) continue;
        // The furthest reader, whoever they are: if anyone in the family moves
        // the bookmark on a goal-linked book, the goal moves.
        const best = readersOf(state, b.id)[0];
        const p = b.status === "done" ? 100 : clamp(Math.round(best?.pct ?? 0), 0, 100);
        out.push({ goalId: b.goalId, goalLabel: b.goalLabel || b.title, bookId: b.id, bookTitle: b.title, pct: p });
    }
    return out;
}

// ---------------------------------------------------------------------------
// Dashboard, nudges, grounding, search
// ---------------------------------------------------------------------------

export function dashboard(state: BooksState, ctx: RepoContext): DashboardContribution {
    const agenda: AgendaItem[] = [];
    const attention: AttentionItem[] = [];
    const rings: ProgressRing[] = [];
    const childCards: ChildCard[] = [];
    const me = ctx.me;

    if (me.role === "guest") {
        for (const c of state.courses) {
            const { done, total } = courseProgress(state, c, me.id);
            attention.push({
                id: `shared-${c.id}`,
                moduleId: "books",
                area: "grow",
                tone: "info",
                title: c.title,
                body: `${ctx.space.name} shared this course with you — week ${Math.min(done + 1, total || 1)} of ${total}. You can read it; the ticking off is theirs.`,
                href: `${BASE}/${c.bookId}/course?c=${c.id}`,
                weight: 40,
            });
        }
        return { agenda, attention, rings, childCards };
    }

    // Today's reading, from the plans.
    for (const row of planRows(state, ctx)) {
        if (!row.dueToday || !row.book) continue;
        agenda.push({
            id: `plan-${row.plan.id}-${row.memberId}`,
            moduleId: "books",
            area: "grow",
            title: `${row.book.title} — ${row.plan.pace.amount} ${row.plan.pace.unit === "minutes" ? "minutes" : row.plan.pace.unit}`,
            meta: `Reading${row.behindDays > 0 ? ` · ${row.behindDays}d behind` : ""}`,
            memberId: row.memberId,
            at: null,
            done: row.doneToday,
            href: `${BASE}/${row.book.id}`,
            sort: 640 + (row.behindDays > 0 ? -10 : 0),
        });
        if (row.behindDays >= 2) {
            attention.push({
                id: `plan-behind-${row.plan.id}-${row.memberId}`,
                moduleId: "books",
                area: "grow",
                tone: "warn",
                title: `${row.book.title} is ${row.behindDays} days behind`,
                body: `${ctx.members.find((m) => m.id === row.memberId)?.name.split(" ")[0] ?? "Someone"} is on ${row.actual} of ${row.expected} ${unitWord(row.book)}. Ten minutes catches it up.`,
                href: `${BASE}/${row.book.id}`,
                weight: 46,
            });
        }
    }

    // The course week in front of us.
    for (const c of state.courses) {
        if (c.status !== "published") continue;
        const mine = c.enrolled.includes(me.id);
        if (me.role === "child" && !mine) continue;
        const who = mine ? me.id : c.enrolled[0] ?? me.id;
        const { done, total, pct, currentWeek } = courseProgress(state, c, who);
        if (currentWeek && !weekDoneFor(currentWeek, who)) {
            const left = currentWeek.items.filter((i) => !i.doneBy.includes(who)).length;
            agenda.push({
                id: `course-${c.id}-w${currentWeek.week}`,
                moduleId: "books",
                area: "grow",
                title: `${c.title.split("—")[0].trim()} · week ${currentWeek.week}`,
                meta: `Course · ${left} thing${left === 1 ? "" : "s"} left`,
                memberId: mine ? me.id : null,
                at: null,
                done: false,
                href: `${BASE}/${c.bookId}/course?c=${c.id}`,
                sort: 660,
            });
        }
        rings.push({
            id: `course-${c.id}`,
            moduleId: "books",
            area: "grow",
            label: c.title.split("—")[0].trim(),
            pct,
            sub: `Week ${Math.min(done + 1, total || 1)} of ${total}`,
            href: `${BASE}/${c.bookId}/course?c=${c.id}`,
        });
        if (me.role === "child" && mine && currentWeek) {
            const score = bestScore(state, currentWeek.id, me.id);
            childCards.push({
                id: `course-${c.id}`,
                moduleId: "books",
                area: "grow",
                title: `Week ${currentWeek.week}: ${currentWeek.theme}`,
                body: score ? `Your best quiz score is ${score.score} out of ${score.total}.` : `${currentWeek.items.filter((i) => !i.doneBy.includes(me.id)).length} things left this week.`,
                emoji: "📚",
                href: `${BASE}/${c.bookId}/course?c=${c.id}`,
                pct: weekPctFor(currentWeek, me.id),
                done: weekDoneFor(currentWeek, me.id),
            });
        }
    }

    // Books finished this year, against the family's number.
    const finished = finishedThisYear(state, ctx.today);
    if (state.yearGoal > 0 && me.role !== "child") {
        rings.push({
            id: "year",
            moduleId: "books",
            area: "grow",
            label: "Books finished",
            pct: pctOf(finished.length, state.yearGoal),
            sub: `${finished.length} of ${state.yearGoal} this year`,
            href: BASE,
        });
    }

    // Reading that feeds a goal. The ring is the BOOK's contribution, named
    // after the book — the goal's own ring is the Goals module's to draw, and
    // two rings with one name and two numbers would only contradict each other.
    for (const g of state.goalReading) {
        rings.push({
            id: `goal-${g.goalId}-${g.bookId}`,
            moduleId: "books",
            area: "grow",
            label: g.bookTitle,
            pct: g.pct,
            sub: `Feeds "${g.goalLabel}"`,
            href: `${BASE}/${g.bookId}`,
        });
    }

    // Something to celebrate, and a draft waiting on a decision.
    for (const b of finished) {
        const days = b.finishedAt ? Math.round((new Date(`${ctx.today}T00:00:00`).getTime() - new Date(b.finishedAt).getTime()) / 86400000) : 99;
        if (days <= 7) {
            attention.push({
                id: `finished-${b.id}`,
                moduleId: "books",
                area: "grow",
                tone: "celebrate",
                title: `${ctx.members.find((m) => m.id === b.ownerMemberId)?.name.split(" ")[0] ?? "We"} finished ${b.title}`,
                body: b.rating ? `${"★".repeat(b.rating)} — worth marking on the timeline.` : "Worth marking on the timeline.",
                href: `${BASE}/${b.id}`,
                weight: 30,
            });
        }
    }
    if (me.role === "parent") {
        for (const c of state.courses.filter((x) => x.status === "draft")) {
            attention.push({
                id: `draft-${c.id}`,
                moduleId: "books",
                area: "grow",
                tone: "info",
                title: `"${c.title}" is still a draft`,
                body: "Read it through, change what you would say differently, then publish it so people can be enrolled.",
                href: `${BASE}/${c.bookId}/course?c=${c.id}`,
                weight: 26,
            });
        }
    }

    if (me.role === "child") {
        const reading = state.books.filter((b) => b.status === "reading" && (b.ownerMemberId === me.id || state.progress.some((p) => p.bookId === b.id && p.memberId === me.id)));
        for (const b of reading.slice(0, 2)) {
            const p = bookPct(state, b, me.id);
            childCards.push({
                id: `read-${b.id}`,
                moduleId: "books",
                area: "grow",
                title: b.title,
                body: `You're ${p}% through. ${b.author}.`,
                emoji: "📖",
                href: `${BASE}/${b.id}`,
                pct: p,
            });
        }
    }

    return { agenda, attention, rings, childCards };
}

export function nudges(state: BooksState, ctx: RepoContext): Nudge[] {
    if (ctx.me.role === "guest") return [];
    const out: Nudge[] = [];
    const parents = ctx.members.filter((m) => m.role === "parent").map((m) => m.id);

    for (const row of planRows(state, ctx)) {
        if (!row.book || !row.active || row.behindDays < 2) continue;
        out.push({
            key: `books-plan-behind-${row.plan.id}-${row.memberId}-${ctx.today}`,
            moduleId: "books",
            kind: "learning",
            title: `${row.book.title} is slipping`,
            body: `${ctx.members.find((m) => m.id === row.memberId)?.name.split(" ")[0] ?? "Someone"} is ${row.behindDays} days behind — ${row.behind} ${unitWord(row.book)} to catch up.`,
            href: `${BASE}/${row.book.id}`,
            memberIds: [...new Set([...parents, row.memberId])],
        });
    }

    const planningDay = new Date(`${ctx.today}T00:00:00`).getDay() === (ctx.space.planningDay % 7);
    for (const c of state.courses) {
        if (c.status !== "published") continue;
        const { currentWeek, total } = courseProgress(state, c, ctx.me.id);
        if (planningDay && currentWeek && !c.enrolled.every((m) => weekDoneFor(currentWeek, m))) {
            out.push({
                key: `books-course-week-${c.id}-w${currentWeek.week}`,
                moduleId: "books",
                kind: "learning",
                title: `Week ${currentWeek.week} of ${total}: ${currentWeek.theme}`,
                body: `${c.title.split("—")[0].trim()} — chapters ${currentWeek.chapters}. Three questions and one thing to do together.`,
                href: `${BASE}/${c.bookId}/course?c=${c.id}`,
                memberIds: [...new Set([...parents, ...c.enrolled])],
            });
        }
    }

    for (const c of state.courses.filter((x) => x.status === "draft")) {
        out.push({
            key: `books-draft-${c.id}`,
            moduleId: "books",
            kind: "learning",
            title: "A course is waiting to be published",
            body: `"${c.title}" is a draft. Nobody can be enrolled until you publish it.`,
            href: `${BASE}/${c.bookId}/course?c=${c.id}`,
            memberIds: parents,
        });
    }

    for (const b of finishedThisYear(state, ctx.today)) {
        const days = b.finishedAt ? Math.round((new Date(`${ctx.today}T00:00:00`).getTime() - new Date(b.finishedAt).getTime()) / 86400000) : 99;
        if (days <= 3) {
            out.push({
                key: `books-finished-${b.id}`,
                moduleId: "books",
                kind: "celebrate",
                title: `${ctx.members.find((m) => m.id === b.ownerMemberId)?.name.split(" ")[0] ?? "Someone"} finished a book`,
                body: `${b.title} by ${b.author}. That is one more towards ${state.yearGoal} this year.`,
                href: `${BASE}/${b.id}`,
                memberIds: parents,
            });
        }
    }

    return out;
}

export function aiContext(state: BooksState, ctx: RepoContext): string {
    if (!state.books.length && !state.courses.length) return "";
    const name = (id: string | null) => (id ? ctx.members.find((m) => m.id === id)?.name.split(" ")[0] ?? "someone" : "the family");

    if (ctx.me.role === "guest") {
        const lines = state.courses.map((c) => `"${c.title}" (${c.weeks} weeks, shared with you) — weeks: ${weeksOf(state, c.id).map((w) => `${w.week}. ${w.theme}`).join("; ")}`);
        return `Shared with this guest only: ${lines.join(" | ")}. Nothing else on the family's shelf is visible to them.`.slice(0, 1500);
    }

    const reading = state.books
        .filter((b) => b.status === "reading")
        .map((b) => `${b.title} (${b.author}) — ${name(b.ownerMemberId)}, ${bookPct(state, b, b.ownerMemberId ?? ctx.me.id)}%${b.goalLabel ? `, feeds goal "${b.goalLabel}"` : ""}`);
    const want = state.books.filter((b) => b.status === "want").map((b) => b.title);
    const done = finishedThisYear(state, ctx.today).map((b) => `${b.title}${b.rating ? ` (${b.rating}/5)` : ""}`);
    const plans = planRows(state, ctx)
        .filter((r) => r.active && r.book)
        .map((r) => `${name(r.memberId)}: ${r.book?.title} at ${r.plan.pace.amount} ${r.plan.pace.unit}/day, ${r.behindDays > 0 ? `${r.behindDays}d behind` : "on track"}`);
    const courses = state.courses.map((c) => {
        const { done: d, total } = courseProgress(state, c, ctx.me.id);
        return `"${c.title}" (${c.status}, week ${Math.min(d + 1, total || 1)}/${total}${c.enrolled.length ? `, enrolled: ${c.enrolled.map(name).join(" & ")}` : ""})`;
    });

    return [
        reading.length ? `Reading now: ${reading.join("; ")}.` : "",
        plans.length ? `Reading plans: ${plans.join("; ")}.` : "",
        done.length ? `Finished this year (${done.length}/${state.yearGoal}): ${done.join(", ")}.` : "",
        want.length ? `Want to read: ${want.join(", ")}.` : "",
        courses.length ? `Book courses: ${courses.join("; ")}.` : "",
    ]
        .filter(Boolean)
        .join(" ")
        .slice(0, 1500);
}

export function search(state: BooksState, q: string): Array<{ title: string; meta: string; href: string }> {
    const needle = q.toLowerCase();
    const hits: Array<{ title: string; meta: string; href: string }> = [];
    for (const b of state.books) {
        if (`${b.title} ${b.author} ${b.tags.join(" ")}`.toLowerCase().includes(needle)) {
            hits.push({ title: b.title, meta: `Book · ${b.author}`, href: `${BASE}/${b.id}` });
        }
    }
    for (const c of state.courses) {
        if (c.title.toLowerCase().includes(needle)) hits.push({ title: c.title, meta: `Course · ${c.weeks} weeks`, href: `${BASE}/${c.bookId}/course?c=${c.id}` });
    }
    for (const w of state.weeks) {
        if (`${w.theme} ${w.chapters}`.toLowerCase().includes(needle)) {
            const c = courseById(state, w.courseId);
            if (c) hits.push({ title: `Week ${w.week}: ${w.theme}`, meta: `Course · ${c.title.split("—")[0].trim()}`, href: `${BASE}/${c.bookId}/course?c=${c.id}` });
        }
    }
    return hits.slice(0, 8);
}
