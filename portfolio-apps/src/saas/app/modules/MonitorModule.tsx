/**
 * Monitoring — population drift.
 *
 * When the product ships a trained LightGBM model, every scored case is
 * compared feature by feature against the training distribution the model was
 * fitted on, using a population-stability-index-style statistic. Without a
 * model there is nothing to compare against, so the screen falls back to score
 * drift over time and says so.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Label, LinkButton, Spinner } from '@primer/react'
import { PulseIcon, StackIcon, ZapIcon } from '@primer/octicons-react'
import { ChartCard } from '@/components/Charts'
import type { ChartSpec, LineChart, RocChart } from '@/content/types'
import { loadLgbm, type LgbmModel } from '@/lib/lgbm'
import { useSite } from '../../context'
import { Page, pct, useCollection, type ScoredCase } from '../shared'
import { REAL_MODEL, type ModuleDef } from '../spec'

/* ── PSI ──────────────────────────────────────────────────────────────── */

/**
 * Ten bins centred on the training median, expressed as a fraction of the
 * median's own magnitude. A population still centred where the model was
 * trained spreads roughly evenly across them, so a flat 10% per bin is the
 * expectation the observed histogram is measured against.
 */
const EDGES = [-0.75, -0.5, -0.25, -0.1, 0, 0.1, 0.25, 0.5, 0.75]
const EXPECTED = 1 / (EDGES.length + 1)
const FLOOR = 1e-4

export interface FeatureDrift {
  feature: string
  label: string
  unit?: string
  n: number
  psi: number
  trainMedian: number
  observedMedian: number
  bins: number[]
}

function bucket(t: number): number {
  for (let i = 0; i < EDGES.length; i++) if (t < EDGES[i]) return i
  return EDGES.length
}

function medianOf(xs: number[]): number {
  if (!xs.length) return Number.NaN
  const s = [...xs].sort((a, b) => a - b)
  const mid = s.length >> 1
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

/** Match a case's input key to a model feature name, tolerating case and separators. */
function indexInputs(cases: ScoredCase[], features: string[]): Map<string, number[]> {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  const byNorm = new Map(features.map((f) => [norm(f), f]))
  const out = new Map<string, number[]>(features.map((f) => [f, []]))
  for (const c of cases) {
    for (const [k, raw] of Object.entries(c.inputs ?? {})) {
      const feature = byNorm.get(norm(k))
      if (!feature) continue
      const v = typeof raw === 'number' ? raw : Number(raw)
      if (!Number.isFinite(v)) continue
      out.get(feature)!.push(v)
    }
  }
  return out
}

export function computeDrift(model: LgbmModel, cases: ScoredCase[], minObs = 5): FeatureDrift[] {
  const observed = indexInputs(cases, model.features)
  const out: FeatureDrift[] = []
  for (const feature of model.features) {
    const values = observed.get(feature) ?? []
    if (values.length < minObs) continue
    const m = model.medians[feature]
    if (!Number.isFinite(m)) continue
    const magnitude = Math.abs(m)
    const spread = magnitude > 1e-9 ? magnitude : Math.max(1e-9, values.reduce((a, v) => a + Math.abs(v), 0) / values.length || 1)
    const bins = Array.from({ length: EDGES.length + 1 }, () => 0)
    for (const v of values) bins[bucket((v - m) / spread)] += 1
    let psi = 0
    for (const count of bins) {
      const obs = Math.max(count / values.length, FLOOR)
      psi += (obs - EXPECTED) * Math.log(obs / EXPECTED)
    }
    out.push({
      feature,
      label: model.feature_meta[feature]?.label ?? feature,
      unit: model.feature_meta[feature]?.unit,
      n: values.length,
      psi,
      trainMedian: m,
      observedMedian: medianOf(values),
      bins,
    })
  }
  return out.sort((a, b) => b.psi - a.psi)
}

const band = (psi: number) => (psi >= 0.25 ? 'severe' : psi >= 0.1 ? 'moderate' : 'stable')
const BAND_LABEL = { stable: 'Stable', moderate: 'Moderate shift', severe: 'Significant shift' } as const
const BAND_TONE = { stable: 'success', moderate: 'attention', severe: 'danger' } as const

/* ── score over time ──────────────────────────────────────────────────── */

function scoreByDay(cases: ScoredCase[]): Record<string, number | string>[] {
  const byDay = new Map<string, { sum: number; n: number }>()
  for (const c of cases) {
    const day = c.at.slice(0, 10)
    if (day.length !== 10) continue
    const cur = byDay.get(day) ?? { sum: 0, n: 0 }
    cur.sum += c.score
    cur.n += 1
    byDay.set(day, cur)
  }
  return [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, v]) => ({ day: day.slice(5), mean: Number(((v.sum / v.n) * 100).toFixed(2)), volume: v.n }))
}

/* ── module ───────────────────────────────────────────────────────────── */

