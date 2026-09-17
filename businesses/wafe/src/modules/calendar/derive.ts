import type { AgendaItem, Area, AttentionItem, Capability, ChildCard, DashboardContribution, Member, Nudge, RepoContext, Role } from "@/data/core";
import { isoDate, shortDate, time } from "@/lib/format";
import {
    EVENT_KIND,
    type CalEvent,
    type CalendarState,
    type CurriculaSlice,
    type EventKind,
    type FinanceSlice,
    type GoalsSlice,
    type IcsToken,
    type PeopleEntry,
    type PeopleSlice,
    type Rsvp,
    type RsvpResponse,
    type TasksSlice,
    type TravelSlice,
} from "./types";

/**
 * Everything the calendar screens show, as pure functions of state.
 *
 * Three ideas do all the work here:
 *
 *   VISIBILITY  `visibleTo` is the one filter both repos run. A child receives
 *               only events they are on or that are family + child-safe; a
 *               guest receives only events they were invited to. Nothing is
 *               hidden with CSS.
 *   OCCURRENCES a recurring event is ONE row; the grids ask for the window
 *               they are drawing and get the occurrences inside it.
 *   ENTRIES     an occurrence and an overlay (a task deadline, a trip, a
 *               birthday) are rendered by the same code, so a deadline that
 *               disappears from Tasks disappears from the week grid with it.
 */

export const HREF = "/execute/calendar";
export const eventHref = (id: string): string => `${HREF}/${id}`;

const MS_MIN = 60000;
const MS_DAY = 86400000;

// ---------------------------------------------------------------------------
// Small date helpers, local-time throughout (a family lives in local time)
// ---------------------------------------------------------------------------

/**
 * The local calendar date of an ISO date or datetime.
 *
 * A bare "2026-09-06" is already the day a family means. A datetime is NOT:
 * slicing "2026-09-05T23:00:00.000Z" would call it the 5th, when in Lagos (or
 * anywhere east of Greenwich) it is the morning of the 6th — which is how an
 * all-day event ends up one day long in the grid and two in its label. Every
 * date helper in this module goes through here, so they all agree.
 */
export const localDay = (iso: string): string => (iso.length > 10 ? isoDate(iso) : iso.slice(0, 10));

/** Local midnight for an ISO date (YYYY-MM-DD) or datetime. */
export const startOfDay = (iso: string): Date => new Date(`${localDay(iso)}T00:00:00`);

export const addDaysIso = (iso: string, days: number): string => {
    const d = startOfDay(iso);
    d.setDate(d.getDate() + days);
    return isoDate(d);
};

/** Whole days from a → b (negative when b is earlier). */
export const dayDiff = (a: string, b: string): number => Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / MS_DAY);

/** Monday-anchored week start for an ISO date. */
export function weekStartOf(iso: string): string {
    const d = startOfDay(iso);
    const back = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - back);
    return isoDate(d);
}

/** The seven ISO dates of the week containing `iso`. */
export const weekDays = (iso: string): string[] => {
    const start = weekStartOf(iso);
    return Array.from({ length: 7 }, (_, i) => addDaysIso(start, i));
};

/** Six Monday-anchored rows covering the month containing `iso`. */
export function monthMatrix(iso: string): string[][] {
    const d = startOfDay(iso);
    const first = isoDate(new Date(d.getFullYear(), d.getMonth(), 1));
    const start = weekStartOf(first);
    return Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, i) => addDaysIso(start, w * 7 + i)));
}

export const dayRange = (from: string, days: number): string[] => Array.from({ length: Math.max(0, days) }, (_, i) => addDaysIso(from, i));

export const monthLabel = (iso: string): string => startOfDay(iso).toLocaleDateString("en-GB", { month: "long", year: "numeric" });

export const dayLabel = (iso: string, today: string): string => {
    const diff = dayDiff(today, iso);
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff === -1) return "Yesterday";
    return startOfDay(iso).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
};

/** "09:30 – 12:30", or "All day". */
export function whenLabel(entry: { startAt: string; endAt: string; allDay: boolean }): string {
    if (entry.allDay) {
        const days = dayDiff(entry.startAt, entry.endAt);
        return days > 0 ? `All day · ${days + 1} days` : "All day";
    }
    const from = time(entry.startAt);
    const to = time(entry.endAt);
    return from === to ? from : `${from} – ${to}`;
}

// ---------------------------------------------------------------------------
// Visibility — the one filter both repos run
// ---------------------------------------------------------------------------

/**
 * The name a family says out loud. A bare first token turns "Mama Fọláké"
 * into "Mama", which is how you can tell software wrote the sentence.
 */
const HONORIFIC = new Set(["mama", "baba", "aunty", "aunt", "uncle", "pastor", "mr", "mrs", "ms", "miss", "dr", "grandma", "grandpa", "coach"]);

export function shortName(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length > 1 && HONORIFIC.has(parts[0].toLowerCase().replace(/\./g, ""))) return `${parts[0]} ${parts[1]}`;
    return parts[0] ?? name;
}

