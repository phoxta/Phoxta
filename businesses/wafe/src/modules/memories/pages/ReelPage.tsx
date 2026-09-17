import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CalendarClock, ChevronDown, ChevronUp, Images, Music2, Pencil, Play, Share2, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { shortDate } from "@/lib/format";
import { useModule, useModuleState } from "@/state/data";
import { useSpace } from "@/state/space";
import { Confirm, MemberChips, Notice, PageTitle, Section } from "@/components/shared";
import { Button, Field, ProgressBar, Tag } from "@/components/ui/primitives";
import memoriesModule from "../module";
import { HREF, frameMs, grantsFor, ourYearFor, playHref, reelMs, reelSlides, runTime } from "../derive";
import { MEDIA_PLANS, PERF, REEL_MOOD, REEL_TRANSITION, type StudioSlice } from "../types";
import { BackLink, Blank, PhotoImg } from "../components/pieces";
import { PickPhotosDialog, ReelDialog, ShareDialog } from "../components/dialogs";

/**
 * A reel, before it is watched.
 *
 * The editor is deliberately plain: the frames in order, a caption on each,
 * an optional hold that overrides the reel's own, and the two buttons that
 * matter — watch it, and share it. Everything about the reel that a family
 * would argue over (how long a picture holds, what happens between them, which
 * song) is one dialog away, and the run time updates as they change it.
 *
 * The "Our year" draft lives here too. It is scheduled to write itself on
 * 1 December; the button beside the date runs the same function a day early,
 * so the behaviour is something you can watch rather than something you are
 * told about.
 */