export function MonitorModule({ mod }: { mod: ModuleDef }) {
  const { project } = useSite()
  const { items: cases, loading } = useCollection<ScoredCase>('cases')
  const spec = REAL_MODEL[project.slug]
  const [model, setModel] = useState<LgbmModel | null>(null)
  const [modelError, setModelError] = useState<string | null>(null)

  useEffect(() => {
    if (!spec) return
    let live = true
    loadLgbm(spec.url)
      .then((m) => live && setModel(m))
      .catch((e: unknown) => live && setModelError(e instanceof Error ? e.message : String(e)))
    return () => { live = false }
  }, [spec])

  const drift = useMemo(() => (model ? computeDrift(model, cases) : []), [model, cases])
  const daily = useMemo(() => scoreByDay(cases), [cases])

  const overall = useMemo(() => {
    if (!drift.length) return null
    const worst = drift[0]
    const shifted = drift.filter((d) => d.psi >= 0.1).length
    return { worst, shifted, mean: drift.reduce((a, d) => a + d.psi, 0) / drift.length }
  }, [drift])

  const trendChart: LineChart | null = daily.length >= 2 ? {
    kind: 'line',
    title: 'Mean score over time',
    subtitle: `${cases.length.toLocaleString()} cases across ${daily.length} day${daily.length === 1 ? '' : 's'}`,
    xKey: 'day',
    series: [{ key: 'mean', label: 'Mean score' }],
    data: daily,
    valueFormat: 'percent',
    yLabel: 'Mean score',
    span: model ? 6 : 12,
    note: 'A rising line means the population being scored is getting riskier, the model is drifting, or both — the feature table below separates the two.',
  } : null

  const volumeChart: LineChart | null = daily.length >= 2 ? {
    kind: 'area',
    title: 'Volume scored per day',
    subtitle: 'How much evidence each point on the trend rests on',
    xKey: 'day',
    series: [{ key: 'volume', label: 'Cases scored' }],
    data: daily,
    yLabel: 'Cases',
    span: model ? 6 : 12,
  } : null

  const calibrationChart: LineChart | null = model ? {
    kind: 'line',
    title: 'Model calibration at training time',
    subtitle: `Reliability curve on the ${model.n_test.toLocaleString()}-row hold-out · Brier ${model.metrics.brier.toFixed(4)}`,
    xKey: 'predicted',
    series: [{ key: 'observed', label: 'Observed rate' }, { key: 'ideal', label: 'Perfect calibration' }],
    data: model.calibration.map(([p, o]) => ({
      predicted: Number((p * 100).toFixed(1)),
      observed: Number((o * 100).toFixed(1)),
      ideal: Number((p * 100).toFixed(1)),
    })),
    valueFormat: 'percent',
    yLabel: 'Observed rate',
    span: 6,
    note: 'Where the observed line sits above the ideal line the model under-states risk in that band, and below it over-states it.',
  } : null

  const rocChart: RocChart | null = model ? {
    kind: 'roc',
    title: 'Discrimination at training time',
    subtitle: `${model.n_test.toLocaleString()} hold-out rows · ${model.dataset}`,
    curves: [{ label: model.algorithm, auc: model.metrics.auc, points: model.roc }],
    span: 6,
  } : null

  const psiChart: ChartSpec | null = drift.length ? {
    kind: 'importance',
    title: 'Population stability index by feature',
    subtitle: `Computed from ${cases.length.toLocaleString()} scored case${cases.length === 1 ? '' : 's'}`,
    items: drift.map((d) => ({ name: d.label, value: Number(d.psi.toFixed(3)) })),
    span: 12,
    note: 'Bands: under 0.10 stable · 0.10–0.25 moderate shift, worth watching · over 0.25 significant shift, retraining is indicated.',
  } : null

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
          <PulseIcon size={24} />
          <h2 style={{ margin: 0, fontSize: 17 }}>Nothing to monitor yet</h2>
          <p style={{ margin: 0, maxWidth: '52ch' }}>
            Drift is measured against the cases this workspace has scored. Score a case or run a batch and the distributions appear here.
          </p>
          <div className="ap-badge-row">
            {project.demo && <LinkButton as={Link} to="/app/score" leadingVisual={ZapIcon} variant="primary" size="small">Score a case</LinkButton>}
            <LinkButton as={Link} to="/app/batch" leadingVisual={StackIcon} size="small">Run a batch</LinkButton>
          </div>
        </div>
      </Page>
    )
  }

  return (
    <Page
      mod={mod}
      sub={spec
        ? `Population stability against the distribution ${spec.label} was trained on, feature by feature.`
        : 'Score drift over time. This product has no browser-side model, so there is no training distribution to compare features against.'}
    >
      <p style={{ margin: 0, color: 'var(--fgColor-muted)', maxWidth: '86ch' }}>
        <strong style={{ color: 'var(--fgColor-default)' }}>PSI</strong> measures how far the population you are scoring has moved from the population the model was fitted on:
        each feature is bucketed into ten bands around its training median and the observed share of each band is compared with an even expectation, so a bigger number means a bigger shift.
      </p>

      {spec && !model && !modelError && (
        <div className="ap-empty" role="status" aria-live="polite"><Spinner size="medium" /><p>Loading {spec.label}…</p></div>
      )}
      {modelError && (
        <div className="ap-empty">
          <p style={{ margin: 0 }}>The model could not be loaded ({modelError}). Score drift below is still computed from your own cases.</p>
        </div>
      )}

      {model && (
        <div className="ap-cards">
          <div className="ap-card">
            <h3>Features compared</h3>
            <div className="ap-card__v">{drift.length}</div>
            <p>of {model.features.length} model features, where your cases carry a numeric value. Features you never supply are scored at the training median and cannot drift.</p>
          </div>
          <div className="ap-card">
            <h3>Features shifted</h3>
            <div className="ap-card__v" style={{ color: (overall?.shifted ?? 0) > 0 ? 'var(--fgColor-attention)' : 'var(--fgColor-success)' }}>{overall?.shifted ?? 0}</div>
            <p>PSI at or above 0.10. Mean PSI across compared features is {overall ? overall.mean.toFixed(3) : '—'}.</p>
          </div>
          <div className="ap-card">
            <h3>Largest shift</h3>
            <div className="ap-card__v">{overall ? overall.worst.psi.toFixed(3) : '—'}</div>
            <p>{overall ? overall.worst.label : 'Nothing measurable yet'}{overall ? ` · ${BAND_LABEL[band(overall.worst.psi)]}` : ''}.</p>
          </div>
          <div className="ap-card">
            <h3>Evidence</h3>
            <div className="ap-card__v">{cases.length.toLocaleString()}</div>
            <p>
              cases scored here, against {model.n_train.toLocaleString()} training rows.
              {cases.length < 100 && ' Under about 100 cases PSI is noisy — treat the ranking as directional.'}
            </p>
          </div>
        </div>
      )}

      {psiChart && <div className="fa-grid"><ChartCard spec={psiChart} /></div>}

      {model && drift.length > 0 && (
        <section aria-labelledby="mo-table">
          <h2 id="mo-table" style={{ fontSize: 15, margin: '0 0 10px' }}>Feature drift, ranked</h2>
          <div className="ap-tablewrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th className="num">Cases</th>
                  <th className="num">Training median</th>
                  <th className="num">Your median</th>
                  <th className="num">Shift</th>
                  <th className="num">PSI</th>
                  <th>Band</th>
                </tr>
              </thead>
              <tbody>
                {drift.map((d) => {
                  const b = band(d.psi)
                  const rel = Math.abs(d.trainMedian) > 1e-9 ? (d.observedMedian - d.trainMedian) / Math.abs(d.trainMedian) : null
                  return (
                    <tr key={d.feature}>
                      <td style={{ whiteSpace: 'normal' }}>
                        {d.label}
                        <span style={{ color: 'var(--fgColor-muted)' }}>{d.unit ? ` · ${d.unit}` : ''}</span>
                      </td>
                      <td className="num">{d.n.toLocaleString()}</td>
                      <td className="num">{d.trainMedian.toLocaleString(undefined, { maximumFractionDigits: 3 })}</td>
                      <td className="num">{d.observedMedian.toLocaleString(undefined, { maximumFractionDigits: 3 })}</td>
                      <td className="num">{rel === null ? '—' : `${rel >= 0 ? '+' : '−'}${(Math.abs(rel) * 100).toFixed(1)}%`}</td>
                      <td className="num" style={{ fontWeight: 600 }}>{d.psi.toFixed(3)}</td>
                      <td><Label variant={BAND_TONE[b]} size="small">{BAND_LABEL[b]}</Label></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {model && drift.length === 0 && (
        <div className="ap-empty">
          <p style={{ margin: 0, maxWidth: '58ch' }}>
            None of the model&apos;s {model.features.length} features has at least five numeric observations in this workspace yet.
            Score a few more cases — or run a batch whose columns match the feature names — and the drift table fills in.
          </p>
        </div>
      )}

      <div className="fa-grid">
        {trendChart && <ChartCard spec={trendChart} />}
        {volumeChart && <ChartCard spec={volumeChart} />}
        {calibrationChart && <ChartCard spec={calibrationChart} />}
        {rocChart && <ChartCard spec={rocChart} />}
      </div>

      {!trendChart && (
        <div className="ap-empty">
          <p style={{ margin: 0 }}>
            All {cases.length.toLocaleString()} case{cases.length === 1 ? ' was' : 's were'} scored on the same day, so there is no trend to draw yet.
            Mean score so far is {pct(cases.reduce((a, c) => a + c.score, 0) / cases.length)}.
          </p>
        </div>
      )}

      {!spec && (
        <p style={{ margin: 0, color: 'var(--fgColor-muted)', maxWidth: '86ch' }}>
          {project.short} scores in the browser without a trained tabular model exported alongside it, so there is no stored training distribution and no
          calibration curve to show. Feature-level PSI needs one; the score trend above is measured entirely from your own cases and is honest on its own terms.
        </p>
      )}
    </Page>
  )
}
