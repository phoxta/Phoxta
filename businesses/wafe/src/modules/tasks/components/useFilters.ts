import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { TaskFilter } from "../derive";
import type { TaskKind, TaskStatus } from "../types";

/**
 * The filters live in the URL, so a chip means the same thing in the list, on
 * the board and on the calendar (AC 9) — and so "the overdue ones" is a link
 * the dashboard can send you to, and a page you can refresh.
 */
export function useFilters() {
    const [params, setParams] = useSearchParams();

    const filter = useMemo<TaskFilter>(
        () => ({
            memberId: params.get("member"),
            kind: (params.get("kind") as TaskKind | null) ?? null,
            status: (params.get("status") as TaskStatus | null) ?? null,
            goalId: params.get("goal"),
            valueId: params.get("value"),
            overdue: params.get("overdue") === "1",
            q: params.get("q") ?? "",
        }),
        [params],
    );

    const set = useCallback(
        (key: string, value: string | null) => {
            const next = new URLSearchParams(params);
            if (value) next.set(key, value);
            else next.delete(key);
            setParams(next, { replace: true });
        },
        [params, setParams],
    );

    const toggle = useCallback((key: string, value: string) => set(key, params.get(key) === value ? null : value), [params, set]);

    const clear = useCallback(() => {
        const next = new URLSearchParams();
        const tab = params.get("tab");
        if (tab) next.set("tab", tab);
        setParams(next, { replace: true });
    }, [params, setParams]);

    const active = ["member", "kind", "status", "goal", "value", "overdue", "q"].filter((k) => params.get(k)).length;
    const qs = params.toString() ? `?${params.toString()}` : "";

    return { filter, params, set, toggle, clear, active, qs, tab: params.get("tab") ?? "tasks" };
}
