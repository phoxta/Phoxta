import type { RepoContext } from "@/data/core";
import type { Visibility } from "@/data/core";
import { uid } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { canWorkOnProject, snapshotFrom, visibleTo } from "./derive";
import type {
    CardStatus,
    Clip,
    Comparison,
    ComparisonOption,
    ComparisonScore,
    Criterion,
    Decision,
    NewCard,
    NewClip,
    NewComparison,
    NewDecision,
    NewNote,
    NewProject,
    Note,
    NoteBlock,
    Project,
    ProjectCard,
    ProjectCost,
    ProjectKind,
    ProjectRole,
    ProjectStatus,
    ProjectsRepo,
    ProjectsState,
    Sensitivity,
    SnapshotSource,
} from "./types";
import { CARD_POINTS } from "./types";

/**
 * The same workshop, live, under row-level security.
 *
 * The database is the real guard — a child's select on wf_project_notes
 * returns only `general` rows on a project they are on, and every write policy
 * refuses an archived project — but the slice is still run through the same
 * `visibleTo()` the demo uses, so the two modes cannot drift. snake_case ↔
 * camelCase mapping lives in this file and nowhere else, and no query here
 * touches another module's tables: a task that belongs to a project keeps this
 * project's id, and the board reads it from the Tasks slice.
 */

type Row = Record<string, unknown>;

const s = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);
const n = (v: unknown, d = 0): number => (typeof v === "number" ? v : Number(v ?? d) || d);
const iso = (v: unknown): string => (v ? new Date(v as string).toISOString() : new Date().toISOString());
const date = (v: unknown, d = ""): string => (typeof v === "string" && v ? v.slice(0, 10) : d);
const nul = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const vis = (v: unknown): Visibility => (v === "private" || v === "shared" || v === "child" ? v : "family");

function fail(where: string, error: { message: string } | null | undefined): void {
    if (error) throw new Error(`${where}: ${error.message}`);
}

const mapChecklist = (v: unknown): ProjectCard["checklist"] =>
    Array.isArray(v)
        ? v
              .map((raw) => {
                  const r = raw as Row;
                  return { id: s(r.id), text: s(r.text), done: r.done === true };
              })
              .filter((x) => x.id)
        : [];

const mapBlocks = (v: unknown): NoteBlock[] =>
    Array.isArray(v)
        ? v
              .map((raw) => {
                  const r = raw as Row;
                  const type = s(r.type, "p");
                  return { id: s(r.id), type: (["h", "p", "ul", "todo", "quote"].includes(type) ? type : "p") as NoteBlock["type"], text: s(r.text), done: r.done === true };
              })
              .filter((x) => x.id)
        : [];

const mapCriteria = (v: unknown): Criterion[] =>
    Array.isArray(v)
        ? v
              .map((raw) => {
                  const r = raw as Row;
                  return { key: s(r.key), label: s(r.label), weight: n(r.weight, 3) };
              })
              .filter((x) => x.key)
        : [];

const mapOptions = (v: unknown): ComparisonOption[] =>
    Array.isArray(v)
        ? v
              .map((raw) => {
                  const r = raw as Row;
                  return { key: s(r.key), label: s(r.label), note: s(r.note), link: s(r.link) };
              })
              .filter((x) => x.key)
        : [];

const mapProject = (r: Row, members: Project["members"]): Project => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    title: s(r.title),
    summary: s(r.summary),
    kind: s(r.kind, "family") as ProjectKind,
    status: s(r.status, "planning") as ProjectStatus,
    ownerMemberId: s(r.owner_member_id),
    members,
    startDate: date(r.start_date),
    endDate: nul(r.end_date) ? date(r.end_date) : null,
    coverUrl: nul(r.cover_url),
    budgetCents: r.budget_cents === null || r.budget_cents === undefined ? null : n(r.budget_cents),
    financeCategoryId: nul(r.finance_category_id),
    financeCategoryLabel: s(r.finance_category_label),
    goalId: nul(r.goal_id),
    goalLabel: s(r.goal_label),
    tripId: nul(r.trip_id),
    valueId: nul(r.value_id),
    tags: strs(r.tags),
    visibility: vis(r.visibility),
    sharedWith: strs(r.shared_with),
    childSafe: r.child_safe === true,
    archived: r.archived === true,
    archivedAt: nul(r.archived_at),
    decisionId: nul(r.decision_id),
    createdAt: iso(r.created_at),
});

