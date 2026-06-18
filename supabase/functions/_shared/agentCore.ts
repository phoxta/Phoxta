// Phoxta — the one agent's core turn logic, shared by the authenticated function
// (ai-agent) and the public endpoint (agent-inbound). Resolves the conversation,
// loads unified cross-channel memory, runs the tool-using agent, persists, meters.
import { runAgent, callMessages } from "./anthropic.ts";
import { modelFor, type Tier } from "./models.ts";
import { AGENT_TOOLS, agentToolRunner, type AgentCtx } from "./agentTools.ts";
import { meter, tokensUsedThisMonth, MONTHLY_TOKEN_CAP } from "./meter.ts";
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
): Promise<{ id: string; contactId: string | null }> {
  if (conversationId) {
    const { data } = await admin.from("conversations").select("id, contact_id").eq("id", conversationId).eq("organization_id", orgId).maybeSingle();
    if (data) return { id: (data as Json).id, contactId: (data as Json).contact_id };
  }
  // SMS/WhatsApp thread by phone — reuse the most recent non-closed thread for
  // this number+channel so a person's texts stay in one conversation.
  if ((channel === "sms" || channel === "whatsapp") && customer.phone) {
    const { data } = await admin
      .from("conversations")
      .select("id, contact_id")
      .eq("organization_id", orgId)
      .eq("channel_type", channel)
      .eq("customer_phone", customer.phone)
      .neq("status", "closed")
      .order("last_message_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return { id: (data as Json).id, contactId: (data as Json).contact_id };
  }
  // Link to an existing contact (unified memory) by email then phone.
  let contactId: string | null = null;
  if (customer.email) {
    const { data } = await admin.from("crm_contacts").select("id").eq("organization_id", orgId).eq("email", customer.email).maybeSingle();
    contactId = (data as Json)?.id ?? null;
  }
  if (!contactId && customer.phone) {
    const { data } = await admin.from("crm_contacts").select("id").eq("organization_id", orgId).eq("phone", customer.phone).maybeSingle();
    contactId = (data as Json)?.id ?? null;
  }
  const { data: conv } = await admin
    .from("conversations")
    .insert({
      organization_id: orgId,
      channel_type: channel,
      contact_id: contactId,
      customer_name: customer.name ?? "",
      customer_phone: customer.phone ?? "",
      customer_email: customer.email ?? "",
    })
    .select("id")
    .single();
  return { id: (conv as Json).id, contactId };
}

export async function respondCore(
  admin: SupabaseClient,
  org: Org,
  config: AgentConfig,
  params: { channel: string; conversationId?: string; customer: AgentCtx["customer"]; message: string; userId?: string | null },
): Promise<{ conversationId: string; reply: string; actions: string[]; escalated: boolean }> {
  const { id: conversationId, contactId } = await resolveConversation(admin, org.id, params.channel, params.conversationId, params.customer);

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
  const plan = sub?.status === "active" ? (sub?.plan ?? "starter") : (sub?.plan ?? "trialing");
  const cap = MONTHLY_TOKEN_CAP[plan] ?? MONTHLY_TOKEN_CAP.starter;
  if ((await tokensUsedThisMonth(admin, org.id)) >= cap) {
    const capped = "Thanks for reaching out! I can't continue the conversation right now, but I've noted your message and a member of the team will follow up with you shortly.";
    await admin.from("conversation_messages").insert([
      { organization_id: org.id, conversation_id: conversationId, role: "customer", channel_type: params.channel, body: params.message },
      { organization_id: org.id, conversation_id: conversationId, role: "agent", channel_type: params.channel, body: capped, meta: { capped: true } },
    ]);
    await admin.from("conversations").update({ last_message_at: new Date().toISOString(), status: "escalated" }).eq("id", conversationId);
    return { conversationId, reply: capped, actions: ["Usage cap reached — flagged for follow-up"], escalated: true };
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

  const isAfterHours = config.capabilities?.after_hours !== false && afterHours(config.business_hours);
  const caps = Object.entries(config.capabilities ?? {}).filter(([, v]) => v).map(([k]) => k).join(", ");

  const system = [
    `You are ${config.display_name}, the AI agent for "${org.name}" (${org.vertical || "small business"}). Persona: ${config.persona} Tone: ${config.tone}.`,
    `You are reached on the ${params.channel} channel. You are ONE agent across every channel — greet returning customers by what you already know.`,
    memory ? `\nWhat you know about this customer:\n${memory}\n` : "",
    `Enabled capabilities: ${caps}.`,
    "Use your tools to ACT, not just talk: check availability and book/reschedule appointments, capture and qualify leads, open tickets, recommend products for upsell, route callers to the right location by ZIP, schedule callbacks, and escalate to a human when needed.",
    isAfterHours
      ? "It is currently OUTSIDE business hours — still help fully, capture the lead, book if possible, and offer a callback; never send anyone to voicemail."
      : "It is within business hours.",
    `Escalate to a human for: ${(config.escalation?.on_intents ?? []).join(", ") || "complaints, refunds, anything you cannot resolve"}.`,
    "Always look up real business data with the read tools before stating facts. Be concise, warm and helpful. Respond only with your reply to the customer.",
  ].join(" ");

  const ctx: AgentCtx = { conversationId, customer: params.customer, contactId, locationId: null, actions: [] };
  const model = modelFor(config.model_tier ?? "balanced");
  const t0 = Date.now();
  const run = await runAgent({
    model,
    system,
    userMessage: params.message,
    history,
    tools: AGENT_TOOLS,
    toolRunner: agentToolRunner(admin, org.id, ctx),
    maxTurns: 8,
    maxTokens: 1024,
  });
  const latency = Date.now() - t0;

  const reply = run.text || "Thanks — let me get a teammate to follow up with you.";
  const escalated = ctx.actions.some((a) => a.toLowerCase().includes("escalat"));

  await admin.from("conversation_messages").insert([
    { organization_id: org.id, conversation_id: conversationId, role: "customer", channel_type: params.channel, body: params.message },
    { organization_id: org.id, conversation_id: conversationId, role: "agent", channel_type: params.channel, body: reply, meta: { actions: ctx.actions, tools: run.toolCalls } },
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

  await meter(admin, { organizationId: org.id, userId: params.userId, conversationId, model: run.model, feature: "agent", tier: config.model_tier ?? "balanced", inTok: run.inTok, outTok: run.outTok, latencyMs: latency });

  return { conversationId, reply, actions: ctx.actions, escalated };
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
  await meter(admin, { organizationId: org.id, model: r.model, feature: "agent_summary", tier: "cheap", inTok: r.inTok, outTok: r.outTok, latencyMs: Date.now() - t0 });
}
