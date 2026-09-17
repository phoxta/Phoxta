import { boot, go } from "./_vmem_lib.mjs";
for (const v of ["mem-folake","mem-folake","mem-dayo"]) {
  const { browser, page, errors } = await boot({ viewAs: v });
  await go(page, "/create/memories/timeline", 6000);
  const has = await page.evaluate(()=>!!document.querySelector("main"));
  const body = await page.evaluate(()=>document.body.innerText);
  console.log(v, "| main:", has, "| bodylen:", body.length, "|", errors.filter(e=>e.startsWith("pageerror")).slice(0,2).join(" ~ ")||"clean");
  if (has) { const t=await page.evaluate(()=>document.querySelector("main").innerText); console.log("   ", t.slice(0,700).replace(/\n+/g," / ")); }
  else console.log("   BODY TAIL:", body.slice(-400).replace(/\n+/g," / "));
  await browser.close();
}
