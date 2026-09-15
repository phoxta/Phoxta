import type { LocalMedia, MediaDeviceOption } from "@coir-six/core";

/**
 * The browser's camera, microphone and screen, behind the `LocalMedia` seam.
 *
 * Core has no DOM, so it can't call `getUserMedia` itself — this is the web's
 * half of that contract. Two callers: the pre-join lobby, which needs a preview
 * and a level meter before any room exists, and the demo room, whose local tile
 * is the visitor's own camera.
 *
 * One instance per room, disposed with `stopAll()` — a camera light left on
 * after a class has ended is the thing people notice.
 */
export function browserMedia(): LocalMedia {
    const streams: Partial<Record<"camera" | "screen", MediaStream>> = {};
    let analyser: AnalyserNode | null = null;
    let audioCtx: AudioContext | null = null;
    let bins: Uint8Array<ArrayBuffer> | null = null;

    const stop = (source: "camera" | "screen") => {
        streams[source]?.getTracks().forEach((t) => t.stop());
        delete streams[source];
        if (source === "camera") {
            void audioCtx?.close().catch(() => {});
            audioCtx = null;
            analyser = null;
        }
    };

    return {
        async enable(source, deviceId) {
            stop(source);
            const stream =
                source === "screen"
                    ? await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
                    : await navigator.mediaDevices.getUserMedia({
                          video: deviceId ? { deviceId: { exact: deviceId } } : true,
                          audio: true,
                      });
            streams[source] = stream;

            // The lobby's level meter. Web Audio is the only way to read
            // loudness; it is torn down with the camera so no context leaks.
            const mic = stream.getAudioTracks()[0];
            if (source === "camera" && mic) {
                audioCtx = new AudioContext();
                analyser = audioCtx.createAnalyser();
                analyser.fftSize = 512;
                bins = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
                audioCtx.createMediaStreamSource(new MediaStream([mic])).connect(analyser);
            }
        },

        disable: stop,

        attach(source, el) {
            const stream = streams[source];
            const video = el as HTMLVideoElement | null;
            if (!stream || !video) return () => {};
            video.srcObject = stream;
            video.muted = true; // never play your own microphone back at you
            void video.play().catch(() => {
                /* autoplay policies; the poster frame is fine */
            });
            return () => {
                if (video.srcObject === stream) video.srcObject = null;
            };
        },

        async devices(): Promise<MediaDeviceOption[]> {
            const all = await navigator.mediaDevices.enumerateDevices();
            return all
                .filter((d): d is MediaDeviceInfo => d.kind === "audioinput" || d.kind === "videoinput")
                .map((d, i) => ({
                    deviceId: d.deviceId,
                    // Labels are blank until permission is granted, so give the
                    // picker something selectable either way.
                    label: d.label || `${d.kind === "audioinput" ? "Microphone" : "Camera"} ${i + 1}`,
                    kind: d.kind as "audioinput" | "videoinput",
                }));
        },

        level() {
            if (!analyser || !bins) return 0;
            analyser.getByteFrequencyData(bins);
            let sum = 0;
            for (const v of bins) sum += v;
            return Math.min(1, sum / bins.length / 96);
        },

        stopAll() {
            stop("camera");
            stop("screen");
        },
    };
}

/** Whether this browser can do a class at all — shown in the lobby, not at join time. */
export const canUseMedia = (): boolean =>
    typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
