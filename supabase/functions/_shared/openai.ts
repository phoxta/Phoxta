// Phoxta — embeddings for the per-tenant RAG index. Provider-agnostic (keeps the
// historical filename so callers don't change).
//   EMBED_PROVIDER = voyage | openai | gemini  (auto-detects by which key is set)
//     voyage : voyage-3.5-lite (1024-dim, free tier)        ← ai_embeddings is vector(1024)
//     openai : text-embedding-3-small (1536)
//     gemini : gemini-embedding-001, outputDimensionality 1536
// NOTE: the ai_embeddings column dimension must match the active provider.
// EMBED_DIM pins the expected dimension (default 1024 = Voyage); embed() throws a
// clear error if a provider returns a different size, instead of a cryptic insert
// failure. Set EMBED_DIM=1536 if you switch the column + provider to OpenAI/Gemini.
const EXPECTED_DIM = parseInt(Deno.env.get("EMBED_DIM") ?? "1024", 10);

function embedProvider(): "voyage" | "openai" | "gemini" {
  const p = Deno.env.get("EMBED_PROVIDER");
  if (p === "voyage" || p === "openai" || p === "gemini") return p;
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

export async function embed(texts: string[]): Promise<number[][]> {
  const p = embedProvider();
  const vecs = p === "voyage" ? await embedVoyage(texts) : p === "gemini" ? await embedGemini(texts) : await embedOpenAI(texts);
  if (vecs.length && vecs[0].length !== EXPECTED_DIM) {
    throw new Error(
      `embedding dim ${vecs[0].length} from ${p} != ai_embeddings column dim ${EXPECTED_DIM}. ` +
        `Set EMBED_PROVIDER/EMBED_DIM to match the column (1024=Voyage, 1536=OpenAI/Gemini).`,
    );
  }
  return vecs;
}

export async function embedOne(text: string): Promise<number[]> {
  return (await embed([text]))[0];
}
