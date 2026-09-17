import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import type { Member } from "@/data/core";
import { useAi } from "@/lib/ai";
import { Dialog } from "@/components/ui/overlay";
import { Button, Field, Spinner } from "@/components/ui/primitives";
import { Notice } from "@/components/shared";
import { currentTerm, subjectsFor, termAverage } from "../derive";
import type { CurriculaState } from "../types";

/**
 * "How is Tobi doing in Maths this term?"
 *
 * The companion answers from the family's own data and nothing else, and the
 * dialog says out loud what it used — the subjects, the marks and the work
 * outstanding for that child — because an answer about a nine-year-old's
 * education without its sources is just an opinion.
 */
export function AskDialog({ open, onClose, state, child }: { open: boolean; onClose: () => void; state: CurriculaState; child: Member }) {
    const { ask, busy } = useAi();
    const [q, setQ] = useState("");
    const [answer, setAnswer] = useState<string | null>(null);
    const [err, setErr] = useState<string | null>(null);

    const first = child.name.split(" ")[0];
    const subjects = subjectsFor(state, child.id);
    const term = currentTerm(state, child.id);
    const avg = termAverage(state, child.id, term);

    const suggestions = [
        `How is ${first} doing in ${subjects[0]?.name ?? "Maths"} this term?`,
        `What should ${first} work on before half-term?`,
        `Which subject is ${first} finding hardest, and why?`,
    ];

    useEffect(() => {
        if (!open) return;
        setQ("");
        setAnswer(null);
        setErr(null);
    }, [open]);

    const run = async (question: string) => {
        if (!question.trim()) return;
        setErr(null);
        setAnswer(null);
        try {
            const r = await ask({
                action: "ask",
                prompt: question,
                extraContext: `Answering about ${child.name} (${child.relation}, ${child.ageBand} band). Term: ${term || "current"}. Use only the curriculum data in the grounding; if something isn't there, say you can't see it.`,
            });
            if (r.unavailable) return setErr(r.unavailable);
            setAnswer(r.text.trim() || "The companion had nothing to add.");
        } catch (e) {
            setErr(e instanceof Error ? e.message : "The companion couldn't answer.");
        }
    };

    return (
        <Dialog open={open} onClose={onClose} title={`Ask about ${first}`} wide>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    void run(q);
                }}
                className="flex flex-col gap-4"
            >
                <Field label="Your question" value={q} onChange={(e) => setQ(e.target.value)} placeholder={suggestions[0]} />
                <div className="flex flex-wrap gap-2">
                    {suggestions.map((s) => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => {
                                setQ(s);
                                void run(s);
                            }}
                            className="rounded-full bg-page px-3.5 py-2 text-left text-sm text-muted hover:text-ink"
                        >
                            {s}
                        </button>
                    ))}
                </div>

                {err && <Notice tone="warn">{err}</Notice>}
                {busy && (
                    <p className="flex items-center gap-2 text-md text-muted">
                        <Spinner /> Reading {first}&rsquo;s term…
                    </p>
                )}
                {answer && (
                    <div className="rounded-lg bg-brand-soft px-4 py-4">
                        <p className="whitespace-pre-wrap text-base leading-7 text-ink">{answer}</p>
                        <p className="mt-3 border-t border-brand/20 pt-2.5 text-xs leading-5 text-brand-ink">
                            <strong>I used:</strong> {first}&rsquo;s {subjects.length} subject{subjects.length === 1 ? "" : "s"} ({subjects.map((s) => s.name).join(", ") || "none yet"}); {avg.graded} marked piece{avg.graded === 1 ? "" : "s"} of work
                            {avg.graded ? ` averaging ${avg.avg}%` : ""}; and the work still outstanding. Nothing outside this family&rsquo;s own records.
                        </p>
                    </div>
                )}

                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Close
                    </Button>
                    <Button type="submit" loading={busy}>
                        <Sparkles size={15} aria-hidden="true" /> Ask
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
