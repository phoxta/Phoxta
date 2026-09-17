import puppeteer from "puppeteer";

export const BASEURL = "http://localhost:3015";

export async function launch({ width = 1280, height = 900 } = {}) {
    const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-dev-shm-usage"] });
    const page = await browser.newPage();
    await page.setViewport({ width, height });
    const errs = [];
    page.on("pageerror", (e) => errs.push("PAGEERROR: " + e.message));
    page.on("console", (m) => {
        if (m.type() === "error") errs.push("CONSOLE: " + m.text().slice(0, 300));
    });
    page.on("requestfailed", (r) => errs.push("REQFAIL: " + r.url().slice(0, 160) + " " + (r.failure()?.errorText || "")));
    return { browser, page, errs };
}

export async function setMode(page, viewAs) {
    await page.goto(BASEURL + "/", { waitUntil: "domcontentloaded" });
    await page.evaluate((v) => {
        localStorage.setItem("wafe:mode", "demo");
        localStorage.setItem("wafe:demo:view-as", v);
    }, viewAs);
}

export async function go(page, path) {
    await page.goto(BASEURL + path, { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 700));
}

export async function txt(page) {
    return page.evaluate(() => document.body.innerText);
}

export async function clickText(page, selector, text, { exact = false } = {}) {
    return page.evaluate(
        (sel, t, ex) => {
            const els = [...document.querySelectorAll(sel)];
            const el = els.find((e) => {
                const s = (e.innerText || e.textContent || "").trim();
                return ex ? s === t : s.includes(t);
            });
            if (!el) return false;
            el.scrollIntoView({ block: "center" });
            el.click();
            return true;
        },
        selector,
        text,
        exact
    );
}

export async function dump(page, label) {
    const t = await txt(page);
    console.log(`\n===== ${label} =====\n` + t.slice(0, 4000));
}
