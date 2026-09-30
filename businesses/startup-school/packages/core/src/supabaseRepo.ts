import { emptyVenture } from "./frameworks";
import type { LiveContext, LiveRecap, LiveRoom, TranscriptLine } from "./live/room";
import type { OpenRoomInput, Repo } from "./repo";
import type {
    Advice,
    Booking,
    BookingAction,
    CohortSignal,
    Catalogue,
    Certificate,
    Conversation,
    Course,
    Experiment,
    ExperimentStatus,
    EvidenceType,
    GroupPost,
    Lesson,
    LessonBlock,
    LiveLesson,
    Mentor,
    MentorBooking,
    Message,
    NewExperiment,
    NewTask,
    Note,
    PeerKind,
    Profile,
    QuizAttempt,
    SessionBrief,
    SessionCapture,
    Slot,
    QuizQuestion,
    Task,
    UserState,
    Venture,
    VentureConfidence,
    VenturePath,
    VentureSection,
    VentureSectionId,
    VentureStage,
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
    theme: s(r.theme, "fund") as Course["theme"], coverUrl: s(r.cover_url) || undefined, rating: n(r.rating, 4.8), learners: n(r.learners), outcomes: Array.isArray(r.outcomes) ? (r.outcomes as string[]) : [],
    finalProjectTitle: s(r.final_project_title) || undefined, finalProjectDescription: s(r.final_project_description) || undefined,
    publishedAt: iso(r.published_at),
});
const mapLesson = (r: Row): Lesson => ({
    id: s(r.id), courseId: s(r.course_id), moduleId: s(r.module_id), title: s(r.title), kind: s(r.kind, "video") as Lesson["kind"],
    durationSec: n(r.duration_sec), videoUrl: s(r.video_url) || undefined, captionsUrl: s(r.captions_url) || undefined, source: s(r.source) || undefined, body: s(r.body), revision: s(r.revision) || undefined, sort: n(r.sort),
});
const mapLessonBlock = (r: Row): LessonBlock => ({
    id: s(r.id), lessonId: s(r.lesson_id), type: s(r.type, "learn") as LessonBlock["type"], title: s(r.title), content: s(r.content),
    actionHref: s(r.action_href) || undefined, actionLabel: s(r.action_label) || undefined, sort: n(r.sort),
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

const mapBooking = (r: Row): Booking => ({
    id: s(r.id), mentorId: s(r.mentor_id),
    startsAt: iso(r.starts_at), endsAt: iso(r.ends_at),
    bookedTz: s(r.booked_tz) || "UTC",
    status: (s(r.status) || "confirmed") as Booking["status"],
    agenda: s(r.agenda), sharedNotes: s(r.shared_notes),
    roomId: s(r.room_id) || undefined,
    rescheduledFrom: s(r.rescheduled_from) || undefined,
    cancelReason: s(r.cancel_reason), createdAt: iso(r.created_at),
});

const CONFIDENCES: VentureConfidence[] = ["guess", "evidence", "proven"];
const VENTURE_PATHS: VenturePath[] = ["build", "phoxta_turnkey", "hybrid"];
const EXPERIMENT_STATUSES: ExperimentStatus[] = ["planned", "running", "validated", "invalidated", "inconclusive"];
const EVIDENCE_TYPES: EvidenceType[] = ["conversation", "payment", "metric", "prototype", "observation", "research"];

/**
 * The venture record comes back as one jsonb column, so it is the one place in
 * this file where the shape is not enforced by the column list. Validate it
 * here rather than trusting it downstream: the doc is written by this app, but
 * it survives schema changes and half-finished saves, and a section with a
 * missing `claims` array would crash the page that renders it.
 */
const mapVenture = (r: Row | undefined): Venture => {
    if (!r) return emptyVenture();
    const doc = (r.doc ?? {}) as Record<string, unknown>;
    const raw = (doc.sections ?? {}) as Record<string, unknown>;
    const sections: Partial<Record<VentureSectionId, VentureSection>> = {};
    for (const [k, v] of Object.entries(raw)) {
        const sec = (v ?? {}) as Record<string, unknown>;
        sections[k as VentureSectionId] = {
            body: s(sec.body),
            claims: (Array.isArray(sec.claims) ? sec.claims : []).map((c) => {
                const o = (c ?? {}) as Record<string, unknown>;
                return {
                    id: s(o.id) || uid("vc"),
                    text: s(o.text),
                    confidence: (CONFIDENCES.includes(s(o.confidence) as VentureConfidence)
                        ? s(o.confidence)
                        : "guess") as VentureConfidence,
                    test: s(o.test),
                };
            }),
            updatedAt: iso(sec.updatedAt),
        };
    }
    return {
        name: s(r.name),
        oneLiner: s(r.one_liner),
        stage: (s(r.stage) || "fit") as VentureStage,
        path: VENTURE_PATHS.includes(s(doc.path) as VenturePath) ? s(doc.path) as VenturePath : "build",
        country: s(r.country),
        sections,
        updatedAt: iso(r.updated_at),
    };
};

const mapExperiment = (r: Row): Experiment => ({
    id: s(r.id),
    claimId: s(r.claim_id) || null,
    sectionId: s(r.section_id) as VentureSectionId || null,
    title: s(r.title),
    hypothesis: s(r.hypothesis),
    method: s(r.method),
    threshold: s(r.threshold),
    status: (EXPERIMENT_STATUSES.includes(s(r.status) as ExperimentStatus) ? s(r.status) : "planned") as ExperimentStatus,
    evidenceType: EVIDENCE_TYPES.includes(s(r.evidence_type) as EvidenceType) ? s(r.evidence_type) as EvidenceType : null,
    evidence: s(r.evidence),
    sourceUrl: s(r.source_url),
    result: s(r.result),
    decision: s(r.decision),
    nextStep: s(r.next_step),
    dueAt: r.due_at ? iso(r.due_at) : null,
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
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
        const [cats, mentors, courses, modules, lessons, blocks, quiz, live, groups, avail] = await Promise.all([
            this.t("cs_categories").order("sort"),
            this.t("cs_mentors").order("name"),
            this.t("cs_courses").eq("published", true).order("published_at"),
            this.t("cs_modules").order("sort"),
            this.t("cs_lessons").order("sort"),
            this.t("cs_lesson_blocks").order("lesson_id").order("sort"),
            this.t("cs_quiz_questions").order("sort"),
            this.t("cs_live_lessons").order("starts_at"),
            this.client.from("cs_groups").select("*").eq("organization_id", o).order("members", { ascending: false }),
            this.t("cs_availability").order("start_time"),
        ]);
        // Paid course material is fetched from this school. Never substitute a
        // bundled catalogue here: an entitlement or policy failure must stay a
        // failure rather than leaking local lesson content to an unpaid account.
        const rows = (courses.data as Row[] | null) ?? [];
        fail("course catalogue", courses.error);
        fail("course categories", cats.error);
        fail("course mentors", mentors.error);
        fail("course modules", modules.error);
        fail("course lessons", lessons.error);
        fail("course blocks", blocks.error);
        fail("course quiz", quiz.error);
        fail("live lessons", live.error);
        fail("course groups", groups.error);
        fail("mentor availability", avail.error);
        const privateUrl = async (value: unknown): Promise<string | undefined> => {
            const url = s(value);
            const marker = url.startsWith("school-media:") ? "school-media:" : url.startsWith("school-recording:") ? "school-recording:" : null;
            if (!marker) return url || undefined;
            const bucket = marker === "school-media:" ? "cs-school-media" : "cs-recordings";
            const result = await this.client.storage.from(bucket).createSignedUrl(url.slice(marker.length), 3600);
            return result.data?.signedUrl;
        };
        const resolvedLessons = await Promise.all(((lessons.data as Row[] | null) ?? []).map(async row => ({ ...mapLesson(row), videoUrl: await privateUrl(row.video_url), captionsUrl: await privateUrl(row.captions_url) })));
        const resolvedLive = await Promise.all(((live.data as Row[] | null) ?? []).map(async row => ({ ...mapLive(row), recordingUrl: await privateUrl(row.recording_url) })));
        const cat: Catalogue = {
            categories: ((cats.data as Row[] | null) ?? []).map((r) => ({ id: s(r.id) as Catalogue["categories"][number]["id"], name: s(r.name), blurb: s(r.blurb) })),
            mentors: ((mentors.data as Row[] | null) ?? []).map(mapMentor),
            courses: rows.map(mapCourse),
            modules: ((modules.data as Row[] | null) ?? []).map((r) => ({ id: s(r.id), courseId: s(r.course_id), title: s(r.title), sort: n(r.sort) })),
            lessons: resolvedLessons,
            quiz: ((quiz.data as Row[] | null) ?? []).map(mapQuiz),
            liveLessons: resolvedLive,
            lessonBlocks: ((blocks.data as Row[] | null) ?? []).map(mapLessonBlock),
            groups: ((groups.data as Row[] | null) ?? []).map((r) => ({ id: s(r.id), name: s(r.name), categoryId: s(r.category_id) as Catalogue["groups"][number]["categoryId"], blurb: s(r.blurb), members: n(r.members), imageUrl: s(r.image_url) || undefined })),
            availability: ((avail.data as Row[] | null) ?? []).map((r) => ({
                id: s(r.id), mentorId: s(r.mentor_id),
                weekday: r.weekday === null || r.weekday === undefined ? null : n(r.weekday),
                onDate: s(r.on_date) || null,
                // `time` comes back as "14:00:00"; the rules are minute-precision.
                startTime: s(r.start_time).slice(0, 5), endTime: s(r.end_time).slice(0, 5),
                closed: Boolean(r.closed),
            })),
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
        const [enr, prog, sess, bm, fol, tasks, notes, gm, convs, notifs, attempts, certs, rsvps, attended, books, vent, experiments] = await Promise.all([
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
            mine("cs_bookings").order("starts_at", { ascending: false }),
            mine("cs_ventures"),
            mine("cs_experiments").order("updated_at", { ascending: false }),
        ]);
        const rows = (q: { data: unknown }): Row[] => (q.data as Row[] | null) ?? [];
        return {
            profile,
            friends: [],
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
            bookings: rows(books).map(mapBooking),
            venture: mapVenture(rows(vent)[0]),
            experiments: rows(experiments).map(mapExperiment),
        };
    }

    subscribe(onChange: () => void): () => void {
        // Messages and notifications can arrive from elsewhere (a mentor's
        // console, another tab); the rest only changes through this client.
        const ch = this.client
            .channel(`cs-user-${this.org}-${this.userId}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "cs_messages", filter: `user_id=eq.${this.userId}` }, onChange)
            .on("postgres_changes", { event: "*", schema: "public", table: "cs_notifications", filter: `user_id=eq.${this.userId}` }, onChange)
            .on("postgres_changes", { event: "*", schema: "public", table: "cs_experiments", filter: `user_id=eq.${this.userId}` }, onChange)
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
        if (e2) console.warn("[startup-school] cs_touch_enrollment:", e2.message);
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
                        if (error) console.warn("[startup-school] transcript line dropped:", error.message);
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
        if (error) console.warn("[startup-school] live chat not persisted:", error.message);
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
        if (error) console.warn("[startup-school] cs_leave_live:", error.message);
    }

    async saveRecording(liveLessonId: string, data: Blob | ArrayBuffer, mimeType: string): Promise<string> {
        const ext = mimeType.includes("mp4") ? "mp4" : "webm";
        const path = `${this.org}/${liveLessonId}/${Date.now()}.${ext}`;
        const bucket = this.client.storage.from("cs-recordings");
        const { error } = await bucket.upload(path, data, { contentType: mimeType, cacheControl: "31536000", upsert: false });
        fail("recording", error);
        const url = `school-recording:${path}`;
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
        const name = mentor?.name ?? "Someone";
        const map = (r: Row): Conversation => ({ id: s(r.id), peerKind, peerId, peerName: s(r.peer_name), peerRole: s(r.peer_role), peerHue: (s(r.peer_hue) || "lilac") as Hue, lastBody: s(r.last_body), updatedAt: iso(r.updated_at), unread: n(r.unread) });
        if (existing) return map(existing as Row);
        const { data, error } = await this.client
            .from("cs_conversations")
            .insert({ organization_id: this.org, user_id: this.userId, peer_kind: peerKind, peer_id: peerId, peer_name: name, peer_role: mentor ? "Mentor" : "Founder", peer_hue: mentor?.hue ?? hueFor(name) })
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
    // ---- 1:1 booking -------------------------------------------------------
    // Slot generation, the notice window and the overlap rule all live in SQL
    // (`cs_mentor_slots`, `cs_book_slot`), so a second client cannot hold a
    // different idea of what is bookable.

    async mentorSlots(mentorId: string, fromISO: string, toISO: string): Promise<Slot[]> {
        const { data, error } = await this.client.rpc("cs_mentor_slots", {
            p_org: this.org, p_mentor: mentorId,
            p_from: fromISO.slice(0, 10), p_to: toISO.slice(0, 10),
        });
        fail("load availability", error);
        return ((data as Row[] | null) ?? []).map((r) => ({ startsAt: iso(r.slot_start), endsAt: iso(r.slot_end) }));
    }

    async bookSlot(mentorId: string, startsAtISO: string, tz: string, agenda: string): Promise<string> {
        const { data, error } = await this.client.rpc("cs_book_slot", {
            p_org: this.org, p_mentor: mentorId, p_starts_at: startsAtISO, p_tz: tz, p_agenda: agenda,
        });
        // The exclusion constraint speaks here: "that time was just taken".
        fail("book the session", error);
        return String(data ?? "");
    }

    async cancelBooking(id: string, reason = ""): Promise<void> {
        const { error } = await this.client.rpc("cs_cancel_booking", { p_org: this.org, p_id: id, p_reason: reason });
        fail("cancel the session", error);
    }

    async rescheduleBooking(id: string, startsAtISO: string): Promise<string> {
        const { data, error } = await this.client.rpc("cs_reschedule_booking", {
            p_org: this.org, p_id: id, p_starts_at: startsAtISO,
        });
        fail("move the session", error);
        return String(data ?? "");
    }

    async bookingActions(bookingId: string): Promise<BookingAction[]> {
        const { data, error } = await this.client.from("cs_booking_actions")
            .select("*").eq("organization_id", this.org).eq("booking_id", bookingId)
            .order("created_at");
        fail("load actions", error);
        return ((data as Row[] | null) ?? []).map((r) => ({
            id: s(r.id), bookingId: s(r.booking_id), body: s(r.body),
            doneAt: r.done_at ? iso(r.done_at) : null, createdAt: iso(r.created_at),
        }));
    }

    async addBookingAction(bookingId: string, body: string): Promise<BookingAction> {
        const { data, error } = await this.client.from("cs_booking_actions")
            .insert({ organization_id: this.org, booking_id: bookingId, user_id: this.userId, body })
            .select("*").single();
        fail("add the action", error);
        const r = data as Row;
        return { id: s(r.id), bookingId: s(r.booking_id), body: s(r.body), doneAt: null, createdAt: iso(r.created_at) };
    }

    async toggleBookingAction(id: string): Promise<void> {
        const cur = await this.client.from("cs_booking_actions")
            .select("done_at").eq("organization_id", this.org).eq("id", id).single();
        fail("load the action", cur.error);
        const done = (cur.data as Row | null)?.done_at;
        const { error } = await this.client.from("cs_booking_actions")
            .update({ done_at: done ? null : new Date().toISOString() })
            .eq("organization_id", this.org).eq("id", id);
        fail("update the action", error);
    }

    // ---- the mentor's side -------------------------------------------------

    async myMentor(): Promise<Mentor | null> {
        const { data, error } = await this.client.rpc("cs_my_mentor", { p_org: this.org });
        if (error) return null;
        const r = ((data as Row[] | null) ?? [])[0];
        if (!r) return null;
        return {
            id: s(r.id), name: s(r.name), role: s(r.role),
            hue: (s(r.hue) || "lilac") as Hue,
            photoUrl: s(r.photo_url) || undefined,
            sessionMin: n(r.session_min, 30),
            timezone: s(r.timezone) || "UTC",
        } as Mentor;
    }

    async mentorBookings(): Promise<MentorBooking[]> {
        const { data, error } = await this.client.rpc("cs_mentor_desk", { p_org: this.org });
        if (error) return [];
        return ((data as Row[] | null) ?? []).map((r) => ({
            ...mapBooking(r),
            founderId: s(r.user_id),
            founderName: s(r.founder_name, "A founder"),
            founderHue: (s(r.founder_hue) || "lilac") as Hue,
            founderPhotoUrl: s(r.founder_photo_url) || undefined,
            founderOneLiner: s(r.founder_one_liner),
            briefAt: r.brief_at ? iso(r.brief_at) : null,
        }));
    }

    // ---- the venture record and the three AI surfaces ----------------------

    async saveVenture(patch: Partial<Venture>): Promise<Venture> {
        // Read-modify-write on one jsonb column. A section is replaced whole —
        // that is how the page edits it — but the sections a founder has not
        // touched have to survive, so merge rather than overwrite.
        const cur = await this.client.from("cs_ventures")
            .select("*").eq("organization_id", this.org).eq("user_id", this.userId).maybeSingle();
        const before = mapVenture((cur.data as Row | null) ?? undefined);
        const next: Venture = {
            ...before,
            ...patch,
            sections: { ...before.sections, ...(patch.sections ?? {}) },
            updatedAt: new Date().toISOString(),
        };

        const { error } = await this.client.from("cs_ventures").upsert({
            organization_id: this.org,
            user_id: this.userId,
            name: next.name,
            one_liner: next.oneLiner,
            stage: next.stage,
            country: next.country,
            doc: { sections: next.sections, path: next.path },
            updated_at: next.updatedAt,
        }, { onConflict: "organization_id,user_id" });
        fail("save the venture record", error);
        return next;
    }

    async addExperiment(input: NewExperiment): Promise<Experiment> {
        const { data, error } = await this.client.from("cs_experiments").insert({
            organization_id: this.org,
            user_id: this.userId,
            claim_id: input.claimId ?? null,
            section_id: input.sectionId ?? null,
            title: input.title.trim(),
            hypothesis: input.hypothesis.trim(),
            method: input.method.trim(),
            threshold: input.threshold.trim(),
            status: input.status ?? "planned",
            evidence_type: input.evidenceType ?? null,
            evidence: input.evidence?.trim() ?? "",
            source_url: input.sourceUrl?.trim() ?? "",
            result: input.result?.trim() ?? "",
            decision: input.decision?.trim() ?? "",
            next_step: input.nextStep?.trim() ?? "",
            due_at: input.dueAt ?? null,
        }).select("*").single();
        fail("create the experiment", error);
        return mapExperiment(data as Row);
    }

    async updateExperiment(id: string, patch: Partial<Experiment>): Promise<Experiment> {
        const row: Row = { updated_at: new Date().toISOString() };
        if (patch.claimId !== undefined) row.claim_id = patch.claimId;
        if (patch.sectionId !== undefined) row.section_id = patch.sectionId;
        if (patch.title !== undefined) row.title = patch.title.trim();
        if (patch.hypothesis !== undefined) row.hypothesis = patch.hypothesis.trim();
        if (patch.method !== undefined) row.method = patch.method.trim();
        if (patch.threshold !== undefined) row.threshold = patch.threshold.trim();
        if (patch.status !== undefined) row.status = patch.status;
        if (patch.evidenceType !== undefined) row.evidence_type = patch.evidenceType;
        if (patch.evidence !== undefined) row.evidence = patch.evidence.trim();
        if (patch.sourceUrl !== undefined) row.source_url = patch.sourceUrl.trim();
        if (patch.result !== undefined) row.result = patch.result.trim();
        if (patch.decision !== undefined) row.decision = patch.decision.trim();
        if (patch.nextStep !== undefined) row.next_step = patch.nextStep.trim();
        if (patch.dueAt !== undefined) row.due_at = patch.dueAt;
        const { data, error } = await this.client.from("cs_experiments")
            .update(row).eq("organization_id", this.org).eq("user_id", this.userId).eq("id", id).select("*").single();
        fail("save the experiment", error);
        return mapExperiment(data as Row);
    }

    async deleteExperiment(id: string): Promise<void> {
        const { error } = await this.client.from("cs_experiments")
            .delete().eq("organization_id", this.org).eq("user_id", this.userId).eq("id", id);
        fail("delete the experiment", error);
    }

    async advise(question: string): Promise<Advice> {
        const { data, error } = await this.client.functions.invoke("startup-school-ai", {
            body: { op: "advise", organizationId: this.org, question },
        });
        if (error) throw new Error("The adviser is not reachable right now.");
        const advice = (data as { advice?: Advice } | null)?.advice;
        if (!advice) throw new Error("The adviser came back empty.");
        return advice;
    }

    /**
     * Null rather than a throw when the caller is not the mentor: the panel
     * simply does not appear for a founder, and an error toast would be telling
     * them something about a page they are not on.
     */
    async sessionBrief(bookingId: string, force = false): Promise<SessionBrief | null> {
        const { data, error } = await this.client.functions.invoke("startup-school-ai", {
            body: { op: "brief", organizationId: this.org, bookingId, force },
        });
        if (error) return null;
        return ((data as { brief?: SessionBrief } | null)?.brief) ?? null;
    }

    async captureSession(bookingId: string): Promise<SessionCapture | null> {
        const { data, error } = await this.client.functions.invoke("startup-school-ai", {
            body: { op: "capture", organizationId: this.org, bookingId },
        });
        if (error) return null;
        return ((data as { capture?: SessionCapture } | null)?.capture) ?? null;
    }

    async saveSessionNotes(bookingId: string, notes: string, actions: string[]): Promise<void> {
        const { error } = await this.client.from("cs_bookings")
            .update({ shared_notes: notes })
            .eq("organization_id", this.org).eq("id", bookingId);
        fail("save the notes", error);

        const rows = actions.map((body) => ({
            organization_id: this.org, booking_id: bookingId, user_id: this.userId, body,
        }));
        if (rows.length) {
            const ins = await this.client.from("cs_booking_actions").insert(rows);
            fail("save the actions", ins.error);
        }
    }

    async cohortSignal(days = 14): Promise<CohortSignal[]> {
        const { data, error } = await this.client.rpc("cs_cohort_signal", { p_org: this.org, p_days: days });
        fail("load the cohort signal", error);
        return ((data as Row[] | null) ?? []).map((r) => ({
            lessonId: s(r.lesson_id),
            lessonTitle: s(r.lesson_title),
            courseTitle: s(r.course_title),
            attempts: n(r.attempts),
            avgScore: n(r.avg_score),
        }));
    }
}
