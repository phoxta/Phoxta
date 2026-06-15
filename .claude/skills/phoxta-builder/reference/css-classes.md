# Phoxta — CSS Class-Family Reference

All styling lives in **`public/assets/css/main.css`** (~864 KB) plus the vendor bundles, linked in `index.html`. There is **no CSS build step and no Tailwind** — you compose existing class names. This is the map of what exists so you reuse real classes instead of inventing ones with no backing rule.

## How to use this

- **Reuse classes that already exist.** If you need a style, search `main.css` for the family first:
  `rg -n '\.card_case__studies-metric' public/assets/css/main.css`
- **`sec-*` classes are section-scoped.** By far the largest family (~4000 rules). Each demo section ships its own `sec-<n>-<demo>` / `sec-<name>` block (e.g. `sec-1-home-4`, `sec-2-about`). When you build a new section, either (a) reuse an existing `sec-*` block's markup wholesale, or (b) build from the **design-system primitives + Bootstrap grid** (below), which are global and always available. Inventing a brand-new `sec-foo-bar` class does nothing until you add its rules to `main.css`.
- If you genuinely need new CSS, append a clearly-commented block to `main.css` (or add a small scoped stylesheet like `sticky-cards.css` and link it in `index.html`).

## Design-system primitives (`at-*`) — global, always safe to use

These are the reusable building blocks (not tied to one section):

| Class | Purpose |
|---|---|
| `at-btn` | Primary button/CTA. Pair with inner `span.text-1`/`span.text-2` (hover swap) + `<i>` holding two arrow SVGs. |
| `at-btn-border-white`, `at-btn-circle`, `at-btn-group` | Outline button, icon-only circular button, circle+label+circle cluster. |
| `at-link-swap` (+ `text-1`/`text-2`) | Hover text-swap for links/menus (used by `LinkSwap`). |
| `at-hero-area`, `at-about-area`, `at-service-area`, `at-brand-area`, `at-banner-thumb` | Major layout regions seen across demos. |
| `at-megamenu`, `at-megamenu-box`, `at-megamenu-title`, `at-submenu`, `submenu`, `has-dropdown` | Navigation dropdown/mega-menu structure (see `MainMenu.tsx`). |
| `at-header-area`, `at-header-logo`, `at-header-right`, `at-header-search-btn`, `at-menu-bar` | Header chrome + the DOM-class triggers `MainLayout` listens for. |
| `at_fade_anim` (+ `data-delay`, `data-fade-from`, `data-ease`) | Fade-in on scroll (effect: `FadeAnimEffect`). |
| `at-panel-pin-area`, `at-hover-item`, `at-offcanvas-gallery-img`, `at-magic-cursor` | Pinned panels, hover items, gallery, custom cursor (on `<body>`). |

## Token utilities — global (full detail in `design-system.md`)

- **Type:** `fz-10 18 24 60 120 150 170 180 200 240 290`, `fz-body`, `fz-ds-1`, `fz-font-{label,md,lg,xl,2xl,3xl}`; weights `fw-100…900`.
- **Color:** text `neutral-0…950` + `text-white`; background `bg-neutral-0…950`; `fill-primary` (SVG), `common-*` (CSS vars).
- **Spacing:** `pt-/pb-/mt-/mb-/ps-/pe-` incl. large steps (`pt-85 pt-100 pt-120 pt-150 pb-110 …`) from `spacing.css`; Bootstrap `gap-*`, `g-4`.
- **Layout:** Bootstrap grid (`container`, `container-2200`, `row`, `col-*`), `p-relative`, `z-index-1/2/3`, `overflow-hidden`, `fix`, `rounded-0/3/5/pill`, `bg-cover`, `img-cover`, `scale-up-img`, `w-100`, `h-100`.

## Component class families (scoped to their components)

Reuse these by reusing the corresponding card/section/component. Family → what it styles:

| Family | What it is |
|---|---|
| `card-*`, `card_case__studies*` | Card layouts (portfolio/case-study/blog/team cards). Pair with `src/shared/cards/*`. |
| `footer-*`, `at-footer-area`, `footer-fixed-bottom`, `footer-placeholder` | Footer variants 1–15 + floating footer reveal. |
| `header-*`, `menu-*`, `submenu`, `navigation-*` | Header + nav variants. |
| `slideshow*`, `swiper*`, `slider*`, `rail*`, `orbital*`, `minimap*`, `navigation` | Carousels/sliders (Swiper + custom). Use `components/SwiperDynamic`. |
| `testimonial*` | Testimonial sliders/cards. |
| `process*`, `skill*`, `journey-list*`, `block-journey` | Step/process lists, skill bars, timeline. |
| `postbox*`, `blog*`, `content-*` | Blog post / article layouts. |
| `team*`, `avatar*` | Team grids/cards. |
| `project*`, `alt-portfolio*`, `horizon*`, `vista*`, `curtain*`, `split*`, `stack*`, `zstack*` | Portfolio layout styles (classic + the creative scroll demos). |
| `cart*`, `checkout*`, `shop*`, `product*`, `deals*`, `price*` | E-commerce pages. |
| `countdown*` | Coming-soon countdown. |
| `moving*`, `mg-*`, `carouselTicker` | Marquee / moving galleries (`react-fast-marquee`, `CarouselTickerEffect`). |
| `scroll-*`, `anim-*`, `reveal-text`, `char-anim`, `scale-img-from-to`, `scroll-move-up`, `scroll-rotate` | Scroll/animation hooks consumed by the effects in `GlobalEffects.tsx`. |
| `nice-select`, `magnific*`, `odometer`, `mp-*` | Vendor widget styles (select, lightbox, animated counters). |

## State / behavior classes

`is-*` (e.g. `is-menu-open`), `active`, `has-dropdown`, `back-to-top-btn-show`, `header-sticky`, `changeless` (opt out of a transform/animation), `scale-up`.

## Finding the exact recipe

To match an existing look precisely, open the section that already has it and copy its markup verbatim, then look up any class you don't recognize:
```
rg -n 'journey-list__date|alt-portfolio-btn' public/assets/css/main.css
```
The `sections-catalog.md` lists which section each look lives in.
