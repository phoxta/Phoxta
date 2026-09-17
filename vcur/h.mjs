import puppeteer from "puppeteer";

export const BASE = "http://localhost:3015";

export async function launch({ width = 1280, height = 900 } = {}) {
    const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-dev-shm-usage"], defaultViewport: { width, height } });
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
    page.on("requestfailed", (r) => errors.push("reqfail: " + r.url() + " " + (r.failure()?.errorText || "")));
    return { browser, page, errors };
}

export async function boot(page, viewAs = "mem-ife", path = "/") {
    await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
    await page.evaluate((v) => {
        localStorage.setItem("wafe:mode", "demo");
        localStorage.setItem("wafe:demo:view-as", v);
    }, viewAs);
    await page.goto(BASE + path, { waitUntil: "networkidle2" });
    await sleep(900);
}

export async function viewAs(page, v, path) {
    await page.evaluate((x) => localStorage.setItem("wafe:demo:view-as", x), v);
    await page.goto(BASE + path, { waitUntil: "networkidle2" });
    await sleep(900);
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function text(page) {
    return page.evaluate(() => document.body.innerText);
}

export async function clickText(page, sel, needle, { exact = false, nth = 0 } = {}) {
    const ok = await page.evaluate((sel, needle, exact, nth) => {
        const els = [...document.querySelectorAll(sel)];
        const hits = els.filter((e) => {
            const t = (e.innerText || e.textContent || "").trim();
            return exact ? t === needle : t.includes(needle);
        });
        const el = hits[nth];
        if (!el) return false;
        el.scrollIntoView({ block: "center" });
        el.click();
        return true;
    }, sel, needle, exact, nth);
    if (ok) await sleep(500);
    return ok;
}

export async function hscroll(page) {
    return page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
}

export async function imgs(page) {
    return page.evaluate(() => [...document.querySelectorAll("img")].map((i) => ({ src: i.currentSrc || i.src, nw: i.naturalWidth, alt: i.getAttribute("alt"), w: i.getAttribute("width"), h: i.getAttribute("height"), loading: i.getAttribute("loading") })));
}

export async function setInput(page, selector, value, index = 0) {
    return page.evaluate((selector, value, index) => {
        const el = [...document.querySelectorAll(selector)][index];
        if (!el) return false;
        const proto = el.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : el.tagName === "SELECT" ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
    }, selector, value, index);
}
