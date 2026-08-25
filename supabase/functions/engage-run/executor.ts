// Phoxta — Engage graph executor. Walks a flow/journey graph node by node and
// persists the run's position. Shared by:
//   • agent-inbound  — flows on inbound messages (engageHandleInbound below);
//     sends are BUFFERED and ride the same channel reply the AI would use.
//   • engage-run     — cron: timer wakes + journey starts; sends go out via the
//     same outbound mechanics campaign-run uses (email first, else SMS).
//
// Node semantics (see the shared contract in the Engage editor):
//   trigger_*        step over (a run starts parked ON its trigger node)
//   send_message     deliver text (+subject for email), continue
//   buttons          deliver text + numbered options, park waiting for a reply;
//                    the reply routes by number or label/value substring via the
//                    edge whose sourceHandle equals the option's value, falling
//                    back to the 'else' handle; no match and no 'else' → re-prompt
//   condition        route via 'yes'/'no' handles
//   collect_input    deliver prompt, park; the reply is stored on the contact
//                    (email/phone/name → real columns, else attributes jsonb)
//   set_tag          append to crm_contacts.tags (touches updated_at, which is
//                    exactly what the contact_tagged journey poller watches)
//   delay            park with wake_at = now + minutes (cron wakes it)
//   handoff_ai       exit the run; the caller falls through to the normal AI path
//   handoff_human    mimic the agent's escalate_to_human tool: conversation →
//                    'escalated' + notify every owner/admin; exit; no auto-reply
//   end              done
import { type SupabaseClient } from "../_shared/supabaseAdmin.ts";
import { sendEmail, twilioSend } from "../_shared/dispatch.ts";
import { phoneForStorage } from "../_shared/telephony.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

const MAX_STEPS = 25; // per advance — a cycle in the graph can't spin forever

// ── graph helpers ────────────────────────────────────────────────────────────

type Node = { id: string; type: string; data?: Json };
type Edge = { id?: string; source: string; sourceHandle?: string | null; target: string };

function nodeMap(graph: Json): Map<string, Node> {
  const m = new Map<string, Node>();
  for (const n of ((graph?.nodes ?? []) as Node[])) if (n && n.id) m.set(n.id, n);
  return m;
}

/** Outgoing edge target. With a handle, only that handle matches; without one,
 *  prefer the un-handled edge, else the first edge (a lone handled edge still
 *  lets a linear flow continue). */
function nextTarget(graph: Json, nodeId: string, handle?: string): string | null {
  const edges = ((graph?.edges ?? []) as Edge[]).filter((e) => e && e.source === nodeId);
  if (handle !== undefined) {
    const hit = edges.find((e) => String(e.sourceHandle ?? "") === handle);
    return hit ? hit.target : null;
  }
  const plain = edges.find((e) => !e.sourceHandle);
  return (plain ?? edges[0])?.target ?? null;
}

type ButtonOption = { label?: string; value?: string };

function renderButtons(data: Json): string {
  const options = (Array.isArray(data?.options) ? data.options : []) as ButtonOption[];
  const lines = options.map((o, i) => `${i + 1}. ${String(o?.label ?? o?.value ?? "")}`);
  return [String(data?.text ?? ""), ...lines].filter(Boolean).join("\n");
}

/** Match a reply to an option by number, then by label/value substring. */
function matchOption(data: Json, reply: string): ButtonOption | null {
  const options = (Array.isArray(data?.options) ? data.options : []) as ButtonOption[];
  const t = String(reply ?? "").trim().toLowerCase();
  if (!t || options.length === 0) return null;
  const n = Number(t);
  if (Number.isInteger(n) && n >= 1 && n <= options.length) return options[n - 1];
  for (const o of options) {
    for (const cand of [String(o?.label ?? ""), String(o?.value ?? "")]) {
      const c = cand.trim().toLowerCase();
      if (!c) continue;
      if (t.includes(c) || (t.length >= 2 && c.includes(t))) return o;
    }
  }
  return null;
}

/** Off-hours check. Uses the same shape agentCore.afterHours reads (UTC) when
 *  business hours are configured; without config we assume a quiet-hours
 *  window of 22:00–07:00 UTC (the honest default for "off hours"). */
