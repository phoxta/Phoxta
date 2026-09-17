import type { ModuleRepo, Visibility } from "@/data/core";

/**
 * People — the family's relational world.
 *
 * Three things live here and they are deliberately separate:
 *   PERSON      someone outside the household: a relative, a friend, a
 *               neighbour, the piano teacher. Carries the details you would
 *               keep in an address book plus the things a family actually
 *               needs — prayer needs, gift ideas, when we last called.
 *   COMMUNITY   a body the family belongs to: church, the home-ed co-op, a
 *               club. Rhythm, roles held, contacts, and what we have
 *               committed to give.
 *   MENTOR      a person who guides the family or a child, with SESSIONS —
 *               agenda, notes, what to ask before the next one, follow-ups.
 *
 * Privacy is per row: `visibility` + `sharedWith` on anything a parent writes,
 * and a child never receives contact details or notes at all (see
 * `visibleTo` in derive.ts, which both repos run before returning state).
 */

export type PersonKind = "relative" | "friend" | "neighbour" | "other";
export type Cadence = "weekly" | "monthly" | "quarterly" | "none";
export type CommunityType = "church" | "coop" | "club" | "school" | "other";
export type MentorArea = "faith" | "career" | "marriage" | "music" | "other";
export type ContactChannel = "call" | "visit" | "message" | "video" | "other";
export type GiftStatus = "idea" | "requested" | "given";
export type GivingFrequency = "weekly" | "monthly" | "quarterly" | "yearly" | "none";

export const PERSON_KIND: Record<PersonKind, string> = {
    relative: "Relative",
    friend: "Friend",
    neighbour: "Neighbour",
    other: "Other",
};

export const CADENCE: Record<Cadence, { label: string; days: number }> = {
    weekly: { label: "Every week", days: 7 },
    monthly: { label: "Every month", days: 30 },
    quarterly: { label: "Every three months", days: 91 },
    none: { label: "No reminder", days: 0 },
};

export const COMMUNITY_TYPE: Record<CommunityType, string> = {
    church: "Church",
    coop: "Co-op",
    club: "Club",
    school: "School",
    other: "Other",
};

export const MENTOR_AREA: Record<MentorArea, string> = {
    faith: "Faith",
    career: "Career",
    marriage: "Marriage",
    music: "Music",
    other: "Other",
};

export const CONTACT_CHANNEL: Record<ContactChannel, string> = {
    call: "Called",
    visit: "Visited",
    message: "Messaged",
    video: "Video call",
    other: "Other",
};

/** A present we thought of for someone, before it becomes a purchase request. */
export interface GiftIdea {
    id: string;
    title: string;
    /** "Birthday", "Christmas", "Thank you". */
    occasion: string;
    estCents: number;
    status: GiftStatus;
    note: string;
    createdAt: string;
}

export interface Person {
    id: string;
    spaceId: string;
    name: string;
    /** How we know them: "Oluwafemi's brother", "Church, welcome team". */
    relationship: string;
    kind: PersonKind;
    photoUrl: string | null;
    /** ISO date; the year may be the real one — only day/month is used. */
    birthday: string | null;
    anniversary: string | null;
    address: string;
    phone: string;
    email: string;
    notes: string;
    prayerNeeds: string;
    giftIdeas: GiftIdea[];
    cadence: Cadence;
    lastContactedAt: string | null;
    /** Set when this person also has a seat in the family (a guest member). */
    linkedMemberId: string | null;
    /** "close family", "church", "school", "friend"… */
    tags: string[];
    visibility: Visibility;
    sharedWith: string[];
    ownerMemberId: string | null;
    /** Set once the contact has been converted into a scoped guest invitation. */
    inviteCode: string | null;
    /** The named objects that invitation grants ("The prayer wall", "Christmas in Lagos"). */
    sharedObjects: string[];
    /** True when this reader (a child) was given the safe subset only. */
    redacted: boolean;
    createdAt: string;
}

/** "We called Aunty Bisi" — what resets the stay-in-touch clock. */
export interface ContactEntry {
    id: string;
    personId: string;
    at: string;
    channel: ContactChannel;
    note: string;
    byMemberId: string | null;
}

export interface CommunityContact {
    name: string;
    role: string;
    phone: string;
    email: string;
}

export interface Community {
    id: string;
    spaceId: string;
    name: string;
    type: CommunityType;
    /** "Sundays 10:00", "Tue & Thu, 09:30–12:30". */
    meetingRhythm: string;
    meetsWhere: string;
    link: string;
    photoUrl: string | null;
    /** Roles the family holds here: "Oluwafemi — leads Bible study". */
    rolesHeld: string[];
    contacts: CommunityContact[];
    /** What we have committed to give, in minor units. */
    givingCommitmentCents: number;
    givingFrequency: GivingFrequency;
    /** Which of us go. */
    memberIds: string[];
    /** Calendar events this community owns (read by the calendar module). */
    linkedEventIds: string[];
    /** Guests granted this community see it on their dashboard. */
    sharedWithGuests: boolean;
    notes: string;
    createdAt: string;
}

/**
 * A giving commitment actually paid. A commitment is a promise; this is the
 * record, so giving only counts once the family says it went out. People
 * publishes these through `givingRows()` in derive.ts for a giving ledger to
 * fold in; until one does, the record lives on the community's own page.
 */
export interface GivingPayment {
    id: string;
    communityId: string;
    communityName: string;
    amountCents: number;
    paidAt: string;
    note: string;
    byMemberId: string | null;
}

export interface Mentor {
    id: string;
    spaceId: string;
    personId: string;
    /** Set when the mentor also has a guest seat (Pastor Dayo does). */
    memberId: string | null;
    area: MentorArea;
    /** "Pastor", "Piano teacher", "Football coach". */
    title: string;
    menteeMemberIds: string[];
    nextSessionAt: string | null;
    createdAt: string;
}

