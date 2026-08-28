// Phoxta — design-render: turn a design into a file, without a browser open.
//
// A design is JSON painted in the browser. That was fine while a person always
// made one, and fatal the moment the agent had to: it could compose a post and
// never produce a picture, so every generated design waited for somebody to
// open it and press save. An unattended content plan cannot wait for that.
//
// The rasterising itself happens on the Oracle box (integrations/design-render),
// in headless Chrome, through the SAME DesignSvg and exportPng the editor and
// the download button use. This function is the bridge: it reads the design,
// asks for the picture, puts it in the business's own public bucket and writes
// the URL onto the row — exactly what publishDesignPng does in the console, so
// a design rendered here and one saved by hand are indistinguishable afterwards.
//
// WHY THE BUCKET HAS TO BE PUBLIC: Instagram fetches the picture itself. A
// signed URL that expires before Meta pulls the file is the classic failure on
// this path, and it fails at publish time rather than here.
import { preflight, json } from "../_shared/cors.ts";
import { authorize } from "../_shared/auth.ts";
import { adminClient } from "../_shared/supabaseAdmin.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

const BUCKET = "design-assets";

const env = (k: string) => Deno.env.get(k) ?? "";

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

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const body = (await req.json().catch(() => ({}))) as Json;
    const orgId = String(body?.orgId ?? "");
    const designId = String(body?.designId ?? "");
    if (!orgId || !designId) return json({ error: "Which design?" }, 400);

    const auth = await authorize(req, orgId);
    if (auth.error) return auth.error;

    const out = await renderDesign(adminClient(), orgId, designId);
    if ("error" in out) return json({ error: out.error }, 502);
    return json({ ok: true, ...out });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
