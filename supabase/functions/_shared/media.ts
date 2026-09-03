// Phoxta — what a FILE has to be before it may ride an outbound message.
//
// The agent can attach ONE file to a reply — a product photograph, a menu,
// a price list, a design, a brochure, a spec sheet, a video. Everything in
// this file exists because of a single fact about Twilio: it does not accept the
// bytes, it accepts a URL and fetches it itself, and a URL it cannot use fails
// THE WHOLE MESSAGE rather than just the attachment.
//
// So a bad link does not cost the customer a file. It costs them the reply.
//
// That is why the check happens HERE, before the send, rather than being left to
// the provider's error code afterwards:
//
//   • https only. Twilio will not fetch http, and a link the customer cannot
//     open is not a fallback either.
//   • a content type WhatsApp actually carries — the WHATSAPP_MEDIA table below.
//     A WebP or an AVIF, both of which the asset library happily stores and a
//     modern camera roll produces, is rejected at Meta's end with the whole
//     message attached to it.
//   • under that type's ceiling: 5MB for an image, 16MB for video, audio and
//     documents. The asset library's own ceiling is 10MB
//     (design-assets/index.ts), so a perfectly ordinary stored photograph can be
//     twice what WhatsApp will take.
//   • the size has to be KNOWN. A server that will not say how big a file is has
//     not proved it is under the limit, and "probably fine" is how the whole
//     message gets dropped.
//
// When a file fails any of that the reply still goes — as text, with the link in
// it. A customer who was told "here's the menu" and got nothing is worse off
// than one who got a link. And when a file passes every check here and Twilio
// still refuses it — a codec no header describes — autoReply resends the reply
// without the attachment rather than losing it.
export type OutboundMedia = { url: string; alt?: string };

/** WhatsApp's ceiling for an IMAGE message — the tightest of the lot, and the
 *  one most files run into. Everything else it carries gets 16MB. */
export const WHATSAPP_MAX_MEDIA_BYTES = 5 * 1024 * 1024;
const WHATSAPP_MAX_FILE_BYTES = 16 * 1024 * 1024;

/** The two raster types a WhatsApp image message may carry. Deliberately not
 *  webp/gif/avif: the asset library stores those and WhatsApp refuses them. */
export const WHATSAPP_IMAGE_TYPES = new Set(["image/jpeg", "image/png"]);

/**
 * EVERYTHING WhatsApp will carry, and how big each may be.
 *
 * Twilio's own table (twilio.com/docs/whatsapp/guidance-whatsapp-media-messages):
 * images 5MB; audio, video and documents 16MB. `kind` is what the owner sees in
 * the audit line and what the model is told it sent — "document", not
 * "application/vnd.openxmlformats-officedocument.wordprocessingml.document".
 *
 * TWO FORMATS TWILIO LISTS ARE DELIBERATELY ABSENT, for the same reason WebP is:
 * this file can read a Content-Type header and a byte count, and nothing else.
 *   • audio/ogg — accepted ONLY when the stream is Opus. A Vorbis .ogg has an
 *     identical content type, passes every check here, and is refused at Meta's
 *     end, which fails the whole message.
 *   • image/webp — Twilio lists it, Meta rejects it on an image message.
 * A format whose acceptance depends on something no header exposes is one this
 * module cannot honestly clear, so those go as links. MP4 is in: the container
 * carries the same codec risk in theory (H.264 + AAC required), but in practice
 * essentially every MP4 a business holds is exactly that, and a rejected send is
 * now retried without the attachment rather than lost (see autoReply).
 */
const WHATSAPP_MEDIA: Record<string, { kind: string; max: number }> = {
  "image/jpeg": { kind: "image", max: WHATSAPP_MAX_MEDIA_BYTES },
  "image/png": { kind: "image", max: WHATSAPP_MAX_MEDIA_BYTES },
  "video/mp4": { kind: "video", max: WHATSAPP_MAX_FILE_BYTES },
  "audio/mpeg": { kind: "audio", max: WHATSAPP_MAX_FILE_BYTES },
  "audio/mp3": { kind: "audio", max: WHATSAPP_MAX_FILE_BYTES },
  "audio/aac": { kind: "audio", max: WHATSAPP_MAX_FILE_BYTES },
  "audio/amr": { kind: "audio", max: WHATSAPP_MAX_FILE_BYTES },
  "audio/3gpp": { kind: "audio", max: WHATSAPP_MAX_FILE_BYTES },
  "application/pdf": { kind: "document", max: WHATSAPP_MAX_FILE_BYTES },
  "application/msword": { kind: "document", max: WHATSAPP_MAX_FILE_BYTES },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { kind: "document", max: WHATSAPP_MAX_FILE_BYTES },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": { kind: "document", max: WHATSAPP_MAX_FILE_BYTES },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { kind: "document", max: WHATSAPP_MAX_FILE_BYTES },
  "application/vnd.ms-excel": { kind: "document", max: WHATSAPP_MAX_FILE_BYTES },
  "application/vnd.ms-powerpoint": { kind: "document", max: WHATSAPP_MAX_FILE_BYTES },
};

/** File extensions worth offering the model at all — the sendable set above,
 *  plus the ones that travel perfectly well as a link. Exported so the agent's
 *  library search and this gate cannot drift apart. */
export const SENDABLE_FILE_EXT = /\.(png|jpe?g|mp4|mp3|m4a|aac|amr|3gp|pdf|docx?|pptx?|xlsx?|csv|txt)$/i;

