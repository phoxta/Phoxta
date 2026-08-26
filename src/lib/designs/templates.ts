import type { Layer, Template } from "./types";

/**
 * The six templates, transcribed from the Figma pack.
 *
 * Source: Digital Agency Social Media Post, file U9BOOEbXYF9Ngk4NMB3mZD, frames
 * V1–V6. Geometry is the frame-absolute x/y/w/h Figma reports; type sizes,
 * weights, line heights and letter-spacing are the values from its own text
 * styles. Nothing here was measured off a screenshot.
 *
 * The decorative vectors are the pack's exported SVGs, committed under
 * /assets/designs rather than hot-linked — Figma's asset URLs expire after a
 * week, so a hot link would have turned every template into a set of broken
 * images seven days after this shipped.
 *
 * Layers paint in array order: first is furthest back. That is the order Figma
 * reports its children in, so the stacking here is the stacking there.
 *
 * WHAT WAS DELIBERATELY NOT COPIED: the placeholder photographs. Figma exports
 * them as checkerboard PNGs, which are a stand-in for a photo, not a photo. The
 * image layers carry the slot and the mask instead, and the picture arrives from
 * the tenant's upload or from Pexels.
 */

/* ── Shared furniture ────────────────────────────────────────────────────
   The contact bar is identical across V1, V2, V3 and V5 — same 917px width,
   same 42px icons, same 30px medium type — so it is built once. V4 and V6
   stack it into a corner instead and pass their own geometry. */

const contactBar = (opts: { y: number; fill: "ink" | "white"; icons: [string, string] }): Layer[] => [
  { id: "phone-icon", type: "asset", src: opts.icons[0], x: 82, y: opts.y + 18, w: 42, h: 42 },
  {
    id: "phone", type: "text", slot: "phone", x: 132, y: opts.y + 25, w: 300, h: 42,
    size: 30, weight: 500, fill: opts.fill, lineHeight: 0.95, tracking: -0.6,
  },
  { id: "web-icon", type: "asset", src: opts.icons[1], x: 623, y: opts.y + 18, w: 42, h: 42 },
  {
    id: "website", type: "text", slot: "website", x: 673, y: opts.y + 25, w: 340, h: 42,
    size: 30, weight: 500, fill: opts.fill, lineHeight: 0.95, tracking: -0.6,
  },
];

/** V4 and V6 stack the two contact lines at the left instead. */
const contactStack = (opts: { x: number; y: number; icons: [string, string] }): Layer[] => [
  { id: "web-icon", type: "asset", src: opts.icons[0], x: opts.x, y: opts.y, w: 42, h: 42 },
  {
    id: "website", type: "text", slot: "website", x: opts.x + 50, y: opts.y + 7, w: 340, h: 42,
    size: 30, weight: 500, fill: "white", lineHeight: 0.95, tracking: 0,
  },
  { id: "phone-icon", type: "asset", src: opts.icons[1], x: opts.x, y: opts.y + 58, w: 42, h: 42 },
  {
    id: "phone", type: "text", slot: "phone", x: opts.x + 50, y: opts.y + 65, w: 300, h: 42,
    size: 30, weight: 500, fill: "white", lineHeight: 0.95, tracking: 0,
  },
];

const A = (n: string) => `/assets/designs/${n}.svg`;

/** The gradient angle Figma exported, shared by every dark template. */
const BRAND_ANGLE = 232.33;

/* ── V1 · Light hero with a navy quote card ──────────────────────────── */

