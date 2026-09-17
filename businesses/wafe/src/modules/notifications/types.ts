import type { ModuleRepo, NotificationKind } from "@/data/core";

/**
 * Notification centre & follow-up engine.
 *
 * Two things live here. The INBOX is one calm list of everything that needs a
 * person — the rows this module's engine raised, merged with the shell's own
 * notifications so a member has exactly one place to look. The ENGINE is the
 * set of rules that produced them: data a parent can edit, with a schedule, an
 * idempotency key, a reminder cap, quiet hours and a daily ceiling.
 *
 * The engine's promises, in order, are encoded in `planRaise` (derive.ts):
 *   blocked → muted → duplicate → parked → digest → held → delivered
 * and every attempt — delivered or not — is written to the history, so the
 * family can see why something did (or did not) reach them.
 */

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

/** How a notification reaches a person. In-app is the floor and never off. */
export type Channel = "in-app" | "email" | "push";

/** Off — never bundle. Auto — bundle past the daily ceiling. Always — one evening email. */
export type DigestMode = "off" | "auto" | "always";

/**
 * The brief's sensitivity classes. Anything but `general` is withheld from
 * children and guests — the engine will not even raise it, which is the
 * client-side twin of the row-level policy in sql/notifications.sql.
 */
export type Sensitivity = "general" | "financial" | "health" | "documents" | "private" | "settings";

/** Who a rule addresses. The engine fans out to the members this resolves to. */
export type RecipientRole = "parents" | "assignee" | "owner" | "child" | "guest" | "everyone";

/** The scheduled job that evaluates a rule (criterion: every rule has one). */
export type JobSchedule = "on-change" | "hourly" | "daily-07:00" | "daily-18:00" | "weekly-sun-17:00";

export const JOB_LABEL: Record<JobSchedule, string> = {
    "on-change": "The moment the record changes",
    hourly: "Every hour",
    "daily-07:00": "Every morning at 07:00",
    "daily-18:00": "Every evening at 18:00",
    "weekly-sun-17:00": "Sundays at 17:00",
};

/** The window an idempotency key covers: one a day, one a week, or once ever. */
export type WindowUnit = "day" | "week" | "once";

/** What happened when the engine tried to raise a nudge. */
export type Outcome = "delivered" | "duplicate" | "held" | "digest" | "muted" | "parked" | "blocked";

export const OUTCOME_LABEL: Record<Outcome, string> = {
    delivered: "Delivered",
    duplicate: "Already sent in this window",
    held: "Held by quiet hours",
    digest: "Rolled into the digest",
    muted: "Muted category",
    parked: "Parked in Needs attention",
    blocked: "Not allowed",
};

/** An action offered on the row itself, so the inbox is where the thing gets done. */
export type ActionKind = "complete" | "approve" | "decline" | "rsvp" | "open";

export interface InlineAction {
    kind: ActionKind;
    label: string;
    /** Past tense, shown once the row is acted: "Marked done". */
    done: string;
}

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

/** One notification this module raised (wf_notification_items). */
export interface NotifItem {
    id: string;
    spaceId: string;
    memberId: string;
    /** The rule that produced it — stable across demo and live. */
    ruleKey: string | null;
    kind: NotificationKind;
    sensitivity: Sensitivity;
    recordType: string | null;
    recordId: string | null;
    /**
     * The record's own title, so the completion path in bridge.ts can still find
     * the row when the id it was raised with is not the id the owning module
     * generated (the demo seed cannot know those). Live rows always carry a real
     * `recordId`; this is the belt to that pair of braces, and it doubles as the
     * plain-English name shown before an inline action is confirmed.
     */
    recordTitle: string | null;
    title: string;
    body: string;
    href: string | null;
    channel: Channel;
    /** rule | record | member | window — unique, so a window can only fire once. */
    idempotencyKey: string;
    /** 1, 2, 3 … up to the rule's cap. */
    reminderNumber: number;
    /** True once the rule ran out of reminders: it stops nudging and sits here. */
    needsAttention: boolean;
    action: InlineAction | null;
    /** What the member chose when they acted ("Approved", "Marked done"). */
    actionOutcome: string | null;
    readAt: string | null;
    snoozedUntil: string | null;
    actedAt: string | null;
    /** Held by quiet hours until this time. Never dropped, only deferred. */
    deferredUntil: string | null;
    /** Bundled into this day's digest (YYYY-MM-DD) instead of arriving alone. */
    digestFor: string | null;
    /** Raised from the rule tester, so it can be cleared again. */
    isTest: boolean;
    createdAt: string;
}

