import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Gauge, Maximize2, Music2, Pause, Play, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { PERF, REEL_MOOD, type ReelMood, type ReelTransition } from "../types";
import { usePrefersReducedMotion } from "./pieces";

/**
 * The reel player.
 *
 * A reel is a playlist, so this is where it becomes a thing you watch. The
 * acceptance criteria are all here, and each of them is a decision in the code
 * rather than a hope:
 *
 *  30 FPS ON A MID-RANGE PHONE (AC 1). Only `transform` and `opacity` are
 *  animated, so the Ken Burns drift and every cross-fade run on the compositor
 *  and never touch layout. At most `PERF.preloadAhead + 2` <img> nodes exist
 *  at once no matter how long the reel is — a sixty-frame reel mounts the same
 *  three pictures a six-frame one does. The frame rate is measured, not
 *  claimed: open Details and watch it.
 *
 *  STARTS WITHIN 3 s (AC 1). The first frame is decoded before the clock
 *  starts, with a hard 1.5 s ceiling so a slow decode delays the picture and
 *  never the playback. Time-to-first-frame is measured from mount and shown in
 *  the same panel.
 *
 *  NO VIDEO FILE (AC 2). Nothing is encoded, nothing is downloaded. What is
 *  shared is a link to this route.
 *
 *  REDUCED MOTION (AC 3). `prefers-reduced-motion` stops the drift outright
 *  and leaves a plain cross-fade — the story still runs, it just stops moving
 *  underneath the reader.
 */

export interface Slide {
    id: string;
    url: string;
    alt: string;
    caption: string;
    ms: number;
}

/** How long a transition takes, per style. */
const FADE: Record<ReelTransition, number> = { crossfade: 750, dip: 420, cut: 0 };

