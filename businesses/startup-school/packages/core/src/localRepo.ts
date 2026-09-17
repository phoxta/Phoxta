import { base64Encode } from "./base64";
import { computeSlots } from "./booking";
import { STAGE_LABEL, localAdvice } from "./frameworks";
import { DemoRoom } from "./live/demoRoom";
import type { LiveRoom } from "./live/room";
import { AVAILABILITY, CATALOGUE, MENTORS, demoBookingActions, demoGroupPosts, demoMessages, demoUserState } from "./seed";
import type { OpenRoomInput, Repo } from "./repo";
import type {
    Advice,
    Booking,
    BookingAction,
    CohortSignal,
    Mentor,
    MentorBooking,
    Catalogue,
    Certificate,
    Conversation,
    GroupPost,
    Message,
    NewTask,
    Note,
    PeerKind,
    Profile,
    QuizAttempt,
    SessionBrief,
    SessionCapture,
    Slot,
    Task,
    UserState,
    Venture,
} from "./types";
import { hueFor, uid } from "./format";

/**
 * The demo learner, persisted on the device.
 *
 * Every write lands in the key-value store the app hands in (localStorage on
 * the web, AsyncStorage on a phone) so a visitor's exploration survives a
 * restart, and every read is synchronous underneath once the stores have
 * hydrated — the async surface is only there so screens treat it exactly like
 * the live backend. Nothing here leaves the device.
 */

const KEY = "startup-school:demo:v2";
const MSG_KEY = "startup-school:demo:messages:v2";
const POST_KEY = "startup-school:demo:posts:v2";
const ACTION_KEY = "startup-school:demo:actions:v1";

/** The persistence the demo needs: the shape of localStorage and AsyncStorage alike, always async. */
export interface KeyValueStore {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
}

type Store<T> = { ready(): Promise<void>; get(): T; set(v: T): void };

function store<T>(kv: KeyValueStore, key: string, initial: () => T): Store<T> {
    let cache: T | null = null;
    let hydrated: Promise<void> | null = null;
    return {
        ready() {
            if (!hydrated) {
                hydrated = kv
                    .getItem(key)
                    .then((raw) => {
                        if (cache === null) cache = raw ? (JSON.parse(raw) as T) : initial();
                    })
                    .catch(() => {
                        if (cache === null) cache = initial();
                    });
            }
            return hydrated;
        },
        get() {
            if (cache === null) cache = initial();
            return cache;
        },
        set(v: T) {
            cache = v;
            kv.setItem(key, JSON.stringify(v)).catch(() => {
                /* private mode / full disk: the session still works, it just won't persist */
            });
        },
    };
}

/** Deep copy of JSON-shaped state (the demo's data is plain JSON; structuredClone isn't on every runtime). */
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** A mentor's reply in the demo — the inbox has to answer or it is a form. */
function mentorReply(peerName: string, incoming: string): string {
    const first = peerName.split(" ")[0];
    const s = incoming.toLowerCase();
    if (/stuck|help|error|bug|broken/.test(s)) return `Send me the smallest example that reproduces it and I'll take a look before ${first === "Leonardo" ? "office hours" : "the weekend"}.`;
    if (/thank/.test(s)) return "Any time. Keep going — the next lesson is the one that makes this click.";
    if (/\?$/.test(incoming.trim())) return "Good question. Short answer: try it both ways and see which one you can explain to someone else. Long answer in the next lesson.";
    return `Noted — I'll come back to you on this after I've looked at your progress. Nice pace this week.`;
}

export class LocalRepo implements Repo {
    readonly kind = "demo" as const;
    private user: Store<UserState>;
    private messages: Store<Record<string, Message[]>>;
    private posts: Store<Record<string, GroupPost[]>>;
    private actions: Store<Record<string, BookingAction[]>>;
    private listeners = new Set<() => void>();

    constructor(kv: KeyValueStore) {
        this.user = store<UserState>(kv, KEY, demoUserState);
        this.messages = store<Record<string, Message[]>>(kv, MSG_KEY, () => ({}));
        this.posts = store<Record<string, GroupPost[]>>(kv, POST_KEY, () => ({}));
        this.actions = store<Record<string, BookingAction[]>>(kv, ACTION_KEY, () => ({}));
    }

