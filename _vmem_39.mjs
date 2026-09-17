import { boot, go, shot } from "./_vmem_lib.mjs";
for (const v of ["mem-dayo","mem-folake"]) {
  const { browser, page, errors } = await boot({ viewAs: v });
  await go(page, "/create/memories/timeline", 4000);
  const t = await page.evaluate(()=>document.querySelector("main")?.innerText||"(none)");
  console.log("=====", v, "=====");
  console.log(t.slice(0,1800));
  const hrefs = await page.evaluate(()=>[...new Set(Array.from(document.querySelectorAll("main li a")).map(a=>a.getAttribute("href")))]);
  console.log("HREFS:", JSON.stringify(hrefs));
  await shot(page,"21-timeline-"+v);
  await browser.close();
}
