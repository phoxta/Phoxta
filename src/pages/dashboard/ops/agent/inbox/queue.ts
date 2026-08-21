import type { Conversation, ConvStatus } from "@/lib/db/ops/agent";
import type { Ticket, TicketStatus } from "@/lib/db/ops/helpdesk";

/**
 * The unified queue: conversations and helpdesk tickets in one list, one row
 * shape, one set of owner-facing buckets. Lives outside InboxPage so the
 * virtualised list and the command palette can share it without a cycle.
 */

/** One row in the queue: a conversation or a helpdesk ticket. */
export type QueueItem =
  | { kind: "conversation"; id: string; at: string; conv: Conversation }
  | { kind: "ticket"; id: string; at: string; ticket: Ticket };

/**
 * Owner-facing buckets, not raw enums: conversations and tickets use different
 * status words for the same three situations, and filtering on the raw values
 * made an item vanish from every chip the moment you replied to it.
 *   needs_reply = conversation open/escalated + ticket open
 *   waiting     = conversation handled/snoozed + ticket pending
 *   done        = conversation closed + ticket resolved/closed
 */
export type QueueFilter = "all" | "unread" | "needs_reply" | "waiting" | "escalated" | "done" | "tickets";

export const QUEUE_FILTERS: { v: QueueFilter; label: string }[] = [
  { v: "all", label: "All" },
  { v: "unread", label: "Unread" },
  { v: "needs_reply", label: "Needs reply" },
  { v: "waiting", label: "Waiting" },
  { v: "escalated", label: "Taken over" },
  { v: "done", label: "Done" },
  { v: "tickets", label: "Tickets" },
];

/** Stable identity for a queue row (ids are only unique within their own table). */
export const itemKey = (it: QueueItem) => `${it.kind}:${it.id}`;

/** A ticket has no unread flag — an untouched (still `open`) ticket is the equivalent. */
export const isUnread = (it: QueueItem) =>
  it.kind === "conversation" ? it.conv.unread : it.ticket.status === "open";

export const inBucket = (it: QueueItem, f: QueueFilter): boolean => {
  switch (f) {
    case "all":
      return true;
    case "unread":
      return isUnread(it);
    case "needs_reply":
      return it.kind === "conversation"
        ? it.conv.status === "open" || it.conv.status === "escalated"
        : it.ticket.status === "open";
    case "waiting":
      return it.kind === "conversation"
        ? it.conv.status === "handled" || it.conv.status === "snoozed"
        : it.ticket.status === "pending";
    case "escalated":
      return it.kind === "conversation" && it.conv.status === "escalated";
    case "done":
      return it.kind === "conversation"
        ? it.conv.status === "closed"
        : it.ticket.status === "resolved" || it.ticket.status === "closed";
    case "tickets":
      return it.kind === "ticket";
  }
};

export const CHANNEL_FILTERS = ["", "sms", "whatsapp", "web", "voice", "email"];

/** The row's display name — whatever identifies this customer best. */
export const nameOf = (it: QueueItem) =>
  it.kind === "conversation"
    ? it.conv.customer_name || it.conv.customer_phone || "Customer"
    : it.ticket.customer_name || it.ticket.customer_email || "Customer";

/** The row's one-line subject, above the preview. */
export const titleOf = (it: QueueItem) =>
  it.kind === "ticket" ? it.ticket.subject || "Ticket" : it.conv.summary || "";

/** Which channel glyph the avatar carries. Tickets are their own "channel". */
export const channelOf = (it: QueueItem) => (it.kind === "ticket" ? "ticket" : it.conv.channel_type);

/** Owner-facing status word for a row, or null when it needs no badge. */
export function statusOf(it: QueueItem): { label: string; tone: "warn" | "danger" | "ok" | "plain" } | null {
  if (it.kind === "ticket") {
    const s = it.ticket.status;
    if (s === "open") return null; // "open" is the default — a badge on every row is noise
    if (s === "pending") return { label: "Waiting", tone: "warn" };
    return { label: s === "resolved" ? "Resolved" : "Closed", tone: "ok" };
  }
  const s: ConvStatus = it.conv.status;
  if (s === "escalated") return { label: "Taken over", tone: "danger" };
  if (s === "snoozed") return { label: "Snoozed", tone: "warn" };
  if (s === "handled") return { label: "Handled", tone: "ok" };
  if (s === "closed") return { label: "Closed", tone: "plain" };
  return null;
}

export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Open",
  pending: "Pending",
  resolved: "Resolved",
  closed: "Closed",
};

/** Short relative time for the queue and thread headers. */
export const relTime = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h`;
  if (s < 604_800) return `${Math.floor(s / 86_400)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export const sentAt = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

/** Day heading between message groups. */
export const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const yday = new Date(today.getTime() - 86_400_000);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "Today";
  if (same(d, yday)) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};
