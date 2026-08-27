import type { Block } from "@email";

/**
 * What the composer knows about each kind of block.
 *
 * The renderer is the authority on how a block LOOKS; this is the authority on
 * how it is EDITED. Keeping the two apart is what lets a new block be added to
 * the template and get an editor by describing its fields, rather than by
 * writing another form.
 *
 * Field kinds are deliberately few. Every one of them round-trips through a
 * plain textarea or input, because a block editor made of bespoke widgets is a
 * block editor nobody finishes.
 */

export type FieldKind = "str" | "txt" | "url" | "lines" | "rows" | "pairs" | "items" | "bool";

export type Field = {
  key: string;
  label: string;
  kind: FieldKind;
  hint?: string;
  /** For `items`: the shape of one entry. */
  of?: Array<{ key: string; label: string; kind: "str" | "txt" | "url" | "bool" }>;
};

export type Spec = {
  /** What it is called in the add menu and the block list. */
  label: string;
  /** Grouping in the add menu. */
  group: "Writing" | "Layout" | "Marketing" | "Media";
  fields: Field[];
  /** A fresh one. */
  make: () => Block;
  /** One line describing this instance, for the list. */
  summary: (b: Block) => string;
};

const t = (b: unknown, k: string) => String((b as Record<string, unknown>)[k] ?? "");

