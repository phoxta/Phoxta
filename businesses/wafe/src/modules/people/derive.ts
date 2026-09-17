import type { AgendaItem, AttentionItem, ChildCard, DashboardContribution, Nudge, ProgressRing, RepoContext, Space, Visibility } from "@/data/core";
import { isoDate, money, shortDate, weekStart } from "@/lib/format";
import { CADENCE, type Cadence, type Community, type FollowUp, type GiftRequest, type GivingPayment, type Mentor, type MentorSession, type PeopleState, type Person } from "./types";

/**
 * Every number the People screens show, and the filter both repos run before
 * they hand state to anybody.
 *
 * The privacy rules, in one place:
 *   PARENT  everything, minus another parent's private rows.
 *   CHILD   relatives and friends as NAME · PHOTO · BIRTHDAY and nothing else —
 *           no phone, no address, no notes, no prayer needs, no gift ideas, no
 *           contact history, no giving. The communities they themselves attend,
 *           without the contact book. Their own mentors' sessions, with notes
 *           only when they were written for them.
 *   GUEST   their own record, the communities the family marked shared — name,
 *           rhythm and place, never the roster, the notes or the money — and,
 *           for a mentor, their own sessions with notes only when explicitly
 *           shared.
 *
 * The live repo enforces the same thing in Postgres (see sql/people.sql: the
 * child reads a redacting view, never the base table), so this function is the
 * demo's copy of the database's own rule, not a substitute for it.
 */

const MS_DAY = 86400000;

/**
 * The name a family would say out loud: "Aunty Bisi", "Mrs Harding", "Kemi".
 * A bare first token turns "Uncle Seun Adeyemi" into "Uncle", which is how you
 * can tell software wrote the reminder.
 */
const HONORIFIC = new Set(["uncle", "aunty", "aunt", "mama", "baba", "pastor", "mr", "mrs", "ms", "miss", "dr", "sister", "brother", "coach", "grandma", "grandpa"]);

export function shortName(name: string): string {
    const parts = name.replace(/\s*&.*$/, "").trim().split(/\s+/);
    if (!parts.length) return name;
    if (parts.length > 1 && HONORIFIC.has(parts[0].toLowerCase().replace(/\./g, ""))) return `${parts[0]} ${parts[1]}`;
    return parts[0];
}

/** Whole days from ISO date `from` to ISO date `to` (negative = in the past). */
export function dayDiff(from: string, to: string): number {
    return Math.round((Date.parse(`${to.slice(0, 10)}T00:00:00Z`) - Date.parse(`${from.slice(0, 10)}T00:00:00Z`)) / MS_DAY);
}

/** The next time a birthday/anniversary comes round, as an ISO date. */
export function nextOccurrence(dateIso: string, today: string): string {
    const md = dateIso.slice(5, 10);
    const year = Number(today.slice(0, 4));
    const thisYear = `${year}-${md}`;
    return thisYear >= today ? thisYear : `${year + 1}-${md}`;
}

/** How many years old they turn on that occurrence (undefined when the year is unknown). */
export function turningAge(dateIso: string, occurrence: string): number | undefined {
    const born = Number(dateIso.slice(0, 4));
    if (!born || born < 1900) return undefined;
    return Number(occurrence.slice(0, 4)) - born;
}

export interface Occasion {
    key: string;
    personId: string;
    personName: string;
    photoUrl: string | null;
    kind: "birthday" | "anniversary";
    /** ISO date of the next occurrence. */
    date: string;
    inDays: number;
    /** Age turned, or years married. */
    years?: number;
}

/** Birthdays and anniversaries in the next `within` days, soonest first. */
export function occasions(state: PeopleState, today: string, within = 60): Occasion[] {
    const out: Occasion[] = [];
    for (const p of state.people) {
        for (const kind of ["birthday", "anniversary"] as const) {
            const raw = kind === "birthday" ? p.birthday : p.anniversary;
            if (!raw) continue;
            const date = nextOccurrence(raw, today);
            const inDays = dayDiff(today, date);
            if (inDays > within) continue;
            out.push({ key: `${p.id}:${kind}:${date}`, personId: p.id, personName: p.name, photoUrl: p.photoUrl, kind, date, inDays, years: turningAge(raw, date) });
        }
    }
    return out.sort((a, b) => a.inDays - b.inDays || a.personName.localeCompare(b.personName));
}

/**
 * What People puts on the family calendar.
 *
 * A birthday is not a row somebody has to remember to create: it is a fact
 * about a person, so the calendar READS it. The calendar module imports this
 * pure function over `useModuleState<PeopleState>("people")` — People never
 * writes into another module's tables — and every entry carries the `href`
 * back to the person or the mentor it came from.
 */
