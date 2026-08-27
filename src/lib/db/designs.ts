import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";
import type { Deck, DesignDoc } from "@/lib/designs/types";
import { catalogue } from "@/lib/designs/templates";

/**
 * Designs: the graphics studio's data layer.
 *
 * Thin on purpose. A design is content, the layout is code, and the PNG is
 * rendered in the browser — so there is nothing here but rows in and rows out.
 */

export type DesignStatus = "draft" | "ready" | "archived";

export type Design = {
  id: string;
  organization_id: string;
  title: string;
  template_id: string;
  /** One design, or a carousel of them. See asDeck in designs/types. */
  doc: DesignDoc | Deck;
  status: DesignStatus;
  brief: string | null;
  created_at: string;
  updated_at: string;
};

const SELECT = "id, organization_id, title, template_id, doc, status, brief, created_at, updated_at";

export async function listDesigns(orgId: string): Promise<{ data: Design[]; error: string | null }> {
  const { data, error } = await supabase
    .from("designs").select(SELECT)
    .eq("organization_id", orgId)
    .neq("status", "archived")
    .order("updated_at", { ascending: false });
  return { data: (data as Design[] | null) ?? [], error: friendlyError(error?.message) };
}

export async function getDesign(id: string): Promise<{ data: Design | null; error: string | null }> {
  const { data, error } = await supabase.from("designs").select(SELECT).eq("id", id).maybeSingle();
  return { data: (data as Design | null) ?? null, error: friendlyError(error?.message) };
}

export async function createDesign(
  orgId: string,
  input: { title: string; templateId: string; doc: DesignDoc | Deck; brief?: string },
): Promise<{ data: Design | null; error: string | null }> {
  const { data: session } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("designs")
    .insert({
      organization_id: orgId,
      title: input.title.trim() || "Untitled post",
      template_id: input.templateId,
      doc: input.doc,
      brief: input.brief ?? null,
      created_by: session?.user?.id ?? null,
    })
    .select(SELECT)
    .single();
  return { data: (data as Design | null) ?? null, error: friendlyError(error?.message) };
}

export async function saveDesign(
  id: string,
  patch: Partial<Pick<Design, "title" | "doc" | "status" | "template_id" | "brief">>,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("designs").update(patch).eq("id", id);
  return { error: friendlyError(error?.message) };
}

/** Archive rather than delete — a post someone spent an hour on should be
 *  recoverable, and the list already filters archived rows out. */
export async function archiveDesign(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("designs").update({ status: "archived" }).eq("id", id);
  return { error: friendlyError(error?.message) };
}

/* ── The agent ───────────────────────────────────────────────────────────── */

export type GeneratedDesign = {
  title: string;
  templateId: string;
  content: Record<string, string>;
  images: Record<string, { url: string; alt?: string; photographer?: string; photographerUrl?: string; source?: "pexels" }>;
  palette?: Record<string, string>;
};

/**
 * Write a post from a brief.
 *
 * `templateId` is optional: without it the model picks the layout that fits
 * what is being said, which is usually a better choice than the one the founder
 * happened to be looking at. With it, the layout is pinned and only the copy and
 * photographs change — which is what "regenerate" has to mean once someone has
 * chosen a template on purpose.
 */
export async function generateDesign(
  orgId: string,
  brief: string,
  templateId?: string,
): Promise<{ data: GeneratedDesign | null; error: string | null }> {
  // The catalogue travels with the brief so the function never holds a stale
  // copy of the pack. It is the client's own template list, used only to fill
  // the client's own design, so nothing is trusted across a privilege boundary.
  const { data, error } = await supabase.functions.invoke("design-generate", {
    body: { orgId, brief, templateId, catalogue: catalogue() },
  });
  if (error) {
    let msg = error.message;
    try {
      const ctx = await (error as { context?: Response }).context?.json?.();
      if (ctx?.error) msg = ctx.error;
    } catch {
      /* keep the generic message */
    }
    return { data: null, error: friendlyError(msg) };
  }
  const d = (data ?? {}) as { design?: GeneratedDesign; error?: string };
  if (d.error) return { data: null, error: d.error };
  return { data: d.design ?? null, error: null };
}

/* ── The image library ───────────────────────────────────────────────────── */

export type LibraryImage = {
  url: string;
  thumb?: string;
  alt?: string;
  photographer?: string;
  photographerUrl?: string;
  source?: "pexels" | "generated" | "upload";
};

/*
 * Searching and generating pictures used to live here, against an
 * `image-library` function. Both moved to `@/lib/db/ops/designAssets` and the
 * `design-assets` function when the asset library was built, because a picture
 * found or generated in the editor now has to be STORED in the business's own
 * library rather than handed straight to one design — which meant the same
 * call had to write to storage, and that is the other function's job.
 *
 * `LibraryImage` above stays: it is the shape both surfaces speak.
 */
