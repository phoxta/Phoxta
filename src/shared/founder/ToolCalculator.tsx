import { useEffect, useMemo, useState } from "react";
import type { CalcOutput, CalcSpec, Tool } from "@/lib/founder/types";
import { useVenture } from "@/lib/founder/ventureContext";
import ToolShell from "./ToolShell";
import { BenchmarkChip } from "./SourceTag";

/** Currency is the founder's business, not ours: show a neutral separator. */
function formatValue(value: number, format: CalcOutput["format"]): string {
    if (!Number.isFinite(value)) return "—";
    switch (format) {
        case "percent":
            return `${(Math.round(value * 10) / 10).toLocaleString()}%`;
        case "multiple":
            return `${(Math.round(value * 100) / 100).toLocaleString()}x`;
        case "months":
            return `${Math.round(value * 10) / 10} months`;
        case "money":
            return Math.round(value).toLocaleString();
        default:
            return (Math.round(value * 100) / 100).toLocaleString();
    }
}

/**
 * Numeric tools: breakeven, unit economics, runway, dilution, valuation.
 * The formula is always shown next to the answer, so the maths is auditable.
 */
export default function ToolCalculator({ tool }: { tool: Tool }) {
    const spec = tool.spec as CalcSpec;
    const { saveTool, getTool, ready } = useVenture();
    const saved = getTool(tool.id);

    const defaults = useMemo(
        () => Object.fromEntries(spec.fields.map((f) => [f.id, f.default ?? 0])) as Record<string, number>,
        [spec.fields],
    );

    const [inputs, setInputs] = useState<Record<string, number>>(defaults);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        if (!ready || hydrated) return;
        const prev = saved?.answers as Record<string, number> | undefined;
        if (prev && Object.keys(prev).length) setInputs({ ...defaults, ...prev });
        setHydrated(true);
    }, [ready, hydrated, saved, defaults]);

    const outputs = useMemo(() => {
        try {
            return spec.compute(inputs);
        } catch {
            // A bad input should never white-screen the page.
            return {} as Record<string, number>;
        }
    }, [inputs, spec]);

    function update(id: string, raw: string) {
        const n = raw === "" ? 0 : Number(raw);
        const next = { ...inputs, [id]: Number.isFinite(n) ? n : 0 };
        setInputs(next);
        let result: Record<string, number> = {};
        try {
            result = spec.compute(next);
        } catch {
            result = {};
        }
        const headline = spec.outputs[0];
        saveTool(tool.id, {
            answers: next,
            result: headline
                ? { score: result[headline.id], label: `${headline.label}: ${formatValue(result[headline.id], headline.format)}` }
                : undefined,
            completedAt: new Date().toISOString(),
        });
    }

    return (
        <ToolShell tool={tool} done={Boolean(saved?.completedAt)}>
            <div className="fd-calc">
                <div className="fd-calc__inputs">
                    <h2 className="fd-calc__h">Your numbers</h2>
                    {spec.fields.map((f) => (
                        <div key={f.id} className="fd-field">
                            <label htmlFor={`f-${f.id}`} className="fd-field__label">
                                {f.label}
                                {f.unit ? <span className="fd-field__unit">{f.unit}</span> : null}
                            </label>
                            <input
                                id={`f-${f.id}`}
                                type="number"
                                className="form-control"
                                value={Number.isFinite(inputs[f.id]) ? inputs[f.id] : 0}
                                min={f.min}
                                max={f.max}
                                step={f.step ?? "any"}
                                onChange={(e) => update(f.id, e.target.value)}
                                inputMode="decimal"
                            />
                            {f.help ? <p className="fd-field__help">{f.help}</p> : null}
                        </div>
                    ))}
                </div>

                <div className="fd-calc__outputs">
                    <h2 className="fd-calc__h">What that means</h2>
                    {spec.outputs.map((o) => {
                        const value = outputs[o.id];
                        const good = o.good ? o.good(outputs, inputs) : undefined;
                        return (
                            <div
                                key={o.id}
                                className={`fd-out${good === true ? " is-good" : good === false ? " is-bad" : ""}`}
                            >
                                <div className="fd-out__top">
                                    <span className="fd-out__label">{o.label}</span>
                                    <span className="fd-out__value">{formatValue(value, o.format)}</span>
                                </div>
                                <code className="fd-out__formula">{o.formula}</code>
                                {o.help ? <p className="fd-out__help">{o.help}</p> : null}
                                {o.benchmark ? <BenchmarkChip item={o.benchmark} /> : null}
                            </div>
                        );
                    })}
                    {spec.rule ? (
                        <div className="fd-caveat fd-caveat--rule">
                            <strong>The rule behind it.</strong> {spec.rule}
                        </div>
                    ) : null}
                </div>
            </div>
        </ToolShell>
    );
}
