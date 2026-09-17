import type { SeedContext } from "@/data/core";
import type { ChoreRota, Redemption, Reward, SproutsEntry, Task, TasksState } from "./types";
import { goalProgress, milestoneProgress } from "./derive";

/**
 * A Sunday morning in Croydon, with the week ahead already on the board.
 *
 * Thirty-eight open jobs, five of them late (one late enough that the app has
 * stopped nagging and is asking for a decision instead), the chores each child
 * is on, the dishwasher rota that turns today, a photo waiting on a parent's
 * yes, a reward request from Tobi, and the "Buy a laptop for Dami" that
 * appeared by itself when Ifeoluwa approved the purchase. Every date is relative to
 * `ctx.today`, so the demo is never stale.
 *
 * The Sprouts ledger is seeded backwards from each child's points balance:
 * every chore entry names the finished task that earned it — the older ones
 * too, which is why the history below exists — and one opening "carried over"
 * entry per child makes the arithmetic agree with the number the shell already
 * shows.
 */

export function seed(ctx: SeedContext): TasksState {
    const [ife, tunde] = ctx.parents;
    const [dami, tobi, ayo] = ctx.kids;
    const [folake, dayo] = ctx.guests;
    const { at, day, uid, img } = ctx;

    let order = 0;
    const mk = (t: Partial<Task> & { title: string }): Task => ({
        id: uid("task"),
        title: t.title,
        notes: t.notes ?? "",
        assigneeMemberIds: t.assigneeMemberIds ?? [],
        dueAt: t.dueAt ?? null,
        allDay: t.allDay ?? true,
        priority: t.priority ?? "normal",
        scope: t.scope ?? "family",
        kind: t.kind ?? "task",
        goalId: t.goalId ?? null,
        goalLabel: t.goalLabel ?? "",
        milestoneId: t.milestoneId ?? null,
        milestoneLabel: t.milestoneLabel ?? "",
        projectId: t.projectId ?? null,
        tripId: t.tripId ?? null,
        curriculumId: t.curriculumId ?? null,
        valueId: t.valueId ?? null,
        status: t.status ?? "todo",
        kanbanOrder: t.kanbanOrder ?? (order += 10),
        rrule: t.rrule ?? null,
        isChore: t.isChore ?? false,
        sprouts: t.sprouts ?? 0,
        needsProof: t.needsProof ?? false,
        proofUrl: t.proofUrl ?? null,
        proofSubmittedAt: t.proofSubmittedAt ?? null,
        proofApprovedBy: t.proofApprovedBy ?? null,
        sourceType: t.sourceType ?? "manual",
        sourceId: t.sourceId ?? null,
        droppedReason: null,
        checklist: t.checklist ?? [],
        remindersSent: t.remindersSent ?? 0,
        ownerMemberId: t.ownerMemberId ?? ife.id,
        visibility: t.visibility ?? "family",
        sharedWith: t.sharedWith ?? [],
        childSafe: t.childSafe ?? false,
        doneAt: t.doneAt ?? null,
        doneBy: t.doneBy ?? null,
        createdBy: t.createdBy ?? ife.id,
        createdAt: t.createdAt ?? at(-14, "20:00"),
    });

    const check = (...items: string[]) => items.map((text, i) => ({ id: uid("chk"), text, done: false, order: i }));

    // -----------------------------------------------------------------------
    // Five that are late (one of them past three reminders — it has parked)
    // -----------------------------------------------------------------------
    const overdue: Task[] = [
        mk({
            title: "Renew the car insurance",
            notes: "The renewal quote went up £84. Ring them before it auto-renews on the 15th.",
            assigneeMemberIds: [ife.id],
            dueAt: at(-2, "17:00"),
            priority: "high",
            kind: "errand",
            scope: "us",
            valueId: "Diligence",
            checklist: check("Compare two quotes", "Ring the current insurer", "Cancel the auto-renewal"),
        }),
        mk({ title: "Book Tobi's dental check-up", assigneeMemberIds: [ife.id], dueAt: at(-4, "12:00"), kind: "errand", valueId: "Love" }),
        mk({
            title: "Fix the leaking tap in the downstairs loo",
            notes: "Washer, not the whole tap. The spare set is in the garage drawer.",
            assigneeMemberIds: [tunde.id],
            dueAt: at(-6, "10:00"),
            kind: "maintenance",
            projectId: "proj-3",
            remindersSent: 0,
        }),
        mk({ title: "Send Mama Fọláké's birthday parcel", assigneeMemberIds: [tunde.id], dueAt: at(-1, "16:00"), priority: "high", kind: "errand", valueId: "Love" }),
        mk({ title: "Return the library books", assigneeMemberIds: [tobi.id], dueAt: at(-3, "17:00"), kind: "errand", childSafe: true, visibility: "child" }),
    ];

    // -----------------------------------------------------------------------
    // Chores — the ones worth Sprouts
    // -----------------------------------------------------------------------
    const dishwasher = mk({
        title: "Empty the dishwasher",
        notes: "The rota turns on Sunday. Whoever's turn it is does it every evening that week.",
        assigneeMemberIds: [dami.id],
        dueAt: at(0, "18:30"),
        allDay: false,
        kind: "chore",
        isChore: true,
        sprouts: 10,
        childSafe: true,
        visibility: "child",
        rrule: { freq: "daily", interval: 1, weekday: null, monthDay: null },
        sourceType: "rota",
        createdBy: ife.id,
        ownerMemberId: ife.id,
    });

    const chores: Task[] = [
        dishwasher,
        mk({
            title: "Feed Bella",
            notes: "One scoop, and fresh water. She eats at eight.",
            assigneeMemberIds: [tobi.id],
            dueAt: at(0, "08:00"),
            allDay: false,
            kind: "chore",
            isChore: true,
            sprouts: 10,
            childSafe: true,
            visibility: "child",
            valueId: "Diligence",
            rrule: { freq: "daily", interval: 1, weekday: null, monthDay: null },
        }),
        mk({
            title: "Tidy the shoe rack",
            notes: "Everyone's shoes in pairs, nothing on the floor. Take a photo when it's done.",
            assigneeMemberIds: [ayo.id],
            dueAt: at(0, "17:00"),
            allDay: false,
            kind: "chore",
            isChore: true,
            sprouts: 5,
            needsProof: true,
            childSafe: true,
            visibility: "child",
            rrule: { freq: "weekly", interval: 1, weekday: 0, monthDay: null },
        }),
        mk({
            title: "Hoover the front room",
            notes: "Under the sofa too, please.",
            assigneeMemberIds: [tobi.id],
            dueAt: at(0, "11:00"),
            allDay: false,
            status: "doing",
            kind: "chore",
            isChore: true,
            sprouts: 20,
            needsProof: true,
            proofUrl: img("tasks-proof-hoover"),
            proofSubmittedAt: at(0, "11:40"),
            childSafe: true,
            visibility: "child",
        }),
        mk({
            title: "Bins out",
            notes: "Green bin this week. Out by Wednesday night.",
            assigneeMemberIds: [dami.id],
            dueAt: at(4, "20:00"),
            allDay: false,
            kind: "chore",
            isChore: true,
            sprouts: 15,
            childSafe: true,
            visibility: "child",
            rrule: { freq: "weekly", interval: 1, weekday: 4, monthDay: null },
        }),
        mk({
            title: "Water the tomatoes",
            assigneeMemberIds: [ayo.id],
            dueAt: at(1, "16:30"),
            allDay: false,
            kind: "chore",
            isChore: true,
            sprouts: 5,
            childSafe: true,
            visibility: "child",
            rrule: { freq: "daily", interval: 2, weekday: null, monthDay: null },
        }),
        mk({
            title: "Tidy your room",
            assigneeMemberIds: [dami.id],
            dueAt: at(6, "12:00"),
            kind: "chore",
            isChore: true,
            sprouts: 10,
            childSafe: true,
            visibility: "child",
            rrule: { freq: "weekly", interval: 1, weekday: 6, monthDay: null },
        }),
        mk({
            title: "Practise the piano — 20 minutes",
            assigneeMemberIds: [tobi.id],
            dueAt: at(1, "17:30"),
            allDay: false,
            kind: "chore",
            isChore: true,
            sprouts: 5,
            childSafe: true,
            visibility: "child",
            valueId: "Diligence",
            rrule: { freq: "daily", interval: 1, weekday: null, monthDay: null },
        }),
    ];

    // -----------------------------------------------------------------------
    // The rest of the week
    // -----------------------------------------------------------------------
    const rest: Task[] = [
        mk({ title: "Sunday planning — 30 minutes after lunch", assigneeMemberIds: [ife.id, tunde.id], dueAt: at(0, "14:00"), allDay: false, scope: "us", priority: "high", valueId: "Diligence", checklist: check("Three priorities for the week", "Diary clash check", "Money: anything due?") }),
        mk({ title: "Ring Mum in Ibadan", assigneeMemberIds: [tunde.id], dueAt: at(0, "19:00"), allDay: false, valueId: "Love", rrule: { freq: "weekly", interval: 1, weekday: 0, monthDay: null } }),
        mk({ title: "Pack the PE kit for Monday", assigneeMemberIds: [tobi.id], dueAt: at(0, "18:00"), allDay: false, childSafe: true, visibility: "child" }),
        mk({ title: "Revision block: chemistry paper 2", notes: "Forty minutes, then a break. Past paper 3 afterwards if there's time.", assigneeMemberIds: [dami.id], dueAt: at(0, "16:00"), allDay: false, scope: "me", curriculumId: "cur-2", goalId: "goal-2", goalLabel: "Dami's GCSEs", milestoneId: "ms-goal-2-2", milestoneLabel: "Sciences revised twice", visibility: "child", childSafe: true, createdBy: dami.id, ownerMemberId: dami.id, valueId: "Diligence" }),

        mk({ title: "Weekly shop", assigneeMemberIds: [ife.id], dueAt: at(1, "10:00"), allDay: false, kind: "errand", scope: "us", rrule: { freq: "weekly", interval: 1, weekday: 1, monthDay: null } }),
        mk({ title: "Pay the tithe", assigneeMemberIds: [ife.id], dueAt: at(1, "09:00"), valueId: "Generosity", goalId: "goal-4", goalLabel: "Give ten per cent, every month", milestoneId: "ms-goal-4-1", milestoneLabel: "Twelve months unbroken", scope: "us" }),
        mk({ title: "Move £150 into the Lagos fund", assigneeMemberIds: [ife.id], dueAt: at(1, "09:30"), goalId: "goal-3", goalLabel: "Christmas in Lagos", milestoneId: "ms-goal-3-2", milestoneLabel: "Flights paid for", scope: "us" }),
        mk({ title: "Chase the invoice from Ridley & Co", notes: "Thirty days on Friday.", assigneeMemberIds: [ife.id], dueAt: at(1, "11:00"), priority: "high", scope: "me", visibility: "private", ownerMemberId: ife.id, createdBy: ife.id }),

        mk({ title: "Price the Lagos flights again", notes: "Tuesday mornings have been cheapest so far.", assigneeMemberIds: [tunde.id], dueAt: at(2, "08:30"), allDay: false, tripId: "trip-1", goalId: "goal-3", goalLabel: "Christmas in Lagos", milestoneId: "ms-goal-3-2", milestoneLabel: "Flights paid for", createdBy: tunde.id, ownerMemberId: tunde.id }),
        mk({ title: "Order Dami's GCSE revision guides", assigneeMemberIds: [ife.id], dueAt: at(2, "12:00"), kind: "errand", goalId: "goal-2", goalLabel: "Dami's GCSEs", milestoneId: "ms-goal-2-1", milestoneLabel: "Every subject has a revision plan" }),
        mk({ title: "Science fair: buy vinegar and bicarbonate of soda", assigneeMemberIds: [ife.id], dueAt: at(2, "12:00"), kind: "errand", projectId: "proj-2", childSafe: true, visibility: "child" }),
        mk({ title: "Write the Bible study notes for Wednesday", assigneeMemberIds: [tunde.id], dueAt: at(2, "21:00"), allDay: false, valueId: "Faith", createdBy: tunde.id, ownerMemberId: tunde.id }),
        mk({ title: "Finish the history essay", assigneeMemberIds: [dami.id], dueAt: at(2, "20:00"), allDay: false, scope: "me", goalId: "goal-2", goalLabel: "Dami's GCSEs", milestoneId: "ms-goal-2-3", milestoneLabel: "Coursework handed in", visibility: "child", childSafe: true, createdBy: dami.id, ownerMemberId: dami.id }),

        mk({ title: "Draft the brand proposal for Kemi", notes: "Two routes and a price. She needs it Thursday.", assigneeMemberIds: [ife.id], dueAt: at(3, "17:00"), allDay: false, scope: "me", priority: "high", visibility: "private", projectId: "proj-1", ownerMemberId: ife.id, createdBy: ife.id }),
        mk({ title: "Science fair: build the volcano base with Tobi", assigneeMemberIds: [tunde.id], dueAt: at(3, "18:00"), allDay: false, projectId: "proj-2", valueId: "Joy", childSafe: true, visibility: "child", createdBy: tunde.id, ownerMemberId: tunde.id }),
        mk({ title: "Wash the car", dueAt: at(3, "11:00"), kind: "chore", notes: "Nobody's name on this one yet." }),

        mk({ title: "Send Pastor Dayo the mentor session agenda", assigneeMemberIds: [dayo.id], dueAt: at(4, "12:00"), notes: "Oluwafemi asked for the men's group and the Lagos trip.", sharedWith: [dayo.id, tunde.id], visibility: "shared", createdBy: tunde.id, ownerMemberId: tunde.id }),
        mk({ title: "Take the recycling to the tip", dueAt: at(5, "10:00"), kind: "errand" }),
        mk({ title: "Donate the outgrown school shoes", notes: "Three pairs from the wardrobe clear-out. The charity shop on London Road takes them.", assigneeMemberIds: [ife.id], dueAt: at(6, "12:00"), kind: "errand", valueId: "Generosity", sourceType: "wardrobe", sourceId: "wardrobe-donate-1" }),

        mk({
            title: "Buy a laptop for Dami",
            notes: "Created when the purchase request was approved. Budget £420 from the education envelope.",
            assigneeMemberIds: [tunde.id],
            dueAt: at(5, "18:00"),
            priority: "high",
            kind: "errand",
            scope: "us",
            goalId: "goal-2",
            goalLabel: "Dami's GCSEs",
            milestoneId: "ms-goal-2-1",
            milestoneLabel: "Every subject has a revision plan",
            valueId: "Diligence",
            sourceType: "purchase",
            sourceId: "purchase-3",
            createdBy: ife.id,
            createdAt: at(-1, "21:10"),
            checklist: check("Compare the two shortlisted models", "Check the student discount", "Order and set a delivery date"),
        }),

        mk({ title: "Clear the garage shelf", assigneeMemberIds: [tunde.id, dami.id], dueAt: at(8, "11:00"), kind: "maintenance", projectId: "proj-3" }),
        mk({ title: "Renew Tobi's and Ayo's passports", notes: "Both expire in February — do it before the Lagos flights are booked.", assigneeMemberIds: [tunde.id], dueAt: at(9, "12:00"), priority: "high", kind: "errand", tripId: "trip-1", goalId: "goal-3", goalLabel: "Christmas in Lagos", milestoneId: "ms-goal-3-1", milestoneLabel: "Passports and visas sorted", checklist: check("Photos for both", "Countersignature", "Post at the check-and-send desk") }),
        mk({ title: "Bring the ankara fabric for the girls", notes: "Mama Fọláké offered — she'll bring it in December.", assigneeMemberIds: [folake.id], dueAt: at(20, "12:00"), tripId: "trip-1", visibility: "shared", sharedWith: [folake.id, ife.id, tunde.id], createdBy: ife.id }),
        mk({ title: "Plan Tobi's 10th birthday", notes: "The Okonkwos are pinning ideas to the board.", assigneeMemberIds: [ife.id], dueAt: at(30, "12:00"), projectId: "proj-4", valueId: "Joy", status: "waiting" }),

        mk({ title: "Ring the plumber about the boiler service", assigneeMemberIds: [ife.id], kind: "maintenance", status: "waiting", notes: "Waiting on a call back from the number Pastor Dayo gave us." }),
    ];

    // -----------------------------------------------------------------------
    // Behind us — the week that just happened
    // -----------------------------------------------------------------------
    const done: Task[] = [
        mk({ title: "Empty the dishwasher", assigneeMemberIds: [dami.id], dueAt: at(-1, "18:30"), allDay: false, kind: "chore", isChore: true, sprouts: 10, needsProof: true, proofUrl: img("tasks-proof-dishwasher"), proofSubmittedAt: at(-1, "18:50"), proofApprovedBy: ife.id, childSafe: true, visibility: "child", status: "done", doneAt: at(-1, "18:52"), doneBy: dami.id, sourceType: "recurrence" }),
        mk({ title: "Empty the dishwasher", assigneeMemberIds: [dami.id], dueAt: at(-2, "18:30"), allDay: false, kind: "chore", isChore: true, sprouts: 10, childSafe: true, visibility: "child", status: "done", doneAt: at(-2, "19:04"), doneBy: dami.id, sourceType: "recurrence" }),
        mk({ title: "Feed Bella", assigneeMemberIds: [tobi.id], dueAt: at(-1, "08:00"), allDay: false, kind: "chore", isChore: true, sprouts: 10, childSafe: true, visibility: "child", status: "done", doneAt: at(-1, "08:12"), doneBy: tobi.id, sourceType: "recurrence" }),
        mk({ title: "Feed Bella", assigneeMemberIds: [tobi.id], dueAt: at(-2, "08:00"), allDay: false, kind: "chore", isChore: true, sprouts: 10, needsProof: true, proofUrl: img("tasks-proof-bella"), proofSubmittedAt: at(-2, "08:18"), proofApprovedBy: tunde.id, childSafe: true, visibility: "child", status: "done", doneAt: at(-2, "08:20"), doneBy: tobi.id, sourceType: "recurrence" }),
        mk({ title: "Tidy the shoe rack", assigneeMemberIds: [ayo.id], dueAt: at(-7, "17:00"), allDay: false, kind: "chore", isChore: true, sprouts: 5, needsProof: true, proofUrl: img("tasks-proof-shoes"), proofSubmittedAt: at(-7, "17:22"), proofApprovedBy: ife.id, childSafe: true, visibility: "child", status: "done", doneAt: at(-7, "19:00"), doneBy: ayo.id }),
        mk({ title: "Bins out", assigneeMemberIds: [dami.id], dueAt: at(-3, "20:00"), allDay: false, kind: "chore", isChore: true, sprouts: 15, childSafe: true, visibility: "child", status: "done", doneAt: at(-3, "20:15"), doneBy: dami.id, sourceType: "recurrence" }),
        mk({ title: "Pay the water bill", assigneeMemberIds: [ife.id], dueAt: at(-2, "10:00"), status: "done", doneAt: at(-2, "10:20"), doneBy: ife.id, scope: "us" }),
        mk({ title: "Take Ayo to the Reception open morning", assigneeMemberIds: [ife.id], dueAt: at(-3, "09:00"), allDay: false, status: "done", doneAt: at(-3, "11:30"), doneBy: ife.id, valueId: "Love" }),
        mk({ title: "Fix the shed door", assigneeMemberIds: [tunde.id], dueAt: at(-5, "14:00"), kind: "maintenance", projectId: "proj-3", status: "done", doneAt: at(-5, "15:40"), doneBy: tunde.id, createdBy: tunde.id, ownerMemberId: tunde.id }),
        mk({ title: "Science fair: choose the question", assigneeMemberIds: [tobi.id], dueAt: at(-6, "17:00"), projectId: "proj-2", childSafe: true, visibility: "child", status: "done", doneAt: at(-6, "17:30"), doneBy: tobi.id }),
        mk({ title: "Sunday planning", assigneeMemberIds: [ife.id, tunde.id], dueAt: at(-7, "14:00"), allDay: false, scope: "us", status: "done", doneAt: at(-7, "14:35"), doneBy: tunde.id, sourceType: "recurrence" }),
        mk({ title: "Open the Lagos savings pot", assigneeMemberIds: [ife.id], dueAt: at(-12, "10:00"), goalId: "goal-3", goalLabel: "Christmas in Lagos", milestoneId: "ms-goal-3-2", milestoneLabel: "Flights paid for", scope: "us", status: "done", doneAt: at(-12, "10:30"), doneBy: ife.id }),
        mk({ title: "Print the GCSE timetable", assigneeMemberIds: [dami.id], dueAt: at(-8, "16:00"), goalId: "goal-2", goalLabel: "Dami's GCSEs", milestoneId: "ms-goal-2-1", milestoneLabel: "Every subject has a revision plan", visibility: "child", childSafe: true, status: "done", doneAt: at(-8, "16:20"), doneBy: dami.id }),
    ];

    // -----------------------------------------------------------------------
    // Further back — the chores behind the older half of the ledger
    //
    // These are kept for one reason: every 'chore' delta in the ledger names
    // the task that earned it (AC 5), so the audit trail has to reach a real
    // row however old the entry is. They are done, quiet, and only surface in
    // the ledger's Source column and a scroll back through the month.
    // -----------------------------------------------------------------------
    const chore = (title: string, memberId: string, sprouts: number, doneAtIso: string, dueAtIso: string): Task =>
        mk({
            title,
            assigneeMemberIds: [memberId],
            dueAt: dueAtIso,
            allDay: false,
            kind: "chore",
            isChore: true,
            sprouts,
            childSafe: true,
            visibility: "child",
            status: "done",
            doneAt: doneAtIso,
            doneBy: memberId,
            sourceType: "recurrence",
        });

    const history: Task[] = [
        chore("Empty the dishwasher", dami.id, 10, at(-9, "18:40"), at(-9, "18:30")),
        chore("Empty the dishwasher", dami.id, 10, at(-11, "18:35"), at(-11, "18:30")),
        chore("Bins out", dami.id, 15, at(-10, "20:10"), at(-10, "20:00")),
        chore("Feed Bella", tobi.id, 10, at(-3, "08:05"), at(-3, "08:00")),
        chore("Feed Bella", tobi.id, 10, at(-4, "08:15"), at(-4, "08:00")),
        chore("Feed Bella", tobi.id, 10, at(-5, "08:02"), at(-5, "08:00")),
        chore("Hoover the front room", tobi.id, 20, at(-8, "16:30"), at(-8, "16:00")),
        chore("Tidy the shoe rack", ayo.id, 5, at(-14, "17:30"), at(-14, "17:00")),
        chore("Water the tomatoes", ayo.id, 5, at(-3, "16:45"), at(-3, "16:30")),
    ];

    const tasks = [...overdue, ...chores, ...rest, ...done, ...history];

    // -----------------------------------------------------------------------
    // The rota: Dami ↔ Tobi, weekly, turning today (the planning day)
    // -----------------------------------------------------------------------
    const rotas: ChoreRota[] = [
        {
            id: uid("rota"),
            name: "Empty the dishwasher",
            taskId: dishwasher.id,
            memberIds: [dami.id, tobi.id],
            rotation: "weekly",
            currentIndex: 0,
            nextRotateAt: day(0),
            createdAt: at(-60, "20:00"),
        },
    ];

    // -----------------------------------------------------------------------
    // Rewards and one request waiting on a parent
    // -----------------------------------------------------------------------
    const rewards: Reward[] = [
        { id: uid("reward"), name: "Saturday cinema", note: "A ticket, a drink and popcorn — one Saturday of your choosing.", costSprouts: 150, kind: "outing", imageUrl: img("tasks-reward-cinema"), active: true, createdAt: at(-120, "20:00") },
        { id: uid("reward"), name: "Extra 30 minutes screen time", note: "One evening, after everything else is done.", costSprouts: 40, kind: "screen", imageUrl: null, active: true, createdAt: at(-120, "20:00") },
        { id: uid("reward"), name: "Choose Friday's dinner", note: "Anything, as long as somebody can cook it.", costSprouts: 60, kind: "privilege", imageUrl: null, active: true, createdAt: at(-90, "20:00") },
        { id: uid("reward"), name: "Bake with Mum on Saturday", note: "You pick what we make.", costSprouts: 80, kind: "treat", imageUrl: null, active: true, createdAt: at(-90, "20:00") },
        { id: uid("reward"), name: "£5 into your account", note: "Straight into your envelope.", costSprouts: 100, kind: "money", imageUrl: null, active: true, createdAt: at(-60, "20:00") },
    ];

    const cinema = rewards[0];
    const screen = rewards[1];

    const redemptions: Redemption[] = [
        { id: uid("redeem"), rewardId: screen.id, memberId: tobi.id, status: "requested", costSprouts: screen.costSprouts, decidedBy: null, note: "For Friday, after the science fair poster.", at: at(-1, "19:40"), decidedAt: null },
        { id: uid("redeem"), rewardId: cinema.id, memberId: dami.id, status: "fulfilled", costSprouts: cinema.costSprouts, decidedBy: ife.id, note: "", at: at(-22, "18:00"), decidedAt: at(-21, "09:00") },
    ];

    // -----------------------------------------------------------------------
    // The Sprouts ledger — every delta with the record that caused it
    // -----------------------------------------------------------------------
    const entries: SproutsEntry[] = [];
    const credit = (memberId: string, delta: number, sourceType: SproutsEntry["sourceType"], sourceId: string | null, note: string, atIso: string) =>
        entries.push({ id: uid("sprout"), memberId, delta, sourceType, sourceId, note, at: atIso });

    // One entry per finished chore, naming the task — recent and older alike.
    for (const t of [...done, ...history]) {
        if (!t.isChore || !t.doneBy || !t.doneAt) continue;
        credit(t.doneBy, t.sprouts, "chore", t.id, t.title, t.doneAt);
    }
    credit(dami.id, -cinema.costSprouts, "reward", redemptions[1].id, `Redeemed: ${cinema.name}`, at(-21, "09:00"));

    // An opening balance per child, so the ledger adds up to the number the
    // shell already shows on their avatar.
    const ledger: SproutsEntry[] = [];
    for (const kid of ctx.kids) {
        const mine = entries.filter((e) => e.memberId === kid.id);
        const sum = mine.reduce((n, e) => n + e.delta, 0);
        ledger.push({ id: uid("sprout"), memberId: kid.id, delta: kid.points - sum, sourceType: "opening", sourceId: null, note: "Carried over from the sticker chart", at: at(-120, "09:00") });
    }
    ledger.push(...entries);

    const state: TasksState = { tasks, rotas, ledger, rewards, redemptions, milestoneProgress: [], goalProgress: [] };
    state.milestoneProgress = milestoneProgress(state);
    state.goalProgress = goalProgress(state);
    return state;
}
