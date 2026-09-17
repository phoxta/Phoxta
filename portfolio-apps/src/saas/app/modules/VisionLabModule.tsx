/**
 * Vision lab — real detection models over the customer's own images, on device.
 *
 * Open-vocabulary detection means a new hazard or SKU is a text prompt rather
 * than a retraining cycle, which is the point worth demonstrating. Weights stream
 * from the Hugging Face CDN on first use; the image itself never leaves the page.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Badge, Button, Card, Field, Input, Progress, Range, Segmented, Tag } from '@/ui'
import { DeviceCameraIcon, ImageIcon, PlusIcon, StopIcon, UploadIcon, ZapIcon } from '@primer/octicons-react'
import { useSite } from '../../context'
import { domainOf } from '@/content/domain'
import { withArticle } from '@/saas/marketing/copy'
import { fmtBytes, getPipeline, hasWebGPU, type Progress as Prog } from '@/lib/inference/runtime'
import { media } from '@/app/context'
import type { ModuleDef } from '../spec'
import { Page, useCollection, type ScoredCase } from '../shared'

type Mode = 'open' | 'objects'

const MODELS: Record<Mode, { id: string; task: string; size: string; label: string }> = {
  open: { id: 'Xenova/owlvit-base-patch32', task: 'zero-shot-object-detection', size: '≈150 MB', label: 'Open vocabulary' },
  objects: { id: 'Xenova/yolos-tiny', task: 'object-detection', size: '≈26 MB', label: 'General objects' },
}

const PROMPTS: Record<string, string[]> = {
  ppe: ['hard hat', 'safety vest', 'gloves', 'person'],
  retail: ['empty shelf space', 'product box', 'price label'],
  ergonomics: ['person', 'box', 'trolley'],
  malaria: ['cell', 'parasite'],
  emotion: ['face'],
}

interface Det { label: string; score: number; box: { xmin: number; ymin: number; xmax: number; ymax: number } }

export function VisionLabModule({ mod }: { mod: ModuleDef }) {
  const { project } = useSite()
  const d = domainOf(project.slug)
  const [mode, setMode] = useState<Mode>('open')
  const [prompts, setPrompts] = useState<string[]>(PROMPTS[project.slug] ?? ['person'])
  const [newPrompt, setNewPrompt] = useState('')
  const [src, setSrc] = useState<string | null>(null)
  const [dets, setDets] = useState<Det[]>([])
  const [threshold, setThreshold] = useState(0.15)
  const [busy, setBusy] = useState(false)
  const [ms, setMs] = useState<number | null>(null)
  const [gpu, setGpu] = useState(false)
  const [prog, setProg] = useState<Prog | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [over, setOver] = useState(false)
  const [camera, setCamera] = useState(false)

  const imgRef = useRef<HTMLImageElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const { save } = useCollection<ScoredCase>('cases')

  useEffect(() => { void hasWebGPU().then(setGpu) }, [])
  useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()) }, [])

  const sample = project.screenshots.find((s) => !/^00_/.test(s.file))?.file

  const draw = useCallback((list: Det[]) => {
    const canvas = canvasRef.current
    const host = camera ? videoRef.current : imgRef.current
    if (!canvas || !host) return
    const w = host.clientWidth
    const h = host.clientHeight
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, w, h)
    ctx.lineWidth = 2
    ctx.font = '600 12px Inter, system-ui, sans-serif'
    for (const dt of list) {
      const x = dt.box.xmin * w
      const y = dt.box.ymin * h
      const bw = (dt.box.xmax - dt.box.xmin) * w
      const bh = (dt.box.ymax - dt.box.ymin) * h
      ctx.strokeStyle = '#7f56d9'
      ctx.strokeRect(x, y, bw, bh)
      const text = `${dt.label} ${(dt.score * 100).toFixed(0)}%`
      const tw = ctx.measureText(text).width + 10
      ctx.fillStyle = '#7f56d9'
      ctx.fillRect(x, Math.max(0, y - 20), tw, 20)
      ctx.fillStyle = '#fff'
      ctx.fillText(text, x + 5, Math.max(13, y - 6))
    }
  }, [camera])

  const run = useCallback(async () => {
    const host = camera ? videoRef.current : imgRef.current
    if (!host) return
    setBusy(true); setError(null)
    try {
      const model = MODELS[mode]
      type Pipe = (input: string | HTMLElement, opts?: unknown) => Promise<unknown>
      const pipe = await getPipeline<Pipe>(model.task, model.id, setProg)
      let input: string | HTMLElement = host
      if (camera && videoRef.current) {
        const c = document.createElement('canvas')
        c.width = videoRef.current.videoWidth
        c.height = videoRef.current.videoHeight
        c.getContext('2d')?.drawImage(videoRef.current, 0, 0)
        input = c.toDataURL('image/jpeg', 0.9)
      } else if (imgRef.current) {
        input = imgRef.current.src
      }
      const t0 = performance.now()
      const raw = mode === 'open'
        ? await pipe(input, { candidate_labels: prompts, threshold })
        : await pipe(input, { threshold })
      setMs(Math.round(performance.now() - t0))
      const host2 = camera ? videoRef.current : imgRef.current
      const iw = camera ? (videoRef.current?.videoWidth ?? 1) : (imgRef.current?.naturalWidth ?? 1)
      const ih = camera ? (videoRef.current?.videoHeight ?? 1) : (imgRef.current?.naturalHeight ?? 1)
      void host2
      const list = (raw as { label: string; score: number; box: { xmin: number; ymin: number; xmax: number; ymax: number } }[])
        .filter((r) => r.score >= threshold)
        .map((r) => ({
          label: r.label,
          score: r.score,
          // owlvit returns pixels, yolos returns pixels too; normalise against the source.
          box: {
            xmin: r.box.xmin / (r.box.xmax > 1 ? iw : 1),
            ymin: r.box.ymin / (r.box.ymax > 1 ? ih : 1),
            xmax: r.box.xmax / (r.box.xmax > 1 ? iw : 1),
            ymax: r.box.ymax / (r.box.ymax > 1 ? ih : 1),
          },
        }))
      setDets(list)
      draw(list)
      const id = crypto.randomUUID()
      await save(id, {
        id, at: new Date().toISOString(), source: 'lab',
        label: `${d.unit} capture · ${list.length} detections`,
        score: list.length ? Math.max(...list.map((x) => x.score)) : 0,
        verdict: list.length ? `${list.length} found` : 'nothing found',
        tone: list.length ? 'accent' : 'default',
        inputs: { mode, prompts: prompts.join(', ') },
        reasons: list.slice(0, 5).map((x) => ({ label: x.label, weight: x.score })),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false); setProg(null)
    }
  }, [mode, prompts, threshold, camera, draw, save, d.unit])

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play() }
      setCamera(true); setSrc(null); setDets([])
    } catch {
      setError('Camera access was refused. Upload an image instead.')
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCamera(false)
  }

  return (
    <Page mod={mod}>
      <Alert tone="info" title="The image never leaves this device">
        Weights ({MODELS[mode].size}) download once from the Hugging Face CDN and the browser caches them. Detection runs
        locally{gpu ? ' on your GPU via WebGPU' : ' on the CPU'}.
      </Alert>

      {(project.slug === 'malaria' || project.slug === 'emotion') && (
        <Alert tone="warning" title="Demonstration only">
          {project.slug === 'malaria'
            ? 'This shows the detection pipeline, not a diagnosis. Clinical use requires a regulated device.'
            : 'Expression measurement here is for consented research only. The EU AI Act prohibits emotion inference in workplace and education settings.'}
        </Alert>
      )}

      <div className="u-row">
        <Segmented<Mode>
          label="Detector"
          value={mode}
          onChange={(m) => { setMode(m); setDets([]) }}
          options={[{ value: 'open', label: 'Open vocabulary' }, { value: 'objects', label: 'General objects' }]}
        />
        <span className="u-spacer" />
        <Tag>{MODELS[mode].id}</Tag>
        {gpu && <Badge tone="success" dot>WebGPU</Badge>}
      </div>

      {mode === 'open' && (
        <Card>
          <h3 className="u-card__title">What to look for</h3>
          <p className="u-card__body">Add a phrase and the model looks for it. No retraining, no labelling.</p>
          <div className="u-row u-row--tight">
            {prompts.map((pr) => (
              <button key={pr} type="button" className="u-tag" onClick={() => setPrompts(prompts.filter((x) => x !== pr))} title={`Remove ${pr}`}>
                {pr} ×
              </button>
            ))}
          </div>
          <div className="u-row">
            <Input small placeholder="e.g. missing guard rail" value={newPrompt} onChange={(e) => setNewPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && newPrompt.trim()) { setPrompts([...prompts, newPrompt.trim()]); setNewPrompt('') } }}
              style={{ maxWidth: 260 }} />
            <Button size="sm" leadingIcon={PlusIcon} onClick={() => { if (newPrompt.trim()) { setPrompts([...prompts, newPrompt.trim()]); setNewPrompt('') } }}>Add</Button>
          </div>
        </Card>
      )}

      <div className="u-split u-split--wide-left">
        <div className="u-stack">
          {camera ? (
            <div className="ap-cam">
              <video ref={videoRef} playsInline muted />
              <canvas ref={canvasRef} className="overlay" />
            </div>
          ) : src ? (
            <div className="ap-cam">
              <img ref={imgRef} src={src} alt="The image being analysed" onLoad={() => draw(dets)} />
              <canvas ref={canvasRef} className="overlay" />
            </div>
          ) : (
            <div
              className="ax-drop"
              data-over={over}
              role="button"
              tabIndex={0}
              onClick={() => fileRef.current?.click()}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click() }}
              onDragOver={(e) => { e.preventDefault(); setOver(true) }}
              onDragLeave={() => setOver(false)}
              onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) setSrc(URL.createObjectURL(f)) }}
            >
              <ImageIcon size={26} />
              <strong style={{ color: 'var(--text-primary)' }}>Drop an image of {withArticle(d.unit)}</strong>
              <span className="u-text-sm">or use a sample, or your camera</span>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) { stopCamera(); setSrc(URL.createObjectURL(f)); setDets([]) } }} />

          <div className="u-row">
            <Button variant="primary" leadingIcon={ZapIcon} loading={busy} onClick={() => void run()} disabled={!src && !camera}>
              {busy ? 'Analysing…' : 'Analyse'}
            </Button>
            <Button leadingIcon={UploadIcon} onClick={() => fileRef.current?.click()}>Upload</Button>
            {sample && <Button onClick={() => { stopCamera(); setSrc(media(project.slug, sample)); setDets([]) }}>Use a sample</Button>}
            {camera
              ? <Button variant="danger" leadingIcon={StopIcon} onClick={stopCamera}>Stop camera</Button>
              : <Button leadingIcon={DeviceCameraIcon} onClick={() => void startCamera()}>Camera</Button>}
          </div>

          {prog && prog.status === 'download' && (
            <div className="u-stack" style={{ gap: 'var(--space-2)' }} aria-live="polite">
              <span className="u-text-sm u-muted">Downloading the model — {fmtBytes(prog.loaded)} of {fmtBytes(prog.total)}</span>
              <Progress value={prog.pct ?? 0} label="Model download" />
            </div>
          )}
          {error && <Alert tone="error" title="The model could not run" onDismiss={() => setError(null)}>{error}</Alert>}
        </div>

        <div className="u-stack">
          <Card>
            <Field label={`Confidence threshold — ${(threshold * 100).toFixed(0)}%`} hint="Lower finds more and is noisier.">
              {(p) => <Range {...p} min={0.05} max={0.9} step={0.05} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} />}
            </Field>
            {ms != null && <p className="u-text-sm u-quiet">Inference took {ms} ms on this device.</p>}
          </Card>

          <Card>
            <h3 className="u-card__title">Detections</h3>
            {dets.length === 0 ? (
              <p className="u-card__body">Nothing yet. Pick an image and run the model.</p>
            ) : (
              <div className="u-stack" style={{ gap: 'var(--space-2)' }}>
                {dets.map((dt, i) => (
                  <div key={i} className="vg__reason">
                    <span>{dt.label}</span>
                    <span className="vg__rbar"><i className="vg__pos" style={{ left: 0, width: `${dt.score * 100}%` }} /></span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </Page>
  )
}
