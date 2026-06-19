import { useState } from "react";
import { Link } from "react-router-dom";
import RevealText from "@/shared/effects/RevealText";

const PAD = "clamp(72px, 8vw, 120px) clamp(20px, 6vw, 96px)";
const Q_STYLE = { fontFamily: "var(--at-ff-heading)", fontWeight: 600, fontSize: "clamp(19px, 1.7vw, 26px)", lineHeight: 1.15, letterSpacing: "-0.03em", color: "var(--at-neutral-900)" } as const;

const TERMS = [
    { label: "MINIMUM", value: "$500", note: "Across Growth Notes or Credit Invest." },
    { label: "FEES", value: "~1%/yr", note: "Servicing fee on Credit Invest. Growth Notes are fee-free — your rate is net." },
    { label: "PAYOUTS", value: "Monthly", note: "Interest accrues daily, paid monthly. Reinvest to compound." },
    { label: "LIQUIDITY", value: "Flexible", note: "Notes pay out at term; early exit best-efforts. Credit Invest withdraws monthly." },
];

const FAQS = [
    { q: "How and when do I get paid?", a: "Interest accrues daily and is paid to your account every month. You can withdraw it or reinvest to compound. Growth Notes return your principal in full at the end of the term; Credit Invest is rolling, so you can keep earning or wind down whenever you choose." },
    { q: "What happens if a business doesn't repay?", a: "Your exposure is spread across dozens of businesses, so no single miss is decisive. Losses hit Phoxta's first-loss co-investment and the reserve fund before they ever reach your principal, an independent back-up servicer continues collections, and we pursue recoveries. Diversification, alignment and a reserve manage the downside — they don't remove it." },
    { q: "Can I withdraw early?", a: "Growth Notes are fixed-term. You can request an early exit through a best-efforts secondary process, which may settle at a discount and isn't guaranteed. Credit Invest is more flexible: switch off reinvestment and withdraw available cash each month as advances are repaid." },
    { q: "Who can invest?", a: "You must be 18+ and complete identity verification (KYC/AML). Depending on the offering's exemption, per-investor limits may apply based on your income and net worth, and some tiers may be limited to accredited investors. We'll show you what you're eligible for at sign-up." },
    { q: "What are the fees?", a: "Growth Notes carry no separate investor fee — the rate you see is what you earn. Credit Invest charges a flat servicing fee of about 1% per year, already reflected in the target net yields shown. No hidden spreads, no surprise penalties." },
    { q: "Is my money protected?", a: "Investor funds are held in segregated, ring-fenced accounts, separate from Phoxta's own. That said, capital is at risk: returns are targets, not guarantees, and this is not a bank deposit — it is not FDIC- or FSCS-insured. Only invest what you can afford to tie up." },
    { q: "How are my returns taxed?", a: "Interest is generally treated as taxable income, and we provide annual statements to make filing simple. Tax treatment depends on your circumstances and where you live — please consult a qualified tax adviser." },
    { q: "How can Phoxta pay these rates?", a: "Growth Notes are paid from five diversified platform revenue streams — launch fees, subscriptions, usage, matching and marketplace take. Credit Invest is funded by the interest revenue-generating businesses pay on working-capital advances, underwritten on the live revenue data we can see on the platform." },
];

export default function SectionFaq() {
    const [open, setOpen] = useState(0);

    return (
        <section aria-label="Fees, liquidity, eligibility and FAQ" style={{ background: "var(--at-neutral-50)", padding: PAD }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "clamp(40px, 5vw, 72px)", width: "100%" }}>
                <header>
                    <div className="sec-2-home-13__label mb-3">
                        <span className="sec-2-home-13__label-dot" aria-hidden="true"></span>
                        <span className="sec-2-home-13__label-text">THE FINE PRINT, IN PLAIN ENGLISH</span>
                    </div>
                    <h2 className="sec-2-home-13__title mb-0 reveal-text">
                        <RevealText>Everything you want to know before you invest.</RevealText>
                    </h2>
                </header>

                {/* Terms at a glance — reuses the Section 2 stat band */}
                <div className="sec-2-home-13__stats">
                    {TERMS.map((t) => (
                        <div key={t.label} className="sec-2-home-13__stat at_fade_anim" data-fade-from="left" data-fade-offset="24">
                            <div className="sec-2-home-13__stat-head">
                                <span className="sec-2-home-13__stat-tag">{t.label}</span>
                            </div>
                            <span className="sec-2-home-13__stat-num">{t.value}</span>
                            <span className="sec-2-home-13__stat-cap mb-0">{t.note}</span>
                        </div>
                    ))}
                </div>

                <div className="row g-5">
                    <div className="col-lg-8">
                        <ul className="list-unstyled m-0">
                            {FAQS.map((f, i) => {
                                const isOpen = open === i;
                                return (
                                    <li key={f.q} style={{ borderBottom: "1px solid var(--at-neutral-100)" }}>
                                        <button
                                            type="button"
                                            onClick={() => setOpen(isOpen ? -1 : i)}
                                            aria-expanded={isOpen}
                                            className="w-100 d-flex align-items-center justify-content-between gap-4 text-start"
                                            style={{ background: "transparent", border: 0, padding: "26px 0", cursor: "pointer" }}
                                        >
                                            <span style={Q_STYLE}>{f.q}</span>
                                            <span className="sec-5-home-13__card-toggle" style={{ transform: isOpen ? "rotate(45deg)" : "none", flexShrink: 0 }} aria-hidden="true">
                                                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                                    <path d="M9 3.75V14.25M3.75 9H14.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </span>
                                        </button>
                                        {isOpen && <p className="sec-5-home-13__card-text" style={{ marginTop: 0, paddingBottom: 28 }}>{f.a}</p>}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    <div className="col-lg-4">
                        <div style={{ background: "var(--at-neutral-0)", border: "1px solid var(--at-neutral-100)", borderRadius: 4, padding: "clamp(28px, 3vw, 42px)", height: "100%", display: "flex", flexDirection: "column" }}>
                            <h3 className="mb-3" style={{ fontFamily: "var(--at-ff-heading)", fontWeight: 600, fontSize: "clamp(22px, 2vw, 30px)", letterSpacing: "-0.04em", lineHeight: 1.05, color: "var(--at-neutral-950)" }}>Still have a question?</h3>
                            <p className="sec-2-home-13__stat-cap mb-4">Talk to a real person on the investor team — no bots, no pressure.</p>
                            <Link to="/auth" className="at-btn align-self-start mb-3">
                                <span><span className="text-1">Open an account</span><span className="text-2">Open an account</span></span>
                            </Link>
                            <a href="mailto:invest@phoxta.com" className="sec-2-home-13__label-text text-decoration-underline" style={{ color: "var(--at-theme-primary)" }}>invest@phoxta.com</a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
