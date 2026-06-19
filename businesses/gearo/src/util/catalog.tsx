import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { products as STATIC_PRODUCTS, type Product } from "@/util/products";
import { resolveTenant, fetchProducts, fetchAgentKey, type DBProduct, type BusinessProfile } from "@/lib/phoxta";

// Live, per-tenant catalogue. On load it resolves which store this storefront
// serves (by hostname), themes the page from that tenant's brand, and fetches its
// products from the Phoxta backend — the SAME products the owner manages in the
// operating console's Catalog tab. Falls back to the bundled demo catalogue when
// unconfigured (local dev) or empty, so the store always renders.
//
// The template keys products by a numeric id (routing/cart); live products keep a
// stable index-based id plus the real DB UUID in `dbId`, used at checkout.

type CatalogCtx = { products: Product[]; loading: boolean; orgId: string | null; live: boolean; agentKey: string | null; profile: BusinessProfile | null };
const Ctx = createContext<CatalogCtx>({ products: STATIC_PRODUCTS, loading: true, orgId: null, live: false, agentKey: null, profile: null });

function mapProduct(r: DBProduct, i: number): Product {
  const m = (r.metadata ?? {}) as Record<string, unknown>;
  const colors = Array.isArray(m.colors) ? (m.colors as { name: string; cls: string; img?: string }[]) : [{ name: "Default", cls: "bg-light-grey" }];
  const img = r.image_url || (m.img as string) || "/images/shop/product-1.jpg";
  return {
    id: i + 1, // stable while catalogue order is stable (ordered by created_at)
    dbId: r.id,
    title: r.name,
    price: Math.round((r.price_cents ?? 0)) / 100,
    oldPrice: typeof m.oldPrice === "number" ? (m.oldPrice as number) : undefined,
    sale: typeof m.sale === "string" ? (m.sale as string) : undefined,
    img,
    imgHover: (m.imgHover as string) || img,
    colors,
    category: (m.category as string) || "All",
  };
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CatalogCtx>({ products: STATIC_PRODUCTS, loading: true, orgId: null, live: false, agentKey: null, profile: null });
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const tenant = await resolveTenant();
        if (!tenant) { if (active) setState({ products: STATIC_PRODUCTS, loading: false, orgId: null, live: false, agentKey: null, profile: null }); return; }
        if (tenant.name && typeof document !== "undefined") document.title = tenant.name;
        const [rows, agentKey] = await Promise.all([fetchProducts(tenant.id), fetchAgentKey(tenant.id)]);
        if (!active) return;
        const live = rows.length > 0 ? rows.map(mapProduct) : STATIC_PRODUCTS;
        setState({ products: live, loading: false, orgId: tenant.id, live: rows.length > 0, agentKey, profile: tenant.profile ?? null });
      } catch {
        if (active) setState({ products: STATIC_PRODUCTS, loading: false, orgId: null, live: false, agentKey: null, profile: null });
      }
    })();
    return () => { active = false; };
  }, []);
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useCatalog(): CatalogCtx {
  return useContext(Ctx);
}
