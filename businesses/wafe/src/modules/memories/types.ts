import type { ModuleRepo, Visibility } from "@/data/core";

/**
 * Memories — albums, the family timeline, and memory reels.
 *
 * The module keeps the story a family is living: the pictures, the albums they
 * are gathered into, one vertical timeline that merges every celebration this
 * product knows about, and REELS — an ordered set of frames the app plays
 * full-screen with a slow Ken Burns drift and cross-fades. A reel is a
 * playlist, never a video file: nothing is encoded, nothing is downloaded, and
 * sharing one is sharing a link to a route.
 *
 * Four decisions the rest of the module rests on.
 *
 *  1. A REEL IS A PLAYLIST. Rendering happens in the browser from the family's
 *     own photos. That is what makes "share a reel with Grandma" a 200-byte
 *     link rather than a 40 MB upload, and what keeps the whole feature inside
 *     the storage quota a plan already pays for.
 *  2. A SHARE LINK IS A CAPABILITY WITH AN EXPIRY. `SHARE_LINK_DAYS` days by
 *     default, revocable at any moment, and every open is counted. A guest who
 *     has not been granted the object and has no live token sees nothing —
 *     not a blurred card, not a title: the row never reaches them.
 *  3. THE TIMELINE IS BOTH STORED AND MERGED. Events this module wrote are
 *     rows; events that belong to another module (an answered prayer, a badge,
 *     a milestone, a trip) are read from that module's loaded state and merged
 *     for display, then persisted on demand so the history survives. Every
 *     event carries `href` — a timeline entry that cannot take you to the
 *     record it describes is a decoration.
 *  4. MOTION IS A PREFERENCE, NOT A STYLE. `prefers-reduced-motion` pauses the
 *     Ken Burns drift and leaves the cross-fade; the reel still tells the
 *     story, it just stops moving underneath the reader.
 */

// ---------------------------------------------------------------------------
// Plans — the storage tier the brief keeps referring to
// ---------------------------------------------------------------------------

/**
 * The brief mentions "storage quota by plan" and "where the plan allows"
 * without ever saying what a plan is. The three tiers are the product's, and
 * this table is the media half of them: how much the family may keep, how long
 * a reel may run, how many reels they may hold. The AI half of the same table
 * lives with the companion; a space is on ONE tier and both halves read it.
 */
export type PlanTier = "seed" | "household" | "legacy";

export interface MediaPlan {
    tier: PlanTier;
    name: string;
    price: string;
    /** Photo + video storage, in bytes. */
    mediaBytes: number;
    /** The longest reel this tier will play, in frames. */
    maxFrames: number;
    /** How many reels the family may keep at once. */
    maxReels: number;
    /** Live share links open at once. */
    maxLinks: number;
    note: string;
}

const MB = 1024 * 1024;

export const MEDIA_PLANS: Record<PlanTier, MediaPlan> = {
    seed: {
        tier: "seed",
        name: "Seed",
        price: "Free",
        mediaBytes: 250 * MB,
        maxFrames: 30,
        maxReels: 3,
        maxLinks: 2,
        note: "Enough for a year of the good ones, and short reels to share.",
    },
    household: {
        tier: "household",
        name: "Household",
        price: "£9 a month",
        mediaBytes: 5000 * MB,
        maxFrames: 150,
        maxReels: 40,
        maxLinks: 20,
        note: "The family library: every album, long reels, and links for the grandparents.",
    },
    legacy: {
        tier: "legacy",
        name: "Legacy",
        price: "£19 a month",
        mediaBytes: 25000 * MB,
        maxFrames: 400,
        maxReels: 200,
        maxLinks: 100,
        note: "The archive: twenty years of pictures, video, and reels that run for an evening.",
    },
};

// ---------------------------------------------------------------------------
// Performance — the acceptance criteria, written down
// ---------------------------------------------------------------------------