const V1: Template = {
  id: "v1",
  name: "Statement",
  purpose:
    "A light, typographic opener. Big two-tone headline, one supporting sentence in a navy card, two photographs. Use it to say one thing.",
  layers: [
    { id: "bg", type: "rect", x: 0, y: 0, w: 1080, h: 1350, fill: "canvas" },
    { id: "quote", type: "asset", src: A("v1-quote"), x: 237, y: 101, w: 343, h: 299 },
    {
      id: "title", type: "text", slot: "title", x: 82, y: 157, w: 481, h: 252,
      size: 80, weight: 700, fill: "ink", lineHeight: 1.05, tracking: -4.8, accent: "accent",
    },
    { id: "image2", type: "image", slot: "image2", x: 607, y: 143, w: 374, h: 570, radius: 24 },
    { id: "card", type: "asset", src: A("v1-card"), x: 82, y: 647, w: 526, h: 501, tint: "ink" },
    { id: "image1", type: "image", slot: "image1", x: 520, y: 763, w: 461, h: 385, radius: 24 },
    {
      id: "description", type: "text", slot: "description", x: 141, y: 862, w: 389, h: 230,
      size: 38, weight: 500, fill: "white", lineHeight: 1.2, tracking: -2.28,
    },
    { id: "badge", type: "asset", src: A("v1-badge"), x: 321, y: 607, w: 196, h: 196 },
    ...contactBar({ y: 1222, fill: "ink", icons: [A("v1-icon-phone"), A("v1-icon-web")] }),
  ],
  content: {
    title: "Finding *Jeans Hard* Enough in Person",
    description: "We help brands grow stronger in perception, performance, and profit — because true value never fades",
    phone: "(00) 0000-0000",
    website: "www.yourwebsite.com",
  },
  imageHints: { image1: "team working together in a bright studio", image2: "confident professional portrait" },
};

/* ── V2 · Gradient, statistic-led ────────────────────────────────────── */

const V2: Template = {
  id: "v2",
  name: "Proof",
  purpose:
    "A gradient post built around one number. Headline, a trust line, an oversized statistic, three short chips and a score bullet. Use it when the point is evidence.",
  layers: [
    { id: "bg", type: "gradient", x: 0, y: 0, w: 1080, h: 1350, from: "gradientFrom", to: "gradientTo", angle: BRAND_ANGLE },
    { id: "pattern", type: "asset", src: A("v2-pattern"), x: 284, y: 64, w: 967, h: 844, opacity: 0.9 },
    { id: "wash", type: "asset", src: A("v2-gradient"), x: 0, y: 0, w: 558, h: 1082 },
    {
      id: "title", type: "text", slot: "title", x: 82, y: 129, w: 415, h: 240,
      size: 80, weight: 600, fill: "white", lineHeight: 1.0, tracking: -4.8, accent: "accentSoft",
    },
    { id: "image1", type: "image", slot: "image1", x: 454, y: 242, w: 569, h: 920, mask: A("v2-photo-mask") },
    {
      id: "subtitle", type: "text", slot: "subtitle", x: 82, y: 419, w: 262, h: 88,
      size: 37, weight: 600, fill: "white", lineHeight: 1.2, tracking: -2.22,
    },
    {
      id: "statistic", type: "text", slot: "statistic", x: 82, y: 527, w: 262, h: 130,
      size: 130, weight: 700, fill: "accentSoft", lineHeight: 1.0, tracking: -7.8,
    },
    {
      id: "score", type: "chip", slot: "score", x: 502, y: 512, w: 212, h: 99,
      size: 56, weight: 600, fill: "accent", color: "white", radius: 50, align: "center",
    },
    {
      id: "description", type: "text", slot: "description", x: 82, y: 707, w: 350, h: 86,
      size: 36, weight: 500, fill: "white", lineHeight: 1.2, tracking: -2.16,
    },
    {
      id: "point1", type: "chip", slot: "point1", x: 82, y: 850, w: 154, h: 52,
      size: 32, weight: 500, fill: "white", fillAlpha: 0.16, color: "white", radius: 100, align: "center",
    },
    {
      id: "point2", type: "chip", slot: "point2", x: 252, y: 850, w: 154, h: 52,
      size: 32, weight: 500, fill: "white", fillAlpha: 0.16, color: "white", radius: 100, align: "center",
    },
    {
      id: "point3", type: "chip", slot: "point3", x: 82, y: 918, w: 177, h: 52,
      size: 32, weight: 500, fill: "white", fillAlpha: 0.16, color: "white", radius: 100, align: "center",
    },
    { id: "stars", type: "asset", src: A("v2-stars"), x: 758, y: 1028, w: 288, h: 74 },
    ...contactBar({ y: 1222, fill: "white", icons: [A("v2-icon-phone"), A("v2-icon-web")] }),
  ],
  content: {
    title: "Value That Grows With Team's",
    subtitle: "Trusted by brands across",
    statistic: "12+",
    score: "4.5%",
    description: "Stay relevant, stay visible, and stay ahead.",
    point1: "Growth",
    point2: "Visibility",
    point3: "Retention",
    phone: "(00) 0000-0000",
    website: "www.yourwebsite.com",
  },
  imageHints: { image1: "person presenting to camera, cut out on plain background" },
};

