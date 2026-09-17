import { boot, go } from "./_vmem_lib.mjs";
const routes = ["/", "/create", "/create/memories", "/create/memories/timeline", "/create/memories/albums/album-chapel"];
for (const v of ["mem-folake","mem-ife"]) {
  for (const r of routes) {
    const { browser, page, errors } = await boot({ viewAs: v });
    await go(page, r, 2500);
    console.log(v, r, "->", errors.filter(e=>e.startsWith("pageerror")).slice(0,3).join(" ~ ")||"clean");
    await browser.close();
  }
}
