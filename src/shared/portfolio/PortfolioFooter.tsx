import { Link } from "react-router-dom";
import { PROFILE, NAV, SOCIALS } from "@/shared/portfolio/portfolioData";
import { PORTFOLIO_HOME, useIsPortfolioHome, useSectionLink } from "@/shared/portfolio/nav";
import { scrollToId } from "@/shared/effects/scrollToId";

const YEAR = new Date().getFullYear();

/** A footer menu item — scrolls in place on the home page, navigates from anywhere else. */
function FooterSectionLink({ id, label }: { id: string; label: string }) {
    const { to, onClick } = useSectionLink(id);
    return (
        <Link to={to} onClick={onClick} className="pf-foot-link">
            {label}
        </Link>
    );
}

/** Portfolio footer — a compact sign-off with contact + section links. */
export default function PortfolioFooter() {
    const socials = SOCIALS.filter((s) => s.href);
    const isHome = useIsPortfolioHome();

    const onBrandClick = (e: React.MouseEvent) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        if (!isHome) return;
        e.preventDefault();
        scrollToId("top", 0);
    };

    return (
        <footer className="pf-footer bg-neutral-950 text-white">
            <div className="container-2200 px-3 px-lg-4 pt-80 pb-40">
                <div className="row g-4 align-items-start">
                    <div className="col-lg-6">
                        <Link
                            to={PORTFOLIO_HOME}
                            onClick={onBrandClick}
                            className="pf-brand pf-brand--footer d-inline-flex align-items-center gap-2 text-decoration-none"
                            aria-label={`${PROFILE.name} — home`}
                        >
                            <span className="pf-brand__mark pf-brand__mark--photo" aria-hidden="true">
                                <img src="/assets/imgs/portfolio/femi-adeyemi-96.webp" alt="" width={40} height={40} loading="lazy" />
                            </span>
                            <span className="pf-brand__name text-white">{PROFILE.name}</span>
                        </Link>
                        <p className="pf-footer__line mt-20 mb-0">
                            {PROFILE.role} — {PROFILE.location}. <br />
                            {PROFILE.availability}.
                        </p>
                    </div>
                    <nav className="col-12 col-sm-6 col-lg-3" aria-label="Footer">
                        <p className="pf-foot-label mb-15">Explore</p>
                        <ul className="list-unstyled d-flex flex-column gap-2 m-0">
                            {NAV.map((item) => (
                                <li key={item.id}>
                                    <FooterSectionLink id={item.id} label={item.label} />
                                </li>
                            ))}
                        </ul>
                    </nav>
                    <div className="col-12 col-sm-6 col-lg-3">
                        <p className="pf-foot-label mb-15">Contact</p>
                        <ul className="list-unstyled d-flex flex-column gap-2 m-0">
                            <li><a href={`mailto:${PROFILE.email}`} className="pf-foot-link">{PROFILE.email}</a></li>
                            <li><a href={`tel:${PROFILE.phoneHref}`} className="pf-foot-link">{PROFILE.phone}</a></li>
                            {socials.map((s) => (
                                <li key={s.label}><a href={s.href} target="_blank" rel="noopener noreferrer" className="pf-foot-link">{s.label}</a></li>
                            ))}
                        </ul>
                    </div>
                </div>
                <div className="pf-footer__base d-flex flex-wrap align-items-center justify-content-between gap-2 mt-40 pt-20">
                    <span className="pf-footer__fine">© {YEAR} {PROFILE.name}. All rights reserved.</span>
                    <span className="pf-footer__fine">Designed &amp; built by {PROFILE.shortName}.</span>
                </div>
            </div>
        </footer>
    );
}
