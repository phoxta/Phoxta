import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  CircleCheck,
  Clock,
  Filter,
  Inbox as InboxIcon,
  Keyboard,
  MessageSquarePlus,
  Mic,
  Paperclip,
  PanelRight,
  Phone,
  PhoneOff,
  Plus,
  Search,
  Send,
  Sparkles,
  StickyNote,
  Tag as TagIcon,
  Ticket as TicketIcon,
  UserRoundCheck,
  Wand2,
  X,
} from "lucide-react";
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
import { getServicePolicies } from "@/lib/db/ops/policies";
import type { SlaPolicy } from "@/lib/ops/sla";
import { toast, toastError, reportMutation } from "@/lib/ops/feedback";
import { callablePhone, displayPhone } from "@/lib/ops/phone";
import type { OpsContext } from "@/layouts/OperatingLayout";
import { supabase } from "@/lib/supabaseClient";
import EmailComposer from "./EmailComposer";
import RepliesDrawer from "./RepliesDrawer";
import type { Call, Device } from "@twilio/voice-sdk";

import "@/pages/dashboard/ops/ui/console.css";
import "./inbox/inbox.css";
import QueueList from "./inbox/QueueList";
import ContextRail from "./inbox/ContextRail";
import CommandPalette, { type PaletteCommand } from "./inbox/CommandPalette";
import { ConversationMessages, TicketMessages } from "./inbox/Messages";
import {
  Avatar,
  ChannelIcon,
  EmptyState,
  IconButton,
  Kbd,
  Menu,
  MenuItem,
  MenuLabel,
  MenuSep,
  Segmented,
  Sheet,
  SkeletonRows,
  Tag,
} from "@/pages/dashboard/ops/ui/primitives";
import { ENTER, MOD, SHIFT, channelLabel, useFillHeight } from "@/pages/dashboard/ops/ui/util";
import {
  CHANNEL_FILTERS,
  QUEUE_FILTERS,
  TICKET_STATUS_LABEL,
  inBucket,
  itemKey,
  relTime,
  type QueueFilter,
  type QueueItem,
} from "./inbox/queue";

// ─────────────────────────────────────────────────────────────────────────────
// Constants & small helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Owner-facing wording for the raw enum (the button says "Take over", not "escalate"). */
const CONV_STATUS_TOAST: Record<ConvStatus, string> = {
  open: "Reopened",
  handled: "Marked handled",
  escalated: "You've taken this over from the AI",
  closed: "Conversation closed",
  snoozed: "Snoozed",
};
const TICKET_STATUS_TOAST: Record<TicketStatus, string> = {
  open: "Reopened",
  pending: "Marked pending",
  resolved: "Ticket resolved",
  closed: "Ticket closed",
};

const CONV_STATUS_LABEL: Record<ConvStatus, string> = {
  open: "Open",
  handled: "Handled",
  escalated: "Taken over",
  closed: "Closed",
  snoozed: "Snoozed",
};

const WA_WINDOW_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 500;

const SNOOZE_OPTIONS: { label: string; ms: number }[] = [
  { label: "1 hour", ms: 3_600_000 },
  { label: "4 hours", ms: 4 * 3_600_000 },
  { label: "24 hours", ms: 24 * 3_600_000 },
  { label: "3 days", ms: 3 * 24 * 3_600_000 },
];

const SHORTCUTS: [string, string][] = [
  [`${MOD} K`, "Command palette — jump anywhere, run anything"],
  ["j / k", "Move through the list"],
  ["Enter", "Open the highlighted item"],
  [`${MOD} + Enter`, "Send"],
  [`${SHIFT} + ${MOD} + Enter`, "Send & close / resolve"],
  ["e", "Close conversation · resolve ticket"],
  ["s", "Snooze & more actions"],
  ["n", "Switch between reply and internal note"],
  ["/", "Focus search"],
  ["Esc", "Back to the list"],
];

type Classification = { category: string; sentiment: string; priority: string; summary: string };

// WhatsApp template helpers: pull {{1}},{{2}}… placeholders and render with filled values.
const tplKeys = (body: string) =>
  Array.from(new Set([...body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => m[1]))).sort((a, b) => +a - +b);
const renderTpl = (body: string, vars: Record<string, string>) =>
  body.replace(/\{\{(\d+)\}\}/g, (_, n) => vars[n] || `{{${n}}}`);
/** Named snippet variables, substituted when inserted into the composer. */
const fillVars = (body: string, vars: { name: string; business: string }) =>
  body.replace(/\{\{\s*name\s*\}\}/gi, vars.name).replace(/\{\{\s*business\s*\}\}/gi, vars.business);

/** The composer grows with its content instead of scrolling a two-row box. */
function useAutoGrow(ref: React.RefObject<HTMLTextAreaElement | null>, value: string) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, [ref, value]);
}

// ─────────────────────────────────────────────────────────────────────────────
// The Inbox
// ─────────────────────────────────────────────────────────────────────────────

