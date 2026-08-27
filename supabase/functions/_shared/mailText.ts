// Phoxta — the pure text half of mail handling: quoting, subjects, addresses.
//
// Deliberately dependency-free. _shared/autoReply.ts (the send funnel) pulls in
// the Gmail and Resend transports, and _shared/agentCore.ts must be able to trim
// a quoted thread without dragging any of that into every function that composes
// a reply. Everything here is a pure function over strings, so it is also the
// part that can be exercised on its own.

/** agent-inbound refuses anything longer, and guardInput caps at the same
 *  number — a real email with its thread quoted underneath runs past it
 *  routinely, which is how whole messages used to be dropped with no log line. */
export const MAX_AGENT_INPUT = 4000;

const QUOTE_CUTS: RegExp[] = [
  /^[ \t]*On\b[^\n]{0,300}\bwrote:[ \t]*$/im,
  /^[ \t]*-{2,}[ \t]*Original Message[ \t]*-{2,}/im,
  /^[ \t]*-{2,}[ \t]*Forwarded message[ \t]*-{2,}/im,
  /^[ \t]*_{10,}[ \t]*$/m,
  /^[ \t]*From:[ \t]*[^\n]+\r?\n(?:[^\n]*\r?\n){0,3}?[ \t]*(?:Sent|Date):[ \t]*/m,
  /^[ \t]*(Le|El|Am|Op)\b[^\n]{0,300}(a écrit|escribió|schrieb|schreef)[ \t]*:[ \t]*$/im,
  /^[ \t]*Begin forwarded message:[ \t]*$/im,
];

/**
 * The customer's own words, with the quoted thread and signature removed.
 *
 * Never returns less than it safely can: if trimming would leave nothing at all,
 * the original is kept — losing the message is worse than paying for a few
 * quoted lines.
 *
 * This is also what the model is shown for EVERY email turn, history included,
 * so the agent never reads its own earlier replies back as customer input.
 */
export function stripQuotedReply(raw: string): string {
  const text = String(raw ?? "").replace(/\r\n/g, "\n");
  let cut = text.length;
  for (const re of QUOTE_CUTS) {
    const m = re.exec(text);
    if (m && m.index >= 0 && m.index < cut) cut = m.index;
  }
  let out = text.slice(0, cut);

  // A trailing block of ">" quoting, and the RFC 3676 signature delimiter.
  out = out.replace(/(?:^[ \t]*>[^\n]*\n?)+$/m, "");
  const sig = out.search(/^-- [ \t]*$/m);
  if (sig > 0) out = out.slice(0, sig);

  out = out.replace(/\n{3,}/g, "\n\n").trim();
  // Only an EMPTY result is evidence of an over-eager cut — a message whose very
  // first line looks like a quote header. A short result is not: "Yes, cancel
  // it." is a complete answer, and an earlier length floor here quietly handed
  // the model the entire quoted thread for every brief reply.
  if (!out) return text.trim();
  return out;
}

/** What the agent is actually given: the customer's words, bounded to the
 *  length agent-inbound and guardInput both cap at. */
export function trimForAgent(raw: string): string {
  return stripQuotedReply(raw).slice(0, MAX_AGENT_INPUT);
}

/** `Re: ` exactly once, whatever the sender wrote. */
export function replySubject(subject: string): string {
  const s = String(subject ?? "").trim();
  if (!s) return "Re: your message";
  return /^re\s*:/i.test(s) ? s : `Re: ${s}`;
}

/**
 * The one address out of a `Name <a@b.c>` header.
 *
 * Never the whole header. A From carrying two addresses used to be returned
 * verbatim, and it then became the `To:` of the reply — so the business answered
 * the sender AND whoever the sender had appended, from its own mailbox. The same
 * string also became conversations.customer_email, keying the thread and the
 * contact record on a value that is not an address.
 */
export function addressOf(raw: string): string {
  const s = String(raw ?? "").trim();
  const angled = s.match(/<([^>]*)>/);
  const candidate = angled ? angled[1] : s;
  const bare = candidate.match(/[^\s,;<>"'()[\]]+@[^\s,;<>"'()[\]]+/);
  return bare ? bare[0].replace(/[.,;]+$/, "").toLowerCase() : "";
}

/** The display name out of a `Name <a@b.c>` header. */
export function displayNameOf(raw: string): string {
  return String(raw ?? "").replace(/<[^>]*>/g, "").replace(/"/g, "").trim();
}

/**
 * A usable RFC 5322 msg-id, or nothing at all.
 *
 * In-Reply-To and References may only carry `<local@domain>`. Providers hand us
 * their OWN identifiers instead whenever the real header is missing — Postmark's
 * `MessageID` and Resend's `message_id` are bare GUIDs — and writing one of
 * those into In-Reply-To emits an invalid header AND drops References entirely
 * (referencesChain filters on the angle brackets that are not there), so the
 * reply fails to thread on exactly the mail it was meant to thread.
 *
 * Bracketing a value that has no `@` would not make it a message id, so those
 * are dropped: an absent header threads no worse than an invalid one and does
 * not risk a receiving MTA rejecting the message.
 */
export function messageIdOf(raw: string): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  const angled = s.match(/<[^<>\s]+@[^<>\s]+>/);
  if (angled) return angled[0];
  return /^[^<>\s@]+@[^<>\s@]+$/.test(s) ? `<${s}>` : "";
}

/** Every message id in a References chain, normalised and de-duplicated. */
export function referenceIds(raw: string): string[] {
  const out: string[] = [];
  for (const part of String(raw ?? "").split(/\s+/)) {
    const id = messageIdOf(part);
    if (id && !out.includes(id)) out.push(id);
  }
  return out;
}
