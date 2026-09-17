import type { RepoContext } from "@/data/core";
import { clamp, isoDate } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { youtubeId, youtubeThumb } from "@/components/player/YouTubePlayer";
import { visibleTo } from "./derive";
import type { Completion, ImportVideoInput, LearningPlan, LearningRepo, LearningState, LearningTask, LessonVideo, NewPlanInput, NewPlaylistInput, PlanCadence, PlanItem, Playlist, ProgressResult, TranscriptSource, VideoNote, VideoSummary } from "./types";
import { COMPLETE_AT_PCT, POINTS_PER_LESSON } from "./types";

/**
 * The Learning Hub, live, under row-level security.
 *
 * Eight tables (`sql/learning.sql`), every row carrying `organization_id` and
 * `space_id`, and the policies written in the foundation's own vocabulary —
 * so the database refuses what `LocalLearningRepo` refuses. snake_case ↔
 * camelCase happens here and only here.
 */

type Row = Record<string, unknown>;
const s = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);
const n = (v: unknown, d = 0): number => (typeof v === "number" ? v : Number(v ?? d) || d);
const b = (v: unknown, d = false): boolean => (typeof v === "boolean" ? v : d);
const iso = (v: unknown): string => (v ? new Date(v as string).toISOString() : new Date().toISOString());
const optIso = (v: unknown): string | null => (v ? new Date(v as string).toISOString() : null);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const day = (v: unknown, d: string): string => (typeof v === "string" && v.length >= 10 ? v.slice(0, 10) : d);

function fail(where: string, error: { message: string } | null | undefined): void {
    if (error) throw new Error(`${where}: ${error.message}`);
}

const T = {
    videos: "wf_learning_videos",
    summaries: "wf_learning_summaries",
    playlists: "wf_learning_playlists",
    items: "wf_learning_playlist_items",
    notes: "wf_learning_notes",
    plans: "wf_learning_plans",
    planItems: "wf_learning_plan_items",
    completions: "wf_learning_completions",
    tasks: "wf_learning_tasks",
} as const;

const mapSummary = (r: Row): VideoSummary => ({
    source: s(r.source, "ai_from_description") as TranscriptSource,
    summary: s(r.summary),
    takeaways: strs(r.takeaways),
    actions: strs(r.action_items),
    discussion: strs(r.discussion_prompts),
    forKids: s(r.for_kids) || undefined,
    suggestedBand: s(r.suggested_band, "junior") as VideoSummary["suggestedBand"],
    model: s(r.model) || undefined,
    at: iso(r.created_at),
});

const mapVideo = (r: Row, summary: VideoSummary | null): LessonVideo => {
    const yt = s(r.youtube_id);
    return {
        id: s(r.id),
        youtubeId: yt,
        url: s(r.url) || `https://www.youtube.com/watch?v=${yt}`,
        title: s(r.title),
        channel: s(r.channel),
        thumbnailUrl: s(r.thumbnail_url) || youtubeThumb(yt),
        durationS: n(r.duration_s),
        description: s(r.description),
        captionsAvailable: b(r.captions_available),
        childSafe: b(r.child_safe),
        valueId: s(r.value_id) || null,
        addedBy: s(r.added_by),
        transcript: s(r.transcript),
        transcriptSource: (s(r.transcript_source) || null) as TranscriptSource | null,
        summary,
        createdAt: iso(r.created_at),
    };
};

const mapPlaylist = (r: Row, videoIds: string[]): Playlist => ({
    id: s(r.id),
    name: s(r.name),
    note: s(r.note),
    ownerMemberId: s(r.owner_member_id),
    visibility: s(r.visibility, "family") as Playlist["visibility"],
    sharedWith: strs(r.shared_with),
    childSafe: b(r.child_safe),
    coverUrl: s(r.cover_url) || undefined,
    valueId: s(r.value_id) || null,
    videoIds,
    assignedTo: strs(r.assigned_to),
    createdAt: iso(r.created_at),
});

const mapNote = (r: Row): VideoNote => ({
    id: s(r.id),
    videoId: s(r.video_id),
    memberId: s(r.member_id),
    timestampS: n(r.timestamp_s),
    text: s(r.text),
    createdAt: iso(r.created_at),
});

