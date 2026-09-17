import type { RepoContext, Visibility } from "@/data/core";
import { supabase } from "@/lib/supabase";
import { canCreateGoal, canEditGoal, metricFor, milestonesOf, visibleTo } from "./derive";
import type {
    Blueprint,
    BlueprintDraft,
    BlueprintLine,
    Celebration,
    ConnectionSample,
    Goal,
    GoalReview,
    GoalScope,
    GoalStatus,
    GoalsRepo,
    GoalsState,
    Horizon,
    KeyResult,
    MetricReading,
    MetricSource,
    MetricUnit,
    Milestone,
    NewGoal,
    Okr,
    Pillar,
    ProgressMode,
    ReviewKind,
} from "./types";

/**
 * The same goals, live, under row-level security.
 *
 * The database is the real guard: `wf_can_see` decides which goals come back,
 * and a child's session physically cannot read a family goal's row — the one
 * door onto them is the `wf_goals_child_safe` view, which carries the summary
 * and a computed percentage and nothing else. This repo still runs the slice
 * through the same `visibleTo()` the demo uses, so the two modes cannot drift.
 * snake_case ↔ camelCase mapping lives in this file and nowhere else.
 */

type Row = Record<string, unknown>;

const s = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);
const n = (v: unknown, d = 0): number => (typeof v === "number" ? v : Number(v ?? d) || d);
const iso = (v: unknown): string => (v ? new Date(v as string).toISOString() : new Date().toISOString());
const opt = (v: unknown): string | undefined => (typeof v === "string" && v ? v : undefined);
const nul = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const date = (v: unknown): string => (typeof v === "string" ? v.slice(0, 10) : "");

function fail(where: string, error: { message: string } | null | undefined): void {
    if (error) throw new Error(`${where}: ${error.message}`);
}

function lines(v: unknown): BlueprintLine[] {
    if (!Array.isArray(v)) return [];
    return v
        .map((raw) => {
            const l = raw as Row;
            return { pillar: s(l.pillar, "grow") as Pillar, text: s(l.text), why: opt(l.why) };
        })
        .filter((l) => l.text);
}

const mapBlueprint = (r: Row): Blueprint => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    version: n(r.version, 1),
    valuesSnapshot: strs(r.values_snapshot),
    mission: s(r.mission),
    vision: s(r.vision),
    goals1y: lines(r.goals_1y),
    goals3y: lines(r.goals_3y),
    goals5y: lines(r.goals_5y),
    note: s(r.note),
    authorMemberId: nul(r.author_member_id),
    createdAt: iso(r.created_at),
});

const mapGoal = (r: Row): Goal => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    title: s(r.title),
    childSafeSummary: s(r.child_safe_summary),
    scope: s(r.scope, "family") as GoalScope,
    ownerMemberId: nul(r.owner_member_id),
    pillar: s(r.pillar, "grow") as Pillar,
    valueLabel: opt(r.value_label),
    horizon: s(r.horizon, "year") as Horizon,
    targetDate: date(r.target_date),
    status: s(r.status, "active") as GoalStatus,
    description: s(r.description),
    why: s(r.why),
    progressMode: s(r.progress_mode, "milestones") as ProgressMode,
    manualPct: n(r.progress_pct),
    metricRef: nul(r.metric_ref),
    coverUrl: opt(r.cover_url),
    visibility: s(r.visibility, "family") as Visibility,
    sharedWith: strs(r.shared_with),
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at ?? r.created_at),
    completedAt: r.completed_at ? iso(r.completed_at) : null,
});

/**
 * A family goal as a CHILD may receive it, straight from the
 * `wf_goals_child_safe` view: the child-safe summary and a computed
 * percentage. The view has no title, no description, no owner and no amount,
 * so there is nothing here to leak — the row is built to look like a goal only
 * so the same screens can render it.
 */
const mapChildSafe = (r: Row): Goal => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    title: s(r.child_safe_summary),
    childSafeSummary: s(r.child_safe_summary),
    scope: s(r.scope, "family") as GoalScope,
    ownerMemberId: null,
    pillar: s(r.pillar, "grow") as Pillar,
    horizon: s(r.horizon, "year") as Horizon,
    targetDate: date(r.target_date),
    status: s(r.status, "active") as GoalStatus,
    description: "",
    why: "",
    progressMode: "manual",
    manualPct: n(r.pct),
    metricRef: null,
    visibility: "child",
    sharedWith: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
});

