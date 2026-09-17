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

    // GPU first, CPU if the machine has no usable one. Plenty of laptops — and
    // every headless browser — fail the GPU delegate outright, and "blur is
    // unavailable on this machine" is a much worse answer than a slower filter.
    const make = (delegate: "GPU" | "CPU") =>
        ImageSegmenter.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: MODEL, delegate },
            runningMode: "VIDEO",
            outputCategoryMask: true,
            outputConfidenceMasks: false,
        });
    let segmenter: Awaited<ReturnType<typeof make>>;
    try {
        segmenter = await make("GPU");
    } catch {
        segmenter = await make("CPU");
    }

    const settings = input.getSettings();
    const w = settings.width ?? 640;
    const h = settings.height ?? 480;

    // The source frame. A <video> is the only thing MediaPipe reads.
    //
    // IT MUST BE IN THE DOCUMENT. A detached <video> is free to stall before
    // readyState 2 — which it does, headless especially — and then every frame
    // is skipped and the canvas stays black. Parked off-screen rather than
    // `display:none`, because that stops decoding too.
    const video = document.createElement("video");
    video.srcObject = new MediaStream([input]);
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("aria-hidden", "true");
    Object.assign(video.style, {
        position: "fixed",
        left: "-9999px",
        top: "0",
        width: "2px",
        height: "2px",
        opacity: "0",
        pointerEvents: "none",
    });
    document.body.appendChild(video);
    await video.play();

    const out = document.createElement("canvas");
    out.width = w;
    out.height = h;
    // Off-screen but IN THE DOCUMENT, for the same reason as the video: a
    // detached canvas is not guaranteed to be composited, and captureStream()
    // then publishes black.
    out.setAttribute("aria-hidden", "true");
    Object.assign(out.style, { position: "fixed", left: "-9999px", top: "0", width: "2px", height: "2px", opacity: "0", pointerEvents: "none" });
    document.body.appendChild(out);
    // We read back every pixel every frame, so this is the honest hint — and it
    // keeps the canvas CPU-backed, which is what makes the readback reliable.
    const ctx = out.getContext("2d", { willReadFrequently: true })!;

    // Scratch canvas holding the blurred copy we punch the person out of.
    const bg = document.createElement("canvas");
    bg.width = w;
    bg.height = h;
    const bgCtx = bg.getContext("2d", { willReadFrequently: true })!;

    let raf = 0;
    let stopped = false;

    const draw = () => {
        if (stopped) return;
        raf = requestAnimationFrame(draw);
        if (video.readyState < 2) return;

        // ALWAYS paint the frame first. The composite below only runs when the
        // segmenter hands back a mask, and on a slow CPU delegate that can be
        // several frames apart — painting only inside that callback left the
        // canvas black, so "blur on" meant "camera off" to everyone watching.
        // The worst case now is an unblurred picture for a frame or two.
        ctx.drawImage(video, 0, 0, w, h);

        segmenter.segmentForVideo(video, performance.now(), (result) => {
            const mask = result.categoryMask;
            if (!mask) return;
            try {
                // The blurred copy we punch the person out of.
                bgCtx.filter = `blur(${radius}px)`;
                bgCtx.drawImage(video, 0, 0, w, h);
                bgCtx.filter = "none";

                const frame = ctx.getImageData(0, 0, w, h);
                const blurred = bgCtx.getImageData(0, 0, w, h);
                const m = mask.getAsUint8Array();
                // Category 0 is background in the selfie segmenter.
                for (let i = 0; i < m.length; i++) {
                    if (m[i] === 0) {
                        const px = i * 4;
                        frame.data[px] = blurred.data[px];
                        frame.data[px + 1] = blurred.data[px + 1];
                        frame.data[px + 2] = blurred.data[px + 2];
                    }
                }
                ctx.putImageData(frame, 0, 0);
            } finally {
                mask.close();
            }
        });
    };
    draw();

    const stream = out.captureStream(24);
    const track = stream.getVideoTracks()[0];

    /**
     * Prove the TRACK WE ARE ABOUT TO PUBLISH carries a picture.
     *
     * Two weaker versions of this check passed while the room still showed a
     * black rectangle: "did we call drawImage" (yes, and it was still black)
     * and "does the canvas have pixels" (it did — but `captureStream()` was
     * handing out black frames anyway, which happens where canvas capture is
     * not properly supported). The only check that means anything is to play
     * the captured track and look at it.
     *
     * If it is black we refuse, and the caller republishes the plain camera.
     * An unblurred picture beats a black rectangle every time.
     */
    const lit = await new Promise<boolean>((resolve) => {
        const probeVideo = document.createElement("video");
        probeVideo.muted = true;
        probeVideo.playsInline = true;
        probeVideo.srcObject = new MediaStream([track]);
        Object.assign(probeVideo.style, { position: "fixed", left: "-9999px", top: "0", width: "2px", height: "2px", opacity: "0", pointerEvents: "none" });
        document.body.appendChild(probeVideo);
        void probeVideo.play().catch(() => {});

        const probe = document.createElement("canvas");
        probe.width = 32;
        probe.height = 18;
        const pg = probe.getContext("2d", { willReadFrequently: true })!;
        const deadline = Date.now() + 5000;

        const done = (ok: boolean) => {
            probeVideo.srcObject = null;
            probeVideo.remove();
            resolve(ok);
        };
        const check = () => {
            if (probeVideo.videoWidth > 0) {
                pg.drawImage(probeVideo, 0, 0, 32, 18);
                const d = pg.getImageData(0, 0, 32, 18).data;
                for (let i = 0; i < d.length; i += 4) {
                    if ((d[i] + d[i + 1] + d[i + 2]) / 3 > 12) return done(true);
                }
            }
            if (Date.now() > deadline) return done(false);
            setTimeout(check, 200);
        };
        check();
    });

    if (!lit) {
        stopped = true;
        cancelAnimationFrame(raf);
        track.stop();
        segmenter.close();
        video.remove();
        out.remove();
        throw new Error("background blur isn't supported on this device");
    }

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
            video.remove();
            out.remove();
        },
    };
}

/** Blur needs a canvas that can emit a stream and a GPU worth using. */
export const canBlur = (): boolean =>
    typeof document !== "undefined" && typeof HTMLCanvasElement.prototype.captureStream === "function";
