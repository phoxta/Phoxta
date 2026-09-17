/**
 * Text lab — real transformer models over the customer's own text, on device.
 *
 * The models stream from the Hugging Face CDN the first time they are asked for
 * and are cached by the browser afterwards. Nothing typed here is uploaded.
 */
import { useCallback, useMemo, useState } from 'react'
import { Alert, Badge, Button, Card, Field, Input, Progress, Segmented, Tag, Textarea } from '@/ui'
import { DownloadIcon, PlusIcon, ZapIcon } from '@primer/octicons-react'
import { useSite } from '../../context'
import { domainOf } from '@/content/domain'
import { fmtBytes, getPipeline, type Progress as Prog } from '@/lib/inference/runtime'
import type { ModuleDef } from '../spec'
import { Page, download, toCsv, useCollection, type ScoredCase } from '../shared'

type Mode = 'sentiment' | 'labels'

const MODELS: Record<Mode, { id: string; task: string; size: string }> = {
  sentiment: { id: 'Xenova/twitter-roberta-base-sentiment-latest', task: 'text-classification', size: '≈70 MB' },
  labels: { id: 'Xenova/nli-deberta-v3-xsmall', task: 'zero-shot-classification', size: '≈90 MB' },
}

const SEED_LABELS: Record<string, string[]> = {
  brand: ['service', 'cleanliness', 'value for money', 'location', 'facilities'],
  reviews: ['defective on arrival', 'sizing or fit', 'missing parts', 'delivery damage', 'not as described'],
  'supply-chain': ['liquidity stress', 'litigation', 'going-concern doubt', 'management change', 'supply disruption'],
}

const EXAMPLES: Record<string, string> = {
  brand: 'The room was spotless and the front desk sorted our late check-in without fuss, but the bar prices were absurd for what you get.',
  reviews: 'Arrived two days late and the hinge was already cracked out of the box. Support replaced it quickly, but the packaging is far too thin.',
  'supply-chain': 'The filing discloses a covenant waiver obtained in the quarter and notes substantial doubt about the ability to continue as a going concern.',
}

interface Row { text: string; label: string; score: number; all: { label: string; score: number }[] }

