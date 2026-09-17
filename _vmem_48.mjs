import puppeteer from "puppeteer";
const BASE="http://localhost:3015";
const rate = Number(process.argv[2]||1);
const browser = await puppeteer.launch({headless:"new",args:["--no-sandbox"]});
const page = await browser.newPage(); await page.setViewport({width:390,height:844});
const cdp = await page.target().createCDPSession();
await page.goto(BASE+"/",{waitUntil:"domcontentloaded"});
await page.evaluate(()=>{localStorage.setItem("wafe:mode","demo");localStorage.setItem("wafe:demo:view-as","mem-ife");});
await page.goto(BASE+"/create/memories",{waitUntil:"domcontentloaded"});
await new Promise(x=>setTimeout(x,3000));
if(rate>1) await cdp.send("Emulation.setCPUThrottlingRate",{rate});
await page.goto(BASE+"/create/memories/reels/reel-seven-years/play",{waitUntil:"domcontentloaded"});
await page.waitForSelector('button[aria-label="Playback details"]',{timeout:40000});
await new Promise(x=>setTimeout(x,10000));
for(let i=0;i<8;i++){ const p=await page.$eval('button[aria-label="Playback details"]',b=>b.getAttribute("aria-pressed")).catch(()=>null); if(p==="true")break; await page.evaluate(()=>document.querySelector('button[aria-label="Playback details"]')?.click()).catch(()=>{}); await new Promise(x=>setTimeout(x,1200)); }
const samples=[];
for(let i=0;i<5;i++){ await new Promise(x=>setTimeout(x,1200)); const b=await page.evaluate(()=>document.body.innerText); const m=b.match(/Frame rate\n([^\n]+)/); if(m) samples.push(m[1]); }
console.log("cpu x"+rate, "samples:", JSON.stringify(samples));
await browser.close();
