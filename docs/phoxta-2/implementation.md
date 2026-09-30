# Phoxta 2.0 implementation record

Source of truth: the September 2026 **Brand & Product Architecture** (38 pages, abbreviated B) and **Product Specification** (27 pages, abbreviated P). Page-numbered text is retained in `reference/`. Requirements are not inferred from the old app.

## Confirmed decisions

- Retain Vite, React and Supabase. The user explicitly superseded P §14's Next.js recommendation.
- Latest user instruction: restore every pre-auth landing page to the previous Phoxta UI and leave the post-auth application unchanged. Updated document-based copy remains inside the restored component system. Startup School retains its established landing UI while its curriculum and application functionality change.
- Replace Startup School's ten-course catalogue with B §9's twelve modules. Preserve the existing school UI. Transfer progress only where the underlying learning requirement matches; retain unmatched historical records.
- The user delegated provider, packaging and commercial implementation choices. Existing operating-console subscriptions and purchased businesses must retain their contracts and access.
- No Phoxta 2.0 production migration or deployment has been performed. A separately requested Startup School checkout hotfix is tracked below. The working tree already contained extensive changes at the start of this work; those are preserved.

## Acceptance ledger

An entry is complete only after its implementation and verification are recorded. A route or database table alone does not satisfy a workflow.

| Requirement | Source | Verification required | Status |
|---|---|---|---|
| Document-based homepage copy and navigation in the previous public design system | B §§2,10,18,21 + latest user UI instruction | Desktop/mobile routes, legacy-layout assertion, copy review | Verified locally |
| S01–06 identity and optional discovery onboarding | P §§2–3 | Signup/login, separate consent, persistence, skip and safe redirect | Verified locally; configured OAuth is environment-driven |
| S07 dashboard and one next action per opportunity | P §5 | Empty/active states and priority ordering | Verified locally |
| S08–14 discovery modes, filters, save, dismiss, explanations | B §5; P §§3–4,10 | Search/filter, explainable ranking, feedback, activation | Verified locally |
| S15–18 opportunities, Brief, evidence and provenance | B §6; P §§3,6 | Persistent CRUD, source metadata, claims and hypotheses | Verified locally |
| S19–22 assumptions, experiments, market and decisions | P §§3–4; FR-004–006 | Evidence links, transitions, immutable snapshots | Verified locally |
| S23–27 Shape, Build, workflow designer, Launch | B §7; P §3 | Versioned artifacts, plan checks, explicit external-action approval | Verified locally, including planning-only dry runs |
| S28–29 twelve-module School and artifact completion | B §9; P §3; FR-013 | Nonlinear learning, artifact links, progress migration, existing UI | Verified locally; activation not applied live |
| S30–31 Ready-to-Launch catalogue and buyer flow | B §8; P §3; FR-011 | Assets, dependencies, costs, uncertainty, availability, enquiries | Verified locally |
| S32 billing and data-driven entitlements | P §13; FR-007 | Atomic limits, signed/idempotent webhooks, downgrade read access | Verified locally; Opportunity webhook configuration pending |
| S33–34 teams and integrations | P §§3,8,15 | Role checks, invite/change/remove, secret isolation | Team workflow verified locally; provider connections remain environment-driven |
| S35–37 editorial, research and business administration | P §18; FR-014 | Publish/review, retry/cancel, audit, taxonomy, overrides | Verified locally |
| Tenant isolation and private/public storage | P §§7–8,15; FR-008 | Database role and cross-tenant tests, signed URLs | Database verified; storage migration ready for staging |
| Durable research, adapters and constrained agents | P §§9–11; FR-003,009 | Queue leases, retries, cancellation, budgets, failure degradation | Verified with mocked providers; production keys pending |
| Exports, deletion and retention | P §§12,15; FR-012,015 | Access checks, safe export, deletion request, retention policy | Verified locally; deletion function not deployed |
| Analytics, notifications and observability | B §§16–17; P §§16–19 | Categorical events, no research text, preference-aware notifications | Verified locally |
| Legacy migration | P §22 | Per-record dry-run report, preserved originals, hypothesis labels | Verified locally |
| Security, performance and AI evaluations | P §§19–20,23 | Database, integration, E2E, benchmark and production readiness checks | Local suites pass; production readiness pending |

## Source integrity

- `Phoxta_2.0_Brand_Product_Architecture.pdf`: SHA-256 `fa3c0b9e8a2785459f2a7ace5a8bc949b8c94c1a8a18e075dbe712c94e1cf940`.
- `Phoxta_2.0_Product_Specification.pdf`: SHA-256 `846e5f184dc63bee6049f91898161262861b8e6481ad0ae40ea83b45f5e06b57`.

