import { Suspense, lazy, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useSite } from '../context'
import { moduleSpec, type ModuleDef } from './spec'
import { Loading } from '../ProductSite'

const OverviewModule = lazy(() => import('./modules/OverviewModule').then((m) => ({ default: m.OverviewModule })))
const ScoreModule = lazy(() => import('./modules/ScoreModule').then((m) => ({ default: m.ScoreModule })))
const SourcesModule = lazy(() => import('./modules/SourcesModule').then((m) => ({ default: m.SourcesModule })))
const BatchModule = lazy(() => import('./modules/BatchModule').then((m) => ({ default: m.BatchModule })))
const CohortsModule = lazy(() => import('./modules/CohortsModule').then((m) => ({ default: m.CohortsModule })))
const MonitorModule = lazy(() => import('./modules/MonitorModule').then((m) => ({ default: m.MonitorModule })))
const AlertsModule = lazy(() => import('./modules/AlertsModule').then((m) => ({ default: m.AlertsModule })))
const ReportsModule = lazy(() => import('./modules/ReportsModule').then((m) => ({ default: m.ReportsModule })))
const ApiModule = lazy(() => import('./modules/ApiModule').then((m) => ({ default: m.ApiModule })))
const SettingsModule = lazy(() => import('./modules/SettingsModule').then((m) => ({ default: m.SettingsModule })))
const BillingModule = lazy(() => import('./modules/BillingModule').then((m) => ({ default: m.BillingModule })))
const CopilotModule = lazy(() => import('./modules/CopilotModule').then((m) => ({ default: m.CopilotModule })))
const TextLabModule = lazy(() => import('./modules/TextLabModule').then((m) => ({ default: m.TextLabModule })))
const VisionLabModule = lazy(() => import('./modules/VisionLabModule').then((m) => ({ default: m.VisionLabModule })))

function render(mod: ModuleDef) {
  switch (mod.kind) {
    case 'overview': return <OverviewModule mod={mod} />
    case 'score': return <ScoreModule mod={mod} />
    case 'sources': return <SourcesModule mod={mod} />
    case 'batch': return <BatchModule mod={mod} />
    case 'cohorts': return <CohortsModule mod={mod} />
    case 'monitor': return <MonitorModule mod={mod} />
    case 'alerts': return <AlertsModule mod={mod} />
    case 'reports': return <ReportsModule mod={mod} />
    case 'api': return <ApiModule mod={mod} />
    case 'settings': return <SettingsModule mod={mod} />
    case 'billing': return <BillingModule mod={mod} />
    case 'copilot': return <CopilotModule mod={mod} />
    case 'textlab': return <TextLabModule mod={mod} />
    case 'visionlab': return <VisionLabModule mod={mod} />
  }
}

export function ModuleRouter() {
  const site = useSite()
  const { pathname } = useLocation()
  const modules = useMemo(() => moduleSpec(site.project, site.product), [site.project, site.product])
  const seg = pathname.replace(/^\/app\/?/, '').split('/')[0] ?? ''
  const mod = modules.find((m) => m.id === seg) ?? modules[0]
  return <Suspense fallback={<Loading />}>{render(mod)}</Suspense>
}
