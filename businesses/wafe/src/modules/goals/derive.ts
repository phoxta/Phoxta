import type { AgendaItem, AttentionItem, ChildCard, DashboardContribution, Member, Nudge, ProgressRing, RepoContext } from "@/data/core";
import { clamp, isoDate, money, pct as pctOf, weekStart } from "@/lib/format";
import type {
    Blueprint,
    BlueprintChange,
    Celebration,
    ConnectionSample,
    Goal,
    GoalsState,
    KeyResult,
    LinkedFund,
    LinkedTask,
    MetricReading,
    Milestone,
    Okr,
    Pillar,
    ProgressMode,
} from "./types";
import { PILLAR_LABEL } from "./types";

/**
 * Every number this module shows — and, first, the one function both repos use
 * to decide what a member is allowed to receive.
 *
 * Two rules do most of the work here and they are worth stating plainly:
 *
 *   1. PROGRESS IS COMPUTED. If a goal is measured by a number, its percentage
 *      is the latest reading against the target — and `withLiveMetrics` keeps
 *      that reading level with the ledger, so the deposit goal moves when the
 *      pot does. Otherwise, if it has milestones, the percentage is the
 *      milestones done. A typed percentage only survives when there is nothing
 *      to count and nothing to measure — and then it is typed, on the goal's
 *      own page, because a manual goal must still be movable.
 *   2. A CHILD NEVER RECEIVES A FAMILY GOAL'S WORDS. `visibleTo` rewrites every
 *      family goal — including one a child happens to carry — down to its
 *      `childSafeSummary`, drops its milestones, its owner, its description and
 *      every amount, and hands back a plain percentage. The blueprint arrives
 *      as the vision and the mission with the year-by-year plan removed,
 *      because that is where the money is written. The screens cannot leak what
 *      the slice does not contain, and `sql/goals.sql` says the same thing to
 *      the database so a live session cannot go round them.
 */

const BASE = "/execute/goals";

export const STALL_DAYS = 21;

// ---------------------------------------------------------------------------
// Dates and quarters
// ---------------------------------------------------------------------------

const dayMs = 86400000;

const startOf = (iso: string): number => new Date(`${iso.slice(0, 10)}T00:00:00`).getTime();

/** Whole days from `from` to `to` (negative when `to` is in the past). */
export function daysBetween(from: string, to: string): number {
    return Math.round((startOf(to) - startOf(from)) / dayMs);
}

/** "2026-09-06" → "2026-Q3". */
export function quarterOf(iso: string): string {
    const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
    return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
}

/** "2026-Q3" → "Jul–Sep 2026". */
export function quarterLabel(q: string): string {
    const [y, qq] = q.split("-Q");
    const months = [
        ["Jan", "Mar"],
        ["Apr", "Jun"],
        ["Jul", "Sep"],
        ["Oct", "Dec"],
    ][Math.max(0, Math.min(3, Number(qq) - 1))];
    return `${months[0]}–${months[1]} ${y}`;
}

/** Sort key so "2026-Q4" comes before "2027-Q1". */
export const quarterKey = (q: string): number => {
    const [y, qq] = q.split("-Q");
    return Number(y) * 4 + Number(qq);
};

/** `n` quarters after `q`. */
export function addQuarters(q: string, n: number): string {
    const k = quarterKey(q) + n;
    const y = Math.floor((k - 1) / 4);
    const qq = k - y * 4;
    return `${y}-Q${qq}`;
}

// ---------------------------------------------------------------------------
// Visibility
// ---------------------------------------------------------------------------

/** Core visibility semantics, applied to a goal. */
export function canSeeGoal(g: Goal, me: Member): boolean {
    if (g.ownerMemberId && g.ownerMemberId === me.id) return true;
    switch (g.visibility) {
        case "private":
            return g.ownerMemberId === me.id;
        case "shared":
            return g.sharedWith.includes(me.id);
        case "family":
            return me.role !== "child";
        case "child":
        default:
            return true;
    }
}

/** May this member change this goal? Parents, or the owner of a "me" goal. */
export function canEditGoal(g: Goal, ctx: RepoContext): boolean {
    if (ctx.can("goals.manage")) return true;
    return g.scope === "me" && g.ownerMemberId === ctx.me.id;
}

/**
 * May this member start a goal of their own?
 *
 * The brief gives children a View on goals; the final spec widens that to
 * "full on own Me goals". We honour the wider rule but hold the line the spec
 * left open: a Little or Junior child does not author goals — a parent sets
 * them, and the child works them. Teens and young adults do.
 */
export function canCreateGoal(ctx: RepoContext): boolean {
    if (ctx.can("goals.manage")) return true;
    return ctx.me.role === "child" && (ctx.me.ageBand === "teen" || ctx.me.ageBand === "young-adult");
}

/**
 * The child-safe shadow of a goal: a summary, a percentage, and nothing else.
 *
 * Column for column this is the `wf_goals_child_safe` view — summary, pillar,
 * status, horizon, target date, scope, percentage. No title, no description,
 * no "why", no owner, no metric, no cover, no shares. A screen handed one of
 * these cannot leak what it does not hold.
 */
