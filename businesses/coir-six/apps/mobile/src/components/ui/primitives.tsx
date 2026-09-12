import { type ReactNode, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import { Search } from "lucide-react-native";
import { initials, mediaUrl, tokens, type CategoryId, type Hue, type Theme as CourseTheme } from "@coir-six/core";
import { MEDIA_BASE } from "@/lib/env";
import { categoryColors, font, hueColors, useTheme } from "@/lib/theme";
import { Txt } from "@/components/ui/text";

/**
 * The Coir Six component library on a phone — the same pieces as the web's
 * primitives.tsx: five button variants, one input, category tags, avatars on
 * a deterministic tint, cards with inset panels, a 3px progress bar. Every
 * control has an accessibility role and label so VoiceOver/TalkBack read it.
 */

// ---- Buttons ----------------------------------------------------------------

type Variant = "primary" | "brand" | "tonal" | "outline" | "ghost" | "danger";
type Size = "lg" | "md" | "sm";

export function Button({
    variant = "brand",
    size = "lg",
    block,
    loading,
    disabled,
    onPress,
    children,
    icon,
    style,
    accessibilityLabel,
}: {
    variant?: Variant;
    size?: Size;
    block?: boolean;
    loading?: boolean;
    disabled?: boolean;
    onPress?: () => void;
    children?: ReactNode;
    icon?: ReactNode;
    style?: StyleProp<ViewStyle>;
    accessibilityLabel?: string;
}) {
    const { c, r } = useTheme();
    const look: Record<Variant, { bg: string; fg: string; border?: string }> = {
        primary: { bg: c.ink, fg: c.white },
        brand: { bg: c.brand, fg: c.white },
        tonal: { bg: c.subtle, fg: c.brandInk },
        outline: { bg: c.card, fg: c.ink, border: c.lineStrong },
        ghost: { bg: "transparent", fg: c.ink },
        danger: { bg: c.dangerSoft, fg: c.dangerInk },
    };
    const dims = size === "lg" ? { h: 44, px: 20, fs: 14 } : size === "md" ? { h: 36, px: 16, fs: 13 } : { h: 28, px: 12, fs: 12 };
    const l = look[variant];
    const off = disabled || loading;
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            accessibilityState={{ disabled: off, busy: loading }}
            disabled={off}
            onPress={onPress}
            style={({ pressed }) => [
                {
                    height: dims.h,
                    paddingHorizontal: dims.px,
                    borderRadius: variant === "tonal" ? r.sm : r.full,
                    backgroundColor: l.bg,
                    borderWidth: l.border ? 1 : 0,
                    borderColor: l.border,
                    opacity: off ? 0.45 : pressed ? 0.85 : 1,
                    alignSelf: block ? "stretch" : "flex-start",
                },
                styles.btn,
                style,
            ]}
        >
            {loading ? <ActivityIndicator size="small" color={l.fg} /> : icon}
            {typeof children === "string" ? (
                <Txt weight="semibold" size={dims.fs} lineHeight={dims.fs + 4} color={l.fg}>
                    {children}
                </Txt>
            ) : (
                children
            )}
        </Pressable>
    );
}

export function IconButton({ label, size = "lg", tone = "default", dot, onPress, children, style, disabled }: { label: string; size?: "lg" | "md" | "sm"; tone?: "default" | "brand" | "outline-brand"; dot?: boolean; onPress?: () => void; children: ReactNode; style?: StyleProp<ViewStyle>; disabled?: boolean }) {
    const { c } = useTheme();
    const d = size === "lg" ? 44 : size === "md" ? 32 : 28;
    const look = tone === "brand" ? { bg: c.brand, border: c.brand } : tone === "outline-brand" ? { bg: c.card, border: c.brand } : { bg: c.card, border: c.lineStrong };
    return (
        <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} disabled={disabled} style={({ pressed }) => [{ width: d, height: d, borderRadius: d / 2, backgroundColor: look.bg, borderWidth: 1, borderColor: look.border, opacity: disabled ? 0.45 : pressed ? 0.8 : 1 }, styles.center, style]}>
            {children}
            {dot && <View style={[styles.dot, { backgroundColor: c.danger, borderColor: c.white }]} />}
        </Pressable>
    );
}

// ---- Inputs -----------------------------------------------------------------

export interface FieldProps extends TextInputProps {
    label?: string;
    hint?: string;
    error?: string | null;
    leading?: ReactNode;
    trailing?: ReactNode;
    containerStyle?: StyleProp<ViewStyle>;
}

export function Field({ label, hint, error, leading, trailing, containerStyle, style, ...rest }: FieldProps) {
    const { c, r } = useTheme();
    const [focus, setFocus] = useState(false);
    return (
        <View style={[{ gap: 6 }, containerStyle]}>
            {label && <Txt role="overline" color={c.muted}>{label}</Txt>}
            <View style={[styles.field, { borderRadius: r.md, backgroundColor: c.card, borderColor: error ? c.danger : focus ? c.brand : c.lineStrong }]}>
                {leading}
                <TextInput
                    accessibilityLabel={label}
                    placeholderTextColor={c.caption}
                    onFocus={() => setFocus(true)}
                    onBlur={() => setFocus(false)}
                    style={[{ flex: 1, fontFamily: font.regular, fontSize: 14, color: c.ink, paddingVertical: 0 }, style]}
                    {...rest}
                />
                {trailing}
            </View>
            {error ? (
                <Txt role="caption" color={c.dangerInk}>{error}</Txt>
            ) : hint ? (
                <Txt role="caption">{hint}</Txt>
            ) : null}
        </View>
    );
}

