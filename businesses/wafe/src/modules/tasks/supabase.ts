import type { RepoContext, Visibility } from "@/data/core";
import { supabase } from "@/lib/supabase";
import { columnTasks, isDone, nextDueAfter, nextPlanningDay, sproutsBalance, visibleTo } from "./derive";
import type {
    ChecklistItem,
    ChoreRota,
    CompleteResult,
    NewTaskInput,
    RecurRule,
    RedeemResult,
    Redemption,
    RedemptionStatus,
    Reward,
    RewardKind,
    SproutsEntry,
    Task,
    TaskKind,
    TaskPriority,
    TaskScope,
    TaskSource,
    TaskStatus,
    TasksRepo,
    TasksState,
} from "./types";

/**
 * Tasks & chores, live, under row-level security.
 *
 * Six tables (`sql/tasks.sql`), every row carrying `organization_id` and
 * `space_id`, with policies written in the foundation's vocabulary so the
 * database refuses what `LocalTasksRepo` refuses. snake_case ↔ camelCase
 * happens here and only here.
 */

type Row = Record<string, unknown>;
const s = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);
const n = (v: unknown, d = 0): number => (typeof v === "number" ? v : Number(v ?? d) || d);
const b = (v: unknown, d = false): boolean => (typeof v === "boolean" ? v : d);
const iso = (v: unknown): string => (v ? new Date(v as string).toISOString() : new Date().toISOString());
const optIso = (v: unknown): string | null => (v ? new Date(v as string).toISOString() : null);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

function fail(where: string, error: { message: string } | null | undefined): void {
    if (error) throw new Error(`${where}: ${error.message}`);
}

const T = {
    tasks: "wf_tasks",
    checklist: "wf_task_checklist",
    rotas: "wf_chore_rotas",
    ledger: "wf_sprouts_ledger",
    rewards: "wf_rewards",
    redemptions: "wf_redemptions",
} as const;

const mapRule = (v: unknown): RecurRule | null => {
    if (!v || typeof v !== "object") return null;
    const r = v as Partial<RecurRule>;
    if (r.freq !== "daily" && r.freq !== "weekly" && r.freq !== "monthly") return null;
    return { freq: r.freq, interval: Math.max(1, Math.round(Number(r.interval ?? 1))), weekday: typeof r.weekday === "number" ? r.weekday : null, monthDay: typeof r.monthDay === "number" ? r.monthDay : null };
};

const mapChecklist = (r: Row): ChecklistItem => ({ id: s(r.id), text: s(r.item), done: b(r.done), order: n(r.sort_order) });

const mapTask = (r: Row, checklist: ChecklistItem[]): Task => ({
    id: s(r.id),
    title: s(r.title),
    notes: s(r.notes),
    assigneeMemberIds: strs(r.assignee_member_ids),
    dueAt: optIso(r.due_at),
    allDay: b(r.all_day, true),
    priority: s(r.priority, "normal") as TaskPriority,
    scope: s(r.scope, "family") as TaskScope,
    kind: s(r.kind, "task") as TaskKind,
    goalId: s(r.goal_id) || null,
    goalLabel: s(r.goal_label),
    milestoneId: s(r.milestone_id) || null,
    milestoneLabel: s(r.milestone_label),
    projectId: s(r.project_id) || null,
    tripId: s(r.trip_id) || null,
    curriculumId: s(r.curriculum_id) || null,
    valueId: s(r.value_id) || null,
    status: s(r.status, "todo") as TaskStatus,
    kanbanOrder: n(r.kanban_order),
    rrule: mapRule(r.rrule),
    isChore: b(r.is_chore),
    sprouts: n(r.sprouts),
    needsProof: b(r.needs_proof),
    proofUrl: s(r.proof_url) || null,
    proofSubmittedAt: optIso(r.proof_submitted_at),
    proofApprovedBy: s(r.proof_approved_by) || null,
    sourceType: s(r.source_type, "manual") as TaskSource,
    sourceId: s(r.source_id) || null,
    droppedReason: s(r.dropped_reason) || null,
    checklist: checklist.sort((a, x) => a.order - x.order),
    remindersSent: n(r.reminders_sent),
    ownerMemberId: s(r.owner_member_id) || null,
    visibility: s(r.visibility, "family") as Visibility,
    sharedWith: strs(r.shared_with),
    childSafe: b(r.child_safe),
    doneAt: optIso(r.done_at),
    doneBy: s(r.done_by) || null,
    createdBy: s(r.created_by),
    createdAt: iso(r.created_at),
});

