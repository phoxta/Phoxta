// Phoxta — agent-inbound: public entrypoint for the unified agent.
// Resolves the business by its agent public_key (no user JWT). Powers:
//  • the embeddable web chat widget          { public_key, message, customer }
//  • the instant-callback web form           { public_key, callback:true, customer }
//  • Chatwoot Agent-Bot webhook (omnichannel hub) — incoming message_created events.
//    Configure the bot's webhook URL as
//      .../agent-inbound?key=PUBLIC_KEY&token=CHATWOOT_WEBHOOK_SECRET
//    The token is MANDATORY: Chatwoot signs nothing, the public key is public,
//    and this leg both threads by a body-supplied phone number and posts its
//    reply to a body-supplied Chatwoot conversation id — so without a shared
//    secret a stranger could push text into any conversation on the account.
//    The reply is posted back via the Chatwoot API (CHATWOOT_URL + CHATWOOT_API_TOKEN).
import { preflight, json } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { respondCore, recordInboundOnly, summarizeConversation, loadConfig, type Org } from "../_shared/agentCore.ts";
import { callJson } from "../_shared/anthropic.ts";
import { modelFor } from "../_shared/models.ts";
import { meter } from "../_shared/meter.ts";
import { callRateLimited, checkDestination, phoneForStorage } from "../_shared/telephony.ts";
import { engageHandleInbound, type EngageInboundParams } from "../engage-run/executor.ts";
import { hmacToken, isTrustedTransport, safeEqual } from "../_shared/internalProof.ts";
import { verifySharedSecret } from "../_shared/webhooks.ts";
import {
  autoReplyMode,
  deliverAutoReply,
  markNotAnswered,
  modeReason,
  notifyNeedsHuman,
  type AutoReplyMode,
  type SendOutcome,
} from "../_shared/autoReply.ts";
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

// ---------------------------------------------------------------------------
// The owner's switch, on every channel that comes through here.
//
// "Answer new customer messages automatically" (agent_tool_policy.auto_reply)
// used to be read by the connected-mailbox path and the catch-up worker and by
// nothing else — so an owner who set it to Off stopped Gmail while the web
// widget, SMS, WhatsApp, Chatwoot and the voice bot carried on replying, and the
// console reported a state the platform was not in. This endpoint is the one
// place all five of those meet, so the switch is enforced here.
//
// This endpoint enforces the switch and the org-wide hourly throttle. The
// ceilings that bound a LOOP — per thread, per burst, per day — belong to
// _shared/autoReply.ts and run wherever an automatic reply is actually put on a
// wire: gmail-sync and email-inbound for mail, twilio-inbound for SMS and
// WhatsApp (which used to answer straight out of this endpoint's JSON and meet
// none of them), and the Chatwoot branch below. Web chat and voice are
// synchronous — the person is on the page or on the phone, there is no address
// to ping-pong with — so they get the switch and the throttle and nothing else.
//
// The sandbox is exempt: test:true is the owner trying their own agent out, and
// a Playground that answers nothing because a production switch is Off teaches
// them nothing. But `test` is a field on an UNTRUSTED request body, and the key
// that reaches this endpoint ships in client JS — so it is a capability, exactly
// like `customer`, `channel` and `inbound`, and only a proven transport may
// assert it. Read straight off the body it was an unauthenticated bypass of the
// owner's own Off switch: anyone could POST {public_key, message, test:true} and
// get a full model-composed answer on that business's bill while the console
// reported the agent as off. The dashboard's own Playground does not use this
// endpoint (it calls ai-agent with a member JWT), so nothing legitimate loses it.
// ---------------------------------------------------------------------------
type ModeGate = { blocked: false } | { blocked: true; mode: AutoReplyMode; reason: string };

async function modeGate(
  admin: ReturnType<typeof adminClient>,
  orgId: string,
  isTest: boolean,
): Promise<ModeGate> {
  if (isTest) return { blocked: false };
  const mode = await autoReplyMode(admin, orgId);
  if (mode === "auto") return { blocked: false };
  return { blocked: true, mode, reason: modeReason(mode) };
}

/** What a caller hears when the switch is off and the channel is a LIVE PHONE
 *  CALL. Everywhere else "say nothing" is honest silence — the widget switches
 *  to polling, Twilio emits an empty <Response/>, no mail goes out. On a call it
 *  is dead air: the caller hears the greeting and then nothing at all, for every
 *  turn, with no hand-off and no message taken. This line is fixed text, costs no
 *  model turn and sends no message; it is the voicemail the switch implies. */
const VOICE_GREETING_HANDOFF =
  "Thanks for calling. I can't answer questions right now, but tell me what you need and I'll pass it straight to the team.";
