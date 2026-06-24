import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import HeaderNav from "@/shared/header/HeaderNav";

// Home v2 hero — the studio homepage hero (sec-1-home-4 UI) with a sharper,
// outcome-led headline and an explicit DUAL CTA (primary: browse the
// marketplace · secondary: see how it works), per the conversion best-practice
// audit. UI/markup is unchanged from the studio template; only copy + the CTA
// group are new. The preview route renders with `noHeader`, so the hero carries
// the shared site nav itself (HeaderNav light), exactly like the live homepage.

const ARROW_SVG = (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M0.21967 9.40717C-0.0732232 9.70006 -0.0732232 10.1749 0.21967 10.4678C0.512563 10.7607 0.987437 10.7607 1.28033 10.4678L0.21967 9.40717ZM10.6875 0.75C10.6875 0.335786 10.3517 2.97145e-09 9.9375 1.50485e-07L3.1875 -2.70983e-07C2.77329 -2.70983e-07 2.4375 0.335786 2.4375 0.75C2.4375 1.16421 2.77329 1.5 3.1875 1.5H9.1875V7.5C9.1875 7.91421 9.52329 8.25 9.9375 8.25C10.3517 8.25 10.6875 7.91421 10.6875 7.5L10.6875 0.75ZM0.75 9.9375L1.28033 10.4678L10.4678 1.28033L9.9375 0.75L9.40717 0.21967L0.21967 9.40717L0.75 9.9375Z"
            fill="currentColor"
        />
    </svg>
);

const TAG_ARROW_SVG = (
    <svg xmlns="http://www.w3.org/2000/svg" width="9" height="10" viewBox="0 0 9 10" fill="none">
        <path
            d="M5.62494 9.99994L0.562517 10L0.5625 8.75003L4.49994 8.74996L4.5 2.39273L2.27828 4.86124L1.48278 3.97739L5.0625 0L8.64225 3.97739L7.84676 4.86124L5.625 2.3927L5.62494 9.99994Z"
            fill="currentColor"
        />
    </svg>
);

const CARDS_IMGS = [
    "/assets/imgs/template/wb1.webp",
    "/assets/imgs/template/wb2.webp",
    "/assets/imgs/template/wb3.webp",
];

const TAGS = ["E-commerce", "Local services", "Content & creator", "SaaS", "Marketplaces"];

