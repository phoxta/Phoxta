// Phoxta — design-generate: write a social post from a brief.
//
// Fills the same content map the manual editor writes to. There is no "AI
// version" of a design and no separate import path, so a generated post can be
// hand-edited the moment it lands, and a hand-made one can be regenerated
// without losing the photograph someone already chose.
//
// Three things happen here, and only the first needs the model:
//
//   1. COPY. The model gets the template's purpose and its exact slots, with
//      the character budget each one has. It writes to the shape rather than
//      writing prose that then has to be cut to fit.
//   2. PHOTOGRAPHS. Resolved from Pexels against a per-slot subject the model
//      names — the same _shared/stock.ts the idea slides use, so there is one
//      place that knows how to search and one place that carries the credit.
//   3. BRAND. Read from the organisation's own branding, not invented. A post
//      in someone else's colours is worse than a post in the template's.
import { preflight, json } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { callJson } from "../_shared/anthropic.ts";
import { modelFor } from "../_shared/models.ts";
import { searchStock } from "../_shared/stock.ts";
import { meter, assertWithinCap, CAP_REACHED_MESSAGE } from "../_shared/meter.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

/**
 * The layouts, as the client knows them.
 *
 * This used to be a hand-written table in this file. It listed six templates
 * while the pack had eighteen, so the agent could only pick from a third of
 * them and nothing said so — the failure of a duplicated list is that it keeps
 * working, just wrongly. The catalogue now arrives with the brief, computed
 * from the same templates the canvas renders, so it cannot fall behind.
 *
 * It is client-supplied, and that is fine here: it only shapes copy written
 * into that same client's own design. Nothing is trusted across a privilege
 * boundary, and every string that comes back is still cut to the budget below.
 */
const NL = String.fromCharCode(10);

type Slot = { slot: string; max: number };
type Layout = { id: string; purpose: string; slots: Slot[]; images: Record<string, string> };

