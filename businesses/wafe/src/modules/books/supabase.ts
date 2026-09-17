import type { RepoContext, Visibility } from "@/data/core";
import { supabase } from "@/lib/supabase";
import { markQuiz, pctFromPage, visibleTo, weeksOf } from "./derive";
import type {
    Book,
    BookFormat,
    BookStatus,
    BooksRepo,
    BooksState,
    Course,
    CourseItem,
    CourseItemType,
    CourseStatus,
    CourseUnit,
    CourseWeek,
    NewBook,
    NewCourse,
    NewPlan,
    PaceUnit,
    QuizAttempt,
    QuizQuestion,
    ReadingPlan,
    ReadingProgress,
} from "./types";

/**
 * The same shelf, live, under row-level security.
 *
 * The database is the real guard — `wf_can_see` decides which books come back
 * and the course policies decide which courses a guest may read — but this
 * repo still runs the slice through the same `visibleTo()` the demo uses, so
 * the two modes cannot drift: whatever the policy lets through, the app shapes
 * identically. snake_case ↔ camelCase mapping lives in this file and nowhere
 * else.
 */

type Row = Record<string, unknown>;

const s = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);
const n = (v: unknown, d = 0): number => (typeof v === "number" ? v : Number(v ?? d) || d);
const iso = (v: unknown): string => (v ? new Date(v as string).toISOString() : new Date().toISOString());
const opt = (v: unknown): string | undefined => (typeof v === "string" && v ? v : undefined);
const nul = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const nums = (v: unknown): number[] => (Array.isArray(v) ? v.map((x) => Number(x) || 0) : []);

function fail(where: string, error: { message: string } | null | undefined): void {
    if (error) throw new Error(`${where}: ${error.message}`);
}

function quiz(v: unknown): QuizQuestion[] {
    if (!Array.isArray(v)) return [];
    return v
        .map((raw) => {
            const q = raw as Row;
            return { q: s(q.q), options: strs(q.options), answer: n(q.answer), why: opt(q.why) };
        })
        .filter((q) => q.q && q.options.length > 1);
}

const mapBook = (r: Row): Book => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    title: s(r.title),
    author: s(r.author),
    format: s(r.format, "physical") as BookFormat,
    coverUrl: opt(r.cover_url),
    ownerMemberId: nul(r.owner_member_id),
    status: s(r.status, "want") as BookStatus,
    pages: n(r.pages),
    rating: n(r.rating),
    notes: s(r.notes),
    tags: strs(r.tags),
    visibility: s(r.visibility, "family") as Visibility,
    sharedWith: strs(r.shared_with),
    value: opt(r.value_label),
    goalId: opt(r.goal_id),
    goalLabel: opt(r.goal_label),
    startedAt: nul(r.started_at),
    finishedAt: nul(r.finished_at),
    createdAt: iso(r.created_at),
});

const mapProgress = (r: Row): ReadingProgress => ({
    bookId: s(r.book_id),
    memberId: s(r.member_id),
    page: r.page == null ? null : n(r.page),
    pct: n(r.pct),
    updatedAt: iso(r.updated_at),
});

const mapPlan = (r: Row): ReadingPlan => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    bookId: s(r.book_id),
    pace: { unit: s(r.pace_unit, "pages") as PaceUnit, amount: n(r.pace_amount, 10), daysPerWeek: n(r.days_per_week, 7) },
    assigneeMemberIds: strs(r.assignee_member_ids),
    startDate: s(r.start_date),
    endDate: s(r.end_date),
    goalId: opt(r.goal_id),
    createdAt: iso(r.created_at),
});

