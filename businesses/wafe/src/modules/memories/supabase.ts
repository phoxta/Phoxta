import type { RepoContext, Visibility } from "@/data/core";
import { supabase } from "@/lib/supabase";
import { canContribute, canManage, isDraftSeason, ourYearFor, ourYearFrames, tripAlbumTitle, visibleTo } from "./derive";
import {
    MEDIA_PLANS,
    SHARE_LINK_DAYS,
    type Album,
    type AlbumPatch,
    type AlbumPhoto,
    type MediaKind,
    type MemoriesRepo,
    type MemoriesState,
    type NewAlbum,
    type NewPhoto,
    type NewReel,
    type NewTimelineEvent,
    type ObjectShare,
    type Photo,
    type PhotoPatch,
    type PlanTier,
    type Reel,
    type ReelAutoKind,
    type ReelFrame,
    type ReelMood,
    type ReelPatch,
    type ReelStatus,
    type ReelTransition,
    type ShareLink,
    type ShareObjectType,
    type SharedView,
    type SourceFormat,
    type StudioStorySlice,
    type TimelineEvent,
    type TimelineType,
    type TripSlice,
} from "./types";

/**
 * The same library, live, under row-level security.
 *
 * The database is the real guard — `wf_can_see` decides which pictures, albums
 * and reels a session may select, and the guest rule is a policy rather than a
 * filter: a guest's select on `wf_albums` returns only the rows an
 * `wf_object_shares` grant or a live `wf_share_links` token opens. The slice is
 * still run through the same `visibleTo()` the demo uses, so the two modes can
 * never drift, and snake_case ↔ camelCase lives in this file and nowhere else.
 *
 * `openShared` is a security-definer RPC (`wf_open_shared_object`), because a
 * link has to work for someone who is not in the space at all: the function
 * checks the token, counts the view and returns exactly one object with its
 * frames and pictures. There is no policy that would let a stranger read the
 * table directly, and there is no second thing the function will return.
 */

type Row = Record<string, unknown>;

const s = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);
const n = (v: unknown, d = 0): number => (typeof v === "number" ? v : Number(v ?? d) || d);
const nul = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const iso = (v: unknown): string => (v ? new Date(v as string).toISOString() : new Date().toISOString());
const date = (v: unknown, d = ""): string => (typeof v === "string" && v ? v.slice(0, 10) : d);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const vis = (v: unknown): Visibility => (v === "private" || v === "shared" || v === "child" ? v : "family");
const bool = (v: unknown, d = false): boolean => (typeof v === "boolean" ? v : d);

function fail(where: string, error: { message: string } | null | undefined): void {
    if (error) throw new Error(`${where}: ${error.message}`);
}

const mapPhoto = (r: Row): Photo => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    url: s(r.url),
    posterUrl: nul(r.poster_url),
    kind: s(r.kind, "photo") as MediaKind,
    format: s(r.format, "jpeg") as SourceFormat,
    caption: s(r.caption),
    takenAt: date(r.taken_at, date(r.created_at)),
    place: s(r.place),
    peopleIds: strs(r.people_ids),
    tags: strs(r.tags),
    addedBy: s(r.owner_member_id),
    favourite: bool(r.favourite),
    visibility: vis(r.visibility),
    sharedWith: strs(r.shared_with),
    childSafe: bool(r.child_safe, true),
    width: n(r.width, 1600),
    height: n(r.height, 1067),
    bytes: n(r.bytes),
    needsConversion: bool(r.needs_conversion),
    createdAt: iso(r.created_at),
});

const mapAlbum = (r: Row): Album => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    title: s(r.title),
    description: s(r.description),
    coverPhotoId: nul(r.cover_media_id),
    dateFrom: date(r.date_from),
    dateTo: date(r.date_to, date(r.date_from)),
    visibility: vis(r.visibility),
    sharedWith: strs(r.shared_with),
    childSafe: bool(r.child_safe, true),
    ownerMemberId: s(r.owner_member_id),
    contributorIds: strs(r.contributor_member_ids),
    tripId: nul(r.trip_id),
    auto: bool(r.auto),
    createdAt: iso(r.created_at),
});

