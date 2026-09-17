import { launch, setMode, go, txt } from "./vp-lib.mjs";

const { browser, page, errs } = await launch();
await setMode(page, "mem-ife");
await go(page, "/execute/projects");
console.log("URL:", page.url());
console.log(await txt(page));
// find project links
const links = await page.evaluate(() =>
    [...document.querySelectorAll('a[href^="/execute/projects/"]')].map((a) => a.getAttribute("href") + " :: " + (a.innerText || "").split("\n")[0])
);
console.log("\nLINKS:\n" + [...new Set(links)].join("\n"));
console.log("\nERRS:", JSON.stringify(errs, null, 1));
await browser.close();
