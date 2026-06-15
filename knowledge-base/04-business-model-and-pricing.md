# 04 — Business Model & Pricing

## Operating model — the four moves
1. **CREATE (Day 1–3):** operator submits a "new business" form → site factory provisions an org, seeds config/content types/automations, creates operator owner membership, registers subdomain, scaffolds front-end. Output: live empty tenant + deployment ID/subdomain/ORG_ID.
2. **BUILD (Week 1–8):** branding/theme tokens, pages/copy, products/services, blog content, payments (Stripe Connect), modules, automations, AI assistants. Each publish revalidates the site in seconds.
3. **OPERATE (Month 2–6):** real customers, real revenue. Track revenue, unit economics (CAC/LTV/margin), AI ROI, automation reliability, CSAT, operational hours. **List-ready** requires: ≥3 months data, in-range unit economics, AI deflection ≥35%, automations <1% error, documented runbook.
4. **LIST & SELL (Month 6+):** publish as blueprint (screenshots, live demo, sample metrics, price, license). Original stays listed; sells again without limit.

**Operating cadence:** daily standup/agent reviews/incident triage · weekly per-blueprint KPI review · monthly marketplace + blueprint health · quarterly roadmap/OKR/pricing · annual strategic plan + board.

## Five revenue streams
| Stream | What | Shape | Yr-5 mix |
|---|---|---|---|
| 1. Blueprint clone fees | one-time clone purchase | $700–$5,000+ | 35% |
| 2. Platform subscription | recurring hosting on Phoxta | $32–$179/mo/tenant | 30% |
| 3. Usage-based add-ons | metered AI tokens, SMS, premium | tiered per-unit | 15% |
| 4. Matching & facilitation | co-founder/operator/investor matching, SPV setup | success/setup fees | 10% |
| 5. Marketplace take rate | % on 3rd-party blueprint sales | 20% take rate | 10% |

### Blueprint tiering
Starter $700–$1,200 · Standard $1,200–$2,500 · Premium $2,500–$5,000 · Enterprise/custom $5,000+.

### Platform plan tiers
Starter **$32** (≤1k customers, 2 seats, std AI) · Growth **$79** (≤10k, 5 seats, 3× AI) · Scale **$179** (≤50k, 15 seats, 10× AI) · Enterprise custom (dedicated infra, SLA).

### Usage add-ons (charge / cost / margin)
AI Haiku $2/1M (~$1, 50%) · AI Sonnet $6/1M (~$3, 50%) · AI Opus $10/1M (~$5, 50%) · SMS $0.020 (~$0.011, ~45%) · email $0.001 · storage $0.05/GB-mo (~60%) · premium agent runs $0.50/session-hr (~40%).

### Matching fees
Co-founder match: **$500** success fee · Operator-for-hire: **10%** of first-year comp (escrowed 12 mo) · Investor group: **$2,500 + 1%** of capital (SPV setup + admin) · Strategic intros: $1,000–$10,000.

### Marketplace take (Year 2+)
Open to vetted 3rd-party authors; Phoxta takes **20%** per clone + standard platform sub from resulting tenants.

## Unit economics
**Per-tenant variable cost (managed, ex-payment/labor):** DB/storage $1–3 · front-end hosting $2–10 · AI conversational $5–30 · AI generation <$1 · search $0–2 · comms $2–8 · push ~$0 → **typical ~$10–50/mo (model $20)**.

### Cost-per-business at scale
| Tenants | Shared infra/mo | Variable | Total/mo | Per tenant |
|---|---|---|---|---|
| 1 | ~$150 | $20 | ~$170 | ~$170 |
| 10 | ~$250 | $200 | ~$450 | ~$45 |
| 50 | ~$600 | $1,000 | ~$1,600 | ~$32 |
| 100 | ~$1,200 | $2,000 | ~$3,200 | ~$32 |
| 500 | ~$4,000 | ~$9,000 | ~$13,000 | ~$26 |
| 1,000 | ~$7,500 | ~$17,000 | ~$24,500 | ~$24 |
| 5,000 | ~$30,000 | ~$78,000 | ~$108,000 | ~$22 |

> **Economic insight:** by ~100 tenants the marginal cost of the next is ~$20/mo, and the variable floor stays ~$20 to thousands → winner-take-most economy (incumbents have shrinking marginal cost; entrants face the high fixed-cost wall).

**Gross margin curve:** ~25% (1 tenant) → ~75% (500) → ~85% (5,000).

### LTV model (mid-tier blueprint, Growth plan, 3-yr retention)
$1,500 clone + $2,844 platform + $900 AI = **$5,244 revenue** − 25% COGS ($1,311) = **$3,933 gross (LTV)** − $400 CAC = **$3,533 contribution; LTV/CAC ≈ 9.8×**.

**Cost-optimization levers (by impact):** model routing · prompt caching + Batch API · self-hosted models for high-volume · pgvector before dedicated vector DB · Cloudflare R2 (no egress) · PWA before native · ISR/CDN · per-org quotas.

## Pricing strategy
- **Charter:** "Charge for value created, not value extracted."
- **Principles:** (1) value-based not cost-plus (a $30k+/4-month build priced ~$1,200 as a blueprint, profitably because built once); (2) aligned incentives via recurring + usage; (3) transparent and meterable (every billable unit visible in console).
- **Benchmarks:** DIY SaaS assembly $3,600–8,000/yr (30–70% cheaper) · agency $15k–50k (85%+ cheaper) · brokered business $30k–300k (90%+ cheaper) · build-it-yourself 4–8 months (time, not money).
- **Anti-patterns avoided:** per-seat pricing on zero-marginal-cost features · hidden "premium" AI tokens · data-hostage lock-in · surprise overages · downgrade penalties.

## Business Model Canvas (summary)
- **Key partners:** AWS/Cloudflare/Fly.io/Vercel, Anthropic (Claude), Stripe, Twilio+SendGrid, 3rd-party blueprint authors, legal/accounting (SPVs), SMB associations, reseller agencies.
- **Key activities:** design/build blueprints, operate to maturity, maintain platform, run marketplace + clone pipeline, matching, post-clone support, compliance/trust.
- **Key resources:** the platform (backend + AI gateway + automation engine), blueprint catalog, multi-tenant engineering team, operating know-how across 10+ verticals, trust infra, capital.
- **Channels:** direct (phoxta.com marketplace), founder communities, content marketing, SEO/AI-search, agency resellers, investor networks, conferences.
- **Cost structure:** engineering (~60% pre-Series-A), cloud infra, AI usage, S&M, operating businesses pre-listing, legal/compliance, office/tooling.
