# 11 — Reference: Glossary, KPIs, Tech Stack & Pitches

## Glossary
| Term | Definition |
|---|---|
| **Tenant** | A single business (Phoxta-built or cloned). The unit of isolation; implemented as an organization. |
| **Organization** | DB representation of a tenant; all business data scoped to one. |
| **Identity** | A login (`auth.users`). Separate from tenancy; one identity → many orgs. |
| **Membership** | Row linking an identity to an org with a role. |
| **Operator** | Phoxta team member with elevated, audited cross-tenant capability. |
| **Buyer** | Customer who purchases a blueprint clone. |
| **Headless backend** | Backend exposes APIs, never renders pages. |
| **Management console** | Shared, multi-tenant admin app. |
| **Site factory** | Generator that provisions a tenant + scaffolds its public site. |
| **RLS** | Row-level security — Postgres enforcing tenant isolation in the DB itself. |
| **LLM gateway** | Single internal service all model calls flow through (keys, metering, routing, cache, audit). |
| **Blueprint** | Finished business packaged as a reusable, cloneable template. |
| **Clone / provision** | Buying a blueprint provisions a fresh org by copying structure/content/AI config/automations. |
| **RAG** | Retrieval-augmented generation, augmented by tenant-specific content. |
| **Agent** | LLM with tool use acting within scoped guardrails. |
| **ISR** | Incremental Static Regeneration (page regen on content updates). |
| **pgvector** | PostgreSQL extension for vector similarity search. |

## Key KPIs (with Year-3 targets)
MRR $1.0M · ARR $12M · Net new MRR ~$200k/mo · Gross margin 80%+ · CAC $700 · LTV $5,800 · **LTV/CAC 8×+** · Payback <9 mo · Gross retention 92%+ · Net retention 115%+ · Burn multiple <2× · Activation rate (first revenue in 30 days) 70%+ · NPS 50+.

**Monitored monthly:** net new MRR vs plan (channel-attributed) · activation rate · health scores trending down · AI gross margin (gateway data) · pipeline coverage · engineering velocity (PRs + uptime) · burn vs plan vs runway.

## Reference tech stack (production)
| Layer | Choice |
|---|---|
| Backend runtime | TypeScript + Hono on Cloudflare Workers + Node.js on Fly.io |
| Primary DB | PostgreSQL 16 (Supabase, fallback Neon) |
| API gateway | Cloudflare + custom Worker routing |
| Jobs/workflows | Inngest (Temporal evaluated Yr2) |
| Public sites | Next.js 15+ on Vercel (one project per business) |
| Mobile | Expo (React Native) + EAS Build/Update |
| Console | Next.js + Tanstack Query + shadcn/ui + Tailwind |
| LLM gateway | Custom TS service w/ provider abstraction |
| Primary LLM | Claude (Opus 4.7 / Sonnet 4.6 / Haiku 4.5) via API + Bedrock |
| Self-hosted LLMs | Qwen3.x / Mistral Small 4 on vLLM (Yr2+) |
| Embeddings | Voyage/OpenAI → self-hosted BGE-M3 (Yr2) |
| Vector store | pgvector → optional Qdrant (Yr2+) |
| Search | Typesense Cloud → self-hosted at scale |
| Object storage | Cloudflare R2 (primary) + AWS S3 |
| Payments | Stripe + Stripe Connect (per-tenant accounts) |
| Comms | Resend + Postmark (email), Twilio (SMS), FCM/APNs (push) |
| Observability | Sentry + Grafana Cloud + Langfuse (LLM) |
| Secrets | Doppler (dev) / Infisical (prod) |
| Auth | Supabase Auth w/ custom JWT claims (`organization_id`) |
| CI/CD | GitHub Actions + Vercel + Fly.io |

**Engineering standards:** TS strict mode; 100% type coverage on public APIs; Biome+Prettier in CI; required review (no self-merge); >80% test coverage on mutating paths. Security: mandatory RLS on every tenant table; privileged role only via audited chokepoint; quarterly pen-test; bug bounty; security training. Ops: 99.9% storefront / 99.95% console SLO; <200ms p95 on key endpoints; on-call; blameless postmortems; chaos exercises (Yr2+). Docs: OpenAPI per endpoint; ADRs for load-bearing decisions; runbooks.

## The three pitches (50-word versions)
- **Investor:** Category-creating platform, AI-native architecture, exceptional unit economics, team that's built/scaled multi-tenant systems. Raising $3.5M at $18M post → $1M+ ARR in 18 months. Best-case 30×, worst-case 3×.
- **Customer:** Stop assembling tools. Start owning a business. Phoxta sells you a complete, AI-powered business — already built, already operating — that clones to you in minutes, yours to brand and run. Pick a blueprint with proven unit economics; we handle the rest.
- **Partner:** Phoxta is the AI-native platform under your clients' businesses. Resell blueprints (20% recurring), build blueprints in your vertical (60% of clone fees), or match operators/investors for success fees. The platform — and the customers — scale with you.

### Buyer FAQ highlights
Do you own it? **Yes** (your name, domain, payment account; export anytime). Leave Phoxta? **Full data export, no lock-in.** Customers see the platform? **No** (fully branded). Same blueprint as someone else? **Each clone fully independent**; geographic exclusivity on premium tiers.

## Illustrative case studies (composite, pre-launch)
- **Maya (Audience Founder):** Niche Apparel DTC clone $1,500; Yr1 **$320k revenue**, 62% GM, 12 ops hrs/wk, Phoxta spend $3,180 (1% of revenue), NPS 9.
- **Tom (Acquisition Entrepreneur):** 3-blueprint portfolio incl. operator hire + 4-investor SPV; Yr1 **$504k portfolio revenue**, ~32% IRR on $250k, NPS 10.
- **Elena (Existing SMB):** Hair Salon clone $900 + migration; AI receptionist + SMS rebooking → **€42k uplift**, cancelled 4/5 SaaS tools, ~20× ROI, NPS 10.

## Founder's note
> "Every great platform was, at one point, a strange-sounding idea defended by a small team. Shopify was 'a snowboard shop's tech stack'. Stripe was 'seven lines of code'. Substack was 'paid newsletters in 2017'. Phoxta is 'AI-native businesses sold many times'. The strangeness is the signal." — *Founding Team, May 2026*

## Contacts
hello@phoxta.com · investors@phoxta.com · partners@phoxta.com · careers@phoxta.com · press@phoxta.com · community@phoxta.com — Phoxta Holdings Ltd., London, UK.