const mapAlbumPhoto = (r: Row): AlbumPhoto => ({ id: s(r.id), albumId: s(r.album_id), photoId: s(r.media_id), caption: s(r.caption), order: n(r.position) });

const mapEvent = (r: Row): TimelineEvent => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    date: date(r.date),
    type: s(r.type, "album") as TimelineType,
    sourceId: nul(r.source_id),
    title: s(r.title),
    body: s(r.body),
    photoId: nul(r.media_id),
    memberIds: strs(r.member_ids),
    href: s(r.href, "/create/memories/timeline"),
    visibility: vis(r.visibility),
    sharedWith: strs(r.shared_with),
    childSafe: bool(r.child_safe, true),
    imported: bool(r.imported),
    createdAt: iso(r.created_at),
});

const mapReel = (r: Row): Reel => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    title: s(r.title),
    subtitle: s(r.subtitle),
    mood: s(r.mood, "warm") as ReelMood,
    transition: s(r.transition, "crossfade") as ReelTransition,
    slideMs: n(r.slide_ms, 4000),
    status: s(r.status, "draft") as ReelStatus,
    autoKind: s(r.auto_kind, "custom") as ReelAutoKind,
    trackTitle: s(r.track_title),
    trackNote: s(r.track_note),
    trackItemId: nul(r.track_item_id),
    coverPhotoId: nul(r.cover_media_id),
    ownerMemberId: s(r.owner_member_id),
    visibility: vis(r.visibility),
    sharedWith: strs(r.shared_with),
    childSafe: bool(r.child_safe, true),
    scheduledFor: nul(r.scheduled_for),
    storyboardId: nul(r.storyboard_id),
    createdAt: iso(r.created_at),
});

const mapFrame = (r: Row): ReelFrame => ({
    id: s(r.id),
    reelId: s(r.reel_id),
    photoId: s(r.media_id),
    caption: s(r.caption),
    durationMs: r.duration_ms === null || r.duration_ms === undefined ? null : n(r.duration_ms),
    order: n(r.position),
});

const mapShare = (r: Row): ObjectShare => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    objectType: s(r.object_type, "album") as ShareObjectType,
    objectId: s(r.object_id),
    memberId: s(r.member_id),
    grantedBy: s(r.granted_by),
    createdAt: iso(r.created_at),
});

const mapLink = (r: Row): ShareLink => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    objectType: s(r.object_type, "album") as ShareObjectType,
    objectId: s(r.object_id),
    token: s(r.token),
    createdBy: s(r.created_by),
    createdAt: iso(r.created_at),
    expiresAt: iso(r.expires_at),
    revokedAt: r.revoked_at ? iso(r.revoked_at) : null,
    views: n(r.views),
    lastViewedAt: r.last_viewed_at ? iso(r.last_viewed_at) : null,
});

export class SupabaseMemoriesRepo implements MemoriesRepo {
    constructor(private ctx: RepoContext) {}

    private get scope() {
        return { organization_id: this.ctx.orgId, space_id: this.ctx.space.id };
    }

    private deny(): never {
        throw new Error("Not allowed");
    }

    private manage(): void {
        if (!canManage(this.ctx)) this.deny();
    }

    // -- load ----------------------------------------------------------------

