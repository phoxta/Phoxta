import { useEffect, useState } from "react";
import type { Tool, WorksheetSpec } from "@/lib/founder/types";
import { useVenture } from "@/lib/founder/ventureContext";
import ToolShell from "./ToolShell";

interface RowAnswer {
    text: string;
    /** 1 (a guess) to 5 (proven). */
    confidence?: number;
    /** How the founder will find out whether the answer is true. */
    test?: string;
}

const CONFIDENCE_LABELS = ["", "A guess", "A hunch", "Reasoned", "Some evidence", "Proven"];

/**
 * Structured prose tools: the market evaluation, the model builder, source
 * stacking. Where an answer is really an assumption, the row also asks for a
 * confidence and a planned test. That habit comes from the handbook's
 * market-evaluation worksheet and is the single most useful thing in it.
 */
export default function ToolWorksheet({ tool }: { tool: Tool }) {
    const spec = tool.spec as WorksheetSpec;
    const { saveTool, getTool, ready } = useVenture();
    const saved = getTool(tool.id);

    const [rows, setRows] = useState<Record<string, RowAnswer>>({});
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        if (!ready || hydrated) return;
        setRows((saved?.answers as Record<string, RowAnswer>) ?? {});
        setHydrated(true);
    }, [ready, hydrated, saved]);

    function patch(id: string, patchValue: Partial<RowAnswer>) {
        const next = { ...rows, [id]: { ...(rows[id] ?? { text: "" }), ...patchValue } };
        setRows(next);
        const filled = spec.rows.filter((r) => (next[r.id]?.text ?? "").trim().length > 0).length;
        saveTool(tool.id, {
            answers: next,
            result: { score: Math.round((filled / spec.rows.length) * 100), label: `${filled} of ${spec.rows.length} answered` },
            completedAt: filled === spec.rows.length ? new Date().toISOString() : undefined,
        });
    }

    const weakest = spec.rows
        .filter((r) => r.wantsEvidence && rows[r.id]?.text && (rows[r.id]?.confidence ?? 3) <= 2)
        .map((r) => r.label);

    return (
        <ToolShell tool={tool} done={Boolean(saved?.completedAt)}>
            <div className="fd-sheet">
                {spec.intro ? <p className="fd-sheet__intro">{spec.intro}</p> : null}

                {spec.rows.map((r) => {
                    const a = rows[r.id] ?? { text: "" };
                    return (
                        <div key={r.id} className="fd-row">
                            <label htmlFor={`w-${r.id}`} className="fd-row__label">
                                {r.label}
                            </label>
                            {r.help ? <p className="fd-row__help">{r.help}</p> : null}
                            <textarea
                                id={`w-${r.id}`}
                                className="form-control"
                                rows={3}
                                placeholder={r.placeholder}
                                value={a.text}
                                onChange={(e) => patch(r.id, { text: e.target.value })}
                            />
                            {r.wantsEvidence ? (
                                <div className="fd-row__evidence">
                                    <div className="fd-row__conf">
                                        <span className="fd-row__conflabel">
                                            How sure are you? {a.confidence ? <em>{CONFIDENCE_LABELS[a.confidence]}</em> : null}
                                        </span>
                                        <div className="fd-conf" role="radiogroup" aria-label={`Confidence in: ${r.label}`}>
                                            {[1, 2, 3, 4, 5].map((n) => (
                                                <button
                                                    key={n}
                                                    type="button"
                                                    role="radio"
                                                    aria-checked={a.confidence === n}
                                                    aria-label={CONFIDENCE_LABELS[n]}
                                                    className={`fd-conf__dot${(a.confidence ?? 0) >= n ? " is-on" : ""}`}
                                                    onClick={() => patch(r.id, { confidence: n })}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        placeholder="How will you test this?"
                                        value={a.test ?? ""}
                                        onChange={(e) => patch(r.id, { test: e.target.value })}
                                    />
                                </div>
                            ) : null}
                        </div>
                    );
                })}

                {weakest.length ? (
                    <div className="fd-caveat">
                        <strong>Test these first.</strong> You marked {weakest.length === 1 ? "this" : "these"} as a guess:{" "}
                        {weakest.join(", ")}. An assumption you have not tested is the most expensive thing in any plan.
                    </div>
                ) : null}
            </div>
        </ToolShell>
    );
}
