// Phoxta — telegram-inbound: the owner's operator, on Telegram.
//
// One platform bot. Every update lands here. The owner links their Telegram
// account to a Phoxta business ONCE (a deep-link token minted in the dashboard),
// and from then on the bot knows exactly who is speaking and which business they
// mean — so it can route straight to agent-operator, the same governed owner
// brain the dashboard drives, with an internal proof standing in for the JWT.
//
// Telegram, not Twilio, so: no 24-hour window, no templates, no per-message fee.
// Buttons are real (inline keyboards → callback_query), messages can be edited
// in place, voice notes and photos come in as files, and the reply can go back
// as text, a photo (a design), or a voice note.
import { adminClient, type SupabaseClient } from "../_shared/supabaseAdmin.ts";
import { internalProofHeaders } from "../_shared/internalProof.ts";
import { runWrite, recordAudit, actionTitle } from "../_shared/actions.ts";
import { renderDesign } from "../_shared/render.ts";
import { isAdminRole } from "../_shared/auth.ts";
import {
  answerCallback, answerInlineQuery, chatAction, downloadFile, editReplyMarkup,
  esc, inlineKeyboard, sendMessage, sendPhotoUrl, sendVoiceBytes, transcribe, type Button,
} from "../_shared/telegram.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const OK = () => new Response("ok"); // Telegram only needs a 200; we always give one.

// ── Identity ────────────────────────────────────────────────────────────────
type Link = { user_id: string; organization_id: string };
async function linkFor(admin: SupabaseClient, tgUserId: number): Promise<Link | null> {
  const { data } = await admin.from("telegram_links")
    .select("user_id, organization_id").eq("telegram_user_id", tgUserId).maybeSingle();
  if (data) {
    // Touch last_seen without blocking the turn.
    admin.from("telegram_links").update({ last_seen_at: new Date().toISOString() })
      .eq("telegram_user_id", tgUserId).then(() => {}, () => {});
  }
  return (data as Link | null) ?? null;
}

async function roleFor(admin: SupabaseClient, userId: string, orgId: string): Promise<string> {
  const { data } = await admin.from("organization_memberships")
    .select("role").eq("organization_id", orgId).eq("user_id", userId).maybeSingle();
  return String((data as { role?: string } | null)?.role ?? "member");
}

const LINK_PROMPT =
  "👋 This is your Phoxta operator. To connect it to your business, open your Phoxta dashboard → " +
  "<b>Agent → Operator → Connect Telegram</b>, and tap the link it gives you. Then you can run everything from here.";

