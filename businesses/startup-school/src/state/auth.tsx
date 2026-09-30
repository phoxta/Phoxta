import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { isConfigured, supabase } from "@/lib/supabase";
import { useTenant } from "@/state/tenant";

type AuthState = {
    ready: boolean;
    session: Session | null;
    configured: boolean;
    signIn: (email: string, password: string) => Promise<string | null>;
    signUp: (email: string, password: string, name: string, returnTo?: string) => Promise<{ error: string | null; needsEmailConfirmation: boolean }>;
    sendReset: (email: string) => Promise<string | null>;
    signOut: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

/** Startup School has one real-account path. No browser-local trial identity can
 * enter the paid workspace. */
export function AuthProvider({ children }: { children: ReactNode }) {
    const { ready: tenantReady, tenant } = useTenant();
    const configured = isConfigured && Boolean(tenant);
    const [session, setSession] = useState<Session | null>(null);
    const [sessionReady, setSessionReady] = useState(!isConfigured);

    useEffect(() => {
        if (!isConfigured) return;
        let active = true;
        void supabase.auth.getSession().then(({ data }) => {
            if (!active) return;
            setSession(data.session ?? null);
            setSessionReady(true);
        });
        const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
            if (active) setSession(next);
        });
        return () => {
            active = false;
            sub.subscription.unsubscribe();
        };
    }, []);

    const signIn = useCallback(async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return error?.message ?? null;
    }, []);

    const signUp = useCallback(async (email: string, password: string, name: string, returnTo?: string) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: name }, emailRedirectTo: `${location.origin}${returnTo?.startsWith("/staff/invite?") ? returnTo : "/pricing"}` },
        });
        return { error: error?.message ?? null, needsEmailConfirmation: !data.session };
    }, []);

    const sendReset = useCallback(async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/account/security` });
        return error?.message ?? null;
    }, []);

    const signOut = useCallback(async () => {
        const {error} = await supabase.auth.signOut();
        if(error)throw error;
        setSession(null);
    }, []);

    const value = useMemo<AuthState>(
        () => ({ ready: tenantReady && sessionReady, session: configured ? session : null, configured, signIn, signUp, sendReset, signOut }),
        [tenantReady, sessionReady, session, configured, signIn, signUp, sendReset, signOut],
    );
    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error("useAuth outside AuthProvider");
    return ctx;
}
