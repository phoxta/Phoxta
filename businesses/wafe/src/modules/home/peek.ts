import { isoDate, shortDate, time } from "@/lib/format";
import type { CalEvent, CalendarState } from "@/modules/calendar/types";
import type { FinanceState } from "@/modules/finance/types";
import type { MemoriesState } from "@/modules/memories/types";
import type { Task, TasksRepo } from "@/modules/tasks/types";
import type { Decision } from "./types";

/**
 * Reading the rest of the house.
 *
 * Home is the one module that is mostly a reader: the dashboards are built
 * from every other module's slice, fetched read-only through
 * `useModuleState<T>("<id>")`.
 *
 * Where a widget carries a promise — "what did today cost", "this links to
 * the album" — the helper is typed against that module's own exported state
 * type (`import type` only, so nothing is coupled at runtime and a rename
 * over there becomes a compile error over here). Guessing at field names by
 * trying a list of aliases is how a card silently degrades to an empty state
 * that looks deliberate, which is worse than an honest failure.
 *
 * The tolerant readers below survive only for modules where Home reads one
 * cheap fact (a title, a date) and truly does not care about the rest.
 */

type Rec = Record<string, unknown>;

const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);

/** The first array of objects living under any of `keys` on a module's state. */
function rows(state: unknown, keys: string[]): Rec[] {
    if (!isRec(state)) return [];
    for (const k of keys) {
        const v = state[k];
        if (Array.isArray(v)) return v.filter(isRec);
    }
    return [];
}

function text(r: Rec, keys: string[], fallback = ""): string {
    for (const k of keys) {
        const v = r[k];
        if (typeof v === "string" && v.trim()) return v;
    }
    return fallback;
}

function int(r: Rec, keys: string[], fallback = 0): number {
    for (const k of keys) {
        const v = r[k];
        if (typeof v === "number" && Number.isFinite(v)) return v;
    }
    return fallback;
}

function flag(r: Rec, keys: string[]): boolean {
    for (const k of keys) {
        const v = r[k];
        if (typeof v === "boolean") return v;
        if (typeof v === "string" && v) return true;
    }
    return false;
}

/** A date-ish field as an ISO datetime, or null. */
function when(r: Rec, keys: string[]): string | null {
    for (const k of keys) {
        const v = r[k];
        if (typeof v !== "string" || !v) continue;
        const d = new Date(v.length === 10 ? `${v}T09:00:00` : v);
        if (!Number.isNaN(d.getTime())) return d.toISOString();
    }
    return null;
}

const memberOf = (r: Rec): string | null => {
    const v = r.memberId ?? r.ownerMemberId ?? r.assigneeId ?? r.forMemberId;
    return typeof v === "string" && v ? v : null;
};

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------

export interface PeekEvent {
    id: string;
    title: string;
    at: string;
    date: string;
    allDay: boolean;
    href: string;
    /**
     * Who is named on it. Empty means the whole family — which for a GUEST is
     * not the same as "you", so a guest's diary only ever shows the rows that
     * carry her id.
     */
    memberIds: string[];
}

/**
 * The dates a row lands on inside [fromDate, toDate], stepping a repeat rule
 * forward the way the calendar does (weekly, fortnightly, monthly; `until`
 * inclusive). A row with no rule is one date. The list is empty when nothing
 * falls in the window.
 */
function datesWithin(r: Rec, at: string, fromDate: string, toDate: string): string[] {
    const rule = isRec(r.rrule) ? r.rrule : null;
    const freq = rule && typeof rule.freq === "string" ? rule.freq : null;
    if (!freq) {
        const date = isoDate(at);
        return date >= fromDate && date <= toDate ? [at] : [];
    }
    const until = typeof rule?.until === "string" && rule.until ? rule.until : null;
    const out: string[] = [];
    const d = new Date(at);
    for (let i = 0; i < 400; i += 1) {
        const date = isoDate(d);
        if (date > toDate || (until && date > until)) break;
        if (date >= fromDate) out.push(d.toISOString());
        if (freq === "weekly") d.setDate(d.getDate() + 7);
        else if (freq === "fortnightly") d.setDate(d.getDate() + 14);
        else d.setMonth(d.getMonth() + 1);
    }
    return out;
}

/** The member ids on an event, however the module happens to spell them. */
function attendeeIds(r: Rec): string[] {
    for (const k of ["attendees", "attendeeMemberIds", "memberIds", "guests"]) {
        const v = r[k];
        if (!Array.isArray(v)) continue;
        const out = v.map((e) => (typeof e === "string" ? e : isRec(e) ? memberOf(e) : null)).filter((x): x is string => Boolean(x));
        if (out.length) return out;
    }
    return [];
}

