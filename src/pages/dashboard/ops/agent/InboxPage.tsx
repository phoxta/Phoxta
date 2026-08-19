import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  listConversations,
  listConversationMessages,
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
import type { OpsContext } from "@/layouts/OperatingLayout";
import { supabase } from "@/lib/supabaseClient";
import EmailComposer from "./EmailComposer";
import InboxContextRail from "./InboxContextRail";
import RepliesDrawer from "./RepliesDrawer";
import type { Call, Device } from "@twilio/voice-sdk";

// ─────────────────────────────────────────────────────────────────────────────
// Constants & small helpers
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<ConvStatus, string> = {
  open: "bg-warning-subtle text-warning",
  handled: "bg-success-subtle text-success",
  escalated: "bg-danger-subtle text-danger",
  snoozed: "bg-neutral-100 neutral-500",
  closed: "bg-neutral-100 neutral-500",
};
const TICKET_STATUS_STYLE: Record<TicketStatus, string> = {
  open: "bg-warning-subtle text-warning",
  pending: "bg-neutral-100 neutral-700",
  resolved: "bg-success-subtle text-success",
  closed: "bg-neutral-100 neutral-500",
};
const SENTIMENT_STYLE: Record<string, string> = {
  positive: "bg-success-subtle text-success",
  neutral: "bg-neutral-100 neutral-700",
  negative: "bg-danger-subtle text-danger",
};
const CHANNEL_STYLE: Record<string, string> = {
  sms: "bg-info-subtle text-info-emphasis",
  whatsapp: "bg-success-subtle text-success",
  web: "bg-neutral-100 neutral-700",
  voice: "bg-primary-subtle text-primary-emphasis",
  email: "bg-warning-subtle text-warning",
};
const WA_WINDOW_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 500;

type QueueFilter = "all" | "unread" | "open" | "escalated" | "snoozed" | "closed" | "tickets";
const QUEUE_FILTERS: { v: QueueFilter; label: string }[] = [
  { v: "all", label: "All" },
  { v: "unread", label: "Unread" },
  { v: "open", label: "Open" },
  { v: "escalated", label: "Escalated" },
  { v: "snoozed", label: "Snoozed" },
  { v: "closed", label: "Closed" },
  { v: "tickets", label: "Tickets" },
];
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

