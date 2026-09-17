import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { AGE_BAND, type AgeBand, type Member } from "@/data/core";
import { useAi } from "@/lib/ai";
import { Dialog } from "@/components/ui/overlay";
import { Button, Field, Spinner } from "@/components/ui/primitives";
import { Notice } from "@/components/shared";
import { Labelled, selectCls } from "./dialogs";
import type { Subject } from "../types";

/**
 * A unit, drafted from a topic.
 *
 * The companion proposes; a parent disposes. It comes back as a title, a
 * sentence of objective and a handful of steps, every one of which is editable
 * before anything is written — and the steps become the unit's assignments,
 * one a week from the date the parent picks.
 */

interface PlanStep {
    title: string;
    minutes?: number;
    activity?: string;
}

interface PlanData {
    title?: string;
    objective?: string;
    steps?: PlanStep[];
    checkQuestions?: string[];
}

export interface GeneratedUnit {
    title: string;
    summary: string;
    assignments: Array<{ title: string; instructions: string }>;
}

export function GenerateUnitDialog({ open, onClose, subjects, child, defaultSubjectId, onCreate }: { open: boolean; onClose: () => void; subjects: Subject[]; child?: Member; defaultSubjectId?: string; onCreate: (subjectId: string, unit: GeneratedUnit, dueFrom: string) => Promise<void> }) {
    const { ask, busy: aiBusy } = useAi();
    const [subjectId, setSubjectId] = useState(defaultSubjectId ?? subjects[0]?.id ?? "");
    const [topic, setTopic] = useState("");
    const [band, setBand] = useState<AgeBand>(child?.ageBand ?? "junior");
    const [draft, setDraft] = useState<GeneratedUnit | null>(null);
    const [dueFrom, setDueFrom] = useState("");
    const [err, setErr] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!open) return;
        setSubjectId(defaultSubjectId ?? subjects[0]?.id ?? "");
        setTopic("");
        setBand(child?.ageBand ?? "junior");
        setDraft(null);
        setErr(null);
        setDueFrom(new Date().toISOString().slice(0, 10));
    }, [open, defaultSubjectId, subjects, child]);

    const subject = subjects.find((s) => s.id === subjectId);

    const generate = async () => {
        if (!topic.trim()) return setErr("What is the unit about?");
        setErr(null);
        try {
            const r = await ask<PlanData>({
                action: "learning-plan",
                prompt: `A unit of work on "${topic}" for ${child ? child.name.split(" ")[0] : "a child"} in the ${AGE_BAND[band].label} band (${AGE_BAND[band].years}), for the subject ${subject?.name ?? "school work"}.`,
                payload: { topic, band, subject: subject?.name, term: subject?.term },
            });
            if (r.unavailable) return setErr(r.unavailable);
            const steps = (r.data?.steps ?? []).filter((s) => s?.title);
            if (!steps.length) return setErr("That didn't come back as a plan. Try a narrower topic.");
            setDraft({
                title: r.data?.title?.trim() || topic.trim(),
                summary: r.data?.objective?.trim() || r.text.trim().slice(0, 240),
                assignments: steps.slice(0, 8).map((s) => ({ title: s.title.trim(), instructions: (s.activity ?? "").trim() })),
            });
        } catch (e) {
            setErr(e instanceof Error ? e.message : "The companion couldn't answer.");
        }
    };

    return (
        <Dialog open={open} onClose={onClose} title="Draft a unit" wide>
            <form
                onSubmit={async (e) => {
                    e.preventDefault();
                    if (!draft) return void generate();
                    if (!subjectId) return setErr("Choose a subject.");
                    setBusy(true);
                    setErr(null);
                    try {
                        await onCreate(subjectId, draft, dueFrom);
                        onClose();
                    } catch (e2) {
                        setErr(e2 instanceof Error ? e2.message : "That didn't save.");
                    } finally {
                        setBusy(false);
                    }
                }}
                className="flex flex-col gap-4"
            >
                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
                    <Labelled label="Subject">
                        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={selectCls}>
                            {subjects.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                    </Labelled>
                    <Labelled label="Age band" hint={AGE_BAND[band].note}>
                        <select value={band} onChange={(e) => setBand(e.target.value as AgeBand)} className={selectCls}>
                            {(["little", "junior", "teen", "young-adult"] as AgeBand[]).map((b) => (
                                <option key={b} value={b}>
                                    {AGE_BAND[b].label} · {AGE_BAND[b].years}
                                </option>
                            ))}
                        </select>
                    </Labelled>
                </div>
                <Field label="Topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="The water cycle" />

                {err && <Notice tone="warn">{err}</Notice>}
                {aiBusy && (
                    <p className="flex items-center gap-2 text-md text-muted">
                        <Spinner /> Drafting the unit…
                    </p>
                )}

                {draft && (
                    <div className="flex flex-col gap-3 rounded-lg bg-brand-soft px-4 py-4">
                        <Field label="Unit title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                        <Labelled label="What it covers">
                            <textarea value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} rows={2} className="w-full rounded-md border border-line-strong bg-card px-3 py-2.5 text-md leading-6 outline-none focus:border-brand" />
                        </Labelled>
                        <div>
                            <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">Assignments · one a week</span>
                            <ul className="flex flex-col gap-2">
                                {draft.assignments.map((a, i) => (
                                    <li key={i} className="flex items-center gap-2">
                                        <span className="w-6 shrink-0 text-xs tabular-nums text-caption">{i + 1}</span>
                                        <input
                                            value={a.title}
                                            onChange={(e) => setDraft({ ...draft, assignments: draft.assignments.map((x, n) => (n === i ? { ...x, title: e.target.value } : x)) })}
                                            aria-label={`Assignment ${i + 1}`}
                                            className="h-10 min-w-0 flex-1 rounded-md border border-line-strong bg-card px-3 text-md outline-none focus:border-brand"
                                        />
                                        <button type="button" onClick={() => setDraft({ ...draft, assignments: draft.assignments.filter((_, n) => n !== i) })} className="text-xs font-semibold text-muted hover:text-danger-ink">
                                            Remove
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <Field label="First one due" type="date" value={dueFrom} onChange={(e) => setDueFrom(e.target.value)} />
                        <p className="text-xs leading-5 text-brand-ink">Nothing is saved until you press Create. Every line is yours to change first.</p>
                    </div>
                )}

                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    {draft ? (
                        <>
                            <Button type="button" variant="outline" onClick={() => setDraft(null)}>
                                Start again
                            </Button>
                            <Button type="submit" loading={busy}>
                                Create the unit
                            </Button>
                        </>
                    ) : (
                        <Button type="submit" loading={aiBusy}>
                            <Sparkles size={15} aria-hidden="true" /> Draft it
                        </Button>
                    )}
                </div>
            </form>
        </Dialog>
    );
}
