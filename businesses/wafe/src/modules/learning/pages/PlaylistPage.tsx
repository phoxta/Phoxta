import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronUp, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";
import type { Visibility } from "@/data/core";
import { cn } from "@/lib/cn";
import { duration } from "@/lib/format";
import { useAi } from "@/lib/ai";
import { Confirm, EmptyModule, MemberAvatar, MemberChips, MemberMultiPicker, Notice, PageTitle, Section, VisibilityPicker } from "@/components/shared";
import { Ring } from "@/components/ui/charts";
import { Dialog } from "@/components/ui/overlay";
import { Button, Card, Field, IconButton, Skeleton, Tag } from "@/components/ui/primitives";
import { playlistById, playlistProgress, videoById, videoDone } from "../derive";
import type { NewPlanInput, PlanCadence } from "../types";
import { CADENCE_LABEL } from "../types";
import { ImportDialog } from "../components/ImportDialog";
import { LessonRow, VisibilityTag } from "../components/pieces";
import { readPlan } from "../components/ai";
import { useLearning } from "../components/useLearning";

/**
 * One playlist — a course.
 *
 * The order is the curriculum, so a parent (or the owner) can move a lesson up
 * and down, drop one out, or add another straight from a link. The companion's
 * job here is the one thing a person finds tedious: turning eight videos into
 * three weeks with dates on them. It proposes; the parent presses Create.
 */

