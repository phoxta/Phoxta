import { daysFromToday } from "@/lib/dates";
import { toLocalDateString } from "@/lib/utils";

/**
 * Date strings for the booking widgets' `<input type="date">` fields and the
 * reservation RPC, which both speak YYYY-MM-DD.
 */

/** Today + n in the visitor's own calendar — never the UTC date, which is a day off for evenings west of Greenwich. */
export function isoDaysFromToday(n: number): string {
    return toLocalDateString(daysFromToday(n));
}

/**
 * Shift a YYYY-MM-DD string by whole days. Done in UTC so a DST change cannot
 * turn "+1 day" into 23 hours and land on the same date. An unparseable input
 * throws, exactly as the upstream `toISOString()` did, so callers' try/catch
 * surfaces it.
 */
export function isoAddDays(iso: string, n: number): string {
    const d = new Date(`${iso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
}
