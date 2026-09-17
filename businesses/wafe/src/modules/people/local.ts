import type { RepoContext } from "@/data/core";
import { uid } from "@/lib/format";
import { visibleTo } from "./derive";
import { seed } from "./seed";
import type { Community, ContactChannel, FollowUp, GiftIdea, GiftRequest, GivingPayment, Mentor, MentorSession, NewCommunity, NewFollowUp, NewGiftIdea, NewMentor, NewPerson, NewSession, PeopleRepo, PeopleState, Person } from "./types";

/**
 * People in the browser.
 *
 * The blob holds the UNFILTERED family record; `load()` runs the same
 * `visibleTo` filter the live repo runs, so switching "view as" to Tobi
 * genuinely removes Aunty Bisi's phone number from the data the screens
 * receive — it is not hidden with CSS. Every write is real and persisted, and
 * every write checks `ctx.can("people.manage")` exactly as the RLS policies do.
 */

const KEY = "wafe:demo:people:v2";
const now = (): string => new Date().toISOString();

function isState(v: unknown): v is PeopleState {
    if (!v || typeof v !== "object") return false;
    const s = v as Partial<PeopleState>;
    return Array.isArray(s.people) && Array.isArray(s.communities) && Array.isArray(s.mentors) && Array.isArray(s.sessions);
}

export class LocalPeopleRepo implements PeopleRepo {
    private cache: PeopleState | null = null;

    constructor(private ctx: RepoContext) {}

    // -----------------------------------------------------------------------
    // Storage
    // -----------------------------------------------------------------------

    private get(): PeopleState {
        if (this.cache) return this.cache;
        try {
            const raw = localStorage.getItem(KEY);
            const parsed: unknown = raw ? JSON.parse(raw) : null;
            this.cache = isState(parsed)
                ? {
                      people: parsed.people,
                      communities: parsed.communities,
                      mentors: parsed.mentors,
                      sessions: parsed.sessions,
                      contacts: parsed.contacts ?? [],
                      giving: parsed.giving ?? [],
                      followUps: parsed.followUps ?? [],
                      giftRequests: parsed.giftRequests ?? [],
                  }
                : seed(this.seedCtx());
        } catch {
            this.cache = seed(this.seedCtx());
        }
        return this.cache;
    }

    /** The seed wants a SeedContext; in the demo it is built from the repo context. */
    private seedCtx() {
        const { space, members, today } = this.ctx;
        const counters: Record<string, number> = {};
        const base = new Date(`${today}T00:00:00`);
        const at = (days: number, hhmm = "09:00"): string => {
            const d = new Date(base);
            d.setDate(d.getDate() + days);
            const [h, mi] = hhmm.split(":").map(Number);
            d.setHours(h, mi, 0, 0);
            return d.toISOString();
        };
        return {
            space,
            members,
            parents: members.filter((m) => m.role === "parent"),
            kids: members.filter((m) => m.role === "child"),
            guests: members.filter((m) => m.role === "guest"),
            today,
            at,
            day: (days: number) => at(days, "00:00").slice(0, 10),
            uid: (prefix: string) => `${prefix}-${(counters[prefix] = (counters[prefix] ?? 0) + 1)}`,
            img: (name: string) => `/images/${name}.jpg`,
        };
    }

    private set(next: PeopleState): void {
        this.cache = next;
        try {
            localStorage.setItem(KEY, JSON.stringify(next));
        } catch {
            /* private mode: it still works, it just won't persist */
        }
    }

    private write(mutate: (s: PeopleState) => void): void {
        const next = structuredClone(this.get());
        mutate(next);
        this.set(next);
    }

    private manage(): void {
        if (!this.ctx.can("people.manage")) throw new Error("Not allowed");
    }

    private person(s: PeopleState, id: string): Person {
        const p = s.people.find((x) => x.id === id);
        if (!p) throw new Error("That person is no longer in the directory");
        return p;
    }

    private community(s: PeopleState, id: string): Community {
        const c = s.communities.find((x) => x.id === id);
        if (!c) throw new Error("That community is no longer here");
        return c;
    }

    private mentor(s: PeopleState, id: string): Mentor {
        const m = s.mentors.find((x) => x.id === id);
        if (!m) throw new Error("That mentor is no longer here");
        return m;
    }

    private session(s: PeopleState, id: string): MentorSession {
        const x = s.sessions.find((y) => y.id === id);
        if (!x) throw new Error("That session is no longer here");
        return x;
    }

    // -----------------------------------------------------------------------
    // Read
    // -----------------------------------------------------------------------

