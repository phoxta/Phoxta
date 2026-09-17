import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, BookMarked, Check, ChevronDown, GraduationCap, MessageCircle, Pencil, Plus, Send, Sparkles, Trash2, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { Confirm, MemberAvatar, MemberChips, Notice, PageTitle, Points, Section } from "@/components/shared";
import { Button, Card, EmptyState, ProgressBar, Tag } from "@/components/ui/primitives";
import booksModule from "../module";
import { bestScore, bestScoreAny, courseProgress, weekDoneForAny, weekItemsDoneForAny, weekPctForAny, weekViewers, weeksOf } from "../derive";
import { BookCover } from "../components/pieces";
import { WeekEditor } from "../components/WeekEditor";
import { QuizDialog } from "../components/QuizDialog";
import { AskCompanion } from "../components/AskCompanion";
import { ITEM_LABEL, type CourseWeek } from "../types";

/**
 * A course: four weeks a family can actually finish.
 *
 * Three audiences on one screen. A parent sees the editor while the course is
 * a draft, then the enrolment, sharing and export controls once it is
 * published. An enrolled child sees a week of checkable things and a quiz,
 * with points for finishing. A mentor guest sees exactly what the family
 * wrote — and no control at all, because a guest in Wàfè is a reader.
 */

export default function CoursePage() {
    const { id = "" } = useParams();
    const [params, setParams] = useSearchParams();
    const navigate = useNavigate();
    const { state, mutate, loading, error } = useModule(booksModule);
    const { me, role, can, members, mutateCore } = useSpace();
    const [editing, setEditing] = useState<string | null>(null);
    const [quizWeek, setQuizWeek] = useState<CourseWeek | null>(null);
    const [open, setOpen] = useState<Record<string, boolean>>({});
    const [busyItem, setBusyItem] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [notice, setNotice] = useState<{ tone: "warn" | "ok" | "info" | "danger"; text: string } | null>(null);

    const courseId = params.get("c");
    const course = useMemo(() => {
        if (!state) return undefined;
        const forBook = state.courses.filter((c) => c.bookId === id);
        return (courseId && state.courses.find((c) => c.id === courseId)) || forBook[0];
    }, [state, id, courseId]);

    if (loading && !state) return <p className="text-md text-muted">Opening the course…</p>;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state) return null;

    const book = state.books.find((b) => b.id === id);

    if (!course) {
        return (
            <div>
                <PageTitle title="No course here" sub="Either this book has no course yet, or it isn't one you can see." area="grow" />
                <EmptyState
                    icon={<GraduationCap size={20} aria-hidden="true" />}
                    title="Nothing to open"
                    body="Courses are built from a book on the shelf."
                    action={
                        <Link to={book ? `/grow/books/${book.id}` : "/grow/books"} className="text-sm font-semibold text-brand underline underline-offset-4">
                            {book ? `Back to ${book.title}` : "Back to the library"}
                        </Link>
                    }
                />
            </div>
        );
    }

    const manage = can("books.manage");
    const guest = role === "guest";
    const enrolled = course.enrolled.includes(me.id);
    const weeks = weeksOf(state, course.id);
    const { done, total, pct, currentWeek } = courseProgress(state, course, me.id);
    const canTick = !guest && (manage || enrolled);
    const kids = members.filter((m) => m.role === "child");
    const guests = members.filter((m) => m.role === "guest");
    const wantWeek = Number(params.get("w") || 0);
    const isOpen = (w: CourseWeek) => open[w.id] ?? (wantWeek ? w.week === wantWeek : w.id === currentWeek?.id);

    const toggleItem = async (itemId: string, next: boolean, itemTitle: string) => {
        setBusyItem(itemId);
        setNotice(null);
        try {
            await mutate((r) => r.toggleItem(itemId, me.id, next));
            if (next && me.role === "child") await mutateCore((r) => r.addPoints(me.id, 5, `Course: ${itemTitle}`));
        } catch (e) {
            setNotice({ tone: "danger", text: e instanceof Error ? e.message : "Couldn't save that." });
        } finally {
            setBusyItem(null);
        }
    };

    const run = async (fn: () => Promise<unknown>, ok?: string) => {
        setNotice(null);
        try {
            await fn();
            if (ok) setNotice({ tone: "ok", text: ok });
        } catch (e) {
            setNotice({ tone: "warn", text: e instanceof Error ? e.message : "That didn't work." });
        }
    };

    const unit = state.units.find((u) => u.courseId === course.id);

    // What the companion may know about this course: only the weeks in this
    // member's already-filtered slice, plus who has ticked what. Nothing here
    // writes anything — it answers from what the family itself wrote down.
    const askContext = [
        `Course: "${course.title}" (${course.status}, ${total} weeks) built on the book "${book?.title ?? "unknown"}"${book?.author ? ` by ${book.author}` : ""}.`,
        course.audience ? `Who it is for: ${course.audience}` : "",
        `Enrolled: ${course.enrolled.length ? course.enrolled.map((m) => members.find((x) => x.id === m)?.name.split(" ")[0] ?? "someone").join(" and ") : "nobody yet"}.`,
        ...weeks.map((w) => {
            const ticked = w.items.filter((i) => i.doneBy.length).length;
            const scores = bestScoreAny(state, w.id)
                .map((sc) => `${members.find((m) => m.id === sc.memberId)?.name.split(" ")[0] ?? "someone"} ${sc.score}/${sc.total}`)
                .join(", ");
            return [
                `Week ${w.week} — ${w.theme || "no theme yet"}; reading: ${w.chapters || "not set"}.`,
                w.discussionQuestions.filter(Boolean).length ? ` We asked: ${w.discussionQuestions.filter(Boolean).join(" / ")}.` : "",
                w.familyActivity ? ` We planned to: ${w.familyActivity}.` : "",
                ` ${ticked} of ${w.items.length} things ticked off.`,
                scores ? ` Quiz: ${scores}.` : "",
            ].join("");
        }),
    ]
        .filter(Boolean)
        .join(" ");

    const askSources = [
        "this course's weeks, questions and activities",
        "what has been ticked off so far",
        state.attempts.some((a) => a.courseId === course.id) ? "the quiz scores" : "",
        book ? `the notes on ${book.title}` : "",
    ].filter(Boolean);

    return (
        <div>
            <Link to={`/grow/books/${course.bookId}`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
                <ArrowLeft size={14} aria-hidden="true" /> {book?.title ?? "Back to the book"}
            </Link>

            <PageTitle
                title={course.title}
                sub={course.audience || undefined}
                area="grow"
                actions={
                    manage && (
                        <>
                            {course.status === "draft" ? (
                                <Button onClick={() => void run(() => mutate((r) => r.publishCourse(course.id)), "Published. You can enrol people now.")}>
                                    <Send size={15} aria-hidden="true" /> Publish
                                </Button>
                            ) : (
                                <Button variant="outline" onClick={() => void run(() => mutate((r) => r.updateCourse(course.id, { status: "draft" })), "Back to draft — nobody sees changes until you publish again.")}>
                                    <Pencil size={15} aria-hidden="true" /> Back to draft
                                </Button>
                            )}
                            <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
                                <Trash2 size={15} aria-hidden="true" /> Delete
                            </Button>
                        </>
                    )
                }
            />

            {notice && (
                <Notice tone={notice.tone} className="mb-6">
                    {notice.text}
                </Notice>
            )}

            <Card className="mb-8 flex flex-wrap items-center gap-5">
                {book && <BookCover book={book} w={70} h={102} />}
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-1.5">
                        <Tag tone={course.status === "published" ? "ok" : "warn"}>{course.status === "published" ? "Published" : "Draft"}</Tag>
                        {course.childSafe ? <Tag tone="grow">Child-safe</Tag> : <Tag tone="neutral">Adults</Tag>}
                        {course.model && <Tag tone="neutral">{course.model}</Tag>}
                    </div>
                    <p className="mt-2 text-md text-muted">
                        {total} weeks · week {Math.min(done + 1, total || 1)} in front of us
                        {book ? ` · from ${book.title}` : ""}
                    </p>
                    <ProgressBar value={pct} className="mt-3" label={`${course.title} progress`} />
                </div>
                {course.enrolled.length > 0 && (
                    <div className="text-right">
                        <p className="text-xs uppercase tracking-[0.06em] text-caption">Enrolled</p>
                        <MemberChips memberIds={course.enrolled} className="mt-1.5" />
                    </div>
                )}
            </Card>

            {guest && (
                <Notice tone="info" className="mb-8">
                    The family shared this course with you. You can read every week — the ticking off, the quizzes and the changes are theirs.
                </Notice>
            )}

            {course.status === "draft" && manage && (
                <Notice tone="warn" className="mb-8">
                    This is a draft. Read it through, change anything that isn&rsquo;t how you would say it, then press Publish — nobody can be enrolled until you do.
                </Notice>
            )}

            {/* ---- The weeks ------------------------------------------------- */}
            <Section
                title="The weeks"
                action={manage && course.status === "draft" ? <Button size="sm" variant="outline" onClick={() => void run(() => mutate((r) => r.addWeek(course.id)))}><Plus size={14} aria-hidden="true" /> Add a week</Button> : undefined}
            >
                {weeks.length ? (
                    <ul className="flex flex-col gap-3">
                        {weeks.map((w) => {
                            // Mine when I am enrolled; mine AND the class's when I am not,
                            // so a parent reading along with the children sees their own
                            // ticks counted rather than contradicted.
                            const viewers = weekViewers(course, me.id);
                            const shared = viewers.length > 1;
                            const mineDone = weekDoneForAny(w, viewers);
                            const myPct = weekPctForAny(w, viewers);
                            const score = bestScore(state, w.id, me.id);
                            const scores = manage ? bestScoreAny(state, w.id) : [];
                            const expanded = isOpen(w);
                            return (
                                <li key={w.id} className="overflow-hidden rounded-xl bg-card">
                                    <button
                                        type="button"
                                        aria-expanded={expanded}
                                        onClick={() => setOpen((o) => ({ ...o, [w.id]: !expanded }))}
                                        className="flex w-full items-center gap-3 px-4 py-4 text-left"
                                    >
                                        <span className={cn("grid size-9 shrink-0 place-items-center rounded-full text-md font-semibold", mineDone ? "bg-grow text-white" : "bg-grow-soft text-grow-ink")}>
                                            {mineDone ? <Check size={16} strokeWidth={2.5} aria-hidden="true" /> : w.week}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-base font-semibold">{w.theme || `Week ${w.week}`}</span>
                                            <span className="block text-xs text-caption">
                                                {w.chapters || "No reading set"}
                                                {w.items.length ? ` · ${weekItemsDoneForAny(w, viewers)}/${w.items.length} done${shared ? " between you" : ""}` : ""}
                                                {score ? ` · quiz best ${score.score}/${score.total}` : ""}
                                            </span>
                                        </span>
                                        {mineDone && <Tag tone="ok">Week done</Tag>}
                                        <ChevronDown size={18} className={cn("shrink-0 text-muted transition-transform", expanded && "rotate-180")} aria-hidden="true" />
                                    </button>

                                    {expanded && (
                                        <div className="border-t border-line px-4 pb-4 pt-4">
                                            {editing === w.id ? (
                                                <WeekEditor
                                                    week={w}
                                                    onCancel={() => setEditing(null)}
                                                    onSave={async (patch) => {
                                                        await mutate((r) => r.updateWeek(w.id, patch));
                                                    }}
                                                />
                                            ) : (
                                                <>
                                                    {w.items.length > 0 && (
                                                        <>
                                                            <p className="mb-2 text-xs font-medium uppercase tracking-[0.06em] text-muted">This week</p>
                                                            <ul className="mb-5 flex flex-col gap-1.5">
                                                                {w.items.map((it) => {
                                                                    const done = it.doneBy.includes(me.id);
                                                                    return (
                                                                        <li key={it.id} className="flex items-center gap-3 rounded-md bg-page px-3.5 py-2.5">
                                                                            {canTick ? (
                                                                                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={done}
                                                                                        disabled={busyItem === it.id}
                                                                                        onChange={(e) => void toggleItem(it.id, e.target.checked, it.title)}
                                                                                        className="size-4 shrink-0 accent-[var(--color-brand)]"
                                                                                    />
                                                                                    <span className={cn("min-w-0 flex-1 text-md", done && "text-muted line-through")}>
                                                                                        <span className="mr-2 text-2xs font-semibold uppercase tracking-[0.04em] text-caption">{ITEM_LABEL[it.type]}</span>
                                                                                        {it.title}
                                                                                    </span>
                                                                                </label>
                                                                            ) : (
                                                                                <span className="min-w-0 flex-1 text-md">
                                                                                    <span className="mr-2 text-2xs font-semibold uppercase tracking-[0.04em] text-caption">{ITEM_LABEL[it.type]}</span>
                                                                                    {it.title}
                                                                                </span>
                                                                            )}
                                                                            <span className="flex shrink-0 items-center gap-1">
                                                                                {it.doneBy.map((m) => (
                                                                                    <MemberAvatar key={m} memberId={m} size="xs" />
                                                                                ))}
                                                                            </span>
                                                                        </li>
                                                                    );
                                                                })}
                                                            </ul>
                                                            <ProgressBar value={myPct} className="mb-5" label={`Week ${w.week} progress`} />
                                                        </>
                                                    )}

                                                    {w.discussionQuestions.length > 0 && (
                                                        <div className="mb-5">
                                                            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.06em] text-muted">
                                                                <MessageCircle size={13} aria-hidden="true" /> At the table
                                                            </p>
                                                            <ol className="flex flex-col gap-1.5">
                                                                {w.discussionQuestions.map((q, i) => (
                                                                    <li key={i} className="text-md leading-6 text-ink">
                                                                        <span className="mr-1.5 text-caption">{i + 1}.</span>
                                                                        {q}
                                                                    </li>
                                                                ))}
                                                            </ol>
                                                        </div>
                                                    )}

                                                    {w.familyActivity && (
                                                        <div className="mb-5 rounded-md bg-grow-soft px-4 py-3">
                                                            <p className="text-xs font-medium uppercase tracking-[0.06em] text-grow-ink">Together this week</p>
                                                            <p className="mt-1 text-md leading-6 text-grow-ink">{w.familyActivity}</p>
                                                        </div>
                                                    )}

                                                    <div className="flex flex-wrap items-center gap-3">
                                                        {w.quiz.length > 0 &&
                                                            (guest ? (
                                                                <span className="text-sm text-caption">{w.quiz.length} quiz questions — the family sits these.</span>
                                                            ) : (
                                                                <>
                                                                    <Button size="sm" variant="outline" onClick={() => setQuizWeek(w)} disabled={!canTick}>
                                                                        {score ? "Try the quiz again" : "Take the quiz"}
                                                                    </Button>
                                                                    {score && (
                                                                        <span className="text-sm text-muted">
                                                                            Your best: <strong className="font-semibold text-ink">{score.score}/{score.total}</strong> in {score.attempts} {score.attempts === 1 ? "go" : "goes"}
                                                                        </span>
                                                                    )}
                                                                </>
                                                            ))}
                                                        {manage && (
                                                            <Button size="sm" variant="ghost" onClick={() => setEditing(w.id)}>
                                                                <Pencil size={14} aria-hidden="true" /> Edit this week
                                                            </Button>
                                                        )}
                                                        {manage && course.status === "draft" && weeks.length > 1 && (
                                                            <Button size="sm" variant="ghost" onClick={() => void run(() => mutate((r) => r.removeWeek(w.id)))}>
                                                                Remove week
                                                            </Button>
                                                        )}
                                                    </div>

                                                    {manage && scores.length > 0 && (
                                                        <div className="mt-4 rounded-md bg-page px-3.5 py-3">
                                                            <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted">Best quiz scores</p>
                                                            <ul className="mt-2 flex flex-wrap gap-3">
                                                                {scores.map((sc) => (
                                                                    <li key={sc.memberId} className="flex items-center gap-2 text-sm">
                                                                        <MemberAvatar memberId={sc.memberId} size="xs" />
                                                                        <span>
                                                                            {members.find((m) => m.id === sc.memberId)?.name.split(" ")[0]}: <strong className="font-semibold">{sc.score}/{sc.total}</strong>
                                                                            <span className="text-caption"> · {sc.attempts} {sc.attempts === 1 ? "go" : "goes"}</span>
                                                                        </span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <EmptyState
                        icon={<Sparkles size={20} aria-hidden="true" />}
                        title="This course has no weeks yet"
                        body={manage ? "Add a week and fill it in — a theme, what to read, three questions and one thing to do together." : "A parent is still writing it."}
                        action={manage ? <Button onClick={() => void run(() => mutate((r) => r.addWeek(course.id)))}>Add the first week</Button> : undefined}
                    />
                )}
            </Section>

            {!guest && weeks.length > 0 && (
                <Section title="Ask about this course">
                    <AskCompanion
                        blurb={`Grounded in the weeks you wrote and what has actually been ticked off — ${book ? `${book.title}, ` : ""}nothing invented, nothing saved.`}
                        sources={askSources}
                        extraContext={askContext}
                        payload={{ course: course.title, book: book?.title, weeks: total }}
                        prompts={[
                            {
                                label: "What did we say we'd change after week 1?",
                                prompt: `Looking only at what this family wrote for week 1 of "${course.title}" — the questions, the activity and what was ticked off — what did we say we would change? If we never wrote it down, say so plainly instead of guessing.`,
                                payload: { week: 1 },
                            },
                            {
                                label: `Summarise week ${currentWeek?.week ?? 1} for the children`,
                                action: "summarize",
                                prompt: `Summarise week ${currentWeek?.week ?? 1} of "${course.title}"${currentWeek?.chapters ? ` (${currentWeek.chapters})` : ""} for the children: short sentences, nothing frightening, and three things we could talk about at the table.`,
                                payload: { week: currentWeek?.week ?? 1, chapter: currentWeek?.chapters, forKids: true },
                            },
                            {
                                label: "How do we finish this well?",
                                prompt: `We are on week ${Math.min(done + 1, total || 1)} of ${total} of "${course.title}". Using only what is left undone here, suggest how this family finishes it — one small thing each. Suggestions only.`,
                            },
                        ]}
                    />
                </Section>
            )}

            {/* ---- Enrolment, sharing, export -------------------------------- */}
            {manage && (
                <>
                    <Section title="Who is doing it">
                        <Card>
                            <p className="flex items-center gap-2 text-sm text-muted">
                                <Users size={14} aria-hidden="true" />
                                {course.status === "published" ? "Tick a family member to enrol them." : "Publish the course first — then you can enrol people."}
                            </p>
                            <ul className="mt-3 flex flex-wrap gap-2">
                                {members
                                    .filter((m) => m.role !== "guest")
                                    .map((m) => {
                                        const on = course.enrolled.includes(m.id);
                                        const blocked = m.role === "child" && !course.childSafe;
                                        return (
                                            <li key={m.id}>
                                                <button
                                                    type="button"
                                                    aria-pressed={on}
                                                    disabled={course.status !== "published" || blocked}
                                                    title={blocked ? "Mark the course child-safe first" : undefined}
                                                    onClick={() => void run(() => mutate((r) => (on ? r.unenrol(course.id, m.id) : r.enrol(course.id, m.id))))}
                                                    className={cn(
                                                        "inline-flex h-10 items-center gap-2 rounded-full border pl-1 pr-4 text-sm font-medium transition-colors disabled:opacity-45",
                                                        on ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted hover:text-ink",
                                                    )}
                                                >
                                                    <MemberAvatar memberId={m.id} size="xs" />
                                                    {m.name.split(" ")[0]}
                                                    {blocked && <span className="text-2xs text-caption">· needs child-safe</span>}
                                                </button>
                                            </li>
                                        );
                                    })}
                            </ul>
                            {kids.length > 0 && (
                                <label className="mt-4 flex items-center gap-3 rounded-md bg-page px-4 py-3">
                                    <input
                                        type="checkbox"
                                        checked={course.childSafe}
                                        onChange={(e) => void run(() => mutate((r) => r.updateCourse(course.id, { childSafe: e.target.checked })), e.target.checked ? "Marked child-safe — you can enrol the children now." : "No longer child-safe; any enrolled child has been taken off.")}
                                        className="size-4 accent-[var(--color-brand)]"
                                    />
                                    <span className="text-md">
                                        This course is child-safe
                                        <span className="block text-xs text-caption">A child cannot be enrolled until this is ticked — and un-ticking it takes them off.</span>
                                    </span>
                                </label>
                            )}
                        </Card>
                    </Section>

                    {guests.length > 0 && (
                        <Section title="Share with a guest">
                            <Card>
                                <p className="text-sm text-muted">A guest you share this with sees this course and nothing else in the library — read-only.</p>
                                <ul className="mt-3 flex flex-wrap gap-2">
                                    {guests.map((g) => {
                                        const on = course.sharedWithGuestIds.includes(g.id);
                                        return (
                                            <li key={g.id}>
                                                <button
                                                    type="button"
                                                    aria-pressed={on}
                                                    disabled={course.status !== "published"}
                                                    onClick={() =>
                                                        void run(() =>
                                                            mutate((r) => r.shareCourse(course.id, on ? course.sharedWithGuestIds.filter((x) => x !== g.id) : [...course.sharedWithGuestIds, g.id])),
                                                        )
                                                    }
                                                    className={cn(
                                                        "inline-flex h-10 items-center gap-2 rounded-full border pl-1 pr-4 text-sm font-medium transition-colors disabled:opacity-45",
                                                        on ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted hover:text-ink",
                                                    )}
                                                >
                                                    <MemberAvatar memberId={g.id} size="xs" />
                                                    {g.name}
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                                {course.status !== "published" && <p className="mt-2 text-xs text-caption">Publish the course before sharing it.</p>}
                            </Card>
                        </Section>
                    )}

                    <Section title="Send it to Curricula">
                        <Card className="flex flex-wrap items-center gap-4">
                            <BookMarked size={20} className="text-grow" aria-hidden="true" />
                            <div className="min-w-0 flex-1">
                                {unit ? (
                                    <>
                                        <p className="text-md font-semibold">Exported as a unit</p>
                                        <p className="mt-0.5 text-sm text-muted">
                                            {unit.assignments.length} assignments, one per week, each linking back here. Re-export to pick up your latest edits.
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-md font-semibold">Make this a unit in Curricula</p>
                                        <p className="mt-0.5 text-sm text-muted">One unit, one assignment per week, each linked back to the week it came from.</p>
                                    </>
                                )}
                            </div>
                            <Button variant="outline" onClick={() => void run(() => mutate((r) => r.exportToCurricula(course.id)), "Exported. Curricula will pick it up as a unit.")}>
                                {unit ? "Re-export" : "Export to Curricula"}
                            </Button>
                        </Card>
                        {unit && (
                            <ul className="mt-3 flex flex-col gap-1.5">
                                {unit.assignments.map((a) => (
                                    <li key={a.id} className="flex items-center gap-2 rounded-md bg-card px-4 py-2.5 text-sm">
                                        <span className="min-w-0 flex-1 truncate">{a.title}</span>
                                        <Link to={a.href} className="shrink-0 font-semibold text-brand underline-offset-4 hover:underline">
                                            Open the week
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Section>
                </>
            )}

            {me.role === "child" && enrolled && (
                <p className="mt-6 flex items-center gap-2 text-sm text-muted">
                    <Points n={5} /> for every thing you tick off, and two for every right answer.
                </p>
            )}

            {quizWeek && (
                <QuizDialog
                    open={Boolean(quizWeek)}
                    onClose={() => setQuizWeek(null)}
                    week={quizWeek}
                    best={bestScore(state, quizWeek.id, me.id)}
                    onSubmit={async (answers) => {
                        let result = { score: 0, total: quizWeek.quiz.length };
                        await mutate(async (r) => {
                            const attempt = await r.recordAttempt(quizWeek.id, me.id, answers);
                            result = { score: attempt.score, total: attempt.total };
                        });
                        if (me.role === "child" && result.score > 0) await mutateCore((r) => r.addPoints(me.id, result.score * 2, `Quiz: ${quizWeek.theme || `week ${quizWeek.week}`}`));
                        return result;
                    }}
                />
            )}

            <Confirm
                open={confirmDelete}
                title={`Delete "${course.title}"?`}
                body="Every week, every tick and every quiz attempt goes with it. The book stays on the shelf."
                confirmLabel="Delete the course"
                danger
                onClose={() => setConfirmDelete(false)}
                onConfirm={async () => {
                    await mutate((r) => r.removeCourse(course.id));
                    navigate(`/grow/books/${course.bookId}`);
                }}
            />

            {/* Keep the deep link honest: opening a week from Curricula lands on it. */}
            {wantWeek > 0 && !Object.keys(open).length && (
                <button type="button" onClick={() => setParams({ c: course.id })} className="mt-6 text-xs text-caption underline underline-offset-4">
                    Showing week {wantWeek} — show the whole course
                </button>
            )}
        </div>
    );
}