const mapCourse = (r: Row): Course => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    bookId: s(r.book_id),
    title: s(r.title),
    weeks: n(r.weeks, 4),
    status: s(r.status, "draft") as CourseStatus,
    generatedBy: nul(r.generated_by),
    model: nul(r.model),
    costCents: n(r.cost_cents),
    sharedWithGuestIds: strs(r.shared_with_guest_ids),
    childSafe: r.child_safe === true,
    audience: s(r.audience),
    enrolled: strs(r.enrolled),
    unitId: nul(r.unit_id),
    createdAt: iso(r.created_at),
});

const mapItem = (r: Row): CourseItem => ({
    id: s(r.id),
    courseWeekId: s(r.course_week_id),
    type: s(r.type, "read") as CourseItemType,
    title: s(r.title),
    order: n(r.item_order),
    doneBy: strs(r.done_by),
});

const mapWeek = (r: Row, items: CourseItem[]): CourseWeek => ({
    id: s(r.id),
    courseId: s(r.course_id),
    week: n(r.week, 1),
    theme: s(r.theme),
    chapters: s(r.chapters),
    discussionQuestions: strs(r.discussion_questions),
    familyActivity: s(r.family_activity),
    quiz: quiz(r.quiz),
    items: items.filter((i) => i.courseWeekId === s(r.id)).sort((a, b) => a.order - b.order),
});

const mapAttempt = (r: Row): QuizAttempt => ({
    id: s(r.id),
    courseId: s(r.course_id),
    courseWeekId: s(r.course_week_id),
    memberId: s(r.member_id),
    answers: nums(r.answers),
    score: n(r.score),
    total: n(r.total),
    attemptedAt: iso(r.attempted_at),
});

const mapUnit = (r: Row): CourseUnit => {
    const raw = Array.isArray(r.assignments) ? (r.assignments as Row[]) : [];
    return {
        id: s(r.id),
        courseId: s(r.course_id),
        bookId: s(r.book_id),
        title: s(r.title),
        subject: s(r.subject),
        weeks: n(r.weeks),
        memberIds: strs(r.member_ids),
        assignments: raw.map((a) => ({ id: s(a.id), week: n(a.week), title: s(a.title), href: s(a.href) })),
        createdAt: iso(r.created_at),
    };
};

export class SupabaseBooksRepo implements BooksRepo {
    constructor(private ctx: RepoContext) {}

    private get scope() {
        return { organization_id: this.ctx.orgId, space_id: this.ctx.space.id };
    }

    private deny(): never {
        throw new Error("Not allowed");
    }

    private manage(): void {
        if (!this.ctx.can("books.manage")) this.deny();
    }

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

    async load(): Promise<BooksState> {
        const spaceId = this.ctx.space.id;
        const [books, progress, plans, courses, weeks, items, attempts, units, settings] = await Promise.all([
            supabase.from("wf_books").select("*").eq("space_id", spaceId).order("created_at", { ascending: false }),
            supabase.from("wf_reading_progress").select("*").eq("space_id", spaceId),
            supabase.from("wf_reading_plans").select("*").eq("space_id", spaceId),
            supabase.from("wf_courses").select("*").eq("space_id", spaceId),
            supabase.from("wf_course_weeks").select("*").eq("space_id", spaceId).order("week", { ascending: true }),
            supabase.from("wf_course_items").select("*").eq("space_id", spaceId).order("item_order", { ascending: true }),
            supabase.from("wf_quiz_attempts").select("*").eq("space_id", spaceId),
            supabase.from("wf_course_units").select("*").eq("space_id", spaceId),
            supabase.from("wf_book_settings").select("*").eq("space_id", spaceId).maybeSingle(),
        ]);
        fail("books", books.error);
        fail("reading progress", progress.error);
        fail("reading plans", plans.error);
        fail("courses", courses.error);
        fail("course weeks", weeks.error);
        fail("course items", items.error);
        fail("quiz attempts", attempts.error);
        fail("course units", units.error);

        const mappedItems = (items.data ?? []).map(mapItem);
        const state: BooksState = {
            books: (books.data ?? []).map(mapBook),
            progress: (progress.data ?? []).map(mapProgress),
            plans: (plans.data ?? []).map(mapPlan),
            courses: (courses.data ?? []).map(mapCourse),
            weeks: (weeks.data ?? []).map((r) => mapWeek(r, mappedItems)),
            attempts: (attempts.data ?? []).map(mapAttempt),
            units: (units.data ?? []).map(mapUnit),
            yearGoal: n((settings.data as Row | null)?.year_goal, 12),
            goalReading: [],
        };
        return visibleTo(state, this.ctx);
    }