function childSafe(g: Goal, pct: number): Goal {
    const summary = g.childSafeSummary.trim() || "A family goal";
    return {
        ...g,
        title: summary,
        childSafeSummary: summary,
        description: "",
        why: "",
        valueLabel: undefined,
        ownerMemberId: null,
        progressMode: "manual",
        manualPct: pct,
        metricRef: null,
        coverUrl: undefined,
        visibility: "child",
        sharedWith: [],
    };
}

/**
 * May a child receive this goal in its own words?
 *
 * Only their own goal, or one somebody deliberately shared with them by name —
 * and never a FAMILY-scope goal, whoever happens to be carrying it. A child who
 * owns a family goal (Dami and the birthday song) still reads it as the family
 * words, because the words are the family's, not hers. The database says the
 * same thing in `wf_goal_row_visible()`.
 */
function childMaySeeInFull(g: Goal, meId: string): boolean {
    if (g.scope === "family") return false;
    if (g.ownerMemberId === meId) return true;
    return g.visibility === "shared" && g.sharedWith.includes(meId);
}

/** The one door onto a family goal for a child — the view's own WHERE clause. */
function childMaySeeSummary(g: Goal): boolean {
    return g.scope !== "me" && (g.visibility === "family" || g.visibility === "child") && Boolean(g.childSafeSummary.trim());
}

/** The blueprint as anyone who is not a parent receives it: the poster, no plan. */
function posterOnly(b: Blueprint): Blueprint {
    return { ...b, goals1y: [], goals3y: [], goals5y: [], note: "", authorMemberId: null };
}

/**
 * The slice this member may receive.
 *
 * Parent — everything except another member's private goal.
 * Child   — their own goals in full; every other goal they may see at all,
 *           rewritten to its child-safe summary with no milestones, no
 *           amounts, no blueprint history and no connection metrics.
 * Guest   — nothing, unless a parent granted `goals.view`, and then only the
 *           family's shared goals and its celebrations. Never the blueprint
 *           history, the reviews, the numbers or anyone's private goal.
 */
export function visibleTo(state: GoalsState, ctx: RepoContext): GoalsState {
    const me = ctx.me;

    if (me.role === "guest") {
        if (!ctx.can("goals.view")) {
            return { blueprints: [], goals: [], milestones: [], okrs: [], keyResults: [], metrics: [], celebrations: [], reviews: [], connection: [] };
        }
        const goals = state.goals.filter((g) => g.scope !== "me" && canSeeGoal(g, me)).map((g) => ({ ...g, manualPct: goalPct(state, g), progressMode: "manual" as ProgressMode, metricRef: null }));
        const ids = new Set(goals.map((g) => g.id));
        return {
            blueprints: state.blueprints.slice(0, 1).map(posterOnly),
            goals,
            milestones: [],
            okrs: [],
            keyResults: [],
            metrics: [],
            celebrations: state.celebrations.filter((c) => ids.has(c.goalId)),
            reviews: [],
            connection: [],
        };
    }

    if (me.role === "child") {
        // A child's own goals in full; every family goal only as the line a
        // parent wrote for them. This is the rule `wf_goal_row_visible()` and
        // the `wf_goals_child_safe` view enforce in the database, so a child's
        // live session cannot select a title this slice does not carry either.
        const mine = state.goals.filter((g) => childMaySeeInFull(g, me.id));
        const mineIds = new Set(mine.map((g) => g.id));
        const seen = state.goals.filter((g) => mineIds.has(g.id) || childMaySeeSummary(g));
        const goals = seen.map((g) => (mineIds.has(g.id) ? g : childSafe(g, goalPct(state, g))));
        const seenIds = new Set(seen.map((g) => g.id));
        const okrs = state.okrs.filter((o) => o.goalIds.some((id) => mineIds.has(id))).map((o) => ({ ...o, goalIds: o.goalIds.filter((id) => mineIds.has(id)) }));
        return {
            // The vision and the mission, never the plan: the one- and
            // five-year lines carry the family's money in them.
            blueprints: state.blueprints.slice(0, 1).map(posterOnly),
            goals,
            milestones: state.milestones.filter((m) => mineIds.has(m.goalId)),
            okrs,
            keyResults: state.keyResults.filter((k) => okrs.some((o) => o.id === k.okrId)),
            metrics: state.metrics.filter((m) => mine.some((g) => g.metricRef === m.ref) && m.unit !== "cents"),
            celebrations: state.celebrations.filter((c) => {
                if (!seenIds.has(c.goalId)) return false;
                if (mineIds.has(c.goalId)) return true;
                // A celebration says the goal's own words out loud, so a child
                // only gets the ones written for a goal meant for children.
                return state.goals.some((g) => g.id === c.goalId && g.visibility === "child");
            }),
            reviews: [],
            connection: [],
        };
    }

    const goals = state.goals.filter((g) => canSeeGoal(g, me));
    const ids = new Set(goals.map((g) => g.id));
    const okrs = state.okrs.map((o) => ({ ...o, goalIds: o.goalIds.filter((id) => ids.has(id)) }));
    return {
        blueprints: state.blueprints,
        goals,
        milestones: state.milestones.filter((m) => ids.has(m.goalId)),
        okrs,
        keyResults: state.keyResults,
        metrics: state.metrics,
        celebrations: state.celebrations.filter((c) => ids.has(c.goalId)),
        reviews: state.reviews,
        connection: state.connection,
    };
}

