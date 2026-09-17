import { useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CalendarDays, Check, ListPlus, Plus, Sparkles, Trash2 } from "lucide-react";
import type { Visibility } from "@/data/core";
import { cn } from "@/lib/cn";
import { useAi } from "@/lib/ai";
import { Confirm, EmptyModule, MemberAvatar, MemberChips, MemberMultiPicker, Notice, PageTitle, Points, Section, Stat, VisibilityPicker } from "@/components/shared";
import { Ring } from "@/components/ui/charts";
import { Dialog } from "@/components/ui/overlay";
import { Button, Card, Field, Skeleton, Tag } from "@/components/ui/primitives";
import { assignedTo, minutesWatched, monthProgress, nextCandidates, planItemDone, planProgress, planProgressFor, planWeek, videoById, videoDone } from "../derive";
import type { LearningPlan, LessonVideo } from "../types";
import { CADENCE_LABEL, COMPLETE_AT_PCT } from "../types";
import { ImportDialog } from "../components/ImportDialog";
import { LessonRow, PlaylistCard } from "../components/pieces";
import { candidateList, pickFromCandidates } from "../components/ai";
import { useLearning } from "../components/useLearning";

/**
 * The Learning Hub.
 *
 * Parents get the whole shelf: what is due today, the courses, the plans in
 * flight and a companion that will only ever suggest something the family has
 * already saved. A child reaches the same data through a different door —
 * their lessons for today, their shelf, their Sprouts — with no importer, no
 * search box and no route to YouTube's catalogue anywhere in the UI.
 */

// ---------------------------------------------------------------------------
// New playlist
// ---------------------------------------------------------------------------

function NewPlaylistDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const { mutate, sp, toast } = useLearning();
    const [name, setName] = useState("");
    const [note, setNote] = useState("");
    const [visibility, setVisibility] = useState<Visibility>("family");
    const [sharedWith, setSharedWith] = useState<string[]>([]);
    const [childSafe, setChildSafe] = useState(true);
    const [valueId, setValueId] = useState("");
    const [setFor, setSetFor] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            await mutate((r) => r.createPlaylist({ name, note, visibility, sharedWith, childSafe, valueId: valueId || null, assignedTo: setFor }));
            toast(`"${name.trim()}" created`, "success");
            setName("");
            setNote("");
            setSetFor([]);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't create that playlist.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} title="New playlist" wide>
            <form onSubmit={submit} className="flex flex-col gap-4">
                <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Money & Generosity" />
                <Field label="What it's for" value={note} onChange={(e) => setNote(e.target.value)} placeholder="A line the family will read in a year's time" />
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
                <MemberMultiPicker value={setFor} onChange={setSetFor} label="Set for" roles={["parent", "child"]} />
                <div className="rounded-lg bg-page p-3">
                    <label className="flex items-center gap-3 text-sm font-semibold leading-5">
                        <input type="checkbox" checked={childSafe} onChange={(e) => setChildSafe(e.target.checked)} className="size-4 accent-[var(--color-brand)]" />
                        Safe for the children
                    </label>
                    <p className="mt-1 pl-7 text-xs text-caption">Children only ever see a child-safe playlist, whatever the visibility says.</p>
                </div>
                {error && (
                    <p className="text-sm text-danger-ink" role="alert">
                        {error}
                    </p>
                )}
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy} disabled={!name.trim()}>
                        Create playlist
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

// ---------------------------------------------------------------------------
// A plan in flight
// ---------------------------------------------------------------------------

