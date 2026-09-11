import { CATALOGUE, MENTORS, demoGroupPosts, demoMessages, demoUserState } from "@/data/seed";
import type { Repo } from "@/data/repo";
import type {
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
    Task,
    UserState,
} from "@/data/types";
import { hueFor, uid } from "@/lib/format";

/**
 * The demo learner, persisted in this browser.
 *
 * Every write lands in localStorage so a visitor's exploration survives a
 * reload, and every read is synchronous underneath — the async surface is only
 * there so pages treat it exactly like the live backend. Nothing here leaves
 * the device.
 */

const KEY = "coir-six:demo:v2";
const MSG_KEY = "coir-six:demo:messages:v2";
const POST_KEY = "coir-six:demo:posts:v2";

type Store<T> = { get(): T; set(v: T): void };

function store<T>(key: string, initial: () => T): Store<T> {
    let cache: T | null = null;
    return {
        get() {
            if (cache) return cache;
            try {
                const raw = localStorage.getItem(key);
                cache = raw ? (JSON.parse(raw) as T) : initial();
            } catch {
                cache = initial();
            }
            return cache;
        },
        set(v: T) {
            cache = v;
            try {
                localStorage.setItem(key, JSON.stringify(v));
            } catch {
                /* private mode: the session still works, it just won't persist */
            }
        },
    };
}

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
    private user = store<UserState>(KEY, demoUserState);
    private messages = store<Record<string, Message[]>>(MSG_KEY, () => ({}));
    private posts = store<Record<string, GroupPost[]>>(POST_KEY, () => ({}));
    private listeners = new Set<() => void>();

    private write(mutate: (u: UserState) => void): void {
        const next = structuredClone(this.user.get());
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
        return structuredClone(this.user.get());
    }
    subscribe(onChange: () => void): () => void {
        this.listeners.add(onChange);
        return () => this.listeners.delete(onChange);
    }

    async updateProfile(patch: Partial<Profile>): Promise<void> {
        this.write((u) => {
            Object.assign(u.profile, patch);
            // "" means "remove the photo": the key goes away, as on a fresh learner.
            if (patch.photoUrl === "") delete u.profile.photoUrl;
        });
    }

    /** The demo keeps the photo in this browser as a data URL — nothing leaves the device. */
    async uploadPhoto(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(String(r.result));
            r.onerror = () => reject(new Error("Couldn't read the image"));
            r.readAsDataURL(blob);
        });
    }

    async enroll(courseId: string): Promise<void> {
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
        if (minutes <= 0) return;
        this.write((u) => {
            u.sessions.push({ id: uid("s"), lessonId, minutes, occurredAt: new Date().toISOString() });
        });
    }

    async toggleBookmark(courseId: string): Promise<boolean> {
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
        let on = false;
        this.write((u) => {
            const i = u.rsvps.indexOf(liveLessonId);
            if (i >= 0) u.rsvps.splice(i, 1);
            else u.rsvps.push(liveLessonId);
            on = i < 0;
        });
        return on;
    }

    async addTask(input: NewTask): Promise<Task> {
        const task: Task = { id: uid("t"), ...input, doneAt: null, createdAt: new Date().toISOString() };
        this.write((u) => u.tasks.unshift(task));
        return task;
    }
    async toggleTask(id: string): Promise<void> {
        this.write((u) => {
            const t = u.tasks.find((x) => x.id === id);
            if (t) t.doneAt = t.doneAt ? null : new Date().toISOString();
        });
    }
    async deleteTask(id: string): Promise<void> {
        this.write((u) => {
            u.tasks = u.tasks.filter((t) => t.id !== id);
        });
    }

    async addNote(lessonId: string, body: string, atSec: number | null): Promise<Note> {
        const note: Note = { id: uid("n"), lessonId, atSec, body, createdAt: new Date().toISOString() };
        this.write((u) => u.notes.unshift(note));
        return note;
    }
    async deleteNote(id: string): Promise<void> {
        this.write((u) => {
            u.notes = u.notes.filter((n) => n.id !== id);
        });
    }

    async joinGroup(groupId: string): Promise<boolean> {
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
        const mine = this.posts.get()[groupId] ?? [];
        const seeded = demoGroupPosts(groupId).map((p, i) => ({ ...p, id: `seed-${groupId}-${i}`, mine: false }));
        return [...mine, ...seeded].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    async postToGroup(groupId: string, body: string): Promise<GroupPost> {
        const me = this.user.get().profile;
        const post: GroupPost = { id: uid("p"), groupId, authorName: me.name, authorHue: me.hue, body, createdAt: new Date().toISOString(), mine: true };
        const all = { ...this.posts.get() };
        all[groupId] = [post, ...(all[groupId] ?? [])];
        this.posts.set(all);
        return post;
    }

    async startConversation(peerKind: PeerKind, peerId: string): Promise<Conversation> {
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
        const saved = this.messages.get()[conversationId];
        if (saved) return saved;
        return demoMessages(conversationId).map((m, i) => ({ ...m, id: `seed-${conversationId}-${i}`, conversationId }));
    }
    async sendMessage(conversationId: string, body: string): Promise<Message> {
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
            window.setTimeout(() => {
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
        this.write((u) => {
            const c = u.conversations.find((x) => x.id === conversationId);
            if (c) c.unread = 0;
        });
    }

    async markNotificationsRead(ids?: string[]): Promise<void> {
        this.write((u) => {
            const now = new Date().toISOString();
            u.notifications.forEach((n) => {
                if (!n.readAt && (!ids || ids.includes(n.id))) n.readAt = now;
            });
        });
    }

    async submitQuiz(lessonId: string, score: number, total: number): Promise<QuizAttempt> {
        const attempt: QuizAttempt = { id: uid("qa"), lessonId, score, total, createdAt: new Date().toISOString() };
        this.write((u) => u.attempts.unshift(attempt));
        // Passing (≥ 2/3) completes the lesson.
        if (score / Math.max(1, total) >= 0.66) await this.saveProgress(lessonId, 0, true);
        return attempt;
    }

    async issueCertificate(courseId: string): Promise<Certificate> {
        const existing = this.user.get().certificates.find((c) => c.courseId === courseId);
        if (existing) return existing;
        const cert: Certificate = { id: uid("cert"), courseId, code: `CS-${courseId.replace(/^c-/, "").toUpperCase()}-${Date.now().toString(36).toUpperCase().slice(-5)}`, issuedAt: new Date().toISOString() };
        this.write((u) => {
            u.certificates.unshift(cert);
            u.notifications.unshift({ id: uid("nt"), kind: "certificate", title: "Certificate earned", body: CATALOGUE.courses.find((c) => c.id === courseId)?.title ?? "", href: `/certificates/${cert.id}`, readAt: null, createdAt: cert.issuedAt });
        });
        return cert;
    }

    async resetDemo(): Promise<void> {
        this.user.set(demoUserState());
        this.messages.set({});
        this.posts.set({});
        this.emit();
    }
}
