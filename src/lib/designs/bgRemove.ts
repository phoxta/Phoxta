/**
 * Background removal that is genuinely free to ship.
 *
 * ─── THE LICENCE VERDICT (checked 26 Aug 2026, from package metadata, not memory)
 *
 * `@imgly/background-removal@1.7.0` is the obvious drop-in and it is DISQUALIFIED.
 * Its package.json says `"license": "SEE LICENSE IN LICENSE.md"`, and the LICENSE.md
 * inside the published tarball is the **GNU Affero General Public License v3**. Its
 * README adds: "The software is free for use under the AGPL License. Please contact
 * support@img.ly for questions about other licensing options." AGPL §13 obliges the
 * operator of a network service built on the work to offer its complete source to
 * every user of that service. Phoxta is a closed-source, multi-tenant SaaS, so the
 * only lawful ways to use it are to open-source the platform or to buy an IMG.LY
 * commercial licence. Neither is "free". Not a footnote — a legal problem.
 *
 * BriaAI RMBG-1.4 and RMBG-2.0 are the other popular answer and are also
 * DISQUALIFIED: their model cards are CC BY-NC 4.0 (non-commercial) with a separate
 * paid commercial agreement.
 *
 * What we ship instead, all of it unambiguously free for commercial use:
 *
 *   RUNTIME  onnxruntime-web@1.22.0 — `"license": "MIT"` (and its onnxruntime-common
 *            dependency, also MIT). Microsoft's own ONNX runtime compiled to WASM.
 *
 *   WEIGHTS  U²-Netp ("u2netp"), the small variant of U²-Net, from
 *            https://github.com/xuebinqin/U-2-Net — **Apache License 2.0** (verified
 *            against that repository's LICENSE file). A copy of the licence ships
 *            beside the weights at `public/models/LICENSE-u2net-apache-2.0.txt`,
 *            with provenance in `public/models/NOTICE.md`, which is what Apache-2.0
 *            §4 asks of anyone redistributing the work.
 *
 *            The exact `u2netp.onnx` file is the ONNX export published by
 *            danielgatis/rembg (MIT) as release asset v0.0.0/u2netp.onnx —
 *            4,574,861 bytes, sha256
 *            309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8.
 *            It is **vendored into `public/`**, not loaded from a third-party CDN:
 *            a CDN that disappears would take the feature with it, and a CDN that
 *            is merely slow would leak which tenant is editing what.
 *
 * ─── WHAT IT COSTS
 *
 * Nothing per image, no API key, and no upload: every byte is processed in the
 * tenant's own browser. The price is a one-time download on first use —
 * ~2.9 MB of WASM runtime plus ~4.2 MB of weights over the wire (11.2 MB and
 * 4.6 MB uncompressed), after which both sit in the HTTP cache and the session is
 * held in memory for the rest of the page's life.
 *
 * Each cut-out then costs a few seconds of CPU: U²-Netp is about 9 GFLOPs at
 * 320×320 and one WASM thread gets through it in ~5 s on the machine this was
 * measured on, likely faster on newer hardware. Tell the user what is happening —
 * `onProgress` exists for exactly that — and do not promise instant. (The obvious
 * future upgrade is the WebGPU execution provider: switch the dynamic import to
 * `onnxruntime-web/webgpu`, its two `.jsep.` files, and
 * `executionProviders: ["webgpu", "wasm"]`. It roughly doubles the one-time
 * download and was left out here because it could not be verified on a headless
 * machine with no GPU, and an unverified fast path is worse than a slow one.)
 *
 * The main thread does block during the run. A worker would fix that and is the
 * other worthwhile follow-up; it was not worth the plumbing for a first cut.
 *
 * Nothing here is in the initial bundle. `onnxruntime-web/wasm` is reached through a
 * dynamic `import()` so Rollup gives it its own chunk, and the model and the WASM
 * binary are plain files fetched on demand. The only thing this module contributes
 * to the main bundle is the code you are reading and one asset URL string.
 *
 * ─── HOW IT WORKS
 *
 * U²-Netp is a salient-object detector: fed a 320×320 image it returns a 320×320
 * confidence map of "this is the subject". We normalise that map, scale it back up
 * to the source resolution, and use it as the alpha channel of a PNG. The colour
 * pixels are never resampled down and back — only the mask is — so the cut-out keeps
 * the resolution of what you gave it (up to the canvas ceilings noted below).
 *
 * The image is always fetched into a Blob and decoded with `createImageBitmap`,
 * never assigned to an `<img>` src. That matters: a cross-origin `<img>` taints the
 * canvas, and a tainted canvas throws only at the very end, at `toBlob`, after all
 * the work is done. Fetching first means a cross-origin host that refuses us fails
 * immediately, loudly, and with something a human can act on — never as a silent
 * black rectangle.
 */

