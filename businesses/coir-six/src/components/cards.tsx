import { Link } from "react-router-dom";
import { Check, Heart, MoreVertical, Trash2, UserPlus, ArrowUpRight, Clock, FileText, HelpCircle, Play } from "lucide-react";
import type { Course, Lesson, LiveLesson, Mentor, Task } from "@/data/types";
import { cn } from "@/lib/cn";
import { duration, dueLabel, longDate, time } from "@/lib/format";
import { courseMinutes, courseProgress, mentorOf } from "@/lib/derive";
import { useData } from "@/state/data";
import { useToast } from "@/state/toast";
import { Avatar, Button, Cover, IconButton, ProgressBar, Tag } from "@/components/ui/primitives";
import { CategoryIcon, CATEGORY_LABEL } from "@/components/ui/icons";

/** The cards and rows the whole app is composed from. */

export function CourseCard({ course, className, compact, surface = true }: { course: Course; className?: string; compact?: boolean; /** White card with its own padding. Off inside the dashboard rail, whose container is the surface (design: "media rail"). */ surface?: boolean }) {
    const { catalogue, user, mutate } = useData();
    const { toast } = useToast();
    const mentor = mentorOf(catalogue, course);
    const p = courseProgress(catalogue, user, course.id);
    const saved = user.bookmarks.includes(course.id);
    const enrolled = user.enrollments.some((e) => e.courseId === course.id);
    return (
        <article className={cn("flex w-[254px] flex-none flex-col gap-3 max-md:w-[240px] max-md:rounded-[18px] max-md:bg-card max-md:p-3", surface && "rounded-[18px] bg-card p-3 transition-shadow hover:shadow-hover", className)}>
            <div className="relative">
                <Link to={`/courses/${course.slug}`} className="block rounded-md" aria-label={course.title}>
                    <Cover theme={course.theme} src={course.coverUrl} className="h-[130px] max-md:h-[124px]" />
                </Link>
                <IconButton
                    label={saved ? "Remove from saved" : "Save course"}
                    size="md"
                    className="absolute right-2.5 top-2.5 border-0"
                    aria-pressed={saved}
                    onClick={() => void mutate((r) => r.toggleBookmark(course.id)).then(() => toast(saved ? "Removed from saved" : "Saved for later"))}
                >
                    <Heart size={16} strokeWidth={1.8} fill={saved ? "currentColor" : "none"} />
                </IconButton>
            </div>
            <Tag tone={course.categoryId} icon={<CategoryIcon id={course.categoryId} />}>
                {CATEGORY_LABEL[course.categoryId]}
            </Tag>
            <h3 className="clamp-2 h-[42px] shrink-0 text-[15px] font-semibold leading-[21px]">
                <Link to={`/courses/${course.slug}`}>{course.title}</Link>
            </h3>
            {enrolled ? <ProgressBar value={p.pct} label={`${course.title}: ${p.pct}% complete`} /> : !compact && <div className="text-[12px] text-muted">{duration(courseMinutes(catalogue, course.id) * 60)} · {course.level}</div>}
            {mentor && (
                <div className="flex items-center gap-2.5 pt-1">
                    <Avatar name={mentor.name} hue={mentor.hue} src={mentor.photoUrl} size="xs" />
                    <div>
                        <div className="text-[13px] font-medium">{mentor.name}</div>
                        <div className="text-[11px] text-muted">Mentor</div>
                    </div>
                </div>
            )}
        </article>
    );
}

export function StatCard({ icon, tone, top, title, to, className }: { icon: React.ReactNode; tone: "fe" | "ux" | "br"; top: string; title: string; to?: string; className?: string }) {
    const well = tone === "fe" ? "bg-fe-soft text-fe" : tone === "ux" ? "bg-ux-soft text-ux" : "bg-br-soft text-br";
    const inner = (
        <>
            <span className={cn("grid size-[50px] shrink-0 place-items-center rounded-full", well)} aria-hidden="true">
                {icon}
            </span>
            <div className="min-w-0">
                <div className="text-[12px] text-muted">{top}</div>
                <div className="mt-[3px] truncate text-[16px] font-semibold">{title}</div>
            </div>
            <MoreVertical size={16} className="ml-auto text-muted max-md:hidden" aria-hidden="true" />
        </>
    );
    const cls = cn("flex h-[70px] items-center gap-3.5 rounded-lg bg-card py-2.5 pl-2.5 pr-3.5 max-md:h-[72px] max-md:w-[200px] max-md:flex-none", className);
    return to ? (
        <Link to={to} className={cls}>
            {inner}
        </Link>
    ) : (
        <div className={cls}>{inner}</div>
    );
}