export default function InboxPage() {
  const { orgId, org, console: consoleCfg } = useOutletContext<OpsContext>();
  const orgCurrency = org.currency || "GBP";
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
  /** The org's SLA policy — drives the due/overdue chips in the queue. */
  const [slaPolicy, setSlaPolicy] = useState<SlaPolicy | null>(null);

  // Panels & popovers
  const [suggestion, setSuggestion] = useState<{ summary: string; suggestion: string } | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const [tpl, setTpl] = useState<CannedResponse | null>(null);
  const [tplVars, setTplVars] = useState<Record<string, string>>({});
  const [composer, setComposer] = useState<{ to: string; subject: string; body?: string; conversationId?: string } | null>(null);
  const [repliesOpen, setRepliesOpen] = useState(false);
  /** The thread's overflow menu. The `s` shortcut opens it straight to snooze. */
  const [moreOpen, setMoreOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [requestingCsat, setRequestingCsat] = useState(false);
  /** ⌘K. The console's actions were spread over a header, a rail and two menus. */
  const [paletteOpen, setPaletteOpen] = useState(false);
  /** Below 1200px the context rail is a sheet rather than a third column. */
  const [railOpen, setRailOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);

  /** Reply and Note both open the composer — they pick which one it is. */
  function openComposer(next: "reply" | "note") {
    setMode(next);
    setComposerOpen(true);
    // The dialog mounts this frame; focus once it exists.
    setTimeout(() => composerRef.current?.focus(), 0);
  }

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
  /** The queue's scroll pane. State, not a ref — see QueueList: the virtualiser
   *  reads it on mount, when a ref is still null. A mirror ref keeps the
   *  once-registered keyboard listener able to see the current element. */
  const [listEl, setListEl] = useState<HTMLDivElement | null>(null);
  const listElRef = useRef<HTMLDivElement | null>(null);
  listElRef.current = listEl;
  const searchRef = useRef<HTMLInputElement>(null);
  /** Only one thread is open at a time, so both reply boxes can share one ref.
   *  The send shortcut checks it, so ⌘+Enter in the search box can't send. */
  const composerRef = useRef<HTMLTextAreaElement>(null);
  /** Half-written replies, kept per item so switching threads never loses one. */
  const draftsRef = useRef<Record<string, { draft: string; subject: string }>>({});
  /** The shell measures its own distance to the bottom of the viewport, so the
   *  three panes fill the screen exactly without a hardcoded chrome height. */
  const shellRef = useRef<HTMLDivElement>(null);
  const shellHeight = useFillHeight(shellRef);

  useAutoGrow(composerRef, draft);

  const selConv = selected?.kind === "conversation" ? selected.conv : null;
  const selTicket = selected?.kind === "ticket" ? selected.ticket : null;

  // The number to dial, or null when there is nothing dialable on the
  // conversation. Voice threads with no PSTN leg carry a label ("web visitor")
  // in customer_phone, so a truthiness check would offer a call the backend
  // rejects — gate every call affordance on this instead.
  const callTo = callablePhone(selConv?.customer_phone);

  const memberName = useCallback(
    (id: string | null) => (id ? members.find((m) => m.user_id === id)?.full_name || "Teammate" : ""),
    [members],
  );
  /**
   * Open a thread at the TOP of its newest message, not the bottom of the pane.
   *
   * Scrolling to scrollHeight was right when an email was a 240px letterbox.
   * Now that mail renders at its full height, "the bottom" is the footer of a
   * long newsletter — so selecting a message dropped you at the end of its last
   * image with the message itself above the fold. A mail client shows you the
   * start of the latest message, which for a short SMS thread is the same
   * position anyway, because the browser clamps the scroll.
   */
  const lastAlignRef = useRef<number | null>(null);
  const scrollThread = (smooth = true) => {
    const align = () => {
      const pane = bodyRef.current;
      if (!pane) return;
      const msgs = pane.querySelectorAll<HTMLElement>(".ibx-msg, .ibx-note");
      const last = msgs[msgs.length - 1];
      if (!last) {
        pane.scrollTo({ top: pane.scrollHeight, behavior: smooth ? "smooth" : "auto" });
        return;
      }
      // Measured rather than read off offsetTop, which is relative to whichever
      // ancestor happens to be positioned.
      const delta = last.getBoundingClientRect().top - pane.getBoundingClientRect().top;
      const top = Math.max(0, pane.scrollTop + delta - 12);
      pane.scrollTo({ top, behavior: smooth ? "smooth" : "auto" });
      lastAlignRef.current = Math.round(top);
    };

    setTimeout(align, 60);
    // Images in an email land after first paint and shift everything below them,
    // so re-align once — but only if the reader has not scrolled since, or this
    // would yank the page out from under them.
    setTimeout(() => {
      const pane = bodyRef.current;
      if (!pane || lastAlignRef.current === null) return;
      if (Math.abs(pane.scrollTop - lastAlignRef.current) > 4) return;
      align();
    }, 450);
  };

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

  useEffect(() => {
    load();
  }, [load]);

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
    return () => {
      supabase.removeChannel(ch);
    };
  }, [orgId]);

  useEffect(() => {
    (async () => {
      setMe(await currentUserId());
      setCanned((await listCanned(orgId)).data);
      setMembers((await listMembers(orgId)).data);
      setSlaPolicy((await getServicePolicies(orgId)).data.sla);
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
    return () => {
      active = false;
      clearInterval(t);
      setViewers([]);
    };
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
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        next.delete(it.kind === "conversation" ? "t" : "c");
        next.set(it.kind === "conversation" ? "c" : "t", it.id);
        return next;
      },
      { replace: true },
    );
    setSuggestion(null);
    setSendNote(null);
    setMode("reply");
    setComposerOpen(false);
    setDraft(restored.draft);
    setEmailSubject(restored.subject);
    setTpl(null);
    setTplVars({});
    setMoreOpen(false);
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
    setRailOpen(false);
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        next.delete("c");
        next.delete("t");
        return next;
      },
      { replace: true },
    );
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
    setComposerOpen(false);
      setComposerOpen(false);
        setComposerOpen(false);
        dropDraft(selected);
        refreshThread();
        return;
      }
      const r = await sendConversationReply(
        orgId,
        conv.id,
        text,
        conv.channel_type,
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
    if (r.error) {
      toastError(r.error);
      return;
    }
    setSuggestion({ summary: r.summary, suggestion: r.suggestion });
  }

  async function aiDraftTicket() {
    if (!selTicket || aiDrafting) return;
    setAiDrafting(true);
    const { reply, confidence: conf, error } = await draftAiReply(orgId, selTicket.id);
    setAiDrafting(false);
    if (error) {
      toastError(error);
      return;
    }
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
    if (error) {
      toastError(error);
      return;
    }
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
    if (ok) {
      updateConv(selConv.id, { status: s });
      load();
    }
  }
  async function changeTicketStatus(s: TicketStatus) {
    if (!selTicket) return;
    const ok = await reportMutation(setTicketStatus(selTicket.id, s), TICKET_STATUS_TOAST[s]);
    if (ok) {
      updateTicket(selTicket.id, { status: s });
      load();
    }
  }
  async function addTag(e: React.FormEvent) {
    e.preventDefault();
    const t = tagDraft.trim();
    if (!selConv || !t || selConv.tags.includes(t)) {
      setTagDraft("");
      return;
    }
    const tags = [...selConv.tags, t];
    const ok = await reportMutation(setConversationTags(selConv.id, tags), "Tag added");
    if (ok) {
      updateConv(selConv.id, { tags });
      setTagDraft("");
    }
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
    if (ok) {
      updateConv(selConv.id, { status: "snoozed", snoozed_until: until });
      setMoreOpen(false);
      load();
    }
  }
  async function unsnooze() {
    if (!selConv) return;
    const ok = await reportMutation(snoozeConversation(selConv.id, null), "Unsnoozed");
    if (ok) {
      updateConv(selConv.id, { status: "open", snoozed_until: null });
      setMoreOpen(false);
      load();
    }
  }

  /** Honest CSAT: send the customer the survey link over the conversation's channel. */
  async function requestRating() {
    if (!selConv || selConv.csat_requested || requestingCsat) return;
    setRequestingCsat(true);
    try {
      const msg = `How did we do? We'd love your feedback — it takes one tap: ${csatSurveyUrl(selConv.id)}`;
      const r = await sendConversationReply(orgId, selConv.id, msg, selConv.channel_type);
      if (r.windowClosed) {
        toastError("WhatsApp's 24-hour window is closed — the survey can't be sent right now.");
        return;
      }
      if (!r.ok || r.error) {
        toastError(r.error ?? "Could not send the rating request.");
        return;
      }
      const ok = await reportMutation(markCsatRequested(selConv.id), "Rating request sent");
      if (ok) {
        updateConv(selConv.id, { csat_requested: true });
        refreshThread();
      }
    } finally {
      setRequestingCsat(false);
    }
  }

  // ── New ticket ────────────────────────────────────────────────────────────
  async function submitTicket(e: React.FormEvent) {
    e.preventDefault();
    if (creatingTicket) return; // a second click on a slow link created a second ticket
    if (!tForm.subject.trim() || !tForm.customer.trim()) {
      toastError("A subject and customer name are required.");
      return;
    }
    setCreatingTicket(true);
    try {
      const { ticketId, error } = await createTicket(orgId, {
        subject: tForm.subject,
        customer_name: tForm.customer,
        customer_email: tForm.email.trim() || undefined,
        message: tForm.message,
      });
      if (error || !ticketId) {
        toastError(error ?? "Could not create the ticket.");
        return;
      }
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
    if (!r.ok) {
      toastError(r.error ?? "Call could not be placed.");
      return;
    }
    // A placed call is a success — it belongs in a toast, not in the yellow
    // banner this file uses for problems.
    toast(
      callMode === "bridge"
        ? `Calling you${callPhone.trim() ? ` on ${callPhone.trim()}` : ""} — pick up and we'll connect ${callTo}.`
        : `Calling ${callTo} — your AI agent will speak with them.`,
    );
    setCallOpen(false);
  }
  function endBrowserCall() {
    try {
      callRef.current?.disconnect();
    } catch {
      /* noop */
    }
    try {
      deviceRef.current?.destroy();
    } catch {
      /* noop */
    }
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
      if (error || !token) {
        setConnecting(false);
        toastError(error ?? "Browser calling isn't configured.");
        return;
      }
      const { Device } = await import("@twilio/voice-sdk");
      const device = new Device(token, { logLevel: "error" });
      deviceRef.current = device;
      const c = await device.connect({ params: { To: callTo } });
      callRef.current = c;
      c.on("accept", () => {
        setInCall(true);
        setConnecting(false);
      });
      c.on("disconnect", endBrowserCall);
      c.on("cancel", endBrowserCall);
      c.on("error", (e: { message?: string }) => {
        toastError(`Call error: ${e?.message ?? "unknown"}`);
        endBrowserCall();
      });
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
  useEffect(
    () => () => {
      try {
        callRef.current?.disconnect();
        deviceRef.current?.destroy();
      } catch {
        /* noop */
      }
    },
    [],
  );

  // ── Snippets insertion ({{name}}/{{business}} substitution) ───────────────
  function insertSnippet(c: CannedResponse) {
    const name = (selConv?.customer_name || selTicket?.customer_name || "").trim() || "there";
    const body = fillVars(c.body, { name, business: org.name });
    setDraft((d) => (d ? d + "\n" : "") + body);
    composerRef.current?.focus();
  }
  const templates = canned.filter((c) => c.is_whatsapp_template);
  const snippets = canned.filter((c) => {
    if (c.is_whatsapp_template) return false;
    const ch = selected ? (selected.kind === "ticket" ? "email" : selected.conv.channel_type) : "";
    return c.channel === "any" || c.channel === ch;
  });

  function dictate() {
    type SR = {
      start: () => void;
      lang: string;
      interimResults: boolean;
      onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
      onend: (() => void) | null;
    };
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      toastError("Voice input isn't supported in this browser — type your message instead.");
      return;
    }
    const rec = new Ctor();
    rec.lang = navigator.language || "en-US";
    rec.interimResults = false;
    rec.onresult = (e) => {
      const said = Array.from(e.results)
        .map((r) => r[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (said) setDraft((d) => (d ? `${d} ${said}` : said));
    };
    rec.onend = () => setDictating(false);
    setDictating(true);
    rec.start();
  }

  // ── Keyboard layer ────────────────────────────────────────────────────────
  const stateRef = useRef({ visible, cursor, moreOpen, shortcutsOpen, composerOpen: false, modalOpen: false, hasDraft: false });
  stateRef.current = {
    visible,
    cursor,
    moreOpen,
    shortcutsOpen,
    composerOpen,
    // The composer is a dialog now, so the single-key queue shortcuts must not
    // fire while it is open — typing "n" in a reply would jump the queue.
    modalOpen: !!composer || repliesOpen || newTicketOpen || paletteOpen || composerOpen,
    hasDraft: !!draft.trim(),
  };
  const actionsRef = useRef<{
    send: (c: boolean) => void;
    open: (it: QueueItem) => void;
    closeOrResolve: () => void;
    move: (d: number) => void;
    close: () => void;
  }>({ send: () => {}, open: () => {}, closeOrResolve: () => {}, move: () => {}, close: () => {} });
  actionsRef.current = {
    send,
    open: (it) => {
      openItem(it);
    },
    close: closeSelected,
    closeOrResolve: () => {
      const sel = selectedRef.current;
      if (!sel) return;
      if (sel.kind === "conversation") {
        if (sel.conv.status !== "closed") setStatus("closed");
      } else if (sel.ticket.status !== "resolved") changeTicketStatus("resolved");
    },
    move: (delta: number) => {
      const { visible: vis, cursor: cur } = stateRef.current;
      if (vis.length === 0) return;
      // No cursor yet (fresh page, or the row left the filter): start at the top.
      const next = cur < 0 ? 0 : Math.max(0, Math.min(vis.length - 1, cur + delta));
      setKeyboardActive(true);
      // QueueList owns the scroll-and-focus, because the target row may not be
      // mounted yet — the list is virtualised.
      setCursorKey(itemKey(vis[next]));
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
      // ⌘K works from anywhere, including from inside a field — it is the one
      // shortcut that has to be reachable mid-sentence.
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if (st.modalOpen) return; // EmailComposer / RepliesDrawer / palette handle their own keys
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
        if (st.composerOpen) {
          setComposerOpen(false);
          return;
        }
        if (st.shortcutsOpen) {
          setShortcutsOpen(false);
          return;
        }
        if (st.moreOpen) {
          setMoreOpen(false);
          return;
        }
        actionsRef.current.close();
        return;
      }
      // Single-key shortcuts are scoped to the queue (or to nothing being
      // focused), so they can't fire while the owner is working elsewhere.
      const active = document.activeElement;
      const inQueue = !active || active === document.body || !!listElRef.current?.contains(active);
      if (!inQueue) return;
      switch (e.key) {
        case "j":
          e.preventDefault();
          actionsRef.current.move(1);
          break;
        case "k":
          e.preventDefault();
          actionsRef.current.move(-1);
          break;
        case "Enter": {
          const it = st.visible[st.cursor];
          if (it) {
            e.preventDefault();
            setKeyboardActive(true);
            actionsRef.current.open(it);
          }
          break;
        }
        case "e":
          e.preventDefault();
          actionsRef.current.closeOrResolve();
          break;
        case "n":
          if (selectedRef.current?.kind === "conversation") {
            e.preventDefault();
            setMode((m) => (m === "reply" ? "note" : "reply"));
            composerRef.current?.focus();
          }
          break;
        case "s":
          if (selectedRef.current?.kind === "conversation") {
            e.preventDefault();
            setMoreOpen((o) => !o);
          }
          break;
        case "/":
          e.preventDefault();
          searchRef.current?.focus();
          break;
        default:
          break;
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

  // How many distinct channels this customer's timeline spans. Drives the
  // per-message channel badge — shown only when there is more than one, so a
  // single-channel conversation looks exactly as it did before.
  const timelineChannels = new Set(messages.map((m) => m.channel_type).filter(Boolean)).size;
  const transcriptLines = messages.filter((m) => m.role !== "note").length;

  const customerName = selConv?.customer_name || selConv?.customer_phone || selTicket?.customer_name || "Customer";
  const threadChannel = selConv?.channel_type ?? (selTicket ? "ticket" : null);
  const isNote = mode === "note" && !!selConv;

  // ── Palette commands ──────────────────────────────────────────────────────
  const commands = useMemo<PaletteCommand[]>(() => {
    const list: PaletteCommand[] = [
      { id: "new-ticket", group: "Create", label: "New ticket", icon: <TicketIcon />, run: () => setNewTicketOpen(true) },
      {
        id: "new-email",
        group: "Create",
        label: "New email thread",
        icon: <MessageSquarePlus />,
        run: () => setComposer({ to: "", subject: "" }),
      },
      { id: "snippets", group: "Create", label: "Manage saved replies", icon: <StickyNote />, run: () => setRepliesOpen(true) },
      { id: "shortcuts", group: "Help", label: "Keyboard shortcuts", icon: <Keyboard />, run: () => setShortcutsOpen(true) },
    ];
    for (const f of QUEUE_FILTERS) {
      list.push({
        id: `filter-${f.v}`,
        group: "Filter",
        label: `Show ${f.label.toLowerCase()}`,
        icon: <Filter />,
        hint: String(counts[f.v] ?? 0),
        run: () => setFQueue(f.v),
      });
    }
    if (selConv) {
      list.push(
        { id: "st-closed", group: "This conversation", label: "Close conversation", icon: <CircleCheck />, hint: "e", run: () => setStatus("closed") },
        { id: "st-handled", group: "This conversation", label: "Mark handled", icon: <CircleCheck />, run: () => setStatus("handled") },
        { id: "st-open", group: "This conversation", label: "Reopen", icon: <CircleCheck />, run: () => setStatus("open") },
        {
          id: "takeover",
          group: "This conversation",
          label: "Take over from the AI",
          icon: <UserRoundCheck />,
          disabled: selConv.status === "escalated",
          run: () => setStatus("escalated"),
        },
        { id: "ai-draft", group: "This conversation", label: "Draft a reply with AI", icon: <Sparkles />, run: runSuggest },
        { id: "note", group: "This conversation", label: "Write an internal note", icon: <StickyNote />, hint: "n", run: () => openComposer("note") },
        { id: "rating", group: "This conversation", label: "Request a satisfaction rating", icon: <TagIcon />, disabled: selConv.csat_requested || selConv.csat_score != null, run: requestRating },
      );
      for (const o of SNOOZE_OPTIONS)
        list.push({ id: `snooze-${o.ms}`, group: "This conversation", label: `Snooze for ${o.label}`, icon: <Clock />, run: () => snoozeFor(o.ms) });
      if (callTo)
        list.push({ id: "call", group: "This conversation", label: `Call ${callTo}`, icon: <Phone />, run: () => setCallOpen(true) });
    }
    if (selTicket) {
      list.push(
        { id: "t-resolve", group: "This ticket", label: "Resolve ticket", icon: <CircleCheck />, hint: "e", run: () => changeTicketStatus("resolved") },
        { id: "t-pending", group: "This ticket", label: "Mark pending", icon: <Clock />, run: () => changeTicketStatus("pending") },
        { id: "t-open", group: "This ticket", label: "Reopen ticket", icon: <CircleCheck />, run: () => changeTicketStatus("open") },
        { id: "t-classify", group: "This ticket", label: "Classify with AI", icon: <Wand2 />, run: classifyTicket },
        { id: "t-draft", group: "This ticket", label: "Draft a reply with AI", icon: <Sparkles />, run: aiDraftTicket },
      );
    }
    for (const s of snippets.slice(0, 12))
      list.push({ id: `snip-${s.id}`, group: "Saved replies", label: s.title || s.shortcut, icon: <StickyNote />, disabled: !selected, run: () => insertSnippet(s) });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selConv, selTicket, counts, callTo, snippets, selected]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  const railProps = {
    orgId,
    currency: orgCurrency,
    conv: selConv,
    ticket: selTicket,
    modules: consoleCfg.modules,
    members,
    me,
    firstResponseMin: frt,
    tagDraft,
    setTagDraft,
    onAssign: assign,
    onAddTag: addTag,
    onRemoveTag: removeTag,
    onRequestRating: requestRating,
    requestingCsat,
  };

  return (
    <div
      ref={shellRef}
      className={`ibx${selected ? " has-open" : ""}`}
      style={shellHeight ? ({ "--oc-h": `${shellHeight}px` } as React.CSSProperties) : undefined}
    >
      {/* ══ Queue ═══════════════════════════════════════════════════════════ */}
      <section className="oc-pane oc-pane--queue" aria-label="Conversations">
        <div className="oc-pane__head">
          <div className="d-flex align-items-center gap-2 mb-2">
            <div className="ibx-search flex-grow-1">
              <Search width={15} height={15} strokeWidth={2.2} />
              <input
                ref={searchRef}
                placeholder="Search messages"
                aria-label="Search conversations and tickets"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              {searchInput ? (
                <button type="button" className="oc-ico" style={{ width: 22, height: 22 }} aria-label="Clear search" onClick={() => setSearchInput("")}>
                  <X width={13} height={13} />
                </button>
              ) : (
                <button type="button" className="oc-kbd" onClick={() => setPaletteOpen(true)} title="Command palette">
                  {MOD}K
                </button>
              )}
            </div>

            <Menu
              label="Create"
              trigger={
                <button type="button" className="oc-btn oc-btn--primary" style={{ padding: "7px 10px" }} title="Start something new">
                  <Plus />
                </button>
              }
            >
              <MenuItem icon={<TicketIcon />} onSelect={() => setNewTicketOpen(true)}>
                New ticket
              </MenuItem>
              <MenuItem icon={<MessageSquarePlus />} onSelect={() => setComposer({ to: "", subject: "" })}>
                New email thread
              </MenuItem>
              <MenuSep />
              <MenuItem icon={<StickyNote />} onSelect={() => setRepliesOpen(true)}>
                Saved replies
              </MenuItem>
              <MenuItem icon={<Keyboard />} onSelect={() => setShortcutsOpen(true)} hint={`${MOD}K`}>
                Shortcuts
              </MenuItem>
            </Menu>
          </div>

          <div className="d-flex align-items-center gap-1">
            <div className="ibx-chips flex-grow-1">
              {QUEUE_FILTERS.map((f) => (
                <button
                  key={f.v}
                  type="button"
                  aria-pressed={fQueue === f.v}
                  onClick={() => setFQueue(f.v)}
                  className={`ibx-chip${f.v === "escalated" && counts.escalated > 0 ? " is-alert" : ""}`}
                >
                  {f.label}
                  <span className="ibx-chip__n">{counts[f.v]}</span>
                </button>
              ))}
            </div>

            {/* The channel picker was a bare <select> under the search box; it is
                now a menu that shows which channel is active on its trigger. */}
            <Menu
              label="Filter by channel"
              trigger={
                <button type="button" className={`oc-ico${fChannel ? " is-on" : ""}`} title="Filter by channel">
                  {fChannel ? <ChannelIcon channel={fChannel} size={15} /> : <Filter width={15} height={15} />}
                </button>
              }
            >
              <MenuLabel>Channel</MenuLabel>
              {CHANNEL_FILTERS.map((ch) => (
                <MenuItem
                  key={ch || "all"}
                  icon={ch ? <ChannelIcon channel={ch} size={15} /> : <Filter />}
                  onSelect={() => setFChannel(ch)}
                  hint={fChannel === ch ? "✓" : undefined}
                >
                  {ch ? channelLabel(ch) : "All channels"}
                </MenuItem>
              ))}
            </Menu>
          </div>
        </div>

        <div className="oc-pane__body" ref={setListEl}>
          {error && (
            <div className="p-3">
              <div className="oc-panel oc-panel--danger" role="alert">
                {error}
              </div>
            </div>
          )}
          {loading ? (
            <SkeletonRows />
          ) : visible.length === 0 ? (
            filtersActive ? (
              <EmptyState
                icon={<Search />}
                title="Nothing matches these filters"
                action={
                  <button type="button" className="oc-btn" onClick={clearFilters}>
                    Clear filters
                  </button>
                }
              >
                Try a different status or channel.
              </EmptyState>
            ) : (
              <EmptyState icon={<InboxIcon />} title="No conversations yet">
                Messages from your website chat, SMS, WhatsApp, email and calls all land here.
              </EmptyState>
            )
          ) : (
            <QueueList
              items={visible}
              selectedKey={selected ? itemKey(selected) : null}
              cursorKey={cursorKey}
              keyboardActive={keyboardActive}
              onOpen={openItem}
              onCursor={setCursorKey}
              scrollEl={listEl}
              assigneeName={memberName}
              sla={slaPolicy}
              hasMore={convos.length >= limit}
              loadingMore={loadingMore}
              onLoadMore={() => {
                setLoadingMore(true);
                setLimit((l) => l + PAGE_SIZE);
              }}
            />
          )}
        </div>
      </section>

      {/* ══ Thread ══════════════════════════════════════════════════════════ */}
      <section className="oc-pane oc-pane--thread" aria-label="Conversation">
        {!selected ? (
          <EmptyState icon={<InboxIcon />} title="Pick a message to read it">
            Choose a conversation or ticket on the left — or press <Kbd>{MOD} K</Kbd> to jump straight to one.
          </EmptyState>
        ) : (
          <>
            {/* ── Thread header ─────────────────────────────────────────── */}
            <header className="ibx-thread__head">
              <button type="button" className="oc-ico d-lg-none" aria-label="Back to the list" onClick={closeSelected}>
                <ArrowLeft width={17} height={17} />
              </button>

              <Avatar name={customerName} channel={threadChannel} size="md" />

              <button
                type="button"
                className="ibx-thread__who ibx-thread__who--btn"
                onClick={() => setRailOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={railOpen}
                title="Customer details"
              >
                <h2 className="ibx-thread__name">
                  <span>{selTicket ? selTicket.subject : customerName}</span>
                  {selConv?.intent && <Tag>{selConv.intent}</Tag>}
                </h2>
                <div className="ibx-thread__sub">
                  {threadChannel && <ChannelIcon channel={threadChannel} size={11} />}
                  <span>{selTicket ? customerName : channelLabel(selConv!.channel_type)}</span>
                  <span>·</span>
                  <span>{relTime(selected.at)}</span>
                  {selConv &&
                    [displayPhone(selConv.customer_phone), selConv.customer_email].filter(Boolean).length > 0 && (
                      <>
                        <span>·</span>
                        <span className="text-truncate">
                          {[displayPhone(selConv.customer_phone), selConv.customer_email].filter(Boolean).join(" · ")}
                        </span>
                      </>
                    )}
                  {selTicket?.customer_email && (
                    <>
                      <span>·</span>
                      <span className="text-truncate">{selTicket.customer_email}</span>
                    </>
                  )}
                </div>
              </button>

              {/* Someone else is in here too — a real risk of double-replying. */}
              {viewers.length > 0 && (
                <span className="d-none d-xl-inline-flex" title={`${viewers.map(memberName).join(", ")} is also viewing this`}>
                  <Tag tone="warn">{viewers.map(memberName).join(", ") || "A teammate"} is here</Tag>
                </span>
              )}

              {callTo && (
                <span className="d-none d-lg-inline-flex">
                  <IconButton
                    icon={<Phone width={16} height={16} />}
                    label={`Call ${callTo}`}
                    active={callOpen || inCall}
                    disabled={calling}
                    onClick={() => setCallOpen((o) => !o)}
                  />
                </span>
              )}

              {/* Status is the one control that is always one click away. */}
              <Menu
                label="Status"
                trigger={
                  <button type="button" className="oc-btn" style={{ gap: 4 }}>
                    {selConv ? CONV_STATUS_LABEL[selConv.status] : TICKET_STATUS_LABEL[selTicket!.status]}
                    <ChevronDown width={13} height={13} />
                  </button>
                }
              >
                <MenuLabel>{selConv ? "Conversation status" : "Ticket status"}</MenuLabel>
                {selConv
                  ? (["open", "handled", "closed"] as ConvStatus[]).map((s) => (
                      <MenuItem
                        key={s}
                        icon={<CircleCheck />}
                        disabled={selConv.status === s}
                        hint={s === "closed" ? "e" : undefined}
                        onSelect={() => setStatus(s)}
                      >
                        {CONV_STATUS_LABEL[s]}
                      </MenuItem>
                    ))
                  : (["open", "pending", "resolved"] as TicketStatus[]).map((s) => (
                      <MenuItem
                        key={s}
                        icon={<CircleCheck />}
                        disabled={selTicket!.status === s}
                        hint={s === "resolved" ? "e" : undefined}
                        onSelect={() => changeTicketStatus(s)}
                      >
                        {TICKET_STATUS_LABEL[s]}
                      </MenuItem>
                    ))}
              </Menu>

              {/* Everything else — the old header wrapped onto three rows. */}
              <Menu
                label="More actions"
                open={moreOpen}
                onOpenChange={setMoreOpen}
                trigger={
                  <button type="button" className="oc-ico" title="More actions">
                    <span aria-hidden="true" style={{ fontSize: 17, lineHeight: 0.6, letterSpacing: 1 }}>
                      ⋯
                    </span>
                  </button>
                }
              >
                {callTo && (
                  <MenuItem icon={<Phone />} disabled={calling} onSelect={() => setCallOpen(true)}>
                    Call {callTo}
                  </MenuItem>
                )}
                {selConv && (
                  <>
                    <MenuItem
                      icon={<UserRoundCheck />}
                      disabled={selConv.status === "escalated"}
                      onSelect={() => setStatus("escalated")}
                    >
                      Take over from the AI
                    </MenuItem>
                    <MenuLabel>{selConv.status === "snoozed" ? "Snoozed" : "Snooze until…"}</MenuLabel>
                    {selConv.status === "snoozed" ? (
                      <MenuItem icon={<Clock />} onSelect={unsnooze}>
                        Unsnooze now
                        {selConv.snoozed_until && (
                          <div style={{ fontSize: 11, color: "var(--at-neutral-400)" }}>
                            was until {new Date(selConv.snoozed_until).toLocaleString()}
                          </div>
                        )}
                      </MenuItem>
                    ) : (
                      SNOOZE_OPTIONS.map((o) => (
                        <MenuItem key={o.label} icon={<Clock />} onSelect={() => snoozeFor(o.ms)}>
                          {o.label}
                        </MenuItem>
                      ))
                    )}
                    <MenuSep />
                  </>
                )}
                {selConv?.customer_email && (
                  <MenuItem
                    icon={<Paperclip />}
                    onSelect={() =>
                      setComposer({ to: selConv.customer_email, subject: emailSubject, body: draft, conversationId: selConv.id })
                    }
                  >
                    {selConv.channel_type === "email" ? "Attach files / format" : "Send a rich email"}
                  </MenuItem>
                )}
                {selTicket && (
                  <MenuItem icon={<Wand2 />} disabled={classifying} onSelect={classifyTicket}>
                    {classifying ? "Classifying…" : "Classify with AI"}
                  </MenuItem>
                )}
                <MenuItem icon={<StickyNote />} onSelect={() => setRepliesOpen(true)}>
                  Saved replies
                </MenuItem>
                <MenuItem icon={<PanelRight />} onSelect={() => setRailOpen(true)}>
                  Customer details
                </MenuItem>
                <MenuSep />
                <MenuItem icon={<Keyboard />} onSelect={() => setShortcutsOpen(true)} hint={`${MOD}K`}>
                  Keyboard shortcuts
                </MenuItem>
              </Menu>

              {/* Between lg and xl the rail has left the grid but the header still
                  has room for a direct toggle. On a phone it would cost the
                  customer's name, so there the overflow menu carries it. */}
              <span className="d-none d-lg-inline-flex d-xl-none">
                <IconButton icon={<PanelRight width={16} height={16} />} label="Customer details" onClick={() => setRailOpen(true)} />
              </span>
            </header>

            {/* ── Messages ──────────────────────────────────────────────── */}
            <div className="oc-pane__body" ref={bodyRef}>
              <div className="ibx-msgs">
                {viewers.length > 0 && (
                  <div className="oc-panel oc-panel--warn mb-3 d-xl-none" role="status">
                    {viewers.map(memberName).join(", ") || "A teammate"} is also viewing this conversation.
                  </div>
                )}
                {/* Voice threads lead with the recording; the transcript is a
                    disclosure underneath it. */}
                {isVoice && calls.length > 0 && (
                  <div className="oc-panel mb-3">
                    {calls.map((c) => (
                      <div key={c.id} className="mb-2">
                        <div className="d-flex align-items-center justify-content-between gap-2">
                          <span className="fw-600 d-inline-flex align-items-center gap-1 text-capitalize">
                            <Phone width={13} height={13} />
                            {c.direction} call{c.after_hours ? " · after hours" : ""}
                          </span>
                          <Tag>{c.outcome}</Tag>
                        </div>
                        <div style={{ fontSize: 11.5, color: "var(--at-neutral-500)" }}>
                          {new Date(c.created_at).toLocaleString()}
                        </div>
                        {c.recording_url ? (
                          <audio controls src={c.recording_url} className="w-100 mt-1" style={{ height: 34 }} />
                        ) : (
                          <div style={{ fontSize: 11.5, color: "var(--at-neutral-400)" }} className="mt-1">
                            No recording captured.
                          </div>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      className="oc-btn oc-btn--sm"
                      aria-expanded={showTranscript}
                      onClick={() => setShowTranscript((v) => !v)}
                    >
                      {showTranscript ? "Hide transcript" : `View transcript (${transcriptLines} lines)`}
                    </button>
                  </div>
                )}

                {selTicket ? (
                  ticketMsgs.length === 0 ? (
                    <div className="text-center py-4" style={{ fontSize: 12.5, color: "var(--at-neutral-400)" }}>
                      No messages yet.
                    </div>
                  ) : (
                    <TicketMessages messages={ticketMsgs} customerName={customerName} />
                  )
                ) : (
                  <>
                    {!voiceCollapsed && messages.length === 0 && (
                      <div className="text-center py-4" style={{ fontSize: 12.5, color: "var(--at-neutral-400)" }}>
                        No messages yet.
                      </div>
                    )}
                    {/* Internal notes are the team's own writing — collapsing the
                        call transcript must never hide them. */}
                    <ConversationMessages
                      messages={voiceCollapsed ? messages.filter((m) => m.role === "note") : messages}
                      showChannel={timelineChannels > 1}
                      customerName={customerName}
                    />
                  </>
                )}
              </div>
            </div>

            {/* ── Composer ──────────────────────────────────────────────── */}
            {/* The composer opens as a dialog. Inline, it stood permanently at the
                foot of the thread taking a fifth of the reading height whether or not
                you were writing — and every control on it (calls, templates, saved
                replies, AI) was competing with the message you were reading. */}
            {!composerOpen ? (
              <footer className="oc-pane__foot ibx-comp ibx-comp--shut">
                <button type="button" className="oc-btn" onClick={() => openComposer("reply")}>
                  <Send /> Reply
                </button>
                {selConv && (
                  <button type="button" className="oc-btn" onClick={() => openComposer("note")}>
                    <StickyNote /> Note
                  </button>
                )}
              </footer>
            ) : (
              <div
                className="oc-sheet__scrim ibx-comp-scrim"
                role="presentation"
                onMouseDown={(e) => e.target === e.currentTarget && setComposerOpen(false)}
              >
                <div className="ibx-comp-modal" role="dialog" aria-modal="true" aria-label={isNote ? "Write an internal note" : "Write a reply"}>
                  <header className="ibx-comp-modal__head">
                    <b>{isNote ? "Internal note" : `Reply to ${customerName}`}</b>
                    <button type="button" className="oc-ico ms-auto" aria-label="Close the composer" onClick={() => setComposerOpen(false)}>
                      ✕
                    </button>
                  </header>
              <footer className={`oc-pane__foot ibx-comp${isNote ? " is-note" : ""}`}>
                <div className="ibx-comp__stack">
                  {/* Calls */}
                  {callOpen && callTo && (
                    <div className="oc-panel">
                      {connecting || inCall ? (
                        <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
                          <span className="fw-600 d-inline-flex align-items-center gap-2">
                            <Phone width={14} height={14} />
                            {connecting ? "Connecting…" : "On call"} · {callTo}
                          </span>
                          <div className="d-flex gap-2">
                            {inCall && (
                              <button type="button" className={`oc-btn oc-btn--sm${muted ? " oc-btn--accent" : ""}`} onClick={toggleMute}>
                                <Mic /> {muted ? "Unmute" : "Mute"}
                              </button>
                            )}
                            <button type="button" className="oc-btn oc-btn--sm oc-btn--danger" onClick={endBrowserCall}>
                              <PhoneOff /> Hang up
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="oc-panel__head">
                            <Phone /> Call {callTo}
                          </div>
                          <div className="mb-2">
                            <Segmented
                              label="Call mode"
                              value={callMode}
                              onChange={setCallMode}
                              options={[
                                { v: "ai" as const, label: "AI agent calls" },
                                { v: "bridge" as const, label: "Connect me" },
                                { v: "browser" as const, label: "Talk here" },
                              ]}
                            />
                          </div>
                          {callMode === "ai" && (
                            <>
                              <label className="oc-label" htmlFor="call-opening">
                                Opening line — optional
                              </label>
                              <input
                                id="call-opening"
                                className="oc-field mb-2"
                                placeholder="e.g. Hi, I'm calling about your order…"
                                value={callOpening}
                                onChange={(e) => setCallOpening(e.target.value)}
                              />
                            </>
                          )}
                          {callMode === "bridge" && (
                            <>
                              <label className="oc-label" htmlFor="call-phone">
                                Your number — blank uses your profile phone
                              </label>
                              <input
                                id="call-phone"
                                type="tel"
                                className="oc-field mb-2"
                                placeholder="+1 555 000 1234"
                                value={callPhone}
                                onChange={(e) => setCallPhone(e.target.value)}
                              />
                            </>
                          )}
                          <div className="mb-2" style={{ fontSize: 11.5, color: "var(--at-neutral-500)" }}>
                            {callMode === "ai" && `The AI agent will call ${callTo} and talk to them.`}
                            {callMode === "bridge" && `We'll call you first, then connect you to ${callTo}.`}
                            {callMode === "browser" && `Talk to ${callTo} from this browser — allow microphone access when prompted.`}
                          </div>
                          <button
                            type="button"
                            className="oc-btn oc-btn--primary"
                            onClick={callMode === "browser" ? startBrowserCall : call}
                            disabled={calling || connecting}
                          >
                            {calling || connecting ? "…" : callMode === "browser" ? "Start call" : "Place call"}
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* WhatsApp's 24-hour window */}
                  {waWindowClosed && (
                    <div className="oc-panel oc-panel--warn">
                      <div className="oc-panel__head">
                        <Clock /> WhatsApp's 24-hour window is closed
                      </div>
                      Free-form replies will be rejected — send an approved template:
                      {templates.length === 0 ? (
                        <div className="mt-1">No templates yet — add one under “Saved replies”.</div>
                      ) : (
                        <div className="d-flex flex-wrap gap-1 mt-2">
                          {templates.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              className={`oc-btn oc-btn--sm${tpl?.id === t.id ? " oc-btn--primary" : ""}`}
                              onClick={() => {
                                setTpl(t);
                                setTplVars({});
                              }}
                            >
                              {t.title || t.shortcut}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Template preview + variables */}
                  {tpl && (
                    <div className="oc-panel">
                      <div className="oc-panel__head">
                        <StickyNote /> Template · {tpl.title || tpl.shortcut}
                      </div>
                      <div className="mb-2" style={{ whiteSpace: "pre-wrap" }}>
                        {renderTpl(tpl.body, tplVars)}
                      </div>
                      {!tpl.whatsapp_template_sid && (
                        <div className="oc-panel oc-panel--warn mb-2">
                          No approval code on this saved reply — add it under “Saved replies” so it can be sent.
                        </div>
                      )}
                      {tplKeys(tpl.body).map((k) => (
                        <div key={k} className="mb-2">
                          <label className="oc-label" htmlFor={`tplvar-${k}`}>{`Value for {{${k}}}`}</label>
                          <input
                            id={`tplvar-${k}`}
                            className="oc-field"
                            value={tplVars[k] ?? ""}
                            onChange={(e) => setTplVars((v) => ({ ...v, [k]: e.target.value }))}
                          />
                        </div>
                      ))}
                      <div className="d-flex gap-2">
                        <button
                          type="button"
                          className="oc-btn oc-btn--primary"
                          disabled={busy || !tpl.whatsapp_template_sid || tplKeys(tpl.body).some((k) => !tplVars[k]?.trim())}
                          onClick={sendTemplate}
                        >
                          Send template
                        </button>
                        <button type="button" className="oc-btn" onClick={() => setTpl(null)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* AI draft — previewed before it goes anywhere */}
                  {suggestion && (
                    <div className="oc-panel oc-panel--ai">
                      <div className="oc-panel__head">
                        <Sparkles /> AI draft
                      </div>
                      {suggestion.summary && (
                        <div className="mb-1" style={{ fontSize: 11.5, opacity: 0.85 }}>
                          <strong>Summary:</strong> {suggestion.summary}
                        </div>
                      )}
                      {confidence != null && confidence < 0.7 && (
                        <div className="mb-1 fw-600" style={{ fontSize: 11.5 }}>
                          The AI is unsure — read this before sending.
                        </div>
                      )}
                      <div style={{ whiteSpace: "pre-wrap" }}>{suggestion.suggestion}</div>
                      <div className="d-flex gap-2 mt-2">
                        <button
                          type="button"
                          className="oc-btn oc-btn--accent"
                          onClick={() => {
                            setMode("reply");
                            setDraft(suggestion.suggestion);
                            setSuggestion(null);
                            composerRef.current?.focus();
                          }}
                        >
                          Use this reply
                        </button>
                        <button type="button" className="oc-btn" onClick={() => setSuggestion(null)}>
                          Discard
                        </button>
                      </div>
                    </div>
                  )}

                  {sendNote && (
                    <div className="oc-panel oc-panel--warn" role="alert">
                      {sendNote}
                    </div>
                  )}
                </div>

                {/* Composer bar: mode, snippets, AI — then the field itself. */}
                <div className="ibx-comp__bar">
                  {selConv && (
                    <Segmented
                      label="Composer mode"
                      noteMode={isNote}
                      value={mode}
                      onChange={setMode}
                      options={[
                        { v: "reply" as const, label: "Reply", icon: <Send /> },
                        { v: "note" as const, label: "Note", icon: <StickyNote /> },
                      ]}
                    />
                  )}

                  <div className="ms-auto d-flex align-items-center gap-1">
                    {(!selConv || mode === "reply") && (
                      <Menu
                        label="Saved replies"
                        trigger={
                          <button type="button" className="oc-ico" title="Saved replies">
                            <StickyNote width={16} height={16} />
                          </button>
                        }
                      >
                        <MenuLabel>Saved replies</MenuLabel>
                        {snippets.length === 0 && <MenuItem disabled>None for this channel yet</MenuItem>}
                        {snippets.map((c) => (
                          <MenuItem key={c.id} icon={<StickyNote />} hint={c.shortcut} onSelect={() => insertSnippet(c)}>
                            {c.title || c.shortcut}
                          </MenuItem>
                        ))}
                        <MenuSep />
                        <MenuItem icon={<Plus />} onSelect={() => setRepliesOpen(true)}>
                          Manage saved replies
                        </MenuItem>
                      </Menu>
                    )}

                    <IconButton
                      icon={<Sparkles width={16} height={16} />}
                      label={selTicket ? "Draft with AI" : "Draft a reply with AI"}
                      disabled={selTicket ? aiDrafting : suggesting}
                      onClick={selTicket ? aiDraftTicket : runSuggest}
                    />

                    <IconButton
                      icon={<Mic width={16} height={16} />}
                      label={dictating ? "Listening…" : "Dictate a message"}
                      tone={dictating ? "rec" : undefined}
                      onClick={dictate}
                      aria-pressed={dictating}
                    />
                  </div>
                </div>

                {(!selConv || mode === "reply") && selConv?.channel_type === "email" && (
                  <div className="mb-2">
                    <label className="oc-label" htmlFor="conv-subject">
                      Subject — optional
                    </label>
                    <input
                      id="conv-subject"
                      className="oc-field"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                    />
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    send(false);
                  }}
                >
                  <div className="ibx-comp__box">
                    <textarea
                      ref={composerRef}
                      rows={1}
                      aria-label={isNote ? "Internal note" : "Reply"}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder={
                        isNote
                          ? "Private note for your team — the customer never sees this…"
                          : selTicket
                            ? "Type a reply — it will be emailed to the customer…"
                            : `Message ${customerName}…`
                      }
                    />
                    <button
                      type="submit"
                      className="ibx-send"
                      disabled={busy || !draft.trim()}
                      aria-label={isNote ? "Save note" : "Send"}
                    >
                      {isNote ? <StickyNote width={16} height={16} /> : <Send width={16} height={16} />}
                    </button>
                  </div>
                </form>

                <div className="ibx-comp__hint">
                  <span>
                    <Kbd>
                      {MOD} {ENTER}
                    </Kbd>{" "}
                    send
                    {/* The second hint is the same thing the button next to it
                        says, so on a narrow pane the button alone is enough. */}
                    {!isNote && (
                      <span className="d-none d-sm-inline">
                        {" · "}
                        <Kbd>
                          {SHIFT} {MOD} {ENTER}
                        </Kbd>{" "}
                        send &amp; {selTicket ? "resolve" : "close"}
                      </span>
                    )}
                  </span>
                  {!isNote && (
                    <button
                      type="button"
                      className="oc-btn oc-btn--sm"
                      disabled={busy || !draft.trim()}
                      onClick={() => send(true)}
                      title={`Send the reply and ${selTicket ? "resolve the ticket" : "close the conversation"}`}
                    >
                      <CircleCheck /> Send &amp; {selTicket ? "resolve" : "close"}
                    </button>
                  )}
                </div>
              </footer>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* ══ Context rail ════════════════════════════════════════════════════ */}
      {/* Opened from the thread header, at every width. It used to hold a third
          column permanently, which cost the reading pane a third of its width
          for information you only want occasionally. */}
      {railOpen && (
        <div className="oc-sheet__scrim ibx-rail-sheet" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setRailOpen(false)}>
          <div className="oc-sheet" role="dialog" aria-label="Customer details">
            <ContextRail {...railProps} onClose={() => setRailOpen(false)} />
          </div>
        </div>
      )}

      {/* ══ Overlays ════════════════════════════════════════════════════════ */}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        items={visible}
        commands={commands}
        onOpenItem={openItem}
      />

      {newTicketOpen && (
        <Sheet title="New ticket" labelledBy="ibx-new-ticket" onClose={() => setNewTicketOpen(false)}>
          <form onSubmit={submitTicket} id="ibx-new-ticket-form">
            <label className="oc-label" htmlFor="nt-subject">
              Subject
            </label>
            <input
              id="nt-subject"
              className="oc-field mb-3"
              required
              value={tForm.subject}
              onChange={(e) => setTForm({ ...tForm, subject: e.target.value })}
            />
            <label className="oc-label" htmlFor="nt-customer">
              Customer name
            </label>
            <input
              id="nt-customer"
              className="oc-field mb-3"
              required
              value={tForm.customer}
              onChange={(e) => setTForm({ ...tForm, customer: e.target.value })}
            />
            <label className="oc-label" htmlFor="nt-email">
              Customer email — replies are emailed here
            </label>
            <input
              id="nt-email"
              type="email"
              className="oc-field mb-3"
              value={tForm.email}
              onChange={(e) => setTForm({ ...tForm, email: e.target.value })}
            />
            <label className="oc-label" htmlFor="nt-message">
              What did the customer ask?
            </label>
            <textarea
              id="nt-message"
              className="oc-field"
              rows={5}
              value={tForm.message}
              onChange={(e) => setTForm({ ...tForm, message: e.target.value })}
            />
            <button type="submit" className="oc-btn oc-btn--primary mt-3" disabled={creatingTicket}>
              {creatingTicket ? "Creating…" : "Create ticket"}
            </button>
          </form>
        </Sheet>
      )}

      {shortcutsOpen && (
        <Sheet title="Keyboard shortcuts" labelledBy="ibx-shortcuts" onClose={() => setShortcutsOpen(false)}>
          <div className="d-flex flex-column gap-2">
            {SHORTCUTS.map(([k, d]) => (
              <div key={k} className="d-flex align-items-center justify-content-between gap-3" style={{ fontSize: 13 }}>
                <span style={{ color: "var(--at-neutral-600)" }}>{d}</span>
                <Kbd>{k}</Kbd>
              </div>
            ))}
          </div>
        </Sheet>
      )}

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
          onInsert={
            selected
              ? (c) => {
                  insertSnippet(c);
                  setRepliesOpen(false);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}

