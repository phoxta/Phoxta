import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ENV, isBackendConfigured } from "@/config/env";
import type { BusinessProfile } from "@/data/live-store";
import type { Amenity } from "@/types/listings";
import type { LatLng, Vertical } from "@/types/domain";

/**
 * Phoxta backend client for the WamWam storefront.
 *
 * One deployment serves every buyer of this blueprint: the tenant is resolved
 * from the request host via `app_resolve_domain` (or pinned with VITE_ORG_ID).
 * Every listing is a `products` row tagged by `metadata.vertical`; bookings go
 * through the reservations backend. See businesses/CONTRACT.md.
 */

export const isConfigured = isBackendConfigured;

export const supabase: SupabaseClient = createClient(
    ENV.supabaseUrl ?? "http://localhost",
    ENV.supabaseAnonKey ?? "anon",
);

/* ------------------------------------------------------------------------ */
/* Tenant                                                                    */
/* ------------------------------------------------------------------------ */

export interface Branding {
    logo_url?: string;
    name?: string;
    tagline?: string;
    colors?: { primary?: string; accent?: string; bg?: string; text?: string };
    fonts?: { heading?: string; body?: string };
    radius?: string;
}

export interface Tenant {
    id: string;
    name: string | null;
    branding?: Branding | null;
    profile?: BusinessProfile | null;
}

interface ResolveDomainRow {
    organization_id: string;
    name: string;
    branding?: Branding;
    profile?: BusinessProfile;
}

/**
 * Theme the storefront from the tenant's saved brand: CSS variables, a small
 * override sheet, Google Fonts and the document title. Idempotent.
 */
export function applyBranding(brand?: Branding | null): void {
    if (!brand || typeof document === "undefined") return;
    const c = brand.colors ?? {};
    const f = brand.fonts ?? {};
    const root = document.documentElement;
    const set = (k: string, v?: string) => {
        if (v) root.style.setProperty(k, v);
    };
    set("--brand-primary", c.primary);
    set("--brand-accent", c.accent);
    set("--brand-bg", c.bg);
    set("--brand-text", c.text);
    set("--brand-radius", brand.radius);
    set("--brand-font-heading", f.heading ? `'${f.heading}'` : undefined);
    set("--brand-font-body", f.body ? `'${f.body}'` : undefined);

    const families = [f.heading, f.body].filter((x): x is string => Boolean(x));
    if (families.length) {
        let link = document.getElementById("brand-fonts") as HTMLLinkElement | null;
        if (!link) {
            link = document.createElement("link");
            link.id = "brand-fonts";
            link.rel = "stylesheet";
            document.head.appendChild(link);
        }
        const href = `https://fonts.googleapis.com/css2?${families
            .map((x) => `family=${encodeURIComponent(x)}:wght@400;500;600;700`)
            .join("&")}&display=swap`;
        if (link.href !== href) link.href = href;
    }

    let style = document.getElementById("brand-overrides") as HTMLStyleElement | null;
    if (!style) {
        style = document.createElement("style");
        style.id = "brand-overrides";
        document.head.appendChild(style);
    }
    const p = c.primary;
    const a = c.accent;
    const r = brand.radius;
    // These selectors are live styling hooks for the assistant widget and any
    // Bootstrap-classed element a tenant brand needs to recolour.
    const css = [
        f.body ? `body{font-family:var(--brand-font-body),sans-serif !important;}` : "",
        f.heading
            ? `h1,h2,h3,h4,h5,h6,.display-1,.display-2,.display-3,.display-4{font-family:var(--brand-font-heading),sans-serif !important;}`
            : "",
        p ? `.btn-dark,.at-btn,.btn-primary,.bg-dark,.bg-primary{background-color:${p} !important;border-color:${p} !important;}` : "",
        a ? `a:hover,.text-primary,.text-accent{color:${a} !important;}` : "",
        r ? `.btn,.at-btn,.btn-dark,.btn-primary,.rounded-pill{border-radius:${r} !important;}` : "",
    ].join("");
    if (style.textContent !== css) style.textContent = css;

    if (brand.name) document.title = brand.name;
}

/**
 * Demand engine: inject the tenant's schema.org catalogue as JSON-LD from the
 * public storefront-feed function. Once per page load, after a tenant resolved,
 * silent on failure.
 */
