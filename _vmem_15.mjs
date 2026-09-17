import { boot, go, txt, shot } from "./_vmem_lib.mjs";
import { clickExact } from "./_vmem_lib2.mjs";
const { browser, page, errors } = await boot({ viewAs: "mem-folake" });
// 1. live link to a reel NOT granted to Folake
await go(page, "/create/memories/reels/reel-summer/play?t=sum26-quiet-harbour", 2500);
console.log("== LIVE LINK (guest) =="); console.log((await txt(page)||await page.evaluate(()=>document.body.innerText)).slice(0,400));
console.log("frames visible:", await page.evaluate(()=>document.querySelectorAll("img").length));
await shot(page, "08-guest-livelink");
// 2. expired link
await go(page, "/create/memories/albums/album-kitchen?t=kitchen-before-after", 2000);
console.log("== EXPIRED LINK =="); console.log((await page.evaluate(()=>document.querySelector("main")?.innerText||"")).slice(0,400));
// 3. revoked link
await go(page, "/create/memories/albums/album-lakes?t=lakes-grasmere-rain", 2000);
console.log("== REVOKED LINK =="); console.log((await page.evaluate(()=>document.querySelector("main")?.innerText||"")).slice(0,400));
// 4. no token, not granted
await go(page, "/create/memories/albums/album-kitchen", 2000);
console.log("== NO TOKEN, NOT GRANTED =="); console.log((await page.evaluate(()=>document.querySelector("main")?.innerText||"")).slice(0,400));
// 5. guest home
await go(page, "/create/memories", 2000);
console.log("== GUEST HOME =="); console.log((await page.evaluate(()=>document.querySelector("main")?.innerText||"")).slice(0,1500));
await shot(page,"09-guest-home");
console.log("errors:", errors.slice(0,10).join(" | ")||"none");
await browser.close();
