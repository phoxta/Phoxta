import { Badge, Card, Container, FeaturedIcon, LinkButton, Tag } from '@/ui'
import {
  ArrowRightIcon, CheckIcon, LinkExternalIcon, LockIcon, PlugIcon, SparkleFillIcon, TelescopeIcon, ZapIcon,
} from '@primer/octicons-react'
import type { ProductFeature } from '@/content/product'
import { domainOf } from '@/content/domain'
import { useSite } from '../context'
import { deriveProduct } from '../fallback'
import { CtaBand, Section, useMeta } from './bits'
import { Illustration } from './Illustration'
import { Grid, Mesh } from './BrandArt'
import { Vignette, type VignetteKind } from './Vignette'
import { clause, firstSentence, headline, lede } from './copy'

interface Block {
  key: string
  kicker: string
  title: string
  blurb: string
  items: ProductFeature[]
  art: VignetteKind
}

/** Split a list into `n` contiguous, evenly sized chunks; empty chunks dropped. */
function chunk<T>(xs: T[], n: number): T[][] {
  if (!xs.length) return []
  const out: T[][] = Array.from({ length: n }, () => [])
  xs.forEach((x, i) => out[Math.min(n - 1, Math.floor((i * n) / xs.length))].push(x))
  return out.filter((c) => c.length > 0)
}

