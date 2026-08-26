import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadAssets } from "./assets";
import { getTemplate, layersOf } from "./templates";
import {
  CANVAS_H, CANVAS_W, paint, resolvePalette,
  type ChipLayer, type DesignDoc, type Layer, type Palette, type TextLayer,
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

/* ── Measuring ───────────────────────────────────────────────────────────── */

let ctx: CanvasRenderingContext2D | null = null;

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

const FALLBACK = '"Plus Jakarta Sans", sans-serif';

/** The stack a layer paints with. The pack uses six families, so the face is
 *  part of the measurement, not a constant. */
export const fontStack = (font?: string) => (font ? `"${font}", ${FALLBACK}` : FALLBACK);

function measure(text: string, size: number, weight: number, tracking: number, font?: string, italic?: boolean): number {
  if (typeof document === "undefined") {
    // Server render (the prerender pass). No canvas — approximate, because a
    // rough width here only affects markup that is replaced on hydration.
    return text.length * size * 0.52 + text.length * tracking;
  }
  if (!ctx) ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return text.length * size * 0.52;
  ctx.font = `${italic ? "italic " : ""}${weight} ${size}px ${fontStack(font)}`;
  // measureText knows nothing about letter-spacing, so it is added back per
  // character — the same arithmetic the renderer then applies.
  return ctx.measureText(text).width + text.length * tracking;
}

/** One run of text, and whether it takes the accent colour. */
type Run = { text: string; accent: boolean };

/**
 * Split on *asterisks* into accented and plain runs.
 *
 * This is how the pack's two-tone headline works — "Finding *Jeans Hard*
 * Enough". A string with no asterisks comes back as a single plain run, so
 * nothing pays for the feature unless it uses it.
 */
function runsOf(text: string): Run[] {
  const out: Run[] = [];
  for (const part of text.split(/(\*[^*]+\*)/g)) {
    if (!part) continue;
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      out.push({ text: part.slice(1, -1), accent: true });
    } else {
      out.push({ text: part, accent: false });
    }
  }
  return out.length ? out : [{ text: "", accent: false }];
}

/** Greedy wrap that preserves which words were accented. */
function wrap(text: string, width: number, size: number, weight: number, tracking: number, font?: string, italic?: boolean): Run[][] {
  const words: Run[] = [];
  for (const run of runsOf(text)) {
    for (const w of run.text.split(/(\s+)/)) {
      if (w === "") continue;
      words.push({ text: w, accent: run.accent });
    }
  }

  const lines: Run[][] = [];
  let line: Run[] = [];
  let lineText = "";

  for (const word of words) {
    if (/^\s+$/.test(word.text)) {
      if (line.length) { line.push(word); lineText += word.text; }
      continue;
    }
    const next = lineText + word.text;
    if (line.length && measure(next, size, weight, tracking, font, italic) > width) {
      lines.push(trimEnd(line));
      line = [word];
      lineText = word.text;
    } else {
      line.push(word);
      lineText = next;
    }
  }
  if (line.length) lines.push(trimEnd(line));
  return lines.length ? lines : [[{ text: "", accent: false }]];
}

const trimEnd = (line: Run[]) => {
  const out = [...line];
  while (out.length && /^\s+$/.test(out[out.length - 1].text)) out.pop();
  return out;
};

/**
 * Where the first baseline sits.
 *
 * Figma positions a text box by its top edge, then centres the line box inside
 * it and puts the glyphs on the baseline. Reproducing that is (leading / 2) plus
 * the ascender — without it every heading in the pack sits a few pixels high,
 * which is invisible on one layer and obvious once six of them stack up.
 */
const ASCENDER = 0.74;
const baselineOf = (y: number, size: number, lineHeight: number) =>
  y + (size * lineHeight - size) / 2 + size * ASCENDER;

/* ── Layer painters ──────────────────────────────────────────────────────── */

