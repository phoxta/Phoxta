// Phoxta — the one agent's core turn logic, shared by the authenticated function
// (ai-agent) and the public endpoint (agent-inbound). Resolves the conversation,
// loads unified cross-channel memory, runs the tool-using agent, persists, meters.
import { runAgent, callMessages } from "./anthropic.ts";
import { modelFor, type Tier } from "./models.ts";
import { buildAgentTools, agentToolRunner, picturesEnabled, resolveBookingMode, type AgentCtx, type ProductCard, type MediaItem } from "./agentTools.ts";
import { meter, tokensUsedThisMonth, MONTHLY_TOKEN_CAP } from "./meter.ts";
import { guardInput, guardOutput, INJECTION_GUARD_NOTE } from "./guardrails.ts";
import { loadCustomerMemory, extractCustomerMemory } from "./memory.ts";
import { phoneForStorage } from "./telephony.ts";
import { stripQuotedReply } from "./mailText.ts";
import type { SupabaseClient } from "./supabaseAdmin.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

export type AgentConfig = {
  display_name: string;
  persona: string;
  greeting: string;
  tone: string;
  model_tier: Tier;
  business_hours: Json;
  escalation: Json;
  capabilities: Record<string, boolean>;
};

export type Org = { id: string; name: string; vertical: string | null };

/** Load the business's agent config, creating defaults on first use. */
export async function loadConfig(admin: SupabaseClient, orgId: string): Promise<AgentConfig> {
  const { data } = await admin.from("agent_config").select("*").eq("organization_id", orgId).maybeSingle();
  if (data) return data as unknown as AgentConfig;
  const { data: created } = await admin.from("agent_config").insert({ organization_id: orgId }).select("*").single();
  return created as unknown as AgentConfig;
}

// ---------------------------------------------------------------------------
// The business's own saved replies (canned_responses — the "email templates").
//
// These have existed since the console's messaging upgrade and NOTHING has ever
// shown them to the model: they were a human's clipboard, pasted into the
// composer by hand. So the agent answered in its own words while the owner's
// carefully worded replies sat one table away, which is exactly the complaint
// "it did not pick from the email templates".
//
// They are given to the model as MATERIAL, not as output. The instruction is to
// choose the closest one and adapt it to what was actually asked — pasting one
// verbatim is how a canned reply answers the wrong question, and ignoring them
// is how a business's voice gets lost. Which one was used is recorded on the
// message, so a human reading the thread can see why the reply looks as it does.
// ---------------------------------------------------------------------------
export type ReplyTemplate = { id: string; title: string; body: string };

const MAX_TEMPLATES = 8;
const MAX_TEMPLATE_CHARS = 1400;
/** How many saved replies are ranked before the best eight are chosen. */
const TEMPLATE_SCAN = 120;

/** {{name}} / {{business}} — the same substitution the console performs when a
 *  human inserts a snippet, applied before the model sees the text so it can
 *  never copy a raw handlebar into a customer's inbox. */
const fillVars = (body: string, name: string, business: string) =>
  body.replace(/\{\{\s*name\s*\}\}/gi, name || "there").replace(/\{\{\s*business\s*\}\}/gi, business);

/** A template is prose the owner wrote, so cutting it at exactly N characters
 *  hands the model half a sentence — and the prompt tells it to keep "any
 *  promise it makes". Cut at the last sentence or paragraph break instead, and
 *  say plainly that the rest was left out. */
function clipTemplate(body: string): string {
  if (body.length <= MAX_TEMPLATE_CHARS) return body;
  const head = body.slice(0, MAX_TEMPLATE_CHARS);
  const stop = Math.max(head.lastIndexOf("\n\n"), head.lastIndexOf(". "), head.lastIndexOf("! "), head.lastIndexOf("? "));
  const cut = stop > MAX_TEMPLATE_CHARS / 2 ? head.slice(0, stop + 1) : head;
  return `${cut.trim()}\n[…this saved reply continues — do not invent the rest]`;
}

const STOPWORDS = new Set([
  "the", "and", "for", "you", "your", "our", "with", "that", "this", "have", "has", "had", "was", "were", "are",
  "can", "could", "would", "will", "want", "need", "please", "hello", "hi", "thanks", "thank", "from", "about",
  "there", "them", "they", "what", "when", "where", "who", "how", "any", "all", "not", "but", "get", "got",
]);