const VOICE_TURN_HANDOFF = "Got it — I've made a note of that and someone from the team will get back to you.";

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
// Two branches of this endpoint MINT ROWS on nothing but the public key: the
// voice greeting (a conversation per inbound call) and the instant-callback form
// (a conversation plus an outbound task). overLimit counts inbound MESSAGES, so
// neither of them was counted by anything at all: a script holding a key handed
// out by app_storefront_agent_key could fill a tenant's Inbox with rows carrying
// attacker-chosen name/phone/email labels, and — through the callback branch —
// queue the outbound work described below.
//
// Sixty new conversations an hour is far beyond any real small business's call
// volume and low enough that a flood is a nuisance rather than a bill.
// ---------------------------------------------------------------------------
const MAX_NEW_THREADS_PER_HOUR = 60;
async function threadsOverLimit(admin: ReturnType<typeof adminClient>, orgId: string): Promise<boolean> {
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await admin
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .gte("created_at", since);
  return (count ?? 0) >= MAX_NEW_THREADS_PER_HOUR;
}

/** How many instant-callback tasks one business may have queued in an hour. The
 *  form is a lead capture on a storefront; a real one produces a handful a day. */
const MAX_CALLBACKS_PER_HOUR = 10;
async function callbacksOverLimit(admin: ReturnType<typeof adminClient>, orgId: string): Promise<boolean> {
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await admin
    .from("outbound_tasks")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("type", "instant_callback")
    .gte("created_at", since);
  return (count ?? 0) >= MAX_CALLBACKS_PER_HOUR;
}

/** An email address, or "" — never a caller-supplied string taken on trust. */
const cleanEmail = (v: unknown): string => {
  const s = String(v ?? "").trim().toLowerCase();
  return /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[a-z]{2,}$/i.test(s) && s.length <= 254 ? s : "";
};

/** Channels an UNPROVEN caller may open a conversation on. `voice` is the bridge
 *  and `web` is the widget; the identity channels are never a stranger's to open
 *  (see IDENTITY_CHANNELS above). */
const PUBLIC_OPEN_CHANNELS = new Set(["voice", "web"]);

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

/**
 * Push one message back into a Chatwoot conversation — a real WhatsApp or
 * live-chat delivery, not a best-effort side effect.
 *
 * It used to swallow every error and return void, and the transport above it
 * reported {ok:true,status:'sent'} regardless of the HTTP status. So a rotated
 * CHATWOOT_API_TOKEN, or Chatwoot being down for a minute, stamped the agent's
 * row 'sent' and the customer's row answered:true — which agent-catchup now
 * treats as SETTLED FOREVER, so the one worker that would have retried the
 * message ruled it out permanently. The customer got nothing and the console
 * showed a delivered reply. A transport that cannot confirm delivery must say so.
 */