/* ── V3 · Testimonial, centred ───────────────────────────────────────── */

const V3: Template = {
  id: "v3",
  name: "Testimonial",
  purpose:
    "A centred quote layout. Wide photograph, a navy card carrying the quote and its context. Use it for social proof in the customer's own words.",
  layers: [
    { id: "bg", type: "rect", x: 0, y: 0, w: 1080, h: 1350, fill: "canvas" },
    { id: "pattern-tl", type: "asset", src: A("v3-pattern-tl"), x: -187, y: 0, w: 487, h: 532 },
    { id: "pattern-tr", type: "asset", src: A("v3-pattern-tr"), x: 477, y: 89, w: 672, h: 586 },
    { id: "pattern-br", type: "asset", src: A("v3-pattern-br"), x: 765, y: 802, w: 315, h: 840 },
    {
      id: "title", type: "text", slot: "title", x: 245, y: 157, w: 590, h: 188,
      size: 90, weight: 700, fill: "ink", lineHeight: 1.05, tracking: -5.4,
      align: "center", capitalize: true, accent: "accent",
    },
    { id: "image1", type: "image", slot: "image1", x: 129, y: 423, w: 822, h: 499, radius: 24 },
    { id: "card", type: "asset", src: A("v3-card"), x: 124, y: 877, w: 859, h: 270, tint: "ink" },
    {
      id: "testimonial", type: "text", slot: "testimonial", x: 280, y: 922, w: 349, h: 163,
      size: 45, weight: 600, fill: "white", lineHeight: 1.1, tracking: -2.7,
    },
    {
      id: "quote", type: "text", slot: "quote", x: 651, y: 931, w: 276, h: 144,
      size: 30, weight: 500, fill: "white", lineHeight: 1.2, tracking: -1.2,
    },
    { id: "badge", type: "asset", src: A("v3-badge"), x: 32, y: 820, w: 208, h: 208 },
    ...contactBar({ y: 1222, fill: "ink", icons: [A("v3-icon-phone"), A("v3-icon-web")] }),
  ],
  content: {
    title: "What They say *about us*",
    testimonial: "They are strategic partners We Trust Completely",
    quote: "They didn't just hand us a report and walk away — they rolled up their sleeves",
    phone: "(00) 0000-0000",
    website: "www.yourwebsite.com",
  },
  imageHints: { image1: "happy customer smiling in a real setting" },
};

/* ── V4 · Full-bleed photograph ──────────────────────────────────────── */

const V4: Template = {
  id: "v4",
  name: "Full bleed",
  purpose:
    "One photograph edge to edge, with the headline and a quote read out of a gradient wash. A white stat card sits bottom-right. Use it when the picture is the message.",
  layers: [
    { id: "bg", type: "gradient", x: 0, y: 0, w: 1080, h: 1350, from: "gradientFrom", to: "gradientTo", angle: BRAND_ANGLE },
    { id: "image1", type: "image", slot: "image1", x: 0, y: 0, w: 1080, h: 1197 },
    { id: "wash", type: "asset", src: A("v4-gradient"), x: 0, y: 710, w: 878, h: 640 },
    {
      id: "title", type: "text", slot: "title", x: 86, y: 764, w: 636, h: 176,
      size: 80, weight: 600, fill: "white", lineHeight: 1.1, tracking: -4.8,
    },
    {
      id: "description", type: "text", slot: "description", x: 86, y: 1010, w: 636, h: 157,
      size: 36, weight: 500, fill: "white", lineHeight: 1.2, tracking: -1.44,
    },
    { id: "card", type: "asset", src: A("v4-card"), x: 768, y: 1011, w: 312, h: 339 },
    {
      id: "subtitle", type: "text", slot: "subtitle", x: 818, y: 1071, w: 262, h: 88,
      size: 37, weight: 600, fill: "ink", lineHeight: 1.2, tracking: -2.22,
    },
    {
      id: "statistic", type: "text", slot: "statistic", x: 818, y: 1179, w: 262, h: 130,
      size: 130, weight: 700, fill: "accent", lineHeight: 1.0, tracking: -7.8,
    },
    ...contactStack({ x: 86, y: 1197, icons: [A("v4-icon-web"), A("v4-icon-phone")] }),
  ],
  content: {
    title: "The Quality is Even Better in Person",
    description: "I'm always a little hesitant to shop with new online stores, but my experience with was flawless",
    subtitle: "Trusted by brands across",
    statistic: "12+",
    phone: "(00) 0000-0000",
    website: "www.yourwebsite.com",
  },
  imageHints: { image1: "striking lifestyle photograph, product in use" },
};

