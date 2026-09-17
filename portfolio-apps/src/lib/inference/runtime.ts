/**
 * Lazy, cached access to Transformers.js pipelines. The library (~1 MB) and the
 * ONNX runtime are only downloaded when a lab first asks for a model, models
 * stream from the Hugging Face Hub and are cached by the browser.
 */
import type { pipeline as PipelineFn } from '@huggingface/transformers'

export type Progress = { status: 'init' | 'download' | 'ready' | 'error'; file?: string; loaded?: number; total?: number; pct?: number; message?: string }
type ProgressCb = (p: Progress) => void

let lib: Promise<typeof import('@huggingface/transformers')> | null = null

export function loadTransformers() {
  if (!lib) {
    lib = import('@huggingface/transformers').then((m) => {
      m.env.allowLocalModels = false
      m.env.useBrowserCache = true
      // Serve the WASM runtime from this origin so the CSP stays 'self'.
      const wasm = m.env.backends.onnx.wasm
      if (wasm) {
        wasm.wasmPaths = `${window.location.origin}/ort/`
      }
      return m
    })
  }
  return lib
}

const pipes = new Map<string, Promise<unknown>>()

export async function hasWebGPU(): Promise<boolean> {
  try {
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu
    if (!gpu) return false
    return !!(await gpu.requestAdapter())
  } catch {
    return false
  }
}

/** Returns a cached pipeline for (task, model). */
export async function getPipeline<T = unknown>(task: string, model: string, onProgress?: ProgressCb, options: Record<string, unknown> = {}): Promise<T> {
  const key = `${task}::${model}`
  let p = pipes.get(key)
  if (!p) {
    p = (async () => {
      onProgress?.({ status: 'init', message: 'Loading runtime…' })
      const { pipeline } = await loadTransformers()
      const files = new Map<string, { loaded: number; total: number }>()
      const progress_callback = (ev: { status: string; file?: string; loaded?: number; total?: number; progress?: number }) => {
        if (ev.status === 'progress' && ev.file) {
          files.set(ev.file, { loaded: ev.loaded ?? 0, total: ev.total ?? 0 })
          let loaded = 0, total = 0
          for (const f of files.values()) { loaded += f.loaded; total += f.total }
          onProgress?.({ status: 'download', file: ev.file, loaded, total, pct: total ? Math.round((loaded / total) * 100) : undefined })
        } else if (ev.status === 'ready') {
          onProgress?.({ status: 'ready' })
        }
      }
      const pipe = await (pipeline as typeof PipelineFn)(task as never, model, { progress_callback, ...options } as never)
      onProgress?.({ status: 'ready' })
      return pipe
    })().catch((e: unknown) => {
      pipes.delete(key)
      onProgress?.({ status: 'error', message: e instanceof Error ? e.message : String(e) })
      throw e
    })
    pipes.set(key, p)
  }
  return p as Promise<T>
}

export function fmtBytes(n?: number) {
  if (!n) return ''
  if (n > 1e9) return `${(n / 1e9).toFixed(2)} GB`
  if (n > 1e6) return `${(n / 1e6).toFixed(0)} MB`
  return `${(n / 1e3).toFixed(0)} kB`
}
