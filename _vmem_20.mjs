import { boot, go } from "./_vmem_lib.mjs";
for (const r of ["/create/studio","/create/memories","/create/memories","/create/memories"]) {
  const { browser, page, errors } = await boot({ viewAs: "mem-folake" });
  await go(page, r, 3000);
  console.log("folake", r, "->", errors.filter(e=>e.startsWith("pageerror")).slice(0,2).join(" ~ ")||"clean");
  await browser.close();
}
