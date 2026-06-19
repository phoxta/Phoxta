// Build-time prerender for the Phoxta marketing routes.
//
// Runs AFTER `vite build` (wired as `postbuild`). It serves the freshly built
// `dist/` with Vite's preview server, drives a headless Chromium over each
// PUBLIC route, waits until React has mounted the per-route <head> tags
// (PageMeta always renders a <link rel="canonical">), then snapshots the fully
// rendered HTML to `dist/<route>/index.html`.
//
// Why snapshot (not node SSG): the app touches window/document at module load
// (GSAP ScrollSmoother, theme init, global effects), so rendering in Node would
// crash. Running the real app in a real browser sidesteps all of that and bakes
// the correct title/description/OG/canonical into static HTML for crawlers and
// non-JS social scrapers. The private app (/dashboard, /auth, /onboarding) is
// intentionally NOT prerendered and stays a client-only SPA.
//
//   node scripts/prerender.mjs        (usually via `npm run build`)

import { preview } from "vite";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Launch a headless browser, picking the right Chromium for the environment:
//  - Vercel / AWS Lambda build images lack Chrome's system libs, so use
//    @sparticuz/chromium (a self-contained Chromium) driven by puppeteer-core.
//  - Locally, use full `puppeteer` with its bundled Chromium.
async function launchBrowser() {
    // Use the bundled serverless Chromium only on an actual Linux serverless
    // build (Vercel cloud / Lambda). When `vercel build` runs locally it also
    // sets VERCEL=1, but there the host's full puppeteer works — so require linux.
    const serverless =
        (!!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME) &&
        process.platform === "linux";
    if (serverless) {
        const chromium = (await import("@sparticuz/chromium")).default;
        const puppeteer = (await import("puppeteer-core")).default;
        return puppeteer.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath(),
            headless: true,
        });
    }
    const puppeteer = (await import("puppeteer")).default;
    return puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(__dirname, "../dist");

// Public, indexable routes — keep in sync with SITEMAP_ROUTES in
// src/seo/seo.config.ts. Private/app routes are deliberately excluded.
const ROUTES = [
    "/",
    "/about",
    "/marketplace",
    "/pricing",
    "/blog",
    "/faqs",
    "/careers",
    "/contact",
    "/team",
    "/invest",
    "/privacy",
    "/terms",
];

const PORT = 4181;

function routeToFile(route) {
    if (route === "/") return resolve(DIST, "index.html");
    return resolve(DIST, `.${route}/index.html`);
}

async function run() {
    const server = await preview({
        preview: { port: PORT, strictPort: true },
        // Quiet the preview logger.
        logLevel: "warn",
    });
    const base = `http://localhost:${PORT}`;

    // Headless Chrome isn't available in every build environment (e.g. Vercel's
    // build image lacks Chrome's system libs). Prerendering is a progressive SEO
    // enhancement, not required for the SPA to work — so if the browser can't
    // launch, skip the snapshots and let the build succeed rather than fail it.
    let browser;
    try {
        browser = await launchBrowser();
    } catch (err) {
        console.warn(
            `\n[prerender] Skipping — could not launch headless Chrome (${String(err.message).split("\n")[0]}).` +
                `\n[prerender] The SPA still ships; static HTML snapshots were not generated in this environment.`,
        );
        await new Promise((res) => server.httpServer.close(res));
        return;
    }

    let ok = 0;
    let failed = 0;

    for (const route of ROUTES) {
        const page = await browser.newPage();
        try {
            await page.setViewport({ width: 1366, height: 900 });
            await page.goto(`${base}${route}`, {
                waitUntil: "networkidle0",
                timeout: 45000,
            });
            // PageMeta (per route) always emits a canonical link once mounted —
            // use it as the "head is ready" signal.
            await page.waitForSelector('link[rel="canonical"]', { timeout: 15000 });

            // De-duplicate head tags. The static index.html shell ships default
            // SEO tags and React appends the per-route ones after mount, so the
            // snapshot can contain several copies. React's correct values come
            // last, so collapse each unique tag to its LAST occurrence.
            await page.evaluate(() => {
                const head = document.head;
                const keepLast = (selector, keyOf) => {
                    const seen = new Map();
                    for (const el of head.querySelectorAll(selector)) {
                        seen.set(keyOf(el), el); // later wins
                    }
                    const keep = new Set(seen.values());
                    for (const el of head.querySelectorAll(selector)) {
                        if (!keep.has(el)) el.remove();
                    }
                };
                keepLast('link[rel="canonical"]', () => "canonical");
                keepLast("meta[name]", (el) => `name:${el.getAttribute("name")}`);
                keepLast("meta[property]", (el) => `property:${el.getAttribute("property")}`);

                // Title: document.title is React's source of truth. Collapse to a
                // single <title> carrying that value.
                const wanted = document.title;
                const titles = head.querySelectorAll("title");
                titles.forEach((el, i) => {
                    if (i < titles.length - 1) el.remove();
                });
                let title = head.querySelector("title");
                if (!title) {
                    title = document.createElement("title");
                    head.appendChild(title);
                }
                title.textContent = wanted;
            });

            const html = await page.content();
            const file = routeToFile(route);
            mkdirSync(dirname(file), { recursive: true });
            writeFileSync(file, html, "utf8");
            ok += 1;
            console.log(`  ✓ ${route.padEnd(22)} → ${file.replace(DIST, "dist")}`);
        } catch (err) {
            failed += 1;
            console.error(`  ✗ ${route.padEnd(22)} ${err.message}`);
        } finally {
            await page.close();
        }
    }

    await browser.close();
    await new Promise((res) => server.httpServer.close(res));

    console.log(`\nPrerender complete: ${ok} ok, ${failed} failed (of ${ROUTES.length}).`);
    if (failed > 0) process.exitCode = 1;
}

run().catch((err) => {
    console.error("Prerender crashed:", err);
    process.exit(1);
});