    // -- books ---------------------------------------------------------------

    async addBook(input: NewBook): Promise<Book> {
        this.manage();
        const { data, error } = await supabase
            .from("wf_books")
            .insert({
                ...this.scope,
                title: input.title.trim(),
                author: input.author.trim(),
                format: input.format,
                cover_url: input.coverUrl ?? null,
                owner_member_id: input.ownerMemberId,
                status: input.status,
                pages: Math.max(0, Math.round(input.pages)),
                notes: input.notes ?? "",
                tags: input.tags ?? [],
                visibility: input.visibility,
                shared_with: input.sharedWith ?? [],
                value_label: input.value ?? null,
                goal_id: input.goalId ?? null,
                goal_label: input.goalLabel ?? null,
                started_at: input.status === "reading" ? this.ctx.today : null,
                finished_at: input.status === "done" ? this.ctx.today : null,
            })
            .select("*")
            .single();
        fail("add book", error);
        return mapBook(data as Row);
    }

    async updateBook(id: string, patch: Partial<Omit<Book, "id" | "spaceId" | "createdAt">>): Promise<void> {
        this.notGuest();
        const row: Row = {};
        if (patch.title !== undefined) row.title = patch.title;
        if (patch.author !== undefined) row.author = patch.author;
        if (patch.format !== undefined) row.format = patch.format;
        if (patch.coverUrl !== undefined) row.cover_url = patch.coverUrl;
        if (patch.ownerMemberId !== undefined) row.owner_member_id = patch.ownerMemberId;
        if (patch.pages !== undefined) row.pages = patch.pages;
        if (patch.rating !== undefined) row.rating = patch.rating;
        if (patch.notes !== undefined) row.notes = patch.notes;
        if (patch.tags !== undefined) row.tags = patch.tags;
        if (patch.visibility !== undefined) row.visibility = patch.visibility;
        if (patch.sharedWith !== undefined) row.shared_with = patch.sharedWith;
        if (patch.value !== undefined) row.value_label = patch.value;
        // `in`, not `!== undefined`: unlinking a goal sends the key with no
        // value, and that has to clear the column rather than be skipped.
        if ("goalId" in patch) row.goal_id = patch.goalId ?? null;
        if ("goalLabel" in patch) row.goal_label = patch.goalLabel ?? null;
        if (patch.status !== undefined) {
            row.status = patch.status;
            row.finished_at = patch.status === "done" ? (patch.finishedAt ?? this.ctx.today) : null;
            if (patch.status === "reading") row.started_at = patch.startedAt ?? this.ctx.today;
        }
        const { error } = await supabase.from("wf_books").update(row).eq("id", id).eq("space_id", this.ctx.space.id);
        fail("update book", error);
    }

    async removeBook(id: string): Promise<void> {
        this.manage();
        const { error } = await supabase.from("wf_books").delete().eq("id", id).eq("space_id", this.ctx.space.id);
        fail("remove book", error);
    }

