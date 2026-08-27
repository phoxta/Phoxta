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

/**
 * THE PALETTE IS THE SITE'S, not a near-miss of it.
 *
 * These were navy and blue for a while — inherited from the first transactional
 * template and never checked. phoxta.com is near-black and orange: --at-neutral
 * runs 0 #FEFEFE to 900 #1D1D1D, and --at-theme-primary is #F0460E. An email
 * that arrives in a different palette from the site it links to does not read
 * as a design decision, it reads as a forgery, which is a genuinely expensive
 * thing for the one email sent to people who do not know the brand yet.
 *
 * ACCENT and ACCENT_TEXT are the same colour at two jobs. #F0460E on white is
 * 3.8:1 — fine for a filled bar, a rule or a button, and under the 4.5:1 that
 * small text needs. So fills get the brand orange and small type gets the
 * darkened one at 4.6:1. Against the near-black ground the brand orange clears
 * it on its own (4.5:1) and is used directly.
 */
const INK = "#1D1D1D";          // --at-neutral-900
const PAPER = "#F2F2F2";        // --at-neutral-50
const LINE = "#DFDFDF";         // --at-neutral-100
const MUTED = "#585959";        // --at-neutral-500
const ACCENT = "#F0460E";       // --at-theme-primary
const ACCENT_TEXT = "#D63D0B";  // the same orange, dark enough to read small

/**
 * Set on EVERY text element, not once on the body.
 *
 * Email has no CSS reset and no reliable inheritance: several clients drop
 * body styling entirely, and the default face is a serif. Without this on each
 * element the whole message arrives in Times, which is exactly how the first
 * render of this template came out.
 *
 * DM Sans first, because that is the site's face and the brochure is the one
 * email a reader compares against the site. It is named in the stack and, in
 * the brochure only, linked from Google Fonts: Apple Mail and iOS honour the
 * link, Outlook and Gmail ignore it and fall to Segoe and Roboto, which are
 * close enough in width that nothing reflows. A face that loads for some
 * readers is a problem only if the fallback is a surprise — here it is the
 * same stack every other email uses.
 */
const FONT = "'DM Sans','Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif";

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
  | { type: "divider" }
  /** A photograph across the top of the card. */
  | { type: "hero"; src: string; alt: string; height?: number }
  /** The offer, in brand colour. Renders with no images loaded. */
  | { type: "panel"; big: string; small: string }
  /** Numbered steps. The discs are table cells, not images. */
  | { type: "steps"; items: string[] }
  /** A numbered section head — the spine of a long brochure. */
  | { type: "section"; n?: string; label: string; title: string }
  /** Three product tiles to a row, one to a row on a phone. */
  | { type: "grid"; items: Array<{ img: string; alt: string; name: string; price: string; blurb: string; href: string }> }
  /** The cover: one photograph, the promise, one button. */
  | { type: "cover"; src: string; alt: string; title: string; sub: string; cta: { label: string; href: string }; note?: string }
  /** A run of blocks lifted out of the white page onto full-bleed ink. Used
   *  once, for the money — the page needs one moment that stops the scroll. */
  | { type: "band"; blocks: Block[] }
  /** A horizontal bar chart drawn entirely in table cells — no image and no
   *  script, so it renders everywhere including Outlook with images off. */
  | { type: "chart"; title: string; bars: Array<{ label: string; value: number; note: string }> }
  /** A video cannot play in email. This is the poster, a drawn play badge and
   *  a link out, which is what every serious sender does. */
  | { type: "video"; poster: string; alt: string; title: string; href: string }
  /** Plans, stacked, with the recommended one marked. */
  | { type: "plans"; items: Array<{ name: string; price: string; per: string; line: string; best?: boolean }> }
  /** A tight grid of capability chips. */
  | { type: "chips"; items: string[] };

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

/** Which ground a block is sitting on. Threaded rather than global: a band
 *  can appear anywhere, and blocks are rendered by more than one shell. */
type Tone = "paper" | "ink";
const on = (t: Tone) => ({
  text: t === "ink" ? "#FEFEFE" : INK,
  body: t === "ink" ? "#CDCCCC" : INK,   // --at-neutral-200, 10.5:1 on ink
  soft: t === "ink" ? "#B7B7B7" : MUTED, // --at-neutral-300, 8.4:1 on ink
  line: t === "ink" ? "#3A3A3A" : LINE,
  /** Small type. */
  accent: t === "ink" ? ACCENT : ACCENT_TEXT,
  /** Bars, rules, discs — anything filled, where the brand colour itself is
   *  the point and contrast is not carrying any words. */
  fill: ACCENT,
});

