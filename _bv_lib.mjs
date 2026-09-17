import puppeteer from "puppeteer";

export const BASE = "http://localhost:3015";
export const SHOTS = "C:/Users/ARTSTA~1/AppData/Local/Temp/claude/c--Users-Artstanding-Documents-Phoxta-MBA-Phoxta-Engineering-1-Orisa-reactjs/82de2f4a-70be-4724-ae40-254a24760d15/scratchpad/shots";

export async function launch(width = 1280, height = 900) {
    const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--window-size=" + width + "," + height] });
    const page = await browser.newPage();
    await page.setViewport({ width, height });
    const errs = [];
    page.on("pageerror", (e) => errs.push("PAGEERROR: " + e.message));
    page.on("console", (m) => { if (m.type() === "error") errs.push("CONSOLE: " + m.text()); });
    page.on("requestfailed", (r) => errs.push("REQFAIL: " + r.url() + " " + (r.failure()?.errorText || "")));
    return { browser, page, errs };
}

export async function boot(page, viewAs, path = "/") {
    await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
    await page.evaluate((v) => {
        localStorage.setItem("wafe:mode", "demo");
        localStorage.setItem("wafe:demo:view-as", v);
    }, viewAs);
    await page.goto(BASE + path, { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 1200));
}

export async function go(page, path) {
    await page.goto(BASE + path, { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 900));
}

export const txt = (page) => page.evaluate(() => document.body.innerText);

export async function clickText(page, sel, text, exact = false) {
    return page.evaluate((sel, text, exact) => {
        const els = [...document.querySelectorAll(sel)];
        const el = els.find((e) => exact ? e.textContent.trim() === text : e.textContent.includes(text));
        if (!el) return false;
        el.click();
        return true;
    }, sel, text, exact);
}

export async function hscroll(page) {
    return page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
}

export async function images(page) {
    return page.evaluate(() => [...document.images].map((i) => ({ src: i.currentSrc || i.src, nw: i.naturalWidth, alt: i.alt, w: i.getAttribute("width"), h: i.getAttribute("height"), loading: i.getAttribute("loading") })));
}
