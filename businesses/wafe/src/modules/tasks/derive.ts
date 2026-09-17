import type { AgendaItem, AttentionItem, ChildCard, DashboardContribution, Member, Nudge, ProgressRing, RepoContext } from "@/data/core";
import { clamp, isoDate, pct as pctOf } from "@/lib/format";
import type { ChoreRota, GoalTaskProgress, MilestoneTaskProgress, RecurRule, Redemption, Reward, SproutsEntry, Task, TaskStatus, TasksState } from "./types";
import { REMINDERS_BEFORE_PARK, STATUS_ORDER } from "./types";

/**
 * Every number the screens show, and — first — the one function both repos use
 * to decide what a member may receive.
 *
 * Filtering here rather than in the pages is what makes the demo honest: a
 * child's `load()` genuinely contains her own jobs and the family chores board
 * and nothing else, and a guest's contains the two things the family asked
 * them to do for the trip. The live repo runs the same function over rows RLS
 * has already narrowed, so demo and live hand the pages an identical shape.
 */

export const BASE = "/execute/tasks";

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

/** The calendar day a task is due, or null when it floats. */
export const dueDay = (t: Task): string | null => (t.dueAt ? isoDate(t.dueAt) : null);

export function daysBetween(fromIso: string, toIso: string): number {
    const a = new Date(`${isoDate(fromIso)}T00:00:00`).getTime();
    const b = new Date(`${isoDate(toIso)}T00:00:00`).getTime();
    return Math.round((b - a) / 86400000);
}

export const isDone = (t: Task): boolean => t.status === "done";

/** Dropped on purpose ("we decided not to") rather than finished. */
export const isDropped = (t: Task): boolean => t.status === "done" && Boolean(t.droppedReason);

/** How many whole days late, 0 when not late. */
export function daysOverdue(t: Task, today: string): number {
    const d = dueDay(t);
    if (!d || isDone(t)) return 0;
    return Math.max(0, daysBetween(d, today));
}

export const isOverdue = (t: Task, today: string): boolean => daysOverdue(t, today) > 0;
export const isDueToday = (t: Task, today: string): boolean => dueDay(t) === today && !isDone(t);

/**
 * Reminders this task has generated: one a day while it is late, plus any a
 * parent sent by hand. Three of them and it stops nagging and parks itself in
 * Needs attention instead — the brief's "three reminders then Needs attention".
 */
export const reminderCount = (t: Task, today: string): number => clamp(daysOverdue(t, today) + t.remindersSent, 0, 99);

export const isParked = (t: Task, today: string): boolean => !isDone(t) && reminderCount(t, today) >= REMINDERS_BEFORE_PARK;

/** Minutes into the day, for sorting the agenda. */
export function minuteOfDay(iso: string | null): number {
    if (!iso) return 720;
    const d = new Date(iso);
    return d.getHours() * 60 + d.getMinutes();
}

/**
 * The next occurrence of a rule after `fromIso`, as an ISO datetime.
 *
 * A weekly rule that names a day means the NEXT time that day comes round —
 * "every Thursday" from a Friday is six days away, not thirteen. So the shift
 * onto the named weekday happens first (1–7 days, never 0: an occurrence is
 * always in the future), and only the remaining whole weeks the interval asks
 * for are added on top.
 */
export function nextOccurrence(rule: RecurRule, fromIso: string): string {
    const base = new Date(fromIso);
    const every = Math.max(1, Math.round(rule.interval || 1));
    const d = new Date(base);
    if (rule.freq === "daily") {
        d.setDate(d.getDate() + every);
    } else if (rule.freq === "weekly") {
        if (rule.weekday !== null && rule.weekday !== undefined) {
            const shift = (rule.weekday - d.getDay() + 7) % 7 || 7;
            d.setDate(d.getDate() + shift + (every - 1) * 7);
        } else {
            d.setDate(d.getDate() + every * 7);
        }
    } else {
        d.setMonth(d.getMonth() + every);
        if (rule.monthDay) d.setDate(Math.min(28, Math.max(1, rule.monthDay)));
    }
    return d.toISOString();
}

