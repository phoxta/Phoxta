import { Link } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import Faq from "@/shared/sections/about-3/Section7";

// Plan prices mirror the in-app billing plans (BillingPage) and the real
// per-plan AI token allowances (MONTHLY_TOKEN_CAP in the backend).
type Plan = {
  name: string;
  price: string;
  cadence: string;
  blurb: string;
  features: string[];
  cta: string;
  to: string;
  featured?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Starter",
    price: "$32",
    cadence: "/mo",
    blurb: "New owners launching their first business.",
    features: [
      "1 business",
      "AI agent across SMS, WhatsApp, email & voice",
      "Full operating console",
      "Storefront on a free Phoxta subdomain",
      "200K AI tokens / month",
      "Email support",
    ],
    cta: "Start free",
    to: "/auth",
  },
  {
    name: "Growth",
    price: "$79",
    cadence: "/mo",
    blurb: "Established businesses ready to scale.",
    features: [
      "Up to 3 businesses",
      "Everything in Starter",
      "Connect your own custom domain",
      "1M AI tokens / month",
      "Proactive automations & briefings",
      "Priority support",
    ],
    cta: "Start free",
    to: "/auth",
    featured: true,
  },
  {
    name: "Scale",
    price: "$179",
    cadence: "/mo",
    blurb: "Multi-business operators and teams.",
    features: [
      "Up to 10 businesses",
      "Everything in Growth",
      "5M AI tokens / month",
      "Outbound & call-center agent",
      "Team seats",
      "Priority support",
    ],
    cta: "Start free",
    to: "/auth",
  },
  {
    name: "Enterprise",
    price: "Custom",
    cadence: "",
    blurb: "Unlimited scale with bespoke needs.",
    features: [
      "Unlimited businesses",
      "Unlimited AI usage",
      "SSO & advanced security",
      "Dedicated success manager",
      "Custom integrations & SLAs",
      "White-glove onboarding",
    ],
    cta: "Contact sales",
    to: "/contact",
  },
];

const CHECK = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: 3 }}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export default function PricingPage() {
  return (
    <>
      <PageMeta
        title="Pricing — Phoxta"
        description="Simple, transparent pricing for owning an AI-powered business on Phoxta. One monthly subscription per account plus a one-time price per business. Start free, cancel anytime."
        path="/pricing"
      />

      <section className="pt-150 pb-80 bg-neutral-50">
        <div className="container">
          <div className="text-center mx-auto mb-5" style={{ maxWidth: 700 }}>
            <h2 className="fw-600 mb-3">Simple, transparent pricing</h2>
            <p className="neutral-500 fz-font-lg mb-0">
              Own an AI-powered business from day one. One monthly subscription per account, plus a one-time
              price for each business you buy. Start with a free trial — cancel anytime.
            </p>
          </div>

          <div className="row g-4 align-items-stretch">
            {PLANS.map((p) => (
              <div className="col-lg-3 col-md-6" key={p.name}>
                <div
                  className={`h-100 d-flex flex-column rounded-4 p-4 ${p.featured ? "bg-neutral-900 text-white" : "bg-neutral-0 border-100"}`}
                  style={p.featured ? { boxShadow: "0 24px 60px -24px rgba(0,0,0,.45)" } : undefined}
                >
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <h5 className={`fw-700 mb-0 ${p.featured ? "text-white" : ""}`}>{p.name}</h5>
                    {p.featured && (
                      <span className="badge bg-white text-dark fw-600" style={{ fontSize: 11 }}>Most popular</span>
                    )}
                  </div>
                  <div className="d-flex align-items-baseline gap-1 my-2">
                    <span className="fw-700" style={{ fontSize: 40, lineHeight: 1 }}>{p.price}</span>
                    {p.cadence && <span className={p.featured ? "text-white opacity-75" : "neutral-500"}>{p.cadence}</span>}
                  </div>
                  <p className={`fz-font-md mb-3 ${p.featured ? "text-white opacity-75" : "neutral-500"}`}>{p.blurb}</p>
                  <ul className="list-unstyled flex-grow-1 mb-4">
                    {p.features.map((f) => (
                      <li key={f} className="d-flex gap-2 mb-2 fz-font-md">
                        {CHECK}
                        <span className={p.featured ? "text-white" : ""}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to={p.to}
                    className={`at-btn w-100 justify-content-center ${p.featured ? "bg-white text-dark" : "bg-dark text-white"}`}
                  >
                    <span>
                      <span className="text-1">{p.cta}</span>
                      <span className="text-2">{p.cta}</span>
                    </span>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center neutral-500 fz-font-md mt-4 mb-0">
            All plans include the AI agent, operating console and your storefront. Each business blueprint has a
            one-time price shown in the <Link to="/marketplace" className="text-decoration-underline">Marketplace</Link>. Prices in USD, billed monthly.
          </p>
        </div>
      </section>

      <Faq />
    </>
  );
}
