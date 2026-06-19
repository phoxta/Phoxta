import { useEffect, useState, type ReactNode } from "react";
import { resolveTenant, fetchProducts, fetchBlogRaw, fetchReviewsRaw, type DBProduct } from "@/lib/phoxta";
import { setLiveListings, setLiveContent, setOrgId, setProfile, type Vertical } from "@/data/live";
import { getStayListings, getCarListings, getExperienceListings, getFlightListings } from "@/data/listings";
import { getBlogPosts, getListingReviews } from "@/data/data";

// Loads the tenant's live catalogue ONCE before any page renders, maps each
// product onto a matching static template (so every field the UI expects — host,
// map, gallery, airline logo… — is present), and populates the live cache. The
// synchronous getXListings() then return live data. Falls back to the bundled
// demo catalogue when there's no tenant (local dev / unknown host).

const money = (cents: number) => `$${Math.round((cents ?? 0) / 100).toLocaleString()}`;

// Pexels images are seeded as full-resolution URLs; request a compressed, sized
// variant so cards don't pull multi-MB originals (which made content crawl in on
// scroll). Leaves local/already-parameterised URLs untouched.
function img(url?: string | null): string {
  if (!url) return url || "";
  if (!url.includes("images.pexels.com") || url.includes("?")) return url;
  return `${url}?auto=compress&cs=tinysrgb&w=800&dpr=1`;
}

function mapCommon(p: DBProduct, tmpl: any) {
  const m = p.metadata ?? {};
  const gallery = (m.galleryImgs || tmpl.galleryImgs || [p.image_url].filter(Boolean)) as string[];
  return {
    ...tmpl,
    id: p.id,
    title: p.name,
    handle: m.handle || tmpl.handle,
    badge: m.badge ?? tmpl.badge ?? "",
    featuredImage: img(m.featuredImage || p.image_url || tmpl.featuredImage),
    galleryImgs: gallery.map(img),
    like: false,
    address: m.address ?? tmpl.address,
    reviewStart: m.reviewStart ?? tmpl.reviewStart,
    reviewCount: m.reviewCount ?? tmpl.reviewCount,
    price: money(p.price_cents),
    amenities: m.amenities || tmpl.amenities || [],
    map: m.map || tmpl.map,
  };
}

function mapFlight(p: DBProduct, tmpl: any) {
  const m = p.metadata ?? {};
  return {
    ...tmpl,
    id: p.id,
    name: m.name || p.name,
    departure: m.departure ?? tmpl.departure,
    arrival: m.arrival ?? tmpl.arrival,
    departureTime: m.departureTime ?? tmpl.departureTime,
    arrivalTime: m.arrivalTime ?? tmpl.arrivalTime,
    duration: m.duration ?? tmpl.duration,
    stopNumber: m.stopNumber ?? tmpl.stopNumber,
    layover: m.layover ?? tmpl.layover,
    price: money(p.price_cents),
    href: "#",
  };
}

export default function LiveListings({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const tenant = await resolveTenant();
        if (!tenant) {
          if (active) setReady(true);
          return;
        }
        if (tenant.name) document.title = tenant.name;
        const products = await fetchProducts(tenant.id);
        // Static templates (cache still empty here, so these return demo data).
        const tmpl: Record<Vertical, any[]> = {
          stay: getStayListings(),
          car: getCarListings(),
          experience: getExperienceListings(),
          flight: getFlightListings(),
        };
        const byV: Record<Vertical, DBProduct[]> = { stay: [], car: [], experience: [], flight: [] };
        for (const p of products) {
          const v = (p.metadata?.vertical as Vertical) || "stay";
          if (byV[v]) byV[v].push(p);
        }
        const live: Partial<Record<Vertical, any[]>> = {};
        (["stay", "car", "experience"] as Vertical[]).forEach((v) => {
          if (byV[v].length) live[v] = byV[v].map((p, i) => mapCommon(p, tmpl[v][i % tmpl[v].length]));
        });
        if (byV.flight.length) live.flight = byV.flight.map((p, i) => mapFlight(p, tmpl.flight[i % tmpl.flight.length]));
        setLiveListings(live);

        // Content: blog posts + reviews, mapped onto the static shapes.
        const [blogRaw, reviewsRaw] = await Promise.all([fetchBlogRaw(tenant.id), fetchReviewsRaw(tenant.id)]);
        const blogTmpl = getBlogPosts();
        const revTmpl = getListingReviews("");
        const content: { blog?: any[]; reviews?: any[] } = {};
        if (blogRaw.length) {
          content.blog = blogRaw.map((b, i) => {
            const t = blogTmpl[i % blogTmpl.length] || {};
            return {
              ...t, id: b.id, title: b.title, handle: b.slug, excerpt: b.excerpt, content: b.body, body: b.body,
              featuredImage: { ...(t.featuredImage || {}), src: img(b.cover_url || t.featuredImage?.src), alt: b.title },
              date: new Date(b.published_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }),
              datetime: b.published_at,
              author: { ...(t.author || {}), name: b.author },
            };
          });
        }
        if (reviewsRaw.length) {
          content.reviews = reviewsRaw.map((r, i) => {
            const t = revTmpl[i % revTmpl.length] || {};
            return {
              ...t, id: r.id, title: r.title, rating: Number(r.rating), content: r.body, author: r.author_name,
              date: new Date(r.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }),
              datetime: r.created_at,
            };
          });
        }
        setLiveContent(content);

        setOrgId(tenant.id);
        setProfile(tenant.profile ?? null);
        if (active) setReady(true);
      } catch {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!ready) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontFamily: "system-ui, sans-serif" }}>
        Loading…
      </div>
    );
  }
  return <>{children}</>;
}
