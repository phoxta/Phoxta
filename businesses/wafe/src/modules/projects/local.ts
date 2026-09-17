import type { RepoContext } from "@/data/core";
import { seedContext } from "@/data/coreSeed";
import { uid } from "@/lib/format";
import { canWorkOnProject, snapshotFrom, visibleTo } from "./derive";
import { seed } from "./seed";
import type {
    CardStatus,
    Clip,
    Comparison,
    Decision,
    NewCard,
    NewClip,
    NewComparison,
    NewDecision,
    NewNote,
    NewProject,
    Note,
    Project,
    ProjectCard,
    ProjectCost,
    ProjectRole,
    ProjectsRepo,
    ProjectsState,
} from "./types";
import { CARD_POINTS } from "./types";

/**
 * The demo workshop — every write real, in the browser.
 *
 * The guards here are the ones the live policies enforce, so "Not allowed"
 * means the same thing in both modes:
 *
 *  · a guest writes nothing at all;
 *  · a child writes only inside a project they are a member of, and never the
 *    project row itself unless they own it (a young adult may own one);
 *  · nobody — parents included — writes to an archived project. Unarchiving
 *    is the single exception, and it is a parent's to make.
 */

const KEY = "wafe:demo:projects:v2";

function isState(v: unknown): v is ProjectsState {
    if (!v || typeof v !== "object") return false;
    const s = v as Partial<ProjectsState>;
    return Array.isArray(s.projects) && Array.isArray(s.cards) && Array.isArray(s.clips) && Array.isArray(s.notes) && Array.isArray(s.comparisons);
}

const now = (): string => new Date().toISOString();
const clean = (v: string | undefined, d = ""): string => (v ?? d).trim();
const tagsOf = (v: string[] | undefined): string[] => [...new Set((v ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean))];

export class LocalProjectsRepo implements ProjectsRepo {
    private cache: ProjectsState | null = null;

    constructor(private ctx: RepoContext) {}

    // -- storage -------------------------------------------------------------

