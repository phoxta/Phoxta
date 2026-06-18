// Phoxta — transport adapters for the agent's outbound channels.
// Research-chosen providers, each guarded by env secrets; when a provider isn't
// configured the send degrades to "simulated" so the agent is fully exercisable
// without external accounts.
//   email : Resend (RESEND_API_KEY + RESEND_FROM) → Postmark (POSTMARK_TOKEN + POSTMARK_FROM)
//   sms   : Twilio (TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM)
//   call  : Vapi (VAPI_API_KEY + VAPI_PHONE_NUMBER_ID) or Retell (RETELL_API_KEY + RETELL_FROM)
//           — managed voice AI; self-host alternative is LiveKit Agents / Pipecat.
export type DispatchResult = { status: "sent" | "dialing" | "simulated" | "failed"; provider: string };

const env = (k: string) => Deno.env.get(k);

async function dispatchEmail(to: string, subject: string, message: string): Promise<DispatchResult> {
  if (env("RESEND_API_KEY") && env("RESEND_FROM")) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: env("RESEND_FROM"), to, subject, html: `<p>${message}</p>` }),
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
        body: JSON.stringify({ From: env("POSTMARK_FROM"), To: to, Subject: subject, HtmlBody: `<p>${message}</p>` }),
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
// on both From and To. From: TWILIO_FROM (SMS) / TWILIO_WHATSAPP_FROM||TWILIO_FROM (WA).
export type TwilioSendResult = { ok: boolean; status: DispatchResult["status"]; sid?: string; errorCode?: number; errorMessage?: string };

export async function twilioSend(
  channel: "sms" | "whatsapp",
  to: string,
  message: string,
  opts?: { contentSid?: string; contentVariables?: Record<string, string> },
): Promise<TwilioSendResult> {
  const accountSid = env("TWILIO_ACCOUNT_SID");
  // Authenticate with an API Key (SK SID + secret) when present, else the
  // Account SID + Auth Token. The REST URL always uses the Account SID.
  const authUser = env("TWILIO_API_KEY_SID") || accountSid;
  const authPass = env("TWILIO_API_KEY_SECRET") || env("TWILIO_AUTH_TOKEN");
  const fromRaw = channel === "whatsapp" ? (env("TWILIO_WHATSAPP_FROM") || env("TWILIO_FROM")) : env("TWILIO_FROM");
  if (!accountSid || !fromRaw || !authUser || !authPass) return { ok: false, status: "simulated" };
  const wa = (n: string) => (n.startsWith("whatsapp:") ? n : `whatsapp:${n}`);
  const From = channel === "whatsapp" ? wa(fromRaw) : fromRaw;
  const To = channel === "whatsapp" ? wa(to) : to;
  // A pre-approved template is sent via ContentSid (+ variables) — required to
  // message outside WhatsApp's 24h window; otherwise send a free-form Body.
  const params = opts?.contentSid
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
}): Promise<EmailSendResult> {
  const key = env("RESEND_API_KEY");
  const from = env("RESEND_FROM");
  if (!key || !from) return { ok: false, status: "simulated" };
  // deno-lint-ignore no-explicit-any
  const body: Record<string, any> = { from, to: opts.to, subject: opts.subject, html: opts.html };
  if (opts.text) body.text = opts.text;
  if (opts.cc?.length) body.cc = opts.cc;
  if (opts.bcc?.length) body.bcc = opts.bcc;
  if (opts.replyTo) body.reply_to = opts.replyTo;
  if (opts.attachments?.length) body.attachments = opts.attachments;
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
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${btoa(`${authUser}:${authPass}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ From: from, To: to, Twiml: twiml }),
    });
    // deno-lint-ignore no-explicit-any
    const data: any = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, status: "dialing", sid: data?.sid };
    return { ok: false, status: "failed", error: data?.message };
  } catch (e) {
    return { ok: false, status: "failed", error: String(e) };
  }
}

export async function placeAiCall(agentKey: string, to: string, opening = ""): Promise<CallResult> {
  if (!agentKey || !to) return { ok: false, status: "simulated" };
  const host = env("VOICE_WS_HOST") || "phoxta-voice-production.up.railway.app";
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
  const twiml =
    `<?xml version="1.0" encoding="UTF-8"?><Response>` +
    `<Say>Connecting you to your customer now.</Say>` +
    `<Dial callerId="${xmlEsc(from)}"><Number>${xmlEsc(customerTo)}</Number></Dial></Response>`;
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

export async function dispatch(channel: string, to: string, subject: string, message: string): Promise<DispatchResult> {
  if (!to) return { status: "simulated", provider: "none" };
  if (channel === "email") return dispatchEmail(to, subject, message);
  if (channel === "sms") return dispatchSms(to, message);
  if (channel === "whatsapp") return dispatchWhatsApp(to, message);
  if (channel === "call") return dispatchVoice(to, message);
  return { status: "simulated", provider: "none" };
}
