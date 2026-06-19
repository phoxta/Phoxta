# Supabase backend (fresh schema)

This is a clean, purpose-built backend for the Phoxta **platform** app (Vite SPA + Supabase).
Supabase (Postgres + Auth + RLS + Storage) is the backend; the app talks to it directly with
the public anon key and the signed-in user's session. Every table has Row-Level Security.

## Migrations (apply in order)
| File | What it creates |
|---|---|
| `0001_tenancy.sql` | `user_profiles`, `organizations`, `organization_memberships`; `updated_at` triggers; auto owner-membership; membership helper (`app_is_org_member`); RLS. |
| `0002_marketplace.sql` | `blueprints` (the marketplace catalog), `purchases`, `subscriptions`; RLS; **seeds the launch catalog** of live businesses. |
| `0003_matching.sql` | `match_profiles`, `matches` (founders / operators / investors); RLS. |
| `0004_ai.sql` | `ai_conversations`, `ai_messages`, `ai_usage` (the assistant transcript + token ledger); monthly-usage helper; RLS. Reads come from client roles; writes come from the `ai-gateway` Edge Function (service role). |
| `0005_collaboration.sql` | `organization_invitations` (invite teammates by email) + `notifications` (in-app feed); `app_is_org_admin` + `app_accept_invitation` helpers; a trigger that turns `matches` events into notifications; RLS. |
| `0006_operating.sql` | **Per-business operating backend** — CRM (`crm_contacts`), commerce (`products`, `orders`, `order_items`), invoicing & subscriptions (`invoices`, `invoice_items`, `customer_subscriptions`), CMS (`cms_pages`), scheduling (`services`, `bookings`), helpdesk (`tickets`, `ticket_messages`), marketing (`campaigns`, `automations`), analytics (`analytics_events` + `app_org_ops_summary`). Every row is keyed to `organization_id` and isolated by RLS. |
| `0007_ai_native.sql` | **AI-native foundation** — pgvector + `ai_embeddings` (per-tenant RAG index, HNSW) + `app_match_embeddings` (service-role, hard org filter); `ai_embedding_queue` + triggers (auto-index products/pages/contacts/tickets); `ai_usage` eval columns (feature/tier/latency); intelligence columns on `crm_contacts`/`tickets` (lead_score, churn_risk, sentiment, category, ai_summary); the **durable workflow engine** (`workflow_runs` + automation triggers). **Requires the `vector` extension** (the migration enables it). |
| `0008_ai_agent.sql` | **Unified AI Agent** ("one brain, every touchpoint") — `agent_config` (persona/hours/escalation + 12 capability toggles + public key), `locations` (multi-location routing), `channels`, `conversations` + `conversation_messages` (omnichannel unified memory), `outbound_campaigns` + `outbound_tasks` (cold-call/upsell/nurture/reminder/instant-callback engine), `call_logs`; `app_route_location` (ZIP routing), `app_org_agent_summary` (reporting), conversation→RAG memory trigger. |
| `0009_embeddings_1024.sql` | Re-dimension the RAG index to **1024-d** (`ai_embeddings.embedding vector(1024)` + HNSW) and `app_match_embeddings` for a provider-agnostic embeddings layer (Voyage/Gemini). |
| `0010_businesses_architecture.sql` | **Businesses lifecycle (the KB "four moves")** — Phoxta authors blueprints; users **buy** them. Adds business `lifecycle_stage`/`app_path`/`site_url`/`modules`/`ops_metrics` on `organizations` and `app_path`/`preset`/`license`/`exclusivity` on `blueprints`; the **`domains`** table (subdomain auto-created on provision + link-your-own custom domain with verification + TLS) and `app_resolve_domain(host)` (public host→tenant routing); the **site factory** `app_provision_business(blueprint, name)` (buy → provision a tenant: copy preset, owner membership, trial sub, subdomain, purchase). No user-side listing/reselling. |

## AI gateway (the server / LLM layer)
Every business gets an AI assistant. The dashboard never calls a model directly — it calls the
**`ai-gateway` Edge Function** (`supabase/functions/ai-gateway/`), which is the only place the model
key lives. The gateway authenticates the caller, checks they belong to the business, **meters usage
per organization** (enforcing a monthly token cap by plan), calls Anthropic, then persists the
transcript and a usage row.

### AI-native architecture (functions + shared core)
All model/embedding calls flow through edge functions that share `supabase/functions/_shared/`
(`anthropic.ts` tool-use loop + prompt caching, `openai.ts` embeddings, `models.ts` **tiering** —
Haiku/Sonnet/Opus by task, `tools.ts` guardrailed read tools incl. RAG, `meter.ts` cost/eval).

