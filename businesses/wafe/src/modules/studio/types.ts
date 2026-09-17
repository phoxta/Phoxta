import type { ModuleRepo, Visibility } from "@/data/core";

/**
 * The AI companion & generative studio.
 *
 * Two things that are really one thing. The COMPANION is the family's
 * concierge: grounded in the household's own data, it answers with the
 * sources it used, it says "I can't see that" rather than inventing, and it
 * never writes anything — it proposes, and the member confirms. The STUDIO is
 * what the companion makes when it is asked for something rather than about
 * something: a song with a real chord chart, a storyboard the children can
 * present, a picture (or the honest typographic card when the plan has no
 * image model).
 *
 * Everything the module produces lands in one gallery, because a family does
 * not think in entity types — they think "the song we wrote for Grandma".
 */

// ---------------------------------------------------------------------------
// Plans — the tier table the rest of the product keeps referring to
// ---------------------------------------------------------------------------

/**
 * The brief mentions "where the plan allows" in four places and never says
 * what a plan is. It is defined here, once, and every gate in this module
 * reads it: the monthly AI allowance, whether an image model is on, and the
 * media quota reels and galleries draw against.
 */
export type PlanTier = "seed" | "household" | "legacy";

export interface PlanDef {
    tier: PlanTier;
    name: string;
    price: string;
    /** Monthly AI allowance, in pence, across every action in the app. */
    aiCapCents: number;
    /** Image generation available at all. */
    images: boolean;
    /** Storyboard/reel minutes kept per month. */
    reelMinutes: number;
    /** Photo + recording storage, in megabytes. */
    mediaMb: number;
    /** Members who may hold their own credentials. */
    seats: number;
    note: string;
}

export const PLANS: Record<PlanTier, PlanDef> = {
    seed: {
        tier: "seed",
        name: "Seed",
        price: "Free",
        aiCapCents: 200,
        images: false,
        reelMinutes: 5,
        mediaMb: 250,
        seats: 2,
        note: "The whole product, a small companion allowance, and typographic cards instead of generated pictures.",
    },
    household: {
        tier: "household",
        name: "Household",
        price: "£9 a month",
        aiCapCents: 1200,
        images: true,
        reelMinutes: 60,
        mediaMb: 5000,
        seats: 8,
        note: "Everyone in the house, image generation on, and enough allowance for the daily rhythm plus the studio.",
    },
    legacy: {
        tier: "legacy",
        name: "Legacy",
        price: "£19 a month",
        aiCapCents: 3500,
        images: true,
        reelMinutes: 240,
        mediaMb: 25000,
        seats: 20,
        note: "Grandparents, mentors and the archive: long reels, deep history and the largest companion allowance.",
    },
};

// ---------------------------------------------------------------------------
// What the studio makes
// ---------------------------------------------------------------------------

export type StudioKind = "song" | "story" | "image" | "chat";

export type SongKind = "family" | "worship" | "lullaby" | "birthday";

export const SONG_KIND_LABEL: Record<SongKind, string> = {
    family: "Family anthem",
    worship: "Worship",
    lullaby: "Lullaby",
    birthday: "Birthday",
};

/** One block of a lead sheet: the chord line sits above the lyric line. */
export interface SongSection {
    /** "Verse 1", "Chorus", "Bridge". */
    section: string;
    /** Space-separated chord symbols, one per lyric line where it matters. */
    chords: string;
    lyrics: string;
}

/** A recording of the family singing it — captured in the browser, no service. */
export interface SongRecording {
    /** A blob/data URL. Demo keeps it in localStorage; live uploads it. */
    url: string;
    seconds: number;
    byMemberId: string;
    recordedAt: string;
    /** MIME type the recorder produced (audio/webm on most browsers). */
    mime: string;
}

export interface SongData {
    songKind: SongKind;
    /** "G", "D", "Am" — always present; a lead sheet without a key is not one. */
    key: string;
    /** Beats per minute; drives the sing-along scroll. */
    tempo: number;
    structure: SongSection[];
    theme: string;
    names: string[];
    prompt: string;
    source: "ai" | "template";
    model: string | null;
    recording: SongRecording | null;
}

export type SceneImageKind = "ai" | "family" | "none";

export interface StoryScene {
    n: number;
    caption: string;
    /** What the picture shows — the prompt an image model would be given. */
    visual: string;
    narration: string;
    imageUrl: string | null;
    imageKind: SceneImageKind;
}

export type StoryAudience = "little" | "junior" | "teen" | "family";

export interface StoryData {
    audience: StoryAudience;
    scenes: StoryScene[];
    prompt: string;
    source: "ai" | "template";
    model: string | null;
    /** Set when the storyboard has been handed to Memories to play as a reel. */
    reelId: string | null;
    sentToReelAt: string | null;
}

/**
 * `generated` means a model returned a picture. `unavailable_typographic` is
 * the honest state: no image model on this plan (or the model refused), the
 * prompt is kept, and the card the family gets is typography on the family's
 * own palette rather than a silent failure.
 */
export type ImageStatus = "generated" | "unavailable_typographic";

export interface ImageData {
    prompt: string;
    url: string | null;
    status: ImageStatus;
    model: string | null;
    /** Why it is typographic, in the family's words. */
    note: string;
    /** 0–5: which of the family palette the typographic card uses. */
    palette: number;
}