    async setProgress(bookId: string, memberId: string, page: number | null, pctIn: number): Promise<void> {
        this.notGuest();
        if (!this.ctx.can("books.manage") && memberId !== this.ctx.me.id) this.deny();
        const book = await supabase.from("wf_books").select("pages,status").eq("id", bookId).single();
        fail("book", book.error);
        const pages = n((book.data as Row | null)?.pages);
        const pct = page != null && pages > 0 ? pctFromPage(page, pages) : Math.max(0, Math.min(100, Math.round(pctIn)));
        const { error } = await supabase
            .from("wf_reading_progress")
            .upsert({ ...this.scope, book_id: bookId, member_id: memberId, page, pct, updated_at: new Date().toISOString() }, { onConflict: "book_id,member_id" });
        fail("save progress", error);
        if (pct >= 100) {
            const done = await supabase.from("wf_books").update({ status: "done", finished_at: this.ctx.today }).eq("id", bookId);
            fail("finish book", done.error);
        } else if (s((book.data as Row | null)?.status) === "want") {
            const started = await supabase.from("wf_books").update({ status: "reading", started_at: this.ctx.today }).eq("id", bookId);
            fail("start book", started.error);
        }
    }

    // -- plans ---------------------------------------------------------------

    async addPlan(input: NewPlan): Promise<ReadingPlan> {
        this.manage();
        const { data, error } = await supabase
            .from("wf_reading_plans")
            .insert({
                ...this.scope,
                book_id: input.bookId,
                pace_unit: input.pace.unit,
                pace_amount: Math.max(1, Math.round(input.pace.amount)),
                days_per_week: Math.max(1, Math.min(7, Math.round(input.pace.daysPerWeek))),
                assignee_member_ids: this.household(input.assigneeMemberIds),
                start_date: input.startDate,
                end_date: input.endDate,
                goal_id: input.goalId ?? null,
            })
            .select("*")
            .single();
        fail("add plan", error);
        return mapPlan(data as Row);
    }

    async updatePlan(id: string, patch: Partial<Omit<ReadingPlan, "id" | "spaceId" | "createdAt">>): Promise<void> {
        this.manage();
        const row: Row = {};
        if (patch.bookId !== undefined) row.book_id = patch.bookId;
        if (patch.pace !== undefined) {
            row.pace_unit = patch.pace.unit;
            row.pace_amount = patch.pace.amount;
            row.days_per_week = patch.pace.daysPerWeek;
        }
        if (patch.assigneeMemberIds !== undefined) row.assignee_member_ids = this.household(patch.assigneeMemberIds);
        if (patch.startDate !== undefined) row.start_date = patch.startDate;
        if (patch.endDate !== undefined) row.end_date = patch.endDate;
        if (patch.goalId !== undefined) row.goal_id = patch.goalId ?? null;
        const { error } = await supabase.from("wf_reading_plans").update(row).eq("id", id).eq("space_id", this.ctx.space.id);
        fail("update plan", error);
    }

    async removePlan(id: string): Promise<void> {
        this.manage();
        const { error } = await supabase.from("wf_reading_plans").delete().eq("id", id).eq("space_id", this.ctx.space.id);
        fail("remove plan", error);
    }

    // -- courses -------------------------------------------------------------

    async createCourse(input: NewCourse): Promise<Course> {
        this.manage();
        const course = await supabase
            .from("wf_courses")
            .insert({
                ...this.scope,
                book_id: input.bookId,
                title: input.title.trim(),
                weeks: input.weeks.length,
                status: "draft",
                generated_by: this.ctx.me.id,
                model: input.model,
                cost_cents: 0,
                shared_with_guest_ids: [],
                child_safe: input.childSafe,
                audience: input.audience,
                enrolled: [],
            })
            .select("*")
            .single();
        fail("create course", course.error);
        const created = mapCourse(course.data as Row);

        const weekRows = input.weeks.map((w, i) => ({
            ...this.scope,
            course_id: created.id,
            week: w.week || i + 1,
            theme: w.theme,
            chapters: w.chapters,
            discussion_questions: w.discussionQuestions,
            family_activity: w.familyActivity,
            quiz: w.quiz,
        }));
        const weeks = await supabase.from("wf_course_weeks").insert(weekRows).select("*");
        fail("create weeks", weeks.error);

        const itemRows: Row[] = [];
        for (const [i, w] of input.weeks.entries()) {
            const weekRow = (weeks.data ?? [])[i] as Row | undefined;
            if (!weekRow) continue;
            const list = w.items?.length ? w.items : [
                { type: "read" as CourseItemType, title: "Read this week's chapters" },
                { type: "discuss" as CourseItemType, title: "Talk through the three questions" },
                { type: "activity" as CourseItemType, title: "Do the family activity" },
                { type: "quiz" as CourseItemType, title: "Take the quiz" },
            ];
            list.forEach((it, order) => itemRows.push({ ...this.scope, course_week_id: s(weekRow.id), type: it.type, title: it.title, item_order: order + 1, done_by: [] }));
        }
        if (itemRows.length) fail("create items", (await supabase.from("wf_course_items").insert(itemRows)).error);
        return created;
    }