| Function | Role |
|---|---|
| `ai-gateway` | RAG-grounded assistant — runs the Anthropic agent loop over read-only tools scoped to the org |
| `ai-helpdesk` | RAG-grounded ticket deflection (pgvector over products/pages/tickets) + confidence |
| `ai-actions` | One entrypoint for every structured per-domain action (lead scoring, churn, classify, product copy, restock, NL invoice/booking, content draft, site scaffold, SEO, campaign copy, segmentation, forecast, auto-insights, `ask_data` NL analytics agent, `semantic_search`) |
| `embed-worker` | Drains `ai_embedding_queue` → OpenAI embeddings → `ai_embeddings` (run on pg_cron in prod) |
| `workflow-worker` | Executes the durable workflow engine (pending `workflow_runs`); email send via Resend is pluggable |
| `ai-agent` | The **unified AI Agent** — `respond` (omnichannel turn, runs the tool-using loop that books/qualifies/tickets/routes/escalates over the ops backend with unified cross-channel memory), `outbound_turn`, `summarize` |
| `agent-worker` | Outbound engine — auto-generates appointment reminders + drains `outbound_tasks`, dispatching via transport adapters |
| `agent-inbound` | **Public** (org by `agent_config.public_key`) — web chat widget, instant-callback form, and **Chatwoot Agent-Bot** webhook |

### Agent transport adapters (research-chosen; all optional, degrade to `simulated`)
The agent brain is provider-agnostic; only the *transport* of voice/SMS/email/social is external. Recommended stack:
| Channel | Provider(s) | Secrets |
|---|---|---|
| Voice calls (call center, receptionist, reminders, cold/upsell) | **Vapi** or **Retell AI** (managed); **self-host: Pipecat** — see `integrations/pipecat-voice/` (Twilio + Deepgram + Cartesia, bridges to `agent-inbound`) | `VAPI_API_KEY`+`VAPI_PHONE_NUMBER_ID` or `RETELL_API_KEY`+`RETELL_FROM` (managed); the Pipecat bridge has its own `.env` |
| SMS | **Twilio** | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` |
| Email | **Resend** → **Postmark** | `RESEND_API_KEY`+`RESEND_FROM` or `POSTMARK_TOKEN`+`POSTMARK_FROM` |
| Omnichannel (WhatsApp/Instagram/web/FB/Telegram) | **Chatwoot** (open-source hub) — point the Agent-Bot webhook at `agent-inbound?key=PUBLIC_KEY` | `CHATWOOT_URL`, `CHATWOOT_API_TOKEN` |
Without these, outbound transport records as `simulated` and the agent is fully testable in-app via the **Test the agent** chat and the public web endpoint.

Deploy: `supabase functions deploy ai-agent agent-worker agent-inbound` (plus secrets above as needed).

Deploy (Supabase CLI; keys are **server secrets**, never `VITE_` vars):
```
supabase functions deploy ai-gateway ai-helpdesk ai-actions embed-worker workflow-worker
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...     # required
supabase secrets set OPENAI_API_KEY=sk-...            # required for RAG / semantic search (embeddings)
supabase secrets set AI_MODEL=claude-haiku-4-5        # optional: pin one model (else tier routing)
supabase secrets set RESEND_API_KEY=... RESEND_FROM="Biz <hi@yourdomain>"  # optional: real email send
```
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are injected automatically — do not set them.
The app calls these via `supabase.functions.invoke(...)` (`src/lib/db/ai.ts`, `src/lib/db/ops/ai.ts`),
which attaches the user's session token. **Embedding/workflow workers** are also invoked fire-and-forget
by the app after writes; in production schedule them with **pg_cron** instead.

## Scope
- **Platform/account layer:** tenancy + profile, marketplace, purchases, subscriptions, matching, AI assistant + metering, team invitations, notifications.
- **Per-business operating layer (`0006`):** each business's day-to-day backend — CRM, commerce, invoicing/subscriptions, CMS, bookings, helpdesk (with AI deflection), marketing automation, analytics. Modelled multi-tenant in this same project, **keyed to `organization_id` and isolated by RLS** (`app_is_org_member`), and surfaced in the dashboard's per-business **Operating console** (`/dashboard/businesses/:id/ops`). The two AI edge functions (`ai-gateway`, `ai-helpdesk`) share the same model key + metering.

## How the app maps to it
- `src/lib/supabaseClient.ts` — client-only Supabase (anon key, RLS).
- `src/lib/db/profile.ts` → `user_profiles` (column-compatible).
- `src/lib/db/organizations.ts` → `organizations` + `organization_memberships`.
- `src/lib/db/ai.ts` → `ai_conversations` / `ai_messages` (read) + `askAssistant()` → the `ai-gateway` function.
- Marketplace / subscriptions / matching data layers are added as those screens are built.

## Applying to a new Supabase project
1. Create the project, then put its **public** values in `.env.local`:
   ```
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon-key>
   ```
2. Run the migrations **in order** — paste each file into the Supabase SQL editor, or with the CLI:
   ```
   supabase link --project-ref <ref>
   supabase db push
   ```
3. In **Authentication → URL Configuration**, set Site URL + add redirect URLs
   (`http://localhost:5173` for dev, plus your production domain) so email confirm / reset links return here.

> Never put service-role or other server secrets in the Vite app — only `VITE_`-prefixed public values
> are safe (they are bundled into client JS).
