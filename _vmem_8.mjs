import { boot, BASE } from "./_vmem_lib.mjs";
const rate = Number(process.argv[2]);
const { browser, page } = await boot({ width: 390, height: 844 });
const cdp = await page.target().createCDPSession();
await page.goto(BASE + "/create/memories", { waitUntil: "domcontentloaded" });
await new Promise(r=>setTimeout(r, 3000));
await cdp.send("Emulation.setCPUThrottlingRate", { rate });
await page.goto(BASE + "/create/memories/reels/reel-seven-years/play", { waitUntil: "domcontentloaded" });
await page.waitForSelector('button[aria-label="Playback details"]', {timeout: 40000});
await new Promise(r=>setTimeout(r, 6000));
for (let i=0;i<6;i++){
  const p = await page.$eval('button[aria-label="Playback details"]', b=>b.getAttribute("aria-pressed")).catch(()=>null);
  if (p === "true") break;
  await page.evaluate(()=>document.querySelector('button[aria-label="Playback details"]')?.click()).catch(()=>{});
  await new Promise(r=>setTimeout(r, 1500));
}
await new Promise(r=>setTimeout(r, 3000));
const b = await page.evaluate(()=>document.body.innerText).catch(()=> "");
const m = b.match(/Frame rate\n([^\n]+)\nFirst frame\n([^\n]+)/);
console.log("cpu x"+rate+" ->", m ? m[1]+" | first frame "+m[2] : "NOPANEL");
await browser.close();
