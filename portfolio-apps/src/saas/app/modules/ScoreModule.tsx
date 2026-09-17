import { useCallback, useEffect, useMemo, useState } from 'react'
import { Banner, Button, Label, Spinner, Token } from '@primer/react'
import { BookmarkIcon, CheckIcon, CpuIcon, SyncIcon, ZapIcon } from '@primer/octicons-react'
import { useSite } from '../../context'
import { Meter } from '@/components/StatTiles'
import type { DemoResult, DemoSpec } from '@/content/types'
import { loadLgbm, predict, type LgbmModel } from '@/lib/lgbm'
import { REAL_MODEL, type ModuleDef } from '../spec'
import { ADAPTERS } from '../adapters'
import { Page, useCollection, type ScoredCase } from '../shared'

type Values = Record<string, number | string>

const defaults = (spec: DemoSpec): Values => Object.fromEntries(spec.inputs.map((i) => [i.key, i.default]))

export function ScoreModule({ mod }: { mod: ModuleDef }) {
  const { project } = useSite()
  const spec = project.demo
  const real = REAL_MODEL[project.slug]
  const adapter = ADAPTERS[project.slug]
  const useModel = Boolean(real && adapter)

  const [values, setValues] = useState<Values>(() => (spec ? defaults(spec) : {}))
  const [model, setModel] = useState<LgbmModel | null>(null)
  const [modelError, setModelError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const { items: cases, save } = useCollection<ScoredCase>('cases')

  useEffect(() => {
    if (!useModel || !real) return
    let alive = true
    loadLgbm(real.url)
      .then((m) => alive && setModel(m))
      .catch((e: unknown) => alive && setModelError(e instanceof Error ? e.message : String(e)))
    return () => {
      alive = false
    }
  }, [useModel, real])

  const result = useMemo<(DemoResult & { fromModel: boolean }) | null>(() => {
    if (!spec) return null
    if (model && adapter) {
      const { prob, attributions } = predict(model, adapter.map(values))
      const read = adapter.interpret(prob, values, model)
      return {
        ...read,
        score: prob,
        fromModel: true,
        reasons: attributions.slice(0, 6).map((a) => ({ label: `${a.label}: ${format(a.value)}`, weight: a.weight })),
      }
    }
    try {
      return { ...spec.evaluate(values), fromModel: false }
    } catch {
      return null
    }
  }, [spec, model, adapter, values])

  const set = useCallback((k: string, v: number | string) => {
    setValues((s) => ({ ...s, [k]: v }))
    setSaved(false)
  }, [])

  const persist = useCallback(async () => {
    if (!result) return
    const id = crypto.randomUUID()
    await save(id, {
      id,
      at: new Date().toISOString(),
      source: 'single',
      label: describe(values, project.slug),
      score: result.score,
      verdict: result.headline,
      tone: result.tone,
      inputs: values,
      reasons: result.reasons ?? [],
    })
    setSaved(true)
  }, [result, save, values, project.slug])

  if (!spec) {
    return (
      <Page mod={mod}>
        <div className="ap-empty"><p>This product does not expose a single-case scorer.</p></div>
      </Page>
    )
  }

  const maxW = Math.max(1e-9, ...(result?.reasons ?? []).map((r) => Math.abs(r.weight)))

  return (
    <Page mod={mod} sub={adapter?.outcome ?? spec.description}>
      <div className="ap-toolbar">
        <span className="ap-badge-row">
          {useModel && model && <Label variant="success"><CheckIcon size={12} /> Live model</Label>}
          {useModel && !model && !modelError && <Label variant="secondary">Loading model…</Label>}
          {!useModel && <Label variant="secondary">Decision surface</Label>}
          <Token text={real?.label ?? project.models[0]?.model ?? 'Heuristic'} size="small" />
          {model && <Token text={`AUC ${model.metrics.auc.toFixed(3)}`} size="small" />}
          {model && <Token text={`${model.trees.length} trees`} size="small" />}
        </span>
        <span className="ap-toolbar__spacer" />
        <Button size="small" leadingVisual={SyncIcon} onClick={() => { setValues(defaults(spec)); setSaved(false) }}>Reset</Button>
        <Button size="small" variant="primary" leadingVisual={saved ? CheckIcon : BookmarkIcon} onClick={() => void persist()} disabled={!result}>
          {saved ? 'Saved to workspace' : 'Save this case'}
        </Button>
      </div>

      {modelError && (
        <Banner variant="warning" title="The trained model could not be loaded" description={`${modelError}. Scoring falls back to the published decision surface.`} />
      )}

      <div className="fa-card">
        <div className="fa-demo">
          <form className="fa-demo__form" onSubmit={(e) => e.preventDefault()}>
            {spec.inputs.map((inp) => {
              const v = values[inp.key]
              const id = `sc-${inp.key}`
              return (
                <div className="fa-field" key={inp.key}>
                  <label className="fa-field__label" htmlFor={id}>
                    <span>{inp.label}</span>
                    {inp.type === 'range' && (
                      <span className="fa-field__value">
                        {typeof v === 'number' ? v.toLocaleString(undefined, { maximumFractionDigits: 4 }) : v}{inp.unit ? ` ${inp.unit}` : ''}
                      </span>
                    )}
                  </label>
                  {inp.type === 'range' && (
                    <input id={id} className="fa-range" type="range" min={inp.min ?? 0} max={inp.max ?? 100} step={inp.step ?? 1}
                      value={Number(v)} onChange={(e) => set(inp.key, Number(e.target.value))} />
                  )}
                  {inp.type === 'select' && (
                    <select id={id} className="fa-select" value={String(v)} onChange={(e) => set(inp.key, e.target.value)}>
                      {(inp.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  )}
                  {inp.type === 'text' && (
                    <input id={id} className="fa-select" type="text" value={String(v)} onChange={(e) => set(inp.key, e.target.value)} />
                  )}
                  {inp.type === 'textarea' && (
                    <textarea id={id} className="fa-textarea" value={String(v)} onChange={(e) => set(inp.key, e.target.value)} />
                  )}
                  {inp.hint && <span className="fa-field__hint">{inp.hint}</span>}
                </div>
              )
            })}
          </form>

          <div className="fa-demo__result" aria-live="polite">
            {!result ? (
              <div style={{ display: 'grid', gap: 10, justifyItems: 'start' }}><Spinner size="small" /><span>Scoring…</span></div>
            ) : (
              <>
                <div className={`fa-verdict fa-verdict--${result.tone}`}>
                  <span className="fa-stat__label">{mod.title}</span>
                  <span className="fa-verdict__headline">{result.headline}</span>
                </div>
                <div>
                  <div className="fa-field__label"><span>Model score</span><span className="fa-field__value">{(result.score * 100).toFixed(1)}%</span></div>
                  <Meter pct={result.score * 100} tone={result.tone} label={`Score ${(result.score * 100).toFixed(1)} percent`} />
                </div>
                <dl className="fa-details">
                  {result.details.map((d) => (
                    <div key={d.label}><dt>{d.label}</dt><dd>{d.value}</dd></div>
                  ))}
                </dl>
                {result.reasons && result.reasons.length > 0 && (
                  <div>
                    <div className="fa-field__label" style={{ marginBottom: 6 }}>
                      <span>{result.fromModel ? 'Contribution to the log-odds' : 'Reason codes'}</span>
                      <span className="fa-field__value">← lowers · raises →</span>
                    </div>
                    <div className="fa-reasons">
                      {result.reasons.map((r) => (
                        <div className="fa-reason" key={r.label}>
                          <span>{r.label}</span>
                          <span className="fa-reason__bar" aria-label={`${r.label}: ${r.weight >= 0 ? '+' : ''}${r.weight.toFixed(3)}`}>
                            <span className="fa-reason__mid" />
                            <span className={`fa-reason__fill ${r.weight >= 0 ? 'fa-reason__fill--pos' : 'fa-reason__fill--neg'}`} style={{ width: `${(Math.abs(r.weight) / maxW) * 50}%` }} />
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <p className="fa-field__hint" style={{ margin: 0 }}>
                  {result.fromModel
                    ? `Scored in this browser by the model trained on ${model?.dataset}. Contributions are the change in log-odds against the training median for that feature.`
                    : spec.disclaimer}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {model && (
        <div className="ap-cards">
          <div className="ap-card"><h3>Held-out AUC</h3><div className="ap-card__v">{model.metrics.auc.toFixed(3)}</div><p>{model.n_test.toLocaleString()} cases never seen in training.</p></div>
          <div className="ap-card"><h3>Calibration (Brier)</h3><div className="ap-card__v">{model.metrics.brier.toFixed(3)}</div><p>Lower is better. Probabilities can be used as probabilities.</p></div>
          <div className="ap-card"><h3>Trained on</h3><div className="ap-card__v">{model.n_train.toLocaleString()}</div><p>{model.dataset}</p></div>
          <div className="ap-card"><h3>Saved in this workspace</h3><div className="ap-card__v">{cases.length}</div><p>Scored cases available to Cohorts, Alerts and Reports.</p></div>
        </div>
      )}

      <div className="fa-card">
        <div className="fa-card__body">
          <h3 className="fa-card__title" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {useModel ? <CpuIcon size={16} /> : <ZapIcon size={16} />} How this score is produced
          </h3>
          <p className="fa-card__sub" style={{ marginTop: 8, lineHeight: 1.6, maxWidth: '78ch' }}>
            {useModel && model ? (
              <>
                {model.algorithm} with {model.trees.length} trees over {model.features.length} features, trained on {model.dataset} and exported
                as JSON. The whole ensemble is evaluated here in JavaScript, so the inputs never leave the page. Every feature you do not set
                is held at its training median, which is also the baseline the contributions are measured against.
              </>
            ) : (
              <>
                This scorer runs the published decision surface for {project.short}, ported to the browser. The production model behind the
                FastAPI endpoint is the one described in the model card; the shape of the decision matches, the exact coefficients do not.
              </>
            )}
          </p>
        </div>
      </div>
    </Page>
  )
}

function format(v: number) {
  if (Math.abs(v) >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 0 })
  return v.toLocaleString(undefined, { maximumFractionDigits: 3 })
}

function describe(values: Values, slug: string) {
  const parts = Object.entries(values).slice(0, 2).map(([k, v]) => `${k} ${typeof v === 'number' ? format(v) : v}`)
  return `${slug} · ${parts.join(' · ')}`
}
