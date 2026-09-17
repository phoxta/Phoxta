import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Label, LinkButton, Token } from '@primer/react'
import { ArrowRightIcon, CheckCircleFillIcon, StackIcon, ZapIcon } from '@primer/octicons-react'
import { useSite } from '../../context'
import { deriveProduct } from '../../fallback'
import { useAuth } from '../../auth'
import { ChartGrid } from '@/components/Charts'
import type { ChartSpec } from '@/content/types'
import { REAL_MODEL, moduleSpec, type ModuleDef } from '../spec'
import { ADAPTERS } from '../adapters'
import { Page, shortDate, useCollection, type AlertRule, type BatchRun, type ScoredCase } from '../shared'

export function OverviewModule({ mod }: { mod: ModuleDef }) {
  const site = useSite()
  const { project } = site
  const product = site.product ?? deriveProduct(project)
  const { account } = useAuth()
  const { items: cases } = useCollection<ScoredCase>('cases')
  const { items: batches } = useCollection<BatchRun>('batches')
  const { items: rules } = useCollection<AlertRule>('alerts')
  const modules = useMemo(() => moduleSpec(project, site.product), [project, site.product])
  const threshold = ADAPTERS[project.slug]?.threshold ?? 0.5
  const real = REAL_MODEL[project.slug]

  const stats = useMemo(() => {
    const above = cases.filter((c) => c.score >= threshold)
    const mean = cases.length ? cases.reduce((a, c) => a + c.score, 0) / cases.length : 0
    return { total: cases.length, above: above.length, mean, batches: batches.length, rules: rules.filter((r) => r.active).length }
  }, [cases, batches, rules, threshold])

  const charts = useMemo<ChartSpec[]>(() => {
    if (cases.length < 2) return []
    const byDay = new Map<string, { n: number; sum: number; high: number }>()
    for (const c of cases) {
      const d = c.at.slice(0, 10)
      const e = byDay.get(d) ?? { n: 0, sum: 0, high: 0 }
      e.n++; e.sum += c.score; if (c.score >= threshold) e.high++
      byDay.set(d, e)
    }
    const days = [...byDay.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([day, e]) => ({
      day: day.slice(5), scored: e.n, flagged: e.high, mean: Number((e.sum / e.n * 100).toFixed(1)),
    }))
    const bins = Array.from({ length: 10 }, (_, i) => ({ bin: `${i * 10}–${i * 10 + 10}%`, n: 0 }))
    for (const c of cases) bins[Math.min(9, Math.floor(c.score * 10))].n++
    return [
      { kind: 'bar', title: 'Volume by day', subtitle: 'Cases scored in this workspace', xKey: 'day', span: 8, stacked: true, series: [{ key: 'flagged', label: 'Above threshold' }, { key: 'scored', label: 'Scored' }], data: days, note: `${stats.above} of ${stats.total} cases reached the ${(threshold * 100).toFixed(0)}% action threshold.` },
      { kind: 'donut', title: 'Outcome mix', span: 4, center: `${(stats.mean * 100).toFixed(0)}% mean`, data: [{ name: 'Action', value: stats.above }, { name: 'No action', value: stats.total - stats.above }], note: 'How much of the population needs a person.' },
      { kind: 'bar', title: 'Score distribution', xKey: 'bin', span: 12, series: [{ key: 'n', label: 'Cases' }], data: bins, note: 'A healthy population is bimodal: the model is decisive on most cases.' },
    ]
  }, [cases, stats, threshold])

  const next = [
    { done: cases.some((c) => c.source === 'single'), label: 'Score a single case', to: '/app/score' },
    { done: batches.length > 0, label: 'Run a batch file', to: '/app/batch' },
    { done: rules.length > 0, label: 'Set an alert rule', to: '/app/alerts' },
    { done: cases.length >= 10, label: 'Build a cohort', to: '/app/cohorts' },
  ].filter((s) => modules.some((m) => `/app/${m.id}` === s.to))

  return (
    <Page mod={mod} sub={`${account?.email ?? 'Your workspace'} · ${product.name}`}>
      <div className="ap-cards">
        <div className="ap-card"><h3>Cases scored</h3><div className="ap-card__v">{stats.total.toLocaleString()}</div><p>{stats.batches} batch {stats.batches === 1 ? 'run' : 'runs'} in this workspace</p></div>
        <div className="ap-card"><h3>Needing a decision</h3><div className="ap-card__v">{stats.above.toLocaleString()}</div><p>at or above the {(threshold * 100).toFixed(0)}% threshold</p></div>
        <div className="ap-card"><h3>Mean score</h3><div className="ap-card__v">{(stats.mean * 100).toFixed(1)}%</div><p>across everything scored here</p></div>
        <div className="ap-card"><h3>Active alert rules</h3><div className="ap-card__v">{stats.rules}</div><p>{stats.rules ? 'watching every new case' : 'nothing is being watched yet'}</p></div>
      </div>

      {cases.length === 0 ? (
        <div className="ap-empty">
          <ZapIcon size={24} />
          <strong style={{ color: 'var(--fgColor-default)', fontSize: 16 }}>Nothing scored yet</strong>
          <p style={{ maxWidth: '52ch', margin: 0 }}>
            {real
              ? `Score one case by hand, or drop a CSV in and let ${real.label.split(' · ')[0]} run over the whole file. Both run in this browser.`
              : 'Score one case by hand, or drop a CSV in and score the whole file. Both run in this browser.'}
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            {modules.some((m) => m.id === 'score') && <LinkButton as={Link} to="/app/score" variant="primary" leadingVisual={ZapIcon}>Score a case</LinkButton>}
            <LinkButton as={Link} to="/app/batch" leadingVisual={StackIcon}>Upload a file</LinkButton>
          </div>
        </div>
      ) : (
        <ChartGrid charts={charts} />
      )}

      <div className="fa-two">
        <div className="fa-card">
          <div className="fa-card__body">
            <h3 className="fa-card__title">Recent activity</h3>
            {cases.length === 0 ? (
              <p className="fa-card__sub" style={{ marginTop: 8 }}>Scored cases appear here.</p>
            ) : (
              <div className="ap-tablewrap" style={{ marginTop: 12, maxHeight: 300 }}>
                <table className="ap-table">
                  <thead><tr><th>Case</th><th className="num">Score</th><th>Verdict</th><th>When</th></tr></thead>
                  <tbody>
                    {cases.slice(0, 12).map((c) => (
                      <tr key={c.id}>
                        <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.label}</td>
                        <td className="num" style={{ fontWeight: 700, color: c.score >= threshold ? 'var(--fgColor-danger)' : undefined }}>{(c.score * 100).toFixed(1)}%</td>
                        <td>{c.verdict}</td>
                        <td style={{ color: 'var(--fgColor-muted)' }}>{shortDate(c.at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <div className="fa-card">
            <div className="fa-card__body">
              <h3 className="fa-card__title">Get to value</h3>
              <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
                {next.map((s) => (
                  <Link key={s.to} to={s.to} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit', padding: '8px 4px', borderBottom: '1px solid var(--borderColor-muted)' }}>
                    <CheckCircleFillIcon size={16} className={s.done ? '' : undefined} />
                    <span style={{ flex: 1, textDecoration: s.done ? 'line-through' : 'none', opacity: s.done ? 0.6 : 1 }}>{s.label}</span>
                    {!s.done && <ArrowRightIcon size={14} />}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="fa-card">
            <div className="fa-card__body">
              <h3 className="fa-card__title">This workspace runs</h3>
              <div className="ap-badge-row" style={{ marginTop: 10 }}>
                <Label variant={real ? 'success' : 'secondary'}>{real ? 'Trained model' : 'Decision surface'}</Label>
                <Token text={real?.label ?? project.models[0]?.model ?? project.short} size="small" />
              </div>
              <dl className="ap-kv" style={{ marginTop: 12 }}>
                <dt>Dataset</dt><dd style={{ fontWeight: 500 }}>{project.dataset.name}</dd>
                <dt>Headline metric</dt><dd>{project.results[0]?.metric}: {project.results[0]?.value}</dd>
                <dt>Serving</dt><dd style={{ fontWeight: 500 }}>In-browser · API on :{project.api.port}</dd>
              </dl>
              <div style={{ marginTop: 12 }}>
                <LinkButton as={Link} to="/research/model" size="small">Open the model card</LinkButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Page>
  )
}