    async load(): Promise<MemoriesState> {
        const spaceId = this.ctx.space.id;
        const [media, albums, albumMedia, events, reels, frames, shares, links, plan] = await Promise.all([
            supabase.from("wf_media").select("*").eq("space_id", spaceId).order("taken_at", { ascending: false }),
            supabase.from("wf_albums").select("*").eq("space_id", spaceId),
            supabase.from("wf_album_media").select("*").eq("space_id", spaceId).order("position"),
            supabase.from("wf_timeline_events").select("*").eq("space_id", spaceId).order("date", { ascending: false }),
            supabase.from("wf_reels").select("*").eq("space_id", spaceId),
            supabase.from("wf_reel_frames").select("*").eq("space_id", spaceId).order("position"),
            supabase.from("wf_object_shares").select("*").eq("space_id", spaceId),
            supabase.from("wf_share_links").select("*").eq("space_id", spaceId),
            supabase.from("wf_space_plans").select("tier").eq("space_id", spaceId).maybeSingle(),
        ]);
        fail("photos", media.error);
        fail("albums", albums.error);
        fail("album pictures", albumMedia.error);
        fail("timeline", events.error);
        fail("reels", reels.error);
        fail("frames", frames.error);
        fail("shares", shares.error);
        fail("links", links.error);

        const photos = (media.data ?? []).map(mapPhoto);
        const state: MemoriesState = {
            photos,
            albums: (albums.data ?? []).map(mapAlbum),
            albumPhotos: (albumMedia.data ?? []).map(mapAlbumPhoto),
            timeline: (events.data ?? []).map(mapEvent),
            reels: (reels.data ?? []).map(mapReel),
            frames: (frames.data ?? []).map(mapFrame),
            shares: (shares.data ?? []).map(mapShare),
            links: (links.data ?? []).map(mapLink),
            plan: (s(plan.data?.tier, "household") as PlanTier) ?? "household",
            usedBytes: photos.reduce((t, p) => t + p.bytes, 0),
            totalPhotos: photos.length,
        };

        // AC 8 — the December draft. A parent's session runs it; it is
        // idempotent, so whichever parent opens the app first does the work.
        if (canManage(this.ctx) && isDraftSeason(this.ctx.today)) {
            const year = ourYearFor(this.ctx.today);
            const existing = state.reels.find((r) => r.autoKind === "our_year" && r.title.includes(String(year)));
            if (!existing || !state.frames.some((f) => f.reelId === existing.id)) {
                const id = await this.draftOurYear(year).catch(() => null);
                if (id) return this.load();
            }
        }

        return visibleTo(state, this.ctx);
    }

    // -- photos --------------------------------------------------------------

    async addPhotos(input: NewPhoto[], albumId: string | null): Promise<Photo[]> {
        const album = albumId ? await this.albumRow(albumId) : undefined;
        if (!canContribute(this.ctx, album)) this.deny();
        const rows = input.map((p) => ({
            ...this.scope,
            owner_member_id: this.ctx.me.id,
            url: p.url,
            poster_url: p.posterUrl ?? null,
            kind: p.kind,
            format: p.format,
            caption: p.caption,
            taken_at: p.takenAt,
            place: p.place,
            people_ids: p.peopleIds,
            tags: p.tags,
            favourite: p.favourite ?? false,
            visibility: p.visibility ?? "child",
            shared_with: p.sharedWith ?? [],
            child_safe: p.childSafe ?? true,
            width: p.width,
            height: p.height,
            bytes: p.bytes,
            needs_conversion: p.needsConversion ?? false,
        }));
        const { data, error } = await supabase.from("wf_media").insert(rows).select("*");
        fail("adding pictures", error);
        const made = (data ?? []).map(mapPhoto);
        if (albumId && made.length) await this.addToAlbum(albumId, made.map((p) => p.id));
        return made;
    }

    async updatePhoto(id: string, patch: PhotoPatch): Promise<void> {
        const row: Row = {};
        if (patch.caption !== undefined) row.caption = patch.caption;
        if (patch.takenAt !== undefined) row.taken_at = patch.takenAt;
        if (patch.place !== undefined) row.place = patch.place;
        if (patch.peopleIds !== undefined) row.people_ids = patch.peopleIds;
        if (patch.tags !== undefined) row.tags = patch.tags;
        if (patch.favourite !== undefined) row.favourite = patch.favourite;
        if (patch.visibility !== undefined) row.visibility = patch.visibility;
        if (patch.sharedWith !== undefined) row.shared_with = patch.sharedWith;
        if (patch.childSafe !== undefined) row.child_safe = patch.childSafe;
        const { error } = await supabase.from("wf_media").update(row).eq("id", id);
        fail("updating the picture", error);
    }

    async toggleFavourite(id: string): Promise<void> {
        const { data, error } = await supabase.from("wf_media").select("favourite").eq("id", id).single();
        fail("the picture", error);
        const { error: e2 } = await supabase.from("wf_media").update({ favourite: !bool(data?.favourite) }).eq("id", id);
        fail("updating the picture", e2);
    }