// The runtime's two loose files live inside the onnxruntime-web package, which does
// not expose `./dist/*` through its `exports` map, so a bare specifier cannot reach
// them. A relative path can, and `?url` makes Vite emit each as a hashed asset and
// hand back its URL — which keeps them locked to whatever version of the package is
// installed. Copies pinned in `public/` would silently rot the day someone bumps the
// dependency, and a runtime/binary mismatch fails in ways nobody enjoys debugging.
//
// BOTH are required. The `.mjs` is the Emscripten glue; if only the `.wasm` override
// is given, the runtime derives the glue's URL from the same directory under its
// *unhashed* name and 404s, and the only symptom is a session that will not start.
import ortWasmUrl from "../../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm?url";
import ortGlueUrl from "../../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs?url";

type Ort = typeof import("onnxruntime-web/wasm");
type OrtSession = Awaited<ReturnType<Ort["InferenceSession"]["create"]>>;

/** Where the vendored weights are served from. `public/` is copied verbatim to dist. */
const MODEL_URL = "/models/u2netp.onnx";

/** U²-Net's fixed working size. Feeding anything else is not an option: the export
 *  has static input dims, and 320×320 is what the published weights were trained at. */
const SIDE = 320;

/** ImageNet normalisation, exactly as the reference U²-Net / rembg pipeline uses it. */
const MEAN = [0.485, 0.456, 0.406] as const;
const STD = [0.229, 0.224, 0.225] as const;

/** Canvas ceilings. Mobile Safari refuses to allocate a canvas above ~16.7 M pixels
 *  and returns a blank one rather than throwing, so we scale down to fit instead of
 *  handing the user an empty PNG. Desktop rarely gets anywhere near either limit. */
const MAX_EDGE = 4096;
const MAX_AREA = 16_777_216;

/** Below this the model is guessing; above it, it is sure. Squeezing the ends of the
 *  range removes the faint grey haze U²-Net leaves over plain backgrounds without
 *  hardening the edge into a cut-out-with-scissors look. */
const FLOOR = 0.08;
const CEIL = 0.92;

export type BgRemovalProgress = {
  /** Human-readable and safe to show verbatim, e.g. "Finding the subject". */
  stage: string;
  /** 0–100 where it is knowable; absent for steps with no measurable length. */
  pct?: number;
};

export type BgRemovalOptions = {
  onProgress?: (p: BgRemovalProgress) => void;
  signal?: AbortSignal;
};

/* ── Capability ──────────────────────────────────────────────────────────── */

/**
 * Can this browser do it at all? Cheap, synchronous, and safe to call during render
 * so the UI can disable the button with a reason rather than fail on click.
 *
 * `true | {ok:false, reason}` rather than `boolean | {…}` on purpose: the caller is
 * meant to write `if (cap !== true) show(cap.reason)`, and with a plain `boolean` in
 * the union that narrows to `false | {…}` and the `.reason` does not typecheck. The
 * function has never returned bare `false`; the type now says so.
 */
export function bgRemovalAvailable(): true | { ok: false; reason: string } {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return { ok: false, reason: "Background removal only runs in the browser." };
  }
  if (typeof WebAssembly === "undefined") {
    return {
      ok: false,
      reason: "This browser has WebAssembly switched off, which background removal needs.",
    };
  }
  if (typeof createImageBitmap !== "function") {
    return {
      ok: false,
      reason: "This browser is too old to decode images the way background removal needs.",
    };
  }
  return true;
}

/**
 * One sentence for the UI, so the first-use download is never a surprise — and so
 * nobody is promised a speed this cannot deliver. It takes a few seconds an image;
 * saying "instant" here would only make the wait feel like a fault.
 */
export function bgRemovalNotice(): string {
  return "The first cut-out downloads about 7 MB of background remover into this browser; after that it works offline, takes a few seconds an image, and never sends your picture anywhere.";
}

