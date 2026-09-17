import { boot, go } from "./_vmem_lib.mjs";
const { browser, page, errors } = await boot({});
const targets = ["/execute/goals/goal-12","/grow/bible/prayer","/grow/curricula","/live/travel/trip-lakes","/create/memories/albums/album-chapel"];
for (const t of targets) {
  const n = errors.length;
  await go(page, t, 2500);
  const main = await page.evaluate(()=>document.querySelector("main")?.innerText||"(no main)");
  console.log("##", t, "->", main.slice(0,110).replace(/\n+/g," / "), "| err:", errors.slice(n).filter(e=>e.startsWith("pageerror")).slice(0,1).join("")||"clean");
}
await browser.close();