    async removePhoto(id: string): Promise<void> {
        const { error } = await supabase.from("wf_media").delete().eq("id", id);
        fail("removing the picture", error);
    }

    // -- albums --------------------------------------------------------------

    private async albumRow(id: string): Promise<Album | undefined> {
        const { data } = await supabase.from("wf_albums").select("*").eq("id", id).maybeSingle();
        return data ? mapAlbum(data) : undefined;
    }

    async addAlbum(input: NewAlbum): Promise<Album> {
        this.manage();
        const { data, error } = await supabase
            .from("wf_albums")
            .insert({
                ...this.scope,
                owner_member_id: this.ctx.me.id,
                title: input.title,
                description: input.description ?? "",
                cover_media_id: input.coverPhotoId ?? null,
                date_from: input.dateFrom,
                date_to: input.dateTo,
                visibility: input.visibility ?? "child",
                shared_with: input.sharedWith ?? [],
                child_safe: input.childSafe ?? true,
                contributor_member_ids: input.contributorIds ?? [],
                trip_id: input.tripId ?? null,
                auto: false,
            })
            .select("*")
            .single();
        fail("creating the album", error);
        return mapAlbum(data as Row);
    }

    async updateAlbum(id: string, patch: AlbumPatch): Promise<void> {
        const row: Row = {};
        if (patch.title !== undefined) row.title = patch.title;
        if (patch.description !== undefined) row.description = patch.description;
        if (patch.dateFrom !== undefined) row.date_from = patch.dateFrom;
        if (patch.dateTo !== undefined) row.date_to = patch.dateTo;
        if (patch.visibility !== undefined) row.visibility = patch.visibility;
        if (patch.sharedWith !== undefined) row.shared_with = patch.sharedWith;
        if (patch.childSafe !== undefined) row.child_safe = patch.childSafe;
        if (patch.contributorIds !== undefined) row.contributor_member_ids = patch.contributorIds;
        if (patch.coverPhotoId !== undefined) row.cover_media_id = patch.coverPhotoId;
        const { error } = await supabase.from("wf_albums").update(row).eq("id", id);
        fail("updating the album", error);
    }

    async removeAlbum(id: string): Promise<void> {
        this.manage();
        const { error } = await supabase.from("wf_albums").delete().eq("id", id);
        fail("removing the album", error);
    }

    async addToAlbum(albumId: string, photoIds: string[]): Promise<void> {
        const album = await this.albumRow(albumId);
        if (!canContribute(this.ctx, album)) this.deny();
        const { data } = await supabase.from("wf_album_media").select("media_id, position").eq("album_id", albumId);
        const have = new Set((data ?? []).map((r) => s(r.media_id)));
        let order = (data ?? []).length;
        const rows = photoIds
            .filter((id) => !have.has(id))
            .map((media_id) => ({ ...this.scope, album_id: albumId, media_id, caption: "", position: order++ }));
        if (!rows.length) return;
        const { error } = await supabase.from("wf_album_media").insert(rows);
        fail("adding to the album", error);
    }

    async removeFromAlbum(albumId: string, photoId: string): Promise<void> {
        const album = await this.albumRow(albumId);
        if (!canContribute(this.ctx, album)) this.deny();
        const { error } = await supabase.from("wf_album_media").delete().eq("album_id", albumId).eq("media_id", photoId);
        fail("removing from the album", error);
    }

    async moveInAlbum(albumId: string, photoId: string, delta: number): Promise<void> {
        const album = await this.albumRow(albumId);
        if (!canContribute(this.ctx, album)) this.deny();
        const { data, error } = await supabase.from("wf_album_media").select("id, media_id, position").eq("album_id", albumId).order("position");
        fail("the album", error);
        const rows = data ?? [];
        const i = rows.findIndex((r) => s(r.media_id) === photoId);
        const j = i + delta;
        if (i < 0 || j < 0 || j >= rows.length) return;
        await Promise.all([
            supabase.from("wf_album_media").update({ position: n(rows[j].position) }).eq("id", s(rows[i].id)),
            supabase.from("wf_album_media").update({ position: n(rows[i].position) }).eq("id", s(rows[j].id)),
        ]);
    }