// ── The operator turn ────────────────────────────────────────────────────────
// Call agent-operator exactly as the dashboard does, but proving the call came
// from inside (the HMAC) and handing it the resolved identity instead of a JWT.
async function runOperator(orgId: string, userId: string, message: string): Promise<{ reply: string; attachments: Json[] }> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/agent-operator`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
      ...(await internalProofHeaders()),
    },
    body: JSON.stringify({ organizationId: orgId, internalUserId: userId, message, stream: false }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { reply: String(data?.error ?? "Something went wrong just now — try again in a moment."), attachments: [] };
  }
  return { reply: String(data?.reply ?? ""), attachments: Array.isArray(data?.attachments) ? data.attachments : [] };
}

// Send whatever a turn produced: the text, any voice note, any design preview,
// and — separately — any write the operator QUEUED, each as a tap-to-approve card.
async function deliverTurn(admin: SupabaseClient, chatId: number, orgId: string, userId: string, since: string, out: { reply: string; attachments: Json[] }) {
  if (out.reply) await sendMessage(chatId, esc(out.reply));

  for (const a of out.attachments) {
    try {
      if (a.kind === "audio" && a.path) {
        const { data: file } = await admin.storage.from("operator-files").download(a.path);
        if (file) await sendVoiceBytes(chatId, new Uint8Array(await file.arrayBuffer()));
      } else if (a.kind === "design" && a.path) {
        // a.path is the design id. Prefer the saved export; render on demand if none.
        const { data: d } = await admin.from("designs").select("png_url").eq("id", a.path).maybeSingle();
        let url = String((d as Json)?.png_url ?? "");
        if (!url) {
          const r = await renderDesign(admin, orgId, String(a.path), { format: "jpeg" });
          if ("url" in r) url = r.url;
        }
        if (url) await sendPhotoUrl(chatId, url, esc(String(a.name ?? "Design")));
      }
    } catch { /* one attachment failing must not sink the reply */ }
  }

  // Anything the operator just QUEUED for approval → a card with buttons.
  const { data: pend } = await admin.from("agent_actions")
    .select("id, tool, args, title").eq("organization_id", orgId).eq("requested_by", userId)
    .eq("status", "pending").gte("created_at", since).order("created_at", { ascending: true }).limit(5);
  for (const p of (pend as Json[] ?? [])) {
    const title = String(p.title ?? actionTitle(String(p.tool), p.args));
    await sendMessage(chatId, `⏳ <b>Needs your OK</b>\n${esc(title)}`, {
      keyboard: inlineKeyboard([[{ text: "✓ Approve", data: `ok:${p.id}` }, { text: "✗ Reject", data: `no:${p.id}` }]]),
    });
  }
}

// ── Approvals (button taps) ──────────────────────────────────────────────────
// Replays agent-approve's exact governed path: atomic claim so two taps can't
// both fire, runWrite by the stored target id, executed/failed + audit.
async function handleApproval(admin: SupabaseClient, cq: Json, link: Link) {
  const [verb, actionId] = String(cq.data ?? "").split(":");
  const chatId = cq.message?.chat?.id;
  const messageId = cq.message?.message_id;
  const role = await roleFor(admin, link.user_id, link.organization_id);
  if (!isAdminRole(role)) { await answerCallback(cq.id, "Only an owner or admin can approve.", true); return; }

  const { data: act } = await admin.from("agent_actions")
    .select("id, tool, args, title, organization_id, status").eq("id", actionId).maybeSingle();
  if (!act || (act as Json).organization_id !== link.organization_id) { await answerCallback(cq.id, "That action is gone."); return; }
  if ((act as Json).status !== "pending") { await answerCallback(cq.id, `Already ${(act as Json).status}.`); if (messageId) await editReplyMarkup(chatId, messageId); return; }

  const decided = new Date().toISOString();
  if (verb === "no") {
    await admin.from("agent_actions").update({ status: "rejected", decided_at: decided, decided_by: link.user_id }).eq("id", actionId).eq("status", "pending");
    await answerCallback(cq.id, "Cancelled.");
    if (messageId) await editReplyMarkup(chatId, messageId);
    await sendMessage(chatId, `✗ <s>${esc(String((act as Json).title ?? (act as Json).tool))}</s> — cancelled.`);
    return;
  }

  // Approve: claim atomically, then run.
  const { data: claimed } = await admin.from("agent_actions")
    .update({ status: "executing", decided_at: decided, decided_by: link.user_id })
    .eq("id", actionId).eq("status", "pending").select("id").maybeSingle();
  if (!claimed) { await answerCallback(cq.id, "Someone got there first."); return; }
  await answerCallback(cq.id, "Working on it…");
  if (messageId) await editReplyMarkup(chatId, messageId);

  const tool = String((act as Json).tool);
  const args = (act as Json).args;
  try {
    const summary = await runWrite(admin, link.organization_id, tool, args, link.user_id);
    await admin.from("agent_actions").update({ status: "executed", result: summary }).eq("id", actionId);
    await recordAudit(admin, link.organization_id, { tool, args, status: "ok", summary, actor: "owner", actorId: link.user_id, source: "approval" });
    await sendMessage(chatId, `✓ <b>Done.</b> ${esc(summary)}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await admin.from("agent_actions").update({ status: "failed", error: msg }).eq("id", actionId);
    await recordAudit(admin, link.organization_id, { tool, args, status: "error", summary: msg, actor: "owner", actorId: link.user_id, source: "approval" });
    await sendMessage(chatId, `⚠️ That didn't go through: ${esc(msg)}`);
  }
}

// ── /start [payload] — link binding ─────────────────────────────────────────
async function handleStart(admin: SupabaseClient, msg: Json, payload: string) {
  const from = msg.from ?? {};
  const chatId = msg.chat?.id;
  const tgUserId = Number(from.id);

  if (payload.startsWith("link_")) {
    const token = payload.slice(5);
    const { data: tok } = await admin.from("telegram_link_tokens")
      .select("user_id, organization_id, expires_at, used_at").eq("token", token).maybeSingle();
    if (!tok || (tok as Json).used_at || new Date((tok as Json).expires_at).getTime() < Date.now()) {
      await sendMessage(chatId, "That link has expired. Generate a fresh one in your dashboard → Agent → Operator → Connect Telegram.");
      return;
    }
    await admin.from("telegram_links").upsert({
      telegram_user_id: tgUserId,
      user_id: (tok as Json).user_id,
      organization_id: (tok as Json).organization_id,
      username: from.username ?? null,
      first_name: from.first_name ?? null,
      linked_at: new Date().toISOString(),
    }, { onConflict: "telegram_user_id" });
    await admin.from("telegram_link_tokens").update({ used_at: new Date().toISOString() }).eq("token", token);
    const { data: org } = await admin.from("organizations").select("name").eq("id", (tok as Json).organization_id).maybeSingle();
    await sendMessage(chatId,
      `✅ Connected to <b>${esc(String((org as Json)?.name ?? "your business"))}</b>.\n\n` +
      `Just tell me what you need — "how many orders today", "post about the weekend sale", "refund Amara's order". ` +
      `Type /help for the essentials, or send a voice note.`);
    return;
  }

  const link = await linkFor(admin, tgUserId);
  await sendMessage(chatId, link ? "You're connected. Type /help or just tell me what you need." : LINK_PROMPT);
}

