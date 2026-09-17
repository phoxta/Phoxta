import puppeteer from "puppeteer";
const BASE="http://localhost:3015";
const routes=["/create/memories","/create/memories/timeline","/create/memories/albums/album-chapel","/create/memories/reels/reel-summer","/create/memories/reels/reel-summer/play","/create/memories/albums/album-kitchen?t=kitchen-before-after","/create/memories/reels/reel-seven-years/play?t=nope"];
for (const v of ["mem-ife","mem-tobi","mem-folake"]) {
 for (const r of routes) {
  const browser = await puppeteer.launch({headless:"new",args:["--no-sandbox"]});
  const page = await browser.newPage(); await page.setViewport({width:390,height:844});
  const errs=[];
  page.on("pageerror", e=>errs.push((e.message||"").slice(0,90)));
  page.on("console", m=>{ if(m.type()==="error") errs.push("console: "+m.text().slice(0,90)); });
  await page.goto(BASE+"/",{waitUntil:"domcontentloaded"});
  await page.evaluate((vv)=>{localStorage.setItem("wafe:mode","demo");localStorage.setItem("wafe:demo:view-as",vv);},v);
  await page.goto(BASE+r,{waitUntil:"domcontentloaded"});
  await new Promise(rr=>setTimeout(rr,3500));
  const hs = await page.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth}));
  const len = await page.evaluate(()=>document.body.innerText.length);
  console.log(v, r, "| len", len, "| hs", hs.sw+"/"+hs.cw, "|", errs.slice(0,2).join(" ~ ")||"clean");
  await browser.close();
 }
}
