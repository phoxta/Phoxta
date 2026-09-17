import { useEffect, useState } from "react";
import type { GeneratorSpec, Tool } from "@/lib/founder/types";
import { useVenture } from "@/lib/founder/ventureContext";
import { askAdvisor, contextFromVenture } from "@/lib/founder/advisor";
import ToolShell from "./ToolShell";

/**
 * AI-backed documents: the plan, the pitch, an investor update. Everything the
 * founder has already entered in other tools travels as context, so the output
 * uses their real numbers rather than inventing plausible ones.
 */
export default function ToolGenerator({ tool }: { tool: Tool }) {
    const spec = tool.spec as GeneratorSpec;
    const { saveTool, getTool, ready, venture } = useVenture();
    const saved = getTool(tool.id);

    const [fields, setFields] = useState<Record<string, string>>({});
    const [output, setOutput] = useState<string>("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        if (!ready || hydrated) return;
        const prev = (saved?.answers ?? {}) as { fields?: Record<string, string>; output?: string };
        if (prev.fields) setFields(prev.fields);
        if (prev.output) setOutput(prev.output);
        setHydrated(true);
    }, [ready, hydrated, saved]);

    function set(id: string, value: string) {
        setFields((f) => ({ ...f, [id]: value }));
    }

    async function generate() {
        setBusy(true);
        setError(null);
        const brief = spec.fields
            .map((f) => `${f.label}: ${fields[f.id]?.trim() || "(not given)"}`)
            .join("\n");

        const { reply, error: err } = await askAdvisor({
            task: spec.task,
            question: `Produce ${spec.produces}.\n\n${brief}`,
            context: contextFromVenture(venture, tool.stage),
        });

        setBusy(false);
        if (err || !reply) {
            setError(err ?? "Could not generate that just now.");
            return;
        }
        setOutput(reply.answer);
        saveTool(tool.id, {
            answers: { fields, output: reply.answer },
            result: { label: `${spec.produces} drafted` },
            completedAt: new Date().toISOString(),
        });
    }

    function download() {
        const blob = new Blob([output], { type: "text/markdown;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${tool.slug}-${venture.name ? venture.name.toLowerCase().replace(/\s+/g, "-") : "draft"}.md`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    const canGenerate = spec.fields.some((f) => (fields[f.id] ?? "").trim().length > 0);

    return (
        <ToolShell tool={tool} done={Boolean(saved?.completedAt)}>
            <div className="fd-gen">
                <div className="fd-gen__form">
                    {spec.fields.map((f) => (
                        <div key={f.id} className="fd-field">
                            <label htmlFor={`g-${f.id}`} className="fd-field__label">
                                {f.label}
                            </label>
                            {f.multiline ? (
                                <textarea
                                    id={`g-${f.id}`}
                                    className="form-control"
                                    rows={4}
                                    value={fields[f.id] ?? ""}
                                    onChange={(e) => set(f.id, e.target.value)}
                                />
                            ) : (
                                <input
                                    id={`g-${f.id}`}
                                    type="text"
                                    className="form-control"
                                    value={fields[f.id] ?? ""}
                                    onChange={(e) => set(f.id, e.target.value)}
                                />
                            )}
                            {f.help ? <p className="fd-field__help">{f.help}</p> : null}
                        </div>
                    ))}

                    <button
                        type="button"
                        className="fd-btn"
                        onClick={() => void generate()}
                        disabled={busy || !canGenerate}
                    >
                        {busy ? "Writing…" : output ? `Rewrite the ${spec.produces}` : `Draft the ${spec.produces}`}
                    </button>
                    {!canGenerate ? (
                        <p className="fd-field__help">Fill in at least one field so there is something to work from.</p>
                    ) : null}
                    {error ? <p className="fd-gen__error">{error}</p> : null}
                </div>

                {output ? (
                    <div className="fd-gen__out">
                        <div className="fd-gen__outhead">
                            <h2 className="fd-calc__h">Your draft</h2>
                            <button type="button" className="fd-btn fd-btn--ghost" onClick={download}>
                                Download
                            </button>
                        </div>
                        <div className="fd-gen__text">{output}</div>
                        <div className="fd-caveat">
                            <strong>Check it before you send it.</strong> This is a first draft built from what you typed. Every
                            number in it is yours, not ours, and a reader will assume you stand behind all of them.
                        </div>
                    </div>
                ) : null}
            </div>
        </ToolShell>
    );
}
