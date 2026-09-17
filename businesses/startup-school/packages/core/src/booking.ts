import type { AvailabilityRule, Booking, Mentor, Slot } from "./types";

/**
 * Turning a mentor's wall-clock availability into bookable instants.
 *
 * The live backend does this in SQL (`cs_mentor_slots`); this is the same rule
 * set for the demo, which has no backend. Keeping it pure — inputs in, slots
 * out, `now` injected — is what makes it checkable without a database or a
 * fixed clock.
 *
 * The whole file exists because of one fact: "Tuesdays 14:00" is a civil time
 * in someone's zone, not an instant. Resolve it per day rather than per week and
 * a daylight-saving change becomes a non-event.
 */

/**
 * How far `tz` is from UTC at a given instant, in milliseconds.
 *
 * `Intl` will format an instant in any zone; formatting it, reading the fields
 * back as if they were UTC, and subtracting recovers the offset. This is the
 * standard trick and it is exact, because it asks the same tz database the
 * platform uses rather than reimplementing it.
 */
export function zoneOffsetMs(at: Date, tz: string): number {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hour12: false,
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).formatToParts(at);
    const f: Record<string, number> = {};
    for (const p of parts) if (p.type !== "literal") f[p.type] = Number(p.value);
    // `hour` comes back as 24 at midnight under hour12:false in some engines.
    const asUtc = Date.UTC(f.year, f.month - 1, f.day, f.hour % 24, f.minute, f.second);
    return asUtc - at.getTime();
}

/**
 * A wall-clock time in `tz` as an instant.
 *
 * Two passes, because the offset depends on the instant we are trying to find.
 * The first guess is usually right; the second fixes the hours around a
 * transition, where the offset that applies differs from the one at the guess.
 */
export function wallClockToInstant(dateISO: string, hhmm: string, tz: string): Date {
    const naive = new Date(`${dateISO}T${hhmm}:00Z`).getTime();
    let guess = new Date(naive - zoneOffsetMs(new Date(naive), tz));
    guess = new Date(naive - zoneOffsetMs(guess, tz));
    return guess;
}

/** The civil date in `tz` at an instant, as `YYYY-MM-DD`. */
export function civilDate(at: Date, tz: string): string {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(at);
    const f: Record<string, string> = {};
    for (const p of parts) if (p.type !== "literal") f[p.type] = p.value;
    return `${f.year}-${f.month}-${f.day}`;
}

/** Day of week (0 = Sunday) for a `YYYY-MM-DD` civil date. */
const weekdayOf = (dateISO: string): number => new Date(`${dateISO}T12:00:00Z`).getUTCDay();

/** `YYYY-MM-DD` plus n days, staying in civil-date space. */
const addDays = (dateISO: string, n: number): string => {
    const d = new Date(`${dateISO}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
};

const MIN = 60_000;

export interface SlotOptions {
    /** Injected so the result is deterministic under test. */
    now?: Date;
}

/**
 * Bookable slots for one mentor across a civil-date range.
 *
 * Every constraint is reduced to the same shape — a busy interval — and
 * subtracted once: existing bookings widened by the buffer, and a floor at
 * `now + minNotice`. Adding a constraint later means adding an interval, not
 * another branch in the loop.
 */
export function computeSlots(
    mentor: Mentor,
    rules: AvailabilityRule[],
    bookings: Booking[],
    fromISO: string,
    toISO: string,
    opts: SlotOptions = {},
): Slot[] {
    if (!mentor.bookable) return [];

    const tz = mentor.timezone ?? "UTC";
    const len = mentor.sessionMin ?? 30;
    const buf = mentor.bufferMin ?? 0;
    const notice = mentor.minNoticeMin ?? 0;
    const horizon = mentor.horizonDays ?? 28;
    const now = opts.now ?? new Date();

    const floor = now.getTime() + notice * MIN;
    const today = civilDate(now, tz);
    const ceil = addDays(today, horizon);

    // Busy = a confirmed booking widened by the buffer on both sides. The
    // buffer protects the mentor without being charged to the founder's slot.
    const busy = bookings
        .filter((b) => b.mentorId === mentor.id && b.status === "confirmed")
        .map((b) => ({
            from: new Date(b.startsAt).getTime() - buf * MIN,
            to: new Date(b.endsAt).getTime() + buf * MIN,
        }));

    const mine = rules.filter((r) => r.mentorId === mentor.id);
    const out: Slot[] = [];

    // Callers pass either a civil date or a full instant; normalise, because
    // comparing "2026-09-15T19:30:00Z" against "2026-09-15" as strings puts the
    // timestamp first and then every date helper downstream gets a timestamp.
    const fromDay = fromISO.slice(0, 10);
    const toDay = toISO.slice(0, 10);

    let d = fromDay > today ? fromDay : today;
    const last = toDay < ceil ? toDay : ceil;

    while (d <= last) {
        // An override for this date replaces the weekly rule entirely — that is
        // how a mentor opens an unusual Saturday or closes a normal Tuesday.
        const overrides = mine.filter((r) => r.onDate === d);
        const windows = overrides.length ? overrides : mine.filter((r) => r.weekday === weekdayOf(d));

        for (const w of windows) {
            if (w.closed) continue;
            const open = wallClockToInstant(d, w.startTime, tz).getTime();
            const close = wallClockToInstant(d, w.endTime, tz).getTime();

            for (let t = open; t + len * MIN <= close; t += len * MIN) {
                if (t < floor) continue;
                if (busy.some((b) => t < b.to && t + len * MIN > b.from)) continue;
                out.push({
                    startsAt: new Date(t).toISOString(),
                    endsAt: new Date(t + len * MIN).toISOString(),
                });
            }
        }
        d = addDays(d, 1);
    }
    return out.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/** Group slots by their civil date in `tz`, for a day-by-day picker. */
export function slotsByDay(slots: Slot[], tz: string): { date: string; slots: Slot[] }[] {
    const map = new Map<string, Slot[]>();
    for (const s of slots) {
        const k = civilDate(new Date(s.startsAt), tz);
        const list = map.get(k);
        if (list) list.push(s);
        else map.set(k, [s]);
    }
    return [...map.entries()].map(([date, list]) => ({ date, slots: list })).sort((a, b) => a.date.localeCompare(b.date));
}

/** The viewer's own zone, for showing a slot in the time they actually live in. */
export const viewerTz = (): string => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
        return "UTC";
    }
};
