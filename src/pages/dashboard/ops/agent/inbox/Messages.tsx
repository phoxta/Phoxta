import { Fragment, useState, memo, useMemo } from "react";
import { StickyNote, MessageSquareOff, ImageOff, Image as ImageIcon, Link2 } from "lucide-react";
import { Letter } from "react-letter";
import { RichText } from "@shared-chat/chatRich";
import type { TimelineMessage } from "@/lib/db/ops/agent";
import type { TicketMessage } from "@/lib/db/ops/helpdesk";
import { Avatar, AuthorIcon, DeliveryTick } from "@/pages/dashboard/ops/ui/primitives";
import { channelLabel } from "@/pages/dashboard/ops/ui/util";
import { dayLabel, sentAt } from "./queue";

/** Bare URLs in plain text. Stops at whitespace and at the brackets senders
 *  wrap links in, so "Docs ( https://x/y )" links the URL and not the bracket. */
const URL_RE = /(https?:\/\/[^\s<>()[\]]+)/g;

/**
 * Optimized sub-components with memoization to prevent re-renders on every
 * composer keystroke in the parent InboxPage.
 */

const EmailBody = memo(({ html }: { html: string }) => {
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
});

const PlainBody = memo(({ text }: { text: string }) => {
  const parts = useMemo(() => text.split(URL_RE), [text]);
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
});

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


/** Two messages group when the same author sent them within five minutes. */
const GROUP_MS = 5 * 60 * 1000;

/**
 * Why the agent did not answer this message.
 *
 * Every ingress path writes `meta.auto_reply = { answered, reason, retryable }`
 * onto the customer's own row precisely so this question has an answer without
 * database access — and nothing rendered it, so an unanswered email sat in the
 * Inbox looking like any other unread one. A skip is often correct (a bounce, a
 * mailing list, "ask me first"); the point is that the owner can tell.
 */
type AutoReplyNote = { reason: string; retryable: boolean; pending: boolean };

/** How long a worker's claim on a message is honoured before another one may
 *  take it — CLAIM_TTL_MS in supabase/functions/_shared/autoReply.ts. Past it,
 *  the claim means nothing and neither does "composing a reply". */
const CLAIM_TTL_MS = 10 * 60 * 1000;

function autoReplyNote(meta: Record<string, unknown>): AutoReplyNote | null {
  const raw = meta.auto_reply;
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Record<string, unknown>;
  if (a.answered !== false) return null;
  const reason = typeof a.reason === "string" ? a.reason.trim() : "";
  if (!reason) return null;
  // A claim taken by whichever worker is composing right now — but only while it
  // is still LIVE. `pending` was any claimed_at at all, with no expiry, so a
  // function killed mid-turn left "The agent is composing a reply…" on the
  // message for ever, hiding from the owner that it needs a person.
  const claimedAt = typeof a.claimed_at === "string" ? Date.parse(a.claimed_at) : NaN;
  const pending = Number.isFinite(claimedAt) && Date.now() - claimedAt < CLAIM_TTL_MS;
  return { reason, retryable: a.retryable === true, pending };
}

