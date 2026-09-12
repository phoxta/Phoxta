import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "@/lib/theme";
import { Txt } from "@/components/ui/text";

/**
 * The data-viz language: a completion ring and a bar chart, in SVG and plain
 * views. Brand colour only on the bars that matter.
 */

export function Ring({ pct, size = 140, stroke = 2, children, label, style }: { pct: number; size?: number; stroke?: number; children?: ReactNode; label?: string; style?: StyleProp<ViewStyle> }) {
    const { c } = useTheme();
    const r = size / 2 - 4;
    const circ = 2 * Math.PI * r;
    const v = Math.max(0, Math.min(100, pct));
    return (
        <View accessibilityRole="image" accessibilityLabel={label ?? `${v}% complete`} style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, style]}>
            <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: "absolute" }}>
                <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.track} strokeWidth={stroke} fill="none" />
                <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.brand} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${circ} ${circ}`} strokeDashoffset={circ * (1 - v / 100)} rotation={-90} origin={`${size / 2}, ${size / 2}`} />
            </Svg>
            {children}
        </View>
    );
}

export function BarChart({ data, unit = "min", height = 96, style }: { data: { label: string; value: number; hi?: boolean }[]; unit?: string; height?: number; style?: StyleProp<ViewStyle> }) {
    const { c, r } = useTheme();
    const max = Math.max(60, ...data.map((d) => d.value));
    const step = max <= 60 ? 20 : max <= 120 ? 40 : max <= 300 ? 100 : Math.ceil(max / 3 / 50) * 50;
    const top = step * 3;
    const ticks = [step * 3, step * 2, step];
    return (
        <View accessibilityLabel={`Study ${unit} per day`} style={[{ backgroundColor: c.page, borderRadius: r.lg, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, flexDirection: "row", gap: 12 }, style]}>
            <View style={{ width: 22, height, justifyContent: "space-between" }}>
                {ticks.map((t) => (
                    <Txt key={t} role="caption" size={11} lineHeight={12} color={c.muted}>
                        {t}
                    </Txt>
                ))}
            </View>
            <View style={{ flex: 1 }}>
                <View style={{ height }}>
                    <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, justifyContent: "space-between" }}>
                        {ticks.map((t) => (
                            <View key={t} style={{ borderTopWidth: 1, borderStyle: "dashed", borderColor: c.lineStrong }} />
                        ))}
                    </View>
                    <View style={{ position: "absolute", left: 6, right: 6, top: 0, bottom: 0, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around" }}>
                        {data.map((d, i) => (
                            <View key={i} accessibilityLabel={`${d.label}: ${d.value} ${unit}`} style={{ flex: 1, maxWidth: 40, height: "100%", justifyContent: "flex-end", paddingHorizontal: 2 }}>
                                <View style={{ height: `${Math.max(d.value ? 6 : 0, (Math.min(d.value, top) / top) * 100)}%`, borderTopLeftRadius: 6, borderTopRightRadius: 6, backgroundColor: d.hi ? c.brand : c.track }} />
                            </View>
                        ))}
                    </View>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-around", paddingHorizontal: 6, marginTop: 14 }}>
                    {data.map((d, i) => (
                        <Txt key={i} role="caption" size={11} lineHeight={12} color={c.muted} numberOfLines={1} style={{ flex: 1, maxWidth: 40, textAlign: "center" }}>
                            {d.label}
                        </Txt>
                    ))}
                </View>
            </View>
        </View>
    );
}

/** A 7-day activity strip: a dot per day, filled when studied — the streak made visible. */
export function ActivityStrip({ days }: { days: { label: string; minutes: number; today?: boolean }[] }) {
    const { c } = useTheme();
    return (
        <View style={{ flexDirection: "row", justifyContent: "space-between" }} accessibilityLabel="Last seven days">
            {days.map((d, i) => (
                <View key={i} style={{ alignItems: "center", gap: 6 }} accessibilityLabel={`${d.label}: ${d.minutes ? `${d.minutes} min` : "rest"}`}>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: d.minutes ? c.brand : c.line, alignItems: "center", justifyContent: "center", borderWidth: d.today && !d.minutes ? 2 : 0, borderColor: c.brand }}>
                        {d.minutes ? (
                            <Txt weight="semibold" size={11} lineHeight={13} color={c.white}>
                                ✓
                            </Txt>
                        ) : null}
                    </View>
                    <Txt role="caption" size={11} lineHeight={12}>
                        {d.label}
                    </Txt>
                </View>
            ))}
        </View>
    );
}
