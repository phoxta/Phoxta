import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type WishCtx = { ids: number[]; has: (id: number) => boolean; toggle: (id: number) => void; count: number };
const Ctx = createContext<WishCtx | null>(null);
const KEY = "gearo-wishlist";

export function WishlistProvider({ children }: { children: ReactNode }) {
    const [ids, setIds] = useState<number[]>(() => {
        try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
    });
    useEffect(() => { localStorage.setItem(KEY, JSON.stringify(ids)); }, [ids]);

    const toggle = useCallback((id: number) => {
        setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    }, []);
    const value = useMemo<WishCtx>(() => ({ ids, has: (id) => ids.includes(id), toggle, count: ids.length }), [ids, toggle]);
    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWishlist(): WishCtx {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
    return ctx;
}
