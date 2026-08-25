import type { EngageEdge, EngageGraph, EngageNode, EngageNodeData, FlowKind, NodeType } from "@/lib/db/ops/engage";
import { resolveConsole } from "@/lib/ops/consoleConfig";

// Recipe templates for the Engage flow/journey editor: complete, runnable
// graphs (typed against the runtime contract) with real message copy, so a
// business is one click from a working automation. Journey recipes are keyed
// off the vertical's console config — a hotel gets booking reminders, a shop
// gets post-purchase review asks — with the Welcome series offered to everyone.

export type EngageTemplate = {
  id: string;
  kind: FlowKind;
  name: string;
  description: string;
  /** e.g. "Off-hours → Message → Capture email → Tag → AI" — the card's tiny chain preview. */
  chain: string;
  graph: EngageGraph;
};

// ── tiny graph builders ──────────────────────────────────────────────────────

const n = (id: string, type: NodeType, x: number, y: number, data: EngageNodeData = {}): EngageNode => ({
  id,
  type,
  position: { x, y },
  data,
});

const e = (source: string, target: string, sourceHandle?: string): EngageEdge => ({
  id: sourceHandle ? `e-${source}-${sourceHandle}-${target}` : `e-${source}-${target}`,
  source,
  target,
  ...(sourceHandle ? { sourceHandle } : {}),
});

// ── Flow templates (chat automation — same for every vertical) ───────────────

const afterHoursCapture: EngageTemplate = {
  id: "after-hours-capture",
  kind: "flow",
  name: "After-hours capture",
  description: "Someone messages while you're closed: set expectations, capture their email, tag the lead and let the AI keep helping.",
  chain: "Off-hours → Message → Capture email → Tag → AI",
  graph: {
    nodes: [
      n("trigger", "trigger_off_hours", 0, 80),
      n("greet", "send_message", 260, 80, {
        text: "Hi {{name}} — thanks for getting in touch! We're closed right now, but you're first in line for the morning. I can help with most things straight away.",
      }),
      n("capture", "collect_input", 520, 80, {
        prompt: "What's the best email to reach you on, in case we need to follow up when we open?",
        attribute: "email",
      }),
      n("tag", "set_tag", 780, 80, { tag: "after-hours-lead" }),
      n("ai", "handoff_ai", 1040, 80),
    ],
    edges: [e("trigger", "greet"), e("greet", "capture"), e("capture", "tag"), e("tag", "ai")],
  },
};

const instantMenu: EngageTemplate = {
  id: "instant-menu",
  kind: "flow",
  name: "Instant menu",
  description: 'Anyone who asks about the menu or prices gets an instant numbered menu — pick an option, get the answer, then the AI takes over.',
  chain: "Keyword → Options → Answer → AI",
  graph: {
    nodes: [
      n("trigger", "trigger_keyword", 0, 180, { keywords: ["menu", "price", "prices"] }),
      n("menu", "buttons", 260, 180, {
        text: "Happy to help! What would you like to see?",
        options: [
          { label: "What's available & prices", value: "prices" },
          { label: "Opening hours", value: "hours" },
          { label: "Talk to the team", value: "talk" },
        ],
      }),
      n("prices", "send_message", 560, 40, {
        text: "Here's what we offer and what it costs — everything's up to date on our site. Anything specific you'd like a price for? Just ask.",
      }),
      n("hours", "send_message", 560, 180, {
        text: "We're open every day — you'll find today's exact hours on our site. If you tell me when you'd like to come by, I'll confirm we're open.",
      }),
      n("talk", "send_message", 560, 320, {
        text: "Of course — I'll flag this for the team and they'll pick it up as soon as they're free. In the meantime, I can answer most questions myself.",
      }),
      n("ai", "handoff_ai", 860, 180),
    ],
    edges: [
      e("trigger", "menu"),
      e("menu", "prices", "prices"),
      e("menu", "hours", "hours"),
      e("menu", "talk", "talk"),
      e("menu", "ai", "else"),
      e("prices", "ai"),
      e("hours", "ai"),
      e("talk", "ai"),
    ],
  },
};

const refundsGoHuman: EngageTemplate = {
  id: "refunds-go-human",
  kind: "flow",
  name: "Refunds go human",
  description: "The word \"refund\" or \"complaint\" skips every bot and lands straight with a person — the one conversation you never automate.",
  chain: "Keyword → Human",
  graph: {
    nodes: [
      n("trigger", "trigger_keyword", 0, 80, { keywords: ["refund", "complaint"] }),
      n("human", "handoff_human", 260, 80, {
        note: "Customer mentioned a refund or complaint — please pick this up personally and lead with an apology.",
      }),
    ],
    edges: [e("trigger", "human")],
  },
};

export const FLOW_TEMPLATES: EngageTemplate[] = [afterHoursCapture, instantMenu, refundsGoHuman];

// ── Journey templates (lifecycle automation — keyed by vertical) ─────────────

