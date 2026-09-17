import { launch, boot, text, sleep, clickText, BASE } from "./h.mjs";

const { browser, page, errors } = await launch({ width: 390, height: 844 });
await page.evaluateOnNewDocument(() => {
    window.__spoken = [];
    const s = window.speechSynthesis;
    const orig = s.speak.bind(s);
    s.speak = (u) => { window.__spoken.push(u.text); try { orig(u); } catch (e) { void e; } };
});
await boot(page, "mem-ayo", "/grow/curricula");

// every feed tile must offer read-aloud
const tiles = await page.evaluate(() => {
    const btns = [...document.querySelectorAll("button")].filter((b) => /Read it to me|Hear it|Read my day/i.test(b.innerText));
    return { count: btns.length, labels: btns.map((b) => b.innerText.trim()) };
});
console.log("read-aloud buttons:", tiles);

// click each one and confirm speech
const n = await page.evaluate(() => [...document.querySelectorAll("button")].filter((b) => /Read it to me/i.test(b.innerText)).length);
for (let i = 0; i < n; i++) {
    await page.evaluate((i) => {
        const b = [...document.querySelectorAll("button")].filter((x) => /Read it to me|Stop/i.test(x.innerText))[i];
        if (b) { b.scrollIntoView({ block: "center" }); b.click(); }
    }, i);
    await sleep(300);
}
console.log("spoken utterances:", await page.evaluate(() => window.__spoken.length));
console.log("spoken sample:", (await page.evaluate(() => window.__spoken)).slice(0, 6));

// points before
const pts = async () => page.evaluate(() => { const m = document.body.innerText.match(/(\d+)\s*pts/); return m ? Number(m[1]) : null; });
console.log("points before:", await pts());

// character challenge: pick a reflection chip then "I did it"
console.log("chip:", await clickText(page, "button", "It was tricky"));
console.log("I did it:", await clickText(page, "button", "I did it", { exact: true }));
await sleep(1200);
let t = await text(page);
console.log("points after:", await pts());
console.log("challenge marked done?", /done this month/.test(t));
console.log("snippet:", t.slice(t.indexOf("Diligence challenge"), t.indexOf("Diligence challenge") + 420));

// reload — persistence
await page.reload({ waitUntil: "networkidle2" });
await sleep(1000);
t = await text(page);
console.log("after reload points:", await pts());
console.log("after reload challenge snippet:", t.slice(t.indexOf("Diligence challenge"), t.indexOf("Diligence challenge") + 420));
console.log("ERRORS:", errors);
await browser.close();