export default function PlaylistPage() {
    const { id = "" } = useParams();
    const navigate = useNavigate();
    const { state, mutate, loading, sp, toast } = useLearning();
    const [editing, setEditing] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [importing, setImporting] = useState(false);
    const [planning, setPlanning] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    if (loading) return <Skeleton className="h-72" />;

    const p = playlistById(state, id);
    if (!p)
        return (
            <div>
                <PageTitle title="Playlist" area="grow" />
                <EmptyModule title="That playlist isn't here" body="It may have been deleted, or it isn't shared with you." action={<Link className="text-sm font-semibold text-brand underline" to="/grow/learning">Back to the Learning Hub</Link>} />
            </div>
        );

    const manage = sp.can("learning.manage");
    const mayEdit = manage || p.ownerMemberId === sp.me.id;
    const mine = playlistProgress(state, p, sp.me.id);
    const videos = p.videoIds.map((vid) => videoById(state, vid)).filter(Boolean) as NonNullable<ReturnType<typeof videoById>>[];

    const move = (from: number, to: number) => {
        if (to < 0 || to >= p.videoIds.length) return;
        const ids = [...p.videoIds];
        const [x] = ids.splice(from, 1);
        ids.splice(to, 0, x);
        void mutate((r) => r.setPlaylistVideos(p.id, ids));
    };

    return (
        <div>
            <Link to="/grow/learning" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
                <ArrowLeft size={14} aria-hidden="true" /> Learning Hub
            </Link>

            <header className="paper mb-8 overflow-hidden rounded-xl bg-grow-soft">
                {p.coverUrl && <img src={p.coverUrl} alt="" width={1200} height={340} loading="lazy" className="h-40 w-full object-cover md:h-52" />}
                <div className="flex flex-wrap items-start gap-5 p-5 md:p-7">
                    <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-1.5">
                            <VisibilityTag p={p} />
                            {p.childSafe ? <Tag tone="grow">Child-safe</Tag> : <Tag tone="warn">Adults only</Tag>}
                            {p.valueId && <Tag tone="neutral">{p.valueId}</Tag>}
                        </div>
                        <h1 className="font-display text-6xl leading-9 md:text-8xl md:leading-10">{p.name}</h1>
                        {p.note && <p className="mt-2 max-w-2xl text-md leading-6 text-muted">{p.note}</p>}
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-caption">
                            <span className="inline-flex items-center gap-1.5">
                                Kept by <MemberAvatar memberId={p.ownerMemberId} size="xs" showName />
                            </span>
                            <span>
                                {videos.length} {videos.length === 1 ? "lesson" : "lessons"} · {duration(videos.reduce((s, v) => s + v.durationS, 0))}
                            </span>
                            {p.assignedTo.length > 0 && (
                                <span className="inline-flex items-center gap-1.5">
                                    Set for <MemberChips memberIds={p.assignedTo} />
                                </span>
                            )}
                        </div>
                    </div>
                    <Ring pct={mine.pct} size={84} stroke={3} label={`Your progress: ${mine.pct}%`}>
                        <span className="text-center">
                            <span className="block font-display text-xl leading-5">{mine.pct}%</span>
                            <span className="block text-[10px] text-caption">
                                {mine.done}/{mine.total}
                            </span>
                        </span>
                    </Ring>
                </div>
                {mayEdit && (
                    <div className="flex flex-wrap gap-2 border-t border-line/60 px-5 py-3 md:px-7">
                        <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                            <Pencil size={13} aria-hidden="true" /> Edit
                        </Button>
                        {manage && (
                            <Button size="sm" variant="outline" onClick={() => setAssigning(true)}>
                                Set for…
                            </Button>
                        )}
                        {manage && (
                            <Button size="sm" variant="outline" onClick={() => setImporting(true)}>
                                <Plus size={13} aria-hidden="true" /> Add a lesson
                            </Button>
                        )}
                        {manage && videos.length > 0 && (
                            <Button size="sm" onClick={() => setPlanning(true)}>
                                <Sparkles size={13} aria-hidden="true" /> Turn into a plan
                            </Button>
                        )}
                        <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setConfirmDelete(true)}>
                            <Trash2 size={13} aria-hidden="true" /> Delete
                        </Button>
                    </div>
                )}
            </header>

            <Section title="Lessons" action={<span className="text-xs text-caption">In the order you watch them</span>}>
                {videos.length ? (
                    <Card className="p-2">
                        <ul className="flex flex-col gap-1">
                            {videos.map((v, i) => (
                                <LessonRow
                                    key={v.id}
                                    state={state}
                                    video={v}
                                    memberId={sp.me.id}
                                    big
                                    meta={
                                        manage && p.assignedTo.length ? (
                                            <span className="inline-flex flex-wrap items-center gap-2">
                                                {p.assignedTo.map((memberId) => (
                                                    <span key={memberId} className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-2xs", videoDone(state, v.id, memberId) ? "bg-mint-soft text-mint" : "bg-page text-caption")}>
                                                        <MemberAvatar memberId={memberId} size="xs" />
                                                        {videoDone(state, v.id, memberId) ? "done" : "not yet"}
                                                    </span>
                                                ))}
                                            </span>
                                        ) : undefined
                                    }
                                    action={
                                        mayEdit ? (
                                            <span className="flex items-center gap-1">
                                                <IconButton label="Move up" size="sm" onClick={() => move(i, i - 1)} disabled={i === 0}>
                                                    <ChevronUp size={14} />
                                                </IconButton>
                                                <IconButton label="Move down" size="sm" onClick={() => move(i, i + 1)} disabled={i === videos.length - 1}>
                                                    <ChevronDown size={14} />
                                                </IconButton>
                                                <IconButton
                                                    label={`Remove ${v.title} from this playlist`}
                                                    size="sm"
                                                    onClick={() => {
                                                        void mutate((r) => r.setPlaylistVideos(p.id, p.videoIds.filter((x) => x !== v.id)));
                                                        toast("Removed from the playlist");
                                                    }}
                                                >
                                                    <X size={14} />
                                                </IconButton>
                                            </span>
                                        ) : undefined
                                    }
                                />
                            ))}
                        </ul>
                    </Card>
                ) : (
                    <EmptyModule title="No lessons in here yet" body="Add one from a YouTube link and it becomes the first week." action={manage ? <Button onClick={() => setImporting(true)}>Add a lesson</Button> : undefined} />
                )}
            </Section>

            {/* Mounted only while open, so each dialog opens on today's values. */}
            {editing && <EditDialog open onClose={() => setEditing(false)} playlistId={p.id} />}
            {assigning && <AssignDialog open onClose={() => setAssigning(false)} playlistId={p.id} />}
            {planning && <PlanDialog open onClose={() => setPlanning(false)} playlistId={p.id} onCreated={(planId) => navigate(`/grow/learning?plan=${planId}`)} />}
            <ImportDialog open={importing} onClose={() => setImporting(false)} playlistId={p.id} />
            <Confirm
                open={confirmDelete}
                title={`Delete "${p.name}"?`}
                body="The lessons themselves stay saved; only this shelf goes."
                confirmLabel="Delete playlist"
                danger
                onClose={() => setConfirmDelete(false)}
                onConfirm={async () => {
                    await mutate((r) => r.removePlaylist(p.id));
                    navigate("/grow/learning");
                }}
            />
        </div>
    );
}

// ---------------------------------------------------------------------------
// Edit
// ---------------------------------------------------------------------------