export interface PeopleCalendarEntry {
    id: string;
    title: string;
    /** An ISO date for an all-day occasion, an ISO datetime for a booked session. */
    at: string;
    allDay: boolean;
    kind: "birthday" | "anniversary" | "session";
    meta: string;
    href: string;
    /** Members it concerns; empty means the whole family. */
    memberIds: string[];
}

export function calendarEntries(state: PeopleState, fromDate: string, toDate: string): PeopleCalendarEntry[] {
    const out: PeopleCalendarEntry[] = [];
    const span = Math.max(0, dayDiff(fromDate, toDate));

    for (const o of occasions(state, fromDate, span)) {
        out.push({
            id: `people-${o.key}`,
            title: o.kind === "birthday" ? `${o.personName}'s birthday` : `${o.personName}'s anniversary`,
            at: o.date,
            allDay: true,
            kind: o.kind,
            meta: o.years ? (o.kind === "birthday" ? `Turns ${o.years}` : `${o.years} years`) : OCCASION_LABEL[o.kind],
            href: `/family/people/relatives/${o.personId}`,
            memberIds: [],
        });
    }

    for (const s of state.sessions) {
        const date = s.date.slice(0, 10);
        if (date < fromDate || date > toDate) continue;
        const mentor = state.mentors.find((m) => m.id === s.mentorId);
        const who = mentor ? mentorPerson(state, mentor)?.name : undefined;
        out.push({
            id: `people-session-${s.id}`,
            title: s.agenda || `Session with ${who ?? "a mentor"}`,
            at: s.date,
            allDay: false,
            kind: "session",
            meta: who ? `Mentor · ${who}` : "Mentor session",
            href: mentor ? `/family/people/mentors/${mentor.id}` : "/family/people",
            memberIds: s.participants,
        });
    }

    return out.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
}

export interface CadenceStatus {
    cadence: Cadence;
    /** Null when the cadence is "none" or nobody has ever logged a contact. */
    dueOn: string | null;
    /** Positive when overdue, negative when still in hand. */
    overdueBy: number;
    overdue: boolean;
    lastContactedAt: string | null;
    daysSince: number | null;
}

export function cadenceStatus(person: Person, today: string): CadenceStatus {
    const days = CADENCE[person.cadence].days;
    const last = person.lastContactedAt;
    const daysSince = last ? dayDiff(last, today) : null;
    if (!days) return { cadence: person.cadence, dueOn: null, overdueBy: 0, overdue: false, lastContactedAt: last, daysSince };
    if (!last) return { cadence: person.cadence, dueOn: today, overdueBy: 1, overdue: true, lastContactedAt: null, daysSince: null };
    const dueOn = isoDate(new Date(Date.parse(`${last.slice(0, 10)}T00:00:00Z`) + days * MS_DAY));
    const overdueBy = dayDiff(dueOn, today);
    return { cadence: person.cadence, dueOn, overdueBy, overdue: overdueBy > 0, lastContactedAt: last, daysSince };
}

/** Everyone whose stay-in-touch cadence has run out, worst first. */
export function overdueContacts(state: PeopleState, today: string): Array<{ person: Person; status: CadenceStatus }> {
    return state.people
        .map((person) => ({ person, status: cadenceStatus(person, today) }))
        .filter((x) => x.status.overdue)
        .sort((a, b) => b.status.overdueBy - a.status.overdueBy);
}

/** 0-100: how much of the stay-in-touch list is actually current. */
export function inTouchPct(state: PeopleState, today: string): { pct: number; kept: number; total: number } {
    const tracked = state.people.filter((p) => p.cadence !== "none");
    if (!tracked.length) return { pct: 100, kept: 0, total: 0 };
    const kept = tracked.filter((p) => !cadenceStatus(p, today).overdue).length;
    return { pct: Math.round((kept / tracked.length) * 100), kept, total: tracked.length };
}

export const mentorPerson = (state: PeopleState, mentor: Mentor): Person | undefined => state.people.find((p) => p.id === mentor.personId);

export const sessionsFor = (state: PeopleState, mentorId: string): MentorSession[] => state.sessions.filter((s) => s.mentorId === mentorId).sort((a, b) => (a.date < b.date ? 1 : -1));

export const followUpsFor = (state: PeopleState, sessionId: string): FollowUp[] => state.followUps.filter((f) => f.sessionId === sessionId);

export const openFollowUps = (state: PeopleState): FollowUp[] => state.followUps.filter((f) => !f.done).sort((a, b) => (a.dueAt < b.dueAt ? -1 : 1));

