import { useState } from "react";
import { Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, MessageSquare, UserPlus } from "lucide-react-native";
import { useTheme } from "@/lib/theme";
import { useData } from "@/state/data";
import { useToast } from "@/state/toast";
import { CourseCard } from "@/components/cards";
import { Avatar, Button, Card, EmptyState, Tag } from "@/components/ui/primitives";
import { Txt } from "@/components/ui/text";
import { CATEGORY_LABEL } from "@/components/ui/icons";
import { Header, Screen } from "@/components/shell/Screen";

export default function MentorScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { catalogue, user, mutate, repo, refresh } = useData();
    const { toast } = useToast();
    const { c } = useTheme();
    const router = useRouter();
    const [opening, setOpening] = useState(false);
    const m = catalogue.mentors.find((x) => x.id === id);
    if (!m) {
        return (
            <Screen header={<Header />}>
                <EmptyState title="Mentor not found" action={<Button size="md" variant="outline" onPress={() => router.replace("/mentors")}>All mentors</Button>} />
            </Screen>
        );
    }
    const on = user.follows.includes(m.id);
    const courses = catalogue.courses.filter((x) => x.mentorId === m.id);
    const live = catalogue.liveLessons.filter((l) => l.mentorId === m.id && new Date(l.startsAt).getTime() > Date.now());
    const message = async () => {
        setOpening(true);
        try {
            const conv = await repo.startConversation("mentor", m.id);
            await refresh();
            router.push(`/inbox/${conv.id}`);
        } catch (e) {
            toast(e instanceof Error ? e.message : "Couldn't open the conversation", "danger");
        }
        setOpening(false);
    };
    return (
        <Screen header={<Header title="Mentor" />}>
            <Card style={{ gap: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                    <Avatar name={m.name} hue={m.hue} src={m.photoUrl} px={80} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                        <Txt role="title" size={22} lineHeight={27}>
                            {m.name}
                        </Txt>
                        <Txt role="small">{m.role}</Txt>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                            {m.expertise.map((e) => (
                                <Tag key={e} tone={e} icon>
                                    {CATEGORY_LABEL[e]}
                                </Tag>
                            ))}
                        </View>
                    </View>
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                    <Button variant={on ? "tonal" : "outline"} icon={on ? <Check size={14} color={c.brandInk} strokeWidth={2.5} /> : <UserPlus size={14} color={c.ink} />} onPress={() => void mutate((r) => r.toggleFollow(m.id)).then(() => toast(on ? `Unfollowed ${m.name}` : `Following ${m.name}`))}>
                        {on ? "Following" : "Follow"}
                    </Button>
                    <Button icon={<MessageSquare size={14} color={c.white} />} loading={opening} onPress={() => void message()}>
                        Message
                    </Button>
                </View>
                <Txt size={14} lineHeight={22} color={c.muted}>
                    {m.bio}
                </Txt>
                <Txt role="caption">{(m.followers + (on ? 1 : 0)).toLocaleString()} followers</Txt>
            </Card>
            <Txt role="h2" style={{ marginTop: 24, marginBottom: 12 }}>
                Courses by {m.name.split(" ")[0]}
            </Txt>
            <View style={{ gap: 16 }}>
                {courses.map((x) => (
                    <CourseCard key={x.id} course={x} width="100%" />
                ))}
            </View>
            {live.length > 0 && (
                <>
                    <Txt role="h2" style={{ marginTop: 24, marginBottom: 12 }}>
                        Teaching live
                    </Txt>
                    <View style={{ gap: 8 }}>
                        {live.map((l) => (
                            <Pressable key={l.id} accessibilityRole="button" onPress={() => router.push(`/lessons?focus=${l.id}`)} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.card, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12 }}>
                                <Txt weight="medium" size={14} lineHeight={18} style={{ flex: 1 }}>
                                    {l.title}
                                </Txt>
                                <Txt role="caption">{new Date(l.startsAt).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</Txt>
                            </Pressable>
                        ))}
                    </View>
                </>
            )}
        </Screen>
    );
}
