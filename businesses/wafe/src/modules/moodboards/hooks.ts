import { useMemo } from "react";
import type { RepoContext } from "@/data/core";
import { useSpace } from "@/state/space";

/**
 * The permission helpers in `derive.ts` are pure functions of a `RepoContext`,
 * so the repos and the screens ask exactly the same question. This turns the
 * space context into that shape once, for the pages.
 */
export function useCtx(): RepoContext {
    const sp = useSpace();
    return useMemo(
        () => ({ kind: sp.kind, orgId: null, space: sp.space, members: sp.members, me: sp.me, role: sp.role, can: sp.can, today: sp.today }),
        [sp.kind, sp.space, sp.members, sp.me, sp.role, sp.can, sp.today],
    );
}
