import type { ModuleRepo, Visibility } from "@/data/core";

/**
 * Bible, prayer & discipleship.
 *
 * Five things that belong together because a family lives them together:
 * STUDIES (a catalogue of pre-loaded courses plus whatever the parents write
 * themselves, each a run of sessions with a passage, a short devotional, two
 * questions and something to pray), a READING PLAN that puts one passage in
 * front of the household each morning, MEMORY VERSES with real spaced
 * repetition, the PRAYER WALL, and the ANSWERED archive that is the family's
 * evidence over the years.
 *
 * THE GUEST RULE (and a deliberate reconciliation).
 * The permissions matrix calls guests read-only almost everywhere, and here it
 * says "Limited · prayer requests". The acceptance criteria are more precise:
 * a guest reads the wall ONLY when they were granted the wall object, may add
 * THEIR OWN request (tagged as a guest post) and may say "I prayed" — nothing
 * else. That is the narrowest reading that satisfies both, and it is what this
 * module implements: `wallGuestIds` is the grant, and every other write path
 * refuses a guest outright. A guest who was not granted the wall receives an
 * empty slice: not a hidden list, an absent one.
 *
 * THE CHILD RULE.
 * A child sees a wall prayer only when it is marked child-safe, carries
 * `general` sensitivity, and every tag on it is a child-safe tag (the tag set
 * is closed and declared below, so "which tags are child-safe" is a fact of
 * the product rather than a judgement made per prayer). Private prayers never
 * reach anyone but their author — not the wall, not the briefing, not the
 * companion's grounding, because `visibleTo()` removes them before the slice
 * ever leaves the repo.
 */

// ---------------------------------------------------------------------------
// Studies
// ---------------------------------------------------------------------------

export type StudyType = "preloaded" | "custom" | "topical";

export const STUDY_TYPE_LABEL: Record<StudyType, string> = {
    preloaded: "From the library",
    custom: "Ours",
    topical: "Topical",
};

export interface Study {
    id: string;
    spaceId: string;
    title: string;
    type: StudyType;
    description: string;
    /** Written for children: the only studies a child may be assigned. */
    childSafe: boolean;
    assigneeMemberIds: string[];
    /** A family value this study serves, e.g. "Faith" (from `space.values`). */
    value?: string;
    coverUrl?: string;
    /** Roughly how long one session takes, for the agenda line. */
    minutes: number;
    createdAt: string;
}

/** One session (day) of a study. */
export interface StudySession {
    id: string;
    studyId: string;
    /** 1-based position in the study. */
    order: number;
    /** "Galatians 5:22–23". */
    passage: string;
    /** Public-domain text (World English Bible / KJV), kept short on purpose. */
    passageText: string;
    /** The devotional paragraph the family reads together. */
    devotional: string;
    /** Two questions, always. */
    questions: string[];
    prayerFocus: string;
}

/** One person finished one session. */
export interface SessionDone {
    id: string;
    studyId: string;
    sessionId: string;
    memberId: string;
    /** ISO date. */
    date: string;
    at: string;
}

// ---------------------------------------------------------------------------
// Reading plans
// ---------------------------------------------------------------------------

export interface BiblePlan {
    id: string;
    spaceId: string;
    title: string;
    /** ISO date of day 1. */
    startDate: string;
    /** "WEB", "KJV", "NIV" — the family's preferred translation, for links. */
    translation: string;
    assigneeMemberIds: string[];
    /** Exactly one plan feeds the daily scripture; the rest are archived. */
    active: boolean;
    createdAt: string;
}

export interface PlanDay {
    planId: string;
    /** 1-based day number. */
    day: number;
    passage: string;
    passageText: string;
}

/** What the whole house reads today — the plan's day, else the rolling list. */
export interface DailyScripture {
    id: string;
    date: string;
    reference: string;
    text: string;
    source: "plan" | "family";
    planId?: string;
    day?: number;
}

// ---------------------------------------------------------------------------
// Memory verses
// ---------------------------------------------------------------------------

/** 1 → 3 → 7 → 14 → 30 days, exactly as the spec sets it out. */
export const SCHEDULE: number[] = [1, 3, 7, 14, 30];

export const MASTERY_LABEL = ["New", "Learning", "Getting there", "Nearly", "Strong", "Mastered"];

export interface MemoryVerse {
    id: string;
    spaceId: string;
    memberId: string;
    reference: string;
    text: string;
    /** A little one learns by hearing it: the card reads itself aloud. */
    readAloud: boolean;
    addedAt: string;
}