export default function ReelPage() {
    const { id = "" } = useParams();
    const { state, repo, mutate, reload, loading, error } = useModule(memoriesModule);
    const { can, today, role } = useSpace();
    const studio = useModuleState<StudioSlice>("studio");
    const navigate = useNavigate();

    const [editOpen, setEditOpen] = useState(false);
    const [pickOpen, setPickOpen] = useState(false);
    const [shareOpen, setShareOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [captionOf, setCaptionOf] = useState<string | null>(null);
    const [captionText, setCaptionText] = useState("");
    const [note, setNote] = useState<string | null>(null);

    const reel = state?.reels.find((r) => r.id === id);
    const slides = useMemo(() => (state && reel ? reelSlides(state, reel.id) : []), [state, reel]);

    if (loading && !state) return <p className="text-md text-muted">Opening the reel…</p>;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state) return null;
    if (!reel) {
        return (
            <div>
                <BackLink to={HREF}>All reels</BackLink>
                <Blank title="That reel isn't here" body="It may have been removed, or it may never have been shared with you." />
            </div>
        );
    }

    const manage = can("memories.manage");
    const total = reelMs(state, reel);
    const plan = MEDIA_PLANS[state.plan];
    const over = Math.max(0, slides.length - plan.maxFrames);
    const granted = grantsFor(state, "reel", reel.id);
    const track = studio?.items.find((i) => i.id === reel.trackItemId);
    const scheduledYear = ourYearFor(today);

    return (
        <div>
            <BackLink to={HREF}>All reels</BackLink>

            <PageTitle
                title={reel.title}
                sub={reel.subtitle || `${slides.length} frames · ${runTime(total)}`}
                area="create"
                actions={
                    <>
                        {slides.length > 0 && (
                            <Button size="md" onClick={() => navigate(playHref(reel.id))}>
                                <Play size={15} fill="currentColor" aria-hidden="true" /> Watch it
                            </Button>
                        )}
                        {manage && (
                            <Button variant="outline" size="md" onClick={() => setShareOpen(true)}>
                                <Share2 size={15} aria-hidden="true" /> Share
                            </Button>
                        )}
                    </>
                }
            />

            {note && (
                <Notice tone="ok" className="mb-6">
                    {note}
                </Notice>
            )}

            {/* The scheduled December draft (AC 8) */}
            {reel.autoKind === "our_year" && reel.scheduledFor && slides.length === 0 && (
                <div className="mb-8 rounded-xl bg-live-soft p-5">
                    <div className="flex items-start gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-live text-white">
                            <CalendarClock size={18} aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="font-display text-[19px] leading-6 text-live-ink">It writes itself on {shortDate(reel.scheduledFor)}</p>
                            <p className="mt-1 text-md leading-6 text-live-ink/85">
                                On the first of December, Wàfè takes this year's timeline — every album, celebration, answered prayer, badge, milestone and trip that had a picture — and drafts them into a reel, in the order they happened. Nobody has to remember to do it, and nothing is published: it arrives as a draft for you to change.
                            </p>
                            {manage && (
                                <Button
                                    className="mt-3"
                                    size="md"
                                    variant="outline"
                                    onClick={() =>
                                        void mutate(async (r) => {
                                            const made = await r.draftOurYear(scheduledYear);
                                            setNote(made ? `Drafted from the ${scheduledYear} timeline — exactly what December would have done.` : "There isn't enough of this year in the library yet.");
                                        })
                                    }
                                >
                                    Draft it now
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* How it plays */}
            <div className="mb-8 grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-4">
                <div className="rounded-lg bg-card p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted">Runs for</p>
                    <p className="mt-1 font-display text-4xl leading-8">{runTime(total)}</p>
                    <p className="text-xs text-caption">{slides.length} frames</p>
                </div>
                <div className="rounded-lg bg-card p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted">Mood</p>
                    <p className="mt-1 font-display text-4xl leading-8">{REEL_MOOD[reel.mood].label}</p>
                    <p className="text-xs text-caption">{REEL_TRANSITION[reel.transition].label.toLowerCase()} between</p>
                </div>
                <div className="rounded-lg bg-card p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted">Track</p>
                    <p className="mt-1 flex items-center gap-1.5 font-display text-[19px] leading-8">
                        <Music2 size={15} aria-hidden="true" /> {reel.trackTitle || "None"}
                    </p>
                    <p className="text-xs text-caption">{track ? "Plays from the studio recording" : reel.trackNote || "A credit line — nothing is downloaded"}</p>
                </div>
                <div className="rounded-lg bg-card p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted">Status</p>
                    <p className="mt-1 font-display text-4xl leading-8">{reel.status === "ready" ? "Ready" : "Draft"}</p>
                    <ProgressBar value={reel.status === "ready" ? 100 : slides.length ? 60 : 10} label="Reel readiness" className="mt-2" />
                </div>
            </div>

            {over > 0 && (
                <Notice tone="warn" className="mb-6">
                    {plan.name} plays {plan.maxFrames} frames; this reel has {slides.length}. The last {over} won&apos;t play until you move up a plan or take some out.
                </Notice>
            )}

            {manage && (
                <div className="mb-6 flex flex-wrap gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditOpen(true)}>
                        <Pencil size={13} aria-hidden="true" /> How it plays
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setPickOpen(true)}>
                        <Images size={13} aria-hidden="true" /> Choose the pictures
                    </Button>
                    {reel.status === "draft" && slides.length > 0 && (
                        <Button size="sm" variant="outline" onClick={() => void mutate((r) => r.publishReel(reel.id))}>
                            Mark it ready
                        </Button>
                    )}
                    {reel.status === "ready" && (
                        <Button size="sm" variant="ghost" onClick={() => void mutate((r) => r.updateReel(reel.id, { status: "draft" }))}>
                            Back to draft
                        </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)}>
                        <Trash2 size={13} aria-hidden="true" /> Delete
                    </Button>
                </div>
            )}

            {granted.length > 0 && (
                <p className="mb-6 inline-flex items-center gap-2 text-xs text-caption">
                    Shared with <MemberChips memberIds={granted} />
                </p>
            )}

            {/* The frames */}
            <Section title="The frames">
                {slides.length ? (
                    <ol className="space-y-2">
                        {slides.map(({ frame, photo }, i) => (
                            <li key={frame.id} className={cn("flex flex-wrap items-center gap-3 rounded-lg bg-card p-3", i >= plan.maxFrames && "opacity-45")}>
                                <span className="w-6 shrink-0 text-center text-xs tabular-nums text-caption">{i + 1}</span>
                                <span className="size-16 shrink-0 overflow-hidden rounded-sm bg-subtle">
                                    <PhotoImg photo={photo} className="size-full object-cover" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    {captionOf === frame.id ? (
                                        <form
                                            className="flex flex-wrap items-end gap-2"
                                            onSubmit={(e) => {
                                                e.preventDefault();
                                                void mutate((r) => r.updateFrame(frame.id, { caption: captionText.trim() })).then(() => setCaptionOf(null));
                                            }}
                                        >
                                            <Field className="min-w-[180px] flex-1" label="Caption" value={captionText} onChange={(e) => setCaptionText(e.target.value)} placeholder={photo.caption || "What is happening here"} />
                                            <Button type="submit" size="sm">
                                                Save
                                            </Button>
                                            <Button type="button" size="sm" variant="ghost" onClick={() => setCaptionOf(null)}>
                                                Cancel
                                            </Button>
                                        </form>
                                    ) : (
                                        <>
                                            <span className="block text-md font-medium leading-5">{frame.caption || photo.caption || <span className="text-caption">No caption</span>}</span>
                                            <span className="block text-xs text-caption">
                                                {shortDate(photo.takenAt)}
                                                {photo.place ? ` · ${photo.place}` : ""} · holds {(frameMs(reel, frame) / 1000).toFixed(1)}s
                                            </span>
                                        </>
                                    )}
                                </span>
                                {manage && captionOf !== frame.id && (
                                    <span className="flex shrink-0 items-center gap-1">
                                        <button
                                            type="button"
                                            aria-label="Caption this frame"
                                            onClick={() => {
                                                setCaptionOf(frame.id);
                                                setCaptionText(frame.caption);
                                            }}
                                            className="grid size-8 place-items-center rounded-full border border-line-strong text-muted hover:text-ink"
                                        >
                                            <Pencil size={13} aria-hidden="true" />
                                        </button>
                                        <button type="button" aria-label="Move earlier" disabled={i === 0} onClick={() => void mutate((r) => r.moveFrame(frame.id, -1))} className="grid size-8 place-items-center rounded-full border border-line-strong text-muted hover:text-ink disabled:opacity-30">
                                            <ChevronUp size={14} aria-hidden="true" />
                                        </button>
                                        <button type="button" aria-label="Move later" disabled={i === slides.length - 1} onClick={() => void mutate((r) => r.moveFrame(frame.id, 1))} className="grid size-8 place-items-center rounded-full border border-line-strong text-muted hover:text-ink disabled:opacity-30">
                                            <ChevronDown size={14} aria-hidden="true" />
                                        </button>
                                        <button type="button" aria-label="Take this frame out" onClick={() => void mutate((r) => r.removeFrame(frame.id))} className="grid size-8 place-items-center rounded-full border border-line-strong text-muted hover:text-danger-ink">
                                            <Trash2 size={13} aria-hidden="true" />
                                        </button>
                                    </span>
                                )}
                            </li>
                        ))}
                    </ol>
                ) : (
                    <Blank
                        icon={<Images size={20} aria-hidden="true" />}
                        title="No frames yet"
                        body="Choose the pictures, or start from an album — a reel is an album played, with captions and a slow drift."
                        action={manage ? <Button onClick={() => setPickOpen(true)}>Choose the pictures</Button> : undefined}
                    />
                )}
            </Section>

            <p className="mt-8 text-xs leading-5 text-caption">
                A reel is a playlist, not a video: nothing is encoded and there is no file to download. It plays here, and a link plays it wherever it is opened. Target {PERF.targetFps} fps, first frame under {PERF.startMs / 1000} s — {PERF.device} Open Details while it plays to see what your own device is doing.
            </p>

            <ReelDialog open={editOpen} onClose={() => setEditOpen(false)} initial={reel} onSave={(d) => mutate((r) => r.updateReel(reel.id, d))} />
            <PickPhotosDialog
                open={pickOpen}
                onClose={() => setPickOpen(false)}
                state={state}
                title="The pictures in this reel"
                max={plan.maxFrames}
                initial={slides.map((sl) => sl.photo.id)}
                onDone={(ids) => mutate((r) => r.setFrames(reel.id, ids.map((photoId) => ({ photoId }))))}
            />
            <ShareDialog
                open={shareOpen}
                onClose={() => setShareOpen(false)}
                state={state}
                objectType="reel"
                objectId={reel.id}
                name={reel.title}
                today={today}
                onGrant={(ids) => mutate((r) => r.grant("reel", reel.id, ids))}
                onCreateLink={async (days) => {
                    const link = await repo.createLink("reel", reel.id, days);
                    await reload();
                    return link;
                }}
                onRevokeLink={(linkId) => mutate((r) => r.revokeLink(linkId))}
            />
            <Confirm
                open={confirmDelete}
                onClose={() => setConfirmDelete(false)}
                title={`Delete "${reel.title}"?`}
                body="The reel goes; every picture in it stays in the library. Its links stop working straight away."
                confirmLabel="Delete the reel"
                danger
                onConfirm={async () => {
                    await mutate((r) => r.removeReel(reel.id));
                    navigate(HREF);
                }}
            />

            {role === "child" && (
                <p className="mt-6 text-sm text-muted">
                    <Link to={playHref(reel.id)} className="font-semibold text-brand underline underline-offset-4">
                        Watch it full screen
                    </Link>
                </p>
            )}

            {reel.storyboardId && <Tag tone="create" className="mt-6">From a storyboard in the studio</Tag>}
        </div>
    );
}
