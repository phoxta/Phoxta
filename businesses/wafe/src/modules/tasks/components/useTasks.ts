import { useCallback, useState } from "react";
import { useData, useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import tasks from "../module";
import type { CompleteResult, Task, TasksRepo } from "../types";

/**
 * One hook the module's four pages share: the typed slice, the space, and the
 * two writes that have a second half.
 *
 * A repo never touches another module's tables, so Sprouts are credited to the
 * family-wide points balance HERE — from the page, once the task write has
 * actually landed — and the child gets their celebration from the same place.
 */
export function useTasks() {
    const sp = useSpace();
    const { ctx } = useData();
    const mod = useModule(tasks);
    const { toast } = useToast();
    const [celebration, setCelebration] = useState<{ sprouts: number; title: string } | null>(null);

    const child = sp.role === "child";

    /** Tick a task off; credit Sprouts and celebrate when it earns them. */
    const complete = useCallback(
        async (task: Task): Promise<CompleteResult | null> => {
            let captured: CompleteResult | null = null;
            await mod.mutate(async (r: TasksRepo) => {
                captured = await r.completeTask(task.id);
            });
            const res = captured as CompleteResult | null;
            if (!res) return null;
            if (res.awaitingApproval) {
                toast("Photo sent — a parent will check it", "default");
                return res;
            }
            if (res.sprouts > 0 && res.memberId) {
                await sp.mutateCore((c) => c.addPoints(res.memberId as string, res.sprouts, `Chore: ${task.title}`));
                if (child) setCelebration({ sprouts: res.sprouts, title: task.title });
                else toast(`+${res.sprouts} Sprouts for ${sp.members.find((m) => m.id === res.memberId)?.name.split(" ")[0] ?? "them"}`, "success");
            } else {
                toast(res.nextDueAt ? "Done — the next one is on the list" : "Done", "success");
            }
            return res;
        },
        [mod, sp, toast, child],
    );

    /** A parent says yes to a photo: the Sprouts land now, not before (AC 4). */
    const approve = useCallback(
        async (task: Task): Promise<CompleteResult | null> => {
            let captured: CompleteResult | null = null;
            await mod.mutate(async (r: TasksRepo) => {
                captured = await r.approveProof(task.id);
            });
            const res = captured as CompleteResult | null;
            if (res && res.sprouts > 0 && res.memberId) {
                await sp.mutateCore((c) => c.addPoints(res.memberId as string, res.sprouts, `Chore: ${task.title}`));
                toast(`${res.sprouts} Sprouts credited`, "success");
            }
            return res;
        },
        [mod, sp, toast],
    );

    /** Approving a redemption takes the Sprouts off the balance too (AC 10). */
    const decide = useCallback(
        async (redemptionId: string, ok: boolean): Promise<void> => {
            let captured: { memberId: string; sproutsDelta: number; rewardName: string } | null = null;
            await mod.mutate(async (r: TasksRepo) => {
                captured = await r.decideRedemption(redemptionId, ok);
            });
            const res = captured as { memberId: string; sproutsDelta: number; rewardName: string } | null;
            if (res && res.sproutsDelta !== 0) {
                await sp.mutateCore((c) => c.addPoints(res.memberId, res.sproutsDelta, `Redeemed: ${res.rewardName}`));
                toast(`${res.rewardName} approved — ${Math.abs(res.sproutsDelta)} Sprouts spent`, "success");
            } else if (res) {
                toast("Sent back with a note", "default");
            }
        },
        [mod, sp, toast],
    );

    return { ...mod, sp, ctx, toast, complete, approve, decide, celebration, clearCelebration: () => setCelebration(null) };
}
