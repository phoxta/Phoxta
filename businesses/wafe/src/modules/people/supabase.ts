import type { RepoContext, Visibility } from "@/data/core";
import { uid } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { visibleTo } from "./derive";
import type {
    Cadence,
    Community,
    CommunityContact,
    CommunityType,
    ContactChannel,
    ContactEntry,
    FollowUp,
    GiftIdea,
    GiftRequest,
    GivingFrequency,
    GivingPayment,
    Mentor,
    MentorArea,
    MentorSession,
    NewCommunity,
    NewFollowUp,
    NewGiftIdea,
    NewMentor,
    NewPerson,
    NewSession,
    PeopleRepo,
    PeopleState,
    Person,
    PersonKind,
} from "./types";

/**
 * People, live, under row-level security.
 *
 * The privacy rules are the database's, not this file's: a child's session
 * reads `wf_people_child` — a view that exposes name, photo and birthday and
 * nothing else — because the base table's read policy excludes children
 * outright, and mentor session notes come from `wf_mentor_sessions_v`, which
 * nulls the notes column unless `wf_can_see` says otherwise. Communities come
 * from `wf_communities_v`, which hands anyone but a parent the name, the
 * rhythm and the place — never the contact book, the family's notes or the
 * money. `visibleTo` runs again on the way out so the demo and the live app
 * compute identical screens.
 *
 * snake_case ↔ camelCase mapping lives here and nowhere else.
 */

type Row = Record<string, unknown>;

const s = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);
const n = (v: unknown, d = 0): number => (typeof v === "number" ? v : Number(v ?? d) || d);
const b = (v: unknown, d = false): boolean => (typeof v === "boolean" ? v : d);
const nul = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const iso = (v: unknown): string => (v ? new Date(v as string).toISOString() : new Date().toISOString());

function fail(where: string, error: { message: string } | null | undefined): void {
    if (error) throw new Error(`${where}: ${error.message}`);
}

const gifts = (v: unknown): GiftIdea[] =>
    Array.isArray(v)
        ? v.map((g) => {
              const r = (g ?? {}) as Row;
              return { id: s(r.id), title: s(r.title), occasion: s(r.occasion), estCents: n(r.estCents), status: s(r.status, "idea") as GiftIdea["status"], note: s(r.note), createdAt: iso(r.createdAt) };
          })
        : [];

const contactList = (v: unknown): CommunityContact[] =>
    Array.isArray(v)
        ? v.map((c) => {
              const r = (c ?? {}) as Row;
              return { name: s(r.name), role: s(r.role), phone: s(r.phone), email: s(r.email) };
          })
        : [];

const mapPerson = (r: Row): Person => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    name: s(r.name),
    relationship: s(r.relationship),
    kind: s(r.kind, "other") as PersonKind,
    photoUrl: nul(r.photo_url),
    birthday: nul(r.birthday),
    anniversary: nul(r.anniversary),
    address: s(r.address),
    phone: s(r.phone),
    email: s(r.email),
    notes: s(r.notes),
    prayerNeeds: s(r.prayer_needs),
    giftIdeas: gifts(r.gift_ideas),
    cadence: s(r.cadence, "none") as Cadence,
    lastContactedAt: r.last_contacted_at ? iso(r.last_contacted_at) : null,
    linkedMemberId: nul(r.linked_member_id),
    tags: strs(r.tags),
    visibility: s(r.visibility, "family") as Visibility,
    sharedWith: strs(r.shared_with),
    ownerMemberId: nul(r.owner_member_id),
    inviteCode: nul(r.invite_code),
    sharedObjects: strs(r.shared_objects),
    // The child view simply has no columns to redact; flag it so the screens say so.
    redacted: !("notes" in r),
    createdAt: iso(r.created_at),
});

const mapContact = (r: Row): ContactEntry => ({ id: s(r.id), personId: s(r.person_id), at: iso(r.at), channel: s(r.channel, "other") as ContactChannel, note: s(r.note), byMemberId: nul(r.by_member_id) });

const mapCommunity = (r: Row): Community => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    name: s(r.name),
    type: s(r.type, "other") as CommunityType,
    meetingRhythm: s(r.meeting_rhythm),
    meetsWhere: s(r.meets_where),
    link: s(r.link),
    photoUrl: nul(r.photo_url),
    rolesHeld: strs(r.roles_held),
    contacts: contactList(r.contacts),
    givingCommitmentCents: n(r.giving_commitment_cents),
    givingFrequency: s(r.giving_frequency, "none") as GivingFrequency,
    memberIds: strs(r.member_ids),
    linkedEventIds: strs(r.linked_event_ids),
    sharedWithGuests: b(r.shared_with_guests),
    notes: s(r.notes),
    createdAt: iso(r.created_at),
});

