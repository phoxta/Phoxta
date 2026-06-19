/**
 * Universal content overrides — makes EVERY section editable (text + images)
 * without rewriting the section files. A section renders its built-in content;
 * we detect its text/image "slots" by document order and override them by index.
 * Overrides live on the block's `_edits` prop, so they persist in the document
 * and re-apply on the published page; the AI/voice agents write the same shape.
 */
export type SectionEdits = {
  /** slot index -> replacement text */
  text?: Record<string, string>;
  /** slot index -> replacement image src */
  img?: Record<string, string>;
};

// Text slots: headings/paragraphs/list items/quotes/figcaptions, plus reveal-text
// blocks treated as a single unit. We exclude anything inside a reveal-text (its
// per-character split spans) so a heading is one editable slot, not N letters.
const TEXT_SELECTOR = "h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption";

export function collectTextEls(root: HTMLElement): HTMLElement[] {
  const els = Array.from(root.querySelectorAll<HTMLElement>(`.reveal-text, ${TEXT_SELECTOR}`));
  return els.filter((el) => {
    if (el.closest(".reveal-text") && !el.classList.contains("reveal-text")) return false; // inside a reveal-text
    if (el.querySelector(TEXT_SELECTOR)) return false; // container of other text slots, not a leaf
    return (el.textContent ?? "").trim().length > 0;
  });
}

export function collectImgEls(root: HTMLElement): HTMLImageElement[] {
  return Array.from(root.querySelectorAll("img"));
}

/** Apply overrides to a freshly-rendered section subtree (idempotent). */
export function applyEdits(root: HTMLElement, edits?: SectionEdits): void {
  if (!edits) return;
  if (edits.text) {
    const els = collectTextEls(root);
    for (const [k, v] of Object.entries(edits.text)) {
      const el = els[Number(k)];
      if (el && el.textContent !== v) el.textContent = v;
    }
  }
  if (edits.img) {
    const imgs = collectImgEls(root);
    for (const [k, v] of Object.entries(edits.img)) {
      const img = imgs[Number(k)];
      if (img && img.getAttribute("src") !== v) img.setAttribute("src", v);
    }
  }
}

/** Snapshot a section's current text + image slots (for the side-panel editor). */
export function detectSlots(root: HTMLElement): { texts: string[]; imgs: string[] } {
  return {
    texts: collectTextEls(root).map((e) => (e.textContent ?? "").trim()),
    imgs: collectImgEls(root).map((i) => i.getAttribute("src") ?? ""),
  };
}
