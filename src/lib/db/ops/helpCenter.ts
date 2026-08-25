import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";
import { type ArticleBlock } from "@/data/articles";

/**
 * Per-tenant public Help Center.
 *
 * Two read paths, deliberately different (mirrors platformPosts.ts):
 *  - The PUBLIC help center (/help/:org, /help/:org/:slug) reads
 *    `help_articles` directly with the anon key; RLS exposes only
 *    status='published', and app_help_org() resolves the business from its
 *    public slug — so the public pages need no function call.
 *  - The operating console manages every article (drafts included) through
 *    the help-center edge function, which is org-member gated and audited.
 */

export type HelpArticle = {
  id: string;
  organization_id: string;
  slug: string;
  title: string;
  excerpt: string;
  /** Free-text grouping ("Getting started", "Billing", …). Default "General". */
  category: string;
  /** Optional wide hero image URL; empty string means no hero. */
  hero: string;
  body: ArticleBlock[];
  status: "draft" | "published";
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type HelpDraft = {
  id?: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  hero: string;
  body: ArticleBlock[];
  status: "draft" | "published";
};

/** Public-safe identity of a business with a live help center. */
export type PublicHelpOrg = {
  id: string;
  name: string;
  slug: string | null;
  branding: Record<string, unknown>;
};

// ── Public readers (anon RLS, fail-soft) ────────────────────────────────────

/** Resolve /help/:org — slug or raw org id. Null when the business has no
 *  published help article (the RPC deliberately hides everything else). */
export async function fetchPublicHelpOrg(orgSlugOrId: string): Promise<PublicHelpOrg | null> {
  try {
    const { data } = await supabase.rpc("app_help_org", { p_slug: orgSlugOrId });
    const row = (Array.isArray(data) ? data[0] : data) as PublicHelpOrg | undefined;
    return row?.id ? row : null;
  } catch {
    return null;
  }
}

/** The public help index: the business plus its published articles. */
export async function fetchPublicHelpIndex(
  orgSlugOrId: string,
): Promise<{ org: PublicHelpOrg | null; articles: HelpArticle[] }> {
  const org = await fetchPublicHelpOrg(orgSlugOrId);
  if (!org) return { org: null, articles: [] };
  try {
    const { data } = await supabase
      .from("help_articles")
      .select("*")
      .eq("organization_id", org.id)
      .eq("status", "published")
      .order("category", { ascending: true })
      .order("title", { ascending: true });
    return { org, articles: (data as HelpArticle[] | null) ?? [] };
  } catch {
    return { org, articles: [] };
  }
}

/** One published article for /help/:org/:slug. */
export async function fetchPublicHelpArticle(
  orgSlugOrId: string,
  slug: string,
): Promise<{ org: PublicHelpOrg | null; article: HelpArticle | null }> {
  const org = await fetchPublicHelpOrg(orgSlugOrId);
  if (!org) return { org: null, article: null };
  try {
    const { data } = await supabase
      .from("help_articles")
      .select("*")
      .eq("organization_id", org.id)
      .eq("status", "published")
      .eq("slug", slug)
      .maybeSingle();
    return { org, article: (data as HelpArticle | null) ?? null };
  } catch {
    return { org, article: null };
  }
}

/** SPA path of a business's help center (or one article in it). */
export function publicHelpPath(orgSlug: string, slug?: string): string {
  return slug ? `/help/${orgSlug}/${slug}` : `/help/${orgSlug}`;
}

// ── Console (org member) side — via the gated edge function ─────────────────

const helpFn = async (body: Record<string, unknown>): Promise<{ data: Record<string, unknown> | null; error: string | null }> => {
  const { data, error } = await supabase.functions.invoke("help-center", { body });
  if (error) {
    let msg = error.message;
    try { const ctx = await (error as { context?: Response }).context?.json?.(); if (ctx?.error) msg = ctx.error; } catch { /* keep */ }
    return { data: null, error: friendlyError(msg) };
  }
  const d = (data ?? {}) as Record<string, unknown>;
  if (typeof d.error === "string") return { data: null, error: d.error };
  return { data: d, error: null };
};

export async function listHelpArticles(orgId: string): Promise<{ articles: HelpArticle[]; error: string | null }> {
  const { data, error } = await helpFn({ action: "list", orgId });
  if (error || !data) return { articles: [], error };
  return { articles: (data.articles as HelpArticle[]) ?? [], error: null };
}

export async function saveHelpArticle(orgId: string, article: HelpDraft): Promise<{ article: HelpArticle | null; error: string | null }> {
  const { data, error } = await helpFn({ action: "save", orgId, article });
  if (error || !data) return { article: null, error };
  return { article: (data.article as HelpArticle) ?? null, error: null };
}

export async function deleteHelpArticle(orgId: string, id: string): Promise<{ ok: boolean; error: string | null }> {
  const { data, error } = await helpFn({ action: "delete", orgId, id });
  return { ok: !!data?.ok, error };
}

/** Upload an image to the public help-media bucket via the gated function;
 *  returns the public URL to drop into the hero or a body figure. */
export async function uploadHelpImage(orgId: string, file: File): Promise<{ url: string | null; error: string | null }> {
  const data = await new Promise<string | null>((res) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1] ?? null);
    r.onerror = () => res(null);
    r.readAsDataURL(file);
  });
  if (!data) return { url: null, error: "Could not read that file." };
  const { data: d, error } = await helpFn({ action: "upload", orgId, name: file.name, type: file.type, data });
  if (error || !d) return { url: null, error };
  return { url: (d.url as string) ?? null, error: null };
}
