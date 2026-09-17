import puppeteer from "puppeteer";
const BASE="http://localhost:3015";
const browser = await puppeteer.launch({headless:"new",args:["--no-sandbox"]});
const page = await browser.newPage(); await page.setViewport({width:390,height:844});
await page.emulateMediaFeatures([{name:"prefers-reduced-motion",value:"reduce"}]);
await page.goto(BASE+"/",{waitUntil:"domcontentloaded"});
await page.evaluate(()=>{localStorage.setItem("wafe:mode","demo");localStorage.setItem("wafe:demo:view-as","mem-ife");});
await page.goto(BASE+"/create/memories",{waitUntil:"domcontentloaded"});
await new Promise(x=>setTimeout(x,3000));
console.log("reel transitions:", JSON.stringify(await page.evaluate(()=>JSON.parse(localStorage.getItem("wafe:demo:memories:v1")).reels.map(r=>({t:r.title,tr:r.transition,mood:r.mood})))));
// force one to "cut"
await page.evaluate(()=>{ const k="wafe:demo:memories:v1"; const v=JSON.parse(localStorage.getItem(k)); v.reels.find(r=>r.id==="reel-summer").transition="cut"; localStorage.setItem(k,JSON.stringify(v)); });
await page.goto(BASE+"/create/memories/reels/reel-summer/play",{waitUntil:"domcontentloaded"});
await new Promise(x=>setTimeout(x,5000));
const s = await page.evaluate(()=>Array.from(document.querySelectorAll("img")).filter(i=>i.src.includes("memories-")).slice(0,4).map(i=>({anim:getComputedStyle(i).animationName, tr:getComputedStyle(i).transition, op:getComputedStyle(i).opacity})));
console.log("CUT + reduced motion:", JSON.stringify(s));
const body = await page.evaluate(()=>document.body.innerText);
console.log("says motion off:", body.includes("Motion off"));
await browser.close();
