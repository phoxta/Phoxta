import puppeteer from "puppeteer";
const BASE="http://localhost:3015";
const routes=["/create/memories","/create/memories/timeline","/create/memories/albums/album-lagos-25","/create/memories/reels/reel-seven-years","/create/memories/reels/reel-seven-years/play"];
const browser = await puppeteer.launch({headless:"new",args:["--no-sandbox"]});
const page = await browser.newPage(); await page.setViewport({width:390,height:844});
await page.goto(BASE+"/",{waitUntil:"domcontentloaded"});
await page.evaluate(()=>{localStorage.setItem("wafe:mode","demo");localStorage.setItem("wafe:demo:view-as","mem-ife");});
for (const r of routes){
  await page.goto(BASE+r,{waitUntil:"domcontentloaded"});
  await new Promise(x=>setTimeout(x,3000));
  const o = await page.evaluate(()=>{
    const de=document.documentElement;
    const off=Array.from(document.querySelectorAll("main *")).filter(e=>{const b=e.getBoundingClientRect(); return b.width>0 && b.right>de.clientWidth+1;}).slice(0,4).map(e=>e.tagName+"."+String(e.className).slice(0,50));
    return {sw:de.scrollWidth, cw:de.clientWidth, off};
  });
  console.log(r, "->", o.sw+"/"+o.cw, o.sw>o.cw?("OVERFLOW "+JSON.stringify(o.off)):"ok");
}
await browser.close();
