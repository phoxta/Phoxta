// Phoxta backend client for the Gearo (furniture / eCommerce) storefront.
// One deployment serves EVERY gearo buyer: it resolves which tenant (organization)
// it serves from the request hostname via app_resolve_domain (or a baked
// VITE_ORG_ID for a single-tenant deploy). RLS + the public policies keep every
// query scoped to that one org. See businesses/CONTRACT.md.
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
    f.heading ? `h1,h2,h3,h4,h5,h6,.title,.heading{font-family:var(--brand-font-heading),sans-serif !important;}` : "",
    p ? `.tf-btn.btn-fill,.btn-primary,.btn-dark,.bg-primary,.bg-dark{background-color:${p} !important;border-color:${p} !important;}` : "",
    a ? `a:hover,.text-primary,.text_primary{color:${a} !important;}` : "",
    r ? `.tf-btn,.btn,.btn-primary,.btn-fill{border-radius:${r} !important;}` : "",
  ].join("");

  if (brand.name) document.title = brand.name;
}

// ── Demand engine: schema.org feed ────────────────────────────────────────
let schemaFeedInjected = false;
/** Inject this tenant's schema.org catalogue feed as a JSON-LD script (SEO /
 *  AI-search demand engine). Runs at most once per page load, only after a
 *  tenant has resolved; fails silently on any error. */
function injectSchemaFeed(): void {
  if (schemaFeedInjected || typeof document === "undefined" || typeof location === "undefined") return;
  schemaFeedInjected = true;
  void (async () => {
    try {
      const res = await fetch(`https://ktgleoqvdikngocygdkn.supabase.co/functions/v1/storefront-feed?host=${encodeURIComponent(location.host)}&format=schema`);
      if (!res.ok) return;
      const json: unknown = await res.json();
      if (!json) return;
      const s = document.createElement("script");
      s.type = "application/ld+json";
      s.textContent = JSON.stringify(json);
      document.head.appendChild(s);
    } catch { /* silent — feed is best-effort */ }
  })();
}

/** Resolve the tenant for this storefront: baked ORG_ID, else by hostname. */
export async function resolveTenant(host?: string): Promise<Tenant | null> {
  if (BAKED_ORG_ID) { injectSchemaFeed(); return { id: BAKED_ORG_ID, name: null }; }
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
  metadata: Record<string, unknown> | null;
};

/** Active catalogue for this tenant (RLS + public-read policy enforce scope). */
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

/** This tenant's agent public key, so the in-store AI assistant talks to ITS agent. */
export async function fetchAgentKey(orgId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc("app_storefront_agent_key", { p_org: orgId });
    if (error) return null;
    return (data as string | null) ?? null;
  } catch {
    return null;
  }
}

/** Place a web order via the secure RPC; priced server-side from the tenant's
 *  catalogue and surfaced in the operating console's Orders. Returns the order id. */
export async function placeOrder(
  orgId: string,
  customerName: string,
  customerEmail: string,
  items: { product_id: string; quantity: number }[],
): Promise<string | null> {
  const { data, error } = await supabase.rpc("app_place_order", {
    p_org: orgId,
    p_customer_name: customerName,
    p_customer_email: customerEmail,
    p_items: items,
  });
  if (error) throw new Error(error.message);
  return (data as string | null) ?? null;
}

// ── Payments (Paystack) ───────────────────────────────────────────────────
export type OrderPayment = {
  /** Hosted checkout URL — the full-page fallback when the popup can't open. */
  url: string | null;
  /** Paystack access_code for the inline.js v2 in-page popup. */
  accessCode: string | null;
  /** Paystack transaction reference. */
  reference: string | null;
};

/** Start an online payment for a just-placed order. Returns the transaction
 *  handles (popup access_code + hosted URL fallback), or null when payments
 *  aren't configured for this tenant (order simply stays pay-later). Never
 *  throws — payment must never block order creation. */
export async function startOrderPayment(orgId: string, orderId: string, returnUrl: string): Promise<OrderPayment | null> {
  try {
    const { data, error } = await supabase.functions.invoke("paystack-storefront-checkout", {
      body: { orgId, kind: "order", id: orderId, returnUrl },
    });
    if (error) return null;
    const d = data as { url?: unknown; access_code?: unknown; reference?: unknown } | null;
    const url = typeof d?.url === "string" && d.url ? d.url : null;
    const accessCode = typeof d?.access_code === "string" && d.access_code ? d.access_code : null;
    const reference = typeof d?.reference === "string" && d.reference ? d.reference : null;
    if (!url && !accessCode) return null;
    return { url, accessCode, reference };
  } catch {
    return null;
  }
}

export async function fetchCms(orgId: string, slug: string): Promise<{ title: string; body: string } | null> {
  const { data } = await supabase.from("cms_pages").select("title, body").eq("organization_id", orgId).eq("slug", slug).eq("status", "published").limit(1);
  return ((data as Array<{ title: string; body: string }> | null) ?? [])[0] ?? null;
}

export async function submitContact(orgId: string, name: string, email: string, subject: string, message: string): Promise<boolean> {
  const { error } = await supabase.rpc("app_submit_contact", { p_org: orgId, p_name: name, p_email: email, p_subject: subject, p_message: message });
  return !error;
}

// ── Reviews ───────────────────────────────────────────────────────────────
export type Review = { id: string; author_name: string; rating: number; title: string | null; body: string | null; subject_type: string; subject_ref: string | null; created_at: string };

/** Published reviews for this tenant (optionally scoped to one product's ref). Public-read. */
export async function fetchReviews(orgId: string, subjectRef?: string | null): Promise<Review[]> {
  let q = supabase
    .from("reviews")
    .select("id, author_name, rating, title, body, subject_type, subject_ref, created_at")
    .eq("organization_id", orgId)
    .eq("status", "published")
    .order("created_at", { ascending: false });
  if (subjectRef) q = q.eq("subject_ref", subjectRef);
  const { data, error } = await q;
  if (error) return [];
  return (data as Review[] | null) ?? [];
}

/** Submit a review (lands as pending for owner approval). Tagged to a product when given. */
export async function submitReview(
  orgId: string,
  r: { author: string; rating: number; title?: string; body: string; productId?: string | null },
): Promise<boolean> {
  const { error } = await supabase.rpc("app_submit_review", {
    p_org: orgId,
    p_subject_type: r.productId ? "product" : "business",
    p_subject_ref: r.productId ?? "",
    p_author: r.author,
    p_rating: r.rating,
    p_title: r.title ?? "",
    p_body: r.body,
  });
  return !error;
}

// ── Order tracking ────────────────────────────────────────────────────────
export type OrderLookupItem = { name: string; quantity: number; unit_price_cents: number };
export type OrderLookup = {
  found: boolean; status: string; fulfillment_status: string | null;
  total_cents: number; currency: string; created_at: string;
  customer_name: string; items: OrderLookupItem[];
  /** Present when the order has been paid (used to verify online payment). */
  paid_at?: string | null;
};

/** True once the guest lookup shows the order as paid. */
export function isOrderPaid(r: OrderLookup): boolean {
  const s = (r.status || "").toLowerCase();
  return s === "paid" || s === "fulfilled" || Boolean(r.paid_at);
}

/** Track an order privately: the reference (order id) AND the email must match. */
export async function lookupOrder(orgId: string, ref: string, email: string): Promise<OrderLookup | null> {
  const { data, error } = await supabase.rpc("app_lookup_order", { p_org: orgId, p_ref: ref, p_email: email });
  if (error || !data) return null;
  return data as OrderLookup;
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
