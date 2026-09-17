import { launch, boot, go, txt, hscroll, images, SHOTS } from "./_bv_lib.mjs";

const { browser, page, errs } = await launch();
await boot(page, "mem-ife", "/");
console.log("=== DASHBOARD (parent) ===");
const dash = await txt(page);
console.log(dash.slice(0, 4000));
await page.screenshot({ path: SHOTS + "/01-dash-parent.png", fullPage: true });

await go(page, "/grow/bible");
console.log("\n=== /grow/bible (parent) ===");
console.log((await txt(page)).slice(0, 6000));
await page.screenshot({ path: SHOTS + "/02-bible-parent.png", fullPage: true });
console.log("\nHSCROLL", JSON.stringify(await hscroll(page)));
console.log("IMAGES", JSON.stringify(await images(page), null, 1));
console.log("\nERRORS:", JSON.stringify(errs, null, 1));
await browser.close();
