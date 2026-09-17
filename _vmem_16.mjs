import { boot, go, setViewAs } from "./_vmem_lib.mjs";
import { clickExact, dialogText } from "./_vmem_lib2.mjs";
const { browser, page, errors } = await boot({});
await go(page, "/create/memories/reels/reel-seven-years", 1600);
await clickExact(page, "Share"); await new Promise(r=>setTimeout(r,800));
await clickExact(page, "Make a link"); await new Promise(r=>setTimeout(r,1500));
const tok = await page.evaluate(()=>{ const v=JSON.parse(localStorage.getItem("wafe:demo:memories:v1")); return v.links[v.links.length-1].token; });
console.log("token:", tok);
// guest opens it
await setViewAs(page, "mem-folake");
await go(page, `/create/memories/reels/reel-seven-years/play?t=${tok}`, 2500);
console.log("BEFORE REVOKE:", (await page.evaluate(()=>document.body.innerText)).includes("Seven years in Croydon") ? "PLAYS" : "blocked");
console.log("views now:", await page.evaluate((t)=>{const v=JSON.parse(localStorage.getItem("wafe:demo:memories:v1"));return v.links.find(l=>l.token===t).views;}, tok));
// parent revokes
await setViewAs(page, "mem-ife");
await go(page, "/create/memories/reels/reel-seven-years", 1600);
await clickExact(page, "Share"); await new Promise(r=>setTimeout(r,900));
const revoked = await page.evaluate((t)=>{
  const ds=Array.from(document.querySelectorAll('[role="dialog"],dialog')).filter(d=>d.offsetParent!==null);
  for(const d of ds){ const li=Array.from(d.querySelectorAll("li")).find(li=>li.innerText.includes(t)); if(li){ const b=Array.from(li.querySelectorAll("button")).find(b=>b.innerText.trim()==="Revoke"); if(b){b.click();return true;} } }
  return false;
}, tok);
console.log("revoke clicked:", revoked);
await new Promise(r=>setTimeout(r,1500));
console.log("dialog now:", (await dialogText(page)).split("A LINK THAT LASTS")[1]?.slice(0,400));
// guest tries again
await setViewAs(page, "mem-folake");
await go(page, `/create/memories/reels/reel-seven-years/play?t=${tok}`, 2500);
console.log("AFTER REVOKE:", (await page.evaluate(()=>document.body.innerText)).slice(0,300).replace(/\n+/g," | "));
console.log("errors:", errors.slice(0,8).join(" | ")||"none");
await browser.close();
