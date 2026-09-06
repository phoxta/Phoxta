import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
    CATEGORIES,
    CONCERNS,
    PRODUCTS as DEMO_PRODUCTS,
    type Category,
    type Product,
    type ProductSize,
} from "@/data/catalogue";
import { fetchAgentKey, fetchProducts, fetchVariants, type BusinessProfile, type DBProduct, type DBVariant } from "@/lib/phoxta";
import { resolveTenant } from "@/lib/tenant";
import { formatMoney } from "@/lib/format";

/**
 * The live, per-tenant catalogue.
 *
 * On load the storefront resolves WHICH business it is serving (by hostname) and
 * loads that org's products and size variants — the same rows the owner manages
 * in the operating console's Catalog tab. It falls back to the bundled demo
 * catalogue when the backend is unconfigured or the tenant's catalogue is empty,
 * so the shop is never blank.
 */

const CATEGORY_IDS = new Set<string>(CATEGORIES.map((c) => c.id));

const isCategory = (v: unknown): v is Category => typeof v === "string" && CATEGORY_IDS.has(v);
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

/** A size label mentioning a refill is a refill — the same rule the shop's
 *  "Refillable" filter uses, so the facet and the badge can never disagree. */
const isRefill = (label: string): boolean => /refill/i.test(label);

function toSizes(product: DBProduct, variants: DBVariant[]): ProductSize[] {
    if (variants.length) {
        return variants.map((v) => ({
            id: v.size,
            label: v.size,
            priceCents: v.price_cents ?? product.price_cents,
            stock: v.stock,
            refill: isRefill(v.size),
        }));
    }
    // No variant rows: fall back to whatever the blueprint metadata described,
    // then to a single unnamed size so an owner-created product still sells.
    const meta = product.metadata?.sizes ?? [];
    if (meta.length) {
        return meta.map((s) => {
            const label = s.label ?? s.id ?? "One size";
            return {
                id: s.id ?? label,
                label,
                priceCents: s.priceCents ?? product.price_cents,
                stock: product.stock ?? 0,
                refill: s.refill ?? isRefill(label),
            };
        });
    }
    return [
        {
            id: "",
            label: "One size",
            priceCents: product.price_cents,
            stock: product.stock ?? 0,
            refill: false,
        },
    ];
}

function mapProduct(row: DBProduct, variants: DBVariant[]): Product {
    const m = row.metadata ?? {};
    const sizes = toSizes(row, variants);
    const gallery = strings(m.gallery);
    const img = row.image_url || gallery[0] || "/images/hero.jpg";
    const stock = row.stock ?? sizes.reduce((n, s) => n + s.stock, 0);
    return {
        id: row.id,
        slug: m.slug || row.sku || row.id,
        name: row.name,
        tagline: m.tagline ?? "",
        category: isCategory(m.category) ? m.category : "face",
        concerns: strings(m.concerns),
        // The first size is the default selection, so it is also the price the
        // card advertises.
        priceCents: sizes[0]?.priceCents ?? row.price_cents,
        compareAtCents: typeof m.compareAtCents === "number" ? m.compareAtCents : null,
        rating: typeof m.rating === "number" ? m.rating : 0,
        reviewCount: typeof m.reviewCount === "number" ? m.reviewCount : 0,
        stock,
        bestseller: Boolean(m.bestseller),
        isNew: Boolean(m.isNew),
        sizes,
        img,
        gallery: gallery.length ? gallery : [img],
        description: row.description ?? "",
        ingredients: m.ingredients ?? "",
        howTo: m.howTo ?? "",
        skinType: m.skinType ?? "",
    };
}

type CatalogState = {
    products: Product[];
    loading: boolean;
    /** Null until a tenant resolves; every backend write needs it. */
    orgId: string | null;
    /** True when the products on screen came from the backend, not the bundle. */
    live: boolean;
    agentKey: string | null;
    profile: BusinessProfile | null;
    businessName: string | null;
    currency: string;
};

const INITIAL: CatalogState = {
    products: DEMO_PRODUCTS,
    loading: true,
    orgId: null,
    live: false,
    agentKey: null,
    profile: null,
    businessName: null,
    currency: "GBP",
};

const Ctx = createContext<CatalogState>(INITIAL);

export function CatalogProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<CatalogState>(INITIAL);

    useEffect(() => {
        let active = true;
        const settle = (patch: Partial<CatalogState>) => {
            if (active) setState((s) => ({ ...s, loading: false, ...patch }));
        };
        (async () => {
            try {
                const tenant = await resolveTenant();
                if (!tenant) return settle({});
                const [rows, variants, agentKey] = await Promise.all([
                    fetchProducts(tenant.id),
                    fetchVariants(tenant.id),
                    fetchAgentKey(tenant.id),
                ]);
                if (!active) return;
                const byProduct = new Map<string, DBVariant[]>();
                for (const v of variants) {
                    const list = byProduct.get(v.product_id);
                    if (list) list.push(v);
                    else byProduct.set(v.product_id, [v]);
                }
                const live = rows.length > 0;
                settle({
                    products: live ? rows.map((r) => mapProduct(r, byProduct.get(r.id) ?? [])) : DEMO_PRODUCTS,
                    live,
                    orgId: tenant.id,
                    agentKey,
                    profile: tenant.profile,
                    businessName: tenant.name,
                    // Prices are rendered from `products` rows, so the catalogue's
                    // own currency is the authority; the org setting is the fallback.
                    currency: rows[0]?.currency || tenant.currency || "GBP",
                });
            } catch {
                settle({});
            }
        })();
        return () => {
            active = false;
        };
    }, []);

    // Brand the buyer's browser tab with THEIR business name, not ours.
    useEffect(() => {
        if (state.businessName) document.title = state.businessName;
    }, [state.businessName]);

    return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useCatalog(): CatalogState {
    return useContext(Ctx);
}

/** Format an amount in this tenant's currency. */
export function useMoney(): (cents: number) => string {
    const { currency } = useCatalog();
    return useMemo(() => (cents: number) => formatMoney(cents, currency), [currency]);
}

/** Find a product by its slug, falling back to its id (live rows are addressed
 *  by slug in the URL, but an owner-created product may only have an id). */
export function useProduct(key?: string): Product | undefined {
    const { products } = useCatalog();
    if (!key) return undefined;
    return products.find((p) => p.slug === key) ?? products.find((p) => p.id === key);
}

export { CATEGORIES, CONCERNS };