    async updateCourse(id: string, patch: Partial<Pick<Course, "title" | "audience" | "childSafe" | "status" | "sharedWithGuestIds">>): Promise<void> {
        this.manage();
        const row: Row = {};
        if (patch.title !== undefined) row.title = patch.title;
        if (patch.audience !== undefined) row.audience = patch.audience;
        if (patch.status !== undefined) row.status = patch.status;
        if (patch.sharedWithGuestIds !== undefined) row.shared_with_guest_ids = patch.sharedWithGuestIds;
        if (patch.childSafe !== undefined) {
            row.child_safe = patch.childSafe;
            if (patch.childSafe === false) {
                const cur = await supabase.from("wf_courses").select("enrolled").eq("id", id).single();
                fail("course", cur.error);
                row.enrolled = strs((cur.data as Row | null)?.enrolled).filter((m) => this.ctx.members.find((x) => x.id === m)?.role !== "child");
            }
        }
        const { error } = await supabase.from("wf_courses").update(row).eq("id", id).eq("space_id", this.ctx.space.id);
        fail("update course", error);
    }

    async removeCourse(id: string): Promise<void> {
        this.manage();
        const { error } = await supabase.from("wf_courses").delete().eq("id", id).eq("space_id", this.ctx.space.id);
        fail("remove course", error);
    }

    async publishCourse(id: string): Promise<void> {
        this.manage();
        const weeks = await supabase.from("wf_course_weeks").select("id").eq("course_id", id);
        fail("weeks", weeks.error);
        if (!(weeks.data ?? []).length) throw new Error("A course needs at least one week before you can publish it.");
        const { error } = await supabase.from("wf_courses").update({ status: "published", weeks: (weeks.data ?? []).length }).eq("id", id).eq("space_id", this.ctx.space.id);
        fail("publish course", error);
    }

    async enrol(courseId: string, memberId: string): Promise<void> {
        this.manage();
        const cur = await supabase.from("wf_courses").select("enrolled,child_safe,status").eq("id", courseId).single();
        fail("course", cur.error);
        const row = cur.data as Row;
        const member = this.ctx.members.find((m) => m.id === memberId);
        if (!member) throw new Error("Not allowed");
        if (s(row.status) !== "published") throw new Error("Publish the course before enrolling anyone.");
        if (member.role === "child" && row.child_safe !== true) throw new Error("Mark this course child-safe before enrolling a child.");
        if (member.role === "guest") throw new Error("Guests are given a course to read, not enrolled — use Share instead.");
        const next = [...new Set([...strs(row.enrolled), memberId])];
        const { error } = await supabase.from("wf_courses").update({ enrolled: next }).eq("id", courseId);
        fail("enrol", error);
    }

    async unenrol(courseId: string, memberId: string): Promise<void> {
        this.manage();
        const cur = await supabase.from("wf_courses").select("enrolled").eq("id", courseId).single();
        fail("course", cur.error);
        const next = strs((cur.data as Row).enrolled).filter((m) => m !== memberId);
        const { error } = await supabase.from("wf_courses").update({ enrolled: next }).eq("id", courseId);
        fail("unenrol", error);
    }

