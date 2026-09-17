import type { SeedContext } from "@/data/core";
import { isoWeekday, scheduleOf, shiftDay, weekOf } from "./derive";
import { WORKOUT_TEMPLATES, templateById } from "./templates";
import type {
    Challenge,
    ChallengeEntry,
    GroceryItem,
    GroceryList,
    Habit,
    HabitKind,
    HabitLog,
    Ingredient,
    MealPlan,
    MealSlot,
    MealSlotKind,
    Recipe,
    StreakFreeze,
    WellnessGoal,
    WellnessState,
    Weekday,
    Workout,
    WorkoutLog,
    WorkoutPlan,
} from "./types";

/**
 * A Sunday in Croydon, seen through what the family's bodies have been doing.
 *
 * Ifeoluwa has kept her water twelve days running and rests it on Sundays, which is
 * exactly why the number is twelve and not zero. Oluwafemi is three weeks into the
 * cycling build and spent this week's freeze on the Wednesday he worked late —
 * the streak survived, as it is supposed to. Dami's sleep is four nights in
 * seven and the app says so once, kindly. Tobi has read every day but today.
 * The week's meals are down with a name against each pan and jollof tonight,
 * and the shopping prices up at £142 against £112 left in the food envelope,
 * which is a decision waiting to be made rather than a disaster.
 *
 * Every date is relative to `ctx.today`, so none of it goes stale.
 *
 * The history strings are the record oldest-first — '1' kept, '2' a partial
 * day, '-' or '0' nothing logged — and they are indexed by the days the habit
 * ASKS FOR, not by the calendar: a rest day is stepped over rather than
 * consuming a character. That is what makes "twelve days running" twelve
 * whichever weekday the demo is opened on, and it is the same rule
 * `streakOf` applies. The last character is the most recent asked-for day,
 * which is usually today. Writing them out beats a random generator, because
 * the acceptance criteria name the exact streaks the demo has to show.
 */

