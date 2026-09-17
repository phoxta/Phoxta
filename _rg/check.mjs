import puppeteer from "puppeteer";

const BASE = "http://localhost:3015";
const out = [];
const log = (...a) => { out.push(a.join(" ")); console.log(...a); };

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 1000 });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

async function as(memberId, path) {
    try { await page.goto(BASE + "/", { waitUntil: "domcontentloaded" }); } catch { /* SPA redirect */ }
    await page.evaluate((id) => {
        localStorage.setItem("wafe:mode", "demo");
        localStorage.setItem("wafe:demo:view-as", id);
    }, memberId);
    for (let i = 0; i < 3; i++) {
        try {
            await page.goto(BASE + path, { waitUntil: "domcontentloaded" });
            break;
        } catch { await new Promise((r) => setTimeout(r, 400)); }
    }
    await new Promise((r) => setTimeout(r, 2600));
    return await page.evaluate(() => document.body.innerText);
}

function check(name, ok, extra = "") {
    log(`${ok ? "PASS" : "FAIL"} — ${name}${extra ? " :: " + extra : ""}`);
}

// 1. Children and the blueprint
for (const kid of ["mem-tobi", "mem-ayo", "mem-dami"]) {
    const t = await as(kid, "/execute/goals/blueprint");
    const leaks = ["5,000", "18,000", "MONEY", "deposit"].filter((w) => t.includes(w));
    check(`${kid} blueprint carries no amounts`, leaks.length === 0, leaks.join(","));
    check(`${kid} blueprint still shows the vision`, t.includes("Grace Chapel") || t.includes("2031"));
}

// 2. Dami and the family-scope goal she carries
{
    const t = await as("mem-dami", "/execute/goals");
    check("dami: no family goal title on the list", !t.includes("Record a song"), "");
    check("dami: sees the child-safe line instead", t.includes("making a song for Grandma"));
    const t2 = await as("mem-dami", "/execute/goals/goal-12");
    check("dami: goal-12 page has no description", !t2.includes("Dami on the keys"));
    check("dami: her own goal is intact", (await as("mem-dami", "/execute/goals")).includes("Grade 7"));
}

// 3. Parent, the deposit goal and the ledger
{
    let t = await as("mem-ife", "/execute/goals/goal-2");
    check("parent: deposit goal reads the seeded number", t.includes("16,200"), t.slice(0, 0));
    check("parent: no GCSE tasks under the deposit goal", !t.includes("history essay") && !t.includes("revision guides"));

    // Move the ledger.
    await page.evaluate(() => {
        const raw = localStorage.getItem("wafe:demo:finance:v1");
        if (!raw) throw new Error("no finance state");
        const s = JSON.parse(raw);
        const f = s.savingsGoals.find((g) => g.id === "fund-home-deposit");
        f.currentCents = 2120000;
        localStorage.setItem("wafe:demo:finance:v1", JSON.stringify(s));
    });
    await page.reload({ waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 2500));
    t = await page.evaluate(() => document.body.innerText);
    check("parent: the goal follows the ledger", t.includes("21,200"), t.includes("16,200") ? "still 16,200" : "");
    check("parent: percentage recomputed to 71%", t.includes("71%"));
    check("parent: reading panel says it comes from Finance", t.includes("Open the pot in Finance"));
    check("parent: no typed-total box on a ledger goal", !t.includes("New total"));

    // The stored series caught up, so the dashboard agrees.
    const stored = await page.evaluate(() => {
        const s = JSON.parse(localStorage.getItem("wafe:demo:goals:v1"));
        const rows = s.metrics.filter((m) => m.ref === "fund-home-deposit");
        return rows[rows.length - 1].current;
    });
    check("parent: the reading was recorded (" + stored + ")", stored === 2120000);
}

// 4. Adding a milestone to a metric goal does not take the number away
{
    await as("mem-ife", "/execute/goals/goal-2");
    await page.evaluate(() => {
        const inputs = [...document.querySelectorAll("input")];
        const el = inputs.find((i) => i.getAttribute("placeholder") === "Complete the medical forms");
        if (!el) throw new Error("no milestone field");
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        setter.call(el, "Set up the standing order");
        el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await page.evaluate(() => {
        const btn = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Add" && b.type === "submit");
        btn.click();
    });
    await new Promise((r) => setTimeout(r, 1200));
    const t = await page.evaluate(() => document.body.innerText);
    check("metric goal keeps its mode after a milestone", t.includes("Measured from a number"), t.includes("Counted from milestones") ? "flipped to milestones" : "");
    check("metric goal keeps its percentage", t.includes("71%"));
}

// 5. Guests
{
    const t = await as("mem-folake", "/execute/goals/blueprint");
    check("guest: blueprint has no amounts", !t.includes("18,000") && !t.includes("5,000"));
}

log("PAGE ERRORS: " + (errors.length ? errors.join(" | ") : "none"));
await browser.close();
