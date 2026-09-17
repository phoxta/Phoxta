import { Link } from 'react-router-dom'
import { Label, LinkButton, Token } from '@primer/react'
import { ArrowRightIcon, BeakerIcon, LawIcon, LinkExternalIcon, MilestoneIcon } from '@primer/octicons-react'
import { useSite } from '../context'
import { CtaBand, Section, useMeta } from './bits'

const IMPACT_ORDER = ['high', 'medium', 'low'] as const

export function SciencePage() {
  const { project, frontier, product } = useSite()
  const name = product?.name ?? project.short
  useMeta(`The science — ${name}`, `How ${name} is built, how it is evaluated, and how it compares with the 2026 state of the art.`)

  return (
    <>
      <Section
        heading="h1"
        kicker="Evidence"
        title={frontier ? frontier.headline : 'The engineering record behind every claim'}
        sub={
          frontier
            ? `State of the art reviewed ${frontier.asOf}. Every comparison below links to the source it came from.`
            : 'The state-of-the-art comparison for this system is being written. Everything below is measured on a held-out split of the real dataset.'
        }
        actions={<LinkButton as={Link} to="/research" trailingVisual={ArrowRightIcon}>Full engineering record</LinkButton>}
      >
        {frontier ? (
          <div className="fa-prose" style={{ maxWidth: '78ch' }}>
            {frontier.summary.map((p, i) => <p key={i}>{p}</p>)}
          </div>
        ) : (
          <div className="fa-prose" style={{ maxWidth: '78ch' }}>
            {project.solution.map((p, i) => <p key={i}>{p}</p>)}
          </div>
        )}
      </Section>

      <Section tone="tint" kicker="Measured" title="What it scores on a held-out split">
        <div className="mk-grid mk-grid--4">
          {/* The merged product draws results from four projects, which can each
              report a metric of the same name. */}
          {project.results.slice(0, 8).map((r, i) => (
            <div className="mk-card" key={`${r.metric}-${i}`}>
              <div className="mk-stat__v" style={{ fontSize: 30 }}>{r.value}</div>
              <h3 style={{ fontSize: 15 }}>{r.metric}</h3>
              {r.note && <p style={{ fontSize: 13.5 }}>{r.note}</p>}
            </div>
          ))}
        </div>
      </Section>

      {frontier && frontier.benchmarks.length > 0 && (
        <Section kicker="Compared" title="This system against the published best">
          <div className="mk-scroll">
            <table className="mk-table">
              <thead>
                <tr><th>Benchmark</th><th>Best published</th><th>Held by</th><th>This system</th></tr>
              </thead>
              <tbody>
                {frontier.benchmarks.map((b) => (
                  <tr key={b.name}>
                    <td><strong>{b.name}</strong></td>
                    <td>{b.sota}</td>
                    <td style={{ color: 'var(--fgColor-muted)' }}>{b.sotaBy ?? '—'}</td>
                    <td>{b.project}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {frontier && frontier.stateOfTheArt.length > 0 && (
        <Section tone="dark" kicker="The frontier" title="What leads this field in 2026" sub="The systems and papers that set the bar, and what each one is actually good at.">
          <div className="mk-grid mk-grid--2">
            {frontier.stateOfTheArt.map((s) => (
              <article className="mk-card" key={s.name}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <h3>{s.name}</h3>
                  {s.year && <Label variant="secondary" size="small">{s.year}</Label>}
                </div>
                <p style={{ fontSize: 13, color: '#79c0ff', margin: 0 }}>{s.org}</p>
                <p>{s.what}</p>
                {s.metric && <p className="mk-card__detail"><strong style={{ color: '#fff' }}>{s.metric}</strong></p>}
                {s.url && <a href={s.url} target="_blank" rel="noreferrer" style={{ fontSize: 13.5, color: '#79c0ff', display: 'inline-flex', gap: 6, alignItems: 'center' }}>Source <LinkExternalIcon size={12} /></a>}
              </article>
            ))}
          </div>
        </Section>
      )}

      {frontier && frontier.upgrades.length > 0 && (
        <Section kicker="Roadmap" title="What we are building next, and why" sub="Ordered by the gap it closes against the frontier.">
          <div className="mk-grid mk-grid--3">
            {IMPACT_ORDER.flatMap((impact) => frontier.upgrades.filter((u) => u.impact === impact)).map((u) => (
              <article className="mk-card" key={u.title}>
                <span className="mk-card__icon"><MilestoneIcon size={18} /></span>
                <h3>{u.title}</h3>
                <p>{u.body}</p>
                <div className="ap-badge-row" style={{ marginTop: 4 }}>
                  <Label variant={u.impact === 'high' ? 'danger' : u.impact === 'medium' ? 'attention' : 'secondary'} size="small">{u.impact} impact</Label>
                  <Label variant="secondary" size="small">{u.effort}</Label>
                  {u.status && <Label variant="success" size="small">{u.status}</Label>}
                </div>
              </article>
            ))}
          </div>
        </Section>
      )}

      <Section tone="tint" kicker="How it is built" title="Model, data and stack">
        <div className="mk-split">
          <div style={{ display: 'grid', gap: 18 }}>
            <div>
              <h3 style={{ margin: '0 0 8px', fontSize: 17 }}>{project.dataset.name}</h3>
              <p className="mk-sub" style={{ fontSize: 15.5 }}>{project.dataset.description}</p>
              {project.dataset.source && (
                <p style={{ marginTop: 10 }}>
                  <a href={project.dataset.source.url} target="_blank" rel="noreferrer" style={{ fontWeight: 600, display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                    {project.dataset.source.label} <LinkExternalIcon size={13} />
                  </a>
                </p>
              )}
            </div>
            <div className="ap-badge-row">
              {project.stack.map((s) => <Token key={s.name} text={s.name} />)}
            </div>
          </div>
          <div className="mk-scroll">
            <table className="mk-table">
              <thead><tr><th>Component</th><th>Model</th><th>Metric</th></tr></thead>
              <tbody>
                {/* Several models share a component name, "Ensemble member" most of
                    all, so the name alone is not a key. */}
                {project.models.map((m, i) => (
                  <tr key={`${m.component}-${m.model}-${i}`}>
                    <td><strong>{m.component}</strong><br /><span style={{ color: 'var(--fgColor-muted)', fontSize: 13 }}>{m.purpose}</span></td>
                    <td>{m.model}</td>
                    <td>{m.metric ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {frontier && frontier.compliance && frontier.compliance.length > 0 && (
        <Section kicker="Regulation" title="The rules this system has to live inside">
          <div className="mk-grid mk-grid--2">
            {frontier.compliance.map((c) => (
              <article className="mk-card" key={c.name}>
                <span className="mk-card__icon" style={{ background: 'var(--bgColor-attention-muted)', color: 'var(--fgColor-attention)' }}><LawIcon size={18} /></span>
                <h3>{c.name}</h3>
                <p>{c.body}</p>
                {c.url && <a href={c.url} target="_blank" rel="noreferrer" style={{ fontSize: 13.5, fontWeight: 600 }}>Read the rule →</a>}
              </article>
            ))}
          </div>
        </Section>
      )}

      {frontier && frontier.sources.length > 0 && (
        <Section tone="tint" kicker="Citations" title="Everything above traces to a source">
          <ol style={{ display: 'grid', gap: 10, paddingLeft: 20, margin: 0 }}>
            {frontier.sources.map((s) => (
              <li key={s.url} style={{ color: 'var(--fgColor-muted)', lineHeight: 1.5 }}>
                <a href={s.url} target="_blank" rel="noreferrer" style={{ fontWeight: 600 }}>{s.title}</a>
                {s.org && <> · {s.org}</>}
                {s.date && <> · {s.date}</>}
              </li>
            ))}
          </ol>
        </Section>
      )}

      <CtaBand
        title="Read the code before you trust the number"
        body="The training pipeline, the evaluation and the API are published in full. Start with the model card."
        primary={{ to: '/research/model', label: 'Open the model card' }}
        secondary={{ to: '/signup', label: 'Try it yourself' }}
      />

      {!frontier && (
        <Section>
          <div className="ap-empty">
            <BeakerIcon size={22} />
            <p style={{ margin: 0, maxWidth: '54ch' }}>
              The 2026 state-of-the-art comparison for this system is still being written. The engineering record is complete and public in the meantime.
            </p>
            <LinkButton as={Link} to="/research">Engineering record</LinkButton>
          </div>
        </Section>
      )}
    </>
  )
}
