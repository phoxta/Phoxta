import type { RepoContext } from "@/data/core";
import { seedContext } from "@/data/coreSeed";
import { uid } from "@/lib/format";
import { canContribute, canManage, isDraftSeason, ourYearFor, ourYearFrames, tripAlbumTitle, visibleTo } from "./derive";
import { seed } from "./seed";
import {
    MEDIA_PLANS,
    SHARE_LINK_DAYS,
    type Album,
    type AlbumPatch,
    type MemoriesRepo,
    type MemoriesState,
    type NewAlbum,
    type NewPhoto,
    type NewReel,
    type NewTimelineEvent,
    type Photo,
    type PhotoPatch,
    type PlanTier,
    type Reel,
    type ReelPatch,
    type ShareLink,
    type ShareObjectType,
    type SharedView,
    type StudioStorySlice,
    type TimelineEvent,
    type TripSlice,
} from "./types";

/**
 * Memories in the browser — every write real, every rule the live one's rule.
 *
 * The blob holds the family's WHOLE library; `load()` runs the same `visibleTo`
 * filter the Supabase repo runs, so switching "view as" to Tobi genuinely
 * removes the private album, and switching to Mama Fọláké leaves exactly the
 * three objects she was granted and nothing else.
 *
 * Two writes here are the product's own decisions rather than a member's, and
 * both are idempotent so they can run on every load without ever doubling up:
 * a trip that has come home gets its album (AC 9), and from 1 December the
 * year's reel drafts itself out of the timeline (AC 8).
 *
 * `openShared` is the deliberate exception to the filter: a token IS the
 * permission, so it reads the unfiltered store — and returns only the one
 * object it names, its frames and their pictures. Nothing else, ever.
 */

const KEY = "wafe:demo:memories:v2";
const now = (): string => new Date().toISOString();

function isState(v: unknown): v is MemoriesState {
    if (!v || typeof v !== "object") return false;
    const s = v as Partial<MemoriesState>;
    return Array.isArray(s.photos) && Array.isArray(s.albums) && Array.isArray(s.reels) && Array.isArray(s.frames) && Array.isArray(s.timeline);
}

export class LocalMemoriesRepo implements MemoriesRepo {
    private cache: MemoriesState | null = null;

    constructor(private ctx: RepoContext) {}

    // -- storage -------------------------------------------------------------