/** The next session for a mentor, if one is booked. */
export function nextSession(state: PeopleState, mentor: Mentor, today: string): MentorSession | { date: string } | null {
    const upcoming = state.sessions.filter((s) => s.mentorId === mentor.id && s.date.slice(0, 10) >= today).sort((a, b) => (a.date < b.date ? -1 : 1))[0];
    if (upcoming) return upcoming;
    return mentor.nextSessionAt ? { date: mentor.nextSessionAt } : null;
}

export interface GivingLine {
    community: Community;
    committedCents: number;
    /** What has actually been paid this calendar month. */
    paidThisMonthCents: number;
    paidThisYearCents: number;
    outstandingCents: number;
    lastPaidAt: string | null;
}

/** A commitment is only giving once it is paid; `givingRows` publishes the paid ones. */
export function givingLines(state: PeopleState, today: string): GivingLine[] {
    const month = today.slice(0, 7);
    const year = today.slice(0, 4);
    return state.communities.map((community) => {
        const mine = state.giving.filter((g) => g.communityId === community.id);
        const paidThisMonthCents = mine.filter((g) => g.paidAt.slice(0, 7) === month).reduce((n, g) => n + g.amountCents, 0);
        const paidThisYearCents = mine.filter((g) => g.paidAt.slice(0, 4) === year).reduce((n, g) => n + g.amountCents, 0);
        const committedCents = community.givingFrequency === "monthly" ? community.givingCommitmentCents : 0;
        return {
            community,
            committedCents,
            paidThisMonthCents,
            paidThisYearCents,
            outstandingCents: Math.max(0, committedCents - paidThisMonthCents),
            lastPaidAt: mine.map((g) => g.paidAt).sort().reverse()[0] ?? null,
        };
    });
}

export const givingTotal = (rows: GivingPayment[]): number => rows.reduce((n, g) => n + g.amountCents, 0);

// ---------------------------------------------------------------------------
// Adapters — the rows People offers to other modules
// ---------------------------------------------------------------------------

/**
 * People never writes into another module's tables, and never reaches for
 * another module's repo. Where a row of ours belongs on somebody else's
 * screen, we publish it as a pure function over our own state — the same seam
 * `calendarEntries` uses, which is how a birthday reaches the family calendar
 * without anybody creating an event.
 *
 * Three more seams, one per crossing:
 *   `wishRows`    gift requests, shaped like a purchase-pipeline wish.
 *   `taskRows`    mentor follow-ups, shaped like a task with its session behind it.
 *   `givingRows`  giving recorded against a community, shaped like a ledger line.
 *
 * A consumer folds these into its own view over
 * `useModuleState<PeopleState>("people")`; every row carries a stable `id`
 * prefixed with `people-` so it can be de-duplicated against native rows, and
 * an `href` back to the screen it came from. Nothing here mutates anything.
 *
 * Until a module adopts its seam the rows are shown and decided on People's
 * own screens, and the copy there says exactly that — no screen in this module
 * claims a row has landed somewhere it has not.
 */

/** A gift request as the purchase pipeline would hold it. */
export interface PeopleWishRow {
    id: string;
    /** The gift request this came from, for the round trip back. */
    requestId: string;
    name: string;
    priceCents: number;
    /** Who the present is for — the recipient, who is not a family member. */
    forPersonName: string;
    personId: string;
    occasion: string;
    reason: string;
    requestedBy: string | null;
    requestedAt: string;
    status: GiftRequest["status"];
    href: string;
}

/** Gift requests that are still live — declined ones are gone, not pending. */
export function wishRows(state: PeopleState): PeopleWishRow[] {
    return state.giftRequests
        .filter((r) => r.status !== "declined")
        .map((r) => ({
            id: `people-gift-${r.id}`,
            requestId: r.id,
            name: r.title,
            priceCents: r.estCents,
            forPersonName: r.forPersonName,
            personId: r.personId,
            occasion: r.occasion,
            reason: r.occasion ? `${r.occasion} present for ${r.forPersonName}` : `A present for ${r.forPersonName}`,
            requestedBy: r.requestedBy,
            requestedAt: r.requestedAt,
            status: r.status,
            href: personHref(r.personId),
        }))
        .sort((a, b) => (a.requestedAt < b.requestedAt ? 1 : -1));
}

/** A mentor follow-up as a task list would hold it. */
export interface PeopleTaskRow {
    id: string;
    /** The follow-up this came from. */
    followUpId: string;
    title: string;
    notes: string;
    /** Empty means anybody in the family. */
    assigneeMemberIds: string[];
    /** ISO date; follow-ups are all-day by nature. */
    dueAt: string;
    allDay: boolean;
    done: boolean;
    sessionId: string;
    mentorId: string;
    /** Set on our row once a task list has adopted it. */
    taskId: string | null;
    href: string;
}

