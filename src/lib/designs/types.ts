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

/**
 * The artboard sizes a document can be.
 *
 * Portrait is the pack's native size and the default — every template is drawn
 * at 1080×1350 and every document saved before formats existed is one, which is
 * why `DesignDoc.format` is optional and absent means portrait. The other two
 * are the sizes the platforms actually take: square for feed posts everywhere,
 * story for the 9:16 surfaces.
 *
 * The renderer, the exporter and the rasterisers all derive the artboard from
 * the DOCUMENT via `formatDims` rather than from the constants above, so a
 * square document is square on every surface at once — the constants stay for
 * the template pack (drawn portrait, always) and for callers that predate
 * formats.
 */
export type DesignFormat = "portrait" | "square" | "story";

export function formatDims(f?: DesignFormat): { w: number; h: number } {
  if (f === "square") return { w: 1080, h: 1080 };
  if (f === "story") return { w: 1080, h: 1920 };
  return { w: CANVAS_W, h: CANVAS_H };
}

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

/**
 * What a layer paints with.
 *
 * A palette role where the colour is one of the template's brand colours, so an
 * override reaches it; a literal `#rrggbb` otherwise. The pack has one-off
 * colours — a lime highlight, a pale card tint — that are not brand roles and
 * should not move when someone changes their accent, so they stay literal.
 */
export type PaintRole = keyof Palette | "white" | "black" | "transparent" | (string & {});

/**
 * The typefaces a design may be set in.
 *
 * ONE LIST, THREE CONSUMERS, OR THE FILE LIES. The editor measures and paints
 * with whatever the page has loaded; the exporter inlines @font-face rules into
 * the serialised SVG because a rasterised document cannot reach the page's
 * fonts. If those two lists disagree, a headline set in PT Serif looks right on
 * the canvas and comes out of the exporter in the rasteriser's default face —
 * a difference that only appears in the file the customer posts.
 *
 * So `query` is the literal Google `css2?family=` fragment, and it is used by
 * BOTH `designs.css` (which loads the face for the editor) and `export.ts`
 * (which inlines it for the file). Adding a family means adding it here and
 * adding the matching `@import` line to designs.css — the comment there says
 * so, and says why.
 *
 * `weights` is what the Inspector offers, and every one of them is inside the
 * range `query` asks for. Offering a weight the query does not load would show
 * a synthesised bold on the canvas and a real one in the file, or the reverse.
 */
export type DesignFont = {
  /** As written into a layer's `font`, and into the CSS font stack. */
  name: string;
  /** The css2 `family=` query fragment. */
  query: string;
  weights: number[];
  /** A true italic face exists, rather than a synthesised slant. */
  italic: boolean;
};

export const DESIGN_FONTS: DesignFont[] = [
  { name: "Plus Jakarta Sans", query: "Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800", weights: [200, 300, 400, 500, 600, 700, 800], italic: true },
  { name: "DM Sans", query: "DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000", weights: [300, 400, 500, 600, 700, 800, 900], italic: true },
  { name: "Mona Sans", query: "Mona+Sans:ital,wght@0,200..900;1,200..900", weights: [200, 300, 400, 500, 600, 700, 800, 900], italic: true },
  { name: "Poppins", query: "Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400;1,500;1,600;1,700;1,800", weights: [300, 400, 500, 600, 700, 800], italic: true },
  { name: "Inter", query: "Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900", weights: [300, 400, 500, 600, 700, 800, 900], italic: true },
  { name: "PT Serif", query: "PT+Serif:ital,wght@0,400;0,700;1,400;1,700", weights: [400, 700], italic: true },
];

/** The face a layer with no `font` of its own paints in. */
export const DEFAULT_FONT = "Plus Jakarta Sans";

export const fontNamed = (name?: string): DesignFont | undefined =>
  DESIGN_FONTS.find((f) => f.name === (name ?? DEFAULT_FONT));

