import type { AttentionItem, ChildCard, DashboardContribution, Member, Nudge, RepoContext } from "@/data/core";
import { money } from "@/lib/format";
import { namedColour } from "./library";
import type { Board, BoardSection, ChecklistItem, MoodboardsState, Pin, PinComment } from "./types";
import { EMPTY_STATE } from "./types";

/**
 * Every number and every permission this module shows, as pure functions of
 * state. Both repos run `visibleTo()` before anything reaches a screen, so
 * "what the demo shows" and "what RLS returns" are the same sentence written
 * twice.
 */

export const BASE = "/create/moodboards";

// ---------------------------------------------------------------------------
// Who may see what
// ---------------------------------------------------------------------------

/** Named on the board: an owner or a collaborator. */
export const isCollaborator = (b: Board, memberId: string): boolean => b.ownerMemberId === memberId || b.collaboratorIds.includes(memberId);

/**
 * May this member open the board?
 *
 *  parent — everything, including a child's board (that is what makes AC 4
 *           reviewable);
 *  guest  — only a board they were named on, and only when it was actually
 *           shared ("granted named objects, never modules");
 *  child  — their own boards, plus child-safe family boards, plus anything
 *           shared with them by name. Never a board that isn't child-safe,
 *           whatever its visibility says.
 */
export function canSeeBoard(b: Board, me: Member): boolean {
    if (me.role === "parent") return true;
    if (b.ownerMemberId === me.id) return true;
    if (me.role === "guest") return b.visibility === "shared" && isCollaborator(b, me.id);
    // child
    if (!b.childSafe) return false;
    if (b.visibility === "private") return false;
    if (b.visibility === "shared") return isCollaborator(b, me.id) || b.sharedWith.includes(me.id);
    return true; // family or child
}

/**
 * May this member add a pin or leave a comment here? (AC 2)
 *
 * Being named on the board is necessary; for a child or a guest it is not
 * sufficient — a parent must also have granted them `moodboards.manage` in
 * Family → People. Everyone else who can open the board is a reader.
 */
export function canPinTo(b: Board, ctx: RepoContext): boolean {
    if (b.archived) return false;
    if (!canSeeBoard(b, ctx.me)) return false;
    if (ctx.role === "parent") return true;
    if (b.ownerMemberId === ctx.me.id) return true;
    return isCollaborator(b, ctx.me.id) && ctx.can("moodboards.manage");
}

/** Renaming, sections, deleting: the owner and any parent. */
export function canEditBoard(b: Board, ctx: RepoContext): boolean {
    if (b.archived) return false;
    if (ctx.role === "parent") return true;
    return b.ownerMemberId === ctx.me.id && ctx.can("moodboards.manage");
}

/** A parent, or a young adult who has been granted the module, may start a board. */
export function canCreateBoard(ctx: RepoContext): boolean {
    if (ctx.role === "parent") return true;
    if (ctx.role === "guest") return false;
    return ctx.can("moodboards.manage");
}

/**
 * The slice this member may receive. A guest's slice is only their named
 * boards — no other board, no other pin, no comment from a conversation they
 * are not part of.
 */
export function visibleTo(state: MoodboardsState, ctx: RepoContext): MoodboardsState {
    const me = ctx.me;
    if (me.role === "parent") return state;

    const boards = state.boards.filter((b) => canSeeBoard(b, me));
    if (!boards.length) return EMPTY_STATE;
    const ids = new Set(boards.map((b) => b.id));
    const pins = state.pins.filter((p) => ids.has(p.boardId));
    const pinIds = new Set(pins.map((p) => p.id));

    return {
        boards,
        sections: state.sections.filter((s) => ids.has(s.boardId)),
        pins,
        comments: state.comments.filter((c) => pinIds.has(c.pinId)),
        // The party checklist is planning: parents and the board's owner only.
        checklist: state.checklist.filter((c) => {
            const b = boards.find((x) => x.id === c.boardId);
            return Boolean(b) && b!.ownerMemberId === me.id;
        }),
    };
}

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

export const boardById = (s: MoodboardsState, id: string): Board | undefined => s.boards.find((b) => b.id === id);
export const pinById = (s: MoodboardsState, id: string): Pin | undefined => s.pins.find((p) => p.id === id);

export const liveBoards = (s: MoodboardsState): Board[] => s.boards.filter((b) => !b.archived);

export const sectionsOf = (s: MoodboardsState, boardId: string): BoardSection[] => s.sections.filter((x) => x.boardId === boardId).sort((a, b) => a.order - b.order);

/** Pins on a board, in the order the family put them in. */
export const pinsOf = (s: MoodboardsState, boardId: string): Pin[] => s.pins.filter((p) => p.boardId === boardId).sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));

export const pinsInSection = (s: MoodboardsState, boardId: string, sectionId: string | null): Pin[] => pinsOf(s, boardId).filter((p) => (p.sectionId ?? null) === sectionId);

