import { useEffect, useRef, useState } from "react";
import {
  bgRemovalAvailable, bgRemovalNotice, removeBackground, type BgRemovalProgress,
} from "@/lib/designs/bgRemove";
import { MAX_ASSET_BYTES, uploadAsset, type DesignAsset } from "@/lib/db/ops/designAssets";

/**
 * "Remove background", in the two places it belongs.
 *
 * The cut-out itself is done by `@/lib/designs/bgRemove` — U²-Netp on the MIT
 * ONNX runtime, entirely inside this browser, no key and no upload of the
 * customer's picture. This file is only the wiring, and it makes three
 * decisions that are worth stating because they are the ones that make the
 * feature usable rather than merely present:
 *
 * 1. A CUT-OUT IS ALWAYS A NEW ASSET. It is uploaded through the asset library
 *    and lands beside the original, which is never touched. A mask that clips
 *    an ear is a certainty, not a risk, and the original has to still be there
 *    when it happens. It also means the transparent PNG survives a reload: the
 *    design points at a stored URL, never at a `blob:` that dies with the tab.
 *
 * 2. THE WAIT IS SAID OUT LOUD. The run takes seconds and blocks the main
 *    thread — that is a consequence of single-threaded WASM, not a bug — so
 *    every stage the module reports is put on screen, and the first-use
 *    download notice is shown BEFORE the first click rather than explained
 *    afterwards.
 *
 * 3. AN OVERSIZED CUT-OUT IS SHRUNK, NOT REFUSED. A transparent PNG of a
 *    16-megapixel photograph can pass the library's 10MB ceiling, and "your
 *    picture is too big" after a five-second wait is a rotten answer. It is
 *    re-encoded smaller instead, and only what will not fit at any sane size
 *    fails.
 *
 * Both exports are components on purpose: this file is imported by two
 * components, and exporting the helper as well would cost the module its
 * fast-refresh boundary.
 */

const ln = {
  fill: "none", stroke: "currentColor", strokeWidth: 1.7,
  strokeLinecap: "round", strokeLinejoin: "round",
} as const;

/** Crop marks around a subject — "keep this, drop the rest". */
const I_CUTOUT = (
  <svg width="14" height="14" viewBox="0 0 24 24" {...ln} aria-hidden="true">
    <path d="M3 7V3h4M17 3h4v4M21 17v4h-4M7 21H3v-4" />
    <circle cx="12" cy="10.5" r="2.6" />
    <path d="M7.5 17.5a4.5 4.5 0 0 1 9 0" />
  </svg>
);

/* ── The work ────────────────────────────────────────────────────────────── */

type Run = { data: DesignAsset | null; error: string | null; cancelled: boolean };

/** `photo.jpg` → `photo-cutout.png`. The server slugs this to [a-z0-9-] anyway;
 *  what matters is that the library shows which original it came from. */
function cutoutName(name: string): string {
  const base = name.replace(/\.[a-z0-9]{2,5}$/i, "").slice(0, 60).trim() || "photo";
  return `${base}-cutout.png`;
}

/**
 * Keep a transparent PNG under the library's ceiling.
 *
 * Only the pixel dimensions can come down — the alpha channel rules out JPEG,
 * and PNG has no quality dial. Each pass aims at the ceiling from the size the
 * last one actually produced, because PNG compression of a photograph is not
 * remotely linear in area and a single computed scale overshoots badly.
 */
async function fitForUpload(png: Blob): Promise<Blob> {
  if (png.size <= MAX_ASSET_BYTES) return png;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(png);
  } catch {
    return png;
  }
  try {
    let out = png;
    let scale = 1;
    for (let pass = 0; pass < 4 && out.size > MAX_ASSET_BYTES; pass++) {
      scale *= Math.max(0.4, Math.sqrt(MAX_ASSET_BYTES / out.size) * 0.9);
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return out;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bitmap, 0, 0, w, h);
      const next = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
      if (!next) return out;
      out = next;
    }
    return out;
  } finally {
    bitmap.close?.();
  }
}

/** Cut the background out of `src` and store the result as a NEW library asset. */
async function cutoutToAsset(
  orgId: string,
  src: string,
  name: string,
  opts: { onProgress?: (p: BgRemovalProgress) => void; signal?: AbortSignal },
): Promise<Run> {
  try {
    const png = await removeBackground(src, opts);
    if (opts.signal?.aborted) return { data: null, error: null, cancelled: true };
    opts.onProgress?.({ stage: "Saving it to your library" });
    const sized = await fitForUpload(png);
    const file = new File([sized], cutoutName(name), { type: "image/png" });
    const { data, error } = await uploadAsset(orgId, file);
    return { data, error, cancelled: false };
  } catch (e) {
    const err = e as Error;
    // A cancel is not a failure and must not be reported as one.
    if (err.name === "AbortError") return { data: null, error: null, cancelled: true };
    // Every message bgRemove throws is written to be shown verbatim.
    return { data: null, error: err.message || "The background could not be removed.", cancelled: false };
  }
}

