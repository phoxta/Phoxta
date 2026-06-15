# Phoxta — Architecture Reference

## Directory map (`src/`)

```
src/
  main.tsx                 # entry: React.StrictMode > BrowserRouter > App
  App.tsx                  # all <Routes>, grouped by <MainLayout> element
  layouts/
    MainLayout.tsx         # shared chrome + #smooth-wrapper/#smooth-content/main
  pages/
    <Name>Page.tsx         # one per route; PageMeta + composed sections
  seo/
    PageMeta.tsx           # <title> + optional <meta description>
  shared/
    MainMenu.tsx           # desktop+mobile nav (single source of truth)
    ThemeSwitcher.tsx
    PopupSearch.tsx
    header/   Header1..15, Topbar, HeaderInteractive
    footer/   Footer1..15, FooterFixedBottom
    sidebar/  SideBar
    sections/<group>/SectionN.tsx   # the reusable building blocks
    cards/    PortfolioCardN, ArticleCardN, TeamCardN, ProductCard
    elements/ OdometerCounter, BackToTop, Pagination, Sidebar
    components/ SwiperDynamic
    effects/  *Effect.tsx (GSAP) + GlobalEffects.tsx + SmoothScrollEffect.tsx
    hooks/    useDataBackground, useCollapse, useBackToTop, ...
    utils/    ImageHoverEffects, ...
    mobile-menu/ MobileMenuCloneContext (clones MainMenu into the hamburger)
public/
  assets/imgs/...          # webp images, svgs, fonts (served at /assets/...)
  assets/css/main.css      # the design system (~880KB), linked in index.html
  scripts/theme-init.js    # sets theme before paint
```

## Routing (`src/App.tsx`)

- Every route lives inside a `<Route element={<MainLayout .../>}>` group; the page is the inner `element`.
- Pattern:
  ```tsx
  <Route element={<MainLayout headerStyle={2} footerStyle={2} />}>
    <Route path="/your-path" element={<YourPage />} />
  </Route>
  ```
- Each `index-N` demo has its own group with matching `headerStyle={N} footerStyle={N}` and both `/index-N` and `/index-N-dark` paths.
- Generic content pages (about, services, contact, pricing, portfolio classic/details, shop, blog) share the big `headerStyle={2} footerStyle={2}` group.
- Full-bleed portfolio demos use `headerStyle={2} footerStyle={1} noFooter`.
- The catch-all `<Route path="*" element={<NotFoundPage />} />` is last.

## MainLayout internals (`src/layouts/MainLayout.tsx`)

- `HEADER_COMPONENTS` / `FOOTER_COMPONENTS` map the integer style → component (some styles fall back to `Header1`/`Footer1`).
- DOM structure that matters for scrolling:
  ```
  #smooth-wrapper
    #smooth-content.z-index-3
      main.{mainClass}        ← <Outlet/> renders the page here
      (footer or footer-placeholder)
    (Footer2 sibling, only when footerStyle===2 floating)
  ```
- Mounts once, shared across routes: `SmoothScrollEffect`, `GlobalEffects`, `ThemeRouteSync`, header, `SideBar`, `PopupSearch`, `BackToTop`.
- Manages `searchOpen` / `sidebarOpen` / `hamburgerMenuOpen` state and bridges DOM-class triggers (`.at-search-click`, `.at-header-sidebar-btn`, `.at-menu-bar`, `.at-header-menu-btn`) from ported headers.

## Smooth scrolling (`src/shared/effects/SmoothScrollEffect.tsx`)

- Creates one GSAP `ScrollSmoother` on `#smooth-wrapper`/`#smooth-content` (`smooth: 1.35`, `effects: true`, `smoothTouch: 0.15`).
- **SPA gotcha (already solved here):** ScrollSmoother caches total scroll height and does not recompute on client-side navigation. Without a refresh, a navigated-to page keeps the previous page's height and won't scroll (a hard refresh would "fix" it). The component handles this by:
  - a `ResizeObserver` on `#smooth-content` that debounces `ScrollTrigger.refresh()` whenever content height changes (route change, lazy images, "load more", font swaps), and
  - on every route change: scroll to top, re-scan `[data-speed]`/`[data-lag]`, and always call `smoother.refresh(true)`.
- Implication for new pages: keep content in normal document flow inside `<main>`; avoid collapsing the page to viewport height. Don't create your own competing ScrollSmoother.

## Effects system

- `GlobalEffects.tsx` renders every GSAP effect component **keyed by `location.pathname`**, so each effect remounts and re-initializes against the new page's DOM on navigation. It also runs hook effects: `useDataBackground()`, `useCollapse()`, `useImageHoverEffects()`.
- To animate, you add markup + `data-*`; the matching effect finds it. Catalog (class → effect):
  - `[data-speed]`, `[data-lag]` → ScrollSmoother parallax (`effects: true`).
  - `[data-background]` (+ `bg-cover`) → `useDataBackground` sets `background-image`.
  - `.at_fade_anim` (`data-delay`, `data-fade-from`, `data-ease`) → `FadeAnimEffect`.
  - `.scale-img-from-to` (`data-value-1`, `data-value-2`) → `ScaleImageScrollEffect`.
  - `.reveal-text` + `<RevealText>` → `RevealTextEffect`.
  - `.scroll-move-up` → `ScrollMoveUpEffect`. `.anim-zoomin` → `AnimZoominEffect`.
  - `.char-anim` → `CharAnimEffect`. `.parallax`/scene → `ParallaxEffect`/`ParallaxSceneEffect`.
  - Demo-specific pins: `Home8Sec8PinEffect`, `Home10Sec4/5/6PinEffect`, `Home12Sec2StackEffect`, `Home15Sec6FlipEffect`.
  - Misc: `CarouselTickerEffect`, `TextScrambleEffect`, `MagnificPopupEffect` (`.popup-video`), `CursorTrailEffect`, `ThrowableEffect`, `CardAwardPreviewEffect`, `AtItemAnimeEffect`, `AtBrandScrollEffect`, `ScrollRotateMove/IdleEffect`, `PanelPinEffect`.
- If you introduce a genuinely new animation, add a `*Effect.tsx` and register it in `GlobalEffects.tsx` with a `key={\`name-${key}\`}` — but prefer reusing existing data-attribute effects.

## Theme system

- `<html data-bs-theme="light">`; `public/scripts/theme-init.js` sets the saved theme before paint to avoid flash.
- `ThemeSwitcher` toggles it; `ThemeRouteSync` keeps theme consistent across routes; `/index-N-dark` routes render the same page with the dark header/footer group.

## Navigation (`src/shared/MainMenu.tsx`)

- Single source of truth for the primary nav; cloned into the mobile hamburger via `MainMenuRootList` (from `mobile-menu/MobileMenuCloneContext`). Edit here once → both menus update.
- Link arrays are typed `Item = { to: string; label: string }`.
- Three item shapes (see `templates/snippets.md`): **megamenu** (`at-megamenu` with `MegaColumn`s), **simple dropdown** (`ul.at-submenu.submenu`), **plain link** (`<li><MenuLink/></li>`).
- `LinkSwap` provides the hover text-swap (`.text-1`/`.text-2`).

## Dev / build

- `npm run dev` — Vite dev server on `http://localhost:5173` (`strictPort`).
- `npm run build` — `vite build`. `npm run preview` — preview the build.
- `npm run lint` / `lint:fix` — ESLint (flat config in `eslint.config.js`; ignores sibling project folders `1.Orisa_development/**`, `3.Orisa-Nextjs/**`).
