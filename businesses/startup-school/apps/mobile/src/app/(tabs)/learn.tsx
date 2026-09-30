import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { ArrowRight, BookOpen, CalendarClock, Compass } from "lucide-react-native";
import { continueWatching, nextLesson, recommended, upcomingLive } from "@startup-school/core";
import { useTheme } from "@/lib/theme";
import { useData } from "@/state/data";
import { Card } from "@/components/ui/primitives";
import { Txt } from "@/components/ui/text";
import { HomeBar, PageTitle, Screen } from "@/components/shell/Screen";

function Destination({ icon, title, body, onPress }: { icon: ReactNode; title: string; body: string; onPress: () => void }) {
    const { c } = useTheme();
    return (
        <Pressable accessibilityRole="button" onPress={onPress} style={{ flexDirection: "row", gap: 14, alignItems: "flex-start", backgroundColor: c.card, borderRadius: 18, padding: 16 }}>
            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: c.brandSoft, alignItems: "center", justifyContent: "center" }}>{icon}</View>
            <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Txt weight="semibold" size={16} lineHeight={21}>{title}</Txt><ArrowRight size={15} color={c.ink} /></View>
                <Txt role="small" style={{ marginTop: 4 }}>{body}</Txt>
            </View>
        </Pressable>
    );
}

export default function LearnScreen() {
    const { catalogue, user } = useData();
    const { c } = useTheme();
    const router = useRouter();
    const courses = continueWatching(catalogue, user);
    const course = courses[0] ?? recommended(catalogue, user, 1)[0];
    const lesson = course ? nextLesson(catalogue, user, course.id) : null;
    const live = upcomingLive(catalogue)[0];
    return (
        <Screen header={<HomeBar />} tabbed>
            <PageTitle title="Learn" sub="Continue your path, explore courses, or join a live class." />
            {course && lesson && (
                <Card style={{ backgroundColor: c.brandSoft, borderColor: c.brand, marginBottom: 16 }}>
                    <Txt role="overline" color={c.brandInk}>CONTINUE YOUR JOURNEY</Txt>
                    <Txt weight="semibold" size={20} lineHeight={26} style={{ marginTop: 8 }}>{lesson.title}</Txt>
                    <Txt role="small" style={{ marginTop: 4 }}>{course.title}</Txt>
                    <Pressable accessibilityRole="button" onPress={() => router.push(`/learn/${course.slug}/${lesson.id}`)} style={{ marginTop: 16, alignSelf: "flex-start", backgroundColor: c.ink, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 }}>
                        <Txt weight="semibold" size={13} lineHeight={17} color={c.white}>Resume lesson</Txt>
                    </Pressable>
                </Card>
            )}
            <View style={{ gap: 12 }}>
                <Destination icon={<Compass size={20} color={c.brand} />} title="Course library" body="Explore every outcome-led course." onPress={() => router.push("/courses")} />
                <Destination icon={<CalendarClock size={20} color={c.brand} />} title="Live classes" body={live ? `Next: ${live.title}` : "Reserve a seat and return for recordings."} onPress={() => router.push("/lessons")} />
            </View>
        </Screen>
    );
}