    private all(): MemoriesState {
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

    private save(s: MemoriesState): void {
        s.usedBytes = s.photos.reduce((n, p) => n + p.bytes, 0);
        s.totalPhotos = s.photos.length;
        this.cache = s;
        try {
            localStorage.setItem(KEY, JSON.stringify(s));
        } catch {
            // Private mode, or the library outgrew the browser's five megabytes.
            // The demo carries on in memory; only persistence is lost.
        }
    }

    private write<T>(mutate: (s: MemoriesState) => T): T {
        const next = structuredClone(this.all());
        const out = mutate(next);
        this.save(next);
        return out;
    }

    private deny(): never {
        throw new Error("Not allowed");
    }

    private manage(): void {
        if (!canManage(this.ctx)) this.deny();
    }

    private album(s: MemoriesState, id: string): Album {
        const a = s.albums.find((x) => x.id === id);
        if (!a) throw new Error("That album is no longer here");
        return a;
    }

    private reel(s: MemoriesState, id: string): Reel {
        const r = s.reels.find((x) => x.id === id);
        if (!r) throw new Error("That reel is no longer here");
        return r;
    }

    /** A picture is the owner's, or a manager's, to change. */
    private ownPhoto(s: MemoriesState, id: string): Photo {
        const p = s.photos.find((x) => x.id === id);
        if (!p) throw new Error("That picture is no longer here");
        if (!canManage(this.ctx) && p.addedBy !== this.ctx.me.id) this.deny();
        return p;
    }

    private reorder(s: MemoriesState, albumId: string): void {
        s.albumPhotos
            .filter((ap) => ap.albumId === albumId)
            .sort((a, b) => a.order - b.order)
            .forEach((ap, i) => {
                ap.order = i;
            });
    }

    private reframe(s: MemoriesState, reelId: string): void {
        s.frames
            .filter((f) => f.reelId === reelId)
            .sort((a, b) => a.order - b.order)
            .forEach((f, i) => {
                f.order = i;
            });
    }

    // -- load ----------------------------------------------------------------

    /** AC 8 — on or after 1 December, the year's reel writes itself. Once. */
    private autoDraftOurYear(s: MemoriesState): boolean {
        if (!canManage(this.ctx) || !isDraftSeason(this.ctx.today)) return false;
        const year = ourYearFor(this.ctx.today);
        const existing = s.reels.find((r) => r.autoKind === "our_year" && r.title.includes(String(year)));
        if (existing && s.frames.some((f) => f.reelId === existing.id)) return false;
        const picked = ourYearFrames(s, year, Math.min(60, MEDIA_PLANS[s.plan].maxFrames));
        if (!picked.length) return false;
        const reel = existing ?? this.newReelRow(s, { title: `Our year ${year}`, subtitle: "Drafted from this year's timeline", autoKind: "our_year", photoIds: [], status: "draft" });
        reel.status = "draft";
        reel.scheduledFor = null;
        reel.coverPhotoId = picked[0]?.photoId ?? null;
        picked.forEach((p, order) => {
            s.frames.push({ id: uid("mfr"), reelId: reel.id, photoId: p.photoId, caption: p.caption, durationMs: null, order });
        });
        return true;
    }

    async load(): Promise<MemoriesState> {
        const s = structuredClone(this.all());
        if (this.autoDraftOurYear(s)) this.save(structuredClone(s));
        return visibleTo(s, this.ctx);
    }

    // -- photos --------------------------------------------------------------

    async addPhotos(input: NewPhoto[], albumId: string | null): Promise<Photo[]> {
        const album = albumId ? this.all().albums.find((a) => a.id === albumId) : undefined;
        if (!canContribute(this.ctx, album)) this.deny();
        return this.write((s) => {
            const made: Photo[] = [];
            let order = s.albumPhotos.filter((ap) => ap.albumId === albumId).length;
            for (const p of input) {
                const photo: Photo = {
                    id: uid("mph"),
                    spaceId: this.ctx.space.id,
                    url: p.url,
                    posterUrl: p.posterUrl ?? null,
                    kind: p.kind,
                    format: p.format,
                    caption: p.caption,
                    takenAt: p.takenAt,
                    place: p.place,
                    peopleIds: p.peopleIds,
                    tags: p.tags,
                    addedBy: this.ctx.me.id,
                    favourite: p.favourite ?? false,
                    visibility: p.visibility ?? "child",
                    sharedWith: p.sharedWith ?? [],
                    childSafe: p.childSafe ?? true,
                    width: p.width,
                    height: p.height,
                    bytes: p.bytes,
                    needsConversion: p.needsConversion ?? false,
                    createdAt: now(),
                };
                s.photos.push(photo);
                made.push(photo);
                if (albumId) s.albumPhotos.push({ id: uid("map"), albumId, photoId: photo.id, caption: "", order: order++ });
            }
            if (albumId) {
                const a = this.album(s, albumId);
                if (!a.coverPhotoId) a.coverPhotoId = made[0]?.id ?? null;
                for (const m of made) {
                    if (m.takenAt < a.dateFrom) a.dateFrom = m.takenAt;
                    if (m.takenAt > a.dateTo) a.dateTo = m.takenAt;
                }
            }
            return made;
        });
    }

    async updatePhoto(id: string, patch: PhotoPatch): Promise<void> {
        this.write((s) => Object.assign(this.ownPhoto(s, id), patch));
    }

    async toggleFavourite(id: string): Promise<void> {
        this.write((s) => {
            const p = this.ownPhoto(s, id);
            p.favourite = !p.favourite;
        });
    }

    async removePhoto(id: string): Promise<void> {
        this.write((s) => {
            this.ownPhoto(s, id);
            s.photos = s.photos.filter((p) => p.id !== id);
            s.albumPhotos = s.albumPhotos.filter((ap) => ap.photoId !== id);
            s.frames = s.frames.filter((f) => f.photoId !== id);
            for (const a of s.albums) if (a.coverPhotoId === id) a.coverPhotoId = null;
            for (const r of s.reels) if (r.coverPhotoId === id) r.coverPhotoId = null;
            for (const e of s.timeline) if (e.photoId === id) e.photoId = null;
        });
    }

    // -- albums --------------------------------------------------------------

    async addAlbum(input: NewAlbum): Promise<Album> {
        this.manage();
        return this.write((s) => this.newAlbumRow(s, input));
    }

    private newAlbumRow(s: MemoriesState, input: NewAlbum, auto = false): Album {
        const album: Album = {
            id: uid("alb"),
            spaceId: this.ctx.space.id,
            title: input.title,
            description: input.description ?? "",
            coverPhotoId: input.coverPhotoId ?? null,
            dateFrom: input.dateFrom,
            dateTo: input.dateTo,
            visibility: input.visibility ?? "child",
            sharedWith: input.sharedWith ?? [],
            childSafe: input.childSafe ?? true,
            ownerMemberId: this.ctx.me.id,
            contributorIds: input.contributorIds ?? [],
            tripId: input.tripId ?? null,
            auto,
            createdAt: now(),
        };
        s.albums.push(album);
        return album;
    }

    async updateAlbum(id: string, patch: AlbumPatch): Promise<void> {
        this.write((s) => {
            const a = this.album(s, id);
            if (!canManage(this.ctx) && a.ownerMemberId !== this.ctx.me.id) this.deny();
            Object.assign(a, patch);
        });
    }

    async removeAlbum(id: string): Promise<void> {
        this.manage();
        this.write((s) => {
            s.albums = s.albums.filter((a) => a.id !== id);
            s.albumPhotos = s.albumPhotos.filter((ap) => ap.albumId !== id);
            s.shares = s.shares.filter((x) => !(x.objectType === "album" && x.objectId === id));
            s.links = s.links.filter((x) => !(x.objectType === "album" && x.objectId === id));
            s.timeline = s.timeline.filter((e) => !(e.type === "album" && e.sourceId === id));
        });
    }

    async addToAlbum(albumId: string, photoIds: string[]): Promise<void> {
        const album = this.all().albums.find((a) => a.id === albumId);
        if (!canContribute(this.ctx, album)) this.deny();
        this.write((s) => {
            let order = s.albumPhotos.filter((ap) => ap.albumId === albumId).length;
            for (const photoId of photoIds) {
                if (s.albumPhotos.some((ap) => ap.albumId === albumId && ap.photoId === photoId)) continue;
                s.albumPhotos.push({ id: uid("map"), albumId, photoId, caption: "", order: order++ });
            }
            const a = this.album(s, albumId);
            if (!a.coverPhotoId) a.coverPhotoId = photoIds[0] ?? null;
        });
    }

    async removeFromAlbum(albumId: string, photoId: string): Promise<void> {
        const album = this.all().albums.find((a) => a.id === albumId);
        if (!canContribute(this.ctx, album)) this.deny();
        this.write((s) => {
            s.albumPhotos = s.albumPhotos.filter((ap) => !(ap.albumId === albumId && ap.photoId === photoId));
            const a = this.album(s, albumId);
            if (a.coverPhotoId === photoId) a.coverPhotoId = s.albumPhotos.find((ap) => ap.albumId === albumId)?.photoId ?? null;
            this.reorder(s, albumId);
        });
    }

    async moveInAlbum(albumId: string, photoId: string, delta: number): Promise<void> {
        const album = this.all().albums.find((a) => a.id === albumId);
        if (!canContribute(this.ctx, album)) this.deny();
        this.write((s) => {
            const rows = s.albumPhotos.filter((ap) => ap.albumId === albumId).sort((a, b) => a.order - b.order);
            const i = rows.findIndex((ap) => ap.photoId === photoId);
            const j = i + delta;
            if (i < 0 || j < 0 || j >= rows.length) return;
            [rows[i].order, rows[j].order] = [rows[j].order, rows[i].order];
            this.reorder(s, albumId);
        });
    }

    /**
     * AC 9 — a trip that has come home gets its album. Matched on `tripId`, so
     * running it on every load is free and can never make a second one.
     */
    async ensureTripAlbums(trips: TripSlice[]): Promise<string[]> {
        if (!canManage(this.ctx)) return [];
        const ended = trips.filter((t) => t.status === "done" && t.endDate && t.endDate <= this.ctx.today);
        if (!ended.length) return [];
        return this.write((s) => {
            const made: string[] = [];
            for (const t of ended) {
                if (s.albums.some((a) => a.tripId === t.id)) continue;
                const album = this.newAlbumRow(
                    s,
                    {
                        title: tripAlbumTitle(t.title, t.endDate as string),
                        description: `Made for us when we came home from ${t.destination}. Add the pictures — they are all still on everyone's phones.`,
                        dateFrom: t.startDate ?? (t.endDate as string),
                        dateTo: t.endDate as string,
                        tripId: t.id,
                        visibility: "child",
                        childSafe: true,
                    },
                    true,
                );
                const ev: TimelineEvent = {
                    id: uid("mtl"),
                    spaceId: this.ctx.space.id,
                    date: t.endDate as string,
                    type: "album",
                    sourceId: album.id,
                    title: album.title,
                    body: `We came home from ${t.destination}.`,
                    photoId: null,
                    memberIds: [],
                    href: `/create/memories/albums/${album.id}`,
                    visibility: "child",
                    sharedWith: [],
                    childSafe: true,
                    imported: false,
                    createdAt: now(),
                };
                s.timeline.push(ev);
                made.push(album.id);
            }
            return made;
        });
    }

    // -- timeline ------------------------------------------------------------

    async addTimelineEvent(input: NewTimelineEvent): Promise<TimelineEvent> {
        this.manage();
        return this.write((s) => {
            const e: TimelineEvent = { ...input, id: uid("mtl"), spaceId: this.ctx.space.id, createdAt: now() };
            s.timeline.push(e);
            return e;
        });
    }

    async removeTimelineEvent(id: string): Promise<void> {
        this.manage();
        this.write((s) => {
            s.timeline = s.timeline.filter((e) => e.id !== id);
        });
    }

    async importTimeline(events: NewTimelineEvent[]): Promise<number> {
        this.manage();
        return this.write((s) => {
            const seen = new Set(s.timeline.filter((e) => e.sourceId).map((e) => `${e.type}:${e.sourceId}`));
            let n = 0;
            for (const e of events) {
                if (!e.sourceId || seen.has(`${e.type}:${e.sourceId}`)) continue;
                seen.add(`${e.type}:${e.sourceId}`);
                s.timeline.push({ ...e, id: uid("mtl"), spaceId: this.ctx.space.id, createdAt: now() });
                n++;
            }
            return n;
        });
    }

    // -- reels ---------------------------------------------------------------

    private newReelRow(s: MemoriesState, input: NewReel): Reel {
        const plan = MEDIA_PLANS[s.plan];
        if (s.reels.length >= plan.maxReels) throw new Error(`The ${plan.name} plan keeps ${plan.maxReels} reels. Remove one, or move up a plan.`);
        const ids = input.photoIds.slice(0, plan.maxFrames);
        const reel: Reel = {
            id: uid("reel"),
            spaceId: this.ctx.space.id,
            title: input.title,
            subtitle: input.subtitle ?? "",
            mood: input.mood ?? "warm",
            transition: input.transition ?? "crossfade",
            slideMs: input.slideMs ?? 4000,
            status: input.status ?? "draft",
            autoKind: input.autoKind ?? "custom",
            trackTitle: input.trackTitle ?? "",
            trackNote: input.trackNote ?? "",
            trackItemId: input.trackItemId ?? null,
            coverPhotoId: ids[0] ?? null,
            ownerMemberId: this.ctx.me.id,
            visibility: input.visibility ?? "child",
            sharedWith: input.sharedWith ?? [],
            childSafe: input.childSafe ?? true,
            scheduledFor: null,
            storyboardId: input.storyboardId ?? null,
            createdAt: now(),
        };
        s.reels.push(reel);
        ids.forEach((photoId, order) => {
            s.frames.push({ id: uid("mfr"), reelId: reel.id, photoId, caption: input.captions?.[photoId] ?? "", durationMs: null, order });
        });
        return reel;
    }

    async addReel(input: NewReel): Promise<Reel> {
        this.manage();
        return this.write((s) => this.newReelRow(s, input));
    }

    async updateReel(id: string, patch: ReelPatch): Promise<void> {
        this.write((s) => {
            const r = this.reel(s, id);
            if (!canManage(this.ctx) && r.ownerMemberId !== this.ctx.me.id) this.deny();
            Object.assign(r, patch);
        });
    }

    async removeReel(id: string): Promise<void> {
        this.manage();
        this.write((s) => {
            s.reels = s.reels.filter((r) => r.id !== id);
            s.frames = s.frames.filter((f) => f.reelId !== id);
            s.shares = s.shares.filter((x) => !(x.objectType === "reel" && x.objectId === id));
            s.links = s.links.filter((x) => !(x.objectType === "reel" && x.objectId === id));
        });
    }

    async setFrames(reelId: string, list: Array<{ photoId: string; caption?: string; durationMs?: number | null }>): Promise<void> {
        this.manage();
        this.write((s) => {
            const plan = MEDIA_PLANS[s.plan];
            const reel = this.reel(s, reelId);
            s.frames = s.frames.filter((f) => f.reelId !== reelId);
            list.slice(0, plan.maxFrames).forEach((f, order) => {
                s.frames.push({ id: uid("mfr"), reelId, photoId: f.photoId, caption: f.caption ?? "", durationMs: f.durationMs ?? null, order });
            });
            if (!reel.coverPhotoId) reel.coverPhotoId = list[0]?.photoId ?? null;
        });
    }

    async updateFrame(frameId: string, patch: Partial<{ caption: string; durationMs: number | null }>): Promise<void> {
        this.manage();
        this.write((s) => {
            const f = s.frames.find((x) => x.id === frameId);
            if (!f) throw new Error("That frame is no longer here");
            Object.assign(f, patch);
        });
    }

    async moveFrame(frameId: string, delta: number): Promise<void> {
        this.manage();
        this.write((s) => {
            const f = s.frames.find((x) => x.id === frameId);
            if (!f) return;
            const rows = s.frames.filter((x) => x.reelId === f.reelId).sort((a, b) => a.order - b.order);
            const i = rows.findIndex((x) => x.id === frameId);
            const j = i + delta;
            if (j < 0 || j >= rows.length) return;
            [rows[i].order, rows[j].order] = [rows[j].order, rows[i].order];
            this.reframe(s, f.reelId);
        });
    }

    async removeFrame(frameId: string): Promise<void> {
        this.manage();
        this.write((s) => {
            const f = s.frames.find((x) => x.id === frameId);
            if (!f) return;
            s.frames = s.frames.filter((x) => x.id !== frameId);
            this.reframe(s, f.reelId);
        });
    }

    async publishReel(id: string): Promise<void> {
        this.manage();
        this.write((s) => {
            const r = this.reel(s, id);
            if (!s.frames.some((f) => f.reelId === id)) throw new Error("A reel needs at least one picture before it is ready");
            r.status = "ready";
            r.scheduledFor = null;
        });
    }

    async reelFromAlbum(albumId: string, title?: string): Promise<string> {
        this.manage();
        return this.write((s) => {
            const a = this.album(s, albumId);
            const plan = MEDIA_PLANS[s.plan];
            const rows = s.albumPhotos.filter((ap) => ap.albumId === albumId).sort((x, y) => x.order - y.order);
            const kinds = new Map(s.photos.map((p) => [p.id, p.kind]));
            const ids = rows.map((r) => r.photoId).filter((id) => kinds.get(id) === "photo").slice(0, plan.maxFrames);
            if (!ids.length) throw new Error("That album has no pictures to make a reel from");
            const captions: Record<string, string> = {};
            for (const r of rows) if (r.caption) captions[r.photoId] = r.caption;
            const reel = this.newReelRow(s, {
                title: title || a.title,
                subtitle: a.description.slice(0, 90),
                photoIds: ids,
                captions,
                mood: "warm",
                autoKind: a.tripId ? "trip" : "custom",
                status: "draft",
                visibility: a.visibility,
                sharedWith: a.sharedWith,
                childSafe: a.childSafe,
            });
            return reel.id;
        });
    }

    async draftOurYear(year: number): Promise<string | null> {
        this.manage();
        return this.write((s) => {
            const picked = ourYearFrames(s, year, Math.min(60, MEDIA_PLANS[s.plan].maxFrames));
            if (!picked.length) return null;
            const existing = s.reels.find((r) => r.autoKind === "our_year" && r.title.includes(String(year)));
            const reel = existing ?? this.newReelRow(s, { title: `Our year ${year}`, subtitle: `Drafted from the ${year} timeline`, autoKind: "our_year", photoIds: [], status: "draft", mood: "warm", slideMs: 4000 });
            s.frames = s.frames.filter((f) => f.reelId !== reel.id);
            picked.forEach((p, order) => {
                s.frames.push({ id: uid("mfr"), reelId: reel.id, photoId: p.photoId, caption: p.caption, durationMs: null, order });
            });
            reel.status = "draft";
            reel.scheduledFor = null;
            reel.coverPhotoId = picked[0].photoId;
            return reel.id;
        });
    }

    async reelFromStoryboard(story: StudioStorySlice): Promise<string> {
        this.manage();
        return this.write((s) => {
            const existing = s.reels.find((r) => r.storyboardId === story.id);
            const scenes = (story.data.scenes ?? []).filter((sc) => sc.imageUrl);
            if (!scenes.length) throw new Error("That storyboard has no pictures yet");
            // The scenes' images become pictures in the library, once.
            const ids: string[] = [];
            const captions: Record<string, string> = {};
            for (const sc of scenes) {
                let photo = s.photos.find((p) => p.url === sc.imageUrl);
                if (!photo) {
                    photo = {
                        id: uid("mph"),
                        spaceId: this.ctx.space.id,
                        url: sc.imageUrl as string,
                        posterUrl: null,
                        kind: "photo",
                        format: "png",
                        caption: sc.caption,
                        takenAt: story.createdAt.slice(0, 10),
                        place: "",
                        peopleIds: [],
                        tags: ["storyboard"],
                        addedBy: story.memberId,
                        favourite: false,
                        visibility: "child",
                        sharedWith: [],
                        childSafe: true,
                        width: 1024,
                        height: 1024,
                        bytes: 900_000,
                        needsConversion: false,
                        createdAt: now(),
                    };
                    s.photos.push(photo);
                }
                ids.push(photo.id);
                captions[photo.id] = sc.caption;
            }
            if (existing) {
                s.frames = s.frames.filter((f) => f.reelId !== existing.id);
                ids.forEach((photoId, order) => {
                    s.frames.push({ id: uid("mfr"), reelId: existing.id, photoId, caption: captions[photoId] ?? "", durationMs: 5000, order });
                });
                existing.coverPhotoId = ids[0];
                return existing.id;
            }
            const reel = this.newReelRow(s, {
                title: story.title,
                subtitle: "A storyboard, played as a reel",
                photoIds: ids,
                captions,
                mood: "calm",
                slideMs: 5000,
                autoKind: "storyboard",
                storyboardId: story.id,
                status: "ready",
            });
            return reel.id;
        });
    }

    // -- sharing -------------------------------------------------------------

    async grant(objectType: ShareObjectType, objectId: string, memberIds: string[]): Promise<void> {
        this.manage();
        this.write((s) => {
            s.shares = s.shares.filter((x) => !(x.objectType === objectType && x.objectId === objectId));
            for (const memberId of memberIds) {
                s.shares.push({ id: uid("msh"), spaceId: this.ctx.space.id, objectType, objectId, memberId, grantedBy: this.ctx.me.id, createdAt: now() });
            }
        });
    }

    async revokeGrant(shareId: string): Promise<void> {
        this.manage();
        this.write((s) => {
            s.shares = s.shares.filter((x) => x.id !== shareId);
        });
    }

    async createLink(objectType: ShareObjectType, objectId: string, days = SHARE_LINK_DAYS): Promise<ShareLink> {
        this.manage();
        return this.write((s) => {
            const plan = MEDIA_PLANS[s.plan];
            const live = s.links.filter((l) => !l.revokedAt && l.expiresAt > now()).length;
            if (live >= plan.maxLinks) throw new Error(`The ${plan.name} plan keeps ${plan.maxLinks} live links. Revoke one first.`);
            const expires = new Date();
            expires.setDate(expires.getDate() + days);
            const link: ShareLink = {
                id: uid("mln"),
                spaceId: this.ctx.space.id,
                objectType,
                objectId,
                token: uid("t").replace(/[^a-z0-9]/gi, "").slice(0, 22),
                createdBy: this.ctx.me.id,
                createdAt: now(),
                expiresAt: expires.toISOString(),
                revokedAt: null,
                views: 0,
                lastViewedAt: null,
            };
            s.links.push(link);
            return link;
        });
    }

    async revokeLink(linkId: string): Promise<void> {
        this.manage();
        this.write((s) => {
            const l = s.links.find((x) => x.id === linkId);
            if (l) l.revokedAt = now();
        });
    }

    /**
     * A token reaches past `visibleTo` — that is what a share link IS — and no
     * further than the object it names. Expired or revoked returns null, which
     * is what makes AC 7 something you can watch happen.
     */
    async openShared(token: string): Promise<SharedView | null> {
        return this.write((s) => {
            const link = s.links.find((l) => l.token === token);
            if (!link || link.revokedAt || link.expiresAt <= now()) return null;
            link.views += 1;
            link.lastViewedAt = now();
            const by = this.ctx.members.find((m) => m.id === link.createdBy)?.name ?? this.ctx.space.name;
            if (link.objectType === "reel") {
                const reel = s.reels.find((r) => r.id === link.objectId);
                if (!reel) return null;
                const frames = s.frames.filter((f) => f.reelId === reel.id).sort((a, b) => a.order - b.order);
                const ids = new Set(frames.map((f) => f.photoId));
                if (reel.coverPhotoId) ids.add(reel.coverPhotoId);
                return { objectType: "reel", album: null, reel, frames, photos: s.photos.filter((p) => ids.has(p.id)), expiresAt: link.expiresAt, sharedBy: by };
            }
            const album = s.albums.find((a) => a.id === link.objectId);
            if (!album) return null;
            const ids = new Set(s.albumPhotos.filter((ap) => ap.albumId === album.id).map((ap) => ap.photoId));
            if (album.coverPhotoId) ids.add(album.coverPhotoId);
            return { objectType: "album", album, reel: null, frames: [], photos: s.photos.filter((p) => ids.has(p.id)), expiresAt: link.expiresAt, sharedBy: by };
        });
    }

    // -- plan ----------------------------------------------------------------

    async setPlan(plan: PlanTier): Promise<void> {
        if (this.ctx.role !== "parent") this.deny();
        this.write((s) => {
            s.plan = plan;
        });
    }
}