const mapCard = (r: Row): ProjectCard => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    projectId: s(r.project_id),
    title: s(r.title),
    notes: s(r.notes),
    assigneeMemberIds: strs(r.assignee_member_ids),
    dueAt: nul(r.due_at) ? iso(r.due_at) : null,
    status: s(r.status, "todo") as CardStatus,
    order: n(r.card_order),
    checklist: mapChecklist(r.checklist),
    childSafe: r.child_safe === true,
    doneAt: nul(r.done_at) ? iso(r.done_at) : null,
    createdAt: iso(r.created_at),
});

const mapCost = (r: Row): ProjectCost => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    projectId: s(r.project_id),
    label: s(r.label),
    amountCents: n(r.amount_cents),
    paidOn: date(r.paid_on),
    stage: s(r.stage, "quote") as ProjectCost["stage"],
    createdAt: iso(r.created_at),
});

const mapClip = (r: Row): Clip => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    projectId: nul(r.project_id),
    folder: s(r.folder, "Inbox"),
    url: s(r.url),
    title: s(r.title),
    excerpt: s(r.excerpt),
    imageUrl: nul(r.image_url),
    snapshotText: s(r.snapshot_text),
    snapshotSource: s(r.snapshot_source, "selection") as SnapshotSource,
    tags: strs(r.tags),
    savedBy: s(r.saved_by),
    visibility: vis(r.visibility),
    sharedWith: strs(r.shared_with),
    childSafe: r.child_safe === true,
    createdAt: iso(r.created_at),
});

const mapNote = (r: Row): Note => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    projectId: nul(r.project_id),
    folder: s(r.folder, "Inbox"),
    title: s(r.title),
    blocks: mapBlocks(r.blocks),
    tags: strs(r.tags),
    sensitivity: s(r.sensitivity, "general") as Sensitivity,
    ownerMemberId: s(r.owner_member_id),
    visibility: vis(r.visibility),
    sharedWith: strs(r.shared_with),
    childSafe: r.child_safe === true,
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
});

const mapComparison = (r: Row): Comparison => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    projectId: s(r.project_id),
    title: s(r.title),
    criteria: mapCriteria(r.criteria),
    options: mapOptions(r.options),
    createdAt: iso(r.created_at),
});

const mapScore = (r: Row): ComparisonScore => ({
    comparisonId: s(r.comparison_id),
    optionKey: s(r.option_key),
    criterionKey: s(r.criterion_key),
    score: n(r.score),
});

const mapDecision = (r: Row): Decision => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    projectId: s(r.project_id),
    comparisonId: nul(r.comparison_id),
    decision: s(r.decision),
    because: s(r.because),
    decidedBy: s(r.decided_by),
    decidedAt: iso(r.decided_at),
});

const keyFor = (label: string, i: number): string =>
    label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 28) || `k${i + 1}`;

export class SupabaseProjectsRepo implements ProjectsRepo {
    constructor(private ctx: RepoContext) {}

    private get base() {
        return { organization_id: this.ctx.orgId, space_id: this.ctx.space.id };
    }

    private deny(): never {
        throw new Error("Not allowed");
    }

    // -- load ----------------------------------------------------------------

