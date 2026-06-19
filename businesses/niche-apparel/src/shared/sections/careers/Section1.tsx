import { Link } from "react-router-dom";
// Careers Section 1 - Hero (Join the team)

const ARROW_SVG = (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M0.21967 9.40717C-0.0732232 9.70006 -0.0732232 10.1749 0.21967 10.4678C0.512563 10.7607 0.987437 10.7607 1.28033 10.4678L0.21967 9.40717ZM10.6875 0.75C10.6875 0.335786 10.3517 2.97145e-09 9.9375 1.50485e-07L3.1875 -2.70983e-07C2.77329 -2.70983e-07 2.4375 0.335786 2.4375 0.75C2.4375 1.16421 2.77329 1.5 3.1875 1.5H9.1875V7.5C9.1875 7.91421 9.52329 8.25 9.9375 8.25C10.3517 8.25 10.6875 7.91421 10.6875 7.5L10.6875 0.75ZM0.75 9.9375L1.28033 10.4678L10.4678 1.28033L9.9375 0.75L9.40717 0.21967L0.21967 9.40717L0.75 9.9375Z"
            fill="currentColor"
        />
    </svg>
);

export default function Section1() {
    return (
        <section className="sec-careers-hero pt-150 pb-120 bg-neutral-900 overflow-hidden">
            <div className="container">
                <div className="row align-items-end">
                    <div className="col-lg-8">
                        <span className="d-inline-block mb-20 text-uppercase fz-font-label text-white">
                            [ Careers at Phoxta ]
                        </span>
                        <h1 className="fz-ds-1 fw-500 text-white mb-4 lh-1">
                            Build what's next, with people who care about the craft.
                        </h1>
                        <p className="fz-font-lg neutral-300 mb-0">
                            We're a small, senior team shipping AI, data, and product work for ambitious
                            partners. If you like ownership and high standards, we'd love to talk.
                        </p>
                    </div>
                    <div className="col-lg-4 text-lg-end mt-4 mt-lg-0">
                        <Link to="/contact-1" className="at-btn text-white rounded-0">
                            <span>
                                <span className="text-1">GET IN TOUCH</span>
                                <span className="text-2">GET IN TOUCH</span>
                            </span>
                            <i>
                                {ARROW_SVG}
                                {ARROW_SVG}
                            </i>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
