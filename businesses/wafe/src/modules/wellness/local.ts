import type { RepoContext, SeedContext } from "@/data/core";
import { uid } from "@/lib/format";
import { bestStreakOf, canSeeHealth, isKept, isRestDay, planForWeek, scheduleOf, shiftDay, standings, streakOf, visibleTo, weekDays, weekOf } from "./derive";
import { seed } from "./seed";
import type {
    AiMealPlan,
    Appointment,
    Challenge,
    ChallengeCredit,
    ChallengeMetric,
    Exercise,
    GroceryItem,
    GroceryList,
    Habit,
    HealthNote,
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
    WellnessGoal,
    WellnessRepo,
    WellnessState,
    WorkoutFocus,
    Workout,
    WorkoutLog,
    WorkoutPlan,
} from "./types";
import { WORKOUT_TEMPLATES, templateById } from "./templates";

/**
 * Wellness in the browser.
 *
 * The blob holds the WHOLE household — every habit, every health note, the
 * shop and its prices — and `load()` runs the same `visibleTo()` the live repo
 * runs, so switching "view as" to Tobi genuinely removes his sister's sleep
 * record and both parents' health notes from the data the screens receive
 * (AC 4). Every write is real, persisted, and checks the rule its RLS policy
 * checks: a child logs their own habits and workouts and nothing else; health
 * notes, recipes, the plan and the shop are a parent's.
 *
 * Sprouts are NOT written here. `logHabit` and `completeChallenge` hand back
 * what was earned and the page credits `core.addPoints` once the write has
 * landed — a repo never reaches into another table family (AC 7).
 */

const KEY = "wafe:demo:wellness:v2";
const now = (): string => new Date().toISOString();

function isState(v: unknown): v is WellnessState {
    if (!v || typeof v !== "object") return false;
    const s = v as Partial<WellnessState>;
    return Array.isArray(s.habits) && Array.isArray(s.logs) && Array.isArray(s.recipes) && Array.isArray(s.mealPlans);
}

export class LocalWellnessRepo implements WellnessRepo {
    private cache: WellnessState | null = null;

    constructor(private ctx: RepoContext) {}

    // -----------------------------------------------------------------------
    // Storage
    // -----------------------------------------------------------------------

    private seedCtx(): SeedContext {
        const { space, members, today } = this.ctx;
        const counters: Record<string, number> = {};
        const base = new Date(`${today}T00:00:00`);
        const at = (days: number, hhmm = "09:00"): string => {
            const d = new Date(base);
            d.setDate(d.getDate() + days);
            const [h, mi] = hhmm.split(":").map(Number);
            d.setHours(h, mi, 0, 0);
            return d.toISOString();
        };
        return {
            space,
            members,
            parents: members.filter((m) => m.role === "parent"),
            kids: members.filter((m) => m.role === "child"),
            guests: members.filter((m) => m.role === "guest"),
            today,
            at,
            day: (days: number) => at(days, "00:00").slice(0, 10),
            uid: (prefix: string) => `${prefix}-${(counters[prefix] = (counters[prefix] ?? 0) + 1)}`,
            img: (name: string) => `/images/${name}.jpg`,
        };
    }

    private get(): WellnessState {
        if (this.cache) return this.cache;
        try {
            const raw = localStorage.getItem(KEY);
            const parsed: unknown = raw ? JSON.parse(raw) : null;
            this.cache = isState(parsed) ? parsed : seed(this.seedCtx());
        } catch {
            this.cache = seed(this.seedCtx());
        }
        return this.cache;
    }

    private set(next: WellnessState): void {
        next.schedule = scheduleOf(next);
        this.cache = next;
        try {
            localStorage.setItem(KEY, JSON.stringify(next));
        } catch {
            /* private mode: it still works, it just won't persist */
        }
    }

    private write(mutate: (s: WellnessState) => void): void {
        const next = structuredClone(this.get());
        mutate(next);
        this.set(next);
    }

