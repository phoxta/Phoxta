/**
 * Motion.
 *
 * Two things only: sections settle into place as they are reached, and a
 * headline arrives a line at a time. Both use IBM Carbon's easing tokens from
 * `index.css`, both run once, and both are disabled outright when the visitor
 * has asked for reduced motion — the content is in the DOM either way.
 *
 * The rule that keeps this safe: nothing here is the *only* thing making
 * content visible. Every element is readable if the observer never fires, if
 * JavaScript fails, or if the stylesheet does not load.
 */
import { Fragment, useEffect, useRef, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ── Reveal on entry ─────────────────────────────────────────────────────── */

let observer: IntersectionObserver | null = null;

function watcher(): IntersectionObserver {
    if (!observer) {
        observer = new IntersectionObserver(
            (entries) => {
                for (const e of entries) {
                    if (!e.isIntersecting) continue;
                    e.target.setAttribute("data-shown", "true");
                    observer?.unobserve(e.target);
                }
            },
            { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
        );
    }
    return observer;
}

export function Reveal({
    as: As = "div",
    delay = 0,
    className,
    children,
    ...rest
}: { as?: ElementType; delay?: number; className?: string; children: ReactNode } & Record<string, unknown>) {
    const ref = useRef<HTMLElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (reduced() || typeof IntersectionObserver === "undefined") {
            el.setAttribute("data-shown", "true");
            return;
        }
        watcher().observe(el);
        // Content must never be stuck invisible: if the observer has not fired
        // by the time the page has settled, show it anyway.
        const failsafe = window.setTimeout(() => el.setAttribute("data-shown", "true"), 2000);
        return () => {
            window.clearTimeout(failsafe);
            watcher().unobserve(el);
        };
    }, []);

    return (
        <As ref={ref} className={cn("wf-reveal", className)} style={delay ? { transitionDelay: `${delay}ms` } : undefined} {...rest}>
            {children}
        </As>
    );
}

/** Staggers a list of children without wrapping each call site. */
export function RevealGroup({ children, step = 70, className }: { children: ReactNode[]; step?: number; className?: string }) {
    return (
        <>
            {children.map((c, i) => (
                <Reveal key={i} delay={i * step} className={className}>
                    {c}
                </Reveal>
            ))}
        </>
    );
}

/* ── Headline that arrives a line at a time ──────────────────────────────── */

/**
 * Every word sits in a clipping box and starts below it, so a line rises out of
 * nothing rather than fading in.
 *
 * The catch with a responsive headline is that you do not know where it breaks
 * until the browser has laid it out, and splitting by line in the markup breaks
 * at the wrong place on a narrow screen. So the split is by *word* and the
 * stagger is by *line*: after layout each word's `offsetTop` is read, the words
 * sharing one are given the same line index, and words on a line then move
 * together — which is what reads as a line reveal.
 *
 * The whole heading carries its text as an aria-label and the pieces are
 * hidden, so a screen reader hears one sentence rather than a list of words.
 */
export function SplitLines({
    text,
    as: As = "span",
    className,
    delay = 0,
    step = 80,
}: {
    text: string;
    as?: ElementType;
    className?: string;
    /** Milliseconds before the first line moves. */
    delay?: number;
    /** Milliseconds between one line and the next. */
    step?: number;
}) {
    const ref = useRef<HTMLElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (reduced()) {
            el.setAttribute("data-shown", "true");
            return;
        }

        const measure = () => {
            let top: number | null = null;
            let line = -1;
            for (const w of Array.from(el.querySelectorAll<HTMLElement>(".wf-sl__w"))) {
                const t = w.offsetTop;
                // A tolerance, because sub-pixel layout puts words on the same
                // visual line a fraction of a pixel apart.
                if (top === null || t > top + 2) {
                    line += 1;
                    top = t;
                }
                w.style.setProperty("--l", String(line));
            }
        };

        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        // Web fonts land after first paint and change where the lines break.
        void document.fonts?.ready.then(measure).catch(() => {});

        const id = window.requestAnimationFrame(() => el.setAttribute("data-shown", "true"));
        const failsafe = window.setTimeout(() => el.setAttribute("data-shown", "true"), 1600);
        return () => {
            ro.disconnect();
            window.cancelAnimationFrame(id);
            window.clearTimeout(failsafe);
        };
    }, [text]);

    const words = text.split(/\s+/).filter(Boolean);

    return (
        <As
            ref={ref}
            className={cn("wf-sl", className)}
            style={{ "--sl-delay": `${delay}ms`, "--sl-step": `${step}ms` } as React.CSSProperties}
            aria-label={text}
        >
            {words.map((w, i) => (
                // The space belongs between the clipping boxes, never inside
                // one: a box with `overflow: hidden` swallows its own trailing
                // space and the headline runs together.
                <Fragment key={`${w}-${i}`}>
                    <span className="wf-sl__w" aria-hidden="true">
                        <span className="wf-sl__i">{w}</span>
                    </span>
                    {i < words.length - 1 ? " " : null}
                </Fragment>
            ))}
        </As>
    );
}

/**
 * A number that counts up when it is reached. Used on the few figures a family
 * actually watches — sprouts earned, days on a streak, money left this month —
 * and nowhere else, because a counting number is a claim on attention.
 */
export function CountUp({ value, duration = 900, className }: { value: string; duration?: number; className?: string }) {
    const ref = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const match = value.match(/-?[\d,.]+/);
        // Anything without a number in it is just text; print it and stop.
        if (!match || reduced() || typeof IntersectionObserver === "undefined") {
            el.textContent = value;
            return;
        }
        const target = Number(match[0].replace(/,/g, ""));
        if (!Number.isFinite(target)) {
            el.textContent = value;
            return;
        }
        const decimals = (match[0].split(".")[1] ?? "").length;
        const render = (n: number) =>
            value.replace(match[0], n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }));

        el.textContent = render(0);
        let raf = 0;
        const io = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting) return;
                io.disconnect();
                const t0 = performance.now();
                const tick = (now: number) => {
                    const p = Math.min(1, (now - t0) / duration);
                    // Ease out, so it lands rather than stops.
                    el.textContent = render(target * (1 - Math.pow(1 - p, 3)));
                    if (p < 1) raf = requestAnimationFrame(tick);
                };
                raf = requestAnimationFrame(tick);
            },
            { threshold: 0.4 },
        );
        io.observe(el);
        return () => {
            io.disconnect();
            if (raf) cancelAnimationFrame(raf);
        };
    }, [value, duration]);

    return <span ref={ref} className={cn("tabular-nums", className)}>{value}</span>;
}
