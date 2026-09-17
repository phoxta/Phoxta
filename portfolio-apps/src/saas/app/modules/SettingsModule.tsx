import { useEffect, useState } from 'react'
import { Alert, Badge, Button, Card, Field, Input, Modal, Range, Select, Tag } from '@/ui'
import { DownloadIcon, TrashIcon } from '@primer/octicons-react'
import { useSite } from '../../context'
import { useAuth } from '../../auth'
import { domainOf } from '@/content/domain'
import { clearScope } from '../../store'
import { loadLgbm, type LgbmModel } from '@/lib/lgbm'
import { REAL_MODEL, type ModuleDef } from '../spec'
import { ADAPTERS } from '../adapters'
import { Page, download, useCollection, type ScoredCase } from '../shared'

interface Settings { workspace: string; timezone: string; threshold: number }

export function SettingsModule({ mod }: { mod: ModuleDef }) {
  const { project } = useSite()
  const d = domainOf(project.slug)
  const { account, configured, updatePassword, signOut } = useAuth()
  const real = REAL_MODEL[project.slug]
  const defaultThreshold = ADAPTERS[project.slug]?.threshold ?? 0.5

  const { items: saved, save } = useCollection<Settings>('settings')
  const { items: cases } = useCollection<ScoredCase>('cases')
  const current = saved[0]

  const [form, setForm] = useState<Settings>({ workspace: 'My workspace', timezone: 'Europe/London', threshold: defaultThreshold })
  const [model, setModel] = useState<LgbmModel | null>(null)
  const [password, setPassword] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmWipe, setConfirmWipe] = useState(false)

  useEffect(() => { if (current) setForm(current) }, [current])
  useEffect(() => { if (real) loadLgbm(real.url).then(setModel).catch(() => undefined) }, [real])

  async function persist() {
    await save('workspace', form)
    setNotice('Workspace settings saved.')
  }

  async function exportAll() {
    download(`${project.slug}-workspace.json`, JSON.stringify({ settings: form, cases }, null, 2), 'application/json')
  }

  async function wipe() {
    const n = await clearScope(project.slug, account?.id ?? null)
    setConfirmWipe(false)
    setNotice(`Deleted ${n} records from this workspace.`)
  }

  return (
    <Page mod={mod}>
      {notice && <Alert tone="success" title={notice} onDismiss={() => setNotice(null)} />}

      <Card>
        <h2 className="u-card__title">Profile</h2>
        <div className="u-split">
          <Field label="Name">{(p) => <Input {...p} defaultValue={account?.name ?? ''} readOnly />}</Field>
          <Field label="Email">{(p) => <Input {...p} defaultValue={account?.email ?? ''} readOnly />}</Field>
        </div>
        {configured ? (
          <div className="u-split">
            <Field label="New password" hint="At least 12 characters.">
              {(p) => <Input {...p} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />}
            </Field>
            <div style={{ alignSelf: 'end' }}>
              <Button
                onClick={() => { void updatePassword(password).then(() => { setPassword(''); setNotice('Password updated.') }).catch((e: Error) => setNotice(e.message)) }}
                disabled={password.length < 12}
              >
                Update password
              </Button>
            </div>
          </div>
        ) : (
          <Alert tone="info" title="This account lives on this device">
            The hosted identity service is not configured here, so there is no password to change remotely.
          </Alert>
        )}
      </Card>

      <Card>
        <h2 className="u-card__title">Workspace</h2>
        <div className="u-split">
          <Field label="Workspace name">
            {(p) => <Input {...p} value={form.workspace} onChange={(e) => setForm({ ...form, workspace: e.target.value })} />}
          </Field>
          <Field label="Time zone">
            {(p) => (
              <Select {...p} value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })}>
                {['Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Los_Angeles', 'Africa/Lagos', 'Asia/Singapore'].map((t) => <option key={t}>{t}</option>)}
              </Select>
            )}
          </Field>
        </div>
        <Field
          label={`Action threshold — ${(form.threshold * 100).toFixed(0)}%`}
          hint={`Any ${d.unit} at or above this score goes to the ${d.queue}. Lower catches more and costs more review time.`}
        >
          {(p) => (
            <Range {...p} min={0.05} max={0.95} step={0.05} value={form.threshold}
              onChange={(e) => setForm({ ...form, threshold: Number(e.target.value) })} />
          )}
        </Field>
        <div><Button variant="primary" onClick={() => void persist()}>Save changes</Button></div>
      </Card>

      <Card>
        <h2 className="u-card__title">Model</h2>
        {model ? (
          <>
            <div className="u-row u-row--tight">
              <Badge tone="success" dot>Live</Badge>
              <Tag>{real?.label}</Tag>
              <Tag>{model.trees.length} trees</Tag>
              <Tag>{model.features.length} features</Tag>
            </div>
            <div className="ax-kpis">
              <div className="ax-kpi"><span className="ax-kpi__l">Held-out AUC</span><span className="ax-kpi__v">{model.metrics.auc.toFixed(3)}</span></div>
              <div className="ax-kpi"><span className="ax-kpi__l">Brier score</span><span className="ax-kpi__v">{model.metrics.brier.toFixed(3)}</span></div>
              <div className="ax-kpi"><span className="ax-kpi__l">Trained on</span><span className="ax-kpi__v">{model.n_train.toLocaleString()}</span></div>
              <div className="ax-kpi"><span className="ax-kpi__l">Evaluated on</span><span className="ax-kpi__v">{model.n_test.toLocaleString()}</span></div>
            </div>
            <p className="u-text-sm u-muted">{model.dataset}. {model.notes}</p>
          </>
        ) : (
          <p className="u-card__body">
            This workspace scores with the published decision surface for {project.short}. The production model and its
            evaluation are documented in the model card.
          </p>
        )}
      </Card>

      <Card>
        <h2 className="u-card__title">Your data</h2>
        <p className="u-card__body">
          Everything this workspace holds — {cases.length.toLocaleString()} scored {d.units}, uploads, rules and settings —
          is stored in this browser. Export it or delete it at any time; neither action touches a server.
        </p>
        <div className="u-row">
          <Button leadingIcon={DownloadIcon} onClick={() => void exportAll()}>Export everything as JSON</Button>
          <Button variant="danger" leadingIcon={TrashIcon} onClick={() => setConfirmWipe(true)}>Delete workspace data</Button>
        </div>
      </Card>

      <Card>
        <h2 className="u-card__title">Sign out</h2>
        <p className="u-card__body">Ends the session on this device. Workspace data stays until you delete it.</p>
        <div><Button onClick={() => void signOut()}>Sign out</Button></div>
      </Card>

      <Modal
        open={confirmWipe}
        onClose={() => setConfirmWipe(false)}
        title="Delete everything in this workspace?"
        subtitle="This cannot be undone."
        footer={
          <>
            <Button onClick={() => setConfirmWipe(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => void wipe()}>Delete permanently</Button>
          </>
        }
      >
        <p className="u-text-sm u-muted" style={{ paddingBottom: 'var(--space-4)' }}>
          {cases.length.toLocaleString()} scored {d.units}, every uploaded file, every alert rule and every saved report will
          be removed from this browser.
        </p>
      </Modal>
    </Page>
  )
}
