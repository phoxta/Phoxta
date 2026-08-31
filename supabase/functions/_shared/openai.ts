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

/** Render `text` to MP3 bytes. `voiceId` is the business's own Cartesia voice
 *  when it has one configured. Throws with BOTH providers' reasons if neither
 *  worked, so the caller can tell the owner what to fix rather than guess. */
/**
 * Make a photograph that does not exist.
 *
 * Shared because two callers need it now — the editor's photo slot and the
 * content planner — and a second copy of the prompt is a second place for
 * "no text, no words, no logos" to be forgotten. That instruction is not
 * decoration: gpt-image-1 will happily letter a poster, and a headline baked
 * into the photograph sits underneath the design's own headline.
 *
 * Returns bytes rather than a URL. OpenAI's hosted URLs expire, and the two
 * callers both need to store the file anyway.
 */
export async function makeImage(prompt: string, size = "1024x1536"): Promise<Uint8Array> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("Image generation is not configured.");

  const r = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt: `${prompt}. Professional photography for a social media post. No text, no words, no letters, no logos, no watermarks.`,
      size,
      n: 1,
    }),
  });
  if (!r.ok) {
    const detail = await r.text().catch(() => "");
    console.error("image generation failed", r.status, detail.slice(0, 400));
    // The upstream message is not passed through: it can carry account and
    // billing detail that is not the caller's business.
    throw new Error(r.status === 429 ? "Too many images at once. Try again shortly." : "That image could not be generated.");
  }

  const out = await r.json();
  const b64 = out?.data?.[0]?.b64_json;
  const url = out?.data?.[0]?.url;
  if (b64) return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  if (url) {
    const img = await fetch(url);
    if (!img.ok) throw new Error("That image could not be saved.");
    return new Uint8Array(await img.arrayBuffer());
  }
  throw new Error("That image could not be generated.");
}

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
