/* The composer, mounted for real with a real post's blocks in it.
   The two modules that talk to the network are aliased to stubs by the runner,
   so this is the actual component and the actual renderer with nothing else
   faked. */
import { createRoot } from "react-dom/client";
import { EmailComposer } from "@/pages/dashboard/ops/designs/EmailComposer";
import { ARTICLES } from "@/data/articles";
import { postToEmail, type PostIn } from "../../packages/email/src/post";

const count = (a: (typeof ARTICLES)[number]) => new Set(a.body.map((b) => b.kind)).size;
const a = ARTICLES.slice().sort((x, y) => count(y) - count(x))[0];
const post: PostIn = {
  slug: a.slug, title: a.title, excerpt: a.excerpt, category: a.category,
  hero: a.hero, author: a.author, date: a.date, readMinutes: a.readMinutes,
  body: a.body as PostIn["body"],
};
const t = postToEmail(post);

createRoot(document.getElementById("root")!).render(
  <div className="hrx" style={{ padding: 16, minHeight: "100vh" }}>
    <EmailComposer
      orgId="rig"
      initial={{
        name: t.name, kind: "post", subject: t.subject, preheader: t.preheader,
        strap: t.strap, footnote: t.footnote ?? "", blocks: t.blocks, source_slug: t.sourceSlug,
      }}
      onClose={() => {}}
    />
  </div>,
);