    async load(): Promise<ProjectsState> {
        const spaceId = this.ctx.space.id;
        const [projects, members, cards, costs, clips, notes, comparisons, scores, decisions] = await Promise.all([
            supabase.from("wf_projects").select("*").eq("space_id", spaceId),
            supabase.from("wf_project_members").select("*").eq("space_id", spaceId),
            supabase.from("wf_project_cards").select("*").eq("space_id", spaceId),
            supabase.from("wf_project_costs").select("*").eq("space_id", spaceId),
            supabase.from("wf_project_clips").select("*").eq("space_id", spaceId),
            supabase.from("wf_project_notes").select("*").eq("space_id", spaceId),
            supabase.from("wf_project_comparisons").select("*").eq("space_id", spaceId),
            supabase.from("wf_project_scores").select("*").eq("space_id", spaceId),
            supabase.from("wf_project_decisions").select("*").eq("space_id", spaceId),
        ]);
        fail("projects", projects.error);
        fail("project members", members.error);
        fail("cards", cards.error);
        fail("costs", costs.error);
        fail("clips", clips.error);
        fail("notes", notes.error);
        fail("comparisons", comparisons.error);
        fail("scores", scores.error);
        fail("decisions", decisions.error);

        const byProject = new Map<string, Project["members"]>();
        for (const raw of (members.data ?? []) as Row[]) {
            const pid = s(raw.project_id);
            const list = byProject.get(pid) ?? [];
            list.push({ memberId: s(raw.member_id), role: s(raw.role, "member") as ProjectRole });
            byProject.set(pid, list);
        }

        const state: ProjectsState = {
            projects: ((projects.data ?? []) as Row[]).map((r) => mapProject(r, byProject.get(s(r.id)) ?? [])),
            cards: ((cards.data ?? []) as Row[]).map(mapCard),
            costs: ((costs.data ?? []) as Row[]).map(mapCost),
            clips: ((clips.data ?? []) as Row[]).map(mapClip),
            notes: ((notes.data ?? []) as Row[]).map(mapNote),
            comparisons: ((comparisons.data ?? []) as Row[]).map(mapComparison),
            scores: ((scores.data ?? []) as Row[]).map(mapScore),
            decisions: ((decisions.data ?? []) as Row[]).map(mapDecision),
        };
        return visibleTo(state, this.ctx);
    }

    // -- guards --------------------------------------------------------------

    private async project(id: string): Promise<Project> {
        const { data, error } = await supabase.from("wf_projects").select("*").eq("id", id).maybeSingle();
        fail("project", error);
        if (!data) throw new Error("That project is gone.");
        const { data: mem } = await supabase.from("wf_project_members").select("*").eq("project_id", id);
        const members = ((mem ?? []) as Row[]).map((r) => ({ memberId: s(r.member_id), role: s(r.role, "member") as ProjectRole }));
        return mapProject(data as Row, members);
    }

    private open(p: Project): Project {
        if (p.archived) throw new Error("This project is archived. Restore it before making changes.");
        return p;
    }

    private async runnable(id: string): Promise<Project> {
        const p = this.open(await this.project(id));
        if (this.ctx.role === "parent") return p;
        if (this.ctx.role === "guest" || p.ownerMemberId !== this.ctx.me.id) this.deny();
        return p;
    }

    private async workable(id: string): Promise<Project> {
        const p = this.open(await this.project(id));
        if (this.ctx.role === "parent") return p;
        if (this.ctx.role === "guest" || !canWorkOnProject(p, this.ctx.me.id)) this.deny();
        return p;
    }

    // -- projects ------------------------------------------------------------

    async createProject(input: NewProject): Promise<Project> {
        const youngAdult = this.ctx.role === "child" && this.ctx.me.ageBand === "young-adult";
        if (this.ctx.role !== "parent" && !youngAdult) this.deny();
        const owner = this.ctx.role === "parent" ? (input.ownerMemberId ?? this.ctx.me.id) : this.ctx.me.id;
        const { data, error } = await supabase
            .from("wf_projects")
            .insert({
                ...this.base,
                title: input.title.trim(),
                summary: input.summary?.trim() ?? "",
                kind: input.kind ?? "family",
                status: input.status ?? "planning",
                owner_member_id: owner,
                start_date: input.startDate ?? this.ctx.today,
                end_date: input.endDate ?? null,
                cover_url: input.coverUrl ?? null,
                budget_cents: input.budgetCents ?? null,
                finance_category_id: input.financeCategoryId ?? null,
                finance_category_label: input.financeCategoryLabel ?? "",
                goal_id: input.goalId ?? null,
                goal_label: input.goalLabel ?? "",
                trip_id: input.tripId ?? null,
                value_id: input.valueId ?? null,
                tags: input.tags ?? [],
                visibility: input.visibility ?? "family",
                shared_with: input.sharedWith ?? [],
                child_safe: input.childSafe ?? true,
            })
            .select()
            .single();
        fail("create project", error);
        const project = mapProject(data as Row, []);
        const ids = [...new Set([owner, ...(input.memberIds ?? [])])];
        const { error: memErr } = await supabase.from("wf_project_members").insert(ids.map((memberId) => ({ ...this.base, project_id: project.id, member_id: memberId, role: memberId === owner ? "owner" : "member" })));
        fail("project members", memErr);
        return { ...project, members: ids.map((memberId) => ({ memberId, role: memberId === owner ? "owner" : ("member" as ProjectRole) })) };
    }

