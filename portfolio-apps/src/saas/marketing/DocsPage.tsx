import { useEffect, useState } from 'react'
import { Badge, CodeBlock, Container, Segmented } from '@/ui'
import { domainOf } from '@/content/domain'
import { useSite } from '../context'
import { deriveProduct } from '../fallback'
import { Section, useMeta } from './bits'

const SECTIONS = [
  { id: 'start', label: 'Quick start' },
  { id: 'auth', label: 'Authentication' },
  { id: 'endpoints', label: 'Endpoints' },
  { id: 'scoring', label: 'Scoring one case' },
  { id: 'batch', label: 'Batch and jobs' },
  { id: 'errors', label: 'Errors' },
  { id: 'limits', label: 'Rate limits' },
  { id: 'webhooks', label: 'Webhooks' },
]

type Lang = 'curl' | 'python' | 'ts'

const METHOD_TONE = { GET: 'brand', POST: 'success', PUT: 'warning', DELETE: 'error' } as const

export function DocsPage() {
  const site = useSite()
  const { project } = site
  const product = site.product ?? deriveProduct(project)
  const d = domainOf(project.slug)
  useMeta(`API documentation — ${product.name}`, `Quick start and REST reference for ${product.name}.`)

  const [lang, setLang] = useState<Lang>('curl')
  const [active, setActive] = useState(SECTIONS[0].id)

  /* Highlight the section the reader is actually looking at. */
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        const seen = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (seen[0]) setActive(seen[0].target.id)
      },
      { rootMargin: '-88px 0px -70% 0px', threshold: 0 },
    )
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id)
      if (el) io.observe(el)
    }
    return () => io.disconnect()
  }, [])

  const base = `https://api.${product.name.toLowerCase().replace(/[^a-z0-9]+/g, '')}.dev/v1`
  const sample = project.api.sample
  const path = sample?.endpoint ?? project.api.endpoints.find((e) => e.method === 'POST')?.path ?? '/score'
  const body = sample?.request ?? '{\n  "example": true\n}'
  const compact = body.replace(/\s*\n\s*/g, ' ')

  const snippets: Record<Lang, string> = {
    curl: `curl -X POST ${base}${path} \\\n  -H "Authorization: Bearer $API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '${compact}'`,
    python: `import os, httpx\n\nresp = httpx.post(\n    "${base}${path}",\n    headers={"Authorization": f"Bearer {os.environ['API_KEY']}"},\n    json=${body.replace(/true/g, 'True').replace(/false/g, 'False').replace(/null/g, 'None')},\n    timeout=10.0,\n)\nresp.raise_for_status()\nprint(resp.json())`,
    ts: `const res = await fetch("${base}${path}", {\n  method: "POST",\n  headers: {\n    Authorization: \`Bearer \${process.env.API_KEY}\`,\n    "Content-Type": "application/json",\n  },\n  body: JSON.stringify(${body}),\n})\nif (!res.ok) throw new Error(await res.text())\nconsole.log(await res.json())`,
  }

  return (
    <>
      <Section
        heading="h1"
        kicker="Developers"
        title={`${product.name} API`}
        sub={`One REST call per ${d.unit}. JSON in, JSON out, with the reasons and the model version attached.`}
        size="sm"
      />

      <section className="mk-sec mk-sec--sm">
        <Container>
          <div className="mk-doc">
            <nav className="mk-doc__nav" aria-label="On this page">
              <p className="mk-kicker" style={{ padding: '0 10px 6px' }}>On this page</p>
              {SECTIONS.map((s) => (
                <a key={s.id} href={`#${s.id}`} aria-current={active === s.id ? 'true' : undefined}>{s.label}</a>
              ))}
            </nav>

            <div className="mk-doc__body">
              {/* ── Quick start ──────────────────────────────────────────── */}
              <section className="mk-doc__sec" id="start">
                <h2>Quick start</h2>
                <p className="u-text-md u-muted">
                  Create a key in the app under <b>API &amp; keys</b>, then score one {d.unit}. Three lines, no SDK required.
                </p>
                <Segmented<Lang>
                  label="Snippet language"
                  value={lang}
                  onChange={setLang}
                  options={[
                    { value: 'curl', label: 'curl' },
                    { value: 'python', label: 'Python' },
                    { value: 'ts', label: 'TypeScript' },
                  ]}
                />
                <CodeBlock code={snippets[lang]} label={lang === 'ts' ? 'TypeScript' : lang === 'python' ? 'Python' : 'bash'} />
                <p className="u-text-sm u-quiet">
                  The reference implementation ships in the open-source project on port {project.api.port}.
                </p>
              </section>

              {/* ── Authentication ───────────────────────────────────────── */}
              <section className="mk-doc__sec" id="auth">
                <h2>Authentication</h2>
                <p className="u-text-md u-muted">
                  Bearer tokens, scoped to one workspace. A key is shown once, so store it in your secret manager.
                </p>
                <CodeBlock
                  label="headers"
                  code={'Authorization: Bearer sk_live_9f2c…\nContent-Type: application/json\nIdempotency-Key: 8a1f-…   # optional, makes retries safe'}
                />
              </section>

              {/* ── Endpoints ────────────────────────────────────────────── */}
              <section className="mk-doc__sec" id="endpoints">
                <h2>Endpoints</h2>
                <p className="u-text-md u-muted">
                  Base URL <code className="u-inline-code">{base}</code>
                </p>
                <div className="u-table-wrap" style={{ overflowX: 'auto' }}>
                  <table className="u-table">
                    <caption className="u-sr">Every endpoint in the {product.name} API</caption>
                    <thead>
                      <tr>
                        <th scope="col" style={{ width: 92 }}>Method</th>
                        <th scope="col" style={{ minWidth: 190 }}>Path</th>
                        <th scope="col" style={{ minWidth: 260 }}>What it does</th>
                      </tr>
                    </thead>
                    <tbody>
                      {project.api.endpoints.map((e) => (
                        <tr key={`${e.method}${e.path}`}>
                          <td><Badge tone={METHOD_TONE[e.method]}>{e.method}</Badge></td>
                          <td><code className="u-inline-code">{e.path}</code></td>
                          <td className="u-clamp-2">{e.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* ── Scoring one case ─────────────────────────────────────── */}
              <section className="mk-doc__sec" id="scoring">
                <h2>Scoring one {d.unit}</h2>
                <p className="u-text-md u-muted">
                  <code className="u-inline-code">{path}</code> takes one {d.unit} and returns the score, the decision and the drivers behind it.
                </p>
                {sample ? (
                  <div className="u-grid u-grid--2">
                    <div className="u-stack">
                      <p className="mk-kicker">Request</p>
                      <CodeBlock code={sample.request} label="JSON" />
                    </div>
                    <div className="u-stack">
                      <p className="mk-kicker">Response</p>
                      <CodeBlock code={sample.response} label="200 OK" />
                    </div>
                  </div>
                ) : (
                  <CodeBlock code={snippets.curl} label="bash" />
                )}
              </section>

              {/* ── Batch ────────────────────────────────────────────────── */}
              <section className="mk-doc__sec" id="batch">
                <h2>Batch and jobs</h2>
                <p className="u-text-md u-muted">
                  Up to 1,000 {d.units} per call. Larger files go through the job API, and results keep the input row order.
                </p>
                <CodeBlock
                  label="bash"
                  code={`# synchronous, up to 1000 rows\ncurl -X POST ${base}/batch \\\n  -H "Authorization: Bearer $API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"cases": [ … ]}'\n\n# asynchronous, any size\ncurl -X POST ${base}/jobs -H "Authorization: Bearer $API_KEY" -F file=@cases.csv\ncurl ${base}/jobs/{id} -H "Authorization: Bearer $API_KEY"`}
                />
              </section>

              {/* ── Errors ───────────────────────────────────────────────── */}
              <section className="mk-doc__sec" id="errors">
                <h2>Errors</h2>
                <p className="u-text-md u-muted">Every error carries a stable code and a message that names the field at fault.</p>
                <div className="u-table-wrap" style={{ overflowX: 'auto' }}>
                  <table className="u-table">
                    <caption className="u-sr">Error codes and what to do about them</caption>
                    <thead>
                      <tr>
                        <th scope="col" style={{ width: 80 }}>Status</th>
                        <th scope="col" style={{ minWidth: 190 }}>Code</th>
                        <th scope="col" style={{ minWidth: 280 }}>What to do</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td className="u-num">400</td><td><code className="u-inline-code">invalid_request</code></td><td>A field is missing or out of range. The message names it.</td></tr>
                      <tr><td className="u-num">401</td><td><code className="u-inline-code">invalid_key</code></td><td>The key is wrong or revoked. Create a new one in the app.</td></tr>
                      <tr><td className="u-num">409</td><td><code className="u-inline-code">idempotency_conflict</code></td><td>That idempotency key was used with a different body.</td></tr>
                      <tr><td className="u-num">422</td><td><code className="u-inline-code">unscorable</code></td><td>Too many required features are missing to score reliably.</td></tr>
                      <tr><td className="u-num">429</td><td><code className="u-inline-code">rate_limited</code></td><td>Back off using the <code className="u-inline-code">Retry-After</code> header.</td></tr>
                      <tr><td className="u-num">503</td><td><code className="u-inline-code">model_reloading</code></td><td>A model version is rolling out. Retry after a second.</td></tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* ── Rate limits ──────────────────────────────────────────── */}
              <section className="mk-doc__sec" id="limits">
                <h2>Rate limits</h2>
                <p className="u-text-md u-muted">
                  Per workspace, and returned on every response as <code className="u-inline-code">X-RateLimit-Remaining</code>.
                </p>
                <div className="u-table-wrap" style={{ overflowX: 'auto' }}>
                  <table className="u-table">
                    <caption className="u-sr">Rate limits and metering by plan</caption>
                    <thead>
                      <tr>
                        <th scope="col" style={{ minWidth: 120 }}>Plan</th>
                        <th scope="col" className="num">Requests / min</th>
                        <th scope="col" className="num">Burst</th>
                        <th scope="col" style={{ minWidth: 260 }}>Metered on</th>
                      </tr>
                    </thead>
                    <tbody>
                      {product.pricing.map((p, i) => (
                        <tr key={p.id}>
                          <th scope="row" className="mk-cmp__name">{p.name}</th>
                          <td className="num">{['60', '600', 'Negotiated'][i] ?? '—'}</td>
                          <td className="num">{['120', '1,200', 'Negotiated'][i] ?? '—'}</td>
                          <td className="u-clamp-2">{p.meter}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* ── Webhooks ─────────────────────────────────────────────── */}
              <section className="mk-doc__sec" id="webhooks">
                <h2>Webhooks</h2>
                <p className="u-text-md u-muted">
                  Deliveries are signed with an HMAC in <code className="u-inline-code">X-Signature</code> and retried for 24 hours.
                </p>
                <div className="u-row">
                  <Badge tone="brand">case.flagged</Badge>
                  <Badge tone="brand">job.completed</Badge>
                  <Badge tone="brand">drift.detected</Badge>
                </div>
                <CodeBlock
                  label="JSON"
                  code={'{\n  "type": "case.flagged",\n  "created": "2026-09-09T08:14:22Z",\n  "data": {\n    "case_id": "c_8f21…",\n    "score": 0.84,\n    "rule": "score above 0.75",\n    "model_version": "2026.09.1"\n  }\n}'}
                />
              </section>
            </div>
          </div>
        </Container>
      </section>
    </>
  )
}
