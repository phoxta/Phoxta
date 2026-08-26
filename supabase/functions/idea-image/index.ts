// Phoxta — idea-image: resolve the photograph for a stage that has not got one.
//
// idea-run resolves the picture when it generates a step, so this exists for the
// steps that were generated before it did — and for the ones whose search failed
// on the day. Without it, every idea already in the database would keep its
// curated fallback for ever and only brand-new runs would get real photography.
//
// It never calls the model. The subject was already chosen and stored as
// imageQuery; this only turns that string into a picture, which is why it is
// cheap enough to call from a page render.
import { preflight, json } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { searchStock } from "../_shared/stock.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

const STEPS = ["problem", "market", "value", "customer", "model", "report", "strategy"] as const;
type Step = typeof STEPS[number];

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    const who = await requireUser(req);
    if ("error" in who) return who.error;

    const body = (await req.json().catch(() => ({}))) as Json;
    const ideaId = String(body?.ideaId ?? "");
    if (!ideaId) return json({ error: "Which idea?" }, 400);

    const admin = adminClient();

    // Scoped by user_id as well as id: the row id alone would let one account
    // spend another's quota against their idea.
    const { data: idea } = await admin
      .from("ideas").select("id, ai_profile, report").eq("id", ideaId).eq("user_id", who.userId).maybeSingle();
    if (!idea) return json({ error: "That idea was not found." }, 404);

    const profile = { ...((idea as Json).ai_profile ?? {}) } as Record<string, Json>;
    let report = (idea as Json).report as Json;

    // Only the stages that named a subject and have no picture yet. Re-resolving
    // one that already has an image would change a slide someone has read, and
    // spend a call to do it.
    const pending: Step[] = STEPS.filter((s) => {
      const out = s === "report" ? report : profile[s];
      return out && typeof out === "object"
        && typeof out.imageQuery === "string" && out.imageQuery.trim()
        && !out.image;
    });

    if (pending.length === 0) return json({ filled: 0, pending: 0 });

    let filled = 0;
    for (const step of pending) {
      const out = step === "report" ? report : profile[step];
      const image = await searchStock(String(out.imageQuery));
      if (!image) continue;
      const next = { ...out, image };
      if (step === "report") report = next;
      else profile[step] = next;
      filled++;
    }

    if (filled === 0) return json({ filled: 0, pending: pending.length });

    const patch: Json = { ai_profile: profile };
    if (pending.includes("report")) patch.report = report;

    const { error } = await admin.from("ideas").update(patch).eq("id", ideaId);
    if (error) return json({ error: error.message }, 500);

    // The count is the point of the response. A caller that gets {filled: 0}
    // knows the search found nothing; one that gets no count at all cannot tell
    // success from a silent no-op, which is how a broken backfill hides.
    return json({ filled, pending: pending.length });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
