# Per-business backend contract

How an independent storefront app in `businesses/<slug>` connects to the shared
Phoxta backend. The platform (`../src`) **provisions** the tenant, registers its
**domains**, and exposes a public **host → tenant** resolver; each business app is
its own deployment that reads its own org-scoped data. One backend, many fronts.

## 1. Identify the tenant (ORG_ID)

A business app needs the `organization_id` of the tenant it serves. Two ways:

- **Baked (simplest):** set `ORG_ID` (or `VITE_ORG_ID` / `NEXT_PUBLIC_ORG_ID`) in
  the app's env at deploy time. One deployment = one business.
- **By host (multi-domain):** resolve at runtime from the request hostname using
  the public RPC `app_resolve_domain(host)` — returns `{ organization_id, slug,
  app_path, site_url, name }` for any **live** domain (subdomain or linked custom
  domain). Safe to call with the anon key; it returns routing info only.

```ts
const { data } = await supabase.rpc("app_resolve_domain", { p_host: location.host });
const orgId = data?.[0]?.organization_id;
```

## 2. Connect (anon key + RLS)

Use the project URL + **anon** key (public, client-safe). All tenant tables are
protected by row-level security keyed on `organization_id`, so a business app only
ever sees its own org's rows — pass `ORG_ID` as a filter and RLS enforces the rest.
Never embed the service-role key in a storefront.

## 3. Read live content (the content API)

Storefronts pull **published** data: `cms_pages` (content), `products`,
`services`, etc., always filtered by `organization_id`. Writes from the storefront
(orders, leads, bookings, support messages) go through the same RLS-scoped tables
or the public agent endpoint (`agent-inbound`) for AI chat/voice.

## 4. Domains & TLS

The platform issues a `*.phoxta.app` subdomain on provision and lets the owner
link a custom domain (TXT ownership check → `live`). Point the custom domain's
traffic (CNAME) at **this app's deployment**; TLS is handled by the app's host.
The `domains` table is the registry; `app_resolve_domain` is the read path.

## Reference client

See `phoxta-client.ts` in this folder — a ~30-line, dependency-light helper
(`@supabase/supabase-js` only) that a business app can copy to do steps 1–3.

> Boundary: the platform never builds or embeds these apps; it links out to each
> deployment (set a business's `site_url` in the console). Keep storefront code
> here, account/marketplace code in `../src`.
