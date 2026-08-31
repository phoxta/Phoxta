// Phoxta — AI gateway (the per-tenant assistant + agent runtime).
// RAG-grounded chat: runs the Anthropic tool-use loop over read-only tools
// scoped to one business, tier-routed, metered, prompt-cached. The model key
// lives only here. Deploy: supabase functions deploy ai-gateway
//   secrets: ANTHROPIC_API_KEY, OPENAI_API_KEY (for the search_knowledge tool)
import { preflight, json } from "../_shared/cors.ts";
import { authorize } from "../_shared/auth.ts";
import { modelFor } from "../_shared/models.ts";
import { runAgent } from "../_shared/anthropic.ts";
import { READ_TOOLS, OWNER_READ_TOOLS, OPERATOR_READ_TOOLS, MEMORY_TOOLS, toolRunner } from "../_shared/tools.ts";
import { assertWithinCap, CAP_REACHED_MESSAGE, meter } from "../_shared/meter.ts";
import type { SupabaseClient } from "../_shared/supabaseAdmin.ts";

/** Run bookkeeping after the response has gone out, when the runtime allows it.
 *  The owner is waiting on the reply; the three writes that follow it — the
 *  transcript rows, the usage row, the thread's updated_at — are ours to finish
 *  on our own time. Where waitUntil is unavailable they run inline: a promise
 *  merely left dangling can be cut off when the isolate exits. */
async function afterResponse(task: Promise<unknown>): Promise<void> {
  // deno-lint-ignore no-explicit-any
  const rt = (globalThis as any).EdgeRuntime;
  if (rt?.waitUntil) rt.waitUntil(task);
  else await task;
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  // Hoisted so the catch can still write a "failed" usage row: a turn that
  // throws mid-loop has usually already spent tokens on the tenant's account,
  // and a spend that is not metered is a spend the cap never sees.
  let admin: SupabaseClient | null = null;
  let organizationId: string | undefined;
  let userId: string | undefined;
  let conversationId: string | undefined;
  let model = modelFor("balanced");
  const t0 = Date.now();

  try {
    const body = await req.json().catch(() => null);
    organizationId = body?.organizationId;
    const message = (body?.message ?? "").toString().trim();
    conversationId = body?.conversationId;
    if (!message) return json({ error: "Type a message to send." }, 400);
    if (message.length > 8000) return json({ error: "That message is too long. Please shorten it." }, 400);

    const a = await authorize(req, organizationId);
    if (a.error) return a.error;
    const { org } = a.ok;
    admin = a.ok.admin;
    userId = a.ok.userId;
    const orgId = org.id;

    // Plan allowance — the ONE definition of which plan's cap applies (a lapsed
    // subscription floors to starter). This file used to let a non-active
    // subscription keep its paid plan's cap while the public agent did not, so
    // a cancelled `scale` org still drew 5M tokens a month here.
    const cap = await assertWithinCap(admin, orgId);
    if (!cap.ok) return json({ error: CAP_REACHED_MESSAGE, limitReached: true }, 429);

    // Resolve / create conversation
    if (conversationId) {
      const { data: conv } = await admin.from("ai_conversations").select("id").eq("id", conversationId).eq("organization_id", orgId).maybeSingle();
      if (!conv) conversationId = undefined;
    }
    if (!conversationId) {
      const title = message.length > 60 ? `${message.slice(0, 57)}…` : message;
      const { data: created } = await admin.from("ai_conversations").insert({ organization_id: orgId, user_id: userId, title }).select("id").single();
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

    model = modelFor("balanced");
    const run = await runAgent({
      model,
      system,
      userMessage: message,
      history,
      tools: [...READ_TOOLS, ...OWNER_READ_TOOLS, ...OPERATOR_READ_TOOLS, ...MEMORY_TOOLS],
      toolRunner: toolRunner(admin, orgId),
      maxTokens: 1024,
    });
    const latency = Date.now() - t0;

    // A loop that ran out of turns is not an answer: runAgent now reports it as
    // `exhausted` with an empty text instead of a prose apology, and the tokens
    // it spent getting there are still metered — as a failure, so the cost
    // dashboard can tell "the assistant gave up" from "the assistant answered".
    // Read structurally: the field lands with the concurrent anthropic.ts
    // rewrite, and this must compile against either shape of the result.
    const exhausted = (run as unknown as { exhausted?: boolean }).exhausted === true;
    if (exhausted || !run.text) {
      await afterResponse(meter(admin, { organizationId: orgId, userId, conversationId, model: run.model, feature: "assistant", tier: "balanced", inTok: run.inTok, outTok: run.outTok, cacheWriteTok: run.cacheWriteTok, cacheReadTok: run.cacheReadTok, latencyMs: latency, status: "failed" }));
      return json({
        error: exhausted
          ? "The assistant ran out of steps before it could finish — try a narrower question, or ask for one thing at a time."
          : "The assistant couldn't produce a reply. Try rephrasing.",
        conversationId,
      }, 502);
    }

    // Both rows carry the SAME key set. PostgREST rejects a mixed-key batch
    // outright (PGRST102 "All object keys must match"), so the user row's
    // model/token columns are spelled out as null/0 rather than left off —
    // omitting them dropped the entire transcript and every follow-up question
    // then started from an empty history. The error is logged, never swallowed.
    //
    // All three writes happen AFTER the response is on the wire (waitUntil):
    // the owner was waiting on three sequential round-trips that changed nothing
    // about the reply they were about to read.
    const db = admin;
    const convId = conversationId;
    await afterResponse((async () => {
      const { error: msgErr } = await db.from("ai_messages").insert([
        { conversation_id: convId, organization_id: orgId, role: "user", content: message, model: null, input_tokens: 0, output_tokens: 0 },
        { conversation_id: convId, organization_id: orgId, role: "assistant", content: run.text, model: run.model, input_tokens: run.inTok, output_tokens: run.outTok },
      ]);
      if (msgErr) console.error("[phoxta] ai_messages insert failed:", msgErr.message);
      await meter(db, { organizationId: orgId, userId, conversationId: convId, model: run.model, feature: "assistant", tier: "balanced", inTok: run.inTok, outTok: run.outTok, cacheWriteTok: run.cacheWriteTok, cacheReadTok: run.cacheReadTok, latencyMs: latency });
      await db.from("ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);
    })());

    return json({ conversationId, reply: run.text, usage: { input_tokens: run.inTok, output_tokens: run.outTok }, tools: run.toolCalls });
  } catch (err) {
    console.error("ai-gateway error", err);
    // The tokens a failed loop burned before it threw. anthropic.ts attaches
    // them to the error it raises (`usage`), so the failure is billed to the
    // month like any other turn rather than vanishing from the cap.
    const usage = (err as { usage?: { inTok?: number; outTok?: number } } | null)?.usage;
    if (admin && organizationId && usage) {
      await afterResponse(meter(admin, { organizationId, userId, conversationId, model, feature: "assistant", tier: "balanced", inTok: usage.inTok ?? 0, outTok: usage.outTok ?? 0, latencyMs: Date.now() - t0, status: "failed" }));
    }
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
