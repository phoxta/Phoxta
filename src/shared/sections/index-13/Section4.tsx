import { Link } from "react-router-dom";
import RevealText from "@/shared/effects/RevealText";

export default function Section4() {
    return (
        <section className="sec-4-home-13" aria-label="Start investing">
            <div className="sec-4-home-13__card">
                <div className="sec-4-home-13__bar">
                    <div className="sec-4-home-13__bar-left">
                        <span className="sec-4-home-13__bar-dot" aria-hidden="true"></span>
                        <span>NOW OPEN &mdash; INVESTOR ONBOARDING / 2026</span>
                    </div>
                    <div className="sec-4-home-13__bar-center text-scramble">TARGET 7% &ndash; 15% APR</div>
                    <div className="sec-4-home-13__bar-right">PHX_INVEST_2026</div>
                </div>

                <div className="sec-4-home-13__head">
                    <p className="sec-4-home-13__tag mb-0 at_fade_anim" data-fade-from="left" data-delay=".1">
                        <span className="at-rise-animation"> [ START INVESTING ]</span>
                    </p>
                    <h2 className="sec-4-home-13__title mb-0 reveal-text text-white">
                        <RevealText>Invest </RevealText>
                        <em><RevealText>with</RevealText></em>
                        <RevealText> us.</RevealText>
                    </h2>
                </div>

                <div className="sec-4-home-13__bottom">
                    <div className="sec-4-home-13__copy">
                        <p className="sec-4-home-13__lede mb-0">
                            Tell us your goals and how much you&rsquo;d like to put to work.<br />
                            We respond personally within 24 hours &mdash; real people, clear terms, no jargon.
                        </p>
                        <ul className="sec-4-home-13__chips list-unstyled mb-0">
                            <li><Link className="sec-4-home-13__chip at_fade_anim text-white" data-fade-from="left" data-delay=".1" to="/auth"><span aria-hidden="true">&rarr;</span> Open an account</Link></li>
                            <li><Link className="sec-4-home-13__chip at_fade_anim text-white" data-fade-from="left" data-delay=".2" to="/auth">Start with $500</Link></li>
                            <li><Link className="sec-4-home-13__chip at_fade_anim text-white" data-fade-from="left" data-delay=".3" to="/pricing">Talk to our team</Link></li>
                        </ul>
                    </div>

                    <div className="sec-4-home-13__contact">
                        <p className="sec-4-home-13__contact-label mb-0">INVESTOR RELATIONS</p>
                        <a className="sec-4-home-13__contact-row" href="mailto:invest@phoxta.com">
                            <span className="sec-4-home-13__contact-mail at-rise-animation text-white">invest@phoxta.com</span>
                            <span className="sec-4-home-13__contact-arrow" aria-hidden="true">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M7 17L17 7M17 7H8M17 7V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </span>
                        </a>
                    </div>
                </div>

                <div className="sec-4-home-13__glow" aria-hidden="true"></div>
            </div>
        </section>
    );
}