const mapMilestone = (r: Row): Milestone => ({
    id: s(r.id),
    goalId: s(r.goal_id),
    title: s(r.title),
    due: r.due_date ? date(r.due_date) : null,
    order: n(r.item_order, 1),
    done: Boolean(r.done_at),
    doneAt: r.done_at ? iso(r.done_at) : null,
});

const mapOkr = (r: Row): Okr => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    quarter: s(r.quarter),
    objective: s(r.objective),
    goalIds: strs(r.goal_ids),
    createdAt: iso(r.created_at),
});

const mapKr = (r: Row): KeyResult => ({
    id: s(r.id),
    okrId: s(r.okr_id),
    text: s(r.text),
    target: n(r.target),
    current: n(r.current_value),
    unit: s(r.unit),
    order: n(r.item_order, 1),
});

const mapMetric = (r: Row): MetricReading => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    ref: s(r.metric_ref),
    label: s(r.label),
    source: s(r.source, "manual") as MetricSource,
    unit: s(r.unit, "count") as MetricUnit,
    target: n(r.target),
    current: n(r.current_value),
    at: iso(r.read_at ?? r.created_at),
});

const mapCelebration = (r: Row): Celebration => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    goalId: s(r.goal_id),
    date: date(r.date),
    photoUrl: opt(r.photo_url),
    reflection: s(r.reflection),
    cardLine: s(r.card_line),
    memberIds: strs(r.member_ids),
    createdAt: iso(r.created_at),
});

const mapReview = (r: Row): GoalReview => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    kind: s(r.kind, "sunday") as ReviewKind,
    period: s(r.period),
    notes: s(r.notes),
    focusGoalIds: strs(r.focus_goal_ids),
    authorMemberId: nul(r.author_member_id),
    createdAt: iso(r.created_at),
});

const mapConnection = (r: Row): ConnectionSample => ({
    date: date(r.date),
    tasksWithGoalPct: n(r.tasks_with_goal_pct),
    goalsWithMilestonePct: n(r.goals_with_milestone_pct),
    tasksCounted: n(r.tasks_counted),
    goalsCounted: n(r.goals_counted),
});

export class SupabaseGoalsRepo implements GoalsRepo {
    constructor(private ctx: RepoContext) {}

    private get space(): string {
        return this.ctx.space.id;
    }

    private base(): { organization_id: string | null; space_id: string } {
        return { organization_id: this.ctx.orgId, space_id: this.space };
    }

    private deny(): never {
        throw new Error("Not allowed");
    }

    private manage(): void {
        if (!this.ctx.can("goals.manage")) this.deny();
    }

    private notGuest(): void {
        if (this.ctx.role === "guest") this.deny();
    }

    private async state(): Promise<GoalsState> {
        return this.loadRaw();
    }

    private async mustEdit(goalId: string): Promise<Goal> {
        const { data, error } = await supabase.from("wf_goals").select("*").eq("id", goalId).maybeSingle();
        fail("goal", error);
        if (!data) throw new Error("Not allowed");
        const goal = mapGoal(data as Row);
        if (!canEditGoal(goal, this.ctx)) throw new Error("Not allowed");
        return goal;
    }

    // -- load ----------------------------------------------------------------

