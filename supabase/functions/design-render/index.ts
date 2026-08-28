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
import { renderDesign } from "../_shared/render.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

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
