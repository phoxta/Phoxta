// Phoxta — dossier-image: resolve the photograph for a dossier section that has
// not got one.
//
// dossier-run resolves the picture as it writes each section, so this exists for
// the sections whose search failed on the day, and for anything generated before
// a PEXELS_API_KEY was configured. Without it a single bad afternoon at Pexels
// would leave a blueprint's dossier on its curated fallbacks for ever, because
// nothing else ever revisits a section that is already written.
//
// IT NEVER CALLS THE MODEL. The subject was chosen and stored as `imageQuery`
// when the section was written; this only turns that string into a picture,
// which is why it is cheap enough to call from a page render.
//
// It writes to the shared blueprint dossier on behalf of any signed-in caller,
// and that is deliberate rather than an oversight: the only thing it can change
// is a section that named a subject and has no picture, and the only value it
// can write is what Pexels returns for that stored subject. A section that
// already has a photograph is never re-resolved — re-resolving would change a
// slide somebody has read, and spend a call to do it.
import { preflight, json } from "../_shared/cors.ts";
import { authorize, requireUser } from "../_shared/auth.ts";
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { searchStock } from "../_shared/stock.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

type Row = { id: string; section: string; content: Json };

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    const body = (await req.json().catch(() => ({}))) as Json;
    const scope = body?.scope === "org" ? "org" : "blueprint";
    const orgId = String(body?.orgId ?? "");
    const blueprintId = String(body?.blueprintId ?? "");

    const admin = adminClient();
    let rows: Row[] = [];
    let table = "";

    if (scope === "org") {
      const auth = await authorize(req, orgId);
      if (auth.error) return auth.error;
      table = "org_dossier_sections";
      const { data } = await admin
        .from(table).select("id, section, content").eq("organization_id", orgId);
      rows = (data as Row[] | null) ?? [];
    } else {
      const who = await requireUser(req);
      if ("error" in who) return who.error;
      if (!blueprintId) return json({ error: "Which blueprint?" }, 400);
      table = "blueprint_dossier_sections";
      const { data } = await admin
        .from(table).select("id, section, content").eq("blueprint_id", blueprintId);
      rows = (data as Row[] | null) ?? [];
    }

    // Only the sections that named a subject and have no picture yet.
    const pending = rows.filter((r) => {
      const c = r.content;
      return c && typeof c === "object"
        && typeof c.imageQuery === "string" && c.imageQuery.trim()
        && !c.image;
    });

    if (pending.length === 0) return json({ filled: 0, pending: 0 });

    let filled = 0;
    for (const row of pending) {
      const image = await searchStock(String(row.content.imageQuery));
      if (!image) continue;
      const { error } = await admin
        .from(table).update({ content: { ...row.content, image } }).eq("id", row.id);
      if (!error) filled++;
    }

    // The count is the point of the response. A caller that gets {filled: 0}
    // knows the search found nothing; one that gets no count at all cannot tell
    // success from a silent no-op, which is how a broken backfill hides.
    return json({ filled, pending: pending.length });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