/**
 * The snooze/acted overlay for the SHELL's own notifications (wf_notifications
 * belongs to the foundation; this module adds what an inbox needs without
 * touching it).
 */
export interface NotifMark {
    notificationId: string;
    memberId: string;
    snoozedUntil: string | null;
    actedAt: string | null;
}

/** Per-member delivery preferences (wf_notification_prefs). */
export interface NotifPrefs {
    memberId: string;
    /** In-app is always on; kept for the live row's shape and the settings copy. */
    inApp: boolean;
    email: boolean;
    push: boolean;
    /** Local "HH:MM"; the window wraps midnight when start > end. */
    quietStart: string;
    quietEnd: string;
    digestMode: DigestMode;
    digestAt: string;
    mutedKinds: NotificationKind[];
    timezone: string;
}

/** A follow-up rule, as data (wf_follow_up_rules + the org catalogue). */
export interface FollowUpRule {
    ruleKey: string;
    label: string;
    /** Plain English: what makes this fire. */
    trigger: string;
    /** The module that owns the record and raises it. */
    moduleId: string;
    kind: NotificationKind;
    sensitivity: Sensitivity;
    recipientRole: RecipientRole;
    job: JobSchedule;
    windowUnit: WindowUnit;
    maxReminders: number;
    escalateTo: RecipientRole | null;
    enabled: boolean;
}

/** What a parent changed about a rule; the rest comes from the catalogue. */
export interface RuleOverride {
    ruleKey: string;
    enabled?: boolean;
    maxReminders?: number;
    recipientRole?: RecipientRole;
}

/** Every attempt the engine made, delivered or not (wf_nudge_history). */
export interface NudgeEntry {
    id: string;
    ruleKey: string;
    recordId: string | null;
    memberId: string;
    reminderNumber: number;
    outcome: Outcome;
    note: string;
    sentAt: string;
}

// ---------------------------------------------------------------------------
// State + repo
// ---------------------------------------------------------------------------

export interface NotificationsState {
    /** This member's items (plus their children's, for a parent). */
    items: NotifItem[];
    marks: NotifMark[];
    prefs: NotifPrefs[];
    /** The catalogue with the family's overrides already applied. */
    rules: FollowUpRule[];
    history: NudgeEntry[];
}

/** What a rule hands the engine when it fires. */
export interface RaiseInput {
    memberId: string;
    ruleKey: string;
    title: string;
    body: string;
    href?: string | null;
    recordType?: string | null;
    recordId?: string | null;
    recordTitle?: string | null;
    action?: InlineAction | null;
    /** Pretend the engine ran at this moment (the rule tester's "what would happen at 23:00"). */
    at?: string;
    isTest?: boolean;
}

export interface RaiseResult {
    outcome: Outcome;
    note: string;
    itemId: string | null;
}

export interface NotificationsRepo extends ModuleRepo<NotificationsState> {
    /** The engine's one door: every rule raises through here. */
    raise(input: RaiseInput): Promise<RaiseResult>;
    markRead(ids: string[]): Promise<void>;
    markAllRead(memberId: string): Promise<void>;
    /** `until` is null to wake it now. Works for engine rows and shell rows alike. */
    snooze(id: string, until: string | null, memberId: string): Promise<void>;
    act(id: string, outcome: string, memberId: string): Promise<void>;
    remove(id: string): Promise<void>;
    clearTests(): Promise<void>;
    setPrefs(memberId: string, patch: Partial<Omit<NotifPrefs, "memberId">>): Promise<void>;
    setRule(ruleKey: string, patch: RuleOverride): Promise<void>;
    resetRules(): Promise<void>;
}
