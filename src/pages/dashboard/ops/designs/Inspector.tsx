import { useEffect, useRef, useState } from "react";
import {
  align, bringForward, bringToFront, moveMany, sendBackward, sendToBack, toggle, updateLayer,
} from "@/lib/designs/edit";
import { layerName } from "@/lib/designs/templates";
import { hasMark, lengthOf, toggleMark, toRuns, type Mark } from "@/lib/designs/rich";
import {
  CANVAS_H, CANVAS_W, DEFAULT_FONT, DESIGN_FONTS, fontNamed, paint,
  type ChipLayer, type Copy, type Corners, type DesignDoc, type GradientLayer, type ImageLayer, type Layer,
  type Palette, type PaintRole, type RectLayer, type Shadow, type TextLayer,
} from "@/lib/designs/types";
import { ROUNDABLE, SHAPE_KINDS } from "@/lib/designs/shapes";
import { ShapeGlyph } from "./ShapeGlyph";
import type { Cmd } from "./FloatingBar";

/**
 * The Inspector: every property of the thing you have selected, in a rail that
 * cannot cover it.
 *
 * THE POINT OF THE WHOLE FILE. A properties panel that floats over the artwork
 * is editing something it is standing on. This one is part of the editor's
 * layout, so the canvas viewport is 272px narrower and the artwork is never
 * underneath a control. Nothing in here is sticky and nothing is a modal; the
 * rail scrolls, the canvas does not move, and the two are always both visible.
 *
 * EVERY CONTROL HERE SURVIVES EXPORT. That is the rule the contents were
 * chosen by, not a hope about them. The exporter clones the live SVG and
 * rasterises it, so a property is export-safe exactly when the renderer puts it
 * in the SVG — which is why there is no blend mode (SVG mix-blend-mode is not
 * honoured by every rasteriser), no per-layer background colour on a photo (the
 * renderer does not paint `plate`), and no artboard size preset (the artboard
 * is a module constant that snapping, the templates and the exporter all read).
 * A control that looks right on the canvas and vanishes from the file is worse
 * than a control that is not there, because the customer finds out after
 * posting.
 *
 * HISTORY IS NOT REINVENTED. Every mutation goes through the `onEdit` the page
 * already uses for the canvas, the toolbar and the keyboard, so undo is the
 * same stack. A continuous control (a slider, a held arrow key) records once at
 * the start of the interaction and then stops recording, so dragging opacity
 * from 100 to 40 is one undo step rather than sixty.
 */

/* ── Integration seams ───────────────────────────────────────────────────
   Two sibling modules land in this panel later: an asset library and a
   background remover. Both are given a labelled home here so the integrator
   drops a component in rather than restructuring the panel, and neither is
   stubbed — an empty seam renders a disabled row that says what will fill it,
   which is honest, and a filled seam renders exactly what it was handed.

     imageActions  — rendered inside the PHOTO section, under its own
                     "Background" heading. This is where "Remove background"
                     goes. It receives no props: the integrator already has the
                     selected layer from the page.
     assetActions  — rendered inside the PHOTO section under "Source", beside
                     the existing "Replace" button, for the asset library's own
                     entry point.
*/

export type InspectorProps = {
  doc: DesignDoc;
  layers: Layer[];
  sel: string[];
  content: Record<string, Copy | undefined>;
  palette: Palette;
  templateName: string;
  slideCount: number;
  /** The page's own edit gate — records history and marks the doc dirty. */
  onEdit: (next: (d: DesignDoc) => DesignDoc, record?: boolean) => void;
  /** Replace the copy of the single selected text layer. */
  onContent: (next: Copy) => void;
  onSelect: (id: string | null, additive?: boolean) => void;
  onCommand: (c: Cmd) => void;
  onEditText: () => void;
  onPickImage: () => void;
  /** The layers list, owned by the page so this panel needs no extra wiring. */
  layersSlot?: React.ReactNode;
  /** See "Integration seams" above. */
  imageActions?: React.ReactNode;
  assetActions?: React.ReactNode;
};

/* ── Furniture ───────────────────────────────────────────────────────────── */

const Sec = ({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) => (
  <section className="dsni-sec">
    <h4 className="dsni-sec__h">{title}</h4>
    {note && <p className="dsni-note">{note}</p>}
    {children}
  </section>
);

const Row = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
  <div className="dsni-row" title={hint}>
    <span className="dsni-row__k">{label}</span>
    <span className="dsni-row__v">{children}</span>
  </div>
);

/**
 * A number you can type, step or nudge.
 *
 * The draft is local while the field has focus, so a half-typed "1" does not
 * momentarily resize the layer to 1px and lose the rest of what was being
 * typed. Enter and blur commit; Escape puts back what was there; the arrows
 * step, ×10 with shift and ×0.1 with alt, and each step is live so the canvas
 * moves under the key rather than after it.
 */
function Num({ value, onCommit, onLive, step = 1, min, max, suffix, disabled, title, ariaLabel }: {
  value: number;
  /** End of an interaction — this is the one that goes on the undo stack. */
  onCommit: (v: number) => void;
  /** Optional live feedback while stepping. Defaults to committing. */
  onLive?: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  disabled?: boolean;
  title?: string;
  ariaLabel?: string;
}) {
  const round = (n: number) => Math.round(n * 1000) / 1000;
  const [draft, setDraft] = useState(() => String(round(value)));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setDraft(String(round(value)));
  }, [value]);

  const clamp = (n: number) => {
    if (min != null) n = Math.max(min, n);
    if (max != null) n = Math.min(max, n);
    return round(n);
  };

  const commit = (raw: string) => {
    const n = Number(raw.replace(",", "."));
    if (raw.trim() === "" || Number.isNaN(n)) { setDraft(String(round(value))); return; }
    const v = clamp(n);
    setDraft(String(v));
    onCommit(v);
  };

  return (
    <span className={`dsni-num${disabled ? " is-off" : ""}`} title={title}>
      <input
        type="text"
        inputMode="decimal"
        disabled={disabled}
        aria-label={ariaLabel ?? title}
        value={draft}
        onFocus={(e) => { focused.current = true; e.currentTarget.select(); }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => { focused.current = false; commit(e.target.value); }}
        onKeyDown={(e) => {
          // The canvas listens for arrows and Delete on the window. It already
          // ignores keys typed into an input, but stopping here as well keeps
          // that true if the guard ever changes.
          e.stopPropagation();
          if (e.key === "Enter") { e.preventDefault(); commit((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).blur(); }
          else if (e.key === "Escape") { e.preventDefault(); setDraft(String(round(value))); (e.target as HTMLInputElement).blur(); }
          else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
            const by = step * (e.shiftKey ? 10 : e.altKey ? 0.1 : 1) * (e.key === "ArrowUp" ? 1 : -1);
            const from = Number(draft.replace(",", "."));
            const v = clamp((Number.isNaN(from) ? value : from) + by);
            setDraft(String(v));
            (onLive ?? onCommit)(v);
          }
        }}
      />
      {suffix && <i className="dsni-num__u">{suffix}</i>}
    </span>
  );
}

