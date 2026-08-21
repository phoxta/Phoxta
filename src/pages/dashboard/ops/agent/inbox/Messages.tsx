import { Fragment, useState } from "react";
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
  const [expanded, setExpanded] = useState(false);

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
    <div className={`ibx-msg ${mine ? "is-mine" : "is-theirs"}${tone}`}>
      {/* Only the customer gets a face. Initials of "You" / "AI agent" spell
          nothing, and no mail client shows your own avatar back to you — the
          meta line's glyph and label already name the author. The slot stays
          reserved either way, so grouped bubbles keep their alignment. */}
      <span className="ibx-msg__slot">{!mine && endsGroup && <Avatar name={label} size="sm" />}</span>

      <span className="ibx-msg__stack">
        <span className={`ibx-bubble${html ? " ibx-bubble--html" : ""}`}>
          {subject && <span className="ibx-bubble__subject">{subject}</span>}
          {html ? (
            /* sandbox="" blocks scripts and navigation; the content scrolls
               inside a fixed height until it is expanded. */
            <>
              <iframe
                sandbox=""
                srcDoc={html}
                title="Email content"
                style={{ height: expanded ? 620 : 240, maxHeight: expanded ? "70vh" : 240 }}
              />
              <button
                type="button"
                className="oc-btn oc-btn--sm mt-2"
                aria-expanded={expanded}
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? "Show less" : "Show full email"}
              </button>
            </>
          ) : (
            m.body
          )}
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
