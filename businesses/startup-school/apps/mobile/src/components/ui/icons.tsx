import { Banknote, Lightbulb, TrendingUp } from "lucide-react-native";
import type { CategoryId } from "@startup-school/core";

/** Category glyphs — the same icon everywhere a category is named (lucide, like the web). */
export function CategoryIcon({ id, size = 13, color }: { id: CategoryId; size?: number; color?: string }) {
    const props = { size, strokeWidth: 2, color };
    if (id === "start") return <Lightbulb {...props} />;
    if (id === "fund") return <Banknote {...props} />;
    return <TrendingUp {...props} />;
}

export const CATEGORY_LABEL: Record<CategoryId, string> = { start: "Validate", fund: "Build", grow: "Launch & Grow" };
