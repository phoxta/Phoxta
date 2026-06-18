// Phoxta — agent-inbound: public entrypoint for the unified agent.
// Resolves the business by its agent public_key (no user JWT). Powers:
//  • the embeddable web chat widget          { public_key, message, customer }
//  • the instant-callback web form           { public_key, callback:true, customer }
//  • Chatwoot Agent-Bot webhook (omnichannel hub) — incoming message_created events
//    (configure the bot's webhook URL as .../agent-inbound?key=PUBLIC_KEY); the
//    reply is posted back via the Chatwoot API (CHATWOOT_URL + CHATWOOT_API_TOKEN).
import { preflight, json } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { respondCore, summarizeConversation, loadConfig, type Org } from "../_shared/agentCore.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

// Public-endpoint abuse/cost throttle: max inbound customer messages per business
// per hour. Beyond this the agent politely defers (the per-plan monthly token cap
// in respondCore is the hard cost ceiling).
const MAX_MSGS_PER_HOUR = 200;
async function overLimit(admin: ReturnType<typeof adminClient>, orgId: string): Promise<boolean> {
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await admin
    .from("conversation_messages")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("role", "customer")
    .gte("created_at", since);
  return (count ?? 0) >= MAX_MSGS_PER_HOUR;
}

async function postToChatwoot(accountId: string | number, conversationId: string | number, content: string) {
  const base = Deno.env.get("CHATWOOT_URL");
  const token = Deno.env.get("CHATWOOT_API_TOKEN");
  if (!base || !token) return;
  try {
    await fetch(`${base}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { api_access_token: token, "Content-Type": "application/json" },
      body: JSON.stringify({ content, message_type: "outgoing" }),
    });
  } catch (_) { /* best effort */ }
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const publicKey = body?.public_key || url.searchParams.get("key") || "";
    if (!publicKey) return json({ error: "Missing key." }, 401);

    const admin = adminClient();
    const { data: cfgRow } = await admin.from("agent_config").select("*, organizations(id, name, vertical)").eq("public_key", publicKey).maybeSingle();
    if (!cfgRow) return json({ error: "Unknown agent." }, 404);
    const org = (cfgRow as Json).organizations as Org;
    const config = await loadConfig(admin, org.id);

    // --- Voice config (the Pipecat bot fetches this at call start to pick TTS). ---
    if (body?.voice_config) return json({ voice: (cfgRow as Json).voice ?? {} });

    // --- Call recording (voice bridge): mint a signed upload URL so the bridge
    //     can push the WAV straight to Storage — the service-role key never
    //     leaves the server, and multi-MB audio never transits this function. ---
    if (body?.recording_init && body?.conversationId) {
      const bucket = "call-recordings";
      try { await admin.storage.createBucket(bucket, { public: true }); } catch (_) { /* already exists */ }
      const path = `${org.id}/${body.conversationId}-${Date.now()}.wav`;
      const { data, error } = await admin.storage.from(bucket).createSignedUploadUrl(path);
      if (error || !data) return json({ error: "recording_init_failed" }, 500);
      const base = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/$/, "");
      const publicUrl = admin.storage.from(bucket).getPublicUrl(path).data.publicUrl;
      return json({ bucket, path, token: data.token, base, publicUrl });
    }

    // --- Call recording: attach the uploaded file to this call's log row(s). ---
    if (body?.recording_done && body?.conversationId && body?.recording_url) {
      await admin
        .from("call_logs")
        .update({ recording_url: body.recording_url })
        .eq("organization_id", org.id)
        .eq("conversation_id", body.conversationId);
      return json({ ok: true });
    }

    // --- Chatwoot Agent-Bot webhook ---
    if (body?.event) {
      if (body.event !== "message_created" || body.message_type !== "incoming") return json({ ok: true });
      const message = (body.content ?? "").toString().trim();
      if (!message) return json({ ok: true });
      if (await overLimit(admin, org.id)) return json({ ok: true }); // silently defer (avoid webhook retries)
      const sender = body.sender ?? {};
      const channelType = String(body.conversation?.channel ?? "web").toLowerCase().includes("whatsapp") ? "whatsapp" : "web";
      const result = await respondCore(admin, org, config, {
        channel: channelType,
        customer: { name: sender.name, email: sender.email, phone: sender.phone_number },
        message,
      });
      await postToChatwoot(body.account?.id, body.conversation?.id, result.reply);
      return json({ ok: true });
    }

    // --- Summarize (voice bridge calls this on call end → cross-call memory) ---
    if (body?.summarize && body?.conversationId) {
      const { data: conv } = await admin.from("conversations").select("id").eq("id", body.conversationId).eq("organization_id", org.id).maybeSingle();
      if (conv) await summarizeConversation(admin, org, body.conversationId);
      return json({ ok: true });
    }

    // --- Greeting (voice bridge: open a conversation + opening line) ---
    if (body?.greeting) {
      const customer = body.customer ?? {};
      const { data: conv } = await admin
        .from("conversations")
        .insert({ organization_id: org.id, channel_type: body.channel ?? "voice", customer_name: customer.name ?? "", customer_phone: customer.phone ?? "", customer_email: customer.email ?? "" })
        .select("id")
        .single();
      return json({ conversationId: (conv as Json)?.id, reply: config.greeting });
    }

    // --- Instant-callback web form ---
    if (body?.callback) {
      const customer = body.customer ?? {};
      const { data: conv } = await admin
        .from("conversations")
        .insert({ organization_id: org.id, channel_type: "web", customer_name: customer.name ?? "", customer_phone: customer.phone ?? "", customer_email: customer.email ?? "", summary: "Requested an instant callback." })
        .select("id")
        .single();
      await admin.from("outbound_tasks").insert({
        organization_id: org.id,
        type: "instant_callback",
        channel: customer.phone ? "call" : "email",
        to_ref: customer.phone || customer.email || "",
        customer_name: customer.name ?? "",
        conversation_id: (conv as Json)?.id,
        due_at: new Date().toISOString(),
        payload: { source: "web_form", note: body.note ?? "" },
      });
      return json({ ok: true, message: "Thanks — we'll call you back shortly." });
    }

    // --- Web chat widget ---
    const message = (body?.message ?? "").toString().trim();
    if (!message) return json({ error: "Type a message." }, 400);
    if (message.length > 4000) return json({ error: "Message too long." }, 400);
    if (await overLimit(admin, org.id)) {
      return json({ reply: "Thanks for your message! We're handling a lot of enquiries right now — a team member will follow up shortly." });
    }
    const result = await respondCore(admin, org, config, {
      channel: body?.channel ?? "web",
      conversationId: body?.conversationId,
      customer: body?.customer ?? {},
      message,
    });
    return json({ conversationId: result.conversationId, reply: result.reply });
  } catch (err) {
    console.error("agent-inbound error", err);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
