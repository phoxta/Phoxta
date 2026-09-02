import { onAnchorClick } from "@/shared/effects/scrollToId";
import { PROFILE, NAV, SOCIALS } from "@/shared/portfolio/portfolioData";

const YEAR = new Date().getFullYear();

/** Portfolio footer — a compact sign-off with contact + section links. */
export default function PortfolioFooter() {
    const socials = SOCIALS.filter((s) => s.href);
    return (
        <footer className="pf-footer bg-neutral-950 text-white">
            <div className="container-2200 px-3 px-lg-4 pt-80 pb-40">
                <div className="row g-4 align-items-start">
                    <div className="col-lg-6">
                        <a href="#top" onClick={onAnchorClick("top", 0)} className="pf-brand pf-brand--footer d-inline-flex align-items-center gap-2 text-decoration-none">
                            <span className="pf-brand__mark" aria-hidden="true">{PROFILE.monogram}</span>
                            <span className="pf-brand__name text-white">{PROFILE.name}</span>
                        </a>
                        <p className="pf-footer__line mt-20 mb-0">
                            {PROFILE.role} — {PROFILE.location}. <br />
                            {PROFILE.availability}.
                        </p>
                    </div>
                    <div className="col-12 col-sm-6 col-lg-3">
                        <p className="pf-foot-label mb-15">Explore</p>
                        <ul className="list-unstyled d-flex flex-column gap-2 m-0">
                            {NAV.map((item) => (
                                <li key={item.id}>
                                    <a href={`#${item.id}`} onClick={onAnchorClick(item.id, 88)} className="pf-foot-link">{item.label}</a>
                                </li>
                            ))}
                        </ul>
                    </div>
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
