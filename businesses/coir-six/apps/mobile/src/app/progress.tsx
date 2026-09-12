import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Award, Flame, Target, Timer, TrendingUp } from "lucide-react-native";
import { categoryWatched, courseProgress, dailyMinutes, duration, goalPct, lessonsCompleted, longDate, minutesThisWeek, streak, studiedToday, totalMinutes } from "@coir-six/core";
import { useTheme } from "@/lib/theme";
import { useData } from "@/state/data";
import { ActivityStrip, BarChart, Ring } from "@/components/ui/charts";
import { Avatar, Badge, Card, ProgressBar } from "@/components/ui/primitives";
import { Txt } from "@/components/ui/text";
import { CATEGORY_LABEL } from "@/components/ui/icons";
import { Header, PageTitle, Screen } from "@/components/shell/Screen";

/** Progress in full: goal, streak, time, every course, every certificate. */
export default function ProgressScreen() {
    const { catalogue, user } = useData();
    const { c } = useTheme();
    const router = useRouter();
    const pct = goalPct(user);
    const days = streak(user);
    const week = minutesThisWeek(user);
    const week14 = dailyMinutes(user, 14);
    const last7 = dailyMinutes(user, 7).map((d, i, a) => ({ ...d, today: i === a.length - 1 }));
    const watched = categoryWatched(catalogue, user);
    const enrolled = user.enrollments.map((e) => ({ e, x: catalogue.courses.find((k) => k.id === e.courseId)! })).filter((y) => y.x);

    const Tile = ({ icon, value, label, bg }: { icon: React.ReactNode; value: string; label: string; bg: string }) => (
        <Card style={{ flexDirection: "row", alignItems: "center", gap: 12, flexBasis: "47%", flexGrow: 1 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>{icon}</View>
            <View>
                <Txt weight="semibold" size={20} lineHeight={24}>
                    {value}
                </Txt>
                <Txt role="caption">{label}</Txt>
            </View>
        </Card>
    );

    return (
        <Screen header={<Header title="Progress" />}>
            <PageTitle title="Progress" sub="Effort made visible. This is the momentum the dashboard hints at." />
            <Card style={{ alignItems: "center", marginBottom: 16 }}>
                <Ring pct={pct} label={`${pct}% of your weekly goal`}>
                    <Avatar name={user.profile.name} hue={user.profile.hue} src={user.profile.photoUrl} size="xl" />
                    <Badge style={{ position: "absolute", right: 2, top: 2 }}>{`${pct}%`}</Badge>
                </Ring>
                <Txt role="h2" style={{ marginTop: 16 }}>
                    Weekly goal
                </Txt>
                <Txt role="small" style={{ marginTop: 4 }}>
                    {duration(week * 60)} of {duration(user.profile.weeklyGoalMin * 60)}
                </Txt>
                <Pressable accessibilityRole="link" onPress={() => router.push("/settings")} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 }}>
                    <Target size={13} color={c.brand} />
                    <Txt weight="semibold" size={13} lineHeight={16} color={c.brand}>
                        Change goal
                    </Txt>
                </Pressable>
            </Card>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                <Tile icon={<Flame size={20} color={c.peach} />} value={`${days}`} label="day streak" bg={c.peachSoft} />
                <Tile icon={<Timer size={20} color={c.brand} />} value={duration(week * 60)} label="this week" bg={c.brandSoft} />
                <Tile icon={<TrendingUp size={20} color={c.mint} />} value={`${lessonsCompleted(user)}`} label="lessons done" bg={c.mintSoft} />
                <Tile icon={<Award size={20} color={c.fe} />} value={`${user.certificates.length}`} label="certificates" bg={c.feSoft} />
            </View>

            <Card style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
                    <Txt role="h2">Last two weeks</Txt>
                    <Txt role="caption">{duration(totalMinutes(user) * 60)} all time</Txt>
                </View>
                <BarChart data={week14.map((d) => ({ label: d.label, value: d.minutes, hi: d.minutes >= 30 }))} />
                <Txt role="small" style={{ marginTop: 12 }}>
                    {studiedToday(user) ? "You've studied today — the streak is safe." : days > 0 ? "Nothing yet today. Ten minutes keeps the streak." : "Start a lesson to begin a streak."}
                </Txt>
            </Card>

            <Card style={{ marginBottom: 16 }}>
                <Txt role="h3" style={{ marginBottom: 12 }}>
                    This week
                </Txt>
                <ActivityStrip days={last7} />
            </Card>

            <Card style={{ marginBottom: 16, gap: 14 }}>
                <Txt role="h2">By category</Txt>
                {(["fe", "ux", "br"] as const).map((k) => {
                    const w = watched[k];
                    const p = w.total ? Math.round((w.done / w.total) * 100) : 0;
                    return (
                        <View key={k} style={{ gap: 6 }}>
                            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                                <Txt weight="medium" size={14} lineHeight={18}>
                                    {CATEGORY_LABEL[k]}
                                </Txt>
                                <Txt role="small">
                                    {w.done}/{w.total} watched
                                </Txt>
                            </View>
                            <ProgressBar value={p} />
                        </View>
                    );
                })}
            </Card>

            <Card style={{ marginBottom: 16 }}>
                <Txt role="h2" style={{ marginBottom: 6 }}>
                    Your courses
                </Txt>
                {enrolled.length === 0 ? (
                    <Txt role="small">
                        Nothing enrolled yet.{" "}
                        <Txt role="small" weight="semibold" color={c.brand} onPress={() => router.push("/courses")}>
                            Browse courses
                        </Txt>
                    </Txt>
                ) : (
                    enrolled.map(({ e, x }, i) => {
                        const p = courseProgress(catalogue, user, x.id);
                        const cert = user.certificates.find((y) => y.courseId === x.id);
                        return (
                            <View key={x.id} style={{ paddingVertical: 12, borderBottomWidth: i === enrolled.length - 1 ? 0 : 1, borderBottomColor: c.line, gap: 6 }}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                                    <Pressable accessibilityRole="link" onPress={() => router.push(`/courses/${x.slug}`)} style={{ flex: 1 }}>
                                        <Txt weight="medium" size={14} lineHeight={18} numberOfLines={1}>
                                            {x.title}
                                        </Txt>
                                    </Pressable>
                                    {e.completedAt ? <Badge>Complete</Badge> : <Txt role="caption">{p.pct}%</Txt>}
                                </View>
                                <ProgressBar value={p.pct} />
                                <Txt role="caption">
                                    Enrolled {longDate(e.enrolledAt)}
                                    {cert && (
                                        <Txt role="caption" weight="semibold" color={c.brand} onPress={() => router.push(`/certificates/${cert.id}`)}>
                                            {"  ·  Certificate"}
                                        </Txt>
                                    )}
                                </Txt>
                            </View>
                        );
                    })
                )}
            </Card>

            <Card>
                <Txt role="h3" style={{ marginBottom: 8 }}>
                    Certificates
                </Txt>
                {user.certificates.length === 0 ? (
                    <Txt role="small">Finish every lesson in a course to earn one.</Txt>
                ) : (
                    <View style={{ gap: 8 }}>
                        {user.certificates.map((ct) => (
                            <Pressable key={ct.id} accessibilityRole="link" onPress={() => router.push(`/certificates/${ct.id}`)} style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: c.page, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
                                <Award size={14} color={c.brand} />
                                <Txt weight="medium" size={13} lineHeight={17} numberOfLines={1} style={{ flex: 1 }}>
                                    {catalogue.courses.find((x) => x.id === ct.courseId)?.title}
                                </Txt>
                            </Pressable>
                        ))}
                    </View>
                )}
            </Card>
        </Screen>
    );
}
