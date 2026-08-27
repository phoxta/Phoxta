import { useEffect, useState } from "react";
import { DesignSvg } from "@/lib/designs/render";
import { slidesOf } from "@/lib/designs/types";
import { listDesigns, type Design } from "@/lib/db/designs";
import { toastError } from "@/lib/ops/feedback";
import type { Block } from "@email";
import { designToBlocks } from "@/lib/designs/toEmail";
import { rasterise } from "./rasterise";

/**
 * Bringing a design made on the graphics canvas into an email.
 *
 * A design becomes a PICTURE, not a layout, and that is the honest answer
 * rather than a shortcut. The canvas positions layers absolutely on a fixed
 * artboard; email has no absolute positioning that survives, no SVG in Outlook,
 * and a fixed width cannot reflow onto a phone. Translating one into the other
 * would mean a second renderer, and then the thing you previewed and the thing
 * that arrived are different documents.
 *
 * What it does NOT become is a dead copy. The block keeps the design's id, so
 * the composer can refresh it after the design changes, and can cut it into
 * parts that each carry their own link.
 *
 * A slide deck contributes its FIRST slide. Five slides as five stacked
 * pictures is a worse email than one picture and a sentence.
 */
export function DesignPicker({ orgId, onClose, onPicked, onConverted }: {
  orgId: string;
  onClose: () => void;
  onPicked: (block: Block) => void;
  onConverted: (blocks: Block[], lost: string[]) => void;
}) {
  const [rows, setRows] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  /**
   * Two honest ways in, and the difference is worth the extra click.
   *
   * As words: real HTML — every line editable, readable at any width, readable
   * with images off, and the design's button becomes a button with a link.
   * What it gives up is the design's exact typography and placement.
   *
   * As a picture: pixel-for-pixel what you drew, and then a flat image that
   * says nothing when images are blocked. Right when the typography IS the
   * message.
   */
  const [mode, setMode] = useState<"blocks" | "picture">("blocks");

  useEffect(() => {
    void (async () => {
      const { data, error } = await listDesigns(orgId);
      if (error) toastError(error);
      setRows(data);
      setLoading(false);
    })();
  }, [orgId]);

  const use = async (d: Design) => {
    if (mode === "blocks") {
      const { blocks, lost } = designToBlocks(slidesOf(d.doc, d.template_id)[0]);
      if (blocks.length === 0) {
        toastError("There are no words in that design to convert — bring it in as a picture.");
        return;
      }
      onConverted(blocks, lost);
      return;
    }
    setBusy(d.id);
    try {
      const url = await rasterise(orgId, d);
      onPicked({
        type: "image",
        src: url,
        // A starting point that can be improved, never left empty: with images
        // off this is the only thing the reader gets.
        alt: d.title,
        href: "",
        caption: "",
        designId: d.id,
      } as Block);
    } catch (e) {
      toastError(String((e as Error)?.message ?? e));
      setBusy(null);
    }
  };

  return (
    <div className="dsn-modal" role="dialog" aria-modal="true" aria-label="Import a design"
         onPointerDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="dsn-modal__box dsn-picker">
        <header className="dsn-picker__head">
          <div style={{ minWidth: 0 }}>
            <h3 className="dsn-picker__t">Import a design</h3>
            <p className="dsn-note">
              {mode === "blocks"
                ? "The words, the button and the pictures come across as real HTML — every line still editable, and it reads at any width and with images switched off. The design's own typefaces and exact placement do not survive: no mail client loads a webfont, and Outlook cannot position anything."
                : "Exactly what you drew, as one picture. You can then cut it into parts, give each part its own link, and refresh it whenever the design changes. With images blocked there is nothing but the alt text."}
            </p>
            <div className="d-flex gap-2 mt-2">
              {([["blocks", "As words"], ["picture", "As a picture"]] as const).map(([m, label]) => (
                <button key={m} type="button" className={`hrx-seeall${mode === m ? " opx-solid" : ""}`}
                        onClick={() => setMode(m)}>{label}</button>
              ))}
            </div>
          </div>
        </header>
        {loading ? (
          <p className="dsn-note">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="dsn-note">No designs yet. Make one on the graphics tab first.</p>
        ) : (
          <div className="dsn-picker__grid">
            {rows.map((d) => (
              <button key={d.id} type="button" className="dsn-tile__art" disabled={busy !== null}
                      onClick={() => void use(d)} aria-label={`Use ${d.title}`}>
                <DesignSvg doc={slidesOf(d.doc, d.template_id)[0]} width={220} />
                <span className="dsn-tile__name">{busy === d.id ? "Rasterising…" : d.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
