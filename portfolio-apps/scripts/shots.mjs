// Screenshot the portfolio apps for a visual review; collect console errors and failed requests.
import puppeteer from 'puppeteer'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

const BASE = process.env.BASE ?? 'http://localhost:3020'
const OUT = path.resolve(process.env.OUT ?? 'shots')
mkdirSync(OUT, { recursive: true })

const targets = [
  { name: 'hub-light', url: '/', theme: 'light', full: true },
  { name: 'hub-dark', url: '/', theme: 'dark', full: false },
  { name: 'brand-overview-light', url: '/brand/', theme: 'light', full: true },
  { name: 'brand-dashboard-dark', url: '/brand/dashboard', theme: 'dark', full: true },
  { name: 'fraud-model-light', url: '/fraud/model', theme: 'light', full: true },
  { name: 'people-data-dark', url: '/people/data', theme: 'dark', full: true },
  { name: 'mortgage-api-light', url: '/mortgage/api', theme: 'light', full: true },
  { name: 'clv-report-light', url: '/clv/report', theme: 'light', full: true },
  { name: 'parkinsons-overview-dark', url: '/parkinsons/', theme: 'dark', full: true },
  { name: 'music-dashboard-light', url: '/music/dashboard', theme: 'light', full: true },
  { name: 'reviews-dashboard-light', url: '/reviews/dashboard', theme: 'light', full: false },
  { name: 'mobile-hub-light', url: '/', theme: 'light', full: true, mobile: true },
  { name: 'mobile-brand-dark', url: '/brand/', theme: 'dark', full: true, mobile: true },
  { name: 'mobile-fraud-dashboard-light', url: '/fraud/dashboard', theme: 'light', full: true, mobile: true },
]

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
const report = []
for (const t of targets) {
  const page = await browser.newPage()
  const errors = []
  const failed = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)) })
  page.on('pageerror', (e) => errors.push(`pageerror: ${String(e).slice(0, 300)}`))
  page.on('requestfailed', (r) => failed.push(`${r.failure()?.errorText} ${r.url()}`))
  page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`) })
  await page.setViewport(t.mobile ? { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { width: 1400, height: 900, deviceScaleFactor: 1 })
  await page.evaluateOnNewDocument((theme) => { localStorage.setItem('femi-apps-theme', theme) }, t.theme)
  await page.goto(BASE + t.url, { waitUntil: 'networkidle0', timeout: 60000 })
  await new Promise((r) => setTimeout(r, 800))
  const h = await page.evaluate(() => document.documentElement.scrollHeight)
  await page.screenshot({ path: path.join(OUT, `${t.name}.png`), fullPage: t.full })
  const info = await page.evaluate(() => ({
    title: document.title,
    h1: document.querySelector('h1')?.textContent?.trim(),
    colorMode: document.documentElement.getAttribute('data-color-mode'),
    bg: getComputedStyle(document.body).backgroundColor,
    charts: document.querySelectorAll('.recharts-surface').length,
    imgs: [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.src).slice(0, 5),
  }))
  report.push({ name: t.name, height: h, ...info, errors: [...new Set(errors)].slice(0, 6), failed: [...new Set(failed)].slice(0, 6) })
  await page.close()
}
await browser.close()
console.log(JSON.stringify(report, null, 2))
