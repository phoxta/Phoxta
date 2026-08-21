import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import {
  listConversations,
  listContactTimeline,
  sendConversationReply,
  sendConversationTemplate,
  addInternalNote,
  suggestReply,
  placeCall,
  voiceToken,
  setConversationStatus,
  setConversationTags,
  assignConversation,
  snoozeConversation,
  touchPresence,
  listViewers,
  listCanned,
  listMembers,
  currentUserId,
  type Conversation,
  type ConversationMessage,
  type TimelineMessage,
  type ConvStatus,
  type CannedResponse,
  type OrgMember,
} from "@/lib/db/ops/agent";
import {
  listTickets,
  getTicketMessages,
  addTicketMessage,
  createTicket,
  setTicketStatus,
  sendTicketReply,
  draftAiReply,
  type Ticket,
  type TicketMessage,
  type TicketStatus,
} from "@/lib/db/ops/helpdesk";
import {
  markConversationRead,
  markCsatRequested,
  csatSurveyUrl,
  listCallsForConversation,
  type ConversationCall,
} from "@/lib/db/ops/inbox";
import { invokeAction, drainEmbeddings } from "@/lib/db/ops/ai";
import { toast, toastError, reportMutation } from "@/lib/ops/feedback";
import { callablePhone, displayPhone } from "@/lib/ops/phone";
import type { OpsContext } from "@/layouts/OperatingLayout";
import { supabase } from "@/lib/supabaseClient";
import EmailComposer from "./EmailComposer";
import InboxContextRail from "./InboxContextRail";
import RepliesDrawer from "./RepliesDrawer";
import type { Call, Device } from "@twilio/voice-sdk";

// ─────────────────────────────────────────────────────────────────────────────
// Constants & small helpers
// ─────────────────────────────────────────────────────────────────────────────

// Badge colours use the -emphasis text tokens: Bootstrap's plain .text-warning /
// .text-danger / .text-success on their -subtle backgrounds fall below the 4.5:1
// contrast these small badges need.
/** Owner-facing wording for the raw enum (the button says "Take over", not "escalate"). */
/** Confirmation wording, so a click on "Take over" never toasts "Marked escalated." */
const CONV_STATUS_TOAST: Record<ConvStatus, string> = {
  open: "Reopened",
  handled: "Marked handled",
  escalated: "You've taken this over",
  snoozed: "Snoozed",
  closed: "Conversation closed",
};
const TICKET_STATUS_TOAST: Record<TicketStatus, string> = {
  open: "Ticket reopened",
  pending: "Ticket set to pending",
  resolved: "Ticket resolved",
  closed: "Ticket closed",
};
const TICKET_STATUS_STYLE: Record<TicketStatus, string> = {
  open: "bg-warning-subtle text-warning-emphasis",
  pending: "bg-neutral-100 neutral-700",
  resolved: "bg-success-subtle text-success-emphasis",
  closed: "bg-neutral-100 neutral-500",
};
const SENTIMENT_STYLE: Record<string, string> = {
  positive: "bg-success-subtle text-success-emphasis",
  neutral: "bg-neutral-100 neutral-700",
  negative: "bg-danger-subtle text-danger-emphasis",
};
const CHANNEL_STYLE: Record<string, string> = {
  sms: "bg-info-subtle text-info-emphasis",
  whatsapp: "bg-success-subtle text-success-emphasis",
  web: "bg-neutral-100 neutral-700",
  voice: "bg-primary-subtle text-primary-emphasis",
  email: "bg-warning-subtle text-warning-emphasis",
};
/**
 * Delivery state in owner language. `sent`/`delivered` say nothing worth saying,
 * and "simulated" is an internal word for "we recorded it but nobody got it".
 */
const DELIVERY_LABEL: Record<string, string> = {
  queued: "Sending…",
  sending: "Sending…",
  simulated: "Not delivered (no channel connected)",
  failed: "Not delivered",
};
/** Brand casing — `text-capitalize` turns these into "Sms" and "Whatsapp". */
const CHANNEL_LABEL: Record<string, string> = {
  sms: "SMS",
  whatsapp: "WhatsApp",
  web: "Web",
  voice: "Voice",
  email: "Email",
};
const channelLabel = (c: string) => CHANNEL_LABEL[c] ?? c;

/**
 * One vocabulary for both surfaces. A conversation stores the owner's own reply
 * as `human` and the AI's as `agent`; a ticket stores them as `agent` and `ai`.
 * Owners shouldn't have to learn two words for the same thing.
 */
