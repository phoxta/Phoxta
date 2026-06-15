# Businesses (per-tenant storefront apps)

Each business a customer runs on Phoxta is its **own application with its own stack and
backend** — separate from the platform dashboard (which lives in `../src`). This folder
holds the source of the businesses that have been built. They are independent projects:
install and run each on its own.

| Folder | Marketplace slug | Vertical | Stack | Run |
|---|---|---|---|---|
| `carento/` | `carento` | Automotive | Vite + React + TypeScript | `npm install` → `npm run dev` |
| `travel/`  | `travel`  | Travel | Next.js | `npm install` → `npm run dev` |

> `node_modules`, `.next` and `dist` were not copied (they're regenerable). Run `npm install`
> in each folder before `npm run dev` / `npm run build`.

## How they connect to the platform
- They appear in the platform **Marketplace** as the listings with slugs `carento` and `travel`
  (seeded in `../supabase/migrations/0002_marketplace.sql`, `metadata.app` points back here).
- The platform does **not** embed or build these apps — it links out to each business's own
  deployment. Set a blueprint's `demo_url` (and a business's site URL) to the deployed address
  to make the platform's "Open business site" link work.
- This keeps the boundary the product model expects: one platform account layer, many
  independent per-business storefronts/backends.

## Deploying
Build and host each app independently (e.g. Carento → any static host; Travel → a Next.js host).
Then point the matching marketplace listing's `demo_url` at the live URL.
