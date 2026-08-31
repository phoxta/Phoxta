// Phoxta — AI helpdesk deflection (RAG-grounded).
// Embeds the ticket, retrieves the business's own knowledge (products, published
// pages, and the owner's knowledge docs — public AND internal, because the
// reader here is a staff member drafting a reply, not a customer) via pgvector,
// and drafts a reply + confidence. Same auth/metering model as the gateway,
// including the monthly cap.
//
// Other tickets are deliberately NOT retrieved. They used to be: a ticket's
// embedding is its subject line, so "retrieved knowledge" was a list of other
// customers' subject lines — no answers in them, and a name or an order number
// in one was a paste away from someone else's reply.
import { preflight, json } from "../_shared/cors.ts";
import { authorize } from "../_shared/auth.ts";
import { modelFor } from "../_shared/models.ts";
import { callJson } from "../_shared/anthropic.ts";
import { embedOne } from "../_shared/openai.ts";
import { meter, assertWithinCap, CAP_REACHED_MESSAGE } from "../_shared/meter.ts";

/** Below this cosine similarity a match is noise. Without a floor, a ticket
 *  about a refund on an index with no refund policy still got its eight
 *  "nearest" rows — eight unrelated products — and the model was told to answer
 *  ONLY from them. */
const MIN_SIMILARITY = 0.45;
/** One retrieved row's worth of prompt. A whole published page is thousands of
 *  characters; eight of them crowd out the ticket the model is meant to answer. */
const ROW_CHARS = 1_500;
/** And the ceiling on all of them together. */
const KNOWLEDGE_CHARS = 8_000;

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

    // Before the embedding call as well as the draft: both spend the budget.
    const allowance = await assertWithinCap(admin, org.id);
    if (!allowance.ok) return json({ error: CAP_REACHED_MESSAGE, limitReached: true }, 429);

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
        p_source_types: ["products", "cms_pages", "knowledge_docs", "knowledge_docs_internal"],
        p_min_similarity: MIN_SIMILARITY,
      });
      // Best matches first (the RPC orders by distance), each cut to ROW_CHARS,
      // and the list stops once the total would pass KNOWLEDGE_CHARS — so the
      // prompt has a known upper size whatever is in the index.
      const rows = (matches as { source_type: string; content: string }[] | null) ?? [];
      const pieces: string[] = [];
      let total = 0;
      for (const r of rows) {
        const piece = `[${r.source_type}] ${String(r.content ?? "").slice(0, ROW_CHARS)}`;
        if (total + piece.length > KNOWLEDGE_CHARS) break;
        pieces.push(piece);
        total += piece.length;
      }
      knowledge = pieces.join("\n---\n");
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
    const { data, inTok, outTok, cacheWriteTok, cacheReadTok, model: used } = await callJson<{ reply: string; confidence: number; resolved: boolean }>({
      model,
      system,
      user,
      maxTokens: 900,
    });
    await meter(admin, { organizationId: org.id, userId, model: used, feature: "helpdesk", tier: "balanced", inTok, outTok, cacheWriteTok, cacheReadTok, latencyMs: Date.now() - t0 });

    if (!data?.reply) return json({ error: "Couldn't draft a reply for that ticket." }, 502);
    return json({ reply: data.reply, confidence: data.confidence ?? 0.5, resolved: !!data.resolved });
  } catch (err) {
    console.error("ai-helpdesk error", err);
    return json({ error: "Couldn't draft a reply right now. Please try again." }, 500);
  }
});
