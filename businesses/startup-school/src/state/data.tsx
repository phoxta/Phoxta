import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { emptyVenture, SupabaseRepo, type Catalogue, type Repo, type UserState } from "@startup-school/core";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/state/auth";
import { useTenant } from "@/state/tenant";

/**
 * The app's data, in one place.
 *
 * This provider exists only inside the paid-app route tree. It uses the
 * Supabase repository exclusively: course data and learner work are never
 * replaced with a browser-only fallback.
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

const EMPTY_CATALOGUE: Catalogue = { categories: [], mentors: [], courses: [], modules: [], lessons: [], quiz: [], liveLessons: [], lessonBlocks: [], groups: [], availability: [] };
const EMPTY_USER: UserState = {
    profile: { id: "", email: "", name: "", handle: "", hue: "lilac", headline: "", weeklyGoalMin: 180, interests: [], onboarded: false, createdAt: new Date(0).toISOString() },
    friends: [], enrollments: [], progress: [], sessions: [], bookmarks: [], follows: [], tasks: [], notes: [], groupIds: [], conversations: [], notifications: [], attempts: [], certificates: [], rsvps: [], attendance: [], bookings: [], venture: emptyVenture(), experiments: [],
};

export function DataProvider({ children }: { children: ReactNode }) {
    const { session } = useAuth();
    const { tenant } = useTenant();
    const repo = useMemo<Repo>(() => {
        if (!session?.user || !tenant) throw new Error("Startup School data requires an authenticated, enrolled learner.");
        return new SupabaseRepo(supabase, session.user.id, session.user.email ?? "", tenant.id);
    }, [session?.user?.id, session?.user?.email, tenant?.id]);

    const [catalogue, setCatalogue] = useState<Catalogue>(EMPTY_CATALOGUE);
    const [user, setUser] = useState<UserState>(EMPTY_USER);
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
