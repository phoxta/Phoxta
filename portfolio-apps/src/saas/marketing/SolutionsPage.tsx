import { Link, useParams } from 'react-router-dom'
import { Alert, Badge, Card, Container, FeaturedIcon, LinkButton } from '@/ui'
import {
  ArrowLeftIcon, ArrowRightIcon, BeakerIcon, GoalIcon, GraphIcon, HistoryIcon, PeopleIcon, PersonIcon,
  SparkleFillIcon,
} from '@primer/octicons-react'
import type { Persona } from '@/content/product'
import { domainOf } from '@/content/domain'
import { useSite } from '../context'
import { deriveProduct } from '../fallback'
import { CtaBand, Section, Stat, useMeta } from './bits'
import { Illustration } from './Illustration'
import { Grid, Mesh } from './BrandArt'
import { Vignette, type VignetteKind } from './Vignette'
import { clause, firstSentence, lede } from './copy'

const ART: VignetteKind[] = ['reasons', 'queue', 'drift']

/** Stable, readable URL for a persona; the numeric index also resolves. */
const personaSlug = (p: Persona) =>
  p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48)

function findPersona(personas: Persona[], param?: string) {
  if (!param) return -1
  const byIndex = Number(param)
  if (Number.isInteger(byIndex) && byIndex >= 0 && byIndex < personas.length) return byIndex
  return personas.findIndex((p) => personaSlug(p) === param.toLowerCase())
}