/** "Ifeoluwa, Ayo and Mama Fọláké". */
export function nameList(names: string[]): string {
    if (names.length <= 1) return names[0] ?? "";
    return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export const attendeeIds = (ev: CalEvent): string[] => ev.attendees.map((a) => a.memberId);

export const isAttendee = (ev: CalEvent, memberId: string): boolean => ev.attendees.some((a) => a.memberId === memberId);

/** A family event with nobody named is for everybody. */
export const isForEveryone = (ev: CalEvent): boolean => ev.attendees.length === 0;

function parentCanSee(ctx: RepoContext, ev: CalEvent): boolean {
    if (ev.createdBy === ctx.me.id) return true;
    if (ev.visibility === "private") return isAttendee(ev, ctx.me.id);
    if (ev.visibility === "shared") return ev.sharedWith.includes(ctx.me.id) || isAttendee(ev, ctx.me.id);
    return true;
}

/**
 * AC 3 — a child sees only events they are on, or family events marked
 * child-safe. AC 5 — a guest sees only events they were invited to (plus the
 * ones they added themselves, which a granted grandmother may do).
 */
export function canSeeEvent(ctx: RepoContext, ev: CalEvent): boolean {
    if (ctx.role === "parent") return parentCanSee(ctx, ev);
    if (ev.createdBy === ctx.me.id) return true;
    if (isAttendee(ev, ctx.me.id)) return true;
    if (ctx.role === "child") return (ev.visibility === "child" || (ev.visibility === "family" && ev.childSafe)) && (isForEveryone(ev) || isAttendee(ev, ctx.me.id));
    return ev.visibility === "shared" && ev.sharedWith.includes(ctx.me.id);
}

/** The state this member may hold — run by the local repo and the live one. */
export function visibleTo(state: CalendarState, ctx: RepoContext): CalendarState {
    const events = state.events.filter((ev) => canSeeEvent(ctx, ev));
    const ids = new Set(events.map((e) => e.id));
    const parent = ctx.role === "parent";
    return {
        events,
        // Who is coming is not a secret from the people who are coming.
        rsvps: state.rsvps.filter((r) => ids.has(r.eventId)),
        // A feed is a credential: parents see every feed, everyone else only their own.
        tokens: state.tokens.filter((t) => parent || t.memberId === ctx.me.id),
        weeks: state.weeks,
    };
}

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

/**
 * Who is asking. A `RepoContext` and the `useSpace()` value both satisfy it,
 * so the repos and the screens answer these questions the same way.
 */
export interface Actor {
    me: Member;
    role: Role;
    can: (c: Capability) => boolean;
}

/** Who may put something in the diary at all: parents, granted members, and children for themselves. */
export const canCreateEvent = (actor: Actor): boolean => actor.role === "parent" || actor.can("calendar.manage") || actor.role === "child";

/**
 * AC 4 — a Young adult can edit events they created. A parent edits anything;
 * anybody else edits only their own.
 *
 * Whoever put a thing in the diary can take it back out, whatever their age
 * band: letting a nine-year-old add football practice and then never letting
 * him move it is a dead end, not a safeguard — and it is his own row, on his
 * own calendar. A parent still sees, edits and deletes everything.
 */
export function canEditEvent(ev: CalEvent, actor: Actor): boolean {
    if (actor.role === "parent") return true;
    return ev.createdBy === actor.me.id;
}

/**
 * Who gets the whole diary's furniture — the stats, the member chips, the
 * overlay toggles, the feeds and the message reader.
 *
 * A guest never does, even the granted grandmother who may add the things she
 * hosts: her door into the calendar is the handful of things she was invited
 * to, and a family-wide filter bar would say otherwise.
 */
export const hasFullView = (actor: Actor): boolean => actor.role !== "guest" && (actor.role === "parent" || actor.can("calendar.manage"));

/** A member may answer for themselves; a parent may answer for a child. */
export function canRsvp(ev: CalEvent, actor: Actor, memberId: string): boolean {
    if (!isAttendee(ev, memberId)) return false;
    return memberId === actor.me.id || actor.role === "parent";
}

// ---------------------------------------------------------------------------
// Occurrences — one row, many days
// ---------------------------------------------------------------------------

export interface Occurrence {
    /** Stable across renders: "<eventId>@<date>". */
    id: string;
    event: CalEvent;
    startAt: string;
    endAt: string;
}

const MAX_STEPS = 400;

/** Every occurrence of one event that touches [fromDate, toDate]. */
export function expandEvent(ev: CalEvent, fromDate: string, toDate: string): Occurrence[] {
    const out: Occurrence[] = [];
    const start = new Date(ev.startAt);
    const durMs = Math.max(0, new Date(ev.endAt).getTime() - start.getTime());
    const rangeStart = startOfDay(fromDate).getTime();
    const rangeEnd = startOfDay(toDate).getTime() + MS_DAY - 1;

    const push = (d: Date): void => {
        const s = d.getTime();
        const e = s + durMs;
        if (e < rangeStart || s > rangeEnd) return;
        out.push({ id: `${ev.id}@${isoDate(d)}`, event: ev, startAt: new Date(s).toISOString(), endAt: new Date(e).toISOString() });
    };

    if (!ev.rrule) {
        push(start);
        return out;
    }

    const until = ev.rrule.until ? startOfDay(ev.rrule.until).getTime() + MS_DAY - 1 : null;
    const stepDays = ev.rrule.freq === "weekly" ? 7 : ev.rrule.freq === "fortnightly" ? 14 : 0;
    const cursor = new Date(start);
    for (let i = 0; i < MAX_STEPS; i++) {
        const t = cursor.getTime();
        if (t > rangeEnd) break;
        if (until !== null && t > until) break;
        push(new Date(cursor));
        if (stepDays) cursor.setDate(cursor.getDate() + stepDays);
        else cursor.setMonth(cursor.getMonth() + 1);
    }
    return out;
}

export function occurrencesBetween(events: CalEvent[], fromDate: string, toDate: string): Occurrence[] {
    const out: Occurrence[] = [];
    for (const ev of events) out.push(...expandEvent(ev, fromDate, toDate));
    return out.sort((a, b) => (a.startAt < b.startAt ? -1 : a.startAt > b.startAt ? 1 : 0));
}

// ---------------------------------------------------------------------------
// Entries — occurrences and overlays, drawn by the same code
// ---------------------------------------------------------------------------

export type EntrySource = "calendar" | "tasks" | "goals" | "travel" | "finance" | "curricula" | "people";

export interface Entry {
    id: string;
    source: EntrySource;
    /** Set for a real calendar row; null for every overlay. */
    eventId: string | null;
    title: string;
    /** "Co-op · Tobi, Ayo", "Task · due", "Trip". */
    meta: string;
    location: string;
    startAt: string;
    endAt: string;
    allDay: boolean;
    /** Empty = the whole family. */
    memberIds: string[];
    colourMemberId: string | null;
    kind: EventKind;
    area: Area;
    href: string;
    /** True for overlays: they are edited where they live. */
    readOnly: boolean;
    done: boolean;
}

const SOURCE_AREA: Record<EntrySource, Area> = {
    calendar: "execute",
    tasks: "execute",
    goals: "execute",
    travel: "live",
    finance: "live",
    curricula: "grow",
    people: "family",
};

export const SOURCE_LABEL: Record<EntrySource, string> = {
    calendar: "Calendar",
    tasks: "Task",
    goals: "Milestone",
    travel: "Trip",
    finance: "Bill",
    curricula: "Assignment",
    people: "People",
};

export function entryOf(o: Occurrence, members: Member[]): Entry {
    const ev = o.event;
    const named = ev.attendees.map((a) => members.find((m) => m.id === a.memberId)?.name).filter(Boolean).map((x) => shortName(x as string));
    const who = named.length ? nameList(named) : "Everyone";
    return {
        id: o.id,
        source: "calendar",
        eventId: ev.id,
        title: ev.title,
        meta: `${EVENT_KIND[ev.kind].label} · ${who}`,
        location: ev.location,
        startAt: o.startAt,
        endAt: o.endAt,
        allDay: ev.allDay,
        memberIds: attendeeIds(ev),
        colourMemberId: ev.colourMemberId,
        kind: ev.kind,
        area: "execute",
        href: eventHref(ev.id),
        readOnly: false,
        done: new Date(o.endAt).getTime() < Date.now(),
    };
}

function overlay(input: Omit<Entry, "source" | "eventId" | "area" | "readOnly"> & { source: EntrySource }): Entry {
    return { ...input, eventId: null, area: SOURCE_AREA[input.source], readOnly: true };
}

const allDayAt = (date: string): { startAt: string; endAt: string } => {
    const s = startOfDay(date);
    const e = new Date(s.getTime() + MS_DAY - MS_MIN);
    return { startAt: s.toISOString(), endAt: e.toISOString() };
};

// ---------------------------------------------------------------------------
// People — birthdays, anniversaries and mentor sessions, read structurally
// ---------------------------------------------------------------------------

/** The next time a birthday or anniversary comes round, as an ISO date. */
const nextOccurrence = (dateIso: string, from: string): string => {
    const md = dateIso.slice(5, 10);
    const year = Number(from.slice(0, 4));
    const thisYear = `${year}-${md}`;
    return thisYear >= from ? thisYear : `${year + 1}-${md}`;
};

/**
 * What People puts in the diary, derived from People's own loaded slice.
 *
 * A birthday is not a row somebody has to remember to create: it is a fact
 * about a person, so the calendar READS it and never keeps a copy (AC 8). The
 * slice arrives through `useModuleState("people")` — the calendar imports no
 * People code, so People is free to change without breaking this build, and a
 * family who has not opened People simply has no birthdays on the grid.
 */
export function peopleEntries(slice: PeopleSlice | undefined, fromDate: string, toDate: string): PeopleEntry[] {
    if (!slice) return [];
    const out: PeopleEntry[] = [];

    for (const p of slice.people ?? []) {
        for (const kind of ["birthday", "anniversary"] as const) {
            const raw = kind === "birthday" ? p.birthday : p.anniversary;
            if (!raw) continue;
            const date = nextOccurrence(raw, fromDate);
            if (date < fromDate || date > toDate) continue;
            const born = Number(raw.slice(0, 4));
            const years = born && born >= 1900 ? Number(date.slice(0, 4)) - born : undefined;
            out.push({
                id: `${p.id}:${kind}:${date}`,
                title: kind === "birthday" ? `${p.name}'s birthday` : `${p.name}'s anniversary`,
                at: date,
                allDay: true,
                kind,
                meta: years ? (kind === "birthday" ? `Turns ${years}` : `${years} years`) : kind === "birthday" ? "Birthday" : "Anniversary",
                href: `/family/people/relatives/${p.id}`,
                memberIds: [],
            });
        }
    }

    for (const s of slice.sessions ?? []) {
        const date = localDay(s.date);
        if (date < fromDate || date > toDate) continue;
        const mentor = (slice.mentors ?? []).find((m) => m.id === s.mentorId);
        const who = mentor ? (slice.people ?? []).find((p) => p.id === mentor.personId)?.name : undefined;
        out.push({
            id: `session-${s.id}`,
            title: s.agenda || `Session with ${who ?? "a mentor"}`,
            at: s.date,
            allDay: false,
            kind: "session",
            meta: who ? `Mentor · ${who}` : "Mentor session",
            href: mentor ? `/family/people/mentors/${mentor.id}` : "/family/people",
            memberIds: s.participants ?? [],
        });
    }

    return out.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
}

export interface OverlaySources {
    tasks?: TasksSlice;
    goals?: GoalsSlice;
    travel?: TravelSlice;
    finance?: FinanceSlice;
    curricula?: CurriculaSlice;
    /** Derived from People's loaded slice by `peopleEntries` — never stored here (AC 8). */
    people?: PeopleEntry[];
}

/**
 * The live references. Nothing here is stored: every one of these rows is read
 * from another module's loaded slice, so deleting the task deletes the
 * deadline (AC 1) and People owns every birthday (AC 8).
 */
export function overlayEntries(sources: OverlaySources, fromDate: string, toDate: string): Entry[] {
    const out: Entry[] = [];
    const inRange = (date: string): boolean => date >= fromDate && date <= toDate;

    for (const t of sources.tasks?.tasks ?? []) {
        if (!t.dueAt) continue;
        const date = isoDate(t.dueAt);
        if (!inRange(date)) continue;
        const timed = t.allDay === false;
        const span = timed ? { startAt: new Date(t.dueAt).toISOString(), endAt: new Date(new Date(t.dueAt).getTime() + 30 * MS_MIN).toISOString() } : allDayAt(date);
        out.push(
            overlay({
                id: `task-${t.id}`,
                source: "tasks",
                title: t.title,
                meta: t.isChore ? "Chore · due" : t.goalLabel ? `Task · ${t.goalLabel}` : "Task · due",
                location: "",
                ...span,
                allDay: !timed,
                memberIds: t.assigneeMemberIds ?? [],
                colourMemberId: t.assigneeMemberIds?.[0] ?? null,
                kind: "deadline",
                href: `/execute/tasks/${t.id}`,
                done: t.status === "done",
            }),
        );
    }

    const goalTitle = (goalId: string): string => sources.goals?.goals?.find((g) => g.id === goalId)?.title ?? "";
    for (const m of sources.goals?.milestones ?? []) {
        if (!m.due) continue;
        const date = isoDate(m.due);
        if (!inRange(date)) continue;
        out.push(
            overlay({
                id: `milestone-${m.id}`,
                source: "goals",
                title: m.title,
                meta: goalTitle(m.goalId) ? `Milestone · ${goalTitle(m.goalId)}` : "Milestone",
                location: "",
                ...allDayAt(date),
                allDay: true,
                memberIds: [],
                colourMemberId: null,
                kind: "deadline",
                href: `/execute/goals/${m.goalId}`,
                done: Boolean(m.done),
            }),
        );
    }

    for (const t of sources.travel?.trips ?? []) {
        const from = localDay(t.startDate ?? t.startAt ?? "");
        const to = localDay(t.endDate ?? t.endAt ?? from);
        if (!from) continue;
        if (to < fromDate || from > toDate) continue;
        const s = startOfDay(from);
        const e = new Date(startOfDay(to).getTime() + MS_DAY - MS_MIN);
        out.push(
            overlay({
                id: `trip-${t.id}`,
                source: "travel",
                title: t.title ?? t.name ?? "Trip",
                meta: t.destination ? `Trip · ${t.destination}` : "Trip",
                location: t.destination ?? "",
                startAt: s.toISOString(),
                endAt: e.toISOString(),
                allDay: true,
                memberIds: t.memberIds ?? t.travellerMemberIds ?? (sources.travel?.travellers ?? []).filter((x) => x.tripId === t.id).map((x) => x.memberId),
                colourMemberId: null,
                kind: "trip",
                href: `/live/travel/${t.id}`,
                done: to < fromDate,
            }),
        );
    }

    for (const b of sources.finance?.bills ?? []) {
        const raw = b.dueDate ?? b.dueAt ?? "";
        if (!raw) continue;
        const date = localDay(raw);
        if (!inRange(date)) continue;
        out.push(
            overlay({
                id: `bill-${b.id}`,
                source: "finance",
                title: b.name ?? b.title ?? "Bill",
                meta: "Bill · due",
                location: "",
                ...allDayAt(date),
                allDay: true,
                memberIds: [],
                colourMemberId: null,
                kind: "deadline",
                href: "/live/finance",
                done: Boolean(b.paid) || b.status === "paid",
            }),
        );
    }

    for (const a of sources.curricula?.assignments ?? []) {
        if (!a.dueDate) continue;
        const date = localDay(a.dueDate);
        if (!inRange(date)) continue;
        out.push(
            overlay({
                id: `assignment-${a.id}`,
                source: "curricula",
                title: a.title,
                meta: "Assignment · due",
                location: "",
                ...allDayAt(date),
                allDay: true,
                memberIds: a.childMemberId ? [a.childMemberId] : [],
                colourMemberId: a.childMemberId ?? null,
                kind: "school",
                href: "/grow/curricula",
                done: a.status === "done" || a.status === "marked" || a.status === "submitted",
            }),
        );
    }

    for (const p of sources.people ?? []) {
        const date = localDay(p.at);
        if (!inRange(date)) continue;
        const span = p.allDay ? allDayAt(date) : { startAt: new Date(p.at).toISOString(), endAt: new Date(new Date(p.at).getTime() + 60 * MS_MIN).toISOString() };
        out.push(
            overlay({
                id: `people-${p.id}`,
                source: "people",
                title: p.title,
                meta: p.meta,
                location: "",
                ...span,
                allDay: p.allDay,
                memberIds: p.memberIds,
                colourMemberId: null,
                kind: p.kind === "birthday" || p.kind === "anniversary" ? "birthday" : "appointment",
                href: p.href,
                done: false,
            }),
        );
    }

    return out;
}

/** Everything drawn in a window, calendar rows and overlays alike, in time order. */
export function buildEntries(state: CalendarState, members: Member[], sources: OverlaySources, fromDate: string, toDate: string): Entry[] {
    // A trip the family also wrote into the diary is ONE thing, and Travel owns
    // it: while Travel is loaded its live row wins and the calendar's copy of
    // the same trip stands down (without Travel, the copy is what you see).
    const tripIds = new Set((sources.travel?.trips ?? []).map((t) => t.id));
    const own = occurrencesBetween(state.events, fromDate, toDate)
        .filter((o) => !(o.event.tripId && tripIds.has(o.event.tripId)))
        .map((o) => entryOf(o, members));
    const over = overlayEntries(sources, fromDate, toDate);
    return [...own, ...over].sort((a, b) => {
        if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
        return a.startAt < b.startAt ? -1 : a.startAt > b.startAt ? 1 : 0;
    });
}

/** Every ISO date an entry touches (a trip covers all of them). */
export function entryDays(e: Entry): string[] {
    const from = isoDate(e.startAt);
    const to = isoDate(e.endAt);
    const n = Math.min(60, Math.max(0, dayDiff(from, to)));
    return Array.from({ length: n + 1 }, (_, i) => addDaysIso(from, i));
}

export const entriesOnDay = (entries: Entry[], date: string): Entry[] => entries.filter((e) => isoDate(e.startAt) <= date && date <= isoDate(e.endAt));

/** The member filter chips. An entry with nobody named belongs to everyone. */
export function filterByMembers(entries: Entry[], memberIds: string[]): Entry[] {
    if (!memberIds.length) return entries;
    return entries.filter((e) => e.memberIds.length === 0 || e.memberIds.some((id) => memberIds.includes(id)));
}

export const filterBySources = (entries: Entry[], hidden: EntrySource[]): Entry[] => (hidden.length ? entries.filter((e) => !hidden.includes(e.source)) : entries);

// ---------------------------------------------------------------------------
// Laying a day out on a time grid
// ---------------------------------------------------------------------------

export interface PlacedEntry {
    entry: Entry;
    /** Pixels from the top of the grid. */
    top: number;
    height: number;
    /** Side-by-side packing for the ones that overlap. */
    lane: number;
    lanes: number;
}

export function placeEntries(items: Entry[], startHour: number, endHour: number, hourPx: number): PlacedEntry[] {
    const sorted = [...items].sort((a, b) => (a.startAt < b.startAt ? -1 : 1));
    const laneEnds: number[] = [];
    const rows = sorted.map((entry) => {
        const s = new Date(entry.startAt);
        const e = new Date(entry.endAt);
        const startMin = Math.max(0, s.getHours() * 60 + s.getMinutes() - startHour * 60);
        const endMin = Math.min((endHour + 1 - startHour) * 60, e.getHours() * 60 + e.getMinutes() - startHour * 60);
        const top = (startMin / 60) * hourPx;
        const height = Math.max(24, ((Math.max(endMin, startMin + 20) - startMin) / 60) * hourPx);
        const startMs = s.getTime();
        let lane = laneEnds.findIndex((end) => end <= startMs);
        if (lane === -1) {
            lane = laneEnds.length;
            laneEnds.push(e.getTime());
        } else {
            laneEnds[lane] = e.getTime();
        }
        return { entry, top, height, lane };
    });
    const lanes = Math.max(1, laneEnds.length);
    return rows.map((r) => ({ ...r, lanes }));
}

// ---------------------------------------------------------------------------
// Conflicts (AC 6)
// ---------------------------------------------------------------------------

export interface Conflict {
    key: string;
    date: string;
    a: Entry;
    b: Entry;
    memberIds: string[];
}

const effectiveMembers = (e: Entry, allIds: string[]): string[] => (e.memberIds.length ? e.memberIds : allIds);

/**
 * Timed entries that overlap for at least one shared person, earliest first.
 * A clash that has already happened still counts on the day it happened —
 * seeing it at six o'clock is how a family learns to catch the next one.
 */
export function conflicts(entries: Entry[], members: Member[]): Conflict[] {
    const allIds = members.map((m) => m.id);
    const timed = entries.filter((e) => !e.allDay);
    const out: Conflict[] = [];
    for (let i = 0; i < timed.length; i++) {
        for (let j = i + 1; j < timed.length; j++) {
            const a = timed[i];
            const b = timed[j];
            const aS = new Date(a.startAt).getTime();
            const aE = new Date(a.endAt).getTime();
            const bS = new Date(b.startAt).getTime();
            const bE = new Date(b.endAt).getTime();
            if (aS >= bE || bS >= aE) continue;
            const shared = effectiveMembers(a, allIds).filter((id) => effectiveMembers(b, allIds).includes(id));
            if (!shared.length) continue;
            out.push({ key: `${a.id}|${b.id}`, date: isoDate(a.startAt), a, b, memberIds: shared });
        }
    }
    return out.sort((x, y) => (x.a.startAt < y.a.startAt ? -1 : 1));
}

export const conflictsOnDay = (entries: Entry[], members: Member[], date: string): Conflict[] => conflicts(entriesOnDay(entries, date), members);

/** The entry ids caught in a clash, so a grid can mark them. */
export function conflictIds(list: Conflict[]): Set<string> {
    const s = new Set<string>();
    for (const c of list) {
        s.add(c.a.id);
        s.add(c.b.id);
    }
    return s;
}

// ---------------------------------------------------------------------------
// "Find an evening this week for all five of us"
// ---------------------------------------------------------------------------

export interface FreeSlot {
    date: string;
    /** ISO datetimes of the free window. */
    startAt: string;
    endAt: string;
    label: string;
}

/**
 * Evenings (18:00–21:00) in the next `days` where nobody in `memberIds` has
 * anything booked. The companion's answer is grounded on exactly this, so the
 * app and the AI never disagree about which nights are free.
 */
export function freeEvenings(entries: Entry[], memberIds: string[], fromDate: string, days = 7, allIds: string[] = []): FreeSlot[] {
    const out: FreeSlot[] = [];
    for (const date of dayRange(fromDate, days)) {
        const from = new Date(`${date}T18:00:00`);
        const to = new Date(`${date}T21:00:00`);
        const clash = entriesOnDay(entries, date).some((e) => {
            if (e.allDay || e.done) return false;
            const who = effectiveMembers(e, allIds);
            if (memberIds.length && !memberIds.some((id) => who.includes(id))) return false;
            return new Date(e.startAt) < to && new Date(e.endAt) > from;
        });
        if (!clash) out.push({ date, startAt: from.toISOString(), endAt: to.toISOString(), label: `${startOfDay(date).toLocaleDateString("en-GB", { weekday: "long" })} evening` });
    }
    return out;
}

// ---------------------------------------------------------------------------
// RSVPs
// ---------------------------------------------------------------------------

export const rsvpFor = (state: CalendarState, eventId: string, memberId: string): Rsvp | undefined => state.rsvps.find((r) => r.eventId === eventId && r.memberId === memberId);

export interface RsvpSummary {
    yes: string[];
    no: string[];
    maybe: string[];
    pending: string[];
}

export function rsvpSummary(state: CalendarState, ev: CalEvent): RsvpSummary {
    const out: RsvpSummary = { yes: [], no: [], maybe: [], pending: [] };
    for (const a of ev.attendees) {
        const r = rsvpFor(state, ev.id, a.memberId);
        if (!r) out.pending.push(a.memberId);
        else out[r.response].push(a.memberId);
    }
    return out;
}

/**
 * Invitations this member has not answered yet, soonest first.
 *
 * A weekly ritual is not an invitation, and neither is something you put in
 * the diary yourself — asking about either is exactly the noise the brief's
 * "calm, not noisy" rule forbids.
 */
export function myInvitations(state: CalendarState, meId: string, today: string, days = 21): CalEvent[] {
    const to = addDaysIso(today, days);
    return state.events
        .filter((ev) => ev.rrule === null && ev.createdBy !== meId)
        .filter((ev) => isAttendee(ev, meId) && !rsvpFor(state, ev.id, meId))
        .filter((ev) => Boolean(expandEvent(ev, today, to)[0]))
        .sort((a, b) => (a.startAt < b.startAt ? -1 : 1));
}

// ---------------------------------------------------------------------------
// ICS — a real feed, generated from state on every fetch (AC 2, AC 7)
// ---------------------------------------------------------------------------

const esc = (s: string): string => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

const pad = (n: number): string => String(n).padStart(2, "0");

const utcStamp = (iso: string): string => {
    const d = new Date(iso);
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
};

const dateStamp = (iso: string): string => isoDate(iso).replace(/-/g, "");

/** RFC 5545 asks for 75 octets; fold on 73 and continue with a space. */
function fold(line: string): string {
    if (line.length <= 73) return line;
    const parts: string[] = [];
    let rest = line;
    while (rest.length > 73) {
        parts.push(rest.slice(0, 73));
        rest = rest.slice(73);
    }
    parts.push(rest);
    return parts.join("\r\n ");
}

export interface IcsOptions {
    calendarName: string;
    /** The reminder to write as a VALARM, in minutes. */
    reminderMinutes?: number | null;
    now?: string;
}

/**
 * A valid iCalendar document for the entries given. It carries a five-minute
 * refresh hint, and because it is rendered from live state every time it is
 * asked for, a change is in the next pull — never stale by more than the
 * client's own interval (AC 2).
 */
export function buildIcs(entries: Entry[], opts: IcsOptions): string {
    const stamp = utcStamp(opts.now ?? new Date().toISOString());
    const lines: string[] = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Wafe//Family calendar//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        `X-WR-CALNAME:${esc(opts.calendarName)}`,
        "X-PUBLISHED-TTL:PT5M",
        "REFRESH-INTERVAL;VALUE=DURATION:PT5M",
    ];
    for (const e of entries) {
        lines.push("BEGIN:VEVENT");
        lines.push(`UID:${esc(e.id)}@wafe`);
        lines.push(`DTSTAMP:${stamp}`);
        if (e.allDay) {
            lines.push(`DTSTART;VALUE=DATE:${dateStamp(e.startAt)}`);
            // DTEND is exclusive for a date value: the morning after the last day.
            lines.push(`DTEND;VALUE=DATE:${dateStamp(addDaysIso(isoDate(e.endAt), 1))}`);
        } else {
            lines.push(`DTSTART:${utcStamp(e.startAt)}`);
            lines.push(`DTEND:${utcStamp(e.endAt)}`);
        }
        lines.push(`SUMMARY:${esc(e.title)}`);
        if (e.location) lines.push(`LOCATION:${esc(e.location)}`);
        lines.push(`DESCRIPTION:${esc(`${e.meta}${e.readOnly ? " · from Wàfè" : ""}`)}`);
        lines.push(`CATEGORIES:${esc(SOURCE_LABEL[e.source])}`);
        if (e.readOnly) lines.push("STATUS:TENTATIVE");
        if (opts.reminderMinutes && !e.allDay && !e.readOnly) {
            lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `TRIGGER:-PT${opts.reminderMinutes}M`, `DESCRIPTION:${esc(e.title)}`, "END:VALARM");
        }
        lines.push("END:VEVENT");
    }
    lines.push("END:VCALENDAR");
    return lines.map(fold).join("\r\n");
}