/* ── Public entry point ──────────────────────────────────────────────────── */

/**
 * Cut the background out of an image and return a transparent PNG.
 *
 * @param input a Blob (an upload, a canvas export) or an image URL. A URL is
 *   fetched with CORS; a host that will not permit that fails with a message you
 *   can show the user rather than producing a broken image.
 * @returns a PNG Blob at the source resolution with a real alpha channel.
 * @throws Error whose `message` is written to be shown verbatim. A cancelled run
 *   throws an error with `name === "AbortError"`.
 */
export async function removeBackground(
  input: Blob | string,
  opts: BgRemovalOptions = {},
): Promise<Blob> {
  const { onProgress, signal } = opts;
  const report = (stage: string, pct?: number) => {
    // A listener that throws must not cost the user their cut-out.
    try {
      onProgress?.({ stage, pct });
    } catch {
      /* ignore */
    }
  };

  const capability = bgRemovalAvailable();
  if (capability !== true) throw new Error(capability.reason);

  throwIfAborted(signal);

  report("Reading the image");
  const bitmap = await withAbort(decode(input, signal), signal);

  try {
    // The engine load is deliberately NOT tied to this call's signal: it is shared
    // by every future cut-out, so a cancel should let go of the wait, not throw away
    // a download that is already half done and will be wanted again in a moment.
    const engine = await withAbort(loadEngine(report), signal);

    throwIfAborted(signal);
    report("Finding the subject", 0);
    // The run blocks the main thread, and everything up to it is synchronous, so
    // without this the stage we just announced never reaches the screen: the user
    // watches a frozen page with the previous label still on it.
    await yieldToPaint();
    const mask = await withAbort(runModel(engine, bitmap), signal);

    throwIfAborted(signal);
    report("Cutting it out", 60);
    const png = await composite(bitmap, mask);

    report("Done", 100);
    return png;
  } finally {
    bitmap.close?.();
  }
}

/* ── Decoding the input ──────────────────────────────────────────────────── */

async function decode(input: Blob | string, signal?: AbortSignal): Promise<ImageBitmap> {
  const blob = typeof input === "string" ? await fetchImage(input, signal) : input;

  if (blob.size === 0) throw new Error("That image is empty.");

  try {
    return await createImageBitmap(blob);
  } catch {
    throw new Error("That file could not be read as an image.");
  }
}

async function fetchImage(url: string, signal?: AbortSignal): Promise<Blob> {
  let res: Response;
  try {
    res = await fetch(url, { mode: "cors", credentials: "omit", signal });
  } catch (err) {
    if (isAbort(err)) throw err;
    // fetch() rejects rather than resolving opaquely when CORS is refused, which is
    // exactly what we want: the alternative is a canvas that taints and produces a
    // silent black rectangle several seconds later.
    throw new Error(
      "This image is hosted somewhere that will not let the editor read its pixels. Download it and upload it here instead.",
    );
  }
  if (!res.ok) {
    throw new Error(`That image could not be downloaded (the server said ${res.status}).`);
  }
  return res.blob();
}

/* ── The engine ──────────────────────────────────────────────────────────── */

type Engine = { ort: Ort; session: OrtSession };

/** Cached for the life of the page: the download and the session build are the whole
 *  cost, and paying them once is the difference between a usable tool and a toy. */
let enginePromise: Promise<Engine> | null = null;

function loadEngine(report: (stage: string, pct?: number) => void): Promise<Engine> {
  if (!enginePromise) {
    enginePromise = buildEngine(report).catch((err) => {
      // A failed load must not poison every later attempt — a flaky network on the
      // first try should not disable the feature until reload.
      enginePromise = null;
      throw err;
    });
  }
  return enginePromise;
}

