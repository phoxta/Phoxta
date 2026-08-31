// Phoxta — agent-approve: the owner approves or rejects a queued agent action.
// On approve, the action is executed (same governed write path) and audited.
import { preflight, json } from "../_shared/cors.ts";
import { authorize } from "../_shared/auth.ts";
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { runWrite, recordAudit } from "../_shared/actions.ts";

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
    // Approving a queued write is the whole point of the 'approve' policy mode —
    // it must require owner/admin, not mere membership, or any member (including
    // whoever asked the agent for the change) can wave through their own request.
    const a = await authorize(req, (act as Json).organization_id, { requireAdmin: true });
    if (a.error) return a.error;

    // Atomically claim the action before executing. A plain read-then-write let
    // two concurrent approvals both observe 'pending' and both run the write —
    // a duplicated price change, email, or fulfilment.
    const decided = new Date().toISOString();
    // 'approved' is the intermediate claim state (it is already in the table's
    // status CHECK constraint); it becomes 'executed' or 'failed' below.
    const claimStatus = decision === "approve" ? "approved" : "rejected";
    const { data: claimed } = await admin
      .from("agent_actions")
      .update({ status: claimStatus, decided_at: decided, decided_by: a.ok.userId })
      .eq("id", actionId)
      .eq("status", "pending") // ← only the request that wins the race proceeds
      .select("id")
      .maybeSingle();
    if (!claimed) return json({ error: "That action was already decided." }, 400);

    if (decision === "approve") {
      const orgId = (act as Json).organization_id;
      const tool = (act as Json).tool;
      // A6 — execute the action the owner APPROVED, exactly as it was queued. The
      // args already carry the target id executeAction stamped at queue time
      // (args.__target), so runWrite acts on the very row the owner looked at,
      // rather than re-resolving the name now (hours later, when a rename or a
      // second "John Smith" could point it at a different row).
      const args = (act as Json).args;
      try {
        // Attributed to whoever approved it: they are the person authorising the write.
        const summary = await runWrite(admin, orgId, tool, args, a.ok.userId);
        await admin.from("agent_actions").update({ status: "executed", result: summary }).eq("id", actionId);
        // Same audit shape as the operator's own path (actor_id + source), via the
        // shared writer — the daily outbound cap counts 'ok' rows from this table.
        await recordAudit(admin, orgId, { tool, args, status: "ok", summary, actor: "owner", actorId: a.ok.userId, source: "approval" });
        return json({ status: "executed", summary });
      } catch (e) {
        const msg = String((e as Error)?.message || e);
        await admin.from("agent_actions").update({ status: "failed", error: msg }).eq("id", actionId);
        await recordAudit(admin, orgId, { tool, args, status: "error", summary: msg, actor: "owner", actorId: a.ok.userId, source: "approval" });
        return json({ status: "failed", error: msg });
      }
    }

    return json({ status: "rejected" });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
