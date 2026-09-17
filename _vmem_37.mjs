import { boot, go, shot, setViewAs } from "./_vmem_lib.mjs";
import { clickExact, dialogText } from "./_vmem_lib2.mjs";
const { browser, page, errors } = await boot({});
await go(page, "/create/memories/reels/reel-seven-years", 2000);
await clickExact(page, "Share"); await new Promise(r=>setTimeout(r,900));
// tick Pastor in the member multipicker
const t = await page.evaluate(()=>{ const d=Array.from(document.querySelectorAll("dialog")).find(x=>x.open); const b=Array.from(d.querySelectorAll("button")).find(b=>b.innerText.trim()==="Pastor"); if(!b) return "no pastor btn"; b.click(); return "clicked"; });
console.log("pick pastor:", t);
await new Promise(r=>setTimeout(r,400));
console.log("save grants:", await clickExact(page, "Save who can see it"));
await new Promise(r=>setTimeout(r,1800));
console.log("grants now:", JSON.stringify(await page.evaluate(()=>JSON.parse(localStorage.getItem("wafe:demo:memories:v1")).shares.filter(g=>g.objectId==="reel-seven-years"))));
await setViewAs(page, "mem-dayo");
await go(page, "/create/memories", 3000);
console.log("PASTOR SEES:", (await page.evaluate(()=>document.querySelector("main")?.innerText||"")).slice(0,600).replace(/\n+/g," / "));
await shot(page,"20-pastor");
console.log("errors:", errors.filter(e=>e.startsWith("pageerror")).slice(0,3).join(" ~ ")||"none");
await browser.close();