    async load(): Promise<PeopleState> {
        return visibleTo(structuredClone(this.get()), this.ctx);
    }

    // -----------------------------------------------------------------------
    // People
    // -----------------------------------------------------------------------

    async addPerson(input: NewPerson): Promise<Person> {
        this.manage();
        const name = input.name.trim();
        if (!name) throw new Error("A person needs a name");
        const p: Person = {
            id: uid("person"),
            spaceId: this.ctx.space.id,
            name,
            relationship: (input.relationship ?? "").trim(),
            kind: input.kind,
            photoUrl: input.photoUrl ?? null,
            birthday: input.birthday || null,
            anniversary: input.anniversary || null,
            address: input.address ?? "",
            phone: input.phone ?? "",
            email: input.email ?? "",
            notes: input.notes ?? "",
            prayerNeeds: input.prayerNeeds ?? "",
            giftIdeas: [],
            cadence: input.cadence ?? "none",
            lastContactedAt: null,
            linkedMemberId: input.linkedMemberId ?? null,
            tags: input.tags ?? [],
            visibility: input.visibility ?? "family",
            sharedWith: input.sharedWith ?? [],
            ownerMemberId: this.ctx.me.id,
            inviteCode: null,
            sharedObjects: [],
            redacted: false,
            createdAt: now(),
        };
        this.write((s) => {
            s.people.unshift(p);
        });
        return p;
    }

    async updatePerson(id: string, patch: Partial<Omit<Person, "id" | "spaceId" | "createdAt">>): Promise<void> {
        this.manage();
        this.write((s) => {
            const p = this.person(s, id);
            Object.assign(p, patch, { id: p.id, spaceId: p.spaceId, createdAt: p.createdAt, redacted: false });
            p.name = p.name.trim();
        });
    }

    async removePerson(id: string): Promise<void> {
        this.manage();
        this.write((s) => {
            this.person(s, id);
            const mentorIds = s.mentors.filter((m) => m.personId === id).map((m) => m.id);
            const sessionIds = s.sessions.filter((x) => mentorIds.includes(x.mentorId)).map((x) => x.id);
            s.people = s.people.filter((x) => x.id !== id);
            s.contacts = s.contacts.filter((x) => x.personId !== id);
            s.giftRequests = s.giftRequests.filter((x) => x.personId !== id);
            s.mentors = s.mentors.filter((m) => !mentorIds.includes(m.id));
            s.sessions = s.sessions.filter((x) => !sessionIds.includes(x.id));
            s.followUps = s.followUps.filter((f) => !sessionIds.includes(f.sessionId));
        });
    }

    async logContact(personId: string, input: { channel: ContactChannel; note?: string; at?: string }): Promise<void> {
        this.manage();
        const at = input.at ?? now();
        this.write((s) => {
            const p = this.person(s, personId);
            s.contacts.unshift({ id: uid("contact"), personId, at, channel: input.channel, note: (input.note ?? "").trim(), byMemberId: this.ctx.me.id });
            if (!p.lastContactedAt || at > p.lastContactedAt) p.lastContactedAt = at;
        });
    }

    // -----------------------------------------------------------------------
    // Gifts → the gift pipeline
    // -----------------------------------------------------------------------

    async addGiftIdea(personId: string, input: NewGiftIdea): Promise<void> {
        this.manage();
        const title = input.title.trim();
        if (!title) throw new Error("A gift idea needs a name");
        const gift: GiftIdea = { id: uid("gift"), title, occasion: (input.occasion ?? "").trim(), estCents: Math.max(0, Math.round(input.estCents ?? 0)), status: "idea", note: (input.note ?? "").trim(), createdAt: now() };
        this.write((s) => {
            this.person(s, personId).giftIdeas.push(gift);
        });
    }

    async removeGiftIdea(personId: string, giftId: string): Promise<void> {
        this.manage();
        this.write((s) => {
            const p = this.person(s, personId);
            p.giftIdeas = p.giftIdeas.filter((g) => g.id !== giftId);
            s.giftRequests = s.giftRequests.filter((r) => r.giftIdeaId !== giftId);
        });
    }

