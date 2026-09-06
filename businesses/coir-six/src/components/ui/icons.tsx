import { Code2, PenTool, Tag as TagIcon } from "lucide-react";
import type { CategoryId } from "@/data/types";

/** Category glyphs — the same icon everywhere a category is named. */
export function CategoryIcon({ id, size = 13, className }: { id: CategoryId; size?: number; className?: string }) {
    const props = { size, strokeWidth: 2, className, "aria-hidden": true as const };
    if (id === "fe") return <Code2 {...props} />;
    if (id === "ux") return <PenTool {...props} />;
    return <TagIcon {...props} />;
}

export const CATEGORY_LABEL: Record<CategoryId, string> = { fe: "Front End", ux: "UI/UX Design", br: "Branding" };
