# Phoxta 2.0 release runbook

This release has not been applied to the live Phoxta 2.0 product. The Startup School checkout hotfix is the only production change already made.

## Required configuration

- `BRAVE_SEARCH_API_KEY` — primary search adapter
- `TAVILY_API_KEY` — fallback search adapter
- `ANTHROPIC_API_KEY` — default `claude-sonnet-4-6` planning, synthesis and critic model
- `OPPORTUNITY_RESEARCH_MODEL=claude-sonnet-4-6`
- `OPPORTUNITY_STRIPE_WEBHOOK_SECRET` — a new signing secret dedicated to the Opportunity subscription endpoint
- `PHOXTA_APP_ORIGIN=https://www.phoxta.com`
- `PHOXTA_ALLOWED_ORIGINS` — comma-separated additional trusted app origins, if any
- `VITE_SUPABASE_OAUTH_PROVIDERS` — comma-separated providers that are actually enabled in Supabase Auth; supported UI values are `google`, `azure`, `github`, and `apple`. Leave empty to show no provider buttons.

Never substitute an unpriced model in `OPPORTUNITY_RESEARCH_MODEL`. A model added through `OPPORTUNITY_MODEL_RATES` needs a verified input, cache-write and output rate before deployment.

## Staging sequence

1. Take and verify a database backup and record the current migration version.
2. Apply additive migrations 0180 through 0193 to staging. Migration 0187 only activates the twelve-module School catalogue when `ss_activate_opportunity_curriculum(..., true)` is explicitly called.
3. Verify the `phoxta-editorial` public bucket and `phoxta-opportunity-private` private bucket. Test owner upload, viewer signed read, outsider denial and owner deletion.
4. Deploy `opportunity-billing`, `opportunity-stripe-webhook`, and `opportunity-account-deletion`.
5. Create a Stripe webhook endpoint for `opportunity-stripe-webhook` with `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, and `invoice.payment_failed`. Store its dedicated signing secret as `OPPORTUNITY_STRIPE_WEBHOOK_SECRET`.
6. Run the research worker as a durable single-instance service first: `deno run --allow-env --allow-net workers/opportunity-research/main.ts`. The database lease makes additional instances safe after the first smoke test.
7. Run a Free-plan limit test, a paid checkout in Stripe test mode, a signed webhook replay, a payment-failure grace test, one research job with real provider billing, an account export, a private-file download and a deletion request.
8. Preview School curriculum activation. Review the legacy progress report, then activate it once accepted. Do not remove archived legacy courses or unmatched progress.
9. Promote the same migration and function artifacts to production. Repeat the smoke tests without creating a real charge; use a test-mode environment or a zero-value internal test plan.

## Rollback

Do not reverse additive tables while users have written Phoxta 2.0 data. Disable new routes and workers, stop new checkouts, and keep existing work readable. Stripe webhook events are idempotent and research jobs retain their state for retry. Restore a database backup only for a database-wide incident, then replay the deletion ledger before reopening access.
