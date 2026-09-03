// Vercel Edge Middleware — host-based routing that runs BEFORE the filesystem.
//
// The only reason this exists: femi.phoxta.com is a personal portfolio served
// from the same project as phoxta.com. A vercel.json rewrite can't put the
// portfolio at the subdomain's ROOT, because `/` matches the real dist/index.html
// and rewrites only apply on a filesystem miss. Middleware runs first, so it can
// rewrite the femi.phoxta.com document requests to the prerendered /portfolio
// HTML — giving crawlers and the first paint the right page. The SPA's own host
// detection (src/App.tsx) keeps rendering the portfolio client-side after that.
//
// Everything that is NOT femi.phoxta.com passes straight through untouched.
import { rewrite, next } from "@vercel/edge";
import { CASE_STUDIES } from "./src/shared/portfolio/caseStudies";

export const config = {
    // Document navigations plus the two SEO files. Skip everything else with a
    // dot (assets: .js, .css, .webp, …) and the /assets folder, so static files
    // are served directly and never routed through here.
    matcher: ["/((?!assets/|.*\\.).*)", "/robots.txt", "/sitemap.xml"],
};

const PORTFOLIO_HOSTS = new Set(["femi.phoxta.com"]);
// Every document path the portfolio actually serves. Anything else on the
// subdomain is a real 404 (status code included) rather than a 200 that
// redirects in JavaScript — the soft-404 pattern search engines penalise.
const WORK_SLUGS = new Set(CASE_STUDIES.map((c) => c.slug));

const NOT_FOUND_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Page not found · Femi Adeyemi</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:"DM Sans",system-ui,sans-serif;background:#faf9f7;color:#1b1a17}main{text-align:center;padding:40px}h1{font-size:clamp(28px,5vw,44px);letter-spacing:-.02em;margin:0 0 12px}p{color:#6f6a60;margin:0 0 28px}a{display:inline-block;padding:12px 22px;border-radius:999px;background:#1b1a17;color:#fff;text-decoration:none;font-weight:600}</style></head><body><main><h1>That page isn't here.</h1><p>It may have moved when the portfolio was reorganised.</p><a href="/">Back to the work</a></main></body></html>`;

export default function middleware(request: Request): Response {
    try {
        // host can carry a port in dev; strip it before comparing.
        const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
        if (PORTFOLIO_HOSTS.has(host)) {
            const url = new URL(request.url);
            const p = url.pathname.replace(/\/+$/, "") || "/";
            // The portfolio's own robots + sitemap (the defaults belong to phoxta.com).
            if (p === "/robots.txt") return rewrite(new URL("/femi-robots.txt", url));
            if (p === "/sitemap.xml") return rewrite(new URL("/femi-sitemap.xml", url));
            // Jobtra is a separate app served at /jobtra. Its static files (assets,
            // index.html) carry a dot and are excluded by the matcher, so they're
            // served directly; only its dotless app paths reach here → serve its
            // index so the SPA boots.
            if (p === "/jobtra" || p.startsWith("/jobtra/")) {
                return rewrite(new URL("/jobtra/index.html", url));
            }
            // Jobtra's AI backend. Let it fall through to the Vercel functions /
            // rewrites rather than becoming the portfolio.
            if (p.startsWith("/api/")) {
                return next();
            }
            // The portfolio: root → prerendered /portfolio; /work/<slug> → its
            // prerendered /portfolio/work/<slug>. Anything else is a 404.
            if (p === "/" || p === "/portfolio") return rewrite(new URL("/portfolio", url));
            const work = p.match(/^(?:\/portfolio)?\/work\/([a-z0-9-]+)$/);
            if (work && WORK_SLUGS.has(work[1])) {
                return rewrite(new URL(`/portfolio/work/${work[1]}`, url));
            }
            return new Response(NOT_FOUND_HTML, {
                status: 404,
                headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
            });
        }
    } catch {
        /* never let host routing take down a request — fall through */
    }
    return next();
}
