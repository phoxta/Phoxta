import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Check, UserPlus } from "lucide-react-native";
import { useTheme } from "@/lib/theme";
import { useData } from "@/state/data";
import { useToast } from "@/state/toast";
import { Avatar, Button, Card, Tag } from "@/components/ui/primitives";
import { Txt } from "@/components/ui/text";
import { CATEGORY_LABEL } from "@/components/ui/icons";
import { Header, PageTitle, Screen } from "@/components/shell/Screen";

export default function MentorsScreen() {
    const { catalogue, user, mutate } = useData();
    const { toast } = useToast();
    const { c } = useTheme();
    const router = useRouter();
    return (
        <Screen header={<Header title="Mentors" />}>
            <PageTitle title="Mentors" sub="The people behind the courses. Follow to hear when they teach live." />
            <View style={{ gap: 16 }}>
                {catalogue.mentors.map((m) => {
                    const on = user.follows.includes(m.id);
                    const courses = catalogue.courses.filter((x) => x.mentorId === m.id).length;
                    return (
                        <Card key={m.id} style={{ gap: 12 }}>
                            <Pressable accessibilityRole="button" accessibilityLabel={m.name} onPress={() => router.push(`/mentors/${m.id}`)} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                                <Avatar name={m.name} hue={m.hue} src={m.photoUrl} size="lg" />
                                <View style={{ flex: 1, minWidth: 0 }}>
                                    <Txt role="h3" numberOfLines={1}>
                                        {m.name}
                                    </Txt>
                                    <Txt role="caption">{m.role}</Txt>
                                </View>
                            </Pressable>
                            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                                {m.expertise.map((e) => (
                                    <Tag key={e} tone={e} icon>
                                        {CATEGORY_LABEL[e]}
                                    </Tag>
                                ))}
                            </View>
                            <Txt role="small" numberOfLines={3}>
                                {m.bio}
                            </Txt>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                <Txt role="caption" style={{ flex: 1 }}>
                                    {(m.followers + (on ? 1 : 0)).toLocaleString()} followers · {courses} course{courses === 1 ? "" : "s"}
                                </Txt>
                                <Button variant={on ? "tonal" : "outline"} size="md" style={{ borderRadius: 999 }} icon={on ? <Check size={12} color={c.brandInk} strokeWidth={2.5} /> : <UserPlus size={12} color={c.ink} />} onPress={() => void mutate((r) => r.toggleFollow(m.id)).then(() => toast(on ? `Unfollowed ${m.name}` : `Following ${m.name}`))}>
                                    {on ? "Following" : "Follow"}
                                </Button>
                            </View>
                        </Card>
                    );
                })}
            </View>
        </Screen>
    );
}