    // -----------------------------------------------------------------------
    // The rules, in one place — the same lines sql/wellness.sql draws
    // -----------------------------------------------------------------------

    /** Parents, and anyone a parent has widened with `wellness.manage`. */
    private get manages(): boolean {
        return this.ctx.role === "parent" || this.ctx.can("wellness.manage");
    }

    private assertManages(): void {
        if (!this.manages) throw new Error("Not allowed");
    }

    /** Their own body, or a parent's reach over the household. */
    private assertMine(memberId: string | null): void {
        if (this.ctx.role === "guest") throw new Error("Not allowed");
        if (this.manages) return;
        if (memberId === null || memberId !== this.ctx.me.id) throw new Error("Not allowed");
    }

    private assertHealth(memberId: string): void {
        if (!canSeeHealth(this.ctx, memberId)) throw new Error("Not allowed");
    }

    private habit(s: WellnessState, id: string): Habit {
        const h = s.habits.find((x) => x.id === id);
        if (!h) throw new Error("That habit is no longer here");
        return h;
    }

    private list(s: WellnessState, id: string): GroceryList {
        const l = s.groceryLists.find((x) => x.id === id);
        if (!l) throw new Error("That shopping list is gone");
        return l;
    }

    // -----------------------------------------------------------------------
    // Read
    // -----------------------------------------------------------------------

    async load(): Promise<WellnessState> {
        return visibleTo(structuredClone(this.get()), this.ctx);
    }

    // -----------------------------------------------------------------------
    // Habits
    // -----------------------------------------------------------------------

    async addHabit(input: NewHabit): Promise<Habit> {
        this.assertMine(input.memberId);
        const row: Habit = {
            id: uid("habit"),
            memberId: input.memberId,
            name: input.name.trim() || "A new habit",
            kind: input.kind,
            target: Math.max(1, Math.round(input.target || 1)),
            unit: input.unit ?? "",
            checkinTime: input.checkinTime || "20:00",
            valueId: input.valueId ?? null,
            graceDays: input.graceDays ?? [],
            sprouts: input.sprouts ?? 0,
            note: input.note ?? "",
            active: true,
            visibility: "family",
            createdAt: now(),
        };
        this.write((s) => {
            s.habits.push(row);
        });
        return row;
    }

    async updateHabit(id: string, patch: Partial<Omit<Habit, "id" | "memberId">>): Promise<void> {
        this.assertMine(this.habit(this.get(), id).memberId);
        this.write((s) => {
            Object.assign(this.habit(s, id), patch);
        });
    }

    async removeHabit(id: string): Promise<void> {
        this.assertMine(this.habit(this.get(), id).memberId);
        this.write((s) => {
            s.habits = s.habits.filter((h) => h.id !== id);
            s.logs = s.logs.filter((l) => l.habitId !== id);
            s.freezes = s.freezes.filter((f) => f.habitId !== id);
        });
    }

    /**
     * One tap. The value defaults to the target, because "did you?" is the
     * question ninety per cent of habits ask; a habit with a number (glasses,
     * minutes) passes one in. Sprouts are earned the first time a day tips
     * from open to kept, never twice for the same day.
     */
    async logHabit(habitId: string, value?: number, date?: string): Promise<LogResult> {
        const before = this.get();
        const habit = this.habit(before, habitId);
        this.assertMine(habit.memberId);
        const on = date ?? this.ctx.today;
        const wasKept = isKept(before, habit, on);
        const v = Math.max(0, Math.round(value ?? habit.target));

        this.write((s) => {
            const existing = s.logs.find((l) => l.habitId === habitId && l.date === on);
            if (existing) {
                existing.value = v;
                existing.loggedAt = now();
            } else {
                s.logs.push({ id: uid("hlog"), habitId, memberId: habit.memberId, date: on, value: v, loggedAt: now() });
            }
        });

        const after = this.get();
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
        this.assertMine(this.habit(this.get(), habitId).memberId);
        this.write((s) => {
            s.logs = s.logs.filter((l) => !(l.habitId === habitId && l.date === date));
        });
    }

