import type { RepoContext } from "@/data/core";
import { seedContext } from "@/data/coreSeed";
import { clamp, uid } from "@/lib/format";
import { canCreateGoal, canEditGoal, metricFor, milestonesOf, visibleTo } from "./derive";
import { seed } from "./seed";
import type { Blueprint, BlueprintDraft, Celebration, ConnectionSample, Goal, GoalReview, GoalStatus, GoalsRepo, GoalsState, KeyResult, MetricReading, Milestone, NewGoal, Okr, ReviewKind } from "./types";

/**
 * The demo's goals, persisted in this browser.
 *
 * Every write is real: add a goal, tick the last milestone and watch the goal
 * finish itself and ask to be celebrated, record a deposit and watch a
 * measured goal move, write a new blueprint version and diff it against the
 * old one. It all survives a reload.
 *
 * The permission checks here are the ones the live policies enforce, so "Not
 * allowed" means the same thing in both modes: a guest cannot write at all, a
 * child can only touch a goal of their own, and only a parent writes the
 * blueprint, the OKRs, the reviews and the nightly connection metrics.
 */

const KEY = "wafe:demo:goals:v2";

function isState(v: unknown): v is GoalsState {
    if (!v || typeof v !== "object") return false;
    const s = v as Partial<GoalsState>;
    return Array.isArray(s.goals) && Array.isArray(s.milestones) && Array.isArray(s.blueprints);
}

const now = (): string => new Date().toISOString();

export class LocalGoalsRepo implements GoalsRepo {
    private cache: GoalsState | null = null;

    constructor(private ctx: RepoContext) {}

    // -- storage -------------------------------------------------------------

    private all(): GoalsState {
        if (this.cache) return this.cache;
        try {
            const raw = localStorage.getItem(KEY);
            const parsed: unknown = raw ? JSON.parse(raw) : null;
            if (isState(parsed)) {
                this.cache = parsed;
                return parsed;
            }
        } catch {
            /* a stale or foreign blob must never break the demo */
        }
        const fresh = seed(seedContext(this.ctx.space, this.ctx.members, this.ctx.today));
        this.save(fresh);
        return fresh;
    }

    private save(s: GoalsState): void {
        this.cache = s;
        try {
            localStorage.setItem(KEY, JSON.stringify(s));
        } catch {
            /* private browsing: the session still works, it just won't persist */
        }
    }

    private write(fn: (s: GoalsState) => void): void {
        const s = { ...this.all() };
        fn(s);
        this.save(s);
    }

    // -- permissions ---------------------------------------------------------

    private deny(): never {
        throw new Error("Not allowed");
    }

    /** Parents run the blueprint, the roadmap, the reviews and the metrics. */
    private manage(): void {
        if (!this.ctx.can("goals.manage")) this.deny();
    }

    private notGuest(): void {
        if (this.ctx.role === "guest") this.deny();
    }

    private mustEdit(goalId: string): Goal {
        const g = this.all().goals.find((x) => x.id === goalId);
        if (!g || !canEditGoal(g, this.ctx)) throw new Error("Not allowed");
        return g;
    }

    private goalOfMilestone(id: string): { goal: Goal; milestone: Milestone } {
        const milestone = this.all().milestones.find((m) => m.id === id);
        if (!milestone) throw new Error("Not allowed");
        return { goal: this.mustEdit(milestone.goalId), milestone };
    }

    // -- load ----------------------------------------------------------------

    async load(): Promise<GoalsState> {
        return visibleTo(this.all(), this.ctx);
    }

    // -- goals ---------------------------------------------------------------

