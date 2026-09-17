import type { NotificationKind, SeedContext } from "@/data/core";
import { idempotencyKey, mergeRules } from "./derive";
import type { Channel, FollowUpRule, InlineAction, NotifItem, NotifMark, NotifPrefs, NotificationsState, NudgeEntry, Outcome, RuleOverride, Sensitivity } from "./types";

/**
 * The follow-up catalogue and the Adeyemis' inbox.
 *
 * THE CATALOGUE is the product's default follow-up rules — the twenty-five the
 * brief lists, and the four the completeness review added (a Learning Hub plan
 * item falling due, a newly assigned playlist or reading-plan day, a
 * Book-to-Course week opening, and a reward redemption waiting for a parent's
 * yes). Every one names the job that
 * evaluates it, the window its idempotency key covers, and how many times it
 * will remind before it gives up and parks the thing in Needs attention.
 *
 * THE INBOX is Sunday morning at the Adeyemis': seven things waiting for Ifeoluwa
 * (one of them parked after three reminders), the same approvals fanned out to
 * Oluwafemi, a nudge that came back this morning from a snooze, one that was held
 * overnight by quiet hours and delivered at 07:00, three that were rolled into
 * last night's digest because the day had already used its five, and the
 * children's in-app-only lists. The history alongside it records every attempt
 * the engine made — including the ones it deliberately did not send.
 */

// ---------------------------------------------------------------------------
// The rule catalogue
// ---------------------------------------------------------------------------

type RuleSeed = [key: string, label: string, trigger: string, moduleId: string, kind: NotificationKind, recipient: FollowUpRule["recipientRole"], job: FollowUpRule["job"], windowUnit: FollowUpRule["windowUnit"], maxReminders: number, sensitivity?: Sensitivity, escalateTo?: FollowUpRule["escalateTo"]];