async function buildEngine(report: (stage: string, pct?: number) => void): Promise<Engine> {
  let ort: Ort;
  try {
    ort = await import("onnxruntime-web/wasm");
  } catch {
    throw new Error("The background remover could not be loaded. Check your connection and try again.");
  }

  // Single-threaded, and not by preference. The multi-threaded build needs
  // SharedArrayBuffer, which needs COOP/COEP response headers the app does not set —
  // and setting them would break every cross-origin image, font and embed on the
  // page, which is a bad trade for one feature. This is the reason a cut-out takes
  // seconds rather than milliseconds; see the note at the top of the file.
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  ort.env.logLevel = "error";
  ort.env.wasm.wasmPaths = { wasm: ortWasmUrl, mjs: ortGlueUrl };

  // Fetching the WASM ourselves buys a real progress bar over the biggest download
  // of the two. If it fails we simply leave `wasmPaths` in place and let the runtime
  // fetch it the ordinary way — worse progress, same result.
  const wasmBinary = await fetchWithProgress(
    ortWasmUrl,
    (pct) => report("Downloading the background remover (one time)", pct),
  ).catch(() => null);
  if (wasmBinary) ort.env.wasm.wasmBinary = wasmBinary;

  const weights = await fetchWithProgress(MODEL_URL, (pct) =>
    report("Downloading the cut-out model (one time)", pct),
  ).catch(() => {
    throw new Error("The cut-out model could not be downloaded. Check your connection and try again.");
  });

  report("Starting the engine");
  try {
    const session = await ort.InferenceSession.create(new Uint8Array(weights), {
      executionProviders: ["wasm"],
      graphOptimizationLevel: "all",
    });
    return { ort, session };
  } catch {
    throw new Error("The background remover would not start in this browser.");
  }
}

/**
 * Fetch to an ArrayBuffer, reporting progress as it streams.
 *
 * `content-length` describes the compressed body while the reader hands back
 * decompressed bytes, so on a gzip/brotli-encoded response the ratio overshoots.
 * Hence the clamp at 99: a progress bar that reaches 340% is worse than one that
 * waits at 99 for a moment.
 */
async function fetchWithProgress(url: string, onPct: (pct?: number) => void): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const total = Number(res.headers.get("content-length") ?? 0);
  if (!res.body || !total) {
    onPct(undefined);
    return res.arrayBuffer();
  }

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  onPct(0);

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    onPct(Math.min(99, Math.round((received / total) * 100)));
  }

  const out = new Uint8Array(received);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  onPct(100);
  return out.buffer;
}

/* ── Inference ───────────────────────────────────────────────────────────── */

/** Runs the model and returns a 320×320 alpha mask, 0–255, one byte per pixel. */
async function runModel({ ort, session }: Engine, bitmap: ImageBitmap): Promise<Uint8ClampedArray> {
  const ctx = makeCanvas(SIDE, SIDE, true);
  // Squashed to a square rather than letterboxed — this is what the reference
  // pipeline does, and U²-Net copes with the distortion far better than it copes
  // with black bars it has never seen.
  ctx.drawImage(bitmap, 0, 0, SIDE, SIDE);
  const px = ctx.getImageData(0, 0, SIDE, SIDE).data;

  // The reference implementation divides by the image's own maximum channel value
  // rather than a flat 255, which lifts under-exposed photographs into the range the
  // network was trained on. Same behaviour here.
  let peak = 0;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i] > peak) peak = px[i];
    if (px[i + 1] > peak) peak = px[i + 1];
    if (px[i + 2] > peak) peak = px[i + 2];
  }
  if (peak === 0) peak = 255;

  const plane = SIDE * SIDE;
  const input = new Float32Array(3 * plane);
  for (let p = 0, i = 0; p < plane; p++, i += 4) {
    input[p] = (px[i] / peak - MEAN[0]) / STD[0];
    input[plane + p] = (px[i + 1] / peak - MEAN[1]) / STD[1];
    input[2 * plane + p] = (px[i + 2] / peak - MEAN[2]) / STD[2];
  }

  const inputName = session.inputNames[0];
  const outputName = session.outputNames[0]; // d0, the fused prediction
  const tensor = new ort.Tensor("float32", input, [1, 3, SIDE, SIDE]);

  let raw: Float32Array;
  try {
    // This blocks the main thread for the duration — a few seconds. The UI has
    // already been handed the "Finding the subject" stage, so at least the page is
    // saying something before it stops repainting.
    raw = extractMask(await session.run({ [inputName]: tensor }), outputName);
  } catch {
    throw new Error("The background remover failed on this image.");
  }

  return toMask(raw);
}

