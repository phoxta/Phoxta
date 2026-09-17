import type { AttentionItem, ChildCard, DashboardContribution, Member, Notification, NotificationKind, Nudge, RepoContext } from "@/data/core";
import { dayKey, isoDate, weekStart } from "@/lib/format";
import type { Channel, FollowUpRule, InlineAction, NotifItem, NotifMark, NotifPrefs, NotificationsState, Outcome, RaiseInput, RuleOverride, Sensitivity } from "./types";

/**
 * Every number and every decision the notification centre makes, as pure
 * functions of state — so the demo repo and the live repo behave identically
 * and the screens never re-implement a rule.
 *
 * The important one is `planRaise`: given a rule, a recipient, their
 * preferences and what has already been sent, it returns exactly what the
 * engine should do. Both repos apply that plan and nothing else.
 */

export const MODULE_PATH = "/home/notifications";
export const SETTINGS_PATH = "/home/notifications/settings";

/** The daily ceiling from the brief: past five, the rest becomes a digest. */
export const DAILY_CEILING = 5;

/** Sensitivity classes a child or a guest is never notified about. */
const RESTRICTED: ReadonlySet<Sensitivity> = new Set<Sensitivity>(["financial", "health", "documents", "private", "settings"]);

export const KIND_LABEL: Record<NotificationKind, string> = {
    task: "Tasks & chores",
    goal: "Goals",
    event: "Calendar",
    learning: "Learning",
    prayer: "Faith",
    finance: "Money",
    travel: "Travel",
    wellness: "Wellbeing",
    family: "Family",
    celebrate: "Celebrations",
    briefing: "Briefings",
};

export const ALL_KINDS: NotificationKind[] = ["task", "goal", "event", "learning", "prayer", "finance", "travel", "wellness", "family", "celebrate", "briefing"];

// ---------------------------------------------------------------------------
// Time — quiet hours, windows
// ---------------------------------------------------------------------------

/** Minutes past local midnight for "HH:MM". */
export function minutesOf(hhmm: string): number {
    const [h, m] = hhmm.split(":").map((x) => Number(x) || 0);
    return h * 60 + m;
}

