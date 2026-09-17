import { boot, go, shot } from "./_vmem_lib.mjs";
{
  const { browser, page, errors } = await boot({ viewAs: "mem-folake" });
  await go(page, "/create/memories/reels/reel-seven-years/play?t=lakes-grasmere-rain", 3000);
  console.log("== FRESH: guest + revoked token on play route ==");
  console.log("main innerText:", JSON.stringify((await page.evaluate(()=>document.querySelector("main")?.innerText||"(no main)")).slice(0,200)));
  console.log("body length:", await page.evaluate(()=>document.body.innerText.length));
  console.log("errors:", errors.slice(0,6).join(" ~ ")||"none");
  await shot(page,"10-revoked-crash");
  await browser.close();
}
{
  const { browser, page, errors } = await boot({ viewAs: "mem-folake" });
  await go(page, "/create/memories/albums/album-kitchen?t=kitchen-before-after", 3000);
  console.log("== FRESH: guest + expired token on ALBUM route ==");
  console.log("main:", (await page.evaluate(()=>document.querySelector("main")?.innerText||"(none)")).slice(0,200).replace(/\n+/g," / "));
  console.log("errors:", errors.slice(0,6).join(" ~ ")||"none");
  await browser.close();
}
