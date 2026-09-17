import { useEffect, useState, type FormEvent } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/overlay";
import type { CourseWeek } from "../types";

/**
 * The week's quiz — five questions, one answer each, marked the moment it is
 * submitted, with the reason shown for anything missed. Every attempt is kept
 * (the best one is what the week shows), because a second go at a book you
 * have just read is the point, not cheating.
 */

export function QuizDialog({
    open,
    onClose,
    week,
    best,
    onSubmit,
}: {
    open: boolean;
    onClose: () => void;
    week: CourseWeek;
    best: { score: number; total: number; attempts: number } | null;
    onSubmit: (answers: number[]) => Promise<{ score: number; total: number }>;
}) {
    const [answers, setAnswers] = useState<number[]>([]);
    const [result, setResult] = useState<{ score: number; total: number } | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setAnswers(Array(week.quiz.length).fill(-1));
        setResult(null);
        setError(null);
    }, [open, week.quiz.length]);

    const answered = answers.filter((a) => a >= 0).length;

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (answered < week.quiz.length) {
            setError("Have a go at every question first.");
            return;
        }
        setBusy(true);
        setError(null);
        try {
            setResult(await onSubmit(answers));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't save that attempt.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} title={`Week ${week.week} quiz`} wide>
            {result ? (
                <div className="flex flex-col gap-4">
                    <div className="rounded-lg bg-grow-soft px-5 py-6 text-center">
                        <p className="font-display text-8xl leading-10 text-grow-ink">
                            {result.score} <span className="text-2xl">/ {result.total}</span>
                        </p>
                        <p className="mt-1 text-md text-muted">
                            {result.score === result.total ? "Every one. Well read." : result.score >= Math.ceil(result.total * 0.6) ? "Good going — have a look at the ones below." : "Worth another read of the chapters, then try again."}
                        </p>
                        {best && <p className="mt-2 text-xs text-caption">Your best so far: {Math.max(best.score, result.score)} out of {result.total}</p>}
                    </div>
                    <ol className="flex flex-col gap-3">
                        {week.quiz.map((q, i) => {
                            const right = answers[i] === q.answer;
                            return (
                                <li key={i} className={cn("rounded-md p-3.5", right ? "bg-mint-soft" : "bg-danger-soft")}>
                                    <p className="flex items-start gap-2 text-md font-medium">
                                        {right ? <Check size={16} className="mt-0.5 shrink-0 text-mint" aria-hidden="true" /> : <X size={16} className="mt-0.5 shrink-0 text-danger-ink" aria-hidden="true" />}
                                        {q.q}
                                    </p>
                                    <p className="mt-1.5 pl-6 text-sm text-muted">
                                        {right ? q.options[q.answer] : `You said "${q.options[answers[i]] ?? "nothing"}" — the answer is "${q.options[q.answer]}".`}
                                    </p>
                                    {q.why && <p className="mt-1 pl-6 text-xs text-caption">{q.why}</p>}
                                </li>
                            );
                        })}
                    </ol>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" type="button" onClick={() => setResult(null)}>
                            Try again
                        </Button>
                        <Button type="button" onClick={onClose}>
                            Done
                        </Button>
                    </div>
                </div>
            ) : (
                <form onSubmit={submit} className="flex flex-col gap-5">
                    {best && (
                        <p className="rounded-md bg-page px-4 py-2.5 text-sm text-muted">
                            Best so far: <strong className="font-semibold text-ink">{best.score} out of {best.total}</strong> in {best.attempts} {best.attempts === 1 ? "go" : "goes"}.
                        </p>
                    )}
                    {week.quiz.map((q, i) => (
                        <fieldset key={i}>
                            <legend className="mb-2 text-md font-medium">
                                {i + 1}. {q.q}
                            </legend>
                            <div className="flex flex-col gap-1.5">
                                {q.options.map((o, n) => (
                                    <label key={n} className={cn("flex cursor-pointer items-center gap-3 rounded-md border px-3.5 py-2.5 text-md", answers[i] === n ? "border-brand bg-brand-soft" : "border-line-strong hover:border-line")}>
                                        <input
                                            type="radio"
                                            name={`q-${week.id}-${i}`}
                                            checked={answers[i] === n}
                                            onChange={() => setAnswers((a) => a.map((v, j) => (j === i ? n : v)))}
                                            className="size-4 accent-[var(--color-brand)]"
                                        />
                                        {o}
                                    </label>
                                ))}
                            </div>
                        </fieldset>
                    ))}
                    {error && <p className="text-sm text-danger-ink">{error}</p>}
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-caption">
                            {answered} of {week.quiz.length} answered
                        </span>
                        <div className="flex gap-2">
                            <Button variant="ghost" type="button" onClick={onClose}>
                                Not now
                            </Button>
                            <Button type="submit" loading={busy}>
                                Mark it
                            </Button>
                        </div>
                    </div>
                </form>
            )}
        </Dialog>
    );
}
