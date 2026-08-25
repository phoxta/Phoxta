/* eslint-disable react-refresh/only-export-components -- metadata module: it
   exports no components (the JSX literals are icon *elements*), so there is
   nothing for fast refresh to preserve. */
import type { ReactNode } from "react";
import type { EngageGraph, EngageNodeData, FlowKind, NodeType } from "@/lib/db/ops/engage";

// Shared node metadata for the Engage canvas kit: icon, label, palette group,
// one-line summary of a node's data, default data for a freshly added node,
// and the pre-publish graph validation both the editor and the list pages run.

// ── icons (16px, stroke, inherit currentColor) ───────────────────────────────

const ic = (path: ReactNode) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {path}
  </svg>
);

const ICON_BOLT = ic(<path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />);
const ICON_CHAT = ic(<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.8-.9L3 20l1-4.9A8.4 8.4 0 1 1 21 11.5z" />);
const ICON_MOON = ic(<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />);
const ICON_SPARK = ic(<><path d="M12 3v4" /><path d="M12 17v4" /><path d="M3 12h4" /><path d="M17 12h4" /><path d="M5.6 5.6l2.8 2.8" /><path d="M15.6 15.6l2.8 2.8" /><path d="M18.4 5.6l-2.8 2.8" /><path d="M8.4 15.6l-2.8 2.8" /></>);
const ICON_SEND = ic(<><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>);
const ICON_LIST = ic(<><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" /></>);
const ICON_BRANCH = ic(<><circle cx="6" cy="6" r="3" /><circle cx="18" cy="18" r="3" /><path d="M6 9v3a6 6 0 0 0 6 6h3" /></>);
const ICON_INPUT = ic(<><path d="M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2" /><path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" /><path d="M12 8v8" /><path d="M9 8h6" /></>);
const ICON_TAG = ic(<><path d="M12.6 2.9 21 11.3a2 2 0 0 1 0 2.8l-6.9 6.9a2 2 0 0 1-2.8 0L2.9 12.6A2 2 0 0 1 2.3 11L3 4a1 1 0 0 1 1-1l7-.7a2 2 0 0 1 1.6.6z" /><circle cx="8.5" cy="8.5" r="1.5" /></>);
const ICON_CLOCK = ic(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></>);
const ICON_BOT = ic(<><rect x="4" y="8" width="16" height="12" rx="3" /><path d="M12 4v4" /><circle cx="12" cy="3" r="1" /><path d="M9 13h.01" /><path d="M15 13h.01" /><path d="M9 17h6" /></>);
const ICON_PERSON = ic(<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>);
const ICON_STOP = ic(<><circle cx="12" cy="12" r="9" /><rect x="9" y="9" width="6" height="6" rx="1" /></>);

// ── meta ─────────────────────────────────────────────────────────────────────

export type NodeGroup = "Triggers" | "Messages" | "Logic" | "Actions" | "Handoff & end";
export type NodeAccent = "trigger" | "ai" | "human" | "end";

export type NodeMeta = {
  label: string;
  group: NodeGroup;
  /** Card colour accent: triggers green, AI blue, human orange, end grey. */
  accent?: NodeAccent;
  icon: ReactNode;
  /** Palette one-liner. */
  blurb: string;
  /** One-line summary of the node's current data, shown on the card. */
  summary: (d: EngageNodeData) => string;
  defaults: () => EngageNodeData;
};

export const EVENT_LABELS: Record<string, string> = {
  order_placed: "Order placed",
  reservation_confirmed: "Reservation confirmed",
  contact_tagged: "Contact tagged",
};

const clip = (s: string, max = 46) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

/** "90" → "≈ 1.5 hours", "1440" → "≈ 1 day". */
export function humanizeMinutes(m: number): string {
  if (!Number.isFinite(m) || m <= 0) return "no time";
  if (m < 60) return `${m} min`;
  if (m < 1440) {
    const h = Math.round((m / 60) * 10) / 10;
    return `≈ ${h} hour${h === 1 ? "" : "s"}`;
  }
  const d = Math.round((m / 1440) * 10) / 10;
  return `≈ ${d} day${d === 1 ? "" : "s"}`;
}

export const NODE_META: Record<NodeType, NodeMeta> = {
  trigger_keyword: {
    label: "Keyword",
    group: "Triggers",
    accent: "trigger",
    icon: ICON_BOLT,
    blurb: "Starts when a message contains a keyword",
    summary: (d) => (d.keywords?.length ? `Says: ${clip(d.keywords.join(", "))}` : "No keywords yet"),
    defaults: () => ({ keywords: [] }),
  },
  trigger_new_conversation: {
    label: "New conversation",
    group: "Triggers",
    accent: "trigger",
    icon: ICON_CHAT,
    blurb: "Starts on every brand-new conversation",
    summary: () => "Any first message",
    defaults: () => ({}),
  },
  trigger_off_hours: {
    label: "Off-hours",
    group: "Triggers",
    accent: "trigger",
    icon: ICON_MOON,
    blurb: "Starts when a message arrives outside business hours",
    summary: () => "Message while you're closed",
    defaults: () => ({}),
  },
  trigger_event: {
    label: "Event happens",
    group: "Triggers",
    accent: "trigger",
    icon: ICON_SPARK,
    blurb: "Starts when a lifecycle event fires",
    summary: (d) =>
      d.event
        ? `${EVENT_LABELS[d.event] ?? d.event}${d.event === "contact_tagged" && d.tag ? `: "${d.tag}"` : ""}`
        : "Pick an event",
    defaults: () => ({ event: "order_placed" }),
  },
  send_message: {
    label: "Send message",
    group: "Messages",
    icon: ICON_SEND,
    blurb: "Sends a message on the conversation's channel",
    summary: (d) => (d.text ? clip(d.text) : "Empty message"),
    defaults: () => ({ text: "" }),
  },
  buttons: {
    label: "Options",
    group: "Messages",
    icon: ICON_LIST,
    blurb: "Asks a question with numbered options — one branch each",
    summary: (d) => `${d.options?.length ?? 0} option${(d.options?.length ?? 0) === 1 ? "" : "s"}${d.text ? ` — ${clip(d.text, 28)}` : ""}`,
    defaults: () => ({ text: "", options: [{ label: "Option 1", value: "option-1" }] }),
  },
  condition: {
    label: "Condition",
    group: "Logic",
    icon: ICON_BRANCH,
    blurb: "Branches yes/no on a field or tag",
    summary: (d) =>
      d.op === "has_tag" || d.op === "not_has_tag"
        ? `${d.op === "has_tag" ? "Has" : "Doesn't have"} tag "${d.value ?? ""}"`
        : `${d.field || "field"} ${d.op ?? "contains"} "${d.value ?? ""}"`,
    defaults: () => ({ field: "last_message", op: "contains", value: "" }),
  },
  collect_input: {
    label: "Collect input",
    group: "Messages",
    icon: ICON_INPUT,
    blurb: "Asks a question and saves the reply to the contact",
    summary: (d) => (d.attribute ? `Save reply → ${d.attribute}` : "Pick an attribute"),
    defaults: () => ({ prompt: "", attribute: "" }),
  },
  set_tag: {
    label: "Add tag",
    group: "Actions",
    icon: ICON_TAG,
    blurb: "Tags the contact (segments, journeys, conditions)",
    summary: (d) => (d.tag ? `Tag "${d.tag}"` : "No tag yet"),
    defaults: () => ({ tag: "" }),
  },
  delay: {
    label: "Wait",
    group: "Logic",
    icon: ICON_CLOCK,
    blurb: "Pauses the run for a set time",
    summary: (d) => `Wait ${humanizeMinutes(d.minutes ?? 0)}`,
    defaults: () => ({ minutes: 60 }),
  },
  handoff_ai: {
    label: "AI agent",
    group: "Handoff & end",
    accent: "ai",
    icon: ICON_BOT,
    blurb: "Hands the conversation to your AI agent",
    summary: () => "AI takes the conversation",
    defaults: () => ({}),
  },
  handoff_human: {
    label: "Human",
    group: "Handoff & end",
    accent: "human",
    icon: ICON_PERSON,
    blurb: "Escalates to a person, with a note",
    summary: (d) => (d.note ? clip(d.note) : "Assign to a person"),
    defaults: () => ({ note: "" }),
  },
  end: {
    label: "End",
    group: "Handoff & end",
    accent: "end",
    icon: ICON_STOP,
    blurb: "Ends the run cleanly",
    summary: () => "Run ends here",
    defaults: () => ({}),
  },
};

export const ALL_NODE_TYPES = Object.keys(NODE_META) as NodeType[];

export const FLOW_TRIGGERS: NodeType[] = ["trigger_keyword", "trigger_new_conversation", "trigger_off_hours"];
export const JOURNEY_TRIGGERS: NodeType[] = ["trigger_event"];

export const isTrigger = (t: NodeType): boolean => t.startsWith("trigger_");

/** Terminal nodes: allowed (expected) to have no outgoing edge. */
export const TERMINAL_TYPES: NodeType[] = ["handoff_ai", "handoff_human", "end"];

export function triggersFor(kind: FlowKind): NodeType[] {
  return kind === "journey" ? JOURNEY_TRIGGERS : FLOW_TRIGGERS;
}

const SHARED_STEPS: NodeType[] = [
  "send_message",
  "buttons",
  "collect_input",
  "condition",
  "delay",
  "set_tag",
  "handoff_ai",
  "handoff_human",
  "end",
];

/** Palette layout: the kind's trigger family, then the shared steps by group. */
export function paletteGroups(kind: FlowKind): Array<{ group: NodeGroup; types: NodeType[] }> {
  const groups: Array<{ group: NodeGroup; types: NodeType[] }> = [{ group: "Triggers", types: triggersFor(kind) }];
  for (const t of SHARED_STEPS) {
    const g = NODE_META[t].group;
    const bucket = groups.find((x) => x.group === g);
    if (bucket) bucket.types.push(t);
    else groups.push({ group: g, types: [t] });
  }
  return groups;
}

/** The outgoing sourceHandles a node's current data allows (undefined = the single default handle). */
export function allowedSourceHandles(type: NodeType, data: EngageNodeData): string[] | null {
  if (type === "buttons") return [...(data.options ?? []).map((o) => o.value), "else"];
  if (type === "condition") return ["yes", "no"];
  if (TERMINAL_TYPES.includes(type)) return []; // no outgoing edges at all
  return null;
}

// ── publish validation ───────────────────────────────────────────────────────

/** Human name for a node in an error message: label + a data hint when it has one. */
function describe(nodeType: NodeType, data: EngageNodeData): string {
  const meta = NODE_META[nodeType];
  const s = meta.summary(data);
  return s && s !== meta.label ? `${meta.label} (${s})` : meta.label;
}

/**
 * Pre-publish checks, precise enough to act on:
 *  1. at least one trigger of the right family for the kind (and none of the wrong family);
 *  2. every non-terminal node has an outgoing edge (handoffs and End are terminal);
 *  3. no node is unreachable from a trigger;
 * plus data sanity (empty keywords / options / messages / attributes, zero-minute waits).
 */
export function validateGraph(graph: EngageGraph, kind: FlowKind): string[] {
  const errors: string[] = [];
  const family = triggersFor(kind);
  const noun = kind === "journey" ? "journey" : "flow";

  const triggers = graph.nodes.filter((n) => isTrigger(n.type));
  const rightTriggers = triggers.filter((n) => family.includes(n.type));
  if (rightTriggers.length === 0) {
    errors.push(
      kind === "journey"
        ? 'Add a trigger: a journey starts from an "Event happens" node.'
        : "Add a trigger: a flow needs at least one Keyword, New conversation or Off-hours node.",
    );
  }
  for (const t of triggers.filter((n) => !family.includes(n.type))) {
    errors.push(`"${NODE_META[t.type].label}" is a ${kind === "journey" ? "flow" : "journey"} trigger — it can't start a ${noun}. Remove it.`);
  }

  // 2 — outgoing edges.
  for (const node of graph.nodes) {
    if (TERMINAL_TYPES.includes(node.type)) continue;
    if (!graph.edges.some((ed) => ed.source === node.id)) {
      errors.push(`"${describe(node.type, node.data)}" leads nowhere — connect it to a next step.`);
    }
  }

  // 3 — reachability from the right-family triggers.
  const out = new Map<string, string[]>();
  for (const ed of graph.edges) out.set(ed.source, [...(out.get(ed.source) ?? []), ed.target]);
  const reached = new Set(rightTriggers.map((t) => t.id));
  const queue = [...reached];
  while (queue.length) {
    for (const next of out.get(queue.shift()!) ?? []) {
      if (!reached.has(next)) {
        reached.add(next);
        queue.push(next);
      }
    }
  }
  if (rightTriggers.length > 0) {
    for (const node of graph.nodes) {
      if (isTrigger(node.type) || reached.has(node.id)) continue;
      errors.push(`"${describe(node.type, node.data)}" is unreachable — no path from a trigger leads to it.`);
    }
  }

  // Data sanity — a live automation with empty content is a silent failure.
  for (const node of graph.nodes) {
    const d = node.data;
    if (node.type === "trigger_keyword" && !(d.keywords?.length)) errors.push("The Keyword trigger has no keywords — add at least one.");
    if (node.type === "trigger_event" && !d.event) errors.push('The "Event happens" trigger has no event selected.');
    if (node.type === "trigger_event" && d.event === "contact_tagged" && !d.tag?.trim()) errors.push('The "Contact tagged" trigger needs a tag name.');
    if (node.type === "send_message" && !d.text?.trim()) errors.push("A Send message node is empty — write the message.");
    if (node.type === "buttons" && !(d.options?.length)) errors.push("An Options node has no options — add at least one.");
    if (node.type === "buttons" && (d.options ?? []).some((o) => !o.label.trim() || !o.value.trim())) {
      errors.push("An Options node has an option missing its label or value.");
    }
    if (node.type === "collect_input" && !d.attribute?.trim()) errors.push("A Collect input node has no attribute to save the reply into.");
    if (node.type === "delay" && !((d.minutes ?? 0) > 0)) errors.push("A Wait node has no duration — set the minutes.");
    if (node.type === "set_tag" && !d.tag?.trim()) errors.push("An Add tag node has no tag name.");
  }

  return errors;
}
