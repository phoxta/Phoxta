# Phoxta — Reproduce & Scaffold

**Read this first:** the Phoxta app cannot be regenerated from a text prompt. Its identity is **864 KB of hand-tuned `main.css` + 765 image assets + 224 bespoke section components**. None of that is recoverable from a description — a prompt would produce a *different* app in a similar spirit. The only exact copy of Phoxta is the Phoxta repository. This skill is for **extending** the app and for **standing up new apps that reuse Phoxta's design layer**, not for recreating it from scratch.

So "reproduce" here means one of two concrete, achievable workflows:

---

## A. Exact clone / run elsewhere (byte-for-byte)

To reproduce the running app on another machine or as a deploy:

1. Copy the **whole repo** (or `git clone`). The source of truth = `src/`, `public/`, `index.html`, `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig.json`, `eslint.config.js`.
2. `npm ci` (installs exactly from `package-lock.json`).
3. `npm run dev` (dev, port 5173) or `npm run build` → `npm run preview` (production build in `dist/`).

That is the complete, lossless reproduction. There is nothing a skill could add to make a prompt do this — the assets *are* the deliverable.

---

## B. Scaffold a NEW app from the Phoxta design layer

When you want a new project that **looks and behaves like Phoxta** but has its own content/routes. Reuse the design layer; replace the content layer.

### What to carry over verbatim (the design layer — do not rewrite)
- `public/assets/css/**` (especially `main.css`, `sticky-cards.css`, all `vendors/*`).
- `public/assets/fonts/**`, `public/scripts/theme-init.js`, and the `index.html` `<head>` (CSS links, Google Fonts, theme init, `<body class="at-magic-cursor">`).
- `src/shared/effects/**`, `src/shared/hooks/**`, `src/shared/utils/**`, `src/shared/mobile-menu/**` (the GSAP/scroll machinery).
- `src/layouts/MainLayout.tsx`, `src/seo/PageMeta.tsx`, `vite.config.ts` (the `@` alias), `tsconfig.json`.
- Any images under `public/assets/imgs/**` you actually use.

### What to author fresh (the content layer)
- `src/pages/*` — your pages (see `templates/Page.tsx`).
- `src/shared/sections/<group>/*` — your sections, built from the design-system primitives (see `templates/Section.tsx`, `reference/design-system.md`, `reference/css-classes.md`), or copied from Phoxta's `sections-catalog.md` and re-skinned.
- `src/shared/header/*`, `src/shared/footer/*`, `src/shared/MainMenu.tsx` — pick/trim the header & footer variants you need; rewrite the menu.
- `src/App.tsx` — your route table (see `templates/snippets.md`).
- `src/main.tsx` — unchanged shape (BrowserRouter → App).

### Minimum runnable skeleton
```
package.json (deps below) + vite.config.ts + tsconfig.json + index.html
public/assets/css/**  public/assets/fonts/**  public/scripts/theme-init.js
src/main.tsx  src/App.tsx  src/layouts/MainLayout.tsx  src/seo/PageMeta.tsx
src/shared/effects/**  src/shared/hooks/**  src/shared/utils/**  src/shared/mobile-menu/**
src/shared/header/Header1.tsx  src/shared/footer/Footer1.tsx  src/shared/MainMenu.tsx
src/shared/sections/<your-group>/Section1.tsx
src/pages/HomePage.tsx
```

### Runtime dependencies (from `package.json`)
`react` ^19, `react-dom` ^19, `react-router-dom` ^6, `bootstrap` ^5.3, `gsap` ^3.12, `swiper` ^11, `react-fast-marquee` ^1.6, `isotope-layout` ^3, `split-text`, `wowjs`.
Dev: `vite` ^6, `@vitejs/plugin-react`, `typescript` ^5.8, `@types/react(-dom)` ^19, ESLint stack.

---

## Hard requirements that carry into ANY reproduction

1. **UTF-8 without BOM** for every source file. Never bulk-edit via PowerShell `Get-Content`/`Set-Content -Encoding utf8` (PS 5.1 → Windows-1252 read + BOM write = mojibake on `® © — ' " …`). Use Edit/Write or `System.Text.UTF8Encoding($false)`.
2. **Keep the `#smooth-wrapper > #smooth-content > main` structure** in `MainLayout`, and keep `SmoothScrollEffect` with its `ResizeObserver`-based refresh, or SPA navigation will leave pages unscrollable until a hard refresh.
3. **CSS is linked in `index.html`, not imported in JS.** Keep the `<link>` order (vendors before `main.css`).
4. `@` path alias must be present in both `vite.config.ts` and `tsconfig.json`.

## Known cruft
- `src/shared/sections/index-1/Section7 home-4.tsx` — a stray, **unused** file (a space in the name; imported nowhere). Safe to ignore or delete; it is not part of any page.
