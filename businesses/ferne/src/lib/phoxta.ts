/**
 * Phoxta backend client for the Ferne storefront.
 *
 * ONE deployment serves EVERY Ferne buyer: it resolves which tenant
 * (organization) it is serving from the request hostname via `app_resolve_domain`
 * — or from a baked `VITE_ORG_ID` for a single-tenant deploy. Row-level security
 * and the public read policies keep every query scoped to that one org, so the
 * anon key is safe in the bundle. See `businesses/CONTRACT.md`.
 *
 * Everything a shopper does that must be trusted — pricing an order, applying a
 * promo code, decrementing stock, reading order history — happens in a SECURITY
 * DEFINER function on the server. Nothing in this file can move a price.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ENV, isBackendConfigured } from "@/config/env";

export const isConfigured = isBackendConfigured;

export const supabase: SupabaseClient = createClient(
    ENV.supabaseUrl ?? "http://localhost",
    ENV.supabaseAnonKey ?? "anon",
);

// ---------------------------------------------------------------------------
// Tenant resolution + branding
// ---------------------------------------------------------------------------

export interface Branding {
    logo_url?: string;
    name?: string;
    tagline?: string;
    colors?: { primary?: string; accent?: string; bg?: string; text?: string };
    fonts?: { heading?: string; body?: string };
    radius?: string;
}

export interface Hours {
    day: string;
    open?: string;
    close?: string;
    closed?: boolean;
}

export interface BusinessProfile {
    address?: string;
    phone?: string;
    email?: string;
    mapQuery?: string;
    hours?: Hours[];
}

export interface Tenant {
    id: string;
    name: string | null;
    /**
     * Null on the host-resolved path: `app_resolve_domain` returns routing and
     * branding only. The catalogue is the authority anyway — every price the
     * store renders comes from a `products` row, which carries its own currency —
     * so `CatalogProvider` derives the effective currency from the catalogue and
     * only falls back to this.
     */
    currency: string | null;
    branding: Branding | null;
    profile: BusinessProfile | null;
}

/**
 * Theme the storefront from the tenant's saved brand.
 *
 * Ferne's design system is a set of CSS custom properties, so a rebrand is a
 * handful of variable writes rather than a stylesheet override — the sage
 * accent, the canvas, the two typefaces and the corner radius are all that
 * carry the brand. The dashboard Brand editor / AI rebrand writes these.
 */
export function applyBranding(brand?: Branding | null): void {
    if (!brand || typeof document === "undefined") return;
    const c = brand.colors ?? {};
    const f = brand.fonts ?? {};
    const root = document.documentElement;
    const set = (k: string, v?: string) => {
        if (v) root.style.setProperty(k, v);
    };

    // The accent drives buttons, links and proof points; the canvas is the page.
    set("--sage", c.primary);
    set("--ink", c.text);
    set("--canvas", c.bg);
    if (c.accent) set("--sage", c.accent === c.primary ? c.primary : c.accent);
    if (brand.radius) {
        set("--r-md", brand.radius);
        set("--r-lg", brand.radius);
    }

    const fams = [f.heading, f.body].filter(Boolean) as string[];
    if (fams.length) {
        let link = document.getElementById("brand-fonts") as HTMLLinkElement | null;
        if (!link) {
            link = document.createElement("link");
            link.id = "brand-fonts";
            link.rel = "stylesheet";
            document.head.appendChild(link);
        }
        link.href = `https://fonts.googleapis.com/css2?${fams
            .map((x) => `family=${encodeURIComponent(x)}:wght@400;500;600;700`)
            .join("&")}&display=swap`;
        if (f.heading) set("--serif", `'${f.heading}'`);
        if (f.body) set("--sans", `'${f.body}'`);
    }
}

/** Inject this tenant's schema.org catalogue feed so search engines and AI
 *  shopping agents can read the live catalogue. Once per load; best-effort. */
let schemaInjected = false;
function injectSchemaFeed(): void {
    if (schemaInjected || !ENV.supabaseUrl || typeof document === "undefined") return;
    schemaInjected = true;
    fetch(
        `${ENV.supabaseUrl.replace(/\/+$/, "")}/functions/v1/storefront-feed?host=${encodeURIComponent(
            location.host,
        )}&format=schema`,
    )
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => {
            if (!json) return;
            const s = document.createElement("script");
            s.type = "application/ld+json";
            s.textContent = JSON.stringify(json);
            document.head.appendChild(s);
        })
        .catch(() => {
            /* the demand feed is best-effort */
        });
}