export const icsFilename = (label: string): string => `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "calendar"}.ics`;

/** What a subscriber's client would be given for this URL, right now. */
export const feedPath = (token: IcsToken): string => `https://feeds.wafe.app/ics/${token.token}.ics`;

export interface FeedResult {
    ok: boolean;
    status: number;
    reason: string;
    ics: string | null;
}

/**
 * The feed endpoint, in one function so the demo and the live server behave
 * identically: an unknown or revoked token is 410 Gone with nothing attached
 * (AC 7), and a live token renders the entries it is scoped to (AC 2).
 */
export function feedFor(state: CalendarState, tokenValue: string, entries: Entry[], calendarName: string): FeedResult {
    const token = state.tokens.find((t) => t.token === tokenValue);
    if (!token) return { ok: false, status: 404, reason: "No feed with that link.", ics: null };
    if (token.revokedAt) return { ok: false, status: 410, reason: `This link was revoked on ${shortDate(token.revokedAt)}. Nothing is served from it.`, ics: null };
    const scoped = token.scope === "member" && token.memberId ? filterByMembers(entries, [token.memberId]) : entries;
    return { ok: true, status: 200, reason: `${scoped.length} events · refreshed every 5 minutes`, ics: buildIcs(scoped, { calendarName }) };
}

// ---------------------------------------------------------------------------
// Weeks (Sunday planning)
// ---------------------------------------------------------------------------