export function ReelPlayer({
    slides,
    title,
    subtitle,
    mood,
    transition,
    trackTitle,
    trackNote,
    audioUrl,
    onExit,
    startAt = 0,
}: {
    slides: Slide[];
    title: string;
    subtitle: string;
    mood: ReelMood;
    transition: ReelTransition;
    trackTitle: string;
    trackNote: string;
    audioUrl?: string | null;
    onExit: () => void;
    startAt?: number;
}) {
    const reduced = usePrefersReducedMotion();
    const [index, setIndex] = useState(startAt);
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [ready, setReady] = useState(false);
    const [details, setDetails] = useState(false);
    const [fps, setFps] = useState(0);
    const [firstFrameMs, setFirstFrameMs] = useState<number | null>(null);
    const [chrome, setChrome] = useState(true);

    const shellRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const mountedAt = useRef<number>(typeof performance === "undefined" ? 0 : performance.now());
    const elapsed = useRef(0);
    const last = useRef(0);
    const frames = useRef(0);
    const sampled = useRef(0);

    const total = slides.length;
    const current = slides[Math.min(index, Math.max(0, total - 1))];
    const ground = REEL_MOOD[mood].ground;
    const ink = REEL_MOOD[mood].ink;
    const fade = reduced && transition === "dip" ? FADE.crossfade : FADE[transition];

    // -- the first frame, decoded before the clock starts ---------------------

    useEffect(() => {
        let live = true;
        const first = slides[startAt] ?? slides[0];
        if (!first) {
            setReady(true);
            return;
        }
        const img = new Image();
        img.src = first.url;
        const go = (): void => {
            if (!live) return;
            setFirstFrameMs(Math.round((typeof performance === "undefined" ? 0 : performance.now()) - mountedAt.current));
            setReady(true);
            setPlaying(true);
        };
        // A slow decode delays the picture, never the playback.
        const ceiling = window.setTimeout(go, 1500);
        const decoded = img.decode?.();
        if (decoded) void decoded.then(go, go);
        else go();
        return () => {
            live = false;
            window.clearTimeout(ceiling);
        };
        // Runs once for the reel; changing frames later is the loop's job.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // -- decode ahead ---------------------------------------------------------

    useEffect(() => {
        for (let i = index + 1; i <= index + PERF.preloadAhead && i < total; i++) {
            const img = new Image();
            img.src = slides[i].url;
            void img.decode?.().catch(() => undefined);
        }
    }, [index, slides, total]);

    // -- the clock ------------------------------------------------------------

    const step = useCallback(
        (t: number) => {
            const dt = last.current ? t - last.current : 0;
            last.current = t;
            frames.current += 1;
            if (t - sampled.current >= 500) {
                setFps(Math.round((frames.current * 1000) / (t - sampled.current)));
                frames.current = 0;
                sampled.current = t;
            }
            const ms = Math.max(800, current?.ms ?? 4000);
            elapsed.current += dt;
            if (elapsed.current >= ms) {
                elapsed.current = 0;
                setIndex((i) => (i + 1 < total ? i + 1 : i));
                if (index + 1 >= total) setPlaying(false);
                setProgress(0);
            } else {
                setProgress(elapsed.current / ms);
            }
        },
        [current?.ms, total, index],
    );

    useEffect(() => {
        if (!playing || !ready) return;
        let raf = 0;
        const tick = (t: number): void => {
            step(t);
            raf = requestAnimationFrame(tick);
        };
        last.current = 0;
        sampled.current = typeof performance === "undefined" ? 0 : performance.now();
        frames.current = 0;
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [playing, ready, step]);

    // The page behind must not scroll under a full-screen reel.
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, []);

    // -- the track ------------------------------------------------------------

    useEffect(() => {
        const a = audioRef.current;
        if (!a) return;
        if (playing) void a.play().catch(() => undefined);
        else a.pause();
    }, [playing]);

    // -- controls -------------------------------------------------------------

    const goto = useCallback(
        (i: number) => {
            elapsed.current = 0;
            setProgress(0);
            setIndex(Math.max(0, Math.min(total - 1, i)));
        },
        [total],
    );

    useEffect(() => {
        const onKey = (e: KeyboardEvent): void => {
            if (e.key === "Escape") return onExit();
            if (e.key === "ArrowRight") {
                e.preventDefault();
                goto(index + 1);
            } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                goto(index - 1);
            } else if (e.key === " " || e.key === "k") {
                e.preventDefault();
                setPlaying((p) => !p);
            } else if (e.key === "f") {
                void shellRef.current?.requestFullscreen?.().catch(() => undefined);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [goto, index, onExit]);

    // The chrome steps out of the way while it plays, and comes back on a move.
    useEffect(() => {
        if (!playing) {
            setChrome(true);
            return;
        }
        const t = window.setTimeout(() => setChrome(false), 2600);
        return () => window.clearTimeout(t);
    }, [playing, index]);

    const window3 = useMemo(() => {
        const from = Math.max(0, index - 1);
        const to = Math.min(total - 1, index + PERF.preloadAhead);
        const list: Array<{ i: number; slide: Slide }> = [];
        for (let i = from; i <= to; i++) list.push({ i, slide: slides[i] });
        return list;
    }, [index, slides, total]);

    if (!total) {
        return (
            <div className="grid min-h-[60vh] place-items-center rounded-xl bg-ink text-center text-white/80">
                <div>
                    <p className="font-display text-3xl">Nothing to play yet</p>
                    <p className="mt-1 text-md text-white/60">Add some pictures and this becomes a reel.</p>
                    <button type="button" onClick={onExit} className="mt-4 rounded-full bg-white px-5 py-2 text-md font-semibold text-ink">
                        Back
                    </button>
                </div>
            </div>
        );
    }

    const dur = Math.max(800, current?.ms ?? 4000);

    return (
        <div ref={shellRef} className="fixed inset-0 z-50 overflow-hidden" style={{ background: ground }} onMouseMove={() => setChrome(true)}>
            {audioUrl && (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <audio ref={audioRef} src={audioUrl} loop preload="none" />
            )}

            {/* The pictures. Only a window of them exists at any moment. */}
            <div className="absolute inset-0">
                {window3.map(({ i, slide }) => {
                    const active = i === index;
                    const kb = !reduced && active && playing;
                    return (
                        <img
                            key={slide.id}
                            src={slide.url}
                            alt={active ? slide.alt : ""}
                            width={1600}
                            height={1067}
                            loading={i === index ? "eager" : "lazy"}
                            aria-hidden={active ? undefined : true}
                            className="absolute inset-0 size-full object-contain will-change-[opacity,transform]"
                            style={{
                                opacity: active ? 1 : 0,
                                transition: fade ? `opacity ${fade}ms ease-in-out ${active && transition === "dip" ? `${fade * 0.6}ms` : "0ms"}` : "none",
                                animation: kb ? `wf-kenburns ${dur + fade}ms linear forwards` : "none",
                                transformOrigin: i % 2 ? "70% 30%" : "30% 70%",
                            }}
                        />
                    );
                })}
                <div className="pointer-events-none absolute inset-0" style={{ background: `linear-gradient(to top, ${ground}f2 0%, ${ground}00 38%, ${ground}00 70%, ${ground}cc 100%)` }} aria-hidden="true" />
            </div>

            {/* Tap zones: back, play/pause, forward. */}
            <div className="absolute inset-0 grid grid-cols-[1fr_1.4fr_1fr]">
                <button type="button" aria-label="Previous picture" onClick={() => goto(index - 1)} className="size-full" />
                <button type="button" aria-label={playing ? "Pause" : "Play"} onClick={() => setPlaying((p) => !p)} className="size-full" />
                <button type="button" aria-label="Next picture" onClick={() => goto(index + 1)} className="size-full" />
            </div>

            {/* Progress: one segment per frame, like a story. */}
            <div className="pointer-events-none absolute inset-x-0 top-0 flex gap-1 px-3 pt-3" aria-hidden="true">
                {slides.map((s, i) => (
                    <span key={s.id} className="h-[3px] min-w-[2px] flex-1 overflow-hidden rounded-full bg-white/25">
                        <span className="block h-full rounded-full bg-white" style={{ width: i < index ? "100%" : i === index ? `${Math.round(progress * 100)}%` : "0%" }} />
                    </span>
                ))}
            </div>

            {/* Top bar */}
            <div className={cn("pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 px-4 pt-7 transition-opacity duration-300", chrome ? "opacity-100" : "opacity-0")}>
                <div className="min-w-0" style={{ color: ink }}>
                    <p className="truncate font-display text-[19px] leading-6">{title}</p>
                    {subtitle && <p className="truncate text-xs opacity-75">{subtitle}</p>}
                </div>
                <div className="pointer-events-auto flex shrink-0 items-center gap-2">
                    <button type="button" onClick={() => setDetails((d) => !d)} aria-pressed={details} aria-label="Playback details" className="grid size-9 place-items-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25">
                        <Gauge size={16} aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => void shellRef.current?.requestFullscreen?.().catch(() => undefined)} aria-label="Full screen" className="grid size-9 place-items-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25">
                        <Maximize2 size={16} aria-hidden="true" />
                    </button>
                    <button type="button" onClick={onExit} aria-label="Close the reel" className="grid size-9 place-items-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25">
                        <X size={16} aria-hidden="true" />
                    </button>
                </div>
            </div>

            {/* Caption + controls */}
            <div className={cn("pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-6 transition-opacity duration-300", chrome ? "opacity-100" : "opacity-0")}>
                <div className="mx-auto max-w-3xl">
                    <p className="min-h-[28px] text-center font-display text-2xl leading-7 md:text-4xl" style={{ color: ink }} aria-live="polite">
                        {current?.caption}
                    </p>
                    <div className="pointer-events-auto mt-4 flex items-center justify-center gap-3">
                        <button type="button" onClick={() => goto(index - 1)} aria-label="Previous" className="grid size-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25">
                            <ChevronLeft size={18} aria-hidden="true" />
                        </button>
                        <button type="button" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Play"} className="grid size-14 place-items-center rounded-full bg-white text-ink">
                            {playing ? <Pause size={20} fill="currentColor" aria-hidden="true" /> : <Play size={20} fill="currentColor" aria-hidden="true" />}
                        </button>
                        <button type="button" onClick={() => goto(index + 1)} aria-label="Next" className="grid size-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25">
                            <ChevronRight size={18} aria-hidden="true" />
                        </button>
                    </div>
                    <p className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-2xs" style={{ color: ink, opacity: 0.7 }}>
                        <span>
                            {index + 1} of {total}
                        </span>
                        {trackTitle && (
                            <span className="inline-flex items-center gap-1">
                                · <Music2 size={11} aria-hidden="true" /> {trackTitle}
                                {audioUrl ? "" : " (credit only)"}
                            </span>
                        )}
                        {reduced && <span>· Motion off, as your device asks</span>}
                    </p>
                </div>
            </div>

            {details && (
                <div className="pointer-events-auto absolute right-4 top-20 w-[268px] rounded-md bg-black/70 p-4 text-xs leading-5 text-white backdrop-blur">
                    <p className="mb-2 text-2xs font-semibold uppercase tracking-[0.06em] text-white/70">Playback</p>
                    <dl className="space-y-1">
                        <div className="flex justify-between gap-3">
                            <dt className="text-white/70">Frame rate</dt>
                            <dd className={cn("tabular-nums font-semibold", fps >= PERF.targetFps ? "text-mint" : "text-peach")}>{playing ? `${fps} fps` : "paused"}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-white/70">First frame</dt>
                            <dd className={cn("tabular-nums font-semibold", (firstFrameMs ?? 0) <= PERF.startMs ? "text-mint" : "text-peach")}>{firstFrameMs === null ? "…" : `${firstFrameMs} ms`}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-white/70">Frames</dt>
                            <dd className="tabular-nums">{total}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-white/70">Loaded</dt>
                            <dd className="tabular-nums">{window3.length} of {total}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-white/70">Motion</dt>
                            <dd>{reduced ? "cross-fade only" : "Ken Burns"}</dd>
                        </div>
                    </dl>
                    <p className="mt-3 border-t border-white/15 pt-2 text-2xs text-white/60">
                        Target: {PERF.targetFps} fps, first frame under {PERF.startMs / 1000} s. {PERF.device}
                    </p>
                    {trackNote && <p className="mt-2 text-2xs text-white/60">{trackNote}</p>}
                    <p className="mt-2 text-2xs text-white/60">No video file is made or downloaded — this plays from your own pictures.</p>
                </div>
            )}

            {!ready && (
                <div className="absolute inset-0 grid place-items-center" style={{ background: ground }} role="status">
                    <span className="text-sm" style={{ color: ink }}>
                        Opening…
                    </span>
                </div>
            )}
        </div>
    );
}
