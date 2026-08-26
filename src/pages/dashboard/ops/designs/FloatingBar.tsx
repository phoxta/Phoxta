import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { boundsOf, type Viewport } from "@/lib/designs/snap";
import { hasMark, lengthOf, toRuns, toggleMark, setStyle, type Mark } from "@/lib/designs/rich";
import type { Copy, Layer, Palette, PaintRole, TextLayer } from "@/lib/designs/types";

/**
 * The properties panel, on the canvas.
 *
 * A sidebar makes you look away from the thing you are changing, and on a
 * 1080×1350 artboard that is a long way across the screen. This follows the
 * selection instead: it sits just above whatever is selected and shows only
 * the controls that apply to it, which is both shorter and impossible to get
 * lost in.
 *
 * It flips below the selection when there is no room above, and is clamped
 * inside the stage horizontally — a toolbar for a layer at the top-left corner
 * that renders off-screen is worse than no toolbar.
 */

const FONTS = ["Plus Jakarta Sans", "DM Sans", "Mona Sans", "Poppins", "Inter", "PT Serif"];
const WEIGHTS = [300, 400, 500, 600, 700, 800];

const I = {
  bold: <path d="M4 2h4.5a3 3 0 0 1 0 6H4V2Zm0 6h5a3 3 0 0 1 0 6H4V8Z" />,
  italic: <path d="M6 2h6M4 14h6M9.5 2 7 14" />,
  under: <path d="M4 2v5a4 4 0 0 0 8 0V2M3 14h10" />,
  strike: <path d="M3 8h10M11 5a3 3 0 0 0-6 0M5 11a3 3 0 0 0 6 0" />,
  front: <path d="M8 2 2 5l6 3 6-3-6-3ZM2 11l6 3 6-3" />,
  back: <path d="M2 5l6 3 6-3M8 11 2 8m6 3 6-3" />,
  dup: <path d="M5 5h8v8H5zM3 11V3h8" />,
  bin: <path d="M3 5h10M6 5V3h4v2M5 5l1 9h4l1-9" />,
  lock: <path d="M4 7h8v7H4zM6 7V5a2 2 0 0 1 4 0v2" />,
  more: <path d="M3 8h.01M8 8h.01M13 8h.01" />,
  text: <path d="M3 4V3h10v1M8 3v10M6 13h4" />,
  photo: <path d="M2 3h12v10H2zM2 10l3.5-3.5L9 10l2-2 3 3" />,
  wand: <path d="M3 13 11 5M9 3l1 1M13 7l1 1M12 2l.5 1.5L14 4l-1.5.5L12 6l-.5-1.5L10 4l1.5-.5Z" />,
};

const Ico = ({ d }: { d: React.ReactNode }) => (
  <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor"
       strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);

type Cmd = "front" | "back" | "duplicate" | "delete" | "lock";

export type BarProps = {
  layers: Layer[];
  sel: string[];
  content: Record<string, Copy | undefined>;
  palette: Palette;
  view: Viewport;
  stage: { width: number; height: number };
  /** True while the inline text editor has the caret. */
  editing: boolean;
  onPatch: (patch: Partial<Layer>, commit?: boolean) => void;
  onContent: (next: Copy) => void;
  onCommand: (c: Cmd) => void;
  onEditText: () => void;
  onPickImage: () => void;
};