    /** Every method waits for the stores to hydrate once, so a cold start never reads the defaults over saved data. */
    private async ready(): Promise<void> {
        await Promise.all([this.user.ready(), this.messages.ready(), this.posts.ready(), this.actions.ready()]);
    }

    private write(mutate: (u: UserState) => void): void {
        const next = clone(this.user.get());
        mutate(next);
        this.user.set(next);
    }
    private emit(): void {
        this.listeners.forEach((fn) => fn());
    }

    async loadCatalogue(): Promise<Catalogue> {
        return CATALOGUE;
    }
    async loadUser(): Promise<UserState> {
        await this.ready();
        return clone(this.user.get());
    }
    subscribe(onChange: () => void): () => void {
        this.listeners.add(onChange);
        return () => this.listeners.delete(onChange);
    }

    async updateProfile(patch: Partial<Profile>): Promise<void> {
        await this.ready();
        this.write((u) => {
            Object.assign(u.profile, patch);
            // "" means "remove the photo": the key goes away, as on a fresh learner.
            if (patch.photoUrl === "") delete u.profile.photoUrl;
        });
    }

    /** The demo keeps the photo in this browser as a data URL — nothing leaves the device. */
    async uploadPhoto(data: Blob | ArrayBuffer): Promise<string> {
        if (data instanceof ArrayBuffer) return `data:image/jpeg;base64,${base64Encode(new Uint8Array(data))}`;
        return new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(String(r.result));
            r.onerror = () => reject(new Error("Couldn't read the image"));
            r.readAsDataURL(data);
        });
    }

    async enroll(courseId: string): Promise<void> {
        await this.ready();
        this.write((u) => {
            if (u.enrollments.some((e) => e.courseId === courseId)) return;
            u.enrollments.push({ courseId, enrolledAt: new Date().toISOString(), completedAt: null, lastLessonId: null });
            u.notifications.unshift({
                id: uid("nt"), kind: "lesson", title: "Enrolled", body: "Your first lesson is ready when you are.",
                href: `/courses/${CATALOGUE.courses.find((c) => c.id === courseId)?.slug ?? ""}`, readAt: null, createdAt: new Date().toISOString(),
            });
        });
    }

    async saveProgress(lessonId: string, positionSec: number, completed = false): Promise<void> {
        await this.ready();
        this.write((u) => {
            const now = new Date().toISOString();
            const lesson = CATALOGUE.lessons.find((l) => l.id === lessonId);
            let row = u.progress.find((p) => p.lessonId === lessonId);
            if (!row) {
                row = { lessonId, positionSec: 0, completedAt: null, updatedAt: now };
                u.progress.push(row);
            }
            row.positionSec = positionSec;
            row.updatedAt = now;
            if (completed && !row.completedAt) row.completedAt = now;
            if (lesson) {
                const e = u.enrollments.find((x) => x.courseId === lesson.courseId);
                if (e) {
                    e.lastLessonId = lessonId;
                    const all = CATALOGUE.lessons.filter((l) => l.courseId === lesson.courseId);
                    const doneAll = all.every((l) => u.progress.find((p) => p.lessonId === l.id)?.completedAt);
                    if (doneAll && !e.completedAt) e.completedAt = now;
                }
            }
        });
    }

    async logStudy(lessonId: string | null, minutes: number): Promise<void> {
        await this.ready();
        if (minutes <= 0) return;
        this.write((u) => {
            u.sessions.push({ id: uid("s"), lessonId, minutes, occurredAt: new Date().toISOString() });
        });
    }

    async toggleBookmark(courseId: string): Promise<boolean> {
        await this.ready();
        let on = false;
        this.write((u) => {
            const i = u.bookmarks.indexOf(courseId);
            if (i >= 0) u.bookmarks.splice(i, 1);
            else u.bookmarks.push(courseId);
            on = i < 0;
        });
        return on;
    }
    async toggleFollow(mentorId: string): Promise<boolean> {
        await this.ready();
        let on = false;
        this.write((u) => {
            const i = u.follows.indexOf(mentorId);
            if (i >= 0) u.follows.splice(i, 1);
            else u.follows.push(mentorId);
            on = i < 0;
        });
        return on;
    }
    async toggleRsvp(liveLessonId: string): Promise<boolean> {
        await this.ready();
        let on = false;
        this.write((u) => {
            const i = u.rsvps.indexOf(liveLessonId);
            if (i >= 0) u.rsvps.splice(i, 1);
            else u.rsvps.push(liveLessonId);
            on = i < 0;
        });
        return on;
    }

    async openLiveRoom(input: OpenRoomInput): Promise<LiveRoom> {
        await this.ready();
        const p = this.user.get().profile;
        return new DemoRoom({
            lesson: input.lesson,
            mentor: input.mentor,
            me: { id: p.id, name: p.name, hue: p.hue, photoUrl: p.photoUrl },
            isHost: input.asHost ?? false,
            media: input.media,
            captions: input.captions,
            filter: input.filter,
        });
    }

    /**
     * The demo keeps its own register, so "You attended" appears on the lesson
     * afterwards exactly as it would for a real learner — and the time counts
     * as study, the way finishing a lesson does.
     */
    async leaveLive(liveLessonId: string, seconds: number): Promise<void> {
        await this.ready();
        this.write((u) => {
            const row = u.attendance.find((a) => a.liveLessonId === liveLessonId);
            // Add across rejoins rather than overwrite: a dropped connection
            // should not erase the half hour before it.
            if (row) row.seconds += Math.max(0, Math.round(seconds));
            else u.attendance.push({ liveLessonId, joinedAt: new Date().toISOString(), seconds: Math.max(0, Math.round(seconds)) });
        });
        const minutes = Math.round(seconds / 60);
        if (minutes >= 1) await this.logStudy(null, minutes);
        this.emit();
    }

    /** No transcription in the demo: there is no real class to transcribe. */
    async liveCaptionUrl(): Promise<string> {
        throw new Error("Captions aren't available in the demo.");
    }

    /** A recap needs a transcript, and the demo has none. */
    async liveRecap(): Promise<null> {
        return null;
    }

    /** Nothing was said out loud in a scripted class. */
    async liveTranscript(): Promise<[]> {
        return [];
    }

    /** Nothing leaves the device in the demo — the recording stays a blob URL. */
    async saveRecording(_liveLessonId: string, data: Blob | ArrayBuffer, mimeType: string): Promise<string> {
        if (data instanceof ArrayBuffer) return `data:${mimeType};base64,${base64Encode(new Uint8Array(data))}`;
        return URL.createObjectURL(data);
    }

    async addTask(input: NewTask): Promise<Task> {
        await this.ready();
        const task: Task = { id: uid("t"), ...input, doneAt: null, createdAt: new Date().toISOString() };
        this.write((u) => u.tasks.unshift(task));
        return task;
    }
    async toggleTask(id: string): Promise<void> {
        await this.ready();
        this.write((u) => {
            const t = u.tasks.find((x) => x.id === id);
            if (t) t.doneAt = t.doneAt ? null : new Date().toISOString();
        });
    }
    async deleteTask(id: string): Promise<void> {
        await this.ready();
        this.write((u) => {
            u.tasks = u.tasks.filter((t) => t.id !== id);
        });
    }

    async addNote(lessonId: string, body: string, atSec: number | null): Promise<Note> {
        await this.ready();
        const note: Note = { id: uid("n"), lessonId, atSec, body, createdAt: new Date().toISOString() };
        this.write((u) => u.notes.unshift(note));
        return note;
    }
    async deleteNote(id: string): Promise<void> {
        await this.ready();
        this.write((u) => {
            u.notes = u.notes.filter((n) => n.id !== id);
        });
    }

    async joinGroup(groupId: string): Promise<boolean> {
        await this.ready();
        let joined = false;
        this.write((u) => {
            const i = u.groupIds.indexOf(groupId);
            if (i >= 0) u.groupIds.splice(i, 1);
            else u.groupIds.push(groupId);
            joined = i < 0;
        });
        return joined;
    }
    async loadGroupPosts(groupId: string): Promise<GroupPost[]> {
        await this.ready();
        const mine = this.posts.get()[groupId] ?? [];
        const seeded = demoGroupPosts(groupId).map((p, i) => ({ ...p, id: `seed-${groupId}-${i}`, mine: false }));
        return [...mine, ...seeded].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    async postToGroup(groupId: string, body: string): Promise<GroupPost> {
        await this.ready();
        const me = this.user.get().profile;
        const post: GroupPost = { id: uid("p"), groupId, authorName: me.name, authorHue: me.hue, body, createdAt: new Date().toISOString(), mine: true };
        const all = { ...this.posts.get() };
        all[groupId] = [post, ...(all[groupId] ?? [])];
        this.posts.set(all);
        return post;
    }

    async startConversation(peerKind: PeerKind, peerId: string): Promise<Conversation> {
        await this.ready();
        const existing = this.user.get().conversations.find((c) => c.peerKind === peerKind && c.peerId === peerId);
        if (existing) return existing;
        const mentor = peerKind === "mentor" ? MENTORS.find((m) => m.id === peerId) : null;
        const friend = peerKind === "friend" ? this.user.get().friends.find((f) => f.id === peerId) : null;
        const name = mentor?.name ?? friend?.name ?? "Someone";
        const conv: Conversation = {
            id: uid("cv"), peerKind, peerId, peerName: name, peerRole: mentor ? "Mentor" : (friend?.label ?? "Friend"),
            peerHue: mentor?.hue ?? friend?.hue ?? hueFor(name), lastBody: "", updatedAt: new Date().toISOString(), unread: 0,
        };
        this.write((u) => u.conversations.unshift(conv));
        return conv;
    }
    async loadMessages(conversationId: string): Promise<Message[]> {
        await this.ready();
        const saved = this.messages.get()[conversationId];
        if (saved) return saved;
        return demoMessages(conversationId).map((m, i) => ({ ...m, id: `seed-${conversationId}-${i}`, conversationId }));
    }
    async sendMessage(conversationId: string, body: string): Promise<Message> {
        await this.ready();
        const history = await this.loadMessages(conversationId);
        const msg: Message = { id: uid("m"), conversationId, fromMe: true, body, createdAt: new Date().toISOString() };
        const conv = this.user.get().conversations.find((c) => c.id === conversationId);
        const next = [...history, msg];
        this.messages.set({ ...this.messages.get(), [conversationId]: next });
        this.write((u) => {
            const c = u.conversations.find((x) => x.id === conversationId);
            if (c) {
                c.lastBody = body;
                c.updatedAt = msg.createdAt;
            }
            u.conversations.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        });
        // A demo peer writes back after a moment, so the thread is a conversation.
        if (conv) {
            const reply = conv.peerKind === "mentor" ? mentorReply(conv.peerName, body) : "Ha — same. Let's go through it together tomorrow.";
            setTimeout(() => {
                const r: Message = { id: uid("m"), conversationId, fromMe: false, body: reply, createdAt: new Date().toISOString() };
                this.messages.set({ ...this.messages.get(), [conversationId]: [...(this.messages.get()[conversationId] ?? next), r] });
                this.write((u) => {
                    const c = u.conversations.find((x) => x.id === conversationId);
                    if (c) {
                        c.lastBody = reply;
                        c.updatedAt = r.createdAt;
                        c.unread += 1;
                    }
                    u.notifications.unshift({ id: uid("nt"), kind: "message", title: `${conv.peerName} replied`, body: reply.slice(0, 80), href: `/inbox/${conversationId}`, readAt: null, createdAt: r.createdAt });
                });
                this.emit();
            }, 1800 + Math.random() * 1200);
        }
        return msg;
    }
    async markRead(conversationId: string): Promise<void> {
        await this.ready();
        this.write((u) => {
            const c = u.conversations.find((x) => x.id === conversationId);
            if (c) c.unread = 0;
        });
    }

    async markNotificationsRead(ids?: string[]): Promise<void> {
        await this.ready();
        this.write((u) => {
            const now = new Date().toISOString();
            u.notifications.forEach((n) => {
                if (!n.readAt && (!ids || ids.includes(n.id))) n.readAt = now;
            });
        });
    }

    async submitQuiz(lessonId: string, score: number, total: number): Promise<QuizAttempt> {
        await this.ready();
        const attempt: QuizAttempt = { id: uid("qa"), lessonId, score, total, createdAt: new Date().toISOString() };
        this.write((u) => u.attempts.unshift(attempt));
        // Passing (≥ 2/3) completes the lesson.
        if (score / Math.max(1, total) >= 0.66) await this.saveProgress(lessonId, 0, true);
        return attempt;
    }

    async issueCertificate(courseId: string): Promise<Certificate> {
        await this.ready();
        const existing = this.user.get().certificates.find((c) => c.courseId === courseId);
        if (existing) return existing;
        const cert: Certificate = { id: uid("cert"), courseId, code: `CS-${courseId.replace(/^c-/, "").toUpperCase()}-${Date.now().toString(36).toUpperCase().slice(-5)}`, issuedAt: new Date().toISOString() };
        this.write((u) => {
            u.certificates.unshift(cert);
            u.notifications.unshift({ id: uid("nt"), kind: "certificate", title: "Certificate earned", body: CATALOGUE.courses.find((c) => c.id === courseId)?.title ?? "", href: `/certificates/${cert.id}`, readAt: null, createdAt: cert.issuedAt });
        });
        return cert;
    }

    // ---- 1:1 booking -------------------------------------------------------
    // The demo runs the same rules as the backend, from `booking.ts`, so what a
    // visitor sees offered is what a real school would offer.

    async mentorSlots(mentorId: string, fromISO: string, toISO: string): Promise<Slot[]> {
        await this.ready();
        const mentor = MENTORS.find((m) => m.id === mentorId);
        if (!mentor) return [];
        return computeSlots(mentor, AVAILABILITY, this.user.get().bookings, fromISO, toISO);
    }

    async bookSlot(mentorId: string, startsAtISO: string, tz: string, agenda: string): Promise<string> {
        await this.ready();
        const mentor = MENTORS.find((m) => m.id === mentorId);
        if (!mentor) throw new Error("No such mentor");

        // Re-check against the live grid rather than trusting what was rendered:
        // the notice window may have closed while the picker was open.
        const day = startsAtISO.slice(0, 10);
        const open = computeSlots(mentor, AVAILABILITY, this.user.get().bookings, day, day);
        if (!open.some((s) => s.startsAt === startsAtISO)) throw new Error("That time is no longer available");

        const id = uid("bk");
        const len = mentor.sessionMin ?? 30;
        const booking: Booking = {
            id, mentorId, startsAt: startsAtISO,
            endsAt: new Date(new Date(startsAtISO).getTime() + len * 60000).toISOString(),
            bookedTz: tz, status: "confirmed", agenda, sharedNotes: "", cancelReason: "",
            createdAt: new Date().toISOString(),
        };
        this.write((u) => {
            u.bookings.unshift(booking);
            u.notifications.unshift({
                id: uid("nt"), kind: "message", title: "Session booked",
                body: `${mentor.name} — ${new Date(startsAtISO).toLocaleString()}`,
                href: "/sessions", readAt: null, createdAt: booking.createdAt,
            });
        });
        this.emit();
        return id;
    }

    async cancelBooking(id: string, reason = ""): Promise<void> {
        await this.ready();
        this.write((u) => {
            const b = u.bookings.find((x) => x.id === id);
            if (!b || b.status !== "confirmed") return;
            b.status = "cancelled";
            b.cancelReason = reason;
        });
        this.emit();
    }

    /** Cancel plus re-book, linked — the old slot frees through the same path. */
    async rescheduleBooking(id: string, startsAtISO: string): Promise<string> {
        await this.ready();
        const old = this.user.get().bookings.find((b) => b.id === id);
        if (!old || old.status !== "confirmed") throw new Error("That booking is not open");
        await this.cancelBooking(id, "rescheduled");
        const next = await this.bookSlot(old.mentorId, startsAtISO, old.bookedTz, old.agenda);
        this.write((u) => {
            const b = u.bookings.find((x) => x.id === next);
            if (b) b.rescheduledFrom = id;
        });
        this.emit();
        return next;
    }

    async bookingActions(bookingId: string): Promise<BookingAction[]> {
        await this.ready();
        const extra = this.actions.get()[bookingId] ?? [];
        return [...demoBookingActions(bookingId), ...extra];
    }

    async addBookingAction(bookingId: string, body: string): Promise<BookingAction> {
        await this.ready();
        const action: BookingAction = { id: uid("ba"), bookingId, body, doneAt: null, createdAt: new Date().toISOString() };
        const next = { ...this.actions.get() };
        next[bookingId] = [...(next[bookingId] ?? []), action];
        this.actions.set(next);
        this.emit();
        return action;
    }

    async toggleBookingAction(id: string): Promise<void> {
        await this.ready();
        const all = { ...this.actions.get() };
        for (const [k, list] of Object.entries(all)) {
            const i = list.findIndex((a) => a.id === id);
            if (i >= 0) {
                const copy = [...list];
                copy[i] = { ...copy[i], doneAt: copy[i].doneAt ? null : new Date().toISOString() };
                all[k] = copy;
                this.actions.set(all);
                this.emit();
                return;
            }
        }
        // A seeded action: keep the tick in the same store, keyed by its own id.
        all[`_seed:${id}`] = [{ id, bookingId: "", body: "", doneAt: new Date().toISOString(), createdAt: "" }];
        this.actions.set(all);
        this.emit();
    }

    // ---- the mentor's side -------------------------------------------------
    //
    // Nobody signs in as a mentor in a demo, so the demo shows the mentor's
    // side of the visitor's OWN two sessions and says so on the page. The
    // alternative — hiding the console entirely — would leave a third of this
    // school undemonstrable.

    async myMentor(): Promise<Mentor | null> {
        await this.ready();
        const next = [...this.user.get().bookings]
            .filter((b) => b.status === "confirmed")
            .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
        return MENTORS.find((m) => m.id === (next?.mentorId ?? "m-amara")) ?? null;
    }

    async mentorBookings(): Promise<MentorBooking[]> {
        await this.ready();
        const u = this.user.get();
        return u.bookings.map((b) => ({
            ...b,
            founderId: u.profile.id,
            founderName: u.profile.name,
            founderHue: u.profile.hue,
            founderPhotoUrl: u.profile.photoUrl,
            founderOneLiner: u.venture.oneLiner,
            briefAt: null,
        }));
    }

    // ---- the venture record and the adviser --------------------------------

    async saveVenture(patch: Partial<Venture>): Promise<Venture> {
        await this.ready();
        this.write((u) => {
            // Sections merge by key and are replaced whole — the page edits one
            // at a time, and a patch that dropped the others would be a data
            // loss bug that only showed up on a slow save.
            u.venture = {
                ...u.venture,
                ...patch,
                sections: { ...u.venture.sections, ...(patch.sections ?? {}) },
                updatedAt: new Date().toISOString(),
            };
        });
        this.emit();
        return this.user.get().venture;
    }

    /**
     * The demo adviser: a keyword match over the same framework index the live
     * one is grounded on, returning the framework's own question rather than an
     * invented answer. The shape is what is being shown — named framework,
     * cited chapter, question handed back — not a simulated model.
     */
    async advise(question: string): Promise<Advice> {
        await this.ready();
        // A beat, so the UI's pending state is visible rather than flickering.
        await new Promise((r) => setTimeout(r, 450));
        return localAdvice(question, this.user.get().venture);
    }

    /**
     * The demo brief, computed rather than scripted.
     *
     * Every line below comes from something the visitor can go and look at —
     * their venture record, the quizzes they got wrong, what was left open last
     * time. That is the point being demonstrated: the brief is useful because
     * it reads the record, not because a model wrote it. The live one sends the
     * same material to a model to phrase it.
     */
    async sessionBrief(bookingId: string): Promise<SessionBrief | null> {
        await this.ready();
        await new Promise((r) => setTimeout(r, 500));
        const u = this.user.get();
        const b = u.bookings.find((x) => x.id === bookingId);
        if (!b) return null;

        const v = u.venture;
        const claims = Object.values(v.sections).flatMap((sec) => sec?.claims ?? []);
        const open = claims.filter((c) => c.confidence === "guess");
        const written = Object.values(v.sections).filter((sec) => sec?.body?.trim()).length;

        const weak = u.attempts
            .filter((a) => a.score < a.total)
            .map((a) => CATALOGUE.lessons.find((l) => l.id === a.lessonId)?.title)
            .filter((t): t is string => Boolean(t));

        // The previous session with anyone, and what it left open.
        const prev = [...u.bookings]
            .filter((x) => x.id !== bookingId && x.startsAt < b.startsAt && x.status !== "cancelled")
            .sort((a, c) => c.startsAt.localeCompare(a.startsAt))[0];
        const carried = prev ? demoBookingActions(prev.id).filter((a) => !a.doneAt).map((a) => a.body) : [];

        return {
            headline: `${u.profile.name} — ${v.name || "no venture named yet"}, ${STAGE_LABEL[v.stage].toLowerCase()}. ${b.agenda || "No agenda set."}`,
            context: [
                v.oneLiner || "No one-sentence version of the business yet.",
                `${written} of 8 sections of the venture record written; ${open.length} claims still marked as guesses.`,
                v.country ? `Registering in ${v.country}.` : "No country on the record — legal and funding answers are blocked until there is one.",
                ...(v.sections.asks?.body ? [`They asked for: ${v.sections.asks.body}`] : []),
            ],
            openWith: open[0]?.test
                ? `"${open[0].text}" is still a guess. Ask what happened the last time they tested it — their own test was: ${open[0].test}`
                : b.agenda
                  ? `Ask them to say the agenda out loud in one sentence: "${b.agenda}"`
                  : "Ask what changed since last time before anything else.",
            watchFor: [
                ...open.filter((c) => !c.test.trim()).map((c) => `"${c.text}" — a guess with nothing that would settle it.`),
                ...weak.map((t) => `Scored badly on "${t}" — likely a misunderstanding they have not noticed.`),
            ].slice(0, 3),
            carriedOver: carried,
        };
    }

    /**
     * The demo draft. A real one reads the session transcript; there isn't one
     * here, so this composes the same artefact from the agenda and what was
     * left open — enough to show the shape, which is the part that matters:
     * it is a DRAFT, and a person approves it.
     */
    async captureSession(bookingId: string): Promise<SessionCapture | null> {
        await this.ready();
        await new Promise((r) => setTimeout(r, 650));
        const u = this.user.get();
        const b = u.bookings.find((x) => x.id === bookingId);
        if (!b) return null;
        const open = Object.values(u.venture.sections)
            .flatMap((sec) => sec?.claims ?? [])
            .filter((c) => c.confidence === "guess" && c.test.trim());

        return {
            notes:
                `We went through ${b.agenda ? `"${b.agenda}"` : "what you brought"}. ` +
                "The decision was to stop treating the unchecked parts of the model as settled and put a date on each one. " +
                (open.length
                    ? `The one to do first is the one the rest depends on: ${open[0].text.toLowerCase()}.`
                    : "Nothing was left open."),
            actions: open.slice(0, 3).map((c) => c.test),
        };
    }

    async saveSessionNotes(bookingId: string, notes: string, actions: string[]): Promise<void> {
        await this.ready();
        this.write((u) => {
            const b = u.bookings.find((x) => x.id === bookingId);
            if (b) b.sharedNotes = notes;
        });
        for (const body of actions) await this.addBookingAction(bookingId, body);
        this.emit();
    }

    /**
     * The demo cohort. One learner is not a cohort, so these are the seeded
     * classmates' scores rather than anything the visitor produced — which is
     * why the page that renders it says so. The shape is exact: it is the same
     * GROUP BY the live school runs, and it never names a founder.
     */
    async cohortSignal(): Promise<CohortSignal[]> {
        await this.ready();
        const pick = (lessonId: string, attempts: number, avgScore: number): CohortSignal | null => {
            const lesson = CATALOGUE.lessons.find((l) => l.id === lessonId);
            if (!lesson) return null;
            const course = CATALOGUE.courses.find((c) => c.id === lesson.courseId);
            return { lessonId, lessonTitle: lesson.title, courseTitle: course?.title ?? "", attempts, avgScore };
        };
        return [
            pick("l-opp-6", 14, 41),
            pick("l-mod-4", 11, 52),
            pick("l-fit-4", 17, 63),
            pick("l-ops-3", 9, 68),
        ].filter((x): x is CohortSignal => Boolean(x));
    }

    async resetDemo(): Promise<void> {
        await this.ready();
        this.user.set(demoUserState());
        this.messages.set({});
        this.posts.set({});
        this.actions.set({});
        this.emit();
    }
}
