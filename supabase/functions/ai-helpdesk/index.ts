// Phoxta — AI helpdesk deflection (RAG-grounded).
// Embeds the ticket, retrieves the business's own knowledge (products, published
// pages, resolved tickets) via pgvector, and drafts a reply + confidence. Same
// auth/metering model as the gateway.
import { preflight, json } from "../_shared/cors.ts";
import { authorize } from "../_shared/auth.ts";
import { modelFor } from "../_shared/models.ts";
import { callJson } from "../_shared/anthropic.ts";
import { embedOne } from "../_shared/openai.ts";
import { meter } from "../_shared/meter.ts";

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    const body = await req.json().catch(() => null);
    const organizationId = body?.organizationId;
    const ticketId = body?.ticketId;
    if (!ticketId) return json({ error: "Missing ticket details." }, 400);

    const a = await authorize(req, organizationId);
    if (a.error) return a.error;
    const { userId, admin, org } = a.ok;

    const { data: ticket } = await admin
      .from("tickets")
      .select("subject, customer_name")
      .eq("id", ticketId)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (!ticket) return json({ error: "That ticket could not be found." }, 404);

    const { data: msgs } = await admin
      .from("ticket_messages")
      .select("author, body")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true })
      .limit(20);
    const thread = ((msgs as { author: string; body: string }[] | null) ?? []).map((m) => `${m.author}: ${m.body}`).join("\n") || `customer: ${ticket.subject}`;

    // RAG: retrieve the business's own knowledge relevant to the question.
    let knowledge = "";
    try {
      const emb = await embedOne(`${ticket.subject}\n${thread}`);
      const { data: matches } = await admin.rpc("app_match_embeddings", {
        p_org: organizationId,
        query_embedding: emb,
        match_count: 8,
        p_source_types: ["products", "cms_pages", "tickets"],
      });
      knowledge = ((matches as { source_type: string; content: string }[] | null) ?? []).map((r) => `[${r.source_type}] ${r.content}`).join("\n---\n");
    } catch (_) {
      knowledge = ""; // RAG optional (e.g. embeddings not yet generated)
    }

    const system =
      `You are a support agent for "${org.name}", a ${org.vertical || "small"} business. ` +
      "Draft a helpful, friendly reply using ONLY the retrieved business knowledge. If the knowledge does not contain the answer, say so briefly and offer to escalate — never invent policies, prices or facts. " +
      "Return JSON: { \"reply\": string, \"confidence\": number (0-1, how sure you are the reply fully resolves it), \"resolved\": boolean }.";

    const user = [
      `TICKET: ${ticket.subject}`,
      `\nCONVERSATION:\n${thread}`,
      knowledge ? `\nRETRIEVED KNOWLEDGE:\n${knowledge}` : "\n(no indexed knowledge available)",
      "\nDraft the reply now.",
    ].join("\n");

    const t0 = Date.now();
    const model = modelFor("balanced");
    const { data, inTok, outTok, model: used } = await callJson<{ reply: string; confidence: number; resolved: boolean }>({
      model,
      system,
      user,
      maxTokens: 900,
    });
    await meter(admin, { organizationId, userId, model: used, feature: "helpdesk", tier: "balanced", inTok, outTok, latencyMs: Date.now() - t0 });

    if (!data?.reply) return json({ error: "Couldn't draft a reply for that ticket." }, 502);
    return json({ reply: data.reply, confidence: data.confidence ?? 0.5, resolved: !!data.resolved });
  } catch (err) {
    console.error("ai-helpdesk error", err);
    return json({ error: "Couldn't draft a reply right now. Please try again." }, 500);
  }
});
