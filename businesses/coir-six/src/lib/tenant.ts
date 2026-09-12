import { resolveTenant as resolve, type Branding, type Tenant } from "@coir-six/core";
import { isConfigured, supabase } from "@/lib/supabase";

export type { Branding, Tenant };

/**
 * Which school is this deployment serving?
 *
 * Resolution (by host, or by a baked `VITE_ORG_ID`) lives in @coir-six/core
 * and is shared with the mobile app; this file adds the one thing only a
 * browser can do — paint the school's brand onto the document.
 */

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

/** Resolve the tenant for this deployment once per load; applies its brand. */
export async function resolveTenant(): Promise<Tenant | null> {
    if (!isConfigured) return null;
    const t = await resolve(supabase, { orgId: BAKED_ORG, host: typeof location !== "undefined" ? location.host : "" });
    if (t) applyBranding(t.branding);
    return t;
}
