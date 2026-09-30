import { useRef, useState, type PointerEvent } from "react";
import { Link } from "react-router-dom";
import HeaderNav from "@/shared/header/HeaderNav";
import HeroChat from "./HeroChat";
import "@/styles/phoxta-landing.css";

const HERO_ASSETS = "/assets/imgs/pages/home-hero/figma";

export default function Section1() {
  const [heroVideoPlaying, setHeroVideoPlaying] = useState<boolean>(false);

  const portraitRef = useRef<HTMLDivElement>(null);

  const resetPortraitPosition = () => {
    portraitRef.current?.style.removeProperty("--phoxta-portrait-x");
    portraitRef.current?.style.removeProperty("--phoxta-portrait-y");
  };

  const handleHeroPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (
      (event.pointerType && event.pointerType !== "mouse") ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      (event.target instanceof Element &&
        event.target.closest(".phoxta-hero-chat"))
    ) {
      return;
    }

    const portrait = portraitRef.current;

    if (!portrait) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();

    const horizontal =
      (event.clientX - bounds.left) / bounds.width - 0.5;

    const vertical =
      (event.clientY - bounds.top) / bounds.height - 0.5;

    portrait.style.setProperty(
      "--phoxta-portrait-x",
      `${horizontal * 10}px`,
    );

    portrait.style.setProperty(
      "--phoxta-portrait-y",
      `${vertical * 8}px`,
    );
  };

  return (
    <>
      <HeaderNav placement="inline" />

      <section
        className="phoxta-home-hero"
        aria-labelledby="phoxta-home-heading"
      >
        <div
          className="phoxta-home-hero__surface"
          onPointerMove={handleHeroPointerMove}
          onPointerLeave={resetPortraitPosition}
        >
          {/* =====================================================
              RESPONSIVE HERO BACKGROUND
              AVIF first, WebP fallback
              ===================================================== */}
          <div
            className="phoxta-home-hero__artwork"
            aria-hidden="true"
          >
            <picture>
              {/* Mobile AVIF */}
              <source
                media="(max-width: 767px)"
                srcSet={`${HERO_ASSETS}/hero-background-mobile.avif`}
                type="image/avif"
              />

              {/* Mobile WebP fallback */}
              <source
                media="(max-width: 767px)"
                srcSet={`${HERO_ASSETS}/hero-background-mobile.webp`}
                type="image/webp"
              />

              {/* Desktop AVIF */}
              <source
                srcSet={`${HERO_ASSETS}/hero-background.avif`}
                type="image/avif"
              />

              {/* Desktop WebP fallback */}
              <source
                srcSet={`${HERO_ASSETS}/hero-background.webp`}
                type="image/webp"
              />

              {/* Final fallback */}
              <img
                className="phoxta-home-hero__image"
                src={`${HERO_ASSETS}/hero-background.webp`}
                alt=""
                width={1920}
                height={928}
                fetchPriority="high"
                decoding="async"
              />
            </picture>
          </div>

          {/* =====================================================
              MAIN HERO LAYOUT
              ===================================================== */}
          <div className="phoxta-home-hero__layout">
            {/* ===================================================
                LEFT COLUMN
                =================================================== */}
            <div className="phoxta-home-hero__left">
              <div className="phoxta-home-hero__copy">
                <h1 id="phoxta-home-heading">
                  Discover business
                  <strong>opportunities</strong>
                </h1>

                <p className="phoxta-home-hero__description">
                  Find opportunities backed by real market signals.
                  Understand the customer, market and evidence.
                </p>

                {/* ===============================================
                    MOBILE ACTIONS
                    =============================================== */}
                <div className="phoxta-home-hero__mobile-actions">
                  <Link
                    to="/businesses"
                    className="phoxta-home-hero__button phoxta-home-hero__button--secondary"
                  >
                    <span>Ready-to-launch Businesses</span>

                    <img
                      src={`${HERO_ASSETS}/play-v2.svg`}
                      alt=""
                      aria-hidden="true"
                    />
                  </Link>

                  <Link
                    to="/startup-school"
                    className="phoxta-home-hero__button phoxta-home-hero__button--mobile-school"
                  >
                    <span>Startup School</span>

                    <img
                      src={`${HERO_ASSETS}/arrow-right-v2.svg`}
                      alt=""
                      aria-hidden="true"
                    />
                  </Link>
                </div>

                {/* ===============================================
                    DESKTOP / TABLET BUSINESS CTA
                    =============================================== */}
                <Link
                  to="/businesses"
                  className="phoxta-home-hero__button phoxta-home-hero__button--secondary phoxta-home-hero__button--desktop-business"
                >
                  <span>Ready-to-launch Businesses</span>

                  <img
                    src={`${HERO_ASSETS}/play-v2.svg`}
                    alt=""
                    aria-hidden="true"
                  />
                </Link>
              </div>
            </div>

            {/* ===================================================
                CENTER COLUMN
                =================================================== */}
            <div className="phoxta-home-hero__center">
              <div
                className="phoxta-home-hero__portrait"
                ref={portraitRef}
              >
                <div className="phoxta-home-hero__portrait-window">
                  <video
                    className="phoxta-home-hero__portrait-video"
                    poster={`${HERO_ASSETS}/professional-contemplation.png`}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    aria-hidden="true"
                    onPlaying={() => setHeroVideoPlaying(true)}
                    onError={() => setHeroVideoPlaying(false)}
                  >
                    <source
                      src="/assets/imgs/video/video-2.mp4"
                      type="video/mp4"
                    />
                  </video>

                  <img
                    className="phoxta-home-hero__portrait-image phoxta-home-hero__portrait-poster"
                    src={`${HERO_ASSETS}/professional-contemplation.png`}
                    alt="A business founder considering her next opportunity"
                    width={896}
                    height={1201}
                    data-hidden={heroVideoPlaying}
                    decoding="async"
                  />
                </div>

                <div className="phoxta-home-hero__chat">
                  <HeroChat />
                </div>
              </div>
            </div>

            {/* ===================================================
                RIGHT COLUMN
                Hidden on mobile by CSS
                =================================================== */}
            <div className="phoxta-home-hero__right">
              <div className="phoxta-home-hero__school">
                <p className="phoxta-home-hero__school-description">
                  Learn how to identify real customer problems, understand
                  markets, test assumptions, design a business model and
                  launch with evidence — not guesswork.
                </p>

                <Link
                  to="/startup-school"
                  className="phoxta-home-hero__button phoxta-home-hero__button--outline"
                >
                  <span>Startup School</span>

                  <img
                    src={`${HERO_ASSETS}/arrow-right-v2.svg`}
                    alt=""
                    aria-hidden="true"
                  />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}