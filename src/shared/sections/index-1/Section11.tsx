import { useState } from "react";
import { Link } from "react-router-dom";
import RevealText from "@/shared/effects/RevealText";
import { leadFormSubmit } from "@/lib/db/platformLead";

const ARROW_SVG = (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0.21967 9.40717C-0.0732232 9.70006 -0.0732232 10.1749 0.21967 10.4678C0.512563 10.7607 0.987437 10.7607 1.28033 10.4678L0.21967 9.40717ZM10.6875 0.75C10.6875 0.335786 10.3517 2.97145e-09 9.9375 1.50485e-07L3.1875 -2.70983e-07C2.77329 -2.70983e-07 2.4375 0.335786 2.4375 0.75C2.4375 1.16421 2.77329 1.5 3.1875 1.5H9.1875V7.5C9.1875 7.91421 9.52329 8.25 9.9375 8.25C10.3517 8.25 10.6875 7.91421 10.6875 7.5L10.6875 0.75ZM0.75 9.9375L1.28033 10.4678L10.4678 1.28033L9.9375 0.75L9.40717 0.21967L0.21967 9.40717L0.75 9.9375Z" fill="currentColor" />
    </svg>
);

const BTN_CIRCLE_ARROW_SVG = (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="15" viewBox="0 0 16 15" fill="none">
        <path d="M0.0001297 8.99993L0 3.00407e-05L2 0L2.0001 6.99993L12.1719 7.00003L8.22224 3.05027L9.63644 1.63606L16.0003 8.00003L9.63644 14.364L8.22224 12.9497L12.1719 9.00003L0.0001297 8.99993Z" fill="currentColor" />
    </svg>
);

const FAQ_ITEMS = [
    {
        id: "collapseOne",
        num: "1",
        question: "What exactly do I receive upon acquisition?",
        answer: "You receive the business package described on its listing: a configurable storefront, relevant operating workflows, AI support for approved routine work, and a guided activation plan. Your purchase agreement confirms the exact handover and ongoing-service terms.",
        open: true,
    },
    {
        id: "collapseTwo",
        num: "2",
        question: "What does the AI do—and what remains mine?",
        answer: "The AI can answer routine approved questions, organise context, draft follow-up and route work. You set the offer, pricing, policies and quality standard; you also handle exceptions, sensitive decisions and the customer insight that improves the business.",
        open: false,
    },
    {
        id: "collapseThree",
        num: "3",
        question: "What can I tailor before launch?",
        answer: "You tailor the market, brand, offer, content, approved knowledge, customer channels and operating boundaries. Phoxta helps with setup, but the first local customer proof and operating choices are part of the owner’s work.",
        open: false,
    },
    {
        id: "collapseFour",
        num: "4",
        question: "How do I know whether the business is working?",
        answer: "Use evidence rather than assumptions: customer conversations, conversion actions, quality checks, repeat behaviour and payments. The Console and Startup School help turn those signals into a focused next test.",
        open: false,
    },
];

