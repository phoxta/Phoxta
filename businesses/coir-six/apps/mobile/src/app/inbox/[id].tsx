import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Send } from "lucide-react-native";
import { time, type Message } from "@coir-six/core";
import { font, useTheme } from "@/lib/theme";
import { useData } from "@/state/data";
import { useToast } from "@/state/toast";
import { Avatar, Button, EmptyState, IconButton } from "@/components/ui/primitives";
import { Txt } from "@/components/ui/text";
import { GUTTER, Header } from "@/components/shell/Screen";
import { peerPhoto } from "@/app/(tabs)/inbox";

/** One thread: loads on open, marks itself read, and hears replies as they arrive. */
export default function ThreadScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user, repo, refresh, catalogue } = useData();
    const { toast } = useToast();
    const { c } = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const conv = user.conversations.find((x) => x.id === id);
    const [messages, setMessages] = useState<Message[] | null>(null);
    const [draft, setDraft] = useState("");
    const [busy, setBusy] = useState(false);
    const scroller = useRef<ScrollView>(null);

    useEffect(() => {
        let active = true;
        setMessages(null);
        void repo.loadMessages(id).then((m) => active && setMessages(m));
        void repo.markRead(id).then(refresh);
        const unsub = repo.subscribe(() => void repo.loadMessages(id).then((m) => active && setMessages(m)));
        return () => {
            active = false;
            unsub();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, repo]);
    useEffect(() => {
        if (conv?.unread) void repo.markRead(id).then(refresh);
    }, [conv?.unread, id, repo, refresh]);

    const send = async () => {
        const body = draft.trim();
        if (!body || busy) return;
        setBusy(true);
        try {
            const m = await repo.sendMessage(id, body);
            setMessages((prev) => [...(prev ?? []), m]);
            setDraft("");
            await refresh();
        } catch (e) {
            toast(e instanceof Error ? e.message : "Couldn't send", "danger");
        }
        setBusy(false);
    };

    if (!conv) {
        return (
            <View style={{ flex: 1, backgroundColor: c.page }}>
                <Header />
                <View style={{ padding: GUTTER }}>
                    <EmptyState title="Conversation not found" action={<Button size="md" variant="outline" onPress={() => router.replace("/inbox")}>Back to inbox</Button>} />
                </View>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: c.page }}>
            <Header
                title={conv.peerName}
                sub={conv.peerRole}
                right={
                    <View style={{ marginRight: 8 }}>
                        <Avatar name={conv.peerName} hue={conv.peerHue} src={peerPhoto(catalogue, user, conv)} size="md" />
                    </View>
                }
            />
            <ScrollView ref={scroller} onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: false })} contentContainerStyle={{ paddingHorizontal: GUTTER, paddingVertical: 16, gap: 8 }} keyboardShouldPersistTaps="handled">
                {messages === null ? (
                    <Txt role="caption" align="center">
                        Loading…
                    </Txt>
                ) : messages.length === 0 ? (
                    <Txt role="caption" align="center" style={{ paddingVertical: 40 }}>
                        Say hello — {conv.peerName.split(" ")[0]} usually replies within a day.
                    </Txt>
                ) : (
                    messages.map((m) => (
                        <View key={m.id} style={{ flexDirection: "row", justifyContent: m.fromMe ? "flex-end" : "flex-start" }}>
                            <View style={{ maxWidth: "78%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: m.fromMe ? c.brand : c.card, borderBottomRightRadius: m.fromMe ? 6 : 18, borderBottomLeftRadius: m.fromMe ? 18 : 6 }}>
                                <Txt size={14} lineHeight={20} color={m.fromMe ? c.white : c.ink}>
                                    {m.body}
                                </Txt>
                                <Txt size={10} lineHeight={12} color={m.fromMe ? "rgba(255,255,255,0.7)" : c.caption} style={{ marginTop: 4 }}>
                                    {time(m.createdAt)}
                                </Txt>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 12, paddingTop: 10, paddingBottom: insets.bottom + 10, backgroundColor: c.card, borderTopWidth: 1, borderTopColor: c.line }}>
                <TextInput accessibilityLabel="Message" value={draft} onChangeText={setDraft} multiline placeholder={`Message ${conv.peerName.split(" ")[0]}…`} placeholderTextColor={c.caption} style={{ flex: 1, maxHeight: 128, minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: c.lineStrong, paddingHorizontal: 16, paddingVertical: 10, fontFamily: font.regular, fontSize: 14, color: c.ink }} />
                <IconButton label="Send" tone="brand" onPress={() => void send()} disabled={!draft.trim() || busy}>
                    <Send size={16} color={c.white} />
                </IconButton>
            </View>
        </KeyboardAvoidingView>
    );
}
