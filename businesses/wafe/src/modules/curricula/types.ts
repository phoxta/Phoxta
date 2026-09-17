import type { AgeBand, ModuleRepo } from "@/data/core";

/**
 * Children's curricula — the school half of Grow.
 *
 * A SUBJECT belongs to one child (Dami's Chemistry is not Tobi's Science), runs
 * for a TERM, and holds UNITS; a unit holds ASSIGNMENTS. An assignment is the
 * atom the whole module turns on: it lands in the child's feed on the morning
 * it is due, it can point at a lesson, a book or a passage elsewhere in Wàfè,
 * it is worth Sprouts, and it moves assigned → submitted → graded.
 *
 * A GRADE is deliberately not part of the assignment row. Grades carry
 * `visibleToChild`, and a child's slice simply does not contain the ones a
 * parent has not released — the mark exists, the child cannot see it, and no
 * screen has to remember to hide it.
 *
 * Around that sit the things a report card never shows: skill and virtue
 * BADGES with real criteria, DEVELOPMENTAL MILESTONES a parent moves by hand
 * (with a photo when there is one), and a monthly CHARACTER TRACK tied to one
 * of the family's own values, with a daily micro-challenge and the child's
 * reflection kept underneath it.
 */

// ---------------------------------------------------------------------------
// Subjects, units, assignments
// ---------------------------------------------------------------------------

/** The palette a subject may be tinted with (design-system keys). */
export type SubjectColour = "grow" | "execute" | "live" | "create" | "terra" | "ochre" | "plum" | "sage" | "mint";

export const SUBJECT_COLOURS: SubjectColour[] = ["grow", "execute", "live", "create", "terra", "ochre", "plum", "sage", "mint"];

export interface Subject {
    id: string;
    spaceId: string;
    /** Whose subject this is. Every subject belongs to exactly one child. */
    childMemberId: string;
    name: string;
    colour: SubjectColour;
    /** "Autumn 2026", "Year 11 · Autumn". */
    term: string;
    /** Hours a week the plan asks for. */
    targetHoursWeek: number;
    /** Home education, school support, or an exam course. */
    kind: "home-ed" | "school" | "exam";
    /** Exam board or curriculum note, e.g. "AQA", "Year 5". */
    note: string;
    /** Optional photo for the subject card. */
    photoUrl?: string;
    archived: boolean;
    createdAt: string;
}

export interface Unit {
    id: string;
    spaceId: string;
    subjectId: string;
    title: string;
    summary: string;
    order: number;
    /** Set when the unit was imported from a Library course. */
    sourceCourseId?: string | null;
    /** Where that course lives, so the unit keeps a link back to it. */
    sourceHref?: string | null;
    sourceLabel?: string | null;
    createdAt: string;
}

export type AssignmentStatus = "not-started" | "in-progress" | "submitted" | "graded";

export const STATUS_LABEL: Record<AssignmentStatus, string> = {
    "not-started": "Not started",
    "in-progress": "In progress",
    submitted: "Submitted",
    graded: "Graded",
};

/** What an assignment may point at elsewhere in Wàfè (by href — never by table). */
export type LinkedItemType = "lesson" | "book" | "bible" | "project" | "none";

export const LINK_LABEL: Record<LinkedItemType, string> = {
    lesson: "Lesson",
    book: "Book",
    bible: "Bible",
    project: "Project",
    none: "No link",
};

export interface Assignment {
    id: string;
    spaceId: string;
    unitId: string;
    subjectId: string;
    /** Denormalised so a feed row never has to walk back up the tree. */
    childMemberId: string;
    title: string;
    instructions: string;
    /** ISO date (YYYY-MM-DD). */
    dueDate: string;
    status: AssignmentStatus;
    /** Sprouts credited to the child when it is completed. */
    sprouts: number;
    linkedItemType: LinkedItemType;
    linkedItemTitle?: string;
    linkedHref?: string;
    /** Image or document URLs a parent attached (data URLs in the demo). */
    attachments: string[];
    /** Little band: the tile shows a picture and reads itself aloud, never text. */
    pictureLed: boolean;
    /** Set once the child has been credited, so Sprouts are never paid twice. */
    creditedAt?: string | null;
    createdAt: string;
}