    async addGoal(input: NewGoal): Promise<Goal> {
        this.notGuest();
        if (!canCreateGoal(this.ctx)) this.deny();
        const parent = this.ctx.can("goals.manage");
        // A child may only ever create a goal of their own, however the form asks.
        const scope = parent ? input.scope : "me";
        const owner = parent ? input.ownerMemberId : this.ctx.me.id;
        const id = uid("goal");
        const stamp = now();
        const goal: Goal = {
            id,
            spaceId: this.ctx.space.id,
            title: input.title.trim(),
            childSafeSummary: (input.childSafeSummary || input.title).trim(),
            scope,
            ownerMemberId: owner,
            pillar: input.pillar,
            valueLabel: input.valueLabel,
            horizon: input.horizon,
            targetDate: input.targetDate,
            status: "active",
            description: input.description?.trim() ?? "",
            why: input.why?.trim() ?? "",
            progressMode: input.progressMode,
            manualPct: 0,
            metricRef: input.metricRef ?? null,
            coverUrl: input.coverUrl,
            visibility: input.visibility,
            sharedWith: input.sharedWith ?? [],
            createdAt: stamp,
            updatedAt: stamp,
            completedAt: null,
        };
        const ms: Milestone[] = (input.milestones ?? [])
            .filter((m) => m.title.trim())
            .map((m, i) => ({ id: `ms-${id}-${i + 1}`, goalId: id, title: m.title.trim(), due: m.due, order: i + 1, done: false, doneAt: null }));
        this.write((s) => {
            s.goals = [goal, ...s.goals];
            if (ms.length) s.milestones = [...s.milestones, ...ms];
        });
        return goal;
    }

    async updateGoal(id: string, patch: Partial<Omit<Goal, "id" | "spaceId" | "createdAt">>): Promise<void> {
        this.notGuest();
        this.mustEdit(id);
        const parent = this.ctx.can("goals.manage");
        this.write((s) => {
            s.goals = s.goals.map((g) => {
                if (g.id !== id) return g;
                const next: Goal = { ...g, ...patch, updatedAt: now() };
                // A child cannot promote their own goal into the family's list.
                if (!parent) {
                    next.scope = "me";
                    next.ownerMemberId = g.ownerMemberId;
                }
                if (next.status === "done" && !next.completedAt) next.completedAt = now();
                if (next.status !== "done") next.completedAt = null;
                return next;
            });
        });
    }

    async removeGoal(id: string): Promise<void> {
        this.notGuest();
        this.mustEdit(id);
        this.write((s) => {
            s.goals = s.goals.filter((g) => g.id !== id);
            s.milestones = s.milestones.filter((m) => m.goalId !== id);
            s.celebrations = s.celebrations.filter((c) => c.goalId !== id);
            s.okrs = s.okrs.map((o) => ({ ...o, goalIds: o.goalIds.filter((g) => g !== id) }));
            s.reviews = s.reviews.map((r) => ({ ...r, focusGoalIds: r.focusGoalIds.filter((g) => g !== id) }));
        });
    }

    async setStatus(id: string, status: GoalStatus): Promise<void> {
        await this.updateGoal(id, { status });
    }

    async setManualPct(id: string, pct: number): Promise<void> {
        this.notGuest();
        const g = this.mustEdit(id);
        // Progress is computed wherever it can be: refuse to accept a typed
        // number for a goal that has milestones or a live measurement.
        if (milestonesOf(this.all(), g.id).length || metricFor(this.all(), g.metricRef)) {
            throw new Error("This goal's progress is computed — tick a milestone or record the number instead.");
        }
        this.write((s) => {
            s.goals = s.goals.map((x) => (x.id === id ? { ...x, manualPct: clamp(Math.round(pct), 0, 100), updatedAt: now() } : x));
        });
    }

    // -- milestones ----------------------------------------------------------

