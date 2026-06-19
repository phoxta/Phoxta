// Phoxta — ai-actions: one entrypoint for every structured, per-domain AI action.
// Tier-routed, metered, RAG-aware, guardrailed (reads/writes only this org's data).
// Each action returns JSON the console renders; some write intelligence back.
import { preflight, json } from "../_shared/cors.ts";
import { authorize, type AuthOk } from "../_shared/auth.ts";
import { modelFor, type Tier } from "../_shared/models.ts";
import { callJson, runAgent } from "../_shared/anthropic.ts";
import { READ_TOOLS, toolRunner } from "../_shared/tools.ts";
import { embedOne } from "../_shared/openai.ts";
import { meter } from "../_shared/meter.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    const body = await req.json().catch(() => null);
    const organizationId: string | undefined = body?.organizationId;
    const action: string = body?.action ?? "";
    const input: Json = body?.input ?? {};
    if (!action) return json({ error: "Missing action." }, 400);

    const a = await authorize(req, organizationId);
    if (a.error) return a.error;
    const ctx = a.ok;
    const orgId = organizationId as string;

    const run = async <T>(tier: Tier, feature: string, system: string, user: string, maxTokens = 1024): Promise<T> => {
      const t0 = Date.now();
      const model = modelFor(tier);
      const { data, inTok, outTok, model: used } = await callJson<T>({ model, system, user, maxTokens });
      await meter(ctx.admin, { organizationId: orgId, userId: ctx.userId, model: used, feature, tier, inTok, outTok, latencyMs: Date.now() - t0 });
      return data;
    };

    const biz = `Business: "${ctx.org.name}" (${ctx.org.vertical || "small business"}).`;

    switch (action) {
      // ---- Semantic search over the per-tenant RAG index ----
      case "semantic_search": {
        const emb = await embedOne(String(input.query ?? ""));
        const { data } = await ctx.admin.rpc("app_match_embeddings", {
          p_org: orgId,
          query_embedding: emb,
          match_count: input.match_count ?? 8,
          p_source_types: input.source_types ?? null,
        });
        return json({ result: { matches: data ?? [] } });
      }

      // ---- CRM: lead score + churn + summary + next action (writes back) ----
      case "score_lead": {
        const { data: c } = await ctx.admin
          .from("crm_contacts")
          .select("id, name, email, company, stage, tags, notes, value_cents, created_at")
          .eq("id", input.contactId)
          .eq("organization_id", orgId)
          .maybeSingle();
        if (!c) return json({ error: "Contact not found." }, 404);
        const result = await run<{ lead_score: number; churn_risk: number; summary: string; next_action: string; reasons: string[] }>(
          "cheap",
          "lead_scoring",
          `${biz} You score CRM contacts. Return JSON { "lead_score": 0-100, "churn_risk": 0-1, "summary": one sentence, "next_action": one concrete next step, "reasons": string[] }.`,
          JSON.stringify(c),
          512,
        );
        await ctx.admin
          .from("crm_contacts")
          .update({ lead_score: Math.round(result.lead_score), churn_risk: result.churn_risk, ai_summary: result.summary, scored_at: new Date().toISOString() })
          .eq("id", input.contactId);
        return json({ result });
      }

      // ---- Helpdesk: classify (category/sentiment/priority) + summary (writes back) ----
      case "classify_ticket": {
        const { data: t } = await ctx.admin.from("tickets").select("id, subject").eq("id", input.ticketId).eq("organization_id", orgId).maybeSingle();
        if (!t) return json({ error: "Ticket not found." }, 404);
        const { data: msgs } = await ctx.admin.from("ticket_messages").select("author, body").eq("ticket_id", input.ticketId).order("created_at", { ascending: true }).limit(10);
        const thread = ((msgs as { author: string; body: string }[] | null) ?? []).map((m) => `${m.author}: ${m.body}`).join("\n") || t.subject;
        const result = await run<{ category: string; sentiment: string; priority: string; summary: string }>(
          "cheap",
          "ticket_classify",
          `${biz} Classify the support ticket. Return JSON { "category": short label, "sentiment": "positive"|"neutral"|"negative", "priority": "low"|"normal"|"high", "summary": one sentence }.`,
          `Subject: ${t.subject}\n${thread}`,
          400,
        );
        await ctx.admin
          .from("tickets")
          .update({ category: result.category, sentiment: result.sentiment, priority: ["low", "normal", "high"].includes(result.priority) ? result.priority : "normal", ai_summary: result.summary })
          .eq("id", input.ticketId);
        return json({ result });
      }

      // ---- Commerce ----
      case "product_copy": {
        const result = await run<{ description: string; bullets: string[]; seo_title: string; seo_description: string }>(
          "balanced",
          "product_copy",
          `${biz} Write compelling, honest e-commerce product copy. Return JSON { "description": 2-3 sentences, "bullets": 3-5 short selling points, "seo_title": <=60 chars, "seo_description": <=155 chars }.`,
          `Product: ${input.name}\nNotes: ${input.hints ?? ""}`,
          700,
        );
        return json({ result });
      }
      case "recommend": {
        const { data: products } = await ctx.admin.from("products").select("name, price_cents, stock").eq("organization_id", orgId).eq("status", "active").limit(40);
        const result = await run<{ recommendations: { title: string; products: string[]; rationale: string }[] }>(
          "balanced",
          "recommend",
          `${biz} Suggest product bundles/cross-sells from the catalog. Return JSON { "recommendations": [{ "title": string, "products": string[], "rationale": one sentence }] } (max 4).`,
          `Catalog: ${JSON.stringify(products ?? [])}`,
          700,
        );
        return json({ result });
      }
      case "restock_forecast": {
        const [{ data: products }, { data: orders }] = await Promise.all([
          ctx.admin.from("products").select("name, stock, status").eq("organization_id", orgId).limit(60),
          ctx.admin.from("orders").select("total_cents, status, created_at").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(100),
        ]);
        const result = await run<{ items: { product: string; suggested_restock: number; rationale: string }[]; note: string }>(
          "balanced",
          "restock",
          `${biz} Recommend restock quantities from stock levels and recent order velocity. Return JSON { "items": [{ "product": string, "suggested_restock": number, "rationale": short }], "note": one-line demand note }.`,
          `Products: ${JSON.stringify(products ?? [])}\nRecentOrders: ${JSON.stringify(orders ?? [])}`,
          800,
        );
        return json({ result });
      }

      // ---- Invoicing ----
      case "dunning_message": {
        const { data: inv } = await ctx.admin.from("invoices").select("number, customer_name, total_cents, due_date, status").eq("id", input.invoiceId).eq("organization_id", orgId).maybeSingle();
        if (!inv) return json({ error: "Invoice not found." }, 404);
        const result = await run<{ subject: string; message: string }>(
          "cheap",
          "dunning",
          `${biz} Write a polite payment reminder. Return JSON { "subject": string, "message": friendly 2-3 sentence email }.`,
          JSON.stringify(inv),
          400,
        );
        return json({ result });
      }
      case "nl_invoice": {
        const result = await run<{ customer_name: string; due_date: string | null; items: { description: string; quantity: number; unit_price_cents: number }[] }>(
          "balanced",
          "nl_invoice",
          `${biz} Convert the instruction into an invoice. Money in cents. Return JSON { "customer_name": string, "due_date": ISO date or null, "items": [{ "description": string, "quantity": number, "unit_price_cents": number }] }.`,
          String(input.text ?? ""),
          500,
        );
        return json({ result });
      }

      // ---- CMS ----
      case "content_draft": {
        const result = await run<{ title: string; slug: string; body: string; seo_title: string; seo_description: string }>(
          "balanced",
          "content_draft",
          `${biz} Write a publish-ready web page from the brief. Return JSON { "title": string, "slug": kebab-case, "body": markdown (200-400 words), "seo_title": <=60 chars, "seo_description": <=155 chars }.`,
          `Brief: ${input.brief ?? ""}${input.title ? `\nTitle: ${input.title}` : ""}`,
          1600,
        );
        return json({ result });
      }
      case "scaffold_site": {
        const result = await run<{ pages: { title: string; slug: string; body: string }[] }>(
          "complex",
          "scaffold_site",
          `${biz} Scaffold a small marketing site. Return JSON { "pages": [{ "title": string, "slug": kebab-case, "body": markdown ~120 words }] } — Home, About, plus 2-3 pages fit for this business.`,
          `Brief: ${input.brief ?? ""}`,
          3200,
        );
        return json({ result });
      }
      case "seo_meta": {
        const result = await run<{ seo_title: string; seo_description: string; keywords: string[] }>(
          "cheap",
          "seo_meta",
          `${biz} Produce SEO metadata. Return JSON { "seo_title": <=60 chars, "seo_description": <=155 chars, "keywords": string[] }.`,
          `Title: ${input.title ?? ""}\nBody: ${(input.body ?? "").slice(0, 2000)}`,
          400,
        );
        return json({ result });
      }

      // ---- Studio: visual page builder (drives the drag-and-drop editor) ----
      // Edits a page by emitting OPERATIONS (never a whole document); the client
      // applies them with builder/ops.ts#applyOps. Shared by the AI chat panel
      // and the conversational voice agent, so both speak the same op language.
      case "page_edit": {
        const doc = input.document ?? { root: { props: {} }, content: [] };
        const catalog = input.catalog ?? [];
        const slots = input.slots ?? {};
        const instruction = String(input.instruction ?? "");
        const history: { role: string; content: string }[] = Array.isArray(input.history) ? input.history : [];
        const result = await run<{ reply: string; ops: unknown[] }>(
          "complex",
          "page_edit",
          `${biz} You are Phoxta Studio's page-building assistant. You build and edit a web page by emitting OPERATIONS — never return a whole document.

AVAILABLE SECTIONS (catalog of valid component types + their editable fields):
${JSON.stringify(catalog)}

Each operation is exactly one of:
  { "op":"add_section", "type": <catalog type>, "props"?: { field: value }, "index"?: number }
  { "op":"remove_section", "id"?: string, "index"?: number }
  { "op":"move_section", "from": number, "to": number }
  { "op":"set_field", "id"?: string, "index"?: number, "path": "field" | "field.0.subfield", "value": any }
  { "op":"set_layout", "props": { "headerStyle"?: 1-15, "footerStyle"?: 1-15, "title"?: string, "mainClass"?: string } }
  { "op":"set_text", "id": string, "slot": number, "value": string }   // edit ANY section's Nth text slot
  { "op":"set_image", "id": string, "slot": number, "value": string }  // replace ANY section's Nth image (URL/path)

SECTION CONTENT SLOTS (per block id -> the editable text[] and image[] currently on the page, by index):
${JSON.stringify(slots).slice(0, 12000)}

Rules:
- Editing copy/images of an existing section: prefer set_text / set_image with the block "id" and the slot index from SECTION CONTENT SLOTS. (set_field only applies to fields the catalog lists for that type.)
- Only use section "type" values from the catalog; only set fields the catalog lists for that type.
- Target existing blocks by their "id" from the current document.
- Write concise, on-brand marketing copy. Keep changes minimal and intentional.
- If the request is ambiguous, make a reasonable choice and say so in the reply.
- This is a back-and-forth conversation; use the prior turns for context.

Return JSON { "reply": a short, friendly 1-2 sentence summary of what you changed or a clarifying question, "ops": PageOp[] }. Use an empty "ops" array when you only need to ask or answer.`,
          `${history.length ? `CONVERSATION SO FAR:\n${history.map((h) => `${h.role}: ${h.content}`).join("\n")}\n\n` : ""}CURRENT DOCUMENT:\n${JSON.stringify(doc).slice(0, 16000)}\n\nINSTRUCTION: ${instruction}`,
          2000,
        );
        return json({ result });
      }

      // ---- Bookings ----
      case "booking_reminder": {
        const { data: b } = await ctx.admin.from("bookings").select("customer_name, start_at, services(name)").eq("id", input.bookingId).eq("organization_id", orgId).maybeSingle();
        if (!b) return json({ error: "Booking not found." }, 404);
        const result = await run<{ message: string }>(
          "cheap",
          "booking_reminder",
          `${biz} Write a short friendly appointment reminder (SMS-length). Return JSON { "message": string }.`,
          JSON.stringify(b),
          250,
        );
        return json({ result });
      }
      case "no_show_risk": {
        const { data: b } = await ctx.admin.from("bookings").select("customer_name, start_at, status, created_at, notes").eq("id", input.bookingId).eq("organization_id", orgId).maybeSingle();
        if (!b) return json({ error: "Booking not found." }, 404);
        const result = await run<{ risk: number; reasons: string[] }>(
          "cheap",
          "no_show_risk",
          `${biz} Estimate no-show risk. Return JSON { "risk": 0-1, "reasons": string[] }.`,
          JSON.stringify(b),
          300,
        );
        return json({ result });
      }
      case "nl_booking": {
        const { data: services } = await ctx.admin.from("services").select("id, name").eq("organization_id", orgId).eq("active", true).limit(30);
        const result = await run<{ service_name: string | null; customer_name: string; start_at: string; notes: string }>(
          "balanced",
          "nl_booking",
          `${biz} Parse the booking request. Now is ${new Date().toISOString()}. Services: ${JSON.stringify(services ?? [])}. Return JSON { "service_name": string|null, "customer_name": string, "start_at": ISO datetime, "notes": string }.`,
          String(input.text ?? ""),
          400,
        );
        return json({ result });
      }

      // ---- Marketing ----
      case "campaign_copy": {
        const result = await run<{ name: string; subject: string; body: string }>(
          "balanced",
          "campaign_copy",
          `${biz} Write a ${input.channel ?? "email"} marketing campaign for audience "${input.audience ?? "all customers"}". Return JSON { "name": string, "subject": string, "body": string }.`,
          `Goal: ${input.goal ?? ""}`,
          800,
        );
        return json({ result });
      }
      case "segment_audience": {
        const { data: contacts } = await ctx.admin
          .from("crm_contacts")
          .select("id, name, stage, tags, lead_score, churn_risk, value_cents")
          .eq("organization_id", orgId)
          .limit(200);
        const result = await run<{ criteria: string; contact_ids: string[]; rationale: string }>(
          "balanced",
          "segment",
          `${biz} Build a marketing segment matching the description. Return JSON { "criteria": short label, "contact_ids": ids of matching contacts, "rationale": one sentence }.`,
          `Description: ${input.description ?? ""}\nContacts: ${JSON.stringify(contacts ?? [])}`,
          900,
        );
        return json({ result });
      }

      // ---- Analytics ----
      case "ask_data": {
        const system =
          `${biz} You are a precise analytics assistant. Use the tools to read this business's real data, then answer the question with concrete numbers. ` +
          "If money, format with $. Be brief. Respond only with the answer.";
        const t0 = Date.now();
        const model = modelFor("complex");
        const r = await runAgent({ model, system, userMessage: String(input.question ?? ""), tools: READ_TOOLS, toolRunner: toolRunner(ctx.admin, orgId), maxTokens: 900 });
        await meter(ctx.admin, { organizationId: orgId, userId: ctx.userId, model: r.model, feature: "ask_data", tier: "complex", inTok: r.inTok, outTok: r.outTok, latencyMs: Date.now() - t0 });
        return json({ result: { answer: r.text, tools: r.toolCalls } });
      }
      case "auto_insights": {
        const { data: summary } = await ctx.admin.rpc("app_org_ops_summary", { p_org: orgId });
        const result = await run<{ insights: { title: string; detail: string; severity: string }[] }>(
          "balanced",
          "auto_insights",
          `${biz} From the metrics, surface the 3-5 most important insights/actions. Return JSON { "insights": [{ "title": short, "detail": one sentence, "severity": "info"|"warn"|"good" }] }.`,
          JSON.stringify(summary ?? {}),
          700,
        );
        return json({ result });
      }
      case "forecast": {
        const { data: orders } = await ctx.admin
          .from("orders")
          .select("total_cents, status, created_at")
          .eq("organization_id", orgId)
          .in("status", ["paid", "fulfilled"])
          .order("created_at", { ascending: false })
          .limit(180);
        const result = await run<{ revenue_next_30d_cents: number; orders_next_30d: number; narrative: string }>(
          "balanced",
          "forecast",
          `${biz} From recent paid orders, project the next 30 days. Now is ${new Date().toISOString()}. Return JSON { "revenue_next_30d_cents": number, "orders_next_30d": number, "narrative": 1-2 sentences }.`,
          `Orders: ${JSON.stringify(orders ?? [])}`,
          500,
        );
        return json({ result });
      }

      default:
        return json({ error: "Unknown action." }, 400);
    }
  } catch (err) {
    console.error("ai-actions error", err);
    const msg = err instanceof Error && /JSON/.test(err.message) ? "The AI returned an unexpected result. Please try again." : "Something went wrong. Please try again.";
    return json({ error: msg }, 500);
  }
});

// Keep type import referenced for clarity in editors.
export type _Ctx = AuthOk;
