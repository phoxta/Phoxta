import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { Check, ChevronLeft, ChevronRight, FileText, HelpCircle, Play } from "lucide-react-native";
import { courseBySlug, courseProgress, duration, isDone, isEnrolled, lessonsOf, youtubeId, youtubeThumb } from "@coir-six/core";
import { useTheme } from "@/lib/theme";
import { useData } from "@/state/data";
import { useToast } from "@/state/toast";
import { NotesPanel } from "@/components/player/NotesPanel";
import { Quiz } from "@/components/player/Quiz";
import { YouTubePlayer } from "@/components/player/YouTubePlayer";
import { Button, Card, EmptyState, ProgressBar, Tag } from "@/components/ui/primitives";
import { Txt } from "@/components/ui/text";
import { CATEGORY_LABEL } from "@/components/ui/icons";
import { Header, Screen } from "@/components/shell/Screen";

/**
 * The lesson screen: player (video, article or quiz), then the curriculum and
 * notes. Study time is measured, not assumed: video counts only while it is
 * playing, an article counts while the app is in the foreground, and the total
 * is written when the learner leaves. Progress saves every few seconds and the
 * lesson completes itself at 90% — nobody has to remember to press a button,
 * but the button is there.
 */
export default function LessonScreen() {
    const { slug, lessonId } = useLocalSearchParams<{ slug: string; lessonId: string }>();
    const { catalogue, user, mutate, repo } = useData();
    const { toast } = useToast();
    const { c } = useTheme();
    const router = useRouter();

    const course = courseBySlug(catalogue, slug);
    const lessons = useMemo(() => (course ? lessonsOf(catalogue, course.id) : []), [catalogue, course]);
    const index = lessons.findIndex((l) => l.id === lessonId);
    const lesson = lessons[index];
    const prev = lessons[index - 1];
    const next = lessons[index + 1];
    const [tab, setTab] = useState<"curriculum" | "notes">("curriculum");
    const [videoSec, setVideoSec] = useState<number | null>(null);
    const seconds = useRef(0);
    const flushed = useRef(0);
    const enrolled = course ? isEnrolled(user, course.id) : false;

    // Enrol on first open — arriving here from a link is intent enough.
    useEffect(() => {
        if (course && !enrolled) void mutate((r) => r.enroll(course.id));
    }, [course, enrolled, mutate]);

    const flush = useCallback(() => {
        const mins = Math.floor((seconds.current - flushed.current) / 60);
        if (mins >= 1 && lesson) {
            flushed.current += mins * 60;
            void repo.logStudy(lesson.id, mins);
        }
    }, [repo, lesson]);

    useEffect(() => {
        seconds.current = 0;
        flushed.current = 0;
        let timer: ReturnType<typeof setInterval> | undefined;
        if (lesson && lesson.kind !== "video") {
            timer = setInterval(() => {
                if (AppState.currentState === "active") seconds.current += 1;
            }, 1000);
        }
        const sub = AppState.addEventListener("change", (s) => {
            if (s !== "active") flush();
        });
        return () => {
            if (timer) clearInterval(timer);
            sub.remove();
            flush();
            const rem = seconds.current - flushed.current;
            if (rem >= 20 && lesson) void repo.logStudy(lesson.id, 1);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lesson?.id]);

    const onTick = useCallback(() => {
        seconds.current += 1;
    }, []);
    const saveProgress = useCallback(
        (pos: number, dur: number) => {
            if (!lesson) return;
            setVideoSec(pos);
            void repo.saveProgress(lesson.id, pos, dur > 0 && pos / dur >= 0.9);
        },
        [repo, lesson],
    );
    const onVideoEnded = useCallback(() => {
        if (!lesson) return;
        void mutate((r) => r.saveProgress(lesson.id, 0, true)).then(() => toast(next ? "Done — next lesson is ready" : "Course complete!", "success"));
    }, [lesson, next, mutate, toast]);

    if (!course || !lesson) {
        return (
            <Screen header={<Header />}>
                <EmptyState title="Lesson not found" action={<Button size="md" variant="outline" onPress={() => router.replace("/courses")}>Back to courses</Button>} />
            </Screen>
        );
    }

    const complete = async () => {
        await mutate((r) => r.saveProgress(lesson.id, 0, true));
        toast("Lesson complete", "success");
        if (next) router.replace(`/learn/${course.slug}/${next.id}`);
    };

    const progress = courseProgress(catalogue, user, course.id);
    const done = isDone(user, lesson.id);
    const saved = user.progress.find((p) => p.lessonId === lesson.id);
    const notes = user.notes.filter((n) => n.lessonId === lesson.id);
    const questions = catalogue.quiz.filter((q) => q.lessonId === lesson.id);
    const lastAttempt = user.attempts.find((a) => a.lessonId === lesson.id);
    const startAt = saved?.completedAt ? 0 : (saved?.positionSec ?? 0);
    const yt = lesson.videoUrl ? youtubeId(lesson.videoUrl) : null;

    return (
        <Screen header={<Header title={course.title} sub={`${progress.done}/${progress.total} lessons · ${progress.pct}%`} />}>
            {lesson.kind === "video" && yt ? (
                <YouTubePlayer key={lesson.id} videoId={yt} title={lesson.title} source={lesson.source} startAt={startAt} onProgress={saveProgress} onEnded={onVideoEnded} onPlayingSecond={onTick} />
            ) : lesson.kind === "article" ? (
                <Card>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
                        <FileText size={14} color={c.caption} />
                        <Txt role="caption">Reading · {duration(lesson.durationSec)}</Txt>
                    </View>
                    {lesson.body.split(/\n{2,}/).map((p, i) => (
                        <Txt key={i} size={16} lineHeight={26} style={{ marginBottom: 14 }}>
                            {p}
                        </Txt>
                    ))}
                </Card>
            ) : (
                <View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
                        <HelpCircle size={14} color={c.caption} />
                        <Txt role="caption">Module check · {questions.length} questions</Txt>
                    </View>
                    <Quiz key={lesson.id} questions={questions} lastScore={lastAttempt} onSubmit={(score, total) => mutate((r) => r.submitQuiz(lesson.id, score, total))} />
                </View>
            )}

            <View style={{ marginTop: 20, gap: 10 }}>
                <Tag tone={course.categoryId} icon>
                    {CATEGORY_LABEL[course.categoryId]}
                </Tag>
                <Txt role="title">{lesson.title}</Txt>
                {lesson.kind === "video" && (
                    <Txt size={14} lineHeight={22} color={c.muted}>
                        {lesson.body}
                    </Txt>
                )}
                {lesson.kind !== "quiz" && (
                    <Button variant={done ? "tonal" : "brand"} size="md" disabled={done} icon={<Check size={14} color={done ? c.brandInk : c.white} strokeWidth={2.5} />} onPress={() => void complete()}>
                        {done ? "Completed" : "Mark complete"}
                    </Button>
                )}
            </View>

            <View style={{ marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: c.line, flexDirection: "row", alignItems: "center", gap: 12 }}>
                {prev ? (
                    <Pressable accessibilityRole="link" onPress={() => router.replace(`/learn/${course.slug}/${prev.id}`)} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <ChevronLeft size={16} color={c.muted} />
                        <Txt weight="medium" size={13} lineHeight={17} color={c.muted} numberOfLines={1} style={{ flex: 1 }}>
                            {prev.title}
                        </Txt>
                    </Pressable>
                ) : (
                    <View style={{ flex: 1 }} />
                )}
                {next ? (
                    <Pressable accessibilityRole="link" onPress={() => router.replace(`/learn/${course.slug}/${next.id}`)} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                        <Txt weight="semibold" size={13} lineHeight={17} color={c.brand} numberOfLines={1} style={{ flexShrink: 1 }}>
                            {next.title}
                        </Txt>
                        <ChevronRight size={16} color={c.brand} />
                    </Pressable>
                ) : (
                    <Pressable accessibilityRole="link" onPress={() => router.replace(`/courses/${course.slug}`)}>
                        <Txt weight="semibold" size={13} lineHeight={17} color={c.brand}>
                            Back to course
                        </Txt>
                    </Pressable>
                )}
            </View>

            <Card style={{ marginTop: 24 }}>
                <ProgressBar value={progress.pct} style={{ marginBottom: 14 }} />
                <View style={{ flexDirection: "row", backgroundColor: c.page, borderRadius: 12, padding: 4, marginBottom: 12 }} accessibilityRole="tablist">
                    {(["curriculum", "notes"] as const).map((t) => (
                        <Pressable key={t} accessibilityRole="tab" accessibilityState={{ selected: tab === t }} onPress={() => setTab(t)} style={{ flex: 1, paddingVertical: 7, borderRadius: 9, alignItems: "center", backgroundColor: tab === t ? c.card : "transparent" }}>
                            <Txt weight="semibold" size={13} lineHeight={16} color={tab === t ? c.ink : c.muted}>
                                {t === "curriculum" ? "Curriculum" : `Notes${notes.length ? ` (${notes.length})` : ""}`}
                            </Txt>
                        </Pressable>
                    ))}
                </View>
                {tab === "curriculum" ? (
                    <View>
                        {lessons.map((l, i) => {
                            const d = isDone(user, l.id);
                            const cur = l.id === lesson.id;
                            const thumb = l.kind === "video" && l.videoUrl ? youtubeId(l.videoUrl) : null;
                            return (
                                <Pressable key={l.id} accessibilityRole="button" accessibilityState={{ selected: cur }} onPress={() => router.replace(`/learn/${course.slug}/${l.id}`)} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 8, paddingVertical: 8, borderRadius: 12, backgroundColor: cur ? c.brandSoft : "transparent" }}>
                                    {thumb ? (
                                        <View style={{ width: 64, height: 36, borderRadius: 6, overflow: "hidden", backgroundColor: c.line }}>
                                            <Image source={{ uri: youtubeThumb(thumb) }} style={{ width: 64, height: 36 }} contentFit="cover" />
                                            {d && (
                                                <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(43,138,97,0.7)", alignItems: "center", justifyContent: "center" }}>
                                                    <Check size={14} color={c.white} strokeWidth={3} />
                                                </View>
                                            )}
                                        </View>
                                    ) : (
                                        <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: d ? c.mintSoft : cur ? c.brand : c.page }}>
                                            {d ? <Check size={12} color={c.mint} strokeWidth={3} /> : l.kind === "video" ? <Play size={10} color={cur ? c.white : c.muted} /> : <Txt size={11} lineHeight={13} color={cur ? c.white : c.muted}>{i + 1}</Txt>}
                                        </View>
                                    )}
                                    <Txt size={13} lineHeight={17} weight={cur ? "semibold" : "regular"} color={cur ? c.brandInk : c.ink} numberOfLines={1} style={{ flex: 1 }}>
                                        {l.title}
                                    </Txt>
                                    <Txt role="caption" size={11} lineHeight={13}>
                                        {l.kind === "quiz" ? "quiz" : duration(l.durationSec)}
                                    </Txt>
                                </Pressable>
                            );
                        })}
                    </View>
                ) : (
                    <NotesPanel notes={notes} currentSec={lesson.kind === "video" ? videoSec : null} onAdd={(body, at) => mutate((r) => r.addNote(lesson.id, body, at))} onDelete={(nid) => mutate((r) => r.deleteNote(nid))} />
                )}
            </Card>
        </Screen>
    );
}