export function SearchBox({ value, onChange, onSubmit, placeholder = "Search your course…" }: { value: string; onChange: (v: string) => void; onSubmit?: () => void; placeholder?: string }) {
    const { c, r } = useTheme();
    return (
        <View style={[styles.field, { height: 48, borderRadius: r.md, backgroundColor: c.card, borderColor: c.lineStrong }]}>
            <Search size={18} color={c.ink} strokeWidth={1.8} />
            <TextInput accessibilityLabel="Search courses" value={value} onChangeText={onChange} onSubmitEditing={onSubmit} returnKeyType="search" placeholder={placeholder} placeholderTextColor={c.caption} style={{ flex: 1, fontFamily: font.regular, fontSize: 14, color: c.ink, paddingVertical: 0 }} />
        </View>
    );
}

/** A selectable filter pill (categories, levels, task filters). */
export function Chip({ on, onPress, children, tone = "ink" }: { on: boolean; onPress: () => void; children: ReactNode; tone?: "ink" | "brand" }) {
    const { c, r } = useTheme();
    const active = tone === "brand" ? { border: c.brand, bg: c.brandSoft, fg: c.brandInk } : { border: c.ink, bg: c.card, fg: c.ink };
    return (
        <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={onPress} style={{ height: 36, paddingHorizontal: 14, borderRadius: r.full, borderWidth: 1, borderColor: on ? active.border : c.line, backgroundColor: on ? active.bg : c.card, justifyContent: "center" }}>
            {typeof children === "string" ? (
                <Txt weight="semibold" size={13} lineHeight={16} color={on ? active.fg : c.caption}>
                    {children}
                </Txt>
            ) : (
                children
            )}
        </Pressable>
    );
}

// ---- Tags, badges -----------------------------------------------------------

type TagTone = CategoryId | "ok" | "warn" | "danger" | "neutral";

export function Tag({ tone, children, icon }: { tone: TagTone; children: ReactNode; icon?: boolean }) {
    const { c, r } = useTheme();
    const look =
        tone === "fe" || tone === "ux" || tone === "br"
            ? { bg: categoryColors(c, tone).soft, fg: categoryColors(c, tone).ink }
            : tone === "ok"
              ? { bg: c.mintSoft, fg: c.mint }
              : tone === "warn"
                ? { bg: c.peachSoft, fg: c.peach }
                : tone === "danger"
                  ? { bg: c.dangerSoft, fg: c.dangerInk }
                  : { bg: c.page, fg: c.muted };
    return (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: r.xs, backgroundColor: look.bg }}>
            {icon && (tone === "fe" || tone === "ux" || tone === "br") && <CategoryGlyph id={tone} color={look.fg} />}
            <Txt weight="semibold" size={11} lineHeight={13} color={look.fg} style={{ textTransform: "uppercase", letterSpacing: 0.3 }}>
                {children}
            </Txt>
        </View>
    );
}