/**
 * Events between two ISO dates inclusive, earliest first — one row per
 * occurrence, so Sunday's service and Tuesday's co-op count in "this week"
 * rather than only on the day they were first written down.
 */
export function weekEvents(calendar: unknown, fromDate: string, toDate: string): PeekEvent[] {
    const out: PeekEvent[] = [];
    rows(calendar, ["events", "items", "entries"]).forEach((r, i) => {
        const base = when(r, ["startsAt", "startAt", "start", "at", "date", "dueAt"]);
        if (!base) return;
        const real = text(r, ["id"]);
        const id = real || `event-${i}`;
        const title = text(r, ["title", "name", "summary"], "Untitled");
        const allDay = flag(r, ["allDay"]);
        const href = real ? `/execute/calendar/${real}` : "/execute/calendar";
        const memberIds = attendeeIds(r);
        for (const at of datesWithin(r, base, fromDate, toDate)) {
            const date = isoDate(at);
            out.push({ id: at === base ? id : `${id}:${date}`, title, at, date, allDay, href, memberIds });
        }
    });
    return out.sort((a, b) => a.at.localeCompare(b.at));
}

/**
 * The next few things in the diary, with everything the "Up next" card needs.
 *
 * Typed against the calendar's own state (`import type` only): this card
 * carries a promise — a time range, a place, a photograph — and a guessed
 * field name would quietly empty it. Recurring rows are stepped forward to
 * their next occurrence, so Sunday's service shows on Sunday rather than on
 * the day it was first written down.
 */
export interface PeekUpcoming {
    id: string;
    title: string;
    startAt: string;
    endAt: string;
    allDay: boolean;
    location: string;
    kind: string;
    kindLabel: string;
    kindEmoji: string;
    coverUrl: string | null;
    memberIds: string[];
    colourMemberId: string | null;
    href: string;
}

/** The calendar's own vocabulary, copied rather than imported at runtime. */
const KIND: Record<string, { label: string; emoji: string }> = {
    event: { label: "Event", emoji: "📅" },
    school: { label: "School", emoji: "🎒" },
    church: { label: "Church", emoji: "⛪" },
    appointment: { label: "Appointment", emoji: "🩺" },
    deadline: { label: "Deadline", emoji: "⏳" },
    birthday: { label: "Birthday", emoji: "🎂" },
    trip: { label: "Trip", emoji: "✈️" },
};

/** The first occurrence of `e` that has not finished yet, or null. */
function nextOccurrence(e: CalEvent, nowMs: number): { startAt: string; endAt: string } | null {
    const start = new Date(e.startAt).getTime();
    const end = new Date(e.endAt).getTime();
    if (Number.isNaN(start)) return null;
    const dur = Number.isNaN(end) ? 0 : Math.max(0, end - start);
    if (!e.rrule) return start + dur >= nowMs ? { startAt: e.startAt, endAt: e.endAt } : null;
    const until = e.rrule.until ? new Date(`${e.rrule.until}T23:59:59`).getTime() : Number.POSITIVE_INFINITY;
    const d = new Date(e.startAt);
    for (let i = 0; i < 400; i += 1) {
        const s = d.getTime();
        if (s > until) return null;
        if (s + dur >= nowMs) return { startAt: d.toISOString(), endAt: new Date(s + dur).toISOString() };
        if (e.rrule.freq === "weekly") d.setDate(d.getDate() + 7);
        else if (e.rrule.freq === "fortnightly") d.setDate(d.getDate() + 14);
        else d.setMonth(d.getMonth() + 1);
    }
    return null;
}

/** What is coming up, soonest first. `forMemberId` keeps only rows that name that member. */
export function upcoming(calendar: CalendarState | undefined, now: Date, max = 3, forMemberId?: string): PeekUpcoming[] {
    if (!calendar?.events?.length) return [];
    const nowMs = now.getTime();
    const out: PeekUpcoming[] = [];
    for (const e of calendar.events) {
        const ids = (e.attendees ?? []).map((a) => a.memberId);
        if (forMemberId && !ids.includes(forMemberId)) continue;
        const occ = nextOccurrence(e, nowMs);
        if (!occ) continue;
        const k = KIND[e.kind] ?? KIND.event;
        out.push({
            id: e.id,
            title: e.title,
            startAt: occ.startAt,
            endAt: occ.endAt,
            allDay: e.allDay,
            location: e.location ?? "",
            kind: e.kind,
            kindLabel: k.label,
            kindEmoji: k.emoji,
            coverUrl: e.coverUrl ?? null,
            memberIds: ids,
            colourMemberId: e.colourMemberId ?? null,
            href: `/execute/calendar/${e.id}`,
        });
    }
    return out.sort((a, b) => a.startAt.localeCompare(b.startAt)).slice(0, max);
}

