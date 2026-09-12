import { Code2, PenTool, Tag as TagIcon } from "lucide-react-native";
import type { CategoryId } from "@coir-six/core";

/** Category glyphs — the same icon everywhere a category is named (lucide, like the web). */
export function CategoryIcon({ id, size = 13, color }: { id: CategoryId; size?: number; color?: string }) {
    const props = { size, strokeWidth: 2, color };
    if (id === "fe") return <Code2 {...props} />;
    if (id === "ux") return <PenTool {...props} />;
    return <TagIcon {...props} />;
}

export const CATEGORY_LABEL: Record<CategoryId, string> = { fe: "Front End", ux: "UI/UX Design", br: "Branding" };
