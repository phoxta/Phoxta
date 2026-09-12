import { createContext, useContext, useMemo, type ReactNode } from "react";
import { tokens, type Branding, type Hue } from "@coir-six/core";

/**
 * The design system on a phone. `tokens` are the same values as the web app's
 * Tailwind theme; a school's saved brand overrides the brand colour and the
 * tints mixed from it, exactly as `applyBranding` does in the browser.
 */

export type Colors = { -readonly [K in keyof typeof tokens.colors]: string };
export type Theme = { c: Colors; r: typeof tokens.radius };

/** Mix `hex` towards white (t in 0..1). Good enough for the brand tints; no colour library needed. */
function mixWhite(hex: string, t: number): string {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
    if (!m) return hex;
    const ch = (h: string) => Math.round(parseInt(h, 16) + (255 - parseInt(h, 16)) * t);
    return `#${[ch(m[1]), ch(m[2]), ch(m[3])].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}
function mixBlack(hex: string, t: number): string {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
    if (!m) return hex;
    const ch = (h: string) => Math.round(parseInt(h, 16) * (1 - t));
    return `#${[ch(m[1]), ch(m[2]), ch(m[3])].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

export function themeFor(brand: Branding | null | undefined): Theme {
    const c: Colors = { ...tokens.colors };
    const primary = brand?.colors?.primary;
    if (primary && /^#[0-9a-f]{6}$/i.test(primary)) {
        c.brand = primary;
        c.brandHover = mixBlack(primary, 0.14);
        c.brandInk = mixBlack(primary, 0.12);
        c.brandSoft = mixWhite(primary, 0.88);
        c.brandGlow = mixWhite(primary, 0.3);
        c.track = mixWhite(primary, 0.78);
        c.ux = primary;
        c.uxSoft = c.brandSoft;
        c.uxInk = c.brandInk;
    }
    if (brand?.colors?.bg) c.page = brand.colors.bg;
    if (brand?.colors?.text) c.ink = brand.colors.text;
    return { c, r: tokens.radius };
}

const DEFAULT = themeFor(null);
const Ctx = createContext<Theme>(DEFAULT);

export function ThemeProvider({ brand, children }: { brand: Branding | null | undefined; children: ReactNode }) {
    const value = useMemo(() => themeFor(brand), [brand]);
    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useTheme = (): Theme => useContext(Ctx);

/** Avatar tints: soft background + readable ink, per hue. */
export function hueColors(c: Colors, hue: Hue): { bg: string; fg: string } {
    switch (hue) {
        case "sky":
            return { bg: c.feSoft, fg: c.feInk };
        case "peach":
            return { bg: c.peachSoft, fg: c.peach };
        case "rose":
            return { bg: c.brSoft, fg: c.brInk };
        case "mint":
            return { bg: c.mintSoft, fg: c.mint };
        case "plum":
            return { bg: c.plumSoft, fg: c.plum };
        default:
            return { bg: c.brandSoft, fg: c.brandInk };
    }
}

/** Category colours: strong / soft / ink-on-soft. */
export function categoryColors(c: Colors, id: "fe" | "ux" | "br"): { strong: string; soft: string; ink: string } {
    if (id === "fe") return { strong: c.fe, soft: c.feSoft, ink: c.feInk };
    if (id === "br") return { strong: c.br, soft: c.brSoft, ink: c.brInk };
    return { strong: c.ux, soft: c.uxSoft, ink: c.uxInk };
}

/** Font family per weight — custom fonts on Android don't respond to fontWeight. */
export const font = {
    regular: "PlusJakartaSans_400Regular",
    medium: "PlusJakartaSans_500Medium",
    semibold: "PlusJakartaSans_600SemiBold",
    bold: "PlusJakartaSans_700Bold",
} as const;
