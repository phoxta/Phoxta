import { useEffect, useMemo, useState } from "react";
import type { QuizSpec, Tool } from "@/lib/founder/types";
import { useVenture } from "@/lib/founder/ventureContext";
import ToolShell from "./ToolShell";

/**
 * Scored questionnaires: founder fit, opportunity score, PMF level, readiness
 * gates. One renderer, many tools. Answers persist as the user goes.
 *
 * Answers store the chosen option's INDEX, not its score. Two options in one
 * question may legitimately share a score (for example "both equally" and a
 * middling answer), and keying on score would highlight both and show the
 * wrong note.
 */
export default function ToolQuiz({ tool }: { tool: Tool }) {
    const spec = tool.spec as QuizSpec;
    const { saveTool, getTool, ready } = useVenture();
    const saved = getTool(tool.id);

    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        if (!ready || hydrated) return;
        setAnswers((saved?.answers ?? {}) as Record<string, number>);
        setHydrated(true);
    }, [ready, hydrated, saved]);

    const maxScore = useMemo(
        () => spec.questions.reduce((sum, q) => sum + Math.max(...q.options.map((o) => o.score)), 0),
        [spec.questions],
    );

    /** Turn stored option indexes into a total score. */
    function scoreOf(picked: Record<string, number>): number {
        return spec.questions.reduce((sum, q) => {
            const ix = picked[q.id];
            const opt = ix === undefined ? undefined : q.options[ix];
            return sum + (opt?.score ?? 0);
        }, 0);
    }

    function bandFor(pct: number) {
        return (
            [...spec.bands].sort((a, b) => b.minPct - a.minPct).find((b) => pct >= b.minPct) ??
            spec.bands[spec.bands.length - 1]
        );
    }

    const answeredCount = Object.keys(answers).length;
    const complete = answeredCount === spec.questions.length;
    const score = useMemo(() => scoreOf(answers), [answers]); // eslint-disable-line react-hooks/exhaustive-deps
    const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const band = bandFor(pct);

    // Group scores let a founder see which cluster is weak, not just a total.
    const groups = useMemo(() => {
        const map = new Map<string, { got: number; max: number }>();
        for (const q of spec.questions) {
            if (!q.group) continue;
            const entry = map.get(q.group) ?? { got: 0, max: 0 };
            const ix = answers[q.id];
            entry.got += ix === undefined ? 0 : (q.options[ix]?.score ?? 0);
            entry.max += Math.max(...q.options.map((o) => o.score));
            map.set(q.group, entry);
        }
        return [...map.entries()].map(([name, v]) => ({
            name,
            pct: v.max > 0 ? Math.round((v.got / v.max) * 100) : 0,
        }));
    }, [answers, spec.questions]);

    function choose(questionId: string, optionIndex: number) {
        const next = { ...answers, [questionId]: optionIndex };
        setAnswers(next);
        const done = Object.keys(next).length === spec.questions.length;
        const nextPct = maxScore > 0 ? Math.round((scoreOf(next) / maxScore) * 100) : 0;
        const nextBand = bandFor(nextPct);
        saveTool(tool.id, {
            answers: next,
            result: { score: nextPct, label: nextBand.label, verdict: nextBand.verdict },
            completedAt: done ? new Date().toISOString() : undefined,
        });
    }

    return (
        <ToolShell tool={tool} done={Boolean(saved?.completedAt)}>
            <div className="fd-quiz">
                <div className="fd-quiz__progress" role="status" aria-live="polite">
                    {answeredCount} of {spec.questions.length} answered
                    <span className="fd-quiz__bar">
                        <span style={{ width: `${(answeredCount / spec.questions.length) * 100}%` }} />
                    </span>
                </div>

                <ol className="fd-quiz__list">
                    {spec.questions.map((q, i) => {
                        const chosenIx = answers[q.id];
                        const chosenOption = chosenIx === undefined ? undefined : q.options[chosenIx];
                        return (
                            <li key={q.id} className="fd-q">
                                {q.group ? <span className="fd-q__group">{q.group}</span> : null}
                                <p className="fd-q__prompt">
                                    <span className="fd-q__n">{i + 1}.</span> {q.prompt}
                                </p>
                                {q.help ? <p className="fd-q__help">{q.help}</p> : null}
                                <div className="fd-q__options" role="radiogroup" aria-label={q.prompt}>
                                    {q.options.map((o, oi) => (
                                        <button
                                            key={`${q.id}-${oi}`}
                                            type="button"
                                            role="radio"
                                            aria-checked={chosenIx === oi}
                                            className={`fd-opt${chosenIx === oi ? " is-on" : ""}`}
                                            onClick={() => choose(q.id, oi)}
                                        >
                                            {o.label}
                                        </button>
                                    ))}
                                </div>
                                {chosenOption?.note ? <p className="fd-q__note">{chosenOption.note}</p> : null}
                            </li>
                        );
                    })}
                </ol>

                {complete ? (
                    <div className={`fd-result fd-result--${band.verdict}`} role="status">
                        <div className="fd-result__score">
                            <span className="fd-result__pct">{pct}%</span>
                            <span className="fd-result__label">{band.label}</span>
                        </div>
                        <p className="fd-result__advice">{band.advice}</p>

                        {groups.length > 1 ? (
                            <div className="fd-result__groups">
                                {groups
                                    .slice()
                                    .sort((a, b) => a.pct - b.pct)
                                    .map((g) => (
                                        <div key={g.name} className="fd-grp">
                                            <span className="fd-grp__name">{g.name}</span>
                                            <span className="fd-grp__bar">
                                                <span style={{ width: `${g.pct}%` }} />
                                            </span>
                                            <span className="fd-grp__pct">{g.pct}%</span>
                                        </div>
                                    ))}
                                <p className="fd-grp__hint">
                                    Your lowest line is the one to work on, or to cover with a partner or a hire.
                                </p>
                            </div>
                        ) : null}
                    </div>
                ) : null}

                {spec.caveat ? (
                    <div className="fd-caveat">
                        <strong>Read this honestly.</strong> {spec.caveat}
                    </div>
                ) : null}
            </div>
        </ToolShell>
    );
}
