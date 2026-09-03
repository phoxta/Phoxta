// Phoxta — design-reference: agree the LOOK before writing the month.
//
// WHY THIS EXISTS. "Plan a month" wrote thirty pieces of copy and dropped each
// into whichever of eighteen built-in layouts the model liked. The words were
// the business's; the look was Phoxta's. An owner who has a brand — or simply a
// poster they like — had nowhere to say so, and no way to see what the month
// would look like before it existed.
//
// So the art direction is settled first, and separately, exactly as the
// strategy is: proposed, shown, approved by a person, and only then used.
//
// ── TWO KINDS OF REFERENCE, AND THEY ARE NOT THE SAME ───────────────────────
//
// `analyse` reads a picture THE OWNER UPLOADED — their own artwork, a past
// post, their brand guidelines — and reproduces its layout as a real document:
// layers, positions, weights, palette. That is reproduction, and it is theirs
// to reproduce.
//
// `propose` suggests directions built from Phoxta's own template pack and
// Pexels photography. Those are reproducible because we hold them.
//
// What this function will NOT do is trace somebody else's copyrighted artwork
// off the web and publish it under a different business's name. `analyse` on a
// URL therefore extracts a LOOK — palette, type, spacing, composition — rather
// than a pixel copy, which is what a designer takes from a reference anyway.
// The distinction is enforced by which prompt runs, not left to the caller.
import { preflight, json } from "../_shared/cors.ts";
import { authorize } from "../_shared/auth.ts";
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { callJson } from "../_shared/anthropic.ts";
import { modelFor } from "../_shared/models.ts";
import { assertWithinCap, CAP_REACHED_MESSAGE, meter } from "../_shared/meter.ts";
import { findStock } from "../_shared/stock.ts";
import { voiceBlock } from "../_shared/voice.ts";
import { validateDoc, DIMS, TEXT_SLOTS, IMAGE_SLOTS, PAINT_ROLES, FONTS } from "./replica.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

