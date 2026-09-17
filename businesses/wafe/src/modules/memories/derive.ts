import type { AgendaItem, AttentionItem, ChildCard, DashboardContribution, Nudge, ProgressRing, RepoContext, Role } from "@/data/core";
import { isoDate, pct, shortDate } from "@/lib/format";
import {
    MEDIA_PLANS,
    TIMELINE_EMOJI,
    TIMELINE_LABEL,
    type Album,
    type AlbumPhoto,
    type BibleSlice,
    type CurriculaSlice,
    type GoalsSlice,
    type MemoriesState,
    type NewTimelineEvent,
    type Photo,
    type Reel,
    type ReelFrame,
    type ShareLink,
    type ShareObjectType,
    type TimelineEvent,
    type TravelSlice,
} from "./types";

/**
 * Everything the Memories screens show, as pure functions of state.
 *
 * Five ideas do the work:
 *
 *   VISIBILITY  `visibleTo` is the one filter both repos run before anybody
 *               receives state. A child never receives a private album's
 *               pictures; a GUEST receives only what a named grant or a live
 *               share link opened for them, and nothing else — not the
 *               timeline, not the library, not a count.
 *   THE SPINE   every picture has `takenAt`, and the timeline is built on it,
 *               so the story reads in the order it happened rather than the
 *               order it was uploaded.
 *   MERGING     a celebration, an answered prayer, a badge, a milestone and a
 *               trip are other modules' records. `crossEvents` turns their
 *               loaded state into timeline events for display; `importTimeline`
 *               persists them. Both keep the module's own `href`, because a
 *               timeline that cannot take you to the record is a decoration.
 *   THE REEL    duration, cover and readiness are computed, never stored, so a
 *               frame added or removed is instantly true everywhere.
 *   THE QUOTA   `usedBytes` is the WHOLE library's size and survives the
 *               visibility filter, because "how full are we" is a fact about
 *               the family, not about the person looking.
 */

export const HREF = "/create/memories";
export const albumHref = (id: string): string => `${HREF}/albums/${id}`;
export const reelHref = (id: string): string => `${HREF}/reels/${id}`;
export const playHref = (id: string, token?: string): string => `${HREF}/reels/${id}/play${token ? `?t=${token}` : ""}`;
export const timelineHref = `${HREF}/timeline`;

const MS_DAY = 86400000;
const midnight = (iso: string): number => new Date(`${iso.slice(0, 10)}T00:00:00`).getTime();

export const daysBetween = (from: string, to: string): number => Math.round((midnight(to) - midnight(from)) / MS_DAY);

/** "6 September" — a date without its year, for the "on this day" heading. */
export const dayMonth = (iso: string): string => new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long" });