export function isOffHours(hours: Json): boolean {
  try {
    const now = new Date();
    if (hours && (hours.open || hours.close || hours.days)) {
      const days: number[] = hours?.days ?? [1, 2, 3, 4, 5];
      if (!days.includes(now.getUTCDay())) return true;
      const mins = now.getUTCHours() * 60 + now.getUTCMinutes();
      const [oh, om] = String(hours?.open ?? "09:00").split(":").map(Number);
      const [ch, cm] = String(hours?.close ?? "17:00").split(":").map(Number);
      return mins < oh * 60 + om || mins >= ch * 60 + cm;
    }
    // No configured hours → 22:00–07:00 UTC fallback.
    const h = now.getUTCHours();
    return h >= 22 || h < 7;
  } catch {
    return false;
  }
}

// ── attribution ──────────────────────────────────────────────────────────────

export async function stampTouch(
  admin: SupabaseClient,
  row: { organization_id: string; flow_id: string; run_id: string; contact_id?: string | null; conversation_id?: string | null; channel?: string },
): Promise<void> {
  try {
    await admin.from("engage_touches").insert({ kind: "send", ...row });
  } catch (_) { /* attribution must never fail a send */ }
}

// ── execution context ────────────────────────────────────────────────────────

export type ExecCtx = {
  admin: SupabaseClient;
  orgId: string;
  flow: Json; // engage_flows row (id, name, graph)
  run: Json; //  engage_runs row
  contact: Json | null; //      crm_contacts row
  conversation: Json | null; // conversations row (flow mode)
  inboundText?: string;
  mode: "flow" | "journey";
  /** Deliver one message. Returns false when honestly skipped (no reachable
   *  channel / failed) — the caller then stamps NO touch for it. */
  deliver: (text: string, subject?: string) => Promise<boolean>;
};

export type AdvanceResult = { status: "waiting" | "done" | "exited"; fallToAi: boolean; escalated: boolean };

// ── node side effects ────────────────────────────────────────────────────────

async function addTag(ctx: ExecCtx, tag: string): Promise<void> {
  if (!tag) return;
  const contactId = ctx.run?.contact_id ?? ctx.contact?.id ?? null;
  if (!contactId) return; // honestly nothing to tag
  const { data } = await ctx.admin.from("crm_contacts").select("tags").eq("id", contactId).maybeSingle();
  const tags: string[] = Array.isArray((data as Json)?.tags) ? (data as Json).tags : [];
  if (tags.some((t) => t.toLowerCase() === tag.toLowerCase())) return;
  await ctx.admin.from("crm_contacts").update({ tags: [...tags, tag] }).eq("id", contactId);
  if (ctx.contact) ctx.contact.tags = [...tags, tag];
}

async function storeAttribute(ctx: ExecCtx, attribute: string, value: string, state: Json): Promise<void> {
  const attr = attribute.trim();
  const val = value.trim();
  state.captured = { ...(state.captured ?? {}), ...(attr ? { [attr]: val } : {}) };
  if (!attr || !val) return;

  let contactId: string | null = ctx.run?.contact_id ?? ctx.contact?.id ?? null;
  // A captured email/phone can mint/link the contact through the same identity
  // RPC inbound resolution uses (agentCore.resolveConversation).
  if (!contactId && (attr === "email" || attr === "phone")) {
    try {
      const { data, error } = await ctx.admin.rpc("app_resolve_contact", {
        p_org: ctx.orgId,
        p_kind: attr,
        p_value: val,
        p_name: ctx.conversation?.customer_name ?? "",
        p_verified: false, // typed in, not received on — unverified until it is
      });
      if (!error) contactId = (data as string | null) ?? null;
    } catch (_) { /* identity bookkeeping must not break the flow */ }
    if (contactId) {
      ctx.run.contact_id = contactId;
      await ctx.admin.from("engage_runs").update({ contact_id: contactId }).eq("id", ctx.run.id);
      if (ctx.conversation) {
        await ctx.admin.from("conversations").update({ contact_id: contactId }).eq("id", ctx.conversation.id);
      }
    }
  }
  if (!contactId) return; // no contact → the capture lives in run.state only

  if (attr === "email") {
    await ctx.admin.from("crm_contacts").update({ email: val }).eq("id", contactId);
    if (ctx.conversation) await ctx.admin.from("conversations").update({ customer_email: val }).eq("id", ctx.conversation.id);
  } else if (attr === "phone") {
    const stored = phoneForStorage(val);
    await ctx.admin.from("crm_contacts").update({ phone: stored }).eq("id", contactId);
    if (ctx.conversation) await ctx.admin.from("conversations").update({ customer_phone: stored }).eq("id", ctx.conversation.id);
  } else if (attr === "name") {
    await ctx.admin.from("crm_contacts").update({ name: val }).eq("id", contactId);
    if (ctx.conversation) await ctx.admin.from("conversations").update({ customer_name: val }).eq("id", ctx.conversation.id);
  } else {
    // Arbitrary attribute → the jsonb bag added by the engage schema.
    const { data } = await ctx.admin.from("crm_contacts").select("attributes").eq("id", contactId).maybeSingle();
    const attrs = ((data as Json)?.attributes && typeof (data as Json).attributes === "object") ? (data as Json).attributes : {};
    await ctx.admin.from("crm_contacts").update({ attributes: { ...attrs, [attr]: val } }).eq("id", contactId);
  }
}

