import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Product } from "@/util/products";

export type CartLine = { product: Product; qty: number };
type CartCtx = {
    lines: CartLine[];
    count: number;
    subtotal: number;
    add: (p: Product, qty?: number) => void;
    setQty: (id: number, qty: number) => void;
    remove: (id: number) => void;
    clear: () => void;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "gearo-cart";

export function CartProvider({ children }: { children: ReactNode }) {
    const [lines, setLines] = useState<CartLine[]>(() => {
        try {
            return JSON.parse(localStorage.getItem(KEY) ?? "[]");
        } catch {
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem(KEY, JSON.stringify(lines));
    }, [lines]);

    const add = useCallback((p: Product, qty = 1) => {
        setLines((prev) => {
            const found = prev.find((l) => l.product.id === p.id);
            if (found) return prev.map((l) => (l.product.id === p.id ? { ...l, qty: l.qty + qty } : l));
            return [...prev, { product: p, qty }];
        });
    }, []);
    const setQty = useCallback((id: number, qty: number) => {
        setLines((prev) => prev.map((l) => (l.product.id === id ? { ...l, qty: Math.max(1, qty) } : l)));
    }, []);
    const remove = useCallback((id: number) => setLines((prev) => prev.filter((l) => l.product.id !== id)), []);
    const clear = useCallback(() => setLines([]), []);

    const value = useMemo<CartCtx>(() => {
        const count = lines.reduce((n, l) => n + l.qty, 0);
        const subtotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
        return { lines, count, subtotal, add, setQty, remove, clear };
    }, [lines, add, setQty, remove, clear]);

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartCtx {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error("useCart must be used within CartProvider");
    return ctx;
}
