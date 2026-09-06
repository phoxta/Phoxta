import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import { STORE } from "@/config/brand";
import { useCatalog } from "@/state/catalog";
import { validatePromo } from "@/lib/phoxta";
import type { Product, ProductSize } from "@/data/catalogue";

/**
 * The bag.
 *
 * A line stores a snapshot (name, picture, unit price) so the bag renders
 * instantly from localStorage before the catalogue has loaded — and re-prices
 * itself from the live catalogue the moment it arrives, so an owner's price
 * change is never hidden behind a stale snapshot. None of it is trusted:
 * `app_place_order` re-prices every line from the tenant's own catalogue.
 */

export type CartLine = {
    productId: string;
    slug: string;
    /** Variant size label — the key `app_place_order` prices the line from. */
    size: string;
    sizeLabel: string;
    qty: number;
    name: string;
    tagline: string;
    img: string;
    unitPriceCents: number;
    /** Stock for this size at the time it was added; refreshed with the catalogue. */
    stock: number;
};

export type AppliedPromo = { code: string; kind: "percent" | "fixed"; value: number };

type CartState = {
    lines: CartLine[];
    count: number;
    subtotalCents: number;
    discountCents: number;
    promo: AppliedPromo | null;
    add: (product: Product, size: ProductSize, qty?: number) => void;
    setQty: (productId: string, size: string, qty: number) => void;
    remove: (productId: string, size: string) => void;
    clear: () => void;
    /** Returns a message to show the shopper; null when the code applied. */
    applyPromo: (code: string) => Promise<string | null>;
    clearPromo: () => void;
};

const KEY = "ferne:cart";
const PROMO_KEY = "ferne:promo";

const lineKey = (productId: string, size: string) => `${productId}__${size}`;

/** localStorage can throw (private mode, blocked site data) — never on boot. */
function read<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
        return fallback;
    }
}
function write(key: string, value: unknown): void {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        /* nothing to do — the bag just won't survive a reload */
    }
}

/** The discount the server will apply, computed the same way it does — integer
 *  maths, so the total the shopper sees is the total they are charged. */
export function discountFor(promo: AppliedPromo | null, subtotalCents: number): number {
    if (!promo || subtotalCents <= 0) return 0;
    if (promo.kind === "percent") {
        return Math.floor((subtotalCents * Math.min(100, Math.max(0, promo.value))) / 100);
    }
    return Math.min(subtotalCents, Math.max(0, promo.value));
}

/** Standard delivery is free above the threshold, and collection always is. */
export function shippingFor(shippingId: string, payableCents: number): number {
    const option = STORE.shipping.find((s) => s.id === shippingId) ?? STORE.shipping[0];
    if (option.priceCents === 0) return 0;
    return payableCents >= STORE.freeShippingThresholdCents ? 0 : option.priceCents;
}

const Ctx = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
    const { products, live, orgId } = useCatalog();
    const [lines, setLines] = useState<CartLine[]>(() => read<CartLine[]>(KEY, []));
    const [promo, setPromo] = useState<AppliedPromo | null>(() => read<AppliedPromo | null>(PROMO_KEY, null));

    useEffect(() => write(KEY, lines), [lines]);
    useEffect(() => write(PROMO_KEY, promo), [promo]);

    // Re-price against the live catalogue. A line whose product is gone from the
    // catalogue is dropped rather than left to fail at checkout, where the order
    // RPC would silently skip it and charge a total the shopper never agreed to.
    useEffect(() => {
        if (!live) return;
        setLines((prev) => {
            let changed = false;
            const next: CartLine[] = [];
            for (const l of prev) {
                const p = products.find((x) => x.id === l.productId) ?? products.find((x) => x.slug === l.slug);
                if (!p) {
                    changed = true;
                    continue;
                }
                const size = p.sizes.find((s) => s.id === l.size) ?? p.sizes[0];
                const fresh: CartLine = {
                    ...l,
                    productId: p.id,
                    slug: p.slug,
                    size: size.id,
                    sizeLabel: size.label,
                    name: p.name,
                    tagline: p.tagline,
                    img: p.img,
                    unitPriceCents: size.priceCents,
                    stock: size.stock,
                    qty: Math.max(1, Math.min(l.qty, Math.max(1, size.stock))),
                };
                if (JSON.stringify(fresh) !== JSON.stringify(l)) changed = true;
                next.push(fresh);
            }
            return changed ? next : prev;
        });
    }, [products, live]);

    const add = useCallback((product: Product, size: ProductSize, qty = 1) => {
        setLines((prev) => {
            const key = lineKey(product.id, size.id);
            const existing = prev.find((l) => lineKey(l.productId, l.size) === key);
            const cap = size.stock > 0 ? size.stock : qty;
            if (existing) {
                return prev.map((l) =>
                    lineKey(l.productId, l.size) === key ? { ...l, qty: Math.min(l.qty + qty, cap) } : l,
                );
            }
            return [
                ...prev,
                {
                    productId: product.id,
                    slug: product.slug,
                    size: size.id,
                    sizeLabel: size.label,
                    qty: Math.min(qty, cap),
                    name: product.name,
                    tagline: product.tagline,
                    img: product.img,
                    unitPriceCents: size.priceCents,
                    stock: size.stock,
                },
            ];
        });
    }, []);

    const setQty = useCallback((productId: string, size: string, qty: number) => {
        setLines((prev) =>
            prev.flatMap((l) =>
                lineKey(l.productId, l.size) === lineKey(productId, size)
                    ? qty <= 0
                        ? []
                        : [{ ...l, qty: l.stock > 0 ? Math.min(qty, l.stock) : qty }]
                    : [l],
            ),
        );
    }, []);

    const remove = useCallback((productId: string, size: string) => {
        setLines((prev) => prev.filter((l) => lineKey(l.productId, l.size) !== lineKey(productId, size)));
    }, []);

    const clear = useCallback(() => {
        setLines([]);
        setPromo(null);
    }, []);

    const subtotalCents = useMemo(() => lines.reduce((n, l) => n + l.unitPriceCents * l.qty, 0), [lines]);
    const count = useMemo(() => lines.reduce((n, l) => n + l.qty, 0), [lines]);
    const discountCents = useMemo(() => discountFor(promo, subtotalCents), [promo, subtotalCents]);

    const applyPromo = useCallback(
        async (raw: string): Promise<string | null> => {
            const code = raw.trim().toUpperCase();
            if (!code) {
                setPromo(null);
                return null;
            }
            if (!orgId) {
                // No tenant resolved (local dev against the bundled catalogue).
                // Say so rather than pretending a code worked — the order this
                // store would place has no discount behind it.
                return "Discount codes need a live store.";
            }
            const result = await validatePromo(orgId, code, subtotalCents);
            if (!result.valid) {
                setPromo(null);
                return result.message;
            }
            setPromo({ code: result.code, kind: result.kind, value: result.value });
            return null;
        },
        [orgId, subtotalCents],
    );

    const clearPromo = useCallback(() => setPromo(null), []);

    const value = useMemo<CartState>(
        () => ({
            lines,
            count,
            subtotalCents,
            discountCents,
            promo,
            add,
            setQty,
            remove,
            clear,
            applyPromo,
            clearPromo,
        }),
        [lines, count, subtotalCents, discountCents, promo, add, setQty, remove, clear, applyPromo, clearPromo],
    );

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartState {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
    return ctx;
}
