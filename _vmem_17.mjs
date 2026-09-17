import { boot, go, setViewAs } from "./_vmem_lib.mjs";
const { browser, page, errors } = await boot({ viewAs: "mem-folake" });
const step = async (label, path) => { const n = errors.length; await go(page, path, 2500); const body = await page.evaluate(()=>document.querySelector("main")?.innerText||document.body.innerText); console.log("##", label, "|", page.url()); console.log("  main:", body.slice(0,220).replace(/\n+/g," / ")); console.log("  NEW ERRORS:", errors.slice(n).slice(0,4).join(" ~ ")||"none"); };
await step("guest reel-seven-years no token", "/create/memories/reels/reel-seven-years/play");
await step("guest reel-seven-years revoked token", "/create/memories/reels/reel-seven-years/play?t=lakes-grasmere-rain");
await step("guest reel page (not granted)", "/create/memories/reels/reel-seven-years");
await step("guest timeline", "/create/memories/timeline");
await step("guest granted album", "/create/memories/albums/album-chapel");
await browser.close();
