import { useState } from "react";
import { CheckCircle2, HelpCircle, Plus, X } from "lucide-react";
import type { LiveRoom, RoomSnapshot } from "@coir-six/core";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/primitives";

/**
 * The question on screen.
 *
 * A lecture is one-way until someone has to answer something. This is the bit
 * that makes a live class teaching rather than broadcasting: the mentor puts a
 * question up, the bars move as people answer, and the correct option is
 * revealed only when the mentor closes it.
 *
 * The correct answer never travels to a learner's browser while the question is
 * open — see `LiveQuestion.answer`. Anything else and the quiz is decorative.
 */
export function QuizCard({ snap, room, canHost }: { snap: RoomSnapshot; room: LiveRoom; canHost: boolean }) {
    const q = snap.question;
    if (!q) return null;

    const votes = snap.answers.reduce((n, v) => n + v, 0);
    // The tally is the host's to see while it is open; a learner watching the
    // bars move would just follow the crowd.
    const showBars = canHost || q.closed;

    return (
        <section
            aria-labelledby="live-q"
            className={cn("rounded-xl p-4", q.closed ? "bg-card" : "bg-brand-soft")}
        >
            <div className="mb-3 flex items-center gap-2">
                <HelpCircle size={15} className="text-brand-ink" aria-hidden="true" />
                <h3 id="live-q" className="text-[13px] font-semibold uppercase tracking-[0.04em] text-brand-ink">
                    {q.closed ? "Answer" : "Question"}
                </h3>
                {showBars && (
                    <span className="ml-auto text-[12px] text-muted">
                        {votes} {votes === 1 ? "answer" : "answers"}
                    </span>
                )}
            </div>

            <p className="text-[15px] font-semibold leading-snug">{q.prompt}</p>

            <ul className="mt-3 flex flex-col gap-2">
                {q.options.map((opt, i) => {
                    const mine = snap.myAnswer === i;
                    const right = q.closed && q.answer === i;
                    const pct = votes ? Math.round((snap.answers[i] / votes) * 100) : 0;
                    const locked = q.closed || snap.myAnswer !== null;
                    return (
                        <li key={opt}>
                            <button
                                type="button"
                                disabled={locked}
                                onClick={() => void room.answer(i)}
                                aria-pressed={mine}
                                className={cn(
                                    "relative w-full overflow-hidden rounded-lg border px-3 py-2.5 text-left text-[13px] transition-colors",
                                    right
                                        ? "border-mint bg-mint-soft font-semibold"
                                        : mine
                                          ? "border-brand bg-card font-semibold"
                                          : "border-line-strong bg-card",
                                    !locked && "hover:border-brand",
                                    locked && !right && !mine && "opacity-70",
                                )}
                            >
                                {/* The bar lives behind the label rather than beside it,
                                    so the option stays readable at any percentage. */}
                                {showBars && (
                                    <span
                                        className={cn("absolute inset-y-0 left-0 -z-10", right ? "bg-mint/20" : "bg-brand/10")}
                                        style={{ width: `${pct}%` }}
                                        aria-hidden="true"
                                    />
                                )}
                                <span className="relative flex items-center gap-2">
                                    {right && <CheckCircle2 size={14} className="shrink-0 text-mint" aria-hidden="true" />}
                                    <span className="flex-1">{opt}</span>
                                    {showBars && <span className="shrink-0 tabular-nums text-muted">{pct}%</span>}
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>

            {canHost && !q.closed && (
                <Button variant="outline" size="md" block className="mt-3" onClick={() => void room.closeQuestion()}>
                    Reveal the answer
                </Button>
            )}
            {!canHost && snap.myAnswer !== null && !q.closed && (
                <p className="mt-2.5 text-[12px] text-muted">Answer locked in — waiting for the mentor.</p>
            )}
        </section>
    );
}

/** The mentor's composer. Two options minimum, four maximum — it is a check, not an exam. */
export function AskQuestion({ room, onDone }: { room: LiveRoom; onDone: () => void }) {
    const [prompt, setPrompt] = useState("");
    const [options, setOptions] = useState(["", ""]);
    const [answer, setAnswer] = useState(0);
    const [busy, setBusy] = useState(false);

    const filled = options.map((o) => o.trim()).filter(Boolean);
    const ready = prompt.trim().length > 3 && filled.length >= 2 && answer < options.length && options[answer]?.trim();

    const send = async () => {
        if (!ready || busy) return;
        setBusy(true);
        try {
            await room.ask(prompt.trim(), options.map((o) => o.trim()).filter(Boolean), answer);
            onDone();
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="flex flex-col gap-3">
            <label className="block">
                <span className="mb-1 block text-[12px] font-medium text-caption">Question</span>
                <input
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Which of these ships a static site fastest?"
                    maxLength={200}
                    className="h-11 w-full rounded-sm bg-page px-3 text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-brand"
                />
            </label>

            <fieldset>
                <legend className="mb-1 text-[12px] font-medium text-caption">Options — tick the right one</legend>
                <div className="flex flex-col gap-2">
                    {options.map((opt, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <input
                                type="radio"
                                name="correct"
                                checked={answer === i}
                                onChange={() => setAnswer(i)}
                                aria-label={`Option ${i + 1} is correct`}
                                className="size-4 shrink-0 accent-[var(--color-brand)]"
                            />
                            <input
                                value={opt}
                                onChange={(e) => setOptions(options.map((o, j) => (j === i ? e.target.value : o)))}
                                placeholder={`Option ${i + 1}`}
                                maxLength={120}
                                className="h-10 min-w-0 flex-1 rounded-sm bg-page px-3 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-brand"
                            />
                            {options.length > 2 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setOptions(options.filter((_, j) => j !== i));
                                        if (answer >= i && answer > 0) setAnswer(answer - 1);
                                    }}
                                    aria-label={`Remove option ${i + 1}`}
                                    className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-subtle hover:text-ink"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </fieldset>

            {options.length < 4 && (
                <button
                    type="button"
                    onClick={() => setOptions([...options, ""])}
                    className="inline-flex w-max items-center gap-1.5 text-[13px] font-semibold text-brand hover:underline"
                >
                    <Plus size={14} /> Add an option
                </button>
            )}

            <Button size="lg" block loading={busy} disabled={!ready} onClick={() => void send()}>
                Put it on screen
            </Button>
        </div>
    );
}
