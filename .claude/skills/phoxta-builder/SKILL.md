---
name: phoxta-builder
description: Build and edit pages, sections, components, routes, and menu items in the Phoxta React template (Vite + React 19 + TypeScript + Bootstrap 5 + GSAP ScrollSmoother), following its existing architecture and UI design system. Use whenever creating a new web page/app screen, adding or composing sections, building cards/elements, wiring routes, editing the navigation menu, or applying the Phoxta visual style (utility classes, buttons, scroll/reveal effects).
---

# Phoxta Builder

This skill encodes how the **Phoxta** front-end is built so new pages and apps look and behave like the rest of the codebase. It is a multi-demo creative-agency template: one React SPA with 15 home "demos" and a large library of reusable sections.

## Stack & conventions at a glance

- **Build:** Vite 6, React 19, TypeScript, `react-router-dom` v6 (`BrowserRouter`).
- **Path alias:** `@/` → `src/` (use `@/shared/...`, never long relative paths).
- **Styling:** Bootstrap 5 **CSS-only** + a large custom `main.css`, loaded via `<link>` in `index.html` (NOT imported in JS, NOT Tailwind). You style with **utility classes**, you do not write CSS unless extending `main.css` deliberately.
- **Animation:** GSAP ScrollSmoother/ScrollTrigger, driven by `data-*` attributes + global effect components. Also Swiper, `react-fast-marquee`.
- **Fonts:** DM Sans (Google Fonts, in `index.html`).
- **Theme:** light/dark via `data-bs-theme` on `<html>`; dark routes are `/index-N-dark`.

## ⚠️ Critical rules (read before editing)

1. **Save every source file as UTF-8 *without* BOM.** Never bulk-edit `.tsx`/`.ts`/`.html` with PowerShell `Get-Content`/`Set-Content -Encoding utf8` — Windows PowerShell 5.1 reads UTF-8 files as Windows-1252 and writes a BOM, which double-encodes `®  © — ' " …` into mojibake (`Â®`, `â€"`). Use the Edit/Write tools (or `node`/`rg`). If you must script it in .NET, read/write with `System.Text.UTF8Encoding($false)`.
2. **All page content must live inside `<main>`** (it renders into `#smooth-content`). GSAP ScrollSmoother drives scrolling; a `ResizeObserver` in `SmoothScrollEffect` recomputes scroll height on navigation, so normal flow-layout pages "just work." Do **not** give top-level sections a fixed `height`/`100vh` with clipped overflow that collapses page height.
3. **A new page needs a route.** Creating `XxxPage.tsx` does nothing until you add a `<Route>` in `src/App.tsx` under a `MainLayout` group. To make it reachable, also add a menu entry in `src/shared/MainMenu.tsx`.
4. **Match the surrounding style exactly:** inline SVG icons as module-level `const`s, data arrays as module-level `const`s, `Link` (not `<a>`) for internal nav, explicit `width`/`height` + `loading="lazy"` + `alt` on every `<img>`, 4-space indentation inside section JSX.

## Core workflow: add a new page

1. **Sections first.** Create one file per visual block in `src/shared/sections/<group>/SectionN.tsx` (group = a kebab-case folder, e.g. `pricing-pro`). See `templates/Section.tsx`.
2. **Page file.** Create `src/pages/XxxPage.tsx` that renders `<PageMeta title="Phoxta - Xxx" />` then composes the sections. See `templates/Page.tsx`.
3. **Route.** In `src/App.tsx`, import the page and add `<Route path="/xxx" element={<XxxPage />} />` inside an existing `MainLayout` group, or open a new `<Route element={<MainLayout headerStyle={n} footerStyle={n} />}>` group. Most content pages use `headerStyle={2} footerStyle={2}`.
4. **Navigation.** Add an item to the relevant array in `src/shared/MainMenu.tsx` (this menu is shared by desktop + mobile). See `templates/snippets.md`.
5. **Verify.** Dev server is `npm run dev` (port 5173, strict). Confirm the route renders, scrolls, and that special characters are intact.

## Layout & routing model

`main.tsx` → `BrowserRouter` → `App.tsx` (`<Routes>`). Routes are grouped by a shared `MainLayout` element that takes:
- `headerStyle` / `footerStyle`: integers `1–15` selecting a `HeaderN`/`FooterN` variant.
- `noFooter?`: omit the footer (used by full-screen portfolio demos).
- `mainClass?`: class on `<main>` (default `bg-neutral-0`; e.g. `bg-neutral-50`).
- `footerStyle={2}` is the **floating footer** (reveal-on-scroll, uses a placeholder).

`MainLayout` mounts the shared chrome once: `SmoothScrollEffect`, `GlobalEffects` (all GSAP effects, re-keyed per route), `ThemeRouteSync`, the header, `SideBar`, `PopupSearch`, `#smooth-wrapper > #smooth-content > main(<Outlet/>)`, the footer, and `BackToTop`.

## Effects are data-attribute driven

You almost never write animation JS. Add the right class + `data-*` and the corresponding global effect (in `src/shared/effects/`, listed in `GlobalEffects.tsx`) picks it up on route change. Common ones:
- `data-speed` / `data-lag` on an element → ScrollSmoother parallax.
- `data-background="/assets/imgs/..."` + `bg-cover` → sets background image (`useDataBackground`).
- `class="at_fade_anim" data-delay=".4" data-fade-from="bottom" data-ease="bounce"` → fade-in.
- `class="scale-img-from-to" data-value-1="1.5" data-value-2="1"` → scroll scale.
- `class="reveal-text"` wrapping `<RevealText>...</RevealText>` → text reveal.
- `class="scroll-move-up"`, `class="anim-zoomin"`, `class="char-anim"` → scroll/char animations.

Full catalog + design tokens are in the reference files below.

## Reference (load when needed)

- `reference/architecture.md` — directory map, routing details, layout internals, the full effects catalog, theme system, gotchas.
- `reference/design-system.md` — design tokens (font sizes, weights, neutral palette, spacing), button/link patterns, card & section anatomy, image rules.
- `reference/sections-catalog.md` — inventory of all 223 reusable sections (group/SectionN + what each is). **Check here to reuse an existing section before building new.**
- `reference/css-classes.md` — the class-family map of `main.css` (~116 families categorized): which classes are global design-system primitives vs. section-scoped, and how to find a class's exact rule. Read this before inventing class names.
- `reference/reproduce.md` — what "reproduce the app" actually means: exact clone (the repo+assets) vs. scaffolding a new app from Phoxta's design layer. Read when standing the app up elsewhere or forking the design.
- `templates/Page.tsx`, `templates/Section.tsx`, `templates/Card.tsx` — copy-paste starting points.
- `templates/snippets.md` — route registration + menu-item snippets (megamenu, simple dropdown, plain link) + a new-page checklist.

## Honest scope

This skill lets you **build new pages/sections/apps in the Phoxta style** and **navigate/extend** the codebase. It is **not** a snapshot that can regenerate the app from a prompt: Phoxta's look is 864 KB of bespoke `main.css` + 765 image assets + 223 unique section components, none of which a prompt reconstructs. To reproduce the running app exactly, copy the repo (`reference/reproduce.md`).
