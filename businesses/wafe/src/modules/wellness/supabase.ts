import type { RepoContext, Visibility } from "@/data/core";
import { supabase } from "@/lib/supabase";
import { bestStreakOf, canSeeHealth, isKept, isRestDay, scheduleOf, shiftDay, standings, streakOf, visibleTo, weekDays, weekOf } from "./derive";
import { WORKOUT_TEMPLATES, templateById } from "./templates";
import type {
    AiMealPlan,
    Appointment,
    Challenge,
    ChallengeCredit,
    ChallengeEntry,
    ChallengeMetric,
    Exercise,
    GroceryItem,
    GroceryList,
    Habit,
    HabitKind,
    HabitLog,
    HealthNote,
    Ingredient,
    LogResult,
    Measurement,
    MealPlan,
    MealSlot,
    MealSlotKind,
    NewHabit,
    NewRecipe,
    NewWorkoutLog,
    Recipe,
    StreakFreeze,
    Vaccination,
    Weekday,
    WellnessGoal,
    WellnessRepo,
    WellnessState,
    Workout,
    WorkoutFocus,
    WorkoutLog,
    WorkoutPlan,
} from "./types";

/**
 * Wellness, live, under row-level security.
 *
 * The privacy line is the database's: `wf_health_notes` is readable only by a
 * parent or by the member themselves when a parent has granted them
 * `wellness.manage` (AC 4), the shop and its prices are parent-only, and every
 * other table is "mine, or a parent's" — exactly what `visibleTo()` computes,
 * which runs again on the way out so the demo and the live app draw identical
 * screens from identical shapes.
 *
 * snake_case ↔ camelCase mapping lives in this file and nowhere else.
 */

type Row = Record<string, unknown>;

const s = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);
const num = (v: unknown, d = 0): number => (typeof v === "number" && Number.isFinite(v) ? v : v === null || v === undefined ? d : Number(v) || d);
const numOrNull = (v: unknown): number | null => (v === null || v === undefined || v === "" ? null : Number(v));
const bool = (v: unknown, d = false): boolean => (typeof v === "boolean" ? v : d);
const nul = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const iso = (v: unknown): string => (v ? new Date(v as string).toISOString() : new Date().toISOString());
const date = (v: unknown): string => s(v).slice(0, 10);
const json = <T>(v: unknown, d: T): T => (v === null || v === undefined ? d : (v as T));

function fail(where: string, error: { message: string } | null | undefined): void {
    if (error) throw new Error(`${where}: ${error.message}`);
}

const mapExercises = (v: unknown): Exercise[] =>
    (Array.isArray(v) ? v : []).map((raw) => {
        const r = (raw ?? {}) as Row;
        return { name: s(r.name), sets: numOrNull(r.sets), reps: s(r.reps), minutes: numOrNull(r.minutes), note: s(r.note) };
    });

const mapIngredients = (v: unknown): Ingredient[] =>
    (Array.isArray(v) ? v : []).map((raw) => {
        const r = (raw ?? {}) as Row;
        return { item: s(r.item), qty: s(r.qty), priceEstimateCents: num(r.priceEstimateCents ?? r.price_estimate_cents) };
    });

const mapHabit = (r: Row): Habit => ({
    id: s(r.id),
    memberId: s(r.member_id),
    name: s(r.name),
    kind: s(r.kind, "custom") as HabitKind,
    target: num(r.target, 1),
    unit: s(r.unit),
    checkinTime: s(r.checkin_time, "20:00").slice(0, 5),
    valueId: nul(r.value_id),
    graceDays: (Array.isArray(r.grace_days) ? r.grace_days : []).map((d) => Number(d) as Weekday).filter((d) => d >= 1 && d <= 7),
    sprouts: num(r.sprouts),
    note: s(r.note),
    active: bool(r.active, true),
    visibility: s(r.visibility, "family") as Visibility,
    createdAt: iso(r.created_at),
});

const mapLog = (r: Row): HabitLog => ({ id: s(r.id), habitId: s(r.habit_id), memberId: s(r.member_id), date: date(r.date), value: num(r.value), loggedAt: iso(r.logged_at) });

const mapFreeze = (r: Row): StreakFreeze => ({ id: s(r.id), habitId: s(r.habit_id), memberId: s(r.member_id), weekStart: date(r.week_start), usedOn: date(r.used_on), reason: s(r.reason), at: iso(r.at) });

const mapPlan = (r: Row): WorkoutPlan => ({
    id: s(r.id),
    memberId: nul(r.member_id),
    name: s(r.name),
    templateId: nul(r.template_id),
    focus: s(r.focus, "strength") as WorkoutFocus,
    goalId: nul(r.goal_id),
    goalLabel: s(r.goal_label),
    weeks: num(r.weeks, 4),
    startDate: date(r.start_date),
    note: s(r.note),
    active: bool(r.active, true),
    createdBy: s(r.created_by),
    createdAt: iso(r.created_at),
});

const mapWorkout = (r: Row): Workout => ({
    id: s(r.id),
    planId: nul(r.plan_id),
    memberId: nul(r.member_id),
    date: date(r.date),
    title: s(r.title),
    focus: s(r.focus, "strength") as WorkoutFocus,
    week: num(r.week, 1),
    durationMin: num(r.duration_min, 20),
    exercises: mapExercises(r.exercises),
    createdAt: iso(r.created_at),
});

