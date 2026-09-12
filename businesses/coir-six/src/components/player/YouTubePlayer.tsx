import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";

/**
 * The lecture player for YouTube-hosted lessons.
 *
 * Runs YouTube's own player through the IFrame API so the lesson keeps every
 * behaviour the custom player has: resume from where you stopped, progress
 * saved every few seconds and on pause, completion on the end event, and a
 * per-second tick while actually playing that feeds study time. Captions,
 * speed and keyboard control come from YouTube's player itself (focus it and
 * use K, J/L, C, F). Loaded through the privacy-enhanced domain so nothing is
 * tracked until the learner presses play.
 */

declare global {
    interface Window {
        YT?: YTNamespace;
        onYouTubeIframeAPIReady?: () => void;
    }
}
interface YTNamespace {
    Player: new (el: HTMLElement, opts: YTPlayerOptions) => YTPlayer;
    PlayerState: { PLAYING: number; PAUSED: number; ENDED: number; BUFFERING: number };
}
interface YTPlayerOptions {
    videoId: string;
    host?: string;
    playerVars?: Record<string, string | number>;
    events?: { onReady?: () => void; onStateChange?: (e: { data: number }) => void; onError?: () => void };
}
interface YTPlayer {
    getCurrentTime(): number;
    getDuration(): number;
    seekTo(sec: number, allowSeekAhead: boolean): void;
    destroy(): void;
}

let apiPromise: Promise<YTNamespace> | null = null;
/** Load the IFrame API once per page; every player awaits the same promise. */
function loadApi(): Promise<YTNamespace> {
    if (window.YT?.Player) return Promise.resolve(window.YT);
    if (apiPromise) return apiPromise;
    apiPromise = new Promise((resolve, reject) => {
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            prev?.();
            if (window.YT) resolve(window.YT);
        };
        const s = document.createElement("script");
        s.src = "https://www.youtube.com/iframe_api";
        s.async = true;
        s.onerror = () => reject(new Error("YouTube player failed to load"));
        document.head.appendChild(s);
        window.setTimeout(() => reject(new Error("YouTube player timed out")), 15000);
    });
    return apiPromise;
}

/** "https://www.youtube.com/watch?v=ID", "youtu.be/ID" or a bare id → id. */
// The URL helpers are shared with the mobile app's player.
export { youtubeId, youtubeThumb } from "@coir-six/core";

export interface YouTubePlayerProps {
    videoId: string;
    title: string;
    source?: string;
    startAt?: number;
    onProgress: (positionSec: number, durationSec: number) => void;
    onEnded: () => void;
    onPlayingSecond?: () => void;
}

export function YouTubePlayer({ videoId, title, source, startAt = 0, onProgress, onEnded, onPlayingSecond }: YouTubePlayerProps) {
    const mount = useRef<HTMLDivElement>(null);
    const player = useRef<YTPlayer | null>(null);
    const [playing, setPlaying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const callbacks = useRef({ onProgress, onEnded, onPlayingSecond });
    callbacks.current = { onProgress, onEnded, onPlayingSecond };

    useEffect(() => {
        let alive = true;
        let p: YTPlayer | null = null;
        setError(null);
        setPlaying(false);
        loadApi()
            .then((YT) => {
                if (!alive || !mount.current) return;
                // The API replaces the mount node with the iframe, so give it a
                // child of its own rather than our container.
                const el = document.createElement("div");
                mount.current.replaceChildren(el);
                p = new YT.Player(el, {
                    videoId,
                    host: "https://www.youtube-nocookie.com",
                    playerVars: { rel: 0, modestbranding: 1, playsinline: 1, start: Math.floor(startAt), origin: location.origin },
                    events: {
                        onStateChange: (e) => {
                            const S = YT.PlayerState;
                            if (e.data === S.PLAYING) setPlaying(true);
                            else if (e.data === S.PAUSED || e.data === S.BUFFERING) {
                                setPlaying(false);
                                if (p && e.data === S.PAUSED) callbacks.current.onProgress(p.getCurrentTime(), p.getDuration());
                            } else if (e.data === S.ENDED) {
                                setPlaying(false);
                                if (p) callbacks.current.onProgress(p.getDuration(), p.getDuration());
                                callbacks.current.onEnded();
                            }
                        },
                        onError: () => setError("This video can't be played here. Open it on YouTube instead."),
                    },
                });
                player.current = p;
            })
            .catch((e: Error) => alive && setError(e.message));
        return () => {
            alive = false;
            try {
                p?.destroy();
            } catch {
                /* already gone */
            }
            player.current = null;
        };
    }, [videoId, startAt]);

    // While playing: a study tick every second, a progress save every five.
    useEffect(() => {
        if (!playing) return;
        let n = 0;
        const id = window.setInterval(() => {
            callbacks.current.onPlayingSecond?.();
            n += 1;
            const p = player.current;
            if (p && n % 5 === 0) callbacks.current.onProgress(p.getCurrentTime(), p.getDuration());
        }, 1000);
        return () => window.clearInterval(id);
    }, [playing]);

    return (
        <div className="overflow-hidden rounded-xl bg-ink">
            <div className="relative aspect-video w-full bg-black [&>iframe]:absolute [&>iframe]:inset-0 [&>iframe]:size-full">
                <div ref={mount} className="absolute inset-0 [&>iframe]:size-full" aria-label={`Video: ${title}`} />
                {error && (
                    <div className="absolute inset-0 grid place-items-center p-6 text-center text-[13px] text-white">
                        <p>
                            {error}{" "}
                            <a className="underline" href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noreferrer noopener">
                                Open on YouTube
                            </a>
                        </p>
                    </div>
                )}
            </div>
            <div className="flex items-center gap-3 px-4 py-2 text-[12px] text-white/70">
                <span className="truncate">{source ? `Video by ${source}` : "Video"} · keyboard: K play/pause · J/L ±10s · C captions · F full screen</span>
                <a className="ml-auto inline-flex shrink-0 items-center gap-1 font-semibold text-white hover:underline" href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noreferrer noopener">
                    Watch on YouTube <ExternalLink size={12} />
                </a>
            </div>
        </div>
    );
}
