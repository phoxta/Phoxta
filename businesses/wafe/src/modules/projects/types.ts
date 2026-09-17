import type { ModuleRepo, Visibility } from "@/data/core";

/**
 * Projects & research vault — the bigger pieces of work, and the thinking
 * that goes into them.
 *
 * A project is the place a family puts everything that belongs to one effort:
 * a board of the work, a timeline, a budget line, the clippings and notes it
 * was researched from, the comparison table that weighed the options, and the
 * decision record that says what was chosen and why. The kitchen refresh, the
 * sixth-form search, Tobi's science fair and Ifeoluwa's consultancy sprint are all
 * the same shape — what changes is who is on it, what it is linked to and how
 * private it is.
 *
 * Three deliberate constraints:
 *
 *  1. A project owns its own CARDS. The Tasks module owns tasks, and a module
 *     never writes another module's rows; a task that carries `projectId` is
 *     read (never written) from the tasks slice and shown on this board beside
 *     the project's own cards, so the board is one board without a cross-write.
 *  2. ARCHIVED IS READ-ONLY, for everyone, parents included. The guard is on
 *     the write in both repos — a screen that forgets to hide a button still
 *     cannot change an archived project.
 *  3. Notes carry a SENSITIVITY class as well as a visibility. A child's slice
 *     contains only child-safe rows and only notes classed `general`; the
 *     filter runs in `visibleTo()` before anything reaches a screen.
 */

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

export type ProjectStatus = "planning" | "active" | "paused" | "done";

export const PROJECT_STATUS: ProjectStatus[] = ["planning", "active", "paused", "done"];

export const STATUS_LABEL: Record<ProjectStatus, string> = {
    planning: "Planning",
    active: "Active",
    paused: "Paused",
    done: "Finished",
};

/** What kind of effort this is, in the family's own words. */
export type ProjectKind = "home" | "family" | "school" | "business" | "trip" | "creative";

export const KIND_LABEL: Record<ProjectKind, string> = {
    home: "Home",
    family: "Family",
    school: "School",
    business: "Business",
    trip: "Trip",
    creative: "Creative",
};

/** The board columns, in order. */
export type CardStatus = "todo" | "doing" | "done";

export const CARD_STATUS: CardStatus[] = ["todo", "doing", "done"];

export const CARD_STATUS_LABEL: Record<CardStatus, string> = { todo: "To do", doing: "Doing", done: "Done" };

/** A person's part in a project. An owner may run it; a watcher only reads. */
export type ProjectRole = "owner" | "member" | "watcher";

export const PROJECT_ROLE_LABEL: Record<ProjectRole, string> = { owner: "Owner", member: "Member", watcher: "Watcher" };

/**
 * The sensitivity classes from the brief. Anything but `general` is kept out
 * of a child's and a guest's slice entirely, whatever its visibility says.
 */
export type Sensitivity = "general" | "financial" | "health" | "documents" | "private";

export const SENSITIVITY_LABEL: Record<Sensitivity, string> = {
    general: "General",
    financial: "Financial",
    health: "Health",
    documents: "Documents",
    private: "Private",
};

/** Where the readable snapshot on a clip came from — always shown, never guessed. */
export type SnapshotSource = "selection" | "companion" | "typed";

export const SNAPSHOT_LABEL: Record<SnapshotSource, string> = {
    selection: "Captured from the page",
    companion: "Read back by the companion",
    typed: "Typed in by hand",
};

export interface ChecklistItem {
    id: string;
    text: string;
    done: boolean;
}

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

export interface ProjectMember {
    memberId: string;
    role: ProjectRole;
}

export interface Project {
    id: string;
    spaceId: string;
    title: string;
    summary: string;
    kind: ProjectKind;
    status: ProjectStatus;
    ownerMemberId: string;
    members: ProjectMember[];
    startDate: string;
    /** Null when it runs until it is done. */
    endDate: string | null;
    coverUrl: string | null;

    /** The money side: our own budget, and the Finance category it spends from. */
    budgetCents: number | null;
    financeCategoryId: string | null;
    /** Denormalised so the budget line reads properly before Finance has loaded. */
    financeCategoryLabel: string;

    /** Cross-module links — ids only; we never import another module's repo. */
    goalId: string | null;
    goalLabel: string;
    tripId: string | null;
    /** One of the space's values, by name ("Diligence"). */
    valueId: string | null;

    tags: string[];
    visibility: Visibility;
    sharedWith: string[];
    childSafe: boolean;

    archived: boolean;
    archivedAt: string | null;

