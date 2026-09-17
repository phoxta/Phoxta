import { launch, boot, go, txt, hscroll, SHOTS } from "./_bv_lib.mjs";

const { browser, page, errs } = await launch();
await boot(page, "mem-ife", "/grow/bible/verses");
const st = () => page.evaluate(() => JSON.parse(localStorage.getItem("wafe:demo:bible:v1")));

console.log("=== VERSES PAGE (parent) ===");
console.log((await txt(page)).split("Create your own family")[1].slice(0, 3000));
await page.screenshot({ path: SHOTS + "/03-verses-parent.png", fullPage: true });

const before = await st();
const mine = before.memoryVerses.filter(v => v.memberId === "mem-ife");
console.log("\nIfe verses:", JSON.stringify(mine.map(v => ({id:v.id, ref:v.reference}))));
console.log("pending reviews for ife:", JSON.stringify(before.reviews.filter(r => r.memberId==="mem-ife" && r.reviewedAt===null).map(r=>({v:r.verseId,due:r.dueAt,step:r.step,int:r.intervalDays}))));
console.log("all reviews for ife count:", before.reviews.filter(r=>r.memberId==="mem-ife").length);

// click "I knew it" on the first due card
const clicked = await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find(x => /knew/i.test(x.textContent));
  if (!b) return null;
  b.click(); return b.textContent.trim();
});
console.log("clicked:", clicked);
await new Promise(r=>setTimeout(r,1500));
const after = await st();
console.log("after pending for ife:", JSON.stringify(after.reviews.filter(r => r.memberId==="mem-ife" && r.reviewedAt===null).map(r=>({v:r.verseId,due:r.dueAt,step:r.step,int:r.intervalDays}))));
console.log("after answered rows:", JSON.stringify(after.reviews.filter(r=>r.memberId==="mem-ife" && r.reviewedAt).map(r=>({v:r.verseId,due:r.dueAt,step:r.step,res:r.result}))));
console.log("\nAFTER CLICK PAGE:");
console.log((await txt(page)).split("Create your own family")[1].slice(0, 1500));

// reload → persistence
await go(page, "/grow/bible/verses");
console.log("\n=== AFTER RELOAD ===");
console.log((await txt(page)).split("Create your own family")[1].slice(0, 1200));
console.log("\nHSCROLL", JSON.stringify(await hscroll(page)));
console.log("ERRORS:", JSON.stringify(errs));
await browser.close();
