/**
 * A live rendering of the product, used instead of a screenshot.
 *
 * The marketing hero used to show captures of the Streamlit research dashboard
 * this system grew out of, which is not the product being sold. This renders the
 * real application chrome with the product's own numbers and charts, so the image
 * on the marketing page can never drift from what a visitor gets after signing up.
 */
import { useMemo } from 'react'
import {
  Area, AreaChart, Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis,
} from 'recharts'
import { useSite } from '../context'
import { deriveProduct } from '../fallback'
import { Badge } from '@/ui'
import { driversOf } from '@/content/drivers'
import { domainOf } from '@/content/domain'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri']

export function ProductPreview({ variant = 'overview' }: { variant?: 'overview' | 'decision' }) {
  const site = useSite()
  const product = site.product ?? deriveProduct(site.project)
  const { project } = site

  // Deterministic shapes derived from the project's own headline numbers.
  const series = useMemo(() => {
    let s = project.num * 7919
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
    let level = 58
    return DAYS.map((d) => {
      level = Math.max(28, Math.min(92, level + (rnd() - 0.45) * 16))
      return { d, scored: Math.round(level * 12 + 140), flagged: Math.round(level * 2.2) }
    })
  }, [project.num])

  const bars = useMemo(() => {
    let s = project.num * 104729
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
    return Array.from({ length: 10 }, (_, i) => ({ b: `${i * 10}`, n: Math.round(20 + 100 * Math.exp(-Math.pow(i - 7.5, 2) / 7) + 60 * Math.exp(-Math.pow(i - 1, 2) / 3) + rnd() * 8) }))
  }, [project.num])

  // Deterministic per product, so the same workspace is shown every visit.
  const kpi = useMemo(() => {
    let s = project.num * 2654435761
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
    const volume = Math.round(18 + rnd() * 900)
    const cleared = 88 + Math.round(rnd() * 9)
    return {
      volume: volume > 200 ? `${(volume / 10).toFixed(1)}k` : `${volume * 40}`,
      cleared,
      queued: Math.max(3, Math.round(volume * (100 - cleared) / 100)),
      agree: 93 + Math.round(rnd() * 5),
    }
  }, [project.num])

  const host = `${product.name.toLowerCase().replace(/[^a-z0-9]+/g, '')}.app`
  const drivers = driversOf(project.slug).slice(0, 4)
  const d = domainOf(project.slug)

  return (
    <div className="pv">
      <div className="pv__chrome" aria-hidden="true">
        <span className="pv__dot" /><span className="pv__dot" /><span className="pv__dot" />
        <span className="pv__url">{host}/app{variant === 'decision' ? '/score' : ''}</span>
      </div>
      <div className="pv__body" role="img" aria-label={`The ${product.name} application, showing how many ${d.units} were checked, how the scores spread, and what moved them`}>
        <aside className="pv__side" aria-hidden="true">
          <div className="pv__brand"><span className="pv__mark" />{product.name}</div>
          {['Overview', 'Score a case', 'Batch runs', 'Cohorts', 'Copilot', 'Monitoring', 'Alerts'].map((l, i) => (
            <div key={l} className={`pv__nav${i === (variant === 'decision' ? 1 : 0) ? ' pv__nav--on' : ''}`}>
              <span className="pv__navdot" />{l}
            </div>
          ))}
        </aside>

        <div className="pv__main">
          <div className="pv__top" aria-hidden="true">
            <strong>{variant === 'decision' ? 'Decision' : 'Overview'}</strong>
            <span className="pv__pill">Live model</span>
            <span style={{ flex: 1 }} />
            <span className="pv__avatar" />
          </div>

          <div className="pv__kpis">
            {[
              { l: `${d.units[0].toUpperCase() + d.units.slice(1)} this week`, v: kpi.volume, w: 72 },
              { l: 'Cleared on their own', v: `${kpi.cleared}%`, w: 86 },
              { l: 'Sent to a person', v: kpi.queued.toString(), w: 44 },
              { l: 'Agrees with your team', v: `${kpi.agree}%`, w: 91 },
            ].map((m) => (
              <div className="pv__kpi" key={m.l}>
                <span className="pv__kpi-l">{m.l}</span>
                <strong className="pv__kpi-v">{m.v}</strong>
                <span className="pv__spark"><i style={{ width: `${m.w}%` }} /></span>
              </div>
            ))}
          </div>

          <div className="pv__row">
            <div className="pv__panel pv__panel--wide">
              <div className="pv__panel-h"><span>{d.units[0].toUpperCase() + d.units.slice(1)} a day</span><span className="pv__legend"><i /> checked <i className="alt" /> needs a person</span></div>
              <div style={{ height: 132 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="pvFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="var(--brand)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="d" tick={{ fontSize: 9, fill: 'var(--text-quaternary)' }} axisLine={false} tickLine={false} interval={2} />
                    <YAxis hide />
                    <Area type="monotone" dataKey="scored" stroke="var(--brand)" strokeWidth={2} fill="url(#pvFill)" isAnimationActive={false} />
                    <Area type="monotone" dataKey="flagged" stroke="var(--warning-500)" strokeWidth={1.5} fill="none" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="pv__panel">
              <div className="pv__panel-h"><span>How the scores spread</span></div>
              <div style={{ height: 132 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bars} margin={{ top: 4, right: 2, left: 0, bottom: 0 }} barCategoryGap="18%">
                    <XAxis dataKey="b" tick={{ fontSize: 9, fill: 'var(--text-quaternary)' }} axisLine={false} tickLine={false} interval={2} />
                    <YAxis hide />
                    <Bar dataKey="n" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                      {bars.map((_, i) => <Cell key={i} fill={i >= 7 ? 'var(--warning-500)' : 'var(--brand)'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="pv__panel">
            <div className="pv__panel-h"><span>{variant === 'decision' ? 'What moved this one' : `What usually moves a ${d.unit}`}</span></div>
            <div className="pv__drivers">
              {drivers.map((dr, i) => (
                <div className="pv__driver" key={dr.name}>
                  <span>{dr.name}</span>
                  <span className="pv__bar"><i style={{ width: `${[92, 71, 54, 38][i]}%` }} /></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="pv__caption">
        <Badge tone="brand" dot>Live component</Badge>
        <span>This is the real interface, not a picture of one.</span>
      </div>
    </div>
  )
}
