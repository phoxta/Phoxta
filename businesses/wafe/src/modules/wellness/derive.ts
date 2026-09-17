import type { AgendaItem, AttentionItem, ChildCard, DashboardContribution, Member, Nudge, ProgressRing, RepoContext } from "@/data/core";
import { clamp, isoDate, pct as pctOf, weekStart as weekStartOf } from "@/lib/format";
import type {
    Challenge,
    ChallengeStanding,
    FoodBudget,
    GroceryItem,
    GroceryList,
    Habit,
    HabitDay,
    HabitLog,
    HabitStats,
    HealthNote,
    MealPlan,
    MealSlot,
    MealSlotKind,
    Recipe,
    ScheduleItem,
    StreakFreeze,
    WellnessState,
    Weekday,
    Workout,
    WorkoutLog,
    WorkoutPlan,
} from "./types";
import { HABIT_KIND_EMOJI, SLOT_ORDER } from "./types";

/**
 * Every number the screens show — and, first, the one function both repos use
 * to decide what a member may receive.
 *
 * The two pieces of arithmetic that carry the module's promises live here:
 *
 *  · `streakOf` walks backwards a day at a time and treats a GRACE DAY and a
 *    spent FREEZE as neither a break nor a step. A rested Sunday leaves a
 *    twelve-day streak at twelve, not at zero (AC 2), and today never breaks a
 *    streak because the day is not over yet.
 *
 *  · `groceryTotal` vs `FoodBudget.remainingCents` is the only place the
 *    warning is decided (AC 3). The budget arrives from Finance's loaded slice
 *    through `foodBudgetFrom` — a read of another module's STATE, never of its
 *    tables — and the list also keeps the last number it was told, so the
 *    warning is still true on a screen that cannot see the envelope.
 */

export const BASE = "/live/wellness";

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

/** Noon, so a day never slips over a DST boundary. */
const atNoon = (date: string): Date => new Date(`${date.slice(0, 10)}T12:00:00`);

export function shiftDay(date: string, days: number): string {
    const d = atNoon(date);
    d.setDate(d.getDate() + days);
    return isoDate(d);
}

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function isoWeekday(date: string): Weekday {
    const d = atNoon(date).getDay();
    return (d === 0 ? 7 : d) as Weekday;
}

export function daysBetween(from: string, to: string): number {
    return Math.round((atNoon(to).getTime() - atNoon(from).getTime()) / 86400000);
}

export const dayLabel = (date: string): string => atNoon(date).toLocaleDateString("en-GB", { weekday: "short" });

export const dayNumber = (date: string): string => atNoon(date).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/** Monday-anchored week containing `date`. */
export const weekOf = (date: string): string => weekStartOf(atNoon(date));

/** The seven ISO dates of the week beginning `weekStart`. */
export const weekDays = (weekStart: string): string[] => Array.from({ length: 7 }, (_, i) => shiftDay(weekStart, i));

export const monthOf = (date: string): string => date.slice(0, 7);

// ---------------------------------------------------------------------------
// What this member may receive
// ---------------------------------------------------------------------------

/**
 * A child sees their own habits, their own workouts and the week's meals — and
 * nothing else. Health notes are a parent's row unless a parent has widened
 * this member's wellness access, which is exactly the line `sql/wellness.sql`
 * draws at the API (AC 4). A guest gets an empty module: wellness is not a
 * thing you share with a house-guest.
 */
export function visibleTo(state: WellnessState, ctx: RepoContext): WellnessState {
    const me = ctx.me;

    if (me.role === "guest") return { ...emptyState(), visible: false };

    if (me.role === "parent") {
        const full: WellnessState = { ...state, visible: true, schedule: [] };
        full.schedule = scheduleOf(full);
        return full;
    }

    // A child: their own body, and what's for dinner.
    const habits = state.habits.filter((h) => h.memberId === me.id);
    const ids = new Set(habits.map((h) => h.id));
    const plans = state.plans.filter((p) => p.memberId === me.id || p.memberId === null);
    const planIds = new Set(plans.map((p) => p.id));
    const workouts = state.workouts.filter((w) => w.memberId === me.id || (w.planId && planIds.has(w.planId) && w.memberId === null));

    const next: WellnessState = {
        visible: true,
        habits,
        logs: state.logs.filter((l) => ids.has(l.habitId) && l.memberId === me.id),
        freezes: state.freezes.filter((f) => ids.has(f.habitId)),
        plans,
        workouts,
        workoutLogs: state.workoutLogs.filter((l) => l.memberId === me.id),
        // Only ever their own, and only when a parent has granted it (AC 4).
        healthNotes: canSeeHealth(ctx, me.id) ? state.healthNotes.filter((h) => h.memberId === me.id) : [],
        recipes: state.recipes.filter((r) => r.childSafe),
        mealPlans: state.mealPlans,
        slots: state.slots,
        // The shopping and its prices are a parent's business.
        groceryLists: [],
        groceryItems: [],
        challenges: state.challenges.filter((c) => !c.memberIds.length || c.memberIds.includes(me.id)),
        challengeEntries: state.challengeEntries.filter((e) => state.challenges.some((c) => c.id === e.challengeId && (!c.memberIds.length || c.memberIds.includes(me.id)))),
        wellnessGoals: state.wellnessGoals.filter((g) => g.memberId === me.id),
        schedule: [],
    };
    next.schedule = scheduleOf(next);
    return next;
}

