import { useCallback, useEffect, useRef, useState } from "react";
import { Captions, Maximize, Minimize, Pause, Play, RotateCcw, RotateCw, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/cn";
import { clamp, clock } from "@coir-six/core";

/**
 * The course video player.
 *
 * Native <video> underneath, custom controls on top, and every control also
 * on the keyboard (space/K play, J/L ±10s, arrows ±5s, M mute, C captions,
 * F fullscreen, < > speed) — WCAG's keyboard-operable media without a
 * player library. Captions ride on a real <track>, so the browser's own
 * caption styling and screen-reader plumbing apply. Progress is reported
 * upward every few seconds and on every pause, so a closed tab still resumes
 * within a moment of where it stopped.
 */

const RATES = [0.75, 1, 1.25, 1.5, 2];

export interface VideoPlayerProps {
    src: string;
    captions?: string;
    title: string;
    /** Resume here on load. */
    startAt?: number;
    onProgress: (positionSec: number, durationSec: number) => void;
    onEnded: () => void;
    /** Ticks once per second of actual playback — feeds study time. */
    onPlayingSecond?: () => void;
}

export function VideoPlayer({ src, captions, title, startAt = 0, onProgress, onEnded, onPlayingSecond }: VideoPlayerProps) {
    const video = useRef<HTMLVideoElement>(null);
    const frame = useRef<HTMLDivElement>(null);
    const [playing, setPlaying] = useState(false);
    const [muted, setMuted] = useState(false);
    const [cc, setCc] = useState(Boolean(captions));
    const [rate, setRate] = useState(1);
    const [t, setT] = useState(0);
    const [d, setD] = useState(0);
    const [full, setFull] = useState(false);
    const [buffering, setBuffering] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [idle, setIdle] = useState(false);
    const idleTimer = useRef<number>(0);
    const lastReport = useRef(0);

    // Resume, once the media knows its length.
    const onLoaded = () => {
        const v = video.current;
        if (!v) return;
        setD(v.duration || 0);
        if (startAt > 0 && startAt < (v.duration || Infinity) - 3) v.currentTime = startAt;
    };

    const report = useCallback(
        (force = false) => {
            const v = video.current;
            if (!v || !v.duration) return;
            const now = Date.now();
            if (force || now - lastReport.current > 5000) {
                lastReport.current = now;
                onProgress(v.currentTime, v.duration);
            }
        },
        [onProgress],
    );

    // Per-second study tick while playing.
    useEffect(() => {
        if (!playing) return;
        const id = window.setInterval(() => onPlayingSecond?.(), 1000);
        return () => window.clearInterval(id);
    }, [playing, onPlayingSecond]);

    // Apply caption + rate preferences to the element.
    useEffect(() => {
        const v = video.current;
        if (!v) return;
        v.playbackRate = rate;
        const track = v.textTracks?.[0];
        if (track) track.mode = cc ? "showing" : "hidden";
    }, [rate, cc, src]);

    useEffect(() => {
        const onFs = () => setFull(Boolean(document.fullscreenElement));
        document.addEventListener("fullscreenchange", onFs);
        return () => document.removeEventListener("fullscreenchange", onFs);
    }, []);

    const toggle = () => {
        const v = video.current;
        if (!v) return;
        if (v.paused) void v.play().catch(() => setError("This browser blocked playback. Press play again."));
        else v.pause();
    };
    const seekBy = (s: number) => {
        const v = video.current;
        if (!v) return;
        v.currentTime = clamp(v.currentTime + s, 0, v.duration || 0);
        report(true);
    };
    const toggleFull = () => {
        const el = frame.current;
        if (!el) return;
        if (document.fullscreenElement) void document.exitFullscreen();
        else void el.requestFullscreen?.();
    };
    const wake = () => {
        setIdle(false);
        window.clearTimeout(idleTimer.current);
        idleTimer.current = window.setTimeout(() => setIdle(true), 2600);
    };

    const onKey = (e: React.KeyboardEvent) => {
        if ((e.target as HTMLElement).tagName === "INPUT") return;
        const k = e.key.toLowerCase();
        const map: Record<string, () => void> = {
            " ": toggle, k: toggle,
            j: () => seekBy(-10), l: () => seekBy(10),
            arrowleft: () => seekBy(-5), arrowright: () => seekBy(5),
            m: () => setMuted((m) => !m), c: () => setCc((c) => !c), f: toggleFull,
            ">": () => setRate((r) => RATES[Math.min(RATES.length - 1, RATES.indexOf(r) + 1)]),
            "<": () => setRate((r) => RATES[Math.max(0, RATES.indexOf(r) - 1)]),
        };
        const fn = map[k];
        if (fn) {
            e.preventDefault();
            fn();
            wake();
        }
    };

    return (
        // The frame is the keyboard surface for the documented shortcuts (a region with its
        // own key handling), so it is focusable and listens itself.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
        <div
            ref={frame}
            className={cn("group relative overflow-hidden rounded-xl bg-ink text-white outline-none", full && "rounded-none")}
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
            tabIndex={0}
            role="region"
            aria-label={`Video: ${title}. Keyboard: space to play or pause, J and L to skip ten seconds, M to mute, C for captions, F for full screen.`}
            onKeyDown={onKey}
            onMouseMove={wake}
            onTouchStart={wake}
        >
            {/* Captions are per lesson: the track renders whenever the lesson ships one. */}
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
                ref={video}
                src={src}
                className="aspect-video w-full bg-black"
                playsInline
                preload="metadata"
                muted={muted}
                crossOrigin="anonymous"
                onLoadedMetadata={onLoaded}
                onTimeUpdate={() => {
                    setT(video.current?.currentTime ?? 0);
                    report();
                }}
                onPlay={() => {
                    setPlaying(true);
                    setError(null);
                    wake();
                }}
                onPause={() => {
                    setPlaying(false);
                    report(true);
                }}
                onWaiting={() => setBuffering(true)}
                onPlaying={() => setBuffering(false)}
                onEnded={() => {
                    setPlaying(false);
                    report(true);
                    onEnded();
                }}
                onError={() => setError("The video couldn't be loaded. Check your connection and try again.")}
                onClick={toggle}
            >
                {captions && <track kind="captions" src={captions} srcLang="en" label="English" default />}
            </video>

            {/* Centre state */}
            {(!playing || buffering || error) && (
                <div className="pointer-events-none absolute inset-0 grid place-items-center">
                    {error ? (
                        <p className="pointer-events-auto max-w-xs rounded-md bg-black/70 px-4 py-3 text-center text-[13px]">{error}</p>
                    ) : buffering ? (
                        <span className="size-10 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-label="Buffering" />
                    ) : (
                        <button type="button" onClick={toggle} className="pointer-events-auto grid size-16 place-items-center rounded-full bg-white text-ink shadow-app" aria-label="Play">
                            <Play size={26} fill="currentColor" className="ml-1" />
                        </button>
                    )}
                </div>
            )}

            {/* Controls */}
            <div className={cn("absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-2.5 pt-10 transition-opacity", playing && idle && "opacity-0 group-focus-within:opacity-100")}>
                <input
                    type="range"
                    className="cs-range w-full"
                    min={0}
                    max={d || 0}
                    step={0.5}
                    value={t}
                    aria-label="Seek"
                    aria-valuetext={`${clock(t)} of ${clock(d)}`}
                    onChange={(e) => {
                        const v = video.current;
                        if (v) v.currentTime = Number(e.target.value);
                        report(true);
                    }}
                />
                <div className="mt-1.5 flex items-center gap-1">
                    <Ctl label={playing ? "Pause" : "Play"} onClick={toggle}>{playing ? <Pause size={18} /> : <Play size={18} />}</Ctl>
                    <Ctl label="Back 10 seconds" onClick={() => seekBy(-10)}><RotateCcw size={17} /></Ctl>
                    <Ctl label="Forward 10 seconds" onClick={() => seekBy(10)}><RotateCw size={17} /></Ctl>
                    <Ctl label={muted ? "Unmute" : "Mute"} onClick={() => setMuted((m) => !m)}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</Ctl>
                    <span className="ml-1 text-[12px] tabular-nums text-white/90">
                        {clock(t)} <span className="text-white/50">/ {clock(d)}</span>
                    </span>
                    <span className="flex-1" />
                    <button type="button" onClick={() => setRate((r) => RATES[(RATES.indexOf(r) + 1) % RATES.length])} className="rounded-full px-2 py-1 text-[12px] font-semibold hover:bg-white/15" aria-label={`Playback speed ${rate}x`}>
                        {rate}×
                    </button>
                    {captions && (
                        <Ctl label={cc ? "Hide captions" : "Show captions"} onClick={() => setCc((c) => !c)} active={cc}>
                            <Captions size={18} />
                        </Ctl>
                    )}
                    <Ctl label={full ? "Exit full screen" : "Full screen"} onClick={toggleFull}>{full ? <Minimize size={17} /> : <Maximize size={17} />}</Ctl>
                </div>
            </div>
        </div>
    );
}

function Ctl({ label, onClick, children, active }: { label: string; onClick: () => void; children: React.ReactNode; active?: boolean }) {
    return (
        <button type="button" onClick={onClick} aria-label={label} title={label} aria-pressed={active} className={cn("grid size-9 place-items-center rounded-full hover:bg-white/15", active && "bg-white/25")}>
            {children}
        </button>
    );
}
