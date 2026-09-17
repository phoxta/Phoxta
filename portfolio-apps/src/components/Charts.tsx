/**
 * Every chart kind in the content schema, drawn with Recharts on Primer's data-viz
 * tokens. Colour is assigned by slot in a fixed, validated order (blue, orange,
 * purple, green, pink, yellow) and never cycled past six series.
 */
import { useMemo } from 'react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, PolarAngleAxis,
  PolarGrid, PolarRadiusAxis, Radar, RadarChart, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart,
  Tooltip, XAxis, YAxis,
} from 'recharts'
import type {
  BarChart as BarSpec, ChartSpec, ConfusionChart, DonutChart, HeatmapChart, ImportanceChart, LineChart as LineSpec,
  RadarChart as RadarSpec, RocChart, ScatterChart as ScatterSpec, ValueFormat,
} from '@/content/types'

export const color = (i: number) => `var(--viz-${(i % 6) + 1})`

export function fmt(v: unknown, f?: ValueFormat): string {
  if (typeof v !== 'number' || Number.isNaN(v)) return v == null ? '' : String(v)
  const abs = Math.abs(v)
  const plain = v.toLocaleString(undefined, { maximumFractionDigits: abs < 10 ? 2 : abs < 100 ? 1 : 0 })
  switch (f) {
    case 'percent': return `${plain}%`
    case 'ms': return `${plain} ms`
    case 'currency':
      if (abs >= 1e9) return `$${(v / 1e9).toFixed(1)}B`
      if (abs >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
      if (abs >= 1e4) return `$${(v / 1e3).toFixed(0)}k`
      if (abs >= 1e3) return `$${(v / 1e3).toFixed(1)}k`
      return `$${plain}`
    case 'compact':
      if (abs >= 1e9) return `${(v / 1e9).toFixed(1)}B`
      if (abs >= 1e6) return `${(v / 1e6).toFixed(1)}M`
      if (abs >= 1e3) return `${(v / 1e3).toFixed(1)}k`
      return plain
    default: return plain
  }
}

/* ── tooltip + legend ─────────────────────────────────────────────────── */

interface TipPayload { name?: string | number; value?: unknown; color?: string; fill?: string; dataKey?: string | number; payload?: Record<string, unknown> }
interface TipProps { active?: boolean; payload?: ReadonlyArray<TipPayload>; label?: string | number; format?: ValueFormat; names?: Record<string, string>; title?: (p: TipPayload) => string }

function ChartTip({ active, payload, label, format, names, title }: TipProps) {
  if (!active || !payload || payload.length === 0) return null
  const heading = title ? title(payload[0]) : label
  return (
    <div className="fa-tip" role="status">
      {heading != null && heading !== '' && <div className="fa-tip__title">{String(heading)}</div>}
      {payload.map((p, i) => (
        <div className="fa-tip__row" key={i}>
          <span>
            <span className="fa-tip__swatch" style={{ background: p.color ?? p.fill ?? 'var(--viz-1)' }} />
            {names?.[String(p.dataKey)] ?? String(p.name ?? p.dataKey ?? '')}
          </span>
          <span className="fa-tip__val">{fmt(p.value, format)}</span>
        </div>
      ))}
    </div>
  )
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  if (items.length < 2) return null
  return (
    <ul className="fa-legend" aria-label="Legend">
      {items.map((it) => (
        <li key={it.label}><span className="fa-legend__swatch" style={{ background: it.color }} />{it.label}</li>
      ))}
    </ul>
  )
}

const axisTick = { fontSize: 11 }
const heightFor = (spec: ChartSpec, base = 280) => spec.height ?? (spec.span === 12 ? 320 : base)

/* ── line / area ──────────────────────────────────────────────────────── */

function LineArea({ spec }: { spec: LineSpec }) {
  const names = Object.fromEntries(spec.series.map((s) => [s.key, s.label]))
  const axes = [
    <CartesianGrid key="g" vertical={false} strokeDasharray="3 3" />,
    <XAxis key="x" dataKey={spec.xKey} tickLine={false} axisLine={false} tick={axisTick} minTickGap={28} />,
    <YAxis
      key="y"
      width={48}
      tickLine={false}
      axisLine={false}
      tick={axisTick}
      domain={spec.yDomain ?? ['auto', 'auto']}
      tickFormatter={(v: number) => fmt(v, spec.valueFormat)}
      label={spec.yLabel ? { value: spec.yLabel, angle: -90, position: 'insideLeft', fontSize: 11, dx: 6 } : undefined}
    />,
    <Tooltip key="t" content={<ChartTip format={spec.valueFormat} names={names} />} cursor={{ stroke: 'var(--borderColor-emphasis)' }} />,
    spec.reference ? (
      <ReferenceLine
        key="r"
        y={spec.reference.y}
        strokeDasharray="4 4"
        label={{ value: spec.reference.label, position: 'insideTopRight', fontSize: 11, fill: 'var(--fgColor-muted)' }}
      />
    ) : null,
  ]
  return (
    <>
      <Legend items={spec.series.map((s, i) => ({ label: s.label, color: color(i) }))} />
      <div className="fa-chart" style={{ height: heightFor(spec) }}>
        <ResponsiveContainer width="100%" height="100%">
          {spec.kind === 'area' ? (
            <AreaChart data={spec.data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              {axes}
              {spec.series.map((s, i) => (
                <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={color(i)} fill={color(i)}
                  fillOpacity={0.14} strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
              ))}
            </AreaChart>
          ) : (
            <LineChart data={spec.data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              {axes}
              {spec.series.map((s, i) => (
                <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={color(i)} strokeWidth={2}
                  dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </>
  )
}

/* ── bars ─────────────────────────────────────────────────────────────── */

function Bars({ spec }: { spec: BarSpec }) {
  const names = Object.fromEntries(spec.series.map((s) => [s.key, s.label]))
  const last = spec.series.length - 1
  const h = spec.horizontal ? Math.max(heightFor(spec, 260), spec.data.length * 30 + 40) : heightFor(spec)
  return (
    <>
      <Legend items={spec.series.map((s, i) => ({ label: s.label, color: color(i) }))} />
      <div className="fa-chart" style={{ height: h }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={spec.data}
            layout={spec.horizontal ? 'vertical' : 'horizontal'}
            margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
            barGap={2}
            barCategoryGap="22%"
          >
            <CartesianGrid vertical={!!spec.horizontal} horizontal={!spec.horizontal} strokeDasharray="3 3" />
            {spec.horizontal ? (
              <>
                <XAxis type="number" tickLine={false} axisLine={false} tick={axisTick} tickFormatter={(v: number) => fmt(v, spec.valueFormat)} />
                <YAxis type="category" dataKey={spec.xKey} width={130} tickLine={false} axisLine={false} tick={axisTick} interval={0} />
              </>
            ) : (
              <>
                <XAxis dataKey={spec.xKey} tickLine={false} axisLine={false} tick={axisTick} interval={0} minTickGap={8} />
                <YAxis width={48} tickLine={false} axisLine={false} tick={axisTick} tickFormatter={(v: number) => fmt(v, spec.valueFormat)}
                  label={spec.yLabel ? { value: spec.yLabel, angle: -90, position: 'insideLeft', fontSize: 11, dx: 6 } : undefined} />
              </>
            )}
            <Tooltip content={<ChartTip format={spec.valueFormat} names={names} />} cursor={{ fill: 'var(--bgColor-neutral-muted)' }} />
            {spec.series.map((s, i) => {
              const rounded = !spec.stacked || i === last
              const radius: [number, number, number, number] = spec.horizontal
                ? (rounded ? [0, 4, 4, 0] : [0, 0, 0, 0])
                : (rounded ? [4, 4, 0, 0] : [0, 0, 0, 0])
              return (
                <Bar key={s.key} dataKey={s.key} name={s.label} stackId={spec.stacked ? 'stack' : undefined} fill={color(i)}
                  radius={radius} maxBarSize={44} stroke="var(--bgColor-default)" strokeWidth={spec.stacked ? 1 : 0} isAnimationActive={false} />
              )
            })}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  )
}

/* ── importance ───────────────────────────────────────────────────────── */

function Importance({ spec }: { spec: ImportanceChart }) {
  const items = useMemo(() => [...spec.items].sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 14), [spec.items])
  const h = Math.max(200, items.length * 28 + 36)
  return (
    <div className="fa-chart" style={{ height: h }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={items} layout="vertical" margin={{ top: 4, right: 56, left: 4, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid horizontal={false} strokeDasharray="3 3" />
          <XAxis type="number" tickLine={false} axisLine={false} tick={axisTick} tickFormatter={(v: number) => fmt(v, spec.valueFormat)} />
          <YAxis type="category" dataKey="name" width={150} tickLine={false} axisLine={false} tick={axisTick} interval={0} />
          <Tooltip content={<ChartTip format={spec.valueFormat} />} cursor={{ fill: 'var(--bgColor-neutral-muted)' }} />
          {spec.diverging && <ReferenceLine x={0} stroke="var(--borderColor-emphasis)" />}
          <Bar dataKey="value" name={spec.title} radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false}
            label={{ position: 'right', fontSize: 11, fill: 'var(--fgColor-muted)', formatter: (v: unknown) => fmt(v, spec.valueFormat) }}>
            {items.map((it, i) => (
              <Cell key={i} fill={spec.diverging ? (it.value < 0 ? 'var(--viz-neg)' : 'var(--viz-pos)') : 'var(--viz-1)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ── ROC ──────────────────────────────────────────────────────────────── */

function interp(points: [number, number][], x: number): number {
  const pts = [...points].sort((a, b) => a[0] - b[0])
  if (x <= pts[0][0]) return pts[0][1]
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i][0]) {
      const [x0, y0] = pts[i - 1]; const [x1, y1] = pts[i]
      return x1 === x0 ? y1 : y0 + ((y1 - y0) * (x - x0)) / (x1 - x0)
    }
  }
  return pts[pts.length - 1][1]
}

function Roc({ spec }: { spec: RocChart }) {
  const data = useMemo(() => {
    const n = 80
    return Array.from({ length: n + 1 }, (_, i) => {
      const fpr = i / n
      const row: Record<string, number> = { fpr }
      spec.curves.forEach((c, ci) => {
        const auc = Math.min(0.9999, Math.max(0.5001, c.auc))
        const k = 1 / auc - 1
        row[`c${ci}`] = c.points ? interp(c.points, fpr) : Math.pow(fpr, k)
      })
      return row
    })
  }, [spec.curves])
  const names = Object.fromEntries(spec.curves.map((c, i) => [`c${i}`, `${c.label} (AUC ${c.auc.toFixed(3)})`]))
  return (
    <>
      <Legend items={spec.curves.map((c, i) => ({ label: `${c.label} · AUC ${c.auc.toFixed(3)}`, color: color(i) }))} />
      <div className="fa-chart" style={{ height: heightFor(spec, 300) }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="fpr" type="number" domain={[0, 1]} ticks={[0, 0.2, 0.4, 0.6, 0.8, 1]} tickLine={false} axisLine={false} tick={axisTick}
              label={{ value: 'False positive rate', position: 'insideBottom', fontSize: 11, dy: 10 }} />
            <YAxis domain={[0, 1]} ticks={[0, 0.2, 0.4, 0.6, 0.8, 1]} width={40} tickLine={false} axisLine={false} tick={axisTick}
              label={{ value: 'True positive rate', angle: -90, position: 'insideLeft', fontSize: 11, dx: 6 }} />
            <Tooltip content={<ChartTip names={names} title={(p) => `FPR ${fmt(p.payload?.fpr)}`} />} cursor={{ stroke: 'var(--borderColor-emphasis)' }} />
            <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} strokeDasharray="4 4" stroke="var(--viz-gray)" />
            {spec.curves.map((c, i) => (
              <Line key={c.label} dataKey={`c${i}`} name={c.label} type="monotone" stroke={color(i)} strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {spec.curves.length === 1 && (
        <p className="fa-card__sub" style={{ marginTop: 6 }}>
          {spec.curves[0].label}: AUC <strong>{spec.curves[0].auc.toFixed(3)}</strong>. The dashed diagonal is a random classifier.
        </p>
      )}
    </>
  )
}

/* ── confusion + heatmap ──────────────────────────────────────────────── */

function cellColor(t: number, diverging = false) {
  if (diverging) {
    const hue = t < 0 ? 'var(--viz-neg)' : 'var(--viz-pos)'
    return `color-mix(in srgb, ${hue} ${Math.round(Math.abs(t) * 88)}%, var(--bgColor-default))`
  }
  return `color-mix(in srgb, var(--viz-1) ${Math.round(t * 90)}%, var(--bgColor-default))`
}
const cellInk = (t: number) => (Math.abs(t) > 0.55 ? '#fff' : 'var(--fgColor-default)')

function Confusion({ spec }: { spec: ConfusionChart }) {
  const n = spec.labels.length
  const max = Math.max(1, ...spec.matrix.flat())
  const total = spec.matrix.flat().reduce((a, b) => a + b, 0)
  return (
    <>
      <p className="fa-card__sub">Rows: actual class · Columns: predicted class · {total.toLocaleString()} test samples</p>
      <div className="fa-matrix" style={{ gridTemplateColumns: `minmax(90px, auto) repeat(${n}, minmax(0, 1fr))` }} role="table" aria-label={spec.title}>
        <div className="fa-matrix__corner" />
        {spec.labels.map((l) => <div key={`h-${l}`} className="fa-matrix__head" role="columnheader" title={l}>{l}</div>)}
        {spec.matrix.map((row, r) => {
          const rowTotal = row.reduce((a, b) => a + b, 0) || 1
          return [
            <div key={`r-${r}`} className="fa-matrix__row" role="rowheader" title={spec.labels[r]}>{spec.labels[r]}</div>,
            ...row.map((v, c) => {
              const t = v / max
              return (
                <div key={`c-${r}-${c}`} className="fa-matrix__cell" role="cell" style={{ background: cellColor(t), color: cellInk(t) }}
                  title={`Actual ${spec.labels[r]} → predicted ${spec.labels[c]}: ${v.toLocaleString()} (${((v / rowTotal) * 100).toFixed(1)}% of row)`}>
                  {v.toLocaleString()}
                </div>
              )
            }),
          ]
        })}
      </div>
    </>
  )
}

function Heatmap({ spec }: { spec: HeatmapChart }) {
  const flat = spec.values.flat()
  const diverging = spec.scale === 'diverging'
  const maxAbs = Math.max(1e-9, ...flat.map(Math.abs))
  const min = Math.min(...flat)
  const max = Math.max(...flat)
  const norm = (v: number) => (diverging ? v / maxAbs : max === min ? 0.5 : (v - min) / (max - min))
  return (
    <>
      <div className="fa-matrix" style={{ gridTemplateColumns: `minmax(110px, auto) repeat(${spec.cols.length}, minmax(0, 1fr))` }} role="table" aria-label={spec.title}>
        <div className="fa-matrix__corner" />
        {spec.cols.map((c) => <div key={`h-${c}`} className="fa-matrix__head" role="columnheader" title={c}>{c}</div>)}
        {spec.values.map((row, r) => [
          <div key={`r-${r}`} className="fa-matrix__row" role="rowheader" title={spec.rows[r]}>{spec.rows[r]}</div>,
          ...row.map((v, c) => {
            const t = norm(v)
            return (
              <div key={`c-${r}-${c}`} className="fa-matrix__cell" role="cell" style={{ background: cellColor(t, diverging), color: cellInk(t), minHeight: 34, fontSize: 11 }}
                title={`${spec.rows[r]} × ${spec.cols[c]}: ${fmt(v, spec.valueFormat)}`}>
                {fmt(v, spec.valueFormat)}
              </div>
            )
          }),
        ])}
      </div>
      <div className="fa-matrix__scale" aria-hidden="true">
        <span>{fmt(diverging ? -maxAbs : min, spec.valueFormat)}</span>
        <span className="fa-matrix__scale-bar" style={{ background: diverging
          ? 'linear-gradient(90deg, var(--viz-neg), var(--bgColor-default), var(--viz-pos))'
          : 'linear-gradient(90deg, var(--bgColor-default), var(--viz-1))' }} />
        <span>{fmt(diverging ? maxAbs : max, spec.valueFormat)}</span>
      </div>
    </>
  )
}

/* ── donut ────────────────────────────────────────────────────────────── */

function Donut({ spec }: { spec: DonutChart }) {
  const data = spec.data.slice(0, 6)
  const total = data.reduce((a, d) => a + d.value, 0) || 1
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12, alignItems: 'center' }}>
      <div className="fa-chart" style={{ height: heightFor(spec, 220), position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={2}
              stroke="var(--bgColor-default)" strokeWidth={2} isAnimationActive={false}>
              {data.map((_, i) => <Cell key={i} fill={color(i)} />)}
            </Pie>
            <Tooltip content={<ChartTip format={spec.valueFormat} />} />
          </PieChart>
        </ResponsiveContainer>
        {spec.center && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none', textAlign: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: 18, letterSpacing: '-0.01em' }}>{spec.center}</span>
          </div>
        )}
      </div>
      <ul className="fa-legend" style={{ flexDirection: 'column', gap: 8 }}>
        {data.map((d, i) => (
          <li key={d.name} style={{ justifyContent: 'space-between', width: '100%' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span className="fa-legend__swatch" style={{ background: color(i) }} />{d.name}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--fgColor-default)', fontWeight: 600 }}>
              {fmt(d.value, spec.valueFormat)} <span style={{ color: 'var(--fgColor-muted)', fontWeight: 400 }}>· {((d.value / total) * 100).toFixed(0)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ── scatter ──────────────────────────────────────────────────────────── */

function ScatterPlot({ spec }: { spec: ScatterSpec }) {
  const groups = spec.groups.slice(0, 4)
  return (
    <>
      <Legend items={groups.map((g, i) => ({ label: g.label, color: color(i) }))} />
      <div className="fa-chart" style={{ height: heightFor(spec, 300) }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" dataKey="x" name={spec.xLabel} tickLine={false} axisLine={false} tick={axisTick}
              label={{ value: spec.xLabel, position: 'insideBottom', fontSize: 11, dy: 10 }} />
            <YAxis type="number" dataKey="y" name={spec.yLabel} width={48} tickLine={false} axisLine={false} tick={axisTick}
              label={{ value: spec.yLabel, angle: -90, position: 'insideLeft', fontSize: 11, dx: 6 }} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ChartTip title={(p) => String(p.name ?? '')} />} />
            {groups.map((g, i) => (
              <Scatter key={g.label} name={g.label} data={g.data} fill={color(i)} fillOpacity={0.7} stroke="var(--bgColor-default)" strokeWidth={1} isAnimationActive={false} />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </>
  )
}

/* ── radar ────────────────────────────────────────────────────────────── */

function RadarPlot({ spec }: { spec: RadarSpec }) {
  const data = spec.axes.map((axis, ai) => {
    const row: Record<string, string | number> = { axis }
    spec.series.forEach((s, si) => { row[`s${si}`] = s.values[ai] ?? 0 })
    return row
  })
  const names = Object.fromEntries(spec.series.map((s, i) => [`s${i}`, s.label]))
  return (
    <>
      <Legend items={spec.series.map((s, i) => ({ label: s.label, color: color(i) }))} />
      <div className="fa-chart" style={{ height: heightFor(spec, 300) }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="72%">
            <PolarGrid />
            <PolarAngleAxis dataKey="axis" tick={axisTick} />
            <PolarRadiusAxis domain={[0, spec.max ?? 'auto']} tick={false} axisLine={false} />
            <Tooltip content={<ChartTip names={names} />} />
            {spec.series.map((s, i) => (
              <Radar key={s.label} name={s.label} dataKey={`s${i}`} stroke={color(i)} fill={color(i)} fillOpacity={0.14} strokeWidth={2} isAnimationActive={false} />
            ))}
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </>
  )
}

/* ── dispatcher ───────────────────────────────────────────────────────── */

function ChartBody({ spec }: { spec: ChartSpec }) {
  switch (spec.kind) {
    case 'line':
    case 'area': return <LineArea spec={spec} />
    case 'bar': return <Bars spec={spec} />
    case 'importance': return <Importance spec={spec} />
    case 'roc': return <Roc spec={spec} />
    case 'confusion': return <Confusion spec={spec} />
    case 'heatmap': return <Heatmap spec={spec} />
    case 'donut': return <Donut spec={spec} />
    case 'scatter': return <ScatterPlot spec={spec} />
    case 'radar': return <RadarPlot spec={spec} />
  }
}

export function ChartCard({ spec }: { spec: ChartSpec }) {
  return (
    <div className={`fa-card fa-span-${spec.span ?? 6}`}>
      <div className="fa-card__body">
        <h3 className="fa-card__title">{spec.title}</h3>
        {spec.subtitle && <p className="fa-card__sub">{spec.subtitle}</p>}
        <ChartBody spec={spec} />
        {spec.note && <p className="fa-card__note">{spec.note}</p>}
      </div>
    </div>
  )
}

export function ChartGrid({ charts }: { charts: ChartSpec[] }) {
  if (!charts.length) return null
  return (
    <div className="fa-grid">
      {charts.map((c, i) => <ChartCard key={`${c.title}-${i}`} spec={c} />)}
    </div>
  )
}
