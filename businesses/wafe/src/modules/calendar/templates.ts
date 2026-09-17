import type { EventKind, RecurFreq } from "./types";

/**
 * The rhythms most families start from — the same list the SQL catalogue
 * (`wf_seed_calendar`) provisions per tenant, kept here so the demo's "Start
 * from a rhythm" picker works with no backend at all.
 */
export interface EventTemplate {
    slug: string;
    title: string;
    kind: EventKind;
    /** HH:MM local. */
    start: string;
    minutes: number;
    freq: RecurFreq | null;
    /** 0 = Sunday. Null follows the day you pick. */
    weekday: number | null;
    note: string;
}

export const EVENT_TEMPLATES: EventTemplate[] = [
    { slug: "sunday-service", title: "Sunday service", kind: "church", start: "10:00", minutes: 105, freq: "weekly", weekday: 0, note: "The anchor of the week." },
    { slug: "midweek-study", title: "Midweek Bible study", kind: "church", start: "19:30", minutes: 90, freq: "weekly", weekday: 3, note: "At ours, or wherever it is hosted." },
    { slug: "family-planning", title: "Family planning hour", kind: "event", start: "20:00", minutes: 45, freq: "weekly", weekday: 0, note: "Next week's diary, the money, what we are praying for." },
    { slug: "school-run", title: "School run", kind: "school", start: "08:15", minutes: 45, freq: "weekly", weekday: 1, note: "Give it a colour so the week reads at a glance." },
    { slug: "co-op", title: "Home-ed co-op", kind: "school", start: "09:30", minutes: 180, freq: "weekly", weekday: 2, note: "For the mornings we teach together." },
    { slug: "swimming", title: "Swimming lesson", kind: "school", start: "09:00", minutes: 60, freq: "weekly", weekday: 6, note: "" },
    { slug: "date-night", title: "Date night", kind: "event", start: "19:00", minutes: 180, freq: "monthly", weekday: null, note: "Shared between the two of you; off the children's screens." },
    { slug: "family-dinner", title: "Family dinner", kind: "event", start: "18:00", minutes: 60, freq: "weekly", weekday: 5, note: "Phones in the basket." },
    { slug: "club-ride", title: "Club ride", kind: "event", start: "07:00", minutes: 150, freq: "fortnightly", weekday: 6, note: "" },
    { slug: "grandparents", title: "Call the grandparents", kind: "event", start: "17:00", minutes: 30, freq: "weekly", weekday: 0, note: "The children take turns leading it." },
];