    private async loadRaw(): Promise<GoalsState> {
        const sp = this.space;
        const child = this.ctx.me.role === "child";
        // The blueprint's year-by-year plan is where the family's money is
        // written ("£18,000 towards the deposit"), so only a parent's session
        // reads the table. Everyone else reads the view, which carries the
        // vision, the mission and the values and nothing else — and the RLS
        // policy in sql/goals.sql refuses the table to them besides.
        const blueprintSource = this.ctx.me.role === "parent" ? "wf_blueprints" : "wf_blueprint_child_safe";
        const [bp, goals, ms, okrs, krs, metrics, cels, reviews, conn] = await Promise.all([
            supabase.from(blueprintSource).select("*").eq("space_id", sp).order("version", { ascending: false }),
            supabase.from("wf_goals").select("*").eq("space_id", sp).order("created_at", { ascending: false }),
            supabase.from("wf_goal_milestones").select("*").eq("space_id", sp).order("item_order", { ascending: true }),
            supabase.from("wf_okrs").select("*").eq("space_id", sp).order("quarter", { ascending: true }),
            supabase.from("wf_key_results").select("*").eq("space_id", sp).order("item_order", { ascending: true }),
            supabase.from("wf_goal_metrics").select("*").eq("space_id", sp).order("read_at", { ascending: true }),
            supabase.from("wf_celebrations").select("*").eq("space_id", sp).order("date", { ascending: false }),
            supabase.from("wf_goal_reviews").select("*").eq("space_id", sp).order("created_at", { ascending: false }),
            supabase.from("wf_goal_connection").select("*").eq("space_id", sp).order("date", { ascending: true }).limit(90),
        ]);
        fail("blueprints", bp.error);
        fail("goals", goals.error);
        fail("milestones", ms.error);
        fail("okrs", okrs.error);
        fail("key results", krs.error);
        fail("metrics", metrics.error);
        fail("celebrations", cels.error);
        fail("reviews", reviews.error);
        fail("connection", conn.error);

        // A child's session cannot read a family goal's row at all: the select
        // above comes back with their own goals and the ones shared with them
        // by name, because wf_goals_read routes a child through
        // wf_goal_row_visible(). The child-safe view is the one door onto
        // everything else, and it carries a summary and a percentage.
        let rows = (goals.data ?? []).map(mapGoal);
        if (child) {
            const safe = await supabase.from("wf_goals_child_safe").select("*").eq("space_id", sp);
            fail("family goals", safe.error);
            const have = new Set(rows.map((g) => g.id));
            rows = [...rows, ...(safe.data ?? []).map(mapChildSafe).filter((g) => !have.has(g.id))];
        }

        return {
            blueprints: (bp.data ?? []).map(mapBlueprint),
            goals: rows,
            milestones: (ms.data ?? []).map(mapMilestone),
            okrs: (okrs.data ?? []).map(mapOkr),
            keyResults: (krs.data ?? []).map(mapKr),
            metrics: (metrics.data ?? []).map(mapMetric),
            celebrations: (cels.data ?? []).map(mapCelebration),
            reviews: (reviews.data ?? []).map(mapReview),
            connection: (conn.data ?? []).map(mapConnection),
        };
    }

    async load(): Promise<GoalsState> {
        return visibleTo(await this.loadRaw(), this.ctx);
    }

    // -- goals ---------------------------------------------------------------

    async addGoal(input: NewGoal): Promise<Goal> {
        this.notGuest();
        if (!canCreateGoal(this.ctx)) this.deny();
        const parent = this.ctx.can("goals.manage");
        const { data, error } = await supabase
            .from("wf_goals")
            .insert({
                ...this.base(),
                title: input.title.trim(),
                child_safe_summary: (input.childSafeSummary || input.title).trim(),
                scope: parent ? input.scope : "me",
                owner_member_id: parent ? input.ownerMemberId : this.ctx.me.id,
                pillar: input.pillar,
                value_label: input.valueLabel ?? null,
                horizon: input.horizon,
                target_date: input.targetDate,
                status: "active",
                description: input.description?.trim() ?? "",
                why: input.why?.trim() ?? "",
                progress_mode: input.progressMode,
                progress_pct: 0,
                metric_ref: input.metricRef ?? null,
                cover_url: input.coverUrl ?? null,
                visibility: input.visibility,
                shared_with: input.sharedWith ?? [],
            })
            .select("*")
            .single();
        fail("add goal", error);
        const goal = mapGoal(data as Row);
        const ms = (input.milestones ?? []).filter((m) => m.title.trim());
        if (ms.length) {
            const { error: e2 } = await supabase.from("wf_goal_milestones").insert(
                ms.map((m, i) => ({ ...this.base(), goal_id: goal.id, title: m.title.trim(), due_date: m.due, item_order: i + 1 })),
            );
            fail("add milestones", e2);
        }
        return goal;
    }

