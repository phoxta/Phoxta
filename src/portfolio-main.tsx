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
let booted = false;
const boot = () => {
    if (booted) return;
    booted = true;
    void import("./portfolio-app").then((m) => m.mount());
};

if (root && root.childElementCount > 0) {
    // Let the images that ARE the page (portrait, hero) finish before the app's
    // chunks compete for bandwidth: boot on `load`, or after 4 s at the latest.
    if (document.readyState === "complete") requestAnimationFrame(() => setTimeout(boot, 0));
    else window.addEventListener("load", () => requestAnimationFrame(() => setTimeout(boot, 0)), { once: true });
    setTimeout(boot, 4000);
} else {
    boot();
}
