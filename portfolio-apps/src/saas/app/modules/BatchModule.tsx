import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Banner, Button, Label, ProgressBar, Token } from '@primer/react'
import { DownloadIcon, FileIcon, TrashIcon, UploadIcon } from '@primer/octicons-react'
import { useSite } from '../../context'
import { loadLgbm, predict, type LgbmModel } from '@/lib/lgbm'
import { ChartGrid } from '@/components/Charts'
import type { ChartSpec } from '@/content/types'
import { REAL_MODEL, type ModuleDef } from '../spec'
import { ADAPTERS } from '../adapters'
import { Page, download, parseCsv, shortDate, toCsv, useCollection, type BatchRun, type ScoredCase } from '../shared'

interface Row { i: number; input: Record<string, string>; score: number; verdict: string; tone: string; reasons: { label: string; weight: number }[] }

const MAX_SAVED_CASES = 400

export function BatchModule({ mod }: { mod: ModuleDef }) {
  const { project } = useSite()
  const real = REAL_MODEL[project.slug]
  const adapter = ADAPTERS[project.slug]
  const spec = project.demo
  const [model, setModel] = useState<LgbmModel | null>(null)
  const [over, setOver] = useState(false)
  const [file, setFile] = useState<string | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [busy, setBusy] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [sort, setSort] = useState<'score' | 'index'>('score')
  const inputRef = useRef<HTMLInputElement>(null)
  const { items: batches, save: saveBatch, remove: removeBatch } = useCollection<BatchRun>('batches')
  const { save: saveCase } = useCollection<ScoredCase>('cases')

  useEffect(() => {
    if (!real) return
    let alive = true
    loadLgbm(real.url).then((m) => alive && setModel(m)).catch(() => undefined)
    return () => { alive = false }
  }, [real])

  const threshold = adapter?.threshold ?? 0.5

  const scoreRow = useCallback(
    (input: Record<string, string>): { score: number; verdict: string; tone: string; reasons: { label: string; weight: number }[] } | null => {
      if (model && adapter) {
        const numeric: Record<string, number | string> = {}
        for (const [k, v] of Object.entries(input)) {
          const n = Number(v)
          numeric[k] = v !== '' && Number.isFinite(n) ? n : v
        }
        const mapped = adapter.map(numeric)
        // Columns that already match model features win over the adapter mapping.
        for (const f of model.features) {
          const raw = input[f]
          if (raw !== undefined && raw !== '') {
            const n = Number(raw)
            if (Number.isFinite(n)) mapped[f] = n
          }
        }
        const { prob, attributions } = predict(model, mapped)
        const read = adapter.interpret(prob, numeric, model)
        return { score: prob, verdict: read.headline, tone: read.tone, reasons: attributions.slice(0, 4).map((a) => ({ label: a.label, weight: a.weight })) }
      }
      if (spec) {
        const vals: Record<string, number | string> = {}
        for (const inp of spec.inputs) {
          const raw = input[inp.key]
          if (raw === undefined || raw === '') { vals[inp.key] = inp.default; continue }
          vals[inp.key] = inp.type === 'range' ? Number(raw) : raw
        }
        const r = spec.evaluate(vals)
        return { score: r.score, verdict: r.headline, tone: r.tone, reasons: (r.reasons ?? []).slice(0, 4) }
      }
      return null
    },
    [model, adapter, spec],
  )

  const ingest = useCallback(
    async (name: string, text: string) => {
      setError(null)
      const { columns: cols, rows: parsed } = parseCsv(text)
      if (!parsed.length) { setError('That file has a header but no data rows.'); return }
      const known = model ? model.features : spec ? spec.inputs.map((i) => i.key) : []
      const matched = cols.filter((c) => known.includes(c))
      if (!matched.length) {
        setError(`None of the columns match the model inputs. Expected some of: ${known.slice(0, 8).join(', ')}…`)
        return
      }
      setFile(name)
      setColumns(cols)
      const out: Row[] = []
      const capped = parsed.slice(0, 5000)
      for (let i = 0; i < capped.length; i++) {
        const r = scoreRow(capped[i])
        if (r) out.push({ i, input: capped[i], ...r })
        if (i % 200 === 0) { setBusy(Math.round((i / capped.length) * 100)); await new Promise((res) => setTimeout(res)) }
      }
      setBusy(0)
      setRows(out)

      const mean = out.reduce((a, r) => a + r.score, 0) / (out.length || 1)
      const high = out.filter((r) => r.score >= threshold).length
      const id = crypto.randomUUID()
      await saveBatch(id, {
        id, at: new Date().toISOString(), name, rows: parsed.length, scored: out.length,
        meanScore: mean, highRisk: high, columns: matched, model: real?.label ?? 'Published decision surface',
      })
      const keep = out.slice(0, MAX_SAVED_CASES)
      for (const r of keep) {
        const cid = `${id}-${r.i}`
        await saveCase(cid, {
          id: cid, at: new Date().toISOString(), source: 'batch', label: `${name} · row ${r.i + 1}`,
          score: r.score, verdict: r.verdict, tone: r.tone, inputs: r.input, reasons: r.reasons, batchId: id,
        })
      }
    },
    [model, spec, scoreRow, saveBatch, saveCase, threshold, real],
  )

  const onFiles = useCallback(
    (files: FileList | null) => {
      const f = files?.[0]
      if (!f) return
      const reader = new FileReader()
      reader.onload = () => void ingest(f.name, String(reader.result ?? ''))
      reader.readAsText(f)
    },
    [ingest],
  )

  const sample = useCallback(() => {
    const feats = model ? model.features : spec ? spec.inputs.map((i) => i.key) : []
    if (!feats.length) return
    let s = 1337
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
    const lines: Record<string, unknown>[] = []
    for (let i = 0; i < 120; i++) {
      const row: Record<string, unknown> = {}
      for (const f of feats) {
        if (model) {
          const med = model.medians[f] ?? 0
          const spread = Math.max(Math.abs(med) * 0.6, 1)
          const v = med + (rnd() - 0.5) * 2 * spread
          row[f] = Number.isInteger(med) ? Math.round(v) : Number(v.toFixed(4))
        } else if (spec) {
          const inp = spec.inputs.find((x) => x.key === f)
          if (!inp) continue
          if (inp.type === 'select') row[f] = (inp.options ?? [String(inp.default)])[Math.floor(rnd() * (inp.options?.length ?? 1))]
          else {
            const lo = inp.min ?? 0, hi = inp.max ?? 100
            const v = lo + rnd() * (hi - lo)
            row[f] = Number(v.toFixed(inp.step && inp.step < 1 ? 3 : 0))
          }
        }
      }
      lines.push(row)
    }
    download(`${project.slug}-sample.csv`, toCsv(feats, lines))
  }, [model, spec, project.slug])

  const stats = useMemo(() => {
    if (!rows.length) return null
    const scores = rows.map((r) => r.score).sort((a, b) => a - b)
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length
    const p = (q: number) => scores[Math.min(scores.length - 1, Math.floor(q * scores.length))]
    return { n: rows.length, mean, median: p(0.5), p90: p(0.9), high: rows.filter((r) => r.score >= threshold).length }
  }, [rows, threshold])

  const charts = useMemo<ChartSpec[]>(() => {
    if (!rows.length) return []
    const bins = Array.from({ length: 10 }, (_, i) => ({ bin: `${i * 10}–${i * 10 + 10}%`, n: 0 }))
    for (const r of rows) bins[Math.min(9, Math.floor(r.score * 10))].n++
    const byReason = new Map<string, { sum: number; n: number }>()
    for (const r of rows) for (const q of r.reasons) {
      const e = byReason.get(q.label) ?? { sum: 0, n: 0 }
      e.sum += q.weight; e.n++
      byReason.set(q.label, e)
    }
    const items = [...byReason.entries()].map(([name, e]) => ({ name, value: Number((e.sum / e.n).toFixed(4)) }))
    return [
      { kind: 'bar', title: 'Score distribution', subtitle: `${rows.length.toLocaleString()} rows scored in this browser`, xKey: 'bin', span: 8, series: [{ key: 'n', label: 'Rows' }], data: bins, note: `${stats?.high ?? 0} rows are at or above the ${(threshold * 100).toFixed(0)}% action threshold.` },
      { kind: 'donut', title: 'Above threshold', span: 4, valueFormat: 'number', center: `${(((stats?.high ?? 0) / rows.length) * 100).toFixed(0)}%`, data: [{ name: 'Action', value: stats?.high ?? 0 }, { name: 'No action', value: rows.length - (stats?.high ?? 0) }], note: 'The share of this file that would reach a human.' },
      ...(items.length ? [{ kind: 'importance' as const, title: 'Average contribution by driver', subtitle: 'Mean signed contribution across the file', diverging: true, span: 12 as const, items, note: 'Positive values pushed scores up across this population.' }] : []),
    ]
  }, [rows, stats, threshold])

  const sorted = useMemo(() => (sort === 'score' ? [...rows].sort((a, b) => b.score - a.score) : rows), [rows, sort])

  return (
    <Page mod={mod}>
      <div className="ap-toolbar">
        <span className="ap-badge-row">
          <Label variant={model ? 'success' : 'secondary'}>{model ? 'Trained model' : 'Decision surface'}</Label>
          <Token text={real?.label ?? project.models[0]?.model ?? 'Heuristic'} size="small" />
          {model && <Token text={`${model.features.length} features`} size="small" />}
        </span>
        <span className="ap-toolbar__spacer" />
        <Button size="small" leadingVisual={FileIcon} onClick={sample}>Download a sample file</Button>
        <Button size="small" variant="primary" leadingVisual={UploadIcon} onClick={() => inputRef.current?.click()}>Upload CSV</Button>
        <input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => onFiles(e.target.files)} />
      </div>

      {error && <Banner variant="critical" title="That file could not be scored" description={error} onDismiss={() => setError(null)} />}
      {busy > 0 && (
        <div>
          <p style={{ margin: '0 0 6px', color: 'var(--fgColor-muted)' }} aria-live="polite">Scoring… {busy}%</p>
          <ProgressBar progress={busy} aria-label="Scoring progress" />
        </div>
      )}

      {!rows.length && !busy && (
        <div
          className="ap-drop"
          data-over={over}
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
          onDragOver={(e) => { e.preventDefault(); setOver(true) }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); onFiles(e.dataTransfer.files) }}
        >
          <UploadIcon size={24} />
          <strong style={{ color: 'var(--fgColor-default)' }}>Drop a CSV here</strong>
          <span>Every row is scored in this browser. Nothing is uploaded.</span>
          <span style={{ fontSize: 12.5 }}>
            Columns matched by name against {model ? `the model's ${model.features.length} features` : 'the scorer inputs'}. Start with the sample file if you have none.
          </span>
        </div>
      )}

      {stats && (
        <>
          <div className="ap-cards">
            <div className="ap-card"><h3>Rows scored</h3><div className="ap-card__v">{stats.n.toLocaleString()}</div><p>from {file}</p></div>
            <div className="ap-card"><h3>Mean score</h3><div className="ap-card__v">{(stats.mean * 100).toFixed(1)}%</div><p>median {(stats.median * 100).toFixed(1)}% · p90 {(stats.p90 * 100).toFixed(1)}%</p></div>
            <div className="ap-card"><h3>Above threshold</h3><div className="ap-card__v">{stats.high.toLocaleString()}</div><p>at or above {(threshold * 100).toFixed(0)}%</p></div>
            <div className="ap-card"><h3>Saved to workspace</h3><div className="ap-card__v">{Math.min(stats.n, MAX_SAVED_CASES)}</div><p>available to Cohorts, Alerts and Reports</p></div>
          </div>

          <ChartGrid charts={charts} />

          <div>
            <div className="ap-toolbar" style={{ borderRadius: '12px 12px 0 0', borderBottom: 0 }}>
              <strong style={{ fontSize: 14 }}>Scored rows</strong>
              <span className="ap-toolbar__spacer" />
              <Button size="small" onClick={() => setSort(sort === 'score' ? 'index' : 'score')}>Sort by {sort === 'score' ? 'file order' : 'score'}</Button>
              <Button size="small" leadingVisual={DownloadIcon} onClick={() => download(
                `${project.slug}-scored.csv`,
                toCsv(['row', 'score', 'verdict', ...columns], sorted.map((r) => ({ row: r.i + 1, score: r.score.toFixed(6), verdict: r.verdict, ...r.input }))),
              )}>Export results</Button>
            </div>
            <div className="ap-tablewrap" style={{ borderRadius: '0 0 12px 12px' }}>
              <table className="ap-table">
                <thead>
                  <tr>
                    <th className="num">#</th>
                    <th className="num">Score</th>
                    <th>Verdict</th>
                    <th>Top driver</th>
                    {columns.slice(0, 6).map((c) => <th key={c}>{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {sorted.slice(0, 300).map((r) => (
                    <tr key={r.i}>
                      <td className="num">{r.i + 1}</td>
                      <td className="num" style={{ fontWeight: 700, color: r.score >= threshold ? 'var(--fgColor-danger)' : 'var(--fgColor-default)' }}>{(r.score * 100).toFixed(1)}%</td>
                      <td>{r.verdict}</td>
                      <td style={{ color: 'var(--fgColor-muted)' }}>{r.reasons[0]?.label ?? '—'}</td>
                      {columns.slice(0, 6).map((c) => <td key={c}>{r.input[c]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {sorted.length > 300 && <p style={{ color: 'var(--fgColor-muted)', fontSize: 13, marginTop: 8 }}>Showing the first 300 of {sorted.length.toLocaleString()} rows. Export to see them all.</p>}
          </div>
        </>
      )}

      {batches.length > 0 && (
        <div>
          <h2 className="fa-section__title" style={{ fontSize: 18, marginBottom: 12 }}>Previous runs</h2>
          <div className="ap-tablewrap">
            <table className="ap-table">
              <thead><tr><th>File</th><th>When</th><th className="num">Rows</th><th className="num">Mean</th><th className="num">Above threshold</th><th>Model</th><th /></tr></thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id}>
                    <td>{b.name}</td>
                    <td>{shortDate(b.at)}</td>
                    <td className="num">{b.rows.toLocaleString()}</td>
                    <td className="num">{(b.meanScore * 100).toFixed(1)}%</td>
                    <td className="num">{b.highRisk.toLocaleString()}</td>
                    <td style={{ color: 'var(--fgColor-muted)' }}>{b.model}</td>
                    <td><Button size="small" variant="invisible" leadingVisual={TrashIcon} onClick={() => void removeBatch(b.id)} aria-label={`Delete run ${b.name}`} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Page>
  )
}
