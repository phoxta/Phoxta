// Phoxta — design-assets: the graphics studio's asset library.
//
// One endpoint for everything the editor can put in a photo slot that has to
// OUTLIVE the click: the pictures this business already owns, the ones it
// uploads now, and the ones the model draws for it.
//
//   list      — this org's objects in the `design-assets` bucket, newest first.
//   upload    — base64 image bytes in, a stored asset out.
//   delete    — one object, org-scoped.
//   generate  — OpenAI images; the bytes are stored exactly like an upload, so
//               a generated picture IS just an asset from then on.
//   stock     — a thin pass-through to _shared/stock.ts (Pexels), so the client
//               never holds the key and never re-implements the search.
//
// WHY A BUCKET AND NOT A DATA URI. The old upload path read the file straight
// to a data URI and inlined it in the design document. That works once and is
// wrong twice: the same logo re-uploaded for every post bloats every row it
// touches, and nothing the business owns is ever findable again. Stored
// objects give the library a memory.
//
// WHY THE SAME SHAPE FOR ALL THREE. `list`, `upload` and `generate` all return
// the identical Asset record. The client therefore has one card component, one
// insert path and one delete path — and "regenerate" is not a special mode, it
// is just another row appearing at the top of the grid.
//
// WHY THE KEYS LIVE HERE. Neither PEXELS_API_KEY nor OPENAI_API_KEY carries a
// VITE_ prefix, so Vite cannot inline them into the browser bundle. A key in a
// bundle is a published key. The browser only ever receives URLs.
//
// AUTHORISATION is org membership, via authorize() from _shared/auth.ts — the
// same gate help-center uses. The org id in the body is never trusted for a
// write: it is the id the gate authorised, or the request never gets this far.
import { preflight, json } from "../_shared/cors.ts";
import { authorize } from "../_shared/auth.ts";
import { searchStockMany } from "../_shared/stock.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

const BUCKET = "design-assets";

/** 10MB. Bigger than any photograph a social post needs, small enough that a
 *  base64 body still fits comfortably in a function request. */
const MAX_BYTES = 10 * 1024 * 1024;

/** SVG is deliberately absent. Storage serves an object with the content type
 *  it was given, and an SVG is a script document — a public bucket that will
 *  serve arbitrary tenant-uploaded SVG is a stored-XSS surface on the storage
 *  origin. Raster formats only. */
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"]);

/** The shape every action that returns a picture returns. */
type Asset = {
  /** Full object path, "<orgId>/<file>". The delete key. */
  path: string;
  /** Human label, and what the client searches on. */
  name: string;
  url: string;
  size: number;
  createdAt: string;
  source: "upload" | "generated";
};

/* ── Naming ───────────────────────────────────────────────────────────────
   Supabase Storage objects carry no custom metadata we can rely on, so the
   provenance and the label live in the object name itself:

       <kind>__<millis>__<slug>.<ext>        kind = "up" | "gen"

   The separator is a double underscore and the slug is stripped to
   [a-z0-9.-], so no user-supplied text can ever contain the separator and the
   parse below cannot be spoofed into claiming a different provenance. */

const SEP = "__";

function slug(s: string, fallback: string): string {
  const t = s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/g, "");
  return t || fallback;
}

/** The extension comes from the CONTENT TYPE, never from the supplied name:
 *  the name is a label here (a prompt, for a generated image), and a prompt
 *  that happens to end in ".jpg" must not put a lying extension on PNG bytes. */
function extFor(type: string): string {
  const sub = (type.split("/")[1] ?? "").replace(/[^a-z0-9]/g, "");
  if (sub === "jpeg") return "jpg";
  return /^(png|jpg|webp|gif|avif)$/.test(sub) ? sub : "png";
}

/** The four random characters are not decoration: two files dropped together
 *  can land in the same millisecond, and `upsert: false` would fail the second
 *  one for a name clash that has nothing to do with the person's intent. */
function objectName(kind: "up" | "gen", label: string, ext: string): string {
  const token = crypto.randomUUID().slice(0, 4);
  return `${kind}${SEP}${Date.now()}${token}${SEP}${slug(label, kind === "gen" ? "generated" : "image")}.${ext}`;
}

/** Read provenance and label back out of an object name. Anything that does
 *  not match the scheme (an object written before it existed, or by hand) is
 *  reported as an upload named after its file — never dropped from the list. */
