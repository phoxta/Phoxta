import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";
import { listPlatformPosts } from "@/lib/db/platformPosts";
import { resolveConsole } from "@/lib/ops/consoleConfig";
import type { Block } from "@email";

/**
 * The email studio's API.
 *
 * Composed mail is stored as BLOCKS, never as HTML. The console renders the
 * preview by importing the same module the edge function imports, so what is on
 * screen and what is sent come from one renderer — and a saved email picks up
 * every later fix to the layout without anyone reopening it. Storing HTML would
 * fork the design the moment the template changed, and that drift only ever
 * turns up in somebody's inbox.
 */

export type EmailKind = "campaign" | "post" | "brochure";

export type EmailTemplate = {
  id: string;
  name: string;
  kind: EmailKind;
  subject: string;
  preheader: string;
  strap: string;
  footnote: string;
  blocks: Block[];
  source_slug: string | null;
  status: "draft" | "ready" | "sent";
  updated_at: string;
};

export type EmailSummary = Pick<
  EmailTemplate, "id" | "name" | "kind" | "subject" | "preheader" | "status" | "source_slug" | "updated_at"
>;

async function call<T>(action: string, payload: Record<string, unknown> = {}): Promise<{ data: T | null; error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke("email-studio", { body: { action, ...payload } });
    if (error) return { data: null, error: friendlyError(String((error as Error)?.message ?? error)) };
    if (data?.error) return { data: null, error: String(data.error) };
    return { data: data as T, error: null };
  } catch (e) {
    return { data: null, error: friendlyError(String((e as Error)?.message ?? e)) };
  }
}

export const listEmails = () => call<{ templates: EmailSummary[] }>("list");
export const getEmail = (id: string) => call<{ template: EmailTemplate }>("get", { id });
export const deleteEmail = (id: string) => call<{ ok: true }>("delete", { id });

export const saveEmail = (t: Partial<EmailTemplate> & { blocks: Block[] }) =>
  call<{ id: string }>("save", {
    id: t.id, name: t.name, kind: t.kind, subject: t.subject, preheader: t.preheader,
    strap: t.strap, footnote: t.footnote, blocks: t.blocks, sourceSlug: t.source_slug,
  });

/** Pull a published post in as an editable email. */
export const emailFromPost = (slug: string) =>
  call<{ template: Omit<EmailTemplate, "id" | "status" | "updated_at"> }>("fromPost", { slug });

/** Send one copy to yourself. Deliberately NOT written to the send ledger — a
 *  test must not burn the recipient's one copy of the real thing. */
export const sendTest = (t: Partial<EmailTemplate> & { blocks: Block[] }, to: string) =>
  call<{ ok: boolean; id?: string; error?: unknown }>("test", { ...t, to });

/**
 * Send it for real.
 *
 * `force` overrides the short double-send window — NOT the opt-out list, which
 * has no override and never will. A refusal that carries `resendable` is the
 * window asking a question; one without it is a hard no.
 */
export const sendEmail = (t: Partial<EmailTemplate> & { blocks: Block[] }, to: string, force = false) =>
  call<{ ok: boolean; id?: string; skipped?: string; at?: string; resendable?: boolean }>(
    "send", { ...t, to, force },
  );

// ── Where "From the blog" comes from ────────────────────────────────────────

/** A tenant's own post, straight off blog_posts — the storefront blog, the
 *  same table the calendar's blog lane reads. */
export type TenantPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  cover_url: string | null;
  author: string;
  published_at: string | null;
};

/** One row of the picker's blog list, wherever the blog lives. A platform
 *  entry opens through the email-studio function (emailFromPost, which knows
 *  structured article blocks); a tenant entry carries its whole row, because
 *  no function converts tenant posts — emailFromTenantPost below does. */
export type BlogStart = { slug: string; title: string; excerpt: string; tenant?: TenantPost };

/**
 * Whose blog feeds the template picker.
 *
 * The platform org gets platform_posts — Phoxta's own editorial, written under
 * Platform → Blog. Every other org gets ITS OWN blog_posts. It used to be
 * platform_posts for everyone, which offered a tenant Phoxta's articles to
 * mail to the tenant's customers: somebody else's content under their name.
 * Platform-or-not mirrors the console registry — only the platform vertical's
 * console carries the "platform" module.
 */
export async function listBlogStarts(
  orgId: string,
): Promise<{ data: BlogStart[]; source: "platform" | "tenant"; error: string | null }> {
  const { data: org } = await supabase.from("organizations").select("vertical").eq("id", orgId).maybeSingle();
  const isPlatform = resolveConsole((org as { vertical?: string | null } | null)?.vertical).modules.includes("platform");

  if (isPlatform) {
    const { posts, error } = await listPlatformPosts();
    return {
      data: posts
        .filter((p) => p.status === "published")
        .map((p) => ({ slug: p.slug, title: p.title, excerpt: p.excerpt })),
      source: "platform",
      error,
    };
  }

  const { data, error } = await supabase
    .from("blog_posts")
    .select("id, slug, title, excerpt, body, cover_url, author, published_at")
    .eq("organization_id", orgId)
    .eq("status", "published")
    .order("published_at", { ascending: false });
  const rows = (data as TenantPost[] | null) ?? [];
  return {
    data: rows.map((p) => ({ slug: p.slug, title: p.title, excerpt: p.excerpt, tenant: p })),
    source: "tenant",
    error: friendlyError(error?.message),
  };
}

/**
 * A tenant post as an editable email. A platform post goes through fromPost on
 * the edge function because its body is structured article blocks; a tenant
 * post's body is one text column, so the shape is simpler and made right here:
 * cover on top, byline under the title, paragraphs split on blank lines.
 */
export function emailFromTenantPost(p: TenantPost): Omit<EmailTemplate, "id" | "status" | "updated_at"> {
  const date = p.published_at
    ? new Date(p.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : "";
  const paragraphs = p.body.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
  return {
    name: p.title,
    kind: "post",
    subject: p.title,
    preheader: p.excerpt,
    strap: "From the blog",
    footnote: "You are receiving this because you asked to hear from us.",
    source_slug: p.slug,
    blocks: [
      { type: "section", label: "From the blog", title: p.title },
      ...(p.cover_url ? [{ type: "figure", img: p.cover_url, alt: p.title } as Block] : []),
      { type: "byline", author: p.author, date },
      ...paragraphs.map((text): Block => ({ type: "text", text })),
    ],
  };
}