/**
 * A slider with its value beside it.
 *
 * `onChange` is told whether this is the first frame of the drag, and only
 * that frame is recorded — so pulling opacity from 100 to 40 is one undo step
 * rather than the sixty the input actually fires. The flag is carried rather
 * than inferred by the caller, because a caller that guesses gets it wrong in
 * exactly the case that matters: the drag that starts where the last one
 * finished.
 */
function Slide({ value, min, max, step = 1, onChange, suffix, disabled, ariaLabel }: {
  value: number; min: number; max: number; step?: number;
  onChange: (v: number, record: boolean) => void;
  suffix?: string; disabled?: boolean; ariaLabel: string;
}) {
  const started = useRef(false);
  const end = () => { started.current = false; };
  return (
    <span className="dsni-slide">
      <input
        type="range" min={min} max={max} step={step} value={value} disabled={disabled} aria-label={ariaLabel}
        onKeyDown={(e) => e.stopPropagation()}
        onChange={(e) => {
          const first = !started.current;
          started.current = true;
          onChange(Number(e.target.value), first);
        }}
        onPointerUp={end}
        onPointerCancel={end}
        onBlur={end}
        onKeyUp={end}
      />
      <i className="dsni-slide__n">{Math.round(value)}{suffix}</i>
    </span>
  );
}

/** A choice that reads as a choice. */
function Seg<T extends string>({ value, options, onPick, ariaLabel }: {
  value: T | undefined;
  options: { v: T; label: string; title?: string }[];
  onPick: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <span className="dsni-seg" role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.v} type="button" title={o.title ?? o.label}
          className={`dsni-seg__b${value === o.v ? " is-on" : ""}`}
          aria-pressed={value === o.v}
          onClick={() => onPick(o.v)}
        >{o.label}</button>
      ))}
    </span>
  );
}

const Icon = ({ d, size = 14 }: { d: string; size?: number }) => (
  <svg viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor"
       strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

const D = {
  bold: "M4 2h4.5a3 3 0 0 1 0 6H4V2Zm0 6h5a3 3 0 0 1 0 6H4V8Z",
  italic: "M6 2h6M4 14h6M9.5 2 7 14",
  under: "M4 2v5a4 4 0 0 0 8 0V2M3 14h10",
  strike: "M3 8h10M11 5a3 3 0 0 0-6 0M5 11a3 3 0 0 0 6 0",
  drop: "M8 2s4 4.5 4 7.2A4 4 0 0 1 4 9.2C4 6.5 8 2 8 2Z",
};

/* ── Colour ──────────────────────────────────────────────────────────────
   The single most-used control in the panel, so it gets the most care: the
   tenant's brand roles first (a role, not a hex, so a later palette change
   still reaches it), then the colours you have already reached for in this
   session, then a hex field that accepts whatever was on the clipboard, the
   OS picker, and the eyedropper when the browser has one. */

const RECENT_KEY = "phoxta.designs.recentColours";
const RECENT_MAX = 10;

function readRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : null;
    return Array.isArray(list) ? list.filter((v): v is string => typeof v === "string").slice(0, RECENT_MAX) : [];
  } catch {
    // A private window, or site data blocked. Recents are a convenience; the
    // panel must not fail to render because one is unavailable.
    return [];
  }
}

function pushRecent(hex: string): string[] {
  const next = [hex, ...readRecent().filter((h) => h !== hex)].slice(0, RECENT_MAX);
  try { window.localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* see readRecent */ }
  return next;
}

/** `#abc`, `#aabbcc`, `aabbcc`, with or without surrounding rubbish from a
 *  paste. Returns null when there is no colour in there. */
function parseHex(input: string): string | null {
  const m = /#?([0-9a-f]{3}|[0-9a-f]{6})\b/i.exec(input.trim());
  if (!m) return null;
  const h = m[1].toLowerCase();
  return `#${h.length === 3 ? h.split("").map((c) => c + c).join("") : h}`;
}

type EyeDropperLike = { open: () => Promise<{ sRGBHex: string }> };

/** Feature-detected, never assumed: Firefox and Safari have no EyeDropper, and
 *  a button that throws is worse than a button that is not offered. */
function eyeDropper(): (new () => EyeDropperLike) | null {
  if (typeof window === "undefined" || !("EyeDropper" in window)) return null;
  return (window as unknown as { EyeDropper: new () => EyeDropperLike }).EyeDropper;
}

const ROLES: { role: PaintRole; label: string }[] = [
  { role: "accent", label: "Accent" },
  { role: "accentSoft", label: "Accent soft" },
  { role: "ink", label: "Ink" },
  { role: "canvas", label: "Canvas" },
  { role: "gradientFrom", label: "Gradient from" },
  { role: "gradientTo", label: "Gradient to" },
  { role: "white", label: "White" },
  { role: "black", label: "Black" },
];

const swatchOf = (role: PaintRole | undefined, palette: Palette): string => {
  const c = paint(role, palette);
  return c === "none" ? "repeating-conic-gradient(#c9ccd6 0 25%, #fff 0 50%) 50%/8px 8px" : c;
};