function EditDialog({ open, onClose, playlistId }: { open: boolean; onClose: () => void; playlistId: string }) {
    const { state, mutate, sp } = useLearning();
    const p = playlistById(state, playlistId);
    const [name, setName] = useState(p?.name ?? "");
    const [note, setNote] = useState(p?.note ?? "");
    const [visibility, setVisibility] = useState<Visibility>(p?.visibility ?? "family");
    const [sharedWith, setSharedWith] = useState<string[]>(p?.sharedWith ?? []);
    const [childSafe, setChildSafe] = useState(p?.childSafe ?? true);
    const [valueId, setValueId] = useState(p?.valueId ?? "");
    const [busy, setBusy] = useState(false);
    if (!p) return null;

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setBusy(true);
        try {
            await mutate((r) => r.updatePlaylist(p.id, { name: name.trim(), note: note.trim(), visibility, sharedWith, childSafe, valueId: valueId || null }));
            onClose();
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} title="Edit playlist" wide>
            <form onSubmit={submit} className="flex flex-col gap-4">
                <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
                <Field label="What it's for" value={note} onChange={(e) => setNote(e.target.value)} />
                <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">A value it serves</span>
                    <select value={valueId} onChange={(e) => setValueId(e.target.value)} className="h-11 rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                        <option value="">None in particular</option>
                        {sp.space.values.map((v) => (
                            <option key={v} value={v}>
                                {v}
                            </option>
                        ))}
                    </select>
                </label>
                <VisibilityPicker value={visibility} onChange={setVisibility} sharedWith={sharedWith} onSharedWith={setSharedWith} />
                <div className="rounded-lg bg-page p-3">
                    <label className="flex items-center gap-3 text-sm font-semibold leading-5">
                        <input type="checkbox" checked={childSafe} onChange={(e) => setChildSafe(e.target.checked)} className="size-4 accent-[var(--color-brand)]" />
                        Safe for the children
                    </label>
                    <p className="mt-1 pl-7 text-xs text-caption">Turning this off removes it from every child&apos;s screen immediately.</p>
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy} disabled={!name.trim()}>
                        Save
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

// ---------------------------------------------------------------------------
// Assign
// ---------------------------------------------------------------------------

