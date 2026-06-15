# 03 — Product & Platform

## Three surfaces, one shared core
| Surface | Who uses it | What it does |
|---|---|---|
| **Public storefronts** | end customers of each tenant | Per-business custom e-commerce/bookings/content/native apps; pulls live data from the content API |
| **Phoxta Marketplace** | buyers, investors, founders | Browse/preview/purchase blueprints; match with operators, co-founders, investors |
| **Management Console** | operators (Phoxta) + buyers (after clone) | Run any business: CRM, commerce, content, AI assistants, automations, analytics, billing |

### Capability stack
- **Customer-experience:** custom storefronts, native apps/PWAs on one content API, AI search & recommendations, embedded sales/support assistants, multi-channel checkout (card/ACH/wallets/BNPL), localization.
- **Operational:** CRM, commerce (products/inventory/orders/fulfillment), invoicing & subscriptions, CMS (draft→publish→revalidate), scheduling/bookings, helpdesk w/ AI deflection, marketing automation, analytics.
- **Intelligence:** per-business AI assistants (pre-trained on content/policies), guardrailed agents, recommendation systems, lead scoring/churn/forecasting, semantic search, content generation, durable workflow engine.
- **Marketplace & matching:** blueprint catalog w/ live demos, verified unit-economics display, one-click clone, co-founder/operator/investor matching, reputation system.

## Platform architecture (the four layers)
| Layer | Components | Why |
|---|---|---|
| 1 — Front ends | storefronts, native apps, console | Pure API consumers; each tenant front-end pinned by ORG_ID |
| 2 — API Gateway | auth, tenant resolution, rate limiting, routing | Single chokepoint; client-supplied tenant ID never trusted |
| 3 — Backend services | Core API, AI Orchestrator, Workers | Stateless, horizontally scalable; access via tenant-scoped DAL |
| 4 — Data platform | Postgres + RLS, object storage, pgvector, realtime | Isolation enforced in the DB; final boundary |

### Non-negotiable load-bearing decisions
- **Tenant = organization, decoupled from identity.** A login is `auth.users`; joined to orgs via `organization_memberships`. Lets one buyer own several businesses and a blueprint clone into a fresh tenant per buyer.
- **One headless backend, many front ends.** Build the hard part once, reuse for every business.
- **Isolation lives in the database (RLS), not the application.** Privileged service role never touches tenant data outside one audited chokepoint.
- **Build isolation/tenancy before anything tenant-facing.** Greenfield, foundation-first.
- **Content is data, delivered through an API** (draft→publish lifecycle + cache invalidation).

### The LLM gateway (key innovation)
Every AI call flows through one internal service: holds API keys (never exposed to front ends), injects tenant context, enforces per-org rate limits/quotas, **meters cost per org for billing**, centralizes retries/fallback, caches, logs prompts/responses for evals. Makes AI affordable at scale, model swaps a config change, and self-hosting a per-request switch.

> What it buys: ~$20/mo marginal tenant · DB-level isolation · horizontal scaling · per-request AI routing (managed ↔ self-host).

## AI-native capabilities
**AI-native ≠ AI-enabled:** AI is in the architecture (every tenant gets scoped gateway + retrieval index + agent runtime); costs governed/metered; data model assumes AI uses it (embeddings/vector/RAG first-class); workflow engine treats AI actions as durable/observable/governable steps.

- **Customer-facing AI:** support assistant, shopping assistant, semantic search, recommendation copy, voice receptionist (Yr 2). Model tiering: Haiku for cheap/fast with Sonnet escalation.
- **Buyer-facing AI:** content generation, site scaffolding (brief → structure + copy + theme tokens), data-entry assist, summarization, NL analytics, lead scoring.
- **Autonomous agents:** support, order-ops, content, marketing, reconciliation, restock.
- **RAG per tenant:** content embedded into pgvector with `organization_id` on every row; vector search + hard org filter (RLS). Cross-tenant retrieval is physically impossible.
- **Cost governance:** model routing (Haiku 80% / Sonnet 15% / Opus 5%), prompt caching (~90% off cached input), Batch API (50% off) → up to ~95% savings.
- **Hybrid managed/self-hosted:** managed Claude (Bedrock/Vertex/Foundry) for quality-critical; self-hosted open-weights (Qwen/Mistral/Gemma) for high-volume/latency-tolerant. Gateway routes per request by config.

## Business types & verticals
One generic, tenant-scoped module set (CRM, commerce, content, scheduling, support, marketing, analytics, files, notifications, automations) — a business type is mostly **which modules are enabled + how the site is composed + which AI/automations are pre-configured**.

Verticals: E-commerce/DTC · Service/agency · Local services · Content/creator · SaaS/digital products · Marketplace · Education/courses · Restaurant/hospitality · B2B/wholesale · Membership/community.

### Year-1 launch catalog (10 blueprints)
Coffee Subscription ($1,200) · Niche Apparel DTC ($1,500) · Hair Salon & Booking ($900) · Dental Clinic Portal ($1,400) · Newsletter/Creator ($700) · Marketing Agency ($1,800) · Local Marketplace ($3,100) · Online Course Studio ($2,200) · Restaurant + Orders ($1,500) · Niche SaaS Starter ($2,400). **Year-2:** +25 blueprints across adjacencies.

## Product roadmap (foundation first)
- **Phase 0 — Tenancy Foundation (Q2 2026):** orgs/memberships/domains/audit tables, RLS pattern, JWT claim hook, data-access chokepoint, gateway tenant resolution, operator impersonation w/ audit.
- **Phase 1 — Core Domain + Console (Q3 2026):** CRM, content, invoicing+Stripe Connect, shared console, auth/roles/SSO.
- **Phase 2 — Site Factory + First Site (Q3 2026):** provisioning workflow, template scaffolding, domain+TLS, ISR pipeline (Next.js), first business (Coffee Subscription), app factory (PWA → native via EAS).
- **Phase 3 — AI Layer (Q4 2026):** LLM gateway, RAG on pgvector, content-gen, support assistant, agent framework, eval harness.
- **Phase 4 — ML & Analytics (Q1 2027):** event pipeline, recommendations, semantic search, lead scoring/churn, dashboards.
- **Phase 5 — Automation + Commerce Breadth (Q1 2027):** workflow engine, automation templates, embeddable no-code builder.
- **Phase 6 — Marketplace, Billing & Cloning (Q2 2027):** platform billing, per-tenant Connect, usage metering, marketplace, clone/provision pipeline, guided onboarding.
- **Phase 7 — Matching Layer (Q3 2027):** founder registry, co-founder matching, operator-for-hire escrow, investor group SPVs, verified-economics layer.
- **Phase 8 — Hardening, Scale & Compliance (Q4 2027):** observability, rate limits, SOC 2 Type II, GDPR DSR/residency, cost optimization.
