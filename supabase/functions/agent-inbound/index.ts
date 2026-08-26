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
import { callJson } from "../_shared/anthropic.ts";
import { modelFor } from "../_shared/models.ts";
import { meter } from "../_shared/meter.ts";
import { phoneForStorage } from "../_shared/telephony.ts";
import { engageHandleInbound, type EngageInboundParams } from "../engage-run/executor.ts";
import { hmacToken, isTrustedTransport, safeEqual } from "../_shared/internalProof.ts";
import type { AgentConfig } from "../_shared/agentCore.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

// ---------------------------------------------------------------------------
// Who is allowed to speak for whom.
//
// This endpoint is public by design: it is gated only by the agent public_key,
// which ships inside every storefront's JS bundle AND is handed to anonymous
// callers by app_storefront_agent_key. So the key proves a business, never a
// person — every request carrying nothing else must be treated as hostile.
//
// That matters because identity is what threads a conversation. resolveConversation
// re-attaches to an existing SMS/WhatsApp thread by phone number, and links a
// contact by email/phone so the agent is fed "unified memory" — summaries of that
// person's other conversations. A caller who can assert someone else's phone or
// email therefore reads their history back out of the agent's own reply. Only the
// server transports that actually received a message on a channel (twilio-inbound,
// email-inbound) may assert one, and they prove it with a secret a browser cannot
// hold: an HMAC keyed by the service-role key, which the platform injects into
// every edge function and never exposes to a client.
// ---------------------------------------------------------------------------
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A per-thread capability the widget proves it holds before reading a thread.
 *  Derived rather than stored, so it needs no schema change and no lookup: only
 *  this server can compute it, and it is handed back exactly to the visitor whose
 *  message opened the conversation. */
const threadToken = (conversationId: string) => hmacToken(`thread:${conversationId}`);

/** Everything an untrusted caller is allowed to say about who they are. A name
 *  is a display label; it resolves no identity and links no contact. */
const publicCustomer = (customer: Json): Json => ({ name: String(customer?.name ?? "").slice(0, 120) });

/** Channels that reach a person by an identifier they own, and therefore thread
 *  by it. Only a proven transport may speak on one. */
const IDENTITY_CHANNELS = new Set(["sms", "whatsapp", "email"]);

// ---------------------------------------------------------------------------
// Ingest classification: after the agent replies, tag the conversation with the
// customer's intent + sentiment (cheap tier, metered). Best-effort — never
// fails the request; runs via waitUntil when the runtime supports it.
// ---------------------------------------------------------------------------
const INTENTS = ["question", "order", "booking", "complaint", "refund", "pricing", "other"];
const SENTIMENTS = ["positive", "neutral", "negative"];

async function classifyInbound(admin: ReturnType<typeof adminClient>, org: Org, conversationId: string, message: string): Promise<void> {
  try {
    const t0 = Date.now();
    const r = await callJson<{ intent?: string; sentiment?: string }>({
      model: modelFor("cheap"),
      system:
        `Classify a customer message sent to the business "${org.name}". ` +
        `Return JSON { "intent": one of ${INTENTS.join("|")}, "sentiment": one of ${SENTIMENTS.join("|")} }.`,
      user: message.slice(0, 2000),
      maxTokens: 100,
    });
    await meter(admin, {
      organizationId: org.id,
      conversationId,
      model: r.model,
      feature: "ingest_classify",
      tier: "cheap",
      inTok: r.inTok,
      outTok: r.outTok,
      cacheWriteTok: r.cacheWriteTok,
      cacheReadTok: r.cacheReadTok,
      latencyMs: Date.now() - t0,
    });
    const patch: Record<string, string> = {};
    if (INTENTS.includes(String(r.data?.intent))) patch.intent = String(r.data.intent);
    if (SENTIMENTS.includes(String(r.data?.sentiment))) patch.sentiment = String(r.data.sentiment);
    if (Object.keys(patch).length) await admin.from("conversations").update(patch).eq("id", conversationId);
  } catch (e) {
    console.error("classifyInbound failed", e); // non-blocking by contract
  }
}

