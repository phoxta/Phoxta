import { materialise } from "@/lib/designs/edit";
import { emptyDoc } from "@/lib/designs/types";
export type Design = Record<string, unknown>;
export async function getDesign() {
  return { data: {
    id: "d1", organization_id: "o1", title: "Autumn drop", template_id: "v1",
    doc: materialise(emptyDoc("v1")), status: "ready", brief: null,
    png_url: null, png_path: null,
  }, error: null };
}