const mapRota = (r: Row): ChoreRota => ({
    id: s(r.id),
    name: s(r.name),
    taskId: s(r.chore_task_id),
    memberIds: strs(r.member_ids),
    rotation: s(r.rotation, "weekly") as ChoreRota["rotation"],
    currentIndex: n(r.current_index),
    nextRotateAt: s(r.next_rotate_at).slice(0, 10),
    createdAt: iso(r.created_at),
});

const mapEntry = (r: Row): SproutsEntry => ({
    id: s(r.id),
    memberId: s(r.member_id),
    delta: n(r.delta),
    sourceType: s(r.source_type, "chore") as SproutsEntry["sourceType"],
    sourceId: s(r.source_id) || null,
    note: s(r.note),
    at: iso(r.at ?? r.created_at),
});

const mapReward = (r: Row): Reward => ({
    id: s(r.id),
    name: s(r.name),
    note: s(r.note),
    costSprouts: n(r.cost_sprouts),
    kind: s(r.kind, "treat") as RewardKind,
    imageUrl: s(r.image_url) || null,
    active: b(r.active, true),
    createdAt: iso(r.created_at),
});

const mapRedemption = (r: Row): Redemption => ({
    id: s(r.id),
    rewardId: s(r.reward_id),
    memberId: s(r.member_id),
    status: s(r.status, "requested") as RedemptionStatus,
    costSprouts: n(r.cost_sprouts),
    decidedBy: s(r.decided_by) || null,
    note: s(r.note),
    at: iso(r.at ?? r.created_at),
    decidedAt: optIso(r.decided_at),
});

export class SupabaseTasksRepo implements TasksRepo {
    constructor(private ctx: RepoContext) {}

    private get scope() {
        return { organization_id: this.ctx.orgId, space_id: this.ctx.space.id };
    }
    private get me(): string {
        return this.ctx.me.id;
    }
    private get manages(): boolean {
        return this.ctx.can("tasks.manage");
    }
    private get isGuest(): boolean {
        return this.ctx.role === "guest";
    }
    private need(ok: boolean, why = "Not allowed"): void {
        if (!ok) throw new Error(why);
    }

    async load(): Promise<TasksState> {
        const sp = this.ctx.space.id;
        const [tasks, checklist, rotas, ledger, rewards, redemptions] = await Promise.all([
            supabase.from(T.tasks).select("*").eq("space_id", sp),
            supabase.from(T.checklist).select("*").eq("space_id", sp).order("sort_order", { ascending: true }),
            supabase.from(T.rotas).select("*").eq("space_id", sp),
            supabase.from(T.ledger).select("*").eq("space_id", sp).order("at", { ascending: true }),
            supabase.from(T.rewards).select("*").eq("space_id", sp).order("cost_sprouts", { ascending: true }),
            supabase.from(T.redemptions).select("*").eq("space_id", sp).order("at", { ascending: false }),
        ]);
        fail("tasks", tasks.error);
        fail("checklists", checklist.error);
        fail("rota", rotas.error);
        fail("Sprouts ledger", ledger.error);
        fail("rewards", rewards.error);
        fail("redemptions", redemptions.error);

        const byTask = new Map<string, ChecklistItem[]>();
        for (const r of (checklist.data ?? []) as Row[]) {
            const key = s(r.task_id);
            byTask.set(key, [...(byTask.get(key) ?? []), mapChecklist(r)]);
        }
        const state: TasksState = {
            tasks: ((tasks.data ?? []) as Row[]).map((r) => mapTask(r, byTask.get(s(r.id)) ?? [])),
            rotas: ((rotas.data ?? []) as Row[]).map(mapRota),
            ledger: ((ledger.data ?? []) as Row[]).map(mapEntry),
            rewards: ((rewards.data ?? []) as Row[]).map(mapReward),
            redemptions: ((redemptions.data ?? []) as Row[]).map(mapRedemption),
            milestoneProgress: [],
            goalProgress: [],
        };
        // RLS has already filtered; the same rule runs here so demo and live
        // hand the screens an identical shape.
        return visibleTo(state, this.ctx);
    }

    // -----------------------------------------------------------------------
    // Reads used by the writes
    // -----------------------------------------------------------------------

