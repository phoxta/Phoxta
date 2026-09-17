import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Spinner } from '@primer/react'
import { loadProject, type Slug } from '@/content/registry'
import type { ProjectApp as ProjectAppData } from '@/content/types'
import { AppContext } from './context'
import type { Resolution } from './resolve'
import { AppShell } from './AppShell'
import { OverviewPage } from './pages/OverviewPage'
import { DashboardPage } from './pages/DashboardPage'
import { ModelPage } from './pages/ModelPage'
import { DataPage } from './pages/DataPage'
import { ApiPage } from './pages/ApiPage'
import { ReportPage } from './pages/ReportPage'

export function ProjectApp({ slug, resolution }: { slug: Slug; resolution: Resolution }) {
  const [app, setApp] = useState<ProjectAppData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    setApp(null)
    loadProject(slug)
      .then((a) => live && setApp(a))
      .catch((e: unknown) => live && setError(e instanceof Error ? e.message : String(e)))
    return () => {
      live = false
    }
  }, [slug])

  if (error) {
    return (
      <div className="fa-loading">
        <p>This app could not be loaded.</p>
        <code>{error}</code>
      </div>
    )
  }
  if (!app) {
    return (
      <div className="fa-loading" role="status" aria-live="polite">
        <Spinner size="medium" />
        <span>Loading app…</span>
      </div>
    )
  }

  return (
    <AppContext.Provider value={{ app, resolution }}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<OverviewPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="model" element={<ModelPage />} />
          <Route path="data" element={<DataPage />} />
          <Route path="api" element={<ApiPage />} />
          <Route path="report" element={<ReportPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AppContext.Provider>
  )
}