const mapPlanItem = (r: Row, today: string): PlanItem => ({
    id: s(r.id),
    itemType: s(r.item_type, "video") as PlanItem["itemType"],
    itemId: s(r.item_id) || null,
    title: s(r.title),
    minutes: n(r.minutes, 10),
    week: n(r.week, 1),
    order: n(r.sort_order),
    dueDate: day(r.due_date, today),
});

const mapPlan = (r: Row, items: PlanItem[], today: string): LearningPlan => ({
    id: s(r.id),
    name: s(r.name),
    objective: s(r.objective),
    cadence: s(r.cadence, "weekly") as PlanCadence,
    assigneeIds: strs(r.assignee_member_ids),
    goalId: s(r.goal_id) || null,
    valueId: s(r.value_id) || null,
    startDate: day(r.start_date, today),
    endDate: day(r.end_date, today),
    playlistId: s(r.playlist_id) || null,
    ownerMemberId: s(r.owner_member_id),
    visibility: s(r.visibility, "family") as LearningPlan["visibility"],
    sharedWith: strs(r.shared_with),
    items: items.sort((a, x) => a.week - x.week || a.order - x.order),
    createdAt: iso(r.created_at),
});

const mapCompletion = (r: Row): Completion => ({
    id: s(r.id),
    memberId: s(r.member_id),
    itemType: s(r.item_type, "video") as Completion["itemType"],
    itemId: s(r.item_id),
    progressPct: n(r.progress_pct),
    completedAt: optIso(r.completed_at),
    markedBy: s(r.marked_by) || null,
    pointsAwarded: b(r.points_awarded),
    updatedAt: iso(r.updated_at ?? r.created_at),
});

const mapTask = (r: Row, today: string): LearningTask => ({
    id: s(r.id),
    videoId: s(r.video_id),
    title: s(r.title),
    memberId: s(r.member_id) || null,
    dueDate: day(r.due_date, today),
    doneAt: optIso(r.done_at),
    createdBy: s(r.created_by),
    createdAt: iso(r.created_at),
});

export class SupabaseLearningRepo implements LearningRepo {
    constructor(private ctx: RepoContext) {}

    private get scope() {
        return { organization_id: this.ctx.orgId, space_id: this.ctx.space.id };
    }
    private get me(): string {
        return this.ctx.me.id;
    }
    private get manages(): boolean {
        return this.ctx.can("learning.manage");
    }
    private need(ok: boolean): void {
        if (!ok) throw new Error("Not allowed");
    }

    async load(): Promise<LearningState> {
        const sp = this.ctx.space.id;
        const today = this.ctx.today;
        const [videos, summaries, playlists, items, notes, plans, planItems, completions, tasks] = await Promise.all([
            supabase.from(T.videos).select("*").eq("space_id", sp).order("created_at", { ascending: false }),
            supabase.from(T.summaries).select("*").eq("space_id", sp),
            supabase.from(T.playlists).select("*").eq("space_id", sp).order("created_at", { ascending: false }),
            supabase.from(T.items).select("*").eq("space_id", sp).order("sort_order", { ascending: true }),
            supabase.from(T.notes).select("*").eq("space_id", sp).order("timestamp_s", { ascending: true }),
            supabase.from(T.plans).select("*").eq("space_id", sp).order("created_at", { ascending: false }),
            supabase.from(T.planItems).select("*").eq("space_id", sp),
            supabase.from(T.completions).select("*").eq("space_id", sp),
            supabase.from(T.tasks).select("*").eq("space_id", sp),
        ]);
        fail("lessons", videos.error);
        fail("summaries", summaries.error);
        fail("playlists", playlists.error);
        fail("playlist items", items.error);
        fail("notes", notes.error);
        fail("plans", plans.error);
        fail("plan items", planItems.error);
        fail("progress", completions.error);
        fail("action items", tasks.error);

        const byVideo = new Map<string, VideoSummary>();
        for (const r of (summaries.data ?? []) as Row[]) byVideo.set(s(r.video_id), mapSummary(r));
        const inPlaylist = new Map<string, string[]>();
        for (const r of (items.data ?? []) as Row[]) {
            const key = s(r.playlist_id);
            inPlaylist.set(key, [...(inPlaylist.get(key) ?? []), s(r.video_id)]);
        }
        const byPlan = new Map<string, PlanItem[]>();
        for (const r of (planItems.data ?? []) as Row[]) {
            const key = s(r.plan_id);
            byPlan.set(key, [...(byPlan.get(key) ?? []), mapPlanItem(r, today)]);
        }
        const state: LearningState = {
            videos: ((videos.data ?? []) as Row[]).map((r) => mapVideo(r, byVideo.get(s(r.id)) ?? null)),
            playlists: ((playlists.data ?? []) as Row[]).map((r) => mapPlaylist(r, inPlaylist.get(s(r.id)) ?? [])),
            notes: ((notes.data ?? []) as Row[]).map(mapNote),
            plans: ((plans.data ?? []) as Row[]).map((r) => mapPlan(r, byPlan.get(s(r.id)) ?? [], today)),
            completions: ((completions.data ?? []) as Row[]).map(mapCompletion),
            tasks: ((tasks.data ?? []) as Row[]).map((r) => mapTask(r, today)),
        };
        // RLS has already filtered; the same rule runs here so demo and live
        // hand the screens an identical shape.
        return visibleTo(state, this.ctx);
    }

