# Phoxta — Design System Reference

Style everything with **utility classes from `main.css`** (plus Bootstrap 5 grid/utilities). Do not add Tailwind, CSS Modules, or inline styles for layout. Below are the real tokens/classes used across the codebase.

## Layout & grid

- Bootstrap grid: `container`, `row`, `col-12`, `col-lg-6`, `col-xxl-4`, `g-4` (gutters), `gap-2/3/4`, `align-items-center/-end/-start`, `justify-content-center/-end`, `ms-auto`, `mx-auto`.
- Wide container: `container-2200` (extra-wide hero/section wrapper).
- Positioning/util: `p-relative`, `z-0`, `z-index-1`, `z-index-2`, `z-index-3`, `overflow-hidden`, `fix`, `d-flex`, `d-inline-flex`, `d-none d-xl-flex`, `w-100`, `h-100`.
- Rounding: `rounded-0`, `rounded-3`, `rounded-5`, `rounded-pill`.
- Backgrounds: `bg-cover` (with `data-background`), `bg-linear-opacity`, `bg-transparent`.

## Color palette (neutrals)

Text color classes: `neutral-0 100 200 300 50 500 700 800 900 950`, plus `text-white`.
Background classes: `bg-neutral-0 100 200 300 50 500 700 800 900 950`.
- `bg-neutral-0` is the default page background; `bg-neutral-50` a light alt; `bg-neutral-900`/`950` dark sections (pair with `text-white`).
- CSS variables exist for `--at-common-black/white`, `--at-neutral-*`, `--at-grey-1..5`, `--at-gradient-primary` if you ever extend `main.css`.

## Typography

- **Sizes:** `fz-10 fz-18 fz-24 fz-60 fz-120 fz-150 fz-170 fz-180 fz-200 fz-240 fz-290` (pixel-ish scale), semantic: `fz-body`, `fz-ds-1` (display headline), `fz-font-label fz-font-md fz-font-lg fz-font-xl fz-font-2xl fz-font-3xl`.
- **Weights:** `fw-100 … fw-900`.
- **Helpers:** `text-uppercase`, `lh-1` (line-height), `mb-0`, `text-nowrap`, `text-truncate-2` (clamp lines), `text-center`, `text-lg-end`, `common-underline`.
- Headings use normal `<h1>…<h6>` + size/weight classes (the tag is for semantics, the class sets the look). Font family is DM Sans globally.

## Spacing

Custom large spacing utilities (from `spacing.css`) follow Bootstrap-ish names with bigger steps. Seen in use: `pt-85 pt-120 pt-150 pt-60 pt-80 pt-40 pt-20`, `pb-110 pb-120 pb-60 pb-30`, `mt-10 mt-20 mt-40`, `mb-10 mb-15 mb-30 mb-4 mb-5`, plus responsive `pt-lg-8 mt-lg-8 pe-xxl-5 mx-lg-3`. A section typically opens with vertical padding like `pt-120 pb-120` (or `pt-150 pb-110`).

## Buttons & link patterns

**Primary button with hover text-swap + double-arrow** (the signature CTA):
```tsx
<Link to="/services-1" className="at-btn text-white rounded-0">
  <span>
    <span className="text-1">EXPLORE SOLUTIONS</span>
    <span className="text-2">EXPLORE SOLUTIONS</span>
  </span>
  <i>{ARROW_SVG}{ARROW_SVG}</i>
</Link>
```
Variants: `at-btn-border-white`, `at-btn-circle` (icon-only), `at-btn-group` (circle + label + circle cluster), `filter-btn btn-sm` (portfolio filters, toggle `active`).

**Menu/link hover swap** uses `LinkSwap` → `span.at-link-swap > span.text-1 + span.text-2`.

The repeated `ARROW_SVG` (two copies inside `<i>`) creates the slide-on-hover arrow. Define SVGs once as a module-level `const` and reuse.

## Images

Every `<img>` follows this exact shape:
```tsx
<img src="/assets/imgs/pages/img-87.webp" alt="phoxta" width={600} height={400}
     className="img-cover w-100 h-100" loading="lazy" />
```
- Path: `/assets/imgs/...` (served from `public/`). Prefer `.webp`.
- Always set `width`+`height` (reserves layout space so ScrollSmoother measures height correctly) and `loading="lazy"`.
- `img-cover` = object-fit cover. `alt` is descriptive or `"phoxta"` for decorative.

## Section anatomy

A section is a default-exported component returning a single `<section>`:
```tsx
export default function Section1() {
  return (
    <section className="sec-<name> pt-120 pb-120 bg-neutral-0 overflow-hidden">
      <div className="container">
        <div className="row align-items-end pb-60">
          {/* header row: eyebrow + heading + CTA */}
        </div>
        <div className="row g-4">
          {/* content grid */}
        </div>
      </div>
    </section>
  );
}
```
Conventions:
- Section class naming in the codebase is often `sec-<n>-<demo>` (e.g. `sec-1-home-4`, `sec-2-about`). For new work, a clear semantic name like `sec-pricing-plans` is fine — just keep it unique and use it as the styling hook.
- Module-level `const` arrays hold repeated data (cards, list items, tags); `.map()` them in JSX.
- Inline SVGs as module-level `const`s.
- Use `<Link to="...">` for internal navigation, `<a href>` only for external/mailto/tel (`target="_blank" rel="noopener noreferrer"` for external).
- 4-space indentation inside section files (matches existing files).

## Cards & elements (reuse before building)

- `cards/`: `PortfolioCard1..4`, `ArticleCard1..4`, `TeamCard1/2`, `ProductCard` — typed props, default export. Pass data in from the section.
- `elements/`: `OdometerCounter` (animated number, props `count`/`prefix`/`suffix`), `Pagination`, `BackToTop`, `Sidebar`.
- `components/SwiperDynamic` for carousels (Swiper). `react-fast-marquee` for tickers.

## Filter / load-more

`sections/portfolio-1/PortfolioFilterSort.tsx` is a render-prop component for filterable, paginated grids:
```tsx
<PortfolioFilterSort items={DATA}>
  {(visible, { hasMore, onLoadMore }) => ( /* render cards + Load more btn */ )}
</PortfolioFilterSort>
```
Reuse it for any filterable listing rather than reinventing filtering/pagination.

## Eyebrow / tagline pattern

Small label above a heading is commonly an `at-btn` styled as text, or a bracketed tagline:
```tsx
<span className="sec-... d-inline-block mb-30">[ AI & TECHNOLOGY AGENCY ]</span>
```
