// Read-only public-page acceptance against the deployed site. No test login,
// mutation, checkout or payment request is made.
import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const base=process.env.SCHOOL_TEST_URL||'https://learn.phoxta.com';
const artifacts=join(tmpdir(),'phoxta-school-public-verification');
await mkdir(artifacts,{recursive:true});
const browser=await puppeteer.launch({headless:true});
const results=[];
try {
  for(const width of [390,1440]){
    const page=await browser.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.setViewport({width,height:900});
    await page.goto(`${base}/pricing`,{waitUntil:'networkidle0',timeout:60000});
    await page.waitForFunction(()=>document.querySelectorAll('#admission-intake option').length>1,{timeout:20000});
    const body=await page.$eval('body',el=>el.innerText);
    for(const price of ['£250','£1,200','£5,000'])assert(body.includes(price),`Missing live price ${price}`);
    const intake=await page.$eval('#admission-intake',el=>el.textContent);
    assert(intake.includes('14 Oct 2026')&&intake.includes('no cap'),'Live October intake missing');
    assert.equal(await page.$eval('input[type=checkbox]',el=>el.checked),false,'Terms consent must not be preselected');
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Horizontal pricing overflow');
    assert.deepEqual(errors,[]);
    await page.screenshot({path:join(artifacts,`pricing-${width}.png`),fullPage:true});
    results.push(`Production pricing ${width}px: current fees, real uncapped intake, explicit terms consent, no overflow`);
    await page.close();
  }
  const page=await browser.newPage();
  await page.goto(`${base}/admission-terms`,{waitUntil:'networkidle0',timeout:60000});
  await page.waitForFunction(()=>document.body.innerText.includes('You may cancel your admission within 14 days'));
  assert((await page.$eval('body',el=>el.innerText)).includes('one calendar year'));
  results.push('Production admission terms load from the real database');
  await page.goto(`${base}/staff`,{waitUntil:'networkidle0',timeout:60000});
  await page.waitForFunction(()=>location.pathname==='/login');
  results.push('Production anonymous staff entry redirects to sign-in');
  console.log(JSON.stringify({passed:results.length,results,screenshots:artifacts},null,2));
} finally {await browser.close();}
