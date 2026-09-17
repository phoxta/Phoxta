import type { ModuleRepo, Visibility } from "@/data/core";

/**
 * Library & Book-to-Course.
 *
 * Two halves that need each other: the family's READING (what is on the shelf,
 * who is on which page, and the plans that keep a nine-year-old moving through
 * Charlotte's Web) and the COURSE engine that turns a book the parents loved
 * into four weeks the whole household actually finishes — chapters, discussion
 * questions round the table, one family activity, and a five-question quiz.
 *
 * A course is drafted before it is published: the companion writes a scaffold
 * in seconds, a parent edits every line, and only then does it become
 * something a child can be enrolled in. Enrolment of a child requires the
 * course to be marked child-safe; a mentor guest can be handed one course and
 * sees nothing else in this module — not the shelf, not the plans, not the
 * private books a parent is reading alone.
 */

export type BookFormat = "ebook" | "physical" | "audio";
export type BookStatus = "want" | "reading" | "done";

export const FORMAT_LABEL: Record<BookFormat, string> = { ebook: "E-book", physical: "Paperback", audio: "Audiobook" };
export const STATUS_LABEL: Record<BookStatus, string> = { want: "Want to read", reading: "Reading", done: "Finished" };

export interface Book {
    id: string;
    spaceId: string;
    title: string;
    author: string;
    format: BookFormat;
    coverUrl?: string;
    /** Whose book it is; null when it belongs to the whole family. */
    ownerMemberId: string | null;
    status: BookStatus;
    /** Pages, or minutes for an audiobook (`format === "audio"`). */
    pages: number;
    /** 0 = not rated yet, otherwise 1–5. */
    rating: number;
    notes: string;
    tags: string[];
    visibility: Visibility;
    sharedWith: string[];
    /** A family value this book serves, e.g. "Faith" (from `space.values`). */
    value?: string;
    /**
     * A REAL goal id from the Goals module (`goals.goals[].id`), chosen with a
     * picker over that module's loaded slice — never a slug made up from a
     * label. `goalLabel` is the goal's title, denormalised so the shelf can
     * name the goal without reading another module's rows.
     */
    goalId?: string;
    goalLabel?: string;
    startedAt?: string | null;
    finishedAt?: string | null;
    createdAt: string;
}

/** Where one member has got to in one book. */
export interface ReadingProgress {
    bookId: string;
    memberId: string;
    /** Page (or minute, for an audiobook); null when only a percentage is known. */
    page: number | null;
    /** 0–100, always present so audiobooks and e-books read the same way. */
    pct: number;
    updatedAt: string;
}

export type PaceUnit = "pages" | "chapters" | "minutes";

export interface ReadingPlan {
    id: string;
    spaceId: string;
    bookId: string;
    pace: { unit: PaceUnit; amount: number; daysPerWeek: number };
    assigneeMemberIds: string[];
    startDate: string;
    endDate: string;
    goalId?: string;
    createdAt: string;
}

export type CourseStatus = "draft" | "published";

export interface Course {
    id: string;
    spaceId: string;
    bookId: string;
    title: string;
    /** How many weeks the course runs — four by default. */
    weeks: number;
    status: CourseStatus;
    /** The member who asked for it; null when hand-written. */
    generatedBy: string | null;
    /** "companion" when the AI wrote the scaffold, "by hand" otherwise. */
    model: string | null;
    /** What the companion cost, in the space currency (0 in the demo). */
    costCents: number;
    /** Guests this course is explicitly shared with (a mentor, usually). */
    sharedWithGuestIds: string[];
    /** Only a child-safe course may have a child enrolled. */
    childSafe: boolean;
    audience: string;
    enrolled: string[];
    /** Set once the course has been exported to Curricula as a unit. */
    unitId?: string | null;
    createdAt: string;
}

export type CourseItemType = "read" | "discuss" | "activity" | "quiz" | "note";

export const ITEM_LABEL: Record<CourseItemType, string> = {
    read: "Read",
    discuss: "Discuss",
    activity: "Activity",
    quiz: "Quiz",
    note: "Note",
};

export interface CourseItem {
    id: string;
    courseWeekId: string;
    type: CourseItemType;
    title: string;
    order: number;
    /** Members who have ticked this item off. */
    doneBy: string[];
}

export interface QuizQuestion {
    q: string;
    options: string[];
    /** Index into `options`. */
    answer: number;
    why?: string;
}

export interface CourseWeek {
    id: string;
    courseId: string;
    week: number;
    theme: string;
    chapters: string;
    discussionQuestions: string[];
    familyActivity: string;
    quiz: QuizQuestion[];
    items: CourseItem[];
}

export interface QuizAttempt {
    id: string;
    courseId: string;
    courseWeekId: string;
    memberId: string;
    answers: number[];
    score: number;
    total: number;
    attemptedAt: string;
}