The example opportunity in P Appendix B is illustrative. It is not a researched listing and must not be seeded as verified evidence. New prices are product decisions, not prices specified by these PDFs.

## Startup School payment hotfix

Reported error: `This price cannot be archived because it is the default price of its product.`

The shared catalogue helper tried to archive a drifted Stripe price before creating its replacement. It now validates amount, currency and billing interval, reuses the product, and creates an immutable replacement with `transfer_lookup_key`. It does not archive or change the existing default price. The new checkout explicitly uses the current price ID. Idempotency keys cover concurrent creation and retries. Existing admission prices remain £250 / £1,200 / £5,000.

Validation: `deno test scripts/phoxta-2/stripe-catalogue-test.ts` — 7 passed. Deno checks for school and Console checkout passed. Deployed only `startup-school-checkout` to the linked project on 2026-09-26: ACTIVE version 9. The live source matched the local handler and dependencies except the tested price helper. An unauthenticated POST returns 401. No card was charged. Previous live source is preserved in `.rig/phoxta-2/checkout-live-backup`.

Provider references: [Stripe price creation](https://docs.stripe.com/api/prices/create), [Stripe product and price management](https://docs.stripe.com/products-prices/manage-prices).

## Verified local work (2026-09-26, continuing)

- Public landing pages use the previous Phoxta section library, image-led hero, header proportions, navigation and pricing composition. Document-based copy remains in those components. `/discover`, `/businesses` and `/how-it-works` resolve into the restored marketplace and homepage journey; authenticated discovery remains at `/app/discover`. Desktop/mobile checks cover the public routes, assert that the discarded redesign wrapper is absent, and confirm no horizontal overflow.
- Eleven authenticated app routes passed at 1440px and 390px with isolated API fixtures. Evidence creation refreshes the log; experiment observations render; mobile navigation restores focus on Escape. These tests do not substitute for a production sign-in or live research run.
- PDF/DOCX export generation passes pagination, Unicode, source-reference and entitlement tests. PDF text extraction confirms provenance survives and Free summaries contain no full research payload. DM Sans is distributed with its OFL licence.
- Database regression tests run every additive product migration through 0193 using PGlite, a Supabase Storage policy fixture and real School catalogue DDL. They pass isolation, private-file roles, immutable decisions, experiment transitions, cost reservation, deduplicated research citations, exhausted leases, seven-day payment grace, checkout locks, two-person package publication, invitations, ownership transfer, workflow dry runs, notification preferences, categorical telemetry, workspace deletion and account-deletion preparation.
- The School production build passes. School activation produces exactly 12 published courses and 72 lesson blocks, is repeatable, retains historical lesson credit, and requires a matching artifact for new completion. The migration generator now writes 0187 safely; it no longer overwrites historical migration 0155.
- Research uses Brave with Tavily fallback. Every provider attempt reserves budget before the request; text synthesis defaults to the verified-price `claude-sonnet-4-6` and unpriced fallbacks stop. Search snippets remain review-required and cannot establish demand. Provider error bodies are not shown or logged.
- Signup separates required terms acceptance from optional marketing consent; confirmation emails preserve the intended internal route. New account settings include notifications, data export, request history and a per-record legacy migration preview.

References: [Sonnet 4.6 rates](https://platform.claude.com/docs/en/models/sonnet-4-6/overview), [Tavily rates](https://help.tavily.com/articles/8816424538-pricing), [PDF-LIB](https://pdf-lib.js.org/), [DOCX](https://docx.js.org/).

The dashboard includes one next action, lifecycle portfolio counts and explainable preference matches. Library search and workspace aggregate loading are paginated. Brief sections accept multiple evidence references; viewers receive read-only workspace views. Team invitations require acceptance, ownership transfer requires both parties, and workflow tests cannot perform external actions. Private files use a dedicated bucket with signed five-minute links. Account deletion has a retention-aware server processor and a documented policy.

Still to complete outside the repository: configure `BRAVE_SEARCH_API_KEY`, `TAVILY_API_KEY`, an Anthropic key accepted by the shared gateway, and `OPPORTUNITY_STRIPE_WEBHOOK_SECRET`; configure the Stripe endpoint; apply migrations 0180–0193 in staging; run live storage, auth, billing and research smoke tests; then promote the same release to production. Only the separately tracked School checkout hotfix is deployed. No Phoxta 2.0 migrations have been applied to production.

Research now runs explicit intake/planning, restricted retrieval/extraction, synthesis, critic and quality-gate stages. Per-attempt spend is reserved across all model and search calls. The user compares a proposed section with the current Brief before accepting an inferred version; source references and version checks are retained.
