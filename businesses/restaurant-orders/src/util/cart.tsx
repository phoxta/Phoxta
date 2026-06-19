import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Dish } from "@/data/menu";

export type SelOption = { group: string; label: string; price: number }; // price in CENTS
export type OrderLine = { lineId: string; dish: Dish; qty: number; options: SelOption[]; note: string; unitPrice: number }; // unitPrice in dollars
type CartCtx = {
    lines: OrderLine[];
    count: number;
    subtotal: number;
    open: boolean;
    setOpen: (v: boolean) => void;
    add: (d: Dish, opts?: { qty?: number; options?: SelOption[]; note?: string }) => void;
    setQty: (lineId: string, qty: number) => void;
    remove: (lineId: string) => void;
    clear: () => void;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "saveur-cart";

const lineKey = (dishId: string, options: SelOption[], note: string) =>
    `${dishId}|${options.map((o) => `${o.group}:${o.label}`).join(",")}|${note.trim()}`;

export function CartProvider({ children }: { children: ReactNode }) {
    const [lines, setLines] = useState<OrderLine[]>(() => {
        try {
            const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]") as Partial<OrderLine>[];
            return raw
                .map((l) => {
                    const dish = l.dish as Dish | undefined;
                    if (!dish) return null;
                    const options = l.options ?? [];
                    const note = l.note ?? "";
                    const unitPrice = l.unitPrice ?? dish.price + options.reduce((s, o) => s + o.price / 100, 0);
                    return { lineId: l.lineId ?? lineKey(dish.id, options, note), dish, qty: l.qty ?? 1, options, note, unitPrice };
                })
                .filter((x): x is OrderLine => x != null);
        } catch {
            return [];
        }
    });
    const [open, setOpen] = useState(false);
    useEffect(() => { localStorage.setItem(KEY, JSON.stringify(lines)); }, [lines]);

    const add = useCallback((d: Dish, opts?: { qty?: number; options?: SelOption[]; note?: string }) => {
        const options = opts?.options ?? [];
        const note = opts?.note ?? "";
        const qty = opts?.qty ?? 1;
        const unitPrice = d.price + options.reduce((s, o) => s + o.price / 100, 0);
        const lineId = lineKey(d.id, options, note);
        setLines((prev) => {
            const f = prev.find((l) => l.lineId === lineId);
            if (f) return prev.map((l) => (l.lineId === lineId ? { ...l, qty: l.qty + qty } : l));
            return [...prev, { lineId, dish: d, qty, options, note, unitPrice }];
        });
        setOpen(true);
    }, []);
    const setQty = useCallback((lineId: string, qty: number) => {
        setLines((prev) => prev.flatMap((l) => (l.lineId === lineId ? (qty <= 0 ? [] : [{ ...l, qty }]) : [l])));
    }, []);
    const remove = useCallback((lineId: string) => setLines((prev) => prev.filter((l) => l.lineId !== lineId)), []);
    const clear = useCallback(() => setLines([]), []);

    const value = useMemo<CartCtx>(() => {
        const count = lines.reduce((n, l) => n + l.qty, 0);
        const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
        return { lines, count, subtotal, open, setOpen, add, setQty, remove, clear };
    }, [lines, open, add, setQty, remove, clear]);

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartCtx {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error("useCart must be used within CartProvider");
    return ctx;
}
