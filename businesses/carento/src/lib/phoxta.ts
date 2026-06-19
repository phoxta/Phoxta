// Phoxta backend client for the Carento storefront (car-rental booking vertical).
// One deployment serves EVERY carento buyer: it resolves which tenant it serves
// from the request hostname via app_resolve_domain (or a baked VITE_ORG_ID). The
// fleet lives in `products` (price_cents = daily rate, stock = units) and bookings
// go through the reservations backend (app_resource_availability +
// app_request_reservation). RLS + public policies keep every query scoped to one
// org. See businesses/CONTRACT.md.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";
const BAKED_ORG_ID = import.meta.env.VITE_ORG_ID as string | undefined;

export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const supabase: SupabaseClient = createClient(SUPABASE_URL || "http://localhost", SUPABASE_ANON_KEY || "anon");

export type Branding = {
  logo_url?: string; name?: string; tagline?: string;
  colors?: { primary?: string; accent?: string; bg?: string; text?: string };
  fonts?: { heading?: string; body?: string };
  radius?: string;
};
export type Hours = { day: string; open: string; close: string; closed: boolean };
export type BusinessProfile = { address?: string; phone?: string; email?: string; mapQuery?: string; hours?: Hours[] };
export type Tenant = { id: string; name: string | null; branding?: Branding | null; profile?: BusinessProfile | null };

/** Theme the storefront from the tenant's saved brand: CSS variables + a small
 *  override sheet (primary/accent colour, fonts, radius) + Google Fonts + title.
 *  No-ops during SSR. The dashboard Brand editor / AI rebrand writes the brand. */
export function applyBranding(brand?: Branding | null): void {
  if (!brand || typeof document === "undefined") return;
  const c = brand.colors ?? {};
  const f = brand.fonts ?? {};
  const root = document.documentElement;
  const set = (k: string, v?: string) => { if (v) root.style.setProperty(k, v); };
  set("--brand-primary", c.primary); set("--brand-accent", c.accent);
  set("--brand-bg", c.bg); set("--brand-text", c.text); set("--brand-radius", brand.radius);
  set("--brand-font-heading", f.heading ? `'${f.heading}'` : undefined);
  set("--brand-font-body", f.body ? `'${f.body}'` : undefined);

  const fams = [f.heading, f.body].filter(Boolean) as string[];
  if (fams.length) {
    let link = document.getElementById("brand-fonts") as HTMLLinkElement | null;
    if (!link) { link = document.createElement("link"); link.id = "brand-fonts"; link.rel = "stylesheet"; document.head.appendChild(link); }
    link.href = `https://fonts.googleapis.com/css2?${fams.map((x) => `family=${encodeURIComponent(x)}:wght@400;500;600;700`).join("&")}&display=swap`;
  }

  let style = document.getElementById("brand-overrides") as HTMLStyleElement | null;
  if (!style) { style = document.createElement("style"); style.id = "brand-overrides"; document.head.appendChild(style); }
  const p = c.primary, a = c.accent, r = brand.radius;
  style.textContent = [
    f.body ? `body{font-family:var(--brand-font-body),sans-serif !important;}` : "",
    f.heading ? `h1,h2,h3,h4,h5,h6,.display-1,.display-2,.display-3,.display-4{font-family:var(--brand-font-heading),sans-serif !important;}` : "",
    p ? `.btn-dark,.at-btn,.btn-primary,.bg-dark,.bg-primary{background-color:${p} !important;border-color:${p} !important;}` : "",
    a ? `a:hover,.text-primary,.text-accent{color:${a} !important;}` : "",
    r ? `.btn,.at-btn,.btn-dark,.btn-primary,.rounded-pill{border-radius:${r} !important;}` : "",
  ].join("");

  if (brand.name) document.title = brand.name;
}

