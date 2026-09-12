import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BookOpen, CheckSquare, Inbox, LayoutGrid, Users } from "lucide-react-native";
import { unreadMessages } from "@coir-six/core";
import { font, useTheme } from "@/lib/theme";
import { useData } from "@/state/data";
import { TAB_BAR_H } from "@/components/shell/Screen";

/** The five tabs the mobile design specifies: Home · Lesson · Task · Group · Inbox. */
export default function TabsLayout() {
    const { c } = useTheme();
    const { user } = useData();
    const insets = useSafeAreaInsets();
    const inboxCount = unreadMessages(user);
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
            <Tabs.Screen name="lessons" options={{ title: "Lesson", tabBarIcon: ({ color }) => <BookOpen size={22} color={color} strokeWidth={1.8} /> }} />
            <Tabs.Screen name="tasks" options={{ title: "Task", tabBarIcon: ({ color }) => <CheckSquare size={22} color={color} strokeWidth={1.8} /> }} />
            <Tabs.Screen name="groups" options={{ title: "Group", tabBarIcon: ({ color }) => <Users size={22} color={color} strokeWidth={1.8} /> }} />
            <Tabs.Screen name="inbox" options={{ title: "Inbox", tabBarBadge: inboxCount > 0 ? inboxCount : undefined, tabBarIcon: ({ color }) => <Inbox size={22} color={color} strokeWidth={1.8} /> }} />
        </Tabs>
    );
}