export function taskRows(state: PeopleState, opts: { openOnly?: boolean } = {}): PeopleTaskRow[] {
    return state.followUps
        .filter((f) => (opts.openOnly ? !f.done : true))
        .map((f) => {
            const session = state.sessions.find((s) => s.id === f.sessionId);
            const mentor = state.mentors.find((m) => m.id === f.mentorId);
            const who = mentor ? mentorPerson(state, mentor)?.name : undefined;
            return {
                id: `people-followup-${f.id}`,
                followUpId: f.id,
                title: f.title,
                notes: session?.agenda ? `Agreed with ${who ?? "a mentor"}: ${session.agenda}` : `Agreed with ${who ?? "a mentor"}`,
                assigneeMemberIds: f.memberId ? [f.memberId] : [],
                dueAt: f.dueAt.slice(0, 10),
                allDay: true as const,
                done: f.done,
                sessionId: f.sessionId,
                mentorId: f.mentorId,
                taskId: f.taskId,
                href: mentorHref(f.mentorId),
            };
        })
        .sort((a, b) => (a.dueAt < b.dueAt ? -1 : 1));
}

/** A recorded gift to a community as a giving ledger would hold it. */
export interface PeopleGivingRow {
    id: string;
    paymentId: string;
    date: string;
    recipient: string;
    communityId: string;
    amountCents: number;
    note: string;
    byMemberId: string | null;
    /** Which giving budget it belongs to: a church commitment is a tithe. */
    budgetId: "tithes" | "giving";
    href: string;
}

/** Everything recorded as actually given, optionally within a date window. */
export function givingRows(state: PeopleState, from?: string, to?: string): PeopleGivingRow[] {
    return state.giving
        .filter((g) => (!from || g.paidAt.slice(0, 10) >= from) && (!to || g.paidAt.slice(0, 10) <= to))
        .map((g) => {
            const community = state.communities.find((c) => c.id === g.communityId);
            return {
                id: `people-giving-${g.id}`,
                paymentId: g.id,
                date: g.paidAt.slice(0, 10),
                recipient: g.communityName || community?.name || "Unnamed",
                communityId: g.communityId,
                amountCents: g.amountCents,
                note: g.note,
                byMemberId: g.byMemberId,
                budgetId: (community?.type === "church" ? "tithes" : "giving") as PeopleGivingRow["budgetId"],
                href: communityHref(g.communityId),
            };
        })
        .sort((a, b) => (a.date < b.date ? 1 : -1));
}

// ---------------------------------------------------------------------------
// Drafted messages — the template fallback the companion improves on
// ---------------------------------------------------------------------------

/**
 * A message worth sending before the companion is even asked. The AI hook
 * rewrites it; this is what the reminder carries when AI is unavailable, so a
 * family is never handed a blank box at 08:00 on someone's birthday.
 */
/** "The Adeyemi family" → "the Adeyemi family", so it reads inside a sentence. */
function familyLabel(space: Space): string {
    return space.name.replace(/^The\b/, "the");
}

export function draftMessage(person: Person, kind: "birthday" | "anniversary", space: Space, years?: number): string {
    const first = shortName(person.name);
    const value = space.values[0] ?? "love";
    const from = familyLabel(space);
    if (kind === "anniversary") {
        const n = years ? `${years} years — ` : "";
        return `Happy anniversary, ${person.name}! ${n}what a gift to watch you two keep choosing each other. We're praying for many more, and we thank God for you both. With love from ${from}.`;
    }
    const age = years ? ` ${years}` : "";
    return `Happy birthday${age ? ` on turning${age}` : ""}, ${first}! We thank God for you today — for your ${value.toLowerCase()} and for everything you've been to this family. Have a beautiful day, and know you're prayed for. Love from ${from}.`;
}

// ---------------------------------------------------------------------------
// Visibility — the one filter both repos run
// ---------------------------------------------------------------------------

function canSee(ctx: RepoContext, owner: string | null, visibility: Visibility, sharedWith: string[]): boolean {
    if (visibility === "child") return true;
    if (owner && owner === ctx.me.id) return true;
    if (visibility === "shared") return sharedWith.includes(ctx.me.id);
    if (visibility === "family") return ctx.role === "parent" || ctx.role === "guest";
    return false;
}

/** Notes are a separate decision from the row: a session can be visible with its notes withheld. */
function readNotes(ctx: RepoContext, s: MentorSession): MentorSession {
    const allowed = canSee(ctx, s.ownerMemberId, s.notesVisibility, s.notesSharedWith);
    return allowed ? { ...s, notesWithheld: false } : { ...s, notes: "", notesWithheld: true };
}

const EMPTY: PeopleState = { people: [], contacts: [], communities: [], giving: [], mentors: [], sessions: [], followUps: [], giftRequests: [] };