    async updateProject(id: string, patch: Partial<Omit<Project, "id" | "spaceId" | "createdAt">>): Promise<void> {
        await this.runnable(id);
        const row: Row = {};
        if (patch.title !== undefined) row.title = patch.title;
        if (patch.summary !== undefined) row.summary = patch.summary;
        if (patch.kind !== undefined) row.kind = patch.kind;
        if (patch.status !== undefined) row.status = patch.status;
        if (patch.ownerMemberId !== undefined) row.owner_member_id = patch.ownerMemberId;
        if (patch.startDate !== undefined) row.start_date = patch.startDate;
        if (patch.endDate !== undefined) row.end_date = patch.endDate;
        if (patch.coverUrl !== undefined) row.cover_url = patch.coverUrl;
        if (patch.budgetCents !== undefined) row.budget_cents = patch.budgetCents;
        if (patch.financeCategoryId !== undefined) row.finance_category_id = patch.financeCategoryId;
        if (patch.financeCategoryLabel !== undefined) row.finance_category_label = patch.financeCategoryLabel;
        if (patch.goalId !== undefined) row.goal_id = patch.goalId;
        if (patch.goalLabel !== undefined) row.goal_label = patch.goalLabel;
        if (patch.tripId !== undefined) row.trip_id = patch.tripId;
        if (patch.valueId !== undefined) row.value_id = patch.valueId;
        if (patch.tags !== undefined) row.tags = patch.tags;
        if (patch.visibility !== undefined) row.visibility = patch.visibility;
        if (patch.sharedWith !== undefined) row.shared_with = patch.sharedWith;
        if (patch.childSafe !== undefined) row.child_safe = patch.childSafe;
        if (patch.decisionId !== undefined) row.decision_id = patch.decisionId;
        if (!Object.keys(row).length) return;
        const { error } = await supabase.from("wf_projects").update(row).eq("id", id);
        fail("update project", error);
    }

    async removeProject(id: string): Promise<void> {
        const p = await this.project(id);
        if (this.ctx.role !== "parent" && p.ownerMemberId !== this.ctx.me.id) this.deny();
        const { error } = await supabase.from("wf_projects").delete().eq("id", id);
        fail("delete project", error);
    }

    async setArchived(id: string, archived: boolean): Promise<void> {
        const p = await this.project(id);
        if (this.ctx.role !== "parent" && p.ownerMemberId !== this.ctx.me.id) this.deny();
        if (!archived && this.ctx.role !== "parent") this.deny();
        const { error } = await supabase
            .from("wf_projects")
            .update({ archived, archived_at: archived ? new Date().toISOString() : null })
            .eq("id", id);
        fail("archive project", error);
    }

    async setMemberRole(projectId: string, memberId: string, role: ProjectRole | null): Promise<void> {
        const p = await this.runnable(projectId);
        if (memberId === p.ownerMemberId && role !== "owner") throw new Error("The owner stays on the project. Hand it over first.");
        if (!role) {
            const { error } = await supabase.from("wf_project_members").delete().eq("project_id", projectId).eq("member_id", memberId);
            fail("project member", error);
            return;
        }
        const { error } = await supabase.from("wf_project_members").upsert({ ...this.base, project_id: projectId, member_id: memberId, role }, { onConflict: "project_id,member_id" });
        fail("project member", error);
    }

    // -- board ---------------------------------------------------------------

    async addCard(input: NewCard): Promise<ProjectCard> {
        await this.workable(input.projectId);
        const status = input.status ?? "todo";
        const { count } = await supabase.from("wf_project_cards").select("id", { count: "exact", head: true }).eq("project_id", input.projectId).eq("status", status);
        const { data, error } = await supabase
            .from("wf_project_cards")
            .insert({
                ...this.base,
                project_id: input.projectId,
                title: input.title.trim(),
                notes: input.notes?.trim() ?? "",
                assignee_member_ids: input.assigneeMemberIds ?? [],
                due_at: input.dueAt ?? null,
                status,
                card_order: count ?? 0,
                checklist: (input.checklist ?? []).filter(Boolean).map((text) => ({ id: uid("chk"), text: text.trim(), done: false })),
                child_safe: input.childSafe ?? true,
            })
            .select()
            .single();
        fail("add card", error);
        return mapCard(data as Row);
    }

    private async card(id: string): Promise<ProjectCard> {
        const { data, error } = await supabase.from("wf_project_cards").select("*").eq("id", id).maybeSingle();
        fail("card", error);
        if (!data) throw new Error("That card is gone.");
        return mapCard(data as Row);
    }

