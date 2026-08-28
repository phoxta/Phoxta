// Phoxta — social-caption: write the caption and the hashtags for a design.
//
// WHAT MAKES THIS DIFFERENT FROM "ASK A MODEL FOR A CAPTION"
//
// A model asked for "an Instagram caption" returns the thing that has been
// written a million times: an emoji, a slogan, thirty hashtags, and an
// exclamation mark. That copy does not perform, and a business owner can tell —
// they just cannot always say why. So the craft is IN THE PROMPT, per platform,
// and it is specific:
//
//   INSTAGRAM truncates at roughly 125 characters behind a "… more". Whatever
//   is after that is read by people who already decided to keep reading, so the
//   first line has to carry the whole post. Hashtags go after a line break at
//   the end, and there are a handful, not thirty — the "more tags, more reach"
//   idea has been wrong for years and reads as amateur.
//
//   LINKEDIN cuts at about 140 on mobile, and the same logic applies harder
//   because the audience is skimming between meetings. Short paragraphs with
//   real line breaks. Three hashtags at most. NO LINK IN THE BODY — LinkedIn
//   demotes posts that send people away, so the link belongs in the first
//   comment, and the caption should not pretend otherwise.
//
//   X is 280 characters, hard. One idea, nothing else. Zero to two hashtags;
//   more measurably costs engagement rather than adding it.
//
//   TIKTOK gives 2200 but rewards short. The caption supports the picture, it
//   does not narrate it, and the tags are how the post gets categorised.
//
// AND THE RULE THAT MATTERS MOST: it may only use what the design and the
// business record actually say. A caption that invents a price, a discount, a
// deadline or a stock level is not a writing mistake, it is a false statement
// published under the business's name — and the owner finds out when a customer
// arrives expecting the offer. So the prompt forbids it, and the copy is built
// from the design's own words, which are right there in its content map.
import { preflight, json } from "../_shared/cors.ts";
import { authorize } from "../_shared/auth.ts";
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { callJson } from "../_shared/anthropic.ts";
import { modelFor } from "../_shared/models.ts";
import { meter } from "../_shared/meter.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

type Platform = "instagram" | "linkedin" | "tiktok" | "x";

/**
 * What each platform actually rewards, written as instructions rather than as
 * trivia. Kept beside the limits it depends on, so a limit and the advice about
 * it cannot drift apart.
 */
const PLATFORM: Record<Platform, { name: string; cap: number; visible: number; tags: string; craft: string }> = {
  instagram: {
    name: "Instagram", cap: 2200, visible: 125, tags: "5 to 8",
    craft: [
      "The first line is the whole post — everything past roughly 125 characters sits behind a '… more' that most people never open.",
      "Open with the specific thing, not the category. 'Three left in the oat linen' stops a thumb; 'New arrivals are here!' does not.",
      "Short lines with breaks between them. A wall of text is scrolled past.",
      "Emoji are punctuation, not decoration: at most one or two, never as bullet points.",
      "Hashtags go at the very end, after a blank line, so they do not interrupt the reading.",
    ].join(" "),
  },
  linkedin: {
    name: "LinkedIn", cap: 3000, visible: 140,
    tags: "no more than 3",
    craft: [
      "The cut is around 140 characters on mobile, so the first line is doing all the work.",
      "Write like a person who knows the trade, not like a brand. No 'We are thrilled to announce'.",
      "Short paragraphs, real line breaks, one idea each.",
      "DO NOT put a link in the caption — LinkedIn suppresses posts that send people off the platform. If there is somewhere to go, say to look in the comments.",
      "Three hashtags at most, and they should be industry terms a professional would actually follow.",
    ].join(" "),
  },
  x: {
    name: "X", cap: 280, visible: 280, tags: "0 to 2",
    craft: [
      "280 characters total, and that includes the hashtags. Write one idea and stop.",
      "No preamble. The first five words are the post.",
      "Zero to two hashtags. More costs engagement rather than adding it.",
    ].join(" "),
  },
  tiktok: {
    name: "TikTok", cap: 2200, visible: 100,
    tags: "3 to 5",
    craft: [
      "Short. The caption supports the picture rather than describing it — never narrate what is already visible.",
      "Plain, spoken language. Nothing that reads as an advert.",
      "Three to five tags: how the post gets categorised, not decoration.",
    ].join(" "),
  },
};

/** A design's copy is rich text — runs with marks — or a plain string. Both
 *  flatten to the words, which is all the writer needs. */
function plain(v: unknown): string {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.map((r) => plain((r as Json)?.text ?? "")).join("");
  if (v && typeof v === "object") return plain((v as Json).text ?? "");
  return "";
}

/** Every word the design itself carries, labelled by the slot it sits in — so
 *  the writer knows which line is the headline and which is the small print. */
function designWords(doc: Json): string {
  const content = (doc?.content ?? {}) as Record<string, unknown>;
  const lines: string[] = [];
  for (const [slot, value] of Object.entries(content)) {
    const t = plain(value).trim();
    if (t) lines.push(`${slot}: ${t}`);
  }
  // A carousel keeps its copy per slide.
  const slides = Array.isArray(doc?.slides) ? (doc.slides as Json[]) : [];
  slides.forEach((s, i) => {
    const c = (s?.content ?? {}) as Record<string, unknown>;
    for (const [slot, value] of Object.entries(c)) {
      const t = plain(value).trim();
      if (t) lines.push(`slide ${i + 1} ${slot}: ${t}`);
    }
  });
  return lines.join("\n");
}

