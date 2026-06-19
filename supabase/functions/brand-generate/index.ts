// Phoxta — brand-generate: AI rebrand. Given a free-text creative direction (and the
// business's name/vertical), returns a cohesive visual brand — palette, font pairing,
// tagline, corner radius — that the owner can preview, tweak and save to
// organizations.branding (which the storefront themes itself from). Member-gated.
import { preflight, json } from "../_shared/cors.ts";
import { authorize } from "../_shared/auth.ts";
import { modelFor } from "../_shared/models.ts";
import { callJson } from "../_shared/anthropic.ts";
import { meter } from "../_shared/meter.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

const HEX = /^#[0-9a-fA-F]{6}$/;
const clampHex = (v: unknown, fallback: string) => (typeof v === "string" && HEX.test(v.trim()) ? v.trim().toLowerCase() : fallback);
const clampStr = (v: unknown, fallback: string, max = 60) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : fallback);

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const body = await req.json().catch(() => ({})) as Json;
    const auth = await authorize(req, body.organizationId);
    if (auth.error) return auth.error;
    const { admin, org } = auth.ok;

    const prompt = clampStr(body.prompt, "", 400);
    if (!prompt) return json({ error: "Describe the look you want, e.g. 'modern luxury travel, deep navy and gold'." }, 400);

    const system =
      "You are a senior brand designer. Produce a cohesive, tasteful visual brand for a small business. " +
      "Return STRICT JSON with this shape:\n" +
      `{"colors":{"primary":"#RRGGBB","accent":"#RRGGBB","bg":"#RRGGBB","text":"#RRGGBB"},` +
      `"fonts":{"heading":"<Google Font family>","body":"<Google Font family>"},` +
      `"tagline":"<max 8 words>","description":"<1-2 sentence business description for the browser>",` +
      `"seo":{"title":"<=60 chars, brand + what they do>","description":"<=155 chars, compelling meta description>","keywords":"<6-10 comma-separated search terms>"},` +
      `"radius":"<css length like 10px>"}\n` +
      "Rules: bg is the page background (usually near-white or a very dark shade for dark themes); " +
      "text must have strong contrast on bg (readable, WCAG AA-ish); primary is the main brand/action color; " +
      "accent is a complementary highlight. fonts MUST be real Google Fonts families that pair well " +
      "(a characterful heading + a clean readable body). Be decisive and on-brief.";
    const user = `Business: "${org.name}" (${org.vertical ?? "small business"}). Creative direction: ${prompt}`;

    const model = modelFor("balanced");
    const t0 = Date.now();
    const r = await callJson<Json>({ model, system, user, maxTokens: 500 });
    await meter(admin, { organizationId: org.id, userId: auth.ok.userId, model: r.model, feature: "brand-generate", tier: "balanced", inTok: r.inTok, outTok: r.outTok, latencyMs: Date.now() - t0 });

    const d = r.data ?? {};
    const c = d.colors ?? {};
    const f = d.fonts ?? {};
    const s = d.seo ?? {};
    const branding = {
      colors: {
        primary: clampHex(c.primary, "#111111"),
        accent: clampHex(c.accent, "#6d5efc"),
        bg: clampHex(c.bg, "#ffffff"),
        text: clampHex(c.text, "#111111"),
      },
      fonts: {
        heading: clampStr(f.heading, "Poppins", 40),
        body: clampStr(f.body, "Inter", 40),
      },
      tagline: clampStr(d.tagline, "", 80),
      description: clampStr(d.description, "", 220),
      seo: {
        title: clampStr(s.title, "", 70),
        description: clampStr(s.description, "", 170),
        keywords: clampStr(s.keywords, "", 200),
      },
      radius: clampStr(d.radius, "12px", 12),
    };
    return json({ branding });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
