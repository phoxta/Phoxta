import type { ModuleRepo, Visibility } from "@/data/core";

/**
 * Tasks & chores — everything the family must actually do.
 *
 * One entity does the work of five: a task is a school-run reminder, a
 * recurring chore worth Sprouts, a milestone step on a goal, a packing job on
 * a trip and the "Buy X" a parent approved in Finance. What changes between
 * them is which links are set and whether `isChore` is true — not the shape —
 * so the list, the board and the calendar all read one array, and a task can
 * always be pointed at a goal and a value.
 *
 * The economy around chores is deliberately small and auditable: a chore is
 * worth `sprouts`, completing it writes ONE ledger entry naming its source,
 * and a reward is redeemed by writing the negative entry. Nothing anywhere
 * adds to a child's balance without a row in `ledger` to explain it.
 */

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

/** The Kanban columns, in board order. */
export type TaskStatus = "todo" | "doing" | "done" | "waiting";

export const STATUS_ORDER: TaskStatus[] = ["todo", "doing", "done", "waiting"];

export const STATUS_LABEL: Record<TaskStatus, string> = {
    todo: "To do",
    doing: "Doing",
    done: "Done",
    waiting: "Waiting",
};

export type TaskPriority = "low" | "normal" | "high";

export const PRIORITY_LABEL: Record<TaskPriority, string> = { low: "Low", normal: "Normal", high: "High" };

/** What kind of thing this is — the filter a family actually thinks in. */
export type TaskKind = "task" | "chore" | "errand" | "maintenance";

export const KIND_LABEL: Record<TaskKind, string> = {
    task: "Task",
    chore: "Chore",
    errand: "Errand",
    maintenance: "Maintenance",
};

/**
 * Whose job it is, in the family's words: "me" is mine alone (the only scope
 * a child may create), "us" is the parents' shared load, "family" is everyone.
 */
export type TaskScope = "me" | "us" | "family";

export const SCOPE_LABEL: Record<TaskScope, string> = { me: "Me", us: "Us", family: "Family" };

/** Where a task came from — shown on the task so nothing appears by magic. */
export type TaskSource = "manual" | "recurrence" | "rota" | "purchase" | "wardrobe" | "briefing" | "ai";

export const SOURCE_LABEL: Record<TaskSource, string> = {
    manual: "Added by hand",
    recurrence: "Repeats",
    rota: "From the rota",
    purchase: "From an approved purchase",
    wardrobe: "From the wardrobe",
    briefing: "From planning notes",
    ai: "Suggested by the companion",
};

/** A recurrence rule, kept small enough that a person can read it aloud. */
export interface RecurRule {
    freq: "daily" | "weekly" | "monthly";
    /** Every N days/weeks/months. */
    interval: number;
    /** 0–6 (Sunday = 0) for weekly rules. */
    weekday: number | null;
    /** 1–28 for monthly rules. */
    monthDay: number | null;
}