export const weekConfirmed = (state: CalendarState, weekStart: string): boolean => state.weeks.some((w) => w.weekStart === weekStart);

/** True on the family's planning day (Sunday for the Adeyemis). */
export function isPlanningDay(today: string, planningDay: number): boolean {
    const dow = startOfDay(today).getDay();
    const isoDow = dow === 0 ? 7 : dow;
    return isoDow === planningDay;
}

// ---------------------------------------------------------------------------
// Counts for the header
// ---------------------------------------------------------------------------

export interface CalendarStats {
    thisWeek: number;
    today: number;
    mine: number;
    conflicts: number;
}

export function stats(entries: Entry[], today: string, meId: string, members: Member[]): CalendarStats {
    const week = weekDays(today);
    const inWeek = entries.filter((e) => entryDays(e).some((d) => week.includes(d)));
    return {
        thisWeek: inWeek.length,
        today: entriesOnDay(entries, today).length,
        mine: inWeek.filter((e) => e.memberIds.includes(meId)).length,
        conflicts: conflicts(inWeek, members).length,
    };
}

// ---------------------------------------------------------------------------
// The shared surfaces
// ---------------------------------------------------------------------------

export function dashboard(state: CalendarState, ctx: RepoContext): DashboardContribution {
    const agenda: AgendaItem[] = [];
    const attention: AttentionItem[] = [];
    const childCards: ChildCard[] = [];

    const todays = occurrencesBetween(state.events, ctx.today, ctx.today).map((o) => entryOf(o, ctx.members));
    const mine = todays.filter((e) => e.memberIds.length === 0 || e.memberIds.includes(ctx.me.id));
    const now = Date.now();

    for (const e of mine) {
        agenda.push({
            id: e.id,
            moduleId: "calendar",
            area: "execute",
            title: e.title,
            meta: e.location ? `${whenLabel(e)} · ${e.location}` : e.meta,
            memberId: e.memberIds.length === 1 ? e.memberIds[0] : null,
            at: e.allDay ? null : e.startAt,
            done: new Date(e.endAt).getTime() < now,
            href: e.href,
            sort: e.allDay ? 10 : 20 + new Date(e.startAt).getHours(),
        });
    }

    // A clash today is exactly the sort of thing a family wants told, once.
    for (const c of conflicts(todays, ctx.members).slice(0, 2)) {
        const who = nameList(
            c.memberIds
                .slice(0, 3)
                .map((id) => ctx.members.find((m) => m.id === id)?.name)
                .filter(Boolean)
                .map((x) => shortName(x as string)),
        );
        attention.push({
            id: `clash-${c.key}`,
            moduleId: "calendar",
            area: "execute",
            tone: "warn",
            title: `Two things at once${who ? ` for ${who}` : ""}`,
            body: `${c.a.title} (${whenLabel(c.a)}) overlaps ${c.b.title} (${whenLabel(c.b)}).`,
            href: `${HREF}/week`,
            weight: 62,
        });
    }

    // An unanswered invitation is a guest's whole dashboard, so it matters most there.
    for (const ev of myInvitations(state, ctx.me.id, ctx.today, 10).slice(0, 3)) {
        attention.push({
            id: `rsvp-${ev.id}`,
            moduleId: "calendar",
            area: "execute",
            tone: "info",
            title: `RSVP: ${ev.title}`,
            body: `${shortDate(ev.startAt)}${ev.allDay ? "" : ` at ${time(ev.startAt)}`}${ev.location ? ` · ${ev.location}` : ""}. Let them know if you can come.`,
            href: eventHref(ev.id),
            weight: ctx.role === "guest" ? 70 : 40,
        });
    }

    if (ctx.role === "child") {
        for (const e of mine.slice(0, 4)) {
            childCards.push({
                id: `cal-${e.id}`,
                moduleId: "calendar",
                area: "execute",
                title: e.title,
                body: e.allDay ? "All day today" : `${time(e.startAt)}${e.location ? ` · ${e.location}` : ""}`,
                emoji: EVENT_KIND[e.kind].emoji,
                href: e.href,
                done: new Date(e.endAt).getTime() < now,
            });
        }
    }

    return { agenda, attention, childCards };
}