function readName(file: string): { source: Asset["source"]; name: string } {
  const parts = file.split(SEP);
  if (parts.length >= 3 && (parts[0] === "up" || parts[0] === "gen")) {
    return { source: parts[0] === "gen" ? "generated" : "upload", name: parts.slice(2).join(SEP) };
  }
  return { source: "upload", name: file };
}

/* ── Storage ─────────────────────────────────────────────────────────────── */

let bucketReady = false;
async function ensureBucket(admin: Json) {
  if (bucketReady) return;
  // PUBLIC, deliberately, and the editor says so where people upload.
  //
  // A design references its pictures by URL and is re-opened, re-exported and
  // re-rendered for months; a signed URL expires, so every design older than
  // the expiry would reopen with its photographs missing. Re-signing on load
  // does not fix it either — the exporter inlines what the SVG points at, and a
  // URL that dies is a design that cannot be reproduced.
  //
  // What that costs is understood: anyone holding the URL can fetch the file
  // without signing in. Nothing is guessable — paths are prefixed by the
  // organisation's UUID and a random token — but a leaked link stays good, so
  // this bucket is for artwork, not for documents. LISTING is still gated:
  // every action below checks the caller's membership of the org, so one
  // business cannot enumerate another's library.
  //
  // Idempotent: createBucket throws (or errors) when it already exists, which
  // is the normal case on every request after the first in a cold instance.
  try { await admin.storage.createBucket(BUCKET, { public: true }); } catch (_) { /* already exists */ }
  bucketReady = true;
}

function assetFor(admin: Json, orgId: string, file: string, size: number, createdAt: string): Asset {
  const path = `${orgId}/${file}`;
  const { source, name } = readName(file);
  return {
    path,
    name,
    url: admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl,
    size,
    createdAt,
    source,
  };
}

/** Store bytes and answer with the asset record. Shared by upload and
 *  generate, which is the whole point: a generated image is an upload the
 *  business did not have to take a photograph for. */
async function store(
  admin: Json, orgId: string, kind: "up" | "gen", label: string, type: string, bytes: Uint8Array,
): Promise<{ asset?: Asset; error?: string }> {
  await ensureBucket(admin);
  const file = objectName(kind, label, extFor(type));
  const path = `${orgId}/${file}`;
  const { error } = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: type, upsert: false });
  if (error) {
    console.error("design-assets store failed", error.message);
    return { error: "That image could not be saved." };
  }
  return { asset: assetFor(admin, orgId, file, bytes.length, new Date().toISOString()) };
}

/** Every write lands in the tenant's own audit trail, best-effort. */
async function audit(admin: Json, orgId: string, tool: string, args: Json, summary: string) {
  try {
    await admin.from("agent_audit_log").insert({
      organization_id: orgId, actor: "owner", tool, args, status: "ok", summary,
    });
  } catch (_) { /* the action still ran */ }
}

/* ── Image generation ─────────────────────────────────────────────────────
   Two models, one shape. gpt-image-1 is the good one and the one to ask for;
   it is also gated behind organisation verification, so an account that has
   not done that gets a 403 naming a model it cannot use. Falling back to
   dall-e-3 there means the feature works on day one rather than after a
   support ticket. The two disagree about parameters — dall-e-3 needs
   response_format to return bytes, gpt-image-1 rejects that parameter
   outright — so the request is built per model rather than patched. */

type Orientation = "square" | "landscape" | "portrait";

const SIZES: Record<string, Record<Orientation, string>> = {
  "gpt-image-1": { square: "1024x1024", landscape: "1536x1024", portrait: "1024x1536" },
  "dall-e-3": { square: "1024x1024", landscape: "1792x1024", portrait: "1024x1792" },
};

/** Ninety seconds. A large generation genuinely takes most of a minute, and a
 *  request that hangs past this has failed in a way retrying will not fix. */
const GEN_TIMEOUT_MS = 90_000;

function isMissingModel(status: number, detail: string): boolean {
  const t = detail.toLowerCase();
  if (t.includes("model_not_found") || t.includes("must be verified")) return true;
  if (status === 404) return true;
  if ((status === 400 || status === 403) && t.includes("model")) {
    return t.includes("not found") || t.includes("does not exist") || t.includes("unsupported")
      || t.includes("invalid") || t.includes("access") || t.includes("not have");
  }
  return false;
}

/** Turn a provider failure into something a person can act on. The upstream
 *  body is logged, never returned: it can carry account, quota and billing
 *  detail that is not this user's business. */