/**
 * One run at a time, with its stage on screen and a way out of it.
 *
 * Unmounting aborts: the caller has gone, and the only thing left to do with
 * the result would be to set state on a component that no longer exists.
 */
function useCutout(orgId: string) {
  const [stage, setStage] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      abort.current?.abort();
    };
  }, []);

  const start = async (src: string, name: string, onStage?: (s: string | null) => void): Promise<Run> => {
    const controller = new AbortController();
    abort.current = controller;
    const say = (s: string | null) => {
      if (!alive.current) return;
      setStage(s);
      onStage?.(s);
    };
    say("Starting");
    const run = await cutoutToAsset(orgId, src, name, {
      signal: controller.signal,
      onProgress: ({ stage: s, pct }) => say(pct == null ? s : `${s} ${pct}%`),
    });
    abort.current = null;
    say(null);
    return run;
  };

  return { stage, busy: stage !== null, start, cancel: () => abort.current?.abort() };
}

/* ── The Inspector's seam ────────────────────────────────────────────────── */

/**
 * The Photo section's "Background" action.
 *
 * On success the slot points at the STORED cut-out, so the design still looks
 * right after a reload, and the original photograph is still in the library one
 * click away.
 */
export function ImageBackgroundAction({ orgId, url, name, disabled, onCutout }: {
  orgId: string;
  /** The photograph currently in the slot, if there is one. */
  url?: string;
  /** What to call the cut-out in the library. */
  name?: string;
  /** The layer is locked. */
  disabled?: boolean;
  onCutout: (asset: DesignAsset) => void;
}) {
  const capability = bgRemovalAvailable();
  const { stage, busy, start, cancel } = useCutout(orgId);
  const [err, setErr] = useState<string | null>(null);

  // Not "coming soon" and not hidden: the honest state, with the browser's own
  // reason attached, so nobody hunts for a control that cannot work here.
  if (capability !== true) {
    return (
      <>
        <button type="button" className="dsni-btn" disabled title={capability.reason}>
          Remove background
        </button>
        <p className="dsni-note">{capability.reason}</p>
      </>
    );
  }

  const blocked = disabled || !url;

  const go = () => {
    if (!url) return;
    setErr(null);
    void start(url, name || "photo").then((run) => {
      if (run.cancelled) return;
      if (run.error) return setErr(run.error);
      if (run.data) onCutout(run.data);
    });
  };

  return (
    <>
      <div className="dsni-btns">
        <button
          type="button" className="dsni-btn" disabled={blocked || busy} onClick={go}
          title={blocked
            ? (disabled ? "This layer is locked" : "Choose a photo first")
            : bgRemovalNotice()}
        >
          {busy ? "Cutting out…" : "Remove background"}
        </button>
        {busy && (
          <button type="button" className="dsni-btn" onClick={cancel}>Cancel</button>
        )}
      </div>
      <p className="dsni-note" role="status">
        {busy ? `${stage}…` : err ?? bgRemovalNotice()}
      </p>
    </>
  );
}

/* ── The asset library's seam ────────────────────────────────────────────── */

/**
 * The cut-out button on one asset card.
 *
 * It never replaces the asset it was pressed on — the result is handed back as
 * a second asset for the grid to show beside the first.
 */
export function AssetCutoutButton({ orgId, asset, disabled, onMade, onStage, onError }: {
  orgId: string;
  asset: DesignAsset;
  disabled?: boolean;
  onMade: (made: DesignAsset) => void;
  /** Progress for the card to show; null when the run ends. */
  onStage: (stage: string | null) => void;
  onError: (message: string) => void;
}) {
  const capability = bgRemovalAvailable();
  const { busy, start } = useCutout(orgId);

  if (capability !== true) {
    return (
      <button type="button" className="dsn-as__act" disabled title={capability.reason}
              aria-label="Remove background — unavailable">
        {I_CUTOUT}
      </button>
    );
  }

  const go = () => {
    void start(asset.url, asset.name, onStage).then((run) => {
      if (run.cancelled) return;
      if (run.error) return onError(run.error);
      if (run.data) onMade(run.data);
    });
  };

  return (
    <button
      type="button" className="dsn-as__act" disabled={disabled || busy} onClick={go}
      title={`Remove the background from ${asset.name}, saving the cut-out as a new picture. ${bgRemovalNotice()}`}
      aria-label={`Remove the background from ${asset.name}`}
    >
      {I_CUTOUT}
    </button>
  );
}