    /** AC 9 — one album per trip that has come home, matched on `trip_id`. */
    async ensureTripAlbums(trips: TripSlice[]): Promise<string[]> {
        if (!canManage(this.ctx)) return [];
        const ended = trips.filter((t) => t.status === "done" && t.endDate && t.endDate <= this.ctx.today);
        if (!ended.length) return [];
        const { data } = await supabase.from("wf_albums").select("trip_id").eq("space_id", this.ctx.space.id).not("trip_id", "is", null);
        const have = new Set((data ?? []).map((r) => s(r.trip_id)));
        const made: string[] = [];
        for (const t of ended) {
            if (have.has(t.id)) continue;
            const { data: album, error } = await supabase
                .from("wf_albums")
                .insert({
                    ...this.scope,
                    owner_member_id: this.ctx.me.id,
                    title: tripAlbumTitle(t.title, t.endDate as string),
                    description: `Made for us when we came home from ${t.destination}.`,
                    date_from: t.startDate ?? t.endDate,
                    date_to: t.endDate,
                    visibility: "child",
                    child_safe: true,
                    trip_id: t.id,
                    auto: true,
                })
                .select("id")
                .single();
            fail("creating the trip album", error);
            const id = s(album?.id);
            if (!id) continue;
            made.push(id);
            await supabase.from("wf_timeline_events").insert({
                ...this.scope,
                date: t.endDate,
                type: "album",
                source_id: id,
                title: tripAlbumTitle(t.title, t.endDate as string),
                body: `We came home from ${t.destination}.`,
                href: `/create/memories/albums/${id}`,
                visibility: "child",
                child_safe: true,
                imported: false,
            });
        }
        return made;
    }

    // -- timeline ------------------------------------------------------------

    private eventRow(e: NewTimelineEvent): Row {
        return {
            ...this.scope,
            date: e.date,
            type: e.type,
            source_id: e.sourceId,
            title: e.title,
            body: e.body,
            media_id: e.photoId,
            member_ids: e.memberIds,
            href: e.href,
            visibility: e.visibility,
            shared_with: e.sharedWith,
            child_safe: e.childSafe,
            imported: e.imported,
        };
    }

    async addTimelineEvent(input: NewTimelineEvent): Promise<TimelineEvent> {
        this.manage();
        const { data, error } = await supabase.from("wf_timeline_events").insert(this.eventRow(input)).select("*").single();
        fail("adding to the timeline", error);
        return mapEvent(data as Row);
    }

    async removeTimelineEvent(id: string): Promise<void> {
        this.manage();
        const { error } = await supabase.from("wf_timeline_events").delete().eq("id", id);
        fail("removing the event", error);
    }

    async importTimeline(events: NewTimelineEvent[]): Promise<number> {
        this.manage();
        const withSource = events.filter((e) => e.sourceId);
        if (!withSource.length) return 0;
        const { data } = await supabase.from("wf_timeline_events").select("type, source_id").eq("space_id", this.ctx.space.id).not("source_id", "is", null);
        const have = new Set((data ?? []).map((r) => `${s(r.type)}:${s(r.source_id)}`));
        const rows = withSource.filter((e) => !have.has(`${e.type}:${e.sourceId}`)).map((e) => this.eventRow(e));
        if (!rows.length) return 0;
        const { error } = await supabase.from("wf_timeline_events").insert(rows);
        fail("keeping the timeline", error);
        return rows.length;
    }

    // -- reels ---------------------------------------------------------------

    private async insertFrames(reelId: string, list: Array<{ photoId: string; caption?: string; durationMs?: number | null }>, max: number): Promise<void> {
        const rows = list.slice(0, max).map((f, position) => ({ ...this.scope, reel_id: reelId, media_id: f.photoId, caption: f.caption ?? "", duration_ms: f.durationMs ?? null, position }));
        if (!rows.length) return;
        const { error } = await supabase.from("wf_reel_frames").insert(rows);
        fail("adding the frames", error);
    }