    private async row(id: string): Promise<Task> {
        const { data, error } = await supabase.from(T.tasks).select("*").eq("id", id).single();
        fail("task", error);
        const items = await supabase.from(T.checklist).select("*").eq("task_id", id);
        fail("checklist", items.error);
        return mapTask(data as Row, ((items.data ?? []) as Row[]).map(mapChecklist));
    }

    private async allTasks(): Promise<Task[]> {
        const { data, error } = await supabase.from(T.tasks).select("*").eq("space_id", this.ctx.space.id);
        fail("tasks", error);
        return ((data ?? []) as Row[]).map((r) => mapTask(r, []));
    }

    private async nextOrder(status: TaskStatus): Promise<number> {
        const col = columnTasks(await this.allTasks(), status);
        return col.length ? Math.max(...col.map((t) => t.kanbanOrder)) + 10 : 10;
    }

    private canEdit(t: Task): boolean {
        if (this.isGuest) return false;
        return this.manages || t.ownerMemberId === this.me || t.createdBy === this.me;
    }
    private canComplete(t: Task): boolean {
        if (t.assigneeMemberIds.includes(this.me)) return true;
        if (this.isGuest) return false;
        if (this.manages) return true;
        return t.isChore && t.childSafe && !t.assigneeMemberIds.length;
    }

    private toRow(patch: Partial<Task>): Row {
        const r: Row = {};
        const set = <K extends keyof Task>(k: K, col: string) => {
            if (patch[k] !== undefined) r[col] = patch[k];
        };
        set("title", "title");
        set("notes", "notes");
        set("assigneeMemberIds", "assignee_member_ids");
        set("dueAt", "due_at");
        set("allDay", "all_day");
        set("priority", "priority");
        set("scope", "scope");
        set("kind", "kind");
        set("goalId", "goal_id");
        set("goalLabel", "goal_label");
        set("milestoneId", "milestone_id");
        set("milestoneLabel", "milestone_label");
        set("projectId", "project_id");
        set("tripId", "trip_id");
        set("curriculumId", "curriculum_id");
        set("valueId", "value_id");
        set("status", "status");
        set("kanbanOrder", "kanban_order");
        set("isChore", "is_chore");
        set("sprouts", "sprouts");
        set("needsProof", "needs_proof");
        set("proofUrl", "proof_url");
        set("proofSubmittedAt", "proof_submitted_at");
        set("proofApprovedBy", "proof_approved_by");
        set("sourceType", "source_type");
        set("sourceId", "source_id");
        set("droppedReason", "dropped_reason");
        set("remindersSent", "reminders_sent");
        set("visibility", "visibility");
        set("sharedWith", "shared_with");
        set("childSafe", "child_safe");
        set("doneAt", "done_at");
        set("doneBy", "done_by");
        if (patch.rrule !== undefined) r.rrule = patch.rrule;
        return r;
    }

    // -----------------------------------------------------------------------
    // Completion — the only path that credits Sprouts
    // -----------------------------------------------------------------------

    private async finish(task: Task, byMemberId: string): Promise<CompleteResult> {
        const doer = this.ctx.members.find((m) => m.id === byMemberId);
        const earns = task.isChore && task.sprouts > 0 && doer?.role === "child";
        const at = new Date().toISOString();

        const done = await supabase.from(T.tasks).update({ status: "done", done_at: at, done_by: byMemberId }).eq("id", task.id);
        fail("finish task", done.error);

        let nextTaskId: string | null = null;
        let nextDueAt: string | null = null;
        if (task.rrule) {
            nextDueAt = nextDueAfter(task.rrule, task.dueAt ?? at, this.ctx.today);
            const { data, error } = await supabase
                .from(T.tasks)
                .insert({
                    ...this.scope,
                    ...this.toRow({ ...task, dueAt: nextDueAt, status: "todo", doneAt: null, doneBy: null, proofUrl: null, proofSubmittedAt: null, proofApprovedBy: null, remindersSent: 0, droppedReason: null, sourceType: "recurrence", sourceId: task.id }),
                    rrule: task.rrule,
                    kanban_order: await this.nextOrder("todo"),
                    owner_member_id: task.ownerMemberId,
                    created_by: task.createdBy || this.me,
                })
                .select("id")
                .single();
            fail("next occurrence", error);
            nextTaskId = s((data as Row).id);
            if (task.checklist.length) {
                const rows = task.checklist.map((c, i) => ({ ...this.scope, task_id: nextTaskId, item: c.text, done: false, sort_order: i }));
                fail("next checklist", (await supabase.from(T.checklist).insert(rows)).error);
            }
        }

        if (earns) {
            fail(
                "credit Sprouts",
                (await supabase.from(T.ledger).insert({ ...this.scope, member_id: byMemberId, delta: task.sprouts, source_type: "chore", source_id: task.id, note: task.title, at })).error,
            );
        }

        return { taskId: task.id, sprouts: earns ? task.sprouts : 0, memberId: earns ? byMemberId : null, awaitingApproval: false, nextTaskId, nextDueAt, milestoneId: task.milestoneId };
    }

