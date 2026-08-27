/**
 * The blocks a blog post is made of.
 *
 * The public article renders eight kinds — lead, p, h, list, quote, figure,
 * duo, table (see shared/sections/blog-article/Section1.tsx). Four of them had
 * no email equivalent, so a post sent by email would have arrived with its
 * subheads, lists, captions, paired columns and tables all flattened into
 * paragraphs, which is not "the post" in any sense a reader would accept.
 *
 * These are the missing four plus the three that needed their own treatment.
 * They live in their own file because they are the article's vocabulary, not
 * the transactional one — nothing here is used by a receipt.
 *
 * THE ONE THING EMAIL CANNOT COPY FROM THE PAGE is a two-column row that
 * becomes one column on a phone without a media query, and a table wider than
 * the column. Both are solved the same way the tile grid is: inline-block for
 * everyone, a real table for Outlook behind a conditional comment, and for the
 * table specifically, a horizontal scroll container that Outlook simply
 * ignores in favour of squeezing — which is the least bad of the options,
 * since the alternative is a table that pushes the whole email sideways.
 */

export type ArticleBlock =
  /** Opening standfirst, larger and lighter than body copy. */
  | { type: "lead"; text: string }
  /** A section heading inside the body. */
  | { type: "subhead"; text: string }
  | { type: "list"; items: string[] }
  /** A body image with an optional caption underneath. */
  | { type: "figure"; img: string; alt: string; caption?: string }
  /** Two side-by-side sub-points; one above the other on a phone. */
  | { type: "duo"; left: { h: string; p: string }; right: { h: string; p: string } }
  | { type: "table"; caption?: string; head: string[]; rows: string[][] }
  /** A picture made in the design studio.
   *
   *  ONE PICTURE CAN CARRY MANY LINKS, and this is how. An email cannot put a
   *  clickable region anywhere it likes: image maps are stripped by Gmail, and
   *  absolutely-positioned overlays do not survive a single client. What every
   *  ESP does instead is SLICE — cut the picture into horizontal bands, stack
   *  them with no gap so they read as one image, and give each band its own
   *  link. That works everywhere, Outlook included.
   *
   *  `slices` are those bands, top to bottom. `cuts` are where they were cut
   *  (percentages down the image), kept so the same cuts can be re-applied
   *  after the design is edited. `designId` is the design they came from, so
   *  the picture can be refreshed rather than re-imported. */
  | {
      type: "image"; src: string; alt: string; href?: string; caption?: string;
      designId?: string;
      cuts?: number[];
      slices?: Array<{ src: string; href?: string }>;
    }
  /** Byline row under the title: author, date, reading time. */
  | { type: "byline"; author: string; date: string; note?: string };

type Ctx = {
  FONT: string;
  esc: (v: unknown) => string;
  c: { text: string; body: string; soft: string; line: string; accent: string; fill: string };
};

