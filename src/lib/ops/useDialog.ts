import { useEffect, useRef } from "react";

/**
 * Shared modal behaviour for the console's overlays (contact drawer, replies
 * drawer, email composer). Each one previously implemented a different,
 * incomplete dialog contract: no focus trap, no focus restore, and Escape in
 * only one of the three.
 *
 * Usage:
 *   const ref = useDialog<HTMLDivElement>(onClose);
 *   <div className="position-fixed …" role="dialog" aria-modal="true" ref={ref}>
 *
 * Pass `closeOnEscape: false` when the overlay owns Escape for something else.
 */
const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type=hidden])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function useDialog<T extends HTMLElement>(
  onClose: () => void,
  { closeOnEscape = true }: { closeOnEscape?: boolean } = {},
) {
  const ref = useRef<T | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const node = ref.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Move focus into the dialog so the keyboard starts inside it.
    const first = node?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? node)?.focus?.();

    function onKeyDown(e: KeyboardEvent) {
      if (closeOnEscape && e.key === "Escape") {
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab" || !node) return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (items.length === 0) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      // Wrap focus at the edges so Tab never escapes to the page behind.
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    // The page behind must not scroll while a full-screen overlay is open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [closeOnEscape]);

  return ref;
}
