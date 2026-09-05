import { clsx, type ClassValue } from "clsx";
import { subDays } from "date-fns";
import { twMerge } from "tailwind-merge";
import type { TExcludeDateIntervals } from "@/types/domain";

/** Tailwind-aware class merge. Only for components that already used it — see forbidden #50. */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Every day before today, as a react-datepicker exclusion interval.
 *
 * Computed on each call rather than at module load: a long-lived tab that
 * crosses midnight would otherwise keep offering yesterday and refuse today.
 */
export function getExcludeDateIntervals(now: Date = new Date()): TExcludeDateIntervals {
    return [{ start: subDays(now, 5000), end: subDays(now, 1) }];
}

/** Local calendar date as YYYY-MM-DD. Never shifts across the UTC boundary. */
export function toLocalDateString(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}
