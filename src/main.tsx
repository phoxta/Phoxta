import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import App from "@/App";
import { AuthProvider } from "@/auth/AuthProvider";

// The SPA fallback document is the prerendered home page, and a snapshot taken
// while ScrollSmoother was live bakes its bookkeeping onto <body> — chiefly a
// `height` equal to the home page's full scroll extent. Routes that never create
// a smoother (/auth, /dashboard, /onboarding) render into #root but inherit that
// body height, so they scroll thousands of empty pixels. Clear it before the
// first paint; MainLayout's smoother sets its own height when it initialises.
document.body.style.removeProperty("height");
document.body.style.removeProperty("scroll-behavior");
document.documentElement.style.removeProperty("scroll-behavior");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
    <Analytics />
  </React.StrictMode>,
);
