import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { dishes as STATIC_DISHES, type Dish, type ModGroup } from "@/data/menu";
import { resolveTenant, fetchProducts, fetchAgentKey, type DBProduct, type BusinessProfile } from "@/lib/phoxta";

// Parse owner-defined modifiers from product metadata (defensive — bad shapes ignored).
function parseModifiers(v: unknown): ModGroup[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const groups = v.map((g) => {
    const gg = (g ?? {}) as Record<string, unknown>;
    const options = (Array.isArray(gg.options) ? gg.options : []).map((o) => {
      const oo = (o ?? {}) as Record<string, unknown>;
      return { label: String(oo.label ?? "").trim(), price: Number(oo.price) || 0 };
    }).filter((o) => o.label);
    return { name: String(gg.name ?? "").trim(), required: !!gg.required, options };
  }).filter((g) => g.name && g.options.length);
  return groups.length ? groups : undefined;
}

// Live, per-tenant menu. On load it resolves which restaurant this storefront
// serves (by hostname), themes the page from that tenant's brand, and fetches its
// menu items from the Phoxta backend — the SAME products the owner manages in the
// operating console's Menu tab. Falls back to the bundled demo menu when
// unconfigured (local dev) or empty, so the site always renders.

type MenuCtx = { dishes: Dish[]; loading: boolean; orgId: string | null; live: boolean; agentKey: string | null; profile: BusinessProfile | null };
const Ctx = createContext<MenuCtx>({ dishes: STATIC_DISHES, loading: true, orgId: null, live: false, agentKey: null, profile: null });

function mapProduct(r: DBProduct): Dish {
  const m = (r.metadata ?? {}) as Record<string, unknown>;
  const arr = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);
  const cat = typeof m.category === "string" && m.category.trim() ? m.category.trim() : "Mains";
  return {
    id: r.id,
    name: r.name,
    desc: r.description ?? "",
    price: Math.round((r.price_cents ?? 0) / 100),
    category: cat,
    img: r.image_url || (m.img as string) || "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=400&fit=crop",
    tags: arr(m.tags),
    badge: typeof m.badge === "string" ? m.badge : undefined,
    popular: Boolean(m.popular),
    modifiers: parseModifiers(m.modifiers),
  };
}

export function MenuProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MenuCtx>({ dishes: STATIC_DISHES, loading: true, orgId: null, live: false, agentKey: null, profile: null });
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const tenant = await resolveTenant();
        if (!tenant) { if (active) setState({ dishes: STATIC_DISHES, loading: false, orgId: null, live: false, agentKey: null, profile: null }); return; }
        if (tenant.name && typeof document !== "undefined") document.title = tenant.name;
        const [rows, agentKey] = await Promise.all([fetchProducts(tenant.id), fetchAgentKey(tenant.id)]);
        if (!active) return;
        const live = rows.length > 0 ? rows.map(mapProduct) : STATIC_DISHES;
        setState({ dishes: live, loading: false, orgId: tenant.id, live: rows.length > 0, agentKey, profile: tenant.profile ?? null });
      } catch {
        if (active) setState({ dishes: STATIC_DISHES, loading: false, orgId: null, live: false, agentKey: null, profile: null });
      }
    })();
    return () => { active = false; };
  }, []);
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useMenu(): MenuCtx {
  return useContext(Ctx);
}