    /** The headline decision shown on the project header. */
    decisionId: string | null;
    createdAt: string;
}

/**
 * A card on the project board. It is the project's own row: the Tasks module
 * owns tasks, and a task that names this project is shown beside these cards
 * without either module writing the other's table.
 */
export interface ProjectCard {
    id: string;
    spaceId: string;
    projectId: string;
    title: string;
    notes: string;
    assigneeMemberIds: string[];
    dueAt: string | null;
    status: CardStatus;
    /** Position in its column; lower is higher up. */
    order: number;
    checklist: ChecklistItem[];
    childSafe: boolean;
    doneAt: string | null;
    createdAt: string;
}

/** A cost booked against the project — a quote, a deposit, an invoice. */
export interface ProjectCost {
    id: string;
    spaceId: string;
    projectId: string;
    label: string;
    amountCents: number;
    paidOn: string;
    /** "quote", "deposit", "paid" — what stage this money is at. */
    stage: "quote" | "deposit" | "paid";
    createdAt: string;
}

/** A clipping from the web, with the readable snapshot that makes it useful offline. */
export interface Clip {
    id: string;
    spaceId: string;
    /** Null = it lives in the vault without a project yet. */
    projectId: string | null;
    folder: string;
    url: string;
    title: string;
    excerpt: string;
    imageUrl: string | null;
    snapshotText: string;
    snapshotSource: SnapshotSource;
    tags: string[];
    savedBy: string;
    visibility: Visibility;
    sharedWith: string[];
    childSafe: boolean;
    createdAt: string;
}

export type NoteBlockType = "h" | "p" | "ul" | "todo" | "quote";

export interface NoteBlock {
    id: string;
    type: NoteBlockType;
    text: string;
    done: boolean;
}

