# Ferne — botanical skincare storefront

A direct-to-consumer skincare store, and one of the businesses sold on the Phoxta
marketplace (blueprint slug `ferne`, £3,000). It began as a portfolio case study
built as a static front end; this is that design re-engineered as a real,
multi-tenant application on the shared Phoxta backend.

```bash
npm install
npm run dev        # http://localhost:3013
npm run build      # typecheck + production build
npm run lint
```

## Stack

Vite 6 · React 19 · TypeScript (strict) · react-router-dom 6 · `@supabase/supabase-js`.
No CSS framework: `src/styles/ferne.css` is the design system — tokens for the
sage-on-sand palette, Fraunces for headlines and Manrope for everything else.

## Multi-tenant by host

One deployment serves **every** buyer of this blueprint. On boot it resolves which
business it is serving from the request hostname (`app_resolve_domain`), or from a
baked `VITE_ORG_ID` for a single-tenant deploy, then loads that org's own
catalogue, content and AI agent. Row-level security scopes every query, so the
anon key is safe in the bundle. See `../CONTRACT.md`.

| | |
|---|---|
| Buyer hosts | `<tenant>.ferne.phoxta.com` |
| Showcase | `demo.ferne.phoxta.com` |
| Env | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (see `.env.local.example`) |

Vite inlines `VITE_*` at build time, so those must be set on the Vercel project
**before** the first production build.

## What is real

Nothing that decides money is decided here. The client shows prices; the server
charges them.

- **Catalogue** — `products` + `product_variants`. Ferne sells the same formula in
  several sizes at different prices, so a variant row *is* the price:
  `app_place_order` re-prices every line from the matched variant.
- **Checkout** — `app_place_order` prices the order, applies the promo code,
  decrements variant stock and charges the quoted delivery fee. Payment goes
  through `paystack-storefront-checkout`; a tenant with no provider connected
  keeps a pay-later confirmation instead.
- **Payment confirmation** — only ever from the server-side order record, polled
  through `app_lookup_order`. Popup callbacks can fire for a payment that later
  fails, so they only trigger an immediate re-check.
- **Promo codes** — `app_validate_promo` for the quote, `app_place_order` for the
  charge. `WELCOME10` and `RITUAL5` are seeded with the blueprint.
- **Reviews** — submitted through `app_submit_review`, which lands them as
  *pending* for the owner to approve. The store says so rather than implying the
  review is live.
- **Accounts** — ordinary Supabase auth users; order history is matched on the
  verified email in the JWT, server-side.
- **Content** — journal, FAQs, About/Terms/Privacy and reviews all come from the
  tenant's own rows, with the bundled demo catalogue as the fallback so the shop
  is never blank.
- **Skin advisor** — the Phoxta agent addressed by this tenant's public key, with
  human takeover: when the shop picks the thread up in the console, the widget
  goes quiet and delivers the person's replies instead of talking over them.

## Layout

```
src/
  config/     brand + typed env
  data/       the bundled demo catalogue (fallback only)
  lib/        backend client, tenant memo, payments, formatting, icons
  state/      catalogue · bag · wishlist · account · chrome (providers)
  components/ store shell, cards, drawers, advisor
  pages/      home · shop · product · bag · checkout · order · account ·
              journal · article · about · contact · cms · 404
```

`src/lib/chatRich.tsx` is **generated** — edit `packages/shared-chat/src/chatRich.tsx`
at the repo root and run `npm run shared:sync`.