    // -----------------------------------------------------------------------
    // Tasks
    // -----------------------------------------------------------------------

    async createTask(input: NewTaskInput): Promise<Task> {
        this.need(!this.isGuest, "Guests can only tick off what they were asked to do.");
        const title = input.title.trim();
        if (!title) throw new Error("Give the task a name.");
        const child = this.ctx.role === "child" && !this.manages;
        const assignees = input.assigneeMemberIds ?? [];
        if (child) {
            this.need(assignees.every((id) => id === this.me), "You can add jobs for yourself — a parent assigns everyone else.");
            this.need(!input.isChore, "A parent sets up the chores and what they're worth.");
        }
        const status = input.status ?? "todo";
        const { data, error } = await supabase
            .from(T.tasks)
            .insert({
                ...this.scope,
                title,
                notes: (input.notes ?? "").trim(),
                assignee_member_ids: child ? [this.me] : assignees,
                due_at: input.dueAt ?? null,
                all_day: input.allDay ?? true,
                priority: input.priority ?? "normal",
                scope: child ? "me" : input.scope ?? "family",
                kind: input.kind ?? (input.isChore ? "chore" : "task"),
                goal_id: input.goalId ?? null,
                goal_label: input.goalLabel ?? "",
                milestone_id: input.milestoneId ?? null,
                milestone_label: input.milestoneLabel ?? "",
                project_id: input.projectId ?? null,
                trip_id: input.tripId ?? null,
                curriculum_id: input.curriculumId ?? null,
                value_id: input.valueId ?? null,
                status,
                kanban_order: await this.nextOrder(status),
                rrule: input.rrule ?? null,
                is_chore: input.isChore ?? false,
                sprouts: Math.max(0, Math.round(input.sprouts ?? 0)),
                needs_proof: input.needsProof ?? false,
                source_type: input.sourceType ?? "manual",
                source_id: input.sourceId ?? null,
                owner_member_id: this.me,
                visibility: child ? "child" : input.visibility ?? "family",
                shared_with: input.sharedWith ?? [],
                child_safe: input.childSafe ?? child,
                created_by: this.me,
            })
            .select("*")
            .single();
        fail("create task", error);
        const id = s((data as Row).id);
        const items = (input.checklist ?? []).filter((x) => x.trim());
        if (items.length) {
            fail("checklist", (await supabase.from(T.checklist).insert(items.map((text, i) => ({ ...this.scope, task_id: id, item: text.trim(), done: false, sort_order: i }))).select("id")).error);
        }
        return this.row(id);
    }

    async updateTask(id: string, patch: Partial<Task>): Promise<void> {
        const t = await this.row(id);
        this.need(this.canEdit(t));
        if (this.ctx.role === "child" && !this.manages) {
            this.need(!("assigneeMemberIds" in patch) || (patch.assigneeMemberIds ?? []).every((x) => x === this.me), "You can't give a job to someone else.");
            this.need(!("sprouts" in patch), "A parent decides what a chore is worth.");
        }
        fail("update task", (await supabase.from(T.tasks).update(this.toRow(patch)).eq("id", id)).error);
    }

    async removeTask(id: string): Promise<void> {
        const t = await this.row(id);
        this.need(this.canEdit(t));
        fail("remove task", (await supabase.from(T.tasks).delete().eq("id", id)).error);
    }

