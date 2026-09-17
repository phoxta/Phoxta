/**
 * Small live fragments of the real interface, used on the marketing page instead
 * of photographs. Each one is a genuine piece of the product rendered with this
 * product's own vocabulary and numbers, so the page shows the thing being sold.
 */
import { useMemo } from 'react'
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts'
import { Badge } from '@/ui'
import { useSite } from '../context'
import { domainOf } from '@/content/domain'
import { driversOf } from '@/content/drivers'

export type VignetteKind = 'reasons' | 'queue' | 'drift'

export function Vignette({ kind }: { kind: VignetteKind }) {
  const { project } = useSite()
  const d = domainOf(project.slug)

  const rnd = useMemo(() => {
    let s = project.num * 48271 + kind.length
    return () => ((s = (s * 16807) % 2147483647) / 2147483647)
  }, [project.num, kind])

  const agreement = useMemo(() => {
    let s = project.num * 65537
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647)
    let level = 0.93
    return Array.from({ length: 24 }, (_, i) => {
      level = Math.max(0.86, Math.min(0.985, level + (r() - 0.46) * 0.018))
      return { i, agree: Number(level.toFixed(4)) }
    })
  }, [project.num])

  if (kind === 'reasons') {
    // Named in the buyer's language, not the notebook's — see content/drivers.ts.
    const items = driversOf(project.slug)
    return (
      <div className="vg">
        <div className="vg__bar"><span>{d.scoreTitle}</span><Badge tone="success" dot>Decided</Badge></div>
        <div className="vg__body">
          <div className="vg__verdict">
            <span className="u-text-sm u-quiet">Score</span>
            <strong>{(0.12 + rnd() * 0.7).toFixed(2)}</strong>
          </div>
          <p className="u-text-xs u-quiet" style={{ margin: '0 0 10px' }}>What moved this {d.unit}</p>
          <div className="vg__reasons">
            {items.map((it) => (
              <div className="vg__reason" key={it.name}>
                <span title={it.name}>{it.name}</span>
                <span className="vg__rbar">
                  <i className="vg__mid" />
                  <i className={it.w >= 0 ? 'vg__pos' : 'vg__neg'} style={{ width: `${Math.abs(it.w) * 46}%` }} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (kind === 'queue') {
    const rows = Array.from({ length: 4 }, (_, i) => ({
      id: `${d.unit.slice(0, 3).toUpperCase()}-${(4821 + i * 37).toString()}`,
      score: 0.94 - i * 0.09,
      tone: i === 0 ? 'error' : i === 1 ? 'warning' : 'neutral',
    }))
    return (
      <div className="vg">
        <div className="vg__bar"><span>{d.queue[0].toUpperCase() + d.queue.slice(1)}</span><Badge tone="warning" dot>{rows.length} waiting</Badge></div>
        <div className="vg__body vg__body--flush">
          {rows.map((r) => (
            <div className="vg__row" key={r.id}>
              <span className="u-mono u-text-xs">{r.id}</span>
              <span className="vg__pill" data-tone={r.tone}>{(r.score * 100).toFixed(0)}%</span>
              <span className="u-text-xs u-quiet">{r.score > 0.9 ? 'Above your limit' : r.score > 0.8 ? 'Close to your limit' : 'Keep an eye on it'}</span>
              <span className="vg__act">Review</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const data = agreement
  const last = data[data.length - 1].agree

  return (
    <div className="vg">
      <div className="vg__bar">
        <span>Is it still getting it right?</span>
        <Badge tone={last < 0.88 ? 'error' : last < 0.91 ? 'warning' : 'success'} dot>{(last * 100).toFixed(0)}% agree</Badge>
      </div>
      <div className="vg__body">
        <div style={{ height: 132 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="vgD" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis hide domain={[0.8, 1]} />
              <Area type="monotone" dataKey="agree" stroke="var(--brand)" strokeWidth={2} fill="url(#vgD)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="vg__note">
          How often the model and your own team reached the same call, week by week.
          It tells you when the model needs retraining before anyone complains.
        </p>
      </div>
    </div>
  )
}
