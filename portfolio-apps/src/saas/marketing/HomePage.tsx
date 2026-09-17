import { Badge, Card, FeaturedIcon, LinkButton } from '@/ui'
import { ArrowRightIcon, SparkleFillIcon } from '@primer/octicons-react'
import { useSite } from '../context'
import { deriveProduct, marketingView } from '../fallback'
import { domainOf } from '@/content/domain'
import { CtaBand, Logo, Reveal, Section, Stat, money, useMeta } from './bits'
import { CountUp, PhotoCard, Portrait } from './Media'
import { Hero } from './Hero'
import { ProductPreview } from './ProductPreview'
import { Vignette } from './Vignette'
import { Illustration } from './Illustration'
import { clause, figure, lede } from './copy'

export function HomePage() {
  const site = useSite()
  const { project } = site
  const product = marketingView(site.product ?? deriveProduct(project), project)
  const d = domainOf(project.slug)
  useMeta(`${product.name} — ${product.tagline}`, lede(product.positioning, 30))

  const rows = product.features.filter((f) => !f.ai).slice(0, 3)

  return (
    <>
      <Hero />

      {/* ── Logos ────────────────────────────────────────────────────────── */}
      <Section size="sm">
        <p className="u-text-sm u-quiet" style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          Built for teams like these
        </p>
        <div className="mk-marquee">
          <div className="mk-marquee__track">
            {[...project.buyers, ...project.buyers].map((b, i) => <Logo key={`${b.name}-${i}`} name={b.name} domain={b.domain} />)}
          </div>
        </div>
      </Section>

      {/* ── The app itself ───────────────────────────────────────────────── */}
      <Section
        tone="tint"
        kicker="Inside the product"
        title={`One place to decide on every ${d.unit}`}
        sub={`Volume, the ${d.queue}, and the drivers behind each decision — on your own records.`}
        center
      >
        <Reveal><ProductPreview /></Reveal>
      </Section>

      {/* ── Problem ──────────────────────────────────────────────────────── */}
      <Section
        tone="dark"
        kicker="The problem"
        title="Why this is hard today"
        sub={<span className="u-clamp-2">{lede(product.market.whyNow, 26)}</span>}
      >
        <div className="mk-problem">
          <div className="u-stack" style={{ gap: 'var(--space-4)' }}>
            {product.pains.slice(0, 3).map((p, i) => {
              const fig = figure(p.cost)
              return (
                <Reveal key={p.title} delay={i * 80}>
                  <Card>
                    <div className="mk-problem__row">
                      {fig && <div className="mk-problem__fig">{fig}</div>}
                      <div style={{ minWidth: 0 }}>
                        <h3 className="u-card__title u-clamp-1" style={{ fontSize: 'var(--text-md-size)' }}>{clause(p.title, 8)}</h3>
                        <p className="u-card__body u-clamp-2" style={{ marginTop: 4 }}>{lede(p.body, 22)}</p>
                      </div>
                    </div>
                  </Card>
                </Reveal>
              )
            })}
          </div>
          <Reveal delay={120}><PhotoCard role="context" ratio="3 / 4" tint={false} /></Reveal>
        </div>
      </Section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <Section kicker="How it works" title="Three steps, and you are running" center>
        <div className="mk-steps">
          {d.steps.slice(0, 3).map((s, i) => (
            <Reveal className="mk-step" key={s.title} delay={i * 90}>
              <div className="mk-step__visual mk-step__visual--art">
                <Illustration name={(['ingest', 'explain', 'queue'] as const)[i]} />
              </div>
              <span className="mk-step__n">{i + 1}</span>
              <h3 className="u-card__title" style={{ fontSize: 'var(--text-lg-size)' }}>{s.title}</h3>
              <p className="u-card__body">{s.body}</p>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ── Feature rows ─────────────────────────────────────────────────── */}
      <Section tone="tint" kicker="The product" title="What you get on day one">
        <div className="mk-rows">
          {rows.map((f, i) => (
            <Reveal className={`mk-row${i % 2 ? ' mk-row--flip' : ''}`} key={f.name}>
              <div className="mk-row__copy">
                {f.icon && <FeaturedIcon icon={f.icon} />}
                <h3 className="mk-title" style={{ fontSize: 'var(--display-xs-size)' }}>{clause(f.name, 6)}</h3>
                <p className="mk-sub u-clamp-3" style={{ fontSize: 'var(--text-md-size)' }}>{lede(f.summary, 22)}</p>
                <div><LinkButton to="/product" variant="tertiary" trailingIcon={ArrowRightIcon} size="sm">More on this</LinkButton></div>
              </div>
              {i === 0 && <div className="mk-row__art"><Illustration name="score" /></div>}
              {i === 1 && <PhotoCard role="detail" ratio="4 / 3" overlay={<Vignette kind="queue" />} />}
              {i === 2 && <Vignette kind="reasons" />}
            </Reveal>
          ))}
        </div>
        <div className="u-row" style={{ justifyContent: 'center', marginTop: 'var(--space-16)' }}>
          <LinkButton to="/product" trailingIcon={ArrowRightIcon}>All {product.features.length} capabilities</LinkButton>
        </div>
      </Section>

      {/* ── AI ───────────────────────────────────────────────────────────── */}
      <Section
        tone="dark"
        kicker="Intelligence"
        title="The model does the work, and shows how"
        sub={`Nothing is a black box: every ${d.unit} comes back with the factors that produced it.`}
      >
        <div className="mk-split-ai">
          <div className="u-grid" style={{ gap: 'var(--space-4)' }}>
            {product.aiFeatures.slice(0, 4).map((f, i) => (
              <Reveal key={f.name} delay={i * 70}>
                <Card>
                  <div className="u-row" style={{ flexWrap: 'nowrap', alignItems: 'start', gap: 'var(--space-4)' }}>
                    <FeaturedIcon icon={f.icon ?? SparkleFillIcon} tone="gradient" size="sm" />
                    <div style={{ minWidth: 0 }}>
                      <h3 className="u-card__title u-clamp-1" style={{ fontSize: 'var(--text-md-size)' }}>{clause(f.name, 7)}</h3>
                      <p className="u-card__body u-clamp-2" style={{ marginTop: 4 }}>{lede(f.summary, 20)}</p>
                    </div>
                  </div>
                </Card>
              </Reveal>
            ))}
          </div>
          <Reveal delay={120}><Vignette kind="drift" /></Reveal>
        </div>
      </Section>

      {/* ── Proof ────────────────────────────────────────────────────────── */}
      <Section tone="dark" size="sm">
        <div className="mk-stats">
          {product.outcomes.slice(0, 4).map((m) => (
            <Stat key={m.label} value={<CountUp value={m.value} />} label={clause(m.label, 5)} caption={m.caption && clause(m.caption, 6)} />
          ))}
        </div>
        <p className="u-text-sm" style={{ color: 'var(--gray-500)', marginTop: 'var(--space-8)', textAlign: 'center' }}>
          Validated on {project.dataset.name} before the model sees one of your {d.units}.{' '}
          <a href="/science" style={{ color: 'var(--gray-300)' }}>See the evaluation</a>
        </p>
      </Section>

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <Section tone="tint" center kicker="Pricing" title="Start free. Pay when it earns its place.">
        <div className="mk-plans">
          {product.pricing.map((p) => (
            <Reveal key={p.id} className={`mk-plan${p.highlighted ? ' mk-plan--hi' : ''}`} delay={product.pricing.indexOf(p) * 80}>
              {p.highlighted && <span className="mk-plan__badge"><Badge tone="brand" size="md">Most popular</Badge></span>}
              <div>
                <div className="u-strong">{p.name}</div>
                <p className="u-text-sm u-muted u-clamp-2" style={{ marginTop: 2 }}>{p.tagline}</p>
              </div>
              <div className="mk-plan__price">
                {money(p.monthly)}{p.monthly != null && p.monthly > 0 && <small> /mo</small>}
              </div>
              <div className="mk-plan__meter u-clamp-2">{p.meter}</div>
              <LinkButton to={p.monthly === null ? '/contact' : '/signup'} variant={p.highlighted ? 'primary' : 'gray'} block>
                {p.cta}
              </LinkButton>
            </Reveal>
          ))}
        </div>
        <div style={{ marginTop: 'var(--space-8)' }}>
          <LinkButton to="/pricing" variant="tertiary" trailingIcon={ArrowRightIcon}>Compare plans</LinkButton>
        </div>
      </Section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <Section kicker="Questions" title="What buyers ask first">
        <div className="mk-faq-split">
          <div className="mk-faq">
            {product.faq.slice(0, 5).map((f, i) => (
              <details key={f.q} open={i === 0}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
          <Reveal>
            <Card raised className="mk-ask">
              <Portrait role="people" size={64} />
              <h3 className="u-card__title">Still deciding?</h3>
              <p className="u-card__body">
                Send the question and you get an answer from the person who built the model, not a form response.
              </p>
              <LinkButton to="/contact" variant="primary" block>Ask a question</LinkButton>
              <LinkButton to="/science" variant="tertiary" block>Read the evaluation</LinkButton>
            </Card>
          </Reveal>
        </div>
      </Section>

      <CtaBand
        title={`Score your first ${d.units} today`}
        body="Create an account, bring a file, and see a real decision in under a minute."
        primary={{ to: '/signup', label: 'Start free' }}
        secondary={{ to: '/contact', label: 'Talk to us' }}
      />
    </>
  )
}