/**
 * "Plays at 30 fps on a mid-range phone and starts within 3 s" is only
 * testable once the phone and the clock are named, so both are named here and
 * the player measures itself against them (hold the frame counter open in the
 * player's details panel).
 *
 * REFERENCE DEVICE — a 2020 mid-range Android (Snapdragon 665-class, 4 GB RAM,
 * e.g. Moto G Power / Redmi Note 9) or an iPhone SE 2020, on 4G.
 * START — from the tap on Play to the first frame painted, warm cache.
 * The player earns it by: mounting a window of `preloadAhead` frames and no
 * more, decoding the next frame off the main thread with `img.decode()`,
 * animating only `transform` and `opacity` (compositor-only, so the Ken Burns
 * drift never touches layout), and never holding more than three <img> nodes.
 */
export const PERF = {
    device: "A 2020 mid-range phone — Snapdragon 665 / 4 GB Android, or an iPhone SE 2020 — on 4G.",
    targetFps: 30,
    startMs: 3000,
    /** Frames kept decoded ahead of the one on screen. */
    preloadAhead: 3,
} as const;

// ---------------------------------------------------------------------------
// Uploads
// ---------------------------------------------------------------------------

export type MediaKind = "photo" | "video";
export type SourceFormat = "jpeg" | "png" | "heic" | "mp4";

export const SOURCE_FORMAT_LABEL: Record<SourceFormat, string> = {
    jpeg: "JPEG",
    png: "PNG",
    heic: "HEIC",
    mp4: "MP4",
};

/** What the file picker accepts — HEIC, JPEG, PNG and MP4, per the brief. */
export const UPLOAD_ACCEPT = ".heic,.heif,.jpg,.jpeg,.png,.mp4,image/heic,image/heif,image/jpeg,image/png,video/mp4";

/** Longest edge a picture is resized to on the way in. */
export const MAX_EDGE = 1600;

/**
 * The demo keeps uploads in localStorage as data URLs, which is a few
 * megabytes in total — so it refuses a file it cannot hold rather than losing
 * the whole library to a quota error. Live, the same file goes to the
 * "catalog" bucket under `wafe/<spaceId>/` and this cap does not apply.
 */
export const DEMO_MAX_BYTES = 3 * MB;

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

export interface Photo {
    id: string;
    spaceId: string;
    /** `/images/…` in the seed, a `data:` URL for a demo upload, storage live. */
    url: string;
    /** A video's poster frame, grabbed from the file itself on the way in. */
    posterUrl: string | null;
    kind: MediaKind;
    format: SourceFormat;
    caption: string;
    /** ISO date the picture was taken — the timeline's spine, not `createdAt`. */
    takenAt: string;
    place: string;
    /** Members in the picture (media_tags). */
    peopleIds: string[];
    /** Free tags: "church", "lagos", "first". */
    tags: string[];
    addedBy: string;
    favourite: boolean;
    visibility: Visibility;
    sharedWith: string[];
    childSafe: boolean;
    width: number;
    height: number;
    bytes: number;
    /**
     * True when the browser could not decode the original — HEIC, on every
     * browser but Safari. The file is kept exactly as it came; it is converted
     * server-side in the live app, and the interface says so instead of
     * pretending the picture is there.
     */
    needsConversion: boolean;
    createdAt: string;
}

export type PhotoPatch = Partial<Pick<Photo, "caption" | "takenAt" | "place" | "peopleIds" | "tags" | "favourite" | "visibility" | "sharedWith" | "childSafe">>;

// ---------------------------------------------------------------------------
// Albums
// ---------------------------------------------------------------------------

export interface Album {
    id: string;
    spaceId: string;
    title: string;
    description: string;
    coverPhotoId: string | null;
    /** ISO dates — an album is a stretch of time, not a folder. */
    dateFrom: string;
    dateTo: string;
    visibility: Visibility;
    sharedWith: string[];
    childSafe: boolean;
    ownerMemberId: string;
    /** Members who may add to this album even without `memories.manage`. */
    contributorIds: string[];
    /** Travel's trip id, when the album belongs to a trip. */
    tripId: string | null;
    /** Made by the product (a trip that came home) rather than by a person. */
    auto: boolean;
    createdAt: string;
}

/** album_media: the ordered membership, so one picture can live in two albums. */
export interface AlbumPhoto {
    id: string;
    albumId: string;
    photoId: string;
    /** Overrides the photo's own caption inside this album when set. */
    caption: string;
    order: number;
}

