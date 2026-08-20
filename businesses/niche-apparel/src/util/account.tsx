import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/lib/phoxta";
import type { Session } from "@supabase/supabase-js";

/**
 * Signed-in customer for this storefront.
 *
 * Customers are ordinary Supabase auth users. Everything they can see is scoped
 * server-side by the verified email on their JWT (migration 0077), so this
 * context only carries the session — it grants nothing by itself.
 */
type AccountCtx = { session: Session | null; email: string | null; ready: boolean };

const Ctx = createContext<AccountCtx>({ session: null, email: null, ready: false });

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
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (active) setSession(s);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AccountCtx>(
    () => ({ session, email: session?.user?.email ?? null, ready }),
    [session, ready],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAccount(): AccountCtx {
  return useContext(Ctx);
}