const ONE_DAY = 86_400_000;

/** "13:00 – 15:00", "All day", or "All day · 3 days" — the calendar's own wording. */
export function whenText(e: { startAt: string; endAt: string; allDay: boolean }): string {
    if (e.allDay) {
        const days = Math.round((new Date(`${isoDate(e.endAt)}T12:00:00`).getTime() - new Date(`${isoDate(e.startAt)}T12:00:00`).getTime()) / ONE_DAY);
        return days > 0 ? `All day · ${days + 1} days` : "All day";
    }
    const from = time(e.startAt);
    const to = time(e.endAt);
    return from === to ? from : `${from} – ${to}`;
}

/**
 * "Today", "Tomorrow", or "13 Sept" — short enough to sit in a pill. Something
 * that started earlier and is still running (a three-day trip) is "Today".
 */
export function dayText(startAt: string, today: string, endAt?: string): string {
    const day = isoDate(startAt);
    if (day === today) return "Today";
    if (endAt && day < today && today <= isoDate(endAt)) return "Today";
    const t = new Date(`${today}T12:00:00`);
    t.setDate(t.getDate() + 1);
    if (day === isoDate(t)) return "Tomorrow";
    return shortDate(startAt);
}

// ---------------------------------------------------------------------------
// Bible — the verse and the prayer wall
// ---------------------------------------------------------------------------

export interface PeekVerse {
    reference: string;
    text: string;
}

export function verseOfTheDay(bible: unknown): PeekVerse | null {
    const list = rows(bible, ["verses", "memoryVerses", "verseOfTheDay", "versePack"]);
    for (const r of list) {
        const reference = text(r, ["reference", "ref", "citation", "passage", "title"]);
        const body = text(r, ["text", "body", "verse", "content"]);
        if (reference && body) return { reference, text: body };
    }
    return null;
}

export interface PeekPrayer {
    id: string;
    title: string;
    answered: boolean;
}

export function prayerWall(bible: unknown, max = 3): PeekPrayer[] {
    return rows(bible, ["prayers", "prayerWall", "requests"])
        .map((r, i) => ({
            id: text(r, ["id"], `prayer-${i}`),
            title: text(r, ["title", "text", "body", "request"], "A prayer"),
            answered: flag(r, ["answeredAt", "answered"]),
        }))
        .slice(0, max);
}

// ---------------------------------------------------------------------------
// Finance — budget alerts (parents only; the child slice simply has none)
// ---------------------------------------------------------------------------

export interface PeekBudget {
    id: string;
    label: string;
    pct: number;
    spentCents: number;
    limitCents: number;
}

const percent = (spent: number, limit: number): number => (limit > 0 ? Math.round((spent / limit) * 100) : 0);

/**
 * Every budget with a limit, worst first — the "what did today cost" half of
 * the parent dashboard.
 *
 * Finance keeps the limit on the category (`monthlyBudgetCents`) and the
 * spend in its month summary (`summary.categories`), never on one row, so
 * this reads both. `alerts` is the fallback: a breached category always has a
 * row there carrying the same two numbers.
 */
export function budgets(finance: FinanceState | undefined): PeekBudget[] {
    if (!finance || finance.visible === false) return [];

    const out: PeekBudget[] = [];
    for (const c of finance.summary?.categories ?? []) {
        if (c.budgetCents <= 0) continue;
        out.push({ id: c.categoryId, label: c.name, pct: percent(c.spentCents, c.budgetCents), spentCents: c.spentCents, limitCents: c.budgetCents });
    }

    if (!out.length) {
        const fired = new Map((finance.alerts ?? []).map((a) => [a.categoryId, a]));
        for (const b of finance.budgets ?? []) {
            if (b.kind !== "expense" || b.monthlyBudgetCents <= 0) continue;
            const alert = fired.get(b.id);
            const limitCents = alert?.budgetCents || b.monthlyBudgetCents;
            const spentCents = alert?.spentCents ?? 0;
            out.push({ id: b.id, label: b.name, pct: percent(spentCents, limitCents), spentCents, limitCents });
        }
    }

    return out.sort((a, b) => b.pct - a.pct);
}

