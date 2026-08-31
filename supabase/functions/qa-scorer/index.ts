// Phoxta — qa-scorer: 100%-coverage conversation QA (the Zendesk pattern).
// Cron-invoked: grades closed/handled conversations that haven't been scored,
// with a cheap LLM judge, writing qa_score (1-5) + qa_verdict onto the
// conversation next to the existing CSAT field. One rubric for AI and human
// replies. Guarded by the shared cron secrets; deploy with --no-verify-jwt.
import { json } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { callJson } from "../_shared/anthropic.ts";
import { modelFor } from "../_shared/models.ts";
import { meter } from "../_shared/meter.ts";
import { summarizeConversation } from "../_shared/agentCore.ts";

const BATCH = 20;

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const secret = req.headers.get("x-cron-secret");
  const allowed = [Deno.env.get("BILLING_CRON_SECRET"), Deno.env.get("CRON_SECRET")].filter(Boolean);
  if (!secret || !allowed.includes(secret)) return json({ error: "Forbidden." }, 403);

  const admin = adminClient();
  const { data: due } = await admin
    .from("conversations")
    .select("id, organization_id, channel_type, status, csat")
    .in("status", ["handled", "closed", "escalated"])
    // Train-preview sandbox threads (ai-agent respond with test: true) are not
    // customer conversations. Grading them spent a cheap-tier call per rehearsal
    // and pulled the org's QA average towards whatever the owner was typing.
    .eq("is_test", false)
    .is("qa_at", null)
    .order("last_message_at", { ascending: false })
    .limit(BATCH);

  let scored = 0;
  for (const conv of due ?? []) {
    const { data: msgs } = await admin
      .from("conversation_messages")
      .select("role, body")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true })
      .limit(40);
    if (!msgs || msgs.length < 2) {
      await admin.from("conversations").update({ qa_at: new Date().toISOString(), qa_verdict: "too-short" }).eq("id", conv.id);
      continue;
    }
    const transcript = msgs
      .filter((m) => m.role !== "note")
      .map((m) => `${m.role}: ${String(m.body).slice(0, 600)}`)
      .join("\n").slice(0, 8000);
    try {
      const t0 = Date.now();
      const r = await callJson<{ score: number; resolved: boolean; issues: string }>({
        model: modelFor("cheap"),
        system: `You are a customer-service QA grader. Grade a ${conv.channel_type} conversation between a business's assistant/staff and a customer.
Rubric: 5 = resolved correctly, on-tone, no policy issues; 3 = partially helpful or clunky; 1 = wrong, unhelpful, or policy-violating.
Return strict JSON: {"score": 1-5, "resolved": boolean, "issues": "one short sentence, empty if none"}.`,
        user: `TRANSCRIPT:\n${transcript}`,
        maxTokens: 200,
      });
      await meter(admin, {
        organizationId: conv.organization_id, model: r.model, feature: "qa_score", tier: "cheap",
        inTok: r.inTok, outTok: r.outTok, cacheWriteTok: r.cacheWriteTok, cacheReadTok: r.cacheReadTok,
        latencyMs: Date.now() - t0,
      });
      const verdict = r.data;
      const score = Math.min(5, Math.max(1, Math.round(Number(verdict?.score) || 3)));
      await admin.from("conversations").update({
        qa_score: score,
        qa_verdict: String(verdict?.issues ?? "").slice(0, 300) || (verdict?.resolved ? "resolved" : "unresolved"),
        qa_at: new Date().toISOString(),
      }).eq("id", conv.id);
      scored++;
      // Piggyback memory distillation: ordinary web/SMS threads never had
      // summarize called (audit wiring gap) — the QA pass is the natural place,
      // since every closed conversation flows through here exactly once.
      try {
        const { data: orgRow } = await admin.from("organizations").select("id, name, vertical").eq("id", conv.organization_id).maybeSingle();
        if (orgRow) await summarizeConversation(admin, orgRow, conv.id);
      } catch { /* best-effort */ }
    } catch {
      // Leave qa_at null — retried next run.
    }
  }
  return json({ checked: (due ?? []).length, scored });
});