function ShortcutsHint() {
  const [open, setOpen] = useState(false);
  return (
    <div className="position-relative d-inline-block flex-shrink-0">
      <button
        type="button"
        className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none text-nowrap"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        ⌨ Shortcuts
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
function MessageBubble({ m }: { m: ConversationMessage }) {
  if (m.role === "note") {
    return (
      <div className="align-self-center text-center" style={{ maxWidth: "92%" }}>
        <div className="bg-warning-subtle text-warning-emphasis rounded-3 px-3 py-2 fz-font-sm" style={{ whiteSpace: "pre-wrap" }}>
          <span className="text-uppercase opacity-75 me-1" style={{ fontSize: 10 }}>Internal note</span>{m.body}
        </div>
      </div>
    );
  }
  const mine = m.role !== "customer";
  const meta = (m.meta ?? {}) as Record<string, unknown>;
  const html = typeof meta.html === "string" && meta.html.trim() ? meta.html : null;
  const subject = typeof meta.subject === "string" && meta.subject.trim() ? meta.subject : null;
  const failed = m.delivery_status === "failed";
  return (
    <div className={`d-flex ${mine ? "justify-content-end" : "justify-content-start"}`}>
      <div
        className={`px-3 py-2 rounded-4 fz-font-md ${m.role === "customer" ? "bg-neutral-100 neutral-900" : m.role === "human" ? "bg-primary-subtle text-primary-emphasis" : "bg-neutral-900 text-white"}`}
        style={{ maxWidth: "85%", whiteSpace: "pre-wrap", ...(html ? { width: "85%" } : {}) }}
      >
        <div className="fz-font-sm text-uppercase opacity-75 mb-1" style={{ fontSize: 10 }}>
          {m.role === "human" ? "you" : m.role}
          {m.role === "human" && m.delivery_status && (
            <span className={`ms-1 ${failed ? "text-danger fw-600" : "opacity-75"}`}>· {m.delivery_status}</span>
          )}
        </div>
        {subject && <div className="fw-600 mb-1">{subject}</div>}
        {html ? (
          // sandbox="" blocks scripts/navigation; content scrolls inside a fixed max height.
          <iframe sandbox="" srcDoc={html} title="Email content" className="w-100 rounded-2 bg-white" style={{ border: 0, height: 260, maxHeight: 260 }} />
        ) : (
          m.body
        )}
      </div>
    </div>
  );
}

function TicketBubble({ m }: { m: TicketMessage }) {
  return (
    <div
      className={`px-3 py-2 rounded-4 fz-font-md ${m.author === "customer" ? "bg-neutral-100 neutral-900 align-self-start" : m.author === "ai" ? "bg-primary-subtle text-primary-emphasis align-self-end" : "bg-neutral-900 text-white align-self-end"}`}
      style={{ maxWidth: "85%", whiteSpace: "pre-wrap" }}
    >
      <div className="fz-font-sm text-uppercase opacity-75 mb-1" style={{ fontSize: 10 }}>{m.author}</div>
      {m.body}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// The Inbox
// ─────────────────────────────────────────────────────────────────────────────

export default function InboxPage() {
  const { orgId, org } = useOutletContext<OpsContext>();
  const orgCurrency = org.currency || "USD";

  // Queue data (kept live — this console streams realtime changes, so it skips the SWR cache by design).
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE_SIZE);

  // Selection + thread
  const [selected, setSelected] = useState<QueueItem | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [ticketMsgs, setTicketMsgs] = useState<TicketMessage[]>([]);
  const [calls, setCalls] = useState<ConversationCall[]>([]);
  const [showTranscript, setShowTranscript] = useState(false);
  const [cursor, setCursor] = useState(0);

  // Composer
  const [draft, setDraft] = useState("");
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
  const [composer, setComposer] = useState<{ to: string; subject: string; conversationId?: string } | null>(null);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [requestingCsat, setRequestingCsat] = useState(false);

  // Ticket AI
  const [confidence, setConfidence] = useState<number | null>(null);
  const [aiDrafting, setAiDrafting] = useState(false);
  const [classifying, setClassifying] = useState(false);

  // New-ticket form
  const [newTicketOpen, setNewTicketOpen] = useState(false);
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

  const selConv = selected?.kind === "conversation" ? selected.conv : null;
  const selTicket = selected?.kind === "ticket" ? selected.ticket : null;

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
          if (sel?.kind === "conversation" && m.conversation_id === sel.id) {
            setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
            setTimeout(() => bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" }), 60);
            // The thread is on screen, so an inbound landing here is already read —
            // clear the flag the DB trigger just set before the list refresh below.
            if (m.role === "customer") await reportMutation(markConversationRead(sel.id));
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
    const n: Record<QueueFilter, number> = { all: items.length, unread: 0, open: 0, escalated: 0, snoozed: 0, closed: 0, tickets: 0 };
    for (const it of items) {
      if (it.kind === "ticket") {
        n.tickets++;
        if (it.ticket.status === "open") n.open++;
        if (it.ticket.status === "closed") n.closed++;
      } else {
        const c = it.conv;
        if (c.unread) n.unread++;
        if (c.status === "open") n.open++;
        if (c.status === "escalated") n.escalated++;
        if (c.status === "snoozed") n.snoozed++;
        if (c.status === "closed") n.closed++;
      }
    }
    return n;
  }, [items]);

  const visible = useMemo(
    () =>
      items.filter((it) => {
        switch (fQueue) {
          case "all": return true;
          case "unread": return it.kind === "conversation" && it.conv.unread;
          case "open": return it.kind === "conversation" ? it.conv.status === "open" : it.ticket.status === "open";
          case "escalated": return it.kind === "conversation" && it.conv.status === "escalated";
          case "snoozed": return it.kind === "conversation" && it.conv.status === "snoozed";
          case "closed": return it.kind === "conversation" ? it.conv.status === "closed" : it.ticket.status === "closed";
          case "tickets": return it.kind === "ticket";
        }
      }),
    [items, fQueue],
  );
  useEffect(() => { setCursor((c) => Math.min(c, Math.max(0, visible.length - 1))); }, [visible.length]);

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
  async function openItem(it: QueueItem, index?: number) {
    setSelected(it);
    if (index != null) setCursor(index);
    setSuggestion(null);
    setSendNote(null);
    setMode("reply");
    setDraft("");
    setEmailSubject("");
    setTpl(null);
    setTplVars({});
    setSnoozeOpen(false);
    setConfidence(null);
    setShowTranscript(false);
    setCalls([]);
    setCallOpen(false);
    if (it.kind === "conversation") {
      setTicketMsgs([]);
      const { data } = await listConversationMessages(it.id);
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

  async function refreshThread() {
    const sel = selectedRef.current;
    if (!sel || sel.kind !== "conversation") return;
    const { data } = await listConversationMessages(sel.id);
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
        const ok = await reportMutation(addInternalNote(orgId, conv.id, text), "Note saved.");
        if (!ok) return;
        setDraft("");
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
        toast(closeAfter ? "Sent — conversation closed." : "Sent.");
      }
      setDraft("");
      setEmailSubject("");
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
    toast("Template sent.");
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
      setDraft(reply);
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
      toast("Ticket classified.");
    }
  }

  // ── Triage actions ────────────────────────────────────────────────────────
  async function setStatus(s: ConvStatus) {
    if (!selConv) return;
    const ok = await reportMutation(setConversationStatus(selConv.id, s), `Marked ${s}.`);
    if (ok) { updateConv(selConv.id, { status: s }); load(); }
  }
  async function changeTicketStatus(s: TicketStatus) {
    if (!selTicket) return;
    const ok = await reportMutation(setTicketStatus(selTicket.id, s), `Ticket ${s}.`);
    if (ok) { updateTicket(selTicket.id, { status: s }); load(); }
  }
  async function addTag(e: React.FormEvent) {
    e.preventDefault();
    const t = tagDraft.trim();
    if (!selConv || !t || selConv.tags.includes(t)) { setTagDraft(""); return; }
    const tags = [...selConv.tags, t];
    const ok = await reportMutation(setConversationTags(selConv.id, tags), "Tag added.");
    if (ok) { updateConv(selConv.id, { tags }); setTagDraft(""); }
  }
  async function removeTag(t: string) {
    if (!selConv) return;
    const tags = selConv.tags.filter((x) => x !== t);
    const ok = await reportMutation(setConversationTags(selConv.id, tags), "Tag removed.");
    if (ok) updateConv(selConv.id, { tags });
  }
  async function assign(userId: string | null) {
    if (!selConv) return;
    const ok = await reportMutation(assignConversation(selConv.id, userId), userId ? "Assigned." : "Unassigned.");
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
    const ok = await reportMutation(snoozeConversation(selConv.id, null), "Unsnoozed.");
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
      const ok = await reportMutation(markCsatRequested(selConv.id), "Rating request sent.");
      if (ok) { updateConv(selConv.id, { csat_requested: true }); refreshThread(); }
    } finally {
      setRequestingCsat(false);
    }
  }

  // ── New ticket ────────────────────────────────────────────────────────────
  async function submitTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!tForm.subject.trim() || !tForm.customer.trim()) { toastError("A subject and customer name are required."); return; }
    const { ticketId, error } = await createTicket(orgId, {
      subject: tForm.subject,
      customer_name: tForm.customer,
      customer_email: tForm.email.trim() || undefined,
      message: tForm.message,
    });
    if (error || !ticketId) { toastError(error ?? "Could not create the ticket."); return; }
    toast("Ticket created.");
    drainEmbeddings(); // index it for RAG deflection
    setTForm({ subject: "", customer: "", email: "", message: "" });
    setNewTicketOpen(false);
    load();
  }

  // ── Calls (unchanged behaviour, feedback added) ───────────────────────────
  async function call() {
    if (!selConv?.customer_phone || calling) return;
    setCalling(true);
    setSendNote(null);
    const r = await placeCall(orgId, selConv.customer_phone, {
      conversationId: selConv.id,
      mode: callMode as "ai" | "bridge",
      opening: callMode === "ai" ? callOpening.trim() || undefined : undefined,
      agentPhone: callMode === "bridge" ? callPhone.trim() || undefined : undefined,
    });
    setCalling(false);
    if (!r.ok) { toastError(r.error ?? "Call could not be placed."); return; }
    setSendNote(callMode === "bridge"
      ? `📞 Calling you${callPhone.trim() ? ` on ${callPhone.trim()}` : ""} — pick up and we'll connect ${selConv.customer_phone}.`
      : `📞 Calling ${selConv.customer_phone} — your AI agent will speak with them.`);
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
    if (!selConv?.customer_phone || connecting || inCall) return;
    setConnecting(true);
    setSendNote(null);
    try {
      const { token, error } = await voiceToken(orgId);
      if (error || !token) { setConnecting(false); toastError(error ?? "Browser calling isn't configured."); return; }
      const { Device } = await import("@twilio/voice-sdk");
      const device = new Device(token, { logLevel: "error" });
      deviceRef.current = device;
      const c = await device.connect({ params: { To: selConv.customer_phone } });
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
  const stateRef = useRef({ visible, cursor, snoozeOpen, modalOpen: false, hasDraft: false });
  stateRef.current = { visible, cursor, snoozeOpen, modalOpen: !!composer || repliesOpen, hasDraft: !!draft.trim() };
  const actionsRef = useRef<{ send: (c: boolean) => void; open: (it: QueueItem, i: number) => void; closeOrResolve: () => void; move: (d: number) => void }>({
    send: () => {}, open: () => {}, closeOrResolve: () => {}, move: () => {},
  });
  actionsRef.current = {
    send,
    open: (it, i) => { openItem(it, i); },
    closeOrResolve: () => {
      const sel = selectedRef.current;
      if (!sel) return;
      if (sel.kind === "conversation") { if (sel.conv.status !== "closed") setStatus("closed"); }
      else if (sel.ticket.status !== "resolved") changeTicketStatus("resolved");
    },
    move: (delta: number) => {
      const vis = stateRef.current.visible;
      if (vis.length === 0) return;
      setCursor((c) => {
        const next = Math.max(0, Math.min(vis.length - 1, c + delta));
        requestAnimationFrame(() => {
          listScrollRef.current?.querySelector(`[data-idx="${next}"]`)?.scrollIntoView({ block: "nearest" });
        });
        return next;
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
      // The composer send combos are the only shortcuts allowed while typing.
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        if (!selectedRef.current || !st.hasDraft) return;
        e.preventDefault();
        actionsRef.current.send(e.shiftKey);
        return;
      }
      if (isTyping(e.target)) return;
      switch (e.key) {
        case "j": e.preventDefault(); actionsRef.current.move(1); break;
        case "k": e.preventDefault(); actionsRef.current.move(-1); break;
        case "Enter": {
          const it = st.visible[st.cursor];
          if (it) { e.preventDefault(); actionsRef.current.open(it, st.cursor); }
          break;
        }
        case "e": e.preventDefault(); actionsRef.current.closeOrResolve(); break;
        case "s":
          if (selectedRef.current?.kind === "conversation") { e.preventDefault(); setSnoozeOpen((o) => !o); }
          break;
        case "/": e.preventDefault(); searchRef.current?.focus(); break;
        case "Escape":
          if (stateRef.current.snoozeOpen) { setSnoozeOpen(false); break; }
          setSelected(null);
          break;
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

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="row g-4">
      {error && <div className="col-12"><div className="alert alert-warning py-2 px-3 fz-font-md mb-0">{error}</div></div>}
      {composer && (
        <EmailComposer
          orgId={orgId}
          initialTo={composer.to}
          initialSubject={composer.subject}
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

      {/* ── Unified queue ─────────────────────────────────────────────────── */}
      <div className={`col-lg-4 ${selected ? "d-none d-lg-block" : ""}`}>
        <div className="d-flex gap-2 mb-2">
          <button type="button" className="btn btn-dark rounded-3 flex-grow-1" onClick={() => setComposer({ to: "", subject: "" })}>✉ New email</button>
          <button type="button" className={`btn rounded-3 ${newTicketOpen ? "btn-secondary" : "btn-outline-dark"}`} onClick={() => setNewTicketOpen((o) => !o)}>+ Ticket</button>
        </div>
        {newTicketOpen && (
          <form onSubmit={submitTicket} className="bg-neutral-0 rounded-4 p-3 border-100 mb-2">
            <div className="fz-font-sm fw-600 neutral-500 mb-2">New ticket</div>
            <input className="form-control form-control-sm rounded-3 mb-2" placeholder="Subject" aria-label="Ticket subject" required value={tForm.subject} onChange={(e) => setTForm({ ...tForm, subject: e.target.value })} />
            <input className="form-control form-control-sm rounded-3 mb-2" placeholder="Customer name" aria-label="Customer name" required value={tForm.customer} onChange={(e) => setTForm({ ...tForm, customer: e.target.value })} />
            <input type="email" className="form-control form-control-sm rounded-3 mb-2" placeholder="Customer email (replies are emailed)" aria-label="Customer email" value={tForm.email} onChange={(e) => setTForm({ ...tForm, email: e.target.value })} />
            <textarea className="form-control form-control-sm rounded-3 mb-2" rows={2} placeholder="What did the customer ask?" aria-label="Customer question" value={tForm.message} onChange={(e) => setTForm({ ...tForm, message: e.target.value })} />
            <div className="d-flex gap-2">
              <button type="submit" className="btn btn-dark btn-sm rounded-3 px-3">Create</button>
              <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" onClick={() => setNewTicketOpen(false)}>Cancel</button>
            </div>
          </form>
        )}

        <div className="d-flex align-items-center gap-2 mb-2">
          <input ref={searchRef} className="form-control form-control-sm rounded-3" placeholder="Search name, phone, email…  ( / )" aria-label="Search conversations and tickets" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
          <ShortcutsHint />
        </div>

        <div className="d-flex flex-wrap gap-1 mb-2">
          {QUEUE_FILTERS.map((f) => {
            const active = fQueue === f.v;
            const danger = f.v === "escalated" && counts.escalated > 0 && !active;
            return (
              <button
                key={f.v}
                type="button"
                onClick={() => setFQueue(f.v)}
                className={`btn btn-sm rounded-pill px-2 py-0 fz-font-sm ${active ? "btn-dark" : danger ? "btn-outline-danger" : "btn-outline-secondary"}`}
              >
                {f.label}
                <span className={`ms-1 ${danger ? "fw-600" : "opacity-75"}`}>{counts[f.v]}</span>
              </button>
            );
          })}
        </div>
        <div className="d-flex flex-wrap gap-1 mb-3">
          {CHANNEL_FILTERS.map((ch) => (
            <button key={ch || "all"} type="button" onClick={() => setFChannel(ch)} className={`btn btn-sm rounded-pill px-2 py-0 fz-font-sm text-capitalize ${fChannel === ch ? "btn-dark" : "btn-outline-secondary"}`}>{ch || "All channels"}</button>
          ))}
        </div>

        {loading ? (
          <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500">Loading…</div>
        ) : visible.length === 0 ? (
          <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500">Nothing here — adjust the filters or wait for the next message.</div>
        ) : (
          <div className="d-flex flex-column gap-2" style={{ maxHeight: "70vh", overflowY: "auto" }} ref={listScrollRef}>
            {visible.map((it, i) => {
              const isSel = selected?.id === it.id && selected?.kind === it.kind;
              const isCursor = cursor === i;
              const rowClass = `text-start bg-neutral-0 rounded-4 p-3 border-100 ${isSel ? "bg-neutral-100" : ""}`;
              const rowStyle = isCursor ? { boxShadow: "inset 0 0 0 2px #111" } : undefined;
              if (it.kind === "ticket") {
                const t = it.ticket;
                return (
                  <button key={`t-${it.id}`} data-idx={i} type="button" onClick={() => openItem(it, i)} className={rowClass} style={rowStyle} aria-current={isSel}>
                    <div className="d-flex align-items-center justify-content-between gap-2">
                      <span className="fw-600 text-truncate">{t.subject || t.customer_name || "Ticket"}</span>
                      <span className={`badge fw-500 text-capitalize ${TICKET_STATUS_STYLE[t.status]}`}>{t.status}</span>
                    </div>
                    <div className="fz-font-sm neutral-500 d-flex flex-wrap align-items-center gap-1 mt-1">
                      <span className="badge bg-neutral-900 text-white fw-500">🎫 Ticket</span>
                      {t.category && <span className="badge bg-neutral-100 neutral-700 fw-500">{t.category}</span>}
                      {t.sentiment && <span className={`badge fw-500 text-capitalize ${SENTIMENT_STYLE[t.sentiment] ?? "bg-neutral-100 neutral-700"}`}>{t.sentiment}</span>}
                      <span className="text-truncate">{t.customer_name}</span>
                    </div>
                  </button>
                );
              }
              const c = it.conv;
              return (
                <button key={`c-${it.id}`} data-idx={i} type="button" onClick={() => openItem(it, i)} className={rowClass} style={rowStyle} aria-current={isSel}>
                  <div className="d-flex align-items-center justify-content-between gap-2">
                    <span className={`text-truncate ${c.unread ? "fw-700" : "fw-600"}`}>
                      {c.unread && <span className="text-primary me-1" aria-label="Unread">●</span>}
                      {c.customer_name || c.customer_phone || "Visitor"}
                    </span>
                    <span className={`badge fw-500 text-capitalize ${STATUS_STYLE[c.status]}`}>{c.status}</span>
                  </div>
                  <div className="fz-font-sm neutral-500 d-flex flex-wrap align-items-center gap-1 mt-1">
                    <span className={`badge fw-500 text-capitalize ${CHANNEL_STYLE[c.channel_type] ?? "bg-neutral-100 neutral-700"}`}>{c.channel_type}</span>
                    {c.intent && <span className="badge bg-neutral-100 neutral-700 fw-500">{c.intent}</span>}
                    {c.sentiment && <span className={`badge fw-500 text-capitalize ${SENTIMENT_STYLE[c.sentiment] ?? "bg-neutral-100 neutral-700"}`}>{c.sentiment}</span>}
                    {c.assigned_to && <span className="badge bg-neutral-100 neutral-700 fw-500">@{memberName(c.assigned_to)}</span>}
                    {c.tags?.map((t) => <span key={t} className="badge bg-neutral-100 neutral-700 fw-500">#{t}</span>)}
                  </div>
                  {c.summary && <div className={`fz-font-sm text-truncate mt-1 ${c.unread ? "neutral-800 fw-600" : "neutral-500"}`}>{c.summary}</div>}
                </button>
              );
            })}
            {convos.length >= limit && (
              <button type="button" className="btn btn-outline-secondary btn-sm rounded-3" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
                Load more
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Thread ────────────────────────────────────────────────────────── */}
      <div className={`col-lg-5 ${selected ? "" : "d-none d-lg-block"}`}>
        {!selected ? (
          <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500" style={{ minHeight: 200 }}>Select a conversation or ticket.</div>
        ) : selected.kind === "ticket" && selTicket ? (
          /* ---- Ticket thread ---- */
          <div className="bg-neutral-0 rounded-4 border-100 p-4 d-flex flex-column" style={{ height: "70vh", minHeight: 480 }}>
            <button type="button" className="btn btn-link btn-sm p-0 text-decoration-none d-lg-none text-start mb-2" onClick={() => setSelected(null)}>← Inbox</button>
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
              <div>
                <h6 className="fw-600 mb-0">
                  {selTicket.subject}
                  <span className="badge bg-neutral-900 text-white fw-500 ms-2">🎫 Ticket</span>
                </h6>
                <div className="fz-font-sm neutral-500">{[selTicket.customer_name, selTicket.customer_email].filter(Boolean).join(" · ") || "—"}</div>
              </div>
              <div className="d-flex flex-wrap gap-2">
                <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-3" onClick={classifyTicket} disabled={classifying}>{classifying ? "…" : "✨ Classify"}</button>
                {(["open", "pending", "resolved"] as TicketStatus[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`btn btn-sm rounded-pill px-3 text-capitalize ${selTicket.status === s ? "btn-dark" : "btn-outline-secondary"}`}
                    onClick={() => changeTicketStatus(s)}
                    disabled={selTicket.status === s}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {(selTicket.category || selTicket.sentiment || selTicket.ai_summary) && (
              <div className="mb-2">
                <div className="d-flex flex-wrap gap-2 mb-1">
                  {selTicket.category && <span className="badge bg-neutral-100 neutral-700 fw-500">{selTicket.category}</span>}
                  {selTicket.sentiment && <span className={`badge fw-500 text-capitalize ${SENTIMENT_STYLE[selTicket.sentiment] ?? SENTIMENT_STYLE.neutral}`}>{selTicket.sentiment}</span>}
                  <span className="badge bg-neutral-100 neutral-700 fw-500 text-capitalize">{selTicket.priority} priority</span>
                  {selTicket.ai_deflected && <span className="badge bg-success-subtle text-success fw-500">AI-deflected</span>}
                </div>
                {selTicket.ai_summary && <div className="fz-font-sm neutral-500">{selTicket.ai_summary}</div>}
              </div>
            )}

            <div className="d-flex flex-column gap-2 mb-3 flex-grow-1" style={{ overflowY: "auto", minHeight: 0 }} ref={bodyRef}>
              {ticketMsgs.length === 0 && <div className="neutral-500 fz-font-md">No messages yet.</div>}
              {ticketMsgs.map((m) => <TicketBubble key={m.id} m={m} />)}
            </div>

            {sendNote && <div className="alert alert-warning py-2 px-3 fz-font-sm mb-2">{sendNote}</div>}

            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="fz-font-sm fw-600 neutral-500">
                Reply
                {confidence != null && (
                  <span className={`badge ms-2 fw-500 ${confidence >= 0.7 ? "bg-success-subtle text-success" : "bg-neutral-100 neutral-700"}`}>
                    AI confidence {Math.round(confidence * 100)}%
                  </span>
                )}
              </span>
              <div className="d-flex gap-2 align-items-center">
                <select className="form-select form-select-sm rounded-3" style={{ width: "auto" }} aria-label="Canned replies" value="" onChange={(e) => {
                  if (e.target.value === "__manage") { setRepliesOpen(true); return; }
                  const c = snippets.find((x) => x.id === e.target.value);
                  if (c) insertSnippet(c);
                }}>
                  <option value="">Replies…</option>
                  {snippets.map((c) => <option key={c.id} value={c.id}>{c.title || c.shortcut}</option>)}
                  <option value="__manage">＋ Manage replies…</option>
                </select>
                <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-3 text-nowrap" onClick={aiDraftTicket} disabled={aiDrafting}>{aiDrafting ? "Drafting…" : "✨ Draft AI reply"}</button>
              </div>
            </div>
            <form className="d-flex gap-2" onSubmit={(e) => { e.preventDefault(); send(false); }}>
              <textarea className="form-control rounded-3" rows={2} aria-label="Ticket reply" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type a reply, or draft one with AI…" />
              <div className="d-flex flex-column gap-1 align-self-end">
                <button type="submit" className="btn btn-dark rounded-3 px-3 text-nowrap" disabled={busy || !draft.trim()}>{busy ? "…" : "Send"}</button>
                <button type="button" className="btn btn-outline-secondary btn-sm rounded-3 text-nowrap" disabled={busy || !draft.trim()} onClick={() => send(true)} title="Send the reply and resolve the ticket">Send & resolve</button>
              </div>
            </form>
          </div>
        ) : selConv ? (
          /* ---- Conversation thread ---- */
          <div className="bg-neutral-0 rounded-4 border-100 p-4 d-flex flex-column" style={{ height: "70vh", minHeight: 480 }}>
            <button type="button" className="btn btn-link btn-sm p-0 text-decoration-none d-lg-none text-start mb-2" onClick={() => setSelected(null)}>← Inbox</button>
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
              <div>
                <h6 className="fw-600 mb-0 d-flex align-items-center flex-wrap gap-2">
                  {selConv.customer_name || selConv.customer_phone || "Visitor"}
                  <span className={`badge fw-500 text-capitalize ${CHANNEL_STYLE[selConv.channel_type] ?? "bg-neutral-100 neutral-700"}`}>{selConv.channel_type}</span>
                  {selConv.intent && <span className="badge bg-neutral-100 neutral-700 fw-500">{selConv.intent}</span>}
                  {selConv.sentiment && <span className={`badge fw-500 text-capitalize ${SENTIMENT_STYLE[selConv.sentiment] ?? "bg-neutral-100 neutral-700"}`}>{selConv.sentiment}</span>}
                </h6>
                <div className="fz-font-sm neutral-500">{[selConv.customer_phone, selConv.customer_email].filter(Boolean).join(" · ") || "—"}</div>
              </div>
              <div className="d-flex flex-wrap gap-2 align-items-center">
                {selConv.customer_phone && <button type="button" className={`btn btn-sm rounded-pill px-3 ${callOpen ? "btn-dark" : "btn-outline-dark"}`} onClick={() => setCallOpen((o) => !o)} disabled={calling}>📞 Call</button>}
                {selConv.customer_email && <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-3" onClick={() => setComposer({ to: selConv.customer_email, subject: "", conversationId: selConv.id })}>✉ Email</button>}
                {selConv.status !== "escalated" && <button type="button" className="btn btn-outline-secondary btn-sm rounded-pill px-3" onClick={() => setStatus("escalated")}>Take over</button>}
                <div className="position-relative">
                  <button type="button" className={`btn btn-sm rounded-pill px-3 ${snoozeOpen ? "btn-dark" : "btn-outline-secondary"}`} onClick={() => setSnoozeOpen((o) => !o)} aria-expanded={snoozeOpen}>
                    {selConv.status === "snoozed" ? "Snoozed" : "Snooze"}
                  </button>
                  {snoozeOpen && (
                    <div className="position-absolute end-0 bg-neutral-0 border-100 rounded-3 shadow p-2 mt-1" style={{ zIndex: 30, minWidth: 150 }}>
                      {selConv.status === "snoozed" ? (
                        <>
                          {selConv.snoozed_until && <div className="fz-font-sm neutral-500 px-2 mb-1">Until {new Date(selConv.snoozed_until).toLocaleString()}</div>}
                          <button type="button" className="btn btn-sm w-100 text-start rounded-2" onClick={unsnooze}>Unsnooze now</button>
                        </>
                      ) : (
                        SNOOZE_OPTIONS.map((o) => (
                          <button key={o.label} type="button" className="btn btn-sm w-100 text-start rounded-2" onClick={() => snoozeFor(o.ms)}>{o.label}</button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {selConv.status !== "closed" ? (
                  <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" onClick={() => setStatus("closed")}>Close</button>
                ) : (
                  <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" onClick={() => setStatus("open")}>Reopen</button>
                )}
              </div>
            </div>

            {callOpen && selConv.customer_phone && (
              <div className="border-100 rounded-3 p-3 mb-2 bg-neutral-50">
                {connecting || inCall ? (
                  <div className="d-flex align-items-center justify-content-between gap-2">
                    <span className="fz-font-md fw-600">{connecting ? "Connecting…" : "🔊 On call"} · {selConv.customer_phone}</span>
                    <div className="d-flex gap-2">
                      {inCall && <button type="button" className={`btn btn-sm rounded-pill px-3 ${muted ? "btn-warning" : "btn-outline-secondary"}`} onClick={toggleMute}>{muted ? "Unmute" : "Mute"}</button>}
                      <button type="button" className="btn btn-danger btn-sm rounded-pill px-3" onClick={endBrowserCall}>Hang up</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="btn-group btn-group-sm mb-2" role="group">
                      <button type="button" className={`btn rounded-pill px-3 ${callMode === "ai" ? "btn-dark" : "btn-outline-secondary"}`} onClick={() => setCallMode("ai")}>AI agent calls</button>
                      <button type="button" className={`btn rounded-pill px-3 ms-1 ${callMode === "bridge" ? "btn-dark" : "btn-outline-secondary"}`} onClick={() => setCallMode("bridge")}>Connect me</button>
                      <button type="button" className={`btn rounded-pill px-3 ms-1 ${callMode === "browser" ? "btn-dark" : "btn-outline-secondary"}`} onClick={() => setCallMode("browser")}>Talk here</button>
                    </div>
                    {callMode === "ai" && <input className="form-control form-control-sm rounded-3 mb-2" placeholder="Opening line (optional) — what should the agent say first?" aria-label="Opening line" value={callOpening} onChange={(e) => setCallOpening(e.target.value)} />}
                    {callMode === "bridge" && <input type="tel" className="form-control form-control-sm rounded-3 mb-2" placeholder="Your number (blank = your profile phone)" aria-label="Your phone number" value={callPhone} onChange={(e) => setCallPhone(e.target.value)} />}
                    <div className="fz-font-sm neutral-500 mb-2">
                      {callMode === "ai" && `The AI agent will call ${selConv.customer_phone} and talk to them.`}
                      {callMode === "bridge" && `We'll call you first, then connect you to ${selConv.customer_phone}.`}
                      {callMode === "browser" && `Talk to ${selConv.customer_phone} from this browser — allow microphone access when prompted.`}
                    </div>
                    <button type="button" className="btn btn-dark btn-sm rounded-pill px-3" onClick={callMode === "browser" ? startBrowserCall : call} disabled={calling || connecting}>
                      {calling || connecting ? "…" : callMode === "browser" ? "Start call" : "Place call"}
                    </button>
                  </>
                )}
              </div>
            )}

            {viewers.length > 0 && <div className="alert alert-warning py-1 px-3 fz-font-sm mb-2">👀 {viewers.map(memberName).join(", ") || "A teammate"} is also viewing this conversation.</div>}

            <div className="d-flex flex-column gap-2 mb-3 flex-grow-1" style={{ overflowY: "auto", minHeight: 0 }} ref={bodyRef}>
              {isVoice && calls.length > 0 && (
                <div className="border-100 rounded-3 p-3 bg-neutral-50">
                  {calls.map((c) => (
                    <div key={c.id} className="mb-2">
                      <div className="d-flex align-items-center justify-content-between gap-2">
                        <span className="fz-font-sm fw-600 text-capitalize">📞 {c.direction} call{c.after_hours ? " · after hours" : ""}</span>
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
                  <button type="button" className="btn btn-link btn-sm p-0 text-decoration-none" onClick={() => setShowTranscript((v) => !v)}>
                    {showTranscript ? "Hide transcript" : `View transcript (${messages.filter((m) => m.role !== "note").length} lines)`}
                  </button>
                </div>
              )}
              {!voiceCollapsed && messages.length === 0 && <div className="neutral-500 fz-font-md">No messages yet.</div>}
              {!voiceCollapsed && messages.map((m) => <MessageBubble key={m.id} m={m} />)}
            </div>

            {waWindowClosed && (
              <div className="alert alert-warning py-2 px-3 fz-font-sm mb-2">
                WhatsApp's 24-hour window is closed. Free-form replies will be rejected — send an approved template:
                {templates.length === 0 ? <span className="d-block mt-1 neutral-500">No templates yet — add one via “Manage replies”.</span> : (
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
                {!tpl.whatsapp_template_sid && <div className="alert alert-warning py-1 px-2 fz-font-sm mb-2">No template SID on this snippet — add it via “Manage replies” so it can be sent.</div>}
                {tplKeys(tpl.body).map((k) => (
                  <input key={k} className="form-control form-control-sm rounded-3 mb-2" placeholder={`Value for {{${k}}}`} aria-label={`Template value ${k}`} value={tplVars[k] ?? ""} onChange={(e) => setTplVars((v) => ({ ...v, [k]: e.target.value }))} />
                ))}
                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-dark btn-sm rounded-pill px-3" disabled={busy || !tpl.whatsapp_template_sid || tplKeys(tpl.body).some((k) => !tplVars[k]?.trim())} onClick={sendTemplate}>Send template</button>
                  <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" onClick={() => setTpl(null)}>Cancel</button>
                </div>
              </div>
            )}

            {suggestion && (
              <div className="border-100 rounded-3 p-3 mb-2 bg-neutral-50">
                {suggestion.summary && <div className="fz-font-sm neutral-500 mb-1"><strong>Summary:</strong> {suggestion.summary}</div>}
                {suggestion.suggestion && (
                  <>
                    <div className="fz-font-md neutral-800" style={{ whiteSpace: "pre-wrap" }}>{suggestion.suggestion}</div>
                    <button type="button" className="btn btn-dark btn-sm rounded-pill px-3 mt-2" onClick={() => { setMode("reply"); setDraft(suggestion.suggestion); }}>Use this reply</button>
                  </>
                )}
              </div>
            )}

            {sendNote && <div className="alert alert-warning py-2 px-3 fz-font-sm mb-2">{sendNote}</div>}

            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
              <div className="btn-group btn-group-sm" role="group">
                <button type="button" className={`btn rounded-pill px-3 ${mode === "reply" ? "btn-dark" : "btn-outline-secondary"}`} onClick={() => setMode("reply")}>Reply</button>
                <button type="button" className={`btn rounded-pill px-3 ms-1 ${mode === "note" ? "btn-dark" : "btn-outline-secondary"}`} onClick={() => setMode("note")}>Internal note</button>
              </div>
              <div className="d-flex gap-2 align-items-center">
                {mode === "reply" && (
                  <select className="form-select form-select-sm rounded-3" style={{ width: "auto" }} aria-label="Canned replies" value="" onChange={(e) => {
                    if (e.target.value === "__manage") { setRepliesOpen(true); return; }
                    const c = snippets.find((x) => x.id === e.target.value);
                    if (c) insertSnippet(c);
                  }}>
                    <option value="">Replies…</option>
                    {snippets.map((c) => <option key={c.id} value={c.id}>{c.title || c.shortcut}</option>)}
                    <option value="__manage">＋ Manage replies…</option>
                  </select>
                )}
                <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-3" onClick={runSuggest} disabled={suggesting}>{suggesting ? "…" : "✨ Suggest"}</button>
              </div>
            </div>

            {mode === "reply" && selConv.channel_type === "email" && (
              <input className="form-control form-control-sm rounded-3 mb-2" placeholder="Subject (optional)" aria-label="Email subject" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
            )}
            <form className="d-flex gap-2" onSubmit={(e) => { e.preventDefault(); send(false); }}>
              <textarea className="form-control rounded-3" rows={2} aria-label={mode === "note" ? "Internal note" : "Reply"} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={mode === "note" ? "Private note for your team (not sent)…" : `Reply over ${selConv.channel_type}…`} />
              <div className="d-flex flex-column gap-1 align-self-end">
                <button type="submit" className="btn btn-dark rounded-3 px-3 text-nowrap" disabled={busy || !draft.trim()}>{busy ? "…" : mode === "note" ? "Save" : "Send"}</button>
                {mode === "reply" && (
                  <button type="button" className="btn btn-outline-secondary btn-sm rounded-3 text-nowrap" disabled={busy || !draft.trim()} onClick={() => send(true)} title="Send the reply and close the conversation (⇧⌘/Ctrl+Enter)">Send & close</button>
                )}
              </div>
            </form>
          </div>
        ) : null}
      </div>

      {/* ── Context rail ──────────────────────────────────────────────────── */}
      <div className={`col-lg-3 ${selected ? "" : "d-none d-lg-block"}`}>
        {selected && (
          <div className="d-flex flex-column gap-3">
            {/* Customer basics */}
            <div className="bg-neutral-0 rounded-4 p-3 border-100">
              <div className="fz-font-sm fw-600 neutral-500 mb-2">Customer</div>
              <div className="fw-600">{(selConv?.customer_name || selTicket?.customer_name) || "Unknown"}</div>
              <div className="fz-font-sm neutral-500">{selConv ? selConv.customer_phone || "no phone" : "—"}</div>
              <div className="fz-font-sm neutral-500">{(selConv?.customer_email || selTicket?.customer_email) || "no email"}</div>
              {selConv && (
                <div className="fz-font-sm neutral-500 mt-2 d-flex flex-wrap gap-2">
                  {selConv.qualified && <span className="badge bg-success-subtle text-success fw-500">qualified</span>}
                  {selConv.lead_score != null && <span>Score: {selConv.lead_score}</span>}
                </div>
              )}
              {frt != null && <div className="fz-font-sm neutral-500 mt-1">First response: {frt === 0 ? "<1 min" : `${frt} min`}</div>}
            </div>

            {selConv && (
              <>
                <div className="bg-neutral-0 rounded-4 p-3 border-100">
                  <div className="fz-font-sm fw-600 neutral-500 mb-2">Assignment</div>
                  <select className="form-select form-select-sm rounded-3" aria-label="Assign conversation" value={selConv.assigned_to ?? ""} onChange={(e) => assign(e.target.value || null)}>
                    <option value="">Unassigned</option>
                    {me && <option value={me}>Me</option>}
                    {members.filter((m) => m.user_id !== me).map((m) => <option key={m.user_id} value={m.user_id}>{m.full_name || "Teammate"}</option>)}
                  </select>
                </div>

                <div className="bg-neutral-0 rounded-4 p-3 border-100">
                  <div className="fz-font-sm fw-600 neutral-500 mb-2">Tags</div>
                  <div className="d-flex flex-wrap gap-1 mb-2">
                    {selConv.tags?.map((t) => (
                      <span key={t} className="badge bg-neutral-100 neutral-700 fw-500">#{t} <button type="button" className="btn btn-link btn-sm p-0 neutral-400 text-decoration-none ms-1" aria-label={`Remove tag ${t}`} onClick={() => removeTag(t)}>×</button></span>
                    ))}
                    {(!selConv.tags || selConv.tags.length === 0) && <span className="fz-font-sm neutral-400">None</span>}
                  </div>
                  <form onSubmit={addTag}><input className="form-control form-control-sm rounded-3" placeholder="Add tag + Enter" aria-label="Add tag" value={tagDraft} onChange={(e) => setTagDraft(e.target.value)} /></form>
                </div>

                {/* Honest CSAT: the score belongs to the customer, not the owner. */}
                <div className="bg-neutral-0 rounded-4 p-3 border-100">
                  <div className="fz-font-sm fw-600 neutral-500 mb-2">Satisfaction (CSAT)</div>
                  {selConv.csat_score != null ? (
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <span className={`badge fw-500 ${selConv.csat_score >= 4 ? "bg-success-subtle text-success" : selConv.csat_score <= 2 ? "bg-danger-subtle text-danger" : "bg-warning-subtle text-warning"}`}>
                        {selConv.csat_score}/5
                      </span>
                      <span className="fz-font-sm neutral-500">{selConv.csat_source === "customer" ? "rated by the customer" : "legacy (owner-entered)"}</span>
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
              </>
            )}

            {/* Commerce context (Gorgias pattern) */}
            <InboxContextRail
              orgId={orgId}
              currency={orgCurrency}
              email={selConv?.customer_email || selTicket?.customer_email}
              phone={selConv?.customer_phone}
              excludeConversationId={selConv?.id}
            />
          </div>
        )}
      </div>
    </div>
  );
}