    async updateCard(id: string, patch: Partial<Pick<ProjectCard, "title" | "notes" | "assigneeMemberIds" | "dueAt" | "childSafe">>): Promise<void> {
        const card = await this.card(id);
        await this.workable(card.projectId);
        const row: Row = {};
        if (patch.title !== undefined) row.title = patch.title;
        if (patch.notes !== undefined) row.notes = patch.notes;
        if (patch.assigneeMemberIds !== undefined) row.assignee_member_ids = patch.assigneeMemberIds;
        if (patch.dueAt !== undefined) row.due_at = patch.dueAt;
        if (patch.childSafe !== undefined) row.child_safe = patch.childSafe;
        if (!Object.keys(row).length) return;
        const { error } = await supabase.from("wf_project_cards").update(row).eq("id", id);
        fail("update card", error);
    }

    async moveCard(id: string, status: CardStatus, toIndex: number): Promise<void> {
        const card = await this.card(id);
        await this.workable(card.projectId);
        const { data, error } = await supabase.from("wf_project_cards").select("*").eq("project_id", card.projectId).eq("status", status).order("card_order");
        fail("column", error);
        const column = ((data ?? []) as Row[]).map(mapCard).filter((c) => c.id !== id);
        column.splice(Math.max(0, Math.min(toIndex, column.length)), 0, { ...card, status });
        for (let i = 0; i < column.length; i++) {
            const c = column[i];
            const row: Row = { card_order: i };
            if (c.id === id) {
                row.status = status;
                row.done_at = status === "done" ? (card.doneAt ?? new Date().toISOString()) : null;
            }
            const { error: upErr } = await supabase.from("wf_project_cards").update(row).eq("id", c.id);
            fail("move card", upErr);
        }
    }

    async completeCard(id: string, done: boolean): Promise<{ cardId: string; memberIds: string[]; points: number }> {
        const card = await this.card(id);
        await this.workable(card.projectId);
        const already = card.status === "done";
        await this.moveCard(id, done ? "done" : "todo", 0);
        const kids = card.assigneeMemberIds.filter((m) => this.ctx.members.find((x) => x.id === m)?.role === "child");
        return { cardId: id, memberIds: kids, points: done && !already ? CARD_POINTS : 0 };
    }

    async removeCard(id: string): Promise<void> {
        const card = await this.card(id);
        await this.workable(card.projectId);
        const { error } = await supabase.from("wf_project_cards").delete().eq("id", id);
        fail("delete card", error);
    }

    private async setChecklist(cardId: string, fn: (list: ProjectCard["checklist"]) => ProjectCard["checklist"]): Promise<void> {
        const card = await this.card(cardId);
        await this.workable(card.projectId);
        const { error } = await supabase.from("wf_project_cards").update({ checklist: fn(card.checklist) }).eq("id", cardId);
        fail("checklist", error);
    }

    async addCheck(cardId: string, text: string): Promise<void> {
        const clean = text.trim();
        if (!clean) return;
        await this.setChecklist(cardId, (list) => [...list, { id: uid("chk"), text: clean, done: false }]);
    }

    async setCheck(cardId: string, itemId: string, done: boolean): Promise<void> {
        await this.setChecklist(cardId, (list) => list.map((i) => (i.id === itemId ? { ...i, done } : i)));
    }

    async removeCheck(cardId: string, itemId: string): Promise<void> {
        await this.setChecklist(cardId, (list) => list.filter((i) => i.id !== itemId));
    }

    // -- money ---------------------------------------------------------------

    async addCost(projectId: string, input: { label: string; amountCents: number; paidOn?: string; stage?: ProjectCost["stage"] }): Promise<ProjectCost> {
        if (this.ctx.role !== "parent") this.deny();
        this.open(await this.project(projectId));
        const { data, error } = await supabase
            .from("wf_project_costs")
            .insert({ ...this.base, project_id: projectId, label: input.label.trim(), amount_cents: Math.max(0, Math.round(input.amountCents)), paid_on: input.paidOn ?? this.ctx.today, stage: input.stage ?? "quote" })
            .select()
            .single();
        fail("add cost", error);
        return mapCost(data as Row);
    }

    async removeCost(id: string): Promise<void> {
        if (this.ctx.role !== "parent") this.deny();
        const { error } = await supabase.from("wf_project_costs").delete().eq("id", id);
        fail("delete cost", error);
    }

