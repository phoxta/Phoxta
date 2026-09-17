/**
 * Your data — the first thing a customer does after signing up.
 *
 * The product is bought to run on the customer's own records, so this screen is
 * about getting them in: a file library that really parses and stores what you
 * drop in, the schema the model expects, and connection settings for the systems
 * this category ingests from. Nothing leaves the browser during a trial, and the
 * screen says so rather than implying a server round-trip.
 */
import { useCallback, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Alert, Badge, Button, Card, CodeBlock, EmptyState, FeaturedIcon, Field, IconButton, Input, LinkButton, Modal, Tag,
} from '@/ui'
import {
  ArrowRightIcon, CheckIcon, DatabaseIcon, DownloadIcon, FileIcon, LockIcon, PlugIcon, StackIcon, TableIcon, TrashIcon, UploadIcon, ZapIcon,
} from '@primer/octicons-react'
import { useSite } from '../../context'
import { domainOf } from '@/content/domain'
import { loadLgbm, type LgbmModel } from '@/lib/lgbm'
import { REAL_MODEL, type ModuleDef } from '../spec'
import { Page, download, parseCsv, shortDate, toCsv, useCollection } from '../shared'

interface StoredFile {
  id: string
  name: string
  at: string
  rows: number
  columns: string[]
  bytes: number
  /** First 200 rows, kept so the file can be previewed and re-scored. */
  sample: Record<string, string>[]
}

interface Connection {
  id: string
  name: string
  status: 'connected' | 'not connected'
  detail: string
  at?: string
}

const KIND_ICON = (name: string) => {
  const n = name.toLowerCase()
  if (n.includes('warehouse') || n.includes('snowflake') || n.includes('bigquery') || n.includes('table')) return DatabaseIcon
  if (n.includes('csv') || n.includes('export') || n.includes('file')) return FileIcon
  if (n.includes('camera') || n.includes('vms') || n.includes('upload')) return StackIcon
  return PlugIcon
}

