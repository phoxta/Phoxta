import { useEffect, useMemo, useRef } from "react";
import { useModule, useModuleState } from "@/state/data";
import { useSpace } from "@/state/space";
import goalsModule from "./module";
import { ledgerDrift, withLiveMetrics } from "./derive";
import type { GoalsRepo, GoalsState, LinkedFund, LinkedTask } from "./types";

/**
 * The goals slice, with the ledger's numbers in it.
 *
 * A goal measured by a savings pot is only honest if the pot is what it reads.
 * Finance publishes its pots on its own slice as `goalFunds` — a label, a
 * target and what is actually in there — and this hook lays them over the
 * stored readings before any screen sees the state. Move £500 into the deposit
 * pot in Finance and the goal's ring, percentage and history chart move with
 * it, without anybody typing a number and without this module going anywhere
 * near Finance's tables.
 *
 * Everything else is `useModule(goalsModule)` unchanged, so a page swaps one
 * for the other and keeps its `mutate`.
 */
export function useGoals(): {
    state: GoalsState;
    loading: boolean;
    error: string | null;
    mutate: (fn: (repo: GoalsRepo) => Promise<unknown>) => Promise<void>;
    /** The savings pots this member is allowed to see — empty for most of them. */
    funds: LinkedFund[];
} {
    const { state: stored, mutate, loading, error } = useModule(goalsModule);
    const { today } = useSpace();
    const finance = useModuleState<{ goalFunds?: LinkedFund[] }>("finance");

    const funds = useMemo(() => (Array.isArray(finance?.goalFunds) ? finance.goalFunds : []), [finance]);
    const state = useMemo(() => (stored ? withLiveMetrics(stored, funds, today) : stored), [stored, funds, today]);

    // ...and then write the ledger's number down, so the dashboard, the
    // companion and the database agree with the screen rather than trailing it.
    // The same shape as the nightly connection snapshot: whoever is allowed to
    // record it does, once, and anybody who is not simply reads the overlay.
    const recorded = useRef("");
    useEffect(() => {
        if (!stored) return;
        const drift = ledgerDrift(stored, funds);
        if (!drift.length) return;
        const key = drift.map((d) => `${d.ref}:${d.current}`).join("|");
        if (recorded.current === key) return;
        recorded.current = key;
        void (async () => {
            for (const d of drift) {
                try {
                    await mutate((r) => r.recordMetric(d.ref, d.current));
                } catch {
                    /* a reading this member may not write is not an error on screen */
                }
            }
        })();
    }, [stored, funds, mutate]);

    return { state, loading, error, mutate, funds };
}

/** The tasks slice, as far as this module cares: the ones pointing at a goal. */
export function useLinkedTasks(): LinkedTask[] {
    const tasks = useModuleState<{ tasks?: LinkedTask[] }>("tasks");
    return useMemo(() => (Array.isArray(tasks?.tasks) ? tasks.tasks : []), [tasks]);
}