export function FloatingBar(p: BarProps) {
  const chosen = p.layers.filter((l) => p.sel.includes(l.id));
  const one = chosen.length === 1 ? chosen[0] : null;
  const bar = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const [open, setOpen] = useState<string | null>(null);

  const selKey = p.sel.join(",");

  // Measured after every render rather than on a dependency list, because the
  // width depends on which controls this layer type shows, how long its font
  // name is and what the size reads — all of which change without warning.
  // Guarded so a stable width does not schedule another render.
  useLayoutEffect(() => {
    const next = bar.current?.offsetWidth ?? 0;
    if (next !== w) setW(next);
  }, [w]);

  // Any change of selection closes whatever popover was open, so a colour
  // picker never ends up pointing at a layer that is no longer selected.
  useEffect(() => { setOpen(null); }, [selKey]);

  const b = boundsOf(chosen);
  if (!b || !chosen.length) return null;

  const H = 40;
  const left = Math.min(
    Math.max(8, (b.x + b.w / 2 - p.view.x) * p.view.zoom - w / 2),
    Math.max(8, p.stage.width - w - 8),
  );
  const above = (b.y - p.view.y) * p.view.zoom - H - 14;
  const below = (b.y + b.h - p.view.y) * p.view.zoom + 14;
  const top = above >= 8 ? above : Math.min(below, p.stage.height - H - 8);
  // Which way a popover opens.
  //
  // The bar normally sits above the selection, so a popover that always opened
  // downward would cover the very layer being changed -- you would be picking
  // a colour while unable to see the words it applies to. It opens upward
  // whenever there is room for it above the bar, and downward only when the
  // bar is near the top of the stage and there is nowhere else to go.
  const low = top > 250;

  const text = one?.type === "text" ? (one as TextLayer) : null;
  const runs = text ? toRuns(p.content[text.slot], text.accent) : [];

  /** A mark applies to the live selection while editing, and to the whole
   *  layer otherwise — so the button does something useful either way. */
  const mark = (m: Mark) => {
    if (p.editing) { document.execCommand(m === "strike" ? "strikeThrough" : m); return; }
    if (!text) return;
    p.onContent(toggleMark(runs, 0, lengthOf(p.content[text.slot]), m));
  };
  const markOn = (m: Mark) => {
    if (p.editing) {
      try { return document.queryCommandState(m === "strike" ? "strikeThrough" : m); } catch { return false; }
    }
    return text ? hasMark(runs, 0, lengthOf(p.content[text.slot]), m) : false;
  };

  const paintRun = (role: PaintRole) => {
    if (!text) return;
    p.onContent(setStyle(runs, 0, lengthOf(p.content[text.slot]), { fill: role }));
  };

  const Btn = ({ id, title, on, onClick, children }: {
    id?: string; title: string; on?: boolean; onClick: () => void; children: React.ReactNode;
  }) => (
    <button
      type="button" className={`dsn-fb__b${on ? " is-on" : ""}`} title={title} aria-label={title}
      aria-pressed={on} data-pop={id}
      onPointerDown={(e) => e.preventDefault()}
      onClick={onClick}
    >{children}</button>
  );

  const Pop = ({ id, children }: { id: string; children: React.ReactNode }) =>
    open === id ? <div className="dsn-fb__pop" onPointerDown={(e) => e.stopPropagation()}>{children}</div> : null;

  const toggle = (id: string) => setOpen((o) => (o === id ? null : id));

  return (
    <div ref={bar} className={`dsn-fb${low ? " dsn-fb--low" : ""}`} style={{ left, top }} onPointerDown={(e) => e.stopPropagation()}>
      {chosen.length > 1 && <span className="dsn-fb__n">{chosen.length} selected</span>}

      {/* ── Text ─────────────────────────────────────────────────────── */}
      {text && (
        <>
          <button type="button" className="dsn-fb__sel" title={`Typeface — ${text.font ?? "Plus Jakarta Sans"}`}
                  onClick={() => toggle("font")}>
            {text.font ?? "Plus Jakarta Sans"}
          </button>
          <Pop id="font">
            <div className="dsn-fb__list">
              {FONTS.map((f) => (
                <button key={f} type="button" className={text.font === f ? "is-on" : ""}
                        style={{ fontFamily: `"${f}", sans-serif` }}
                        onClick={() => { p.onPatch({ font: f } as Partial<Layer>); setOpen(null); }}>{f}</button>
              ))}
            </div>
          </Pop>

          <input
            className="dsn-fb__num" type="number" min={4} max={400} value={Math.round(text.size)}
            title="Size" aria-label="Font size"
            onChange={(e) => p.onPatch({ size: Number(e.target.value) } as Partial<Layer>, false)}
          />

          <span className="dsn-fb__sep" />
          <Btn title="Bold" on={markOn("bold")} onClick={() => mark("bold")}><Ico d={I.bold} /></Btn>
          <Btn title="Italic" on={markOn("italic")} onClick={() => mark("italic")}><Ico d={I.italic} /></Btn>
          <Btn title="Underline" on={markOn("underline")} onClick={() => mark("underline")}><Ico d={I.under} /></Btn>
          <Btn title="Strikethrough" on={markOn("strike")} onClick={() => mark("strike")}><Ico d={I.strike} /></Btn>

          <span className="dsn-fb__sep" />
          <Btn id="colour" title="Text colour" on={open === "colour"} onClick={() => toggle("colour")}>
            <span className="dsn-fb__chip" style={{ background: swatch(text.fill, p.palette) }} />
          </Btn>
          <Pop id="colour">
            <div className="dsn-fb__sw">
              {(["ink", "accent", "accentSoft", "canvas", "white", "black"] as PaintRole[]).map((r) => (
                <button key={String(r)} type="button" title={String(r)} style={{ background: swatch(r, p.palette) }}
                        onClick={() => { paintRun(r); setOpen(null); }} />
              ))}
            </div>
            <p className="dsn-fb__hint">
              {p.editing ? "Applies to the whole layer — select words first for part of it." : "Applies to every word in this layer."}
            </p>
          </Pop>

          <Btn id="type" title="Alignment and spacing" on={open === "type"} onClick={() => toggle("type")}>Aa</Btn>
          <Pop id="type">
            <div className="dsn-fb__row">
              {(["left", "center", "right"] as const).map((a) => (
                <button key={a} type="button" className={text.align === a ? "is-on" : ""}
                        onClick={() => p.onPatch({ align: a } as Partial<Layer>)}>{a}</button>
              ))}
            </div>
            <div className="dsn-fb__row">
              {WEIGHTS.map((n) => (
                <button key={n} type="button" className={text.weight === n ? "is-on" : ""}
                        onClick={() => p.onPatch({ weight: n } as Partial<Layer>)}>{n}</button>
              ))}
            </div>
            <label className="dsn-fb__field">Line height
              <input type="number" step={0.05} value={text.lineHeight}
                     onChange={(e) => p.onPatch({ lineHeight: Number(e.target.value) } as Partial<Layer>, false)} />
            </label>
            <label className="dsn-fb__field">Letter spacing
              <input type="number" step={0.5} value={text.tracking}
                     onChange={(e) => p.onPatch({ tracking: Number(e.target.value) } as Partial<Layer>, false)} />
            </label>
            <div className="dsn-fb__row">
              <button type="button" className={text.uppercase ? "is-on" : ""}
                      onClick={() => p.onPatch({ uppercase: !text.uppercase || undefined } as Partial<Layer>)}>UPPER</button>
              <button type="button" className={text.capitalize ? "is-on" : ""}
                      onClick={() => p.onPatch({ capitalize: !text.capitalize || undefined } as Partial<Layer>)}>Title</button>
            </div>
          </Pop>

          <Btn title="Edit the words" onClick={p.onEditText}><Ico d={I.text} /></Btn>
        </>
      )}

      {/* ── Shapes ───────────────────────────────────────────────────── */}
      {one && (one.type === "rect" || one.type === "gradient") && (
        <>
          <Btn id="fill" title="Fill" on={open === "fill"} onClick={() => toggle("fill")}>
            <span className="dsn-fb__chip" style={{ background: one.type === "rect" ? swatch(one.fill, p.palette) : swatch(one.from, p.palette) }} />
          </Btn>
          <Pop id="fill">
            <div className="dsn-fb__sw">
              {(["ink", "accent", "accentSoft", "canvas", "white", "black", "transparent"] as PaintRole[]).map((r) => (
                <button key={String(r)} type="button" title={String(r)}
                        style={{ background: swatch(r, p.palette) }}
                        onClick={() => { p.onPatch(one.type === "rect" ? { fill: r } as Partial<Layer> : { from: r } as Partial<Layer>); setOpen(null); }} />
              ))}
            </div>
          </Pop>
          <label className="dsn-fb__field dsn-fb__field--inline">Corner
            <input type="number" min={0} value={Math.round(one.radius ?? 0)}
                   onChange={(e) => p.onPatch({ radius: Number(e.target.value) } as Partial<Layer>, false)} />
          </label>
        </>
      )}

      {/* ── Photographs ──────────────────────────────────────────────── */}
      {one?.type === "image" && (
        <>
          <Btn title="Choose a photograph" onClick={p.onPickImage}><Ico d={I.photo} /> Photo</Btn>
          <Btn id="crop" title="Crop" on={open === "crop"} onClick={() => toggle("crop")}>Crop</Btn>
          <Pop id="crop">
            <div className="dsn-fb__row">
              {(["cover", "contain"] as const).map((f) => (
                <button key={f} type="button" className={(one.fit ?? "cover") === f ? "is-on" : ""}
                        onClick={() => p.onPatch({ fit: f } as Partial<Layer>)}>
                  {f === "cover" ? "Fill" : "Fit"}
                </button>
              ))}
            </div>
            <label className="dsn-fb__field">Zoom
              <input type="range" min={100} max={300} value={Math.round((one.zoom ?? 1) * 100)}
                     onChange={(e) => p.onPatch({ zoom: Number(e.target.value) / 100 } as Partial<Layer>, false)} />
            </label>
            <label className="dsn-fb__field">Pan X
              <input type="range" min={-50} max={50} value={Math.round((one.panX ?? 0) * 100)}
                     onChange={(e) => p.onPatch({ panX: Number(e.target.value) / 100 } as Partial<Layer>, false)} />
            </label>
            <label className="dsn-fb__field">Pan Y
              <input type="range" min={-50} max={50} value={Math.round((one.panY ?? 0) * 100)}
                     onChange={(e) => p.onPatch({ panY: Number(e.target.value) / 100 } as Partial<Layer>, false)} />
            </label>
          </Pop>
        </>
      )}

      {/* ── Everything ───────────────────────────────────────────────── */}
      {/* Everything that applies to any layer. Kept behind one button: a
          dozen icons made the bar as wide as the artboard, which defeats the
          point of putting it beside the selection. */}
      <span className="dsn-fb__sep" />
      <Btn id="more" title="More" on={open === "more"} onClick={() => toggle("more")}><Ico d={I.more} /></Btn>
      <Pop id="more">
        <label className="dsn-fb__field">Opacity
          <input type="range" min={0} max={100} value={Math.round((one?.alpha ?? 1) * 100)}
                 onChange={(e) => p.onPatch({ alpha: Number(e.target.value) / 100 } as Partial<Layer>, false)} />
          <code>{Math.round((one?.alpha ?? 1) * 100)}%</code>
        </label>
        <div className="dsn-fb__list">
          <button type="button" onClick={() => { p.onCommand("front"); setOpen(null); }}><Ico d={I.front} /> Bring to front</button>
          <button type="button" onClick={() => { p.onCommand("back"); setOpen(null); }}><Ico d={I.back} /> Send to back</button>
          <button type="button" onClick={() => { p.onCommand("duplicate"); setOpen(null); }}><Ico d={I.dup} /> Duplicate</button>
          <button type="button" onClick={() => { p.onCommand("lock"); setOpen(null); }}>
            <Ico d={I.lock} /> {one?.locked ? "Unlock" : "Lock"}
          </button>
          <button type="button" className="is-danger" onClick={() => { p.onCommand("delete"); setOpen(null); }}><Ico d={I.bin} /> Delete</button>
        </div>
      </Pop>
    </div>
  );
}

function swatch(role: PaintRole | undefined, palette: Palette): string {
  if (!role || role === "transparent") return "repeating-conic-gradient(#ccc 0 25%, #fff 0 50%) 50%/8px 8px";
  if (role === "white") return "#ffffff";
  if (role === "black") return "#000000";
  const known = (palette as unknown as Record<string, string>)[role as string];
  return known ?? String(role);
}