    async addReel(input: NewReel): Promise<Reel> {
        this.manage();
        const { data, error } = await supabase
            .from("wf_reels")
            .insert({
                ...this.scope,
                owner_member_id: this.ctx.me.id,
                title: input.title,
                subtitle: input.subtitle ?? "",
                mood: input.mood ?? "warm",
                transition: input.transition ?? "crossfade",
                slide_ms: input.slideMs ?? 4000,
                status: input.status ?? "draft",
                auto_kind: input.autoKind ?? "custom",
                track_title: input.trackTitle ?? "",
                track_note: input.trackNote ?? "",
                track_item_id: input.trackItemId ?? null,
                cover_media_id: input.photoIds[0] ?? null,
                visibility: input.visibility ?? "child",
                shared_with: input.sharedWith ?? [],
                child_safe: input.childSafe ?? true,
                storyboard_id: input.storyboardId ?? null,
            })
            .select("*")
            .single();
        fail("creating the reel", error);
        const reel = mapReel(data as Row);
        await this.insertFrames(
            reel.id,
            input.photoIds.map((photoId) => ({ photoId, caption: input.captions?.[photoId] ?? "" })),
            MEDIA_PLANS.legacy.maxFrames,
        );
        return reel;
    }

    async updateReel(id: string, patch: ReelPatch): Promise<void> {
        const row: Row = {};
        if (patch.title !== undefined) row.title = patch.title;
        if (patch.subtitle !== undefined) row.subtitle = patch.subtitle;
        if (patch.mood !== undefined) row.mood = patch.mood;
        if (patch.transition !== undefined) row.transition = patch.transition;
        if (patch.slideMs !== undefined) row.slide_ms = patch.slideMs;
        if (patch.trackTitle !== undefined) row.track_title = patch.trackTitle;
        if (patch.trackNote !== undefined) row.track_note = patch.trackNote;
        if (patch.trackItemId !== undefined) row.track_item_id = patch.trackItemId;
        if (patch.coverPhotoId !== undefined) row.cover_media_id = patch.coverPhotoId;
        if (patch.visibility !== undefined) row.visibility = patch.visibility;
        if (patch.sharedWith !== undefined) row.shared_with = patch.sharedWith;
        if (patch.childSafe !== undefined) row.child_safe = patch.childSafe;
        if (patch.status !== undefined) row.status = patch.status;
        const { error } = await supabase.from("wf_reels").update(row).eq("id", id);
        fail("updating the reel", error);
    }

    async removeReel(id: string): Promise<void> {
        this.manage();
        const { error } = await supabase.from("wf_reels").delete().eq("id", id);
        fail("removing the reel", error);
    }

    async setFrames(reelId: string, list: Array<{ photoId: string; caption?: string; durationMs?: number | null }>): Promise<void> {
        this.manage();
        const { error } = await supabase.from("wf_reel_frames").delete().eq("reel_id", reelId);
        fail("clearing the frames", error);
        await this.insertFrames(reelId, list, MEDIA_PLANS.legacy.maxFrames);
    }

    async updateFrame(frameId: string, patch: Partial<{ caption: string; durationMs: number | null }>): Promise<void> {
        this.manage();
        const row: Row = {};
        if (patch.caption !== undefined) row.caption = patch.caption;
        if (patch.durationMs !== undefined) row.duration_ms = patch.durationMs;
        const { error } = await supabase.from("wf_reel_frames").update(row).eq("id", frameId);
        fail("updating the frame", error);
    }

    async moveFrame(frameId: string, delta: number): Promise<void> {
        this.manage();
        const { data: me } = await supabase.from("wf_reel_frames").select("reel_id").eq("id", frameId).single();
        const reelId = s(me?.reel_id);
        if (!reelId) return;
        const { data } = await supabase.from("wf_reel_frames").select("id, position").eq("reel_id", reelId).order("position");
        const rows = data ?? [];
        const i = rows.findIndex((r) => s(r.id) === frameId);
        const j = i + delta;
        if (i < 0 || j < 0 || j >= rows.length) return;
        await Promise.all([
            supabase.from("wf_reel_frames").update({ position: n(rows[j].position) }).eq("id", s(rows[i].id)),
            supabase.from("wf_reel_frames").update({ position: n(rows[i].position) }).eq("id", s(rows[j].id)),
        ]);
    }

