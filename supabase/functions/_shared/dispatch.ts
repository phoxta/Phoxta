// Phoxta — transport adapters for the agent's outbound channels.
// Research-chosen providers, each guarded by env secrets; when a provider isn't
// configured the send degrades to "simulated" so the agent is fully exercisable
// without external accounts.
//   email : Resend (RESEND_API_KEY + RESEND_FROM) → Postmark (POSTMARK_TOKEN + POSTMARK_FROM)
//   sms   : Twilio (TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM)
//   call  : Vapi (VAPI_API_KEY + VAPI_PHONE_NUMBER_ID) or Retell (RETELL_API_KEY + RETELL_FROM)
//           — managed voice AI; self-host alternative is LiveKit Agents / Pipecat.
import { toE164 } from "./telephony.ts";
import { renderSimple } from "./email.ts";

export type DispatchResult = { status: "sent" | "dialing" | "simulated" | "failed"; provider: string };

const env = (k: string) => Deno.env.get(k);

/** Every Twilio destination passes through here. Callers hand us whatever is on
 *  file — including the national-format numbers phoneForStorage keeps verbatim
 *  — and Twilio rejects those with 21211, so normalise at the boundary rather
 *  than trusting each of the five call sites to have done it. */
const dialable = (to: string) => toE164(to, env("DEFAULT_COUNTRY_CODE"));

/**
 * Where a reply should go.
 *
 * Mail is sent from RESEND_FROM, which is on the subdomain Resend is verified
 * against -- and that subdomain has no MX, no A and no CNAME. So a reply to the
 * From address has nowhere to go and hard-bounces: the receiving side looks for
 * an MX, finds none, falls back to the implicit MX (the A record), and finds
 * none of those either.
 *
 * Every outbound email therefore carries a Reply-To that reaches a real
 * mailbox. Defaulted here rather than left to each call site, because nine of
 * the ten places that send mail had no Reply-To at all and there is no reason
 * to expect the eleventh to remember.
 *
 * An explicit replyTo always wins -- the lead notification deliberately points
 * replies at the person who filled the form.
 */
// The fallback has to be a mailbox that EXISTS. hello@phoxta.com is published
// across the site but was not created in Workspace until now: replies bounced
// with "address not found", and mail claiming to come from an address the
// receiving domain knows is fake is close to a textbook spam signature — which
// is why nothing was arriving. It is a real alias on femi@ now.
const replyAddress = () => env("RESEND_REPLY_TO") || "hello@phoxta.com";