export function nudges(state: CalendarState, ctx: RepoContext): Nudge[] {
    const out: Nudge[] = [];
    const tomorrow = addDaysIso(ctx.today, 1);

    for (const ev of state.events) {
        if (ev.reminderMinutes === null) continue;
        const next = expandEvent(ev, tomorrow, tomorrow)[0];
        if (!next) continue;
        out.push({
            key: `event-tomorrow-${ev.id}-${tomorrow}`,
            moduleId: "calendar",
            kind: "event",
            title: `Tomorrow: ${ev.title}`,
            body: `${ev.allDay ? "All day" : time(next.startAt)}${ev.location ? ` · ${ev.location}` : ""}.`,
            href: eventHref(ev.id),
            memberIds: attendeeIds(ev),
        });
    }

    // Ask a guest once, five days out, and never again.
    for (const ev of myInvitations(state, ctx.me.id, ctx.today, 5)) {
        out.push({
            key: `event-rsvp-${ev.id}`,
            moduleId: "calendar",
            kind: "event",
            title: `Can you come to ${ev.title}?`,
            body: `${shortDate(ev.startAt)}${ev.allDay ? "" : ` at ${time(ev.startAt)}`}. A yes or a no both help.`,
            href: eventHref(ev.id),
            memberIds: [ctx.me.id],
        });
    }

    return out;
}

