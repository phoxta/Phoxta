import puppeteer from "puppeteer";
const BASE="http://localhost:3015";
for (let i=0;i<5;i++){
  const browser = await puppeteer.launch({headless:"new",args:["--no-sandbox"]});
  const page = await browser.newPage();
  const errs=[];
  page.on("pageerror", e=>errs.push(e.stack||e.message));
  await page.goto(BASE+"/",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{localStorage.setItem("wafe:mode","demo");localStorage.setItem("wafe:demo:view-as","mem-folake");});
  await page.goto(BASE+"/create/memories/timeline",{waitUntil:"domcontentloaded"});
  await new Promise(r=>setTimeout(r,4000));
  const len = await page.evaluate(()=>document.body.innerText.length);
  console.log("run",i,"len",len);
  if (errs.length) console.log(errs[0].split("\n").slice(0,8).join("\n"));
  await browser.close();
  if (len<50) break;
}
