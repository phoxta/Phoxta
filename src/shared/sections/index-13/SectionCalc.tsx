import { useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import RevealText from "@/shared/effects/RevealText";

// Returns calculator, built in the home-13 design language.
// Growth Notes: A = P(1 + r/12)^n (compounded) or P·r/12 paid monthly.
// Credit Invest: target net yield on principal (variable, net of losses + fee).

type Note = { id: string; label: string; apr: number; months: number; min: number };
type Portfolio = { id: string; label: string; yld: number };

const PAD = "clamp(72px, 8vw, 120px) clamp(20px, 6vw, 96px)";

const NOTES: Note[] = [
    { id: "starter", label: "Starter · 12 mo · 7.0%", apr: 0.07, months: 12, min: 500 },
    { id: "core", label: "Core · 24 mo · 9.0%", apr: 0.09, months: 24, min: 5000 },
    { id: "growth", label: "Growth · 36 mo · 11.0%", apr: 0.11, months: 36, min: 25000 },
    { id: "anchor", label: "Anchor · 48 mo · 12.5%", apr: 0.125, months: 48, min: 100000 },
];
const PORTFOLIOS: Portfolio[] = [
    { id: "conserve", label: "Conserve · A–B · ~8%", yld: 0.08 },
    { id: "balanced", label: "Balanced · A–C · ~11%", yld: 0.11 },
    { id: "growthp", label: "Growth · A–D · up to 15%", yld: 0.15 },
];

const usd = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Math.round(n));
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

const FF = "var(--at-ff-heading)";
const field: CSSProperties = { fontFamily: FF, fontWeight: 600, border: "1px solid var(--at-neutral-100)", borderRadius: 4, background: "var(--at-neutral-0)", color: "var(--at-neutral-900)" };
const pill = (active: boolean): CSSProperties => ({
    flex: 1, fontFamily: FF, fontWeight: 600, fontSize: 13, letterSpacing: "-0.02em", padding: "11px 14px", borderRadius: 999,
    border: "1px solid var(--at-neutral-100)", cursor: "pointer",
    background: active ? "var(--at-neutral-900)" : "transparent",
    color: active ? "var(--at-neutral-0)" : "var(--at-neutral-700)",
});
const tile: CSSProperties = { border: "1px solid var(--at-neutral-100)", borderRadius: 4, padding: 16, background: "var(--at-neutral-0)", height: "100%" };
const tileVal: CSSProperties = { fontFamily: FF, fontWeight: 600, fontSize: 22, letterSpacing: "-0.03em", color: "var(--at-neutral-900)", lineHeight: 1.1 };

