import puppeteer from "puppeteer";
const br = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });

for (const [name, vp] of [
  ["mobile", { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }],
  ["desktop", { width: 1440, height: 900 }],
]) {
  const pg = await br.newPage();
  const errs = []; pg.on("pageerror", e => errs.push(String(e)));
  await pg.setViewport(vp);
  await pg.goto("http://localhost:5173/startup-school", { waitUntil: "networkidle0", timeout: 90000 });
  await pg.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 2200));

  const info = await pg.evaluate(() => {
    const b = (s) => { const e = document.querySelector(s); if (!e) return "missing"; const r = e.getBoundingClientRect(); return `${Math.round(r.width)}x${Math.round(r.height)}`; };
    return {
      hero: b(".sec-1-home-7__img-wrap"),
      price: document.querySelector(".sec-1-home-7__price")?.textContent?.trim().replace(/\s+/g," "),
      cta: document.querySelector(".sec-1-home-7__cta-btn")?.textContent?.trim(),
      offer: document.querySelector(".ss-offer__price")?.textContent?.trim().replace(/\s+/g," "),
      submit: document.querySelector(".sec-4-about-form__btn .text-1")?.textContent?.trim(),
      fields: [...document.querySelectorAll(".sec-11-home-7__form [name]")].map(n => n.name).join(","),
      anchor: !!document.getElementById("enroll"),
      overflow: document.body.scrollWidth,
    };
  }).catch(e => ({ err: String(e) }));
  console.log(`\n[${name}]`);
  for (const [k, v] of Object.entries(info)) console.log(`  ${k.padEnd(9)} ${v}`);

  // Does the hero CTA actually reach the form?
  const before = await pg.evaluate(() => window.scrollY);
  await pg.click(".sec-1-home-7__cta-btn");
  await new Promise(r => setTimeout(r, 2200));
  const after = await pg.evaluate(() => window.scrollY);
  const onScreen = await pg.evaluate(() => {
    const r = document.getElementById("enroll")?.getBoundingClientRect();
    return r ? Math.round(r.top) : null;
  });
  console.log(`  CTA       scrollY ${before} -> ${Math.round(after)}, #enroll top now ${onScreen}`);
  if (errs.length) console.log("  ERRORS:", errs.slice(0,2).join(" | "));
  await pg.screenshot({ path: `.rig/ss-${name}.png` });
  await pg.close();
}
await br.close();
