import { useLayoutEffect, useRef, type ReactNode } from "react";
import { applyEdits, detectSlots, type SectionEdits } from "./edits";
import { setSlots } from "./editStore";

/**
 * Wraps every rendered section to (1) publish its detected text/image slots for
 * the side-panel editor + AI/voice, and (2) apply the block's content overrides.
 * The wrapper uses display:contents so it adds no layout box. Runs in both the
 * editor canvas and the published page, so overrides show identically.
 */
export default function EditableSection({
  blockId,
  edits,
  children,
}: {
  blockId?: string;
  edits?: SectionEdits;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    // Detect the default slots first (so the panel shows originals), then override.
    if (blockId) setSlots(blockId, detectSlots(root));
    applyEdits(root, edits);
  });

  return (
    <div ref={ref} style={{ display: "contents" }}>
      {children}
    </div>
  );
}
