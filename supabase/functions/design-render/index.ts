// Phoxta — design-render: turn a design into a file, without a browser open.
//
// A design is JSON painted in the browser. That was fine while a person always
// made one, and fatal the moment the agent had to: it could compose a post and
// never produce a picture, so every generated design waited for somebody to
// open it and press save. An unattended content plan cannot wait for that.
//
// The rasterising happens on the Oracle box (integrations/design-render), in
// headless Chrome, through the SAME DesignSvg and exportPng the editor and the
// download button use. The work is in _shared/render.ts because the publisher
// calls it too.
import { preflight, json } from "../_shared/cors.ts";
import { authorize } from "../_shared/auth.ts";
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { renderDesign, designChangedSinceExport } from "../_shared/render.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

/**
 * How long a fresh export answers for the design instead of a new render.
 *
 * The render box is one headless Chrome shared by every tenant, and the
 * publisher's queue renders through it too. A member sitting in the console
 * pressing preview over and over was asking that one browser for the same
 * picture every few seconds — and every one of those renders queued AHEAD of
 * the posts due to go out. Within this window an UNCHANGED design answers with
 * the export it already has; an edited one (designChangedSinceExport) always
 * renders, because "preview my change" is the one request a cooldown must
 * never eat.
 */
const RENDER_COOLDOWN_SECS = Math.max(0, Number(Deno.env.get("RENDER_COOLDOWN_SECS") ?? "20"));

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

    const admin = adminClient();

    // The cooldown read. Org-scoped like the render itself, so an id from
    // another business answers "no design" rather than leaking its export.
    const { data: d } = await admin.from("designs")
      .select("png_url, png_path, png_at, updated_at")
      .eq("id", designId).eq("organization_id", orgId).maybeSingle();
    if (d?.png_url && d?.png_at && !designChangedSinceExport(d as Json)) {
      const ageSecs = (Date.now() - new Date(String((d as Json).png_at)).getTime()) / 1000;
      if (ageSecs >= 0 && ageSecs < RENDER_COOLDOWN_SECS) {
        // Same shape as a real render, so no caller can tell the difference —
        // which is the point: the picture IS the same picture.
        return json({ ok: true, url: String((d as Json).png_url), path: String((d as Json).png_path ?? "") });
      }
    }

    const out = await renderDesign(admin, orgId, designId);
    if ("error" in out) return json({ error: out.error }, 502);
    return json({ ok: true, ...out });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
