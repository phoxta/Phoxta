import type { RepoContext } from "@/data/core";
import { seedContext } from "@/data/coreSeed";
import { uid } from "@/lib/format";
import { addDaysIso, canSeePrayer, canSeeStudy, nextInterval, pendingReview, sessionsOf, visibleTo } from "./derive";
import { seed } from "./seed";
import { SCHEDULE, type BiblePlan, type BibleRepo, type BibleState, type MemoryVerse, type NewPlan, type NewPrayer, type NewSession, type NewStudy, type NewVerse, type Prayer, type ReviewResult, type Study, type StudySession } from "./types";

/**
 * The demo, persisted in this browser.
 *
 * Every write is real: enrol a child in a study, tick a session, answer a
 * memory card and watch the interval move from three days to seven, post to
 * the wall, mark something answered and see it land on the family timeline —
 * then reload, and it is all still there.
 *
 * The permission checks here are the ones `sql/bible.sql` enforces live, in the
 * same order, so "Not allowed" means the same thing in both modes. Three rules
 * do most of the work: parents manage, a child touches only their own row, and
 * a guest may do exactly two things — and only when the family granted them the
 * wall.
 */

const KEY = "wafe:demo:bible:v2";

/** Sprouts a child earns. Rituals, not loss aversion: reviewing at all counts. */
const POINTS_SESSION = 15;
const POINTS_REVIEW = 5;

function isState(v: unknown): v is BibleState {
    if (!v || typeof v !== "object") return false;
    const s = v as Partial<BibleState>;
    return Array.isArray(s.studies) && Array.isArray(s.prayers) && Array.isArray(s.memoryVerses) && Array.isArray(s.reviews);
}

const now = (): string => new Date().toISOString();

export class LocalBibleRepo implements BibleRepo {
    private cache: BibleState | null = null;

    constructor(private ctx: RepoContext) {}

    // -- storage -------------------------------------------------------------