export function aiContext(state: CalendarState, ctx: RepoContext): string {
    const to = addDaysIso(ctx.today, 10);
    const name = (id: string): string => shortName(ctx.members.find((m) => m.id === id)?.name ?? "someone");
    const entries = occurrencesBetween(state.events, ctx.today, to).map((o) => entryOf(o, ctx.members));
    const lines = entries.slice(0, 22).map((e) => {
        const who = e.memberIds.length ? e.memberIds.map(name).join("/") : "everyone";
        return `${shortDate(e.startAt)} ${e.allDay ? "all day" : time(e.startAt)} ${e.title}${e.location ? ` at ${e.location}` : ""} (${who})`;
    });
    const parts: string[] = [];
    if (lines.length) parts.push(`Next 10 days: ${lines.join("; ")}.`);
    const free = freeEvenings(entries, [], ctx.today, 7, ctx.members.map((m) => m.id));
    if (free.length) parts.push(`Free evenings (18:00–21:00) this week: ${free.map((f) => `${f.label} ${shortDate(f.date)}`).join(", ")}.`);
    const clash = conflicts(entries, ctx.members).slice(0, 3);
    if (clash.length) parts.push(`Clashes: ${clash.map((c) => `${c.a.title} vs ${c.b.title} on ${shortDate(c.a.startAt)}`).join("; ")}.`);
    const pending = myInvitations(state, ctx.me.id, ctx.today, 21);
    if (pending.length) parts.push(`${shortName(ctx.me.name)} has not answered: ${pending.map((e) => e.title).join(", ")}.`);
    return parts.join(" ").slice(0, 1500);
}

