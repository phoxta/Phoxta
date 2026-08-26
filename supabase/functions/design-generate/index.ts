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

// deno-lint-ignore no-explicit-any
type Json = any;

/**
 * The slots each template actually has, and how much room each one has.
 *
 * This mirrors src/lib/designs/templates.ts. It is duplicated rather than
 * imported because an edge function cannot reach into the Vite app — so the
 * risk is drift, and the mitigation is that the client validates what comes
 * back against the real template and drops anything that does not belong.
 * A slot invented here cannot reach the canvas.
 */
const TEMPLATES: Record<string, { purpose: string; slots: Record<string, number>; images: Record<string, string> }> = {
  v1: {
    purpose: "Light, typographic. One big two-tone statement and a short supporting line. Best when there is one thing to say.",
    slots: { title: 46, description: 130 },
    images: { image1: "a scene from the business", image2: "a person, portrait orientation" },
  },
  v2: {
    purpose: "Gradient, evidence-led. Built around one number, with three one-word chips and a small score.",
    slots: { title: 34, subtitle: 30, statistic: 6, score: 6, description: 60, point1: 12, point2: 12, point3: 12 },
    images: { image1: "a person, cut out or on a plain background" },
  },
  v3: {
    purpose: "Centred testimonial. A customer quote in their own words, plus a wider photograph.",
    slots: { title: 30, testimonial: 60, quote: 110 },
    images: { image1: "a real customer or the product in use" },
  },
  v4: {
    purpose: "One full-bleed photograph with the headline read out of it. Use when the picture is the message.",
    slots: { title: 44, description: 120, subtitle: 30, statistic: 6 },
    images: { image1: "a striking lifestyle photograph" },
  },
  v5: {
    purpose: "Three portraits over three labelled pills. Names who the offer is for, or introduces a team.",
    slots: { title: 46, description: 120, point1: 18, point2: 18, point3: 18 },
    images: { image1: "portrait on a plain background", image2: "portrait on a plain background", image3: "portrait on a plain background" },
  },
  v6: {
    purpose: "Gradient with a call to action and a big success number. Use when you want a click.",
    slots: { title: 34, subtitle: 40, description: 110, cta: 24, quote: 30, statistic: 5 },
    images: { image1: "a tall portrait of someone at work" },
  },
};

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

    if (!orgId) return json({ error: "Which business is this for?" }, 400);
    if (!brief) return json({ error: "Say what the post should be about." }, 400);
    if (pinned && !TEMPLATES[pinned]) return json({ error: "That template does not exist." }, 400);

    const admin = adminClient();

    // Membership is the authorisation. The row id alone would let any signed-in
    // account spend another tenant's model budget.
    const { data: member } = await admin
      .from("memberships").select("organization_id")
      .eq("organization_id", orgId).eq("user_id", who.userId).maybeSingle();
    if (!member) return json({ error: "That business is not yours." }, 403);

    const { data: org } = await admin
      .from("organizations").select("name, branding, vertical").eq("id", orgId).maybeSingle();

    const branding = ((org as Json)?.branding ?? {}) as Json;
    const orgName = String((org as Json)?.name ?? "the business");

    // ── 1. Copy ──────────────────────────────────────────────────────────
    const choices = pinned ? { [pinned]: TEMPLATES[pinned] } : TEMPLATES;
    const menu = Object.entries(choices).map(([id, t]) =>
      `- ${id}: ${t.purpose}\n  slots: ${Object.entries(t.slots).map(([s, n]) => `${s} (max ${n} chars)`).join(", ")}\n  photos: ${Object.entries(t.images).map(([s, d]) => `${s} — ${d}`).join("; ")}`,
    ).join("\n");

    const { data: written } = await callJson<Json>({
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

    const templateId = pinned || String(written?.templateId ?? "v1");
    const spec = TEMPLATES[templateId] ?? TEMPLATES.v1;

    // Keep only slots this template really has, and cut anything over budget.
    // The model is asked for limits, not bound to them, and a headline that
    // overflows its box is the one failure a reader always notices.
    const content: Record<string, string> = {};
    for (const [slot, max] of Object.entries(spec.slots)) {
      const raw = String((written?.content ?? {})[slot] ?? "").trim();
      if (!raw) continue;
      content[slot] = raw.length > max ? `${raw.slice(0, max - 1).trimEnd()}…` : raw;
    }

    // ── 2. Photographs ───────────────────────────────────────────────────
    const images: Record<string, Json> = {};
    for (const slot of Object.keys(spec.images)) {
      const q = String((written?.imageQueries ?? {})[slot] ?? "").trim() || spec.images[slot];
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