const mapWorkoutLog = (r: Row): WorkoutLog => ({
    id: s(r.id),
    workoutId: nul(r.workout_id),
    planId: nul(r.plan_id),
    memberId: s(r.member_id),
    date: date(r.date),
    title: s(r.title),
    durationMin: num(r.duration_min),
    sets: strs(r.sets),
    feel: s(r.feel, "good") as WorkoutLog["feel"],
    notes: s(r.notes),
    loggedAt: iso(r.logged_at),
});

const mapHealth = (r: Row): HealthNote => ({
    id: s(r.id),
    memberId: s(r.member_id),
    allergies: s(r.allergies),
    medications: s(r.medications),
    conditions: s(r.conditions),
    gp: s(r.gp),
    dentist: s(r.dentist),
    nhsNumber: s(r.nhs_number),
    appointments: json<Appointment[]>(r.appointments, []),
    vaccinations: json<Vaccination[]>(r.vaccinations, []),
    measurements: json<Measurement[]>(r.measurements, []),
    notes: s(r.notes),
    sensitivity: "health",
    updatedBy: s(r.updated_by),
    updatedAt: iso(r.updated_at),
});

const mapRecipe = (r: Row): Recipe => ({
    id: s(r.id),
    name: s(r.name),
    blurb: s(r.blurb),
    imageUrl: nul(r.image_url),
    ingredients: mapIngredients(r.ingredients),
    steps: strs(r.steps),
    servings: num(r.servings, 4),
    minutes: num(r.minutes, 30),
    costEstimateCents: num(r.cost_estimate_cents),
    childSafe: bool(r.child_safe, true),
    tags: strs(r.tags),
    createdAt: iso(r.created_at),
});

const mapMealPlan = (r: Row): MealPlan => ({ id: s(r.id), weekStart: date(r.week_start), note: s(r.note), createdBy: s(r.created_by), createdAt: iso(r.created_at) });

const mapSlot = (r: Row): MealSlot => ({
    id: s(r.id),
    planId: s(r.plan_id),
    date: date(r.date),
    slot: s(r.slot, "dinner") as MealSlotKind,
    recipeId: nul(r.recipe_id),
    title: s(r.title),
    cookMemberId: nul(r.cook_member_id),
    note: s(r.note),
});

const mapList = (r: Row): GroceryList => ({
    id: s(r.id),
    planId: s(r.plan_id),
    weekStart: date(r.week_start),
    totalEstimateCents: num(r.total_estimate_cents),
    foodBudgetRemainingCents: num(r.food_budget_remaining_cents),
    budgetCheckedAt: iso(r.budget_checked_at),
    createdBy: s(r.created_by),
    createdAt: iso(r.created_at),
});

const mapItem = (r: Row): GroceryItem => ({
    id: s(r.id),
    listId: s(r.list_id),
    item: s(r.item),
    qty: s(r.qty),
    priceEstimateCents: num(r.price_estimate_cents),
    checked: bool(r.checked),
    recipeId: nul(r.recipe_id),
});

const mapChallenge = (r: Row): Challenge => ({
    id: s(r.id),
    name: s(r.name),
    blurb: s(r.blurb),
    metric: s(r.metric, "days") as ChallengeMetric,
    target: num(r.target, 1),
    start: date(r.start_date),
    end: date(r.end_date),
    sprouts: num(r.sprouts),
    memberIds: strs(r.member_ids),
    completedAt: r.completed_at ? iso(r.completed_at) : null,
    creditedMemberIds: strs(r.credited_member_ids),
    createdBy: s(r.created_by),
    createdAt: iso(r.created_at),
});

const mapEntry = (r: Row): ChallengeEntry => ({ id: s(r.id), challengeId: s(r.challenge_id), memberId: s(r.member_id), date: date(r.date), value: num(r.value), at: iso(r.at) });

const mapGoal = (r: Row): WellnessGoal => ({
    id: s(r.id),
    memberId: nul(r.member_id),
    name: s(r.name),
    goalId: nul(r.goal_id),
    goalLabel: s(r.goal_label),
    target: num(r.target, 1),
    current: num(r.current),
    unit: s(r.unit),
    dueDate: r.due_date ? date(r.due_date) : null,
    note: s(r.note),
    createdAt: iso(r.created_at),
});

export class SupabaseWellnessRepo implements WellnessRepo {
    constructor(private ctx: RepoContext) {}

    private get scope() {
        return { organization_id: this.ctx.orgId, space_id: this.ctx.space.id };
    }

    private get manages(): boolean {
        return this.ctx.role === "parent" || this.ctx.can("wellness.manage");
    }

    private assertManages(): void {
        if (!this.manages) throw new Error("Not allowed");
    }

    private assertMine(memberId: string | null): void {
        if (this.ctx.role === "guest") throw new Error("Not allowed");
        if (this.manages) return;
        if (memberId === null || memberId !== this.ctx.me.id) throw new Error("Not allowed");
    }

    private assertHealth(memberId: string): void {
        if (!canSeeHealth(this.ctx, memberId)) throw new Error("Not allowed");
    }

    // -----------------------------------------------------------------------
    // Read
    // -----------------------------------------------------------------------