    // -- research vault ------------------------------------------------------

    async saveClip(input: NewClip): Promise<Clip> {
        if (this.ctx.role === "guest") this.deny();
        const url = input.url.trim();
        if (!url) throw new Error("A clip needs a link.");
        if (input.projectId) await this.workable(input.projectId);
        const title = input.title?.trim() || url;
        const excerpt = input.excerpt?.trim() ?? "";
        const { data, error } = await supabase
            .from("wf_project_clips")
            .insert({
                ...this.base,
                project_id: input.projectId ?? null,
                folder: input.folder?.trim() || "Inbox",
                url,
                title,
                excerpt,
                image_url: input.imageUrl ?? null,
                snapshot_text: input.snapshotText?.trim() || snapshotFrom(title, excerpt, url),
                snapshot_source: input.snapshotSource ?? (input.snapshotText?.trim() ? "typed" : "selection"),
                tags: input.tags ?? [],
                saved_by: this.ctx.me.id,
                visibility: input.visibility ?? "family",
                shared_with: input.sharedWith ?? [],
                child_safe: input.childSafe ?? this.ctx.role === "child",
            })
            .select()
            .single();
        fail("save clip", error);
        return mapClip(data as Row);
    }

    async updateClip(id: string, patch: Parameters<ProjectsRepo["updateClip"]>[1]): Promise<void> {
        const row: Row = {};
        if (patch.title !== undefined) row.title = patch.title;
        if (patch.excerpt !== undefined) row.excerpt = patch.excerpt;
        if (patch.folder !== undefined) row.folder = patch.folder;
        if (patch.tags !== undefined) row.tags = patch.tags;
        if (patch.projectId !== undefined) row.project_id = patch.projectId;
        if (patch.snapshotText !== undefined) row.snapshot_text = patch.snapshotText;
        if (patch.snapshotSource !== undefined) row.snapshot_source = patch.snapshotSource;
        if (patch.imageUrl !== undefined) row.image_url = patch.imageUrl;
        if (patch.visibility !== undefined) row.visibility = patch.visibility;
        if (patch.sharedWith !== undefined) row.shared_with = patch.sharedWith;
        if (patch.childSafe !== undefined) row.child_safe = patch.childSafe;
        if (!Object.keys(row).length) return;
        if (patch.projectId) await this.workable(patch.projectId);
        const { error } = await supabase.from("wf_project_clips").update(row).eq("id", id);
        fail("update clip", error);
    }

    async removeClip(id: string): Promise<void> {
        const { error } = await supabase.from("wf_project_clips").delete().eq("id", id);
        fail("delete clip", error);
    }

    async createNote(input: NewNote): Promise<Note> {
        if (this.ctx.role === "guest") this.deny();
        if (input.projectId) await this.workable(input.projectId);
        const sensitivity = input.sensitivity ?? "general";
        if (sensitivity !== "general" && this.ctx.role !== "parent") this.deny();
        const { data, error } = await supabase
            .from("wf_project_notes")
            .insert({
                ...this.base,
                project_id: input.projectId ?? null,
                folder: input.folder?.trim() || "Inbox",
                title: input.title.trim() || "Untitled note",
                blocks: input.blocks?.length ? input.blocks : [{ id: uid("blk"), type: "p", text: "", done: false }],
                tags: input.tags ?? [],
                sensitivity,
                owner_member_id: this.ctx.me.id,
                visibility: input.visibility ?? "family",
                shared_with: input.sharedWith ?? [],
                child_safe: input.childSafe ?? this.ctx.role === "child",
            })
            .select()
            .single();
        fail("create note", error);
        return mapNote(data as Row);
    }

    async updateNote(id: string, patch: Parameters<ProjectsRepo["updateNote"]>[1]): Promise<void> {
        if (patch.sensitivity && patch.sensitivity !== "general" && this.ctx.role !== "parent") this.deny();
        const row: Row = { updated_at: new Date().toISOString() };
        if (patch.title !== undefined) row.title = patch.title;
        if (patch.blocks !== undefined) row.blocks = patch.blocks;
        if (patch.tags !== undefined) row.tags = patch.tags;
        if (patch.folder !== undefined) row.folder = patch.folder;
        if (patch.sensitivity !== undefined) row.sensitivity = patch.sensitivity;
        if (patch.projectId !== undefined) row.project_id = patch.projectId;
        if (patch.visibility !== undefined) row.visibility = patch.visibility;
        if (patch.sharedWith !== undefined) row.shared_with = patch.sharedWith;
        if (patch.childSafe !== undefined) row.child_safe = patch.childSafe;
        const { error } = await supabase.from("wf_project_notes").update(row).eq("id", id);
        fail("update note", error);
    }