const mapGiving = (r: Row): GivingPayment => ({ id: s(r.id), communityId: s(r.community_id), communityName: s(r.community_name), amountCents: n(r.amount_cents), paidAt: iso(r.paid_at), note: s(r.note), byMemberId: nul(r.by_member_id) });

const mapMentor = (r: Row): Mentor => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    personId: s(r.person_id),
    memberId: nul(r.member_id),
    area: s(r.area, "other") as MentorArea,
    title: s(r.title),
    menteeMemberIds: strs(r.mentee_member_ids),
    nextSessionAt: r.next_session_at ? iso(r.next_session_at) : null,
    createdAt: iso(r.created_at),
});

const mapSession = (r: Row): MentorSession => ({
    id: s(r.id),
    mentorId: s(r.mentor_id),
    date: iso(r.date),
    participants: strs(r.participants),
    agenda: s(r.agenda),
    notes: s(r.notes),
    notesVisibility: s(r.notes_visibility, "private") as Visibility,
    notesSharedWith: strs(r.notes_shared_with),
    ownerMemberId: nul(r.owner_member_id),
    questionsBeforeNext: strs(r.questions_before_next),
    nextSessionAt: r.next_session_at ? iso(r.next_session_at) : null,
    notesWithheld: b(r.notes_withheld),
    createdAt: iso(r.created_at),
});

const mapFollowUp = (r: Row): FollowUp => ({ id: s(r.id), sessionId: s(r.session_id), mentorId: s(r.mentor_id), title: s(r.title), memberId: nul(r.member_id), dueAt: iso(r.due_at), done: b(r.done), taskId: nul(r.task_id), createdAt: iso(r.created_at) });

const mapGiftRequest = (r: Row): GiftRequest => ({
    id: s(r.id),
    personId: s(r.person_id),
    giftIdeaId: s(r.gift_idea_id),
    title: s(r.title),
    forPersonName: s(r.for_person_name),
    occasion: s(r.occasion),
    estCents: n(r.est_cents),
    status: s(r.status, "pending") as GiftRequest["status"],
    note: s(r.note),
    requestedBy: nul(r.requested_by),
    requestedAt: iso(r.requested_at),
});

const giftJson = (g: GiftIdea[]): Row[] => g.map((x) => ({ id: x.id, title: x.title, occasion: x.occasion, estCents: x.estCents, status: x.status, note: x.note, createdAt: x.createdAt }));

export class SupabasePeopleRepo implements PeopleRepo {
    constructor(private ctx: RepoContext) {}

    private get org(): string {
        if (!this.ctx.orgId) throw new Error("No organisation for this session");
        return this.ctx.orgId;
    }

    private get space(): string {
        return this.ctx.space.id;
    }

    private base() {
        return { organization_id: this.org, space_id: this.space };
    }

    private manage(): void {
        if (!this.ctx.can("people.manage")) throw new Error("Not allowed");
    }

    // -----------------------------------------------------------------------
    // Read
    // -----------------------------------------------------------------------

