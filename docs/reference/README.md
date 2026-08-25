# Reference material

Files kept for reference, deliberately outside `public/` so they are not built
or served.

- **`business-plan-template.html`** — the business-plan deck imported from the
  earlier Next.js Phoxta. Twenty slides at 1280×720, every element absolutely
  positioned around the exact length of the copy it shipped with, inside a
  `.slide` that clips its overflow.

  It is the design source for `src/lib/ideas/plan.ts`, not its input. Filling
  this file in with a real business's words would look finished and quietly cut
  the end off any paragraph longer than the original's — in a document someone
  shows an investor. The generator carries over the palette, the Manrope type
  and the slide furniture, and lays each slide out in normal flow so it grows
  instead of clipping.

  Open it in a browser when changing how the deck looks; that is what it is for.