export const yearOf = (iso: string): number => Number(iso.slice(0, 4));
export const monthKey = (iso: string): string => iso.slice(0, 7);
export const monthLabel = (key: string): string => new Date(`${key}-01T00:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" });

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

export const canManage = (ctx: RepoContext): boolean => ctx.can("memories.manage");
export const canView = (ctx: RepoContext): boolean => ctx.can("memories.view") || ctx.can("memories.manage");

/** A contributor may add to THIS album without holding the whole module. */
export function canContribute(ctx: RepoContext, album: Album | undefined): boolean {
    if (!album) return canManage(ctx);
    if (canManage(ctx)) return true;
    return album.contributorIds.includes(ctx.me.id);
}

/** A row's own reachability, before any grant or link is considered. */
function reaches(ctx: RepoContext, ownerId: string, visibility: string, sharedWith: string[], childSafe: boolean): boolean {
    if (ownerId === ctx.me.id) return true;
    if (visibility === "private") return false;
    if (visibility === "shared") return sharedWith.includes(ctx.me.id);
    if (visibility === "child") return true;
    // "family": parents and guests always; children only when it is child-safe.
    return ctx.role === "child" ? childSafe : true;
}

/**
 * A named grant on one object — the guest rule (AC 5).
 *
 * A live share LINK deliberately does not appear here. A link is a capability
 * somebody holds, not a property of the object: holding it opens the object
 * through `openShared(token)` and nothing else. If a live link widened
 * `visibleTo`, making one link for a grandmother would quietly hand the album
 * to every guest and every child in the space, which is the opposite of what
 * sharing one thing means.
 */
function grantedTo(state: MemoriesState, ctx: RepoContext, type: ShareObjectType, id: string): boolean {
    return state.shares.some((s) => s.objectType === type && s.objectId === id && s.memberId === ctx.me.id);
}

/**
 * The one filter. Run by BOTH repos before state leaves them, so switching
 * "view as" to Tobi or to Mama Fọláké genuinely removes rows rather than
 * hiding them with CSS.
 *
 * A guest is the strict case the brief asks for: their whole world is the
 * objects granted to them (or opened by a live link), plus exactly the
 * pictures, frames and timeline entries those objects contain.
 */
export function visibleTo(state: MemoriesState, ctx: RepoContext): MemoriesState {
    const base = { plan: state.plan, usedBytes: state.usedBytes, totalPhotos: state.photos.length };

    if (!canView(ctx)) {
        return { ...state, ...base, photos: [], albums: [], albumPhotos: [], timeline: [], reels: [], frames: [], shares: [], links: [] };
    }

    if (ctx.role === "guest") {
        const albums = state.albums.filter((a) => grantedTo(state, ctx, "album", a.id));
        const reels = state.reels.filter((r) => grantedTo(state, ctx, "reel", r.id));
        const albumIds = new Set(albums.map((a) => a.id));
        const reelIds = new Set(reels.map((r) => r.id));
        const albumPhotos = state.albumPhotos.filter((ap) => albumIds.has(ap.albumId));
        const frames = state.frames.filter((f) => reelIds.has(f.reelId));
        const keep = new Set<string>([...albumPhotos.map((ap) => ap.photoId), ...frames.map((f) => f.photoId), ...albums.map((a) => a.coverPhotoId ?? ""), ...reels.map((r) => r.coverPhotoId ?? "")]);
        return {
            ...base,
            albums,
            reels,
            albumPhotos,
            frames,
            photos: state.photos.filter((p) => keep.has(p.id)),
            // A guest is shown the story of what they were given, not the family's.
            timeline: state.timeline.filter((t) => t.type === "album" && t.sourceId && albumIds.has(t.sourceId)),
            shares: state.shares.filter((s) => s.memberId === ctx.me.id),
            links: [],
        };
    }

    const photos = state.photos.filter((p) => reaches(ctx, p.addedBy, p.visibility, p.sharedWith, p.childSafe));
    const albums = state.albums.filter((a) => reaches(ctx, a.ownerMemberId, a.visibility, a.sharedWith, a.childSafe) || a.contributorIds.includes(ctx.me.id) || grantedTo(state, ctx, "album", a.id));
    const reels = state.reels.filter((r) => reaches(ctx, r.ownerMemberId, r.visibility, r.sharedWith, r.childSafe) || grantedTo(state, ctx, "reel", r.id));
    const photoIds = new Set(photos.map((p) => p.id));
    const albumIds = new Set(albums.map((a) => a.id));
    const reelIds = new Set(reels.map((r) => r.id));
    return {
        ...base,
        photos,
        albums,
        reels,
        albumPhotos: state.albumPhotos.filter((ap) => albumIds.has(ap.albumId) && photoIds.has(ap.photoId)),
        frames: state.frames.filter((f) => reelIds.has(f.reelId) && photoIds.has(f.photoId)),
        timeline: state.timeline.filter((t) => reaches(ctx, t.memberIds[0] ?? ctx.me.id, t.visibility, t.sharedWith, t.childSafe)),
        // Only a parent runs the sharing desk; nobody else needs the link list.
        shares: ctx.role === "parent" ? state.shares : state.shares.filter((s) => s.memberId === ctx.me.id),
        links: ctx.role === "parent" ? state.links : [],
    };
}

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

export const photoById = (state: MemoriesState, id: string | null | undefined): Photo | undefined => (id ? state.photos.find((p) => p.id === id) : undefined);
export const albumById = (state: MemoriesState, id: string): Album | undefined => state.albums.find((a) => a.id === id);
export const reelById = (state: MemoriesState, id: string): Reel | undefined => state.reels.find((r) => r.id === id);

/** An album's membership, in the family's chosen order. */
export function albumRows(state: MemoriesState, albumId: string): AlbumPhoto[] {
    return state.albumPhotos.filter((ap) => ap.albumId === albumId).sort((a, b) => a.order - b.order);
}

export function albumPhotos(state: MemoriesState, albumId: string): Photo[] {
    const by = new Map(state.photos.map((p) => [p.id, p]));
    return albumRows(state, albumId)
        .map((ap) => by.get(ap.photoId))
        .filter((p): p is Photo => Boolean(p));
}

export const albumCount = (state: MemoriesState, albumId: string): number => state.albumPhotos.filter((ap) => ap.albumId === albumId).length;

/** The cover the family chose, else the first picture in the album. */
export function albumCover(state: MemoriesState, album: Album): Photo | undefined {
    return photoById(state, album.coverPhotoId) ?? albumPhotos(state, album.id)[0];
}

export function albumsOf(state: MemoriesState): Album[] {
    return [...state.albums].sort((a, b) => (b.dateTo || b.dateFrom).localeCompare(a.dateTo || a.dateFrom));
}

/** Which albums a picture already belongs to (the lightbox says so). */
export function albumsWith(state: MemoriesState, photoId: string): Album[] {
    const ids = new Set(state.albumPhotos.filter((ap) => ap.photoId === photoId).map((ap) => ap.albumId));
    return state.albums.filter((a) => ids.has(a.id));
}

export const albumDates = (a: Album): string => (a.dateFrom === a.dateTo ? shortDate(a.dateFrom) : `${shortDate(a.dateFrom)} – ${shortDate(a.dateTo)}`);

// ---------------------------------------------------------------------------
// Reels
// ---------------------------------------------------------------------------

export function framesOf(state: MemoriesState, reelId: string): ReelFrame[] {
    return state.frames.filter((f) => f.reelId === reelId).sort((a, b) => a.order - b.order);
}

/** Frames paired with their picture — what the player and the editor both want. */
export function reelSlides(state: MemoriesState, reelId: string): Array<{ frame: ReelFrame; photo: Photo }> {
    const by = new Map(state.photos.map((p) => [p.id, p]));
    return framesOf(state, reelId)
        .map((frame) => ({ frame, photo: by.get(frame.photoId) }))
        .filter((s): s is { frame: ReelFrame; photo: Photo } => Boolean(s.photo));
}

export const frameMs = (reel: Reel, frame: ReelFrame): number => Math.max(800, frame.durationMs ?? reel.slideMs);

export function reelMs(state: MemoriesState, reel: Reel): number {
    return framesOf(state, reel.id).reduce((n, f) => n + frameMs(reel, f), 0);
}

/** "3 min 12 s" — a reel's run time, in the family's words. */
export function runTime(ms: number): string {
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s} sec`;
    const m = Math.floor(s / 60);
    const r = s % 60;
    return r ? `${m} min ${r} sec` : `${m} min`;
}

