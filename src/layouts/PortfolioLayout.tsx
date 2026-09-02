import { Outlet } from "react-router-dom";
import SmoothScrollEffect from "@/shared/effects/SmoothScrollEffect";
import GlobalEffects from "@/shared/effects/GlobalEffects";
import ThemeRouteSync from "@/shared/effects/ThemeRouteSync";
import BackToTop from "@/shared/elements/BackToTop";
import PortfolioHeader from "@/shared/portfolio/PortfolioHeader";
import PortfolioFooter from "@/shared/portfolio/PortfolioFooter";

/**
 * Standalone chrome for femi.phoxta.com — the personal portfolio.
 *
 * Deliberately NOT MainLayout: this is a separate site, so it drops the Phoxta
 * marketing header/menu, promo banner, search, and floating voice/chat widgets,
 * and brings its own header + footer. It keeps the shared scroll + animation
 * engine (SmoothScrollEffect / GlobalEffects), so all the `data-*` effects and
 * the smooth scroll behave exactly as they do on the rest of the app.
 *
 * The palette and type come straight from Phoxta's own design system: DM Sans
 * and main.css load globally (index.html), and the accent is Phoxta's brand
 * `--at-theme-primary`. The block below only adds the portfolio-specific pieces,
 * all scoped under `.fx-portfolio` so nothing leaks into the main app.
 */