function Colour({ value, palette, onPick, allowNone, label }: {
  value: PaintRole | undefined;
  palette: Palette;
  onPick: (role: PaintRole) => void;
  allowNone?: boolean;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const wrap = useRef<HTMLSpanElement>(null);

  useEffect(() => { if (open) setRecent(readRecent()); }, [open]);

  // The rail scrolls and therefore clips. A popover opened from a field near
  // the bottom would be cut in half and the hex box — the last thing in it —
  // would be the part that got cut. Opening upward instead is measured against
  // the rail's own box rather than the window's, because the rail is what does
  // the clipping.
  useEffect(() => {
    const el = wrap.current;
    if (!open || !el) return;
    const rail = el.closest(".dsn-rail");
    const bottom = rail ? rail.getBoundingClientRect().bottom : window.innerHeight;
    setUp(bottom - el.getBoundingClientRect().bottom < 250);
  }, [open]);
  useEffect(() => { setDraft(paint(value, palette) === "none" ? "" : paint(value, palette)); }, [value, palette]);

  // Click-away rather than a backdrop: a backdrop would swallow the very next
  // click, which in a panel of small controls is a whole extra interaction.
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  const take = (role: PaintRole, remember?: string) => {
    onPick(role);
    if (remember) setRecent(pushRecent(remember));
  };

  const ED = eyeDropper();
  const hex = paint(value, palette);
  const isRole = typeof value === "string" && !value.startsWith("#");

  return (
    <span className="dsni-col" ref={wrap}>
      <button
        type="button" className="dsni-col__b" onClick={() => setOpen((o) => !o)}
        aria-expanded={open} aria-label={`${label} — ${isRole ? String(value) : hex}`}
        title={`${label}: ${isRole ? `${String(value)} (${hex})` : hex}`}
      >
        <i className="dsni-col__sw" style={{ background: swatchOf(value, palette) }} />
        <span className="dsni-col__t">{isRole ? String(value).replace(/([A-Z])/g, " $1").toLowerCase() : hex}</span>
      </button>

      {open && (
        <div className={`dsni-pop${up ? " is-up" : ""}`} role="dialog" aria-label={`${label} colour`}>
          <p className="dsni-pop__h">Brand</p>
          <div className="dsni-pop__sw">
            {ROLES.map((r) => (
              <button
                key={String(r.role)} type="button" title={`${r.label} — ${paint(r.role, palette)}`}
                aria-label={r.label}
                className={value === r.role ? "is-on" : ""}
                style={{ background: swatchOf(r.role, palette) }}
                onClick={() => { take(r.role); setOpen(false); }}
              />
            ))}
            {allowNone && (
              <button
                type="button" title="No colour" aria-label="No colour"
                className={value === "transparent" ? "is-on" : ""}
                style={{ background: swatchOf("transparent", palette) }}
                onClick={() => { take("transparent"); setOpen(false); }}
              />
            )}
          </div>

          {recent.length > 0 && (
            <>
              <p className="dsni-pop__h">Recent</p>
              <div className="dsni-pop__sw">
                {recent.map((h) => (
                  <button key={h} type="button" title={h} aria-label={h}
                          className={value === h ? "is-on" : ""}
                          style={{ background: h }}
                          onClick={() => { take(h, h); setOpen(false); }} />
                ))}
              </div>
            </>
          )}

          <p className="dsni-pop__h">Exact</p>
          <div className="dsni-pop__hex">
            <input
              type="color" aria-label={`${label} colour picker`}
              value={/^#[0-9a-f]{6}$/i.test(hex) ? hex : "#000000"}
              onChange={(e) => take(e.target.value, e.target.value)}
            />
            <input
              className="dsni-pop__in" aria-label={`${label} hex`} placeholder="#1c56fd"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") {
                  const h = parseHex(draft);
                  if (h) { take(h, h); setOpen(false); }
                } else if (e.key === "Escape") setOpen(false);
              }}
              onPaste={(e) => {
                const h = parseHex(e.clipboardData.getData("text"));
                if (!h) return;
                e.preventDefault();
                setDraft(h);
                take(h, h);
              }}
              onBlur={() => { const h = parseHex(draft); if (h) take(h, h); }}
            />
            {ED && (
              <button
                type="button" className="dsni-pop__eye" title="Pick a colour from the screen"
                aria-label="Pick a colour from the screen"
                onClick={async () => {
                  try {
                    const r = await new ED().open();
                    const h = parseHex(r.sRGBHex);
                    if (h) { take(h, h); setOpen(false); }
                  } catch { /* the picker was dismissed — nothing to report */ }
                }}
              >◎</button>
            )}
          </div>
          <p className="dsni-pop__f">
            A brand swatch stores the role, so changing the palette still reaches it.
            A hex is fixed.
          </p>
        </div>
      )}
    </span>
  );
}

/* ── The panel ───────────────────────────────────────────────────────────── */

