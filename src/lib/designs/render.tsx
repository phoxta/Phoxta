import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadAssets } from "./assets";
import { getTemplate, layersOf } from "./templates";
import { boundsOf, hitTest, snapMove, type Gap, type Guide, type Viewport } from "./snap";
import { fontStack, layoutText, measure } from "./layout";
import { plain } from "./rich";
import {
  CANVAS_H, CANVAS_W, paint, resolvePalette,
  type ChipLayer, type Copy, type DesignDoc, type Layer, type Palette, type TextLayer,
} from "./types";

/**
 * The design, as SVG.
 *
 * ONE RENDERER, ON PURPOSE. The obvious build is an HTML preview plus a canvas
 * painter for export — and then there are two implementations of the same
 * layout, which drift, and the drift only shows up in the file the customer
 * downloads rather than the one they approved. SVG does both jobs: real DOM
 * nodes for the editor to select, and a document that rasterises to PNG
 * unchanged. What you approve is what you get, because it is the same markup.
 *
 * Text wrapping is computed rather than declared: SVG has no auto-wrap, so the
 * lines are measured against the actual font with the actual letter-spacing and
 * broken here. That is also what makes the wrap identical in the export.
 */

/* ── Measuring ──────────────────────────────────────────────────────── */

/**
 * Re-measure once the real font has loaded.
 *
 * Wrapping is computed against whatever font the canvas has RIGHT NOW. On a
 * cold load that is the fallback sans, which is wider than Plus Jakarta Sans —
 * so every headline breaks a word or two early, then the webfont swaps in and
 * the design is left with the fallback's line breaks and the real font's
 * glyphs. It looks like a badly-set template rather than a stale measurement,
 * and it fixes itself the moment anyone types a character, which is the worst
 * possible way for a bug to behave.
 *
 * document.fonts.ready settles after the swap, so one re-render there gets the
 * true widths. It is a single extra pass on first paint and none after.
 */
function useFontsReady(): boolean {
  const [ready, setReady] = useState(() =>
    typeof document === "undefined" ? true : Boolean(document.fonts?.status === "loaded"),
  );
  useEffect(() => {
    if (ready || typeof document === "undefined" || !document.fonts) return;
    let live = true;
    void document.fonts.ready.then(() => { if (live) setReady(true); });
    return () => { live = false; };
  }, [ready]);
  return ready;
}



/* ── Layer painters ──────────────────────────────────────────────────────── */

function TextLayerView({ l, value, palette }: { l: TextLayer; value: Copy | undefined; palette: Palette }) {
  // Both hooks run before the empty-text bail-out. Clearing a field is an
  // ordinary thing to do in this editor, and a hook called conditionally would
  // make the whole canvas throw the moment someone emptied one.
  const fontsReady = useFontsReady();
  const lines = useMemo(
    () => layoutText(l, value, fontsReady),
    // fontsReady looks unused to the linter because measurement reads the font
    // off a canvas rather than taking it as an argument. It is exactly the
    // dependency that matters: the same inputs measure differently once the
    // webfont lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [l, value, fontsReady],
  );

  if (!lines.some((line) => line.pieces.length)) return null;

  const anchor = l.align === "center" ? "middle" : l.align === "right" ? "end" : "start";
  const x = l.align === "center" ? l.x + l.w / 2 : l.align === "right" ? l.x + l.w : l.x;

  return (
    <text
      x={x}
      fill={paint(l.fill, palette)}
      fontSize={l.size}
      fontWeight={l.weight}
      fontFamily={fontStack(l.font)}
      fontStyle={l.italic ? "italic" : undefined}
      letterSpacing={l.tracking}
      textAnchor={anchor}
      style={l.capitalize ? { textTransform: "capitalize" } : undefined}
    >
      {lines.map((line, i) => (
        <tspan key={i} x={x} y={line.baseline}>
          {line.pieces.map((piece, j) => {
            const st = piece.style;
            // Only differences from the parent <text> are emitted. Repeating
            // every attribute on every span would multiply the size of an
            // exported SVG for a document that mostly has no run styling at
            // all — and that SVG is inlined into a data URI to be rasterised.
            const deco = [st.underline && "underline", st.strike && "line-through"]
              .filter(Boolean).join(" ");
            return (
              <tspan
                key={j}
                fill={piece.run.fill ? paint(st.fill, palette) : undefined}
                fontWeight={st.weight !== l.weight ? st.weight : undefined}
                fontSize={st.size !== l.size ? st.size : undefined}
                fontStyle={st.italic !== Boolean(l.italic) ? (st.italic ? "italic" : "normal") : undefined}
                fontFamily={piece.run.font ? fontStack(st.font) : undefined}
                textDecoration={deco || undefined}
              >
                {piece.text}
              </tspan>
            );
          })}
        </tspan>
      ))}
    </text>
  );
}

