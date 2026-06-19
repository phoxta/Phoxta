import { Link } from "react-router-dom";
export default function Footer13() {
    return (
        <footer className="footer-13" aria-label="Site footer">
            <div className="footer-13__meta">
                <div className="footer-13__meta-item footer-13__meta-item--lead at_fade_anim" data-fade-from="bottom" data-delay=".1">
                    <span className="footer-13__meta-dot" aria-hidden="true"></span>
                    <span className="footer-13__meta-key">INVESTOR DESK</span>
                    <span className="footer-13__meta-val">Open &middot; Mon&ndash;Fri 9:00&mdash;18:00</span>
                </div>
                <div className="footer-13__meta-item at_fade_anim" data-fade-from="bottom" data-delay=".2">
                    <span className="footer-13__meta-key">PAYOUTS</span>
                    <span className="footer-13__meta-val">Monthly</span>
                </div>
                <div className="footer-13__meta-item at_fade_anim" data-fade-from="bottom" data-delay=".3">
                    <span className="footer-13__meta-key">MINIMUM</span>
                    <span className="footer-13__meta-val">$500</span>
                </div>
                <div className="footer-13__meta-item at_fade_anim" data-fade-from="bottom" data-delay=".4">
                    <span className="footer-13__meta-key">STATUS</span>
                    <span className="footer-13__meta-val">Now onboarding</span>
                </div>
            </div>

            <div className="footer-13__body">
                <div className="footer-13__top">
                    <div className="footer-13__brand at_fade_anim" data-fade-from="bottom" data-delay=".1">
                        <Link className="footer-13__logo" to="/">
                            <img src="/assets/imgs/template/logo/favicon.svg" alt="Phoxta" loading="lazy" />
                            <span className="footer-13__logo-text">Phoxta</span>
                        </Link>
                        <p className="footer-13__intro mb-0">
                            We finance the vetted, AI-powered businesses built on Phoxta &mdash; and share the returns with investors. Backed by real revenue, structured to protect your capital.
                        </p>
                        <form className="footer-13__form" action="#" method="post" noValidate>
                            <p className="footer-13__form-label mb-0">INVESTOR BRIEFING &mdash; MONTHLY</p>
                            <div className="footer-13__form-row">
                                <label className="visually-hidden" htmlFor="footer-13-email">Email address</label>
                                <input className="footer-13__form-input" id="footer-13-email" type="email" name="email" placeholder="your.email@example.com" autoComplete="email" required />
                                <button className="footer-13__form-btn" type="submit">
                                    <span>SUBSCRIBE</span>
                                    <span className="footer-13__form-arrow" aria-hidden="true">&rarr;</span>
                                </button>
                            </div>
                        </form>
                    </div>

                    <nav className="footer-13__cols" aria-label="Footer navigation">
                        <div className="footer-13__col at_fade_anim" data-fade-from="bottom" data-delay=".2">
                            <p className="footer-13__col-title mb-0">INVEST</p>
                            <ul className="footer-13__col-list list-unstyled mb-0">
                                <li><Link to="/auth">Open an account</Link></li>
                                <li><Link to="/product-archive">Browse the marketplace</Link></li>
                                <li><Link to="/pricing">Pricing</Link></li>
                                <li><Link to="/archive-1">Articles</Link></li>
                            </ul>
                        </div>
                        <div className="footer-13__col at_fade_anim" data-fade-from="bottom" data-delay=".3">
                            <p className="footer-13__col-title mb-0">PRODUCTS</p>
                            <ul className="footer-13__col-list list-unstyled mb-0">
                                <li><Link to="/invest">Growth Notes</Link></li>
                                <li><Link to="/invest">Credit Invest</Link></li>
                                <li><Link to="/invest">How it works</Link></li>
                                <li><Link to="/invest">Returns calculator</Link></li>
                                <li><Link to="/invest">FAQ</Link></li>
                            </ul>
                        </div>
                        <div className="footer-13__col at_fade_anim" data-fade-from="bottom" data-delay=".4">
                            <p className="footer-13__col-title mb-0">INVESTOR RELATIONS</p>
                            <ul className="footer-13__col-list list-unstyled mb-0">
                                <li><a href="mailto:invest@phoxta.com">invest@phoxta.com</a></li>
                                <li><a href="tel:+12125550142">+1 (212) 555-0142</a></li>
                                <li><Link to="/auth">Talk to our team</Link></li>
                                <li><Link to="/invest">Eligibility &amp; terms</Link></li>
                            </ul>
                        </div>
                    </nav>
                </div>

                <ul className="footer-13__studios list-unstyled mb-0">
                    <li className="footer-13__studio at_fade_anim" data-fade-from="bottom" data-delay=".1">
                        <div className="footer-13__studio-head">
                            <span className="footer-13__studio-dot footer-13__studio-dot--active" aria-hidden="true"></span>
                            <h3 className="footer-13__studio-name mb-0">Americas</h3>
                        </div>
                        <address className="footer-13__studio-addr mb-0">
                            Investor support<br />
                            Mon&ndash;Fri &middot; 9:00&ndash;18:00 ET
                        </address>
                        <p className="footer-13__studio-status footer-13__studio-status--open mb-0">OPEN NOW &middot; 14:32 ET</p>
                    </li>
                    <li className="footer-13__studio at_fade_anim" data-fade-from="bottom" data-delay=".3">
                        <div className="footer-13__studio-head">
                            <span className="footer-13__studio-dot footer-13__studio-dot--active" aria-hidden="true"></span>
                            <h3 className="footer-13__studio-name mb-0">Europe</h3>
                        </div>
                        <address className="footer-13__studio-addr mb-0">
                            Investor support<br />
                            Mon&ndash;Fri &middot; 9:00&ndash;18:00 GMT
                        </address>
                        <p className="footer-13__studio-status footer-13__studio-status--open mb-0">OPEN NOW &middot; 14:32 GMT</p>
                    </li>
                    <li className="footer-13__studio at_fade_anim" data-fade-from="bottom" data-delay=".5">
                        <div className="footer-13__studio-head">
                            <span className="footer-13__studio-dot" aria-hidden="true"></span>
                            <h3 className="footer-13__studio-name mb-0">Asia&ndash;Pacific</h3>
                        </div>
                        <address className="footer-13__studio-addr mb-0">
                            Investor support<br />
                            Mon&ndash;Fri &middot; 9:00&ndash;18:00 SGT
                        </address>
                        <p className="footer-13__studio-status mb-0">AFTER HOURS &middot; CLOSED</p>
                    </li>
                </ul>

                <div className="footer-13__bigbrand">
                    <p className="footer-13__bigbrand-text mb-0 text-scale-anim">Phoxta<sup>&reg;</sup> Invest</p>
                </div>
            </div>

            <div className="footer-13__legal">
                <p className="footer-13__copy mb-0">&copy; 2026 Phoxta, Ltd. Investing involves risk &mdash; your capital is at risk and returns are not guaranteed. All rights reserved.</p>
                <ul className="footer-13__social list-unstyled mb-0">
                    <li><a href="https://linkedin.com" target="_blank" rel="noopener">LinkedIn</a></li>
                    <li><a href="https://x.com" target="_blank" rel="noopener">X</a></li>
                    <li><a href="https://instagram.com" target="_blank" rel="noopener">Instagram</a></li>
                    <li><a href="https://youtube.com" target="_blank" rel="noopener">YouTube</a></li>
                </ul>
                <ul className="footer-13__legal-links list-unstyled mb-0">
                    <li><Link to="/privacy">Privacy</Link></li>
                    <li><Link to="/terms">Terms</Link></li>
                    <li><a href="#">Disclosures</a></li>
                    <li><a href="#">Cookies</a></li>
                </ul>
            </div>
        </footer>
    );
}