    async pushGiftToWishes(personId: string, giftId: string): Promise<GiftRequest> {
        this.manage();
        const s0 = this.get();
        const p0 = this.person(s0, personId);
        const g0 = p0.giftIdeas.find((g) => g.id === giftId);
        if (!g0) throw new Error("That gift idea is gone");
        if (s0.giftRequests.some((r) => r.giftIdeaId === giftId && r.status !== "declined")) throw new Error("That gift is already in the pipeline");
        const req: GiftRequest = {
            id: uid("giftreq"),
            personId,
            giftIdeaId: giftId,
            title: g0.title,
            forPersonName: p0.name,
            occasion: g0.occasion,
            estCents: g0.estCents,
            status: "pending",
            note: g0.note,
            requestedBy: this.ctx.me.id,
            requestedAt: now(),
        };
        this.write((s) => {
            const p = this.person(s, personId);
            const g = p.giftIdeas.find((x) => x.id === giftId);
            if (g) g.status = "requested";
            s.giftRequests.unshift(req);
        });
        return req;
    }

    async setGiftRequestStatus(id: string, status: GiftRequest["status"]): Promise<void> {
        this.manage();
        this.write((s) => {
            const r = s.giftRequests.find((x) => x.id === id);
            if (!r) throw new Error("That request is gone");
            r.status = status;
            const p = s.people.find((x) => x.id === r.personId);
            const g = p?.giftIdeas.find((x) => x.id === r.giftIdeaId);
            if (g) g.status = status === "bought" ? "given" : status === "declined" ? "idea" : "requested";
        });
    }

    async linkGuestInvite(personId: string, input: { code: string; objects: string[]; memberId?: string | null }): Promise<void> {
        this.manage();
        this.write((s) => {
            const p = this.person(s, personId);
            p.inviteCode = input.code;
            p.sharedObjects = input.objects;
            if (input.memberId) p.linkedMemberId = input.memberId;
        });
    }

    // -----------------------------------------------------------------------
    // Communities
    // -----------------------------------------------------------------------

    async addCommunity(input: NewCommunity): Promise<Community> {
        this.manage();
        const name = input.name.trim();
        if (!name) throw new Error("A community needs a name");
        const c: Community = {
            id: uid("community"),
            spaceId: this.ctx.space.id,
            name,
            type: input.type,
            meetingRhythm: input.meetingRhythm ?? "",
            meetsWhere: input.meetsWhere ?? "",
            link: input.link ?? "",
            photoUrl: input.photoUrl ?? null,
            rolesHeld: input.rolesHeld ?? [],
            contacts: input.contacts ?? [],
            givingCommitmentCents: Math.max(0, Math.round(input.givingCommitmentCents ?? 0)),
            givingFrequency: input.givingFrequency ?? "none",
            memberIds: input.memberIds ?? [],
            linkedEventIds: [],
            sharedWithGuests: input.sharedWithGuests ?? false,
            notes: input.notes ?? "",
            createdAt: now(),
        };
        this.write((s) => {
            s.communities.push(c);
        });
        return c;
    }

    async updateCommunity(id: string, patch: Partial<Omit<Community, "id" | "spaceId" | "createdAt">>): Promise<void> {
        this.manage();
        this.write((s) => {
            const c = this.community(s, id);
            Object.assign(c, patch, { id: c.id, spaceId: c.spaceId, createdAt: c.createdAt });
        });
    }

    async removeCommunity(id: string): Promise<void> {
        this.manage();
        this.write((s) => {
            this.community(s, id);
            s.communities = s.communities.filter((c) => c.id !== id);
            s.giving = s.giving.filter((g) => g.communityId !== id);
        });
    }

    async recordGiving(communityId: string, input: { amountCents: number; paidAt?: string; note?: string }): Promise<GivingPayment> {
        this.manage();
        const amountCents = Math.round(input.amountCents);
        if (!Number.isFinite(amountCents) || amountCents <= 0) throw new Error("Enter an amount");
        const c0 = this.community(this.get(), communityId);
        const payment: GivingPayment = {
            id: uid("giving"),
            communityId,
            communityName: c0.name,
            amountCents,
            paidAt: input.paidAt ?? now(),
            note: (input.note ?? "").trim() || `${c0.name} · giving`,
            byMemberId: this.ctx.me.id,
        };
        this.write((s) => {
            s.giving.unshift(payment);
        });
        return payment;
    }

    // -----------------------------------------------------------------------
    // Mentors and sessions
    // -----------------------------------------------------------------------

    async addMentor(input: NewMentor): Promise<Mentor> {
        this.manage();
        const m: Mentor = {
            id: uid("mentor"),
            spaceId: this.ctx.space.id,
            personId: input.personId,
            memberId: input.memberId ?? null,
            area: input.area,
            title: (input.title ?? "").trim(),
            menteeMemberIds: input.menteeMemberIds ?? [],
            nextSessionAt: input.nextSessionAt ?? null,
            createdAt: now(),
        };
        this.write((s) => {
            this.person(s, input.personId);
            if (s.mentors.some((x) => x.personId === input.personId)) throw new Error("They are already a mentor");
            s.mentors.push(m);
        });
        return m;
    }