function friendlyGenError(status: number, detail: string): string {
  const t = detail.toLowerCase();
  if (t.includes("moderation") || t.includes("content_policy") || t.includes("safety_violation")) {
    return "The image model refused that prompt. Describe the picture differently and try again.";
  }
  if (status === 429 || t.includes("rate limit")) return "The image service is busy. Try again in a moment.";
  if (status === 401 || status === 403) return "Image generation is not available on this account right now.";
  return "That image could not be generated.";
}

async function callOpenAI(
  key: string, model: string, prompt: string, size: string, signal: AbortSignal,
): Promise<{ ok: true; bytes: Uint8Array } | { ok: false; status: number; detail: string }> {
  const payload: Record<string, unknown> = { model, prompt, size, n: 1 };
  // gpt-image-1 always returns base64 and rejects response_format; dall-e-3
  // defaults to a URL that expires within the hour, so it must be asked.
  if (model === "dall-e-3") payload.response_format = "b64_json";

  const r = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });

  if (!r.ok) {
    const detail = await r.text().catch(() => "");
    console.error("design-assets generate failed", model, r.status, detail.slice(0, 400));
    return { ok: false, status: r.status, detail };
  }

  const out = await r.json();
  const b64 = out?.data?.[0]?.b64_json;
  if (b64) return { ok: true, bytes: Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)) };

  // Belt and braces: if a model ever answers with a URL anyway, fetch it now.
  // Storing an expiring URL on a design produces a post that renders today and
  // is a broken image next week — the worst kind of failure, because it
  // happens after everyone has stopped looking.
  const url = out?.data?.[0]?.url;
  if (url) {
    const img = await fetch(url, { signal });
    if (img.ok) return { ok: true, bytes: new Uint8Array(await img.arrayBuffer()) };
  }
  return { ok: false, status: 502, detail: "no image data" };
}

