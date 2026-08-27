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

export async function twilioSend(
  channel: "sms" | "whatsapp",
  to: string,
  message: string,
  opts?: { contentSid?: string; contentVariables?: Record<string, string>; from?: string },
): Promise<TwilioSendResult> {
  const accountSid = env("TWILIO_ACCOUNT_SID");
  // Authenticate with an API Key (SK SID + secret) when present, else the
  // Account SID + Auth Token. The REST URL always uses the Account SID.
  const authUser = env("TWILIO_API_KEY_SID") || accountSid;
  const authPass = env("TWILIO_API_KEY_SECRET") || env("TWILIO_AUTH_TOKEN");
  const fromRaw = String(opts?.from ?? "").trim() ||
    (channel === "whatsapp" ? (env("TWILIO_WHATSAPP_FROM") || env("TWILIO_FROM")) : env("TWILIO_FROM"));
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
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${btoa(`${authUser}:${authPass}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params),
    });
    // deno-lint-ignore no-explicit-any
    const data: any = await res.json().catch(() => ({}));
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

async function dispatchSms(to: string, message: string): Promise<DispatchResult> {
  const r = await twilioSend("sms", to, message);
  return { status: r.status, provider: r.status === "simulated" ? "none" : "twilio" };
}

async function dispatchWhatsApp(to: string, message: string): Promise<DispatchResult> {
  const r = await twilioSend("whatsapp", to, message);
  return { status: r.status, provider: r.status === "simulated" ? "none" : "twilio_whatsapp" };
}

// Place an OUTBOUND call that bridges the customer straight to the business's
// own Pipecat AI agent — no third-party voice vendor. Twilio dials from
// TWILIO_FROM and we hand it inline TwiML that opens a media stream to the
// voice server's /ws, passing the agent's public key as a Stream parameter
// (the same channel inbound calls use). VOICE_WS_HOST overrides the host.
export type CallResult = { ok: boolean; status: DispatchResult["status"]; sid?: string; error?: string };

const xmlEsc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

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
  const twiml =
    `<?xml version="1.0" encoding="UTF-8"?><Response><Connect>` +
    `<Stream url="wss://${host}/ws"><Parameter name="key" value="${xmlEsc(agentKey)}"/>` +
    `<Parameter name="from" value="outbound"/>${openParam}</Stream></Connect></Response>`;
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
  /** Email only: where the recipient's reply must land. Omit for platform mail. */
  opts?: { replyTo?: string },
): Promise<DispatchResult> {
  if (!to) return { status: "simulated", provider: "none" };
  if (channel === "email") return dispatchEmail(to, subject, message, opts?.replyTo);
  if (channel === "sms") return dispatchSms(to, message);
  if (channel === "whatsapp") return dispatchWhatsApp(to, message);
  if (channel === "call") return dispatchVoice(to, message);
  return { status: "simulated", provider: "none" };
}
