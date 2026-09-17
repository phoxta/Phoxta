import { Badge, Card, Checks, FeaturedIcon } from '@/ui'
import {
  DatabaseIcon, LawIcon, LinkExternalIcon, LockIcon, ShieldCheckIcon, ShieldLockIcon, VerifiedIcon,
} from '@primer/octicons-react'
import { domainOf } from '@/content/domain'
import { useSite } from '../context'
import { deriveProduct } from '../fallback'
import { CtaBand, Section, useMeta } from './bits'
import { clause, firstSentence, lede } from './copy'

const SUBPROCESSORS = [
  { name: 'Supabase', purpose: 'Authentication and sessions', region: 'EU (eu-west-1)', data: 'Email address, hashed password, session tokens' },
  { name: 'Vercel', purpose: 'Static hosting and edge delivery', region: 'Global edge', data: 'Transient request metadata (IP, user agent)' },
  { name: 'Hugging Face', purpose: 'Model weight delivery for in-browser scoring', region: 'Global CDN', data: 'Model file requests only. No customer content.' },
]

export function SecurityPage() {
  const site = useSite()
  const { frontier, project } = site
  const product = site.product ?? deriveProduct(project)
  const d = domainOf(project.slug)
  useMeta(`Security and trust — ${product.name}`, `How ${product.name} handles your data, your models and your auditors.`)

  return (
    <>
      {/* ── Three pillars ────────────────────────────────────────────────── */}
      <Section
        heading="h1"
        kicker="Trust"
        title="Built to survive a security review"
        sub={`On a trial your ${d.units} never leave the browser, identity is the only thing stored, and every model claim is reproducible.`}
      >
        <div className="u-grid u-grid--3">
          <Card>
            <FeaturedIcon icon={LockIcon} tone="success" size="sm" />
            <h2 className="u-card__title" style={{ fontSize: 'var(--text-md-size)' }}>Your data stays on the device</h2>
            <p className="u-card__body u-clamp-3">
              Trial scoring runs in your browser. Files are parsed locally and written to IndexedDB on your machine.
            </p>
          </Card>
          <Card>
            <FeaturedIcon icon={VerifiedIcon} tone="success" size="sm" />
            <h2 className="u-card__title" style={{ fontSize: 'var(--text-md-size)' }}>Identity, and nothing else</h2>
            <p className="u-card__body u-clamp-3">
              Sign-up stores an email and a hashed password with Supabase Auth. No profiling, no analytics, no ad trackers.
            </p>
          </Card>
          <Card>
            <FeaturedIcon icon={DatabaseIcon} tone="success" size="sm" />
            <h2 className="u-card__title" style={{ fontSize: 'var(--text-md-size)' }}>Reproducible models</h2>
            <p className="u-card__body u-clamp-3">
              {project.dataset.name} is public, the training code is public, and every number here is a held-out split.
            </p>
          </Card>
        </div>
      </Section>

      {/* ── Where the data actually lives ────────────────────────────────── */}
      <Section tone="tint" kicker="Data handling" title="What leaves your device, stated plainly">
        <div className="u-split u-split--wide-right">
          <div className="u-stack">
            <Checks
              items={[
                <><b>Trial {d.units}</b> — parsed, scored and stored in your browser&rsquo;s IndexedDB. Never uploaded.</>,
                <><b>Your account</b> — email and a hashed password, held by Supabase Auth in the EU.</>,
                <><b>Model weights</b> — fetched from a public CDN so scoring can run on your device.</>,
                <><b>Deletion</b> — one action in Settings clears the workspace store; the account goes on request.</>,
              ]}
            />
            <p className="u-text-sm u-quiet">
              An enterprise deployment removes even this: the model artefact and the serving container run inside your own account.
            </p>
          </div>
          <div className="u-table-wrap">
            <table className="u-table">
              <caption className="u-sr">Where each kind of data is held</caption>
              <thead>
                <tr><th scope="col">Data</th><th scope="col">Where it lives</th></tr>
              </thead>
              <tbody>
                <tr><td>Uploaded {d.units}</td><td className="u-strong">Your browser only</td></tr>
                <tr><td>Scores and reasons</td><td className="u-strong">Your browser only</td></tr>
                <tr><td>Email and password hash</td><td>Supabase Auth, EU</td></tr>
                <tr><td>Request logs</td><td>Vercel edge, 30 days</td></tr>
                <tr><td>Model weights</td><td>Public CDN, no content</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* ── Posture ──────────────────────────────────────────────────────── */}
      <Section kicker="Posture" title="Where we are, and where we are not">
        <div className="u-grid u-grid--3">
          {product.trust.map((t) => (
            <Card key={t.name}>
              <FeaturedIcon icon={ShieldCheckIcon} size="sm" />
              <h3 className="u-card__title u-clamp-2" style={{ fontSize: 'var(--text-md-size)' }}>{clause(t.name, 7)}</h3>
              <p className="u-card__body u-clamp-3">{lede(t.body, 24)}</p>
            </Card>
          ))}
          <Card>
            <FeaturedIcon icon={ShieldLockIcon} tone="warning" size="sm" />
            <h3 className="u-card__title" style={{ fontSize: 'var(--text-md-size)' }}>
              <span className="u-row u-row--tight">Certifications <Badge tone="warning">In progress</Badge></span>
            </h3>
            <p className="u-card__body u-clamp-3">
              SOC 2 readiness is in progress and no report has been issued. We will not claim a certification we do not hold.
            </p>
            <p className="u-card__note u-clamp-2">Ask for the current control matrix and the gap list; you will get both.</p>
          </Card>
        </div>
      </Section>

      {/* ── Sub-processors ───────────────────────────────────────────────── */}
      <Section tone="tint" kicker="Sub-processors" title="Who else touches anything">
        <div className="u-table-wrap" style={{ overflowX: 'auto' }}>
          <table className="u-table">
            <caption className="u-sr">Third parties involved in delivering the service</caption>
            <thead>
              <tr>
                <th scope="col" style={{ minWidth: 140 }}>Provider</th>
                <th scope="col" style={{ minWidth: 220 }}>Purpose</th>
                <th scope="col" style={{ minWidth: 140 }}>Region</th>
                <th scope="col" style={{ minWidth: 260 }}>Data reaching them</th>
              </tr>
            </thead>
            <tbody>
              {SUBPROCESSORS.map((s) => (
                <tr key={s.name}>
                  <th scope="row" className="mk-cmp__name">{s.name}</th>
                  <td>{s.purpose}</td>
                  <td>{s.region}</td>
                  <td className="u-clamp-2">{s.data}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="u-text-sm u-quiet" style={{ marginTop: 'var(--space-5)' }}>
          Additions are announced to the account email at least 30 days in advance.{' '}
          <a href="/legal/subprocessors">The current list is part of the DPA</a>.
        </p>
      </Section>

      {/* ── Controls and disclosure ──────────────────────────────────────── */}
      <Section tone="dark" kicker="Controls" title="What is in place today">
        <div className="u-split u-split--wide-left">
          <Checks
            items={[
              <><b>Transport</b> — HTTPS everywhere, with HSTS and preload.</>,
              <><b>Content Security Policy</b> — strict, with no inline scripts.</>,
              <><b>Authentication</b> — PKCE, refresh-token rotation, provider-enforced password rules.</>,
              <><b>Least data</b> — the trial collects an email address and nothing else.</>,
              <><b>Dependencies</b> — pinned versions, automated advisories, a public lock file.</>,
            ]}
          />
          <Card>
            <FeaturedIcon icon={LawIcon} tone="error" size="sm" />
            <h3 className="u-card__title" style={{ fontSize: 'var(--text-md-size)' }}>Responsible disclosure</h3>
            <p className="u-card__body u-clamp-3">
              Report anything you find to <a href="mailto:femi@phoxta.com">femi@phoxta.com</a>. Acknowledged within two
              working days, and good-faith research is never pursued.
            </p>
            <p className="u-card__note u-clamp-2">
              Send a short reproduction, the affected URL, and the impact you believe it has.
            </p>
          </Card>
        </div>
      </Section>

      {/* ── Regulation ───────────────────────────────────────────────────── */}
      {frontier?.compliance && frontier.compliance.length > 0 && (
        <Section
          kicker="Regulation"
          title="The rules this category lives under"
          sub={`Reviewed ${frontier.asOf}. Each entry links to the rule itself.`}
        >
          <div className="u-grid u-grid--2">
            {frontier.compliance.slice(0, 4).map((c) => (
              <Card key={c.name}>
                <FeaturedIcon icon={LawIcon} tone="warning" size="sm" />
                <h3 className="u-card__title u-clamp-2" style={{ fontSize: 'var(--text-md-size)' }}>{c.name}</h3>
                <p className="u-card__body u-clamp-3">{firstSentence(c.body)}</p>
                {c.url && (
                  <a href={c.url} target="_blank" rel="noreferrer" className="u-row u-row--tight u-text-sm">
                    Read the rule <LinkExternalIcon size={12} />
                  </a>
                )}
              </Card>
            ))}
          </div>
        </Section>
      )}

      <CtaBand
        title="Send us your security questionnaire"
        body="We answer with evidence, and we say so when the answer is no."
        primary={{ to: '/contact', label: 'Contact us' }}
        secondary={{ to: '/legal/dpa', label: 'Data processing terms' }}
      />
    </>
  )
}
