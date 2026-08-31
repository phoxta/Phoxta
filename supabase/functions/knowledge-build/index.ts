// Phoxta — knowledge-build: the knowledge base builds itself.
//
// Uploading a knowledge base by hand is the thing nobody keeps doing. It is
// accurate the week it is written and quietly wrong six months later — which is
// exactly how the platform agent came to recite ten blueprints when five
// existed. So this reads what the app CURRENTLY contains (profile, published
// pages, live catalogue) and writes the agent's prose knowledge from it,
// refreshing only when those inputs change.
//
// What it deliberately does NOT write: counts, prices, availability, "we offer
// five blueprints from $499". Those go stale the moment a sixth is added, which
// is the same failure one level up. Countable facts come from tools
// (list_blueprints / list_products), true at the moment they are asked. This
// generates the things a tool cannot express — what the business is for, who it
// suits, how it works, what people push back on.
//
// Manual docs are never touched: app_knowledge_autosave refuses a key owned by
// an origin='manual' row, so an owner's "we never discount in December" survives
// every rebuild.
import { preflight, json } from "../_shared/cors.ts";
import { requireCron } from "../_shared/auth.ts";
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { callMessages } from "../_shared/anthropic.ts";
import { modelFor } from "../_shared/models.ts";
import { meter } from "../_shared/meter.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

/** The docs we generate. Each is a lens a tool cannot provide. */
const DOCS = [
  {
    key: "auto:positioning",
    title: "What this business is and who it is for",
    brief:
      "Describe what the business actually does, the customer it suits, and what makes it different in plain language. " +
      "Lead with the outcome a customer gets, not the mechanism.",
  },
  {
    key: "auto:how-it-works",
    title: "How buying and working with us goes",
    brief:
      "Explain the practical journey end to end: how someone starts, what happens after, what they need to provide, " +
      "and what they can expect from us. Concrete steps, no marketing adjectives.",
  },
  {
    key: "auto:objections",
    title: "Common questions and honest answers",
    brief:
      "Write the six questions a sceptical prospect actually asks — including the awkward ones about cost, lock-in, " +
      "effort and what happens if it does not work — each with an honest, specific answer. Never invent a guarantee.",
  },
];

const RULES = `
HARD RULES for everything you write:
- Never state a count, a price, a discount, an availability or a date. Not "five
  blueprints", not "from $499", not "usually two weeks". Those change; a tool
  answers them live. Write "the current catalogue" or "the listed price" instead.
- Never invent a fact that is not in the material: no customer names, no case
  studies, no statistics, no awards, no guarantees, no team members.
- Never mention margins, suppliers, internal tooling, providers, models or
  roadmap, even if the material contains them.
- Write prose an agent can quote from mid-conversation. No headings-only
  outlines, no bullet-point-only answers, no preamble about what you are doing.
- If the material is too thin to say something true, say less. A short honest
  document beats a padded one.
`.trim();