export function FeaturesPage() {
  const site = useSite()
  const { project } = site
  const product = site.product ?? deriveProduct(project)
  const d = domainOf(project.slug)
  useMeta(`Product — ${product.name}`, lede(product.positioning, 30))

  const core = product.features.filter((f) => !f.ai)
  const tiered = core.some((f) => f.tier)

  /* Three or four themed blocks, each one an alternating row with a vignette. */
  const themes: Omit<Block, 'items'>[] = tiered
    ? [
        { key: 'starter', kicker: 'On every plan', title: 'The loop you run every day', blurb: `Bring your ${d.units}, get ${d.decision}, and work only what needs a person.`, art: 'reasons' },
        { key: 'growth', kicker: 'Growth and up', title: 'Running it on live volume', blurb: `Scheduled runs, an API and alerts against ${d.sources[0].toLowerCase()} rather than one file.`, art: 'queue' },
        { key: 'enterprise', kicker: 'Enterprise', title: 'Governance, audit and scale', blurb: 'Model risk, residency and sign-off, answered in writing before you deploy.', art: 'drift' },
      ]
    : [
        { key: 'decide', kicker: 'Decide', title: `Every ${d.unit} gets a decision`, blurb: `Scored as it arrives, returning ${d.decision} with the drivers attached.`, art: 'reasons' },
        { key: 'act', kicker: 'Act', title: `Work the ${d.queue}, not an inbox`, blurb: `Thresholds, alerts and exports, so the ${d.queue} holds only real work.`, art: 'queue' },
        { key: 'prove', kicker: 'Prove', title: 'Defend the decision months later', blurb: 'Drift, model versions and an audit trail your reviewer can read.', art: 'drift' },
      ]

  const blocks: Block[] = tiered
    ? themes
        .map((t, i) => ({
          ...t,
          items: core.filter((f) => (i === 0 ? !f.tier || f.tier === 'starter' : f.tier === themes[i].key)),
        }))
        .filter((b) => b.items.length > 0)
    : chunk(core, themes.length).map((items, i) => ({ ...themes[i], items }))

  const cheapest = product.pricing
    .map((p) => p.monthly)
    .filter((m): m is number => m != null && m > 0)
    .sort((a, b) => a - b)[0]

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="mk-hero mk-hero--page">
        <Mesh intensity={0.7} />
        <Grid fade="radial" />
        <Container>
          <div className="mk-hero__split">
            <div className="mk-hero__in">
              <span className="mk-hero__eyebrow">
                <TelescopeIcon size={14} />
                {product.features.length} capabilities
              </span>
              <h1 className="u-hero-title">{headline(`Everything ${product.name} does`)}</h1>
              <p className="u-hero-lede">{lede(product.positioning, 26)}</p>
              <div className="u-row">
                <LinkButton to="/signup" variant="primary" size="lg" trailingIcon={ArrowRightIcon}>Start free</LinkButton>
                <LinkButton to="/docs" size="lg">Read the API docs</LinkButton>
              </div>
              <div className="mk-hero__proof">
                <span><CheckIcon size={14} /> {product.aiFeatures.length} model-driven</span>
                <span><ZapIcon size={14} /> {project.api.endpoints.length} endpoints</span>
                <span><LockIcon size={14} /> Reasons on every decision</span>
              </div>
            </div>
            <div className="mk-hero__art">
              <Illustration name="score" title="A record going in and a decision coming out" />
            </div>
          </div>
        </Container>
      </section>

      {/* ── Capabilities, grouped ────────────────────────────────────────── */}
      <Section
        tone="tint"
        kicker="Capabilities"
        title={clause(product.wedge.title, 9)}
        sub={<span className="u-clamp-2">{lede(product.wedge.body, 26)}</span>}
      >
        <div className="mk-rows">
          {blocks.map((b, i) => (
            <div className={`mk-row${i % 2 ? ' mk-row--flip' : ''}`} key={b.key}>
              <div className="mk-row__copy">
                <p className="mk-kicker">{b.kicker}</p>
                <h3 className="mk-title" style={{ fontSize: 'var(--display-xs-size)' }}>{b.title}</h3>
                <p className="mk-sub u-clamp-2" style={{ fontSize: 'var(--text-md-size)' }}>{b.blurb}</p>
                <div className="mk-list">
                  {b.items.slice(0, 4).map((f) => (
                    <div className="mk-list__i" key={f.name}>
                      <FeaturedIcon icon={f.icon ?? SparkleFillIcon} size="sm" />
                      <div>
                        <h4 className="u-clamp-1">{clause(f.name, 7)}</h4>
                        <p className="u-clamp-2">{lede(f.summary, 20)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {b.items.length > 4 && (
                  <p className="u-text-sm u-quiet u-clamp-2">
                    Also here: {b.items.slice(4).map((f) => clause(f.name, 5)).join(' · ')}
                  </p>
                )}
              </div>
              <Vignette kind={b.art} />
            </div>
          ))}
        </div>
      </Section>

      {/* ── The model layer ──────────────────────────────────────────────── */}
      {product.aiFeatures.length > 0 && (
        <Section
          tone="dark"
          kicker="Intelligence"
          title="Where the model does the work"
          sub={`${project.models.length} components in the serving graph, each with a published evaluation.`}
        >
          <div className="u-grid u-grid--2">
            {product.aiFeatures.slice(0, 6).map((f) => {
              const body = lede(f.summary, 20)
              const note = firstSentence(f.detail)
              // Several capabilities open their detail with the same sentence as
              // their summary, which printed the same paragraph twice.
              const extra = note && !note.startsWith(body.replace(/…$/, '').trim()) ? note : null
              return (
                <Card key={f.name}>
                  <FeaturedIcon icon={f.icon ?? SparkleFillIcon} tone="gradient" size="sm" />
                  <h3 className="u-card__title u-clamp-2" style={{ fontSize: 'var(--text-md-size)' }}>{clause(f.name, 7)}</h3>
                  <p className="u-card__body u-clamp-2">{body}</p>
                  {extra && <p className="u-card__note u-clamp-2">{extra}</p>}
                </Card>
              )
            })}
          </div>
          <div className="u-row" style={{ marginTop: 'var(--space-8)' }}>
            {project.models.slice(0, 6).map((m, i) => <Tag key={`${m.component}-${m.model}-${i}`}>{m.model}</Tag>)}
          </div>
        </Section>
      )}

      {/* ── Integrations ─────────────────────────────────────────────────── */}
      <Section
        kicker="Integrations"
        title={product.integrations.length ? 'It fits the systems you already run' : 'The API is the integration surface'}
        sub={
          product.integrations.length
            ? `${product.integrations.length} connectors, reading from and writing back to the system of record.`
            : 'Every system integrates over the documented REST API: JSON in, JSON out, reasons attached.'
        }
        actions={<LinkButton to="/docs" variant="tertiary" trailingIcon={ArrowRightIcon}>API reference</LinkButton>}
      >
        <div className="mk-tiles">
          {product.integrations.length > 0
            ? product.integrations.map((i) => (
                <div className="mk-tile" key={i.name}>
                  {i.domain
                    ? <img src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(i.domain)}&sz=64`} alt="" width={22} height={22} loading="lazy" />
                    : <FeaturedIcon icon={PlugIcon} size="sm" />}
                  <span>
                    <b className="u-clamp-1">{i.name}</b>
                    <small>{i.kind}</small>
                  </span>
                </div>
              ))
            : project.api.endpoints.slice(0, 8).map((e) => (
                <div className="mk-tile" key={`${e.method}${e.path}`}>
                  <Badge tone={e.method === 'POST' ? 'success' : e.method === 'DELETE' ? 'error' : 'brand'}>{e.method}</Badge>
                  <span><b className="u-mono u-clamp-1">{e.path}</b></span>
                </div>
              ))}
        </div>
      </Section>

      {/* ── Alternatives ─────────────────────────────────────────────────── */}
      {product.competitors.length > 0 && (
        <Section
          tone="tint"
          kicker="Alternatives"
          title="What you would otherwise buy"
          sub="Public positioning and published pricing, read the week this page was written. Not a benchmark we ran."
        >
          <div className="u-table-wrap" style={{ overflowX: 'auto' }}>
            <table className="u-table">
              <caption className="u-sr">
                {product.name} compared with {product.competitors.map((c) => c.name).join(', ')}
              </caption>
              <thead>
                <tr>
                  <th scope="col" style={{ minWidth: 150 }}>Product</th>
                  <th scope="col" style={{ minWidth: 250 }}>Strongest at</th>
                  <th scope="col" style={{ minWidth: 250 }}>The gap {product.name} closes</th>
                  <th scope="col" style={{ minWidth: 190 }}>Published price</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row" className="mk-cmp__self">
                    <span className="u-row u-row--tight">{product.name}<Badge tone="brand">This</Badge></span>
                  </th>
                  <td className="u-clamp-3">{lede(product.wedge.body, 24)}</td>
                  <td className="u-clamp-3">{product.proof[0] ? product.proof[0].claim : lede(product.positioning, 22)}</td>
                  <td>{cheapest ? `From $${cheapest.toLocaleString()} a month, published` : 'Usage-based, published in full'}</td>
                </tr>
                {product.competitors.map((c) => (
                  <tr key={c.name}>
                    <th scope="row" className="mk-cmp__name">
                      {c.url
                        ? <a href={c.url} target="_blank" rel="noreferrer" className="u-row u-row--tight">{c.name}<LinkExternalIcon size={12} /></a>
                        : c.name}
                    </th>
                    <td className="u-clamp-3">{lede(c.strength, 22)}</td>
                    <td className="u-clamp-3">{lede(c.gap, 22)}</td>
                    <td className="u-clamp-3">{c.pricing ? firstSentence(c.pricing) : 'Not published'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="u-text-sm u-quiet" style={{ marginTop: 'var(--space-5)' }}>
            Every number published for {product.name} is reproducible from the <a href="/science">evaluation record</a>.
          </p>
        </Section>
      )}

      <CtaBand
        title={`See it decide your ${d.units}`}
        body="Open the app, bring a file, and read the reasons behind a real decision in under a minute."
        primary={{ to: '/signup', label: 'Start free' }}
        secondary={{ to: '/pricing', label: 'See pricing' }}
      />
    </>
  )
}
