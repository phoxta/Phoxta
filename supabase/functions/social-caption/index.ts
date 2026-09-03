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
import { meter, assertWithinCap, CAP_REACHED_MESSAGE } from "../_shared/meter.ts";
import { voiceBlock } from "../_shared/voice.ts";

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

    // A DESIGN WITH NO WORDS IS NOT A MISTAKE. A photo post is a normal thing
    // to want, the richer templates produce them, and the planner writes them
    // deliberately — so refusing outright meant the one case where the owner
    // most needs the caption written for them was the case that got refused.
    // When the artwork says nothing, the brief is what the caption is about.
    const words = designWords((design as Json).doc);
    const brief = String((design as Json).brief ?? "").trim();
    if (!words && !brief) {
      return json({
        error: "This design has no words on it and no brief, so there is nothing to write a caption about yet.",
      }, 400);
    }

    // After the cheap refusals and before the model: the plan's monthly
    // allowance applies here as it does to every other authenticated feature.
    const allowance = await assertWithinCap(admin, orgId);
    if (!allowance.ok) return json({ error: CAP_REACHED_MESSAGE, limitReached: true }, 429);

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
      words
        ? `THE DESIGN — this is the picture the caption goes with, and these are the words printed on it:\n${words}`
        : `THE DESIGN — a picture with no words printed on it. The caption therefore carries the whole post: it has to say the thing the picture cannot.`,
      brief ? `\nWhat it was made for: ${brief}` : "",
      steer ? `\nWHAT THE OWNER WANTS FROM THIS POST: ${steer}` : "",
      "",
      `WHERE IT IS GOING: ${targets.map((p) => PLATFORM[p].name).join(", ")}.`,
      "",
      guidance,
      "",
      // ONE CAPTION FOR EVERY PLATFORM WAS ALWAYS A COMPROMISE, and this file
      // spent forty lines describing exactly how the platforms differ before
      // asking for a single piece of copy that fits all of them at once. So it
      // writes one per platform: X gets its 280 characters and two tags,
      // LinkedIn gets its paragraphs and no link, Instagram gets its first
      // line. Nothing is trimmed to the tightest limit any more.
      many
        ? `Write a SEPARATE caption for each platform, obeying that platform's rules and limit exactly. They should say the same thing; they should not be the same words.`
        : `Come in under ${cap} characters including the hashtags.`,
      "",
      // THREE, BECAUSE ONE MAKES THE BUTTON DESTRUCTIVE. With a single caption
      // returned, using it means overwriting whatever the owner had already
      // written — which is why both call sites guarded it with a "Replace what
      // you have written?" confirm. Three offered side by side turns the same
      // click into a choice, and the confirm disappears with it.
      "Write THREE genuinely different takes — not three rewordings of one. Different angles on the same truth: one that leads with the outcome, one that leads with the detail, one that leads with the question the customer is actually asking.",
      "",
      "Return JSON only:",
      `{`,
      `  "variants": [`,
      `    {`,
      `      "label": string — two or three words naming the angle, so the owner can tell them apart at a glance,`,
      `      "captions": { ${targets.map((p) => `"${p}": string`).join(", ")} } — the caption for each platform, with real line breaks (\\n), WITHOUT the hashtags,`,
      `      "hashtags": { ${targets.map((p) => `"${p}": string[]`).join(", ")} } — each starting with #, relevant to this trade and this post. A couple broad enough to be searched, the rest specific. Never engagement bait (#follow4follow, #instagood, #viral),`,
      `      "hook": string — the first line of the ${PLATFORM[targets[0]].name} caption on its own, so the owner sees what shows before the fold,`,
      `      "why": string — one sentence, plain words, on what this take does that the others do not`,
      `    }`,
      `  ] — exactly 3`,
      `}`,
    ].filter(Boolean).join("\n");

    // The same voice the month was planned in, so a caption written by hand in
    // the queue does not read as a different company from the thirty around it.
    const voice = await voiceBlock(admin, orgId);

    const started = Date.now();
    const { data: out, inTok, outTok, cacheWriteTok, cacheReadTok, model } = await callJson<Json>({
      model: modelFor("balanced"),
      system: voice ? `${HOUSE}

${voice}` : HOUSE,
      user,
      // Three takes across up to four platforms is a lot more output than one
      // caption was.
      maxTokens: 3000,
    });

    /** Tag ceilings are per platform now, so X's two no longer truncate
     *  Instagram's eight just because they were posted together. */
    const tagsFor = (p: Platform, raw: unknown): string[] =>
      (Array.isArray(raw) ? raw : [])
        .map((h: unknown) => String(h).trim())
        .filter(Boolean)
        .map((h: string) => (h.startsWith("#") ? h : `#${h}`))
        .slice(0, p === "x" ? 2 : p === "linkedin" ? 3 : 8);

    const variants = (Array.isArray(out?.variants) ? out.variants : [])
      .map((v: Json) => {
        const captions: Record<string, string> = {};
        const hashtags: Record<string, string[]> = {};
        const full: Record<string, string> = {};
        for (const p of targets) {
          // A model that returned one caption instead of a per-platform map is
          // still useful — the same text on every platform is exactly the old
          // behaviour, which was acceptable before and is acceptable as a
          // fallback now. Better that than an empty caption box.
          const text = String(v?.captions?.[p] ?? v?.caption ?? "").trim();
          if (!text) continue;
          captions[p] = text;
          hashtags[p] = tagsFor(p, v?.hashtags?.[p] ?? v?.hashtags);
          full[p] = hashtags[p].length ? `${text}\n\n${hashtags[p].join(" ")}` : text;
        }
        if (!Object.keys(captions).length) return null;
        return {
          label: String(v?.label ?? "").trim() || "Another take",
          captions, hashtags, full,
          hook: String(v?.hook ?? "").trim(),
          why: String(v?.why ?? "").trim(),
        };
      })
      .filter(Boolean);

    if (!variants.length) return json({ error: "Nothing came back — try again." }, 502);

    // The first variant's copy for the first platform, kept flat. Callers that
    // only ever wanted one caption keep working unchanged.
    const first = variants[0];
    const lead = targets[0];
    const caption = first.captions[lead] ?? Object.values(first.captions)[0] ?? "";
    const hashtags = first.hashtags[lead] ?? [];

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
      variants,
      cap,
      // The flat shape the old response had, taken from the first variant.
      caption,
      hashtags,
      hook: first.hook,
      why: first.why,
      // What the owner will actually post, so the character count on screen is
      // the number the platform will see rather than the caption alone.
      full: hashtags.length ? `${caption}\n\n${hashtags.join(" ")}` : caption,
    });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
