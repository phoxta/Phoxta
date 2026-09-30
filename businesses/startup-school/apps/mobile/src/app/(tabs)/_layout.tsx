import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BookOpen, LayoutGrid, Menu, Rocket, Users } from "lucide-react-native";
import { font, useTheme } from "@/lib/theme";
import { TAB_BAR_H } from "@/components/shell/Screen";

/** Five founder workflows. Lower-frequency destinations open as pushed screens. */
export default function TabsLayout() {
    const { c } = useTheme();
    const insets = useSafeAreaInsets();
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: c.brand,
                tabBarInactiveTintColor: c.muted,
                tabBarStyle: { backgroundColor: c.card, borderTopColor: c.line, borderTopWidth: 1, height: TAB_BAR_H + insets.bottom, paddingTop: 8, paddingBottom: insets.bottom + 8 },
                tabBarLabelStyle: { fontFamily: font.medium, fontSize: 11 },
                tabBarBadgeStyle: { backgroundColor: c.danger, color: c.white, fontFamily: font.semibold, fontSize: 10 },
                sceneStyle: { backgroundColor: c.page },
            }}
        >
            <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color }) => <LayoutGrid size={22} color={color} strokeWidth={1.8} /> }} />
            <Tabs.Screen name="learn" options={{ title: "Learn", tabBarIcon: ({ color }) => <BookOpen size={22} color={color} strokeWidth={1.8} /> }} />
            <Tabs.Screen name="build" options={{ title: "Build", tabBarIcon: ({ color }) => <Rocket size={22} color={color} strokeWidth={1.8} /> }} />
            <Tabs.Screen name="connect" options={{ title: "Connect", tabBarIcon: ({ color }) => <Users size={22} color={color} strokeWidth={1.8} /> }} />
            <Tabs.Screen name="more" options={{ title: "More", tabBarIcon: ({ color }) => <Menu size={22} color={color} strokeWidth={1.8} /> }} />
        </Tabs>
    );
}