    async moveTask(id: string, status: TaskStatus, toIndex: number): Promise<void> {
        const t = await this.row(id);
        this.need(this.canEdit(t) || this.canComplete(t));
        if (status === "done" && !isDone(t)) await this.finish(t, t.assigneeMemberIds[0] ?? this.me);
        if (status !== "done" && isDone(t)) fail("reopen", (await supabase.from(T.tasks).update({ done_at: null, done_by: null, dropped_reason: null }).eq("id", id)).error);

        const column = columnTasks(await this.allTasks(), status).filter((x) => x.id !== id);
        const at = Math.max(0, Math.min(toIndex, column.length));
        const ordered = [...column.slice(0, at), t, ...column.slice(at)];
        for (let i = 0; i < ordered.length; i += 1) {
            fail("reorder", (await supabase.from(T.tasks).update({ status, kanban_order: (i + 1) * 10 }).eq("id", ordered[i].id)).error);
        }
    }

    async completeTask(id: string, byMemberId?: string): Promise<CompleteResult> {
        const t = await this.row(id);
        this.need(this.canComplete(t));
        const by = byMemberId ?? (t.assigneeMemberIds.includes(this.me) ? this.me : t.assigneeMemberIds[0] ?? this.me);
        if (t.isChore && t.needsProof && !t.proofApprovedBy) {
            this.need(Boolean(t.proofUrl), "Add a photo of it first — then a parent can say yes and the Sprouts land.");
            fail("await approval", (await supabase.from(T.tasks).update({ status: "doing" }).eq("id", id)).error);
            return { taskId: id, sprouts: 0, memberId: by, awaitingApproval: true, nextTaskId: null, nextDueAt: null, milestoneId: t.milestoneId };
        }
        return this.finish(t, by);
    }

    async reopenTask(id: string): Promise<void> {
        const t = await this.row(id);
        this.need(this.canEdit(t) || this.canComplete(t));
        fail("reopen task", (await supabase.from(T.tasks).update({ status: "todo", done_at: null, done_by: null, dropped_reason: null }).eq("id", id)).error);
    }

    async dropTask(id: string, reason: string): Promise<void> {
        const t = await this.row(id);
        this.need(this.canEdit(t));
        fail("drop task", (await supabase.from(T.tasks).update({ status: "done", dropped_reason: reason.trim() || "We decided not to", done_at: new Date().toISOString(), done_by: this.me }).eq("id", id)).error);
    }

    async remind(id: string): Promise<void> {
        this.need(this.manages);
        const t = await this.row(id);
        fail("remind", (await supabase.from(T.tasks).update({ reminders_sent: t.remindersSent + 1 }).eq("id", id)).error);
    }

    async setChecklistItem(taskId: string, itemId: string, done: boolean): Promise<void> {
        const t = await this.row(taskId);
        this.need(this.canEdit(t) || this.canComplete(t));
        fail("checklist", (await supabase.from(T.checklist).update({ done }).eq("id", itemId)).error);
    }

    async addChecklistItem(taskId: string, text: string): Promise<void> {
        const t = await this.row(taskId);
        this.need(this.canEdit(t));
        const clean = text.trim();
        if (!clean) return;
        fail("checklist", (await supabase.from(T.checklist).insert({ ...this.scope, task_id: taskId, item: clean, done: false, sort_order: t.checklist.length }).select("id")).error);
    }

    async removeChecklistItem(taskId: string, itemId: string): Promise<void> {
        const t = await this.row(taskId);
        this.need(this.canEdit(t));
        fail("checklist", (await supabase.from(T.checklist).delete().eq("id", itemId)).error);
    }

    async submitProof(taskId: string, imageUrl: string): Promise<void> {
        const t = await this.row(taskId);
        this.need(this.canComplete(t));
        this.need(Boolean(imageUrl), "Choose a photo first.");
        fail("send photo", (await supabase.from(T.tasks).update({ proof_url: imageUrl, proof_submitted_at: new Date().toISOString(), proof_approved_by: null, status: "doing" }).eq("id", taskId)).error);
    }

    async approveProof(taskId: string): Promise<CompleteResult> {
        this.need(this.manages, "Only a parent can approve a chore photo.");
        const t = await this.row(taskId);
        this.need(Boolean(t.proofUrl), "There's no photo to approve yet.");
        fail("approve photo", (await supabase.from(T.tasks).update({ proof_approved_by: this.me }).eq("id", taskId)).error);
        return this.finish({ ...t, proofApprovedBy: this.me }, t.assigneeMemberIds[0] ?? this.me);
    }