/**
 * Strip a person down to what a child may hold: name, photo, birthday and how
 * the family knows them — not where they are. The relationship line is written
 * "how we know them · where they are" ("Ifeoluwa's older sister · Lagos"), so a
 * child keeps the first half and the address half goes with the phone number.
 */
function childSafe(p: Person): Person {
    return {
        ...p,
        relationship: p.relationship.split("·")[0].trim(),
        address: "",
        phone: "",
        email: "",
        notes: "",
        prayerNeeds: "",
        giftIdeas: [],
        anniversary: null,
        cadence: "none",
        lastContactedAt: null,
        sharedObjects: [],
        inviteCode: null,
        redacted: true,
    };
}

/** A community without its contact book, its notes or its money. */
function safeCommunity(c: Community): Community {
    return { ...c, contacts: [], notes: "", givingCommitmentCents: 0, givingFrequency: "none" };
}

export function visibleTo(state: PeopleState, ctx: RepoContext): PeopleState {
    if (ctx.role === "parent") {
        const people = state.people.filter((p) => canSee(ctx, p.ownerMemberId, p.visibility, p.sharedWith));
        const ids = new Set(people.map((p) => p.id));
        const mentors = state.mentors.filter((m) => ids.has(m.personId));
        const mentorIds = new Set(mentors.map((m) => m.id));
        const sessions = state.sessions.filter((s) => mentorIds.has(s.mentorId)).map((s) => readNotes(ctx, s));
        const sessionIds = new Set(sessions.map((s) => s.id));
        return {
            people,
            contacts: state.contacts.filter((c) => ids.has(c.personId)),
            communities: state.communities,
            giving: state.giving,
            mentors,
            sessions,
            followUps: state.followUps.filter((f) => sessionIds.has(f.sessionId)),
            giftRequests: state.giftRequests.filter((g) => ids.has(g.personId)),
        };
    }

    if (ctx.role === "child") {
        // Relatives and friends only, and only the safe columns.
        const people = state.people.filter((p) => (p.kind === "relative" || p.kind === "friend") && (p.visibility === "family" || p.visibility === "child" || (p.visibility === "shared" && p.sharedWith.includes(ctx.me.id)))).map(childSafe);
        const mentors = state.mentors.filter((m) => m.menteeMemberIds.includes(ctx.me.id));
        const mentorIds = new Set(mentors.map((m) => m.id));
        const sessions = state.sessions.filter((s) => mentorIds.has(s.mentorId) && s.participants.includes(ctx.me.id)).map((s) => readNotes(ctx, s));
        const sessionIds = new Set(sessions.map((s) => s.id));
        // A child's mentor's own record stays visible even when they are staff, so the page can name them.
        const mentorPeople = state.people.filter((p) => mentors.some((m) => m.personId === p.id) && !people.some((q) => q.id === p.id)).map(childSafe);
        // Where WE go, not where the family goes: a child sees the communities
        // they are actually part of, so Dad's cycling club and its address are
        // no more theirs to hold than his phone book.
        return {
            ...EMPTY,
            people: [...people, ...mentorPeople],
            communities: state.communities.filter((c) => c.memberIds.includes(ctx.me.id)).map((c) => safeCommunity(c)),
            mentors,
            sessions,
            followUps: state.followUps.filter((f) => sessionIds.has(f.sessionId) && f.memberId === ctx.me.id),
        };
    }

    // Guest: their own record, the communities marked shared, and — a mentor —
    // their own sessions, with notes only where they were explicitly shared.
    // "Shared on purpose" means the name, the rhythm and the place: a guest
    // granted Grace Chapel is not granted its contact book or what the family
    // privately thinks about it, so the community is redacted exactly as a
    // child's is.
    const own = state.people.filter((p) => p.linkedMemberId === ctx.me.id);
    const mentors = state.mentors.filter((m) => m.memberId === ctx.me.id);
    const mentorIds = new Set(mentors.map((m) => m.id));
    const sessions = state.sessions.filter((s) => mentorIds.has(s.mentorId)).map((s) => readNotes(ctx, s));
    // A private session's follow-ups are as private as its notes: the mentor
    // sees that the session happened, not what the family agreed behind it.
    const sessionIds = new Set(sessions.filter((s) => !s.notesWithheld).map((s) => s.id));
    const mentorPeople = state.people.filter((p) => mentors.some((m) => m.personId === p.id) && !own.some((q) => q.id === p.id));
    return {
        ...EMPTY,
        people: [...own, ...mentorPeople],
        communities: state.communities.filter((c) => c.sharedWithGuests).map((c) => safeCommunity(c)),
        mentors,
        sessions,
        followUps: state.followUps.filter((f) => sessionIds.has(f.sessionId)),
    };
}

