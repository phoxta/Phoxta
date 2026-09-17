import { Gavel, Trash2, Trophy } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button, ProgressBar } from "@/components/ui/primitives";
import { ranking } from "../derive";
import type { Comparison, ProjectsState } from "../types";

/**
 * A weighted comparison, ranked live.
 *
 * Nothing here is stored twice: the totals and the order come from `ranking()`
 * over the loaded state, so changing one score re-ranks the table the moment
 * the write lands. Weights are shown in the header because a comparison whose
 * weighting is hidden is just a table of opinions.
 */
export function ComparisonTable({
    state,
    comparison,
    readOnly,
    onScore,
    onDecide,
    onRemove,
    decided,
}: {
    state: ProjectsState;
    comparison: Comparison;
    readOnly: boolean;
    onScore: (optionKey: string, criterionKey: string, score: number) => void;
    onDecide?: () => void;
    onRemove?: () => void;
    decided?: string;
}) {
    const rows = ranking(state, comparison);
    const winner = rows.find((r) => !r.unscored);

    return (
        <section className="rounded-xl bg-card p-4">
            <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="text-[17px] font-semibold">{comparison.title}</h3>
                    <p className="mt-0.5 text-xs text-caption">
                        {comparison.options.length} options · {comparison.criteria.length} criteria · scores out of 10, weighted
                    </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    {onDecide && !decided && (
                        <Button size="sm" variant="outline" onClick={onDecide}>
                            <Gavel size={14} aria-hidden="true" /> Decide
                        </Button>
                    )}
                    {onRemove && (
                        <button type="button" onClick={onRemove} aria-label={`Delete ${comparison.title}`} className="grid size-8 place-items-center rounded-full text-caption hover:text-danger-ink">
                            <Trash2 size={15} aria-hidden="true" />
                        </button>
                    )}
                </div>
            </header>

            {decided && (
                <p className="mb-3 rounded-sm bg-execute-soft px-3 py-2 text-sm text-execute-ink">
                    Decided: <strong className="font-semibold">{decided}</strong>
                </p>
            )}

            <div className="-mx-4 overflow-x-auto px-4">
                <table className="w-full min-w-[560px] border-collapse text-sm">
                    <caption className="sr-only">{comparison.title} — options scored against weighted criteria</caption>
                    <thead>
                        <tr className="border-b border-line text-left">
                            <th scope="col" className="w-44 py-2 pr-3 font-semibold">
                                Option
                            </th>
                            {comparison.criteria.map((c) => (
                                <th key={c.key} scope="col" className="px-2 py-2 align-bottom font-medium text-muted">
                                    <span className="block leading-4">{c.label}</span>
                                    <span className="mt-0.5 block text-2xs text-caption">×{c.weight}</span>
                                </th>
                            ))}
                            <th scope="col" className="w-28 py-2 pl-3 text-right font-semibold">
                                Score
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r) => (
                            <tr key={r.option.key} className={cn("border-b border-line last:border-0", winner?.option.key === r.option.key && "bg-mint-soft/60")}>
                                <th scope="row" className="py-3 pr-3 text-left align-top font-medium">
                                    <span className="flex items-center gap-1.5">
                                        {winner?.option.key === r.option.key && <Trophy size={13} className="shrink-0 text-mint" aria-label="Leading" />}
                                        <span className="min-w-0">
                                            <span className="block leading-5">{r.option.label}</span>
                                            {r.option.note && <span className="mt-0.5 block text-2xs leading-4 text-caption">{r.option.note}</span>}
                                            {r.option.link && (
                                                <a href={r.option.link} target="_blank" rel="noreferrer noopener" className="mt-0.5 block text-2xs text-brand underline-offset-2 hover:underline">
                                                    Open the source
                                                </a>
                                            )}
                                        </span>
                                    </span>
                                </th>
                                {comparison.criteria.map((c) => (
                                    <td key={c.key} className="px-2 py-3 align-top">
                                        {readOnly ? (
                                            <span className="tabular-nums text-muted">{r.scores[c.key] || "—"}</span>
                                        ) : (
                                            <select
                                                value={r.scores[c.key] ?? 0}
                                                onChange={(e) => onScore(r.option.key, c.key, Number(e.target.value))}
                                                aria-label={`${r.option.label} — ${c.label}`}
                                                className="h-9 w-full min-w-14 rounded-sm border border-line-strong bg-card px-2 text-sm tabular-nums outline-none focus:border-brand"
                                            >
                                                {Array.from({ length: 11 }, (_, i) => (
                                                    <option key={i} value={i}>
                                                        {i}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </td>
                                ))}
                                <td className="py-3 pl-3 align-top text-right">
                                    <span className="block text-lg font-semibold tabular-nums">{r.unscored ? "—" : `${r.total}%`}</span>
                                    <ProgressBar value={r.total} className="mt-1.5" label={`${r.option.label} total`} />
                                    <span className="mt-1 block text-2xs text-caption">{r.unscored ? "not scored" : `#${r.rank}`}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {!readOnly && <p className="mt-3 text-2xs text-caption">Change a score and the ranking moves with it.</p>}
        </section>
    );
}
