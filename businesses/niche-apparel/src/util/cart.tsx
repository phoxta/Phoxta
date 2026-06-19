import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartItem = { id: string; title: string; brand: string; price: number; img: string; size: string; color: string; qty: number };
type CartCtx = {
    lines: CartItem[];
    count: number;
    subtotal: number;
    open: boolean;
    setOpen: (v: boolean) => void;
    add: (item: Omit<CartItem, "qty">, qty?: number) => void;
    setQty: (id: string, size: string, color: string, qty: number) => void;
    remove: (id: string, size: string, color: string) => void;
    clear: () => void;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "aurelia-cart";
const k = (id: string, size: string, color: string) => `${id}__${size}__${color}`;

export function CartProvider({ children }: { children: ReactNode }) {
    const [lines, setLines] = useState<CartItem[]>(() => {
        try {
            // Tolerate older carts saved before colour was tracked.
            return (JSON.parse(localStorage.getItem(KEY) ?? "[]") as CartItem[]).map((l) => ({ ...l, color: l.color ?? "" }));
        } catch {
            return [];
        }
    });
    const [open, setOpen] = useState(false);
    useEffect(() => { localStorage.setItem(KEY, JSON.stringify(lines)); }, [lines]);

    const add = useCallback((item: Omit<CartItem, "qty">, qty = 1) => {
        setLines((prev) => {
            const key = k(item.id, item.size, item.color);
            const f = prev.find((l) => k(l.id, l.size, l.color) === key);
            if (f) return prev.map((l) => (k(l.id, l.size, l.color) === key ? { ...l, qty: l.qty + qty } : l));
            return [...prev, { ...item, qty }];
        });
        setOpen(true);
    }, []);
    const setQty = useCallback((id: string, size: string, color: string, qty: number) => {
        setLines((prev) => prev.flatMap((l) => (k(l.id, l.size, l.color) === k(id, size, color) ? (qty <= 0 ? [] : [{ ...l, qty }]) : [l])));
    }, []);
    const remove = useCallback((id: string, size: string, color: string) => setLines((prev) => prev.filter((l) => k(l.id, l.size, l.color) !== k(id, size, color))), []);
    const clear = useCallback(() => setLines([]), []);

    const value = useMemo<CartCtx>(() => {
        const count = lines.reduce((n, l) => n + l.qty, 0);
        const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
        return { lines, count, subtotal, open, setOpen, add, setQty, remove, clear };
    }, [lines, open, add, setQty, remove, clear]);

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartCtx {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error("useCart must be used within CartProvider");
    return ctx;
}
