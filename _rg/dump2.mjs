import puppeteer from "puppeteer";
const BASE = "http://localhost:3015";
const b = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
const page = await b.newPage();
await page.setViewport({ width: 1280, height: 1200 });
page.on("pageerror", e => console.log("PAGEERROR", String(e)));
async function as(id, path) {
    try { await page.goto(BASE + "/", { waitUntil: "domcontentloaded" }); } catch {}
    await page.evaluate((i) => { localStorage.setItem("wafe:mode","demo"); localStorage.setItem("wafe:demo:view-as", i); }, id);
    for (let i=0;i<3;i++){ try { await page.goto(BASE+path,{waitUntil:"domcontentloaded"}); break; } catch { await new Promise(r=>setTimeout(r,400)); } }
    await new Promise(r=>setTimeout(r,2500));
    return page.evaluate(()=>document.body.innerText);
}
console.log("===== TOBI BLUEPRINT\n" + (await as("mem-tobi","/execute/goals/blueprint")).slice(0,1200));
console.log("===== DAMI GOALS\n" + (await as("mem-dami","/execute/goals")).slice(0,2000));
console.log("===== IFE GOAL-2\n" + (await as("mem-ife","/execute/goals/goal-2")).slice(0,1600));
await b.close();
