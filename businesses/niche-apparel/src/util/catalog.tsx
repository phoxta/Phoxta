import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { products as STATIC_PRODUCTS, type Product } from "@/data/products";
import { resolveTenant, fetchProducts, fetchAgentKey, type DBProduct, type BusinessProfile } from "@/lib/phoxta";

// Live, per-tenant catalogue. On load it resolves which business this storefront
// serves (by hostname) and fetches that org's products from the Phoxta backend —
// the SAME products the owner manages in the operating console's Commerce tab.
// It also resolves the tenant's AI agent public_key so the in-store stylist talks
// to THAT business's agent. Falls back to the bundled demo catalogue when
// unconfigured (local dev) or empty, so the store always renders.

type CatalogCtx = { products: Product[]; loading: boolean; orgId: string | null; live: boolean; agentKey: string | null; profile: BusinessProfile | null };
const Ctx = createContext<CatalogCtx>({ products: STATIC_PRODUCTS, loading: true, orgId: null, live: false, agentKey: null, profile: null });

function mapProduct(r: DBProduct): Product {
  const m = (r.metadata ?? {}) as Record<string, unknown>;
  const arr = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);
  return {
    id: r.id,
    title: r.name,
    brand: (m.brand as string) ?? "",
    price: Math.round((r.price_cents ?? 0) / 100),
    oldPrice: typeof m.oldPrice === "number" ? (m.oldPrice as number) : undefined,
    img: r.image_url || (m.img as string) || "/assets/imgs/pages/product/product-1.webp",
    category: m.category === "man" ? "man" : "woman",
    type: (m.type as string) ?? "",
    isNew: Boolean(m.isNew),
    sale: Boolean(m.sale),
    colors: arr(m.colors).length ? arr(m.colors) : ["Black"],
    sizes: arr(m.sizes).length ? arr(m.sizes) : ["S", "M", "L"],
  };
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CatalogCtx>({ products: STATIC_PRODUCTS, loading: true, orgId: null, live: false, agentKey: null, profile: null });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const tenant = await resolveTenant();
        if (!tenant) {
          if (active) setState({ products: STATIC_PRODUCTS, loading: false, orgId: null, live: false, agentKey: null, profile: null });
          return;
        }
        const orgId = tenant.id;
        if (tenant.name) document.title = tenant.name; // brand the buyer's browser tab
        const [rows, agentKey] = await Promise.all([fetchProducts(orgId), fetchAgentKey(orgId)]);
        if (!active) return;
        const live = rows.length > 0 ? rows.map(mapProduct) : STATIC_PRODUCTS;
        setState({ products: live, loading: false, orgId, live: rows.length > 0, agentKey, profile: tenant.profile ?? null });
      } catch {
        if (active) setState({ products: STATIC_PRODUCTS, loading: false, orgId: null, live: false, agentKey: null, profile: null });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useCatalog(): CatalogCtx {
  return useContext(Ctx);
}

/** Look up one product by id (uuid for live, slug for the demo fallback). */
export function useProduct(id?: string): Product | undefined {
  const { products } = useCatalog();
  return products.find((p) => p.id === id) ?? products[0];
}