export function reelCover(state: MemoriesState, reel: Reel): Photo | undefined {
    return photoById(state, reel.coverPhotoId) ?? reelSlides(state, reel.id)[0]?.photo;
}

export function reelsOf(state: MemoriesState): Reel[] {
    return [...state.reels].sort((a, b) => Number(a.status === "draft") - Number(b.status === "draft") || b.createdAt.localeCompare(a.createdAt));
}

/** Is this reel longer than the plan will play? (Storage quota by plan.) */
export function overPlan(state: MemoriesState, reel: Reel): number {
    const plan = MEDIA_PLANS[state.plan];
    return Math.max(0, framesOf(state, reel.id).length - plan.maxFrames);
}

// ---------------------------------------------------------------------------
// On this day
// ---------------------------------------------------------------------------

export interface OnThisDay {
    year: number;
    yearsAgo: number;
    photos: Photo[];
    events: TimelineEvent[];
}

/** Everything from this same day in an earlier year, newest year first. */
export function onThisDay(state: MemoriesState, today: string): OnThisDay[] {
    const md = today.slice(5, 10);
    const thisYear = yearOf(today);
    const byYear = new Map<number, OnThisDay>();
    const bucket = (iso: string): OnThisDay | null => {
        if (iso.slice(5, 10) !== md) return null;
        const y = yearOf(iso);
        if (y >= thisYear) return null;
        let b = byYear.get(y);
        if (!b) {
            b = { year: y, yearsAgo: thisYear - y, photos: [], events: [] };
            byYear.set(y, b);
        }
        return b;
    };
    for (const p of state.photos) bucket(p.takenAt)?.photos.push(p);
    for (const e of state.timeline) bucket(e.date)?.events.push(e);
    return [...byYear.values()].sort((a, b) => b.year - a.year);
}

