import type { DateRage } from "@/types/domain";

const SHORT: Intl.DateTimeFormatOptions = { month: "short", day: "2-digit" };

/** "Oct 05 - Oct 09" — the label the search forms and pickers show for a range. */
export function formatDateRange([startDate, endDate]: DateRage): string {
    const start = startDate?.toLocaleDateString("en-US", SHORT) ?? "";
    const end = endDate ? ` - ${endDate.toLocaleDateString("en-US", SHORT)}` : "";
    return start + end;
}

/** A date `days` from today at local midnight. */
export function daysFromToday(days: number): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + days);
    return d;
}
