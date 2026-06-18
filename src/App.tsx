import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
// Layouts + the auth guard stay eager (small, shared route wrappers).
import MainLayout from "@/layouts/MainLayout";
import ProtectedRoute from "@/auth/ProtectedRoute";
import DashboardLayout from "@/layouts/DashboardLayout";
import OperatingLayout from "@/layouts/OperatingLayout";
import AgentLayout from "@/layouts/AgentLayout";

// Pages are lazy-loaded so each route ships its own chunk (smaller first load).
const About1Page = lazy(() => import("@/pages/About1Page"));
const About2Page = lazy(() => import("@/pages/About2Page"));
const About3Page = lazy(() => import("@/pages/About3Page"));
const Archive1Page = lazy(() => import("@/pages/Archive1Page"));
const Archive2Page = lazy(() => import("@/pages/Archive2Page"));
const Archive3Page = lazy(() => import("@/pages/Archive3Page"));
const Archive4Page = lazy(() => import("@/pages/Archive4Page"));
const BlogDetailsPage = lazy(() => import("@/pages/BlogDetailsPage"));
const CareersPage = lazy(() => import("@/pages/CareersPage"));
const ComingSoonPage = lazy(() => import("@/pages/ComingSoonPage"));
const Contact1Page = lazy(() => import("@/pages/Contact1Page"));
const Contact2Page = lazy(() => import("@/pages/Contact2Page"));
const FaqsPage = lazy(() => import("@/pages/FaqsPage"));
const Home10Page = lazy(() => import("@/pages/Home10Page"));
const Home11Page = lazy(() => import("@/pages/Home11Page"));
const Home12Page = lazy(() => import("@/pages/Home12Page"));
const Home13Page = lazy(() => import("@/pages/Home13Page"));
const Home14Page = lazy(() => import("@/pages/Home14Page"));
const Home15Page = lazy(() => import("@/pages/Home15Page"));
const Home1Page = lazy(() => import("@/pages/Home1Page"));
const Home2Page = lazy(() => import("@/pages/Home2Page"));
const Home3Page = lazy(() => import("@/pages/Home3Page"));
const Home4Page = lazy(() => import("@/pages/Home4Page"));
const Home5Page = lazy(() => import("@/pages/Home5Page"));
const Home6Page = lazy(() => import("@/pages/Home6Page"));
const Home7Page = lazy(() => import("@/pages/Home7Page"));
const Home8Page = lazy(() => import("@/pages/Home8Page"));
const Home9Page = lazy(() => import("@/pages/Home9Page"));
const Portfolio1Page = lazy(() => import("@/pages/Portfolio1Page"));
const Portfolio2Page = lazy(() => import("@/pages/Portfolio2Page"));
const Portfolio3Page = lazy(() => import("@/pages/Portfolio3Page"));
const Portfolio4Page = lazy(() => import("@/pages/Portfolio4Page"));
const Portfolio5Page = lazy(() => import("@/pages/Portfolio5Page"));
const Portfolio6Page = lazy(() => import("@/pages/Portfolio6Page"));
const PortfolioCinemaPage = lazy(() => import("@/pages/PortfolioCinemaPage"));
const PortfolioCurtainPage = lazy(() => import("@/pages/PortfolioCurtainPage"));
const PortfolioDetails1Page = lazy(() => import("@/pages/PortfolioDetails1Page"));
const PortfolioDetails2Page = lazy(() => import("@/pages/PortfolioDetails2Page"));
const PortfolioDetails3Page = lazy(() => import("@/pages/PortfolioDetails3Page"));
const PortfolioDetails4Page = lazy(() => import("@/pages/PortfolioDetails4Page"));
const PortfolioDetails5Page = lazy(() => import("@/pages/PortfolioDetails5Page"));
const PortfolioDetails6Page = lazy(() => import("@/pages/PortfolioDetails6Page"));
const PortfolioHorizontalPage = lazy(() => import("@/pages/PortfolioHorizontalPage"));
const PortfolioSplitPage = lazy(() => import("@/pages/PortfolioSplitPage"));
const PortfolioStackPage = lazy(() => import("@/pages/PortfolioStackPage"));
const PortfolioVistaPage = lazy(() => import("@/pages/PortfolioVistaPage"));
const PortfolioZstackPage = lazy(() => import("@/pages/PortfolioZstackPage"));
const PricingPage = lazy(() => import("@/pages/PricingPage"));
const ProductArchivePage = lazy(() => import("@/pages/ProductArchivePage"));
const ProductCartPage = lazy(() => import("@/pages/ProductCartPage"));
const ProductCheckoutPage = lazy(() => import("@/pages/ProductCheckoutPage"));
const ProductDetailsPage = lazy(() => import("@/pages/ProductDetailsPage"));
const Services1Page = lazy(() => import("@/pages/Services1Page"));
const Services2Page = lazy(() => import("@/pages/Services2Page"));
const Services3Page = lazy(() => import("@/pages/Services3Page"));
const ServicesDetailsPage = lazy(() => import("@/pages/ServicesDetailsPage"));
const TeamDetailsPage = lazy(() => import("@/pages/TeamDetailsPage"));
const TeamPage = lazy(() => import("@/pages/TeamPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));
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
const AgentSnippetsPage = lazy(() => import("@/pages/dashboard/ops/agent/SnippetsPage"));
const AgentOutboundPage = lazy(() => import("@/pages/dashboard/ops/agent/OutboundPage"));
const AgentCallCenterPage = lazy(() => import("@/pages/dashboard/ops/agent/CallCenterPage"));
const AgentTestPage = lazy(() => import("@/pages/dashboard/ops/agent/TestPage"));

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

      <Route element={<MainLayout headerStyle={4} footerStyle={1} noHeader />}>
        <Route path="/" element={<Home1Page />} />
        <Route path="/index-dark" element={<Home1Page />} />
      </Route>
      <Route element={<MainLayout headerStyle={1} footerStyle={1} noFooter />}>
        <Route path="/portfolio-curtain" element={<PortfolioCurtainPage />} />
        <Route path="/portfolio-vista" element={<PortfolioVistaPage />} />
      </Route>
      <Route element={<MainLayout headerStyle={1} footerStyle={2} />}>
        <Route path="/portfolio-details-5" element={<PortfolioDetails5Page />} />
      </Route>
      <Route element={<MainLayout headerStyle={2} footerStyle={1} noFooter />}>
        <Route path="/portfolio-cinema" element={<PortfolioCinemaPage />} />
        <Route path="/portfolio-horizontal" element={<PortfolioHorizontalPage />} />
        <Route path="/portfolio-split" element={<PortfolioSplitPage />} />
        <Route path="/portfolio-stack" element={<PortfolioStackPage />} />
        <Route path="/portfolio-zstack" element={<PortfolioZstackPage />} />
      </Route>
      <Route element={<MainLayout headerStyle={2} footerStyle={2} />}>
        <Route path="/about-1" element={<About1Page />} />
        <Route path="/about-2" element={<About2Page />} />
        <Route path="/about-3" element={<About3Page />} />
        <Route path="/archive-1" element={<Archive1Page />} />
        <Route path="/archive-2" element={<Archive2Page />} />
        <Route path="/archive-3" element={<Archive3Page />} />
        <Route path="/archive-4" element={<Archive4Page />} />
        <Route path="/blog-details" element={<BlogDetailsPage />} />
        <Route path="/careers" element={<CareersPage />} />
        <Route path="/coming-soon" element={<ComingSoonPage />} />
        <Route path="/contact-1" element={<Contact1Page />} />
        <Route path="/contact-2" element={<Contact2Page />} />
        <Route path="/faqs" element={<FaqsPage />} />
        <Route path="/index-2" element={<Home2Page />} />
        <Route path="/index-2-dark" element={<Home2Page />} />
        <Route path="/portfolio-1" element={<Portfolio1Page />} />
        <Route path="/portfolio-2" element={<Portfolio2Page />} />
        <Route path="/portfolio-3" element={<Portfolio3Page />} />
        <Route path="/portfolio-4" element={<Portfolio4Page />} />
        <Route path="/portfolio-5" element={<Portfolio5Page />} />
        <Route path="/portfolio-6" element={<Portfolio6Page />} />
        <Route path="/portfolio-details-1" element={<PortfolioDetails1Page />} />
        <Route path="/portfolio-details-2" element={<PortfolioDetails2Page />} />
        <Route path="/portfolio-details-3" element={<PortfolioDetails3Page />} />
        <Route path="/portfolio-details-4" element={<PortfolioDetails4Page />} />
        <Route path="/portfolio-details-6" element={<PortfolioDetails6Page />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/product-archive" element={<ProductArchivePage />} />
        <Route path="/product-cart" element={<ProductCartPage />} />
        <Route path="/product-checkout" element={<ProductCheckoutPage />} />
        <Route path="/product-details" element={<ProductDetailsPage />} />
        <Route path="/services-1" element={<Services1Page />} />
        <Route path="/services-2" element={<Services2Page />} />
        <Route path="/services-3" element={<Services3Page />} />
        <Route path="/services-details" element={<ServicesDetailsPage />} />
        <Route path="/team" element={<TeamPage />} />
        <Route path="/team-details" element={<TeamDetailsPage />} />
      </Route>
      <Route element={<MainLayout headerStyle={3} footerStyle={3} />}>
        <Route path="/index-3" element={<Home3Page />} />
        <Route path="/index-3-dark" element={<Home3Page />} />
      </Route>
      <Route element={<MainLayout headerStyle={4} footerStyle={4} />}>
        <Route path="/index-4" element={<Home4Page />} />
        <Route path="/index-4-dark" element={<Home4Page />} />
      </Route>
      <Route element={<MainLayout headerStyle={5} footerStyle={5} />}>
        <Route path="/index-5" element={<Home5Page />} />
        <Route path="/index-5-dark" element={<Home5Page />} />
      </Route>
      <Route element={<MainLayout headerStyle={6} footerStyle={6} mainClass="bg-neutral-50" />}>
        <Route path="/index-6" element={<Home6Page />} />
        <Route path="/index-6-dark" element={<Home6Page />} />
      </Route>
      <Route element={<MainLayout headerStyle={7} footerStyle={7} />}>
        <Route path="/index-7" element={<Home7Page />} />
        <Route path="/index-7-dark" element={<Home7Page />} />
      </Route>
      <Route element={<MainLayout headerStyle={8} footerStyle={8} />}>
        <Route path="/index-8" element={<Home8Page />} />
        <Route path="/index-8-dark" element={<Home8Page />} />
      </Route>
      <Route element={<MainLayout headerStyle={9} footerStyle={9} />}>
        <Route path="/index-9" element={<Home9Page />} />
        <Route path="/index-9-dark" element={<Home9Page />} />
      </Route>
      <Route element={<MainLayout headerStyle={10} footerStyle={10} />}>
        <Route path="/index-10" element={<Home10Page />} />
        <Route path="/index-10-dark" element={<Home10Page />} />
      </Route>
      <Route element={<MainLayout headerStyle={11} footerStyle={11} />}>
        <Route path="/index-11" element={<Home11Page />} />
        <Route path="/index-11-dark" element={<Home11Page />} />
      </Route>
      <Route element={<MainLayout headerStyle={12} footerStyle={12} />}>
        <Route path="/index-12" element={<Home12Page />} />
        <Route path="/index-12-dark" element={<Home12Page />} />
      </Route>
      <Route element={<MainLayout headerStyle={13} footerStyle={13} noFooter />}>
        <Route path="/invest" element={<Home13Page />} />
        <Route path="/invest-dark" element={<Home13Page />} />
      </Route>
      <Route element={<MainLayout headerStyle={14} footerStyle={14} />}>
        <Route path="/index-14" element={<Home14Page />} />
        <Route path="/index-14-dark" element={<Home14Page />} />
      </Route>
      <Route element={<MainLayout headerStyle={15} footerStyle={15} />}>
        <Route path="/index-15" element={<Home15Page />} />
        <Route path="/index-15-dark" element={<Home15Page />} />
      </Route>
      <Route element={<MainLayout headerStyle={2} footerStyle={2} />}>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
    </Suspense>
  );
}
