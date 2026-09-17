/**
 * Shared pieces for the application modules: page frame, the workspace record
 * types every module reads and writes, and CSV helpers.
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useSite } from '../context'
import { useAuth } from '../auth'
import * as store from '../store'
import type { ModuleDef } from './spec'

export function Page({ mod, actions, children, sub }: { mod: ModuleDef; actions?: ReactNode; children: ReactNode; sub?: string }) {
  return (
    <div className="ap-page">
      <div className="ap-page__head">
        <div>
          <h1>{mod.title}</h1>
          <p>{sub ?? mod.description}</p>
        </div>
        {actions && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div>}
      </div>
      {children}
    </div>
  )
}

/** One scored case, however it was produced. */
export interface ScoredCase {
  id: string
  at: string
  source: 'single' | 'batch' | 'lab'
  label: string
  score: number
  verdict: string
  tone: string
  inputs: Record<string, number | string>
  reasons: { label: string; weight: number }[]
  batchId?: string
}

export interface BatchRun {
  id: string
  at: string
  name: string
  rows: number
  scored: number
  meanScore: number
  highRisk: number
  columns: string[]
  model: string
}

export interface AlertRule {
  id: string
  name: string
  field: 'score'
  op: '>' | '<'
  value: number
  channel: 'inbox' | 'email' | 'webhook'
  active: boolean
}

/** Reads and writes a collection in the product's local workspace. */
export function useCollection<T>(collection: string) {
  const { project } = useSite()
  const { account } = useAuth()
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const key = account?.id ?? null

  const refresh = useCallback(async () => {
    const rows = await store.list<T>(project.slug, key, collection)
    setItems(rows.map((r) => r.value))
    setLoading(false)
  }, [project.slug, key, collection])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const save = useCallback(
    async (id: string, value: T) => {
      await store.put(project.slug, key, collection, id, value)
      await refresh()
    },
    [project.slug, key, collection, refresh],
  )

  const remove = useCallback(
    async (id: string) => {
      await store.remove(project.slug, key, collection, id)
      await refresh()
    },
    [project.slug, key, collection, refresh],
  )

  return { items, loading, save, remove, refresh }
}

/* ── CSV ─────────────────────────────────────────────────────────────────── */

export function parseCsv(text: string): { columns: string[]; rows: Record<string, string>[] } {
  const out: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++ } else quoted = false
      } else cell += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell); cell = ''
      if (row.some((v) => v !== '')) out.push(row)
      row = []
    } else cell += c
  }
  row.push(cell)
  if (row.some((v) => v !== '')) out.push(row)
  if (!out.length) return { columns: [], rows: [] }
  const columns = out[0].map((h) => h.trim())
  const rows = out.slice(1).map((r) => Object.fromEntries(columns.map((c, i) => [c, (r[i] ?? '').trim()])))
  return { columns, rows }
}

export function toCsv(columns: string[], rows: Record<string, unknown>[]): string {
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [columns.join(','), ...rows.map((r) => columns.map((c) => esc(r[c])).join(','))].join('\n')
}

export function download(name: string, content: string, type = 'text/csv') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const pct = (n: number) => `${(n * 100).toFixed(1)}%`
export const shortDate = (iso: string) => new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
