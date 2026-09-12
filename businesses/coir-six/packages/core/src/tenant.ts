import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Which school is this?
 *
 * ONE deployment (and one app build) serves EVERY buyer of the Coir Six
 * blueprint. On boot the app resolves the tenant (organization) — from the
 * request hostname on the web through the public `app_resolve_domain` RPC,
 * from a baked org id for a single-tenant build, or from a school the learner
 * picked on a phone — and every query after that is scoped to it.
 *
 * No tenant (an unlinked host, or no backend at all) is not an error: the app
 * runs the bundled demo, so a visitor never meets a blank screen.
 */

export interface Branding {
    logo_url?: string;
    name?: string;
    tagline?: string;
    colors?: { primary?: string; accent?: string; bg?: string; text?: string };
    fonts?: { heading?: string; body?: string };
    radius?: string;
}

export interface Tenant {
    id: string;
    name: string | null;
    branding: Branding | null;
}

export const DEFAULT_SCHOOL_NAME = "Coir Six";

/** What the wordmark shows: the brand's name, else the organisation's, else the blueprint's. */
export const schoolName = (t: Tenant | null | undefined): string => t?.branding?.name || t?.name || DEFAULT_SCHOOL_NAME;

export async function tenantByHost(client: SupabaseClient, host: string): Promise<Tenant | null> {
    if (!host) return null;
    const { data } = await client.rpc("app_resolve_domain", { p_host: host });
    const row = (data as Array<{ organization_id: string; name: string | null; branding?: Branding | null }> | null)?.[0];
    if (!row) return null;
    return { id: row.organization_id, name: row.name ?? null, branding: row.branding ?? null };
}

export async function tenantById(client: SupabaseClient, id: string): Promise<Tenant> {
    try {
        const { data } = await client.from("organizations").select("id, name, branding").eq("id", id).maybeSingle();
        const row = data as { id: string; name: string | null; branding: Branding | null } | null;
        if (row) return { id: row.id, name: row.name, branding: row.branding };
    } catch {
        /* fall through: the id still scopes every query */
    }
    return { id, name: null, branding: null };
}

/** Resolve once per boot. A baked org id wins; otherwise the host. Never throws. */
export async function resolveTenant(client: SupabaseClient, opts: { orgId?: string; host?: string }): Promise<Tenant | null> {
    try {
        if (opts.orgId) return await tenantById(client, opts.orgId);
        return await tenantByHost(client, opts.host ?? "");
    } catch {
        return null;
    }
}
