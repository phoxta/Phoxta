import { useEffect, useState } from "react";
import { TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { Send, Users } from "lucide-react-native";
import { mediaUrl, relative, type GroupPost } from "@coir-six/core";
import { MEDIA_BASE } from "@/lib/env";
import { font, useTheme } from "@/lib/theme";
import { useData } from "@/state/data";
import { useToast } from "@/state/toast";
import { Avatar, Button, Card, EmptyState, Inset, Skeleton, Tag } from "@/components/ui/primitives";
import { Txt } from "@/components/ui/text";
import { CATEGORY_LABEL } from "@/components/ui/icons";
import { Header, Screen } from "@/components/shell/Screen";

export default function GroupScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { catalogue, user, repo, mutate } = useData();
    const { toast } = useToast();
    const { c } = useTheme();
    const router = useRouter();
    const group = catalogue.groups.find((g) => g.id === id);
    const joined = Boolean(id && user.groupIds.includes(id));
    const [posts, setPosts] = useState<GroupPost[] | null>(null);
    const [draft, setDraft] = useState("");
    const [busy, setBusy] = useState(false);
    // Posts store only a name; the portrait lives on whoever that is (you, a mentor, a friend).
    const photoByName = (name: string) => (name === user.profile.name ? user.profile.photoUrl : (catalogue.mentors.find((m) => m.name === name)?.photoUrl ?? user.friends.find((f) => f.name === name)?.photoUrl));

    useEffect(() => {
        let active = true;
        setPosts(null);
        if (id) void repo.loadGroupPosts(id).then((p) => active && setPosts(p)).catch(() => active && setPosts([]));
        return () => {
            active = false;
        };
    }, [id, repo]);

    if (!group) {
        return (
            <Screen header={<Header />}>
                <EmptyState title="Group not found" action={<Button size="md" variant="outline" onPress={() => router.replace("/groups")}>All groups</Button>} />
            </Screen>
        );
    }

    const post = async () => {
        const body = draft.trim();
        if (!body) return;
        setBusy(true);
        try {
            const p = await repo.postToGroup(group.id, body);
            setPosts((prev) => [p, ...(prev ?? [])]);
            setDraft("");
        } catch (e) {
            toast(e instanceof Error ? e.message : "Couldn't post", "danger");
        }
        setBusy(false);
    };
    const uri = mediaUrl(group.imageUrl, MEDIA_BASE);

    return (
        <Screen header={<Header title="Group" />}>
            {uri && <Image source={{ uri }} style={{ height: 140, width: "100%", borderRadius: 20, marginBottom: 18 }} contentFit="cover" transition={200} />}
            <Tag tone={group.categoryId} icon>
                {CATEGORY_LABEL[group.categoryId]}
            </Tag>
            <Txt role="title" style={{ marginTop: 10 }}>
                {group.name}
            </Txt>
            <Txt role="small" style={{ marginTop: 4 }}>
                {group.blurb}
            </Txt>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, marginBottom: 16 }}>
                <Users size={13} color={c.caption} />
                <Txt role="caption" style={{ flex: 1 }}>
                    {(group.members + (joined ? 1 : 0)).toLocaleString()} members
                </Txt>
                <Button variant={joined ? "tonal" : "brand"} size="md" onPress={() => void mutate((r) => r.joinGroup(group.id)).then(() => toast(joined ? "Left the group" : "Welcome in", joined ? "default" : "success"))}>
                    {joined ? "Leave group" : "Join group"}
                </Button>
            </View>

            <View style={{ gap: 12 }}>
                {joined ? (
                    <Card style={{ gap: 10 }}>
                        <View style={{ flexDirection: "row", gap: 12 }}>
                            <Avatar name={user.profile.name} hue={user.profile.hue} src={user.profile.photoUrl} size="md" />
                            <TextInput accessibilityLabel="New post" value={draft} onChangeText={setDraft} multiline placeholder="Share what you built, or what you're stuck on…" placeholderTextColor={c.caption} style={{ flex: 1, minHeight: 72, textAlignVertical: "top", borderWidth: 1, borderColor: c.lineStrong, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, fontFamily: font.regular, fontSize: 14, color: c.ink }} />
                        </View>
                        <Button size="md" loading={busy} disabled={!draft.trim()} icon={<Send size={14} color={c.white} />} onPress={() => void post()} style={{ alignSelf: "flex-end" }}>
                            Post
                        </Button>
                    </Card>
                ) : (
                    <Inset style={{ backgroundColor: c.brandSoft }}>
                        <Txt role="small" color={c.brandInk}>
                            Join the group to post. You can read along either way.
                        </Txt>
                    </Inset>
                )}
                {posts === null ? (
                    <>
                        <Skeleton h={96} />
                        <Skeleton h={96} />
                    </>
                ) : posts.length === 0 ? (
                    <EmptyState title="No posts yet" body="Be the first to say hello." />
                ) : (
                    posts.map((p) => (
                        <Card key={p.id}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                                <Avatar name={p.authorName} hue={p.authorHue} src={p.authorPhotoUrl ?? photoByName(p.authorName)} size="sm" />
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                        <Txt weight="medium" size={14} lineHeight={18}>
                                            {p.authorName}
                                        </Txt>
                                        {p.mine && (
                                            <View style={{ backgroundColor: c.brandSoft, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                                                <Txt weight="semibold" size={10} lineHeight={12} color={c.brandInk}>
                                                    YOU
                                                </Txt>
                                            </View>
                                        )}
                                    </View>
                                    <Txt role="caption">{relative(p.createdAt)}</Txt>
                                </View>
                            </View>
                            <Txt size={14} lineHeight={22} style={{ marginTop: 12 }}>
                                {p.body}
                            </Txt>
                        </Card>
                    ))
                )}
                <Card>
                    <Txt role="h3" style={{ marginBottom: 8 }}>
                        Ground rules
                    </Txt>
                    <View style={{ gap: 6 }}>
                        <Txt role="small">• Be specific. "It doesn't work" helps nobody; a screenshot and the error do.</Txt>
                        <Txt role="small">• Critique the work, never the person.</Txt>
                        <Txt role="small">• Say thanks when something unblocks you — it's how people know to keep answering.</Txt>
                    </View>
                </Card>
            </View>
        </Screen>
    );
}
