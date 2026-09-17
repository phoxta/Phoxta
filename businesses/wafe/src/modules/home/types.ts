import type { ModuleRepo, Visibility } from "@/data/core";

/**
 * Home — the family's command centre.
 *
 * Home owns very little data and reads a great deal: the dashboards are
 * composed from every other module's contributions. What Home stores is the
 * RITUAL — the daily briefing it wrote for you, the evening check-in you
 * answered, the Sunday planning that set this week's focus, the family
 * timeline that makes "On this day" possible, and which attention items the
 * family has already dealt with.
 */

export type When = "morning" | "midday" | "evening";

/**
 * The briefing a member was given on a day — generated once, then cached.
 *
 * The identity is (member, date). `when` records which part of the day wrote
 * it, so the card can say "your morning briefing" at four in the afternoon,
 * but it is NOT part of the key: keying on it would let one member collect
 * three briefings — and spend three AI calls — on a single day.
 */
export interface Briefing {
    id: string;
    memberId: string;
    /** YYYY-MM-DD. */
    date: string;
    /** The slot that generated it — morning, midday or evening. */
    when: When;
    text: string;
    /** What fed it, shown as chips: "3 tasks due today", "Groceries 82%". */
    sources: string[];
    /** `template` means the companion was unavailable and we wrote it ourselves. */
    kind: "ai" | "template";
    generatedAt: string;
}

/** What the member decided to do about something they did not finish. */
export interface Decision {
    taskId: string;
    title: string;
    action: "reschedule" | "delegate" | "drop";
    /** For a delegation. */
    toMemberId: string | null;
    /** For a reschedule (YYYY-MM-DD). */
    toDate: string | null;
    /** The sentence shown back to the family ("Dropped at check-in"). */
    note: string;
    /** True when Tasks accepted the same change (see peek.applyTaskDecision). */
    applied: boolean;
}

/** One evening check-in. Exactly one row per member per day. */
export interface CheckIn {
    id: string;
    memberId: string;
    date: string;
    /** 1–5 hearts. */
    mood: number;
    gratitude: string;
    prayer: string;
    /** The three questions the companion asked (or our own three). */
    questions: string[];
    decisions: Decision[];
    summary: string;
    createdAt: string;
}

/** Sunday planning: the week's three priorities and last week's numbers. */
export interface WeeklyReview {
    id: string;
    /** Monday-anchored YYYY-MM-DD — the week this focus is FOR. */
    weekStart: string;
    hostMemberId: string;
    /** Up to three, in order. */
    priorities: string[];
    tasksPlanned: number;
    tasksDone: number;
    prayersAnswered: number;
    notes: string;
    completedAt: string | null;
}

/** A family-timeline entry — what makes "On this day" possible. */
export interface Milestone {
    id: string;
    /** The date it happened, in its own year. */
    date: string;
    title: string;
    body: string;
    /** Where the album or timeline entry lives. */
    href: string;
    photoUrl?: string;
    memberIds: string[];
    ownerMemberId: string | null;
    visibility: Visibility;
    sharedWith: string[];
}

export interface HomeState {
    briefings: Briefing[];
    checkIns: CheckIn[];
    reviews: WeeklyReview[];
    milestones: Milestone[];
    /** Attention keys the family has marked dealt with. */
    resolved: string[];
}

export interface NewBriefing {
    date: string;
    when: When;
    text: string;
    sources: string[];
    kind: Briefing["kind"];
}

export interface NewCheckIn {
    date: string;
    mood: number;
    gratitude: string;
    prayer: string;
    questions: string[];
    decisions: Decision[];
    summary: string;
}

export interface NewReview {
    weekStart: string;
    priorities: string[];
    notes: string;
    tasksPlanned: number;
    tasksDone: number;
    prayersAnswered: number;
    completed: boolean;
}

export interface HomeRepo extends ModuleRepo<HomeState> {
    /** Upsert on (member, date) — a briefing is generated once a day. */
    saveBriefing(input: NewBriefing): Promise<Briefing>;
    /** Upsert on (member, date) — a second submission updates the row. */
    saveCheckIn(input: NewCheckIn): Promise<CheckIn>;
    deleteCheckIn(id: string): Promise<void>;
    /** Upsert on weekStart. Parents only. */
    saveReview(input: NewReview): Promise<WeeklyReview>;
    /** Mark an attention item dealt with (or bring it back). Parents only. */
    setAttentionResolved(key: string, resolved: boolean): Promise<void>;
}
