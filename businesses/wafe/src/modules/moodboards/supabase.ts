import type { RepoContext, Visibility } from "@/data/core";
import { supabase } from "@/lib/supabase";
import { canCreateBoard, canEditBoard, canPinTo, canSeeBoard, visibleTo } from "./derive";
import { cacheImage } from "./images";
import type {
    Board,
    BoardKind,
    BoardPatch,
    BoardSection,
    CacheKind,
    ChecklistItem,
    MoodboardsRepo,
    MoodboardsState,
    NewBoard,
    NewChecklistLine,
    NewPin,
    Pin,
    PinComment,
    PinPatch,
    PinSource,
    Reaction,
} from "./types";

/**
 * The same boards, live, under row-level security.
 *
 * The database is the real guard — `wf_moodboard_can_see` decides what a
 * select returns, and the write policies require a collaborator row — but the
 * slice is still run through the same `visibleTo()` the demo uses, so the two
 * modes cannot drift. snake_case ↔ camelCase mapping lives in this file and
 * nowhere else, and no query here touches another module's tables.
 *
 * Pictures: a pin from the web is fetched and the bytes are uploaded to the
 * public `catalog` bucket at `wafe/<spaceId>/moodboards/…`, and the row stores
 * OUR url. If the fetch or the upload fails we keep the typographic card the
 * cache produced — the pin is never a hot-link and never a broken image.
 */

type Row = Record<string, unknown>;

const s = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);
const n = (v: unknown, d = 0): number => (typeof v === "number" ? v : Number(v ?? d) || d);
const iso = (v: unknown): string => (v ? new Date(v as string).toISOString() : new Date().toISOString());
const nul = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const vis = (v: unknown): Visibility => (v === "private" || v === "shared" || v === "child" ? v : "family");
const cacheKind = (v: unknown): CacheKind => (v === "fetched" || v === "placeholder" || v === "upload" ? v : "library");
const pinSource = (v: unknown): PinSource => (v === "url" || v === "upload" ? v : "library");

function fail(where: string, error: { message: string } | null | undefined): void {
    if (error) throw new Error(`${where}: ${error.message}`);
}

const clean = (v: string | undefined | null, d = ""): string => (v ?? d).trim();
const tagsOf = (v: string[] | undefined): string[] => [...new Set((v ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean))];

const mapBoard = (r: Row, collaborators: string[]): Board => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    title: s(r.title),
    description: s(r.description),
    kind: s(r.kind, "ideas") as BoardKind,
    template: nul(r.template),
    ownerMemberId: s(r.owner_member_id),
    collaboratorIds: collaborators,
    visibility: vis(r.visibility),
    sharedWith: strs(r.shared_with),
    childSafe: r.child_safe === true,
    tags: strs(r.tags),
    coverPinId: nul(r.cover_pin_id),
    projectId: nul(r.project_id),
    projectLabel: s(r.project_label),
    tripId: nul(r.trip_id),
    tripLabel: s(r.trip_label),
    reviewedAt: nul(r.reviewed_at) ? iso(r.reviewed_at) : null,
    reviewedBy: nul(r.reviewed_by),
    archived: r.archived === true,
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at ?? r.created_at),
});

const mapSection = (r: Row): BoardSection => ({ id: s(r.id), spaceId: s(r.space_id), boardId: s(r.board_id), title: s(r.title), order: n(r.section_order) });

const mapPin = (r: Row): Pin => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    boardId: s(r.board_id),
    sectionId: nul(r.section_id),
    title: s(r.title),
    note: s(r.note),
    source: pinSource(r.source),
    sourceUrl: nul(r.source_url),
    imageUrl: s(r.image_url),
    cachedFrom: cacheKind(r.cached_from),
    cachedAt: iso(r.cached_at ?? r.created_at),
    tags: strs(r.tags),
    priceCents: r.price_cents === null || r.price_cents === undefined ? null : n(r.price_cents),
    colour: nul(r.colour),
    order: n(r.pin_order),
    addedBy: s(r.added_by),
    copiedFromPinId: nul(r.copied_from_pin_id),
    createdAt: iso(r.created_at),
});

const mapComment = (r: Row): PinComment => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    pinId: s(r.pin_id),
    memberId: s(r.member_id),
    text: s(r.text),
    reaction: (nul(r.reaction) as Reaction | null) ?? null,
    at: iso(r.created_at),
});

