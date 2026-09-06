import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/phoxta";

/**
 * The signed-in customer.
 *
 * Customers are ordinary Supabase auth users. Everything they can see is scoped
 * server-side by the VERIFIED email on their JWT, so this context carries the
 * session and grants nothing by itself.
 */
type AccountState = {
    session: Session | null;
    email: string | null;
    name: string | null;
    ready: boolean;
};

const Ctx = createContext<AccountState>({ session: null, email: null, name: null, ready: false });

export function AccountProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let active = true;
        supabase.auth.getSession().then(({ data }) => {
            if (!active) return;
            setSession(data.session ?? null);
            setReady(true);
        });
        const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
            if (active) setSession(s);
        });
        return () => {
            active = false;
            sub.subscription.unsubscribe();
        };
    }, []);

    const value = useMemo<AccountState>(() => {
        const meta = session?.user?.user_metadata as { full_name?: string } | undefined;
        const email = session?.user?.email ?? null;
        return {
            session,
            email,
            name: meta?.full_name ?? (email ? email.split("@")[0] : null),
            ready,
        };
    }, [session, ready]);

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAccount(): AccountState {
    return useContext(Ctx);
}
