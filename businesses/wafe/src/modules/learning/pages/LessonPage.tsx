import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, ListChecks, MessageCircleQuestion, Plus, ShieldCheck, Sparkles, StickyNote, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { clock, duration, isoDate } from "@/lib/format";
import { useAi } from "@/lib/ai";
import { Confirm, EmptyModule, MemberAvatar, MemberPicker, Notice, PageTitle, Section } from "@/components/shared";
import { YouTubePlayer } from "@/components/player/YouTubePlayer";
import { Button, Card, Field, IconButton, Kbd, ProgressBar, Skeleton, Tag } from "@/components/ui/primitives";
import { completionFor, nextCandidates, notesFor, resumeAt, tasksFor, videoById, videoDone, videoPct } from "../derive";
import type { LessonVideo, TranscriptSource } from "../types";
import { COMPLETE_AT_PCT, SEEK_TOLERANCE_S, SOURCE_LABEL } from "../types";
import { LessonRow, SourceTag } from "../components/pieces";
import { readSummary } from "../components/ai";
import { useLearning } from "../components/useLearning";

/**
 * One lesson: watch it, think out loud at a timestamp, and turn what it said
 * into things the family will actually do.
 *
 * Progress is written as you watch and the lesson is only ever counted
 * finished at 80 % — or by a parent's own mark, which is recorded as such.
 * Press N at any point and the note takes the second you are on; click a note
 * and the player goes back to it.
 */

const NOTE_KEY = "n";

