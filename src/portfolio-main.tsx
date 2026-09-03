// Entry for femi.phoxta.com (portfolio.html) — deliberately tiny.
//
// Every portfolio route is prerendered, so the HTML already IS the page. Loading
// React + router + effects as static imports made the browser evaluate ~150 KB of
// modules before its first paint (FCP ≈ 4.7 s on a throttled phone); mounting
// synchronously pushed it further (≈ 7.6 s). So: when the root already holds
// prerendered markup, wait for the first frame to be painted, then pull in the
// app with a dynamic import and take over the identical DOM. On an empty root
// (dev server, no prerender) mount immediately.
const root = document.getElementById("root");
const boot = () => import("./portfolio-app").then((m) => m.mount());

if (root && root.childElementCount > 0) {
    requestAnimationFrame(() => setTimeout(boot, 0));
} else {
    void boot();
}
