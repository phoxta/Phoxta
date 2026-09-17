import type { SeedContext, Visibility } from "@/data/core";
import type { CalEvent, CalendarState, EventAttendee, EventKind, IcsToken, RecurRule, Rsvp, RsvpResponse } from "./types";

/**
 * The Adeyemis' week, as it actually runs.
 *
 * Sunday at Grace Chapel, co-op on Tuesday and Thursday, Bible study on
 * Wednesday, swimming on Saturday, planning on Sunday night — plus the things
 * that make a diary a real one: a private GP appointment, a date night the
 * children cannot see, Dami's mocks, a flight to collect, and Christmas in
 * Lagos. Everything is anchored to `ctx.today` and to the weekday it belongs
 * on, so the demo reads correctly whatever day it is opened.
 *
 * Two things are deliberately NOT here: birthdays (People owns them, and the
 * calendar draws them as overlays — AC 8) and task deadlines (Tasks owns
 * those). Seeding them would be the duplication the acceptance criteria
 * forbid.
 */

export function seed(ctx: SeedContext): CalendarState {
    const { at, uid, img, space } = ctx;
    const dow = new Date(`${ctx.today}T00:00:00`).getDay(); // 0 = Sunday

    /** The n-th occurrence of a weekday relative to this week (weeks may be negative). */
    const on = (weekday: number, weeks: number, hhmm: string): string => at(((weekday - dow + 7) % 7) + weeks * 7, hhmm);

    const SUN = 0;
    const MON = 1;
    const TUE = 2;
    const WED = 3;
    const THU = 4;
    const SAT = 6;

    const who = (...ids: string[]): EventAttendee[] => ids.map((memberId) => ({ memberId, required: true }));
    const optional = (list: EventAttendee[], ...ids: string[]): EventAttendee[] => [...list, ...ids.map((memberId) => ({ memberId, required: false }))];
    const weekly = (weekday: number): RecurRule => ({ freq: "weekly", weekday, monthDay: null, until: null });
    const fortnightly = (weekday: number): RecurRule => ({ freq: "fortnightly", weekday, monthDay: null, until: null });

    const events: CalEvent[] = [];
    const ev = (
        title: string,
        startAt: string,
        endAt: string,
        opts: Partial<Omit<CalEvent, "id" | "spaceId" | "title" | "startAt" | "endAt">> = {},
    ): CalEvent => {
        const row: CalEvent = {
            id: uid("event"),
            spaceId: space.id,
            title,
            notes: "",
            startAt,
            endAt,
            allDay: false,
            location: "",
            kind: "event",
            attendees: [],
            colourMemberId: null,
            rrule: null,
            reminderMinutes: null,
            communityId: null,
            tripId: null,
            coverUrl: null,
            visibility: "family",
            sharedWith: [],
            childSafe: true,
            createdBy: "mem-ife",
            createdAt: at(-30, "20:00"),
            updatedAt: at(-30, "20:00"),
            ...opts,
        };
        events.push(row);
        return row;
    };

    const allDay = (title: string, fromIso: string, toIso: string, opts: Partial<Omit<CalEvent, "id" | "spaceId" | "title" | "startAt" | "endAt">> = {}): CalEvent =>
        ev(title, fromIso, toIso, { allDay: true, ...opts });

    // -----------------------------------------------------------------------
    // The rhythm — recurring rows, started far enough back that last week and
    // next week both have them.
    // -----------------------------------------------------------------------

    const chapel = ev("Grace Chapel — Sunday service", on(SUN, -3, "10:00"), on(SUN, -3, "11:45"), {
        kind: "church",
        location: "Grace Chapel, Thornton Heath",
        rrule: weekly(SUN),
        reminderMinutes: 60,
        // People's community rows are seeded in order: chapel, co-op, cycling club.
        communityId: "community-1",
        coverUrl: img("calendar-church"),
        notes: "Family service. We are on the welcome team on the first Sunday of the month.",
        createdBy: "mem-tunde",
    });

    ev("Croydon Home-Ed Co-op", on(TUE, -3, "09:30"), on(TUE, -3, "12:30"), {
        kind: "school",
        location: "St Mary's Hall, Addiscombe",
        attendees: optional(who("mem-tobi", "mem-ayo"), "mem-ife"),
        rrule: weekly(TUE),
        reminderMinutes: 60,
        communityId: "community-2",
        coverUrl: img("calendar-coop"),
        colourMemberId: "mem-tobi",
    });

    ev("Croydon Home-Ed Co-op", on(THU, -3, "09:30"), on(THU, -3, "12:30"), {
        kind: "school",
        location: "St Mary's Hall, Addiscombe",
        attendees: optional(who("mem-tobi", "mem-ayo"), "mem-ife"),
        rrule: weekly(THU),
        reminderMinutes: 60,
        communityId: "community-2",
        colourMemberId: "mem-tobi",
    });

    const bible = ev("Bible study at ours", on(WED, -3, "19:30"), on(WED, -3, "21:00"), {
        kind: "church",
        location: "Our living room",
        attendees: optional(who("mem-tunde", "mem-ife"), "mem-dayo"),
        rrule: weekly(WED),
        reminderMinutes: 180,
        coverUrl: img("calendar-biblestudy"),
        notes: "Oluwafemi leads. Eight of us, plus whoever Ronke brings.",
        createdBy: "mem-tunde",
    });

    const swimming = ev("Tobi's swimming lesson", on(SAT, -3, "09:00"), on(SAT, -3, "10:00"), {
        kind: "school",
        location: "Croydon Sports Arena",
        attendees: optional(who("mem-tobi"), "mem-tunde"),
        rrule: weekly(SAT),
        reminderMinutes: 60,
        coverUrl: img("calendar-swim"),
        colourMemberId: "mem-tobi",
    });

    ev("Addiscombe CC — club ride", on(SAT, -2, "07:00"), on(SAT, -2, "09:30"), {
        kind: "event",
        location: "Lloyd Park gates",
        attendees: who("mem-tunde"),
        rrule: fortnightly(SAT),
        communityId: "community-3",
        colourMemberId: "mem-tunde",
        createdBy: "mem-tunde",
    });

    ev("Piano with Mrs Yewande", on(MON, -3, "17:00"), on(MON, -3, "17:45"), {
        kind: "appointment",
        location: "At home",
        attendees: who("mem-dami"),
        rrule: weekly(MON),
        reminderMinutes: 15,
        colourMemberId: "mem-dami",
    });

    ev("Sunday planning", on(SUN, -3, "20:00"), on(SUN, -3, "20:45"), {
        kind: "event",
        location: "Kitchen table",
        attendees: optional(who("mem-ife", "mem-tunde"), "mem-dami"),
        rrule: weekly(SUN),
        reminderMinutes: 60,
        coverUrl: img("calendar-hero"),
        notes: "Next week's diary, the money, one thing we are each praying about.",
    });

    // -----------------------------------------------------------------------
    // Behind us
    // -----------------------------------------------------------------------

    ev("GP — asthma review", at(-6, "11:20"), at(-6, "11:50"), {
        kind: "appointment",
        location: "Parchmore Medical Centre",
        attendees: who("mem-ife"),
        // A parent's own appointment: private, so not even Oluwafemi's screen holds it.
        visibility: "private" as Visibility,
        childSafe: false,
        colourMemberId: "mem-ife",
    });

    ev("Book club — 'Things Fall Apart'", at(-3, "20:00"), at(-3, "22:00"), {
        kind: "event",
        location: "Kemi's, Thornton Heath",
        attendees: who("mem-ife"),
        colourMemberId: "mem-ife",
    });

    allDay("Oluwafemi — team offsite", at(-5, "00:00"), at(-5, "23:59"), {
        kind: "event",
        location: "Canary Wharf",
        attendees: who("mem-tunde"),
        colourMemberId: "mem-tunde",
        createdBy: "mem-tunde",
    });

    ev("Ayo — Reception settling-in morning", at(-9, "09:00"), at(-9, "11:00"), {
        kind: "school",
        location: "Woodside Primary",
        attendees: optional(who("mem-ayo"), "mem-ife"),
        colourMemberId: "mem-ayo",
    });

    ev("Dami — GCSE options meeting", at(-11, "16:30"), at(-11, "17:30"), {
        kind: "school",
        location: "Harris Academy, Purley",
        attendees: who("mem-dami", "mem-ife"),
        colourMemberId: "mem-dami",
    });

    // -----------------------------------------------------------------------
    // Today — including the clash the family should be warned about (AC 6)
    // -----------------------------------------------------------------------

    ev("Harvest lunch at the chapel", at(0, "13:00"), at(0, "15:00"), {
        kind: "church",
        location: "Grace Chapel hall",
        reminderMinutes: 60,
        communityId: "community-1",
        notes: "Bring jollof for twelve and the folding table.",
        createdBy: "mem-tunde",
    });

    const call = ev("Video call with Mama Fọláké", at(0, "14:00"), at(0, "14:45"), {
        kind: "event",
        location: "WhatsApp",
        attendees: optional(who("mem-ife", "mem-ayo"), "mem-folake"),
        reminderMinutes: 15,
        notes: "Ayo wants to read her memory verse to Grandma.",
    });

    // -----------------------------------------------------------------------
    // Ahead of us
    // -----------------------------------------------------------------------

    ev("Library reading challenge", at(3, "10:30"), at(3, "11:30"), {
        kind: "event",
        location: "Croydon Central Library",
        attendees: optional(who("mem-tobi", "mem-ayo"), "mem-ife"),
        colourMemberId: "mem-ayo",
    });

    ev("Tobi's science fair", at(4, "13:00"), at(4, "15:30"), {
        kind: "school",
        location: "St Mary's Hall, Addiscombe",
        attendees: optional(who("mem-tobi", "mem-ife", "mem-tunde"), "mem-folake"),
        reminderMinutes: 1440,
        coverUrl: img("calendar-sciencefair"),
        notes: "The volcano board and the write-up. Judging at 14:15.",
        colourMemberId: "mem-tobi",
    });

    ev("Parents' evening — Dami, Year 11", at(8, "17:00"), at(8, "19:00"), {
        kind: "school",
        location: "Harris Academy, Purley",
        attendees: who("mem-ife", "mem-tunde"),
        reminderMinutes: 1440,
    });

    ev("Dentist — Tobi & Ayo", at(9, "15:20"), at(9, "16:00"), {
        kind: "appointment",
        location: "Whitgift Dental Practice",
        attendees: optional(who("mem-tobi", "mem-ayo"), "mem-ife"),
        reminderMinutes: 1440,
    });

    ev("Date night", at(12, "19:00"), at(12, "22:00"), {
        kind: "event",
        location: "Le Cassoulet, South Croydon",
        attendees: who("mem-ife", "mem-tunde"),
        // Shared between the two of them: the children's screens never hold it.
        visibility: "shared" as Visibility,
        sharedWith: ["mem-ife", "mem-tunde"],
        childSafe: false,
        reminderMinutes: 180,
        coverUrl: img("calendar-datenight"),
        notes: "Booked. Dami is babysitting — £15 and a lift to Amara's after.",
    });

    ev("Ayo's swimming gala", at(13, "09:30"), at(13, "11:30"), {
        kind: "event",
        location: "Croydon Sports Arena",
        attendees: optional(who("mem-ayo"), "mem-ife", "mem-tobi"),
        colourMemberId: "mem-ayo",
    });

    ev("Mama Fọláké lands — Heathrow T3", at(18, "06:20"), at(18, "07:30"), {
        kind: "trip",
        location: "Heathrow Terminal 3",
        attendees: optional(who("mem-folake"), "mem-tunde"),
        reminderMinutes: 1440,
        notes: "Arik from Lagos. Oluwafemi collecting; leave at 04:45.",
        createdBy: "mem-tunde",
    });

    ev("Men's breakfast", at(20, "08:00"), at(20, "09:30"), {
        kind: "church",
        location: "Grace Chapel",
        attendees: optional(who("mem-tunde"), "mem-dayo"),
        communityId: "community-1",
        createdBy: "mem-tunde",
    });

    ev("Book club — 'Half of a Yellow Sun'", at(25, "20:00"), at(25, "22:00"), {
        kind: "event",
        location: "Ours this time",
        attendees: who("mem-ife"),
        colourMemberId: "mem-ife",
    });

    // Five days of mocks — in the demo's frame, 5–9 October.
    allDay("Dami's mock exams", at(29, "00:00"), at(33, "23:59"), {
        kind: "school",
        location: "Harris Academy, Purley",
        attendees: who("mem-dami"),
        reminderMinutes: 1440,
        coverUrl: img("calendar-exams"),
        notes: "Maths P1 · English Lit · Chemistry P2 · History · Yorùbá oral.",
        colourMemberId: "mem-dami",
    });

    // Christmas in Lagos, on the real dates, whichever year we are in. The
    // trip module owns the itinerary; this row carries `tripId`, so when Travel
    // is loaded the calendar shows one Christmas, not two.
    const year = Number(ctx.today.slice(0, 4));
    const xmasYear = ctx.today.slice(5) > "12-19" ? year + 1 : year;
    allDay("Christmas in Lagos", new Date(`${xmasYear}-12-19T00:00:00`).toISOString(), new Date(`${xmasYear + 1}-01-03T23:59:00`).toISOString(), {
        kind: "trip",
        location: "Lagos, Nigeria",
        attendees: who("mem-ife", "mem-tunde", "mem-dami", "mem-tobi", "mem-ayo"),
        tripId: "trip-lagos",
        coverUrl: img("calendar-lagos"),
        notes: "Sixteen days at Baba's. Passports for Tobi and Ayo expire in February — renew first.",
        createdBy: "mem-tunde",
    });

    // -----------------------------------------------------------------------
    // Who answered
    // -----------------------------------------------------------------------

    const rsvp = (eventId: string, memberId: string, response: RsvpResponse, note: string, days: number): Rsvp => ({
        id: uid("rsvp"),
        eventId,
        memberId,
        response,
        note,
        at: at(days, "19:30"),
    });

    const rsvps: Rsvp[] = [
        rsvp(call.id, "mem-folake", "yes", "I will be by the window where the line is better.", -1),
        rsvp(call.id, "mem-ife", "yes", "", -1),
        rsvp(bible.id, "mem-dayo", "yes", "I'll bring the study notes on James 2.", -4),
        rsvp(swimming.id, "mem-tobi", "yes", "", -6),
        rsvp(chapel.id, "mem-tunde", "yes", "", -7),
        // Tobi's science fair is deliberately unanswered by Mama Fọláké — the
        // guest RSVP is the demo's own acceptance test (AC 5).
    ];

    // -----------------------------------------------------------------------
    // Feeds
    // -----------------------------------------------------------------------

    const token = (label: string, scope: IcsToken["scope"], memberId: string | null, tokenValue: string, createdDays: number, revokedDays: number | null): IcsToken => ({
        id: uid("ics"),
        spaceId: space.id,
        memberId,
        token: tokenValue,
        scope,
        label,
        createdAt: at(createdDays, "21:00"),
        revokedAt: revokedDays === null ? null : at(revokedDays, "08:10"),
        lastSyncedAt: revokedDays === null ? at(0, "07:55") : null,
    });

    const tokens: IcsToken[] = [
        token("The whole family", "space", null, "wf-space-adewale-7f3a91", -40, null),
        token("Oluwafemi's phone", "member", "mem-tunde", "wf-tunde-2c8b4e", -38, null),
        token("Dami — old school laptop", "member", "mem-dami", "wf-dami-91ac07", -22, -4),
    ];

    return {
        events,
        rsvps,
        tokens,
        weeks: [
            {
                weekStart: weekStartIso(at(-7, "00:00")),
                confirmedBy: "mem-ife",
                confirmedAt: at(-7, "20:40"),
                note: "Swapped the dentist and told the co-op Tobi is presenting.",
            },
        ],
    };

    function weekStartIso(iso: string): string {
        const d = new Date(iso);
        d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
}

/** Used by the tests in the demo: which seeded rows exercise which criterion. */
export const SEED_NOTES = {
    clashToday: "Harvest lunch (13:00–15:00) overlaps the video call with Mama Fọláké (14:00–14:45).",
    guestRsvp: "Mama Fọláké is invited to Tobi's science fair and has not answered.",
    childHidden: "Date night is shared between the parents only.",
    revokedFeed: "Dami's old school laptop feed was revoked four days ago.",
} as const;

/** Kinds a seeded event may carry, exported so the dialog's default matches the data. */
export const DEFAULT_KIND: EventKind = "event";