function TextLayerView({ l, value, palette }: { l: TextLayer; value: string; palette: Palette }) {
  const text = (l.uppercase ? value.toUpperCase() : value).trim();

  // Both hooks run before the empty-text bail-out. Clearing a field is an
  // ordinary thing to do in this editor, and a hook called conditionally would
  // make the whole canvas throw the moment someone emptied one.
  const fontsReady = useFontsReady();
  const lines = useMemo(
    () => wrap(text, l.w, l.size, l.weight, l.tracking, l.font, l.italic),
    // fontsReady looks unused to the linter because wrap() reads the font off
    // the canvas rather than taking it as an argument. It is exactly the
    // dependency that matters: the same inputs measure differently once the
    // webfont lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [text, l.w, l.size, l.weight, l.tracking, l.font, l.italic, fontsReady],
  );

  if (!text) return null;

  const anchor = l.align === "center" ? "middle" : l.align === "right" ? "end" : "start";
  const x = l.align === "center" ? l.x + l.w / 2 : l.align === "right" ? l.x + l.w : l.x;
  const base = baselineOf(l.y, l.size, l.lineHeight);
  const accentColor = paint(l.accent ?? l.fill, palette);

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
        <tspan key={i} x={x} y={base + i * l.size * l.lineHeight}>
          {line.map((run, j) => (
            <tspan key={j} fill={run.accent ? accentColor : undefined}>{run.text}</tspan>
          ))}
        </tspan>
      ))}
    </text>
  );
}