/* ── The endpoint ─────────────────────────────────────────────────────────── */

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    const body = (await req.json().catch(() => ({}))) as Json;
    const orgId = String(body.orgId ?? "");
    const gate = await authorize(req, orgId);
    if (gate.error) return gate.error;
    const { admin } = gate.ok;
    const action = String(body.action ?? "list");

    // ── list: this org's assets, newest first ────────────────────────────
    if (action === "list") {
      await ensureBucket(admin);
      const limit = Math.min(500, Math.max(1, Number(body.limit) || 200));
      const { data, error } = await admin.storage.from(BUCKET).list(orgId, {
        limit,
        offset: Math.max(0, Number(body.offset) || 0),
        sortBy: { column: "created_at", order: "desc" },
      });
      if (error) {
        console.error("design-assets list failed", error.message);
        return json({ error: "The asset library could not be read." }, 502);
      }
      const assets = (data ?? [])
        // Storage inserts a hidden placeholder object to keep an empty folder
        // alive; it has no id and is not anybody's picture.
        .filter((o: Json) => o?.id && o.name && o.name !== ".emptyFolderPlaceholder")
        .map((o: Json) => assetFor(
          admin, orgId, String(o.name),
          Number(o.metadata?.size ?? 0),
          String(o.created_at ?? o.updated_at ?? new Date().toISOString()),
        ));
      return json({ assets });
    }

    // ── upload ───────────────────────────────────────────────────────────
    if (action === "upload") {
      const name = String(body.name ?? "image").slice(0, 120);
      const type = String(body.type ?? "").toLowerCase().split(";")[0].trim();
      if (!type.startsWith("image/")) return json({ error: "Only images can be added to the library." }, 400);
      if (!ALLOWED.has(type)) return json({ error: "Use a PNG, JPEG, WebP, GIF or AVIF image." }, 400);

      const b64 = String(body.data ?? "");
      // Reject on the encoded length before decoding: 10MB of bytes is about
      // 13.4MB of base64, and decoding a hostile 200MB string to find out it
      // was too big is the whole attack.
      if (b64.length > MAX_BYTES * 1.4) return json({ error: "Keep images under 10MB." }, 400);

      let bytes: Uint8Array;
      try {
        bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      } catch (_) {
        return json({ error: "That file didn't survive the trip — try again." }, 400);
      }
      if (bytes.length === 0) return json({ error: "That file is empty." }, 400);
      if (bytes.length > MAX_BYTES) return json({ error: "Keep images under 10MB." }, 400);

      const label = name.replace(/\.[a-z0-9]{2,5}$/i, "");
      const { asset, error } = await store(admin, orgId, "up", label || "image", type, bytes);
      if (error || !asset) return json({ error: error ?? "That image could not be saved." }, 502);
      await audit(admin, orgId, "design_asset_upload", { path: asset.path, bytes: bytes.length }, `Design asset "${asset.name}" uploaded.`);
      return json({ asset });
    }

    // ── delete ───────────────────────────────────────────────────────────
    if (action === "delete") {
      const raw = String(body.path ?? "").trim();
      if (!raw) return json({ error: "Which asset? Pass its path." }, 400);
      // Accept either the full path or the bare object name, then rebuild it
      // from the org the gate authorised. A path is never used as given, so no
      // "../" or foreign-org prefix can reach the storage call.
      const file = raw.startsWith(`${orgId}/`) ? raw.slice(orgId.length + 1) : raw;
      if (!file || file.includes("/") || file.includes("..")) {
        return json({ error: "That asset does not belong to this business." }, 403);
      }
      const path = `${orgId}/${file}`;
      const { error } = await admin.storage.from(BUCKET).remove([path]);
      if (error) {
        console.error("design-assets delete failed", error.message);
        return json({ error: "That asset could not be deleted." }, 502);
      }
      await audit(admin, orgId, "design_asset_delete", { path }, `Design asset "${readName(file).name}" deleted.`);
      return json({ ok: true });
    }

    // ── generate ─────────────────────────────────────────────────────────
    if (action === "generate") {
      const key = Deno.env.get("OPENAI_API_KEY");
      if (!key) return json({ error: "Image generation is not configured." }, 503);

      const prompt = String(body.prompt ?? body.query ?? "").trim().slice(0, 900);
      if (!prompt) return json({ error: "Describe the picture you want." }, 400);
      const wanted = String(body.orientation ?? body.size ?? "square");
      const orientation: Orientation =
        wanted === "landscape" || wanted === "portrait" ? wanted : "square";

      // A little direction, not a rewrite. Diffusion models render lettering as
      // garbled shapes, and this picture is going under real type in the
      // editor — so ask for the picture and leave the words to the canvas.
      const framed = `${prompt}. High quality image for a social media graphic. No text, no words, no letters, no logos, no watermarks.`;

      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), GEN_TIMEOUT_MS);
      // Initialised to null rather than left definite-assignment-checked: the
      // only path out of the try/catch below that reaches the check is a
      // successful assignment, but making that implicit is how a later edit
      // introduces an "used before assigned" that only shows up at deploy.
      let result: Awaited<ReturnType<typeof callOpenAI>> | null = null;
      try {
        result = await callOpenAI(key, "gpt-image-1", framed, SIZES["gpt-image-1"][orientation], ctrl.signal);
        if (!result.ok && isMissingModel(result.status, result.detail)) {
          // The good model is unavailable to this account. Say so in the log,
          // draw the picture anyway.
          console.warn("design-assets falling back to dall-e-3");
          result = await callOpenAI(key, "dall-e-3", framed, SIZES["dall-e-3"][orientation], ctrl.signal);
        }
      } catch (e) {
        const aborted = (e as Error)?.name === "AbortError";
        console.error("design-assets generate threw", e);
        return json({
          error: aborted
            ? "The image took too long to draw. Try a simpler description."
            : "That image could not be generated.",
        }, 504);
      } finally {
        clearTimeout(timer);
      }

      if (!result) return json({ error: "That image could not be generated." }, 502);
      if (!result.ok) return json({ error: friendlyGenError(result.status, result.detail) }, 502);

      const { asset, error } = await store(admin, orgId, "gen", prompt, "image/png", result.bytes);
      if (error || !asset) return json({ error: error ?? "That image could not be saved." }, 502);
      await audit(admin, orgId, "design_asset_generate", { path: asset.path, orientation }, `Image generated: "${prompt.slice(0, 80)}".`);
      // `alt` carries the prompt so the design that uses it has a real
      // description rather than a filename.
      return json({ asset, alt: prompt });
    }

    // ── stock: Pexels, through the one module that knows how ─────────────
    if (action === "stock") {
      const query = String(body.query ?? "").trim().slice(0, 400);
      if (!query) return json({ error: "Say what the photograph should show." }, 400);
      // An empty list is a real answer — "nothing matched" — and is reported as
      // one. An error here would make the editor show a failure for a search
      // that simply found nothing.
      const photos = await searchStockMany(query, 24);
      return json({ photos });
    }

    return json({ error: "Unknown action." }, 400);
  } catch (e) {
    console.error("design-assets", e);
    return json({ error: "Something went wrong in the asset library." }, 500);
  }
});
