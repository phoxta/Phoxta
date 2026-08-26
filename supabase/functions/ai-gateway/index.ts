// Phoxta — AI gateway (the per-tenant assistant + agent runtime).
// RAG-grounded chat: runs the Anthropic tool-use loop over read-only tools
// scoped to one business, tier-routed, metered, prompt-cached. The model key
// lives only here. Deploy: supabase functions deploy ai-gateway
//   secrets: ANTHROPIC_API_KEY, OPENAI_API_KEY (for the search_knowledge tool)
import { preflight, json } from "../_shared/cors.ts";
import { authorize } from "../_shared/auth.ts";
import { modelFor } from "../_shared/models.ts";
import { runAgent } from "../_shared/anthropic.ts";
import { READ_TOOLS, OWNER_READ_TOOLS, toolRunner } from "../_shared/tools.ts";
import { meter, MONTHLY_TOKEN_CAP, tokensUsedThisMonth } from "../_shared/meter.ts";

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    const body = await req.json().catch(() => null);
    const organizationId = body?.organizationId;
    const message = (body?.message ?? "").toString().trim();
    let conversationId = body?.conversationId;
    if (!message) return json({ error: "Type a message to send." }, 400);
    if (message.length > 8000) return json({ error: "That message is too long. Please shorten it." }, 400);

    const a = await authorize(req, organizationId);
    if (a.error) return a.error;
    const { userId, admin, org } = a.ok;

    // Plan allowance
    const { data: sub } = await admin.from("subscriptions").select("plan, status").eq("organization_id", organizationId).maybeSingle();
    const plan = sub?.status === "active" ? (sub?.plan ?? "starter") : (sub?.plan ?? "trialing");
    const cap = MONTHLY_TOKEN_CAP[plan] ?? MONTHLY_TOKEN_CAP.starter;
    if ((await tokensUsedThisMonth(admin, organizationId)) >= cap) {
      return json({ error: "You've reached this month's assistant usage for your plan. Upgrade to keep going.", limitReached: true }, 429);
    }

    // Resolve / create conversation
    if (conversationId) {
      const { data: conv } = await admin.from("ai_conversations").select("id").eq("id", conversationId).eq("organization_id", organizationId).maybeSingle();
      if (!conv) conversationId = undefined;
    }
    if (!conversationId) {
      const title = message.length > 60 ? `${message.slice(0, 57)}…` : message;
      const { data: created } = await admin.from("ai_conversations").insert({ organization_id: organizationId, user_id: userId, title }).select("id").single();
      conversationId = created?.id;
    }

    // The NEWEST rows, re-sorted chronologically. Ordering ascending under a
    // limit hands the model the OPENING of a long thread and never what the
    // owner just asked. Rows written in one batch share created_at (it defaults
    // to the statement's now()), so role breaks the tie: descending, "assistant"
    // sorts before "user", which reverses into the user-then-assistant pair.
    const { data: hist } = await admin
      .from("ai_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .order("role", { ascending: true })
      .limit(20);
    const history = ((hist as { role: "user" | "assistant"; content: string }[] | null) ?? [])
      .reverse()
      .map((m) => ({ role: m.role, content: m.content }));
    // The Messages API requires the first turn to be `user`; a window that
    // happens to open on an assistant turn would 400 the whole request.
    while (history.length && history[0].role === "assistant") history.shift();

    const system =
      `You are the AI business assistant for "${org.name}", a ${org.vertical || "small"} business on Phoxta. ` +
      "Help the owner run and grow the business — drafting, planning, summarising and answering operational questions. " +
      "ALWAYS use the tools to look up the business's real data (products, metrics, orders, knowledge) before answering — never invent prices, products, policies or numbers. " +
      "Be concrete and concise. Respond only with your final answer.";

    const t0 = Date.now();
    const model = modelFor("balanced");
    const run = await runAgent({
      model,
      system,
      userMessage: message,
      history,
      tools: [...READ_TOOLS, ...OWNER_READ_TOOLS],
      toolRunner: toolRunner(admin, organizationId),
      maxTokens: 1024,
    });
    const latency = Date.now() - t0;

    if (!run.text) return json({ error: "The assistant couldn't produce a reply. Try rephrasing." }, 502);

    // Both rows carry the SAME key set. PostgREST rejects a mixed-key batch
    // outright (PGRST102 "All object keys must match"), so the user row's
    // model/token columns are spelled out as null/0 rather than left off —
    // omitting them dropped the entire transcript and every follow-up question
    // then started from an empty history. The error is logged, never swallowed.
    const { error: msgErr } = await admin.from("ai_messages").insert([
      { conversation_id: conversationId, organization_id: organizationId, role: "user", content: message, model: null, input_tokens: 0, output_tokens: 0 },
      { conversation_id: conversationId, organization_id: organizationId, role: "assistant", content: run.text, model: run.model, input_tokens: run.inTok, output_tokens: run.outTok },
    ]);
    if (msgErr) console.error("[phoxta] ai_messages insert failed:", msgErr.message);
    await meter(admin, { organizationId, userId, conversationId, model: run.model, feature: "assistant", tier: "balanced", inTok: run.inTok, outTok: run.outTok, cacheWriteTok: run.cacheWriteTok, cacheReadTok: run.cacheReadTok, latencyMs: latency });
    await admin.from("ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);

    return json({ conversationId, reply: run.text, usage: { input_tokens: run.inTok, output_tokens: run.outTok }, tools: run.toolCalls });
  } catch (err) {
    console.error("ai-gateway error", err);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
