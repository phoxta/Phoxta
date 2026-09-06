/**
 * Capture the portfolio screenshots for the WamWam case study.
 *
 * The previous set was shot from the retired travel storefront, so they still
 * showed its wordmark. These come from the live site.
 *
 * Sections are located by their content rather than by DOM position, so the
 * shots stay correct if the home page is reordered. Each target's aspect ratio
 * matches the file it replaces, so the case-study layout is unchanged.
 *
 * Run:  node scripts/shoot-wamwam-portfolio.mjs
 * Then: node scripts/portfolio-variants.mjs   (writes the -960 / -480 variants)
 */
import puppeteer from "puppeteer";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const URL = process.env.WAMWAM_URL ?? "https://demo.wamwam.phoxta.com";
const OUT = "scripts/.shots";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";

/** Full-viewport hero, then three sections found by the text they contain. */
const TARGETS = [
    { name: "wamwam", viewport: { width: 1600, height: 1000 }, hero: true },
    { name: "wamwam-shelf", viewport: { width: 1920, height: 1080 }, contains: "Osaka" },
    { name: "wamwam-why", viewport: { width: 1920, height: 1080 }, contains: "earned" },
    { name: "wamwam-inspiration", viewport: { width: 1920, height: 1080 }, contains: "Mexico City" },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The catalogue gate replaces the whole tree until hydration settles. */
async function waitForContent(page) {
    await page.waitForFunction(() => !!document.querySelector("main") && !!document.querySelector("h1"), {
        timeout: 60000,
    });
    await page.evaluate(() => document.fonts.ready);
    await sleep(1200);
}

/** Force every lazy image to load, then wait for them all to decode. */
async function loadAllImages(page) {
    await page.evaluate(async () => {
        for (const img of document.querySelectorAll("img")) img.loading = "eager";
        await new Promise((resolve) => {
            let y = 0;
            const step = () => {
                y += 600;
                window.scrollTo(0, y);
                if (y < document.body.scrollHeight) requestAnimationFrame(step);
                else resolve();
            };
            step();
        });
        window.scrollTo(0, 0);
    });
    await page.evaluate(() =>
        Promise.all(
            [...document.images].filter((i) => !i.complete).map((i) => new Promise((r) => {
                i.addEventListener("load", r, { once: true });
                i.addEventListener("error", r, { once: true });
            })),
        ),
    );
    await sleep(800);
}

/** Bounding box of the <section> whose text contains `needle`. */
async function sectionBox(page, needle) {
    return page.evaluate((text) => {
        const el = [...document.querySelectorAll("main section, main > div > section, section")].find((s) =>
            (s.textContent ?? "").includes(text),
        );
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.x + window.scrollX, y: r.y + window.scrollY, width: r.width, height: r.height };
    }, needle);
}

const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: "new",
    args: ["--hide-scrollbars", "--force-device-scale-factor=1", "--disable-gpu"],
});

mkdirSync(OUT, { recursive: true });
const results = [];

for (const t of TARGETS) {
    const page = await browser.newPage();
    await page.setViewport({ ...t.viewport, deviceScaleFactor: 1 });
    await page.goto(URL, { waitUntil: "networkidle2", timeout: 90000 });
    await waitForContent(page);
    await loadAllImages(page);

    const path = join(OUT, `${t.name}.png`);
    if (t.hero) {
        await page.screenshot({ path, clip: { x: 0, y: 0, ...t.viewport } });
        results.push(`${t.name}: hero ${t.viewport.width}x${t.viewport.height}`);
    } else {
        const box = await sectionBox(page, t.contains);
        if (!box) {
            results.push(`${t.name}: SECTION NOT FOUND ("${t.contains}")`);
            await page.close();
            continue;
        }
        // Trim the section's vertical padding so the shot is the content, not whitespace.
        const pad = 48;
        const clip = {
            x: 0,
            y: Math.max(0, Math.round(box.y + pad)),
            width: t.viewport.width,
            height: Math.max(200, Math.round(box.height - pad * 2)),
        };
        await page.screenshot({ path, clip, captureBeyondViewport: true });
        results.push(`${t.name}: "${t.contains}" ${clip.width}x${clip.height} at y=${clip.y}`);
    }
    await page.close();
}

await browser.close();
console.log(results.map((r) => "  " + r).join("\n"));