function ChipLayerView({ l, value, palette, asset }: {
  l: ChipLayer; value: Copy | undefined; palette: Palette; asset: (s: string) => string;
}) {
  const text = plain(value).trim();
  if (!text) return null;

  const gradId = `chip-${l.id}`;
  const iconSize = l.iconSize ?? 0;
  const padX = l.icon ? 10 : 16;
  // A chip is one line by definition, so it measures its own style directly
  // rather than laying out runs — but through the same measure() the text
  // painter uses, so the two never drift apart.
  const textW = measure(text, {
    size: l.size, weight: l.weight, italic: false,
    fill: l.fill, underline: false, strike: false,
  }, 0);

  // Centred chips centre the text within whatever the icon leaves; left-aligned
  // ones (the CTA) put the icon on the right, as the file does.
  const iconRight = l.align === "left";
  const contentX = iconRight ? l.x + padX + 10 : l.x + padX + (l.icon ? iconSize + 4 : 0);
  const textX = l.align === "center"
    ? (l.icon ? contentX + (l.w - padX * 2 - iconSize - 4) / 2 : l.x + l.w / 2)
    : contentX;

  return (
    <g>
      {l.gradient && (
        <defs>
          <linearGradient id={gradId} gradientTransform={`rotate(${l.gradient.angle - 90} 0.5 0.5)`}>
            <stop offset="0%" stopColor={paint(l.gradient.from, palette)} />
            <stop offset="100%" stopColor={paint(l.gradient.to, palette)} />
          </linearGradient>
        </defs>
      )}
      <rect
        x={l.x} y={l.y} width={l.w} height={l.h} rx={Math.min(l.radius, l.h / 2)}
        fill={l.gradient ? `url(#${gradId})` : paint(l.fill, palette)}
        fillOpacity={l.fillAlpha ?? 1}
        stroke={l.borderColor ? paint(l.borderColor, palette) : undefined}
        strokeWidth={l.borderWidth ?? 0}
      />
      {l.icon && (
        <image
          href={asset(l.icon)}
          x={iconRight ? l.x + l.w - padX - iconSize : l.x + padX}
          y={l.y + (l.h - iconSize) / 2}
          width={iconSize} height={iconSize}
        />
      )}
      <text
        x={textX}
        y={l.y + l.h / 2 + l.size * 0.35}
        fill={paint(l.color, palette)}
        fontSize={l.size}
        fontWeight={l.weight}
        fontFamily='"Plus Jakarta Sans", sans-serif'
        textAnchor={l.align === "center" ? "middle" : "start"}
      >
        {text}
      </text>
      {/* A chip whose label outgrew it is a layout bug the owner can fix by
          shortening the word; flagging it beats silently overflowing. */}
      {textW > l.w - padX * 2 - (l.icon ? iconSize : 0) && (
        <title>{`"${text}" is wider than this chip`}</title>
      )}
    </g>
  );
}

/* ── The design ──────────────────────────────────────────────────────────── */

export type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "move" | "rotate";

/** The corner each handle pivots around — the point that must not move. */
const ANCHOR: Partial<Record<Handle, [number, number]>> = {
  nw: [1, 1], ne: [0, 1], sw: [1, 0], se: [0, 0],
  n: [0.5, 1], s: [0.5, 0], w: [1, 0.5], e: [0, 0.5],
};

/** Rotate a vector. Used both to read a drag in a rotated layer's own frame
 *  and to put the result back into canvas space. */
function spin(x: number, y: number, deg: number) {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r), n = Math.sin(r);
  return { x: x * c - y * n, y: x * n + y * c };
}

export type RenderOpts = {
  doc: DesignDoc;
  /** Rendered width in CSS pixels. The SVG scales; the layout does not. */
  width: number;
  /** Rendered height. Defaults to the artboard's aspect — set it only when the
   *  canvas is a viewport onto the artboard rather than the artboard itself. */
  height?: number;
  /**
   * What part of the artboard is visible. Absent means "the whole thing",
   * which is what a thumbnail and an export want.
   */
  viewport?: Viewport;
  /** Editor affordances. Omitted for thumbnails and export. */
  selectedId?: string | null;
  /** Everything selected. `selectedId` stays as the single-selection shorthand
   *  so thumbnails and older callers need no change. */
  selectedIds?: string[];
  onSelect?: (id: string | null, additive?: boolean) => void;
  /** A marquee finished; these layers are inside it. */
  onMarquee?: (ids: string[], additive: boolean) => void;
  /** Space-drag or middle-drag panning. */
  onPan?: (dx: number, dy: number) => void;
  /**
   * Live geometry while a drag is in flight, and once more on release.
   * `commit` marks the end of a gesture — which is what the caller pushes onto
   * the undo stack, so dragging a layer across the canvas is one undo step
   * rather than four hundred.
   */
  onGeometry?: (id: string, box: { x: number; y: number; w: number; h: number; rotation?: number }, commit: boolean) => void;
  /**
   * A multi-selection was resized. Reported as the union box before and after
   * rather than as per-layer geometry, so the caller decides how to distribute
   * the scale — including what happens to font sizes, which the renderer has
   * no business deciding.
   */
  onTransform?: (
    from: { x: number; y: number; w: number; h: number },
    to: { x: number; y: number; w: number; h: number },
    commit: boolean,
  ) => void;
  /**
   * A layer was opened for editing — double-clicked, or Enter on the
   * selection. The caller decides what that means; for text it puts a caret
   * in it, which is why the id rather than a boolean travels.
   */
  onOpen?: (id: string) => void;
  /**
   * The layer currently being edited elsewhere, which this renderer must not
   * paint. The inline text editor draws the copy itself while it has the
   * caret, and painting both would double-strike every glyph.
   */
  editingId?: string | null;
  /** Pre-resolved assets, for export. Falls back to live loading. */
  assetMap?: Record<string, string>;
};

/** Every asset path a document needs, for preloading. */
export function assetsOf(doc: DesignDoc): string[] {
  const out: string[] = [];
  for (const l of layersOf(doc)) {
    if (l.type === "asset") out.push(l.src);
    if (l.type === "image" && l.mask) out.push(l.mask);
    if (l.type === "chip" && l.icon) out.push(l.icon);
  }
  return [...new Set(out)];
}