    async updateGoal(id: string, patch: Partial<Omit<Goal, "id" | "spaceId" | "createdAt">>): Promise<void> {
        this.notGuest();
        const before = await this.mustEdit(id);
        const parent = this.ctx.can("goals.manage");
        const row: Row = { updated_at: new Date().toISOString() };
        if (patch.title !== undefined) row.title = patch.title;
        if (patch.childSafeSummary !== undefined) row.child_safe_summary = patch.childSafeSummary;
        if (patch.pillar !== undefined) row.pillar = patch.pillar;
        if (patch.valueLabel !== undefined) row.value_label = patch.valueLabel ?? null;
        if (patch.horizon !== undefined) row.horizon = patch.horizon;
        if (patch.targetDate !== undefined) row.target_date = patch.targetDate;
        if (patch.description !== undefined) row.description = patch.description;
        if (patch.why !== undefined) row.why = patch.why;
        if (patch.progressMode !== undefined) row.progress_mode = patch.progressMode;
        if (patch.metricRef !== undefined) row.metric_ref = patch.metricRef;
        if (patch.coverUrl !== undefined) row.cover_url = patch.coverUrl ?? null;
        if (patch.visibility !== undefined) row.visibility = patch.visibility;
        if (patch.sharedWith !== undefined) row.shared_with = patch.sharedWith;
        // A child never promotes their own goal into the family's list.
        if (parent && patch.scope !== undefined) row.scope = patch.scope;
        if (parent && patch.ownerMemberId !== undefined) row.owner_member_id = patch.ownerMemberId;
        if (patch.status !== undefined) {
            row.status = patch.status;
            row.completed_at = patch.status === "done" ? (before.completedAt ?? new Date().toISOString()) : null;
        }
        const { error } = await supabase.from("wf_goals").update(row).eq("id", id);
        fail("update goal", error);
    }

    async removeGoal(id: string): Promise<void> {
        this.notGuest();
        await this.mustEdit(id);
        const { error } = await supabase.from("wf_goals").delete().eq("id", id);
        fail("remove goal", error);
    }

    async setStatus(id: string, status: GoalStatus): Promise<void> {
        await this.updateGoal(id, { status });
    }

    async setManualPct(id: string, pct: number): Promise<void> {
        this.notGuest();
        const goal = await this.mustEdit(id);
        const state = await this.state();
        if (milestonesOf(state, goal.id).length || metricFor(state, goal.metricRef)) {
            throw new Error("This goal's progress is computed — tick a milestone or record the number instead.");
        }
        const { error } = await supabase
            .from("wf_goals")
            .update({ progress_pct: Math.max(0, Math.min(100, Math.round(pct))), updated_at: new Date().toISOString() })
            .eq("id", id);
        fail("set progress", error);
    }

    // -- milestones ----------------------------------------------------------

    async addMilestone(goalId: string, title: string, due: string | null): Promise<Milestone> {
        this.notGuest();
        const goal = await this.mustEdit(goalId);
        const { count } = await supabase.from("wf_goal_milestones").select("id", { count: "exact", head: true }).eq("goal_id", goalId);
        const { data, error } = await supabase
            .from("wf_goal_milestones")
            .insert({ ...this.base(), goal_id: goalId, title: title.trim(), due_date: due, item_order: (count ?? 0) + 1 })
            .select("*")
            .single();
        fail("add milestone", error);
        // A measured goal stays measured: a step is how the number gets moved,
        // not a new way of scoring it. (wf_goal_pct() ranks them the same way.)
        const measured = goal.progressMode === "metric" && Boolean(metricFor(await this.state(), goal.metricRef));
        if (!measured) {
            await supabase.from("wf_goals").update({ progress_mode: "milestones", updated_at: new Date().toISOString() }).eq("id", goalId);
        } else {
            await supabase.from("wf_goals").update({ updated_at: new Date().toISOString() }).eq("id", goalId);
        }
        return mapMilestone(data as Row);
    }

    private async milestoneGoal(id: string): Promise<{ goalId: string }> {
        const { data, error } = await supabase.from("wf_goal_milestones").select("goal_id").eq("id", id).maybeSingle();
        fail("milestone", error);
        if (!data) throw new Error("Not allowed");
        const goalId = s((data as Row).goal_id);
        await this.mustEdit(goalId);
        return { goalId };
    }

