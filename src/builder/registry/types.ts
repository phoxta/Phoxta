import type { ComponentType } from "react";
import type { Field } from "@measured/puck";

/**
 * One entry in the section registry: the bridge between a real Phoxta section
 * component and the visual builder. Every existing section can be registered;
 * `fields` is filled in incrementally as sections are parameterized for editing.
 */
export type SectionManifest = {
  /**
   * Puck component type — unique, no slashes. This is what gets written into the
   * saved document as a block `type`, so keep it stable once shipped.
   */
  type: string;
  /**
   * Source path under `src/shared/sections` (e.g. "about-1/Section1"). Used by
   * the import script and the codegen "eject to .tsx" export.
   */
  source: string;
  /** Default export name to use when generating import statements (codegen). */
  exportName?: string;
  /** Human-friendly label shown in the palette. */
  label: string;
  /** Palette category, e.g. "Heroes", "Content", "CTAs". */
  group: string;
  /** The real section component, rendered live in the canvas and at runtime. */
  component: ComponentType<Record<string, unknown>>;
  /**
   * Editable fields (Puck field config). Empty/omitted means the section is
   * registered as render-as-is (draggable, not yet text/image editable).
   */
  fields?: Record<string, Field>;
  /** Default field values — should mirror the section's built-in content. */
  defaultProps?: Record<string, unknown>;
  /** True once the section exposes editable fields (drives palette badges/UX). */
  editable?: boolean;
  /** Optional preview thumbnail path under /public. */
  thumbnail?: string;
};
