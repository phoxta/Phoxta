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

/** Demand engine: inject the tenant's schema.org catalogue as JSON-LD.
 *  Fetches the public storefront-feed edge function for this host and appends a
 *  <script type="application/ld+json"> to <head>. Runs at most once per page
 *  load, only after a tenant resolved, and fails silently on any error. */
let schemaInjected = false;
function injectSchemaFeed(): void {
  if (schemaInjected || typeof document === "undefined" || typeof location === "undefined") return;
  schemaInjected = true;
  const host = location.host;
  if (!host) return;
  fetch(`https://ktgleoqvdikngocygdkn.supabase.co/functions/v1/storefront-feed?host=${encodeURIComponent(host)}&format=schema`)
    .then((r) => (r.ok ? r.json() : null))
    .then((json) => {
      if (!json) return;
      const s = document.createElement("script");
      s.type = "application/ld+json";
      s.text = JSON.stringify(json);
      document.head.appendChild(s);
    })
    .catch(() => {});
}

export async function resolveTenant(host?: string): Promise<Tenant | null> {
  if (BAKED_ORG_ID) {
    injectSchemaFeed();
    return { id: BAKED_ORG_ID, name: null };
  }
  if (!isConfigured) return null;
  const h = host ?? (typeof location !== "undefined" ? location.host : "");
  if (!h) return null;
  try {
    const { data } = await supabase.rpc("app_resolve_domain", { p_host: h });
    const row = (data as Array<{ organization_id: string; name: string; branding?: Branding; profile?: BusinessProfile }> | null)?.[0];
    if (!row) return null;
    applyBranding(row.branding ?? null);
    injectSchemaFeed();
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

/** Start an online payment for a just-created reservation via the Paystack
 *  storefront checkout edge function. Returns { url, accessCode, reference }
 *  (accessCode drives the inline popup; url is the hosted-page fallback), or
 *  null when payments aren't configured for this tenant / anything fails —
 *  callers keep the pay-later confirmation in that case. Never throws. */
export type ReservationPayment = { url: string; accessCode: string | null; reference: string | null };

export async function initReservationPayment(orgId: string, reservationId: string, customerEmail: string): Promise<ReservationPayment | null> {
  try {
    const origin = typeof location !== "undefined" ? location.origin : "";
    const returnUrl = `${origin}/manage-booking?ref=${encodeURIComponent(reservationId)}&email=${encodeURIComponent(customerEmail)}`;
    const { data, error } = await supabase.functions.invoke("paystack-storefront-checkout", {
      body: { orgId, kind: "reservation", id: reservationId, returnUrl },
    });
    if (error) return null;
    const body = data as { url?: string; access_code?: string; reference?: string } | null;
    const url = typeof body?.url === "string" && body.url ? body.url : null;
    if (!url) return null;
    return {
      url,
      accessCode: typeof body?.access_code === "string" && body.access_code ? body.access_code : null,
      reference: typeof body?.reference === "string" && body.reference ? body.reference : null,
    };
  } catch {
    return null;
  }
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
  metadata?: Record<string, unknown> | null;
};

/** Look up a booking privately: the reference (reservation id) AND the email must match. */
export async function lookupReservation(orgId: string, ref: string, email: string): Promise<ReservationLookup | null> {
  const { data, error } = await supabase.rpc("app_lookup_reservation", { p_org: orgId, p_ref: ref, p_email: email });
  if (error || !data) return null;
  return data as ReservationLookup;
}

/** Payment verification: the Paystack webhook flips a paid reservation to
 *  status 'confirmed' and stamps metadata.paid = true. Either signal counts. */
export function isReservationPaid(r: ReservationLookup | null): boolean {
  if (!r || !r.found) return false;
  const status = (r.status || "").toLowerCase();
  return status === "confirmed" || status === "completed" || r.metadata?.paid === true;
}


// ---------------------------------------------------------------------------
// Customer accounts
//
// A storefront customer is an ordinary Supabase auth user. Their orders and
// bookings are matched on the VERIFIED email in their JWT (migration 0077), so
// nothing here can be spoofed and no customer can read another's history.
// ---------------------------------------------------------------------------

export type CustomerOrder = {
  id: string; reference: string; status: string; fulfilment: string | null;
  total_cents: number; refunded_cents: number; currency: string;
  placed_at: string; paid_at: string | null; tracking: string | null; notes: string | null;
  items: { name: string; quantity: number; unit_price_cents: number; notes: string | null }[];
};

export type CustomerBooking = {
  kind: "appointment" | "reservation"; id: string; reference: string;
  when: string; until?: string; status: string; units?: number;
  total_cents?: number; currency?: string; notes?: string | null;
};

export type CustomerProfile = { name: string | null; email: string; phone: string | null; company: string | null };

export async function signUp(email: string, password: string, name?: string) {
  const { error } = await supabase.auth.signUp({
    email, password, options: { data: name ? { full_name: name } : undefined },
  });
  return { error: error?.message ?? null };
}
export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error?.message ?? null };
}
export async function signOut() {
  await supabase.auth.signOut();
}
export async function sendReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/account`,
  });
  return { error: error?.message ?? null };
}
export async function fetchMyOrders(orgId: string): Promise<CustomerOrder[]> {
  const { data, error } = await supabase.rpc("app_customer_orders", { p_org: orgId });
  if (error) return [];
  return (data as CustomerOrder[] | null) ?? [];
}
export async function fetchMyBookings(orgId: string): Promise<CustomerBooking[]> {
  const { data, error } = await supabase.rpc("app_customer_bookings", { p_org: orgId });
  if (error) return [];
  return (data as CustomerBooking[] | null) ?? [];
}
export async function cancelMyBooking(orgId: string, id: string) {
  const { data, error } = await supabase.rpc("app_customer_cancel_booking", { p_org: orgId, p_id: id });
  if (error) return { ok: false, error: error.message };
  const r = (data ?? {}) as { ok?: boolean; error?: string };
  return { ok: Boolean(r.ok), error: r.error ?? null };
}
export async function fetchMyProfile(orgId: string): Promise<CustomerProfile | null> {
  const { data, error } = await supabase.rpc("app_customer_profile", { p_org: orgId });
  if (error) return null;
  return (data as CustomerProfile | null) ?? null;
}
export async function saveMyProfile(orgId: string, name: string, phone: string) {
  const { data, error } = await supabase.rpc("app_customer_save_profile", { p_org: orgId, p_name: name, p_phone: phone });
  if (error) return { ok: false, error: error.message };
  const r = (data ?? {}) as { ok?: boolean; error?: string };
  return { ok: Boolean(r.ok), error: r.error ?? null };
}
