// Phoxta — place-call: click-to-call from the operating console. Twilio dials
// the customer from the business number and bridges them to the business's own
// Pipecat AI agent (no third-party voice vendor). Logs to call_logs.
import { preflight, json } from "../_shared/cors.ts";
import { authorize } from "../_shared/auth.ts";
import { placeAiCall, placeBridgeCall } from "../_shared/dispatch.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const body = (await req.json().catch(() => ({}))) as Json;
    const orgId = body?.organizationId;
    const to = (body?.to ?? "").toString().trim();
    const conversationId = body?.conversationId ?? null;
    const mode = body?.mode === "bridge" ? "bridge" : "ai";
    const opening = (body?.opening ?? "").toString();
    if (!to) return json({ error: "No phone number to call." }, 400);

    const a = await authorize(req, orgId);
    if (a.error) return a.error;
    const { admin, org, userId } = a.ok;

    let r;
    if (mode === "bridge") {
      // "Connect me": dial the operator first, then bridge in the customer.
      let agentPhone = (body?.agentPhone ?? "").toString().trim();
      if (!agentPhone) {
        const { data: prof } = await admin.from("user_profiles").select("phone").eq("user_id", userId).maybeSingle();
        agentPhone = ((prof as Json)?.phone ?? "").trim();
      }
      if (!agentPhone) return json({ error: "No number to reach you on — add a phone in your profile or enter one." }, 400);
      r = await placeBridgeCall(to, agentPhone);
    } else {
      // AI places the call and talks (optionally opening with `opening`).
      const { data: cfg } = await admin.from("agent_config").select("public_key").eq("organization_id", org.id).maybeSingle();
      const key = (cfg as Json)?.public_key;
      if (!key) return json({ error: "No AI agent is configured for this business yet." }, 400);
      r = await placeAiCall(key, to, opening);
    }

    await admin.from("call_logs").insert({
      organization_id: org.id, conversation_id: conversationId,
      direction: "outbound", to_number: to, outcome: r.status,
    });
    if (!r.ok && r.status !== "simulated") return json({ ok: false, error: r.error ?? "Call could not be placed." }, 200);
    return json({ ok: true, status: r.status, sid: r.sid, mode });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
