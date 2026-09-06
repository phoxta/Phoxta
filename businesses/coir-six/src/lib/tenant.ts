import { isConfigured, supabase } from "@/lib/supabase";

/**
 * Which school is this?
 *
 * ONE deployment serves EVERY buyer of the Coir Six blueprint. On boot the app
 * resolves the tenant (organization) from the request hostname through the
 * public `app_resolve_domain` RPC — or from a baked `VITE_ORG_ID` for a
 * single-tenant deploy — and every query after that is scoped to it. See
 * `businesses/CONTRACT.md`.
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

const BAKED_ORG = (import.meta.env.VITE_ORG_ID as string | undefined) || undefined;

/**
 * Theme the app from the tenant's saved brand.
 *
 * The design system is a set of Tailwind theme tokens, i.e. CSS custom
 * properties on :root, so a rebrand is a handful of variable writes. The brand
 * colour drives buttons, the active nav item, rings and the login panel; the
 * tints that sit under it are mixed from it so a single colour stays coherent.
 */
export function applyBranding(brand: Branding | null | undefined): void {
    if (!brand || typeof document === "undefined") return;
    const root = document.documentElement;
    const set = (k: string, v?: string) => {
        if (v) root.style.setProperty(k, v);
    };
    const primary = brand.colors?.primary;
    if (primary) {
        set("--color-brand", primary);
        set("--color-brand-hover", `color-mix(in srgb, ${primary} 86%, black)`);
        set("--color-brand-ink", `color-mix(in srgb, ${primary} 88%, black)`);
        set("--color-brand-soft", `color-mix(in srgb, ${primary} 12%, white)`);
        set("--color-brand-glow", `color-mix(in srgb, ${primary} 70%, white)`);
        set("--color-track", `color-mix(in srgb, ${primary} 22%, white)`);
    }
    set("--color-page", brand.colors?.bg);
    set("--color-ink", brand.colors?.text);

    const body = brand.fonts?.body || brand.fonts?.heading;
    if (body) {
        let link = document.getElementById("brand-fonts") as HTMLLinkElement | null;
        if (!link) {
            link = document.createElement("link");
            link.id = "brand-fonts";
            link.rel = "stylesheet";
            document.head.appendChild(link);
        }
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(body)}:wght@400;500;600;700&display=swap`;
        set("--font-sans", `'${body}', system-ui, sans-serif`);
    }
}

async function byHost(host: string): Promise<Tenant | null> {
    const { data } = await supabase.rpc("app_resolve_domain", { p_host: host });
    const row = (data as Array<{ organization_id: string; name: string | null; branding?: Branding | null }> | null)?.[0];
    if (!row) return null;
    return { id: row.organization_id, name: row.name ?? null, branding: row.branding ?? null };
}

async function byId(id: string): Promise<Tenant> {
    try {
        const { data } = await supabase.from("organizations").select("id, name, branding").eq("id", id).maybeSingle();
        const row = data as { id: string; name: string | null; branding: Branding | null } | null;
        if (row) return { id: row.id, name: row.name, branding: row.branding };
    } catch {
        /* fall through: the id still scopes every query */
    }
    return { id, name: null, branding: null };
}

/** Resolve the tenant for this deployment once per load; applies its brand. */
export async function resolveTenant(): Promise<Tenant | null> {
    if (!isConfigured) return null;
    try {
        const t = BAKED_ORG ? await byId(BAKED_ORG) : await byHost(typeof location !== "undefined" ? location.host : "");
        if (t) applyBranding(t.branding);
        return t;
    } catch {
        return null;
    }
}