async function dispatchEmail(to: string, subject: string, message: string, replyTo?: string): Promise<DispatchResult> {
  // An explicit replyTo always wins over the platform default. It is how a
  // TENANT's reply to their own customer keeps that customer's next message
  // coming back to the business rather than into Phoxta's mailbox — see
  // conversationEmail.ts, which is the only thing allowed to answer inside a
  // conversation and which resolves that address itself.
  const reply = replyTo?.trim() || replyAddress();
  if (env("RESEND_API_KEY") && env("RESEND_FROM")) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}`, "Content-Type": "application/json" },
        // Was a bare <p>. Every notification the platform sends goes through
        // here, so this one line is most of what people actually receive.
        body: JSON.stringify({
          from: env("RESEND_FROM"), to, subject, reply_to: reply,
          ...(() => { const m = renderSimple(subject, message); return { html: m.html, text: m.text }; })(),
        }),
      });
      return { status: res.ok ? "sent" : "failed", provider: "resend" };
    } catch {
      return { status: "failed", provider: "resend" };
    }
  }
  if (env("POSTMARK_TOKEN") && env("POSTMARK_FROM")) {
    try {
      const res = await fetch("https://api.postmarkapp.com/email", {
        method: "POST",
        headers: { "X-Postmark-Server-Token": env("POSTMARK_TOKEN")!, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ From: env("POSTMARK_FROM"), To: to, Subject: subject, HtmlBody: `<p>${message}</p>`, ReplyTo: reply }),
      });
      return { status: res.ok ? "sent" : "failed", provider: "postmark" };
    } catch {
      return { status: "failed", provider: "postmark" };
    }
  }
  return { status: "simulated", provider: "none" };
}

// Detailed Twilio send (SMS or WhatsApp) — returns the message SID and any
// Twilio error code so callers can react (e.g. 63016 = outside the WhatsApp
// 24-hour window → a template is required). WhatsApp uses the `whatsapp:` prefix
// on both From and To.
//
// `opts.from` IS THE TENANT'S OWN NUMBER, and it exists because the env fallback
// below is one number for the whole platform (telephony.ts:3 — "Every tenant
// dials through ONE shared Twilio account"). Answering a business's customer
// from it tells them a different company wrote, and their reply lands on the
// PHOXTA line, where Phoxta's own agent picks it up and answers another
// company's customer in thread. Every automatic reply therefore passes the
// number the customer actually texted (twilio-inbound records it on the
// message), and _shared/autoReply.ts refuses to send at all rather than fall
// back to the shared sender. The env default is left for the transports that
// legitimately speak AS the platform — outbound campaigns and journey sends the
// owner configured themselves.
export type TwilioSendResult = { ok: boolean; status: DispatchResult["status"]; sid?: string; errorCode?: number; errorMessage?: string };

/**
 * The PLATFORM's own WhatsApp sender — for the transports that legitimately
 * speak as Phoxta (campaigns, journeys the owner configured). Never for an
 * automatic reply, which always passes the tenant's own number explicitly.
 *
 * TWILIO_WHATSAPP_FROM is not set on this project, so this has been falling
 * through to TWILIO_FROM and working by coincidence: today the SMS number and
 * the WhatsApp sender happen to be the same line. The moment a second number is
 * added — or the WhatsApp sender is moved — that coincidence ends and every
 * WhatsApp send fails with Twilio 63007 ("no channel with the specified From"),
 * which reads like a WhatsApp outage rather than a missing secret. So the
 * fallback stays (removing it would break a working path today) and says so
 * once, loudly, where whoever is reading the logs can act on it.
 */
let warnedWhatsappFrom = false;
function platformWhatsappFrom(): string {
  const explicit = String(env("TWILIO_WHATSAPP_FROM") ?? "").trim();
  if (explicit) return explicit;
  const sms = String(env("TWILIO_FROM") ?? "").trim();
  if (sms && !warnedWhatsappFrom) {
    warnedWhatsappFrom = true;
    console.warn(
      "[phoxta] TWILIO_WHATSAPP_FROM is not set — sending WhatsApp from TWILIO_FROM. " +
        "That only works while the SMS number and the WhatsApp sender are the same line; set TWILIO_WHATSAPP_FROM explicitly.",
    );
  }
  return sms;
}

/**
 * Where Twilio must report what actually happened to a message.
 *
 * The REST API answers 201 `queued` and that is ALL it tells you synchronously.
 * Every failure that matters to a real customer — the carrier filtering it as
 * spam (30007), a handset that cannot be reached (30003), a landline (30006),
 * WhatsApp's window having shut (63016) — is reported LATER, on the message
 * resource, and only to a StatusCallback. Without one the platform stamps the
 * row `sent`, marks the customer's message answered, and agent-catchup treats
 * that as settled forever: the console shows a delivered reply the customer
 * never received and nothing ever retries.
 *
 * The ids travel on the URL so the callback needs no lookup and no guesswork
 * about which tenant it belongs to — every query behind it is org-scoped. That
 * is safe because the endpoint verifies Twilio's signature over the exact URL
 * before it reads a single parameter, so nobody without the account's auth
 * token can call it at all.
 *
 * Returns "" when there is no base to build from, and twilioSend simply sends
 * without a callback rather than failing — a message with no delivery reporting
 * is worse than one with, but far better than none.
 */
export function twilioStatusCallback(o: {
  orgId: string;
  /** The row holding the message we are sending — stamped with the outcome. */
  messageId?: string | null;
  /** The customer's row, reopened for a retry when the send turns out to have
   *  failed. Absent for a human's reply, which nothing retries automatically. */
  customerMessageId?: string | null;
  channel?: string;
}): string {
  // TOLERATE A BASE THAT ALREADY CARRIES THE PATH. The old test demanded an
  // origin and nothing more, so `https://<ref>.supabase.co/functions/v1` — a
  // value the signature verifier explicitly supports, and therefore one somebody
  // will set — failed it and returned "". An empty callback is not an error
  // anywhere: the send simply goes out with no delivery reporting, and every
  // asynchronous carrier failure becomes invisible again. The whole point of
  // this function is to stop that happening silently.
  const raw = (env("TWILIO_STATUS_CALLBACK_BASE") || env("TWILIO_WEBHOOK_BASE") || env("SUPABASE_URL") || "")
    .trim()
    .replace(/\/+$/, "");
  const org = String(o.orgId ?? "").trim();
  if (!org || !/^https:\/\//i.test(raw)) return "";

  let origin: string;
  try {
    origin = new URL(raw).origin;
  } catch {
    return "";
  }
  const q = new URLSearchParams({ org });
  if (o.messageId) q.set("m", String(o.messageId));
  if (o.customerMessageId) q.set("c", String(o.customerMessageId));
  if (o.channel) q.set("ch", String(o.channel));
  // Built from the ORIGIN so a base with or without the prefix lands on exactly
  // one URL — which is also the URL twilio-status reconstructs to verify.
  return `${origin}/functions/v1/twilio-status?${q.toString()}`;
}