    async addMilestone(goalId: string, title: string, due: string | null): Promise<Milestone> {
        this.notGuest();
        this.mustEdit(goalId);
        const existing = milestonesOf(this.all(), goalId);
        const milestone: Milestone = { id: uid("ms"), goalId, title: title.trim(), due, order: existing.length + 1, done: false, doneAt: null };
        // A step on a MEASURED goal is how the number gets moved, not a new way
        // of scoring it: adding one must never take the deposit pot's reading
        // off the goal and replace it with "0 of 1 steps".
        const measured = (g: Goal): boolean => g.progressMode === "metric" && Boolean(metricFor(this.all(), g.metricRef));
        this.write((s) => {
            s.milestones = [...s.milestones, milestone];
            s.goals = s.goals.map((g) => (g.id === goalId ? { ...g, progressMode: measured(g) ? "metric" : "milestones", updatedAt: now() } : g));
        });
        return milestone;
    }

    async updateMilestone(id: string, patch: Partial<Pick<Milestone, "title" | "due" | "order">>): Promise<void> {
        this.notGuest();
        this.goalOfMilestone(id);
        this.write((s) => {
            s.milestones = s.milestones.map((m) => (m.id === id ? { ...m, ...patch } : m));
        });
    }

    /**
     * Tick (or untick) a milestone. When the last one goes green the goal
     * finishes itself — the screen then asks for the celebration, which is the
     * only thing that puts it on the family timeline.
     */
    async toggleMilestone(id: string, done: boolean): Promise<void> {
        this.notGuest();
        const { goal } = this.goalOfMilestone(id);
        const stamp = now();
        this.write((s) => {
            s.milestones = s.milestones.map((m) => (m.id === id ? { ...m, done, doneAt: done ? stamp : null } : m));
            const all = s.milestones.filter((m) => m.goalId === goal.id);
            const complete = all.length > 0 && all.every((m) => m.done);
            s.goals = s.goals.map((g) => {
                if (g.id !== goal.id) return g;
                if (complete) return { ...g, status: "done", completedAt: g.completedAt ?? stamp, updatedAt: stamp };
                if (g.status === "done") return { ...g, status: "active", completedAt: null, updatedAt: stamp };
                return { ...g, updatedAt: stamp };
            });
        });
    }

    async removeMilestone(id: string): Promise<void> {
        this.notGuest();
        const { goal } = this.goalOfMilestone(id);
        this.write((s) => {
            let n = 0;
            s.milestones = s.milestones
                .filter((m) => m.id !== id)
                .sort((a, b) => a.order - b.order)
                .map((m) => (m.goalId === goal.id ? { ...m, order: ++n } : m));
        });
    }

    // -- the blueprint -------------------------------------------------------

    async saveBlueprint(draft: BlueprintDraft): Promise<Blueprint> {
        this.manage();
        const version = Math.max(0, ...this.all().blueprints.map((b) => b.version)) + 1;
        const bp: Blueprint = {
            id: uid("bp"),
            spaceId: this.ctx.space.id,
            version,
            valuesSnapshot: draft.valuesSnapshot,
            mission: draft.mission.trim(),
            vision: draft.vision.trim(),
            goals1y: draft.goals1y.filter((l) => l.text.trim()),
            goals3y: draft.goals3y.filter((l) => l.text.trim()),
            goals5y: draft.goals5y.filter((l) => l.text.trim()),
            note: draft.note.trim(),
            authorMemberId: this.ctx.me.id,
            createdAt: now(),
        };
        this.write((s) => {
            s.blueprints = [bp, ...s.blueprints];
        });
        return bp;
    }

    // -- OKRs ----------------------------------------------------------------

    async addOkr(quarter: string, objective: string, goalIds: string[]): Promise<Okr> {
        this.manage();
        const okr: Okr = { id: uid("okr"), spaceId: this.ctx.space.id, quarter, objective: objective.trim(), goalIds, createdAt: now() };
        this.write((s) => {
            s.okrs = [...s.okrs, okr];
        });
        return okr;
    }

    async updateOkr(id: string, patch: Partial<Pick<Okr, "objective" | "goalIds" | "quarter">>): Promise<void> {
        this.manage();
        this.write((s) => {
            s.okrs = s.okrs.map((o) => (o.id === id ? { ...o, ...patch } : o));
        });
    }