// ---------------------------------------------------------------------------
// The shared surfaces
// ---------------------------------------------------------------------------

const HREF = "/family/people";
const personHref = (id: string): string => `${HREF}/relatives/${id}`;
const mentorHref = (id: string): string => `${HREF}/mentors/${id}`;
const communityHref = (id: string): string => `${HREF}/communities/${id}`;

const OCCASION_LABEL = { birthday: "Birthday", anniversary: "Anniversary" } as const;

export function dashboard(state: PeopleState, ctx: RepoContext): DashboardContribution {
    const today = ctx.today;
    const agenda: AgendaItem[] = [];
    const attention: AttentionItem[] = [];
    const rings: ProgressRing[] = [];
    const childCards: ChildCard[] = [];

    const soon = occasions(state, today, 30);

    // Today's occasions, whoever is looking.
    for (const o of soon.filter((x) => x.inDays === 0)) {
        agenda.push({
            id: `occasion-${o.key}`,
            moduleId: "people",
            area: "family",
            title: `${o.personName}'s ${o.kind}`,
            meta: o.years ? `${OCCASION_LABEL[o.kind]} · ${o.kind === "birthday" ? `turns ${o.years}` : `${o.years} years`}` : OCCASION_LABEL[o.kind],
            memberId: null,
            at: null,
            done: false,
            href: personHref(o.personId),
            sort: 40,
        });
    }

    // Sessions today.
    for (const s of state.sessions.filter((x) => x.date.slice(0, 10) === today)) {
        const mentor = state.mentors.find((m) => m.id === s.mentorId);
        const who = mentor ? mentorPerson(state, mentor)?.name : undefined;
        agenda.push({
            id: `session-${s.id}`,
            moduleId: "people",
            area: "family",
            title: s.agenda || `Session with ${who ?? "a mentor"}`,
            meta: `Mentor · ${who ?? "session"}`,
            memberId: s.participants[0] ?? null,
            at: s.date,
            done: s.date < new Date().toISOString(),
            href: mentor ? mentorHref(mentor.id) : HREF,
            sort: 60,
        });
    }

    // Follow-ups due today.
    for (const f of state.followUps.filter((x) => !x.done && x.dueAt.slice(0, 10) === today)) {
        agenda.push({
            id: `followup-${f.id}`,
            moduleId: "people",
            area: "family",
            title: f.title,
            meta: "Follow-up · from a mentor session",
            memberId: f.memberId,
            at: f.dueAt,
            done: false,
            href: mentorHref(f.mentorId),
            sort: 70,
        });
    }

    if (ctx.role === "child") {
        const next = soon.filter((o) => o.inDays > 0)[0];
        if (next) {
            childCards.push({
                id: `child-occasion-${next.key}`,
                moduleId: "people",
                area: "family",
                title: `${shortName(next.personName)}'s ${next.kind}`,
                body: next.inDays === 1 ? "Tomorrow — shall we make a card?" : `In ${next.inDays} days. Shall we make a card?`,
                emoji: next.kind === "birthday" ? "🎂" : "💐",
                href: personHref(next.personId),
            });
        }
        for (const m of state.mentors) {
            const n = nextSession(state, m, today);
            const who = mentorPerson(state, m);
            if (!n || !who) continue;
            childCards.push({
                id: `child-mentor-${m.id}`,
                moduleId: "people",
                area: "family",
                title: who.name,
                body: `Next time together: ${shortDate(n.date)}`,
                emoji: m.area === "music" ? "🎹" : m.area === "faith" ? "🕊️" : "⚽",
                href: mentorHref(m.id),
            });
        }
        return { agenda, attention, rings, childCards };
    }

    // Celebrations and what is coming.
    for (const o of soon.filter((x) => x.inDays === 0)) {
        attention.push({
            id: `celebrate-${o.key}`,
            moduleId: "people",
            area: "family",
            tone: "celebrate",
            title: o.kind === "birthday" ? `${o.personName}${o.years ? ` turns ${o.years}` : "'s birthday"} today` : `${o.personName}'s anniversary today`,
            body: "A message is drafted and ready to send.",
            href: personHref(o.personId),
            weight: 72,
        });
    }
    const upcoming = soon.filter((o) => o.inDays > 0 && o.inDays <= 7);
    if (upcoming.length) {
        attention.push({
            id: "occasions-week",
            moduleId: "people",
            area: "family",
            tone: "info",
            title: upcoming.length === 1 ? `${upcoming[0].personName}'s ${upcoming[0].kind} is ${upcoming[0].inDays === 1 ? "tomorrow" : `in ${upcoming[0].inDays} days`}` : `${upcoming.length} birthdays and anniversaries this week`,
            body: upcoming.map((o) => `${shortName(o.personName)} · ${shortDate(o.date)}`).join(" · "),
            href: HREF,
            weight: 44,
        });
    }

    if (ctx.role === "parent") {
        // Overdue cadence — Needs attention, refreshed weekly (see nudges below).
        const overdue = overdueContacts(state, today);
        if (overdue.length) {
            const worst = overdue[0];
            attention.push({
                id: "cadence-overdue",
                moduleId: "people",
                area: "family",
                tone: "warn",
                title: overdue.length === 1 ? `You haven't spoken to ${worst.person.name} in a while` : `${overdue.length} people you meant to stay in touch with`,
                body: overdue
                    .slice(0, 3)
                    .map((o) => `${shortName(o.person.name)} · ${o.status.daysSince === null ? "never logged" : `${o.status.daysSince} days ago`}`)
                    .join(" · "),
                href: HREF,
                weight: 58,
            });
        }

        const late = state.followUps.filter((f) => !f.done && f.dueAt.slice(0, 10) < today);
        if (late.length) {
            attention.push({
                id: "followups-overdue",
                moduleId: "people",
                area: "family",
                tone: "danger",
                title: late.length === 1 ? `Follow-up overdue: ${late[0].title}` : `${late.length} mentor follow-ups are overdue`,
                body: "Agreed in a session and still open.",
                href: mentorHref(late[0].mentorId),
                weight: 64,
            });
        }

        const pending = state.giftRequests.filter((g) => g.status === "pending");
        if (pending.length) {
            attention.push({
                id: "gift-requests",
                moduleId: "people",
                area: "family",
                tone: "info",
                title: pending.length === 1 ? `Gift waiting on a decision: ${pending[0].title}` : `${pending.length} gifts waiting on a decision`,
                body: pending.map((g) => `${g.title} for ${g.forPersonName} · ${money(g.estCents, ctx.space.currency)}`).join(" · "),
                href: personHref(pending[0].personId),
                weight: 30,
            });
        }

        const due = givingLines(state, today).filter((l) => l.outstandingCents > 0);
        if (due.length) {
            attention.push({
                id: "giving-due",
                moduleId: "people",
                area: "family",
                tone: "warn",
                title: due.length === 1 ? `${due[0].community.name}: this month's giving isn't recorded` : `${due.length} giving commitments aren't recorded this month`,
                body: due.map((l) => `${l.community.name} · ${money(l.outstandingCents, ctx.space.currency)} outstanding`).join(" · "),
                href: communityHref(due[0].community.id),
                weight: 36,
            });
        }

        const touch = inTouchPct(state, today);
        if (touch.total) {
            rings.push({
                id: "in-touch",
                moduleId: "people",
                area: "family",
                label: "Staying in touch",
                pct: touch.pct,
                sub: `${touch.kept} of ${touch.total} people current`,
                href: HREF,
            });
        }
    }

    return { agenda, attention, rings, childCards };
}

