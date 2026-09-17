import { boot, go, txt, shot } from "./_vmem_lib.mjs";
const { browser, page, errors } = await boot({});
await go(page, "/create/memories", 1500);
const t0 = Date.now();
await go(page, "/create/memories/reels/reel-seven-years/play", 1000);
console.log("nav ms", Date.now()-t0);
await new Promise(r=>setTimeout(r, 6000));
console.log("--- PLAYER TEXT ---");
console.log((await txt(page)).slice(0,3000));
await shot(page, "02-player-60");
// detect transform animation on active frame
const anim = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll("img"));
    return imgs.slice(0,6).map(i=>({src:i.src.slice(-30), transform: getComputedStyle(i).transform, anim: getComputedStyle(i).animationName, tr: getComputedStyle(i).transition}));
});
console.log(JSON.stringify(anim,null,1));
console.log("--- ERRORS ---"); console.log(errors.slice(0,20).join("\n")||"none");
await browser.close();
