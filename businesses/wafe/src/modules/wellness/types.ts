import type { ModuleRepo, Visibility } from "@/data/core";

/**
 * Health, habits, fitness & food — how the family actually lives in its body.
 *
 * Five things live here and they are deliberately one module, because in a
 * household they are one conversation: what we keep doing (HABITS), how we
 * move (WORKOUT PLANS and LOGS), what a parent must remember about each body
 * in the house (HEALTH NOTES), what we eat (MEAL PLANS and RECIPES) and what
 * that costs (the GROCERY LIST, priced against the food budget). A family
 * challenge sits across the top of them.
 *
 * Three ideas carry it:
 *
 *  1. RITUALS, NOT STREAK ANXIETY. A habit names its own rest days
 *     (`graceDays`) and every week carries one FREEZE. Neither breaks a
 *     streak and neither counts towards it — a rested Sunday is not a failure,
 *     and the app never nags on one. That is the brief's "rituals over
 *     streaks" written as arithmetic rather than as a promise.
 *
 *  2. HEALTH IS THE MOST PRIVATE ROW IN THE PRODUCT. A `HealthNote` is
 *     parents-only, full stop, unless a parent has explicitly granted a young
 *     adult sight of their own — and that line is drawn in `visibleTo()` for
 *     the demo and in `sql/wellness.sql` for the API, so it holds in both.
 *
 *  3. FOOD IS A BUDGET EXERCISE. The grocery list prices itself from the
 *     recipes on the week's plan and compares that to what is left in
 *     Finance's "groceries" envelope. We never read Finance's tables: the
 *     screens pass its loaded slice through `foodBudgetFrom()`, and the list
 *     keeps the last number it was told so the warning survives a member who
 *     may not see the budget at all.
 */

// ---------------------------------------------------------------------------
// Habits
// ---------------------------------------------------------------------------

export type HabitKind = "water" | "exercise" | "sleep" | "nutrition" | "reading" | "screens" | "prayer" | "custom";

export const HABIT_KIND_LABEL: Record<HabitKind, string> = {
    water: "Water",
    exercise: "Moving",
    sleep: "Sleep",
    nutrition: "Food",
    reading: "Reading",
    screens: "Screens",
    prayer: "Prayer",
    custom: "Something else",
};

