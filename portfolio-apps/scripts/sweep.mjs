/** Loads every product's public pages and reports console errors, 404s and layout overflow. */
import puppeteer from 'puppeteer'
import { writeFileSync } from 'node:fs'
const BASE = process.env.BASE ?? 'http://localhost:3020'
const SLUGS = (process.env.SLUGS ?? 'customer,fraud,mortgage,people,parkinsons,supply-chain,retail,ergonomics,ppe,automotive,loan,malaria,emotion,music').split(',')
const PAGES = (process.env.PAGES ?? '').split(',').filter(Boolean)
const b = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
const rows = []
for (const s of SLUGS) {
  for (const sub of ['', ...PAGES]) {
    const page = await b.newPage()
    const errors = [], failed = []
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 120)) })
    page.on('pageerror', (e) => errors.push('pageerror: ' + String(e).slice(0, 120)))
    page.on('response', (r) => { if (r.status() >= 400 && !r.url().includes('favicon')) failed.push(r.status() + ' ' + r.url().slice(0, 80)) })
    await page.setViewport({ width: 1440, height: 900 })
    const url = `/${s}${sub ? '/' + sub : ''}`
    try { await page.goto(BASE + url, { waitUntil: 'networkidle0', timeout: 45000 }) } catch (e) { errors.push('goto ' + String(e).slice(0, 80)) }
    await page.evaluate(async () => {
      const step = innerHeight * 0.6
      for (let y = 0; y < document.body.scrollHeight; y += step) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 140)) }
      scrollTo(0, 0)
      await new Promise((r) => setTimeout(r, 1500))
    })
    const info = await page.evaluate(() => {
      const de = document.documentElement
      const wide = [...document.querySelectorAll('body *')]
        .filter((e) => e.getBoundingClientRect().right > innerWidth + 2 && getComputedStyle(e).position !== 'fixed')
        .slice(0, 3).map((e) => (e.className?.toString?.() || e.tagName).slice(0, 40))
      return {
        h1: document.querySelectorAll('h1').length,
        overflowX: de.scrollWidth > de.clientWidth + 1,
        wide,
        height: de.scrollHeight,
        invisible: [...document.querySelectorAll('.u-reveal, .mk-cta, section')]
          .filter((e) => getComputedStyle(e).opacity === '0' && e.getBoundingClientRect().height > 40).length,
      }
    })
    rows.push({ url, ...info, errors: [...new Set(errors)].slice(0, 2), failed: [...new Set(failed)].slice(0, 2) })
    await page.close()
  }
}
await b.close()
const bad = rows.filter((r) => r.errors.length || r.failed.length || r.overflowX || r.h1 !== 1 || r.invisible || (r.height < 1200 && !/sign|forgot/.test(r.url)))

// Third-party favicon lookups fail for a handful of companies; not our bug.
const ours = (f) => !/favicon|gstatic|google\.com\/s2/.test(f)
const problems = bad
  .map((r) => {
    const why = []
    if (r.h1 !== 1) why.push(`h1=${r.h1}`)
    if (r.overflowX) why.push(`overflow-x (${r.wide.join(', ')})`)
    if (r.invisible) why.push(`${r.invisible} still invisible`)
    if (r.errors.length) why.push(`error: ${r.errors[0]}`)
    const f = r.failed.filter(ours)
    if (f.length) why.push(`failed: ${f[0]}`)
    return why.length ? `${r.url.padEnd(28)} ${why.join(' | ')}` : null
  })
  .filter(Boolean)

writeFileSync(process.env.OUTFILE ?? 'sweep.json', JSON.stringify(rows, null, 1))
console.log(`checked ${rows.length} pages — ${problems.length} with problems`)
for (const p of problems) console.log('  ' + p)
