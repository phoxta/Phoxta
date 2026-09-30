import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { ArrowRight, CalendarClock, Compass, Inbox, Users } from "lucide-react-native";
import { useTheme } from "@/lib/theme";
import { useData } from "@/state/data";
import { Txt } from "@/components/ui/text";
import { HomeBar, PageTitle, Screen } from "@/components/shell/Screen";

function Destination({ icon, title, body, onPress }: { icon: ReactNode; title: string; body: string; onPress: () => void }) {
    const { c } = useTheme();
    return <Pressable accessibilityRole="button" onPress={onPress} style={{ flexDirection: "row", gap: 14, alignItems: "flex-start", backgroundColor: c.card, borderRadius: 18, padding: 16 }}><View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: c.brandSoft, alignItems: "center", justifyContent: "center" }}>{icon}</View><View style={{ flex: 1 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Txt weight="semibold" size={16} lineHeight={21}>{title}</Txt><ArrowRight size={15} color={c.ink} /></View><Txt role="small" style={{ marginTop: 4 }}>{body}</Txt></View></Pressable>;
}

export default function ConnectScreen() {
    const { user } = useData();
    const { c } = useTheme();
    const router = useRouter();
    const unread = user.conversations.reduce((total, conversation) => total + conversation.unread, 0);
    return (
        <Screen header={<HomeBar />} tabbed>
            <PageTitle title="Connect" sub="Get practical support from peers and mentors." />
            <View style={{ gap: 12 }}>
                <Destination icon={<Users size={20} color={c.brand} />} title="Community" body="Share work and study with founders on a similar path." onPress={() => router.push("/groups")} />
                <Destination icon={<Compass size={20} color={c.brand} />} title="Mentors" body="Follow specialists and book focused support." onPress={() => router.push("/mentors")} />
                <Destination icon={<CalendarClock size={20} color={c.brand} />} title="Your 1:1s" body="Prepare for and follow through on mentor sessions." onPress={() => router.push("/sessions")} />
                <Destination icon={<Inbox size={20} color={c.brand} />} title="Inbox" body={unread ? `${unread} unread message${unread === 1 ? "" : "s"}` : "Continue a conversation."} onPress={() => router.push("/inbox")} />
            </View>
        </Screen>
    );
}