async function resolveByHost(host: string): Promise<Tenant | null> {
    const { data } = await supabase.rpc("app_resolve_domain", { p_host: host });
    const row = (
        data as Array<{
            organization_id: string;
            name: string | null;
            branding?: Branding | null;
            profile?: BusinessProfile | null;
        }> | null
    )?.[0];
    if (!row) return null;
    applyBranding(row.branding ?? null);
    return {
        id: row.organization_id,
        name: row.name ?? null,
        currency: null,
        branding: row.branding ?? null,
        profile: row.profile ?? null,
    };
}

/** Resolve the tenant for this storefront. Prefer `@/lib/tenant`, which
 *  single-flights this call for the four callers that need it on boot. */
export async function resolveTenantUncached(host?: string): Promise<Tenant | null> {
    if (ENV.bakedOrgId) {
        injectSchemaFeed();
        const t = await fetchOrgMeta(ENV.bakedOrgId);
        return t ?? { id: ENV.bakedOrgId, name: null, currency: null, branding: null, profile: null };
    }
    if (!isConfigured) return null;
    const h = host ?? (typeof location !== "undefined" ? location.host : "");
    if (!h) return null;
    try {
        const tenant = await resolveByHost(h);
        if (tenant) injectSchemaFeed();
        return tenant;
    } catch {
        return null;
    }
}

/** Name/branding/currency for a known org id (the baked single-tenant path,
 *  which never goes through the host resolver). */
async function fetchOrgMeta(orgId: string): Promise<Tenant | null> {
    try {
        const { data } = await supabase
            .from("organizations")
            .select("id, name, currency, branding, profile")
            .eq("id", orgId)
            .maybeSingle();
        const row = data as {
            id: string;
            name: string | null;
            currency: string | null;
            branding: Branding | null;
            profile: BusinessProfile | null;
        } | null;
        if (!row) return null;
        applyBranding(row.branding);
        return {
            id: row.id,
            name: row.name,
            currency: row.currency || null,
            branding: row.branding,
            profile: row.profile,
        };
    } catch {
        return null;
    }
}

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------

/** What the Ferne blueprint stores on `products.metadata`. Every field is
 *  optional: an owner who adds a product in the console fills in name, price and
 *  picture, and the storefront has to render that too. */
export interface ProductMetadata {
    slug?: string;
    tagline?: string;
    category?: string;
    concerns?: string[];
    gallery?: string[];
    ingredients?: string;
    howTo?: string;
    skinType?: string;
    rating?: number;
    reviewCount?: number;
    bestseller?: boolean;
    isNew?: boolean;
    compareAtCents?: number;
    /** Fallback sizes for a tenant with no variant rows. */
    sizes?: { id?: string; label?: string; priceCents?: number; refill?: boolean }[];
}

export interface DBProduct {
    id: string;
    name: string;
    sku: string | null;
    description: string | null;
    price_cents: number;
    currency: string | null;
    stock: number | null;
    image_url: string | null;
    metadata: ProductMetadata | null;
}

export interface DBVariant {
    id: string;
    product_id: string;
    size: string;
    color: string;
    stock: number;
    price_cents: number | null;
}

/** Active catalogue for this tenant (RLS + the public-read policy scope it). */
export async function fetchProducts(orgId: string): Promise<DBProduct[]> {
    const { data, error } = await supabase
        .from("products")
        .select("id, name, sku, description, price_cents, currency, stock, image_url, metadata")
        .eq("organization_id", orgId)
        .eq("status", "active")
        .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data as DBProduct[] | null) ?? [];
}

/** Size variants for this tenant's catalogue, in one round trip. Ferne sells the
 *  same formula in several sizes at different prices, and `app_place_order`
 *  prices a line from the matched variant — so these ARE the prices. */
export async function fetchVariants(orgId: string): Promise<DBVariant[]> {
    // Insertion order, NOT price order: the first variant is the size the product
    // page selects by default and the price the card shows. Dew Cream's refill pod
    // is cheaper than the jar, so sorting by price would advertise the refill as
    // the product's price and preselect it for someone who owns no jar yet.
    const { data, error } = await supabase
        .from("product_variants")
        .select("id, product_id, size, color, stock, price_cents")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: true });
    if (error) return [];
    return (data as DBVariant[] | null) ?? [];
}

