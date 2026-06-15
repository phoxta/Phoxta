// Template: a reusable section block.
// Copy to src/shared/sections/<group>/SectionN.tsx.
// - Inline SVGs as module-level consts.
// - Repeated content goes in a module-level data array, then .map() it.
// - Use <Link> for internal nav; explicit width/height + loading="lazy" on <img>.
// - Open the <section> with vertical padding (e.g. pt-120 pb-120) and a unique class.

import { Link } from "react-router-dom";

const ARROW_SVG = (
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M0.21967 9.40717C-0.0732232 9.70006 -0.0732232 10.1749 0.21967 10.4678C0.512563 10.7607 0.987437 10.7607 1.28033 10.4678L0.21967 9.40717ZM10.6875 0.75C10.6875 0.335786 10.3517 2.97145e-09 9.9375 1.50485e-07L3.1875 -2.70983e-07C2.77329 -2.70983e-07 2.4375 0.335786 2.4375 0.75C2.4375 1.16421 2.77329 1.5 3.1875 1.5H9.1875V7.5C9.1875 7.91421 9.52329 8.25 9.9375 8.25C10.3517 8.25 10.6875 7.91421 10.6875 7.5L10.6875 0.75ZM0.75 9.9375L1.28033 10.4678L10.4678 1.28033L9.9375 0.75L9.40717 0.21967L0.21967 9.40717L0.75 9.9375Z"
      fill="currentColor"
    />
  </svg>
);

type Feature = { title: string; desc: string; img: string };

const FEATURES: Feature[] = [
  { title: "First feature", desc: "Short supporting copy for this item.", img: "/assets/imgs/pages/img-87.webp" },
  { title: "Second feature", desc: "Short supporting copy for this item.", img: "/assets/imgs/pages/img-88.webp" },
  { title: "Third feature", desc: "Short supporting copy for this item.", img: "/assets/imgs/pages/img-172.webp" },
];

export default function Section1() {
  return (
    <section className="sec-name pt-120 pb-120 bg-neutral-0 overflow-hidden">
      <div className="container">
        <div className="row align-items-end pb-60">
          <div className="col-lg-8">
            <span className="d-inline-block mb-10 text-uppercase fz-font-label">[ Section eyebrow ]</span>
            <h2 className="fz-font-3xl fw-500 mb-0">A clear, benefit-led heading</h2>
          </div>
          <div className="col-lg-4 text-lg-end mt-3 mt-lg-0">
            <Link to="/contact-1" className="at-btn text-white rounded-0">
              <span>
                <span className="text-1">GET STARTED</span>
                <span className="text-2">GET STARTED</span>
              </span>
              <i>
                {ARROW_SVG}
                {ARROW_SVG}
              </i>
            </Link>
          </div>
        </div>

        <div className="row g-4">
          {FEATURES.map((item, i) => (
            <div key={i} className="col-lg-4">
              <div className="rounded-3 overflow-hidden">
                <img
                  src={item.img}
                  alt={item.title}
                  width={600}
                  height={400}
                  className="img-cover w-100 h-100"
                  loading="lazy"
                />
              </div>
              <h5 className="fw-600 mt-20 mb-10">{item.title}</h5>
              <p className="fz-font-md neutral-700 mb-0">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
