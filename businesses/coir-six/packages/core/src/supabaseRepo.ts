import { CATALOGUE, DEMO_FRIENDS } from "./seed";
import type { LiveContext, LiveRecap, LiveRoom, TranscriptLine } from "./live/room";
import type { OpenRoomInput, Repo } from "./repo";
import type {
    Catalogue,
    Certificate,
    Conversation,
    Course,
    GroupPost,
    Lesson,
    LiveLesson,
    Mentor,
    Message,
    NewTask,
    Note,
    PeerKind,
    Profile,
    QuizAttempt,
    QuizQuestion,
    Task,
    UserState,
} from "./types";
import { hueFor, uid, type Hue } from "./format";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * A signed-in learner's data, under row-level security, inside one school.
 *
 * Every cs_ table carries `organization_id` — the tenant this deployment
 * resolved on boot — and every per-user table also carries `user_id` with a
 * policy of `user_id = auth.uid()`. So this client can only ever see and write
 * its own rows, in this school; the anon key in the bundle grants nothing on
 * its own. Catalogue tables are public-read and filtered by tenant here.
 * Column names are snake_case in Postgres and camelCase in the app; the
 * mapping lives in this file and nowhere else. The Supabase client is passed
 * in, so the same class runs on the web (localStorage session) and on a phone
 * (AsyncStorage session).
 */

type Row = Record<string, unknown>;
const s = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);
const n = (v: unknown, d = 0): number => (typeof v === "number" ? v : Number(v ?? d) || d);
const iso = (v: unknown): string => (v ? new Date(v as string).toISOString() : new Date().toISOString());

function fail(where: string, error: { message: string } | null): void {
    if (error) throw new Error(`${where}: ${error.message}`);
}

const mapCourse = (r: Row): Course => ({
    id: s(r.id), slug: s(r.slug), title: s(r.title), blurb: s(r.blurb), description: s(r.description),
    categoryId: s(r.category_id) as Course["categoryId"], mentorId: s(r.mentor_id), level: s(r.level, "Beginner") as Course["level"],
    theme: s(r.theme, "ux") as Course["theme"], coverUrl: s(r.cover_url) || undefined, rating: n(r.rating, 4.8), learners: n(r.learners), outcomes: Array.isArray(r.outcomes) ? (r.outcomes as string[]) : [],
    publishedAt: iso(r.published_at),
});
const mapLesson = (r: Row): Lesson => ({
    id: s(r.id), courseId: s(r.course_id), moduleId: s(r.module_id), title: s(r.title), kind: s(r.kind, "video") as Lesson["kind"],
    durationSec: n(r.duration_sec), videoUrl: s(r.video_url) || undefined, captionsUrl: s(r.captions_url) || undefined, source: s(r.source) || undefined, body: s(r.body), sort: n(r.sort),
});
const mapMentor = (r: Row): Mentor => ({
    id: s(r.id), name: s(r.name), role: s(r.role), bio: s(r.bio), hue: (s(r.hue) || hueFor(s(r.name))) as Hue, photoUrl: s(r.photo_url) || undefined, handle: s(r.handle),
    followers: n(r.followers), expertise: Array.isArray(r.expertise) ? (r.expertise as Mentor["expertise"]) : [],
});
const mapLive = (r: Row): LiveLesson => ({
    id: s(r.id), mentorId: s(r.mentor_id), categoryId: s(r.category_id) as LiveLesson["categoryId"], title: s(r.title), description: s(r.description),
    startsAt: iso(r.starts_at), durationMin: n(r.duration_min, 60), joinUrl: s(r.join_url), recordingUrl: s(r.recording_url) || undefined,
});
const mapQuiz = (r: Row): QuizQuestion => ({
    id: s(r.id), lessonId: s(r.lesson_id), prompt: s(r.prompt), options: Array.isArray(r.options) ? (r.options as string[]) : [], answer: n(r.answer), explanation: s(r.explanation),
});

