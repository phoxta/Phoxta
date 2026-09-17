import { useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Alert, Button, Card, Checks, Container, Field, FeaturedIcon, Input, LinkButton, Select, Textarea,
} from '@/ui'
import {
  ArrowRightIcon, LinkExternalIcon, MailIcon, MarkGithubIcon, MortarBoardIcon, PersonIcon, StackIcon,
} from '@primer/octicons-react'
import { hubUrl } from '@/app/resolve'
import { ORDERED } from '@/content/registry'
import { domainOf } from '@/content/domain'
import { SLUGS } from '@/content/registry'
import { useSite } from '../context'
import { deriveProduct } from '../fallback'
import { CtaBand, Section, useMeta } from './bits'
import { Illustration } from './Illustration'
import { Grid, Mesh } from './BrandArt'
import { clause } from './copy'

const SIZES = ['1–10', '11–50', '51–200', '201–1000', '1000+']
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

type Form = { name: string; email: string; company: string; size: string; message: string }
type Errors = Partial<Record<keyof Form, string>>

export function CompanyPage() {
  const site = useSite()
  const { project } = site
  const product = site.product ?? deriveProduct(project)
  const d = domainOf(project.slug)
  const { pathname } = useLocation()
  const isContact = pathname.endsWith('/contact')
  useMeta(
    isContact ? `Contact — ${product.name}` : `About — ${product.name}`,
    isContact ? `Get in touch about ${product.name}.` : `Who builds ${product.name}, and how.`,
  )

  const [sent, setSent] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [form, setForm] = useState<Form>({ name: '', email: '', company: '', size: SIZES[0], message: '' })
  const set = (k: keyof Form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e))
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const next: Errors = {}
    if (!form.name.trim()) next.name = 'Tell us who you are.'
    if (!EMAIL.test(form.email.trim())) next.email = 'That does not look like an email address.'
    if (form.message.trim().length < 10) next.message = 'A sentence is enough, but we need one.'
    setErrors(next)
    if (Object.keys(next).length) {
      setSent(false)
      return
    }
    const body = [
      `Name: ${form.name}`, `Email: ${form.email}`, `Company: ${form.company || '—'}`, `Team size: ${form.size}`,
      '', form.message, '', `— composed by the ${product.name} contact form`,
    ].join('\n')
    window.location.href = `mailto:femi@phoxta.com?subject=${encodeURIComponent(`${product.name} enquiry`)}&body=${encodeURIComponent(body)}`
    setSent(true)
  }

  const others = ORDERED.filter((p) => p.slug !== project.slug)

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
                {isContact ? <MailIcon size={14} /> : <PersonIcon size={14} />}
                {isContact ? 'Contact' : 'About'}
              </span>
              <h1 className="u-hero-title">
                {isContact ? 'Tell us what you are trying to decide' : `One engineer, ${SLUGS.length} products`}
              </h1>
              <p className="u-hero-lede">
                {isContact
                  ? 'The form below composes an email on your device. Every message reaches a person who has read the code.'
                  : `${product.name} is built and maintained by Oluwafemi Adeyemi — one of ${SLUGS.length} applied-AI products, each with its own model, dataset and published evaluation.`}
              </p>
            </div>
            <div className="mk-hero__art">
              <Illustration name="connect" title="Two systems joined by a cable" />
            </div>
          </div>
        </Container>
      </section>

      {/* ── Who, and the form ────────────────────────────────────────────── */}
      <Section tone="tint" size="sm">
        <div className="u-split u-split--wide-left" style={{ alignItems: 'start' }}>
          <div className="u-stack" style={{ gap: 'var(--space-5)' }}>
            <Card>
              <div className="u-row">
                <FeaturedIcon icon={PersonIcon} size="lg" />
                <div>
                  <h2 className="u-card__title" style={{ fontSize: 'var(--text-lg-size)' }}>Oluwafemi Adeyemi</h2>
                  <p className="u-text-sm u-muted">Applied AI Engineer and Data Scientist</p>
                </div>
              </div>
              <p className="u-card__body u-clamp-3">
                Builds machine-learning systems end to end: raw data, model, evaluation, API, and the product a person actually uses.
              </p>
              <p className="u-card__note u-row u-row--tight">
                <MortarBoardIcon size={14} /> MIT Applied AI &amp; Data Science
              </p>
              <div className="u-row u-row--tight">
                <LinkButton href="mailto:femi@phoxta.com" size="sm" leadingIcon={MailIcon}>femi@phoxta.com</LinkButton>
                <LinkButton href="https://www.linkedin.com/in/oluwafemiadeyemi" target="_blank" rel="noreferrer" size="sm" trailingIcon={LinkExternalIcon}>LinkedIn</LinkButton>
                <LinkButton href={project.links.github} target="_blank" rel="noreferrer" size="sm" trailingIcon={MarkGithubIcon}>Source</LinkButton>
              </div>
            </Card>

            <Card>
              <FeaturedIcon icon={StackIcon} size="sm" />
              <h3 className="u-card__title" style={{ fontSize: 'var(--text-md-size)' }}>How this one is built</h3>
              <p className="u-card__body u-clamp-2">
                {project.dataset.name} — {project.dataset.size}. {project.models.length} model components, evaluated on a held-out split.
              </p>
              <Checks
                items={project.results.slice(0, 3).map((r) => <><b>{r.metric}</b> {r.value}</>)}
              />
              <p className="u-card__note u-clamp-2">
                The training pipeline, the API and this application are open source under MIT.
              </p>
            </Card>
          </div>

          <Card as="form" onSubmit={submit} noValidate>
            <h2 className="u-card__title" style={{ fontSize: 'var(--text-lg-size)' }}>
              {isContact ? 'Send a message' : 'Ask a question'}
            </h2>
            <p className="u-text-sm u-muted">
              Nothing is submitted to a server. This opens your mail client with the details filled in.
            </p>

            <div aria-live="polite">
              {sent && (
                <Alert tone="success" title="Your mail client should be open" onDismiss={() => setSent(false)}>
                  If nothing happened, write to femi@phoxta.com directly.
                </Alert>
              )}
            </div>

            <Field label="Name" error={errors.name}>
              {(p) => <Input {...p} value={form.name} autoComplete="name" onChange={(e) => set('name', e.target.value)} />}
            </Field>
            <Field label="Work email" error={errors.email}>
              {(p) => <Input {...p} type="email" value={form.email} autoComplete="email" onChange={(e) => set('email', e.target.value)} />}
            </Field>
            <Field label="Company" hint="Optional">
              {(p) => <Input {...p} value={form.company} autoComplete="organization" onChange={(e) => set('company', e.target.value)} />}
            </Field>
            <Field label="Team size">
              {(p) => (
                <Select {...p} value={form.size} onChange={(e) => set('size', e.target.value)}>
                  {SIZES.map((s) => <option key={s}>{s}</option>)}
                </Select>
              )}
            </Field>
            <Field label={`What are you trying to decide about your ${d.units}?`} error={errors.message}>
              {(p) => <Textarea {...p} rows={4} value={form.message} onChange={(e) => set('message', e.target.value)} />}
            </Field>

            <Button type="submit" variant="primary" block leadingIcon={MailIcon}>Open my mail client</Button>
          </Card>
        </div>
      </Section>

      {/* ── The suite ────────────────────────────────────────────────────── */}
      <Section
        kicker="The suite"
        title={`${others.length} more products built the same way`}
        sub="Each one takes a real dataset end to end: model, evaluation, API, and an application you can use."
        actions={
          <LinkButton href={hubUrl(site.resolution)} variant="secondary" trailingIcon={ArrowRightIcon}>
            See all seventeen
          </LinkButton>
        }
      >
        <div className="mk-tiles">
          {others.slice(0, 12).map((p) => (
            <div className="mk-tile" key={p.slug}>
              <FeaturedIcon icon={p.icon} size="sm" />
              <span>
                <b className="u-clamp-1">{p.short}</b>
                <small className="u-clamp-1">{clause(p.tagline, 7)}</small>
              </span>
            </div>
          ))}
        </div>
      </Section>

      <CtaBand
        title={isContact ? 'Or just try it first' : 'See it work on your own records'}
        body={`Create an account, bring a file, and read a real decision on your ${d.units} in under a minute.`}
        primary={{ to: '/signup', label: 'Start free' }}
        secondary={{ to: '/product', label: 'See the product' }}
      />
    </>
  )
}
