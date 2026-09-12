import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { isConfigured } from "@/lib/env";
import { readJson, writeJson } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/state/tenant";

/**
 * Who is using the app.
 *
 * Three states: signed out, exploring the DEMO (Jason, kept on this phone),
 * or signed in to a real account at a chosen school. Demo mode is a
 * first-class way in — someone who installed the app from a store listing
 * should be able to use every screen before picking a school — and it is the
 * only mode when there is no backend or no school yet.
 */

const DEMO_KEY = "coir-six:mode";

type AuthState = {
    ready: boolean;
    session: Session | null;
    demo: boolean;
    /** Accounts are possible: a backend AND a school. */
    configured: boolean;
    enterDemo: () => void;
    leaveDemo: () => void;
    signIn: (email: string, password: string) => Promise<string | null>;
    signUp: (email: string, password: string, name: string) => Promise<string | null>;
    sendReset: (email: string) => Promise<string | null>;
    signOut: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const { ready: tenantReady, tenant } = useTenant();
    const configured = isConfigured && Boolean(tenant);
    const [session, setSession] = useState<Session | null>(null);
    const [sessionReady, setSessionReady] = useState(!isConfigured);
    const [demo, setDemo] = useState(false);
    const [demoReady, setDemoReady] = useState(false);

    useEffect(() => {
        let active = true;
        void readJson<string>(DEMO_KEY).then((v) => {
            if (!active) return;
            setDemo(v === "demo");
            setDemoReady(true);
        });
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (!isConfigured) return;
        let active = true;
        void supabase.auth.getSession().then(({ data }) => {
            if (!active) return;
            setSession(data.session ?? null);
            setSessionReady(true);
        });
        const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
            if (active) setSession(s);
        });
        return () => {
            active = false;
            sub.subscription.unsubscribe();
        };
    }, []);

    const enterDemo = useCallback(() => {
        void writeJson(DEMO_KEY, "demo");
        setDemo(true);
    }, []);
    const leaveDemo = useCallback(() => {
        void writeJson(DEMO_KEY, null);
        setDemo(false);
    }, []);

    const signIn = useCallback(
        async (email: string, password: string) => {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (!error) leaveDemo();
            return error?.message ?? null;
        },
        [leaveDemo],
    );
    const signUp = useCallback(
        async (email: string, password: string, name: string) => {
            const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
            if (!error) leaveDemo();
            return error?.message ?? null;
        },
        [leaveDemo],
    );
    const sendReset = useCallback(async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        return error?.message ?? null;
    }, []);
    const signOut = useCallback(async () => {
        await supabase.auth.signOut();
        setSession(null);
    }, []);

    // A session with no school behind it can't be scoped to anything; it is
    // treated as signed out so the demo stays the only path.
    const effective = configured ? session : null;
    const value = useMemo<AuthState>(
        () => ({ ready: tenantReady && sessionReady && demoReady, session: effective, demo: demo && !effective, configured, enterDemo, leaveDemo, signIn, signUp, sendReset, signOut }),
        [tenantReady, sessionReady, demoReady, effective, demo, configured, enterDemo, leaveDemo, signIn, signUp, sendReset, signOut],
    );
    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error("useAuth outside AuthProvider");
    return ctx;
}
