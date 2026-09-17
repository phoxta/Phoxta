import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type ColorMode = 'light' | 'dark' | 'auto'
export type Resolved = 'light' | 'dark'

const KEY = 'femi-apps-theme'

function readStored(): ColorMode {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'auto'
  } catch {
    return 'auto'
  }
}

function systemDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

interface ThemeCtx {
  mode: ColorMode
  resolved: Resolved
  setMode: (m: ColorMode) => void
  toggle: () => void
}

const Ctx = createContext<ThemeCtx | null>(null)

export function ColorModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ColorMode>(readStored)
  const [sysDark, setSysDark] = useState(systemDark)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const on = (e: MediaQueryListEvent) => setSysDark(e.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  const resolved: Resolved = mode === 'auto' ? (sysDark ? 'dark' : 'light') : mode

  useEffect(() => {
    const el = document.documentElement
    el.setAttribute('data-color-mode', resolved)
    el.setAttribute('data-light-theme', 'light')
    el.setAttribute('data-dark-theme', 'dark')
    el.style.colorScheme = resolved
    el.style.backgroundColor = resolved === 'dark' ? '#0d1117' : '#ffffff'
  }, [resolved])

  const setMode = useCallback((m: ColorMode) => {
    setModeState(m)
    try {
      if (m === 'auto') localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, m)
    } catch {
      /* private mode etc. */
    }
  }, [])

  const toggle = useCallback(() => setMode(resolved === 'dark' ? 'light' : 'dark'), [resolved, setMode])

  const value = useMemo(() => ({ mode, resolved, setMode, toggle }), [mode, resolved, setMode, toggle])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useColorMode(): ThemeCtx {
  const v = useContext(Ctx)
  if (!v) throw new Error('useColorMode outside ColorModeProvider')
  return v
}
