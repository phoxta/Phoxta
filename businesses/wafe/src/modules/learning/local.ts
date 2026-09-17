import type { RepoContext } from "@/data/core";
import { seedContext } from "@/data/coreSeed";
import { clamp, isoDate, uid } from "@/lib/format";
import { youtubeId, youtubeThumb } from "@/components/player/YouTubePlayer";
import { canSeePlaylist, canSeeVideo, visibleTo } from "./derive";
import { seed } from "./seed";
import type { Completion, ImportVideoInput, LearningPlan, LearningRepo, LearningState, LearningTask, LessonVideo, NewPlanInput, NewPlaylistInput, PlanItem, Playlist, ProgressResult, VideoNote, VideoSummary } from "./types";
import { COMPLETE_AT_PCT, POINTS_PER_LESSON } from "./types";

/**
 * The Learning Hub in this browser.
 *
 * Every write is real and lands in localStorage, and every write asks the same
 * question the database would: may this member do this? A child cannot import
 * a video, cannot assign a playlist to a sibling and cannot mark themselves
 * complete at 12 % watched. `load()` returns the slice through `visibleTo`, so
 * even the demo cannot hand a child Oluwafemi's private cycling course.
 */

const KEY = "wafe:demo:learning:v2";

const now = (): string => new Date().toISOString();

/**
 * A demo saved before the Sprouts memory existed has completions with no
 * `pointsAwarded`. A finished lesson has already paid, so read it that way —
 * otherwise "not done after all" would buy one more round of Sprouts on an old
 * browser profile.
 */
function normalise(s: LearningState): LearningState {
    return {
        ...s,
        completions: s.completions.map((c) => ({ ...c, pointsAwarded: typeof c.pointsAwarded === "boolean" ? c.pointsAwarded : Boolean(c.completedAt) })),
    };
}

function isState(v: unknown): v is LearningState {
    if (!v || typeof v !== "object") return false;
    const s = v as Partial<LearningState>;
    return Array.isArray(s.videos) && Array.isArray(s.playlists) && Array.isArray(s.plans) && Array.isArray(s.completions) && Array.isArray(s.notes) && Array.isArray(s.tasks);
}

export class LocalLearningRepo implements LearningRepo {
    private cache: LearningState | null = null;

    constructor(private ctx: RepoContext) {}

    // -----------------------------------------------------------------------
    // Storage
    // -----------------------------------------------------------------------

    private all(): LearningState {
        if (this.cache) return this.cache;
        try {
            const raw = localStorage.getItem(KEY);
            if (raw) {
                const parsed: unknown = JSON.parse(raw);
                if (isState(parsed)) return (this.cache = normalise(parsed));
            }
        } catch {
            /* a corrupt or foreign key falls back to the seed */
        }
        // Relative to the shell's today, so the demo is never stale.
        const fresh = seed(seedContext(this.ctx.space, this.ctx.members, this.ctx.today));
        this.cache = fresh;
        this.save(fresh);
        return fresh;
    }

    private save(next: LearningState): void {
        this.cache = next;
        try {
            localStorage.setItem(KEY, JSON.stringify(next));
        } catch {
            /* private browsing: the session still works, it just won't persist */
        }
    }

    /** Copy-on-write so a refused mutation never leaves half a change behind. */
    private edit(fn: (s: LearningState) => LearningState): void {
        this.save(fn({ ...this.all() }));
    }

    async load(): Promise<LearningState> {
        return visibleTo(this.all(), this.ctx);
    }

    // -----------------------------------------------------------------------
    // Guards — the same questions the RLS policies ask
    // -----------------------------------------------------------------------

    private get me(): string {
        return this.ctx.me.id;
    }
    private get manages(): boolean {
        return this.ctx.can("learning.manage");
    }
    private need(ok: boolean): void {
        if (!ok) throw new Error("Not allowed");
    }
    private playlist(id: string): Playlist {
        const p = this.all().playlists.find((x) => x.id === id);
        if (!p) throw new Error("That playlist has gone");
        return p;
    }
    private video(id: string): LessonVideo {
        const v = this.all().videos.find((x) => x.id === id);
        if (!v) throw new Error("That lesson has gone");
        return v;
    }

