// Phoxta — telegram-link: mint the one-time deep link that binds a Telegram
// account to this business. Called from the dashboard (Agent → Operator →
// Connect Telegram). Returns a t.me link; opening it fires /start link_<token>
// at the bot, which telegram-inbound spends to create the link.
import { preflight, json } from "../_shared/cors.ts";
import { authorize } from "../_shared/auth.ts";
import { tg } from "../_shared/telegram.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

// The bot's @username, needed for the t.me link. Read from env, else ask
// Telegram (getMe) once per isolate — so a deploy needs no extra secret.
let cachedUsername = "";
async function botUsername(): Promise<string> {
  const env = Deno.env.get("TELEGRAM_BOT_USERNAME");
  if (env) return env.replace(/^@/, "");
  if (cachedUsername) return cachedUsername;
  const me = await tg<{ username?: string }>("getMe", {});
  cachedUsername = String(me.result?.username ?? "");
  return cachedUsername;
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const body = await req.json().catch(() => ({})) as Json;
    const orgId: string | undefined = body?.organizationId;
    // Connecting an integration is a privileged action — owner/admin only.
    const a = await authorize(req, orgId, { requireAdmin: true });
    if (a.error) return a.error;
    const { admin, userId } = a.ok;

    const username = await botUsername();
    if (!username) return json({ error: "The Telegram bot is not configured yet." }, 503);

    // A short, URL-safe token. Telegram's start payload allows [A-Za-z0-9_-],
    // up to 64 chars — a 24-byte base64url value fits comfortably.
    const raw = crypto.getRandomValues(new Uint8Array(24));
    const tokenValue = btoa(String.fromCharCode(...raw)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    const { error } = await admin.from("telegram_link_tokens").insert({
      token: tokenValue, user_id: userId, organization_id: orgId,
    });
    if (error) return json({ error: error.message }, 500);

    return json({ url: `https://t.me/${username}?start=link_${tokenValue}`, username });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