/* ── V5 · Three faces, three audiences ───────────────────────────────── */

const V5: Template = {
  id: "v5",
  name: "Audience",
  purpose:
    "Three circular portraits over three labelled pills. Use it to name who the offer is for, or to introduce a team.",
  layers: [
    { id: "bg", type: "rect", x: 0, y: 0, w: 1080, h: 1350, fill: "canvas" },
    { id: "pattern-tl", type: "asset", src: A("v5-pattern-tl"), x: -187, y: 0, w: 487, h: 532 },
    { id: "pattern-br", type: "asset", src: A("v5-pattern-br"), x: 615, y: 615, w: 541, h: 840 },
    {
      id: "title", type: "text", slot: "title", x: 82, y: 134, w: 481, h: 252,
      size: 80, weight: 700, fill: "ink", lineHeight: 1.05, tracking: -4.8, accent: "accent",
    },
    {
      id: "description", type: "text", slot: "description", x: 722, y: 151, w: 277, h: 218,
      size: 36, weight: 500, fill: "ink", lineHeight: 1.2, tracking: -1.44,
    },

    { id: "avatar1-bg", type: "asset", src: A("v5-avatar-bg-1"), x: 82, y: 462, w: 358, h: 360 },
    { id: "image1", type: "image", slot: "image1", x: 152, y: 508, w: 212, h: 313 },
    { id: "avatar1-ring", type: "asset", src: A("v5-avatar-ring-1"), x: 82, y: 462, w: 358, h: 360 },

    { id: "avatar3-bg", type: "asset", src: A("v5-avatar-bg-3"), x: 641, y: 462, w: 382, h: 384 },
    { id: "image3", type: "image", slot: "image3", x: 708, y: 513, w: 213, h: 332 },
    { id: "avatar3-ring", type: "asset", src: A("v5-avatar-ring-2"), x: 641, y: 462, w: 382, h: 384 },

    { id: "avatar2-bg", type: "asset", src: A("v5-avatar-bg-2"), x: 350, y: 450, w: 382, h: 384 },
    { id: "image2", type: "image", slot: "image2", x: 408, y: 506, w: 259, h: 328 },
    { id: "avatar2-ring", type: "asset", src: A("v5-avatar-ring-2"), x: 350, y: 450, w: 382, h: 384 },

    {
      id: "point1", type: "chip", slot: "point1", x: 82, y: 930, w: 448, h: 95,
      size: 35, weight: 600, fill: "canvas", color: "black", radius: 999,
      borderColor: "ink", borderWidth: 2, icon: A("v5-icon-investor"), iconSize: 75, align: "center",
    },
    {
      id: "point2", type: "chip", slot: "point2", x: 550, y: 930, w: 448, h: 95,
      size: 35, weight: 600, fill: "canvas", color: "black", radius: 999,
      borderColor: "ink", borderWidth: 2, icon: A("v5-icon-owner"), iconSize: 75, align: "center",
    },
    {
      id: "point3", type: "chip", slot: "point3", x: 329, y: 1045, w: 422, h: 95,
      size: 35, weight: 600, fill: "canvas", color: "black", radius: 999,
      borderColor: "ink", borderWidth: 2, icon: A("v5-icon-ads"), iconSize: 75, align: "center",
    },
    ...contactBar({ y: 1222, fill: "ink", icons: [A("v5-icon-phone"), A("v5-icon-web")] }),
  ],
  content: {
    title: "The Quality is Even Better in Person",
    description: "always a little to shop with new online stores, but my experience with was flawless",
    point1: "Investors",
    point2: "Business Owner",
    point3: "Ads Marketing",
    phone: "(00) 0000-0000",
    website: "www.yourwebsite.com",
  },
  imageHints: {
    image1: "professional portrait on plain background",
    image2: "smiling person portrait on plain background",
    image3: "business person portrait on plain background",
  },
};

/* ── V6 · Gradient with a call to action ─────────────────────────────── */

