import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { StickyNote } from "lucide-react";
import type { TimelineMessage } from "@/lib/db/ops/agent";
import type { TicketMessage } from "@/lib/db/ops/helpdesk";
import { Avatar, AuthorIcon, DeliveryTick } from "@/pages/dashboard/ops/ui/primitives";
import { channelLabel } from "@/pages/dashboard/ops/ui/util";
import { dayLabel, sentAt } from "./queue";

/**
 * The thread body: day separators, author grouping, bubbles.
 *
 * Grouping is the change that matters — the old page put an avatar, a name and
 * a timestamp under every single bubble, so a ten-message exchange carried ten
 * repetitions of "You · Aug 21, 09:14". Now only the last message of a run
 * from the same author carries the meta line.
 */

const AUTHOR_LABEL: Record<string, string> = {
  customer: "Customer",
  human: "You",
  agent: "AI agent",
  system: "System",
};
const TICKET_AUTHOR_LABEL: Record<string, string> = { customer: "Customer", agent: "You", ai: "AI agent" };

const DELIVERY_LABEL: Record<string, string> = {
  sent: "Sent",
  delivered: "Delivered",
  read: "Read",
  failed: "Failed",
  simulated: "Not delivered",
};

/**
 * Base styles injected into every HTML email, the way a mail client does.
 *
 * Mail arrives with no assumption about the reader's defaults, so an email with
 * no styles of its own would otherwise render in the iframe's — Times New Roman
 * at 16px against a transparent page. These are FALLBACKS: they sit in the head
 * before the message, so anything the email declares for itself still wins.
 */
const EMAIL_BASE_CSS = `
  html, body { margin: 0; padding: 0; background: #fff; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 14px; line-height: 1.5; color: #202124;
    overflow-wrap: anywhere; word-wrap: break-word; padding: 4px 2px;
  }
  img { max-width: 100%; height: auto; border: 0; }
  table { max-width: 100%; }
  a { color: #1a73e8; }
  blockquote { margin: 0 0 0 0.8ex; padding-left: 1ex; border-left: 2px solid #dadce0; color: #5f6368; }
  pre { white-space: pre-wrap; word-wrap: break-word; }
`;

/** Wrap the message in a real document so it renders like mail, not markup. */
function emailDocument(html: string): string {
  return [
    "<!doctype html><html><head><meta charset=\"utf-8\">",
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    // Tracking pixels and remote images should not carry the console's URL.
    '<meta name="referrer" content="no-referrer">',
    // Mail links open outside the console; sandbox keeps them out of this frame.
    '<base target="_blank" rel="noopener noreferrer">',
    `<style>${EMAIL_BASE_CSS}</style></head><body>`,
    html,
    "</body></html>",
  ].join("");
}

/**
 * An HTML email, rendered the way a mail client renders one.
 *
 * It was a fixed 240px window inside a chat bubble, with a "Show full email"
 * button that took it to another fixed height — so every email was read through
 * a letterbox with its own scrollbar, nested inside the thread's scrollbar.
 * A mail client gives the message its full width and its full height, and lets
 * the thread do the scrolling.
 *
 * The iframe stays sandboxed. `allow-same-origin` is what lets this side read
 * the rendered height — and it grants the email nothing, because without
 * `allow-scripts` no code in it can run. Popups are allowed so a link actually
 * opens; `base target=_blank` sends it to a new tab rather than replacing the
 * console.
 */
