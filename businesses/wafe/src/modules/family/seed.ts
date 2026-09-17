import type { SeedContext } from "@/data/core";
import type { FamilyState } from "./types";

/**
 * The Adeyemis as a trust boundary.
 *
 * Five values with the meanings Ifeoluwa actually wrote on the kitchen wall, two
 * versions of the mission (January's first attempt and the one they settled on
 * in June), the guests' shares — Mama Fọláké's window on the family from
 * Ibadan, the Okonkwos' single board — a plan with the meter already at 81 %,
 * and an audit log that reads like a family: a grant to a fifteen-year-old, a
 * grandmother allowed to add the things she hosts, a board shared with friends
 * for a birthday and set to expire on its own.
 *
 * Everything is relative to `ctx.today` (Sunday 6 September 2026).
 */

/** The demo's parent PIN. Real spaces set their own; this one is shown on screen so the lock can be tried. */
export const DEMO_PIN = "2468";

export function seed(ctx: SeedContext): FamilyState {
    const [ife, tunde] = ctx.parents;
    const [dami, tobi, ayo] = ctx.kids;
    const [folake, dayo] = ctx.guests;
    /** The Okonkwos are still an invitation; things can be shared with them before they accept. */
    const okonkwos = "inv-1";
    const month = ctx.today.slice(0, 7);

    return {
        values: [
            { id: "val-faith", name: "Faith", meaning: "God first, out loud, on ordinary Tuesdays and not only on Sundays.", order: 0, archivedAt: null },
            { id: "val-love", name: "Love", meaning: "We are for each other. We say the kind thing before we say the clever one.", order: 1, archivedAt: null },
            { id: "val-diligence", name: "Diligence", meaning: "Finish what you start, and do it well enough to sign your name to it.", order: 2, archivedAt: null },
            { id: "val-generosity", name: "Generosity", meaning: "Our table has one more chair than we need, and our giving is planned, not left over.", order: 3, archivedAt: null },
            { id: "val-joy", name: "Joy", meaning: "Music in the kitchen. We laugh in this house.", order: 4, archivedAt: null },
        ],
        // What already points at a value: the reason a value in use is archived
        // rather than deleted. Joy has nothing attached yet — it can be deleted.
        valueLinks: [
            { id: "vl-1", valueId: "val-faith", moduleId: "goals", label: "Goal · Family devotions every weekday", href: "/execute/goals" },
            { id: "vl-2", valueId: "val-faith", moduleId: "bible", label: "Study · Romans, Sunday evenings", href: "/grow/bible" },
            { id: "vl-3", valueId: "val-love", moduleId: "tasks", label: "Chore · Saturday breakfast together", href: "/execute/tasks" },
            { id: "vl-4", valueId: "val-diligence", moduleId: "goals", label: "Goal · Dami's grade 7s at GCSE", href: "/execute/goals" },
            { id: "vl-5", valueId: "val-diligence", moduleId: "curricula", label: "Curriculum · Tobi, Year 5 science", href: "/grow/curricula" },
            { id: "vl-6", valueId: "val-generosity", moduleId: "finance", label: "Budget · Tithes and giving", href: "/live/finance" },
        ],
        missions: [
            {
                id: "mis-2",
                mission: "To raise a family that loves God, loves people and builds things that last.",
                vision: "By 2031: three children who pray on their own, a paid-off home in Croydon, a business that funds the giving, and a December in Lagos every other year.",
                legacy: "That the Adeyemi name means: they kept their word, they opened their door, and they left people better than they found them.",
                authorId: ife.id,
                createdAt: ctx.at(-83, "21:40"),
            },
            {
                id: "mis-1",
                mission: "To be a happy, godly family that works hard and looks after each other.",
                vision: "A calm house, a full table, no debt.",
                legacy: "",
                authorId: tunde.id,
                createdAt: ctx.at(-238, "20:05"),
            },
        ],
        shares: [
            { id: "shr-1", memberId: folake.id, objectType: "trip", objectId: "trip-lagos", label: "Christmas in Lagos", href: "/live/travel", level: "contribute", grantedBy: tunde.id, grantedAt: ctx.at(-46, "19:20"), expiresAt: null },
            { id: "shr-2", memberId: folake.id, objectType: "wall", objectId: "wall-prayer", label: "The prayer wall", href: "/grow/bible", level: "contribute", grantedBy: ife.id, grantedAt: ctx.at(-201, "08:30"), expiresAt: null },
            { id: "shr-3", memberId: folake.id, objectType: "album", objectId: "album-summer", label: "Album · Summer in Croydon", href: "/create/memories", level: "view", grantedBy: ife.id, grantedAt: ctx.at(-24, "18:05"), expiresAt: null },
            { id: "shr-4", memberId: folake.id, objectType: "album", objectId: "album-ayo-reception", label: "Album · Ayo starts Reception", href: "/create/memories", level: "view", grantedBy: ife.id, grantedAt: ctx.at(-9, "17:10"), expiresAt: null },
            { id: "shr-5", memberId: folake.id, objectType: "event", objectId: "evt-tobi-birthday", label: "Tobi's 10th birthday", href: "/execute/calendar", level: "view", grantedBy: ife.id, grantedAt: ctx.at(-6, "12:00"), expiresAt: null },
            { id: "shr-6", memberId: dayo.id, objectType: "session", objectId: "ses-tunde", label: "Mentor sessions with Oluwafemi", href: "/family/people", level: "contribute", grantedBy: tunde.id, grantedAt: ctx.at(-120, "10:00"), expiresAt: null },
            // Friends, one board, and it lets itself out afterwards.
            { id: "shr-7", memberId: okonkwos, objectType: "board", objectId: "board-tobi-10", label: "Tobi's 10th birthday board", href: "/create/moodboards", level: "contribute", grantedBy: ife.id, grantedAt: ctx.at(-3, "20:15"), expiresAt: ctx.at(11, "23:59") },
        ],
        audit: [
            { id: "aud-1", at: ctx.at(-3, "20:15"), actorId: ife.id, action: "share", targetType: "board", targetId: "board-tobi-10", summary: "Shared Tobi's 10th birthday board with the Okonkwos (contribute), until the party", before: null, after: "contribute" },
            { id: "aud-2", at: ctx.at(-6, "12:00"), actorId: ife.id, action: "share", targetType: "event", targetId: "evt-tobi-birthday", summary: "Shared Tobi's 10th birthday with Mama Fọláké (view)", before: null, after: "view" },
            { id: "aud-3", at: ctx.at(-9, "17:10"), actorId: ife.id, action: "share", targetType: "album", targetId: "album-ayo-reception", summary: "Shared the album “Ayo starts Reception” with Mama Fọláké (view)", before: null, after: "view" },
            { id: "aud-4", at: ctx.at(-14, "21:05"), actorId: ife.id, action: "permission", targetType: "member", targetId: dami.id, summary: "Gave Dami the family budget (view only) and her own calendar", before: "none", after: "finance.view, calendar.manage" },
            { id: "aud-5", at: ctx.at(-30, "09:40"), actorId: tunde.id, action: "settings", targetType: "space", targetId: ctx.space.id, summary: "Moved the evening check-in from 20:00 to 19:30", before: "20:00", after: "19:30" },
            { id: "aud-6", at: ctx.at(-46, "19:20"), actorId: tunde.id, action: "share", targetType: "trip", targetId: "trip-lagos", summary: "Shared Christmas in Lagos with Mama Fọláké (contribute)", before: null, after: "contribute" },
            { id: "aud-7", at: ctx.at(-58, "07:55"), actorId: ife.id, action: "childmode", targetType: "member", targetId: tobi.id, summary: "Turned child mode on for Tobi", before: "off", after: "on" },
            { id: "aud-8", at: ctx.at(-83, "21:40"), actorId: ife.id, action: "mission", targetType: "space", targetId: ctx.space.id, summary: "Rewrote the mission after the June planning weekend", before: "v1", after: "v2" },
            { id: "aud-9", at: ctx.at(-112, "18:30"), actorId: ife.id, action: "permission", targetType: "member", targetId: folake.id, summary: "Let Mama Fọláké add the events she hosts", before: "none", after: "calendar.manage" },
            { id: "aud-10", at: ctx.at(-140, "13:10"), actorId: ife.id, action: "band", targetType: "member", targetId: dami.id, summary: "Moved Dami from Teen to Young adult on her fifteenth birthday", before: "teen", after: "young-adult" },
            { id: "aud-11", at: ctx.at(-238, "20:05"), actorId: tunde.id, action: "values", targetType: "space", targetId: ctx.space.id, summary: "Wrote the five values on the kitchen wall", before: null, after: "Faith · Love · Diligence · Generosity · Joy" },
        ],
        settings: {
            weekStart: 1,
            briefingHour: 7,
            checkinHour: 19,
            // Sunday is the family's grace day: nothing is "missed" on a Sunday.
            graceDays: [7],
            purchaseApprovalCents: 25000,
            plan: "household",
            quietFrom: "21:00",
            quietTo: "07:00",
            digestAbove: 5,
            notifyPush: true,
            notifyEmail: true,
        },
        guestTags: { [folake.id]: "relative", [dayo.id]: "mentor", [okonkwos]: "friend" },
        childMode: { [dami.id]: false, [tobi.id]: true, [ayo.id]: true },
        // Explicit decisions a parent made, kept apart from the band defaults so
        // a birthday never quietly undoes one (and never quietly restores one).
        overrides: {
            // Tobi is nine: the Teen band would hand him the whole studio, and
            // Ifeoluwa has said no in advance. Moving him up must not undo that.
            [tobi.id]: { "studio.full": false },
            // Dami has the budget view her band gives her, but not the boards.
            [dami.id]: { "moodboards.manage": false },
            // Mama Fọláké is a guest and guests get nothing: this one is a yes.
            [folake.id]: { "calendar.manage": true },
        },
        pinSet: true,
        usage: { month, calls: 486, images: 22, mediaMb: 6420, reels: 3 },
        exports: [{ id: "exp-1", requestedBy: ife.id, requestedAt: ctx.at(-64, "22:15"), status: "ready", readyAt: ctx.at(-64, "22:16"), bytes: 41_268_310, note: "Everything, for the family archive drive." }],
        handovers: [],
    };
}
