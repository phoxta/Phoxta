/**
 * Cohorts — slice everything the workspace has scored, and compare two saved
 * slices side by side. Every number is computed from the `cases` collection.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Label, LinkButton, Select, Spinner, TextInput } from '@primer/react'
import { DownloadIcon, FilterRemoveIcon, StackIcon, ZapIcon } from '@primer/octicons-react'
import { ChartCard } from '@/components/Charts'
import type { BarChart } from '@/content/types'
import { useSite } from '../../context'
import { Page, download, pct, shortDate, toCsv, useCollection, type ScoredCase } from '../shared'
import type { ModuleDef } from '../spec'

/* ── filter model ─────────────────────────────────────────────────────── */

type SourceFilter = 'all' | ScoredCase['source']

interface Filters {
  /** Percent, 0–100. */
  min: number
  max: number
  source: SourceFilter
  /** yyyy-mm-dd, empty for open-ended. */
  from: string
  to: string
  text: string
}

const BLANK: Filters = { min: 0, max: 100, source: 'all', from: '', to: '', text: '' }

interface SavedCohort {
  id: string
  slot: 'A' | 'B'
  name: string
  at: string
  filters: Filters
}

interface WorkspaceSettings {
  name: string
  timezone: string
  riskThreshold: number
}

function describe(f: Filters): string {
  const bits: string[] = []
  if (f.min > 0 || f.max < 100) bits.push(`score ${f.min}–${f.max}%`)
  if (f.source !== 'all') bits.push(f.source)
  if (f.from) bits.push(`from ${f.from}`)
  if (f.to) bits.push(`to ${f.to}`)
  if (f.text.trim()) bits.push(`“${f.text.trim()}”`)
  return bits.length ? bits.join(' · ') : 'everything'
}