/** Stable hash of the inputs, so an unchanged business costs nothing to "rebuild". */
async function hashOf(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value ?? null));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  // Same shape as the other background workers: a shared cron secret, so this
  // is reachable by the scheduler and nothing else. The check used to be
  // `if (secret && header !== secret)`, which admitted EVERYONE — three model
  // calls per business, for every business — the moment the secret was unset.
  // requireCron fails closed and compares in constant time.
  const gate = requireCron(req);
  if (gate.error) return gate.error;

  const admin = adminClient();
  // A heartbeat, so cron_heartbeats proves THIS worker ran rather than only
  // proving the loop that pings it is alive. The daily knowledge.sh loops this
  // function while `pending` > 0, so one calendar day may leave several beats;
  // the last one carries the final "0 pending".
  const beat = async (ok: boolean, detail: string) => {
    try { await admin.rpc("app_cron_beat", { p_worker: "knowledge-build", p_ok: ok, p_detail: detail }); } catch { /* the run still happened */ }
  };

  try {
    const body = (await req.json().catch(() => ({}))) as Json;
    const only: string | null = body?.organizationId ?? null;
    const force = body?.force === true;
    // Supabase kills a function at 150s idle. Building is 3 model calls per
    // business, so an unbounded sweep over every org times out and does nothing
    // useful. Each invocation builds at most a couple of businesses and reports
    // what is left, so the scheduler can loop until it is done.
    const maxBuilds = Math.max(1, Math.min(Number(body?.maxOrgs ?? 2), 10));
    let budget = maxBuilds;

    // Orgs worth building for: anything with an agent configured.
    let orgIds: string[] = [];
    if (only) {
      orgIds = [only];
    } else {
      const { data } = await admin.from("agent_config").select("organization_id").limit(500);
      orgIds = ((data ?? []) as { organization_id: string }[]).map((r) => r.organization_id);
    }

    const results: Json[] = [];

    let pending = 0;
    for (const orgId of orgIds) {
      if (budget <= 0) { pending++; continue; }
      const { data: src } = await admin.rpc("app_knowledge_sources", { p_org: orgId });
      const sources = (src ?? {}) as Json;
      const org = sources.org ?? {};
      if (!org?.name) continue;

      // Nothing to describe: an org with no pages, no catalogue and no profile
      // would only produce invented copy.
      const material = {
        profile: org.profile ?? {},
        pages: sources.pages ?? [],
        products: sources.products ?? [],
        blueprints: sources.blueprints ?? [],
      };
      const thin =
        (material.pages as Json[]).length === 0 &&
        (material.products as Json[]).length === 0 &&
        (material.blueprints as Json[]).length === 0;
      if (thin) {
        results.push({ org: orgId, skipped: "no source material" });
        continue;
      }

      const hash = await hashOf(material);
      const existing = new Map(
        ((sources.existing ?? []) as { key: string; hash: string }[]).map((r) => [r.key, r.hash]),
      );

      let built = 0;
      for (const doc of DOCS) {
        if (!force && existing.get(doc.key) === hash) continue; // inputs unchanged

        const system =
          `You write internal knowledge documents that an AI agent will quote when talking to customers of ` +
          `"${org.name}"${org.vertical ? ` (${org.vertical})` : ""}.\n\n${RULES}\n\n` +
          `Write ONLY the document body. No title, no commentary.`;

        const userMessage =
          `${doc.brief}\n\nEverything you know about the business:\n` +
          JSON.stringify(material).slice(0, 12000);

        const t0 = Date.now();
        // callMessages, not runAgent: this is pure generation. runAgent sets a
        // tool_choice, which the provider rejects with an empty tool list — and
        // giving it tools would be wrong anyway, since the facts must come from
        // the prompt rather than a live lookup that reintroduces the counts.
        const r = await callMessages({
          model: modelFor("balanced"),
          system,
          messages: [{ role: "user", content: userMessage }],
          maxTokens: 900,
        });
        const text = (r.text ?? "").trim();
        if (!text) continue;

        await admin.rpc("app_knowledge_autosave", {
          p_org: orgId,
          p_key: doc.key,
          p_title: doc.title,
          p_content: text,
          p_hash: hash,
        });

        await meter(admin, {
          organizationId: orgId,
          model: r.model,
          feature: "knowledge-build",
          tier: "balanced",
          inTok: r.inTok,
          outTok: r.outTok,
          cacheWriteTok: r.cacheWriteTok,
          cacheReadTok: r.cacheReadTok,
          latencyMs: Date.now() - t0,
        });
        built++;
      }

      if (built > 0) budget--;
      results.push({ org: orgId, built, hash });
    }

    // The autosave trigger enqueues each doc for embedding, so embed-worker
    // picks them up on its next pass — no extra wiring needed here.
    // `pending` lets the caller decide whether to run again rather than guess.
    const builtDocs = results.reduce((n: number, r: Json) => n + Number(r.built ?? 0), 0);
    await beat(true, `${results.length} business(es) walked, ${builtDocs} doc(s) written, ${pending} pending` + (only ? ` (one org: ${only})` : ""));
    return json({ ok: true, orgs: results.length, pending, results });
  } catch (err) {
    const msg = String((err as Error)?.message || err);
    await beat(false, msg);
    return json({ error: msg }, 500);
  }
});
