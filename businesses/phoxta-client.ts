// Phoxta per-business backend client (reference).
// Copy this into a storefront app in businesses/<slug>. It only needs
// `@supabase/supabase-js`. It connects to the shared Phoxta backend with the
// public anon key and resolves which tenant (organization) this deployment serves
// — either from a baked ORG_ID env or from the request hostname. RLS keeps every
// query scoped to that one organization. See CONTRACT.md for the full contract.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Works across bundlers (Vite `VITE_`, Next `NEXT_PUBLIC_`, or plain process.env).
function env(...keys: string[]): string | undefined {
    // deno-lint-ignore no-explicit-any
    const im = (typeof import.meta !== "undefined" && (import.meta as any).env) || {};
    const pe = (typeof process !== "undefined" && process.env) || {};
    for (const k of keys) {
        if (im[k]) return im[k] as string;
        if (pe[k]) return pe[k] as string;
    }
    return undefined;
}

const SUPABASE_URL = env("VITE_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = env("VITE_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY") ?? "";
const BAKED_ORG_ID = env("VITE_ORG_ID", "NEXT_PUBLIC_ORG_ID", "ORG_ID");

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/** Resolve the tenant for this storefront: baked ORG_ID, else by hostname. */
export async function resolveOrgId(host?: string): Promise<string | null> {
    if (BAKED_ORG_ID) return BAKED_ORG_ID;
    const h = host ?? (typeof location !== "undefined" ? location.host : "");
    if (!h) return null;
    const { data } = await supabase.rpc("app_resolve_domain", { p_host: h });
    return (data as Array<{ organization_id: string }> | null)?.[0]?.organization_id ?? null;
}

/** Published content for this tenant (RLS enforces org isolation). */
export async function getPages(orgId: string) {
    return supabase
        .from("cms_pages")
        .select("slug, title, body, status")
        .eq("organization_id", orgId)
        .eq("status", "published");
}

/** Catalog for this tenant. */
export async function getProducts(orgId: string) {
    return supabase
        .from("products")
        .select("id, name, description, price_cents, currency, status")
        .eq("organization_id", orgId)
        .eq("status", "active");
}