export const commentsOf = (s: MoodboardsState, pinId: string): PinComment[] => s.comments.filter((c) => c.pinId === pinId).sort((a, b) => a.at.localeCompare(b.at));

export const checklistOf = (s: MoodboardsState, boardId: string): ChecklistItem[] => s.checklist.filter((c) => c.boardId === boardId).sort((a, b) => a.order - b.order);

export const coverOf = (s: MoodboardsState, b: Board): string | null => {
    const pins = pinsOf(s, b.id);
    const chosen = b.coverPinId ? pins.find((p) => p.id === b.coverPinId) : undefined;
    return (chosen ?? pins[0])?.imageUrl ?? null;
};

/** The board's own tags plus every tag on its pins. */
export function tagsOfBoard(s: MoodboardsState, boardId: string): string[] {
    const set = new Set<string>();
    const b = boardById(s, boardId);
    b?.tags.forEach((t) => set.add(t));
    for (const p of pinsOf(s, boardId)) p.tags.forEach((t) => set.add(t));
    return [...set].sort();
}

/** Every tag across every board this member can see, with counts (AC 3). */
export function tagCounts(s: MoodboardsState): Array<{ tag: string; n: number }> {
    const counts = new Map<string, number>();
    for (const p of s.pins) for (const t of p.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    for (const b of s.boards) for (const t of b.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()].map(([tag, n]) => ({ tag, n })).sort((a, b) => b.n - a.n || a.tag.localeCompare(b.tag));
}

/** Every pin carrying a tag, across boards (AC 3). */
export const pinsWithTag = (s: MoodboardsState, tag: string): Pin[] => (tag ? s.pins.filter((p) => p.tags.includes(tag)) : []);

// ---------------------------------------------------------------------------
// Numbers
// ---------------------------------------------------------------------------

export interface BoardStats {
    pins: number;
    comments: number;
    sections: number;
    /** Pins whose cached copy is only a placeholder — worth another try. */
    placeholders: number;
    /** Sum of the prices people noted, in minor units. */
    totalCents: number;
    priced: number;
    lastPinAt: string | null;
    contributors: string[];
}

export function boardStats(s: MoodboardsState, boardId: string): BoardStats {
    const pins = pinsOf(s, boardId);
    const ids = new Set(pins.map((p) => p.id));
    const priced = pins.filter((p) => typeof p.priceCents === "number" && p.priceCents !== null);
    return {
        pins: pins.length,
        comments: s.comments.filter((c) => ids.has(c.pinId)).length,
        sections: sectionsOf(s, boardId).length,
        placeholders: pins.filter((p) => p.cachedFrom === "placeholder").length,
        totalCents: priced.reduce((n, p) => n + (p.priceCents ?? 0), 0),
        priced: priced.length,
        lastPinAt: pins.reduce<string | null>((latest, p) => (!latest || p.createdAt > latest ? p.createdAt : latest), null),
        contributors: [...new Set(pins.map((p) => p.addedBy))],
    };
}

export interface Swatch {
    hex: string;
    name: string;
    n: number;
}

/**
 * The palette the board already contains, before anyone asks the companion:
 * the swatches stored on its pins, most common first. This is what the palette
 * card falls back to when AI is unavailable.
 */
export function paletteOf(s: MoodboardsState, boardId: string, max = 6): Swatch[] {
    const counts = new Map<string, number>();
    for (const p of pinsOf(s, boardId)) {
        if (!p.colour) continue;
        const hex = p.colour.toLowerCase();
        counts.set(hex, (counts.get(hex) ?? 0) + 1);
    }
    return [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, max)
        .map(([hex, n]) => ({ hex, name: namedColour(hex), n }));
}

/** Child-owned boards a parent has not looked at yet (AC 4). */
export const unreviewedChildBoards = (s: MoodboardsState, ctx: RepoContext): Board[] => {
    const childIds = new Set(ctx.members.filter((m) => m.role === "child").map((m) => m.id));
    return s.boards.filter((b) => !b.archived && childIds.has(b.ownerMemberId) && !b.reviewedAt);
};

/** Party boards whose checklist has lines nobody has sent to Tasks yet. */
export const pendingChecklists = (s: MoodboardsState): Array<{ board: Board; open: number }> =>
    liveBoards(s)
        .map((board) => ({ board, open: checklistOf(s, board.id).filter((c) => !c.taskId).length }))
        .filter((x) => x.open > 0);

/** Boards this member may pin to, for the "add to…" pickers. */
export const boardsICanPinTo = (s: MoodboardsState, ctx: RepoContext): Board[] => liveBoards(s).filter((b) => canPinTo(b, ctx));

// ---------------------------------------------------------------------------
// Shared surfaces
// ---------------------------------------------------------------------------

/**
 * Moodboards is a place you go to, not a thing that shouts: it puts nothing on
 * the parent agenda. What it does contribute is one warm invitation on a
 * child's dashboard — "add something to the board you're allowed to pin to" —
 * and, for a parent, a quiet card when a child has started a board nobody has
 * looked at yet.
 */
export function dashboard(state: MoodboardsState, ctx: RepoContext): DashboardContribution {
    const childCards: ChildCard[] = [];
    const attention: AttentionItem[] = [];

    if (ctx.role === "child") {
        const mine = boardsICanPinTo(state, ctx).sort((a, b) => (a.ownerMemberId === ctx.me.id ? -1 : 0) - (b.ownerMemberId === ctx.me.id ? -1 : 0) || b.updatedAt.localeCompare(a.updatedAt));
        const board = mine[0];
        if (board) {
            const stats = boardStats(state, board.id);
            childCards.push({
                id: `pin-${board.id}`,
                moduleId: "moodboards",
                area: "create",
                title: `Add to ${board.title}`,
                body: stats.pins ? `${stats.pins} picture${stats.pins === 1 ? "" : "s"} so far. Pin the next one.` : "Nothing pinned yet — you could be first.",
                emoji: "📌",
                href: `${BASE}/${board.id}`,
            });
        }
    }

    if (ctx.role === "parent") {
        const waiting = unreviewedChildBoards(state, ctx);
        if (waiting.length) {
            const names = waiting
                .slice(0, 2)
                .map((b) => b.title)
                .join(" · ");
            attention.push({
                id: "child-boards",
                moduleId: "moodboards",
                area: "create",
                tone: "info",
                title: `${waiting.length} board${waiting.length === 1 ? "" : "s"} from the children to look at`,
                body: `${names}${waiting.length > 2 ? ` and ${waiting.length - 2} more` : ""}. A minute now, and you've seen what they're collecting.`,
                href: BASE,
                weight: 24,
            });
        }
    }

    return { childCards, attention };
}

export function nudges(state: MoodboardsState, ctx: RepoContext): Nudge[] {
    if (ctx.role !== "parent") return [];
    const out: Nudge[] = [];

    for (const b of unreviewedChildBoards(state, ctx)) {
        const owner = ctx.members.find((m) => m.id === b.ownerMemberId);
        out.push({
            key: `moodboards-review-${b.id}`,
            moduleId: "moodboards",
            kind: "family",
            title: `${owner?.name.split(" ")[0] ?? "One of the children"} started a board`,
            body: `"${b.title}" — have a look at what they're collecting.`,
            href: `${BASE}/${b.id}`,
            memberIds: [],
        });
    }

    for (const { board, open } of pendingChecklists(state)) {
        out.push({
            key: `moodboards-checklist-${board.id}-${open}`,
            moduleId: "moodboards",
            kind: "task",
            title: `${board.title} has a checklist waiting`,
            body: `${open} line${open === 1 ? "" : "s"} ready to become tasks.`,
            href: `${BASE}/${board.id}`,
            memberIds: [],
        });
    }

    return out;
}

export function aiContext(state: MoodboardsState, ctx: RepoContext): string {
    if (!state.boards.length) return "";
    const lines: string[] = [];
    for (const b of liveBoards(state).slice(0, 8)) {
        const stats = boardStats(state, b.id);
        const bits = [`"${b.title}" (${b.kind}, ${stats.pins} pin${stats.pins === 1 ? "" : "s"}`];
        const tags = tagsOfBoard(state, b.id).slice(0, 6);
        if (tags.length) bits.push(`, tags ${tags.join("/")}`);
        if (ctx.role === "parent" && stats.priced) bits.push(`, ${stats.priced} priced totalling ${money(stats.totalCents, ctx.space.currency)}`);
        bits.push(")");
        if (b.projectLabel) bits.push(` linked to the project ${b.projectLabel}.`);
        else if (b.tripLabel) bits.push(` linked to the trip ${b.tripLabel}.`);
        lines.push(bits.join(""));
    }
    const palette = liveBoards(state)
        .slice(0, 2)
        .map((b) => {
            const sw = paletteOf(state, b.id, 4);
            return sw.length ? `${b.title} reads as ${sw.map((x) => x.name.toLowerCase()).join(", ")}` : "";
        })
        .filter(Boolean);
    if (palette.length) lines.push(`Colours: ${palette.join("; ")}.`);
    return lines.join(" ").slice(0, 1500);
}

export function search(state: MoodboardsState, q: string): Array<{ title: string; meta: string; href: string }> {
    const needle = q.toLowerCase();
    const hits: Array<{ title: string; meta: string; href: string }> = [];
    for (const b of state.boards) {
        if (`${b.title} ${b.description} ${b.tags.join(" ")}`.toLowerCase().includes(needle)) {
            hits.push({ title: b.title, meta: `Board · ${b.kind}`, href: `${BASE}/${b.id}` });
        }
    }
    for (const p of state.pins) {
        if (`${p.title} ${p.note} ${p.tags.join(" ")}`.toLowerCase().includes(needle)) {
            const b = boardById(state, p.boardId);
            hits.push({ title: p.title || "Pin", meta: `Pin · ${b?.title ?? "a board"}`, href: `${BASE}/${p.boardId}/pins/${p.id}` });
        }
    }
    return hits.slice(0, 8);
}
