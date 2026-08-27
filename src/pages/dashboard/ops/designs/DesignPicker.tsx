import { useEffect, useRef, useState } from "react";
import { DesignSvg } from "@/lib/designs/render";
import { exportPng } from "@/lib/designs/export";
import { slidesOf } from "@/lib/designs/types";
import { listDesigns, type Design } from "@/lib/db/designs";
import { uploadAsset } from "@/lib/db/ops/designAssets";
import { toastError } from "@/lib/ops/feedback";
import type { Block } from "@email";

/**
 * Bringing a design made on the graphics canvas into an email.
 *
 * A design becomes a PICTURE, not a layout, and that is the honest answer
 * rather than a shortcut. The canvas positions layers absolutely on a fixed
 * artboard; email has no absolute positioning that survives, no SVG in Outlook,
 * and a fixed width cannot reflow onto a phone. Translating one into the other
 * would mean a second renderer, and a second renderer means the thing you
 * previewed and the thing that arrived are different documents.
 *
 * So it is rasterised — through the same exportPng the download button uses, so
 * an imported design and a downloaded one are the same file — stored in the
 * business's own asset library so the email has a stable public URL to point
 * at, and dropped in as an image block carrying alt text. The alt text is not
 * optional politeness: with images off, it is the only thing left.
 *
 * A slide deck contributes its FIRST slide. Sending five slides as five stacked
 * pictures is a worse email than one picture and a sentence.
 */
export function DesignPicker({
  orgId, onClose, onPicked,
}: {
  orgId: string;
  onClose: () => void;
  onPicked: (block: Block) => void;
}) {
  const [rows, setRows] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const stage = useRef<HTMLDivElement | null>(null);
  const [staged, setStaged] = useState<Design | null>(null);

  useEffect(() => {
    void (async () => {
      const { data, error } = await listDesigns(orgId);
      if (error) toastError(error);
      setRows(data);
      setLoading(false);
    })();
  }, [orgId]);

  // The export needs a live <svg> in the document, so the chosen design is
  // mounted off-screen for exactly as long as it takes to rasterise it.
  useEffect(() => {
    if (!staged) return;
    let cancelled = false;
    void (async () => {
      try {
        const svg = stage.current?.querySelector("svg");
        if (!svg) throw new Error("The design did not render.");
        const doc = slidesOf(staged.doc, staged.template_id)[0];
        const { blob } = await exportPng(svg as SVGSVGElement, doc, 2);
        if (cancelled) return;
        const file = new File([blob], `${staged.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`, { type: "image/png" });
        const { data, error } = await uploadAsset(orgId, file);
        if (cancelled) return;
        if (error || !data) throw new Error(error ?? "The upload failed.");
        onPicked({
          type: "image",
          src: data.url,
          // A starting point the sender can improve, never left empty.
          alt: staged.title,
          href: "",
          caption: "",
        } as Block);
      } catch (e) {
        toastError(String((e as Error)?.message ?? e));
        setBusy(null);
        setStaged(null);
      }
    })();
    return () => { cancelled = true; };
  }, [staged, orgId, onPicked]);

  return (
    <div className="emc__scrim" onClick={onClose}>
      <div className="emc__menu" onClick={(e) => e.stopPropagation()}>
        <h3>Import a design</h3>
        <p className="dsn-note">
          The design comes in as a picture with alt text — that is what a designed graphic is in an email.
          Give it a line of words underneath, so it still says something with images switched off.
        </p>
        {loading ? (
          <p className="dsn-note">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="dsn-note">No designs yet. Make one on the graphics canvas first.</p>
        ) : (
          <div className="dsn-grid" style={{ marginTop: 12 }}>
            {rows.map((d) => (
              <button key={d.id} type="button" className="dsn-tile__art" disabled={busy !== null}
                      onClick={() => { setBusy(d.id); setStaged(d); }}
                      aria-label={`Use ${d.title}`}>
                <DesignSvg doc={slidesOf(d.doc, d.template_id)[0]} width={220} />
                <span className="dsn-tile__name">{busy === d.id ? "Rasterising…" : d.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Off-screen, not display:none — a hidden subtree has no layout, and the
          exporter measures text against the real one. */}
      {staged && (
        <div ref={stage} aria-hidden style={{ position: "fixed", left: -99999, top: 0, opacity: 0, pointerEvents: "none" }}>
          <DesignSvg doc={slidesOf(staged.doc, staged.template_id)[0]} width={1080} />
        </div>
      )}
    </div>
  );
}
