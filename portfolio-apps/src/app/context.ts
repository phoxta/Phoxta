import { createContext, useContext, useEffect } from 'react'
import type { ProjectApp } from '@/content/types'
import type { Resolution } from './resolve'

export interface AppCtx {
  app: ProjectApp
  resolution: Resolution
}

export const AppContext = createContext<AppCtx | null>(null)

export function useApp(): AppCtx {
  const v = useContext(AppContext)
  if (!v) throw new Error('useApp outside an app')
  return v
}

/** Document title + description per page. */
export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    document.title = title
    if (description) {
      let el = document.querySelector<HTMLMetaElement>('meta[name="description"]')
      if (!el) {
        el = document.createElement('meta')
        el.name = 'description'
        document.head.appendChild(el)
      }
      el.content = description
    }
  }, [title, description])
}

export const media = (slug: string, file: string) => `/media/${slug}/${file}`
