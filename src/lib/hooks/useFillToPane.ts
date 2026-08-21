import { useEffect, useRef, useState } from "react";

/**
 * Size an element to fill from its own top down to the bottom of the dashboard
 * shell's scroll pane — which is where the sidebar ends, the pane and the
 * sidebar being siblings in the shell's flex row.
 *
 * Measured rather than computed. The shell pads with clamp() and <main> adds
 * py-4, so any constant subtracted from innerHeight is wrong at some window size
 * and leaves a stub scrollbar that moves as you resize. Reading the real boxes
 * is right at every size, which is what lets a laptop and a desktop show the
 * same layout.
 *
 * `marginBottom` is NEGATIVE: it absorbs the padding sitting below the element
 * inside the pane. Without it the pane scrolls by exactly that much and the
 * element stops short of the sidebar. The object is shaped to spread straight
 * into a style prop.
 *
 * Returns null when it should not pin — too narrow, or too short for the design
 * to survive — so the caller falls back to normal flow instead of clipping
 * content that has nowhere to go.
 */
export type PaneFit = { height: number; marginBottom: number } | null;

export function useFillToPane(opts?: { minWidth?: number; minHeight?: number }) {
  const { minWidth = 992, minHeight = 520 } = opts ?? {};
  const ref = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<PaneFit>(null);

  useEffect(() => {
    const scrollParent = (node: HTMLElement | null): HTMLElement | null => {
      for (let n = node?.parentElement ?? null; n; n = n.parentElement) {
        const oy = getComputedStyle(n).overflowY;
        if (oy === "auto" || oy === "scroll") return n;
      }
      return null;
    };

    const measure = () => {
      const el = ref.current;
      if (!el) return;
      if (window.innerWidth < minWidth) { setFit(null); return; }

      const pane = scrollParent(el);
      if (!pane) { setFit(null); return; }

      const top = el.getBoundingClientRect().top;
      const height = Math.floor(pane.getBoundingClientRect().bottom - top);
      if (height < minHeight) { setFit(null); return; }

      let marginBottom = 0;
      for (let n = el.parentElement; n && n !== pane; n = n.parentElement) {
        marginBottom += parseFloat(getComputedStyle(n).paddingBottom) || 0;
      }

      const pullUp = -Math.round(marginBottom);
      setFit((prev) =>
        prev && prev.height === height && prev.marginBottom === pullUp
          ? prev // same numbers: keep the object so callers do not re-render
          : { height, marginBottom: pullUp },
      );
    };

    measure();
    const settle = setTimeout(measure, 150); // after webfonts and the shell settle
    window.addEventListener("resize", measure);

    // The pane changes height without the window resizing — the mobile bar
    // appearing, or the shell's clamp() padding shifting.
    const pane = scrollParent(ref.current);
    const ro = pane ? new ResizeObserver(measure) : null;
    if (pane && ro) ro.observe(pane);

    return () => {
      clearTimeout(settle);
      window.removeEventListener("resize", measure);
      ro?.disconnect();
    };
  }, [minWidth, minHeight]);

  return { ref, fit };
}