    // -----------------------------------------------------------------------
    // Videos
    // -----------------------------------------------------------------------

    async importVideo(input: ImportVideoInput): Promise<LessonVideo> {
        this.need(this.manages);
        const yt = youtubeId(input.url.trim());
        if (!yt) throw new Error("That doesn't look like a YouTube link.");
        const title = input.title.trim();
        if (!title) throw new Error("Give the lesson a title.");
        // The lookup runs under RLS, so it can only ever name a lesson this
        // parent may open; one saved inside someone's private shelf comes back
        // empty here and is caught by the unique index below instead.
        const dupe = await supabase.from(T.videos).select("id,title").eq("space_id", this.ctx.space.id).eq("youtube_id", yt).maybeSingle();
        if (dupe.data) throw new Error(`Already saved as "${s((dupe.data as Row).title)}".`);
        const transcript = (input.transcript ?? "").trim();
        const { data, error } = await supabase
            .from(T.videos)
            .insert({
                ...this.scope,
                youtube_id: yt,
                url: `https://www.youtube.com/watch?v=${yt}`,
                title,
                channel: input.channel.trim(),
                thumbnail_url: youtubeThumb(yt),
                duration_s: Math.max(0, Math.round(input.durationS || 0)),
                description: (input.description ?? "").trim(),
                captions_available: input.captionsAvailable ?? Boolean(transcript),
                child_safe: input.childSafe,
                value_id: input.valueId ?? null,
                added_by: this.me,
                transcript,
                transcript_source: transcript ? "captions" : null,
            })
            .select("*")
            .single();
        if (error?.code === "23505") throw new Error("Someone in the family has already saved that lesson.");
        fail("save lesson", error);
        const video = mapVideo(data as Row, null);
        if (input.playlistId) await this.addToPlaylist(input.playlistId, video.id);
        return video;
    }

    async updateVideo(id: string, patch: Partial<LessonVideo>): Promise<void> {
        const row: Row = {};
        if (patch.title !== undefined) row.title = patch.title;
        if (patch.channel !== undefined) row.channel = patch.channel;
        if (patch.durationS !== undefined) row.duration_s = patch.durationS;
        if (patch.description !== undefined) row.description = patch.description;
        if (patch.childSafe !== undefined) row.child_safe = patch.childSafe;
        if (patch.valueId !== undefined) row.value_id = patch.valueId;
        if (patch.transcript !== undefined) row.transcript = patch.transcript;
        if (patch.transcriptSource !== undefined) row.transcript_source = patch.transcriptSource;
        if (patch.captionsAvailable !== undefined) row.captions_available = patch.captionsAvailable;
        const { error } = await supabase.from(T.videos).update(row).eq("id", id);
        fail("update lesson", error);
    }

    async removeVideo(id: string): Promise<void> {
        const { error } = await supabase.from(T.videos).delete().eq("id", id);
        fail("remove lesson", error);
    }

    async saveSummary(videoId: string, summary: VideoSummary): Promise<void> {
        const { error } = await supabase.from(T.summaries).upsert(
            {
                ...this.scope,
                video_id: videoId,
                source: summary.source,
                summary: summary.summary,
                takeaways: summary.takeaways,
                action_items: summary.actions,
                discussion_prompts: summary.discussion,
                for_kids: summary.forKids ?? null,
                suggested_band: summary.suggestedBand,
                model: summary.model ?? null,
            },
            { onConflict: "video_id" },
        );
        fail("save summary", error);
    }