/** Pull the confidence map out of the run's output map, defensively. */
function extractMask(out: unknown, name: string): Float32Array {
  const feeds = out as Record<string, { data: unknown }>;
  const tensor = feeds?.[name];
  const data = tensor?.data;
  if (!(data instanceof Float32Array)) {
    throw new Error("unexpected model output");
  }
  return data;
}

/** Min–max normalise the confidence map, squeeze the ends, and quantise to bytes. */
function toMask(raw: Float32Array): Uint8ClampedArray {
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] < lo) lo = raw[i];
    if (raw[i] > hi) hi = raw[i];
  }
  const span = hi - lo || 1;
  const range = CEIL - FLOOR;

  const mask = new Uint8ClampedArray(raw.length);
  for (let i = 0; i < raw.length; i++) {
    const n = (raw[i] - lo) / span;
    const squeezed = n <= FLOOR ? 0 : n >= CEIL ? 1 : (n - FLOOR) / range;
    mask[i] = squeezed * 255;
  }
  return mask;
}

/* ── Compositing ─────────────────────────────────────────────────────────── */

/**
 * Paint the full-resolution image, then multiply its alpha by the upscaled mask.
 *
 * `destination-in` does that multiplication in the compositor, which means the mask
 * is interpolated by the same smooth path a scaled `drawImage` always takes and no
 * per-pixel JavaScript ever touches a multi-megapixel buffer.
 */
async function composite(bitmap: ImageBitmap, mask: Uint8ClampedArray): Promise<Blob> {
  const { width, height } = fit(bitmap.width, bitmap.height);

  // The mask, as white pixels carrying the alpha.
  const maskCtx = makeCanvas(SIDE, SIDE, true);
  const maskData = maskCtx.createImageData(SIDE, SIDE);
  for (let p = 0, i = 0; p < mask.length; p++, i += 4) {
    maskData.data[i] = 255;
    maskData.data[i + 1] = 255;
    maskData.data[i + 2] = 255;
    maskData.data[i + 3] = mask[p];
  }
  maskCtx.putImageData(maskData, 0, 0);

  const out = makeCanvas(width, height);
  out.imageSmoothingEnabled = true;
  out.imageSmoothingQuality = "high";
  out.drawImage(bitmap, 0, 0, width, height);
  out.globalCompositeOperation = "destination-in";
  out.drawImage(maskCtx.canvas, 0, 0, width, height);
  out.globalCompositeOperation = "source-over";

  const blob = await new Promise<Blob | null>((resolve) =>
    out.canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) throw new Error("The cut-out could not be saved as a PNG.");
  return blob;
}

/** Source resolution, reduced only as far as the browser's canvas limits demand. */
function fit(w: number, h: number): { width: number; height: number } {
  let scale = 1;
  const longest = Math.max(w, h);
  if (longest > MAX_EDGE) scale = MAX_EDGE / longest;
  const area = w * scale * h * scale;
  if (area > MAX_AREA) scale *= Math.sqrt(MAX_AREA / area);
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
  };
}

/**
 * `readback` is not a detail: it opts into a software-backed canvas, which is much
 * faster to `getImageData` from and much slower to composite on. The two 320×320
 * canvases are read pixel by pixel and want it; the full-resolution output canvas is
 * only ever drawn to, and asking for it there costs real seconds on a large image.
 */
function makeCanvas(w: number, h: number, readback = false): CanvasRenderingContext2D {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", readback ? { willReadFrequently: true } : undefined);
  if (!ctx) throw new Error("This browser would not give us a canvas to draw on.");
  return ctx;
}

/* ── Cancellation ────────────────────────────────────────────────────────── */

/** Give the browser a frame to paint before we take the main thread away from it. */
function yieldToPaint(): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    // Two frames is what it takes to be sure the label is actually on screen. The
    // timeout is the escape hatch for a backgrounded tab, where rAF never fires at
    // all and this would otherwise wait for the user to come back.
    requestAnimationFrame(() => requestAnimationFrame(finish));
    setTimeout(finish, 60);
  });
}

function abortError(): Error {
  const err = new Error("Background removal was cancelled.");
  err.name = "AbortError";
  return err;
}

function isAbort(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw abortError();
}

/** Resolve with the work, or reject the moment the caller gives up on it. */
function withAbort<T>(work: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return work;
  if (signal.aborted) return Promise.reject(abortError());
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(abortError());
    signal.addEventListener("abort", onAbort, { once: true });
    work.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}