export function search(state: CalendarState, q: string): Array<{ title: string; meta: string; href: string }> {
    const n = q.toLowerCase();
    const hit = (s: string): boolean => s.toLowerCase().includes(n);
    return state.events
        .filter((ev) => hit(ev.title) || hit(ev.location) || hit(ev.notes))
        .slice(0, 8)
        .map((ev) => ({
            title: ev.title,
            meta: `Calendar · ${shortDate(ev.startAt)}${ev.allDay ? "" : ` ${time(ev.startAt)}`}${ev.location ? ` · ${ev.location}` : ""}`,
            href: eventHref(ev.id),
        }));
}

/** The response a member gave, for the little coloured pill on the event page. */
export const responseTone = (r: RsvpResponse): "ok" | "danger" | "warn" => (r === "yes" ? "ok" : r === "no" ? "danger" : "warn");

// ---------------------------------------------------------------------------
// "Propose an event from a message or note"
// ---------------------------------------------------------------------------

const WEEKDAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const MONTH_NAMES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

export interface EventProposal {
    title: string;
    /** ISO date. */
    date: string;
    /** HH:MM. */
    start: string;
    end: string;
    location: string;
    /** What the reader actually recognised, shown so nothing looks like magic. */
    used: string[];
    confident: boolean;
}

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Take the recognised phrases back out of the sentence, preposition and all. */
function stripTokens(text: string, tokens: string[]): string {
    let out = text;
    for (const t of tokens) {
        const token = t.trim();
        if (token.length < 2) continue;
        const boundary = /^\w/.test(token) ? "\\b" : "";
        out = out.replace(new RegExp(`(?:\\b(?:on|at|from|starting|this|next)\\s+)?${boundary}${escapeRe(token)}(?=\\b|$)`, "gi"), " ");
    }
    return out;
}