/** "HH:MM" for an ISO instant, in the browser's (i.e. the family's) local time. */
export function hhmm(iso: string): string {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** The same clock time on the day of `iso`. */
export function atLocal(iso: string, time: string): string {
    const d = new Date(iso);
    const [h, m] = time.split(":").map((x) => Number(x) || 0);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
}

/** Is this instant inside the member's quiet hours? The window may wrap midnight. */
export function inQuietHours(iso: string, start: string, end: string): boolean {
    if (start === end) return false;
    const d = new Date(iso);
    const now = d.getHours() * 60 + d.getMinutes();
    const s = minutesOf(start);
    const e = minutesOf(end);
    return s < e ? now >= s && now < e : now >= s || now < e;
}

/** The next moment quiet hours end — where a held notification will land. */
export function nextOpenWindow(iso: string, end: string): string {
    const target = atLocal(iso, end);
    if (new Date(target).getTime() > new Date(iso).getTime()) return target;
    const d = new Date(target);
    d.setDate(d.getDate() + 1);
    return d.toISOString();
}

/** The window an idempotency key belongs to. */
export function windowKey(iso: string, unit: FollowUpRule["windowUnit"]): string {
    if (unit === "once") return "once";
    if (unit === "week") return `w${weekStart(iso)}`;
    return dayKey(iso);
}

export function idempotencyKey(ruleKey: string, recordId: string | null | undefined, memberId: string, iso: string, unit: FollowUpRule["windowUnit"]): string {
    return `${ruleKey}|${recordId ?? "-"}|${memberId}|${windowKey(iso, unit)}`;
}

// ---------------------------------------------------------------------------
// Rules: catalogue + a family's overrides
// ---------------------------------------------------------------------------

export function mergeRules(catalogue: FollowUpRule[], overrides: RuleOverride[]): FollowUpRule[] {
    const by = new Map(overrides.map((o) => [o.ruleKey, o]));
    return catalogue.map((r) => {
        const o = by.get(r.ruleKey);
        if (!o) return r;
        return {
            ...r,
            enabled: o.enabled ?? r.enabled,
            maxReminders: o.maxReminders ?? r.maxReminders,
            recipientRole: o.recipientRole ?? r.recipientRole,
        };
    });
}

export const ruleByKey = (rules: FollowUpRule[], key: string | null): FollowUpRule | undefined => (key ? rules.find((r) => r.ruleKey === key) : undefined);

/** Rules grouped by the job that evaluates them (every rule has exactly one). */
export function rulesByJob(rules: FollowUpRule[]): Array<{ job: FollowUpRule["job"]; rules: FollowUpRule[] }> {
    const order: FollowUpRule["job"][] = ["on-change", "hourly", "daily-07:00", "daily-18:00", "weekly-sun-17:00"];
    return order.map((job) => ({ job, rules: rules.filter((r) => r.job === job) })).filter((g) => g.rules.length > 0);
}

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

export function defaultPrefs(memberId: string, timezone = "Europe/London"): NotifPrefs {
    return { memberId, inApp: true, email: false, push: false, quietStart: "21:30", quietEnd: "07:00", digestMode: "auto", digestAt: "18:00", mutedKinds: [], timezone };
}

export function prefsFor(state: NotificationsState, memberId: string, timezone?: string): NotifPrefs {
    return state.prefs.find((p) => p.memberId === memberId) ?? defaultPrefs(memberId, timezone);
}

/** Children are in-app only, whatever the preference row says (brief + criterion 6). */
export function channelFor(member: Member | undefined, prefs: NotifPrefs): Channel {
    if (!member || member.role === "child") return "in-app";
    if (prefs.email) return "email";
    if (prefs.push) return "push";
    return "in-app";
}

// ---------------------------------------------------------------------------
// The engine
// ---------------------------------------------------------------------------

export interface RaisePlan {
    outcome: Outcome;
    note: string;
    channel: Channel;
    reminderNumber: number;
    deferredUntil: string | null;
    digestFor: string | null;
    idempotencyKey: string;
    /** Set when the outcome is "parked": the row that stops nudging and sits in Needs attention. */
    parkItemId: string | null;
    at: string;
}

/**
 * What the engine should do with one attempted nudge. Order matters: a rule
 * that is off never fires; a record the member cannot read never fires; a
 * muted category never fires; a window fires once; a fourth reminder parks the
 * item instead of nagging; past the daily ceiling it joins the digest; inside
 * quiet hours it waits for the morning. Nothing is ever dropped silently —
 * every branch is written to the history with a reason.
 */
export function planRaise(args: {
    input: RaiseInput;
    rule: FollowUpRule | undefined;
    recipient: Member | undefined;
    prefs: NotifPrefs;
    items: NotifItem[];
    history: { ruleKey: string; recordId: string | null; memberId: string; outcome: Outcome }[];
    now: string;
}): RaisePlan {
    const { input, rule, recipient, prefs, items, history } = args;
    const at = input.at ?? args.now;
    const channel = channelFor(recipient, prefs);
    const base: Omit<RaisePlan, "outcome" | "note"> = {
        channel,
        reminderNumber: 1,
        deferredUntil: null,
        digestFor: null,
        idempotencyKey: idempotencyKey(input.ruleKey, input.recordId ?? null, input.memberId, at, rule?.windowUnit ?? "day"),
        parkItemId: null,
        at,
    };

    if (!recipient) return { ...base, outcome: "blocked", note: "That person is no longer in the family." };
    if (!rule) return { ...base, outcome: "blocked", note: `No rule called "${input.ruleKey}" is registered.` };
    if (!rule.enabled) return { ...base, outcome: "blocked", note: `"${rule.label}" is switched off.` };

    // Criterion: nothing is delivered for a record the recipient cannot read.
    if (recipient.role !== "parent" && RESTRICTED.has(rule.sensitivity)) {
        return { ...base, outcome: "blocked", note: `${first(recipient)} can't read ${rule.sensitivity} records, so nothing was sent.` };
    }
    if (prefs.mutedKinds.includes(rule.kind)) {
        return { ...base, outcome: "muted", note: `${first(recipient)} muted ${KIND_LABEL[rule.kind]}.` };
    }

    const mine = items.filter((i) => i.memberId === input.memberId && i.ruleKey === rule.ruleKey && (i.recordId ?? null) === (input.recordId ?? null));
    if (mine.some((i) => i.idempotencyKey === base.idempotencyKey)) {
        return { ...base, outcome: "duplicate", note: `Already sent ${windowWord(rule.windowUnit)}.` };
    }

    // Reminder cap: after `maxReminders` the item stops nudging and is parked.
    const sent = history.filter((h) => h.memberId === input.memberId && h.ruleKey === rule.ruleKey && (h.recordId ?? null) === (input.recordId ?? null) && (h.outcome === "delivered" || h.outcome === "held" || h.outcome === "digest")).length;
    const reminderNumber = sent + 1;
    if (rule.maxReminders > 0 && sent >= rule.maxReminders) {
        // Park the newest row that is actually in the inbox. Preferring one that
        // was neither bundled nor held puts the decision where a person will see
        // it; the repos also clear those flags on the row they park.
        const newest = [...mine].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        const park = newest.find((i) => !i.digestFor && !i.deferredUntil && !i.actedAt) ?? newest.find((i) => !i.actedAt) ?? newest[0];
        return { ...base, outcome: "parked", reminderNumber: sent, parkItemId: park?.id ?? null, note: `${rule.maxReminders} reminders sent — parked in Needs attention instead.` };
    }

    // The daily ceiling: past five, the rest of the day is one digest.
    const day = dayKey(at);
    const already = items.filter((i) => i.memberId === input.memberId && !i.digestFor && dayKey(i.createdAt) === day).length;
    if (prefs.digestMode === "always" || (prefs.digestMode === "auto" && already >= DAILY_CEILING)) {
        const why = prefs.digestMode === "always" ? "Digest is always on" : `${already} already today`;
        return { ...base, outcome: "digest", reminderNumber, digestFor: day, note: `${why} — added to the ${prefs.digestAt} digest.` };
    }

    // Quiet hours defer; they never drop.
    if (inQuietHours(at, prefs.quietStart, prefs.quietEnd)) {
        const until = nextOpenWindow(at, prefs.quietEnd);
        return { ...base, outcome: "held", reminderNumber, deferredUntil: until, note: `Quiet hours — waiting until ${hhmm(until)}.` };
    }

    return { ...base, outcome: "delivered", reminderNumber, note: reminderNumber > 1 ? `Reminder ${reminderNumber} of ${rule.maxReminders}.` : `Delivered by ${channel === "in-app" ? "in-app" : channel}.` };
}

const first = (m: Member): string => m.name.split(" ")[0];
const windowWord = (u: FollowUpRule["windowUnit"]): string => (u === "week" ? "this week" : u === "once" ? "already, once" : "today");

// ---------------------------------------------------------------------------
// Visibility — the same filter both repos apply
// ---------------------------------------------------------------------------

/** The children (and only the children) whose inbox this member may open. */
export function inboxesFor(ctx: RepoContext): Member[] {
    const me = ctx.members.find((m) => m.id === ctx.me.id) ?? ctx.me;
    if (ctx.role !== "parent") return [me];
    return [me, ...ctx.members.filter((m) => m.role === "child")];
}

/**
 * Everything this member may see: their own inbox, their children's when they
 * are a parent, and never a row whose sensitivity class their role excludes.
 */
export function visibleTo(state: NotificationsState, ctx: RepoContext): NotificationsState {
    const allowed = new Set(inboxesFor(ctx).map((m) => m.id));
    const parent = ctx.role === "parent";
    const items = state.items.filter((i) => allowed.has(i.memberId) && (parent || !RESTRICTED.has(i.sensitivity)));
    return {
        items: [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        marks: state.marks.filter((m) => allowed.has(m.memberId)),
        prefs: parent ? state.prefs : state.prefs.filter((p) => p.memberId === ctx.me.id),
        rules: state.rules,
        history: parent ? state.history : state.history.filter((h) => h.memberId === ctx.me.id),
    };
}

// ---------------------------------------------------------------------------
// The inbox: engine rows + the shell's own notifications, as one list
// ---------------------------------------------------------------------------

export interface InboxItem {
    id: string;
    /** "engine" rows carry a rule; "shell" rows are the bell's own notifications. */
    source: "engine" | "shell";
    memberId: string;
    kind: NotificationKind;
    ruleKey: string | null;
    /** What the row is about, so an inline action can reach the record itself. */
    recordType: string | null;
    recordId: string | null;
    recordTitle: string | null;
    title: string;
    body: string;
    href: string | null;
    channel: Channel;
    reminderNumber: number;
    needsAttention: boolean;
    action: InlineAction | null;
    actionOutcome: string | null;
    readAt: string | null;
    snoozedUntil: string | null;
    actedAt: string | null;
    deferredUntil: string | null;
    digestFor: string | null;
    isTest: boolean;
    createdAt: string;
}

const OPEN_ACTION: InlineAction = { kind: "open", label: "Open", done: "Opened" };

function fromItem(i: NotifItem): InboxItem {
    return {
        id: i.id,
        source: "engine",
        memberId: i.memberId,
        kind: i.kind,
        ruleKey: i.ruleKey,
        recordType: i.recordType,
        recordId: i.recordId,
        recordTitle: i.recordTitle,
        title: i.title,
        body: i.body,
        href: i.href,
        channel: i.channel,
        reminderNumber: i.reminderNumber,
        needsAttention: i.needsAttention,
        action: i.action,
        actionOutcome: i.actionOutcome,
        readAt: i.readAt,
        snoozedUntil: i.snoozedUntil,
        actedAt: i.actedAt,
        deferredUntil: i.deferredUntil,
        digestFor: i.digestFor,
        isTest: i.isTest,
        createdAt: i.createdAt,
    };
}

function fromNotification(n: Notification, mark: NotifMark | undefined): InboxItem {
    return {
        id: n.id,
        source: "shell",
        memberId: n.memberId,
        kind: n.kind,
        ruleKey: null,
        recordType: null,
        recordId: null,
        recordTitle: null,
        title: n.title,
        body: n.body,
        href: n.href,
        channel: "in-app",
        reminderNumber: 1,
        needsAttention: false,
        action: n.href ? OPEN_ACTION : null,
        actionOutcome: null,
        readAt: n.readAt,
        snoozedUntil: mark?.snoozedUntil ?? null,
        actedAt: mark?.actedAt ?? null,
        deferredUntil: null,
        digestFor: null,
        isTest: false,
        createdAt: n.createdAt,
    };
}

// ---------------------------------------------------------------------------
// Mirrors: one bell, one count
// ---------------------------------------------------------------------------

/**
 * The nav bell counts the SHELL's notifications and nothing else, and no module
 * may change the shell. So the engine reaches the bell the way every other
 * module does — by putting a row there. That row is a MIRROR of an engine item,
 * tagged in its href with the item's id.
 *
 * The mirror exists for the count and for the bell panel; the inbox drops it,
 * so nobody sees the same thing twice. `mirrorIdsFor` keeps the two in step:
 * read, act on, snooze or remove an engine row and its mirror is marked read in
 * the same breath, which is what makes the badge fall within the same tick.
 */
export const MIRROR_TAG = "#wf-notif=";

/** Where a mirror points: the engine row's own destination, plus the tag. */
export const mirrorHref = (itemId: string, href?: string | null): string => `${href || MODULE_PATH}${MIRROR_TAG}${itemId}`;

/** The engine row a bell notification mirrors, or null when it is the bell's own. */
export function mirrorItemId(n: Notification): string | null {
    const href = n.href ?? "";
    const at = href.indexOf(MIRROR_TAG);
    return at >= 0 ? href.slice(at + MIRROR_TAG.length) : null;
}

/** The bell rows mirroring these engine rows — the ids to mark read alongside. */
export function mirrorIdsFor(notifications: Notification[], itemIds: string[], unreadOnly = true): string[] {
    if (!itemIds.length) return [];
    const wanted = new Set(itemIds);
    return notifications.filter((n) => (!unreadOnly || !n.readAt) && wanted.has(mirrorItemId(n) ?? "\u0000")).map((n) => n.id);
}

/**
 * One member's whole inbox. `notifications` is the shell's list — in the demo
 * the core repo hands back every member's, so it is filtered here too. Mirrors
 * are dropped: the engine row they stand for is already in this list, and it is
 * the one carrying the inline action, the snooze menu and the rule behind it.
 */
export function inboxFor(state: NotificationsState, notifications: Notification[], memberId: string): InboxItem[] {
    const marks = new Map(state.marks.map((m) => [m.notificationId, m]));
    const engine = state.items.filter((i) => i.memberId === memberId).map(fromItem);
    const shell = notifications.filter((n) => n.memberId === memberId && !mirrorItemId(n)).map((n) => fromNotification(n, marks.get(n.id)));
    return [...engine, ...shell].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

const held = (i: InboxItem, now: string): boolean => Boolean(i.deferredUntil && i.deferredUntil > now);
const asleep = (i: InboxItem, now: string): boolean => Boolean(i.snoozedUntil && i.snoozedUntil > now);

/** Waiting for a decision rather than for a delivery window. */
export const isParked = (i: InboxItem): boolean => i.needsAttention && !i.actedAt;

/**
 * In the inbox as its own row: not held, not snoozed, not folded into a digest.
 *
 * A parked item is the exception and is always live. The attempt that parked it
 * may itself have been bundled into a digest or held by quiet hours — which is
 * precisely the case where the engine gives up nudging — and burying that row
 * inside a collapsed digest would hide the one thing now waiting on a person.
 */
export function isLive(i: InboxItem, now: string): boolean {
    if (isParked(i)) return true;
    return !held(i, now) && !asleep(i, now) && !i.digestFor;
}

export function isUnread(i: InboxItem, now: string): boolean {
    return !i.readAt && !i.actedAt && isLive(i, now);
}

export function unreadCount(state: NotificationsState, notifications: Notification[], memberId: string, now: string): number {
    return inboxFor(state, notifications, memberId).filter((i) => isUnread(i, now)).length;
}

export interface DigestGroup {
    day: string;
    items: InboxItem[];
    /** True while the digest is still waiting to go out this evening. */
    pending: boolean;
}

export interface InboxGroups {
    attention: InboxItem[];
    today: InboxItem[];
    earlier: InboxItem[];
    snoozed: InboxItem[];
    heldItems: InboxItem[];
    digests: DigestGroup[];
    unread: number;
    total: number;
}

/** Today / Earlier, plus the four side-pockets an honest inbox needs. */
export function groupInbox(items: InboxItem[], now: string, digestAt = "18:00"): InboxGroups {
    const live = items.filter((i) => isLive(i, now));
    const today = isoDate(now);
    const digestDays = new Map<string, InboxItem[]>();
    for (const i of items) {
        // A parked row appears once, under Needs attention — never also inside
        // the digest, the held list or the snoozed list it was raised into.
        if (!i.digestFor || isParked(i)) continue;
        const list = digestDays.get(i.digestFor) ?? [];
        list.push(i);
        digestDays.set(i.digestFor, list);
    }
    const pastDigestTime = hhmm(now) >= digestAt;
    return {
        attention: live.filter(isParked),
        today: live.filter((i) => !isParked(i) && dayKey(i.createdAt) === today),
        earlier: live.filter((i) => !isParked(i) && dayKey(i.createdAt) !== today),
        snoozed: items.filter((i) => asleep(i, now) && !isParked(i)),
        heldItems: items.filter((i) => held(i, now) && !isParked(i)),
        digests: [...digestDays.entries()]
            .map(([day, list]) => ({ day, items: list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)), pending: day === today && !pastDigestTime }))
            .sort((a, b) => b.day.localeCompare(a.day)),
        unread: items.filter((i) => isUnread(i, now)).length,
        total: live.length,
    };
}

/** How many nudges this member has had today, against the ceiling. */
export function todayLoad(state: NotificationsState, memberId: string, now: string): { delivered: number; bundled: number; ceiling: number } {
    const day = dayKey(now);
    const mine = state.items.filter((i) => i.memberId === memberId && dayKey(i.createdAt) === day);
    return { delivered: mine.filter((i) => !i.digestFor).length, bundled: mine.filter((i) => i.digestFor).length, ceiling: DAILY_CEILING };
}

/** The snooze menu, resolved against the member's own evening. */
export function snoozeChoices(now: string, quietEnd: string): Array<{ label: string; until: string }> {
    const inOneHour = new Date(new Date(now).getTime() + 3600_000).toISOString();
    const tonight = atLocal(now, "19:00");
    const tomorrow = nextOpenWindow(now, quietEnd);
    const nextWeek = (() => {
        const d = new Date(atLocal(now, "09:00"));
        d.setDate(d.getDate() + 7);
        return d.toISOString();
    })();
    return [
        { label: "In an hour", until: inOneHour },
        { label: "Tonight, 19:00", until: tonight > now ? tonight : atLocal(new Date(new Date(now).getTime() + 86_400_000).toISOString(), "19:00") },
        { label: `Tomorrow, ${hhmm(tomorrow)}`, until: tomorrow },
        { label: "Next week", until: nextWeek },
    ];
}

// ---------------------------------------------------------------------------
// Shared surfaces
// ---------------------------------------------------------------------------

export function dashboard(state: NotificationsState, ctx: RepoContext): DashboardContribution {
    const now = new Date().toISOString();
    const mine = state.items.filter((i) => i.memberId === ctx.me.id).map(fromItem);
    const unread = mine.filter((i) => isUnread(i, now)).length;
    const parked = mine.filter((i) => i.needsAttention && !i.actedAt);
    const attention: AttentionItem[] = [];

    for (const p of parked.slice(0, 3)) {
        attention.push({
            id: `parked-${p.id}`,
            moduleId: "notifications",
            area: "home",
            tone: "warn",
            title: p.title,
            body: "Three reminders went out and nothing changed, so it stopped nudging and waits here.",
            href: MODULE_PATH,
            weight: 72,
        });
    }
    if (unread > 5) {
        attention.push({
            id: "inbox-pile",
            moduleId: "notifications",
            area: "home",
            tone: "info",
            title: `${unread} things are waiting in your inbox`,
            body: "Open the notification centre — snooze what can wait, act on what can't.",
            href: MODULE_PATH,
            weight: 40,
        });
    }

    const childCards: ChildCard[] = [];
    if (ctx.role === "child" && unread > 0) {
        childCards.push({
            id: "child-inbox",
            moduleId: "notifications",
            area: "home",
            title: unread === 1 ? "You have 1 new message" : `You have ${unread} new messages`,
            body: "Tap to see what's waiting for you.",
            emoji: "🔔",
            href: MODULE_PATH,
        });
    }
    return { attention, childCards };
}

/**
 * Two things ride out of here.
 *
 * THE BIRTHDAY RULE lives in this module because birthdays live on the member,
 * not in any module's rows. Every other rule in the catalogue is raised by the
 * module that owns the record.
 *
 * THE MIRRORS are how the engine reaches the nav bell. The shell counts its own
 * notifications and nothing else, and no module may edit the shell — so each
 * unread engine row asks, exactly once, for a bell row of its own. The key is
 * the item's id, so the shell's own de-duplication (`raisedNudgeKeys`) makes
 * this idempotent for ever; the tag in the href is what the inbox reads to hide
 * the mirror and to mark it read when the engine row is dealt with.
 */
export function nudges(state: NotificationsState, ctx: RepoContext): Nudge[] {
    const out: Nudge[] = [];
    const now = new Date().toISOString();
    for (const i of state.items) {
        const row = fromItem(i);
        if (!isUnread(row, now) || i.isTest) continue;
        out.push({
            key: `notif-mirror-${i.id}`,
            moduleId: "notifications",
            kind: i.kind,
            title: i.title,
            body: i.body,
            href: mirrorHref(i.id, i.href),
            memberIds: [i.memberId],
        });
    }

    const rule = ruleByKey(state.rules, "birthday.in-7");
    if (!rule?.enabled) return out;
    const today = new Date(`${ctx.today}T00:00:00`);
    for (const m of ctx.members) {
        if (!m.birthday) continue;
        const b = new Date(m.birthday);
        const next = new Date(today.getFullYear(), b.getMonth(), b.getDate());
        if (next.getTime() < today.getTime()) next.setFullYear(next.getFullYear() + 1);
        const days = Math.round((next.getTime() - today.getTime()) / 86_400_000);
        if (days < 0 || days > 7) continue;
        const name = m.name.split(" ")[0];
        const when = days === 0 ? "is today" : days === 1 ? "is tomorrow" : days === 7 ? "is a week today" : `is in ${days} days`;
        out.push({
            key: `notif-birthday-${m.id}-${next.getFullYear()}`,
            moduleId: "notifications",
            kind: "family",
            title: `${name}'s birthday ${when}`,
            body: `${next.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}. Time to plan something small and good.`,
            href: "/family/people",
            memberIds: [],
        });
    }
    return out;
}

export function aiContext(state: NotificationsState, ctx: RepoContext): string {
    const now = new Date().toISOString();
    const mine = state.items.filter((i) => i.memberId === ctx.me.id).map(fromItem);
    const unread = mine.filter((i) => isUnread(i, now));
    const parked = mine.filter((i) => i.needsAttention && !i.actedAt);
    const p = prefsFor(state, ctx.me.id, ctx.space.timezone);
    const lines = [
        `Inbox: ${unread.length} unread, ${mine.filter((i) => asleep(i, now)).length} snoozed, ${mine.filter((i) => held(i, now)).length} held by quiet hours.`,
        unread.length ? `Waiting: ${unread.slice(0, 6).map((i) => i.title).join("; ")}.` : "Nothing is waiting.",
        parked.length ? `Needs attention after 3 reminders: ${parked.map((i) => i.title).join("; ")}.` : "",
        `Quiet hours ${p.quietStart}–${p.quietEnd}; digest ${p.digestMode}${p.digestMode === "off" ? "" : ` at ${p.digestAt}`}${p.mutedKinds.length ? `; muted: ${p.mutedKinds.map((k) => KIND_LABEL[k]).join(", ")}` : ""}.`,
        `${state.rules.filter((r) => r.enabled).length} of ${state.rules.length} follow-up rules are on.`,
    ].filter(Boolean);
    return lines.join(" ").slice(0, 1500);
}

export function search(state: NotificationsState, q: string): Array<{ title: string; meta: string; href: string }> {
    const needle = q.toLowerCase();
    return state.items
        .filter((i) => i.title.toLowerCase().includes(needle) || i.body.toLowerCase().includes(needle))
        .slice(0, 6)
        .map((i) => ({ title: i.title, meta: `Notification · ${KIND_LABEL[i.kind]}`, href: MODULE_PATH }));
}
