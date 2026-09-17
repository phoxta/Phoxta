import { useEffect, useState } from "react";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAi } from "@/lib/ai";
import { Dialog } from "@/components/ui/overlay";
import { Button, Field, Spinner } from "@/components/ui/primitives";
import { Notice } from "@/components/shared";
import { areaCls, Labelled } from "./dialogs";
import { letterFor, rubricTotal } from "../derive";
import type { Assignment, Grade, NewGrade, RubricLine, Submission, Subject } from "../types";

/**
 * Marking.
 *
 * A mark here is three things at once: a percentage that moves the term
 * average the moment it is saved, a sentence of feedback (the part a child
 * actually reads), and a decision about whether the child sees it at all.
 * The last one is the reason grades are their own record: `visibleToChild`
 * keeps the mark out of the child's slice entirely until a parent releases it.
 *
 * The companion can propose the criteria — three or four lines out of ten —
 * but it never puts a number in a box: a parent scores every line by hand.
 */

const DEFAULT_RUBRIC: RubricLine[] = [
    { criterion: "Understanding", score: 0, max: 10 },
    { criterion: "Accuracy", score: 0, max: 10 },
    { criterion: "Presentation", score: 0, max: 10 },
];

/** Pull "- Understanding of the method" style lines out of a plain answer. */
function criteriaFrom(text: string): string[] {
    return text
        .split("\n")
        .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
        .map((l) => l.replace(/\s*[—–-]\s*\/?\s*\d+\s*(?:marks?)?\s*$/i, "").trim())
        .filter((l) => l.length > 2 && l.length < 70 && !l.endsWith(":"))
        .slice(0, 4);
}