// ── /switch — pick which business is active ─────────────────────────────────
async function handleSwitch(admin: SupabaseClient, chatId: number, link: Link) {
  const { data: mems } = await admin.from("organization_memberships")
    .select("organization_id, organizations(name)").eq("user_id", link.user_id).limit(12);
  const rows = (mems as Json[] ?? []).filter((m) => m.organizations);
  if (rows.length <= 1) { await sendMessage(chatId, "This account has one business — nothing to switch to."); return; }
  const buttons: Button[][] = rows.map((m) => [{
    text: (m.organization_id === link.organization_id ? "• " : "") + String(m.organizations?.name ?? "Business"),
    data: `org:${m.organization_id}`,
  }]);
  await sendMessage(chatId, "Which business should I act on?", { keyboard: inlineKeyboard(buttons) });
}

const HELP =
  "<b>What you can say</b>\n" +
  "• <i>How many orders today? What did we make?</i>\n" +
  "• <i>Post about the weekend sale, 20% off, all channels</i>\n" +
  "• <i>Refund the blue shirt order and tell her sorry</i>\n" +
  "• <i>Restock the headwraps to 40</i> · <i>Create an invoice for Musa, ₦20k</i>\n" +
  "• Send a <b>voice note</b> or a <b>photo of a product</b> — I'll act on it.\n\n" +
  "Anything that changes money or reaches a customer, I'll show you first and wait for a tap.\n" +
  "/today · /switch business · /help";