export const HABIT_KIND_EMOJI: Record<HabitKind, string> = {
    water: "💧",
    exercise: "🏃",
    sleep: "🌙",
    nutrition: "🥗",
    reading: "📖",
    screens: "📵",
    prayer: "🙏",
    custom: "⭐",
};

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const WEEKDAY_LABEL: Record<Weekday, string> = { 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat", 7: "Sun" };

export interface Habit {
    id: string;
    memberId: string;
    name: string;
    kind: HabitKind;
    /** What a kept day looks like: 8 glasses, 30 minutes, 1 (just do it). */
    target: number;
    /** "glasses", "min", "h", "times" — shown after the number. */
    unit: string;
    /** HH:MM. After this, an unlogged habit raises exactly one nudge (AC 1). */
    checkinTime: string;
    /** One of the family's values, by name ("Diligence"). */
    valueId: string | null;
    /** Days this habit rests. No streak break, no count, no nudge (AC 1, AC 2). */
    graceDays: Weekday[];
    /** Sprouts a child earns per kept day (0 for adults). */
    sprouts: number;
    note: string;
    active: boolean;
    visibility: Visibility;
    createdAt: string;
}

export interface HabitLog {
    id: string;
    habitId: string;
    memberId: string;
    /** YYYY-MM-DD. */
    date: string;
    value: number;
    loggedAt: string;
}

/** One per habit per week: a day the streak survives untouched (AC 2). */
export interface StreakFreeze {
    id: string;
    habitId: string;
    memberId: string;
    /** Monday-anchored ISO date. */
    weekStart: string;
    /** The day it covers. */
    usedOn: string;
    reason: string;
    at: string;
}

/** What a streak actually is, once grace days and freezes are honoured. */
export interface HabitStats {
    habitId: string;
    memberId: string;
    current: number;
    best: number;
    /** Kept / expected across the last 7 days, ignoring rest days. */
    weekKept: number;
    weekExpected: number;
    weekPct: number;
    /** Today: logged, resting, or still owed. */
    todayState: "kept" | "part" | "rest" | "frozen" | "open";
    todayValue: number;
    /** Oldest → newest, 14 entries, for the strip. */
    strip: HabitDay[];
    /** True when a freeze is still available this week. */
    freezeAvailable: boolean;
}

export interface HabitDay {
    date: string;
    label: string;
    value: number;
    kept: boolean;
    rest: boolean;
    frozen: boolean;
    today: boolean;
}

// ---------------------------------------------------------------------------
// Workouts
// ---------------------------------------------------------------------------

export type WorkoutFocus = "strength" | "cardio" | "mobility" | "family" | "kids";

export const FOCUS_LABEL: Record<WorkoutFocus, string> = {
    strength: "Strength",
    cardio: "Cardio",
    mobility: "Mobility",
    family: "All of us",
    kids: "For the children",
};

export interface Exercise {
    name: string;
    sets: number | null;
    reps: string;
    minutes: number | null;
    note: string;
}

/** One session in a routine template: which day of the week, and what's in it. */
export interface TemplateSession {
    title: string;
    /** ISO weekday the routine puts it on. */
    weekday: Weekday;
    durationMin: number;
    exercises: Exercise[];
}

/**
 * The named routine catalogue. Live, these are `wf_catalog_workouts` rows
 * seeded per organisation by `wf_seed_wellness`; in the demo they are this
 * constant. A plan is a copy of one, dated — so editing a plan never rewrites
 * the routine everyone else started from.
 */
export interface WorkoutTemplate {
    id: string;
    name: string;
    blurb: string;
    focus: WorkoutFocus;
    /** Who it is written for. */
    band: "adult" | "teen" | "child" | "family";
    weeks: number;
    imageUrl: string;
    sessions: TemplateSession[];
}

export interface WorkoutPlan {
    id: string;
    memberId: string | null;
    name: string;
    templateId: string | null;
    focus: WorkoutFocus;
    goalId: string | null;
    goalLabel: string;
    weeks: number;
    /** Monday-anchored ISO date of week 1. */
    startDate: string;
    note: string;
    active: boolean;
    createdBy: string;
    createdAt: string;
}

/** A scheduled session. This is what the schedule grid — and any calendar that
 *  reads our slice — renders. */
export interface Workout {
    id: string;
    planId: string | null;
    memberId: string | null;
    /** YYYY-MM-DD. */
    date: string;
    title: string;
    focus: WorkoutFocus;
    week: number;
    durationMin: number;
    exercises: Exercise[];
    createdAt: string;
}

export interface WorkoutLog {
    id: string;
    workoutId: string | null;
    planId: string | null;
    memberId: string;
    date: string;
    title: string;
    durationMin: number;
    /** Free-form per-exercise record: "Squats 3×10 @ 20kg". */
    sets: string[];
    feel: "easy" | "good" | "tough";
    notes: string;
    loggedAt: string;
}

export const FEEL_LABEL: Record<WorkoutLog["feel"], string> = { easy: "Easy", good: "Just right", tough: "Tough" };

/** A workout the rest of the product can overlay without importing our maths. */
export interface ScheduleItem {
    id: string;
    date: string;
    title: string;
    memberId: string | null;
    durationMin: number;
    focus: WorkoutFocus;
    done: boolean;
    href: string;
}

// ---------------------------------------------------------------------------
// Health — the parents-only rows
// ---------------------------------------------------------------------------

export interface Appointment {
    id: string;
    what: string;
    who: string;
    /** ISO datetime. */
    at: string;
    place: string;
    note: string;
}

export interface Vaccination {
    id: string;
    name: string;
    /** YYYY-MM-DD. */
    date: string;
    dueAgain: string | null;
}

export interface Measurement {
    id: string;
    date: string;
    heightCm: number | null;
    weightKg: number | null;
    note: string;
}

export interface HealthNote {
    id: string;
    memberId: string;
    allergies: string;
    medications: string;
    conditions: string;
    gp: string;
    dentist: string;
    nhsNumber: string;
    appointments: Appointment[];
    vaccinations: Vaccination[];
    measurements: Measurement[];
    notes: string;
    /** Always "health": the sensitivity class the brief excludes from every
     *  child and guest context pack. */
    sensitivity: "health";
    updatedBy: string;
    updatedAt: string;
}

// ---------------------------------------------------------------------------
// Food
// ---------------------------------------------------------------------------

export type MealSlotKind = "breakfast" | "lunch" | "dinner";

export const SLOT_LABEL: Record<MealSlotKind, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner" };
export const SLOT_ORDER: MealSlotKind[] = ["breakfast", "lunch", "dinner"];

export interface Ingredient {
    item: string;
    qty: string;
    priceEstimateCents: number;
}

export interface Recipe {
    id: string;
    name: string;
    blurb: string;
    imageUrl: string | null;
    ingredients: Ingredient[];
    steps: string[];
    servings: number;
    minutes: number;
    /** What one cook of it costs, in the space's currency. */
    costEstimateCents: number;
    /** A child may see it, and a junior can help cook it. */
    childSafe: boolean;
    tags: string[];
    createdAt: string;
}

export interface MealPlan {
    id: string;
    /** Monday-anchored ISO date. */
    weekStart: string;
    note: string;
    createdBy: string;
    createdAt: string;
}

export interface MealSlot {
    id: string;
    planId: string;
    date: string;
    slot: MealSlotKind;
    recipeId: string | null;
    /** Stamped, so a child sees "Jollof rice" without reading the recipe row. */
    title: string;
    cookMemberId: string | null;
    note: string;
}

export interface GroceryList {
    id: string;
    planId: string;
    weekStart: string;
    /** Sum of the items; recomputed on every read. */
    totalEstimateCents: number;
    /**
     * What Finance last told us was left in the food envelope. The screens
     * refresh it from the live slice for a parent; anyone else sees the number
     * as it stood, which is why the warning survives (AC 3).
     */
    foodBudgetRemainingCents: number;
    budgetCheckedAt: string;
    createdBy: string;
    createdAt: string;
}

export interface GroceryItem {
    id: string;
    listId: string;
    item: string;
    qty: string;
    priceEstimateCents: number;
    checked: boolean;
    /** Which recipe put it on the list (null = added by hand). */
    recipeId: string | null;
}

/** Finance's "groceries" envelope, as this module reads it. Never a table join. */
export interface FoodBudget {
    categoryId: string;
    name: string;
    budgetCents: number;
    spentCents: number;
    remainingCents: number;
    /** True when it came from the live Finance slice this render. */
    live: boolean;
}

// ---------------------------------------------------------------------------
// Challenges and wellness goals
// ---------------------------------------------------------------------------

export type ChallengeMetric = "steps" | "minutes" | "glasses" | "days";

export const METRIC_LABEL: Record<ChallengeMetric, string> = { steps: "steps", minutes: "minutes", glasses: "glasses", days: "days" };

export interface Challenge {
    id: string;
    name: string;
    blurb: string;
    metric: ChallengeMetric;
    /** Per member, across the whole window. */
    target: number;
    start: string;
    end: string;
    /** Sprouts each child who hits the target is credited on completion. */
    sprouts: number;
    memberIds: string[];
    /** Set when a parent closed it; Sprouts are only ever credited once. */
    completedAt: string | null;
    creditedMemberIds: string[];
    createdBy: string;
    createdAt: string;
}

export interface ChallengeEntry {
    id: string;
    challengeId: string;
    memberId: string;
    date: string;
    value: number;
    at: string;
}

export interface ChallengeStanding {
    memberId: string;
    total: number;
    pct: number;
    hit: boolean;
}

export interface WellnessGoal {
    id: string;
    memberId: string | null;
    name: string;
    /** The Goals module's goal this measures, when there is one. */
    goalId: string | null;
    goalLabel: string;
    target: number;
    current: number;
    unit: string;
    dueDate: string | null;
    note: string;
    createdAt: string;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface WellnessState {
    /** False for a guest: this module renders nothing at all for them. */
    visible: boolean;
    habits: Habit[];
    logs: HabitLog[];
    freezes: StreakFreeze[];
    plans: WorkoutPlan[];
    workouts: Workout[];
    workoutLogs: WorkoutLog[];
    /** Parents get everyone's; a granted young adult gets exactly their own. */
    healthNotes: HealthNote[];
    recipes: Recipe[];
    mealPlans: MealPlan[];
    slots: MealSlot[];
    groceryLists: GroceryList[];
    groceryItems: GroceryItem[];
    challenges: Challenge[];
    challengeEntries: ChallengeEntry[];
    wellnessGoals: WellnessGoal[];
    /** Stamped read-out: every scheduled session, for a calendar overlay. */
    schedule: ScheduleItem[];
}

export const EMPTY_WELLNESS: WellnessState = {
    visible: false,
    habits: [],
    logs: [],
    freezes: [],
    plans: [],
    workouts: [],
    workoutLogs: [],
    healthNotes: [],
    recipes: [],
    mealPlans: [],
    slots: [],
    groceryLists: [],
    groceryItems: [],
    challenges: [],
    challengeEntries: [],
    wellnessGoals: [],
    schedule: [],
};

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export interface NewHabit {
    memberId: string;
    name: string;
    kind: HabitKind;
    target: number;
    unit: string;
    checkinTime?: string;
    graceDays?: Weekday[];
    valueId?: string | null;
    sprouts?: number;
    note?: string;
}

export interface LogResult {
    habitId: string;
    memberId: string;
    date: string;
    kept: boolean;
    current: number;
    best: number;
    /** Sprouts this log earned a child (0 for adults, or a day already kept). */
    sprouts: number;
    habitName: string;
}

export interface NewWorkoutLog {
    durationMin: number;
    sets?: string[];
    feel?: WorkoutLog["feel"];
    notes?: string;
    date?: string;
}

export interface NewRecipe {
    name: string;
    blurb?: string;
    imageUrl?: string | null;
    ingredients: Ingredient[];
    steps?: string[];
    servings?: number;
    minutes?: number;
    childSafe?: boolean;
    tags?: string[];
}

/** The shape `meal-plan` comes back in (docs/AI.md). */
export interface AiMealPlan {
    days?: Array<{ date?: string; day?: string; breakfast?: string; lunch?: string; dinner?: string }>;
    grocery?: Array<{ item?: string; qty?: string; estCents?: number }>;
    totalCents?: number;
    note?: string;
}

export interface ChallengeCredit {
    memberId: string;
    sprouts: number;
}

export interface WellnessRepo extends ModuleRepo<WellnessState> {
    // -- habits ---------------------------------------------------------------
    addHabit(input: NewHabit): Promise<Habit>;
    updateHabit(id: string, patch: Partial<Omit<Habit, "id" | "memberId">>): Promise<void>;
    removeHabit(id: string): Promise<void>;
    /** One tap: log today's habit (or a past day) and hand back the new streak. */
    logHabit(habitId: string, value?: number, date?: string): Promise<LogResult>;
    unlogHabit(habitId: string, date: string): Promise<void>;
    /** Spend this week's freeze on a day, so the streak survives it (AC 2). */
    useFreeze(habitId: string, date: string, reason?: string): Promise<StreakFreeze>;
    releaseFreeze(id: string): Promise<void>;

    // -- workouts -------------------------------------------------------------
    startPlan(templateId: string, input: { memberId: string | null; startDate?: string; weeks?: number; goalId?: string | null; goalLabel?: string }): Promise<WorkoutPlan>;
    removePlan(id: string): Promise<void>;
    addWorkout(input: { planId?: string | null; memberId: string | null; date: string; title: string; durationMin: number; focus?: WorkoutFocus; exercises?: Exercise[] }): Promise<Workout>;
    removeWorkout(id: string): Promise<void>;
    logWorkout(workoutId: string | null, input: NewWorkoutLog & { title?: string; memberId?: string; planId?: string | null }): Promise<WorkoutLog>;
    removeWorkoutLog(id: string): Promise<void>;

    // -- health (parents, and a granted young adult on their own row) ----------
    saveHealthNote(memberId: string, patch: Partial<Omit<HealthNote, "id" | "memberId" | "sensitivity">>): Promise<HealthNote>;
    addAppointment(memberId: string, input: Omit<Appointment, "id">): Promise<void>;
    removeAppointment(memberId: string, appointmentId: string): Promise<void>;
    addMeasurement(memberId: string, input: Omit<Measurement, "id">): Promise<void>;
    addVaccination(memberId: string, input: Omit<Vaccination, "id">): Promise<void>;

    // -- food -----------------------------------------------------------------
    addRecipe(input: NewRecipe): Promise<Recipe>;
    updateRecipe(id: string, patch: Partial<NewRecipe>): Promise<void>;
    removeRecipe(id: string): Promise<void>;
    ensureMealPlan(weekStart: string): Promise<MealPlan>;
    setMealSlot(planId: string, date: string, slot: MealSlotKind, input: { recipeId?: string | null; title?: string; cookMemberId?: string | null; note?: string }): Promise<MealSlot>;
    clearMealSlot(planId: string, date: string, slot: MealSlotKind): Promise<void>;
    copyWeek(fromWeekStart: string, toWeekStart: string): Promise<MealPlan>;
    /** Price the week from its recipes and (re)build the shopping list. */
    buildGroceryList(planId: string, foodBudgetRemainingCents?: number): Promise<GroceryList>;
    addGroceryItem(listId: string, input: { item: string; qty?: string; priceEstimateCents?: number }): Promise<GroceryItem>;
    updateGroceryItem(id: string, patch: Partial<Pick<GroceryItem, "item" | "qty" | "priceEstimateCents" | "checked">>): Promise<void>;
    removeGroceryItem(id: string): Promise<void>;
    /** Keep the list's copy of the food envelope in step with Finance (AC 3). */
    setFoodBudgetRemaining(listId: string, cents: number): Promise<void>;
    applyAiMealPlan(planId: string, plan: AiMealPlan): Promise<void>;

    // -- challenges and goals -------------------------------------------------
    createChallenge(input: { name: string; blurb?: string; metric: ChallengeMetric; target: number; start: string; end: string; sprouts: number; memberIds: string[] }): Promise<Challenge>;
    logChallenge(challengeId: string, memberId: string, value: number, date?: string): Promise<void>;
    /** Close it and say who earned what; the page credits the shared ledger. */
    completeChallenge(id: string): Promise<ChallengeCredit[]>;
    removeChallenge(id: string): Promise<void>;
    addWellnessGoal(input: { memberId: string | null; name: string; target: number; unit: string; current?: number; dueDate?: string | null; goalId?: string | null; goalLabel?: string; note?: string }): Promise<WellnessGoal>;
    updateWellnessGoal(id: string, patch: Partial<Pick<WellnessGoal, "name" | "target" | "current" | "unit" | "dueDate" | "note" | "goalId" | "goalLabel">>): Promise<void>;
    removeWellnessGoal(id: string): Promise<void>;
}