// ---------------------------------------------------------------------------
// The timeline
// ---------------------------------------------------------------------------

export type TimelineType = "album" | "celebration" | "answered_prayer" | "badge" | "milestone" | "trip" | "first";

export const TIMELINE_LABEL: Record<TimelineType, string> = {
    album: "Album",
    celebration: "Celebration",
    answered_prayer: "Answered prayer",
    badge: "Badge",
    milestone: "Milestone",
    trip: "Trip",
    first: "A first",
};

export const TIMELINE_EMOJI: Record<TimelineType, string> = {
    album: "📸",
    celebration: "🎉",
    answered_prayer: "🙏",
    badge: "🏅",
    milestone: "🌱",
    trip: "✈️",
    first: "⭐",
};

export interface TimelineEvent {
    id: string;
    spaceId: string;
    /** ISO date. */
    date: string;
    type: TimelineType;
    /** The record this stands for, in its own module. */
    sourceId: string | null;
    title: string;
    body: string;
    photoId: string | null;
    memberIds: string[];
    /** Where the event takes you — the whole point of a timeline (AC 4). */
    href: string;
    visibility: Visibility;
    sharedWith: string[];
    childSafe: boolean;
    /** Merged in from another module rather than written here. */
    imported: boolean;
    createdAt: string;
}

export type NewTimelineEvent = Omit<TimelineEvent, "id" | "spaceId" | "createdAt">;

// ---------------------------------------------------------------------------
// Reels
// ---------------------------------------------------------------------------

export type ReelMood = "warm" | "joy" | "calm";

export const REEL_MOOD: Record<ReelMood, { label: string; note: string; ground: string; ink: string; slideMs: number }> = {
    warm: { label: "Warm", note: "Amber ground, long slow drift — the family album voice.", ground: "#2a211b", ink: "#f6e7cf", slideMs: 4200 },
    joy: { label: "Joy", note: "Brighter, quicker cuts — birthdays and beaches.", ground: "#25201c", ink: "#ffeccd", slideMs: 3200 },
    calm: { label: "Calm", note: "Cool ground, the longest hold — Sundays and quiet days.", ground: "#1b2320", ink: "#e2ece2", slideMs: 5200 },
};

export type ReelTransition = "crossfade" | "dip" | "cut";

export const REEL_TRANSITION: Record<ReelTransition, { label: string; note: string }> = {
    crossfade: { label: "Cross-fade", note: "One picture dissolves into the next." },
    dip: { label: "Dip to dark", note: "A breath of the ground colour between frames." },
    cut: { label: "Cut", note: "No transition at all — the fastest, and the calmest on a slow phone." },
};

export type ReelStatus = "draft" | "ready";
export type ReelAutoKind = "our_year" | "trip" | "storyboard" | "custom";

export interface Reel {
    id: string;
    spaceId: string;
    title: string;
    subtitle: string;
    mood: ReelMood;
    transition: ReelTransition;
    /** Milliseconds a frame holds, unless the frame overrides it. */
    slideMs: number;
    status: ReelStatus;
    autoKind: ReelAutoKind;
    /** The track's name — a family song or a licensed one. */
    trackTitle: string;
    trackNote: string;
    /**
     * A Studio recording of the family singing it, by item id. When the Studio
     * slice can be read and the item carries a recording, the player plays it;
     * otherwise the track is a credit line and the reel runs silent.
     */
    trackItemId: string | null;
    coverPhotoId: string | null;
    ownerMemberId: string;
    visibility: Visibility;
    sharedWith: string[];
    childSafe: boolean;
    /** Set on the December auto-draft while it is still waiting for its date. */
    scheduledFor: string | null;
    /** Studio's storyboard id, when the reel is a storyboard being played. */
    storyboardId: string | null;
    createdAt: string;
}

export interface ReelFrame {
    id: string;
    reelId: string;
    photoId: string;
    caption: string;
    /** Null = use the reel's `slideMs`. */
    durationMs: number | null;
    order: number;
}

export type ReelPatch = Partial<Pick<Reel, "title" | "subtitle" | "mood" | "transition" | "slideMs" | "trackTitle" | "trackNote" | "trackItemId" | "coverPhotoId" | "visibility" | "sharedWith" | "childSafe" | "status">>;