async function postToChatwoot(
  accountId: string | number | undefined,
  conversationId: string | number | undefined,
  content: string,
): Promise<SendOutcome> {
  const fail = (error: string): SendOutcome => ({ ok: false, provider: "chatwoot", id: "", status: "failed", error });
  const base = Deno.env.get("CHATWOOT_URL");
  const token = Deno.env.get("CHATWOOT_API_TOKEN");
  if (!base || !token) return fail("Chatwoot is not configured (CHATWOOT_URL / CHATWOOT_API_TOKEN).");
  if (!accountId || !conversationId) return fail("The Chatwoot webhook did not name an account and conversation to reply into.");
  try {
    const res = await fetch(`${base}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { api_access_token: token, "Content-Type": "application/json" },
      body: JSON.stringify({ content, message_type: "outgoing" }),
    });
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 200);
      return fail(`Chatwoot refused the message (HTTP ${res.status})${detail ? `: ${detail}` : ""}`);
    }
    const data = (await res.json().catch(() => ({}))) as Json;
    // Prefixed: this id lands in provider_sid, which 0114 makes unique per
    // organisation, and a bare Chatwoot integer could collide with an id from
    // another provider on the same business.
    const id = data?.id ? `chatwoot:${String(data.id)}` : "";
    return { ok: true, provider: "chatwoot", id, status: "sent" };
  } catch (e) {
    return fail(String((e as Error)?.message || e));
  }
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

    // Identity is a CAPABILITY on this endpoint, not a field (see the header
    // comment). Resolved once, up here, because `test` is one of those
    // capabilities and it is read on the greeting leg as well as the message leg
    // — it opens a sandbox conversation and it exempts the turn from the owner's
    // switch, and neither may be claimed by a browser holding the public key.
    const trusted = await isTrustedTransport(req);
    const isTest = trusted && body?.test === true;

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
        .from("conversations").select("id, channel_type, created_at").eq("id", convId).eq("organization_id", org.id).maybeSingle();
      if (!owns) return json({ error: "recording_init_failed" }, 404);
      // A recording belongs to a LIVE CALL. Ownership alone bounded nothing: the
      // public key is anonymous-readable, so one conversation id could be
      // replayed for ever to mint unlimited signed upload URLs into a public
      // bucket. A call thread that was opened hours ago is not being recorded now.
      const openedAt = Date.parse(String((owns as Json).created_at ?? ""));
      const live = String((owns as Json).channel_type ?? "") === "voice" &&
        Number.isFinite(openedAt) && Date.now() - openedAt < 6 * 3600_000;
      if (!live && !trusted) return json({ error: "recording_init_failed" }, 404);
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
      // The URL is rendered as a link in the console, so it is a caller-supplied
      // string that ends up in a tenant's UI: only an https URL, and only one
      // short enough to be a real storage path.
      const recordingUrl = String(body.recording_url);
      if (!/^https:\/\/[^\s"'<>]{5,900}$/i.test(recordingUrl)) return json({ ok: true });
      await admin
        .from("call_logs")
        .update({ recording_url: recordingUrl })
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
      // AUTHENTICATE CHATWOOT, DO NOT ASSUME IT.
      //
      // "The integration being configured at all" was never proof that THIS
      // request came from Chatwoot. Every field this branch acts on is body-
      // supplied: it threads by body.sender.phone_number, so a forged payload
      // appends to a real customer's WhatsApp thread, and — worse — the reply is
      // posted to body.account.id / body.conversation.id, which means anyone
      // holding the public key (app_storefront_agent_key hands it to anon) could
      // make the platform push AI-composed text into ANY conversation on the
      // Chatwoot account. That is a stranger causing a send.
      //
      // Chatwoot Agent-Bot webhooks carry no signature, so the shared secret on
      // the URL is the proof — the same mechanism email-inbound uses for the
      // providers that do not sign. FAIL CLOSED: with CHATWOOT_WEBHOOK_SECRET
      // unset there is no way to tell Chatwoot from a stranger, so the branch is
      // refused rather than trusted. An operator wiring Chatwoot sets the secret
      // and appends &token=… to the bot's webhook URL.
      if (!trusted && !verifySharedSecret(req, "CHATWOOT_WEBHOOK_SECRET")) {
        console.warn("[phoxta] agent-inbound: a Chatwoot event arrived without the shared secret — refused");
        return json({ ok: true });
      }
      if (body.event !== "message_created" || body.message_type !== "incoming") return json({ ok: true });
      const message = (body.content ?? "").toString().trim();
      if (!message) return json({ ok: true });
      if (await overLimit(admin, org.id)) return json({ ok: true }); // silently defer (avoid webhook retries)
      const sender = body.sender ?? {};
      const channelType = String(body.conversation?.channel ?? "web").toLowerCase().includes("whatsapp") ? "whatsapp" : "web";
      // The owner's switch reaches Chatwoot too: file the message, notify, and
      // post nothing back.
      const cwGate = await modeGate(admin, org.id, false);
      if (cwGate.blocked) {
        const { conversationId } = await recordInboundOnly(admin, org, {
          channel: channelType,
          customer: { name: sender.name, email: sender.email, phone: sender.phone_number },
          message,
          reason: cwGate.reason,
          retryable: true,
        });
        if (cwGate.mode === "approve") await notifyNeedsHuman(admin, org.id, conversationId, message);
        return json({ ok: true });
      }
      // Engage flows get first claim on the turn (additive — null = unchanged path).
      const engaged = await tryEngage(admin, org, config, {
        channel: channelType,
        customer: { name: sender.name, email: sender.email, phone: sender.phone_number },
        message,
      });
      if (engaged?.suppressAi) {
        await classifyLater(classifyInbound(admin, org, engaged.conversationId, message));
        // THROUGH THE FUNNEL, exactly like the respondCore branch below.
        //
        // This was the one Chatwoot leg still pushing a message to a live
        // WhatsApp customer outside deliverAutoReply: no per-thread ceiling, no
        // burst window, no daily cap, no re-check of "a human has taken over"
        // at delivery time, and no audit line. A counterparty bot on the far end
        // of a Chatwoot WhatsApp inbox fires the flow, the flow answers, and
        // nothing counted the replies — the same unbounded ping-pong every other
        // channel was closed for. An Engage flow decides WHAT to say; it does not
        // decide whether it may say it.
        if (engaged.reply.trim()) {
          await deliverAutoReply(admin, org.id, {
            channel: channelType,
            trigger: "engage",
            conversationId: engaged.conversationId,
            to: String(sender.phone_number ?? sender.email ?? sender.name ?? "chatwoot"),
            text: engaged.reply,
            agentMessageId: engaged.agentMessageId,
            customerMessageId: engaged.customerMessageId,
            // An Engage journey is something the owner built and switched on
            // itself, so it is not gated on "answer new messages automatically"
            // — but every ceiling, the spacing, the daily budget and the audit
            // line apply. (The switch has already been read above anyway.)
            mode: "auto",
            stampExtra: { source: "chatwoot", engage: true },
            transport: () => postToChatwoot(body.account?.id, body.conversation?.id, engaged.reply),
          });
        }
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
      const outbound = engaged?.reply ? `${engaged.reply}\n\n${result.reply}` : result.reply;
      // THROUGH THE FUNNEL. Chatwoot is a real outbound transport — it pushes a
      // message to a person on WhatsApp or a live-chat widget — and it used to
      // answer straight out of respondCore with only the switch in front of it:
      // no per-thread ceiling, no burst window, no daily cap, no audit line. A
      // counterparty bot on the far end of a Chatwoot WhatsApp inbox is the same
      // ping-pong as any other. The post itself stays the caller's, because only
      // this branch knows the Chatwoot account and conversation ids.
      if (outbound.trim() && !result.capped) {
        await deliverAutoReply(admin, org.id, {
          channel: channelType,
          trigger: "chatwoot",
          conversationId: result.conversationId,
          to: String(sender.phone_number ?? sender.email ?? sender.name ?? "chatwoot"),
          text: outbound,
          agentMessageId: result.agentMessageId,
          customerMessageId: result.customerMessageId,
          template: result.template,
          stampExtra: { source: "chatwoot" },
          // The post's REAL outcome, not an assumption. A failed push now reads
          // as failed on the agent's row and leaves the customer's message
          // retryable, instead of being stamped answered:true — which
          // agent-catchup treats as settled forever.
          transport: () => postToChatwoot(body.account?.id, body.conversation?.id, outbound),
        });
      }
      return json({ ok: true });
    }

    // --- Summarize (voice bridge calls this on call end → cross-call memory) ---
    if (body?.summarize && body?.conversationId) {
      if (!UUID_RE.test(String(body.conversationId))) return json({ ok: true });
      const { data: conv } = await admin.from("conversations").select("id").eq("id", body.conversationId).eq("organization_id", org.id).maybeSingle();
      // Ownership alone bounded nothing: this spends a model turn on the tenant's
      // bill, and the public key that reaches it is anonymous-readable, so one
      // conversation id could be replayed to run the summariser without limit.
      // A call is summarised ONCE when it ends; three an hour is generous.
      if (conv) {
        const { count } = await admin
          .from("ai_usage")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", org.id)
          .eq("conversation_id", body.conversationId)
          .eq("feature", "agent_summary")
          .gte("created_at", new Date(Date.now() - 3600_000).toISOString());
        if ((count ?? 0) < 3) await summarizeConversation(admin, org, body.conversationId);
      }
      return json({ ok: true });
    }

    // --- Greeting (voice bridge: open a conversation + opening line) ---
    if (body?.greeting) {
      // Left untrusted-writable on purpose: this opens a NEW row and resolves no
      // contact, so the number is a label on a conversation nobody else can
      // reach — and the voice bridge runs off the platform with the public key
      // alone, so gating it would lose the caller's number on every real call.
      //
      // But "untrusted-writable" is not "unbounded". The insert ran on nothing
      // but the public key, which app_storefront_agent_key hands to anonymous
      // callers, so a loop of {public_key, greeting:true} minted rows in a
      // tenant's conversations table without limit, each carrying an
      // attacker-chosen label. It is now counted, the channel is restricted to
      // the two an unproven caller may legitimately open, and every field the
      // caller supplies is bounded and validated rather than stored verbatim.
      const customer = body.customer ?? {};
      if (!isTest && (await threadsOverLimit(admin, org.id))) {
        console.warn(`[phoxta] agent-inbound: ${org.id} is over its new-conversation limit — greeting refused`);
        return json({ error: "Too many new conversations for this business right now." }, 429);
      }
      const openChannel = trusted
        ? String(body.channel ?? "voice")
        : (PUBLIC_OPEN_CHANNELS.has(String(body.channel ?? "voice")) ? String(body.channel) : "voice");
      const { data: conv } = await admin
        .from("conversations")
        .insert({
          organization_id: org.id,
          channel_type: openChannel,
          customer_name: String(customer.name ?? "").slice(0, 120),
          customer_phone: phoneForStorage(customer.phone),
          customer_email: cleanEmail(customer.email),
          is_test: isTest,
        })
        .select("id")
        .single();
      // The switch reaches the phone line too, and it has to reach it HERE. The
      // gate below is on the message path only, so an owner who set the Inbox to
      // "Ask me" after one bad email got a live call that opened with the
      // business's normal greeting and then went completely silent for the rest
      // of the call — no hand-off, no message taken, just dead air. The greeting
      // now sets the caller's expectation instead.
      const gGate = await modeGate(admin, org.id, isTest);
      return json({
        conversationId: (conv as Json)?.id,
        reply: gGate.blocked ? VOICE_GREETING_HANDOFF : config.greeting,
        ...(gGate.blocked ? { autoReply: gGate.mode } : {}),
      });
    }

    // ------------------------------------------------------------------------
    // --- Instant-callback web form ---
    //
    // THE MOST DANGEROUS BRANCH IN THIS FILE, AND IT WAS THE LEAST GUARDED.
    //
    // It queues an outbound_tasks row, and agent-worker drains that queue on the
    // same five-minute cron as everything else: `channel: 'call'` becomes a real
    // AI phone call placed through the shared platform Twilio number and billed
    // to the tenant; `channel: 'email'` becomes AI-composed mail from the
    // platform's verified sending domain. `to_ref` was taken STRAIGHT off the
    // request body, and the owner's switch and the hourly throttle both sat
    // further down this file, so on this path neither ever ran. Because
    // app_storefront_agent_key is granted to anon, anyone holding an org UUID
    // could read the public key and POST {public_key, callback:true,
    // customer:{phone:"+8821234567890"}} in a loop: up to 240 AI calls an hour
    // to attacker-chosen premium-rate or victim numbers, under a real business's
    // name, on that business's bill.
    //
    // Everything a stranger can cause to be queued now meets, in order:
    //   • the destination policy every other dialling path uses —
    //     checkDestination: E.164 form, the CALLING_ALLOWED_PREFIXES allowlist
    //     and the premium-rate / satellite ranges (place-call and voice-outgoing
    //     have always run it; this path never did),
    //   • the org's new-conversation ceiling and its outbound call rate limit,
    //   • a ceiling on callbacks queued per hour, and one queued task per
    //     destination per day, so the same number cannot be dialled repeatedly,
    //   • the owner's switch and the org-wide hourly throttle.
    // agent-worker re-runs the destination check and the rate limit immediately
    // before it dials, because a row in a queue is not permission to call.
    //
    // A refused CALLBACK is still a LEAD: the conversation is opened and a human
    // is told, because losing a real customer's request would be its own defect.
    // ------------------------------------------------------------------------
    if (body?.callback) {
      const customer = body.customer ?? {};
      const name = String(customer.name ?? "").slice(0, 120);
      const note = String(body.note ?? "").slice(0, 1000);

      // WHERE would this go? Resolved, validated and normalised before a single
      // row is written — the queue stores the checked value, never the caller's.
      const rawPhone = String(customer.phone ?? "").trim();
      const email = cleanEmail(customer.email);
      let toRef = "";
      let outChannel: "call" | "email" = "email";
      if (rawPhone) {
        const dest = checkDestination(rawPhone);
        if (!dest.ok) {
          // An honest 400: the visitor typed a number we will not dial, and
          // silently filing it as "we'll call you back" would be a lie.
          if (!email) return json({ error: dest.error }, 400);
        } else {
          toRef = dest.to;
          outChannel = "call";
        }
      }
      if (!toRef && email) toRef = email;
      if (!toRef) {
        return json({ error: "Add a phone number or an email address so we can get back to you." }, 400);
      }

      if (await threadsOverLimit(admin, org.id)) {
        console.warn(`[phoxta] agent-inbound: ${org.id} is over its new-conversation limit — callback refused`);
        return json({ error: "Too many requests for this business right now. Please try again shortly." }, 429);
      }

      const { data: conv } = await admin
        .from("conversations")
        .insert({
          organization_id: org.id,
          channel_type: "web",
          customer_name: name,
          customer_phone: outChannel === "call" ? toRef : phoneForStorage(customer.phone),
          customer_email: email,
          summary: "Requested an instant callback.",
        })
        .select("id")
        .single();
      const conversationId = String((conv as Json)?.id ?? "");

      // The switch, the org throttle, and the two outbound ceilings. Any of them
      // means "do not queue an automatic call or email" — a person gets told
      // instead, and the lead is already on the thread above.
      const cbGate = await modeGate(admin, org.id, false);
      const blockedBy = cbGate.blocked
        ? cbGate.reason
        : (await overLimit(admin, org.id))
          ? "this business is over its hourly message limit"
          : (await callbacksOverLimit(admin, org.id))
            ? "this business is over its hourly callback limit"
            : (outChannel === "call" && (await callRateLimited(admin, org.id)))
              ? "this business is over its hourly outbound-call limit"
              : "";
      if (blockedBy) {
        console.warn(`[phoxta] agent-inbound: callback for ${org.id} not queued — ${blockedBy}`);
        if (conversationId) {
          await notifyNeedsHuman(admin, org.id, conversationId, `${name || toRef} asked for a callback${note ? `: ${note}` : ""}`);
        }
        return json({ ok: true, message: "Thanks — we've passed this to the team and they'll be in touch." });
      }

      // One queued callback per destination per day. Without it the destination
      // policy above only bounds WHERE a stranger can send us, not how often.
      const dayAgo = new Date(Date.now() - 24 * 3600_000).toISOString();
      const { data: already } = await admin
        .from("outbound_tasks")
        .select("id")
        .eq("organization_id", org.id)
        .eq("type", "instant_callback")
        .eq("to_ref", toRef)
        .gte("created_at", dayAgo)
        .limit(1)
        .maybeSingle();
      if (already) {
        return json({ ok: true, message: "Thanks — we already have your request and we'll be in touch shortly." });
      }

      await admin.from("outbound_tasks").insert({
        organization_id: org.id,
        type: "instant_callback",
        channel: outChannel,
        to_ref: toRef,
        customer_name: name,
        conversation_id: conversationId || null,
        due_at: new Date().toISOString(),
        payload: { source: "web_form", note },
      });
      return json({ ok: true, message: "Thanks — we'll call you back shortly." });
    }

    // --- Web chat widget ---
    const raw = (body?.message ?? "").toString().trim();
    if (!raw) return json({ error: "Type a message." }, 400);
    // A real email carries its quoted thread underneath and routinely runs past
    // 4000 characters. Refusing it outright meant email-inbound posted the mail,
    // read `reply: undefined` off a 400 it never inspected, and returned "ok" —
    // so the customer got no answer, no record and no log line. A proven
    // transport has already trimmed what it can, so the remainder is truncated
    // (guardInput caps at the same length regardless). The public leg keeps its
    // refusal, because there it is an abuse control rather than a mail quirk.
    if (raw.length > 4000 && !trusted) return json({ error: "Message too long." }, 400);
    const message = raw.slice(0, 4000);
    const customer = trusted ? (body?.customer ?? {}) : publicCustomer(body?.customer);

    // ------------------------------------------------------------------------
    // THE CALLER ALREADY FILED THIS MESSAGE.
    //
    // twilio-inbound now answers Twilio inside its ~15-second webhook deadline
    // and composes afterwards, so it files the customer's message FIRST (which
    // is what keeps the message recoverable if the background turn dies) and
    // then calls this endpoint to compose. Two things follow, and both are
    // gated on the internal-transport proof — a browser holding the public key
    // must never be able to say "somebody else already recorded this":
    //
    //   • the reply is composed against THAT row rather than a second copy, and
    //   • every branch below that would otherwise file the message writes its
    //     outcome onto that row instead.
    //
    // An id is required, not just the flag: `recorded: true` with no row to
    // point at would suppress respondCore's own insert and lose the customer's
    // message outright.
    // ------------------------------------------------------------------------
    const recordedRowId = trusted && body?.inbound?.recorded === true ? String(body?.inbound?.recordedId ?? "") : "";
    const callerRecorded = !!recordedRowId;
    const recordedMeta = (trusted ? (body?.inbound?.meta ?? {}) : {}) as Json;

    // --- Was this message already handled? ---
    // Provider webhooks are at-least-once: Postmark, Resend and SendGrid all
    // re-deliver, and this endpoint always answers 200 so they will. Without an
    // idempotency key a redelivery re-runs the model and sends the customer a
    // SECOND reply. The provider's own id for the message is that key, and it is
    // the same column gmail-sync deduplicates on.
    //
    // Skipped for a caller that has already filed the message: the row it is
    // pointing at carries this very provider id, so the check would match the
    // message against ITSELF and refuse to answer anything. That caller ran this
    // same dedupe on the way in — filing IS the deduplicated step, and the
    // unique index on (organization_id, provider_sid) is what makes it a
    // guarantee rather than a race.
    if (trusted && body?.inbound?.providerSid && !callerRecorded) {
      const { data: seen } = await admin
        .from("conversation_messages")
        .select("conversation_id")
        .eq("organization_id", org.id)
        .eq("provider_sid", String(body.inbound.providerSid))
        .maybeSingle();
      if (seen) {
        return json({ ok: true, duplicate: true, reply: "", conversationId: (seen as Json).conversation_id, organizationId: org.id });
      }
    }

    // --- File it, answer nothing. ---
    // A proven transport that has identified this message as machine-generated
    // (a bounce, an out-of-office, a mailing list) still owes the business the
    // message. Recording it costs nothing and keeps the Inbox honest; composing
    // a reply to it is how mail loops start. Trusted callers only — a browser
    // cannot write to a thread without an answer coming back.
    if (trusted && body?.record_only === true) {
      const { conversationId, messageId } = await recordInboundOnly(admin, org, {
        channel: String(body?.channel ?? "email"),
        conversationId: body?.conversationId ? String(body.conversationId) : undefined,
        customer,
        message,
        isTest,
        providerSid: body?.inbound?.providerSid ? String(body.inbound.providerSid) : "",
        meta: body?.inbound?.meta ?? {},
        reason: String(body?.reason ?? "the transport declined to answer this message"),
        // The transport says whether this is settled forever (a bounce, a
        // mailing list) or a moment in time (the daily cap, "ask me first").
        // Defaulting everything to settled is how a heuristic buried a real
        // customer where the catch-up worker could never reach them again.
        retryable: body?.retryable === true,
        // "File it, and hold it for me" — the transport is about to compose in
        // the background and does not want a catch-up tick answering it too.
        claim: body?.claim === true,
      });
      // The row id goes back so the transport can finish the story on the same
      // row: the delivery it made, or the reason it never managed one.
      return json({ ok: true, recorded: true, conversationId, messageId, organizationId: org.id, reply: "" });
    }

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

    // --- The owner's switch. Off = never answer; Ask me = do not answer, tell a
    //     human instead. Either way the message is FILED (losing it would be
    //     worse than answering it) and the caller gets an empty reply with
    //     `human: true`, which every transport already reads as "say nothing":
    //     twilio-inbound emits a <Response/> with no <Message>, email-inbound
    //     sends no mail, and the widget switches to polling for a person. ---
    const gate = await modeGate(admin, org.id, isTest);
    if (gate.blocked) {
      // Already on the thread: write the decision onto the caller's row rather
      // than filing the customer's words a second time. (The switch can flip
      // between a transport's own pre-flight and this call — that is exactly
      // why it is re-read here.)
      const conversationId = callerRecorded
        ? (threadId ?? "")
        : (await recordInboundOnly(admin, org, {
          channel,
          conversationId: threadId,
          customer,
          message,
          isTest,
          providerSid: trusted && body?.inbound?.providerSid ? String(body.inbound.providerSid) : "",
          meta: trusted ? (body?.inbound?.meta ?? {}) : {},
          reason: gate.reason,
          retryable: true,
        })).conversationId;
      if (callerRecorded) {
        await markNotAnswered(admin, org.id, recordedRowId, recordedMeta, gate.reason, true);
      }
      if (gate.mode === "approve" && conversationId) await notifyNeedsHuman(admin, org.id, conversationId, message);
      return json({
        conversationId,
        ...(trusted ? {} : { threadToken: await threadToken(conversationId) }),
        // Silence is the promise everywhere the customer is not on the line. On
        // a live CALL it is dead air, so voice gets a fixed take-a-message line
        // — no model turn, no outbound message, and the caller learns what is
        // happening instead of listening to nothing.
        reply: channel === "voice" ? VOICE_TURN_HANDOFF : "",
        human: true,
        autoReply: gate.mode,
        cards: [],
        media: [],
        ...(trusted ? { organizationId: org.id, agentMessageId: null } : {}),
      });
    }

    if (await overLimit(admin, org.id)) {
      // The cap is a spend control, not a reason to lose what a person said —
      // and this reply promises them a follow-up, so the message has to exist
      // for someone to follow up ON.
      //
      // It used to be recorded ONLY onto a pre-existing thread, and the one
      // transport that never supplies a conversationId is twilio-inbound: past
      // the cap, every real customer's text was answered with "a team member
      // will follow up shortly" and then DISCARDED — no message row, no reason,
      // nothing to follow up on. A proven transport has already authenticated
      // the sender (a Twilio signature, a provider webhook secret), so it can
      // open the thread; an anonymous browser still cannot, which is the abuse
      // this throttle exists to stop.
      const throttleReason = "this business is over its hourly message limit";
      let recorded = threadId;
      if (callerRecorded) {
        // Already filed by the transport: record the reason on that row. An
        // insert here would put the customer's words on the thread twice, and
        // the second copy would collide with the unique provider_sid index.
        await markNotAnswered(admin, org.id, recordedRowId, recordedMeta, throttleReason, true);
      } else if (threadId) {
        await admin.from("conversation_messages").insert({
          organization_id: org.id,
          conversation_id: threadId,
          role: "customer",
          channel_type: channel,
          body: message.slice(0, 4000),
          meta: {
            ...(trusted ? ((body?.inbound?.meta ?? {}) as Json) : {}),
            throttled: true,
            auto_reply: {
              answered: false,
              reason: throttleReason,
              retryable: true,
              at: new Date().toISOString(),
            },
          },
          provider_sid: trusted ? String(body?.inbound?.providerSid ?? "") : "",
        });
        await admin
          .from("conversations")
          .update({ last_message_at: new Date().toISOString(), unread: true })
          .eq("id", threadId)
          .eq("organization_id", org.id);
      } else if (trusted) {
        const rec = await recordInboundOnly(admin, org, {
          channel,
          customer,
          message,
          isTest,
          providerSid: body?.inbound?.providerSid ? String(body.inbound.providerSid) : "",
          meta: { ...((body?.inbound?.meta ?? {}) as Json), throttled: true },
          reason: throttleReason,
          retryable: true,
        });
        recorded = rec.conversationId;
      }
      // `throttled` lets transport adapters (email-inbound, twilio-inbound) tell
      // this courtesy line apart from a real agent reply, so the per-org cap also
      // caps outbound sends rather than only model spend.
      return json({
        throttled: true,
        ...(recorded ? { conversationId: recorded } : {}),
        reply: "Thanks for your message! We're handling a lot of enquiries right now — a team member will follow up shortly.",
      });
    }

    // Engage flows get first claim on the turn (additive — null = unchanged path).
    const engaged = await tryEngage(admin, org, config, {
      channel,
      conversationId: threadId,
      customer,
      message,
      isTest,
      // Already on the thread: the flow must not file the customer's words a
      // second time.
      ...(callerRecorded ? { recordedMessageId: recordedRowId } : {}),
    });
    if (engaged?.suppressAi) {
      await classifyLater(classifyInbound(admin, org, engaged.conversationId, message));
      return json({
        conversationId: engaged.conversationId,
        ...(trusted ? {} : { threadToken: await threadToken(engaged.conversationId) }),
        reply: engaged.reply,
        cards: [],
        media: [],
        // The flow's own rows, so a proven transport can put its reply through
        // deliverAutoReply and stamp what actually happened on the wire — the
        // same thing the Chatwoot branch above does with them. Without this a
        // flow-authored text left an agent bubble with no delivery tick.
        ...(trusted
          ? {
            organizationId: org.id,
            agentMessageId: engaged.agentMessageId,
            customerMessageId: engaged.customerMessageId,
          }
          : {}),
      });
    }
    const result = await respondCore(admin, org, config, {
      channel,
      conversationId: engaged?.conversationId ?? threadId, // keep the flow's thread on handoff_ai
      customer,
      message,
      // Sandbox: test:true opens the conversation with is_test=true (subsequent
      // messages carry the conversationId, whose row already has the flag). Only
      // a proven transport may assert it — see modeGate's comment.
      isTest,
      // What the transport knows about the message itself — its provider id and
      // its threading headers — so a later reply can thread and a redelivery can
      // be deduplicated. Rebuilt field by field rather than passed through: an
      // untrusted `recorded: true` would suppress the insert and lose the
      // customer's message entirely, so the flag survives only when the
      // internal-transport proof held AND a real row id came with it.
      ...(trusted && body?.inbound
        ? {
          inbound: {
            providerSid: String(body.inbound.providerSid ?? ""),
            meta: body.inbound.meta ?? {},
            ...(callerRecorded ? { recorded: true, recordedId: recordedRowId } : {}),
          },
        }
        : {}),
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
      // The plan's monthly allowance is spent and `reply` is a courtesy line
      // rather than an answer. Flagged like `throttled` so a transport does not
      // mail it out — otherwise a spend ceiling becomes an outbound campaign.
      ...(result.capped ? { capped: true } : {}),
      // Which of the owner's saved replies this was adapted from — surfaced so a
      // caller can record it alongside the send.
      ...(result.template ? { template: result.template } : {}),
      // The row holding this reply, so a proven transport can stamp it with what
      // actually happened on the wire — and the business it belongs to, so the
      // send can be written to that business's audit trail. Never handed to a
      // browser: the public key already names the business to its own widget,
      // but a message row id is not the widget's to know.
      // …and the customer's own row, so a transport that ends up NOT sending can
      // record the reason where a human reading the thread will see it.
      ...(trusted
        ? { organizationId: org.id, agentMessageId: result.agentMessageId, customerMessageId: result.customerMessageId }
        : {}),
      cards: result.cards ?? [],
      media: result.media ?? [],
    });
  } catch (err) {
    console.error("agent-inbound error", err);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
