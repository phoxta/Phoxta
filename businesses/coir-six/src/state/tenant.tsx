import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { resolveTenant, type Tenant } from "@/lib/tenant";

/**
 * The school this deployment is serving, resolved once at boot from the host.
 * `name` is what the wordmark shows; the blueprint's own name is the fallback
 * for the demo and for a tenant that hasn't named itself yet.
 */

const DEFAULT_NAME = "Coir Six";

type TenantState = {
    ready: boolean;
    tenant: Tenant | null;
    name: string;
};

const Ctx = createContext<TenantState | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let active = true;
        resolveTenant()
            .then((t) => {
                if (!active) return;
                setTenant(t);
                if (t?.name) document.title = `${t.name} — Learning`;
            })
            .finally(() => active && setReady(true));
        return () => {
            active = false;
        };
    }, []);

    const value = useMemo<TenantState>(() => ({ ready, tenant, name: tenant?.branding?.name || tenant?.name || DEFAULT_NAME }), [ready, tenant]);
    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTenant(): TenantState {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error("useTenant outside TenantProvider");
    return ctx;
}