/**
 * A course exported for Curricula.
 *
 * A module never writes another module's rows (see CONTRACT.md), so the export
 * is materialised here, in the shape Curricula reads: a unit with one
 * assignment per week, each linking back to the week it came from. Curricula
 * picks it up with `useModuleState<BooksState>("books").units`.
 */
export interface CourseUnit {
    id: string;
    courseId: string;
    bookId: string;
    title: string;
    subject: string;
    weeks: number;
    memberIds: string[];
    assignments: Array<{ id: string; week: number; title: string; href: string }>;
    createdAt: string;
}

/**
 * Reading that feeds a goal, denormalised so Goals can read it without our
 * maths: `useModuleState<BooksState>("books").goalReading`, grouped by
 * `goalId` (a real Goals id) and averaged. One row per linked book.
 */
export interface GoalReading {
    goalId: string;
    goalLabel: string;
    bookId: string;
    bookTitle: string;
    pct: number;
}

/**
 * A goal, as far as Books cares — the shape we read out of the Goals module's
 * loaded slice to fill the "which goal does this reading feed" picker. A
 * module never imports another module's types, so this is declared
 * structurally, the way Goals declares `LinkedTask` for ours.
 */
export interface LinkedGoal {
    id: string;
    title: string;
    status?: string;
    pillar?: string;
    targetDate?: string;
}

export interface BooksState {
    books: Book[];
    progress: ReadingProgress[];
    plans: ReadingPlan[];
    courses: Course[];
    weeks: CourseWeek[];
    attempts: QuizAttempt[];
    units: CourseUnit[];
    /** How many books the family means to finish this year. */
    yearGoal: number;
    /** Computed on load, for the Goals module and our own rings. */
    goalReading: GoalReading[];
}

export interface NewBook {
    title: string;
    author: string;
    format: BookFormat;
    ownerMemberId: string | null;
    status: BookStatus;
    pages: number;
    notes?: string;
    tags?: string[];
    visibility: Visibility;
    sharedWith?: string[];
    coverUrl?: string;
    value?: string;
    goalId?: string;
    goalLabel?: string;
}

export interface NewPlan {
    bookId: string;
    pace: { unit: PaceUnit; amount: number; daysPerWeek: number };
    assigneeMemberIds: string[];
    startDate: string;
    endDate: string;
    goalId?: string;
}

/** A whole course in one write — what the companion (or the scaffold) returns. */
export interface NewCourse {
    bookId: string;
    title: string;
    audience: string;
    childSafe: boolean;
    model: string | null;
    weeks: Array<{
        week: number;
        theme: string;
        chapters: string;
        discussionQuestions: string[];
        familyActivity: string;
        quiz: QuizQuestion[];
        items?: Array<{ type: CourseItemType; title: string }>;
    }>;
}

export interface BooksRepo extends ModuleRepo<BooksState> {
    addBook(input: NewBook): Promise<Book>;
    updateBook(id: string, patch: Partial<Omit<Book, "id" | "spaceId" | "createdAt">>): Promise<void>;
    removeBook(id: string): Promise<void>;
    /** Where I am in a book; `pct` is derived from `page` when pages are known. */
    setProgress(bookId: string, memberId: string, page: number | null, pct: number): Promise<void>;

    addPlan(input: NewPlan): Promise<ReadingPlan>;
    updatePlan(id: string, patch: Partial<Omit<ReadingPlan, "id" | "spaceId" | "createdAt">>): Promise<void>;
    removePlan(id: string): Promise<void>;

    createCourse(input: NewCourse): Promise<Course>;
    updateCourse(id: string, patch: Partial<Pick<Course, "title" | "audience" | "childSafe" | "status" | "sharedWithGuestIds">>): Promise<void>;
    removeCourse(id: string): Promise<void>;
    publishCourse(id: string): Promise<void>;
    enrol(courseId: string, memberId: string): Promise<void>;
    unenrol(courseId: string, memberId: string): Promise<void>;
    shareCourse(courseId: string, guestIds: string[]): Promise<void>;

    addWeek(courseId: string): Promise<CourseWeek>;
    updateWeek(id: string, patch: Partial<Pick<CourseWeek, "theme" | "chapters" | "discussionQuestions" | "familyActivity" | "quiz">>): Promise<void>;
    removeWeek(id: string): Promise<void>;

    addItem(weekId: string, type: CourseItemType, title: string): Promise<CourseItem>;
    updateItem(id: string, patch: Partial<Pick<CourseItem, "title" | "type">>): Promise<void>;
    removeItem(id: string): Promise<void>;
    toggleItem(itemId: string, memberId: string, done: boolean): Promise<void>;

    recordAttempt(courseWeekId: string, memberId: string, answers: number[]): Promise<QuizAttempt>;

    /** Materialise the course as a Curricula unit (see `CourseUnit`). */
    exportToCurricula(courseId: string): Promise<CourseUnit>;
    setYearGoal(n: number): Promise<void>;
}