// ── The dispatcher ────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  // Telegram proves it's Telegram with a secret token header we set on setWebhook.
  const secret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET") ?? "";
  if (secret && req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return new Response("forbidden", { status: 403 });
  }
  const admin = adminClient();
  let update: Json;
  try { update = await req.json(); } catch { return OK(); }

  // Idempotency: a redelivered update_id is a no-op.
  const updateId = Number(update?.update_id);
  if (updateId) {
    const { error } = await admin.from("telegram_updates").insert({ update_id: updateId });
    if (error) return OK(); // already seen (primary-key conflict) — do nothing
  }

  try {
    // ── Button taps ──
    if (update.callback_query) {
      const cq = update.callback_query;
      const data = String(cq.data ?? "");
      const link = await linkFor(admin, Number(cq.from?.id));
      if (!link) { await answerCallback(cq.id, "Reconnect from your dashboard first."); return OK(); }
      if (data.startsWith("ok:") || data.startsWith("no:")) {
        await handleApproval(admin, cq, link);
      } else if (data.startsWith("org:")) {
        const orgId = data.slice(4);
        const role = await roleFor(admin, link.user_id, orgId);
        if (role) {
          await admin.from("telegram_links").update({ organization_id: orgId }).eq("telegram_user_id", Number(cq.from.id));
          const { data: org } = await admin.from("organizations").select("name").eq("id", orgId).maybeSingle();
          await answerCallback(cq.id, `Now acting on ${String((org as Json)?.name ?? "it")}.`);
        } else {
          await answerCallback(cq.id, "You're not on that business.", true);
        }
      } else {
        await answerCallback(cq.id);
      }
      return OK();
    }

    // ── Inline mode: @bot <query> from any chat → share a product ──
    if (update.inline_query) {
      const iq = update.inline_query;
      const link = await linkFor(admin, Number(iq.from?.id));
      const q = String(iq.query ?? "").trim();
      if (!link || !q) { await answerInlineQuery(iq.id, []); return OK(); }
      const { data: prods } = await admin.from("products")
        .select("id, name, price_cents, currency, image_url, description").eq("organization_id", link.organization_id)
        .eq("status", "active").ilike("name", `%${q}%`).limit(10);
      const results = (prods as Json[] ?? []).map((p) => {
        const price = p.price_cents ? `${(p.currency ?? "").toString()} ${(p.price_cents / 100).toFixed(2)}` : "";
        return {
          type: "article",
          id: String(p.id),
          title: String(p.name),
          description: price,
          thumbnail_url: p.image_url || undefined,
          input_message_content: { message_text: `<b>${esc(String(p.name))}</b>${price ? `\n${esc(price)}` : ""}${p.description ? `\n${esc(String(p.description).slice(0, 200))}` : ""}`, parse_mode: "HTML" },
        };
      });
      await answerInlineQuery(iq.id, results);
      return OK();
    }

    // ── Messages ──
    const msg = update.message ?? update.edited_message;
    if (!msg) return OK();
    const chatId = msg.chat?.id;
    const tgUserId = Number(msg.from?.id);
    const text = String(msg.text ?? msg.caption ?? "").trim();

    // /start is the one command that works before linking.
    if (text.startsWith("/start")) { await handleStart(admin, msg, text.replace(/^\/start\s*/, "").trim()); return OK(); }

    // In a group the bot (privacy mode) only sees commands and @mentions, so a
    // team can run /today, /console or mention it and it acts on the SENDER's
    // business. An unlinked sender in a group is met with silence, not a prompt
    // spammed to everyone.
    const inGroup = msg.chat?.type === "group" || msg.chat?.type === "supergroup";
    const link = await linkFor(admin, tgUserId);
    if (!link) { if (!inGroup) await sendMessage(chatId, LINK_PROMPT); return OK(); }

    if (text === "/help" || text === "/help@") { await sendMessage(chatId, HELP); return OK(); }
    if (text.startsWith("/switch")) { await handleSwitch(admin, chatId, link); return OK(); }
    if (text.startsWith("/console") || text.startsWith("/app")) {
      const appUrl = (Deno.env.get("APP_URL") || "https://www.phoxta.com").replace(/\/+$/, "");
      await sendMessage(chatId, "Your operator console — today's numbers, approvals and chat in one screen:", {
        keyboard: inlineKeyboard([[{ text: "📊 Open console", webApp: `${appUrl}/tg` }]]),
      });
      return OK();
    }

    const since = new Date(Date.now() - 2000).toISOString();
    await chatAction(chatId, "typing");

    // Voice note → transcribe → operator.
    if (msg.voice?.file_id) {
      const bytes = await downloadFile(msg.voice.file_id);
      if (!bytes) { await sendMessage(chatId, "I couldn't fetch that voice note — try again?"); return OK(); }
      let said = "";
      try { said = await transcribe(bytes); } catch { /* fall through */ }
      if (!said) { await sendMessage(chatId, "I couldn't make out the audio — could you type it or try again?"); return OK(); }
      await sendMessage(chatId, `🎤 <i>${esc(said)}</i>`);
      const out = await runOperator(link.organization_id, link.user_id, said);
      await deliverTurn(admin, chatId, link.organization_id, link.user_id, since, out);
      return OK();
    }

    // Photo → store it, hand the operator the URL + the owner's caption so its
    // tools (create_product with an image, etc.) can use the real picture.
    if (Array.isArray(msg.photo) && msg.photo.length) {
      const best = msg.photo[msg.photo.length - 1]; // largest size
      const bytes = await downloadFile(best.file_id);
      let note = text || "the owner sent a photo";
      if (bytes) {
        const path = `${link.organization_id}/tg-${crypto.randomUUID()}.jpg`;
        const { error } = await admin.storage.from("operator-files").upload(path, bytes, { contentType: "image/jpeg", upsert: false });
        if (!error) {
          const { data: signed } = await admin.storage.from("operator-files").createSignedUrl(path, 3600);
          note = `The owner sent a photo (available at: ${signed?.signedUrl ?? path}).` + (text ? ` They said: "${text}".` : " No caption — ask what they want done with it if it isn't obvious.");
        }
      }
      const out = await runOperator(link.organization_id, link.user_id, note);
      await deliverTurn(admin, chatId, link.organization_id, link.user_id, since, out);
      return OK();
    }

    // Plain text (or an unknown /command the operator can interpret).
    if (!text) { await sendMessage(chatId, "Tell me what you need — or /help."); return OK(); }
    const ask = text === "/today" ? "Give me today's summary: orders, revenue, anything that needs my attention." : text;
    const out = await runOperator(link.organization_id, link.user_id, ask);
    await deliverTurn(admin, chatId, link.organization_id, link.user_id, since, out);
    return OK();
  } catch (e) {
    console.error("[phoxta] telegram-inbound:", e instanceof Error ? e.message : String(e));
    return OK(); // never make Telegram retry on our own error
  }
});