function LessonBody({ video }: { video: LessonVideo }) {
    const { state, mutate, sp, ctx, toast, award } = useLearning();
    const { ask, busy: thinking } = useAi();
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const deepLinkAt = Number(params.get("t") || 0);

    // The player is recreated when `seek.n` changes, which is how a note gets
    // you back to its second (exactly, so well inside the ±1s the brief asks).
    const [seek, setSeek] = useState(() => ({ at: deepLinkAt > 0 ? deepLinkAt : resumeAt(state, video, sp.me.id), n: 0 }));
    const position = useRef(seek.at);
    const lastSaved = useRef(seek.at);
    const [tick, setTick] = useState(seek.at);

    const [noteOpen, setNoteOpen] = useState(false);
    const [noteAt, setNoteAt] = useState(0);
    const [noteText, setNoteText] = useState("");
    const [transcript, setTranscript] = useState(video.transcript);
    const [transcriptOpen, setTranscriptOpen] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [confirmAdults, setConfirmAdults] = useState(false);
    const [taskFor, setTaskFor] = useState<string | null>(null);

    const manage = sp.can("learning.manage");
    const notes = notesFor(state, video.id);
    const tasks = tasksFor(state, video.id);
    const mine = completionFor(state, "video", video.id, sp.me.id);
    const done = videoDone(state, video.id, sp.me.id);
    const pct = videoPct(state, video.id, sp.me.id);
    // The label the family will see, decided by what the companion will actually
    // be given: saved captions, or captions pasted into the box and not yet saved.
    const source: TranscriptSource = (video.transcript || transcript).trim() ? "captions" : "ai_from_description";

    // ---- Watching --------------------------------------------------------
    const save = useCallback(
        (posSec: number, durSec: number) => {
            lastSaved.current = posSec;
            void award((r) => r.recordProgress(video.id, posSec, durSec || video.durationS), sp.me.id, `Lesson: ${video.title}`);
        },
        [award, video.id, video.durationS, video.title, sp.me.id],
    );

    // Whether this member has already been credited, read inside the callback
    // without making the player remount on every save.
    const doneRef = useRef(done);
    doneRef.current = done;

    const onProgress = useCallback(
        (posSec: number, durSec: number) => {
            position.current = posSec;
            setTick(posSec);
            const total = durSec || video.durationS;
            // Crossing the completion line writes at once, whatever the
            // throttle would have said: someone who watches past 80 % and
            // stops eight seconds later has finished the lesson, and the app
            // must not need another ten seconds of their evening to agree.
            const crossed = total > 0 && (posSec / total) * 100 >= COMPLETE_AT_PCT;
            // Otherwise ten-second granularity: enough to resume from, gentle on writes.
            if ((crossed && !doneRef.current) || Math.abs(posSec - lastSaved.current) >= 10) save(posSec, durSec);
        },
        [save, video.durationS],
    );

    const openNote = useCallback(() => {
        setNoteAt(Math.round(position.current));
        setNoteText("");
        setNoteOpen(true);
    }, []);

    // Press N while watching to capture the second you are on.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() !== NOTE_KEY || e.metaKey || e.ctrlKey || e.altKey) return;
            const el = e.target as HTMLElement | null;
            const tag = el?.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable) return;
            e.preventDefault();
            openNote();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [openNote]);

    const addNote = async (e: FormEvent) => {
        e.preventDefault();
        if (!noteText.trim()) return;
        await mutate((r) => r.addNote(video.id, noteAt, noteText));
        setNoteOpen(false);
        setNoteText("");
        toast(`Note saved at ${clock(noteAt)}`, "success");
    };

    // ---- The companion ----------------------------------------------------
    const summarise = async (forBand?: string) => {
        setAiError(null);
        try {
            const res = await ask({
                action: "summarize",
                prompt: forBand ? `Write the discussion prompts for a ${forBand}. Keep the takeaways for the adults.` : undefined,
                payload: {
                    title: video.title,
                    source: "youtube",
                    channel: video.channel,
                    minutes: Math.round(video.durationS / 60),
                    transcript: video.transcript || transcript,
                    description: video.description,
                    notes: notes.map((x) => `${clock(x.timestampS)} ${x.text}`),
                },
            });
            if (res.unavailable) {
                setAiError(res.unavailable);
                return;
            }
            await mutate((r) => r.saveSummary(video.id, readSummary(res.data, res.text, source, res.model)));
            toast("Summary saved", "success");
        } catch {
            setAiError("The companion couldn't summarise that just now.");
        }
    };

    const saveTranscript = async () => {
        await mutate((r) => r.updateVideo(video.id, { transcript: transcript.trim(), transcriptSource: transcript.trim() ? "captions" : null, captionsAvailable: Boolean(transcript.trim()) }));
        setTranscriptOpen(false);
        toast("Captions saved — summaries will be labelled “captions”.", "success");
    };

    const suggestions = useMemo(() => nextCandidates(state, ctx, 5).filter((v) => v.id !== video.id).slice(0, 4), [state, ctx, video.id]);

    // ---- The way out to YouTube ------------------------------------------
    // The lesson plays here; only a parent gets a door out of it. The shared
    // player prints a "Watch on YouTube" link in its chrome, so for everyone
    // else this wrapper takes it out of the page and swallows any click that
    // still reaches an outbound link — one line from a child's lesson to
    // YouTube's search box is the whole of acceptance criterion 8.
    const mayLeave = sp.role === "parent";
    const keepThemHere = (e: MouseEvent<HTMLDivElement>) => {
        const link = (e.target as HTMLElement | null)?.closest?.("a");
        if (link && /youtube\.com|youtu\.be/i.test(link.getAttribute("href") ?? "")) {
            e.preventDefault();
            e.stopPropagation();
        }
    };

    const setChildSafe = async (next: boolean) => {
        await mutate((r) => r.updateVideo(video.id, { childSafe: next }));
        toast(next ? "Marked child-safe — the children can see this lesson." : "Marked adults only — it has left every child's shelf.", "success");
    };

    return (
        <div>
            <Link to="/grow/learning" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
                <ArrowLeft size={14} aria-hidden="true" /> Learning Hub
            </Link>

            <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="min-w-0">
                    <div className={cn(!mayLeave && "[&_a]:hidden")} onClickCapture={mayLeave ? undefined : keepThemHere}>
                        <YouTubePlayer
                            key={`${video.id}:${seek.n}`}
                            videoId={video.youtubeId}
                            title={video.title}
                            source={video.channel}
                            startAt={seek.at}
                            onProgress={onProgress}
                            onEnded={() => save(video.durationS || position.current, video.durationS)}
                            onPlayingSecond={() => {
                                position.current += 1;
                                setTick(position.current);
                            }}
                        />
                    </div>
                    {!mayLeave && <p className="mt-2 text-xs text-caption">Lessons play here in Wàfè. There&apos;s no way out to YouTube from this page.</p>}

                    <div className="mt-4 flex flex-wrap items-center gap-1.5">
                        {video.valueId && <Tag tone="grow">{video.valueId}</Tag>}
                        {video.childSafe ? <Tag tone="ok">Child-safe</Tag> : <Tag tone="warn">Adults only</Tag>}
                        <Tag tone="neutral">{video.captionsAvailable ? "Captions available" : "No captions"}</Tag>
                        {manage && (
                            <Button size="xs" variant="ghost" onClick={() => (video.childSafe ? setConfirmAdults(true) : void setChildSafe(true))}>
                                <ShieldCheck size={12} aria-hidden="true" /> {video.childSafe ? "Mark adults only" : "Mark child-safe"}
                            </Button>
                        )}
                    </div>
                    <h1 className="mt-2 font-display text-4xl leading-8 md:text-7xl md:leading-10">{video.title}</h1>
                    <p className="mt-1 text-sm text-caption">
                        {video.channel}
                        {video.durationS ? ` · ${duration(video.durationS)}` : ""} · added by <MemberAvatar memberId={video.addedBy} size="xs" showName className="align-middle" />
                    </p>
                    {video.description && <p className="mt-3 max-w-2xl text-md leading-6 text-muted">{video.description}</p>}

                    {/* ---- Progress and the completion rule ---- */}
                    <Card className="mt-5">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between text-xs text-caption">
                                    <span>{done ? (mine?.markedBy ? "Marked complete by a parent" : `Finished · ${pct}% watched`) : `${pct}% watched`}</span>
                                    <span className="tabular-nums">{clock(tick)}</span>
                                </div>
                                <ProgressBar value={pct} className="mt-2" label="Watched" />
                                <p className="mt-2 text-xs text-caption">Counted as finished at {COMPLETE_AT_PCT}% watched, or when a parent marks it.</p>
                            </div>
                            <div className="flex shrink-0 flex-wrap gap-2">
                                <Button size="sm" variant="outline" onClick={openNote}>
                                    <StickyNote size={14} aria-hidden="true" /> Note at {clock(tick)}
                                </Button>
                                {manage && !done && (
                                    <Button size="sm" onClick={() => void award((r) => r.markComplete(video.id, sp.me.id), sp.me.id, `Lesson: ${video.title}`)}>
                                        <Check size={14} aria-hidden="true" /> Mark complete
                                    </Button>
                                )}
                                {done && (manage || mine?.memberId === sp.me.id) && (
                                    <Button size="sm" variant="ghost" onClick={() => void mutate((r) => r.clearCompletion(video.id, sp.me.id))}>
                                        Not done after all
                                    </Button>
                                )}
                            </div>
                        </div>

                        {manage && (
                            <div className="mt-4 border-t border-line pt-3">
                                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-muted">Mark for someone</p>
                                <ul className="flex flex-wrap gap-2">
                                    {sp.members
                                        .filter((m) => m.role !== "guest" && m.id !== sp.me.id)
                                        .map((m) => {
                                            const theirDone = videoDone(state, video.id, m.id);
                                            return (
                                                <li key={m.id}>
                                                    <button
                                                        type="button"
                                                        onClick={() => void award((r) => (theirDone ? r.clearCompletion(video.id, m.id).then(() => ({ progressPct: 0, newlyCompleted: false, points: 0 })) : r.markComplete(video.id, m.id)), m.id, `Lesson: ${video.title}`)}
                                                        className={cn("inline-flex h-9 items-center gap-2 rounded-full border pl-1 pr-3 text-sm font-medium", theirDone ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted hover:text-ink")}
                                                    >
                                                        <MemberAvatar memberId={m.id} size="xs" />
                                                        {m.name.split(" ")[0]}
                                                        {theirDone && <Check size={13} aria-hidden="true" />}
                                                    </button>
                                                </li>
                                            );
                                        })}
                                </ul>
                            </div>
                        )}
                    </Card>

                    {/* ---- Note composer ---- */}
                    {noteOpen && (
                        <Card className="mt-4">
                            <form onSubmit={addNote} className="flex flex-col gap-3">
                                <label className="flex flex-col gap-1.5">
                                    <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">Note at {clock(noteAt)}</span>
                                    {/* Opened deliberately by N or the button, so it takes focus. */}
                                    {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
                                    <textarea autoFocus value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={2} className="rounded-md border border-line-strong bg-card px-4 py-3 text-md outline-none focus:border-brand" placeholder="What you want to remember, or ask at dinner." />
                                </label>
                                <div className="flex items-center gap-2">
                                    <span className="mr-auto text-xs text-caption">
                                        Press <Kbd>N</Kbd> while watching to capture the second you&apos;re on.
                                    </span>
                                    <Button size="sm" variant="ghost" onClick={() => setNoteOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button size="sm" type="submit" disabled={!noteText.trim()}>
                                        Save note
                                    </Button>
                                </div>
                            </form>
                        </Card>
                    )}

                    {/* ---- Summary ---- */}
                    <Section title="What it says" className="mt-8">
                        {video.summary ? (
                            <Card className="flex flex-col gap-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    <SourceTag source={video.summary.source} />
                                    <span className="text-xs text-caption">Summarised from {SOURCE_LABEL[video.summary.source]} · suggested for {video.summary.suggestedBand}</span>
                                    {manage && (
                                        <Button size="sm" variant="ghost" className="ml-auto" loading={thinking} onClick={() => void summarise()}>
                                            Regenerate
                                        </Button>
                                    )}
                                </div>
                                <p className="text-md leading-6">{video.summary.summary}</p>
                                {video.summary.takeaways.length > 0 && (
                                    <div>
                                        <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-muted">Takeaways</h3>
                                        <ul className="flex list-disc flex-col gap-1 pl-5 text-md leading-6">
                                            {video.summary.takeaways.map((t, i) => (
                                                <li key={i}>{t}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {video.summary.forKids && (
                                    <div className="rounded-lg bg-grow-soft p-3 text-md leading-6 text-grow-ink">
                                        <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.06em]">For the children</span>
                                        {video.summary.forKids}
                                    </div>
                                )}
                                {video.summary.discussion.length > 0 && (
                                    <div>
                                        <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-muted">
                                            <MessageCircleQuestion size={13} aria-hidden="true" /> Ask at the table
                                        </h3>
                                        <ul className="flex flex-col gap-1 text-md leading-6">
                                            {video.summary.discussion.map((d, i) => (
                                                <li key={i} className="rounded-md bg-page px-3 py-2">
                                                    {d}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {video.summary.actions.length > 0 && (
                                    <div>
                                        <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-muted">
                                            <ListChecks size={13} aria-hidden="true" /> Action items
                                        </h3>
                                        <ul className="flex flex-col gap-1.5">
                                            {video.summary.actions.map((a, i) => {
                                                const already = tasks.some((t) => t.title === a);
                                                return (
                                                    <li key={i} className="flex items-center gap-2 rounded-md bg-page px-3 py-2 text-md">
                                                        <span className="min-w-0 flex-1">{a}</span>
                                                        {manage &&
                                                            (already ? (
                                                                <Tag tone="ok">Added</Tag>
                                                            ) : (
                                                                <Button size="xs" variant="outline" onClick={() => setTaskFor(a)}>
                                                                    <Plus size={12} aria-hidden="true" /> Make it a task
                                                                </Button>
                                                            ))}
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                )}
                                {manage && (
                                    <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                                        <Button size="sm" variant="outline" loading={thinking} onClick={() => void summarise("9-year-old")}>
                                            <Sparkles size={13} aria-hidden="true" /> Prompts for a 9-year-old
                                        </Button>
                                    </div>
                                )}
                            </Card>
                        ) : (
                            <Card className="flex flex-col gap-3">
                                <p className="text-md leading-6 text-muted">
                                    No summary yet. The companion will work from{" "}
                                    <strong className="font-semibold text-ink">{source === "captions" ? "the captions you pasted" : "the title and description"}</strong> — and whichever it used is printed on the result, always.
                                </p>
                                {aiError && <Notice tone="info">{aiError}</Notice>}
                                {manage ? (
                                    <div className="flex flex-wrap gap-2">
                                        <Button size="sm" loading={thinking} onClick={() => void summarise()}>
                                            <Sparkles size={14} aria-hidden="true" /> Summarise this video
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => setTranscriptOpen((v) => !v)}>
                                            {video.transcript ? "Edit captions" : "Paste captions"}
                                        </Button>
                                    </div>
                                ) : (
                                    <p className="text-sm text-caption">A parent can ask for a summary.</p>
                                )}
                                {transcriptOpen && (
                                    <div className="flex flex-col gap-2">
                                        <label className="flex flex-col gap-1.5">
                                            <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">Captions</span>
                                            <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={5} className="rounded-md border border-line-strong bg-card px-4 py-3 text-md outline-none focus:border-brand" placeholder="Paste the transcript from YouTube's transcript panel." />
                                        </label>
                                        <div className="flex justify-end gap-2">
                                            <Button size="sm" variant="ghost" onClick={() => setTranscriptOpen(false)}>
                                                Cancel
                                            </Button>
                                            <Button size="sm" onClick={() => void saveTranscript()}>
                                                Save captions
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </Card>
                        )}
                    </Section>

                    {/* ---- Action items ---- */}
                    {tasks.length > 0 && (
                        <Section title="Because of this lesson">
                            <Card className="p-2">
                                <ul className="flex flex-col gap-1">
                                    {tasks.map((t) => (
                                        <li key={t.id} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-page">
                                            <button
                                                type="button"
                                                aria-pressed={Boolean(t.doneAt)}
                                                onClick={() => void mutate((r) => r.setTaskDone(t.id, !t.doneAt))}
                                                className={cn("grid size-6 shrink-0 place-items-center rounded-full border", t.doneAt ? "border-brand bg-brand text-white" : "border-line-strong text-transparent hover:border-ink")}
                                            >
                                                <Check size={13} strokeWidth={3} aria-hidden="true" />
                                                <span className="sr-only">{t.doneAt ? "Done" : "Not done"}</span>
                                            </button>
                                            <span className="min-w-0 flex-1">
                                                <span className={cn("block text-md", t.doneAt && "text-muted line-through")}>{t.title}</span>
                                                <span className="block text-xs text-caption">Due {t.dueDate}</span>
                                            </span>
                                            <MemberAvatar memberId={t.memberId} size="xs" />
                                            {manage && (
                                                <IconButton label={`Remove "${t.title}"`} size="sm" onClick={() => void mutate((r) => r.removeTask(t.id))}>
                                                    <Trash2 size={13} />
                                                </IconButton>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </Card>
                        </Section>
                    )}
                </div>

                {/* ---- Notes rail ---- */}
                <aside className="min-w-0">
                    <Card>
                        <div className="mb-3 flex items-center gap-2">
                            <h2 className="flex-1 text-base font-semibold">Notes</h2>
                            <Button size="xs" variant="outline" onClick={openNote}>
                                <Plus size={12} aria-hidden="true" /> Add
                            </Button>
                        </div>
                        {notes.length ? (
                            <ul className="flex flex-col gap-1">
                                {notes.map((nt) => (
                                    <li key={nt.id} className="group flex items-start gap-2 rounded-md p-2 hover:bg-page">
                                        <button type="button" onClick={() => setSeek((s) => ({ at: nt.timestampS, n: s.n + 1 }))} className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold tabular-nums text-brand-ink" title={`Play from ${clock(nt.timestampS)} (within ${SEEK_TOLERANCE_S}s)`}>
                                            {clock(nt.timestampS)}
                                        </button>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm leading-5">{nt.text}</span>
                                            <span className="mt-0.5 flex items-center gap-1.5 text-2xs text-caption">
                                                <MemberAvatar memberId={nt.memberId} size="xs" /> {sp.members.find((m) => m.id === nt.memberId)?.name.split(" ")[0] ?? "Someone"}
                                            </span>
                                        </span>
                                        {(manage || nt.memberId === sp.me.id) && (
                                            <IconButton label="Delete note" size="sm" className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100" onClick={() => void mutate((r) => r.removeNote(nt.id))}>
                                                <Trash2 size={12} />
                                            </IconButton>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm leading-5 text-caption">
                                Nothing pinned yet. Press <Kbd>N</Kbd> while it plays and the note takes the second you&apos;re on.
                            </p>
                        )}
                    </Card>

                    {suggestions.length > 0 && (
                        <Card className="mt-4">
                            <h2 className="mb-2 text-base font-semibold">Next from your shelf</h2>
                            <p className="mb-2 text-xs text-caption">Only lessons this family has saved.</p>
                            <ul className="flex flex-col gap-1">
                                {suggestions.map((v) => (
                                    <LessonRow key={v.id} state={state} video={v} memberId={sp.me.id} />
                                ))}
                            </ul>
                        </Card>
                    )}

                    {manage && (
                        <Button variant="ghost" size="sm" className="mt-4" onClick={() => setConfirmDelete(true)}>
                            <Trash2 size={14} aria-hidden="true" /> Remove this lesson
                        </Button>
                    )}
                </aside>
            </div>

            {taskFor && <NewTaskDialog videoId={video.id} title={taskFor} onClose={() => setTaskFor(null)} />}
            <Confirm
                open={confirmDelete}
                title={`Remove "${video.title}"?`}
                body="Its notes, action items and everyone's progress go with it."
                confirmLabel="Remove lesson"
                danger
                onClose={() => setConfirmDelete(false)}
                onConfirm={async () => {
                    await mutate((r) => r.removeVideo(video.id));
                    // The lesson is gone; leaving the reader on its own URL to
                    // read "that lesson isn't here" is not an answer.
                    navigate("/grow/learning");
                }}
            />
            <Confirm
                open={confirmAdults}
                title={`Mark "${video.title}" adults only?`}
                body="It leaves every child's shelf, their lessons for today and the companion's answers to them. Notes and progress stay."
                confirmLabel="Mark adults only"
                onClose={() => setConfirmAdults(false)}
                onConfirm={() => setChildSafe(false)}
            />
        </div>
    );
}

// ---------------------------------------------------------------------------
// An action item becomes a task, linked to the lesson
// ---------------------------------------------------------------------------

function NewTaskDialog({ videoId, title, onClose }: { videoId: string; title: string; onClose: () => void }) {
    const { mutate, sp, toast } = useLearning();
    const [text, setText] = useState(title);
    const [memberId, setMemberId] = useState<string | null>(sp.me.id);
    const [due, setDue] = useState(isoDate(new Date(new Date(`${sp.today}T00:00:00`).getTime() + 7 * 86400000)));
    const [busy, setBusy] = useState(false);

    return (
        <Card className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-lg shadow-app md:inset-x-auto md:right-6">
            <form
                onSubmit={async (e) => {
                    e.preventDefault();
                    setBusy(true);
                    try {
                        await mutate((r) => r.addTask(videoId, text, memberId, due));
                        toast("Added to the family's Today", "success");
                        onClose();
                    } finally {
                        setBusy(false);
                    }
                }}
                className="flex flex-col gap-3"
            >
                <h2 className="text-base font-semibold">Make it a task</h2>
                <Field label="Task" value={text} onChange={(e) => setText(e.target.value)} required />
                <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                    <MemberPicker value={memberId} onChange={setMemberId} allowFamily label="For" />
                    <Field label="Due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
                </div>
                <p className="text-xs text-caption">It stays linked to this lesson and shows up on the family&apos;s Today.</p>
                <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button size="sm" type="submit" loading={busy} disabled={!text.trim()}>
                        Add task
                    </Button>
                </div>
            </form>
        </Card>
    );
}

// ---------------------------------------------------------------------------

export default function LessonPage() {
    const { id = "" } = useParams();
    const { state, loading } = useLearning();

    if (loading) return <Skeleton className="h-96" />;
    const video = videoById(state, id);
    if (!video)
        return (
            <div>
                <PageTitle title="Lesson" area="grow" />
                <EmptyModule
                    title="That lesson isn't here"
                    body="It may have been removed, or it isn't one you can see."
                    action={
                        <Link className="text-sm font-semibold text-brand underline" to="/grow/learning">
                            Back to the Learning Hub
                        </Link>
                    }
                />
            </div>
        );
    // Keyed on the lesson so resume position is recomputed for each one.
    return <LessonBody key={video.id} video={video} />;
}
