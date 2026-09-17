import { IMPORT_BUDGET_MS } from "./types";

/**
 * What YouTube can tell us about a video from the URL alone.
 *
 * Two sources, raced against one budget (acceptance criterion 1, measured on a
 * warm cache over broadband — whatever has answered within
 * `IMPORT_BUDGET_MS` is what the form gets, and the fields stay editable
 * either way, so the importer can never hang on a slow network):
 *
 *  1. YouTube's public oEmbed endpoint — CORS-open, gives title and channel.
 *  2. YouTube's IFrame player, mounted off-screen — gives the duration
 *     (oEmbed has none) and, as a fallback, the title and author.
 *
 * The thumbnail needs neither: it is a deterministic i.ytimg.com URL.
 */

export interface VideoLookup {
    title: string;
    channel: string;
    durationS: number;
    /** True when at least one source answered inside the budget. */
    found: boolean;
}

const EMPTY: VideoLookup = { title: "", channel: "", durationS: 0, found: false };

interface OEmbed {
    title?: unknown;
    author_name?: unknown;
}

async function viaOEmbed(id: string, signal: AbortSignal): Promise<Partial<VideoLookup>> {
    const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`;
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error("oembed");
    const body = (await res.json()) as OEmbed;
    return {
        title: typeof body.title === "string" ? body.title : "",
        channel: typeof body.author_name === "string" ? body.author_name : "",
    };
}

/** Load YouTube's IFrame API once per page (shared with the lesson player). */
function api(): Promise<NonNullable<typeof window.YT>> {
    if (window.YT?.Player) return Promise.resolve(window.YT);
    return new Promise((resolve, reject) => {
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            prev?.();
            if (window.YT) resolve(window.YT);
        };
        if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
            const s = document.createElement("script");
            s.src = "https://www.youtube.com/iframe_api";
            s.async = true;
            s.onerror = () => reject(new Error("player"));
            document.head.appendChild(s);
        }
    });
}

/**
 * Duration (and, if oEmbed is blocked, title and author) from the player
 * itself. The off-screen host is always torn down — including when the player
 * neither becomes ready nor errors, which is what a blocked or very slow
 * network looks like — so an abandoned import never leaves an iframe behind.
 */
async function viaPlayer(id: string, budgetMs: number): Promise<Partial<VideoLookup>> {
    const YT = await api();
    const host = document.createElement("div");
    host.setAttribute("aria-hidden", "true");
    host.style.cssText = "position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden";
    const mount = document.createElement("div");
    host.appendChild(mount);
    document.body.appendChild(host);
    try {
        return await new Promise<Partial<VideoLookup>>((resolve, reject) => {
            let player: { destroy(): void; getDuration(): number; getVideoData?: () => { title?: string; author?: string } } | null = null;
            const done = (out: Partial<VideoLookup>): void => {
                try {
                    player?.destroy();
                } catch {
                    /* already gone */
                }
                resolve(out);
            };
            // Whatever happens, this promise settles inside the budget.
            window.setTimeout(() => done({}), budgetMs);
            player = new YT.Player(mount, {
                videoId: id,
                host: "https://www.youtube-nocookie.com",
                playerVars: { origin: location.origin },
                events: {
                    onReady: () => {
                        const p = player;
                        if (!p) return done({});
                        const meta = p.getVideoData?.() ?? {};
                        done({ durationS: Math.round(p.getDuration() || 0), title: meta.title ?? "", channel: meta.author ?? "" });
                    },
                    onError: () => reject(new Error("player")),
                },
            });
        });
    } finally {
        host.remove();
    }
}

/**
 * Look the video up. Never throws: an unreachable YouTube simply returns
 * `found: false` and the parent types the details in themselves.
 */
export async function lookupVideo(id: string, budgetMs = IMPORT_BUDGET_MS): Promise<VideoLookup> {
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), budgetMs);
    const out: VideoLookup = { ...EMPTY };
    let closed = false;
    const merge = (part: Partial<VideoLookup>): void => {
        // Past the budget the answer is already on screen; ignore stragglers.
        if (closed) return;
        if (!out.title && part.title) out.title = part.title;
        if (!out.channel && part.channel) out.channel = part.channel;
        if (!out.durationS && part.durationS) out.durationS = part.durationS;
        if (part.title || part.channel || part.durationS) out.found = true;
    };
    const budget = new Promise<void>((resolve) => window.setTimeout(resolve, budgetMs));
    try {
        await Promise.race([
            budget,
            Promise.allSettled([
                viaOEmbed(id, ctrl.signal).then(merge, () => undefined),
                viaPlayer(id, budgetMs).then(merge, () => undefined),
            ]).then(() => undefined),
        ]);
    } finally {
        closed = true;
        window.clearTimeout(timer);
        ctrl.abort();
    }
    return out;
}
