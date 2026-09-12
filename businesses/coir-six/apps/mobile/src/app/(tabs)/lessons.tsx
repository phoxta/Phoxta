import { Linking, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Calendar, ExternalLink, Video } from "lucide-react-native";
import { longDate, pastLive, time, upcomingLive, type LiveLesson } from "@coir-six/core";
import { useTheme } from "@/lib/theme";
import { useData } from "@/state/data";
import { useToast } from "@/state/toast";
import { Avatar, Button, Card, EmptyState, Tag } from "@/components/ui/primitives";
import { Txt } from "@/components/ui/text";
import { CATEGORY_LABEL } from "@/components/ui/icons";
import { HomeBar, PageTitle, Screen } from "@/components/shell/Screen";

/** "Lesson": mentor-led live sessions — reserve a seat, join when it's on, watch it back after. */
export default function LessonsScreen() {
    const { catalogue, user, mutate } = useData();
    const { toast } = useToast();
    const { c } = useTheme();
    const { focus } = useLocalSearchParams<{ focus?: string }>();
    const upcoming = upcomingLive(catalogue);
    const past = pastLive(catalogue);

    const isLive = (l: LiveLesson) => {
        const s = new Date(l.startsAt).getTime();
        const now = Date.now();
        return now >= s - 10 * 60000 && now <= s + l.durationMin * 60000;
    };

    const Row = ({ l, recorded }: { l: LiveLesson; recorded?: boolean }) => {
        const mentor = catalogue.mentors.find((m) => m.id === l.mentorId);
        const on = user.rsvps.includes(l.id);
        const live = isLive(l);
        const focused = focus === l.id;
        return (
            <Card style={{ gap: 12, borderWidth: live || focused ? 2 : 0, borderColor: c.brand }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    {mentor && <Avatar name={mentor.name} hue={mentor.hue} src={mentor.photoUrl} size="md" />}
                    <View style={{ flex: 1, minWidth: 0 }}>
                        <Txt weight="medium" size={14} lineHeight={18} numberOfLines={1}>
                            {mentor?.name}
                        </Txt>
                        <Txt role="caption">
                            {longDate(l.startsAt)} · {time(l.startsAt)} · {l.durationMin} min
                        </Txt>
                    </View>
                </View>
                <Tag tone={l.categoryId} icon>
                    {CATEGORY_LABEL[l.categoryId]}
                </Tag>
                <Txt role="h3">{l.title}</Txt>
                <Txt role="small">{l.description}</Txt>
                {recorded ? (
                    l.recordingUrl ? (
                        <Button variant="outline" size="md" icon={<Video size={14} color={c.ink} />} onPress={() => void Linking.openURL(l.recordingUrl!)}>
                            Watch recording
                        </Button>
                    ) : (
                        <Button variant="outline" size="md" disabled icon={<Video size={14} color={c.ink} />}>
                            Recording soon
                        </Button>
                    )
                ) : live ? (
                    <Button size="md" icon={<ExternalLink size={13} color={c.white} />} onPress={() => void Linking.openURL(l.joinUrl)}>
                        Join now
                    </Button>
                ) : (
                    <Button variant={on ? "tonal" : "brand"} size="md" onPress={() => void mutate((r) => r.toggleRsvp(l.id)).then(() => toast(on ? "Seat released" : "Seat reserved — we'll remind you", "success"))}>
                        {on ? "Reserved" : "Reserve a seat"}
                    </Button>
                )}
            </Card>
        );
    };

    return (
        <Screen header={<HomeBar />} tabbed>
            <PageTitle title="Lessons" sub="Live sessions with your mentors. Reserve a seat, then join from here when it starts." />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Calendar size={18} color={c.ink} />
                <Txt role="h2">Upcoming</Txt>
            </View>
            {upcoming.length ? (
                <View style={{ gap: 12 }}>
                    {upcoming.map((l) => (
                        <Row key={l.id} l={l} />
                    ))}
                </View>
            ) : (
                <EmptyState title="Nothing scheduled" body="New sessions are announced in your notifications." />
            )}
            {past.length > 0 && (
                <>
                    <Txt role="h2" style={{ marginTop: 32, marginBottom: 12 }}>
                        Past sessions
                    </Txt>
                    <View style={{ gap: 12, opacity: 0.92 }}>
                        {past.map((l) => (
                            <Row key={l.id} l={l} recorded />
                        ))}
                    </View>
                </>
            )}
        </Screen>
    );
}
