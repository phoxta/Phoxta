import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BellRing, Camera, CheckCircle2, Plus, Repeat, Sparkles, Target, Trash2, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { isoDate, relative, time } from "@/lib/format";
import { Confirm, EmptyModule, MemberChips, MemberMultiPicker, Notice, PageTitle, Section } from "@/components/shared";
import { Dialog } from "@/components/ui/overlay";
import { Button, Card, Field, ProgressBar, Skeleton, Tag } from "@/components/ui/primitives";
import { BASE, daysOverdue, isDone, isDropped, isParked, milestoneFor, recurLabel, reminderCount, taskById } from "../derive";
import { KIND_LABEL, PRIORITY_LABEL, REMINDERS_BEFORE_PARK, SOURCE_LABEL, STATUS_LABEL } from "../types";
import { Celebration, DueTag, SproutsPill, TaskLinks } from "../components/pieces";
import { CompanionDialog } from "../components/CompanionDialog";
import { ProofDialog } from "../components/ProofDialog";
import { useTasks } from "../components/useTasks";

/**
 * One task, in full: what it is, who it is for, what it is part of, what it is
 * worth, and every reason it is still on the list. This is where a task stops
 * being a line and becomes a decision — do it, move it, or drop it.
 */

export default function TaskPage() {
    const { id = "" } = useParams();
    const navigate = useNavigate();
    const { state, sp, loading, error, mutate, complete, approve, toast, celebration, clearCelebration } = useTasks();

    const [newStep, setNewStep] = useState("");
    const [editing, setEditing] = useState(false);
    const [proof, setProof] = useState(false);
    const [asking, setAsking] = useState(false);
    const [dropping, setDropping] = useState(false);
    const [dropReason, setDropReason] = useState("");
    const [deleting, setDeleting] = useState(false);

    const task = state ? taskById(state, id) : undefined;

    // Edit form state, seeded from the task once it is loaded.
    const [title, setTitle] = useState("");
    const [notes, setNotes] = useState("");
    const [date, setDate] = useState("");
    const [clock, setClock] = useState("");
    const [who, setWho] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        if (!task) return;
        setTitle(task.title);
        setNotes(task.notes);
        setDate(task.dueAt ? isoDate(task.dueAt) : "");
        setClock(task.dueAt && !task.allDay ? time(task.dueAt) : "");
        setWho(task.assigneeMemberIds);
    }, [task]);

    if (loading) return <Skeleton className="h-96" />;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!task) {
        return (
            <div>
                <PageTitle title="Not this one" sub="That task isn't here — it may have been finished, dropped, or it was never yours to see." area="execute" />
                <EmptyModule title="Nothing to show" body="Back to the list to find what you were after." action={<Button onClick={() => navigate(BASE)}>Back to tasks</Button>} />
            </div>
        );
    }

    const manage = sp.can("tasks.manage");
    const canEdit = manage || task.ownerMemberId === sp.me.id || task.createdBy === sp.me.id;
    const canTick = task.assigneeMemberIds.includes(sp.me.id) || (sp.role !== "guest" && manage);
    const milestone = milestoneFor(state, task.milestoneId);
    const late = daysOverdue(task, sp.today);
    const waitingOnParent = task.needsProof && Boolean(task.proofUrl) && !task.proofApprovedBy && !isDone(task);
    const stepsDone = task.checklist.filter((c) => c.done).length;

    const save = async (e: FormEvent) => {
        e.preventDefault();
        setBusy(true);
        try {
            await mutate((r) =>
                r.updateTask(task.id, {
                    title: title.trim() || task.title,
                    notes,
                    assigneeMemberIds: manage ? who : task.assigneeMemberIds,
                    dueAt: date ? new Date(`${date}T${clock || "09:00"}`).toISOString() : null,
                    allDay: !clock,
                }),
            );
            toast("Saved", "success");
            setEditing(false);
        } catch (err) {
            toast(err instanceof Error ? err.message : "Couldn't save that", "danger");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div>
            {celebration && <Celebration sprouts={celebration.sprouts} title={celebration.title} onDone={clearCelebration} />}

            <Link to={BASE} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
                <ArrowLeft size={14} aria-hidden="true" /> All tasks
            </Link>

            <PageTitle
                title={task.title}
                sub={task.notes || undefined}
                area="execute"
                actions={
                    <>
                        {canEdit && !isDone(task) && (
                            <Button variant="outline" onClick={() => setEditing(true)}>
                                Edit
                            </Button>
                        )}
                        {isDone(task) ? (
                            <Button variant="outline" onClick={() => void mutate((r) => r.reopenTask(task.id))}>
                                Put it back
                            </Button>
                        ) : (
                            <Button
                                disabled={!canTick}
                                onClick={() => {
                                    if (task.needsProof && !task.proofApprovedBy) setProof(true);
                                    else void complete(task);
                                }}
                            >
                                <CheckCircle2 size={16} aria-hidden="true" /> {task.needsProof && !task.proofUrl ? "Send a photo" : "Mark it done"}
                            </Button>
                        )}
                    </>
                }
            />

            <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[1fr_320px]">
                <div>
                    {isParked(task, sp.today) && !isDone(task) && (
                        <Notice tone="danger" className="mb-5">
                            {reminderCount(task, sp.today)} reminders and this hasn't moved, so we've stopped asking. Do it, move the date, or drop it — whichever is true.
                        </Notice>
                    )}
                    {isDropped(task) && <Notice className="mb-5">Dropped: {task.droppedReason}</Notice>}
                    {waitingOnParent && <Notice tone="info" className="mb-5">The photo is in. {manage ? "Say yes and the Sprouts land." : "A parent will check it."}</Notice>}

                    <Card className="mb-5">
                        <dl className="grid grid-cols-2 gap-4 text-md sm:grid-cols-3">
                            <div>
                                <dt className="text-xs uppercase tracking-[0.06em] text-caption">When</dt>
                                <dd className="mt-1">
                                    <DueTag task={task} today={sp.today} />
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs uppercase tracking-[0.06em] text-caption">Who</dt>
                                <dd className="mt-1">
                                    <MemberChips memberIds={task.assigneeMemberIds} />
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs uppercase tracking-[0.06em] text-caption">Status</dt>
                                <dd className="mt-1">
                                    <Tag tone={isDone(task) ? "ok" : task.status === "waiting" ? "warn" : "neutral"}>{STATUS_LABEL[task.status]}</Tag>
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs uppercase tracking-[0.06em] text-caption">Kind</dt>
                                <dd className="mt-1">
                                    {KIND_LABEL[task.kind]}
                                    {task.isChore && task.sprouts > 0 && <SproutsPill n={task.sprouts} className="ml-2" />}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs uppercase tracking-[0.06em] text-caption">Priority</dt>
                                <dd className="mt-1">{PRIORITY_LABEL[task.priority]}</dd>
                            </div>
                            <div>
                                <dt className="text-xs uppercase tracking-[0.06em] text-caption">Where it came from</dt>
                                <dd className="mt-1">{SOURCE_LABEL[task.sourceType]}</dd>
                            </div>
                        </dl>
                        <div className="mt-4">
                            <TaskLinks task={task} />
                        </div>
                        {task.rrule && (
                            <p className="mt-3 flex items-center gap-1.5 text-sm text-muted">
                                <Repeat size={14} aria-hidden="true" /> {recurLabel(task.rrule)} — finishing this one puts the next on the list.
                            </p>
                        )}
                    </Card>

                    <Section title="Steps" action={task.checklist.length ? <span className="text-xs text-caption">{stepsDone} of {task.checklist.length}</span> : undefined}>
                        <Card>
                            {task.checklist.length === 0 && <p className="mb-3 text-sm text-caption">No steps yet — break it down if it helps.</p>}
                            <ul className="flex flex-col">
                                {task.checklist.map((c) => (
                                    <li key={c.id} className="flex items-center gap-3 border-b border-line py-2 last:border-0">
                                        <label className="flex flex-1 cursor-pointer items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={c.done}
                                                onChange={(e) => void mutate((r) => r.setChecklistItem(task.id, c.id, e.target.checked))}
                                                className="size-4 accent-[var(--color-brand)]"
                                            />
                                            <span className={cn("text-md", c.done && "text-muted line-through")}>{c.text}</span>
                                        </label>
                                        {canEdit && (
                                            <button type="button" aria-label={`Remove step ${c.text}`} onClick={() => void mutate((r) => r.removeChecklistItem(task.id, c.id))} className="text-caption hover:text-danger-ink">
                                                <X size={14} aria-hidden="true" />
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                            {task.checklist.length > 0 && <ProgressBar value={(stepsDone / task.checklist.length) * 100} className="mt-3" label="Steps done" />}
                            {canEdit && (
                                <form
                                    className="mt-3 flex gap-2"
                                    onSubmit={async (e) => {
                                        e.preventDefault();
                                        if (!newStep.trim()) return;
                                        await mutate((r) => r.addChecklistItem(task.id, newStep));
                                        setNewStep("");
                                    }}
                                >
                                    <Field label="" value={newStep} onChange={(e) => setNewStep(e.target.value)} placeholder="Add a step" className="flex-1" />
                                    <Button type="submit" variant="outline" className="self-end" disabled={!newStep.trim()}>
                                        <Plus size={15} aria-hidden="true" /> Add
                                    </Button>
                                </form>
                            )}
                        </Card>
                    </Section>

                    {(task.needsProof || task.proofUrl) && (
                        <Section title="The photo">
                            <Card>
                                {task.proofUrl ? (
                                    <>
                                        <img src={task.proofUrl} alt={`Proof for ${task.title}`} width={640} height={430} loading="lazy" className="aspect-[3/2] w-full rounded-md object-cover" />
                                        <p className="mt-2 text-xs text-caption">
                                            Sent {task.proofSubmittedAt ? relative(task.proofSubmittedAt) : "just now"}
                                            {task.proofApprovedBy ? " · approved" : " · waiting on a parent"}
                                        </p>
                                        {manage && !task.proofApprovedBy && (
                                            <div className="mt-3 flex gap-2">
                                                <Button size="sm" onClick={() => void approve(task)}>
                                                    Yes — credit {task.sprouts} Sprouts
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={() => void mutate((r) => r.declineProof(task.id, "")).then(() => toast("Sent back", "default"))}>
                                                    Send it back
                                                </Button>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-sm leading-5 text-muted">This chore needs a photo before the {task.sprouts} Sprouts count.</p>
                                        {canTick && (
                                            <Button size="sm" variant="outline" onClick={() => setProof(true)}>
                                                <Camera size={14} aria-hidden="true" /> Add one
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </Card>
                        </Section>
                    )}
                </div>

                <aside className="flex flex-col gap-4">
                    {milestone && (
                        <Card>
                            <h2 className="flex items-center gap-1.5 text-md font-semibold">
                                <Target size={15} aria-hidden="true" /> {milestone.label}
                            </h2>
                            <p className="mt-1 text-sm text-muted">
                                {milestone.done} of {milestone.total} tasks under this milestone are done.
                            </p>
                            <ProgressBar value={milestone.pct} className="mt-3" label={`${milestone.label} progress`} />
                            <p className="mt-2 text-xs text-caption">{milestone.pct}% — ticking this task off moves it.</p>
                        </Card>
                    )}

                    {!task.goalId && canEdit && !isDone(task) && (
                        <Card>
                            <h2 className="text-md font-semibold">Not pointed at anything</h2>
                            <p className="mt-1 text-sm leading-5 text-muted">This isn't linked to a goal. If it matters, say what it is for.</p>
                            <label className="mt-3 flex flex-col gap-1.5">
                                <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">Link to a goal</span>
                                <select
                                    value=""
                                    onChange={(e) => {
                                        const g = state.goalProgress.find((x) => x.goalId === e.target.value);
                                        if (g) void mutate((r) => r.linkToGoal(task.id, g.goalId, g.label));
                                    }}
                                    className="h-11 rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand"
                                >
                                    <option value="">Choose a goal…</option>
                                    {state.goalProgress.map((g) => (
                                        <option key={g.goalId} value={g.goalId}>
                                            {g.label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </Card>
                    )}

                    {/* Once it has parked we have said we'll stop asking, so the
                        button to ask again goes with the sentence. The notice at
                        the top of the page is what stands in its place. */}
                    {late > 0 && !isDone(task) && !isParked(task, sp.today) && (
                        <Card>
                            <h2 className="text-md font-semibold">Reminders</h2>
                            <p className="mt-1 text-sm leading-5 text-muted">
                                {reminderCount(task, sp.today)} of {REMINDERS_BEFORE_PARK} sent. After three we stop and put it in Needs attention instead.
                            </p>
                            {manage && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="mt-3"
                                    onClick={() => void mutate((r) => r.remind(task.id)).then(() => toast("Reminder sent", "default"))}
                                >
                                    <BellRing size={14} aria-hidden="true" /> Send a reminder
                                </Button>
                            )}
                        </Card>
                    )}

                    <Card>
                        <h2 className="text-md font-semibold">Companion</h2>
                        <p className="mt-1 text-sm leading-5 text-muted">Ask for the next steps under this task's goal, or turn a note into jobs.</p>
                        <Button size="sm" variant="outline" className="mt-3" onClick={() => setAsking(true)}>
                            <Sparkles size={14} aria-hidden="true" /> Ask
                        </Button>
                    </Card>

                    {canEdit && !isDone(task) && (
                        <Card>
                            <h2 className="text-md font-semibold">If it isn't going to happen</h2>
                            <p className="mt-1 text-sm leading-5 text-muted">Dropping it is a decision, not a failure. It stays in the record with your reason.</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Button size="sm" variant="outline" onClick={() => setDropping(true)}>
                                    Drop it
                                </Button>
                                <Button size="sm" variant="danger" onClick={() => setDeleting(true)}>
                                    <Trash2 size={14} aria-hidden="true" /> Delete
                                </Button>
                            </div>
                        </Card>
                    )}
                </aside>
            </div>

            {/* Edit */}
            <Dialog open={editing} onClose={() => setEditing(false)} title="Edit this task" wide>
                <form onSubmit={save} className="flex flex-col gap-4">
                    <Field label="What needs doing" value={title} onChange={(e) => setTitle(e.target.value)} required />
                    <label className="flex flex-col gap-1.5">
                        <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">Notes</span>
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="rounded-md border border-line-strong bg-card px-4 py-3 text-md outline-none focus:border-brand" />
                    </label>
                    <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                        <Field label="Day" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                        <Field label="Time (optional)" type="time" value={clock} onChange={(e) => setClock(e.target.value)} />
                    </div>
                    {manage && <MemberMultiPicker value={who} onChange={setWho} label="Who's doing it" />}
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setEditing(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={busy}>
                            Save
                        </Button>
                    </div>
                </form>
            </Dialog>

            {/* Drop */}
            <Dialog open={dropping} onClose={() => setDropping(false)} title="Drop this task">
                <p className="text-md leading-6 text-muted">Say why, in your own words. It stops asking and the reason stays on the record.</p>
                <label className="mt-3 flex flex-col gap-1.5">
                    <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">Why</span>
                    <textarea value={dropReason} onChange={(e) => setDropReason(e.target.value)} rows={2} className="rounded-md border border-line-strong bg-card px-4 py-3 text-md outline-none focus:border-brand" placeholder="We decided not to bother this year" />
                </label>
                <div className="mt-5 flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setDropping(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={async () => {
                            await mutate((r) => r.dropTask(task.id, dropReason));
                            toast("Dropped", "default");
                            setDropping(false);
                        }}
                    >
                        Drop it
                    </Button>
                </div>
            </Dialog>

            <Confirm
                open={deleting}
                title="Delete this task?"
                body="It goes for good — no record, no reason. If you might want to know later, drop it instead."
                confirmLabel="Delete"
                danger
                onConfirm={async () => {
                    await mutate((r) => r.removeTask(task.id));
                    navigate(BASE);
                }}
                onClose={() => setDeleting(false)}
            />

            {proof && <ProofDialog open onClose={() => setProof(false)} task={task} onSent={() => void complete(task)} />}
            <CompanionDialog open={asking} onClose={() => setAsking(false)} state={state} goalLabel={task.goalLabel || task.title} />
        </div>
    );
}
