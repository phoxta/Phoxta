import type { SectionManifest } from "./types";
import { SEED_MANIFESTS } from "./manifests";
import { GENERATED_MANIFESTS } from "./generated";

/**
 * The full section registry: every auto-extracted section, with the hand-tuned
 * SEED entries (which add editable fields) overriding the generated render-as-is
 * version of the same source. Seed entries come first so they lead the palette.
 */
const seedSources = new Set(SEED_MANIFESTS.map((m) => m.source));
export const SECTION_MANIFESTS: SectionManifest[] = [
  ...SEED_MANIFESTS,
  ...GENERATED_MANIFESTS.filter((m) => !seedSources.has(m.source)),
];

/** Distinct palette groups, in first-seen order. */
export const SECTION_GROUPS: string[] = SECTION_MANIFESTS.reduce<string[]>((groups, m) => {
  if (!groups.includes(m.group)) groups.push(m.group);
  return groups;
}, []);

/** Look up a manifest by its Puck component type (a block's `type`). */
export function getManifest(type: string): SectionManifest | undefined {
  return SECTION_MANIFESTS.find((m) => m.type === type);
}

export type CatalogEntry = {
  type: string;
  label: string;
  group: string;
  editable: boolean;
  /** Editable field name -> field kind (e.g. "text", "textarea", "array"). */
  fields: Record<string, string>;
};

/**
 * A compact, serializable description of every registered section — what it is
 * and which fields can be edited. Sent to the AI `page_edit` action and the
 * voice agent so they can compose pages with only real, valid sections/fields.
 */
export function buildCatalog(): CatalogEntry[] {
  return SECTION_MANIFESTS.map((m) => ({
    type: m.type,
    label: m.label,
    group: m.group,
    editable: Boolean(m.editable),
    fields: Object.fromEntries(Object.entries(m.fields ?? {}).map(([k, f]) => [k, (f as { type: string }).type])),
  }));
}

export type { SectionManifest } from "./types";