    // -----------------------------------------------------------------------
    // Videos
    // -----------------------------------------------------------------------

    async importVideo(input: ImportVideoInput): Promise<LessonVideo> {
        // Importing means reaching YouTube: parents only, everywhere (AC 8).
        this.need(this.manages);
        const yt = youtubeId(input.url.trim());
        if (!yt) throw new Error("That doesn't look like a YouTube link.");
        const title = input.title.trim();
        if (!title) throw new Error("Give the lesson a title.");
        const all = this.all();
        const existing = all.videos.find((v) => v.youtubeId === yt);
        if (existing) {
            // Naming a lesson the asker may not see would leak a private shelf
            // through the importer, so it only ever names one they could open.
            const visible = all.playlists.filter((p) => canSeePlaylist(p, this.ctx));
            throw new Error(canSeeVideo(existing, visible, all.playlists, this.ctx) ? `Already saved as "${existing.title}".` : "Someone in the family has already saved that lesson.");
        }
        const transcript = (input.transcript ?? "").trim();
        const video: LessonVideo = {
            id: uid("lv"),
            youtubeId: yt,
            url: `https://www.youtube.com/watch?v=${yt}`,
            title,
            channel: input.channel.trim(),
            thumbnailUrl: youtubeThumb(yt),
            durationS: Math.max(0, Math.round(input.durationS || 0)),
            description: (input.description ?? "").trim(),
            captionsAvailable: input.captionsAvailable ?? Boolean(transcript),
            childSafe: input.childSafe,
            valueId: input.valueId ?? null,
            addedBy: this.me,
            transcript,
            transcriptSource: transcript ? "captions" : null,
            summary: null,
            createdAt: now(),
        };
        this.edit((s) => ({
            ...s,
            videos: [video, ...s.videos],
            playlists: input.playlistId ? s.playlists.map((p) => (p.id === input.playlistId ? { ...p, videoIds: [...p.videoIds, video.id] } : p)) : s.playlists,
        }));
        return video;
    }