// ---------------------------------------------------------------------------
// Goals: milestones, metrics, progress
// ---------------------------------------------------------------------------

export function goalById(state: GoalsState, id: string): Goal | undefined {
    return state.goals.find((g) => g.id === id);
}

export function milestonesOf(state: GoalsState, goalId: string): Milestone[] {
    return state.milestones.filter((m) => m.goalId === goalId).sort((a, b) => a.order - b.order);
}

/** The most recent reading of a linked number. */
export function metricFor(state: GoalsState, ref: string | null | undefined): MetricReading | undefined {
    if (!ref) return undefined;
    return state.metrics
        .filter((m) => m.ref === ref)
        .sort((a, b) => a.at.localeCompare(b.at))
        .at(-1);
}

/** Every reading of a number, oldest first — the goal's history chart. */
export function metricHistory(state: GoalsState, ref: string | null | undefined): MetricReading[] {
    if (!ref) return [];
    return state.metrics.filter((m) => m.ref === ref).sort((a, b) => a.at.localeCompare(b.at));
}

/**
 * The mode a goal is ACTUALLY scored by.
 *
 * "Progress is computed, not typed" is enforced here rather than in the form:
 * a goal with a live number is measured, a goal with milestones is counted,
 * whatever the record says. Typing only survives when there is nothing to
 * count and nothing to measure.
 *
 * A measured goal stays measured. Milestones are the steps somebody takes to
 * move the number — adding "Set up the standing order" to the deposit goal
 * must not quietly take the pot's £16,200 off the screen and replace it with
 * "0 of 1 steps". So a working metric outranks milestones whenever the goal
 * was set up to be measured; milestones win only when the metric is gone or
 * has never been read.
 */
export function effectiveMode(state: GoalsState, g: Goal): ProgressMode {
    const measured = Boolean(g.metricRef && metricFor(state, g.metricRef));
    if (measured && g.progressMode === "metric") return "metric";
    if (milestonesOf(state, g.id).length) return "milestones";
    if (measured) return "metric";
    return "manual";
}

/** 0–100, computed wherever it can be. */
export function goalPct(state: GoalsState, g: Goal): number {
    if (g.status === "done") return 100;
    switch (effectiveMode(state, g)) {
        case "milestones": {
            const ms = milestonesOf(state, g.id);
            return pctOf(ms.filter((m) => m.done).length, ms.length);
        }
        case "metric": {
            const m = metricFor(state, g.metricRef);
            if (!m || m.target <= 0) return 0;
            return clamp(Math.round((m.current / m.target) * 100), 0, 100);
        }
        default:
            return clamp(Math.round(g.manualPct), 0, 100);
    }
}

// ---------------------------------------------------------------------------
// The ledger's own number
// ---------------------------------------------------------------------------

/**
 * The savings pot behind a goal, read off the Finance slice.
 *
 * Two ways they meet, and either is enough: the pot's id IS the goal's
 * `metricRef` ("fund-home-deposit"), or the pot names the goal it is for.
 * Modules never read each other's tables — this takes what Finance publishes.
 */
export function fundForGoal(g: Goal, funds: LinkedFund[]): LinkedFund | undefined {
    return funds.find((f) => (g.metricRef ? f.id === g.metricRef : false) || (f.goalId ? f.goalId === g.id : false));
}

const fundCents = (f: LinkedFund): number => f.savedCents ?? f.balanceCents ?? 0;

/**
 * The state with every measured goal's number brought up to date from the
 * ledger.
 *
 * The deposit goal says "the number comes straight from the pot in Finance —
 * nobody types it", and this is the sentence being true: whenever the pot has
 * moved past the last stored reading, a reading is appended for today, so the
 * ring, the percentage and the little history chart all follow the money. It
 * appends rather than rewrites, so the goal keeps its history, and it changes
 * nothing when the two already agree.
 *
 * `funds` is empty for anyone Finance will not show its pots to (a guest, a
 * child without the grant), and then this is the identity function.
 */
export function withLiveMetrics(state: GoalsState, funds: LinkedFund[], today: string): GoalsState {
    if (!funds.length || !state.metrics.length) return state;
    const at = `${today}T09:00:00.000Z`;
    const extra: MetricReading[] = [];

    for (const { last, fund } of ledgerPairs(state, funds)) {
        const current = fundCents(fund);
        const target = fund.targetCents && fund.targetCents > 0 ? fund.targetCents : last.target;
        if (current === last.current && target === last.target) continue;
        extra.push({ ...last, id: `live-${last.ref}`, current, target, at: at > last.at ? at : last.at });
    }

    return extra.length ? { ...state, metrics: [...state.metrics, ...extra] } : state;
}

