import type { Metric, Tone } from '@/content/types'

export function Meter({ pct, tone, label }: { pct: number; tone?: Tone; label?: string }) {
  const v = Math.max(0, Math.min(100, pct))
  return (
    <div
      className={`fa-meter${tone && tone !== 'default' ? ` fa-meter--${tone}` : ''}`}
      role="img"
      aria-label={label ?? `${Math.round(v)} percent`}
    >
      <div className="fa-meter__fill" style={{ width: `${v}%` }} />
    </div>
  )
}

export function StatTiles({ metrics, className }: { metrics: Metric[]; className?: string }) {
  return (
    <div className={`fa-stats${className ? ` ${className}` : ''}`}>
      {metrics.map((m) => (
        <div className="fa-stat" key={m.label}>
          <div className="fa-stat__value">{m.value}</div>
          <div className="fa-stat__label">{m.label}</div>
          {m.pct != null && <Meter pct={m.pct} tone={m.tone} label={`${m.label}: ${m.value}`} />}
          {m.caption && <div className="fa-stat__caption">{m.caption}</div>}
        </div>
      ))}
    </div>
  )
}
