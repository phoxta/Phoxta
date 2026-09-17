/**
 * Alerts — the rules that watch every scored case, and the queue of cases that
 * tripped one.
 *
 * Rules and acknowledgements are workspace records, so the queue survives a
 * reload and stays specific to this product and this account. A case leaves the
 * queue once every rule currently firing on it has been acknowledged; if a new
 * rule later fires on the same case, it comes back.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, IconButton, Label, LinkButton, Select, TextInput, ToggleSwitch, Spinner } from '@primer/react'
import {
  AlertIcon, BellIcon, CheckIcon, InboxIcon, MailIcon, PlusIcon, StackIcon, TrashIcon, UndoIcon, WebhookIcon, ZapIcon,
} from '@primer/octicons-react'
import { ChartCard } from '@/components/Charts'
import type { BarChart } from '@/content/types'
import { useSite } from '../../context'
import { ADAPTERS } from '../adapters'
import { Page, pct, shortDate, useCollection, type AlertRule, type ScoredCase } from '../shared'
import type { ModuleDef } from '../spec'

/* ── records ──────────────────────────────────────────────────────────── */

/** One acknowledgement, keyed by the case it clears. */
interface Ack {
  id: string
  caseId: string
  /** The rules that had fired at the moment it was acknowledged. */
  ruleIds: string[]
  at: string
}

type Channel = AlertRule['channel']

const CHANNEL_ICON: Record<Channel, typeof InboxIcon> = { inbox: InboxIcon, email: MailIcon, webhook: WebhookIcon }

const CHANNEL_NOTE: Record<Channel, string> = {
  inbox: 'Raised in the queue on this page. Nothing leaves the browser.',
  email: 'Raised in the queue here, and emailed as well once this workspace is connected to a mail sender.',
  webhook: 'Raised in the queue here, and POSTed to your endpoint as well once this workspace is deployed.',
}

/** `>` and `<` are inclusive, matching the action threshold used everywhere else. */
const fires = (rule: AlertRule, c: ScoredCase) => (rule.op === '>' ? c.score >= rule.value : c.score <= rule.value)

const describeRule = (r: AlertRule) => `score ${r.op === '>' ? 'at or above' : 'at or below'} ${(r.value * 100).toFixed(0)}%`

interface Draft {
  name: string
  op: AlertRule['op']
  /** Percent, 0–100, as typed. */
  value: number
  channel: Channel
}

/* ── module ───────────────────────────────────────────────────────────── */

