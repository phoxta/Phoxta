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
// Solutions pages (linked from the nav's Solutions dropdown)
const MarketingSolutionPage = lazy(() => import("@/pages/MarketingSolutionPage")); // /marketing
const AiTechPage = lazy(() => import("@/pages/AiTechPage")); // /ai-tech
const StartupSchoolPage = lazy(() => import("@/pages/StartupSchoolPage")); // /startup-school
const BrandDesignPage = lazy(() => import("@/pages/BrandDesignPage")); // /brand-design
const About2Page = lazy(() => import("@/pages/About2Page"));
const PricingPage = lazy(() => import("@/pages/PricingPage"));
const ProductArchivePage = lazy(() => import("@/pages/ProductArchivePage")); // /marketplace
const BlogPage = lazy(() => import("@/pages/BlogPage")); // /blog (index)
const ArticlePage = lazy(() => import("@/pages/ArticlePage")); // /blog/:slug
const FaqsPage = lazy(() => import("@/pages/FaqsPage"));
const CareersPage = lazy(() => import("@/pages/CareersPage"));
const Contact1Page = lazy(() => import("@/pages/Contact1Page")); // /contact
const PrivacyPage = lazy(() => import("@/pages/PrivacyPage"));
const RatePage = lazy(() => import("@/pages/CustomerActionPage").then((m) => ({ default: m.RatePage })));
const UnsubscribePage = lazy(() => import("@/pages/CustomerActionPage").then((m) => ({ default: m.UnsubscribePage })));
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
const PaymentCallbackPage = lazy(() => import("@/pages/dashboard/PaymentCallbackPage"));
const ConsolePage = lazy(() => import("@/pages/dashboard/ConsolePage"));
const PlatformPage = lazy(() => import("@/pages/dashboard/PlatformPage"));
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
const BookingsPage = lazy(() => import("@/pages/dashboard/ops/BookingsPage"));
const ReservationsPage = lazy(() => import("@/pages/dashboard/ops/ReservationsPage"));
const MarketingPage = lazy(() => import("@/pages/dashboard/ops/MarketingPage"));
const OpsInboxPage = lazy(() => import("@/pages/dashboard/ops/agent/InboxPage"));
const OpsSettingsPage = lazy(() => import("@/pages/dashboard/ops/SettingsPage"));
const OpsPlatformPage = lazy(() => import("@/pages/dashboard/ops/PlatformPage"));
const AgentOverviewPage = lazy(() => import("@/pages/dashboard/ops/agent/AgentOverviewPage"));
const AgentOperatorPage = lazy(() => import("@/pages/dashboard/ops/agent/OperatorPage"));
const AgentConfigurePage = lazy(() => import("@/pages/dashboard/ops/agent/ConfigurePage"));
const AgentKnowledgePage = lazy(() => import("@/pages/dashboard/ops/agent/KnowledgePage"));
const GoogleWorkspacePage = lazy(() => import("@/pages/dashboard/ops/google/GoogleWorkspacePage"));

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
          <Route path="/dashboard/console" element={<ConsolePage />} />
          {/* Phoxta's own operating console — cross-tenant, platform-admin only. */}
          <Route path="/dashboard/platform" element={<PlatformPage />} />
          <Route path="/dashboard/marketplace" element={<MarketplacePage />} />
          <Route path="/dashboard/marketplace/:slug" element={<MarketplaceDetailPage />} />
          <Route path="/dashboard/businesses" element={<BusinessesPage />} />
          <Route path="/dashboard/businesses/:id" element={<BusinessDetailPage />} />
          <Route path="/dashboard/businesses/:id/ops" element={<OperatingLayout />}>
            <Route index element={<OverviewPage />} />
            <Route path="inbox" element={<OpsInboxPage />} />
            <Route path="crm" element={<CrmPage />} />
            {/* Phoxta's own cross-tenant module — admin-gated by the RPCs behind it. */}
            <Route path="platform" element={<OpsPlatformPage />} />
            <Route path="commerce" element={<CommercePage />} />
            <Route path="invoicing" element={<InvoicingPage />} />
            <Route path="bookings" element={<BookingsPage />} />
            <Route path="reservations" element={<ReservationsPage />} />
            <Route path="marketing" element={<MarketingPage />} />
            <Route path="settings" element={<OpsSettingsPage />} />
            {/* Google Workspace lives inside Settings now — the route stays valid
                (Settings links into it) but it's no longer a top-level tab. */}
            <Route path="google" element={<GoogleWorkspacePage />} />
            {/* IA redirects: old tab URLs keep working after the console reshuffle. */}
            <Route path="helpdesk" element={<Navigate to="../inbox" replace />} />
            <Route path="content" element={<Navigate to=".." replace />} />
            <Route path="agent" element={<AgentLayout />}>
              <Route index element={<AgentOverviewPage />} />
              <Route path="operator" element={<AgentOperatorPage />} />
              <Route path="configure" element={<AgentConfigurePage />} />
              <Route path="knowledge" element={<AgentKnowledgePage />} />
              {/* Old agent sub-tabs → their new homes. */}
              <Route path="inbox" element={<Navigate to="../../inbox" replace />} />
              <Route path="snippets" element={<Navigate to="../../inbox" replace />} />
              <Route path="outbound" element={<Navigate to="../../marketing" replace />} />
              <Route path="proactive" element={<Navigate to="../../marketing" replace />} />
              <Route path="call-center" element={<Navigate to="../../settings" replace />} />
              <Route path="test" element={<Navigate to="../configure" replace />} />
            </Route>
          </Route>
          <Route path="/dashboard/billing" element={<BillingPage />} />
          <Route path="/dashboard/payment/callback" element={<PaymentCallbackPage />} />
          <Route path="/dashboard/network" element={<NetworkPage />} />
          <Route path="/dashboard/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      {/* ── Marketing site (public, curated) ───────────────────────────── */}
      <Route element={<MainLayout headerStyle={4} footerStyle={1} noHeader />}>
        <Route path="/" element={<Home1Page />} />
      </Route>
      {/* /invest taken down 2026-08-18 (audit): the page offered securities
          (Growth Notes, APR figures) with no product, KYC, or filings behind
          it — a regulatory liability while indexed. Redirect until a real,
          papered offering exists. */}
      <Route path="/invest" element={<Navigate to="/contact" replace />} />
      {/* Solutions pages (nav → Solutions dropdown) */}
      <Route element={<MainLayout headerStyle={16} footerStyle={1} />}>
        <Route path="/marketing" element={<MarketingSolutionPage />} />
      </Route>
      <Route element={<MainLayout headerStyle={16} footerStyle={1} />}>
        <Route path="/ai-tech" element={<AiTechPage />} />
      </Route>
      <Route element={<MainLayout headerStyle={16} footerStyle={1} headerProps={{ light: true }} />}>
        <Route path="/startup-school" element={<StartupSchoolPage />} />
      </Route>
      <Route element={<MainLayout headerStyle={16} footerStyle={1} headerProps={{ light: true }} />}>
        <Route path="/brand-design" element={<BrandDesignPage />} />
      </Route>
      <Route element={<MainLayout headerStyle={16} footerStyle={1} />}>
        <Route path="/about" element={<About2Page />} />
        <Route path="/marketplace" element={<ProductArchivePage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:slug" element={<ArticlePage />} />
        <Route path="/faqs" element={<FaqsPage />} />
        <Route path="/careers" element={<CareersPage />} />
        <Route path="/contact" element={<Contact1Page />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        {/* Public landing pages for links inside customer messages. */}
        <Route path="/rate" element={<RatePage />} />
        <Route path="/unsubscribe" element={<UnsubscribePage />} />
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