function ChipLayerView({ l, value, palette, asset }: {
  l: ChipLayer; value: string; palette: Palette; asset: (s: string) => string;
}) {
  const text = value.trim();
  if (!text) return null;

  const gradId = `chip-${l.id}`;
  const iconSize = l.iconSize ?? 0;
  const padX = l.icon ? 10 : 16;
  const textW = measure(text, l.size, l.weight, 0);

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

export type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "move";

export type RenderOpts = {
  doc: DesignDoc;
  /** Rendered width in CSS pixels. The SVG scales; the layout does not. */
  width: number;
  /** Editor affordances. Omitted for thumbnails and export. */
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  /**
   * Live geometry while a drag is in flight, and once more on release.
   * `commit` marks the end of a gesture — which is what the caller pushes onto
   * the undo stack, so dragging a layer across the canvas is one undo step
   * rather than four hundred.
   */
  onGeometry?: (id: string, box: { x: number; y: number; w: number; h: number }, commit: boolean) => void;
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

type Drag = {
  id: string;
  handle: Handle;
  startX: number;
  startY: number;
  box: { x: number; y: number; w: number; h: number };
};

/** Apply a pointer delta to the box the gesture started from. */
function resolveDrag(d: Drag, dx: number, dy: number) {
  const { x, y, w, h } = d.box;
  switch (d.handle) {
    case "move": return { x: x + dx, y: y + dy, w, h };
    case "n":  return { x, y: y + dy, w, h: h - dy };
    case "s":  return { x, y, w, h: h + dy };
    case "w":  return { x: x + dx, y, w: w - dx, h };
    case "e":  return { x, y, w: w + dx, h };
    case "nw": return { x: x + dx, y: y + dy, w: w - dx, h: h - dy };
    case "ne": return { x, y: y + dy, w: w + dx, h: h - dy };
    case "sw": return { x: x + dx, y, w: w - dx, h: h + dy };
    case "se": return { x, y, w: w + dx, h: h + dy };
  }
}

export function DesignSvg({ doc, width, selectedId, onSelect, onGeometry, assetMap }: RenderOpts) {
  const template = getTemplate(doc.templateId);
  const palette = resolvePalette(doc, template?.palette);
  const [loaded, setLoaded] = useState<Record<string, string>>({});
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<Drag | null>(null);
  const layers = layersOf(doc);
  const editable = Boolean(onGeometry);

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
    e.stopPropagation();
    // Pointer capture is what keeps the gesture alive when the cursor leaves
    // the SVG — without it a fast drag toward the panel simply stops, and the
    // layer is left halfway.
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = toCanvas(svg, e.clientX, e.clientY);
    drag.current = { id, handle, startX: p.x, startY: p.y, box: { x: l.x, y: l.y, w: l.w, h: l.h } };
    onSelect?.(id);
  }, [doc, onSelect]);

  const moveDrag = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    const svg = svgRef.current;
    if (!d || !svg) return;
    const p = toCanvas(svg, e.clientX, e.clientY);
    onGeometry?.(d.id, resolveDrag(d, p.x - d.startX, p.y - d.startY), false);
  }, [onGeometry]);

  const endDrag = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    const svg = svgRef.current;
    drag.current = null;
    if (!d || !svg) return;
    const p = toCanvas(svg, e.clientX, e.clientY);
    // The commit carries the final box as well as the flag. Sending only the
    // flag would rely on the last move event having landed, and the one that
    // matters is exactly the one a fast release can skip.
    onGeometry?.(d.id, resolveDrag(d, p.x - d.startX, p.y - d.startY), true);
  }, [onGeometry]);

  // While the recoloured version is in flight the raw file renders — right
  // shape, default colours — rather than a gap where the art should be.
  const asset = (s: string) => assetMap?.[s] ?? loaded[s] ?? s;

  if (!template) return null;

  const content = { ...template.content, ...doc.content };
  const scale = width / CANVAS_W;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
      width={width}
      height={CANVAS_H * scale}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", maxWidth: "100%", touchAction: editable ? "none" : undefined }}
      role="img"
      aria-label={content.title ?? template.name}
      onPointerMove={editable ? moveDrag : undefined}
      onPointerUp={editable ? endDrag : undefined}
      onPointerCancel={editable ? endDrag : undefined}
      onPointerDown={editable ? () => onSelect?.(null) : undefined}
    >
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

      {layers.filter((l) => !l.hidden).map((l) => (
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
      {editable && selectedId && (() => {
        const l = layers.find((x) => x.id === selectedId);
        if (!l || l.hidden) return null;
        return <Selection l={l} onPointerDown={beginDrag} />;
      })()}
    </svg>
  );
}

function LayerView({ l, doc, content, palette, asset, editable, onPointerDown }: {
  l: Layer;
  doc: DesignDoc;
  content: Record<string, string | undefined>;
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
            {placed && (
              <image
                href={placed.url}
                x={l.x} y={l.y} width={l.w} height={l.h}
                preserveAspectRatio="xMidYMid slice"
                clipPath={`url(#${clip})`}
                mask={l.mask ? `url(#m-${l.id})` : undefined}
              />
            )}
          </>
        );
      }

      case "text":
        return <TextLayerView l={l} value={content[l.slot] ?? ""} palette={palette} />;

      case "chip":
        return <ChipLayerView l={l} value={content[l.slot] ?? ""} palette={palette} asset={asset} />;
    }
  })();

  if (!grabbable) return body;

  return (
    <g style={{ cursor: "move" }}>
      {body}
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

function Selection({ l, onPointerDown }: {
  l: Layer;
  onPointerDown: (e: React.PointerEvent, id: string, handle: Handle) => void;
}) {
  const S = 22;
  return (
    <g data-editor-only="selection">
      <rect
        x={l.x} y={l.y} width={l.w} height={l.h}
        fill="none" stroke="#1c56fd" strokeWidth={3} pointerEvents="none"
      />
      {!l.locked && HANDLES.map(({ h, fx, fy, cursor }) => (
        <rect
          key={h}
          x={l.x + l.w * fx - S / 2}
          y={l.y + l.h * fy - S / 2}
          width={S} height={S} rx={4}
          fill="#ffffff" stroke="#1c56fd" strokeWidth={3}
          style={{ cursor }}
          onPointerDown={(e) => onPointerDown(e, l.id, h)}
        />
      ))}
    </g>
  );
}
