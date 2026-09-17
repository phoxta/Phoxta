import { boot, go, shot } from "./_vmem_lib.mjs";
const { browser, page, errors } = await boot({});
await go(page, "/live/travel", 2500);
await page.evaluate(()=>{ const k="wafe:demo:travel:v1"; const v=JSON.parse(localStorage.getItem(k)); const t=v.trips.find(t=>t.id==="trip-kent"); t.status="done"; localStorage.setItem(k, JSON.stringify(v)); });
await go(page, "/create/memories", 4000);
const t = await page.evaluate(()=>document.querySelector("main")?.innerText||"");
console.log("NOTE:", (t.match(/album[s]? (was|were) made[^\n]*/i)||t.slice(0,0))[0] || "(no note)");
const alb = await page.evaluate(()=>{ const v=JSON.parse(localStorage.getItem("wafe:demo:memories:v1")); return v.albums.filter(a=>a.tripId).map(a=>({id:a.id,title:a.title,tripId:a.tripId,auto:a.auto,photos:v.albumPhotos.filter(ap=>ap.albumId===a.id).length})); });
console.log("TRIP ALBUMS:", JSON.stringify(alb,null,1));
const i = t.indexOf("Trips that came home");
console.log("SECTION:", t.slice(i, i+400));
// idempotency: reload again
await go(page, "/create/memories", 3500);
const alb2 = await page.evaluate(()=>{ const v=JSON.parse(localStorage.getItem("wafe:demo:memories:v1")); return v.albums.filter(a=>a.tripId).length; });
console.log("trip albums after 2nd load (idempotent?):", alb2);
console.log("errors:", errors.filter(e=>e.startsWith("pageerror")).slice(0,3).join(" ~ ")||"none");
await shot(page,"15-trip-album");
await browser.close();
