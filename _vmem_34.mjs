import { boot, go } from "./_vmem_lib.mjs";
const cases = [["mem-ayo","/create/memories/albums/album-garden"],["mem-ayo","/create/memories/albums/album-garden"],["mem-ayo","/create/memories"],["mem-tobi","/create/memories/albums/album-garden"]];
for (const [v,r] of cases) {
  const { browser, page, errors } = await boot({ viewAs: v, width: 390, height: 844 });
  await go(page, r, 4000);
  const hasMain = await page.evaluate(()=>!!document.querySelector("main") && document.querySelector("main").innerText.length>10);
  console.log(v, r, "| main:", hasMain, "|", errors.filter(e=>e.startsWith("pageerror")).slice(0,2).join(" ~ ")||"clean");
  await browser.close();
}
