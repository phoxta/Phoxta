import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AgendaItem, AttentionItem, ChildCard, DashboardContribution, ModuleRepo, Nudge, ProgressRing, RepoContext, WafeModule } from "@/data/core";
import { MODULES } from "@/modules";
import { useSpace } from "@/state/space";
import { useTenant } from "@/state/tenant";

/**
 * Every module's data, in one place.
 *
 * On each space (or "view as") change the provider builds every module's repo
 * for that member and loads every slice in parallel. `useModule(mod)` hands a
 * screen its typed slice plus `mutate`, which runs a write and reloads that
 * one slice — so the numbers on screen are always what storage holds.
 *
 * The provider also owns the three cross-module surfaces: the dashboard
 * contributions, the follow-up engine (nudges → notifications, each raised
 * once per key) and the AI companion's grounding text.
 */

type Slice = { state: unknown; repo: ModuleRepo<unknown>; loading: boolean; error: string | null };

type DataCtx = {
    ctx: RepoContext;
    slices: Record<string, Slice>;
    /** True until every module has loaded once for this member. */
    loading: boolean;
    reload: (moduleId: string) => Promise<void>;
    reloadAll: () => Promise<void>;
    /** Aggregated across modules, for the dashboards. */
    dashboard: Required<DashboardContribution>;
    /** Role-safe grounding for the companion. */
    aiGrounding: () => string;
    search: (q: string) => Array<{ title: string; meta: string; href: string; moduleId: string }>;
};