    // -----------------------------------------------------------------------
    // Playlists
    // -----------------------------------------------------------------------

    async createPlaylist(input: NewPlaylistInput): Promise<Playlist> {
        this.need(this.manages);
        const { data, error } = await supabase
            .from(T.playlists)
            .insert({
                ...this.scope,
                name: input.name.trim(),
                note: (input.note ?? "").trim(),
                owner_member_id: this.me,
                visibility: input.visibility,
                shared_with: input.sharedWith ?? [],
                child_safe: input.childSafe,
                cover_url: input.coverUrl ?? null,
                value_id: input.valueId ?? null,
                assigned_to: input.assignedTo ?? [],
            })
            .select("*")
            .single();
        fail("create playlist", error);
        return mapPlaylist(data as Row, []);
    }

    async updatePlaylist(id: string, patch: Partial<Playlist>): Promise<void> {
        const row: Row = {};
        if (patch.name !== undefined) row.name = patch.name;
        if (patch.note !== undefined) row.note = patch.note;
        if (patch.visibility !== undefined) row.visibility = patch.visibility;
        if (patch.sharedWith !== undefined) row.shared_with = patch.sharedWith;
        if (patch.childSafe !== undefined) row.child_safe = patch.childSafe;
        if (patch.valueId !== undefined) row.value_id = patch.valueId;
        if (patch.coverUrl !== undefined) row.cover_url = patch.coverUrl;
        if (patch.assignedTo !== undefined) row.assigned_to = patch.assignedTo;
        const { error } = await supabase.from(T.playlists).update(row).eq("id", id);
        fail("update playlist", error);
    }

    async removePlaylist(id: string): Promise<void> {
        const { error } = await supabase.from(T.playlists).delete().eq("id", id);
        fail("remove playlist", error);
    }

    private async addToPlaylist(playlistId: string, videoId: string): Promise<void> {
        const { count } = await supabase.from(T.items).select("*", { count: "exact", head: true }).eq("playlist_id", playlistId);
        const { error } = await supabase.from(T.items).insert({ ...this.scope, playlist_id: playlistId, video_id: videoId, sort_order: count ?? 0 });
        fail("add to playlist", error);
    }

    async setPlaylistVideos(playlistId: string, videoIds: string[]): Promise<void> {
        const del = await supabase.from(T.items).delete().eq("playlist_id", playlistId);
        fail("reorder playlist", del.error);
        if (!videoIds.length) return;
        const { error } = await supabase.from(T.items).insert(videoIds.map((video_id, i) => ({ ...this.scope, playlist_id: playlistId, video_id, sort_order: i })));
        fail("reorder playlist", error);
    }

    async assignPlaylist(playlistId: string, memberIds: string[]): Promise<void> {
        this.need(this.manages);
        const { error } = await supabase.from(T.playlists).update({ assigned_to: [...new Set(memberIds)] }).eq("id", playlistId);
        fail("assign playlist", error);
    }

    // -----------------------------------------------------------------------
    // Notes
    // -----------------------------------------------------------------------

    async addNote(videoId: string, timestampS: number, text: string): Promise<VideoNote> {
        const body = text.trim();
        if (!body) throw new Error("Write the note first.");
        const { data, error } = await supabase
            .from(T.notes)
            .insert({ ...this.scope, video_id: videoId, member_id: this.me, timestamp_s: Math.max(0, Math.round(timestampS)), text: body })
            .select("*")
            .single();
        fail("save note", error);
        return mapNote(data as Row);
    }

    async removeNote(id: string): Promise<void> {
        const { error } = await supabase.from(T.notes).delete().eq("id", id);
        fail("remove note", error);
    }

    // -----------------------------------------------------------------------
    // Watching
    // -----------------------------------------------------------------------