export interface Submission {
    id: string;
    spaceId: string;
    assignmentId: string;
    memberId: string;
    text: string;
    mediaUrls: string[];
    submittedAt: string;
}

export interface RubricLine {
    criterion: string;
    score: number;
    max: number;
}

export interface Grade {
    assignmentId: string;
    spaceId: string;
    /** Percentage, 0–100. */
    score: number;
    letter: string;
    rubric: RubricLine[];
    comment: string;
    gradedBy: string;
    gradedAt: string;
    /** The child sees the mark only when a parent has released it. */
    visibleToChild: boolean;
}

// ---------------------------------------------------------------------------
// Badges and milestones
// ---------------------------------------------------------------------------

export type BadgeKind = "skill" | "virtue";

export interface Badge {
    id: string;
    spaceId: string;
    name: string;
    kind: BadgeKind;
    /** "Reading", "Kindness" — the skill or virtue it stands for. */
    virtueOrSkill: string;
    /** Optional subject it belongs to. */
    subjectId?: string | null;
    /** In the family's words: what earns it. */
    criteria: string;
    /** One emoji. */
    icon: string;
    /** Levels, in order; an award records which one. */
    levels: string[];
    createdAt: string;
}

export interface BadgeAward {
    id: string;
    spaceId: string;
    badgeId: string;
    memberId: string;
    level: string;
    note: string;
    awardedBy: string;
    awardedAt: string;
}

export interface DevMilestone {
    id: string;
    spaceId: string;
    memberId: string;
    band: AgeBand;
    title: string;
    note: string;
    /** 0–100; 100 means achieved. */
    progressPct: number;
    achievedAt?: string | null;
    photoUrl?: string;
    /** Set when the family has marked the celebration, so the card stops asking. */
    celebratedAt?: string | null;
    createdAt: string;
}

// ---------------------------------------------------------------------------
// Character tracks
// ---------------------------------------------------------------------------

export interface CharacterTrack {
    id: string;
    spaceId: string;
    /** YYYY-MM. */
    month: string;
    virtue: string;
    /** One of `space.values`, so character work stays tied to the family's own words. */
    valueLabel: string;
    intro: string;
    /** One micro-challenge per day of the month, in order. */
    challenges: string[];
    /** Sprouts a completed challenge is worth. */
    sprouts: number;
    createdAt: string;
}