export function MentorRow({ mentor, className }: { mentor: Mentor; className?: string }) {
    const { user, mutate } = useData();
    const { toast } = useToast();
    const on = user.follows.includes(mentor.id);
    return (
        <div className={cn("flex items-center gap-3 border-b border-line-strong py-3.5 last:border-b-0", className)}>
            <Link to={`/mentors/${mentor.id}`} aria-label={mentor.name}>
                <Avatar name={mentor.name} hue={mentor.hue} src={mentor.photoUrl} size="lg" plus />
            </Link>
            <div className="min-w-0 flex-1">
                <Link to={`/mentors/${mentor.id}`} className="block truncate text-[14px] font-medium" title={mentor.name}>
                    {mentor.name}
                </Link>
                <div className="mt-0.5 text-[12px] text-muted">Mentor</div>
            </div>
            {/* The followed state is a compact check so the name beside it keeps its room —
                the row is 268px wide in the rail, and "Following" ate the surname. */}
            <Button
                variant={on ? "tonal" : "outline"}
                size="xs"
                className={cn("ml-auto shrink-0 !rounded-full", on && "!px-2.5")}
                aria-pressed={on}
                aria-label={on ? `Following ${mentor.name} — press to unfollow` : `Follow ${mentor.name}`}
                title={on ? "Following" : undefined}
                onClick={() => void mutate((r) => r.toggleFollow(mentor.id)).then(() => toast(on ? `Unfollowed ${mentor.name}` : `Following ${mentor.name}`))}
            >
                {on ? <Check size={13} strokeWidth={2.5} /> : <UserPlus size={12} strokeWidth={2} />}
                {on ? "" : "Follow"}
            </Button>
        </div>
    );
}

export function LessonKindIcon({ kind, size = 14 }: { kind: Lesson["kind"]; size?: number }) {
    if (kind === "video") return <Play size={size} aria-hidden="true" />;
    if (kind === "article") return <FileText size={size} aria-hidden="true" />;
    return <HelpCircle size={size} aria-hidden="true" />;
}

/** A live-lesson row: desktop table row, stacked on mobile (design: "tables never scroll sideways"). */
export function LiveRow({ live, showDate = true }: { live: LiveLesson; showDate?: boolean }) {
    const { catalogue } = useData();
    const mentor = catalogue.mentors.find((m) => m.id === live.mentorId);
    if (!mentor) return null;
    return (
        <div className="grid h-16 grid-cols-[56px_180px_180px_1fr_44px] items-center px-4 max-md:h-auto max-md:grid-cols-[44px_1fr_32px] max-md:grid-rows-[auto_auto] max-md:gap-y-1.5 max-md:py-3.5 max-md:[grid-template-areas:'av_name_act'_'av_desc_act']">
            <Avatar name={mentor.name} hue={mentor.hue} src={mentor.photoUrl} size="sm" className="max-md:[grid-area:av] max-md:size-10" />
            <div className="max-md:[grid-area:name]">
                <div className="text-[14px] font-medium">{mentor.name}</div>
                <div className="mt-0.5 text-[12px] text-muted">{showDate ? `${longDate(live.startsAt)} · ${time(live.startsAt)}` : time(live.startsAt)}</div>
            </div>
            <Tag tone={live.categoryId} icon={<CategoryIcon id={live.categoryId} />} className="max-md:hidden">
                {CATEGORY_LABEL[live.categoryId]}
            </Tag>
            <div className="truncate text-[15px] font-medium max-md:[grid-area:desc] max-md:whitespace-normal max-md:text-[14px] max-md:font-normal max-md:text-muted">{live.title}</div>
            <Link to={`/lessons#${live.id}`} className="grid size-7 place-items-center justify-self-end rounded-full border border-brand text-brand max-md:[grid-area:act]" aria-label={`Open ${live.title}`}>
                <ArrowUpRight size={12} strokeWidth={2} />
            </Link>
        </div>
    );
}

export function TaskRow({ task, onToggle, onDelete }: { task: Task; onToggle: () => void; onDelete: () => void }) {
    const { catalogue } = useData();
    const course = task.courseId ? catalogue.courses.find((c) => c.id === task.courseId) : null;
    const due = dueLabel(task.dueAt);
    const done = Boolean(task.doneAt);
    return (
        <li className="flex items-center gap-3.5 border-b border-line py-3 last:border-b-0">
            <button
                type="button"
                role="checkbox"
                aria-checked={done}
                aria-label={done ? `Mark "${task.title}" not done` : `Mark "${task.title}" done`}
                onClick={onToggle}
                className={cn("grid size-6 shrink-0 place-items-center rounded-[7px] border transition-colors", done ? "border-brand bg-brand text-white" : "border-line-strong bg-card hover:border-ink")}
            >
                {done && <Check size={14} strokeWidth={3} />}
            </button>
            <div className="min-w-0 flex-1">
                <div className={cn("truncate text-[14px] font-medium", done && "text-muted line-through")}>{task.title}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-muted">
                    {course && (
                        <span className={cn("font-medium", course.categoryId === "fe" ? "text-fe-ink" : course.categoryId === "ux" ? "text-ux-ink" : "text-br-ink")}>{CATEGORY_LABEL[course.categoryId]}</span>
                    )}
                    {!done && (
                        <span className={cn("inline-flex items-center gap-1", due.tone === "danger" ? "text-danger-ink" : due.tone === "warn" ? "text-peach" : "")}>
                            <Clock size={11} aria-hidden="true" />
                            {due.text}
                        </span>
                    )}
                </div>
            </div>
            <IconButton label={`Delete "${task.title}"`} size="sm" className="border-0 text-muted hover:text-danger-ink" onClick={onDelete}>
                <Trash2 size={14} />
            </IconButton>
        </li>
    );
}