// ---------------------------------------------------------------------------
// Sharing
// ---------------------------------------------------------------------------

export type ShareObjectType = "album" | "reel";

/** A named grant to a member of the space — the guest dashboard's whole list. */
export interface ObjectShare {
    id: string;
    spaceId: string;
    objectType: ShareObjectType;
    objectId: string;
    memberId: string;
    grantedBy: string;
    createdAt: string;
}

/**
 * A link anybody may open. It expires — `SHARE_LINK_DAYS` days unless a
 * shorter life was chosen — it can be revoked in one tap, and every open is
 * counted so the family can see it is being used.
 */
export interface ShareLink {
    id: string;
    spaceId: string;
    objectType: ShareObjectType;
    objectId: string;
    token: string;
    createdBy: string;
    createdAt: string;
    expiresAt: string;
    revokedAt: string | null;
    views: number;
    lastViewedAt: string | null;
}

export const SHARE_LINK_DAYS = 30;
export const SHARE_LINK_CHOICES = [1, 7, 30, 90] as const;

/** What `openShared(token)` hands a page: enough to play, and nothing else. */
export interface SharedView {
    objectType: ShareObjectType;
    album: Album | null;
    reel: Reel | null;
    frames: ReelFrame[];
    photos: Photo[];
    expiresAt: string;
    /** Who opened the door, in the family's words. */
    sharedBy: string;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface MemoriesState {
    photos: Photo[];
    albums: Album[];
    albumPhotos: AlbumPhoto[];
    timeline: TimelineEvent[];
    reels: Reel[];
    frames: ReelFrame[];
    shares: ObjectShare[];
    links: ShareLink[];
    plan: PlanTier;
    /** The whole library's size before filtering — a quota is a family fact. */
    usedBytes: number;
    /** How many pictures the family holds in total, filtered view or not. */
    totalPhotos: number;
}

export const EMPTY_STATE: MemoriesState = {
    photos: [],
    albums: [],
    albumPhotos: [],
    timeline: [],
    reels: [],
    frames: [],
    shares: [],
    links: [],
    plan: "household",
    usedBytes: 0,
    totalPhotos: 0,
};

// ---------------------------------------------------------------------------
// What this module reads from its neighbours
// ---------------------------------------------------------------------------
//
// A module may never touch another module's repo, so the shapes it reads from
// their loaded state are declared here, structurally and minimally: only the
// fields the timeline and the trip albums actually need. If a neighbour is not
// registered, or its slice has not loaded, every one of these is simply
// absent and the screens carry on.

export interface TripSlice {
    id: string;
    title: string;
    destination: string;
    startDate: string | null;
    endDate: string | null;
    status: string;
    coverUrl: string | null;
    albumId: string | null;
}
export interface TravelSlice {
    trips: TripSlice[];
}

export interface PrayerSlice {
    id: string;
    title: string;
    status: string;
    answeredAt: string | null;
    testimony: string;
    childSafe: boolean;
}
export interface BibleSlice {
    prayers: PrayerSlice[];
}

export interface GoalsSlice {
    goals: Array<{ id: string; title: string; childSafeSummary: string }>;
    milestones: Array<{ id: string; goalId: string; title: string; done: boolean; doneAt: string | null }>;
    celebrations: Array<{ id: string; goalId: string; date: string; cardLine: string; reflection: string; memberIds: string[] }>;
}

export interface CurriculaSlice {
    badges: Array<{ id: string; name: string; icon: string }>;
    awards: Array<{ id: string; badgeId: string; memberId: string; level: string; awardedAt: string }>;
}

export interface StudioStorySlice {
    id: string;
    kind: string;
    title: string;
    memberId: string;
    createdAt: string;
    data: { scenes?: Array<{ n: number; caption: string; narration: string; imageUrl: string | null }>; reelId?: string | null };
}
export interface StudioSlice {
    plan?: PlanTier;
    items: StudioStorySlice[];
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export interface NewPhoto {
    url: string;
    posterUrl?: string | null;
    kind: MediaKind;
    format: SourceFormat;
    caption: string;
    takenAt: string;
    place: string;
    peopleIds: string[];
    tags: string[];
    width: number;
    height: number;
    bytes: number;
    needsConversion?: boolean;
    visibility?: Visibility;
    sharedWith?: string[];
    childSafe?: boolean;
    favourite?: boolean;
}

export interface NewAlbum {
    title: string;
    description?: string;
    dateFrom: string;
    dateTo: string;
    visibility?: Visibility;
    sharedWith?: string[];
    childSafe?: boolean;
    contributorIds?: string[];
    tripId?: string | null;
    coverPhotoId?: string | null;
}

export type AlbumPatch = Partial<Pick<Album, "title" | "description" | "dateFrom" | "dateTo" | "visibility" | "sharedWith" | "childSafe" | "contributorIds" | "coverPhotoId">>;

export interface NewReel {
    title: string;
    subtitle?: string;
    mood?: ReelMood;
    transition?: ReelTransition;
    slideMs?: number;
    trackTitle?: string;
    trackNote?: string;
    trackItemId?: string | null;
    photoIds: string[];
    captions?: Record<string, string>;
    visibility?: Visibility;
    sharedWith?: string[];
    childSafe?: boolean;
    autoKind?: ReelAutoKind;
    storyboardId?: string | null;
    status?: ReelStatus;
}

export interface MemoriesRepo extends ModuleRepo<MemoriesState> {
    // -- photos --------------------------------------------------------------
    addPhotos(input: NewPhoto[], albumId: string | null): Promise<Photo[]>;
    updatePhoto(id: string, patch: PhotoPatch): Promise<void>;
    toggleFavourite(id: string): Promise<void>;
    removePhoto(id: string): Promise<void>;

