import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PROFILE, NAV } from "@/shared/portfolio/portfolioData";
import { PORTFOLIO_HOME, useActiveSection, useIsPortfolioHome, useSectionLink } from "@/shared/portfolio/nav";
import { scrollToId } from "@/shared/effects/scrollToId";

const MOBILE_PANEL_ID = "pf-mobile-menu";
const SECTION_IDS = NAV.map((n) => n.id);

/** One menu item. Scrolls in place on the home page, navigates to `/#id` from anywhere else. */
function NavLink({
    id,
    label,
    className,
    current,
    onNavigate,
}: {
    id: string;
    label: string;
    className: string;
    current: boolean;
    onNavigate?: () => void;
}) {
    const { to, onClick } = useSectionLink(id);
    return (
        <Link
            to={to}
            onClick={(e) => {
                onClick(e);
                onNavigate?.();
            }}
            className={className}
            aria-current={current ? "true" : undefined}
        >
            {label}
        </Link>
    );
}

/** The portfolio's own top bar — photo + name, section nav, a contact CTA.
 *  Distinct from the Phoxta site header on purpose: this is a personal site. */
export default function PortfolioHeader() {
    const [scrolled, setScrolled] = useState(false);
    const [open, setOpen] = useState(false);
    const isHome = useIsPortfolioHome();
    const active = useActiveSection(SECTION_IDS);

    useEffect(() => {
        const onScroll = () => setScrolled((window.scrollY ?? window.pageYOffset) > 24);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    // The logo goes home from a project page, and to the top when already home.
    const onBrandClick = (e: React.MouseEvent) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        if (!isHome) return;
        e.preventDefault();
        scrollToId("top", 0);
    };

    return (
        <header className={`pf-header${scrolled ? " is-scrolled" : ""}`}>
            <div className="container-2200 px-3 px-lg-4">
                <div className="pf-header__bar d-flex align-items-center justify-content-between">
                    <Link
                        to={PORTFOLIO_HOME}
                        onClick={onBrandClick}
                        className="pf-brand d-inline-flex align-items-center gap-2 text-decoration-none"
                        aria-label={`${PROFILE.name} — home`}
                    >
                        <span className="pf-brand__mark pf-brand__mark--photo" aria-hidden="true">
                            <img src="/assets/imgs/portfolio/femi-adeyemi-96.webp" alt="" width={40} height={40} />
                        </span>
                        <span className="pf-brand__text">
                            <span className="pf-brand__name">{PROFILE.shortName}</span>
                            <span className="pf-brand__role">{PROFILE.role}</span>
                        </span>
                    </Link>

                    <nav className="pf-nav d-none d-lg-flex align-items-center gap-4" aria-label="Primary">
                        {NAV.map((item) => (
                            <NavLink
                                key={item.id}
                                id={item.id}
                                label={item.label}
                                className="pf-nav__link"
                                current={active === item.id}
                            />
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
                            aria-controls={MOBILE_PANEL_ID}
                            onClick={() => setOpen((v) => !v)}
                        >
                            <span /><span /><span />
                        </button>
                    </div>
                </div>

                {/* Mobile drop panel. Closed it is visibility:hidden (see PORTFOLIO_CSS),
                    which keeps its links out of the tab order — they used to be focusable
                    at every width — while still allowing the slide-down transition. */}
                <nav
                    id={MOBILE_PANEL_ID}
                    className={`pf-mobile${open ? " is-open" : ""}`}
                    aria-label="Primary"
                >
                    {NAV.map((item) => (
                        <NavLink
                            key={item.id}
                            id={item.id}
                            label={item.label}
                            className="pf-mobile__link"
                            current={active === item.id}
                            onNavigate={() => setOpen(false)}
                        />
                    ))}
                    <a
                        href={`mailto:${PROFILE.email}`}
                        className="pf-mobile__link pf-mobile__link--accent"
                        onClick={() => setOpen(false)}
                    >
                        Let's talk →
                    </a>
                </nav>
            </div>
        </header>
    );
}
