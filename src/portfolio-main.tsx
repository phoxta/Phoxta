/* eslint-disable react-refresh/only-export-components -- app entry, not a component module */
// Entry for femi.phoxta.com (portfolio.html). Only the portfolio's own code
// ships here — no marketing chrome, no auth provider, no Supabase client — so
// the page carries a fraction of the main SPA's payload.
import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import PortfolioLayout from "@/layouts/PortfolioLayout";
import PortfolioPage from "@/pages/portfolio/PortfolioPage";
import ProjectPage from "@/pages/portfolio/ProjectPage";

// On the portfolio host the site lives at the root; everywhere else (previews,
// prerendering on localhost, www.phoxta.com/portfolio) it lives under /portfolio.
const PORTFOLIO_HOSTS = new Set(["femi.phoxta.com", "femi.localhost"]);
const atRoot = (() => {
    try {
        return PORTFOLIO_HOSTS.has(window.location.hostname);
    } catch {
        return false;
    }
})();
const home = atRoot ? "/" : "/portfolio";

function PortfolioApp() {
    return (
        <Suspense fallback={null}>
            <Routes>
                <Route element={<PortfolioLayout />}>
                    <Route path="/" element={<PortfolioPage />} />
                    <Route path="/work/:slug" element={<ProjectPage />} />
                    <Route path="/portfolio" element={<PortfolioPage />} />
                    <Route path="/portfolio/work/:slug" element={<ProjectPage />} />
                    <Route path="*" element={<Navigate to={home} replace />} />
                </Route>
            </Routes>
        </Suspense>
    );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <BrowserRouter>
            <PortfolioApp />
        </BrowserRouter>
        <Analytics />
    </React.StrictMode>,
);
