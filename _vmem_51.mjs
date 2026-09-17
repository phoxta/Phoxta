import puppeteer from "puppeteer";
import { clickExact, dialogText } from "./_vmem_lib2.mjs";
const BASE="http://localhost:3015";
const browser = await puppeteer.launch({headless:"new",args:["--no-sandbox"]});
const page = await browser.newPage(); await page.setViewport({width:1280,height:900});
const nav = async (p)=>{ await page.goto(BASE+p,{waitUntil:"domcontentloaded"}); await new Promise(x=>setTimeout(x,3000)); };
await page.goto(BASE+"/",{waitUntil:"domcontentloaded"});
await page.evaluate(()=>{localStorage.setItem("wafe:mode","demo");localStorage.setItem("wafe:demo:view-as","mem-ife");});
await nav("/create/memories/albums/album-garden");
for(let i=0;i<5;i++){ if(await page.evaluate(()=>!!Array.from(document.querySelectorAll("dialog")).find(x=>x.open)))break; await clickExact(page,"Share"); await new Promise(x=>setTimeout(x,900)); }
await clickExact(page,"Make a link"); await new Promise(x=>setTimeout(x,1800));
const tok = await page.evaluate(()=>{const v=JSON.parse(localStorage.getItem("wafe:demo:memories:v1"));return v.links[v.links.length-1].token;});
console.log("made token:", tok);
await page.evaluate(()=>localStorage.setItem("wafe:demo:view-as","mem-folake"));
await nav("/create/memories/albums/album-garden?t="+tok);
console.log("guest before revoke:", (await page.evaluate(()=>document.querySelector("main")?.innerText||"")).slice(0,120).replace(/\n+/g," / "));
console.log("views:", await page.evaluate(t=>JSON.parse(localStorage.getItem("wafe:demo:memories:v1")).links.find(l=>l.token===t).views, tok));
await page.evaluate(()=>localStorage.setItem("wafe:demo:view-as","mem-ife"));
await nav("/create/memories/albums/album-garden");
for(let i=0;i<5;i++){ if(await page.evaluate(()=>!!Array.from(document.querySelectorAll("dialog")).find(x=>x.open)))break; await clickExact(page,"Share"); await new Promise(x=>setTimeout(x,900)); }
const rev = await page.evaluate((t)=>{ const d=Array.from(document.querySelectorAll("dialog")).find(x=>x.open); const li=Array.from(d.querySelectorAll("li")).find(li=>li.innerText.includes(t)); if(!li) return "no li"; const b=Array.from(li.querySelectorAll("button")).find(b=>b.innerText.trim()==="Revoke"); if(!b) return "no revoke"; b.click(); return "clicked"; }, tok);
console.log("revoke:", rev);
await new Promise(x=>setTimeout(x,2000));
console.log("state:", await page.evaluate(t=>{const l=JSON.parse(localStorage.getItem("wafe:demo:memories:v1")).links.find(l=>l.token===t);return l.revokedAt;}, tok));
await page.evaluate(()=>localStorage.setItem("wafe:demo:view-as","mem-folake"));
await nav("/create/memories/albums/album-garden?t="+tok);
console.log("guest after revoke:", (await page.evaluate(()=>document.querySelector("main")?.innerText||"")).slice(0,160).replace(/\n+/g," / "));
await browser.close();
