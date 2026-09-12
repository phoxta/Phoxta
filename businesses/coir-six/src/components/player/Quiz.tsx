import { useState } from "react";
import { Check, X } from "lucide-react";
import type { QuizQuestion } from "@coir-six/core";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/primitives";

/** A module check: pick, submit, see why. Passing is two out of three. */
export function Quiz({ questions, onSubmit, lastScore }: { questions: QuizQuestion[]; onSubmit: (score: number, total: number) => Promise<void>; lastScore?: { score: number; total: number } | null }) {
    const [picked, setPicked] = useState<Record<string, number>>({});
    const [submitted, setSubmitted] = useState(false);
    const [busy, setBusy] = useState(false);

    const score = questions.filter((q) => picked[q.id] === q.answer).length;
    const complete = questions.every((q) => picked[q.id] !== undefined);
    const passed = submitted && score / Math.max(1, questions.length) >= 0.66;

    const submit = async () => {
        setBusy(true);
        await onSubmit(score, questions.length);
        setBusy(false);
        setSubmitted(true);
    };

    return (
        <div className="flex flex-col gap-4">
            {lastScore && !submitted && (
                <p className="rounded-md bg-page px-4 py-3 text-[13px] text-muted">
                    Last attempt: {lastScore.score}/{lastScore.total}. Retake as often as you like.
                </p>
            )}
            {questions.map((q, i) => (
                <fieldset key={q.id} className="rounded-xl bg-card p-4">
                    <legend className="mb-3 text-[15px] font-semibold">
                        <span className="mr-2 text-caption">{i + 1}.</span>
                        {q.prompt}
                    </legend>
                    <div className="flex flex-col gap-2">
                        {q.options.map((opt, j) => {
                            const chosen = picked[q.id] === j;
                            const state = submitted ? (j === q.answer ? "right" : chosen ? "wrong" : "idle") : chosen ? "picked" : "idle";
                            return (
                                <label
                                    key={j}
                                    className={cn(
                                        "flex cursor-pointer items-center gap-3 rounded-md border px-3.5 py-2.5 text-[14px] transition-colors",
                                        state === "picked" && "border-brand bg-brand-soft",
                                        state === "right" && "border-mint bg-mint-soft",
                                        state === "wrong" && "border-danger bg-danger-soft",
                                        state === "idle" && "border-line-strong hover:border-ink",
                                        submitted && "cursor-default",
                                    )}
                                >
                                    <input type="radio" name={q.id} className="sr-only" checked={chosen} disabled={submitted} onChange={() => setPicked((p) => ({ ...p, [q.id]: j }))} />
                                    <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border", chosen || state === "right" ? "border-current" : "border-line-strong")} aria-hidden="true">
                                        {state === "right" ? <Check size={12} strokeWidth={3} /> : state === "wrong" ? <X size={12} strokeWidth={3} /> : chosen ? <span className="size-2.5 rounded-full bg-brand" /> : null}
                                    </span>
                                    <code className="font-sans">{opt}</code>
                                </label>
                            );
                        })}
                    </div>
                    {submitted && <p className="mt-3 text-[13px] text-muted">{q.explanation}</p>}
                </fieldset>
            ))}
            {submitted ? (
                <div className={cn("flex flex-wrap items-center gap-3 rounded-xl p-4", passed ? "bg-mint-soft text-mint" : "bg-peach-soft text-peach")}>
                    <span className="text-[16px] font-semibold">
                        {score}/{questions.length} — {passed ? "passed. Lesson complete." : "not quite. Two out of three passes."}
                    </span>
                    {!passed && (
                        <Button variant="outline" size="md" className="ml-auto" onClick={() => { setPicked({}); setSubmitted(false); }}>
                            Try again
                        </Button>
                    )}
                </div>
            ) : (
                <Button onClick={() => void submit()} disabled={!complete} loading={busy} className="self-start">
                    Submit answers
                </Button>
            )}
        </div>
    );
}