const CATALOGUE: RuleSeed[] = [
    // — Tasks & chores ------------------------------------------------------
    ["task.overdue", "Task overdue", "A task passes its due date and is still open", "tasks", "task", "assignee", "daily-07:00", "day", 3, "general", "parents"],
    ["task.due-tomorrow", "Task due tomorrow", "A task falls due the next day", "tasks", "task", "assignee", "daily-18:00", "once", 1],
    ["task.unassigned", "Nobody owns this task", "A task sits without an owner for two days", "tasks", "task", "parents", "daily-07:00", "day", 2],
    ["chore.streak-missed", "Chore missed twice", "A recurring chore is missed two days running", "tasks", "task", "child", "daily-18:00", "day", 2, "general", "parents"],
    // — Wellbeing & habits --------------------------------------------------
    ["habit.missed-2", "Habit missed two days", "A habit has no log for two days", "wellness", "wellness", "owner", "daily-18:00", "day", 2],
    ["wellness.appointment-2", "Appointment in two days", "A health appointment is 48 hours away", "wellness", "wellness", "parents", "daily-07:00", "once", 2, "health"],
    // — Goals, projects -----------------------------------------------------
    ["milestone.due-7", "Milestone due in a week", "A goal milestone is seven days out", "goals", "goal", "owner", "daily-07:00", "once", 2, "general", "parents"],
    ["goal.stalled-14", "Goal has stalled", "No milestone has moved on a goal for a fortnight", "goals", "goal", "parents", "weekly-sun-17:00", "week", 2],
    ["curricula.assignment-due", "Curriculum assignment due", "An assigned curriculum item falls due", "curricula", "learning", "child", "daily-07:00", "day", 3, "general", "parents"],
    ["project.blocked-7", "Project blocked a week", "A project has been marked blocked for seven days", "projects", "goal", "owner", "weekly-sun-17:00", "week", 2, "general", "parents"],
    // — Learning & books ----------------------------------------------------
    ["learning.assigned-untouched-5", "Assigned lesson untouched", "An assigned lesson has not been opened for five days", "learning", "learning", "child", "daily-07:00", "day", 3, "general", "parents"],
    ["learning.plan-item-due", "Learning plan item due today", "A Learning Hub plan item falls due today", "learning", "learning", "assignee", "daily-07:00", "day", 2],
    ["learning.newly-assigned", "Something new was assigned", "A playlist, course or reading-plan day is assigned to a member", "learning", "learning", "assignee", "on-change", "once", 1],
    ["books.course-week-open", "A course week opens", "The next week of a Book-to-Course plan becomes available", "books", "learning", "assignee", "weekly-sun-17:00", "week", 1],
    ["books.reading-plan-behind", "Reading plan slipping", "A reading plan is three days behind its schedule", "books", "learning", "owner", "weekly-sun-17:00", "week", 2],
    // — Faith ---------------------------------------------------------------
    ["bible.plan-day", "Today's reading", "A Bible reading-plan day is due", "bible", "prayer", "assignee", "daily-07:00", "day", 1],
    ["prayer.request-added", "A prayer request was added", "Someone adds a request to the prayer wall", "bible", "prayer", "everyone", "on-change", "once", 1],
    ["prayer.unanswered-30", "Prayer unanswered a month", "A prayer request has had no update for thirty days", "bible", "prayer", "owner", "weekly-sun-17:00", "once", 2],
    // — Money ---------------------------------------------------------------
    ["bill.due-3", "Bill due in three days", "A recurring bill is due within three days", "finance", "finance", "parents", "daily-07:00", "day", 3, "financial"],
    ["budget.threshold-80", "Budget past 80%", "An envelope crosses 80% of its monthly allowance", "finance", "finance", "parents", "daily-07:00", "week", 2, "financial"],
    ["purchase.approval-pending", "Purchase waiting for approval", "A purchase request needs a parent's decision", "finance", "finance", "parents", "hourly", "day", 3, "financial"],
    ["reward.redemption-pending", "Reward redemption waiting", "A child asks to redeem points for a reward", "family", "family", "parents", "hourly", "day", 3],
    // — Calendar, travel ----------------------------------------------------
    ["event.tomorrow", "Something on tomorrow", "An event the member is on is one day away", "calendar", "event", "assignee", "daily-18:00", "once", 1],
    ["event.rsvp-missing", "RSVP still missing", "An invitation has no answer two days before", "calendar", "event", "assignee", "daily-07:00", "day", 3],
    ["trip.countdown-14", "Trip in a fortnight", "A trip is fourteen days away", "travel", "travel", "everyone", "daily-07:00", "once", 1],
    ["travel.packing-ready", "Packing lists ready", "The packing lists for a trip are generated or change", "travel", "travel", "everyone", "on-change", "once", 2],
    // — Family, home --------------------------------------------------------
    ["birthday.in-7", "Birthday in a week", "A member's birthday is seven days away", "notifications", "family", "parents", "daily-07:00", "once", 1],
    ["celebrate.badge-earned", "Somebody earned something", "A child earns a badge or finishes a plan", "family", "celebrate", "everyone", "on-change", "once", 1],
    ["memories.on-this-day", "On this day", "A memory from a past year falls on today's date", "memories", "family", "everyone", "daily-07:00", "day", 1],
    ["checkin.evening", "Evening check-in still open", "The evening check-in has not been done by 21:00", "home", "briefing", "parents", "daily-18:00", "day", 2],
];

/** The rules the product ships with — the catalogue every family starts from. */
export const DEFAULT_RULES: FollowUpRule[] = CATALOGUE.map(([ruleKey, label, trigger, moduleId, kind, recipientRole, job, windowUnit, maxReminders, sensitivity, escalateTo]) => ({
    ruleKey,
    label,
    trigger,
    moduleId,
    kind,
    sensitivity: sensitivity ?? "general",
    recipientRole,
    job,
    windowUnit,
    maxReminders,
    escalateTo: escalateTo ?? null,
    enabled: true,
}));

const RULE = new Map(DEFAULT_RULES.map((r) => [r.ruleKey, r]));

// ---------------------------------------------------------------------------
// The Adeyemis' inbox
// ---------------------------------------------------------------------------