function PlanCard({ plan, expanded, onToggle }: { plan: LearningPlan; expanded: boolean; onToggle: () => void }) {
    const { state, mutate, sp, award } = useLearning();
    const [confirmDelete, setConfirmDelete] = useState(false);
    const manage = sp.can("learning.manage");
    const week = planWeek(plan, sp.today);
    const overall = manage ? planProgress(state, plan) : planProgressFor(state, plan, sp.me.id);
    const weeks = [...new Set(plan.items.map((i) => i.week))].sort((a, b) => a - b);
    // A child ticks their own row only; a parent may tick for anyone.
    const people = manage ? plan.assigneeIds : plan.assigneeIds.filter((id) => id === sp.me.id);
    const nameOf = (id: string): string => sp.members.find((m) => m.id === id)?.name ?? "Member";

    return (
        <Card as="li" className="p-0">
            <button type="button" onClick={onToggle} aria-expanded={expanded} className="flex w-full items-center gap-4 p-4 text-left">
                <Ring pct={overall.pct} size={52} stroke={3} label={`${plan.name}: ${overall.pct}%`}>
                    <span className="text-xs font-semibold tabular-nums">{overall.pct}%</span>
                </Ring>
                <span className="min-w-0 flex-1">
                    <span className="block text-base font-semibold">{plan.name}</span>
                    <span className="mt-0.5 block text-xs text-caption">
                        {CADENCE_LABEL[plan.cadence]} · week {week} · {overall.done}/{overall.total} done
                        {plan.valueId ? ` · ${plan.valueId}` : ""}
                    </span>
                </span>
                <MemberChips memberIds={plan.assigneeIds} max={4} />
            </button>

            {expanded && (
                <div className="border-t border-line px-4 pb-4 pt-3">
                    {plan.objective && <p className="mb-3 text-sm leading-5 text-muted">{plan.objective}</p>}
                    {weeks.map((w) => (
                        <div key={w} className="mb-3 last:mb-0">
                            <h4 className={cn("mb-1.5 text-xs font-semibold uppercase tracking-[0.08em]", w === week ? "text-brand" : "text-caption")}>
                                Week {w}
                                {w === week ? " · this week" : ""}
                            </h4>
                            <ul className="flex flex-col gap-1">
                                {plan.items
                                    .filter((i) => i.week === w)
                                    .map((item) => {
                                        const video = item.itemId ? videoById(state, item.itemId) : undefined;
                                        const isVideo = item.itemType === "video" && Boolean(item.itemId);
                                        return (
                                            <li key={item.id} className="flex flex-wrap items-center gap-2 rounded-md px-2 py-1.5 hover:bg-page">
                                                <span className="flex min-w-0 flex-1 items-center gap-2">
                                                    {video ? (
                                                        <Link to={`/grow/learning/lessons/${video.id}`} className="min-w-0 truncate text-md font-medium hover:underline">
                                                            {item.title}
                                                        </Link>
                                                    ) : (
                                                        <span className="min-w-0 truncate text-md font-medium">{item.title}</span>
                                                    )}
                                                    <span className="shrink-0 text-2xs text-caption">
                                                        {item.minutes}m · {item.dueDate}
                                                    </span>
                                                </span>
                                                <span className="flex shrink-0 items-center gap-1.5">
                                                    {people.map((memberId) => {
                                                        const done = planItemDone(state, item, memberId);
                                                        // Watching completes a video item; only a parent may mark one by hand.
                                                        const may = done ? manage || memberId === sp.me.id : isVideo ? manage : manage || memberId === sp.me.id;
                                                        return (
                                                            <button
                                                                key={memberId}
                                                                type="button"
                                                                disabled={!may}
                                                                aria-pressed={done}
                                                                title={`${nameOf(memberId)}: ${done ? "done" : isVideo ? `not yet — ${COMPLETE_AT_PCT}% watched, or a parent's mark` : "not yet"}`}
                                                                onClick={() => void award((r) => r.setPlanItemDone(plan.id, item.id, memberId, !done), memberId, `Learning: ${item.title}`)}
                                                                className={cn("grid size-7 place-items-center rounded-full border transition-colors", done ? "border-brand bg-brand text-white" : "border-line-strong text-transparent hover:border-ink", !may && "opacity-40")}
                                                            >
                                                                <Check size={13} strokeWidth={3} aria-hidden="true" />
                                                                <span className="sr-only">{nameOf(memberId)}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </span>
                                            </li>
                                        );
                                    })}
                            </ul>
                        </div>
                    ))}
                    {manage && (
                        <div className="mt-3 flex justify-end">
                            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)}>
                                <Trash2 size={14} aria-hidden="true" /> Delete plan
                            </Button>
                        </div>
                    )}
                    <Confirm open={confirmDelete} title={`Delete "${plan.name}"?`} body="The lessons stay; only the schedule goes." confirmLabel="Delete plan" danger onClose={() => setConfirmDelete(false)} onConfirm={() => mutate((r) => r.removePlan(plan.id))} />
                </div>
            )}
        </Card>
    );
}

// ---------------------------------------------------------------------------
// Suggested next — from saved lessons only
// ---------------------------------------------------------------------------

function SuggestNext() {
    const { state, sp, ctx } = useLearning();
    const { ask, busy, available } = useAi();
    const [chosen, setChosen] = useState<LessonVideo | null>(null);
    const [why, setWhy] = useState("");
    const [unavailable, setUnavailable] = useState<string | null>(null);
    const candidates = useMemo(() => nextCandidates(state, ctx), [state, ctx]);

    if (!candidates.length) return null;

    const suggest = async () => {
        setUnavailable(null);
        const fallback = candidates[0];
        const local = () => {
            setChosen(fallback);
            setWhy("Picked from your saved lessons.");
        };
        if (!available) return local();
        try {
            const res = await ask({
                action: "ask",
                prompt: `Choose exactly one lesson for ${sp.me.name.split(" ")[0]} to watch next. Reply with its number, then one short sentence saying why. Choose only from the numbered list.`,
                extraContext: `Saved lessons to choose from (no other video exists for this family):\n${candidateList(candidates)}`,
            });
            if (res.unavailable) {
                setUnavailable(res.unavailable);
                return local();
            }
            setChosen(pickFromCandidates(res.text, res.data, candidates) ?? fallback);
            setWhy(res.text.replace(/^\s*\d+[.)]\s*/, "").trim() || "Picked from your saved lessons.");
        } catch {
            local();
        }
    };

    return (
        <Card className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
                    <Sparkles size={15} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold">What next?</h3>
                    {/* The number is the shelf, not the shortlist: `candidates` is capped. */}
                    <p className="text-xs text-caption">Only ever from the {state.videos.length} lessons you have saved — never from YouTube.</p>
                </div>
                <Button size="sm" variant="outline" loading={busy} onClick={() => void suggest()}>
                    Suggest
                </Button>
            </div>
            {unavailable && <Notice tone="info">{unavailable}</Notice>}
            {chosen && (
                <ul>
                    <LessonRow state={state} video={chosen} memberId={sp.me.id} meta={why} big />
                </ul>
            )}
        </Card>
    );
}

// ---------------------------------------------------------------------------
// The guest's hub — named objects, never a module
// ---------------------------------------------------------------------------

/**
 * A guest reaches this page only when a parent has granted "Join learning",
 * and what they hold is not the module: it is the shelves the family set for
 * them or named them on, and the lessons inside those. The slice they are
 * given already contains nothing else (derive.canSeePlaylist), so this screen
 * has no filtering of its own to do — it simply says so out loud.
 */
function GuestHub() {
    const { state, sp } = useLearning();
    const mine = assignedTo(state, sp.me.id);

    return (
        <div>
            <PageTitle title="Learning" sub="What the family has shared with you." area="grow" />

            {state.playlists.length || mine.length ? (
                <>
                    <Notice tone="info" className="mb-6">
                        You can see the shelves the Adeyemis set for you by name — not the rest of the family&apos;s learning.
                    </Notice>

                    {mine.length > 0 && (
                        <Section title="Set for you">
                            <Card className="p-2">
                                <ul className="flex flex-col gap-1">
                                    {mine.slice(0, 5).map(({ video, item, playlist }) => (
                                        <LessonRow key={video.id} state={state} video={video} memberId={sp.me.id} big meta={item ? `Due ${item.dueDate}` : playlist?.name} />
                                    ))}
                                </ul>
                            </Card>
                        </Section>
                    )}

                    <Section title="Shared with you">
                        {state.playlists.length ? (
                            <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {state.playlists.map((p) => (
                                    <PlaylistCard key={p.id} state={state} p={p} memberId={sp.me.id} />
                                ))}
                            </ul>
                        ) : (
                            <EmptyModule title="No shelves yet" body="Lessons set for you will appear here." />
                        )}
                    </Section>
                </>
            ) : (
                <EmptyModule title="Nothing has been shared with you yet" body="When the family sets a playlist or a lesson for you by name, it appears here — and nothing else does." />
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// The child's hub
// ---------------------------------------------------------------------------

function ChildHub() {
    const { state, sp } = useLearning();
    const mine = assignedTo(state, sp.me.id);
    const shelves = state.playlists.filter((p) => p.assignedTo.includes(sp.me.id) || p.ownerMemberId === sp.me.id);
    const finished = state.completions.filter((c) => c.itemType === "video" && c.memberId === sp.me.id && c.completedAt).length;

    return (
        <div>
            <PageTitle title="Learning" sub="Your lessons, your shelf, and how far you've come." area="grow" actions={<Points n={sp.me.points} />} />

            <Section title={mine.length ? "Watch today" : "Nothing set for today"}>
                {mine.length ? (
                    <ul className="flex flex-col gap-1 rounded-xl bg-card p-2">
                        {mine.slice(0, 4).map(({ video, item, playlist }) => (
                            <LessonRow key={video.id} state={state} video={video} memberId={sp.me.id} big meta={item ? `Due ${item.dueDate}` : playlist ? playlist.name : undefined} />
                        ))}
                    </ul>
                ) : (
                    <EmptyModule title="All done" body="Every lesson you were set is finished. Well done." />
                )}
            </Section>

            <Section title="Your shelf">
                {shelves.length ? (
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                        {shelves.map((p) => (
                            <PlaylistCard key={p.id} state={state} p={p} memberId={sp.me.id} />
                        ))}
                    </ul>
                ) : (
                    <EmptyModule title="No playlists yet" body="A parent will set one for you." />
                )}
            </Section>

            <Section title="How you're doing">
                <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-3">
                    <Stat label="Lessons finished" value={finished} tone="grow" />
                    <Stat label="Minutes watched" value={minutesWatched(state, sp.me.id)} />
                    <Stat label="Sprouts" value={sp.me.points} tone="ok" />
                </div>
            </Section>
        </div>
    );
}

// ---------------------------------------------------------------------------
// The page
// ---------------------------------------------------------------------------

export default function LearningPage() {
    const { state, loading, error, sp } = useLearning();
    const [params, setParams] = useSearchParams();
    const [importing, setImporting] = useState(false);
    const [creating, setCreating] = useState(false);
    const openPlan = params.get("plan");

    if (loading)
        return (
            <div className="flex flex-col gap-4" aria-busy="true">
                <Skeleton className="h-9 w-64" />
                <Skeleton className="h-32" />
                <Skeleton className="h-64" />
            </div>
        );

    if (sp.role === "guest") return <GuestHub />;

    if (sp.role === "child" && !sp.can("learning.manage")) return <ChildHub />;

    const manage = sp.can("learning.manage");
    const month = monthProgress(state, sp.today, manage ? undefined : sp.me.id);
    const mine = assignedTo(state, sp.me.id);
    const dueForOthers = state.plans.flatMap((plan) =>
        plan.items
            .filter((i) => i.dueDate <= sp.today)
            .flatMap((item) => plan.assigneeIds.filter((memberId) => memberId !== sp.me.id && !planItemDone(state, item, memberId)).map((memberId) => ({ plan, item, memberId }))),
    );
    const recent = [...state.videos].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

    return (
        <div>
            <PageTitle
                title="Learning Hub"
                sub="Everything worth watching, kept: playlists that behave like courses, notes pinned to the second, and plans that show up on the family's day."
                area="grow"
                actions={
                    manage ? (
                        <>
                            <Button variant="outline" size="md" onClick={() => setCreating(true)}>
                                <ListPlus size={15} aria-hidden="true" /> New playlist
                            </Button>
                            <Button size="md" onClick={() => setImporting(true)}>
                                <Plus size={15} aria-hidden="true" /> Add a lesson
                            </Button>
                        </>
                    ) : undefined
                }
            />

            {error && (
                <Notice tone="danger" className="mb-6">
                    {error}
                </Notice>
            )}

            {!state.videos.length ? (
                <EmptyModule
                    title="No lessons saved yet"
                    body="Paste a YouTube link and Wàfè keeps the title, the channel, the length — and everything the family learns from it."
                    action={manage ? <Button onClick={() => setImporting(true)}>Add the first lesson</Button> : undefined}
                />
            ) : (
                <>
                    <div className="mb-8 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <Stat label="Lessons" value={state.videos.length} sub={`in ${state.playlists.length} playlists`} />
                        <Stat label="This month" value={`${month.pct}%`} sub={`${month.done} of ${month.total} plan items`} tone="grow" />
                        <Stat label="Your minutes" value={minutesWatched(state, sp.me.id)} sub="lesson time watched" />
                        <Stat label="Notes" value={state.notes.length} sub="pinned to a second" tone="ok" />
                    </div>

                    <Section title="Learning for today" action={<span className="text-xs text-caption">Counted done at {COMPLETE_AT_PCT}% watched</span>}>
                        {mine.length || dueForOthers.length ? (
                            <Card className="p-2">
                                <ul className="flex flex-col gap-1">
                                    {mine.slice(0, 4).map(({ video, item, playlist }) => (
                                        <LessonRow key={video.id} state={state} video={video} memberId={sp.me.id} meta={item ? `${item.title} · due ${item.dueDate}` : playlist?.name} />
                                    ))}
                                </ul>
                                {manage && dueForOthers.length > 0 && (
                                    <ul className="mt-2 flex flex-col gap-1 border-t border-line pt-2">
                                        {dueForOthers.slice(0, 5).map(({ plan, item, memberId }) => (
                                            <li key={`${item.id}-${memberId}`} className="flex items-center gap-3 rounded-md px-2 py-2">
                                                <MemberAvatar memberId={memberId} size="xs" />
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-md font-medium">{item.title}</span>
                                                    <span className="block text-xs text-caption">
                                                        {plan.name} · due {item.dueDate}
                                                    </span>
                                                </span>
                                                {item.dueDate < sp.today && <Tag tone="warn">Late</Tag>}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Card>
                        ) : (
                            <EmptyModule title="Nothing due" body="Every plan item set for today is done." />
                        )}
                    </Section>

                    <Section
                        title="Playlists"
                        action={
                            manage ? (
                                <Button size="sm" variant="ghost" onClick={() => setCreating(true)}>
                                    New
                                </Button>
                            ) : undefined
                        }
                    >
                        <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {state.playlists.map((p) => (
                                <PlaylistCard key={p.id} state={state} p={p} memberId={sp.me.id} />
                            ))}
                        </ul>
                        {!state.playlists.length && <EmptyModule title="No playlists yet" body="A playlist is a course: an ordered shelf you can set for someone." action={manage ? <Button onClick={() => setCreating(true)}>New playlist</Button> : undefined} />}
                    </Section>

                    <Section title="Plans" action={<span className="text-xs text-caption">Built from a playlist</span>}>
                        {state.plans.length ? (
                            <ul className="flex flex-col gap-3">
                                {state.plans.map((plan) => (
                                    <PlanCard
                                        key={plan.id}
                                        plan={plan}
                                        expanded={openPlan === plan.id}
                                        onToggle={() => {
                                            const next = new URLSearchParams(params);
                                            if (openPlan === plan.id) next.delete("plan");
                                            else next.set("plan", plan.id);
                                            setParams(next, { replace: true });
                                        }}
                                    />
                                ))}
                            </ul>
                        ) : (
                            <EmptyModule
                                title="No learning plans yet"
                                body="Open a playlist and ask the companion to turn it into weeks — it becomes real dates on the family's Today."
                                action={
                                    state.playlists[0] ? (
                                        <Link to={`/grow/learning/playlists/${state.playlists[0].id}`} className="inline-flex h-11 items-center rounded-full bg-brand px-5 text-md font-semibold text-white hover:bg-brand-hover">
                                            Open a playlist
                                        </Link>
                                    ) : undefined
                                }
                            />
                        )}
                    </Section>

                    <div className="mb-8 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
                        <SuggestNext />
                        <Card>
                            <h3 className="mb-3 flex items-center gap-2 text-base font-semibold">
                                <CalendarDays size={15} aria-hidden="true" /> Recently added
                            </h3>
                            <ul className="flex flex-col gap-1">
                                {recent.map((v) => (
                                    <LessonRow key={v.id} state={state} video={v} memberId={sp.me.id} meta={videoDone(state, v.id, sp.me.id) ? "Watched" : undefined} />
                                ))}
                            </ul>
                        </Card>
                    </div>
                </>
            )}

            <ImportDialog open={importing} onClose={() => setImporting(false)} />
            <NewPlaylistDialog open={creating} onClose={() => setCreating(false)} />
        </div>
    );
}