export type ReviewResult = "knew" | "again";

/**
 * One row per scheduled review. The row with `reviewedAt === null` is the card
 * that is (or will become) due; answering it stamps the result and writes the
 * next pending row, so the whole history stays on the table.
 */
export interface VerseReview {
    id: string;
    verseId: string;
    memberId: string;
    /** ISO date the card comes up. */
    dueAt: string;
    intervalDays: number;
    /** Index into SCHEDULE at the time the card was scheduled. */
    step: number;
    result: ReviewResult | null;
    reviewedAt: string | null;
}

// ---------------------------------------------------------------------------
// Prayer
// ---------------------------------------------------------------------------

export type PrayerTag = "family" | "health" | "school" | "church" | "mission" | "travel" | "thanks" | "provision" | "work" | "grief";

/**
 * The closed tag set, and — the point of closing it — which tags a child may
 * see. Money worries and adult work pressure are not a nine-year-old's to
 * carry; a request for Grandma's knee is.
 */
export const TAGS: Array<{ id: PrayerTag; label: string; childSafe: boolean }> = [
    { id: "family", label: "Family", childSafe: true },
    { id: "health", label: "Health", childSafe: true },
    { id: "school", label: "School", childSafe: true },
    { id: "church", label: "Church", childSafe: true },
    { id: "mission", label: "Mission", childSafe: true },
    { id: "travel", label: "Travel", childSafe: true },
    { id: "thanks", label: "Thanks", childSafe: true },
    { id: "provision", label: "Provision", childSafe: false },
    { id: "work", label: "Work", childSafe: false },
    { id: "grief", label: "Grief", childSafe: false },
];

export const TAG_LABEL: Record<PrayerTag, string> = Object.fromEntries(TAGS.map((t) => [t.id, t.label])) as Record<PrayerTag, string>;
export const CHILD_SAFE_TAGS: ReadonlySet<PrayerTag> = new Set(TAGS.filter((t) => t.childSafe).map((t) => t.id));

/** The sensitivity classes the brief excludes from child and guest packs. */
export type Sensitivity = "general" | "health" | "financial" | "private";

export type PrayerStatus = "open" | "answered";

export interface Prayer {
    id: string;
    spaceId: string;
    authorMemberId: string;
    title: string;
    detail: string;
    tags: PrayerTag[];
    visibility: Visibility;
    sharedWith: string[];
    sensitivity: Sensitivity;
    status: PrayerStatus;
    /** ISO date it was marked answered. */
    answeredAt: string | null;
    testimony: string;
    /** Written so a child can read it. */
    childSafe: boolean;
    /**
     * On the "How to pray for us this week" card guests are shown. A family
     * prayer is not automatically a guest's business, so this is opt-in.
     */
    sharedWithGuests: boolean;
    /** A guest posted it — the wall says so, plainly. */
    fromGuest: boolean;
    createdAt: string;
}

export interface PrayerReaction {
    id: string;
    prayerId: string;
    memberId: string;
    type: "prayed";
    /** ISO date — the streak is counted in days, not moments. */
    date: string;
    at: string;
}

/**
 * An answered prayer, materialised for the family timeline.
 *
 * Home owns `milestones` and a module never writes another module's rows
 * (CONTRACT.md), so marking a prayer answered writes the timeline entry HERE,
 * in the shape Home's timeline reads, and Home picks it up from our slice.
 */
export interface PrayerMilestone {
    id: string;
    prayerId: string;
    /** The date it was answered, in its own year. */
    date: string;
    title: string;
    body: string;
    href: string;
    memberIds: string[];
    ownerMemberId: string | null;
    visibility: Visibility;
    sharedWith: string[];
}

/**
 * A study materialised for Curricula, the same way Books exports a course.
 * Derived on every load, so finishing a session moves Curricula immediately.
 */
