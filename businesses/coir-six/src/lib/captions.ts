import type { CaptionSource } from "@coir-six/core";

/**
 * The host's microphone, transcribed.
 *
 * Talks to Phoxta's own relay (`integrations/live-stt`), not to Deepgram — our
 * Deepgram key is scoped to `usage:write` only, so it can neither mint child
 * keys nor grant short-lived tokens, and a key that can spend money must not
 * reach a browser. `getUrl` returns a ticketed relay URL, signed by
 * `coir-live` for this class and good for minutes.
 *
 * Audio goes up as webm/opus straight from `MediaRecorder`: no resampling, no
 * AudioWorklet, and the same encoder the recorder already uses. The relay
 * passes Deepgram's JSON back untouched, so the parsing below is Deepgram's
 * shape either way.
 */
export function relayCaptions(getUrl: () => Promise<string>): CaptionSource {
    let socket: WebSocket | null = null;
    let recorder: MediaRecorder | null = null;
    let stream: MediaStream | null = null;
    let keepAlive: ReturnType<typeof setInterval> | null = null;

    const stop = () => {
        if (keepAlive) clearInterval(keepAlive);
        keepAlive = null;
        try {
            if (recorder && recorder.state !== "inactive") recorder.stop();
        } catch {
            /* already stopped */
        }
        recorder = null;
        stream?.getTracks().forEach((t) => t.stop());
        stream = null;
        try {
            // Closing the socket is the signal; the relay flushes Deepgram for us.
            socket?.close();
        } catch {
            /* already closed */
        }
        socket = null;
    };

    return {
        async start(onLine) {
            stop();
            const url = await getUrl();
            stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true },
            });

            // The relay chooses the Deepgram parameters; the browser only
            // supplies audio and a ticket.
            const ws = new WebSocket(url);
            socket = ws;

            await new Promise<void>((resolve, reject) => {
                const timer = setTimeout(() => reject(new Error("Captions timed out connecting")), 12000);
                ws.onopen = () => {
                    clearTimeout(timer);
                    resolve();
                };
                ws.onerror = () => {
                    clearTimeout(timer);
                    reject(new Error("Captions could not connect"));
                };
            });

            ws.onmessage = (e) => {
                try {
                    const msg = JSON.parse(String(e.data)) as {
                        channel?: { alternatives?: { transcript?: string }[] };
                        is_final?: boolean;
                    };
                    const text = msg.channel?.alternatives?.[0]?.transcript?.trim();
                    if (text) onLine(text, Boolean(msg.is_final));
                } catch {
                    /* keepalive / metadata frames */
                }
            };

            const mime = ["audio/webm;codecs=opus", "audio/webm"].find((m) => MediaRecorder.isTypeSupported(m));
            const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
            rec.ondataavailable = (ev) => {
                if (ev.data.size && ws.readyState === WebSocket.OPEN) ws.send(ev.data);
            };
            // 250ms chunks: small enough that captions feel live, large enough
            // that we are not sending a websocket frame per audio frame.
            rec.start(250);
            recorder = rec;

            // The relay keeps Deepgram alive through a silent room; nothing to do here.
        },
        stop,
    };
}

/** Whether this browser can do captions at all. */
export const canCaption = (): boolean =>
    typeof MediaRecorder !== "undefined" && typeof WebSocket !== "undefined";