export function TextLabModule({ mod }: { mod: ModuleDef }) {
  const { project } = useSite()
  const d = domainOf(project.slug)
  const [mode, setMode] = useState<Mode>(project.slug === 'customer' || project.slug === 'brand' || project.slug === 'reviews' ? 'labels' : 'sentiment')
  const [text, setText] = useState(EXAMPLES[project.slug] ?? '')
  const [labels, setLabels] = useState<string[]>(SEED_LABELS[project.slug] ?? ['positive', 'negative', 'neutral'])
  const [newLabel, setNewLabel] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [busy, setBusy] = useState(false)
  const [prog, setProg] = useState<Prog | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { save } = useCollection<ScoredCase>('cases')

  const model = MODELS[mode]

  const run = useCallback(async () => {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
    if (!lines.length) return
    setBusy(true); setError(null); setRows([])
    try {
      type Pipe = (input: string | string[], opts?: unknown) => Promise<unknown>
      const pipe = await getPipeline<Pipe>(model.task, model.id, setProg)
      const out: Row[] = []
      for (const line of lines) {
        const res = mode === 'labels'
          ? await pipe(line, { candidate_labels: labels, multi_label: false })
          : await pipe(line)
        if (mode === 'labels') {
          const r = res as { labels: string[]; scores: number[] }
          out.push({ text: line, label: r.labels[0], score: r.scores[0], all: r.labels.map((l, i) => ({ label: l, score: r.scores[i] })) })
        } else {
          const r = (Array.isArray(res) ? res : [res]) as { label: string; score: number }[]
          const top = r[0]
          out.push({ text: line, label: top.label, score: top.score, all: r.map((x) => ({ label: x.label, score: x.score })) })
        }
      }
      setRows(out)
      for (const r of out) {
        const id = crypto.randomUUID()
        await save(id, {
          id, at: new Date().toISOString(), source: 'lab', label: r.text.slice(0, 70),
          score: r.score, verdict: r.label, tone: 'accent', inputs: { text: r.text },
          reasons: r.all.slice(0, 5).map((a) => ({ label: a.label, weight: a.score })),
        })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false); setProg(null)
    }
  }, [text, mode, labels, model, save])

  const summary = useMemo(() => {
    const by = new Map<string, number>()
    for (const r of rows) by.set(r.label, (by.get(r.label) ?? 0) + 1)
    return [...by.entries()].sort((a, b) => b[1] - a[1])
  }, [rows])

  return (
    <Page mod={mod}>
      <Alert tone="info" title="The model runs on this device">
        The first run downloads {model.size} from the Hugging Face CDN and the browser caches it. The text you paste is never
        uploaded — close the tab and it is gone.
      </Alert>

      <div className="u-row">
        <Segmented<Mode>
          label="Analysis"
          value={mode}
          onChange={setMode}
          options={[{ value: 'labels', label: 'Your own labels' }, { value: 'sentiment', label: 'Sentiment' }]}
        />
        <span className="u-spacer" />
        <Tag>{model.id}</Tag>
      </div>

      {mode === 'labels' && (
        <Card>
          <h3 className="u-card__title">Labels to sort your {d.units} into</h3>
          <div className="u-row u-row--tight">
            {labels.map((l) => (
              <button key={l} type="button" className="u-tag" onClick={() => setLabels(labels.filter((x) => x !== l))} title={`Remove ${l}`}>
                {l} ×
              </button>
            ))}
          </div>
          <div className="u-row">
            <Input
              small
              placeholder="Add a label"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && newLabel.trim()) { setLabels([...labels, newLabel.trim()]); setNewLabel('') } }}
              style={{ maxWidth: 240 }}
            />
            <Button size="sm" leadingIcon={PlusIcon} onClick={() => { if (newLabel.trim()) { setLabels([...labels, newLabel.trim()]); setNewLabel('') } }}>Add</Button>
          </div>
          <p className="u-text-xs u-quiet">No retraining involved: the model compares your text against each label directly.</p>
        </Card>
      )}

      <Card>
        <Field label={`Your ${d.units}`} hint="One per line. Paste as many as you like.">
          {(p) => <Textarea {...p} rows={6} value={text} onChange={(e) => setText(e.target.value)} />}
        </Field>
        <div className="u-row">
          <Button variant="primary" leadingIcon={ZapIcon} loading={busy} onClick={() => void run()} disabled={!text.trim()}>
            {busy ? 'Analysing…' : `Analyse ${text.split('\n').filter((l) => l.trim()).length || ''} ${d.units}`}
          </Button>
          <Button onClick={() => setText(EXAMPLES[project.slug] ?? '')}>Load an example</Button>
          {rows.length > 0 && (
            <Button leadingIcon={DownloadIcon} onClick={() => download(`${project.slug}-text.csv`, toCsv(['text', 'label', 'confidence'], rows.map((r) => ({ text: r.text, label: r.label, confidence: r.score.toFixed(4) }))))}>
              Export
            </Button>
          )}
        </div>
        {prog && prog.status === 'download' && (
          <div className="u-stack" style={{ gap: 'var(--space-2)' }} aria-live="polite">
            <span className="u-text-sm u-muted">Downloading the model — {fmtBytes(prog.loaded)} of {fmtBytes(prog.total)}</span>
            <Progress value={prog.pct ?? 0} label="Model download" />
          </div>
        )}
        {error && <Alert tone="error" title="The model could not run" onDismiss={() => setError(null)}>{error}</Alert>}
      </Card>

      {rows.length > 0 && (
        <>
          <div className="u-row u-row--tight">
            {summary.map(([label, n]) => <Badge key={label} tone="brand" size="md">{label} · {n}</Badge>)}
          </div>
          <div className="ax-table-wrap ax-table-wrap--scroll">
            <table className="ax-table">
              <thead><tr><th style={{ minWidth: 320 }}>Text</th><th>Label</th><th className="num">Confidence</th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td style={{ whiteSpace: 'normal', maxWidth: 520 }}>{r.text}</td>
                    <td><Badge tone="brand">{r.label}</Badge></td>
                    <td className="num">{(r.score * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Page>
  )
}
