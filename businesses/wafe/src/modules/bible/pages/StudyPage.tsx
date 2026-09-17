import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { useAi } from "@/lib/ai";
import { cn } from "@/lib/cn";
import { useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import { Confirm, MemberAvatar, Notice, PageTitle, Points } from "@/components/shared";
import { Ring } from "@/components/ui/charts";
import { Button, Card, EmptyState, Spinner, Tag } from "@/components/ui/primitives";
import bibleModule from "../module";
import { BASE, isSessionDone, sessionsOf, studyById, studyProgress } from "../derive";
import { ReadAloud } from "../components/pieces";
import { SessionDialog, StudyDialog } from "../components/StudyDialog";
import { STUDY_TYPE_LABEL, type NewSession, type NewStudy, type StudySession } from "../types";

/**
 * One study, one session at a time.
 *
 * The session is the unit of the whole thing: a passage, the words, a short
 * devotional, two questions and something to pray. Finishing one is a real
 * write — it moves the study's ring and, for a child, credits Sprouts — so the
 * button says what it will do and the page shows what happened. (`derive.units`
 * publishes each study as a Curricula-shaped importable unit; wiring the
 * register to read it is the composer's line, not this module's, so this page
 * promises only what it can keep.)
 */

export default function StudyPage() {
    const { id = "" } = useParams();
    const [params, setParams] = useSearchParams();
    const navigate = useNavigate();
    const { state, mutate, loading, error } = useModule(bibleModule);
    const { me, role, can, members, mutateCore } = useSpace();
    const { toast } = useToast();
    const { ask, busy: aiBusy } = useAi();
    const [editOpen, setEditOpen] = useState(false);
    const [sessionOpen, setSessionOpen] = useState(false);
    const [editing, setEditing] = useState<StudySession | undefined>(undefined);
    const [removeStudyOpen, setRemoveStudyOpen] = useState(false);
    const [removeSession, setRemoveSession] = useState<StudySession | null>(null);
    const [explain, setExplain] = useState<string | null>(null);
    const [aiNote, setAiNote] = useState<string | null>(null);

    const manage = can("bible.manage");

    if (loading && !state) return <p className="text-md text-muted">Opening the study…</p>;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state) return null;

    const study = studyById(state, id);
    if (!study) {
        return (
            <div>
                <PageTitle title="That study isn't here" sub="It may have been removed, or it may not be one you're on." area="grow" />
                <EmptyState title="Nothing to open" body="Studies you are on appear on the Bible page." action={<Button onClick={() => navigate(BASE)}>Back to Bible</Button>} />
            </div>
        );
    }

    const sessions = sessionsOf(state, study.id);
    const progress = studyProgress(state, study, me.id);
    const wanted = Number(params.get("s") ?? "");
    const current = sessions.find((s) => s.order === wanted) ?? progress.next ?? sessions[0];
    const onIt = study.assigneeMemberIds.includes(me.id);
    const kids = members.filter((m) => m.role === "child" && study.assigneeMemberIds.includes(m.id));

    const select = (order: number): void => {
        params.set("s", String(order));
        setParams(params, { replace: true });
        setExplain(null);
        setAiNote(null);
    };

    async function complete(session: StudySession, memberId: string, done: boolean): Promise<void> {
        if (done) {
            let earned = 0;
            await mutate(async (r) => {
                const res = await r.completeSession(session.id, memberId);
                earned = res.points;
            });
            if (earned > 0) {
                await mutateCore((r) => r.addPoints(memberId, earned, `Bible study: ${session.passage}`));
                toast(`${earned} Sprouts for ${members.find((m) => m.id === memberId)?.name.split(" ")[0] ?? "them"}.`, "success");
            } else {
                toast("Session done.", "success");
            }
        } else {
            await mutate((r) => r.uncompleteSession(session.id, memberId));
        }
    }

    async function explainForAChild(): Promise<void> {
        if (!current) return;
        setAiNote(null);
        setExplain(null);
        try {
            const r = await ask({
                action: "ask",
                prompt: `Explain ${current.passage} for a nine-year-old, in four or five short sentences. Use plain words and one picture from ordinary life. Do not invent anything the passage does not say.`,
                extraContext: `Passage: ${current.passage} — "${current.passageText}". Devotional written for this family: ${current.devotional}`,
            });
            if (r.unavailable) setAiNote(r.unavailable);
            else setExplain(r.text);
        } catch {
            setAiNote("The companion couldn't answer just now.");
        }
    }

    return (
        <div>
            <Link to={BASE} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
                <ArrowLeft size={14} aria-hidden="true" /> Bible
            </Link>

            <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-start">
                {study.coverUrl && <img src={study.coverUrl} alt="" width={180} height={220} className="h-[180px] w-full rounded-lg object-cover md:h-[220px] md:w-[180px]" loading="lazy" />}
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <Tag tone={study.childSafe ? "ok" : "grow"}>{study.childSafe ? "For children" : STUDY_TYPE_LABEL[study.type]}</Tag>
                        {study.value && <Tag tone="neutral">{study.value}</Tag>}
                        <span className="text-xs text-caption">{study.minutes} minutes a session</span>
                    </div>
                    <h1 className="mt-2.5 font-display text-6xl leading-9 md:text-[32px]">{study.title}</h1>
                    <p className="mt-2 max-w-2xl text-md leading-6 text-muted">{study.description}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        {study.assigneeMemberIds.length ? (
                            study.assigneeMemberIds.map((m) => <MemberAvatar key={m} memberId={m} size="sm" showName />)
                        ) : (
                            <span className="text-sm text-caption">Nobody is on this yet.</span>
                        )}
                    </div>
                    {manage && (
                        <div className="mt-4 flex flex-wrap gap-2">
                            <Button size="md" variant="outline" onClick={() => setEditOpen(true)}>
                                <Pencil size={14} aria-hidden="true" /> Edit
                            </Button>
                            <Button
                                size="md"
                                variant="outline"
                                onClick={() => {
                                    setEditing(undefined);
                                    setSessionOpen(true);
                                }}
                            >
                                <Plus size={14} aria-hidden="true" /> Add a session
                            </Button>
                            <Button size="md" variant="danger" onClick={() => setRemoveStudyOpen(true)}>
                                <Trash2 size={14} aria-hidden="true" /> Delete
                            </Button>
                        </div>
                    )}
                </div>
                <Card className="flex shrink-0 items-center gap-4 md:flex-col">
                    <Ring pct={progress.pct} size={92} stroke={3} label={`${study.title}: ${progress.pct}%`}>
                        <span className="text-lg font-semibold tabular-nums">{progress.pct}%</span>
                    </Ring>
                    <p className="text-center text-xs leading-5 text-muted">
                        {progress.done} of {progress.total}
                        <br />
                        sessions done
                    </p>
                </Card>
            </div>

            {sessions.length === 0 ? (
                <EmptyState
                    title="No sessions yet"
                    body="A study is a run of sessions: a passage, a short devotional, two questions and something to pray."
                    action={manage ? <Button onClick={() => setSessionOpen(true)}>Add the first session</Button> : undefined}
                />
            ) : (
                <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[260px_1fr]">
                    <nav aria-label="Sessions">
                        <ol className="flex gap-2 overflow-x-auto no-scrollbar lg:flex-col lg:overflow-visible">
                            {sessions.map((s) => {
                                const done = isSessionDone(state, s.id, me.id);
                                const active = current?.id === s.id;
                                return (
                                    <li key={s.id} className="shrink-0 lg:shrink">
                                        <button
                                            type="button"
                                            onClick={() => select(s.order)}
                                            aria-current={active ? "step" : undefined}
                                            className={cn("flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left transition-colors", active ? "bg-grow-soft text-grow-ink" : "hover:bg-card")}
                                        >
                                            <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border text-2xs font-semibold", done ? "border-brand bg-brand text-white" : "border-line-strong text-caption")} aria-hidden="true">
                                                {done ? <Check size={12} strokeWidth={3} /> : s.order}
                                            </span>
                                            <span className="min-w-0 whitespace-nowrap text-sm font-medium lg:whitespace-normal">{s.passage}</span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ol>
                    </nav>

                    {current && (
                        <article>
                            <Card className="paper bg-grow-soft p-5 md:p-6">
                                <p className="text-xs font-semibold uppercase tracking-[0.06em] text-grow-ink">
                                    Session {current.order} of {sessions.length}
                                </p>
                                <h2 className="mt-1.5 font-display text-3xl leading-7 text-grow-ink">{current.passage}</h2>
                                {current.passageText && <blockquote className="mt-3 text-base leading-7 text-grow-ink">“{current.passageText}”</blockquote>}
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <ReadAloud text={`${current.passage}. ${current.passageText}`} />
                                    <Button variant="outline" size="md" onClick={explainForAChild} disabled={aiBusy}>
                                        {aiBusy ? <Spinner /> : <Sparkles size={15} aria-hidden="true" />}
                                        Explain this for a nine-year-old
                                    </Button>
                                </div>
                            </Card>

                            {aiNote && <Notice className="mt-4">{aiNote}</Notice>}
                            {explain && (
                                <Card className="mt-4 border border-brand/20 bg-brand-soft">
                                    <p className="text-xs font-semibold uppercase tracking-[0.06em] text-brand-ink">For a nine-year-old</p>
                                    <p className="mt-2 whitespace-pre-line text-md leading-6 text-brand-ink">{explain}</p>
                                    <p className="mt-3 text-xs text-muted">I used: {current.passage} and the devotional on this page. Nothing else.</p>
                                </Card>
                            )}

                            {current.devotional && (
                                <section className="mt-6">
                                    <h3 className="font-display text-xl">The thought</h3>
                                    <p className="mt-2 text-base leading-7">{current.devotional}</p>
                                </section>
                            )}

                            {current.questions.filter(Boolean).length > 0 && (
                                <section className="mt-6">
                                    <h3 className="font-display text-xl">To talk about</h3>
                                    <ol className="mt-2 flex flex-col gap-2">
                                        {current.questions.filter(Boolean).map((q, i) => (
                                            <li key={q} className="flex gap-3 rounded-md bg-card px-4 py-3 text-base leading-6">
                                                <span className="font-semibold text-caption">{i + 1}</span>
                                                {q}
                                            </li>
                                        ))}
                                    </ol>
                                </section>
                            )}

                            {current.prayerFocus && (
                                <section className="mt-6">
                                    <h3 className="font-display text-xl">To pray</h3>
                                    <p className="mt-2 rounded-md bg-live-soft px-4 py-3.5 text-base leading-6 text-live-ink">{current.prayerFocus}</p>
                                </section>
                            )}

                            <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-line pt-5">
                                {role !== "guest" && (onIt || manage) && (
                                    <Button
                                        variant={isSessionDone(state, current.id, me.id) ? "outline" : "brand"}
                                        onClick={() => complete(current, me.id, !isSessionDone(state, current.id, me.id))}
                                    >
                                        <Check size={16} aria-hidden="true" />
                                        {isSessionDone(state, current.id, me.id) ? "Done — undo" : "I've done this session"}
                                    </Button>
                                )}
                                {manage &&
                                    kids.map((k) => {
                                        const done = isSessionDone(state, current.id, k.id);
                                        return (
                                            <Button key={k.id} size="md" variant={done ? "tonal" : "outline"} onClick={() => complete(current, k.id, !done)}>
                                                <MemberAvatar member={k} size="xs" />
                                                {k.name.split(" ")[0]} {done ? "done" : "not yet"}
                                                {!done && <Points n={15} />}
                                            </Button>
                                        );
                                    })}
                                <span className="flex-1" />
                                {manage && (
                                    <>
                                        <Button
                                            size="md"
                                            variant="ghost"
                                            onClick={() => {
                                                setEditing(current);
                                                setSessionOpen(true);
                                            }}
                                        >
                                            <Pencil size={14} aria-hidden="true" /> Edit session
                                        </Button>
                                        <Button size="md" variant="ghost" onClick={() => setRemoveSession(current)}>
                                            <Trash2 size={14} aria-hidden="true" /> Remove
                                        </Button>
                                    </>
                                )}
                            </div>
                            <p className="mt-3 text-xs text-caption">Finishing a session is a real tick against your name: it moves the ring above, and credits 15 Sprouts to a child.</p>
                        </article>
                    )}
                </div>
            )}

            {manage && (
                <>
                    <StudyDialog
                        open={editOpen}
                        onClose={() => setEditOpen(false)}
                        initial={study}
                        onSave={async (input: NewStudy) => {
                            await mutate((r) => r.updateStudy(study.id, { title: input.title, description: input.description, childSafe: input.childSafe, assigneeMemberIds: input.assigneeMemberIds, value: input.value, minutes: input.minutes }));
                            toast("Study updated.", "success");
                        }}
                    />
                    <SessionDialog
                        open={sessionOpen}
                        onClose={() => setSessionOpen(false)}
                        initial={editing}
                        order={sessions.length + 1}
                        onSave={async (input: NewSession) => {
                            if (editing) await mutate((r) => r.updateSession(editing.id, input));
                            else await mutate((r) => r.addSession(study.id, input));
                            toast("Saved.", "success");
                        }}
                    />
                    <Confirm
                        open={removeStudyOpen}
                        onClose={() => setRemoveStudyOpen(false)}
                        title="Delete this study?"
                        body={`"${study.title}" and its ${sessions.length} sessions go, along with everyone's ticks. This cannot be undone.`}
                        confirmLabel="Delete"
                        danger
                        onConfirm={async () => {
                            await mutate((r) => r.removeStudy(study.id));
                            navigate(BASE);
                        }}
                    />
                    <Confirm
                        open={removeSession !== null}
                        onClose={() => setRemoveSession(null)}
                        title="Remove this session?"
                        body={removeSession ? `Session ${removeSession.order}: ${removeSession.passage}.` : undefined}
                        confirmLabel="Remove"
                        danger
                        onConfirm={async () => {
                            if (removeSession) await mutate((r) => r.removeSession(removeSession.id));
                        }}
                    />
                </>
            )}
        </div>
    );
}
