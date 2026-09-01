// Phoxta — embeddings for the per-tenant RAG index. Provider-agnostic (keeps the
// historical filename so callers don't change).
//   EMBED_PROVIDER = voyage | openai | gemini | local  (auto-detects by which key is set)
//     voyage : voyage-3.5-lite (1024-dim, free tier)        ← ai_embeddings is vector(1024)
//     openai : text-embedding-3-small (1536)
//     gemini : gemini-embedding-001, outputDimensionality 1536
//     local  : whatever LOCAL_EMBED_BASE_URL serves — Qwen3-Embedding-0.6B by
//              default, which is natively 1024-dim and therefore drops straight
//              into the existing column with no re-index and no migration.
//              0.6B is small enough to run on spare CPU next to the voice box.
// NOTE: the ai_embeddings column dimension must match the active provider.
// EMBED_DIM pins the expected dimension (default 1024 = Voyage / Qwen3-Embedding);
// embed() throws a clear error if a provider returns a different size, instead of a
// cryptic insert failure. Set EMBED_DIM=1536 if you switch the column + provider to
// OpenAI/Gemini.
import { assertWithinCap, CAP_REACHED_MESSAGE } from "./meter.ts";
import type { SupabaseClient } from "./supabaseAdmin.ts";

const EXPECTED_DIM = parseInt(Deno.env.get("EMBED_DIM") ?? "1024", 10);

function embedProvider(): "voyage" | "openai" | "gemini" | "local" {
  const p = Deno.env.get("EMBED_PROVIDER");
  if (p === "voyage" || p === "openai" || p === "gemini" || p === "local") return p;
  // LOCAL_EMBED_BASE_URL is its own variable rather than reusing LOCAL_BASE_URL
  // precisely so this auto-detect cannot fire off the chat box: serving a chat
  // model says nothing about whether an embedding model is loaded, and guessing
  // wrong would stall the whole RAG queue on 404s.
  if (Deno.env.get("LOCAL_EMBED_BASE_URL")) return "local";
  if (Deno.env.get("VOYAGE_API_KEY")) return "voyage";
  if (Deno.env.get("GEMINI_API_KEY")) return "gemini";
  return "openai";
}

async function embedVoyage(texts: string[]): Promise<number[][]> {
  const key = Deno.env.get("VOYAGE_API_KEY");
  if (!key) throw new Error("VOYAGE_API_KEY not set");
  const model = Deno.env.get("VOYAGE_MODEL") || "voyage-3.5-lite";
  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, input: texts.map((t) => t.slice(0, 8000)) }),
  });
  if (!res.ok) throw new Error(`voyage embeddings ${res.status} ${await res.text().catch(() => "")}`);
  const data = await res.json();
  return (data.data as { embedding: number[] }[]).map((d) => d.embedding);
}

async function embedOpenAI(texts: string[]): Promise<number[][]> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("OPENAI_API_KEY not set");
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "text-embedding-3-small", input: texts.map((t) => t.slice(0, 8000)) }),
  });
  if (!res.ok) throw new Error(`openai embeddings ${res.status} ${await res.text().catch(() => "")}`);
  const data = await res.json();
  return (data.data as { embedding: number[] }[]).map((d) => d.embedding);
}

async function embedGemini(texts: string[]): Promise<number[][]> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY not set");
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents",
    {
      method: "POST",
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: texts.map((t) => ({
          model: "models/gemini-embedding-001",
          content: { parts: [{ text: t.slice(0, 8000) }] },
          outputDimensionality: EXPECTED_DIM,
        })),
      }),
    },
  );
  if (!res.ok) throw new Error(`gemini embeddings ${res.status} ${await res.text().catch(() => "")}`);
  const data = await res.json();
  return (data.embeddings as { values: number[] }[]).map((e) => e.values);
}

/** Self-hosted embeddings over the OpenAI /embeddings route — vLLM, llama.cpp's
 *  server and Infinity all speak it. No fallback on purpose: embed() is drained
 *  by embed-worker on the five-minute cron, so a box that is briefly down costs
 *  one tick's queue, and silently re-embedding half a tenant's index on a
 *  DIFFERENT model would poison the vector space far more expensively. */