const OPEN = (label: string): InlineAction => ({ kind: "open", label, done: "Opened" });
const COMPLETE: InlineAction = { kind: "complete", label: "Mark it done", done: "Marked done" };
const APPROVE: InlineAction = { kind: "approve", label: "Approve", done: "Approved" };
const RSVP: InlineAction = { kind: "rsvp", label: "We'll be there", done: "Replied yes" };

/** What the demo stores; `rules` is the catalogue with these overrides applied. */
export interface NotificationsBlob {
    items: NotifItem[];
    marks: NotifMark[];
    prefs: NotifPrefs[];
    overrides: RuleOverride[];
    history: NudgeEntry[];
}

export function seedBlob(ctx: SeedContext): NotificationsBlob {
    const { at, day, uid, space } = ctx;
    const items: NotifItem[] = [];
    const history: NudgeEntry[] = [];

    interface Draft {
        member: string;
        rule: string;
        title: string;
        body: string;
        href?: string | null;
        at: string;
        record?: string | null;
        recordType?: string | null;
        /** The record's own name in the module that owns it (see types.ts). */
        recordTitle?: string | null;
        action?: InlineAction | null;
        read?: string | null;
        snoozed?: string | null;
        acted?: string | null;
        outcome?: string | null;
        deferred?: string | null;
        digest?: string | null;
        reminder?: number;
        parked?: boolean;
        channel?: Channel;
    }

    const add = (d: Draft): NotifItem => {
        const rule = RULE.get(d.rule);
        const item: NotifItem = {
            id: uid("ntfi"),
            spaceId: space.id,
            memberId: d.member,
            ruleKey: d.rule,
            kind: rule?.kind ?? "family",
            sensitivity: rule?.sensitivity ?? "general",
            recordType: d.recordType ?? null,
            recordId: d.record ?? null,
            recordTitle: d.recordTitle ?? null,
            title: d.title,
            body: d.body,
            href: d.href ?? null,
            channel: d.channel ?? "in-app",
            idempotencyKey: idempotencyKey(d.rule, d.record ?? null, d.member, d.at, rule?.windowUnit ?? "day"),
            reminderNumber: d.reminder ?? 1,
            needsAttention: d.parked ?? false,
            action: d.action ?? null,
            actionOutcome: d.outcome ?? null,
            readAt: d.read ?? null,
            snoozedUntil: d.snoozed ?? null,
            actedAt: d.acted ?? null,
            deferredUntil: d.deferred ?? null,
            digestFor: d.digest ?? null,
            isTest: false,
            createdAt: d.at,
        };
        items.push(item);
        return item;
    };

    const log = (ruleKey: string, memberId: string, reminderNumber: number, outcome: Outcome, note: string, sentAt: string, recordId: string | null = null): void => {
        history.push({ id: uid("nudge"), ruleKey, recordId, memberId, reminderNumber, outcome, note, sentAt });
    };

    const ife = "mem-ife";
    const tunde = "mem-tunde";
    const dami = "mem-dami";
    const tobi = "mem-tobi";
    const ayo = "mem-ayo";
    const folake = "mem-folake";
    const dayo = "mem-dayo";

    // --- Ifeoluwa: the seven things waiting, newest last -------------------------
    add({
        member: ife,
        rule: "purchase.approval-pending",
        title: "Dami's laptop is waiting for a decision",
        body: "£520 for a refurbished laptop for GCSE coursework. She asked on Thursday and has been checking every day.",
        href: "/live/finance",
        recordType: "purchase_request",
        record: "purchase-3",
        recordTitle: "A laptop for Dami's GCSEs",
        action: APPROVE,
        at: at(-2, "19:30"),
        channel: "email",
        reminder: 2,
    });
    add({
        member: ife,
        rule: "task.overdue",
        title: "Return the library books",
        body: "Due last Tuesday. Three reminders have gone out, so it has stopped nudging and is parked here instead.",
        href: "/execute/tasks",
        recordType: "task",
        record: "task-library",
        recordTitle: "Return the library books",
        action: COMPLETE,
        at: at(-1, "07:00"),
        reminder: 3,
        parked: true,
        channel: "email",
    });
    add({
        member: ife,
        rule: "celebrate.badge-earned",
        title: "Dami earned 'Verse Master'",
        body: "Twenty verses, seven weeks running. She hasn't mentioned it to anyone.",
        href: "/grow/bible",
        at: at(-1, "20:15"),
    });
    add({
        member: ife,
        rule: "prayer.request-added",
        title: "Mama Fọláké added a prayer request",
        body: "\"For Baba's health, and for a safe December.\" She asked the family to hold it this week.",
        href: "/grow/bible",
        action: OPEN("Open the prayer wall"),
        at: at(0, "06:40"),
    });
    add({
        member: ife,
        rule: "budget.threshold-80",
        title: "Groceries is at 82% of this month's budget",
        body: "£54 left and nine days to go. Last month ended £18 over.",
        href: "/live/finance",
        recordType: "budget",
        record: "groceries",
        action: OPEN("Open the budget"),
        at: at(0, "07:00"),
        channel: "email",
    });
    add({
        member: ife,
        rule: "travel.packing-ready",
        title: "Packing lists are ready for Christmas in Lagos",
        body: "Five lists, one per traveller. Ayo's is missing three things and Tobi's passport expires in February.",
        href: "/live/travel",
        recordType: "trip",
        record: "trip-lagos",
        action: OPEN("Open the trip"),
        at: at(0, "07:10"),
    });
    add({
        member: ife,
        rule: "event.rsvp-missing",
        title: "Tobi's science fair — Thursday 13:00",
        body: "St Mary's Hall, judging at 14:15. Nobody has answered yet, and Mama Fọláké is waiting to hear before she books anything.",
        href: "/execute/calendar",
        recordType: "event",
        record: "evt-science-fair",
        recordTitle: "Tobi's science fair",
        action: RSVP,
        at: at(0, "08:00"),
    });

    // --- Ifeoluwa: earlier, already dealt with ----------------------------------
    add({
        member: ife,
        rule: "bill.due-3",
        title: "Sky broadband renews on Wednesday — £42",
        body: "Same card as last month. Nothing to do unless you want to switch.",
        href: "/live/finance",
        recordType: "bill",
        record: "bill-broadband",
        at: at(-1, "07:00"),
        read: at(-1, "07:24"),
        channel: "email",
    });
    add({
        member: ife,
        rule: "event.tomorrow",
        title: "Sunday planning at 17:00",
        body: "The three priorities for the week, then supper.",
        href: "/execute/calendar",
        recordType: "event",
        record: "evt-planning",
        at: at(-1, "07:02"),
        read: at(-1, "07:25"),
    });
    add({
        member: ife,
        rule: "learning.assigned-untouched-5",
        title: "Tobi hasn't opened \"How volcanoes work\"",
        body: "Assigned on Monday, still not started. Five days.",
        href: "/grow/learning",
        recordType: "lesson",
        record: "lesson-volcanoes",
        at: at(-2, "07:00"),
        read: at(-2, "09:12"),
    });
    add({
        member: ife,
        rule: "habit.missed-2",
        title: "Dami's evening reading was missed two days running",
        body: "Two grace days used. The habit is not broken — it just needs a word.",
        href: "/live/wellness",
        recordType: "habit",
        record: "habit-reading",
        at: at(-3, "18:00"),
        read: at(-3, "19:40"),
        acted: at(-3, "20:05"),
        outcome: "Talked to Dami",
    });
    add({
        member: ife,
        rule: "checkin.evening",
        title: "The evening check-in is still open",
        body: "Two minutes: what went well, what needs a hand tomorrow.",
        href: "/",
        at: at(-1, "21:05"),
        read: at(-1, "21:12"),
        snoozed: at(1, "09:00"),
    });

    // --- Ifeoluwa: last night's digest — the day had used its five --------------
    add({
        member: ife,
        rule: "memories.on-this-day",
        title: "Two years ago today: the Brighton weekend",
        body: "Eleven photos, and the one of Ayo asleep in the deckchair.",
        href: "/create/memories",
        at: at(-1, "12:10"),
        digest: day(-1),
        read: at(-1, "18:40"),
    });
    add({
        member: ife,
        rule: "project.blocked-7",
        title: "The loft project has been blocked for a week",
        body: "Waiting on the second quote. Nobody has chased it.",
        href: "/execute/projects",
        recordType: "project",
        record: "prj-loft",
        at: at(-1, "12:30"),
        digest: day(-1),
        read: at(-1, "18:40"),
    });
    add({
        member: ife,
        rule: "goal.stalled-14",
        title: "\"Read the Bible together in a year\" hasn't moved in a fortnight",
        body: "Day 96 of 365. The last tick was two Sundays ago.",
        href: "/execute/goals",
        recordType: "goal",
        record: "goal-bible-year",
        at: at(-1, "17:00"),
        digest: day(-1),
        read: at(-1, "18:40"),
    });

    // --- Oluwafemi: the same approvals, plus the engine's edges ----------------
    add({
        member: tunde,
        rule: "purchase.approval-pending",
        title: "Dami's laptop is waiting for a decision",
        body: "£520 for a refurbished laptop for GCSE coursework. Ifeoluwa has seen it too — it needs both of you.",
        href: "/live/finance",
        recordType: "purchase_request",
        record: "purchase-3",
        recordTitle: "A laptop for Dami's GCSEs",
        action: APPROVE,
        at: at(-2, "19:30"),
        channel: "email",
        reminder: 2,
    });
    add({
        member: tunde,
        rule: "travel.packing-ready",
        title: "Packing lists are ready for Christmas in Lagos",
        body: "Yours has the adapters and the church gifts on it.",
        href: "/live/travel",
        recordType: "trip",
        record: "trip-lagos",
        action: OPEN("Open the trip"),
        at: at(0, "07:10"),
    });
    add({
        member: tunde,
        rule: "event.rsvp-missing",
        title: "Tobi's science fair — Thursday 13:00",
        body: "He has asked you both twice. Judging is at 14:15 and you have the car.",
        href: "/execute/calendar",
        recordType: "event",
        record: "evt-science-fair",
        recordTitle: "Tobi's science fair",
        action: RSVP,
        at: at(0, "08:00"),
    });
    // Snoozed on Saturday morning, came back by itself at 05:30 today.
    add({
        member: tunde,
        rule: "bill.due-3",
        title: "Sky broadband renews on Wednesday — £42",
        body: "You snoozed this to the weekend. Here it is again.",
        href: "/live/finance",
        recordType: "bill",
        record: "bill-broadband",
        at: at(-1, "07:00"),
        snoozed: at(0, "05:30"),
        channel: "email",
    });
    // Raised at 22:40, inside quiet hours; held and delivered at 07:00.
    add({
        member: tunde,
        rule: "event.tomorrow",
        title: "Addiscombe club ride — Saturday 06:30",
        body: "Held overnight by your quiet hours and delivered this morning.",
        href: "/execute/calendar",
        recordType: "event",
        record: "evt-ride",
        at: at(-1, "22:40"),
        deferred: at(0, "06:30"),
    });
    add({
        member: tunde,
        rule: "curricula.assignment-due",
        title: "Tobi's science fair board is due Thursday",
        body: "Two of the four sections are still empty.",
        href: "/grow/curricula",
        recordType: "assignment",
        record: "asg-sciencefair",
        at: at(-2, "07:00"),
        read: at(-2, "07:40"),
    });

    // --- Dami (young adult): in-app only, celebrations muted ---------------
    add({
        member: dami,
        rule: "learning.plan-item-due",
        title: "Chemistry paper 2 — 40 minutes at 16:00",
        body: "Then a break. You planned this one yourself on Thursday.",
        href: "/grow/learning",
        recordType: "plan_item",
        record: "plan-chem2",
        action: OPEN("Open the plan"),
        at: at(0, "08:00"),
    });
    add({
        member: dami,
        rule: "task.due-tomorrow",
        title: "Tidy your room before Monday",
        body: "10 Sprouts. Photo proof, as ever.",
        href: "/execute/tasks",
        recordType: "task",
        record: "task-room",
        recordTitle: "Tidy your room",
        action: COMPLETE,
        at: at(0, "07:30"),
    });
    add({
        member: dami,
        rule: "reward.redemption-pending",
        title: "Your cinema reward is with Mum and Dad",
        body: "300 Sprouts. They'll say yes or no today.",
        href: "/family/people",
        recordType: "redemption",
        record: "rdm-cinema",
        at: at(-1, "18:00"),
    });
    add({
        member: dami,
        rule: "bible.plan-day",
        title: "Day 12 — Psalm 62",
        body: "Four verses and one line back to the wall.",
        href: "/grow/bible",
        at: at(-1, "07:00"),
        read: at(-1, "07:35"),
    });

    // --- Tobi (junior) -----------------------------------------------------
    add({
        member: tobi,
        rule: "learning.newly-assigned",
        title: "New lesson: How volcanoes work",
        body: "12 minutes, then three questions. Mum picked it for you.",
        href: "/grow/learning",
        recordType: "lesson",
        record: "lesson-volcanoes",
        action: OPEN("Start the lesson"),
        at: at(0, "08:00"),
    });
    add({
        member: tobi,
        rule: "chore.streak-missed",
        title: "Bella hasn't been fed",
        body: "Yesterday and the day before. She is sitting by her bowl.",
        href: "/execute/tasks",
        recordType: "task",
        record: "task-bella",
        recordTitle: "Feed Bella",
        action: COMPLETE,
        at: at(-1, "17:30"),
        reminder: 2,
    });
    add({
        member: tobi,
        rule: "curricula.assignment-due",
        title: "Science fair board — Thursday",
        body: "You did the volcano diagram. Two panels to go.",
        href: "/grow/curricula",
        recordType: "assignment",
        record: "asg-sciencefair",
        at: at(-2, "07:00"),
        read: at(-2, "16:10"),
    });

    // --- Ayo (little) ------------------------------------------------------
    add({
        member: ayo,
        rule: "bible.plan-day",
        title: "Memory verse with Mum",
        body: "\"Be kind to one another.\" Two goes and a sticker.",
        href: "/grow/bible",
        action: OPEN("Say it"),
        at: at(0, "08:30"),
    });
    add({
        member: ayo,
        rule: "celebrate.badge-earned",
        title: "You earned the Reader badge!",
        body: "Twelve books. Twelve!",
        href: "/grow/books",
        at: at(-2, "19:00"),
        read: at(-2, "19:20"),
    });

    // --- The guests: only what they were granted ---------------------------
    add({
        member: folake,
        rule: "travel.packing-ready",
        title: "Your packing list for Lagos is ready",
        body: "Oluwafemi added the wrappers and the photographs you asked for.",
        href: "/live/travel",
        recordType: "trip",
        record: "trip-lagos",
        action: OPEN("Open the list"),
        at: at(0, "07:10"),
    });
    add({
        member: folake,
        rule: "prayer.request-added",
        title: "Your prayer request is on the family wall",
        body: "Ifeoluwa and Oluwafemi are holding it this week.",
        href: "/grow/bible",
        at: at(-1, "09:00"),
        read: at(-1, "09:30"),
        channel: "email",
    });
    add({
        member: dayo,
        rule: "event.rsvp-missing",
        title: "Men's breakfast at Grace Chapel",
        body: "Oluwafemi is coming and asked whether you are leading it. Nobody has answered yet.",
        href: "/execute/calendar",
        recordType: "event",
        record: "evt-mens-breakfast",
        recordTitle: "Men's breakfast",
        action: RSVP,
        at: at(0, "08:00"),
        channel: "email",
    });

    // --- What the engine actually did --------------------------------------
    log("task.overdue", ife, 1, "delivered", "First reminder, the morning after it fell due.", at(-5, "07:00"), "task-library");
    log("task.overdue", ife, 2, "delivered", "Second reminder.", at(-3, "07:00"), "task-library");
    log("task.overdue", ife, 3, "delivered", "Third and last reminder.", at(-1, "07:00"), "task-library");
    log("task.overdue", ife, 3, "parked", "3 reminders sent — parked in Needs attention instead.", at(0, "07:00"), "task-library");
    log("purchase.approval-pending", ife, 1, "delivered", "Delivered by email.", at(-2, "19:30"), "purchase-3");
    log("purchase.approval-pending", tunde, 1, "delivered", "Delivered by email.", at(-2, "19:30"), "purchase-3");
    log("purchase.approval-pending", ife, 2, "duplicate", "Already sent today.", at(0, "11:00"), "purchase-3");
    log("event.tomorrow", tunde, 1, "held", "Quiet hours — waiting until 06:30.", at(-1, "22:40"), "evt-ride");
    log("memories.on-this-day", ife, 1, "digest", "5 already today — added to the 18:00 digest.", at(-1, "12:10"), null);
    log("project.blocked-7", ife, 1, "digest", "5 already today — added to the 18:00 digest.", at(-1, "12:30"), "prj-loft");
    log("goal.stalled-14", ife, 1, "digest", "5 already today — added to the 18:00 digest.", at(-1, "17:00"), "goal-bible-year");
    log("celebrate.badge-earned", dami, 1, "muted", "Dami muted Celebrations.", at(-1, "20:15"), null);
    log("budget.threshold-80", tobi, 1, "blocked", "Tobi can't read financial records, so nothing was sent.", at(0, "07:00"), "groceries");
    log("celebrate.badge-earned", ife, 1, "delivered", "Delivered in-app.", at(-1, "20:15"), null);
    log("travel.packing-ready", folake, 1, "delivered", "Delivered in-app.", at(0, "07:10"), "trip-lagos");
    log("learning.newly-assigned", tobi, 1, "delivered", "Children receive in-app only.", at(0, "08:00"), "lesson-volcanoes");

    // --- Preferences -------------------------------------------------------
    const pref = (memberId: string, p: Partial<NotifPrefs>): NotifPrefs => ({
        memberId,
        inApp: true,
        email: false,
        push: false,
        quietStart: "21:30",
        quietEnd: "07:00",
        digestMode: "auto",
        digestAt: "18:00",
        mutedKinds: [],
        timezone: space.timezone,
        ...p,
    });

    const prefs: NotifPrefs[] = [
        pref(ife, { email: true, push: true, quietStart: "21:30", quietEnd: "07:00" }),
        pref(tunde, { email: true, quietStart: "22:00", quietEnd: "06:30" }),
        pref(dami, { quietStart: "21:00", quietEnd: "07:00", digestMode: "off", mutedKinds: ["celebrate"] }),
        pref(tobi, { quietStart: "19:30", quietEnd: "07:30" }),
        pref(ayo, { quietStart: "19:00", quietEnd: "07:30" }),
        pref(folake, { email: true, quietStart: "21:00", quietEnd: "06:00", mutedKinds: ["task", "finance"] }),
        pref(dayo, { email: true, quietStart: "22:00", quietEnd: "07:00", mutedKinds: ["task", "learning"] }),
    ];

    // Ifeoluwa turned one rule off in July: nobody needed telling twice.
    const overrides: RuleOverride[] = [{ ruleKey: "task.unassigned", enabled: false }];

    // The shell's own notifications get an inbox overlay too — this one was
    // read, dealt with, and marked so it stops coming back.
    const marks: NotifMark[] = [{ notificationId: "ntf-4", memberId: tunde, snoozedUntil: null, actedAt: at(-2, "19:35") }];

    return { items, marks, prefs, overrides, history };
}

/** The module's slice, as the contract asks for it: the blob with rules merged. */
export function seed(ctx: SeedContext): NotificationsState {
    const blob = seedBlob(ctx);
    return { items: blob.items, marks: blob.marks, prefs: blob.prefs, rules: mergeRules(DEFAULT_RULES, blob.overrides), history: blob.history };
}
