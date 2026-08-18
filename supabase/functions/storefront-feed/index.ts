// Phoxta — storefront-feed: the demand engine's data layer, shipped once by
// the platform and inherited by every tenant.
//
//   GET ?host=<tenant host>&format=schema   → schema.org ItemList of Product JSON-LD
//   GET ?host=<tenant host>&format=jsonl    → JSONL product feed (OpenAI commerce
//                                             feed / Google Merchant compatible fields)
//   GET ?host=<tenant host>&format=sitemap  → XML sitemap of storefront pages
//
// Deploy with --no-verify-jwt: crawlers and AI shopping agents fetch these
// URLs directly. Data is the same anon-readable catalog the storefront renders.
import { adminClient } from "../_shared/supabaseAdmin.ts";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "content-type" };

function xml(s: string) { return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c] as string)); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const url = new URL(req.url);
    const host = (url.searchParams.get("host") ?? "").toLowerCase().trim();
    const format = url.searchParams.get("format") ?? "schema";
    if (!host) return new Response(JSON.stringify({ error: "host required" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });

    const admin = adminClient();
    const { data } = await admin.rpc("app_resolve_domain", { p_host: host });
    const org = Array.isArray(data) ? data[0] : data;
    if (!org?.organization_id) return new Response(JSON.stringify({ error: "unknown host" }), { status: 404, headers: { ...CORS, "Content-Type": "application/json" } });

    const base = `https://${host}`;
    // Feed consumers need absolute image URLs; catalog rows may store
    // storefront-relative asset paths.
    const absImg = (u: string | null) => (!u ? undefined : u.startsWith("http") ? u : `${base}${u.startsWith("/") ? "" : "/"}${u}`);
    const { data: products } = await admin
      .from("products")
      .select("id, name, description, price_cents, currency, stock, status, image_url, metadata, created_at")
      .eq("organization_id", org.organization_id)
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(500);
    const items = products ?? [];

    if (format === "sitemap") {
      const staticPaths = ["/", "/shop", "/about", "/contact", "/faq", "/blog"];
      const urls = [
        ...staticPaths.map((p) => `<url><loc>${xml(base + p)}</loc></url>`),
        ...items.map((p) => `<url><loc>${xml(`${base}/product/${p.id}`)}</loc></url>`),
      ].join("");
      return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
        { headers: { ...CORS, "Content-Type": "application/xml", "Cache-Control": "public, max-age=900" } });
    }

    if (format === "jsonl") {
      // One JSON object per line — OpenAI product-feed spec core fields,
      // Google Merchant-compatible names. Refreshable every 15 minutes.
      const lines = items.map((p) => JSON.stringify({
        id: p.id,
        title: p.name,
        description: (p.description ?? "").slice(0, 5000),
        link: `${base}/product/${p.id}`,
        image_link: absImg(p.image_url),
        price: `${(p.price_cents / 100).toFixed(2)} ${p.currency || "USD"}`,
        availability: p.stock === null || p.stock > 0 ? "in_stock" : "out_of_stock",
        brand: org.name,
        identifier_exists: false,
        condition: "new",
      })).join("\n");
      return new Response(lines, { headers: { ...CORS, "Content-Type": "application/jsonl", "Cache-Control": "public, max-age=900" } });
    }

    // Default: schema.org ItemList of Products.
    const graph = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `${org.name} — catalog`,
      url: base,
      numberOfItems: items.length,
      itemListElement: items.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "Product",
          "@id": `${base}/product/${p.id}`,
          name: p.name,
          description: (p.description ?? "").slice(0, 2000),
          image: absImg(p.image_url),
          brand: { "@type": "Brand", name: org.name },
          offers: {
            "@type": "Offer",
            url: `${base}/product/${p.id}`,
            price: (p.price_cents / 100).toFixed(2),
            priceCurrency: p.currency || "USD",
            availability: p.stock === null || p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            seller: { "@type": "Organization", name: org.name },
          },
        },
      })),
    };
    return new Response(JSON.stringify(graph), { headers: { ...CORS, "Content-Type": "application/ld+json", "Cache-Control": "public, max-age=900" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String((err as Error)?.message || err) }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});
