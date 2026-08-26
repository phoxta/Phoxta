/**
 * The shape the Figma extractor emits.
 *
 * Deliberately separate from the app's Layer type. The extractor speaks Figma's
 * vocabulary — literal hexes, font families, text case — and the app speaks in
 * palette roles. Keeping them apart means the generated file is a faithful dump
 * of what is in Figma, and the mapping to Phoxta's palette lives in one place
 * that can be read and argued with, rather than being smeared through a script
 * nobody reads because it is generated.
 */

export type RawLayer =
  | { id: string; type: "rect"; x: number; y: number; w: number; h: number; fillHex: string; opacity?: number; radius?: number; strokeHex?: string; strokeWidth?: number }
  | { id: string; type: "gradient"; x: number; y: number; w: number; h: number; fromHex: string; toHex: string; angle: number; radius?: number }
  | { id: string; type: "asset"; x: number; y: number; w: number; h: number; src: string; opacity?: number }
  | { id: string; type: "image"; x: number; y: number; w: number; h: number; slot: string; radius?: number }
  | {
      id: string; type: "text"; x: number; y: number; w: number; h: number;
      slot: string; font: string; size: number; weight: number; italic?: boolean;
      lineHeight: number; tracking: number; align: string; textCase: string | null; fillHex: string;
    };

/**
 * A span of a text node whose styling differs from the node's own.
 *
 * Still in Figma's vocabulary: a literal hex rather than a palette role, an
 * absolute point size rather than a multiplier. fromRaw converts both.
 */
export type RawRun = {
  text: string;
  fillHex?: string;
  weight?: number;
  size?: number;
  font?: string;
  italic?: boolean;
};

export type RawTemplate = {
  layers: RawLayer[];
  /** A plain string unless the node carries per-character styling. */
  content: Record<string, string | RawRun[]>;
};