export interface ChecklistItem {
    id: string;
    text: string;
    done: boolean;
    order: number;
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export interface Task {
    id: string;
    title: string;
    notes: string;
    /** Empty = the whole family. */
    assigneeMemberIds: string[];
    /** ISO datetime; `allDay` means only the date half matters. */
    dueAt: string | null;
    allDay: boolean;
    priority: TaskPriority;
    scope: TaskScope;
    kind: TaskKind;

    /** Cross-module links — ids only; we never import another module's repo. */
    goalId: string | null;
    /** Denormalised so a task reads properly before Goals has loaded. */
    goalLabel: string;
    milestoneId: string | null;
    milestoneLabel: string;
    projectId: string | null;
    tripId: string | null;
    curriculumId: string | null;
    /** One of the space's values, by name ("Diligence"). */
    valueId: string | null;

    status: TaskStatus;
    /** Position within its Kanban column; lower is higher up. */
    kanbanOrder: number;
    rrule: RecurRule | null;

    /** Chores are the ones worth Sprouts. */
    isChore: boolean;
    sprouts: number;
    /** A chore that needs a photo before the Sprouts are credited. */
    needsProof: boolean;
    proofUrl: string | null;
    proofSubmittedAt: string | null;
    proofApprovedBy: string | null;

    sourceType: TaskSource;
    sourceId: string | null;
    droppedReason: string | null;

    checklist: ChecklistItem[];
    /** Reminders a parent sent by hand; the automatic ones are derived from the date. */
    remindersSent: number;

    ownerMemberId: string | null;
    visibility: Visibility;
    sharedWith: string[];
    /** A family task children may see on the chores board. */
    childSafe: boolean;

    doneAt: string | null;
    doneBy: string | null;
    createdBy: string;
    createdAt: string;
}

// ---------------------------------------------------------------------------
// Rota, ledger, rewards
// ---------------------------------------------------------------------------

/** A chore that takes turns: "Empty dishwasher", Dami ↔ Tobi, weekly. */
export interface ChoreRota {
    id: string;
    name: string;
    /** The recurring chore this rota reassigns. */
    taskId: string;
    memberIds: string[];
    rotation: "weekly" | "fortnightly";
    currentIndex: number;
    /** ISO date the next turn starts (always the family's planning day). */
    nextRotateAt: string;
    createdAt: string;
}

export type LedgerSource = "chore" | "reward" | "adjustment" | "opening";

/** Every movement of Sprouts, with the record that caused it (AC 5). */
export interface SproutsEntry {
    id: string;
    memberId: string;
    delta: number;
    sourceType: LedgerSource;
    sourceId: string | null;
    note: string;
    at: string;
}

export type RewardKind = "treat" | "screen" | "outing" | "money" | "privilege";

export const REWARD_KIND_LABEL: Record<RewardKind, string> = {
    treat: "Treat",
    screen: "Screen time",
    outing: "Outing",
    money: "Pocket money",
    privilege: "Privilege",
};

export interface Reward {
    id: string;
    name: string;
    note: string;
    costSprouts: number;
    kind: RewardKind;
    imageUrl: string | null;
    active: boolean;
    createdAt: string;
}

export type RedemptionStatus = "requested" | "approved" | "declined" | "fulfilled";

export interface Redemption {
    id: string;
    rewardId: string;
    memberId: string;
    status: RedemptionStatus;
    /** What it cost when it was approved (a price change never re-bills). */
    costSprouts: number;
    decidedBy: string | null;
    note: string;
    at: string;
    decidedAt: string | null;
}

// ---------------------------------------------------------------------------
// Cross-module read-outs
// ---------------------------------------------------------------------------

/**
 * What Goals reads off our slice instead of importing our maths (AC 7): the
 * tasks pointed at a milestone, and how many of them are done. A goal computes
 * its own progress from its milestones' done flags; this is the other half —
 * the work actually happening under each one.
 */
export interface MilestoneTaskProgress {
    goalId: string | null;
    milestoneId: string;
    label: string;
    done: number;
    total: number;
    pct: number;
}

export interface GoalTaskProgress {
    goalId: string;
    label: string;
    done: number;
    total: number;
    pct: number;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface TasksState {
    tasks: Task[];
    rotas: ChoreRota[];
    ledger: SproutsEntry[];
    rewards: Reward[];
    redemptions: Redemption[];
    /** Derived in `visibleTo` so both repos hand the screens the same shape. */
    milestoneProgress: MilestoneTaskProgress[];
    goalProgress: GoalTaskProgress[];
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export interface NewTaskInput {
    title: string;
    notes?: string;
    assigneeMemberIds?: string[];
    dueAt?: string | null;
    allDay?: boolean;
    priority?: TaskPriority;
    scope?: TaskScope;
    kind?: TaskKind;
    goalId?: string | null;
    goalLabel?: string;
    milestoneId?: string | null;
    milestoneLabel?: string;
    projectId?: string | null;
    tripId?: string | null;
    curriculumId?: string | null;
    valueId?: string | null;
    status?: TaskStatus;
    rrule?: RecurRule | null;
    isChore?: boolean;
    sprouts?: number;
    needsProof?: boolean;
    visibility?: Visibility;
    sharedWith?: string[];
    childSafe?: boolean;
    checklist?: string[];
    sourceType?: TaskSource;
    sourceId?: string | null;
}

/**
 * What a completion did, so the page can finish the job: credit Sprouts to the
 * core points balance, celebrate, and tell the person what happens next.
 */
export interface CompleteResult {
    taskId: string;
    /** Sprouts actually credited now (0 when a photo is still awaited). */
    sprouts: number;
    memberId: string | null;
    /** True when the chore needs a parent to approve the photo first. */
    awaitingApproval: boolean;
    /** The instance the recurrence rule generated, if any. */
    nextTaskId: string | null;
    nextDueAt: string | null;
    milestoneId: string | null;
}

export interface RedeemResult {
    redemptionId: string;
    memberId: string;
    /** Negative when Sprouts were deducted on approval. */
    sproutsDelta: number;
    rewardName: string;
}

export interface TasksRepo extends ModuleRepo<TasksState> {
    createTask(input: NewTaskInput): Promise<Task>;
    updateTask(id: string, patch: Partial<Task>): Promise<void>;
    removeTask(id: string): Promise<void>;
    /** Move between columns and persist the order within the target column (AC 6). */
    moveTask(id: string, status: TaskStatus, toIndex: number): Promise<void>;
    completeTask(id: string, byMemberId?: string): Promise<CompleteResult>;
    reopenTask(id: string): Promise<void>;
    dropTask(id: string, reason: string): Promise<void>;
    /** A parent's manual nudge; three of them park the task (AC 8). */
    remind(id: string): Promise<void>;
    setChecklistItem(taskId: string, itemId: string, done: boolean): Promise<void>;
    addChecklistItem(taskId: string, text: string): Promise<void>;
    removeChecklistItem(taskId: string, itemId: string): Promise<void>;
    /** A child attaches the photo; the Sprouts wait for a parent (AC 4). */
    submitProof(taskId: string, imageUrl: string): Promise<void>;
    approveProof(taskId: string): Promise<CompleteResult>;
    declineProof(taskId: string, reason: string): Promise<void>;
    bulkAssign(ids: string[], memberIds: string[]): Promise<void>;
    linkToGoal(id: string, goalId: string | null, goalLabel: string): Promise<void>;

    createRota(name: string, taskId: string, memberIds: string[], rotation: ChoreRota["rotation"]): Promise<ChoreRota>;
    removeRota(id: string): Promise<void>;
    /** Advance one rota by hand. */
    rotateRota(id: string): Promise<void>;
    /** Advance every rota whose turn has come (the planning day, AC 2). */
    runDueRotations(): Promise<number>;

    createReward(input: { name: string; note?: string; costSprouts: number; kind: RewardKind; imageUrl?: string | null }): Promise<Reward>;
    updateReward(id: string, patch: Partial<Reward>): Promise<void>;
    removeReward(id: string): Promise<void>;
    requestReward(rewardId: string, note?: string): Promise<Redemption>;
    decideRedemption(id: string, approve: boolean, note?: string): Promise<RedeemResult>;
    fulfilRedemption(id: string): Promise<void>;
    adjustSprouts(memberId: string, delta: number, note: string): Promise<void>;
}

/** Reminders before a task parks itself in Needs attention (the calm rule). */
export const REMINDERS_BEFORE_PARK = 3;
