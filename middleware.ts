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
            // Already on the portfolio path — don't loop.
            if (!url.pathname.startsWith("/portfolio")) {
                return rewrite(new URL("/portfolio", url));
            }
        }
    } catch {
        /* never let host routing take down a request — fall through */
    }
    return next();
}
