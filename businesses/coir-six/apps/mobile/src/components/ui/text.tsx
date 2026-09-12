import { Text, type TextProps, type TextStyle } from "react-native";
import { font, useTheme } from "@/lib/theme";

/**
 * Typography. One component, a handful of roles, the app's type scale:
 * 22/28 titles · 18/24 section heads · 15/21 body · 13/18 small · 12/16 caption ·
 * 11 overlines with tracking. Weight picks the font file (Android needs that).
 */

type Role = "title" | "h2" | "h3" | "body" | "small" | "caption" | "overline";
type Weight = keyof typeof font;

const ROLE: Record<Role, { size: number; lineHeight: number; weight: Weight; tone?: "muted" | "caption" }> = {
    title: { size: 22, lineHeight: 28, weight: "semibold" },
    h2: { size: 18, lineHeight: 24, weight: "semibold" },
    h3: { size: 15, lineHeight: 21, weight: "semibold" },
    body: { size: 15, lineHeight: 21, weight: "regular" },
    small: { size: 13, lineHeight: 18, weight: "regular", tone: "muted" },
    caption: { size: 12, lineHeight: 16, weight: "regular", tone: "caption" },
    overline: { size: 11, lineHeight: 14, weight: "medium", tone: "caption" },
};

/** `role` here is the typographic role; React Native's accessibility `role` is deliberately hidden (use accessibilityRole). */
export interface TxtProps extends Omit<TextProps, "role"> {
    role?: Role;
    weight?: Weight;
    color?: string;
    size?: number;
    lineHeight?: number;
    align?: TextStyle["textAlign"];
}

export function Txt({ role = "body", weight, color, size, lineHeight, align, style, children, ...rest }: TxtProps) {
    const { c } = useTheme();
    const r = ROLE[role];
    const w = weight ?? r.weight;
    const tone = color ?? (r.tone === "muted" ? c.muted : r.tone === "caption" ? c.caption : c.ink);
    const s: TextStyle = {
        fontFamily: font[w],
        fontSize: size ?? r.size,
        lineHeight: lineHeight ?? (size ? Math.round(size * 1.35) : r.lineHeight),
        color: tone,
        textAlign: align,
        ...(role === "overline" ? { textTransform: "uppercase", letterSpacing: 0.9 } : null),
    };
    return (
        <Text style={[s, style]} {...rest}>
            {children}
        </Text>
    );
}