/** A simple trigger → delay → send spine. */
const linearJourney = (
  id: string,
  name: string,
  description: string,
  chain: string,
  trigger: EngageNodeData,
  minutes: number,
  message: EngageNodeData,
): EngageTemplate => ({
  id,
  kind: "journey",
  name,
  description,
  chain,
  graph: {
    nodes: [
      n("trigger", "trigger_event", 0, 80, trigger),
      n("wait", "delay", 260, 80, { minutes }),
      n("send", "send_message", 520, 80, message),
      n("end", "end", 780, 80),
    ],
    edges: [e("trigger", "wait"), e("wait", "send"), e("send", "end")],
  },
});

// Commerce verticals (retail / restaurant — anywhere an order is placed).
const postPurchaseReview = linearJourney(
  "post-purchase-review",
  "Post-purchase thank-you + review ask",
  "A day after every order: say thanks properly, check everything arrived as it should, and ask for the review while the experience is fresh.",
  "Order placed → Wait 1 day → Thank-you + review ask",
  { event: "order_placed" },
  1440,
  {
    subject: "Thank you for your order, {{name}}",
    text: "Hi {{name}} — thank you for your order! We hope everything was exactly as you expected. If you have a spare minute, a quick review would mean the world to us — and if anything wasn't right, just reply here and we'll sort it straight away.",
  },
);

const winBack60 = linearJourney(
  "win-back-60",
  "Win-back 60 days",
  "Sixty days of quiet after someone becomes a customer earns a warm nudge back — a personal note, not a shouty discount blast.",
  "Tagged customer → Wait 60 days → Come-back note",
  { event: "contact_tagged", tag: "customer" },
  86400,
  {
    subject: "We've missed you, {{name}}",
    text: "Hi {{name}} — it's been a little while! We've added some new things since your last visit that we think you'll like. Come and take a look, and if there's anything you were hoping we'd stock or do differently, reply and tell us — we read every message.",
  },
);

// Reservations / appointments verticals (stays, rentals, experiences, services).
const bookingReminder = linearJourney(
  "booking-reminder",
  "Booking reminder",
  "The moment a booking is confirmed, schedule a friendly reminder with everything they need — fewer no-shows, better arrivals.",
  "Booking confirmed → Wait 1 day → Reminder",
  { event: "reservation_confirmed" },
  1440,
  {
    subject: "Your booking is confirmed, {{name}}",
    text: "Hi {{name}} — just a friendly note about your upcoming booking with us. Everything is confirmed and we're looking forward to seeing you. If your plans change or you have any questions before then, reply here and we'll help straight away.",
  },
);

const postStayReview = linearJourney(
  "post-stay-review",
  "Post-stay review ask",
  "A few days after the visit, ask how it went and invite a review — the single best source of the next booking.",
  "Booking confirmed → Wait 5 days → Review ask",
  { event: "reservation_confirmed" },
  7200,
  {
    subject: "How was it, {{name}}?",
    text: "Hi {{name}} — thanks so much for choosing us! We hope everything was brilliant. If you have a moment, we'd love a quick review — it genuinely helps a small business like ours. And if anything fell short, reply here first so we can put it right.",
  },
);

// Every vertical: the welcome series.
const welcomeSeries: EngageTemplate = {
  id: "welcome-series",
  kind: "journey",
  name: "Welcome",
  description: "New subscriber? Say hello right away, then follow up two days later with the useful stuff — what you do best and how to get help.",
  chain: "Tagged subscriber → Hello → Wait 2 days → The useful stuff",
  graph: {
    nodes: [
      n("trigger", "trigger_event", 0, 80, { event: "contact_tagged", tag: "subscriber" }),
      n("hello", "send_message", 260, 80, {
        subject: "Welcome aboard, {{name}}",
        text: "Hi {{name}} — welcome, and thanks for joining us! You'll only ever hear from us when we have something genuinely worth your time. If there's anything you need right now, just reply to this message — a real person (or our rather good AI) will answer.",
      }),
      n("wait", "delay", 520, 80, { minutes: 2880 }),
      n("useful", "send_message", 780, 80, {
        subject: "The three things people ask us most",
        text: "Hi {{name}} — settling in? Here are the three things new customers ask us most: what we're best known for, how quickly we respond (fast — try us), and how to reach a human (reply to any message, any time). That's it. We're glad you're here.",
      }),
      n("end", "end", 1040, 80),
    ],
    edges: [e("trigger", "hello"), e("hello", "wait"), e("wait", "useful"), e("useful", "end")],
  },
};

/**
 * The journey recipes for one business, vertical-specific first, Welcome last.
 * Booking-model verticals get reminder/review asks; commerce verticals get
 * post-purchase and win-back; everyone gets the Welcome series.
 */
export function journeyTemplatesFor(vertical: string | null | undefined): EngageTemplate[] {
  const cfg = resolveConsole(vertical);
  const specific =
    cfg.booking === "none" ? [postPurchaseReview, winBack60] : [bookingReminder, postStayReview];
  return [...specific, welcomeSeries];
}

export function templatesFor(kind: FlowKind, vertical: string | null | undefined): EngageTemplate[] {
  return kind === "flow" ? FLOW_TEMPLATES : journeyTemplatesFor(vertical);
}