/**
 * The next date a rule lands on AFTER today, however long a task has been
 * ignored — a chore missed for a fortnight comes back tomorrow, not a
 * fortnight ago.
 */
export function nextDueAfter(rule: RecurRule, fromIso: string, today: string): string {
    let next = nextOccurrence(rule, fromIso);
    for (let i = 0; i < 400 && daysBetween(next, today) >= 0; i += 1) next = nextOccurrence(rule, next);
    return next;
}

const WEEKDAY_NAME = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** "Every Thursday", "Every 2 days", "Monthly on the 1st". */
export function recurLabel(rule: RecurRule | null): string {
    if (!rule) return "";
    const n = Math.max(1, Math.round(rule.interval || 1));
    if (rule.freq === "daily") return n === 1 ? "Every day" : `Every ${n} days`;
    if (rule.freq === "weekly") {
        const day = rule.weekday === null || rule.weekday === undefined ? "week" : WEEKDAY_NAME[rule.weekday % 7];
        return n === 1 ? `Every ${day}` : `Every ${n} weeks on ${day}`;
    }
    return rule.monthDay ? `Monthly on the ${rule.monthDay}` : "Monthly";
}

// ---------------------------------------------------------------------------
// Visibility
// ---------------------------------------------------------------------------

/**
 * Core visibility semantics, applied to a task.
 *
 * Being assigned something is itself a share — you cannot be asked to do a job
 * you may not read — so an assignee always sees it. Beyond that a child sees
 * the family chores board (a child-safe chore) and nothing else that merely
 * says "family".
 */
export function canSeeTask(t: Task, me: Member): boolean {
    if (t.ownerMemberId === me.id || t.createdBy === me.id) return true;
    if (t.assigneeMemberIds.includes(me.id)) return true;
    switch (t.visibility) {
        case "private":
            return false;
        case "shared":
            return t.sharedWith.includes(me.id);
        case "family":
            if (me.role === "child") return t.isChore && t.childSafe;
            return me.role !== "guest";
        case "child":
        default:
            return true;
    }
}

/**
 * The slice this member may receive.
 *
 * Guests are the sharp edge. The source permission matrix calls the guest tier
 * read-only "View"; the approved spec for this module says a guest sees "tasks
 * assigned to them (e.g. trip prep)" and "can complete". Both cannot be true,
 * so this module takes the narrower reading of the wider rule: a guest is
 * handed ONLY the tasks a parent explicitly assigned to them — never the
 * family's list, never the board, never chores, Sprouts, rewards or the
 * ledger — and the single write they are allowed is ticking off one of those
 * assigned tasks. Everything else the repos refuse. That honours the spec's
 * "can complete" without widening a guest into a household member.
 */
export function visibleTo(state: TasksState, ctx: RepoContext): TasksState {
    const me = ctx.me;

    if (me.role === "guest") {
        const tasks = state.tasks.filter((t) => t.assigneeMemberIds.includes(me.id));
        return { tasks, rotas: [], ledger: [], rewards: [], redemptions: [], milestoneProgress: [], goalProgress: [] };
    }

    const tasks = state.tasks.filter((t) => canSeeTask(t, me));
    const parent = me.role === "parent";
    const next: TasksState = {
        tasks,
        rotas: parent ? state.rotas : state.rotas.filter((r) => r.memberIds.includes(me.id)),
        ledger: parent ? state.ledger : state.ledger.filter((e) => e.memberId === me.id),
        rewards: parent ? state.rewards : state.rewards.filter((r) => r.active),
        redemptions: parent ? state.redemptions : state.redemptions.filter((r) => r.memberId === me.id),
        milestoneProgress: [],
        goalProgress: [],
    };
    next.milestoneProgress = milestoneProgress(next);
    next.goalProgress = goalProgress(next);
    return next;
}

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export const taskById = (state: TasksState, id: string): Task | undefined => state.tasks.find((t) => t.id === id);

export const openTasks = (state: TasksState): Task[] => state.tasks.filter((t) => !isDone(t));

export const rewardById = (state: TasksState, id: string): Reward | undefined => state.rewards.find((r) => r.id === id);

