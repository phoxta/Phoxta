/**
 * Capture the real signed-in application and use it as the marketing imagery.
 *
 * Screenshots of the shipped product beat screenshots of the research dashboard
 * it grew out of. Signs in with the local-account fallback, seeds a workspace by
 * scoring a batch, then captures the app and writes the files to
 * `public/media/<slug>/app-*.webp`.
 *
 *   node scripts/app-shots.mjs [slug…]
 */
import puppeteer from 'puppeteer'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const BASE = process.env.BASE ?? 'http://localhost:3020'
const SLUGS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['fraud', 'loan', 'people', 'marketing', 'parkinsons', 'clv', 'retail', 'mortgage']

const SHOTS = [
  { route: '', name: 'app-overview' },
  { route: 'score', name: 'app-score' },
  { route: 'batch', name: 'app-batch' },
  { route: 'cohorts', name: 'app-cohorts' },
  { route: 'monitor', name: 'app-monitor' },
]

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
const report = []

for (const slug of SLUGS) {
  const dir = path.join(ROOT, 'public', 'media', slug)
  mkdirSync(dir, { recursive: true })
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))

  // Seed a local account so the app renders without a hosted identity service.
  await page.evaluateOnNewDocument(() => {
    try {
      localStorage.setItem('femi-apps-theme', 'light')
      localStorage.setItem(
        'femi-suite-local-account',
        JSON.stringify({ id: 'demo-shot', email: 'demo@example.com', name: 'Demo', local: true, createdAt: new Date().toISOString() }),
      )
    } catch (e) { /* private mode */ }
  })

  for (const s of SHOTS) {
    const url = `${BASE}/${slug}/app${s.route ? `/${s.route}` : ''}`
    try {
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 45000 })
      await new Promise((r) => setTimeout(r, 1400))
      const missing = await page.evaluate(() => !document.querySelector('.ap-shell'))
      if (missing) { report.push({ slug, name: s.name, skipped: 'module not mounted' }); continue }
      const file = path.join(dir, `${s.name}.webp`)
      await page.screenshot({ path: file, type: 'webp', quality: 88, clip: { x: 0, y: 0, width: 1440, height: 900 } })
      report.push({ slug, name: s.name, ok: true })
    } catch (e) {
      report.push({ slug, name: s.name, error: String(e).slice(0, 140) })
    }
  }
  if (errors.length) report.push({ slug, pageErrors: [...new Set(errors)].slice(0, 3) })
  await page.close()
}

await browser.close()
console.log(JSON.stringify(report, null, 1))
