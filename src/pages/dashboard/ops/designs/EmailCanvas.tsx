import { useCallback, useEffect, useRef, useState } from "react";
import type { Block } from "@email";
import { SPECS, readField } from "./emailBlocks";

/**
 * The email, edited on the email.
 *
 * The words are changed where they are read, not in a form beside a picture of
 * them. Clicking a block selects it and puts a small bar above it; clicking its
 * text puts a caret in it and you type. The sidebar stays for what a caret
 * cannot express — a link, an image, the rows of a table — but nobody should
 * have to go there to fix a typo.
 *
 * HOW IT REACHES INSIDE THE FRAME. The preview is an iframe of our own HTML.
 * `sandbox="allow-same-origin"` with NO `allow-scripts` is the important pair:
 * the parent can read and write the document, and nothing inside it can run —
 * so a paragraph pasted in with a <script> in it is inert, and the frame can
 * neither navigate nor reach the console around it.
 *
 * HOW AN ELEMENT IS MATCHED TO A FIELD. The renderer marks each block with its
 * path; within one block a field is found by comparing an element's text to the
 * field's value. No ids threaded through twenty templates, and a collision can
 * only occur between two fields of the same block holding identical text —
 * where either answer is the same answer.
 *
 * WHY THE FRAME IS NOT REWRITTEN ON EVERY KEYSTROKE. It would replace the
 * document under the caret. The html is pushed in only when it differs from
 * what was last pushed, and what is typed does not reach the blocks until blur.
 *
 * WHAT IS NOT EDITED HERE. Anything whose appearance is not its text: a table's
 * cells, a list's items, a grid's tiles. A caret would flatten their structure,
 * so they select on the canvas and edit in the sidebar, which is what the
 * sidebar is for.
 */

type Path = number[];

const pathOf = (s: string): Path => s.split(".").map(Number);

/** Fields worth a caret: plain strings that render as themselves. */
const CARET_FIELDS = new Set([
  "text", "title", "sub", "label", "big", "small", "caption", "cite", "author", "note", "n", "html",
]);