export function GradeDialog({ open, onClose, assignment, subject, grade, submission, childName, onSave }: { open: boolean; onClose: () => void; assignment: Assignment; subject?: Subject; grade?: Grade; submission?: Submission; childName: string; onSave: (input: NewGrade) => Promise<void> }) {
    const { ask, busy: aiBusy } = useAi();
    const [useRubric, setUseRubric] = useState(Boolean(grade?.rubric.length));
    const [rubric, setRubric] = useState<RubricLine[]>(grade?.rubric.length ? grade.rubric : DEFAULT_RUBRIC);
    const [score, setScore] = useState(String(grade?.score ?? 70));
    const [comment, setComment] = useState(grade?.comment ?? "");
    const [visible, setVisible] = useState(grade?.visibleToChild ?? true);
    const [err, setErr] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [suggestion, setSuggestion] = useState<string | null>(null);
    const [aiErr, setAiErr] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setUseRubric(Boolean(grade?.rubric.length));
        setRubric(grade?.rubric.length ? grade.rubric : DEFAULT_RUBRIC);
        setScore(String(grade?.score ?? 70));
        setComment(grade?.comment ?? "");
        setVisible(grade?.visibleToChild ?? true);
        setErr(null);
        setSuggestion(null);
        setAiErr(null);
    }, [open, grade]);

    const total = rubricTotal(rubric);
    const finalScore = useRubric ? total.pct : Math.max(0, Math.min(100, Number(score) || 0));

    const suggestRubric = async () => {
        setAiErr(null);
        setSuggestion(null);
        try {
            const r = await ask({
                action: "ask",
                prompt: `Suggest three or four short marking criteria for a piece of ${subject?.name ?? "school"} work set for ${childName}, titled "${assignment.title}". ${assignment.instructions ? `The instructions were: ${assignment.instructions}` : ""} Answer as a plain list, one criterion per line, no scores and no preamble.`,
                extraContext: submission?.text ? `What the child handed in: ${submission.text.slice(0, 800)}` : undefined,
            });
            if (r.unavailable) return setAiErr(r.unavailable);
            setSuggestion(r.text.trim());
        } catch (e) {
            setAiErr(e instanceof Error ? e.message : "The companion couldn't answer.");
        }
    };

    const applySuggestion = () => {
        if (!suggestion) return;
        const lines = criteriaFrom(suggestion);
        if (!lines.length) return setAiErr("Those didn't read as criteria — write them yourself.");
        setRubric(lines.map((criterion) => ({ criterion, score: 0, max: 10 })));
        setUseRubric(true);
        setSuggestion(null);
    };

    return (
        <Dialog open={open} onClose={onClose} title={grade ? "Change the mark" : "Mark this work"} wide>
            <form
                onSubmit={async (e) => {
                    e.preventDefault();
                    setBusy(true);
                    setErr(null);
                    try {
                        await onSave({ score: finalScore, letter: letterFor(finalScore), rubric: useRubric ? rubric : [], comment, visibleToChild: visible });
                        onClose();
                    } catch (e2) {
                        setErr(e2 instanceof Error ? e2.message : "That didn't save.");
                    } finally {
                        setBusy(false);
                    }
                }}
                className="flex flex-col gap-4"
            >
                <div className="rounded-lg bg-page px-4 py-3">
                    <p className="text-md font-semibold">{assignment.title}</p>
                    <p className="text-xs text-caption">
                        {childName}
                        {subject ? ` · ${subject.name}` : ""} · due {assignment.dueDate}
                    </p>
                </div>

                {submission && (submission.text || submission.mediaUrls.length > 0) && (
                    <div className="rounded-lg border border-line bg-card px-4 py-3">
                        <p className="mb-1.5 text-2xs font-semibold uppercase tracking-[0.06em] text-caption">What they handed in</p>
                        {submission.text && <p className="text-md leading-6">{submission.text}</p>}
                        {submission.mediaUrls.length > 0 && (
                            <ul className="mt-3 flex flex-wrap gap-2">
                                {submission.mediaUrls.map((url) => (
                                    <li key={url}>
                                        <img src={url} alt="What they handed in" width={112} height={84} loading="lazy" className="h-[84px] w-28 rounded-sm object-cover" />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                    <button type="button" aria-pressed={!useRubric} onClick={() => setUseRubric(false)} className={cn("h-9 rounded-full px-4 text-sm font-semibold", !useRubric ? "bg-ink text-white" : "bg-page text-muted")}>
                        A percentage
                    </button>
                    <button type="button" aria-pressed={useRubric} onClick={() => setUseRubric(true)} className={cn("h-9 rounded-full px-4 text-sm font-semibold", useRubric ? "bg-ink text-white" : "bg-page text-muted")}>
                        A rubric
                    </button>
                    <Button type="button" variant="outline" size="md" onClick={suggestRubric} disabled={aiBusy} className="ml-auto">
                        {aiBusy ? <Spinner /> : <Sparkles size={15} aria-hidden="true" />} Suggest criteria
                    </Button>
                </div>

                {aiErr && <Notice tone="warn">{aiErr}</Notice>}
                {suggestion && (
                    <div className="rounded-lg bg-brand-soft px-4 py-3">
                        <p className="mb-1.5 text-2xs font-semibold uppercase tracking-[0.06em] text-brand-ink">The companion suggests</p>
                        <p className="whitespace-pre-wrap text-md leading-6 text-ink">{suggestion}</p>
                        <div className="mt-3 flex gap-2">
                            <Button type="button" size="md" onClick={applySuggestion}>
                                Use these criteria
                            </Button>
                            <Button type="button" size="md" variant="ghost" onClick={() => setSuggestion(null)}>
                                Ignore
                            </Button>
                        </div>
                    </div>
                )}

                {useRubric ? (
                    <div className="flex flex-col gap-2">
                        {rubric.map((line, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <input
                                    value={line.criterion}
                                    onChange={(e) => setRubric((r) => r.map((x, n) => (n === i ? { ...x, criterion: e.target.value } : x)))}
                                    aria-label={`Criterion ${i + 1}`}
                                    className="h-11 min-w-0 flex-1 rounded-md border border-line-strong bg-card px-3 text-md outline-none focus:border-brand"
                                />
                                <input
                                    type="number"
                                    min={0}
                                    max={line.max}
                                    value={line.score}
                                    onChange={(e) => setRubric((r) => r.map((x, n) => (n === i ? { ...x, score: Math.max(0, Math.min(x.max, Number(e.target.value) || 0)) } : x)))}
                                    aria-label={`Score for ${line.criterion || `criterion ${i + 1}`}`}
                                    className="h-11 w-16 rounded-md border border-line-strong bg-card px-2 text-center text-md tabular-nums outline-none focus:border-brand"
                                />
                                <span className="text-sm text-caption">/ {line.max}</span>
                                <button type="button" onClick={() => setRubric((r) => r.filter((_, n) => n !== i))} aria-label={`Remove ${line.criterion || "criterion"}`} className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-page hover:text-danger-ink">
                                    <Trash2 size={15} aria-hidden="true" />
                                </button>
                            </div>
                        ))}
                        <div className="flex items-center justify-between gap-3 pt-1">
                            <Button type="button" variant="outline" size="md" onClick={() => setRubric((r) => [...r, { criterion: "", score: 0, max: 10 }])}>
                                <Plus size={15} aria-hidden="true" /> Add a line
                            </Button>
                            <p className="text-md font-semibold tabular-nums">
                                {total.score}/{total.max} · {total.pct}% · {letterFor(total.pct)}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
                        <Field label="Percentage" type="number" min={0} max={100} value={score} onChange={(e) => setScore(e.target.value)} />
                        <div className="flex items-end pb-2 text-md font-semibold">{finalScore}% · {letterFor(finalScore)}</div>
                    </div>
                )}

                <Labelled label="Feedback" hint="One honest sentence they can act on beats a paragraph they won't read.">
                    <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} className={areaCls} />
                </Labelled>

                <div className="flex items-start gap-3 rounded-md bg-page px-4 py-3">
                    <input id="grade-visible-to-child" type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="mt-1 size-4" />
                    <label htmlFor="grade-visible-to-child">
                        <span className="block text-md font-semibold">Show {childName} this mark</span>
                        <span className="block text-xs text-caption">Leave it off and the mark stays with you — it is not hidden on their screen, it is not in their data at all. You can release it later.</span>
                    </label>
                </div>

                {err && <p className="text-sm text-danger-ink">{err}</p>}
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        {grade ? "Save the mark" : "Save the mark"}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
