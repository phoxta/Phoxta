import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CalendarDays, Check, ChevronLeft, ExternalLink, Eye, EyeOff, Pencil, Sparkles, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { dueLabel, shortDate } from "@/lib/format";
import { useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import { Confirm, EmptyModule, MemberAvatar, Notice } from "@/components/shared";
import { Button, Card, ProgressBar, Tag } from "@/components/ui/primitives";
import curriculaModule from "../module";
import { BASE, gradeFor, isDone, rubricTotal, subjectById, submissionFor, unitById } from "../derive";
import { LINK_LABEL, type NewGrade } from "../types";
import { ScorePill, SourceLink, SpeakButton, StatusTag, SubjectPill } from "../components/pieces";
import { AssignmentDialog } from "../components/dialogs";
import { GradeDialog } from "../components/GradeDialog";

/**
 * One piece of work.
 *
 * For a child this is the whole interaction: read it (aloud, if reading is
 * still hard), do it, hand it in, and — if a parent has released the mark —
 * read what they said about it. Handing in pays the Sprouts once, through the
 * core repo, so the points on their profile and the record here can never
 * disagree.
 *
 * For a parent it is the marking desk: what was handed in, the mark, the
 * rubric, the sentence of feedback, and the decision about whether the child
 * sees any of it yet.
 */
export default function AssignmentPage() {
    const { memberId = "", id = "" } = useParams();
    const navigate = useNavigate();
    const { state, repo, mutate, reload, loading, error } = useModule(curriculaModule);
    const sp = useSpace();
    const { toast } = useToast();
    const [text, setText] = useState("");
    const [editOpen, setEditOpen] = useState(false);
    const [gradeOpen, setGradeOpen] = useState(false);
    const [confirmRemove, setConfirmRemove] = useState(false);
    const [busy, setBusy] = useState(false);

    const manage = sp.can("curricula.manage");

    if (loading && !state) return <p className="text-md text-muted">Opening the work…</p>;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state) return null;

    const a = state.assignments.find((x) => x.id === id);
    const child = sp.members.find((m) => m.id === memberId);
    if (!a || !child) {
        return (
            <EmptyModule
                title="We can't find that piece of work"
                body="It may have been removed, or it belongs to someone whose work you can't see."
                action={
                    <Link to={BASE} className="text-sm font-semibold text-brand underline">
                        Back to the curriculum
                    </Link>
                }
            />
        );
    }

    const subject = subjectById(state, a.subjectId);
    const unit = unitById(state, a.unitId);
    const grade = gradeFor(state, a.id);
    const submission = submissionFor(state, a.id);
    const due = dueLabel(a.dueDate);
    const first = child.name.split(" ")[0];
    const mine = sp.role === "child" && sp.me.id === a.childMemberId;
    const little = child.ageBand === "little";
    const rubric = grade ? rubricTotal(grade.rubric) : null;

    const speech = [a.title, subject?.name ?? "", a.instructions || "Tap the button when you have finished it.", a.sprouts ? `It is worth ${a.sprouts} Sprouts.` : ""].filter(Boolean).join(". ");

    // ---- writes -------------------------------------------------------------

    const start = async () => {
        await mutate((r) => r.setStatus(a.id, "in-progress"));
        toast("Good — one thing at a time");
    };

    /** Hand it in, and pay the Sprouts exactly once. */
    const handIn = async () => {
        setBusy(true);
        try {
            await repo.submitAssignment(a.id, little ? "" : text, []);
            const gained = await repo.markCredited(a.id);
            await reload();
            if (gained > 0) await sp.mutateCore((core) => core.addPoints(a.childMemberId, gained, `Finished “${a.title}”`));
            setText("");
            toast(gained > 0 ? `Handed in · ${gained} Sprouts` : "Handed in", "success");
        } catch (e) {
            toast(e instanceof Error ? e.message : "That didn't save", "danger");
        } finally {
            setBusy(false);
        }
    };

    const doGrade = async (input: NewGrade) => {
        await mutate((r) => r.gradeAssignment(a.id, input));
        toast(input.visibleToChild ? `Marked, and ${first} can see it` : "Marked — kept with you for now");
    };

    return (
        <div>
            <Link to={`${BASE}/${memberId}`} className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
                <ChevronLeft size={14} aria-hidden="true" /> {mine ? "My learning" : `${first}'s curriculum`}
            </Link>

            <header className="mb-6">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                    <SubjectPill subject={subject} />
                    <StatusTag status={a.status} />
                    {a.sprouts > 0 && <Tag tone="ok">{a.sprouts} Sprouts</Tag>}
                </div>
                <h1 className={cn("font-display leading-[1.15]", little ? "text-[32px]" : "text-7xl md:text-8xl")}>{a.title}</h1>
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                    {!mine && (
                        <span className="inline-flex items-center gap-1.5">
                            <MemberAvatar member={child} size="xs" /> {child.name}
                        </span>
                    )}
                    {unit && <span>{unit.title}</span>}
                    <span className={cn("inline-flex items-center gap-1", due.tone === "danger" && !isDone(a) && "font-semibold text-danger-ink")}>
                        <CalendarDays size={12} aria-hidden="true" /> {due.text} · {shortDate(a.dueDate)}
                    </span>
                </p>
                {unit?.sourceHref && (
                    <p className="mt-2">
                        <SourceLink href={unit.sourceHref} label={unit.sourceLabel} />
                    </p>
                )}
            </header>

            <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[1.4fr_1fr]">
                <div className="flex flex-col gap-4">
                    <Card>
                        {a.attachments.length > 0 && (
                            <ul className="mb-4 flex flex-wrap gap-2">
                                {a.attachments.map((url) => (
                                    <li key={url}>
                                        <img src={url} alt={a.title} width={little ? 260 : 180} height={little ? 180 : 120} loading="lazy" className={cn("rounded-md object-cover", little ? "h-[180px] w-[260px]" : "h-[120px] w-[180px]")} />
                                    </li>
                                ))}
                            </ul>
                        )}
                        <h2 className="text-base font-semibold">What to do</h2>
                        <p className={cn("mt-1.5 whitespace-pre-wrap leading-7 text-muted", little ? "text-xl" : "text-base")}>{a.instructions || "No extra instructions — the title says it."}</p>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <SpeakButton text={speech} big={little} label={little ? "Read it to me" : "Read it aloud"} />
                            {a.linkedHref && a.linkedItemType !== "none" && (
                                <Link to={a.linkedHref} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong bg-card px-3.5 text-sm font-semibold hover:border-ink">
                                    <ExternalLink size={14} aria-hidden="true" /> {LINK_LABEL[a.linkedItemType]}: {a.linkedItemTitle || "Open it"}
                                </Link>
                            )}
                        </div>
                    </Card>

                    {/* ---- The child's own actions ------------------------- */}
                    {mine && (
                        <Card>
                            {isDone(a) ? (
                                <div className="flex items-center gap-3 rounded-lg bg-mint-soft px-4 py-4 text-mint">
                                    <Check size={20} aria-hidden="true" />
                                    <p className={cn("font-semibold", little ? "text-[19px]" : "text-lg")}>{a.status === "graded" && grade ? "Marked" : "Handed in — nice work"}</p>
                                </div>
                            ) : (
                                <>
                                    <h2 className={cn("font-semibold", little ? "text-[19px]" : "text-base")}>{little ? "Have you finished?" : "Hand it in"}</h2>
                                    {!little && (
                                        <label className="mt-3 block">
                                            <span className="mb-1.5 block text-sm font-medium text-muted">Anything you want to say about it?</span>
                                            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} className="w-full rounded-md border border-line-strong bg-card px-3 py-2.5 text-base leading-6 outline-none focus:border-brand" placeholder="What you did, what was hard, what you'd do differently." />
                                        </label>
                                    )}
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {a.status === "not-started" && (
                                            <Button variant="outline" size={little ? "lg" : "md"} onClick={start}>
                                                {little ? "I'm doing it" : "I've started"}
                                            </Button>
                                        )}
                                        <Button size={little ? "lg" : "md"} loading={busy} onClick={handIn}>
                                            {little ? "I did it!" : "Hand it in"}
                                        </Button>
                                    </div>
                                    {little && <p className="mt-3 text-base text-muted">Show a grown-up first, then press the big button.</p>}
                                </>
                            )}
                        </Card>
                    )}

                    {/* ---- What was handed in ----------------------------- */}
                    {submission && (submission.text || submission.mediaUrls.length > 0) && (
                        <Card>
                            <h2 className="text-base font-semibold">What {mine ? "you" : first} handed in</h2>
                            <p className="mt-0.5 text-xs text-caption">{shortDate(submission.submittedAt)}</p>
                            {submission.text && <p className="mt-2.5 whitespace-pre-wrap text-base leading-7">{submission.text}</p>}
                            {submission.mediaUrls.length > 0 && (
                                <ul className="mt-3 flex flex-wrap gap-2">
                                    {submission.mediaUrls.map((url) => (
                                        <li key={url}>
                                            <img src={url} alt="What was handed in" width={180} height={130} loading="lazy" className="h-[130px] w-[180px] rounded-md object-cover" />
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Card>
                    )}

                    {/* ---- The mark --------------------------------------- */}
                    {grade && (
                        <Card>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <h2 className="text-base font-semibold">The mark</h2>
                                <ScorePill score={grade.score} letter={grade.letter} />
                            </div>
                            {rubric && grade.rubric.length > 0 && (
                                <ul className="mt-3 flex flex-col gap-2">
                                    {grade.rubric.map((line, i) => (
                                        <li key={i}>
                                            <div className="flex items-baseline justify-between gap-3 text-sm">
                                                <span className="font-medium">{line.criterion}</span>
                                                <span className="tabular-nums text-muted">
                                                    {line.score}/{line.max}
                                                </span>
                                            </div>
                                            <ProgressBar value={line.max ? (line.score / line.max) * 100 : 0} className="mt-1" label={line.criterion} />
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {grade.comment && <p className={cn("mt-4 rounded-lg bg-page px-4 py-3 leading-7", little ? "text-[17px]" : "text-base")}>{grade.comment}</p>}
                            <p className="mt-3 text-xs text-caption">
                                Marked by {sp.members.find((m) => m.id === grade.gradedBy)?.name.split(" ")[0] ?? "a parent"} on {shortDate(grade.gradedAt)}
                            </p>
                        </Card>
                    )}

                    {mine && !grade && isDone(a) && <p className="text-md text-muted">Not marked yet. When a parent marks it, the mark and what they said will appear here.</p>}
                </div>

                {/* ---- The parent's desk ---------------------------------- */}
                <aside className="flex flex-col gap-4">
                    {manage ? (
                        <>
                            <Card>
                                <h2 className="text-base font-semibold">Marking</h2>
                                <p className="mt-1 text-sm leading-5 text-muted">
                                    {grade ? (grade.visibleToChild ? `${first} can see this mark.` : `This mark is with you only — ${first} cannot see it.`) : a.status === "submitted" ? `${first} handed this in and it is waiting on you.` : "Nothing handed in yet."}
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <Button size="md" onClick={() => setGradeOpen(true)}>
                                        <Sparkles size={15} aria-hidden="true" /> {grade ? "Change the mark" : "Mark it"}
                                    </Button>
                                    {grade && (
                                        <Button
                                            variant="outline"
                                            size="md"
                                            onClick={async () => {
                                                await mutate((r) => r.setGradeVisibility(a.id, !grade.visibleToChild));
                                                toast(grade.visibleToChild ? "Hidden from them again" : `${first} can see it now`);
                                            }}
                                        >
                                            {grade.visibleToChild ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
                                            {grade.visibleToChild ? "Keep it back" : "Release the mark"}
                                        </Button>
                                    )}
                                </div>
                            </Card>

                            <Card>
                                <h2 className="text-base font-semibold">The work itself</h2>
                                <dl className="mt-2 flex flex-col gap-1.5 text-sm">
                                    <div className="flex justify-between gap-3">
                                        <dt className="text-muted">Status</dt>
                                        <dd>
                                            <StatusTag status={a.status} />
                                        </dd>
                                    </div>
                                    <div className="flex justify-between gap-3">
                                        <dt className="text-muted">Sprouts</dt>
                                        <dd className="tabular-nums">{a.sprouts}</dd>
                                    </div>
                                    <div className="flex justify-between gap-3">
                                        <dt className="text-muted">Paid</dt>
                                        <dd>{a.creditedAt ? shortDate(a.creditedAt) : "Not yet"}</dd>
                                    </div>
                                    <div className="flex justify-between gap-3">
                                        <dt className="text-muted">Picture-led</dt>
                                        <dd>{a.pictureLed ? "Yes" : "No"}</dd>
                                    </div>
                                </dl>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <Button variant="outline" size="md" onClick={() => setEditOpen(true)}>
                                        <Pencil size={15} aria-hidden="true" /> Edit
                                    </Button>
                                    <Button variant="danger" size="md" onClick={() => setConfirmRemove(true)}>
                                        <Trash2 size={15} aria-hidden="true" /> Remove
                                    </Button>
                                </div>
                            </Card>

                            {subject && (
                                <Card>
                                    <h2 className="text-base font-semibold">Where it sits</h2>
                                    <p className="mt-1.5 text-sm text-muted">
                                        {subject.name}
                                        {unit ? ` · ${unit.title}` : ""}
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        <Tag tone="neutral">{subject.term}</Tag>
                                        {unit?.sourceCourseId && <Tag tone="grow">From the Library</Tag>}
                                    </div>
                                    <Link to={`${BASE}/${memberId}`} className="mt-3 inline-block text-sm font-semibold text-brand underline-offset-4 hover:underline">
                                        Open {first}&rsquo;s term
                                    </Link>
                                </Card>
                            )}
                        </>
                    ) : (
                        <Card>
                            <h2 className={cn("font-semibold", little ? "text-xl" : "text-base")}>Worth {a.sprouts} Sprouts</h2>
                            {/* Work that is already in has already been paid for — never offer Sprouts for handing in something that is handed in. */}
                            <p className={cn("mt-1 text-muted", little ? "text-lg leading-6" : "text-md leading-6")}>{a.creditedAt || isDone(a) ? "You've already earned these." : "You'll earn them when you hand this in."}</p>
                        </Card>
                    )}
                </aside>
            </div>

            {manage && (
                <>
                    <GradeDialog open={gradeOpen} onClose={() => setGradeOpen(false)} assignment={a} subject={subject} grade={grade} submission={submission} childName={first} onSave={doGrade} />
                    <AssignmentDialog
                        open={editOpen}
                        onClose={() => setEditOpen(false)}
                        units={state.units}
                        subjects={state.subjects}
                        assignment={a}
                        defaultDue={a.dueDate}
                        onSave={async (input) =>
                            void (await mutate((r) =>
                                r.updateAssignment(a.id, {
                                    title: input.title,
                                    instructions: input.instructions,
                                    dueDate: input.dueDate,
                                    sprouts: input.sprouts,
                                    linkedItemType: input.linkedItemType,
                                    linkedItemTitle: input.linkedItemTitle,
                                    linkedHref: input.linkedHref,
                                    pictureLed: input.pictureLed,
                                }),
                            ))
                        }
                    />
                    <Confirm
                        open={confirmRemove}
                        title="Remove this piece of work?"
                        body="The submission and the mark go with it. This cannot be undone."
                        confirmLabel="Remove it"
                        danger
                        onConfirm={async () => {
                            await mutate((r) => r.removeAssignment(a.id));
                            toast("Removed");
                            navigate(`${BASE}/${memberId}`, { replace: true });
                        }}
                        onClose={() => setConfirmRemove(false)}
                    />
                </>
            )}
        </div>
    );
}
