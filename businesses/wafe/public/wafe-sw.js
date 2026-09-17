/*
 * Wàfè — the offline shell.
 *
 * A family planner that only works with a signal is not a family planner:
 * Home, today's list and the packing list for a trip you are actually ON are
 * exactly the screens you need on a plane, in a car park, at Mama Fọláké's on
 * a bad line. The app's own data lives in the browser (localStorage in the
 * demo), so the only thing standing between the family and an offline Wàfè is
 * the shell — this file caches it.
 *
 * Deliberately small and dependency-free:
 *
 *  - Navigations are network-first, falling back to the cached shell, so the
 *    family never sees a stale app while they have a signal.
 *  - Hashed build assets (/assets/…) are immutable, so they are cache-first.
 *  - Everything else same-origin, plus the web fonts, is network-first with a
 *    cache fallback — which also keeps the Vite dev server honest.
 *  - The API is NEVER cached. A family's own data must not be served stale by
 *    a worker that cannot know who is asking.
 */

const CACHE = "wafe-shell-v1";
const SHELL = "/";

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(CACHE)
            .then((c) => c.add(new Request(SHELL, { cache: "reload" })))
            .catch(() => undefined)
            .then(() => self.skipWaiting()),
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
            .then(() => self.clients.claim()),
    );
});

self.addEventListener("message", (event) => {
    if (event.data === "wafe:skip-waiting") self.skipWaiting();
});

function keep(request, response) {
    if (!response || (!response.ok && response.type !== "opaque")) return;
    const copy = response.clone();
    caches
        .open(CACHE)
        .then((c) => c.put(request, copy))
        .catch(() => undefined);
}

/** Data, never the shell: whatever answers here must come off the network. */
function isData(url) {
    return url.hostname.endsWith("supabase.co") || url.hostname.endsWith("supabase.in") || url.pathname.startsWith("/rest/") || url.pathname.startsWith("/functions/");
}

const OFFLINE_HTML =
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Wàfè — offline</title>' +
    '<body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#F4EFE6;color:#2A2A26;font:16px/1.6 system-ui,sans-serif">' +
    '<main style="max-width:32ch;padding:24px;text-align:center"><h1 style="font-size:22px;margin:0 0 8px">You are offline</h1>' +
    "<p style=\"margin:0;opacity:.7\">Wàfè hasn't been opened on this device yet, so there is nothing saved to show. Connect once and it will work without a signal after that.</p></main>";

const offlinePage = () => new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 200 });

self.addEventListener("fetch", (event) => {
    const request = event.request;
    if (request.method !== "GET") return;

    let url;
    try {
        url = new URL(request.url);
    } catch {
        return;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") return;
    if (isData(url)) return;

    // A page load: fresh when we can, the cached shell when we cannot.
    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request)
                .then((res) => {
                    keep(request, res);
                    return res;
                })
                .catch(() =>
                    caches
                        .match(request)
                        .then((hit) => hit || caches.match(SHELL))
                        .then((hit) => hit || offlinePage()),
                ),
        );
        return;
    }

    const sameOrigin = url.origin === self.location.origin;

    // Hashed build output never changes under its own name.
    if (sameOrigin && url.pathname.startsWith("/assets/")) {
        event.respondWith(
            caches.match(request).then(
                (hit) =>
                    hit ||
                    fetch(request).then((res) => {
                        keep(request, res);
                        return res;
                    }),
            ),
        );
        return;
    }

    event.respondWith(
        fetch(request)
            .then((res) => {
                keep(request, res);
                return res;
            })
            .catch(() => caches.match(request).then((hit) => hit || Response.error())),
    );
});
