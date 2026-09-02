import { PROFILE, SOCIALS } from "@/shared/portfolio/portfolioData";

const ARROW_SVG = (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M0.21967 9.40717C-0.0732232 9.70006 -0.0732232 10.1749 0.21967 10.4678C0.512563 10.7607 0.987437 10.7607 1.28033 10.4678L0.21967 9.40717ZM10.6875 0.75C10.6875 0.335786 10.3517 2.97145e-09 9.9375 1.50485e-07L3.1875 -2.70983e-07C2.77329 -2.70983e-07 2.4375 0.335786 2.4375 0.75C2.4375 1.16421 2.77329 1.5 3.1875 1.5H9.1875V7.5C9.1875 7.91421 9.52329 8.25 9.9375 8.25C10.3517 8.25 10.6875 7.91421 10.6875 7.5L10.6875 0.75ZM0.75 9.9375L1.28033 10.4678L10.4678 1.28033L9.9375 0.75L9.40717 0.21967L0.21967 9.40717L0.75 9.9375Z" fill="currentColor" />
    </svg>
);

export default function Contact() {
    const socials = SOCIALS.filter((s) => s.href);
    return (
        <section id="contact" className="pf-contact bg-neutral-950 text-white overflow-hidden pt-120 pb-120">
            <div className="container-2200 px-3 px-lg-4 text-center">
                <span className="pf-eyebrow pf-eyebrow--light mx-auto"><span className="pf-eyebrow__dot" aria-hidden="true" />Contact</span>
                <h2 className="pf-contact__title fz-120 fw-600 lh-1 mt-30 mb-0">
                    Let's build something <br /><span className="pf-accent-word">worth shipping.</span>
                </h2>
                <p className="pf-contact__lede fz-font-lg mx-auto mt-30 mb-0">
                    {PROFILE.availability} — from a focused product engagement to an ongoing design partnership.
                    Tell me what you're building.
                </p>

                <div className="d-flex flex-wrap justify-content-center gap-3 mt-50">
                    <a href={`mailto:${PROFILE.email}`} className="pf-btn pf-btn--light">
                        <span><span className="text-1">Email me</span><span className="text-2">Email me</span></span>
                        <i>{ARROW_SVG}{ARROW_SVG}</i>
                    </a>
                    <a href={`tel:${PROFILE.phoneHref}`} className="pf-btn pf-btn--outline">
                        <span><span className="text-1">{PROFILE.phone}</span><span className="text-2">{PROFILE.phone}</span></span>
                    </a>
                </div>

                <div className="pf-contact__row d-flex flex-wrap justify-content-center gap-4 mt-50">
                    <a href={`mailto:${PROFILE.email}`} className="pf-contact__link">{PROFILE.email}</a>
                    <span className="pf-contact__sep" aria-hidden="true">·</span>
                    <span className="pf-contact__link pf-contact__link--static">{PROFILE.location}</span>
                    {socials.map((s) => (
                        <span key={s.label} className="d-inline-flex align-items-center gap-4">
                            <span className="pf-contact__sep" aria-hidden="true">·</span>
                            <a href={s.href} target="_blank" rel="noopener noreferrer" className="pf-contact__link">{s.label}</a>
                        </span>
                    ))}
                </div>
            </div>
        </section>
    );
}
