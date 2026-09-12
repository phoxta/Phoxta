import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import { useTheme } from "@/lib/theme";
import { useTenant } from "@/state/tenant";
import { Mark, Sparkle } from "@/components/ui/primitives";
import { Txt } from "@/components/ui/text";
import { GUTTER } from "@/components/shell/Screen";

/** The shared auth frame: a brand band up top, the form below. */
export function AuthFrame({ title, sub, children, back }: { title: string; sub: string; children: ReactNode; back?: boolean }) {
    const { c } = useTheme();
    const { name } = useTenant();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    return (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: c.page }}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
                <View style={{ backgroundColor: c.brand, paddingTop: insets.top + 16, paddingBottom: 28, paddingHorizontal: GUTTER, overflow: "hidden", borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}>
                    <Sparkle size={200} style={{ position: "absolute", right: -60, top: -70, opacity: 0.35 }} />
                    <Sparkle size={44} style={{ position: "absolute", right: 30, top: 90, opacity: 0.35 }} />
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        {back && (
                            <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} onPress={() => (router.canGoBack() ? router.back() : router.replace("/login"))} style={{ marginRight: 4 }}>
                                <ArrowLeft size={20} color={c.white} />
                            </Pressable>
                        )}
                        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" }}>
                            <Sparkle size={16} />
                        </View>
                        <Txt weight="semibold" size={20} lineHeight={24} color={c.white} numberOfLines={1} style={{ flex: 1 }}>
                            {name}
                        </Txt>
                    </View>
                    <Txt role="overline" color="rgba(255,255,255,0.8)" style={{ marginTop: 28, letterSpacing: 1.6 }}>
                        Online course
                    </Txt>
                    <Txt weight="semibold" size={26} lineHeight={32} color={c.white} style={{ marginTop: 8, maxWidth: 320 }}>
                        Sharpen Your Skills with Professional Online Courses
                    </Txt>
                </View>
                <View style={{ paddingHorizontal: GUTTER, paddingTop: 28, paddingBottom: insets.bottom + 32, gap: 6 }}>
                    <Txt role="title">{title}</Txt>
                    <Txt role="small">{sub}</Txt>
                    <View style={{ marginTop: 20 }}>{children}</View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

export function BrandMark() {
    return <Mark size={32} />;
}
