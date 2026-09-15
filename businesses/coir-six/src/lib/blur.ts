/**
 * Background blur, published as your camera.
 *
 * The room never learns this exists: MediaPipe segments the webcam frame, the
 * composite is drawn to a canvas, and `canvas.captureStream()` yields an
 * ordinary `MediaStreamTrack` that LiveKit publishes like any other camera. So
 * the stage rules, the host controls and the recorder all keep working
 * untouched.
 *
 * Everything here is behind a dynamic import, and the WASM comes from a pinned
 * CDN rather than our bundle — a learner who never turns blur on downloads none
 * of it.
 */

/** Pinned. A vision runtime that silently changes under us is not worth the bytes saved. */
const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const MODEL =
    "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite";

export type BlurHandle = {
    /** The track to publish in place of the raw camera. */
    track: MediaStreamTrack;
    stop(): void;
};

/**
 * Start blurring `input` and return a track carrying the result.
 *
 * `radius` is in CSS filter pixels. 10–14 reads as "tidy room"; past ~20 the
 * edges of the mask start to show.
 */
export async function startBlur(input: MediaStreamTrack, radius = 12): Promise<BlurHandle> {
    const { FilesetResolver, ImageSegmenter } = await import("@mediapipe/tasks-vision");
    const fileset = await FilesetResolver.forVisionTasks(WASM);
    const segmenter = await ImageSegmenter.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL, delegate: "GPU" },
        runningMode: "VIDEO",
        outputCategoryMask: true,
        outputConfidenceMasks: false,
    });

    const settings = input.getSettings();
    const w = settings.width ?? 640;
    const h = settings.height ?? 480;

    // The source frame, off-screen. A <video> is the only thing MediaPipe reads.
    const video = document.createElement("video");
    video.srcObject = new MediaStream([input]);
    video.muted = true;
    video.playsInline = true;
    await video.play();

    const out = document.createElement("canvas");
    out.width = w;
    out.height = h;
    const ctx = out.getContext("2d", { willReadFrequently: false })!;

    // Scratch canvas holding the blurred copy we punch the person out of.
    const bg = document.createElement("canvas");
    bg.width = w;
    bg.height = h;
    const bgCtx = bg.getContext("2d")!;

    let raf = 0;
    let stopped = false;

    const draw = () => {
        if (stopped) return;
        raf = requestAnimationFrame(draw);
        if (video.readyState < 2) return;

        const now = performance.now();
        segmenter.segmentForVideo(video, now, (result) => {
            const mask = result.categoryMask;
            if (!mask) return;

            // 1. the blurred background
            bgCtx.filter = `blur(${radius}px)`;
            bgCtx.drawImage(video, 0, 0, w, h);
            bgCtx.filter = "none";

            // 2. the person, cut out by the mask
            ctx.clearRect(0, 0, w, h);
            ctx.drawImage(video, 0, 0, w, h);
            const frame = ctx.getImageData(0, 0, w, h);
            const blurred = bgCtx.getImageData(0, 0, w, h);
            const m = mask.getAsUint8Array();
            // category 0 is background in the selfie segmenter.
            for (let i = 0; i < m.length; i++) {
                if (m[i] === 0) {
                    const p = i * 4;
                    frame.data[p] = blurred.data[p];
                    frame.data[p + 1] = blurred.data[p + 1];
                    frame.data[p + 2] = blurred.data[p + 2];
                }
            }
            ctx.putImageData(frame, 0, 0);
            mask.close();
        });
    };
    draw();

    const stream = out.captureStream(24);
    const track = stream.getVideoTracks()[0];

    return {
        track,
        stop() {
            stopped = true;
            cancelAnimationFrame(raf);
            try {
                segmenter.close();
            } catch {
                /* already closed */
            }
            track.stop();
            video.srcObject = null;
        },
    };
}

/** Blur needs a canvas that can emit a stream and a GPU worth using. */
export const canBlur = (): boolean =>
    typeof document !== "undefined" && typeof HTMLCanvasElement.prototype.captureStream === "function";