/** Resolve the tenant (org id + name) for this storefront: baked ORG_ID, else by host. */
export async function resolveTenant(host?: string): Promise<Tenant | null> {
  if (BAKED_ORG_ID) return { id: BAKED_ORG_ID, name: null };
  if (!isConfigured) return null;
  const h = host ?? (typeof location !== "undefined" ? location.host : "");
  if (!h) return null;
  try {
    const { data } = await supabase.rpc("app_resolve_domain", { p_host: h });
    const row = (data as Array<{ organization_id: string; name: string; branding?: Branding; profile?: BusinessProfile }> | null)?.[0];
    if (!row) return null;
    applyBranding(row.branding ?? null);
    return { id: row.organization_id, name: row.name ?? null, branding: row.branding ?? null, profile: row.profile ?? null };
  } catch {
    return null;
  }
}

export type DBProduct = {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  currency: string;
  status: string;
  image_url: string | null;
  metadata: Record<string, unknown> | null;
};

// Rental extras (insurance/GPS/seats…) — owner-defined per vehicle via the console
// product editor's option groups (products.metadata.modifiers). Price is PER DAY.
export type ExtraOption = { label: string; price: number }; // price in CENTS
export type ExtraGroup = { name: string; options: ExtraOption[] };

function parseExtras(v: unknown): ExtraGroup[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const groups = v.map((g) => {
    const gg = (g ?? {}) as Record<string, unknown>;
    const options = (Array.isArray(gg.options) ? gg.options : []).map((o) => {
      const oo = (o ?? {}) as Record<string, unknown>;
      return { label: String(oo.label ?? "").trim(), price: Number(oo.price) || 0 };
    }).filter((o) => o.label);
    return { name: String(gg.name ?? "").trim(), options };
  }).filter((g) => g.name && g.options.length);
  return groups.length ? groups : undefined;
}

/** The car shape the carento UI/filters expect (mirrors src/util/cars.json). */
export type Car = {
  id: string;
  name: string;
  price: number;
  duration: string;
  carType: string;
  amenities: string;
  rating: number;
  fuelType: string;
  location: string;
  image: string;
  extras?: ExtraGroup[];
};

export function mapCar(r: DBProduct): Car {
  const m = (r.metadata ?? {}) as Record<string, unknown>;
  return {
    id: r.id,
    name: r.name,
    price: Math.round((r.price_cents ?? 0) / 100),
    duration: (m.duration as string) ?? "7",
    carType: (m.carType as string) ?? "",
    amenities: (m.amenities as string) ?? "",
    rating: parseFloat((m.rating as string) ?? "4.5") || 4.5,
    fuelType: (m.fuelType as string) ?? "",
    location: (m.location as string) ?? "",
    image: (m.image as string) || "car-1.png",
    extras: parseExtras(m.modifiers),
  };
}

/** Active fleet for this tenant (RLS + public-read policy enforce scope). */
export async function fetchFleet(orgId: string): Promise<Car[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, description, price_cents, currency, status, image_url, metadata")
    .eq("organization_id", orgId)
    .eq("status", "active")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data as DBProduct[] | null) ?? []).map(mapCar);
}

export type AvailDay = { day: string; units_total: number; units_booked: number; available: number };

/** Per-day availability for a vehicle over a window (anon-safe aggregate). */
export async function fetchAvailability(productId: string, from: string, to: string): Promise<AvailDay[]> {
  try {
    const { data, error } = await supabase.rpc("app_resource_availability", { p_product: productId, p_from: from, p_to: to });
    if (error) return [];
    return (data as AvailDay[] | null) ?? [];
  } catch {
    return [];
  }
}

/** Request a rental for [start, end). Prices + checks availability server-side;
 *  writes a 'pending' reservation that shows in the operating console. */
export async function requestReservation(
  orgId: string,
  productId: string,
  customerName: string,
  customerEmail: string,
  start: string,
  end: string,
  units = 1,
  opts?: { extras?: { group: string; label: string }[]; driver?: Record<string, string>; notes?: string },
): Promise<string | null> {
  const { data, error } = await supabase.rpc("app_request_reservation", {
    p_org: orgId,
    p_product: productId,
    p_customer_name: customerName,
    p_customer_email: customerEmail,
    p_start: start,
    p_end: end,
    p_units: units,
    p_extras: opts?.extras ?? [],
    p_driver: opts?.driver ?? {},
    p_notes: opts?.notes ?? "",
  });
  if (error) throw new Error(error.message);
  return (data as string | null) ?? null;
}