    async removeFrame(frameId: string): Promise<void> {
        this.manage();
        const { error } = await supabase.from("wf_reel_frames").delete().eq("id", frameId);
        fail("removing the frame", error);
    }

    async publishReel(id: string): Promise<void> {
        this.manage();
        const { count } = await supabase.from("wf_reel_frames").select("id", { count: "exact", head: true }).eq("reel_id", id);
        if (!count) throw new Error("A reel needs at least one picture before it is ready");
        const { error } = await supabase.from("wf_reels").update({ status: "ready", scheduled_for: null }).eq("id", id);
        fail("publishing the reel", error);
    }

    async reelFromAlbum(albumId: string, title?: string): Promise<string> {
        this.manage();
        const album = await this.albumRow(albumId);
        if (!album) throw new Error("That album is no longer here");
        const { data } = await supabase.from("wf_album_media").select("media_id, caption, position").eq("album_id", albumId).order("position");
        const ids = (data ?? []).map((r) => s(r.media_id));
        if (!ids.length) throw new Error("That album has no pictures to make a reel from");
        const captions: Record<string, string> = {};
        for (const r of data ?? []) if (s(r.caption)) captions[s(r.media_id)] = s(r.caption);
        const reel = await this.addReel({
            title: title || album.title,
            subtitle: album.description.slice(0, 90),
            photoIds: ids,
            captions,
            mood: "warm",
            autoKind: album.tripId ? "trip" : "custom",
            status: "draft",
            visibility: album.visibility,
            sharedWith: album.sharedWith,
            childSafe: album.childSafe,
        });
        return reel.id;
    }

    async draftOurYear(year: number): Promise<string | null> {
        this.manage();
        // Built from the state the caller already has, so the rule that picks
        // the frames lives in derive.ts and exists exactly once.
        const state = await this.rawState();
        const picked = ourYearFrames(state, year, Math.min(60, MEDIA_PLANS[state.plan].maxFrames));
        if (!picked.length) return null;
        const existing = state.reels.find((r) => r.autoKind === "our_year" && r.title.includes(String(year)));
        const reelId = existing?.id ?? (await this.addReel({ title: `Our year ${year}`, subtitle: `Drafted from the ${year} timeline`, autoKind: "our_year", photoIds: [], status: "draft", mood: "warm", slideMs: 4000 })).id;
        await supabase.from("wf_reel_frames").delete().eq("reel_id", reelId);
        await this.insertFrames(reelId, picked.map((p) => ({ photoId: p.photoId, caption: p.caption })), MEDIA_PLANS[state.plan].maxFrames);
        await supabase.from("wf_reels").update({ status: "draft", scheduled_for: null, cover_media_id: picked[0].photoId }).eq("id", reelId);
        return reelId;
    }

    async reelFromStoryboard(story: StudioStorySlice): Promise<string> {
        this.manage();
        const scenes = (story.data.scenes ?? []).filter((sc) => sc.imageUrl);
        if (!scenes.length) throw new Error("That storyboard has no pictures yet");
        const { data: existing } = await supabase.from("wf_reels").select("id").eq("storyboard_id", story.id).maybeSingle();
        const made = await this.addPhotos(
            scenes.map((sc) => ({
                url: sc.imageUrl as string,
                kind: "photo" as MediaKind,
                format: "png" as SourceFormat,
                caption: sc.caption,
                takenAt: story.createdAt.slice(0, 10),
                place: "",
                peopleIds: [],
                tags: ["storyboard"],
                width: 1024,
                height: 1024,
                bytes: 900_000,
            })),
            null,
        );
        const captions: Record<string, string> = {};
        made.forEach((p, i) => {
            captions[p.id] = scenes[i]?.caption ?? "";
        });
        if (existing?.id) {
            await this.setFrames(s(existing.id), made.map((p) => ({ photoId: p.id, caption: captions[p.id], durationMs: 5000 })));
            return s(existing.id);
        }
        const reel = await this.addReel({
            title: story.title,
            subtitle: "A storyboard, played as a reel",
            photoIds: made.map((p) => p.id),
            captions,
            mood: "calm",
            slideMs: 5000,
            autoKind: "storyboard",
            storyboardId: story.id,
            status: "ready",
        });
        return reel.id;
    }

