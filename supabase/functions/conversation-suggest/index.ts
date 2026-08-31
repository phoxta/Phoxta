// Phoxta — conversation-suggest: the AI copilot for human handoff. Given a
// conversation, returns a one-line SUMMARY of the situation and a SUGGESTED
// reply the human can insert/edit/send. Read-only — it never sends or records.
import { preflight, json } from "../_shared/cors.ts";
import { authorize } from "../_shared/auth.ts";
import { callMessages } from "../_shared/anthropic.ts";
import { modelFor } from "../_shared/models.ts";
import { loadConfig } from "../_shared/agentCore.ts";
import { assertWithinCap, CAP_REACHED_MESSAGE, meter } from "../_shared/meter.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const body = (await req.json().catch(() => ({}))) as Json;
    const orgId = body?.organizationId;
    const conversationId = String(body?.conversationId ?? "");
    if (!UUID_RE.test(conversationId)) return json({ error: "Missing conversation." }, 400);

    const a = await authorize(req, orgId);
    if (a.error) return a.error;
    const { admin, userId, org } = a.ok;

    // authorize() proved membership of THIS business; it did not prove the
    // conversation belongs to it. The transcript query used to filter on the
    // conversation id alone, so a member of one business who obtained an id from
    // another could have its whole thread summarised for them. The row is loaded
    // scoped to the org first, and the messages query carries the org as well —
    // two filters, so neither can be the only thing standing between tenants.
    const { data: conv } = await admin
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("organization_id", org.id)
      .maybeSingle();
    if (!conv) return json({ error: "That conversation could not be found." }, 404);

    // The plan's allowance, BEFORE the model is called. Every authenticated AI
    // feature runs this; a copilot draft is model spend like any other.
    const cap = await assertWithinCap(admin, org.id);
    if (!cap.ok) return json({ error: CAP_REACHED_MESSAGE, limitReached: true }, 429);

    const config = await loadConfig(admin, org.id);
    // Only what the customer actually saw or said. A private note is not part of
    // the exchange, and a reply that never left the building (delivery failed,
    // or a sandbox "simulated" send) would read to the copilot as something we
    // told the customer.
    const { data: msgs } = await admin
      .from("conversation_messages")
      .select("role, body")
      .eq("organization_id", org.id)
      .eq("conversation_id", conversationId)
      .in("role", ["customer", "agent", "human"])
      .or("delivery_status.is.null,delivery_status.not.in.(failed,simulated)")
      .order("created_at", { ascending: true })
      .limit(30);
    const rows = (msgs as Json[] | null) ?? [];
    if (rows.length === 0) return json({ summary: "", suggestion: "" });

    const transcript = rows
      .map((m) => `${m.role === "customer" ? "Customer" : "Us"}: ${m.body}`)
      .join("\n");

    const system =
      `You are an AI copilot assisting a human support agent at ${org.name}` +
      `${config.persona ? ` (${config.persona})` : ""}. ` +
      `Tone: ${config.tone || "warm, professional, concise"}. ` +
      `Read the conversation and respond with STRICT JSON only, no prose, in the form ` +
      `{"summary":"<one sentence on the situation and what the customer wants>","suggestion":"<a ready-to-send reply to the customer, grounded in what's known; do not invent specifics>"}.`;

    const t0 = Date.now();
    const r = await callMessages({
      model: modelFor(config.model_tier ?? "balanced"),
      system,
      messages: [{ role: "user", content: transcript }],
      maxTokens: 500,
    });
    await meter(admin, {
      organizationId: org.id, userId, conversationId, model: r.model,
      feature: "agent_assist", tier: config.model_tier ?? "balanced",
      inTok: r.inTok, outTok: r.outTok, cacheWriteTok: r.cacheWriteTok, cacheReadTok: r.cacheReadTok, latencyMs: Date.now() - t0,
    });

    let summary = "";
    let suggestion = "";
    try {
      const m = r.text.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(m ? m[0] : r.text);
      summary = (parsed.summary ?? "").toString();
      suggestion = (parsed.suggestion ?? "").toString();
    } catch {
      suggestion = r.text.trim(); // fall back to the raw draft
    }
    return json({ summary, suggestion });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
