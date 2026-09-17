import type { ModuleRepo, Visibility } from "@/data/core";

/**
 * Vision blueprint, goals & the OKR roadmap.
 *
 * This is where the family's values stop being a poster and start being work.
 * Three layers, and each one hangs off the one above it:
 *
 *   BLUEPRINT   the multi-year picture — vision, and what one, three and five
 *               years look like per pillar. Versioned, never overwritten, so a
 *               family can read what they believed in January and see what
 *               changed (and a parent can diff two versions side by side).
 *   GOALS       the things being worked on now: scope (mine / ours / the whole
 *               family), a pillar, the value it serves, a target date, and —
 *               the point of the module — progress that is COMPUTED. Milestones
 *               done, or a number the ledger moves. Typing a percentage is the
 *               fallback, not the habit.
 *   OKRs        one quarter at a time: an objective, three key results, and the
 *               goals it pulls on. The roadmap draws them as a timeline.
 *
 * Privacy is not a decoration here. A "me" goal is private unless its owner
 * shares it; a child never receives a family goal's title, only its
 * `childSafeSummary`, and never its money. That filtering happens once, in
 * `derive.visibleTo()`, and both repos run it — so the demo is as honest as the
 * database policies.
 */

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

/** Whose goal it is: mine · the two of us · the whole family. */
export type GoalScope = "me" | "us" | "family";

export const SCOPE_LABEL: Record<GoalScope, string> = { me: "Mine", us: "Ours", family: "Family" };

/**
 * The pillar a goal belongs to — the product's five areas plus the three the
 * brief's blueprint adds (faith, money, health). This is the roadmap's row and
 * the "Our Future" roll-up's bucket.
 */
export type Pillar = "faith" | "grow" | "execute" | "live" | "create" | "home" | "money" | "health";

export const PILLARS: Pillar[] = ["faith", "grow", "execute", "live", "create", "home", "money", "health"];

export const PILLAR_LABEL: Record<Pillar, string> = {
    faith: "Faith",
    grow: "Learning",
    execute: "Getting things done",
    live: "Home life",
    create: "Creating",
    home: "The house",
    money: "Money",
    health: "Health",
};

/** Short label for a tight column header on the roadmap. */
export const PILLAR_SHORT: Record<Pillar, string> = {
    faith: "Faith",
    grow: "Learning",
    execute: "Doing",
    live: "Life",
    create: "Create",
    home: "House",
    money: "Money",
    health: "Health",
};

export type GoalStatus = "active" | "paused" | "done";

export const STATUS_LABEL: Record<GoalStatus, string> = { active: "Active", paused: "Paused", done: "Done" };

/** How far along a goal is: counted, measured, or (last resort) typed. */
export type ProgressMode = "milestones" | "metric" | "manual";

export const MODE_LABEL: Record<ProgressMode, string> = {
    milestones: "Counted from milestones",
    metric: "Measured from a number",
    manual: "Typed by hand",
};

export type Horizon = "quarter" | "year" | "multi-year";

export const HORIZON_LABEL: Record<Horizon, string> = { quarter: "This quarter", year: "This year", "multi-year": "Multi-year" };

/** Where a measured number comes from. Modules never read each other's tables:
 *  a reading is written here, by whoever owns the number. */
export type MetricSource = "finance-fund" | "books" | "tasks" | "manual";

export type MetricUnit = "cents" | "count" | "km" | "pct";

// ---------------------------------------------------------------------------
// The blueprint
// ---------------------------------------------------------------------------

/** One line of the blueprint: a pillar, what it looks like, and why. */
export interface BlueprintLine {
    pillar: Pillar;
    text: string;
    why?: string;
}

export interface Blueprint {
    id: string;
    spaceId: string;
    /** 1, 2, 3… newest is the live one. */
    version: number;
    /** The values as they stood when this version was written. */
    valuesSnapshot: string[];
    mission: string;
    vision: string;
    goals1y: BlueprintLine[];
    goals3y: BlueprintLine[];
    goals5y: BlueprintLine[];
    /** Why this version exists ("after the Lagos decision"). */
    note: string;
    authorMemberId: string | null;
    createdAt: string;
}