    private all(): ProjectsState {
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

    private save(s: ProjectsState): void {
        this.cache = s;
        try {
            localStorage.setItem(KEY, JSON.stringify(s));
        } catch {
            /* private browsing: the session still works, it just won't persist */
        }
    }

    private write(fn: (s: ProjectsState) => void): void {
        const s = { ...this.all() };
        fn(s);
        this.save(s);
    }

    // -- permissions ---------------------------------------------------------

    private deny(): never {
        throw new Error("Not allowed");
    }

    private get isParent(): boolean {
        return this.ctx.role === "parent";
    }

    private project(id: string): Project {
        const p = this.all().projects.find((x) => x.id === id);
        if (!p) throw new Error("That project is gone.");
        return p;
    }

    /** Archived means read-only, for everyone (AC 5). */
    private open(p: Project): Project {
        if (p.archived) throw new Error("This project is archived. Restore it before making changes.");
        return p;
    }

    /** May this member change the project row itself? */
    private canRunProject(p: Project): boolean {
        if (this.isParent) return true;
        if (this.ctx.role === "guest") return false;
        return p.ownerMemberId === this.ctx.me.id;
    }

    /** May this member add and move work inside the project? */
    private canWorkOn(p: Project): boolean {
        if (this.isParent) return true;
        if (this.ctx.role === "guest") return false;
        return canWorkOnProject(p, this.ctx.me.id);
    }

    private runnable(id: string): Project {
        const p = this.open(this.project(id));
        if (!this.canRunProject(p)) this.deny();
        return p;
    }

    private workable(id: string): Project {
        const p = this.open(this.project(id));
        if (!this.canWorkOn(p)) this.deny();
        return p;
    }

    // -- load ----------------------------------------------------------------

    async load(): Promise<ProjectsState> {
        return visibleTo(this.all(), this.ctx);
    }

    // -- projects ------------------------------------------------------------

    async createProject(input: NewProject): Promise<Project> {
        // A young adult may own a project; younger children and guests may not (AC 7).
        const youngAdult = this.ctx.role === "child" && this.ctx.me.ageBand === "young-adult";
        if (!this.isParent && !youngAdult) this.deny();
        const owner = this.isParent ? (input.ownerMemberId ?? this.ctx.me.id) : this.ctx.me.id;
        const members = [...new Set([owner, ...(input.memberIds ?? [])])];
        const p: Project = {
            id: uid("proj"),
            spaceId: this.ctx.space.id,
            title: clean(input.title) || "Untitled project",
            summary: clean(input.summary),
            kind: input.kind ?? "family",
            status: input.status ?? "planning",
            ownerMemberId: owner,
            members: members.map((memberId) => ({ memberId, role: memberId === owner ? "owner" : "member" })),
            startDate: input.startDate ?? this.ctx.today,
            endDate: input.endDate ?? null,
            coverUrl: input.coverUrl ?? null,
            budgetCents: input.budgetCents ?? null,
            financeCategoryId: input.financeCategoryId ?? null,
            financeCategoryLabel: clean(input.financeCategoryLabel),
            goalId: input.goalId ?? null,
            goalLabel: clean(input.goalLabel),
            tripId: input.tripId ?? null,
            valueId: input.valueId ?? null,
            tags: tagsOf(input.tags),
            visibility: input.visibility ?? "family",
            sharedWith: input.sharedWith ?? [],
            childSafe: input.childSafe ?? true,
            archived: false,
            archivedAt: null,
            decisionId: null,
            createdAt: now(),
        };
        this.write((s) => {
            s.projects = [...s.projects, p];
        });
        return p;
    }

    async updateProject(id: string, patch: Partial<Omit<Project, "id" | "spaceId" | "createdAt">>): Promise<void> {
        this.runnable(id);
        const safe = { ...patch };
        delete safe.archived;
        delete safe.archivedAt;
        if (safe.tags) safe.tags = tagsOf(safe.tags);
        this.write((s) => {
            s.projects = s.projects.map((p) => (p.id === id ? { ...p, ...safe } : p));
        });
    }

    async removeProject(id: string): Promise<void> {
        const p = this.project(id);
        if (!this.canRunProject(p)) this.deny();
        this.write((s) => {
            s.projects = s.projects.filter((x) => x.id !== id);
            s.cards = s.cards.filter((c) => c.projectId !== id);
            s.costs = s.costs.filter((c) => c.projectId !== id);
            s.clips = s.clips.map((c) => (c.projectId === id ? { ...c, projectId: null } : c));
            s.notes = s.notes.map((n) => (n.projectId === id ? { ...n, projectId: null } : n));
            const compIds = new Set(s.comparisons.filter((c) => c.projectId === id).map((c) => c.id));
            s.comparisons = s.comparisons.filter((c) => c.projectId !== id);
            s.scores = s.scores.filter((x) => !compIds.has(x.comparisonId));
            s.decisions = s.decisions.filter((d) => d.projectId !== id);
        });
    }

    /** Archiving is the one write an archived project accepts — in reverse. */
    async setArchived(id: string, archived: boolean): Promise<void> {
        const p = this.project(id);
        if (!this.canRunProject(p)) this.deny();
        if (!archived && !this.isParent) this.deny();
        this.write((s) => {
            s.projects = s.projects.map((x) => (x.id === id ? { ...x, archived, archivedAt: archived ? now() : null } : x));
        });
    }

    async setMemberRole(projectId: string, memberId: string, role: ProjectRole | null): Promise<void> {
        const p = this.runnable(projectId);
        if (memberId === p.ownerMemberId && role !== "owner") throw new Error("The owner stays on the project. Hand it over first.");
        this.write((s) => {
            s.projects = s.projects.map((x) => {
                if (x.id !== projectId) return x;
                const rest = x.members.filter((m) => m.memberId !== memberId);
                return { ...x, members: role ? [...rest, { memberId, role }] : rest };
            });
        });
    }

    // -- board ---------------------------------------------------------------

    async addCard(input: NewCard): Promise<ProjectCard> {
        this.workable(input.projectId);
        const status: CardStatus = input.status ?? "todo";
        const order = this.all().cards.filter((c) => c.projectId === input.projectId && c.status === status).length;
        const c: ProjectCard = {
            id: uid("pcard"),
            spaceId: this.ctx.space.id,
            projectId: input.projectId,
            title: clean(input.title) || "Untitled",
            notes: clean(input.notes),
            assigneeMemberIds: input.assigneeMemberIds ?? [],
            dueAt: input.dueAt ?? null,
            status,
            order,
            checklist: (input.checklist ?? []).filter(Boolean).map((text) => ({ id: uid("chk"), text: text.trim(), done: false })),
            childSafe: input.childSafe ?? true,
            doneAt: null,
            createdAt: now(),
        };
        this.write((s) => {
            s.cards = [...s.cards, c];
        });
        return c;
    }

    private card(id: string): ProjectCard {
        const c = this.all().cards.find((x) => x.id === id);
        if (!c) throw new Error("That card is gone.");
        return c;
    }

    async updateCard(id: string, patch: Partial<Pick<ProjectCard, "title" | "notes" | "assigneeMemberIds" | "dueAt" | "childSafe">>): Promise<void> {
        this.workable(this.card(id).projectId);
        this.write((s) => {
            s.cards = s.cards.map((c) => (c.id === id ? { ...c, ...patch } : c));
        });
    }

    async moveCard(id: string, status: CardStatus, toIndex: number): Promise<void> {
        const card = this.card(id);
        this.workable(card.projectId);
        this.write((s) => {
            const column = s.cards
                .filter((c) => c.projectId === card.projectId && c.status === status && c.id !== id)
                .sort((a, b) => a.order - b.order);
            const moved: ProjectCard = {
                ...card,
                status,
                doneAt: status === "done" ? (card.doneAt ?? now()) : null,
            };
            column.splice(Math.max(0, Math.min(toIndex, column.length)), 0, moved);
            const reordered = new Map(column.map((c, i) => [c.id, i]));
            s.cards = s.cards.map((c) => {
                if (c.id === id) return { ...moved, order: reordered.get(id) ?? 0 };
                return reordered.has(c.id) ? { ...c, order: reordered.get(c.id) as number } : c;
            });
        });
    }

    async completeCard(id: string, done: boolean): Promise<{ cardId: string; memberIds: string[]; points: number }> {
        const card = this.card(id);
        this.workable(card.projectId);
        const already = card.status === "done";
        await this.moveCard(id, done ? "done" : "todo", 0);
        const kids = card.assigneeMemberIds.filter((m) => this.ctx.members.find((x) => x.id === m)?.role === "child");
        // Points are credited once, on the way in, and never taken back on a reopen.
        return { cardId: id, memberIds: kids, points: done && !already ? CARD_POINTS : 0 };
    }

    async removeCard(id: string): Promise<void> {
        this.workable(this.card(id).projectId);
        this.write((s) => {
            s.cards = s.cards.filter((c) => c.id !== id);
        });
    }

    async addCheck(cardId: string, text: string): Promise<void> {
        this.workable(this.card(cardId).projectId);
        const item = { id: uid("chk"), text: text.trim(), done: false };
        if (!item.text) return;
        this.write((s) => {
            s.cards = s.cards.map((c) => (c.id === cardId ? { ...c, checklist: [...c.checklist, item] } : c));
        });
    }

    async setCheck(cardId: string, itemId: string, done: boolean): Promise<void> {
        this.workable(this.card(cardId).projectId);
        this.write((s) => {
            s.cards = s.cards.map((c) => (c.id === cardId ? { ...c, checklist: c.checklist.map((i) => (i.id === itemId ? { ...i, done } : i)) } : c));
        });
    }

    async removeCheck(cardId: string, itemId: string): Promise<void> {
        this.workable(this.card(cardId).projectId);
        this.write((s) => {
            s.cards = s.cards.map((c) => (c.id === cardId ? { ...c, checklist: c.checklist.filter((i) => i.id !== itemId) } : c));
        });
    }

    // -- money ---------------------------------------------------------------

    async addCost(projectId: string, input: { label: string; amountCents: number; paidOn?: string; stage?: ProjectCost["stage"] }): Promise<ProjectCost> {
        this.open(this.project(projectId));
        if (!this.isParent) this.deny();
        const row: ProjectCost = {
            id: uid("cost"),
            spaceId: this.ctx.space.id,
            projectId,
            label: clean(input.label) || "Cost",
            amountCents: Math.max(0, Math.round(input.amountCents)),
            paidOn: input.paidOn ?? this.ctx.today,
            stage: input.stage ?? "quote",
            createdAt: now(),
        };
        this.write((s) => {
            s.costs = [...s.costs, row];
        });
        return row;
    }

    async removeCost(id: string): Promise<void> {
        if (!this.isParent) this.deny();
        const row = this.all().costs.find((c) => c.id === id);
        if (!row) return;
        this.open(this.project(row.projectId));
        this.write((s) => {
            s.costs = s.costs.filter((c) => c.id !== id);
        });
    }

    // -- research vault ------------------------------------------------------

    /**
     * The clipper.
     *
     * Whatever the bookmarklet captured (the selection, the meta description)
     * or the companion read back becomes `snapshotText` on the row, so the clip
     * still reads when the page it came from is gone. We never store a snapshot
     * without saying where it came from.
     */
    async saveClip(input: NewClip): Promise<Clip> {
        if (this.ctx.role === "guest") this.deny();
        const url = clean(input.url);
        if (!url) throw new Error("A clip needs a link.");
        if (input.projectId) this.workable(input.projectId);
        const title = clean(input.title) || url;
        const excerpt = clean(input.excerpt);
        const c: Clip = {
            id: uid("clip"),
            spaceId: this.ctx.space.id,
            projectId: input.projectId ?? null,
            folder: clean(input.folder) || "Inbox",
            url,
            title,
            excerpt,
            imageUrl: input.imageUrl ?? null,
            snapshotText: clean(input.snapshotText) || snapshotFrom(title, excerpt, url),
            snapshotSource: input.snapshotSource ?? (clean(input.snapshotText) ? "typed" : "selection"),
            tags: tagsOf(input.tags),
            savedBy: this.ctx.me.id,
            visibility: input.visibility ?? "family",
            sharedWith: input.sharedWith ?? [],
            childSafe: input.childSafe ?? this.ctx.role === "child",
            createdAt: now(),
        };
        this.write((s) => {
            s.clips = [...s.clips, c];
        });
        return c;
    }

    private clip(id: string): Clip {
        const c = this.all().clips.find((x) => x.id === id);
        if (!c) throw new Error("That clip is gone.");
        return c;
    }

    private mineOrParent(ownerId: string): void {
        if (this.isParent) return;
        if (this.ctx.role === "guest" || ownerId !== this.ctx.me.id) this.deny();
    }

    async updateClip(id: string, patch: Parameters<ProjectsRepo["updateClip"]>[1]): Promise<void> {
        const c = this.clip(id);
        this.mineOrParent(c.savedBy);
        if (c.projectId) this.open(this.project(c.projectId));
        if (patch.projectId) this.workable(patch.projectId);
        const safe = { ...patch };
        if (safe.tags) safe.tags = tagsOf(safe.tags);
        this.write((s) => {
            s.clips = s.clips.map((x) => (x.id === id ? { ...x, ...safe } : x));
        });
    }

    async removeClip(id: string): Promise<void> {
        const c = this.clip(id);
        this.mineOrParent(c.savedBy);
        if (c.projectId) this.open(this.project(c.projectId));
        this.write((s) => {
            s.clips = s.clips.filter((x) => x.id !== id);
        });
    }

    async createNote(input: NewNote): Promise<Note> {
        if (this.ctx.role === "guest") this.deny();
        if (input.projectId) this.workable(input.projectId);
        const sensitivity = input.sensitivity ?? "general";
        // Only a parent may file something as financial, health, documents or private.
        if (sensitivity !== "general" && !this.isParent) this.deny();
        const n: Note = {
            id: uid("pnote"),
            spaceId: this.ctx.space.id,
            projectId: input.projectId ?? null,
            folder: clean(input.folder) || "Inbox",
            title: clean(input.title) || "Untitled note",
            blocks: input.blocks?.length ? input.blocks : [{ id: uid("blk"), type: "p", text: "", done: false }],
            tags: tagsOf(input.tags),
            sensitivity,
            ownerMemberId: this.ctx.me.id,
            visibility: input.visibility ?? "family",
            sharedWith: input.sharedWith ?? [],
            childSafe: input.childSafe ?? this.ctx.role === "child",
            createdAt: now(),
            updatedAt: now(),
        };
        this.write((s) => {
            s.notes = [...s.notes, n];
        });
        return n;
    }

    private note(id: string): Note {
        const n = this.all().notes.find((x) => x.id === id);
        if (!n) throw new Error("That note is gone.");
        return n;
    }

    async updateNote(id: string, patch: Parameters<ProjectsRepo["updateNote"]>[1]): Promise<void> {
        const n = this.note(id);
        this.mineOrParent(n.ownerMemberId);
        if (n.projectId) this.open(this.project(n.projectId));
        if (patch.sensitivity && patch.sensitivity !== "general" && !this.isParent) this.deny();
        const safe = { ...patch };
        if (safe.tags) safe.tags = tagsOf(safe.tags);
        this.write((s) => {
            s.notes = s.notes.map((x) => (x.id === id ? { ...x, ...safe, updatedAt: now() } : x));
        });
    }

    async removeNote(id: string): Promise<void> {
        const n = this.note(id);
        this.mineOrParent(n.ownerMemberId);
        if (n.projectId) this.open(this.project(n.projectId));
        this.write((s) => {
            s.notes = s.notes.filter((x) => x.id !== id);
        });
    }

    // -- comparisons + decisions --------------------------------------------

    async createComparison(input: NewComparison): Promise<Comparison> {
        this.workable(input.projectId);
        const key = (label: string, i: number): string =>
            label
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "")
                .slice(0, 28) || `k${i + 1}`;
        const c: Comparison = {
            id: uid("cmp"),
            spaceId: this.ctx.space.id,
            projectId: input.projectId,
            title: clean(input.title) || "Comparison",
            criteria: input.criteria.filter((x) => clean(x.label)).map((x, i) => ({ key: key(x.label, i), label: x.label.trim(), weight: Math.max(1, Math.min(5, Math.round(x.weight ?? 3))) })),
            options: input.options.filter((x) => clean(x.label)).map((x, i) => ({ key: key(x.label, i), label: x.label.trim(), note: clean(x.note), link: clean(x.link) })),
            createdAt: now(),
        };
        if (c.criteria.length < 1 || c.options.length < 2) throw new Error("A comparison needs at least two options and one criterion.");
        this.write((s) => {
            s.comparisons = [...s.comparisons, c];
        });
        return c;
    }

