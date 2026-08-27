// The bundle the suite runs against: the real renderer, the real editor specs
// and a real article, with nothing stubbed.
export { renderBrochure } from "@email";
export { SPECS, readField, writeField, toField, fromField } from "../../src/pages/dashboard/ops/designs/emailBlocks";

import { ARTICLES } from "../../src/data/articles";
import { postToEmail, type PostIn } from "../../packages/email/src/post";

/** The article that exercises the most block kinds — a fixture would only ever
 *  test the kinds I remembered to put in it. */
export function samplePost() {
  const count = (a: (typeof ARTICLES)[number]) => new Set(a.body.map((b) => b.kind)).size;
  const a = ARTICLES.slice().sort((x, y) => count(y) - count(x))[0];
  const post: PostIn = {
    slug: a.slug, title: a.title, excerpt: a.excerpt, category: a.category,
    hero: a.hero, author: a.author, date: a.date, readMinutes: a.readMinutes,
    body: a.body as PostIn["body"],
  };
  return { post, email: postToEmail(post) };
}

/* Converting a real shipped template, not a fixture: the mapping is only worth
   testing against designs that actually exist. */
import { designToBlocks } from "../../src/lib/designs/toEmail";
import { TEMPLATES, layersOf } from "../../src/lib/designs/templates";
import { emptyDoc } from "../../src/lib/designs/types";

export function convertTemplates() {
  return TEMPLATES.map((t) => {
    const doc = emptyDoc(t.id);
    // emptyDoc leaves the copy blank, and blank copy converts to nothing. Fill
    // every slot the template has so the mapping itself is exercised.
    const content: Record<string, string> = {};
    for (const l of layersOf(doc)) {
      if (l.type === "text" || l.type === "chip") content[l.slot] = `Copy for ${l.slot}`;
    }
    const filled = { ...doc, content };
    return { id: t.id, ...designToBlocks(filled) };
  });
}

/* A hand-made design, for the mappings no shipped template exercises yet.
   `layersOf` prefers doc.layers over the template's, which is how an edited
   design carries its own — so this is the same path a real one takes. */
export function convertHandMade() {
  const doc = {
    ...emptyDoc("v1"),
    layers: [
      { id: "bg", type: "rect", x: 0, y: 0, w: 1080, h: 1350, fill: "#101010" },
      { id: "t", type: "text", slot: "title", x: 80, y: 200, w: 900, h: 200, size: 90, weight: 700, fill: "white", lineHeight: 1.1, tracking: -2 },
      { id: "p1", type: "text", slot: "point1", x: 80, y: 500, w: 900, h: 80, size: 40, weight: 400, fill: "white", lineHeight: 1.3, tracking: 0 },
      { id: "p2", type: "text", slot: "point2", x: 80, y: 600, w: 900, h: 80, size: 40, weight: 400, fill: "white", lineHeight: 1.3, tracking: 0 },
      { id: "c", type: "chip", slot: "cta", x: 80, y: 900, w: 400, h: 110, size: 36, weight: 600, fill: "accent", color: "white", radius: 55 },
      { id: "r", type: "text", slot: "quote", x: 80, y: 1100, w: 900, h: 120, size: 44, weight: 400, fill: "white", lineHeight: 1.3, tracking: 0, rotation: 8 },
    ],
    content: { title: "A headline", point1: "First point", point2: "Second point", cta: "Press me", quote: "Someone said this" },
  };
  return designToBlocks(doc as never, { link: "https://example.com/go" });
}