/** The meaningful words of a piece of text, for overlap scoring. */
function keywords(text: string): Set<string> {
  const out = new Set<string>();
  for (const w of String(text ?? "").toLowerCase().match(/[a-z][a-z0-9'-]{2,}/g) ?? []) {
    if (!STOPWORDS.has(w)) out.add(w.replace(/(ies|es|s)$/, ""));
  }
  return out;
}

/**
 * The owner's saved replies, chosen by what the customer actually asked.
 *
 * Selection used to be `created_at desc` sliced to eight, so a business with
 * more than eight canned responses had its oldest — usually its most refined,
 * the original refund policy — permanently invisible to the agent, and the reply
 * was composed from scratch while the owner's wording sat one table away. Now
 * every template is scored on word overlap with the inbound message (title
 * weighted, because a title IS the topic) and recency only breaks ties.
 */
async function loadTemplates(
  admin: SupabaseClient,
  orgId: string,
  channel: string,
  customerName: string,
  orgName: string,
  message: string,
): Promise<ReplyTemplate[]> {
  const { data, error } = await admin
    .from("canned_responses")
    .select("id, title, body, channel, is_whatsapp_template, created_at")
    .eq("organization_id", orgId)
    .in("channel", ["any", channel])
    .order("created_at", { ascending: false })
    .limit(TEMPLATE_SCAN);
  if (error) {
    // Never fail a customer's turn over templates — answer without them.
    console.warn("[phoxta] saved replies unavailable:", error.message);
    return [];
  }
  const asked = keywords(message);
  const rows = ((data as Json[] | null) ?? [])
    // WhatsApp templates are pre-approved shells full of {{1}} placeholders sent
    // through a different API. They are not free text and must not be adapted.
    .filter((r) => r.is_whatsapp_template !== true && String(r.body ?? "").trim());

  const scored = rows.map((r, i) => {
    const title = String(r.title ?? "").trim() || "Untitled reply";
    const body = String(r.body ?? "");
    let score = 0;
    for (const w of keywords(title)) if (asked.has(w)) score += 3;
    for (const w of keywords(body)) if (asked.has(w)) score += 1;
    // `i` is the recency rank (the query is newest first), so a zero-overlap
    // list still comes back in exactly the order it used to.
    return { r, title, body, score, i };
  });
  scored.sort((a, b) => (b.score - a.score) || (a.i - b.i));

  return scored.slice(0, MAX_TEMPLATES).map((s) => ({
    id: String(s.r.id),
    title: s.title,
    body: clipTemplate(fillVars(s.body.trim(), customerName, orgName)),
  }));
}

function templateBlock(list: ReplyTemplate[]): string {
  if (list.length === 0) return "";
  return [
    "\nSAVED REPLIES — written by the owner of this business. This is how they want these situations answered:",
    list.map((t, i) => `${i + 1}. "${t.title}"\n${t.body}`).join("\n\n"),
    "When one of these fits what the customer actually asked, START FROM IT: keep its wording, its structure and any promise it makes, then EDIT it so it answers THIS message — their name, their order, their dates, the specific thing they asked. Never send one unchanged, never force one that does not fit, and never add a detail it does not contain. If none fits, ignore them and answer normally.",
    "Your reply MUST begin with a single line of the form `TEMPLATE: <the exact title you started from>`, or `TEMPLATE: none`. That line is stripped before the customer sees it — it exists so the business can see which saved reply you used.\n",
  ].join("\n");
}

// `\s*` rather than `[ \t]*`: a model that opens with a blank line would
// otherwise leave the bookkeeping line in the customer's email.
const TEMPLATE_MARKER = /^\s*\**TEMPLATE:\s*\**[ \t]*(.*?)[ \t]*\**(?:\r?\n|$)/i;

/** Belt and braces: any stray bookkeeping line anywhere in the body. The anchored
 *  marker above only catches it at the very front, so a model that writes
 *  "Hi Jane,\n\nTEMPLATE: Refund policy\n…" — or wraps it in asterisks — used to
 *  mail the business's private saved-reply titles to the customer. */
const STRAY_MARKER = /^[ \t]*\**\s*TEMPLATE:[^\n]*\**[ \t]*$/gim;

/** Pull the bookkeeping line off the front of the reply and resolve it to a real
 *  template row. A model that forgets the line simply reports no template — the
 *  customer's reply is never held hostage to the marker. Exported so this can be
 *  exercised on its own: a miss here puts an internal line in a customer's
 *  inbox. */
export function splitTemplateMarker(
  text: string,
  list: ReplyTemplate[],
): { reply: string; template: { id: string; title: string } | null } {
  const sweep = (s: string) => s.replace(STRAY_MARKER, "").replace(/\n{3,}/g, "\n\n").trim();
  if (list.length === 0) return { reply: sweep(text), template: null };
  const m = TEMPLATE_MARKER.exec(text);
  if (!m) return { reply: sweep(text), template: null };
  const rest = sweep(text.slice(m[0].length));
  // A "reply" that was nothing but the marker is a malformed turn. Returning the
  // original text mailed the internal line `TEMPLATE: Refund policy` to the
  // customer as the entire body of an email from their supplier's own mailbox.
  // Blank is the safe outcome — it is exactly what respondCore's `if (!reply)`
  // guard exists to catch, and every send path treats an empty reply as "say
  // nothing and record why".
  if (!rest) return { reply: "", template: null };
  const claimed = m[1].replace(/^["'“‘*]+|["'”’*]+$/g, "").trim();
  if (!claimed || /^(none|n\/?a|-|null)$/i.test(claimed)) return { reply: rest, template: null };
  const lower = claimed.toLowerCase();
  const hit =
    list.find((t) => t.title.toLowerCase() === lower) ??
    list.find((t) => t.title.length > 2 && lower.includes(t.title.toLowerCase()));
  return { reply: rest, template: hit ? { id: hit.id, title: hit.title } : null };
}

function afterHours(hours: Json): boolean {
  try {
    const now = new Date();
    const day = now.getUTCDay();
    const days: number[] = hours?.days ?? [1, 2, 3, 4, 5];
    if (!days.includes(day)) return true;
    const mins = now.getUTCHours() * 60 + now.getUTCMinutes();
    const [oh, om] = String(hours?.open ?? "09:00").split(":").map(Number);
    const [ch, cm] = String(hours?.close ?? "17:00").split(":").map(Number);
    return mins < oh * 60 + om || mins >= ch * 60 + cm;
  } catch {
    return false;
  }
}

async function resolveConversation(
  admin: SupabaseClient,
  orgId: string,
  channel: string,
  conversationId: string | undefined,
  customer: AgentCtx["customer"],
  isTest = false,
): Promise<{ id: string; contactId: string | null; aiPaused: boolean }> {
  // select("*") rather than named columns: ai_paused arrives via the lazily
  // applied 0107 bootstrap, and a named select of a not-yet-applied column
  // would error → data null → a duplicate conversation per message.
  if (conversationId) {
    const { data } = await admin.from("conversations").select("*").eq("id", conversationId).eq("organization_id", orgId).maybeSingle();
    if (data) return { id: (data as Json).id, contactId: (data as Json).contact_id, aiPaused: (data as Json).ai_paused === true };
  }
  // Email threads by address, for the same reason SMS threads by number: a
  // person writing in twice is one conversation. Without this every inbound
  // email opened a fresh thread, so the agent answered with no history and a
  // per-thread reply ceiling could never fire.
  if (channel === "email" && customer.email) {
    const { data } = await admin
      .from("conversations")
      .select("*")
      .eq("organization_id", orgId)
      .eq("channel_type", "email")
      .eq("customer_email", customer.email)
      .eq("is_test", isTest)
      .neq("status", "closed")
      .order("last_message_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return { id: (data as Json).id, contactId: (data as Json).contact_id, aiPaused: (data as Json).ai_paused === true };
  }
  // SMS/WhatsApp thread by phone — reuse the most recent non-closed thread for
  // this number+channel so a person's texts stay in one conversation.
  if ((channel === "sms" || channel === "whatsapp") && customer.phone) {
    const { data } = await admin
      .from("conversations")
      .select("*")
      .eq("organization_id", orgId)
      .eq("channel_type", channel)
      .eq("customer_phone", customer.phone)
      .eq("is_test", isTest) // sandbox threads never mix with real ones
      .neq("status", "closed")
      .order("last_message_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return { id: (data as Json).id, contactId: (data as Json).contact_id, aiPaused: (data as Json).ai_paused === true };
  }
  // Link to an existing contact (unified memory). app_resolve_contact matches on
  // the contact_identities handle table, falls back to the legacy email/phone
  // columns, and records the handle — so a channel with neither an email nor a
  // phone (a social DM's scoped sender id) resolves to the same person as their
  // calls and emails instead of minting an orphan.
  //
  // A handle we received a message ON is verified: it demonstrably reaches them.
  let contactId: string | null = null;
  const identity: { kind: string; value: string } | null =
    customer.email ? { kind: "email", value: customer.email }
      : customer.phone ? { kind: channel === "whatsapp" ? "whatsapp" : "phone", value: customer.phone }
        : (customer.handle && customer.handleKind) ? { kind: customer.handleKind, value: customer.handle }
          : null;
  if (identity) {
    const { data, error } = await admin.rpc("app_resolve_contact", {
      p_org: orgId,
      p_kind: identity.kind,
      p_value: identity.value,
      p_name: customer.name ?? "",
      p_verified: true,
    });
    if (error) {
      // Never fail an inbound message over identity bookkeeping — the
      // conversation still gets created, just without the cross-channel link.
      console.error("[phoxta] app_resolve_contact failed:", error.message);
    } else {
      contactId = (data as string | null) ?? null;
    }
  }
  // A second handle on the same message (someone who gives both an email and a
  // phone) is attached to the resolved person, so either one finds them later.
  if (contactId && customer.email && customer.phone) {
    await admin.rpc("app_resolve_contact", {
      p_org: orgId,
      p_kind: channel === "whatsapp" ? "whatsapp" : "phone",
      p_value: customer.phone,
      p_name: customer.name ?? "",
      p_verified: channel !== "email",
    }).then(undefined, () => { /* best effort */ });
  }
  const { data: conv } = await admin
    .from("conversations")
    .insert({
      organization_id: orgId,
      channel_type: channel,
      contact_id: contactId,
      customer_name: customer.name ?? "",
      customer_phone: phoneForStorage(customer.phone),
      customer_email: customer.email ?? "",
      is_test: isTest,
    })
    .select("id")
    .single();
  return { id: (conv as Json).id, contactId, aiPaused: false };
}

/** Persist rows onto the thread, loudly. This insert failed SILENTLY for months:
 *  PostgREST rejects a batch whose objects don't share the same key set
 *  (PGRST102 "All object keys must match"), so the agent-row `meta` key made
 *  every customer+agent pair vanish while the conversation still flipped to
 *  "handled". Every row now carries an explicit `meta`, and a failure is at
 *  least visible in the function logs. */
async function insertMessages(admin: SupabaseClient, rows: Json[]): Promise<Json[]> {
  // Nothing to write is a real case now: a transport that filed the customer's
  // message itself, on a turn where the agent chose to say nothing.
  if (rows.length === 0) return [];
  const { data, error } = await admin.from("conversation_messages").insert(rows).select("id, role");
  if (error) {
    console.error("[phoxta] conversation_messages insert failed:", error.message);
    return [];
  }
  return (data as Json[] | null) ?? [];
}

/** The id of the row a transport has to stamp with a delivery status once it has
 *  actually put the reply on the wire. */
const agentRowId = (rows: Json[]): string | null =>
  (rows.find((r) => r?.role === "agent")?.id as string | undefined) ?? null;

/** The customer's own row, so a transport that ends up NOT sending can record
 *  the reason where a human reading the thread will see it. */
const customerRowId = (rows: Json[]): string | null =>
  (rows.find((r) => r?.role === "customer")?.id as string | undefined) ?? null;

/**
 * What the transport already did with the inbound message.
 *
 * A poller like gmail-sync has to write the customer's message BEFORE it decides
 * anything — that row is its dedupe key, it carries the mail's HTML and its
 * threading headers, and it must exist whether or not the agent ends up
 * answering. Without a way to say so, respondCore's own unconditional insert
 * would file every such email twice and feed the model the same text twice
 * (once as history, once as the turn).
 */
export type InboundRecord = {
  /** The caller has already persisted this customer message. */
  recorded?: boolean;
  /**
   * The id of that row.
   *
   * The duplicate-tail test used to be a string comparison between the STORED
   * body and the trimmed text handed to the model — and those never match for an
   * email, because the stored body is the raw mail (CRLF, quoted thread, the
   * agent's own previous reply underneath) while the turn is the trimmed
   * remainder. So the model received the whole message twice, the input was
   * billed twice, and it read its own earlier replies back as customer input:
   * precisely what the trimming exists to prevent. An id cannot mismatch.
   */
  recordedId?: string;
  /** Provider id for the inbound message, when respondCore is doing the insert. */
  providerSid?: string;
  /** Extra meta for that row (subject, html, threading keys). */
  meta?: Json;
};

export type RespondResult = {
  conversationId: string;
  reply: string;
  actions: string[];
  escalated: boolean;
  cards: ProductCard[];
  media: MediaItem[];
  paused?: boolean;
  /** The plan's monthly token allowance is spent: `reply` is a courtesy line, not
   *  an answer, and a transport must NOT send it as a message of its own. */
  capped?: boolean;
  /** The row holding the agent's reply, so a transport can stamp delivery on it. */
  agentMessageId: string | null;
  /** The row holding the customer's message, when respondCore wrote it — where a
   *  transport records why nothing was sent. Null when the caller filed it
   *  itself and already holds the id. */
  customerMessageId: string | null;
  /** Which of the owner's saved replies this answer was adapted from. */
  template: { id: string; title: string } | null;
};

export async function respondCore(
  admin: SupabaseClient,
  org: Org,
  config: AgentConfig,
  params: { channel: string; conversationId?: string; customer: AgentCtx["customer"]; message: string; userId?: string | null; isTest?: boolean; inbound?: InboundRecord },
): Promise<RespondResult> {
  const { id: conversationId, contactId, aiPaused } = await resolveConversation(admin, org.id, params.channel, params.conversationId, params.customer, params.isTest === true);

  // Input guardrail: bound length + flag prompt-injection attempts. Use the
  // sanitized text everywhere downstream (run, history, persistence).
  const inGuard = guardInput(params.message);
  const userText = inGuard.cleaned;

  // Every row in a batch must carry the SAME key set — PostgREST rejects a mixed
  // batch with PGRST102, which is exactly how this transcript silently failed to
  // persist once before. So provider_sid and meta appear on both rows, always.
  const callerRecorded = params.inbound?.recorded === true;
  const customerRow = (meta: Json) => ({
    organization_id: org.id,
    conversation_id: conversationId,
    role: "customer",
    channel_type: params.channel,
    body: userText,
    provider_sid: String(params.inbound?.providerSid ?? ""),
    meta,
  });
  const agentRow = (body: string, meta: Json) => ({
    organization_id: org.id,
    conversation_id: conversationId,
    role: "agent",
    channel_type: params.channel,
    body,
    provider_sid: "",
    meta,
  });

  // ---------------------------------------------------------------------------
  // RECORD THE CUSTOMER'S MESSAGE BEFORE COMPOSING ANYTHING.
  //
  // This insert used to happen only AFTER runAgent returned, together with the
  // agent's reply. anthropic.ts throws on any non-2xx once its retries are spent,
  // and its circuit breaker then fails fast for a minute — so during an Anthropic
  // 429/529 incident every call threw immediately, agent-inbound's outer catch
  // returned 500, and NOTHING had been written. An SMS, a WhatsApp message or a
  // webhook email was simply gone: no Inbox row, no reason, and nothing for
  // agent-catchup to repair, because agent-catchup scans conversation_messages
  // and there was no row to scan. gmail-sync and agent-catchup were immune
  // because they record first; the three publicly reachable channels were not.
  //
  // The row carries the SAME claim stamp claimForReply writes, for the reason
  // claimForReply exists: it now lives on the thread for the whole model turn, so
  // a five-minute catch-up tick landing mid-compose would otherwise see an
  // unanswered customer message and send a second reply. The claim expires after
  // ten minutes, which is how a worker killed mid-turn still gets repaired.
  // ---------------------------------------------------------------------------
  const claimedAt = new Date().toISOString();
  const inboundMeta = (params.inbound?.meta ?? {}) as Json;
  // Only the channels a background worker can deliver on need the claim — those
  // are exactly agent-catchup's CHANNELS. Web chat and voice are synchronous, no
  // worker ever re-answers them, and a claim there would sit on the row for ten
  // minutes telling the Inbox the agent was still composing a reply it long
  // since sent.
  const needsClaim = params.channel === "email" || params.channel === "sms" || params.channel === "whatsapp";
  let ownCustomerRowId: string | null = null;
  if (!callerRecorded) {
    const first = await insertMessages(admin, [customerRow(
      needsClaim
        ? {
          ...inboundMeta,
          auto_reply: {
            answered: false,
            reason: "the agent is composing a reply",
            retryable: true,
            claimed_at: claimedAt,
            at: claimedAt,
          },
        }
        : inboundMeta,
    )]);
    ownCustomerRowId = customerRowId(first);
    // Surface it in the Inbox immediately: if the model then fails, this is the
    // only thing that tells the business a customer wrote in.
    if (ownCustomerRowId) {
      await admin.from("conversations").update({ last_message_at: claimedAt }).eq("id", conversationId);
    }
  }
  // True once the customer's row exists — whether the caller wrote it or we did.
  // A failed insert falls back to the old behaviour (write it with the reply)
  // rather than losing the message twice over.
  const alreadyRecorded = callerRecorded || ownCustomerRowId !== null;
  /** The id to return to a transport: ours when we wrote it, null when the
   *  CALLER wrote it and already holds the id. */
  const ownCustomerId = (batch: Json[] | null): string | null =>
    callerRecorded ? null : (ownCustomerRowId ?? (batch ? customerRowId(batch) : null));

  // Take-over gate: a human owns this thread. Record what the customer said,
  // surface it (unread flag comes from the insert trigger), tell the assignee,
  // and compose NOTHING — the honest silence the "Take over" button promises.
  if (aiPaused) {
    const pausedRows = alreadyRecorded ? [] : await insertMessages(admin, [customerRow(inboundMeta)]);
    await admin.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId);
    const { data: convRow } = await admin.from("conversations").select("assigned_to").eq("id", conversationId).maybeSingle();
    const assignee = (convRow as Json)?.assigned_to as string | null;
    if (assignee) {
      await admin.from("notifications").insert({
        user_id: assignee,
        title: "New message on a conversation you've taken over",
        body: userText.slice(0, 140),
        kind: "info",
        link: `/dashboard/businesses/${org.id}/ops/engage/inbox?c=${conversationId}`,
      });
    }
    // The customer's row id goes back even here: a transport that is about to
    // stay silent still needs somewhere to record WHY, where the person reading
    // the thread will see it.
    return { conversationId, reply: "", actions: [], escalated: false, cards: [], media: [], paused: true, agentMessageId: null, customerMessageId: ownCustomerId(pausedRows), template: null };
  }

  // This conversation's history: the NEWEST turns, re-sorted chronologically.
  // Ascending + limit returned the OPENING of the thread instead — and SMS /
  // WhatsApp threads are reused indefinitely (resolveConversation re-attaches
  // to the newest non-closed thread for a number, and nothing closes them), so
  // a repeat customer's agent was reading a conversation from weeks ago and
  // never what they had just said.
  //
  // Rows written in one batch share created_at (it defaults to the statement's
  // now()), so role breaks the tie: descending, "agent" sorts before
  // "customer", which reverses into the customer-then-agent pair.
  const { data: msgs } = await admin
    .from("conversation_messages")
    .select("id, role, body")
    .eq("organization_id", org.id)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .order("role", { ascending: true })
    .limit(20);
  const rows = ((msgs as { id: string; role: string; body: string }[] | null) ?? []).reverse();
  // When the transport already filed this message, it is ALREADY the last row of
  // that history — and it is about to be sent again as the turn itself. Left in,
  // the model reads the customer's words twice and the API sees two consecutive
  // user turns. Drop it by ROW ID; the old string comparison against the trimmed
  // text never matched for an email and so never fired.
  // Which row of the history IS this turn. Either the caller's (gmail-sync,
  // agent-catchup) or the one written a few lines above — both are already the
  // newest customer row on the thread, and leaving it in would send the model the
  // customer's words twice and produce two consecutive user turns.
  const recordedId = callerRecorded ? String(params.inbound?.recordedId ?? "") : String(ownCustomerRowId ?? "");
  const history = rows
    .filter((m, i) => {
      if (!alreadyRecorded) return true;
      if (recordedId) return m.id !== recordedId;
      // No id given: fall back to the old shape — only ever the tail, only ever
      // a customer turn, and compared on the trimmed form so an email matches.
      return !(i === rows.length - 1 && m.role === "customer" && stripQuotedReply(m.body).trim() === userText.trim());
    })
    .map((m) => ({
      role: (m.role === "customer" ? "user" : "assistant") as "user" | "assistant",
      // Stored email bodies are the RAW mail — every turn of a thread carries the
      // whole thread quoted underneath, including the agent's own previous
      // replies. Feeding that back charges for the conversation again on every
      // message and is an ingredient of a model-side loop.
      content: params.channel === "email" ? stripQuotedReply(m.body) : m.body,
    }));
  // The Messages API requires the first turn to be `user`. An Engage flow that
  // greets and hands off leaves an assistant-only thread (the hook deliberately
  // leaves the customer row to us), and a 20-row window can also open on an
  // agent turn — either way the call would 400 and the customer would get
  // nothing back. Drop the leading assistant turns; the rest stays intact.
  while (history.length && history[0].role === "assistant") history.shift();

  // Cost guardrail: enforce the plan's monthly token allowance. The public
  // endpoint is otherwise unbounded — degrade gracefully without spending.
  const { data: sub } = await admin.from("subscriptions").select("plan, status").eq("organization_id", org.id).maybeSingle();
  // A lapsed subscription must NOT keep its paid allowance: the old expression
  // fell through to `sub.plan` on any non-active status, so a cancelled 'scale'
  // org still drew 5M tokens/month. Non-active now floors to the starter cap.
  const plan = sub?.status === "active" ? (sub?.plan ?? "starter") : "starter";
  const cap = MONTHLY_TOKEN_CAP[plan] ?? MONTHLY_TOKEN_CAP.starter;
  if ((await tokensUsedThisMonth(admin, org.id)) >= cap) {
    const capped = "Thanks for reaching out! I can't continue the conversation right now, but I've noted your message and a member of the team will follow up with you shortly.";
    // Every row carries `meta` — PostgREST rejects mixed-key batches (PGRST102).
    const rows = await insertMessages(
      admin,
      alreadyRecorded ? [agentRow(capped, { capped: true })] : [customerRow(inboundMeta), agentRow(capped, { capped: true })],
    );
    await admin.from("conversations").update({ last_message_at: new Date().toISOString(), status: "escalated" }).eq("id", conversationId);
    // `capped: true` is what lets a transport tell this courtesy line apart from
    // a real answer. Mailing it to every customer once the allowance runs out
    // would turn a spend ceiling into an outbound campaign.
    return { conversationId, reply: capped, actions: ["Usage cap reached — flagged for follow-up"], escalated: true, cards: [], media: [], capped: true, agentMessageId: agentRowId(rows), customerMessageId: ownCustomerId(rows), template: null };
  }

  // Unified memory: summaries of this customer's other conversations.
  let memory = "";
  if (contactId) {
    const { data: prior } = await admin
      .from("conversations")
      .select("summary, channel_type")
      .eq("organization_id", org.id)
      .eq("contact_id", contactId)
      .neq("id", conversationId)
      .not("summary", "is", null)
      .order("last_message_at", { ascending: false })
      .limit(3);
    memory = ((prior as { summary: string; channel_type: string }[] | null) ?? [])
      .filter((p) => p.summary)
      .map((p) => `(${p.channel_type}) ${p.summary}`)
      .join("\n");
  }

  // Durable, structured long-term memory for this customer (preferences/facts
  // that persist across conversations and channels — the "memory bank").
  const longMem = await loadCustomerMemory(admin, org.id, contactId);

  const isAfterHours = config.capabilities?.after_hours !== false && afterHours(config.business_hours);
  const caps = Object.entries(config.capabilities ?? {}).filter(([, v]) => v).map(([k]) => k).join(", ");

  // Vertical-aware booking model + capability-gated tool surface: a business
  // with leads/bookings/tickets switched off simply doesn't expose those write
  // tools (missing keys default to enabled for back-compat).
  const bookingMode = resolveBookingMode(org.vertical);
  const capOn = (k: string) => config.capabilities?.[k] !== false;
  const tools = buildAgentTools(bookingMode, config.capabilities);
  const actVerbs = [
    capOn("bookings")
      ? bookingMode === "reservations"
        ? "check real availability and create reservations"
        : bookingMode === "table"
          ? "take table reservation requests (the restaurant confirms them)"
          : "check availability and book/reschedule appointments"
      : "",
    capOn("leads") ? "capture and qualify leads" : "",
    capOn("tickets") ? "open tickets" : "",
    "recommend products for upsell, route callers to the right location by ZIP, schedule callbacks, and escalate to a human when needed",
  ].filter(Boolean).join(", ");

  // Owner-authored plain-English operating procedures (the AOP pattern):
  // injected as HARD rules the agent must follow over its own judgment.
  const procedures = String((config as { procedures?: string }).procedures ?? "").trim();

  // The owner's saved replies for this channel, ranked against what was asked.
  const templates = await loadTemplates(admin, org.id, params.channel, params.customer.name ?? "", org.name, userText);

  // WHAT SHOWING A PICTURE ACTUALLY COSTS ON THIS CHANNEL.
  //
  // The tools are the same everywhere; what happens to the file is not. On
  // WhatsApp and in web chat the picture travels with the message. On SMS it
  // becomes a link, because MMS is a US/Canada-only product on Twilio — and a
  // link adds segments a business pays for, so the model is told rather than
  // left to guess. On a phone call there is nothing to look at at all.
  const pictureNote = !picturesEnabled(config.capabilities)
    ? ""
    : params.channel === "voice"
      ? "\nYou are on a phone call: the customer cannot see anything. Never offer to show them a picture — describe it, or offer to text it to them.\n"
      : params.channel === "whatsapp" || params.channel === "web"
        ? "\nYou can SHOW this customer a picture from the business's own library — a product photograph, a menu, a price list, a design it made. Call find_picture, then attach_picture with the one that genuinely answers the question. It travels with your reply, so refer to it naturally and never paste its link. A picture that only roughly fits is worse than none: answer in words instead.\n"
        : params.channel === "sms"
          ? "\nYou can show this customer a picture from the business's own library with find_picture and attach_picture. On a text message it arrives as a link they tap, and every link costs the business extra message segments — so only attach one when the picture IS the answer.\n"
          : "\nYou can show this customer a picture from the business's own library with find_picture and attach_picture. On email it arrives as a link in the message. Only attach one when the picture genuinely answers the question.\n";

  const system = [
    `You are ${config.display_name}, the AI agent for "${org.name}" (${org.vertical || "small business"}). Persona: ${config.persona} Tone: ${config.tone}.`,
    procedures
      ? `\nOPERATING PROCEDURES (set by the owner — these override everything else; follow them exactly):\n${procedures}\n`
      : "",
    `You are reached on the ${params.channel} channel. You are ONE agent across every channel — greet returning customers by what you already know.`,
    longMem ? `\nDurable profile for this customer (remember and use this):\n${longMem}\n` : "",
    memory ? `\nRecent context from other conversations:\n${memory}\n` : "",
    inGuard.injection ? INJECTION_GUARD_NOTE : "",
    `Enabled capabilities: ${caps}.`,
    `Use your tools to ACT, not just talk: ${actVerbs}.`,
    "NEVER invent availability, times, prices or confirmations — only state what a tool actually returned, and if a tool says something isn't configured or available, tell the customer honestly and offer a follow-up instead.",
    isAfterHours
      ? "It is currently OUTSIDE business hours — still help fully, capture the lead, book if possible, and offer a callback; never send anyone to voicemail."
      : "It is within business hours.",
    `Escalate to a human for: ${(config.escalation?.on_intents ?? []).join(", ") || "complaints, refunds, anything you cannot resolve"}.`,
    "Always look up real business data with the read tools before stating facts. Be concise, warm and helpful. Respond only with your reply to the customer.",
    pictureNote,
    templateBlock(templates),
  ].join(" ");

  const ctx: AgentCtx = { conversationId, customer: params.customer, contactId, locationId: null, channel: params.channel, actions: [] };
  const model = modelFor(config.model_tier ?? "balanced");
  const t0 = Date.now();
  const run = await runAgent({
    model,
    system,
    userMessage: userText,
    history,
    tools,
    toolRunner: agentToolRunner(admin, org.id, ctx, bookingMode),
    maxTurns: 8,
    maxTokens: 1024,
  });
  const latency = Date.now() - t0;

  // The template bookkeeping line comes off BEFORE the output guard, so the
  // guard's length cap measures what the customer will actually read.
  const marked = splitTemplateMarker(run.text || "", templates);

  // A turn whose ENTIRE content was the internal bookkeeping line leaves nothing
  // to say. The old fallback line would have been mailed as a real answer; worse,
  // before that, the marker itself was. Say nothing, record nothing as the
  // agent's word, and let the transport file "the agent composed no reply" —
  // which is retryable, so the customer is picked up again rather than lost.
  const markerOnly = (run.text ?? "").trim().length > 0 && !marked.reply.trim();
  const draft = marked.reply.trim()
    ? marked.reply
    : markerOnly
      ? ""
      : "Thanks — let me get a teammate to follow up with you.";

  // Output guardrail: redact any leaked secrets/cards + flag system-prompt leaks
  // before the reply ever leaves the building.
  const out = draft ? guardOutput(draft) : { cleaned: "", flags: [] as string[] };
  const reply = out.cleaned;
  const escalated = ctx.actions.some((a) => a.toLowerCase().includes("escalat"));

  // Every row carries `meta` — PostgREST rejects mixed-key batches (PGRST102),
  // which is exactly how this transcript silently failed to persist before.
  const written = await insertMessages(
    admin,
    [
      ...(alreadyRecorded ? [] : [customerRow(inboundMeta)]),
      // No empty bubble in the Inbox, and no agent row for agent-catchup to read
      // as "this was answered" when nothing was said.
      ...(reply
        ? [agentRow(reply, {
          actions: ctx.actions,
          tools: run.toolCalls,
          // Which saved reply this was adapted from — the answer to "why does the
          // agent's reply look like that?", visible on the message itself.
          template: marked.template,
          templates_offered: templates.length,
          // The picture the agent chose, and WHY. Written here so a web-chat
          // thread shows it in the Inbox too — the texting channels overwrite
          // this a moment later with what actually reached the wire, which can
          // be a link rather than an attachment (see deliverAutoReply).
          ...((ctx.media ?? []).length
            ? { media: ctx.media, picture_reason: ctx.pictureReason ?? "" }
            : {}),
          guardrails: { input_injection: inGuard.injection, output_flags: out.flags },
        })]
        : []),
    ],
  );
  await admin
    .from("conversations")
    .update({
      last_message_at: new Date().toISOString(),
      // "Handled" is a claim that somebody dealt with this. A turn where the
      // agent said nothing has not dealt with anything, and marking it handled
      // would hide the message from the very people who need to see it.
      ...(reply ? { status: escalated ? "escalated" : "handled" } : {}),
      contact_id: ctx.contactId ?? contactId,
    })
    .eq("id", conversationId);
  // First-response time (FRT/SLA): stamp once, on the first reply to the customer
  // — and only when there actually was one.
  if (reply) {
    await admin.from("conversations").update({ first_response_at: new Date().toISOString() }).eq("id", conversationId).is("first_response_at", null);
  }

  if (params.channel === "voice") {
    await admin.from("call_logs").insert({
      organization_id: org.id,
      conversation_id: conversationId,
      location_id: ctx.locationId,
      direction: "inbound",
      from_number: params.customer.phone ?? "",
      after_hours: isAfterHours,
      outcome: escalated ? "escalated" : ctx.actions.some((a) => a.startsWith("Booked")) ? "booked" : "completed",
    });
  }

  await meter(admin, { organizationId: org.id, userId: params.userId, conversationId, model: run.model, feature: "agent", tier: config.model_tier ?? "balanced", inTok: run.inTok, outTok: run.outTok, cacheWriteTok: run.cacheWriteTok, cacheReadTok: run.cacheReadTok, latencyMs: latency });

  // cards/media: rich results the agent's tools surfaced this turn, so a chat
  // UI can render real cards and inline images. Text-only channels simply
  // ignore both fields.
  return {
    conversationId,
    reply,
    actions: ctx.actions,
    escalated,
    cards: ctx.cards ?? [],
    media: ctx.media ?? [],
    agentMessageId: agentRowId(written),
    customerMessageId: ownCustomerId(written),
    template: marked.template,
  };
}

/**
 * File an inbound message WITHOUT composing anything.
 *
 * A transport that has decided this message must not be answered — a bounce, an
 * out-of-office, a mailing list — still owes the business the message itself.
 * Dropping it would be worse than answering it: the Inbox would quietly lose
 * mail. This puts it on the thread, with the reason it was not answered stored
 * beside it, and spends nothing.
 */
export async function recordInboundOnly(
  admin: SupabaseClient,
  org: Org,
  params: {
    channel: string;
    conversationId?: string;
    customer: AgentCtx["customer"];
    message: string;
    isTest?: boolean;
    providerSid?: string;
    meta?: Json;
    reason: string;
    /**
     * Whether this message still deserves an answer later.
     *
     * Only a DEFINITIVE signal settles it forever — a bounce, a mailing list,
     * our own address. A heuristic (an unattended-looking local part, an
     * out-of-office-shaped subject) is a judgement that is sometimes wrong, and
     * a wrong one used to bury a real customer permanently: agent-catchup skips
     * `retryable:false` on every future run, dry runs included.
     */
    retryable?: boolean;
    /**
     * File it AND claim it, because the caller is about to compose an answer in
     * the background.
     *
     * twilio-inbound answers Twilio inside its webhook deadline and then does
     * the model turn afterwards, so the customer's message has to be on the
     * thread BEFORE the compose starts — otherwise a function killed mid-turn
     * loses the message entirely. The claim is the same stamp claimForReply
     * writes, and it is what stops agent-catchup answering the same message
     * while that background turn is still running. It expires after ten minutes,
     * which is how a worker killed mid-turn still gets repaired.
     */
    claim?: boolean;
  },
): Promise<{ conversationId: string; messageId: string | null }> {
  const { id: conversationId } = await resolveConversation(admin, org.id, params.channel, params.conversationId, params.customer, params.isTest === true);
  const now = new Date().toISOString();
  const written = await insertMessages(admin, [{
    organization_id: org.id,
    conversation_id: conversationId,
    role: "customer",
    channel_type: params.channel,
    body: guardInput(params.message).cleaned,
    provider_sid: String(params.providerSid ?? ""),
    meta: {
      ...((params.meta ?? {}) as Json),
      auto_reply: {
        answered: false,
        reason: params.reason,
        retryable: params.retryable === true,
        at: now,
        ...(params.claim === true ? { claimed_at: now } : {}),
      },
    },
  }]);
  await admin.from("conversations").update({ last_message_at: now }).eq("id", conversationId);
  return { conversationId, messageId: customerRowId(written) };
}

/** Refresh a conversation's rolling summary (memory + reporting). */
export async function summarizeConversation(admin: SupabaseClient, org: Org, conversationId: string): Promise<void> {
  const { data: msgs } = await admin
    .from("conversation_messages")
    .select("role, body")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(40);
  const transcript = ((msgs as { role: string; body: string }[] | null) ?? []).map((m) => `${m.role}: ${m.body}`).join("\n");
  if (!transcript) return;
  const t0 = Date.now();
  const r = await callMessages({
    model: modelFor("cheap"),
    system: `Summarise this customer conversation for "${org.name}" in 1-2 sentences capturing who the customer is, what they wanted, and the outcome. Plain text only.`,
    messages: [{ role: "user", content: transcript }],
    maxTokens: 200,
  });
  await admin.from("conversations").update({ summary: r.text }).eq("id", conversationId);
  await meter(admin, { organizationId: org.id, model: r.model, feature: "agent_summary", tier: "cheap", inTok: r.inTok, outTok: r.outTok, cacheWriteTok: r.cacheWriteTok, cacheReadTok: r.cacheReadTok, latencyMs: Date.now() - t0 });

  // Capture durable per-customer memory from the same transcript (background).
  const { data: conv } = await admin.from("conversations").select("contact_id").eq("id", conversationId).maybeSingle();
  const contactId = (conv as { contact_id: string | null } | null)?.contact_id ?? null;
  if (contactId) await extractCustomerMemory(admin, org.id, org.name, contactId, transcript);
}