    private async writeCompletion(itemType: Completion["itemType"], itemId: string, memberId: string, progressPct: number, complete: boolean, markedBy: string | null): Promise<ProgressResult> {
        const pctNow = clamp(Math.round(progressPct), 0, 100);
        const existing = await supabase.from(T.completions).select("*").eq("space_id", this.ctx.space.id).eq("item_type", itemType).eq("item_id", itemId).eq("member_id", memberId).maybeSingle();
        fail("progress", existing.error);
        const prev = existing.data ? mapCompletion(existing.data as Row) : null;
        const nowIso = new Date().toISOString();
        const completedAt = prev?.completedAt ?? (complete ? nowIso : null);
        const newlyCompleted = !prev?.completedAt && Boolean(completedAt);
        const member = this.ctx.members.find((m) => m.id === memberId);
        // A lesson pays its Sprouts once, ever: the flag outlives a cleared
        // completion, so clear-and-rewatch earns nothing a second time.
        const pays = newlyCompleted && !prev?.pointsAwarded && member?.role === "child";
        const row = {
            ...this.scope,
            member_id: memberId,
            item_type: itemType,
            item_id: itemId,
            progress_pct: Math.max(prev?.progressPct ?? 0, pctNow),
            completed_at: completedAt,
            marked_by: prev?.markedBy ?? markedBy,
            points_awarded: Boolean(prev?.pointsAwarded) || Boolean(pays),
            updated_at: nowIso,
        };
        const { error } = prev ? await supabase.from(T.completions).update(row).eq("id", prev.id) : await supabase.from(T.completions).insert(row);
        fail("progress", error);
        return { progressPct: pctNow, newlyCompleted, points: pays ? POINTS_PER_LESSON : 0 };
    }

    async recordProgress(videoId: string, positionS: number, durationS: number): Promise<ProgressResult> {
        const v = await supabase.from(T.videos).select("duration_s").eq("id", videoId).single();
        fail("lesson", v.error);
        const stored = n((v.data as Row)?.duration_s);
        if (durationS > 0 && Math.abs(durationS - stored) > 2) await this.updateVideo(videoId, { durationS: Math.round(durationS) });
        const total = durationS > 0 ? durationS : stored;
        const pctNow = total > 0 ? clamp(Math.round((positionS / total) * 100), 0, 100) : 0;
        return this.writeCompletion("video", videoId, this.me, pctNow, pctNow >= COMPLETE_AT_PCT, null);
    }

    async markComplete(videoId: string, memberId: string): Promise<ProgressResult> {
        this.need(this.manages);
        return this.writeCompletion("video", videoId, memberId, 100, true, this.me);
    }

    async clearCompletion(videoId: string, memberId: string): Promise<void> {
        this.need(this.manages || memberId === this.me);
        await this.clearRow("video", videoId, memberId);
    }

    /**
     * "Not done after all" resets the tick and the watched percentage. A row
     * that has already paid Sprouts is kept (blanked) rather than deleted,
     * because it is the only memory of that payment.
     */
    private async clearRow(itemType: Completion["itemType"], itemId: string, memberId: string): Promise<void> {
        const existing = await supabase.from(T.completions).select("*").eq("space_id", this.ctx.space.id).eq("item_type", itemType).eq("item_id", itemId).eq("member_id", memberId).maybeSingle();
        fail("clear progress", existing.error);
        const prev = existing.data ? mapCompletion(existing.data as Row) : null;
        if (!prev) return;
        const { error } = prev.pointsAwarded
            ? await supabase.from(T.completions).update({ progress_pct: 0, completed_at: null, marked_by: null, updated_at: new Date().toISOString() }).eq("id", prev.id)
            : await supabase.from(T.completions).delete().eq("id", prev.id);
        fail("clear progress", error);
    }

    // -----------------------------------------------------------------------
    // Plans
    // -----------------------------------------------------------------------