/** How long we wait to learn what is behind a URL. Generous enough for object
 *  storage on a cold cache, short enough that a dead host does not eat the
 *  background turn that is holding a customer's reply. */
const PROBE_TIMEOUT_MS = 6000;

/** A URL long enough to be a problem is a problem. Twilio caps what it will
 *  accept and an overlong one is far more likely to be a mistake than a file. */
const MAX_URL_CHARS = 1600;

export type MediaVerdict =
  | { ok: true; url: string; alt: string; contentType: string; bytes: number }
  /** `reason` is written for the OWNER, on the message row and in the audit
   *  line — not for the customer, who simply gets the link instead. */
  | { ok: false; url: string; alt: string; reason: string };

const clean = (v: unknown): string => String(v ?? "").trim();

/** Bytes, as a person would say them. */
function inMb(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 10 ? `${Math.round(mb)}MB` : `${mb.toFixed(1)}MB`;
}

/**
 * Ask the host what is behind this URL, without downloading it.
 *
 * HEAD first, because it costs nothing. Not every server answers HEAD (some
 * CDNs return 405), so a one-byte ranged GET is the fallback: it returns the
 * same Content-Type, and Content-Range carries the true total length even
 * though Content-Length is 1.
 */
async function probe(url: string): Promise<{ status: number; type: string; bytes: number } | null> {
  const read = (res: Response): { status: number; type: string; bytes: number } => {
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    const range = res.headers.get("content-range") ?? "";
    const total = /\/(\d+)\s*$/.exec(range)?.[1];
    const len = total ?? res.headers.get("content-length");
    // -1 means UNKNOWN, and it has to be told apart from zero. `Number("")` and
    // `Number(null)` are both 0, so reading a missing header the lazy way turns
    // "this host would not say how big the file is" into "the picture is empty"
    // — the same refusal with a reason that is not true, on a message row an
    // owner is meant to be able to act on.
    const bytes = len === null || len.trim() === "" ? -1 : Number(len);
    return { status: res.status, type, bytes: Number.isFinite(bytes) && bytes >= 0 ? bytes : -1 };
  };
  try {
    const head = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
    if (head.ok) {
      const r = read(head);
      if (r.type) return r;
    }
  } catch {
    /* fall through to the ranged read — a refused HEAD is not a dead file */
  }
  try {
    const ranged = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-0" },
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    // Cancel the body: even a one-byte read leaves a stream open otherwise.
    await ranged.body?.cancel().catch(() => {});
    if (ranged.ok || ranged.status === 206) return read(ranged);
    return { status: ranged.status, type: "", bytes: -1 };
  } catch {
    return null;
  }
}

/**
 * May this file go on a WhatsApp message?
 *
 * Answers with a REASON when it may not, because that reason is what the owner
 * reads on the message in the Inbox — "the agent sent a link instead" is only
 * useful next to "the file is a WebP and WhatsApp only takes JPEG or PNG".
 */
export async function checkWhatsappMedia(m: OutboundMedia): Promise<MediaVerdict> {
  const url = clean(m.url);
  const alt = clean(m.alt) || "Attachment";
  const no = (reason: string): MediaVerdict => ({ ok: false, url, alt, reason });

  if (!url) return no("there was no link to the file");
  if (url.length > MAX_URL_CHARS) return no("the link to the file is too long to send");
  if (!/^https:\/\/[^\s"'<>]+$/i.test(url)) {
    return no("WhatsApp only fetches files over https, and this link is not one");
  }

  const found = await probe(url);
  if (!found) return no("the file could not be reached, so WhatsApp would not have been able to fetch it either");
  if (found.status >= 400) return no(`the file's host answered ${found.status}, so WhatsApp could not have fetched it`);
  if (!found.type) return no("the file's host did not say what kind of file it is");
  const rule = WHATSAPP_MEDIA[found.type];
  if (!rule) {
    return no(`WhatsApp does not carry ${found.type} files, so it went as a link instead`);
  }
  const cap = rule.max === WHATSAPP_MAX_MEDIA_BYTES ? "5MB" : "16MB";
  if (found.bytes < 0) return no(`the file's host did not say how large it is, so it could not be checked against WhatsApp's ${cap} limit`);
  if (found.bytes === 0) return no("the file is empty");
  if (found.bytes > rule.max) {
    return no(`the ${rule.kind} is ${inMb(found.bytes)} and WhatsApp only accepts ${rule.kind === "image" ? "images" : `${rule.kind}s`} up to ${cap}`);
  }
  return { ok: true, url, alt, contentType: found.type, bytes: found.bytes };
}

/** The previous name, kept so nothing that still imports it breaks. */
export const checkWhatsappImage = checkWhatsappMedia;

/**
 * The link, written into the message itself.
 *
 * Used wherever the picture cannot be attached but still has to reach the
 * person: every SMS (MMS is a US/Canada-only product on Twilio, so an attachment
 * is not a thing we can promise on a channel that reaches the whole world), the
 * WhatsApp cases the check above refuses, and email, which is composed
 * elsewhere and never carries an attachment from the agent.
 *
 * Deliberately appended rather than woven in: the agent wrote the reply without
 * knowing whether the picture would travel, and rewriting its words here would
 * be this module inventing copy on the business's behalf.
 */
export function withMediaLink(text: string, m: OutboundMedia): string {
  const url = clean(m.url);
  if (!url) return text;
  const alt = clean(m.alt);
  const body = clean(text);
  const line = alt ? `${alt}: ${url}` : `You can see it here: ${url}`;
  return body ? `${body}\n\n${line}` : line;
}