const V6: Template = {
  id: "v6",
  name: "Offer",
  purpose:
    "A gradient post that ends in a button. Headline, a two-part pitch, a CTA, a tall photograph and a big success number. Use it when you want a click.",
  layers: [
    { id: "bg", type: "gradient", x: 0, y: 0, w: 1080, h: 1350, from: "gradientFrom", to: "gradientTo", angle: BRAND_ANGLE },
    { id: "image1", type: "image", slot: "image1", x: 557, y: 86, w: 443, h: 1157, radius: 200 },
    {
      id: "title", type: "text", slot: "title", x: 81, y: 153, w: 421, h: 240,
      size: 80, weight: 600, fill: "white", lineHeight: 1.0, tracking: -4.8,
    },
    {
      id: "subtitle", type: "text", slot: "subtitle", x: 81, y: 487, w: 322, h: 144,
      size: 40, weight: 600, fill: "white", lineHeight: 1.2, tracking: -1.6,
    },
    {
      id: "description", type: "text", slot: "description", x: 81, y: 668, w: 369, h: 172,
      size: 36, weight: 500, fill: "white", lineHeight: 1.2, tracking: -1.44,
    },
    { id: "badge", type: "asset", src: A("v6-badge"), x: 450, y: 506, w: 208, h: 208 },
    {
      id: "cta", type: "chip", slot: "cta", x: 81, y: 877, w: 386, h: 82,
      size: 30, weight: 700, fill: "ink", color: "white", radius: 12,
      icon: A("v6-icon-arrow"), iconSize: 42, align: "left",
      gradient: { from: "ink", to: "accent", angle: 19.96 },
    },
    { id: "card", type: "asset", src: A("v6-card"), x: 557, y: 852, w: 523, h: 498 },
    {
      id: "subtitle2", type: "text", slot: "quote", x: 744, y: 985, w: 276, h: 108,
      size: 45, weight: 500, fill: "white", lineHeight: 1.2, tracking: -1.8, align: "right",
    },
    {
      id: "statistic", type: "text", slot: "statistic", x: 712, y: 1089, w: 400, h: 168,
      size: 140, weight: 600, fill: "white", lineHeight: 1.2, tracking: -4.2,
    },
    ...contactStack({ x: 87, y: 1125, icons: [A("v6-icon-web"), A("v6-icon-phone")] }),
  ],
  content: {
    title: "Value That Grows With Team's",
    subtitle: "We don't just build campaigns —",
    description: "we build lasting value for your brand, your audience, and your future market position.",
    cta: "Start Building Value",
    quote: "Success rate in boosting",
    statistic: "98%",
    phone: "(00) 0000-0000",
    website: "www.yourwebsite.com",
  },
  imageHints: { image1: "tall portrait of someone at work" },
};

export const TEMPLATES: Template[] = [V1, V2, V3, V4, V5, V6];

export const getTemplate = (id: string): Template | undefined => TEMPLATES.find((t) => t.id === id);

/**
 * The layers a document renders.
 *
 * Its own, once it has been edited structurally; the template's until then. One
 * function so nothing else in the app has to know which of the two it is
 * looking at.
 */
export function layersOf(doc: { templateId: string; layers?: Layer[] }): Layer[] {
  if (doc.layers?.length) return doc.layers;
  return getTemplate(doc.templateId)?.layers ?? [];
}

/** A readable name for the layers panel. */
export function layerName(l: Layer): string {
  if (l.name) return l.name;
  if (l.type === "text" || l.type === "chip") return l.slot;
  if (l.type === "image") return l.slot;
  if (l.type === "asset") return l.src.split("/").pop()?.replace(".svg", "") ?? "shape";
  return l.type;
}

/** Every text slot a template actually uses, in paint order — the editor's
 *  field list, derived from the layout so the two cannot drift apart. */
export function textSlotsOf(t: Template): { slot: string; id: string; multiline: boolean }[] {
  const out: { slot: string; id: string; multiline: boolean }[] = [];
  for (const l of t.layers) {
    if (l.type !== "text" && l.type !== "chip") continue;
    if (out.some((o) => o.slot === l.slot)) continue;
    out.push({ slot: l.slot, id: l.id, multiline: l.type === "text" && l.h > l.size * 1.6 });
  }
  return out;
}

/** Every image slot a template uses. */
export function imageSlotsOf(t: Template): string[] {
  const out: string[] = [];
  for (const l of t.layers) {
    if (l.type === "image" && !out.includes(l.slot)) out.push(l.slot);
  }
  return out;
}
