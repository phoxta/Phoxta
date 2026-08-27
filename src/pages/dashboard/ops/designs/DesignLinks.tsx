import { useEffect, useRef, useState } from "react";
import type { Block } from "@email";
import { getDesign } from "@/lib/db/designs";
import { uploadAsset } from "@/lib/db/ops/designAssets";
import { toast, toastError } from "@/lib/ops/feedback";

/**
 * An imported design, still editable, with a link on any part of it.
 *
 * TWO THINGS PEOPLE ASK OF A DESIGN ONCE IT IS IN AN EMAIL, and both are here.
 *
 * "Can I still edit it?"  Yes — on the canvas, where the editing tools are.
 * The block remembers which design it came from, so Refresh re-rasterises the
 * current version and swaps the picture. The email is never holding a stale
 * copy nobody can update, which is what an ordinary uploaded image would be.
 *
 * "Can the button in it be a link?"  Yes, by slicing. An email cannot put a
 * clickable region wherever it likes — Gmail strips image maps, and absolutely
 * positioned overlays survive nowhere — so the picture is cut into horizontal
 * bands, stacked with no gap so they still read as one image, and each band
 * gets its own link. It is what every ESP does, and it works in Outlook.
 *
 * Click the picture to cut it where you clicked. The cuts are stored as
 * percentages, so refreshing an edited design re-applies the same cuts rather
 * than losing them.
 */

type ImageBlock = Extract<Block, { type: "image" }>;