export function seed(ctx: SeedContext): WellnessState {
    const [ife, tunde] = ctx.parents;
    const [dami, tobi, ayo] = ctx.kids;
    const { at, uid, img } = ctx;
    // `ctx.day()` rounds a local midnight through UTC, which lands a day early
    // anywhere east of Greenwich. Every date below is anchored on `ctx.today`
    // with the module's own noon-safe arithmetic instead, so the seeded streaks
    // are the seeded streaks in every timezone.
    const day = (n: number): string => shiftDay(ctx.today, n);

    const habits: Habit[] = [];
    const logs: HabitLog[] = [];
    const freezes: StreakFreeze[] = [];

    /** A habit plus its recent record, in one line. */
    const habit = (
        memberId: string,
        name: string,
        kind: HabitKind,
        target: number,
        unit: string,
        checkinTime: string,
        history: string,
        opts: { graceDays?: Weekday[]; sprouts?: number; valueId?: string | null; note?: string } = {},
    ): Habit => {
        const h: Habit = {
            id: uid("habit"),
            memberId,
            name,
            kind,
            target,
            unit,
            checkinTime,
            valueId: opts.valueId ?? null,
            graceDays: opts.graceDays ?? [],
            sprouts: opts.sprouts ?? 0,
            note: opts.note ?? "",
            active: true,
            visibility: "family",
            createdAt: at(-60, "08:00"),
        };
        habits.push(h);
        // Walk backwards over the days this habit actually asks for, newest
        // first, and read the pattern from its end. Today always takes the last
        // character (it is the day the demo shows as still open); every earlier
        // rest day is stepped over rather than consuming one. That is why
        // "twelve days running" is twelve on a Tuesday and twelve on the Sunday
        // the habit rests.
        const rest = h.graceDays;
        const asked: string[] = [];
        for (let i = 0; asked.length < history.length && i < 200; i++) {
            const date = day(-i);
            if (i === 0 || !rest.includes(isoWeekday(date))) asked.push(date);
        }
        asked.forEach((date, back) => {
            if (rest.includes(isoWeekday(date))) return;
            const c = history[history.length - 1 - back] ?? "-";
            if (c !== "1" && c !== "2") return;
            logs.push({
                id: uid("hlog"),
                habitId: h.id,
                memberId,
                date,
                value: c === "1" ? target : Math.max(1, Math.round(target * 0.6)),
                loggedAt: `${date}T${checkinTime}:00.000Z`,
            });
        });
        return h;
    };

    // -- Ifeoluwa -----------------------------------------------------------------
    // Twelve kept days behind today and Sundays rested: the streak the brief
    // names, and the proof that resting on purpose is not a lapse (AC 2).
    habit(ife.id, "Eight glasses of water", "water", 8, "glasses", "20:00", "111111111111-", { graceDays: [7], note: "Rested on Sundays — church, then a proper roast.", valueId: "Diligence" });
    habit(ife.id, "Thirty-minute walk", "exercise", 30, "min", "18:00", "1101111011111", { graceDays: [7] });
    habit(ife.id, "In bed by 23:00", "sleep", 1, "", "23:00", "10111011101110");
    habit(ife.id, "Five fruit and veg", "nutrition", 5, "portions", "19:30", "11011101110111");
    habit(ife.id, "Screen-free evening", "screens", 1, "", "21:30", "1111111011111", { graceDays: [5, 6], note: "Friday film night and Saturday are meant to be noisy.", valueId: "Love" });

    // -- Oluwafemi ---------------------------------------------------------------
    habit(tunde.id, "Ride or run", "exercise", 20, "min", "19:00", "110101110111-", { graceDays: [7] });
    // The '-' four days back is the night he was still at his desk at midnight.
    // The freeze below covers it and the streak walks straight over it (AC 2).
    const tundeSleep = habit(tunde.id, "Seven hours' sleep", "sleep", 7, "h", "23:30", "011001111-111-");
    habit(tunde.id, "Water at the desk", "water", 8, "glasses", "17:00", "11111011111111");
    habit(tunde.id, "Thirty press-ups", "exercise", 30, "reps", "07:30", "11111111101111", { graceDays: [7] });
    habit(tunde.id, "Fifteen minutes reading", "reading", 15, "min", "22:00", "10110110110110", { valueId: "Diligence" });

    // -- Dami (15) -----------------------------------------------------------
    // Four nights in seven — enough for the app to say something once, kindly.
    habit(dami.id, "In bed by 22:00", "sleep", 1, "", "22:00", "10110111101010", { sprouts: 5, note: "Exam year. Sleep is revision." });
    habit(dami.id, "Revision block", "reading", 45, "min", "18:00", "111011111011-", { graceDays: [7], sprouts: 10, valueId: "Diligence" });
    habit(dami.id, "Six glasses of water", "water", 6, "glasses", "20:00", "11011101101101", { sprouts: 5 });

    // -- Tobi (9) ------------------------------------------------------------
    // Six days in seven, and today still to do — one tap on his own dashboard.
    habit(tobi.id, "Read for twenty minutes", "reading", 20, "min", "18:30", "11011111111110", { sprouts: 10, valueId: "Diligence" });
    habit(tobi.id, "Outside for half an hour", "exercise", 30, "min", "16:00", "11101110111111", { sprouts: 10 });
    habit(tobi.id, "Teeth, morning and night", "custom", 2, "times", "20:30", "11111111111110", { sprouts: 5 });

    // -- Ayo (5) -------------------------------------------------------------
    habit(ayo.id, "Teeth, morning and night", "custom", 2, "times", "19:30", "11111111111110", { sprouts: 5 });
    habit(ayo.id, "Story before bed", "reading", 1, "", "19:00", "11111011111110", { sprouts: 5, valueId: "Joy" });
    habit(ayo.id, "Tidy the toys", "custom", 1, "", "17:30", "10110110110110", { sprouts: 5 });

    // The night Oluwafemi was still at his desk. The freeze holds the streak;
    // nothing about it is a punishment (AC 2).
    freezes.push({
        id: uid("freeze"),
        habitId: tundeSleep.id,
        memberId: tunde.id,
        weekStart: weekOf(day(-4)),
        usedOn: day(-4),
        reason: "Late release at work — used this week's freeze.",
        at: at(-3, "07:10"),
    });

    // -----------------------------------------------------------------------
    // Workouts
    // -----------------------------------------------------------------------

    const plans: WorkoutPlan[] = [];
    const workouts: Workout[] = [];

    const startPlan = (templateId: string, memberId: string | null, startDate: string, opts: { name?: string; weeks?: number; goalLabel?: string; note?: string } = {}): WorkoutPlan => {
        const tpl = templateById(templateId) ?? WORKOUT_TEMPLATES[0];
        const plan: WorkoutPlan = {
            id: uid("plan"),
            memberId,
            name: opts.name ?? tpl.name,
            templateId: tpl.id,
            focus: tpl.focus,
            goalId: null,
            goalLabel: opts.goalLabel ?? "",
            weeks: opts.weeks ?? tpl.weeks,
            startDate,
            note: opts.note ?? "",
            active: true,
            createdBy: memberId ?? ife.id,
            createdAt: at(-30, "20:00"),
        };
        plans.push(plan);
        for (let w = 0; w < plan.weeks; w++) {
            for (const s of tpl.sessions) {
                workouts.push({
                    id: uid("workout"),
                    planId: plan.id,
                    memberId,
                    date: shiftDay(startDate, w * 7 + (s.weekday - 1)),
                    title: s.title,
                    focus: tpl.focus,
                    week: w + 1,
                    durationMin: s.durationMin,
                    exercises: s.exercises,
                    createdAt: plan.createdAt,
                });
            }
        }
        return plan;
    };

    // Anchored on whole weeks back from this Monday, so Oluwafemi is in week three
    // of the cycling build on a Tuesday as much as on a Sunday.
    const monday = weekOf(ctx.today);
    const cycling = startPlan("tpl-commuter-cycling", tunde.id, shiftDay(monday, -14), { goalLabel: "Ride to Brighton in June", note: "Addiscombe CC on Saturdays." });
    const strength = startPlan("tpl-strength-3", ife.id, shiftDay(monday, -7), { note: "Kettlebell in the shed, mat in the front room." });
    const walk = startPlan("tpl-family-walk", null, shiftDay(monday, -14), { note: "Everyone comes. Ayo picks the route once a month." });
    const kids = startPlan("tpl-kids-burst", tobi.id, shiftDay(monday, -7), { note: "Between maths and lunch on the home-ed mornings." });

    const workoutOn = (planId: string, date: string): Workout | undefined => workouts.find((w) => w.planId === planId && w.date === date);

    const workoutLogs: WorkoutLog[] = [];
    const logWorkout = (planId: string, date: string, memberId: string, durationMin: number, feel: WorkoutLog["feel"], notes: string, sets: string[] = []): void => {
        const w = workoutOn(planId, date);
        // Nobody has ridden tomorrow yet: a session dated ahead of today stays
        // on the schedule waiting to be done, which is the point of a schedule.
        if (!w || date > ctx.today) return;
        workoutLogs.push({
            id: uid("wlog"),
            workoutId: w.id,
            planId,
            memberId,
            date,
            title: w.title,
            durationMin,
            sets,
            feel,
            notes,
            loggedAt: `${date}T20:15:00.000Z`,
        });
    };

    // Oluwafemi — weeks one to three of the cycling build.
    logWorkout(cycling.id, shiftDay(cycling.startDate, 1), tunde.id, 46, "good", "Norwood Junction and back. Legs fine.");
    logWorkout(cycling.id, shiftDay(cycling.startDate, 3), tunde.id, 52, "tough", "Six up Church Way. Regretted the sixth.");
    logWorkout(cycling.id, shiftDay(cycling.startDate, 5), tunde.id, 94, "good", "Club run to Westerham. Coffee at the top.");
    logWorkout(cycling.id, shiftDay(cycling.startDate, 8), tunde.id, 44, "easy", "Steady all the way, no traffic.");
    logWorkout(cycling.id, shiftDay(cycling.startDate, 10), tunde.id, 50, "good", "Better on the hills already.");
    logWorkout(cycling.id, shiftDay(cycling.startDate, 12), tunde.id, 88, "good", "Group of nine. Held the wheel.");
    logWorkout(cycling.id, shiftDay(cycling.startDate, 15), tunde.id, 45, "good", "Commute counted.");
    // Thursday of week three is the one he missed — the plan still shows it.

    // Ifeoluwa — two sessions of the strength block so far.
    logWorkout(strength.id, shiftDay(strength.startDate, 0), ife.id, 34, "good", "16kg felt right.", ["Goblet squat 3×10 @16kg", "Press-ups 3×8", "Row 3×10", "Carry 3×30 steps"]);
    logWorkout(strength.id, shiftDay(strength.startDate, 2), ife.id, 31, "tough", "Shoulders complained on the press.", ["RDL 3×10 @20kg", "Split squat 3×8", "Press 3×8 @8kg", "Plank 3×40s"]);

    // The whole family, last Saturday.
    logWorkout(walk.id, shiftDay(walk.startDate, 12), ife.id, 72, "good", "Lloyd Park. Ayo walked the whole thing and then asked for chips.");

    // Tobi's burst on Thursday.
    logWorkout(kids.id, shiftDay(kids.startDate, 3), tobi.id, 11, "easy", "Bear crawl twice because it was funny.");

    // -----------------------------------------------------------------------
    // Health — parents only, and it reads like a parent's notebook
    // -----------------------------------------------------------------------

    const health = (
        memberId: string,
        v: {
            allergies: string;
            medications: string;
            conditions?: string;
            gp?: string;
            dentist?: string;
            nhsNumber?: string;
            notes?: string;
            appointments?: Array<{ what: string; who: string; days: number; hhmm: string; place: string; note?: string }>;
            vaccinations?: Array<{ name: string; days: number; dueAgain?: number }>;
            measurements?: Array<{ days: number; heightCm?: number; weightKg?: number; note?: string }>;
        },
    ) => ({
        id: uid("health"),
        memberId,
        allergies: v.allergies,
        medications: v.medications,
        conditions: v.conditions ?? "",
        gp: v.gp ?? "Parkway Surgery, Croydon · 020 8654 0000",
        dentist: v.dentist ?? "Addiscombe Dental Care · 020 8656 0000",
        nhsNumber: v.nhsNumber ?? "",
        appointments: (v.appointments ?? []).map((a) => ({ id: uid("appt"), what: a.what, who: a.who, at: at(a.days, a.hhmm), place: a.place, note: a.note ?? "" })),
        vaccinations: (v.vaccinations ?? []).map((x) => ({ id: uid("vacc"), name: x.name, date: day(x.days), dueAgain: typeof x.dueAgain === "number" ? day(x.dueAgain) : null })),
        measurements: (v.measurements ?? []).map((m) => ({ id: uid("meas"), date: day(m.days), heightCm: m.heightCm ?? null, weightKg: m.weightKg ?? null, note: m.note ?? "" })),
        notes: v.notes ?? "",
        sensitivity: "health" as const,
        updatedBy: ife.id,
        updatedAt: at(-11, "21:00"),
    });

    const healthNotes = [
        health(ife.id, {
            allergies: "None known",
            medications: "Vitamin D, October to March",
            notes: "Migraines when the sleep goes. Two nights of seven hours usually settles it.",
            appointments: [{ what: "Cervical screening", who: "Practice nurse", days: 19, hhmm: "09:20", place: "Parkway Surgery" }],
            measurements: [{ days: -60, weightKg: 68 }],
        }),
        health(tunde.id, {
            allergies: "Penicillin — rash, noted at the surgery",
            medications: "None",
            conditions: "Hay fever, May to July",
            notes: "Blood pressure was 138/86 in the spring. Worth watching with the cycling.",
            appointments: [{ what: "Blood pressure check", who: "Practice nurse", days: 9, hhmm: "08:40", place: "Parkway Surgery" }],
            measurements: [{ days: -90, weightKg: 84 }, { days: -12, weightKg: 82, note: "Three weeks of riding." }],
        }),
        health(dami.id, {
            allergies: "Pollen — hay fever",
            medications: "Cetirizine, as needed in summer",
            notes: "Retainer every night. She knows; the reminder is for us.",
            appointments: [{ what: "Orthodontist — retainer check", who: "Mr Adeleke", days: 5, hhmm: "16:15", place: "Croydon Orthodontics", note: "Straight from school." }],
            vaccinations: [{ name: "HPV (2 of 2)", days: -300 }, { name: "Teenage booster (3-in-1)", days: -120 }],
            measurements: [{ days: -30, heightCm: 166, weightKg: 54 }],
        }),
        health(tobi.id, {
            allergies: "PEANUTS — carries an adrenaline pen. School and co-op both hold one.",
            medications: "Blue inhaler before PE and before football",
            conditions: "Mild asthma",
            notes: "Spacer lives in the yellow bag. Second pen is in the kitchen drawer, in date until March.",
            appointments: [{ what: "Asthma review", who: "Dr Whitfield", days: 2, hhmm: "15:30", place: "Parkway Surgery", note: "Bring the inhaler and the spacer." }],
            vaccinations: [{ name: "Flu nasal spray", days: -320, dueAgain: 40 }, { name: "4-in-1 preschool booster", days: -1500 }],
            measurements: [{ days: -180, heightCm: 128, weightKg: 27 }, { days: -20, heightCm: 132, weightKg: 28 }],
        }),
        health(ayo.id, {
            allergies: "None known",
            medications: "Emollient cream at night for eczema",
            conditions: "Eczema, mostly behind the knees",
            notes: "Reception nurse has the cream. Flares when the weather turns.",
            appointments: [{ what: "Dentist — first check-up", who: "Ms Rahman", days: 6, hhmm: "10:00", place: "Addiscombe Dental Care" }],
            vaccinations: [{ name: "MMR (2 of 2)", days: -700 }, { name: "Flu nasal spray", days: -320, dueAgain: 40 }],
            measurements: [{ days: -200, heightCm: 106, weightKg: 18 }, { days: -20, heightCm: 110, weightKg: 19 }],
        }),
    ];

    // -----------------------------------------------------------------------
    // Food
    // -----------------------------------------------------------------------

    const ing = (item: string, qty: string, priceEstimateCents: number): Ingredient => ({ item, qty, priceEstimateCents });

    const recipes: Recipe[] = [];
    const recipe = (
        name: string,
        blurb: string,
        image: string | null,
        minutes: number,
        servings: number,
        costEstimateCents: number,
        childSafe: boolean,
        tags: string[],
        ingredients: Ingredient[],
        steps: string[],
    ): Recipe => {
        const r: Recipe = { id: uid("recipe"), name, blurb, imageUrl: image ? img(image) : null, ingredients, steps, servings, minutes, costEstimateCents, childSafe, tags, createdAt: at(-120, "19:00") };
        recipes.push(r);
        return r;
    };

    const jollof = recipe(
        "Jollof rice and chicken",
        "The Sunday one. Make the stew base while the chicken roasts and nobody notices the hour.",
        "wellness-jollof",
        60,
        6,
        1450,
        true,
        ["Nigerian", "Sunday", "Everyone's favourite"],
        [ing("Chicken thighs", "2 kg", 1150), ing("Long grain rice", "750 g", 240), ing("Tinned tomatoes", "3 tins", 210), ing("Red peppers", "3", 225), ing("Scotch bonnet", "1", 25), ing("Onions", "3", 90), ing("Stock cubes and seasoning", "—", 110)],
        ["Blend the peppers, tomatoes, onion and half the scotch bonnet.", "Season and roast the chicken, 45 minutes at 190°C.", "Fry the base down until it darkens — this is the whole dish.", "Stir in the rice, cover, low heat, twenty minutes. Do not lift the lid.", "Rest five minutes, fluff, serve with the chicken and plantain."],
    );
    const efo = recipe(
        "Efo riro and pounded yam",
        "Spinach, peppers and a proper stew. Ifeoluwa's mother's ratio, written down at last.",
        "wellness-efo",
        75,
        6,
        1680,
        true,
        ["Nigerian", "Weekend"],
        [ing("Spinach and efo greens", "800 g", 350), ing("Assorted beef", "700 g", 620), ing("Palm oil", "150 ml", 130), ing("Locust beans and crayfish", "—", 220), ing("Pounded yam flour", "1 kg", 280), ing("Peppers and onion", "—", 80)],
        ["Boil the beef with onion and seasoning; keep the stock.", "Bleach the palm oil gently — do not walk away.", "Fry the blended peppers until the oil separates.", "Fold the greens through last so they stay green.", "Make the pounded yam while it sits."],
    );
    const porridge = recipe("Oat porridge and banana", "Ten minutes, feeds five, costs almost nothing.", "wellness-porridge", 10, 5, 320, true, ["Breakfast", "Quick"], [ing("Porridge oats", "400 g", 90), ing("Milk", "1 litre", 120), ing("Bananas", "4", 60), ing("Honey and cinnamon", "—", 50)], ["Oats and milk, low heat, stir.", "Slice the bananas in at the end.", "Honey at the table, not in the pan."]);
    const ewa = recipe(
        "Ewa agoyin and plantain",
        "Beans mashed soft under a dark pepper sauce, with fried plantain. Wednesday's answer to Bible study at seven.",
        "wellness-beans",
        50,
        5,
        890,
        true,
        ["Nigerian", "Meat-free"],
        [ing("Honey beans", "500 g", 240), ing("Plantain", "4", 320), ing("Dried peppers and onion", "—", 200), ing("Palm oil", "100 ml", 90), ing("Oil for frying", "—", 40)],
        ["Soak and boil the beans until they collapse.", "Fry the blended dried pepper slowly in palm oil until it is almost black.", "Fry the plantain while the sauce reduces.", "Beans down, sauce on top, plantain beside."],
    );
    const potato = recipe("Jacket potatoes and tuna", "In the oven at four, ready at six, nothing else to do.", "wellness-potato", 70, 5, 640, true, ["Quick", "Meat-free-ish"], [ing("Baking potatoes", "5", 250), ing("Tuna", "3 tins", 240), ing("Sweetcorn", "1 tin", 60), ing("Cheddar", "150 g", 90)], ["Prick, oil, salt, 200°C for an hour.", "Mix the tuna, sweetcorn and mayonnaise.", "Split, fill, grate cheese over."]);
    const bolognese = recipe("Spaghetti bolognese", "Doubled every time, because half of it is Thursday's lunch.", "wellness-pasta", 40, 6, 980, true, ["Weeknight", "Batch"], [ing("Beef mince", "700 g", 490), ing("Spaghetti", "500 g", 95), ing("Tinned tomatoes", "2 tins", 140), ing("Carrot, onion, celery", "—", 145), ing("Garlic and herbs", "—", 110)], ["Soffritto first, slowly.", "Brown the mince properly — no grey.", "Tomatoes, simmer forty minutes.", "Pasta in the last ten."]);
    const stirfry = recipe("Chicken and vegetable stir-fry", "The fridge-drawer dinner. Fifteen minutes if the rice is already on.", "wellness-stirfry", 25, 5, 1120, true, ["Quick", "Weeknight"], [ing("Chicken breast", "600 g", 620), ing("Mixed vegetables", "700 g", 340), ing("Noodles or rice", "—", 90), ing("Soy, garlic, ginger", "—", 70)], ["Hot pan, chicken first, don't crowd it.", "Hard vegetables, then soft.", "Sauce at the very end."]);
    const fishpie = recipe("Fish pie", "Friday-ish, though we do it on a Thursday. Ayo eats it, which settles the argument.", "wellness-fishpie", 55, 5, 1340, true, ["Comfort"], [ing("Fish pie mix", "600 g", 950), ing("Potatoes", "1.2 kg", 180), ing("Milk and butter", "—", 130), ing("Peas and parsley", "—", 80)], ["Poach the fish in the milk; keep the milk.", "White sauce from that milk.", "Mash on top, fork the ridges — they go crisp.", "200°C until it bubbles at the edges."]);
    const soup = recipe("Lentil soup and crusty bread", "Cheap, filling and forgiving. Doubles as Saturday lunch.", "wellness-soup", 35, 6, 520, true, ["Meat-free", "Batch", "Cheap"], [ing("Red lentils", "400 g", 90), ing("Carrots and onion", "—", 130), ing("Stock and cumin", "—", 60), ing("Crusty bread", "2 loaves", 240)], ["Everything in the pot.", "Twenty-five minutes.", "Blend half, leave half."]);
    const pancakes = recipe("Saturday pancakes", "Tobi's job now. He has opinions about the pan.", "wellness-pancakes", 20, 5, 380, true, ["Breakfast", "Children can cook it"], [ing("Flour", "300 g", 60), ing("Eggs", "3", 75), ing("Milk", "500 ml", 65), ing("Berries and syrup", "—", 180)], ["Whisk, rest ten minutes.", "Medium heat, small ladle.", "Flip once. Only once."]);
    const eggs = recipe("Scrambled eggs on toast", "Six minutes, and the five-year-old can butter the toast.", "wellness-eggs", 12, 5, 410, true, ["Breakfast", "Children can cook it"], [ing("Eggs", "8", 200), ing("Bread", "1 loaf", 110), ing("Butter and milk", "—", 100)], ["Low heat. Lower than that.", "Off the heat while still loose.", "Toast buttered to the edges."]);
    const suya = recipe(
        "Beef suya traybake",
        "Scotch bonnet in the rub — a grown-ups' plate. The children get theirs plain from the same tray.",
        "wellness-traybake",
        45,
        5,
        1290,
        false,
        ["Nigerian", "Hot"],
        [ing("Beef strips", "700 g", 780), ing("Suya spice", "—", 210), ing("Peppers and onion", "—", 220), ing("Oil", "—", 80)],
        ["Rub the beef and leave it an hour if you can.", "High oven, one layer, 20 minutes.", "Peppers and onion in for the last ten.", "Lime over the top."],
    );
    const sandwiches = recipe("Chicken sandwiches and fruit", "The packed-lunch default. Made the night before, eaten cold.", null, 15, 5, 560, true, ["Lunch", "Children can cook it"], [ing("Bread", "1 loaf", 110), ing("Cooked chicken", "400 g", 280), ing("Salad", "—", 90), ing("Fruit", "—", 80)], ["Butter to the crusts or it goes soggy.", "Wrap, fridge, done."]);

    // -- the week's plan, with a name against every pan -----------------------

    const thisWeek = weekOf(ctx.today);
    const nextWeek = shiftDay(thisWeek, 7);

    const mealPlans: MealPlan[] = [
        { id: uid("mealplan"), weekStart: thisWeek, note: "Bible study Wednesday, so something that cooks itself. Jollof on Sunday because Mama Fọláké rings at six.", createdBy: ife.id, createdAt: at(-7, "20:30") },
        { id: uid("mealplan"), weekStart: nextWeek, note: "", createdBy: ife.id, createdAt: at(0, "09:00") },
    ];
    const [thisPlan, nextPlan] = mealPlans;

    const slots: MealSlot[] = [];
    const setSlot = (planId: string, date: string, slot: MealSlotKind, r: Recipe | null, cookMemberId: string | null, title?: string, note = ""): void => {
        slots.push({ id: uid("slot"), planId, date, slot, recipeId: r?.id ?? null, title: title ?? r?.name ?? "", cookMemberId, note });
    };

    const wd = (i: number): string => shiftDay(thisWeek, i);
    setSlot(thisPlan.id, wd(0), "breakfast", porridge, ife.id);
    setSlot(thisPlan.id, wd(0), "lunch", potato, ife.id);
    setSlot(thisPlan.id, wd(0), "dinner", bolognese, tunde.id, undefined, "Double it — Thursday's lunch comes out of this pan.");
    setSlot(thisPlan.id, wd(1), "breakfast", eggs, tunde.id);
    setSlot(thisPlan.id, wd(1), "lunch", sandwiches, dami.id);
    setSlot(thisPlan.id, wd(1), "dinner", stirfry, ife.id);
    setSlot(thisPlan.id, wd(2), "breakfast", porridge, ife.id);
    setSlot(thisPlan.id, wd(2), "lunch", soup, ife.id);
    setSlot(thisPlan.id, wd(2), "dinner", ewa, tunde.id, undefined, "On the table by 18:15 — Bible study is at seven.");
    setSlot(thisPlan.id, wd(3), "breakfast", eggs, tunde.id);
    setSlot(thisPlan.id, wd(3), "lunch", null, dami.id, "Yesterday's bolognese");
    setSlot(thisPlan.id, wd(3), "dinner", fishpie, ife.id);
    setSlot(thisPlan.id, wd(4), "breakfast", porridge, ayo.id, undefined, "Ayo stirs, an adult holds the pan.");
    setSlot(thisPlan.id, wd(4), "lunch", potato, tobi.id);
    setSlot(thisPlan.id, wd(4), "dinner", suya, tunde.id, undefined, "Children's portions out before the rub goes on.");
    setSlot(thisPlan.id, wd(5), "breakfast", pancakes, tobi.id);
    setSlot(thisPlan.id, wd(5), "lunch", soup, dami.id);
    setSlot(thisPlan.id, wd(5), "dinner", efo, ife.id);
    setSlot(thisPlan.id, wd(6), "breakfast", eggs, tunde.id);
    setSlot(thisPlan.id, wd(6), "lunch", sandwiches, ife.id, undefined, "After church, in the car if we're late.");
    setSlot(thisPlan.id, wd(6), "dinner", jollof, ife.id, undefined, "Mama Fọláké rings at six. Eat after.");

    // The week ahead: three things down, eighteen to go — which is what Sunday
    // planning is for.
    setSlot(nextPlan.id, shiftDay(nextWeek, 0), "dinner", bolognese, tunde.id);
    setSlot(nextPlan.id, shiftDay(nextWeek, 2), "dinner", soup, ife.id, undefined, "Bible study again.");
    setSlot(nextPlan.id, shiftDay(nextWeek, 5), "breakfast", pancakes, tobi.id);

    // -- the shop: £142 against £112 left in the envelope ---------------------

    const groceryLists: GroceryList[] = [
        {
            id: uid("grocery"),
            planId: thisPlan.id,
            weekStart: thisWeek,
            totalEstimateCents: 14200,
            foodBudgetRemainingCents: 11200,
            budgetCheckedAt: at(-6, "21:05"),
            createdBy: ife.id,
            createdAt: at(-6, "21:00"),
        },
    ];
    const list = groceryLists[0];

    const groceryItems: GroceryItem[] = [];
    const buy = (item: string, qty: string, priceEstimateCents: number, checked = false, recipeId: string | null = null): void => {
        groceryItems.push({ id: uid("gitem"), listId: list.id, item, qty, priceEstimateCents, checked, recipeId });
    };
    buy("Chicken thighs", "2 kg", 1150, true, jollof.id);
    buy("Chicken breast", "1 kg", 930, false, stirfry.id);
    buy("Long grain rice", "5 kg", 995, true, jollof.id);
    buy("Tinned tomatoes", "6", 420, true, bolognese.id);
    buy("Tomato purée", "2", 190);
    buy("Red peppers", "4", 300, false, jollof.id);
    buy("Scotch bonnet", "4", 100, false, suya.id);
    buy("Onions", "2 kg", 250, true);
    buy("Plantain", "4", 320, false, ewa.id);
    buy("Honey beans", "1 kg", 480, false, ewa.id);
    buy("Beef mince", "1 kg", 700, false, bolognese.id);
    buy("Spaghetti", "3", 285, true, bolognese.id);
    buy("Fish pie mix", "600 g", 950, false, fishpie.id);
    buy("Potatoes", "5 kg", 500, false, potato.id);
    buy("Milk", "12 pints", 320, true);
    buy("Eggs", "18", 420, false, eggs.id);
    buy("Porridge oats", "2 kg", 290, false, porridge.id);
    buy("Bananas", "12", 180, false, porridge.id);
    buy("Spinach and efo greens", "800 g", 350, false, efo.id);
    buy("Palm oil", "500 ml", 425, false, efo.id);
    buy("Red lentils", "1 kg", 180, false, soup.id);
    buy("Bread", "3 loaves", 330, false, sandwiches.id);
    buy("Cheddar", "500 g", 400, false, potato.id);
    buy("Tuna", "6 tins", 480, false, potato.id);
    buy("Apples and satsumas", "—", 450);
    buy("Yoghurt", "8", 300);
    buy("Frozen peas and sweetcorn", "—", 250, false, fishpie.id);
    buy("Suya spice and seasoning", "—", 320, false, suya.id);
    buy("Pounded yam flour", "2 kg", 560, false, efo.id);
    buy("Butter and oil", "—", 385);
    buy("Washing-up liquid and foil", "—", 320);
    buy("Stock cubes", "—", 150);
    buy("Garlic and ginger", "—", 180, false, stirfry.id);
    buy("Carrots and broccoli", "—", 340, false, bolognese.id);

    // -----------------------------------------------------------------------
    // The challenge and the two wellness goals
    // -----------------------------------------------------------------------

    const challenges: Challenge[] = [
        {
            id: uid("challenge"),
            name: "10k steps week",
            blurb: "Seventy thousand steps each between Monday and Sunday. Prams, playgrounds and the walk to church all count.",
            metric: "steps",
            target: 70000,
            start: thisWeek,
            end: shiftDay(thisWeek, 6),
            sprouts: 30,
            memberIds: [ife.id, tunde.id, dami.id, tobi.id, ayo.id],
            completedAt: null,
            creditedMemberIds: [],
            createdBy: tunde.id,
            createdAt: at(-7, "19:00"),
        },
    ];
    const stepChallenge = challenges[0];

    const STEPS: Record<string, number[]> = {
        [ife.id]: [9800, 11200, 10400, 9600, 12500, 13800, 7200],
        [tunde.id]: [8600, 9400, 12100, 10300, 9900, 15600, 6800],
        [dami.id]: [11400, 10800, 9700, 12600, 11100, 9400, 8200],
        [tobi.id]: [12800, 11600, 13400, 10900, 12200, 14100, 9800],
        [ayo.id]: [9200, 8600, 11100, 10800, 9400, 12200, 9300],
    };
    const challengeEntries: ChallengeEntry[] = [];
    for (const [memberId, days] of Object.entries(STEPS)) {
        days.forEach((value, i) => {
            const date = shiftDay(thisWeek, i);
            // Nobody has walked tomorrow yet.
            if (date > day(0)) return;
            challengeEntries.push({ id: uid("centry"), challengeId: stepChallenge.id, memberId, date, value, at: `${date}T21:00:00.000Z` });
        });
    }

    // One that has already finished, so closing a challenge and watching the
    // Sprouts land on the shared ledger is a thing you can click today (AC 7).
    const bedtime: Challenge = {
        id: uid("challenge"),
        name: "Lights out by nine",
        blurb: "Five nights running for the two youngest, while the mornings were still dark and nobody could get up.",
        metric: "days",
        target: 5,
        start: shiftDay(thisWeek, -7),
        end: shiftDay(thisWeek, -1),
        sprouts: 20,
        memberIds: [tobi.id, ayo.id],
        completedAt: null,
        creditedMemberIds: [],
        createdBy: ife.id,
        createdAt: at(-14, "20:00"),
    };
    challenges.push(bedtime);
    [
        [tobi.id, 6],
        [ayo.id, 5],
    ].forEach(([memberId, nights]) => {
        for (let i = 0; i < (nights as number); i++) {
            const date = shiftDay(bedtime.start, i);
            challengeEntries.push({ id: uid("centry"), challengeId: bedtime.id, memberId: memberId as string, date, value: 1, at: `${date}T21:15:00.000Z` });
        }
    });

    const wellnessGoals: WellnessGoal[] = [
        { id: uid("wgoal"), memberId: ife.id, name: "Run 5k without stopping by November", goalId: null, goalLabel: "Look after the body God gave me", target: 5, current: 3, unit: "km", dueDate: day(56), note: "Parkrun at Lloyd Park is the test.", createdAt: at(-40, "20:00") },
        { id: uid("wgoal"), memberId: tunde.id, name: "Seven hours' sleep, five nights a week", goalId: null, goalLabel: "", target: 5, current: 3, unit: "nights", dueDate: null, note: "Laptop out of the bedroom is the whole trick.", createdAt: at(-40, "20:05") },
    ];

    const state: WellnessState = {
        visible: true,
        habits,
        logs,
        freezes,
        plans,
        workouts,
        workoutLogs,
        healthNotes,
        recipes,
        mealPlans,
        slots,
        groceryLists,
        groceryItems,
        challenges,
        challengeEntries,
        wellnessGoals,
        schedule: [],
    };
    state.schedule = scheduleOf(state);
    return state;
}
