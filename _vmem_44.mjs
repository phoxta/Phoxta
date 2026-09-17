import puppeteer from "puppeteer";
const BASE="http://localhost:3015";
const browser = await puppeteer.launch({headless:"new",args:["--no-sandbox"]});
const page = await browser.newPage(); await page.setViewport({width:390,height:844});
await page.goto(BASE+"/",{waitUntil:"domcontentloaded"});
await page.evaluate(()=>{localStorage.setItem("wafe:mode","demo");localStorage.setItem("wafe:demo:view-as","mem-ife");});
for (const r of ["/create/memories","/create/memories/albums/album-chapel","/create/memories/reels/reel-summer"]) {
  await page.goto(BASE+r,{waitUntil:"domcontentloaded"});
  await new Promise(x=>setTimeout(x,2500));
  // scroll through
  await page.evaluate(async ()=>{ for(let y=0;y<document.body.scrollHeight;y+=600){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,120));} });
  await new Promise(x=>setTimeout(x,3000));
  const im = await page.evaluate(()=>Array.from(document.images).filter(i=>!i.src.includes("member-")).map(i=>({src:i.src.split("/").pop().slice(0,30), ok:i.naturalWidth>0, alt:i.alt!==null?i.alt:"MISSING", hasAlt:i.hasAttribute("alt"), dims:!!(i.getAttribute("width")&&i.getAttribute("height")), lazy:i.getAttribute("loading")})));
  const bad = im.filter(i=>!i.ok);
  const noAlt = im.filter(i=>!i.hasAlt);
  const noDims = im.filter(i=>!i.dims);
  const noLazy = im.filter(i=>i.lazy!=="lazy");
  console.log(r, "| imgs", im.length, "| broken", bad.length, "| no alt attr", noAlt.length, "| no w/h", noDims.length, "| not lazy", noLazy.length);
  if(bad.length) console.log("   broken:", JSON.stringify([...new Set(bad.map(b=>b.src))].slice(0,6)));
  if(noDims.length) console.log("   nodims:", JSON.stringify([...new Set(noDims.map(b=>b.src))].slice(0,6)));
  if(noLazy.length) console.log("   nolazy:", JSON.stringify([...new Set(noLazy.map(b=>b.src))].slice(0,6)));
}
await browser.close();
