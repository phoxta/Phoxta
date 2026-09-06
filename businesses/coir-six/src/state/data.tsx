import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { LocalRepo } from "@/data/localRepo";
import type { Repo } from "@/data/repo";
import { CATALOGUE, demoUserState } from "@/data/seed";
import { SupabaseRepo } from "@/data/supabaseRepo";
import type { Catalogue, UserState } from "@/data/types";
import { useAuth } from "@/state/auth";
import { useTenant } from "@/state/tenant";

/**
 * The app's data, in one place.
 *
 * Picks the repo from the auth state (demo → browser, session → this tenant's
 * rows on Supabase), loads the catalogue and the learner once, and re-reads
 * the learner after every write. Re-reading is deliberate: it keeps the
 * derived numbers on every screen — streak, ring, watched counts — provably
 * consistent with what was stored, at a cost of one round trip that is
 * invisible in the demo and cheap in the live app.
 */

type DataCtx = {
    repo: Repo;
    catalogue: Catalogue;
    user: UserState;
    loading: boolean;
    error: string | null;
    /** Run a write, then reload the learner. Errors surface to the caller. */
    mutate: (fn: (repo: Repo) => Promise<unknown>) => Promise<void>;
    refresh: () => Promise<void>;
};

const Ctx = createContext<DataCtx | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
    const { session } = useAuth();
    const { tenant } = useTenant();
    const repo = useMemo<Repo>(() => {
        if (session?.user && tenant) return new SupabaseRepo(session.user.id, session.user.email ?? "", tenant.id);
        return new LocalRepo();
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