/** Every fund-backed metric, paired with the pot it is supposed to be reading. */
function ledgerPairs(state: GoalsState, funds: LinkedFund[]): Array<{ last: MetricReading; fund: LinkedFund }> {
    const out: Array<{ last: MetricReading; fund: LinkedFund }> = [];
    for (const ref of new Set(state.goals.map((g) => g.metricRef).filter((r): r is string => Boolean(r)))) {
        const last = metricFor(state, ref);
        if (!last || last.source !== "finance-fund") continue;
        const goal = state.goals.find((g) => g.metricRef === ref);
        const fund = goal ? fundForGoal(goal, funds) : funds.find((f) => f.id === ref);
        if (fund) out.push({ last, fund });
    }
    return out;
}

/**
 * Readings the ledger has moved past — what somebody with the right to write
 * should record, so the stored series (and with it the dashboard, the
 * companion's context and the database's own `wf_goal_pct`) catches up with
 * the money. `withLiveMetrics` makes the screen right immediately; this makes
 * it right for everybody.
 */
export function ledgerDrift(state: GoalsState, funds: LinkedFund[]): Array<{ ref: string; current: number }> {
    if (!funds.length) return [];
    return ledgerPairs(state, funds)
        .filter(({ last, fund }) => fundCents(fund) !== last.current)
        .map(({ last, fund }) => ({ ref: last.ref, current: fundCents(fund) }));
}

/** The reading in the family's own words: "£16,200 of £30,000", "2 of 4 books". */
export function metricText(m: MetricReading, currency: string): string {
    if (m.unit === "cents") return `${money(m.current, currency)} of ${money(m.target, currency)}`;
    if (m.unit === "km") return `${m.current} km of ${m.target} km`;
    if (m.unit === "pct") return `${m.current}% of ${m.target}%`;
    return `${m.current} of ${m.target}`;
}

/** The next thing to do on this goal. */
export function nextMilestone(state: GoalsState, goalId: string): Milestone | undefined {
    return milestonesOf(state, goalId).find((m) => !m.done);
}

/** ISO datetime of the last time this goal actually moved. */
export function lastProgressAt(state: GoalsState, g: Goal): string {
    const stamps = [g.createdAt];
    for (const m of milestonesOf(state, g.id)) if (m.doneAt) stamps.push(m.doneAt);
    for (const r of metricHistory(state, g.metricRef)) stamps.push(r.at);
    if (effectiveMode(state, g) === "manual") stamps.push(g.updatedAt);
    return stamps.sort().at(-1) as string;
}

/** Active, going nowhere for three weeks. */
export function isStalled(state: GoalsState, g: Goal, today: string): boolean {
    if (g.status !== "active") return false;
    return -daysBetween(today, isoDate(lastProgressAt(state, g))) >= STALL_DAYS;
}

export function stalledGoals(state: GoalsState, today: string): Goal[] {
    return state.goals.filter((g) => isStalled(state, g, today));
}

/** Every goal a member is on the hook for. */
export function goalsFor(state: GoalsState, memberId: string): Goal[] {
    return state.goals.filter((g) => g.ownerMemberId === memberId);
}

/** The family's shared goals — the ones the roadmap and "Our Future" are about. */
export function familyGoals(state: GoalsState): Goal[] {
    return state.goals.filter((g) => g.scope !== "me");
}

export function activeGoals(state: GoalsState): Goal[] {
    return state.goals.filter((g) => g.status === "active");
}

/** "Our Future": the average of every active shared goal. */
export function ourFuturePct(state: GoalsState): number {
    const list = familyGoals(state).filter((g) => g.status !== "paused");
    if (!list.length) return 0;
    return Math.round(list.reduce((n, g) => n + goalPct(state, g), 0) / list.length);
}