    private comparison(id: string): Comparison {
        const c = this.all().comparisons.find((x) => x.id === id);
        if (!c) throw new Error("That comparison is gone.");
        return c;
    }

    async updateComparison(id: string, patch: Partial<Pick<Comparison, "title" | "criteria" | "options">>): Promise<void> {
        const c = this.comparison(id);
        this.workable(c.projectId);
        this.write((s) => {
            s.comparisons = s.comparisons.map((x) => (x.id === id ? { ...x, ...patch } : x));
            if (patch.options) {
                const keys = new Set(patch.options.map((o) => o.key));
                s.scores = s.scores.filter((x) => x.comparisonId !== id || keys.has(x.optionKey));
            }
            if (patch.criteria) {
                const keys = new Set(patch.criteria.map((o) => o.key));
                s.scores = s.scores.filter((x) => x.comparisonId !== id || keys.has(x.criterionKey));
            }
        });
    }

    async removeComparison(id: string): Promise<void> {
        const c = this.comparison(id);
        this.workable(c.projectId);
        this.write((s) => {
            s.comparisons = s.comparisons.filter((x) => x.id !== id);
            s.scores = s.scores.filter((x) => x.comparisonId !== id);
            s.decisions = s.decisions.map((d) => (d.comparisonId === id ? { ...d, comparisonId: null } : d));
        });
    }

