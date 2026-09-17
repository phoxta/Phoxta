import { launch, setMode, go, txt } from "./vp-lib.mjs";

const { browser, page, errs } = await launch();
await setMode(page, "mem-ife");
await go(page, "/execute/projects/proj-1");
console.log("URL:", page.url());
const t = await txt(page);
console.log(t.slice(t.indexOf("EXECUTE", 400)));
console.log("\n--- BUTTONS ---");
console.log(
    (await page.evaluate(() => [...document.querySelectorAll("button")].map((b) => (b.innerText || b.getAttribute("aria-label") || "").replace(/\n/g, "|").trim()).filter(Boolean))).join("\n")
);
console.log("\nERRS:", JSON.stringify(errs, null, 1));
await browser.close();