    async declineProof(taskId: string, reason: string): Promise<void> {
        this.need(this.manages, "Only a parent can review a chore photo.");
        const t = await this.row(taskId);
        const notes = reason.trim() ? `${t.notes}${t.notes ? "\n" : ""}Sent back: ${reason.trim()}` : t.notes;
        fail("send back", (await supabase.from(T.tasks).update({ proof_url: null, proof_submitted_at: null, proof_approved_by: null, status: "todo", notes }).eq("id", taskId)).error);
    }

    async bulkAssign(ids: string[], memberIds: string[]): Promise<void> {
        this.need(this.manages, "Only a parent can assign the family's work.");
        if (!ids.length) return;
        fail("assign", (await supabase.from(T.tasks).update({ assignee_member_ids: memberIds }).in("id", ids)).error);
    }

    async linkToGoal(id: string, goalId: string | null, goalLabel: string): Promise<void> {
        const t = await this.row(id);
        this.need(this.canEdit(t));
        fail(
            "link to goal",
            (await supabase.from(T.tasks).update({ goal_id: goalId, goal_label: goalId ? goalLabel : "", milestone_id: goalId ? t.milestoneId : null, milestone_label: goalId ? t.milestoneLabel : "" }).eq("id", id)).error,
        );
    }

    // -----------------------------------------------------------------------
    // Rota
    // -----------------------------------------------------------------------

    async createRota(name: string, taskId: string, memberIds: string[], rotation: ChoreRota["rotation"]): Promise<ChoreRota> {
        this.need(this.manages, "Only a parent can set up a rota.");
        this.need(memberIds.length >= 2, "A rota needs at least two people to take turns.");
        const task = await this.row(taskId);
        const { data, error } = await supabase
            .from(T.rotas)
            .insert({ ...this.scope, name: name.trim() || task.title, chore_task_id: taskId, member_ids: memberIds, rotation, current_index: 0, next_rotate_at: nextPlanningDay(this.ctx.today, this.ctx.space.planningDay) })
            .select("*")
            .single();
        fail("create rota", error);
        const rota = mapRota(data as Row);
        await this.assignRota(rota, memberIds[0]);
        return rota;
    }

    async removeRota(id: string): Promise<void> {
        this.need(this.manages);
        fail("remove rota", (await supabase.from(T.rotas).delete().eq("id", id)).error);
    }

    private async assignRota(rota: ChoreRota, memberId: string): Promise<void> {
        const all = await this.allTasks();
        const ids = all.filter((t) => (t.id === rota.taskId || t.sourceId === rota.taskId) && !isDone(t)).map((t) => t.id);
        if (!ids.length) return;
        fail("rota assign", (await supabase.from(T.tasks).update({ assignee_member_ids: [memberId], source_type: "rota" }).in("id", ids)).error);
    }

    async rotateRota(id: string): Promise<void> {
        this.need(this.manages || this.ctx.role === "child");
        const { data, error } = await supabase.from(T.rotas).select("*").eq("id", id).single();
        fail("rota", error);
        const rota = mapRota(data as Row);
        const next = (rota.currentIndex + 1) % Math.max(1, rota.memberIds.length);
        const nextRotateAt = nextPlanningDay(this.ctx.today, this.ctx.space.planningDay);
        fail("rotate", (await supabase.from(T.rotas).update({ current_index: next, next_rotate_at: nextRotateAt }).eq("id", id)).error);
        await this.assignRota({ ...rota, currentIndex: next, nextRotateAt }, rota.memberIds[next]);
    }

    async runDueRotations(): Promise<number> {
        const { data, error } = await supabase.from(T.rotas).select("*").eq("space_id", this.ctx.space.id).lte("next_rotate_at", this.ctx.today);
        fail("rota", error);
        const due = ((data ?? []) as Row[]).map(mapRota);
        for (const r of due) await this.rotateRota(r.id);
        return due.length;
    }

    // -----------------------------------------------------------------------
    // Rewards
    // -----------------------------------------------------------------------

    async createReward(input: { name: string; note?: string; costSprouts: number; kind: RewardKind; imageUrl?: string | null }): Promise<Reward> {
        this.need(this.manages, "Only a parent can add a reward.");
        const name = input.name.trim();
        if (!name) throw new Error("Give the reward a name.");
        const { data, error } = await supabase
            .from(T.rewards)
            .insert({ ...this.scope, name, note: (input.note ?? "").trim(), cost_sprouts: Math.max(1, Math.round(input.costSprouts)), kind: input.kind, image_url: input.imageUrl ?? null, active: true })
            .select("*")
            .single();
        fail("create reward", error);
        return mapReward(data as Row);
    }