function CategoryGlyph({ id, color }: { id: CategoryId; color: string }) {
    // Local to avoid a cycle with icons.tsx; the three glyphs are lucide's Code2 / PenTool / Tag.
    const d = id === "fe" ? "M18 16l4-4-4-4M6 8l-4 4 4 4M14.5 4l-5 16" : id === "ux" ? "M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5zM2 2l7.586 7.586M11 11a2 2 0 100-4 2 2 0 000 4z" : "M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82zM7 7h.01";
    return (
        <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
            <Path d={d} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

export function Badge({ children, tone = "brand", style }: { children: ReactNode; tone?: "brand" | "danger" | "ink"; style?: StyleProp<ViewStyle> }) {
    const { c, r } = useTheme();
    return (
        <View style={[{ minWidth: 20, paddingHorizontal: 7, paddingVertical: 3, borderRadius: r.full, backgroundColor: tone === "brand" ? c.brand : tone === "danger" ? c.danger : c.ink, alignItems: "center" }, style]}>
            <Txt weight="semibold" size={11} lineHeight={13} color={c.white}>
                {children}
            </Txt>
        </View>
    );
}

// ---- Avatar -----------------------------------------------------------------

const AV = { xs: 32, sm: 34, md: 44, lg: 50, xl: 110 } as const;
const AV_TEXT = { xs: 11, sm: 12, md: 15, lg: 16, xl: 36 } as const;

export function Avatar({ name, hue, src, size = "sm", px, style }: { name: string; hue: Hue; src?: string; size?: keyof typeof AV; /** Explicit pixel size (overrides `size`). */ px?: number; style?: StyleProp<ViewStyle> }) {
    const { c } = useTheme();
    const d = px ?? AV[size];
    const t = hueColors(c, hue);
    const uri = mediaUrl(src, MEDIA_BASE);
    return (
        <View accessibilityElementsHidden style={[{ width: d, height: d, borderRadius: d / 2, backgroundColor: t.bg, overflow: "hidden" }, styles.center, style]}>
            {uri ? <Image source={{ uri }} style={{ width: d, height: d }} contentFit="cover" transition={150} /> : <Txt weight="semibold" size={px ? Math.round(px * 0.34) : AV_TEXT[size]} lineHeight={px ? Math.round(px * 0.4) : AV_TEXT[size] + 4} color={t.fg}>{initials(name)}</Txt>}
        </View>
    );
}

// ---- Surfaces ---------------------------------------------------------------

export function Card({ children, style, padded = true }: { children: ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean }) {
    const { c, r } = useTheme();
    return <View style={[{ backgroundColor: c.card, borderRadius: r.xl, padding: padded ? 16 : 0, overflow: "hidden" }, style]}>{children}</View>;
}

export function Inset({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
    const { c, r } = useTheme();
    return <View style={[{ backgroundColor: c.page, borderRadius: r.lg, padding: 16 }, style]}>{children}</View>;
}

export function Divider({ inset = 0 }: { inset?: number }) {
    const { c } = useTheme();
    return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.line, marginLeft: inset }} />;
}

export function SectionHead({ title, action, style }: { title: string; action?: ReactNode; style?: StyleProp<ViewStyle> }) {
    return (
        <View style={[{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }, style]}>
            <Txt role="h2" style={{ flex: 1 }}>
                {title}
            </Txt>
            {action}
        </View>
    );
}

export function ProgressBar({ value, style }: { value: number; style?: StyleProp<ViewStyle> }) {
    const { c } = useTheme();
    const v = Math.max(0, Math.min(100, Math.round(value)));
    return (
        <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: v }} style={[{ height: 3, borderRadius: 2, backgroundColor: c.line, overflow: "hidden" }, style]}>
            <View style={{ width: `${v}%`, height: 3, borderRadius: 2, backgroundColor: c.brand }} />
        </View>
    );
}

export function Skeleton({ h = 20, w, style }: { h?: number; w?: number | `${number}%`; style?: StyleProp<ViewStyle> }) {
    const { c, r } = useTheme();
    return <View style={[{ height: h, width: w ?? "100%", borderRadius: r.md, backgroundColor: c.line }, style]} />;
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
    const { c } = useTheme();
    return (
        <Card style={{ alignItems: "center", paddingVertical: 40, paddingHorizontal: 24, gap: 8 }}>
            {icon && <View style={[styles.center, { width: 48, height: 48, borderRadius: 24, backgroundColor: c.brandSoft, marginBottom: 4 }]}>{icon}</View>}
            <Txt role="h2" align="center">
                {title}
            </Txt>
            {body && (
                <Txt role="small" align="center" style={{ maxWidth: 320 }}>
                    {body}
                </Txt>
            )}
            {action && <View style={{ marginTop: 12 }}>{action}</View>}
        </Card>
    );
}

/** Cover art for a course: the design's gradient per theme, the photo (when there is one) tinted under it. */
export function Cover({ theme, src, height = 130, radius, children, style }: { theme: CourseTheme; src?: string; height?: number; radius?: number; children?: ReactNode; style?: StyleProp<ViewStyle> }) {
    const { r } = useTheme();
    const g = tokens.coverGradient[theme];
    const uri = mediaUrl(src, MEDIA_BASE);
    return (
        <View style={[{ height, borderRadius: radius ?? r.md, overflow: "hidden" }, style]}>
            <LinearGradient colors={[g[0], g[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            {uri && <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />}
            {uri && <LinearGradient colors={[g[0], g[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { opacity: 0.55 }]} />}
            <Sparkle size={96} style={{ position: "absolute", right: -24, top: -32, opacity: 0.3 }} />
            {children}
        </View>
    );
}

export function Sparkle({ size = 16, fill = "#fff", style }: { size?: number; fill?: string; style?: StyleProp<ViewStyle> }) {
    return (
        <View style={style} pointerEvents="none">
            <Svg width={size} height={size} viewBox="0 0 100 100">
                <Path d="M50 0C52 30 70 48 100 50 70 52 52 70 50 100 48 70 30 52 0 50 30 48 48 30 50 0z" fill={fill} />
            </Svg>
        </View>
    );
}

/** The brand mark: sparkle on a brand disc. */
export function Mark({ size = 32 }: { size?: number }) {
    const { c } = useTheme();
    return (
        <View style={[styles.center, { width: size, height: size, borderRadius: size / 2, backgroundColor: c.brand }]}>
            <Sparkle size={size / 2} />
        </View>
    );
}

const styles = StyleSheet.create({
    btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
    center: { alignItems: "center", justifyContent: "center" },
    dot: { position: "absolute", right: 10, top: 10, width: 7, height: 7, borderRadius: 4, borderWidth: 1.5 },
    field: { height: 46, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, paddingHorizontal: 16 },
});
