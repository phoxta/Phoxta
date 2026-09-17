import type { ReferenceSpec, Sourced, Tool } from "@/lib/founder/types";
import ToolShell from "./ToolShell";
import SourceTag from "./SourceTag";

function isSourced(cell: string | Sourced): cell is Sourced {
    return typeof cell === "object" && cell !== null && "value" in cell;
}

/**
 * Read-only tables: base rates, valuation multiples, regional rules. Nothing
 * to fill in, but every figure carries its source and year so a reader can
 * check it and see how old it is.
 */
export default function ToolReference({ tool }: { tool: Tool }) {
    const spec = tool.spec as ReferenceSpec;

    return (
        <ToolShell tool={tool}>
            <div className="fd-ref">
                <div className="fd-ref__scroll">
                    <table className="fd-ref__table">
                        <thead>
                            <tr>
                                {spec.columns.map((c) => (
                                    <th key={c} scope="col">
                                        {c}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {spec.rows.map((row, ri) => (
                                <tr key={ri}>
                                    {row.map((cell, ci) => (
                                        <td key={ci}>
                                            {isSourced(cell) ? (
                                                <span className="fd-ref__cell">
                                                    <strong className="fd-ref__value">{cell.value}</strong>
                                                    {cell.context ? <span className="fd-ref__ctx">{cell.context}</span> : null}
                                                    <SourceTag item={cell} />
                                                </span>
                                            ) : (
                                                cell
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {spec.note ? (
                    <div className="fd-caveat">
                        <strong>How to read this.</strong> {spec.note}
                    </div>
                ) : null}
            </div>
        </ToolShell>
    );
}