// ---------------------------------------------------------------------------
// Books — the child's reading for today (the gap the critic flagged)
// ---------------------------------------------------------------------------

export interface PeekReading {
    title: string;
    meta: string;
    pct: number;
}

export function readingToday(books: unknown, memberId: string): PeekReading | null {
    const plans = rows(books, ["plans", "readingPlans", "assignments"]).filter((r) => {
        const m = memberOf(r);
        return !m || m === memberId;
    });
    for (const r of plans) {
        const perDay = int(r, ["pagesPerDay", "dailyPages", "targetPages", "perDay"]);
        const doneToday = int(r, ["pagesToday", "doneToday"]);
        const title = text(r, ["title", "bookTitle", "name"], "Today's reading");
        if (perDay > 0) return { title, meta: `${doneToday} of ${perDay} pages today`, pct: Math.min(100, Math.round((doneToday / perDay) * 100)) };
    }
    // A book being read, with no daily target attached.
    for (const r of rows(books, ["books", "items"])) {
        const m = memberOf(r);
        if (m && m !== memberId) continue;
        const pct = int(r, ["progress", "pct", "percent"]);
        if (pct > 0 && pct < 100) return { title: text(r, ["title", "name"], "Your book"), meta: `${pct}% of the way through`, pct };
    }
    return null;
}

// ---------------------------------------------------------------------------
// Curricula — the badge shelf on a child's Home
// ---------------------------------------------------------------------------

export interface PeekBadge {
    id: string;
    label: string;
    emoji: string;
}

export function badges(curricula: unknown, memberId: string, max = 8): PeekBadge[] {
    return rows(curricula, ["badges", "awards", "earnedBadges", "achievements"])
        .filter((r) => {
            const m = memberOf(r);
            return !m || m === memberId;
        })
        .map((r, i) => ({
            id: text(r, ["id"], `badge-${i}`),
            label: text(r, ["label", "title", "name"], "Badge"),
            emoji: text(r, ["emoji", "icon"], "🏅"),
        }))
        .slice(0, max);
}

// ---------------------------------------------------------------------------
// Memories — extra "On this day" entries beyond Home's own timeline
// ---------------------------------------------------------------------------

export interface PeekMoment {
    id: string;
    date: string;
    title: string;
    body: string;
    href: string;
    photoUrl?: string;
}

/** Where Home's own timeline entries point when they name no deeper record. */
export const TIMELINE_HREF = "/create/memories/timeline";

/**
 * Memories from an earlier year whose day-and-month match `today`.
 *
 * Every row links to a RECORD, never to the module's index: a curated
 * timeline event carries its own `href` (usually an album), and a loose
 * photograph resolves through `albumPhotos` to the album it lives in. A
 * picture in no album at all falls back to the family timeline, which is a
 * screen you can actually read it on.
 */
export function memoriesOnThisDay(memories: MemoriesState | undefined, today: string, maxPhotos = 4): PeekMoment[] {
    if (!memories) return [];
    const md = today.slice(5);
    const priorYear = (date: string): boolean => date.slice(5) === md && date < today;

    const photoUrl = new Map((memories.photos ?? []).map((p) => [p.id, p.url]));
    const albumOf = new Map<string, string>();
    for (const ap of memories.albumPhotos ?? []) if (!albumOf.has(ap.photoId)) albumOf.set(ap.photoId, ap.albumId);

    const out: PeekMoment[] = [];
    const seenPhotos = new Set<string>();

    for (const e of memories.timeline ?? []) {
        const date = (e.date ?? "").slice(0, 10);
        if (!priorYear(date)) continue;
        if (e.photoId) seenPhotos.add(e.photoId);
        out.push({
            id: `timeline-${e.id}`,
            date,
            title: e.title || "A memory",
            body: e.body ?? "",
            href: e.href || TIMELINE_HREF,
            photoUrl: (e.photoId ? photoUrl.get(e.photoId) : undefined) || undefined,
        });
    }

    let taken = 0;
    for (const p of memories.photos ?? []) {
        if (taken >= maxPhotos) break;
        const date = (p.takenAt ?? "").slice(0, 10);
        if (!priorYear(date) || seenPhotos.has(p.id)) continue;
        const albumId = albumOf.get(p.id);
        out.push({
            id: `photo-${p.id}`,
            date,
            title: p.caption || "A picture from this day",
            body: p.place ?? "",
            href: albumId ? `/create/memories/albums/${albumId}` : TIMELINE_HREF,
            photoUrl: p.url || undefined,
        });
        taken += 1;
    }

    return out;
}

