import type { RepoContext } from "@/data/core";
import { seedContext } from "@/data/coreSeed";
import { uid } from "@/lib/format";
import { canCreateBoard, canEditBoard, canPinTo, canSeeBoard, pinsOf, visibleTo } from "./derive";
import { cacheImage } from "./images";
import { seed } from "./seed";
import type { Board, BoardPatch, BoardSection, ChecklistItem, MoodboardsRepo, MoodboardsState, NewBoard, NewChecklistLine, NewPin, Pin, PinComment, PinPatch, Reaction } from "./types";

/**
 * The demo, with every write real, in the browser.
 *
 * The guards are the ones the live policies enforce, so "Not allowed" means
 * the same thing in both modes: a guest writes only where a parent has named
 * them AND granted them the module; a child's board is child-safe whatever
 * they ask for; nobody edits an archived board; and a pin from the web is
 * cached before it is stored, never after.
 */

const KEY = "wafe:demo:moodboards:v2";

function isState(v: unknown): v is MoodboardsState {
    if (!v || typeof v !== "object") return false;
    const s = v as Partial<MoodboardsState>;
    return Array.isArray(s.boards) && Array.isArray(s.pins) && Array.isArray(s.sections) && Array.isArray(s.comments) && Array.isArray(s.checklist);
}

const now = (): string => new Date().toISOString();
const clean = (v: string | undefined | null, d = ""): string => (v ?? d).trim();
const tagsOf = (v: string[] | undefined): string[] => [...new Set((v ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean))];

export class LocalMoodboardsRepo implements MoodboardsRepo {
    private cache: MoodboardsState | null = null;

    constructor(private ctx: RepoContext) {}

    // -- storage -------------------------------------------------------------