/**
 * A drop shadow.
 *
 * Rendered as an SVG `feDropShadow`, which is why `blur` is a radius rather
 * than a spread and why there is no inset variant — the filter has no such
 * thing, and a control whose value the renderer would have to approximate is a
 * control that lies. Verified to rasterise through the export path (an SVG
 * serialised into an <img>), which is the only test that matters here.
 */
export type Shadow = {
  dx: number;
  dy: number;
  /** Blur radius in canvas pixels. Zero is a hard offset. */
  blur: number;
  color: PaintRole;
  /** 0-1. Defaults to 0.35, which reads as a shadow rather than a second copy. */
  opacity?: number;
};

export type TextSlot =
  | "title" | "subtitle" | "description" | "statistic"
  | "testimonial" | "quote" | "cta" | "phone" | "website"
  | "point1" | "point2" | "point3" | "score";

export type ImageSlot = "image1" | "image2" | "image3" | "image4" | "image5" | "image6";

type Base = {
  id: string;
  /** Shown in the layers panel. Falls back to the layer's kind and slot. */
  name?: string;
  x: number; y: number; w: number; h: number;
  /** Degrees, clockwise, about the layer's own centre. */
  rotation?: number;
  /** 0-1. Applies to the whole layer, on top of any fill opacity. */
  alpha?: number;
  /** Locked layers are skipped by click and drag — the backgrounds mostly, so
   *  dragging across a design does not pick the canvas up by mistake. */
  locked?: boolean;
  hidden?: boolean;
  /**
   * Mirror about the layer's own centre.
   *
   * On Base rather than on the shapes, because it is one `scale(-1 1)` on the
   * wrapper the renderer already puts rotation and opacity on — so a flipped
   * photograph, a flipped vector and a flipped headline all cost the same
   * nothing, and none of the painters has to know about it.
   */
  flipH?: boolean;
  flipV?: boolean;
  /** A drop shadow, applied to whatever the layer painted. */
  shadow?: Shadow;
};

/**
 * What geometry a shape layer paints.
 *
 * Absent means "rect", which is what every design saved before this existed
 * is — so the whole set is additive and nothing had to be migrated. They all
 * share one layer type rather than becoming six of them because they are the
 * same object to everything that is not the painter: the same box, fill,
 * stroke, shadow, rotation and inspector, differing only in the outline drawn
 * inside the box. Splitting them would have duplicated that surface six ways.
 */
export type ShapeKind =
  | "rect" | "ellipse" | "triangle" | "diamond"
  | "pentagon" | "hexagon" | "star" | "line" | "arrow";

/** Corner radii clockwise from the top-left, when they differ from each other. */
export type Corners = [number, number, number, number];