function apply(cases: ScoredCase[], f: Filters): ScoredCase[] {
  const needle = f.text.trim().toLowerCase()
  const fromMs = f.from ? new Date(`${f.from}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY
  const toMs = f.to ? new Date(`${f.to}T23:59:59.999`).getTime() : Number.POSITIVE_INFINITY
  return cases.filter((c) => {
    const s = c.score * 100
    if (s < f.min || s > f.max) return false
    if (f.source !== 'all' && c.source !== f.source) return false
    const t = new Date(c.at).getTime()
    if (Number.isFinite(t) && (t < fromMs || t > toMs)) return false
    if (needle && !`${c.label} ${c.verdict}`.toLowerCase().includes(needle)) return false
    return true
  })
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

/** Mean reason weight per label across a set of cases, biggest magnitude first. */
function reasonWeights(cases: ScoredCase[]): { label: string; weight: number; n: number }[] {
  const acc = new Map<string, { sum: number; n: number }>()
  for (const c of cases) {
    for (const r of c.reasons ?? []) {
      const key = r.label.replace(/\s*[=:]\s*.*$/, '').trim() || r.label
      const cur = acc.get(key) ?? { sum: 0, n: 0 }
      cur.sum += r.weight
      cur.n += 1
      acc.set(key, cur)
    }
  }
  return [...acc.entries()]
    .map(([label, v]) => ({ label, weight: v.sum / v.n, n: v.n }))
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
}

function histogram(cases: ScoredCase[]): Record<string, number | string>[] {
  const bins = Array.from({ length: 10 }, () => 0)
  for (const c of cases) {
    const i = Math.min(9, Math.max(0, Math.floor(c.score * 10)))
    bins[i] += 1
  }
  return bins.map((count, i) => ({ bin: `${i * 10}–${i * 10 + 10}%`, count }))
}

/* ── sorting ──────────────────────────────────────────────────────────── */

type SortKey = 'at' | 'label' | 'source' | 'score' | 'verdict'

function sortCases(rows: ScoredCase[], key: SortKey, dir: 1 | -1): ScoredCase[] {
  return [...rows].sort((a, b) => {
    if (key === 'score') return (a.score - b.score) * dir
    const av = key === 'at' ? a.at : String(a[key] ?? '')
    const bv = key === 'at' ? b.at : String(b[key] ?? '')
    return av.localeCompare(bv) * dir
  })
}

/* ── module ───────────────────────────────────────────────────────────── */

export function CohortsModule({ mod }: { mod: ModuleDef }) {
  const { project } = useSite()
  const { items: cases, loading } = useCollection<ScoredCase>('cases')
  const { items: settings } = useCollection<WorkspaceSettings>('settings')
  const { items: cohorts, save: saveCohort, remove: removeCohort } = useCollection<SavedCohort>('cohorts')
  const [f, setF] = useState<Filters>(BLANK)
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'at', dir: -1 })

  const threshold = settings[0]?.riskThreshold ?? 0.5
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setF((prev) => ({ ...prev, [k]: v }))

  const filtered = useMemo(() => apply(cases, f), [cases, f])
  const rows = useMemo(() => sortCases(filtered, sort.key, sort.dir), [filtered, sort])
  const avg = useMemo(() => mean(filtered.map((c) => c.score)), [filtered])
  const highRisk = useMemo(() => filtered.filter((c) => c.score >= threshold).length, [filtered, threshold])

  const cohortA = cohorts.find((c) => c.slot === 'A') ?? null
  const cohortB = cohorts.find((c) => c.slot === 'B') ?? null
  const setA = useMemo(() => (cohortA ? apply(cases, cohortA.filters) : []), [cases, cohortA])
  const setB = useMemo(() => (cohortB ? apply(cases, cohortB.filters) : []), [cases, cohortB])

  const diff = useMemo(() => {
    if (!cohortA || !cohortB) return null
    const wa = reasonWeights(setA)
    const wb = reasonWeights(setB)
    const byB = new Map(wb.map((r) => [r.label, r.weight]))
    const labels = [...new Set([...wa.slice(0, 8).map((r) => r.label), ...wb.slice(0, 8).map((r) => r.label)])]
    const drivers = labels
      .map((label) => {
        const a = wa.find((r) => r.label === label)?.weight ?? 0
        const b = byB.get(label) ?? 0
        return { label, a, b, delta: a - b }
      })
      .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta))
      .slice(0, 8)
    return {
      meanA: mean(setA.map((c) => c.score)),
      meanB: mean(setB.map((c) => c.score)),
      highA: setA.filter((c) => c.score >= threshold).length,
      highB: setB.filter((c) => c.score >= threshold).length,
      drivers,
    }
  }, [cohortA, cohortB, setA, setB, threshold])

  const capture = (slot: 'A' | 'B') => {
    const existing = cohorts.find((c) => c.slot === slot)
    const id = existing?.id ?? crypto.randomUUID()
    void saveCohort(id, { id, slot, name: describe(f), at: new Date().toISOString(), filters: { ...f } })
  }

  const exportCsv = () => {
    const columns = ['id', 'at', 'source', 'label', 'score', 'verdict', 'top_reason', 'top_reason_weight']
    const data = rows.map((c) => {
      const top = [...(c.reasons ?? [])].sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))[0]
      return {
        id: c.id,
        at: c.at,
        source: c.source,
        label: c.label,
        score: c.score.toFixed(6),
        verdict: c.verdict,
        top_reason: top?.label ?? '',
        top_reason_weight: top ? top.weight.toFixed(6) : '',
      }
    })
    download(`${project.slug}-cohort-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(columns, data))
  }

  const header = (key: SortKey, label: string, num = false) => {
    const active = sort.key === key
    return (
      <th className={num ? 'num' : undefined} aria-sort={active ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
        <button
          type="button"
          onClick={() => setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === 'score' || key === 'at' ? -1 : 1 }))}
          style={{ all: 'unset', cursor: 'pointer', font: 'inherit', color: active ? 'var(--fgColor-accent)' : 'inherit' }}
        >
          {label}{active ? (sort.dir === 1 ? ' ↑' : ' ↓') : ''}
        </button>
      </th>
    )
  }

  if (loading) {
    return (
      <Page mod={mod}>
        <div className="ap-empty" role="status" aria-live="polite"><Spinner size="medium" /><p>Reading the workspace…</p></div>
      </Page>
    )
  }

  if (!cases.length) {
    return (
      <Page mod={mod}>
        <div className="ap-empty">
          <StackIcon size={24} />
          <h2 style={{ margin: 0, fontSize: 17 }}>Nothing scored yet</h2>
          <p style={{ margin: 0, maxWidth: '48ch' }}>
            Cohorts slice the cases this workspace has already scored. Score one case, or upload a file and score every row.
          </p>
          <div className="ap-badge-row">
            {project.demo && <LinkButton as={Link} to="/app/score" leadingVisual={ZapIcon} variant="primary" size="small">Score a case</LinkButton>}
            <LinkButton as={Link} to="/app/batch" leadingVisual={StackIcon} size="small">Run a batch</LinkButton>
          </div>
        </div>
      </Page>
    )
  }

  const hist: BarChart = {
    kind: 'bar',
    title: 'Score distribution',
    subtitle: `${filtered.length.toLocaleString()} matching case${filtered.length === 1 ? '' : 's'} · 10 equal-width bins`,
    xKey: 'bin',
    series: [{ key: 'count', label: 'Cases' }],
    data: histogram(filtered),
    yLabel: 'Cases',
    span: 12,
    note: `Bins are decades of the score. The high-risk band starts at ${pct(threshold)}, the workspace risk threshold.`,
  }

  return (
    <Page
      mod={mod}
      actions={
        <>
          <Button leadingVisual={FilterRemoveIcon} size="small" onClick={() => setF(BLANK)} disabled={describe(f) === 'everything'}>Clear filters</Button>
          <Button leadingVisual={DownloadIcon} size="small" variant="primary" onClick={exportCsv} disabled={!rows.length}>Export CSV</Button>
        </>
      }
    >
      {/* filters */}
      <section aria-labelledby="co-filters">
        <h2 id="co-filters" style={{ fontSize: 15, margin: '0 0 10px' }}>Filter</h2>
        <div className="ap-toolbar">
          <div style={{ display: 'grid', gap: 4, minWidth: 210 }}>
            <label htmlFor="co-min" style={{ fontSize: 12.5, color: 'var(--fgColor-muted)' }}>
              Score range · <strong style={{ color: 'var(--fgColor-default)' }}>{f.min}%–{f.max}%</strong>
            </label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input id="co-min" type="range" min={0} max={100} step={1} value={f.min} aria-label="Minimum score percent"
                onChange={(e) => set('min', Math.min(Number(e.target.value), f.max))} style={{ width: 96 }} />
              <input id="co-max" type="range" min={0} max={100} step={1} value={f.max} aria-label="Maximum score percent"
                onChange={(e) => set('max', Math.max(Number(e.target.value), f.min))} style={{ width: 96 }} />
            </div>
          </div>

          <div style={{ display: 'grid', gap: 4 }}>
            <label htmlFor="co-source" style={{ fontSize: 12.5, color: 'var(--fgColor-muted)' }}>Source</label>
            <Select id="co-source" size="small" value={f.source} onChange={(e) => set('source', e.target.value as SourceFilter)}>
              <Select.Option value="all">All sources</Select.Option>
              <Select.Option value="single">Single scores</Select.Option>
              <Select.Option value="batch">Batch runs</Select.Option>
              <Select.Option value="lab">Lab</Select.Option>
            </Select>
          </div>

          <div style={{ display: 'grid', gap: 4 }}>
            <label htmlFor="co-from" style={{ fontSize: 12.5, color: 'var(--fgColor-muted)' }}>From</label>
            <TextInput id="co-from" type="date" size="small" value={f.from} onChange={(e) => set('from', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gap: 4 }}>
            <label htmlFor="co-to" style={{ fontSize: 12.5, color: 'var(--fgColor-muted)' }}>To</label>
            <TextInput id="co-to" type="date" size="small" value={f.to} onChange={(e) => set('to', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gap: 4, flex: 1, minWidth: 180 }}>
            <label htmlFor="co-text" style={{ fontSize: 12.5, color: 'var(--fgColor-muted)' }}>Label contains</label>
            <TextInput id="co-text" size="small" block value={f.text} placeholder="Case label or verdict" onChange={(e) => set('text', e.target.value)} />
          </div>
        </div>
      </section>

      {/* headline numbers */}
      <div className="ap-cards" aria-live="polite">
        <div className="ap-card">
          <h3>Cases in cohort</h3>
          <div className="ap-card__v">{filtered.length.toLocaleString()}</div>
          <p>of {cases.length.toLocaleString()} scored in this workspace ({describe(f)}).</p>
        </div>
        <div className="ap-card">
          <h3>Mean score</h3>
          <div className="ap-card__v">{pct(avg)}</div>
          <p>Workspace mean is {pct(mean(cases.map((c) => c.score)))}.</p>
        </div>
        <div className="ap-card">
          <h3>High-risk share</h3>
          <div className="ap-card__v">{filtered.length ? pct(highRisk / filtered.length) : '—'}</div>
          <p>{highRisk.toLocaleString()} case{highRisk === 1 ? '' : 's'} at or above the {pct(threshold)} threshold.</p>
        </div>
      </div>

      <div className="fa-grid"><ChartCard spec={hist} /></div>

      {/* cohort A vs B */}
      <section aria-labelledby="co-compare">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', flexWrap: 'wrap', marginBottom: 10 }}>
          <h2 id="co-compare" style={{ fontSize: 15, margin: 0 }}>Compare two cohorts</h2>
          <div className="ap-badge-row">
            <Button size="small" onClick={() => capture('A')}>Save filters as cohort A</Button>
            <Button size="small" onClick={() => capture('B')}>Save filters as cohort B</Button>
          </div>
        </div>

        {!cohortA || !cohortB ? (
          <div className="ap-empty">
            <p style={{ margin: 0, maxWidth: '54ch' }}>
              Set the filters above to describe a segment, save it as cohort A, change the filters, then save cohort B.
              {cohortA && ' Cohort A is saved.'}
              {cohortB && ' Cohort B is saved.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            <div className="ap-cards">
              {([['A', cohortA, setA], ['B', cohortB, setB]] as const).map(([slot, def, group]) => (
                <div className="ap-card" key={slot}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                    <h3>Cohort {slot}</h3>
                    <Button size="small" variant="invisible" onClick={() => void removeCohort(def.id)}>Clear</Button>
                  </div>
                  <p style={{ minHeight: 34 }}>{def.name}</p>
                  <dl className="ap-kv">
                    <dt>Cases</dt><dd>{group.length.toLocaleString()}</dd>
                    <dt>Mean score</dt><dd>{group.length ? pct(mean(group.map((c) => c.score))) : '—'}</dd>
                    <dt>High risk</dt><dd>{group.length ? pct(group.filter((c) => c.score >= threshold).length / group.length) : '—'}</dd>
                    <dt>Saved</dt><dd style={{ fontWeight: 400 }}>{shortDate(def.at)}</dd>
                  </dl>
                </div>
              ))}
              <div className="ap-card">
                <h3>A − B</h3>
                <div className="ap-card__v" style={{ color: (diff?.meanA ?? 0) >= (diff?.meanB ?? 0) ? 'var(--fgColor-danger)' : 'var(--fgColor-success)' }}>
                  {diff ? `${diff.meanA - diff.meanB >= 0 ? '+' : '−'}${(Math.abs(diff.meanA - diff.meanB) * 100).toFixed(1)} pts` : '—'}
                </div>
                <p>
                  Difference in mean score. High-risk share differs by{' '}
                  {diff && setA.length && setB.length
                    ? `${(Math.abs(diff.highA / setA.length - diff.highB / setB.length) * 100).toFixed(1)} pts`
                    : '—'}.
                </p>
              </div>
            </div>

            {diff && diff.drivers.length > 0 && (
              <div className="ap-tablewrap">
                <table className="ap-table">
                  <caption className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
                    Mean reason weight by driver, cohort A versus cohort B
                  </caption>
                  <thead>
                    <tr>
                      <th>Driver</th>
                      <th className="num">Mean weight · A</th>
                      <th className="num">Mean weight · B</th>
                      <th className="num">Difference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diff.drivers.map((d) => (
                      <tr key={d.label}>
                        <td style={{ whiteSpace: 'normal' }}>{d.label}</td>
                        <td className="num">{d.a.toFixed(3)}</td>
                        <td className="num">{d.b.toFixed(3)}</td>
                        <td className="num" style={{ color: d.delta >= 0 ? 'var(--fgColor-danger)' : 'var(--fgColor-success)' }}>
                          {d.delta >= 0 ? '+' : '−'}{Math.abs(d.delta).toFixed(3)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p style={{ margin: 0, color: 'var(--fgColor-muted)', fontSize: 13 }}>
              Reason weights are the per-case contributions recorded when each case was scored, averaged over the cohort. A positive difference means the driver pushes cohort A higher than cohort B.
            </p>
          </div>
        )}
      </section>

      {/* matching cases */}
      <section aria-labelledby="co-table">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', marginBottom: 10 }}>
          <h2 id="co-table" style={{ fontSize: 15, margin: 0 }}>Matching cases</h2>
          <Label variant="secondary">{rows.length.toLocaleString()} rows</Label>
        </div>
        {rows.length === 0 ? (
          <div className="ap-empty">
            <p style={{ margin: 0 }}>No case matches these filters.</p>
            <Button size="small" onClick={() => setF(BLANK)}>Clear filters</Button>
          </div>
        ) : (
          <div className="ap-tablewrap">
            <table className="ap-table">
              <thead>
                <tr>
                  {header('at', 'When')}
                  {header('label', 'Case')}
                  {header('source', 'Source')}
                  {header('score', 'Score', true)}
                  {header('verdict', 'Verdict')}
                  <th>Top reason</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 500).map((c) => {
                  const top = [...(c.reasons ?? [])].sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))[0]
                  return (
                    <tr key={c.id}>
                      <td>{shortDate(c.at)}</td>
                      <td>{c.label}</td>
                      <td><Label variant="secondary" size="small">{c.source}</Label></td>
                      <td className="num" style={{ color: c.score >= threshold ? 'var(--fgColor-danger)' : undefined, fontWeight: 600 }}>{pct(c.score)}</td>
                      <td>{c.verdict}</td>
                      <td style={{ color: 'var(--fgColor-muted)' }}>{top ? `${top.label} (${top.weight >= 0 ? '+' : '−'}${Math.abs(top.weight).toFixed(3)})` : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {rows.length > 500 && (
          <p style={{ margin: '8px 0 0', color: 'var(--fgColor-muted)', fontSize: 13 }}>
            Showing the first 500 of {rows.length.toLocaleString()} rows. Export the CSV for the full cohort.
          </p>
        )}
      </section>
    </Page>
  )
}
