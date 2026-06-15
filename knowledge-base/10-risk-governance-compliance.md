# 10 — Risk, Governance & Compliance

## Risk register (score = Likelihood × Impact, 1–25; ≥12 reviewed monthly)
**Strategic:** competitor with deeper pockets (12) → speed + network effects · major platform shift to AI agents (10) → we ARE AI-native, gateway is model-agnostic · category-creation failure (10) → PLG validation; we sell working businesses regardless of label · customer concentration in 1–2 verticals (9) → multi-vertical launch + Yr2 diversification.

**Operational:** multi-tenant data leak (10) → RLS isolation, single audited chokepoint, defense-in-depth · major outage on revenue path (12) → 99.9% SLO, redundancy, drills, on-call · AI cost spike from one tenant (9) → per-org quotas + circuit breakers · single-LLM dependency (8) → gateway abstraction + fallback + self-host · security incident (10) → SOC 2 II, pen-tests, bug bounty, security engineer Yr2.

**Financial:** capital markets contract / Series A delayed (12) → bridge from Seed investors + slow burn · burn exceeds plan (9) → monthly forecasting + trigger-based freeze · customer concentration >5% ARR (6) → diverse base by design · FX (6) → natural hedge + partial hedging Yr3 · payment processor risk (5) → secondary provider Yr2.

**People:** loss of a founder (5) → key-person insurance Yr2 + succession + deep team · critical hire fails (9) → continuous recruiting · cultural drift (9) → documented norms + pulse surveys · comp drift (6) → twice-yearly benchmarking.

**Regulatory/legal:** EU AI Act cost (9) → AI governance designed-in (should be net positive) · GDPR residency (6) → isolation graduation path · securities/AML on SPVs (8) → specialized counsel + clear non-securities structure · privacy class action (4) · IP infringement (4) → IP clearance + permissive OSS + insurance.

## Governance
Lean governance, high accountability. **Board by round:** Pre-Seed 2 (founders) → Post-Seed 3 (2 founders + lead VC) → Post-Series A 5 (2 founders + Seed observer + Series A + 1 independent) → Post-Series B 5–7 → IPO 7–9 (independent majority). Committees post-Series A: Audit, Compensation, Nominating & Governance.

**Decision rights:** ops within budget = functional leaders · hiring >$200k = CEO+CFO · spend >$100k = CEO+CFO · >$500k = CEO + board notice · material pricing = CEO + leadership · acquisition/fundraise/senior-termination = board · article/preferred changes & company sale = shareholder approval.

**Board meeting:** materials 5 days ahead, 1-hr pre-read, 2-hr meeting (30 CEO update, 30 top topics, 30 functional deep-dive, 30 executive session), minutes in 5 days. Conflict-of-interest disclosure + recusal, reviewed annually.

## Legal, privacy & compliance
| Framework | Status |
|---|---|
| UK DPA / GDPR | Compliant by design (Day 1) |
| CCPA | Compliant by design (Day 1) |
| PCI-DSS | Out of scope (Stripe) |
| SOC 2 Type I / II | Q2 2027 / Q4 2027 |
| ISO 27001 | Considered Yr3 (enterprise-demand) |
| EU AI Act | Compliant by design (Art. 6+) |

**Privacy by design:** RLS tenant isolation · data minimization · per-tenant export + deletion from Day 1 · tenant-aware backups · AI logs purged/pseudonymized within 30 days · DPIA per major PII feature.
**Data residency:** standard (UK/EU/US); upgrade to schema-per-tenant (+$100/mo), dedicated DB (Enterprise), or BYO infrastructure.
**IP:** all employee/contractor IP assigned; permissive OSS; "Phoxta" trademarks filed; **defensive-only patents**; SBOM tracking.
**Customer agreements:** MSA, GDPR Art.28 DPA, 99.9% SLA, AUP, clear customer data ownership (Phoxta has processing license only).
**Marketplace compliance:** consumer-protection disclosures · KYC above thresholds · SPVs structured to avoid regulated securities (or registered) · VAT/sales tax per jurisdiction · documented dispute resolution.
**Internal program:** code of conduct, anti-bribery, whistleblower channel, annual training, quarterly leadership review, annual external audit.

## Insurance & business continuity
**Coverage (Yr1 → Yr5):** cyber/data breach $5M→$25M · professional indemnity/E&O $3M→$15M · D&O $5M→$25M (at Seed) · CGL $2M · employment practices $1M→$5M · business interruption (post-A) · key person $2M/founder (at Series A).

**Continuity scenarios:**
1. **Cloud outage** — multi-provider/region; CDN read-only mode; **RPO <5 min, RTO <30 min read / <60 min write**; quarterly drills.
2. **Loss of founder/key engineer** — documented succession + key-person insurance; no bus-factor-1 (docs + pairing).
3. **Security incident** — IR plan w/ named roles + templates; cyber insurance; regulatory-window notification.
4. **Critical vendor failure** — gateway multi-provider; secondary payment path; comms failover — no single vendor can take Phoxta down.
5. **Funding shortfall** — documented profitability-pivot to EBITDA breakeven within 12 months from any post-Series-A point.

**Vendor risk:** annual security/continuity review, documented backups, tracked SLAs, annual SOC 2 reports from data-handling vendors.