// ---- Content (reviews, faqs, blog, pricing, partners, cms, contact) ----
export type Review = { id: string; author_name: string; author_avatar: string | null; rating: number; title: string; body: string; subject_type: string; subject_ref: string | null; created_at: string };
export type Faq = { id: string; question: string; body: string; category: string; sort: number };
export type BlogPost = { id: string; slug: string; title: string; excerpt: string; body: string; cover_url: string | null; author: string; published_at: string };
export type Plan = { id: string; name: string; price_cents: number; interval: string; features: string[]; highlighted: boolean };
export type Partner = { id: string; name: string; role: string; location: string; rating: number; image_url: string | null; handle: string | null };

export async function fetchReviews(orgId: string, subjectType?: string, subjectRef?: string): Promise<Review[]> {
  let qy = supabase.from("reviews").select("*").eq("organization_id", orgId).eq("status", "published").order("created_at", { ascending: false });
  if (subjectType) qy = qy.eq("subject_type", subjectType);
  if (subjectRef) qy = qy.eq("subject_ref", subjectRef);
  const { data } = await qy;
  return (data as Review[] | null) ?? [];
}
export async function submitReview(orgId: string, r: { author: string; rating: number; title: string; body: string }): Promise<boolean> {
  const { error } = await supabase.rpc("app_submit_review", { p_org: orgId, p_subject_type: "business", p_subject_ref: "", p_author: r.author, p_rating: r.rating, p_title: r.title, p_body: r.body });
  return !error;
}
export type ReservationLookup = { found: boolean; status: string; product: string; start_date: string; end_date: string; units: number; total_cents: number; currency: string; customer_name: string };
export async function lookupReservation(orgId: string, ref: string, email: string): Promise<ReservationLookup | null> {
  const { data } = await supabase.rpc("app_lookup_reservation", { p_org: orgId, p_ref: ref, p_email: email });
  return (data as ReservationLookup | null) ?? null;
}
export async function fetchFaqs(orgId: string): Promise<Faq[]> {
  const { data } = await supabase.from("faqs").select("*").eq("organization_id", orgId).eq("active", true).order("sort");
  return (data as Faq[] | null) ?? [];
}
export async function fetchBlog(orgId: string): Promise<BlogPost[]> {
  const { data } = await supabase.from("blog_posts").select("*").eq("organization_id", orgId).eq("status", "published").order("published_at", { ascending: false });
  return (data as BlogPost[] | null) ?? [];
}
export async function fetchBlogPost(orgId: string, slug: string): Promise<BlogPost | null> {
  const { data } = await supabase.from("blog_posts").select("*").eq("organization_id", orgId).eq("slug", slug).limit(1);
  return ((data as BlogPost[] | null) ?? [])[0] ?? null;
}
export async function fetchPricing(orgId: string): Promise<Plan[]> {
  const { data } = await supabase.from("pricing_plans").select("*").eq("organization_id", orgId).eq("active", true).order("sort");
  return (data as Plan[] | null) ?? [];
}
export async function fetchPartners(orgId: string): Promise<Partner[]> {
  const { data } = await supabase.from("partners").select("*").eq("organization_id", orgId).eq("active", true).order("sort");
  return (data as Partner[] | null) ?? [];
}
export async function fetchCms(orgId: string, slug: string): Promise<{ title: string; body: string } | null> {
  const { data } = await supabase.from("cms_pages").select("title, body").eq("organization_id", orgId).eq("slug", slug).eq("status", "published").limit(1);
  return ((data as Array<{ title: string; body: string }> | null) ?? [])[0] ?? null;
}
export async function submitContact(orgId: string, name: string, email: string, subject: string, message: string): Promise<boolean> {
  const { error } = await supabase.rpc("app_submit_contact", { p_org: orgId, p_name: name, p_email: email, p_subject: subject, p_message: message });
  return !error;
}