const p = (html: string, colour: string = INK) =>
  `<p style="margin:0 0 16px;font-family:${FONT};font-size:15.5px;line-height:1.62;color:${colour}">${html}</p>`;

function block(b: Block, tone: Tone = "paper"): string {
  const c = on(tone);
  switch (b.type) {
    case "text":
      return p(esc(b.text), c.body);
    case "html":
      return p(b.html, c.body);
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
    case "hero":
    case "panel":
    case "steps":
      return graphic(b);
    case "section":
    case "grid":
    case "cover":
    case "band":
    case "chart":
    case "video":
    case "plans":
    case "chips":
      return brochure(b, tone);
    case "button":
      // The site's call to action is a full pill in near-black, so this is
      // too. A padded table cell, not a styled <a>: Outlook ignores padding on
      // an anchor, so a plain link button collapses to bare text there.
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px">
        <tr><td bgcolor="${INK}" style="border-radius:50px">
          <a href="${esc(b.href)}" style="display:inline-block;padding:15px 30px;font-family:${FONT};font-size:15px;font-weight:600;line-height:1;color:${PAPER};text-decoration:none;border-radius:50px">${esc(b.label)}</a>
        </td></tr></table>`;
  }
}

/**
 * Graphics that survive images being switched off.
 *
 * Most clients block remote images until the reader asks, and Outlook will not
 * load a background-image at all. So there is exactly one photograph, sized
 * explicitly and sitting on a brand-coloured cell — a blocked hero then reads
 * as a deliberate band of colour rather than a white hole — and everything
 * else that looks designed is drawn with table cells and colour, which always
 * render.
 */
function graphic(b: Extract<Block, { type: "hero" | "panel" | "steps" }>): string {
  if (b.type === "hero") {
    const h = b.height ?? 200;
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 22px">
      <tr><td bgcolor="${INK}" style="border-radius:10px;line-height:0">
        <img src="${esc(b.src)}" alt="${esc(b.alt)}" width="540" height="${h}"
             style="display:block;width:100%;max-width:540px;height:auto;border:0;font-family:${FONT};font-size:13px;color:#ffffff;border-radius:10px">
      </td></tr></table>`;
  }
  if (b.type === "panel") {
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 22px">
      <tr><td bgcolor="${ACCENT}" style="border-radius:12px;padding:22px 24px">
        <div style="font-family:${FONT};font-size:34px;line-height:1.05;font-weight:700;letter-spacing:-0.02em;color:#ffffff">${esc(b.big)}</div>
        <div style="font-family:${FONT};font-size:14px;line-height:1.5;color:#dbe4ff;margin-top:6px">${esc(b.small)}</div>
      </td></tr></table>`;
  }
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 22px">
    ${b.items.map((t, i) => `<tr>
      <td width="34" valign="top" style="padding:0 12px 14px 0">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td width="26" height="26" align="center" valign="middle" bgcolor="${ACCENT}"
              style="border-radius:13px;font-family:${FONT};font-size:13px;font-weight:700;color:#ffffff">${i + 1}</td>
        </tr></table>
      </td>
      <td valign="top" style="padding:2px 0 14px;font-family:${FONT};font-size:15px;line-height:1.55;color:${INK}">${esc(t)}</td>
    </tr>`).join("")}
  </table>`;
}

/* ── Brochure blocks ─────────────────────────────────────────────────────
   Everything below is drawn with table cells and colour wherever it can be. A
   brochure is the email most likely to be read with images off — it is long,
   it is unsolicited, and it goes to people who have never written to us — so
   if it collapses without pictures it does not work at all. */

function brochure(
  b: Extract<Block, { type: "section" | "grid" | "cover" | "band" | "chart" | "video" | "plans" | "chips" }>,
  tone: Tone,
): string {
  const c = on(tone);
  switch (b.type) {
    case "cover":
      // The photograph and the promise are one object: image, then the words
      // on ink directly beneath it with no gap. Text over a photograph would
      // need a background-image, which Outlook does not load at all.
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td bgcolor="${INK}" style="line-height:0;font-size:0">
          <img src="${esc(b.src)}" alt="${esc(b.alt)}" width="600" height="270"
               style="display:block;width:100%;max-width:600px;height:auto;border:0;font-family:${FONT};font-size:13px;color:#ffffff">
        </td></tr>
        <tr><td bgcolor="${INK}" style="padding:30px 30px 34px">
          <div style="font-family:${FONT};font-size:34px;line-height:1.12;font-weight:600;letter-spacing:-0.01em;color:#ffffff">${esc(b.title)}</div>
          <div style="font-family:${FONT};font-size:16px;line-height:1.55;color:#CDCCCC;margin:12px 0 22px">${esc(b.sub)}</div>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td bgcolor="${PAPER}" style="border-radius:50px">
              <a href="${esc(b.cta.href)}" style="display:inline-block;padding:15px 30px;font-family:${FONT};font-size:15px;font-weight:600;line-height:1;color:${INK};text-decoration:none;border-radius:50px">${esc(b.cta.label)}</a>
            </td>
          </tr></table>
          ${b.note ? `<div style="font-family:${FONT};font-size:12.5px;color:#B7B7B7;margin-top:16px">${esc(b.note)}</div>` : ""}
        </td></tr></table>`;

    case "section":
      // A rule, a numeral and a kicker. The numeral is what turns a long email
      // from a scroll into a document you can find your place in.
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:36px 0 20px">
        <tr><td style="padding-bottom:14px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td width="34" bgcolor="${c.fill}" style="height:3px;font-size:0;line-height:0;border-radius:2px">&nbsp;</td>
        </tr></table></td></tr>
        <tr><td style="font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${c.soft}">
          ${b.n ? `<span style="color:${c.accent}">${esc(b.n)}</span>&nbsp;&nbsp;` : ""}${esc(b.label)}
        </td></tr>
        <tr><td style="padding-top:7px;font-family:${FONT};font-size:25px;line-height:1.22;font-weight:600;letter-spacing:-0.005em;color:${c.text}">${esc(b.title)}</td></tr>
      </table>`;

    case "grid": {
      // Three to a row on a desktop, one to a row on a phone, and no media
      // query involved — inline-block with a max-width simply wraps when the
      // column gets narrow. Outlook ignores inline-block, so it gets a real
      // table through conditional comments; every other client ignores that.
      const cells = b.items.map((t, i) => `${i % 3 === 0 && i > 0 ? "<!--[if mso]></tr><tr><![endif]-->" : ""}<!--[if mso]><td width="180" valign="top"><![endif]-->
        <div class="pxtile" style="display:inline-block;width:100%;max-width:168px;vertical-align:top;margin:0 4px 20px;text-align:left">
          <a href="${esc(t.href)}" style="text-decoration:none">
            <img src="${esc(t.img)}" alt="${esc(t.alt)}" width="168" height="126"
                 style="display:block;width:100%;height:auto;border:0;border-radius:10px;font-family:${FONT};font-size:11px;color:${c.soft}">
          </a>
          <div style="font-family:${FONT};font-size:14.5px;font-weight:700;color:${c.text};margin:11px 0 2px;line-height:1.3">${esc(t.name)}</div>
          <div style="font-family:${FONT};font-size:13px;font-weight:700;color:${c.accent};margin-bottom:5px">${esc(t.price)}</div>
          <div style="font-family:${FONT};font-size:12.5px;line-height:1.45;color:${c.soft}">${esc(t.blurb)}</div>
        </div>
        <!--[if mso]></td><![endif]-->`).join("");
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 6px">
        <tr><td align="center" style="font-size:0;line-height:0">
          <!--[if mso]><table role="presentation" width="540" cellpadding="0" cellspacing="0" border="0"><tr><![endif]-->
          ${cells}
          <!--[if mso]></tr></table><![endif]-->
        </td></tr></table>`;
    }

    case "band":
      // Full-bleed: the row has no side padding of its own, and the blocks
      // inside carry it, so the colour runs edge to edge.
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:34px 0 0">
        <tr><td bgcolor="${INK}" style="padding:6px 30px 30px">
          ${b.blocks.map((x) => block(x, "ink")).join("\n")}
        </td></tr></table>`;

    case "chart": {
      const max = Math.max(...b.bars.map((x) => x.value), 1);
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:4px 0 22px;border:1px solid ${c.line};border-radius:12px">
        <tr><td style="padding:18px 18px 4px;font-family:${FONT};font-size:13.5px;font-weight:700;color:${c.text}">${esc(b.title)}</td></tr>
        <tr><td style="padding:0 18px 20px">
          ${b.bars.map((x) => `<div style="font-family:${FONT};font-size:12.5px;color:${c.text};margin:13px 0 6px">${esc(x.label)} <span style="color:${c.soft}">— ${esc(x.note)}</span></div>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
              <td bgcolor="${c.fill}" width="${Math.max(4, Math.round((x.value / max) * 100))}%" style="height:9px;border-radius:5px;font-size:0;line-height:0">&nbsp;</td>
              <td width="${100 - Math.max(4, Math.round((x.value / max) * 100))}%" style="font-size:0;line-height:0">&nbsp;</td>
            </tr></table>`).join("")}
        </td></tr></table>`;
    }

    case "video":
      // No client plays video. Poster, a drawn play badge and a link out — the
      // badge is a table cell, so it is still there when the poster is blocked.
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 22px">
        <tr><td bgcolor="${INK}" style="border-radius:12px 12px 0 0;line-height:0">
          <a href="${esc(b.href)}"><img src="${esc(b.poster)}" alt="${esc(b.alt)}" width="538" height="193"
             style="display:block;width:100%;max-width:538px;height:auto;border:0;font-family:${FONT};font-size:13px;color:#ffffff;border-radius:12px 12px 0 0"></a>
        </td></tr>
        <tr><td bgcolor="${INK}" style="border-radius:0 0 12px 12px;padding:14px 18px 16px">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td width="34" height="34" align="center" valign="middle" bgcolor="${ACCENT}" style="border-radius:17px;font-family:${FONT};font-size:12px;color:#ffffff">&#9654;</td>
            <td style="padding-left:12px;font-family:${FONT};font-size:14px;font-weight:600;color:#ffffff">
              <a href="${esc(b.href)}" style="color:#ffffff;text-decoration:none">${esc(b.title)}</a>
            </td>
          </tr></table>
        </td></tr></table>`;

    case "plans":
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px;border:1px solid ${c.line};border-radius:12px">
        ${b.items.map((pl, i) => `<tr>
          <td style="padding:16px 18px;${i ? `border-top:1px solid ${c.line};` : ""}${pl.best ? (tone === "ink" ? "background:#2B1207;" : "background:#FDEEE8;") : ""}">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
              <td style="font-family:${FONT};font-size:15.5px;font-weight:700;color:${c.text}">${esc(pl.name)}${pl.best ? ` <span style="font-size:10px;font-weight:700;letter-spacing:.1em;color:${c.accent}">&nbsp;MOST POPULAR</span>` : ""}</td>
              <td align="right" style="font-family:${FONT};font-size:17px;font-weight:700;color:${c.text};white-space:nowrap">${esc(pl.price)}<span style="font-size:12px;font-weight:400;color:${c.soft}">${esc(pl.per)}</span></td>
            </tr></table>
            <div style="font-family:${FONT};font-size:13px;line-height:1.5;color:${c.soft};margin-top:6px">${esc(pl.line)}</div>
          </td></tr>`).join("")}
      </table>`;

    case "chips":
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px">
        <tr><td style="font-family:${FONT};font-size:0;line-height:0">
          ${b.items.map((t) => `<span style="display:inline-block;margin:0 6px 8px 0;padding:8px 13px;border:1px solid ${c.line};border-radius:50px;font-family:${FONT};font-size:13px;line-height:1;color:${c.text};background:${tone === "ink" ? "#1b2059" : "#f7f8fd"}">${esc(t)}</span>`).join("")}
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
    case "hero": return "";
    case "panel": return `${b.big} — ${b.small}`;
    case "steps": return b.items.map((t, i) => `${i + 1}. ${t}`).join("\n");
    case "section": return "\n" + (b.n ? b.n + " " : "") + b.label.toUpperCase() + "\n" + b.title;
    case "grid": return b.items.map((c) => c.name + " — " + c.price + "\n" + c.blurb + "\n" + c.href).join("\n\n");
    case "cover": return b.title + "\n" + b.sub + "\n" + b.cta.label + ": " + b.cta.href + (b.note ? "\n" + b.note : "");
    case "band": return b.blocks.map(plain).filter(Boolean).join("\n\n");
    case "chart": return b.title + "\n" + b.bars.map((x) => "- " + x.label + ": " + x.note).join("\n");
    case "video": return b.title + ": " + b.href;
    case "plans": return b.items.map((pl) => pl.name + " " + pl.price + pl.per + " — " + pl.line).join("\n");
    case "chips": return b.items.join(" · ");
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
      ${o.blocks.map((b) => block(b)).join("\n")}
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
 * The brochure shell.
 *
 * A receipt and a brochure are not the same object and should not wear the same
 * clothes. The transactional shell above is deliberately quiet: a wordmark, a
 * white card, one heading. That restraint is right for an invoice and wrong for
 * the one email whose whole job is to make someone want something.
 *
 * So the brochure gets its own chrome — a masthead, a full-bleed cover, and a
 * page that alternates white and ink so it reads as a document rather than a
 * scroll — while using exactly the same blocks, escaping and plain-text pass as
 * everything else. One vocabulary, two voices.
 */
export function renderBrochure(o: {
  preheader: string; subject: string; strap: string; blocks: Block[]; footnote?: string;
}): { html: string; text: string } {
  // Blocks between bands sit on the white page and need side padding; a band
  // paints edge to edge and carries its own. So the page is assembled as a run
  // of rows rather than one padded cell.
  const rows = o.blocks.map((b) => (b.type === "cover" || b.type === "band")
    ? `<tr><td style="padding:0">${block(b)}</td></tr>`
    : `<tr><td style="padding:0 30px">${block(b)}</td></tr>`).join("\n");

  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(o.subject)}</title>
<!-- The site's face. Apple Mail and iOS load it; everything else falls to the
     stack in FONT and nothing reflows. -->
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  /* The ONLY stylesheet in any of these emails, and it does one thing: let a
     tile fill the column on a phone instead of sitting at 168px in the middle
     of it. Clients that strip <style> — and several do — simply keep the
     inline max-width, which is the layout without this rule rather than a
     broken one. Outlook ignores it too, and should: at 600px three across is
     right. */
  @media only screen and (max-width: 480px) {
    .pxtile { max-width: 100% !important; margin: 0 0 24px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${PAPER};font-family:${FONT};-webkit-font-smoothing:antialiased">
<div style="display:none;font-size:1px;color:${PAPER};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">${esc(o.preheader)}${"&#847;&zwnj;&nbsp;".repeat(60)}</div>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${PAPER}">
<tr><td align="center" style="padding:28px 16px 40px">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:100%;max-width:600px;background:#FEFEFE;border-radius:8px;overflow:hidden">

    <tr><td bgcolor="${INK}" style="padding:20px 30px 18px">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td style="line-height:0">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="line-height:0;padding-right:9px">
              <img src="https://www.phoxta.com/assets/imgs/email/logo.png" alt="" width="28" height="30"
                   style="display:block;width:28px;height:30px;border:0">
            </td>
            <td style="font-family:${FONT};font-size:24px;font-weight:700;line-height:1;color:#FEFEFE">Phoxta</td>
          </tr></table>
        </td>
        <td align="right" style="font-family:${FONT};font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#B7B7B7">${esc(o.strap)}</td>
      </tr></table>
    </td></tr>
    <tr><td bgcolor="${ACCENT}" style="height:4px;font-size:0;line-height:0">&nbsp;</td></tr>

${rows}

    <tr><td style="padding:8px 30px 34px">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="border-top:1px solid ${LINE};padding-top:18px;font-family:${FONT};font-size:12.5px;line-height:1.65;color:${MUTED}">
          ${o.footnote ? `${esc(o.footnote)}<br><br>` : ""}Sent by Phoxta. Reply to this email and it reaches a person.
        </td></tr>
      </table>
    </td></tr>

  </table>
</td></tr></table>
</body></html>`;

  const text = [
    o.subject,
    "=".repeat(Math.min(o.subject.length, 60)),
    "",
    ...o.blocks.map(plain).filter(Boolean),
    "",
    o.footnote ?? "",
    "Sent by Phoxta. Reply to this email and it reaches a person.",
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
