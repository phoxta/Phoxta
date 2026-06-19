import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";
import { emptyDocument, type PageDocument } from "@/builder/types";

export type PageStatus = "draft" | "published";
/** "markdown" = legacy body-text page; "visual" = Studio page builder document. */
export type PageKind = "markdown" | "visual";
export type CmsPage = {
  id: string;
  slug: string;
  title: string;
  body: string;
  status: PageStatus;
  published_at: string | null;
  revalidated_at: string | null;
  updated_at: string;
  kind: PageKind;
  document: PageDocument | null;
  header_style: number | null;
  footer_style: number | null;
};

const SELECT =
  "id, slug, title, body, status, published_at, revalidated_at, updated_at, kind, document, header_style, footer_style";

export async function listPages(orgId: string): Promise<{ data: CmsPage[]; error: string | null }> {
  const { data, error } = await supabase
    .from("cms_pages")
    .select(SELECT)
    .eq("organization_id", orgId)
    .order("updated_at", { ascending: false });
  return { data: (data as CmsPage[] | null) ?? [], error: friendlyError(error?.message) };
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

export async function createPage(
  orgId: string,
  input: { title: string; slug?: string; body?: string },
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("cms_pages").insert({
    organization_id: orgId,
    slug: input.slug?.trim() || slugify(input.title) || `page-${Date.now().toString().slice(-5)}`,
    title: input.title.trim(),
    body: input.body ?? "",
    status: "draft",
  });
  return { error: friendlyError(error?.message) };
}

export async function updatePage(
  id: string,
  patch: Partial<Pick<CmsPage, "title" | "body" | "slug">>,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("cms_pages").update(patch).eq("id", id);
  return { error: friendlyError(error?.message) };
}

/** Publish a page: draft -> published + stamp publish/revalidate times. */
export async function publishPage(id: string): Promise<{ error: string | null }> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("cms_pages")
    .update({ status: "published", published_at: now, revalidated_at: now })
    .eq("id", id);
  return { error: friendlyError(error?.message) };
}

export async function unpublishPage(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("cms_pages").update({ status: "draft" }).eq("id", id);
  return { error: friendlyError(error?.message) };
}

/** Re-trigger the storefront's cache revalidation for a published page. */
export async function revalidatePage(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("cms_pages")
    .update({ revalidated_at: new Date().toISOString() })
    .eq("id", id);
  return { error: friendlyError(error?.message) };
}

// ---------------------------------------------------------------------------
// Visual pages (Studio page builder). These read/write the `document` JSON tree
// added in migration 0020; legacy markdown pages above are untouched.
// ---------------------------------------------------------------------------

/** Load one page (with its visual document, if any). */
export async function getPage(id: string): Promise<{ data: CmsPage | null; error: string | null }> {
  const { data, error } = await supabase.from("cms_pages").select(SELECT).eq("id", id).maybeSingle();
  return { data: (data as CmsPage | null) ?? null, error: friendlyError(error?.message) };
}

/**
 * Load a PUBLISHED page by org + slug for the public storefront route. Readable
 * with the anon key via the public-read policy (migration 0021); drafts return
 * nothing here.
 */
export async function getPublishedPage(
  orgId: string,
  slug: string,
): Promise<{ data: CmsPage | null; error: string | null }> {
  const { data, error } = await supabase
    .from("cms_pages")
    .select(SELECT)
    .eq("organization_id", orgId)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return { data: (data as CmsPage | null) ?? null, error: friendlyError(error?.message) };
}

/**
 * Create a visual page. With no `document` it starts blank; pass a `document`
 * (e.g. from a starter template) to seed its section tree.
 */
export async function createVisualPage(
  orgId: string,
  input: { title: string; slug?: string; document?: PageDocument },
): Promise<{ id: string | null; error: string | null }> {
  const title = input.title.trim();
  const { data, error } = await supabase
    .from("cms_pages")
    .insert({
      organization_id: orgId,
      slug: input.slug?.trim() || slugify(title) || `page-${Date.now().toString().slice(-5)}`,
      title,
      body: "",
      status: "draft",
      kind: "visual",
      document: input.document ?? emptyDocument({ title }),
    })
    .select("id")
    .single();
  return { id: (data as { id: string } | null)?.id ?? null, error: friendlyError(error?.message) };
}

/** Persist the visual document (and optional layout/title) for a page. */
export async function saveDocument(
  id: string,
  patch: { document: PageDocument; title?: string; header_style?: number; footer_style?: number },
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("cms_pages")
    .update({
      document: patch.document,
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.header_style !== undefined ? { header_style: patch.header_style } : {}),
      ...(patch.footer_style !== undefined ? { footer_style: patch.footer_style } : {}),
    })
    .eq("id", id);
  return { error: friendlyError(error?.message) };
}
