import type { ModuleRepo, Visibility } from "@/data/core";

/**
 * Family calendar — what is happening, for whom, when.
 *
 * The calendar owns exactly one kind of row: an EVENT. Everything else it
 * draws — a task's deadline, a milestone, a lesson assignment, a bill, a trip,
 * a birthday — is an OVERLAY: a live reference read from another module's
 * loaded slice at render time and never copied here. That is the whole point
 * of the design: delete the task and its deadline leaves the calendar in the
 * same breath, because the calendar never held a second copy of it.
 *
 * Three small satellites hang off the event:
 *   ATTENDEES  who it is for, and whether they are required (the conflict
 *              warning and the "find an evening" search both read this).
 *   RSVPS      one answer per member per event — the only write a guest has.
 *   ICS TOKENS a subscribable feed per member or for the whole space, which a
 *              parent can revoke; revoking it stops the feed on the spot.
 *
 * Privacy is per row (`visibility` + `sharedWith` + `childSafe`) and is applied
 * once, in `derive.visibleTo()`, which BOTH repos run before anybody sees
 * state — so a child genuinely never receives date night, and a guest
 * genuinely never receives anything they were not invited to.
 */

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

/** What kind of thing is in the diary — the filter a family actually thinks in. */
export type EventKind = "event" | "school" | "church" | "appointment" | "deadline" | "birthday" | "trip";

export const EVENT_KIND: Record<EventKind, { label: string; emoji: string }> = {
    event: { label: "Event", emoji: "📅" },
    school: { label: "School", emoji: "🎒" },
    church: { label: "Church", emoji: "⛪" },
    appointment: { label: "Appointment", emoji: "🩺" },
    deadline: { label: "Deadline", emoji: "⏳" },
    birthday: { label: "Birthday", emoji: "🎂" },
    trip: { label: "Trip", emoji: "✈️" },
};

export const EVENT_KINDS: EventKind[] = ["event", "school", "church", "appointment", "deadline", "birthday", "trip"];

/** How an event repeats. Small enough that a person can read it aloud. */
export type RecurFreq = "weekly" | "fortnightly" | "monthly";

export const RECUR_LABEL: Record<RecurFreq, string> = {
    weekly: "Every week",
    fortnightly: "Every two weeks",
    monthly: "Every month",
};

export interface RecurRule {
    freq: RecurFreq;
    /** 0–6 (Sunday = 0) for weekly/fortnightly rules; null follows the start date. */
    weekday: number | null;
    /** 1–28 for monthly rules; null follows the start date. */
    monthDay: number | null;
    /** ISO date the repetition stops on, or null for "until we say otherwise". */
    until: string | null;
}

/** Who is on an event, and whether the event needs them. */
export interface EventAttendee {
    memberId: string;
    required: boolean;
}

export type RsvpResponse = "yes" | "no" | "maybe";

export const RSVP_LABEL: Record<RsvpResponse, string> = { yes: "Going", no: "Can't make it", maybe: "Maybe" };

/** The reminder offsets a family actually uses, in minutes before the start. */
export const REMINDER_CHOICES: Array<{ minutes: number | null; label: string }> = [
    { minutes: null, label: "No reminder" },
    { minutes: 15, label: "15 minutes before" },
    { minutes: 60, label: "1 hour before" },
    { minutes: 180, label: "3 hours before" },
    { minutes: 1440, label: "The day before" },
];

// ---------------------------------------------------------------------------
// The event
// ---------------------------------------------------------------------------

