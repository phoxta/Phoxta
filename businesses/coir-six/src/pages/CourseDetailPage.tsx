import { Link, useNavigate, useParams } from "react-router-dom";
import { Award, Check, Clock, Heart, Lock, Star, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { duration } from "@/lib/format";
import { courseBySlug, courseMinutes, courseProgress, isDone, isEnrolled, lessonsOf, mentorOf, nextLesson } from "@/lib/derive";
import { useData } from "@/state/data";
import { useToast } from "@/state/toast";
import { LessonKindIcon } from "@/components/cards";
import { WithRail } from "@/components/shell/AppShell";
import { Avatar, Button, Card, Cover, EmptyState, IconButton, ProgressBar, Tag } from "@/components/ui/primitives";
import { CategoryIcon, CATEGORY_LABEL } from "@/components/ui/icons";

/** One course: what you'll learn, the curriculum, the mentor, and the one button that matters. */
export default function CourseDetailPage() {
    const { slug } = useParams();
    const { catalogue, user, mutate } = useData();
    const { toast } = useToast();
    const navigate = useNavigate();
    const course = courseBySlug(catalogue, slug);
    if (!course) return <EmptyState title="Course not found" body="It may have been unpublished." action={<Link to="/courses" className="font-semibold text-brand underline">Browse courses</Link>} />;

    const mentor = mentorOf(catalogue, course);
    const enrolled = isEnrolled(user, course.id);
    const progress = courseProgress(catalogue, user, course.id);
    const next = nextLesson(catalogue, user, course.id);
    const saved = user.bookmarks.includes(course.id);
    const modules = catalogue.modules.filter((m) => m.courseId === course.id).sort((a, b) => a.sort - b.sort);
    const cert = user.certificates.find((c) => c.courseId === course.id);
    const finished = enrolled && progress.total > 0 && progress.done === progress.total;

    const start = async () => {
        if (!enrolled) {
            await mutate((r) => r.enroll(course.id));
            toast("Enrolled — your place is saved as you go", "success");
        }
        const first = next ?? lessonsOf(catalogue, course.id)[0];
        if (first) navigate(`/learn/${course.slug}/${first.id}`);
    };
    const claim = async () => {
        try {
            let id = "";
            await mutate(async (r) => {
                id = (await r.issueCertificate(course.id)).id;
            });
            navigate(`/certificates/${id}`);
        } catch (e) {
            toast(e instanceof Error ? e.message : "Couldn't issue the certificate", "danger");
        }
    };

    return (
        <WithRail
            rail={
                <div className="flex flex-col gap-4">
                    <Card className="xl:sticky xl:top-(--cs-rail-top)">
                        {enrolled ? (
                            <>
                                <div className="mb-2 flex items-baseline justify-between">
                                    <span className="text-[13px] text-muted">Your progress</span>
                                    <span className="text-[16px] font-semibold">{progress.pct}%</span>
                                </div>
                                <ProgressBar value={progress.pct} label={`${progress.pct}% complete`} />
                                <p className="mt-2 text-[12px] text-muted">
                                    {progress.done} of {progress.total} lessons
                                </p>
                            </>
                        ) : (
                            <p className="text-[14px] text-muted">Free to enrol. Your progress, notes and place are saved.</p>
                        )}
                        {finished ? (
                            <Button block className="mt-4" onClick={() => (cert ? navigate(`/certificates/${cert.id}`) : void claim())}>
                                <Award size={16} /> {cert ? "View certificate" : "Claim certificate"}
                            </Button>
                        ) : (
                            <Button block className="mt-4" onClick={() => void start()}>
                                {enrolled ? (progress.done ? "Continue" : "Start learning") : "Enrol — it's free"}
                            </Button>
                        )}
                        {enrolled && next && !finished && <p className="mt-2 truncate text-center text-[12px] text-caption">Next: {next.title}</p>}
                        <ul className="mt-5 flex flex-col gap-2 text-[13px] text-muted">
                            <li className="flex items-center gap-2"><Clock size={14} /> {duration(courseMinutes(catalogue, course.id) * 60)} of content</li>
                            <li className="flex items-center gap-2"><Users size={14} /> {course.learners.toLocaleString()} learners</li>
                            <li className="flex items-center gap-2"><Star size={14} /> {course.rating.toFixed(1)} rating · {course.level}</li>
                        </ul>
                    </Card>
                    {mentor && (
                        <Card>
                            <div className="flex items-center gap-3">
                                <Avatar name={mentor.name} hue={mentor.hue} src={mentor.photoUrl} size="lg" />
                                <div className="min-w-0">
                                    <Link to={`/mentors/${mentor.id}`} className="block truncate text-[15px] font-semibold">
                                        {mentor.name}
                                    </Link>
                                    <div className="text-[12px] text-muted">{mentor.role}</div>
                                </div>
                            </div>
                            <p className="mt-3 text-[13px] leading-5 text-muted">{mentor.bio}</p>
                            <Link to={`/mentors/${mentor.id}`} className="mt-3 inline-block text-[13px] font-semibold text-brand underline underline-offset-4">
                                View profile
                            </Link>
                        </Card>
                    )}
                </div>
            }
        >
            <Cover theme={course.theme} src={course.coverUrl} className="mb-5 h-56 rounded-xl max-md:h-40">
                <IconButton label={saved ? "Remove from saved" : "Save course"} className="absolute right-4 top-4 border-0" aria-pressed={saved} onClick={() => void mutate((r) => r.toggleBookmark(course.id)).then(() => toast(saved ? "Removed from saved" : "Saved for later"))}>
                    <Heart size={16} fill={saved ? "currentColor" : "none"} />
                </IconButton>
            </Cover>
            <Tag tone={course.categoryId} icon={<CategoryIcon id={course.categoryId} />}>{CATEGORY_LABEL[course.categoryId]}</Tag>
            <h1 className="mt-3 text-[26px] font-semibold leading-8 max-md:text-[22px] max-md:leading-7">{course.title}</h1>
            <p className="mt-2 max-w-2xl text-[15px] leading-6 text-muted">{course.blurb}</p>

            <section className="mt-7" aria-labelledby="learn-h">
                <h2 id="learn-h" className="mb-3 text-[18px] font-semibold">What you'll be able to do</h2>
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {course.outcomes.map((o) => (
                        <li key={o} className="flex items-start gap-2.5 rounded-md bg-card px-3.5 py-3 text-[14px]">
                            <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-mint-soft text-mint"><Check size={12} strokeWidth={3} /></span>
                            {o}
                        </li>
                    ))}
                </ul>
            </section>

            <section className="mt-7" aria-labelledby="about-h">
                <h2 id="about-h" className="mb-3 text-[18px] font-semibold">About this course</h2>
                {course.description.split(/\n{2,}/).map((p, i) => (
                    <p key={i} className="mb-3 max-w-2xl text-[15px] leading-6 text-muted">{p}</p>
                ))}
            </section>

            <section className="mt-7" aria-labelledby="curr-h">
                <h2 id="curr-h" className="mb-3 text-[18px] font-semibold">Curriculum</h2>
                <div className="flex flex-col gap-3">
                    {modules.map((m, mi) => {
                        const ls = catalogue.lessons.filter((l) => l.moduleId === m.id).sort((a, b) => a.sort - b.sort);
                        return (
                            <Card key={m.id} as="section" aria-labelledby={`mod-${m.id}`}>
                                <h3 id={`mod-${m.id}`} className="mb-1 flex items-baseline gap-2 text-[15px] font-semibold">
                                    <span className="text-caption">{String(mi + 1).padStart(2, "0")}</span> {m.title}
                                    <span className="ml-auto text-[12px] font-normal text-caption">{ls.length} lessons</span>
                                </h3>
                                <ol>
                                    {ls.map((l) => {
                                        const done = isDone(user, l.id);
                                        const row = (
                                            <>
                                                <span className={cn("grid size-7 shrink-0 place-items-center rounded-full", done ? "bg-mint-soft text-mint" : "bg-page text-muted")}>{done ? <Check size={13} strokeWidth={3} /> : <LessonKindIcon kind={l.kind} size={13} />}</span>
                                                <span className={cn("min-w-0 flex-1 truncate text-[14px]", done ? "text-muted" : "font-medium")}>{l.title}</span>
                                                <span className="text-[12px] text-caption">{l.kind === "quiz" ? "Quiz" : duration(l.durationSec)}</span>
                                                {!enrolled && <Lock size={13} className="text-caption" aria-label="Enrol to open" />}
                                            </>
                                        );
                                        return (
                                            <li key={l.id} className="border-t border-line first:border-t-0">
                                                {enrolled ? (
                                                    <Link to={`/learn/${course.slug}/${l.id}`} className="flex items-center gap-3 py-2.5 hover:text-brand">{row}</Link>
                                                ) : (
                                                    <button type="button" onClick={() => void start()} className="flex w-full items-center gap-3 py-2.5 text-left hover:text-brand">{row}</button>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ol>
                            </Card>
                        );
                    })}
                </div>
            </section>
        </WithRail>
    );
}
