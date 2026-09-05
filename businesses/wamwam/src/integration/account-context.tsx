import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integration/phoxta";

/**
 * The signed-in storefront customer.
 *
 * Customers are ordinary Supabase auth users; everything they may read is
 * scoped server-side by the verified email in their JWT, so this context only
 * carries the session and grants nothing on its own.
 */
export interface AccountState {
    session: Session | null;
    email: string | null;
    /** False until the initial getSession() has settled — success OR failure. */
    ready: boolean;
}

const AccountContext = createContext<AccountState>({ session: null, email: null, ready: false });

export function AccountProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let active = true;
        supabase.auth
            .getSession()
            .then(({ data }) => {
                if (active) setSession(data.session ?? null);
            })
            .catch(() => {
                // Offline or unconfigured backend: treat as signed out.
            })
            .finally(() => {
                if (active) setReady(true);
            });
        const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
            if (active) setSession(s);
        });
        return () => {
            active = false;
            sub.subscription.unsubscribe();
        };
    }, []);

    const value = useMemo<AccountState>(
        () => ({ session, email: session?.user?.email ?? null, ready }),
        [session, ready],
    );
    return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountState {
    return useContext(AccountContext);
}
