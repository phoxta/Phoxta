import { cn } from "@/lib/cn";

/**
 * The data-viz language: a completion ring and a ten-day bar chart, in plain
 * SVG/CSS. Brand colour only on the bars that matter (design system: "charts
 * use the brand colour only for the bars that matter").
 */

export function Ring({ pct, size = 140, stroke = 2, children, className, label }: { pct: number; size?: number; stroke?: number; children?: React.ReactNode; className?: string; label?: string }) {
    const r = size / 2 - 4;
    const c = 2 * Math.PI * r;
    const v = Math.max(0, Math.min(100, pct));
    return (
        <div className={cn("relative grid place-items-center", className)} style={{ width: size, height: size }} role="img" aria-label={label ?? `${v}% complete`}>
            <svg className="absolute inset-0" width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" aria-hidden="true">
                <circle cx={size / 2} cy={size / 2} r={r} stroke="#E4E1F5" strokeWidth={stroke} />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    stroke="var(--color-brand)"
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={c}
                    strokeDashoffset={c * (1 - v / 100)}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    style={{ transition: "stroke-dashoffset .6s ease" }}
                />
            </svg>
            {children}
        </div>
    );
}

export function BarChart({ data, unit = "min", className, height = 96 }: { data: { label: string; value: number; hi?: boolean }[]; unit?: string; className?: string; height?: number }) {
    const max = Math.max(60, ...data.map((d) => d.value));
    // Tidy axis: three gridlines at nice round numbers.
    const step = max <= 60 ? 20 : max <= 120 ? 40 : max <= 300 ? 100 : Math.ceil(max / 3 / 50) * 50;
    const top = step * 3;
    const ticks = [step * 3, step * 2, step];
    return (
        <figure className={cn("grid grid-cols-[22px_1fr] gap-x-3 rounded-lg bg-page px-4 pb-3 pt-3.5", className)}>
            <div className="flex flex-col justify-between text-[11px] text-muted" style={{ height }} aria-hidden="true">
                {ticks.map((t) => (
                    <span key={t}>{t}</span>
                ))}
            </div>
            <div className="relative" style={{ height }}>
                <div className="absolute inset-0 flex flex-col justify-between" aria-hidden="true">
                    {ticks.map((t) => (
                        <i key={t} className="block border-t border-dashed border-line-strong" />
                    ))}
                </div>
                <ul className="absolute inset-0 flex items-end justify-around px-1.5" aria-label="Study minutes">
                    {data.map((d, i) => (
                        <li key={i} className="flex h-full w-10 items-end justify-center">
                            <span
                                className={cn("w-full rounded-t-[6px] transition-[height] duration-500", d.hi ? "bg-brand" : "bg-track")}
                                style={{ height: `${Math.max(d.value ? 6 : 0, (Math.min(d.value, top) / top) * 100)}%` }}
                                role="img"
                                aria-label={`${d.label}: ${d.value} ${unit}`}
                            />
                        </li>
                    ))}
                </ul>
            </div>
            <figcaption className="col-start-2 mt-3.5 flex justify-around px-1.5 text-[11px] text-muted">
                {data.map((d, i) => (
                    <span key={i} className="w-10 truncate text-center" title={d.label}>
                        {d.label}
                    </span>
                ))}
            </figcaption>
        </figure>
    );
}

/** A 7-day activity strip: a dot per day, filled when studied — the streak made visible. */
export function ActivityStrip({ days, className }: { days: { label: string; minutes: number; today?: boolean }[]; className?: string }) {
    return (
        <ul className={cn("flex items-center justify-between", className)} aria-label="Last seven days">
            {days.map((d, i) => (
                <li key={i} className="flex flex-col items-center gap-1.5" aria-label={`${d.label}: ${d.minutes ? `${d.minutes} min` : "rest"}`}>
                    <span className={cn("grid size-8 place-items-center rounded-full text-[11px] font-semibold", d.minutes ? "bg-brand text-white" : "bg-line text-caption", d.today && !d.minutes && "ring-2 ring-brand ring-offset-2 ring-offset-card")}>
                        {d.minutes ? "✓" : ""}
                    </span>
                    <span className="text-[11px] text-caption">{d.label}</span>
                </li>
            ))}
        </ul>
    );
}
