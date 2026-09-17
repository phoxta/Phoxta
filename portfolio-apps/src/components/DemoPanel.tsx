import { useMemo, useState } from 'react'
import { Button, Label } from '@primer/react'
import { SyncIcon, ZapIcon } from '@primer/octicons-react'
import type { DemoSpec } from '@/content/types'
import { Meter } from './StatTiles'

type Values = Record<string, number | string>

function defaults(spec: DemoSpec): Values {
  return Object.fromEntries(spec.inputs.map((i) => [i.key, i.default]))
}

export function DemoPanel({ spec }: { spec: DemoSpec }) {
  const [values, setValues] = useState<Values>(() => defaults(spec))
  const result = useMemo(() => {
    try {
      return spec.evaluate(values)
    } catch {
      return null
    }
  }, [spec, values])
  const set = (k: string, v: number | string) => setValues((s) => ({ ...s, [k]: v }))
  const maxW = Math.max(1e-9, ...(result?.reasons ?? []).map((r) => Math.abs(r.weight)))

  return (
    <div className="fa-card">
      <div className="fa-card__body" style={{ borderBottom: '1px solid var(--borderColor-default)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span className="fa-feature__icon" style={{ marginBottom: 0 }} aria-hidden="true"><ZapIcon size={16} /></span>
          <div>
            <h3 className="fa-card__title">{spec.title}</h3>
            <p className="fa-card__sub">{spec.description}</p>
          </div>
          <Label variant="success" style={{ marginLeft: 'auto' }}>Live · runs in your browser</Label>
        </div>
      </div>
      <div className="fa-demo">
        <form className="fa-demo__form" onSubmit={(e) => e.preventDefault()}>
          {spec.inputs.map((inp) => {
            const v = values[inp.key]
            const id = `demo-${inp.key}`
            return (
              <div className="fa-field" key={inp.key}>
                <label className="fa-field__label" htmlFor={id}>
                  <span>{inp.label}</span>
                  {inp.type === 'range' && (
                    <span className="fa-field__value">{typeof v === 'number' ? v.toLocaleString(undefined, { maximumFractionDigits: 4 }) : v}{inp.unit ? ` ${inp.unit}` : ''}</span>
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
          <div>
            <Button leadingVisual={SyncIcon} onClick={() => setValues(defaults(spec))} size="small">Reset to defaults</Button>
          </div>
        </form>
        <div className="fa-demo__result" aria-live="polite">
          {result ? (
            <>
              <div className={`fa-verdict fa-verdict--${result.tone}`}>
                <span className="fa-stat__label">{spec.ctaLabel ?? 'Model output'}</span>
                <span className="fa-verdict__headline">{result.headline}</span>
              </div>
              <div>
                <div className="fa-field__label"><span>Score</span><span className="fa-field__value">{(result.score * 100).toFixed(1)}%</span></div>
                <Meter pct={result.score * 100} tone={result.tone} label={`Score ${(result.score * 100).toFixed(1)} percent`} />
              </div>
              {result.details.length > 0 && (
                <dl className="fa-details">
                  {result.details.map((d) => (
                    <div key={d.label}><dt>{d.label}</dt><dd>{d.value}</dd></div>
                  ))}
                </dl>
              )}
              {result.reasons && result.reasons.length > 0 && (
                <div>
                  <div className="fa-field__label" style={{ marginBottom: 6 }}><span>Reason codes</span><span className="fa-field__value">← against · toward →</span></div>
                  <div className="fa-reasons">
                    {result.reasons.map((r) => {
                      const w = (Math.abs(r.weight) / maxW) * 50
                      return (
                        <div className="fa-reason" key={r.label}>
                          <span>{r.label}</span>
                          <span className="fa-reason__bar" aria-label={`${r.label}: ${r.weight >= 0 ? '+' : ''}${r.weight.toFixed(2)}`}>
                            <span className="fa-reason__mid" />
                            <span className={`fa-reason__fill ${r.weight >= 0 ? 'fa-reason__fill--pos' : 'fa-reason__fill--neg'}`} style={{ width: `${w}%` }} />
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {spec.disclaimer && <p className="fa-field__hint" style={{ margin: 0 }}>{spec.disclaimer}</p>}
            </>
          ) : (
            <p className="fa-card__sub">Adjust the inputs to score.</p>
          )}
        </div>
      </div>
    </div>
  )
}
