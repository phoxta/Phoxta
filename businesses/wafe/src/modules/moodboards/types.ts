import type { ModuleRepo, Visibility } from "@/data/core";

/**
 * Moodboards & inspiration — where the family keeps the pictures of the life
 * it is trying to build.
 *
 * A BOARD is a named collection with an owner, a handful of collaborators, a
 * visibility and (usually) a link to the piece of work it serves: the kitchen
 * project, the Lagos trip, a birthday. A PIN is one image on a board with a
 * note, tags, a source and sometimes a price. SECTIONS group pins inside a
 * board; COMMENTS are the short back-and-forth that happens under a pin when
 * two people are choosing between two worktops.
 *
 * Four rules this module is built on, and every one of them is enforced in
 * `derive.ts` (read) and in both repos (write), never only in a screen:
 *
 *  1. WE NEVER HOT-LINK. A pin added from the web keeps `sourceUrl` for
 *     credit, but what the app renders is `imageUrl` — our own cached copy,
 *     stored with the row. If the page it came from disappears, or blocks us,
 *     the board still reads. `cachedFrom` says honestly how that copy was
 *     made, and the pin shows it.
 *  2. A GUEST IS A NAMED-OBJECT VISITOR. Guests hold no moodboards capability
 *     by default: the module does not appear for them at all. A parent widens
 *     it deliberately, per person, in Family → People ("Pin to moodboards"),
 *     and even then a guest receives only the boards they were named on — no
 *     tag search, no other board, nothing else in the space. Read-only is the
 *     default and stays the default until a parent says otherwise on a named
 *     board.
 *  3. A CHILD'S BOARD IS CHILD-SAFE BY CONSTRUCTION. A child cannot create a
 *     board that isn't `childSafe`, cannot make one private from their
 *     parents, and every child-owned board carries a review stamp so a parent
 *     can see, at a glance, which ones they have actually looked at.
 *  4. NO THIRD-PARTY IMAGE SEARCH. The brief's engineering list mentions
 *     "search" as a pin source; we implement it as a search of the family's
 *     OWN library (their memories, their studio work, every pin already on a
 *     board they can see, and the small curated starter set that ships with
 *     the app). A web image search would mean fetching and rendering from an
 *     origin we do not control, which the app's content-security policy does
 *     not allow and which would put un-vetted pictures in front of a
 *     five-year-old. Paste a URL and we cache it; that is the deliberate
 *     replacement, not an omission. See `library.ts`.
 */

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

/** What a board is for. Drives the template, the icon and the party tools. */
export type BoardKind = "interior" | "party" | "holiday" | "style" | "garden" | "ideas" | "school-project";

export const BOARD_KINDS: BoardKind[] = ["interior", "party", "holiday", "style", "garden", "ideas", "school-project"];

export const KIND_LABEL: Record<BoardKind, string> = {
    interior: "Interior",
    party: "Party",
    holiday: "Holiday",
    style: "Style",
    garden: "Garden",
    ideas: "Ideas",
    "school-project": "School project",
};

export const KIND_EMOJI: Record<BoardKind, string> = {
    interior: "🪟",
    party: "🎈",
    holiday: "🌴",
    style: "👗",
    garden: "🌿",
    ideas: "💡",
    "school-project": "🔬",
};

/** Where a pin's picture came from. */
export type PinSource = "url" | "upload" | "library";

export const SOURCE_LABEL: Record<PinSource, string> = {
    url: "From the web",
    upload: "Uploaded",
    library: "From our library",
};

/**
 * How the copy we render was made — always shown on the pin, because a
 * snapshot presented without saying how it was captured is a small lie.
 */
export type CacheKind = "fetched" | "placeholder" | "upload" | "library";

export const CACHE_LABEL: Record<CacheKind, string> = {
    fetched: "Cached copy saved",
    placeholder: "Cached card (the image would not travel)",
    upload: "Stored with the board",
    library: "From our own library",
};

/** A one-tap response under a pin. Kind, small, and never a score. */
export type Reaction = "love" | "yes" | "maybe" | "no";

export const REACTION_EMOJI: Record<Reaction, string> = { love: "❤️", yes: "👍", maybe: "🤔", no: "🙅" };
export const REACTION_LABEL: Record<Reaction, string> = { love: "Love it", yes: "Yes", maybe: "Not sure", no: "Not this one" };
export const REACTIONS: Reaction[] = ["love", "yes", "maybe", "no"];

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

export interface Board {
    id: string;
    spaceId: string;
    title: string;
    description: string;
    kind: BoardKind;
    /** The template this board was started from, for the record. */
    template: string | null;
    ownerMemberId: string;
    /**
     * People who may pin and comment here — the "granted collaborators" of the
     * spec. A collaborator still needs `moodboards.manage` if they are a child
     * or a guest: being named is necessary, not sufficient.
     */
    collaboratorIds: string[];
    visibility: Visibility;
    sharedWith: string[];
    childSafe: boolean;
    tags: string[];
    /** The pin whose picture is the cover; falls back to the newest pin. */
    coverPinId: string | null;

    /** Links out. Ids belong to other modules; labels are kept so the card
     *  still reads if that module is not loaded. */
    projectId: string | null;
    projectLabel: string;
    tripId: string | null;
    tripLabel: string;

    /** A parent looked at this child-owned board on this date (AC 4). */
    reviewedAt: string | null;
    reviewedBy: string | null;

