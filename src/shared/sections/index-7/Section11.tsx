import { useState } from "react";
import RevealText from "@/shared/effects/RevealText";
import { leadFormSubmit, STAGES } from "@/lib/db/platformLead";

{/* Home 7 Section 11 — Startup School support request */}

const EYEBROW_ARROW_SVG = (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="13" viewBox="0 0 14 13" fill="none" aria-hidden="true">
        <path d="M11.0037 3.41421L2.39712 12.0208L0.98291 10.6066L9.5895 2H2.00373V0H13.0037V11H11.0037V3.41421Z" fill="currentColor" />
    </svg>
);

const SUBMIT_ARROW_SVG = (
    <>
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0.21967 9.40717C-0.0732232 9.70006 -0.0732232 10.1749 0.21967 10.4678C0.512563 10.7607 0.987437 10.7607 1.28033 10.4678L0.21967 9.40717ZM10.6875 0.75C10.6875 0.335786 10.3517 2.97145e-09 9.9375 1.50485e-07L3.1875 -2.70983e-07C2.77329 -2.70983e-07 2.4375 0.335786 2.4375 0.75C2.4375 1.16421 2.77329 1.5 3.1875 1.5H9.1875V7.5C9.1875 7.91421 9.52329 8.25 9.9375 8.25C10.3517 8.25 10.6875 7.91421 10.6875 7.5L10.6875 0.75ZM0.75 9.9375L1.28033 10.4678L10.4678 1.28033L9.9375 0.75L9.40717 0.21967L0.21967 9.40717L0.75 9.9375Z" fill="currentColor" />
        </svg>
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0.21967 9.40717C-0.0732232 9.70006 -0.0732232 10.1749 0.21967 10.4678C0.512563 10.7607 0.987437 10.7607 1.28033 10.4678L0.21967 9.40717ZM10.6875 0.75C10.6875 0.335786 10.3517 2.97145e-09 9.9375 1.50485e-07L3.1875 -2.70983e-07C2.77329 -2.70983e-07 2.4375 0.335786 2.4375 0.75C2.4375 1.16421 2.77329 1.5 3.1875 1.5H9.1875V7.5C9.1875 7.91421 9.52329 8.25 9.9375 8.25C10.3517 8.25 10.6875 7.91421 10.6875 7.5L10.6875 0.75ZM0.75 9.9375L1.28033 10.4678L10.4678 1.28033L9.9375 0.75L9.40717 0.21967L0.21967 9.40717L0.75 9.9375Z" fill="currentColor" />
        </svg>
    </>
);

export default function Section11() {
    const [lead, setLead] = useState<{ status: "idle" | "sending" | "sent" | "error"; error?: string }>({ status: "idle" });
    // The additional context is folded into the message so the team can give a
    // useful recommendation without expanding the lead schema.
    const onLeadSubmit = leadFormSubmit("startup-school", setLead, [
        ["stage", "Stage"],
        ["goal", "What they are working on"],
    ]);

    return (
        <div className="sec-11-home-7 pt-120 pb-120" id="enroll">
            <div className="container-2200 px-lg-5 px-3">
                <div className="row align-items-start g-4 g-xl-5">
                    <div className="col-xl-5 col-lg-6 col-12">
                        <div className="sec-11-home-7__eyebrow d-inline-flex align-items-center gap-2 mb-4 text-uppercase">
                            <span className="text-scramble" data-scramble-text="Need a hand?">Need a hand?</span>
                            {EYEBROW_ARROW_SVG}
                        </div>
                        <h2 className="sec-11-home-7__title mb-4"><RevealText>Get help choosing a useful starting point</RevealText></h2>

                        <div className="ss-offer">
                            <p className="ss-offer__price mb-1">A practical recommendation</p>
                            <ul className="ss-offer__list list-unstyled mb-0">
                                <li>Identify the business question that is worth working on first</li>
                                <li>Choose the course, toolkit or Phoxta path that best fits your situation</li>
                                <li>Leave with a clear first action rather than a generic sales conversation</li>
                            </ul>
                        </div>
                    </div>

                    <div className="col-xl-6 col-lg-6 ms-lg-auto">
                        {lead.status === "sent" ? (
                            <div className="ss-done" role="status">
                                <h3 className="ss-done__h">Your request is with the Phoxta team</h3>
                                <p className="ss-done__p">
                                    We&apos;ll use the context you shared to recommend the most useful next step for your business question.
                                </p>
                                <p className="ss-done__p mb-0">
                                    This request does not create a purchase. For anything else, contact <a className="sec-4-about-form__link" href="mailto:hello@phoxta.com">hello@phoxta.com</a>.
                                </p>
                            </div>
                        ) : (
                            <form className="sec-4-about-form sec-11-home-7__form" onSubmit={onLeadSubmit}>
                                {lead.status === "error" && (
                                    <div className="alert alert-danger py-2 px-3 fz-font-md" role="alert">
                                        {lead.error}
                                    </div>
                                )}
                                {/* Honeypot — bots fill every field, people never see this one. */}
                                <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px", height: 0, width: 0, opacity: 0 }} />

                                <div className="sec-4-about-form__field at_fade_anim">
                                    <input type="text" className="sec-4-about-form__input" name="name" placeholder="Your name *" required autoComplete="name" aria-label="Your name" />
                                </div>
                                <div className="sec-4-about-form__field at_fade_anim">
                                    <input type="email" className="sec-4-about-form__input" name="email" placeholder="Your email *" required autoComplete="email" aria-label="Your email" />
                                </div>
                                <div className="sec-4-about-form__field at_fade_anim">
                                    <input type="tel" className="sec-4-about-form__input" name="phone" placeholder="Your phone *" required autoComplete="tel" aria-label="Your phone" />
                                </div>
                                <div className="sec-4-about-form__field at_fade_anim">
                                    <label className="visually-hidden" htmlFor="ss-stage">Where are you starting from?</label>
                                    <select id="ss-stage" className="sec-4-about-form__input" name="stage" defaultValue="">
                                        <option value="" disabled>Where are you starting from?</option>
                                        {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="sec-4-about-form__field at_fade_anim">
                                    <textarea className="sec-4-about-form__input sec-4-about-form__textarea" name="goal" rows={4}
                                              placeholder="What are you working on? (optional)" aria-label="What you are working on"></textarea>
                                </div>

                                <div className="sec-4-about-form__actions at_fade_anim">
                                    <button type="submit" className="sec-4-about-form__btn at-btn at_fade_anim" disabled={lead.status === "sending"}>
                                        <span>
                                            <span className="text-1 text-capitalize">{lead.status === "sending" ? "Sending…" : "Ask for a starting point"}</span>
                                            <span className="text-2 text-capitalize">{lead.status === "sending" ? "Sending…" : "Ask for a starting point"}</span>
                                        </span>
                                        <i>{SUBMIT_ARROW_SVG}</i>
                                    </button>
                                </div>

                                <p className="sec-4-about-form__disclaimer at_fade_anim" data-delay="0.1">
                                    This is a request for a recommendation, not a purchase. We&apos;ll confirm any applicable access or pricing before you commit.
                                    By submitting, you agree to our <a href="/terms" className="sec-4-about-form__link">Terms</a> and{" "}
                                    <a href="/privacy" className="sec-4-about-form__link">Privacy Policy</a>.
                                </p>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
