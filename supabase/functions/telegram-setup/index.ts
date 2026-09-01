// Phoxta — telegram-setup: one call to register the bot's webhook and command
// menu, run ONCE after TELEGRAM_BOT_TOKEN is set. Gated by the same webhook
// secret the bot verifies with, so the bot token itself never has to leave
// Supabase to wire everything up.
import { json } from "../_shared/cors.ts";
import { safeEqual } from "../_shared/internalProof.ts";
import { setMyCommands, tg } from "../_shared/telegram.ts";

Deno.serve(async (req) => {
  const want = Deno.env.get("TELEGRAM_WEBHOOK_SECRET") ?? "";
  const got = req.headers.get("x-setup-key") ?? new URL(req.url).searchParams.get("key") ?? "";
  if (!want || !safeEqual(got, want)) return json({ error: "forbidden" }, 403);
  if (!Deno.env.get("TELEGRAM_BOT_TOKEN")) return json({ error: "TELEGRAM_BOT_TOKEN not set — create the bot with @BotFather first." }, 503);

  const base = Deno.env.get("SUPABASE_URL") ?? "";
  const webhookUrl = `${base}/functions/v1/telegram-inbound`;

  const hook = await tg("setWebhook", {
    url: webhookUrl,
    secret_token: want,
    allowed_updates: ["message", "edited_message", "callback_query", "inline_query"],
    drop_pending_updates: true,
  });
  const cmds = await setMyCommands([
    { command: "console", description: "Open the operator console (Mini App)" },
    { command: "today", description: "Today's orders, revenue & what needs you" },
    { command: "switch", description: "Switch which business you're acting on" },
    { command: "help", description: "What you can ask the operator" },
  ]);

  // A persistent menu button that launches the Mini App — the console lives one
  // tap from every chat. APP_URL is where the SPA is served (the /tg route).
  const appUrl = (Deno.env.get("APP_URL") || "https://www.phoxta.com").replace(/\/+$/, "");
  const menu = await tg("setChatMenuButton", {
    menu_button: { type: "web_app", text: "Console", web_app: { url: `${appUrl}/tg` } },
  });

  const me = await tg<{ username?: string }>("getMe", {});

  return json({
    webhook: { ok: hook.ok, url: webhookUrl, description: hook.description },
    commands: { ok: cmds.ok },
    menuButton: { ok: menu.ok, url: `${appUrl}/tg` },
    bot: me.result?.username ? `@${me.result.username}` : null,
  });
});
