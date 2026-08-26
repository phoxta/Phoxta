import { useEffect, useMemo, useState } from "react";
import { loadAssets } from "./assets";
import { getTemplate } from "./templates";
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

function measure(text: string, size: number, weight: number, tracking: number): number {
  if (typeof document === "undefined") {
    // Server render (the prerender pass). No canvas — approximate, because a
    // rough width here only affects markup that is replaced on hydration.
    return text.length * size * 0.52 + text.length * tracking;
  }
  if (!ctx) ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return text.length * size * 0.52;
  ctx.font = `${weight} ${size}px "Plus Jakarta Sans", sans-serif`;
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
function wrap(text: string, width: number, size: number, weight: number, tracking: number): Run[][] {
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
    if (line.length && measure(next, size, weight, tracking) > width) {
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
    () => wrap(text, l.w, l.size, l.weight, l.tracking),
    // fontsReady looks unused to the linter because wrap() reads the font off
    // the canvas rather than taking it as an argument. It is exactly the
    // dependency that matters: the same inputs measure differently once the
    // webfont lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [text, l.w, l.size, l.weight, l.tracking, fontsReady],
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
      fontFamily='"Plus Jakarta Sans", sans-serif'
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

export type RenderOpts = {
  doc: DesignDoc;
  /** Rendered width in CSS pixels. The SVG scales; the layout does not. */
  width: number;
  /** Editor affordances. Omitted for thumbnails and export. */
  selectedId?: string | null;
  onSelect?: (id: string, slot: string, kind: "text" | "image") => void;
  /** Pre-resolved assets, for export. Falls back to live loading. */
  assetMap?: Record<string, string>;
};

/** Every asset path a document needs, for preloading. */
export function assetsOf(doc: DesignDoc): string[] {
  const t = getTemplate(doc.templateId);
  if (!t) return [];
  const out: string[] = [];
  for (const l of t.layers) {
    if (l.type === "asset") out.push(l.src);
    if (l.type === "image" && l.mask) out.push(l.mask);
    if (l.type === "chip" && l.icon) out.push(l.icon);
  }
  return [...new Set(out)];
}

export function DesignSvg({ doc, width, selectedId, onSelect, assetMap }: RenderOpts) {
  const template = getTemplate(doc.templateId);
  const palette = resolvePalette(doc);
  const [loaded, setLoaded] = useState<Record<string, string>>({});

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

  // While the recoloured version is in flight the raw file renders — right
  // shape, default colours — rather than a gap where the art should be.
  const asset = (s: string) => assetMap?.[s] ?? loaded[s] ?? s;

  if (!template) return null;

  const content = { ...template.content, ...doc.content };
  const scale = width / CANVAS_W;

  return (
    <svg
      viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
      width={width}
      height={CANVAS_H * scale}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", maxWidth: "100%" }}
      role="img"
      aria-label={content.title ?? template.name}
    >
      <defs>
        {template.layers.map((l) =>
          l.type === "gradient" ? (
            <linearGradient key={l.id} id={`grad-${l.id}`} gradientTransform={`rotate(${l.angle - 90} 0.5 0.5)`}>
              <stop offset="0%" stopColor={paint(l.from, palette)} />
              <stop offset="100%" stopColor={paint(l.to, palette)} />
            </linearGradient>
          ) : null,
        )}
        {template.layers.map((l) =>
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

      {template.layers.map((l) => (
        <LayerView
          key={l.id}
          l={l}
          doc={doc}
          content={content}
          palette={palette}
          asset={asset}
          selected={selectedId === l.id}
          onSelect={onSelect}
        />
      ))}
    </svg>
  );
}

function LayerView({ l, doc, content, palette, asset, selected, onSelect }: {
  l: Layer;
  doc: DesignDoc;
  content: Record<string, string | undefined>;
  palette: Palette;
  asset: (s: string) => string;
  selected: boolean;
  onSelect?: RenderOpts["onSelect"];
}) {
  const clickable = Boolean(onSelect) && (l.type === "text" || l.type === "chip" || l.type === "image");
  const kind = l.type === "image" ? "image" : "text";
  const slot = l.type === "text" || l.type === "chip" || l.type === "image" ? l.slot : "";

  const body = (() => {
    switch (l.type) {
      case "rect":
        return <rect x={l.x} y={l.y} width={l.w} height={l.h} rx={l.radius ?? 0} fill={paint(l.fill, palette)} />;

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
            {/* An empty slot is drawn, not skipped: a designer needs to see
                where the photograph goes before there is one. */}
            {!placed && (
              <g>
                <rect
                  x={l.x} y={l.y} width={l.w} height={l.h} rx={l.radius ?? 0}
                  fill="#e9edf5" stroke="#c9d2e6" strokeWidth={3} strokeDasharray="14 10"
                />
                <text
                  x={l.x + l.w / 2} y={l.y + l.h / 2} textAnchor="middle"
                  fontSize={26} fontWeight={600} fill="#7c89a8"
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

  if (!clickable) return body;

  return (
    <g
      onClick={(e) => { e.stopPropagation(); onSelect?.(l.id, slot, kind); }}
      style={{ cursor: "pointer" }}
      tabIndex={0}
      role="button"
      aria-label={`Edit ${slot}`}
      onKeyDown={(e) => { if (e.key === "Enter") onSelect?.(l.id, slot, kind); }}
    >
      {body}
      {/* The hit area is the layer's box, not its glyphs — clicking the gap
          between two words of a headline should still select the headline. */}
      <rect x={l.x} y={l.y} width={l.w} height={l.h} fill="transparent" />
      {selected && (
        <rect
          x={l.x - 6} y={l.y - 6} width={l.w + 12} height={l.h + 12}
          fill="none" stroke="#1c56fd" strokeWidth={4} strokeDasharray="12 8" rx={8}
          pointerEvents="none"
        />
      )}
    </g>
  );
}
