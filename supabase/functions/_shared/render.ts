// Phoxta — rendering a design to a file, shared.
//
// Lives in _shared rather than inside the design-render function because
// social-publish calls it too: a planned post carries a design and no picture
// until the day it goes out. Importing it from the function's index.ts would
// have executed that file's Deno.serve and started a second server inside the
// publisher.
import { adminClient } from "./supabaseAdmin.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

const env = (k: string) => Deno.env.get(k) ?? "";

const BUCKET = "design-assets";

/**
 * Why a render did not happen — and the caller MUST act on the difference:
 *
 *   config       RENDER_URL / RENDER_SECRET are not set. Nothing about the
 *                design; the publisher treats it like `unreachable`, and the
 *                message names the secrets so the ops log says what to fix.
 *   unreachable  The box could not be reached, or answered with anything that
 *                is a fact about the box or our secret (5xx, 401) rather than
 *                about the design. Retrying WILL eventually work — treating
 *                this as a failure of the post is the bug that killed every
 *                month-plan post while the box was down.
 *   unrenderable A 422 from the service: THIS design cannot be rendered as it
 *                stands (a photo could not be inlined — the x-render-missing
 *                header carries which). The same doc gets the same 422 for
 *                ever, so retrying is spending attempts on a certainty.
 *   data         Our own side: the design row is missing, or the storage/row
 *                writes failed. Worth the normal retry budget.
 */
export type RenderFailure = {
  error: string;
  kind: "config" | "unreachable" | "unrenderable" | "data";
};

/**
 * True when the stored export is older than the design's last real edit.
 *
 * png_at is written by the same row update that records the export, and the
 * designs_touch trigger bumps updated_at on that very update — so the two are
 * never exactly equal, and a naive `updated_at > png_at` would call EVERY
 * design stale for ever. Ten seconds of slack separates "the export's own
 * write" from "somebody edited it afterwards"; nobody re-words a post within
 * ten seconds of a render and needs the difference published.
 */
export function designChangedSinceExport(
  d: { png_at?: string | null; updated_at?: string | null } | null | undefined,
): boolean {
  if (!d?.png_at) return true;
  if (!d?.updated_at) return false;
  return new Date(d.updated_at).getTime() - new Date(d.png_at).getTime() > 10_000;
}

/**
 * Render one design and store the result.
 *
 * Exported because the planner calls it directly: a plan that makes thirty
 * designs must not make thirty HTTP round trips through its own gateway.
 *
 * `format: "jpeg"` is what the publisher asks for — the platforms re-encode
 * everything anyway and a JPEG uploads in a fraction of the bytes. The file
 * still lands in the png_url/png_path/png_at columns: they mean "the saved
 * export", and renaming three columns over an encoding was not worth a
 * migration.
 */
export async function renderDesign(
  admin: ReturnType<typeof adminClient>,
  orgId: string,
  designId: string,
  opts: { format?: "png" | "jpeg" } = {},
): Promise<{ url: string; path: string } | RenderFailure> {
  const base = env("RENDER_URL");
  const secret = env("RENDER_SECRET");
  if (!base || !secret) {
    return { kind: "config", error: "The render service is not configured (RENDER_URL / RENDER_SECRET)." };
  }

  const { data: d } = await admin.from("designs")
    .select("id, title, template_id, doc, png_path")
    .eq("id", designId).eq("organization_id", orgId).maybeSingle();
  if (!d) return { kind: "data", error: "That design is not in this business." };

  const format = opts.format === "jpeg" ? "jpeg" : "png";

  let bytes: Uint8Array;
  try {
    const res = await fetch(`${base}/render`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-render-secret": secret },
      body: JSON.stringify({ doc: (d as Json).doc, templateId: (d as Json).template_id, scale: 2, format }),
    });
    if (res.status === 422) {
      // The service's contract: 422 with x-render-missing when a photo could
      // not be inlined. That is a fact about THIS design, not about the box.
      const missing = res.headers.get("x-render-missing") ?? "";
      const why = (await res.text().catch(() => "")).slice(0, 200);
      return {
        kind: "unrenderable",
        error: missing
          ? `a picture in it could not be fetched (${missing.slice(0, 200)})`
          : (why || "the renderer could not complete it"),
      };
    }
    if (!res.ok) {
      // 5xx is the box in trouble; 401/403 is OUR secret being wrong. Neither
      // says anything about the design, so neither is allowed to fail it.
      const why = await res.text().catch(() => "");
      return { kind: "unreachable", error: `The renderer answered HTTP ${res.status} ${why.slice(0, 200)}` };
    }
    bytes = new Uint8Array(await res.arrayBuffer());
  } catch (e) {
    // The box being unreachable is a different problem from the design being
    // unrenderable, and the caller can only act on the difference.
    return { kind: "unreachable", error: `The renderer could not be reached: ${(e as Error)?.message ?? e}` };
  }
  if (bytes.byteLength < 1000) return { kind: "unreachable", error: "The renderer returned an empty picture." };

  try { await admin.storage.createBucket(BUCKET, { public: true }); } catch { /* already exists */ }

  const slug = String((d as Json).title ?? "design").replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "design";
  const path = `${orgId}/${crypto.randomUUID()}-${slug}.${format === "jpeg" ? "jpg" : "png"}`;
  const { error: upErr } = await admin.storage.from(BUCKET)
    .upload(path, bytes, { contentType: format === "jpeg" ? "image/jpeg" : "image/png", upsert: false });
  if (upErr) return { kind: "data", error: upErr.message };

  const url = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  // png_at is what makes staleness knowable at all (designChangedSinceExport,
  // and the cooldown in design-render). It was only ever written by the
  // browser's save path before, so a server-side render looked permanently
  // stale to anything that checked.
  const { error: rowErr } = await admin.from("designs")
    .update({ png_url: url, png_path: path, png_at: new Date().toISOString() })
    .eq("id", designId);
  if (rowErr) return { kind: "data", error: rowErr.message };

  // Only after the row points at the new file — an orphan in the library is
  // untidy; a deleted file the row still points at is a broken picture in
  // front of a customer. And only when NO post still carries the old file's
  // URL: a queued social_posts.media_url is a promise to publish exactly that
  // picture, and deleting it out from under the queue turned "post at 10am"
  // into a 404 at 10am.
  const previous = String((d as Json).png_path ?? "");
  if (previous && previous !== path) {
    const { data: still } = await admin.from("social_posts")
      .select("id").like("media_url", `%${previous}%`).limit(1);
    if (!still || still.length === 0) {
      try { await admin.storage.from(BUCKET).remove([previous]); } catch { /* best effort */ }
    }
  }

  return { url, path };
}
