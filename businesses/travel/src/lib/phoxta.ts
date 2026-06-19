// Phoxta backend client for the Travel storefront (multi-vertical booking).
// One deployment serves every travel buyer: it resolves the tenant from the
// request host via app_resolve_domain (or a baked VITE_ORG_ID). Every listing
// (stay / car / experience / flight) is a `products` row tagged by
// metadata.vertical; bookings go through the reservations backend
// (app_resource_availability + app_request_reservation). See businesses/CONTRACT.md.
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
export type Hours = { day: string; open?: string; close?: string; closed?: boolean };
export type BusinessProfile = {
  address?: string; phone?: string; email?: string; mapQuery?: string; hours?: Hours[];
};
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
  metadata: Record<string, any> | null;
};

/** Active listings for this tenant across all verticals. */
export async function fetchProducts(orgId: string): Promise<DBProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, description, price_cents, currency, status, image_url, metadata")
    .eq("organization_id", orgId)
    .eq("status", "active")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as DBProduct[] | null) ?? [];
}

export type AvailDay = { day: string; units_total: number; units_booked: number; available: number };

export async function fetchAvailability(productId: string, from: string, to: string): Promise<AvailDay[]> {
  try {
    const { data, error } = await supabase.rpc("app_resource_availability", { p_product: productId, p_from: from, p_to: to });
    if (error) return [];
    return (data as AvailDay[] | null) ?? [];
  } catch {
    return [];
  }
}

/** Request a booking for [start, end). Prices + checks availability server-side;
 *  writes a 'pending' reservation that shows in the operating console. */
export async function requestReservation(
  orgId: string,
  productId: string,
  customerName: string,
  customerEmail: string,
  start: string,
  end: string,
  units = 1,
): Promise<string | null> {
  const { data, error } = await supabase.rpc("app_request_reservation", {
    p_org: orgId,
    p_product: productId,
    p_customer_name: customerName,
    p_customer_email: customerEmail,
    p_start: start,
    p_end: end,
    p_units: units,
  });
  if (error) throw new Error(error.message);
  return (data as string | null) ?? null;
}

// ---- Content (reviews, blog, cms, contact) ----
export type DBReview = { id: string; author_name: string; rating: number; title: string; body: string; created_at: string };
export type DBBlog = { id: string; slug: string; title: string; excerpt: string; body: string; cover_url: string | null; author: string; published_at: string };

export async function fetchReviewsRaw(orgId: string): Promise<DBReview[]> {
  const { data } = await supabase.from("reviews").select("id, author_name, rating, title, body, created_at").eq("organization_id", orgId).eq("status", "published").order("created_at", { ascending: false });
  return (data as DBReview[] | null) ?? [];
}
export async function fetchBlogRaw(orgId: string): Promise<DBBlog[]> {
  const { data } = await supabase.from("blog_posts").select("*").eq("organization_id", orgId).eq("status", "published").order("published_at", { ascending: false });
  return (data as DBBlog[] | null) ?? [];
}
export async function fetchCms(orgId: string, slug: string): Promise<{ title: string; body: string } | null> {
  const { data } = await supabase.from("cms_pages").select("title, body").eq("organization_id", orgId).eq("slug", slug).eq("status", "published").limit(1);
  return ((data as Array<{ title: string; body: string }> | null) ?? [])[0] ?? null;
}
export async function submitContact(orgId: string, name: string, email: string, subject: string, message: string): Promise<boolean> {
  const { error } = await supabase.rpc("app_submit_contact", { p_org: orgId, p_name: name, p_email: email, p_subject: subject, p_message: message });
  return !error;
}

/** Submit a review (lands as pending for owner approval). Tagged to a listing when given. */
export async function submitReview(
  orgId: string,
  r: { author: string; rating: number; title?: string; body: string; listingRef?: string | null },
): Promise<boolean> {
  const { error } = await supabase.rpc("app_submit_review", {
    p_org: orgId,
    p_subject_type: r.listingRef ? "listing" : "business",
    p_subject_ref: r.listingRef ?? "",
    p_author: r.author,
    p_rating: r.rating,
    p_title: r.title ?? "",
    p_body: r.body,
  });
  return !error;
}

// ---- Booking lookup (guest, ref + email both must match) ----
export type ReservationLookup = {
  found: boolean; status: string; product: string;
  start_date: string; end_date: string; units: number;
  total_cents: number; currency: string; customer_name: string;
};

/** Look up a booking privately: the reference (reservation id) AND the email must match. */
export async function lookupReservation(orgId: string, ref: string, email: string): Promise<ReservationLookup | null> {
  const { data, error } = await supabase.rpc("app_lookup_reservation", { p_org: orgId, p_ref: ref, p_email: email });
  if (error || !data) return null;
  return data as ReservationLookup;
}
