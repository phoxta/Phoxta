import { Link } from "react-router-dom";
import "@/styles/phoxta-landing.css";

const PRODUCTS = [
  { label: "Ready-to-launch businesses", to: "/businesses", tone: "businesses" },
  { label: "Phoxta AI-Ops Console", to: "/dashboard", tone: "console" },
  { label: "Phoxta Startup school", to: "/startup-school", tone: "school" },
] as const;

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  );
}

function OpportunityIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="18.5" />
      <g className="phoxta-product-intro-v2__compass-needle">
        <path d="m30.5 16.5-4.2 11-11 4.2 4.2-11 11-4.2Z" />
        <circle cx="23" cy="24" r="1.5" />
      </g>
    </svg>
  );
}

function ControlsIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M11 5v38M24 5v38M37 5v38" />
      <g className="phoxta-product-intro-v2__slider phoxta-product-intro-v2__slider--one">
        <path d="M5 16h12" />
        <circle cx="11" cy="16" r="2.8" />
      </g>
      <g className="phoxta-product-intro-v2__slider phoxta-product-intro-v2__slider--two">
        <path d="M18 31h12" />
        <circle cx="24" cy="31" r="2.8" />
      </g>
      <g className="phoxta-product-intro-v2__slider phoxta-product-intro-v2__slider--three">
        <path d="M31 20h12" />
        <circle cx="37" cy="20" r="2.8" />
      </g>
    </svg>
  );
}

function SchoolIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <g className="phoxta-product-intro-v2__person phoxta-product-intro-v2__person--primary">
        <circle cx="19" cy="16" r="7" />
        <path d="M5.5 42v-4.5A10.5 10.5 0 0 1 16 27h6a10.5 10.5 0 0 1 10.5 10.5V42" />
      </g>
      <g className="phoxta-product-intro-v2__person phoxta-product-intro-v2__person--secondary">
        <path d="M31 9a7 7 0 0 1 0 14" />
        <path d="M35 28.5a10.5 10.5 0 0 1 7.5 10V42" />
      </g>
    </svg>
  );
}

export default function ProductIntroduction() {
  return (
    <section id="how-it-works" className="phoxta-product-intro" aria-labelledby="phoxta-product-heading">
      <div className="phoxta-product-intro-v2">
        <div className="phoxta-product-intro__orbit" aria-hidden="true" />
        <h2 id="phoxta-product-heading" className="phoxta-product-intro-v2__heading">
          Phoxta provides the intelligence, niche-specific innovation, tools, AI infrastructure, and education you need to{" "}
          <strong>start with a competitive edge.</strong>
        </h2>

        <nav className="phoxta-product-intro-v2__products" aria-label="Phoxta products">
          {PRODUCTS.map(({ label, to, tone }) => (
            <Link key={tone} to={to} className={`phoxta-product-intro-v2__product phoxta-product-intro-v2__product--${tone}`}>
              <span className="phoxta-product-intro-v2__product-icon"><ArrowIcon /></span>
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="phoxta-product-intro-v2__base">
          <article className="phoxta-product-intro-v2__feature">
            <span className="phoxta-product-intro-v2__feature-icon phoxta-product-intro-v2__feature-icon--opportunities"><OpportunityIcon /></span>
            <p><strong>240+ opportunities</strong> researched across customer demand, priority markets, regulation and competition.</p>
          </article>

          <article className="phoxta-product-intro-v2__feature">
            <span className="phoxta-product-intro-v2__feature-icon phoxta-product-intro-v2__feature-icon--controls"><ControlsIcon /></span>
            <p><strong>The intelligent control center</strong> that powers your business end-to-end with niche-specific innovation.</p>
          </article>

          <article className="phoxta-product-intro-v2__feature">
            <span className="phoxta-product-intro-v2__feature-icon phoxta-product-intro-v2__feature-icon--school"><SchoolIcon /></span>
            <p>Learn how to identify real customer problems, understand markets, test assumptions, launch and grow.</p>
          </article>
        </div>
      </div>
    </section>
  );
}
