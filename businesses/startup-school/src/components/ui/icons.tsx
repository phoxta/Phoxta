import { Banknote, Lightbulb, TrendingUp } from "lucide-react";
import type { CategoryId } from "@startup-school/core";

/** Category glyphs — the same icon everywhere a category is named. */
export function CategoryIcon({ id, size = 13, className }: { id: CategoryId; size?: number; className?: string }) {
    const props = { size, strokeWidth: 2, className, "aria-hidden": true as const };
    if (id === "start") return <Lightbulb {...props} />;
    if (id === "fund") return <Banknote {...props} />;
    return <TrendingUp {...props} />;
}

export const CATEGORY_LABEL: Record<CategoryId, string> = { start: "Start", fund: "Fund", grow: "Grow" };