    /** The unfiltered slice, for the two rules that must see the whole year. */
    private async rawState(): Promise<MemoriesState> {
        const spaceId = this.ctx.space.id;
        const [media, events, reels, frames, plan] = await Promise.all([
            supabase.from("wf_media").select("*").eq("space_id", spaceId),
            supabase.from("wf_timeline_events").select("*").eq("space_id", spaceId),
            supabase.from("wf_reels").select("*").eq("space_id", spaceId),
            supabase.from("wf_reel_frames").select("*").eq("space_id", spaceId),
            supabase.from("wf_space_plans").select("tier").eq("space_id", spaceId).maybeSingle(),
        ]);
        const photos = (media.data ?? []).map(mapPhoto);
        return {
            photos,
            albums: [],
            albumPhotos: [],
            timeline: (events.data ?? []).map(mapEvent),
            reels: (reels.data ?? []).map(mapReel),
            frames: (frames.data ?? []).map(mapFrame),
            shares: [],
            links: [],
            plan: (s(plan.data?.tier, "household") as PlanTier) ?? "household",
            usedBytes: photos.reduce((t, p) => t + p.bytes, 0),
            totalPhotos: photos.length,
        };
    }

    // -- sharing -------------------------------------------------------------

    async grant(objectType: ShareObjectType, objectId: string, memberIds: string[]): Promise<void> {
        this.manage();
        const { error } = await supabase.from("wf_object_shares").delete().eq("object_type", objectType).eq("object_id", objectId);
        fail("clearing the grants", error);
        if (!memberIds.length) return;
        const { error: e2 } = await supabase.from("wf_object_shares").insert(memberIds.map((member_id) => ({ ...this.scope, object_type: objectType, object_id: objectId, member_id, granted_by: this.ctx.me.id })));
        fail("granting", e2);
    }

    async revokeGrant(shareId: string): Promise<void> {
        this.manage();
        const { error } = await supabase.from("wf_object_shares").delete().eq("id", shareId);
        fail("revoking the grant", error);
    }

    async createLink(objectType: ShareObjectType, objectId: string, days = SHARE_LINK_DAYS): Promise<ShareLink> {
        this.manage();
        const expires = new Date();
        expires.setDate(expires.getDate() + days);
        const { data, error } = await supabase
            .from("wf_share_links")
            .insert({ ...this.scope, object_type: objectType, object_id: objectId, created_by: this.ctx.me.id, expires_at: expires.toISOString() })
            .select("*")
            .single();
        fail("creating the link", error);
        return mapLink(data as Row);
    }

    async revokeLink(linkId: string): Promise<void> {
        this.manage();
        const { error } = await supabase.from("wf_share_links").update({ revoked_at: new Date().toISOString() }).eq("id", linkId);
        fail("revoking the link", error);
    }

    /**
     * The token path. A security-definer function, because the person holding
     * the link may not be in the space at all — and it returns exactly one
     * object, its frames and their pictures, or nothing.
     */
    async openShared(token: string): Promise<SharedView | null> {
        const { data, error } = await supabase.rpc("wf_open_shared_object", { p_token: token });
        if (error) return null;
        const payload = data as { object_type?: string; album?: Row; reel?: Row; frames?: Row[]; media?: Row[]; expires_at?: string; shared_by?: string } | null;
        if (!payload || !payload.object_type) return null;
        return {
            objectType: payload.object_type === "reel" ? "reel" : "album",
            album: payload.album ? mapAlbum(payload.album) : null,
            reel: payload.reel ? mapReel(payload.reel) : null,
            frames: (payload.frames ?? []).map(mapFrame).sort((a, b) => a.order - b.order),
            photos: (payload.media ?? []).map(mapPhoto),
            expiresAt: iso(payload.expires_at),
            sharedBy: s(payload.shared_by, this.ctx.space.name),
        };
    }

    // -- plan ----------------------------------------------------------------

    async setPlan(plan: PlanTier): Promise<void> {
        if (this.ctx.role !== "parent") this.deny();
        const { error } = await supabase.from("wf_space_plans").upsert({ ...this.scope, tier: plan }, { onConflict: "space_id" });
        fail("changing the plan", error);
    }
}
