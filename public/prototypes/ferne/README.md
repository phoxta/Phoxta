# Ferne — multi-page storefront

Open `index.html` in a browser (or serve the folder with any static server). No build step.

## Pages
| File | What it does |
|---|---|
| `index.html` | Homepage — hero, categories, best-sellers (filterable), ingredients, routine, story, reviews, journal |
| `shop.html` | Catalogue with faceted filters (category, concern, price, stock, refillable), sort, search (`?q=`), deep links (`?cat=face`) |
| `product.html?id=` | Gallery, size variants, quantity, stock state, wishlist, accordion, reviews with rating breakdown + write-a-review, related products, mobile sticky buy bar |
| `cart.html` | Line editing, save-for-later, promo codes (`WELCOME10`, `FREESHIP`, `RITUAL5`), free-delivery progress, upsell |
| `checkout.html` | 3-step checkout with validation (email, UK postcode, card), delivery methods, payment method switch, order summary |
| `order.html?id=` | Confirmation with timeline and receipt |
| `account.html` | Sign in / create account (demo), order history, buy again, wishlist, refill recommendations, details |
| `journal.html` | Article index with tag filter; `?id=` renders a single article |
| `about.html`, `contact.html` | Story + team; contact form and FAQ accordion |

Global: sticky header, mini-cart drawer, mobile menu drawer, search palette (⌘K), toasts, cookie banner, newsletter, footer.

## Architecture
- `assets/data.js` — catalogue, reviews, journal, shipping, promos. Replace with an API call.
- `assets/app.js` — `Ferne` namespace: `Store` (localStorage), `Cart`, `Wish`, `Auth`, `Orders`, `UI` (product cards, drawers, toasts, search). Every page hooks `ferne:ready`.
- `assets/app.css` — design tokens in `:root`, components, responsive rules (≤1100 tablet, ≤768 mobile).

## Going to production
1. **Commerce backend** — point `FERNE_DATA` at Shopify Storefront API / Medusa / your own API; move `Cart`/`Orders` to server sessions.
2. **Payments** — replace the card form in `checkout.html` with a Stripe Payment Element / Adyen drop-in. The `data-place` handler is where you confirm the PaymentIntent.
3. **Auth** — swap `Auth` for Clerk / Auth0 / Shopify customer accounts.
4. **Images** — move `assets/img` to a CDN with responsive `srcset`; current files are compressed stock photos (Unsplash).
5. **SEO** — add per-product `<title>`/OG tags server-side and JSON-LD `Product` schema.