async function embedLocal(texts: string[]): Promise<number[][]> {
  const base = (Deno.env.get("LOCAL_EMBED_BASE_URL") || "").replace(/\/+$/, "");
  if (!base) throw new Error("LOCAL_EMBED_BASE_URL not set");
  const res = await fetch(`${base}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("LOCAL_API_KEY") || "no-key"}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: Deno.env.get("LOCAL_EMBED_MODEL") || "Qwen3-Embedding-0.6B",
      input: texts.map((t) => t.slice(0, 8000)),
    }),
  });
  if (!res.ok) throw new Error(`local embeddings ${res.status} ${await res.text().catch(() => "")}`);
  const data = await res.json();
  return (data.data as { embedding: number[] }[]).map((d) => d.embedding);
}

export async function embed(texts: string[]): Promise<number[][]> {
  const p = embedProvider();
  const vecs = p === "voyage"
    ? await embedVoyage(texts)
    : p === "gemini"
    ? await embedGemini(texts)
    : p === "local"
    ? await embedLocal(texts)
    : await embedOpenAI(texts);
  if (vecs.length && vecs[0].length !== EXPECTED_DIM) {
    throw new Error(
      `embedding dim ${vecs[0].length} from ${p} != ai_embeddings column dim ${EXPECTED_DIM}. ` +
        `Set EMBED_PROVIDER/EMBED_DIM to match the column (1024=Voyage/Qwen3-Embedding, 1536=OpenAI/Gemini).`,
    );
  }
  return vecs;
}

export async function embedOne(text: string): Promise<number[]> {
  return (await embed([text]))[0];
}

// ---------------------------------------------------------------------------
// Text to speech.
//
// Cartesia first, because that is the SAME engine and voice the AI uses on real
// calls (the Pipecat bridge speaks through it) — so a voice note is genuinely
// "what the customer would hear", not an approximation in a stranger's voice.
// OpenAI is the fallback for projects with no Cartesia key.
export type SpeechVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
export const SPEECH_VOICES: SpeechVoice[] = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];

async function speakCartesia(text: string, voiceId: string): Promise<Uint8Array> {
  const key = Deno.env.get("CARTESIA_API_KEY");
  if (!key) throw new Error("no cartesia key");
  const res = await fetch("https://api.cartesia.ai/tts/bytes", {
    method: "POST",
    headers: {
      "X-API-Key": key,
      // Pinned: the response shape is versioned, and an unpinned call can change
      // under us. sonic-english was sunsetted — sonic-2 is the current model.
      "Cartesia-Version": "2024-06-10",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model_id: Deno.env.get("CARTESIA_MODEL") || "sonic-2",
      transcript: text.slice(0, 4000),
      voice: { mode: "id", id: voiceId },
      output_format: { container: "mp3", encoding: "mp3", sample_rate: 44100, bit_rate: 128000 },
    }),
  });
  if (!res.ok) throw new Error(`cartesia speech ${res.status} ${await res.text().catch(() => "")}`);
  return new Uint8Array(await res.arrayBuffer());
}

async function speakOpenAI(text: string, voice: SpeechVoice, instructions?: string): Promise<Uint8Array> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("no openai key");
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini-tts",
      voice,
      input: text.slice(0, 4000),
      response_format: "mp3",
      ...(instructions ? { instructions } : {}),
    }),
  });
  if (!res.ok) throw new Error(`openai speech ${res.status} ${await res.text().catch(() => "")}`);
  return new Uint8Array(await res.arrayBuffer());
}

// ---------------------------------------------------------------------------
// Image generation — the ONE client, and the place image spend is booked.
//
// This used to exist twice: design-assets carried the good client (dall-e-3
// fallback, orientation sizes, friendly errors) and this file carried a bare
// one — and NEITHER metered a single call. gpt-image-1 costs real money per
// picture, the content planner asks for up to thirty in one request, and
// every cent of it was invisible to the monthly cap and the cost dashboard.
// One client, one framing prompt, one booking path.

export type ImageOrientation = "square" | "landscape" | "portrait";

export type MakeImageOpts = {
  /** A WxH string ("1024x1536"). Only its SHAPE is used — each model has its
   *  own pixel sizes, so the orientation is what survives a model fallback. */
  size?: string;
  orientation?: ImageOrientation;
  /** With `orgId`, turns metering ON: the monthly token cap and the daily
   *  image backstop are checked BEFORE the call, and the spend is booked into
   *  ai_usage after it. Every product caller must pass these — the bare form
   *  exists only so the client itself stays testable. */
  admin?: SupabaseClient;
  orgId?: string;
  userId?: string | null;
  /** ai_usage.feature — who asked. Defaults to "image". */
  feature?: string;
};

/* Two models, one shape. gpt-image-1 is the good one and the one to ask for;
   it is also gated behind organisation verification, so an account that has
   not done that gets a 403 naming a model it cannot use. Falling back to
   dall-e-3 there means the feature works on day one rather than after a
   support ticket. The two disagree about parameters — dall-e-3 needs
   response_format to return bytes, gpt-image-1 rejects that parameter
   outright — so the request is built per model rather than patched. */
const IMAGE_SIZES: Record<string, Record<ImageOrientation, string>> = {
  "gpt-image-1": { square: "1024x1024", landscape: "1536x1024", portrait: "1024x1536" },
  "dall-e-3": { square: "1024x1024", landscape: "1792x1024", portrait: "1024x1792" },
};

/** Ninety seconds. A large generation genuinely takes most of a minute, and a
 *  request that hangs past this has failed in a way retrying will not fix. */
const IMAGE_TIMEOUT_MS = 90_000;

/**
 * WHAT ONE PICTURE IS BOOKED AT — the mapping the meter cannot do itself.
 *
 * meter() prices by token count through _shared/pricing.ts, which has no row
 * for image models, so a call routed through it lands as cost 0 — the exact
 * bug this exists to end. The row is therefore written here with cost_cents
 * explicit:
 *
 *   gpt-image-1 → 25¢  (a portrait at default quality is ≈ $0.25; a square is
 *                       less, and rounding UP is the right error for a cap)
 *   dall-e-3    →  8¢  (standard 1024x1792 is $0.08)
 *
 * output_tokens carries a token EQUIVALENT of the same money — cents × 667,
 * what the cents would buy at the balanced tier's $15/M output rate — so
 * assertWithinCap's token sum sees image spend without pricing.ts having to
 * learn about pixels. A gpt-image-1 picture depletes the monthly cap like a
 * ~16,700-token reply, which is roughly what it costs.
 */
const IMAGE_COST_CENTS: Record<string, number> = { "gpt-image-1": 25, "dall-e-3": 8 };
const TOKENS_PER_CENT = 667;

/** The per-org, per-day backstop UNDER the monthly cap: a runaway loop (or a
 *  stolen session) can spend a month's images in one afternoon, and the
 *  monthly cap only notices afterwards. Counted from ai_usage itself — rows
 *  with tier 'image', whatever their feature string says, so every image
 *  caller shares the one bound. */
const IMAGE_DAILY_CAP = Math.max(1, Number(Deno.env.get("IMAGE_DAILY_CAP") ?? "40"));

export const IMAGE_DAILY_CAP_MESSAGE =
  "Today's image allowance for this business is used up. It resets at midnight UTC.";

/** ai_usage.user_id is a uuid column; a label would fail the INSERT silently.
 *  Same coercion meter() applies (its helper is not exported). */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function imagesToday(admin: SupabaseClient, orgId: string): Promise<number> {
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const { count, error } = await admin
    .from("ai_usage")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("tier", "image")
    .gte("created_at", dayStart.toISOString());
  if (error) {
    // Fail OPEN on the backstop alone: the monthly cap was already checked,
    // and refusing every image because a count query hiccuped would be a
    // worse outage than one uncounted afternoon.
    console.error("[phoxta] image daily count failed:", error.message);
    return 0;
  }
  return count ?? 0;
}

/** Book one image into ai_usage. Never throws — metering must not break the
 *  user-facing call, but a failure is logged loudly (see meter.ts for why). */
async function meterImage(
  admin: SupabaseClient,
  orgId: string,
  userId: string | null,
  model: string,
  feature: string,
  latencyMs: number,
): Promise<void> {
  const cents = IMAGE_COST_CENTS[model] ?? 8;
  try {
    const { error } = await admin.from("ai_usage").insert({
      organization_id: orgId,
      user_id: userId && UUID_RE.test(userId) ? userId : null,
      model,
      feature,
      tier: "image",
      input_tokens: 0,
      output_tokens: cents * TOKENS_PER_CENT,
      cache_write_tokens: 0,
      cache_read_tokens: 0,
      latency_ms: latencyMs,
      status: "ok",
      cost_cents: cents,
    });
    if (error) console.error("[phoxta] image ai_usage insert failed:", error.message, { feature, model });
  } catch (e) {
    console.error("[phoxta] meterImage threw:", e instanceof Error ? e.message : String(e));
  }
}

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

async function callImageModel(
  key: string,
  model: string,
  prompt: string,
  size: string,
  signal: AbortSignal,
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
    console.error("image generation failed", model, r.status, detail.slice(0, 400));
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

/** "1024x1536" → portrait; the exact pixels are each model's own business. */
function orientationOf(size: string | undefined): ImageOrientation | null {
  const m = /^(\d+)x(\d+)$/.exec(String(size ?? ""));
  if (!m) return null;
  const w = Number(m[1]), h = Number(m[2]);
  return w > h ? "landscape" : w < h ? "portrait" : "square";
}

/**
 * Make a photograph that does not exist.
 *
 * Returns bytes rather than a URL. OpenAI's hosted URLs expire, and every
 * caller needs to store the file anyway.
 *
 * The framing sentence is not decoration: gpt-image-1 will happily letter a
 * poster, and a headline baked into the photograph sits underneath the
 * design's own headline. One copy of it, here, so a second client cannot
 * forget it again.
 *
 * Throws with a person-usable message: CAP_REACHED_MESSAGE or
 * IMAGE_DAILY_CAP_MESSAGE (compare exactly) when the org is over budget, the
 * friendly provider error otherwise.
 */
export async function makeImage(prompt: string, opts: MakeImageOpts = {}): Promise<Uint8Array> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("Image generation is not configured.");

  if (opts.admin && opts.orgId) {
    const cap = await assertWithinCap(opts.admin, opts.orgId);
    if (!cap.ok) throw new Error(CAP_REACHED_MESSAGE);
    if ((await imagesToday(opts.admin, opts.orgId)) >= IMAGE_DAILY_CAP) {
      throw new Error(IMAGE_DAILY_CAP_MESSAGE);
    }
  }

  const orientation: ImageOrientation = opts.orientation ?? orientationOf(opts.size) ?? "portrait";
  const framed =
    `${prompt}. High quality photograph for a social media graphic. No text, no words, no letters, no logos, no watermarks.`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), IMAGE_TIMEOUT_MS);
  const started = Date.now();
  let model = "gpt-image-1";
  // Initialised to null rather than left definite-assignment-checked: the only
  // path out of the try/catch below that reaches the check is a successful
  // assignment, but making that implicit is how a later edit introduces a
  // "used before assigned" that only shows up at deploy.
  let result: Awaited<ReturnType<typeof callImageModel>> | null = null;
  try {
    result = await callImageModel(key, model, framed, IMAGE_SIZES[model][orientation], ctrl.signal);
    if (!result.ok && isMissingModel(result.status, result.detail)) {
      // The good model is unavailable to this account. Say so in the log,
      // draw the picture anyway.
      console.warn("makeImage falling back to dall-e-3");
      model = "dall-e-3";
      result = await callImageModel(key, model, framed, IMAGE_SIZES[model][orientation], ctrl.signal);
    }
  } catch (e) {
    if ((e as Error)?.name === "AbortError") {
      throw new Error("The image took too long to draw. Try a simpler description.");
    }
    console.error("makeImage threw", e);
    throw new Error("That image could not be generated.");
  } finally {
    clearTimeout(timer);
  }

  if (!result) throw new Error("That image could not be generated.");
  if (!result.ok) throw new Error(friendlyGenError(result.status, result.detail));

  // Booked AFTER a successful draw: a refused prompt did not cost a picture,
  // and the caps above already stopped the over-budget calls before any
  // money moved.
  if (opts.admin && opts.orgId) {
    await meterImage(opts.admin, opts.orgId, opts.userId ?? null, model, opts.feature ?? "image", Date.now() - started);
  }
  return result.bytes;
}

/** Render `text` to MP3 bytes. `voiceId` is the business's own Cartesia voice
 *  when it has one configured. Throws with BOTH providers' reasons if neither
 *  worked, so the caller can tell the owner what to fix rather than guess. */
export async function speak(
  text: string,
  voice: SpeechVoice = "alloy",
  instructions?: string,
  voiceId?: string,
): Promise<Uint8Array> {
  const id = voiceId || Deno.env.get("CARTESIA_VOICE_ID") || "";
  const problems: string[] = [];
  if (id) {
    try {
      return await speakCartesia(text, id);
    } catch (e) {
      problems.push(`cartesia: ${(e as Error).message}`);
    }
  }
  try {
    return await speakOpenAI(text, voice, instructions);
  } catch (e) {
    problems.push(`openai: ${(e as Error).message}`);
  }
  throw new Error(problems.join(" | ") || "No text-to-speech provider is configured.");
}