    // -- albums --------------------------------------------------------------
    addAlbum(input: NewAlbum): Promise<Album>;
    updateAlbum(id: string, patch: AlbumPatch): Promise<void>;
    removeAlbum(id: string): Promise<void>;
    addToAlbum(albumId: string, photoIds: string[]): Promise<void>;
    removeFromAlbum(albumId: string, photoId: string): Promise<void>;
    moveInAlbum(albumId: string, photoId: string, delta: number): Promise<void>;
    /** AC 9 — one album per trip that has come home. Idempotent on `tripId`. */
    ensureTripAlbums(trips: TripSlice[]): Promise<string[]>;

    // -- timeline ------------------------------------------------------------
    addTimelineEvent(input: NewTimelineEvent): Promise<TimelineEvent>;
    removeTimelineEvent(id: string): Promise<void>;
    /** Persist merged neighbours' events; idempotent on `type` + `sourceId`. */
    importTimeline(events: NewTimelineEvent[]): Promise<number>;

    // -- reels ---------------------------------------------------------------
    addReel(input: NewReel): Promise<Reel>;
    updateReel(id: string, patch: ReelPatch): Promise<void>;
    removeReel(id: string): Promise<void>;
    setFrames(reelId: string, frames: Array<{ photoId: string; caption?: string; durationMs?: number | null }>): Promise<void>;
    updateFrame(frameId: string, patch: Partial<Pick<ReelFrame, "caption" | "durationMs">>): Promise<void>;
    moveFrame(frameId: string, delta: number): Promise<void>;
    removeFrame(frameId: string): Promise<void>;
    publishReel(id: string): Promise<void>;
    reelFromAlbum(albumId: string, title?: string): Promise<string>;
    /** AC 8 — the December "Our year" draft, from that year's timeline. */
    draftOurYear(year: number): Promise<string | null>;
    /** A Studio storyboard, playable in this player. Idempotent per story. */
    reelFromStoryboard(story: StudioStorySlice): Promise<string>;

    // -- sharing -------------------------------------------------------------
    grant(objectType: ShareObjectType, objectId: string, memberIds: string[]): Promise<void>;
    revokeGrant(shareId: string): Promise<void>;
    createLink(objectType: ShareObjectType, objectId: string, days?: number): Promise<ShareLink>;
    revokeLink(linkId: string): Promise<void>;
    /** A token is a capability: it reaches past `visibleTo`, and only this far. */
    openShared(token: string): Promise<SharedView | null>;

    // -- plan ----------------------------------------------------------------
    setPlan(plan: PlanTier): Promise<void>;
}
