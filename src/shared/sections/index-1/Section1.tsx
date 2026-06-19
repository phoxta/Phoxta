import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import MainMenu from "@/shared/MainMenu";
import ThemeSwitcher from "@/shared/ThemeSwitcher";
// Homepage hero — copied from Home 4 (AI & Technology Agency) with the
// "How we work" video block carried over from the original homepage hero.
// The site navigation is rendered inside the hero (transparent, overlaying the
// background); the global layout header is suppressed for the homepage via
// MainLayout's `noHeader` prop.

const SEARCH_SVG = (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M18.7508 18.5233L13.5538 13.392M13.5538 13.392C14.9604 12.0032 15.7506 10.1196 15.7506 8.15551C15.7506 6.19144 14.9604 4.30782 13.5538 2.91902C12.1472 1.53022 10.2395 0.75 8.25028 0.75C6.26108 0.75 4.35336 1.53022 2.94678 2.91902C1.54021 4.30782 0.75 6.19144 0.75 8.15551C0.75 10.1196 1.54021 12.0032 2.94678 13.392C4.35336 14.7808 6.26108 15.561 8.25028 15.561C10.2395 15.561 12.1472 14.7808 13.5538 13.392Z"
            stroke="#fff"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const GRID_SVG = (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path
            d="M1 2C1 1.73478 1.10536 1.48043 1.29289 1.29289C1.48043 1.10536 1.73478 1 2 1H6C6.26522 1 6.51957 1.10536 6.70711 1.29289C6.89464 1.48043 7 1.73478 7 2V6C7 6.26522 6.89464 6.51957 6.70711 6.70711C6.51957 6.89464 6.26522 7 6 7H2C1.73478 7 1.48043 6.89464 1.29289 6.70711C1.10536 6.51957 1 6.26522 1 6V2ZM11 2C11 1.73478 11.1054 1.48043 11.2929 1.29289C11.4804 1.10536 11.7348 1 12 1H16C16.2652 1 16.5196 1.10536 16.7071 1.29289C16.8946 1.48043 17 1.73478 17 2V6C17 6.26522 16.8946 6.51957 16.7071 6.70711C16.5196 6.89464 16.2652 7 16 7H12C11.7348 7 11.4804 6.89464 11.2929 6.70711C11.1054 6.51957 11 6.26522 11 6V2ZM1 12C1 11.7348 1.10536 11.4804 1.29289 11.2929C1.48043 11.1054 1.73478 11 2 11H6C6.26522 11 6.51957 11.1054 6.70711 11.2929C6.89464 11.4804 7 11.7348 7 12V16C7 16.2652 6.89464 16.5196 6.70711 16.7071C6.51957 16.8946 6.26522 17 6 17H2C1.73478 17 1.48043 16.8946 1.29289 16.7071C1.10536 16.5196 1 16.2652 1 16V12ZM11 12C11 11.7348 11.1054 11.4804 11.2929 11.2929C11.4804 11.1054 11.7348 11 12 11H16C16.2652 11 16.5196 11.1054 16.7071 11.2929C16.8946 11.4804 17 11.7348 17 12V16C17 16.2652 16.8946 16.5196 16.7071 16.7071C16.5196 16.8946 16.2652 17 16 17H12C11.7348 17 11.4804 16.8946 11.2929 16.7071C11.1054 16.5196 11 16.2652 11 16V12Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

function HeroNav() {
    return (
        <div className="position-absolute top-0 start-0 w-100 z-index-3 pt-30 pt-md-40">
            <div className="container">
                <div className="row align-items-center">
                    <div className="col-6 col-xl-2">
                        <div className="at-header-logo">
                            <Link to="/" className="d-inline-flex align-items-center gap-2 text-decoration-none">
                                <img
                                    width={30}
                                    height={30}
                                    src="/assets/imgs/template/logo/favicon-dark.svg"
                                    alt="Phoxta"
                                    loading="lazy"
                                />
                                <h6 className="fw-700 fz-24 text-white mb-0">Phoxta</h6>
                            </Link>
                        </div>
                    </div>
                    <div className="col-xl-8 mx-auto d-none d-xl-flex justify-content-center">
                        <div className="at-main-menu menu-light d-inline-flex justify-content-center">
                            <nav className="at-mobile-menu-active">
                                <MainMenu />
                            </nav>
                        </div>
                    </div>
                    <div className="col-6 col-xl-2">
                        <div className="at-header-right gap-3 d-flex justify-content-end align-items-center text-white">
                            <button
                                type="button"
                                className="at-header-search-btn at-search-click"
                                aria-label="Search"
                            >
                                {SEARCH_SVG}
                            </button>
                            <div className="dark-light-mode text-white">
                                <ThemeSwitcher />
                            </div>
                            <button
                                type="button"
                                className="at-menu-bar at-header-sidebar-btn text-white"
                                aria-label="Open menu"
                            >
                                {GRID_SVG}
                            </button>
                            <Link className="at-btn at-btn-border-white text-white rounded-0 d-none d-md-block" to="/auth">
                                <span>
                                    <span className="text-1">Login</span>
                                    <span className="text-2">Login</span>
                                </span>
                            </Link>
                            <Link className="at-btn bg-white text-dark rounded-0 d-none d-md-block" to="/auth?mode=signup">
                                <span>
                                    <span className="text-1">Get started</span>
                                    <span className="text-2">Get started</span>
                                </span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

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
                    <HeroNav />
                    <div className="container p-relative z-index-1">
                        <div className="row align-items-start">
                            <div className="col-xxl-6 col-lg-6 mb-5 mb-lg-0 pe-xxl-5">
                                <h4 className="sec-1-home-4__headline fw-600 text-white mb-3 mb-md-4 lh-1">
                                    Own a business that <br className="d-none d-md-block" /> already works.
                                </h4>
                                <p className="text-white fz-font-lg mb-4 mb-md-5" style={{ opacity: 0.85, maxWidth: 540 }}>
                                    Pick a validated business, make it your own, and launch in minutes &mdash; complete with an AI agent that answers calls, chats and bookings across every channel from your console.
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
                                        <Link key={i} to="/product-archive" className="sec-1-home-4__tag">
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