const clip = (s: unknown, n: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

/** Owner-uploaded, or found on the web. The two take different prompts. */
type Origin = "upload" | "web";

const HOUSE = `
Write plainly. Describe what is actually there, not what would sound impressive.
Never invent a brand name, a strapline or a claim — you are describing a LOOK, not writing copy.`;

Deno.serve(async (req) => {
  try {
    const pf = preflight(req);
    if (pf) return pf;

    const body = (await req.json().catch(() => ({}))) as Json;
    const orgId = String(body?.orgId ?? "");
    const action = String(body?.action ?? "propose");
    if (!orgId) return json({ error: "Which business is this for?" }, 400);

    const auth = await authorize(req, orgId);
    if (auth.error) return auth.error;
    const admin = adminClient();

    const allowance = await assertWithinCap(admin, orgId);
    if (!allowance.ok) return json({ error: CAP_REACHED_MESSAGE, limitReached: true }, 429);

    const { data: org } = await admin
      .from("organizations").select("name, vertical, branding").eq("id", orgId).maybeSingle();
    const branding = ((org as Json)?.branding ?? {}) as Json;

    // ── propose: art directions to choose between ───────────────────────────
    if (action === "propose") {
      const brief = clip(body?.brief, 600);
      const layouts: Json[] = Array.isArray(body?.catalogue) ? body.catalogue : [];
      const menu = layouts.slice(0, 40)
        .map((t: Json) => `- ${t.id}: ${t.purpose ?? ""}`).join("\n");

      const voice = await voiceBlock(admin, orgId);
      const t0 = Date.now();
      const { data: out, inTok, outTok, cacheWriteTok, cacheReadTok, model } = await callJson<Json>({
        model: modelFor("balanced"),
        system: `You are an art director proposing directions for a month of social content. Reply with JSON only.${HOUSE}${voice ? `\n\n${voice}` : ""}`,
        user: [
          `THE BUSINESS: ${clip((org as Json)?.name, 120)}${(org as Json)?.vertical ? `, trading in ${clip((org as Json).vertical, 60)}` : ""}.`,
          branding.primary ? `Their brand colour: ${branding.primary}` : "",
          branding.ink ? `Their text colour: ${branding.ink}` : "",
          brief ? `\nWhat the month is for: ${brief}` : "",
          layouts.length ? `\nLAYOUTS AVAILABLE — pick the closest structural match for each direction:\n${menu}` : "",
          "",
          "Propose FOUR genuinely different art directions. Not four wordings of one — four looks an owner would actually have to choose between: they should differ in palette, in type, and in how much of the page is empty.",
          "",
          "Return JSON only:",
          `{
  "directions": [{
    "key": string — short slug,
    "name": string — two or three words an owner would recognise, e.g. "Warm editorial",
    "feels": string — one sentence on who it speaks to and why it suits this business,
    "palette": { "canvas": "#RRGGBB", "ink": "#RRGGBB", "accent": "#RRGGBB", "accentSoft": "#RRGGBB", "gradientFrom": "#RRGGBB", "gradientTo": "#RRGGBB" },
    "font": one of ${FONTS.map((f) => `"${f}"`).join(", ")},
    "composition": string — one sentence on the layout habit: where the headline sits, how much white space, how images are cropped,
    "templateId": string — the closest layout id from the list above,
    "moodQuery": string — 3 to 5 words naming a PHOTOGRAPHABLE scene that carries this mood. Concrete, never abstract
  }] — exactly 4
}`,
        ].filter(Boolean).join("\n"),
        maxTokens: 2500,
      });
      await meter(admin, {
        organizationId: orgId, userId: auth.ok.userId, feature: "design-reference",
        tier: "balanced", model, inTok, outTok, cacheWriteTok, cacheReadTok, latencyMs: Date.now() - t0,
      });

      // A mood shot per direction, so the choice is made by eye rather than by
      // reading four paragraphs about colour.
      const directions: Json[] = Array.isArray(out?.directions) ? out.directions.slice(0, 4) : [];
      let stockNote = "";
      for (const d of directions) {
        const found = await findStock(clip(d?.moodQuery, 60) || "workspace", { orgId });
        if (found.photo) d.mood = found.photo;
        else if (found.unavailable && !stockNote) stockNote = found.unavailable;
      }
      return json({ ok: true, directions, ...(stockNote ? { note: stockNote } : {}) });
    }

    // ── analyse: read one reference picture ─────────────────────────────────
    if (action === "analyse") {
      const url = String(body?.url ?? "").trim();
      const origin: Origin = body?.origin === "web" ? "web" : "upload";
      // A reference-derived document owns every layer, so the template is only
      // where an unset palette role falls back to. v1 is the light typographic
      // one — the least opinionated ground for a layout that brings its own.
      const templateId = clip(body?.templateId, 60) || "v1";
      const format = clip(body?.format, 20) || "portrait";
      if (!url) return json({ error: "There is no picture to look at." }, 400);
      // data: URIs are how an upload arrives; https is a stored asset. Nothing
      // else is fetched — a file:// or a localhost URL here would be this
      // server being asked to read something it should not.
      if (!/^https:\/\//i.test(url) && !/^data:image\//i.test(url)) {
        return json({ error: "That is not a picture this can read." }, 400);
      }

      const board = DIMS[format] ?? DIMS.portrait;

      // THE TWO PROMPTS. An upload may be reproduced; a web reference may only
      // be read for direction. This is the whole legal and ethical distinction
      // in the feature, so it lives here rather than in a flag a caller sets.
      const system = origin === "upload"
        ? `You are a designer rebuilding a layout the owner of this business has given you, so it can be reused. Reply with JSON only.${HOUSE}`
        : `You are a designer taking DIRECTION from a reference: its palette, its type, its spacing, how it uses the page. You are NOT reproducing it — this artwork belongs to someone else. Describe the approach; never copy its wording, its logo or its exact arrangement. Reply with JSON only.${HOUSE}`;

      const user = origin === "upload"
        ? [
          `Rebuild this design as a layered document on a ${board.w}x${board.h} artboard.`,
          "",
          "Work top-left origin, pixels, absolute positions. Read the real proportions off the picture — if the headline occupies the top third, its box occupies the top third.",
          "",
          `LAYER KINDS: "rect" (a solid or a drawn shape), "gradient", "image" (a photograph), "text", "chip" (a small pill of text).`,
          `TEXT SLOTS: ${TEXT_SLOTS.join(", ")} — pick by ROLE, not by position.`,
          `IMAGE SLOTS: ${IMAGE_SLOTS.join(", ")}.`,
          `FILLS: a #RRGGBB hex, or one of ${PAINT_ROLES.join(", ")}. Prefer a role where the colour is clearly the brand's, a hex where it is specific to this piece.`,
          `FONTS: ${FONTS.join(", ")} — pick the nearest.`,
          "",
          "Paint order matters: the first layer is furthest back. Include the background.",
          "",
          // Without this the model returns a photograph as a grey rectangle,
          // which reads correctly and is wrong in a way that only shows up a
          // month later: a layout with no image layer has nowhere to put a
          // picture, so every post made in it comes out text-only.
          "A PHOTOGRAPH — or any area plainly reserved for one, however it is filled in this particular picture — is an \"image\" layer, never a coloured rectangle. Reserve a rect for a real block of colour.",
          "",
          "Return JSON only:",
          `{
  "format": "${format}",
  "palette": { "canvas": "#RRGGBB", "ink": "#RRGGBB", "accent": "#RRGGBB", "accentSoft": "#RRGGBB", "gradientFrom": "#RRGGBB", "gradientTo": "#RRGGBB" },
  "layers": [{
    "id": string, "type": "rect"|"gradient"|"image"|"text"|"chip",
    "x": number, "y": number, "w": number, "h": number,
    "fill": string (rect/text/chip), "radius": number,
    "from": string, "to": string, "angle": number (gradient only),
    "slot": string (text/chip/image only),
    "size": number — cap height in px,
    "weight": 100-900,
    "lineHeight": number — a MULTIPLIER of the size, not pixels. Headlines are about 1.0-1.15, body copy 1.4-1.6. Never above 2,
    "tracking": number — letter-spacing in px, usually 0 or slightly negative,
    "align": "left"|"center"|"right", "font": string (text only)
  }],
  "content": { "<text slot>": string — the words actually printed there },
  "look": { "name": string — two or three words, "feels": string, "composition": string }
}`,
        ].join("\n")
        : [
          "Describe the direction this reference sets, so a different business can work in the same spirit with its own content.",
          "",
          "Return JSON only:",
          `{
  "look": {
    "name": string — two or three words,
    "feels": string — one sentence on the mood and who it speaks to,
    "composition": string — one sentence on where the headline sits, how much of the page is empty, how images are cropped,
    "font": one of ${FONTS.map((f) => `"${f}"`).join(", ")},
    "palette": { "canvas": "#RRGGBB", "ink": "#RRGGBB", "accent": "#RRGGBB", "accentSoft": "#RRGGBB", "gradientFrom": "#RRGGBB", "gradientTo": "#RRGGBB" }
  }
}`,
        ].join("\n");

      const t0 = Date.now();
      const { data: out, inTok, outTok, cacheWriteTok, cacheReadTok, model } = await callJson<Json>({
        model: modelFor("complex"),
        system,
        user,
        images: [{ url }],
        maxTokens: origin === "upload" ? 8000 : 1500,
      });
      await meter(admin, {
        organizationId: orgId, userId: auth.ok.userId, feature: "design-reference",
        tier: "complex", model, inTok, outTok, cacheWriteTok, cacheReadTok, latencyMs: Date.now() - t0,
      });
      if (!out || typeof out !== "object") return json({ error: "Nothing came back — try again." }, 502);

      const look = {
        name: clip(out?.look?.name, 40) || "Your reference",
        feels: clip(out?.look?.feels, 300),
        composition: clip(out?.look?.composition, 300),
        font: FONTS.includes(String(out?.look?.font)) ? String(out.look.font) : "",
        palette: out?.look?.palette ?? out?.palette ?? {},
        origin,
      };

      if (origin === "web") return json({ ok: true, look });

      // Nothing the model said about geometry is trusted; see replica.ts.
      const { doc, dropped } = validateDoc(out, { templateId, format });
      return json({
        ok: true,
        look,
        doc,
        layers: (doc.layers ?? []).length,
        ...(dropped.length ? { dropped } : {}),
      });
    }

    return json({ error: "Unknown action." }, 400);
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
