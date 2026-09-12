import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Award, Bell, BookOpen, CheckSquare, Flame, MessageSquare, Users, Video } from "lucide-react-native";
import { relative, unreadNotifications, type NotificationKind } from "@coir-six/core";
import { useTheme, type Colors } from "@/lib/theme";
import { useData } from "@/state/data";
import { Button, Card, EmptyState } from "@/components/ui/primitives";
import { Txt } from "@/components/ui/text";
import { Header, PageTitle, Screen } from "@/components/shell/Screen";

const META = (c: Colors): Record<NotificationKind, { icon: React.ReactNode; bg: string }> => ({
    lesson: { icon: <BookOpen size={16} color={c.brand} />, bg: c.brandSoft },
    task: { icon: <CheckSquare size={16} color={c.peach} />, bg: c.peachSoft },
    message: { icon: <MessageSquare size={16} color={c.fe} />, bg: c.feSoft },
    streak: { icon: <Flame size={16} color={c.peach} />, bg: c.peachSoft },
    certificate: { icon: <Award size={16} color={c.mint} />, bg: c.mintSoft },
    group: { icon: <Users size={16} color={c.br} />, bg: c.brSoft },
    live: { icon: <Video size={16} color={c.brand} />, bg: c.brandSoft },
});

export default function NotificationsScreen() {
    const { user, mutate } = useData();
    const { c } = useTheme();
    const router = useRouter();
    const unread = unreadNotifications(user);
    const meta = META(c);
    return (
        <Screen header={<Header title="Notifications" />}>
            <PageTitle title="Notifications" sub={unread ? `${unread} unread` : "You're up to date."} action={unread > 0 ? <Button variant="outline" size="md" onPress={() => void mutate((r) => r.markNotificationsRead())}>Mark all read</Button> : undefined} />
            {user.notifications.length === 0 ? (
                <EmptyState icon={<Bell size={22} color={c.brand} />} title="Nothing yet" body="Replies, reminders and streak milestones land here." />
            ) : (
                <Card padded={false}>
                    {user.notifications.map((n, i) => {
                        const m = meta[n.kind] ?? meta.lesson;
                        return (
                            <Pressable
                                key={n.id}
                                accessibilityRole="button"
                                onPress={() => {
                                    if (!n.readAt) void mutate((r) => r.markNotificationsRead([n.id]));
                                    if (n.href) router.push(n.href);
                                }}
                                style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: pressed ? c.page : n.readAt ? c.card : "#f7f5fd", borderBottomWidth: i === user.notifications.length - 1 ? 0 : 1, borderBottomColor: c.line })}
                            >
                                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: m.bg, alignItems: "center", justifyContent: "center" }}>{m.icon}</View>
                                <View style={{ flex: 1, minWidth: 0 }}>
                                    <Txt weight={n.readAt ? "medium" : "semibold"} size={14} lineHeight={18}>
                                        {n.title}
                                    </Txt>
                                    <Txt size={13} lineHeight={17} color={c.muted} numberOfLines={1}>
                                        {n.body}
                                    </Txt>
                                </View>
                                <Txt role="caption" size={11} lineHeight={13}>
                                    {relative(n.createdAt)}
                                </Txt>
                                {!n.readAt && <View accessibilityLabel="Unread" style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.brand }} />}
                            </Pressable>
                        );
                    })}
                </Card>
            )}
        </Screen>
    );
}
