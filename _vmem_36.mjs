import { boot, go, shot } from "./_vmem_lib.mjs";
import { clickExact, dialogText } from "./_vmem_lib2.mjs";
const { browser, page, errors } = await boot({ width: 390, height: 844 });
await go(page, "/create/memories", 2500);
await clickExact(page, "New album"); await new Promise(r=>setTimeout(r,900));
await page.evaluate(()=>{ const d=Array.from(document.querySelectorAll("dialog")).find(x=>x.open); const inp=d.querySelector('input[type=text], input:not([type]):not([type=date])'); const set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set; set.call(inp,"Verifier test album"); inp.dispatchEvent(new Event("input",{bubbles:true})); });
await clickExact(page, "Create the album"); await new Promise(r=>setTimeout(r,2500));
const id = await page.evaluate(()=>{ const v=JSON.parse(localStorage.getItem("wafe:demo:memories:v1")); return v.albums.find(a=>a.title==="Verifier test album").id; });
console.log("new album id:", id);
await go(page, "/create/memories/albums/"+id, 3000);
console.log("EMPTY ALBUM:", (await page.evaluate(()=>document.querySelector("main")?.innerText||"")).slice(0,400).replace(/\n+/g," / "));
await shot(page,"19-empty-album");
// rename via Edit
const acts = await page.evaluate(()=>Array.from(document.querySelectorAll("main button")).filter(b=>b.offsetParent!==null).map(b=>b.innerText.trim()));
console.log("actions:", JSON.stringify(acts.slice(0,12)));
console.log("delete:", await clickExact(page, "Delete"));
await new Promise(r=>setTimeout(r,1000));
console.log("CONFIRM:", (await dialogText(page)).slice(0,300).replace(/\n+/g," / "));
// confirm it
const done = await page.evaluate(()=>{ const d=Array.from(document.querySelectorAll("dialog")).find(x=>x.open); if(!d) return false; const b=Array.from(d.querySelectorAll("button")).find(b=>/delete|remove|yes/i.test(b.innerText)); if(b){b.click();return b.innerText.trim();} return "no confirm btn"; });
console.log("confirmed:", done);
await new Promise(r=>setTimeout(r,2500));
console.log("URL:", page.url());
console.log("albums now:", await page.evaluate(()=>JSON.parse(localStorage.getItem("wafe:demo:memories:v1")).albums.length));
console.log("errors:", errors.filter(e=>e.startsWith("pageerror")).slice(0,3).join(" ~ ")||"none");
await browser.close();