    private all(): MoodboardsState {
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

    private save(s: MoodboardsState): void {
        this.cache = s;
        try {
            localStorage.setItem(KEY, JSON.stringify(s));
        } catch {
            /* private browsing, or a very large board: the session still works */
        }
    }

    private write(fn: (s: MoodboardsState) => void): void {
        const s = { ...this.all() };
        fn(s);
        this.save(s);
    }

    async load(): Promise<MoodboardsState> {
        return visibleTo(this.all(), this.ctx);
    }

    // -- guards --------------------------------------------------------------

    private deny(): never {
        throw new Error("Not allowed");
    }

    private board(id: string): Board {
        const b = this.all().boards.find((x) => x.id === id);
        if (!b) throw new Error("That board is gone.");
        if (!canSeeBoard(b, this.ctx.me)) this.deny();
        return b;
    }

    private editable(id: string): Board {
        const b = this.board(id);
        if (!canEditBoard(b, this.ctx)) this.deny();
        return b;
    }

    private pinnable(id: string): Board {
        const b = this.board(id);
        if (!canPinTo(b, this.ctx)) this.deny();
        return b;
    }

    private pin(id: string): Pin {
        const p = this.all().pins.find((x) => x.id === id);
        if (!p) throw new Error("That pin is gone.");
        return p;
    }

    /** A pin may be changed by a parent, by whoever added it, or by the board's owner. */
    private mine(p: Pin, b: Board): boolean {
        return this.ctx.role === "parent" || p.addedBy === this.ctx.me.id || b.ownerMemberId === this.ctx.me.id;
    }

    private touch(s: MoodboardsState, boardId: string): void {
        s.boards = s.boards.map((b) => (b.id === boardId ? { ...b, updatedAt: now() } : b));
    }

    // -- boards --------------------------------------------------------------

    async createBoard(input: NewBoard): Promise<Board> {
        if (!canCreateBoard(this.ctx)) this.deny();
        const child = this.ctx.role === "child";
        const owner = this.ctx.role === "parent" ? (input.ownerMemberId ?? this.ctx.me.id) : this.ctx.me.id;
        // AC 4: a child's board is child-safe, and never hidden from a parent.
        const visibility = child && input.visibility === "private" ? "family" : (input.visibility ?? "family");
        const row: Board = {
            id: uid("board"),
            spaceId: this.ctx.space.id,
            title: clean(input.title) || "Untitled board",
            description: clean(input.description),
            kind: input.kind ?? "ideas",
            template: input.template ?? null,
            ownerMemberId: owner,
            collaboratorIds: [...new Set(input.collaboratorIds ?? [])].filter((id) => id !== owner),
            visibility,
            sharedWith: [...new Set(input.sharedWith ?? [])],
            childSafe: child ? true : (input.childSafe ?? true),
            tags: tagsOf(input.tags),
            coverPinId: null,
            projectId: input.projectId ?? null,
            projectLabel: clean(input.projectLabel),
            tripId: input.tripId ?? null,
            tripLabel: clean(input.tripLabel),
            reviewedAt: null,
            reviewedBy: null,
            archived: false,
            createdAt: now(),
            updatedAt: now(),
        };
        this.write((s) => {
            s.boards = [row, ...s.boards];
            const titles = (input.sections ?? []).map((t) => clean(t)).filter(Boolean);
            if (titles.length) {
                s.sections = [...s.sections, ...titles.map((title, i) => ({ id: uid("bsec"), spaceId: this.ctx.space.id, boardId: row.id, title, order: i }))];
            }
        });
        return row;
    }

    async updateBoard(id: string, patch: BoardPatch): Promise<void> {
        const b = this.editable(id);
        const child = this.ctx.role === "child";
        this.write((s) => {
            s.boards = s.boards.map((x) =>
                x.id !== b.id
                    ? x
                    : {
                          ...x,
                          ...patch,
                          title: patch.title !== undefined ? clean(patch.title) || x.title : x.title,
                          tags: patch.tags !== undefined ? tagsOf(patch.tags) : x.tags,
                          collaboratorIds: patch.collaboratorIds !== undefined ? [...new Set(patch.collaboratorIds)].filter((m) => m !== x.ownerMemberId) : x.collaboratorIds,
                          // A child cannot take their board out of a parent's sight.
                          childSafe: child ? true : (patch.childSafe ?? x.childSafe),
                          visibility: child && patch.visibility === "private" ? x.visibility : (patch.visibility ?? x.visibility),
                          updatedAt: now(),
                      },
            );
        });
    }

    async removeBoard(id: string): Promise<void> {
        const b = this.editable(id);
        this.write((s) => {
            const pinIds = new Set(s.pins.filter((p) => p.boardId === b.id).map((p) => p.id));
            s.boards = s.boards.filter((x) => x.id !== b.id);
            s.sections = s.sections.filter((x) => x.boardId !== b.id);
            s.pins = s.pins.filter((p) => p.boardId !== b.id);
            s.comments = s.comments.filter((c) => !pinIds.has(c.pinId));
            s.checklist = s.checklist.filter((c) => c.boardId !== b.id);
        });
    }

    async reviewBoard(id: string): Promise<void> {
        if (this.ctx.role !== "parent") this.deny();
        const b = this.board(id);
        this.write((s) => {
            s.boards = s.boards.map((x) => (x.id === b.id ? { ...x, reviewedAt: now(), reviewedBy: this.ctx.me.id } : x));
        });
    }

    // -- sections ------------------------------------------------------------

    async addSection(boardId: string, title: string): Promise<BoardSection> {
        const b = this.editable(boardId);
        const order = this.all().sections.filter((s) => s.boardId === b.id).length;
        const row: BoardSection = { id: uid("bsec"), spaceId: this.ctx.space.id, boardId: b.id, title: clean(title) || "Untitled section", order };
        this.write((s) => {
            s.sections = [...s.sections, row];
            this.touch(s, b.id);
        });
        return row;
    }

    async renameSection(id: string, title: string): Promise<void> {
        const sec = this.all().sections.find((x) => x.id === id);
        if (!sec) throw new Error("That section is gone.");
        this.editable(sec.boardId);
        this.write((s) => {
            s.sections = s.sections.map((x) => (x.id === id ? { ...x, title: clean(title) || x.title } : x));
        });
    }

    async removeSection(id: string): Promise<void> {
        const sec = this.all().sections.find((x) => x.id === id);
        if (!sec) return;
        this.editable(sec.boardId);
        this.write((s) => {
            s.sections = s.sections.filter((x) => x.id !== id).map((x, i) => ({ ...x, order: i }));
            // Its pins are not deleted; they go back to the board's front page.
            s.pins = s.pins.map((p) => (p.sectionId === id ? { ...p, sectionId: null } : p));
        });
    }

    async moveSection(id: string, direction: -1 | 1): Promise<void> {
        const sec = this.all().sections.find((x) => x.id === id);
        if (!sec) return;
        this.editable(sec.boardId);
        this.write((s) => {
            const list = s.sections.filter((x) => x.boardId === sec.boardId).sort((a, b) => a.order - b.order);
            const i = list.findIndex((x) => x.id === id);
            const j = i + direction;
            if (i < 0 || j < 0 || j >= list.length) return;
            [list[i], list[j]] = [list[j], list[i]];
            const order = new Map(list.map((x, k) => [x.id, k]));
            s.sections = s.sections.map((x) => (order.has(x.id) ? { ...x, order: order.get(x.id)! } : x));
        });
    }

    // -- pins ----------------------------------------------------------------

    async addPin(input: NewPin): Promise<Pin> {
        const b = this.pinnable(input.boardId);
        const title = clean(input.title) || "Pinned";
        // AC 1: the copy is made BEFORE the row is stored, so a board never
        // depends on somebody else's server staying up.
        let imageUrl = clean(input.imageUrl);
        let cachedFrom: Pin["cachedFrom"] = input.source === "upload" ? "upload" : "library";
        if (input.source === "url") {
            const cached = await cacheImage(clean(input.sourceUrl), title);
            imageUrl = cached.dataUrl;
            cachedFrom = cached.kind === "library" ? "library" : cached.kind;
        }
        if (!imageUrl) throw new Error("A pin needs a picture.");
        const order = pinsOf(this.all(), b.id).length;
        const row: Pin = {
            id: uid("pin"),
            spaceId: this.ctx.space.id,
            boardId: b.id,
            sectionId: input.sectionId ?? null,
            title,
            note: clean(input.note),
            source: input.source,
            sourceUrl: clean(input.sourceUrl) || null,
            imageUrl,
            cachedFrom,
            cachedAt: now(),
            tags: tagsOf(input.tags),
            priceCents: input.priceCents ?? null,
            colour: input.colour ?? null,
            order,
            addedBy: this.ctx.me.id,
            copiedFromPinId: null,
            createdAt: now(),
        };
        this.write((s) => {
            s.pins = [...s.pins, row];
            this.touch(s, b.id);
        });
        return row;
    }

    async updatePin(id: string, patch: PinPatch): Promise<void> {
        const p = this.pin(id);
        const b = this.pinnable(p.boardId);
        if (!this.mine(p, b)) this.deny();
        this.write((s) => {
            s.pins = s.pins.map((x) => (x.id !== id ? x : { ...x, ...patch, tags: patch.tags !== undefined ? tagsOf(patch.tags) : x.tags }));
            this.touch(s, p.boardId);
        });
    }

    async removePin(id: string): Promise<void> {
        const p = this.pin(id);
        const b = this.pinnable(p.boardId);
        if (!this.mine(p, b)) this.deny();
        this.write((s) => {
            s.pins = s.pins.filter((x) => x.id !== id);
            s.comments = s.comments.filter((c) => c.pinId !== id);
            s.boards = s.boards.map((x) => (x.coverPinId === id ? { ...x, coverPinId: null } : x));
            this.touch(s, p.boardId);
        });
    }

    async reorderPin(id: string, sectionId: string | null, toIndex: number): Promise<void> {
        const p = this.pin(id);
        this.pinnable(p.boardId);
        this.write((s) => {
            const list = s.pins.filter((x) => x.boardId === p.boardId && x.id !== id).sort((a, b) => a.order - b.order);
            const moved: Pin = { ...p, sectionId };
            const within = list.filter((x) => (x.sectionId ?? null) === sectionId);
            const at =
                within.length === 0
                    ? list.length
                    : toIndex >= within.length
                      ? list.findIndex((x) => x.id === within[within.length - 1].id) + 1
                      : list.findIndex((x) => x.id === within[Math.max(0, toIndex)].id);
            list.splice(Math.max(0, at), 0, moved);
            const order = new Map(list.map((x, i) => [x.id, i]));
            s.pins = s.pins.map((x) => (x.boardId !== p.boardId ? x : x.id === id ? { ...moved, order: order.get(id) ?? moved.order } : { ...x, order: order.get(x.id) ?? x.order }));
            this.touch(s, p.boardId);
        });
    }

    async movePin(id: string, toBoardId: string, toSectionId: string | null = null): Promise<void> {
        const p = this.pin(id);
        const from = this.pinnable(p.boardId);
        const to = this.pinnable(toBoardId);
        if (!this.mine(p, from)) this.deny();
        const order = pinsOf(this.all(), to.id).length;
        this.write((s) => {
            s.pins = s.pins.map((x) => (x.id === id ? { ...x, boardId: to.id, sectionId: toSectionId, order } : x));
            s.boards = s.boards.map((x) => (x.coverPinId === id && x.id === from.id ? { ...x, coverPinId: null } : x));
            this.touch(s, from.id);
            this.touch(s, to.id);
        });
    }

    async copyPin(id: string, toBoardId: string, toSectionId: string | null = null): Promise<Pin> {
        const p = this.pin(id);
        this.board(p.boardId);
        const to = this.pinnable(toBoardId);
        const order = pinsOf(this.all(), to.id).length;
        const row: Pin = { ...p, id: uid("pin"), boardId: to.id, sectionId: toSectionId, order, addedBy: this.ctx.me.id, copiedFromPinId: p.id, createdAt: now() };
        this.write((s) => {
            s.pins = [...s.pins, row];
            this.touch(s, to.id);
        });
        return row;
    }

    async recachePin(id: string): Promise<void> {
        const p = this.pin(id);
        const b = this.pinnable(p.boardId);
        if (!this.mine(p, b)) this.deny();
        if (!p.sourceUrl) throw new Error("This pin has no web address to fetch.");
        const cached = await cacheImage(p.sourceUrl, p.title);
        this.write((s) => {
            s.pins = s.pins.map((x) => (x.id === id ? { ...x, imageUrl: cached.dataUrl, cachedFrom: cached.kind, cachedAt: now() } : x));
        });
    }

    // -- comments ------------------------------------------------------------

    async comment(pinId: string, text: string, reaction: Reaction | null = null): Promise<PinComment> {
        const p = this.pin(pinId);
        // AC 2: commenting follows the same grant as pinning.
        this.pinnable(p.boardId);
        const body = clean(text);
        if (!body && !reaction) throw new Error("Say something, or pick a reaction.");
        const row: PinComment = { id: uid("pcm"), spaceId: this.ctx.space.id, pinId, memberId: this.ctx.me.id, text: body, reaction, at: now() };
        this.write((s) => {
            s.comments = [...s.comments, row];
            this.touch(s, p.boardId);
        });
        return row;
    }

    async removeComment(id: string): Promise<void> {
        const c = this.all().comments.find((x) => x.id === id);
        if (!c) return;
        if (this.ctx.role !== "parent" && c.memberId !== this.ctx.me.id) this.deny();
        this.write((s) => {
            s.comments = s.comments.filter((x) => x.id !== id);
        });
    }

    // -- the party checklist -------------------------------------------------

    async setChecklist(boardId: string, lines: NewChecklistLine[]): Promise<ChecklistItem[]> {
        const b = this.editable(boardId);
        const created = now();
        const rows: ChecklistItem[] = lines.map((line, i) => ({
            id: uid("chk"),
            spaceId: this.ctx.space.id,
            boardId: b.id,
            text: clean(line.text),
            note: clean(line.note),
            dueInDays: Math.max(0, Math.round(line.dueInDays ?? 0)),
            assigneeMemberId: line.assigneeMemberId ?? null,
            taskId: null,
            sentAt: null,
            origin: line.origin ?? "companion",
            order: i,
            createdAt: created,
        }));
        this.write((s) => {
            // Lines already sent to Tasks are kept: we never orphan a real task.
            const kept = s.checklist.filter((c) => c.boardId === b.id && c.taskId);
            s.checklist = [...s.checklist.filter((c) => c.boardId !== b.id), ...kept, ...rows.map((r, i) => ({ ...r, order: kept.length + i }))];
            this.touch(s, b.id);
        });
        return rows;
    }

    async toggleChecklistLine(id: string, assigneeMemberId: string | null): Promise<void> {
        const line = this.all().checklist.find((c) => c.id === id);
        if (!line) return;
        this.editable(line.boardId);
        this.write((s) => {
            s.checklist = s.checklist.map((c) => (c.id === id ? { ...c, assigneeMemberId } : c));
        });
    }

    async removeChecklistLine(id: string): Promise<void> {
        const line = this.all().checklist.find((c) => c.id === id);
        if (!line) return;
        this.editable(line.boardId);
        this.write((s) => {
            s.checklist = s.checklist.filter((c) => c.id !== id);
        });
    }

    async markChecklistSent(ids: string[], taskIds: Record<string, string>): Promise<void> {
        const at = now();
        this.write((s) => {
            s.checklist = s.checklist.map((c) => (ids.includes(c.id) ? { ...c, taskId: taskIds[c.id] ?? c.taskId ?? "sent", sentAt: at } : c));
        });
    }
}