export function DesignLinks({ block, orgId, onChange }: {
  block: ImageBlock;
  orgId: string;
  onChange: (b: ImageBlock) => void;
}) {
  const [busy, setBusy] = useState<"" | "refreshing" | "slicing">("");
  const img = useRef<HTMLImageElement | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);

  const cuts = block.cuts ?? [];
  const bands = block.slices ?? [];

  // Percent boundaries → the list of bands they describe.
  const boundaries = [0, ...cuts, 100];

  useEffect(() => { setNatural(null); }, [block.src]);

  /** Cut where the pointer landed, as a percentage down the picture. */
  const cutAt = (e: React.MouseEvent<HTMLImageElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const pct = Math.round(((e.clientY - r.top) / r.height) * 100);
    // A band thinner than this is a seam, not a region, and slicing one
    // produces an image a pixel high that some clients refuse to load.
    if (pct < 4 || pct > 96) return;
    if (cuts.some((c) => Math.abs(c - pct) < 4)) return;
    onChange({ ...block, cuts: [...cuts, pct].sort((a, b) => a - b) });
  };

  /**
   * Cut the picture up and upload the pieces.
   *
   * Done from the stored URL rather than by re-rendering the design, so what
   * is sliced is exactly what is on screen. The bucket serves
   * Access-Control-Allow-Origin, so the canvas is not tainted and can be read
   * back — if that ever changes this throws rather than silently producing
   * blank bands.
   */
  const applySlices = async () => {
    if (cuts.length === 0) {
      onChange({ ...block, slices: undefined });
      return;
    }
    setBusy("slicing");
    try {
      const source = await load(block.src);
      const out: Array<{ src: string; href?: string }> = [];
      for (let i = 0; i < boundaries.length - 1; i++) {
        const top = Math.round((boundaries[i] / 100) * source.naturalHeight);
        const bottom = Math.round((boundaries[i + 1] / 100) * source.naturalHeight);
        const c = document.createElement("canvas");
        c.width = source.naturalWidth;
        c.height = Math.max(1, bottom - top);
        const g = c.getContext("2d");
        if (!g) throw new Error("This browser would not give us a canvas.");
        g.drawImage(source, 0, top, c.width, c.height, 0, 0, c.width, c.height);
        const blob = await new Promise<Blob | null>((res) => c.toBlob(res, "image/png"));
        if (!blob) throw new Error("The slice could not be encoded.");
        const file = new File([blob], `band-${i + 1}.png`, { type: "image/png" });
        const { data, error } = await uploadAsset(orgId, file);
        if (error || !data) throw new Error(error ?? "The upload failed.");
        out.push({ src: data.url, href: bands[i]?.href });
      }
      onChange({ ...block, slices: out });
      toast(`Cut into ${out.length} parts.`);
    } catch (e) {
      toastError(String((e as Error)?.message ?? e));
    } finally {
      setBusy("");
    }
  };

  /** Re-rasterise the design as it stands now. */
  const refresh = async () => {
    if (!block.designId) return;
    setBusy("refreshing");
    try {
      const { data, error } = await getDesign(block.designId);
      if (error || !data) throw new Error(error ?? "That design is no longer there.");
      const { rasterise } = await import("./rasterise");
      const url = await rasterise(orgId, data);
      // The cuts are percentages, so they still mean something after an edit —
      // but the bands are now pictures of the old version, so they go and are
      // rebuilt on the next Apply.
      onChange({ ...block, src: url, slices: undefined });
      toast("Picture refreshed. Press Apply to cut it again.");
    } catch (e) {
      toastError(String((e as Error)?.message ?? e));
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="dlk">
      <div className="dlk__stage">
        <img
          ref={img}
          src={block.src}
          alt=""
          className="dlk__img"
          onClick={cutAt}
          onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
        />
        {cuts.map((c) => (
          <span key={c} className="dlk__cut" style={{ top: `${c}%` }}>
            <button type="button" title="Remove this cut"
                    onClick={() => onChange({ ...block, cuts: cuts.filter((x) => x !== c), slices: undefined })}>
              ×
            </button>
          </span>
        ))}
      </div>
      <p className="dlk__hint">
        Click the picture to cut it there. Each part can then have its own link — that is how a button
        inside a design becomes clickable, because email has no way to make one region of a picture a
        link on its own.
        {natural ? ` ${natural.w}×${natural.h}.` : ""}
      </p>

      {boundaries.slice(0, -1).map((from, i) => (
        <label key={i} className="emc__f emc__f--tight">
          <span>Part {i + 1} — {from}% to {boundaries[i + 1]}%</span>
          <input
            value={bands[i]?.href ?? ""}
            placeholder="https://…"
            onChange={(e) => {
              const next = boundaries.slice(0, -1).map((_, j) => ({
                src: bands[j]?.src ?? block.src,
                href: j === i ? e.target.value : bands[j]?.href,
              }));
              onChange({ ...block, slices: next });
            }}
          />
        </label>
      ))}

      <div className="d-flex gap-2 mt-2">
        <button type="button" className="hrx-seeall" disabled={busy !== ""} onClick={() => void applySlices()}>
          {busy === "slicing" ? "Cutting…" : cuts.length ? `Apply ${cuts.length + 1} parts` : "Remove the cuts"}
        </button>
        {block.designId && (
          <button type="button" className="hrx-seeall" disabled={busy !== ""} onClick={() => void refresh()}>
            {busy === "refreshing" ? "Refreshing…" : "Refresh from the design"}
          </button>
        )}
      </div>
      {block.designId && (
        <p className="dsn-note">
          Edit it on the graphics canvas, then come back and press Refresh — this email is not holding a
          copy nobody can change.
        </p>
      )}
      <style>{CSS}</style>
    </div>
  );
}

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const im = new Image();
    // Without this the canvas is tainted and toBlob throws a SecurityError —
    // which reads as "the slice could not be encoded" and is really "the
    // bucket did not send CORS headers".
    im.crossOrigin = "anonymous";
    im.onload = () => res(im);
    im.onerror = () => rej(new Error("The picture would not load for slicing."));
    im.src = src;
  });
}

const CSS = `
.dlk__stage{position:relative;display:inline-block;max-width:100%;border:1px solid var(--hrx-border);border-radius:10px;overflow:hidden;line-height:0}
.dlk__img{display:block;max-width:100%;height:auto;cursor:crosshair}
.dlk__cut{position:absolute;left:0;right:0;height:0;border-top:2px dashed var(--hrx-orange)}
.dlk__cut button{position:absolute;right:4px;top:-11px;width:20px;height:20px;border-radius:10px;border:0;background:var(--hrx-orange);color:#fff;font-size:13px;line-height:1;cursor:pointer}
.dlk__hint{font-size:12px;line-height:1.5;color:var(--hrx-muted);margin:8px 0 12px}
`;
