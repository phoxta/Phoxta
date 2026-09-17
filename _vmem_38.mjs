import { boot, go, shot, setViewAs } from "./_vmem_lib.mjs";
import { clickExact, dialogText } from "./_vmem_lib2.mjs";
const { browser, page, errors } = await boot({});
await go(page, "/create/memories/reels/reel-seven-years", 3500);
for (let i=0;i<6;i++){ if(await page.evaluate(()=>!!Array.from(document.querySelectorAll("dialog")).find(x=>x.open))) break; await clickExact(page,"Share"); await new Promise(r=>setTimeout(r,900)); }
console.log("dialog open:", (await dialogText(page)).slice(0,60).replace(/\n/g," "));
console.log("pick pastor:", await page.evaluate(()=>{ const d=Array.from(document.querySelectorAll("dialog")).find(x=>x.open); const b=Array.from(d.querySelectorAll("button")).find(b=>b.innerText.trim()==="Pastor"); if(!b) return "no btn"; b.click(); return "ok"; }));
await new Promise(r=>setTimeout(r,500));
console.log("save:", await clickExact(page, "Save who can see it"));
await new Promise(r=>setTimeout(r,2000));
console.log("shares:", JSON.stringify(await page.evaluate(()=>JSON.parse(localStorage.getItem("wafe:demo:memories:v1")).shares.filter(g=>g.objectId==="reel-seven-years"))));
await setViewAs(page, "mem-dayo");
await go(page, "/create/memories", 3000);
console.log("PASTOR SEES:", (await page.evaluate(()=>document.querySelector("main")?.innerText||"")).slice(0,500).replace(/\n+/g," / "));
await shot(page,"20-pastor");
console.log("errors:", errors.filter(e=>e.startsWith("pageerror")).slice(0,3).join(" ~ ")||"none");
await browser.close();
