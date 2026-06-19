// Phoxta — automation-run: proactive + AI automations. Two modes:
//  - { automationId }         → a member runs one automation now (returns output)
//  - { mode: "cron" } + x-cron-secret → run every DUE scheduled AI automation
// An ai_briefing composes a summary from the business's data (read tools) and emails
// it; an ai_task runs the owner's instruction through the governed write tools.
import { preflight, json } from "../_shared/cors.ts";
import { authorize, requireUser } from "../_shared/auth.ts";
import { adminClient, type SupabaseClient } from "../_shared/supabaseAdmin.ts";
import { modelFor } from "../_shared/models.ts";
import { runAgent } from "../_shared/anthropic.ts";
import { READ_TOOLS, OPERATOR_READ_TOOLS, MEMORY_TOOLS, toolRunner, memoryContext } from "../_shared/tools.ts";
import { WRITE_TOOLS, isWriteTool, executeAction } from "../_shared/actions.ts";
import { meter } from "../_shared/meter.ts";
import { dispatch } from "../_shared/dispatch.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

async function ownerEmail(admin: SupabaseClient, orgId: string): Promise<string | null> {
  const { data: org } = await admin.from("organizations").select("owner_user_id").eq("id", orgId).maybeSingle();
  const uid = (org as Json)?.owner_user_id;
  if (!uid) return null;
  try {
    const { data } = await admin.auth.admin.getUserById(uid);
    return data?.user?.email ?? null;
  } catch {
    return null;
  }
}

async function runOne(admin: SupabaseClient, automation: Json): Promise<string> {
  const orgId = automation.organization_id;
  const { data: orgRow } = await admin.from("organizations").select("name, vertical").eq("id", orgId).maybeSingle();
  const cfg = automation.config ?? {};
  const isTask = automation.action === "ai_task";
  const instruction = (cfg.instruction && String(cfg.instruction).trim()) ||
    (isTask
      ? "Carry out the task for this business."
      : "Give the owner a short, concrete briefing on the business right now: revenue/orders, anything that needs attention (low stock, unfulfilled orders, pending reservations, open tickets, reviews needing a reply), and one suggestion. Use the read tools; be specific with numbers, a few short lines.");

  const read = toolRunner(admin, orgId);
  const runner = async (name: string, input: Json): Promise<string> =>
    isWriteTool(name) ? await executeAction(admin, orgId, null, name, input) : await read(name, input);

  const mem = await memoryContext(admin, orgId);
  const system =
    `You are the AI operator for "${(orgRow as Json)?.name ?? "this business"}" (${(orgRow as Json)?.vertical ?? "small business"}). ` +
    (isTask
      ? "Carry out the owner's instruction using your tools; write actions may require their approval. "
      : "Produce a concise, concrete briefing from the business's REAL data using the read tools. Plain text, a few short lines. ") +
    "Never invent data — always use a tool." +
    (mem ? `\n\nWhat you remember about this business:\n${mem}` : "");

  const t0 = Date.now();
  const model = modelFor("balanced");
  const r = await runAgent({
    model, system, userMessage: instruction,
    tools: isTask ? [...READ_TOOLS, ...OPERATOR_READ_TOOLS, ...MEMORY_TOOLS, ...WRITE_TOOLS] : [...READ_TOOLS, ...OPERATOR_READ_TOOLS, ...MEMORY_TOOLS],
    toolRunner: runner, maxTurns: 6, maxTokens: 1200,
  });
  await meter(admin, { organizationId: orgId, userId: "automation", model: r.model, feature: "automation", tier: "balanced", inTok: r.inTok, outTok: r.outTok, latencyMs: Date.now() - t0 });

  const output = r.text || "(no output)";
  if ((cfg.channel ?? "email") === "email") {
    const to = await ownerEmail(admin, orgId);
    if (to) await dispatch("email", to, `${automation.name} · ${(orgRow as Json)?.name ?? "Phoxta"}`, output);
  }
  await admin.from("automation_runs").insert({ organization_id: orgId, automation_id: automation.id, status: "ok", output });
  await admin.from("automations").update({ last_run_at: new Date().toISOString(), runs: (automation.runs ?? 0) + 1 }).eq("id", automation.id);
  return output;
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const body = await req.json().catch(() => ({})) as Json;
    const admin = adminClient();

    if (body?.mode === "cron") {
      const u = await requireUser(req);
      if ("error" in u || u.userId !== "cron") return json({ error: "Cron only." }, 401);
      const { data: due } = await admin.from("automations").select("*")
        .in("trigger", ["schedule_daily", "schedule_weekly"]).eq("active", true)
        .in("action", ["ai_briefing", "ai_task"]);
      let ran = 0;
      for (const a of ((due as Json[]) ?? [])) {
        const last = a.last_run_at ? new Date(a.last_run_at).getTime() : 0;
        const hours = a.trigger === "schedule_weekly" ? 24 * 6 : 20;
        if (Date.now() - last >= hours * 3600 * 1000) {
          try { await runOne(admin, a); ran++; } catch (_) { /* keep going */ }
        }
      }
      return json({ ran });
    }

    const { data: a } = await admin.from("automations").select("*").eq("id", body?.automationId).maybeSingle();
    if (!a) return json({ error: "Automation not found." }, 404);
    const auth = await authorize(req, (a as Json).organization_id);
    if (auth.error) return auth.error;
    const output = await runOne(admin, a);
    return json({ output });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