function evalCondition(ctx: ExecCtx, d: Json): boolean {
  const op = String(d?.op ?? "equals");
  const value = String(d?.value ?? "").toLowerCase();
  const tags: string[] = Array.isArray(ctx.contact?.tags) ? ctx.contact!.tags : [];
  if (op === "has_tag") return tags.some((t) => t.toLowerCase() === value);
  if (op === "not_has_tag") return !tags.some((t) => t.toLowerCase() === value);
  const field = String(d?.field ?? "");
  const known: Record<string, unknown> = {
    message: ctx.inboundText ?? "",
    channel: ctx.conversation?.channel_type ?? "",
    intent: ctx.conversation?.intent ?? "",
    sentiment: ctx.conversation?.sentiment ?? "",
    name: ctx.contact?.name ?? ctx.conversation?.customer_name ?? "",
    email: ctx.contact?.email ?? ctx.conversation?.customer_email ?? "",
    phone: ctx.contact?.phone ?? ctx.conversation?.customer_phone ?? "",
    stage: ctx.contact?.stage ?? "",
    company: ctx.contact?.company ?? "",
  };
  let v = known[field];
  if (v === undefined) v = (ctx.contact?.attributes ?? {})[field] ?? "";
  const s = String(v ?? "").toLowerCase();
  return op === "contains" ? s.includes(value) : s === value;
}

/** Mimic the agent's escalate_to_human tool (agentTools.ts): conversation →
 *  'escalated', notify every owner/admin with a deep link into the inbox. */
async function escalateToHuman(ctx: ExecCtx, note: string): Promise<void> {
  if (ctx.conversation) {
    await ctx.admin.from("conversations").update({ status: "escalated" }).eq("id", ctx.conversation.id);
  }
  const { data: members } = await ctx.admin
    .from("organization_memberships")
    .select("user_id")
    .eq("organization_id", ctx.orgId)
    .in("role", ["owner", "admin"]);
  const link = ctx.conversation
    ? `/dashboard/businesses/${ctx.orgId}/ops/inbox?c=${ctx.conversation.id}`
    : "/dashboard/businesses";
  const rows = (((members as { user_id: string }[] | null) ?? [])).map((m) => ({
    user_id: m.user_id,
    title: "Conversation escalated",
    body: note || "An Engage flow handed a customer to the team.",
    kind: "info",
    link,
  }));
  if (rows.length) await ctx.admin.from("notifications").insert(rows);
}

// ── the walk ─────────────────────────────────────────────────────────────────

