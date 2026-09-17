import { boot, go } from "./_vmem_lib.mjs";
const routes = ["/create/memories/timeline","/create/memories","/"];
for (const r of routes) {
  let blank=0; const n=4;
  for (let i=0;i<n;i++){
    const { browser, page } = await boot({ viewAs: "mem-folake" });
    try { await go(page, r, 4000); } catch(e){}
    const len = await page.evaluate(()=>document.body.innerText.length).catch(()=>0);
    if (len < 50) blank++;
    await browser.close();
  }
  console.log(r, "blank", blank+"/"+n);
}