/** This tenant's agent public key, so the in-store advisor talks to ITS agent. */
export async function fetchAgentKey(orgId: string): Promise<string | null> {
    try {
        const { data, error } = await supabase.rpc("app_storefront_agent_key", { p_org: orgId });
        if (error) return null;
        return (data as string | null) ?? null;
    } catch {
        return null;
    }
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export interface OrderItemInput {
    product_id: string;
    quantity: number;
    /** The variant size label, e.g. "50 ml" — this is what selects the price. */
    size?: string;
    notes?: string;
}

/** The delivery payload stored on the order. The operating console renders the
 *  address lines to whoever is packing it; `fee_cents` is the delivery charge,
 *  which the order RPC re-clamps and adds to the total server-side. */
export interface ShippingInput {
    name: string;
    address: string;
    city: string;
    postcode: string;
    country: string;
    phone?: string;
    method: string;
    fee_cents: number;
}

/**
 * Place a web order. Priced, discounted and stock-checked SERVER-SIDE from the
 * tenant's own catalogue, then it lands in the owner's console as a pending web
 * order. Returns the order id, which doubles as the tracking reference.
 */
export async function placeOrder(
    orgId: string,
    customerName: string,
    customerEmail: string,
    items: OrderItemInput[],
    notes = "",
    promo = "",
    shipping?: ShippingInput,
): Promise<string | null> {
    const { data, error } = await supabase.rpc("app_place_order", {
        p_org: orgId,
        p_customer_name: customerName,
        p_customer_email: customerEmail,
        p_items: items,
        p_notes: notes,
        p_promo: promo,
        p_shipping: shipping ?? {},
    });
    if (error) throw new Error(error.message);
    return (data as string | null) ?? null;
}

export type PromoCheck =
    | { valid: true; code: string; kind: "percent" | "fixed"; value: number; discountCents: number }
    | { valid: false; message: string };

/** Check a promo code against a subtotal. The same codes are re-applied
 *  authoritatively inside `app_place_order`, so this is only for showing the
 *  shopper what they will get. */
export async function validatePromo(orgId: string, code: string, subtotalCents: number): Promise<PromoCheck> {
    const { data, error } = await supabase.rpc("app_validate_promo", {
        p_org: orgId,
        p_code: code,
        p_subtotal_cents: subtotalCents,
    });
    if (error || !data) return { valid: false, message: "That code isn't valid." };
    const r = data as {
        valid?: boolean;
        message?: string;
        code?: string;
        kind?: string;
        value?: number;
        discount_cents?: number;
    };
    if (!r.valid) return { valid: false, message: r.message || "That code isn't valid." };
    return {
        valid: true,
        code: r.code ?? code.toUpperCase(),
        kind: r.kind === "fixed" ? "fixed" : "percent",
        value: r.value ?? 0,
        discountCents: r.discount_cents ?? 0,
    };
}

export interface OrderLookupItem {
    name: string;
    quantity: number;
    unit_price_cents: number;
}

export interface OrderLookup {
    found: boolean;
    status: string;
    fulfillment_status: string | null;
    total_cents: number;
    currency: string;
    created_at: string;
    customer_name: string;
    items: OrderLookupItem[];
    paid_at?: string | null;
}

/** Track an order as a guest: the reference AND the email must both match. */
export async function lookupOrder(orgId: string, ref: string, email: string): Promise<OrderLookup | null> {
    const { data, error } = await supabase.rpc("app_lookup_order", { p_org: orgId, p_ref: ref, p_email: email });
    if (error || !data) return null;
    return data as OrderLookup;
}

const PAID_STATUSES = ["paid", "fulfilled", "shipped", "delivered", "completed"];

/** Payment is only ever confirmed from the server-side record — never from a
 *  payment-widget callback, which can fire on a transaction that later fails. */
export function orderIsPaid(r: OrderLookup | null): boolean {
    if (!r || !r.found) return false;
    return PAID_STATUSES.includes(r.status) || Boolean(r.paid_at);
}

export interface CheckoutSession {
    accessCode: string | null;
    url: string;
}

/** Start an online payment for a placed order. Returns null when the tenant has
 *  no payment provider connected — the order still stands as pay-on-delivery. */
export async function startPayment(orgId: string, orderId: string, returnUrl: string): Promise<CheckoutSession | null> {
    try {
        const { data } = await supabase.functions.invoke("paystack-storefront-checkout", {
            body: { orgId, kind: "order", id: orderId, returnUrl },
        });
        const res = data as { url?: string; access_code?: string } | null;
        if (!res || (!res.access_code && !res.url)) return null;
        return { accessCode: res.access_code ?? null, url: res.url ?? "" };
    } catch {
        return null;
    }
}

// ---------------------------------------------------------------------------
// Content: reviews, journal, FAQs, CMS pages, contact
// ---------------------------------------------------------------------------

export interface DBReview {
    id: string;
    subject_type: string;
    subject_ref: string | null;
    author_name: string;
    author_avatar: string | null;
    rating: number;
    title: string;
    body: string;
    created_at: string;
}

export interface DBBlogPost {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    body: string;
    cover_url: string | null;
    author: string;
    tags: string[] | null;
    published_at: string;
}

export interface DBFaq {
    id: string;
    question: string;
    body: string;
    category: string;
    sort: number;
}

export async function fetchReviews(orgId: string): Promise<DBReview[]> {
    const { data } = await supabase
        .from("reviews")
        .select("id, subject_type, subject_ref, author_name, author_avatar, rating, title, body, created_at")
        .eq("organization_id", orgId)
        .eq("status", "published")
        .order("created_at", { ascending: false });
    return (data as DBReview[] | null) ?? [];
}

export async function fetchJournal(orgId: string): Promise<DBBlogPost[]> {
    const { data } = await supabase
        .from("blog_posts")
        .select("id, slug, title, excerpt, body, cover_url, author, tags, published_at")
        .eq("organization_id", orgId)
        .eq("status", "published")
        .order("published_at", { ascending: false });
    return (data as DBBlogPost[] | null) ?? [];
}

export async function fetchFaqs(orgId: string): Promise<DBFaq[]> {
    const { data } = await supabase
        .from("faqs")
        .select("id, question, body, category, sort")
        .eq("organization_id", orgId)
        .eq("active", true)
        .order("sort", { ascending: true });
    return (data as DBFaq[] | null) ?? [];
}

export async function fetchCms(orgId: string, slug: string): Promise<{ title: string; body: string } | null> {
    const { data } = await supabase
        .from("cms_pages")
        .select("title, body")
        .eq("organization_id", orgId)
        .eq("slug", slug)
        .eq("status", "published")
        .limit(1);
    return ((data as Array<{ title: string; body: string }> | null) ?? [])[0] ?? null;
}

/** A message from the contact form. Lands in the owner's Inbox as a conversation. */
export async function submitContact(
    orgId: string,
    name: string,
    email: string,
    subject: string,
    message: string,
): Promise<boolean> {
    const { error } = await supabase.rpc("app_submit_contact", {
        p_org: orgId,
        p_name: name,
        p_email: email,
        p_subject: subject,
        p_message: message,
    });
    return !error;
}

/** Submit a product review. Lands as PENDING for the owner to approve, so the
 *  storefront must tell the shopper it is awaiting moderation rather than
 *  pretending it is live. */
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

// ---------------------------------------------------------------------------
// Customer accounts
//
// A storefront customer is an ordinary Supabase auth user. Their order history
// is matched on the VERIFIED email in their JWT server-side, so nothing here can
// be spoofed and no customer can read another's orders.
// ---------------------------------------------------------------------------

export interface CustomerOrder {
    id: string;
    reference: string;
    status: string;
    fulfilment: string | null;
    total_cents: number;
    refunded_cents: number;
    currency: string;
    placed_at: string;
    paid_at: string | null;
    tracking: string | null;
    notes: string | null;
    items: { name: string; quantity: number; unit_price_cents: number; notes: string | null }[];
}

export interface CustomerProfile {
    name: string | null;
    email: string;
    phone: string | null;
    company: string | null;
}

type Result = { error: string | null };
type OkResult = { ok: boolean; error: string | null };

export async function signUp(email: string, password: string, name?: string): Promise<Result> {
    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: name ? { full_name: name } : undefined },
    });
    return { error: error?.message ?? null };
}

export async function signIn(email: string, password: string): Promise<Result> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
}

export async function signOut(): Promise<void> {
    await supabase.auth.signOut();
}

export async function sendReset(email: string): Promise<Result> {
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

export async function fetchMyProfile(orgId: string): Promise<CustomerProfile | null> {
    const { data, error } = await supabase.rpc("app_customer_profile", { p_org: orgId });
    if (error) return null;
    return (data as CustomerProfile | null) ?? null;
}

export async function saveMyProfile(orgId: string, name: string, phone: string): Promise<OkResult> {
    const { data, error } = await supabase.rpc("app_customer_save_profile", {
        p_org: orgId,
        p_name: name,
        p_phone: phone,
    });
    if (error) return { ok: false, error: error.message };
    const r = (data ?? {}) as { ok?: boolean; error?: string };
    return { ok: Boolean(r.ok), error: r.error ?? null };
}