const mapChecklist = (r: Row): ChecklistItem => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    boardId: s(r.board_id),
    text: s(r.text),
    note: s(r.note),
    dueInDays: n(r.due_in_days),
    assigneeMemberId: nul(r.assignee_member_id),
    taskId: nul(r.task_id),
    sentAt: nul(r.sent_at) ? iso(r.sent_at) : null,
    origin: s(r.origin, "companion") === "template" ? "template" : "companion",
    order: n(r.line_order),
    createdAt: iso(r.created_at),
});

/** Where a board's pictures live in the public bucket. */
const BUCKET = "catalog";

export class SupabaseMoodboardsRepo implements MoodboardsRepo {
    constructor(private ctx: RepoContext) {}

    private get base() {
        return { organization_id: this.ctx.orgId, space_id: this.ctx.space.id };
    }

    private deny(): never {
        throw new Error("Not allowed");
    }

    async load(): Promise<MoodboardsState> {
        const spaceId = this.ctx.space.id;
        const [boards, collab, sections, pins, comments, checklist] = await Promise.all([
            supabase.from("wf_moodboards").select("*").eq("space_id", spaceId),
            supabase.from("wf_moodboard_collaborators").select("*").eq("space_id", spaceId),
            supabase.from("wf_moodboard_sections").select("*").eq("space_id", spaceId),
            supabase.from("wf_moodboard_pins").select("*").eq("space_id", spaceId),
            supabase.from("wf_moodboard_comments").select("*").eq("space_id", spaceId),
            supabase.from("wf_moodboard_checklist").select("*").eq("space_id", spaceId),
        ]);
        fail("boards", boards.error);
        fail("collaborators", collab.error);
        fail("sections", sections.error);
        fail("pins", pins.error);
        fail("comments", comments.error);
        fail("checklist", checklist.error);

        const byBoard = new Map<string, string[]>();
        for (const raw of (collab.data ?? []) as Row[]) {
            const id = s(raw.board_id);
            byBoard.set(id, [...(byBoard.get(id) ?? []), s(raw.member_id)]);
        }

        const state: MoodboardsState = {
            boards: ((boards.data ?? []) as Row[]).map((r) => mapBoard(r, byBoard.get(s(r.id)) ?? [])),
            sections: ((sections.data ?? []) as Row[]).map(mapSection),
            pins: ((pins.data ?? []) as Row[]).map(mapPin),
            comments: ((comments.data ?? []) as Row[]).map(mapComment),
            checklist: ((checklist.data ?? []) as Row[]).map(mapChecklist),
        };
        return visibleTo(state, this.ctx);
    }

    // -- guards --------------------------------------------------------------

    private async boardRow(id: string): Promise<Board> {
        const { data, error } = await supabase.from("wf_moodboards").select("*").eq("id", id).maybeSingle();
        fail("board", error);
        if (!data) throw new Error("That board is gone.");
        const { data: collab } = await supabase.from("wf_moodboard_collaborators").select("member_id").eq("board_id", id);
        const board = mapBoard(data as Row, ((collab ?? []) as Row[]).map((r) => s(r.member_id)));
        if (!canSeeBoard(board, this.ctx.me)) this.deny();
        return board;
    }

    private async editable(id: string): Promise<Board> {
        const b = await this.boardRow(id);
        if (!canEditBoard(b, this.ctx)) this.deny();
        return b;
    }

    private async pinnable(id: string): Promise<Board> {
        const b = await this.boardRow(id);
        if (!canPinTo(b, this.ctx)) this.deny();
        return b;
    }

    private async pinRow(id: string): Promise<Pin> {
        const { data, error } = await supabase.from("wf_moodboard_pins").select("*").eq("id", id).maybeSingle();
        fail("pin", error);
        if (!data) throw new Error("That pin is gone.");
        return mapPin(data as Row);
    }

    private mine(p: Pin, b: Board): boolean {
        return this.ctx.role === "parent" || p.addedBy === this.ctx.me.id || b.ownerMemberId === this.ctx.me.id;
    }

    private async nextPinOrder(boardId: string): Promise<number> {
        const { count } = await supabase.from("wf_moodboard_pins").select("id", { count: "exact", head: true }).eq("board_id", boardId);
        return count ?? 0;
    }

