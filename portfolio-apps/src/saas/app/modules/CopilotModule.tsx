/**
 * Copilot — a retrieval-augmented assistant for this product's own model, data
 * and results.
 *
 * The corpus is assembled at runtime from the site content (nothing is written
 * by hand here), embedded with a sentence-transformer that runs inside this
 * browser tab, and ranked by cosine similarity against the question. Answers are
 * composed only from the passages that were retrieved — there is no generative
 * model in the loop, so the assistant cannot invent a number that the
 * documentation does not contain.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Banner, Button, Label, Spinner, Textarea } from '@primer/react'
import {
  CpuIcon, InfoIcon, PaperAirplaneIcon, ShieldLockIcon, SyncIcon, TelescopeIcon, TrashIcon,
} from '@primer/octicons-react'
import type { Frontier } from '@/content/frontier'
import type { ProjectApp } from '@/content/types'
import { fmtBytes, getPipeline, hasWebGPU, type Progress } from '@/lib/inference/runtime'
import { useSite } from '../../context'
import { Page, shortDate, useCollection } from '../shared'
import type { ModuleDef } from '../spec'

/* ── the model ────────────────────────────────────────────────────────────
   One sentence-transformer, 384 dimensions, mean-pooled and L2-normalised so
   cosine similarity is a plain dot product. WebGPU gets the fp16 build; the
   WebAssembly path gets the 8-bit build, which is half the download. */

const MODEL = 'Xenova/all-MiniLM-L6-v2'
const GPU_BYTES = 45_297_825
const CPU_BYTES = 22_972_370

/** Retrieval floor. Below this the best passage is not really about the question. */
const FLOOR = 0.3
/** Keep a passage only if it is close to the best one. */
const RELATIVE = 0.72
const MAX_PASSAGES = 5
const MIN_PASSAGES = 3
const BATCH = 8

type Embedder = (
  texts: string[],
  options: { pooling: 'mean'; normalize: boolean },
) => Promise<{ tolist(): number[][] }>

/* ── corpus ───────────────────────────────────────────────────────────── */

interface Chunk {
  id: string
  /** Human-readable provenance, shown under every answer. */
  source: string
  /** Where the reader can go to check it. */
  to: string
  text: string
}

/** Everything this workspace can honestly answer from, in reading order. */
function buildCorpus(project: ProjectApp, frontier: Frontier | null): Chunk[] {
  const out: Chunk[] = []
  const add = (source: string, to: string, text: string) => {
    const t = text.trim()
    if (t.length > 24) out.push({ id: `c${out.length}`, source, to, text: t })
  }

  add('Summary', '/research', project.summary)
  project.problem.forEach((p, i) => add(`The problem · ${i + 1}`, '/research', p))
  project.solution.forEach((p, i) => add(`The solution · ${i + 1}`, '/research', p))
  project.features.forEach((f) => add(`Feature · ${f.title}`, '/product', `${f.title}. ${f.description}`))

  project.models.forEach((m) =>
    add(
      `Model · ${m.component}`,
      '/research/model',
      `${m.component} uses ${m.model}. ${m.purpose}.${m.metric ? ` Measured at ${m.metric}.` : ''}`,
    ),
  )
  project.results.forEach((r) =>
    add(`Result · ${r.metric}`, '/research/model', `${r.metric} is ${r.value}.${r.note ? ` ${r.note}.` : ''}`),
  )

  add('Dataset', '/research/data', `${project.dataset.name} (${project.dataset.size}). ${project.dataset.description}`)
  if (project.dataset.facts.length) {
    add(
      'Dataset facts',
      '/research/data',
      `Facts about ${project.dataset.name}: ${project.dataset.facts.map((f) => `${f.label} — ${f.value}`).join('; ')}.`,
    )
  }

  project.api.endpoints.forEach((e) =>
    add(`API · ${e.method} ${e.path}`, '/research/api', `${e.method} ${e.path} on port ${project.api.port}. ${e.description}`),
  )

  project.report.executiveSummary.forEach((p, i) => add(`Executive summary · ${i + 1}`, '/research/report', p))
  project.report.recommendations.forEach((r) =>
    add(`Recommendation · ${r.title}`, '/research/report', `${r.title}. ${r.body}`),
  )

  if (frontier) {
    add('Frontier · verdict', '/science', frontier.headline)
    frontier.summary.forEach((p, i) => add(`Frontier · the field in ${frontier.asOf} · ${i + 1}`, '/science', p))
    frontier.stateOfTheArt.forEach((s) =>
      add(`State of the art · ${s.name}`, '/science', `${s.name} (${s.org}). ${s.what}${s.metric ? ` ${s.metric}.` : ''}`),
    )
    frontier.benchmarks.forEach((b) =>
      add(
        `Benchmark · ${b.name}`,
        '/science',
        `On ${b.name} the best published figure is ${b.sota}${b.sotaBy ? ` (${b.sotaBy})` : ''}; this system reaches ${b.project}.`,
      ),
    )
    frontier.upgrades.forEach((u) =>
      add(`Upgrade · ${u.title}`, '/science', `${u.title}. ${u.body} Impact ${u.impact}, effort ${u.effort}.`),
    )
  }

  return out
}

