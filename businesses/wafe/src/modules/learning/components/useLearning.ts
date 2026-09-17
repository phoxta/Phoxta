import { useData, useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import learning from "../module";
import type { LearningRepo, ProgressResult } from "../types";

/**
 * One hook the module's three pages share: the typed slice, the space, the
 * repo context the derive functions want, and `award` — the module's half of
 * the points convention. A repo never touches another family-level table, so
 * Sprouts are credited here, from the page, once the learning write has
 * actually landed.
 */
export function useLearning() {
    const sp = useSpace();
    const { ctx } = useData();
    const mod = useModule(learning);
    const { toast } = useToast();

    const award = async (fn: (r: LearningRepo) => Promise<ProgressResult>, memberId: string, reason: string): Promise<ProgressResult | null> => {
        let result: ProgressResult | null = null;
        await mod.mutate(async (r) => {
            result = await fn(r);
        });
        const res = result as ProgressResult | null;
        if (res?.points) {
            await sp.mutateCore((c) => c.addPoints(memberId, res.points, reason));
            toast(`+${res.points} Sprouts`, "success");
        }
        return res;
    };

    return { ...mod, sp, ctx, toast, award };
}
