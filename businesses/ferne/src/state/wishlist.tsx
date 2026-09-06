import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * Saved items.
 *
 * Keyed by product SLUG, not id: product ids are per-tenant uuids, so a wishlist
 * keyed on them would break the moment a shopper's saved item was re-seeded.
 * Browser-local by design — nothing here is worth an account round trip.
 */

const KEY = "ferne:wishlist";

type WishlistState = {
    slugs: string[];
    has: (slug: string) => boolean;
    toggle: (slug: string) => boolean;
};

const Ctx = createContext<WishlistState | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
    const [slugs, setSlugs] = useState<string[]>(() => {
        try {
            const raw = localStorage.getItem(KEY);
            const parsed = raw ? (JSON.parse(raw) as unknown) : null;
            return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(KEY, JSON.stringify(slugs));
        } catch {
            /* blocked storage just loses the list on reload */
        }
    }, [slugs]);

    const has = useCallback((slug: string) => slugs.includes(slug), [slugs]);

    /** Returns true when the item is now saved, false when it was removed, so
     *  the caller can word its toast. Decided from the rendered state rather than
     *  inside the updater, which StrictMode may run twice. */
    const toggle = useCallback(
        (slug: string) => {
            const saved = !slugs.includes(slug);
            setSlugs((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
            return saved;
        },
        [slugs],
    );

    const value = useMemo(() => ({ slugs, has, toggle }), [slugs, has, toggle]);
    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWishlist(): WishlistState {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error("useWishlist must be used inside <WishlistProvider>");
    return ctx;
}
