/**
 * The design document.
 *
 * THE SPLIT THAT MAKES THIS WORK: a template is layout, a design is content.
 *
 * Templates live in code as declarative layer lists — geometry, type, colour,
 * which asset goes where. A saved design holds only what the owner changed:
 * the words, the photographs, and any palette override. So a design row is a
 * few hundred bytes rather than a serialised canvas, and fixing a template's
 * kerning fixes it for every design already made from it instead of freezing
 * the mistake into a thousand copies.
 *
 * It also means the AI and the manual editor write to exactly the same place.
 * There is no "AI version" of a design and no separate import path — the
 * generator fills the same `content` map a human types into, which is why a
 * generated post can be hand-edited immediately and a hand-made one can be
 * regenerated without losing the photograph.
 *
 * Geometry is absolute, in template pixels (1080×1350). Everything scales from
 * one transform at render time, so the editor, the thumbnail and the exported
 * PNG are the same layout at different sizes rather than three layouts.
 */

/** Every template is Instagram portrait. The Figma pack is drawn at this size. */
export const CANVAS_W = 1080;
export const CANVAS_H = 1350;

export type Rgb = string;

/**
 * A palette a design can override.
 *
 * Named by role, not by colour, so a tenant's brand can be swapped in without
 * knowing which template it is going to land on.
 */
export type Palette = {
  /** Page ground on the light templates. */
  canvas: Rgb;
  /** Deep navy — headings on light, card fills on both. */
  ink: Rgb;
  /** The one saturated blue. Accent words, badges, buttons. */
  accent: Rgb;
  /** Lighter blue used for the oversized statistic on dark grounds. */
  accentSoft: Rgb;
  /** The two stops of the brand gradient, on the dark templates. */
  gradientFrom: Rgb;
  gradientTo: Rgb;
};

/** The Figma file's own palette, and the default for every template. */
export const DEFAULT_PALETTE: Palette = {
  canvas: "#ffffff",
  ink: "#14194e",
  accent: "#1c56fd",
  accentSoft: "#6297f9",
  gradientFrom: "#1b44c1",
  gradientTo: "#689fff",
};

/** Which palette role a layer paints with. Resolved at render, so a palette
 *  override reaches every layer without the template naming hex twice. */
export type PaintRole = keyof Palette | "white" | "black" | "transparent";

export type TextSlot =
  | "title" | "subtitle" | "description" | "statistic"
  | "testimonial" | "quote" | "cta" | "phone" | "website"
  | "point1" | "point2" | "point3" | "score";

export type ImageSlot = "image1" | "image2" | "image3";

type Base = {
  id: string;
  /** Shown in the layers panel. Falls back to the layer's kind and slot. */
  name?: string;
  x: number; y: number; w: number; h: number;
  /** Locked layers are skipped by click and drag — the backgrounds mostly, so
   *  dragging across a design does not pick the canvas up by mistake. */
  locked?: boolean;
  hidden?: boolean;
};

/** A flat fill — backgrounds and solid cards. */
export type RectLayer = Base & {
  type: "rect";
  fill: PaintRole;
  radius?: number;
};

/** The brand gradient, at the Figma file's own angle. */
export type GradientLayer = Base & {
  type: "gradient";
  from: PaintRole;
  to: PaintRole;
  /** CSS gradient angle in degrees, as Figma exported it. */
  angle: number;
  radius?: number;
};

/**
 * A vector exported from the Figma file.
 *
 * Never redrawn by hand — these are the pack's decorative identity, and an
 * approximation of a shape is a different shape. `src` is a path under
 * /assets/designs, committed rather than hot-linked, because the Figma asset
 * URLs expire after a week.
 */
export type AssetLayer = Base & {
  type: "asset";
  src: string;
  /** Painted patterns follow the palette; already-coloured art does not. */
  tint?: PaintRole;
  opacity?: number;
};

