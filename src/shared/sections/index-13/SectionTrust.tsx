import { Link } from "react-router-dom";
import RevealText from "@/shared/effects/RevealText";

// Built with the home-13 design language: __label eyebrow, __title reveal,
// and the __stats / __stat band reused from Section 2.

const PAD = "clamp(72px, 8vw, 120px) clamp(20px, 6vw, 96px)";

const ICON: Record<string, string> = {
    shield: "M12 2l8 4v6c0 5-3.4 8.3-8 10-4.6-1.7-8-5-8-10V6l8-4zM9.5 12l1.8 1.8L15 10",
    users: "M16 21v-2a4 4 0 00-8 0v2M12 11a4 4 0 100-8 4 4 0 000 8M22 21v-1a4 4 0 00-3-3.9",
    refresh: "M21 12a9 9 0 11-2.6-6.4M21 3v5h-5",
    file: "M14 3v5h5M9 13l2 2 4-4M8 3h6l5 5v11a1 1 0 01-1 1H8a1 1 0 01-1-1V4a1 1 0 011-1z",
};

const BADGES = [
    { tag: "[ 01 ]", d: "shield", title: "Segregated funds", sub: "Held separately from Phoxta, ring-fenced for you." },
    { tag: "[ 02 ]", d: "users", title: "We co-invest", sub: "A first-loss stake in every loan we originate." },
    { tag: "[ 03 ]", d: "refresh", title: "Back-up servicer", sub: "Loans keep performing even if we don't." },
    { tag: "[ 04 ]", d: "file", title: "Reg CF / Reg A+", sub: "Offered under securities exemptions, audited." },
];

const Glyph = ({ d }: { d: string }) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={ICON[d]} />
    </svg>
);

export default function SectionTrust() {
    return (
        <section aria-label="Built to be trusted" style={{ background: "var(--at-neutral-0)", padding: PAD }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "clamp(32px, 4vw, 56px)", width: "100%" }}>
                <div className="row g-4 align-items-end">
                    <div className="col-lg-8">
                        <div className="sec-2-home-13__label mb-3">
                            <span className="sec-2-home-13__label-dot" aria-hidden="true"></span>
                            <span className="sec-2-home-13__label-text">BUILT TO BE TRUSTED</span>
                        </div>
                        <h2 className="sec-2-home-13__title mb-0 reveal-text">
                            <RevealText>Returns to chase. Protections to lean on.</RevealText>
                        </h2>
                    </div>
                    <div className="col-lg-4 d-flex justify-content-lg-end align-items-end at_fade_anim" data-fade-from="bottom" data-delay=".2">
                        <Link to="/auth" className="at-btn">
                            <span><span className="text-1">Open an account</span><span className="text-2">Open an account</span></span>
                        </Link>
                    </div>
                </div>

                <div className="sec-2-home-13__stats">
                    {BADGES.map((b) => (
                        <div key={b.title} className="sec-2-home-13__stat at_fade_anim" data-fade-from="left" data-fade-offset="24">
                            <div className="sec-2-home-13__stat-head">
                                <span className="sec-2-home-13__stat-icon"><Glyph d={b.d} /></span>
                                <span className="sec-2-home-13__stat-tag">{b.tag}</span>
                            </div>
                            <span className="sec-2-home-13__label-text">{b.title}</span>
                            <span className="sec-2-home-13__stat-cap mb-0">{b.sub}</span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
