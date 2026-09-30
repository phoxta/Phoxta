import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { ArrowRight, Bell, Settings, TrendingUp } from "lucide-react-native";
import { useTheme } from "@/lib/theme";
import { useData } from "@/state/data";
import { Txt } from "@/components/ui/text";
import { HomeBar, PageTitle, Screen } from "@/components/shell/Screen";

function Destination({ icon, title, body, onPress }: { icon: ReactNode; title: string; body: string; onPress: () => void }) {
    const { c } = useTheme();
    return <Pressable accessibilityRole="button" onPress={onPress} style={{ flexDirection: "row", gap: 14, alignItems: "flex-start", backgroundColor: c.card, borderRadius: 18, padding: 16 }}><View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: c.brandSoft, alignItems: "center", justifyContent: "center" }}>{icon}</View><View style={{ flex: 1 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Txt weight="semibold" size={16} lineHeight={21}>{title}</Txt><ArrowRight size={15} color={c.ink} /></View><Txt role="small" style={{ marginTop: 4 }}>{body}</Txt></View></Pressable>;
}

export default function MoreScreen() {
    const { c } = useTheme();
    const router = useRouter();
    const { user } = useData();
    return (
        <Screen header={<HomeBar />} tabbed>
            <PageTitle title="More" sub="Progress, account, and low-frequency utilities." />
            <View style={{ gap: 12 }}>
                <Destination icon={<TrendingUp size={20} color={c.brand} />} title="Progress & certificates" body={`${user.certificates.length} earned certificate${user.certificates.length === 1 ? "" : "s"}`} onPress={() => router.push("/progress")} />
                <Destination icon={<Bell size={20} color={c.brand} />} title="Notifications" body="See reminders, replies, and milestones." onPress={() => router.push("/notifications")} />
                <Destination icon={<Settings size={20} color={c.brand} />} title="Settings" body="Update your profile and weekly goal." onPress={() => router.push("/settings")} />
            </View>
        </Screen>
    );
}