    async updateMentor(id: string, patch: Partial<Omit<Mentor, "id" | "spaceId" | "createdAt">>): Promise<void> {
        this.manage();
        this.write((s) => {
            const m = this.mentor(s, id);
            Object.assign(m, patch, { id: m.id, spaceId: m.spaceId, createdAt: m.createdAt });
        });
    }

    async removeMentor(id: string): Promise<void> {
        this.manage();
        this.write((s) => {
            this.mentor(s, id);
            const sessionIds = s.sessions.filter((x) => x.mentorId === id).map((x) => x.id);
            s.mentors = s.mentors.filter((m) => m.id !== id);
            s.sessions = s.sessions.filter((x) => x.mentorId !== id);
            s.followUps = s.followUps.filter((f) => !sessionIds.includes(f.sessionId));
        });
    }

    async addSession(input: NewSession): Promise<MentorSession> {
        this.manage();
        const session: MentorSession = {
            id: uid("session"),
            mentorId: input.mentorId,
            date: input.date,
            participants: input.participants ?? [this.ctx.me.id],
            agenda: (input.agenda ?? "").trim(),
            notes: (input.notes ?? "").trim(),
            // The brief: session notes default to Private for the parent who wrote them.
            notesVisibility: input.notesVisibility ?? "private",
            notesSharedWith: input.notesSharedWith ?? [],
            ownerMemberId: this.ctx.me.id,
            questionsBeforeNext: input.questionsBeforeNext ?? [],
            nextSessionAt: input.nextSessionAt ?? null,
            notesWithheld: false,
            createdAt: now(),
        };
        this.write((s) => {
            this.mentor(s, input.mentorId);
            s.sessions.push(session);
            if (session.nextSessionAt) this.mentor(s, input.mentorId).nextSessionAt = session.nextSessionAt;
        });
        return session;
    }

    async updateSession(id: string, patch: Partial<Omit<MentorSession, "id" | "createdAt" | "notesWithheld">>): Promise<void> {
        this.manage();
        this.write((s) => {
            const x = this.session(s, id);
            // Only the author (or another parent acting on their own row) may rewrite private notes.
            if (patch.notes !== undefined && x.notesVisibility === "private" && x.ownerMemberId && x.ownerMemberId !== this.ctx.me.id) {
                throw new Error("Those notes are private to the person who wrote them");
            }
            Object.assign(x, patch, { id: x.id, createdAt: x.createdAt, notesWithheld: false });
            if (patch.nextSessionAt) this.mentor(s, x.mentorId).nextSessionAt = patch.nextSessionAt;
        });
    }

    async removeSession(id: string): Promise<void> {
        this.manage();
        this.write((s) => {
            this.session(s, id);
            s.sessions = s.sessions.filter((x) => x.id !== id);
            s.followUps = s.followUps.filter((f) => f.sessionId !== id);
        });
    }

    // -----------------------------------------------------------------------
    // Follow-ups — the rows Tasks adopts
    // -----------------------------------------------------------------------

    async addFollowUp(input: NewFollowUp): Promise<FollowUp> {
        this.manage();
        const title = input.title.trim();
        if (!title) throw new Error("A follow-up needs a title");
        const s0 = this.get();
        const session = this.session(s0, input.sessionId);
        const due = new Date(this.ctx.today);
        due.setDate(due.getDate() + 7);
        const f: FollowUp = {
            id: uid("followup"),
            sessionId: input.sessionId,
            mentorId: session.mentorId,
            title,
            memberId: input.memberId ?? this.ctx.me.id,
            dueAt: input.dueAt ?? due.toISOString(),
            done: false,
            taskId: null,
            createdAt: now(),
        };
        this.write((s) => {
            s.followUps.push(f);
        });
        return f;
    }

    async toggleFollowUp(id: string, done: boolean): Promise<void> {
        this.manage();
        this.write((s) => {
            const f = s.followUps.find((x) => x.id === id);
            if (!f) throw new Error("That follow-up is gone");
            f.done = done;
        });
    }

    async removeFollowUp(id: string): Promise<void> {
        this.manage();
        this.write((s) => {
            s.followUps = s.followUps.filter((f) => f.id !== id);
        });
    }
}
