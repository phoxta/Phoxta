import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useAi } from "@/lib/ai";
import { useSpace } from "@/state/space";
import { MemberMultiPicker, Notice } from "@/components/shared";
import { Dialog } from "@/components/ui/overlay";
import { Button, Field, Spinner } from "@/components/ui/primitives";
import type { NewSession, NewStudy, Study, StudySession, StudyType } from "../types";

/**
 * Writing a study, and writing a session.
 *
 * A parent can type the whole thing, or hand the companion a passage and get a
 * draft back — as a proposal, in the form, editable, saved only when a person
 * presses save. The companion never writes to the family's Bible on its own.
 */

interface AiPlan {
    title?: string;
    objective?: string;
    steps?: Array<{ title?: string; minutes?: number; activity?: string }>;
    checkQuestions?: string[];
}

export function StudyDialog({ open, onClose, onSave, initial }: { open: boolean; onClose: () => void; onSave: (input: NewStudy) => Promise<void>; initial?: Study }) {
    const { space } = useSpace();
    const { ask, busy: aiBusy } = useAi();
    const [title, setTitle] = useState("");
    const [type, setType] = useState<StudyType>("custom");
    const [description, setDescription] = useState("");
    const [minutes, setMinutes] = useState(15);
    const [childSafe, setChildSafe] = useState(false);
    const [value, setValue] = useState<string>("");
    const [assignees, setAssignees] = useState<string[]>([]);
    const [passage, setPassage] = useState("");
    const [drafted, setDrafted] = useState<NewSession[]>([]);
    const [aiNote, setAiNote] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setTitle(initial?.title ?? "");
        setType(initial?.type ?? "custom");
        setDescription(initial?.description ?? "");
        setMinutes(initial?.minutes ?? 15);
        setChildSafe(initial?.childSafe ?? false);
        setValue(initial?.value ?? "");
        setAssignees(initial?.assigneeMemberIds ?? []);
        setPassage("");
        setDrafted([]);
        setAiNote(null);
        setError(null);
    }, [open, initial]);

    async function draft(): Promise<void> {
        if (!passage.trim()) return;
        setAiNote(null);
        try {
            const r = await ask<AiPlan>({
                action: "learning-plan",
                prompt: `Write a short family Bible study on ${passage.trim()}. Each step is one session: give the passage reference as the step title and a two-sentence devotional as the activity. Keep it warm, plain and specific to a family with children.`,
                payload: { passage: passage.trim(), audience: childSafe ? "children aged 5 to 10" : "the whole family", values: space.values },
            });
            if (r.unavailable) {
                setAiNote(r.unavailable);
                return;
            }
            const steps = r.data?.steps ?? [];
            if (!steps.length) {
                setAiNote("The companion didn't return anything usable. Try naming a shorter passage.");
                return;
            }
            const questions = (r.data?.checkQuestions ?? []).filter(Boolean);
            setDrafted(
                steps.map((s, i) => ({
                    passage: (s.title ?? passage).trim(),
                    passageText: "",
                    devotional: (s.activity ?? "").trim(),
                    questions: [questions[i * 2] ?? "What stood out to you?", questions[i * 2 + 1] ?? "What will we do differently this week?"],
                    prayerFocus: (r.data?.objective ?? "").trim(),
                })),
            );
            if (!title.trim()) setTitle(r.data?.title ?? `A study on ${passage.trim()}`);
            if (!description.trim()) setDescription(r.data?.objective ?? "");
        } catch {
            setAiNote("The companion couldn't answer just now. You can still write the study yourself.");
        }
    }

    return (
        <Dialog open={open} onClose={onClose} title={initial ? "Edit this study" : "A new study"} wide>
            <form
                onSubmit={async (e) => {
                    e.preventDefault();
                    if (!title.trim()) {
                        setError("Give the study a title.");
                        return;
                    }
                    setBusy(true);
                    setError(null);
                    try {
                        await onSave({
                            title,
                            type,
                            description,
                            childSafe,
                            assigneeMemberIds: assignees,
                            value: value || undefined,
                            minutes,
                            sessions: drafted.length ? drafted : undefined,
                        });
                        onClose();
                    } catch (err) {
                        setError(err instanceof Error ? err.message : "That didn't save.");
                    } finally {
                        setBusy(false);
                    }
                }}
            >
                <Field label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Christmas in Lagos: praying our way there" error={error} />

                <label className="mt-4 block">
                    <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">What it's for</span>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full rounded-md border border-line-strong bg-card px-4 py-3 text-md leading-6 outline-none focus:border-brand" />
                </label>

                <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-3">
                    <label className="block">
                        <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">Kind</span>
                        <select value={type} onChange={(e) => setType(e.target.value as StudyType)} className="h-11 w-full rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                            <option value="custom">Ours</option>
                            <option value="topical">Topical</option>
                            <option value="preloaded">From the library</option>
                        </select>
                    </label>
                    <label className="block">
                        <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">Minutes a session</span>
                        <input type="number" min={5} max={180} value={minutes} onChange={(e) => setMinutes(Number(e.target.value) || 15)} className="h-11 w-full rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand" />
                    </label>
                    <label className="block">
                        <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">Family value</span>
                        <select value={value} onChange={(e) => setValue(e.target.value)} className="h-11 w-full rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                            <option value="">None in particular</option>
                            {space.values.map((v) => (
                                <option key={v} value={v}>
                                    {v}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                <label className="mt-4 flex items-center gap-2.5 text-md">
                    <input type="checkbox" checked={childSafe} onChange={(e) => setChildSafe(e.target.checked)} className="size-4 accent-[var(--color-brand)]" />
                    Written for children — only a child-safe study can be given to a child
                </label>

                <MemberMultiPicker className="mt-4" label="Who is on it" value={assignees} onChange={setAssignees} roles={["parent", "child"]} />

                {!initial && (
                    <div className="mt-5 rounded-lg bg-page p-4">
                        <p className="text-sm font-semibold">Start from a passage</p>
                        <p className="mt-0.5 text-xs leading-5 text-muted">The companion drafts the sessions. You will see them here before anything is saved, and you can change every word.</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <Field className="min-w-[200px] flex-1" label="Passage or topic" value={passage} onChange={(e) => setPassage(e.target.value)} placeholder="Philippians 2:1–11" />
                            <Button variant="outline" className="mt-auto" onClick={draft} disabled={aiBusy || !passage.trim()}>
                                {aiBusy ? <Spinner /> : <Sparkles size={15} aria-hidden="true" />}
                                Draft it
                            </Button>
                        </div>
                        {aiNote && <Notice className="mt-3">{aiNote}</Notice>}
                        {drafted.length > 0 && (
                            <ol className="mt-3 flex flex-col gap-1.5">
                                {drafted.map((d, i) => (
                                    <li key={`${d.passage}-${i}`} className="rounded-sm bg-card px-3 py-2 text-sm">
                                        <span className="font-semibold">{i + 1}. {d.passage}</span>
                                        {d.devotional && <span className="mt-0.5 block text-xs leading-5 text-muted">{d.devotional}</span>}
                                    </li>
                                ))}
                            </ol>
                        )}
                    </div>
                )}

                <div className="mt-6 flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        {initial ? "Save" : "Create the study"}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

export function SessionDialog({ open, onClose, onSave, initial, order }: { open: boolean; onClose: () => void; onSave: (input: NewSession) => Promise<void>; initial?: StudySession; order: number }) {
    const [passage, setPassage] = useState("");
    const [passageText, setPassageText] = useState("");
    const [devotional, setDevotional] = useState("");
    const [q1, setQ1] = useState("");
    const [q2, setQ2] = useState("");
    const [prayerFocus, setPrayerFocus] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setPassage(initial?.passage ?? "");
        setPassageText(initial?.passageText ?? "");
        setDevotional(initial?.devotional ?? "");
        setQ1(initial?.questions[0] ?? "");
        setQ2(initial?.questions[1] ?? "");
        setPrayerFocus(initial?.prayerFocus ?? "");
        setError(null);
    }, [open, initial]);

    return (
        <Dialog open={open} onClose={onClose} title={initial ? `Session ${initial.order}` : `Session ${order}`} wide>
            <form
                onSubmit={async (e) => {
                    e.preventDefault();
                    if (!passage.trim()) {
                        setError("Which passage?");
                        return;
                    }
                    setBusy(true);
                    setError(null);
                    try {
                        await onSave({ passage, passageText, devotional, questions: [q1, q2], prayerFocus });
                        onClose();
                    } catch (err) {
                        setError(err instanceof Error ? err.message : "That didn't save.");
                    } finally {
                        setBusy(false);
                    }
                }}
            >
                <Field label="Passage" value={passage} onChange={(e) => setPassage(e.target.value)} placeholder="Mark 1:35" error={error} />
                <label className="mt-4 block">
                    <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">The words</span>
                    <textarea value={passageText} onChange={(e) => setPassageText(e.target.value)} rows={3} className="w-full rounded-md border border-line-strong bg-card px-4 py-3 text-md leading-6 outline-none focus:border-brand" />
                </label>
                <label className="mt-4 block">
                    <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">Devotional</span>
                    <textarea value={devotional} onChange={(e) => setDevotional(e.target.value)} rows={4} className="w-full rounded-md border border-line-strong bg-card px-4 py-3 text-md leading-6 outline-none focus:border-brand" />
                </label>
                <Field className="mt-4" label="First question" value={q1} onChange={(e) => setQ1(e.target.value)} />
                <Field className="mt-4" label="Second question" value={q2} onChange={(e) => setQ2(e.target.value)} />
                <Field className="mt-4" label="Something to pray" value={prayerFocus} onChange={(e) => setPrayerFocus(e.target.value)} />
                <div className="mt-6 flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
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
