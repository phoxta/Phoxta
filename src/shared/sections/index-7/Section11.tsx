import { useState } from "react";
import RevealText from "@/shared/effects/RevealText";
import { leadFormSubmit, STAGES, STARTUP_SCHOOL } from "@/lib/db/platformLead";

{/* Home 7 Section 11 — Startup School signup */}

// This was a generic "send us a message" contact form with a REQUIRED message
// box, sitting under a page that spends nine sections selling a programme.
// Asking someone who has decided to enrol to compose a paragraph first is the
// single most expensive field on the page. It is a signup now: the questions
// are the ones needed to place someone in a cohort, and only three are
// mandatory.
//
// The price is stated on the form itself rather than only in the copy above.
// Someone who scrolled past the offer section and landed here should not have
// to scroll back to find out what they are agreeing to.

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
    // Stage and the cohort question are folded into the message as labelled
    // lines, so they reach the Leads tab without a migration per question.
    const onLeadSubmit = leadFormSubmit("startup-school", setLead, [
        ["stage", "Stage"],
        ["goal", "What they want to build"],
    ]);

    return (
        <div className="sec-11-home-7 pt-120 pb-120" id="enroll">
            <div className="container-2200 px-lg-5 px-3">
                <div className="row align-items-start g-4 g-xl-5">
                    <div className="col-xl-5 col-lg-6 col-12">
                        <div className="sec-11-home-7__eyebrow d-inline-flex align-items-center gap-2 mb-4 text-uppercase">
                            <span className="text-scramble" data-scramble-text="Enroll">Enroll</span>
                            {EYEBROW_ARROW_SVG}
                        </div>
                        <h2 className="sec-11-home-7__title mb-4"><RevealText>Join Startup School</RevealText></h2>

                        {/* The offer, restated where the decision is made. */}
                        <div className="ss-offer">
                            <p className="ss-offer__price mb-1">
                                {STARTUP_SCHOOL.price}
                                <span className="ss-offer__per"> for {STARTUP_SCHOOL.duration}</span>
                            </p>
                            <ul className="ss-offer__list list-unstyled mb-0">
                                <li>Live sessions with mentors who have built and sold companies</li>
                                <li>Strategy, finance, marketing and the AI tools that matter now</li>
                                <li>You leave with a real business running, not a certificate</li>
                            </ul>
                        </div>
                    </div>

                    <div className="col-xl-6 col-lg-6 ms-lg-auto">
                        {lead.status === "sent" ? (
                            /* The form is REPLACED rather than left on screen with a
                               banner above it. A completed form still sitting there
                               invites a second submission, and the person genuinely
                               cannot tell whether the first one worked. */
                            <div className="ss-done" role="status">
                                <h3 className="ss-done__h">Your place is reserved</h3>
                                <p className="ss-done__p">
                                    We&apos;ve sent a confirmation to your inbox with everything you need — the dates,
                                    what to bring, and how to pay the {STARTUP_SCHOOL.price}.
                                </p>
                                <p className="ss-done__p mb-0">
                                    Nothing is charged yet. If it isn&apos;t in your inbox in a few minutes, check spam
                                    or reply to <a className="sec-4-about-form__link" href="mailto:hello@phoxta.com">hello@phoxta.com</a>.
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
                                    {/* Optional on purpose. Someone who has decided to
                                        enrol should not be made to write an essay first. */}
                                    <textarea className="sec-4-about-form__input sec-4-about-form__textarea" name="goal" rows={4}
                                              placeholder="What do you want to build? (optional)" aria-label="What do you want to build"></textarea>
                                </div>

                                <div className="sec-4-about-form__actions at_fade_anim">
                                    <button type="submit" className="sec-4-about-form__btn at-btn at_fade_anim" disabled={lead.status === "sending"}>
                                        <span>
                                            <span className="text-1 text-capitalize">{lead.status === "sending" ? "Reserving…" : "Reserve my place"}</span>
                                            <span className="text-2 text-capitalize">{lead.status === "sending" ? "Reserving…" : "Reserve my place"}</span>
                                        </span>
                                        <i>{SUBMIT_ARROW_SVG}</i>
                                    </button>
                                </div>

                                <p className="sec-4-about-form__disclaimer at_fade_anim" data-delay="0.1">
                                    No payment now — we&apos;ll confirm your place and send payment details.
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
