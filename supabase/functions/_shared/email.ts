// Phoxta — one layout for every email the platform sends.
//
// The mail WAS html — it was just `<p>${message}</p>` with nothing around it,
// which arrives looking like a plain-text note from 1998: full browser width,
// system serif, no identity, and in several senders the message was
// interpolated unescaped, so a customer called "Ben & Jerry's <Ltd>" produced
// broken markup and an apostrophe could close an attribute.
//
// WHY HAND-WRITTEN AND NOT A FRAMEWORK. MJML and Maizzle are the right answer
// for a marketing team producing many layouts; both want a build step, and
// these emails are generated inside Deno edge functions at send time. Cerberus
// and leemunroe/responsive-html-email-template (both MIT) are the reference
// implementations of the patterns below, and this follows them — tables rather
// than divs, inline styles rather than a stylesheet, 600px, a bulletproof
// button built from a padded table cell. What it does not do is vendor a whole
// framework to render six kinds of transactional message.
//
// THE RULES THIS FOLLOWS, AND WHY EACH ONE IS NOT OPTIONAL:
//
//   Tables for layout        Outlook on Windows renders with Word, which has
//                            no float, no flexbox and no grid.
//   Inline styles            Several clients strip <style> entirely; anything
//                            that must survive has to be on the element.
//   600px, fluid below       The width every client has agreed on for twenty
//                            years, and the one Outlook's reading pane fits.
//   A text/plain part        Not politeness: a multipart message with no text
//                            alternative scores worse with spam filters, and
//                            watches and screen readers prefer it.
//   A preheader              Otherwise the inbox preview line shows whatever
//                            the first words happen to be, usually "View this".
//   Everything escaped       Customer names, business names and free text all
//                            reach these templates.
//
// NO LOGO IMAGE, DELIBERATELY. The only marks in the repo are SVG and WebP:
// Outlook renders neither, and most clients block remote images by default, so
// an image masthead is a blank gap for a large share of readers. A wordmark set
// in type always renders.

const INK = "#14194e";
const ACCENT = "#1c56fd";
const MUTED = "#6b7189";
const LINE = "#e6e8f2";
const PAPER = "#f4f5fa";

/**
 * Set on EVERY text element, not once on the body.
 *
 * Email has no CSS reset and no reliable inheritance: several clients drop
 * body styling entirely, and the default face is a serif. Without this on each
 * element the whole message arrives in Times, which is exactly how the first
 * render of this template came out.
 *
 * No webfont. Outlook ignores @font-face, Gmail strips the link, and a font
 * that loads for some readers and not others is worse than one system face for
 * everyone.
 */
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** Every value that reaches the markup goes through this. */
export const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export type Block =
  | { type: "text"; text: string }
  /** Paragraph that may carry <b>/<i>/<a> the CALLER has already escaped. */
  | { type: "html"; html: string; text: string }
  | { type: "button"; label: string; href: string }
  | { type: "facts"; rows: Array<[string, string]> }
  | { type: "quote"; text: string }
  | { type: "divider" };

export type EmailOpts = {
  /** The inbox preview line. Say what the mail is, not "view in browser". */
  preheader: string;
  heading: string;
  blocks: Block[];
  /** Small print under the rule — an unsubscribe line, a legal note. */
  footnote?: string;
  /** Overrides the "Phoxta" wordmark for tenant mail sent as the business. */
  brand?: string;
};

const p = (html: string) =>
  `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:1.6;color:${INK}">${html}</p>`;

function block(b: Block): string {
  switch (b.type) {
    case "text":
      return p(esc(b.text));
    case "html":
      return p(b.html);
    case "quote":
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px">
        <tr><td style="border-left:3px solid ${ACCENT};padding:2px 0 2px 14px;font-family:${FONT};font-size:15px;line-height:1.6;color:${MUTED}">${esc(b.text)}</td></tr>
      </table>`;
    case "divider":
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0 20px">
        <tr><td style="border-top:1px solid ${LINE};font-size:0;line-height:0">&nbsp;</td></tr></table>`;
    case "facts":
      // A table of label/value pairs — an invoice, a booking, a lead. Stacked
      // labels rather than two columns: a narrow phone would otherwise wrap the
      // value under a label it does not belong to.
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px;border:1px solid ${LINE};border-radius:10px">
        ${b.rows.map(([k, v], i) => `<tr>
          <td style="padding:11px 16px;${i ? `border-top:1px solid ${LINE};` : ""}font-family:${FONT};font-size:13px;line-height:1.4;color:${MUTED};width:40%">${esc(k)}</td>
          <td style="padding:11px 16px;${i ? `border-top:1px solid ${LINE};` : ""}font-family:${FONT};font-size:14px;line-height:1.4;color:${INK};font-weight:600">${esc(v)}</td>
        </tr>`).join("")}
      </table>`;
    case "button":
      // A padded table cell, not a styled <a>: Outlook ignores padding on an
      // anchor, so a plain link button collapses to bare text there.
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px">
        <tr><td bgcolor="${ACCENT}" style="border-radius:8px">
          <a href="${esc(b.href)}" style="display:inline-block;padding:13px 26px;font-family:${FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px">${esc(b.label)}</a>
        </td></tr></table>`;
  }
}

