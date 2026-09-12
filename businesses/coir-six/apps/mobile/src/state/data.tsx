import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CATALOGUE, LocalRepo, SupabaseRepo, demoUserState, type Catalogue, type Repo, type UserState } from "@coir-six/core";
import { deviceStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/state/auth";
import { useTenant } from "@/state/tenant";

/**
 * The app's data, in one place — the same provider the web app has, over the
 * same shared repos. Demo → this phone (AsyncStorage); session → this school's
 * rows on Supabase. Every write re-reads the learner so the derived numbers on
 * every screen stay consistent with what was stored.
 */

type DataCtx = {
    repo: Repo;
    catalogue: Catalogue;
    user: UserState;
    loading: boolean;
    error: string | null;
    mutate: (fn: (repo: Repo) => Promise<unknown>) => Promise<void>;
    refresh: () => Promise<void>;
};

const Ctx = createContext<DataCtx | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
    const { session } = useAuth();
    const { tenant } = useTenant();
    const repo = useMemo<Repo>(() => {
        if (session?.user && tenant) return new SupabaseRepo(supabase, session.user.id, session.user.email ?? "", tenant.id);
        return new LocalRepo(deviceStore);
    }, [session, tenant]);

    const [catalogue, setCatalogue] = useState<Catalogue>(CATALOGUE);
    const [user, setUser] = useState<UserState>(() => demoUserState());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const gen = useRef(0);

    const refresh = useCallback(async () => {
        const my = ++gen.current;
        try {
            const u = await repo.loadUser();
            if (my === gen.current) setUser(u);
        } catch (e) {
            if (my === gen.current) setError(e instanceof Error ? e.message : "Couldn't load your data.");
        }
    }, [repo]);

    useEffect(() => {
        let active = true;
        setLoading(true);
        setError(null);
        (async () => {
            try {
                const [c, u] = await Promise.all([repo.loadCatalogue(), repo.loadUser()]);
                if (!active) return;
                setCatalogue(c);
                setUser(u);
            } catch (e) {
                if (active) setError(e instanceof Error ? e.message : "Couldn't load your data.");
            } finally {
                if (active) setLoading(false);
            }
        })();
        const unsub = repo.subscribe(() => void refresh());
        return () => {
            active = false;
            unsub();
        };
    }, [repo, refresh]);

    const mutate = useCallback(
        async (fn: (r: Repo) => Promise<unknown>) => {
            await fn(repo);
            await refresh();
        },
        [repo, refresh],
    );

    const value = useMemo<DataCtx>(() => ({ repo, catalogue, user, loading, error, mutate, refresh }), [repo, catalogue, user, loading, error, mutate, refresh]);
    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData(): DataCtx {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error("useData outside DataProvider");
    return ctx;
}
