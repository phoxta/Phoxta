// Phoxta — agent-operator: the owner's AI operator. One agent per tenant that can
// READ the business's data (RAG + structured) and PERFORM changes via the write
// tools — every write governed by per-tool policy (off/approve/auto), queued for
// approval where required, and audited. Reuses the existing agent runner + metering.
import { preflight, json } from "../_shared/cors.ts";
import { authorize } from "../_shared/auth.ts";
import { modelFor } from "../_shared/models.ts";
import { runAgent } from "../_shared/anthropic.ts";
import { READ_TOOLS, OPERATOR_READ_TOOLS, MEMORY_TOOLS, toolRunner, memoryContext } from "../_shared/tools.ts";
import { WRITE_TOOLS, isWriteTool, executeAction } from "../_shared/actions.ts";
import { meter } from "../_shared/meter.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const body = await req.json().catch(() => ({})) as Json;
    const orgId: string | undefined = body?.organizationId;
    const a = await authorize(req, orgId);
    if (a.error) return a.error;
    const ctx = a.ok;
    const message = String(body?.message ?? "");
    const history = Array.isArray(body?.history) ? body.history.slice(-8) : [];
    if (!message) return json({ error: "Empty message." }, 400);

    const read = toolRunner(ctx.admin, orgId as string);
    const runner = async (name: string, input: Json): Promise<string> =>
      isWriteTool(name) ? await executeAction(ctx.admin, orgId as string, ctx.userId, name, input) : await read(name, input);

    const mem = await memoryContext(ctx.admin, orgId as string);
    const system =
      `You are the AI operator for "${ctx.org.name}" (${ctx.org.vertical || "small business"}). ` +
      `You help the owner run the business. Answer from their real data using the read tools, and make changes using the write tools. ` +
      `You can act across the whole platform: products and orders, CRM contacts, invoices, bookings and reservations, content, support tickets, marketing campaigns, locations, and Google Workspace — and you can reach customers directly by placing phone calls or sending SMS, WhatsApp or email. Reference things by name (e.g. a customer or product) and the tools will resolve them. ` +
      `Be concise and concrete; when you change something, state exactly what changed. Some write actions need the owner's approval — ` +
      `if a tool reports an action was queued, tell the owner to approve it in Agent → Operator. Use the remember tool when the owner shares a lasting preference or fact. Never invent data — always use a tool.` +
      (mem ? `\n\nWhat you remember about this business:\n${mem}` : "");

    const t0 = Date.now();
    const model = modelFor("balanced");
    const r = await runAgent({
      model,
      system,
      userMessage: message,
      history,
      tools: [...READ_TOOLS, ...OPERATOR_READ_TOOLS, ...MEMORY_TOOLS, ...WRITE_TOOLS],
      toolRunner: runner,
      maxTurns: 8,
      maxTokens: 1500,
    });
    await meter(ctx.admin, { organizationId: orgId as string, userId: ctx.userId, model: r.model, feature: "operator", tier: "balanced", inTok: r.inTok, outTok: r.outTok, latencyMs: Date.now() - t0 });
    return json({ reply: r.text, toolCalls: r.toolCalls });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