let schemaInjected = false;
function injectSchemaFeed(): void {
    if (schemaInjected || typeof document === "undefined" || !ENV.supabaseUrl) return;
    schemaInjected = true;
    const host = location.host;
    if (!host) return;
    fetch(`${ENV.supabaseUrl}/functions/v1/storefront-feed?host=${encodeURIComponent(host)}&format=schema`)
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

async function resolveByHost(host: string): Promise<Tenant | null> {
    const { data } = await supabase.rpc("app_resolve_domain", { p_host: host });
    const row = (data as ResolveDomainRow[] | null)?.[0];
    if (!row) return null;
    return {
        id: row.organization_id,
        name: row.name ?? null,
        branding: row.branding ?? null,
        profile: row.profile ?? null,
    };
}

/**
 * Resolve the tenant this page is serving. Uncached; see tenant.ts for the
 * memoised entry point every caller should use.
 */
export async function resolveTenantUncached(host?: string): Promise<Tenant | null> {
    const h = host ?? (typeof location !== "undefined" ? location.host : "");
    try {
        if (ENV.bakedOrgId) {
            // Pinned deployment. Still try the host so a matching domains row
            // supplies branding and profile; otherwise serve the bare id.
            const byHost = isConfigured && h ? await resolveByHost(h).catch(() => null) : null;
            const tenant: Tenant =
                byHost && byHost.id === ENV.bakedOrgId ? byHost : { id: ENV.bakedOrgId, name: null };
            applyBranding(tenant.branding ?? null);
            injectSchemaFeed();
            return tenant;
        }
        if (!isConfigured || !h) return null;
        const tenant = await resolveByHost(h);
        if (!tenant) return null;
        applyBranding(tenant.branding ?? null);
        injectSchemaFeed();
        return tenant;
    } catch {
        return null;
    }
}

/* ------------------------------------------------------------------------ */
/* Catalogue                                                                 */
/* ------------------------------------------------------------------------ */

/** The optional shape a product's `metadata` JSON may carry for this storefront. */
export interface ProductMetadata {
    vertical?: Vertical;
    handle?: string;
    badge?: string;
    featuredImage?: string;
    galleryImgs?: string[];
    address?: string;
    reviewStart?: number;
    reviewCount?: number;
    amenities?: Amenity[];
    map?: LatLng;
    // flights
    name?: string;
    departure?: string;
    arrival?: string;
    departureTime?: string;
    arrivalTime?: string;
    duration?: string;
    stopNumber?: number;
    layover?: string;
}

export interface DBProduct {
    id: string;
    name: string;
    description: string;
    price_cents: number;
    currency: string;
    status: string;
    image_url: string | null;
    metadata: Partial<ProductMetadata> | null;
}

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

export interface AvailDay {
    day: string;
    units_total: number;
    units_booked: number;
    available: number;
}

export async function fetchAvailability(productId: string, from: string, to: string): Promise<AvailDay[]> {
    try {
        const { data, error } = await supabase.rpc("app_resource_availability", {
            p_product: productId,
            p_from: from,
            p_to: to,
        });
        if (error) return [];
        return (data as AvailDay[] | null) ?? [];
    } catch {
        return [];
    }
}

/* ------------------------------------------------------------------------ */
/* Bookings                                                                  */
/* ------------------------------------------------------------------------ */

/**
 * Request a booking for [start, end). Priced and availability-checked
 * server-side; writes a 'pending' reservation visible in the owner console.
 */
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

export interface ReservationPayment {
    url: string;
    accessCode: string | null;
    reference: string | null;
}

/**
 * Start an online payment for a reservation. Returns null when payments are
 * not configured for the tenant or anything fails; callers keep the pay-later
 * confirmation in that case. Never throws.
 */
export async function initReservationPayment(
    orgId: string,
    reservationId: string,
    customerEmail: string,
): Promise<ReservationPayment | null> {
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

export interface ReservationLookup {
    found: boolean;
    status: string;
    product: string;
    start_date: string;
    end_date: string;
    units: number;
    total_cents: number;
    currency: string;
    customer_name: string;
    metadata?: Record<string, unknown> | null;
}

/** Private booking lookup: reference AND email must both match. */
export async function lookupReservation(orgId: string, ref: string, email: string): Promise<ReservationLookup | null> {
    const { data, error } = await supabase.rpc("app_lookup_reservation", { p_org: orgId, p_ref: ref, p_email: email });
    if (error || !data) return null;
    return data as ReservationLookup;
}

/** The webhook flips a paid reservation to 'confirmed' and stamps metadata.paid. Either signal counts. */
export function isReservationPaid(r: ReservationLookup | null): boolean {
    if (!r || !r.found) return false;
    const status = (r.status || "").toLowerCase();
    return status === "confirmed" || status === "completed" || r.metadata?.paid === true;
}

/* ------------------------------------------------------------------------ */
/* Content                                                                   */
/* ------------------------------------------------------------------------ */

export interface DBReview {
    id: string;
    author_name: string;
    rating: number;
    title: string;
    body: string;
    created_at: string;
}

export interface DBBlog {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    body: string;
    cover_url: string | null;
    author: string;
    published_at: string;
}

export async function fetchReviewsRaw(orgId: string): Promise<DBReview[]> {
    const { data } = await supabase
        .from("reviews")
        .select("id, author_name, rating, title, body, created_at")
        .eq("organization_id", orgId)
        .eq("status", "published")
        .order("created_at", { ascending: false });
    return (data as DBReview[] | null) ?? [];
}

export async function fetchBlogRaw(orgId: string): Promise<DBBlog[]> {
    const { data } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("organization_id", orgId)
        .eq("status", "published")
        .order("published_at", { ascending: false });
    return (data as DBBlog[] | null) ?? [];
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

/* ------------------------------------------------------------------------ */
/* Customer accounts                                                         */
/*                                                                           */
/* A storefront customer is an ordinary Supabase auth user. Orders and       */
/* bookings are matched on the VERIFIED email in their JWT, so nothing here  */
/* can be spoofed and no customer can read another's history.               */
/* ------------------------------------------------------------------------ */

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

export interface CustomerBooking {
    kind: "appointment" | "reservation";
    id: string;
    reference: string;
    when: string;
    until?: string;
    status: string;
    units?: number;
    total_cents?: number;
    currency?: string;
    notes?: string | null;
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

export async function fetchMyBookings(orgId: string): Promise<CustomerBooking[]> {
    const { data, error } = await supabase.rpc("app_customer_bookings", { p_org: orgId });
    if (error) return [];
    return (data as CustomerBooking[] | null) ?? [];
}

export async function cancelMyBooking(orgId: string, id: string): Promise<OkResult> {
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

export async function saveMyProfile(orgId: string, name: string, phone: string): Promise<OkResult> {
    const { data, error } = await supabase.rpc("app_customer_save_profile", { p_org: orgId, p_name: name, p_phone: phone });
    if (error) return { ok: false, error: error.message };
    const r = (data ?? {}) as { ok?: boolean; error?: string };
    return { ok: Boolean(r.ok), error: r.error ?? null };
}