/**
 * Client pixels → canvas pixels.
 *
 * getScreenCTM is the only conversion that survives everything the page can do
 * to the SVG — the display scale, a sticky container, a scrolled panel, a
 * zoomed browser. Doing the arithmetic by hand from boundingClientRect works
 * until one of those changes and then puts the cursor a few pixels away from
 * the thing it is dragging, which feels broken long before anyone works out
 * why.
 */
function toCanvas(svg: SVGSVGElement, clientX: number, clientY: number) {
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: clientX, y: clientY };
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const p = pt.matrixTransform(ctm.inverse());
  return { x: p.x, y: p.y };
}

type Box = { x: number; y: number; w: number; h: number };

type Drag = {
  /** Empty for a group transform, which has no single layer behind it. */
  id: string;
  handle: Handle;
  startX: number;
  startY: number;
  box: Box;
  /** The layer's rotation when the gesture began, in degrees. */
  rotation: number;
  /** Pointer angle about the box centre when a rotate gesture began. */
  startAngle: number;
  /** True when the gesture resizes a whole selection rather than one layer. */
  group: boolean;
};

/**
 * Apply a pointer delta to the box the gesture started from.
 *
 * Three things happen here that a naive version gets wrong.
 *
 * A ROTATED layer reads its drag in its own frame. Dragging the east handle of
 * a layer turned 90° must widen it along the direction it is facing, not along
 * the screen — otherwise every rotated layer resizes sideways.
 *
 * KEEP-RATIO locks the aspect from the larger of the two axis changes, so the
 * box follows whichever way the cursor is actually travelling instead of
 * snapping between two interpretations as the pointer wobbles.
 *
 * The ANCHOR — the corner opposite the handle — is then pinned in canvas
 * space. For an unrotated box that is automatic; for a rotated one the box
 * turns about its own centre, so a resize moves the centre and drags the
 * anchor around with it. The last block undoes exactly that.
 */
function resolveDrag(d: Drag, dxIn: number, dyIn: number, ratio: boolean, fromCentre: boolean): Box {
  const { x, y, w, h } = d.box;
  const deg = d.rotation;
  const { x: dx, y: dy } = deg ? spin(dxIn, dyIn, -deg) : { x: dxIn, y: dyIn };

  if (d.handle === "move") return { x: x + dxIn, y: y + dyIn, w, h };
  if (d.handle === "rotate") return d.box;

  let n: Box;
  switch (d.handle) {
    case "n":  n = { x, y: y + dy, w, h: h - dy }; break;
    case "s":  n = { x, y, w, h: h + dy }; break;
    case "w":  n = { x: x + dx, y, w: w - dx, h }; break;
    case "e":  n = { x, y, w: w + dx, h }; break;
    case "nw": n = { x: x + dx, y: y + dy, w: w - dx, h: h - dy }; break;
    case "ne": n = { x, y: y + dy, w: w + dx, h: h - dy }; break;
    case "sw": n = { x: x + dx, y, w: w - dx, h: h + dy }; break;
    default:   n = { x, y, w: w + dx, h: h + dy };
  }

  const anchor = ANCHOR[d.handle];
  if (!anchor) return n;
  const [ax, ay] = anchor;

  if (ratio && w > 0 && h > 0) {
    const aspect = w / h;
    let nw = Math.max(1, Math.abs(n.w));
    let nh = Math.max(1, Math.abs(n.h));
    // The axis that changed proportionally more is the one the cursor means.
    if (Math.abs(nw / w - 1) >= Math.abs(nh / h - 1)) nh = nw / aspect;
    else nw = nh * aspect;
    n = { w: nw, h: nh, x: 0, y: 0 };
    n.x = x + w * ax - nw * ax;
    n.y = y + h * ay - nh * ay;
  }

  n.w = Math.max(1, n.w);
  n.h = Math.max(1, n.h);

  if (fromCentre) {
    // Alt resizes about the centre: the far side moves out by as much as the
    // near side moved in, which is how you grow a thing in place.
    n.x = x + w / 2 - n.w / 2;
    n.y = y + h / 2 - n.h / 2;
    return n;
  }

  if (!deg) return n;
  // Pin the anchor. Both corners are expressed relative to their own centres,
  // turned, and the difference removed.
  const c0 = { x: x + w / 2, y: y + h / 2 };
  const c1 = { x: n.x + n.w / 2, y: n.y + n.h / 2 };
  const before = spin(x + w * ax - c0.x, y + h * ay - c0.y, deg);
  const after = spin(n.x + n.w * ax - c1.x, n.y + n.h * ay - c1.y, deg);
  n.x += (c0.x + before.x) - (c1.x + after.x);
  n.y += (c0.y + before.y) - (c1.y + after.y);
  return n;
}

/** Keyboard modifiers, read at event time rather than from React state. */
type Mods = { shift: boolean; alt: boolean };
const mods = (e: { shiftKey: boolean; altKey: boolean }): Mods => ({ shift: e.shiftKey, alt: e.altKey });

/** Pointer angle about a box's centre, in degrees. */
function angleTo(box: Box, p: { x: number; y: number }) {
  return (Math.atan2(p.y - (box.y + box.h / 2), p.x - (box.x + box.w / 2)) * 180) / Math.PI;
}

