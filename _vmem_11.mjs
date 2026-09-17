import { boot, go, shot, clickText } from "./_vmem_lib.mjs";
const { browser, page, errors } = await boot({});
const ctx = browser.defaultBrowserContext();
await ctx.overridePermissions("http://localhost:3015", ["clipboard-read","clipboard-write"]);
// track downloads / blob urls / MediaRecorder use
await page.evaluateOnNewDocument(()=>{ window.__dl=[]; const c=document.createElement; document.createElement=function(t){const e=c.call(document,t); if(String(t).toLowerCase()==="a"){ const oc=e.click.bind(e); e.click=function(){ if(e.download||String(e.href).startsWith("blob:")) window.__dl.push({href:e.href,download:e.download}); return oc(); }; } return e; }; window.__mr = typeof MediaRecorder; const OMR = window.MediaRecorder; if(OMR){ window.MediaRecorder = function(...a){ window.__dl.push({mediarecorder:true}); return new OMR(...a); }; } });
await go(page, "/create/memories/reels/reel-seven-years", 1800);
console.log("clicked share:", await clickText(page, "button", "Share"));
await new Promise(r=>setTimeout(r,900));
// select 1 day
await page.evaluate(()=>{ const s=document.querySelector('select'); });
const sels = await page.evaluate(()=>Array.from(document.querySelectorAll("dialog select, [role=dialog] select, select")).map(s=>s.outerHTML.slice(0,120)));
console.log("selects:", JSON.stringify(sels,null,1).slice(0,900));
await shot(page,"06-share-dialog");
const dtext = await page.evaluate(()=>{ const d=document.querySelector('[role="dialog"]')||document.querySelector('dialog'); return d? d.innerText.slice(0,1200):"NO DIALOG"; });
console.log("--- DIALOG ---\n"+dtext);
await browser.close();