    async shareCourse(courseId: string, guestIds: string[]): Promise<void> {
        this.manage();
        const guests = new Set(this.ctx.members.filter((m) => m.role === "guest").map((m) => m.id));
        const { error } = await supabase.from("wf_courses").update({ shared_with_guest_ids: guestIds.filter((id) => guests.has(id)) }).eq("id", courseId);
        fail("share course", error);
    }

    // -- weeks and items -----------------------------------------------------

    async addWeek(courseId: string): Promise<CourseWeek> {
        this.manage();
        const existing = await supabase.from("wf_course_weeks").select("id").eq("course_id", courseId);
        fail("weeks", existing.error);
        const week = (existing.data ?? []).length + 1;
        const { data, error } = await supabase
            .from("wf_course_weeks")
            .insert({ ...this.scope, course_id: courseId, week, theme: "", chapters: "", discussion_questions: ["", "", ""], family_activity: "", quiz: [] })
            .select("*")
            .single();
        fail("add week", error);
        const created = mapWeek(data as Row, []);
        const items = [
            { type: "read" as CourseItemType, title: "Read this week's chapters" },
            { type: "discuss" as CourseItemType, title: "Talk through the three questions" },
            { type: "activity" as CourseItemType, title: "Do the family activity" },
            { type: "quiz" as CourseItemType, title: "Take the quiz" },
        ];
        const ins = await supabase.from("wf_course_items").insert(items.map((it, i) => ({ ...this.scope, course_week_id: created.id, type: it.type, title: it.title, item_order: i + 1, done_by: [] }))).select("*");
        fail("add week items", ins.error);
        fail("count weeks", (await supabase.from("wf_courses").update({ weeks: week }).eq("id", courseId)).error);
        return { ...created, items: (ins.data ?? []).map(mapItem) };
    }

    async updateWeek(id: string, patch: Partial<Pick<CourseWeek, "theme" | "chapters" | "discussionQuestions" | "familyActivity" | "quiz">>): Promise<void> {
        this.manage();
        const row: Row = {};
        if (patch.theme !== undefined) row.theme = patch.theme;
        if (patch.chapters !== undefined) row.chapters = patch.chapters;
        if (patch.discussionQuestions !== undefined) row.discussion_questions = patch.discussionQuestions;
        if (patch.familyActivity !== undefined) row.family_activity = patch.familyActivity;
        if (patch.quiz !== undefined) row.quiz = patch.quiz;
        const { error } = await supabase.from("wf_course_weeks").update(row).eq("id", id).eq("space_id", this.ctx.space.id);
        fail("update week", error);
    }

    async removeWeek(id: string): Promise<void> {
        this.manage();
        const { error } = await supabase.from("wf_course_weeks").delete().eq("id", id).eq("space_id", this.ctx.space.id);
        fail("remove week", error);
    }

    async addItem(weekId: string, type: CourseItemType, title: string): Promise<CourseItem> {
        this.manage();
        const existing = await supabase.from("wf_course_items").select("id").eq("course_week_id", weekId);
        fail("items", existing.error);
        const { data, error } = await supabase
            .from("wf_course_items")
            .insert({ ...this.scope, course_week_id: weekId, type, title: title.trim(), item_order: (existing.data ?? []).length + 1, done_by: [] })
            .select("*")
            .single();
        fail("add item", error);
        return mapItem(data as Row);
    }

    async updateItem(id: string, patch: Partial<Pick<CourseItem, "title" | "type">>): Promise<void> {
        this.manage();
        const row: Row = {};
        if (patch.title !== undefined) row.title = patch.title;
        if (patch.type !== undefined) row.type = patch.type;
        const { error } = await supabase.from("wf_course_items").update(row).eq("id", id).eq("space_id", this.ctx.space.id);
        fail("update item", error);
    }