    async load(): Promise<WellnessState> {
        const spaceId = this.ctx.space.id;
        if (this.ctx.role === "guest") return visibleTo({ ...emptyRaw(), visible: false }, this.ctx);
        const q = (table: string) => supabase.from(table).select("*").eq("space_id", spaceId);
        const [habits, logs, freezes, plans, workouts, workoutLogs, health, recipes, mealPlans, slots, lists, items, challenges, entries, goals] = await Promise.all([
            q("wf_habits").order("created_at", { ascending: true }),
            q("wf_habit_logs").gte("date", shiftDay(this.ctx.today, -200)),
            q("wf_streak_freezes"),
            q("wf_workout_plans").order("created_at", { ascending: false }),
            q("wf_workouts").order("date", { ascending: true }),
            q("wf_workout_logs").order("date", { ascending: false }),
            q("wf_health_notes"),
            q("wf_recipes").order("name", { ascending: true }),
            q("wf_meal_plans").order("week_start", { ascending: false }),
            q("wf_meal_slots"),
            q("wf_grocery_lists"),
            q("wf_grocery_items"),
            q("wf_challenges").order("start_date", { ascending: false }),
            q("wf_challenge_entries"),
            q("wf_wellness_goals").order("created_at", { ascending: false }),
        ]);
        fail("habits", habits.error);
        fail("habit logs", logs.error);
        fail("freezes", freezes.error);
        fail("workout plans", plans.error);
        fail("workouts", workouts.error);
        fail("workout logs", workoutLogs.error);
        fail("health notes", health.error);
        fail("recipes", recipes.error);
        fail("meal plans", mealPlans.error);
        fail("meals", slots.error);
        fail("shopping lists", lists.error);
        fail("shopping", items.error);
        fail("challenges", challenges.error);
        fail("challenge entries", entries.error);
        fail("wellness goals", goals.error);

        const state: WellnessState = {
            visible: true,
            habits: ((habits.data ?? []) as Row[]).map(mapHabit),
            logs: ((logs.data ?? []) as Row[]).map(mapLog),
            freezes: ((freezes.data ?? []) as Row[]).map(mapFreeze),
            plans: ((plans.data ?? []) as Row[]).map(mapPlan),
            workouts: ((workouts.data ?? []) as Row[]).map(mapWorkout),
            workoutLogs: ((workoutLogs.data ?? []) as Row[]).map(mapWorkoutLog),
            healthNotes: ((health.data ?? []) as Row[]).map(mapHealth),
            recipes: ((recipes.data ?? []) as Row[]).map(mapRecipe),
            mealPlans: ((mealPlans.data ?? []) as Row[]).map(mapMealPlan),
            slots: ((slots.data ?? []) as Row[]).map(mapSlot),
            groceryLists: ((lists.data ?? []) as Row[]).map(mapList),
            groceryItems: ((items.data ?? []) as Row[]).map(mapItem),
            challenges: ((challenges.data ?? []) as Row[]).map(mapChallenge),
            challengeEntries: ((entries.data ?? []) as Row[]).map(mapEntry),
            wellnessGoals: ((goals.data ?? []) as Row[]).map(mapGoal),
            schedule: [],
        };
        state.schedule = scheduleOf(state);
        return visibleTo(state, this.ctx);
    }