export interface StudyUnit {
    id: string;
    studyId: string;
    /**
     * The same id again, under the name Curricula's `ImportableUnit` uses, so
     * a study is structurally an importable unit and the register can read
     * `useModuleState<{ units?: ImportableUnit[] }>("bible").units` exactly
     * as it already reads Books'.
     */
    courseId: string;
    title: string;
    subject: string;
    /** Sessions, counted as the unit's assignments. */
    weeks: number;
    memberIds: string[];
    assignments: Array<{ id: string; week: number; title: string; href: string; done: boolean }>;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface BibleState {
    studies: Study[];
    sessions: StudySession[];
    done: SessionDone[];
    plans: BiblePlan[];
    planDays: PlanDay[];
    memoryVerses: MemoryVerse[];
    reviews: VerseReview[];
    prayers: Prayer[];
    reactions: PrayerReaction[];
    /**
     * Guests granted the prayer-wall object. Family → People is where a parent
     * grants it in the product; this is the module's own copy of the grant,
     * because a module may not read another module's repo.
     */
    wallGuestIds: string[];
    /** Days the family agreed to rest: a streak steps over them. */
    graceDays: string[];
    /** The rotating family verse list — the fallback when no plan is running. */
    rollingVerses: Array<{ reference: string; text: string }>;
    /**
     * Today's scripture first, then the last few days. Named `verses` because
     * Home's reader looks for it there (`peek.verseOfTheDay`).
     */
    verses: DailyScripture[];
    /** Answered prayers, for the family timeline. */
    timeline: PrayerMilestone[];
    /** Derived on load, for Curricula. */
    units: StudyUnit[];
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export interface NewStudy {
    title: string;
    type: StudyType;
    description: string;
    childSafe: boolean;
    assigneeMemberIds: string[];
    value?: string;
    minutes?: number;
    coverUrl?: string;
    sessions?: Array<Omit<StudySession, "id" | "studyId" | "order">>;
}

export interface NewSession {
    passage: string;
    passageText: string;
    devotional: string;
    questions: string[];
    prayerFocus: string;
}

export interface NewPlan {
    title: string;
    startDate: string;
    translation: string;
    assigneeMemberIds: string[];
    days: Array<{ passage: string; passageText: string }>;
}

export interface NewVerse {
    memberId: string;
    reference: string;
    text: string;
    readAloud?: boolean;
}

export interface NewPrayer {
    title: string;
    detail: string;
    tags: PrayerTag[];
    visibility: Visibility;
    sharedWith?: string[];
    sensitivity?: Sensitivity;
    childSafe: boolean;
    sharedWithGuests: boolean;
}

export interface BibleRepo extends ModuleRepo<BibleState> {
    // studies
    addStudy(input: NewStudy): Promise<Study>;
    updateStudy(id: string, patch: Partial<Pick<Study, "title" | "description" | "childSafe" | "assigneeMemberIds" | "value" | "minutes">>): Promise<void>;
    removeStudy(id: string): Promise<void>;
    addSession(studyId: string, input: NewSession): Promise<StudySession>;
    updateSession(id: string, patch: Partial<NewSession>): Promise<void>;
    removeSession(id: string): Promise<void>;
    /** Returns the Sprouts a child earns for it (0 for everyone else). */
    completeSession(sessionId: string, memberId: string): Promise<{ points: number }>;
    uncompleteSession(sessionId: string, memberId: string): Promise<void>;

    // plans
    addPlan(input: NewPlan): Promise<BiblePlan>;
    updatePlan(id: string, patch: Partial<Pick<BiblePlan, "title" | "translation" | "assigneeMemberIds" | "active" | "startDate">>): Promise<void>;
    removePlan(id: string): Promise<void>;

    // memory verses
    addVerse(input: NewVerse): Promise<MemoryVerse>;
    updateVerse(id: string, patch: Partial<Pick<MemoryVerse, "reference" | "text" | "readAloud">>): Promise<void>;
    removeVerse(id: string): Promise<void>;
    /** Answer the due card: advances or resets the 1-3-7-14-30 schedule. */
    reviewVerse(verseId: string, memberId: string, result: ReviewResult): Promise<{ points: number }>;

    // prayer
    addPrayer(input: NewPrayer): Promise<Prayer>;
    updatePrayer(id: string, patch: Partial<Pick<Prayer, "title" | "detail" | "tags" | "visibility" | "sharedWith" | "sensitivity" | "childSafe" | "sharedWithGuests">>): Promise<void>;
    removePrayer(id: string): Promise<void>;
    /** Records the date, keeps the thread, writes the timeline entry. */
    markAnswered(id: string, testimony: string): Promise<void>;
    reopenPrayer(id: string): Promise<void>;
    togglePrayed(prayerId: string, memberId: string, on: boolean): Promise<void>;

    // grants and rhythm
    setWallGuest(memberId: string, granted: boolean): Promise<void>;
    setGraceDay(date: string, on: boolean): Promise<void>;
}