export class SupabaseRepo implements Repo {
    readonly kind = "live" as const;
    private userId: string;
    private email: string;
    private org: string;
    private profileCache: Profile | null = null;
    private catalogueCache: Catalogue | null = null;

    private client: SupabaseClient;

    constructor(client: SupabaseClient, userId: string, email: string, orgId: string) {
        this.client = client;
        this.userId = userId;
        this.email = email;
        this.org = orgId;
    }

    /** This tenant's rows of a table. */
    private t(table: string) {
        return this.client.from(table).select("*").eq("organization_id", this.org);
    }

    async loadCatalogue(): Promise<Catalogue> {
        const o = this.org;
        const [cats, mentors, courses, modules, lessons, quiz, live, groups] = await Promise.all([
            this.t("cs_categories").order("sort"),
            this.t("cs_mentors").order("name"),
            this.t("cs_courses").eq("published", true).order("published_at"),
            this.t("cs_modules").order("sort"),
            this.t("cs_lessons").order("sort"),
            this.t("cs_quiz_questions").order("sort"),
            this.t("cs_live_lessons").order("starts_at"),
            this.client.from("cs_groups").select("*").eq("organization_id", o).order("members", { ascending: false }),
        ]);
        // A school with an empty catalogue (or a read that failed) still shows
        // the bundled one rather than an empty shop.
        const rows = (courses.data as Row[] | null) ?? [];
        if (courses.error || !rows.length) return CATALOGUE;
        const cat: Catalogue = {
            categories: ((cats.data as Row[] | null) ?? []).map((r) => ({ id: s(r.id) as Catalogue["categories"][number]["id"], name: s(r.name), blurb: s(r.blurb) })),
            mentors: ((mentors.data as Row[] | null) ?? []).map(mapMentor),
            courses: rows.map(mapCourse),
            modules: ((modules.data as Row[] | null) ?? []).map((r) => ({ id: s(r.id), courseId: s(r.course_id), title: s(r.title), sort: n(r.sort) })),
            lessons: ((lessons.data as Row[] | null) ?? []).map(mapLesson),
            quiz: ((quiz.data as Row[] | null) ?? []).map(mapQuiz),
            liveLessons: ((live.data as Row[] | null) ?? []).map(mapLive),
            groups: ((groups.data as Row[] | null) ?? []).map((r) => ({ id: s(r.id), name: s(r.name), categoryId: s(r.category_id) as Catalogue["groups"][number]["categoryId"], blurb: s(r.blurb), members: n(r.members), imageUrl: s(r.image_url) || undefined })),
        };
        this.catalogueCache = cat;
        return cat;
    }