/** The roll-up the dashboard shows: one number per pillar in play. */
export function byPillar(state: GoalsState): Array<{ pillar: Pillar; label: string; pct: number; count: number }> {
    const out: Array<{ pillar: Pillar; label: string; pct: number; count: number }> = [];
    for (const g of state.goals.filter((x) => x.status !== "paused")) {
        const row = out.find((r) => r.pillar === g.pillar);
        if (row) {
            row.pct += goalPct(state, g);
            row.count += 1;
        } else {
            out.push({ pillar: g.pillar, label: PILLAR_LABEL[g.pillar], pct: goalPct(state, g), count: 1 });
        }
    }
    return out.map((r) => ({ ...r, pct: Math.round(r.pct / r.count) })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** Milestones falling due in the next `days` days, soonest first. */
export function upcomingMilestones(state: GoalsState, today: string, days = 7): Array<{ milestone: Milestone; goal: Goal; inDays: number }> {
    const out: Array<{ milestone: Milestone; goal: Goal; inDays: number }> = [];
    for (const m of state.milestones) {
        if (m.done || !m.due) continue;
        const goal = goalById(state, m.goalId);
        if (!goal || goal.status !== "active") continue;
        const inDays = daysBetween(today, m.due);
        if (inDays <= days) out.push({ milestone: m, goal, inDays });
    }
    return out.sort((a, b) => a.inDays - b.inDays);
}

/** Goals finished but never celebrated — the module's happiest to-do. */
export function awaitingCelebration(state: GoalsState): Goal[] {
    const done = new Set(state.celebrations.map((c) => c.goalId));
    return state.goals.filter((g) => g.status === "done" && !done.has(g.id));
}

export function celebrationsOf(state: GoalsState, goalId: string): Celebration[] {
    return state.celebrations.filter((c) => c.goalId === goalId).sort((a, b) => b.date.localeCompare(a.date));
}

// ---------------------------------------------------------------------------
// The blueprint
// ---------------------------------------------------------------------------

export function currentBlueprint(state: GoalsState): Blueprint | undefined {
    return [...state.blueprints].sort((a, b) => b.version - a.version)[0];
}

export function blueprintVersions(state: GoalsState): Blueprint[] {
    return [...state.blueprints].sort((a, b) => b.version - a.version);
}

const linesText = (lines: Blueprint["goals1y"]): string => lines.map((l) => `${PILLAR_LABEL[l.pillar]}: ${l.text}`).join(" · ");

/** What changed between two versions, field by field, in plain words. */
export function blueprintDiff(from: Blueprint | undefined, to: Blueprint | undefined): BlueprintChange[] {
    if (!to) return [];
    if (!from) return [{ field: "The first version", from: "—", to: `Version ${to.version}, written ${to.createdAt.slice(0, 10)}` }];
    const out: BlueprintChange[] = [];
    const push = (field: string, a: string, b: string) => {
        if (a.trim() !== b.trim()) out.push({ field, from: a || "—", to: b || "—" });
    };
    push("Values", from.valuesSnapshot.join(" · "), to.valuesSnapshot.join(" · "));
    push("Mission", from.mission, to.mission);
    push("Vision", from.vision, to.vision);
    push("One year", linesText(from.goals1y), linesText(to.goals1y));
    push("Three years", linesText(from.goals3y), linesText(to.goals3y));
    push("Five years", linesText(from.goals5y), linesText(to.goals5y));
    return out;
}

// ---------------------------------------------------------------------------
// OKRs and the roadmap
// ---------------------------------------------------------------------------

export function keyResultsOf(state: GoalsState, okrId: string): KeyResult[] {
    return state.keyResults.filter((k) => k.okrId === okrId).sort((a, b) => a.order - b.order);
}

export function krPct(k: KeyResult): number {
    if (k.target <= 0) return 0;
    return clamp(Math.round((k.current / k.target) * 100), 0, 100);
}

/** An objective is as done as its key results are. */
export function okrPct(state: GoalsState, okr: Okr): number {
    const krs = keyResultsOf(state, okr.id);
    if (!krs.length) return 0;
    return Math.round(krs.reduce((n, k) => n + krPct(k), 0) / krs.length);
}

export function okrsForQuarter(state: GoalsState, quarter: string): Okr[] {
    return state.okrs.filter((o) => o.quarter === quarter);
}

export function okrsForGoal(state: GoalsState, goalId: string): Okr[] {
    return state.okrs.filter((o) => o.goalIds.includes(goalId));
}

/** The columns the roadmap draws: this quarter, plus every quarter in play. */
export function roadmapQuarters(state: GoalsState, today: string): string[] {
    const here = quarterOf(today);
    const set = new Set<string>([here, addQuarters(here, 1), addQuarters(here, 2), addQuarters(here, 3)]);
    for (const g of state.goals) if (g.targetDate) set.add(quarterOf(g.targetDate));
    for (const o of state.okrs) set.add(o.quarter);
    return [...set].sort((a, b) => quarterKey(a) - quarterKey(b));
}

/** The rows: only the pillars this family actually has goals in. */
export function roadmapPillars(state: GoalsState): Pillar[] {
    const seen = new Set<Pillar>();
    for (const g of state.goals) seen.add(g.pillar);
    return [...seen].sort((a, b) => PILLAR_LABEL[a].localeCompare(PILLAR_LABEL[b]));
}

/** Milestone dots for a goal's chip on the timeline. */
export function milestoneDots(state: GoalsState, goalId: string): Array<{ id: string; done: boolean; title: string }> {
    return milestonesOf(state, goalId).map((m) => ({ id: m.id, done: m.done, title: m.title }));
}

// ---------------------------------------------------------------------------
// Connection metrics
// ---------------------------------------------------------------------------

/** Today's sample, computed from this module plus whatever Tasks is holding. */
export function connectionSample(state: GoalsState, tasks: LinkedTask[], today: string): ConnectionSample {
    const open = tasks.filter((t) => !(t.done === true || t.status === "done"));
    const counted = open.length ? open : tasks;
    const withGoal = counted.filter((t) => Boolean(t.goalId)).length;
    const active = activeGoals(state);
    const withMs = active.filter((g) => milestonesOf(state, g.id).length > 0).length;
    return {
        date: today,
        tasksWithGoalPct: pctOf(withGoal, counted.length),
        goalsWithMilestonePct: pctOf(withMs, active.length),
        tasksCounted: counted.length,
        goalsCounted: active.length,
    };
}

/** The stored series, oldest first, capped for the chart. */
export function connectionSeries(state: GoalsState, days = 14): ConnectionSample[] {
    return [...state.connection].sort((a, b) => a.date.localeCompare(b.date)).slice(-days);
}

// ---------------------------------------------------------------------------
// Linked tasks (read-only, from the Tasks slice)
// ---------------------------------------------------------------------------

/** Loose comparison: "Christmas in Lagos" matches "Christmas in Lagos, all five of us". */
const norm = (v: string): string =>
    v
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[^a-z0-9 ]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

function sameThing(label: string, goal: Goal): boolean {
    const a = norm(label);
    if (!a) return false;
    for (const candidate of [goal.title, goal.childSafeSummary]) {
        const b = norm(candidate);
        if (b && (b.startsWith(a) || a.startsWith(b))) return true;
    }
    return false;
}

/**
 * Tasks pointing at this goal (or one of its milestones).
 *
 * A task carries the goal's NAME as well as its id, and the name is what a
 * parent typed. When the two disagree — a task written against another
 * module's numbering, a goal deleted and its id reused — the name wins, so
 * "Order Dami's GCSE revision guides" never turns up under the house deposit.
 * A task with no name attached is matched on the id alone, as before.
 */
export function tasksForGoal(tasks: LinkedTask[], goal: Goal, milestoneIds: string[] = []): LinkedTask[] {
    const ms = new Set(milestoneIds);
    return tasks.filter((t) => {
        const label = (t.goalLabel ?? "").trim();
        if (label) return sameThing(label, goal);
        return t.goalId === goal.id || (t.milestoneId ? ms.has(t.milestoneId) : false);
    });
}

/** The prefilled link Tasks reads: /execute/tasks?new=<title>&goalId=<id>. */
export function newTaskHref(title: string, goalId: string, milestoneId?: string): string {
    const q = new URLSearchParams({ new: title, goalId });
    if (milestoneId) q.set("milestoneId", milestoneId);
    return `/execute/tasks?${q.toString()}`;
}

// ---------------------------------------------------------------------------
// Shared surfaces
// ---------------------------------------------------------------------------

export function dashboard(state: GoalsState, ctx: RepoContext): DashboardContribution {
    if (!state.goals.length) return {};
    const agenda: AgendaItem[] = [];
    const attention: AttentionItem[] = [];
    const rings: ProgressRing[] = [];
    const childCards: ChildCard[] = [];
    const child = ctx.me.role === "child";

    // Today: milestones falling due today.
    for (const { milestone, goal } of upcomingMilestones(state, ctx.today, 0)) {
        agenda.push({
            id: `ms-${milestone.id}`,
            moduleId: "goals",
            area: "execute",
            title: milestone.title,
            meta: `Milestone · ${goal.title}`,
            memberId: goal.ownerMemberId,
            at: null,
            done: milestone.done,
            href: `${BASE}/${goal.id}`,
            sort: milestone.due && milestone.due < ctx.today ? 120 : 320,
        });
    }

    // Needs attention: milestones landing this week, stalls, and things to celebrate.
    for (const { milestone, goal, inDays } of upcomingMilestones(state, ctx.today, 7)) {
        if (inDays === 0) continue;
        attention.push({
            id: `due-${milestone.id}`,
            moduleId: "goals",
            area: "execute",
            tone: inDays < 0 ? "danger" : "info",
            title: inDays < 0 ? `Overdue: ${milestone.title}` : `${milestone.title} — ${inDays === 1 ? "tomorrow" : `in ${inDays} days`}`,
            body: `${goal.title}${goal.valueLabel ? ` · ${goal.valueLabel}` : ""}`,
            href: `${BASE}/${goal.id}`,
            weight: inDays < 0 ? 72 : 54 - inDays,
        });
    }
    if (!child) {
        for (const g of stalledGoals(state, ctx.today)) {
            attention.push({
                id: `stalled-${g.id}`,
                moduleId: "goals",
                area: "execute",
                tone: "warn",
                title: `"${g.title}" hasn't moved in three weeks`,
                body: "Give it one small next step, park it, or let it go — all three are honest.",
                href: `${BASE}/${g.id}`,
                weight: 46,
            });
        }
    }
    for (const g of awaitingCelebration(state)) {
        // Only offer it to somebody who could actually write it.
        if (child && g.ownerMemberId !== ctx.me.id) continue;
        attention.push({
            id: `celebrate-${g.id}`,
            moduleId: "goals",
            area: "execute",
            tone: "celebrate",
            title: `${g.title} — done`,
            body: "Write it down before it blurs: a photo, a sentence, who was there.",
            href: `${BASE}/${g.id}?celebrate=1`,
            weight: 80,
        });
    }

    // What we're building: Our Future, then the three shared goals furthest on.
    const shared = familyGoals(state).filter((g) => g.status === "active");
    if (shared.length && !child) {
        rings.push({
            id: "our-future",
            moduleId: "goals",
            area: "execute",
            label: "Our Future",
            pct: ourFuturePct(state),
            sub: `${shared.length} goal${shared.length === 1 ? "" : "s"} in play`,
            href: BASE,
        });
        for (const g of [...shared].sort((a, b) => goalPct(state, b) - goalPct(state, a)).slice(0, 3)) {
            const ms = milestonesOf(state, g.id);
            rings.push({
                id: g.id,
                moduleId: "goals",
                area: "execute",
                label: g.title,
                pct: goalPct(state, g),
                sub: ms.length ? `${ms.filter((m) => m.done).length} of ${ms.length} milestones` : `Target ${g.targetDate.slice(0, 7)}`,
                href: `${BASE}/${g.id}`,
            });
        }
    }

    // A child's cards: their own goals, then the family's, in the family's own words.
    if (child) {
        for (const g of goalsFor(state, ctx.me.id).filter((x) => x.status !== "paused").slice(0, 3)) {
            const next = nextMilestone(state, g.id);
            childCards.push({
                id: g.id,
                moduleId: "goals",
                area: "execute",
                title: g.title,
                body: next ? `Next: ${next.title}` : "Keep going — you're on your way.",
                emoji: "🎯",
                href: `${BASE}/${g.id}`,
                pct: goalPct(state, g),
                done: g.status === "done",
            });
        }
        for (const g of familyGoals(state).filter((x) => x.status === "active").slice(0, 2)) {
            childCards.push({
                id: `fam-${g.id}`,
                moduleId: "goals",
                area: "execute",
                title: g.title,
                body: "Something the whole family is working on.",
                emoji: "🌱",
                href: BASE,
                pct: goalPct(state, g),
            });
        }
    }

    return { agenda, attention, rings, childCards };
}

export function nudges(state: GoalsState, ctx: RepoContext): Nudge[] {
    if (ctx.me.role === "guest") return [];
    const out: Nudge[] = [];
    const parents = ctx.members.filter((m) => m.role === "parent").map((m) => m.id);
    const week = weekStart(ctx.today);

    // A milestone gets one warning, seven days out.
    for (const { milestone, goal, inDays } of upcomingMilestones(state, ctx.today, 7)) {
        const who = goal.ownerMemberId ? [goal.ownerMemberId] : parents;
        out.push({
            key: `goals-milestone-${milestone.id}`,
            moduleId: "goals",
            kind: "goal",
            title: inDays < 0 ? `Overdue: ${milestone.title}` : `${milestone.title} is due ${inDays === 0 ? "today" : inDays === 1 ? "tomorrow" : `in ${inDays} days`}`,
            body: `Part of "${goal.title}". ${milestonesOf(state, goal.id).filter((m) => m.done).length} of ${milestonesOf(state, goal.id).length} done so far.`,
            href: `${BASE}/${goal.id}`,
            memberIds: [...new Set([...who, ...parents])],
            notBefore: milestone.due ? new Date(startOf(milestone.due) - 7 * dayMs).toISOString() : undefined,
        });
    }

    // A stalled goal is raised once a week, never once a day.
    for (const g of stalledGoals(state, ctx.today)) {
        out.push({
            key: `goals-stalled-${g.id}-${week}`,
            moduleId: "goals",
            kind: "goal",
            title: `"${g.title}" has stalled`,
            body: `Nothing has moved on it for ${STALL_DAYS} days. One small step, a pause, or a kind goodbye.`,
            href: `${BASE}/${g.id}`,
            memberIds: g.ownerMemberId ? [...new Set([g.ownerMemberId, ...parents])] : parents,
        });
    }

    // Something finished and nobody wrote it down.
    for (const g of awaitingCelebration(state)) {
        if (ctx.me.role === "child" && g.ownerMemberId !== ctx.me.id) continue;
        out.push({
            key: `goals-celebrate-${g.id}`,
            moduleId: "goals",
            kind: "celebrate",
            title: `You finished "${g.title}"`,
            body: "Add a photo and a sentence, and it goes on the family timeline.",
            href: `${BASE}/${g.id}?celebrate=1`,
            memberIds: g.ownerMemberId ? [...new Set([g.ownerMemberId, ...parents])] : parents,
        });
    }

    // The quarterly review, a fortnight before the quarter turns.
    if (ctx.can("goals.manage")) {
        const q = quarterOf(ctx.today);
        const endOfQuarter = ["03-31", "06-30", "09-30", "12-31"][Number(q.split("-Q")[1]) - 1];
        const endIso = `${q.split("-")[0]}-${endOfQuarter}`;
        const left = daysBetween(ctx.today, endIso);
        if (left >= 0 && left <= 14 && !state.reviews.some((r) => r.kind === "quarter" && r.period === q)) {
            out.push({
                key: `goals-quarter-review-${q}`,
                moduleId: "goals",
                kind: "goal",
                title: `${quarterLabel(q)} is nearly over`,
                body: "Fifteen minutes on the roadmap: what moved, what didn't, and what the next quarter is for.",
                href: `${BASE}/roadmap`,
                memberIds: parents,
            });
        }
    }

    return out;
}

export function aiContext(state: GoalsState, ctx: RepoContext): string {
    if (!state.goals.length) return "";
    const name = (id: string | null) => (id ? ctx.members.find((m) => m.id === id)?.name.split(" ")[0] ?? "someone" : "the family");

    if (ctx.me.role === "child") {
        const mine = goalsFor(state, ctx.me.id).map((g) => `${g.title} — ${goalPct(state, g)}%${nextMilestone(state, g.id) ? `, next: ${nextMilestone(state, g.id)?.title}` : ""}`);
        const fam = familyGoals(state).map((g) => `${g.title} (${goalPct(state, g)}%)`);
        return [mine.length ? `${ctx.me.name.split(" ")[0]}'s own goals: ${mine.join("; ")}.` : "", fam.length ? `What the family is working on, in family words: ${fam.join("; ")}. No amounts or details are available for these.` : ""]
            .filter(Boolean)
            .join(" ")
            .slice(0, 1500);
    }

    if (ctx.me.role === "guest") {
        const fam = state.goals.map((g) => `${g.title} (${goalPct(state, g)}%)`);
        return fam.length ? `Family goals shared with this guest: ${fam.join("; ")}. Nothing private and no numbers are visible to them.`.slice(0, 1500) : "";
    }

    const bp = currentBlueprint(state);
    const lines: string[] = [];
    if (bp) lines.push(`Vision (blueprint v${bp.version}): ${bp.vision}`);
    lines.push(
        `Goals: ${state.goals
            .filter((g) => g.status !== "done")
            .map((g) => {
                const ms = milestonesOf(state, g.id);
                const m = metricFor(state, g.metricRef);
                return `"${g.title}" (${PILLAR_LABEL[g.pillar]}, ${name(g.ownerMemberId)}, target ${g.targetDate}, ${goalPct(state, g)}%${ms.length ? `, ${ms.filter((x) => x.done).length}/${ms.length} milestones, next: ${nextMilestone(state, g.id)?.title ?? "—"}` : ""}${m ? `, ${metricText(m, ctx.space.currency)}` : ""}${g.status === "paused" ? ", paused" : ""})`;
            })
            .join("; ")}.`,
    );
    const stalled = stalledGoals(state, ctx.today);
    if (stalled.length) lines.push(`Stalled ${STALL_DAYS}+ days: ${stalled.map((g) => g.title).join(", ")}.`);
    const q = quarterOf(ctx.today);
    const okrs = okrsForQuarter(state, q);
    if (okrs.length) lines.push(`${q} OKRs: ${okrs.map((o) => `${o.objective} (${okrPct(state, o)}%) — ${keyResultsOf(state, o.id).map((k) => `${k.text} ${k.current}/${k.target}${k.unit}`).join("; ")}`).join(" | ")}.`);
    lines.push(`Our Future roll-up: ${ourFuturePct(state)}%.`);
    const done = state.goals.filter((g) => g.status === "done");
    if (done.length) lines.push(`Finished: ${done.map((g) => g.title).join(", ")}.`);
    return lines.join(" ").slice(0, 1500);
}

export function search(state: GoalsState, q: string): Array<{ title: string; meta: string; href: string }> {
    const needle = q.toLowerCase();
    const hits: Array<{ title: string; meta: string; href: string }> = [];
    for (const g of state.goals) {
        if (`${g.title} ${g.description} ${g.why} ${g.valueLabel ?? ""}`.toLowerCase().includes(needle)) {
            hits.push({ title: g.title, meta: `Goal · ${PILLAR_LABEL[g.pillar]} · ${goalPct(state, g)}%`, href: `${BASE}/${g.id}` });
        }
    }
    for (const m of state.milestones) {
        if (m.title.toLowerCase().includes(needle)) {
            const g = goalById(state, m.goalId);
            if (g) hits.push({ title: m.title, meta: `Milestone · ${g.title}`, href: `${BASE}/${g.id}` });
        }
    }
    for (const o of state.okrs) {
        if (o.objective.toLowerCase().includes(needle)) hits.push({ title: o.objective, meta: `Objective · ${quarterLabel(o.quarter)}`, href: `${BASE}/roadmap?q=${o.quarter}` });
    }
    const bp = currentBlueprint(state);
    if (bp && `${bp.vision} ${bp.mission}`.toLowerCase().includes(needle)) {
        hits.push({ title: "Our vision blueprint", meta: `Version ${bp.version}`, href: `${BASE}/blueprint` });
    }
    return hits.slice(0, 8);
}