    async updateVideo(id: string, patch: Partial<LessonVideo>): Promise<void> {
        const v = this.video(id);
        this.need(this.manages || v.addedBy === this.me);
        this.edit((s) => ({ ...s, videos: s.videos.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
    }

    async removeVideo(id: string): Promise<void> {
        const v = this.video(id);
        this.need(this.manages || v.addedBy === this.me);
        this.edit((s) => ({
            ...s,
            videos: s.videos.filter((x) => x.id !== id),
            playlists: s.playlists.map((p) => ({ ...p, videoIds: p.videoIds.filter((x) => x !== id) })),
            notes: s.notes.filter((n) => n.videoId !== id),
            tasks: s.tasks.filter((t) => t.videoId !== id),
            completions: s.completions.filter((c) => !(c.itemType === "video" && c.itemId === id)),
            plans: s.plans.map((pl) => ({ ...pl, items: pl.items.filter((i) => i.itemId !== id) })),
        }));
    }

    async saveSummary(videoId: string, summary: VideoSummary): Promise<void> {
        this.video(videoId);
        this.need(this.ctx.can("learning.assigned") || this.manages);
        this.edit((s) => ({ ...s, videos: s.videos.map((v) => (v.id === videoId ? { ...v, summary } : v)) }));
    }

    // -----------------------------------------------------------------------
    // Playlists
    // -----------------------------------------------------------------------

    async createPlaylist(input: NewPlaylistInput): Promise<Playlist> {
        this.need(this.manages);
        const name = input.name.trim();
        if (!name) throw new Error("Give the playlist a name.");
        const p: Playlist = {
            id: uid("pl"),
            name,
            note: (input.note ?? "").trim(),
            ownerMemberId: this.me,
            visibility: input.visibility,
            sharedWith: input.sharedWith ?? [],
            childSafe: input.childSafe,
            coverUrl: input.coverUrl,
            valueId: input.valueId ?? null,
            videoIds: [],
            assignedTo: input.assignedTo ?? [],
            createdAt: now(),
        };
        this.edit((s) => ({ ...s, playlists: [p, ...s.playlists] }));
        return p;
    }

    async updatePlaylist(id: string, patch: Partial<Playlist>): Promise<void> {
        const p = this.playlist(id);
        this.need(this.manages || p.ownerMemberId === this.me);
        this.edit((s) => ({ ...s, playlists: s.playlists.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
    }

    async removePlaylist(id: string): Promise<void> {
        const p = this.playlist(id);
        this.need(this.manages || p.ownerMemberId === this.me);
        this.edit((s) => ({ ...s, playlists: s.playlists.filter((x) => x.id !== id), plans: s.plans.map((pl) => (pl.playlistId === id ? { ...pl, playlistId: null } : pl)) }));
    }

    async setPlaylistVideos(playlistId: string, videoIds: string[]): Promise<void> {
        const p = this.playlist(playlistId);
        this.need(this.manages || p.ownerMemberId === this.me);
        const known = new Set(this.all().videos.map((v) => v.id));
        const clean = [...new Set(videoIds)].filter((id) => known.has(id));
        this.edit((s) => ({ ...s, playlists: s.playlists.map((x) => (x.id === playlistId ? { ...x, videoIds: clean } : x)) }));
    }

    async assignPlaylist(playlistId: string, memberIds: string[]): Promise<void> {
        // Setting someone else's learning is a parent's job.
        this.need(this.manages);
        const known = new Set(this.ctx.members.map((m) => m.id));
        this.edit((s) => ({ ...s, playlists: s.playlists.map((x) => (x.id === playlistId ? { ...x, assignedTo: [...new Set(memberIds)].filter((id) => known.has(id)) } : x)) }));
    }

    // -----------------------------------------------------------------------
    // Notes
    // -----------------------------------------------------------------------

    async addNote(videoId: string, timestampS: number, text: string): Promise<VideoNote> {
        const v = this.video(videoId);
        this.need(this.ctx.can("learning.assigned") || this.manages);
        const body = text.trim();
        if (!body) throw new Error("Write the note first.");
        const note: VideoNote = {
            id: uid("vn"),
            videoId,
            memberId: this.me,
            timestampS: clamp(Math.round(timestampS), 0, v.durationS || 86400),
            text: body,
            createdAt: now(),
        };
        this.edit((s) => ({ ...s, notes: [...s.notes, note] }));
        return note;
    }

    async removeNote(id: string): Promise<void> {
        const n = this.all().notes.find((x) => x.id === id);
        if (!n) return;
        this.need(this.manages || n.memberId === this.me);
        this.edit((s) => ({ ...s, notes: s.notes.filter((x) => x.id !== id) }));
    }

    // -----------------------------------------------------------------------
    // Watching — the completion rule lives here and nowhere else
    // -----------------------------------------------------------------------

    private writeCompletion(itemType: Completion["itemType"], itemId: string, memberId: string, progressPct: number, complete: boolean, markedBy: string | null): ProgressResult {
        let newlyCompleted = false;
        let alreadyPaid = false;
        const member = this.ctx.members.find((m) => m.id === memberId);
        // Sprouts are earned once per lesson, ever. `pointsAwarded` outlives a
        // cleared completion, so "not done after all" and a second watch is a
        // second watch — not a second payment.
        this.edit((s) => {
            const existing = s.completions.find((c) => c.itemType === itemType && c.itemId === itemId && c.memberId === memberId);
            const pctNow = clamp(Math.round(progressPct), 0, 100);
            if (existing) {
                const kept = Math.max(existing.progressPct, pctNow);
                const done = existing.completedAt ?? (complete ? now() : null);
                newlyCompleted = !existing.completedAt && Boolean(done);
                alreadyPaid = existing.pointsAwarded;
                const pays = newlyCompleted && !alreadyPaid && member?.role === "child";
                return {
                    ...s,
                    completions: s.completions.map((c) => (c === existing ? { ...c, progressPct: kept, completedAt: done, markedBy: existing.markedBy ?? markedBy, pointsAwarded: existing.pointsAwarded || pays, updatedAt: now() } : c)),
                };
            }
            newlyCompleted = complete;
            const row: Completion = {
                id: uid("lc"),
                memberId,
                itemType,
                itemId,
                progressPct: pctNow,
                completedAt: complete ? now() : null,
                markedBy,
                pointsAwarded: complete && member?.role === "child",
                updatedAt: now(),
            };
            return { ...s, completions: [...s.completions, row] };
        });
        const points = newlyCompleted && !alreadyPaid && member?.role === "child" ? POINTS_PER_LESSON : 0;
        return { progressPct: clamp(Math.round(progressPct), 0, 100), newlyCompleted, points };
    }

    async recordProgress(videoId: string, positionS: number, durationS: number): Promise<ProgressResult> {
        const v = this.video(videoId);
        this.need(this.ctx.can("learning.assigned") || this.manages);
        // The player is the only thing that knows how long the video really is.
        if (durationS > 0 && Math.abs(durationS - v.durationS) > 2) {
            this.edit((s) => ({ ...s, videos: s.videos.map((x) => (x.id === videoId ? { ...x, durationS: Math.round(durationS) } : x)) }));
        }
        const total = durationS > 0 ? durationS : v.durationS;
        const pctNow = total > 0 ? clamp(Math.round((positionS / total) * 100), 0, 100) : 0;
        // Acceptance criterion 4: completion is written at 80 % and never below.
        return this.writeCompletion("video", videoId, this.me, pctNow, pctNow >= COMPLETE_AT_PCT, null);
    }

    async markComplete(videoId: string, memberId: string): Promise<ProgressResult> {
        this.video(videoId);
        // The only other way to complete: a parent's own hand.
        this.need(this.manages);
        return this.writeCompletion("video", videoId, memberId, 100, true, this.me);
    }

    async clearCompletion(videoId: string, memberId: string): Promise<void> {
        this.need(this.manages || memberId === this.me);
        this.clearRow("video", videoId, memberId);
    }

    /**
     * "Not done after all": the tick and the watched percentage go, so the
     * lesson has to be earned again — but the row stays, because it is the
     * only place that remembers this lesson has already paid its Sprouts.
     */
    private clearRow(itemType: Completion["itemType"], itemId: string, memberId: string): void {
        this.edit((s) => ({
            ...s,
            completions: s.completions.flatMap((c) => {
                if (!(c.itemType === itemType && c.itemId === itemId && c.memberId === memberId)) return [c];
                if (!c.pointsAwarded) return [];
                return [{ ...c, progressPct: 0, completedAt: null, markedBy: null, updatedAt: now() }];
            }),
        }));
    }

    // -----------------------------------------------------------------------
    // Plans
    // -----------------------------------------------------------------------

    async createPlan(input: NewPlanInput): Promise<LearningPlan> {
        this.need(this.manages);
        const name = input.name.trim();
        if (!name) throw new Error("Give the plan a name.");
        if (!input.assigneeIds.length) throw new Error("Choose who this plan is for.");
        const weeks = Math.max(1, Math.min(12, Math.round(input.weeks)));
        const start = input.startDate || this.ctx.today;
        const perWeek: Record<number, number> = {};
        const items: PlanItem[] = input.items.map((raw) => {
            const week = clamp(raw.week, 1, weeks);
            const order = (perWeek[week] = (perWeek[week] ?? 0) + 1) - 1;
            const offset = (week - 1) * 7 + Math.min(6, order * (input.cadence === "daily" ? 1 : input.cadence === "twice-weekly" ? 3 : 6));
            return {
                id: uid("pi"),
                itemType: raw.itemType,
                itemId: raw.itemId,
                title: raw.title.trim() || "Lesson",
                minutes: clamp(Math.round(raw.minutes || 10), 1, 240),
                week,
                order,
                dueDate: isoDate(new Date(new Date(`${start}T00:00:00`).getTime() + offset * 86400000)),
            };
        });
        const plan: LearningPlan = {
            id: uid("lp"),
            name,
            objective: (input.objective ?? "").trim(),
            cadence: input.cadence,
            assigneeIds: input.assigneeIds,
            goalId: input.goalId ?? null,
            valueId: input.valueId ?? null,
            startDate: start,
            endDate: isoDate(new Date(new Date(`${start}T00:00:00`).getTime() + weeks * 7 * 86400000)),
            playlistId: input.playlistId,
            ownerMemberId: this.me,
            visibility: input.visibility,
            sharedWith: [],
            items,
            createdAt: now(),
        };
        this.edit((s) => ({ ...s, plans: [plan, ...s.plans] }));
        return plan;
    }

    async updatePlan(id: string, patch: Partial<LearningPlan>): Promise<void> {
        this.need(this.manages);
        this.edit((s) => ({ ...s, plans: s.plans.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
    }

    async removePlan(id: string): Promise<void> {
        this.need(this.manages);
        const plan = this.all().plans.find((p) => p.id === id);
        const itemIds = new Set((plan?.items ?? []).map((i) => i.id));
        this.edit((s) => ({
            ...s,
            plans: s.plans.filter((p) => p.id !== id),
            completions: s.completions.filter((c) => !(c.itemType === "plan-item" && itemIds.has(c.itemId))),
        }));
    }

    async setPlanItemDone(planId: string, itemId: string, memberId: string, done: boolean): Promise<ProgressResult> {
        this.need(this.manages || memberId === this.me);
        const plan = this.all().plans.find((p) => p.id === planId);
        const item = plan?.items.find((i) => i.id === itemId);
        if (!plan || !item) throw new Error("That plan item has gone");
        if (item.itemType === "video" && item.itemId) {
            if (!done) {
                await this.clearCompletion(item.itemId, memberId);
                return { progressPct: 0, newlyCompleted: false, points: 0 };
            }
            // Ticking a video item by hand is the parent mark, and only that.
            this.need(this.manages);
            return this.writeCompletion("video", item.itemId, memberId, 100, true, this.me);
        }
        if (!done) {
            this.clearRow("plan-item", itemId, memberId);
            return { progressPct: 0, newlyCompleted: false, points: 0 };
        }
        return this.writeCompletion("plan-item", itemId, memberId, 100, true, memberId === this.me ? null : this.me);
    }

    // -----------------------------------------------------------------------
    // Action items
    // -----------------------------------------------------------------------

    async addTask(videoId: string, title: string, memberId: string | null, dueDate: string): Promise<LearningTask> {
        this.video(videoId);
        this.need(this.manages);
        const t: LearningTask = {
            id: uid("lt"),
            videoId,
            title: title.trim() || "Follow up on this lesson",
            memberId,
            dueDate: dueDate || this.ctx.today,
            doneAt: null,
            createdBy: this.me,
            createdAt: now(),
        };
        this.edit((s) => ({ ...s, tasks: [...s.tasks, t] }));
        return t;
    }

    async setTaskDone(id: string, done: boolean): Promise<void> {
        const t = this.all().tasks.find((x) => x.id === id);
        if (!t) return;
        this.need(this.manages || t.memberId === this.me);
        this.edit((s) => ({ ...s, tasks: s.tasks.map((x) => (x.id === id ? { ...x, doneAt: done ? now() : null } : x)) }));
    }

    async removeTask(id: string): Promise<void> {
        const t = this.all().tasks.find((x) => x.id === id);
        if (!t) return;
        this.need(this.manages || t.createdBy === this.me);
        this.edit((s) => ({ ...s, tasks: s.tasks.filter((x) => x.id !== id) }));
    }
}