    async removeOkr(id: string): Promise<void> {
        this.manage();
        this.write((s) => {
            s.okrs = s.okrs.filter((o) => o.id !== id);
            s.keyResults = s.keyResults.filter((k) => k.okrId !== id);
        });
    }

    async addKeyResult(okrId: string, text: string, target: number, unit: string): Promise<KeyResult> {
        this.manage();
        const order = this.all().keyResults.filter((k) => k.okrId === okrId).length + 1;
        const kr: KeyResult = { id: uid("kr"), okrId, text: text.trim(), target, current: 0, unit, order };
        this.write((s) => {
            s.keyResults = [...s.keyResults, kr];
        });
        return kr;
    }

    async updateKeyResult(id: string, patch: Partial<Pick<KeyResult, "text" | "target" | "current" | "unit">>): Promise<void> {
        this.manage();
        this.write((s) => {
            s.keyResults = s.keyResults.map((k) => (k.id === id ? { ...k, ...patch } : k));
        });
    }

    async removeKeyResult(id: string): Promise<void> {
        this.manage();
        this.write((s) => {
            s.keyResults = s.keyResults.filter((k) => k.id !== id);
        });
    }

    // -- celebrations --------------------------------------------------------

    async celebrate(goalId: string, input: { reflection: string; cardLine: string; photoUrl?: string; memberIds: string[] }): Promise<Celebration> {
        this.notGuest();
        this.mustEdit(goalId);
        const cel: Celebration = {
            id: uid("cel"),
            spaceId: this.ctx.space.id,
            goalId,
            date: this.ctx.today,
            photoUrl: input.photoUrl,
            reflection: input.reflection.trim(),
            cardLine: input.cardLine.trim(),
            memberIds: input.memberIds,
            createdAt: now(),
        };
        this.write((s) => {
            s.celebrations = [cel, ...s.celebrations];
            s.goals = s.goals.map((g) => (g.id === goalId ? { ...g, status: "done", completedAt: g.completedAt ?? cel.createdAt, updatedAt: cel.createdAt } : g));
        });
        return cel;
    }

    async removeCelebration(id: string): Promise<void> {
        this.manage();
        this.write((s) => {
            s.celebrations = s.celebrations.filter((c) => c.id !== id);
        });
    }

    // -- measured numbers and the nightly snapshot ---------------------------

    async recordMetric(ref: string, current: number): Promise<void> {
        this.notGuest();
        const s0 = this.all();
        const last = metricFor(s0, ref);
        if (!last) throw new Error("There is no number by that name yet.");
        const goal = s0.goals.find((g) => g.metricRef === ref);
        if (goal && !canEditGoal(goal, this.ctx)) this.deny();
        const row: MetricReading = { ...last, id: uid("metric"), current: Math.max(0, Math.round(current)), at: now() };
        this.write((s) => {
            s.metrics = [...s.metrics, row];
            s.goals = s.goals.map((g) => (g.metricRef === ref ? { ...g, updatedAt: row.at } : g));
        });
    }

    async recordConnection(sample: ConnectionSample): Promise<void> {
        this.manage();
        this.write((s) => {
            s.connection = [...s.connection.filter((c) => c.date !== sample.date), sample];
        });
    }

    async saveReview(input: { kind: ReviewKind; period: string; notes: string; focusGoalIds: string[] }): Promise<GoalReview> {
        this.manage();
        const review: GoalReview = {
            id: uid("review"),
            spaceId: this.ctx.space.id,
            kind: input.kind,
            period: input.period,
            notes: input.notes.trim(),
            focusGoalIds: input.focusGoalIds,
            authorMemberId: this.ctx.me.id,
            createdAt: now(),
        };
        this.write((s) => {
            s.reviews = [review, ...s.reviews.filter((r) => !(r.kind === input.kind && r.period === input.period))];
        });
        return review;
    }
}