export interface MentorSession {
    id: string;
    mentorId: string;
    date: string;
    /** Members who were (or will be) in the room. */
    participants: string[];
    agenda: string;
    notes: string;
    /** Defaults to `private` for the parent who wrote them. */
    notesVisibility: Visibility;
    notesSharedWith: string[];
    ownerMemberId: string | null;
    questionsBeforeNext: string[];
    nextSessionAt: string | null;
    /** True when the notes were withheld from this reader. */
    notesWithheld: boolean;
    createdAt: string;
}

/**
 * A follow-up agreed in a session. It carries everything a task needs
 * (`title`, `memberId`, `dueAt`) plus `sessionId`, and People publishes it
 * through `taskRows()` in derive.ts so a task list can adopt it and write the
 * adopted id back to `taskId`. Until then it is ticked off here, on the
 * session it was agreed in.
 */
export interface FollowUp {
    id: string;
    sessionId: string;
    mentorId: string;
    title: string;
    memberId: string | null;
    dueAt: string;
    done: boolean;
    /** Set by a task list that has adopted this row; null while it lives here only. */
    taskId: string | null;
    createdAt: string;
}

/**
 * A gift idea moved into the gift pipeline: a present waiting on a parent's
 * yes. Decided on the person's own page, and published through `wishRows()`
 * in derive.ts, shaped as a wish with `forPersonName` as the recipient, for a
 * purchase pipeline to show alongside its own.
 */
export interface GiftRequest {
    id: string;
    personId: string;
    giftIdeaId: string;
    title: string;
    forPersonName: string;
    occasion: string;
    estCents: number;
    status: "pending" | "approved" | "bought" | "declined";
    note: string;
    requestedBy: string | null;
    requestedAt: string;
}

export interface PeopleState {
    people: Person[];
    contacts: ContactEntry[];
    communities: Community[];
    giving: GivingPayment[];
    mentors: Mentor[];
    sessions: MentorSession[];
    followUps: FollowUp[];
    giftRequests: GiftRequest[];
}

export type NewPerson = Pick<Person, "name" | "relationship" | "kind"> &
    Partial<Pick<Person, "photoUrl" | "birthday" | "anniversary" | "address" | "phone" | "email" | "notes" | "prayerNeeds" | "cadence" | "tags" | "visibility" | "sharedWith" | "linkedMemberId">>;

export type NewCommunity = Pick<Community, "name" | "type"> &
    Partial<Pick<Community, "meetingRhythm" | "meetsWhere" | "link" | "photoUrl" | "rolesHeld" | "contacts" | "givingCommitmentCents" | "givingFrequency" | "memberIds" | "sharedWithGuests" | "notes">>;

export type NewMentor = Pick<Mentor, "personId" | "area"> & Partial<Pick<Mentor, "memberId" | "title" | "menteeMemberIds" | "nextSessionAt">>;

export type NewSession = Pick<MentorSession, "mentorId" | "date"> &
    Partial<Pick<MentorSession, "participants" | "agenda" | "notes" | "notesVisibility" | "notesSharedWith" | "questionsBeforeNext" | "nextSessionAt">>;

export type NewFollowUp = Pick<FollowUp, "sessionId" | "title"> & Partial<Pick<FollowUp, "memberId" | "dueAt">>;

export type NewGiftIdea = Pick<GiftIdea, "title"> & Partial<Pick<GiftIdea, "occasion" | "estCents" | "note">>;

export interface PeopleRepo extends ModuleRepo<PeopleState> {
    addPerson(input: NewPerson): Promise<Person>;
    updatePerson(id: string, patch: Partial<Omit<Person, "id" | "spaceId" | "createdAt">>): Promise<void>;
    removePerson(id: string): Promise<void>;

    /** Log a call/visit — this is what resets the stay-in-touch clock. */
    logContact(personId: string, input: { channel: ContactChannel; note?: string; at?: string }): Promise<void>;

    addGiftIdea(personId: string, input: NewGiftIdea): Promise<void>;
    removeGiftIdea(personId: string, giftId: string): Promise<void>;
    /** Move a gift idea into the gift pipeline, waiting on a parent's decision. */
    pushGiftToWishes(personId: string, giftId: string): Promise<GiftRequest>;
    setGiftRequestStatus(id: string, status: GiftRequest["status"]): Promise<void>;

    /** Record the invitation a contact was converted into, with its object shares. */
    linkGuestInvite(personId: string, input: { code: string; objects: string[]; memberId?: string | null }): Promise<void>;

    addCommunity(input: NewCommunity): Promise<Community>;
    updateCommunity(id: string, patch: Partial<Omit<Community, "id" | "spaceId" | "createdAt">>): Promise<void>;
    removeCommunity(id: string): Promise<void>;
    /** A commitment paid — from here it counts as given, and `givingRows()` publishes it. */
    recordGiving(communityId: string, input: { amountCents: number; paidAt?: string; note?: string }): Promise<GivingPayment>;

    addMentor(input: NewMentor): Promise<Mentor>;
    updateMentor(id: string, patch: Partial<Omit<Mentor, "id" | "spaceId" | "createdAt">>): Promise<void>;
    removeMentor(id: string): Promise<void>;

    addSession(input: NewSession): Promise<MentorSession>;
    updateSession(id: string, patch: Partial<Omit<MentorSession, "id" | "createdAt" | "notesWithheld">>): Promise<void>;
    removeSession(id: string): Promise<void>;

    addFollowUp(input: NewFollowUp): Promise<FollowUp>;
    toggleFollowUp(id: string, done: boolean): Promise<void>;
    removeFollowUp(id: string): Promise<void>;
}
