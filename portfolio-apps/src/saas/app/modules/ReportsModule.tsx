/**
 * Reports — an evidence pack assembled from what this workspace has actually
 * processed.
 *
 * Every figure in the document is computed from the `cases` and `batches`
 * collections over the chosen period, or read from the project's own record
 * (`project.report`, `project.results`, `project.models`, `project.dataset`) and
 * from the trained model's JSON. Nothing is illustrative. The same numbers are
 * rendered on screen, written to the Markdown export, and stored with the saved
 * report, so a pack can be reproduced later.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Checkbox, IconButton, Label, LinkButton, Spinner, TextInput } from '@primer/react'
import { BookmarkIcon, DownloadIcon, FileIcon, HistoryIcon, StackIcon, TrashIcon, UndoIcon, ZapIcon } from '@primer/octicons-react'
import { loadLgbm, type LgbmModel } from '@/lib/lgbm'
import { useSite, productName } from '../../context'
import { useAuth } from '../../auth'
import { ADAPTERS } from '../adapters'
import { REAL_MODEL, type ModuleDef } from '../spec'
import { Page, download, pct, shortDate, useCollection, type BatchRun, type ScoredCase } from '../shared'
import { computeDrift, type FeatureDrift } from './MonitorModule'

/* ── sections ─────────────────────────────────────────────────────────── */

type SectionId = 'summary' | 'volumes' | 'distribution' | 'drivers' | 'drift' | 'model' | 'dataset'

const SECTIONS: { id: SectionId; label: string; hint: string }[] = [
  { id: 'summary', label: 'Executive summary', hint: 'The project record, plus what this workspace did in the period' },
  { id: 'volumes', label: 'Volumes', hint: 'Cases and batch runs, day by day' },
  { id: 'distribution', label: 'Score distribution', hint: 'Deciles and percentiles over the period' },
  { id: 'drivers', label: 'Top drivers', hint: 'Mean recorded contribution per reason code' },
  { id: 'drift', label: 'Drift', hint: 'Population stability against the training distribution' },
  { id: 'model', label: 'Model card', hint: 'Algorithm, hold-out metrics and training provenance' },
  { id: 'dataset', label: 'Dataset', hint: 'What the model was built and evaluated on' },
]

const ALL_ON: Record<SectionId, boolean> = {
  summary: true, volumes: true, distribution: true, drivers: true, drift: true, model: true, dataset: true,
}

/* ── statistics ───────────────────────────────────────────────────────── */

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return Number.NaN
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(q * sorted.length)))]
}

/** Mean recorded reason weight per driver, biggest magnitude first. */
function drivers(cases: ScoredCase[]) {
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
    .slice(0, 12)
}

interface Pack {
  cases: ScoredCase[]
  batches: BatchRun[]
  n: number
  mean: number
  median: number
  p10: number
  p90: number
  above: number
  days: { day: string; n: number; above: number; mean: number }[]
  bins: { lo: number; n: number; share: number }[]
  reasons: { label: string; weight: number; n: number }[]
  bySource: { source: string; n: number; mean: number; above: number }[]
  firstHalf: number
  secondHalf: number
}