/** A photograph slot. `mask` is an exported vector the photo is clipped to. */
export type ImageLayer = Base & {
  type: "image";
  slot: ImageSlot;
  radius?: number;
  /** An exported shape that clips the photo — the blobs and circles. */
  mask?: string;
  /** Drawn under the photo, so a slot with no photo yet is still a shape. */
  plate?: PaintRole;
};

export type TextLayer = Base & {
  type: "text";
  slot: TextSlot;
  size: number;
  weight: 500 | 600 | 700;
  fill: PaintRole;
  /** Multiplier, as Figma reports it. */
  lineHeight: number;
  /** Absolute px, negative in this pack. */
  tracking: number;
  align?: "left" | "center" | "right";
  uppercase?: boolean;
  capitalize?: boolean;
  /** Words wrapped in *asterisks* paint in this role — the pack's two-tone
   *  headline. A plain string with no asterisks renders in `fill`, so the
   *  feature costs nothing when it is not used. */
  accent?: PaintRole;
};

/** A rounded label — the chips and the CTA button. */
export type ChipLayer = Base & {
  type: "chip";
  slot: TextSlot;
  size: number;
  weight: 500 | 600 | 700;
  fill: PaintRole;
  /** Chips on the dark templates are a white wash rather than a solid. */
  fillAlpha?: number;
  color: PaintRole;
  radius: number;
  borderColor?: PaintRole;
  borderWidth?: number;
  /** An exported icon, drawn at the left of the chip. */
  icon?: string;
  iconSize?: number;
  /** A gradient CTA rather than a flat one. */
  gradient?: { from: PaintRole; to: PaintRole; angle: number };
  align?: "left" | "center";
};

export type Layer = RectLayer | GradientLayer | AssetLayer | ImageLayer | TextLayer | ChipLayer;

export type Template = {
  id: string;
  name: string;
  /** What this layout is for, shown in the picker and given to the model so it
   *  writes copy that fits the shape rather than copy that has to be cut. */
  purpose: string;
  /** Layers in paint order: first is furthest back. */
  layers: Layer[];
  /** Starting copy — the Figma file's own placeholder text. */
  content: Partial<Record<TextSlot, string>>;
  /** What each photo slot should show, in words. Seeds the Pexels search when
   *  a design is generated, so slot 2 does not get slot 1's picture. */
  imageHints: Partial<Record<ImageSlot, string>>;
};

/** A photograph placed in a slot, with the credit its licence requires. */
export type PlacedImage = {
  url: string;
  alt?: string;
  photographer?: string;
  photographerUrl?: string;
  source?: "pexels" | "upload";
};

/**
 * What a saved design actually is.
 *
 * `layers` is the change that turns this from a fill-in-the-blanks template
 * into a design tool. Once anything is moved, resized, reordered, added or
 * deleted, the document owns its own layer list and the template is only where
 * it started — which is what every design tool does, and the only honest way to
 * support "move this and send it behind that".
 *
 * The cost is real and worth naming: a design that owns its layers no longer
 * inherits template fixes. That trade was made deliberately. A tool that
 * silently re-flowed someone's hand-placed artwork because the template changed
 * underneath them would be worse than one that does not.
 *
 * Documents saved before this keep `layers` undefined and fall back to the
 * template, so nothing already made had to be migrated.
 */
export type DesignDoc = {
  templateId: string;
  layers?: Layer[];
  content: Partial<Record<TextSlot, string>>;
  images: Partial<Record<ImageSlot, PlacedImage>>;
  /** Only the roles that differ from the template's default. */
  palette?: Partial<Palette>;
};

export const emptyDoc = (templateId: string): DesignDoc => ({
  templateId,
  content: {},
  images: {},
});

/** The palette a design actually paints with. */
export function resolvePalette(doc: DesignDoc): Palette {
  return { ...DEFAULT_PALETTE, ...(doc.palette ?? {}) };
}

/** Resolve a paint role to a colour. */
export function paint(role: PaintRole | undefined, palette: Palette): string {
  if (!role || role === "transparent") return "none";
  if (role === "white") return "#ffffff";
  if (role === "black") return "#000000";
  return palette[role];
}
