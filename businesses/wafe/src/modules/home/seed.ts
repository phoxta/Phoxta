import type { SeedContext } from "@/data/core";
import { addDays, isoDate } from "@/lib/format";
import { seedOpeningLine, weekOf } from "./derive";
import { TIMELINE_HREF } from "./peek";
import type { HomeState } from "./types";

/**
 * The Adeyemis' rhythm, already running.
 *
 * A family that has just installed a planner has nothing to look at, so the
 * demo starts mid-stride: last Sunday's planning set this week's three
 * priorities, Ifeoluwa has checked in five evenings running (and named the small
 * thing she was grateful for), Oluwafemi's briefing is sitting there written from
 * the template, and the timeline goes back far enough that "On this day" has
 * something to say — including one entry only Ifeoluwa can see and one only Mama
 * Fọláké was shown, so the privacy model is visible by switching member.
 */
export function seed(ctx: SeedContext): HomeState {
    // The demo family always has these seven; a space someone has edited
    // might not, so nothing here dereferences a member that isn't there.
    const anyone = ctx.members[0];
    const ife = ctx.parents[0] ?? anyone;
    const tunde = ctx.parents[1] ?? ife;
    const dami = ctx.kids[0] ?? ife;
    const tobi = ctx.kids[1] ?? dami;
    const ayo = ctx.kids[2] ?? tobi;
    const folake = ctx.guests[0] ?? tunde;

    /**
     * N days from today, anchored at local noon.
     *
     * `ctx.day()` builds the date at midnight and then truncates the UTC
     * string, which lands a day early anywhere east of Greenwich — including
     * Croydon in British Summer Time. The check-in streak is counted in whole
     * days, so an hour's drift would quietly break it.
     */
    const d = (n: number): string => isoDate(addDays(`${ctx.today}T12:00:00`, n));

    /** The same day of the year, N years back — what "On this day" hangs on. */
    const year = Number(ctx.today.slice(0, 4));
    const md = ctx.today.slice(5);
    const yearsAgo = (n: number): string => `${year - n}-${md}`;

    const thisWeek = weekOf(ctx.today);
    const lastWeek = weekOf(d(-7));

    return {
        briefings: [
            {
                id: ctx.uid("brief"),
                memberId: tunde.id,
                date: ctx.today,
                when: "morning",
                // The day is GENERATED, never typed. This line used to read
                // "It is Sunday — the family's planning day" while the header
                // two inches above rendered whatever day the demo actually
                // opened on, and a demo that contradicts itself in its first
                // two lines is worse than a plainer one.
                text:
                    `Good morning, Oluwafemi. ${seedOpeningLine(ctx.today, ctx.space.planningDay)}\n\n` +
                    "Bible study is at 19:30 and you are leading; the passage carries on from last week. Ifeoluwa has the three priorities from last Sunday still open — the school rhythm, the Lagos flights and the kitchen quotes — and the flights are the one with a deadline attached to it, because the fares move.\n\n" +
                    "Nothing is overdue for you today. If you get half an hour, the Christmas in Lagos list is the thing that will feel best to touch.",
                sources: ["2 events today", "Week focus · 3 priorities", "Trip · Christmas in Lagos", "0 tasks overdue"],
                kind: "template",
                generatedAt: ctx.at(0, "06:40"),
            },
        ],
        checkIns: [
            {
                id: ctx.uid("checkin"),
                memberId: ife.id,
                date: d(-1),
                mood: 4,
                gratitude: "Ayo read a whole page",
                prayer: "For Oluwafemi's review on Monday, and for Dami to stop carrying the GCSEs alone.",
                questions: ["What went well today?", "What was hard?", "What is one thing you want to carry into tomorrow?"],
                decisions: [
                    { taskId: "seed-task-quotes", title: "Chase the kitchen quotes", action: "reschedule", toMemberId: null, toDate: d(1), note: "Moved to Monday", applied: false },
                    { taskId: "seed-task-loft", title: "Sort the loft boxes", action: "drop", toMemberId: null, toDate: null, note: "Dropped at check-in", applied: false },
                ],
                summary: "A full but good day. Ayo read a whole page by herself; the kitchen quotes moved to Monday and the loft can wait.",
                createdAt: ctx.at(-1, "21:40"),
            },
            {
                id: ctx.uid("checkin"),
                memberId: ife.id,
                date: d(-2),
                mood: 3,
                gratitude: "A quiet hour to work while Ayo napped",
                prayer: "Patience for the afternoons.",
                questions: ["What went well today?", "What was hard?", "What is one thing you want to carry into tomorrow?"],
                decisions: [],
                summary: "Steady. Work got an hour, the afternoons are the hard part.",
                createdAt: ctx.at(-2, "22:05"),
            },
            {
                id: ctx.uid("checkin"),
                memberId: ife.id,
                date: d(-3),
                mood: 5,
                gratitude: "Tobi explained his volcano to Mama Fọláké for twenty minutes",
                prayer: "Thank you for how curious he is.",
                questions: ["What went well today?", "What was hard?", "What is one thing you want to carry into tomorrow?"],
                decisions: [],
                summary: "A lovely day — Tobi talked Mama Fọláké through the whole volcano project.",
                createdAt: ctx.at(-3, "21:15"),
            },
            {
                id: ctx.uid("checkin"),
                memberId: ife.id,
                date: d(-4),
                mood: 3,
                gratitude: "Oluwafemi cooked",
                prayer: "For the groceries to stretch.",
                questions: ["What went well today?", "What was hard?", "What is one thing you want to carry into tomorrow?"],
                decisions: [],
                summary: "Tiring. Oluwafemi cooked, which saved the evening.",
                createdAt: ctx.at(-4, "22:30"),
            },
            {
                id: ctx.uid("checkin"),
                memberId: ife.id,
                date: d(-5),
                mood: 4,
                gratitude: "The co-op morning ran itself",
                prayer: "For the other home-ed mums.",
                questions: ["What went well today?", "What was hard?", "What is one thing you want to carry into tomorrow?"],
                decisions: [],
                summary: "The co-op morning ran itself for once.",
                createdAt: ctx.at(-5, "21:50"),
            },
            {
                id: ctx.uid("checkin"),
                memberId: tunde.id,
                date: d(-1),
                mood: 4,
                gratitude: "Cycled to Shirley Hills before anyone was up",
                prayer: "For wisdom leading study on Sunday.",
                questions: ["What went well today?", "What was hard?", "What is one thing you want to carry into tomorrow?"],
                decisions: [{ taskId: "seed-task-passports", title: "Check Tobi and Ayo's passports", action: "delegate", toMemberId: ife.id, toDate: null, note: "Handed to Ifeoluwa", applied: false }],
                summary: "Good day. An early ride, and the passports are now with Ifeoluwa.",
                createdAt: ctx.at(-1, "22:20"),
            },
            {
                id: ctx.uid("checkin"),
                memberId: tunde.id,
                date: d(-3),
                mood: 3,
                gratitude: "A long call with my brother",
                prayer: "For the Lagos plans to come together.",
                questions: ["What went well today?", "What was hard?", "What is one thing you want to carry into tomorrow?"],
                decisions: [],
                summary: "Long day at work, good call with my brother in the evening.",
                createdAt: ctx.at(-3, "23:00"),
            },
            {
                id: ctx.uid("checkin"),
                memberId: dami.id,
                date: d(-1),
                mood: 3,
                gratitude: "Chemistry finally made sense",
                prayer: "",
                questions: ["What went well today?", "What was hard?", "What do you want tomorrow to look like?"],
                decisions: [],
                summary: "Chemistry clicked. Everything else was fine.",
                createdAt: ctx.at(-1, "22:45"),
            },
            {
                id: ctx.uid("checkin"),
                memberId: tobi.id,
                date: d(-2),
                mood: 5,
                gratitude: "Bella did the new trick",
                prayer: "",
                questions: ["What made you happy today?", "What was tricky?", "What do you want to do tomorrow?"],
                decisions: [],
                summary: "A brilliant day — Bella learned the new trick.",
                createdAt: ctx.at(-2, "19:30"),
            },
        ],
        reviews: [
            {
                id: ctx.uid("review"),
                weekStart: thisWeek,
                hostMemberId: ife.id,
                priorities: ["Settle the school rhythm", "Book Lagos flights", "Finish kitchen quotes"],
                tasksPlanned: 24,
                tasksDone: 19,
                prayersAnswered: 2,
                notes: "First full week of term. Keep the mornings simple: breakfast, verse, out by 08:40. Oluwafemi takes the flights, I take the quotes.",
                completedAt: ctx.at(-7, "19:30"),
            },
            {
                id: ctx.uid("review"),
                weekStart: lastWeek,
                hostMemberId: tunde.id,
                priorities: ["Get the uniforms sorted", "Finish Dami's options form", "Sunday lunch with the Okonkwos"],
                tasksPlanned: 21,
                tasksDone: 17,
                prayersAnswered: 1,
                notes: "Last week before term. Uniforms were the whole week, honestly.",
                completedAt: ctx.at(-14, "19:20"),
            },
        ],
        milestones: [
            {
                id: ctx.uid("moment"),
                date: yearsAgo(4),
                title: "Tobi's first swim",
                body: "Five years old, blue goggles, straight in at the deep end of the Croydon pool while Dami counted the widths.",
                href: TIMELINE_HREF,
                photoUrl: ctx.img("home-swim"),
                memberIds: [tobi.id, dami.id],
                ownerMemberId: ife.id,
                visibility: "child",
                sharedWith: [],
            },
            {
                id: ctx.uid("moment"),
                date: yearsAgo(1),
                title: "Dami's first day of Year 10",
                body: "New blazer, new bag, and a very firm opinion about being photographed at the gate.",
                href: TIMELINE_HREF,
                photoUrl: ctx.img("home-firstday"),
                memberIds: [dami.id],
                ownerMemberId: ife.id,
                visibility: "child",
                sharedWith: [],
            },
            {
                id: ctx.uid("moment"),
                date: yearsAgo(9),
                title: "Our first Sunday planning",
                body: "One notebook, two cups of tea and a promise to do it every week. We have mostly kept it.",
                href: TIMELINE_HREF,
                photoUrl: ctx.img("home-planning"),
                memberIds: [ife.id, tunde.id],
                ownerMemberId: tunde.id,
                visibility: "family",
                sharedWith: [],
            },
            {
                id: ctx.uid("moment"),
                date: yearsAgo(3),
                title: "Mama Fọláké's 65th, on the phone from Ibadan",
                body: "Everyone crowded round the laptop and sang twice because the line dropped the first time.",
                href: TIMELINE_HREF,
                memberIds: [ife.id, tunde.id, dami.id, tobi.id],
                ownerMemberId: ife.id,
                visibility: "shared",
                sharedWith: [folake.id],
            },
            {
                id: ctx.uid("moment"),
                date: yearsAgo(6),
                title: "The consultancy's first client",
                body: "A brand for a bakery in Thornton Heath, paid in full and in cash. I cried in the car.",
                href: TIMELINE_HREF,
                memberIds: [ife.id],
                ownerMemberId: ife.id,
                visibility: "private",
                sharedWith: [],
            },
            {
                id: ctx.uid("moment"),
                date: `${year - 11}-05-14`,
                title: "The day we moved to Croydon",
                body: "Two suitcases, a kettle and a flat above a barber's shop on London Road.",
                href: TIMELINE_HREF,
                photoUrl: ctx.img("home-croydon"),
                memberIds: [ife.id, tunde.id],
                ownerMemberId: tunde.id,
                visibility: "family",
                sharedWith: [],
            },
            {
                id: ctx.uid("moment"),
                date: `${year - 5}-01-22`,
                title: "Ayo's dedication at Grace Chapel",
                body: "Pastor Dayo prayed the blessing and Mama Fọláké watched it three times on video.",
                href: TIMELINE_HREF,
                memberIds: [ayo.id, ife.id, tunde.id],
                ownerMemberId: tunde.id,
                visibility: "child",
                sharedWith: [],
            },
        ],
        resolved: [],
    };
}