/** A flat fill — backgrounds, solid cards, and every drawn shape. */
export type RectLayer = Base & {
  type: "rect";
  fill: PaintRole;
  /** Which outline to paint. Absent is a rectangle. */
  shape?: ShapeKind;
  /**
   * Points on a star, or sides on a polygon drawn as one.
   *
   * Only `star` reads it. Clamped by the painter rather than trusted, because
   * a spinner is one keystroke away from a value that paints nothing.
   */
  points?: number;
  /** How deep a star's valleys cut, 0–1 of the outer radius. */
  innerRatio?: number;
  radius?: number;
  /**
   * Per-corner radii, when the four differ. Takes precedence over `radius`,
   * which stays the one-number control most designs only ever need — and stays
   * the thing every existing document carries.
   *
   * Rectangles only. A rounded pentagon is a different shape, not a rounder
   * one, and offering the control on shapes that ignore it would read as a bug.
   */
  radii?: Corners;
  opacity?: number;
  /** The outlined pills carry their shape in a stroke rather than a fill. */
  strokeColor?: PaintRole;
  strokeWidth?: number;
  /**
   * Dash length in canvas pixels; the gap is drawn at two thirds of it.
   * Absent or zero is a solid line.
   *
   * One number rather than a full dash array on purpose: an array is a
   * typography-grade control that nobody making a social post needs, and it
   * would have to be validated on every keystroke to avoid handing the
   * renderer something that paints nothing.
   */
  strokeDash?: number;
  /** NEW: Gradient support for shape fills. Takes precedence over flat fill. */
  gradient?: { from: PaintRole; to: PaintRole; angle: number; type: "linear" | "radial" };
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
  /** An exported shape that clips the photo — the blobs and circles.
   *  NOTHING SETS THIS YET: the pack's extractor does not emit masks and the
   *  editor has no control for them, so the renderer applies it when present
   *  but no document carries one. Kept in the type because the render path
   *  already honours it and removing it would strand any future import. */
  mask?: string;
  /**
   * The crop.
   *
   * `fit` chooses between filling the frame and cropping ("cover", the
   * default) or fitting the whole photograph inside it ("contain"). `zoom`
   * then scales the photo within the frame and `panX`/`panY` slide it, both as
   * a fraction of the frame's size.
   *
   * This exists because "cover" picks the centre of the photograph, and the
   * centre is very often not the subject — a portrait dropped into a wide
   * frame gets cropped to a torso. Without a crop the only remedy is to go and
   * find a differently-shaped photograph.
   */
  fit?: "cover" | "contain";
  zoom?: number;
  panX?: number;
  panY?: number;
  /** Drawn under the photo, so a slot with no photo yet is still a shape. */
  plate?: PaintRole;
};

/**
 * One styled span inside a text layer.
 *
 * Only the differences from the layer are stored: a run with no properties is
 * plain text in the layer's own font, size and colour. That keeps a headline
 * that has one accent-coloured phrase to two runs rather than a full
 * description of every character, and means changing the layer's size still
 * moves the whole block.
 */
export type TextRun = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  /** Overrides the layer's fill for this span. */
  fill?: PaintRole;
  /** A multiplier on the layer's size, not an absolute — so a run stays
   *  proportional when the layer is scaled with the group. */
  scale?: number;
  /** Only set when a run deliberately breaks from the layer's face. */
  font?: string;
  weight?: number;
};

/** A sequence of styled spans. */
export type Rich = TextRun[];

/**
 * What a content slot holds.
 *
 * A plain string is still valid and still renders — every design saved before
 * runs existed holds one, and the AI generator writes them. `rich.ts` is the
 * single place that turns either into runs.
 */
export type Copy = string | Rich;

export type TextLayer = Base & {
  type: "text";
  slot: TextSlot;
  /** The pack uses six families — Plus Jakarta Sans, DM Sans, Mona Sans,
   *  PT Serif, Poppins, Inter — so the face is per-layer, not global. */
  font?: string;
  italic?: boolean;
  size: number;
  weight: number;
  fill: PaintRole;
  /** Multiplier, as Figma reports it. */
  lineHeight: number;
  /** Absolute px, negative in this pack. */
  tracking: number;
  align?: "left" | "center" | "right";
  /**
   * Where the copy sits inside the layer's box vertically.
   *
   * Absent means "top", which is what every design already saved does and what
   * Figma exported — so this is additive and nothing had to be migrated. The
   * renderer shifts the baselines by the slack between the laid-out height and
   * the box; it is not a CSS property and it survives export because it is
   * arithmetic on the same `y` the glyphs were always painted at.
   */
  valign?: "top" | "middle" | "bottom";
  uppercase?: boolean;
  capitalize?: boolean;
  /** Words wrapped in *asterisks* paint in this role — the pack's two-tone
   *  headline. A plain string with no asterisks renders in `fill`, so the
   *  feature costs nothing when it is not used. */
  accent?: PaintRole;
  /** NEW: Text Stroke Outline */
  strokeColor?: PaintRole;
  strokeWidth?: number;
};

