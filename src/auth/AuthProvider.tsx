import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";
import { getMyProfile } from "@/lib/db/profile";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  configured: boolean;
  /** True once a password-recovery link has been processed (forces reset mode). */
  recovery: boolean;
  /** null = not yet known; true/false = onboarding completed or not. */
  onboarded: boolean | null;
  /** Mark onboarding done locally (after completeOnboarding) so the gate releases. */
  markOnboarded: () => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovery, setRecovery] = useState(false);
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, nextSession) => {
      // A recovery link logs the user in with a special event; surface it so the
      // auth screen shows the "set a new password" form regardless of the URL.
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Track onboarding completion for the signed-in user — this drives the gate in
  // ProtectedRoute so EVERY protected route (dashboard + studio) is covered.
  // Keyed on the user id so a token refresh doesn't trigger a refetch.
  const userId = session?.user?.id ?? null;
  useEffect(() => {
    if (!userId) {
      setOnboarded(null);
      return;
    }
    let active = true;
    getMyProfile().then(({ data, error }) => {
      if (!active) return;
      // On a fetch error, don't trap the user in onboarding — let them through;
      // individual pages surface their own errors.
      setOnboarded(error ? true : Boolean(data?.onboarding_completed));
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      configured: isSupabaseConfigured,
      recovery,
      onboarded,
      markOnboarded: () => setOnboarded(true),
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: friendlyError(error?.message) };
      },
      async signUp(email, password) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth` },
        });
        const needsConfirmation = !error && !data.session;
        return { error: friendlyError(error?.message), needsConfirmation };
      },
      async signOut() {
        await supabase.auth.signOut();
      },
      async sendPasswordReset(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth?mode=reset`,
        });
        return { error: friendlyError(error?.message) };
      },
      async updatePassword(password) {
        const { error } = await supabase.auth.updateUser({ password });
        return { error: friendlyError(error?.message) };
      },
    }),
    [session, loading, recovery, onboarded],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
