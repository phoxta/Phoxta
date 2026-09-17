import { useCallback, useState } from "react";
import { useModule, useModuleState } from "@/state/data";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import { foodBudgetFrom } from "../derive";
import wellness from "../module";
import type { Challenge, FoodBudget, Habit, LogResult, WellnessRepo } from "../types";

/**
 * The one hook every wellness screen shares.
 *
 * Two things live here rather than in the repo, and for the same reason: a
 * repo never writes another module's rows. Sprouts land on the family ledger
 * from HERE, once the wellness write has actually gone through (AC 5, AC 7);
 * and the food budget is READ from Finance's loaded slice, never from its
 * tables, so a member who may not see money simply gets `null` (AC 3).
 */
export function useWellness() {
    const sp = useSpace();
    const mod = useModule(wellness);
    const { toast } = useToast();
    const finance = useModuleState<unknown>("finance");
    const [celebration, setCelebration] = useState<{ sprouts: number; title: string; streak: number } | null>(null);

    const child = sp.role === "child";
    const foodBudget: FoodBudget | null = foodBudgetFrom(finance);

    /** One tap: tick the habit off, credit the Sprouts, say something kind. */
    const logHabit = useCallback(
        async (habit: Habit, value?: number, date?: string): Promise<LogResult | null> => {
            let captured: LogResult | null = null;
            try {
                await mod.mutate(async (r: WellnessRepo) => {
                    captured = await r.logHabit(habit.id, value, date);
                });
            } catch (e) {
                toast(e instanceof Error ? e.message : "Couldn't log that", "danger");
                return null;
            }
            const res = captured as LogResult | null;
            if (!res) return null;
            if (res.sprouts > 0) {
                await sp.mutateCore((c) => c.addPoints(res.memberId, res.sprouts, `Habit: ${res.habitName}`));
                if (child) setCelebration({ sprouts: res.sprouts, title: res.habitName, streak: res.current });
                else toast(`+${res.sprouts} Sprouts · ${res.current} days running`, "success");
            } else if (res.kept) {
                toast(res.current > 1 ? `${res.current} days running` : "Logged", "success");
            } else {
                toast("Part way there — logged", "default");
            }
            return res;
        },
        [mod, sp, toast, child],
    );

    const undoHabit = useCallback(
        async (habit: Habit, date: string) => {
            try {
                await mod.mutate((r: WellnessRepo) => r.unlogHabit(habit.id, date));
                toast("Taken off", "default");
            } catch (e) {
                toast(e instanceof Error ? e.message : "Couldn't undo that", "danger");
            }
        },
        [mod, toast],
    );

    /** One tap on a session, from a card or from the schedule. */
    const logWorkout = useCallback(
        async (workoutId: string | null, input: { durationMin: number; memberId?: string; title?: string; planId?: string | null; sets?: string[]; feel?: "easy" | "good" | "tough"; notes?: string; date?: string }) => {
            try {
                await mod.mutate((r: WellnessRepo) => r.logWorkout(workoutId, input));
                toast("Session logged. Well done.", "success");
                return true;
            } catch (e) {
                toast(e instanceof Error ? e.message : "Couldn't log that", "danger");
                return false;
            }
        },
        [mod, toast],
    );

    /** AC 7 — close it, then credit every child who hit the target, once. */
    const closeChallenge = useCallback(
        async (challenge: Challenge) => {
            let captured: Array<{ memberId: string; sprouts: number }> = [];
            try {
                await mod.mutate(async (r: WellnessRepo) => {
                    captured = await r.completeChallenge(challenge.id);
                });
            } catch (e) {
                toast(e instanceof Error ? e.message : "Couldn't close that", "danger");
                return;
            }
            for (const credit of captured) {
                await sp.mutateCore((c) => c.addPoints(credit.memberId, credit.sprouts, `Challenge: ${challenge.name}`));
            }
            toast(captured.length ? `${challenge.name} closed — ${captured.length * challenge.sprouts} Sprouts credited` : `${challenge.name} closed`, "success");
        },
        [mod, sp, toast],
    );

    /** Wrap any repo write so a page never has to write the same try/catch. */
    const run = useCallback(
        async (fn: (r: WellnessRepo) => Promise<unknown>, ok?: string): Promise<boolean> => {
            try {
                await mod.mutate(fn);
                if (ok) toast(ok, "success");
                return true;
            } catch (e) {
                toast(e instanceof Error ? e.message : "That didn't work", "danger");
                return false;
            }
        },
        [mod, toast],
    );

    return {
        ...mod,
        sp,
        child,
        toast,
        run,
        foodBudget,
        logHabit,
        undoHabit,
        logWorkout,
        closeChallenge,
        celebration,
        clearCelebration: () => setCelebration(null),
    };
}