    subscribe(onChange: () => void): () => void {
        const filter = `space_id=eq.${this.ctx.space.id}`;
        const channel = supabase
            .channel(`wf-wellness-${this.ctx.space.id}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "wf_habit_logs", filter }, onChange)
            .on("postgres_changes", { event: "*", schema: "public", table: "wf_grocery_items", filter }, onChange)
            .on("postgres_changes", { event: "*", schema: "public", table: "wf_meal_slots", filter }, onChange)
            .subscribe();
        return () => {
            void supabase.removeChannel(channel);
        };
    }

    // -----------------------------------------------------------------------
    // Habits
    // -----------------------------------------------------------------------

    async addHabit(input: NewHabit): Promise<Habit> {
        this.assertMine(input.memberId);
        const { data, error } = await supabase
            .from("wf_habits")
            .insert({
                ...this.scope,
                member_id: input.memberId,
                owner_member_id: input.memberId,
                name: input.name.trim() || "A new habit",
                kind: input.kind,
                target: Math.max(1, Math.round(input.target || 1)),
                unit: input.unit ?? "",
                checkin_time: input.checkinTime || "20:00",
                value_id: input.valueId ?? null,
                grace_days: input.graceDays ?? [],
                sprouts: input.sprouts ?? 0,
                note: input.note ?? "",
                visibility: "family",
            })
            .select("*")
            .single();
        fail("add habit", error);
        return mapHabit((data ?? {}) as Row);
    }

    async updateHabit(id: string, patch: Partial<Omit<Habit, "id" | "memberId">>): Promise<void> {
        const row: Row = {};
        if (patch.name !== undefined) row.name = patch.name;
        if (patch.kind !== undefined) row.kind = patch.kind;
        if (patch.target !== undefined) row.target = patch.target;
        if (patch.unit !== undefined) row.unit = patch.unit;
        if (patch.checkinTime !== undefined) row.checkin_time = patch.checkinTime;
        if (patch.valueId !== undefined) row.value_id = patch.valueId;
        if (patch.graceDays !== undefined) row.grace_days = patch.graceDays;
        if (patch.sprouts !== undefined) row.sprouts = patch.sprouts;
        if (patch.note !== undefined) row.note = patch.note;
        if (patch.active !== undefined) row.active = patch.active;
        const { error } = await supabase.from("wf_habits").update(row).eq("id", id);
        fail("update habit", error);
    }

    async removeHabit(id: string): Promise<void> {
        const { error } = await supabase.from("wf_habits").delete().eq("id", id);
        fail("remove habit", error);
    }

    async logHabit(habitId: string, value?: number, date?: string): Promise<LogResult> {
        const before = await this.load();
        const habit = before.habits.find((h) => h.id === habitId);
        if (!habit) throw new Error("That habit is no longer here");
        this.assertMine(habit.memberId);
        const on = date ?? this.ctx.today;
        const wasKept = isKept(before, habit, on);
        const v = Math.max(0, Math.round(value ?? habit.target));

        const { error } = await supabase
            .from("wf_habit_logs")
            .upsert({ ...this.scope, habit_id: habitId, member_id: habit.memberId, owner_member_id: habit.memberId, date: on, value: v, logged_at: new Date().toISOString() }, { onConflict: "habit_id,date" });
        fail("log habit", error);

        const after = await this.load();
        const kept = isKept(after, habit, on);
        return {
            habitId,
            memberId: habit.memberId,
            date: on,
            kept,
            current: streakOf(after, habit, this.ctx.today),
            best: bestStreakOf(after, habit, this.ctx.today),
            sprouts: !wasKept && kept ? habit.sprouts : 0,
            habitName: habit.name,
        };
    }

    async unlogHabit(habitId: string, date: string): Promise<void> {
        const { error } = await supabase.from("wf_habit_logs").delete().eq("habit_id", habitId).eq("date", date);
        fail("undo", error);
    }

    async useFreeze(habitId: string, date: string, reason?: string): Promise<StreakFreeze> {
        const state = await this.load();
        const habit = state.habits.find((h) => h.id === habitId);
        if (!habit) throw new Error("That habit is no longer here");
        this.assertMine(habit.memberId);
        if (isRestDay(habit, date)) throw new Error("That day already rests — no freeze needed");
        const week = weekOf(date);
        if (state.freezes.some((f) => f.habitId === habitId && f.weekStart === week)) throw new Error("This week's freeze has already been used");
        const { data, error } = await supabase
            .from("wf_streak_freezes")
            .insert({ ...this.scope, habit_id: habitId, member_id: habit.memberId, owner_member_id: habit.memberId, week_start: week, used_on: date, reason: reason ?? "" })
            .select("*")
            .single();
        fail("freeze", error);
        return mapFreeze((data ?? {}) as Row);
    }

    async releaseFreeze(id: string): Promise<void> {
        const { error } = await supabase.from("wf_streak_freezes").delete().eq("id", id);
        fail("release freeze", error);
    }

    // -----------------------------------------------------------------------
    // Workouts
    // -----------------------------------------------------------------------

    async startPlan(templateId: string, input: { memberId: string | null; startDate?: string; weeks?: number; goalId?: string | null; goalLabel?: string }): Promise<WorkoutPlan> {
        this.assertMine(input.memberId);
        const tpl = templateById(templateId) ?? WORKOUT_TEMPLATES[0];
        const startDate = weekOf(input.startDate ?? this.ctx.today);
        const weeks = Math.max(1, Math.min(26, input.weeks ?? tpl.weeks));
        const { data, error } = await supabase
            .from("wf_workout_plans")
            .insert({
                ...this.scope,
                member_id: input.memberId,
                owner_member_id: input.memberId,
                name: tpl.name,
                template_id: tpl.id,
                focus: tpl.focus,
                goal_id: input.goalId ?? null,
                goal_label: input.goalLabel ?? "",
                weeks,
                start_date: startDate,
                created_by: this.ctx.me.id,
            })
            .select("*")
            .single();
        fail("start plan", error);
        const plan = mapPlan((data ?? {}) as Row);

        const sessions: Row[] = [];
        for (let w = 0; w < weeks; w++) {
            for (const session of tpl.sessions) {
                sessions.push({
                    ...this.scope,
                    plan_id: plan.id,
                    member_id: input.memberId,
                    owner_member_id: input.memberId,
                    date: shiftDay(startDate, w * 7 + (session.weekday - 1)),
                    title: session.title,
                    focus: tpl.focus,
                    week: w + 1,
                    duration_min: session.durationMin,
                    exercises: session.exercises,
                });
            }
        }
        const ins = await supabase.from("wf_workouts").insert(sessions);
        fail("schedule plan", ins.error);
        return plan;
    }

    async removePlan(id: string): Promise<void> {
        const { error } = await supabase.from("wf_workout_plans").delete().eq("id", id);
        fail("remove plan", error);
    }

    async addWorkout(input: { planId?: string | null; memberId: string | null; date: string; title: string; durationMin: number; focus?: WorkoutFocus; exercises?: Exercise[] }): Promise<Workout> {
        this.assertMine(input.memberId);
        const { data, error } = await supabase
            .from("wf_workouts")
            .insert({
                ...this.scope,
                plan_id: input.planId ?? null,
                member_id: input.memberId,
                owner_member_id: input.memberId,
                date: input.date,
                title: input.title.trim() || "A session",
                focus: input.focus ?? "strength",
                week: 1,
                duration_min: Math.max(1, Math.round(input.durationMin || 20)),
                exercises: input.exercises ?? [],
            })
            .select("*")
            .single();
        fail("add session", error);
        return mapWorkout((data ?? {}) as Row);
    }

    async removeWorkout(id: string): Promise<void> {
        const { error } = await supabase.from("wf_workouts").delete().eq("id", id);
        fail("remove session", error);
    }

    async logWorkout(workoutId: string | null, input: NewWorkoutLog & { title?: string; memberId?: string; planId?: string | null }): Promise<WorkoutLog> {
        const state = await this.load();
        const workout = workoutId ? state.workouts.find((w) => w.id === workoutId) : undefined;
        const memberId = input.memberId ?? workout?.memberId ?? this.ctx.me.id;
        this.assertMine(memberId);
        if (workoutId) {
            const del = await supabase.from("wf_workout_logs").delete().eq("workout_id", workoutId).eq("member_id", memberId);
            fail("log session", del.error);
        }
        const { data, error } = await supabase
            .from("wf_workout_logs")
            .insert({
                ...this.scope,
                workout_id: workoutId ?? null,
                plan_id: input.planId ?? workout?.planId ?? null,
                member_id: memberId,
                owner_member_id: memberId,
                date: input.date ?? workout?.date ?? this.ctx.today,
                title: input.title ?? workout?.title ?? "A session",
                duration_min: Math.max(1, Math.round(input.durationMin || workout?.durationMin || 20)),
                sets: input.sets ?? [],
                feel: input.feel ?? "good",
                notes: input.notes ?? "",
            })
            .select("*")
            .single();
        fail("log session", error);
        return mapWorkoutLog((data ?? {}) as Row);
    }

    async removeWorkoutLog(id: string): Promise<void> {
        const { error } = await supabase.from("wf_workout_logs").delete().eq("id", id);
        fail("remove record", error);
    }

    // -----------------------------------------------------------------------
    // Health (AC 4)
    // -----------------------------------------------------------------------

    private async note(memberId: string): Promise<HealthNote | null> {
        const { data, error } = await supabase.from("wf_health_notes").select("*").eq("space_id", this.ctx.space.id).eq("member_id", memberId).maybeSingle();
        fail("health note", error);
        return data ? mapHealth(data as Row) : null;
    }

    async saveHealthNote(memberId: string, patch: Partial<Omit<HealthNote, "id" | "memberId" | "sensitivity">>): Promise<HealthNote> {
        this.assertHealth(memberId);
        const row: Row = { ...this.scope, member_id: memberId, owner_member_id: memberId, updated_by: this.ctx.me.id, updated_at: new Date().toISOString() };
        if (patch.allergies !== undefined) row.allergies = patch.allergies;
        if (patch.medications !== undefined) row.medications = patch.medications;
        if (patch.conditions !== undefined) row.conditions = patch.conditions;
        if (patch.gp !== undefined) row.gp = patch.gp;
        if (patch.dentist !== undefined) row.dentist = patch.dentist;
        if (patch.nhsNumber !== undefined) row.nhs_number = patch.nhsNumber;
        if (patch.appointments !== undefined) row.appointments = patch.appointments;
        if (patch.vaccinations !== undefined) row.vaccinations = patch.vaccinations;
        if (patch.measurements !== undefined) row.measurements = patch.measurements;
        if (patch.notes !== undefined) row.notes = patch.notes;
        const { data, error } = await supabase.from("wf_health_notes").upsert(row, { onConflict: "space_id,member_id" }).select("*").single();
        fail("save health note", error);
        return mapHealth((data ?? {}) as Row);
    }

    async addAppointment(memberId: string, input: Omit<Appointment, "id">): Promise<void> {
        const note = await this.note(memberId);
        const list = [...(note?.appointments ?? []), { id: crypto.randomUUID(), ...input }].sort((a, b) => a.at.localeCompare(b.at));
        await this.saveHealthNote(memberId, { appointments: list });
    }

    async removeAppointment(memberId: string, appointmentId: string): Promise<void> {
        const note = await this.note(memberId);
        await this.saveHealthNote(memberId, { appointments: (note?.appointments ?? []).filter((a) => a.id !== appointmentId) });
    }

    async addMeasurement(memberId: string, input: Omit<Measurement, "id">): Promise<void> {
        const note = await this.note(memberId);
        const list = [...(note?.measurements ?? []), { id: crypto.randomUUID(), ...input }].sort((a, b) => a.date.localeCompare(b.date));
        await this.saveHealthNote(memberId, { measurements: list });
    }

    async addVaccination(memberId: string, input: Omit<Vaccination, "id">): Promise<void> {
        const note = await this.note(memberId);
        const list = [...(note?.vaccinations ?? []), { id: crypto.randomUUID(), ...input }].sort((a, b) => a.date.localeCompare(b.date));
        await this.saveHealthNote(memberId, { vaccinations: list });
    }

    // -----------------------------------------------------------------------
    // Food
    // -----------------------------------------------------------------------

    async addRecipe(input: NewRecipe): Promise<Recipe> {
        this.assertManages();
        const ingredients = input.ingredients.filter((i) => i.item.trim());
        const { data, error } = await supabase
            .from("wf_recipes")
            .insert({
                ...this.scope,
                name: input.name.trim() || "A new recipe",
                blurb: input.blurb ?? "",
                image_url: input.imageUrl ?? null,
                ingredients,
                steps: (input.steps ?? []).filter((x) => x.trim()),
                servings: Math.max(1, input.servings ?? 4),
                minutes: Math.max(1, input.minutes ?? 30),
                cost_estimate_cents: ingredients.reduce((n, i) => n + i.priceEstimateCents, 0),
                child_safe: input.childSafe ?? true,
                tags: input.tags ?? [],
                created_by: this.ctx.me.id,
            })
            .select("*")
            .single();
        fail("add recipe", error);
        return mapRecipe((data ?? {}) as Row);
    }

    async updateRecipe(id: string, patch: Partial<NewRecipe>): Promise<void> {
        this.assertManages();
        const row: Row = {};
        if (patch.name !== undefined) row.name = patch.name;
        if (patch.blurb !== undefined) row.blurb = patch.blurb;
        if (patch.imageUrl !== undefined) row.image_url = patch.imageUrl;
        if (patch.steps !== undefined) row.steps = patch.steps;
        if (patch.servings !== undefined) row.servings = patch.servings;
        if (patch.minutes !== undefined) row.minutes = patch.minutes;
        if (patch.childSafe !== undefined) row.child_safe = patch.childSafe;
        if (patch.tags !== undefined) row.tags = patch.tags;
        if (patch.ingredients !== undefined) {
            row.ingredients = patch.ingredients;
            row.cost_estimate_cents = patch.ingredients.reduce((n, i) => n + i.priceEstimateCents, 0);
        }
        const { error } = await supabase.from("wf_recipes").update(row).eq("id", id);
        fail("update recipe", error);
    }

    async removeRecipe(id: string): Promise<void> {
        this.assertManages();
        const { error } = await supabase.from("wf_recipes").delete().eq("id", id);
        fail("remove recipe", error);
    }

    async ensureMealPlan(weekStart: string): Promise<MealPlan> {
        this.assertManages();
        const week = weekOf(weekStart);
        const { data, error } = await supabase
            .from("wf_meal_plans")
            .upsert({ ...this.scope, week_start: week, created_by: this.ctx.me.id }, { onConflict: "space_id,week_start" })
            .select("*")
            .single();
        fail("meal plan", error);
        return mapMealPlan((data ?? {}) as Row);
    }

    async setMealSlot(planId: string, date: string, slot: MealSlotKind, input: { recipeId?: string | null; title?: string; cookMemberId?: string | null; note?: string }): Promise<MealSlot> {
        this.assertManages();
        let title = (input.title ?? "").trim();
        if (!title && input.recipeId) {
            const { data } = await supabase.from("wf_recipes").select("name").eq("id", input.recipeId).maybeSingle();
            title = s((data as Row | null)?.name);
        }
        const { data, error } = await supabase
            .from("wf_meal_slots")
            .upsert(
                {
                    ...this.scope,
                    plan_id: planId,
                    date,
                    slot,
                    recipe_id: input.recipeId ?? null,
                    title,
                    cook_member_id: input.cookMemberId ?? null,
                    note: input.note ?? "",
                },
                { onConflict: "plan_id,date,slot" },
            )
            .select("*")
            .single();
        fail("set meal", error);
        return mapSlot((data ?? {}) as Row);
    }

    async clearMealSlot(planId: string, date: string, slot: MealSlotKind): Promise<void> {
        this.assertManages();
        const { error } = await supabase.from("wf_meal_slots").delete().eq("plan_id", planId).eq("date", date).eq("slot", slot);
        fail("clear meal", error);
    }

    async copyWeek(fromWeekStart: string, toWeekStart: string): Promise<MealPlan> {
        this.assertManages();
        const from = weekOf(fromWeekStart);
        const to = weekOf(toWeekStart);
        const target = await this.ensureMealPlan(to);
        const state = await this.load();
        const source = state.mealPlans.find((p) => p.weekStart === from);
        if (!source) throw new Error("There is no plan for that week to copy");
        const fromDays = weekDays(from);
        const toDays = weekDays(to);
        const rows = state.slots
            .filter((x) => x.planId === source.id && fromDays.includes(x.date))
            .map((x) => ({ ...this.scope, plan_id: target.id, date: toDays[fromDays.indexOf(x.date)], slot: x.slot, recipe_id: x.recipeId, title: x.title, cook_member_id: x.cookMemberId, note: x.note }));
        const del = await supabase.from("wf_meal_slots").delete().eq("plan_id", target.id);
        fail("copy week", del.error);
        if (rows.length) {
            const ins = await supabase.from("wf_meal_slots").insert(rows);
            fail("copy week", ins.error);
        }
        return target;
    }

    async buildGroceryList(planId: string, foodBudgetRemainingCents?: number): Promise<GroceryList> {
        this.assertManages();
        const state = await this.load();
        const plan = state.mealPlans.find((p) => p.id === planId);
        if (!plan) throw new Error("That week has no plan yet");
        const existing = state.groceryLists.find((l) => l.planId === planId);
        const previous = existing ? state.groceryItems.filter((i) => i.listId === existing.id) : [];
        const ticked = new Set(previous.filter((i) => i.checked).map((i) => i.item.toLowerCase()));

        type Line = { item: string; qty: string; cents: number; recipeId: string; count: number };
        const lines = new Map<string, Line>();
        for (const slot of state.slots.filter((x) => x.planId === planId && x.recipeId)) {
            const recipe = state.recipes.find((r) => r.id === slot.recipeId);
            if (!recipe) continue;
            for (const ing of recipe.ingredients) {
                const key = ing.item.toLowerCase();
                const line = lines.get(key);
                if (line) {
                    line.cents += ing.priceEstimateCents;
                    line.count += 1;
                } else {
                    lines.set(key, { item: ing.item, qty: ing.qty, cents: ing.priceEstimateCents, recipeId: recipe.id, count: 1 });
                }
            }
        }
        const rebuilt = [...lines.values()].map((l) => ({
            item: l.item,
            qty: l.count > 1 ? `${l.qty} ×${l.count}` : l.qty,
            price_estimate_cents: l.cents,
            checked: ticked.has(l.item.toLowerCase()),
            recipe_id: l.recipeId,
        }));
        const total = rebuilt.reduce((n, i) => n + i.price_estimate_cents, 0) + previous.filter((i) => i.recipeId === null).reduce((n, i) => n + i.priceEstimateCents, 0);

        const { data, error } = await supabase
            .from("wf_grocery_lists")
            .upsert(
                {
                    ...this.scope,
                    plan_id: planId,
                    week_start: plan.weekStart,
                    total_estimate_cents: total,
                    food_budget_remaining_cents: foodBudgetRemainingCents ?? existing?.foodBudgetRemainingCents ?? 0,
                    budget_checked_at: new Date().toISOString(),
                    created_by: this.ctx.me.id,
                },
                { onConflict: "space_id,plan_id" },
            )
            .select("*")
            .single();
        fail("shopping list", error);
        const list = mapList((data ?? {}) as Row);

        // Recipe lines are rebuilt; anything added by hand keeps its place.
        const del = await supabase.from("wf_grocery_items").delete().eq("list_id", list.id).not("recipe_id", "is", null);
        fail("shopping list", del.error);
        if (rebuilt.length) {
            const ins = await supabase.from("wf_grocery_items").insert(rebuilt.map((r) => ({ ...this.scope, list_id: list.id, ...r })));
            fail("shopping list", ins.error);
        }
        return list;
    }

    private async reprice(listId: string): Promise<void> {
        const { data, error } = await supabase.from("wf_grocery_items").select("price_estimate_cents").eq("list_id", listId);
        fail("shopping list", error);
        const total = ((data ?? []) as Row[]).reduce((n, r) => n + num(r.price_estimate_cents), 0);
        const up = await supabase.from("wf_grocery_lists").update({ total_estimate_cents: total }).eq("id", listId);
        fail("shopping list", up.error);
    }

    async addGroceryItem(listId: string, input: { item: string; qty?: string; priceEstimateCents?: number }): Promise<GroceryItem> {
        this.assertManages();
        const { data, error } = await supabase
            .from("wf_grocery_items")
            .insert({ ...this.scope, list_id: listId, item: input.item.trim() || "Something", qty: input.qty ?? "", price_estimate_cents: Math.max(0, Math.round(input.priceEstimateCents ?? 0)), recipe_id: null })
            .select("*")
            .single();
        fail("add item", error);
        await this.reprice(listId);
        return mapItem((data ?? {}) as Row);
    }

    async updateGroceryItem(id: string, patch: Partial<Pick<GroceryItem, "item" | "qty" | "priceEstimateCents" | "checked">>): Promise<void> {
        this.assertManages();
        const row: Row = {};
        if (patch.item !== undefined) row.item = patch.item;
        if (patch.qty !== undefined) row.qty = patch.qty;
        if (patch.priceEstimateCents !== undefined) row.price_estimate_cents = patch.priceEstimateCents;
        if (patch.checked !== undefined) row.checked = patch.checked;
        const { data, error } = await supabase.from("wf_grocery_items").update(row).eq("id", id).select("list_id").single();
        fail("update item", error);
        await this.reprice(s((data as Row | null)?.list_id));
    }

    async removeGroceryItem(id: string): Promise<void> {
        this.assertManages();
        const { data, error } = await supabase.from("wf_grocery_items").delete().eq("id", id).select("list_id").single();
        fail("remove item", error);
        await this.reprice(s((data as Row | null)?.list_id));
    }

    async setFoodBudgetRemaining(listId: string, cents: number): Promise<void> {
        this.assertManages();
        const { error } = await supabase
            .from("wf_grocery_lists")
            .update({ food_budget_remaining_cents: Math.max(0, Math.round(cents)), budget_checked_at: new Date().toISOString() })
            .eq("id", listId);
        fail("food budget", error);
    }

    async applyAiMealPlan(planId: string, plan: AiMealPlan): Promise<void> {
        this.assertManages();
        const state = await this.load();
        const target = state.mealPlans.find((p) => p.id === planId);
        if (!target) throw new Error("That week has no plan yet");
        const days = weekDays(target.weekStart);
        const byName = new Map(state.recipes.map((r) => [r.name.toLowerCase(), r.id]));
        const rows: Row[] = [];
        (plan.days ?? []).slice(0, 7).forEach((d, i) => {
            const on = d.date && days.includes(d.date) ? d.date : days[i];
            if (!on) return;
            for (const kind of ["breakfast", "lunch", "dinner"] as MealSlotKind[]) {
                const title = (d[kind] ?? "").trim();
                if (!title) continue;
                rows.push({ ...this.scope, plan_id: planId, date: on, slot: kind, recipe_id: byName.get(title.toLowerCase()) ?? null, title, cook_member_id: null, note: "" });
            }
        });
        if (rows.length) {
            const ins = await supabase.from("wf_meal_slots").upsert(rows, { onConflict: "plan_id,date,slot" });
            fail("apply plan", ins.error);
        }
        if (plan.note?.trim()) {
            const up = await supabase.from("wf_meal_plans").update({ note: plan.note.trim() }).eq("id", planId);
            fail("apply plan", up.error);
        }
        const groceries = (plan.grocery ?? []).slice(0, 60);
        if (!groceries.length) return;
        const list = await this.buildGroceryList(planId);
        const ins = await supabase.from("wf_grocery_items").insert(
            groceries.map((g) => ({
                ...this.scope,
                list_id: list.id,
                item: (g.item ?? "").trim() || "Something",
                qty: g.qty ?? "",
                price_estimate_cents: Math.max(0, Math.round(g.estCents ?? 0)),
                recipe_id: null,
            })),
        );
        fail("apply plan", ins.error);
        await this.reprice(list.id);
    }

    // -----------------------------------------------------------------------
    // Challenges and wellness goals
    // -----------------------------------------------------------------------

    async createChallenge(input: { name: string; blurb?: string; metric: ChallengeMetric; target: number; start: string; end: string; sprouts: number; memberIds: string[] }): Promise<Challenge> {
        this.assertManages();
        const { data, error } = await supabase
            .from("wf_challenges")
            .insert({
                ...this.scope,
                name: input.name.trim() || "A family challenge",
                blurb: input.blurb ?? "",
                metric: input.metric,
                target: Math.max(1, Math.round(input.target)),
                start_date: input.start,
                end_date: input.end < input.start ? input.start : input.end,
                sprouts: Math.max(0, Math.round(input.sprouts)),
                member_ids: input.memberIds,
                created_by: this.ctx.me.id,
            })
            .select("*")
            .single();
        fail("create challenge", error);
        return mapChallenge((data ?? {}) as Row);
    }

    async logChallenge(challengeId: string, memberId: string, value: number, date?: string): Promise<void> {
        this.assertMine(memberId);
        const { error } = await supabase.from("wf_challenge_entries").upsert(
            { ...this.scope, challenge_id: challengeId, member_id: memberId, owner_member_id: memberId, date: date ?? this.ctx.today, value: Math.max(0, Math.round(value)), at: new Date().toISOString() },
            { onConflict: "challenge_id,member_id,date" },
        );
        fail("log challenge", error);
    }

    async completeChallenge(id: string): Promise<ChallengeCredit[]> {
        this.assertManages();
        const state = await this.load();
        const challenge = state.challenges.find((c) => c.id === id);
        if (!challenge) throw new Error("That challenge is gone");
        if (challenge.completedAt) return [];
        const kids = new Set(this.ctx.members.filter((m) => m.role === "child").map((m) => m.id));
        const credits: ChallengeCredit[] = standings(state, challenge)
            .filter((x) => x.hit && kids.has(x.memberId) && !challenge.creditedMemberIds.includes(x.memberId))
            .map((x) => ({ memberId: x.memberId, sprouts: challenge.sprouts }));
        const { error } = await supabase
            .from("wf_challenges")
            .update({ completed_at: new Date().toISOString(), credited_member_ids: [...challenge.creditedMemberIds, ...credits.map((c) => c.memberId)] })
            .eq("id", id);
        fail("close challenge", error);
        return credits;
    }

    async removeChallenge(id: string): Promise<void> {
        this.assertManages();
        const { error } = await supabase.from("wf_challenges").delete().eq("id", id);
        fail("remove challenge", error);
    }

    async addWellnessGoal(input: { memberId: string | null; name: string; target: number; unit: string; current?: number; dueDate?: string | null; goalId?: string | null; goalLabel?: string; note?: string }): Promise<WellnessGoal> {
        this.assertMine(input.memberId);
        const { data, error } = await supabase
            .from("wf_wellness_goals")
            .insert({
                ...this.scope,
                member_id: input.memberId,
                owner_member_id: input.memberId,
                name: input.name.trim() || "A wellness goal",
                goal_id: input.goalId ?? null,
                goal_label: input.goalLabel ?? "",
                target: Math.max(1, input.target),
                current: Math.max(0, input.current ?? 0),
                unit: input.unit,
                due_date: input.dueDate ?? null,
                note: input.note ?? "",
            })
            .select("*")
            .single();
        fail("add goal", error);
        return mapGoal((data ?? {}) as Row);
    }

    async updateWellnessGoal(id: string, patch: Partial<Pick<WellnessGoal, "name" | "target" | "current" | "unit" | "dueDate" | "note" | "goalId" | "goalLabel">>): Promise<void> {
        const row: Row = {};
        if (patch.name !== undefined) row.name = patch.name;
        if (patch.target !== undefined) row.target = patch.target;
        if (patch.current !== undefined) row.current = patch.current;
        if (patch.unit !== undefined) row.unit = patch.unit;
        if (patch.dueDate !== undefined) row.due_date = patch.dueDate;
        if (patch.note !== undefined) row.note = patch.note;
        if (patch.goalId !== undefined) row.goal_id = patch.goalId;
        if (patch.goalLabel !== undefined) row.goal_label = patch.goalLabel;
        const { error } = await supabase.from("wf_wellness_goals").update(row).eq("id", id);
        fail("update goal", error);
    }

    async removeWellnessGoal(id: string): Promise<void> {
        const { error } = await supabase.from("wf_wellness_goals").delete().eq("id", id);
        fail("remove goal", error);
    }
}

/** The shape a guest's load() short-circuits to — nothing, and no round trip. */
function emptyRaw(): WellnessState {
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
