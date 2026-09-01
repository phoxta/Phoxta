// Phoxta — Telegram Bot API client + helpers, shared by the webhook, the digest
// worker and the link minter. One platform bot; its token is TELEGRAM_BOT_TOKEN.
//
// Nothing here throws for a normal API "ok:false" — Telegram answers 200 with
// { ok:false, description } for most refusals (a blocked user, a message too old
// to edit), and a webhook that threw on those would 500 and be re-delivered for
// no reason. Callers that care read the returned `ok`.

const API = "https://api.telegram.org";

function token(): string {
  const t = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!t) throw new Error("TELEGRAM_BOT_TOKEN not set");
  return t;
}

// deno-lint-ignore no-explicit-any
type Json = any;
export type TgResult<T = Json> = { ok: boolean; result?: T; description?: string };

/** One raw Bot API call. */
export async function tg<T = Json>(method: string, params: Json): Promise<TgResult<T>> {
  try {
    const res = await fetch(`${API}/bot${token()}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(params),
    });
    return await res.json() as TgResult<T>;
  } catch (e) {
    return { ok: false, description: e instanceof Error ? e.message : String(e) };
  }
}

// Telegram's HTML parse mode is the safest rich format — a strict subset, so
// anything the model emits that is not a tag must have its <, >, & escaped or
// the whole message is rejected. We render the model's plain text as HTML, so
// every dynamic string passes through here first.
export function esc(s: string): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export type Button = { text: string; data?: string; url?: string; webApp?: string };
/** Build an inline keyboard from rows of buttons. `data` → callback_query,
 *  `url` → a link, `webApp` → launch a Mini App. */
export function inlineKeyboard(rows: Button[][]): Json {
  return {
    inline_keyboard: rows.map((r) =>
      r.map((b) =>
        b.webApp ? { text: b.text, web_app: { url: b.webApp } }
        : b.url ? { text: b.text, url: b.url }
        : { text: b.text, callback_data: b.data ?? "" }
      )
    ),
  };
}

export function sendMessage(chatId: number | string, text: string, opts?: { keyboard?: Json; noPreview?: boolean }): Promise<TgResult> {
  return tg("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    link_preview_options: opts?.noPreview ? { is_disabled: true } : undefined,
    reply_markup: opts?.keyboard,
  });
}

export function editMessageText(chatId: number | string, messageId: number, text: string, keyboard?: Json): Promise<TgResult> {
  return tg("editMessageText", { chat_id: chatId, message_id: messageId, text, parse_mode: "HTML", reply_markup: keyboard });
}

export function editReplyMarkup(chatId: number | string, messageId: number, keyboard?: Json): Promise<TgResult> {
  return tg("editMessageReplyMarkup", { chat_id: chatId, message_id: messageId, reply_markup: keyboard ?? { inline_keyboard: [] } });
}

/** The "…" toast on a tapped button. Telegram REQUIRES this within seconds of a
 *  callback_query or the button spins forever, so it is always the first thing
 *  the callback handler does. */
export function answerCallback(id: string, text?: string, alert = false): Promise<TgResult> {
  return tg("answerCallbackQuery", { callback_query_id: id, text, show_alert: alert });
}

/** "typing", "record_voice", "upload_photo" — the little status under the bot's
 *  name. Sent before a slow operator turn so the chat never looks frozen. */
export function chatAction(chatId: number | string, action = "typing"): Promise<TgResult> {
  return tg("sendChatAction", { chat_id: chatId, action });
}

/** Send a photo by URL (a stored design/preview) with an optional caption. */
export function sendPhotoUrl(chatId: number | string, url: string, caption?: string): Promise<TgResult> {
  return tg("sendPhoto", { chat_id: chatId, photo: url, caption: caption ? caption.slice(0, 1024) : undefined, parse_mode: "HTML" });
}

/** Send bytes as a voice note (the operator's spoken reply). Multipart, so it
 *  does not go through tg(). */
export async function sendVoiceBytes(chatId: number | string, bytes: Uint8Array, caption?: string): Promise<TgResult> {
  const fd = new FormData();
  fd.append("chat_id", String(chatId));
  if (caption) { fd.append("caption", caption.slice(0, 1024)); fd.append("parse_mode", "HTML"); }
  fd.append("voice", new Blob([bytes.buffer as ArrayBuffer], { type: "audio/ogg" }), "voice.ogg");
  try {
    const res = await fetch(`${API}/bot${token()}/sendVoice`, { method: "POST", body: fd });
    return await res.json() as TgResult;
  } catch (e) {
    return { ok: false, description: e instanceof Error ? e.message : String(e) };
  }
}

export function answerInlineQuery(id: string, results: Json[]): Promise<TgResult> {
  return tg("answerInlineQuery", { inline_query_id: id, results: results.slice(0, 50), cache_time: 5, is_personal: true });
}

// ── Payments ────────────────────────────────────────────────────────────────
// createInvoiceLink returns a shareable t.me link that ANY Telegram user can
// open and pay — so the operator can make a pay link the owner forwards to a
// customer. Real money needs a provider token (TELEGRAM_PROVIDER_TOKEN, set up
// in @BotFather → Payments); `amount` is in the currency's smallest unit
// (e.g. cents/kobo). `payload` rides through to the successful_payment update,
// so we stamp it with the org id to know whose sale it was.
export async function createInvoiceLink(p: {
  title: string; description: string; payload: string; currency: string; amount: number;
}): Promise<{ ok: boolean; url?: string; description?: string }> {
  const provider = Deno.env.get("TELEGRAM_PROVIDER_TOKEN") ?? "";
  if (!provider) return { ok: false, description: "no_provider" };
  const r = await tg<string>("createInvoiceLink", {
    title: p.title.slice(0, 32),
    description: p.description.slice(0, 255),
    payload: p.payload,
    provider_token: provider,
    currency: p.currency,
    prices: [{ label: p.title.slice(0, 32), amount: Math.round(p.amount) }],
  });
  return { ok: r.ok, url: typeof r.result === "string" ? r.result : undefined, description: r.description };
}

export function answerPreCheckout(id: string, ok = true, errorMessage?: string): Promise<TgResult> {
  return tg("answerPreCheckoutQuery", { pre_checkout_query_id: id, ok, error_message: errorMessage });
}

/** Download a file the user sent (a voice note, a photo). Two hops: getFile
 *  gives a temporary file_path, then the file bytes come from the file endpoint
 *  (note: the file endpoint, not the API endpoint). */
export async function downloadFile(fileId: string): Promise<Uint8Array | null> {
  const meta = await tg<{ file_path?: string }>("getFile", { file_id: fileId });
  const p = meta.result?.file_path;
  if (!meta.ok || !p) return null;
  const res = await fetch(`${API}/file/bot${token()}/${p}`);
  if (!res.ok) return null;
  return new Uint8Array(await res.arrayBuffer());
}

/** The persistent slash-command menu. Called once at deploy; safe to re-run. */
export function setMyCommands(commands: { command: string; description: string }[]): Promise<TgResult> {
  return tg("setMyCommands", { commands });
}

// ── Mini App auth ───────────────────────────────────────────────────────────
// A Telegram Mini App hands the page an `initData` query string signed by
// Telegram. The signature proves the user's identity without a password: the
// secret key is HMAC(key="WebAppData", bot_token), and the data-check-string is
// every field except `hash`, sorted, joined by \n. If our recomputed hash
// matches, the `user` field is trustworthy. This is what lets the Mini App act
// as the same operator without a second login.
async function hmacRaw(keyBytes: ArrayBuffer, msg: string): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
}
function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
export async function validateInitData(initData: string, maxAgeSec = 3600): Promise<{ userId: number; username?: string; firstName?: string } | null> {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");
  const pairs = [...params.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${k}=${v}`);
  const dataCheck = pairs.join("\n");
  // The exact two-HMAC chain from Telegram's spec:
  //   secret_key = HMAC-SHA256(key="WebAppData", message=bot_token)
  //   check_hash = HMAC-SHA256(key=secret_key,   message=data_check_string)
  const secretKey = await hmacRaw(new TextEncoder().encode("WebAppData").buffer, token());
  const sig = await hmacRaw(secretKey, dataCheck);
  if (toHex(sig) !== hash) return null;
  const authDate = Number(params.get("auth_date") ?? "0");
  if (!authDate || (Date.now() / 1000) - authDate > maxAgeSec) return null;
  try {
    const u = JSON.parse(params.get("user") ?? "{}");
    if (!u?.id) return null;
    return { userId: Number(u.id), username: u.username, firstName: u.first_name };
  } catch {
    return null;
  }
}

// ── Speech-to-text (voice notes in) ─────────────────────────────────────────
// The owner sends a voice note; we transcribe with OpenAI Whisper (OPENAI_API_KEY
// is already configured) and hand the text to the operator like any message.
// Telegram voice is OGG/Opus, which Whisper accepts directly.
export async function transcribe(bytes: Uint8Array): Promise<string> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("no OPENAI_API_KEY for transcription");
  const fd = new FormData();
  fd.append("file", new Blob([bytes.buffer as ArrayBuffer], { type: "audio/ogg" }), "voice.ogg");
  fd.append("model", "whisper-1");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: fd,
  });
  if (!res.ok) throw new Error(`whisper ${res.status} ${await res.text().catch(() => "")}`);
  const data = await res.json();
  return String(data?.text ?? "").trim();
}
