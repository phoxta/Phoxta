import { launch, boot, txt } from "./_bv_lib.mjs";
const { browser, page, errs } = await launch();
await boot(page, "mem-ife", "/grow/bible/prayer");
const info = await page.evaluate(() => {
  const els = [...document.querySelectorAll("*")].filter(e => e.textContent.includes("Bella's paw is healing"));
  const deepest = els[els.length-1];
  let node = deepest, chain = [];
  while (node && node !== document.body) { chain.push(node.tagName + "." + (node.className||"").toString().slice(0,40)); node = node.parentElement; }
  const card = els.reverse().find(e => e.tagName === "LI");
  return { chain: chain.slice(0,8), hasLi: !!card, liButtons: card ? [...card.querySelectorAll("button")].map(b=>b.textContent.trim()+"|"+(b.getAttribute("aria-label")||"")) : null };
});
console.log(JSON.stringify(info, null, 1));
const tagBtns = await page.evaluate(() => [...document.querySelectorAll("button[aria-pressed]")].map(b=>b.textContent.trim()));
console.log("aria-pressed buttons on page:", JSON.stringify(tagBtns));
console.log("ERRORS", errs);
await browser.close();
