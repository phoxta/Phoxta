import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
// Layouts + the auth guard stay eager (small, shared route wrappers).
import MainLayout from "@/layouts/MainLayout";
import ProtectedRoute from "@/auth/ProtectedRoute";
import DashboardLayout from "@/layouts/DashboardLayout";
import OperatingLayout from "@/layouts/OperatingLayout";
import AgentLayout from "@/layouts/AgentLayout";

// Pages are lazy-loaded so each route ships its own chunk (smaller first load).
// Marketing site — the curated, public Phoxta pages.
const Home1Page = lazy(() => import("@/pages/Home1Page"));
const Home13Page = lazy(() => import("@/pages/Home13Page")); // /invest
// Solutions pages (linked from the nav's Solutions dropdown)
const MarketingSolutionPage = lazy(() => import("@/pages/MarketingSolutionPage")); // /marketing
const AiTechPage = lazy(() => import("@/pages/AiTechPage")); // /ai-tech
const StartupSchoolPage = lazy(() => import("@/pages/StartupSchoolPage")); // /startup-school
const BrandDesignPage = lazy(() => import("@/pages/BrandDesignPage")); // /brand-design
const About2Page = lazy(() => import("@/pages/About2Page"));
const PricingPage = lazy(() => import("@/pages/PricingPage"));
const ProductArchivePage = lazy(() => import("@/pages/ProductArchivePage")); // /marketplace
const BlogDetailsPage = lazy(() => import("@/pages/BlogDetailsPage")); // /blog
const FaqsPage = lazy(() => import("@/pages/FaqsPage"));
const CareersPage = lazy(() => import("@/pages/CareersPage"));
const Contact1Page = lazy(() => import("@/pages/Contact1Page")); // /contact
const PrivacyPage = lazy(() => import("@/pages/PrivacyPage"));
const TermsPage = lazy(() => import("@/pages/TermsPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

// Auth + app
const AuthPage = lazy(() => import("@/pages/AuthPage"));
const OnboardingPage = lazy(() => import("@/pages/OnboardingPage"));
const DashboardHomePage = lazy(() => import("@/pages/dashboard/DashboardHomePage"));
const MarketplacePage = lazy(() => import("@/pages/dashboard/MarketplacePage"));
const MarketplaceDetailPage = lazy(() => import("@/pages/dashboard/MarketplaceDetailPage"));
const BusinessesPage = lazy(() => import("@/pages/dashboard/BusinessesPage"));
const BusinessDetailPage = lazy(() => import("@/pages/dashboard/BusinessDetailPage"));
const BillingPage = lazy(() => import("@/pages/dashboard/BillingPage"));
const NetworkPage = lazy(() => import("@/pages/dashboard/NetworkPage"));
const SettingsPage = lazy(() => import("@/pages/dashboard/SettingsPage"));
const AssistantPage = lazy(() => import("@/pages/dashboard/AssistantPage"));
const StudioPage = lazy(() => import("@/pages/dashboard/StudioPage"));
const StudioEditorPage = lazy(() => import("@/pages/dashboard/StudioEditorPage"));
const StudioPreviewPage = lazy(() => import("@/pages/dashboard/StudioPreviewPage"));
const StudioSiteEditorPage = lazy(() => import("@/pages/dashboard/StudioSiteEditorPage"));
const PublishedPage = lazy(() => import("@/pages/PublishedPage"));
const OverviewPage = lazy(() => import("@/pages/dashboard/ops/OverviewPage"));
const CrmPage = lazy(() => import("@/pages/dashboard/ops/CrmPage"));
const CommercePage = lazy(() => import("@/pages/dashboard/ops/CommercePage"));
const InvoicingPage = lazy(() => import("@/pages/dashboard/ops/InvoicingPage"));
const ContentPage = lazy(() => import("@/pages/dashboard/ops/ContentPage"));
const BookingsPage = lazy(() => import("@/pages/dashboard/ops/BookingsPage"));
const ReservationsPage = lazy(() => import("@/pages/dashboard/ops/ReservationsPage"));
const HelpdeskPage = lazy(() => import("@/pages/dashboard/ops/HelpdeskPage"));
const MarketingPage = lazy(() => import("@/pages/dashboard/ops/MarketingPage"));
const AgentOverviewPage = lazy(() => import("@/pages/dashboard/ops/agent/AgentOverviewPage"));
const AgentOperatorPage = lazy(() => import("@/pages/dashboard/ops/agent/OperatorPage"));
const AgentProactivePage = lazy(() => import("@/pages/dashboard/ops/agent/ProactivePage"));
const AgentConfigurePage = lazy(() => import("@/pages/dashboard/ops/agent/ConfigurePage"));
const AgentKnowledgePage = lazy(() => import("@/pages/dashboard/ops/agent/KnowledgePage"));
const AgentInboxPage = lazy(() => import("@/pages/dashboard/ops/agent/InboxPage"));
const GoogleWorkspacePage = lazy(() => import("@/pages/dashboard/ops/google/GoogleWorkspacePage"));
const AgentSnippetsPage = lazy(() => import("@/pages/dashboard/ops/agent/SnippetsPage"));
const AgentOutboundPage = lazy(() => import("@/pages/dashboard/ops/agent/OutboundPage"));
const AgentCallCenterPage = lazy(() => import("@/pages/dashboard/ops/agent/CallCenterPage"));
const AgentTestPage = lazy(() => import("@/pages/dashboard/ops/agent/TestPage"));

// 301-style redirects from the original template URLs to the clean Phoxta paths,
// so old links / bookmarks / indexed URLs never 404.
const LEGACY_REDIRECTS: [string, string][] = [
  ["/about-1", "/about"], ["/about-2", "/about"], ["/about-3", "/about"],
  ["/contact-1", "/contact"], ["/contact-2", "/contact"],
  ["/product-archive", "/marketplace"],
  ["/blog-details", "/blog"], ["/archive-1", "/blog"],
  ["/team", "/about"], ["/team-details", "/about"],
  ["/services-1", "/about"], ["/services-2", "/about"], ["/services-3", "/about"], ["/services-details", "/about"],
  ["/index-3", "/marketing"], ["/index-4", "/ai-tech"], ["/index-7", "/startup-school"], ["/index-9", "/brand-design"],
  ["/startup-accelerator", "/startup-school"],
];

const RouteFallback = () => (
  <div className="d-flex align-items-center justify-content-center" style={{ minHeight: "60vh" }}>
    <div className="spinner-border text-dark" role="status" aria-label="Loading">
      <span className="visually-hidden">Loading…</span>
    </div>
  </div>
);

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
    <Routes>
      {/* Auth (standalone, no marketing chrome) */}
      <Route path="/auth" element={<AuthPage />} />

      {/* Public storefront for a published Studio page (anon, renders own chrome) */}
      <Route path="/site/:orgId/:slug" element={<PublishedPage />} />

      {/* Dashboard (protected app shell, Supabase-backed) */}
      <Route element={<ProtectedRoute />}>
        <Route path="/onboarding" element={<OnboardingPage />} />
        {/* Studio editor + preview run full-screen (no dashboard chrome / zoom). */}
        <Route path="/studio/:orgId/site" element={<StudioSiteEditorPage />} />
        <Route path="/studio/:orgId/:pageId" element={<StudioEditorPage />} />
        <Route path="/studio/:orgId/:pageId/preview" element={<StudioPreviewPage />} />
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardHomePage />} />
          <Route path="/dashboard/studio" element={<StudioPage />} />
          <Route path="/dashboard/assistant" element={<AssistantPage />} />
          <Route path="/dashboard/marketplace" element={<MarketplacePage />} />
          <Route path="/dashboard/marketplace/:slug" element={<MarketplaceDetailPage />} />
          <Route path="/dashboard/businesses" element={<BusinessesPage />} />
          <Route path="/dashboard/businesses/:id" element={<BusinessDetailPage />} />
          <Route path="/dashboard/businesses/:id/ops" element={<OperatingLayout />}>
            <Route index element={<OverviewPage />} />
            <Route path="crm" element={<CrmPage />} />
            <Route path="commerce" element={<CommercePage />} />
            <Route path="invoicing" element={<InvoicingPage />} />
            <Route path="content" element={<ContentPage />} />
            <Route path="bookings" element={<BookingsPage />} />
            <Route path="reservations" element={<ReservationsPage />} />
            <Route path="helpdesk" element={<HelpdeskPage />} />
            <Route path="marketing" element={<MarketingPage />} />
            <Route path="google" element={<GoogleWorkspacePage />} />
            <Route path="agent" element={<AgentLayout />}>
              <Route index element={<AgentOverviewPage />} />
              <Route path="operator" element={<AgentOperatorPage />} />
              <Route path="proactive" element={<AgentProactivePage />} />
              <Route path="configure" element={<AgentConfigurePage />} />
              <Route path="knowledge" element={<AgentKnowledgePage />} />
              <Route path="inbox" element={<AgentInboxPage />} />
              <Route path="snippets" element={<AgentSnippetsPage />} />
              <Route path="outbound" element={<AgentOutboundPage />} />
              <Route path="call-center" element={<AgentCallCenterPage />} />
              <Route path="test" element={<AgentTestPage />} />
            </Route>
          </Route>
          <Route path="/dashboard/billing" element={<BillingPage />} />
          <Route path="/dashboard/network" element={<NetworkPage />} />
          <Route path="/dashboard/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      {/* ── Marketing site (public, curated) ───────────────────────────── */}
      <Route element={<MainLayout headerStyle={4} footerStyle={1} noHeader />}>
        <Route path="/" element={<Home1Page />} />
      </Route>
      <Route element={<MainLayout headerStyle={16} footerStyle={13} noFooter headerProps={{ light: true }} />}>
        <Route path="/invest" element={<Home13Page />} />
      </Route>
      {/* Solutions pages (nav → Solutions dropdown) */}
      <Route element={<MainLayout headerStyle={16} footerStyle={3} />}>
        <Route path="/marketing" element={<MarketingSolutionPage />} />
      </Route>
      <Route element={<MainLayout headerStyle={16} footerStyle={4} />}>
        <Route path="/ai-tech" element={<AiTechPage />} />
      </Route>
      <Route element={<MainLayout headerStyle={16} footerStyle={7} />}>
        <Route path="/startup-school" element={<StartupSchoolPage />} />
      </Route>
      <Route element={<MainLayout headerStyle={16} footerStyle={9} headerProps={{ light: true }} />}>
        <Route path="/brand-design" element={<BrandDesignPage />} />
      </Route>
      <Route element={<MainLayout headerStyle={16} footerStyle={2} />}>
        <Route path="/about" element={<About2Page />} />
        <Route path="/marketplace" element={<ProductArchivePage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/blog" element={<BlogDetailsPage />} />
        <Route path="/faqs" element={<FaqsPage />} />
        <Route path="/careers" element={<CareersPage />} />
        <Route path="/contact" element={<Contact1Page />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Legacy template URLs → clean Phoxta paths */}
      {LEGACY_REDIRECTS.map(([from, to]) => (
        <Route key={from} path={from} element={<Navigate to={to} replace />} />
      ))}
    </Routes>
    </Suspense>
  );
}
