import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import HeaderNav from "@/shared/header/HeaderNav";
// Homepage hero. The shared site nav (HeaderNav) overlays the dark hero in its
// light variant — the same menu section used on every page. The global layout
// header is suppressed for the homepage via MainLayout's `noHeader` prop.

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

export default function Section1() {
    const [videoOpen, setVideoOpen] = useState(false);

    // Close the video popup on Escape.
    useEffect(() => {
        if (!videoOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setVideoOpen(false);
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [videoOpen]);

    return (
        <div className="bg-neutral-50">
            {/* Portal to <body> so the overlay isn't trapped inside the GSAP
                ScrollSmoother transform (which would break position: fixed). */}
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
                                    Deploy fully AI-automated <br /> businesses instantly.
                                </h4>
                                <p className="text-white fz-font-lg mb-4 mb-md-5" style={{ opacity: 0.85, maxWidth: 540 }}>
                                    Why build from scratch when you can buy pre-validated, niche businesses powered entirely by automated AI pipelines.
                                </p>

                                {/* "How we work" block carried over from the original homepage hero */}
                                <div className="at-hero-video mt-40" style={{ maxWidth: 220 }}>
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
