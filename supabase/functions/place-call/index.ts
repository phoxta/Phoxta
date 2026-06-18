// Phoxta — place-call: click-to-call from the operating console. Twilio dials
// the customer from the business number and bridges them to the business's own
// Pipecat AI agent (no third-party voice vendor). Logs to call_logs.
import { preflight, json } from "../_shared/cors.ts";
import { authorize } from "../_shared/auth.ts";
import { placeAiCall } from "../_shared/dispatch.ts";

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
    if (!to) return json({ error: "No phone number to call." }, 400);

    const a = await authorize(req, orgId);
    if (a.error) return a.error;
    const { admin, org } = a.ok;

    const { data: cfg } = await admin.from("agent_config").select("public_key").eq("organization_id", org.id).maybeSingle();
    const key = (cfg as Json)?.public_key;
    if (!key) return json({ error: "No AI agent is configured for this business yet." }, 400);

    const r = await placeAiCall(key, to);
    await admin.from("call_logs").insert({
      organization_id: org.id, conversation_id: conversationId,
      direction: "outbound", to_number: to, outcome: r.status,
    });
    if (!r.ok && r.status !== "simulated") return json({ ok: false, error: r.error ?? "Call could not be placed." }, 200);
    return json({ ok: true, status: r.status, sid: r.sid });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
