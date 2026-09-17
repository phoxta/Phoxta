import { boot, go, shot } from "./_vmem_lib.mjs";
const vis = (page)=>page.evaluate(()=>Array.from(document.querySelectorAll("main button, main a")).filter(e=>e.offsetParent!==null).map(e=>e.innerText.trim()).filter(Boolean));
for (const [v, alb] of [["mem-tobi","album-garden"],["mem-tobi","album-chapel"],["mem-tobi","album-just-us"],["mem-dami","album-summer"],["mem-ayo","album-garden"]]) {
  const { browser, page, errors } = await boot({ viewAs: v, width: 390, height: 844 });
  await go(page, "/create/memories/albums/"+alb, 3000);
  const t = await page.evaluate(()=>document.querySelector("main")?.innerText||"(none)");
  console.log("==", v, alb, "==");
  console.log("  head:", t.slice(0,180).replace(/\n+/g," / "));
  console.log("  visible actions:", JSON.stringify(await vis(page)).slice(0,400));
  console.log("  hscroll:", JSON.stringify(await page.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth}))));
  console.log("  errors:", errors.filter(e=>e.startsWith("pageerror")).slice(0,2).join(" ~ ")||"none");
  await browser.close();
}
