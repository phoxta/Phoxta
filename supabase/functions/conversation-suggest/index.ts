// Phoxta — conversation-suggest: the AI copilot for human handoff. Given a
// conversation, returns a one-line SUMMARY of the situation and a SUGGESTED
// reply the human can insert/edit/send. Read-only — it never sends or records.
import { preflight, json } from "../_shared/cors.ts";
import { authorize } from "../_shared/auth.ts";
import { callMessages } from "../_shared/anthropic.ts";
import { modelFor } from "../_shared/models.ts";
import { loadConfig } from "../_shared/agentCore.ts";
import { meter } from "../_shared/meter.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const body = (await req.json().catch(() => ({}))) as Json;
    const orgId = body?.organizationId;
    const conversationId = body?.conversationId;
    if (!conversationId) return json({ error: "Missing conversation." }, 400);

    const a = await authorize(req, orgId);
    if (a.error) return a.error;
    const { admin, userId, org } = a.ok;

    const config = await loadConfig(admin, org.id);
    const { data: msgs } = await admin
      .from("conversation_messages")
      .select("role, body")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(30);
    const rows = (msgs as Json[] | null) ?? [];
    if (rows.length === 0) return json({ summary: "", suggestion: "" });

    const transcript = rows
      .filter((m) => m.role !== "note")
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
      inTok: r.inTok, outTok: r.outTok, latencyMs: Date.now() - t0,
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
