import { boot, go, shot } from "./_vmem_lib.mjs";
for (const v of ["mem-dami","mem-tobi","mem-ayo"]) {
  const { browser, page, errors } = await boot({ viewAs: v, width: 390, height: 844 });
  await go(page, "/create/memories", 3000);
  const t = await page.evaluate(()=>document.querySelector("main")?.innerText||"(none)");
  console.log("==========", v, "==========");
  console.log(t.slice(0,1200));
  const hs = await page.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth}));
  console.log("hscroll:", JSON.stringify(hs));
  const btns = await page.evaluate(()=>Array.from(document.querySelectorAll("main button")).map(b=>b.innerText.trim()).filter(Boolean));
  console.log("main buttons:", JSON.stringify(btns.slice(0,20)));
  await shot(page, "16-"+v);
  console.log("errors:", errors.filter(e=>e.startsWith("pageerror")).slice(0,3).join(" ~ ")||"none");
  await browser.close();
}
