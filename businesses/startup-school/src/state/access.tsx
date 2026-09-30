import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { canAccess, type AccessFeature, type AccessPlan } from "@/lib/access";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/state/auth";
import { useTenant } from "@/state/tenant";

export type Entitlement = {
    plan: AccessPlan;
    status: "active" | "revoked" | "pending";
    grantedAt: string;
    expiresAt: string | null;
};

type AccessState = {
    ready: boolean;
    entitlement: Entitlement | null;
    plan: AccessPlan | null;
    can: (feature: AccessFeature) => boolean;
    refresh: () => Promise<void>;
};

const Ctx = createContext<AccessState | null>(null);

/** The paid pass is read from the server. A checkout return alone never grants access. */
export function AccessProvider({ children }: { children: ReactNode }) {
    const { ready: authReady, session } = useAuth();
    const { ready: tenantReady, tenant } = useTenant();
    const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        if (!session?.user || !tenant) {
            setEntitlement(null);
            return;
        }
        const { data } = await supabase
            .from("cs_entitlements")
            .select("plan,status,granted_at,expires_at")
            .eq("organization_id", tenant.id)
            .eq("user_id", session.user.id)
            .eq("status", "active")
            .maybeSingle();
        if (!data || (data.expires_at && Date.parse(data.expires_at) <= Date.now())) {
            setEntitlement(null);
            return;
        }
        const row = data as { plan: AccessPlan; status: Entitlement["status"]; granted_at: string; expires_at?: string | null };
        setEntitlement({ plan: row.plan, status: row.status, grantedAt: row.granted_at, expiresAt: row.expires_at ?? null });
    }, [session?.user, tenant]);

    useEffect(() => {
        let current = true;
        setLoading(true);
        void refresh().finally(() => {
            if (current) setLoading(false);
        });
        return () => {
            current = false;
        };
    }, [refresh]);

    const value = useMemo<AccessState>(
        () => ({
            ready: authReady && tenantReady && !loading,
            entitlement,
            plan: entitlement?.plan ?? null,
            can: (feature) => canAccess(entitlement?.plan, feature),
            refresh,
        }),
        [authReady, tenantReady, loading, entitlement, refresh],
    );
    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAccess(): AccessState {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error("useAccess outside AccessProvider");
    return ctx;
}