    async setScore(comparisonId: string, optionKey: string, criterionKey: string, score: number): Promise<void> {
        const c = this.comparison(comparisonId);
        this.workable(c.projectId);
        const v = Math.max(0, Math.min(10, Math.round(score)));
        this.write((s) => {
            const rest = s.scores.filter((x) => !(x.comparisonId === comparisonId && x.optionKey === optionKey && x.criterionKey === criterionKey));
            s.scores = [...rest, { comparisonId, optionKey, criterionKey, score: v }];
        });
    }

    async recordDecision(input: NewDecision): Promise<Decision> {
        const p = this.runnable(input.projectId);
        const d: Decision = {
            id: uid("dec"),
            spaceId: this.ctx.space.id,
            projectId: p.id,
            comparisonId: input.comparisonId ?? null,
            decision: clean(input.decision),
            because: clean(input.because),
            decidedBy: this.ctx.me.id,
            decidedAt: now(),
        };
        if (!d.decision) throw new Error("Say what was chosen.");
        this.write((s) => {
            s.decisions = [...s.decisions, d];
            if (input.headline !== false) s.projects = s.projects.map((x) => (x.id === p.id ? { ...x, decisionId: d.id } : x));
        });
        return d;
    }

    async removeDecision(id: string): Promise<void> {
        const d = this.all().decisions.find((x) => x.id === id);
        if (!d) return;
        this.runnable(d.projectId);
        this.write((s) => {
            s.decisions = s.decisions.filter((x) => x.id !== id);
            s.projects = s.projects.map((p) => (p.decisionId === id ? { ...p, decisionId: null } : p));
        });
    }
}