export function SourcesModule({ mod }: { mod: ModuleDef }) {
  const { project } = useSite()
  const d = domainOf(project.slug)
  const real = REAL_MODEL[project.slug]
  const [model, setModel] = useState<LgbmModel | null>(null)
  const [over, setOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [configuring, setConfiguring] = useState<string | null>(null)
  const [preview, setPreview] = useState<StoredFile | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { items: files, save: saveFile, remove: removeFile } = useCollection<StoredFile>('files')
  const { items: conns, save: saveConn } = useCollection<Connection>('connections')

  useMemo(() => {
    if (real && !model) loadLgbm(real.url).then(setModel).catch(() => undefined)
  }, [real, model])

  const expected = model?.features ?? project.demo?.inputs.map((i) => i.key) ?? []

  const ingest = useCallback(
    (file: File) => {
      setError(null)
      const reader = new FileReader()
      reader.onload = async () => {
        const text = String(reader.result ?? '')
        const { columns, rows } = parseCsv(text)
        if (!rows.length) { setError(`${file.name} has a header but no rows.`); return }
        const id = crypto.randomUUID()
        await saveFile(id, {
          id, name: file.name, at: new Date().toISOString(), rows: rows.length,
          columns, bytes: file.size, sample: rows.slice(0, 200),
        })
      }
      reader.onerror = () => setError(`${file.name} could not be read.`)
      reader.readAsText(file)
    },
    [saveFile],
  )

  const onFiles = useCallback((list: FileList | null) => {
    for (const f of Array.from(list ?? [])) ingest(f)
  }, [ingest])

  const sampleFile = useCallback(() => {
    if (!expected.length) return
    let s = project.num * 7919
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
    const rows = Array.from({ length: 200 }, () => {
      const row: Record<string, number | string> = {}
      for (const f of expected) {
        const med = model?.medians[f]
        if (med != null) {
          const spread = Math.max(Math.abs(med) * 0.6, 1)
          const v = med + (rnd() - 0.5) * 2 * spread
          row[f] = Number.isInteger(med) ? Math.round(v) : Number(v.toFixed(4))
        } else {
          const inp = project.demo?.inputs.find((x) => x.key === f)
          if (!inp) continue
          if (inp.type === 'select') row[f] = (inp.options ?? [String(inp.default)])[Math.floor(rnd() * (inp.options?.length ?? 1))]
          else row[f] = Number(((inp.min ?? 0) + rnd() * ((inp.max ?? 100) - (inp.min ?? 0))).toFixed(2))
        }
      }
      return row
    })
    download(`${project.slug}-sample-${d.units}.csv`, toCsv(expected, rows))
  }, [expected, model, project, d.units])

  const connState = (name: string) => conns.find((c) => c.name === name)

  const totalRows = files.reduce((a, f) => a + f.rows, 0)

  return (
    <Page mod={mod}>
      <div className="u-grid u-grid--4" style={{ gap: 'var(--space-4)' }}>
        <Card><span className="u-text-sm u-quiet">Files in this workspace</span><strong className="u-display-xs u-num">{files.length}</strong></Card>
        <Card><span className="u-text-sm u-quiet">{d.units[0].toUpperCase() + d.units.slice(1)} available</span><strong className="u-display-xs u-num">{totalRows.toLocaleString()}</strong></Card>
        <Card><span className="u-text-sm u-quiet">Connections live</span><strong className="u-display-xs u-num">{conns.filter((c) => c.status === 'connected').length}</strong></Card>
        <Card><span className="u-text-sm u-quiet">Fields the model reads</span><strong className="u-display-xs u-num">{expected.length}</strong></Card>
      </div>

      <Alert tone="info" title="Where your data lives">
        On a trial, every {d.unit} you bring in is parsed and scored in this browser and stored on this device. Nothing is
        uploaded, so you can evaluate on real records before any agreement is in place. Growth and Enterprise plans add a
        hosted pipeline in your own region.
      </Alert>

      {error && <Alert tone="error" title="That file could not be read" onDismiss={() => setError(null)}>{error}</Alert>}

      {/* ── Bring a file ─────────────────────────────────────────────────── */}
      <section className="u-stack">
        <div className="u-row">
          <h2 className="u-display-xs" style={{ fontSize: 'var(--text-lg-size)' }}>Bring a file</h2>
          <span className="u-spacer" />
          <Button size="sm" leadingIcon={DownloadIcon} onClick={sampleFile} disabled={!expected.length}>Download a sample file</Button>
          <Button size="sm" variant="primary" leadingIcon={UploadIcon} onClick={() => inputRef.current?.click()}>Upload CSV</Button>
          <input ref={inputRef} type="file" accept=".csv,text/csv" multiple hidden onChange={(e) => onFiles(e.target.files)} />
        </div>

        {files.length === 0 ? (
          <div
            className="ap-drop"
            data-over={over}
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
            onDragOver={(e) => { e.preventDefault(); setOver(true) }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); onFiles(e.dataTransfer.files) }}
          >
            <FeaturedIcon icon={UploadIcon} tone="neutral" size="lg" />
            <strong style={{ color: 'var(--text-primary)' }}>Drop a file of {d.units} here</strong>
            <span>{d.fileHint}</span>
            <span className="u-text-xs u-quiet">Parsed on this device. Nothing is uploaded.</span>
          </div>
        ) : (
          <div className="u-table-wrap">
            <table className="u-table">
              <thead>
                <tr><th>File</th><th className="num">{d.units[0].toUpperCase() + d.units.slice(1)}</th><th className="num">Columns</th><th>Matched fields</th><th>Added</th><th /></tr>
              </thead>
              <tbody>
                {files.map((f) => {
                  const matched = f.columns.filter((c) => expected.includes(c)).length
                  return (
                    <tr key={f.id}>
                      <td><button type="button" className="u-strong" style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }} onClick={() => setPreview(f)}>{f.name}</button></td>
                      <td className="num">{f.rows.toLocaleString()}</td>
                      <td className="num">{f.columns.length}</td>
                      <td>
                        {matched > 0
                          ? <Badge tone="success" dot>{matched} of {expected.length} recognised</Badge>
                          : <Badge tone="warning" dot>no fields recognised</Badge>}
                      </td>
                      <td className="u-quiet">{shortDate(f.at)}</td>
                      <td><IconButton icon={TrashIcon} size="sm" aria-label={`Remove ${f.name}`} onClick={() => void removeFile(f.id)} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {files.length > 0 && (
          <div className="u-row">
            <LinkButton to="/app/batch" variant="primary" trailingIcon={ArrowRightIcon}>Score these {d.units}</LinkButton>
            <span className="u-text-sm u-quiet">Batch runs will pick up any file you have added here.</span>
          </div>
        )}
      </section>

      {/* ── What the model reads ─────────────────────────────────────────── */}
      <section className="u-stack">
        <h2 className="u-display-xs" style={{ fontSize: 'var(--text-lg-size)' }}>What the model reads</h2>
        <p className="u-text-sm u-muted" style={{ maxWidth: '74ch' }}>
          Columns are matched by name. Anything missing falls back to the population median, and the decision says so, so a
          partial file still scores — it just scores with less to go on.
        </p>
        {expected.length ? (
          <Card muted>
            <div className="u-row u-row--tight">
              {expected.map((f) => <Tag key={f}>{model?.feature_meta[f]?.label ?? f}</Tag>)}
            </div>
          </Card>
        ) : (
          <EmptyState icon={TableIcon} title="Schema published with the model">
            This product scores unstructured input rather than a fixed table. See the API reference for the accepted payload.
          </EmptyState>
        )}
        <CodeBlock
          label="CSV header"
          code={expected.length ? expected.join(',') : '// see /app/api for the accepted payload'}
        />
      </section>

      {/* ── Connections ──────────────────────────────────────────────────── */}
      <section className="u-stack">
        <h2 className="u-display-xs" style={{ fontSize: 'var(--text-lg-size)' }}>Connect a source</h2>
        <p className="u-text-sm u-muted" style={{ maxWidth: '74ch' }}>
          On a paid plan these run on a schedule and push scored {d.units} back to the system they came from. Configure them
          now and the settings travel with your workspace.
        </p>
        <div className="u-grid u-grid--3" style={{ gap: 'var(--space-4)' }}>
          {d.sources.map((name) => {
            const Icon = KIND_ICON(name)
            const c = connState(name)
            return (
              <Card key={name} interactive>
                <div className="u-row">
                  <FeaturedIcon icon={Icon} tone={c?.status === 'connected' ? 'success' : 'neutral'} size="sm" />
                  <span className="u-spacer" />
                  {c?.status === 'connected'
                    ? <Badge tone="success" dot>Connected</Badge>
                    : <Badge tone="outline">Not connected</Badge>}
                </div>
                <h3 className="u-card__title" style={{ fontSize: 'var(--text-md-size)' }}>{name}</h3>
                <p className="u-card__body">{c?.detail ?? `Pull ${d.units} from ${name.toLowerCase()} on a schedule.`}</p>
                <div>
                  <Button size="sm" onClick={() => setConfiguring(name)}>{c?.status === 'connected' ? 'Edit connection' : 'Configure'}</Button>
                </div>
              </Card>
            )
          })}
        </div>
      </section>

      {/* ── Or send them to us ───────────────────────────────────────────── */}
      <section className="u-stack">
        <h2 className="u-display-xs" style={{ fontSize: 'var(--text-lg-size)' }}>Or send {d.units} as they happen</h2>
        <div className="u-split u-split--wide-left">
          <CodeBlock
            label="POST"
            code={`curl -X POST https://api.example.com/v1/score \\\n  -H "Authorization: Bearer $API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{ ${expected.slice(0, 4).map((f) => `"${f}": …`).join(', ')} }'`}
          />
          <div className="u-stack">
            <p className="u-text-sm u-muted">
              Every {d.unit} scored through the API comes back with the same reasons you see on screen, plus the model version
              that produced it, so a decision can be reconstructed months later.
            </p>
            <div className="u-row">
              <LinkButton to="/app/api" trailingIcon={ArrowRightIcon}>Get an API key</LinkButton>
              <LinkButton to="/docs" variant="tertiary">Read the docs</LinkButton>
            </div>
          </div>
        </div>
      </section>

      <Card muted>
        <div className="u-row">
          <FeaturedIcon icon={LockIcon} tone="neutral" size="sm" />
          <div>
            <strong className="u-text-sm">Nothing you bring here is used to train anything.</strong>
            <p className="u-text-sm u-muted" style={{ margin: 0 }}>
              The model was validated on {project.dataset.name} before it ever saw your records, and your {d.units} are never
              added to it. <Link to="/security">How we handle data</Link>.
            </p>
          </div>
        </div>
      </Card>

      {/* ── Connection dialog ────────────────────────────────────────────── */}
      <ConnectionDialog
        name={configuring}
        onClose={() => setConfiguring(null)}
        onSave={async (name, detail) => {
          const existing = conns.find((c) => c.name === name)
          const id = existing?.id ?? crypto.randomUUID()
          await saveConn(id, { id, name, status: 'connected', detail, at: new Date().toISOString() })
          setConfiguring(null)
        }}
      />

      {/* ── File preview ─────────────────────────────────────────────────── */}
      <Modal
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        title={preview?.name ?? ''}
        subtitle={preview ? `${preview.rows.toLocaleString()} ${d.units} · ${preview.columns.length} columns · showing the first ${Math.min(preview.sample.length, 25)}` : undefined}
        width={880}
        footer={<Button variant="primary" onClick={() => setPreview(null)}>Done</Button>}
      >
        {preview && (
          <div className="u-table-wrap u-table-wrap--scroll">
            <table className="u-table u-table--dense">
              <thead>
                <tr>{preview.columns.slice(0, 10).map((c) => (
                  <th key={c}>{c}{expected.includes(c) && <span style={{ color: 'var(--text-success)' }} title="Recognised by the model"> <CheckIcon size={11} /></span>}</th>
                ))}</tr>
              </thead>
              <tbody>
                {preview.sample.slice(0, 25).map((r, i) => (
                  <tr key={i}>{preview.columns.slice(0, 10).map((c) => <td key={c}>{r[c]}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </Page>
  )
}

function ConnectionDialog({ name, onClose, onSave }: {
  name: string | null
  onClose: () => void
  onSave: (name: string, detail: string) => void
}) {
  const [host, setHost] = useState('')
  const [ref, setRef] = useState('')

  return (
    <Modal
      open={Boolean(name)}
      onClose={onClose}
      title={`Connect ${name ?? ''}`}
      subtitle="Settings are stored in this browser during the trial and are never transmitted."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            leadingIcon={ZapIcon}
            onClick={() => name && onSave(name, `${host || 'configured'}${ref ? ` · ${ref}` : ''}`)}
          >
            Save connection
          </Button>
        </>
      }
    >
      <div className="u-stack" style={{ paddingBottom: 'var(--space-4)' }}>
        <Field label="Host or account" hint="For example your warehouse account, tenant URL or camera gateway.">
          {(p) => <Input {...p} value={host} onChange={(e) => setHost(e.target.value)} placeholder="acme.eu-west-1" />}
        </Field>
        <Field label="Table, path or reference" hint="What we should read on each run.">
          {(p) => <Input {...p} value={ref} onChange={(e) => setRef(e.target.value)} placeholder="analytics.public.records" />}
        </Field>
        <Alert tone="warning" title="Trial connections do not run">
          Scheduled ingestion is part of the Growth plan. Saving here records the configuration so it is ready when the
          workspace is upgraded; no credentials are sent anywhere.
        </Alert>
      </div>
    </Modal>
  )
}