export function AlertsModule({ mod }: { mod: ModuleDef }) {
  const { project } = useSite()
  const suggested = ADAPTERS[project.slug]?.threshold ?? 0.5

  const { items: rules, loading: rulesLoading, save: saveRule, remove: removeRule } = useCollection<AlertRule>('alerts')
  const { items: cases, loading: casesLoading } = useCollection<ScoredCase>('cases')
  const { items: acks, save: saveAck, remove: removeAck } = useCollection<Ack>('acks')

  const [draft, setDraft] = useState<Draft>({ name: '', op: '>', value: Math.round(suggested * 100), channel: 'inbox' })
  const [status, setStatus] = useState('')
  const [showAcked, setShowAcked] = useState(false)

  const setD = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((p) => ({ ...p, [k]: v }))

  const ordered = useMemo(() => [...rules].sort((a, b) => a.name.localeCompare(b.name)), [rules])
  const active = useMemo(() => ordered.filter((r) => r.active), [ordered])

  /** Every case an active rule fires on, newest first, with what it still owes. */
  const queue = useMemo(() => {
    const ackBy = new Map(acks.map((a) => [a.caseId, a]))
    return cases
      .map((c) => {
        const fired = active.filter((r) => fires(r, c))
        if (!fired.length) return null
        const ack = ackBy.get(c.id) ?? null
        const outstanding = ack ? fired.filter((r) => !ack.ruleIds.includes(r.id)) : fired
        return { c, fired, outstanding, ack }
      })
      .filter((x): x is { c: ScoredCase; fired: AlertRule[]; outstanding: AlertRule[]; ack: Ack | null } => x !== null)
      .sort((a, b) => b.c.at.localeCompare(a.c.at))
  }, [cases, active, acks])

  const open = useMemo(() => queue.filter((q) => q.outstanding.length > 0), [queue])
  const cleared = useMemo(() => queue.filter((q) => q.outstanding.length === 0), [queue])

  /** How many cases each rule matches, whether or not it is switched on. */
  const matches = useMemo(() => {
    const out = new Map<string, number>()
    for (const r of ordered) out.set(r.id, cases.filter((c) => fires(r, c)).length)
    return out
  }, [ordered, cases])

  const perDay = useMemo(() => {
    const by = new Map<string, { raised: number; open: number }>()
    for (const q of queue) {
      const day = q.c.at.slice(0, 10)
      if (day.length !== 10) continue
      const e = by.get(day) ?? { raised: 0, open: 0 }
      e.raised += 1
      if (q.outstanding.length) e.open += 1
      by.set(day, e)
    }
    return [...by.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, e]) => ({ day: day.slice(5), raised: e.raised, open: e.open }))
  }, [queue])

  /* ── actions ────────────────────────────────────────────────────────── */

  const create = (name: string, op: AlertRule['op'], valuePct: number, channel: Channel) => {
    const id = crypto.randomUUID()
    const rule: AlertRule = {
      id,
      name: name.trim() || `Score ${op === '>' ? 'at or above' : 'at or below'} ${valuePct}%`,
      field: 'score',
      op,
      value: Math.min(1, Math.max(0, valuePct / 100)),
      channel,
      active: true,
    }
    void saveRule(id, rule)
    setStatus(`Rule “${rule.name}” created and switched on. It matches ${cases.filter((c) => fires(rule, c)).length} of ${cases.length} cases already scored here.`)
    setDraft({ name: '', op: '>', value: Math.round(suggested * 100), channel: 'inbox' })
  }

  const toggle = (r: AlertRule, on: boolean) => {
    void saveRule(r.id, { ...r, active: on })
    setStatus(`Rule “${r.name}” ${on ? 'switched on' : 'switched off'}.`)
  }

  const drop = (r: AlertRule) => {
    void removeRule(r.id)
    setStatus(`Rule “${r.name}” deleted. Cases it raised are no longer in the queue.`)
  }

  const acknowledge = (q: { c: ScoredCase; fired: AlertRule[] }) => {
    void saveAck(q.c.id, { id: q.c.id, caseId: q.c.id, ruleIds: q.fired.map((r) => r.id), at: new Date().toISOString() })
    setStatus(`Acknowledged ${q.c.label}.`)
  }

  const acknowledgeAll = () => {
    const at = new Date().toISOString()
    for (const q of open) void saveAck(q.c.id, { id: q.c.id, caseId: q.c.id, ruleIds: q.fired.map((r) => r.id), at })
    setStatus(`Acknowledged ${open.length} case${open.length === 1 ? '' : 's'}.`)
  }

  const reopen = (q: { c: ScoredCase }) => {
    void removeAck(q.c.id)
    setStatus(`Reopened ${q.c.label}.`)
  }

  /* ── loading / empty ────────────────────────────────────────────────── */

  if (rulesLoading || casesLoading) {
    return (
      <Page mod={mod}>
        <div className="ap-empty" role="status" aria-live="polite"><Spinner size="medium" /><p>Reading the workspace…</p></div>
      </Page>
    )
  }

  if (!cases.length) {
    return (
      <Page mod={mod}>
        <div className="ap-empty">
          <AlertIcon size={24} />
          <h2 style={{ margin: 0, fontSize: 17 }}>There is nothing to watch yet</h2>
          <p style={{ margin: 0, maxWidth: '52ch' }}>
            Rules run over the cases this workspace has scored. Score one case, or upload a file and score every row, and the queue starts filling.
          </p>
          <div className="ap-badge-row">
            {project.demo && <LinkButton as={Link} to="/app/score" leadingVisual={ZapIcon} variant="primary" size="small">Score a case</LinkButton>}
            <LinkButton as={Link} to="/app/batch" leadingVisual={StackIcon} size="small">Run a batch</LinkButton>
          </div>
        </div>
      </Page>
    )
  }

  const chart: BarChart | null = perDay.length >= 2 ? {
    kind: 'bar',
    title: 'Alerts raised per day',
    subtitle: `${queue.length.toLocaleString()} case${queue.length === 1 ? '' : 's'} matched an active rule`,
    xKey: 'day',
    series: [{ key: 'raised', label: 'Raised' }, { key: 'open', label: 'Still open' }],
    data: perDay,
    yLabel: 'Cases',
    span: 12,
    note: 'A day where the two bars sit level is a day nobody has worked through yet.',
  } : null

  return (
    <Page
      mod={mod}
      actions={
        open.length > 0 ? <Button size="small" variant="primary" leadingVisual={CheckIcon} onClick={acknowledgeAll}>Acknowledge all ({open.length})</Button> : undefined
      }
    >
      <p aria-live="polite" style={{ margin: 0, minHeight: 20, color: 'var(--fgColor-muted)', fontSize: 13.5 }}>{status}</p>

      {/* ── headline numbers ─────────────────────────────────────────── */}
      <div className="ap-cards">
        <div className="ap-card">
          <h3>Open alerts</h3>
          <div className="ap-card__v" style={{ color: open.length ? 'var(--fgColor-attention)' : 'var(--fgColor-success)' }}>{open.length.toLocaleString()}</div>
          <p>{open.length ? 'cases waiting for a decision' : 'nothing is waiting on a person'}</p>
        </div>
        <div className="ap-card">
          <h3>Acknowledged</h3>
          <div className="ap-card__v">{cleared.length.toLocaleString()}</div>
          <p>cleared out of {queue.length.toLocaleString()} raised in total</p>
        </div>
        <div className="ap-card">
          <h3>Active rules</h3>
          <div className="ap-card__v">{active.length}</div>
          <p>{ordered.length - active.length} switched off</p>
        </div>
        <div className="ap-card">
          <h3>Coverage</h3>
          <div className="ap-card__v">{cases.length ? pct(queue.length / cases.length) : '—'}</div>
          <p>of the {cases.length.toLocaleString()} cases scored here trip at least one active rule</p>
        </div>
      </div>

      {/* ── rules ────────────────────────────────────────────────────── */}
      <section aria-labelledby="al-rules">
        <h2 id="al-rules" style={{ fontSize: 15, margin: '0 0 10px' }}>Rules</h2>

        <form
          className="ap-toolbar"
          onSubmit={(e) => { e.preventDefault(); create(draft.name, draft.op, draft.value, draft.channel) }}
        >
          <div style={{ display: 'grid', gap: 4, flex: 1, minWidth: 200 }}>
            <label htmlFor="al-name" style={{ fontSize: 12.5, color: 'var(--fgColor-muted)' }}>Rule name</label>
            <TextInput id="al-name" size="small" block value={draft.name} placeholder="e.g. Escalate to underwriting" onChange={(e) => setD('name', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gap: 4 }}>
            <label htmlFor="al-field" style={{ fontSize: 12.5, color: 'var(--fgColor-muted)' }}>Field</label>
            <Select id="al-field" size="small" value="score" onChange={() => undefined}>
              <Select.Option value="score">Score</Select.Option>
            </Select>
          </div>
          <div style={{ display: 'grid', gap: 4 }}>
            <label htmlFor="al-op" style={{ fontSize: 12.5, color: 'var(--fgColor-muted)' }}>Condition</label>
            <Select id="al-op" size="small" value={draft.op} onChange={(e) => setD('op', e.target.value as AlertRule['op'])}>
              <Select.Option value=">">is at or above</Select.Option>
              <Select.Option value="<">is at or below</Select.Option>
            </Select>
          </div>
          <div style={{ display: 'grid', gap: 4 }}>
            <label htmlFor="al-value" style={{ fontSize: 12.5, color: 'var(--fgColor-muted)' }}>Threshold</label>
            <TextInput
              id="al-value" size="small" type="number" min={0} max={100} step={1} trailingVisual="%"
              value={String(draft.value)} style={{ width: 108 }}
              onChange={(e) => setD('value', Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
            />
          </div>
          <div style={{ display: 'grid', gap: 4 }}>
            <label htmlFor="al-channel" style={{ fontSize: 12.5, color: 'var(--fgColor-muted)' }}>Channel</label>
            <Select id="al-channel" size="small" value={draft.channel} onChange={(e) => setD('channel', e.target.value as Channel)}>
              <Select.Option value="inbox">Queue on this page</Select.Option>
              <Select.Option value="email">Email</Select.Option>
              <Select.Option value="webhook">Webhook</Select.Option>
            </Select>
          </div>
          <Button type="submit" size="small" variant="primary" leadingVisual={PlusIcon}>Create rule</Button>
        </form>

        <p style={{ margin: '8px 0 0', color: 'var(--fgColor-muted)', fontSize: 13 }}>
          {CHANNEL_NOTE[draft.channel]} A rule matching{' '}
          <strong style={{ color: 'var(--fgColor-default)' }}>
            score {draft.op === '>' ? 'at or above' : 'at or below'} {draft.value}%
          </strong>{' '}
          would raise {cases.filter((c) => (draft.op === '>' ? c.score >= draft.value / 100 : c.score <= draft.value / 100)).length.toLocaleString()} of the{' '}
          {cases.length.toLocaleString()} cases already scored here.
        </p>

        {ordered.length === 0 ? (
          <div className="ap-empty" style={{ marginTop: 14 }}>
            <BellIcon size={24} />
            <h3 style={{ margin: 0, fontSize: 16 }}>No rule is watching this workspace</h3>
            <p style={{ margin: 0, maxWidth: '56ch' }}>
              {project.short} treats <strong style={{ color: 'var(--fgColor-default)' }}>{pct(suggested)}</strong> as the point where a case needs a person,
              so that is the rule to start with. It would raise{' '}
              {cases.filter((c) => c.score >= suggested).length.toLocaleString()} of the {cases.length.toLocaleString()} cases scored here so far.
            </p>
            <Button
              variant="primary"
              size="small"
              leadingVisual={PlusIcon}
              onClick={() => create(`Score at or above ${(suggested * 100).toFixed(0)}%`, '>', Math.round(suggested * 100), 'inbox')}
            >
              Create the suggested rule
            </Button>
          </div>
        ) : (
          <div className="ap-tablewrap" style={{ marginTop: 14 }}>
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Rule</th>
                  <th>Condition</th>
                  <th>Channel</th>
                  <th className="num">Cases matched</th>
                  <th>Active</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {ordered.map((r) => {
                  const Icon = CHANNEL_ICON[r.channel]
                  return (
                    <tr key={r.id}>
                      <td style={{ whiteSpace: 'normal', maxWidth: 280 }}>
                        {r.name}
                        <span id={`al-lab-${r.id}`} className="fa-visually-hidden">{r.name} — {describeRule(r)} — active</span>
                      </td>
                      <td style={{ fontFamily: 'var(--fontStack-monospace)', fontSize: 12.5 }}>{r.field} {r.op}= {(r.value * 100).toFixed(0)}%</td>
                      <td><span className="ap-badge-row"><Icon size={14} /> {r.channel}</span></td>
                      <td className="num" style={{ fontWeight: 600 }}>{(matches.get(r.id) ?? 0).toLocaleString()}</td>
                      <td>
                        <ToggleSwitch
                          size="small"
                          checked={r.active}
                          aria-labelledby={`al-lab-${r.id}`}
                          onChange={(on) => toggle(r, on)}
                        />
                      </td>
                      <td>
                        <IconButton icon={TrashIcon} size="small" variant="invisible" aria-label={`Delete rule ${r.name}`} onClick={() => drop(r)} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {chart && <div className="fa-grid"><ChartCard spec={chart} /></div>}

      {/* ── live queue ───────────────────────────────────────────────── */}
      <section aria-labelledby="al-queue">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', flexWrap: 'wrap', marginBottom: 10 }}>
          <h2 id="al-queue" style={{ fontSize: 15, margin: 0 }}>Live queue</h2>
          <div className="ap-badge-row">
            <Label variant={open.length ? 'attention' : 'success'}>{open.length} open</Label>
            {cleared.length > 0 && (
              <Button size="small" variant="invisible" onClick={() => setShowAcked((s) => !s)} aria-expanded={showAcked}>
                {showAcked ? 'Hide' : 'Show'} {cleared.length} acknowledged
              </Button>
            )}
          </div>
        </div>

        {!active.length ? (
          <div className="ap-empty">
            <p style={{ margin: 0, maxWidth: '54ch' }}>
              {ordered.length ? 'Every rule is switched off, so nothing is being watched. Switch one on above.' : 'Create a rule above and matching cases appear here, newest first.'}
            </p>
          </div>
        ) : open.length === 0 ? (
          <div className="ap-empty">
            <CheckIcon size={24} />
            <p style={{ margin: 0, maxWidth: '54ch' }}>
              {cleared.length
                ? `Nothing is waiting. All ${cleared.length} raised case${cleared.length === 1 ? ' has' : 's have'} been acknowledged.`
                : `No case has tripped ${active.length === 1 ? 'the active rule' : 'any of the active rules'} yet. The queue fills as new cases are scored.`}
            </p>
          </div>
        ) : (
          <div className="ap-tablewrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Case</th>
                  <th className="num">Score</th>
                  <th>Verdict</th>
                  <th>Rule fired</th>
                  <th>Top reason</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {open.slice(0, 300).map((q) => {
                  const top = [...(q.c.reasons ?? [])].sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))[0]
                  return (
                    <tr key={q.c.id}>
                      <td>{shortDate(q.c.at)}</td>
                      <td style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.c.label}</td>
                      <td className="num" style={{ fontWeight: 700 }}>{pct(q.c.score)}</td>
                      <td>{q.c.verdict}</td>
                      <td>
                        <span className="ap-badge-row">
                          {q.outstanding.map((r) => <Label key={r.id} size="small" variant="attention">{r.name}</Label>)}
                        </span>
                      </td>
                      <td style={{ color: 'var(--fgColor-muted)' }}>{top ? top.label : '—'}</td>
                      <td>
                        <Button size="small" leadingVisual={CheckIcon} onClick={() => acknowledge(q)}>Acknowledge</Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {open.length > 300 && (
          <p style={{ margin: '8px 0 0', color: 'var(--fgColor-muted)', fontSize: 13 }}>
            Showing the 300 newest of {open.length.toLocaleString()} open alerts.
          </p>
        )}

        {showAcked && cleared.length > 0 && (
          <div className="ap-tablewrap" style={{ marginTop: 14 }}>
            <table className="ap-table">
              <thead>
                <tr><th>Case</th><th className="num">Score</th><th>Rules cleared</th><th>Acknowledged</th><th /></tr>
              </thead>
              <tbody>
                {cleared.slice(0, 200).map((q) => (
                  <tr key={q.c.id}>
                    <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.c.label}</td>
                    <td className="num">{pct(q.c.score)}</td>
                    <td>
                      <span className="ap-badge-row">
                        {q.fired.map((r) => <Label key={r.id} size="small" variant="secondary">{r.name}</Label>)}
                      </span>
                    </td>
                    <td style={{ color: 'var(--fgColor-muted)' }}>{q.ack ? shortDate(q.ack.at) : '—'}</td>
                    <td><Button size="small" variant="invisible" leadingVisual={UndoIcon} onClick={() => reopen(q)}>Reopen</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p style={{ margin: 0, color: 'var(--fgColor-muted)', fontSize: 13, maxWidth: '86ch' }}>
        Rules are evaluated over every case in this workspace each time the page renders, not only over new ones — switch a rule on and the backlog it
        would have caught appears immediately. Acknowledgements are stored alongside the cases, on this device.
      </p>
    </Page>
  )
}