/** A rounded label — the chips and the CTA button. */
export type ChipLayer = Base & {
  type: "chip";
  slot: TextSlot;
  size: number;
  weight: number;
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
  /**
   * This template's own default colours.
   *
   * The pack is three families with three different brand colours. One global
   * palette would render the violet templates blue.
   */
  palette: Palette;
  /** Layers in paint order: first is furthest back. */
  layers: Layer[];
  /** Starting copy — the Figma file's own placeholder text. */
  content: Partial<Record<TextSlot, Copy>>;
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
  /** Where it came from. "generated" images live in the tenant's own storage
   *  bucket; "upload" ones are inlined into the document as a data URI. */
  source?: "pexels" | "upload" | "generated";
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
  content: Partial<Record<TextSlot, Copy>>;
  images: Partial<Record<ImageSlot, PlacedImage>>;
  /** Only the roles that differ from the template's default. */
  palette?: Partial<Palette>;
  /** The artboard size. Absent means portrait — every document saved before
   *  formats existed is one, so nothing had to be migrated. */
  format?: DesignFormat;
  /**
   * Document schema version.
   *
   * THE CONVENTION: absent and `1` are the same document — everything saved so
   * far. The stamp exists so that if this shape ever has to change
   * incompatibly, the migration can ask "which era is this row from" instead of
   * sniffing fields, which is how jsonb migrations go wrong. It is written by
   * `emptyDoc` and by `materialise` (the moment a document starts owning its
   * layers) rather than everywhere, because a version stamp that half the
   * writers forget is worse than none.
   */
  v?: 1;
};

export const emptyDoc = (templateId: string): DesignDoc => ({
  templateId,
  content: {},
  images: {},
  v: 1,
});

/**
 * A carousel: several designs posted as one.
 *
 * Stored in the same `doc` column as a single design, because a carousel is
 * not a different kind of thing — it is a post with more than one page, and
 * every slide is an ordinary DesignDoc that the same canvas, the same
 * renderer and the same exporter already handle.
 *
 * Every design saved before carousels existed holds a bare DesignDoc, so the
 * column carries EITHER shape and `asDeck` is the one place that knows it.
 * Nothing had to be migrated, and a one-slide deck saved back as a deck still
 * opens correctly in an older build, because slides[0] is a whole document.
 */
export type Deck = { slides: DesignDoc[] };

export const isDeck = (v: DesignDoc | Deck | null | undefined): v is Deck =>
  Boolean(v) && Array.isArray((v as Deck).slides);

/** Whatever was stored, as a deck. Never returns an empty one: a design with
 *  no slides has nothing to edit and nothing to show. */
export function asDeck(v: DesignDoc | Deck | null | undefined, templateId = "v1"): Deck {
  if (isDeck(v)) return v.slides.length ? v : { slides: [emptyDoc(templateId)] };
  return { slides: [{ ...emptyDoc(templateId), ...(v ?? {}) }] };
}

/** The slides, for anything that only needs to read them. */
export const slidesOf = (v: DesignDoc | Deck | null | undefined, templateId?: string) =>
  asDeck(v, templateId).slides;

/**
 * The palette a design actually paints with.
 *
 * The template's own colours underneath, the design's overrides on top. Taking
 * the pack default as the base instead would repaint every violet template blue
 * the moment a design overrode a single unrelated role.
 */
export function resolvePalette(doc: DesignDoc, templatePalette?: Palette): Palette {
  return { ...DEFAULT_PALETTE, ...(templatePalette ?? {}), ...(doc.palette ?? {}) };
}

/** Resolve a paint role to a colour. A literal hex passes straight through. */
export function paint(role: PaintRole | undefined, palette: Palette): string {
  if (!role || role === "transparent") return "none";
  if (role === "white") return "#ffffff";
  if (role === "black") return "#000000";
  if (role.startsWith("#")) return role;
  return (palette as Record<string, string>)[role] ?? role;
}
