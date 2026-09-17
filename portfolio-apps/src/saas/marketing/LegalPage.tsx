import { Link, useParams } from 'react-router-dom'
import { Alert, Container } from '@/ui'
import { useSite } from '../context'
import { deriveProduct } from '../fallback'
import { Section, useMeta } from './bits'

const UPDATED = '9 September 2026'

type Doc = { title: string; intro: string; sections: { h: string; p: string[] }[] }

function docs(name: string): Record<string, Doc> {
  return {
    privacy: {
      title: 'Privacy notice',
      intro: `How ${name} handles personal data. Written to match how the product actually works, not to cover every hypothetical.`,
      sections: [
        { h: 'What we collect', p: [
          'When you create an account we collect your email address, an optional name, and a password that is hashed by our identity provider before storage. We never see the password itself.',
          'When you use the application, the cases you score, the files you upload and the settings you choose are written to IndexedDB in your own browser. They are not transmitted to us and we cannot read them.',
          'Our hosting provider records transient request metadata (IP address, user agent, requested path) in operational logs for security and debugging. These are retained for 30 days.',
        ] },
        { h: 'What we do not collect', p: [
          'No advertising identifiers, no third-party analytics, no session recording, no cross-site tracking, no cookies beyond the one that holds your session.',
        ] },
        { h: 'Why we are allowed to', p: [
          'Account data is processed to perform the contract you enter when you create an account. Security logs are processed under legitimate interests in keeping the service available and safe.',
        ] },
        { h: 'Model weights', p: [
          'Model files are downloaded from a public content delivery network so inference can run on your device. That request contains no customer content: it is a request for a file.',
        ] },
        { h: 'Your rights', p: [
          'You can access, correct, export or delete your data. Export and deletion of the workspace store are one action each inside the application under Settings.',
          'To delete your account entirely, write to femi@phoxta.com. Accounts are removed within 30 days and backups age out within a further 30.',
        ] },
        { h: 'Transfers and sub-processors', p: [
          'Sub-processors and the regions they operate in are listed on the security page. Transfers outside the UK and EEA rely on the standard contractual clauses.',
        ] },
        { h: 'Contact', p: ['Questions and requests: femi@phoxta.com.'] },
      ],
    },
    terms: {
      title: 'Terms of service',
      intro: `The agreement between you and ${name}.`,
      sections: [
        { h: 'The service', p: [
          `${name} provides machine-learning scoring and the surrounding application. Access is granted on the plan you select and for the term you pay for.`,
          'Free plans are provided as-is, may change, and carry no availability commitment.',
        ] },
        { h: 'Your account', p: [
          'You are responsible for keeping credentials and API keys secret, and for activity under your account. Tell us promptly if a key is exposed.',
          'One account is for one organisation. Do not share credentials with people outside it.',
        ] },
        { h: 'Acceptable use', p: [
          'Do not use the service to break the law, to make decisions the applicable regulation prohibits being automated, to reverse engineer the models, or to build a competing model from its outputs.',
          'Do not attempt to identify individuals from aggregated outputs, and do not upload data you have no right to process.',
        ] },
        { h: 'Decisions remain yours', p: [
          'Outputs are probabilistic and are decision support. You are responsible for the decisions you make, for any human review your regulator requires, and for the notices you must give the people affected.',
        ] },
        { h: 'Fees', p: [
          'Paid plans are billed in advance for the period selected. Overage is billed in arrears at the rate published on the pricing page. Fees are exclusive of tax.',
        ] },
        { h: 'Intellectual property', p: [
          'We keep ownership of the service and the models. You keep ownership of your data and of the outputs generated for you.',
        ] },
        { h: 'Warranties and liability', p: [
          'The service is provided without warranties beyond those that cannot be excluded. To the extent the law allows, liability in any twelve-month period is capped at the fees paid in that period, and neither party is liable for indirect or consequential loss.',
        ] },
        { h: 'Termination', p: [
          'Either party may terminate at the end of a billing period. We may suspend an account immediately for a serious breach of acceptable use, and will say why.',
        ] },
      ],
    },
    dpa: {
      title: 'Data processing addendum',
      intro: `Applies where ${name} processes personal data on your behalf.`,
      sections: [
        { h: 'Roles', p: [
          'You are the controller of any personal data you process using the service. We are the processor and act only on your documented instructions, of which this agreement and the service documentation form part.',
        ] },
        { h: 'Scope of processing', p: [
          'Subject matter: provision of the service. Duration: the term of the agreement. Nature and purpose: hosting, authentication and scoring. Categories of data subject and personal data: determined by you.',
          'On the standard plans, case data does not reach our systems: it is processed in your browser. The processing we perform is limited to account identity and operational logs.',
        ] },
        { h: 'Security', p: [
          'We apply technical and organisational measures appropriate to the risk, including encryption in transit, least-privilege access, dependency monitoring and a strict content security policy. The current measures are described on the security page.',
        ] },
        { h: 'Sub-processors', p: [
          'The current list is published on the security page. We give at least 30 days notice before adding one, and you may object on reasonable data-protection grounds.',
        ] },
        { h: 'Assistance and breach', p: [
          'We assist with data-subject requests, impact assessments and regulator consultations. We notify you of a personal data breach without undue delay and within 72 hours of becoming aware.',
        ] },
        { h: 'Deletion and audit', p: [
          'On termination we delete or return personal data within 30 days unless the law requires retention. You may audit compliance once a year on reasonable notice, or accept a third-party report in its place.',
        ] },
      ],
    },
    subprocessors: {
      title: 'Sub-processors',
      intro: 'The third parties involved in delivering the service.',
      sections: [
        { h: 'Current list', p: [
          'Supabase — authentication and session management, EU region. Personal data: email address, hashed password, session tokens.',
          'Vercel — static hosting and edge delivery, global. Personal data: transient request metadata.',
          'Hugging Face — delivery of model weights for in-browser inference, global CDN. No customer content.',
        ] },
        { h: 'Changes', p: [
          'Additions are announced at least 30 days in advance to the account email. Enterprise deployments run inside your own account and use none of the above.',
        ] },
      ],
    },
  }
}