    async updateMilestone(id: string, patch: Partial<Pick<Milestone, "title" | "due" | "order">>): Promise<void> {
        this.notGuest();
        await this.milestoneGoal(id);
        const row: Row = {};
        if (patch.title !== undefined) row.title = patch.title;
        if (patch.due !== undefined) row.due_date = patch.due;
        if (patch.order !== undefined) row.item_order = patch.order;
        const { error } = await supabase.from("wf_goal_milestones").update(row).eq("id", id);
        fail("update milestone", error);
    }

    async toggleMilestone(id: string, done: boolean): Promise<void> {
        this.notGuest();
        const { goalId } = await this.milestoneGoal(id);
        const stamp = new Date().toISOString();
        const { error } = await supabase.from("wf_goal_milestones").update({ done_at: done ? stamp : null }).eq("id", id);
        fail("tick milestone", error);
        // The last milestone finishes the goal — the same rule as the demo.
        const { data, error: e2 } = await supabase.from("wf_goal_milestones").select("done_at").eq("goal_id", goalId);
        fail("milestones", e2);
        const rows = (data ?? []) as Row[];
        const complete = rows.length > 0 && rows.every((r) => Boolean(r.done_at));
        const { error: e3 } = await supabase
            .from("wf_goals")
            .update(complete ? { status: "done", completed_at: stamp, updated_at: stamp } : { status: "active", completed_at: null, updated_at: stamp })
            .eq("id", goalId);
        fail("goal status", e3);
    }

    async removeMilestone(id: string): Promise<void> {
        this.notGuest();
        await this.milestoneGoal(id);
        const { error } = await supabase.from("wf_goal_milestones").delete().eq("id", id);
        fail("remove milestone", error);
    }

    // -- the blueprint -------------------------------------------------------

    async saveBlueprint(draft: BlueprintDraft): Promise<Blueprint> {
        this.manage();
        const { data: last } = await supabase.from("wf_blueprints").select("version").eq("space_id", this.space).order("version", { ascending: false }).limit(1);
        const version = n((last?.[0] as Row | undefined)?.version, 0) + 1;
        const { data, error } = await supabase
            .from("wf_blueprints")
            .insert({
                ...this.base(),
                version,
                values_snapshot: draft.valuesSnapshot,
                mission: draft.mission.trim(),
                vision: draft.vision.trim(),
                goals_1y: draft.goals1y.filter((l) => l.text.trim()),
                goals_3y: draft.goals3y.filter((l) => l.text.trim()),
                goals_5y: draft.goals5y.filter((l) => l.text.trim()),
                note: draft.note.trim(),
                author_member_id: this.ctx.me.id,
            })
            .select("*")
            .single();
        fail("save blueprint", error);
        return mapBlueprint(data as Row);
    }

    // -- OKRs ----------------------------------------------------------------

    async addOkr(quarter: string, objective: string, goalIds: string[]): Promise<Okr> {
        this.manage();
        const { data, error } = await supabase
            .from("wf_okrs")
            .insert({ ...this.base(), quarter, objective: objective.trim(), goal_ids: goalIds })
            .select("*")
            .single();
        fail("add objective", error);
        return mapOkr(data as Row);
    }

    async updateOkr(id: string, patch: Partial<Pick<Okr, "objective" | "goalIds" | "quarter">>): Promise<void> {
        this.manage();
        const row: Row = {};
        if (patch.objective !== undefined) row.objective = patch.objective;
        if (patch.goalIds !== undefined) row.goal_ids = patch.goalIds;
        if (patch.quarter !== undefined) row.quarter = patch.quarter;
        const { error } = await supabase.from("wf_okrs").update(row).eq("id", id);
        fail("update objective", error);
    }

    async removeOkr(id: string): Promise<void> {
        this.manage();
        const { error } = await supabase.from("wf_okrs").delete().eq("id", id);
        fail("remove objective", error);
    }