/** Who a task is for, as first names, or "Everyone". */
export function assigneeNames(t: Task, members: Member[]): string {
    if (!t.assigneeMemberIds.length) return "Everyone";
    return t.assigneeMemberIds
        .map((id) => members.find((m) => m.id === id)?.name.split(" ")[0] ?? "Someone")
        .join(" & ");
}

export interface TaskFilter {
    memberId?: string | null;
    kind?: Task["kind"] | null;
    status?: TaskStatus | null;
    goalId?: string | null;
    valueId?: string | null;
    /** Only what is late. */
    overdue?: boolean;
    /** Free text over title and notes. */
    q?: string;
}

/** The one filter every view runs through, so a chip means the same thing everywhere (AC 9). */
export function applyFilter(tasks: Task[], f: TaskFilter, today: string): Task[] {
    const needle = (f.q ?? "").trim().toLowerCase();
    return tasks.filter((t) => {
        if (f.memberId) {
            if (f.memberId === "unassigned") {
                if (t.assigneeMemberIds.length) return false;
            } else if (!t.assigneeMemberIds.includes(f.memberId)) return false;
        }
        if (f.kind && t.kind !== f.kind) return false;
        if (f.status && t.status !== f.status) return false;
        if (f.goalId && t.goalId !== f.goalId) return false;
        if (f.valueId && t.valueId !== f.valueId) return false;
        if (f.overdue && !isOverdue(t, today)) return false;
        if (needle && !`${t.title} ${t.notes}`.toLowerCase().includes(needle)) return false;
        return true;
    });
}

export interface TaskGroup {
    key: string;
    label: string;
    tone: "danger" | "warn" | "normal" | "muted";
    tasks: Task[];
}

/** Overdue · Today · Tomorrow · This week · Later · Someday · Done. */
export function groupTasks(tasks: Task[], today: string): TaskGroup[] {
    const groups: TaskGroup[] = [
        { key: "overdue", label: "Overdue", tone: "danger", tasks: [] },
        { key: "today", label: "Today", tone: "warn", tasks: [] },
        { key: "tomorrow", label: "Tomorrow", tone: "normal", tasks: [] },
        { key: "week", label: "This week", tone: "normal", tasks: [] },
        { key: "later", label: "Later", tone: "muted", tasks: [] },
        { key: "someday", label: "No date", tone: "muted", tasks: [] },
        { key: "done", label: "Done", tone: "muted", tasks: [] },
    ];
    const put = (key: string, t: Task) => groups.find((g) => g.key === key)?.tasks.push(t);
    for (const t of tasks) {
        if (isDone(t)) {
            put("done", t);
            continue;
        }
        const d = dueDay(t);
        if (!d) {
            put("someday", t);
            continue;
        }
        const delta = daysBetween(today, d);
        if (delta < 0) put("overdue", t);
        else if (delta === 0) put("today", t);
        else if (delta === 1) put("tomorrow", t);
        else if (delta <= 7) put("week", t);
        else put("later", t);
    }
    const rank = { high: 0, normal: 1, low: 2 } as const;
    for (const g of groups) {
        g.tasks.sort((a, b) => (dueDay(a) ?? "9999").localeCompare(dueDay(b) ?? "9999") || rank[a.priority] - rank[b.priority] || a.title.localeCompare(b.title));
    }
    return groups.filter((g) => g.tasks.length > 0);
}

/** One Kanban column, in its persisted order (AC 6). */
export const columnTasks = (tasks: Task[], status: TaskStatus): Task[] =>
    tasks.filter((t) => t.status === status).sort((a, b) => a.kanbanOrder - b.kanbanOrder || a.title.localeCompare(b.title));

export const board = (tasks: Task[]): Array<{ status: TaskStatus; tasks: Task[] }> => STATUS_ORDER.map((status) => ({ status, tasks: columnTasks(tasks, status) }));

/** Every day of the month grid containing `anchor`, Monday first. */
export function monthGrid(anchor: string): string[] {
    const a = new Date(`${anchor.slice(0, 8)}01T00:00:00`);
    const first = new Date(a.getFullYear(), a.getMonth(), 1);
    const lead = (first.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(start.getDate() - lead);
    const out: string[] = [];
    for (let i = 0; i < 42; i += 1) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        out.push(isoDate(d));
    }
    return out;
}

