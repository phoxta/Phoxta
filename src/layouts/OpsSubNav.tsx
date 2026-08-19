import { createContext, useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Slot for a console tab's own second-level nav (the AI Agent sub-tabs, the
 * Marketing sub-tabs).
 *
 * The sub-nav is rendered by the tab, which lives inside OperatingLayout's
 * <Outlet/> — i.e. inside the SCROLLING content, below the pinned header. Making
 * it stay put therefore used to mean a second sticky bar offset by the header's
 * measured height, published as a CSS variable by a ResizeObserver.
 *
 * This removes that machinery: the sub-nav is portalled INTO the header's sticky
 * block, so there is exactly one pinned element and nothing to measure. It cannot
 * mis-stack, it follows the header automatically when a long business name wraps,
 * and it needs no JS to position.
 */
const SlotContext = createContext<HTMLElement | null>(null);

export const OpsSubNavSlotProvider = SlotContext.Provider;

export function OpsSubNav({ children }: { children: ReactNode }) {
  const slot = useContext(SlotContext);
  // No slot (a tab rendered outside the console shell) — render in place rather
  // than vanishing. The slot is attached during commit, before paint, so the
  // portalled path is what actually renders inside the console.
  if (!slot) return <>{children}</>;
  return createPortal(<div className="pt-3">{children}</div>, slot);
}
