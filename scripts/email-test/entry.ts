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
