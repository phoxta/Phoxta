/** Reports which animations are actually attached in the hero, and their timing. */
import puppeteer from 'puppeteer'
const BASE = process.env.BASE ?? 'http://localhost:3020'
const ROUTE = '/' + (process.env.ROUTE ?? 'loan').replace(/^\/+/, '')
const b = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
const page = await b.newPage()
await page.setViewport({ width: 1440, height: 900 })
await page.goto(BASE + ROUTE, { waitUntil: 'networkidle0', timeout: 45000 })
const report = await page.evaluate(() => {
  const hero = document.querySelector('.mk-hero')
  const anims = document.getAnimations().filter((a) => hero?.contains(a.effect?.target))
  const seen = new Map()
  for (const a of anims) {
    const t = a.effect.target
    const name = a.animationName ?? a.transitionProperty ?? 'unknown'
    const key = `${t.className.toString().split(' ')[0]} · ${name}`
    const tl = a.timeline?.constructor?.name ?? '?'
    if (!seen.has(key)) seen.set(key, { key, timeline: tl, count: 0, dur: a.effect.getTiming().duration })
    seen.get(key).count++
  }
  const words = document.querySelectorAll('.sl__w')
  const lines = new Set([...words].map((w) => w.style.getPropertyValue('--l')))
  return {
    animations: [...seen.values()],
    splitWords: words.length,
    splitLines: [...lines].sort(),
    grain: !!document.querySelector('.ba-grain'),
    scrollDriven: CSS.supports('animation-timeline', 'view()'),
  }
})
console.log(JSON.stringify(report, null, 1))
await b.close()
