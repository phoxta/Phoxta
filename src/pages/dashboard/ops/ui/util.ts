import { useLayoutEffect, useState, type RefObject } from "react";

/** Non-component helpers, kept out of ui.tsx so fast-refresh stays happy. */

/**
 * True remaining viewport height for a full-bleed pane set.
 *
 * The console's chrome above the tab content is sticky and its height changes
 * (business switcher wraps, sub-nav appears), so the old `calc(100vh - 240px)`
 * was wrong on most breakpoints. Measuring the element's own top offset is
 * exact and needs no constant to be kept in sync.
 */
export function useFillHeight(ref: RefObject<HTMLElement | null>, bottomGap = 16) {
  const [h, setH] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const top = el.getBoundingClientRect().top;
      // visualViewport tracks the on-screen keyboard on mobile; innerHeight does not.
      const vh = window.visualViewport?.height ?? window.innerHeight;
      setH(Math.max(360, Math.round(vh - top - bottomGap)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    // Watch the whole document: the sticky console header above us resizes when
    // the window narrows and the tab strip or title wraps.
    ro.observe(document.documentElement);
    ro.observe(el);
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
    };
  }, [ref, bottomGap]);
  return h;
}

export const CHANNEL_LABEL: Record<string, string> = {
  sms: "SMS",
  whatsapp: "WhatsApp",
  web: "Web chat",
  voice: "Phone",
  email: "Email",
  ticket: "Ticket",
};
export const channelLabel = (c: string) => CHANNEL_LABEL[c] ?? c;

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** ⌘ on Mac, Ctrl elsewhere — the shortcut hints must match the actual key. */
export const isMac =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
export const MOD = isMac ? "⌘" : "Ctrl";
/** ⇧ and ↵ are tofu in the console's Windows font stack — spell them there. */
export const SHIFT = isMac ? "⇧" : "Shift";
export const ENTER = isMac ? "↵" : "Enter";
