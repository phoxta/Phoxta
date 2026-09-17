import puppeteer from "puppeteer";

const OUT = process.argv[2];
const BASE = "http://localhost:4317";

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1100, deviceScaleFactor: 2 });

const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = async (name) => { await wait(900); await page.screenshot({ path: `${OUT}/${name}.png`, captureBeyondViewport: false }); console.log("  shot:", name); };
const clickText = async (sel, re) => page.evaluate((s, r) => {
    const el = [...document.querySelectorAll(s)].find((b) => new RegExp(r, "i").test(b.textContent || ""));
    if (el) { el.click(); return el.textContent.trim().slice(0, 60); }
    return null;
}, sel, re.source ?? re);

await page.goto(BASE + "/", { waitUntil: "networkidle2" });
console.log("demo:", await clickText("button, a, [role=button]", /explore the demo/));
await wait(1800);

// 1. Sessions page, before.
await page.goto(BASE + "/sessions", { waitUntil: "networkidle2" });
await wait(900);
const before = await page.evaluate(() => document.querySelectorAll("h3").length);
console.log("session cards before:", before);
await shot("10-sessions-before");

// 2. A bookable mentor. Amara takes 1:1s.
await page.goto(BASE + "/mentors/m-amara", { waitUntil: "networkidle2" });
await wait(2200);
const panel = await page.evaluate(() => {
    const h = [...document.querySelectorAll("h2")].find((x) => /book a 1:1/i.test(x.textContent || ""));
    if (!h) return null;
    const card = h.closest("div")?.parentElement;
    return (card?.textContent || "").replace(/\s+/g, " ").slice(0, 200);
});
console.log("booking panel:", panel);
await shot("11-booking-panel");

// 3. Pick a day, then a time.
const dayBtn = await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => /free$/i.test((x.textContent || "").trim()));
    if (b) { b.click(); return b.textContent.replace(/\s+/g, " ").trim(); }
    return null;
});
console.log("day picked:", dayBtn);
await wait(600);

const timeBtn = await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => /^\d{1,2}[:.]\d{2}(\s?[ap]m)?$/i.test((x.textContent || "").trim()));
    if (b) { b.click(); return b.textContent.trim(); }
    return null;
});
console.log("time picked:", timeBtn);
await wait(700);

await page.evaluate(() => {
    const t = document.querySelector("#agenda");
    if (t) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
        setter.call(t, "Pricing the four-site clinic deal — I keep wanting to say a small number.");
        t.dispatchEvent(new Event("input", { bubbles: true }));
    }
});
await shot("12-slot-picked");

const confirmed = await clickText("button", /^confirm/i);
console.log("confirm clicked:", confirmed);
await wait(2200);
await shot("13-after-confirm");

// 4. Back to sessions — did it land?
await page.goto(BASE + "/sessions", { waitUntil: "networkidle2" });
await wait(1200);
const after = await page.evaluate(() => {
    const cards = [...document.querySelectorAll("h3")].map((h) => h.textContent.trim());
    const agendas = [...document.querySelectorAll("p")].map((p) => p.textContent.trim()).filter((t) => /four-site clinic/i.test(t));
    return { count: cards.length, cards, foundAgenda: agendas.length > 0 };
});
console.log("session cards after:", after.count, after.cards);
console.log("new agenda visible:", after.foundAgenda);
await shot("14-sessions-after");

console.log("\nconsole errors:", errors.length);
errors.slice(0, 6).forEach((e) => console.log("   !", e.slice(0, 160)));

await browser.close();