export function DesignSvg({
  doc, width, height, viewport, selectedId, selectedIds, onSelect,
  onMarquee, onPan, onGeometry, onTransform, onOpen, editingId, assetMap,
}: RenderOpts) {
  const template = getTemplate(doc.templateId);
  const palette = resolvePalette(doc, template?.palette);
  const [loaded, setLoaded] = useState<Record<string, string>>({});
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<Drag | null>(null);
  const marquee = useRef<{ x: number; y: number; additive: boolean } | null>(null);
  // The live box is state (it has to paint) but the authoritative one is a ref,
  // because pointerup can arrive before React has re-rendered and the handler
  // would otherwise close over a box one frame old — or, on a fast drag, null.
  const marqueeBox = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  /**
   * Double-press, timed rather than delegated to the browser.
   *
   * `dblclick` never fires here. Selecting a layer re-renders it, so the
   * second press lands on a different DOM node from the first and Chrome
   * restarts its click count -- both presses arrive with detail=1 and the
   * event the editor is waiting for simply never happens. Timing the presses
   * ourselves is immune to that, and to the pointer capture the drag needs.
   */
  const lastPress = useRef<{ id: string; at: number }>({ id: "", at: 0 });
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [gaps, setGaps] = useState<Gap[]>([]);
  const layers = layersOf(doc);
  const editable = Boolean(onGeometry);
  const zoom = viewport?.zoom ?? 1;

  // The single id is folded into the set so there is one selection concept
  // below this line rather than two that can disagree. Memoised because the
  // drag callbacks depend on it, and a fresh array each render would rebuild them
  // on every frame of a drag.
  const chosen = useMemo(
    () => (selectedIds?.length ? selectedIds : selectedId ? [selectedId] : []),
    [selectedIds, selectedId],
  );

  const needed = useMemo(() => assetsOf(doc), [doc]);

  useEffect(() => {
    if (assetMap) return;
    let live = true;
    void loadAssets(needed, palette).then((m) => { if (live) setLoaded(m); });
    return () => { live = false; };
    // Only the two hexes baked into the artwork matter here; depending on the
    // whole palette object would refetch every asset on any colour change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needed, palette.ink, palette.accent, assetMap]);

  const beginDrag = useCallback((e: React.PointerEvent, id: string, handle: Handle) => {
    const svg = svgRef.current;
    const l = layersOf(doc).find((x) => x.id === id);
    if (!svg || !l || l.locked) return;
    // Space means pan, wherever the cursor happens to be. Swallowing the press
    // here left panning working only over empty canvas, which on a design that
    // covers the artboard is nowhere at all.
    if (spaceHeld.current) return;
    // Ctrl (or Cmd) means "marquee from here regardless of what is underneath".
    //
    // Without this, marquee selection is unreachable on most of the pack.
    // These templates are built from full-bleed artwork and edge-to-edge
    // panels, so the honest answer to "where is the empty canvas" is nowhere:
    // pressing anywhere lands on a layer and starts a move. Letting the press
    // fall through to the canvas handler is the escape hatch.
    if (e.ctrlKey || e.metaKey) return;
    e.stopPropagation();
    // Pointer capture is what keeps the gesture alive when the cursor leaves
    // the SVG — without it a fast drag toward the panel simply stops, and the
    // layer is left halfway.
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = toCanvas(svg, e.clientX, e.clientY);

    // A second press on the same layer within the double-click window opens
    // it, and deliberately does not begin a drag: the hand always moves a
    // little between two clicks, and starting one would nudge the layer by a
    // few pixels every time someone edited its text.
    if (handle === "move" && onOpen && lastPress.current.id === id && e.timeStamp - lastPress.current.at < 400) {
      lastPress.current = { id: "", at: 0 };
      // The press must be swallowed twice over.
      //
      // stopPropagation, because falling through to the canvas handler starts
      // a marquee, and the zero-sized marquee that follows clears the
      // selection -- unmounting the editor this press just opened.
      //
      // preventDefault, because the browser's own default action for a press
      // is to move focus to whatever was pressed. That runs after this
      // handler, so it would steal focus back from the text editor a moment
      // after it was given it, and the editor would blur and close itself.
      e.stopPropagation();
      e.preventDefault();
      onOpen(id);
      return;
    }
    lastPress.current = { id, at: e.timeStamp };

    const box = { x: l.x, y: l.y, w: l.w, h: l.h };
    drag.current = {
      id, handle, startX: p.x, startY: p.y, box,
      rotation: l.rotation ?? 0,
      startAngle: angleTo(box, p),
      group: false,
    };
    if (!chosen.includes(id)) onSelect?.(id, e.shiftKey);
  }, [doc, onSelect, chosen, onOpen]);

  /** A handle on the union box of a multi-selection. Scales the whole set. */
  const beginGroup = useCallback((e: React.PointerEvent, box: Box, handle: Handle) => {
    const svg = svgRef.current;
    if (!svg || spaceHeld.current || e.ctrlKey || e.metaKey) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = toCanvas(svg, e.clientX, e.clientY);
    drag.current = { id: "", handle, startX: p.x, startY: p.y, box, rotation: 0, startAngle: angleTo(box, p), group: true };
  }, []);

  /** Where a gesture wants the box, after snapping. Only moves snap: snapping
   *  a resize would fight the handle the cursor is holding. */
  const resolve = useCallback((d: Drag, dx: number, dy: number, mod: Mods, live: boolean) => {
    // A group scales proportionally unless told otherwise, because the common
    // reason to resize several things at once is to fit them somewhere, and a
    // non-uniform stretch of a laid-out group is almost never what was meant.
    const ratio = d.group ? !mod.shift : mod.shift;
    const next = resolveDrag(d, dx, dy, ratio, mod.alt);
    if (d.handle !== "move") { if (live) { setGuides([]); setGaps([]); } return next; }
    const others = layersOf(doc).filter((l) => !chosen.includes(l.id));
    const snapped = snapMove(next, others, zoom);
    // The commit frame still has to SNAP -- the released position must be the
    // one that was on screen -- but it must not repaint the guides. Publishing
    // them here is what left a dashed line and a gap badge stranded on the
    // canvas after every drag, cleared only by starting another one.
    if (live) { setGuides(snapped.guides); setGaps(snapped.gaps); }
    return { ...next, x: snapped.x, y: snapped.y };
  }, [doc, chosen, zoom]);

  /**
   * Turn a gesture into a callback.
   *
   * Rotation, group scaling and single-layer geometry all end here so that the
   * live frame and the commit frame run identical code. Written out twice, a
   * release could commit a slightly different box from the one on screen: a
   * one-pixel jump at the end of every drag that is maddening to track down.
   */
  const apply = useCallback((d: Drag, p: { x: number; y: number }, mod: Mods, commit: boolean) => {
    if (d.handle === "rotate") {
      let deg = d.rotation + (angleTo(d.box, p) - d.startAngle);
      // Shift steps by 15 degrees, which covers every angle anyone would
      // otherwise type into the rotation field by hand.
      if (mod.shift) deg = Math.round(deg / 15) * 15;
      deg = Math.round(((deg % 360) + 360) % 360);
      onGeometry?.(d.id, { ...d.box, rotation: deg }, commit);
      return;
    }
    const next = resolve(d, p.x - d.startX, p.y - d.startY, mod, !commit);
    if (d.group) onTransform?.(d.box, next, commit);
    else onGeometry?.(d.id, next, commit);
  }, [onGeometry, onTransform, resolve]);

  const moveDrag = useCallback((e: React.PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return;

    if (marquee.current) {
      const p = toCanvas(svg, e.clientX, e.clientY);
      const m = marquee.current;
      const b = { x: Math.min(m.x, p.x), y: Math.min(m.y, p.y), w: Math.abs(p.x - m.x), h: Math.abs(p.y - m.y) };
      marqueeBox.current = b;
      setBox(b);
      return;
    }

    const d = drag.current;
    if (!d) return;
    const p = toCanvas(svg, e.clientX, e.clientY);
    apply(d, p, mods(e), false);
  }, [apply]);

  const endDrag = useCallback((e: React.PointerEvent) => {
    const svg = svgRef.current;

    if (marquee.current) {
      const m = marquee.current;
      marquee.current = null;
      const b = marqueeBox.current;
      marqueeBox.current = null;
      setBox(null);
      // A click is a marquee of zero size. Treating it as one would clear the
      // selection twice and select nothing, so tiny boxes are ignored.
      if (b && b.w > 3 / zoom && b.h > 3 / zoom) onMarquee?.(hitTest(layersOf(doc), b), m.additive);
      else if (!m.additive) onSelect?.(null);
      return;
    }

    const d = drag.current;
    drag.current = null;
    setGuides([]);
    setGaps([]);
    if (!d || !svg) return;
    const p = toCanvas(svg, e.clientX, e.clientY);
    // The commit carries the final box as well as the flag. Sending only the
    // flag would rely on the last move event having landed, and the one that
    // matters is exactly the one a fast release can skip.
    apply(d, p, mods(e), true);
  }, [onMarquee, onSelect, doc, zoom, apply]);

  /** Empty canvas: start a marquee, or pan if space is held. */
  const beginCanvas = useCallback((e: React.PointerEvent) => {
    const svg = svgRef.current;
    if (!svg || !editable) return;
    if (e.button === 1 || panning.current) return; // handled by the pan effect
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = toCanvas(svg, e.clientX, e.clientY);
    marquee.current = { x: p.x, y: p.y, additive: e.shiftKey };
    setBox({ x: p.x, y: p.y, w: 0, h: 0 });
  }, [editable]);

  /* Space-to-pan, the convention every editor shares. Tracked on the window so
     holding space works before the cursor enters the canvas. */
  const panning = useRef(false);
  const [spaceDown, setSpaceDown] = useState(false);
  // A ref as well as state: the layer handlers need the current value at event
  // time, not the value captured when they were last rendered.
  const spaceHeld = useRef(false);
  useEffect(() => {
    if (!editable) return;
    const down = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (e.code !== "Space" || el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      e.preventDefault();
      spaceHeld.current = true;
      setSpaceDown(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      spaceHeld.current = false;
      setSpaceDown(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [editable]);

  const panFrom = useRef<{ x: number; y: number } | null>(null);
  const onDown = useCallback((e: React.PointerEvent) => {
    if (!editable) return;
    if (spaceDown || e.button === 1) {
      e.preventDefault();
      panning.current = true;
      panFrom.current = { x: e.clientX, y: e.clientY };
      (e.target as Element).setPointerCapture?.(e.pointerId);
      return;
    }
    beginCanvas(e);
  }, [editable, spaceDown, beginCanvas]);

  const onMove = useCallback((e: React.PointerEvent) => {
    if (panning.current && panFrom.current) {
      const dx = (e.clientX - panFrom.current.x) / zoom;
      const dy = (e.clientY - panFrom.current.y) / zoom;
      panFrom.current = { x: e.clientX, y: e.clientY };
      onPan?.(-dx, -dy);
      return;
    }
    moveDrag(e);
  }, [zoom, onPan, moveDrag]);

  const onUp = useCallback((e: React.PointerEvent) => {
    if (panning.current) { panning.current = false; panFrom.current = null; return; }
    endDrag(e);
  }, [endDrag]);

  // While the recoloured version is in flight the raw file renders — right
  // shape, default colours — rather than a gap where the art should be.
  const asset = (s: string) => assetMap?.[s] ?? loaded[s] ?? s;

  // A design outlives the layout it was made from. Templates get renamed and
  // repacked; a saved design that points at an id which no longer exists still
  // holds its own materialised layers, and rendering nothing for it turned the
  // library grid into a blank tile with no explanation. Layers first, template
  // second, and only give up when there is genuinely nothing to draw.
  if (!layers.length) return null;

  const content = { ...(template?.content ?? {}), ...doc.content };
  const h = height ?? (CANVAS_H * width) / CANVAS_W;
  const vb = viewport
    ? `${viewport.x} ${viewport.y} ${width / viewport.zoom} ${h / viewport.zoom}`
    : `0 0 ${CANVAS_W} ${CANVAS_H}`;
  const sel = chosen.map((id) => layers.find((l) => l.id === id)).filter(Boolean) as Layer[];

  return (
    <svg
      ref={svgRef}
      viewBox={vb}
      width={width}
      height={h}
      xmlns="http://www.w3.org/2000/svg"
      style={{
        display: "block", maxWidth: "100%",
        touchAction: editable ? "none" : undefined,
        cursor: spaceDown ? "grab" : undefined,
      }}
      role="img"
      aria-label={plain(content.title) || template?.name || "Design"}
      onPointerMove={editable ? onMove : undefined}
      onPointerUp={editable ? onUp : undefined}
      onPointerCancel={editable ? onUp : undefined}
      onPointerDown={editable ? onDown : undefined}
    >
      {/* The artboard, so the area outside it reads as off-canvas rather than
          as an enormous white design. */}
      {viewport && (
        <rect
          x={0} y={0} width={CANVAS_W} height={CANVAS_H}
          fill="#ffffff" stroke="rgba(0,0,0,0.14)" strokeWidth={1 / zoom}
        />
      )}
      <defs>
        {layers.map((l) =>
          l.type === "gradient" ? (
            <linearGradient key={l.id} id={`grad-${l.id}`} gradientTransform={`rotate(${l.angle - 90} 0.5 0.5)`}>
              <stop offset="0%" stopColor={paint(l.from, palette)} />
              <stop offset="100%" stopColor={paint(l.to, palette)} />
            </linearGradient>
          ) : null,
        )}
        {layers.map((l) =>
          l.type === "image" && l.mask ? (
            <clipPath key={l.id} id={`mask-${l.id}`} clipPathUnits="objectBoundingBox">
              {/* objectBoundingBox keeps the mask tied to the slot rather than
                  to canvas coordinates, so the same mask works if the slot
                  moves. */}
              <rect x="0" y="0" width="1" height="1" />
            </clipPath>
          ) : null,
        )}
      </defs>

      {layers.filter((l) => !l.hidden && l.id !== editingId).map((l) => (
        <LayerView
          key={l.id}
          l={l}
          doc={doc}
          content={content}
          palette={palette}
          asset={asset}
          editable={editable}
          onPointerDown={beginDrag}
        />
      ))}

      {/* Selection chrome paints last so it is never buried under a layer that
          happens to sit above the selected one. */}
      {editable && guides.map((g, i) => (
        <line
          key={i} data-editor-only="guide"
          x1={g.axis === "x" ? g.at : g.from} y1={g.axis === "x" ? g.from : g.at}
          x2={g.axis === "x" ? g.at : g.to} y2={g.axis === "x" ? g.to : g.at}
          stroke="#f0460e" strokeWidth={1.5 / zoom} strokeDasharray={`${6 / zoom} ${4 / zoom}`}
        />
      ))}

      {editable && gaps.map((g, i) => <GapBadge key={i} g={g} zoom={zoom} />)}

      {editable && sel.length === 1 && !sel[0].hidden && (
        <Selection l={sel[0]} zoom={zoom} onPointerDown={beginDrag} />
      )}

      {/* A multi-selection gets the same frame a single layer does. Its
          handles scale the whole set proportionally, with the font sizes
          carried along by the caller. */}
      {editable && sel.length > 1 && (() => {
        const b = boundsOf(sel);
        if (!b) return null;
        return (
          <g data-editor-only="multi">
            {sel.map((l) => (
              <rect key={l.id} x={l.x} y={l.y} width={l.w} height={l.h}
                    fill="none" stroke="#1c56fd" strokeWidth={1 / zoom} opacity={0.55} pointerEvents="none" />
            ))}
            {/* Under the handles, so the corners stay grabbable. */}
            <rect x={b.x} y={b.y} width={b.w} height={b.h} fill="transparent"
                  style={{ cursor: "move" }}
                  onPointerDown={(e) => beginDrag(e, sel[0].id, "move")} />
            <Frame
              box={b} rotation={0} zoom={zoom}
              handles={Boolean(onTransform)} rotatable={false}
              onPointerDown={(e, h) => beginGroup(e, b, h)}
            />
          </g>
        );
      })()}

      {editable && box && (
        <rect
          data-editor-only="marquee"
          x={box.x} y={box.y} width={box.w} height={box.h}
          fill="rgba(28,86,253,0.10)" stroke="#1c56fd" strokeWidth={1 / zoom} pointerEvents="none"
        />
      )}
    </svg>
  );
}

function LayerView({ l, doc, content, palette, asset, editable, onPointerDown }: {
  l: Layer;
  doc: DesignDoc;
  content: Record<string, Copy | undefined>;
  palette: Palette;
  asset: (s: string) => string;
  editable: boolean;
  onPointerDown: (e: React.PointerEvent, id: string, handle: Handle) => void;
}) {
  // Everything is grabbable now, not just the text and the photos — that is
  // the difference between filling in a template and having a canvas. Locked
  // layers stay out of it so the background does not come along for the ride.
  const grabbable = editable && !l.locked;

  const body = (() => {
    switch (l.type) {
      case "rect":
        return (
          <rect
            x={l.x} y={l.y} width={l.w} height={l.h} rx={l.radius ?? 0}
            fill={paint(l.fill, palette)}
            fillOpacity={l.opacity ?? 1}
            stroke={l.strokeColor ? paint(l.strokeColor, palette) : undefined}
            strokeWidth={l.strokeWidth ?? 0}
          />
        );

      case "gradient":
        return <rect x={l.x} y={l.y} width={l.w} height={l.h} rx={l.radius ?? 0} fill={`url(#grad-${l.id})`} />;

      case "asset":
        return (
          <image
            href={asset(l.src)} x={l.x} y={l.y} width={l.w} height={l.h}
            opacity={l.opacity ?? 1} preserveAspectRatio="xMidYMid meet"
          />
        );

      case "image": {
        const placed = doc.images[l.slot];
        const clip = `clip-${l.id}`;
        return (
          <>
            <defs>
              <clipPath id={clip}>
                <rect x={l.x} y={l.y} width={l.w} height={l.h} rx={l.radius ?? 0} />
              </clipPath>
              {l.mask && (
                <mask id={`m-${l.id}`}>
                  <image href={asset(l.mask)} x={l.x} y={l.y} width={l.w} height={l.h} />
                </mask>
              )}
            </defs>
            {/* An empty slot is outlined, not filled.
                Several templates place a cut-out figure over the headline on
                purpose, so an opaque placeholder hides the very copy someone is
                trying to write. The outline shows where the photograph goes
                without pretending to be one. */}
            {!placed && (
              <g data-editor-only="placeholder">
                <rect
                  x={l.x} y={l.y} width={l.w} height={l.h} rx={l.radius ?? 0}
                  fill="rgba(125,140,175,0.10)" stroke="rgba(125,140,175,0.85)"
                  strokeWidth={3} strokeDasharray="14 10"
                />
                <text
                  x={l.x + l.w / 2} y={l.y + 34} textAnchor="middle"
                  fontSize={24} fontWeight={600} fill="rgba(90,105,140,0.95)"
                  fontFamily='"Plus Jakarta Sans", sans-serif'
                >
                  Add a photo
                </text>
              </g>
            )}
            {placed && (() => {
              // The crop is expressed by drawing the photo into a box larger
              // than its frame and offset within it; the clipPath above then
              // does the actual cropping. Doing it this way means the export
              // path needs no knowledge of cropping at all.
              const z = Math.max(0.05, l.zoom ?? 1);
              const cw = l.w * z;
              const ch = l.h * z;
              return (
                <image
                  href={placed.url}
                  x={l.x - (cw - l.w) / 2 + (l.panX ?? 0) * l.w}
                  y={l.y - (ch - l.h) / 2 + (l.panY ?? 0) * l.h}
                  width={cw} height={ch}
                  preserveAspectRatio={l.fit === "contain" ? "xMidYMid meet" : "xMidYMid slice"}
                  clipPath={`url(#${clip})`}
                  mask={l.mask ? `url(#m-${l.id})` : undefined}
                />
              );
            })()}
          </>
        );
      }

      case "text":
        return <TextLayerView l={l} value={content[l.slot] ?? ""} palette={palette} />;

      case "chip":
        return <ChipLayerView l={l} value={content[l.slot] ?? ""} palette={palette} asset={asset} />;
    }
  })();

  // Rotation and layer opacity wrap whatever the layer painted, so every kind
  // gets both without each painter knowing about them.
  const wrapped = (l.rotation || l.alpha != null) ? (
    <g
      transform={l.rotation ? `rotate(${l.rotation} ${l.x + l.w / 2} ${l.y + l.h / 2})` : undefined}
      opacity={l.alpha ?? 1}
    >
      {body}
    </g>
  ) : body;

  if (!grabbable) return wrapped;

  return (
    <g style={{ cursor: "move" }}>
      {wrapped}
      {/* The hit area is the layer's box, not its glyphs — grabbing the gap
          between two words of a headline should still move the headline. */}
      <rect
        x={l.x} y={l.y} width={l.w} height={l.h} fill="transparent"
        onPointerDown={(e) => onPointerDown(e, l.id, "move")}
      />
    </g>
  );
}

/* ── Selection ───────────────────────────────────────────────────────────
   Eight handles and an outline. Sized in canvas units and divided by nothing,
   because the SVG scales them with everything else — which is also why they
   are drawn relative to the layer rather than at fixed screen pixels. */

const HANDLES: { h: Handle; fx: number; fy: number; cursor: string }[] = [
  { h: "nw", fx: 0, fy: 0, cursor: "nwse-resize" },
  { h: "n", fx: 0.5, fy: 0, cursor: "ns-resize" },
  { h: "ne", fx: 1, fy: 0, cursor: "nesw-resize" },
  { h: "e", fx: 1, fy: 0.5, cursor: "ew-resize" },
  { h: "se", fx: 1, fy: 1, cursor: "nwse-resize" },
  { h: "s", fx: 0.5, fy: 1, cursor: "ns-resize" },
  { h: "sw", fx: 0, fy: 1, cursor: "nesw-resize" },
  { h: "w", fx: 0, fy: 0.5, cursor: "ew-resize" },
];

function Selection({ l, zoom, onPointerDown }: {
  l: Layer;
  zoom: number;
  onPointerDown: (e: React.PointerEvent, id: string, handle: Handle) => void;
}) {
  return (
    <Frame
      box={{ x: l.x, y: l.y, w: l.w, h: l.h }}
      rotation={l.rotation ?? 0}
      zoom={zoom}
      handles={!l.locked}
      rotatable={!l.locked}
      onPointerDown={(e, h) => onPointerDown(e, l.id, h)}
    />
  );
}

/**
 * The selection frame: an outline, eight handles and a rotation grip.
 *
 * Shared by the single and multiple cases so a group gets exactly the same
 * affordances as one layer. The whole thing is rotated with the layer, which
 * is what makes a resize handle on a turned object sit where the eye expects
 * rather than where the unrotated box happens to be.
 */
function Frame({ box, rotation, zoom, handles, rotatable, onPointerDown }: {
  box: Box;
  rotation: number;
  zoom: number;
  handles: boolean;
  rotatable: boolean;
  onPointerDown: (e: React.PointerEvent, h: Handle) => void;
}) {
  // Handles are drawn in canvas units but must stay a constant size on screen,
  // or they become invisible at 25% and swallow the layer at 400%.
  const S = 11 / zoom;
  const W = 2 / zoom;
  const { x, y, w, h } = box;
  // Far enough above the top edge to clear the corner handles at any zoom.
  const armY = y - 26 / zoom;

  return (
    <g
      data-editor-only="selection"
      transform={rotation ? `rotate(${rotation} ${x + w / 2} ${y + h / 2})` : undefined}
    >
      <rect x={x} y={y} width={w} height={h} fill="none" stroke="#1c56fd" strokeWidth={W} pointerEvents="none" />

      {rotatable && (
        <>
          <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={armY} stroke="#1c56fd" strokeWidth={W} pointerEvents="none" />
          <circle
            cx={x + w / 2} cy={armY} r={S * 0.62}
            fill="#ffffff" stroke="#1c56fd" strokeWidth={W}
            style={{ cursor: "grab" }}
            onPointerDown={(e) => onPointerDown(e, "rotate")}
          />
        </>
      )}

      {/* On a short or narrow layer the mid-edge handles meet in the middle
          and cover the layer itself: every press lands on a resize grip, so
          the layer cannot be pressed, dragged from its centre, or opened for
          editing. Below three handles' worth of room, only the corners are
          offered — which is what leaves the middle free. */}
      {handles && HANDLES.filter(({ fx, fy }) => {
        // The north and south grips sit on the top and bottom edges, so what
        // decides whether they collide is the box's HEIGHT; east and west are
        // decided by its width.
        if (fx === 0.5) return h > S * 3;
        if (fy === 0.5) return w > S * 3;
        return true;
      }).map(({ h: hd, fx, fy, cursor }) => (
        <rect
          key={hd}
          x={x + w * fx - S / 2}
          y={y + h * fy - S / 2}
          width={S} height={S} rx={2 / zoom}
          fill="#ffffff" stroke="#1c56fd" strokeWidth={W}
          style={{ cursor }}
          onPointerDown={(e) => onPointerDown(e, hd)}
        />
      ))}
    </g>
  );
}

/**
 * A measured gap between the thing being dragged and its neighbour.
 *
 * Alignment guides say "these two edges agree"; this says "there are 48 pixels
 * here and 32 there", which is the question actually being asked when spacing
 * a row of cards. Drawn as a bar with end ticks and the number over a chip, so
 * it reads against both a white and a dark design.
 */
function GapBadge({ g, zoom }: { g: Gap; zoom: number }) {
  const W = 1.25 / zoom;
  const tick = 5 / zoom;
  const horizontal = g.axis === "x";
  const mid = (g.from + g.to) / 2;
  const cx = horizontal ? mid : g.at;
  const cy = horizontal ? g.at : mid;
  const label = `${g.px}`;
  const fs = 12 / zoom;
  const padX = 5 / zoom;
  const bw = label.length * fs * 0.62 + padX * 2;
  const bh = fs * 1.5;

  return (
    <g data-editor-only="gap" pointerEvents="none">
      <line
        x1={horizontal ? g.from : g.at} y1={horizontal ? g.at : g.from}
        x2={horizontal ? g.to : g.at} y2={horizontal ? g.at : g.to}
        stroke="#f0460e" strokeWidth={W}
      />
      {[g.from, g.to].map((at, i) => (
        <line
          key={i}
          x1={horizontal ? at : g.at - tick} y1={horizontal ? g.at - tick : at}
          x2={horizontal ? at : g.at + tick} y2={horizontal ? g.at + tick : at}
          stroke="#f0460e" strokeWidth={W}
        />
      ))}
      <rect x={cx - bw / 2} y={cy - bh / 2} width={bw} height={bh} rx={bh / 2} fill="#f0460e" />
      <text
        x={cx} y={cy + fs * 0.36} textAnchor="middle"
        fontSize={fs} fontWeight={700} fill="#ffffff"
        fontFamily='"Plus Jakarta Sans", sans-serif'
      >
        {label}
      </text>
    </g>
  );
}
