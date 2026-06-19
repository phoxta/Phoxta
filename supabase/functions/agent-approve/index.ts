// Phoxta — agent-approve: the owner approves or rejects a queued agent action.
// On approve, the action is executed (same governed write path) and audited.
import { preflight, json } from "../_shared/cors.ts";
import { authorize } from "../_shared/auth.ts";
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { runWrite } from "../_shared/actions.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const body = await req.json().catch(() => ({})) as Json;
    const actionId = body?.actionId;
    const decision = body?.decision; // 'approve' | 'reject'
    if (!actionId) return json({ error: "Missing actionId." }, 400);

    const admin = adminClient();
    const { data: act } = await admin.from("agent_actions").select("*").eq("id", actionId).maybeSingle();
    if (!act) return json({ error: "Action not found." }, 404);
    const a = await authorize(req, (act as Json).organization_id);
    if (a.error) return a.error;
    if ((act as Json).status !== "pending") return json({ error: "That action was already decided." }, 400);

    if (decision === "approve") {
      try {
        const summary = await runWrite(admin, (act as Json).organization_id, (act as Json).tool, (act as Json).args);
        await admin.from("agent_actions").update({ status: "executed", result: summary, decided_at: new Date().toISOString(), decided_by: a.ok.userId }).eq("id", actionId);
        await admin.from("agent_audit_log").insert({ organization_id: (act as Json).organization_id, actor: "owner", tool: (act as Json).tool, args: (act as Json).args, status: "ok", summary });
        return json({ status: "executed", summary });
      } catch (e) {
        await admin.from("agent_actions").update({ status: "failed", error: String((e as Error)?.message || e), decided_at: new Date().toISOString(), decided_by: a.ok.userId }).eq("id", actionId);
        return json({ status: "failed", error: String((e as Error)?.message || e) });
      }
    }

    await admin.from("agent_actions").update({ status: "rejected", decided_at: new Date().toISOString(), decided_by: a.ok.userId }).eq("id", actionId);
    return json({ status: "rejected" });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