function NotAnswered({ note }: { note: AutoReplyNote }) {
  if (note.pending) {
    return (
      <span className="ibx-msg__why">
        <MessageSquareOff aria-hidden="true" />
        <span>The agent is composing a reply&hellip;</span>
      </span>
    );
  }
  return (
    <span className="ibx-msg__why">
      <MessageSquareOff aria-hidden="true" />
      <span>
        <b>Not answered automatically</b> — {note.reason}.
        {/* Honest about the shape of the queue: the catch-up worker reaches back
            six hours every five minutes and 48 hours once a day, so "it will be
            tried again" is a promise with an edge to it. Saying so is what lets
            an owner decide to answer it themselves. */}
        {note.retryable ? " The agent will try again — reply yourself if it still hasn't within a day." : ""}
      </span>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pictures on a message
//
// "The Inbox must show what was sent, including the picture, so an owner can see
// exactly what their customer received." Three different things write `meta.media`
// and this renders all three:
//
//   • the AGENT, when it chose a picture from the business's own library —
//     `[{ type: 'image', url, alt }]`, written by respondCore and then overwritten
//     by deliverAutoReply with what actually reached the wire;
//   • the CUSTOMER, when they texted a photograph — twilio-inbound files the
//     Twilio media links as a bare array of URL strings;
//   • a HUMAN's email attachments, which do not use this key at all.
//
// Both shapes are accepted because both exist in the table today. A picture that
// will not load (a Twilio media URL on an account with HTTP auth for media
// switched on, an object that has since been deleted) falls back to a link
// rather than leaving a broken image in a business's own thread.
// ─────────────────────────────────────────────────────────────────────────────

type Picture = { url: string; alt: string };

function picturesOf(meta: Record<string, unknown>): Picture[] {
  const raw = meta.media;
  if (!Array.isArray(raw)) return [];
  const out: Picture[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      if (/^https?:\/\//i.test(item)) out.push({ url: item, alt: "Attachment" });
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const m = item as Record<string, unknown>;
    const url = typeof m.url === "string" ? m.url : "";
    if (!/^https?:\/\//i.test(url)) continue;
    out.push({ url, alt: typeof m.alt === "string" && m.alt.trim() ? m.alt.trim() : "Picture" });
  }
  return out.slice(0, 4);
}

/** Why the picture went as a link instead of riding with the message — written
 *  by deliverAutoReply. The answer to "it said it was sending the menu, so where
 *  is it?", which is otherwise only in a function log. */
function mediaFallbackReason(meta: Record<string, unknown>): string {
  const d = meta.media_delivery;
  if (!d || typeof d !== "object") return "";
  const rec = d as Record<string, unknown>;
  if (rec.attached === true) return "";
  return typeof rec.reason === "string" ? rec.reason : "";
}

function MessagePicture({ picture }: { picture: Picture }) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <a className="ibx-media__missing" href={picture.url} target="_blank" rel="noopener noreferrer">
        <ImageOff aria-hidden="true" width={14} height={14} />
        <span>{picture.alt} — open it in a new tab</span>
      </a>
    );
  }
  return (
    <a className="ibx-media__frame" href={picture.url} target="_blank" rel="noopener noreferrer" title={picture.alt}>
      <img src={picture.url} alt={picture.alt} loading="lazy" onError={() => setBroken(true)} />
    </a>
  );
}

function MessagePictures({
  pictures,
  fallbackReason,
  chosenBecause,
}: {
  pictures: Picture[];
  fallbackReason: string;
  /** The agent's own words for why this picture answers the question. An
   *  attachment nobody can explain is not a choice — see attach_picture. */
  chosenBecause: string;
}) {
  if (pictures.length === 0) return null;
  return (
    <span className="ibx-media">
      <span className="ibx-media__row">
        {pictures.map((p) => <MessagePicture key={p.url} picture={p} />)}
      </span>
      {chosenBecause && (
        <span className="ibx-media__note">
          <ImageIcon aria-hidden="true" width={13} height={13} />
          <span>Chosen because {chosenBecause.replace(/^because\s+/i, "").replace(/\.$/, "")}.</span>
        </span>
      )}
      {fallbackReason && (
        <span className="ibx-media__note">
          <Link2 aria-hidden="true" width={13} height={13} />
          <span>Sent as a link rather than attached — {fallbackReason}.</span>
        </span>
      )}
    </span>
  );
}

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

const MessageBubble = memo(({
  m,
  showChannel,
  endsGroup,
  customerName,
}: {
  m: TimelineMessage;
  showChannel: boolean;
  endsGroup: boolean;
  customerName: string;
}) => {
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
  // Only on the customer's own row: that is where the skip reason is written,
  // and it is the message a human is deciding what to do about.
  const why = m.role === "customer" ? autoReplyNote(meta) : null;
  // What actually went wrong on the wire, when a send failed — otherwise "Failed"
  // is a red word with nothing behind it.
  const deliveryError = (() => {
    const d = meta.delivery;
    if (!d || typeof d !== "object") return "";
    const e = (d as Record<string, unknown>).error;
    return typeof e === "string" ? e : "";
  })();
  // What the customer actually saw, or sent. Rendered inside the bubble so a
  // reply and its picture read as one message rather than two.
  const pictures = picturesOf(meta);
  const mediaFallback = mediaFallbackReason(meta);
  // Only the agent explains itself: a photograph the CUSTOMER texted needs no
  // justification, and a human's attachment is their own decision.
  const pictureReason = m.role === "agent" && typeof meta.picture_reason === "string" ? meta.picture_reason.trim() : "";
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
          <MessagePictures pictures={pictures} fallbackReason={mediaFallback} chosenBecause={pictureReason} />
        </span>

        {endsGroup && (
          <span className="ibx-msg__meta">
            <AuthorIcon role={m.role} />
            <b className="fw-600">{label}</b>
            <span>{sentAt(m.created_at)}</span>
            {showChannel && m.channel_type && <span>· {channelLabel(m.channel_type)}</span>}
            {mine && delivery && (
              <span className={failed ? "is-failed" : undefined} title={deliveryError || delivery}>
                · {failed ? delivery : <DeliveryTick status={m.delivery_status} />}
              </span>
            )}
          </span>
        )}

        {why && <NotAnswered note={why} />}
      </span>
    </div>
  );
});


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
