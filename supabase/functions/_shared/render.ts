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
 * Render one design and store the result.
 *
 * Exported because the planner calls it directly: a plan that makes thirty
 * designs must not make thirty HTTP round trips through its own gateway.
 */
export async function renderDesign(
  admin: ReturnType<typeof adminClient>,
  orgId: string,
  designId: string,
): Promise<{ url: string; path: string } | { error: string }> {
  const base = env("RENDER_URL");
  const secret = env("RENDER_SECRET");
  if (!base || !secret) return { error: "The render service is not configured (RENDER_URL / RENDER_SECRET)." };

  const { data: d } = await admin.from("designs")
    .select("id, title, template_id, doc, png_path")
    .eq("id", designId).eq("organization_id", orgId).maybeSingle();
  if (!d) return { error: "That design is not in this business." };

  let bytes: Uint8Array;
  try {
    const res = await fetch(`${base}/render`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-render-secret": secret },
      body: JSON.stringify({ doc: (d as Json).doc, templateId: (d as Json).template_id, scale: 2 }),
    });
    if (!res.ok) {
      const why = await res.text().catch(() => "");
      return { error: `The renderer refused it: HTTP ${res.status} ${why.slice(0, 200)}` };
    }
    bytes = new Uint8Array(await res.arrayBuffer());
  } catch (e) {
    // The box being unreachable is a different problem from the design being
    // unrenderable, and the caller can only act on the difference.
    return { error: `The renderer could not be reached: ${(e as Error)?.message ?? e}` };
  }
  if (bytes.byteLength < 1000) return { error: "The renderer returned an empty picture." };

  try { await admin.storage.createBucket(BUCKET, { public: true }); } catch { /* already exists */ }

  const slug = String((d as Json).title ?? "design").replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "design";
  const path = `${orgId}/${crypto.randomUUID()}-${slug}.png`;
  const { error: upErr } = await admin.storage.from(BUCKET)
    .upload(path, bytes, { contentType: "image/png", upsert: false });
  if (upErr) return { error: upErr.message };

  const url = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  const { error: rowErr } = await admin.from("designs")
    .update({ png_url: url, png_path: path }).eq("id", designId);
  if (rowErr) return { error: rowErr.message };

  // Only after the row points at the new file. An orphan in the library is
  // untidy; a deleted file the row still points at is a broken picture in front
  // of a customer.
  const previous = String((d as Json).png_path ?? "");
  if (previous && previous !== path) {
    try { await admin.storage.from(BUCKET).remove([previous]); } catch { /* best effort */ }
  }

  return { url, path };
}

