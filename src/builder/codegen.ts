import type { PageDocument } from "./types";
import { getManifest } from "./registry";

type Block = { type: string; props?: Record<string, unknown> };

/**
 * "Eject to .tsx": generate a real Phoxta page component from a Studio document.
 *
 * This is the second of the two storage models — the runtime JSON renders from
 * cms_pages, while this emits source you can commit into src/pages (then add a
 * <Route> + menu entry per the project's rules). Imports resolve to the exact
 * section sources via the registry, so the generated page uses the real
 * components with full functionality/animation.
 */
export function documentToTsx(doc: PageDocument, componentName = "GeneratedPage"): string {
  const content = ((doc as { content?: Block[] }).content ?? []) as Block[];
  const root = ((doc as { root?: { props?: Record<string, unknown> } }).root?.props ?? {}) as { title?: string };

  // One import alias per distinct section source.
  const aliasBySource = new Map<string, string>();
  const imports: string[] = [];
  let idx = 0;
  const aliasFor = (type: string): string | null => {
    const m = getManifest(type);
    if (!m) return null;
    if (!aliasBySource.has(m.source)) {
      const alias = `S${idx++}`;
      aliasBySource.set(m.source, alias);
      imports.push(`import ${alias} from "@/shared/sections/${m.source}";`);
    }
    return aliasBySource.get(m.source) as string;
  };

  const body = content
    .map((block) => {
      const alias = aliasFor(block.type);
      if (!alias) return `      {/* unregistered section: ${block.type} */}`;
      const props = Object.entries(block.props ?? {}).filter(([k]) => k !== "id" && block.props![k] !== undefined);
      if (props.length === 0) return `      <${alias} />`;
      // Brace-wrap every value so strings with quotes, arrays and objects are all safe.
      const attrs = props.map(([k, v]) => `${k}={${JSON.stringify(v)}}`).join(" ");
      return `      <${alias} ${attrs} />`;
    })
    .join("\n");

  return `import PageMeta from "@/seo/PageMeta";
${imports.join("\n")}

// AUTO-GENERATED from a Phoxta Studio document.
// To ship: drop this in src/pages, then add a <Route> in src/App.tsx and (if
// user-reachable) a menu entry in src/shared/MainMenu.tsx.
export default function ${componentName}() {
  return (
    <>
      <PageMeta title={${JSON.stringify(`Phoxta - ${root.title ?? componentName}`)}} />
${body}
    </>
  );
}
`;
}