export function EmailCanvas({
  html, width, selected, blockAt, onSelect, onEdit, onMove, onDelete,
}: {
  html: string;
  width: number;
  selected: Path | null;
  blockAt: (p: Path) => Block | null;
  onSelect: (p: Path) => void;
  /** Fired on blur, with the block's path, the field and the new text. */
  onEdit: (p: Path, key: string, value: string) => void;
  onMove: (p: Path, dir: -1 | 1) => void;
  onDelete: (p: Path) => void;
}) {
  const frame = useRef<HTMLIFrameElement | null>(null);
  const wrap = useRef<HTMLDivElement | null>(null);
  const pushed = useRef<string>("");
  const [bar, setBar] = useState<{ top: number; left: number } | null>(null);

  /**
   * What the document is currently wired for.
   *
   * Re-wiring strips every contenteditable and puts them back, which blurs
   * whatever the caret was in. Clicking the text of an already-selected block
   * fires selection again, so without this the first keystroke after clicking
   * into a paragraph went nowhere: the element it had been typed into had just
   * been rebuilt.
   */
  const wiredFor = useRef<string | null>(null);

  // Held in a ref so `wire` need not be rebuilt — and the document need not be
  // re-walked — every time one of these changes identity.
  const cb = useRef({ selected, blockAt, onSelect, onEdit });
  cb.current = { selected, blockAt, onSelect, onEdit };

  /** The selected element's box, in the wrapper's coordinates. */
  const placeBar = useCallback(() => {
    const doc = frame.current?.contentDocument;
    const sel = cb.current.selected;
    if (!doc || !sel || !frame.current || !wrap.current) { setBar(null); return; }
    const el = doc.querySelector<HTMLElement>('[data-px="' + sel.join(".") + '"]');
    if (!el) { setBar(null); return; }
    const r = el.getBoundingClientRect();
    const f = frame.current.getBoundingClientRect();
    const w = wrap.current.getBoundingClientRect();
    setBar({
      // Above the block — or pinned just inside the top of the frame when the
      // block is the first thing on the page and there is no room above it.
      top: Math.max(4, f.top - w.top + r.top - 34),
      left: f.left - w.left + r.left,
    });
  }, []);

  const wire = useCallback(() => {
    const doc = frame.current?.contentDocument;
    if (!doc) return;
    const { selected, blockAt, onSelect, onEdit } = cb.current;
    const key = selected ? selected.join(".") : "";
    if (wiredFor.current !== key) {
      wiredFor.current = key;

      // Carets from the last selection have to go, or every block ever selected
      // stays editable and a stray click types into the wrong one.
      doc.querySelectorAll<HTMLElement>("[contenteditable]").forEach((el) => {
        el.removeAttribute("contenteditable");
        el.onblur = null;
        el.onkeydown = null;
        el.style.cursor = "";
      });

      doc.querySelectorAll<HTMLElement>("[data-px]").forEach((el) => {
        el.style.outline = "";
        el.style.cursor = "pointer";
        el.onclick = (e) => {
          e.stopPropagation();
          onSelect(pathOf(el.dataset.px!));
        };
      });

      if (selected) {
        const host = doc.querySelector<HTMLElement>('[data-px="' + key + '"]');
        const blk = blockAt(selected);
        const spec = blk && SPECS[blk.type];
        if (host) {
          host.style.outline = "2px solid #F0460E";
          host.style.outlineOffset = "3px";
          host.style.borderRadius = "3px";

          if (blk && spec) {
            for (const f of spec.fields) {
              if (!CARET_FIELDS.has(f.key.split(".").pop()!)) continue;
              const value = String(readField(blk, f.key) ?? "").trim();
              if (!value) continue;
              // The DEEPEST element whose whole text is this value. A shallower
              // one is a wrapper, and typing into a wrapper rewrites its
              // siblings too.
              const match = [...host.querySelectorAll<HTMLElement>("*")]
                .filter((n) => n.children.length === 0 && n.textContent?.trim() === value)
                .pop();
              if (!match) continue;

              match.setAttribute("contenteditable", "true");
              match.style.outline = "none";
              match.style.cursor = "text";
              match.onblur = () => {
                // contenteditable inserts non-breaking spaces as you type; they would
                // be saved into the block and then render as &nbsp; forever.
                const next = match.innerText.replace(/\u00a0/g, " ").trim();
                if (next !== value) onEdit(selected, f.key, next);
              };
              match.onkeydown = (e) => {
                // Enter in a field that is one string would insert a <div>.
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); match.blur(); }
                if (e.key === "Escape") { match.innerText = value; match.blur(); }
              };
            }
          }
        }
      }
    }
    placeBar();
  }, [placeBar]);

  // The bar follows the block when the frame scrolls or the window resizes.
  useEffect(() => {
    const doc = frame.current?.contentDocument;
    if (!doc) return;
    const on = () => placeBar();
    doc.addEventListener("scroll", on, true);
    window.addEventListener("resize", on);
    return () => {
      doc.removeEventListener("scroll", on, true);
      window.removeEventListener("resize", on);
    };
  }, [placeBar, html]);

  useEffect(() => {
    const f = frame.current;
    if (!f) return;
    if (html !== pushed.current) {
      pushed.current = html;
      // A fresh document is wired for nothing yet.
      wiredFor.current = null;
      f.srcdoc = html;
      return; // `wire` runs from onLoad
    }
    wire();
  }, [html, selected, wire]);

  const blk = selected ? blockAt(selected) : null;

  return (
    <div ref={wrap} style={{ position: "relative", height: "100%" }}>
      <iframe
        ref={frame}
        title="The email"
        sandbox="allow-same-origin"
        onLoad={wire}
        style={{ width, height: "100%", border: 0, borderRadius: 10, background: "#fff" }}
      />
      {bar && selected && blk && (
        <div className="emq" style={{ top: bar.top, left: bar.left }}>
          <span className="emq__t">{SPECS[blk.type]?.label ?? blk.type}</span>
          <button type="button" title="Move up" onClick={() => onMove(selected, -1)}>↑</button>
          <button type="button" title="Move down" onClick={() => onMove(selected, 1)}>↓</button>
          <button type="button" title="Delete" onClick={() => onDelete(selected)}>✕</button>
        </div>
      )}
      <style>{CSS}</style>
    </div>
  );
}

const CSS = `
.emq{position:absolute;z-index:5;display:flex;align-items:center;gap:2px;padding:3px 4px 3px 9px;background:#1D1D1D;border-radius:8px;box-shadow:0 4px 14px rgb(0 0 0 / 25%)}
.emq__t{font-size:11px;font-weight:600;letter-spacing:.03em;color:#fff;margin-right:6px;white-space:nowrap}
.emq button{width:24px;height:24px;border:0;border-radius:6px;background:transparent;color:#fff;font-size:13px;line-height:1;cursor:pointer}
.emq button:hover{background:#F0460E}
`;