    archived: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface BoardSection {
    id: string;
    spaceId: string;
    boardId: string;
    title: string;
    order: number;
}

export interface Pin {
    id: string;
    spaceId: string;
    boardId: string;
    sectionId: string | null;
    title: string;
    note: string;
    source: PinSource;
    /** The page it came from, for credit and for "open the original". */
    sourceUrl: string | null;
    /** What we render: our own copy, always. Never the remote URL. */
    imageUrl: string;
    cachedFrom: CacheKind;
    cachedAt: string;
    tags: string[];
    /** Minor units in the space currency, when the thing has a price. */
    priceCents: number | null;
    /** A hex swatch pulled off the pin, for the palette. */
    colour: string | null;
    order: number;
    addedBy: string;
    /** Set when this pin was copied from another one. */
    copiedFromPinId: string | null;
    createdAt: string;
}

export interface PinComment {
    id: string;
    spaceId: string;
    pinId: string;
    memberId: string;
    text: string;
    reaction: Reaction | null;
    at: string;
}

/**
 * A party board's checklist. It lives here because the board is where it is
 * decided; each line can then become a real Task, and remembers which one, so
 * the board can say "already sent" rather than sending twice.
 */
export interface ChecklistItem {
    id: string;
    spaceId: string;
    boardId: string;
    text: string;
    note: string;
    /** Days from the day it was generated; the Task gets a real date. */
    dueInDays: number;
    assigneeMemberId: string | null;
    /** The Task this line became, once a parent sent it across. */
    taskId: string | null;
    sentAt: string | null;
    origin: "template" | "companion";
    order: number;
    createdAt: string;
}

export interface MoodboardsState {
    boards: Board[];
    sections: BoardSection[];
    pins: Pin[];
    comments: PinComment[];
    checklist: ChecklistItem[];
}

export const EMPTY_STATE: MoodboardsState = { boards: [], sections: [], pins: [], comments: [], checklist: [] };

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export interface NewBoard {
    title: string;
    description?: string;
    kind?: BoardKind;
    template?: string | null;
    ownerMemberId?: string;
    collaboratorIds?: string[];
    visibility?: Visibility;
    sharedWith?: string[];
    childSafe?: boolean;
    tags?: string[];
    projectId?: string | null;
    projectLabel?: string;
    tripId?: string | null;
    tripLabel?: string;
    /** Section titles to create with the board (the templates use this). */
    sections?: string[];
}

/**
 * What a screen hands the repo for a new pin. The repo does the caching — a
 * page never stores a remote URL as the thing to render.
 */
export interface NewPin {
    boardId: string;
    sectionId?: string | null;
    title?: string;
    note?: string;
    tags?: string[];
    priceCents?: number | null;
    colour?: string | null;
    source: PinSource;
    /** `url`: the web address to cache. `upload`/`library`: already an image. */
    sourceUrl?: string | null;
    /** For `upload` (a data URL) and `library` (a path we already serve). */
    imageUrl?: string;
}

export type PinPatch = Partial<Pick<Pin, "title" | "note" | "tags" | "priceCents" | "colour" | "sectionId">>;

export type BoardPatch = Partial<
    Pick<
        Board,
        | "title"
        | "description"
        | "kind"
        | "collaboratorIds"
        | "visibility"
        | "sharedWith"
        | "childSafe"
        | "tags"
        | "coverPinId"
        | "projectId"
        | "projectLabel"
        | "tripId"
        | "tripLabel"
        | "archived"
    >
>;

export interface NewChecklistLine {
    text: string;
    note?: string;
    dueInDays?: number;
    assigneeMemberId?: string | null;
    origin?: ChecklistItem["origin"];
}

export interface MoodboardsRepo extends ModuleRepo<MoodboardsState> {
    createBoard(input: NewBoard): Promise<Board>;
    updateBoard(id: string, patch: BoardPatch): Promise<void>;
    removeBoard(id: string): Promise<void>;
    /** A parent has looked at a child's board (AC 4). */
    reviewBoard(id: string): Promise<void>;

    addSection(boardId: string, title: string): Promise<BoardSection>;
    renameSection(id: string, title: string): Promise<void>;
    removeSection(id: string): Promise<void>;
    moveSection(id: string, direction: -1 | 1): Promise<void>;

    /** Caches the image and stores the copy with the row (AC 1). */
    addPin(input: NewPin): Promise<Pin>;
    updatePin(id: string, patch: PinPatch): Promise<void>;
    removePin(id: string): Promise<void>;
    /** Drag ordering, and moving a pin into a section. */
    reorderPin(id: string, sectionId: string | null, toIndex: number): Promise<void>;
    /** Move to another board; copy leaves the original where it is. */
    movePin(id: string, toBoardId: string, toSectionId?: string | null): Promise<void>;
    copyPin(id: string, toBoardId: string, toSectionId?: string | null): Promise<Pin>;
    /** Re-fetch a pin's picture when the cached copy is only a placeholder. */
    recachePin(id: string): Promise<void>;

    comment(pinId: string, text: string, reaction?: Reaction | null): Promise<PinComment>;
    removeComment(id: string): Promise<void>;

    setChecklist(boardId: string, lines: NewChecklistLine[]): Promise<ChecklistItem[]>;
    toggleChecklistLine(id: string, assigneeMemberId: string | null): Promise<void>;
    removeChecklistLine(id: string): Promise<void>;
    /** Record that a line became a Task (the Tasks module owns the task). */
    markChecklistSent(ids: string[], taskIds: Record<string, string>): Promise<void>;
}