export async function advanceRun(ctx: ExecCtx): Promise<AdvanceResult> {
  const { admin, flow, run } = ctx;
  const graph = flow?.graph ?? { nodes: [], edges: [] };
  const nodes = nodeMap(graph);
  const state: Json = { ...(run.state ?? {}) };
  const waitingFor: string | undefined = state.waiting_for;
  delete state.waiting_for;

  let nodeId: string | null = run.node_id ?? null;
  let parked: string | null = null;
  let wakeAt: string | null = null;
  let status: AdvanceResult["status"] | "active" = "active";
  let fallToAi = false;
  let escalated = false;

  const park = (id: string, why: "reply" | "timer", at?: Date) => {
    parked = id;
    state.waiting_for = why;
    wakeAt = at ? at.toISOString() : null;
    status = "waiting";
    nodeId = null;
  };

  // Resume position -----------------------------------------------------------
  if (waitingFor === "reply" && nodeId) {
    const node = nodes.get(nodeId);
    if (node?.type === "buttons") {
      const hit = matchOption(node.data, ctx.inboundText ?? "");
      if (hit) {
        nodeId = nextTarget(graph, node.id, String(hit.value ?? hit.label ?? ""));
      } else {
        const elseTarget = nextTarget(graph, node.id, "else");
        if (elseTarget) {
          nodeId = elseTarget;
        } else {
          // No match, no 'else' wired: repeat the options and keep waiting.
          await ctx.deliver(renderButtons(node.data));
          park(node.id, "reply");
        }
      }
    } else if (node?.type === "collect_input") {
      await storeAttribute(ctx, String(node.data?.attribute ?? ""), String(ctx.inboundText ?? ""), state);
      nodeId = nextTarget(graph, node.id);
    } else {
      nodeId = nextTarget(graph, nodeId); // defensive: unknown park point
    }
  } else if (waitingFor === "timer" && nodeId) {
    nodeId = nextTarget(graph, nodeId); // the delay elapsed — continue past it
  } else if (nodeId) {
    // Fresh run: parked ON its trigger node — step to the first real node.
    nodeId = nextTarget(graph, nodeId);
  }

  // Walk -----------------------------------------------------------------------
  let steps = 0;
  while (nodeId && steps++ < MAX_STEPS) {
    const node = nodes.get(nodeId);
    if (!node) break;
    const d: Json = node.data ?? {};
    if (node.type === "send_message") {
      const text = String(d.text ?? "");
      if (text.trim()) await ctx.deliver(text, d.subject ? String(d.subject) : undefined);
      nodeId = nextTarget(graph, node.id);
    } else if (node.type === "buttons") {
      if (ctx.mode === "journey") {
        // Journeys have no reply channel — waiting would be a lie.
        state.note = "buttons node reached in a journey (no reply channel) — exited";
        status = "exited";
        nodeId = null;
      } else {
        await ctx.deliver(renderButtons(d));
        park(node.id, "reply");
      }
    } else if (node.type === "collect_input") {
      if (ctx.mode === "journey") {
        state.note = "collect_input node reached in a journey (no reply channel) — exited";
        status = "exited";
        nodeId = null;
      } else {
        const prompt = String(d.prompt ?? "");
        if (prompt.trim()) await ctx.deliver(prompt);
        park(node.id, "reply");
      }
    } else if (node.type === "condition") {
      nodeId = nextTarget(graph, node.id, evalCondition(ctx, d) ? "yes" : "no");
    } else if (node.type === "set_tag") {
      await addTag(ctx, String(d.tag ?? "").trim());
      nodeId = nextTarget(graph, node.id);
    } else if (node.type === "delay") {
      const mins = Number(d.minutes);
      if (!Number.isFinite(mins) || mins <= 0) {
        nodeId = nextTarget(graph, node.id); // zero/invalid delay — just continue
      } else {
        park(node.id, "timer", new Date(Date.now() + mins * 60_000));
      }
    } else if (node.type === "handoff_ai") {
      fallToAi = true;
      status = "exited";
      nodeId = null;
    } else if (node.type === "handoff_human") {
      await escalateToHuman(ctx, String(d.note ?? ""));
      escalated = true;
      status = "exited";
      nodeId = null;
    } else if (node.type === "end") {
      status = "done";
      nodeId = null;
    } else {
      // triggers / unknown node types: step over
      nodeId = nextTarget(graph, node.id);
    }
    if (status !== "active") break;
  }
  if (status === "active") status = "done"; // walked off the end (or hit MAX_STEPS)

  await admin
    .from("engage_runs")
    .update({
      node_id: parked ?? run.node_id,
      status,
      state,
      wake_at: wakeAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", run.id);

  return { status, fallToAi, escalated };
}

// ── deliveries ───────────────────────────────────────────────────────────────

const escHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Journey sends: the same outbound mechanics campaign-run uses — email when
 *  the contact has one (with the unsubscribe footer + RFC 8058 header), else
 *  SMS when they have a phone; opt-outs respected; unreachable → false, no stamp. */
export function makeJourneyDeliver(admin: SupabaseClient, flow: Json, run: Json, contact: Json | null) {
  return async (text: string, subject?: string): Promise<boolean> => {
    if (!text.trim() || !contact) return false;
    const base = { organization_id: run.organization_id, flow_id: flow.id, run_id: run.id, contact_id: contact.id ?? null, conversation_id: run.conversation_id ?? null };
    const email = String(contact.email ?? "").trim();
    const phone = String(contact.phone ?? "").trim();
    if (email && contact.email_opt_out !== true) {
      // Mirror campaign-run: the visible link renders on phoxta.com, the
      // one-click header POSTs to the function directly.
      const fnBase = `${(Deno.env.get("SUPABASE_URL") ?? "").replace(/\/$/, "")}/functions/v1`;
      const unsubLink = `https://www.phoxta.com/unsubscribe?c=${contact.id}&o=${run.organization_id}&ch=email`;
      const oneClick = `${fnBase}/unsubscribe?c=${contact.id}&o=${run.organization_id}&ch=email`;
      const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#222">${
        escHtml(text).replace(/\n/g, "<br/>")
      }<p style="margin:16px 0 0;font-size:12px;color:#888">—<br/><a href="${unsubLink}">Unsubscribe</a></p></div>`;
      const r = await sendEmail({
        to: [email],
        subject: subject || flow.name || "A message from us",
        html,
        text: `${text}\n\n—\nUnsubscribe: ${unsubLink}`,
        headers: { "List-Unsubscribe": `<${oneClick}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      });
      if (r.ok || r.status === "simulated") {
        await stampTouch(admin, { ...base, channel: "email" });
        return true;
      }
      return false;
    }
    if (phone && contact.sms_opt_out !== true) {
      const r = await twilioSend("sms", phone, `${text} Reply STOP to opt out`);
      if (r.ok || r.status === "simulated") {
        await stampTouch(admin, { ...base, channel: "sms" });
        return true;
      }
      return false;
    }
    return false; // no reachable channel — honestly skipped, nothing stamped
  };
}

