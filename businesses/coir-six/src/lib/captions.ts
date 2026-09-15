import type { CaptionSource } from "@coir-six/core";

/**
 * The host's microphone, transcribed.
 *
 * Deepgram's live endpoint takes a WebSocket. A browser cannot set an
 * `Authorization` header on one, so the key travels as a subprotocol — which is
 * exactly why the key handed over here must be the short-lived child key minted
 * by `coir-live`, never the account key.
 *
 * Audio goes up as webm/opus straight from `MediaRecorder`: no resampling, no
 * AudioWorklet, and the same encoder the recorder already uses.
 */
export function deepgramCaptions(getKey: () => Promise<string>): CaptionSource {
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
            // Tell Deepgram we meant to finish, so it flushes the last line
            // instead of treating the drop as a network failure.
            if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "CloseStream" }));
            socket?.close();
        } catch {
            /* already closed */
        }
        socket = null;
    };

    return {
        async start(onLine) {
            stop();
            const key = await getKey();
            stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true },
            });

            const params = new URLSearchParams({
                model: "nova-2",
                language: "en",
                smart_format: "true",
                // Partials make the caption bar feel live; only finals are kept.
                interim_results: "true",
                punctuate: "true",
            });
            const ws = new WebSocket(`wss://api.deepgram.com/v1/listen?${params}`, ["token", key]);
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

            // A silent room would otherwise have Deepgram close the socket on us.
            keepAlive = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "KeepAlive" }));
            }, 8000);
        },
        stop,
    };
}

/** Whether this browser can do captions at all. */
export const canCaption = (): boolean =>
    typeof MediaRecorder !== "undefined" && typeof WebSocket !== "undefined";
