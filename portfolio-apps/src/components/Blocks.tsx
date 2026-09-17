/**
 * Small content blocks shared by the pages: features, pipeline, buyers, stack
 * tokens, facts, results, code.
 */
import { useState } from 'react'
import { IconButton, Label, Token } from '@primer/react'
import { CheckIcon, ChevronRightIcon, CopyIcon } from '@primer/octicons-react'
import type { Buyer, Feature, PipelineStep, ProjectApp, ResultRow } from '@/content/types'
import { media } from '@/app/context'
import { Meter } from './StatTiles'

export function FeatureGrid({ slug, features }: { slug: string; features: Feature[] }) {
  return (
    <div className="fa-features">
      {features.map((f) => {
        const Icon = f.icon
        return (
          <article className="fa-card fa-feature" key={f.title}>
            {f.image && <img className="fa-feature__img" src={media(slug, f.image)} alt="" width={1440} height={900} loading="lazy" decoding="async" />}
            <div className="fa-card__body">
              {Icon && <span className="fa-feature__icon" aria-hidden="true"><Icon size={18} /></span>}
              <h3 className="fa-feature__title">{f.title}</h3>
              <p className="fa-feature__desc">{f.description}</p>
            </div>
          </article>
        )
      })}
    </div>
  )
}

export function Pipeline({ steps }: { steps: PipelineStep[] }) {
  return (
    <ol className="fa-pipeline" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {steps.map((s, i) => {
        const Icon = s.icon
        return (
          <li className="fa-card fa-card--muted fa-step" key={s.title}>
            <div className="fa-step__head">
              <span className="fa-step__num" aria-label={`Step ${i + 1}`}>{i + 1}</span>
              {Icon && <Icon size={18} />}
            </div>
            <h3 className="fa-step__title">{s.title}</h3>
            <p className="fa-step__desc">{s.description}</p>
            {s.tech && <div><Label variant="accent" size="small">{s.tech}</Label></div>}
            <span className="fa-step__arrow" aria-hidden="true"><ChevronRightIcon size={16} /></span>
          </li>
        )
      })}
    </ol>
  )
}

function Logo({ buyer }: { buyer: Buyer }) {
  const [failed, setFailed] = useState(false)
  const initials = buyer.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  if (failed) return <span className="fa-logo__fallback" aria-hidden="true">{initials}</span>
  return (
    <img
      className="fa-logo__img"
      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(buyer.domain)}&sz=64`}
      alt=""
      width={36}
      height={36}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}

export function Buyers({ buyers }: { buyers: Buyer[] }) {
  return (
    <div className="fa-logos">
      {buyers.map((b) => (
        <div className="fa-card fa-logo" key={b.name}>
          <Logo buyer={b} />
          <div style={{ minWidth: 0 }}>
            <p className="fa-logo__name">{b.name}</p>
            {b.useCase && <p className="fa-logo__use">{b.useCase}</p>}
            {b.value && <p className="fa-logo__value">{b.value}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}

const GROUP_ORDER = ['ML', 'NLP', 'LLM', 'Vision', 'XAI', 'Data', 'Serving', 'MLOps'] as const

export function StackTokens({ stack }: { stack: ProjectApp['stack'] }) {
  const groups = GROUP_ORDER.filter((g) => stack.some((s) => s.group === g))
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {groups.map((g) => (
        <div key={g} style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 12, alignItems: 'start' }}>
          <span style={{ color: 'var(--fgColor-muted)', fontSize: 12, fontWeight: 600, paddingTop: 4 }}>{g}</span>
          <div className="fa-tokens">
            {stack.filter((s) => s.group === g).map((s) => <Token key={s.name} text={s.name} size="large" />)}
          </div>
        </div>
      ))}
    </div>
  )
}

export function Facts({ facts }: { facts: { label: string; value: string }[] }) {
  return (
    <dl className="fa-facts">
      {facts.map((f) => (
        <div className="fa-fact" key={f.label}>
          <dt>{f.label}</dt>
          <dd>{f.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function Results({ rows }: { rows: ResultRow[] }) {
  return (
    <div className="fa-results">
      {rows.map((r) => (
        <div className="fa-card fa-result" key={r.metric}>
          <div>
            <div className="fa-result__metric">{r.metric}</div>
            {r.note && <div className="fa-result__note">{r.note}</div>}
          </div>
          <div className="fa-result__value">{r.value}</div>
          {r.pct != null ? <Meter pct={r.pct} label={`${r.metric}: ${r.value}`} /> : <span />}
        </div>
      ))}
    </div>
  )
}

export function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }).catch(() => undefined)
  }
  return (
    <div className="fa-code__wrap">
      <pre className="fa-code" tabIndex={0}><code>{code}</code></pre>
      <div className="fa-code__label" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {label && <Label variant="secondary" size="small">{label}</Label>}
        <IconButton icon={copied ? CheckIcon : CopyIcon} aria-label={copied ? 'Copied' : 'Copy to clipboard'} size="small" variant="invisible" onClick={copy} />
      </div>
    </div>
  )
}