export const SPECS: Record<string, Spec> = {
  // ── Writing ───────────────────────────────────────────────────────────────
  lead: {
    label: "Standfirst", group: "Writing",
    fields: [{ key: "text", label: "Text", kind: "txt", hint: "The opening line, set larger than body copy." }],
    make: () => ({ type: "lead", text: "" }),
    summary: (b) => t(b, "text"),
  },
  text: {
    label: "Paragraph", group: "Writing",
    fields: [{ key: "text", label: "Text", kind: "txt" }],
    make: () => ({ type: "text", text: "" }),
    summary: (b) => t(b, "text"),
  },
  html: {
    label: "Paragraph with bold/links", group: "Writing",
    fields: [
      { key: "html", label: "HTML", kind: "txt", hint: "Only <b>, <i> and <a href> — anything else is on you." },
      { key: "text", label: "Plain-text version", kind: "txt", hint: "What watches and screen readers get. Required." },
    ],
    make: () => ({ type: "html", html: "", text: "" }),
    summary: (b) => t(b, "text") || t(b, "html"),
  },
  subhead: {
    label: "Subhead", group: "Writing",
    fields: [{ key: "text", label: "Text", kind: "str" }],
    make: () => ({ type: "subhead", text: "" }),
    summary: (b) => t(b, "text"),
  },
  list: {
    label: "Bulleted list", group: "Writing",
    fields: [{ key: "items", label: "Items", kind: "lines", hint: "One per line." }],
    make: () => ({ type: "list", items: [] }),
    summary: (b) => ((b as { items: string[] }).items ?? []).join(" · "),
  },
  quote: {
    label: "Pull quote", group: "Writing",
    fields: [
      { key: "text", label: "Quote", kind: "txt" },
      { key: "cite", label: "Attribution", kind: "str" },
    ],
    make: () => ({ type: "quote", text: "" }),
    summary: (b) => t(b, "text"),
  },
  byline: {
    label: "Byline", group: "Writing",
    fields: [
      { key: "author", label: "Author", kind: "str" },
      { key: "date", label: "Date", kind: "str" },
      { key: "note", label: "Note", kind: "str", hint: "Reading time, usually." },
    ],
    make: () => ({ type: "byline", author: "Phoxta", date: "", note: "" }),
    summary: (b) => [t(b, "author"), t(b, "date")].filter(Boolean).join(" · "),
  },

  // ── Layout ────────────────────────────────────────────────────────────────
  section: {
    label: "Section head", group: "Layout",
    fields: [
      { key: "n", label: "Number", kind: "str", hint: "01, 02 — optional." },
      { key: "label", label: "Kicker", kind: "str" },
      { key: "title", label: "Title", kind: "str" },
    ],
    make: () => ({ type: "section", label: "", title: "" }),
    summary: (b) => [t(b, "n"), t(b, "title")].filter(Boolean).join(" "),
  },
  divider: {
    label: "Divider", group: "Layout",
    fields: [],
    make: () => ({ type: "divider" }),
    summary: () => "A rule",
  },
  duo: {
    label: "Two columns", group: "Layout",
    fields: [
      { key: "left.h", label: "Left heading", kind: "str" },
      { key: "left.p", label: "Left text", kind: "txt" },
      { key: "right.h", label: "Right heading", kind: "str" },
      { key: "right.p", label: "Right text", kind: "txt" },
    ],
    make: () => ({ type: "duo", left: { h: "", p: "" }, right: { h: "", p: "" } }),
    summary: (b) => {
      const x = b as { left: { h: string }; right: { h: string } };
      return [x.left?.h, x.right?.h].filter(Boolean).join(" | ");
    },
  },
  table: {
    label: "Table", group: "Layout",
    fields: [
      { key: "head", label: "Header row", kind: "lines", hint: "One column per line." },
      { key: "rows", label: "Rows", kind: "rows", hint: "One row per line, cells separated by |" },
      { key: "caption", label: "Caption", kind: "str" },
    ],
    make: () => ({ type: "table", head: ["", ""], rows: [["", ""]] }),
    summary: (b) => `${((b as { rows: string[][] }).rows ?? []).length} rows`,
  },
  facts: {
    label: "Label/value table", group: "Layout",
    fields: [{ key: "rows", label: "Rows", kind: "pairs", hint: "One per line: Label | Value" }],
    make: () => ({ type: "facts", rows: [] }),
    summary: (b) => `${((b as { rows: [string, string][] }).rows ?? []).length} rows`,
  },
  band: {
    label: "Dark section", group: "Layout",
    fields: [],
    make: () => ({ type: "band", blocks: [] }),
    summary: (b) => `${((b as { blocks: Block[] }).blocks ?? []).length} blocks on ink`,
  },

  // ── Media ─────────────────────────────────────────────────────────────────
  figure: {
    label: "Image with caption", group: "Media",
    fields: [
      { key: "img", label: "Image URL", kind: "url" },
      { key: "alt", label: "Alt text", kind: "str", hint: "Read aloud, and shown when images are blocked." },
      { key: "caption", label: "Caption", kind: "str" },
    ],
    make: () => ({ type: "figure", img: "", alt: "" }),
    summary: (b) => t(b, "alt") || t(b, "img"),
  },
  image: {
    label: "Design or banner", group: "Media",
    fields: [
      { key: "src", label: "Image URL", kind: "url" },
      { key: "alt", label: "Alt text", kind: "str" },
      { key: "href", label: "Links to", kind: "url" },
      { key: "caption", label: "Caption", kind: "str" },
    ],
    make: () => ({ type: "image", src: "", alt: "" }),
    summary: (b) => t(b, "alt") || t(b, "src"),
  },
  hero: {
    label: "Full-width photo", group: "Media",
    fields: [
      { key: "src", label: "Image URL", kind: "url" },
      { key: "alt", label: "Alt text", kind: "str" },
    ],
    make: () => ({ type: "hero", src: "", alt: "" }),
    summary: (b) => t(b, "alt") || t(b, "src"),
  },
  video: {
    label: "Video poster", group: "Media",
    fields: [
      { key: "poster", label: "Poster URL", kind: "url" },
      { key: "alt", label: "Alt text", kind: "str" },
      { key: "title", label: "Caption", kind: "str" },
      { key: "href", label: "Links to", kind: "url" },
    ],
    make: () => ({ type: "video", poster: "", alt: "", title: "", href: "" }),
    summary: (b) => t(b, "title"),
  },

  // ── Marketing ─────────────────────────────────────────────────────────────
  cover: {
    label: "Cover", group: "Marketing",
    fields: [
      { key: "src", label: "Image URL", kind: "url" },
      { key: "alt", label: "Alt text", kind: "str" },
      { key: "title", label: "Headline", kind: "txt" },
      { key: "sub", label: "Subhead", kind: "txt" },
      { key: "cta.label", label: "Button label", kind: "str" },
      { key: "cta.href", label: "Button link", kind: "url" },
      { key: "note", label: "Small line under the button", kind: "str" },
    ],
    make: () => ({ type: "cover", src: "", alt: "", title: "", sub: "", cta: { label: "", href: "" } }),
    summary: (b) => t(b, "title"),
  },
  button: {
    label: "Button", group: "Marketing",
    fields: [
      { key: "label", label: "Label", kind: "str" },
      { key: "href", label: "Link", kind: "url" },
    ],
    make: () => ({ type: "button", label: "", href: "" }),
    summary: (b) => t(b, "label"),
  },
  panel: {
    label: "Offer panel", group: "Marketing",
    fields: [
      { key: "big", label: "Big line", kind: "str" },
      { key: "small", label: "Small line", kind: "str" },
    ],
    make: () => ({ type: "panel", big: "", small: "" }),
    summary: (b) => t(b, "big"),
  },
  steps: {
    label: "Numbered steps", group: "Marketing",
    fields: [{ key: "items", label: "Steps", kind: "lines", hint: "One per line." }],
    make: () => ({ type: "steps", items: [] }),
    summary: (b) => `${((b as { items: string[] }).items ?? []).length} steps`,
  },
  chips: {
    label: "Pills", group: "Marketing",
    fields: [{ key: "items", label: "Pills", kind: "lines", hint: "One per line." }],
    make: () => ({ type: "chips", items: [] }),
    summary: (b) => ((b as { items: string[] }).items ?? []).join(" · "),
  },
  grid: {
    label: "Three-across tiles", group: "Marketing",
    fields: [{
      key: "items", label: "Tiles", kind: "items",
      of: [
        { key: "img", label: "Image URL", kind: "url" },
        { key: "alt", label: "Alt", kind: "str" },
        { key: "name", label: "Name", kind: "str" },
        { key: "price", label: "Price", kind: "str" },
        { key: "blurb", label: "One line", kind: "txt" },
        { key: "href", label: "Links to", kind: "url" },
      ],
    }],
    make: () => ({ type: "grid", items: [] }),
    summary: (b) => `${((b as { items: unknown[] }).items ?? []).length} tiles`,
  },
  plans: {
    label: "Price table", group: "Marketing",
    fields: [{
      key: "items", label: "Plans", kind: "items",
      of: [
        { key: "name", label: "Name", kind: "str" },
        { key: "price", label: "Price", kind: "str" },
        { key: "per", label: "Per", kind: "str" },
        { key: "line", label: "One line", kind: "txt" },
        { key: "best", label: "Mark as most popular", kind: "bool" },
      ],
    }],
    make: () => ({ type: "plans", items: [] }),
    summary: (b) => `${((b as { items: unknown[] }).items ?? []).length} plans`,
  },
  chart: {
    label: "Bar chart", group: "Marketing",
    fields: [
      { key: "title", label: "Title", kind: "str" },
      {
        key: "bars", label: "Bars", kind: "items",
        of: [
          { key: "label", label: "Label", kind: "str" },
          { key: "value", label: "Value", kind: "str" },
          { key: "note", label: "Note", kind: "str" },
        ],
      },
    ],
    make: () => ({ type: "chart", title: "", bars: [] }),
    summary: (b) => t(b, "title"),
  },
};

