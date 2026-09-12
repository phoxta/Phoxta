import type { ReactElement, ReactNode } from "react";
import { Pressable, ScrollView, View, type RefreshControlProps, type StyleProp, type ViewStyle } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Bell } from "lucide-react-native";
import { greeting, unreadNotifications } from "@coir-six/core";
import { useTheme } from "@/lib/theme";
import { useData } from "@/state/data";
import { Avatar } from "@/components/ui/primitives";
import { Txt } from "@/components/ui/text";

/**
 * The page scaffold. Every screen is a scroll view on the page tint with the
 * design's 20px gutter; tab screens open with the app bar (you · greeting ·
 * bell), pushed screens with a back header. `tabbed` leaves room for the tab
 * bar so the last card never hides under it.
 */

export const GUTTER = 20;
export const TAB_BAR_H = 64;

export function Screen({ children, header, tabbed, padded = true, style, scroll = true, refreshControl }: { children: ReactNode; header?: ReactNode; tabbed?: boolean; padded?: boolean; style?: StyleProp<ViewStyle>; scroll?: boolean; refreshControl?: ReactElement<RefreshControlProps> }) {
    const { c } = useTheme();
    const insets = useSafeAreaInsets();
    const bottom = (tabbed ? TAB_BAR_H : 0) + insets.bottom + 24;
    const body = (
        <View style={[{ paddingHorizontal: padded ? GUTTER : 0, paddingBottom: bottom }, style]}>{children}</View>
    );
    return (
        <View style={{ flex: 1, backgroundColor: c.page }}>
            {header}
            {scroll ? (
                <ScrollView keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="never" refreshControl={refreshControl}>
                    {body}
                </ScrollView>
            ) : (
                <View style={{ flex: 1 }}>{body}</View>
            )}
        </View>
    );
}

/** The home app bar: avatar → settings, greeting + name, bell → notifications. */
export function HomeBar() {
    const { user } = useData();
    const { c } = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const bellCount = unreadNotifications(user);
    return (
        <View style={{ paddingTop: insets.top + 12, paddingBottom: 8, paddingHorizontal: GUTTER, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.page }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Your profile" onPress={() => router.push("/settings")}>
                <Avatar name={user.profile.name} hue={user.profile.hue} src={user.profile.photoUrl} size="md" />
            </Pressable>
            <View style={{ flex: 1, minWidth: 0 }}>
                <Txt role="caption" color={c.muted}>
                    {greeting()} 🔥
                </Txt>
                <Txt weight="semibold" size={17} lineHeight={21} numberOfLines={1}>
                    {user.profile.name}
                </Txt>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Notifications${bellCount ? `, ${bellCount} unread` : ""}`} onPress={() => router.push("/notifications")} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: c.lineStrong, backgroundColor: c.card, alignItems: "center", justifyContent: "center" }}>
                <Bell size={18} color={c.ink} strokeWidth={1.8} />
                {bellCount > 0 && <View style={{ position: "absolute", right: 11, top: 11, width: 7, height: 7, borderRadius: 4, backgroundColor: c.danger, borderWidth: 1.5, borderColor: c.white }} />}
            </Pressable>
        </View>
    );
}

/** A pushed screen's header: back, title, optional right action. */
export function Header({ title, back = true, right, sub }: { title?: string; back?: boolean; right?: ReactNode; sub?: string }) {
    const { c } = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    return (
        <View style={{ paddingTop: insets.top + 8, paddingBottom: 8, paddingHorizontal: GUTTER - 8, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.page }}>
            {back && (
                <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
                    <ArrowLeft size={20} color={c.ink} />
                </Pressable>
            )}
            <View style={{ flex: 1, minWidth: 0, paddingLeft: back ? 0 : 8 }}>
                {title && (
                    <Txt weight="semibold" size={17} lineHeight={21} numberOfLines={1}>
                        {title}
                    </Txt>
                )}
                {sub && (
                    <Txt role="caption" numberOfLines={1}>
                        {sub}
                    </Txt>
                )}
            </View>
            {right}
        </View>
    );
}

export function PageTitle({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
    return (
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 12, marginBottom: 20 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
                <Txt role="title">{title}</Txt>
                {sub && (
                    <Txt role="small" style={{ marginTop: 4 }}>
                        {sub}
                    </Txt>
                )}
            </View>
            {action}
        </View>
    );
}

export function BackLink({ label, to }: { label: string; to?: string }) {
    const { c } = useTheme();
    const router = useRouter();
    return (
        <Pressable accessibilityRole="button" onPress={() => (to ? router.push(to) : router.canGoBack() ? router.back() : router.replace("/"))} style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginBottom: 12 }}>
            <ArrowLeft size={14} color={c.muted} />
            <Txt weight="medium" size={13} lineHeight={17} color={c.muted}>
                {label}
            </Txt>
        </Pressable>
    );
}