export interface CalEvent {
    id: string;
    spaceId: string;
    title: string;
    notes: string;
    /** ISO datetime. For an all-day event only the date half matters. */
    startAt: string;
    /** ISO datetime; the same day for a one-hour meeting, later for a span. */
    endAt: string;
    allDay: boolean;
    location: string;
    kind: EventKind;
    /** Empty = the whole family. */
    attendees: EventAttendee[];
    /** Whose colour the block wears; null = the family's area colour. */
    colourMemberId: string | null;
    rrule: RecurRule | null;
    /** Minutes before the start, or null for no reminder. */
    reminderMinutes: number | null;
    /** A community from the People module ("Grace Chapel"), by id. */
    communityId: string | null;
    /** A trip from Travel; when Travel also renders it, the overlay defers to this row. */
    tripId: string | null;
    coverUrl: string | null;
    visibility: Visibility;
    sharedWith: string[];
    /** A family event the children may see. */
    childSafe: boolean;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

export interface Rsvp {
    id: string;
    eventId: string;
    memberId: string;
    response: RsvpResponse;
    note: string;
    at: string;
}

export type IcsScope = "member" | "space";

/**
 * A subscribable feed. The token is the secret in the URL; `revokedAt` is the
 * off switch, and it is checked on every fetch, so revoking stops the feed
 * immediately rather than at the next refresh.
 */
export interface IcsToken {
    id: string;
    spaceId: string;
    /** Null for a whole-space feed. */
    memberId: string | null;
    token: string;
    scope: IcsScope;
    label: string;
    createdAt: string;
    revokedAt: string | null;
    /** When a client last pulled it (the demo records the last export). */
    lastSyncedAt: string | null;
}

/** A week the family has confirmed at Sunday planning. */
export interface WeekPlan {
    /** Monday-anchored ISO date. */
    weekStart: string;
    confirmedBy: string;
    confirmedAt: string;
    note: string;
}

export interface CalendarState {
    events: CalEvent[];
    rsvps: Rsvp[];
    tokens: IcsToken[];
    weeks: WeekPlan[];
}

export const EMPTY_STATE: CalendarState = { events: [], rsvps: [], tokens: [], weeks: [] };

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export interface NewEventInput {
    title: string;
    notes?: string;
    startAt: string;
    endAt?: string;
    allDay?: boolean;
    location?: string;
    kind?: EventKind;
    attendees?: EventAttendee[];
    colourMemberId?: string | null;
    rrule?: RecurRule | null;
    reminderMinutes?: number | null;
    communityId?: string | null;
    tripId?: string | null;
    coverUrl?: string | null;
    visibility?: Visibility;
    sharedWith?: string[];
    childSafe?: boolean;
}

export type EventPatch = Partial<Omit<CalEvent, "id" | "spaceId" | "createdBy" | "createdAt">>;

export interface CalendarRepo extends ModuleRepo<CalendarState> {
    createEvent(input: NewEventInput): Promise<CalEvent>;
    updateEvent(id: string, patch: EventPatch): Promise<void>;
    removeEvent(id: string): Promise<void>;
    /** Drag on the week grid: keep the duration, move the start. */
    moveEvent(id: string, startAt: string): Promise<void>;
    /** Answer for myself (a guest's only write), or for a child as a parent. */
    setRsvp(eventId: string, response: RsvpResponse, memberId?: string, note?: string): Promise<Rsvp>;
    clearRsvp(eventId: string, memberId?: string): Promise<void>;

    createToken(scope: IcsScope, memberId: string | null, label?: string): Promise<IcsToken>;
    revokeToken(id: string): Promise<void>;
    /** Records that a client pulled the feed — what "reflects changes" is measured against. */
    touchToken(id: string): Promise<void>;

    /** Sunday planning: the family says next week is right. */
    confirmWeek(weekStart: string, note?: string): Promise<void>;
    unconfirmWeek(weekStart: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// What the calendar reads from other modules
// ---------------------------------------------------------------------------

/**
 * Overlays are LIVE references, so these shapes are deliberately loose and
 * structural: the calendar reads another module's loaded slice through
 * `useModuleState`, never its repo, and never imports its types — which is
 * also why a module that has not shipped yet simply contributes nothing
 * instead of breaking the grid.
 */
export interface TasksSlice {
    tasks?: Array<{
        id: string;
        title: string;
        dueAt?: string | null;
        allDay?: boolean;
        assigneeMemberIds?: string[];
        status?: string;
        isChore?: boolean;
        goalLabel?: string;
        milestoneLabel?: string;
        kind?: string;
    }>;
}

export interface GoalsSlice {
    goals?: Array<{ id: string; title: string; childSafeSummary?: string; targetDate?: string; status?: string }>;
    milestones?: Array<{ id: string; goalId: string; title: string; due?: string | null; done?: boolean }>;
}

export interface TravelSlice {
    trips?: Array<{
        id: string;
        title?: string;
        name?: string;
        destination?: string;
        startDate?: string | null;
        endDate?: string | null;
        startAt?: string | null;
        endAt?: string | null;
        memberIds?: string[];
        travellerMemberIds?: string[];
        status?: string;
    }>;
    /** Who is going, when the module keeps them in their own list. */
    travellers?: Array<{ tripId: string; memberId: string }>;
}

export interface FinanceSlice {
    bills?: Array<{
        id: string;
        name?: string;
        title?: string;
        dueDate?: string;
        dueAt?: string;
        dueDay?: number;
        amountCents?: number;
        paid?: boolean;
        status?: string;
    }>;
}

export interface CurriculaSlice {
    assignments?: Array<{ id: string; title: string; dueDate?: string; childMemberId?: string; status?: string; subjectId?: string }>;
}

/**
 * People, read the same structural way as every other module: birthdays,
 * anniversaries and mentor sessions are FACTS about a person, so the calendar
 * reads them from People's loaded slice and never stores a birthday of its own
 * (AC 8). Nothing here imports People's code — if People renames a field the
 * rows quietly stop appearing instead of breaking the build.
 */
export interface PeopleSlice {
    people?: Array<{ id: string; name: string; birthday?: string | null; anniversary?: string | null }>;
    communities?: Array<{ id: string; name: string }>;
    mentors?: Array<{ id: string; personId: string }>;
    sessions?: Array<{ id: string; mentorId: string; date: string; agenda?: string; participants?: string[] }>;
}

/** One row the calendar draws from that slice. */
export interface PeopleEntry {
    id: string;
    title: string;
    at: string;
    allDay: boolean;
    kind: "birthday" | "anniversary" | "session";
    meta: string;
    href: string;
    memberIds: string[];
}