export function LegalPage() {
  const site = useSite()
  const product = site.product ?? deriveProduct(site.project)
  const { doc } = useParams()
  const all = docs(product.name)
  const key = doc && doc in all ? doc : 'privacy'
  const d = all[key]
  useMeta(`${d.title} — ${product.name}`, d.intro)

  return (
    <>
      <Section heading="h1" kicker="Legal" title={d.title} sub={d.intro} size="sm">
        <p className="u-text-sm u-quiet">Last updated {UPDATED}</p>
      </Section>

      <section className="mk-sec mk-sec--sm">
        <Container>
          <div className="mk-doc">
            <nav className="mk-doc__nav" aria-label="Legal documents">
              <p className="mk-kicker" style={{ padding: '0 10px 6px' }}>Documents</p>
              {Object.entries(all).map(([k, v]) => (
                <Link key={k} to={`/legal/${k}`} aria-current={k === key ? 'page' : undefined}>{v.title}</Link>
              ))}
              <p className="mk-kicker" style={{ padding: 'var(--space-6) 10px 6px' }}>In this document</p>
              {d.sections.map((s, i) => <a key={s.h} href={`#s${i}`}>{s.h}</a>)}
            </nav>

            <article className="mk-doc__body">
              <div className="mk-doc__sec">
                <Alert tone="warning" title="Template document">
                  This is a working template for a demonstration product. Have counsel review it before you rely on it commercially.
                </Alert>
              </div>

              {d.sections.map((s, i) => (
                <section className="mk-doc__sec" key={s.h} id={`s${i}`}>
                  <h2>{i + 1}. {s.h}</h2>
                  <div className="u-prose">
                    {s.p.map((p, j) => <p key={j}>{p}</p>)}
                  </div>
                </section>
              ))}

              <p className="u-text-sm u-quiet" style={{ borderTop: '1px solid var(--border-secondary)', paddingTop: 'var(--space-6)' }}>
                Questions about this document: <a href="mailto:femi@phoxta.com">femi@phoxta.com</a>.
              </p>
            </article>
          </div>
        </Container>
      </section>
    </>
  )
}