export default function Section11({ classList = "" }: { classList?: string }) {
    const useHomepageGrid = classList.split(/\s+/).includes("phoxta-home-faq");
    const [lead, setLead] = useState<{ status: "idle" | "sending" | "sent" | "error"; error?: string }>({ status: "idle" });
    const onLeadSubmit = leadFormSubmit("contact", setLead, [["marketing_consent", "Marketing email consent"]]);

    return (
        <div className={`alt-faq-area pt-145 pb-80 ${classList || ""}`}>
            <div className={`container${useHomepageGrid ? " phoxta-home-shell" : ""}`}>
                <div className="row">
                    <div className="col-lg-5">
                        <div className="alt-faq-title-wrap mb-40">
                            {useHomepageGrid ? <div className="phoxta-home-faq__contact">
                                <img
                                    src="/assets/imgs/pages/img-125-faq.webp"
                                    width={553}
                                    height={425}
                                    className="phoxta-home-faq__contact-image"
                                    alt=""
                                    loading="lazy" />
                                <div className="phoxta-home-faq__contact-scrim" aria-hidden="true" />
                                <div className="phoxta-home-faq__contact-card">
                                    {lead.status === "sent" ? (
                                        <div className="phoxta-home-faq__success" role="status">
                                            <span>Message received</span>
                                            <h3>Thank you for contacting Phoxta.</h3>
                                            <p>We&apos;ll review your message and reply to the email address you provided.</p>
                                            <button type="button" onClick={() => setLead({ status: "idle" })}>Send another message</button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="phoxta-home-faq__contact-heading">
                                                <span>Contact Phoxta</span>
                                                <h3>Still have questions?</h3>
                                                <p>Tell us what you need help with and we&apos;ll get back to you.</p>
                                            </div>
                                            <form className="phoxta-home-faq__form" onSubmit={onLeadSubmit}>
                                                <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="phoxta-home-faq__honeypot" />
                                                <label>
                                                    <span>Name</span>
                                                    <input type="text" name="name" required autoComplete="name" placeholder="Your name" />
                                                </label>
                                                <label>
                                                    <span>Email</span>
                                                    <input type="email" name="email" required autoComplete="email" placeholder="you@example.com" />
                                                </label>
                                                <label>
                                                    <span>Message</span>
                                                    <textarea name="message" required rows={4} placeholder="How can we help?" />
                                                </label>
                                                <label className="phoxta-home-faq__consent">
                                                    <input type="checkbox" name="marketing_consent" value="Agreed" />
                                                    <span>You agree to receive Phoxta marketing emails.</span>
                                                </label>
                                                {lead.status === "error" && (
                                                    <p className="phoxta-home-faq__form-error" role="alert">{lead.error}</p>
                                                )}
                                                <button type="submit" className="phoxta-home-faq__submit" disabled={lead.status === "sending"}>
                                                    {lead.status === "sending" ? "Sending..." : "Send message"}
                                                    <span aria-hidden="true">→</span>
                                                </button>
                                            </form>
                                            <p className="phoxta-home-faq__contact-footer">
                                                Prefer self-service? <Link to="/faqs">Visit the Support Center</Link>
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div> : <>
                                <div className="rounded-4 overflow-hidden anim-zoomin">
                                    <img
                                        src="/assets/imgs/pages/img-125-faq.webp"
                                        width={553}
                                        height={425}
                                        className="w-100"
                                        alt="A member of the Phoxta team at their desk, ready to answer questions"
                                        loading="lazy" />
                                </div>
                                <h6 className="mb-15 pt-50">Still have questions? We&apos;re here to help.</h6>
                                <p className="at-faq-dec mb-35">femi@phoxta.com, +447350172153.</p>
                                <div
                                    className="at-btn-group at_fade_anim"
                                    data-delay=".4"
                                    data-fade-from="bottom"
                                    data-ease="bounce"
                                >
                                    <Link className="at-btn-circle" to="/faqs">
                                        {BTN_CIRCLE_ARROW_SVG}
                                    </Link>
                                    <Link className="at-btn z-index-1" to="/faqs">
                                        Support Center
                                    </Link>
                                    <Link className="at-btn-circle" to="/faqs">
                                        {BTN_CIRCLE_ARROW_SVG}
                                    </Link>
                                </div>
                            </>}
                        </div>
                    </div>
                    <div className="col-lg-7">
                        <div className="at-faq ml-115">
                            <span className="at-btn common-black bg-transparent mb-10 rounded-0 p-0">
                                <span className="text-uppercase">
                                    <span className="text-1">FAQ</span>
                                    <span className="text-2">FAQ</span>
                                </span>
                                <i>
                                    {ARROW_SVG}
                                    {ARROW_SVG}
                                </i>
                            </span>
                            <h3 className="at-section-title reveal-text">
                                <RevealText>
                                    Everything you might want to know.
                                </RevealText>
                            </h3>
                            <div className="accordion pt-80" id="accordionExample">
                                {FAQ_ITEMS.map((item) => (
                                    <div key={item.id} className="at-faq-item scroll-move-up rounded-4">
                                        <div className="at-faq-header d-flex gap-2">
                                            <div className="box-number">
                                                <span className="at-faq-number">{item.num}</span>
                                            </div>
                                            <button
                                                className={`at-faq-button${item.open ? "" : " collapsed"}`}
                                                type="button"
                                                data-bs-toggle="collapse"
                                                data-bs-target={`#${item.id}`}
                                                aria-expanded={item.open}
                                                aria-controls={item.id}
                                            >
                                                {item.question}
                                            </button>
                                        </div>
                                        <div
                                            id={item.id}
                                            className={`at-faq-collapse collapse${item.open ? " show" : ""}`}
                                            data-bs-parent="#accordionExample"
                                        >
                                            <div className="at-faq-body">
                                                <p>{item.answer}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