export interface BlueprintDraft {
    valuesSnapshot: string[];
    mission: string;
    vision: string;
    goals1y: BlueprintLine[];
    goals3y: BlueprintLine[];
    goals5y: BlueprintLine[];
    note: string;
}

/** One change between two blueprint versions, for the diff view. */
export interface BlueprintChange {
    field: string;
    from: string;
    to: string;
}

// ---------------------------------------------------------------------------
// Goals and milestones
// ---------------------------------------------------------------------------

export interface Milestone {
    id: string;
    goalId: string;
    title: string;
    /** ISO date, or null when it is simply "next". */
    due: string | null;
    order: number;
    done: boolean;
    /** ISO datetime it was ticked — the module's proof that progress happened. */
    doneAt: string | null;
}

export interface Goal {
    id: string;
    spaceId: string;
    title: string;
    /** What a child is told instead of the title. Never money, never detail. */
    childSafeSummary: string;
    scope: GoalScope;
    /** Null for a family goal that belongs to everybody. */
    ownerMemberId: string | null;
    pillar: Pillar;
    /** One of `space.values`, kept as text so a family can rename its values. */
    valueLabel?: string;
    horizon: Horizon;
    /** ISO date. */
    targetDate: string;
    status: GoalStatus;
    description: string;
    /** The sentence that makes it worth doing. */
    why: string;
    progressMode: ProgressMode;
    /** Only consulted in "manual" mode. */
    manualPct: number;
    /** The number this goal is measured by, in "metric" mode. */
    metricRef: string | null;
    coverUrl?: string;
    visibility: Visibility;
    sharedWith: string[];
    createdAt: string;
    updatedAt: string;
    completedAt: string | null;
}

export interface NewGoal {
    title: string;
    childSafeSummary: string;
    scope: GoalScope;
    ownerMemberId: string | null;
    pillar: Pillar;
    valueLabel?: string;
    horizon: Horizon;
    targetDate: string;
    description?: string;
    why?: string;
    progressMode: ProgressMode;
    metricRef?: string | null;
    visibility: Visibility;
    sharedWith?: string[];
    coverUrl?: string;
    /** Optional first milestones, so a goal is never born empty. */
    milestones?: Array<{ title: string; due: string | null }>;
}

// ---------------------------------------------------------------------------
// Measured numbers
// ---------------------------------------------------------------------------

/**
 * A reading of a linked number, kept as a series so the goal has a history and
 * "no progress in 21 days" is a fact rather than a guess. The latest reading
 * for a `ref` is the current one.
 */
export interface MetricReading {
    id: string;
    spaceId: string;
    /** Stable across modules: "fund-home-deposit", "books-year", "tasks-done". */
    ref: string;
    label: string;
    source: MetricSource;
    unit: MetricUnit;
    target: number;
    current: number;
    /** ISO datetime of the reading. */
    at: string;
}

// ---------------------------------------------------------------------------
// OKRs
// ---------------------------------------------------------------------------

export interface Okr {
    id: string;
    spaceId: string;
    /** "2026-Q3". */
    quarter: string;
    objective: string;
    /** The goals this objective pulls on. */
    goalIds: string[];
    createdAt: string;
}

export interface KeyResult {
    id: string;
    okrId: string;
    text: string;
    target: number;
    current: number;
    unit: string;
    order: number;
}

// ---------------------------------------------------------------------------
// Celebrations and reviews
// ---------------------------------------------------------------------------

export interface Celebration {
    id: string;
    spaceId: string;
    goalId: string;
    /** ISO date. */
    date: string;
    photoUrl?: string;
    reflection: string;
    /** The line the shareable card carries. */
    cardLine: string;
    /** Who was part of it. */
    memberIds: string[];
    createdAt: string;
}

export type ReviewKind = "sunday" | "quarter";

