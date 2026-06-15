# CLAUDE.md — Phoxta

Phoxta is a multi-demo **creative-agency React template**: one SPA with 15 home "demos" and a large library of reusable sections/pages, styled by a big hand-tuned CSS file.

## Stack
- **Vite 6 + React 19 + TypeScript** (`strict`), **react-router-dom v6** (`BrowserRouter`).
- **Bootstrap 5 (CSS-only) + custom `public/assets/css/main.css`** — utility/component classes, **not Tailwind**, **not** imported in JS (linked in `index.html`).
- **GSAP ScrollSmoother/ScrollTrigger** for scrolling/animation, **Swiper**, **react-fast-marquee**.
- Path alias **`@/` → `src/`** (in `vite.config.ts` and `tsconfig.json`).

## Commands
- `npm run dev` — dev server, http://localhost:5173 (strict port).
- `npm run build` / `npm run preview` — production build / preview.
- `npm run lint` / `npm run lint:fix` — ESLint (flat config).

## Architecture (orientation)
- `src/main.tsx` → `BrowserRouter` → `src/App.tsx` (all `<Routes>`).
- Routes are grouped by a shared **`MainLayout`** that takes `headerStyle`/`footerStyle` (1–15), optional `noFooter`, `mainClass`. `footerStyle={2}` is the floating footer.
- `MainLayout` renders the shared chrome once and the page into `#smooth-wrapper > #smooth-content > main(<Outlet/>)`.
- **Pages** (`src/pages/<Name>Page.tsx`) render `<PageMeta title="Phoxta - …" />` + composed **sections** (`src/shared/sections/<group>/SectionN.tsx`).
- **Nav** lives in `src/shared/MainMenu.tsx` (shared by desktop + mobile via `mobile-menu/MobileMenuCloneContext`).
- **Animations are data-attribute driven**: add classes + `data-*` (`data-speed`, `at_fade_anim`, `reveal-text`, `data-background`, …) and the global effects in `src/shared/effects/GlobalEffects.tsx` apply them (re-keyed per route).

## ⚠️ Critical rules
1. **Save all source as UTF-8 *without* BOM.** Do NOT bulk-edit `.tsx/.ts/.html` with PowerShell `Get-Content`/`Set-Content -Encoding utf8` — PS 5.1 reads UTF-8 as Windows-1252 and writes a BOM, double-encoding `® © — ' " …` into mojibake (`Â®`). Use the editor's Edit/Write tools or `System.Text.UTF8Encoding($false)`.
2. **Keep page content in normal flow inside `<main>`.** GSAP ScrollSmoother drives scrolling; `src/shared/effects/SmoothScrollEffect.tsx` recomputes scroll height on navigation via a `ResizeObserver`. Don't add a competing ScrollSmoother or collapse the page to viewport height, or pages won't scroll after SPA navigation (only after a hard refresh).
3. **A new page needs both a `<Route>` in `src/App.tsx` and (if user-reachable) a menu entry in `src/shared/MainMenu.tsx`.**
4. Match existing style: inline SVGs as module-level consts, data arrays as consts, `<Link>` for internal nav, every `<img>` with explicit `width`/`height` + `loading="lazy"` + `alt`.

## Building new pages/sections/apps
Use the **`phoxta-builder` skill** (`.claude/skills/phoxta-builder/`). It has the full workflow, a catalog of all sections, the CSS class reference, templates, and the clone/scaffold guide. Invoke it for any "add a page / section / menu item / build in the Phoxta style" task.

## Known cruft
`src/shared/sections/index-1/Section7 home-4.tsx` is an unused stray file (space in name, imported nowhere) — safe to ignore/delete.
