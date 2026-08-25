import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";
import { type Article, type ArticleBlock, type ArticleCategory } from "@/data/articles";

/**
 * Blog posts authored from the platform console.
 *
 * Two read paths, deliberately different:
 *  - The PUBLIC blog reads `platform_posts` directly with the anon key; RLS
 *    exposes only status='published', so /blog needs no function call.
 *  - The console manages every post (drafts included) through the
 *    platform-posts edge function, which is platform_admins-gated and audited.
 *
 * A published row maps onto the exact same `Article` shape the hardcoded
 * editorial set uses, so the index grid, the article template, prev/next and
 * structured data all render identically for both sources.
 */

export type PlatformPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: ArticleCategory;
  img: string;
  hero: string;
  author: string;
  read_minutes: number;
  body: ArticleBlock[];
  /** 'hidden' only ever marks an override of a code-shipped article: it takes
   *  that article off the public site without touching the code. */
  status: "draft" | "published" | "hidden";
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export function postToArticle(p: PlatformPost): Article {
  const iso = (p.published_at ?? p.created_at).slice(0, 10);
  return {
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    category: p.category,
    img: p.img,
    hero: p.hero,
    author: p.author,
    date: new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    iso,
    readMinutes: p.read_minutes,
    body: p.body,
  };
}

/** What the console has done to the live blog: published posts (which include
 *  edited versions of code-shipped articles, matched by slug) and the slugs of
 *  built-ins that were hidden. Fails soft: the blog must render the built-in
 *  editorial set even if this fetch cannot. */
export async function fetchLiveOverrides(): Promise<{ published: Article[]; hidden: string[] }> {
  try {
    const { data } = await supabase
      .from("platform_posts")
      .select("*")
      .in("status", ["published", "hidden"])
      .order("published_at", { ascending: false });
    const rows = (data as PlatformPost[] | null) ?? [];
    return {
      published: rows.filter((r) => r.status === "published").map(postToArticle),
      hidden: rows.filter((r) => r.status === "hidden").map((r) => r.slug),
    };
  } catch {
    return { published: [], hidden: [] };
  }
}

/** One slug's live state: the published override/post if there is one, and
 *  whether the slug has been hidden from the site. */
export async function fetchPublishedArticle(slug: string): Promise<{ article: Article | null; hidden: boolean }> {
  try {
    const { data } = await supabase
      .from("platform_posts")
      .select("*")
      .in("status", ["published", "hidden"])
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return { article: null, hidden: false };
    const row = data as PlatformPost;
    if (row.status === "hidden") return { article: null, hidden: true };
    return { article: postToArticle(row), hidden: false };
  } catch {
    return { article: null, hidden: false };
  }
}

// ── Console (admin) side ────────────────────────────────────────────────────

const postsFn = async (body: Record<string, unknown>): Promise<{ data: Record<string, unknown> | null; error: string | null }> => {
  const { data, error } = await supabase.functions.invoke("platform-posts", { body });
  if (error) {
    let msg = error.message;
    try { const ctx = await (error as { context?: Response }).context?.json?.(); if (ctx?.error) msg = ctx.error; } catch { /* keep */ }
    return { data: null, error: friendlyError(msg) };
  }
  const d = (data ?? {}) as Record<string, unknown>;
  if (typeof d.error === "string") return { data: null, error: d.error };
  return { data: d, error: null };
};

export async function listPlatformPosts(): Promise<{ posts: PlatformPost[]; error: string | null }> {
  const { data, error } = await postsFn({ action: "list" });
  if (error || !data) return { posts: [], error };
  return { posts: (data.posts as PlatformPost[]) ?? [], error: null };
}

export type PostDraft = {
  id?: string;
  slug: string;
  title: string;
  excerpt: string;
  category: ArticleCategory;
  img: string;
  hero: string;
  author: string;
  read_minutes: number;
  body: ArticleBlock[];
  status: "draft" | "published" | "hidden";
};

/** Open a code-shipped article in the composer: an override draft that will
 *  save as the live version of that slug. */
export function articleToDraft(a: Article): PostDraft {
  return {
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt,
    category: a.category,
    img: a.img,
    hero: a.hero,
    author: a.author,
    read_minutes: a.readMinutes,
    body: a.body,
    status: "published",
  };
}

export async function savePlatformPost(post: PostDraft): Promise<{ post: PlatformPost | null; error: string | null }> {
  const { data, error } = await postsFn({ action: "save", post });
  if (error || !data) return { post: null, error };
  return { post: (data.post as PlatformPost) ?? null, error: null };
}

export async function deletePlatformPost(id: string): Promise<{ ok: boolean; error: string | null }> {
  const { data, error } = await postsFn({ action: "delete", id });
  return { ok: !!data?.ok, error };
}

/** Upload an image to the public blog-media bucket via the gated function;
 *  returns the public URL to drop into img/hero or a body figure. */
export async function uploadBlogImage(file: File): Promise<{ url: string | null; error: string | null }> {
  const data = await new Promise<string | null>((res) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1] ?? null);
    r.onerror = () => res(null);
    r.readAsDataURL(file);
  });
  if (!data) return { url: null, error: "Could not read that file." };
  const { data: d, error } = await postsFn({ action: "upload", name: file.name, type: file.type, data });
  if (error || !d) return { url: null, error };
  return { url: (d.url as string) ?? null, error: null };
}

// ── Sharing ─────────────────────────────────────────────────────────────────

export const postUrl = (slug: string) => `https://www.phoxta.com/blog/${slug}`;

/** Share-intent links for the platforms that accept them. */
export function shareLinks(slug: string, title: string) {
  const url = encodeURIComponent(postUrl(slug));
  const text = encodeURIComponent(title);
  return [
    { name: "X", href: `https://twitter.com/intent/tweet?url=${url}&text=${text}` },
    { name: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${url}` },
    { name: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${url}` },
    { name: "WhatsApp", href: `https://wa.me/?text=${text}%20${url}` },
  ];
}
