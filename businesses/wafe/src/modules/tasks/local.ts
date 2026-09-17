import type { RepoContext } from "@/data/core";
import { seedContext } from "@/data/coreSeed";
import { uid } from "@/lib/format";
import { columnTasks, isDone, nextDueAfter, nextPlanningDay, sproutsBalance, visibleTo } from "./derive";
import { seed } from "./seed";
import type { ChoreRota, CompleteResult, NewTaskInput, RedeemResult, Redemption, Reward, RewardKind, SproutsEntry, Task, TaskStatus, TasksRepo, TasksState } from "./types";

/**
 * Tasks & chores in this browser.
 *
 * Every write is real and lands in localStorage, and every write asks the
 * question the database will ask: may this member do this? A child may create
 * a task for herself and tick off what she was given; she cannot assign work
 * to her brother, edit the rota, price a reward or approve her own photo. A
 * guest may tick off exactly the tasks a parent handed them and nothing else.
 *
 * The Sprouts economy is kept honest in one place: `finish()` is the only path
 * that credits a chore, and it always writes a ledger entry naming the task
 * that earned it (AC 5).
 */

const KEY = "wafe:demo:tasks:v2";

const now = (): string => new Date().toISOString();

function isState(v: unknown): v is TasksState {
    if (!v || typeof v !== "object") return false;
    const s = v as Partial<TasksState>;
    return Array.isArray(s.tasks) && Array.isArray(s.rotas) && Array.isArray(s.ledger) && Array.isArray(s.rewards) && Array.isArray(s.redemptions);
}

export class LocalTasksRepo implements TasksRepo {
    private cache: TasksState | null = null;

    constructor(private ctx: RepoContext) {}

    // -----------------------------------------------------------------------
    // Storage
    // -----------------------------------------------------------------------

    private all(): TasksState {
        if (this.cache) return this.cache;
        try {
            const raw = localStorage.getItem(KEY);
            if (raw) {
                const parsed: unknown = JSON.parse(raw);
                if (isState(parsed)) return (this.cache = parsed);
            }
        } catch {
            /* a corrupt or foreign key falls back to the seed */
        }
        const fresh = seed(seedContext(this.ctx.space, this.ctx.members, this.ctx.today));
        this.cache = fresh;
        this.save(fresh);
        return fresh;
    }

    private save(next: TasksState): void {
        this.cache = next;
        try {
            localStorage.setItem(KEY, JSON.stringify(next));
        } catch {
            /* private browsing: the session works, it just won't persist */
        }
    }

    private edit(fn: (s: TasksState) => TasksState): void {
        this.save(fn({ ...this.all() }));
    }

