import RevealText from "@/shared/effects/RevealText";

const PHASES = [
    { num: "01", week: "5 minutes", title: "Open your account", text: "Create an investor account, verify your identity, and link a funding source. No broker, no paperwork in disguise.", delivs: ["Sign up", "ID & KYC", "Link bank"], active: true, delay: ".1" },
    { num: "02", week: "Choose", title: "Pick your mix", text: "Choose a fixed Growth Note, a Credit Invest portfolio, or split across both. Set how much and for how long.", delivs: ["Growth Notes", "Credit Invest", "Set amount"], delay: ".25" },
    { num: "03", week: "Same day", title: "Fund & deploy", text: "Your deposit goes to work immediately — into platform notes, or auto-diversified across dozens of business advances.", delivs: ["Auto-allocate", "Diversify", "Confirmation"], delay: ".4" },
    { num: "04", week: "Monthly", title: "Earn & track", text: "Interest accrues daily and pays monthly. Watch your balance, returns and the businesses you back from one dashboard.", delivs: ["Monthly payout", "Live dashboard", "Statements"], delay: ".55" },
    { num: "05", week: "Anytime", title: "Compound or withdraw", text: "Reinvest your interest to compound, or withdraw it. At term, take your principal back or roll into a new note.", delivs: ["Reinvest", "Withdraw", "Roll over"], delay: ".7" },
];

export default function Section6() {
    return (
        <section className="sec-6-home-13" aria-label="How investing works">
            <div className="sec-6-home-13__dots" aria-hidden="true"></div>

            <div className="sec-6-home-13__inner">
                <header className="sec-6-home-13__header">
                    <div className="sec-6-home-13__head-left">
                        <div className="sec-6-home-13__label at_fade_anim" data-fade-from="left" data-delay=".05">
                            <span className="sec-6-home-13__label-dot" aria-hidden="true"></span>
                            <span className="sec-6-home-13__label-text">HOW IT WORKS</span>
                        </div>
                        <h2 className="sec-6-home-13__title mb-0 reveal-text">
                            <RevealText>From sign-up to your first payout, in five simple steps.</RevealText>
                        </h2>
                    </div>

                    <div className="sec-6-home-13__head-right">
                        <p className="sec-6-home-13__desc mb-0 at_fade_anim">
                            No brokers, no lock-you-in paperwork. Open an account, choose your mix, and your money goes to work the same day — with interest paid monthly.
                        </p>
                        <ul className="sec-6-home-13__metrics list-unstyled mb-0">
                            <li className="sec-6-home-13__metric at_fade_anim">
                                <span className="sec-6-home-13__metric-num">$500</span>
                                <span className="sec-6-home-13__metric-label">MINIMUM</span>
                            </li>
                            <li className="sec-6-home-13__metric at_fade_anim">
                                <span className="sec-6-home-13__metric-num">Monthly</span>
                                <span className="sec-6-home-13__metric-label">PAYOUTS</span>
                            </li>
                        </ul>
                    </div>
                </header>

                <div className="sec-6-home-13__timeline">
                    {PHASES.map((p) => (
                        <div key={p.num} className={`sec-6-home-13__phase${p.active ? " sec-6-home-13__phase--active" : ""} at_fade_anim`} data-fade-from="left" data-fade-offset="24" data-delay={p.delay}>
                            <div className="sec-6-home-13__phase-head">
                                <div className="sec-6-home-13__phase-id">
                                    <span className="sec-6-home-13__phase-dot" aria-hidden="true"></span>
                                    <span className="sec-6-home-13__phase-num">{p.num}</span>
                                </div>
                                <span className="sec-6-home-13__phase-week">{p.week}</span>
                            </div>
                            <div className="sec-6-home-13__phase-body">
                                <h3 className="sec-6-home-13__phase-title mb-0">{p.title}</h3>
                                <p className="sec-6-home-13__phase-text mb-0">{p.text}</p>
                            </div>
                            <div className="sec-6-home-13__phase-deliv">
                                <p className="sec-6-home-13__phase-deliv-label mb-0">WHAT HAPPENS</p>
                                <ul className="sec-6-home-13__phase-deliv-list list-unstyled mb-0">
                                    {p.delivs.map((d) => (
                                        <li key={d}><span aria-hidden="true">+</span><span>{d}</span></li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
