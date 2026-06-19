import type { ReactNode } from "react";
import type { Config, Field } from "@measured/puck";
import { SECTION_MANIFESTS } from "./registry";
import { DEFAULT_LAYOUT } from "./types";
import SectionHost from "./SectionHost";
import EditableSection from "./EditableSection";
import EditContentField from "./EditContentField";
import type { SectionEdits } from "./edits";

// Universal field: every section gets a "Text & images" content editor that
// works even when the section exposes no structured fields of its own.
const EDITS_FIELD: Field = {
  type: "custom",
  label: "Text & images",
  render: (props: { value?: SectionEdits; onChange: (v: SectionEdits) => void }) => (
    <EditContentField value={props.value} onChange={props.onChange} />
  ),
} as Field;

/**
 * Build the Puck config from the section registry. The same config powers both
 * the editor (`<Puck>`) and the runtime renderer (`<Render>`), so what you drag
 * is exactly what ships.
 *
 * Each component's `render` strips the props Puck injects (`puck`, `editMode`,
 * `id`) and forwards the remaining field values straight to the real section
 * component — preserving its full functionality, dependencies and (when effects
 * are mounted) its GSAP motion.
 */
export function buildPuckConfig(): Config {
  const components: Record<string, unknown> = {};
  const categories: Record<string, { title?: string; components: string[] }> = {};

  for (const m of SECTION_MANIFESTS) {
    const Section = m.component;
    components[m.type] = {
      label: m.label,
      // Structured fields (if any) + the universal content editor.
      fields: { ...(m.fields ?? {}), _edits: EDITS_FIELD },
      defaultProps: m.defaultProps ?? {},
      render: (props: Record<string, unknown>) => {
        const { puck, editMode, id, _edits, ...sectionProps } = props as Record<string, unknown>;
        void puck;
        void editMode;
        return (
          <SectionHost name={m.label}>
            <EditableSection blockId={id as string | undefined} edits={_edits as never}>
              <Section {...sectionProps} />
            </EditableSection>
          </SectionHost>
        );
      },
    };

    const group = (categories[m.group] ??= { title: m.group, components: [] });
    group.components.push(m.type);
  }

  return {
    root: {
      fields: {
        title: { type: "text", label: "Page title" },
        headerStyle: { type: "number", label: "Header style (1–15)", min: 1, max: 15 },
        footerStyle: { type: "number", label: "Footer style (1–15)", min: 1, max: 15 },
        mainClass: { type: "text", label: "Main CSS class" },
      },
      defaultProps: { ...DEFAULT_LAYOUT },
      render: ({ children }: { children: ReactNode }) => <>{children}</>,
    },
    components,
    categories,
  } as unknown as Config;
}

/** Shared, memoized config instance used by the editor and the renderer. */
export const puckConfig = buildPuckConfig();