    private async touch(boardId: string): Promise<void> {
        await supabase.from("wf_moodboards").update({ updated_at: new Date().toISOString() }).eq("id", boardId);
    }

    /**
     * Turn whatever the screen handed us into a URL WE serve: fetch it (or take
     * the uploaded data URL), then push the bytes to the public bucket. A
     * failure anywhere leaves the cached data URL on the row, which still
     * renders and is still ours.
     */
    private async store(dataUrl: string, kind: CacheKind): Promise<{ url: string; kind: CacheKind }> {
        if (!dataUrl.startsWith("data:image/") || dataUrl.startsWith("data:image/svg")) return { url: dataUrl, kind };
        try {
            const res = await fetch(dataUrl);
            const blob = await res.blob();
            const ext = blob.type.split("/")[1]?.split("+")[0] || "jpg";
            const path = `wafe/${this.ctx.space.id}/moodboards/${crypto.randomUUID()}.${ext}`;
            const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: blob.type, upsert: false });
            if (error) return { url: dataUrl, kind };
            const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
            return { url: data.publicUrl || dataUrl, kind };
        } catch {
            return { url: dataUrl, kind };
        }
    }

    // -- boards --------------------------------------------------------------

    async createBoard(input: NewBoard): Promise<Board> {
        if (!canCreateBoard(this.ctx)) this.deny();
        const child = this.ctx.role === "child";
        const owner = this.ctx.role === "parent" ? (input.ownerMemberId ?? this.ctx.me.id) : this.ctx.me.id;
        const visibility = child && input.visibility === "private" ? "family" : (input.visibility ?? "family");
        const { data, error } = await supabase
            .from("wf_moodboards")
            .insert({
                ...this.base,
                title: clean(input.title) || "Untitled board",
                description: clean(input.description),
                kind: input.kind ?? "ideas",
                template: input.template ?? null,
                owner_member_id: owner,
                visibility,
                shared_with: input.sharedWith ?? [],
                child_safe: child ? true : (input.childSafe ?? true),
                tags: tagsOf(input.tags),
                project_id: input.projectId ?? null,
                project_label: clean(input.projectLabel),
                trip_id: input.tripId ?? null,
                trip_label: clean(input.tripLabel),
            })
            .select()
            .single();
        fail("create board", error);
        const board = mapBoard(data as Row, []);
        const ids = [...new Set(input.collaboratorIds ?? [])].filter((id) => id !== owner);
        if (ids.length) {
            const { error: cErr } = await supabase.from("wf_moodboard_collaborators").insert(ids.map((memberId) => ({ ...this.base, board_id: board.id, member_id: memberId })));
            fail("collaborators", cErr);
        }
        const titles = (input.sections ?? []).map((t) => clean(t)).filter(Boolean);
        if (titles.length) {
            const { error: sErr } = await supabase.from("wf_moodboard_sections").insert(titles.map((title, i) => ({ ...this.base, board_id: board.id, title, section_order: i })));
            fail("sections", sErr);
        }
        return { ...board, collaboratorIds: ids };
    }

    async updateBoard(id: string, patch: BoardPatch): Promise<void> {
        const b = await this.editable(id);
        const child = this.ctx.role === "child";
        const row: Row = { updated_at: new Date().toISOString() };
        if (patch.title !== undefined) row.title = clean(patch.title) || b.title;
        if (patch.description !== undefined) row.description = clean(patch.description);
        if (patch.kind !== undefined) row.kind = patch.kind;
        if (patch.visibility !== undefined && !(child && patch.visibility === "private")) row.visibility = patch.visibility;
        if (patch.sharedWith !== undefined) row.shared_with = patch.sharedWith;
        if (patch.childSafe !== undefined) row.child_safe = child ? true : patch.childSafe;
        if (patch.tags !== undefined) row.tags = tagsOf(patch.tags);
        if (patch.coverPinId !== undefined) row.cover_pin_id = patch.coverPinId;
        if (patch.projectId !== undefined) row.project_id = patch.projectId;
        if (patch.projectLabel !== undefined) row.project_label = patch.projectLabel;
        if (patch.tripId !== undefined) row.trip_id = patch.tripId;
        if (patch.tripLabel !== undefined) row.trip_label = patch.tripLabel;
        if (patch.archived !== undefined) row.archived = patch.archived;
        const { error } = await supabase.from("wf_moodboards").update(row).eq("id", id);
        fail("update board", error);

        if (patch.collaboratorIds !== undefined) {
            const wanted = [...new Set(patch.collaboratorIds)].filter((m) => m !== b.ownerMemberId);
            const { error: dErr } = await supabase.from("wf_moodboard_collaborators").delete().eq("board_id", id);
            fail("collaborators", dErr);
            if (wanted.length) {
                const { error: iErr } = await supabase.from("wf_moodboard_collaborators").insert(wanted.map((memberId) => ({ ...this.base, board_id: id, member_id: memberId })));
                fail("collaborators", iErr);
            }
        }
    }

    async removeBoard(id: string): Promise<void> {
        await this.editable(id);
        const { error } = await supabase.from("wf_moodboards").delete().eq("id", id);
        fail("delete board", error);
    }

    async reviewBoard(id: string): Promise<void> {
        if (this.ctx.role !== "parent") this.deny();
        await this.boardRow(id);
        const { error } = await supabase.from("wf_moodboards").update({ reviewed_at: new Date().toISOString(), reviewed_by: this.ctx.me.id }).eq("id", id);
        fail("review board", error);
    }

    // -- sections ------------------------------------------------------------

    async addSection(boardId: string, title: string): Promise<BoardSection> {
        await this.editable(boardId);
        const { count } = await supabase.from("wf_moodboard_sections").select("id", { count: "exact", head: true }).eq("board_id", boardId);
        const { data, error } = await supabase
            .from("wf_moodboard_sections")
            .insert({ ...this.base, board_id: boardId, title: clean(title) || "Untitled section", section_order: count ?? 0 })
            .select()
            .single();
        fail("add section", error);
        return mapSection(data as Row);
    }

    async renameSection(id: string, title: string): Promise<void> {
        const { data } = await supabase.from("wf_moodboard_sections").select("board_id").eq("id", id).maybeSingle();
        if (!data) return;
        await this.editable(s((data as Row).board_id));
        const { error } = await supabase.from("wf_moodboard_sections").update({ title: clean(title) || "Untitled section" }).eq("id", id);
        fail("rename section", error);
    }

    async removeSection(id: string): Promise<void> {
        const { data } = await supabase.from("wf_moodboard_sections").select("board_id").eq("id", id).maybeSingle();
        if (!data) return;
        const boardId = s((data as Row).board_id);
        await this.editable(boardId);
        const { error: pErr } = await supabase.from("wf_moodboard_pins").update({ section_id: null }).eq("section_id", id);
        fail("clear section", pErr);
        const { error } = await supabase.from("wf_moodboard_sections").delete().eq("id", id);
        fail("remove section", error);
        const { data: rest } = await supabase.from("wf_moodboard_sections").select("id").eq("board_id", boardId).order("section_order");
        for (const [i, r] of ((rest ?? []) as Row[]).entries()) await supabase.from("wf_moodboard_sections").update({ section_order: i }).eq("id", s(r.id));
    }

    async moveSection(id: string, direction: -1 | 1): Promise<void> {
        const { data } = await supabase.from("wf_moodboard_sections").select("*").eq("id", id).maybeSingle();
        if (!data) return;
        const sec = mapSection(data as Row);
        await this.editable(sec.boardId);
        const { data: all } = await supabase.from("wf_moodboard_sections").select("*").eq("board_id", sec.boardId).order("section_order");
        const list = ((all ?? []) as Row[]).map(mapSection);
        const i = list.findIndex((x) => x.id === id);
        const j = i + direction;
        if (i < 0 || j < 0 || j >= list.length) return;
        [list[i], list[j]] = [list[j], list[i]];
        for (const [k, x] of list.entries()) await supabase.from("wf_moodboard_sections").update({ section_order: k }).eq("id", x.id);
    }

    // -- pins ----------------------------------------------------------------

    async addPin(input: NewPin): Promise<Pin> {
        const b = await this.pinnable(input.boardId);
        const title = clean(input.title) || "Pinned";
        let imageUrl = clean(input.imageUrl);
        let kind: CacheKind = input.source === "upload" ? "upload" : "library";
        if (input.source === "url") {
            const cached = await cacheImage(clean(input.sourceUrl), title);
            imageUrl = cached.dataUrl;
            kind = cached.kind;
        }
        if (!imageUrl) throw new Error("A pin needs a picture.");
        const stored = await this.store(imageUrl, kind);
        const { data, error } = await supabase
            .from("wf_moodboard_pins")
            .insert({
                ...this.base,
                board_id: b.id,
                section_id: input.sectionId ?? null,
                title,
                note: clean(input.note),
                source: input.source,
                source_url: clean(input.sourceUrl) || null,
                image_url: stored.url,
                cached_from: stored.kind,
                cached_at: new Date().toISOString(),
                tags: tagsOf(input.tags),
                price_cents: input.priceCents ?? null,
                colour: input.colour ?? null,
                pin_order: await this.nextPinOrder(b.id),
                added_by: this.ctx.me.id,
            })
            .select()
            .single();
        fail("add pin", error);
        await this.touch(b.id);
        return mapPin(data as Row);
    }

    async updatePin(id: string, patch: PinPatch): Promise<void> {
        const p = await this.pinRow(id);
        const b = await this.pinnable(p.boardId);
        if (!this.mine(p, b)) this.deny();
        const row: Row = {};
        if (patch.title !== undefined) row.title = patch.title;
        if (patch.note !== undefined) row.note = patch.note;
        if (patch.tags !== undefined) row.tags = tagsOf(patch.tags);
        if (patch.priceCents !== undefined) row.price_cents = patch.priceCents;
        if (patch.colour !== undefined) row.colour = patch.colour;
        if (patch.sectionId !== undefined) row.section_id = patch.sectionId;
        const { error } = await supabase.from("wf_moodboard_pins").update(row).eq("id", id);
        fail("update pin", error);
        await this.touch(p.boardId);
    }

    async removePin(id: string): Promise<void> {
        const p = await this.pinRow(id);
        const b = await this.pinnable(p.boardId);
        if (!this.mine(p, b)) this.deny();
        const { error } = await supabase.from("wf_moodboard_pins").delete().eq("id", id);
        fail("remove pin", error);
        await supabase.from("wf_moodboards").update({ cover_pin_id: null }).eq("cover_pin_id", id);
        await this.touch(p.boardId);
    }

    async reorderPin(id: string, sectionId: string | null, toIndex: number): Promise<void> {
        const p = await this.pinRow(id);
        await this.pinnable(p.boardId);
        const { data } = await supabase.from("wf_moodboard_pins").select("*").eq("board_id", p.boardId).order("pin_order");
        const list = ((data ?? []) as Row[]).map(mapPin).filter((x) => x.id !== id);
        const moved: Pin = { ...p, sectionId };
        const within = list.filter((x) => (x.sectionId ?? null) === sectionId);
        const at =
            within.length === 0
                ? list.length
                : toIndex >= within.length
                  ? list.findIndex((x) => x.id === within[within.length - 1].id) + 1
                  : list.findIndex((x) => x.id === within[Math.max(0, toIndex)].id);
        list.splice(Math.max(0, at), 0, moved);
        for (const [i, x] of list.entries()) {
            const patch: Row = { pin_order: i };
            if (x.id === id) patch.section_id = sectionId;
            await supabase.from("wf_moodboard_pins").update(patch).eq("id", x.id);
        }
        await this.touch(p.boardId);
    }

    async movePin(id: string, toBoardId: string, toSectionId: string | null = null): Promise<void> {
        const p = await this.pinRow(id);
        const from = await this.pinnable(p.boardId);
        await this.pinnable(toBoardId);
        if (!this.mine(p, from)) this.deny();
        const { error } = await supabase
            .from("wf_moodboard_pins")
            .update({ board_id: toBoardId, section_id: toSectionId, pin_order: await this.nextPinOrder(toBoardId) })
            .eq("id", id);
        fail("move pin", error);
        await supabase.from("wf_moodboards").update({ cover_pin_id: null }).eq("id", from.id).eq("cover_pin_id", id);
        await this.touch(from.id);
        await this.touch(toBoardId);
    }

    async copyPin(id: string, toBoardId: string, toSectionId: string | null = null): Promise<Pin> {
        const p = await this.pinRow(id);
        await this.boardRow(p.boardId);
        await this.pinnable(toBoardId);
        const { data, error } = await supabase
            .from("wf_moodboard_pins")
            .insert({
                ...this.base,
                board_id: toBoardId,
                section_id: toSectionId,
                title: p.title,
                note: p.note,
                source: p.source,
                source_url: p.sourceUrl,
                image_url: p.imageUrl,
                cached_from: p.cachedFrom,
                cached_at: p.cachedAt,
                tags: p.tags,
                price_cents: p.priceCents,
                colour: p.colour,
                pin_order: await this.nextPinOrder(toBoardId),
                added_by: this.ctx.me.id,
                copied_from_pin_id: p.id,
            })
            .select()
            .single();
        fail("copy pin", error);
        await this.touch(toBoardId);
        return mapPin(data as Row);
    }

    async recachePin(id: string): Promise<void> {
        const p = await this.pinRow(id);
        const b = await this.pinnable(p.boardId);
        if (!this.mine(p, b)) this.deny();
        if (!p.sourceUrl) throw new Error("This pin has no web address to fetch.");
        const cached = await cacheImage(p.sourceUrl, p.title);
        const stored = await this.store(cached.dataUrl, cached.kind);
        const { error } = await supabase.from("wf_moodboard_pins").update({ image_url: stored.url, cached_from: stored.kind, cached_at: new Date().toISOString() }).eq("id", id);
        fail("recache pin", error);
    }

    // -- comments ------------------------------------------------------------

    async comment(pinId: string, text: string, reaction: Reaction | null = null): Promise<PinComment> {
        const p = await this.pinRow(pinId);
        await this.pinnable(p.boardId);
        const body = clean(text);
        if (!body && !reaction) throw new Error("Say something, or pick a reaction.");
        const { data, error } = await supabase
            .from("wf_moodboard_comments")
            .insert({ ...this.base, pin_id: pinId, member_id: this.ctx.me.id, text: body, reaction })
            .select()
            .single();
        fail("comment", error);
        await this.touch(p.boardId);
        return mapComment(data as Row);
    }

    async removeComment(id: string): Promise<void> {
        const { error } = await supabase.from("wf_moodboard_comments").delete().eq("id", id);
        fail("remove comment", error);
    }

    // -- the party checklist -------------------------------------------------

    async setChecklist(boardId: string, lines: NewChecklistLine[]): Promise<ChecklistItem[]> {
        await this.editable(boardId);
        const { error: dErr } = await supabase.from("wf_moodboard_checklist").delete().eq("board_id", boardId).is("task_id", null);
        fail("clear checklist", dErr);
        const { count } = await supabase.from("wf_moodboard_checklist").select("id", { count: "exact", head: true }).eq("board_id", boardId);
        const offset = count ?? 0;
        const { data, error } = await supabase
            .from("wf_moodboard_checklist")
            .insert(
                lines.map((line, i) => ({
                    ...this.base,
                    board_id: boardId,
                    text: clean(line.text),
                    note: clean(line.note),
                    due_in_days: Math.max(0, Math.round(line.dueInDays ?? 0)),
                    assignee_member_id: line.assigneeMemberId ?? null,
                    origin: line.origin ?? "companion",
                    line_order: offset + i,
                })),
            )
            .select();
        fail("save checklist", error);
        return ((data ?? []) as Row[]).map(mapChecklist);
    }

    async toggleChecklistLine(id: string, assigneeMemberId: string | null): Promise<void> {
        const { error } = await supabase.from("wf_moodboard_checklist").update({ assignee_member_id: assigneeMemberId }).eq("id", id);
        fail("assign checklist line", error);
    }

    async removeChecklistLine(id: string): Promise<void> {
        const { error } = await supabase.from("wf_moodboard_checklist").delete().eq("id", id);
        fail("remove checklist line", error);
    }

    async markChecklistSent(ids: string[], taskIds: Record<string, string>): Promise<void> {
        const at = new Date().toISOString();
        for (const id of ids) {
            const { error } = await supabase.from("wf_moodboard_checklist").update({ task_id: taskIds[id] ?? "sent", sent_at: at }).eq("id", id);
            fail("mark checklist sent", error);
        }
    }
}
