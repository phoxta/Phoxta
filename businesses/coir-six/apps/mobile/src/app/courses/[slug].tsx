import { Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Award, Check, Clock, Heart, Lock, Star, Users } from "lucide-react-native";
import { courseBySlug, courseMinutes, courseProgress, duration, isDone, isEnrolled, lessonsOf, mentorOf, nextLesson } from "@coir-six/core";
import { useTheme } from "@/lib/theme";
import { useData } from "@/state/data";
import { useToast } from "@/state/toast";
import { LessonKindIcon } from "@/components/cards";
import { Avatar, Button, Card, Cover, EmptyState, IconButton, ProgressBar, Tag } from "@/components/ui/primitives";
import { Txt } from "@/components/ui/text";
import { CATEGORY_LABEL } from "@/components/ui/icons";
import { Header, Screen } from "@/components/shell/Screen";

/** One course: what you'll learn, the curriculum, the mentor, and the one button that matters. */
export default function CourseScreen() {
    const { slug } = useLocalSearchParams<{ slug: string }>();
    const { catalogue, user, mutate } = useData();
    const { toast } = useToast();
    const { c } = useTheme();
    const router = useRouter();
    const course = courseBySlug(catalogue, slug);
    if (!course) {
        return (
            <Screen header={<Header />}>
                <EmptyState title="Course not found" body="It may have been unpublished." action={<Button size="md" variant="outline" onPress={() => router.replace("/courses")}>Browse courses</Button>} />
            </Screen>
        );
    }
    const mentor = mentorOf(catalogue, course);
    const enrolled = isEnrolled(user, course.id);
    const progress = courseProgress(catalogue, user, course.id);
    const next = nextLesson(catalogue, user, course.id);
    const saved = user.bookmarks.includes(course.id);
    const modules = catalogue.modules.filter((m) => m.courseId === course.id).sort((a, b) => a.sort - b.sort);
    const cert = user.certificates.find((x) => x.courseId === course.id);
    const finished = enrolled && progress.total > 0 && progress.done === progress.total;

    const start = async () => {
        if (!enrolled) {
            await mutate((r) => r.enroll(course.id));
            toast("Enrolled — your place is saved as you go", "success");
        }
        const first = next ?? lessonsOf(catalogue, course.id)[0];
        if (first) router.push(`/learn/${course.slug}/${first.id}`);
    };
    const claim = async () => {
        try {
            let id = "";
            await mutate(async (r) => {
                id = (await r.issueCertificate(course.id)).id;
            });
            router.push(`/certificates/${id}`);
        } catch (e) {
            toast(e instanceof Error ? e.message : "Couldn't issue the certificate", "danger");
        }
    };

    return (
        <Screen header={<Header title={CATEGORY_LABEL[course.categoryId]} />}>
            <Cover theme={course.theme} src={course.coverUrl} height={160} radius={20} style={{ marginBottom: 18 }}>
                <IconButton label={saved ? "Remove from saved" : "Save course"} style={{ position: "absolute", right: 14, top: 14, borderWidth: 0 }} onPress={() => void mutate((r) => r.toggleBookmark(course.id)).then(() => toast(saved ? "Removed from saved" : "Saved for later"))}>
                    <Heart size={16} color={c.ink} fill={saved ? c.ink : "none"} />
                </IconButton>
            </Cover>
            <Tag tone={course.categoryId} icon>
                {CATEGORY_LABEL[course.categoryId]}
            </Tag>
            <Txt role="title" style={{ marginTop: 12 }}>
                {course.title}
            </Txt>
            <Txt size={15} lineHeight={22} color={c.muted} style={{ marginTop: 8 }}>
                {course.blurb}
            </Txt>

            <Card style={{ marginTop: 20, gap: 12 }}>
                {enrolled ? (
                    <>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
                            <Txt role="small">Your progress</Txt>
                            <Txt weight="semibold" size={16} lineHeight={20}>
                                {progress.pct}%
                            </Txt>
                        </View>
                        <ProgressBar value={progress.pct} />
                        <Txt role="caption">
                            {progress.done} of {progress.total} lessons
                        </Txt>
                    </>
                ) : (
                    <Txt size={14} lineHeight={20} color={c.muted}>
                        Free to enrol. Your progress, notes and place are saved.
                    </Txt>
                )}
                {finished ? (
                    <Button block icon={<Award size={16} color={c.white} />} onPress={() => (cert ? router.push(`/certificates/${cert.id}`) : void claim())}>
                        {cert ? "View certificate" : "Claim certificate"}
                    </Button>
                ) : (
                    <Button block onPress={() => void start()}>
                        {enrolled ? (progress.done ? "Continue" : "Start learning") : "Enrol — it's free"}
                    </Button>
                )}
                {enrolled && next && !finished && (
                    <Txt role="caption" align="center" numberOfLines={1}>
                        Next: {next.title}
                    </Txt>
                )}
                <View style={{ gap: 8, marginTop: 4 }}>
                    <Meta icon={<Clock size={14} color={c.muted} />} text={`${duration(courseMinutes(catalogue, course.id) * 60)} of content`} />
                    <Meta icon={<Users size={14} color={c.muted} />} text={`${course.learners.toLocaleString()} learners`} />
                    <Meta icon={<Star size={14} color={c.muted} />} text={`${course.rating.toFixed(1)} rating · ${course.level}`} />
                </View>
            </Card>

            <Txt role="h2" style={{ marginTop: 28, marginBottom: 12 }}>
                What you'll be able to do
            </Txt>
            <View style={{ gap: 8 }}>
                {course.outcomes.map((o) => (
                    <View key={o} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: c.card, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 }}>
                        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: c.mintSoft, alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                            <Check size={12} color={c.mint} strokeWidth={3} />
                        </View>
                        <Txt size={14} lineHeight={20} style={{ flex: 1 }}>
                            {o}
                        </Txt>
                    </View>
                ))}
            </View>

            <Txt role="h2" style={{ marginTop: 28, marginBottom: 12 }}>
                About this course
            </Txt>
            {course.description.split(/\n{2,}/).map((p, i) => (
                <Txt key={i} size={15} lineHeight={23} color={c.muted} style={{ marginBottom: 12 }}>
                    {p}
                </Txt>
            ))}

            <Txt role="h2" style={{ marginTop: 16, marginBottom: 12 }}>
                Curriculum
            </Txt>
            <View style={{ gap: 12 }}>
                {modules.map((m, mi) => {
                    const ls = catalogue.lessons.filter((l) => l.moduleId === m.id).sort((a, b) => a.sort - b.sort);
                    return (
                        <Card key={m.id}>
                            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                                <Txt role="h3" color={c.caption}>
                                    {String(mi + 1).padStart(2, "0")}
                                </Txt>
                                <Txt role="h3" style={{ flex: 1 }}>
                                    {m.title}
                                </Txt>
                                <Txt role="caption">{ls.length} lessons</Txt>
                            </View>
                            {ls.map((l, i) => {
                                const done = isDone(user, l.id);
                                return (
                                    <Pressable key={l.id} accessibilityRole="button" onPress={() => (enrolled ? router.push(`/learn/${course.slug}/${l.id}`) : void start())} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.line }}>
                                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: done ? c.mintSoft : c.page, alignItems: "center", justifyContent: "center" }}>{done ? <Check size={13} color={c.mint} strokeWidth={3} /> : <LessonKindIcon kind={l.kind} size={13} color={c.muted} />}</View>
                                        <Txt size={14} lineHeight={19} weight={done ? "regular" : "medium"} color={done ? c.muted : c.ink} numberOfLines={1} style={{ flex: 1 }}>
                                            {l.title}
                                        </Txt>
                                        <Txt role="caption">{l.kind === "quiz" ? "Quiz" : duration(l.durationSec)}</Txt>
                                        {!enrolled && <Lock size={13} color={c.caption} />}
                                    </Pressable>
                                );
                            })}
                        </Card>
                    );
                })}
            </View>

            {mentor && (
                <Card style={{ marginTop: 20 }}>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Mentor ${mentor.name}`} onPress={() => router.push(`/mentors/${mentor.id}`)} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <Avatar name={mentor.name} hue={mentor.hue} src={mentor.photoUrl} size="lg" />
                        <View style={{ flex: 1, minWidth: 0 }}>
                            <Txt role="h3" numberOfLines={1}>
                                {mentor.name}
                            </Txt>
                            <Txt role="caption">{mentor.role}</Txt>
                        </View>
                    </Pressable>
                    <Txt role="small" style={{ marginTop: 12 }}>
                        {mentor.bio}
                    </Txt>
                </Card>
            )}
        </Screen>
    );
}

function Meta({ icon, text }: { icon: React.ReactNode; text: string }) {
    return (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {icon}
            <Txt role="small">{text}</Txt>
        </View>
    );
}
