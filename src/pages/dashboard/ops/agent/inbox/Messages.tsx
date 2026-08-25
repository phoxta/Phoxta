import { Fragment } from "react";
import { StickyNote } from "lucide-react";
import { Letter } from "react-letter";
import { RichText } from "@shared-chat/chatRich";
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
 * An HTML email, rendered by react-letter.
 *
 * This was hand-rolled twice — a sandboxed iframe with a measured height, then
 * an injected base stylesheet — and both were re-implementing a solved problem
 * badly. react-letter (mat-sz/react-letter, MIT) exists precisely for this and
 * states its target as Gmail's rendering. Its sanitizer, lettersanitizer, works
 * over DOMParser and prefixes the message's classes, IDs and CSS selectors so
 * an email cannot reach the console's own styles.
 *
 * Rendering inline rather than in an iframe is what finally kills the letterbox:
 * the message is part of the document, so it is simply as tall as it is. There
 * is no height to measure, nothing to re-measure when an image loads, and no
 * scrollbar inside a scrollbar.
 *
 * Links still have to leave: an email opening in place would replace the
 * console. Intercepting the click is more reliable than hoping every anchor was
 * rewritten with a target.
 */
function EmailBody({ html }: { html: string }) {
  return (
    <div
      className="ibx-letter"
      onClick={(e) => {
        const a = (e.target as HTMLElement).closest("a");
        const href = a?.getAttribute("href");
        if (!href) return;
        e.preventDefault();
        window.open(href, "_blank", "noopener,noreferrer");
      }}
    >
      <Letter html={html} />
    </div>
  );
}

/**
 * Markup that arrived in a plain-text field.
 *
 * Ingest used to put an email's HTML straight into `body` when the mail carried
 * no text/plain part, so the console rendered it escaped and the reader saw
 * <table> and <div> instead of the message. Both ingest paths are fixed, but
 * everything already stored still has markup sitting in body — this detects it
 * so those messages render as mail rather than needing a backfill.
 *
 * Two tags minimum: someone typing "a < b" or "<3" trips a one-tag test, and a
 * real email never has fewer than two.
 */
const HTML_TAGS =
  /<\/?(?:html|body|head|div|table|tbody|tr|td|th|p|br|hr|span|a|img|ul|ol|li|h[1-6]|strong|em|b|i|center|font|style|blockquote)\b[^>]*>/gi;

function looksLikeHtml(text: string | null | undefined): boolean {
  if (!text) return false;
  return (text.match(HTML_TAGS)?.length ?? 0) >= 2;
}

/** Bare URLs in plain text. Stops at whitespace and at the brackets senders
 *  wrap links in, so "Docs ( https://x/y )" links the URL and not the bracket. */
const URL_RE = /(https?:\/\/[^\s<>()[\]]+)/g;

/**
 * A plain-text message body.
 *
 * Mail with no HTML part arrives as the sender's flattened alternative, where
 * every link has been rewritten as "Label ( https://... )". Rendered raw that is
 * a wall of unclickable URLs. Linkifying is all a mail client does here — and
 * the URL stays visible rather than hidden behind its label, because a link
 * whose destination you cannot see is worse than an ugly one.
 */
function PlainBody({ text }: { text: string }) {
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer">{part}</a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
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
  const metaHtml = typeof meta.html === "string" && meta.html.trim() ? meta.html : null;
  const html = metaHtml ?? (looksLikeHtml(m.body) ? m.body : null);
  const subject = typeof meta.subject === "string" && meta.subject.trim() ? meta.subject : null;
  const failed = m.delivery_status === "failed";
  const delivery = m.delivery_status ? DELIVERY_LABEL[m.delivery_status] : undefined;
  const label = m.role === "customer" ? customerName : AUTHOR_LABEL[m.role] ?? m.role;
  const tone = m.role === "agent" ? " is-ai" : m.role === "system" ? " is-system" : "";
  // The AI writes markdown ("**bold**", bullet lists) whether or not anything
  // renders it — shown raw, a web-chat customer reply full of asterisks. Agent,
  // human and customer text all go through shared-chat's RichText (safe React
  // nodes, no innerHTML); system rows keep the plain rendering.
  const rich = !html && m.role !== "system";

  return (
    <div className={`ibx-msg ${mine ? "is-mine" : "is-theirs"}${tone}${html ? " has-email" : ""}`}>
      {/* Only the customer gets a face. Initials of "You" / "AI agent" spell
          nothing, and no mail client shows your own avatar back to you — the
          meta line's glyph and label already name the author. The slot stays
          reserved either way, so grouped bubbles keep their alignment. */}
      <span className="ibx-msg__slot">{!mine && endsGroup && <Avatar name={label} size="sm" />}</span>

      <span className="ibx-msg__stack">
        <span className={`ibx-bubble${html ? " ibx-bubble--html" : ""}${rich ? " rich" : ""}`}>
          {subject && <span className="ibx-bubble__subject">{subject}</span>}
          {html ? <EmailBody html={html} /> : rich ? <RichText text={m.body} /> : <PlainBody text={m.body} />}
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
                {looksLikeHtml(m.body) ? (
                  <span className="ibx-bubble ibx-bubble--html">
                    <EmailBody html={m.body} />
                  </span>
                ) : (
                  /* Same treatment as conversations: AI drafts and typed replies
                     carry markdown; render it rather than show the asterisks. */
                  <span className="ibx-bubble rich"><RichText text={m.body} /></span>
                )}
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