const HOUSE = [
  "You write social copy for small businesses. You are good at it, which means you sound like a person who knows the trade rather than like marketing.",
  "",
  "NEVER WRITE ANY OF THIS: unlock, elevate, game-changer, dive in, in today's fast-paced world, we are thrilled/excited/delighted to announce, rocket emoji, 'link in bio' unless a link was given to you, or a rhetorical question as an opener ('Looking for...?').",
  "No exclamation marks unless the post is genuinely an announcement, and then one.",
  "Do not describe the picture. The reader can see it.",
  "",
  "THE HARD RULE: you may only say what the design and the business details below actually say. Do not invent a price, a discount, a percentage, a deadline, a delivery time, an opening hour, a stock level, an award, a review or a statistic. If the design does not give you a reason to act now, do not manufacture urgency — write the honest post instead. A caption that promises something the business is not offering is published under their name, and they find out when a customer turns up expecting it.",
].join("\n");

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    const body = (await req.json().catch(() => ({}))) as Json;
    const orgId = String(body?.orgId ?? "");
    const designId = String(body?.designId ?? "");
    const platforms = (Array.isArray(body?.platforms) ? body.platforms : [])
      .map((p: unknown) => String(p))
      .filter((p: string): p is Platform => p in PLATFORM);
    const steer = String(body?.steer ?? "").trim().slice(0, 400);

    if (!orgId || !designId) return json({ error: "Which design?" }, 400);

    // Membership is not enough: this spends the model budget.
    const auth = await authorize(req, orgId);
    if (auth.error) return auth.error;

    const admin = adminClient();
    const { data: design } = await admin
      .from("designs").select("id, title, doc, brief")
      .eq("id", designId).eq("organization_id", orgId).maybeSingle();
    if (!design) return json({ error: "That design is not in this business." }, 404);

    const { data: org } = await admin
      .from("organizations").select("name, vertical, branding").eq("id", orgId).maybeSingle();

    const words = designWords((design as Json).doc);
    if (!words) {
      return json({ error: "There are no words on this design yet — write some copy on it first." }, 400);
    }

    // No platform picked yet: write for the tightest, so the caption fits
    // wherever it ends up rather than needing a trim later.
    const targets: Platform[] = platforms.length ? platforms : ["instagram"];
    const cap = Math.min(...targets.map((p) => PLATFORM[p].cap));
    const many = targets.length > 1;

    const guidance = targets
      .map((p) => `${PLATFORM[p].name} — ${PLATFORM[p].craft} Hashtags: ${PLATFORM[p].tags}.`)
      .join("\n\n");

    const user = [
      `THE BUSINESS: ${(org as Json)?.name ?? "a small business"}${(org as Json)?.vertical ? `, trading in ${(org as Json).vertical}` : ""}.`,
      "",
      `THE DESIGN — this is the picture the caption goes with, and these are the words printed on it:`,
      words,
      (design as Json).brief ? `\nWhat it was made for: ${(design as Json).brief}` : "",
      steer ? `\nWHAT THE OWNER WANTS FROM THIS POST: ${steer}` : "",
      "",
      `WHERE IT IS GOING: ${targets.map((p) => PLATFORM[p].name).join(", ")}.`,
      "",
      guidance,
      "",
      many
        ? `It is going to more than one platform and there is ONE caption, so write something that works on all of them and comes in under ${cap} characters — the tightest limit here. Follow the strictest rule of the set: if X is included, that means no more than two hashtags; if LinkedIn is included, that means no link in the body.`
        : `Come in under ${cap} characters including the hashtags.`,
      "",
      "Return JSON only:",
      `{`,
      `  "caption": string — the caption itself, with real line breaks (\\n), and WITHOUT the hashtags,`,
      `  "hashtags": string[] — each one starting with #, relevant to this trade and this post. A couple broad enough to be searched, the rest specific. Never engagement bait (#follow4follow, #instagood, #viral).`,
      `  "hook": string — the first line on its own, so the owner can see what shows before the fold,`,
      `  "why": string — one sentence for the owner explaining the choice you made, in plain words.`,
      `}`,
    ].filter(Boolean).join("\n");

    const started = Date.now();
    const { data: out, inTok, outTok, cacheWriteTok, cacheReadTok, model } = await callJson<Json>({
      model: modelFor("balanced"),
      system: HOUSE,
      user,
      maxTokens: 900,
    });

    const caption = String(out?.caption ?? "").trim();
    if (!caption) return json({ error: "Nothing came back — try again." }, 502);

    const hashtags = (Array.isArray(out?.hashtags) ? out.hashtags : [])
      .map((h: unknown) => String(h).trim())
      .filter(Boolean)
      .map((h: string) => (h.startsWith("#") ? h : `#${h}`))
      // The model is told the count; this is the floor under it, because a
      // caption refused at publish time for length is worse than a shorter one.
      .slice(0, targets.includes("x") ? 2 : targets.includes("linkedin") ? 3 : 8);

    await meter(admin, {
      organizationId: orgId,
      userId: auth.ok.userId,
      feature: "social-caption",
      tier: "balanced",
      model,
      inTok,
      outTok,
      cacheWriteTok,
      cacheReadTok,
      latencyMs: Date.now() - started,
    });

    return json({
      caption,
      hashtags,
      hook: String(out?.hook ?? "").trim(),
      why: String(out?.why ?? "").trim(),
      cap,
      // What the owner will actually post, so the character count on screen is
      // the number the platform will see rather than the caption alone.
      full: hashtags.length ? `${caption}\n\n${hashtags.join(" ")}` : caption,
    });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