function AssignDialog({ open, onClose, playlistId }: { open: boolean; onClose: () => void; playlistId: string }) {
    const { state, mutate, sp, toast } = useLearning();
    const p = playlistById(state, playlistId);
    const [ids, setIds] = useState<string[]>(p?.assignedTo ?? []);
    const [busy, setBusy] = useState(false);
    if (!p) return null;
    const childrenSet = ids.some((id) => sp.members.find((m) => m.id === id)?.role === "child");

    return (
        <Dialog open={open} onClose={onClose} title={`Who is ${p.name} for?`}>
            <form
                onSubmit={async (e) => {
                    e.preventDefault();
                    setBusy(true);
                    try {
                        await mutate((r) => r.assignPlaylist(p.id, ids));
                        toast("Saved. They'll be told about it.", "success");
                        onClose();
                    } finally {
                        setBusy(false);
                    }
                }}
                className="flex flex-col gap-4"
            >
                <MemberMultiPicker value={ids} onChange={setIds} label="Set for" roles={["parent", "child"]} />
                {!p.childSafe && childrenSet && <Notice tone="warn">This playlist isn&apos;t marked child-safe, so a child set on it still won&apos;t see it. Turn the flag on in Edit first.</Notice>}
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        Save
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

// ---------------------------------------------------------------------------
// Turn a playlist into a plan
// ---------------------------------------------------------------------------

function PlanDialog({ open, onClose, playlistId, onCreated }: { open: boolean; onClose: () => void; playlistId: string; onCreated: (planId: string) => void }) {
    const { state, mutate, sp } = useLearning();
    const { ask, busy: thinking } = useAi();
    const p = playlistById(state, playlistId);
    const [weeks, setWeeks] = useState(3);
    const [cadence, setCadence] = useState<PlanCadence>("weekly");
    const [assignees, setAssignees] = useState<string[]>(p?.assignedTo.length ? p.assignedTo : [sp.me.id]);
    const [draft, setDraft] = useState<{ title: string; objective: string; steps: Array<{ title: string; minutes: number; activity: string }>; checkQuestions: string[] } | null>(null);
    const [unavailable, setUnavailable] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    if (!p) return null;

    const videos = p.videoIds.map((id) => videoById(state, id)).filter(Boolean) as NonNullable<ReturnType<typeof videoById>>[];

    const propose = async () => {
        setUnavailable(null);
        try {
            const res = await ask({
                action: "learning-plan",
                prompt: `Turn this playlist into a ${weeks}-week plan for ${assignees.map((id) => sp.members.find((m) => m.id === id)?.name.split(" ")[0]).join(" and ")}. One step per lesson, in the given order, plus one short family activity per week.`,
                payload: {
                    playlist: p.name,
                    weeks,
                    cadence,
                    value: p.valueId,
                    lessons: videos.map((v) => ({ title: v.title, channel: v.channel, minutes: Math.round(v.durationS / 60) })),
                },
            });
            if (res.unavailable) {
                setUnavailable(res.unavailable);
                return;
            }
            setDraft(readPlan(res.data, res.text, `${p.name} — ${weeks} weeks`));
        } catch {
            setUnavailable("The companion couldn't answer just now. You can still create the plan from the lessons.");
        }
    };

    const create = async () => {
        setBusy(true);
        try {
            const perWeek = Math.max(1, Math.ceil(videos.length / weeks));
            const items: NewPlanInput["items"] = videos.map((v, i) => ({
                itemType: "video" as const,
                itemId: v.id,
                title: draft?.steps[i]?.title || `Watch: ${v.title}`,
                minutes: draft?.steps[i]?.minutes || Math.max(1, Math.round(v.durationS / 60)),
                week: Math.min(weeks, Math.floor(i / perWeek) + 1),
            }));
            for (const [i, step] of (draft?.steps ?? []).slice(videos.length).entries()) {
                items.push({ itemType: "activity", itemId: null, title: step.title, minutes: step.minutes, week: Math.min(weeks, i + 1) });
            }
            let planId = "";
            await mutate(async (r) => {
                const plan = await r.createPlan({
                    name: draft?.title || `${p.name} — ${weeks} weeks`,
                    objective: draft?.objective ?? "",
                    cadence,
                    assigneeIds: assignees,
                    valueId: p.valueId,
                    startDate: sp.today,
                    weeks,
                    playlistId: p.id,
                    visibility: p.childSafe ? "child" : "family",
                    items,
                });
                planId = plan.id;
            });
            setDraft(null);
            onClose();
            if (planId) onCreated(planId);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} title="Turn this playlist into a plan" wide>
            <div className="flex flex-col gap-4">
                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-1.5">
                        <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">How many weeks</span>
                        <select value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} className="h-11 rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                            {[1, 2, 3, 4, 6, 8].map((w) => (
                                <option key={w} value={w}>
                                    {w} {w === 1 ? "week" : "weeks"}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="flex flex-col gap-1.5">
                        <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">How often</span>
                        <select value={cadence} onChange={(e) => setCadence(e.target.value as PlanCadence)} className="h-11 rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                            {(Object.keys(CADENCE_LABEL) as PlanCadence[]).map((c) => (
                                <option key={c} value={c}>
                                    {CADENCE_LABEL[c]}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
                <MemberMultiPicker value={assignees} onChange={setAssignees} label="For" roles={["parent", "child"]} />

                {unavailable && <Notice tone="info">{unavailable}</Notice>}

                {draft ? (
                    <div className="rounded-lg bg-page p-4">
                        <p className="text-base font-semibold">{draft.title}</p>
                        {draft.objective && <p className="mt-1 text-sm leading-5 text-muted">{draft.objective}</p>}
                        <ol className="mt-3 flex list-decimal flex-col gap-1 pl-5 text-sm">
                            {draft.steps.slice(0, 12).map((s, i) => (
                                <li key={i}>
                                    <span className="font-medium">{s.title}</span> <span className="text-caption">· {s.minutes}m</span>
                                    {s.activity && <span className="block text-caption">{s.activity}</span>}
                                </li>
                            ))}
                        </ol>
                        <p className="mt-3 text-xs text-caption">A proposal. Nothing is written until you press Create.</p>
                    </div>
                ) : (
                    <p className="text-sm leading-5 text-muted">
                        {videos.length} {videos.length === 1 ? "lesson" : "lessons"} spread over {weeks} {weeks === 1 ? "week" : "weeks"}, with real due dates on the family&apos;s Today. Ask the companion for a shape first, or just create it.
                    </p>
                )}

                <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button variant="outline" loading={thinking} onClick={() => void propose()}>
                        <Sparkles size={14} aria-hidden="true" /> {draft ? "Try again" : "Ask the companion"}
                    </Button>
                    <Button loading={busy} disabled={!assignees.length || !videos.length} onClick={() => void create()}>
                        Create plan
                    </Button>
                </div>
            </div>
        </Dialog>
    );
}