/** Anniversaries falling today: a "first" or a trip, a year or more ago. */
export function anniversaries(state: MemoriesState, today: string): TimelineEvent[] {
    return onThisDay(state, today)
        .flatMap((d) => d.events)
        .filter((e) => e.type === "first" || e.type === "milestone" || e.type === "trip");
}

// ---------------------------------------------------------------------------
// The timeline
// ---------------------------------------------------------------------------

export interface TimelineMonth {
    key: string;
    label: string;
    events: TimelineEvent[];
}
export interface TimelineYear {
    year: number;
    count: number;
    months: TimelineMonth[];
}

/** The vertical timeline: year → month → events, newest first. */
export function timelineByYear(events: TimelineEvent[]): TimelineYear[] {
    const years = new Map<number, Map<string, TimelineEvent[]>>();
    for (const e of [...events].sort((a, b) => b.date.localeCompare(a.date))) {
        const y = yearOf(e.date);
        let months = years.get(y);
        if (!months) years.set(y, (months = new Map()));
        const k = monthKey(e.date);
        const list = months.get(k);
        if (list) list.push(e);
        else months.set(k, [e]);
    }
    return [...years.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([year, months]) => ({
            year,
            count: [...months.values()].reduce((n, l) => n + l.length, 0),
            months: [...months.entries()]
                .sort((a, b) => b[0].localeCompare(a[0]))
                .map(([key, list]) => ({ key, label: monthLabel(key), events: list })),
        }));
}

/**
 * The neighbours' records, as timeline events — computed for display and
 * persisted on demand. Nothing here reads another module's REPO: every input
 * is that module's already-loaded, already-filtered state.
 */
export function crossEvents(slices: { travel?: TravelSlice; bible?: BibleSlice; goals?: GoalsSlice; curricula?: CurriculaSlice }, role: Role): NewTimelineEvent[] {
    const out: NewTimelineEvent[] = [];
    const base = { photoId: null, imported: true, sharedWith: [] as string[] };

    for (const t of slices.travel?.trips ?? []) {
        if (t.status !== "done" || !t.endDate) continue;
        out.push({
            ...base,
            date: t.endDate,
            type: "trip",
            sourceId: t.id,
            title: `${t.title} — home`,
            body: `We came home from ${t.destination}.`,
            memberIds: [],
            href: `/live/travel/${t.id}`,
            visibility: "child",
            childSafe: true,
        });
    }

    for (const p of slices.bible?.prayers ?? []) {
        if (p.status !== "answered" || !p.answeredAt) continue;
        out.push({
            ...base,
            date: p.answeredAt.slice(0, 10),
            type: "answered_prayer",
            sourceId: p.id,
            title: p.title,
            body: p.testimony || "Answered.",
            memberIds: [],
            href: "/grow/bible/prayer",
            visibility: p.childSafe ? "child" : "family",
            childSafe: p.childSafe,
        });
    }

    const goalTitle = new Map((slices.goals?.goals ?? []).map((g) => [g.id, role === "child" ? g.childSafeSummary || g.title : g.title]));
    for (const c of slices.goals?.celebrations ?? []) {
        out.push({
            ...base,
            date: c.date,
            type: "celebration",
            sourceId: c.id,
            title: c.cardLine || goalTitle.get(c.goalId) || "A celebration",
            body: c.reflection,
            memberIds: c.memberIds,
            href: `/execute/goals/${c.goalId}`,
            visibility: "child",
            childSafe: true,
        });
    }
    for (const m of slices.goals?.milestones ?? []) {
        if (!m.done || !m.doneAt) continue;
        out.push({
            ...base,
            date: m.doneAt.slice(0, 10),
            type: "milestone",
            sourceId: m.id,
            title: m.title,
            body: goalTitle.get(m.goalId) ? `Towards ${goalTitle.get(m.goalId)}.` : "",
            memberIds: [],
            href: `/execute/goals/${m.goalId}`,
            visibility: "child",
            childSafe: true,
        });
    }

    const badge = new Map((slices.curricula?.badges ?? []).map((b) => [b.id, b]));
    for (const a of slices.curricula?.awards ?? []) {
        const b = badge.get(a.badgeId);
        if (!b || !a.awardedAt) continue;
        out.push({
            ...base,
            date: a.awardedAt.slice(0, 10),
            type: "badge",
            sourceId: a.id,
            title: `${b.icon} ${b.name}`,
            body: a.level ? `${a.level} level.` : "",
            memberIds: [a.memberId],
            href: "/grow/curricula",
            visibility: "child",
            childSafe: true,
        });
    }

    return out;
}