export const blockLabel = (b: Block) => SPECS[b.type]?.label ?? b.type;
export const blockSummary = (b: Block) => {
  const s = SPECS[b.type]?.summary(b) ?? "";
  return s.length > 68 ? s.slice(0, 67) + "…" : s;
};

/** The add menu, grouped. */
export const ADD_GROUPS: Array<{ group: Spec["group"]; types: string[] }> = (
  ["Writing", "Layout", "Media", "Marketing"] as const
).map((group) => ({ group, types: Object.keys(SPECS).filter((k) => SPECS[k].group === group) }));

// ── reading and writing one field, including "left.h" style paths ──────────
export function readField(b: Block, key: string): unknown {
  return key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown> | null)?.[k], b);
}

export function writeField(b: Block, key: string, value: unknown): Block {
  const parts = key.split(".");
  const next = structuredClone(b) as Record<string, unknown>;
  let node = next;
  for (const k of parts.slice(0, -1)) {
    node[k] = { ...(node[k] as Record<string, unknown> ?? {}) };
    node = node[k] as Record<string, unknown>;
  }
  node[parts[parts.length - 1]] = value;
  return next as Block;
}

/** Textarea text → the value the block wants, and back. */
export const toField = (kind: FieldKind, raw: string): unknown => {
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  switch (kind) {
    case "lines": return lines;
    case "rows": return lines.map((l) => l.split("|").map((c) => c.trim()));
    case "pairs": return lines.map((l) => {
      const [k, ...rest] = l.split("|");
      return [k.trim(), rest.join("|").trim()];
    });
    default: return raw;
  }
};

export const fromField = (kind: FieldKind, v: unknown): string => {
  switch (kind) {
    case "lines": return ((v as string[]) ?? []).join("\n");
    case "rows": return ((v as string[][]) ?? []).map((r) => r.join(" | ")).join("\n");
    case "pairs": return ((v as [string, string][]) ?? []).map((r) => r.join(" | ")).join("\n");
    default: return v == null ? "" : String(v);
  }
};