/** Run the classification without delaying/failing the response when possible. */
async function classifyLater(task: Promise<void>): Promise<void> {
  // deno-lint-ignore no-explicit-any
  const rt = (globalThis as any).EdgeRuntime;
  if (rt?.waitUntil) rt.waitUntil(task);
  else await task; // already error-safe
}

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

// ---------------------------------------------------------------------------
// Engage flows (the console's Engage tab) — see supabase/functions/engage-run.
// Runs BEFORE the AI composes a reply. Fully guarded: any error, a missing
// schema (the Engage tab was never used — engageHandleInbound skips on the
// missing table rather than eagerly ensuring it), or simply no live flow for
// this org returns null and the existing AI path runs exactly as before.
// A non-null result either fully claims the turn (suppressAi) or hands the
// SAME conversation to respondCore (handoff_ai / nothing matched mid-run).
// ---------------------------------------------------------------------------
async function tryEngage(
  admin: ReturnType<typeof adminClient>,
  org: Org,
  config: AgentConfig,
  params: Omit<EngageInboundParams, "businessHours">,
): Promise<Awaited<ReturnType<typeof engageHandleInbound>>> {
  try {
    return await engageHandleInbound(admin, org, { ...params, businessHours: config.business_hours });
  } catch (e) {
    console.error("engage hook skipped", e); // the AI path must never break
    return null;
  }
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
      // The id lands in a storage path and mints an upload URL, so it is checked
      // twice over: shaped like a uuid (a path segment must not be able to climb
      // out of the org's prefix) and actually one of this org's conversations
      // (otherwise the public key alone would mint unlimited upload URLs).
      const convId = String(body.conversationId);
      if (!UUID_RE.test(convId)) return json({ error: "recording_init_failed" }, 400);
      const { data: owns } = await admin
        .from("conversations").select("id").eq("id", convId).eq("organization_id", org.id).maybeSingle();
      if (!owns) return json({ error: "recording_init_failed" }, 404);
      const bucket = "call-recordings";
      try { await admin.storage.createBucket(bucket, { public: true }); } catch (_) { /* already exists */ }
      const path = `${org.id}/${convId}-${Date.now()}.wav`;
      const { data, error } = await admin.storage.from(bucket).createSignedUploadUrl(path);
      if (error || !data) return json({ error: "recording_init_failed" }, 500);
      const base = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/$/, "");
      const publicUrl = admin.storage.from(bucket).getPublicUrl(path).data.publicUrl;
      return json({ bucket, path, token: data.token, base, publicUrl });
    }

    // --- Call recording: attach the uploaded file to this call's log row(s). ---
    if (body?.recording_done && body?.conversationId && body?.recording_url) {
      if (!UUID_RE.test(String(body.conversationId))) return json({ ok: true });
      await admin
        .from("call_logs")
        .update({ recording_url: body.recording_url })
        .eq("organization_id", org.id)
        .eq("conversation_id", body.conversationId);
      return json({ ok: true });
    }

    // --- Widget receive path: poll for agent/human messages on ONE thread. ---
    // The web channel had no delivery leg at all: conversation-send recorded a
    // human reply "for the widget's next poll", but no poll existed — a reply
    // typed in the Inbox never reached the visitor. This is that poll. Gated by
    // the same public key as sending; scoped to a single conversation in the
    // key's own org; returns only what the thread shows anyway (no notes, no
    // meta, no author identity). `afterId` = last message id the widget has.
    if (body?.action === "poll" && body?.conversationId) {
      // The public key proves a business, not a visitor, so it cannot be what
      // authorises reading a thread: with the key alone anyone could walk a
      // tenant's conversations. The widget must present the per-thread token it
      // was handed when its own message opened the conversation, and only web
      // threads are pollable at all — a phone thread is never the widget's.
      const convId = String(body.conversationId);
      const presented = String(body.threadToken ?? "");
      if (!UUID_RE.test(convId) || !safeEqual(presented, await threadToken(convId))) {
        return json({ error: "Unknown conversation." }, 404);
      }
      const { data: conv } = await admin
        .from("conversations")
        .select("*")
        .eq("id", convId)
        .eq("organization_id", org.id)
        .eq("channel_type", "web")
        .maybeSingle();
      if (!conv) return json({ error: "Unknown conversation." }, 404);
      let q = admin
        .from("conversation_messages")
        .select("id, role, body, created_at")
        .eq("conversation_id", body.conversationId)
        .in("role", ["agent", "human"])
        .order("created_at", { ascending: true })
        .limit(50);
      if (body.afterId) {
        const { data: anchor } = await admin
          .from("conversation_messages")
          .select("created_at")
          .eq("id", body.afterId)
          .eq("conversation_id", body.conversationId)
          .maybeSingle();
        if (anchor) q = q.gt("created_at", (anchor as Json).created_at);
      }
      const { data: msgs } = await q.eq("organization_id", org.id);
      return json({ messages: msgs ?? [], human: (conv as Json).ai_paused === true });
    }

    // --- Chatwoot Agent-Bot webhook ---
    if (body?.event) {
      // This leg threads by the sender's phone, so a forged payload could append
      // to a real customer's WhatsApp thread. Chatwoot itself is proven by the
      // integration being configured at all; when it is not, an "event" can only
      // be someone imitating one, and there is nothing to post a reply back to.
      if (!Deno.env.get("CHATWOOT_URL") && !(await isTrustedTransport(req))) return json({ ok: true });
      if (body.event !== "message_created" || body.message_type !== "incoming") return json({ ok: true });
      const message = (body.content ?? "").toString().trim();
      if (!message) return json({ ok: true });
      if (await overLimit(admin, org.id)) return json({ ok: true }); // silently defer (avoid webhook retries)
      const sender = body.sender ?? {};
      const channelType = String(body.conversation?.channel ?? "web").toLowerCase().includes("whatsapp") ? "whatsapp" : "web";
      // Engage flows get first claim on the turn (additive — null = unchanged path).
      const engaged = await tryEngage(admin, org, config, {
        channel: channelType,
        customer: { name: sender.name, email: sender.email, phone: sender.phone_number },
        message,
      });
      if (engaged?.suppressAi) {
        await classifyLater(classifyInbound(admin, org, engaged.conversationId, message));
        if (engaged.reply) await postToChatwoot(body.account?.id, body.conversation?.id, engaged.reply);
        return json({ ok: true });
      }
      const result = await respondCore(admin, org, config, {
        channel: channelType,
        conversationId: engaged?.conversationId, // keep the flow's thread when it fell through to the AI
        customer: { name: sender.name, email: sender.email, phone: sender.phone_number },
        message,
      });
      // A human has taken over: the message is persisted and the assignee
      // notified (respondCore's paused branch) — post nothing back.
      if (result.paused) return json({ ok: true });
      await classifyLater(classifyInbound(admin, org, result.conversationId, message));
      await postToChatwoot(body.account?.id, body.conversation?.id, engaged?.reply ? `${engaged.reply}\n\n${result.reply}` : result.reply);
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
        .insert({ organization_id: org.id, channel_type: body.channel ?? "voice", customer_name: customer.name ?? "", customer_phone: phoneForStorage(customer.phone), customer_email: customer.email ?? "", is_test: body?.test === true })
        .select("id")
        .single();
      return json({ conversationId: (conv as Json)?.id, reply: config.greeting });
    }

    // --- Instant-callback web form ---
    if (body?.callback) {
      const customer = body.customer ?? {};
      const { data: conv } = await admin
        .from("conversations")
        .insert({ organization_id: org.id, channel_type: "web", customer_name: customer.name ?? "", customer_phone: phoneForStorage(customer.phone), customer_email: customer.email ?? "", summary: "Requested an instant callback." })
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
    // Identity is a capability on this endpoint, not a field (see the header
    // comment). An unproven caller speaks only as an anonymous web visitor: it
    // cannot name a channel that threads by phone, and cannot assert an email or
    // phone that would attach this conversation — and the agent's cross-channel
    // memory of it — to someone else's contact record.
    const trusted = await isTrustedTransport(req);
    const customer = trusted ? (body?.customer ?? {}) : publicCustomer(body?.customer);

    // A conversation id from an unproven caller is a claim, not a fact, and it is
    // checked against the one thing an attacker cannot fake: what that row
    // actually is. Threads on a channel that reaches a PERSON by their own
    // identifier — their phone number, their email address — are exactly the ones
    // a stranger must never be able to open, so those are refused outright and the
    // turn starts a clean thread instead. A web or voice thread keeps its own
    // channel, which is what lets the voice bridge continue a call it opened.
    let threadId: string | undefined = body?.conversationId ? String(body.conversationId) : undefined;
    let channel = trusted ? (body?.channel ?? "web") : "web";
    if (threadId && !trusted) {
      const { data: owned } = UUID_RE.test(threadId)
        ? await admin.from("conversations").select("id, channel_type")
            .eq("id", threadId).eq("organization_id", org.id).maybeSingle()
        : { data: null };
      const ownedChannel = String((owned as Json)?.channel_type ?? "");
      if (!owned || IDENTITY_CHANNELS.has(ownedChannel)) threadId = undefined;
      else channel = ownedChannel || "web";
    }

    if (await overLimit(admin, org.id)) {
      // The cap is a spend control, not a reason to lose what a person said —
      // and this reply promises them a follow-up, so the message has to exist
      // for someone to follow up ON. Recorded without a model call, and only
      // onto a thread that already exists: a first message from an unknown
      // sender past the cap would otherwise let anyone mint conversation rows
      // without bound, which is the abuse this throttle is here to stop.
      if (threadId) {
        await admin.from("conversation_messages").insert({
          organization_id: org.id,
          conversation_id: threadId,
          role: "customer",
          channel_type: channel,
          body: message.slice(0, 4000),
          meta: { throttled: true },
        });
        await admin
          .from("conversations")
          .update({ last_message_at: new Date().toISOString(), unread: true })
          .eq("id", threadId)
          .eq("organization_id", org.id);
      }
      // `throttled` lets transport adapters (e.g. email-inbound) tell this
      // courtesy line apart from a real agent reply, so the per-org cap also
      // caps outbound sends rather than only model spend.
      return json({
        throttled: true,
        ...(threadId ? { conversationId: threadId } : {}),
        reply: "Thanks for your message! We're handling a lot of enquiries right now — a team member will follow up shortly.",
      });
    }

    // Engage flows get first claim on the turn (additive — null = unchanged path).
    const engaged = await tryEngage(admin, org, config, {
      channel,
      conversationId: threadId,
      customer,
      message,
      isTest: body?.test === true,
    });
    if (engaged?.suppressAi) {
      await classifyLater(classifyInbound(admin, org, engaged.conversationId, message));
      return json({
        conversationId: engaged.conversationId,
        ...(trusted ? {} : { threadToken: await threadToken(engaged.conversationId) }),
        reply: engaged.reply,
        cards: [],
        media: [],
      });
    }
    const result = await respondCore(admin, org, config, {
      channel,
      conversationId: engaged?.conversationId ?? threadId, // keep the flow's thread on handoff_ai
      customer,
      message,
      // Sandbox: test:true opens the conversation with is_test=true (subsequent
      // messages carry the conversationId, whose row already has the flag).
      isTest: body?.test === true,
    });
    // A human has taken over this thread: the customer's message is persisted
    // and the assignee notified (respondCore's paused branch). `human: true`
    // lets an updated widget switch to polling for the human's replies; the
    // response shape is otherwise unchanged (older widgets fall back to their
    // canned line on an empty reply — honest silence from the AI either way).
    if (result.paused) {
      return json({
        conversationId: result.conversationId,
        ...(trusted ? {} : { threadToken: await threadToken(result.conversationId) }),
        reply: "",
        human: true,
        cards: [],
        media: [],
      });
    }
    await classifyLater(classifyInbound(admin, org, result.conversationId, message));
    return json({
      conversationId: result.conversationId,
      // The visitor's capability for this thread: required to poll it for a
      // human's replies. Handed only to the caller whose message opened it.
      ...(trusted ? {} : { threadToken: await threadToken(result.conversationId) }),
      reply: engaged?.reply ? `${engaged.reply}\n\n${result.reply}` : result.reply,
      cards: result.cards ?? [],
      media: result.media ?? [],
    });
  } catch (err) {
    console.error("agent-inbound error", err);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
