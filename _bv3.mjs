import { launch, boot, go, txt, hscroll, SHOTS } from "./_bv_lib.mjs";

const { browser, page, errs } = await launch();
const st = () => page.evaluate(() => JSON.parse(localStorage.getItem("wafe:demo:bible:v1")));
const body = async () => (await txt(page)).split("Create your own family")[1] ?? "";
const wait = (ms=1300) => new Promise(r=>setTimeout(r,ms));
const dlgClick = (text) => page.evaluate((text) => {
  const d = document.querySelector('dialog[open] [role=document]'); if (!d) return "no dialog";
  const b = [...d.querySelectorAll("button")].find(x => x.textContent.trim() === text || x.textContent.trim().startsWith(text));
  if (!b) return "no button " + text + " :: " + [...d.querySelectorAll("button")].map(x=>x.textContent.trim()).join("|");
  b.click(); return "ok";
}, text);
const cardClick = (cardText, btnText) => page.evaluate((cardText, btnText) => {
  const card = [...document.querySelectorAll("li")].reverse().find(c => c.textContent.includes(cardText));
  if (!card) return "no card";
  const b = [...card.querySelectorAll("button")].find(x => (x.textContent+" "+(x.getAttribute("aria-label")||"")).includes(btnText));
  if (!b) return "no btn :: " + [...card.querySelectorAll("button")].map(x=>x.textContent.trim()+"/"+(x.getAttribute("aria-label")||"")).join("|");
  b.click(); return "ok";
}, cardText, btnText);

await boot(page, "mem-ife", "/");
await page.evaluate(() => localStorage.removeItem("wafe:demo:bible:v1"));
await go(page, "/grow/bible/prayer");

// --- CREATE with adults-only tag (Work) -----------------------------------
await page.evaluate(() => [...document.querySelectorAll("button")].find(b=>/Ask for prayer/.test(b.textContent)).click());
await wait(600);
await page.type('input[placeholder="Mama Fọláké\'s knee"]', "VERIFY adults only");
console.log("tag click:", await dlgClick("Work"));
console.log("guest cb:", await page.evaluate(() => { const d=document.querySelector('dialog[open] [role=document]'); const c=[...d.querySelectorAll('input[type=checkbox]')].find(c=>/guests/i.test(c.parentElement.textContent)); if(!c) return "none"; c.click(); return "ok"; }));
console.log("submit:", await dlgClick("Add to the wall"));
await wait(1400);
let s = await st();
console.log("CREATED adults:", JSON.stringify(s.prayers.find(p=>p.title==="VERIFY adults only")));

// --- CREATE a child-safe one ---------------------------------------------
await page.evaluate(() => [...document.querySelectorAll("button")].find(b=>/Ask for prayer/.test(b.textContent)).click());
await wait(600);
await page.type('input[placeholder="Mama Fọláké\'s knee"]', "VERIFY kid safe");
console.log("tag click:", await dlgClick("School"));
console.log("submit:", await dlgClick("Add to the wall"));
await wait(1400);
s = await st();
console.log("CREATED kidsafe:", JSON.stringify(s.prayers.find(p=>p.title==="VERIFY kid safe")));

// --- ANSWER (AC3) ---------------------------------------------------------
const before = await st();
const t0 = before.prayers.find(p=>p.id==="pr-bella");
console.log("\nbefore: status", t0.status, "answeredAt", t0.answeredAt, "| reactions", before.reactions.filter(r=>r.prayerId==="pr-bella").length, "| timeline has:", before.timeline.some(t=>t.prayerId==="pr-bella"));
console.log("answer click:", await cardClick("Bella's paw is healing", "Answered"));
await wait(700);
await page.type('textarea[placeholder^="Say it plainly"]', "The vet signed her off on Friday.");
console.log("mark:", await dlgClick("Mark answered"));
await wait(1500);
s = await st();
const a = s.prayers.find(p=>p.id==="pr-bella");
console.log("after: ", JSON.stringify({status:a.status, answeredAt:a.answeredAt, testimony:a.testimony, detailKept:a.detail.length>0, tags:a.tags, reactions:s.reactions.filter(r=>r.prayerId==="pr-bella").length}));
console.log("timeline entry:", JSON.stringify(s.timeline.find(t=>t.prayerId==="pr-bella")));

// --- reload -> answered tab ---
await go(page, "/grow/bible/prayer?tab=answered");
const ans = await body();
console.log("\nANSWERED tab has Bella:", ans.includes("Bella's paw"), "| testimony:", ans.includes("vet signed her off"), "| date shown:", /Answered 7 Sept/.test(ans));
await page.screenshot({ path: SHOTS + "/05-answered.png", fullPage: true });

// --- private list tab ---
await go(page, "/grow/bible/prayer?tab=mine");
const mineTab = await body();
console.log("\nPRIVATE TAB:", mineTab.slice(0,900));

// --- DELETE with confirm --------------------------------------------------
await go(page, "/grow/bible/prayer");
console.log("\ndelete click:", await cardClick("VERIFY kid safe", "Delete"));
await wait(600);
const confirmTxt = await page.evaluate(()=>document.querySelector('dialog[open] [role=document]')?.innerText.slice(0,200));
console.log("confirm dialog:", JSON.stringify(confirmTxt));
console.log("confirm:", await dlgClick("Delete"));
await wait(1400);
s = await st();
console.log("kidsafe gone:", !s.prayers.some(p=>p.title==="VERIFY kid safe"));

console.log("\nHSCROLL", JSON.stringify(await hscroll(page)));
console.log("ERRORS:", JSON.stringify(errs));
await browser.close();
