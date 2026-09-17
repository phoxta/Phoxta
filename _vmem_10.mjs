import { boot, go, txt, shot, clickText } from "./_vmem_lib.mjs";
const { browser, page, errors } = await boot({});
await go(page, "/create/memories/reels/reel-seven-years", 2000);
console.log("--- REEL PAGE (parent) ---");
console.log((await txt(page)).slice(0,2500));
// find share button
const btns = await page.evaluate(()=>Array.from(document.querySelectorAll("button,a")).map(b=>b.innerText.trim()).filter(Boolean));
console.log("BUTTONS:", JSON.stringify(btns));
await shot(page,"05-reelpage");
console.log("errors:", errors.slice(0,10).join(" | ")||"none");
await browser.close();