    async removeItem(id: string): Promise<void> {
        this.manage();
        const { error } = await supabase.from("wf_course_items").delete().eq("id", id).eq("space_id", this.ctx.space.id);
        fail("remove item", error);
    }

    async toggleItem(itemId: string, memberId: string, done: boolean): Promise<void> {
        this.notGuest();
        if (!this.ctx.can("books.manage") && memberId !== this.ctx.me.id) this.deny();
        const cur = await supabase.from("wf_course_items").select("done_by").eq("id", itemId).single();
        fail("item", cur.error);
        const set = new Set(strs((cur.data as Row).done_by));
        if (done) set.add(memberId);
        else set.delete(memberId);
        const { error } = await supabase.from("wf_course_items").update({ done_by: [...set] }).eq("id", itemId);
        fail("tick item", error);
    }

    // -- quiz ----------------------------------------------------------------

    async recordAttempt(courseWeekId: string, memberId: string, answers: number[]): Promise<QuizAttempt> {
        this.notGuest();
        if (!this.ctx.can("books.manage") && memberId !== this.ctx.me.id) this.deny();
        const weekRow = await supabase.from("wf_course_weeks").select("*").eq("id", courseWeekId).single();
        fail("week", weekRow.error);
        const week = mapWeek(weekRow.data as Row, []);
        const { data, error } = await supabase
            .from("wf_quiz_attempts")
            .insert({ ...this.scope, course_id: week.courseId, course_week_id: courseWeekId, member_id: memberId, answers, score: markQuiz(week, answers), total: week.quiz.length })
            .select("*")
            .single();
        fail("save attempt", error);

        const items = await supabase.from("wf_course_items").select("id,type,done_by").eq("course_week_id", courseWeekId).eq("type", "quiz");
        fail("quiz item", items.error);
        for (const raw of items.data ?? []) {
            const row = raw as Row;
            const done = new Set(strs(row.done_by));
            if (done.has(memberId)) continue;
            done.add(memberId);
            fail("tick quiz", (await supabase.from("wf_course_items").update({ done_by: [...done] }).eq("id", s(row.id))).error);
        }
        return mapAttempt(data as Row);
    }

    // -- export --------------------------------------------------------------

    async exportToCurricula(courseId: string): Promise<CourseUnit> {
        this.manage();
        const state = await this.load();
        const course = state.courses.find((c) => c.id === courseId);
        if (!course) throw new Error("That course is gone.");
        const book = state.books.find((b) => b.id === course.bookId);
        const weeks = weeksOf(state, courseId);
        const assignments = weeks.map((w, i) => ({
            id: `${courseId}-w${w.week || i + 1}`,
            week: w.week || i + 1,
            title: `Week ${w.week || i + 1}: ${w.theme || w.chapters || "Reading"}`,
            href: `/grow/books/${course.bookId}/course?c=${courseId}&w=${w.week || i + 1}`,
        }));
        const { data, error } = await supabase
            .from("wf_course_units")
            .upsert(
                {
                    ...this.scope,
                    course_id: courseId,
                    book_id: course.bookId,
                    title: course.title,
                    subject: book ? `Reading · ${book.author}` : "Reading",
                    weeks: weeks.length,
                    member_ids: course.enrolled,
                    assignments,
                },
                { onConflict: "course_id" },
            )
            .select("*")
            .single();
        fail("export course", error);
        const unit = mapUnit(data as Row);
        fail("link unit", (await supabase.from("wf_courses").update({ unit_id: unit.id }).eq("id", courseId)).error);
        return unit;
    }

    async setYearGoal(nGoal: number): Promise<void> {
        this.manage();
        const { error } = await supabase.from("wf_book_settings").upsert({ ...this.scope, year_goal: Math.max(0, Math.round(nGoal)) }, { onConflict: "space_id" });
        fail("save reading target", error);
    }
}