export function articleBlock(b: ArticleBlock, { FONT, esc, c }: Ctx): string {
  switch (b.type) {
    case "lead":
      return `<p style="margin:0 0 26px;font-family:${FONT};font-size:19px;line-height:1.55;font-weight:400;color:${c.text}">${esc(b.text)}</p>`;

    case "subhead":
      return `<h2 style="margin:34px 0 14px;font-family:${FONT};font-size:20px;line-height:1.3;font-weight:600;color:${c.text}">${esc(b.text)}</h2>`;

    case "list":
      // Not <ul>. Outlook's list indentation is unpredictable and several
      // clients drop list-style entirely; a table with a drawn bullet cell is
      // the same shape everywhere.
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 22px">
        ${b.items.map((t) => `<tr>
          <td width="18" valign="top" style="padding:0 0 10px">
            <div style="width:5px;height:5px;background:${c.fill};border-radius:3px;margin-top:9px;font-size:0;line-height:0">&nbsp;</div>
          </td>
          <td valign="top" style="padding:0 0 10px;font-family:${FONT};font-size:15.5px;line-height:1.62;color:${c.body}">${esc(t)}</td>
        </tr>`).join("")}
      </table>`;

    case "figure":
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:6px 0 26px">
        <tr><td style="line-height:0;font-size:0">
          <img src="${esc(b.img)}" alt="${esc(b.alt)}" width="538" height="269"
               style="display:block;width:100%;max-width:538px;height:auto;border:0;border-radius:8px;font-family:${FONT};font-size:12px;color:${c.soft}">
        </td></tr>
        ${b.caption ? `<tr><td style="padding-top:9px;font-family:${FONT};font-size:12.5px;line-height:1.5;color:${c.soft};text-align:center">${esc(b.caption)}</td></tr>` : ""}
      </table>`;

    case "duo": {
      const col = (x: { h: string; p: string }) => `<!--[if mso]><td width="264" valign="top"><![endif]-->
        <div class="pxduo" style="display:inline-block;width:100%;max-width:252px;vertical-align:top;margin:0 6px 16px 0;text-align:left">
          <div style="font-family:${FONT};font-size:15px;font-weight:600;color:${c.text};margin-bottom:8px">${esc(x.h)}</div>
          <div style="font-family:${FONT};font-size:14.5px;line-height:1.58;color:${c.body}">${esc(x.p)}</div>
        </div>
        <!--[if mso]></td><![endif]-->`;
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:4px 0 16px">
        <tr><td style="font-size:0;line-height:0">
          <!--[if mso]><table role="presentation" width="540" cellpadding="0" cellspacing="0" border="0"><tr><![endif]-->
          ${col(b.left)}${col(b.right)}
          <!--[if mso]></tr></table><![endif]-->
        </td></tr></table>`;
    }

    case "table":
      // The scroll container is for the clients that honour overflow; Outlook
      // does not and will squeeze the columns instead. Squeezed beats an email
      // that scrolls sideways as a whole, which is what a fixed-width table
      // does to every other block on the page.
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:6px 0 26px">
        <tr><td style="overflow-x:auto">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid ${c.line};border-radius:8px">
            <tr>${b.head.map((h, i) => `<td style="padding:11px 14px;${i ? `border-left:1px solid ${c.line};` : ""}border-bottom:1px solid ${c.line};font-family:${FONT};font-size:12.5px;font-weight:600;color:${c.text};background:${c.line}33">${esc(h)}</td>`).join("")}</tr>
            ${b.rows.map((row) => `<tr>${row.map((cell, i) => `<td style="padding:11px 14px;${i ? `border-left:1px solid ${c.line};` : ""}border-top:1px solid ${c.line};font-family:${FONT};font-size:13.5px;line-height:1.5;color:${c.body}">${esc(cell)}</td>`).join("")}</tr>`).join("")}
          </table>
        </td></tr>
        ${b.caption ? `<tr><td style="padding-top:9px;font-family:${FONT};font-size:12.5px;color:${c.soft};text-align:center">${esc(b.caption)}</td></tr>` : ""}
      </table>`;

    case "image": {
      const bands = b.slices && b.slices.length > 1 ? b.slices : null;
      const one = (src: string, href: string | undefined, first: boolean, last: boolean) => {
        // The radius goes on the outer corners only, so a stack of bands has
        // the silhouette of one rounded picture rather than four.
        const radius = bands
          ? `${first ? "8px 8px" : "0 0"} ${last ? "8px 8px" : "0 0"}`
          : "8px";
        const img = `<img src="${esc(src)}" alt="${esc(first ? b.alt : "")}" width="538"
             style="display:block;width:100%;max-width:538px;height:auto;border:0;border-radius:${radius};font-family:${FONT};font-size:12px;color:${c.soft}">`;
        // line-height and font-size zeroed, or clients insert a text baseline
        // gap between the bands and the seams show as white lines.
        return `<tr><td style="line-height:0;font-size:0">${href ? `<a href="${esc(href)}">${img}</a>` : img}</td></tr>`;
      };
      const body = bands
        ? bands.map((s, i) => one(s.src, s.href || b.href, i === 0, i === bands.length - 1)).join("")
        : one(b.src, b.href, true, true);
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:6px 0 24px">
        ${body}
        ${b.caption ? `<tr><td style="padding-top:9px;font-family:${FONT};font-size:12.5px;color:${c.soft};text-align:center">${esc(b.caption)}</td></tr>` : ""}
      </table>`;
    }

    case "byline":
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 22px">
        <tr><td style="padding-bottom:16px;border-bottom:1px solid ${c.line};font-family:${FONT};font-size:13px;color:${c.soft}">
          <span style="color:${c.text};font-weight:600">${esc(b.author)}</span>
          &nbsp;·&nbsp;${esc(b.date)}${b.note ? `&nbsp;·&nbsp;${esc(b.note)}` : ""}
        </td></tr></table>`;
  }
}

/** The text/plain half. Every block has one; a table becomes rows of pairs. */
export function articlePlain(b: ArticleBlock): string {
  const NL = "\n";
  switch (b.type) {
    case "lead": return b.text;
    case "subhead": return b.text.toUpperCase();
    case "list": return b.items.map((t) => "- " + t).join(NL);
    case "figure": return b.caption ? "[" + b.alt + " — " + b.caption + "]" : "[" + b.alt + "]";
    case "duo": return b.left.h + NL + b.left.p + NL + NL + b.right.h + NL + b.right.p;
    case "table": return [b.head.join(" | "), ...b.rows.map((r) => r.join(" | "))].join(NL) + (b.caption ? NL + b.caption : "");
    case "image": {
      const links = (b.slices ?? []).map((s) => s.href).filter(Boolean) as string[];
      const all = links.length ? links : (b.href ? [b.href] : []);
      return "[" + b.alt + "]" + (all.length ? NL + all.join(NL) : "");
    }
    case "byline": return b.author + " · " + b.date + (b.note ? " · " + b.note : "");
  }
}
