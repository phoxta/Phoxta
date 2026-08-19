import { useEffect, useState } from "react";

/**
 * Publishes a pinned page header's height as the `--dash-head-h` CSS variable on
 * :root, so a second-level bar (`.dash-sticky-sub` — the AI Agent sub-tabs, the
 * Marketing sub-tabs) can pin directly beneath it instead of at the top of the
 * scroll container.
 *
 * The offset has to be measured rather than hard-coded: the operating console's
 * header changes height as a long business name wraps, as the business switcher
 * appears for multi-business accounts, and as the vertical/stage badges render.
 *
 * Returns a CALLBACK ref, not a RefObject, on purpose. The layouts that use this
 * early-return a "Loading…" placeholder before the header exists, so an effect
 * keyed on a ref object would run once against `null` and never re-run when the
 * header finally mounted — leaving the variable unset and the sub-bar pinning at
 * 0, on top of the header. A callback ref re-runs the effect on attach/detach.
 *
 * Usage: `const headRef = useStickyHeadHeight(); ... <div ref={headRef}>`
 *
 * The variable is cleared on detach so a page without a pinned header doesn't
 * inherit a stale offset (`.dash-sticky-sub` then falls back to 0).
 */
export function useStickyHeadHeight() {
  const [el, setEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (!el) {
      root.style.removeProperty("--dash-head-h");
      return;
    }
    const set = () => {
      root.style.setProperty("--dash-head-h", `${Math.round(el.getBoundingClientRect().height)}px`);
    };
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty("--dash-head-h");
    };
  }, [el]);

  return setEl;
}