export interface CharacterLog {
    id: string;
    spaceId: string;
    trackId: string;
    memberId: string;
    /** ISO date the challenge was done. */
    date: string;
    challengeIndex: number;
    reflection: string;
    sprouts: number;
    createdAt: string;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface CurriculaState {
    subjects: Subject[];
    units: Unit[];
    assignments: Assignment[];
    submissions: Submission[];
    grades: Grade[];
    badges: Badge[];
    awards: BadgeAward[];
    milestones: DevMilestone[];
    tracks: CharacterTrack[];
    logs: CharacterLog[];
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export interface NewSubject {
    childMemberId: string;
    name: string;
    colour: SubjectColour;
    term: string;
    targetHoursWeek: number;
    kind: Subject["kind"];
    note?: string;
    photoUrl?: string;
}

export interface NewUnit {
    subjectId: string;
    title: string;
    summary?: string;
    sourceCourseId?: string | null;
    sourceHref?: string | null;
    sourceLabel?: string | null;
}

export interface NewAssignment {
    unitId: string;
    title: string;
    instructions?: string;
    dueDate: string;
    sprouts?: number;
    linkedItemType?: LinkedItemType;
    linkedItemTitle?: string;
    linkedHref?: string;
    attachments?: string[];
    pictureLed?: boolean;
}

export interface NewGrade {
    score: number;
    letter?: string;
    rubric?: RubricLine[];
    comment?: string;
    visibleToChild: boolean;
}

export interface NewBadge {
    name: string;
    kind: BadgeKind;
    virtueOrSkill: string;
    subjectId?: string | null;
    criteria: string;
    icon: string;
    levels?: string[];
}

export interface NewMilestone {
    memberId: string;
    band: AgeBand;
    title: string;
    note?: string;
    progressPct?: number;
    photoUrl?: string;
}

export interface NewTrack {
    month: string;
    virtue: string;
    valueLabel: string;
    intro?: string;
    challenges: string[];
    sprouts?: number;
}

/**
 * A unit exported from the Library, in the shape Books materialises it
 * (`BooksState.units`). Declared structurally rather than imported: modules
 * read each other's slices through `useModuleState`, never each other's code.
 */
export interface ImportableUnit {
    id: string;
    courseId: string;
    title: string;
    subject: string;
    weeks: number;
    memberIds: string[];
    assignments: Array<{ id: string; week: number; title: string; href: string }>;
}

export interface CurriculaRepo extends ModuleRepo<CurriculaState> {
    addSubject(input: NewSubject): Promise<Subject>;
    updateSubject(id: string, patch: Partial<Omit<Subject, "id" | "spaceId" | "createdAt">>): Promise<void>;
    removeSubject(id: string): Promise<void>;

    addUnit(input: NewUnit): Promise<Unit>;
    updateUnit(id: string, patch: Partial<Pick<Unit, "title" | "summary" | "order">>): Promise<void>;
    removeUnit(id: string): Promise<void>;
    /** Bring a Library course across as a unit whose assignments link back to it. */
    importUnit(subjectId: string, unit: ImportableUnit, dueFrom: string): Promise<Unit>;

    addAssignment(input: NewAssignment): Promise<Assignment>;
    updateAssignment(id: string, patch: Partial<Pick<Assignment, "title" | "instructions" | "dueDate" | "sprouts" | "linkedItemType" | "linkedItemTitle" | "linkedHref" | "attachments" | "pictureLed">>): Promise<void>;
    removeAssignment(id: string): Promise<void>;
    setStatus(id: string, status: AssignmentStatus): Promise<void>;
    /** The child's own write: hand it in (Little band sends no text). */
    submitAssignment(id: string, text: string, mediaUrls?: string[]): Promise<Submission>;
    /** Marks the Sprouts as paid; the page credits them through the core repo. */
    markCredited(id: string): Promise<number>;

    gradeAssignment(assignmentId: string, input: NewGrade): Promise<Grade>;
    setGradeVisibility(assignmentId: string, visibleToChild: boolean): Promise<void>;
    removeGrade(assignmentId: string): Promise<void>;

    addBadge(input: NewBadge): Promise<Badge>;
    removeBadge(id: string): Promise<void>;
    awardBadge(badgeId: string, memberId: string, level: string, note: string): Promise<BadgeAward>;
    revokeAward(awardId: string): Promise<void>;

    addMilestone(input: NewMilestone): Promise<DevMilestone>;
    updateMilestone(id: string, patch: Partial<Pick<DevMilestone, "title" | "note" | "progressPct" | "photoUrl" | "achievedAt">>): Promise<void>;
    celebrateMilestone(id: string): Promise<void>;
    removeMilestone(id: string): Promise<void>;

    addTrack(input: NewTrack): Promise<CharacterTrack>;
    updateTrack(id: string, patch: Partial<Pick<CharacterTrack, "virtue" | "valueLabel" | "intro" | "challenges" | "sprouts">>): Promise<void>;
    removeTrack(id: string): Promise<void>;
    /** Tick today's micro-challenge and keep the child's reflection. Returns the Sprouts earned. */
    logChallenge(trackId: string, memberId: string, challengeIndex: number, reflection: string, date?: string): Promise<CharacterLog>;
    removeLog(id: string): Promise<void>;
}
