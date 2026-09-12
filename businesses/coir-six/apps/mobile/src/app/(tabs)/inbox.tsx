import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Inbox } from "lucide-react-native";
import { relative, type Catalogue, type Conversation, type UserState } from "@coir-six/core";
import { useTheme } from "@/lib/theme";
import { useData } from "@/state/data";
import { Avatar, Badge, Card, EmptyState } from "@/components/ui/primitives";
import { Txt } from "@/components/ui/text";
import { HomeBar, PageTitle, Screen } from "@/components/shell/Screen";

/** A conversation stores only the peer's id; the portrait lives on the mentor or friend record. */
export function peerPhoto(cat: Catalogue, user: UserState, conv: Conversation): string | undefined {
    return conv.peerKind === "mentor" ? cat.mentors.find((m) => m.id === conv.peerId)?.photoUrl : user.friends.find((f) => f.id === conv.peerId)?.photoUrl;
}

export default function InboxScreen() {
    const { user, catalogue } = useData();
    const { c } = useTheme();
    const router = useRouter();
    return (
        <Screen header={<HomeBar />} tabbed>
            <PageTitle title="Inbox" sub={`${user.conversations.length} conversation${user.conversations.length === 1 ? "" : "s"}`} />
            {user.conversations.length === 0 ? (
                <EmptyState icon={<Inbox size={22} color={c.brand} />} title="No messages yet" body="Say hello to a mentor from their profile." />
            ) : (
                <Card padded={false}>
                    {user.conversations.map((conv, i) => (
                        <Pressable key={conv.id} accessibilityRole="button" accessibilityLabel={`Conversation with ${conv.peerName}${conv.unread ? `, ${conv.unread} unread` : ""}`} onPress={() => router.push(`/inbox/${conv.id}`)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: pressed ? c.page : c.card, borderBottomWidth: i === user.conversations.length - 1 ? 0 : 1, borderBottomColor: c.line })}>
                            <Avatar name={conv.peerName} hue={conv.peerHue} src={peerPhoto(catalogue, user, conv)} size="md" />
                            <View style={{ flex: 1, minWidth: 0 }}>
                                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
                                    <Txt weight={conv.unread ? "semibold" : "medium"} size={14} lineHeight={18} numberOfLines={1} style={{ flex: 1 }}>
                                        {conv.peerName}
                                    </Txt>
                                    <Txt role="caption" size={11} lineHeight={13}>
                                        {relative(conv.updatedAt)}
                                    </Txt>
                                </View>
                                <Txt size={13} lineHeight={17} numberOfLines={1} color={conv.unread ? c.ink : c.muted}>
                                    {conv.lastBody || conv.peerRole}
                                </Txt>
                            </View>
                            {conv.unread > 0 && <Badge>{conv.unread}</Badge>}
                        </Pressable>
                    ))}
                </Card>
            )}
        </Screen>
    );
}