    private all(): BibleState {
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

    private save(s: BibleState): void {
        this.cache = s;
        try {
            localStorage.setItem(KEY, JSON.stringify(s));
        } catch {
            /* private browsing: the session works, it just won't persist */
        }
    }

    private write(fn: (s: BibleState) => void): void {
        const s = { ...this.all() };
        fn(s);
        this.save(s);
    }

    // -- permissions ---------------------------------------------------------

    private deny(): never {
        throw new Error("Not allowed");
    }

    /** Parents run the studies, the plans and the grants. */
    private manage(): void {
        if (!this.ctx.can("bible.manage")) this.deny();
    }

    /** A guest may only reach the wall, and only when it was granted to them. */
    private wallGuest(): boolean {
        return this.ctx.role === "guest" && this.all().wallGuestIds.includes(this.ctx.me.id);
    }

    /** Everyone in the family may pray; a guest needs the grant (AC4). */
    private mayUseWall(): void {
        if (this.ctx.role === "guest" && !this.wallGuest()) this.deny();
    }

    private mustSeePrayer(id: string): Prayer {
        const p = this.all().prayers.find((x) => x.id === id);
        if (!p || !canSeePrayer(p, this.ctx.me, this.all().wallGuestIds)) throw new Error("Not allowed");
        return p;
    }

    /** A parent, or the person whose row it is. */
    private mine(memberId: string): void {
        if (!this.ctx.can("bible.manage") && memberId !== this.ctx.me.id) this.deny();
    }

    // -- load ----------------------------------------------------------------

    async load(): Promise<BibleState> {
        return visibleTo(this.all(), this.ctx);
    }

    // -- studies -------------------------------------------------------------

    async addStudy(input: NewStudy): Promise<Study> {
        this.manage();
        const id = uid("study");
        const study: Study = {
            id,
            spaceId: this.ctx.space.id,
            title: input.title.trim(),
            type: input.type,
            description: input.description.trim(),
            childSafe: input.childSafe,
            assigneeMemberIds: input.assigneeMemberIds,
            value: input.value,
            coverUrl: input.coverUrl,
            minutes: Math.max(5, Math.round(input.minutes ?? 15)),
            createdAt: now(),
        };
        const sessions: StudySession[] = (input.sessions ?? []).map((s, i) => ({
            id: uid("sess"),
            studyId: id,
            order: i + 1,
            passage: s.passage.trim(),
            passageText: s.passageText.trim(),
            devotional: s.devotional.trim(),
            questions: s.questions.filter((q) => q.trim()),
            prayerFocus: s.prayerFocus.trim(),
        }));
        this.write((s) => {
            s.studies = [study, ...s.studies];
            s.sessions = [...s.sessions, ...sessions];
        });
        return study;
    }

    async updateStudy(id: string, patch: Partial<Pick<Study, "title" | "description" | "childSafe" | "assigneeMemberIds" | "value" | "minutes">>): Promise<void> {
        this.manage();
        this.write((s) => {
            s.studies = s.studies.map((x) => {
                if (x.id !== id) return x;
                const next = { ...x, ...patch };
                // A study that stops being child-safe cannot keep a child on it.
                if (patch.childSafe === false) next.assigneeMemberIds = next.assigneeMemberIds.filter((m) => this.ctx.members.find((y) => y.id === m)?.role !== "child");
                return next;
            });
        });
    }

    async removeStudy(id: string): Promise<void> {
        this.manage();
        this.write((s) => {
            const sessionIds = new Set(s.sessions.filter((x) => x.studyId === id).map((x) => x.id));
            s.studies = s.studies.filter((x) => x.id !== id);
            s.sessions = s.sessions.filter((x) => x.studyId !== id);
            s.done = s.done.filter((x) => !sessionIds.has(x.sessionId));
        });
    }

    async addSession(studyId: string, input: NewSession): Promise<StudySession> {
        this.manage();
        const order = sessionsOf(this.all(), studyId).length + 1;
        const session: StudySession = {
            id: uid("sess"),
            studyId,
            order,
            passage: input.passage.trim(),
            passageText: input.passageText.trim(),
            devotional: input.devotional.trim(),
            questions: input.questions.filter((q) => q.trim()),
            prayerFocus: input.prayerFocus.trim(),
        };
        this.write((s) => {
            s.sessions = [...s.sessions, session];
        });
        return session;
    }

    async updateSession(id: string, patch: Partial<NewSession>): Promise<void> {
        this.manage();
        this.write((s) => {
            s.sessions = s.sessions.map((x) => (x.id === id ? { ...x, ...patch } : x));
        });
    }

    async removeSession(id: string): Promise<void> {
        this.manage();
        this.write((s) => {
            const gone = s.sessions.find((x) => x.id === id);
            s.sessions = s.sessions.filter((x) => x.id !== id).map((x) => (gone && x.studyId === gone.studyId && x.order > gone.order ? { ...x, order: x.order - 1 } : x));
            s.done = s.done.filter((x) => x.sessionId !== id);
        });
    }

    async completeSession(sessionId: string, memberId: string): Promise<{ points: number }> {
        if (this.ctx.role === "guest") this.deny();
        this.mine(memberId);
        const state = this.all();
        const session = state.sessions.find((x) => x.id === sessionId);
        if (!session) throw new Error("That session is gone.");
        const study = state.studies.find((x) => x.id === session.studyId);
        if (!study) throw new Error("That study is gone.");
        const member = this.ctx.members.find((m) => m.id === memberId);
        if (!member || !canSeeStudy(study, member)) throw new Error("Not allowed");
        if (state.done.some((d) => d.sessionId === sessionId && d.memberId === memberId)) return { points: 0 };
        this.write((s) => {
            s.done = [...s.done, { id: uid("done"), studyId: study.id, sessionId, memberId, date: this.ctx.today, at: now() }];
        });
        return { points: member.role === "child" ? POINTS_SESSION : 0 };
    }

    async uncompleteSession(sessionId: string, memberId: string): Promise<void> {
        if (this.ctx.role === "guest") this.deny();
        this.mine(memberId);
        this.write((s) => {
            s.done = s.done.filter((d) => !(d.sessionId === sessionId && d.memberId === memberId));
        });
    }

    // -- plans ---------------------------------------------------------------

    async addPlan(input: NewPlan): Promise<BiblePlan> {
        this.manage();
        const id = uid("plan");
        const plan: BiblePlan = {
            id,
            spaceId: this.ctx.space.id,
            title: input.title.trim(),
            startDate: input.startDate,
            translation: input.translation.trim() || "WEB",
            assigneeMemberIds: input.assigneeMemberIds,
            active: true,
            createdAt: now(),
        };
        this.write((s) => {
            // Exactly one plan feeds the daily scripture (AC5).
            s.plans = [...s.plans.map((p) => ({ ...p, active: false })), plan];
            s.planDays = [...s.planDays, ...input.days.map((d, i) => ({ planId: id, day: i + 1, passage: d.passage.trim(), passageText: d.passageText.trim() }))];
        });
        return plan;
    }

    async updatePlan(id: string, patch: Partial<Pick<BiblePlan, "title" | "translation" | "assigneeMemberIds" | "active" | "startDate">>): Promise<void> {
        this.manage();
        this.write((s) => {
            s.plans = s.plans.map((p) => {
                if (p.id === id) return { ...p, ...patch };
                return patch.active === true ? { ...p, active: false } : p;
            });
        });
    }

    async removePlan(id: string): Promise<void> {
        this.manage();
        this.write((s) => {
            s.plans = s.plans.filter((p) => p.id !== id);
            s.planDays = s.planDays.filter((d) => d.planId !== id);
        });
    }

    // -- memory verses -------------------------------------------------------

    async addVerse(input: NewVerse): Promise<MemoryVerse> {
        if (this.ctx.role === "guest") this.deny();
        this.mine(input.memberId);
        const verse: MemoryVerse = {
            id: uid("mv"),
            spaceId: this.ctx.space.id,
            memberId: input.memberId,
            reference: input.reference.trim(),
            text: input.text.trim(),
            readAloud: Boolean(input.readAloud),
            addedAt: now(),
        };
        this.write((s) => {
            s.memoryVerses = [verse, ...s.memoryVerses];
            // A new verse comes up tomorrow: the first rung of 1-3-7-14-30.
            s.reviews = [...s.reviews, { id: uid("rev"), verseId: verse.id, memberId: verse.memberId, dueAt: addDaysIso(this.ctx.today, SCHEDULE[0]), intervalDays: SCHEDULE[0], step: 0, result: null, reviewedAt: null }];
        });
        return verse;
    }

    async updateVerse(id: string, patch: Partial<Pick<MemoryVerse, "reference" | "text" | "readAloud">>): Promise<void> {
        if (this.ctx.role === "guest") this.deny();
        const verse = this.all().memoryVerses.find((v) => v.id === id);
        if (!verse) throw new Error("That verse is gone.");
        this.mine(verse.memberId);
        this.write((s) => {
            s.memoryVerses = s.memoryVerses.map((v) => (v.id === id ? { ...v, ...patch } : v));
        });
    }

    async removeVerse(id: string): Promise<void> {
        if (this.ctx.role === "guest") this.deny();
        const verse = this.all().memoryVerses.find((v) => v.id === id);
        if (!verse) return;
        this.mine(verse.memberId);
        this.write((s) => {
            s.memoryVerses = s.memoryVerses.filter((v) => v.id !== id);
            s.reviews = s.reviews.filter((r) => r.verseId !== id);
        });
    }

    async reviewVerse(verseId: string, memberId: string, result: ReviewResult): Promise<{ points: number }> {
        if (this.ctx.role === "guest") this.deny();
        this.mine(memberId);
        const state = this.all();
        const verse = state.memoryVerses.find((v) => v.id === verseId);
        if (!verse || verse.memberId !== memberId) throw new Error("Not allowed");
        const pending = pendingReview(state, verseId);
        if (!pending) throw new Error("That card is not waiting for an answer.");
        const { step, days } = nextInterval(pending.step, result);
        const member = this.ctx.members.find((m) => m.id === memberId);
        this.write((s) => {
            s.reviews = s.reviews.map((r) => (r.id === pending.id ? { ...r, result, reviewedAt: now() } : r));
            s.reviews = [...s.reviews, { id: uid("rev"), verseId, memberId, dueAt: addDaysIso(this.ctx.today, days), intervalDays: days, step, result: null, reviewedAt: null }];
        });
        return { points: member?.role === "child" ? POINTS_REVIEW : 0 };
    }

    // -- prayer --------------------------------------------------------------

    async addPrayer(input: NewPrayer): Promise<Prayer> {
        this.mayUseWall();
        const guest = this.ctx.role === "guest";
        const child = this.ctx.role === "child";
        const prayer: Prayer = {
            id: uid("prayer"),
            spaceId: this.ctx.space.id,
            authorMemberId: this.ctx.me.id,
            title: input.title.trim(),
            detail: input.detail.trim(),
            tags: input.tags,
            // A guest posts to the wall, never privately into the family's house.
            visibility: guest ? "family" : input.visibility,
            sharedWith: input.visibility === "shared" ? (input.sharedWith ?? []) : [],
            sensitivity: input.visibility === "private" ? "private" : (input.sensitivity ?? "general"),
            status: "open",
            answeredAt: null,
            testimony: "",
            // A child's own request is written in a child's words: child-safe by definition.
            childSafe: child ? true : input.childSafe,
            sharedWithGuests: guest ? true : input.sharedWithGuests,
            fromGuest: guest,
            createdAt: now(),
        };
        if (!prayer.title) throw new Error("Give the request a title.");
        this.write((s) => {
            s.prayers = [prayer, ...s.prayers];
        });
        return prayer;
    }

    async updatePrayer(id: string, patch: Partial<Pick<Prayer, "title" | "detail" | "tags" | "visibility" | "sharedWith" | "sensitivity" | "childSafe" | "sharedWithGuests">>): Promise<void> {
        const prayer = this.mustSeePrayer(id);
        if (!this.ctx.can("bible.manage") && prayer.authorMemberId !== this.ctx.me.id) this.deny();
        this.write((s) => {
            s.prayers = s.prayers.map((p) => {
                if (p.id !== id) return p;
                const next = { ...p, ...patch };
                if (next.visibility !== "shared") next.sharedWith = [];
                if (next.visibility === "private") {
                    next.sharedWithGuests = false;
                    next.childSafe = false;
                }
                return next;
            });
        });
    }

    async removePrayer(id: string): Promise<void> {
        const prayer = this.mustSeePrayer(id);
        if (!this.ctx.can("bible.manage") && prayer.authorMemberId !== this.ctx.me.id) this.deny();
        this.write((s) => {
            s.prayers = s.prayers.filter((p) => p.id !== id);
            s.reactions = s.reactions.filter((r) => r.prayerId !== id);
            s.timeline = s.timeline.filter((t) => t.prayerId !== id);
        });
    }

    /** AC3: the date is recorded, the thread stays, the timeline gets an entry. */
    async markAnswered(id: string, testimony: string): Promise<void> {
        const prayer = this.mustSeePrayer(id);
        if (!this.ctx.can("bible.manage") && prayer.authorMemberId !== this.ctx.me.id) this.deny();
        const answeredAt = this.ctx.today;
        this.write((s) => {
            s.prayers = s.prayers.map((p) => (p.id === id ? { ...p, status: "answered", answeredAt, testimony: testimony.trim() } : p));
            const entry = {
                id: uid("pm"),
                prayerId: id,
                date: answeredAt,
                title: `Answered: ${prayer.title}`,
                body: testimony.trim(),
                href: "/grow/bible/prayer",
                memberIds: [],
                ownerMemberId: prayer.authorMemberId,
                visibility: prayer.visibility,
                sharedWith: prayer.sharedWith,
            };
            s.timeline = [...s.timeline.filter((t) => t.prayerId !== id), entry];
        });
    }

    async reopenPrayer(id: string): Promise<void> {
        const prayer = this.mustSeePrayer(id);
        if (!this.ctx.can("bible.manage") && prayer.authorMemberId !== this.ctx.me.id) this.deny();
        this.write((s) => {
            s.prayers = s.prayers.map((p) => (p.id === id ? { ...p, status: "open", answeredAt: null } : p));
            s.timeline = s.timeline.filter((t) => t.prayerId !== id);
        });
    }

    async togglePrayed(prayerId: string, memberId: string, on: boolean): Promise<void> {
        this.mayUseWall();
        if (memberId !== this.ctx.me.id) this.deny();
        this.mustSeePrayer(prayerId);
        const date = this.ctx.today;
        this.write((s) => {
            const already = s.reactions.some((r) => r.prayerId === prayerId && r.memberId === memberId && r.date === date);
            if (on && !already) s.reactions = [...s.reactions, { id: uid("rx"), prayerId, memberId, type: "prayed", date, at: now() }];
            if (!on) s.reactions = s.reactions.filter((r) => !(r.prayerId === prayerId && r.memberId === memberId && r.date === date));
        });
    }

    // -- grants and rhythm ---------------------------------------------------

    async setWallGuest(memberId: string, granted: boolean): Promise<void> {
        this.manage();
        const member = this.ctx.members.find((m) => m.id === memberId);
        if (!member || member.role !== "guest") throw new Error("The wall is granted to guests.");
        this.write((s) => {
            const set = new Set(s.wallGuestIds);
            if (granted) set.add(memberId);
            else set.delete(memberId);
            s.wallGuestIds = [...set];
        });
    }

    async setGraceDay(date: string, on: boolean): Promise<void> {
        this.manage();
        this.write((s) => {
            const set = new Set(s.graceDays);
            if (on) set.add(date);
            else set.delete(date);
            s.graceDays = [...set].sort();
        });
    }
}
