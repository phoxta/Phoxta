import puppeteer from "puppeteer";
const browser = await puppeteer.launch({ headless: "new", args:["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({width:390,height:844});
const cdp = await page.target().createCDPSession();
await page.goto("about:blank");
for (const rate of [1,2,4]) {
  await cdp.send("Emulation.setCPUThrottlingRate", { rate });
  const fps = await page.evaluate(()=>new Promise(res=>{let n=0;const t0=performance.now();const f=()=>{n++;if(performance.now()-t0>2000)res(Math.round(n*1000/(performance.now()-t0)));else requestAnimationFrame(f);};requestAnimationFrame(f);}));
  console.log("baseline rAF ceiling cpu x"+rate+":", fps, "fps");
}
await browser.close();