export function nudges(state: PeopleState, ctx: RepoContext): Nudge[] {
    if (ctx.role !== "parent") return [];
    const today = ctx.today;
    const out: Nudge[] = [];

    for (const o of occasions(state, today, 8)) {
        const person = state.people.find((p) => p.id === o.personId);
        if (!person) continue;
        const draft = draftMessage(person, o.kind, ctx.space, o.years);
        const label = o.kind === "birthday" ? "birthday" : "anniversary";
        if (o.inDays <= 7 && o.inDays > 1) {
            out.push({
                key: `people-occasion-7-${o.key}`,
                moduleId: "people",
                kind: "family",
                title: `${o.personName}'s ${label} is in ${o.inDays} days`,
                body: `${shortDate(o.date)}${o.years ? ` · ${o.kind === "birthday" ? `turning ${o.years}` : `${o.years} years`}` : ""}. Draft ready: "${draft.slice(0, 120)}…"`,
                href: personHref(o.personId),
                memberIds: [],
            });
        }
        if (o.inDays <= 1 && o.inDays >= 0) {
            out.push({
                key: `people-occasion-1-${o.key}`,
                moduleId: "people",
                kind: "celebrate",
                title: o.inDays === 0 ? `Today: ${o.personName}'s ${label}` : `Tomorrow: ${o.personName}'s ${label}`,
                body: `Draft ready: "${draft.slice(0, 140)}…"`,
                href: personHref(o.personId),
                memberIds: [],
            });
        }
    }

    // The brief's Needs attention list and its acceptance criteria disagreed on
    // whether an overdue cadence is a rule; it is — and it is a WEEKLY one, so
    // the key carries the week and the reminder comes back each Monday rather
    // than being raised once and forgotten.
    const week = weekStart(today);
    for (const { person, status } of overdueContacts(state, today)) {
        out.push({
            key: `people-cadence-${person.id}-${week}`,
            moduleId: "people",
            kind: "family",
            title: `Call ${shortName(person.name)}?`,
            body: status.daysSince === null ? `${CADENCE[person.cadence].label.toLowerCase()} — nothing logged yet.` : `${CADENCE[person.cadence].label} · last spoke ${status.daysSince} days ago.`,
            href: personHref(person.id),
            memberIds: [],
        });
    }

    for (const s of state.sessions) {
        const inDays = dayDiff(today, s.date);
        if (inDays < 0 || inDays > 2 || !s.questionsBeforeNext.length) continue;
        const mentor = state.mentors.find((m) => m.id === s.mentorId);
        out.push({
            key: `people-session-prep-${s.id}`,
            moduleId: "people",
            kind: "family",
            title: `Prepare for ${mentor ? mentorPerson(state, mentor)?.name ?? "your session" : "your session"}`,
            body: s.questionsBeforeNext.slice(0, 2).join(" · "),
            href: mentor ? mentorHref(mentor.id) : HREF,
            memberIds: s.participants,
        });
    }

    for (const f of state.followUps.filter((x) => !x.done && dayDiff(today, x.dueAt) < 0)) {
        out.push({
            key: `people-followup-${f.id}`,
            moduleId: "people",
            kind: "task",
            title: `Overdue follow-up: ${f.title}`,
            body: "You agreed this in a mentor session.",
            href: mentorHref(f.mentorId),
            memberIds: f.memberId ? [f.memberId] : [],
        });
    }

    return out;
}