function EmailFrame({ html }: { html: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(320);

  const measure = useCallback(() => {
    const doc = ref.current?.contentDocument;
    if (!doc) return;
    const h = Math.max(doc.documentElement?.scrollHeight ?? 0, doc.body?.scrollHeight ?? 0);
    // Capped so a runaway document cannot produce a scroll bar kilometres long.
    if (h > 0) setHeight(Math.min(h + 8, 12000));
  }, []);

  useEffect(() => {
    // Images and web fonts land after the load event on some engines, and a
    // late image is exactly what leaves an email clipped.
    const t = window.setTimeout(measure, 400);
    return () => window.clearTimeout(t);
  }, [measure, html]);

  return (
    <iframe
      ref={ref}
      className="ibx-email"
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      srcDoc={emailDocument(html)}
      title="Email"
      style={{ height }}
      onLoad={measure}
    />
  );
}

/** Two messages group when the same author sent them within five minutes. */
const GROUP_MS = 5 * 60 * 1000;

// ─────────────────────────────────────────────────────────────────────────────
// Conversation timeline
// ─────────────────────────────────────────────────────────────────────────────

export function ConversationMessages({
  messages,
  showChannel,
  customerName,
}: {
  messages: TimelineMessage[];
  /** Only true when the customer has actually used more than one channel. */
  showChannel: boolean;
  customerName: string;
}) {
  let lastDay = "";
  return (
    <>
      {messages.map((m, i) => {
        const day = dayLabel(m.created_at);
        const newDay = day !== lastDay;
        lastDay = day;
        const next = messages[i + 1];
        // The meta line belongs to the last message of a run, not to every one.
        const endsGroup =
          !next ||
          next.role !== m.role ||
          next.role === "note" ||
          m.role === "note" ||
          new Date(next.created_at).getTime() - new Date(m.created_at).getTime() > GROUP_MS;
        return (
          <Fragment key={m.id}>
            {newDay && <div className="ibx-day">{day}</div>}
            <MessageBubble m={m} showChannel={showChannel} endsGroup={endsGroup} customerName={customerName} />
          </Fragment>
        );
      })}
    </>
  );
}

function MessageBubble({
  m,
  showChannel,
  endsGroup,
  customerName,
}: {
  m: TimelineMessage;
  showChannel: boolean;
  endsGroup: boolean;
  customerName: string;
}) {
  if (m.role === "note") {
    return (
      <div className="ibx-note">
        <span className="ibx-note__tag">
          <StickyNote /> Internal note — not sent
        </span>
        {m.body}
      </div>
    );
  }

  const mine = m.role !== "customer";
  const meta = (m.meta ?? {}) as Record<string, unknown>;
  const html = typeof meta.html === "string" && meta.html.trim() ? meta.html : null;
  const subject = typeof meta.subject === "string" && meta.subject.trim() ? meta.subject : null;
  const failed = m.delivery_status === "failed";
  const delivery = m.delivery_status ? DELIVERY_LABEL[m.delivery_status] : undefined;
  const label = m.role === "customer" ? customerName : AUTHOR_LABEL[m.role] ?? m.role;
  const tone = m.role === "agent" ? " is-ai" : m.role === "system" ? " is-system" : "";

  return (
    <div className={`ibx-msg ${mine ? "is-mine" : "is-theirs"}${tone}${html ? " has-email" : ""}`}>
      {/* Only the customer gets a face. Initials of "You" / "AI agent" spell
          nothing, and no mail client shows your own avatar back to you — the
          meta line's glyph and label already name the author. The slot stays
          reserved either way, so grouped bubbles keep their alignment. */}
      <span className="ibx-msg__slot">{!mine && endsGroup && <Avatar name={label} size="sm" />}</span>

      <span className="ibx-msg__stack">
        <span className={`ibx-bubble${html ? " ibx-bubble--html" : ""}`}>
          {subject && <span className="ibx-bubble__subject">{subject}</span>}
          {html ? <EmailFrame html={html} /> : m.body}
        </span>

        {endsGroup && (
          <span className="ibx-msg__meta">
            <AuthorIcon role={m.role} />
            <b className="fw-600">{label}</b>
            <span>{sentAt(m.created_at)}</span>
            {showChannel && m.channel_type && <span>· {channelLabel(m.channel_type)}</span>}
            {mine && delivery && (
              <span className={failed ? "is-failed" : undefined} title={delivery}>
                · {failed ? delivery : <DeliveryTick status={m.delivery_status} />}
              </span>
            )}
          </span>
        )}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ticket thread
// ─────────────────────────────────────────────────────────────────────────────

export function TicketMessages({ messages, customerName }: { messages: TicketMessage[]; customerName: string }) {
  let lastDay = "";
  return (
    <>
      {messages.map((m, i) => {
        const day = dayLabel(m.created_at);
        const newDay = day !== lastDay;
        lastDay = day;
        const next = messages[i + 1];
        const endsGroup =
          !next ||
          next.author !== m.author ||
          new Date(next.created_at).getTime() - new Date(m.created_at).getTime() > GROUP_MS;
        const mine = m.author !== "customer";
        const label = m.author === "customer" ? customerName : TICKET_AUTHOR_LABEL[m.author] ?? m.author;
        return (
          <Fragment key={m.id}>
            {newDay && <div className="ibx-day">{day}</div>}
            <div className={`ibx-msg ${mine ? "is-mine" : "is-theirs"}${m.author === "ai" ? " is-ai" : ""}`}>
              <span className="ibx-msg__slot">{!mine && endsGroup && <Avatar name={label} size="sm" />}</span>
              <span className="ibx-msg__stack">
                <span className="ibx-bubble">{m.body}</span>
                {endsGroup && (
                  <span className="ibx-msg__meta">
                    <AuthorIcon role={m.author} />
                    <b className="fw-600">{label}</b>
                    <span>{sentAt(m.created_at)}</span>
                  </span>
                )}
              </span>
            </div>
          </Fragment>
        );
      })}
    </>
  );
}