/** Cron-side delivery into an existing conversation (a flow waking from a
 *  delay): always lands on the thread (console + widget history), and pushes
 *  over the wire when the channel has a transport (sms/whatsapp/email). */
export function makeConversationDeliver(admin: SupabaseClient, flow: Json, run: Json, conversation: Json) {
  return async (text: string, _subject?: string): Promise<boolean> => {
    if (!text.trim()) return false;
    const channel = String(conversation.channel_type ?? "web");
    await admin.from("conversation_messages").insert({
      organization_id: run.organization_id,
      conversation_id: conversation.id,
      role: "agent",
      channel_type: channel,
      body: text,
      meta: { engage: { flow_id: flow.id, run_id: run.id } },
    });
    await admin.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversation.id);
    if ((channel === "sms" || channel === "whatsapp") && conversation.customer_phone) {
      await twilioSend(channel as "sms" | "whatsapp", conversation.customer_phone, text);
    } else if (channel === "email" && conversation.customer_email) {
      await sendEmail({
        to: [conversation.customer_email],
        subject: _subject || flow.name || "A message from us",
        html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#222">${escHtml(text).replace(/\n/g, "<br/>")}</div>`,
        text,
      });
    }
    await stampTouch(admin, {
      organization_id: run.organization_id,
      flow_id: flow.id,
      run_id: run.id,
      contact_id: run.contact_id ?? null,
      conversation_id: conversation.id,
      channel,
    });
    return true;
  };
}

// ── inbound hook (called by agent-inbound) ───────────────────────────────────

export type EngageInboundParams = {
  channel: string;
  conversationId?: string;
  customer: { name?: string; email?: string; phone?: string };
  message: string;
  isTest?: boolean;
  businessHours?: Json;
};

