# Businesses (per-tenant storefront apps)

Each business a customer runs on Phoxta is its **own application with its own stack and
backend** — separate from the platform dashboard (which lives in `../src`). This folder
holds the source of the businesses that have been built. They are independent projects:
install and run each on its own.

| Folder | Marketplace slug | Vertical | Stack | Run |
|---|---|---|---|---|
| `carento/` | `carento` | Automotive | Vite + React + TypeScript | `npm install` → `npm run dev` |
| `gearo/`   | `gearo`   | Furniture / eCommerce | Vite + React + TypeScript (Bootstrap) | `npm install` → `npm run dev` |
| `wamwam/`  | `wamwam`  | Experiences / Travel | Vite + React + TypeScript (Tailwind v4) | `npm install` → `npm run dev` |
| `restaurant-orders/` | `restaurant-orders` | Restaurant + Orders | Vite + React + TypeScript (custom CSS) | `npm install` → `npm run dev` |
| `niche-apparel/` | `niche-apparel` | Fashion / eCommerce | Vite + React + TypeScript (Phoxta `main.css`) | `npm install` → `npm run dev` |
| `ferne/`   | `ferne`   | Skincare / DTC eCommerce | Vite + React + TypeScript (own design system) | `npm install` → `npm run dev` |

> **Uniform stack:** all businesses are **Vite + React + TypeScript** (Carento's
> stack). Gearo was rebuilt from a static HTML template; WamWam was re-engineered from
> an earlier Next.js port — both into the uniform stack. Build each with `npm run build`.

> `node_modules`, `.next` and `dist` were not copied (they're regenerable). Run `npm install`
> in each folder before `npm run dev` / `npm run build`.

## Backend contract
**`CONTRACT.md`** (+ the copy-paste **`phoxta-client.ts`**) defines how a storefront
app connects to the shared backend: identify its tenant (baked `ORG_ID` or by host
via `app_resolve_domain`), connect with the anon key, and read org-scoped content
under RLS. The platform provisions the tenant (`app_provision_business`) and manages
its domains; the app just consumes them.

## How they connect to the platform
- They appear in the platform **Marketplace** as the listings with slugs `carento` and `wamwam`
  (seeded in `../supabase/migrations/0002_marketplace.sql`, `metadata.app` points back here).
- The platform does **not** embed or build these apps — it links out to each business's own
  deployment. Set a blueprint's `demo_url` (and a business's site URL) to the deployed address
  to make the platform's "Open business site" link work.
- This keeps the boundary the product model expects: one platform account layer, many
  independent per-business storefronts/backends.

## Deploying
Build and host each app independently — every one is a static Vite build.
Then point the matching marketplace listing's `demo_url` at the live URL.
