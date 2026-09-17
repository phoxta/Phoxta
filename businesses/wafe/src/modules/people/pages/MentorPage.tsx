import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, HelpCircle, Lock, Plus, Sparkles, Trash2 } from "lucide-react";
import type { Visibility } from "@/data/core";
import { cn } from "@/lib/cn";
import { addDays, shortDate, time } from "@/lib/format";
import { useAi } from "@/lib/ai";
import { useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import { Confirm, DateText, EmptyModule, MemberChips, MemberMultiPicker, Section, VisibilityPicker } from "@/components/shared";
import { Button, Card, EmptyState, Field, Inset, Spinner, Tag } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/overlay";
import mod from "../module";
import { followUpsFor, mentorPerson, nextSession, sessionsFor } from "../derive";
import { MENTOR_AREA, type MentorSession } from "../types";
import { AskPanel, PersonPhoto } from "../components/pieces";

/**
 * A mentor, and the sessions.
 *
 * Notes default to Private for the parent who wrote them — the other parent
 * sees the session and not the notes, and so does the mentor, who is told
 * only that the notes are private, never whose they are. Follow-ups carry
 * everything a task needs plus the session they came from; they are ticked
 * off here, and `taskRows()` in derive.ts publishes them for a task list to
 * adopt, which is when `taskId` gets set.
 */

interface Proposal {
    title: string;
    memberId: string | null;
    dueInDays: number;
    note: string;
    on: boolean;
}

interface SuggestedTasks {
    tasks?: Array<{ title?: unknown; memberId?: unknown; dueInDays?: unknown; note?: unknown }>;
}

export default function MentorPage() {
    const { id = "" } = useParams();
    const { state, mutate, loading } = useModule(mod);
    const sp = useSpace();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [adding, setAdding] = useState(false);
    const [removing, setRemoving] = useState(false);
    const [addFollowTo, setAddFollowTo] = useState<string | null>(null);

    const mentor = state?.mentors.find((m) => m.id === id);
    const person = state && mentor ? mentorPerson(state, mentor) : undefined;
    const sessions = useMemo(() => (state && mentor ? sessionsFor(state, mentor.id) : []), [state, mentor]);
    const next = state && mentor ? nextSession(state, mentor, sp.today) : null;

    if (loading || !state) return <p className="text-md text-muted">Opening…</p>;
    if (!mentor)
        return (
            <EmptyModule
                title="We can't find that mentor"
                body="They may have been removed."
                action={
                    <Link className="text-brand underline" to="/family/people">
                        Back to People
                    </Link>
                }
            />
        );

    const parent = sp.role === "parent";
    const guestMentor = sp.role === "guest" && mentor.memberId === sp.me.id;
    const lastWithNotes = sessions.find((s) => !s.notesWithheld && s.notes);

    return (
        <div>
            <Link to="/family/people" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
                <ArrowLeft size={14} aria-hidden="true" /> People
            </Link>

            <header className="mb-8 flex flex-wrap items-start gap-5">
                <PersonPhoto person={person ?? { name: "Mentor", photoUrl: null }} size="xl" />
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <Tag tone="grow">{MENTOR_AREA[mentor.area]}</Tag>
                        {mentor.memberId && <Tag tone="family">Guest seat</Tag>}
                    </div>
                    <h1 className="mt-2 font-display text-7xl leading-9 md:text-8xl">{person?.name ?? "A mentor"}</h1>
                    <p className="mt-1 text-md text-muted">{mentor.title}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted">
                        <span className="flex items-center gap-2">
                            Mentors <MemberChips memberIds={mentor.menteeMemberIds} />
                        </span>
                        {next && (
                            <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-ink">
                                Next: {shortDate(next.date)} · {time(next.date)}
                            </span>
                        )}
                    </div>
                    {person && (
                        <Link to={`/family/people/relatives/${person.id}`} className="mt-3 inline-block text-sm font-semibold text-brand hover:underline">
                            Their directory record
                        </Link>
                    )}
                </div>
                {parent && (
                    <Button size="md" onClick={() => setAdding(true)}>
                        <Plus size={15} aria-hidden="true" /> Log a session
                    </Button>
                )}
            </header>

            {guestMentor && (
                <p className="mb-6 rounded-md bg-brand-soft px-4 py-3 text-sm leading-6 text-brand-ink">
                    You are seeing the sessions you are on. Notes appear only where the family chose to share them with you — everything else stays with them.
                </p>
            )}

            {parent && (
                <div className="mb-8">
                    <AskPanel
                        title={`Prepare for your session with ${person?.name.split(" ").slice(-1)[0] ?? "your mentor"}`}
                        prompts={[`Prepare me for my session with ${person?.name ?? "my mentor"}`, "What did we agree last time that I haven't done?"]}
                        extraContext={[
                            `Mentor: ${person?.name ?? "unknown"} (${MENTOR_AREA[mentor.area]}, ${mentor.title}).`,
                            next ? `Next session ${shortDate(next.date)}.` : "",
                            lastWithNotes ? `Last session (${shortDate(lastWithNotes.date)}) on "${lastWithNotes.agenda}": ${lastWithNotes.notes}` : "",
                            sessions[0]?.questionsBeforeNext.length ? `Questions to ask: ${sessions[0].questionsBeforeNext.join("; ")}` : "",
                            state.followUps.filter((f) => f.mentorId === mentor.id && !f.done).length ? `Open follow-ups: ${state.followUps.filter((f) => f.mentorId === mentor.id && !f.done).map((f) => f.title).join("; ")}` : "",
                        ]
                            .filter(Boolean)
                            .join(" ")}
                    />
                </div>
            )}

            <Section title={`Sessions · ${sessions.length}`}>
                {sessions.length ? (
                    <ul className="grid gap-4">
                        {sessions.map((s) => (
                            <SessionCard
                                key={s.id}
                                session={s}
                                followUps={followUpsFor(state, s.id)}
                                canEdit={parent}
                                onToggle={async (fid, done) => {
                                    await mutate((r) => r.toggleFollowUp(fid, done));
                                }}
                                onRemoveFollowUp={async (fid) => {
                                    await mutate((r) => r.removeFollowUp(fid));
                                }}
                                onAddFollowUp={() => setAddFollowTo(s.id)}
                                onAddMany={async (rows) => {
                                    for (const p of rows) {
                                        await mutate((r) => r.addFollowUp({ sessionId: s.id, title: p.title, memberId: p.memberId, dueAt: addDays(sp.today, Math.max(1, p.dueInDays)) }));
                                    }
                                    toast(`${rows.length} follow-up${rows.length === 1 ? "" : "s"} added`, "success");
                                }}
                            />
                        ))}
                    </ul>
                ) : (
                    <EmptyState title="No sessions yet" body="Log what you talked about, what you agreed, and what to ask next time." action={parent ? <Button onClick={() => setAdding(true)}>Log the first session</Button> : undefined} />
                )}
            </Section>

            {parent && (
                <div className="mt-8">
                    <Button variant="danger" size="md" onClick={() => setRemoving(true)}>
                        <Trash2 size={14} aria-hidden="true" /> Remove this mentor
                    </Button>
                </div>
            )}

            <AddSessionDialog
                open={adding}
                mentorName={person?.name ?? "your mentor"}
                onClose={() => setAdding(false)}
                onSave={async (input) => {
                    await mutate((r) =>
                        r.addSession({
                            mentorId: mentor.id,
                            date: input.date,
                            participants: input.participants,
                            agenda: input.agenda,
                            notes: input.notes,
                            notesVisibility: input.notesVisibility,
                            notesSharedWith: input.notesSharedWith,
                            questionsBeforeNext: input.questions,
                            nextSessionAt: input.nextSessionAt,
                        }),
                    );
                    toast("Session logged — the notes are private to you", "success");
                }}
            />

            <AddFollowUpDialog
                open={Boolean(addFollowTo)}
                onClose={() => setAddFollowTo(null)}
                onSave={async (title, memberId, dueAt) => {
                    if (addFollowTo) await mutate((r) => r.addFollowUp({ sessionId: addFollowTo, title, memberId, dueAt }));
                    toast("Follow-up added", "success");
                }}
            />

            <Confirm
                open={removing}
                title={`Remove ${person?.name ?? "this mentor"}?`}
                body="Every session and follow-up here goes with them. Their directory record stays."
                confirmLabel="Remove the mentor"
                danger
                onClose={() => setRemoving(false)}
                onConfirm={async () => {
                    await mutate((r) => r.removeMentor(mentor.id));
                    toast("Mentor removed", "default");
                    navigate("/family/people");
                }}
            />
        </div>
    );
}

// ---------------------------------------------------------------------------

function SessionCard({
    session,
    followUps,
    canEdit,
    onToggle,
    onRemoveFollowUp,
    onAddFollowUp,
    onAddMany,
}: {
    session: MentorSession;
    followUps: ReturnType<typeof followUpsFor>;
    canEdit: boolean;
    onToggle: (id: string, done: boolean) => Promise<void>;
    onRemoveFollowUp: (id: string) => Promise<void>;
    onAddFollowUp: () => void;
    onAddMany: (rows: Proposal[]) => Promise<void>;
}) {
    const { members, role } = useSpace();
    const { ask, busy, available } = useAi();
    const [proposals, setProposals] = useState<Proposal[] | null>(null);
    const [note, setNote] = useState<string | null>(null);
    const author = members.find((m) => m.id === session.ownerMemberId);

    const suggest = async () => {
        setNote(null);
        setProposals(null);
        try {
            const r = await ask<SuggestedTasks>({
                action: "suggest-tasks",
                prompt: `Turn these mentor session notes into three to five concrete follow-ups for our family. Each should be one action somebody can finish in a week.`,
                payload: { members: members.filter((m) => m.role !== "guest").map((m) => ({ id: m.id, name: m.name })), agenda: session.agenda, notes: session.notes },
            });
            if (r.unavailable) {
                setNote(r.unavailable);
                return;
            }
            const rows = (r.data?.tasks ?? [])
                .map((t) => ({
                    title: typeof t.title === "string" ? t.title.trim() : "",
                    memberId: typeof t.memberId === "string" && members.some((m) => m.id === t.memberId) ? t.memberId : null,
                    dueInDays: typeof t.dueInDays === "number" ? Math.min(60, Math.max(1, Math.round(t.dueInDays))) : 7,
                    note: typeof t.note === "string" ? t.note : "",
                    on: true,
                }))
                .filter((t) => t.title);
            if (!rows.length) setNote("The companion didn't find anything to do in those notes.");
            else setProposals(rows);
        } catch {
            setNote("The companion couldn't answer just now — add follow-ups by hand.");
        }
    };

    return (
        <li>
            <Card>
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h3 className="text-lg font-semibold">{session.agenda || "Session"}</h3>
                        <p className="mt-0.5 text-xs text-caption">
                            <DateText iso={session.date} withTime /> · <MemberChips memberIds={session.participants} className="align-middle" />
                        </p>
                    </div>
                    {session.notesVisibility === "private" && !session.notesWithheld && (
                        <Tag tone="neutral" icon={<Lock size={11} aria-hidden="true" />}>
                            Private notes
                        </Tag>
                    )}
                    {session.notesVisibility === "shared" && !session.notesWithheld && <Tag tone="brand">Shared notes</Tag>}
                </div>

                {session.notesWithheld ? (
                    <Inset className="mt-3 flex items-start gap-2.5">
                        <Lock size={15} className="mt-0.5 shrink-0 text-caption" aria-hidden="true" />
                        <p className="text-sm leading-6 text-muted">
                            {role === "parent" || role === "child"
                                ? `The notes from this session are private to ${author ? author.name.split(" ")[0] : "whoever wrote them"}. You can see that it happened, and what it was about.`
                                : "The notes from this session are private to the family. You can see that it happened, and what it was about."}
                        </p>
                    </Inset>
                ) : (
                    session.notes && <p className="mt-3 whitespace-pre-wrap text-md leading-6">{session.notes}</p>
                )}

                {session.questionsBeforeNext.length > 0 && (
                    <div className="mt-4 rounded-lg bg-grow-soft p-4">
                        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-grow-ink">
                            <HelpCircle size={13} aria-hidden="true" /> Ask before next time
                        </p>
                        <ul className="mt-2 list-disc pl-5 text-md leading-6 text-grow-ink">
                            {session.questionsBeforeNext.map((q) => (
                                <li key={q}>{q}</li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="mt-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.06em] text-caption">Follow-ups</p>
                        {canEdit && (
                            <span className="flex gap-2">
                                <Button size="sm" variant="ghost" onClick={onAddFollowUp}>
                                    <Plus size={13} aria-hidden="true" /> Add
                                </Button>
                                {!session.notesWithheld && session.notes && (
                                    <Button size="sm" variant="outline" onClick={suggest} loading={busy} disabled={!available}>
                                        <Sparkles size={13} aria-hidden="true" /> Notes → follow-ups
                                    </Button>
                                )}
                            </span>
                        )}
                    </div>
                    {followUps.length ? (
                        <ul>
                            {followUps.map((f) => (
                                <li key={f.id} className="flex items-center gap-3 border-t border-line py-2.5 first:border-0">
                                    <button
                                        type="button"
                                        aria-pressed={f.done}
                                        aria-label={f.done ? `Mark "${f.title}" not done` : `Mark "${f.title}" done`}
                                        disabled={!canEdit}
                                        onClick={() => void onToggle(f.id, !f.done)}
                                        className={cn("grid size-6 shrink-0 place-items-center rounded-full border", f.done ? "border-brand bg-brand text-white" : "border-line-strong text-transparent hover:border-ink")}
                                    >
                                        <Check size={13} strokeWidth={2.5} aria-hidden="true" />
                                    </button>
                                    <span className="min-w-0 flex-1">
                                        <span className={cn("block text-md", f.done && "text-muted line-through")}>{f.title}</span>
                                        <span className="block text-xs text-caption">
                                            {members.find((m) => m.id === f.memberId)?.name.split(" ")[0] ?? "Anyone"} · due {shortDate(f.dueAt)}
                                            {f.taskId ? " · in Tasks" : ""}
                                        </span>
                                    </span>
                                    {canEdit && (
                                        <Button size="sm" variant="ghost" onClick={() => void onRemoveFollowUp(f.id)} aria-label={`Remove ${f.title}`}>
                                            <Trash2 size={13} aria-hidden="true" />
                                        </Button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-caption">Nothing agreed yet.</p>
                    )}
                    <p className="mt-2 text-2xs text-caption">A follow-up carries who and when, and stays with the session it was agreed in. One that is due today appears on the family’s dashboard for that day; tick it off here.</p>
                </div>

                {busy && (
                    <p className="mt-3 flex items-center gap-2 text-sm text-muted">
                        <Spinner /> Reading the notes…
                    </p>
                )}
                {note && <p className="mt-3 text-sm text-peach">{note}</p>}
                {proposals && (
                    <div className="mt-3 rounded-lg bg-brand-soft p-4">
                        <p className="text-sm font-semibold">The companion proposes — nothing is added until you say so.</p>
                        <ul className="mt-2">
                            {proposals.map((p, i) => (
                                <li key={`${p.title}-${i}`} className="flex items-start gap-2.5 py-1.5">
                                    <input
                                        id={`prop-${session.id}-${i}`}
                                        type="checkbox"
                                        checked={p.on}
                                        onChange={() => setProposals((v) => (v ? v.map((x, j) => (i === j ? { ...x, on: !x.on } : x)) : v))}
                                        className="mt-1 size-4 accent-[var(--color-brand)]"
                                    />
                                    <label htmlFor={`prop-${session.id}-${i}`} className="text-md leading-6">
                                        {p.title}
                                        <span className="block text-xs text-caption">
                                            {members.find((m) => m.id === p.memberId)?.name.split(" ")[0] ?? "Anyone"} · in {p.dueInDays} day{p.dueInDays === 1 ? "" : "s"}
                                        </span>
                                    </label>
                                </li>
                            ))}
                        </ul>
                        <div className="mt-3 flex gap-2">
                            <Button
                                size="md"
                                onClick={async () => {
                                    const on = proposals.filter((p) => p.on);
                                    if (on.length) await onAddMany(on);
                                    setProposals(null);
                                }}
                            >
                                Add {proposals.filter((p) => p.on).length} follow-up{proposals.filter((p) => p.on).length === 1 ? "" : "s"}
                            </Button>
                            <Button size="md" variant="ghost" onClick={() => setProposals(null)}>
                                Discard
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </li>
    );
}

// ---------------------------------------------------------------------------

interface SessionDraft {
    date: string;
    participants: string[];
    agenda: string;
    notes: string;
    notesVisibility: Visibility;
    notesSharedWith: string[];
    questions: string[];
    nextSessionAt: string | null;
}

function AddSessionDialog({ open, mentorName, onClose, onSave }: { open: boolean; mentorName: string; onClose: () => void; onSave: (input: SessionDraft) => Promise<void> }) {
    const sp = useSpace();
    const today = new Date().toISOString().slice(0, 10);
    const [date, setDate] = useState(today);
    const [at, setAt] = useState("19:00");
    const [participants, setParticipants] = useState<string[]>([sp.me.id]);
    const [agenda, setAgenda] = useState("");
    const [notes, setNotes] = useState("");
    const [visibility, setVisibility] = useState<Visibility>("private");
    const [sharedWith, setSharedWith] = useState<string[]>([]);
    const [questions, setQuestions] = useState("");
    const [nextDate, setNextDate] = useState("");
    const [err, setErr] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    return (
        <Dialog open={open} onClose={onClose} title={`Session with ${mentorName}`} wide>
            <form
                onSubmit={async (e) => {
                    e.preventDefault();
                    if (!agenda.trim()) {
                        setErr("What was it about?");
                        return;
                    }
                    setBusy(true);
                    try {
                        await onSave({
                            date: new Date(`${date}T${at}:00`).toISOString(),
                            participants,
                            agenda: agenda.trim(),
                            notes: notes.trim(),
                            notesVisibility: visibility,
                            notesSharedWith: sharedWith,
                            questions: questions
                                .split("\n")
                                .map((q) => q.trim())
                                .filter(Boolean),
                            nextSessionAt: nextDate ? new Date(`${nextDate}T${at}:00`).toISOString() : null,
                        });
                        setAgenda("");
                        setNotes("");
                        setQuestions("");
                        setErr(null);
                        onClose();
                    } catch (e2) {
                        setErr(e2 instanceof Error ? e2.message : "Couldn't save");
                    } finally {
                        setBusy(false);
                    }
                }}
            >
                <div className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
                    <Field label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    <Field label="Time" type="time" value={at} onChange={(e) => setAt(e.target.value)} />
                    <Field label="What it was about" value={agenda} onChange={(e) => setAgenda(e.target.value)} error={err} placeholder="Leading family devotions" className="md:col-span-2" />
                </div>
                <MemberMultiPicker value={participants} onChange={setParticipants} label="Who was there" className="mt-4" />
                <label className="mt-4 flex flex-col gap-1.5">
                    <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">Notes</span>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} className="rounded-md border border-line-strong bg-card p-3 text-md leading-6 outline-none focus:border-brand" placeholder="What was said, and what landed." />
                </label>
                <VisibilityPicker value={visibility} onChange={setVisibility} sharedWith={sharedWith} onSharedWith={setSharedWith} className="mt-4" />
                <p className="mt-1.5 text-xs text-caption">Notes start private to you — not even the other parent sees them until you share them.</p>
                <label className="mt-4 flex flex-col gap-1.5">
                    <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">Ask before next time (one per line)</span>
                    <textarea value={questions} onChange={(e) => setQuestions(e.target.value)} rows={3} className="rounded-md border border-line-strong bg-card p-3 text-md leading-6 outline-none focus:border-brand" />
                </label>
                <Field label="Next session" type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} className="mt-3" />
                <div className="mt-5 flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        Save the session
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

function AddFollowUpDialog({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (title: string, memberId: string | null, dueAt: string) => Promise<void> }) {
    const sp = useSpace();
    const [title, setTitle] = useState("");
    const [memberId, setMemberId] = useState<string>(sp.me.id);
    const [due, setDue] = useState(addDays(new Date(), 7).slice(0, 10));
    const [err, setErr] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    return (
        <Dialog open={open} onClose={onClose} title="Add a follow-up">
            <form
                onSubmit={async (e) => {
                    e.preventDefault();
                    if (!title.trim()) {
                        setErr("What needs doing?");
                        return;
                    }
                    setBusy(true);
                    try {
                        await onSave(title.trim(), memberId || null, new Date(`${due}T18:00:00`).toISOString());
                        setTitle("");
                        setErr(null);
                        onClose();
                    } catch (e2) {
                        setErr(e2 instanceof Error ? e2.message : "Couldn't save");
                    } finally {
                        setBusy(false);
                    }
                }}
            >
                <Field label="What we agreed" value={title} onChange={(e) => setTitle(e.target.value)} error={err} placeholder="Print the family devotion cards" />
                <label className="mt-3 flex flex-col gap-1.5">
                    <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">Who</span>
                    <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className="h-[46px] rounded-md border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                        {sp.members
                            .filter((m) => m.role !== "guest")
                            .map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.name}
                                </option>
                            ))}
                    </select>
                </label>
                <Field label="Due" type="date" value={due} onChange={(e) => setDue(e.target.value)} className="mt-3" />
                <p className="mt-2 text-xs text-caption">It stays with this session, so next time you can see what was agreed and whether it happened.</p>
                <div className="mt-5 flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        Add it
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