/** Stored events plus the merged ones, de-duplicated on type + source. */
export function mergedTimeline(state: MemoriesState, extra: NewTimelineEvent[]): TimelineEvent[] {
    const seen = new Set(state.timeline.filter((e) => e.sourceId).map((e) => `${e.type}:${e.sourceId}`));
    const synthetic: TimelineEvent[] = extra
        .filter((e) => !e.sourceId || !seen.has(`${e.type}:${e.sourceId}`))
        .map((e) => ({ ...e, id: `merged-${e.type}-${e.sourceId ?? e.date}`, spaceId: state.albums[0]?.spaceId ?? "", createdAt: e.date }));
    return [...state.timeline, ...synthetic].sort((a, b) => b.date.localeCompare(a.date));
}

/** How many events are merged-but-not-yet-kept — the "Keep these" button's count. */
export function unsavedCount(state: MemoriesState, extra: NewTimelineEvent[]): number {
    const seen = new Set(state.timeline.filter((e) => e.sourceId).map((e) => `${e.type}:${e.sourceId}`));
    return extra.filter((e) => e.sourceId && !seen.has(`${e.type}:${e.sourceId}`)).length;
}

// ---------------------------------------------------------------------------
// Sharing
// ---------------------------------------------------------------------------

export type LinkState = "live" | "expired" | "revoked";

export function linkState(link: ShareLink, now = new Date().toISOString()): LinkState {
    if (link.revokedAt) return "revoked";
    return link.expiresAt > now ? "live" : "expired";
}

/** "Expires in 12 days", "Expired 3 days ago", "Revoked". */
export function linkLabel(link: ShareLink, today: string): string {
    const s = linkState(link);
    if (s === "revoked") return "Revoked";
    const days = daysBetween(today, link.expiresAt.slice(0, 10));
    if (s === "expired") return days === 0 ? "Expired today" : `Expired ${-days} days ago`;
    if (days === 0) return "Expires today";
    if (days === 1) return "Expires tomorrow";
    return `Expires in ${days} days`;
}

