import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, FileText, HelpCircle, Play } from "lucide-react";
import { cn } from "@/lib/cn";
import { duration } from "@/lib/format";
import { courseBySlug, courseProgress, isDone, isEnrolled, lessonsOf } from "@/lib/derive";
import { useData } from "@/state/data";
import { useToast } from "@/state/toast";
import { NotesPanel } from "@/components/player/NotesPanel";
import { Quiz } from "@/components/player/Quiz";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { YouTubePlayer, youtubeId, youtubeThumb } from "@/components/player/YouTubePlayer";
import { Button, EmptyState, ProgressBar, Tag } from "@/components/ui/primitives";
import { CategoryIcon, CATEGORY_LABEL } from "@/components/ui/icons";

/**
 * The lesson screen: player (video, article or quiz), curriculum, notes.
 *
 * Study time is measured, not assumed: video counts only while it is actually
 * playing, an article counts while the tab is visible, and the total is
 * written when the learner leaves. Progress saves every few seconds and the
 * lesson completes itself at 90% — nobody has to remember to press a button,
 * but the button is there.
 */
export default function LessonPage() {
    const { slug, lessonId } = useParams();
    const { catalogue, user, mutate, repo } = useData();
    const { toast } = useToast();
    const navigate = useNavigate();

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

    // Study time: a tick per second of playback (video) or visible reading
    // (article/quiz). Flushed in whole minutes when the lesson changes or
    // the page goes away — so a closed tab still gets credit.
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
        let timer: number | undefined;
        if (lesson && lesson.kind !== "video") {
            timer = window.setInterval(() => {
                if (document.visibilityState === "visible") seconds.current += 1;
            }, 1000);
        }
        const onHide = () => {
            if (document.visibilityState === "hidden") flush();
        };
        document.addEventListener("visibilitychange", onHide);
        window.addEventListener("pagehide", flush);
        return () => {
            if (timer) window.clearInterval(timer);
            document.removeEventListener("visibilitychange", onHide);
            window.removeEventListener("pagehide", flush);
            flush();
            // Leftover seconds under a minute still count.
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
            const done = dur > 0 && pos / dur >= 0.9;
            void repo.saveProgress(lesson.id, pos, done);
        },
        [repo, lesson],
    );

    const onVideoEnded = useCallback(() => {
        if (!lesson) return;
        void mutate((r) => r.saveProgress(lesson.id, 0, true)).then(() => toast(next ? "Done — next lesson is ready" : "Course complete!", "success"));
    }, [lesson, next, mutate, toast]);

    const complete = async () => {
        if (!lesson) return;
        await mutate((r) => r.saveProgress(lesson.id, 0, true));
        toast("Lesson complete", "success");
        if (next) navigate(`/learn/${course!.slug}/${next.id}`);
    };

    if (!course || !lesson) return <EmptyState title="Lesson not found" action={<Link to="/courses" className="font-semibold text-brand underline">Back to courses</Link>} />;

    const progress = courseProgress(catalogue, user, course.id);
    const done = isDone(user, lesson.id);
    const saved = user.progress.find((p) => p.lessonId === lesson.id);
    const notes = user.notes.filter((n) => n.lessonId === lesson.id);
    const questions = catalogue.quiz.filter((q) => q.lessonId === lesson.id);
    const lastAttempt = user.attempts.find((a) => a.lessonId === lesson.id);
    const startAt = saved?.completedAt ? 0 : (saved?.positionSec ?? 0);
    const yt = lesson.videoUrl ? youtubeId(lesson.videoUrl) : null;

    return (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0">
                <Link to={`/courses/${course.slug}`} className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
                    <ArrowLeft size={14} /> {course.title}
                </Link>

                {lesson.kind === "video" && yt ? (
                    <YouTubePlayer key={lesson.id} videoId={yt} title={lesson.title} source={lesson.source} startAt={startAt} onProgress={saveProgress} onEnded={onVideoEnded} onPlayingSecond={onTick} />
                ) : lesson.kind === "video" && lesson.videoUrl ? (
                    <VideoPlayer key={lesson.id} src={lesson.videoUrl} captions={lesson.captionsUrl} title={lesson.title} startAt={startAt} onProgress={saveProgress} onEnded={onVideoEnded} onPlayingSecond={onTick} />
                ) : lesson.kind === "article" ? (
                    <article className="rounded-xl bg-card p-6 max-md:p-5">
                        <div className="mb-4 flex items-center gap-2 text-[12px] text-caption">
                            <FileText size={14} /> Reading · {duration(lesson.durationSec)}
                        </div>
                        {lesson.body.split(/\n{2,}/).map((p, i) => (
                            <p key={i} className="mb-4 max-w-[68ch] text-[16px] leading-7 text-ink last:mb-0">{p}</p>
                        ))}
                    </article>
                ) : (
                    <div className="rounded-xl bg-page p-1">
                        <div className="mb-3 flex items-center gap-2 px-4 pt-3 text-[12px] text-caption">
                            <HelpCircle size={14} /> Module check · {questions.length} questions
                        </div>
                        <Quiz key={lesson.id} questions={questions} lastScore={lastAttempt} onSubmit={(score, total) => mutate((r) => r.submitQuiz(lesson.id, score, total))} />
                    </div>
                )}

                <div className="mt-5 flex flex-wrap items-start gap-3">
                    <div className="min-w-0 flex-1">
                        <Tag tone={course.categoryId} icon={<CategoryIcon id={course.categoryId} />}>{CATEGORY_LABEL[course.categoryId]}</Tag>
                        <h1 className="mt-2 text-[22px] font-semibold leading-7">{lesson.title}</h1>
                        {lesson.kind === "video" && <p className="mt-2 max-w-2xl text-[14px] leading-6 text-muted">{lesson.body}</p>}
                    </div>
                    {lesson.kind !== "quiz" && (
                        <Button variant={done ? "tonal" : "brand"} size="md" onClick={() => void complete()} disabled={done}>
                            <Check size={14} strokeWidth={2.5} /> {done ? "Completed" : "Mark complete"}
                        </Button>
                    )}
                </div>

                <nav className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-4" aria-label="Lesson navigation">
                    {prev ? (
                        <Link to={`/learn/${course.slug}/${prev.id}`} className="flex min-w-0 items-center gap-2 text-[13px] font-medium text-muted hover:text-ink">
                            <ChevronLeft size={16} /> <span className="truncate">{prev.title}</span>
                        </Link>
                    ) : (
                        <span />
                    )}
                    {next ? (
                        <Link to={`/learn/${course.slug}/${next.id}`} className="flex min-w-0 items-center gap-2 text-[13px] font-semibold text-brand">
                            <span className="truncate">{next.title}</span> <ChevronRight size={16} />
                        </Link>
                    ) : (
                        <Link to={`/courses/${course.slug}`} className="text-[13px] font-semibold text-brand">
                            Back to course
                        </Link>
                    )}
                </nav>
            </div>

            <aside className="min-w-0">
                <div className="sticky top-6 rounded-xl bg-card p-4">
                    <div className="mb-3">
                        <div className="text-[12px] text-muted">
                            {progress.done}/{progress.total} lessons · {progress.pct}%
                        </div>
                        <ProgressBar value={progress.pct} className="mt-1.5" />
                    </div>
                    <div className="mb-3 grid grid-cols-2 rounded-sm bg-page p-1 text-[13px] font-semibold" role="tablist">
                        {(["curriculum", "notes"] as const).map((t) => (
                            <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)} className={cn("rounded-[9px] py-1.5 capitalize", tab === t ? "bg-card text-ink shadow-hover" : "text-muted")}>
                                {t} {t === "notes" && notes.length ? `(${notes.length})` : ""}
                            </button>
                        ))}
                    </div>
                    {tab === "curriculum" ? (
                        <ol className="max-h-[60vh] overflow-y-auto">
                            {lessons.map((l, i) => {
                                const d = isDone(user, l.id);
                                const cur = l.id === lesson.id;
                                const thumb = l.kind === "video" && l.videoUrl ? youtubeId(l.videoUrl) : null;
                                return (
                                    <li key={l.id}>
                                        <Link to={`/learn/${course.slug}/${l.id}`} aria-current={cur ? "page" : undefined} className={cn("flex items-center gap-3 rounded-md px-2 py-2 text-[13px]", cur ? "bg-brand-soft font-semibold text-brand-ink" : "hover:bg-page")}>
                                            {thumb ? (
                                                <span className="relative h-9 w-16 shrink-0 overflow-hidden rounded-[6px] bg-line">
                                                    <img src={youtubeThumb(thumb)} alt="" width={64} height={36} loading="lazy" className="size-full object-cover" />
                                                    {d && <span className="absolute inset-0 grid place-items-center bg-mint/70 text-white"><Check size={14} strokeWidth={3} /></span>}
                                                </span>
                                            ) : (
                                                <span className={cn("grid size-6 shrink-0 place-items-center rounded-full text-[11px]", d ? "bg-mint-soft text-mint" : cur ? "bg-brand text-white" : "bg-page text-muted")}>{d ? <Check size={12} strokeWidth={3} /> : l.kind === "video" ? <Play size={10} /> : i + 1}</span>
                                            )}
                                            <span className="min-w-0 flex-1 truncate">{l.title}</span>
                                            <span className="text-[11px] text-caption">{l.kind === "quiz" ? "quiz" : duration(l.durationSec)}</span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ol>
                    ) : (
                        <NotesPanel notes={notes} currentSec={lesson.kind === "video" ? videoSec : null} onAdd={(body, at) => mutate((r) => r.addNote(lesson.id, body, at))} onDelete={(id) => mutate((r) => r.deleteNote(id))} />
                    )}
                </div>
            </aside>
        </div>
    );
}
