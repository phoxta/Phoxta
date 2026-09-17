import puppeteer from 'puppeteer'
const BASE = 'http://localhost:3020'
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
await page.evaluateOnNewDocument(() => {
  localStorage.setItem('femi-apps-theme', 'light')
  localStorage.setItem('femi-suite-local-account', JSON.stringify({ id: 'demo', email: 'demo@acme.com', name: 'Demo', local: true, createdAt: new Date().toISOString() }))
})
const out = []
for (const url of ['/clv/app', '/clv/app/sources', '/clv/app/score', '/clv/app/batch', '/clv/app/cohorts', '/clv/app/monitor', '/clv/app/alerts', '/clv/app/reports', '/clv/app/copilot']) {
  const errs = []
  page.removeAllListeners('pageerror'); page.removeAllListeners('console')
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 150)))
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 150)) })
  try { await page.goto(BASE + url, { waitUntil: 'networkidle0', timeout: 30000 }) } catch (e) { errs.push('goto ' + String(e).slice(0, 80)) }
  await new Promise((r) => setTimeout(r, 700))
  const info = await page.evaluate(() => ({ h1: document.querySelector('h1')?.textContent?.slice(0, 50), shell: !!document.querySelector('.ax'), body: document.body.innerText.length }))
  out.push({ url, ...info, errs: [...new Set(errs)].slice(0, 2) })
}
await page.screenshot({ path: process.env.SHOT || 'app.png' })
await browser.close()
console.log(JSON.stringify(out, null, 1))