    async updateReward(id: string, patch: Partial<Reward>): Promise<void> {
        this.need(this.manages);
        const row: Row = {};
        if (patch.name !== undefined) row.name = patch.name;
        if (patch.note !== undefined) row.note = patch.note;
        if (patch.costSprouts !== undefined) row.cost_sprouts = patch.costSprouts;
        if (patch.kind !== undefined) row.kind = patch.kind;
        if (patch.imageUrl !== undefined) row.image_url = patch.imageUrl;
        if (patch.active !== undefined) row.active = patch.active;
        fail("update reward", (await supabase.from(T.rewards).update(row).eq("id", id)).error);
    }

    async removeReward(id: string): Promise<void> {
        this.need(this.manages);
        fail("remove reward", (await supabase.from(T.rewards).delete().eq("id", id)).error);
    }

    async requestReward(rewardId: string, note = ""): Promise<Redemption> {
        this.need(!this.isGuest, "Rewards are for the children of the family.");
        const state = await this.load();
        const reward = state.rewards.find((r) => r.id === rewardId);
        if (!reward || !reward.active) throw new Error("That reward isn't available.");
        const balance = sproutsBalance(state, this.me);
        this.need(balance >= reward.costSprouts, `${reward.name} costs ${reward.costSprouts} Sprouts — you have ${balance}.`);
        const { data, error } = await supabase
            .from(T.redemptions)
            .insert({ ...this.scope, reward_id: rewardId, member_id: this.me, status: "requested", cost_sprouts: reward.costSprouts, note: note.trim(), at: new Date().toISOString() })
            .select("*")
            .single();
        fail("request reward", error);
        return mapRedemption(data as Row);
    }

    async decideRedemption(id: string, approve: boolean, note = ""): Promise<RedeemResult> {
        this.need(this.manages, "Only a parent can approve a reward.");
        const { data, error } = await supabase.from(T.redemptions).select("*").eq("id", id).single();
        fail("request", error);
        const r = mapRedemption(data as Row);
        if (r.status !== "requested") throw new Error("That request has already been decided.");
        const reward = (await supabase.from(T.rewards).select("name").eq("id", r.rewardId).maybeSingle()).data as Row | null;
        const at = new Date().toISOString();

        if (!approve) {
            fail("decline", (await supabase.from(T.redemptions).update({ status: "declined", decided_by: this.me, decided_at: at, note: note.trim() || r.note }).eq("id", id)).error);
            return { redemptionId: id, memberId: r.memberId, sproutsDelta: 0, rewardName: s(reward?.name, "Reward") };
        }

        const state = await this.load();
        const balance = sproutsBalance(state, r.memberId);
        this.need(balance >= r.costSprouts, `There are only ${balance} Sprouts in that balance.`);
        fail("approve", (await supabase.from(T.redemptions).update({ status: "approved", decided_by: this.me, decided_at: at, note: note.trim() || r.note }).eq("id", id)).error);
        fail(
            "deduct Sprouts",
            (await supabase.from(T.ledger).insert({ ...this.scope, member_id: r.memberId, delta: -r.costSprouts, source_type: "reward", source_id: id, note: `Redeemed: ${s(reward?.name, "reward")}`, at })).error,
        );
        return { redemptionId: id, memberId: r.memberId, sproutsDelta: -r.costSprouts, rewardName: s(reward?.name, "Reward") };
    }

    async fulfilRedemption(id: string): Promise<void> {
        this.need(this.manages);
        fail("fulfil", (await supabase.from(T.redemptions).update({ status: "fulfilled" }).eq("id", id)).error);
    }

    async adjustSprouts(memberId: string, delta: number, note: string): Promise<void> {
        this.need(this.manages, "Only a parent can adjust Sprouts.");
        fail(
            "adjust Sprouts",
            (await supabase.from(T.ledger).insert({ ...this.scope, member_id: memberId, delta: Math.round(delta), source_type: "adjustment", source_id: null, note: note.trim() || "Adjustment", at: new Date().toISOString() })).error,
        );
    }
}