export function SolutionsPage() {
  const site = useSite()
  const { project } = site
  const product = site.product ?? deriveProduct(project)
  const d = domainOf(project.slug)
  const { persona: param } = useParams()
  const personas = product.personas
  const index = findPersona(personas, param)
  const person = index >= 0 ? personas[index] : null
  const unknown = Boolean(param) && index < 0

  useMeta(
    person ? `${person.title} — ${product.name}` : `Solutions — ${product.name}`,
    person ? lede(person.jobToBeDone, 28) : `Who ${product.name} is built for, and the decision each of them has to get right.`,
  )

  /* ── Index ──────────────────────────────────────────────────────────── */
  if (!person) {
    return (
      <>
        <section className="mk-hero mk-hero--page">
          <Mesh intensity={0.7} />
          <Grid fade="radial" />
          <Container>
            <div className="mk-hero__split">
              <div className="mk-hero__in">
                <span className="mk-hero__eyebrow">
                  <PeopleIcon size={14} />
                  {personas.length} {personas.length === 1 ? 'role' : 'roles'}
                </span>
                <h1 className="u-hero-title">Who {product.name} is built for</h1>
                <p className="u-hero-lede">
                  One system, but the reason to buy it changes with the seat. Pick the closest match.
                </p>
                <div aria-live="polite">
                  {unknown && (
                    <Alert tone="warning" title="No such role">
                      That role has not been written up. The roles below are the ones this product is built around.
                    </Alert>
                  )}
                </div>
              </div>
              <div className="mk-hero__art">
                <Illustration name="team" title="Three people round a table, reading one finding" />
              </div>
            </div>
          </Container>
        </section>

        <Section
          tone="tint"
          kicker="By role"
          title="Each of these people is judged on a different number"
          sub={`They all buy the same thing: a defensible decision on every ${d.unit}.`}
        >
          <div className="u-grid u-grid--3">
            {personas.map((p) => (
              <Card key={p.title} interactive as={Link} to={`/solutions/${personaSlug(p)}`} style={{ textDecoration: 'none' }}>
                <FeaturedIcon icon={PersonIcon} size="sm" />
                <h2 className="u-card__title u-clamp-2" style={{ fontSize: 'var(--text-md-size)' }}>{p.title}</h2>
                <p className="u-card__body u-clamp-3">{lede(p.jobToBeDone, 24)}</p>
                <p className="u-card__note u-clamp-2">{clause(p.segment, 14)}</p>
                <span className="u-row u-row--tight">
                  <Badge tone="brand">Judged on</Badge>
                  <span className="u-text-sm u-muted u-clamp-1">{clause(p.successMetric, 8)}</span>
                </span>
              </Card>
            ))}
          </div>
        </Section>

        <Section kicker="Common ground" title="What every seat is actually buying">
          <div className="u-split u-split--wide-right">
            <div className="u-stack">
              <ul className="u-checks">
                {product.proof.slice(0, 4).map((p) => (
                  <li key={p.claim}>
                    <span><SparkleFillIcon size={15} /></span>
                    <span>
                      <b>{clause(p.claim, 12)}</b>
                      <span className="u-text-sm u-muted u-clamp-2" style={{ display: 'block' }}>{lede(p.evidence, 22)}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="u-row">
                <LinkButton to="/science" variant="secondary" leadingIcon={BeakerIcon}>How it is measured</LinkButton>
              </div>
            </div>
            <Vignette kind="reasons" />
          </div>
        </Section>

        <Section tone="dark" size="sm">
          <div className="mk-stats">
            {product.outcomes.slice(0, 4).map((m) => (
              <Stat key={m.label} value={m.value} label={clause(m.label, 5)} caption={m.caption && clause(m.caption, 6)} />
            ))}
          </div>
        </Section>

        <CtaBand
          title="Not sure which of these is you?"
          body="Send one line about the decision you are trying to improve and you will get a straight answer."
          primary={{ to: '/contact', label: 'Talk to us' }}
          secondary={{ to: '/signup', label: 'Start free' }}
        />
      </>
    )
  }

  /* ── One persona ────────────────────────────────────────────────────── */
  const picks = Array.from({ length: Math.min(3, product.features.length) }, (_, k) =>
    product.features[(index * 3 + k) % product.features.length])
  const others = personas.filter((_, i) => i !== index).slice(0, 2)

  return (
    <>
      <section className="mk-hero mk-hero--page">
        <Mesh intensity={0.7} />
        <Grid fade="radial" />
        <Container>
          <div className="mk-hero__split">
            <div className="mk-hero__in">
              <Link to="/solutions" className="mk-crumb"><ArrowLeftIcon size={14} /> All roles</Link>
              <h1 className="u-hero-title">{person.title}</h1>
              <p className="u-hero-lede">{lede(person.jobToBeDone, 26)}</p>
              <div className="u-row">
                <LinkButton to="/signup" variant="primary" size="lg" trailingIcon={ArrowRightIcon}>Start free</LinkButton>
                <LinkButton to="/contact" size="lg">Talk to us</LinkButton>
              </div>
              <div className="mk-hero__proof">
                <span><PeopleIcon size={14} /> {clause(person.segment, 12)}</span>
              </div>
            </div>
            <div className="mk-hero__art">
              <Illustration name="explain" title="A decision with its reasons plotted beside it" />
            </div>
          </div>
        </Container>
      </section>

      {/* ── Job, status quo, metric ──────────────────────────────────────── */}
      <Section kicker="The job" title="What this role is trying to get right">
        <div className="u-grid u-grid--3">
          <Card>
            <FeaturedIcon icon={GoalIcon} size="sm" />
            <h3 className="u-card__title" style={{ fontSize: 'var(--text-md-size)' }}>The job to be done</h3>
            <p className="u-card__body u-clamp-3">{lede(person.jobToBeDone, 24)}</p>
          </Card>
          <Card>
            <FeaturedIcon icon={HistoryIcon} tone="error" size="sm" />
            <h3 className="u-card__title" style={{ fontSize: 'var(--text-md-size)' }}>What fails today</h3>
            <p className="u-card__body u-clamp-3">{lede(person.statusQuo, 24)}</p>
          </Card>
          <Card>
            <FeaturedIcon icon={GraphIcon} tone="success" size="sm" />
            <h3 className="u-card__title" style={{ fontSize: 'var(--text-md-size)' }}>The number they answer for</h3>
            <p className="mk-figure u-clamp-2" style={{ fontSize: 'var(--text-xl-size)' }}>{clause(person.successMetric, 10)}</p>
            <p className="u-card__note u-clamp-2">Everything below is here because it moves that number.</p>
          </Card>
        </div>
      </Section>

      {/* ── The three capabilities that matter to them ───────────────────── */}
      <Section
        tone="tint"
        kicker="What they use"
        title="The three parts of the product this role lives in"
        actions={<LinkButton to="/product" variant="tertiary" trailingIcon={ArrowRightIcon}>All {product.features.length} capabilities</LinkButton>}
      >
        <div className={`mk-row${index % 2 ? ' mk-row--flip' : ''}`}>
          <div className="mk-row__copy">
            <div className="mk-list">
              {picks.map((f) => (
                <div className="mk-list__i" key={f.name}>
                  <FeaturedIcon icon={f.icon ?? SparkleFillIcon} size="sm" />
                  <div>
                    <h3 className="u-card__title u-clamp-1" style={{ fontSize: 'var(--text-md-size)' }}>{clause(f.name, 7)}</h3>
                    <p className="u-text-sm u-muted u-clamp-2">{lede(f.summary, 20)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Vignette kind={ART[index % ART.length]} />
        </div>
      </Section>

      {/* ── Proof ───────────────────────────────────────────────────────── */}
      <Section tone="dark" kicker="Proof" title="What you can check before you commit" size="sm">
        <div className="mk-stats">
          {product.outcomes.slice(0, 4).map((m) => (
            <Stat key={m.label} value={m.value} label={clause(m.label, 5)} caption={m.caption && clause(m.caption, 6)} />
          ))}
        </div>
        <p className="u-text-sm" style={{ color: 'var(--gray-500)', marginTop: 'var(--space-8)' }}>
          Validated on {project.dataset.name} before the model sees one of your {d.units}.{' '}
          <a href="/science" style={{ color: 'var(--gray-300)' }}>See the evaluation</a>
        </p>
      </Section>

      {others.length > 0 && (
        <Section kicker="Other roles" title="Someone else in the room">
          <div className="u-grid u-grid--2">
            {others.map((p) => (
              <Card key={p.title} interactive as={Link} to={`/solutions/${personaSlug(p)}`} style={{ textDecoration: 'none' }}>
                <FeaturedIcon icon={PersonIcon} size="sm" />
                <h3 className="u-card__title u-clamp-1" style={{ fontSize: 'var(--text-md-size)' }}>{p.title}</h3>
                <p className="u-card__body u-clamp-2">{firstSentence(p.jobToBeDone)}</p>
              </Card>
            ))}
          </div>
        </Section>
      )}

      <CtaBand
        title={`Score your own ${d.units} this week`}
        body={`Create an account, bring a file, and watch the number you answer for move.`}
        primary={{ to: '/signup', label: 'Start free' }}
        secondary={{ to: '/pricing', label: 'See pricing' }}
      />
    </>
  )
}
