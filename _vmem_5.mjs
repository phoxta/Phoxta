import { boot, go, txt, shot } from "./_vmem_lib.mjs";
for (const reduced of [false, true]) {
  const { browser, page, errors } = await boot({ reducedMotion: reduced, width: 390, height: 844 });
  await go(page, "/create/memories", 1200);
  await go(page, "/create/memories/reels/reel-seven-years/play", 300);
  // wait for player, then open details
  await page.waitForSelector('button[aria-label="Playback details"]', {timeout: 15000});
  await new Promise(r=>setTimeout(r, 5000));
  await page.click('button[aria-label="Playback details"]');
  await new Promise(r=>setTimeout(r, 2500));
  const panel = await page.evaluate(()=> {
     const d = Array.from(document.querySelectorAll("div")).find(e=>e.innerText && e.innerText.startsWith("Playback\n"));
     return d ? d.innerText : "NO PANEL";
  });
  console.log("=== reducedMotion:", reduced, "===");
  console.log(panel);
  const kb = await page.evaluate(()=>Array.from(document.querySelectorAll("img")).map(i=>getComputedStyle(i).animationName).filter(n=>n!=="none"));
  console.log("kenburns animations running:", JSON.stringify(kb));
  const hs = await page.evaluate(()=>({sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth}));
  console.log("hscroll", JSON.stringify(hs));
  await shot(page, "03-player-"+(reduced?"reduced":"normal"));
  console.log("errors:", errors.slice(0,10).join(" | ")||"none");
  await browser.close();
}
