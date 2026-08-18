import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { PROMO } from "@/lib/promo";

// Top-of-site promotion strip. Lives in normal flow at the top of
// #smooth-content (ScrollSmoother-safe — no fixed positioning), and pushes the
// body-level transparent marketing header down via the body class + CSS below.
// The homepage's hero-embedded HeaderNav is nested inside #smooth-wrapper, so
// the `#root > .header-transparent` selector deliberately doesn't touch it.
// Only shown on Phoxta marketing routes — never on tenant sites or the studio.

const PROMO_ROUTES = new Set([
  "/",
  "/marketplace",
  "/pricing",
  "/about",
  "/blog",
  "/faqs",
  "/careers",
  "/contact",
  "/invest",
  "/marketing",
  "/ai-tech",
  "/startup-school",
  "/brand-design",
]);

const DISMISS_KEY = "phoxta-promo-35-dismissed";

const BOLT = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" />
  </svg>
);

export default function PromoBanner() {
  const { pathname } = useLocation();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  const visible = PROMO.active && !dismissed && PROMO_ROUTES.has(pathname);

  // Push the absolute-positioned marketing header below the banner while it shows.
  useEffect(() => {
    document.body.classList.toggle("has-promo-banner", visible);
    return () => document.body.classList.remove("has-promo-banner");
  }, [visible]);

  if (!visible) return null;

  function dismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* storage unavailable — banner just stays for the session */
    }
  }

  return (
    <div className="promo-banner" role="region" aria-label="Limited-time promotion">
      <style>{`
        .promo-banner {
          position: relative;
          z-index: 10;
          min-height: var(--promo-banner-h, 44px);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 8px 44px 8px 16px;
          background: linear-gradient(100deg, #0f0f12 0%, #2b1207 45%, #f0460e 130%);
          background-size: 200% 100%;
          animation: promo-banner-sheen 6s ease-in-out infinite alternate;
          color: #fefefe;
          text-align: center;
        }
        body.has-promo-banner #root > .header-transparent {
          top: var(--promo-banner-h, 44px);
        }
        @keyframes promo-banner-sheen {
          from { background-position: 0% 0; }
          to { background-position: 100% 0; }
        }
        .promo-banner__bolt {
          display: inline-flex;
          color: #ffb45e;
          animation: promo-banner-pulse 1.6s ease-in-out infinite;
        }
        @keyframes promo-banner-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.25); opacity: 0.75; }
        }
        @media (prefers-reduced-motion: reduce) {
          .promo-banner, .promo-banner__bolt { animation: none; }
        }
        .promo-banner__text {
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.01em;
          line-height: 1.35;
        }
        .promo-banner__text strong { font-weight: 700; }
        .promo-banner__cta {
          flex-shrink: 0;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #0f0f12;
          background: #fefefe;
          border-radius: 999px;
          padding: 5px 14px;
          text-decoration: none;
          white-space: nowrap;
          transition: transform 0.15s ease;
        }
        .promo-banner__cta:hover { color: #0f0f12; transform: scale(1.05); }
        .promo-banner__close {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: 0;
          color: #fefefe;
          opacity: 0.7;
          font-size: 18px;
          line-height: 1;
          padding: 6px;
          cursor: pointer;
        }
        .promo-banner__close:hover { opacity: 1; }
        @media (max-width: 767px) {
          .promo-banner__flavor { display: none; }
        }
      `}</style>
      <span className="promo-banner__bolt" aria-hidden="true">
        {BOLT}
      </span>
      <p className="promo-banner__text mb-0">
        <strong>FLASH SALE — 35% OFF every business on the marketplace.</strong>{" "}
        <span className="promo-banner__flavor">
          Own a business that already works, for a price that won&apos;t wait around.
        </span>
      </p>
      <Link to="/marketplace" className="promo-banner__cta">
        Claim yours →
      </Link>
      <button type="button" className="promo-banner__close" onClick={dismiss} aria-label="Dismiss promotion">
        ×
      </button>
    </div>
  );
}
