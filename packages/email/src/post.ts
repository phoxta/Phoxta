import { type Block, type PageOpts, renderBrochure } from "./render.ts";

/**
 * A blog post, as the email version of its own page.
 *
 * WHY NOT A LINK. "New on the blog", a headline and a Read more button is the
 * default, and it is a large part of why so few people read the blog: it asks
 * for a click before it has given anything. The post itself, in the mail, gets
 * read on the train. The link is still there at the end for the reader who
 * wants the page — and the page is where the related posts, the share rail and
 * the comments live, none of which belong in an inbox.
 *
 * WHAT SURVIVES THE TRIP. All eight of the article's block kinds have an email
 * twin, so subheads stay subheads, lists keep their bullets and the table stays
 * a table. What is deliberately dropped is the page's furniture: breadcrumb,
 * reading-progress bar, author card, prev/next, share buttons. Each one would
 * be another row between the reader and the writing.
 *
 * THE MAPPING LIVES HERE AND NOWHERE ELSE. The article calls its blocks `kind`
 * and the email calls them `type`, because each grew up in its own file. This
 * is the only module that knows they differ, so a post can never half-convert.
 *
 * Structural typing on purpose: packages/email is imported by Deno edge
 * functions, which cannot see src/, so it cannot import the real Article type.
 * It declares the shape it needs, and the app's Article satisfies it.
 */

export type PostBlockIn =
  | { kind: "lead"; text: string }
  | { kind: "p"; text: string }
  | { kind: "h"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "quote"; text: string; cite?: string }
  | { kind: "figure"; img: string; alt: string; caption?: string }
  | { kind: "duo"; left: { h: string; p: string }; right: { h: string; p: string } }
  | { kind: "table"; caption?: string; head: string[]; rows: string[][] };

export type PostIn = {
  slug: string;
  title: string;
  excerpt: string;
  category?: string;
  hero?: string;
  author: string;
  /** Already formatted for display. */
  date: string;
  readMinutes?: number;
  body: PostBlockIn[];
};

const SITE = "https://www.phoxta.com";

/** Relative paths are fine on the site and meaningless in an inbox. */
export const absolute = (u: string) => (/^https?:/i.test(u) ? u : SITE + (u.startsWith("/") ? u : "/" + u));

export const CATEGORY_LABELS: Record<string, string> = {
  playbooks: "Playbooks",
  "tear-downs": "Tear-downs",
  "case-studies": "Case studies",
};

export function postBlocksToEmail(body: PostBlockIn[]): Block[] {
  return body.map((b): Block => {
    switch (b.kind) {
      case "lead": return { type: "lead", text: b.text };
      case "p": return { type: "text", text: b.text };
      case "h": return { type: "subhead", text: b.text };
      case "list": return { type: "list", items: b.items };
      case "quote": return { type: "quote", text: b.text, cite: b.cite };
      case "figure": return { type: "figure", img: absolute(b.img), alt: b.alt, caption: b.caption };
      case "duo": return { type: "duo", left: b.left, right: b.right };
      case "table": return { type: "table", caption: b.caption, head: b.head, rows: b.rows };
    }
  });
}

/**
 * The whole email as an editable block list.
 *
 * Returned rather than rendered, so the studio can open a post, cut a section,
 * put a line of your own at the top and send that — which is the difference
 * between a newsletter and an RSS relay. renderPostEmail below is the same
 * thing sent straight out.
 */
export function postToEmail(post: PostIn): PageOpts & { sourceSlug: string; name: string } {
  const category = post.category ? (CATEGORY_LABELS[post.category] ?? post.category) : undefined;
  const url = `${SITE}/blog/${post.slug}`;
  return {
    name: post.title,
    sourceSlug: post.slug,
    subject: post.title,
    // The excerpt is already written to be the inbox line: it is what the index
    // grid and the meta description use.
    preheader: post.excerpt,
    strap: category ?? "From the Phoxta blog",
    footnote: "You are receiving this because you asked to hear from Phoxta.",
    blocks: [
      { type: "section", label: category ?? "From the blog", title: post.title },
      ...(post.hero ? [{ type: "figure", img: absolute(post.hero), alt: post.title } as Block] : []),
      {
        type: "byline",
        author: post.author,
        date: post.date,
        note: post.readMinutes ? `${post.readMinutes} min read` : undefined,
      },
      ...postBlocksToEmail(post.body),
      { type: "divider" },
      { type: "text", text: "Thanks for reading. If this was useful, the rest of the writing is on the site — and replying to this email reaches a person, not a form." },
      { type: "button", label: "Read this on phoxta.com", href: url },
    ],
  };
}

export function renderPostEmail(post: PostIn) {
  return renderBrochure(postToEmail(post));
}
