// Phoxta — embed-worker: drains ai_embedding_queue into the pgvector index.
//
// Two ways in:
//   - the scheduler (x-cron-secret)  → the whole platform's queue, oldest first
//   - a signed-in member (the console nudges this after a write — see
//     src/lib/db/ops/ai.ts drainEmbeddings) → ONLY the businesses they belong
//     to. A member's session used to drain every tenant's rows; the platform
//     sweep is the scheduler's alone.
//
// ── WHY THE ROWS ARE CLAIMED, CHUNKED AND ALLOWED TO FAIL ───────────────────
//
// It used to SELECT fifty pending rows, embed them in one call, upsert, and mark
// them done. Three things were wrong with that and they compounded:
//
//   1. Nothing claimed the rows. Two ticks (the cron and a console nudge landing
//      a second apart) both read the same fifty and both paid to embed them.
//   2. One bad row failed the whole batch — and the failure returned HTTP 200
//      with processed:0, left every row 'pending', and never wrote the 'error'
//      status the table has had since 0007. The next tick picked up the same
//      fifty, hit the same row, and the queue stopped for ever while the log
//      said "ok".
//   3. A long document went in as ONE vector. Retrieval over a 40 KB page is a
//      vector that means "this page, vaguely"; the provider truncates or refuses
//      the ones that are too long anyway.
//
// So: rows are claimed atomically (app_claim_embedding_jobs, FOR UPDATE SKIP
// LOCKED, attempts counted); content is split into ~4,000-character chunks with
// a 200-character overlap, one ai_embeddings row per chunk (0131 adds chunk_ix);
// a failed batch falls back to embedding each source on its own so one bad row
// costs one row; a row that has failed three times is marked 'error' with the
// reason; and a tick that achieved nothing returns non-200 and a failed
// heartbeat so the VM log and the console both show it.
import { preflight, json } from "../_shared/cors.ts";
import { isCronRequest, requireMemberOrgs } from "../_shared/auth.ts";
import { adminClient, type SupabaseClient } from "../_shared/supabaseAdmin.ts";
import { embed } from "../_shared/openai.ts";

const BATCH = 50;
/** Chunks per provider call. Fifty sources at several chunks each would be a
 *  single request of a few hundred inputs; providers cap batch size and a
 *  bigger batch is a bigger blast radius when one input is refused. */
const EMBED_BATCH = 32;
/** Three strikes. Counted by the claim RPC, so a crash between claim and
 *  write-back still counts as an attempt. */
const MAX_ATTEMPTS = 3;

// ── Chunking (the 0131 contract) ─────────────────────────────────────────────
const CHUNK_SIZE = 4_000;
const CHUNK_OVERLAP = 200;

/**
 * Split text into ~CHUNK_SIZE-character pieces with CHUNK_OVERLAP characters of
 * carry-over, breaking on a paragraph where one falls in the back half of the
 * window, else on a line, else on a space — so a chunk ends where a thought
 * ends rather than mid-word. Short text is one chunk. Empty text is no chunks.
 */
export function chunkText(text: string, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const t = String(text ?? "").replace(/\r\n/g, "\n").trim();
  if (!t) return [];
  if (t.length <= size) return [t];
  const out: string[] = [];
  let start = 0;
  while (start < t.length) {
    let end = Math.min(t.length, start + size);
    if (end < t.length) {
      // Prefer a natural boundary in the back half of the window.
      const floor = start + Math.floor(size / 2);
      const para = t.lastIndexOf("\n\n", end);
      const line = t.lastIndexOf("\n", end);
      const space = t.lastIndexOf(" ", end);
      const cut = para > floor ? para : line > floor ? line : space > floor ? space : -1;
      if (cut > start) end = cut;
    }
    const piece = t.slice(start, end).trim();
    if (piece) out.push(piece);
    if (end >= t.length) break;
    // Overlap, but always move forward: a window that cannot advance is a
    // window that loops for ever.
    start = Math.max(end - overlap, start + 1);
  }
  return out;
}

// ── Types ────────────────────────────────────────────────────────────────────
type QueueRow = {
  id: string;
  organization_id: string;
  source_type: string;
  source_id: string;
  content: string;
  attempts?: number | null;
};

