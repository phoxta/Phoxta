// Phoxta — image-library: find a photograph, or make one.
//
// Two ways to fill a photo slot, behind one endpoint, because from the
// editor's point of view they are the same action: "get me a picture of this".
//
//   search   — Pexels, via the same _shared/stock.ts the idea slides and
//              design-generate already use. Free, instant, real photography,
//              and it carries the photographer credit its licence requires.
//   generate — OpenAI images, for the picture that does not exist: a specific
//              product, a particular composition, a brand-coloured abstract.
//
// WHY THE KEYS LIVE HERE. Neither PEXELS_API_KEY nor OPENAI_API_KEY carries a
// VITE_ prefix, so Vite cannot inline them into the browser bundle. A key in a
// bundle is a published key. The browser only ever receives URLs.
//
// WHY GENERATED IMAGES ARE COPIED INTO STORAGE. OpenAI returns either base64
// or a URL that expires within the hour. Storing that URL on a design would
// produce a post that renders today and is a broken image next week — the
// worst kind of failure, because it happens after everyone has stopped
// looking. The bytes are uploaded to a public bucket and the design keeps a
// permanent URL.
import { preflight, json } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { searchStockMany } from "../_shared/stock.ts";

const BUCKET = "design-images";

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    // requireUser returns EITHER { userId } OR { error: Response }. Both are
    // truthy, so a falsy check passes the failure straight through and the
    // undefined id then fails the membership query instead -- refused, but
    // reported as "you are not a member" to someone who is simply not signed
    // in. The discriminant is what has to be tested.
    const who = await requireUser(req);
    if ("error" in who) return who.error;
    // A cron secret authenticates a machine, not a person, and there is no
    // membership to check for one. Nothing schedules image searches.
    if (who.userId === "cron") return json({ error: "This endpoint is for signed-in users." }, 403);

    const body = await req.json().catch(() => ({}));
    const orgId = String(body?.orgId ?? "");
    const action = String(body?.action ?? "search");
    const query = String(body?.query ?? "").trim().slice(0, 400);

    if (!orgId) return json({ error: "Which business is this for?" }, 400);
    if (!query) return json({ error: "Describe the picture you want." }, 400);

    // Membership is the authorisation. Without this check any signed-in user
    // could spend another organisation's image generation budget.
    const admin = adminClient();
    const { data: member } = await admin
      .from("organization_memberships").select("user_id")
      .eq("organization_id", orgId).eq("user_id", who.userId).maybeSingle();
    if (!member) return json({ error: "You are not a member of this business." }, 403);

    if (action === "search") {
      const photos = await searchStockMany(query, 24);
      // An empty list is a real answer — "nothing matched" — and is reported
      // as one. Returning an error would make the editor show a failure for a
      // search that simply found nothing.
      return json({ photos });
    }

    if (action === "generate") {
      const key = Deno.env.get("OPENAI_API_KEY");
      if (!key) return json({ error: "Image generation is not configured." }, 503);

      const size = String(body?.size ?? "1024x1536"); // portrait suits the pack
      const r = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-image-1",
          prompt: `${query}. Professional photography for a social media post. No text, no words, no letters, no logos, no watermarks.`,
          size,
          n: 1,
        }),
      });

      if (!r.ok) {
        const detail = await r.text();
        console.error("image generation failed", r.status, detail.slice(0, 400));
        // The upstream message is not passed through: it can carry account and
        // billing detail that is not this user's business.
        return json({ error: r.status === 429 ? "Too many images at once. Try again shortly." : "That image could not be generated." }, 502);
      }

      const out = await r.json();
      const b64 = out?.data?.[0]?.b64_json;
      const url = out?.data?.[0]?.url;
      let bytes: Uint8Array;
      if (b64) {
        bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      } else if (url) {
        const img = await fetch(url);
        if (!img.ok) return json({ error: "That image could not be saved." }, 502);
        bytes = new Uint8Array(await img.arrayBuffer());
      } else {
        return json({ error: "That image could not be generated." }, 502);
      }

      try { await admin.storage.createBucket(BUCKET, { public: true }); } catch (_) { /* already exists */ }
      const path = `${orgId}/${crypto.randomUUID()}.png`;
      const { error } = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: "image/png", upsert: false });
      if (error) {
        console.error("upload failed", error.message);
        return json({ error: "That image could not be saved." }, 502);
      }
      const publicUrl = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      return json({ image: { url: publicUrl, alt: query, source: "generated" } });
    }

    return json({ error: "Unknown action." }, 400);
  } catch (e) {
    console.error("image-library", e);
    return json({ error: "Something went wrong finding that picture." }, 500);
  }
});