    /** One per habit per week, and never on a day the habit already rests. */
    async useFreeze(habitId: string, date: string, reason?: string): Promise<StreakFreeze> {
        const state = this.get();
        const habit = this.habit(state, habitId);
        this.assertMine(habit.memberId);
        if (isRestDay(habit, date)) throw new Error("That day already rests — no freeze needed");
        const week = weekOf(date);
        if (state.freezes.some((f) => f.habitId === habitId && f.weekStart === week)) throw new Error("This week's freeze has already been used");
        const row: StreakFreeze = { id: uid("freeze"), habitId, memberId: habit.memberId, weekStart: week, usedOn: date, reason: reason ?? "", at: now() };
        this.write((s) => {
            s.freezes.push(row);
        });
        return row;
    }

    async releaseFreeze(id: string): Promise<void> {
        const f = this.get().freezes.find((x) => x.id === id);
        if (!f) throw new Error("That freeze is already gone");
        this.assertMine(f.memberId);
        this.write((s) => {
            s.freezes = s.freezes.filter((x) => x.id !== id);
        });
    }

    // -----------------------------------------------------------------------
    // Workouts
    // -----------------------------------------------------------------------

    /** Starting a routine COPIES it: the catalogue never changes underneath. */
    async startPlan(templateId: string, input: { memberId: string | null; startDate?: string; weeks?: number; goalId?: string | null; goalLabel?: string }): Promise<WorkoutPlan> {
        this.assertMine(input.memberId);
        const tpl = templateById(templateId) ?? WORKOUT_TEMPLATES[0];
        const startDate = weekOf(input.startDate ?? this.ctx.today);
        const weeks = Math.max(1, Math.min(26, input.weeks ?? tpl.weeks));
        const plan: WorkoutPlan = {
            id: uid("plan"),
            memberId: input.memberId,
            name: tpl.name,
            templateId: tpl.id,
            focus: tpl.focus,
            goalId: input.goalId ?? null,
            goalLabel: input.goalLabel ?? "",
            weeks,
            startDate,
            note: "",
            active: true,
            createdBy: this.ctx.me.id,
            createdAt: now(),
        };
        const sessions: Workout[] = [];
        for (let w = 0; w < weeks; w++) {
            for (const s of tpl.sessions) {
                sessions.push({
                    id: uid("workout"),
                    planId: plan.id,
                    memberId: input.memberId,
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
        this.write((s) => {
            s.plans.push(plan);
            s.workouts.push(...sessions);
        });
        return plan;
    }

    async removePlan(id: string): Promise<void> {
        const plan = this.get().plans.find((p) => p.id === id);
        if (!plan) throw new Error("That plan is already gone");
        this.assertMine(plan.memberId);
        this.write((s) => {
            const ids = new Set(s.workouts.filter((w) => w.planId === id).map((w) => w.id));
            s.plans = s.plans.filter((p) => p.id !== id);
            s.workouts = s.workouts.filter((w) => w.planId !== id);
            s.workoutLogs = s.workoutLogs.filter((l) => !(l.workoutId && ids.has(l.workoutId)));
        });
    }

    async addWorkout(input: { planId?: string | null; memberId: string | null; date: string; title: string; durationMin: number; focus?: WorkoutFocus; exercises?: Exercise[] }): Promise<Workout> {
        this.assertMine(input.memberId);
        const plan = input.planId ? this.get().plans.find((p) => p.id === input.planId) : undefined;
        const row: Workout = {
            id: uid("workout"),
            planId: input.planId ?? null,
            memberId: input.memberId,
            date: input.date,
            title: input.title.trim() || "A session",
            focus: input.focus ?? plan?.focus ?? "strength",
            week: plan ? Math.max(1, Math.floor((new Date(`${input.date}T12:00:00`).getTime() - new Date(`${plan.startDate}T12:00:00`).getTime()) / (7 * 86400000)) + 1) : 1,
            durationMin: Math.max(1, Math.round(input.durationMin || 20)),
            exercises: input.exercises ?? [],
            createdAt: now(),
        };
        this.write((s) => {
            s.workouts.push(row);
        });
        return row;
    }

    async removeWorkout(id: string): Promise<void> {
        const w = this.get().workouts.find((x) => x.id === id);
        if (!w) throw new Error("That session is already gone");
        this.assertMine(w.memberId);
        this.write((s) => {
            s.workouts = s.workouts.filter((x) => x.id !== id);
            s.workoutLogs = s.workoutLogs.filter((l) => l.workoutId !== id);
        });
    }

    /** One tap from a dashboard card, or a full record from the workouts screen. */
    async logWorkout(workoutId: string | null, input: NewWorkoutLog & { title?: string; memberId?: string; planId?: string | null }): Promise<WorkoutLog> {
        const state = this.get();
        const workout = workoutId ? state.workouts.find((w) => w.id === workoutId) : undefined;
        const memberId = input.memberId ?? workout?.memberId ?? this.ctx.me.id;
        this.assertMine(memberId);
        const row: WorkoutLog = {
            id: uid("wlog"),
            workoutId: workoutId ?? null,
            planId: input.planId ?? workout?.planId ?? null,
            memberId,
            date: input.date ?? workout?.date ?? this.ctx.today,
            title: input.title ?? workout?.title ?? "A session",
            durationMin: Math.max(1, Math.round(input.durationMin || workout?.durationMin || 20)),
            sets: input.sets ?? [],
            feel: input.feel ?? "good",
            notes: input.notes ?? "",
            loggedAt: now(),
        };
        this.write((s) => {
            if (workoutId) s.workoutLogs = s.workoutLogs.filter((l) => !(l.workoutId === workoutId && l.memberId === memberId));
            s.workoutLogs.push(row);
        });
        return row;
    }

    async removeWorkoutLog(id: string): Promise<void> {
        const l = this.get().workoutLogs.find((x) => x.id === id);
        if (!l) throw new Error("That record is already gone");
        this.assertMine(l.memberId);
        this.write((s) => {
            s.workoutLogs = s.workoutLogs.filter((x) => x.id !== id);
        });
    }

    // -----------------------------------------------------------------------
    // Health — the parents-only rows (AC 4)
    // -----------------------------------------------------------------------

    private blankNote(memberId: string): HealthNote {
        return {
            id: uid("health"),
            memberId,
            allergies: "",
            medications: "",
            conditions: "",
            gp: "",
            dentist: "",
            nhsNumber: "",
            appointments: [],
            vaccinations: [],
            measurements: [],
            notes: "",
            sensitivity: "health",
            updatedBy: this.ctx.me.id,
            updatedAt: now(),
        };
    }

    private upsertNote(memberId: string, mutate: (n: HealthNote) => void): HealthNote {
        this.assertHealth(memberId);
        let out: HealthNote = this.blankNote(memberId);
        this.write((s) => {
            let note = s.healthNotes.find((h) => h.memberId === memberId);
            if (!note) {
                note = this.blankNote(memberId);
                s.healthNotes.push(note);
            }
            mutate(note);
            note.updatedBy = this.ctx.me.id;
            note.updatedAt = now();
            out = note;
        });
        return out;
    }

    async saveHealthNote(memberId: string, patch: Partial<Omit<HealthNote, "id" | "memberId" | "sensitivity">>): Promise<HealthNote> {
        return this.upsertNote(memberId, (n) => {
            Object.assign(n, patch);
        });
    }

    async addAppointment(memberId: string, input: Omit<Appointment, "id">): Promise<void> {
        this.upsertNote(memberId, (n) => {
            n.appointments = [...n.appointments, { id: uid("appt"), ...input }].sort((a, b) => a.at.localeCompare(b.at));
        });
    }

    async removeAppointment(memberId: string, appointmentId: string): Promise<void> {
        this.upsertNote(memberId, (n) => {
            n.appointments = n.appointments.filter((a) => a.id !== appointmentId);
        });
    }

    async addMeasurement(memberId: string, input: Omit<Measurement, "id">): Promise<void> {
        this.upsertNote(memberId, (n) => {
            n.measurements = [...n.measurements, { id: uid("meas"), ...input }].sort((a, b) => a.date.localeCompare(b.date));
        });
    }

    async addVaccination(memberId: string, input: Omit<Vaccination, "id">): Promise<void> {
        this.upsertNote(memberId, (n) => {
            n.vaccinations = [...n.vaccinations, { id: uid("vacc"), ...input }].sort((a, b) => a.date.localeCompare(b.date));
        });
    }

    // -----------------------------------------------------------------------
    // Food
    // -----------------------------------------------------------------------

    async addRecipe(input: NewRecipe): Promise<Recipe> {
        this.assertManages();
        const ingredients = input.ingredients.filter((i) => i.item.trim());
        const row: Recipe = {
            id: uid("recipe"),
            name: input.name.trim() || "A new recipe",
            blurb: input.blurb ?? "",
            imageUrl: input.imageUrl ?? null,
            ingredients,
            steps: (input.steps ?? []).filter((s) => s.trim()),
            servings: Math.max(1, input.servings ?? 4),
            minutes: Math.max(1, input.minutes ?? 30),
            costEstimateCents: ingredients.reduce((n, i) => n + i.priceEstimateCents, 0),
            childSafe: input.childSafe ?? true,
            tags: input.tags ?? [],
            createdAt: now(),
        };
        this.write((s) => {
            s.recipes.push(row);
        });
        return row;
    }

    async updateRecipe(id: string, patch: Partial<NewRecipe>): Promise<void> {
        this.assertManages();
        this.write((s) => {
            const r = s.recipes.find((x) => x.id === id);
            if (!r) return;
            Object.assign(r, patch);
            if (patch.ingredients) r.costEstimateCents = patch.ingredients.reduce((n, i) => n + i.priceEstimateCents, 0);
        });
    }

    async removeRecipe(id: string): Promise<void> {
        this.assertManages();
        this.write((s) => {
            s.recipes = s.recipes.filter((r) => r.id !== id);
            for (const slot of s.slots) if (slot.recipeId === id) slot.recipeId = null;
        });
    }

    async ensureMealPlan(weekStart: string): Promise<MealPlan> {
        this.assertManages();
        const week = weekOf(weekStart);
        const existing = this.get().mealPlans.find((p) => p.weekStart === week);
        if (existing) return existing;
        const row: MealPlan = { id: uid("mealplan"), weekStart: week, note: "", createdBy: this.ctx.me.id, createdAt: now() };
        this.write((s) => {
            s.mealPlans.push(row);
        });
        return row;
    }

    async setMealSlot(planId: string, date: string, slot: MealSlotKind, input: { recipeId?: string | null; title?: string; cookMemberId?: string | null; note?: string }): Promise<MealSlot> {
        this.assertManages();
        const recipe = input.recipeId ? this.get().recipes.find((r) => r.id === input.recipeId) : undefined;
        const row: MealSlot = {
            id: uid("slot"),
            planId,
            date,
            slot,
            recipeId: input.recipeId ?? null,
            title: (input.title ?? recipe?.name ?? "").trim(),
            cookMemberId: input.cookMemberId ?? null,
            note: input.note ?? "",
        };
        this.write((s) => {
            const existing = s.slots.find((x) => x.planId === planId && x.date === date && x.slot === slot);
            if (existing) {
                row.id = existing.id;
                existing.recipeId = row.recipeId;
                existing.title = row.title || existing.title;
                if (input.cookMemberId !== undefined) existing.cookMemberId = row.cookMemberId;
                if (input.note !== undefined) existing.note = row.note;
            } else {
                s.slots.push(row);
            }
        });
        return row;
    }

    async clearMealSlot(planId: string, date: string, slot: MealSlotKind): Promise<void> {
        this.assertManages();
        this.write((s) => {
            s.slots = s.slots.filter((x) => !(x.planId === planId && x.date === date && x.slot === slot));
        });
    }

    /** "Same as last week" is the most-used button on a planning screen. */
    async copyWeek(fromWeekStart: string, toWeekStart: string): Promise<MealPlan> {
        this.assertManages();
        const from = weekOf(fromWeekStart);
        const to = weekOf(toWeekStart);
        const target = await this.ensureMealPlan(to);
        const state = this.get();
        const source = planForWeek(state, from);
        if (!source) throw new Error("There is no plan for that week to copy");
        const fromDays = weekDays(from);
        const toDays = weekDays(to);
        const copies: MealSlot[] = [];
        for (const slot of state.slots.filter((x) => x.planId === source.id)) {
            const i = fromDays.indexOf(slot.date);
            if (i < 0) continue;
            copies.push({ ...slot, id: uid("slot"), planId: target.id, date: toDays[i] });
        }
        this.write((s) => {
            s.slots = s.slots.filter((x) => x.planId !== target.id);
            s.slots.push(...copies);
        });
        return target;
    }

    /**
     * Price the week from the recipes on it. Anything added by hand keeps its
     * place and its tick; anything that came from a recipe is rebuilt, because
     * the recipes are what changed.
     */
    async buildGroceryList(planId: string, foodBudgetRemainingCents?: number): Promise<GroceryList> {
        this.assertManages();
        const state = this.get();
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

        const listId = existing?.id ?? uid("grocery");
        const rebuilt: GroceryItem[] = [...lines.values()].map((l) => ({
            id: uid("gitem"),
            listId,
            item: l.item,
            qty: l.count > 1 ? `${l.qty} ×${l.count}` : l.qty,
            priceEstimateCents: l.cents,
            checked: ticked.has(l.item.toLowerCase()),
            recipeId: l.recipeId,
        }));
        const byHand = previous.filter((i) => i.recipeId === null);
        const items = [...rebuilt, ...byHand];
        const total = items.reduce((n, i) => n + i.priceEstimateCents, 0);

        const row: GroceryList = {
            id: listId,
            planId,
            weekStart: plan.weekStart,
            totalEstimateCents: total,
            foodBudgetRemainingCents: foodBudgetRemainingCents ?? existing?.foodBudgetRemainingCents ?? 0,
            budgetCheckedAt: foodBudgetRemainingCents === undefined ? (existing?.budgetCheckedAt ?? now()) : now(),
            createdBy: existing?.createdBy ?? this.ctx.me.id,
            createdAt: existing?.createdAt ?? now(),
        };
        this.write((s) => {
            s.groceryLists = [...s.groceryLists.filter((l) => l.id !== listId), row];
            s.groceryItems = [...s.groceryItems.filter((i) => i.listId !== listId), ...items];
        });
        return row;
    }

    private reprice(s: WellnessState, listId: string): void {
        const list = s.groceryLists.find((l) => l.id === listId);
        if (list) list.totalEstimateCents = s.groceryItems.filter((i) => i.listId === listId).reduce((n, i) => n + i.priceEstimateCents, 0);
    }

    async addGroceryItem(listId: string, input: { item: string; qty?: string; priceEstimateCents?: number }): Promise<GroceryItem> {
        this.assertManages();
        this.list(this.get(), listId);
        const row: GroceryItem = {
            id: uid("gitem"),
            listId,
            item: input.item.trim() || "Something",
            qty: input.qty ?? "",
            priceEstimateCents: Math.max(0, Math.round(input.priceEstimateCents ?? 0)),
            checked: false,
            recipeId: null,
        };
        this.write((s) => {
            s.groceryItems.push(row);
            this.reprice(s, listId);
        });
        return row;
    }

    async updateGroceryItem(id: string, patch: Partial<Pick<GroceryItem, "item" | "qty" | "priceEstimateCents" | "checked">>): Promise<void> {
        this.assertManages();
        this.write((s) => {
            const item = s.groceryItems.find((i) => i.id === id);
            if (!item) return;
            Object.assign(item, patch);
            this.reprice(s, item.listId);
        });
    }

    async removeGroceryItem(id: string): Promise<void> {
        this.assertManages();
        this.write((s) => {
            const item = s.groceryItems.find((i) => i.id === id);
            if (!item) return;
            s.groceryItems = s.groceryItems.filter((i) => i.id !== id);
            this.reprice(s, item.listId);
        });
    }

    /** AC 3 — the list keeps Finance's number so the warning is always true. */
    async setFoodBudgetRemaining(listId: string, cents: number): Promise<void> {
        this.assertManages();
        this.write((s) => {
            const list = s.groceryLists.find((l) => l.id === listId);
            if (!list) return;
            list.foodBudgetRemainingCents = Math.max(0, Math.round(cents));
            list.budgetCheckedAt = now();
        });
    }

    /**
     * The companion proposes; this is the confirmation. Days that name a meal
     * we already have a recipe for link to it; the rest are written as titles,
     * because a plan with a name on every pan beats a plan that waited for a
     * recipe to be typed up.
     */
    async applyAiMealPlan(planId: string, plan: AiMealPlan): Promise<void> {
        this.assertManages();
        const state = this.get();
        const target = state.mealPlans.find((p) => p.id === planId);
        if (!target) throw new Error("That week has no plan yet");
        const days = weekDays(target.weekStart);
        const byName = new Map(state.recipes.map((r) => [r.name.toLowerCase(), r.id]));
        const slots: MealSlot[] = [];
        (plan.days ?? []).slice(0, 7).forEach((d, i) => {
            const date = d.date && days.includes(d.date) ? d.date : days[i];
            if (!date) return;
            for (const kind of ["breakfast", "lunch", "dinner"] as MealSlotKind[]) {
                const title = (d[kind] ?? "").trim();
                if (!title) continue;
                slots.push({ id: uid("slot"), planId, date, slot: kind, recipeId: byName.get(title.toLowerCase()) ?? null, title, cookMemberId: null, note: "" });
            }
        });
        const listId = state.groceryLists.find((l) => l.planId === planId)?.id ?? uid("grocery");
        const items: GroceryItem[] = (plan.grocery ?? []).slice(0, 60).map((g) => ({
            id: uid("gitem"),
            listId,
            item: (g.item ?? "").trim() || "Something",
            qty: g.qty ?? "",
            priceEstimateCents: Math.max(0, Math.round(g.estCents ?? 0)),
            checked: false,
            recipeId: null,
        }));

        this.write((s) => {
            const keep = s.slots.filter((x) => x.planId !== planId || !slots.some((n) => n.date === x.date && n.slot === x.slot));
            s.slots = [...keep, ...slots];
            if (!items.length) return;
            const existing = s.groceryLists.find((l) => l.id === listId);
            const total = items.reduce((n, i) => n + i.priceEstimateCents, 0);
            if (existing) {
                existing.totalEstimateCents = total;
            } else {
                s.groceryLists.push({
                    id: listId,
                    planId,
                    weekStart: target.weekStart,
                    totalEstimateCents: total,
                    foodBudgetRemainingCents: 0,
                    budgetCheckedAt: now(),
                    createdBy: this.ctx.me.id,
                    createdAt: now(),
                });
            }
            s.groceryItems = [...s.groceryItems.filter((i) => i.listId !== listId), ...items];
        });
        if (plan.note && plan.note.trim()) {
            this.write((s) => {
                const p = s.mealPlans.find((x) => x.id === planId);
                if (p) p.note = plan.note!.trim();
            });
        }
    }

    // -----------------------------------------------------------------------
    // Challenges and wellness goals
    // -----------------------------------------------------------------------

    async createChallenge(input: { name: string; blurb?: string; metric: ChallengeMetric; target: number; start: string; end: string; sprouts: number; memberIds: string[] }): Promise<Challenge> {
        this.assertManages();
        const row: Challenge = {
            id: uid("challenge"),
            name: input.name.trim() || "A family challenge",
            blurb: input.blurb ?? "",
            metric: input.metric,
            target: Math.max(1, Math.round(input.target)),
            start: input.start,
            end: input.end < input.start ? input.start : input.end,
            sprouts: Math.max(0, Math.round(input.sprouts)),
            memberIds: input.memberIds,
            completedAt: null,
            creditedMemberIds: [],
            createdBy: this.ctx.me.id,
            createdAt: now(),
        };
        this.write((s) => {
            s.challenges.push(row);
        });
        return row;
    }

    async logChallenge(challengeId: string, memberId: string, value: number, date?: string): Promise<void> {
        this.assertMine(memberId);
        const on = date ?? this.ctx.today;
        this.write((s) => {
            const existing = s.challengeEntries.find((e) => e.challengeId === challengeId && e.memberId === memberId && e.date === on);
            if (existing) {
                existing.value = Math.max(0, Math.round(value));
                existing.at = now();
            } else {
                s.challengeEntries.push({ id: uid("centry"), challengeId, memberId, date: on, value: Math.max(0, Math.round(value)), at: now() });
            }
        });
    }

    /** AC 7 — this says who earned what; the page credits the shared ledger. */
    async completeChallenge(id: string): Promise<ChallengeCredit[]> {
        this.assertManages();
        const state = this.get();
        const challenge = state.challenges.find((c) => c.id === id);
        if (!challenge) throw new Error("That challenge is gone");
        if (challenge.completedAt) return [];
        const kids = new Set(this.ctx.members.filter((m) => m.role === "child").map((m) => m.id));
        const credits: ChallengeCredit[] = standings(state, challenge)
            .filter((s) => s.hit && kids.has(s.memberId) && !challenge.creditedMemberIds.includes(s.memberId))
            .map((s) => ({ memberId: s.memberId, sprouts: challenge.sprouts }));
        this.write((s) => {
            const c = s.challenges.find((x) => x.id === id);
            if (!c) return;
            c.completedAt = now();
            c.creditedMemberIds = [...c.creditedMemberIds, ...credits.map((x) => x.memberId)];
        });
        return credits;
    }

    async removeChallenge(id: string): Promise<void> {
        this.assertManages();
        this.write((s) => {
            s.challenges = s.challenges.filter((c) => c.id !== id);
            s.challengeEntries = s.challengeEntries.filter((e) => e.challengeId !== id);
        });
    }

    async addWellnessGoal(input: { memberId: string | null; name: string; target: number; unit: string; current?: number; dueDate?: string | null; goalId?: string | null; goalLabel?: string; note?: string }): Promise<WellnessGoal> {
        this.assertMine(input.memberId);
        const row: WellnessGoal = {
            id: uid("wgoal"),
            memberId: input.memberId,
            name: input.name.trim() || "A wellness goal",
            goalId: input.goalId ?? null,
            goalLabel: input.goalLabel ?? "",
            target: Math.max(1, input.target),
            current: Math.max(0, input.current ?? 0),
            unit: input.unit,
            dueDate: input.dueDate ?? null,
            note: input.note ?? "",
            createdAt: now(),
        };
        this.write((s) => {
            s.wellnessGoals.push(row);
        });
        return row;
    }

    async updateWellnessGoal(id: string, patch: Partial<Pick<WellnessGoal, "name" | "target" | "current" | "unit" | "dueDate" | "note" | "goalId" | "goalLabel">>): Promise<void> {
        const g = this.get().wellnessGoals.find((x) => x.id === id);
        if (!g) throw new Error("That goal is gone");
        this.assertMine(g.memberId);
        this.write((s) => {
            const row = s.wellnessGoals.find((x) => x.id === id);
            if (row) Object.assign(row, patch);
        });
    }

    async removeWellnessGoal(id: string): Promise<void> {
        const g = this.get().wellnessGoals.find((x) => x.id === id);
        if (!g) throw new Error("That goal is gone");
        this.assertMine(g.memberId);
        this.write((s) => {
            s.wellnessGoals = s.wellnessGoals.filter((x) => x.id !== id);
        });
    }
}