const PORTFOLIO_CSS = `
.fx-portfolio{
  --pf-accent:#F0460E;
  --pf-ink:#1a191d;
  --pf-paper:#FEFEFE;
  --pf-muted:#6c6b72;
  --pf-line:rgba(20,18,22,.10);
  --pf-dark:#0e0d11;
  --pf-dark-soft:#171620;
  color:var(--pf-ink);
}
.fx-portfolio ::selection{background:var(--pf-accent);color:#fff}
.fx-portfolio .container-2200{max-width:1320px;margin-inline:auto;width:100%}

/* ── Header ─────────────────────────────────────────────── */
.pf-header{position:fixed;top:0;left:0;right:0;z-index:1000;padding:14px 0;transition:padding .3s ease,background .3s ease,box-shadow .3s ease,border-color .3s ease;border-bottom:1px solid transparent}
.pf-header.is-scrolled{padding:8px 0;background:rgba(254,254,254,.97);backdrop-filter:saturate(180%) blur(14px);-webkit-backdrop-filter:saturate(180%) blur(14px);border-bottom-color:var(--pf-line);box-shadow:0 6px 30px -20px rgba(0,0,0,.4)}
.pf-header__bar{gap:16px}
.pf-brand__mark{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:12px;background:var(--pf-ink);color:#fff;font-weight:700;font-size:15px;letter-spacing:.02em}
.pf-brand__mark--photo{overflow:hidden;padding:0;background:#fff;border:1px solid var(--pf-line)}
.pf-brand__mark--photo img{width:100%;height:100%;object-fit:cover;object-position:top center;border-radius:inherit;display:block}
.pf-header:not(.is-scrolled) .pf-brand__mark--photo{border-color:rgba(255,255,255,.35)}
.pf-brand__text{display:flex;flex-direction:column;line-height:1.05}
.pf-brand__name{color:var(--pf-ink);font-weight:700;font-size:16px}
.pf-brand__role{color:var(--pf-muted);font-size:11.5px;letter-spacing:.06em;text-transform:uppercase}
.pf-nav__link{color:var(--pf-ink);font-size:15px;font-weight:500;text-decoration:none;position:relative;padding:4px 0;opacity:.85;transition:opacity .2s ease}
.pf-nav__link::after{content:"";position:absolute;left:0;right:100%;bottom:-2px;height:2px;background:var(--pf-accent);transition:right .3s ease}
.pf-nav__link:hover{opacity:1}
.pf-nav__link:hover::after{right:0}
.pf-cta{align-items:center;padding:10px 18px;border-radius:999px;background:var(--pf-ink);color:#fff;font-weight:600;font-size:14px;text-decoration:none;transition:transform .2s ease,background .2s ease}
.pf-cta:hover{color:#fff;background:var(--pf-accent);transform:translateY(-1px)}
.pf-burger{width:42px;height:42px;border-radius:12px;border:1px solid var(--pf-line);background:var(--pf-paper);flex-direction:column;align-items:center;justify-content:center;gap:4px;cursor:pointer}
.pf-burger span{width:18px;height:2px;background:var(--pf-ink);border-radius:2px;transition:transform .2s}
.pf-mobile{overflow:hidden;max-height:0;opacity:0;transition:max-height .35s ease,opacity .25s ease;display:flex;flex-direction:column}
.pf-mobile.is-open{max-height:340px;opacity:1;margin-top:10px}
.pf-mobile__link{padding:12px 6px;border-bottom:1px solid var(--pf-line);color:var(--pf-ink);text-decoration:none;font-size:16px;font-weight:500}
.pf-mobile__link--accent{color:var(--pf-accent);border-bottom:0}

/* ── Buttons (text swap + arrow slide) ─────────────────────── */
.pf-btn{display:inline-flex;align-items:center;gap:10px;padding:14px 24px;border-radius:999px;font-weight:600;font-size:15px;text-decoration:none;border:1.5px solid transparent;cursor:pointer;transition:transform .25s ease,background .25s ease,color .25s ease,border-color .25s ease}
.pf-btn:hover{transform:translateY(-2px)}
.pf-btn>span{position:relative;display:inline-grid;overflow:hidden;line-height:1.25}
.pf-btn .text-1,.pf-btn .text-2{grid-area:1/1;transition:transform .4s cubic-bezier(.4,0,.2,1)}
.pf-btn .text-2{transform:translateY(130%)}
.pf-btn:hover .text-1{transform:translateY(-130%)}
.pf-btn:hover .text-2{transform:translateY(0)}
.pf-btn i{position:relative;display:inline-block;width:12px;height:12px;overflow:hidden}
.pf-btn i svg{position:absolute;top:1px;left:0;transition:transform .4s cubic-bezier(.4,0,.2,1)}
.pf-btn i svg:nth-child(2){transform:translate(-140%,140%)}
.pf-btn:hover i svg:nth-child(1){transform:translate(140%,-140%)}
.pf-btn:hover i svg:nth-child(2){transform:translate(0,1px)}
.pf-btn--dark{background:var(--pf-ink);color:#fff}
.pf-btn--dark:hover{background:var(--pf-accent);color:#fff}
.pf-btn--ghost{background:transparent;color:var(--pf-ink);border-color:var(--pf-line)}
.pf-btn--ghost:hover{border-color:var(--pf-ink)}
.pf-btn--light{background:#fff;color:var(--pf-ink)}
.pf-btn--light:hover{background:var(--pf-accent);color:#fff}
.pf-btn--outline{background:transparent;color:#fff;border-color:rgba(255,255,255,.35)}
.pf-btn--outline:hover{border-color:#fff}

/* ── Eyebrow + titles ──────────────────────────────────────── */
.pf-eyebrow{display:inline-flex;align-items:center;gap:9px;font-size:12.5px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--pf-muted)}
.pf-eyebrow__dot{width:7px;height:7px;border-radius:50%;background:var(--pf-accent);box-shadow:0 0 0 4px rgba(240,70,14,.16)}
.pf-eyebrow--light{color:rgba(255,255,255,.7)}
.pf-section-title{color:var(--pf-ink);letter-spacing:-.02em;font-size:clamp(30px,4.6vw,58px)!important;text-wrap:balance}
.pf-accent-word{color:var(--pf-accent)}

/* ── Hero ──────────────────────────────────────────────────── */
.pf-hero{padding-top:150px}
.pf-hero__title{color:var(--pf-ink);letter-spacing:-.03em;font-size:clamp(40px,6.4vw,82px)!important;text-wrap:balance}
.pf-hero__lede{color:var(--pf-muted);max-width:60ch;line-height:1.55}
.pf-now{border:1px solid var(--pf-line);border-radius:22px;padding:26px;background:linear-gradient(180deg,#fff, #f6f5f3);box-shadow:0 40px 80px -60px rgba(0,0,0,.4)}
.pf-now__status{display:inline-flex;align-items:center;gap:8px;font-size:12.5px;font-weight:600;color:var(--pf-ink);background:rgba(240,70,14,.09);border:1px solid rgba(240,70,14,.22);padding:6px 12px;border-radius:999px;margin-bottom:18px}
.pf-now__pulse{width:8px;height:8px;border-radius:50%;background:var(--pf-accent);box-shadow:0 0 0 0 rgba(240,70,14,.5);animation:pf-pulse 2s infinite}
@keyframes pf-pulse{0%{box-shadow:0 0 0 0 rgba(240,70,14,.5)}70%{box-shadow:0 0 0 10px rgba(240,70,14,0)}100%{box-shadow:0 0 0 0 rgba(240,70,14,0)}}
.pf-now__label{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--pf-muted);margin:0 0 6px}
.pf-now__role{font-size:22px;font-weight:700;color:var(--pf-ink);margin:0 0 3px;line-height:1.15}
.pf-now__at{font-size:15px;color:var(--pf-muted);margin:0 0 18px}
.pf-now__disc{font-size:13px;color:var(--pf-ink);border-top:1px solid var(--pf-line);padding-top:14px;font-weight:500}
.pf-stat{border-top:2px solid var(--pf-ink);padding-top:14px}
.pf-stat__value{display:block;font-size:clamp(34px,4vw,50px);font-weight:700;color:var(--pf-ink);line-height:1;letter-spacing:-.02em}
.pf-stat__label{display:block;font-size:13.5px;color:var(--pf-muted);margin-top:8px;max-width:20ch}

/* ── Hero over the dark section: header adapts to light text ─── */
.pf-header:not(.is-scrolled) .pf-brand__name{color:#fff}
.pf-header:not(.is-scrolled) .pf-brand__role{color:rgba(255,255,255,.68)}
.pf-header:not(.is-scrolled) .pf-nav__link{color:#fff}
.pf-header:not(.is-scrolled) .pf-brand__mark{background:#fff;color:var(--pf-ink)}
.pf-header:not(.is-scrolled) .pf-cta{background:#fff;color:var(--pf-ink)}
.pf-header:not(.is-scrolled) .pf-cta:hover{background:var(--pf-accent);color:#fff}
.pf-header:not(.is-scrolled) .pf-burger{background:transparent;border-color:rgba(255,255,255,.4)}
.pf-header:not(.is-scrolled) .pf-burger span{background:#fff}

/* ── Hero (Section8-style dark block with framed portrait) ──── */
.pf-hero--dark{position:relative}
.pf-hero--dark::before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(12,11,16,.5),rgba(12,11,16,.8));z-index:0}
.pf-hero--dark > .container{position:relative;z-index:1}
.pf-hero__eyebrow{font-size:12.5px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.72)}
.pf-hero__dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--pf-accent);box-shadow:0 0 0 4px rgba(240,70,14,.2)}
.pf-hero--dark h1{letter-spacing:-.025em;font-size:clamp(34px,4.6vw,58px);line-height:1.05}
.pf-hero__photo{box-shadow:0 50px 100px -55px rgba(0,0,0,.75);border:1px solid rgba(255,255,255,.1);aspect-ratio:5/6;background:#17161a;max-width:340px;margin-inline:auto}
.pf-hero__photo img{aspect-ratio:5/6;object-position:top center}
.pf-hero__badge{position:absolute;left:16px;bottom:16px;z-index:2;display:inline-flex;align-items:center;gap:8px;font-size:12.5px;font-weight:600;color:#fff;background:rgba(0,0,0,.5);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.22);padding:8px 14px;border-radius:999px}
.pf-hero__badge-dot{width:8px;height:8px;border-radius:50%;background:var(--pf-accent);box-shadow:0 0 0 0 rgba(240,70,14,.5);animation:pf-pulse 2s infinite}

/* Work-card CTA → case study / live site */
.pf-work__cta{color:var(--pf-accent);font-size:15px;width:max-content;transition:gap .2s ease,opacity .2s ease}
.pf-work__cta svg{transition:transform .2s ease}
.pf-work__cta:hover{color:var(--pf-accent);opacity:.85}
.pf-work__cta:hover svg{transform:translateX(3px)}

/* ── Project case study (/work/:slug) ──────────────────────── */
.pf-cs{--cs-accent:#6C5DD3;background:var(--pf-paper);color:var(--pf-ink)}
.pf-cs__dot{width:8px;height:8px;border-radius:50%;background:var(--cs-accent);box-shadow:0 0 0 4px color-mix(in srgb,var(--cs-accent) 22%,transparent);flex:none}
.pf-cs__eyebrow{font-size:12.5px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--pf-muted)}
.pf-cs__label{font-size:12.5px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--pf-muted)}
.pf-cs__body{color:var(--pf-muted);line-height:1.65}
.pf-cs__h2{color:var(--pf-ink);letter-spacing:-.02em;font-size:clamp(26px,3.4vw,44px)!important}
.pf-cs__h3{color:var(--pf-ink);letter-spacing:-.01em}

/* Hero — dark band so the header + the light UI shot both read well */
.pf-cs__hero{position:relative;background:var(--pf-dark);color:#fff;overflow:hidden}
.pf-cs__hero::before{content:"";position:absolute;width:620px;height:620px;right:-120px;top:-260px;border-radius:50%;background:var(--cs-accent);filter:blur(160px);opacity:.4;pointer-events:none}
.pf-cs__hero>.container-2200{position:relative;z-index:1}
.pf-cs__hero .pf-cs__eyebrow{color:rgba(255,255,255,.72)}
.pf-cs__back{color:rgba(255,255,255,.7)}
.pf-cs__back:hover{color:#fff}
.pf-cs__title{color:#fff;letter-spacing:-.03em}
.pf-cs__tagline{color:rgba(255,255,255,.82);max-width:44ch;line-height:1.4}
.pf-cs__meta{gap:0;border-top:1px solid rgba(255,255,255,.14);border-bottom:1px solid rgba(255,255,255,.14)}
.pf-cs__meta-item{padding:18px 34px 18px 0;margin-right:34px;border-right:1px solid rgba(255,255,255,.14);display:flex;flex-direction:column;gap:6px}
.pf-cs__meta-item:last-child{border-right:0;margin-right:0}
.pf-cs__meta-label{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.55)}
.pf-cs__meta-value{font-size:15px;font-weight:600;color:#fff}
@media (max-width:575px){.pf-cs__meta-item{border-right:0;padding:12px 0;margin-right:0;flex:0 0 50%}}

.pf-cs__btn{padding:13px 22px;border-radius:999px;font-size:14.5px;transition:transform .2s ease,background .2s ease,color .2s ease,border-color .2s ease}
.pf-cs__btn:hover{transform:translateY(-2px)}
.pf-cs__btn--solid{background:#fff;color:var(--pf-ink)}
.pf-cs__btn--solid:hover{background:var(--cs-accent);color:#fff}
.pf-cs__btn--ghost{border:1.5px solid rgba(255,255,255,.35);color:#fff}
.pf-cs__btn--ghost:hover{border-color:#fff;color:#fff}
.pf-cs__btn--light{background:#fff;color:var(--pf-ink)}
.pf-cs__btn--light:hover{background:var(--pf-accent);color:#fff}
.pf-cs__btn--outline{border:1.5px solid rgba(255,255,255,.35);color:#fff}
.pf-cs__btn--outline:hover{border-color:#fff;color:#fff}
.pf-cs__btn--dark{background:var(--pf-ink);color:#fff}
.pf-cs__btn--dark:hover{background:var(--cs-accent);color:#fff}

.pf-cs__ds-shot{transition:transform .3s ease}
.pf-cs__ds-shot:hover{transform:translateY(-4px)}
.pf-cs__ds-shot .pf-cs__shot{transition:box-shadow .3s ease}
.pf-cs__ds-shot:hover .pf-cs__shot{box-shadow:0 50px 110px -60px rgba(15,14,25,.75)}

.pf-cs__shot{border-radius:18px;overflow:hidden;border:1px solid var(--pf-line);box-shadow:0 40px 90px -60px rgba(15,14,25,.7);background:#fff}
.pf-cs__shot--hero{border-color:rgba(255,255,255,.12)}
.pf-cs__shot img{display:block}
.pf-cs__shot--phone{max-width:340px;border-radius:26px}

/* Body sections */
.pf-cs__divider{border-top:1px solid var(--pf-line)}
.pf-cs__lead{color:var(--pf-ink);letter-spacing:-.01em;line-height:1.35!important}
.pf-cs__goal{background:#fff;border:1px solid var(--pf-line);border-radius:18px;padding:26px}
.pf-cs__goal-no{font-size:14px;font-weight:700;color:var(--cs-accent);letter-spacing:.04em}
.pf-cs__goal-title{font-size:18px;font-weight:600;color:var(--pf-ink)}
.pf-cs__goal-body{color:var(--pf-muted);font-size:14.5px;line-height:1.55}

.pf-cs__process{counter-reset:step}
.pf-cs__step{display:flex;gap:24px;padding:26px 0;border-top:1px solid var(--pf-line)}
.pf-cs__step:first-child{border-top:0;padding-top:0}
.pf-cs__step-no{font-size:14px;font-weight:700;color:var(--cs-accent);flex:none;padding-top:4px;min-width:28px}
.pf-cs__step-title{font-size:19px;font-weight:600;color:var(--pf-ink)}

.pf-cs__wide{background:#fff;border:1px solid var(--pf-line);border-radius:22px;padding:40px}
.pf-cs__wide-copy{max-width:70ch}

.pf-cs__palette{gap:14px}
.pf-cs__swatch{display:flex;flex-direction:column;gap:8px}
.pf-cs__swatch-chip{display:flex;align-items:flex-end;justify-content:flex-start;width:120px;height:76px;border-radius:12px;padding:8px 10px;font-size:11px;font-weight:600;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;border:1px solid var(--pf-line)}
.pf-cs__swatch-name{font-size:12.5px;font-weight:600;color:var(--pf-ink)}
.pf-cs__chips{gap:9px}
.pf-cs__chip{font-size:13px;font-weight:500;color:var(--pf-ink);background:#fff;border:1px solid var(--pf-line);border-radius:999px;padding:8px 15px}

.pf-cs__outcome-item{padding:16px 0;border-top:1px solid var(--pf-line)}
.pf-cs__outcome-item:first-child{border-top:0}
.pf-cs__outcome-dot{width:9px;height:9px;border-radius:50%;background:var(--cs-accent);flex:none;margin-top:10px}

/* CTA band */
.pf-cs__cta .pf-cs__eyebrow--light{color:rgba(255,255,255,.7)}
.pf-cs__cta-title{color:#fff;letter-spacing:-.02em}
.pf-cs__cta-lede{color:rgba(255,255,255,.72);max-width:52ch}

/* ── Clients marquee ───────────────────────────────────────── */
.pf-clients{background:var(--pf-dark)!important}
.pf-clients__label{font-size:12.5px;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.5)}
.pf-clients__item{display:inline-flex;align-items:center;font-size:clamp(20px,2.4vw,30px);font-weight:600;color:rgba(255,255,255,.82);margin:0 34px;letter-spacing:-.01em}
.pf-clients__star{display:inline-flex;color:var(--pf-accent);margin-left:34px}

/* ── About ─────────────────────────────────────────────────── */
.pf-about__portrait{position:relative;border-radius:22px;overflow:hidden;aspect-ratio:5/6;background:var(--pf-ink);box-shadow:0 40px 90px -60px rgba(0,0,0,.6);isolation:isolate}
.pf-about__photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:top center;z-index:2}
.pf-about__mono--xl{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;width:100%;height:100%;border-radius:0;background:linear-gradient(160deg,#232228,#0e0d11);color:rgba(255,255,255,.9);font-size:96px;font-weight:700;z-index:1}
.pf-about__badge{position:absolute;left:14px;bottom:14px;z-index:3;display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:600;color:#fff;background:rgba(0,0,0,.42);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.24);padding:7px 13px;border-radius:999px}
.pf-about__badge::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--pf-accent);box-shadow:0 0 0 0 rgba(240,70,14,.5);animation:pf-pulse 2s infinite}
.pf-about__card{display:inline-flex;align-items:center;gap:14px;border:1px solid var(--pf-line);border-radius:16px;padding:14px 18px;background:#fff}
.pf-about__mono{display:inline-flex;align-items:center;justify-content:center;width:52px;height:52px;border-radius:14px;background:var(--pf-ink);color:#fff;font-weight:700;font-size:19px}
.pf-about__name{font-weight:700;font-size:16px;color:var(--pf-ink)}
.pf-about__meta{font-size:13px;color:var(--pf-muted)}
.pf-about__lead{color:var(--pf-ink);line-height:1.6;max-width:60ch}
.pf-principle{padding:22px;border:1px solid var(--pf-line);border-radius:18px;height:100%;background:#fff;transition:transform .3s ease,box-shadow .3s ease,border-color .3s ease}
.pf-principle:hover{transform:translateY(-4px);box-shadow:0 30px 60px -50px rgba(0,0,0,.5);border-color:rgba(20,18,22,.2)}
.pf-principle__no{font-size:13px;font-weight:700;color:var(--pf-accent);letter-spacing:.04em}
.pf-principle__title{font-size:18px;font-weight:700;color:var(--pf-ink);margin:10px 0 6px}
.pf-principle__body{font-size:14.5px;color:var(--pf-muted);line-height:1.55}

/* ── Work / case studies ───────────────────────────────────── */
.pf-work__note{color:var(--pf-muted);font-size:15px;line-height:1.5}
.pf-work__note--light{color:rgba(255,255,255,.6)}
.pf-case__visual{position:relative;border-radius:22px;overflow:hidden;aspect-ratio:4/3;border:1px solid var(--pf-line)}
.pf-case__visual img{transition:transform .8s cubic-bezier(.2,.7,.2,1)}
.pf-case:hover .pf-case__visual img{transform:scale(1.05)}
.pf-case__visual::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(14,13,17,0) 40%,rgba(14,13,17,.55))}
.pf-case__visual--dark::after{background:linear-gradient(180deg,rgba(14,13,17,.15) 20%,rgba(14,13,17,.7))}
.pf-case__badge{position:absolute;top:16px;left:16px;z-index:2;font-size:12px;font-weight:600;letter-spacing:.04em;color:#fff;background:rgba(0,0,0,.42);backdrop-filter:blur(6px);padding:7px 13px;border-radius:999px;border:1px solid rgba(255,255,255,.22)}
.pf-case__meta{display:flex;align-items:center;gap:14px;margin-bottom:14px}
.pf-case__index{font-size:13px;font-weight:700;color:var(--pf-accent)}
.pf-case__period{font-size:13px;color:var(--pf-muted);letter-spacing:.02em}
.pf-case__title{font-size:clamp(26px,3vw,38px);font-weight:700;color:var(--pf-ink);letter-spacing:-.02em;margin:0 0 4px}
.pf-case__role{font-size:15px;font-weight:600;color:var(--pf-accent);margin:0 0 14px}
.pf-case__summary{font-size:15.5px;color:var(--pf-muted);line-height:1.6;margin:0 0 18px;max-width:56ch}
.pf-case__list{display:flex;flex-direction:column;gap:10px}
.pf-case__list li{position:relative;padding-left:28px;font-size:14.5px;color:var(--pf-ink);line-height:1.5}
.pf-case__check{position:absolute;left:0;top:2px;display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:6px;background:rgba(240,70,14,.12);color:var(--pf-accent)}

/* ── Chips ─────────────────────────────────────────────────── */
.pf-chip{display:inline-flex;align-items:center;font-size:12.5px;font-weight:600;color:var(--pf-ink);background:rgba(20,18,22,.05);border:1px solid var(--pf-line);padding:6px 12px;border-radius:999px}
.pf-chip--lg{font-size:14px;padding:9px 16px}
.pf-tagline{display:inline-flex;align-items:center;font-size:12px;font-weight:500;color:var(--pf-muted);border:1px dashed var(--pf-line);padding:5px 11px;border-radius:8px}

/* ── Capabilities ──────────────────────────────────────────── */
.pf-cap{position:relative;padding:28px;border:1px solid var(--pf-line);border-radius:20px;height:100%;background:#fff;overflow:hidden;transition:transform .3s ease,box-shadow .3s ease,border-color .3s ease}
.pf-cap::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--pf-accent);transform:scaleY(0);transform-origin:top;transition:transform .35s ease}
.pf-cap:hover{transform:translateY(-5px);box-shadow:0 40px 70px -55px rgba(0,0,0,.5);border-color:rgba(20,18,22,.16)}
.pf-cap:hover::before{transform:scaleY(1)}
.pf-cap__no{font-size:13px;font-weight:700;color:var(--pf-accent)}
.pf-cap__title{font-size:20px;font-weight:700;color:var(--pf-ink);margin:12px 0 8px}
.pf-cap__body{font-size:14.5px;color:var(--pf-muted);line-height:1.55;margin:0 0 16px}

/* ── Experience timeline (dark) ────────────────────────────── */
.pf-exp{background:var(--pf-dark)!important}
.pf-timeline{position:relative;padding-left:0}
.pf-timeline__item{position:relative;padding:0 0 34px 34px;border-left:1px solid rgba(255,255,255,.14)}
.pf-timeline__item:last-child{padding-bottom:0}
.pf-timeline__node{position:absolute;left:-7px;top:4px;width:13px;height:13px;border-radius:50%;background:var(--pf-dark);border:2px solid var(--pf-accent)}
.pf-timeline__head{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:8px}
.pf-timeline__title{font-size:20px;font-weight:700;color:#fff;margin:0}
.pf-timeline__period{font-size:13px;color:rgba(255,255,255,.55);letter-spacing:.02em;white-space:nowrap}
.pf-timeline__company{font-size:14.5px;font-weight:600;color:var(--pf-accent);margin:4px 0 8px}
.pf-timeline__blurb{font-size:14.5px;color:rgba(255,255,255,.66);line-height:1.55;max-width:70ch}

/* ── Skills ────────────────────────────────────────────────── */
.pf-skillcol{padding:26px;border:1px solid var(--pf-line);border-radius:20px;height:100%;background:#fff}
.pf-skillcol__label{font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--pf-ink);margin:0 0 16px;padding-bottom:14px;border-bottom:1px solid var(--pf-line)}

/* ── Credentials ───────────────────────────────────────────── */
.pf-cred__edu{padding-bottom:18px;border-bottom:1px solid var(--pf-line)}
.pf-cred__edu:last-child{border-bottom:0}
.pf-cred__edu-title{font-size:18px;font-weight:700;color:var(--pf-ink)}
.pf-cred__edu-org{font-size:14px;color:var(--pf-muted);margin-top:4px}
.pf-cred__year{font-size:13px;font-weight:600;color:var(--pf-accent);white-space:nowrap}
.pf-cred__label{font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--pf-ink)}
.pf-cert{padding:18px;border:1px solid var(--pf-line);border-radius:14px;height:100%;background:#fff;transition:border-color .25s ease,transform .25s ease}
.pf-cert:hover{border-color:rgba(20,18,22,.2);transform:translateY(-2px)}
.pf-cert__title{font-size:15px;font-weight:600;color:var(--pf-ink);line-height:1.35}
.pf-cert__org{font-size:13px;color:var(--pf-muted);margin-top:5px}

/* ── Contact (dark) ────────────────────────────────────────── */
.pf-contact{background:var(--pf-dark)!important}
.pf-contact__title{color:#fff;letter-spacing:-.03em;font-size:clamp(40px,8vw,104px)!important;text-wrap:balance}
.pf-contact__lede{color:rgba(255,255,255,.66);max-width:52ch;line-height:1.55}
.pf-contact__link{color:rgba(255,255,255,.82);font-size:15.5px;text-decoration:none;transition:color .2s ease;overflow-wrap:anywhere}
.pf-contact__link:hover{color:#fff}
.pf-contact__link--static{cursor:default}
.pf-contact__sep{color:rgba(255,255,255,.3)}

/* ── Footer ────────────────────────────────────────────────── */
.pf-footer{background:var(--pf-dark)!important}
.pf-brand--footer .pf-brand__mark{background:var(--pf-accent)}
.pf-footer__line{color:rgba(255,255,255,.6);font-size:14.5px;line-height:1.6;max-width:44ch}
.pf-foot-label{font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.45)}
.pf-foot-link{color:rgba(255,255,255,.72);font-size:14.5px;text-decoration:none;transition:color .2s ease;overflow-wrap:anywhere}
.pf-foot-link:hover{color:var(--pf-accent)}
.pf-footer__base{border-top:1px solid rgba(255,255,255,.12)}
.pf-footer__fine{font-size:12.5px;color:rgba(255,255,255,.42)}

/* ── Fade-in default (in case an effect misses) ────────────── */
.fx-portfolio .at_fade_anim{opacity:1}

@media (max-width:991px){
  .pf-hero{padding-top:120px}
  .pf-now{margin-top:8px}
}
@media (prefers-reduced-motion:reduce){
  .pf-now__pulse{animation:none}
  .pf-btn,.pf-case__visual img,.pf-principle,.pf-cap{transition:none}
}
`;

export default function PortfolioLayout() {
    return (
        <div className="fx-portfolio">
            <style>{PORTFOLIO_CSS}</style>
            <SmoothScrollEffect />
            <GlobalEffects />
            <ThemeRouteSync />
            <PortfolioHeader />
            <div id="smooth-wrapper">
                <div id="smooth-content" className="z-index-3">
                    <main className="bg-neutral-0">
                        <Outlet />
                    </main>
                    <PortfolioFooter />
                </div>
            </div>
            <BackToTop />
        </div>
    );
}