const AUTHOR_LABEL: Record<string, string> = { customer: "Customer", human: "You", agent: "AI agent", system: "System" };
const TICKET_AUTHOR_LABEL: Record<string, string> = { customer: "Customer", agent: "You", ai: "AI agent" };
/** Queue rows read better with "how long ago" than with a full timestamp. */
const relTime = (iso: string) => {
  const mins = Math.floor(Math.max(0, Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d ago` : new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};
const sentAt = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
/** Two-letter avatar initials: "Jenny Wilson" -> JW, "Vercel" -> VE. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const ICON_SEARCH = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
  </svg>
);
const ICON_SEND = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
);
const ICON_MIC = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M5 11a7 7 0 0014 0M12 18v4M8 22h8" />
  </svg>
);

/** Delivery tick beside an outgoing bubble — blue when sent, red when it failed. */
const TICK = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

/**
 * Inbox styling, kept local to the page (the global stylesheet stays untouched,
 * as on the Overview). Colours are the messaging design's: a violet outgoing
 * bubble, plain bordered incoming bubbles, blue delivery ticks, and a tinted row
 * for whichever conversation is open.
 */
const INBOX_CSS = `
/* Top bar: who has written in lately, search, start a new thread. */
.ibx-top{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:16px}
.ibx-avs{display:flex;align-items:center;flex:0 0 auto}
.ibx-avs .a{width:38px;height:38px;flex:0 0 38px;border-radius:50%;display:flex;align-items:center;
  justify-content:center;font-size:12px;font-weight:700;color:#fff;background:var(--at-neutral-700);
  margin-left:-9px;box-shadow:0 0 0 3px var(--at-neutral-50)}
.ibx-avs .a:first-child{margin-left:0}
.ibx-avs .a.on{box-shadow:0 0 0 2px var(--at-neutral-50),0 0 0 4px #7C3AED}
.ibx-avs .a.unread{box-shadow:0 0 0 2px var(--at-neutral-50),0 0 0 4px #22A45D}
.ibx-search{flex:1 1 220px;min-width:0;display:flex;align-items:center;gap:8px;background:var(--at-neutral-0);
  border:1px solid var(--at-neutral-200);border-radius:999px;padding:8px 14px}
.ibx-search input{flex:1 1 auto;min-width:0;border:0;outline:0;background:transparent;font-size:12.5px}
.ibx-search input::placeholder{color:var(--at-neutral-400)}
.ibx-search svg{color:var(--at-neutral-400);flex:0 0 auto}
.ibx-new{display:inline-flex;align-items:center;gap:10px;background:var(--at-neutral-0);
  border:1px solid var(--at-neutral-200);border-radius:999px;padding:5px 5px 5px 16px;font-size:12.5px;
  font-weight:600;color:var(--at-neutral-900);cursor:pointer;flex:0 0 auto}
.ibx-new i{width:32px;height:32px;border-radius:50%;background:var(--at-neutral-900);color:#fff;font-style:normal;
  display:flex;align-items:center;justify-content:center;font-size:18px;line-height:1}
.ibx-new:hover i{background:#7C3AED}

.ibx-thav{width:38px;height:38px;flex:0 0 38px;border-radius:50%;background:var(--at-neutral-700);color:#fff;
  font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center}
.ibx-day{display:flex;justify-content:center;margin:14px 0 12px}
.ibx-day span{font-size:11px;color:var(--at-neutral-400)}
.ibx-row{display:flex;align-items:flex-end;gap:7px;margin-bottom:6px}
.ibx-row.mine{justify-content:flex-end}
.ibx-bubble{max-width:78%;padding:10px 13px;border-radius:14px;font-size:12.5px;line-height:1.55;
  white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word}
.ibx-row.theirs .ibx-bubble{background:var(--at-neutral-0);border:1px solid var(--at-neutral-200);
  color:var(--at-neutral-900);border-bottom-left-radius:5px}
.ibx-row.mine .ibx-bubble{background:#7C3AED;color:#fff;border-bottom-right-radius:5px}
.ibx-row.mine.agent .ibx-bubble{background:#EDE9FE;color:#4C1D95}
.ibx-tick{color:#2563EB;flex:0 0 auto;margin-bottom:3px}
.ibx-tick.bad{color:#DC3545}
.ibx-sender{display:flex;align-items:center;gap:7px;margin:0 0 14px 2px}
.ibx-sender.mine{flex-direction:row-reverse;margin-left:0;margin-right:2px}
.ibx-sender .av{width:22px;height:22px;flex:0 0 22px;border-radius:50%;background:var(--at-neutral-700);color:#fff;
  font-size:8px;font-weight:700;display:flex;align-items:center;justify-content:center}
.ibx-sender b{font-size:11px;font-weight:600;color:var(--at-neutral-900)}
.ibx-sender i{font-size:10px;font-style:normal;color:var(--at-neutral-400)}
.ibx-note{align-self:center;max-width:92%;background:#FEF3C7;color:#92400E;border-radius:10px;
  padding:8px 12px;font-size:11.5px;margin-bottom:10px}

/* Composer: rounded field with attach + send inside, violet mic alongside. */
.ibx-comp{display:flex;align-items:center;gap:9px}
.ibx-comp .box{flex:1 1 auto;min-width:0;display:flex;align-items:center;gap:7px;background:var(--at-neutral-0);
  border:1px solid var(--at-neutral-200);border-radius:22px;padding:5px 7px 5px 13px}
.ibx-comp .box textarea{flex:1 1 auto;min-width:0;border:0;outline:0;background:transparent;font-size:12.5px;
  resize:none;padding:7px 0;max-height:110px}
.ibx-icobtn{border:0;background:transparent;color:var(--at-neutral-500);width:30px;height:30px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;cursor:pointer;flex:0 0 30px}
.ibx-icobtn:hover{background:var(--at-neutral-100);color:var(--at-neutral-900)}
.ibx-icobtn:disabled{opacity:.4;cursor:default}
.ibx-mic{flex:0 0 40px;width:40px;height:40px;border:0;border-radius:50%;background:#7C3AED;color:#fff;
  display:flex;align-items:center;justify-content:center;cursor:pointer}
.ibx-mic:hover{background:#6D28D9}
.ibx-mic.on{background:#DC3545}

/* Chats rail */
.ibx-chat{display:flex;align-items:center;gap:10px;width:100%;text-align:left;border:0;background:transparent;
  border-radius:10px;padding:9px 10px;cursor:pointer}
.ibx-chat:hover{background:var(--at-neutral-50)}
.ibx-chat.sel{background:#E7F3FC}
.ibx-chat .av{position:relative;flex:0 0 34px;width:34px;height:34px;border-radius:50%;background:var(--at-neutral-700);
  color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center}
.ibx-chat .av .dot{position:absolute;right:-1px;bottom:-1px;width:10px;height:10px;border-radius:50%;
  background:#DC3545;box-shadow:0 0 0 2px var(--at-neutral-0)}
.ibx-chat .txt{min-width:0;flex:1 1 auto}
.ibx-chat .txt b{display:block;font-size:12.5px;font-weight:600;color:var(--at-neutral-900);line-height:1.25;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ibx-chat .txt span{display:block;font-size:11px;color:var(--at-neutral-500);line-height:1.3;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ibx-chat .tm{flex:0 0 auto;font-size:10.5px;color:var(--at-neutral-400);align-self:flex-start;padding-top:2px}
`;

/** Long URLs, order ids and tracking numbers must wrap instead of stretching the bubble. */
const BUBBLE_STYLE: React.CSSProperties = { maxWidth: "85%", whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word" };
const BUBBLE_META = "d-flex flex-wrap align-items-center gap-1 text-uppercase opacity-75 mb-1";

const WA_WINDOW_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 500;

/**
 * Owner-facing buckets, not raw enums: conversations and tickets use different
 * status words for the same three situations, and filtering on the raw values
 * made an item vanish from every chip the moment you replied to it.
 *   needs_reply = conversation open/escalated + ticket open
 *   waiting     = conversation handled/snoozed + ticket pending
 *   done        = conversation closed + ticket resolved/closed
 */
type QueueFilter = "all" | "unread" | "needs_reply" | "waiting" | "escalated" | "done" | "tickets";
const QUEUE_FILTERS: { v: QueueFilter; label: string }[] = [
  { v: "all", label: "All" },
  { v: "unread", label: "Unread" },
  { v: "needs_reply", label: "Needs reply" },
  { v: "waiting", label: "Waiting" },
  { v: "escalated", label: "Taken over" },
  { v: "done", label: "Done" },
  { v: "tickets", label: "Tickets" },
];
/** Stable identity for a queue row (ids are only unique within their own table). */
const itemKey = (it: QueueItem) => `${it.kind}:${it.id}`;
/** A ticket has no unread flag — an untouched (still `open`) ticket is the equivalent. */
const isUnread = (it: QueueItem) => (it.kind === "conversation" ? it.conv.unread : it.ticket.status === "open");
const inBucket = (it: QueueItem, f: QueueFilter): boolean => {
  switch (f) {
    case "all": return true;
    case "unread": return isUnread(it);
    case "needs_reply":
      return it.kind === "conversation"
        ? it.conv.status === "open" || it.conv.status === "escalated"
        : it.ticket.status === "open";
    case "waiting":
      return it.kind === "conversation"
        ? it.conv.status === "handled" || it.conv.status === "snoozed"
        : it.ticket.status === "pending";
    case "escalated": return it.kind === "conversation" && it.conv.status === "escalated";
    case "done":
      return it.kind === "conversation"
        ? it.conv.status === "closed"
        : it.ticket.status === "resolved" || it.ticket.status === "closed";
    case "tickets": return it.kind === "ticket";
  }
};
const CHANNEL_FILTERS = ["", "sms", "whatsapp", "web", "voice", "email"];
const SNOOZE_OPTIONS: { label: string; ms: number }[] = [
  { label: "1 hour", ms: 3_600_000 },
  { label: "4 hours", ms: 4 * 3_600_000 },
  { label: "24 hours", ms: 24 * 3_600_000 },
  { label: "3 days", ms: 3 * 24 * 3_600_000 },
];
const SHORTCUTS: [string, string][] = [
  ["j / k", "Move through the list"],
  ["Enter", "Open the highlighted item"],
  ["⌘/Ctrl + Enter", "Send"],
  ["⇧ ⌘/Ctrl + Enter", "Send & close / resolve"],
  ["e", "Close conversation · resolve ticket"],
  ["s", "Snooze menu"],
  ["/", "Focus search"],
  ["Esc", "Back to the list"],
];

/** One row in the unified queue: a conversation or a helpdesk ticket. */
type QueueItem =
  | { kind: "conversation"; id: string; at: string; conv: Conversation }
  | { kind: "ticket"; id: string; at: string; ticket: Ticket };

type Classification = { category: string; sentiment: string; priority: string; summary: string };

// WhatsApp template helpers: pull {{1}},{{2}}… placeholders and render with filled values.
const tplKeys = (body: string) => Array.from(new Set([...body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => m[1]))).sort((a, b) => +a - +b);
const renderTpl = (body: string, vars: Record<string, string>) => body.replace(/\{\{(\d+)\}\}/g, (_, n) => vars[n] || `{{${n}}}`);
/** Named snippet variables, substituted when inserted into the composer. */
const fillVars = (body: string, vars: { name: string; business: string }) =>
  body.replace(/\{\{\s*name\s*\}\}/gi, vars.name).replace(/\{\{\s*business\s*\}\}/gi, vars.business);

// ─────────────────────────────────────────────────────────────────────────────
// Presentational subcomponents
// ─────────────────────────────────────────────────────────────────────────────

/** Close a popover when the next mousedown lands outside its wrapper. */
function useOutsideClick<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, onClose]);
  return ref;
}

/** `open` lives on the page so Escape can close this before it clears the selection. */
function ShortcutsHint({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const wrapRef = useOutsideClick<HTMLDivElement>(open, useCallback(() => setOpen(false), [setOpen]));
  return (
    <div className="position-relative d-inline-block flex-shrink-0" ref={wrapRef}>
      <button
        type="button"
        className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none text-nowrap"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span aria-hidden="true">⌨ </span>Shortcuts
      </button>
      {open && (
        <div className="position-absolute bg-neutral-0 border-100 rounded-3 shadow p-3" style={{ zIndex: 40, width: 280, right: 0, top: "100%" }}>
          <div className="fw-600 fz-font-sm mb-2">Keyboard shortcuts</div>
          {SHORTCUTS.map(([k, d]) => (
            <div key={k} className="d-flex justify-content-between gap-3 fz-font-sm mb-1">
              <span className="neutral-500">{d}</span>
              <code className="neutral-800 text-nowrap">{k}</code>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Conversation message bubble. Emails whose meta carries an html body render in a sandboxed iframe. */
/** `showChannel` marks which channel a message arrived on. Only set when the
 *  customer has actually used more than one — a badge on every bubble of a
 *  single-channel thread is noise. */
function MessageBubble({ m, showChannel = false }: { m: TimelineMessage; showChannel?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  if (m.role === "note") {
    return (
      <div className="ibx-note" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word" }}>
        <span className="text-uppercase opacity-75 me-1" style={{ fontSize: 9 }}>Internal note</span>{m.body}
      </div>
    );
  }
  const mine = m.role !== "customer";
  const meta = (m.meta ?? {}) as Record<string, unknown>;
  const html = typeof meta.html === "string" && meta.html.trim() ? meta.html : null;
  const subject = typeof meta.subject === "string" && meta.subject.trim() ? meta.subject : null;
  const chanBadge = showChannel && m.channel_type ? channelLabel(m.channel_type) : null;
  const failed = m.delivery_status === "failed";
  const delivery = m.delivery_status ? DELIVERY_LABEL[m.delivery_status] : undefined;
  const label = AUTHOR_LABEL[m.role] ?? m.role;
  return (
    <>
      {/* mine = anything the business sent. The AI agent keeps its own lilac so a
          reply the agent wrote is never mistaken for one a person wrote. */}
      <div className={`ibx-row ${mine ? (m.role === "agent" ? "mine agent" : "mine") : "theirs"}`}>
        <div className="ibx-bubble" style={html ? { width: "85%", maxWidth: "85%" } : undefined}>
        {subject && <div className="fw-600 mb-1">{subject}</div>}
        {html ? (
          // sandbox="" blocks scripts/navigation; content scrolls inside a fixed max height.
          <>
            <iframe sandbox="" srcDoc={html} title="Email content" className="w-100 rounded-2 bg-white" style={{ border: 0, height: expanded ? 640 : 260, maxHeight: expanded ? "70vh" : 260 }} />
            <button type="button" className="btn btn-link btn-sm p-0 mt-1 text-decoration-none fz-font-sm" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>
              {expanded ? "Show less" : "Show full email"}
            </button>
          </>
        ) : (
          m.body
        )}
        </div>
        {mine && (
          <span className={`ibx-tick${failed ? " bad" : ""}`} title={delivery ?? undefined} aria-hidden="true">
            {TICK}
          </span>
        )}
      </div>

      {/* Sender strip under the bubble, as in the design: avatar, name, time. */}
      <div className={`ibx-sender${mine ? " mine" : ""}`}>
        <span className="av" aria-hidden="true">{label.slice(0, 2).toUpperCase()}</span>
        <b>{label}</b>
        <i>{sentAt(m.created_at)}</i>
        {chanBadge && <i>· {chanBadge}</i>}
        {mine && delivery && <i className={failed ? "text-danger fw-600" : ""}>· {delivery}</i>}
      </div>
    </>
  );
}

function TicketBubble({ m }: { m: TicketMessage }) {
  return (
    <div
      className={`px-3 py-2 rounded-4 fz-font-md ${m.author === "customer" ? "bg-neutral-100 neutral-900 align-self-start" : m.author === "ai" ? "bg-primary-subtle text-primary-emphasis align-self-end" : "bg-neutral-900 text-white align-self-end"}`}
      style={BUBBLE_STYLE}
    >
      <div className={BUBBLE_META} style={{ fontSize: 10 }}>
        <span>{TICKET_AUTHOR_LABEL[m.author] ?? m.author}</span>
        <span>· {sentAt(m.created_at)}</span>
      </div>
      {m.body}
    </div>
  );
}

/** One control shape for "what state is this in?", used by both threads. */
function StatusPills<T extends string>({
  label, options, current, onPick,
}: {
  label: string;
  options: { v: T; label: string }[];
  current: T;
  onPick: (v: T) => void;
}) {
  return (
    <div className="d-flex flex-wrap gap-2" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          aria-pressed={current === o.v}
          className={`btn btn-sm rounded-pill px-3 ops-tap ${current === o.v ? "btn-dark" : "btn-outline-secondary"}`}
          onClick={() => onPick(o.v)}
          disabled={current === o.v}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** The saved-replies picker — identical on both threads, so it lives once. */
function SnippetSelect({
  snippets, onInsert, onManage,
}: {
  snippets: CannedResponse[];
  onInsert: (c: CannedResponse) => void;
  onManage: () => void;
}) {
  return (
    <select
      className="form-select form-select-sm rounded-3"
      style={{ width: "auto" }}
      aria-label="Saved replies"
      value=""
      onChange={(e) => {
        if (e.target.value === "__manage") { onManage(); return; }
        const c = snippets.find((x) => x.id === e.target.value);
        if (c) onInsert(c);
      }}
    >
      <option value="">Saved replies…</option>
      {snippets.map((c) => <option key={c.id} value={c.id}>{c.title || c.shortcut}</option>)}
      <option value="__manage">＋ Manage saved replies…</option>
    </select>
  );
}

/** AI drafts are previewed before they go anywhere — same card for both threads. */
function AiDraftCard({
  summary, text, unsure, onUse,
}: {
  summary?: string;
  text: string;
  /** The model was not confident — say so in words, not as a percentage. */
  unsure?: boolean;
  onUse: () => void;
}) {
  return (
    <div className="border-100 rounded-3 p-3 mb-2 bg-neutral-50">
      {summary && <div className="fz-font-sm neutral-500 mb-1"><strong>Summary:</strong> {summary}</div>}
      {text && (
        <>
          {unsure && <div className="fz-font-sm text-warning-emphasis mb-1">The AI is unsure — read this before sending.</div>}
          <div className="fz-font-md neutral-800" style={{ whiteSpace: "pre-wrap" }}>{text}</div>
          <button type="button" className="btn btn-dark btn-sm rounded-pill px-3 mt-2" onClick={onUse}>Use this reply</button>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// The Inbox
// ─────────────────────────────────────────────────────────────────────────────

export default function InboxPage() {
  const { orgId, org, console: consoleCfg } = useOutletContext<OpsContext>();
  const orgCurrency = org.currency || "USD";
  // ?c=<conversation id> / ?t=<ticket id> — makes an open thread linkable and
  // survives a refresh (the AI Agent overview links straight to a conversation).
  const [params, setParams] = useSearchParams();

  // Queue data (kept live — this console streams realtime changes, so it skips the SWR cache by design).
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  /** Raising the page size refetches — the button has to say so and stand down. */
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE_SIZE);

  // Selection + thread
  const [selected, setSelected] = useState<QueueItem | null>(null);
  const [messages, setMessages] = useState<TimelineMessage[]>([]);
  const [ticketMsgs, setTicketMsgs] = useState<TicketMessage[]>([]);
  const [calls, setCalls] = useState<ConversationCall[]>([]);
  const [showTranscript, setShowTranscript] = useState(false);
  /** The keyboard cursor is stored as an item key, not an index — realtime
   *  re-sorts the queue, which used to slide the highlight onto another row. */
  const [cursorKey, setCursorKey] = useState<string | null>(null);
  /** The hard ring only appears once someone actually uses the keyboard. */
  const [keyboardActive, setKeyboardActive] = useState(false);

  // Composer
  const [draft, setDraft] = useState("");
  // Dictation for the composer, via the browser's own speech API — free, keyless,
  // and it fills the field so the text is reviewable before it is sent.
  const [dictating, setDictating] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [mode, setMode] = useState<"reply" | "note">("reply");
  const [busy, setBusy] = useState(false);
  const [sendNote, setSendNote] = useState<string | null>(null);

  // Filters
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [fChannel, setFChannel] = useState("");
  const [fQueue, setFQueue] = useState<QueueFilter>("all");

  // Reference data
  const [canned, setCanned] = useState<CannedResponse[]>([]);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [viewers, setViewers] = useState<string[]>([]);

  // Panels & popovers
  const [suggestion, setSuggestion] = useState<{ summary: string; suggestion: string } | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const [tpl, setTpl] = useState<CannedResponse | null>(null);
  const [tplVars, setTplVars] = useState<Record<string, string>>({});
  const [composer, setComposer] = useState<{ to: string; subject: string; body?: string; conversationId?: string } | null>(null);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [requestingCsat, setRequestingCsat] = useState(false);

  // Ticket AI
  const [confidence, setConfidence] = useState<number | null>(null);
  const [aiDrafting, setAiDrafting] = useState(false);
  const [classifying, setClassifying] = useState(false);

  // New-ticket form
  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [tForm, setTForm] = useState({ subject: "", customer: "", email: "", message: "" });

  // Calls (kept from the original console)
  const [calling, setCalling] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [callMode, setCallMode] = useState<"ai" | "bridge" | "browser">("ai");
  const [callOpening, setCallOpening] = useState("");
  const [callPhone, setCallPhone] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [muted, setMuted] = useState(false);
  const deviceRef = useRef<Device | null>(null);
  const callRef = useRef<Call | null>(null);

  const bodyRef = useRef<HTMLDivElement>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  /** Only one thread is open at a time, so both reply boxes can share one ref.
   *  The send shortcut checks it, so ⌘+Enter in the search box can't send. */
  const composerRef = useRef<HTMLTextAreaElement>(null);
  /** Half-written replies, kept per item so switching threads never loses one. */
  const draftsRef = useRef<Record<string, { draft: string; subject: string }>>({});
  const snoozeWrapRef = useOutsideClick<HTMLDivElement>(snoozeOpen, useCallback(() => setSnoozeOpen(false), []));

  const selConv = selected?.kind === "conversation" ? selected.conv : null;
  const selTicket = selected?.kind === "ticket" ? selected.ticket : null;

  // The number to dial, or null when there is nothing dialable on the
  // conversation. Voice threads with no PSTN leg carry a label ("web visitor")
  // in customer_phone, so a truthiness check would offer a call the backend
  // rejects — gate every call affordance on this instead.
  const callTo = callablePhone(selConv?.customer_phone);

  const memberName = (id: string | null) => (id ? members.find((m) => m.user_id === id)?.full_name || "Teammate" : "");
  const scrollThread = (smooth = true) =>
    setTimeout(() => bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: smooth ? "smooth" : "auto" }), 60);

  // ── Search debounce (300ms — no query per keystroke) ──────────────────────
  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  // ── Load the unified queue ────────────────────────────────────────────────
  const load = useCallback(async () => {
    const [c, t] = await Promise.all([
      listConversations(orgId, { search, channel: fChannel, limit }),
      listTickets(orgId),
    ]);
    setError(c.error || t.error);
    setConvos(c.data);
    setTickets(t.data);
    setLoading(false);
    setLoadingMore(false);
    // Keep the open item in sync with refreshed rows.
    setSelected((sel) => {
      if (!sel) return sel;
      if (sel.kind === "conversation") {
        const next = c.data.find((x) => x.id === sel.id);
        return next ? { ...sel, at: next.last_message_at || next.created_at, conv: next } : sel;
      }
      const next = t.data.find((x) => x.id === sel.id);
      return next ? { ...sel, at: next.last_activity_at || next.created_at, ticket: next } : sel;
    });
  }, [orgId, search, fChannel, limit]);

  useEffect(() => { load(); }, [load]);

  // Refs so realtime/keyboard callbacks always see the latest state.
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const loadRef = useRef(load);
  loadRef.current = load;

  // ── Live mode: stream messages, conversations, tickets ────────────────────
  useEffect(() => {
    const ch = supabase
      .channel(`inbox-${orgId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversation_messages", filter: `organization_id=eq.${orgId}` },
        async (payload) => {
          const m = payload.new as ConversationMessage & { conversation_id: string };
          const sel = selectedRef.current;
          if (sel?.kind === "conversation") {
            // The timeline spans every channel this customer uses, so a message
            // arriving on one of their *other* threads belongs on screen too —
            // matching only the selected conversation would drop it.
            let onScreen = m.conversation_id === sel.id;
            setMessages((prev) => {
              if (prev.some((x) => x.id === m.id)) return prev;
              const known = prev.find((x) => x.conversation_id === m.conversation_id);
              if (!onScreen && !known) return prev;
              onScreen = true;
              return [...prev, { ...m, channel_type: known?.channel_type ?? sel.conv.channel_type }];
            });
            if (onScreen) {
              setTimeout(() => bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" }), 60);
              // The thread is on screen, so an inbound landing here is already read —
              // clear the flag the DB trigger just set before the list refresh below.
              if (m.role === "customer") await reportMutation(markConversationRead(m.conversation_id));
            }
          }
          loadRef.current();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations", filter: `organization_id=eq.${orgId}` },
        () => loadRef.current(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets", filter: `organization_id=eq.${orgId}` },
        () => loadRef.current(),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ticket_messages", filter: `organization_id=eq.${orgId}` },
        (payload) => {
          const m = payload.new as TicketMessage & { ticket_id: string };
          const sel = selectedRef.current;
          if (sel?.kind === "ticket" && m.ticket_id === sel.id) {
            setTicketMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
            setTimeout(() => bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" }), 60);
          }
          loadRef.current();
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [orgId]);

  useEffect(() => {
    (async () => {
      setMe(await currentUserId());
      setCanned((await listCanned(orgId)).data);
      setMembers((await listMembers(orgId)).data);
    })();
  }, [orgId]);
  const refreshCanned = useCallback(async () => setCanned((await listCanned(orgId)).data), [orgId]);

  // ── Presence heartbeat + collision polling while a conversation is open ───
  useEffect(() => {
    if (!selected || selected.kind !== "conversation" || !me) return;
    let active = true;
    const convId = selected.id;
    const beat = async () => {
      await touchPresence(orgId, convId, me);
      const { data } = await listViewers(convId, me);
      if (active) setViewers(data.map((v) => v.user_id));
    };
    beat();
    const t = setInterval(beat, 15_000);
    return () => { active = false; clearInterval(t); setViewers([]); };
  }, [selected, me, orgId]);

  // ── Merge + filter the queue ──────────────────────────────────────────────
  const items = useMemo<QueueItem[]>(() => {
    const cs: QueueItem[] = convos.map((c) => ({ kind: "conversation", id: c.id, at: c.last_message_at || c.created_at, conv: c }));
    const q = search.toLowerCase();
    const matches = (t: Ticket) =>
      !q || t.subject.toLowerCase().includes(q) || t.customer_name.toLowerCase().includes(q) || t.customer_email.toLowerCase().includes(q);
    // Tickets are email-based; hide them when a non-email channel filter is active.
    const showTickets = !fChannel || fChannel === "email";
    const ts: QueueItem[] = showTickets
      ? tickets.filter(matches).map((t) => ({ kind: "ticket", id: t.id, at: t.last_activity_at || t.created_at, ticket: t }))
      : [];
    return [...cs, ...ts].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [convos, tickets, fChannel, search]);

  const counts = useMemo(() => {
    const n = {} as Record<QueueFilter, number>;
    for (const f of QUEUE_FILTERS) n[f.v] = items.filter((it) => inBucket(it, f.v)).length;
    return n;
  }, [items]);

  const visible = useMemo(() => items.filter((it) => inBucket(it, fQueue)), [items, fQueue]);
  /** Derived, so a re-sorted queue keeps the highlight on the same item. */
  const cursor = useMemo(() => visible.findIndex((it) => itemKey(it) === cursorKey), [visible, cursorKey]);

  // "Nothing matches this filter" and "nothing here yet" are different problems.
  const filtersActive = !!search || !!fChannel || fQueue !== "all";
  const clearFilters = useCallback(() => {
    setSearchInput("");
    setSearch("");
    setFChannel("");
    setFQueue("all");
  }, []);

  // Local write-through so list + open thread stay in sync after a mutation.
  const updateConv = useCallback((id: string, patch: Partial<Conversation>) => {
    setConvos((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    setSelected((sel) => (sel?.kind === "conversation" && sel.id === id ? { ...sel, conv: { ...sel.conv, ...patch } } : sel));
  }, []);
  const updateTicket = useCallback((id: string, patch: Partial<Ticket>) => {
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    setSelected((sel) => (sel?.kind === "ticket" && sel.id === id ? { ...sel, ticket: { ...sel.ticket, ...patch } } : sel));
  }, []);

  // ── Open an item ──────────────────────────────────────────────────────────
  async function openItem(it: QueueItem) {
    // Park whatever is in the composer under the item it belongs to, then bring
    // back that item's own draft — switching threads must never destroy typing.
    const prev = selectedRef.current;
    const key = itemKey(it);
    if (prev && itemKey(prev) !== key) {
      if (draft.trim() || emailSubject.trim()) draftsRef.current[itemKey(prev)] = { draft, subject: emailSubject };
      else delete draftsRef.current[itemKey(prev)];
    }
    // Re-opening the row that's already open keeps whatever is being typed.
    const restored =
      prev && itemKey(prev) === key
        ? { draft, subject: emailSubject }
        : draftsRef.current[key] ?? { draft: "", subject: "" };
    setSelected(it);
    setCursorKey(key);
    setParams((p) => {
      const next = new URLSearchParams(p);
      next.delete(it.kind === "conversation" ? "t" : "c");
      next.set(it.kind === "conversation" ? "c" : "t", it.id);
      return next;
    }, { replace: true });
    setSuggestion(null);
    setSendNote(null);
    setMode("reply");
    setDraft(restored.draft);
    setEmailSubject(restored.subject);
    setTpl(null);
    setTplVars({});
    setSnoozeOpen(false);
    setConfidence(null);
    setShowTranscript(false);
    setCalls([]);
    setCallOpen(false);
    if (it.kind === "conversation") {
      setTicketMsgs([]);
      // One customer, one timeline: every channel they've used, in order.
      const { data } = await listContactTimeline(orgId, it.conv.contact_id, it.id);
      setMessages(data);
      if (it.conv.channel_type === "voice") {
        const r = await listCallsForConversation(it.id);
        setCalls(r.data);
      }
      // Opening marks it read (trigger set it unread on the last inbound).
      if (it.conv.unread) {
        const { error } = await markConversationRead(it.id);
        if (error) toastError(error);
        else updateConv(it.id, { unread: false });
      }
    } else {
      setMessages([]);
      const { data } = await getTicketMessages(it.id);
      setTicketMsgs(data);
    }
    scrollThread(false);
  }

  /** Leaving a thread parks its draft and drops the URL pointer. */
  function closeSelected() {
    const prev = selectedRef.current;
    if (prev) {
      if (draft.trim() || emailSubject.trim()) draftsRef.current[itemKey(prev)] = { draft, subject: emailSubject };
      else delete draftsRef.current[itemKey(prev)];
    }
    setSelected(null);
    setParams((p) => {
      const next = new URLSearchParams(p);
      next.delete("c");
      next.delete("t");
      return next;
    }, { replace: true });
  }
  /** A sent reply must not come back when the owner returns to the thread. */
  function dropDraft(it: QueueItem | null) {
    if (it) delete draftsRef.current[itemKey(it)];
  }

  // ── Deep link: ?c=<conversation> / ?t=<ticket> opens that thread on arrival ──
  const openItemRef = useRef(openItem);
  openItemRef.current = openItem;
  const deepLinkDone = useRef(false);
  useEffect(() => {
    if (deepLinkDone.current || loading) return;
    deepLinkDone.current = true;
    const cid = params.get("c");
    const tid = params.get("t");
    if (!cid && !tid) return;
    const target = items.find((it) =>
      cid ? it.kind === "conversation" && it.id === cid : it.kind === "ticket" && it.id === tid,
    );
    if (target) openItemRef.current(target);
    else toastError("That conversation isn't in the current list — clear the filters or search for it.");
  }, [items, loading, params]);

  async function refreshThread() {
    const sel = selectedRef.current;
    if (!sel || sel.kind !== "conversation") return;
    const { data } = await listContactTimeline(orgId, sel.conv.contact_id, sel.id);
    setMessages(data);
    load();
    scrollThread();
  }
  async function refreshTicketThread() {
    const sel = selectedRef.current;
    if (!sel || sel.kind !== "ticket") return;
    const { data } = await getTicketMessages(sel.id);
    setTicketMsgs(data);
    load();
    scrollThread();
  }

  // ── WhatsApp 24h window ───────────────────────────────────────────────────
  const lastInbound = [...messages].reverse().find((m) => m.role === "customer");
  const waWindowClosed =
    selConv?.channel_type === "whatsapp" &&
    (!lastInbound || Date.now() - new Date(lastInbound.created_at).getTime() > WA_WINDOW_MS);

  // ── Sending ───────────────────────────────────────────────────────────────
  /** Send the composer. closeAfter: conversation → Send & close, ticket → Send & resolve. */
  async function send(closeAfter = false) {
    const text = draft.trim();
    if (!selected || !text || busy) return;
    setBusy(true);
    setSendNote(null);
    try {
      if (selected.kind === "ticket") {
        await sendTicketFlow(selected.ticket, text, closeAfter);
        return;
      }
      const conv = selected.conv;
      if (mode === "note") {
        const ok = await reportMutation(addInternalNote(orgId, conv.id, text), "Note saved");
        if (!ok) return;
        setDraft("");
        dropDraft(selected);
        refreshThread();
        return;
      }
      const r = await sendConversationReply(
        orgId, conv.id, text, conv.channel_type,
        conv.channel_type === "email" ? emailSubject.trim() || undefined : undefined,
      );
      if (r.windowClosed) {
        setSendNote("WhatsApp's 24-hour window is closed — send an approved template (below) instead.");
        toastError("WhatsApp window closed — use an approved template.");
        return;
      }
      if (!r.ok || r.error) {
        const msg = r.error ?? "Could not send.";
        setSendNote(msg);
        toastError(msg);
        return;
      }
      if (r.delivery_status === "simulated") {
        setSendNote("Recorded, but no live channel is configured — the message was not actually delivered.");
        toast("Recorded — no live channel configured, nothing was delivered.", "info");
      } else {
        toast(closeAfter ? "Sent — conversation closed." : "Sent");
      }
      setDraft("");
      setEmailSubject("");
      dropDraft(selected);
      // Triage: a reply advances open/escalated → handled; Send & close closes.
      const next: ConvStatus | null = closeAfter ? "closed" : conv.status === "open" || conv.status === "escalated" ? "handled" : null;
      if (next) {
        const ok = await reportMutation(setConversationStatus(conv.id, next));
        if (ok) updateConv(conv.id, { status: next });
      }
      refreshThread();
    } finally {
      setBusy(false);
    }
  }

  /** Ticket replies go through the ticket-reply edge fn and surface every delivery outcome. */
  async function sendTicketFlow(t: Ticket, text: string, resolveAfter: boolean) {
    const r = await sendTicketReply(orgId, t.id, text, { asAi: false, resolve: resolveAfter });
    if (!r.ok || r.error) {
      // Fall back to the store-only path so the reply is never lost.
      const { error } = await addTicketMessage(orgId, t.id, "agent", text);
      if (error) {
        setSendNote(r.error ?? error);
        toastError(r.error ?? error ?? "Could not send the reply.");
        return;
      }
      setSendNote("Saved, but email delivery failed — the customer has not been notified.");
      toastError("Saved, but email delivery failed — the customer has not been notified.");
    } else if (r.delivery === "sent") {
      setSendNote(null);
      toast(resolveAfter ? "Reply emailed — ticket resolved." : "Reply emailed to the customer.");
    } else if (r.delivery === "no-email") {
      setSendNote("Saved. This ticket has no customer email, so nothing was sent.");
      toast("Saved — this ticket has no customer email, nothing was sent.", "info");
    } else {
      // 'failed' / 'simulated' / anything else: stored, but the email did not go out.
      setSendNote("Saved, but the email could not be delivered — the customer has not been notified.");
      toastError("Saved, but the email could not be delivered — the customer has not been notified.");
    }
    setDraft("");
    dropDraft(selectedRef.current);
    if (r.ok && !r.error) {
      if (resolveAfter) updateTicket(t.id, { status: "resolved" });
      else if (t.status === "open") updateTicket(t.id, { status: "pending" });
    }
    refreshTicketThread();
  }

  async function sendTemplate() {
    if (!selConv || !tpl || !tpl.whatsapp_template_sid || busy) return;
    setBusy(true);
    setSendNote(null);
    const rendered = renderTpl(tpl.body, tplVars);
    const r = await sendConversationTemplate(orgId, selConv.id, tpl.whatsapp_template_sid, tplVars, rendered);
    setBusy(false);
    if (!r.ok || r.error) {
      const msg = r.error ?? "Could not send the template.";
      setSendNote(msg);
      toastError(msg);
      return;
    }
    toast("Template sent");
    setTpl(null);
    setTplVars({});
    refreshThread();
  }

  async function runSuggest() {
    if (!selConv) return;
    setSuggesting(true);
    const r = await suggestReply(orgId, selConv.id);
    setSuggesting(false);
    if (r.error) { toastError(r.error); return; }
    setSuggestion({ summary: r.summary, suggestion: r.suggestion });
  }

  async function aiDraftTicket() {
    if (!selTicket || aiDrafting) return;
    setAiDrafting(true);
    const { reply, confidence: conf, error } = await draftAiReply(orgId, selTicket.id);
    setAiDrafting(false);
    if (error) { toastError(error); return; }
    if (reply) {
      // Same shape as the conversation path: preview first, insert on request.
      setSuggestion({ summary: "", suggestion: reply });
      setConfidence(conf);
    }
  }

  async function classifyTicket() {
    if (!selTicket || classifying) return;
    setClassifying(true);
    const { data, error } = await invokeAction<Classification>(orgId, "classify_ticket", { ticketId: selTicket.id });
    setClassifying(false);
    if (error) { toastError(error); return; }
    if (data) {
      updateTicket(selTicket.id, {
        category: data.category,
        sentiment: data.sentiment,
        priority: (["low", "normal", "high"].includes(data.priority) ? data.priority : "normal") as Ticket["priority"],
        ai_summary: data.summary,
      });
      toast("Ticket classified");
    }
  }

  // ── Triage actions ────────────────────────────────────────────────────────
  async function setStatus(s: ConvStatus) {
    if (!selConv) return;
    const ok = await reportMutation(setConversationStatus(selConv.id, s), CONV_STATUS_TOAST[s]);
    if (ok) { updateConv(selConv.id, { status: s }); load(); }
  }
  async function changeTicketStatus(s: TicketStatus) {
    if (!selTicket) return;
    const ok = await reportMutation(setTicketStatus(selTicket.id, s), TICKET_STATUS_TOAST[s]);
    if (ok) { updateTicket(selTicket.id, { status: s }); load(); }
  }
  async function addTag(e: React.FormEvent) {
    e.preventDefault();
    const t = tagDraft.trim();
    if (!selConv || !t || selConv.tags.includes(t)) { setTagDraft(""); return; }
    const tags = [...selConv.tags, t];
    const ok = await reportMutation(setConversationTags(selConv.id, tags), "Tag added");
    if (ok) { updateConv(selConv.id, { tags }); setTagDraft(""); }
  }
  async function removeTag(t: string) {
    if (!selConv) return;
    const tags = selConv.tags.filter((x) => x !== t);
    const ok = await reportMutation(setConversationTags(selConv.id, tags), "Tag removed");
    if (ok) updateConv(selConv.id, { tags });
  }
  async function assign(userId: string | null) {
    if (!selConv) return;
    const ok = await reportMutation(assignConversation(selConv.id, userId), userId ? "Assigned" : "Unassigned");
    if (ok) updateConv(selConv.id, { assigned_to: userId });
  }
  async function snoozeFor(ms: number) {
    if (!selConv) return;
    const until = new Date(Date.now() + ms).toISOString();
    const ok = await reportMutation(snoozeConversation(selConv.id, until), `Snoozed until ${new Date(until).toLocaleString()}.`);
    if (ok) { updateConv(selConv.id, { status: "snoozed", snoozed_until: until }); setSnoozeOpen(false); load(); }
  }
  async function unsnooze() {
    if (!selConv) return;
    const ok = await reportMutation(snoozeConversation(selConv.id, null), "Unsnoozed");
    if (ok) { updateConv(selConv.id, { status: "open", snoozed_until: null }); setSnoozeOpen(false); load(); }
  }

  /** Honest CSAT: send the customer the survey link over the conversation's channel. */
  async function requestRating() {
    if (!selConv || selConv.csat_requested || requestingCsat) return;
    setRequestingCsat(true);
    try {
      const msg = `How did we do? We'd love your feedback — it takes one tap: ${csatSurveyUrl(selConv.id)}`;
      const r = await sendConversationReply(orgId, selConv.id, msg, selConv.channel_type);
      if (r.windowClosed) { toastError("WhatsApp's 24-hour window is closed — the survey can't be sent right now."); return; }
      if (!r.ok || r.error) { toastError(r.error ?? "Could not send the rating request."); return; }
      const ok = await reportMutation(markCsatRequested(selConv.id), "Rating request sent");
      if (ok) { updateConv(selConv.id, { csat_requested: true }); refreshThread(); }
    } finally {
      setRequestingCsat(false);
    }
  }

  // ── New ticket ────────────────────────────────────────────────────────────
  async function submitTicket(e: React.FormEvent) {
    e.preventDefault();
    if (creatingTicket) return; // a second click on a slow link created a second ticket
    if (!tForm.subject.trim() || !tForm.customer.trim()) { toastError("A subject and customer name are required."); return; }
    setCreatingTicket(true);
    try {
      const { ticketId, error } = await createTicket(orgId, {
        subject: tForm.subject,
        customer_name: tForm.customer,
        customer_email: tForm.email.trim() || undefined,
        message: tForm.message,
      });
      if (error || !ticketId) { toastError(error ?? "Could not create the ticket."); return; }
      toast("Ticket created");
      drainEmbeddings(); // index it for RAG deflection
      setTForm({ subject: "", customer: "", email: "", message: "" });
      setNewTicketOpen(false);
      load();
    } finally {
      setCreatingTicket(false);
    }
  }

  // ── Calls (unchanged behaviour, feedback added) ───────────────────────────
  async function call() {
    if (!selConv || !callTo || calling) return;
    setCalling(true);
    setSendNote(null);
    const r = await placeCall(orgId, callTo, {
      conversationId: selConv.id,
      mode: callMode as "ai" | "bridge",
      opening: callMode === "ai" ? callOpening.trim() || undefined : undefined,
      agentPhone: callMode === "bridge" ? callPhone.trim() || undefined : undefined,
    });
    setCalling(false);
    if (!r.ok) { toastError(r.error ?? "Call could not be placed."); return; }
    // A placed call is a success — it belongs in a toast, not in the yellow
    // banner this file uses for problems.
    toast(callMode === "bridge"
      ? `Calling you${callPhone.trim() ? ` on ${callPhone.trim()}` : ""} — pick up and we'll connect ${callTo}.`
      : `Calling ${callTo} — your AI agent will speak with them.`);
    setCallOpen(false);
  }
  function endBrowserCall() {
    try { callRef.current?.disconnect(); } catch { /* noop */ }
    try { deviceRef.current?.destroy(); } catch { /* noop */ }
    callRef.current = null;
    deviceRef.current = null;
    setInCall(false);
    setConnecting(false);
    setMuted(false);
  }
  async function startBrowserCall() {
    if (!selConv || !callTo || connecting || inCall) return;
    setConnecting(true);
    setSendNote(null);
    try {
      const { token, error } = await voiceToken(orgId);
      if (error || !token) { setConnecting(false); toastError(error ?? "Browser calling isn't configured."); return; }
      const { Device } = await import("@twilio/voice-sdk");
      const device = new Device(token, { logLevel: "error" });
      deviceRef.current = device;
      const c = await device.connect({ params: { To: callTo } });
      callRef.current = c;
      c.on("accept", () => { setInCall(true); setConnecting(false); });
      c.on("disconnect", endBrowserCall);
      c.on("cancel", endBrowserCall);
      c.on("error", (e: { message?: string }) => { toastError(`Call error: ${e?.message ?? "unknown"}`); endBrowserCall(); });
    } catch (e) {
      setConnecting(false);
      toastError(`Could not start the browser call: ${(e as Error)?.message ?? String(e)}`);
    }
  }
  function toggleMute() {
    const c = callRef.current;
    if (!c) return;
    const m = !muted;
    c.mute(m);
    setMuted(m);
  }
  useEffect(() => () => { try { callRef.current?.disconnect(); deviceRef.current?.destroy(); } catch { /* noop */ } }, []);

  // ── Snippets insertion ({{name}}/{{business}} substitution) ───────────────
  function insertSnippet(c: CannedResponse) {
    const name = (selConv?.customer_name || selTicket?.customer_name || "").trim() || "there";
    const body = fillVars(c.body, { name, business: org.name });
    setDraft((d) => (d ? d + "\n" : "") + body);
  }
  const templates = canned.filter((c) => c.is_whatsapp_template);
  const snippets = canned.filter((c) => {
    if (c.is_whatsapp_template) return false;
    const ch = selected ? (selected.kind === "ticket" ? "email" : selected.conv.channel_type) : "";
    return c.channel === "any" || c.channel === ch;
  });

  // ── Keyboard layer ────────────────────────────────────────────────────────
  const stateRef = useRef({ visible, cursor, snoozeOpen, shortcutsOpen, modalOpen: false, hasDraft: false });
  stateRef.current = { visible, cursor, snoozeOpen, shortcutsOpen, modalOpen: !!composer || repliesOpen, hasDraft: !!draft.trim() };
  const actionsRef = useRef<{ send: (c: boolean) => void; open: (it: QueueItem) => void; closeOrResolve: () => void; move: (d: number) => void; close: () => void }>({
    send: () => {}, open: () => {}, closeOrResolve: () => {}, move: () => {}, close: () => {},
  });
  actionsRef.current = {
    send,
    open: (it) => { openItem(it); },
    close: closeSelected,
    closeOrResolve: () => {
      const sel = selectedRef.current;
      if (!sel) return;
      if (sel.kind === "conversation") { if (sel.conv.status !== "closed") setStatus("closed"); }
      else if (sel.ticket.status !== "resolved") changeTicketStatus("resolved");
    },
    move: (delta: number) => {
      const { visible: vis, cursor: cur } = stateRef.current;
      if (vis.length === 0) return;
      // No cursor yet (fresh page, or the row left the filter): start at the top.
      const next = cur < 0 ? 0 : Math.max(0, Math.min(vis.length - 1, cur + delta));
      setKeyboardActive(true);
      setCursorKey(itemKey(vis[next]));
      requestAnimationFrame(() => {
        // Focus, not just scroll — otherwise Tab-focus and the j/k cursor drift
        // apart and Enter opens whichever row the cursor happens to sit on.
        const el = listScrollRef.current?.querySelector<HTMLElement>(`[data-idx="${next}"]`);
        el?.scrollIntoView({ block: "nearest" });
        el?.focus({ preventScroll: true });
      });
    },
  };
  useEffect(() => {
    const isTyping = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      if (!el || !el.tagName) return false;
      return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable;
    };
    const onKey = (e: KeyboardEvent) => {
      const st = stateRef.current;
      if (st.modalOpen) return; // EmailComposer / RepliesDrawer handle their own keys
      // Send only ever fires from the composer itself — this used to send a real
      // customer reply from the search box or the new-ticket form.
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        if (e.target !== composerRef.current) return;
        if (!selectedRef.current || !st.hasDraft) return;
        e.preventDefault();
        actionsRef.current.send(e.shiftKey);
        return;
      }
      if (isTyping(e.target)) return;
      // Escape works from anywhere: it dismisses the topmost thing that's open.
      if (e.key === "Escape") {
        if (st.shortcutsOpen) { setShortcutsOpen(false); return; }
        if (st.snoozeOpen) { setSnoozeOpen(false); return; }
        actionsRef.current.close();
        return;
      }
      // Single-key shortcuts are scoped to the queue (or to nothing being
      // focused), so they can't fire while the owner is working elsewhere.
      const active = document.activeElement;
      const inQueue = !active || active === document.body || !!listScrollRef.current?.contains(active);
      if (!inQueue) return;
      switch (e.key) {
        case "j": e.preventDefault(); actionsRef.current.move(1); break;
        case "k": e.preventDefault(); actionsRef.current.move(-1); break;
        case "Enter": {
          const it = st.visible[st.cursor];
          if (it) { e.preventDefault(); setKeyboardActive(true); actionsRef.current.open(it); }
          break;
        }
        case "e": e.preventDefault(); actionsRef.current.closeOrResolve(); break;
        case "s":
          if (selectedRef.current?.kind === "conversation") { e.preventDefault(); setSnoozeOpen((o) => !o); }
          break;
        case "/": e.preventDefault(); searchRef.current?.focus(); break;
        default: break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const frt =
    selConv?.first_response_at && selConv?.created_at
      ? Math.max(0, Math.round((new Date(selConv.first_response_at).getTime() - new Date(selConv.created_at).getTime()) / 60000))
      : null;

  const isVoice = selConv?.channel_type === "voice";
  const voiceCollapsed = isVoice && calls.length > 0 && !showTranscript;
  function dictate() {
    type SR = { start: () => void; lang: string; interimResults: boolean;
                onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
                onend: (() => void) | null };
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) { toastError("Voice input isn't supported in this browser — type your message instead."); return; }
    const rec = new Ctor();
    rec.lang = navigator.language || "en-US";
    rec.interimResults = false;
    rec.onresult = (e) => {
      const said = Array.from(e.results).map((r) => r[0]?.transcript ?? "").join(" ").trim();
      if (said) setDraft((d) => (d ? `${d} ${said}` : said));
    };
    rec.onend = () => setDictating(false);
    setDictating(true);
    rec.start();
  }

  // How many distinct channels this customer's timeline spans. Drives the
  // per-message channel badge — shown only when there is more than one, so a
  // single-channel conversation looks exactly as it did before.
  const timelineChannels = new Set(messages.map((m) => m.channel_type).filter(Boolean)).size;
  const transcriptLines = messages.filter((m) => m.role !== "note").length;

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="row g-4">
      <style>{INBOX_CSS}</style>

      {/* ── Top bar ───────────────────────────────────────────────────────────
          Recent writers, search, and start-a-thread — spanning both panes as in
          the design. The avatars are real conversations: clicking one opens it,
          a green ring means unread and the violet ring is the open thread. */}
      <div className="col-12">
        <div className="ibx-top">
          <div className="ibx-avs" aria-label="Recent conversations">
            {items.slice(0, 6).map((it) => {
              const nm = it.kind === "conversation"
                ? (it.conv.customer_name || it.conv.customer_phone || "Customer")
                : (it.ticket.customer_name || "Customer");
              const unread = it.kind === "conversation" && it.conv.unread;
              const open = selected != null && itemKey(it) === itemKey(selected);
              return (
                <button
                  key={`av-${itemKey(it)}`}
                  type="button"
                  className={`a${open ? " on" : unread ? " unread" : ""}`}
                  title={nm}
                  aria-label={`Open conversation with ${nm}`}
                  onClick={() => openItem(it)}
                >
                  {initialsOf(nm)}
                </button>
              );
            })}
          </div>

          <div className="ibx-search">
            <input
              ref={searchRef}
              placeholder="Search"
              aria-label="Search conversations and tickets"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {ICON_SEARCH}
          </div>

          <button type="button" className="ibx-new" onClick={() => setComposer({ to: "", subject: "" })}>
            New Chats
            <i aria-hidden="true">+</i>
          </button>
        </div>
      </div>
      {error && <div className="col-12"><div className="alert alert-danger py-2 px-3 fz-font-md mb-0" role="alert">{error}</div></div>}
      {composer && (
        <EmailComposer
          orgId={orgId}
          initialTo={composer.to}
          initialSubject={composer.subject}
          initialBody={composer.body}
          conversationId={composer.conversationId}
          onClose={() => setComposer(null)}
          onSent={() => load()}
        />
      )}
      {repliesOpen && (
        <RepliesDrawer
          orgId={orgId}
          items={canned}
          onClose={() => setRepliesOpen(false)}
          onChanged={refreshCanned}
          onInsert={selected ? (c) => { insertSnippet(c); setRepliesOpen(false); } : undefined}
        />
      )}

      {/* ── Chats rail (right in the design; renders after the thread) ────── */}
      <div className={`col-lg-4 order-lg-2 ${selected ? "d-none d-lg-block" : ""}`}>
        <div className="d-flex align-items-center gap-2 mb-2">
          <h2 className="fz-font-md fw-600 neutral-900 m-0">Chats</h2>
          <div className="ms-auto d-flex align-items-center gap-2">
            <button type="button" className={`btn btn-sm rounded-3 py-1 px-2 text-nowrap fz-font-sm ${newTicketOpen ? "btn-secondary" : "btn-outline-dark"}`} aria-expanded={newTicketOpen} onClick={() => setNewTicketOpen((o) => !o)}>+ Ticket</button>
            <div className="d-none d-lg-block"><ShortcutsHint open={shortcutsOpen} setOpen={setShortcutsOpen} /></div>
          </div>
        </div>
        {newTicketOpen && (
          <form onSubmit={submitTicket} className="bg-neutral-0 rounded-4 p-3 border-100 mb-2">
            <h3 className="fz-font-sm fw-600 neutral-500 mb-2">New ticket</h3>
            <label className="fz-font-sm fw-500 neutral-700 mb-1" htmlFor="nt-subject">Subject</label>
            <input id="nt-subject" className="form-control form-control-sm rounded-3 mb-2" required value={tForm.subject} onChange={(e) => setTForm({ ...tForm, subject: e.target.value })} />
            <label className="fz-font-sm fw-500 neutral-700 mb-1" htmlFor="nt-customer">Customer name</label>
            <input id="nt-customer" className="form-control form-control-sm rounded-3 mb-2" required value={tForm.customer} onChange={(e) => setTForm({ ...tForm, customer: e.target.value })} />
            <label className="fz-font-sm fw-500 neutral-700 mb-1" htmlFor="nt-email">Customer email <span className="neutral-400 fw-400">— replies are emailed here</span></label>
            <input id="nt-email" type="email" className="form-control form-control-sm rounded-3 mb-2" value={tForm.email} onChange={(e) => setTForm({ ...tForm, email: e.target.value })} />
            <label className="fz-font-sm fw-500 neutral-700 mb-1" htmlFor="nt-message">What did the customer ask?</label>
            <textarea id="nt-message" className="form-control form-control-sm rounded-3 mb-2" rows={2} value={tForm.message} onChange={(e) => setTForm({ ...tForm, message: e.target.value })} />
            <div className="d-flex align-items-center gap-2">
              <button type="submit" className="btn btn-dark btn-sm rounded-3 px-3" disabled={creatingTicket}>{creatingTicket ? "Creating…" : "Create"}</button>
              <button type="button" className="btn btn-link btn-sm p-0 px-2 neutral-500 text-decoration-none ops-tap" onClick={() => setNewTicketOpen(false)}>Cancel</button>
            </div>
          </form>
        )}

        {/* Search moved to the top bar with the design; the channel picker stays
            here beside the status chips. */}
        <div className="d-flex align-items-center gap-2 mb-2">
          <select
            className="form-select form-select-sm rounded-3 flex-shrink-0"
            style={{ width: "auto", maxWidth: 160 }}
            aria-label="Filter by channel"
            value={fChannel}
            onChange={(e) => setFChannel(e.target.value)}
          >
            {CHANNEL_FILTERS.map((ch) => (
              <option key={ch || "all"} value={ch}>{ch ? channelLabel(ch) : "All channels"}</option>
            ))}
          </select>
        </div>

        <div className="ops-scroll-x d-flex flex-nowrap gap-1 mb-3 pb-1" role="group" aria-label="Filter by status">
          {QUEUE_FILTERS.map((f) => {
            const active = fQueue === f.v;
            const danger = f.v === "escalated" && counts.escalated > 0 && !active;
            return (
              <button
                key={f.v}
                type="button"
                onClick={() => setFQueue(f.v)}
                aria-pressed={active}
                className={`btn btn-sm rounded-pill px-2 py-1 fz-font-sm flex-shrink-0 text-nowrap ${active ? "btn-dark" : danger ? "btn-outline-danger" : "btn-outline-secondary"}`}
              >
                {f.label}
                <span className={`ms-1 ${danger ? "fw-600" : "opacity-75"}`}>{counts[f.v]}</span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500">Loading…</div>
        ) : visible.length === 0 ? (
          <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center">
            {filtersActive ? (
              <>
                <div className="fz-font-md fw-600 neutral-700">No messages match these filters</div>
                <div className="fz-font-sm neutral-500 mt-1">Try a different status or channel.</div>
                <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-3 mt-3" onClick={clearFilters}>Clear filters</button>
              </>
            ) : (
              <>
                <div className="fz-font-md fw-600 neutral-700">No conversations yet</div>
                <div className="fz-font-sm neutral-500 mt-1">Messages from your website chat, SMS, WhatsApp, email and calls all land here.</div>
              </>
            )}
          </div>
        ) : (
          <div className="d-flex flex-column gap-2" style={{ maxHeight: "calc(100vh - 240px)", overflowY: "auto" }} ref={listScrollRef}>
            {visible.map((it, i) => {
              const isSel = selected?.id === it.id && selected?.kind === it.kind;
              // The ring is a keyboard affordance — it stayed on row 1 on every
              // load before, competing with the row that was actually open.
              const isCursor = keyboardActive && cursor === i;
              // The design's chat row: avatar, name, one-line preview, time —
              // with the open conversation tinted rather than outlined.
              const rowClass = `ibx-chat${isSel ? " sel" : ""}`;
              const rowStyle: React.CSSProperties | undefined =
                isCursor ? { boxShadow: "inset 0 0 0 2px #111" } : undefined;
              if (it.kind === "ticket") {
                const t = it.ticket;
                return (
                  <button key={`t-${it.id}`} data-idx={i} type="button" onClick={() => openItem(it)} onFocus={() => setCursorKey(itemKey(it))} className={rowClass} style={rowStyle} aria-current={isSel}>
                    <div className="d-flex align-items-center justify-content-between gap-2">
                      <span className="fw-600 text-truncate" style={{ minWidth: 0 }}>{t.subject || t.customer_name || "Ticket"}</span>
                      <span className={`badge fw-500 text-capitalize flex-shrink-0 ${TICKET_STATUS_STYLE[t.status]}`}>{t.status}</span>
                    </div>
                    <div className="fz-font-sm neutral-500 d-flex flex-wrap align-items-center gap-1 mt-1">
                      <span className="badge bg-neutral-900 text-white fw-500"><span aria-hidden="true">🎫 </span>Ticket</span>
                      {t.category && <span className="badge bg-neutral-100 neutral-700 fw-500">{t.category}</span>}
                      {t.sentiment && <span className={`badge fw-500 text-capitalize ${SENTIMENT_STYLE[t.sentiment] ?? "bg-neutral-100 neutral-700"}`}>{t.sentiment}</span>}
                      <span className="text-truncate" style={{ minWidth: 0 }}>{t.customer_name}</span>
                      <span className="ms-auto text-nowrap neutral-400">{relTime(it.at)}</span>
                    </div>
                  </button>
                );
              }
              const c = it.conv;
              return (
                <button key={`c-${it.id}`} data-idx={i} type="button" onClick={() => openItem(it)} onFocus={() => setCursorKey(itemKey(it))} className={rowClass} style={rowStyle} aria-current={isSel}>
                  <span className="av" aria-hidden="true">
                    {initialsOf(c.customer_name || c.customer_phone || "Customer")}
                    {/* Unread shows as the dot on the avatar, as in the design. */}
                    {c.unread && <span className="dot" />}
                  </span>
                  <span className="txt">
                    {/* A bare colour cue is invisible to a screen reader. */}
                    {c.unread && <span className="visually-hidden">Unread. </span>}
                    <b style={c.unread ? { fontWeight: 700 } : undefined}>
                      {c.customer_name || c.customer_phone || "Customer"}
                    </b>
                    <span>{c.summary || channelLabel(c.channel_type)}</span>
                  </span>
                  <span className="tm">{relTime(it.at)}</span>
                </button>
              );
            })}
            {convos.length >= limit && (
              <button type="button" className="btn btn-outline-dark btn-sm rounded-3 w-100 py-2" disabled={loadingMore} onClick={() => { setLoadingMore(true); setLimit((l) => l + PAGE_SIZE); }}>
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Thread (widest pane, first on the left) ───────────────────────── */}
      <div className={`col-lg-8 order-lg-1 ${selected ? "" : "d-none d-lg-block"}`}>
        {!selected ? (
          <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center" style={{ minHeight: 200 }}>
            <div className="fz-font-md fw-600 neutral-700">Pick a message to read it</div>
            <div className="fz-font-sm neutral-500 mt-1">Choose a conversation or ticket from the list to reply.</div>
          </div>
        ) : selected.kind === "ticket" && selTicket ? (
          /* ---- Ticket thread ---- */
          <div className="bg-neutral-0 rounded-4 border-100 p-3 p-lg-4 d-flex flex-column" style={{ minHeight: 480 }}>
            <button type="button" className="btn btn-link btn-sm p-0 text-decoration-none d-lg-none text-start mb-2 ops-tap" onClick={closeSelected}>← Inbox</button>
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
              <div style={{ minWidth: 0 }}>
                <h2 className="fw-600 fz-font-lg mb-0">
                  {selTicket.subject}
                  <span className="badge bg-neutral-900 text-white fw-500 ms-2 align-middle fz-font-sm"><span aria-hidden="true">🎫 </span>Ticket</span>
                </h2>
                <div className="fz-font-sm neutral-500">{[selTicket.customer_name, selTicket.customer_email].filter(Boolean).join(" · ") || "—"}</div>
              </div>
              <div className="d-flex flex-wrap gap-2">
                <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-3 ops-tap" onClick={classifyTicket} disabled={classifying}>{classifying ? "…" : <><span aria-hidden="true">✨ </span>Classify</>}</button>
                <StatusPills
                  label="Ticket status"
                  current={selTicket.status}
                  onPick={changeTicketStatus}
                  options={[
                    { v: "open" as TicketStatus, label: "Open" },
                    { v: "pending" as TicketStatus, label: "Pending" },
                    { v: "resolved" as TicketStatus, label: "Resolved" },
                  ]}
                />
              </div>
            </div>

            {(selTicket.category || selTicket.sentiment || selTicket.ai_summary) && (
              <div className="mb-2">
                <div className="d-flex flex-wrap gap-2 mb-1">
                  {selTicket.category && <span className="badge bg-neutral-100 neutral-700 fw-500">{selTicket.category}</span>}
                  {selTicket.sentiment && <span className={`badge fw-500 text-capitalize ${SENTIMENT_STYLE[selTicket.sentiment] ?? SENTIMENT_STYLE.neutral}`}>{selTicket.sentiment}</span>}
                  <span className="badge bg-neutral-100 neutral-700 fw-500 text-capitalize">{selTicket.priority} priority</span>
                  {selTicket.ai_deflected && <span className="badge bg-success-subtle text-success-emphasis fw-500">Answered by AI</span>}
                </div>
                {selTicket.ai_summary && <div className="fz-font-sm neutral-500">{selTicket.ai_summary}</div>}
              </div>
            )}

            {/* minHeight keeps recent messages visible however many panels stack below. */}
            <div className="d-flex flex-column gap-2 mb-3" style={{ overflowY: "auto", flex: "1 1 auto", minHeight: 200, maxHeight: "55vh" }} ref={bodyRef}>
              {ticketMsgs.length === 0 && <div className="neutral-500 fz-font-md">No messages yet.</div>}
              {ticketMsgs.map((m) => <TicketBubble key={m.id} m={m} />)}
            </div>

            {suggestion && (
              <AiDraftCard
                summary={suggestion.summary}
                text={suggestion.suggestion}
                unsure={confidence != null && confidence < 0.7}
                onUse={() => { setDraft(suggestion.suggestion); setSuggestion(null); }}
              />
            )}

            {sendNote && <div className="alert alert-warning py-2 px-3 fz-font-sm mb-2" role="alert">{sendNote}</div>}

            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
              <span className="fz-font-sm fw-600 neutral-500">Reply</span>
              <div className="d-flex gap-2 align-items-center">
                <SnippetSelect snippets={snippets} onInsert={insertSnippet} onManage={() => setRepliesOpen(true)} />
                <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-3 text-nowrap" onClick={aiDraftTicket} disabled={aiDrafting}>{aiDrafting ? "Drafting…" : <><span aria-hidden="true">✨ </span>Draft with AI</>}</button>
              </div>
            </div>
            <form className="d-flex flex-column flex-sm-row gap-2" onSubmit={(e) => { e.preventDefault(); send(false); }}>
              <textarea ref={composerRef} className="form-control rounded-3" rows={2} aria-label="Ticket reply" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type a reply, or draft one with AI…" />
              <div className="d-flex flex-row flex-sm-column gap-2 align-self-stretch align-self-sm-end">
                <button type="submit" className="btn btn-dark rounded-3 px-3 text-nowrap flex-grow-1" disabled={busy || !draft.trim()}>{busy ? "…" : "Send"}</button>
                <button type="button" className="btn btn-outline-secondary btn-sm rounded-3 text-nowrap flex-grow-1" disabled={busy || !draft.trim()} onClick={() => send(true)} title="Send the reply and resolve the ticket">Send &amp; resolve</button>
              </div>
            </form>
          </div>
        ) : selConv ? (
          /* ---- Conversation thread ---- */
          <div className="bg-neutral-0 rounded-4 border-100 p-3 p-lg-4 d-flex flex-column" style={{ minHeight: 480 }}>
            <button type="button" className="btn btn-link btn-sm p-0 text-decoration-none d-lg-none text-start mb-2 ops-tap" onClick={closeSelected}>← Inbox</button>
            {/* Thread header, per the design: avatar · name · last-activity, with
                the actions grouped on the right. Channel/intent/sentiment stay —
                they say which surface this arrived on and how it is going. */}
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2 pb-2 border-bottom">
              <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
                <span className="ibx-thav" aria-hidden="true">
                  {initialsOf(selConv.customer_name || selConv.customer_phone || "Customer")}
                </span>
                <div style={{ minWidth: 0 }}>
                  <h2 className="fw-600 fz-font-lg mb-0 d-flex align-items-center flex-wrap gap-2 lh-1">
                    {selConv.customer_name || selConv.customer_phone || "Customer"}
                    <span className={`badge fw-500 fz-font-sm ${CHANNEL_STYLE[selConv.channel_type] ?? "bg-neutral-100 neutral-700"}`}>{channelLabel(selConv.channel_type)}</span>
                    {selConv.intent && <span className="badge bg-neutral-100 neutral-700 fw-500 fz-font-sm">{selConv.intent}</span>}
                    {selConv.sentiment && <span className={`badge fw-500 fz-font-sm text-capitalize ${SENTIMENT_STYLE[selConv.sentiment] ?? "bg-neutral-100 neutral-700"}`}>{selConv.sentiment}</span>}
                  </h2>
                  <div className="fz-font-sm neutral-400 mt-1">
                    {selConv.last_message_at ? relTime(selConv.last_message_at) : "—"}
                    {[displayPhone(selConv.customer_phone), selConv.customer_email].filter(Boolean).length > 0 && (
                      <span className="neutral-500"> · {[displayPhone(selConv.customer_phone), selConv.customer_email].filter(Boolean).join(" · ")}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="d-flex flex-wrap gap-2 align-items-center">
                {callTo && <button type="button" className={`btn btn-sm rounded-pill px-3 ops-tap ${callOpen ? "btn-dark" : "btn-outline-dark"}`} aria-expanded={callOpen} onClick={() => setCallOpen((o) => !o)} disabled={calling}><span aria-hidden="true">📞 </span>Call</button>}
                {/* On an email thread this is the rich path — say what it adds,
                    and carry whatever is already typed into it. */}
                {selConv.customer_email && (
                  <button
                    type="button"
                    className="btn btn-outline-dark btn-sm rounded-pill px-3 ops-tap"
                    onClick={() => setComposer({ to: selConv.customer_email, subject: emailSubject, body: draft, conversationId: selConv.id })}
                  >
                    <span aria-hidden="true">✉ </span>{selConv.channel_type === "email" ? "Attach / format" : "Email"}
                  </button>
                )}
                {selConv.status !== "escalated" && <button type="button" className="btn btn-outline-secondary btn-sm rounded-pill px-3 ops-tap" onClick={() => setStatus("escalated")}>Take over</button>}
                <div className="position-relative" ref={snoozeWrapRef}>
                  <button type="button" className={`btn btn-sm rounded-pill px-3 ops-tap ${snoozeOpen ? "btn-dark" : "btn-outline-secondary"}`} onClick={() => setSnoozeOpen((o) => !o)} aria-expanded={snoozeOpen}>
                    {selConv.status === "snoozed" ? "Snoozed" : "Snooze"}
                  </button>
                  {snoozeOpen && (
                    <div className="position-absolute end-0 bg-neutral-0 border-100 rounded-3 shadow p-2 mt-1" style={{ zIndex: 30, minWidth: 170 }}>
                      {selConv.status === "snoozed" ? (
                        <>
                          {selConv.snoozed_until && <div className="fz-font-sm neutral-500 px-2 mb-1">Until {new Date(selConv.snoozed_until).toLocaleString()}</div>}
                          <button type="button" className="btn btn-sm w-100 text-start rounded-2 py-2" onClick={unsnooze}>Unsnooze now</button>
                        </>
                      ) : (
                        <>
                          <div className="fz-font-sm neutral-500 px-2 mb-1">Hide until…</div>
                          {SNOOZE_OPTIONS.map((o) => (
                            <button key={o.label} type="button" className="btn btn-sm w-100 text-start rounded-2 py-2" onClick={() => snoozeFor(o.ms)}>{o.label}</button>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
                {/* Same control shape as the ticket header — a text link reading
                    "Close" also read like "close this panel". */}
                <StatusPills
                  label="Conversation status"
                  current={selConv.status}
                  onPick={setStatus}
                  options={[
                    { v: "open" as ConvStatus, label: "Open" },
                    { v: "handled" as ConvStatus, label: "Handled" },
                    { v: "closed" as ConvStatus, label: "Closed" },
                  ]}
                />
              </div>
            </div>

            {callOpen && callTo && (
              <div className="border-100 rounded-3 p-3 mb-2 bg-neutral-50">
                {connecting || inCall ? (
                  <div className="d-flex align-items-center justify-content-between gap-2">
                    <span className="fz-font-md fw-600">{connecting ? "Connecting…" : <><span aria-hidden="true">🔊 </span>On call</>} · {callTo}</span>
                    <div className="d-flex gap-2">
                      {inCall && <button type="button" className={`btn btn-sm rounded-pill px-3 ${muted ? "btn-warning" : "btn-outline-secondary"}`} onClick={toggleMute}>{muted ? "Unmute" : "Mute"}</button>}
                      <button type="button" className="btn btn-danger btn-sm rounded-pill px-3" onClick={endBrowserCall}>Hang up</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="btn-group btn-group-sm mb-2" role="group" aria-label="Call mode">
                      <button type="button" className={`btn rounded-pill px-3 ${callMode === "ai" ? "btn-dark" : "btn-outline-secondary"}`} onClick={() => setCallMode("ai")}>AI agent calls</button>
                      <button type="button" className={`btn rounded-pill px-3 ms-1 ${callMode === "bridge" ? "btn-dark" : "btn-outline-secondary"}`} onClick={() => setCallMode("bridge")}>Connect me</button>
                      <button type="button" className={`btn rounded-pill px-3 ms-1 ${callMode === "browser" ? "btn-dark" : "btn-outline-secondary"}`} onClick={() => setCallMode("browser")}>Talk here</button>
                    </div>
                    {callMode === "ai" && (
                      <>
                        <label className="fz-font-sm fw-500 neutral-700 mb-1" htmlFor="call-opening">Opening line <span className="neutral-400 fw-400">— optional</span></label>
                        <input id="call-opening" className="form-control form-control-sm rounded-3 mb-2" placeholder="e.g. Hi, I'm calling about your order…" value={callOpening} onChange={(e) => setCallOpening(e.target.value)} />
                      </>
                    )}
                    {callMode === "bridge" && (
                      <>
                        <label className="fz-font-sm fw-500 neutral-700 mb-1" htmlFor="call-phone">Your number <span className="neutral-400 fw-400">— blank uses your profile phone</span></label>
                        <input id="call-phone" type="tel" className="form-control form-control-sm rounded-3 mb-2" placeholder="+1 555 000 1234" value={callPhone} onChange={(e) => setCallPhone(e.target.value)} />
                      </>
                    )}
                    <div className="fz-font-sm neutral-500 mb-2">
                      {callMode === "ai" && `The AI agent will call ${callTo} and talk to them.`}
                      {callMode === "bridge" && `We'll call you first, then connect you to ${callTo}.`}
                      {callMode === "browser" && `Talk to ${callTo} from this browser — allow microphone access when prompted.`}
                    </div>
                    <button type="button" className="btn btn-dark btn-sm rounded-pill px-3" onClick={callMode === "browser" ? startBrowserCall : call} disabled={calling || connecting}>
                      {calling || connecting ? "…" : callMode === "browser" ? "Start call" : "Place call"}
                    </button>
                  </>
                )}
              </div>
            )}

            {viewers.length > 0 && <div className="alert alert-warning py-1 px-3 fz-font-sm mb-2" role="status"><span aria-hidden="true">👀 </span>{viewers.map(memberName).join(", ") || "A teammate"} is also viewing this conversation.</div>}

            {/* minHeight keeps recent messages visible even when the WhatsApp notice,
                template panel and suggestion panel all stack below. */}
            <div className="d-flex flex-column gap-2 mb-3" style={{ overflowY: "auto", flex: "1 1 auto", minHeight: 200, maxHeight: "55vh" }} ref={bodyRef}>
              {isVoice && calls.length > 0 && (
                <div className="border-100 rounded-3 p-3 bg-neutral-50">
                  {calls.map((c) => (
                    <div key={c.id} className="mb-2">
                      <div className="d-flex align-items-center justify-content-between gap-2">
                        <span className="fz-font-sm fw-600 text-capitalize"><span aria-hidden="true">📞 </span>{c.direction} call{c.after_hours ? " · after hours" : ""}</span>
                        <span className="badge bg-neutral-100 neutral-700 fw-500 text-capitalize">{c.outcome}</span>
                      </div>
                      <div className="fz-font-sm neutral-500">{new Date(c.created_at).toLocaleString()}</div>
                      {c.recording_url ? (
                        <audio controls src={c.recording_url} className="w-100 mt-1" style={{ height: 36 }} />
                      ) : (
                        <div className="fz-font-sm neutral-400 mt-1">No recording captured.</div>
                      )}
                    </div>
                  ))}
                  <button type="button" className="btn btn-link btn-sm p-0 text-decoration-none ops-tap" aria-expanded={showTranscript} onClick={() => setShowTranscript((v) => !v)}>
                    {showTranscript ? "Hide transcript" : `View transcript (${transcriptLines} lines)`}
                  </button>
                </div>
              )}
              {!voiceCollapsed && messages.length === 0 && <div className="neutral-500 fz-font-md">No messages yet.</div>}
              {/* Internal notes are the team's own writing — collapsing the call
                  transcript must never hide them. */}
              {(voiceCollapsed ? messages.filter((m) => m.role === "note") : messages).map((m) => (
                <MessageBubble key={m.id} m={m} showChannel={timelineChannels > 1} />
              ))}
            </div>

            {waWindowClosed && (
              <div className="alert alert-warning py-2 px-3 fz-font-sm mb-2" role="status">
                WhatsApp's 24-hour window is closed. Free-form replies will be rejected — send an approved template:
                {templates.length === 0 ? <span className="d-block mt-1 neutral-500">No templates yet — add one via “Saved replies”.</span> : (
                  <div className="d-flex flex-wrap gap-1 mt-2">
                    {templates.map((t) => <button key={t.id} type="button" className={`btn btn-sm rounded-pill px-2 py-0 ${tpl?.id === t.id ? "btn-dark" : "btn-outline-dark"}`} onClick={() => { setTpl(t); setTplVars({}); }}>{t.title || t.shortcut}</button>)}
                  </div>
                )}
              </div>
            )}

            {tpl && (
              <div className="border-100 rounded-3 p-3 mb-2 bg-neutral-50">
                <div className="fz-font-sm fw-600 neutral-700 mb-1">Template · {tpl.title || tpl.shortcut}</div>
                <div className="fz-font-md neutral-800 mb-2" style={{ whiteSpace: "pre-wrap" }}>{renderTpl(tpl.body, tplVars)}</div>
                {!tpl.whatsapp_template_sid && <div className="alert alert-warning py-1 px-2 fz-font-sm mb-2">No approval code on this saved reply — add it via “Saved replies” so it can be sent.</div>}
                {tplKeys(tpl.body).map((k) => (
                  <div key={k}>
                    <label className="fz-font-sm fw-500 neutral-700 mb-1" htmlFor={`tplvar-${k}`}>{`Value for {{${k}}}`}</label>
                    <input id={`tplvar-${k}`} className="form-control form-control-sm rounded-3 mb-2" value={tplVars[k] ?? ""} onChange={(e) => setTplVars((v) => ({ ...v, [k]: e.target.value }))} />
                  </div>
                ))}
                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-dark btn-sm rounded-pill px-3" disabled={busy || !tpl.whatsapp_template_sid || tplKeys(tpl.body).some((k) => !tplVars[k]?.trim())} onClick={sendTemplate}>Send template</button>
                  <button type="button" className="btn btn-link btn-sm p-0 px-2 neutral-500 text-decoration-none ops-tap" onClick={() => setTpl(null)}>Cancel</button>
                </div>
              </div>
            )}

            {suggestion && (
              <AiDraftCard
                summary={suggestion.summary}
                text={suggestion.suggestion}
                onUse={() => { setMode("reply"); setDraft(suggestion.suggestion); setSuggestion(null); }}
              />
            )}

            {sendNote && <div className="alert alert-warning py-2 px-3 fz-font-sm mb-2" role="alert">{sendNote}</div>}

            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
              <div className="btn-group btn-group-sm" role="group" aria-label="Composer mode">
                <button type="button" className={`btn rounded-pill px-3 ${mode === "reply" ? "btn-dark" : "btn-outline-secondary"}`} onClick={() => setMode("reply")}>Reply</button>
                <button type="button" className={`btn rounded-pill px-3 ms-1 ${mode === "note" ? "btn-dark" : "btn-outline-secondary"}`} onClick={() => setMode("note")}>Internal note</button>
              </div>
              <div className="d-flex gap-2 align-items-center">
                {mode === "reply" && <SnippetSelect snippets={snippets} onInsert={insertSnippet} onManage={() => setRepliesOpen(true)} />}
                <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-3" onClick={runSuggest} disabled={suggesting}>{suggesting ? "…" : <><span aria-hidden="true">✨ </span>Draft with AI</>}</button>
              </div>
            </div>

            {mode === "reply" && selConv.channel_type === "email" && (
              <>
                <label className="fz-font-sm fw-500 neutral-700 mb-1" htmlFor="conv-subject">Subject <span className="neutral-400 fw-400">— optional</span></label>
                <input id="conv-subject" className="form-control form-control-sm rounded-3 mb-2" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
              </>
            )}
            {/* Composer, per the design: one rounded field with send inside it and
                the violet mic alongside. "Send & close" stays as a separate
                action rather than being hidden behind an icon. */}
            <form className="ibx-comp" onSubmit={(e) => { e.preventDefault(); send(false); }}>
              <div className="box">
                <textarea
                  ref={composerRef}
                  rows={1}
                  aria-label={mode === "note" ? "Internal note" : "Reply"}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={mode === "note" ? "Private note for your team (not sent)…" : "Type a message"}
                />
                <button type="submit" className="ibx-icobtn" disabled={busy || !draft.trim()} aria-label={mode === "note" ? "Save note" : "Send"}>
                  {busy ? "…" : ICON_SEND}
                </button>
              </div>
              <button
                type="button"
                className={`ibx-mic${dictating ? " on" : ""}`}
                onClick={dictate}
                aria-label={dictating ? "Listening…" : "Dictate a message"}
                aria-pressed={dictating}
              >
                {ICON_MIC}
              </button>
            </form>
            {mode === "reply" && (
              <button type="button" className="btn btn-link btn-sm p-0 mt-2 text-decoration-none fz-font-sm" disabled={busy || !draft.trim()} onClick={() => send(true)} title="Send the reply and close the conversation (⇧⌘/Ctrl+Enter)">Send &amp; close</button>
            )}
          </div>
        ) : null}
      </div>

      {/* ── Conversation settings (under the chats list, per the design) ──── */}
      <div className={`col-lg-4 order-lg-3 ${selected ? "" : "d-none d-lg-block"}`}>
        {selected && (
          <div className="d-flex flex-column gap-3">
            {/* What this customer has bought or booked comes first — it is what
                answers the message. Admin controls sit underneath.
                phone is filtered: a label like "web visitor" is not an identity,
                and matching on it would pull every other web-chat thread's
                history into this one. */}
            <InboxContextRail
              orgId={orgId}
              currency={orgCurrency}
              email={selConv?.customer_email || selTicket?.customer_email}
              phone={displayPhone(selConv?.customer_phone) ?? undefined}
              excludeConversationId={selConv?.id}
              modules={consoleCfg.modules}
            />

            {/* Customer basics */}
            <div className="bg-neutral-0 rounded-4 p-3 border-100">
              <h3 className="fz-font-sm fw-600 neutral-500 mb-2">Customer</h3>
              <div className="fw-600" style={{ overflowWrap: "anywhere" }}>{(selConv?.customer_name || selTicket?.customer_name) || "Customer"}</div>
              <div className="fz-font-sm neutral-500" style={{ overflowWrap: "anywhere" }}>{selConv ? displayPhone(selConv.customer_phone) || "No phone" : "—"}</div>
              <div className="fz-font-sm neutral-500" style={{ overflowWrap: "anywhere" }}>{(selConv?.customer_email || selTicket?.customer_email) || "No email"}</div>
              {selConv && (selConv.qualified || selConv.lead_score != null) && (
                <div className="fz-font-sm neutral-500 mt-2 d-flex flex-wrap align-items-center gap-2">
                  {selConv.qualified && <span className="badge bg-success-subtle text-success-emphasis fw-500">Qualified</span>}
                  {selConv.lead_score != null && <span>Score: {selConv.lead_score}</span>}
                </div>
              )}
              {frt != null && <div className="fz-font-sm neutral-500 mt-1">First response: {frt === 0 ? "under a minute" : `${frt} min`}</div>}
            </div>

            {selConv && (
              /* One admin card instead of three — less to scroll past on a phone. */
              <div className="bg-neutral-0 rounded-4 p-3 border-100">
                <h3 className="fz-font-sm fw-600 neutral-500 mb-2">Conversation settings</h3>

                <label className="fz-font-sm fw-500 neutral-700 mb-1" htmlFor="inbox-assign">Assigned to</label>
                <select id="inbox-assign" className="form-select form-select-sm rounded-3 mb-3" value={selConv.assigned_to ?? ""} onChange={(e) => assign(e.target.value || null)}>
                  <option value="">Unassigned</option>
                  {me && <option value={me}>Me</option>}
                  {members.filter((m) => m.user_id !== me).map((m) => <option key={m.user_id} value={m.user_id}>{m.full_name || "Teammate"}</option>)}
                </select>

                <div className="fz-font-sm fw-500 neutral-700 mb-1">Tags</div>
                <div className="d-flex flex-wrap gap-1 mb-2">
                  {selConv.tags?.map((t) => (
                    <span key={t} className="badge bg-neutral-100 neutral-700 fw-500 d-inline-flex align-items-center gap-1">
                      #{t}
                      <button type="button" className="btn btn-link btn-sm p-0 px-1 neutral-500 text-decoration-none ops-tap" aria-label={`Remove tag ${t}`} onClick={() => removeTag(t)}>×</button>
                    </span>
                  ))}
                  {(!selConv.tags || selConv.tags.length === 0) && <span className="fz-font-sm neutral-400">No tags yet</span>}
                </div>
                <form onSubmit={addTag} className="mb-3">
                  <label className="visually-hidden" htmlFor="inbox-tag">Add a tag</label>
                  <input id="inbox-tag" className="form-control form-control-sm rounded-3" placeholder="Add a tag, then press Enter" value={tagDraft} onChange={(e) => setTagDraft(e.target.value)} />
                </form>

                {/* Honest CSAT: the score belongs to the customer, not the owner. */}
                <div className="fz-font-sm fw-500 neutral-700 mb-1">Satisfaction rating</div>
                {selConv.csat_score != null ? (
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <span className={`badge fw-500 ${selConv.csat_score >= 4 ? "bg-success-subtle text-success-emphasis" : selConv.csat_score <= 2 ? "bg-danger-subtle text-danger-emphasis" : "bg-warning-subtle text-warning-emphasis"}`}>
                      {selConv.csat_score}/5
                    </span>
                    <span className="fz-font-sm neutral-500">{selConv.csat_source === "customer" ? "rated by the customer" : "entered by your team"}</span>
                  </div>
                ) : (
                  <>
                    <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-3" disabled={selConv.csat_requested || requestingCsat} onClick={requestRating}>
                      {requestingCsat ? "Sending…" : selConv.csat_requested ? "Rating requested" : "Request rating"}
                    </button>
                    <div className="fz-font-sm neutral-400 mt-1">
                      {selConv.csat_requested ? "Survey link sent — waiting on the customer." : "Sends the customer a one-tap survey link."}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
