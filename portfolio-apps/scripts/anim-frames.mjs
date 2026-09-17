/** Captures a page at a series of moments after load, to inspect motion. */
import puppeteer from 'puppeteer'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
const BASE = process.env.BASE ?? 'http://localhost:3020'
const ROUTE = '/' + (process.env.ROUTE ?? 'loan').replace(/^\/+/, '')
const OUT = path.resolve(process.env.OUT ?? 'shots/frames')
const AT = (process.env.AT ?? '150,350,600,900,1400').split(',').map(Number)
mkdirSync(OUT, { recursive: true })
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
// Warm the cache so the timings reflect motion, not the network.
await page.goto(BASE + ROUTE, { waitUntil: 'networkidle0', timeout: 45000 })
await page.evaluate(() => new Promise((r) => setTimeout(r, 400)))
const t0 = Date.now()
await page.reload({ waitUntil: 'domcontentloaded' })
for (const ms of AT) {
  const wait = ms - (Date.now() - t0)
  if (wait > 0) await page.evaluate((w) => new Promise((r) => setTimeout(r, w)), wait)
  await page.screenshot({ path: path.join(OUT, `t${String(ms).padStart(4, '0')}.png`), fullPage: false })
}
await browser.close()
console.log('frames at', AT.join(', '), 'ms →', OUT)