    async removeNote(id: string): Promise<void> {
        const { error } = await supabase.from("wf_project_notes").delete().eq("id", id);
        fail("delete note", error);
    }

    // -- comparisons + decisions --------------------------------------------

    async createComparison(input: NewComparison): Promise<Comparison> {
        await this.workable(input.projectId);
        const criteria = input.criteria.filter((c) => c.label.trim()).map((c, i) => ({ key: keyFor(c.label, i), label: c.label.trim(), weight: Math.max(1, Math.min(5, Math.round(c.weight ?? 3))) }));
        const options = input.options.filter((o) => o.label.trim()).map((o, i) => ({ key: keyFor(o.label, i), label: o.label.trim(), note: o.note?.trim() ?? "", link: o.link?.trim() ?? "" }));
        if (criteria.length < 1 || options.length < 2) throw new Error("A comparison needs at least two options and one criterion.");
        const { data, error } = await supabase
            .from("wf_project_comparisons")
            .insert({ ...this.base, project_id: input.projectId, title: input.title.trim() || "Comparison", criteria, options })
            .select()
            .single();
        fail("create comparison", error);
        return mapComparison(data as Row);
    }

    private async comparison(id: string): Promise<Comparison> {
        const { data, error } = await supabase.from("wf_project_comparisons").select("*").eq("id", id).maybeSingle();
        fail("comparison", error);
        if (!data) throw new Error("That comparison is gone.");
        return mapComparison(data as Row);
    }

    async updateComparison(id: string, patch: Partial<Pick<Comparison, "title" | "criteria" | "options">>): Promise<void> {
        const c = await this.comparison(id);
        await this.workable(c.projectId);
        const row: Row = {};
        if (patch.title !== undefined) row.title = patch.title;
        if (patch.criteria !== undefined) row.criteria = patch.criteria;
        if (patch.options !== undefined) row.options = patch.options;
        if (!Object.keys(row).length) return;
        const { error } = await supabase.from("wf_project_comparisons").update(row).eq("id", id);
        fail("update comparison", error);
        if (patch.options) {
            const keys = patch.options.map((o) => o.key);
            const { error: delErr } = await supabase.from("wf_project_scores").delete().eq("comparison_id", id).not("option_key", "in", `(${keys.map((k) => `"${k}"`).join(",")})`);
            fail("prune scores", delErr);
        }
    }

    async removeComparison(id: string): Promise<void> {
        const c = await this.comparison(id);
        await this.workable(c.projectId);
        const { error } = await supabase.from("wf_project_comparisons").delete().eq("id", id);
        fail("delete comparison", error);
    }

    async setScore(comparisonId: string, optionKey: string, criterionKey: string, score: number): Promise<void> {
        const c = await this.comparison(comparisonId);
        await this.workable(c.projectId);
        const { error } = await supabase
            .from("wf_project_scores")
            .upsert({ ...this.base, comparison_id: comparisonId, option_key: optionKey, criterion_key: criterionKey, score: Math.max(0, Math.min(10, Math.round(score))) }, { onConflict: "comparison_id,option_key,criterion_key" });
        fail("score", error);
    }

    async recordDecision(input: NewDecision): Promise<Decision> {
        const p = await this.runnable(input.projectId);
        const { data, error } = await supabase
            .from("wf_project_decisions")
            .insert({ ...this.base, project_id: p.id, comparison_id: input.comparisonId ?? null, decision: input.decision.trim(), because: input.because.trim(), decided_by: this.ctx.me.id })
            .select()
            .single();
        fail("record decision", error);
        const d = mapDecision(data as Row);
        if (input.headline !== false) {
            const { error: upErr } = await supabase.from("wf_projects").update({ decision_id: d.id }).eq("id", p.id);
            fail("pin decision", upErr);
        }
        return d;
    }

    async removeDecision(id: string): Promise<void> {
        const { error } = await supabase.from("wf_project_decisions").delete().eq("id", id);
        fail("delete decision", error);
    }
}