export function aiContext(state: PeopleState, ctx: RepoContext): string {
    const parts: string[] = [];
    const soon = occasions(state, ctx.today, 45).slice(0, 8);
    if (soon.length) {
        parts.push(`Upcoming: ${soon.map((o) => `${o.personName} ${o.kind} ${shortDate(o.date)}${o.years ? ` (${o.kind === "birthday" ? `turning ${o.years}` : `${o.years} yrs`})` : ""}`).join("; ")}.`);
    }
    if (state.communities.length) {
        parts.push(`Communities: ${state.communities.map((c) => `${c.name} (${c.type}, ${c.meetingRhythm})`).join("; ")}.`);
    }
    if (state.mentors.length) {
        parts.push(
            `Mentors: ${state.mentors
                .map((m) => {
                    const p = mentorPerson(state, m);
                    const n = nextSession(state, m, ctx.today);
                    return `${p?.name ?? "unknown"} (${m.area}${n ? `, next ${shortDate(n.date)}` : ""})`;
                })
                .join("; ")}.`,
        );
    }
    if (ctx.role === "parent") {
        const od = overdueContacts(state, ctx.today);
        if (od.length) parts.push(`Not contacted lately: ${od.map((o) => `${o.person.name} (${o.status.daysSince ?? "never"} days)`).join("; ")}.`);
        const open = openFollowUps(state).slice(0, 5);
        if (open.length) parts.push(`Open follow-ups: ${open.map((f) => f.title).join("; ")}.`);
        const prayer = state.people.filter((p) => p.prayerNeeds).slice(0, 6);
        if (prayer.length) parts.push(`Prayer needs: ${prayer.map((p) => `${p.name} — ${p.prayerNeeds}`).join("; ")}.`);
        parts.push(`People tracked: ${state.people.length}.`);
    }
    return parts.join(" ").slice(0, 1500);
}

export function search(state: PeopleState, q: string): Array<{ title: string; meta: string; href: string }> {
    const n = q.toLowerCase();
    const hit = (s: string): boolean => s.toLowerCase().includes(n);
    const out: Array<{ title: string; meta: string; href: string }> = [];
    for (const p of state.people) {
        if (hit(p.name) || hit(p.relationship) || p.tags.some(hit) || hit(p.notes)) out.push({ title: p.name, meta: `People · ${p.relationship || p.kind}`, href: personHref(p.id) });
    }
    for (const c of state.communities) {
        if (hit(c.name) || hit(c.meetingRhythm) || hit(c.meetsWhere)) out.push({ title: c.name, meta: `Community · ${c.meetingRhythm}`, href: communityHref(c.id) });
    }
    for (const s of state.sessions) {
        if (hit(s.agenda) || (!s.notesWithheld && hit(s.notes))) {
            const mentor = state.mentors.find((m) => m.id === s.mentorId);
            out.push({ title: s.agenda || "Mentor session", meta: `Session · ${mentor ? mentorPerson(state, mentor)?.name ?? "mentor" : "mentor"} · ${shortDate(s.date)}`, href: mentor ? mentorHref(mentor.id) : HREF });
        }
    }
    return out.slice(0, 8);
}
