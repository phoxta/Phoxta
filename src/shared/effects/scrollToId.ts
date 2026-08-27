/**
 * Jump to a section on the current page.
 *
 * A plain `href="#id"` does not work here. GSAP's ScrollSmoother moves the page
 * by transforming `#smooth-content` and giving the body a synthetic height, so
 * the browser's own anchor jump — and `scrollIntoView`, which reads the same
 * transformed geometry — lands somewhere that is not the section. The smoother
 * has to be asked instead.
 *
 * `ScrollSmoother.get()` returns the live instance, which is why this does not
 * need one passed in. When there is no smoother (a route that renders without
 * it, or before it has been created) the native path is correct and is used.
 */
export function scrollToId(id: string, offset = 0) {
  const el = document.getElementById(id);
  if (!el) return;

  // Imported off the global GSAP registration rather than as a module import:
  // ScrollSmoother is a plugin registered once in GlobalEffects, and pulling it
  // into a marketing section's chunk to read one static would drag the plugin
  // in with it.
  const smoother = (window as unknown as {
    ScrollSmoother?: { get?: () => { scrollTo?: (t: Element | number, smooth?: boolean, position?: string) => void } | null };
  }).ScrollSmoother?.get?.();

  if (smoother?.scrollTo) {
    smoother.scrollTo(el, true, `top ${offset}px`);
    return;
  }
  const top = el.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top, behavior: "smooth" });
}

/** Click handler for an in-page link, keeping the href for middle-click,
 *  right-click-copy and anyone reading the markup. */
export const onAnchorClick = (id: string, offset = 0) => (e: React.MouseEvent) => {
  // A modified click is the reader asking for a new tab or a copied address;
  // hijacking it would take that away.
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  e.preventDefault();
  scrollToId(id, offset);
};