// ---------------------------------------------------------------------------
// The companion's conversations
// ---------------------------------------------------------------------------

/** What a sensitivity class is, for the context-pack gate. */
export type SensitivityClass = "general" | "financial" | "health" | "documents" | "private" | "settings";

export const SENSITIVITY_LABEL: Record<SensitivityClass, string> = {
    general: "General",
    financial: "Financial",
    health: "Health",
    documents: "Documents",
    private: "Private",
    settings: "Settings",
};

/** A chip under an answer: what the companion actually read. */
export interface Source {
    moduleId: string;
    label: string;
    detail: string;
    href: string;
    sensitivity: SensitivityClass;
}

export type ProposalKind = "task" | "plan" | "event" | "budget";

/**
 * The companion proposes; the member decides. Nothing in Wàfè is written by
 * an answer — a proposal card is the only path, and it starts `pending`.
 */
export interface Proposal {
    id: string;
    kind: ProposalKind;
    title: string;
    detail: string;
    /** Who it is for; null = the whole family. */
    memberId: string | null;
    dueDate: string | null;
    /** Where the member finishes the job. */
    href: string;
    status: "pending" | "accepted" | "dismissed";
    decidedAt: string | null;
}

/** Why a message never reached the model. */
export type BlockedReason = "safety" | "cap" | "scope" | null;

export interface ChatMessage {
    id: string;
    from: "me" | "wafe";
    text: string;
    at: string;
    sources: Source[];
    proposal: Proposal | null;
    blocked: BlockedReason;
}

export interface ChatData {
    /** Which part of the app the question was asked from ("travel", "home"…). */
    moduleContext: string;
    messages: ChatMessage[];
    /** Children's conversations are visible to parents by default. */
    visibleToParents: boolean;
}

// ---------------------------------------------------------------------------
// Items, projects, usage
// ---------------------------------------------------------------------------

export interface StudioItemBase {
    id: string;
    spaceId: string;
    title: string;
    memberId: string;
    createdAt: string;
    visibility: Visibility;
    sharedWith: string[];
    childSafe: boolean;
    projectId: string | null;
    /** What the generation cost, in pence — the meter is the sum of these. */
    costCents: number;
}

export type StudioItem =
    | (StudioItemBase & { kind: "song"; data: SongData })
    | (StudioItemBase & { kind: "story"; data: StoryData })
    | (StudioItemBase & { kind: "image"; data: ImageData })
    | (StudioItemBase & { kind: "chat"; data: ChatData });

export interface CreativeProject {
    id: string;
    spaceId: string;
    memberId: string;
    name: string;
    childSafe: boolean;
}

/** The monthly meter the gateway enforces and this screen shows. */
export interface AiUsage {
    /** "2026-09". */
    month: string;
    tokens: number;
    costCents: number;
    capCents: number;
    /** When the 80% warning was first shown, so it is said once. */
    warnedAt: string | null;
}

export interface StudioState {
    items: StudioItem[];
    projects: CreativeProject[];
    usage: AiUsage;
    plan: PlanTier;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export interface NewSong {
    title: string;
    data: Omit<SongData, "recording">;
    visibility?: Visibility;
    projectId?: string | null;
    costCents?: number;
}

export interface NewStory {
    title: string;
    data: Omit<StoryData, "reelId" | "sentToReelAt">;
    visibility?: Visibility;
    projectId?: string | null;
    costCents?: number;
}

export interface NewImage {
    title: string;
    data: ImageData;
    visibility?: Visibility;
    projectId?: string | null;
    costCents?: number;
}

export interface StudioRepo extends ModuleRepo<StudioState> {
    // -- gallery -------------------------------------------------------------
    saveSong(input: NewSong): Promise<StudioItem>;
    saveStory(input: NewStory): Promise<StudioItem>;
    saveImage(input: NewImage): Promise<StudioItem>;
    rename(itemId: string, title: string): Promise<void>;
    remove(itemId: string): Promise<void>;
    share(itemId: string, visibility: Visibility, sharedWith: string[]): Promise<void>;

    // -- songs & stories -----------------------------------------------------
    attachRecording(itemId: string, recording: SongRecording | null): Promise<void>;
    setSceneImage(itemId: string, sceneN: number, url: string | null, kind: SceneImageKind): Promise<void>;
    sendToReel(itemId: string): Promise<string>;

    // -- the companion -------------------------------------------------------
    startConversation(input: { title: string; moduleContext: string }): Promise<StudioItem>;
    appendMessages(conversationId: string, messages: ChatMessage[]): Promise<void>;
    decideProposal(conversationId: string, proposalId: string, status: "accepted" | "dismissed"): Promise<void>;
    removeConversation(conversationId: string): Promise<void>;

    // -- metering ------------------------------------------------------------
    /** Records a call against the month's allowance. Throws when the cap is spent. */
    meter(costCents: number, tokens: number): Promise<void>;
    setPlan(plan: PlanTier): Promise<void>;

    // -- projects ------------------------------------------------------------
    addProject(name: string, childSafe: boolean): Promise<CreativeProject>;
    removeProject(id: string): Promise<void>;
}
