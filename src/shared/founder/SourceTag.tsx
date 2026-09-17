import type { Sourced } from "@/lib/founder/types";

/**
 * Every benchmark in the toolkit is shown with where it came from and when.
 * Numbers age; a 2026 figure quoted bare in 2029 is a lie by omission.
 */
export default function SourceTag({ item, inline }: { item: Sourced; inline?: boolean }) {
    const body = (
        <>
            <span className="fd-source__src">{item.source}</span>
            <span className="fd-source__yr">{item.year}</span>
        </>
    );

    if (inline) {
        return <span className="fd-source fd-source--inline">{body}</span>;
    }

    return (
        <span className="fd-source">
            {item.url ? (
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="fd-source__link">
                    {body}
                </a>
            ) : (
                body
            )}
        </span>
    );
}

/** The value plus its context, for benchmark rows and comparison chips. */
export function BenchmarkChip({ item, label }: { item: Sourced; label?: string }) {
    return (
        <div className="fd-bench">
            <div className="fd-bench__head">
                <span className="fd-bench__label">{label ?? "Benchmark"}</span>
                <SourceTag item={item} />
            </div>
            <div className="fd-bench__value">{item.value}</div>
            {item.context ? <div className="fd-bench__ctx">{item.context}</div> : null}
        </div>
    );
}