export const tasksOnDay = (tasks: Task[], day: string): Task[] =>
    tasks.filter((t) => dueDay(t) === day).sort((a, b) => minuteOfDay(a.dueAt) - minuteOfDay(b.dueAt));

// ---------------------------------------------------------------------------
// Chores, Sprouts and rewards
// ---------------------------------------------------------------------------

export const choresFor = (state: TasksState, memberId: string, today: string): Task[] =>
    state.tasks.filter((t) => t.isChore && t.assigneeMemberIds.includes(memberId) && (dueDay(t) === today || (!isDone(t) && isOverdue(t, today))));

/** The auditable balance: the ledger, added up (AC 5). */
export const sproutsBalance = (state: TasksState, memberId: string): number =>
    state.ledger.filter((e) => e.memberId === memberId).reduce((n, e) => n + e.delta, 0);

export const sproutsThisWeek = (state: TasksState, memberId: string, today: string): number =>
    state.ledger.filter((e) => e.memberId === memberId && e.delta > 0 && daysBetween(e.at, today) <= 6).reduce((n, e) => n + e.delta, 0);

export const ledgerFor = (state: TasksState, memberId: string): SproutsEntry[] =>
    state.ledger.filter((e) => e.memberId === memberId).sort((a, b) => b.at.localeCompare(a.at));

export const pendingRedemptions = (state: TasksState): Redemption[] => state.redemptions.filter((r) => r.status === "requested");

/** Chores waiting on a parent to look at the photo (AC 4). */
export const awaitingProof = (state: TasksState): Task[] => state.tasks.filter((t) => t.needsProof && t.proofUrl && !t.proofApprovedBy && !isDone(t));

export const affordable = (state: TasksState, memberId: string): Reward[] => state.rewards.filter((r) => r.active && r.costSprouts <= sproutsBalance(state, memberId));

/** The next reward within reach, and how far off it is. */
export function nextReward(state: TasksState, memberId: string): { reward: Reward; short: number } | null {
    const balance = sproutsBalance(state, memberId);
    const out = state.rewards
        .filter((r) => r.active && r.costSprouts > balance)
        .sort((a, b) => a.costSprouts - b.costSprouts)[0];
    return out ? { reward: out, short: out.costSprouts - balance } : null;
}

// ---------------------------------------------------------------------------
// Rota
// ---------------------------------------------------------------------------

export const rotaTurn = (rota: ChoreRota): string => rota.memberIds[rota.currentIndex % Math.max(1, rota.memberIds.length)] ?? "";

export const rotaNext = (rota: ChoreRota): string => rota.memberIds[(rota.currentIndex + 1) % Math.max(1, rota.memberIds.length)] ?? "";

/** A rota turns on the family's planning day, once its date has come (AC 2). */
export const rotaIsDue = (rota: ChoreRota, today: string): boolean => rota.nextRotateAt <= today;

export const dueRotations = (state: TasksState, today: string): ChoreRota[] => state.rotas.filter((r) => rotaIsDue(r, today));

/** The date of the next planning day on or after `from`. */
export function nextPlanningDay(from: string, planningDay: number): string {
    const d = new Date(`${from}T00:00:00`);
    const want = planningDay % 7; // ISO 7 (Sunday) → JS 0
    for (let i = 0; i < 8; i += 1) {
        if (d.getDay() === want && i > 0) return isoDate(d);
        d.setDate(d.getDate() + 1);
    }
    return isoDate(d);
}

// ---------------------------------------------------------------------------
// Goals and milestones (what other modules read off us)
// ---------------------------------------------------------------------------

export function milestoneProgress(state: TasksState): MilestoneTaskProgress[] {
    const by = new Map<string, MilestoneTaskProgress>();
    for (const t of state.tasks) {
        if (!t.milestoneId) continue;
        const cur = by.get(t.milestoneId) ?? { goalId: t.goalId, milestoneId: t.milestoneId, label: t.milestoneLabel || "Milestone", done: 0, total: 0, pct: 0 };
        cur.total += 1;
        if (isDone(t)) cur.done += 1;
        cur.pct = pctOf(cur.done, cur.total);
        by.set(t.milestoneId, cur);
    }
    return [...by.values()];
}

