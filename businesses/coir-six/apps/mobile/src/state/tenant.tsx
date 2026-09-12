import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { resolveTenant, schoolName, tenantByHost, type Tenant } from "@coir-six/core";
import { BAKED_ORG_ID, SCHOOL_HOST_SUFFIX, isConfigured } from "@/lib/env";
import { readJson, writeJson } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { ThemeProvider } from "@/lib/theme";

/**
 * Which school is this phone learning with?
 *
 * One app in the stores serves every school, so unless a build is pinned to
 * one organisation (`EXPO_PUBLIC_ORG_ID`), the learner picks theirs once — by
 * the school's web address — and the choice is remembered on the device. The
 * tenant then scopes every query and themes the app, exactly as the hostname
 * does on the web. No school (or no backend) means demo only.
 */

const KEY = "coir-six:school";

type SavedSchool = { host: string; tenant: Tenant };

type TenantState = {
    ready: boolean;
    tenant: Tenant | null;
    /** The chosen school's web address, e.g. demo.coir-six.phoxta.com. */
    host: string | null;
    name: string;
    /** Baked builds can't switch school. */
    canChoose: boolean;
    /** Look a school up by its address (or just the first label of it). Returns an error message or null. */
    chooseSchool: (input: string) => Promise<string | null>;
    clearSchool: () => Promise<void>;
};

const Ctx = createContext<TenantState | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [host, setHost] = useState<string | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let active = true;
        (async () => {
            if (!isConfigured) return;
            if (BAKED_ORG_ID) {
                const t = await resolveTenant(supabase, { orgId: BAKED_ORG_ID });
                if (active) setTenant(t);
                return;
            }
            const saved = await readJson<SavedSchool>(KEY);
            if (saved && active) {
                setTenant(saved.tenant);
                setHost(saved.host);
                // Refresh the brand in the background; the saved copy paints first.
                void tenantByHost(supabase, saved.host)
                    .then((t) => {
                        if (t && active) {
                            setTenant(t);
                            void writeJson(KEY, { host: saved.host, tenant: t } satisfies SavedSchool);
                        }
                    })
                    .catch(() => {});
            }
        })().finally(() => active && setReady(true));
        return () => {
            active = false;
        };
    }, []);

    const chooseSchool = useCallback(async (input: string): Promise<string | null> => {
        const raw = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
        if (!raw) return "Type your school's address.";
        const h = raw.includes(".") ? raw : `${raw}${SCHOOL_HOST_SUFFIX}`;
        try {
            const t = await tenantByHost(supabase, h);
            if (!t) return `No school at ${h}. Check the address your school gave you.`;
            setTenant(t);
            setHost(h);
            await writeJson(KEY, { host: h, tenant: t } satisfies SavedSchool);
            return null;
        } catch {
            return "Couldn't reach the server. Check your connection and try again.";
        }
    }, []);

    const clearSchool = useCallback(async () => {
        setTenant(null);
        setHost(null);
        await writeJson(KEY, null);
    }, []);

    const value = useMemo<TenantState>(
        () => ({ ready, tenant, host, name: schoolName(tenant), canChoose: isConfigured && !BAKED_ORG_ID, chooseSchool, clearSchool }),
        [ready, tenant, host, chooseSchool, clearSchool],
    );
    return (
        <Ctx.Provider value={value}>
            <ThemeProvider brand={tenant?.branding}>{children}</ThemeProvider>
        </Ctx.Provider>
    );
}

export function useTenant(): TenantState {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error("useTenant outside TenantProvider");
    return ctx;
}