    private patch(id: string, fn: (t: Task) => Task): void {
        this.edit((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? fn(t) : t)) }));
    }

    async load(): Promise<TasksState> {
        return visibleTo(this.all(), this.ctx);
    }

    // -----------------------------------------------------------------------
    // Guards — the same questions the RLS policies ask
    // -----------------------------------------------------------------------

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
    private task(id: string): Task {
        const t = this.all().tasks.find((x) => x.id === id);
        if (!t) throw new Error("That task has gone");
        return t;
    }
    /** Editing a task: parents, its owner, or whoever created it. */
    private canEdit(t: Task): boolean {
        if (this.isGuest) return false;
        return this.manages || t.ownerMemberId === this.me || t.createdBy === this.me;
    }
    /** Ticking a task off: whoever it was given to, plus parents. */
    private canComplete(t: Task): boolean {
        if (t.assigneeMemberIds.includes(this.me)) return true;
        if (this.isGuest) return false;
        if (this.manages) return true;
        // The family chores board: a child may take an unclaimed child-safe chore.
        return t.isChore && t.childSafe && !t.assigneeMemberIds.length;
    }

    private nextOrder(status: TaskStatus): number {
        const col = columnTasks(this.all().tasks, status);
        return col.length ? Math.max(...col.map((t) => t.kanbanOrder)) + 10 : 10;
    }

    // -----------------------------------------------------------------------
    // Completion — the only path that credits Sprouts
    // -----------------------------------------------------------------------

    /**
     * Mark done, credit the ledger, and roll the recurrence forward. Callers
     * have already checked permission; this is the mechanics.
     */
    private finish(task: Task, byMemberId: string): CompleteResult {
        const doer = this.ctx.members.find((m) => m.id === byMemberId);
        const earns = task.isChore && task.sprouts > 0 && doer?.role === "child";
        const at = now();

        let nextTask: Task | null = null;
        if (task.rrule) {
            const due = nextDueAfter(task.rrule, task.dueAt ?? at, this.ctx.today);
            nextTask = {
                ...task,
                id: uid("task"),
                status: "todo",
                kanbanOrder: this.nextOrder("todo"),
                dueAt: due,
                doneAt: null,
                doneBy: null,
                proofUrl: null,
                proofSubmittedAt: null,
                proofApprovedBy: null,
                remindersSent: 0,
                droppedReason: null,
                checklist: task.checklist.map((c) => ({ ...c, id: uid("chk"), done: false })),
                sourceType: "recurrence",
                sourceId: task.id,
                createdAt: at,
            };
        }

        const entry: SproutsEntry | null = earns ? { id: uid("sprout"), memberId: byMemberId, delta: task.sprouts, sourceType: "chore", sourceId: task.id, note: task.title, at } : null;

        this.edit((s) => ({
            ...s,
            tasks: [...s.tasks.map((t) => (t.id === task.id ? { ...t, status: "done" as TaskStatus, doneAt: at, doneBy: byMemberId } : t)), ...(nextTask ? [nextTask] : [])],
            ledger: entry ? [...s.ledger, entry] : s.ledger,
        }));

        return {
            taskId: task.id,
            sprouts: entry ? entry.delta : 0,
            memberId: earns ? byMemberId : null,
            awaitingApproval: false,
            nextTaskId: nextTask?.id ?? null,
            nextDueAt: nextTask?.dueAt ?? null,
            milestoneId: task.milestoneId,
        };
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
        // A child creates for themselves only, in the Me scope (AC 11).
        if (child) {
            this.need(assignees.every((id) => id === this.me), "You can add jobs for yourself — a parent assigns everyone else.");
            this.need(!input.isChore, "A parent sets up the chores and what they're worth.");
        }
        const status = input.status ?? "todo";
        const task: Task = {
            id: uid("task"),
            title,
            notes: (input.notes ?? "").trim(),
            assigneeMemberIds: child ? [this.me] : assignees,
            dueAt: input.dueAt ?? null,
            allDay: input.allDay ?? true,
            priority: input.priority ?? "normal",
            scope: child ? "me" : input.scope ?? "family",
            kind: input.kind ?? (input.isChore ? "chore" : "task"),
            goalId: input.goalId ?? null,
            goalLabel: input.goalLabel ?? "",
            milestoneId: input.milestoneId ?? null,
            milestoneLabel: input.milestoneLabel ?? "",
            projectId: input.projectId ?? null,
            tripId: input.tripId ?? null,
            curriculumId: input.curriculumId ?? null,
            valueId: input.valueId ?? null,
            status,
            kanbanOrder: this.nextOrder(status),
            rrule: input.rrule ?? null,
            isChore: input.isChore ?? false,
            sprouts: Math.max(0, Math.round(input.sprouts ?? 0)),
            needsProof: input.needsProof ?? false,
            proofUrl: null,
            proofSubmittedAt: null,
            proofApprovedBy: null,
            sourceType: input.sourceType ?? "manual",
            sourceId: input.sourceId ?? null,
            droppedReason: null,
            checklist: (input.checklist ?? []).filter((x) => x.trim()).map((text, i) => ({ id: uid("chk"), text: text.trim(), done: false, order: i })),
            remindersSent: 0,
            ownerMemberId: this.me,
            visibility: child ? "child" : input.visibility ?? "family",
            sharedWith: input.sharedWith ?? [],
            childSafe: input.childSafe ?? child,
            doneAt: null,
            doneBy: null,
            createdBy: this.me,
            createdAt: now(),
        };
        this.edit((s) => ({ ...s, tasks: [...s.tasks, task] }));
        return task;
    }

    async updateTask(id: string, patch: Partial<Task>): Promise<void> {
        const t = this.task(id);
        this.need(this.canEdit(t));
        if (this.ctx.role === "child" && !this.manages) {
            this.need(!("assigneeMemberIds" in patch) || (patch.assigneeMemberIds ?? []).every((x) => x === this.me), "You can't give a job to someone else.");
            this.need(!("sprouts" in patch), "A parent decides what a chore is worth.");
        }
        this.patch(id, (x) => ({ ...x, ...patch, id: x.id }));
    }

    async removeTask(id: string): Promise<void> {
        const t = this.task(id);
        this.need(this.canEdit(t));
        this.edit((s) => ({
            ...s,
            tasks: s.tasks.filter((x) => x.id !== id),
            rotas: s.rotas.filter((r) => r.taskId !== id),
        }));
    }

    async moveTask(id: string, status: TaskStatus, toIndex: number): Promise<void> {
        const t = this.task(id);
        this.need(this.canEdit(t) || this.canComplete(t));
        // Dropping into Done is a completion, ledger and all.
        if (status === "done" && !isDone(t)) this.finish(t, t.assigneeMemberIds[0] ?? this.me);
        if (status !== "done" && isDone(t)) this.patch(id, (x) => ({ ...x, doneAt: null, doneBy: null, droppedReason: null }));

        const column = columnTasks(this.all().tasks, status).filter((x) => x.id !== id);
        const at = Math.max(0, Math.min(toIndex, column.length));
        const ordered = [...column.slice(0, at), this.task(id), ...column.slice(at)];
        const orders = new Map(ordered.map((x, i) => [x.id, (i + 1) * 10]));
        this.edit((s) => ({
            ...s,
            tasks: s.tasks.map((x) => (orders.has(x.id) ? { ...x, status, kanbanOrder: orders.get(x.id) as number } : x)),
        }));
    }

    async completeTask(id: string, byMemberId?: string): Promise<CompleteResult> {
        const t = this.task(id);
        this.need(this.canComplete(t));
        const by = byMemberId ?? (t.assigneeMemberIds.includes(this.me) ? this.me : t.assigneeMemberIds[0] ?? this.me);
        // A chore that needs a photo waits for a parent before it counts (AC 4).
        if (t.isChore && t.needsProof && !t.proofApprovedBy) {
            this.need(Boolean(t.proofUrl), "Add a photo of it first — then a parent can say yes and the Sprouts land.");
            this.patch(id, (x) => ({ ...x, status: "doing" }));
            return { taskId: id, sprouts: 0, memberId: by, awaitingApproval: true, nextTaskId: null, nextDueAt: null, milestoneId: t.milestoneId };
        }
        return this.finish(t, by);
    }

    async reopenTask(id: string): Promise<void> {
        const t = this.task(id);
        this.need(this.canEdit(t) || this.canComplete(t));
        this.patch(id, (x) => ({ ...x, status: "todo", doneAt: null, doneBy: null, droppedReason: null }));
    }

    async dropTask(id: string, reason: string): Promise<void> {
        const t = this.task(id);
        this.need(this.canEdit(t));
        this.patch(id, (x) => ({ ...x, status: "done", droppedReason: reason.trim() || "We decided not to", doneAt: now(), doneBy: this.me }));
    }

    async remind(id: string): Promise<void> {
        this.task(id);
        this.need(this.manages);
        this.patch(id, (x) => ({ ...x, remindersSent: x.remindersSent + 1 }));
    }

    async setChecklistItem(taskId: string, itemId: string, done: boolean): Promise<void> {
        const t = this.task(taskId);
        this.need(this.canEdit(t) || this.canComplete(t));
        this.patch(taskId, (x) => ({ ...x, checklist: x.checklist.map((c) => (c.id === itemId ? { ...c, done } : c)) }));
    }

    async addChecklistItem(taskId: string, text: string): Promise<void> {
        const t = this.task(taskId);
        this.need(this.canEdit(t));
        const clean = text.trim();
        if (!clean) return;
        this.patch(taskId, (x) => ({ ...x, checklist: [...x.checklist, { id: uid("chk"), text: clean, done: false, order: x.checklist.length }] }));
    }

    async removeChecklistItem(taskId: string, itemId: string): Promise<void> {
        const t = this.task(taskId);
        this.need(this.canEdit(t));
        this.patch(taskId, (x) => ({ ...x, checklist: x.checklist.filter((c) => c.id !== itemId) }));
    }

    async submitProof(taskId: string, imageUrl: string): Promise<void> {
        const t = this.task(taskId);
        this.need(this.canComplete(t));
        this.need(Boolean(imageUrl), "Choose a photo first.");
        this.patch(taskId, (x) => ({ ...x, proofUrl: imageUrl, proofSubmittedAt: now(), proofApprovedBy: null, status: "doing" }));
    }

    async approveProof(taskId: string): Promise<CompleteResult> {
        const t = this.task(taskId);
        this.need(this.manages, "Only a parent can approve a chore photo.");
        this.need(Boolean(t.proofUrl), "There's no photo to approve yet.");
        this.patch(taskId, (x) => ({ ...x, proofApprovedBy: this.me }));
        return this.finish(this.task(taskId), t.assigneeMemberIds[0] ?? this.me);
    }

    async declineProof(taskId: string, reason: string): Promise<void> {
        this.task(taskId);
        this.need(this.manages, "Only a parent can review a chore photo.");
        this.patch(taskId, (x) => ({ ...x, proofUrl: null, proofSubmittedAt: null, proofApprovedBy: null, status: "todo", notes: reason.trim() ? `${x.notes}${x.notes ? "\n" : ""}Sent back: ${reason.trim()}` : x.notes }));
    }

    async bulkAssign(ids: string[], memberIds: string[]): Promise<void> {
        this.need(this.manages, "Only a parent can assign the family's work.");
        const set = new Set(ids);
        this.edit((s) => ({ ...s, tasks: s.tasks.map((t) => (set.has(t.id) ? { ...t, assigneeMemberIds: memberIds } : t)) }));
    }

    async linkToGoal(id: string, goalId: string | null, goalLabel: string): Promise<void> {
        const t = this.task(id);
        this.need(this.canEdit(t));
        this.patch(id, (x) => ({ ...x, goalId, goalLabel: goalId ? goalLabel : "", milestoneId: goalId ? x.milestoneId : null, milestoneLabel: goalId ? x.milestoneLabel : "" }));
    }

    // -----------------------------------------------------------------------
    // Rota
    // -----------------------------------------------------------------------

    async createRota(name: string, taskId: string, memberIds: string[], rotation: ChoreRota["rotation"]): Promise<ChoreRota> {
        this.need(this.manages, "Only a parent can set up a rota.");
        this.need(memberIds.length >= 2, "A rota needs at least two people to take turns.");
        const rota: ChoreRota = {
            id: uid("rota"),
            name: name.trim() || this.task(taskId).title,
            taskId,
            memberIds,
            rotation,
            currentIndex: 0,
            nextRotateAt: nextPlanningDay(this.ctx.today, this.ctx.space.planningDay),
            createdAt: now(),
        };
        this.edit((s) => ({ ...s, rotas: [...s.rotas, rota] }));
        await this.assignRota(rota, memberIds[0]);
        return rota;
    }

    async removeRota(id: string): Promise<void> {
        this.need(this.manages);
        this.edit((s) => ({ ...s, rotas: s.rotas.filter((r) => r.id !== id) }));
    }

    /** Point the rota's chore (and its open instances) at whoever's turn it is. */
    private async assignRota(rota: ChoreRota, memberId: string): Promise<void> {
        this.edit((s) => ({
            ...s,
            tasks: s.tasks.map((t) => ((t.id === rota.taskId || t.sourceId === rota.taskId) && !isDone(t) ? { ...t, assigneeMemberIds: [memberId], sourceType: "rota" } : t)),
        }));
    }

    async rotateRota(id: string): Promise<void> {
        this.need(this.manages || this.ctx.role === "child");
        const rota = this.all().rotas.find((r) => r.id === id);
        if (!rota) throw new Error("That rota has gone");
        const next = (rota.currentIndex + 1) % Math.max(1, rota.memberIds.length);
        const rotated: ChoreRota = { ...rota, currentIndex: next, nextRotateAt: nextPlanningDay(this.ctx.today, this.ctx.space.planningDay) };
        this.edit((s) => ({ ...s, rotas: s.rotas.map((r) => (r.id === id ? rotated : r)) }));
        await this.assignRota(rotated, rotated.memberIds[next]);
    }

    async runDueRotations(): Promise<number> {
        const due = this.all().rotas.filter((r) => r.nextRotateAt <= this.ctx.today);
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
        const reward: Reward = {
            id: uid("reward"),
            name,
            note: (input.note ?? "").trim(),
            costSprouts: Math.max(1, Math.round(input.costSprouts)),
            kind: input.kind,
            imageUrl: input.imageUrl ?? null,
            active: true,
            createdAt: now(),
        };
        this.edit((s) => ({ ...s, rewards: [...s.rewards, reward] }));
        return reward;
    }

    async updateReward(id: string, patch: Partial<Reward>): Promise<void> {
        this.need(this.manages);
        this.edit((s) => ({ ...s, rewards: s.rewards.map((r) => (r.id === id ? { ...r, ...patch, id: r.id } : r)) }));
    }

    async removeReward(id: string): Promise<void> {
        this.need(this.manages);
        this.edit((s) => ({ ...s, rewards: s.rewards.filter((r) => r.id !== id), redemptions: s.redemptions.filter((r) => r.rewardId !== id) }));
    }

    async requestReward(rewardId: string, note = ""): Promise<Redemption> {
        this.need(!this.isGuest, "Rewards are for the children of the family.");
        const state = this.all();
        const reward = state.rewards.find((r) => r.id === rewardId);
        if (!reward || !reward.active) throw new Error("That reward isn't available.");
        const balance = sproutsBalance(state, this.me);
        this.need(balance >= reward.costSprouts, `${reward.name} costs ${reward.costSprouts} Sprouts — you have ${balance}.`);
        const redemption: Redemption = {
            id: uid("redeem"),
            rewardId,
            memberId: this.me,
            status: "requested",
            costSprouts: reward.costSprouts,
            decidedBy: null,
            note: note.trim(),
            at: now(),
            decidedAt: null,
        };
        this.edit((s) => ({ ...s, redemptions: [...s.redemptions, redemption] }));
        return redemption;
    }

    async decideRedemption(id: string, approve: boolean, note = ""): Promise<RedeemResult> {
        this.need(this.manages, "Only a parent can approve a reward.");
        const state = this.all();
        const r = state.redemptions.find((x) => x.id === id);
        if (!r) throw new Error("That request has gone");
        const reward = state.rewards.find((x) => x.id === r.rewardId);
        if (r.status !== "requested") throw new Error("That request has already been decided.");
        const at = now();

        if (!approve) {
            this.edit((s) => ({ ...s, redemptions: s.redemptions.map((x) => (x.id === id ? { ...x, status: "declined", decidedBy: this.me, decidedAt: at, note: note.trim() || x.note } : x)) }));
            return { redemptionId: id, memberId: r.memberId, sproutsDelta: 0, rewardName: reward?.name ?? "Reward" };
        }

        const balance = sproutsBalance(state, r.memberId);
        this.need(balance >= r.costSprouts, `There are only ${balance} Sprouts in that balance.`);
        const entry: SproutsEntry = { id: uid("sprout"), memberId: r.memberId, delta: -r.costSprouts, sourceType: "reward", sourceId: id, note: `Redeemed: ${reward?.name ?? "reward"}`, at };
        this.edit((s) => ({
            ...s,
            redemptions: s.redemptions.map((x) => (x.id === id ? { ...x, status: "approved", decidedBy: this.me, decidedAt: at, note: note.trim() || x.note } : x)),
            ledger: [...s.ledger, entry],
        }));
        return { redemptionId: id, memberId: r.memberId, sproutsDelta: -r.costSprouts, rewardName: reward?.name ?? "Reward" };
    }

    async fulfilRedemption(id: string): Promise<void> {
        this.need(this.manages);
        this.edit((s) => ({ ...s, redemptions: s.redemptions.map((x) => (x.id === id ? { ...x, status: "fulfilled" } : x)) }));
    }

    async adjustSprouts(memberId: string, delta: number, note: string): Promise<void> {
        this.need(this.manages, "Only a parent can adjust Sprouts.");
        const entry: SproutsEntry = { id: uid("sprout"), memberId, delta: Math.round(delta), sourceType: "adjustment", sourceId: null, note: note.trim() || "Adjustment", at: now() };
        this.edit((s) => ({ ...s, ledger: [...s.ledger, entry] }));
    }
}