export function emptyState(): WellnessState {
    return {
        visible: true,
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
}

/** Who may read a member's health note: parents, and the member when granted. */
export function canSeeHealth(ctx: RepoContext, memberId: string): boolean {
    if (ctx.role === "parent") return true;
    return ctx.me.id === memberId && ctx.can("wellness.manage");
}

// ---------------------------------------------------------------------------
// Habits: logs, grace days, freezes and streaks
// ---------------------------------------------------------------------------

export const habitById = (state: WellnessState, id: string): Habit | undefined => state.habits.find((h) => h.id === id);

export const habitsFor = (state: WellnessState, memberId: string): Habit[] => state.habits.filter((h) => h.active && h.memberId === memberId);

export const logFor = (state: WellnessState, habitId: string, date: string): HabitLog | undefined => state.logs.find((l) => l.habitId === habitId && l.date === date);

export const valueOn = (state: WellnessState, habitId: string, date: string): number => logFor(state, habitId, date)?.value ?? 0;

/** A rest day: written into the habit, so it is a decision and not a lapse. */
export const isRestDay = (habit: Habit, date: string): boolean => habit.graceDays.includes(isoWeekday(date));

export const freezeOn = (state: WellnessState, habitId: string, date: string): StreakFreeze | undefined => state.freezes.find((f) => f.habitId === habitId && f.usedOn === date);

export const freezeForWeek = (state: WellnessState, habitId: string, weekStart: string): StreakFreeze | undefined => state.freezes.find((f) => f.habitId === habitId && f.weekStart === weekStart);

export const isKept = (state: WellnessState, habit: Habit, date: string): boolean => valueOn(state, habit.id, date) >= habit.target;

/** The earliest day worth walking back to. */
function firstDay(state: WellnessState, habit: Habit, today: string): string {
    const dates = state.logs.filter((l) => l.habitId === habit.id).map((l) => l.date);
    const created = isoDate(habit.createdAt);
    const earliest = dates.length ? dates.reduce((a, b) => (a < b ? a : b)) : created;
    const floor = shiftDay(today, -180);
    return earliest < floor ? floor : earliest;
}

/**
 * The current streak. Rest days and frozen days are stepped over — they never
 * break it and never count towards it — and today is never a break, because
 * the day is not finished (AC 2).
 */
export function streakOf(state: WellnessState, habit: Habit, today: string): number {
    const stop = firstDay(state, habit, today);
    let n = 0;
    for (let i = 0; i < 400; i++) {
        const d = shiftDay(today, -i);
        if (d < stop) break;
        if (isRestDay(habit, d) || freezeOn(state, habit.id, d)) continue;
        if (isKept(state, habit, d)) {
            n += 1;
            continue;
        }
        if (i === 0) continue;
        break;
    }
    return n;
}

/** The longest run this habit has ever had, on the same rules. */
export function bestStreakOf(state: WellnessState, habit: Habit, today: string): number {
    const start = firstDay(state, habit, today);
    const span = Math.max(0, daysBetween(start, today));
    let run = 0;
    let best = 0;
    for (let i = 0; i <= span; i++) {
        const d = shiftDay(start, i);
        if (isRestDay(habit, d) || freezeOn(state, habit.id, d)) continue;
        if (isKept(state, habit, d)) {
            run += 1;
            best = Math.max(best, run);
            continue;
        }
        if (d === today) continue;
        run = 0;
    }
    return Math.max(best, run);
}

export function habitStrip(state: WellnessState, habit: Habit, today: string, days = 14): HabitDay[] {
    const out: HabitDay[] = [];
    for (let i = days - 1; i >= 0; i--) {
        const date = shiftDay(today, -i);
        out.push({
            date,
            label: dayLabel(date).slice(0, 1),
            value: valueOn(state, habit.id, date),
            kept: isKept(state, habit, date),
            rest: isRestDay(habit, date),
            frozen: Boolean(freezeOn(state, habit.id, date)),
            today: date === today,
        });
    }
    return out;
}

export function habitStats(state: WellnessState, habit: Habit, today: string): HabitStats {
    const strip = habitStrip(state, habit, today);
    const week = strip.slice(-7);
    const expected = week.filter((d) => !d.rest && !d.frozen).length;
    const kept = week.filter((d) => d.kept).length;
    const todayValue = valueOn(state, habit.id, today);
    const todayState: HabitStats["todayState"] = isRestDay(habit, today)
        ? "rest"
        : freezeOn(state, habit.id, today)
          ? "frozen"
          : todayValue >= habit.target
            ? "kept"
            : todayValue > 0
              ? "part"
              : "open";
    return {
        habitId: habit.id,
        memberId: habit.memberId,
        current: streakOf(state, habit, today),
        best: bestStreakOf(state, habit, today),
        weekKept: kept,
        weekExpected: expected,
        weekPct: pctOf(kept, expected),
        todayState,
        todayValue,
        strip,
        freezeAvailable: !freezeForWeek(state, habit.id, weekOf(today)),
    };
}

/** Habits this member still owes today (rest days excluded — that is the point). */
export function habitsDue(state: WellnessState, memberId: string, today: string): Habit[] {
    return habitsFor(state, memberId).filter((h) => !isRestDay(h, today) && !freezeOn(state, h.id, today) && !isKept(state, h, today));
}

/** How much of this member's week is kept, across every habit. */
export function weekScore(state: WellnessState, memberId: string, today: string): { kept: number; expected: number; pct: number } {
    let kept = 0;
    let expected = 0;
    for (const h of habitsFor(state, memberId)) {
        const s = habitStats(state, h, today);
        kept += s.weekKept;
        expected += s.weekExpected;
    }
    return { kept, expected, pct: pctOf(kept, expected) };
}

export function familyWeekScore(state: WellnessState, members: Member[], today: string): { kept: number; expected: number; pct: number } {
    let kept = 0;
    let expected = 0;
    for (const m of members) {
        const s = weekScore(state, m.id, today);
        kept += s.kept;
        expected += s.expected;
    }
    return { kept, expected, pct: pctOf(kept, expected) };
}

export const habitEmoji = (habit: Habit): string => HABIT_KIND_EMOJI[habit.kind] ?? "⭐";

export function targetLabel(habit: Habit): string {
    if (habit.target <= 1 && !habit.unit) return "Done or not";
    return `${habit.target}${habit.unit ? ` ${habit.unit}` : ""}`;
}

// ---------------------------------------------------------------------------
// Workouts
// ---------------------------------------------------------------------------

export const planById = (state: WellnessState, id: string | null): WorkoutPlan | undefined => (id ? state.plans.find((p) => p.id === id) : undefined);

export const workoutById = (state: WellnessState, id: string): Workout | undefined => state.workouts.find((w) => w.id === id);

export const logForWorkout = (state: WellnessState, workoutId: string): WorkoutLog | undefined => state.workoutLogs.find((l) => l.workoutId === workoutId);

export const isWorkoutDone = (state: WellnessState, workoutId: string): boolean => state.workoutLogs.some((l) => l.workoutId === workoutId);

/** Which week of the plan `date` falls in, 1-based. */
export function planWeek(plan: WorkoutPlan, date: string): number {
    return clamp(Math.floor(daysBetween(plan.startDate, date) / 7) + 1, 1, plan.weeks);
}

export function planProgress(state: WellnessState, plan: WorkoutPlan, today: string): { done: number; total: number; pct: number; week: number } {
    const mine = state.workouts.filter((w) => w.planId === plan.id);
    const done = mine.filter((w) => isWorkoutDone(state, w.id)).length;
    return { done, total: mine.length, pct: pctOf(done, mine.length), week: planWeek(plan, today) };
}

export function workoutsOn(state: WellnessState, date: string, memberId?: string): Workout[] {
    return state.workouts.filter((w) => w.date === date && (!memberId || w.memberId === memberId || w.memberId === null));
}

/** The next fortnight of sessions, so a plan has a schedule and not just a list. */
export function upcomingWorkouts(state: WellnessState, today: string, days = 14, memberId?: string): Workout[] {
    const end = shiftDay(today, days);
    return state.workouts
        .filter((w) => w.date >= today && w.date <= end && (!memberId || w.memberId === memberId || w.memberId === null))
        .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

/** What a calendar would overlay: every scheduled session, already flattened. */
export function scheduleOf(state: WellnessState): ScheduleItem[] {
    return state.workouts
        .map((w) => ({
            id: w.id,
            date: w.date,
            title: w.title,
            memberId: w.memberId,
            durationMin: w.durationMin,
            focus: w.focus,
            done: state.workoutLogs.some((l) => l.workoutId === w.id),
            href: `${BASE}/workouts?workout=${w.id}`,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
}

export function workoutMinutes(state: WellnessState, memberId: string, fromDate: string, toDate: string): number {
    return state.workoutLogs.filter((l) => l.memberId === memberId && l.date >= fromDate && l.date <= toDate).reduce((n, l) => n + l.durationMin, 0);
}

export function recentLogs(state: WellnessState, memberId?: string, limit = 10): WorkoutLog[] {
    return [...state.workoutLogs]
        .filter((l) => !memberId || l.memberId === memberId)
        .sort((a, b) => b.date.localeCompare(a.date) || b.loggedAt.localeCompare(a.loggedAt))
        .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export const healthFor = (state: WellnessState, memberId: string): HealthNote | undefined => state.healthNotes.find((h) => h.memberId === memberId);

export function upcomingAppointments(state: WellnessState, today: string, withinDays = 30): Array<{ note: HealthNote; appt: HealthNote["appointments"][number] }> {
    const end = shiftDay(today, withinDays);
    const out: Array<{ note: HealthNote; appt: HealthNote["appointments"][number] }> = [];
    for (const note of state.healthNotes) {
        for (const appt of note.appointments) {
            const d = isoDate(appt.at);
            if (d >= today && d <= end) out.push({ note, appt });
        }
    }
    return out.sort((a, b) => a.appt.at.localeCompare(b.appt.at));
}

export function latestMeasurement(note: HealthNote): HealthNote["measurements"][number] | undefined {
    return [...note.measurements].sort((a, b) => b.date.localeCompare(a.date))[0];
}

// ---------------------------------------------------------------------------
// Food
// ---------------------------------------------------------------------------

export const recipeById = (state: WellnessState, id: string | null): Recipe | undefined => (id ? state.recipes.find((r) => r.id === id) : undefined);

export const planForWeek = (state: WellnessState, weekStart: string): MealPlan | undefined => state.mealPlans.find((p) => p.weekStart === weekStart);

export const slotsForPlan = (state: WellnessState, planId: string): MealSlot[] => state.slots.filter((s) => s.planId === planId);

export const slotOn = (state: WellnessState, planId: string, date: string, slot: MealSlotKind): MealSlot | undefined =>
    state.slots.find((s) => s.planId === planId && s.date === date && s.slot === slot);

/** Tonight's dinner, wherever this week's plan happens to be. */
export function dinnerOn(state: WellnessState, date: string): MealSlot | undefined {
    const plan = planForWeek(state, weekOf(date));
    if (!plan) return undefined;
    return slotOn(state, plan.id, date, "dinner");
}

export function mealsOn(state: WellnessState, date: string): MealSlot[] {
    const plan = planForWeek(state, weekOf(date));
    if (!plan) return [];
    return SLOT_ORDER.map((s) => slotOn(state, plan.id, date, s)).filter((s): s is MealSlot => Boolean(s));
}

export function planFilled(state: WellnessState, planId: string): { filled: number; total: number; pct: number } {
    const slots = slotsForPlan(state, planId).filter((s) => s.title.trim());
    return { filled: slots.length, total: 21, pct: pctOf(slots.length, 21) };
}

export const listForPlan = (state: WellnessState, planId: string): GroceryList | undefined => state.groceryLists.find((l) => l.planId === planId);

export const itemsForList = (state: WellnessState, listId: string): GroceryItem[] => state.groceryItems.filter((i) => i.listId === listId);

export const groceryTotal = (state: WellnessState, listId: string): number => itemsForList(state, listId).reduce((n, i) => n + i.priceEstimateCents, 0);

export const groceryLeftToBuy = (state: WellnessState, listId: string): number => itemsForList(state, listId).filter((i) => !i.checked).reduce((n, i) => n + i.priceEstimateCents, 0);

/** The whole of AC 3, in one place. */
export function budgetVerdict(totalCents: number, remainingCents: number): { over: boolean; near: boolean; diffCents: number; pct: number } {
    const diffCents = totalCents - remainingCents;
    return {
        over: remainingCents >= 0 && totalCents > remainingCents,
        near: remainingCents > 0 && totalCents <= remainingCents && totalCents >= remainingCents * 0.85,
        diffCents,
        pct: remainingCents > 0 ? Math.round((totalCents / remainingCents) * 100) : totalCents > 0 ? 100 : 0,
    };
}

// -- Finance, read through its loaded state and never through its tables ------

type Unknown = Record<string, unknown>;
const obj = (v: unknown): Unknown | null => (v && typeof v === "object" ? (v as Unknown) : null);
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const str = (v: unknown): string => (typeof v === "string" ? v : "");

/**
 * Finance's food envelope, duck-typed off its loaded slice. Wellness never
 * imports Finance's types or touches its tables; if Finance is not loaded, or
 * this member may not see money, we simply get `null` and fall back to the
 * number the grocery list was last told.
 */
export function foodBudgetFrom(finance: unknown): FoodBudget | null {
    const s = obj(finance);
    if (!s || s.visible !== true) return null;
    const summary = obj(s.summary);
    const rows = Array.isArray(summary?.categories) ? (summary?.categories as unknown[]) : [];
    for (const raw of rows) {
        const c = obj(raw);
        if (!c) continue;
        const id = str(c.categoryId);
        const name = str(c.name);
        const isFood = c.isFood === true || id === "groceries" || /grocer|food|shopping/i.test(name);
        if (!isFood) continue;
        const budgetCents = num(c.budgetCents);
        const spentCents = num(c.spentCents);
        return { categoryId: id || "groceries", name: name || "Groceries", budgetCents, spentCents, remainingCents: Math.max(0, budgetCents - spentCents), live: true };
    }
    return null;
}

// ---------------------------------------------------------------------------
// Challenges and wellness goals
// ---------------------------------------------------------------------------

export const challengeById = (state: WellnessState, id: string): Challenge | undefined => state.challenges.find((c) => c.id === id);

export function standings(state: WellnessState, challenge: Challenge): ChallengeStanding[] {
    return challenge.memberIds
        .map((memberId) => {
            const total = state.challengeEntries.filter((e) => e.challengeId === challenge.id && e.memberId === memberId).reduce((n, e) => n + e.value, 0);
            return { memberId, total, pct: pctOf(total, challenge.target), hit: total >= challenge.target };
        })
        .sort((a, b) => b.total - a.total);
}

export const challengePct = (state: WellnessState, challenge: Challenge): number => {
    const rows = standings(state, challenge);
    return rows.length ? Math.round(rows.reduce((n, r) => n + Math.min(100, r.pct), 0) / rows.length) : 0;
};

export const liveChallenges = (state: WellnessState, today: string): Challenge[] => state.challenges.filter((c) => !c.completedAt && c.start <= today && c.end >= today);

export const closableChallenges = (state: WellnessState, today: string): Challenge[] => state.challenges.filter((c) => !c.completedAt && c.end <= today);

export const goalPct = (g: { current: number; target: number }): number => pctOf(g.current, g.target || 1);

// ---------------------------------------------------------------------------
// The shared surfaces
// ---------------------------------------------------------------------------

const first = (members: Member[], id: string | null): string => (id ? (members.find((m) => m.id === id)?.name.split(" ")[0] ?? "Someone") : "All of us");

function agendaHabit(habit: Habit, ctx: RepoContext, kept: boolean): AgendaItem {
    return {
        id: `habit-${habit.id}`,
        moduleId: "wellness",
        area: "live",
        title: habit.name,
        meta: `Habit · ${targetLabel(habit)}${habit.checkinTime ? ` · by ${habit.checkinTime}` : ""}`,
        memberId: habit.memberId,
        at: habit.checkinTime ? `${ctx.today}T${habit.checkinTime}:00` : null,
        done: kept,
        href: `${BASE}/habits?habit=${habit.id}`,
        sort: habit.checkinTime ? Number(habit.checkinTime.replace(":", "")) : 1200,
    };
}

export function dashboard(state: WellnessState, ctx: RepoContext): DashboardContribution {
    if (!state.visible) return {};
    const agenda: AgendaItem[] = [];
    const attention: AttentionItem[] = [];
    const rings: ProgressRing[] = [];
    const childCards: ChildCard[] = [];
    const today = ctx.today;
    const me = ctx.me;

    // -- Today ---------------------------------------------------------------
    for (const h of habitsFor(state, me.id)) {
        if (isRestDay(h, today) || freezeOn(state, h.id, today)) continue;
        agenda.push(agendaHabit(h, ctx, isKept(state, h, today)));
    }
    for (const w of workoutsOn(state, today, me.role === "parent" ? undefined : me.id)) {
        agenda.push({
            id: `workout-${w.id}`,
            moduleId: "wellness",
            area: "live",
            title: w.title,
            meta: `Workout · ${w.durationMin} min${w.memberId ? "" : " · all of us"}`,
            memberId: w.memberId,
            at: null,
            done: isWorkoutDone(state, w.id),
            href: `${BASE}/workouts?workout=${w.id}`,
            sort: 1730,
        });
    }
    const dinner = dinnerOn(state, today);
    if (dinner?.title) {
        agenda.push({
            id: `dinner-${dinner.id}`,
            moduleId: "wellness",
            area: "live",
            title: `Dinner: ${dinner.title}`,
            meta: dinner.cookMemberId ? `${first(ctx.members, dinner.cookMemberId)} is cooking` : "Nobody's name on it yet",
            memberId: dinner.cookMemberId,
            at: `${today}T18:00:00`,
            done: false,
            href: `${BASE}/meals`,
            sort: 1800,
        });
    }

    // -- Needs attention -----------------------------------------------------
    if (ctx.role === "parent") {
        const plan = planForWeek(state, weekOf(today));
        const list = plan ? listForPlan(state, plan.id) : undefined;
        if (list) {
            const total = groceryTotal(state, list.id);
            const verdict = budgetVerdict(total, list.foodBudgetRemainingCents);
            if (verdict.over) {
                attention.push({
                    id: `grocery-over-${list.id}`,
                    moduleId: "wellness",
                    area: "live",
                    tone: "warn",
                    title: "The shopping list is over the food budget",
                    body: `The week prices up at ${(total / 100).toFixed(2)} against ${(list.foodBudgetRemainingCents / 100).toFixed(2)} left in the envelope. Swap two dinners and it fits.`,
                    href: `${BASE}/grocery`,
                    weight: 74,
                });
            }
        }
        for (const { note, appt } of upcomingAppointments(state, today, 7)) {
            attention.push({
                id: `appt-${appt.id}`,
                moduleId: "wellness",
                area: "live",
                tone: "info",
                title: `${first(ctx.members, note.memberId)}: ${appt.what}`,
                body: `${appt.who}${appt.place ? ` · ${appt.place}` : ""} — ${dayLabel(isoDate(appt.at))} ${dayNumber(isoDate(appt.at))}.`,
                href: `${BASE}/health?member=${note.memberId}`,
                weight: 58,
            });
        }
        for (const c of closableChallenges(state, today)) {
            const hit = standings(state, c).filter((s) => s.hit).length;
            attention.push({
                id: `challenge-${c.id}`,
                moduleId: "wellness",
                area: "live",
                tone: "celebrate",
                title: `"${c.name}" has finished`,
                body: hit ? `${hit} of you hit the target. Close it and the Sprouts land on the ledger.` : "Close it off and start the next one.",
                href: `${BASE}?challenge=${c.id}`,
                weight: 66,
            });
        }
        if (isoWeekday(today) === ctx.space.planningDay) {
            const nextWeek = weekOf(shiftDay(today, 1));
            const nextPlan = planForWeek(state, nextWeek);
            const filled = nextPlan ? planFilled(state, nextPlan.id).filled : 0;
            attention.push({
                id: "planning-meals",
                moduleId: "wellness",
                area: "live",
                tone: "info",
                title: "Sunday planning: meals and the shop",
                body: filled ? `${filled} of 21 meals are down for the week ahead. Finish it and build the list.` : "Nothing is down for the week ahead yet. Ten minutes now is five calm evenings.",
                href: `${BASE}/planning`,
                weight: 55,
            });
        }
        // A habit that is slipping is worth one calm line, not a red badge.
        for (const h of state.habits.filter((x) => x.active)) {
            const s = habitStats(state, h, today);
            if (s.weekExpected >= 5 && s.weekKept * 2 < s.weekExpected) {
                attention.push({
                    id: `habit-slipping-${h.id}`,
                    moduleId: "wellness",
                    area: "live",
                    tone: "info",
                    title: `${first(ctx.members, h.memberId)}'s "${h.name}" has slipped`,
                    body: `${s.weekKept} of ${s.weekExpected} this week. Worth asking why before it becomes a rule.`,
                    href: `${BASE}/habits?habit=${h.id}`,
                    weight: 34,
                });
            }
        }
    }

    // -- What we're building -------------------------------------------------
    const mine = weekScore(state, me.id, today);
    if (mine.expected > 0) {
        rings.push({
            id: "habits-week",
            moduleId: "wellness",
            area: "live",
            label: "Your habits this week",
            pct: mine.pct,
            sub: `${mine.kept} of ${mine.expected} days kept`,
            href: `${BASE}/habits`,
        });
    }
    if (ctx.role === "parent") {
        const fam = familyWeekScore(state, ctx.members.filter((m) => m.role !== "guest"), today);
        if (fam.expected > 0) {
            rings.push({
                id: "habits-family",
                moduleId: "wellness",
                area: "live",
                label: "The family's habits",
                pct: fam.pct,
                sub: `${fam.kept} of ${fam.expected} days kept this week`,
                href: `${BASE}/habits`,
            });
        }
    }
    for (const c of liveChallenges(state, today)) {
        rings.push({
            id: `challenge-${c.id}`,
            moduleId: "wellness",
            area: "live",
            label: c.name,
            pct: challengePct(state, c),
            sub: `${c.sprouts} Sprouts · ends ${dayNumber(c.end)}`,
            href: `${BASE}?challenge=${c.id}`,
        });
    }

    // -- The child's own cards ------------------------------------------------
    if (ctx.role === "child") {
        for (const h of habitsFor(state, me.id)) {
            const s = habitStats(state, h, today);
            const rest = s.todayState === "rest";
            childCards.push({
                id: `habit-${h.id}`,
                moduleId: "wellness",
                area: "live",
                title: h.name,
                body: rest ? "Resting today — that's allowed." : s.todayState === "kept" ? `Done! ${s.current} day${s.current === 1 ? "" : "s"} in a row.` : `Tap to tick it off · ${targetLabel(h)}`,
                emoji: habitEmoji(h),
                href: rest ? `${BASE}/habits?habit=${h.id}` : `${BASE}?tap=${h.id}`,
                pct: s.weekPct,
                done: s.todayState === "kept" || rest,
            });
        }
        for (const w of workoutsOn(state, today, me.id)) {
            childCards.push({
                id: `workout-${w.id}`,
                moduleId: "wellness",
                area: "live",
                title: w.title,
                body: isWorkoutDone(state, w.id) ? "You did it. Nice one." : `${w.durationMin} minutes — tap when you've done it.`,
                emoji: "💪",
                href: `${BASE}?tapWorkout=${w.id}`,
                done: isWorkoutDone(state, w.id),
            });
        }
    }

    return { agenda, attention, rings, childCards };
}

export function nudges(state: WellnessState, ctx: RepoContext): Nudge[] {
    if (!state.visible) return [];
    const out: Nudge[] = [];
    const today = ctx.today;
    const parents = ctx.members.filter((m) => m.role === "parent").map((m) => m.id);

    // AC 1 — one nudge per habit per day, only after the check-in time, and
    // never on a grace day or a day the family has spent its freeze on.
    for (const h of state.habits) {
        if (!h.active) continue;
        if (isRestDay(h, today) || freezeOn(state, h.id, today)) continue;
        if (isKept(state, h, today)) continue;
        out.push({
            key: `wellness-habit-missed-${h.id}-${h.memberId}-${today}`,
            moduleId: "wellness",
            kind: "wellness",
            title: `${h.name} isn't ticked off yet`,
            body: `${targetLabel(h)} — it was due by ${h.checkinTime}. One tap and the streak keeps going.`,
            href: `${BASE}/habits?habit=${h.id}`,
            memberIds: [h.memberId],
            notBefore: `${today}T${h.checkinTime || "20:00"}:00`,
        });
    }

    for (const c of state.challenges) {
        if (c.completedAt) continue;
        if (c.end === today) {
            out.push({
                key: `wellness-challenge-ends-${c.id}`,
                moduleId: "wellness",
                kind: "wellness",
                title: `Last day of "${c.name}"`,
                body: `${c.sprouts} Sprouts for everyone who reaches ${c.target} ${c.metric}.`,
                href: `${BASE}?challenge=${c.id}`,
                memberIds: c.memberIds.length ? c.memberIds : parents,
            });
        }
    }

    if (ctx.role === "parent") {
        for (const { note, appt } of upcomingAppointments(state, today, 2)) {
            out.push({
                key: `wellness-appt-${appt.id}`,
                moduleId: "wellness",
                kind: "wellness",
                title: `${appt.what} — ${dayLabel(isoDate(appt.at))}`,
                body: `${ctx.members.find((m) => m.id === note.memberId)?.name.split(" ")[0] ?? "Someone"} · ${appt.who}${appt.place ? ` · ${appt.place}` : ""}.`,
                href: `${BASE}/health?member=${note.memberId}`,
                memberIds: parents,
            });
        }
        const plan = planForWeek(state, weekOf(today));
        const list = plan ? listForPlan(state, plan.id) : undefined;
        if (list && budgetVerdict(groceryTotal(state, list.id), list.foodBudgetRemainingCents).over) {
            out.push({
                key: `wellness-grocery-over-${list.id}-${list.weekStart}`,
                moduleId: "wellness",
                kind: "wellness",
                title: "This week's shop is over the food budget",
                body: "Open the list and swap what you can before the delivery slot.",
                href: `${BASE}/grocery`,
                memberIds: parents,
            });
        }
    }

    return out;
}

/**
 * Grounding for the companion.
 *
 * The habit-coaching section is the ASKING MEMBER'S OWN logs and nothing else
 * (AC 8) — a parent's pack summarises the rest of the family as counts, never
 * as day-by-day records — and health notes appear only for a parent, because
 * `health` is one of the sensitivity classes the brief excludes from a child's
 * or a guest's pack.
 */
export function aiContext(state: WellnessState, ctx: RepoContext): string {
    if (!state.visible) return "";
    const today = ctx.today;
    const me = ctx.me;
    const parts: string[] = [];

    const mine = habitsFor(state, me.id).map((h) => {
        const s = habitStats(state, h, today);
        return `${h.name} (${targetLabel(h)}, by ${h.checkinTime}; streak ${s.current}, best ${s.best}, ${s.weekKept}/${s.weekExpected} this week${h.graceDays.length ? `, rests ${h.graceDays.map((d) => ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][d]).join("/")}` : ""}; today ${s.todayState})`;
    });
    if (mine.length) parts.push(`${me.name.split(" ")[0]}'s own habits — coach only from these: ${mine.join("; ")}.`);

    if (ctx.role === "parent") {
        const others = ctx.members
            .filter((m) => m.id !== me.id && m.role !== "guest")
            .map((m) => {
                const w = weekScore(state, m.id, today);
                return w.expected ? `${m.name.split(" ")[0]} ${w.kept}/${w.expected}` : "";
            })
            .filter(Boolean);
        if (others.length) parts.push(`Everyone else's habits this week, as counts only: ${others.join(", ")}.`);
    }

    const myPlans = state.plans.filter((p) => p.memberId === me.id || p.memberId === null);
    if (myPlans.length) {
        parts.push(
            `Training: ${myPlans
                .map((p) => {
                    const pr = planProgress(state, p, today);
                    return `${p.name} (week ${pr.week} of ${p.weeks}, ${pr.done}/${pr.total} sessions logged)`;
                })
                .join("; ")}.`,
        );
    }
    const next = upcomingWorkouts(state, today, 7, ctx.role === "parent" ? undefined : me.id).slice(0, 4);
    if (next.length) parts.push(`Next sessions: ${next.map((w) => `${w.title} ${dayLabel(w.date)} ${w.durationMin}min`).join("; ")}.`);

    const plan = planForWeek(state, weekOf(today));
    if (plan) {
        const dinners = weekDays(plan.weekStart)
            .map((d) => {
                const s = slotOn(state, plan.id, d, "dinner");
                return s?.title ? `${dayLabel(d)} ${s.title}` : "";
            })
            .filter(Boolean);
        if (dinners.length) parts.push(`Dinners this week: ${dinners.join("; ")}.`);
    }

    if (ctx.role === "parent" && plan) {
        const list = listForPlan(state, plan.id);
        if (list) {
            const total = groceryTotal(state, list.id);
            const v = budgetVerdict(total, list.foodBudgetRemainingCents);
            parts.push(`Shopping list: ${itemsForList(state, list.id).length} items, about ${(total / 100).toFixed(2)} ${ctx.space.currency}, against ${(list.foodBudgetRemainingCents / 100).toFixed(2)} left in the food envelope${v.over ? " — OVER by " + (v.diffCents / 100).toFixed(2) : ""}.`);
        }
        const health = state.healthNotes
            .map((h) => {
                const who = ctx.members.find((m) => m.id === h.memberId)?.name.split(" ")[0] ?? "Someone";
                const bits = [h.allergies && `allergies: ${h.allergies}`, h.medications && `meds: ${h.medications}`].filter(Boolean);
                return bits.length ? `${who} — ${bits.join(", ")}` : "";
            })
            .filter(Boolean);
        if (health.length) parts.push(`Health notes (parents only, never repeat to a child): ${health.join("; ")}.`);
    }

    for (const c of liveChallenges(state, today)) {
        parts.push(`Challenge "${c.name}": ${c.target} ${c.metric} each by ${c.end}, ${c.sprouts} Sprouts, ${standings(state, c).filter((s) => s.hit).length} already there.`);
    }
    for (const g of state.wellnessGoals) {
        parts.push(`Wellness goal: ${g.name} — ${g.current}/${g.target} ${g.unit}${g.dueDate ? ` by ${g.dueDate}` : ""}.`);
    }

    return parts.join(" ").slice(0, 1500);
}

export function search(state: WellnessState, q: string): Array<{ title: string; meta: string; href: string }> {
    if (!state.visible) return [];
    const needle = q.toLowerCase();
    const hits: Array<{ title: string; meta: string; href: string }> = [];
    for (const h of state.habits) {
        if (h.name.toLowerCase().includes(needle)) hits.push({ title: h.name, meta: `Habit · ${targetLabel(h)}`, href: `${BASE}/habits?habit=${h.id}` });
    }
    for (const r of state.recipes) {
        if (`${r.name} ${r.tags.join(" ")}`.toLowerCase().includes(needle)) hits.push({ title: r.name, meta: `Recipe · ${r.minutes} min · serves ${r.servings}`, href: `${BASE}/meals?recipe=${r.id}` });
    }
    for (const p of state.plans) {
        if (p.name.toLowerCase().includes(needle)) hits.push({ title: p.name, meta: `Workout plan · ${p.weeks} weeks`, href: `${BASE}/workouts?plan=${p.id}` });
    }
    for (const c of state.challenges) {
        if (c.name.toLowerCase().includes(needle)) hits.push({ title: c.name, meta: `Challenge · ${c.sprouts} Sprouts`, href: `${BASE}?challenge=${c.id}` });
    }
    for (const i of state.groceryItems) {
        if (i.item.toLowerCase().includes(needle)) hits.push({ title: i.item, meta: "On the shopping list", href: `${BASE}/grocery` });
    }
    return hits.slice(0, 8);
}
