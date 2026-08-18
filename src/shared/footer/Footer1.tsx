import { Link } from "react-router-dom";

const SOCIAL_ARROW = (
  <svg xmlns="http://www.w3.org/2000/svg" width="9" height="10" viewBox="0 0 9 10" fill="none" aria-hidden="true">
    <path
      d="M5.62494 9.99994L0.562517 10L0.5625 8.75003L4.49994 8.74996L4.5 2.39273L2.27828 4.86124L1.48278 3.97739L5.0625 0L8.64225 3.97739L7.84676 4.86124L5.625 2.3927L5.62494 9.99994Z"
      fill="currentColor"
    />
  </svg>
);

const SOCIAL_LINKS = [
  { label: "X (Twitter)", href: "https://x.com/phoxta" },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/phoxta" },
  { label: "Instagram", href: "https://www.instagram.com/officialphoxta" },
  { label: "YouTube", href: "https://www.youtube.com/phoxta" },
] as const;

export default function Footer1() {
  return (
    <footer className="container-2200">
      <div className="at-footer-area mp-footer-style pt-60 bg-neutral-950 rounded-5 mx-lg-3 mx-2 changeless">
        <div className="container">
          <div className="row g-5">
            <div className="col-xxl-4 col-lg-6">
              <div className="col-xxl-9 col-lg-8 col-12 text-lg-end">
                <h1 className="fz-160 common-white mb-0 text-scale-anim">
                  Phoxta<sup className="fz-80 fw-400">®</sup>
                </h1>
              </div>
            </div>
            <div className="col-xxl-3 col-lg-5 col-md-8 ms-lg-auto text-lg-end">
              <div className="at-footer-title-wrap">
                <h6 className="text-white">
                  <a href="mailto:sales@phoxta.com" className="text-white text-decoration-none">sales@phoxta.com</a>
                </h6>
                <h5 className="text-white text-decoration-underline text-wrap">
                  <a href="mailto:femi@phoxta.com" className="text-white text-decoration-underline">
                    femi@phoxta.com
                  </a>
                </h5>
                <div className="at-footer-widget at-footer-link pt-50">
                  <div className="at-hero-social justify-content-lg-end">
                    {SOCIAL_LINKS.map(({ label, href }) => (
                      <a key={label} href={href} target="_blank" rel="noreferrer">
                        {label}
                        {SOCIAL_ARROW}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="at-about pt-40 pb-60 p-relative">
            <div className="row g-5">
              <div className="col-6 col-md-3">
                <h6 className="text-white fw-600 mb-3">Platform</h6>
                <ul className="list-unstyled d-flex flex-column gap-2 mb-0">
                  <li><Link to="/marketplace" className="text-white text-decoration-none opacity-75">Marketplace</Link></li>
                  <li><Link to="/pricing" className="text-white text-decoration-none opacity-75">Pricing</Link></li>
                  <li><Link to="/faqs" className="text-white text-decoration-none opacity-75">FAQs</Link></li>
                </ul>
              </div>
              <div className="col-6 col-md-3">
                <h6 className="text-white fw-600 mb-3">Solutions</h6>
                <ul className="list-unstyled d-flex flex-column gap-2 mb-0">
                  <li><Link to="/ai-tech" className="text-white text-decoration-none opacity-75">AI &amp; Tech</Link></li>
                  <li><Link to="/marketing" className="text-white text-decoration-none opacity-75">Marketing</Link></li>
                  <li><Link to="/brand-design" className="text-white text-decoration-none opacity-75">Brand Design</Link></li>
                  <li><Link to="/startup-school" className="text-white text-decoration-none opacity-75">Startup School</Link></li>
                </ul>
              </div>
              <div className="col-6 col-md-3">
                <h6 className="text-white fw-600 mb-3">Company</h6>
                <ul className="list-unstyled d-flex flex-column gap-2 mb-0">
                  <li><Link to="/about" className="text-white text-decoration-none opacity-75">About</Link></li>
                  <li><Link to="/blog" className="text-white text-decoration-none opacity-75">Blog</Link></li>
                  <li><Link to="/careers" className="text-white text-decoration-none opacity-75">Careers</Link></li>
                  <li><Link to="/contact" className="text-white text-decoration-none opacity-75">Contact</Link></li>
                </ul>
              </div>
              <div className="col-6 col-md-3">
                <h6 className="text-white fw-600 mb-3">Get started</h6>
                <ul className="list-unstyled d-flex flex-column gap-2 mb-0">
                  <li><Link to="/auth?mode=signup" className="text-white text-decoration-none opacity-75">Create account</Link></li>
                  <li><Link to="/auth" className="text-white text-decoration-none opacity-75">Sign in</Link></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="at-footer-copyright-area at-about-border pt-20 pb-20">
            <div className="row align-items-center g-3">
              <div className="col-lg-2">
                <div className="at-footer-copyright-wrap text">
                  <span className="at-footer-copyright">Phoxta © 2026 
                    <Link to="/privacy" className="neutral-0 opacity-50 fz-font-md text-decoration-none">Privacy</Link>
                    <Link to="/terms" className="neutral-0 opacity-50 fz-font-md text-decoration-none">Terms</Link>
                    
                  </span>
                </div>
              </div>
              <div className="col-lg-2">
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-neutral-0 pt-10" />
    </footer>
  );
}