/** One source (org, type, id) — possibly several queue rows collapsed onto it. */
type Job = { key: string; row: QueueRow; rowIds: string[]; chunks: string[] };

/** PostgREST's "that function does not exist" — the migration is behind the deploy. */
const isMissingFn = (e: { code?: string; message?: string } | null): boolean =>
  !!e && (e.code === "PGRST202" || e.code === "42883" || /schema cache|does not exist/i.test(e.message ?? ""));

async function claim(admin: SupabaseClient, orgs: string[] | null): Promise<{ rows: QueueRow[]; claimed: boolean }> {
  const { data, error } = await admin.rpc("app_claim_embedding_jobs", { p_limit: BATCH, p_orgs: orgs });
  if (!error) return { rows: (data as QueueRow[] | null) ?? [], claimed: true };
  if (!isMissingFn(error)) throw new Error(`claim failed: ${error.message}`);
  // Deploy landed ahead of migration 0129. Degrade to the old unclaimed read so
  // the queue keeps moving, but say so loudly: this path has the double-embed
  // race the RPC exists to close.
  console.warn("[phoxta] embed-worker: app_claim_embedding_jobs is missing (apply migration 0129) — reading the queue unclaimed");
  let q = admin
    .from("ai_embedding_queue")
    .select("id, organization_id, source_type, source_id, content")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(BATCH);
  if (orgs) q = q.in("organization_id", orgs);
  const { data: legacy, error: le } = await q;
  if (le) throw new Error(`queue read failed: ${le.message}`);
  return { rows: (legacy as QueueRow[] | null) ?? [], claimed: false };
}

/** Write one source's vectors: one row per chunk, then drop the chunks a
 *  shorter re-index no longer has. Throws on a storage error so the caller can
 *  count it against the row. */
async function store(admin: SupabaseClient, job: Job, vectors: number[][]): Promise<void> {
  const { row, chunks } = job;
  if (chunks.length) {
    const { error } = await admin.from("ai_embeddings").upsert(
      chunks.map((content, chunk_ix) => ({
        organization_id: row.organization_id,
        source_type: row.source_type,
        source_id: row.source_id,
        chunk_ix,
        content,
        embedding: vectors[chunk_ix],
      })),
      { onConflict: "organization_id,source_type,source_id,chunk_ix" },
    );
    if (error) throw new Error(`store failed: ${error.message}`);
  }
  // A page that was six chunks and is now four must not keep answering from
  // chunks five and six. Empty content deletes everything (chunk_ix >= 0).
  const { error: delErr } = await admin
    .from("ai_embeddings")
    .delete()
    .eq("organization_id", row.organization_id)
    .eq("source_type", row.source_type)
    .eq("source_id", row.source_id)
    .gte("chunk_ix", chunks.length);
  if (delErr) throw new Error(`trim failed: ${delErr.message}`);
}

async function markDone(admin: SupabaseClient, ids: string[]): Promise<void> {
  if (!ids.length) return;
  await admin.from("ai_embedding_queue").update({ status: "done", last_error: null }).in("id", ids);
}

/** A failed source: back to pending with the reason, or 'error' once it has
 *  used its three attempts. `attempts` was already counted by the claim. */