function build(cases: ScoredCase[], batches: BatchRun[], from: string, to: string, threshold: number): Pack {
  const lo = from ? new Date(`${from}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY
  const hi = to ? new Date(`${to}T23:59:59.999`).getTime() : Number.POSITIVE_INFINITY
  const inRange = (iso: string) => {
    const t = new Date(iso).getTime()
    return !Number.isFinite(t) || (t >= lo && t <= hi)
  }

  const kept = cases.filter((c) => inRange(c.at)).sort((a, b) => a.at.localeCompare(b.at))
  const runs = batches.filter((b) => inRange(b.at)).sort((a, b) => b.at.localeCompare(a.at))
  const scores = kept.map((c) => c.score)
  const sorted = [...scores].sort((a, b) => a - b)

  const byDay = new Map<string, { n: number; above: number; sum: number }>()
  for (const c of kept) {
    const day = c.at.slice(0, 10)
    if (day.length !== 10) continue
    const e = byDay.get(day) ?? { n: 0, above: 0, sum: 0 }
    e.n += 1
    e.sum += c.score
    if (c.score >= threshold) e.above += 1
    byDay.set(day, e)
  }

  const bins = Array.from({ length: 10 }, (_, i) => ({ lo: i * 10, n: 0, share: 0 }))
  for (const s of scores) bins[Math.min(9, Math.max(0, Math.floor(s * 10)))].n += 1
  for (const b of bins) b.share = kept.length ? b.n / kept.length : 0

  const sources = new Map<string, { n: number; sum: number; above: number }>()
  for (const c of kept) {
    const e = sources.get(c.source) ?? { n: 0, sum: 0, above: 0 }
    e.n += 1
    e.sum += c.score
    if (c.score >= threshold) e.above += 1
    sources.set(c.source, e)
  }

  const half = Math.floor(kept.length / 2)
  return {
    cases: kept,
    batches: runs,
    n: kept.length,
    mean: mean(scores),
    median: quantile(sorted, 0.5),
    p10: quantile(sorted, 0.1),
    p90: quantile(sorted, 0.9),
    above: kept.filter((c) => c.score >= threshold).length,
    days: [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([day, e]) => ({ day, n: e.n, above: e.above, mean: e.sum / e.n })),
    bins,
    reasons: drivers(kept),
    bySource: [...sources.entries()].map(([source, e]) => ({ source, n: e.n, mean: e.sum / e.n, above: e.above })),
    firstHalf: half > 0 ? mean(scores.slice(0, half)) : Number.NaN,
    secondHalf: half > 0 ? mean(scores.slice(half)) : Number.NaN,
  }
}

/* ── saved reports ────────────────────────────────────────────────────── */

interface SavedReport {
  id: string
  at: string
  title: string
  from: string
  to: string
  sections: SectionId[]
  cases: number
  batches: number
  meanScore: number
  above: number
  threshold: number
  markdown: string
}

/* ── markdown ─────────────────────────────────────────────────────────── */

const row = (cells: (string | number)[]) => `| ${cells.join(' | ')} |`
const rule = (n: number) => `|${' --- |'.repeat(n)}`
const p1 = (x: number) => (Number.isFinite(x) ? `${(x * 100).toFixed(1)}%` : '—')

function toMarkdown(args: {
  title: string; product: string; from: string; to: string; generatedAt: string; by: string
  threshold: number; on: Record<SectionId, boolean>; pack: Pack
  project: ReturnType<typeof useSite>['project']; model: LgbmModel | null; drift: FeatureDrift[]
}): string {
  const { title, product, from, to, generatedAt, by, threshold, on, pack, project, model, drift } = args
  const L: string[] = []
  L.push(`# ${title}`, '')
  L.push(`**Product** ${product}  `)
  L.push(`**Period** ${from || 'the beginning'} to ${to || 'today'}  `)
  L.push(`**Generated** ${generatedAt}  `)
  L.push(`**Prepared by** ${by}  `)
  L.push(`**Action threshold** ${p1(threshold)}`, '')

  if (on.summary) {
    L.push('## Executive summary', '')
    L.push(
      pack.n === 0
        ? `No case was scored in this period, so the operating figures below are empty. The project record and the model card still apply.`
        : `This workspace scored ${pack.n.toLocaleString()} case${pack.n === 1 ? '' : 's'} in the period across ${pack.days.length} active day${pack.days.length === 1 ? '' : 's'}, ` +
          `at a mean score of ${p1(pack.mean)} (median ${p1(pack.median)}, p90 ${p1(pack.p90)}). ` +
          `${pack.above.toLocaleString()} of them — ${p1(pack.n ? pack.above / pack.n : 0)} — reached the ${p1(threshold)} action threshold and would have gone to a person. ` +
          `${pack.batches.length} batch run${pack.batches.length === 1 ? '' : 's'} contributed to that total.`,
      '',
    )
    for (const para of project.report.executiveSummary) L.push(para, '')
    if (project.report.impact.length) {
      L.push('### Programme impact, as recorded', '')
      L.push(row(['Measure', 'Value']), rule(2))
      for (const i of project.report.impact) L.push(row([i.label, i.value]))
      L.push('')
    }
  }

  if (on.volumes) {
    L.push('## Volumes', '')
    if (!pack.days.length) L.push('No case was scored in this period.', '')
    else {
      L.push(row(['Day', 'Cases', 'At or above threshold', 'Mean score']), rule(4))
      for (const d of pack.days) L.push(row([d.day, d.n, d.above, p1(d.mean)]))
      L.push('', row(['Total', pack.n, pack.above, p1(pack.mean)]), '')
    }
    if (pack.bySource.length) {
      L.push('### By source', '')
      L.push(row(['Source', 'Cases', 'Mean score', 'At or above threshold']), rule(4))
      for (const s of pack.bySource) L.push(row([s.source, s.n, p1(s.mean), s.above]))
      L.push('')
    }
    if (pack.batches.length) {
      L.push('### Batch runs', '')
      L.push(row(['File', 'When', 'Rows', 'Scored', 'Mean', 'High risk', 'Model']), rule(7))
      for (const b of pack.batches) L.push(row([b.name, b.at, b.rows, b.scored, p1(b.meanScore), b.highRisk, b.model]))
      L.push('')
    }
  }

  if (on.distribution) {
    L.push('## Score distribution', '')
    if (!pack.n) L.push('No case was scored in this period.', '')
    else {
      L.push(row(['Band', 'Cases', 'Share']), rule(3))
      for (const b of pack.bins) L.push(row([`${b.lo}–${b.lo + 10}%`, b.n, p1(b.share)]))
      L.push('')
      L.push(`p10 ${p1(pack.p10)} · median ${p1(pack.median)} · p90 ${p1(pack.p90)} · mean ${p1(pack.mean)}`, '')
    }
  }

  if (on.drivers) {
    L.push('## Top drivers', '')
    if (!pack.reasons.length) L.push('No reason codes were recorded for the cases in this period.', '')
    else {
      L.push('Mean signed contribution recorded when each case was scored. Positive values pushed the score up.', '')
      L.push(row(['Driver', 'Mean contribution', 'Cases']), rule(3))
      for (const r of pack.reasons) L.push(row([r.label, `${r.weight >= 0 ? '+' : '−'}${Math.abs(r.weight).toFixed(3)}`, r.n]))
      L.push('')
    }
  }

  if (on.drift) {
    L.push('## Drift', '')
    if (model && drift.length) {
      L.push(`Population stability index against the ${model.n_train.toLocaleString()}-row training distribution. Under 0.10 stable, 0.10–0.25 moderate, over 0.25 significant.`, '')
      L.push(row(['Feature', 'Cases', 'Training median', 'Observed median', 'PSI', 'Band']), rule(6))
      for (const d of drift) {
        L.push(row([d.label, d.n, d.trainMedian.toFixed(3), d.observedMedian.toFixed(3), d.psi.toFixed(3), d.psi >= 0.25 ? 'Significant' : d.psi >= 0.1 ? 'Moderate' : 'Stable']))
      }
      L.push('')
    } else if (model) {
      L.push('No model feature has at least five numeric observations in this period, so feature-level PSI cannot be computed yet.', '')
    } else {
      L.push('This product scores without a trained tabular model exported alongside it, so there is no stored training distribution to measure feature drift against.', '')
    }
    if (Number.isFinite(pack.firstHalf) && Number.isFinite(pack.secondHalf)) {
      const delta = pack.secondHalf - pack.firstHalf
      L.push(
        `Score drift within the period: the first half of the cases averaged ${p1(pack.firstHalf)} and the second half ${p1(pack.secondHalf)}, ` +
        `a shift of ${delta >= 0 ? '+' : '−'}${Math.abs(delta * 100).toFixed(1)} points.`,
        '',
      )
    }
  }

  if (on.model) {
    L.push('## Model card', '')
    if (model) {
      L.push(row(['Field', 'Value']), rule(2))
      L.push(row(['Algorithm', model.algorithm]))
      L.push(row(['Training dataset', model.dataset]))
      L.push(row(['Features', model.features.length]))
      L.push(row(['Trees', model.trees.length]))
      L.push(row(['Training rows', model.n_train.toLocaleString()]))
      L.push(row(['Hold-out rows', model.n_test.toLocaleString()]))
      L.push(row(['Positive rate in training', p1(model.positive_rate)]))
      L.push(row(['AUC', model.metrics.auc.toFixed(4)]))
      L.push(row(['Average precision', model.metrics.avg_precision.toFixed(4)]))
      L.push(row(['Brier score', model.metrics.brier.toFixed(4)]))
      L.push(row(['Accuracy', model.metrics.accuracy.toFixed(4)]))
      L.push(row(['F1', model.metrics.f1.toFixed(4)]))
      L.push('')
      if (model.notes) L.push(model.notes, '')
      const gains = Object.entries(model.importance_gain).sort((a, b) => b[1] - a[1]).slice(0, 10)
      if (gains.length) {
        L.push('### Global importance (gain)', '')
        L.push(row(['Feature', 'Gain']), rule(2))
        for (const [f, v] of gains) L.push(row([model.feature_meta[f]?.label ?? f, v.toFixed(2)]))
        L.push('')
      }
    } else {
      L.push(row(['Component', 'Model', 'Purpose', 'Metric']), rule(4))
      for (const m of project.models) L.push(row([m.component, m.model, m.purpose, m.metric ?? '—']))
      L.push('')
    }
    if (project.results.length) {
      L.push('### Evaluation results, as published', '')
      L.push(row(['Metric', 'Value', 'Note']), rule(3))
      for (const r of project.results) L.push(row([r.metric, r.value, r.note ?? '']))
      L.push('')
    }
  }

  if (on.dataset) {
    L.push('## Dataset', '')
    L.push(`**${project.dataset.name}** — ${project.dataset.size}`, '')
    L.push(project.dataset.description, '')
    if (project.dataset.source) L.push(`Source: ${project.dataset.source.label} — ${project.dataset.source.url}`, '')
    if (project.dataset.facts.length) {
      L.push(row(['Fact', 'Value']), rule(2))
      for (const f of project.dataset.facts) L.push(row([f.label, f.value]))
      L.push('')
    }
  }

  L.push('---', '')
  L.push(`Generated in the browser from ${pack.n.toLocaleString()} scored case${pack.n === 1 ? '' : 's'} held in this workspace. No data left the device.`)
  return L.join('\n')
}

/* ── module ───────────────────────────────────────────────────────────── */

export function ReportsModule({ mod }: { mod: ModuleDef }) {
  const site = useSite()
  const { project } = site
  const { account } = useAuth()
  const threshold = ADAPTERS[project.slug]?.threshold ?? 0.5
  const modelSpec = REAL_MODEL[project.slug]

  const { items: cases, loading: casesLoading } = useCollection<ScoredCase>('cases')
  const { items: batches, loading: batchesLoading } = useCollection<BatchRun>('batches')
  const { items: saved, save: saveReport, remove: removeReport } = useCollection<SavedReport>('reports')

  const [range, setRange] = useState<{ from: string; to: string } | null>(null)
  const [on, setOn] = useState<Record<SectionId, boolean>>(ALL_ON)
  const [model, setModel] = useState<LgbmModel | null>(null)
  const [status, setStatus] = useState('')

  /* Default the period to everything this workspace has, once it has loaded. */
  useEffect(() => {
    if (range || casesLoading || batchesLoading) return
    const days = [...cases.map((c) => c.at), ...batches.map((b) => b.at)].map((s) => s.slice(0, 10)).filter((d) => d.length === 10).sort()
    const today = new Date().toISOString().slice(0, 10)
    setRange({ from: days[0] ?? today, to: days[days.length - 1] ?? today })
  }, [range, cases, batches, casesLoading, batchesLoading])

  useEffect(() => {
    if (!modelSpec) return
    let alive = true
    loadLgbm(modelSpec.url).then((m) => alive && setModel(m)).catch(() => undefined)
    return () => { alive = false }
  }, [modelSpec])

  const from = range?.from ?? ''
  const to = range?.to ?? ''
  const pack = useMemo(() => build(cases, batches, from, to, threshold), [cases, batches, from, to, threshold])
  const drift = useMemo(() => (model ? computeDrift(model, pack.cases) : []), [model, pack.cases])

  const product = productName(site)
  const title = `${product} — evidence pack`
  const generatedAt = new Date().toLocaleString()
  const by = account?.email ?? 'this workspace'

  const markdown = useMemo(
    () => toMarkdown({ title, product, from, to, generatedAt, by, threshold, on, pack, project, model, drift }),
    // `generatedAt` is intentionally read fresh on each render of the document.
    [title, product, from, to, generatedAt, by, threshold, on, pack, project, model, drift],
  )

  const fileStem = `${project.slug}-evidence-pack-${to || new Date().toISOString().slice(0, 10)}`

  const persist = () => {
    const id = crypto.randomUUID()
    void saveReport(id, {
      id, at: new Date().toISOString(), title, from, to,
      sections: SECTIONS.filter((s) => on[s.id]).map((s) => s.id),
      cases: pack.n, batches: pack.batches.length, meanScore: pack.mean, above: pack.above, threshold, markdown,
    })
    setStatus(`Saved. This pack covers ${pack.n.toLocaleString()} case${pack.n === 1 ? '' : 's'} and can be downloaded again from the list below.`)
  }

  const restore = (r: SavedReport) => {
    setRange({ from: r.from, to: r.to })
    setOn(SECTIONS.reduce((acc, s) => ({ ...acc, [s.id]: r.sections.includes(s.id) }), {} as Record<SectionId, boolean>))
    setStatus(`Restored the period and sections from the pack generated on ${shortDate(r.at)}.`)
  }

  if (casesLoading || batchesLoading) {
    return (
      <Page mod={mod}>
        <div className="ap-empty" role="status" aria-live="polite"><Spinner size="medium" /><p>Reading the workspace…</p></div>
      </Page>
    )
  }

  if (!cases.length && !batches.length) {
    return (
      <Page mod={mod}>
        <div className="ap-empty">
          <FileIcon size={24} />
          <h2 style={{ margin: 0, fontSize: 17 }}>There is no evidence to pack yet</h2>
          <p style={{ margin: 0, maxWidth: '52ch' }}>
            A report is assembled from the cases and batch runs this workspace has processed, so it needs at least one of them. The model card and
            dataset sections are ready the moment there is something to attach them to.
          </p>
          <div className="ap-badge-row">
            {project.demo && <LinkButton as={Link} to="/app/score" leadingVisual={ZapIcon} variant="primary" size="small">Score a case</LinkButton>}
            <LinkButton as={Link} to="/app/batch" leadingVisual={StackIcon} size="small">Run a batch</LinkButton>
          </div>
        </div>
      </Page>
    )
  }

  const selected = SECTIONS.filter((s) => on[s.id])

  return (
    <Page
      mod={mod}
      actions={
        <>
          <Button size="small" leadingVisual={FileIcon} onClick={() => window.print()}>Print / save as PDF</Button>
          <Button size="small" leadingVisual={DownloadIcon} onClick={() => download(`${fileStem}.md`, markdown, 'text/markdown')}>Download Markdown</Button>
          <Button size="small" variant="primary" leadingVisual={BookmarkIcon} onClick={persist}>Save to workspace</Button>
        </>
      }
    >
      {/* ── controls ─────────────────────────────────────────────────── */}
      <section aria-labelledby="rp-controls" data-print="hide">
        <h2 id="rp-controls" style={{ fontSize: 15, margin: '0 0 10px' }}>What goes in the pack</h2>
        <div className="ap-toolbar">
          <div style={{ display: 'grid', gap: 4 }}>
            <label htmlFor="rp-from" style={{ fontSize: 12.5, color: 'var(--fgColor-muted)' }}>From</label>
            <TextInput id="rp-from" type="date" size="small" value={from} onChange={(e) => setRange({ from: e.target.value, to })} />
          </div>
          <div style={{ display: 'grid', gap: 4 }}>
            <label htmlFor="rp-to" style={{ fontSize: 12.5, color: 'var(--fgColor-muted)' }}>To</label>
            <TextInput id="rp-to" type="date" size="small" value={to} onChange={(e) => setRange({ from, to: e.target.value })} />
          </div>
          <span className="ap-toolbar__spacer" />
          <Label variant={pack.n ? 'success' : 'attention'}>{pack.n.toLocaleString()} case{pack.n === 1 ? '' : 's'} in range</Label>
          <Button size="small" leadingVisual={UndoIcon} onClick={() => setOn(ALL_ON)} disabled={selected.length === SECTIONS.length}>All sections</Button>
        </div>

        <fieldset style={{ border: 0, margin: '14px 0 0', padding: 0, display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
          <legend className="fa-visually-hidden">Sections to include</legend>
          {SECTIONS.map((s) => (
            <label
              key={s.id}
              style={{ display: 'grid', gridTemplateColumns: '20px 1fr', gap: 10, alignItems: 'start', padding: '10px 12px', border: '1px solid var(--borderColor-default)', borderRadius: 10, cursor: 'pointer' }}
            >
              <Checkbox checked={on[s.id]} onChange={(e) => setOn((p) => ({ ...p, [s.id]: e.target.checked }))} />
              <span>
                <strong style={{ fontSize: 14, fontWeight: 600 }}>{s.label}</strong>
                <span style={{ display: 'block', color: 'var(--fgColor-muted)', fontSize: 12.5, lineHeight: 1.45 }}>{s.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <p aria-live="polite" style={{ margin: '10px 0 0', minHeight: 20, color: 'var(--fgColor-muted)', fontSize: 13.5 }}>{status}</p>
      </section>

      {/* ── the document ─────────────────────────────────────────────── */}
      <article className="rp-doc mk-legal" aria-label="Evidence pack" style={{ border: '1px solid var(--borderColor-default)', borderRadius: 14, padding: '30px 34px', background: 'var(--bgColor-default)', maxWidth: '86ch' }}>
        <header style={{ borderBottom: '1px solid var(--borderColor-default)', paddingBottom: 18, marginBottom: 6 }}>
          <p style={{ margin: 0, fontSize: 12.5, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--fgColor-muted)', fontWeight: 650 }}>Evidence pack</p>
          <h1 style={{ margin: '6px 0 12px', fontSize: 27, letterSpacing: '-0.02em', fontWeight: 640 }}>{title}</h1>
          <dl className="ap-kv">
            <dt>Product</dt><dd>{product}</dd>
            <dt>Period</dt><dd>{from || 'the beginning'} to {to || 'today'}</dd>
            <dt>Cases in period</dt><dd>{pack.n.toLocaleString()}</dd>
            <dt>Action threshold</dt><dd>{pct(threshold)}</dd>
            <dt>Generated</dt><dd style={{ fontWeight: 400 }}>{generatedAt}</dd>
            <dt>Prepared by</dt><dd style={{ fontWeight: 400 }}>{by}</dd>
          </dl>
        </header>

        {selected.length === 0 && (
          <p className="mk-note" style={{ marginTop: 20 }}>Every section is switched off, so the pack is a cover page. Tick at least one section above.</p>
        )}

        {on.summary && (
          <section>
            <h2>Executive summary</h2>
            {pack.n === 0 ? (
              <p>No case was scored between {from || 'the beginning'} and {to || 'today'}, so the operating figures in this pack are empty. The project record and the model card below still apply.</p>
            ) : (
              <p>
                This workspace scored <strong>{pack.n.toLocaleString()}</strong> case{pack.n === 1 ? '' : 's'} in the period across {pack.days.length} active
                day{pack.days.length === 1 ? '' : 's'}, at a mean score of <strong>{pct(pack.mean)}</strong> (median {pct(pack.median)}, p90 {pct(pack.p90)}).{' '}
                <strong>{pack.above.toLocaleString()}</strong> of them — {pct(pack.n ? pack.above / pack.n : 0)} — reached the {pct(threshold)} action
                threshold and would have gone to a person. {pack.batches.length} batch run{pack.batches.length === 1 ? '' : 's'} contributed to that total.
              </p>
            )}
            {project.report.executiveSummary.map((para, i) => <p key={i}>{para}</p>)}
            {project.report.impact.length > 0 && (
              <>
                <h3>Programme impact, as recorded</h3>
                <Table caption="Programme impact" head={['Measure', 'Value']} rows={project.report.impact.map((i) => [i.label, i.value])} />
              </>
            )}
          </section>
        )}

        {on.volumes && (
          <section>
            <h2>Volumes</h2>
            {!pack.days.length ? (
              <p>No case was scored in this period.</p>
            ) : (
              <Table
                caption="Cases scored per day"
                head={['Day', 'Cases', 'At or above threshold', 'Mean score']}
                numeric={[false, true, true, true]}
                rows={pack.days.map((d) => [d.day, d.n.toLocaleString(), d.above.toLocaleString(), pct(d.mean)])}
                foot={['Total', pack.n.toLocaleString(), pack.above.toLocaleString(), pct(pack.mean)]}
              />
            )}
            {pack.bySource.length > 0 && (
              <>
                <h3>By source</h3>
                <Table
                  caption="Cases by source"
                  head={['Source', 'Cases', 'Mean score', 'At or above threshold']}
                  numeric={[false, true, true, true]}
                  rows={pack.bySource.map((s) => [s.source, s.n.toLocaleString(), pct(s.mean), s.above.toLocaleString()])}
                />
              </>
            )}
            <h3>Batch runs</h3>
            {pack.batches.length === 0 ? (
              <p>No batch was run in this period.</p>
            ) : (
              <Table
                caption="Batch runs in the period"
                head={['File', 'When', 'Rows', 'Scored', 'Mean', 'High risk', 'Model']}
                numeric={[false, false, true, true, true, true, false]}
                rows={pack.batches.map((b) => [b.name, shortDate(b.at), b.rows.toLocaleString(), b.scored.toLocaleString(), pct(b.meanScore), b.highRisk.toLocaleString(), b.model])}
              />
            )}
          </section>
        )}

        {on.distribution && (
          <section>
            <h2>Score distribution</h2>
            {!pack.n ? (
              <p>No case was scored in this period.</p>
            ) : (
              <>
                <p>
                  Ten equal-width bands over the {pack.n.toLocaleString()} case{pack.n === 1 ? '' : 's'} in the period.
                  p10 {pct(pack.p10)} · median {pct(pack.median)} · p90 {pct(pack.p90)} · mean {pct(pack.mean)}.
                </p>
                <Table
                  caption="Score distribution by decile band"
                  head={['Band', 'Cases', 'Share']}
                  numeric={[false, true, true]}
                  rows={pack.bins.map((b) => [`${b.lo}–${b.lo + 10}%`, b.n.toLocaleString(), pct(b.share)])}
                />
              </>
            )}
          </section>
        )}

        {on.drivers && (
          <section>
            <h2>Top drivers</h2>
            {!pack.reasons.length ? (
              <p>No reason codes were recorded for the cases in this period.</p>
            ) : (
              <>
                <p>Mean signed contribution recorded when each case was scored. A positive value pushed the score up.</p>
                <Table
                  caption="Mean contribution by driver"
                  head={['Driver', 'Mean contribution', 'Cases']}
                  numeric={[false, true, true]}
                  rows={pack.reasons.map((r) => [r.label, `${r.weight >= 0 ? '+' : '−'}${Math.abs(r.weight).toFixed(3)}`, r.n.toLocaleString()])}
                />
              </>
            )}
          </section>
        )}

        {on.drift && (
          <section>
            <h2>Drift</h2>
            {model && drift.length > 0 ? (
              <>
                <p>
                  Population stability index against the {model.n_train.toLocaleString()}-row distribution {model.algorithm} was fitted on.
                  Under 0.10 is stable, 0.10–0.25 a moderate shift, above 0.25 a significant one.
                </p>
                <Table
                  caption="Population stability index by feature"
                  head={['Feature', 'Cases', 'Training median', 'Observed median', 'PSI', 'Band']}
                  numeric={[false, true, true, true, true, false]}
                  rows={drift.map((d) => [
                    d.label, d.n.toLocaleString(), d.trainMedian.toLocaleString(undefined, { maximumFractionDigits: 3 }),
                    d.observedMedian.toLocaleString(undefined, { maximumFractionDigits: 3 }), d.psi.toFixed(3),
                    d.psi >= 0.25 ? 'Significant' : d.psi >= 0.1 ? 'Moderate' : 'Stable',
                  ])}
                />
              </>
            ) : model ? (
              <p>No model feature has at least five numeric observations in this period, so feature-level PSI cannot be computed yet.</p>
            ) : (
              <p>{project.short} scores without a trained tabular model exported alongside it, so there is no stored training distribution to measure feature drift against.</p>
            )}
            {Number.isFinite(pack.firstHalf) && Number.isFinite(pack.secondHalf) && (
              <p>
                Score drift within the period: the first half of the cases averaged {pct(pack.firstHalf)} and the second half {pct(pack.secondHalf)}, a shift
                of {pack.secondHalf - pack.firstHalf >= 0 ? '+' : '−'}{Math.abs((pack.secondHalf - pack.firstHalf) * 100).toFixed(1)} points.
              </p>
            )}
          </section>
        )}

        {on.model && (
          <section>
            <h2>Model card</h2>
            {model ? (
              <>
                <Table
                  caption="Model provenance and hold-out metrics"
                  head={['Field', 'Value']}
                  numeric={[false, true]}
                  rows={[
                    ['Algorithm', model.algorithm],
                    ['Training dataset', model.dataset],
                    ['Features', String(model.features.length)],
                    ['Trees', model.trees.length.toLocaleString()],
                    ['Training rows', model.n_train.toLocaleString()],
                    ['Hold-out rows', model.n_test.toLocaleString()],
                    ['Positive rate in training', pct(model.positive_rate)],
                    ['AUC', model.metrics.auc.toFixed(4)],
                    ['Average precision', model.metrics.avg_precision.toFixed(4)],
                    ['Brier score', model.metrics.brier.toFixed(4)],
                    ['Accuracy', model.metrics.accuracy.toFixed(4)],
                    ['F1', model.metrics.f1.toFixed(4)],
                  ]}
                />
                {model.notes && <p>{model.notes}</p>}
                <h3>Global importance (gain)</h3>
                <Table
                  caption="Global feature importance by gain"
                  head={['Feature', 'Gain']}
                  numeric={[false, true]}
                  rows={Object.entries(model.importance_gain).sort((a, b) => b[1] - a[1]).slice(0, 10)
                    .map(([f, v]) => [model.feature_meta[f]?.label ?? f, v.toLocaleString(undefined, { maximumFractionDigits: 2 })])}
                />
              </>
            ) : (
              <>
                <p>This product serves a published decision surface rather than a browser-side gradient-boosted model. The components it is built from:</p>
                <Table
                  caption="Model components"
                  head={['Component', 'Model', 'Purpose', 'Metric']}
                  rows={project.models.map((m) => [m.component, m.model, m.purpose, m.metric ?? '—'])}
                />
              </>
            )}
            {project.results.length > 0 && (
              <>
                <h3>Evaluation results, as published</h3>
                <Table
                  caption="Published evaluation results"
                  head={['Metric', 'Value', 'Note']}
                  numeric={[false, true, false]}
                  rows={project.results.map((r) => [r.metric, r.value, r.note ?? '—'])}
                />
              </>
            )}
          </section>
        )}

        {on.dataset && (
          <section>
            <h2>Dataset</h2>
            <p><strong>{project.dataset.name}</strong> — {project.dataset.size}</p>
            <p>{project.dataset.description}</p>
            {project.dataset.source && (
              <p>Source: <a href={project.dataset.source.url} target="_blank" rel="noreferrer">{project.dataset.source.label}</a></p>
            )}
            {project.dataset.facts.length > 0 && (
              <Table caption="Dataset facts" head={['Fact', 'Value']} numeric={[false, true]} rows={project.dataset.facts.map((f) => [f.label, f.value])} />
            )}
          </section>
        )}

        <footer style={{ borderTop: '1px solid var(--borderColor-default)', marginTop: 26, paddingTop: 14, color: 'var(--fgColor-muted)', fontSize: 13 }}>
          Generated in the browser from {pack.n.toLocaleString()} scored case{pack.n === 1 ? '' : 's'} held in this workspace. No data left the device.
        </footer>
      </article>

      {/* ── saved packs ──────────────────────────────────────────────── */}
      <section aria-labelledby="rp-saved" data-print="hide">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', marginBottom: 10 }}>
          <h2 id="rp-saved" style={{ fontSize: 15, margin: 0 }}>Saved packs</h2>
          <Label variant="secondary">{saved.length}</Label>
        </div>
        {saved.length === 0 ? (
          <div className="ap-empty">
            <HistoryIcon size={20} />
            <p style={{ margin: 0, maxWidth: '54ch' }}>
              Nothing saved yet. “Save to workspace” keeps the generated Markdown alongside the numbers it was built from, so the same pack can be
              downloaded again without regenerating it.
            </p>
            <Button size="small" leadingVisual={BookmarkIcon} onClick={persist}>Save this pack</Button>
          </div>
        ) : (
          <div className="ap-tablewrap">
            <table className="ap-table">
              <thead>
                <tr><th>Generated</th><th>Period</th><th className="num">Cases</th><th className="num">Mean</th><th className="num">Above threshold</th><th>Sections</th><th /><th /></tr>
              </thead>
              <tbody>
                {saved.map((r) => (
                  <tr key={r.id}>
                    <td>{shortDate(r.at)}</td>
                    <td>{r.from || '—'} → {r.to || '—'}</td>
                    <td className="num">{r.cases.toLocaleString()}</td>
                    <td className="num">{pct(r.meanScore)}</td>
                    <td className="num">{r.above.toLocaleString()}</td>
                    <td style={{ color: 'var(--fgColor-muted)' }}>{r.sections.length} of {SECTIONS.length}</td>
                    <td>
                      <span className="ap-badge-row">
                        <Button size="small" onClick={() => restore(r)}>Restore</Button>
                        <Button size="small" leadingVisual={DownloadIcon} onClick={() => download(`${project.slug}-evidence-pack-${r.at.slice(0, 10)}.md`, r.markdown, 'text/markdown')}>Markdown</Button>
                      </span>
                    </td>
                    <td><IconButton icon={TrashIcon} size="small" variant="invisible" aria-label={`Delete the pack generated on ${shortDate(r.at)}`} onClick={() => void removeReport(r.id)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Page>
  )
}

/* ── document table ───────────────────────────────────────────────────── */

function Table({ caption, head, rows, numeric, foot }: {
  caption: string
  head: string[]
  rows: (string | number)[][]
  numeric?: boolean[]
  foot?: (string | number)[]
}) {
  return (
    <div className="rp-scroll" style={{ overflowX: 'auto', border: '1px solid var(--borderColor-default)', borderRadius: 10 }}>
      <table className="ap-table">
        <caption className="fa-visually-hidden">{caption}</caption>
        <thead>
          <tr>{head.map((h, i) => <th key={h} className={numeric?.[i] ? 'num' : undefined}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>{r.map((cell, j) => <td key={j} className={numeric?.[j] ? 'num' : undefined} style={{ whiteSpace: 'normal' }}>{cell}</td>)}</tr>
          ))}
        </tbody>
        {foot && (
          <tfoot>
            <tr>{foot.map((cell, j) => <td key={j} className={numeric?.[j] ? 'num' : undefined} style={{ fontWeight: 700 }}>{cell}</td>)}</tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}
