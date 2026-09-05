import { useEffect, useState, type ReactNode } from "react";
import { resolveTenant } from "@/integration/tenant";
import { fetchBlogRaw, fetchProducts, fetchReviewsRaw, type DBBlog, type DBProduct, type DBReview } from "@/integration/phoxta";
import { sanitizeRichText } from "@/integration/live-edit";
import { markHydrated, setLiveContent, setLiveListings, setOrgId, setProfile } from "@/data/live-store";
import { getDemoStayListings, getDemoCarListings, getDemoExperienceListings, getDemoFlightListings } from "@/data/listings";
import { getBlogPosts, getListingReviews } from "@/data/content";
import { formatDate, formatListingPrice } from "@/lib/format";
import type { FlightListing, ListingBase, ListingsByVertical } from "@/types/listings";
import type { BlogPost, ListingReview } from "@/types/content";
import type { Vertical } from "@/types/domain";

/**
 * Hydrates the tenant's live catalogue and content ONCE, before any page
 * renders, then releases the tree.
 *
 * Every live product is mapped onto a demo listing template of the same
 * vertical, by position, so every field the design system expects (host, map
 * pin, gallery, airline logo) is present even when the product's metadata
 * omits it. Templates are read through the demo getters, never the live
 * getters, so re-running the effect (StrictMode, remount) maps products onto
 * demo data rather than onto the previous run's output.
 *
 * The gate is required: the data getters read the store synchronously, and
 * this component's re-render on `ready` is what makes them see the live rows.
 * Falls back to the bundled demo catalogue when no tenant resolves.
 */

/**
 * Pexels images are seeded as full-resolution URLs; request a compressed,
 * sized variant so cards don't pull multi-MB originals. Leaves local or
 * already-parameterised URLs untouched.
 */
export function optimizedImageUrl(url?: string | null): string {
    if (!url) return "";
    if (!url.includes("images.pexels.com") || url.includes("?")) return url;
    return `${url}?auto=compress&cs=tinysrgb&w=800&dpr=1`;
}

function mapCommon<T extends ListingBase>(p: DBProduct, tmpl: T | undefined): T {
    const m = p.metadata ?? {};
    const base = (tmpl ?? {}) as T;
    const gallery = m.galleryImgs ?? base.galleryImgs ?? (p.image_url ? [p.image_url] : []);
    return {
        ...base,
        id: p.id,
        title: p.name,
        handle: m.handle ?? base.handle,
        badge: m.badge ?? base.badge ?? "",
        featuredImage: optimizedImageUrl(m.featuredImage ?? p.image_url ?? base.featuredImage),
        galleryImgs: gallery.map(optimizedImageUrl),
        like: false,
        address: m.address ?? base.address,
        reviewStart: m.reviewStart ?? base.reviewStart,
        reviewCount: m.reviewCount ?? base.reviewCount,
        price: formatListingPrice(p.price_cents),
        amenities: m.amenities ?? base.amenities ?? [],
        map: m.map ?? base.map,
    };
}

function mapFlight(p: DBProduct, tmpl: FlightListing | undefined): FlightListing {
    const m = p.metadata ?? {};
    const base = (tmpl ?? {}) as FlightListing;
    return {
        ...base,
        id: p.id,
        name: m.name ?? p.name,
        departure: m.departure ?? base.departure,
        arrival: m.arrival ?? base.arrival,
        departureTime: m.departureTime ?? base.departureTime,
        arrivalTime: m.arrivalTime ?? base.arrivalTime,
        duration: m.duration ?? base.duration,
        stopNumber: m.stopNumber ?? base.stopNumber,
        layover: m.layover ?? base.layover,
        price: formatListingPrice(p.price_cents),
        href: "#",
    };
}

function mapBlog(b: DBBlog, tmpl: BlogPost | undefined): BlogPost {
    const t = (tmpl ?? {}) as BlogPost;
    return {
        ...t,
        id: b.id,
        title: b.title,
        handle: b.slug,
        excerpt: b.excerpt,
        content: b.body,
        body: b.body,
        featuredImage: {
            ...(t.featuredImage ?? { alt: "" }),
            src: optimizedImageUrl(b.cover_url ?? t.featuredImage?.src),
            alt: b.title,
        },
        date: formatDate(b.published_at),
        datetime: b.published_at,
        author: { ...(t.author ?? { avatar: { src: "", alt: "" }, description: "" }), name: b.author },
    };
}

function mapReview(r: DBReview, tmpl: ListingReview | undefined): ListingReview {
    const t = (tmpl ?? {}) as ListingReview;
    return {
        ...t,
        id: r.id,
        title: r.title,
        rating: Number(r.rating),
        // Review bodies arrive through a public RPC and are rendered as HTML
        // downstream; strip anything but inline formatting at the boundary.
        content: sanitizeRichText(r.body ?? ""),
        author: r.author_name,
        date: formatDate(r.created_at),
        datetime: r.created_at,
    };
}

const nth = <T,>(arr: T[], i: number): T | undefined => (arr.length ? arr[i % arr.length] : undefined);

async function hydrate(): Promise<void> {
    const tenant = await resolveTenant();
    if (!tenant) return;

    // Publish the org id first: bookings, contact and lookup depend on it and
    // must not be disabled by a later, unrelated fetch failing.
    setOrgId(tenant.id);
    if (tenant.name) document.title = tenant.name;

    const products = await fetchProducts(tenant.id);
    const templates: ListingsByVertical = {
        stay: getDemoStayListings(),
        car: getDemoCarListings(),
        experience: getDemoExperienceListings(),
        flight: getDemoFlightListings(),
    };
    const byVertical: Record<Vertical, DBProduct[]> = { stay: [], car: [], experience: [], flight: [] };
    for (const p of products) {
        const v = p.metadata?.vertical ?? "stay";
        if (v in byVertical) byVertical[v].push(p);
    }
    const live: Partial<ListingsByVertical> = {};
    if (byVertical.stay.length) live.stay = byVertical.stay.map((p, i) => mapCommon(p, nth(templates.stay, i)));
    if (byVertical.car.length) live.car = byVertical.car.map((p, i) => mapCommon(p, nth(templates.car, i)));
    if (byVertical.experience.length)
        live.experience = byVertical.experience.map((p, i) => mapCommon(p, nth(templates.experience, i)));
    if (byVertical.flight.length) live.flight = byVertical.flight.map((p, i) => mapFlight(p, nth(templates.flight, i)));
    setLiveListings(live);

    const [blogRaw, reviewsRaw] = await Promise.all([fetchBlogRaw(tenant.id), fetchReviewsRaw(tenant.id)]);
    const blogTemplates = getBlogPosts();
    const reviewTemplates = getListingReviews();
    setLiveContent({
        ...(blogRaw.length ? { blog: blogRaw.map((b, i) => mapBlog(b, nth(blogTemplates, i))) } : {}),
        ...(reviewsRaw.length ? { reviews: reviewsRaw.map((r, i) => mapReview(r, nth(reviewTemplates, i))) } : {}),
    });

    setProfile(tenant.profile ?? null);
}

export default function LiveListings({ children }: { children: ReactNode }) {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let active = true;
        hydrate()
            .catch(() => {
                // Unconfigured backend, offline, or unknown host: serve the demo catalogue.
            })
            .finally(() => {
                markHydrated();
                if (active) setReady(true);
            });
        return () => {
            active = false;
        };
    }, []);

    if (!ready) {
        return (
            <div
                style={{
                    minHeight: "60vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#9ca3af",
                    fontFamily: "system-ui, sans-serif",
                }}
            >
                Loading…
            </div>
        );
    }
    return <>{children}</>;
}