const Ctx = createContext<DataCtx | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
    const sp = useSpace();
    const { tenant } = useTenant();
    const [slices, setSlices] = useState<Record<string, Slice>>({});
    const gen = useRef(0);

    const ctx = useMemo<RepoContext>(
        () => ({ kind: sp.kind, orgId: tenant?.id ?? null, space: sp.space, members: sp.members, me: sp.me, role: sp.role, can: sp.can, today: sp.today }),
        [sp.kind, tenant?.id, sp.space, sp.members, sp.me, sp.role, sp.can, sp.today],
    );

    // Build repos + load everything whenever the member/space changes.
    useEffect(() => {
        if (!sp.ready || sp.noSpace) return;
        const my = ++gen.current;
        const repos: Record<string, ModuleRepo<unknown>> = {};
        for (const m of MODULES) repos[m.id] = (m as WafeModule<unknown>).createRepo(ctx);
        setSlices(Object.fromEntries(MODULES.map((m) => [m.id, { state: undefined, repo: repos[m.id], loading: true, error: null }])));
        const unsubs: Array<() => void> = [];
        for (const m of MODULES) {
            const repo = repos[m.id];
            repo.load()
                .then((state) => {
                    if (my !== gen.current) return;
                    setSlices((s) => ({ ...s, [m.id]: { ...s[m.id], state, loading: false, error: null } }));
                })
                .catch((e: unknown) => {
                    if (my !== gen.current) return;
                    const msg = e instanceof Error ? e.message : "Couldn't load";
                    console.error(`[wafe] ${m.id}:`, msg);
                    setSlices((s) => ({ ...s, [m.id]: { ...s[m.id], loading: false, error: msg } }));
                });
            const u = repo.subscribe?.(() => {
                if (my !== gen.current) return;
                repo.load().then((state) => my === gen.current && setSlices((s) => ({ ...s, [m.id]: { ...s[m.id], state } })));
            });
            if (u) unsubs.push(u);
        }
        return () => {
            unsubs.forEach((u) => u());
        };
    }, [sp.ready, sp.noSpace, ctx]);

    const reload = useCallback(
        async (moduleId: string) => {
            const s = slices[moduleId];
            if (!s) return;
            const my = gen.current;
            try {
                const state = await s.repo.load();
                if (my === gen.current) setSlices((all) => ({ ...all, [moduleId]: { ...all[moduleId], state, error: null } }));
            } catch (e) {
                const msg = e instanceof Error ? e.message : "Couldn't load";
                if (my === gen.current) setSlices((all) => ({ ...all, [moduleId]: { ...all[moduleId], error: msg } }));
            }
        },
        [slices],
    );
    const reloadAll = useCallback(async () => {
        await Promise.all(Object.keys(slices).map((id) => reload(id)));
    }, [slices, reload]);

    const loading = MODULES.some((m) => slices[m.id]?.loading !== false);

    const dashboard = useMemo<Required<DashboardContribution>>(() => {
        const agenda: AgendaItem[] = [];
        const attention: AttentionItem[] = [];
        const rings: ProgressRing[] = [];
        const childCards: ChildCard[] = [];
        for (const m of MODULES) {
            const s = slices[m.id];
            if (!s || s.loading || s.state === undefined || !m.dashboard) continue;
            try {
                const c = (m as WafeModule<unknown>).dashboard!(s.state, ctx);
                agenda.push(...(c.agenda ?? []));
                attention.push(...(c.attention ?? []));
                rings.push(...(c.rings ?? []));
                childCards.push(...(c.childCards ?? []));
            } catch (e) {
                console.error(`[wafe] dashboard ${m.id}:`, e);
            }
        }
        agenda.sort((a, b) => a.sort - b.sort);
        attention.sort((a, b) => b.weight - a.weight);
        return { agenda, attention, rings, childCards };
    }, [slices, ctx]);

    // Follow-up engine: raise each module's nudges once per key, as notifications.
    const nudged = useRef(false);
    useEffect(() => {
        if (loading || nudged.current || sp.kind !== "demo" && !sp.ready) return;
        nudged.current = true;
        (async () => {
            const wanted: Nudge[] = [];
            for (const m of MODULES) {
                const s = slices[m.id];
                if (!s || s.state === undefined || !m.nudges) continue;
                try {
                    wanted.push(...(m as WafeModule<unknown>).nudges!(s.state, ctx));
                } catch (e) {
                    console.error(`[wafe] nudges ${m.id}:`, e);
                }
            }
            if (!wanted.length) return;
            const now = new Date().toISOString();
            const raised = new Set(await sp.core.raisedNudgeKeys());
            const parents = sp.members.filter((x) => x.role === "parent").map((x) => x.id);
            let any = false;
            for (const n of wanted) {
                if (raised.has(n.key) || (n.notBefore && n.notBefore > now)) continue;
                const targets = n.memberIds.length ? n.memberIds : parents;
                for (const memberId of targets) await sp.core.notify({ memberId, kind: n.kind, title: n.title, body: n.body, href: n.href });
                await sp.core.recordNudge(n.key);
                any = true;
            }
            if (any) await sp.refreshCore();
        })().catch((e) => console.error("[wafe] follow-ups:", e));
        // Runs once per load cycle by design (the `nudged` ref is the guard); re-running on every slice/ctx change would re-raise nudges.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading]);
    useEffect(() => {
        nudged.current = false;
    }, [ctx.me.id, ctx.space.id]);

    const aiGrounding = useCallback(() => {
        const parts: string[] = [
            `Family: ${sp.space.name} (${sp.space.tagline}). Today is ${sp.today}. Asking: ${sp.me.name} (${sp.me.relation}, role ${sp.role}).`,
            `Members: ${sp.members.map((m) => `${m.name} (${m.relation}, ${m.role})`).join("; ")}.`,
            `Values: ${sp.space.values.join(" · ")}. Mission: ${sp.space.mission}`,
        ];
        for (const m of MODULES) {
            const s = slices[m.id];
            if (!s || s.state === undefined || !m.aiContext) continue;
            try {
                const t = (m as WafeModule<unknown>).aiContext!(s.state, ctx).trim();
                if (t) parts.push(`[${m.name}] ${t.slice(0, 1500)}`);
            } catch (e) {
                console.error(`[wafe] aiContext ${m.id}:`, e);
            }
        }
        return parts.join("\n");
    }, [slices, ctx, sp]);

    const search = useCallback(
        (q: string) => {
            const needle = q.trim().toLowerCase();
            if (needle.length < 2) return [];
            const hits: Array<{ title: string; meta: string; href: string; moduleId: string }> = [];
            for (const m of MODULES) {
                const s = slices[m.id];
                if (!s || s.state === undefined || !m.search) continue;
                try {
                    for (const h of (m as WafeModule<unknown>).search!(s.state, needle)) hits.push({ ...h, moduleId: m.id });
                } catch {
                    /* a module's search never breaks the box */
                }
            }
            return hits.slice(0, 24);
        },
        [slices],
    );

    const value = useMemo<DataCtx>(() => ({ ctx, slices, loading, reload, reloadAll, dashboard, aiGrounding, search }), [ctx, slices, loading, reload, reloadAll, dashboard, aiGrounding, search]);
    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData(): DataCtx {
    const c = useContext(Ctx);
    if (!c) throw new Error("useData outside DataProvider");
    return c;
}

/** A module's typed slice: state, its repo, and mutate (write → reload). */
export function useModule<S, R extends ModuleRepo<S>>(mod: WafeModule<S, R>): {
    state: S;
    repo: R;
    loading: boolean;
    error: string | null;
    mutate: (fn: (repo: R) => Promise<unknown>) => Promise<void>;
    reload: () => Promise<void>;
} {
    const { slices, reload } = useData();
    const s = slices[mod.id];
    const mutate = useCallback(
        async (fn: (repo: R) => Promise<unknown>) => {
            if (!s) throw new Error(`${mod.id} is not loaded yet`);
            await fn(s.repo as R);
            await reload(mod.id);
        },
        [s, reload, mod.id],
    );
    return {
        state: (s?.state as S) ?? (undefined as unknown as S),
        repo: (s?.repo as R) ?? (undefined as unknown as R),
        loading: s ? s.loading : true,
        error: s?.error ?? null,
        mutate,
        reload: () => reload(mod.id),
    };
}

/** Another module's loaded state, read-only (for cross-module screens). */
export function useModuleState<S>(moduleId: string): S | undefined {
    const { slices } = useData();
    return slices[moduleId]?.state as S | undefined;
}
