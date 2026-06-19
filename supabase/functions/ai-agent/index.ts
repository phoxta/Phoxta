// Phoxta — ai-agent: the one unified agent (authenticated entrypoint).
// Actions: respond (omnichannel turn), outbound_turn (generate an outbound
// call/SMS/email script line), summarize. Deploy alongside the other functions;
// uses ANTHROPIC_API_KEY + OPENAI_API_KEY.
import { preflight, json } from "../_shared/cors.ts";
import { authorize } from "../_shared/auth.ts";
import { modelFor } from "../_shared/models.ts";
import { callMessages } from "../_shared/anthropic.ts";
import { meter } from "../_shared/meter.ts";
import { respondCore, summarizeConversation, loadConfig } from "../_shared/agentCore.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    const body = await req.json().catch(() => null);
    const organizationId = body?.organizationId;
    const action = body?.action ?? "respond";

    const a = await authorize(req, organizationId);
    if (a.error) return a.error;
    const { userId, admin, org } = a.ok;
    const config = await loadConfig(admin, organizationId);

    if (action === "respond") {
      const message = (body?.message ?? "").toString().trim();
      if (!message) return json({ error: "Type a message." }, 400);
      const result = await respondCore(admin, org, config, {
        channel: body?.channel ?? "web",
        conversationId: body?.conversationId,
        customer: body?.customer ?? {},
        message,
        userId,
      });
      return json(result);
    }

    if (action === "summarize") {
      if (!body?.conversationId) return json({ error: "Missing conversation." }, 400);
      await summarizeConversation(admin, org, body.conversationId);
      return json({ ok: true });
    }

    if (action === "outbound_turn") {
      const { data: task } = await admin.from("outbound_tasks").select("*").eq("id", body?.taskId).eq("organization_id", organizationId).maybeSingle();
      if (!task) return json({ error: "Task not found." }, 404);
      const t = task as Json;
      const { data: campaign } = t.campaign_id ? await admin.from("outbound_campaigns").select("name, type, goal, script").eq("id", t.campaign_id).maybeSingle() : { data: null };
      const c = (campaign as Json) ?? { type: t.type, goal: "", script: "", name: "Outreach" };

      const system =
        `You are ${config.display_name}, the AI agent for "${org.name}". Persona: ${config.persona}. ` +
        `You are running an outbound ${c.type} via ${t.channel}. Goal: ${c.goal || c.type}. ${c.script ? `Script guide: ${c.script}.` : ""} ` +
        "Write a natural, human, concise opening message for this contact. Respond only with the message.";
      const tier = config.model_tier ?? "balanced";
      const t0 = Date.now();
      const r = await callMessages({
        model: modelFor(tier),
        system,
        messages: [{ role: "user", content: `Contact: ${t.customer_name || "customer"}.` }],
        maxTokens: 400,
      });
      await meter(admin, { organizationId, userId, model: r.model, feature: "agent_outbound", tier, inTok: r.inTok, outTok: r.outTok, latencyMs: Date.now() - t0 });

      // Log it as an outbound conversation so it appears in the inbox.
      const channelType = t.channel === "call" ? "voice" : t.channel === "sms" ? "sms" : "web";
      const { data: conv } = await admin
        .from("conversations")
        .insert({ organization_id: organizationId, channel_type: channelType, contact_id: t.contact_id, customer_name: t.customer_name, status: "handled" })
        .select("id")
        .single();
      await admin.from("conversation_messages").insert({ organization_id: organizationId, conversation_id: (conv as Json).id, role: "agent", channel_type: channelType, body: r.text });
      return json({ message: r.text, conversationId: (conv as Json).id });
    }

    return json({ error: "Unknown action." }, 400);
  } catch (err) {
    console.error("ai-agent error", err);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