export default function SectionCalc() {
    const [product, setProduct] = useState<"notes" | "credit">("notes");
    const [amount, setAmount] = useState(10000);
    const [noteId, setNoteId] = useState("core");
    const [compound, setCompound] = useState(true);
    const [portId, setPortId] = useState("balanced");

    const note = NOTES.find((n) => n.id === noteId)!;
    const port = PORTFOLIOS.find((p) => p.id === portId)!;

    const r = useMemo(() => {
        const P = Math.max(0, amount);
        if (product === "notes") {
            const { apr, months } = note;
            if (compound) {
                const end = P * Math.pow(1 + apr / 12, months);
                const interest = end - P;
                return { big: end, bigLabel: "Projected value at maturity", monthly: interest / months, interest, termLabel: `${months} months`, rateLabel: `${pct(apr)} APR · ${pct(Math.pow(1 + apr / 12, 12) - 1)} APY`, note: "Interest compounds monthly and is returned with your principal at the end of the term." };
            }
            const monthly = P * apr / 12;
            const interest = monthly * months;
            return { big: P + interest, bigLabel: "Total returned (principal + interest)", monthly, interest, termLabel: `${months} months`, rateLabel: `${pct(apr)} fixed APR`, note: "Interest is paid to you every month; your principal is returned in full at the end of the term." };
        }
        const monthly = P * port.yld / 12;
        const annual = P * port.yld;
        return { big: annual, bigLabel: "Target income per year", monthly, interest: annual, termLabel: "Rolling / open-ended", rateLabel: `${pct(port.yld)} target net yield`, note: "Credit Invest returns are variable targets, net of expected losses and a servicing fee. Reinvest to compound, or withdraw monthly." };
    }, [product, amount, note, compound, port]);

    return (
        <section aria-label="Returns calculator" style={{ background: "var(--at-neutral-0)", padding: PAD }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "clamp(36px, 4vw, 56px)", width: "100%" }}>
                <div className="row g-4 align-items-end">
                    <div className="col-lg-8">
                        <div className="sec-2-home-13__label mb-3">
                            <span className="sec-2-home-13__label-dot" aria-hidden="true"></span>
                            <span className="sec-2-home-13__label-text">RETURNS CALCULATOR</span>
                        </div>
                        <h2 className="sec-2-home-13__title mb-0 reveal-text">
                            <RevealText>Estimate what your money could earn.</RevealText>
                        </h2>
                    </div>
                    <div className="col-lg-4">
                        <p className="sec-2-home-13__stat-cap mb-0">Move the amount and pick a product. Figures are illustrative, not a guarantee.</p>
                    </div>
                </div>

                <div style={{ border: "1px solid var(--at-neutral-100)", borderRadius: 4, overflow: "hidden", background: "var(--at-neutral-0)" }}>
                    <div className="row g-0">
                        {/* Controls */}
                        <div className="col-lg-6" style={{ padding: "clamp(28px, 3vw, 48px)" }}>
                            <div className="d-flex gap-2 mb-4">
                                <button type="button" style={pill(product === "notes")} onClick={() => setProduct("notes")}>Growth Notes</button>
                                <button type="button" style={pill(product === "credit")} onClick={() => setProduct("credit")}>Credit Invest</button>
                            </div>

                            <span className="sec-2-home-13__label-text d-block mb-2">Amount to invest</span>
                            <div className="d-flex align-items-center gap-2 mb-3">
                                <span style={{ ...tileVal, fontSize: "clamp(1.4rem,3vw,1.9rem)" }}>$</span>
                                <input type="number" min={500} step={500} value={amount}
                                    onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
                                    aria-label="Amount to invest"
                                    style={{ ...field, border: 0, padding: 0, background: "transparent", width: "100%", fontSize: "clamp(1.9rem,4vw,2.6rem)", letterSpacing: "-0.04em" }} />
                            </div>
                            <input type="range" min={500} max={250000} step={500} value={Math.min(amount, 250000)}
                                onChange={(e) => setAmount(Number(e.target.value))} aria-label="Amount slider"
                                className="form-range" style={{ accentColor: "var(--at-theme-primary)" }} />
                            <div className="d-flex justify-content-between sec-2-home-13__stat-cap mb-4"><span>$500</span><span>$250,000+</span></div>

                            {product === "notes" ? (
                                <>
                                    <span className="sec-2-home-13__label-text d-block mb-2">Choose a note</span>
                                    <select value={noteId} onChange={(e) => setNoteId(e.target.value)} aria-label="Choose a note" className="w-100 mb-4" style={{ ...field, padding: "12px 14px" }}>
                                        {NOTES.map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}
                                    </select>
                                    <div className="d-flex gap-2">
                                        <button type="button" style={pill(compound)} onClick={() => setCompound(true)}>Compound monthly</button>
                                        <button type="button" style={pill(!compound)} onClick={() => setCompound(false)}>Pay me monthly</button>
                                    </div>
                                    {amount < note.min && (
                                        <p className="sec-2-home-13__stat-cap mt-3 mb-0" style={{ color: "var(--at-theme-primary)" }}>The {note.label.split(" ·")[0]} Note has a minimum of {usd(note.min)}.</p>
                                    )}
                                </>
                            ) : (
                                <>
                                    <span className="sec-2-home-13__label-text d-block mb-2">Choose a portfolio</span>
                                    <select value={portId} onChange={(e) => setPortId(e.target.value)} aria-label="Choose a portfolio" className="w-100 mb-2" style={{ ...field, padding: "12px 14px" }}>
                                        {PORTFOLIOS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                                    </select>
                                    <p className="sec-2-home-13__stat-cap mb-0">Auto-diversified across dozens of vetted businesses, cushioned by a first-loss reserve.</p>
                                </>
                            )}
                        </div>

                        {/* Results */}
                        <div className="col-lg-6 d-flex flex-column" style={{ padding: "clamp(28px, 3vw, 48px)", background: "var(--at-neutral-50)" }}>
                            <span className="sec-2-home-13__stat-cap mb-1">{r.bigLabel}</span>
                            <span className="sec-2-home-13__stat-num">{usd(r.big)}</span>
                            <span className="mb-4 mt-2"><span className="sec-2-home-13__stat-tag">{r.rateLabel}</span></span>

                            <div className="row g-3 mb-4">
                                <div className="col-6"><div style={tile}><div className="sec-2-home-13__stat-cap mb-1">Avg. monthly income</div><div style={tileVal}>{usd(r.monthly)}</div></div></div>
                                <div className="col-6"><div style={tile}><div className="sec-2-home-13__stat-cap mb-1">{product === "credit" ? "Income per year" : "Total interest"}</div><div style={tileVal}>{usd(r.interest)}</div></div></div>
                                <div className="col-6"><div style={tile}><div className="sec-2-home-13__stat-cap mb-1">Term</div><div style={tileVal}>{r.termLabel}</div></div></div>
                                <div className="col-6"><div style={tile}><div className="sec-2-home-13__stat-cap mb-1">You invest</div><div style={tileVal}>{usd(amount)}</div></div></div>
                            </div>

                            <p className="sec-2-home-13__stat-cap mb-4">{r.note}</p>

                            {(() => {
                                const baseline = product === "notes" ? amount * 0.04 * (note.months / 12) : amount * 0.04;
                                const extra = r.interest - baseline;
                                return extra > 0 ? (
                                    <div className="mb-4" style={{ border: "1px dashed var(--at-neutral-100)", borderRadius: 4, padding: 14 }}>
                                        <span className="sec-2-home-13__stat-cap">That&rsquo;s about <strong style={{ color: "var(--at-neutral-900)" }}>{usd(extra)}</strong> more than a typical 4% savings account over the same period.</span>
                                    </div>
                                ) : null;
                            })()}

                            <Link to="/auth" className="at-btn mt-auto align-self-start">
                                <span><span className="text-1">Open an account</span><span className="text-2">Open an account</span></span>
                            </Link>
                        </div>
                    </div>
                </div>

                <p className="sec-2-home-13__stat-cap mb-0" style={{ maxWidth: 980 }}>
                    <strong style={{ color: "var(--at-neutral-900)" }}>Capital at risk.</strong> All rates are illustrative targets, not guarantees, and returns are not a bank deposit — not FDIC- or FSCS-insured.
                    Credit Invest returns vary with actual loan performance and may be lower than shown after defaults and fees. Growth Notes and Credit Invest are securities offered only under the
                    applicable exemptions; invest only after reading the offering documents. Past performance does not indicate future results.
                </p>
            </div>
        </section>
    );
}
