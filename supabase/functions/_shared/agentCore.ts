// Phoxta — the one agent's core turn logic, shared by the authenticated function
// (ai-agent) and the public endpoint (agent-inbound). Resolves the conversation,
// loads unified cross-channel memory, runs the tool-using agent, persists, meters.
import { runAgent, callMessages } from "./anthropic.ts";
import { modelFor, type Tier } from "./models.ts";
import { buildAgentTools, agentToolRunner, resolveBookingMode, type AgentCtx, type ProductCard } from "./agentTools.ts";
import { meter, tokensUsedThisMonth, MONTHLY_TOKEN_CAP } from "./meter.ts";
import { guardInput, guardOutput, INJECTION_GUARD_NOTE } from "./guardrails.ts";
import { loadCustomerMemory, extractCustomerMemory } from "./memory.ts";
import { phoneForStorage } from "./telephony.ts";
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
async function insertMessages(admin: SupabaseClient, rows: Json[]): Promise<void> {
  const { error } = await admin.from("conversation_messages").insert(rows);
  if (error) console.error("[phoxta] conversation_messages insert failed:", error.message);
}

export async function respondCore(
  admin: SupabaseClient,
  org: Org,
  config: AgentConfig,
  params: { channel: string; conversationId?: string; customer: AgentCtx["customer"]; message: string; userId?: string | null; isTest?: boolean },
): Promise<{ conversationId: string; reply: string; actions: string[]; escalated: boolean; cards: ProductCard[]; paused?: boolean }> {
  const { id: conversationId, contactId, aiPaused } = await resolveConversation(admin, org.id, params.channel, params.conversationId, params.customer, params.isTest === true);

  // Input guardrail: bound length + flag prompt-injection attempts. Use the
  // sanitized text everywhere downstream (run, history, persistence).
  const inGuard = guardInput(params.message);
  const userText = inGuard.cleaned;

  // Take-over gate: a human owns this thread. Record what the customer said,
  // surface it (unread flag comes from the insert trigger), tell the assignee,
  // and compose NOTHING — the honest silence the "Take over" button promises.
  if (aiPaused) {
    await insertMessages(admin, [
      { organization_id: org.id, conversation_id: conversationId, role: "customer", channel_type: params.channel, body: userText, meta: {} },
    ]);
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
    return { conversationId, reply: "", actions: [], escalated: false, cards: [], paused: true };
  }

  // This conversation's history.
  const { data: msgs } = await admin
    .from("conversation_messages")
    .select("role, body")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(20);
  const history = ((msgs as { role: string; body: string }[] | null) ?? []).map((m) => ({
    role: (m.role === "customer" ? "user" : "assistant") as "user" | "assistant",
    content: m.body,
  }));

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
    await insertMessages(admin, [
      { organization_id: org.id, conversation_id: conversationId, role: "customer", channel_type: params.channel, body: userText, meta: {} },
      { organization_id: org.id, conversation_id: conversationId, role: "agent", channel_type: params.channel, body: capped, meta: { capped: true } },
    ]);
    await admin.from("conversations").update({ last_message_at: new Date().toISOString(), status: "escalated" }).eq("id", conversationId);
    return { conversationId, reply: capped, actions: ["Usage cap reached — flagged for follow-up"], escalated: true, cards: [] };
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

  // Output guardrail: redact any leaked secrets/cards + flag system-prompt leaks
  // before the reply ever leaves the building.
  const out = guardOutput(run.text || "Thanks — let me get a teammate to follow up with you.");
  const reply = out.cleaned;
  const escalated = ctx.actions.some((a) => a.toLowerCase().includes("escalat"));

  // Every row carries `meta` — PostgREST rejects mixed-key batches (PGRST102),
  // which is exactly how this transcript silently failed to persist before.
  await insertMessages(admin, [
    { organization_id: org.id, conversation_id: conversationId, role: "customer", channel_type: params.channel, body: userText, meta: {} },
    { organization_id: org.id, conversation_id: conversationId, role: "agent", channel_type: params.channel, body: reply, meta: { actions: ctx.actions, tools: run.toolCalls, guardrails: { input_injection: inGuard.injection, output_flags: out.flags } } },
  ]);
  await admin
    .from("conversations")
    .update({ last_message_at: new Date().toISOString(), status: escalated ? "escalated" : "handled", contact_id: ctx.contactId ?? contactId })
    .eq("id", conversationId);
  // First-response time (FRT/SLA): stamp once, on the first reply to the customer.
  await admin.from("conversations").update({ first_response_at: new Date().toISOString() }).eq("id", conversationId).is("first_response_at", null);

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

  // cards: products the agent surfaced this turn, so a chat UI can render them
  // as real cards. Text-only channels simply ignore the field.
  return { conversationId, reply, actions: ctx.actions, escalated, cards: ctx.cards ?? [] };
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