export const linksFor = (state: MemoriesState, type: ShareObjectType, id: string): ShareLink[] =>
    state.links.filter((l) => l.objectType === type && l.objectId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const grantsFor = (state: MemoriesState, type: ShareObjectType, id: string): string[] =>
    state.shares.filter((s) => s.objectType === type && s.objectId === id).map((s) => s.memberId);

/** The absolute URL a family member copies. */
export function shareUrl(type: ShareObjectType, id: string, token: string): string {
    const path = type === "reel" ? playHref(id, token) : `${albumHref(id)}?t=${token}`;
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    return `${origin}${path}`;
}

// ---------------------------------------------------------------------------
// The library, in numbers
// ---------------------------------------------------------------------------

export interface Quota {
    usedBytes: number;
    limitBytes: number;
    pct: number;
    used: string;
    limit: string;
    tight: boolean;
}

export function gb(bytes: number): string {
    if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
    if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} MB`;
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function quota(state: MemoriesState): Quota {
    const limitBytes = MEDIA_PLANS[state.plan].mediaBytes;
    const p = Math.min(100, Math.round((state.usedBytes / limitBytes) * 100));
    return { usedBytes: state.usedBytes, limitBytes, pct: p, used: gb(state.usedBytes), limit: gb(limitBytes), tight: p >= 85 };
}

export interface LibraryStats {
    photos: number;
    albums: number;
    reels: number;
    videos: number;
    favourites: number;
    firstYear: number | null;
    lastYear: number | null;
    monthsThisYear: number;
    captioned: number;
}

export function stats(state: MemoriesState, today: string): LibraryStats {
    const years = state.photos.map((p) => yearOf(p.takenAt)).sort((a, b) => a - b);
    const thisYear = yearOf(today);
    const months = new Set(state.photos.filter((p) => yearOf(p.takenAt) === thisYear).map((p) => monthKey(p.takenAt)));
    return {
        photos: state.photos.length,
        albums: state.albums.length,
        reels: state.reels.length,
        videos: state.photos.filter((p) => p.kind === "video").length,
        favourites: state.photos.filter((p) => p.favourite).length,
        firstYear: years[0] ?? null,
        lastYear: years[years.length - 1] ?? null,
        monthsThisYear: months.size,
        captioned: state.photos.filter((p) => p.caption.trim()).length,
    };
}

/** The pictures a member is in, newest first — "Ayo, 214 pictures". */
export function photosOf(state: MemoriesState, memberId: string): Photo[] {
    return state.photos.filter((p) => p.peopleIds.includes(memberId)).sort((a, b) => b.takenAt.localeCompare(a.takenAt));
}

export function recentPhotos(state: MemoriesState, n: number): Photo[] {
    return [...state.photos].sort((a, b) => b.takenAt.localeCompare(a.takenAt)).slice(0, n);
}

/** The best of a stretch of time: favourites first, then spread across days. */
export function bestOf(state: MemoriesState, from: string, to: string, limit: number): Photo[] {
    const inRange = state.photos.filter((p) => p.takenAt >= from && p.takenAt <= to && p.kind === "photo" && !p.needsConversion);
    const byDay = new Map<string, Photo[]>();
    for (const p of inRange.sort((a, b) => Number(b.favourite) - Number(a.favourite) || a.takenAt.localeCompare(b.takenAt))) {
        const list = byDay.get(p.takenAt);
        if (list) list.push(p);
        else byDay.set(p.takenAt, [p]);
    }
    const days = [...byDay.keys()].sort();
    const out: Photo[] = [];
    // Round-robin the days so a reel of a summer is not four days of one beach.
    for (let round = 0; out.length < limit; round++) {
        let added = false;
        for (const d of days) {
            const p = byDay.get(d)?.[round];
            if (!p) continue;
            out.push(p);
            added = true;
            if (out.length >= limit) break;
        }
        if (!added) break;
    }
    return out;
}

// ---------------------------------------------------------------------------
// Dashboard, nudges, grounding, search
// ---------------------------------------------------------------------------

export function dashboard(state: MemoriesState, ctx: RepoContext): DashboardContribution {
    const agenda: AgendaItem[] = [];
    const attention: AttentionItem[] = [];
    const rings: ProgressRing[] = [];
    const childCards: ChildCard[] = [];
    if (!canView(ctx)) return {};

    const otd = onThisDay(state, ctx.today);
    // The year that has something to SAY beats the most recent year: "Tobi's
    // first swim, 2022" is a memory; "a picture from last September" is not.
    const top = otd.find((d) => d.events.length) ?? otd[0];
    if (top) {
        const what = top.events[0]?.title ?? top.photos[0]?.caption ?? `${top.photos.length} pictures`;
        agenda.push({
            id: "memories-on-this-day",
            moduleId: "memories",
            area: "create",
            title: `On this day, ${top.year}: ${what}`,
            meta: `Memories · ${top.yearsAgo} ${top.yearsAgo === 1 ? "year" : "years"} ago`,
            memberId: null,
            at: null,
            done: false,
            href: timelineHref,
            sort: 2200,
        });
    }

    for (const a of anniversaries(state, ctx.today).slice(0, 2)) {
        const y = yearOf(ctx.today) - yearOf(a.date);
        attention.push({
            id: `memories-anniversary-${a.id}`,
            moduleId: "memories",
            area: "create",
            tone: "celebrate",
            title: `${y} ${y === 1 ? "year" : "years"} today: ${a.title}`,
            body: a.body || "Worth telling the children about at dinner.",
            href: timelineHref,
            weight: 42,
        });
    }

    const q = quota(state);
    if (q.tight && ctx.role === "parent") {
        attention.push({
            id: "memories-quota",
            moduleId: "memories",
            area: "create",
            tone: "warn",
            title: `The library is ${q.pct}% full`,
            body: `${q.used} of ${q.limit} on ${MEDIA_PLANS[state.plan].name}. Tidy the duplicates or move up a plan.`,
            href: HREF,
            weight: 30,
        });
    }

    const draft = state.reels.find((r) => r.status === "draft" && framesOf(state, r.id).length > 0);
    if (draft && canManage(ctx)) {
        attention.push({
            id: `memories-draft-${draft.id}`,
            moduleId: "memories",
            area: "create",
            tone: "info",
            title: `"${draft.title}" is waiting for you`,
            body: `${framesOf(state, draft.id).length} frames drafted. Watch it, change what you want, then share it.`,
            href: reelHref(draft.id),
            weight: 26,
        });
    }

    const s = stats(state, ctx.today);
    if (s.photos > 0 && ctx.role !== "guest") {
        rings.push({
            id: "memories-year",
            moduleId: "memories",
            area: "create",
            label: "Our year in pictures",
            pct: pct(s.monthsThisYear, 12),
            sub: `${s.monthsThisYear} of 12 months have a picture`,
            href: timelineHref,
        });
    }

    if (ctx.role === "child") {
        if (top) {
            childCards.push({
                id: "memories-child-otd",
                moduleId: "memories",
                area: "create",
                title: "On this day",
                body: `${top.yearsAgo} ${top.yearsAgo === 1 ? "year" : "years"} ago today — ${top.events[0]?.title ?? top.photos[0]?.caption ?? "look at this"}.`,
                emoji: "📸",
                href: timelineHref,
            });
        }
        const ready = state.reels.filter((r) => r.status === "ready");
        if (ready.length) {
            childCards.push({
                id: "memories-child-reel",
                moduleId: "memories",
                area: "create",
                title: "Watch a memory reel",
                body: `"${ready[0].title}" — ${runTime(reelMs(state, ready[0]))}.`,
                emoji: "🎞️",
                href: playHref(ready[0].id),
            });
        }
    }

    return { agenda, attention, rings, childCards };
}

export function nudges(state: MemoriesState, ctx: RepoContext): Nudge[] {
    if (!canManage(ctx)) return [];
    const out: Nudge[] = [];

    const otd = onThisDay(state, ctx.today)[0];
    if (otd) {
        out.push({
            key: `memories-otd-${ctx.today}`,
            moduleId: "memories",
            kind: "celebrate",
            title: `On this day, ${otd.year}`,
            body: otd.events[0]?.title ?? `${otd.photos.length} pictures from ${otd.yearsAgo} years ago today.`,
            href: timelineHref,
            memberIds: [],
        });
    }

    for (const r of state.reels) {
        if (r.status !== "draft" || framesOf(state, r.id).length === 0) continue;
        out.push({
            key: `memories-reel-draft-${r.id}`,
            moduleId: "memories",
            kind: "celebrate",
            title: `"${r.title}" is drafted`,
            body: `${framesOf(state, r.id).length} frames, ${runTime(reelMs(state, r))}. Have a look before you share it.`,
            href: reelHref(r.id),
            memberIds: [],
        });
    }

    for (const l of state.links) {
        if (linkState(l) !== "live") continue;
        const days = daysBetween(ctx.today, l.expiresAt.slice(0, 10));
        if (days > 3) continue;
        const name = l.objectType === "reel" ? reelById(state, l.objectId)?.title : albumById(state, l.objectId)?.title;
        if (!name) continue;
        out.push({
            key: `memories-link-expiring-${l.id}`,
            moduleId: "memories",
            kind: "family",
            title: `The link to "${name}" expires ${days <= 0 ? "today" : `in ${days} days`}`,
            body: `Opened ${l.views} ${l.views === 1 ? "time" : "times"}. Extend it or let it lapse — it stops working either way.`,
            href: l.objectType === "reel" ? reelHref(l.objectId) : albumHref(l.objectId),
            memberIds: [],
        });
    }

    return out;
}

export function aiContext(state: MemoriesState, ctx: RepoContext): string {
    if (!canView(ctx) || !state.photos.length) return "";
    const s = stats(state, ctx.today);
    const parts: string[] = [
        `${s.photos} pictures in ${s.albums} albums${s.firstYear ? `, ${s.firstYear}–${s.lastYear}` : ""}. Reels: ${state.reels.map((r) => `"${r.title}" (${framesOf(state, r.id).length} frames, ${r.status})`).join("; ") || "none"}.`,
        `Albums: ${albumsOf(state).slice(0, 9).map((a) => `"${a.title}" (${albumCount(state, a.id)} pictures, ${albumDates(a)})`).join("; ")}.`,
    ];
    const otd = onThisDay(state, ctx.today)[0];
    if (otd) parts.push(`On this day ${otd.year}: ${otd.events.map((e) => e.title).join("; ") || otd.photos.slice(0, 3).map((p) => p.caption).join("; ")}.`);
    const recent = state.timeline.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
    if (recent.length) parts.push(`Recent timeline: ${recent.map((e) => `${e.date} ${TIMELINE_LABEL[e.type]} — ${e.title}`).join("; ")}.`);
    if (ctx.role === "parent") parts.push(`Library is ${quota(state).pct}% of the ${MEDIA_PLANS[state.plan].name} plan.`);
    return parts.join(" ").slice(0, 1500);
}

export function search(state: MemoriesState, q: string): Array<{ title: string; meta: string; href: string }> {
    const n = q.toLowerCase();
    const hits: Array<{ title: string; meta: string; href: string }> = [];
    for (const a of state.albums) {
        if (a.title.toLowerCase().includes(n) || a.description.toLowerCase().includes(n)) hits.push({ title: a.title, meta: `Album · ${albumCount(state, a.id)} pictures`, href: albumHref(a.id) });
    }
    for (const r of state.reels) {
        if (r.title.toLowerCase().includes(n) || r.subtitle.toLowerCase().includes(n)) hits.push({ title: r.title, meta: `Reel · ${framesOf(state, r.id).length} frames`, href: reelHref(r.id) });
    }
    for (const e of state.timeline) {
        if (e.title.toLowerCase().includes(n) || e.body.toLowerCase().includes(n)) hits.push({ title: e.title, meta: `${TIMELINE_EMOJI[e.type]} ${TIMELINE_LABEL[e.type]} · ${shortDate(e.date)}`, href: e.href || timelineHref });
    }
    for (const p of state.photos) {
        if (!p.caption.toLowerCase().includes(n) && !p.place.toLowerCase().includes(n) && !p.tags.some((t) => t.includes(n))) continue;
        const album = albumsWith(state, p.id)[0];
        hits.push({ title: p.caption || "A picture", meta: `Photo · ${p.place || shortDate(p.takenAt)}`, href: album ? albumHref(album.id) : HREF });
        if (hits.length > 30) break;
    }
    // One row per destination: an album and its timeline entry are one answer.
    const seen = new Set<string>();
    return hits.filter((h) => (seen.has(h.href) ? false : (seen.add(h.href), true))).slice(0, 12);
}

// ---------------------------------------------------------------------------
// Auto-drafting — shared by both repos so the rule exists once
// ---------------------------------------------------------------------------

/** True on or after 1 December, which is when "Our year" drafts itself (AC 8). */
export const isDraftSeason = (today: string): boolean => today.slice(5) >= "12-01";

/** The year the December draft covers. */
export const ourYearFor = (today: string): number => yearOf(today);

/**
 * The frames of an "Our year" reel: the year's timeline pictures first (a
 * celebration with a photo is the year's story), then the best of the rest,
 * always in the order it happened.
 */
export function ourYearFrames(state: MemoriesState, year: number, limit: number): Array<{ photoId: string; caption: string }> {
    const from = `${year}-01-01`;
    const to = `${year}-12-31`;
    const chosen = new Map<string, string>();
    for (const e of state.timeline.filter((t) => t.date >= from && t.date <= to && t.photoId).sort((a, b) => a.date.localeCompare(b.date))) {
        if (e.photoId && !chosen.has(e.photoId)) chosen.set(e.photoId, e.title);
    }
    for (const p of bestOf(state, from, to, limit)) {
        if (chosen.size >= limit) break;
        if (!chosen.has(p.id)) chosen.set(p.id, p.caption);
    }
    const order = new Map(state.photos.map((p) => [p.id, p.takenAt]));
    return [...chosen.entries()]
        .sort((a, b) => (order.get(a[0]) ?? "").localeCompare(order.get(b[0]) ?? ""))
        .slice(0, limit)
        .map(([photoId, caption]) => ({ photoId, caption }));
}

/** The title a trip album gets when it makes itself (AC 9). */
export const tripAlbumTitle = (title: string, endDate: string): string => `${title} — ${new Date(`${endDate}T00:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`;

export const todayIso = (): string => isoDate();