function readCatalogue(v: unknown): Layout[] {
  if (!Array.isArray(v)) return [];
  const out: Layout[] = [];
  for (const t of v) {
    if (!t || typeof t.id !== "string" || !Array.isArray(t.slots)) continue;
    out.push({
      id: String(t.id).slice(0, 20),
      purpose: String(t.purpose ?? "").slice(0, 300),
      slots: t.slots
        .filter((s: Json) => s && typeof s.slot === "string")
        .slice(0, 24)
        .map((s: Json) => ({ slot: String(s.slot).slice(0, 30), max: Math.max(3, Math.min(400, Number(s.max) || 60)) })),
      images: typeof t.images === "object" && t.images ? t.images : {},
    });
  }
  return out.slice(0, 40);
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    const who = await requireUser(req);
    if ("error" in who) return who.error;

    const body = (await req.json().catch(() => ({}))) as Json;
    const orgId = String(body?.orgId ?? "");
    const brief = String(body?.brief ?? "").trim();
    const pinned = body?.templateId ? String(body.templateId) : "";
    const layouts = readCatalogue(body?.catalogue);

    if (!orgId) return json({ error: "Which business is this for?" }, 400);
    if (!brief) return json({ error: "Say what the post should be about." }, 400);
    if (!layouts.length) return json({ error: "No layouts were offered to choose from." }, 400);
    if (pinned && !layouts.some((l) => l.id === pinned)) return json({ error: "That template does not exist." }, 400);

    const admin = adminClient();

    // Membership is the authorisation. The row id alone would let any signed-in
    // account spend another tenant's model budget.
    const { data: member } = await admin
      .from("organization_memberships").select("organization_id")
      .eq("organization_id", orgId).eq("user_id", who.userId).maybeSingle();
    if (!member) return json({ error: "That business is not yours." }, 403);

    // Membership says WHO may spend; the plan says HOW MUCH. This call was
    // neither capped nor metered — a post written here cost the tenant nothing
    // on paper, and nothing stood between a busy studio and the model bill.
    const allowance = await assertWithinCap(admin, orgId);
    if (!allowance.ok) return json({ error: CAP_REACHED_MESSAGE, limitReached: true }, 429);

    const { data: org } = await admin
      .from("organizations").select("name, branding, vertical").eq("id", orgId).maybeSingle();

    const branding = ((org as Json)?.branding ?? {}) as Json;
    const orgName = String((org as Json)?.name ?? "the business");

    // ── 1. Copy ──────────────────────────────────────────────────────────
    const choices = pinned ? layouts.filter((l) => l.id === pinned) : layouts;
    const menu = choices.map((t) =>
      `- ${t.id}: ${t.purpose}
  slots: ${t.slots.map((s) => `${s.slot} (max ${s.max} chars)`).join(", ")}
  photos: ${Object.entries(t.images).map(([s, d]) => `${s} — ${d}`).join("; ") || "none"}`,
    ).join(NL);

    const t0 = Date.now();
    const { data: written, inTok, outTok, cacheWriteTok, cacheReadTok, model } = await callJson<Json>({
      model: modelFor("balanced"),
      system:
        "You write social posts for a small business. Reply with JSON only. " +
        "Write like a person, not a brochure: no 'unlock', no 'elevate', no 'in today's fast-paced world'. " +
        "Respect every character limit exactly — copy that overflows its slot is worse than copy that is short.",
      user: `Business: ${orgName}${(org as Json)?.vertical ? ` (${(org as Json).vertical})` : ""}
Brief: ${brief}

${pinned ? "Use this layout:" : "Pick whichever layout fits what is being said:"}
${menu}

Return JSON: {
  "templateId": string — one of the ids above,
  "title": string — the post's name in the library, not on the artwork, 3 to 6 words,
  "content": { <slot>: string } — every slot the chosen layout lists, and no others,
  "imageQueries": { <photo slot>: string } — 3 to 6 words naming a PHOTOGRAPHABLE scene for each photo slot the layout lists. Concrete: "baker sliding tray into oven", never "success" or "growth"
}

In the title slot only, you may wrap one to three words in *asterisks* to paint them in the accent colour. Choose the words that carry the meaning.
Statistics must be short and plausible — "12+", "98%", "4.5". Never invent a specific claim the brief does not support; if there is no number to give, use a round one the business could stand behind.`,
      maxTokens: 1600,
    });
    await meter(admin, {
      organizationId: orgId,
      userId: who.userId,
      model,
      feature: "design-generate",
      tier: "balanced",
      inTok, outTok, cacheWriteTok, cacheReadTok,
      latencyMs: Date.now() - t0,
    });

    const wantedId = pinned || String(written?.templateId ?? "");
    const spec = choices.find((l) => l.id === wantedId) ?? choices[0];
    const templateId = spec.id;

    // Keep only slots this template really has, and cut anything over budget.
    // The model is asked for limits, not bound to them, and a headline that
    // overflows its box is the one failure a reader always notices.
    const content: Record<string, string> = {};
    for (const { slot, max } of spec.slots) {
      const raw = String((written?.content ?? {})[slot] ?? "").trim();
      if (!raw) continue;
      content[slot] = raw.length > max ? `${raw.slice(0, max - 1).trimEnd()}…` : raw;
    }

    // ── 2. Photographs ───────────────────────────────────────────────────
    const images: Record<string, Json> = {};
    for (const slot of Object.keys(spec.images ?? {})) {
      const q = String((written?.imageQueries ?? {})[slot] ?? "").trim() || String(spec.images[slot] ?? "");
      const image = await searchStock(q);
      if (image) images[slot] = image;
    }

    // ── 3. Brand ─────────────────────────────────────────────────────────
    // Only what the tenant actually set. An unset colour keeps the template's,
    // which is a designed choice; a guessed one is not.
    const palette: Record<string, string> = {};
    const hex = (v: unknown) => (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v : "");
    if (hex(branding?.primary)) palette.accent = branding.primary;
    if (hex(branding?.ink)) palette.ink = branding.ink;
    if (hex(branding?.primary)) palette.gradientFrom = branding.primary;

    return json({
      design: {
        title: String(written?.title ?? brief).slice(0, 80),
        templateId,
        content,
        images,
        palette: Object.keys(palette).length ? palette : undefined,
      },
    });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
