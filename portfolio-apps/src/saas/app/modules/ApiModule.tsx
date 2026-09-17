import { useMemo, useState } from 'react'
import { Alert, Badge, Button, Card, CodeBlock, EmptyState, IconButton, Segmented, Tag } from '@/ui'
import { CodeIcon, CopyIcon, PlusIcon, TrashIcon } from '@primer/octicons-react'
import { useSite } from '../../context'
import { deriveProduct } from '../../fallback'
import { domainOf } from '@/content/domain'
import { withArticle } from '@/saas/marketing/copy'
import type { ModuleDef } from '../spec'
import { Page, shortDate, useCollection } from '../shared'

interface ApiKey { id: string; name: string; created: string; last4: string; secret?: string }

export function ApiModule({ mod }: { mod: ModuleDef }) {
  const site = useSite()
  const { project } = site
  const product = site.product ?? deriveProduct(project)
  const d = domainOf(project.slug)
  const { items: keys, save, remove } = useCollection<ApiKey>('apikeys')
  const [revealed, setRevealed] = useState<string | null>(null)
  const [lang, setLang] = useState<'curl' | 'python' | 'ts'>('curl')

  const base = `https://api.${product.name.toLowerCase().replace(/[^a-z0-9]+/g, '')}.dev/v1`
  const sample = project.api.sample
  const path = sample?.endpoint ?? project.api.endpoints.find((e) => e.method === 'POST')?.path ?? '/score'
  const body = sample?.request ?? '{\n  "example": true\n}'
  const key = revealed ?? '$API_KEY'

  const snippets = useMemo(() => ({
    curl: `curl -X POST ${base}${path} \\\n  -H "Authorization: Bearer ${key}" \\\n  -H "Content-Type: application/json" \\\n  -d '${body.replace(/\s*\n\s*/g, ' ')}'`,
    python: `import os, httpx\n\nr = httpx.post(\n    "${base}${path}",\n    headers={"Authorization": f"Bearer {os.environ['API_KEY']}"},\n    json=${body.replace(/true/g, 'True').replace(/false/g, 'False').replace(/null/g, 'None')},\n    timeout=10.0,\n)\nr.raise_for_status()\nprint(r.json())`,
    ts: `const res = await fetch("${base}${path}", {\n  method: "POST",\n  headers: {\n    Authorization: \`Bearer \${process.env.API_KEY}\`,\n    "Content-Type": "application/json",\n  },\n  body: JSON.stringify(${body}),\n})\nconsole.log(await res.json())`,
  }), [base, path, body, key])

  async function create() {
    const id = crypto.randomUUID()
    const secret = `sk_live_${id.replace(/-/g, '').slice(0, 28)}`
    await save(id, { id, name: `Key ${keys.length + 1}`, created: new Date().toISOString(), last4: secret.slice(-4), secret })
    setRevealed(secret)
  }

  return (
    <Page mod={mod}>
      <Alert tone="info" title="Trial keys are local to this browser">
        Creating a key here records it on this device so the snippets below are copy-and-paste ready. Keys that call the
        hosted API are issued when the workspace moves to a paid plan.
      </Alert>

      <section className="u-stack">
        <div className="u-row">
          <h2 className="u-card__title">API keys</h2>
          <span className="u-spacer" />
          <Button size="sm" variant="primary" leadingIcon={PlusIcon} onClick={() => void create()}>Create key</Button>
        </div>

        {revealed && (
          <Alert tone="success" title="Copy this key now" onDismiss={() => setRevealed(null)}>
            <span className="u-mono" style={{ wordBreak: 'break-all' }}>{revealed}</span>
            <div style={{ marginTop: 'var(--space-2)' }}>
              <Button size="sm" leadingIcon={CopyIcon} onClick={() => void navigator.clipboard?.writeText(revealed)}>Copy</Button>
            </div>
          </Alert>
        )}

        {keys.length === 0 ? (
          <EmptyState icon={CodeIcon} title="No keys yet" action={<Button variant="primary" onClick={() => void create()}>Create your first key</Button>}>
            A key lets your own systems score {d.units} without opening this app.
          </EmptyState>
        ) : (
          <div className="ax-table-wrap">
            <table className="ax-table">
              <thead><tr><th>Name</th><th>Key</th><th>Created</th><th /></tr></thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id}>
                    <td className="u-strong">{k.name}</td>
                    <td className="u-mono">sk_live_••••{k.last4}</td>
                    <td className="u-quiet">{shortDate(k.created)}</td>
                    <td><IconButton icon={TrashIcon} size="sm" aria-label={`Revoke ${k.name}`} onClick={() => void remove(k.id)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="u-stack">
        <h2 className="u-card__title">Endpoints</h2>
        <p className="u-text-sm u-muted">Base URL <span className="u-inline-code">{base}</span></p>
        <div className="ax-table-wrap">
          <table className="ax-table">
            <thead><tr><th style={{ width: 90 }}>Method</th><th>Path</th><th>What it does</th></tr></thead>
            <tbody>
              {project.api.endpoints.map((e) => (
                <tr key={e.path}>
                  <td><Badge tone={e.method === 'GET' ? 'success' : 'brand'}>{e.method}</Badge></td>
                  <td className="u-mono">{e.path}</td>
                  <td className="u-quiet" style={{ whiteSpace: 'normal' }}>{e.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="u-stack">
        <div className="u-row">
          <h2 className="u-card__title">Score {withArticle(d.unit)} from your own system</h2>
          <span className="u-spacer" />
          <Segmented
            label="Language"
            value={lang}
            onChange={setLang}
            options={[{ value: 'curl', label: 'curl' }, { value: 'python', label: 'Python' }, { value: 'ts', label: 'TypeScript' }]}
          />
        </div>
        <CodeBlock code={snippets[lang]} label={lang} />
        {sample && (
          <div className="u-split">
            <Card><h3 className="u-card__title">Response</h3><CodeBlock code={sample.response} label="200 OK" /></Card>
            <Card>
              <h3 className="u-card__title">What comes back</h3>
              <p className="u-card__body">
                A score, the decision, and the drivers behind it. Every response carries the model version that produced it,
                so a decision can be reconstructed later.
              </p>
              <div className="u-row u-row--tight">
                <Tag>score</Tag><Tag>decision</Tag><Tag>reasons[]</Tag><Tag>model_version</Tag>
              </div>
            </Card>
          </div>
        )}
      </section>
    </Page>
  )
}