async function markFailed(admin: SupabaseClient, job: Job, reason: string): Promise<"retry" | "error"> {
  const attempts = Number(job.row.attempts ?? 1);
  const status = attempts >= MAX_ATTEMPTS ? "error" : "pending";
  await admin
    .from("ai_embedding_queue")
    .update({ status, last_error: reason.slice(0, 500) })
    .in("id", job.rowIds);
  return status === "error" ? "error" : "retry";
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  // Who is asking decides how wide the drain is.
  const cron = isCronRequest(req);
  let orgs: string[] | null = null;
  if (!cron) {
    const who = await requireMemberOrgs(req);
    if (who.error) return who.error;
    orgs = who.orgIds;
  }

  const admin = adminClient();
  // A heartbeat, so cron_heartbeats proves THIS worker ran rather than only
  // proving the loop that pings it is alive. Only the scheduled leg beats: a
  // member's nudge is not evidence the schedule is working.
  const beat = async (ok: boolean, detail: string) => {
    if (!cron) return;
    try { await admin.rpc("app_cron_beat", { p_worker: "embed-worker", p_ok: ok, p_detail: detail }); } catch { /* the tick still ran */ }
  };

  try {
    const { rows, claimed } = await claim(admin, orgs);
    if (rows.length === 0) {
      await beat(true, "queue empty");
      return json({ processed: 0 });
    }

    // Collapse duplicate (organization_id, source_type, source_id) entries: the
    // queue can hold several rows for the same source (a page edited and
    // re-published twice between ticks). Rows come oldest-first, so the last
    // write wins (newest content); every collapsed row is settled together.
    const byKey = new Map<string, Job>();
    for (const r of rows) {
      const key = `${r.organization_id}::${r.source_type}::${r.source_id}`;
      const prev = byKey.get(key);
      if (prev) {
        prev.row = r;
        prev.rowIds.push(r.id);
      } else {
        byKey.set(key, { key, row: r, rowIds: [r.id], chunks: [] });
      }
    }
    const jobs = [...byKey.values()];
    for (const j of jobs) j.chunks = chunkText(j.row.content);

    let done = 0, retried = 0, errored = 0, chunksWritten = 0;
    const failures: string[] = [];

    /** Embed + store a set of jobs as one provider call. Returns false if the
     *  provider call itself failed (the caller then retries per job). A storage
     *  failure is per job and is settled here. */
    const runBatch = async (batch: Job[]): Promise<boolean> => {
      const inputs = batch.flatMap((j) => j.chunks);
      let vectors: number[][] = [];
      if (inputs.length) {
        try {
          vectors = await embed(inputs);
        } catch {
          return false;
        }
      }
      let cursor = 0;
      for (const j of batch) {
        const mine = vectors.slice(cursor, cursor + j.chunks.length);
        cursor += j.chunks.length;
        try {
          await store(admin, j, mine);
          await markDone(admin, j.rowIds);
          done++;
          chunksWritten += j.chunks.length;
        } catch (e) {
          const reason = e instanceof Error ? e.message : String(e);
          failures.push(`${j.key}: ${reason}`);
          if ((await markFailed(admin, j, reason)) === "error") errored++; else retried++;
        }
      }
      return true;
    };

    // Batches sized by CHUNK count, not job count, so one long document does
    // not drag forty short ones into a single oversized request.
    let group: Job[] = [];
    let groupChunks = 0;
    const flush = async () => {
      if (!group.length) return;
      const batch = group;
      group = [];
      groupChunks = 0;
      if (await runBatch(batch)) return;
      // The provider refused the batch. One bad input must cost one row, not
      // fifty: retry each source alone so the offender is the only one marked.
      for (const j of batch) {
        if (await runBatch([j])) continue;
        // Still failing on its own: the provider rejects THIS content (or is
        // down — in which case every row lands here and the tick reports it).
        let reason = "embedding provider refused this content";
        try { await embed(j.chunks.slice(0, 1)); } catch (e) { reason = e instanceof Error ? e.message : String(e); }
        failures.push(`${j.key}: ${reason}`);
        if ((await markFailed(admin, j, reason)) === "error") errored++; else retried++;
      }
    };
    for (const j of jobs) {
      if (group.length && groupChunks + j.chunks.length > EMBED_BATCH) await flush();
      group.push(j);
      groupChunks += j.chunks.length;
    }
    await flush();

    const detail =
      `${done} of ${jobs.length} source(s) indexed (${chunksWritten} chunk(s)), ${retried} back on the queue, ${errored} marked error` +
      (claimed ? "" : " — UNCLAIMED READ, apply migration 0129") +
      (failures.length ? `; first failure: ${failures[0]}` : "");
    // Nothing indexed and something failed is a broken tick, and a broken tick
    // says so with its status code: the VM log only sees the HTTP code.
    const totalFailure = done === 0 && failures.length > 0;
    await beat(!totalFailure && claimed, detail);
    console.log(`[phoxta] embed-worker: ${detail}`);
    return json(
      { processed: done, chunks: chunksWritten, retried, errored, failures: failures.slice(0, 10), ...(claimed ? {} : { warning: "unclaimed read — apply migration 0129" }) },
      totalFailure ? 502 : 200,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("embed-worker error", msg);
    await beat(false, msg);
    return json({ error: "Worker error.", detail: msg, processed: 0 }, 500);
  }
});
