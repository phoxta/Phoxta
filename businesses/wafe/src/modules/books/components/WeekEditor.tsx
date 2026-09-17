import { useState, type FormEvent } from "react";
import { Plus, X } from "lucide-react";
import { Button, Field } from "@/components/ui/primitives";
import type { CourseWeek, QuizQuestion } from "../types";

/**
 * Editing a week before anybody sees it.
 *
 * Whatever wrote the scaffold — the companion or a blank form — this is where
 * a parent makes it theirs: the theme, the chapters, the three questions they
 * would actually ask, the one thing to do together, and a quiz whose answers
 * they have checked. Publishing is a separate, deliberate act.
 */

const BLANK: QuizQuestion = { q: "", options: ["", "", "", ""], answer: 0 };

export function WeekEditor({ week, onSave, onCancel }: { week: CourseWeek; onSave: (patch: Partial<Pick<CourseWeek, "theme" | "chapters" | "discussionQuestions" | "familyActivity" | "quiz">>) => Promise<void>; onCancel: () => void }) {
    const [theme, setTheme] = useState(week.theme);
    const [chapters, setChapters] = useState(week.chapters);
    const [questions, setQuestions] = useState<string[]>(week.discussionQuestions.length ? week.discussionQuestions : ["", "", ""]);
    const [activity, setActivity] = useState(week.familyActivity);
    const [quiz, setQuiz] = useState<QuizQuestion[]>(week.quiz);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const setQ = (i: number, patch: Partial<QuizQuestion>) => setQuiz((qs) => qs.map((q, n) => (n === i ? { ...q, ...patch } : q)));

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            await onSave({
                theme: theme.trim(),
                chapters: chapters.trim(),
                discussionQuestions: questions.map((q) => q.trim()).filter(Boolean),
                familyActivity: activity.trim(),
                quiz: quiz
                    .map((q) => ({ ...q, q: q.q.trim(), options: q.options.map((o) => o.trim()) }))
                    .filter((q) => q.q && q.options.filter(Boolean).length >= 2),
            });
            onCancel();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't save that week.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <form onSubmit={submit} className="flex flex-col gap-4 rounded-lg bg-page p-4">
            <Field label="Theme" value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="Mealtimes: the table as a welcome" />
            <Field label="What to read" value={chapters} onChange={(e) => setChapters(e.target.value)} placeholder="Chapters 3–4" />

            <fieldset>
                <legend className="mb-1.5 text-xs font-medium uppercase tracking-[0.06em] text-muted">Questions for the table</legend>
                <div className="flex flex-col gap-2">
                    {questions.map((q, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <input
                                value={q}
                                onChange={(e) => setQuestions((qs) => qs.map((x, n) => (n === i ? e.target.value : x)))}
                                placeholder={`Question ${i + 1}`}
                                aria-label={`Discussion question ${i + 1}`}
                                className="h-11 min-w-0 flex-1 rounded-md border border-line-strong bg-card px-4 text-md outline-none focus:border-brand"
                            />
                            <button type="button" aria-label={`Remove question ${i + 1}`} onClick={() => setQuestions((qs) => qs.filter((_, n) => n !== i))} className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-card hover:text-ink">
                                <X size={15} aria-hidden="true" />
                            </button>
                        </div>
                    ))}
                </div>
                <Button size="sm" variant="ghost" type="button" onClick={() => setQuestions((qs) => [...qs, ""])} className="mt-2">
                    <Plus size={14} aria-hidden="true" /> Another question
                </Button>
            </fieldset>

            <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">One thing to do together</span>
                <textarea value={activity} onChange={(e) => setActivity(e.target.value)} rows={2} className="w-full rounded-md border border-line-strong bg-card px-4 py-3 text-md outline-none focus:border-brand" placeholder="Invite one person outside the family to Sunday lunch." />
            </label>

            <fieldset>
                <legend className="mb-1.5 text-xs font-medium uppercase tracking-[0.06em] text-muted">Quiz ({quiz.length} of 5)</legend>
                <div className="flex flex-col gap-4">
                    {quiz.map((q, i) => (
                        <div key={i} className="rounded-md bg-card p-3.5">
                            <div className="flex items-start gap-2">
                                <input
                                    value={q.q}
                                    onChange={(e) => setQ(i, { q: e.target.value })}
                                    placeholder={`Question ${i + 1}`}
                                    aria-label={`Quiz question ${i + 1}`}
                                    className="h-10 min-w-0 flex-1 rounded-sm border border-line-strong bg-card px-3 text-md font-medium outline-none focus:border-brand"
                                />
                                <button type="button" aria-label={`Remove quiz question ${i + 1}`} onClick={() => setQuiz((qs) => qs.filter((_, n) => n !== i))} className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-page hover:text-ink">
                                    <X size={15} aria-hidden="true" />
                                </button>
                            </div>
                            <div className="mt-2.5 flex flex-col gap-1.5">
                                {q.options.map((o, n) => (
                                    <label key={n} className="flex items-center gap-2.5">
                                        <input type="radio" name={`answer-${week.id}-${i}`} checked={q.answer === n} onChange={() => setQ(i, { answer: n })} aria-label={`Mark option ${n + 1} correct`} className="size-4 shrink-0 accent-[var(--color-brand)]" />
                                        <input
                                            value={o}
                                            onChange={(e) => setQ(i, { options: q.options.map((x, m) => (m === n ? e.target.value : x)) })}
                                            placeholder={`Option ${n + 1}`}
                                            aria-label={`Question ${i + 1}, option ${n + 1}`}
                                            className="h-9 min-w-0 flex-1 rounded-sm border border-line bg-card px-3 text-sm outline-none focus:border-brand"
                                        />
                                    </label>
                                ))}
                            </div>
                            <input
                                value={q.why ?? ""}
                                onChange={(e) => setQ(i, { why: e.target.value })}
                                placeholder="Why that is the answer (optional)"
                                aria-label={`Question ${i + 1}, explanation`}
                                className="mt-2.5 h-9 w-full rounded-sm border border-line bg-card px-3 text-sm outline-none focus:border-brand"
                            />
                        </div>
                    ))}
                </div>
                {quiz.length < 5 && (
                    <Button size="sm" variant="ghost" type="button" onClick={() => setQuiz((qs) => [...qs, { ...BLANK, options: [...BLANK.options] }])} className="mt-2">
                        <Plus size={14} aria-hidden="true" /> Another quiz question
                    </Button>
                )}
            </fieldset>

            {error && <p className="text-sm text-danger-ink">{error}</p>}

            <div className="flex justify-end gap-2">
                <Button variant="ghost" type="button" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" loading={busy}>
                    Save week {week.week}
                </Button>
            </div>
        </form>
    );
}