export interface Note {
    id: string;
    spaceId: string;
    projectId: string | null;
    folder: string;
    title: string;
    blocks: NoteBlock[];
    tags: string[];
    sensitivity: Sensitivity;
    ownerMemberId: string;
    visibility: Visibility;
    sharedWith: string[];
    childSafe: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Criterion {
    key: string;
    label: string;
    /** 1–5: how much this one matters. */
    weight: number;
}

export interface ComparisonOption {
    key: string;
    label: string;
    note: string;
    link: string;
}

export interface Comparison {
    id: string;
    spaceId: string;
    projectId: string;
    title: string;
    criteria: Criterion[];
    options: ComparisonOption[];
    createdAt: string;
}

export interface ComparisonScore {
    comparisonId: string;
    optionKey: string;
    criterionKey: string;
    /** 0–10. */
    score: number;
}

export interface Decision {
    id: string;
    spaceId: string;
    projectId: string;
    comparisonId: string | null;
    /** "The local joiner" — what was chosen. */
    decision: string;
    because: string;
    decidedBy: string;
    decidedAt: string;
}

// ---------------------------------------------------------------------------
// Derived shapes the screens read
// ---------------------------------------------------------------------------

/** One row of a comparison's live ranking. */
export interface RankedOption {
    option: ComparisonOption;
    /** Weighted total, 0–100. */
    total: number;
    /** Per-criterion raw scores, keyed by criterion key. */
    scores: Record<string, number>;
    rank: number;
    /** True when nothing has been scored for this option yet. */
    unscored: boolean;
}

/** The project's money line: what we set aside, and what has gone. */
export interface BudgetLine {
    budgetCents: number;
    spentCents: number;
    pct: number;
    /** Where `spentCents` came from, said plainly on the screen. */
    source: "finance" | "costs" | "none";
    label: string;
    over: boolean;
}

/** A task from the Tasks module that names this project (read-only). */
export interface LinkedTask {
    id: string;
    title: string;
    status: string;
    dueAt: string | null;
    assigneeMemberIds: string[];
    done: boolean;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface ProjectsState {
    projects: Project[];
    cards: ProjectCard[];
    costs: ProjectCost[];
    clips: Clip[];
    notes: Note[];
    comparisons: Comparison[];
    scores: ComparisonScore[];
    decisions: Decision[];
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export interface NewProject {
    title: string;
    summary?: string;
    kind?: ProjectKind;
    status?: ProjectStatus;
    ownerMemberId?: string;
    memberIds?: string[];
    startDate?: string;
    endDate?: string | null;
    coverUrl?: string | null;
    budgetCents?: number | null;
    financeCategoryId?: string | null;
    financeCategoryLabel?: string;
    goalId?: string | null;
    goalLabel?: string;
    tripId?: string | null;
    valueId?: string | null;
    tags?: string[];
    visibility?: Visibility;
    sharedWith?: string[];
    childSafe?: boolean;
}

export interface NewCard {
    projectId: string;
    title: string;
    notes?: string;
    assigneeMemberIds?: string[];
    dueAt?: string | null;
    status?: CardStatus;
    checklist?: string[];
    childSafe?: boolean;
}

export interface NewClip {
    projectId?: string | null;
    folder?: string;
    url: string;
    title?: string;
    excerpt?: string;
    imageUrl?: string | null;
    /** The readable text; when empty the repo builds one from the excerpt. */
    snapshotText?: string;
    snapshotSource?: SnapshotSource;
    tags?: string[];
    visibility?: Visibility;
    sharedWith?: string[];
    childSafe?: boolean;
}

export interface NewNote {
    projectId?: string | null;
    folder?: string;
    title: string;
    blocks?: NoteBlock[];
    tags?: string[];
    sensitivity?: Sensitivity;
    visibility?: Visibility;
    sharedWith?: string[];
    childSafe?: boolean;
}

export interface NewComparison {
    projectId: string;
    title: string;
    criteria: Array<{ label: string; weight?: number }>;
    options: Array<{ label: string; note?: string; link?: string }>;
}

export interface NewDecision {
    projectId: string;
    comparisonId?: string | null;
    decision: string;
    because: string;
    /** Make this the decision shown on the project header. */
    headline?: boolean;
}

export interface ProjectsRepo extends ModuleRepo<ProjectsState> {
    createProject(input: NewProject): Promise<Project>;
    updateProject(id: string, patch: Partial<Omit<Project, "id" | "spaceId" | "createdAt">>): Promise<void>;
    removeProject(id: string): Promise<void>;
    /** Archived projects are read-only for everyone (AC 5). */
    setArchived(id: string, archived: boolean): Promise<void>;
    setMemberRole(projectId: string, memberId: string, role: ProjectRole | null): Promise<void>;

    addCard(input: NewCard): Promise<ProjectCard>;
    updateCard(id: string, patch: Partial<Pick<ProjectCard, "title" | "notes" | "assigneeMemberIds" | "dueAt" | "childSafe">>): Promise<void>;
    /** Move between columns, keeping the order within the target column. */
    moveCard(id: string, status: CardStatus, toIndex: number): Promise<void>;
    /** Returns the points a child earns for finishing it, for the page to credit. */
    completeCard(id: string, done: boolean): Promise<{ cardId: string; memberIds: string[]; points: number }>;
    removeCard(id: string): Promise<void>;
    addCheck(cardId: string, text: string): Promise<void>;
    setCheck(cardId: string, itemId: string, done: boolean): Promise<void>;
    removeCheck(cardId: string, itemId: string): Promise<void>;

    addCost(projectId: string, input: { label: string; amountCents: number; paidOn?: string; stage?: ProjectCost["stage"] }): Promise<ProjectCost>;
    removeCost(id: string): Promise<void>;

    /** The clipper: stores the readable snapshot and the image with the row (AC 1). */
    saveClip(input: NewClip): Promise<Clip>;
    updateClip(id: string, patch: Partial<Pick<Clip, "title" | "excerpt" | "folder" | "tags" | "projectId" | "snapshotText" | "snapshotSource" | "imageUrl" | "visibility" | "sharedWith" | "childSafe">>): Promise<void>;
    removeClip(id: string): Promise<void>;

    createNote(input: NewNote): Promise<Note>;
    updateNote(id: string, patch: Partial<Pick<Note, "title" | "blocks" | "tags" | "folder" | "sensitivity" | "projectId" | "visibility" | "sharedWith" | "childSafe">>): Promise<void>;
    removeNote(id: string): Promise<void>;

    createComparison(input: NewComparison): Promise<Comparison>;
    updateComparison(id: string, patch: Partial<Pick<Comparison, "title" | "criteria" | "options">>): Promise<void>;
    removeComparison(id: string): Promise<void>;
    /** Scores drive the ranking; the table recomputes from state (AC 2). */
    setScore(comparisonId: string, optionKey: string, criterionKey: string, score: number): Promise<void>;

    /** A decision record, usually made from a comparison's winner (AC 4). */
    recordDecision(input: NewDecision): Promise<Decision>;
    removeDecision(id: string): Promise<void>;
}

/** Points a child earns for finishing a card on a project they are on. */
export const CARD_POINTS = 5;