/** Questions worth asking, built from what this project actually documents. */
function starters(project: ProjectApp, frontier: Frontier | null): string[] {
  const q: string[] = [`What problem does ${project.short} solve?`]
  if (project.models[0]) q.push(`Which model does the ${project.models[0].component.toLowerCase()} use?`)
  q.push(`What data was ${project.short} trained on?`)
  if (project.results[0]) q.push(`What is the ${project.results[0].metric.toLowerCase()}?`)
  if (project.api.endpoints[0]) q.push('What does the API expose?')
  q.push('What does the report recommend?')
  if (frontier) q.push('How does this compare with the state of the art?')
  return q.slice(0, 6)
}

/* ── conversation ─────────────────────────────────────────────────────── */

interface Passage {
  source: string
  to: string
  text: string
  score: number
}

interface Msg {
  id: string
  at: string
  role: 'user' | 'assistant'
  /** The question, or the assistant's framing line. */
  text: string
  /** Retrieved evidence, verbatim. */
  passages?: Passage[]
  /** True when nothing cleared the retrieval floor. */
  weak?: boolean
}

/* ── module ───────────────────────────────────────────────────────────── */

export function CopilotModule({ mod }: { mod: ModuleDef }) {
  const { project, frontier } = useSite()
  const { items: stored, save, remove, loading } = useCollection<Msg>('copilot')

  const corpus = useMemo(() => buildCorpus(project, frontier), [project, frontier])
  const questions = useMemo(() => starters(project, frontier), [project, frontier])
  const messages = useMemo(() => [...stored].sort((a, b) => a.at.localeCompare(b.at)), [stored])

  const [gpu, setGpu] = useState<boolean | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [indexed, setIndexed] = useState(0)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [asking, setAsking] = useState(false)
  const [draft, setDraft] = useState('')

  const embedRef = useRef<Embedder | null>(null)
  const vectorsRef = useRef<number[][] | null>(null)
  const aliveRef = useRef(true)
  const logRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
    }
  }, [])

  useEffect(() => {
    let live = true
    void hasWebGPU().then((v) => live && setGpu(v))
    return () => {
      live = false
    }
  }, [])

  // A new question should bring the newest exchange into view.
  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, asking])

  const bytes = gpu ? GPU_BYTES : CPU_BYTES
  const device = gpu ? 'WebGPU · fp16' : 'WebAssembly · 8-bit'

  /** Load the embedder and index the corpus. Nothing downloads until this runs. */
  const build = useCallback(async () => {
    setError(null)
    setReady(false)
    setIndexed(0)
    setProgress({ status: 'init', message: 'Loading runtime…' })
    try {
      const opts = gpu ? { device: 'webgpu', dtype: 'fp16' } : {}
      let pipe: Embedder
      try {
        pipe = await getPipeline<Embedder>('feature-extraction', MODEL, (p) => aliveRef.current && setProgress(p), opts)
      } catch (gpuErr) {
        if (!gpu) throw gpuErr
        // The WebGPU build failed to compile on this machine — the cached entry
        // is already discarded, so asking again gets the WebAssembly build.
        setGpu(false)
        pipe = await getPipeline<Embedder>('feature-extraction', MODEL, (p) => aliveRef.current && setProgress(p))
      }
      embedRef.current = pipe

      const vectors: number[][] = []
      for (let i = 0; i < corpus.length; i += BATCH) {
        if (!aliveRef.current) return
        const batch = corpus.slice(i, i + BATCH)
        const out = await pipe(
          batch.map((c) => `${c.source}. ${c.text}`),
          { pooling: 'mean', normalize: true },
        )
        vectors.push(...out.tolist())
        setIndexed(Math.min(corpus.length, i + batch.length))
      }
      if (!aliveRef.current) return
      vectorsRef.current = vectors
      setReady(true)
      setProgress({ status: 'ready' })
    } catch (e: unknown) {
      if (!aliveRef.current) return
      setProgress(null)
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [corpus, gpu])

  const ask = useCallback(
    async (question: string) => {
      const q = question.trim()
      const pipe = embedRef.current
      const vectors = vectorsRef.current
      if (!q || !pipe || !vectors || asking) return

      setAsking(true)
      setDraft('')
      const now = Date.now()
      const userId = `${now}-q`
      await save(userId, { id: userId, at: new Date(now).toISOString(), role: 'user', text: q })

      try {
        const out = await pipe([q], { pooling: 'mean', normalize: true })
        const qv = out.tolist()[0]
        const ranked = vectors
          .map((v, i) => {
            let dot = 0
            for (let d = 0; d < v.length && d < qv.length; d++) dot += v[d] * qv[d]
            return { i, score: dot }
          })
          .sort((a, b) => b.score - a.score)

        const best = ranked[0]?.score ?? 0
        const kept = ranked
          .slice(0, MAX_PASSAGES)
          .filter((r, idx) => idx < MIN_PASSAGES || r.score >= best * RELATIVE)
        const passages: Passage[] = kept.map((r) => ({
          source: corpus[r.i].source,
          to: corpus[r.i].to,
          text: corpus[r.i].text,
          score: r.score,
        }))

        const weak = best < FLOOR
        const text = weak
          ? `Nothing in ${project.short}'s own documentation matches that closely — the best passage scores ${best.toFixed(2)} cosine similarity, below the ${FLOOR.toFixed(2)} floor this assistant will answer from. Rather than guess, here are the closest sections; the answer may be in one of them, or the question may be outside what this workspace documents.`
          : `${passages.length} passage${passages.length === 1 ? '' : 's'} from ${project.short}'s own model, data and results pages match, the closest at ${best.toFixed(2)} cosine similarity. They are quoted below exactly as written.`

        const aId = `${now}-a`
        await save(aId, {
          id: aId,
          at: new Date(now + 1).toISOString(),
          role: 'assistant',
          text,
          passages: weak ? passages.slice(0, MIN_PASSAGES) : passages,
          weak,
        })
      } catch (e: unknown) {
        const aId = `${now}-a`
        await save(aId, {
          id: aId,
          at: new Date(now + 1).toISOString(),
          role: 'assistant',
          text: `The retrieval model failed on that question: ${e instanceof Error ? e.message : String(e)}`,
          weak: true,
        })
      } finally {
        if (aliveRef.current) setAsking(false)
      }
    },
    [asking, corpus, project.short, save],
  )

  const clear = useCallback(async () => {
    for (const m of stored) await remove(m.id)
  }, [remove, stored])

  const pctDone = progress?.pct ?? (progress?.status === 'ready' ? 100 : 0)
  const indexing = Boolean(progress) && !ready && !error && progress?.status !== 'error'

  if (loading) {
    return (
      <Page mod={mod}>
        <div className="ap-empty" role="status" aria-live="polite">
          <Spinner size="medium" />
          <p>Reading the workspace…</p>
        </div>
      </Page>
    )
  }

  return (
    <Page
      mod={mod}
      sub={`Ask about ${project.short}'s model, data and results. Every answer is retrieved from this site's own pages and cited, and the model that does the retrieval runs in this tab.`}
      actions={
        <>
          {ready && (
            <Button size="small" leadingVisual={TrashIcon} onClick={() => void clear()} disabled={!messages.length}>
              Clear conversation
            </Button>
          )}
        </>
      }
    >
      {/* model status */}
      <section aria-labelledby="cp-model">
        <h2 id="cp-model" style={{ fontSize: 15, margin: '0 0 10px' }}>
          Retrieval model
        </h2>
        <div className="ap-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CpuIcon size={16} /> {MODEL}
              </h3>
              <p>
                Sentence-transformer, 384 dimensions, mean-pooled and L2-normalised · {fmtBytes(bytes)} download ·{' '}
                {gpu === null ? 'checking device…' : device}
              </p>
            </div>
            <div className="ap-badge-row">
              <Label variant="secondary">{corpus.length} passages</Label>
              {ready && <Label variant="success">Indexed</Label>}
              {!ready && !indexing && (
                <Button variant="primary" size="small" leadingVisual={TelescopeIcon} onClick={() => void build()}>
                  Load model &amp; index
                </Button>
              )}
              {error && (
                <Button size="small" leadingVisual={SyncIcon} onClick={() => void build()}>
                  Retry
                </Button>
              )}
            </div>
          </div>

          {indexing && (
            <div style={{ display: 'grid', gap: 6 }} role="status" aria-live="polite">
              <div className="ap-progress">
                <div style={{ width: `${indexed ? Math.round((indexed / corpus.length) * 100) : pctDone}%` }} />
              </div>
              <p>
                {indexed
                  ? `Embedding this site's pages — ${indexed} of ${corpus.length} passages.`
                  : progress?.status === 'download'
                    ? `Downloading the model — ${fmtBytes(progress.loaded)} of ${fmtBytes(progress.total)}${progress.pct != null ? ` (${progress.pct}%)` : ''}.`
                    : (progress?.message ?? 'Starting…')}
              </p>
            </div>
          )}

          {error && (
            <Banner
              variant="critical"
              title="The model could not be loaded"
              description={`${error} The download is roughly ${fmtBytes(bytes)}; check the connection and try again.`}
            />
          )}

          <p style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            <ShieldLockIcon size={14} />
            <span>
              Runs on your device. The model weights are fetched once from the Hugging Face CDN and cached by the browser;
              your questions and this conversation never leave the tab.
            </span>
          </p>
        </div>
      </section>

      {/* conversation */}
      {!ready ? (
        <div className="ap-empty">
          <TelescopeIcon size={24} />
          <h2 style={{ margin: 0, fontSize: 17 }}>The copilot is not loaded yet</h2>
          <p style={{ margin: 0, maxWidth: '56ch' }}>
            It indexes {corpus.length} passages drawn from {project.short}&apos;s summary, problem and solution,{' '}
            {project.features.length} features, {project.models.length} model rows, {project.results.length} results, the{' '}
            {project.dataset.name} dataset, {project.api.endpoints.length} API endpoints and the report
            {frontier ? ', plus the 2026 frontier comparison' : ''}. Nothing downloads until you ask for it.
          </p>
        </div>
      ) : (
        <section className="ap-chat" aria-labelledby="cp-chat">
          <h2 id="cp-chat" className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
            Conversation
          </h2>

          <div className="ap-chat__log" ref={logRef} aria-live="polite" aria-busy={asking}>
            {messages.length === 0 && (
              <div className="ap-msg">
                <span className="ap-msg__who">Copilot</span>
                <div className="ap-msg__body">
                  <p>
                    Ask anything about {project.name}. Answers are assembled from the passages this workspace indexed and
                    every one is linked back to the page it came from — if the corpus does not cover a question, the answer
                    says so instead of inventing one.
                  </p>
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id} className={`ap-msg${m.role === 'user' ? ' ap-msg--me' : ''}`}>
                <span className="ap-msg__who">
                  {m.role === 'user' ? 'You' : 'Copilot'} · {shortDate(m.at)}
                </span>
                <div className="ap-msg__body">
                  <p style={m.role === 'assistant' ? { color: 'var(--fgColor-muted)', fontSize: 13.5 } : undefined}>{m.text}</p>
                  {m.passages?.map((p, i) => (
                    <p key={`${m.id}-p${i}`}>
                      <strong>{p.source}</strong>
                      {' — '}
                      {p.text}
                    </p>
                  ))}
                </div>
                {m.passages && m.passages.length > 0 && (
                  <div className="ap-msg__cite">
                    <span>{m.weak ? 'Closest sections:' : 'Sources:'}</span>
                    {m.passages.map((p, i) => (
                      <Link key={`${m.id}-c${i}`} to={p.to} style={{ color: 'var(--fgColor-accent)' }}>
                        {p.source} ({p.score.toFixed(2)})
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {asking && (
              <div className="ap-msg">
                <span className="ap-msg__who">Copilot</span>
                <div className="ap-msg__body" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Spinner size="small" /> <span>Embedding the question and ranking {corpus.length} passages…</span>
                </div>
              </div>
            )}
          </div>

          {messages.length === 0 && (
            <div className="ap-badge-row" aria-label="Suggested questions">
              {questions.map((q) => (
                <Button key={q} size="small" onClick={() => void ask(q)} disabled={asking}>
                  {q}
                </Button>
              ))}
            </div>
          )}

          <form
            className="ap-composer"
            onSubmit={(e) => {
              e.preventDefault()
              void ask(draft)
            }}
          >
            <div>
              <label htmlFor="cp-q" style={{ fontSize: 12.5, color: 'var(--fgColor-muted)', display: 'block', marginBottom: 4 }}>
                Your question
              </label>
              <Textarea
                id="cp-q"
                block
                rows={2}
                resize="vertical"
                value={draft}
                placeholder={questions[0]}
                disabled={asking}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault()
                    void ask(draft)
                  }
                }}
              />
            </div>
            <Button type="submit" variant="primary" leadingVisual={PaperAirplaneIcon} disabled={asking || !draft.trim()}>
              Ask
            </Button>
          </form>

          <p style={{ margin: 0, color: 'var(--fgColor-muted)', fontSize: 13, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            <InfoIcon size={14} />
            <span>
              Retrieval only — passages are quoted, never paraphrased or summarised by a language model. A question whose
              best match scores below {FLOOR.toFixed(2)} cosine similarity gets the closest sections and an admission that
              the corpus does not cover it. Press Ctrl/Cmd + Enter to send.
            </span>
          </p>
        </section>
      )}
    </Page>
  )
}