/**
 * Give Home's own timeline entries the deepest link Memories can offer.
 *
 * A milestone Home seeded ("Tobi's first swim") has no record of its own in
 * Memories, so it points at the family timeline. When Memories holds a
 * curated event on the very same date, that event's href — nearly always an
 * album — is the better destination, and this swaps it in.
 */
export function deepenMomentHrefs(memories: MemoriesState | undefined, moments: PeekMoment[]): PeekMoment[] {
    if (!memories) return moments;
    const byDate = new Map<string, string>();
    for (const e of memories.timeline ?? []) {
        const date = (e.date ?? "").slice(0, 10);
        if (date && e.href && e.href !== TIMELINE_HREF && !byDate.has(date)) byDate.set(date, e.href);
    }
    if (!byDate.size) return moments;
    return moments.map((m) => {
        const deeper = m.href === TIMELINE_HREF ? byDate.get(m.date) : undefined;
        return deeper ? { ...m, href: deeper } : m;
    });
}

// ---------------------------------------------------------------------------
// Travel — what a guest was actually granted
// ---------------------------------------------------------------------------

export interface PeekTrip {
    id: string;
    title: string;
    at: string | null;
    href: string;
}

export function trips(travel: unknown, max = 3): PeekTrip[] {
    return rows(travel, ["trips", "items"])
        .map((r, i) => {
            const real = text(r, ["id"]);
            return {
                id: real || `trip-${i}`,
                title: text(r, ["title", "name", "destination"], "A trip"),
                at: when(r, ["startsAt", "startDate", "start", "departsAt", "at"]),
                href: real ? `/live/travel/${real}` : "/live/travel",
            };
        })
        .slice(0, max);
}

// ---------------------------------------------------------------------------
// Writing back to Tasks, from the evening check-in
// ---------------------------------------------------------------------------

/**
 * The one place Home reaches out of its own folder.
 *
 * The evening check-in's whole point is that a decision is made THERE —
 * reschedule, delegate or drop — rather than remembered and lost. That means
 * the task itself has to change, and the task belongs to Tasks. Home does not
 * import Tasks' repo (that would couple the two at runtime); it takes the
 * loaded repo as `unknown` and narrows it against `TasksRepo`'s own type, so
 * the field names it writes — `assigneeMemberIds`, not the invented
 * `memberId` — are checked by the compiler.
 *
 * When the write is not there, the decision is still recorded on the check-in
 * and `applied` stays false, and the card says "(recorded here)". Telling a
 * family a hand-over happened when the task never moved is the one outcome
 * this function must never produce.
 */
type TaskWrites = Partial<Pick<TasksRepo, "updateTask" | "dropTask" | "bulkAssign">>;

/** The reason Tasks stores against anything let go at the check-in. */
export const DROP_REASON = "dropped at check-in";

/** A repo method, bound to its repo — a detached class method loses `this`. */
function bound<K extends keyof TaskWrites>(repo: TaskWrites, k: K): NonNullable<TaskWrites[K]> | undefined {
    const v = repo[k];
    if (typeof v !== "function") return undefined;
    return (v as (...args: never[]) => unknown).bind(repo) as NonNullable<TaskWrites[K]>;
}

export async function applyTaskDecision(repo: unknown, d: Decision): Promise<boolean> {
    if (!isRec(repo)) return false;
    const t = repo as TaskWrites;
    const update = bound(t, "updateTask");
    try {
        if (d.action === "reschedule" && d.toDate) {
            if (!update) return false;
            const patch: Partial<Task> = { dueAt: new Date(`${d.toDate}T09:00:00`).toISOString() };
            await update(d.taskId, patch);
            return true;
        }

        if (d.action === "delegate") {
            // Assignment lives in `assigneeMemberIds`; a task has no `memberId`.
            const to = d.toMemberId ? [d.toMemberId] : [];
            const assign = bound(t, "bulkAssign");
            if (assign) {
                await assign([d.taskId], to);
                return true;
            }
            if (!update) return false;
            const patch: Partial<Task> = { assigneeMemberIds: to };
            await update(d.taskId, patch);
            return true;
        }

        const drop = bound(t, "dropTask");
        if (drop) {
            await drop(d.taskId, DROP_REASON);
            return true;
        }
        if (!update) return false;
        const patch: Partial<Task> = { status: "done", droppedReason: DROP_REASON };
        await update(d.taskId, patch);
        return true;
    } catch {
        // Tasks refused (permissions, a different signature) — the decision is
        // still recorded on the check-in; nothing on Home breaks.
        return false;
    }
}