export default function Hero() {
    const [videoOpen, setVideoOpen] = useState(false);

    useEffect(() => {
        if (!videoOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setVideoOpen(false);
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [videoOpen]);

    // Smooth-scroll to the How-it-works section. Native hash jumps don't work
    // under GSAP ScrollSmoother (the content is transform-translated), so route
    // through the live smoother instance when present, else fall back.
    const onSeeHow = async (e: React.MouseEvent) => {
        e.preventDefault();
        const el = document.getElementById("how-it-works");
        if (!el) return;
        try {
            const mod = await import("gsap/ScrollSmoother");
            // deno-lint-ignore no-explicit-any
            const ss = (mod.default as unknown as { get?: () => { scrollTo?: (t: Element, s?: boolean, p?: string) => void } | undefined })?.get?.();
            if (ss?.scrollTo) {
                ss.scrollTo(el, true, "top top");
                return;
            }
        } catch {
            /* fall through to native */
        }
        el.scrollIntoView({ behavior: "smooth" });
    };

    return (
        <div className="bg-neutral-50">
            {videoOpen &&
                createPortal(
                    <div
                        className="sec-1-home-4__video-modal position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
                        style={{ background: "rgba(0,0,0,.82)", zIndex: 1080 }}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Phoxta video"
                        onClick={() => setVideoOpen(false)}
                    >
                        <div className="p-relative" style={{ maxWidth: 960, width: "100%" }} onClick={(e) => e.stopPropagation()}>
                            <button
                                type="button"
                                className="btn-close btn-close-white position-absolute top-0 end-0 m-2"
                                style={{ zIndex: 1 }}
                                aria-label="Close video"
                                onClick={() => setVideoOpen(false)}
                            />
                            <video
                                className="w-100 d-block rounded-3"
                                style={{ maxHeight: "80vh", background: "#000" }}
                                controls
                                autoPlay
                                playsInline
                                preload="metadata"
                            >
                                <source src="/assets/imgs/video/video-2.mp4" type="video/mp4" />
                            </video>
                        </div>
                    </div>,
                    document.body,
                )}
            <div className="container-2200 sec-1-home-4-wrap p-relative z-0" style={{ paddingTop: 20 }}>
                <div
                    className="sec-1-home-4 bg-linear-opacity p-relative bg-cover mt-20 rounded-5 mx-lg-3 mx-2"
                    data-background="/assets/imgs/pages/bg-img-4.webp"
                >
                    <HeaderNav light />
                    <div className="container p-relative z-index-1">
                        <div className="row align-items-start">
                            <div className="col-xxl-6 col-lg-6 mb-5 mb-lg-0 pe-xxl-5">
                                <h4 className="sec-1-home-4__headline fw-600 text-white mb-3 mb-md-4 lh-1">
                                    Own a validated business that runs itself.
                                </h4>
                                <p className="text-white fz-font-lg mb-4 mb-md-5" style={{ opacity: 0.85, maxWidth: 540 }}>
                                    Pick a vetted, AI-powered business from the marketplace, make it your own — brand,
                                    domain and payments — and go live in days. A single AI agent runs sales and support
                                    across every channel, 24/7.
                                </p>

                                {/* Dual CTA — primary (browse) + secondary (how it works) */}
                                <div className="d-flex flex-wrap align-items-center gap-3 gap-md-4 mb-40">
                                    <div className="at-btn-group at_fade_anim" data-delay=".3" data-fade-from="bottom" data-ease="bounce">
                                        <Link to="/marketplace" className="at-btn-circle">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="15" viewBox="0 0 16 15" fill="none">
                                                <path d="M0.0001297 8.99993L0 3.00407e-05L2 0L2.0001 6.99993L12.1719 7.00003L8.22224 3.05027L9.63644 1.63606L16.0003 8.00003L9.63644 14.364L8.22224 12.9497L12.1719 9.00003L0.0001297 8.99993Z" fill="currentColor" />
                                            </svg>
                                        </Link>
                                        <Link to="/marketplace" className="at-btn z-index-1">
                                            Browse the marketplace
                                        </Link>
                                        <Link to="/marketplace" className="at-btn-circle">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="15" viewBox="0 0 16 15" fill="none">
                                                <path d="M0.0001297 8.99993L0 3.00407e-05L2 0L2.0001 6.99993L12.1719 7.00003L8.22224 3.05027L9.63644 1.63606L16.0003 8.00003L9.63644 14.364L8.22224 12.9497L12.1719 9.00003L0.0001297 8.99993Z" fill="currentColor" />
                                            </svg>
                                        </Link>
                                    </div>
                                    <a
                                        href="#how-it-works"
                                        onClick={onSeeHow}
                                        className="at-btn common-white text-uppercase bg-transparent rounded-0 p-0 pb-2"
                                        style={{ borderBottom: "1px solid rgba(255,255,255,.55)" }}
                                    >
                                        <span className="text-uppercase">
                                            <span className="text-1">See how it works</span>
                                            <span className="text-2">See how it works</span>
                                        </span>
                                        <i>
                                            {ARROW_SVG}
                                            {ARROW_SVG}
                                        </i>
                                    </a>
                                </div>

                                {/* "How we work" video block carried over from the studio hero */}
                                <div className="at-hero-video mt-10" style={{ maxWidth: 220 }}>
                                    <div className="rounded-3 overflow-hidden">
                                        <video
                                            className="img-cover"
                                            autoPlay
                                            muted
                                            loop
                                            playsInline
                                            poster="/assets/imgs/pages/img-2.webp"
                                        >
                                            <source src="/assets/imgs/video/video-2.mp4" type="video/mp4" />
                                        </video>
                                    </div>
                                    <button
                                        type="button"
                                        className="at-btn text-white rounded-0 bg-transparent px-0 pt-2 pb-3 border-0"
                                        onClick={() => setVideoOpen(true)}
                                    >
                                        <span>
                                            <span className="text-1">Phoxta</span>
                                            <span className="text-2">Phoxta</span>
                                        </span>
                                        <i>
                                            {ARROW_SVG}
                                            {ARROW_SVG}
                                        </i>
                                    </button>
                                </div>
                            </div>
                            <div className="col-xxl-4 col-lg-6 col-md-10 ms-lg-auto mt-lg-0 mt-4">
                                <div className="sec-1-home-4__cards d-flex gap-3 mb-4">
                                    {CARDS_IMGS.map((src, i) => (
                                        <div key={i} className="sec-1-home-4__card rounded-3 overflow-hidden">
                                            <img
                                                src={src}
                                                alt="phoxta"
                                                width={280}
                                                height={200}
                                                className="img-cover w-100 h-100" loading="lazy" />
                                        </div>
                                    ))}
                                </div>
                                <div className="sec-1-home-4__tags d-flex flex-wrap gap-3 mt-40">
                                    {TAGS.map((tag, i) => (
                                        <Link key={i} to="/marketplace" className="sec-1-home-4__tag">
                                            {tag}
                                            {TAG_ARROW_SVG}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
