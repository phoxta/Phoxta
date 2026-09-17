import puppeteer from "puppeteer";
export const BASE = "http://localhost:3015";
export const SHOTS = "C:/Users/ARTSTA~1/AppData/Local/Temp/claude/c--Users-Artstanding-Documents-Phoxta-MBA-Phoxta-Engineering-1-Orisa-reactjs/82de2f4a-70be-4724-ae40-254a24760d15/scratchpad/shots";

export async function boot({ viewAs = "mem-ife", width = 1280, height = 900, reducedMotion = false, keepStorage = false } = {}) {
    const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--window-size=" + width + "," + height] });
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    if (reducedMotion) await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    const errors = [];
    page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
    page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(m.type() + ": " + m.text().slice(0, 300)); });
    page.on("requestfailed", (r) => errors.push("requestfailed: " + r.url().slice(0, 200) + " " + (r.failure()?.errorText || "")));
    await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
    await page.evaluate((v, keep) => { if (!keep) { /* keep demo data */ } localStorage.setItem("wafe:mode", "demo"); localStorage.setItem("wafe:demo:view-as", v); }, viewAs, keepStorage);
    return { browser, page, errors };
}

export async function go(page, path, waitMs = 1400) {
    await page.goto(BASE + path, { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, waitMs));
}

export async function setViewAs(page, id) {
    await page.evaluate((v) => localStorage.setItem("wafe:demo:view-as", v), id);
}

export async function txt(page) {
    return await page.evaluate(() => (document.querySelector("main") || document.body).innerText);
}

export async function shot(page, name) {
    await page.screenshot({ path: SHOTS + "/" + name + ".png", fullPage: true });
}

export async function imgs(page) {
    return await page.evaluate(() => Array.from(document.images).map((i) => ({ src: i.currentSrc || i.src, ok: i.naturalWidth > 0, w: i.naturalWidth, alt: i.alt, hasDims: !!(i.getAttribute("width") && i.getAttribute("height")), lazy: i.getAttribute("loading") })));
}

export async function hscroll(page) {
    return await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, offenders: Array.from(document.querySelectorAll("main *")).filter((e) => e.getBoundingClientRect().right > document.documentElement.clientWidth + 2).slice(0, 6).map((e) => e.tagName + "." + String(e.className).slice(0, 60)) }));
}

export async function clickText(page, sel, text) {
    return await page.evaluate((s, t) => {
        const el = Array.from(document.querySelectorAll(s)).find((e) => (e.innerText || e.textContent || "").trim().toLowerCase().includes(t.toLowerCase()));
        if (!el) return false; el.click(); return true;
    }, sel, text);
}