function plain(b: Block): string {
  switch (b.type) {
    case "text": return b.text;
    case "html": return b.text;
    case "quote": return `"${b.text}"`;
    case "divider": return "---";
    case "facts": return b.rows.map(([k, v]) => `${k}: ${v}`).join("\n");
    case "button": return `${b.label}: ${b.href}`;
  }
}

/**
 * Render one email.
 *
 * Returns both parts. Callers pass both to the mailer — sending html alone is
 * what makes a message look like bulk mail to a filter.
 */
export function renderEmail(o: EmailOpts): { html: string; text: string } {
  const brand = o.brand?.trim() || "Phoxta";

  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<!-- Tells a client in dark mode that this design has its own colours, rather
     than letting it invert them and produce navy text on navy. -->
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(o.heading)}</title>
</head>
<body style="margin:0;padding:0;background:${PAPER};font-family:${FONT};-webkit-font-smoothing:antialiased">
<!-- Preheader: the inbox preview line. Hidden in the body, then padded with
     zero-width spaces so the client does not follow it with the first words of
     the actual message. -->
<div style="display:none;font-size:1px;color:${PAPER};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">${esc(o.preheader)}${"&#847;&zwnj;&nbsp;".repeat(60)}</div>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${PAPER}">
<tr><td align="center" style="padding:32px 16px">

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:100%;max-width:600px">
    <tr><td style="padding:0 0 20px">
      <span style="font-family:${FONT};font-size:19px;font-weight:700;letter-spacing:-0.02em;color:${INK}">${esc(brand)}</span>
    </td></tr>

    <tr><td style="background:#ffffff;border:1px solid ${LINE};border-radius:14px;padding:32px 30px">
      <h1 style="margin:0 0 18px;font-family:${FONT};font-size:22px;line-height:1.25;font-weight:700;letter-spacing:-0.02em;color:${INK}">${esc(o.heading)}</h1>
      ${o.blocks.map(block).join("\n")}
    </td></tr>

    <tr><td style="padding:20px 4px 0;font-family:${FONT};font-size:12px;line-height:1.6;color:${MUTED}">
      ${o.footnote ? `${esc(o.footnote)}<br><br>` : ""}
      Sent by ${esc(brand)}. Reply to this email and it reaches a person.
    </td></tr>
  </table>

</td></tr></table>
</body></html>`;

  const text = [
    o.heading,
    "=".repeat(Math.min(o.heading.length, 60)),
    "",
    ...o.blocks.map(plain).filter(Boolean),
    "",
    o.footnote ?? "",
    `Sent by ${brand}. Reply to this email and it reaches a person.`,
  ].filter((l) => l !== undefined).join("\n\n").replace(/\n{3,}/g, "\n\n");

  return { html, text };
}

/**
 * The old shape, kept working.
 *
 * Several senders build a message as one string of prose. Rather than rewrite
 * each into blocks at once, they can wrap it: the paragraphs are split on blank
 * lines and escaped, so those emails get the layout immediately and can be
 * given real structure later.
 */
export function renderSimple(heading: string, body: string, opts?: { preheader?: string; brand?: string; footnote?: string }) {
  const paras = body.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
  return renderEmail({
    preheader: opts?.preheader || paras[0]?.slice(0, 140) || heading,
    heading,
    brand: opts?.brand,
    footnote: opts?.footnote,
    // Single newlines inside a paragraph are line breaks, which is what someone
    // typing a reply into the console means by them.
    blocks: paras.map((t) => ({ type: "html", html: esc(t).replace(/\n/g, "<br>"), text: t })),
  });
}
