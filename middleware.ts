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

export const config = {
    // Document navigations only. Skip anything with a dot (assets: .js, .css,
    // .webp, …) and the /assets folder, so static files are served directly and
    // never routed through here.
    matcher: ["/((?!assets/|.*\\.).*)"],
};

const PORTFOLIO_HOSTS = new Set(["femi.phoxta.com"]);

export default function middleware(request: Request): Response {
    try {
        // host can carry a port in dev; strip it before comparing.
        const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
        if (PORTFOLIO_HOSTS.has(host)) {
            const url = new URL(request.url);
            const p = url.pathname;
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
            // Everything else on the subdomain is the portfolio. The root maps to
            // the prerendered /portfolio; sub-pages (e.g. /work/coir-six) map to
            // their prerendered /portfolio/<path> so the first paint is correct.
            if (!p.startsWith("/portfolio")) {
                const dest = p === "/" ? "/portfolio" : `/portfolio${p}`;
                return rewrite(new URL(dest, url));
            }
        }
    } catch {
        /* never let host routing take down a request — fall through */
    }
    return next();
}