/** How many pictures one Twilio message may carry. WhatsApp takes exactly one
 *  per message; the REST API accepts up to ten MediaUrl values on MMS. Only one
 *  is ever sent today (the agent attaches one), but the cap is stated rather
 *  than assumed. */
const MAX_MEDIA_PER_MESSAGE = (channel: "sms" | "whatsapp") => (channel === "whatsapp" ? 1 : 10);

export async function twilioSend(
  channel: "sms" | "whatsapp",
  to: string,
  message: string,
  opts?: {
    contentSid?: string;
    contentVariables?: Record<string, string>;
    from?: string;
    /**
     * Publicly fetchable https URLs Twilio will attach to the message.
     *
     * NOT validated here on purpose — a bad URL fails the whole message, so the
     * check belongs before the decision to send at all. _shared/media.ts is
     * where that happens, and _shared/autoReply.ts is the only thing that calls
     * it: everything reaching this function has already been proved fetchable,
     * the right type and under the size limit.
     */
    mediaUrls?: string[];
    /** Where Twilio reports the real delivery outcome. See twilioStatusCallback. */
    statusCallback?: string;
  },
): Promise<TwilioSendResult> {
  const accountSid = env("TWILIO_ACCOUNT_SID");
  // Authenticate with an API Key (SK SID + secret) when present, else the
  // Account SID + Auth Token. The REST URL always uses the Account SID.
  const authUser = env("TWILIO_API_KEY_SID") || accountSid;
  const authPass = env("TWILIO_API_KEY_SECRET") || env("TWILIO_AUTH_TOKEN");
  const fromRaw = String(opts?.from ?? "").trim() ||
    (channel === "whatsapp" ? platformWhatsappFrom() : env("TWILIO_FROM"));
  if (!accountSid || !fromRaw || !authUser || !authPass) return { ok: false, status: "simulated" };
  const dest = dialable(to);
  if (!dest) {
    return {
      ok: false,
      status: "failed",
      errorMessage: `"${to}" isn't a usable phone number. Save it in international format, e.g. +447350172153.`,
    };
  }
  const wa = (n: string) => (n.startsWith("whatsapp:") ? n : `whatsapp:${n}`);
  const From = channel === "whatsapp" ? wa(fromRaw) : fromRaw;
  const To = channel === "whatsapp" ? wa(dest) : dest;
  // A pre-approved template is sent via ContentSid (+ variables) — required to
  // message outside WhatsApp's 24h window; otherwise send a free-form Body.
  // Typed explicitly: without it the union of the two branches gives each side
  // the other's keys as `undefined`, which URLSearchParams' Record<string,string>
  // signature rejects — a long-standing `deno check` failure in this file that
  // the deploy bundler never surfaced because it does not type-check.
  const params: Record<string, string> = opts?.contentSid
    ? { From, To, ContentSid: opts.contentSid, ContentVariables: JSON.stringify(opts.contentVariables ?? {}) }
    : { From, To, Body: message };
  const form = new URLSearchParams(params);
  // MediaUrl is a REPEATED parameter, which is why the body is assembled rather
  // than handed over as a record. A template send never carries one: an approved
  // template's media lives in its own header, declared at approval time, and
  // pairing a MediaUrl with a ContentSid is rejected outright.
  if (!opts?.contentSid) {
    for (const u of (opts?.mediaUrls ?? []).slice(0, MAX_MEDIA_PER_MESSAGE(channel))) {
      const url = String(u ?? "").trim();
      if (url) form.append("MediaUrl", url);
    }
  }
  if (opts?.statusCallback) form.set("StatusCallback", opts.statusCallback);
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${btoa(`${authUser}:${authPass}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    // deno-lint-ignore no-explicit-any
    const data: any = await res.json().catch(() => ({}));
    // "sent" HERE MEANS "TWILIO ACCEPTED IT", NOT "THE CUSTOMER GOT IT".
    // A 201 comes back with status `queued`; carrier filtering, an unreachable
    // handset, a landline and WhatsApp's closed window are all reported minutes
    // later on the message resource. `statusCallback` is how that verdict gets
    // back — see twilio-status, which corrects this row and the customer's when
    // the message turns out never to have arrived. Without a callback URL this
    // optimism is never corrected, which is exactly the defect it exists to fix.
    if (res.ok) return { ok: true, status: "sent", sid: data?.sid };
    return { ok: false, status: "failed", errorCode: data?.code, errorMessage: data?.message };
  } catch (e) {
    return { ok: false, status: "failed", errorMessage: String(e) };
  }
}

// Rich email send (Resend) — full HTML body, CC/BCC, reply-to, attachments.
// Used by the Inbox email composer; the simple dispatchEmail() path stays for
// the agent's one-line transactional sends (with Postmark fallback).
export type EmailAttachment = { filename: string; content: string }; // content = base64
export type EmailSendResult = { ok: boolean; id?: string; status: DispatchResult["status"]; error?: string };

export async function sendEmail(opts: {
  to: string[]; cc?: string[]; bcc?: string[]; subject: string; html: string; text?: string; replyTo?: string; attachments?: EmailAttachment[];
  /** Extra SMTP headers passed straight through to Resend — e.g.
   *  'List-Unsubscribe' + 'List-Unsubscribe-Post' for one-click opt-out. */
  headers?: Record<string, string>;
}): Promise<EmailSendResult> {
  const key = env("RESEND_API_KEY");
  const from = env("RESEND_FROM");
  if (!key || !from) return { ok: false, status: "simulated" };
  // deno-lint-ignore no-explicit-any
  const body: Record<string, any> = { from, to: opts.to, subject: opts.subject, html: opts.html };
  if (opts.text) body.text = opts.text;
  if (opts.cc?.length) body.cc = opts.cc;
  if (opts.bcc?.length) body.bcc = opts.bcc;
  body.reply_to = opts.replyTo || replyAddress();
  if (opts.attachments?.length) body.attachments = opts.attachments;
  if (opts.headers && Object.keys(opts.headers).length) body.headers = opts.headers;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    // deno-lint-ignore no-explicit-any
    const data: any = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, id: data?.id, status: "sent" };
    return { ok: false, status: "failed", error: data?.message || data?.name || "send failed" };
  } catch (e) {
    return { ok: false, status: "failed", error: String(e) };
  }
}

async function dispatchSms(to: string, message: string, from?: string): Promise<DispatchResult> {
  const r = await twilioSend("sms", to, message, from ? { from } : undefined);
  return { status: r.status, provider: r.status === "simulated" ? "none" : "twilio" };
}

async function dispatchWhatsApp(to: string, message: string, from?: string): Promise<DispatchResult> {
  const r = await twilioSend("whatsapp", to, message, from ? { from } : undefined);
  return { status: r.status, provider: r.status === "simulated" ? "none" : "twilio_whatsapp" };
}

// Place an OUTBOUND call that bridges the customer straight to the business's
// own Pipecat AI agent — no third-party voice vendor. Twilio dials from
// TWILIO_FROM and we hand it inline TwiML that opens a media stream to the
// voice server's /ws, passing the agent's public key as a Stream parameter
// (the same channel inbound calls use). VOICE_WS_HOST overrides the host.
export type CallResult = { ok: boolean; status: DispatchResult["status"]; sid?: string; error?: string };

const xmlEsc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// The voice server used to run a full agent session for anyone who opened a
// media stream to its /ws — and the agent key that authorises it ships in every
// storefront bundle, so "leaked key + public wss:// endpoint" was a free line
// into the business's agent. Now the stream must carry a signature the server
// verifies with the shared VOICE_BRIDGE_SECRET. On an OUTBOUND call the Twilio
// CallSid does not exist yet at dial time, so this form signs the literal
// "outbound"; server.py accepts it ONLY when the stream's `from` param is
// "outbound" (an inbound call signs `key|callSid|exp` instead, minted in
// server.py's webhook). exp is a short window so a captured TwiML is useless
// within minutes.
//   exp = now + 600 ; sig = hex(HMAC-SHA256(VOICE_BRIDGE_SECRET, `${key}|outbound|${exp}`))
// With the secret unset we send nothing: the server then degrades to its old
// open behaviour, so an unsigned stream is no worse than before — the secret
// being present on BOTH sides is what turns the lock.
async function voiceStreamSig(key: string): Promise<{ sig: string; exp: number } | null> {
  const secret = env("VOICE_BRIDGE_SECRET");
  if (!secret) return null;
  const exp = Math.floor(Date.now() / 1000) + 600;
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const buf = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(`${key}|outbound|${exp}`));
  const sig = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return { sig, exp };
}

async function twilioCall(to: string, twiml: string): Promise<CallResult> {
  const accountSid = env("TWILIO_ACCOUNT_SID");
  const authUser = env("TWILIO_API_KEY_SID") || accountSid;
  const authPass = env("TWILIO_API_KEY_SECRET") || env("TWILIO_AUTH_TOKEN");
  const from = env("TWILIO_FROM");
  if (!accountSid || !from || !authUser || !authPass || !to) return { ok: false, status: "simulated" };
  const dest = dialable(to);
  if (!dest) {
    return { ok: false, status: "failed", error: `"${to}" isn't a usable phone number. Save it in international format, e.g. +447350172153.` };
  }
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${btoa(`${authUser}:${authPass}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ From: from, To: dest, Twiml: twiml }),
    });
    // deno-lint-ignore no-explicit-any
    const data: any = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, status: "dialing", sid: data?.sid };
    return { ok: false, status: "failed", error: data?.message };
  } catch (e) {
    return { ok: false, status: "failed", error: String(e) };
  }
}

/** Is the Pipecat voice server actually serving? Twilio only reports a dead
 *  <Stream> endpoint *after* the call connects (error 31920, WebSocket upgrade
 *  answered with something other than 101), so without this preflight a call to
 *  a down server bills a leg, shows "dialing" in the console, and leaves the
 *  customer listening to silence. Failing before we dial is the honest outcome. */
async function voiceServerUp(host: string): Promise<boolean> {
  try {
    const res = await fetch(`https://${host}/health`, {
      signal: AbortSignal.timeout(4000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function placeAiCall(agentKey: string, to: string, opening = ""): Promise<CallResult> {
  if (!agentKey || !to) return { ok: false, status: "simulated" };
  // Fallback only matters if VOICE_WS_HOST is ever unset — it previously named
  // a hosting provider we no longer use, which meant a missing secret failed
  // silently into a dead endpoint (Twilio 31920) instead of anywhere useful.
  const host = env("VOICE_WS_HOST") || "voice.phoxta.com";
  if (!(await voiceServerUp(host))) {
    return {
      ok: false,
      status: "failed",
      error: `The AI voice server (${host}) isn't responding, so the call would connect to silence. Check the deployment, then try again.`,
    };
  }
  const openParam = opening ? `<Parameter name="opening" value="${xmlEsc(opening)}"/>` : "";
  // The dialled number IS the customer on an outbound call, so the bridge threads
  // the conversation and files it as voice against the right contact. Normalise
  // to the same E.164 twilioCall dials so agent-inbound recognises the number.
  const customerPhone = dialable(to) || to;
  const sig = await voiceStreamSig(agentKey);
  const authParams = sig ? `<Parameter name="sig" value="${sig.sig}"/><Parameter name="exp" value="${sig.exp}"/>` : "";
  const twiml =
    `<?xml version="1.0" encoding="UTF-8"?><Response><Connect>` +
    `<Stream url="wss://${host}/ws"><Parameter name="key" value="${xmlEsc(agentKey)}"/>` +
    `<Parameter name="from" value="outbound"/>` +
    `<Parameter name="direction" value="outbound"/>` +
    `<Parameter name="customer_phone" value="${xmlEsc(customerPhone)}"/>` +
    `${authParams}${openParam}</Stream></Connect></Response>`;
  return twilioCall(to, twiml);
}

// Human-bridge ("call me, then connect me to the customer"): Twilio dials the
// operator first, then bridges the customer in with the business caller ID.
export async function placeBridgeCall(customerTo: string, agentPhone: string): Promise<CallResult> {
  const from = env("TWILIO_FROM");
  if (!agentPhone || !customerTo || !from) return { ok: false, status: "simulated" };
  // The customer leg rides inside the TwiML, so twilioCall's normalisation (which
  // only covers the outer `To`) never sees it — normalise it here.
  const customer = dialable(customerTo);
  if (!customer) {
    return { ok: false, status: "failed", error: `"${customerTo}" isn't a usable phone number. Save it in international format, e.g. +447350172153.` };
  }
  const twiml =
    `<?xml version="1.0" encoding="UTF-8"?><Response>` +
    `<Say>Connecting you to your customer now.</Say>` +
    `<Dial callerId="${xmlEsc(from)}"><Number>${xmlEsc(customer)}</Number></Dial></Response>`;
  return twilioCall(agentPhone, twiml);
}

async function dispatchVoice(to: string, message: string): Promise<DispatchResult> {
  if (env("VAPI_API_KEY") && env("VAPI_PHONE_NUMBER_ID")) {
    try {
      const res = await fetch("https://api.vapi.ai/call", {
        method: "POST",
        headers: { Authorization: `Bearer ${env("VAPI_API_KEY")}`, "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumberId: env("VAPI_PHONE_NUMBER_ID"), customer: { number: to }, assistant: { firstMessage: message } }),
      });
      return { status: res.ok ? "dialing" : "failed", provider: "vapi" };
    } catch {
      return { status: "failed", provider: "vapi" };
    }
  }
  if (env("RETELL_API_KEY") && env("RETELL_FROM")) {
    try {
      const res = await fetch("https://api.retellai.com/v2/create-phone-call", {
        method: "POST",
        headers: { Authorization: `Bearer ${env("RETELL_API_KEY")}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from_number: env("RETELL_FROM"), to_number: to, retell_llm_dynamic_variables: { opening: message } }),
      });
      return { status: res.ok ? "dialing" : "failed", provider: "retell" };
    } catch {
      return { status: "failed", provider: "retell" };
    }
  }
  return { status: "simulated", provider: "none" };
}

export async function dispatch(
  channel: string,
  to: string,
  subject: string,
  message: string,
  opts?: {
    /** Email only: where the recipient's reply must land. Omit for platform mail. */
    replyTo?: string;
    /**
     * SMS/WhatsApp only: the TENANT's number to send from. Without it Twilio
     * sends from the platform's TWILIO_FROM — and when the customer replies to
     * that number, twilio-inbound routes the reply to whichever org owns the
     * platform line. That is a cross-tenant leak, and the email branch was
     * already fixed for it (replyTo); this is the same fix for texting.
     */
    from?: string;
  },
): Promise<DispatchResult> {
  if (!to) return { status: "simulated", provider: "none" };
  if (channel === "email") return dispatchEmail(to, subject, message, opts?.replyTo);
  if (channel === "sms") return dispatchSms(to, message, opts?.from);
  if (channel === "whatsapp") return dispatchWhatsApp(to, message, opts?.from);
  if (channel === "call") return dispatchVoice(to, message);
  return { status: "simulated", provider: "none" };
}