    async addKeyResult(okrId: string, text: string, target: number, unit: string): Promise<KeyResult> {
        this.manage();
        const { count } = await supabase.from("wf_key_results").select("id", { count: "exact", head: true }).eq("okr_id", okrId);
        const { data, error } = await supabase
            .from("wf_key_results")
            .insert({ ...this.base(), okr_id: okrId, text: text.trim(), target, current_value: 0, unit, item_order: (count ?? 0) + 1 })
            .select("*")
            .single();
        fail("add key result", error);
        return mapKr(data as Row);
    }

    async updateKeyResult(id: string, patch: Partial<Pick<KeyResult, "text" | "target" | "current" | "unit">>): Promise<void> {
        this.manage();
        const row: Row = {};
        if (patch.text !== undefined) row.text = patch.text;
        if (patch.target !== undefined) row.target = patch.target;
        if (patch.current !== undefined) row.current_value = patch.current;
        if (patch.unit !== undefined) row.unit = patch.unit;
        const { error } = await supabase.from("wf_key_results").update(row).eq("id", id);
        fail("update key result", error);
    }

    async removeKeyResult(id: string): Promise<void> {
        this.manage();
        const { error } = await supabase.from("wf_key_results").delete().eq("id", id);
        fail("remove key result", error);
    }

    // -- celebrations --------------------------------------------------------

    async celebrate(goalId: string, input: { reflection: string; cardLine: string; photoUrl?: string; memberIds: string[] }): Promise<Celebration> {
        this.notGuest();
        await this.mustEdit(goalId);
        const { data, error } = await supabase
            .from("wf_celebrations")
            .insert({
                ...this.base(),
                goal_id: goalId,
                date: this.ctx.today,
                photo_url: input.photoUrl ?? null,
                reflection: input.reflection.trim(),
                card_line: input.cardLine.trim(),
                member_ids: input.memberIds,
            })
            .select("*")
            .single();
        fail("celebrate", error);
        const stamp = new Date().toISOString();
        await supabase.from("wf_goals").update({ status: "done", completed_at: stamp, updated_at: stamp }).eq("id", goalId).is("completed_at", null);
        return mapCelebration(data as Row);
    }

    async removeCelebration(id: string): Promise<void> {
        this.manage();
        const { error } = await supabase.from("wf_celebrations").delete().eq("id", id);
        fail("remove celebration", error);
    }

    // -- measured numbers and the nightly snapshot ---------------------------

    async recordMetric(ref: string, current: number): Promise<void> {
        this.notGuest();
        const state = await this.state();
        const last = metricFor(state, ref);
        if (!last) throw new Error("There is no number by that name yet.");
        const goal = state.goals.find((g) => g.metricRef === ref);
        if (goal && !canEditGoal(goal, this.ctx)) this.deny();
        const stamp = new Date().toISOString();
        const { error } = await supabase.from("wf_goal_metrics").insert({
            ...this.base(),
            metric_ref: ref,
            label: last.label,
            source: last.source,
            unit: last.unit,
            target: last.target,
            current_value: Math.max(0, Math.round(current)),
            read_at: stamp,
        });
        fail("record number", error);
        if (goal) await supabase.from("wf_goals").update({ updated_at: stamp }).eq("id", goal.id);
    }

    async recordConnection(sample: ConnectionSample): Promise<void> {
        this.manage();
        const { error } = await supabase.from("wf_goal_connection").upsert(
            {
                ...this.base(),
                date: sample.date,
                tasks_with_goal_pct: sample.tasksWithGoalPct,
                goals_with_milestone_pct: sample.goalsWithMilestonePct,
                tasks_counted: sample.tasksCounted,
                goals_counted: sample.goalsCounted,
            },
            { onConflict: "space_id,date" },
        );
        fail("record connection", error);
    }

    async saveReview(input: { kind: ReviewKind; period: string; notes: string; focusGoalIds: string[] }): Promise<GoalReview> {
        this.manage();
        const { data, error } = await supabase
            .from("wf_goal_reviews")
            .upsert(
                {
                    ...this.base(),
                    kind: input.kind,
                    period: input.period,
                    notes: input.notes.trim(),
                    focus_goal_ids: input.focusGoalIds,
                    author_member_id: this.ctx.me.id,
                },
                { onConflict: "space_id,kind,period" },
            )
            .select("*")
            .single();
        fail("save review", error);
        return mapReview(data as Row);
    }
}
