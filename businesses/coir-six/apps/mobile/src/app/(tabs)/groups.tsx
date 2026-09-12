import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { Users } from "lucide-react-native";
import { mediaUrl, type Group } from "@coir-six/core";
import { MEDIA_BASE } from "@/lib/env";
import { useTheme } from "@/lib/theme";
import { useData } from "@/state/data";
import { useToast } from "@/state/toast";
import { Button, Card, EmptyState, Tag } from "@/components/ui/primitives";
import { Txt } from "@/components/ui/text";
import { CATEGORY_LABEL } from "@/components/ui/icons";
import { HomeBar, PageTitle, Screen } from "@/components/shell/Screen";

/** Study groups: the social layer that keeps self-paced learning from feeling solitary. */
export default function GroupsScreen() {
    const { catalogue, user, mutate } = useData();
    const { toast } = useToast();
    const { c } = useTheme();
    const router = useRouter();
    const mine = catalogue.groups.filter((g) => user.groupIds.includes(g.id));
    const others = catalogue.groups.filter((g) => !user.groupIds.includes(g.id));

    const GroupCard = ({ g }: { g: Group }) => {
        const joined = user.groupIds.includes(g.id);
        const uri = mediaUrl(g.imageUrl, MEDIA_BASE);
        return (
            <Card padded={false}>
                <Pressable accessibilityRole="button" accessibilityLabel={g.name} onPress={() => router.push(`/groups/${g.id}`)}>
                    {uri && <Image source={{ uri }} style={{ height: 128, width: "100%" }} contentFit="cover" transition={200} />}
                    <View style={{ padding: 16, gap: 10 }}>
                        <Tag tone={g.categoryId} icon>
                            {CATEGORY_LABEL[g.categoryId]}
                        </Tag>
                        <Txt weight="semibold" size={16} lineHeight={21}>
                            {g.name}
                        </Txt>
                        <Txt role="small">{g.blurb}</Txt>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                            <Users size={13} color={c.muted} />
                            <Txt role="caption" style={{ flex: 1 }}>
                                {(g.members + (joined ? 1 : 0)).toLocaleString()} members
                            </Txt>
                            <Button variant={joined ? "tonal" : "outline"} size="md" style={{ borderRadius: 999 }} onPress={() => void mutate((r) => r.joinGroup(g.id)).then(() => toast(joined ? `Left ${g.name}` : `Joined ${g.name}`, joined ? "default" : "success"))}>
                                {joined ? "Joined" : "Join"}
                            </Button>
                        </View>
                    </View>
                </Pressable>
            </Card>
        );
    };

    return (
        <Screen header={<HomeBar />} tabbed>
            <PageTitle title="Groups" sub="Study with people on the same path. Post what you built, ask what you're stuck on." />
            {mine.length > 0 && (
                <>
                    <Txt role="h2" style={{ marginBottom: 12 }}>
                        Your groups
                    </Txt>
                    <View style={{ gap: 16, marginBottom: 32 }}>
                        {mine.map((g) => (
                            <GroupCard key={g.id} g={g} />
                        ))}
                    </View>
                </>
            )}
            <Txt role="h2" style={{ marginBottom: 12 }}>
                {mine.length ? "Discover" : "All groups"}
            </Txt>
            {others.length ? (
                <View style={{ gap: 16 }}>
                    {others.map((g) => (
                        <GroupCard key={g.id} g={g} />
                    ))}
                </View>
            ) : (
                <EmptyState title="You're in every group" body="That's dedication." />
            )}
        </Screen>
    );
}