export interface GoalReview {
    id: string;
    spaceId: string;
    kind: ReviewKind;
    /** "2026-09-06" for a Sunday, "2026-Q3" for a quarter. */
    period: string;
    /** The three things this week, or the quarter's honest paragraph. */
    notes: string;
    focusGoalIds: string[];
    authorMemberId: string | null;
    createdAt: string;
}

/**
 * The connection metrics the brief asks for, stored nightly: how much of what
 * the family actually does is attached to something they said mattered.
 */
export interface ConnectionSample {
    /** ISO date — one row a day. */
    date: string;
    /** % of open tasks carrying a goalId. */
    tasksWithGoalPct: number;
    /** % of active goals with at least one milestone. */
    goalsWithMilestonePct: number;
    tasksCounted: number;
    goalsCounted: number;
}

// ---------------------------------------------------------------------------
// State + repo
// ---------------------------------------------------------------------------

export interface GoalsState {
    /** Newest version first. */
    blueprints: Blueprint[];
    goals: Goal[];
    milestones: Milestone[];
    okrs: Okr[];
    keyResults: KeyResult[];
    metrics: MetricReading[];
    celebrations: Celebration[];
    reviews: GoalReview[];
    connection: ConnectionSample[];
}

export interface GoalsRepo extends ModuleRepo<GoalsState> {
    addGoal(input: NewGoal): Promise<Goal>;
    updateGoal(id: string, patch: Partial<Omit<Goal, "id" | "spaceId" | "createdAt">>): Promise<void>;
    removeGoal(id: string): Promise<void>;
    setStatus(id: string, status: GoalStatus): Promise<void>;
    setManualPct(id: string, pct: number): Promise<void>;

    addMilestone(goalId: string, title: string, due: string | null): Promise<Milestone>;
    updateMilestone(id: string, patch: Partial<Pick<Milestone, "title" | "due" | "order">>): Promise<void>;
    toggleMilestone(id: string, done: boolean): Promise<void>;
    removeMilestone(id: string): Promise<void>;

    /** Always writes a NEW version; history is never edited in place. */
    saveBlueprint(draft: BlueprintDraft): Promise<Blueprint>;

    addOkr(quarter: string, objective: string, goalIds: string[]): Promise<Okr>;
    updateOkr(id: string, patch: Partial<Pick<Okr, "objective" | "goalIds" | "quarter">>): Promise<void>;
    removeOkr(id: string): Promise<void>;
    addKeyResult(okrId: string, text: string, target: number, unit: string): Promise<KeyResult>;
    updateKeyResult(id: string, patch: Partial<Pick<KeyResult, "text" | "target" | "current" | "unit">>): Promise<void>;
    removeKeyResult(id: string): Promise<void>;

    celebrate(goalId: string, input: { reflection: string; cardLine: string; photoUrl?: string; memberIds: string[] }): Promise<Celebration>;
    removeCelebration(id: string): Promise<void>;

    /** A linked number moved (the ledger, the shelf, the odometer). */
    recordMetric(ref: string, current: number): Promise<void>;
    /** The nightly connection snapshot — one row a day, idempotent. */
    recordConnection(sample: ConnectionSample): Promise<void>;
    saveReview(input: { kind: ReviewKind; period: string; notes: string; focusGoalIds: string[] }): Promise<GoalReview>;
}

// ---------------------------------------------------------------------------
// What this module reads from other modules (structurally, never their repos)
// ---------------------------------------------------------------------------

/** The shape of a task, as far as Goals cares: does it point at a goal? */
export interface LinkedTask {
    id: string;
    title: string;
    goalId?: string | null;
    /** The goal's name as Tasks recorded it — the tie-breaker when ids disagree. */
    goalLabel?: string | null;
    milestoneId?: string | null;
    done?: boolean;
    status?: string;
    dueAt?: string | null;
    assigneeMemberId?: string | null;
    memberId?: string | null;
}

/** A savings pot in Finance, as far as Goals cares. */
export interface LinkedFund {
    id: string;
    label?: string;
    name?: string;
    goalId?: string | null;
    savedCents?: number;
    balanceCents?: number;
    targetCents?: number;
}