    async createPlan(input: NewPlanInput): Promise<LearningPlan> {
        this.need(this.manages);
        if (!input.assigneeIds.length) throw new Error("Choose who this plan is for.");
        const weeks = clamp(Math.round(input.weeks), 1, 12);
        const start = input.startDate || this.ctx.today;
        const end = isoDate(new Date(new Date(`${start}T00:00:00`).getTime() + weeks * 7 * 86400000));
        const { data, error } = await supabase
            .from(T.plans)
            .insert({
                ...this.scope,
                name: input.name.trim(),
                objective: (input.objective ?? "").trim(),
                cadence: input.cadence,
                assignee_member_ids: input.assigneeIds,
                goal_id: input.goalId ?? null,
                value_id: input.valueId ?? null,
                start_date: start,
                end_date: end,
                playlist_id: input.playlistId,
                owner_member_id: this.me,
                visibility: input.visibility,
                shared_with: [],
            })
            .select("*")
            .single();
        fail("create plan", error);
        const plan = mapPlan(data as Row, [], this.ctx.today);
        const perWeek: Record<number, number> = {};
        const rows = input.items.map((raw) => {
            const week = clamp(raw.week, 1, weeks);
            const order = (perWeek[week] = (perWeek[week] ?? 0) + 1) - 1;
            const offset = (week - 1) * 7 + Math.min(6, order * (input.cadence === "daily" ? 1 : input.cadence === "twice-weekly" ? 3 : 6));
            return {
                ...this.scope,
                plan_id: plan.id,
                item_type: raw.itemType,
                item_id: raw.itemId,
                title: raw.title.trim() || "Lesson",
                minutes: clamp(Math.round(raw.minutes || 10), 1, 240),
                week,
                sort_order: order,
                due_date: isoDate(new Date(new Date(`${start}T00:00:00`).getTime() + offset * 86400000)),
            };
        });
        if (rows.length) {
            const ins = await supabase.from(T.planItems).insert(rows).select("*");
            fail("plan items", ins.error);
            plan.items = ((ins.data ?? []) as Row[]).map((r) => mapPlanItem(r, this.ctx.today)).sort((a, x) => a.week - x.week || a.order - x.order);
        }
        return plan;
    }

    async updatePlan(id: string, patch: Partial<LearningPlan>): Promise<void> {
        this.need(this.manages);
        const row: Row = {};
        if (patch.name !== undefined) row.name = patch.name;
        if (patch.objective !== undefined) row.objective = patch.objective;
        if (patch.cadence !== undefined) row.cadence = patch.cadence;
        if (patch.assigneeIds !== undefined) row.assignee_member_ids = patch.assigneeIds;
        if (patch.goalId !== undefined) row.goal_id = patch.goalId;
        if (patch.valueId !== undefined) row.value_id = patch.valueId;
        if (patch.visibility !== undefined) row.visibility = patch.visibility;
        const { error } = await supabase.from(T.plans).update(row).eq("id", id);
        fail("update plan", error);
    }

    async removePlan(id: string): Promise<void> {
        this.need(this.manages);
        const { error } = await supabase.from(T.plans).delete().eq("id", id);
        fail("remove plan", error);
    }

    async setPlanItemDone(planId: string, itemId: string, memberId: string, done: boolean): Promise<ProgressResult> {
        this.need(this.manages || memberId === this.me);
        const item = await supabase.from(T.planItems).select("*").eq("plan_id", planId).eq("id", itemId).single();
        fail("plan item", item.error);
        const row = item.data as Row;
        if (s(row.item_type, "video") === "video" && s(row.item_id)) {
            const videoId = s(row.item_id);
            if (!done) {
                await this.clearCompletion(videoId, memberId);
                return { progressPct: 0, newlyCompleted: false, points: 0 };
            }
            this.need(this.manages);
            return this.writeCompletion("video", videoId, memberId, 100, true, this.me);
        }
        if (!done) {
            await this.clearRow("plan-item", itemId, memberId);
            return { progressPct: 0, newlyCompleted: false, points: 0 };
        }
        return this.writeCompletion("plan-item", itemId, memberId, 100, true, memberId === this.me ? null : this.me);
    }

    // -----------------------------------------------------------------------
    // Action items
    // -----------------------------------------------------------------------

    async addTask(videoId: string, title: string, memberId: string | null, dueDate: string): Promise<LearningTask> {
        this.need(this.manages);
        const { data, error } = await supabase
            .from(T.tasks)
            .insert({ ...this.scope, video_id: videoId, title: title.trim() || "Follow up on this lesson", member_id: memberId, due_date: dueDate || this.ctx.today, created_by: this.me })
            .select("*")
            .single();
        fail("create action item", error);
        return mapTask(data as Row, this.ctx.today);
    }

    async setTaskDone(id: string, done: boolean): Promise<void> {
        const { error } = await supabase.from(T.tasks).update({ done_at: done ? new Date().toISOString() : null }).eq("id", id);
        fail("action item", error);
    }

    async removeTask(id: string): Promise<void> {
        const { error } = await supabase.from(T.tasks).delete().eq("id", id);
        fail("remove action item", error);
    }
}
