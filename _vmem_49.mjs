import puppeteer from "puppeteer";
const BASE="http://localhost:3015";
const browser = await puppeteer.launch({headless:"new",args:["--no-sandbox"]});
const page = await browser.newPage(); await page.setViewport({width:390,height:844});
const cdp = await page.target().createCDPSession();
await page.goto(BASE+"/",{waitUntil:"domcontentloaded"});
await page.evaluate(()=>{localStorage.setItem("wafe:mode","demo");localStorage.setItem("wafe:demo:view-as","mem-ife");});
await page.goto(BASE+"/create/memories",{waitUntil:"domcontentloaded"});
await new Promise(x=>setTimeout(x,3000));
await page.evaluate(()=>{ const k="wafe:demo:memories:v1"; const v=JSON.parse(localStorage.getItem(k)); const keep=v.frames.filter(f=>f.reelId==="reel-summer").slice(0,6).map(f=>f.id); v.frames=v.frames.filter(f=>f.reelId!=="reel-summer"||keep.includes(f.id)); localStorage.setItem(k,JSON.stringify(v)); });
await cdp.send("Emulation.setCPUThrottlingRate",{rate:4});
await page.goto(BASE+"/create/memories/reels/reel-summer/play",{waitUntil:"domcontentloaded"});
await page.waitForSelector('button[aria-label="Playback details"]',{timeout:40000});
await new Promise(x=>setTimeout(x,9000));
for(let i=0;i<8;i++){ const p=await page.$eval('button[aria-label="Playback details"]',b=>b.getAttribute("aria-pressed")).catch(()=>null); if(p==="true")break; await page.evaluate(()=>document.querySelector('button[aria-label="Playback details"]')?.click()).catch(()=>{}); await new Promise(x=>setTimeout(x,1200)); }
const samples=[]; for(let i=0;i<4;i++){ await new Promise(x=>setTimeout(x,1200)); const b=await page.evaluate(()=>document.body.innerText); const m=b.match(/Frame rate\n([^\n]+)\nFirst frame\n([^\n]+)\nFrames\n([^\n]+)/); if(m) samples.push(m[1]+" (frames "+m[3]+")"); }
console.log("6-frame reel @ cpu x4:", JSON.stringify(samples));
await browser.close();
