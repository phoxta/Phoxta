import puppeteer from "puppeteer";

export const BASE = "http://localhost:3015";

export async function launch({ width = 1280, height = 900 } = {}) {
    const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"], defaultViewport: { width, height } });
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push({ type: "pageerror", text: String(e.message || e) }));
    page.on("console", (m) => {
        if (m.type() === "error" || m.type() === "warning") errors.push({ type: m.type(), text: m.text().slice(0, 400) });
    });
    page.on("requestfailed", (r) => errors.push({ type: "requestfailed", text: `${r.url()} ${r.failure()?.errorText}` }));
    return { browser, page, errors };
}

export async function boot(page, viewAs = "mem-ife", path = "/execute/tasks", { reset = false } = {}) {
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await page.evaluate((v, reset) => {
        localStorage.setItem("wafe:mode", "demo");
        localStorage.setItem("wafe:demo:view-as", v);
        if (reset) for (const k of Object.keys(localStorage)) if (k.startsWith("wafe:demo:") && k !== "wafe:demo:view-as") localStorage.removeItem(k);
    }, viewAs, reset);
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle2" });
    await sleep(900);
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function text(page) {
    return page.evaluate(() => document.body.innerText);
}

export async function clickByText(page, selector, needle, { exact = false, nth = 0 } = {}) {
    const handles = await page.$$(selector);
    let i = 0;
    for (const h of handles) {
        const t = (await h.evaluate((el) => el.innerText || el.textContent || "")).trim();
        const ok = exact ? t === needle : t.includes(needle);
        if (ok) {
            if (i === nth) {
                await h.evaluate((el) => el.scrollIntoView({ block: "center" }));
                await h.click();
                return true;
            }
            i += 1;
        }
    }
    return false;
}

export async function tasksState(page) {
    return page.evaluate(() => JSON.parse(localStorage.getItem("wafe:demo:tasks:v1") || "null"));
}

export async function imageAudit(page) {
    return page.evaluate(() => [...document.images].map((i) => ({ src: i.currentSrc || i.src, ok: i.naturalWidth > 0, alt: i.getAttribute("alt"), w: i.getAttribute("width"), h: i.getAttribute("height"), loading: i.getAttribute("loading") })));
}

export async function hscroll(page) {
    return page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
}
