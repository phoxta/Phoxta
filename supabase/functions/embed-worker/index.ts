// Phoxta — embed-worker: drains ai_embedding_queue into the pgvector index.
// Invoked fire-and-forget by the app after writes; in production run on pg_cron.
// Requires a signed-in user (limits who can trigger an OpenAI spend).
import { preflight, json } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { embed } from "../_shared/openai.ts";

const BATCH = 50;

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  const auth = await requireUser(req);
  if ("error" in auth) return auth.error;

  try {
    const admin = adminClient();
    const { data: queued } = await admin
      .from("ai_embedding_queue")
      .select("id, organization_id, source_type, source_id, content")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(BATCH);

    const rows = (queued as { id: string; organization_id: string; source_type: string; source_id: string; content: string }[] | null) ?? [];
    if (rows.length === 0) return json({ processed: 0 });

    // Collapse duplicate (organization_id, source_type, source_id) entries: the
    // queue can hold several pending rows for the same source (e.g. a page edited
    // and re-published), but a single ON CONFLICT upsert cannot affect the same
    // key twice. Rows come oldest-first, so the last write wins (newest content).
    // We still mark every fetched queue row done below.
    const byKey = new Map<string, (typeof rows)[number]>();
    for (const r of rows) byKey.set(`${r.organization_id}::${r.source_type}::${r.source_id}`, r);
    const unique = [...byKey.values()];

    let vectors: number[][];
    try {
      vectors = await embed(unique.map((r) => r.content));
    } catch (e) {
      console.error("embed-worker embeddings error", e);
      return json({ error: "Embeddings provider not available.", detail: String(e instanceof Error ? e.message : e), processed: 0 }, 200);
    }

    const upserts = unique.map((r, i) => ({
      organization_id: r.organization_id,
      source_type: r.source_type,
      source_id: r.source_id,
      content: r.content,
      embedding: vectors[i],
    }));
    const { error: upErr } = await admin.from("ai_embeddings").upsert(upserts, { onConflict: "organization_id,source_type,source_id" });
    if (upErr) {
      console.error("embed-worker upsert error", upErr);
      return json({ error: "Could not store embeddings.", detail: upErr.message, processed: 0 }, 200);
    }

    await admin.from("ai_embedding_queue").update({ status: "done" }).in("id", rows.map((r) => r.id));
    return json({ processed: unique.length });
  } catch (err) {
    console.error("embed-worker error", err);
    return json({ error: "Worker error.", processed: 0 }, 200);
  }
});