/** What is left after the fields are taken out is often "… is" or "… on". */
const DANGLING = /(?:\s|^)(?:is|are|was|were|will|be|on|at|in|from|to|by|this|next|the|a|an|and|for|due|scheduled|starts?|starting|happens?|happening)$/i;

function tidy(s: string): string {
    let out = s.replace(/\s{2,}/g, " ").replace(/\s+([,;:.!?])/g, "$1").trim();
    out = out.replace(/^[\s,;:.–—-]+/, "").replace(/[\s,;:.–—-]+$/, "");
    for (let i = 0; i < 4; i++) {
        const next = out.replace(DANGLING, "").replace(/[\s,;:.–—-]+$/, "");
        if (next === out) break;
        out = next;
    }
    return out.trim();
}

/**
 * Read a message the way a person skims it: a day, a time, a place, a name for
 * the thing. It is a PROPOSAL — the form opens filled in and nothing is
 * written until somebody presses the button, which is the companion's rule
 * everywhere in Wàfè. The AI improves the wording; this is what happens when
 * it is unavailable, so the feature never depends on a model being reachable.
 */
export function proposeFromText(text: string, today: string): EventProposal {
    const raw = text.trim();
    const lower = raw.toLowerCase();
    const used: string[] = [];
    let date = addDaysIso(today, 1);
    let confident = false;

    const rel = lower.match(/\b(today|tonight|this evening)\b/);
    if (rel) {
        date = today;
        // The words that were actually there, so "I used…" quotes the message.
        used.push(rel[1]);
        confident = true;
    } else if (/\btomorrow\b/.test(lower)) {
        date = addDaysIso(today, 1);
        used.push("tomorrow");
        confident = true;
    } else {
        const wd = WEEKDAY_NAMES.findIndex((w) => new RegExp(`\\b${w}\\b`).test(lower));
        const md = lower.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/);
        if (md) {
            const day = Number(md[1]);
            const month = MONTH_NAMES.indexOf(md[2]);
            const year = startOfDay(today).getFullYear();
            const guess = isoDate(new Date(year, month, day));
            date = guess < today ? isoDate(new Date(year + 1, month, day)) : guess;
            used.push(md[0]);
            confident = true;
        } else if (wd >= 0) {
            const cur = startOfDay(today).getDay();
            const delta = (wd - cur + 7) % 7 || 7;
            date = addDaysIso(today, delta);
            used.push(WEEKDAY_NAMES[wd]);
            confident = true;
        }
    }

    let start = "18:00";
    const clock = lower.match(/\b(\d{1,2})[.:](\d{2})\s*(am|pm)?\b/);
    const bare = lower.match(/\b(\d{1,2})\s*(am|pm)\b/);
    if (clock) {
        let h = Number(clock[1]);
        if (clock[3] === "pm" && h < 12) h += 12;
        if (clock[3] === "am" && h === 12) h = 0;
        start = `${String(Math.min(23, h)).padStart(2, "0")}:${clock[2]}`;
        used.push(clock[0].trim());
    } else if (bare) {
        let h = Number(bare[1]);
        if (bare[2] === "pm" && h < 12) h += 12;
        if (bare[2] === "am" && h === 12) h = 0;
        start = `${String(Math.min(23, h)).padStart(2, "0")}:00`;
        used.push(bare[0].trim());
    }
    const [sh, sm] = start.split(":").map(Number);
    const end = `${String((sh + 1) % 24).padStart(2, "0")}:${String(sm).padStart(2, "0")}`;

    // A place reads as "at <Capitalised Words>" — and never as "at 7pm".
    let location = "";
    const at = raw.match(/\bat ((?!\d)[A-Z][\w'’&-]*(?: [A-Z][\w'’&-]*){0,4})/);
    if (at) {
        location = at[1].replace(/[.,;:]+$/, "").trim();
        used.push(`at ${location}`);
    }

    // Sentences split on a full stop FOLLOWED BY A SPACE, so "5.30pm" survives.
    const firstLine = raw
        .split(/\n|[!?]|\.\s/)
        .map((x) => x.trim())
        .find((x) => x.length > 3) ?? "New event";
    const cleaned = firstLine
        .replace(/^(hi|hello|hey|good (morning|afternoon|evening))\b[\s,]*/i, "")
        .replace(/^(just )?(a )?(quick )?(reminder|note)( that)?[\s,:-]*/i, "")
        .replace(/^[^\s]+\s+—\s+/, "")
        .trim();
    // The day, the time and the place already have their own fields, so the
    // name of the thing should not repeat them: "parents' meeting", not
    // "parents' meeting on Thursday at 6.30pm at Woodside Primary".
    const trimmed = tidy(stripTokens(cleaned, used));
    const named = trimmed.length >= 3 ? trimmed : cleaned;
    // Cut on a word boundary rather than mid-word.
    const title = named.length > 64 ? `${named.slice(0, 64).replace(/\s+\S*$/, "")}…` : named;

    return { title: title || "New event", date, start, end, location, used, confident };
}