    private async ensureProfile(): Promise<Profile> {
        if (this.profileCache) return this.profileCache;
        const { data } = await this.client.from("cs_profiles").select("*").eq("organization_id", this.org).eq("user_id", this.userId).maybeSingle();
        let r = data as Row | null;
        if (!r) {
            const name = this.email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
            const fresh = { organization_id: this.org, user_id: this.userId, name, handle: this.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, ""), hue: hueFor(name), headline: "", weekly_goal_min: 180, interests: [], onboarded: false };
            const ins = await this.client.from("cs_profiles").insert(fresh).select("*").single();
            fail("profile", ins.error);
            r = ins.data as Row;
        }
        this.profileCache = {
            id: this.userId, email: this.email, name: s(r.name), handle: s(r.handle), hue: (s(r.hue) || "lilac") as Hue, photoUrl: s(r.photo_url) || undefined, headline: s(r.headline),
            weeklyGoalMin: n(r.weekly_goal_min, 180), interests: Array.isArray(r.interests) ? (r.interests as Profile["interests"]) : [], onboarded: Boolean(r.onboarded), createdAt: iso(r.created_at),
        };
        return this.profileCache;
    }

    async loadUser(): Promise<UserState> {
        const profile = await this.ensureProfile();
        const u = this.userId;
        const mine = (table: string, cols = "*") => this.client.from(table).select(cols).eq("organization_id", this.org).eq("user_id", u);
        const [enr, prog, sess, bm, fol, tasks, notes, gm, convs, notifs, attempts, certs, rsvps, attended] = await Promise.all([
            mine("cs_enrollments"),
            mine("cs_lesson_progress"),
            mine("cs_study_sessions").order("occurred_at", { ascending: false }).limit(400),
            mine("cs_bookmarks", "course_id"),
            mine("cs_follows", "mentor_id"),
            mine("cs_tasks").order("created_at", { ascending: false }),
            mine("cs_notes").order("created_at", { ascending: false }),
            mine("cs_group_members", "group_id"),
            mine("cs_conversations").order("updated_at", { ascending: false }),
            mine("cs_notifications").order("created_at", { ascending: false }).limit(60),
            mine("cs_quiz_attempts").order("created_at", { ascending: false }),
            mine("cs_certificates").order("issued_at", { ascending: false }),
            mine("cs_live_rsvps", "live_lesson_id"),
            mine("cs_live_participants", "live_lesson_id, joined_at, seconds"),
        ]);
        const rows = (q: { data: unknown }): Row[] => (q.data as Row[] | null) ?? [];
        return {
            profile,
            // Friends are a demo-only social graph today; a live learner sees the
            // same three people as a "who to study with" suggestion.
            friends: DEMO_FRIENDS,
            enrollments: rows(enr).map((r) => ({ courseId: s(r.course_id), enrolledAt: iso(r.enrolled_at), completedAt: r.completed_at ? iso(r.completed_at) : null, lastLessonId: s(r.last_lesson_id) || null })),
            progress: rows(prog).map((r) => ({ lessonId: s(r.lesson_id), positionSec: n(r.position_sec), completedAt: r.completed_at ? iso(r.completed_at) : null, updatedAt: iso(r.updated_at) })),
            sessions: rows(sess).map((r) => ({ id: s(r.id), lessonId: s(r.lesson_id) || null, minutes: n(r.minutes), occurredAt: iso(r.occurred_at) })),
            bookmarks: rows(bm).map((r) => s(r.course_id)),
            follows: rows(fol).map((r) => s(r.mentor_id)),
            tasks: rows(tasks).map((r) => ({ id: s(r.id), title: s(r.title), courseId: s(r.course_id) || null, dueAt: iso(r.due_at), doneAt: r.done_at ? iso(r.done_at) : null, createdAt: iso(r.created_at) })),
            notes: rows(notes).map((r) => ({ id: s(r.id), lessonId: s(r.lesson_id), atSec: r.at_sec == null ? null : n(r.at_sec), body: s(r.body), createdAt: iso(r.created_at) })),
            groupIds: rows(gm).map((r) => s(r.group_id)),
            conversations: rows(convs).map((r) => ({ id: s(r.id), peerKind: s(r.peer_kind, "mentor") as PeerKind, peerId: s(r.peer_id), peerName: s(r.peer_name), peerRole: s(r.peer_role), peerHue: (s(r.peer_hue) || "lilac") as Hue, lastBody: s(r.last_body), updatedAt: iso(r.updated_at), unread: n(r.unread) })),
            notifications: rows(notifs).map((r) => ({ id: s(r.id), kind: s(r.kind, "lesson") as UserState["notifications"][number]["kind"], title: s(r.title), body: s(r.body), href: s(r.href) || null, readAt: r.read_at ? iso(r.read_at) : null, createdAt: iso(r.created_at) })),
            attempts: rows(attempts).map((r) => ({ id: s(r.id), lessonId: s(r.lesson_id), score: n(r.score), total: n(r.total), createdAt: iso(r.created_at) })),
            certificates: rows(certs).map((r) => ({ id: s(r.id), courseId: s(r.course_id), code: s(r.code), issuedAt: iso(r.issued_at) })),
            rsvps: rows(rsvps).map((r) => s(r.live_lesson_id)),
            attendance: rows(attended).map((r) => ({ liveLessonId: s(r.live_lesson_id), joinedAt: iso(r.joined_at), seconds: n(r.seconds) })),
        };
    }

    subscribe(onChange: () => void): () => void {
        // Messages and notifications can arrive from elsewhere (a mentor's
        // console, another tab); the rest only changes through this client.
        const ch = this.client
            .channel(`cs-user-${this.org}-${this.userId}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "cs_messages", filter: `user_id=eq.${this.userId}` }, onChange)
            .on("postgres_changes", { event: "*", schema: "public", table: "cs_notifications", filter: `user_id=eq.${this.userId}` }, onChange)
            .subscribe();
        return () => {
            void this.client.removeChannel(ch);
        };
    }

    async updateProfile(patch: Partial<Profile>): Promise<void> {
        const row: Row = {};
        if (patch.name !== undefined) row.name = patch.name;
        if (patch.handle !== undefined) row.handle = patch.handle;
        if (patch.hue !== undefined) row.hue = patch.hue;
        if (patch.headline !== undefined) row.headline = patch.headline;
        if (patch.weeklyGoalMin !== undefined) row.weekly_goal_min = patch.weeklyGoalMin;
        if (patch.interests !== undefined) row.interests = patch.interests;
        if (patch.onboarded !== undefined) row.onboarded = patch.onboarded;
        if (patch.photoUrl !== undefined) row.photo_url = patch.photoUrl || null;
        const { error } = await this.client.from("cs_profiles").update(row).eq("organization_id", this.org).eq("user_id", this.userId);
        fail("profile", error);
        if (this.profileCache) this.profileCache = { ...this.profileCache, ...patch, photoUrl: patch.photoUrl === undefined ? this.profileCache.photoUrl : patch.photoUrl || undefined };
    }

    /**
     * Photos live in the public `cs-avatars` bucket at <org>/<user>/…; the
     * storage policies only let a learner write inside their own folder. Each
     * upload gets a fresh name so no cache ever shows a stale face, and older
     * files in the folder are cleared best-effort afterwards.
     */
    async uploadPhoto(data: Blob | ArrayBuffer): Promise<string> {
        const folder = `${this.org}/${this.userId}`;
        const path = `${folder}/avatar-${Date.now()}.jpg`;
        const bucket = this.client.storage.from("cs-avatars");
        const { error } = await bucket.upload(path, data, { contentType: "image/jpeg", cacheControl: "31536000", upsert: false });
        fail("photo", error);
        const { data: old } = await bucket.list(folder);
        const stale = (old ?? []).map((f) => `${folder}/${f.name}`).filter((p) => p !== path);
        if (stale.length) await bucket.remove(stale);
        return bucket.getPublicUrl(path).data.publicUrl;
    }

    async enroll(courseId: string): Promise<void> {
        const { error } = await this.client.from("cs_enrollments").upsert({ organization_id: this.org, user_id: this.userId, course_id: courseId }, { onConflict: "organization_id,user_id,course_id", ignoreDuplicates: true });
        fail("enroll", error);
    }

    async saveProgress(lessonId: string, positionSec: number, completed = false): Promise<void> {
        const now = new Date().toISOString();
        const row: Row = { organization_id: this.org, user_id: this.userId, lesson_id: lessonId, position_sec: Math.round(positionSec), updated_at: now };
        if (completed) row.completed_at = now;
        // Never un-complete: an upsert without completed_at would null it, so a
        // re-watch of a finished lesson keeps its tick.
        const { data: cur } = await this.client.from("cs_lesson_progress").select("completed_at").eq("organization_id", this.org).eq("user_id", this.userId).eq("lesson_id", lessonId).maybeSingle();
        const prior = (cur as Row | null)?.completed_at;
        if (prior && !completed) row.completed_at = prior;
        const { error } = await this.client.from("cs_lesson_progress").upsert(row, { onConflict: "organization_id,user_id,lesson_id" });
        fail("progress", error);
        // The enrollment remembers where to resume; completion is settled server-side.
        const { error: e2 } = await this.client.rpc("cs_touch_enrollment", { p_org: this.org, p_lesson: lessonId });
        if (e2) console.warn("[coir-six] cs_touch_enrollment:", e2.message);
    }

    async logStudy(lessonId: string | null, minutes: number): Promise<void> {
        if (minutes <= 0) return;
        const { error } = await this.client.from("cs_study_sessions").insert({ organization_id: this.org, user_id: this.userId, lesson_id: lessonId, minutes: Math.round(minutes) });
        fail("study", error);
    }

    private async toggleRow(table: string, col: string, value: string): Promise<boolean> {
        const { data } = await this.client.from(table).select(col).eq("organization_id", this.org).eq("user_id", this.userId).eq(col, value).maybeSingle();
        if (data) {
            const { error } = await this.client.from(table).delete().eq("organization_id", this.org).eq("user_id", this.userId).eq(col, value);
            fail(table, error);
            return false;
        }
        const { error } = await this.client.from(table).insert({ organization_id: this.org, user_id: this.userId, [col]: value });
        fail(table, error);
        return true;
    }
    toggleBookmark(courseId: string): Promise<boolean> {
        return this.toggleRow("cs_bookmarks", "course_id", courseId);
    }
    toggleFollow(mentorId: string): Promise<boolean> {
        return this.toggleRow("cs_follows", "mentor_id", mentorId);
    }
    toggleRsvp(liveLessonId: string): Promise<boolean> {
        return this.toggleRow("cs_live_rsvps", "live_lesson_id", liveLessonId);
    }

    /**
     * Open the classroom.
     *
     * `cs_join_live` records the attendance row and answers the only question
     * the client must not decide for itself — whether this learner is the host.
     * Then `coir-live` mints a media-server token. If the school has no media
     * server configured, that call fails and we fall back to `PresenceRoom`:
     * the class still has a roster, a chat and a host, on the mentor's own
     * stream. A tenant is never left staring at an error because its owner
     * hasn't finished setting up an SFU.
     */
    async openLiveRoom(input: OpenRoomInput): Promise<LiveRoom> {
        const profile = await this.ensureProfile();
        const { data, error } = await this.client.rpc("cs_join_live", { p_org: this.org, p_lesson: input.lesson.id });
        fail("join the class", error);
        const seat = (Array.isArray(data) ? data[0] : data) as Row | null;
        const isHost = Boolean(seat?.is_host);

        const ctx: LiveContext = {
            lesson: input.lesson,
            mentor: input.mentor,
            me: { id: this.userId, name: profile.name, hue: profile.hue, photoUrl: profile.photoUrl },
            isHost,
            media: input.media,
            captions: input.captions,
            filter: input.filter,
            // Captions are the transcript: keep every settled line, so the class
            // is searchable and summarisable once it is over.
            onTranscript: (line) => {
                void this.client
                    .from("cs_live_transcript")
                    .insert({
                        id: line.id.length === 36 ? line.id : undefined,
                        organization_id: this.org,
                        live_lesson_id: input.lesson.id,
                        user_id: this.userId,
                        speaker_name: profile.name,
                        text: line.text,
                        said_at: line.at,
                    })
                    .then(({ error }) => {
                        if (error) console.warn("[coir-six] transcript line dropped:", error.message);
                    });
            },
            hostOps: {
                mute: (identity, trackSid) => this.liveOp("mute", input.lesson.id, { identity, trackSid }),
                setStage: (identity, onStage) => this.liveOp("stage", input.lesson.id, { identity, onStage }),
                remove: (identity) => this.liveOp("remove", input.lesson.id, { identity }),
                end: () => this.liveOp("end", input.lesson.id, {}),
            },
        };

        let t: { url?: string; token?: string } | null = null;
        try {
            const res = await this.client.functions.invoke("coir-live", {
                body: { op: "token", organizationId: this.org, lessonId: input.lesson.id },
            });
            if (!res.error) t = res.data as { url?: string; token?: string } | null;
        } catch {
            /* no media server configured, or unreachable — fall through */
        }

        if (t?.url && t?.token) {
            const { LivekitRoom } = await import("./live/livekitRoom");
            return new LivekitRoom(ctx, t.url, t.token, (m) => void this.persistLiveChat(input.lesson.id, profile, m));
        }
        const { PresenceRoom } = await import("./live/presenceRoom");
        return new PresenceRoom(this.client, this.org, ctx);
    }

    /** The host half of the room: server-API calls the browser may not make. */
    private async liveOp(op: string, lessonId: string, extra: Record<string, unknown>): Promise<void> {
        const { error } = await this.client.functions.invoke("coir-live", {
            body: { op, organizationId: this.org, lessonId, ...extra },
        });
        if (error) throw new Error(`That didn't go through: ${error.message}`);
    }

    /** Chat is live over the data channel; this is only so it survives the class. */
    private async persistLiveChat(lessonId: string, p: Profile, m: { id: string; body: string; at: string }): Promise<void> {
        const { error } = await this.client.from("cs_live_chat").insert({
            id: m.id,
            organization_id: this.org,
            live_lesson_id: lessonId,
            user_id: this.userId,
            author_name: p.name,
            author_hue: p.hue,
            author_photo_url: p.photoUrl ?? null,
            body: m.body,
            created_at: m.at,
        });
        if (error) console.warn("[coir-six] live chat not persisted:", error.message);
    }

    async liveCaptionUrl(liveLessonId: string): Promise<string> {
        const { data, error } = await this.client.functions.invoke("coir-live", {
            body: { op: "caption", organizationId: this.org, lessonId: liveLessonId },
        });
        if (error) throw new Error("Captions couldn't be started for this class.");
        const url = (data as { url?: string } | null)?.url;
        if (!url) throw new Error("Captions couldn't be started for this class.");
        return url;
    }

    async liveRecap(liveLessonId: string, force = false): Promise<LiveRecap | null> {
        const { data, error } = await this.client.functions.invoke("coir-live-recap", {
            body: { organizationId: this.org, lessonId: liveLessonId, force },
        });
        if (error) return null;
        return ((data as { recap?: LiveRecap } | null)?.recap) ?? null;
    }

    async liveTranscript(liveLessonId: string): Promise<TranscriptLine[]> {
        const { data, error } = await this.client
            .from("cs_live_transcript")
            .select("id, speaker_name, text, said_at")
            .eq("organization_id", this.org)
            .eq("live_lesson_id", liveLessonId)
            .order("said_at", { ascending: true })
            .limit(2000);
        if (error || !data) return [];
        return (data as Row[]).map((r) => ({ id: s(r.id), speaker: s(r.speaker_name, "Someone"), text: s(r.text), at: iso(r.said_at) }));
    }

    async leaveLive(liveLessonId: string, seconds: number): Promise<void> {
        const { error } = await this.client.rpc("cs_leave_live", {
            p_org: this.org,
            p_lesson: liveLessonId,
            p_seconds: Math.max(0, Math.round(seconds)),
        });
        if (error) console.warn("[coir-six] cs_leave_live:", error.message);
    }

    async saveRecording(liveLessonId: string, data: Blob | ArrayBuffer, mimeType: string): Promise<string> {
        const ext = mimeType.includes("mp4") ? "mp4" : "webm";
        const path = `${this.org}/${liveLessonId}/${Date.now()}.${ext}`;
        const bucket = this.client.storage.from("cs-recordings");
        const { error } = await bucket.upload(path, data, { contentType: mimeType, cacheControl: "31536000", upsert: false });
        fail("recording", error);
        const url = bucket.getPublicUrl(path).data.publicUrl;
        await this.liveOp("recording", liveLessonId, { url });
        return url;
    }

    async addTask(input: NewTask): Promise<Task> {
        const { data, error } = await this.client.from("cs_tasks").insert({ organization_id: this.org, user_id: this.userId, title: input.title, course_id: input.courseId, due_at: input.dueAt }).select("*").single();
        fail("task", error);
        const r = data as Row;
        return { id: s(r.id), title: s(r.title), courseId: s(r.course_id) || null, dueAt: iso(r.due_at), doneAt: null, createdAt: iso(r.created_at) };
    }
    async toggleTask(id: string): Promise<void> {
        const { data } = await this.client.from("cs_tasks").select("done_at").eq("id", id).eq("user_id", this.userId).maybeSingle();
        const done = Boolean((data as Row | null)?.done_at);
        const { error } = await this.client.from("cs_tasks").update({ done_at: done ? null : new Date().toISOString() }).eq("id", id).eq("user_id", this.userId);
        fail("task", error);
    }
    async deleteTask(id: string): Promise<void> {
        const { error } = await this.client.from("cs_tasks").delete().eq("id", id).eq("user_id", this.userId);
        fail("task", error);
    }

    async addNote(lessonId: string, body: string, atSec: number | null): Promise<Note> {
        const { data, error } = await this.client.from("cs_notes").insert({ organization_id: this.org, user_id: this.userId, lesson_id: lessonId, body, at_sec: atSec }).select("*").single();
        fail("note", error);
        const r = data as Row;
        return { id: s(r.id), lessonId, atSec, body, createdAt: iso(r.created_at) };
    }
    async deleteNote(id: string): Promise<void> {
        const { error } = await this.client.from("cs_notes").delete().eq("id", id).eq("user_id", this.userId);
        fail("note", error);
    }

    joinGroup(groupId: string): Promise<boolean> {
        return this.toggleRow("cs_group_members", "group_id", groupId);
    }
    async loadGroupPosts(groupId: string): Promise<GroupPost[]> {
        const { data, error } = await this.client.from("cs_group_posts").select("*").eq("organization_id", this.org).eq("group_id", groupId).order("created_at", { ascending: false }).limit(100);
        fail("posts", error);
        return ((data as Row[] | null) ?? []).map((r) => ({ id: s(r.id), groupId, authorName: s(r.author_name), authorHue: (s(r.author_hue) || "lilac") as Hue, authorPhotoUrl: s(r.author_photo_url) || undefined, body: s(r.body), createdAt: iso(r.created_at), mine: s(r.user_id) === this.userId }));
    }
    async postToGroup(groupId: string, body: string): Promise<GroupPost> {
        const me = await this.ensureProfile();
        const { data, error } = await this.client.from("cs_group_posts").insert({ organization_id: this.org, group_id: groupId, user_id: this.userId, author_name: me.name, author_hue: me.hue, author_photo_url: me.photoUrl ?? null, body }).select("*").single();
        fail("post", error);
        const r = data as Row;
        return { id: s(r.id), groupId, authorName: me.name, authorHue: me.hue, authorPhotoUrl: me.photoUrl, body, createdAt: iso(r.created_at), mine: true };
    }

    async startConversation(peerKind: PeerKind, peerId: string): Promise<Conversation> {
        const { data: existing } = await this.client.from("cs_conversations").select("*").eq("organization_id", this.org).eq("user_id", this.userId).eq("peer_kind", peerKind).eq("peer_id", peerId).maybeSingle();
        const cat = this.catalogueCache ?? (await this.loadCatalogue());
        const mentor = peerKind === "mentor" ? cat.mentors.find((m) => m.id === peerId) : null;
        const friend = peerKind === "friend" ? DEMO_FRIENDS.find((f) => f.id === peerId) : null;
        const name = mentor?.name ?? friend?.name ?? "Someone";
        const map = (r: Row): Conversation => ({ id: s(r.id), peerKind, peerId, peerName: s(r.peer_name), peerRole: s(r.peer_role), peerHue: (s(r.peer_hue) || "lilac") as Hue, lastBody: s(r.last_body), updatedAt: iso(r.updated_at), unread: n(r.unread) });
        if (existing) return map(existing as Row);
        const { data, error } = await this.client
            .from("cs_conversations")
            .insert({ organization_id: this.org, user_id: this.userId, peer_kind: peerKind, peer_id: peerId, peer_name: name, peer_role: mentor ? "Mentor" : (friend?.label ?? "Friend"), peer_hue: mentor?.hue ?? friend?.hue ?? hueFor(name) })
            .select("*")
            .single();
        fail("conversation", error);
        return map(data as Row);
    }
    async loadMessages(conversationId: string): Promise<Message[]> {
        const { data, error } = await this.client.from("cs_messages").select("*").eq("conversation_id", conversationId).eq("user_id", this.userId).order("created_at").limit(300);
        fail("messages", error);
        return ((data as Row[] | null) ?? []).map((r) => ({ id: s(r.id), conversationId, fromMe: Boolean(r.from_me), body: s(r.body), createdAt: iso(r.created_at) }));
    }
    async sendMessage(conversationId: string, body: string): Promise<Message> {
        const { data, error } = await this.client.from("cs_messages").insert({ organization_id: this.org, conversation_id: conversationId, user_id: this.userId, from_me: true, body }).select("*").single();
        fail("message", error);
        const r = data as Row;
        await this.client.from("cs_conversations").update({ last_body: body, updated_at: iso(r.created_at) }).eq("id", conversationId).eq("user_id", this.userId);
        return { id: s(r.id), conversationId, fromMe: true, body, createdAt: iso(r.created_at) };
    }
    async markRead(conversationId: string): Promise<void> {
        await this.client.from("cs_conversations").update({ unread: 0 }).eq("id", conversationId).eq("user_id", this.userId);
    }

    async markNotificationsRead(ids?: string[]): Promise<void> {
        let q = this.client.from("cs_notifications").update({ read_at: new Date().toISOString() }).eq("organization_id", this.org).eq("user_id", this.userId).is("read_at", null);
        if (ids?.length) q = q.in("id", ids);
        const { error } = await q;
        fail("notifications", error);
    }

    async submitQuiz(lessonId: string, score: number, total: number): Promise<QuizAttempt> {
        const { data, error } = await this.client.from("cs_quiz_attempts").insert({ organization_id: this.org, user_id: this.userId, lesson_id: lessonId, score, total }).select("*").single();
        fail("quiz", error);
        const r = data as Row;
        if (score / Math.max(1, total) >= 0.66) await this.saveProgress(lessonId, 0, true);
        return { id: s(r.id), lessonId, score, total, createdAt: iso(r.created_at) };
    }

    async issueCertificate(courseId: string): Promise<Certificate> {
        const { data: existing } = await this.client.from("cs_certificates").select("*").eq("organization_id", this.org).eq("user_id", this.userId).eq("course_id", courseId).maybeSingle();
        if (existing) {
            const r = existing as Row;
            return { id: s(r.id), courseId, code: s(r.code), issuedAt: iso(r.issued_at) };
        }
        // The server checks every lesson is complete before it will insert.
        const { data, error } = await this.client.rpc("cs_issue_certificate", { p_org: this.org, p_course: courseId });
        fail("certificate", error);
        const r = (Array.isArray(data) ? data[0] : data) as Row | null;
        if (!r) throw new Error("Finish every lesson first.");
        return { id: s(r.id) || uid("cert"), courseId, code: s(r.code), issuedAt: iso(r.issued_at) };
    }
}
