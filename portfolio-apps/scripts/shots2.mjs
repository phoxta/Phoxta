import puppeteer from 'puppeteer'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
const BASE = process.env.BASE ?? 'http://localhost:3020'
const OUT = path.resolve(process.env.OUT ?? 'shots')
mkdirSync(OUT, { recursive: true })
const targets = JSON.parse(process.env.TARGETS ?? '[]')
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
const report = []
for (const t of targets) {
  const page = await browser.newPage()
  const errors = [], failed = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 240)) })
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e).slice(0, 240)))
  page.on('response', (r) => { if (r.status() >= 400) failed.push(r.status() + ' ' + r.url().slice(0, 120)) })
  await page.setViewport(t.mobile ? { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true } : { width: 1440, height: 900 })
  await page.evaluateOnNewDocument((theme) => { try { localStorage.setItem('femi-apps-theme', theme) } catch (e) {} }, t.theme ?? 'light')
  try { await page.goto(BASE + t.url, { waitUntil: 'networkidle0', timeout: 45000 }) }
  catch (e) { errors.push('goto: ' + String(e).slice(0, 160)) }
  // Scroll the whole page so on-entry animations have fired before capture.
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.8
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 90))
    }
    window.scrollTo(0, 0)
  })
  await new Promise((r) => setTimeout(r, 900))
  await page.screenshot({ path: path.join(OUT, t.name + '.png'), fullPage: t.full !== false })
  const info = await page.evaluate(() => ({ title: document.title, h1: document.querySelector('h1')?.textContent?.trim()?.slice(0, 80), h: document.documentElement.scrollHeight }))
  report.push({ name: t.name, url: t.url, ...info, errors: [...new Set(errors)].slice(0, 4), failed: [...new Set(failed)].slice(0, 4) })
  await page.close()
}
await browser.close()
console.log(JSON.stringify(report, null, 1))