export function Inspector(p: InspectorProps) {
  const chosen = p.layers.filter((l) => p.sel.includes(l.id));
  const one = chosen.length === 1 ? chosen[0] : null;

  // Which control is mid-interaction, so a run of changes from the same widget
  // is one undo step. Keyed by name and expiring, because a widget has no
  // pointerup to hang a "gesture ended" on when it is driven from the keyboard.
  const gesture = useRef<{ key: string; at: number }>({ key: "", at: 0 });
  const live = (key: string) => {
    const now = Date.now();
    const fresh = gesture.current.key !== key || now - gesture.current.at > 900;
    gesture.current = { key, at: now };
    return fresh;
  };

  /** Patch the one selected layer, saying explicitly whether to record. */
  const setAt = (patch: Partial<Layer>, record: boolean) =>
    one && p.onEdit((d) => updateLayer(d, one.id, patch), record);

  /** Patch every selected layer, saying explicitly whether to record. */
  const setAllAt = (patch: Partial<Layer>, record: boolean) =>
    p.onEdit((d) => chosen.reduce((acc, l) => updateLayer(acc, l.id, patch), d), record);

  /** Patch the one selected layer from a discrete control. */
  const set = (patch: Partial<Layer>, key = "set") => setAt(patch, live(key));

  /** Patch every selected layer — the properties several layers can share. */
  const setAll = (patch: Partial<Layer>, key = "setAll") => setAllAt(patch, live(key));

  const runOrder = (fn: (d: DesignDoc, id: string) => DesignDoc) =>
    p.onEdit((d) => chosen.reduce((acc, l) => fn(acc, l.id), d));

  /** Align to the PAGE, for every selected layer. Aligning several to each
   *  other is the toolbar's job and is a different verb. */
  const alignPage = (how: Parameters<typeof align>[2]) =>
    p.onEdit((d) => chosen.reduce((acc, l) => align(acc, l.id, how), d));

  /** Move the whole selection so its union box starts at x/y. */
  const moveUnionTo = (axis: "x" | "y", to: number) => {
    const x0 = Math.min(...chosen.map((l) => l.x));
    const y0 = Math.min(...chosen.map((l) => l.y));
    const base = Object.fromEntries(chosen.map((l) => [l.id, { x: l.x, y: l.y }]));
    const dx = axis === "x" ? to - x0 : 0;
    const dy = axis === "y" ? to - y0 : 0;
    p.onEdit((d) => moveMany(d, p.sel, base, dx, dy), live(`union-${axis}`));
  };

  const text = one?.type === "text" ? (one as TextLayer) : null;
  const rect = one?.type === "rect" ? (one as RectLayer) : null;
  const grad = one?.type === "gradient" ? (one as GradientLayer) : null;
  const image = one?.type === "image" ? (one as ImageLayer) : null;
  const chip = one?.type === "chip" ? (one as ChipLayer) : null;

  const runs = text ? toRuns(p.content[text.slot], text.accent) : [];
  const len = text ? lengthOf(p.content[text.slot]) : 0;
  const mark = (m: Mark) => text && p.onContent(toggleMark(runs, 0, len, m));
  const marked = (m: Mark) => (text ? hasMark(runs, 0, len, m) : false);

  const locked = chosen.length > 0 && chosen.every((l) => l.locked);
  const anyLocked = chosen.some((l) => l.locked);

  const shadow = one?.shadow;
  const setShadow = (patch: Partial<Shadow>, record: boolean) => {
    const base: Shadow = shadow ?? { dx: 0, dy: 12, blur: 24, color: "black", opacity: 0.3 };
    setAt({ shadow: { ...base, ...patch } } as Partial<Layer>, record);
  };

  /* ── Page, with nothing selected ─────────────────────────────────────── */
  if (!chosen.length) {
    return (
      <div className="dsni">
        <header className="dsni-head">
          <span className="dsni-head__k">Page</span>
          <span className="dsni-head__n">{p.templateName}</span>
        </header>

        <Sec title="Artboard">
          <Row label="Size"><span className="dsni-read">{CANVAS_W} × {CANVAS_H}</span></Row>
          <Row label="Exports"><span className="dsni-read">{CANVAS_W * 2} × {CANVAS_H * 2} PNG</span></Row>
          <Row label="Slides"><span className="dsni-read">{p.slideCount}</span></Row>
          <p className="dsni-note">
            Every layout in the pack is drawn at Instagram portrait, and snapping,
            the templates and the exporter all measure from it — so the artboard is
            one size on purpose rather than a preset that would only be honoured in
            some of those places.
          </p>
        </Sec>

        <Sec title="Palette" note="Roles, not colours, so a layer painted with “accent” follows whatever you set here.">
          {(["accent", "accentSoft", "ink", "canvas", "gradientFrom", "gradientTo"] as const).map((role) => (
            <Row key={role} label={role.replace(/([A-Z])/g, " $1").toLowerCase()}>
              <Colour
                label={role}
                value={p.palette[role]}
                palette={p.palette}
                onPick={(v) => p.onEdit((d) => ({
                  ...d,
                  palette: { ...(d.palette ?? {}), [role]: paint(v, p.palette) },
                }), live(`palette-${role}`))}
              />
            </Row>
          ))}
          <button type="button" className="dsni-btn" onClick={() => p.onEdit((d) => ({ ...d, palette: undefined }))}>
            Reset to the pack&rsquo;s colours
          </button>
        </Sec>

        <Sec title="Background">
          <p className="dsni-note">
            The bottom layer is the background. Select it to change its fill, its
            gradient or its photograph.
          </p>
          {p.layers[0] ? (
            <button type="button" className="dsni-btn" onClick={() => p.onSelect(p.layers[0].id)}>
              Select “{layerName(p.layers[0])}”
            </button>
          ) : (
            <p className="dsni-note">This slide has no layers yet.</p>
          )}
        </Sec>

        {p.layersSlot && <Sec title={`Layers (${p.layers.length})`}>{p.layersSlot}</Sec>}

        <p className="dsni-foot">Click a layer on the canvas to edit its properties here.</p>
      </div>
    );
  }

  /* ── Something is selected ───────────────────────────────────────────── */
  const many = chosen.length > 1;
  const lead = chosen[0];
  const box = {
    x: Math.min(...chosen.map((l) => l.x)),
    y: Math.min(...chosen.map((l) => l.y)),
    w: Math.max(...chosen.map((l) => l.x + l.w)) - Math.min(...chosen.map((l) => l.x)),
    h: Math.max(...chosen.map((l) => l.y + l.h)) - Math.min(...chosen.map((l) => l.y)),
  };

  return (
    <div className="dsni">
      <header className="dsni-head">
        <span className="dsni-head__k">{many ? "Selection" : lead.type}</span>
        <span className="dsni-head__n">{many ? `${chosen.length} layers` : layerName(lead)}</span>
        {anyLocked && <span className="dsni-head__lock" title="Locked layers cannot be dragged on the canvas">locked</span>}
      </header>

      {/* ── Type ─────────────────────────────────────────────────────── */}
      {text && (
        <Sec title="Type">
          <Row label="Font">
            <select
              className="dsni-sel" aria-label="Typeface"
              value={text.font ?? DEFAULT_FONT}
              onKeyDown={(e) => e.stopPropagation()}
              onChange={(e) => {
                const next = e.target.value;
                const f = fontNamed(next);
                // Snap the weight into the new family's range in the same edit.
                // Left alone, a 200 headline moved to PT Serif paints at 400 on
                // the canvas and 400 in the file, but the panel still says 200 —
                // and the next change would send it back.
                const w = f && !f.weights.includes(text.weight)
                  ? f.weights.reduce((a, b) => (Math.abs(b - text.weight) < Math.abs(a - text.weight) ? b : a))
                  : text.weight;
                set({ font: next === DEFAULT_FONT ? undefined : next, weight: w } as Partial<Layer>, "font");
              }}
            >
              {DESIGN_FONTS.map((f) => (
                <option key={f.name} value={f.name}>{f.name}</option>
              ))}
            </select>
          </Row>

          <Row label="Size">
            <Num value={Math.round(text.size)} min={4} max={400} suffix="px" ariaLabel="Font size"
                 onCommit={(v) => set({ size: v } as Partial<Layer>, "size")} />
            <span className="dsni-icons">
              <button type="button" className="dsni-ico" title="A step smaller" aria-label="A step smaller"
                      onClick={() => set({ size: Math.max(4, Math.round(text.size / 1.125)) } as Partial<Layer>, "size-step")}>−</button>
              <button type="button" className="dsni-ico" title="A step larger" aria-label="A step larger"
                      onClick={() => set({ size: Math.min(400, Math.round(text.size * 1.125)) } as Partial<Layer>, "size-step")}>+</button>
            </span>
          </Row>

          <Row label="Weight">
            <select
              className="dsni-sel" aria-label="Font weight" value={text.weight}
              onKeyDown={(e) => e.stopPropagation()}
              onChange={(e) => set({ weight: Number(e.target.value) } as Partial<Layer>, "weight")}
            >
              {(fontNamed(text.font)?.weights ?? [400, 500, 600, 700]).map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </Row>

          <Row label="Style" hint="Applies to every word in this layer. Select words on the canvas to style part of it.">
            <span className="dsni-icons">
              {([["bold", D.bold, "Bold"], ["italic", D.italic, "Italic"],
                 ["underline", D.under, "Underline"], ["strike", D.strike, "Strikethrough"]] as const).map(([m, d, t]) => (
                <button key={m} type="button" title={t} aria-label={t} aria-pressed={marked(m)}
                        className={`dsni-ico${marked(m) ? " is-on" : ""}`}
                        onClick={() => mark(m)}><Icon d={d} /></button>
              ))}
            </span>
          </Row>

          <Row label="Colour">
            <Colour label="Text colour" value={text.fill} palette={p.palette}
                    onPick={(v) => set({ fill: v } as Partial<Layer>, "fill")} />
          </Row>
          <Row label="Accent" hint="Words wrapped in *asterisks* paint in this colour.">
            <Colour label="Accent colour" value={text.accent} palette={p.palette}
                    onPick={(v) => set({ accent: v } as Partial<Layer>, "accent")} />
          </Row>

          <Row label="Align">
            <Seg
              ariaLabel="Horizontal alignment"
              value={text.align ?? "left"}
              options={[{ v: "left", label: "◧", title: "Left" }, { v: "center", label: "▣", title: "Centre" }, { v: "right", label: "◨", title: "Right" }]}
              onPick={(v) => set({ align: v } as Partial<Layer>, "align")}
            />
            <Seg
              ariaLabel="Vertical alignment"
              value={text.valign ?? "top"}
              options={[{ v: "top", label: "⬒", title: "Top" }, { v: "middle", label: "⬓", title: "Middle" }, { v: "bottom", label: "⬔", title: "Bottom" }]}
              onPick={(v) => set({ valign: v } as Partial<Layer>, "valign")}
            />
          </Row>

          <Row label="Line height">
            <Num value={text.lineHeight} step={0.05} min={0.6} max={4} ariaLabel="Line height"
                 onCommit={(v) => set({ lineHeight: v } as Partial<Layer>, "lineHeight")} />
          </Row>
          <Row label="Letter spacing">
            <Num value={text.tracking} step={0.5} min={-40} max={80} suffix="px" ariaLabel="Letter spacing"
                 onCommit={(v) => set({ tracking: v } as Partial<Layer>, "tracking")} />
          </Row>

          <Row label="Case">
            <Seg
              ariaLabel="Text transform"
              value={text.uppercase ? "upper" : text.capitalize ? "title" : "none"}
              options={[{ v: "none", label: "Aa", title: "As typed" }, { v: "upper", label: "AA", title: "UPPERCASE" }, { v: "title", label: "Ab", title: "Title Case" }]}
              onPick={(v) => set({
                uppercase: v === "upper" || undefined,
                capitalize: v === "title" || undefined,
              } as Partial<Layer>, "case")}
            />
          </Row>

          <button type="button" className="dsni-btn" onClick={p.onEditText} disabled={text.locked}
                  title={text.locked ? "Unlock this layer to write in it" : undefined}>
            Write in this text
          </button>
        </Sec>
      )}

      {/* ── Shape ────────────────────────────────────────────────────────
          The kind is changed in place rather than by deleting and re-adding,
          so the box, colours, rotation and shadow already arranged survive the
          change — swapping a rectangle for an ellipse should keep everything
          about it except the outline. */}
      {rect && (
        <Sec title="Shape">
          <div className="dsni-shapes" role="radiogroup" aria-label="Shape">
            {SHAPE_KINDS.map(({ kind, label }) => (
              <button
                key={kind} type="button" role="radio" title={label}
                aria-checked={(rect.shape ?? "rect") === kind}
                aria-label={label}
                className={`dsni-shapes__b${(rect.shape ?? "rect") === kind ? " is-on" : ""}`}
                onClick={() => set({
                  // "rect" is the absent value, so choosing it clears the field
                  // rather than writing the string — that keeps a plain
                  // rectangle byte-identical to one saved before shapes existed.
                  shape: kind === "rect" ? undefined : kind,
                  // A star with no points saved would paint as the default five
                  // and then show empty spinners; give it its numbers on arrival.
                  ...(kind === "star" && rect.points == null ? { points: 5, innerRatio: 0.42 } : {}),
                  // A line has nothing to fill, so without a stroke it would
                  // vanish the moment it was chosen and read as a broken button.
                  ...(kind === "line" && !rect.strokeColor ? { strokeColor: rect.fill, strokeWidth: rect.strokeWidth || 8 } : {}),
                } as Partial<Layer>, "shape")}
              >
                <ShapeGlyph kind={kind} size={22} />
              </button>
            ))}
          </div>
          {rect.shape === "star" && (
            <>
              <Row label="Points">
                <Num value={rect.points ?? 5} min={3} max={20} ariaLabel="Star points"
                     onCommit={(v) => set({ points: v } as Partial<Layer>, "points")} />
              </Row>
              <Row label="Depth">
                <Slide value={Math.round((rect.innerRatio ?? 0.42) * 100)} min={10} max={90} suffix="%"
                       ariaLabel="Star depth"
                       onChange={(v, rec) => setAt({ innerRatio: v / 100 } as Partial<Layer>, rec)} />
              </Row>
            </>
          )}
        </Sec>
      )}

      {/* ── Fill and stroke ──────────────────────────────────────────── */}
      {rect && (
        <Sec title="Fill &amp; stroke">
          <Row label="Fill">
            <Colour label="Fill" value={rect.fill} palette={p.palette} allowNone
                    onPick={(v) => set({ fill: v } as Partial<Layer>, "fill")} />
          </Row>
          <Row label="Fill opacity">
            <Slide value={Math.round((rect.opacity ?? 1) * 100)} min={0} max={100} suffix="%"
                   ariaLabel="Fill opacity"
                   onChange={(v, rec) => setAt({ opacity: v / 100 } as Partial<Layer>, rec)} />
          </Row>
          <Row label="Stroke">
            <Colour label="Stroke" value={rect.strokeColor} palette={p.palette} allowNone
                    onPick={(v) => set({ strokeColor: v, strokeWidth: rect.strokeWidth || 2 } as Partial<Layer>, "stroke")} />
          </Row>
          <Row label="Width">
            <Num value={rect.strokeWidth ?? 0} min={0} max={120} suffix="px" ariaLabel="Stroke width"
                 disabled={!rect.strokeColor}
                 title={rect.strokeColor ? undefined : "Give the stroke a colour first"}
                 onCommit={(v) => set({ strokeWidth: v } as Partial<Layer>, "strokeW")} />
          </Row>
          <Row label="Line">
            <Seg
              ariaLabel="Stroke style"
              value={rect.strokeDash ? "dashed" : "solid"}
              options={[{ v: "solid", label: "Solid" }, { v: "dashed", label: "Dashed" }]}
              onPick={(v) => set({ strokeDash: v === "dashed" ? (rect.strokeDash || 14) : undefined } as Partial<Layer>, "dash")}
            />
          </Row>
          {rect.strokeDash != null && (
            <Row label="Dash">
              <Num value={rect.strokeDash} min={2} max={80} suffix="px" ariaLabel="Dash length"
                   onCommit={(v) => set({ strokeDash: v } as Partial<Layer>, "dashLen")} />
            </Row>
          )}
          {/* Corners belong to rectangles. A rounded pentagon is a different
              shape rather than a softer one, so the control is hidden instead
              of shown doing nothing. */}
          {ROUNDABLE.has(rect.shape ?? "rect") && (() => {
            const cap = Math.round(Math.min(rect.w, rect.h) / 2);
            const uneven = rect.radii != null;
            const four: Corners = rect.radii ?? [rect.radius ?? 0, rect.radius ?? 0, rect.radius ?? 0, rect.radius ?? 0];
            const setCorner = (i: number, v: number) => {
              const next = [...four] as Corners;
              next[i] = v;
              set({ radii: next } as Partial<Layer>, `corner${i}`);
            };
            return (
              <>
                <Row label="Corner">
                  <Num
                    value={Math.round(uneven ? Math.max(...four) : (rect.radius ?? 0))} min={0} max={cap}
                    suffix="px" ariaLabel="Corner radius" disabled={uneven}
                    title={uneven ? "Corners are set individually" : undefined}
                    onCommit={(v) => set({ radius: v } as Partial<Layer>, "radius")}
                  />
                  <button
                    type="button"
                    className={`dsni-mini${uneven ? " is-on" : ""}`}
                    title={uneven ? "Use one radius for all four corners" : "Set each corner separately"}
                    aria-pressed={uneven}
                    // Switching back collapses to the largest of the four rather
                    // than to whatever `radius` held before — that number is
                    // stale by then, and restoring it would silently undo the
                    // corner work the user just did.
                    onClick={() => set(
                      uneven
                        ? { radii: undefined, radius: Math.round(Math.max(...four)) } as Partial<Layer>
                        : { radii: four } as Partial<Layer>,
                      "cornerMode",
                    )}
                  >{uneven ? "One" : "Each"}</button>
                </Row>
                {uneven && (
                  <div className="dsni-corners">
                    {(["Top left", "Top right", "Bottom right", "Bottom left"] as const).map((label, i) => (
                      <Num
                        key={label} value={Math.round(four[i])} min={0} max={cap} suffix="px" ariaLabel={label}
                        title={label} onCommit={(v) => setCorner(i, v)}
                      />
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </Sec>
      )}

      {grad && (
        <Sec title="Gradient">
          <Row label="From">
            <Colour label="Gradient from" value={grad.from} palette={p.palette}
                    onPick={(v) => set({ from: v } as Partial<Layer>, "from")} />
          </Row>
          <Row label="To">
            <Colour label="Gradient to" value={grad.to} palette={p.palette}
                    onPick={(v) => set({ to: v } as Partial<Layer>, "to")} />
          </Row>
          <Row label="Angle">
            <Slide value={grad.angle} min={0} max={360} suffix="°" ariaLabel="Gradient angle"
                   onChange={(v, rec) => setAt({ angle: v } as Partial<Layer>, rec)} />
          </Row>
          <Row label="Corner">
            <Num value={Math.round(grad.radius ?? 0)} min={0} max={Math.round(Math.min(grad.w, grad.h) / 2)}
                 suffix="px" ariaLabel="Corner radius"
                 onCommit={(v) => set({ radius: v } as Partial<Layer>, "radius")} />
          </Row>
        </Sec>
      )}

      {chip && (
        <Sec title="Chip">
          <Row label="Fill">
            <Colour label="Chip fill" value={chip.fill} palette={p.palette} allowNone
                    onPick={(v) => set({ fill: v } as Partial<Layer>, "fill")} />
          </Row>
          <Row label="Label">
            <Colour label="Chip label colour" value={chip.color} palette={p.palette}
                    onPick={(v) => set({ color: v } as Partial<Layer>, "color")} />
          </Row>
          <Row label="Border">
            <Colour label="Chip border" value={chip.borderColor} palette={p.palette} allowNone
                    onPick={(v) => set({ borderColor: v, borderWidth: chip.borderWidth || 2 } as Partial<Layer>, "border")} />
          </Row>
          <Row label="Border width">
            <Num value={chip.borderWidth ?? 0} min={0} max={20} suffix="px" ariaLabel="Border width"
                 disabled={!chip.borderColor} title={chip.borderColor ? undefined : "Give the border a colour first"}
                 onCommit={(v) => set({ borderWidth: v } as Partial<Layer>, "borderW")} />
          </Row>
          <Row label="Corner">
            <Num value={Math.round(chip.radius)} min={0} max={Math.round(chip.h / 2)} suffix="px" ariaLabel="Corner radius"
                 onCommit={(v) => set({ radius: v } as Partial<Layer>, "radius")} />
          </Row>
          <Row label="Size">
            <Num value={Math.round(chip.size)} min={6} max={200} suffix="px" ariaLabel="Label size"
                 onCommit={(v) => set({ size: v } as Partial<Layer>, "size")} />
          </Row>
          <Row label="Weight">
            <select className="dsni-sel" aria-label="Label weight" value={chip.weight}
                    onKeyDown={(e) => e.stopPropagation()}
                    onChange={(e) => set({ weight: Number(e.target.value) } as Partial<Layer>, "weight")}>
              {[300, 400, 500, 600, 700, 800].map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          </Row>
          <p className="dsni-note">
            A chip is one line by definition. Its label is set in the pack&rsquo;s own
            face — the renderer draws chips in Plus Jakarta Sans whatever the
            layer says, so there is no typeface control here rather than one that
            would be ignored in the file.
          </p>
        </Sec>
      )}

      {one?.type === "asset" && (
        <Sec title="Artwork">
          <Row label="Opacity">
            <Slide value={Math.round((one.opacity ?? 1) * 100)} min={0} max={100} suffix="%"
                   ariaLabel="Artwork opacity"
                   onChange={(v, rec) => setAt({ opacity: v / 100 } as Partial<Layer>, rec)} />
          </Row>
          <p className="dsni-note">
            The pack&rsquo;s artwork already follows your brand colours — it is recoloured
            from the palette above when the design loads. There is no per-piece tint
            here rather than a swatch that would change nothing in the file.
          </p>
        </Sec>
      )}

      {/* ── Photograph ───────────────────────────────────────────────── */}
      {image && (
        <Sec title="Photo">
          <div className="dsni-btns">
            <button type="button" className="dsni-btn" onClick={p.onPickImage} disabled={image.locked}>
              {p.doc.images[image.slot] ? "Replace photo" : "Choose a photo"}
            </button>
            {/* SEAM — the asset library's own entry point lands here. */}
            {p.assetActions}
          </div>

          <Row label="Fit">
            <Seg
              ariaLabel="How the photo fills its frame"
              value={image.fit ?? "cover"}
              options={[{ v: "cover", label: "Fill", title: "Crop to fill the frame" }, { v: "contain", label: "Fit", title: "Fit the whole photo inside" }]}
              onPick={(v) => set({ fit: v } as Partial<Layer>, "fit")}
            />
          </Row>
          <Row label="Zoom">
            <Slide value={Math.round((image.zoom ?? 1) * 100)} min={100} max={400} suffix="%" ariaLabel="Photo zoom"
                   onChange={(v, rec) => setAt({ zoom: v / 100 } as Partial<Layer>, rec)} />
          </Row>
          <Row label="Pan X">
            <Slide value={Math.round((image.panX ?? 0) * 100)} min={-50} max={50} suffix="%" ariaLabel="Photo pan across"
                   onChange={(v, rec) => setAt({ panX: v / 100 } as Partial<Layer>, rec)} />
          </Row>
          <Row label="Pan Y">
            <Slide value={Math.round((image.panY ?? 0) * 100)} min={-50} max={50} suffix="%" ariaLabel="Photo pan down"
                   onChange={(v, rec) => setAt({ panY: v / 100 } as Partial<Layer>, rec)} />
          </Row>
          <Row label="Corner">
            <Num value={Math.round(image.radius ?? 0)} min={0} max={Math.round(Math.min(image.w, image.h) / 2)}
                 suffix="px" ariaLabel="Corner radius"
                 onCommit={(v) => set({ radius: v } as Partial<Layer>, "radius")} />
          </Row>

          {/* SEAM — "Remove background" goes here. See "Integration seams". */}
          <div className="dsni-seam">
            <span className="dsni-seam__k">Background</span>
            {p.imageActions ?? (
              <button type="button" className="dsni-btn" disabled
                      title="Background removal is being wired up in its own module — it will appear here.">
                Remove background
              </button>
            )}
          </div>
        </Sec>
      )}

      {/* ── Position and size ────────────────────────────────────────── */}
      <Sec title="Position &amp; size">
        <div className="dsni-grid">
          <label className="dsni-cell"><span>X</span>
            <Num value={Math.round(box.x)} min={-CANVAS_W} max={CANVAS_W * 2} ariaLabel="X position"
                 onCommit={(v) => (many ? moveUnionTo("x", v) : set({ x: v }, "x"))} />
          </label>
          <label className="dsni-cell"><span>Y</span>
            <Num value={Math.round(box.y)} min={-CANVAS_H} max={CANVAS_H * 2} ariaLabel="Y position"
                 onCommit={(v) => (many ? moveUnionTo("y", v) : set({ y: v }, "y"))} />
          </label>
          <label className="dsni-cell"><span>W</span>
            <Num value={Math.round(box.w)} min={12} max={CANVAS_W * 2} ariaLabel="Width"
                 disabled={many} title={many ? "Pull a corner on the canvas to scale several layers together" : undefined}
                 onCommit={(v) => set({ w: v }, "w")} />
          </label>
          <label className="dsni-cell"><span>H</span>
            <Num value={Math.round(box.h)} min={12} max={CANVAS_H * 2} ariaLabel="Height"
                 disabled={many} title={many ? "Pull a corner on the canvas to scale several layers together" : undefined}
                 onCommit={(v) => set({ h: v }, "h")} />
          </label>
        </div>

        <Row label="Rotation">
          <Num value={Math.round(one?.rotation ?? 0)} min={-360} max={360} step={1} suffix="°" ariaLabel="Rotation"
               disabled={many} title={many ? "Rotate one layer at a time — a group has no single centre to turn about" : undefined}
               onCommit={(v) => set({ rotation: ((v % 360) + 360) % 360 || undefined }, "rot")} />
          <button type="button" className="dsni-ico" title="Reset rotation" aria-label="Reset rotation"
                  disabled={many} onClick={() => set({ rotation: undefined }, "rot-reset")}>0°</button>
        </Row>

        <Row label="Flip">
          <span className="dsni-icons">
            <button type="button" className={`dsni-ico${chosen.every((l) => l.flipH) ? " is-on" : ""}`}
                    title="Flip horizontally" aria-label="Flip horizontally"
                    aria-pressed={chosen.every((l) => l.flipH)}
                    onClick={() => setAll({ flipH: !chosen.every((l) => l.flipH) || undefined }, "flipH")}>⇄</button>
            <button type="button" className={`dsni-ico${chosen.every((l) => l.flipV) ? " is-on" : ""}`}
                    title="Flip vertically" aria-label="Flip vertically"
                    aria-pressed={chosen.every((l) => l.flipV)}
                    onClick={() => setAll({ flipV: !chosen.every((l) => l.flipV) || undefined }, "flipV")}>⇅</button>
          </span>
        </Row>

        <Row label="Align to page">
          <span className="dsni-icons">
            {([["left", "⇤", "Left edge"], ["hcentre", "⇔", "Horizontal centre"], ["right", "⇥", "Right edge"],
               ["top", "⇡", "Top edge"], ["vcentre", "⇕", "Vertical centre"], ["bottom", "⇣", "Bottom edge"]] as const).map(([how, g, t]) => (
              <button key={how} type="button" className="dsni-ico" title={t} aria-label={t}
                      onClick={() => alignPage(how)}>{g}</button>
            ))}
          </span>
        </Row>
      </Sec>

      {/* ── Appearance ───────────────────────────────────────────────── */}
      <Sec title="Appearance">
        <Row label="Opacity">
          <Slide value={Math.round((one?.alpha ?? 1) * 100)} min={0} max={100} suffix="%" ariaLabel="Layer opacity"
                 onChange={(v, rec) => setAllAt({ alpha: v / 100 }, rec)} />
        </Row>

        <Row label="Shadow" hint="Rendered as an SVG drop shadow, which is what makes it survive the export.">
          <button
            type="button" className={`dsni-ico${shadow ? " is-on" : ""}`}
            aria-pressed={Boolean(shadow)} title={shadow ? "Remove the shadow" : "Add a shadow"}
            aria-label={shadow ? "Remove the shadow" : "Add a shadow"}
            disabled={many}
            onClick={() => set({ shadow: shadow ? undefined : { dx: 0, dy: 14, blur: 28, color: "black", opacity: 0.3 } } as Partial<Layer>, "shadow")}
          ><Icon d={D.drop} /></button>
          {many && <span className="dsni-read">one layer at a time</span>}
        </Row>

        {shadow && !many && (
          <>
            <Row label="Offset X">
              <Num value={shadow.dx} min={-200} max={200} suffix="px" ariaLabel="Shadow offset across"
                   onCommit={(v) => setShadow({ dx: v }, live("shdx"))} />
            </Row>
            <Row label="Offset Y">
              <Num value={shadow.dy} min={-200} max={200} suffix="px" ariaLabel="Shadow offset down"
                   onCommit={(v) => setShadow({ dy: v }, live("shdy"))} />
            </Row>
            <Row label="Blur">
              <Num value={shadow.blur} min={0} max={200} suffix="px" ariaLabel="Shadow blur"
                   onCommit={(v) => setShadow({ blur: v }, live("shblur"))} />
            </Row>
            <Row label="Colour">
              <Colour label="Shadow colour" value={shadow.color} palette={p.palette}
                      onPick={(v) => setShadow({ color: v }, live("shcol"))} />
            </Row>
            <Row label="Strength">
              <Slide value={Math.round((shadow.opacity ?? 0.35) * 100)} min={0} max={100} suffix="%"
                     ariaLabel="Shadow strength"
                     onChange={(v, rec) => setShadow({ opacity: v / 100 }, rec)} />
            </Row>
          </>
        )}
      </Sec>

      {/* ── Arrange ──────────────────────────────────────────────────── */}
      <Sec title="Arrange">
        <Row label="Order">
          <span className="dsni-icons">
            <button type="button" className="dsni-ico" title="Bring to front" aria-label="Bring to front"
                    onClick={() => runOrder(bringToFront)}>⤒</button>
            <button type="button" className="dsni-ico" title="Forward ( ] )" aria-label="Bring forward"
                    onClick={() => runOrder(bringForward)}>↑</button>
            <button type="button" className="dsni-ico" title="Backward ( [ )" aria-label="Send backward"
                    onClick={() => runOrder(sendBackward)}>↓</button>
            <button type="button" className="dsni-ico" title="Send to back" aria-label="Send to back"
                    onClick={() => runOrder(sendToBack)}>⤓</button>
          </span>
        </Row>

        <Row label="Lock" hint="A locked layer stays put when you drag across the canvas.">
          <Seg
            ariaLabel="Lock"
            value={locked ? "on" : "off"}
            options={[{ v: "off", label: "Unlocked" }, { v: "on", label: "Locked" }]}
            onPick={(v) => p.onEdit((d) => chosen.reduce(
              (acc, l) => (Boolean(l.locked) === (v === "on") ? acc : toggle(acc, l.id, "locked")), d,
            ))}
          />
        </Row>

        <Row label="Visible">
          <Seg
            ariaLabel="Visibility"
            value={chosen.every((l) => l.hidden) ? "off" : "on"}
            options={[{ v: "on", label: "Shown" }, { v: "off", label: "Hidden" }]}
            onPick={(v) => p.onEdit((d) => chosen.reduce(
              (acc, l) => (Boolean(l.hidden) === (v === "off") ? acc : toggle(acc, l.id, "hidden")), d,
            ))}
          />
        </Row>

        <div className="dsni-btns">
          <button type="button" className="dsni-btn" onClick={() => p.onCommand("duplicate")}>Duplicate</button>
          <button type="button" className="dsni-btn is-danger" onClick={() => p.onCommand("delete")}>Delete</button>
        </div>
      </Sec>

      {p.layersSlot && <Sec title={`Layers (${p.layers.length})`}>{p.layersSlot}</Sec>}
    </div>
  );
}