    async load(): Promise<PeopleState> {
        const child = this.ctx.role === "child";
        const peopleTable = child ? "wf_people_child" : "wf_people";

        const [people, contacts, communities, giving, mentors, sessions, followUps, giftRequests] = await Promise.all([
            supabase.from(peopleTable).select("*").eq("space_id", this.space).order("name"),
            child ? Promise.resolve({ data: [], error: null }) : supabase.from("wf_contact_log").select("*").eq("space_id", this.space).order("at", { ascending: false }).limit(200),
            supabase.from("wf_communities_v").select("*").eq("space_id", this.space).order("name"),
            this.ctx.role === "parent" ? supabase.from("wf_community_giving").select("*").eq("space_id", this.space).order("paid_at", { ascending: false }).limit(200) : Promise.resolve({ data: [], error: null }),
            supabase.from("wf_mentors").select("*").eq("space_id", this.space),
            supabase.from("wf_mentor_sessions_v").select("*").eq("space_id", this.space).order("date", { ascending: false }),
            supabase.from("wf_follow_ups").select("*").eq("space_id", this.space),
            this.ctx.role === "parent" ? supabase.from("wf_gift_requests").select("*").eq("space_id", this.space).order("requested_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
        ]);

        fail("people", people.error);
        fail("contact log", contacts.error);
        fail("communities", communities.error);
        fail("giving", giving.error);
        fail("mentors", mentors.error);
        fail("sessions", sessions.error);
        fail("follow-ups", followUps.error);
        fail("gift requests", giftRequests.error);

        const state: PeopleState = {
            people: (people.data ?? []).map(mapPerson),
            contacts: (contacts.data ?? []).map(mapContact),
            communities: (communities.data ?? []).map(mapCommunity),
            giving: (giving.data ?? []).map(mapGiving),
            mentors: (mentors.data ?? []).map(mapMentor),
            sessions: (sessions.data ?? []).map(mapSession),
            followUps: (followUps.data ?? []).map(mapFollowUp),
            giftRequests: (giftRequests.data ?? []).map(mapGiftRequest),
        };
        // Belt and braces: the same filter the demo runs, over rows RLS already vetted.
        return visibleTo(state, this.ctx);
    }

    // -----------------------------------------------------------------------
    // People
    // -----------------------------------------------------------------------

    async addPerson(input: NewPerson): Promise<Person> {
        this.manage();
        const name = input.name.trim();
        if (!name) throw new Error("A person needs a name");
        const { data, error } = await supabase
            .from("wf_people")
            .insert({
                ...this.base(),
                name,
                relationship: (input.relationship ?? "").trim(),
                kind: input.kind,
                photo_url: input.photoUrl ?? null,
                birthday: input.birthday || null,
                anniversary: input.anniversary || null,
                address: input.address ?? "",
                phone: input.phone ?? "",
                email: input.email ?? "",
                notes: input.notes ?? "",
                prayer_needs: input.prayerNeeds ?? "",
                gift_ideas: [],
                cadence: input.cadence ?? "none",
                linked_member_id: input.linkedMemberId ?? null,
                tags: input.tags ?? [],
                visibility: input.visibility ?? "family",
                shared_with: input.sharedWith ?? [],
                owner_member_id: this.ctx.me.id,
            })
            .select("*")
            .single();
        fail("add person", error);
        return mapPerson((data ?? {}) as Row);
    }

    async updatePerson(id: string, patch: Partial<Omit<Person, "id" | "spaceId" | "createdAt">>): Promise<void> {
        this.manage();
        const row: Row = {};
        if (patch.name !== undefined) row.name = patch.name.trim();
        if (patch.relationship !== undefined) row.relationship = patch.relationship;
        if (patch.kind !== undefined) row.kind = patch.kind;
        if (patch.photoUrl !== undefined) row.photo_url = patch.photoUrl;
        if (patch.birthday !== undefined) row.birthday = patch.birthday || null;
        if (patch.anniversary !== undefined) row.anniversary = patch.anniversary || null;
        if (patch.address !== undefined) row.address = patch.address;
        if (patch.phone !== undefined) row.phone = patch.phone;
        if (patch.email !== undefined) row.email = patch.email;
        if (patch.notes !== undefined) row.notes = patch.notes;
        if (patch.prayerNeeds !== undefined) row.prayer_needs = patch.prayerNeeds;
        if (patch.giftIdeas !== undefined) row.gift_ideas = giftJson(patch.giftIdeas);
        if (patch.cadence !== undefined) row.cadence = patch.cadence;
        if (patch.lastContactedAt !== undefined) row.last_contacted_at = patch.lastContactedAt;
        if (patch.linkedMemberId !== undefined) row.linked_member_id = patch.linkedMemberId;
        if (patch.tags !== undefined) row.tags = patch.tags;
        if (patch.visibility !== undefined) row.visibility = patch.visibility;
        if (patch.sharedWith !== undefined) row.shared_with = patch.sharedWith;
        if (patch.inviteCode !== undefined) row.invite_code = patch.inviteCode;
        if (patch.sharedObjects !== undefined) row.shared_objects = patch.sharedObjects;
        const { error } = await supabase.from("wf_people").update(row).eq("id", id).eq("space_id", this.space);
        fail("update person", error);
    }

    async removePerson(id: string): Promise<void> {
        this.manage();
        const { error } = await supabase.from("wf_people").delete().eq("id", id).eq("space_id", this.space);
        fail("remove person", error);
    }

    async logContact(personId: string, input: { channel: ContactChannel; note?: string; at?: string }): Promise<void> {
        this.manage();
        const at = input.at ?? new Date().toISOString();
        const { error } = await supabase.from("wf_contact_log").insert({ ...this.base(), person_id: personId, at, channel: input.channel, note: (input.note ?? "").trim(), by_member_id: this.ctx.me.id });
        fail("log contact", error);
        const { error: e2 } = await supabase.from("wf_people").update({ last_contacted_at: at }).eq("id", personId).eq("space_id", this.space);
        fail("last contacted", e2);
    }

    // -----------------------------------------------------------------------
    // Gifts
    // -----------------------------------------------------------------------

    private async fetchPerson(id: string): Promise<Person> {
        const { data, error } = await supabase.from("wf_people").select("*").eq("id", id).eq("space_id", this.space).single();
        fail("person", error);
        return mapPerson((data ?? {}) as Row);
    }

    async addGiftIdea(personId: string, input: NewGiftIdea): Promise<void> {
        this.manage();
        const title = input.title.trim();
        if (!title) throw new Error("A gift idea needs a name");
        const person = await this.fetchPerson(personId);
        const gift: GiftIdea = { id: uid("gift"), title, occasion: (input.occasion ?? "").trim(), estCents: Math.max(0, Math.round(input.estCents ?? 0)), status: "idea", note: (input.note ?? "").trim(), createdAt: new Date().toISOString() };
        const { error } = await supabase
            .from("wf_people")
            .update({ gift_ideas: giftJson([...person.giftIdeas, gift]) })
            .eq("id", personId)
            .eq("space_id", this.space);
        fail("add gift idea", error);
    }

    async removeGiftIdea(personId: string, giftId: string): Promise<void> {
        this.manage();
        const person = await this.fetchPerson(personId);
        const { error } = await supabase
            .from("wf_people")
            .update({ gift_ideas: giftJson(person.giftIdeas.filter((g) => g.id !== giftId)) })
            .eq("id", personId)
            .eq("space_id", this.space);
        fail("remove gift idea", error);
        const { error: e2 } = await supabase.from("wf_gift_requests").delete().eq("gift_idea_id", giftId).eq("space_id", this.space);
        fail("remove gift request", e2);
    }

    async pushGiftToWishes(personId: string, giftId: string): Promise<GiftRequest> {
        this.manage();
        const person = await this.fetchPerson(personId);
        const gift = person.giftIdeas.find((g) => g.id === giftId);
        if (!gift) throw new Error("That gift idea is gone");
        const { data, error } = await supabase
            .from("wf_gift_requests")
            .insert({
                ...this.base(),
                person_id: personId,
                gift_idea_id: giftId,
                title: gift.title,
                for_person_name: person.name,
                occasion: gift.occasion,
                est_cents: gift.estCents,
                status: "pending",
                note: gift.note,
                requested_by: this.ctx.me.id,
                requested_at: new Date().toISOString(),
            })
            .select("*")
            .single();
        fail("push gift", error);
        const { error: e2 } = await supabase
            .from("wf_people")
            .update({ gift_ideas: giftJson(person.giftIdeas.map((g) => (g.id === giftId ? { ...g, status: "requested" as const } : g))) })
            .eq("id", personId)
            .eq("space_id", this.space);
        fail("mark gift requested", e2);
        return mapGiftRequest((data ?? {}) as Row);
    }

    async setGiftRequestStatus(id: string, status: GiftRequest["status"]): Promise<void> {
        this.manage();
        const { error } = await supabase.from("wf_gift_requests").update({ status }).eq("id", id).eq("space_id", this.space);
        fail("gift request", error);
    }

    async linkGuestInvite(personId: string, input: { code: string; objects: string[]; memberId?: string | null }): Promise<void> {
        this.manage();
        const row: Row = { invite_code: input.code, shared_objects: input.objects };
        if (input.memberId) row.linked_member_id = input.memberId;
        const { error } = await supabase.from("wf_people").update(row).eq("id", personId).eq("space_id", this.space);
        fail("link invitation", error);
    }

    // -----------------------------------------------------------------------
    // Communities
    // -----------------------------------------------------------------------

    async addCommunity(input: NewCommunity): Promise<Community> {
        this.manage();
        const name = input.name.trim();
        if (!name) throw new Error("A community needs a name");
        const { data, error } = await supabase
            .from("wf_communities")
            .insert({
                ...this.base(),
                name,
                type: input.type,
                meeting_rhythm: input.meetingRhythm ?? "",
                meets_where: input.meetsWhere ?? "",
                link: input.link ?? "",
                photo_url: input.photoUrl ?? null,
                roles_held: input.rolesHeld ?? [],
                contacts: input.contacts ?? [],
                giving_commitment_cents: Math.max(0, Math.round(input.givingCommitmentCents ?? 0)),
                giving_frequency: input.givingFrequency ?? "none",
                member_ids: input.memberIds ?? [],
                linked_event_ids: [],
                shared_with_guests: input.sharedWithGuests ?? false,
                notes: input.notes ?? "",
            })
            .select("*")
            .single();
        fail("add community", error);
        return mapCommunity((data ?? {}) as Row);
    }

    async updateCommunity(id: string, patch: Partial<Omit<Community, "id" | "spaceId" | "createdAt">>): Promise<void> {
        this.manage();
        const row: Row = {};
        if (patch.name !== undefined) row.name = patch.name.trim();
        if (patch.type !== undefined) row.type = patch.type;
        if (patch.meetingRhythm !== undefined) row.meeting_rhythm = patch.meetingRhythm;
        if (patch.meetsWhere !== undefined) row.meets_where = patch.meetsWhere;
        if (patch.link !== undefined) row.link = patch.link;
        if (patch.photoUrl !== undefined) row.photo_url = patch.photoUrl;
        if (patch.rolesHeld !== undefined) row.roles_held = patch.rolesHeld;
        if (patch.contacts !== undefined) row.contacts = patch.contacts;
        if (patch.givingCommitmentCents !== undefined) row.giving_commitment_cents = patch.givingCommitmentCents;
        if (patch.givingFrequency !== undefined) row.giving_frequency = patch.givingFrequency;
        if (patch.memberIds !== undefined) row.member_ids = patch.memberIds;
        if (patch.linkedEventIds !== undefined) row.linked_event_ids = patch.linkedEventIds;
        if (patch.sharedWithGuests !== undefined) row.shared_with_guests = patch.sharedWithGuests;
        if (patch.notes !== undefined) row.notes = patch.notes;
        const { error } = await supabase.from("wf_communities").update(row).eq("id", id).eq("space_id", this.space);
        fail("update community", error);
    }

    async removeCommunity(id: string): Promise<void> {
        this.manage();
        const { error } = await supabase.from("wf_communities").delete().eq("id", id).eq("space_id", this.space);
        fail("remove community", error);
    }

    async recordGiving(communityId: string, input: { amountCents: number; paidAt?: string; note?: string }): Promise<GivingPayment> {
        this.manage();
        const amountCents = Math.round(input.amountCents);
        if (!Number.isFinite(amountCents) || amountCents <= 0) throw new Error("Enter an amount");
        const { data: c, error: e0 } = await supabase.from("wf_communities").select("name").eq("id", communityId).eq("space_id", this.space).single();
        fail("community", e0);
        const name = s((c as Row | null)?.name);
        const { data, error } = await supabase
            .from("wf_community_giving")
            .insert({ ...this.base(), community_id: communityId, community_name: name, amount_cents: amountCents, paid_at: input.paidAt ?? new Date().toISOString(), note: (input.note ?? "").trim() || `${name} · giving`, by_member_id: this.ctx.me.id })
            .select("*")
            .single();
        fail("record giving", error);
        return mapGiving((data ?? {}) as Row);
    }

    // -----------------------------------------------------------------------
    // Mentors and sessions
    // -----------------------------------------------------------------------

    async addMentor(input: NewMentor): Promise<Mentor> {
        this.manage();
        const { data, error } = await supabase
            .from("wf_mentors")
            .insert({ ...this.base(), person_id: input.personId, member_id: input.memberId ?? null, area: input.area, title: (input.title ?? "").trim(), mentee_member_ids: input.menteeMemberIds ?? [], next_session_at: input.nextSessionAt ?? null })
            .select("*")
            .single();
        fail("add mentor", error);
        return mapMentor((data ?? {}) as Row);
    }

    async updateMentor(id: string, patch: Partial<Omit<Mentor, "id" | "spaceId" | "createdAt">>): Promise<void> {
        this.manage();
        const row: Row = {};
        if (patch.personId !== undefined) row.person_id = patch.personId;
        if (patch.memberId !== undefined) row.member_id = patch.memberId;
        if (patch.area !== undefined) row.area = patch.area;
        if (patch.title !== undefined) row.title = patch.title;
        if (patch.menteeMemberIds !== undefined) row.mentee_member_ids = patch.menteeMemberIds;
        if (patch.nextSessionAt !== undefined) row.next_session_at = patch.nextSessionAt;
        const { error } = await supabase.from("wf_mentors").update(row).eq("id", id).eq("space_id", this.space);
        fail("update mentor", error);
    }

    async removeMentor(id: string): Promise<void> {
        this.manage();
        const { error } = await supabase.from("wf_mentors").delete().eq("id", id).eq("space_id", this.space);
        fail("remove mentor", error);
    }

    async addSession(input: NewSession): Promise<MentorSession> {
        this.manage();
        const { data, error } = await supabase
            .from("wf_mentor_sessions")
            .insert({
                ...this.base(),
                mentor_id: input.mentorId,
                date: input.date,
                participants: input.participants ?? [this.ctx.me.id],
                agenda: (input.agenda ?? "").trim(),
                notes: (input.notes ?? "").trim(),
                notes_visibility: input.notesVisibility ?? "private",
                notes_shared_with: input.notesSharedWith ?? [],
                owner_member_id: this.ctx.me.id,
                questions_before_next: input.questionsBeforeNext ?? [],
                next_session_at: input.nextSessionAt ?? null,
            })
            .select("*")
            .single();
        fail("add session", error);
        if (input.nextSessionAt) await this.updateMentor(input.mentorId, { nextSessionAt: input.nextSessionAt });
        return mapSession((data ?? {}) as Row);
    }

    async updateSession(id: string, patch: Partial<Omit<MentorSession, "id" | "createdAt" | "notesWithheld">>): Promise<void> {
        this.manage();
        const row: Row = {};
        if (patch.mentorId !== undefined) row.mentor_id = patch.mentorId;
        if (patch.date !== undefined) row.date = patch.date;
        if (patch.participants !== undefined) row.participants = patch.participants;
        if (patch.agenda !== undefined) row.agenda = patch.agenda;
        if (patch.notes !== undefined) row.notes = patch.notes;
        if (patch.notesVisibility !== undefined) row.notes_visibility = patch.notesVisibility;
        if (patch.notesSharedWith !== undefined) row.notes_shared_with = patch.notesSharedWith;
        if (patch.questionsBeforeNext !== undefined) row.questions_before_next = patch.questionsBeforeNext;
        if (patch.nextSessionAt !== undefined) row.next_session_at = patch.nextSessionAt;
        const { error } = await supabase.from("wf_mentor_sessions").update(row).eq("id", id).eq("space_id", this.space);
        fail("update session", error);
        if (patch.nextSessionAt && patch.mentorId) await this.updateMentor(patch.mentorId, { nextSessionAt: patch.nextSessionAt });
    }

    async removeSession(id: string): Promise<void> {
        this.manage();
        const { error } = await supabase.from("wf_mentor_sessions").delete().eq("id", id).eq("space_id", this.space);
        fail("remove session", error);
    }

    // -----------------------------------------------------------------------
    // Follow-ups
    // -----------------------------------------------------------------------

    async addFollowUp(input: NewFollowUp): Promise<FollowUp> {
        this.manage();
        const title = input.title.trim();
        if (!title) throw new Error("A follow-up needs a title");
        const { data: sess, error: e0 } = await supabase.from("wf_mentor_sessions").select("mentor_id").eq("id", input.sessionId).eq("space_id", this.space).single();
        fail("session", e0);
        const due = new Date(this.ctx.today);
        due.setDate(due.getDate() + 7);
        const { data, error } = await supabase
            .from("wf_follow_ups")
            .insert({ ...this.base(), session_id: input.sessionId, mentor_id: s((sess as Row | null)?.mentor_id), title, member_id: input.memberId ?? this.ctx.me.id, due_at: input.dueAt ?? due.toISOString(), done: false })
            .select("*")
            .single();
        fail("add follow-up", error);
        return mapFollowUp((data ?? {}) as Row);
    }

    async toggleFollowUp(id: string, done: boolean): Promise<void> {
        this.manage();
        const { error } = await supabase.from("wf_follow_ups").update({ done }).eq("id", id).eq("space_id", this.space);
        fail("follow-up", error);
    }

    async removeFollowUp(id: string): Promise<void> {
        this.manage();
        const { error } = await supabase.from("wf_follow_ups").delete().eq("id", id).eq("space_id", this.space);
        fail("remove follow-up", error);
    }
}