export function goalProgress(state: TasksState): GoalTaskProgress[] {
    const by = new Map<string, GoalTaskProgress>();
    for (const t of state.tasks) {
        if (!t.goalId) continue;
        const cur = by.get(t.goalId) ?? { goalId: t.goalId, label: t.goalLabel || "Goal", done: 0, total: 0, pct: 0 };
        cur.total += 1;
        if (isDone(t)) cur.done += 1;
        cur.pct = pctOf(cur.done, cur.total);
        by.set(t.goalId, cur);
    }
    return [...by.values()];
}

export const milestoneFor = (state: TasksState, milestoneId: string | null): MilestoneTaskProgress | undefined =>
    milestoneId ? state.milestoneProgress.find((m) => m.milestoneId === milestoneId) : undefined;

/** Tasks that carry no goal — the "link this to something" affordance. */
export const orphans = (state: TasksState): Task[] => state.tasks.filter((t) => !isDone(t) && !t.goalId && !t.isChore && t.kind !== "maintenance");

// ---------------------------------------------------------------------------
// This week
// ---------------------------------------------------------------------------

export interface WeekStats {
    done: number;
    total: number;
    pct: number;
    overdue: number;
    parked: number;
    unassigned: number;
}

export function weekStats(state: TasksState, today: string): WeekStats {
    const inWindow = (t: Task): boolean => {
        const d = dueDay(t);
        if (!d) return false;
        const delta = daysBetween(today, d);
        return delta >= -6 && delta <= 6;
    };
    const window = state.tasks.filter(inWindow);
    const done = window.filter(isDone).length;
    return {
        done,
        total: window.length,
        pct: pctOf(done, window.length),
        overdue: state.tasks.filter((t) => isOverdue(t, today)).length,
        parked: state.tasks.filter((t) => isParked(t, today)).length,
        unassigned: state.tasks.filter((t) => !isDone(t) && !t.assigneeMemberIds.length && inWindow(t)).length,
    };
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

const first = (members: Member[], id: string | null): string => (id ? members.find((m) => m.id === id)?.name.split(" ")[0] ?? "Someone" : "The family");

function agendaFor(t: Task, ctx: RepoContext): AgendaItem {
    const late = daysOverdue(t, ctx.today);
    const bits = [t.isChore ? "Chore" : t.kind === "task" ? "Task" : t.kind === "errand" ? "Errand" : "Maintenance"];
    if (t.isChore && t.sprouts) bits.push(`${t.sprouts} Sprouts`);
    if (late) bits.push(`${late}d late`);
    else if (t.goalLabel) bits.push(t.goalLabel);
    return {
        id: t.id,
        moduleId: "tasks",
        area: "execute",
        title: t.title,
        meta: bits.join(" · "),
        memberId: t.assigneeMemberIds[0] ?? null,
        at: t.allDay ? null : t.dueAt,
        done: isDone(t),
        href: `${BASE}/${t.id}`,
        sort: late ? -10 - late : t.allDay ? 700 + (t.priority === "high" ? -40 : t.priority === "low" ? 40 : 0) : minuteOfDay(t.dueAt),
    };
}

export function dashboard(state: TasksState, ctx: RepoContext): DashboardContribution {
    const agenda: AgendaItem[] = [];
    const attention: AttentionItem[] = [];
    const rings: ProgressRing[] = [];
    const childCards: ChildCard[] = [];
    const me = ctx.me;
    const today = ctx.today;

    if (me.role === "guest") {
        for (const t of state.tasks.filter((x) => !isDone(x))) agenda.push(agendaFor(t, ctx));
        if (state.tasks.some((t) => !isDone(t))) {
            attention.push({
                id: "guest-assigned",
                moduleId: "tasks",
                area: "execute",
                tone: "info",
                title: `${ctx.space.name} asked you to help`,
                body: `${state.tasks.filter((t) => !isDone(t)).length} thing(s) are down to you. Tick them off when they're done — nothing else here is yours to worry about.`,
                href: BASE,
                weight: 38,
            });
        }
        return { agenda, attention, rings, childCards };
    }

    const mine = (t: Task): boolean => t.assigneeMemberIds.includes(me.id) || (!t.assigneeMemberIds.length && me.role === "parent");
    const forAgenda = state.tasks.filter((t) => (me.role === "parent" ? true : mine(t)) && (isDueToday(t, today) || isOverdue(t, today) || (isDone(t) && Boolean(t.doneAt) && isoDate(t.doneAt as string) === today)));
    for (const t of forAgenda) agenda.push(agendaFor(t, ctx));

    const stats = weekStats(state, today);

    if (stats.overdue > 0) {
        attention.push({
            id: "overdue",
            moduleId: "tasks",
            area: "execute",
            tone: "danger",
            title: `${stats.overdue} thing${stats.overdue === 1 ? " is" : "s are"} overdue`,
            body: stats.parked ? `${stats.parked} of them stopped reminding and are waiting on a decision: do it, move it, or drop it.` : "A quick pass now keeps the week from tipping over.",
            href: `${BASE}?overdue=1`,
            weight: 92,
        });
    }
    if (me.role === "parent" && stats.unassigned > 0) {
        attention.push({
            id: "unassigned",
            moduleId: "tasks",
            area: "execute",
            tone: "warn",
            title: `${stats.unassigned} task${stats.unassigned === 1 ? "" : "s"} this week with nobody's name on it`,
            body: "Everyone's job is nobody's job. Give each one a person on Sunday.",
            href: `${BASE}?member=unassigned`,
            weight: 60,
        });
    }
    if (me.role === "parent") {
        for (const t of awaitingProof(state)) {
            attention.push({
                id: `proof-${t.id}`,
                moduleId: "tasks",
                area: "execute",
                tone: "info",
                title: `${first(ctx.members, t.assigneeMemberIds[0] ?? null)} sent a photo for "${t.title}"`,
                body: `${t.sprouts} Sprouts are waiting on your yes.`,
                href: `${BASE}/${t.id}`,
                weight: 66,
            });
        }
        for (const r of pendingRedemptions(state)) {
            const reward = rewardById(state, r.rewardId);
            attention.push({
                id: `redeem-${r.id}`,
                moduleId: "tasks",
                area: "execute",
                tone: "info",
                title: `${first(ctx.members, r.memberId)} would like to spend ${r.costSprouts} Sprouts`,
                body: `${reward?.name ?? "A reward"} — approve it and the Sprouts come off the balance.`,
                href: `${BASE}?tab=rewards`,
                weight: 64,
            });
        }
        for (const rota of dueRotations(state, today)) {
            attention.push({
                id: `rota-${rota.id}`,
                moduleId: "tasks",
                area: "execute",
                tone: "warn",
                title: `${rota.name}: it's ${first(ctx.members, rotaNext(rota))}'s turn this week`,
                body: "The rota turns on your planning day. Open Tasks and it swaps over.",
                href: `${BASE}?tab=chores`,
                weight: 48,
            });
        }
    }

    if (stats.total > 0) {
        rings.push({
            id: "week",
            moduleId: "tasks",
            area: "execute",
            label: "This week's tasks",
            pct: stats.pct,
            sub: `${stats.done} of ${stats.total} done`,
            href: BASE,
        });
    }
    for (const g of state.goalProgress.slice(0, 3)) {
        rings.push({
            id: `goal-${g.goalId}`,
            moduleId: "tasks",
            area: "execute",
            label: g.label,
            pct: g.pct,
            sub: `${g.done} of ${g.total} tasks done`,
            href: `${BASE}?goal=${encodeURIComponent(g.goalId)}`,
        });
    }

    if (me.role === "child") {
        const chores = choresFor(state, me.id, today);
        for (const t of chores) {
            childCards.push({
                id: `chore-${t.id}`,
                moduleId: "tasks",
                area: "execute",
                title: t.title,
                body: isDone(t) ? `Done — ${t.sprouts} Sprouts earned.` : t.needsProof ? `${t.sprouts} Sprouts · take a photo when you're done` : `${t.sprouts} Sprouts when it's done`,
                emoji: t.needsProof ? "📸" : "🧹",
                href: `${BASE}/${t.id}`,
                done: isDone(t),
            });
        }
        const bal = sproutsBalance(state, me.id);
        const next = nextReward(state, me.id);
        if (next) {
            childCards.push({
                id: "reward",
                moduleId: "tasks",
                area: "execute",
                title: `${next.short} Sprouts to go`,
                body: `You have ${bal}. ${next.reward.name} costs ${next.reward.costSprouts}.`,
                emoji: "🌱",
                href: `${BASE}?tab=rewards`,
                pct: pctOf(bal, next.reward.costSprouts),
            });
        }
    }

    return { agenda, attention, rings, childCards };
}

// ---------------------------------------------------------------------------
// Nudges
// ---------------------------------------------------------------------------

export function nudges(state: TasksState, ctx: RepoContext): Nudge[] {
    const out: Nudge[] = [];
    const today = ctx.today;
    const parents = ctx.members.filter((m) => m.role === "parent").map((m) => m.id);
    if (ctx.me.role === "guest") return out;

    for (const t of state.tasks) {
        if (isDone(t)) continue;
        const who = t.assigneeMemberIds.length ? t.assigneeMemberIds : parents;
        const late = daysOverdue(t, today);

        if (late > 0) {
            const count = reminderCount(t, today);
            if (count < REMINDERS_BEFORE_PARK) {
                // Reminder 1, 2, 3 — one a day, each raised once (the key carries the count).
                out.push({
                    key: `task-overdue-${t.id}-${count}`,
                    moduleId: "tasks",
                    kind: "task",
                    title: `Still to do: ${t.title}`,
                    body: `${late === 1 ? "Due yesterday" : `${late} days late`}. Reminder ${count} of ${REMINDERS_BEFORE_PARK}.`,
                    href: `${BASE}/${t.id}`,
                    memberIds: who,
                });
            } else {
                // Then it stops nagging and asks for a decision instead.
                out.push({
                    key: `task-parked-${t.id}`,
                    moduleId: "tasks",
                    kind: "task",
                    title: `"${t.title}" needs a decision`,
                    body: `${REMINDERS_BEFORE_PARK} reminders and it hasn't moved. Do it, move the date, or drop it — we'll stop asking.`,
                    href: `${BASE}/${t.id}`,
                    memberIds: [...new Set([...parents, ...who])],
                });
            }
            continue;
        }

        const d = dueDay(t);
        if (d && daysBetween(today, d) === 1) {
            out.push({
                key: `task-due-tomorrow-${t.id}`,
                moduleId: "tasks",
                kind: "task",
                title: `Tomorrow: ${t.title}`,
                body: t.isChore ? `${assigneeNames(t, ctx.members)} · ${t.sprouts} Sprouts.` : `${assigneeNames(t, ctx.members)}${t.goalLabel ? ` · ${t.goalLabel}` : ""}.`,
                href: `${BASE}/${t.id}`,
                memberIds: who,
            });
        }
    }

    for (const rota of dueRotations(state, today)) {
        out.push({
            key: `task-rota-${rota.id}-${rota.nextRotateAt}`,
            moduleId: "tasks",
            kind: "task",
            title: `${rota.name}: your turn this week`,
            body: `${first(ctx.members, rotaNext(rota))} takes it over from ${first(ctx.members, rotaTurn(rota))}.`,
            href: `${BASE}?tab=chores`,
            memberIds: [...new Set([...parents, ...rota.memberIds])],
        });
    }

    for (const t of awaitingProof(state)) {
        out.push({
            key: `task-proof-${t.id}`,
            moduleId: "tasks",
            kind: "task",
            title: `A photo is waiting for you`,
            body: `${first(ctx.members, t.assigneeMemberIds[0] ?? null)} finished "${t.title}". ${t.sprouts} Sprouts on your yes.`,
            href: `${BASE}/${t.id}`,
            memberIds: parents,
        });
    }

    for (const r of pendingRedemptions(state)) {
        const reward = rewardById(state, r.rewardId);
        out.push({
            key: `task-redeem-${r.id}`,
            moduleId: "tasks",
            kind: "task",
            title: `${first(ctx.members, r.memberId)} wants to redeem ${reward?.name ?? "a reward"}`,
            body: `${r.costSprouts} Sprouts. It comes off the balance when you approve it.`,
            href: `${BASE}?tab=rewards`,
            memberIds: parents,
        });
    }

    return out;
}

// ---------------------------------------------------------------------------
// Grounding and search
// ---------------------------------------------------------------------------

export function aiContext(state: TasksState, ctx: RepoContext): string {
    if (!state.tasks.length) return "";
    const today = ctx.today;
    const line = (t: Task): string =>
        `${t.title} (${assigneeNames(t, ctx.members)}${dueDay(t) ? `, due ${dueDay(t)}` : ", no date"}${isOverdue(t, today) ? `, ${daysOverdue(t, today)}d late` : ""}${t.goalLabel ? `, goal ${t.goalLabel}` : ""}${t.valueId ? `, value ${t.valueId}` : ""})`;

    if (ctx.me.role === "guest") {
        const open = state.tasks.filter((t) => !isDone(t));
        return open.length ? `Assigned to this guest: ${open.map(line).join("; ")}. They can tick these off; they see nothing else of the family's list.`.slice(0, 1500) : "";
    }

    const open = state.tasks.filter((t) => !isDone(t));
    const late = open.filter((t) => isOverdue(t, today));
    const todayList = open.filter((t) => isDueToday(t, today));
    const chores = open.filter((t) => t.isChore);
    const stats = weekStats(state, today);
    const balances = ctx.members
        .filter((m) => m.role === "child" && state.ledger.some((e) => e.memberId === m.id))
        .map((m) => `${m.name.split(" ")[0]} ${sproutsBalance(state, m.id)}`);

    return [
        `${open.length} open task(s); ${stats.done}/${stats.total} of this week's are done.`,
        todayList.length ? `Today: ${todayList.slice(0, 8).map(line).join("; ")}.` : "Nothing is due today.",
        late.length ? `Overdue: ${late.slice(0, 6).map(line).join("; ")}.` : "",
        chores.length ? `Chores in flight: ${chores.slice(0, 8).map((t) => `${t.title} — ${assigneeNames(t, ctx.members)}, ${t.sprouts} Sprouts${t.rrule ? `, ${recurLabel(t.rrule).toLowerCase()}` : ""}`).join("; ")}.` : "",
        state.rotas.length ? `Rota: ${state.rotas.map((r) => `${r.name} — ${first(ctx.members, rotaTurn(r))} this week, ${first(ctx.members, rotaNext(r))} next`).join("; ")}.` : "",
        balances.length ? `Sprouts: ${balances.join(", ")}.` : "",
        state.goalProgress.length ? `Work under goals: ${state.goalProgress.map((g) => `${g.label} ${g.done}/${g.total}`).join("; ")}.` : "",
    ]
        .filter(Boolean)
        .join(" ")
        .slice(0, 1500);
}

export function search(state: TasksState, q: string): Array<{ title: string; meta: string; href: string }> {
    const needle = q.toLowerCase();
    const hits: Array<{ title: string; meta: string; href: string }> = [];
    for (const t of state.tasks) {
        if (`${t.title} ${t.notes} ${t.goalLabel}`.toLowerCase().includes(needle)) {
            hits.push({
                title: t.title,
                meta: `${t.isChore ? "Chore" : "Task"}${dueDay(t) ? ` · due ${dueDay(t)}` : ""}${isDone(t) ? " · done" : ""}`,
                href: `${BASE}/${t.id}`,
            });
        }
    }
    for (const r of state.rewards) {
        if (r.name.toLowerCase().includes(needle)) hits.push({ title: r.name, meta: `Reward · ${r.costSprouts} Sprouts`, href: `${BASE}?tab=rewards` });
    }
    return hits.slice(0, 8);
}
