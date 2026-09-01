import { useEffect, useState } from "react";
import { onAnchorClick } from "@/shared/effects/scrollToId";
import { PROFILE, NAV } from "@/shared/portfolio/portfolioData";

const NAV_OFFSET = 88;

/** The portfolio's own top bar — monogram + name, in-page nav, a contact CTA.
 *  Distinct from the Phoxta site header on purpose: this is a personal site. */
export default function PortfolioHeader() {
    const [scrolled, setScrolled] = useState(false);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled((window.scrollY ?? window.pageYOffset) > 24);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <header className={`pf-header${scrolled ? " is-scrolled" : ""}`}>
            <div className="container-2200 px-3 px-lg-4">
                <div className="pf-header__bar d-flex align-items-center justify-content-between">
                    <a
                        href="#top"
                        onClick={onAnchorClick("top", 0)}
                        className="pf-brand d-inline-flex align-items-center gap-2 text-decoration-none"
                        aria-label={`${PROFILE.name} — home`}
                    >
                        <span className="pf-brand__mark" aria-hidden="true">{PROFILE.monogram}</span>
                        <span className="pf-brand__text">
                            <span className="pf-brand__name">{PROFILE.shortName}</span>
                            <span className="pf-brand__role">{PROFILE.role}</span>
                        </span>
                    </a>

                    <nav className="pf-nav d-none d-lg-flex align-items-center gap-4" aria-label="Sections">
                        {NAV.map((item) => (
                            <a
                                key={item.id}
                                href={`#${item.id}`}
                                onClick={onAnchorClick(item.id, NAV_OFFSET)}
                                className="pf-nav__link"
                            >
                                {item.label}
                            </a>
                        ))}
                    </nav>

                    <div className="d-flex align-items-center gap-2">
                        <a href={`mailto:${PROFILE.email}`} className="pf-cta d-none d-sm-inline-flex">
                            Let's talk
                        </a>
                        <button
                            type="button"
                            className="pf-burger d-inline-flex d-lg-none"
                            aria-label={open ? "Close menu" : "Open menu"}
                            aria-expanded={open}
                            onClick={() => setOpen((v) => !v)}
                        >
                            <span /><span /><span />
                        </button>
                    </div>
                </div>

                {/* Mobile drop panel */}
                <div className={`pf-mobile${open ? " is-open" : ""}`}>
                    {NAV.map((item) => (
                        <a
                            key={item.id}
                            href={`#${item.id}`}
                            onClick={(e) => { setOpen(false); onAnchorClick(item.id, NAV_OFFSET)(e); }}
                            className="pf-mobile__link"
                        >
                            {item.label}
                        </a>
                    ))}
                    <a href={`mailto:${PROFILE.email}`} className="pf-mobile__link pf-mobile__link--accent" onClick={() => setOpen(false)}>
                        Let's talk →
                    </a>
                </div>
            </div>
        </header>
    );
}
