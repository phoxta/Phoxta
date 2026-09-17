import { useEffect, useMemo, useState } from "react";
import type { ChecklistSpec, Tool } from "@/lib/founder/types";
import { useVenture } from "@/lib/founder/ventureContext";
import ToolShell from "./ToolShell";

/**
 * Things to get done: the operating cadence, founder legal hygiene, a data
 * room. Items can be scoped to a country, so a UK founder is not shown a US
 * filing they will never make.
 */
export default function ToolChecklist({ tool }: { tool: Tool }) {
    const spec = tool.spec as ChecklistSpec;
    const { saveTool, getTool, ready, venture } = useVenture();
    const saved = getTool(tool.id);

    const [checked, setChecked] = useState<Record<string, boolean>>({});
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        if (!ready || hydrated) return;
        setChecked((saved?.answers as Record<string, boolean>) ?? {});
        setHydrated(true);
    }, [ready, hydrated, saved]);

    const groups = useMemo(
        () =>
            spec.groups.map((g) => ({
                ...g,
                items: g.items.filter((i) => !i.region || i.region === venture.country),
            })),
        [spec.groups, venture.country],
    );

    const total = groups.reduce((n, g) => n + g.items.length, 0);
    const done = groups.reduce((n, g) => n + g.items.filter((i) => checked[i.id]).length, 0);
    const criticalOpen = groups.flatMap((g) => g.items).filter((i) => i.critical && !checked[i.id]);

    function toggle(id: string) {
        const next = { ...checked, [id]: !checked[id] };
        setChecked(next);
        const n = groups.reduce((acc, g) => acc + g.items.filter((i) => next[i.id]).length, 0);
        saveTool(tool.id, {
            answers: next,
            result: { score: total > 0 ? Math.round((n / total) * 100) : 0, label: `${n} of ${total} done` },
            completedAt: n === total ? new Date().toISOString() : undefined,
        });
    }

    return (
        <ToolShell tool={tool} done={Boolean(saved?.completedAt)}>
            <div className="fd-check">
                <div className="fd-check__progress">
                    {done} of {total} done
                    <span className="fd-quiz__bar">
                        <span style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
                    </span>
                </div>

                {criticalOpen.length ? (
                    <div className="fd-caveat">
                        <strong>Do these first.</strong> {criticalOpen.map((i) => i.label).join(". ")}.
                    </div>
                ) : null}

                {groups.map((g) => (
                    <section key={g.title} className="fd-check__group">
                        <h2 className="fd-check__h">{g.title}</h2>
                        <ul className="fd-check__list">
                            {g.items.map((i) => (
                                <li key={i.id} className={i.critical ? "is-critical" : undefined}>
                                    <label className="fd-check__item">
                                        <input
                                            type="checkbox"
                                            className="form-check-input"
                                            checked={Boolean(checked[i.id])}
                                            onChange={() => toggle(i.id)}
                                        />
                                        <span>
                                            <span className="fd-check__text">{i.label}</span>
                                            {i.help ? <span className="fd-check__help">{i.help}</span> : null}
                                        </span>
                                    </label>
                                </li>
                            ))}
                        </ul>
                    </section>
                ))}
            </div>
        </ToolShell>
    );
}