export type EngageInboundOutcome = {
  conversationId: string;
  /** What the flow said this turn (joined for the channel reply). */
  reply: string;
  /** true → do NOT run the AI; false → fall through to respondCore with conversationId. */
  suppressAi: boolean;
  escalated: boolean;
} | null;

/** Flow runtime for one inbound customer message. Returns null whenever the
 *  existing AI path should run untouched (no schema, no live flows, no run and
 *  no trigger, or any internal error — the CALLER also wraps this in try/catch). */
export async function engageHandleInbound(
  admin: SupabaseClient,
  org: { id: string; name: string },
  p: EngageInboundParams,
): Promise<EngageInboundOutcome> {
  // Cheap gate: live conversational flows for this org. A missing table (schema
  // never ensured — the Engage tab was never used) errors here → skip silently.
  const { data: flows, error: flowsErr } = await admin
    .from("engage_flows")
    .select("id, name, graph")
    .eq("organization_id", org.id)
    .eq("kind", "flow")
    .eq("status", "live")
    .order("created_at", { ascending: true });
  if (flowsErr || !flows || flows.length === 0) return null;

  // Resolve the conversation READ-ONLY (mirror of agentCore.resolveConversation
  // minus the insert — we only create one if a flow actually claims the turn).
  let conv: Json | null = null;
  if (p.conversationId) {
    const { data } = await admin
      .from("conversations")
      .select("*")
      .eq("id", p.conversationId)
      .eq("organization_id", org.id)
      .maybeSingle();
    conv = data ?? null;
  }
  if (!conv && (p.channel === "sms" || p.channel === "whatsapp") && p.customer?.phone) {
    const { data } = await admin
      .from("conversations")
      .select("*")
      .eq("organization_id", org.id)
      .eq("channel_type", p.channel)
      .eq("customer_phone", p.customer.phone)
      .eq("is_test", p.isTest === true)
      .neq("status", "closed")
      .order("last_message_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    conv = data ?? null;
  }
  const isNew = !conv;

  // An in-flight run on this conversation claims the turn (reply waits only —
  // a run sleeping on a timer leaves the turn to the AI).
  let run: Json | null = null;
  let flow: Json | null = null;
  if (conv) {
    const { data } = await admin
      .from("engage_runs")
      .select("*")
      .eq("conversation_id", conv.id)
      .in("status", ["active", "waiting"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    run = data ?? null;
    if (run && run.state?.waiting_for !== "reply") return null;
    if (run) {
      flow = flows.find((f: Json) => f.id === run.flow_id) ?? null;
      if (!flow) {
        // The run's flow was paused/deleted — release the conversation to the AI.
        await admin.from("engage_runs").update({ status: "exited", updated_at: new Date().toISOString() }).eq("id", run.id);
        return null;
      }
    }
  }

  // No run → trigger matching. Specificity: keyword > new_conversation > off_hours.
  let startFlow: Json | null = null;
  let triggerNode: Node | null = null;
  if (!run) {
    const msg = p.message.toLowerCase();
    const pick = (pred: (n: Node) => boolean): { f: Json; n: Node } | null => {
      for (const f of flows as Json[]) {
        const n = ((f.graph?.nodes ?? []) as Node[]).find((x) => x && pred(x));
        if (n) return { f, n };
      }
      return null;
    };
    const kw = pick((n) =>
      n.type === "trigger_keyword" &&
      (Array.isArray(n.data?.keywords) ? n.data.keywords : []).some((k: Json) => k && msg.includes(String(k).toLowerCase()))
    );
    const nc = !kw && isNew ? pick((n) => n.type === "trigger_new_conversation") : null;
    const oh = !kw && !nc && isOffHours(p.businessHours) ? pick((n) => n.type === "trigger_off_hours") : null;
    const hit = kw ?? nc ?? oh;
    if (!hit) return null;
    startFlow = hit.f;
    triggerNode = hit.n;
  }

  // A flow will run this turn — open the conversation if the message just did
  // (mirror of agentCore.resolveConversation's identity link + insert).
  if (!conv) {
    let newContactId: string | null = null;
    const identity = p.customer?.email
      ? { kind: "email", value: p.customer.email }
      : p.customer?.phone
        ? { kind: p.channel === "whatsapp" ? "whatsapp" : "phone", value: p.customer.phone }
        : null;
    if (identity) {
      try {
        const { data, error } = await admin.rpc("app_resolve_contact", {
          p_org: org.id,
          p_kind: identity.kind,
          p_value: identity.value,
          p_name: p.customer?.name ?? "",
          p_verified: true, // a handle we received a message ON demonstrably reaches them
        });
        if (!error) newContactId = (data as string | null) ?? null;
      } catch (_) { /* never fail an inbound message over identity bookkeeping */ }
    }
    const { data: created, error: convErr } = await admin
      .from("conversations")
      .insert({
        organization_id: org.id,
        channel_type: p.channel,
        contact_id: newContactId,
        customer_name: p.customer?.name ?? "",
        customer_phone: phoneForStorage(p.customer?.phone),
        customer_email: p.customer?.email ?? "",
        is_test: p.isTest === true,
      })
      .select("*")
      .single();
    if (convErr || !created) return null;
    conv = created;
  }

  const contactId: string | null = run?.contact_id ?? conv.contact_id ?? null;
  let contact: Json | null = null;
  if (contactId) {
    const { data } = await admin.from("crm_contacts").select("*").eq("id", contactId).maybeSingle();
    contact = data ?? null;
  }

  if (!run) {
    const { data: created, error: runErr } = await admin
      .from("engage_runs")
      .insert({
        flow_id: startFlow!.id,
        organization_id: org.id,
        contact_id: contactId,
        conversation_id: conv.id,
        node_id: triggerNode!.id,
        status: "active",
        state: {},
      })
      .select("*")
      .single();
    if (runErr || !created) return null;
    run = created;
    flow = startFlow;
  }

  // Advance with BUFFERED delivery: texts ride the same channel reply the AI
  // would use; persistence happens below once we know who owns the turn.
  const texts: string[] = [];
  const ctx: ExecCtx = {
    admin,
    orgId: org.id,
    flow,
    run,
    contact,
    conversation: conv,
    inboundText: p.message,
    mode: "flow",
    deliver: (text: string) => {
      if (text.trim()) texts.push(text);
      return Promise.resolve(true);
    },
  };
  const out = await advanceRun(ctx);

  // Persist the transcript + attribution. When the run falls through to the AI
  // (handoff_ai), respondCore inserts the customer message itself — writing it
  // here too would duplicate it, so only the flow's own sends are recorded.
  const now = new Date().toISOString();
  const msgRows: Json[] = [];
  if (!out.fallToAi) {
    msgRows.push({ organization_id: org.id, conversation_id: conv.id, role: "customer", channel_type: p.channel, body: p.message.slice(0, 4000) });
  }
  for (const t of texts) {
    msgRows.push({
      organization_id: org.id,
      conversation_id: conv.id,
      role: "agent",
      channel_type: p.channel,
      body: t,
      meta: { engage: { flow_id: flow.id, run_id: run.id } },
    });
  }
  if (msgRows.length) await admin.from("conversation_messages").insert(msgRows);
  if (!out.fallToAi) {
    await admin.from("conversations").update({ last_message_at: now }).eq("id", conv.id);
    if (texts.length) {
      await admin.from("conversations").update({ first_response_at: now }).eq("id", conv.id).is("first_response_at", null);
    }
  }
  for (const _t of texts) {
    await stampTouch(admin, {
      organization_id: org.id,
      flow_id: flow.id,
      run_id: run.id,
      contact_id: ctx.run?.contact_id ?? contactId,
      conversation_id: conv.id,
      channel: p.channel,
    });
  }

  // handoff_human suppresses the auto-reply; if the flow authored nothing this
  // turn, a short deterministic acknowledgement keeps the channel from going
  // silent mid-conversation (it is fixed copy, not a generated reply).
  const reply = texts.join("\n\n") ||
    (out.escalated && !out.fallToAi ? "Thanks — a member of the team will take it from here." : "");

  return { conversationId: conv.id, reply, suppressAi: !out.fallToAi, escalated: out.escalated };
}
