/**
 * One product = a marketing site, an auth flow, a signed-in application, and
 * the engineering record behind it. Everything is code-split per surface so a
 * visitor landing on the marketing page never downloads the app bundle.
 */
import { Suspense, lazy, useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Spinner } from '@primer/react'
import { loadFrontier, loadProduct, loadProject, type Slug } from '@/content/registry'
import type { ProjectApp } from '@/content/types'
import type { Product } from '@/content/product'
import type { Frontier } from '@/content/frontier'
import { AppContext } from '@/app/context'
import type { Resolution } from '@/app/resolve'
import { SiteContext } from './context'
import { AuthProvider } from './auth'

const MarketingLayout = lazy(() => import('./marketing/MarketingLayout').then((m) => ({ default: m.MarketingLayout })))
const HomePage = lazy(() => import('./marketing/HomePage').then((m) => ({ default: m.HomePage })))
const FeaturesPage = lazy(() => import('./marketing/FeaturesPage').then((m) => ({ default: m.FeaturesPage })))
const SolutionsPage = lazy(() => import('./marketing/SolutionsPage').then((m) => ({ default: m.SolutionsPage })))
const PricingPage = lazy(() => import('./marketing/PricingPage').then((m) => ({ default: m.PricingPage })))
const SecurityPage = lazy(() => import('./marketing/SecurityPage').then((m) => ({ default: m.SecurityPage })))
const DocsPage = lazy(() => import('./marketing/DocsPage').then((m) => ({ default: m.DocsPage })))
const CompanyPage = lazy(() => import('./marketing/CompanyPage').then((m) => ({ default: m.CompanyPage })))
const LegalPage = lazy(() => import('./marketing/LegalPage').then((m) => ({ default: m.LegalPage })))
const SciencePage = lazy(() => import('./marketing/SciencePage').then((m) => ({ default: m.SciencePage })))

const AuthLayout = lazy(() => import('./auth/AuthLayout').then((m) => ({ default: m.AuthLayout })))
const SignInPage = lazy(() => import('./auth/SignInPage').then((m) => ({ default: m.SignInPage })))
const SignUpPage = lazy(() => import('./auth/SignUpPage').then((m) => ({ default: m.SignUpPage })))
const ForgotPage = lazy(() => import('./auth/ForgotPage').then((m) => ({ default: m.ForgotPage })))

const AppLayout = lazy(() => import('./app/AppLayout').then((m) => ({ default: m.AppLayout })))
const ModuleRouter = lazy(() => import('./app/ModuleRouter').then((m) => ({ default: m.ModuleRouter })))

const ResearchShell = lazy(() => import('@/app/AppShell').then((m) => ({ default: m.AppShell })))
const OverviewPage = lazy(() => import('@/app/pages/OverviewPage').then((m) => ({ default: m.OverviewPage })))
const DashboardPage = lazy(() => import('@/app/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const ModelPage = lazy(() => import('@/app/pages/ModelPage').then((m) => ({ default: m.ModelPage })))
const DataPage = lazy(() => import('@/app/pages/DataPage').then((m) => ({ default: m.DataPage })))
const ApiPage = lazy(() => import('@/app/pages/ApiPage').then((m) => ({ default: m.ApiPage })))
const ReportPage = lazy(() => import('@/app/pages/ReportPage').then((m) => ({ default: m.ReportPage })))

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="fa-loading" role="status" aria-live="polite">
      <Spinner size="medium" />
      <span>{label}</span>
    </div>
  )
}

export function ProductSite({ slug, resolution }: { slug: Slug; resolution: Resolution }) {
  const [project, setProject] = useState<ProjectApp | null>(null)
  const [product, setProduct] = useState<Product | null>(null)
  const [frontier, setFrontier] = useState<Frontier | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    setProject(null)
    loadProject(slug)
      .then((p) => live && setProject(p))
      .catch((e: unknown) => live && setError(e instanceof Error ? e.message : String(e)))
    loadProduct<Product>(slug).then((p) => live && setProduct(p))
    loadFrontier<Frontier>(slug).then((f) => live && setFrontier(f))
    return () => {
      live = false
    }
  }, [slug])

  if (error) {
    return (
      <div className="fa-loading">
        <p>This product could not be loaded.</p>
        <code>{error}</code>
      </div>
    )
  }
  if (!project) return <Loading label="Loading product…" />

  return (
    <AuthProvider>
      <SiteContext.Provider value={{ project, product, frontier, resolution }}>
        <AppContext.Provider value={{ app: project, resolution }}>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route element={<MarketingLayout />}>
                <Route index element={<HomePage />} />
                <Route path="product" element={<FeaturesPage />} />
                <Route path="solutions" element={<SolutionsPage />} />
                <Route path="solutions/:persona" element={<SolutionsPage />} />
                <Route path="pricing" element={<PricingPage />} />
                <Route path="security" element={<SecurityPage />} />
                <Route path="docs" element={<DocsPage />} />
                <Route path="science" element={<SciencePage />} />
                <Route path="company" element={<CompanyPage />} />
                <Route path="contact" element={<CompanyPage />} />
                <Route path="legal" element={<Navigate to="privacy" replace />} />
                <Route path="legal/:doc" element={<LegalPage />} />
              </Route>

              <Route element={<AuthLayout />}>
                <Route path="signin" element={<SignInPage />} />
                <Route path="signup" element={<SignUpPage />} />
                <Route path="forgot" element={<ForgotPage />} />
              </Route>

              <Route path="app/*" element={<AppLayout />}>
                <Route path="*" element={<ModuleRouter />} />
              </Route>

              <Route path="research" element={<ResearchShell />}>
                <Route index element={<OverviewPage />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="model" element={<ModelPage />} />
                <Route path="data" element={<DataPage />} />
                <Route path="api" element={<ApiPage />} />
                <Route path="report" element={<ReportPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AppContext.Provider>
      </SiteContext.Provider>
    </AuthProvider>
  )
}
