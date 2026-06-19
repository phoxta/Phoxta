// Phoxta — durable, per-customer long-term memory (the "memory bank" pattern).
// Beyond the rolling per-conversation summaries, this stores stable facts and
// preferences about a CONTACT that persist across conversations AND channels, so
// the one agent truly remembers a customer. Read into the system prompt on every
// turn; written in the background summarize path (a cheap model call, deduped).
import { callJson } from "./anthropic.ts";
import { modelFor } from "./models.ts";
import { meter } from "./meter.ts";
import type { SupabaseClient } from "./supabaseAdmin.ts";

const MAX_RECALL = 12; // memories injected into the prompt
const MAX_EXTRACT = 5; // new memories captured per turn

/** Format a contact's durable memories for the system prompt (empty when none). */
export async function loadCustomerMemory(admin: SupabaseClient, orgId: string, contactId: string | null): Promise<string> {
  if (!contactId) return "";
  try {
    const { data } = await admin
      .from("customer_memories")
      .select("content")
      .eq("organization_id", orgId)
      .eq("contact_id", contactId)
      .order("weight", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(MAX_RECALL);
    const rows = (data as { content: string }[] | null) ?? [];
    return rows.map((r) => `- ${r.content}`).join("\n");
  } catch {
    return "";
  }
}

/** Extract durable facts/preferences from a transcript and upsert them for the
 *  contact. Cheap model, runs in the background summarize path. Deduped on text. */
export async function extractCustomerMemory(
  admin: SupabaseClient,
  orgId: string,
  orgName: string,
  contactId: string,
  transcript: string,
): Promise<void> {
  if (!contactId || !transcript.trim()) return;

  let memories: { kind?: string; content?: string }[] = [];
  let inTok = 0;
  let outTok = 0;
  let model = "";
  try {
    const r = await callJson<{ memories: { kind: string; content: string }[] }>({
      model: modelFor("cheap"),
      system:
        `Extract DURABLE facts about this customer of "${orgName}" that would help personalize future conversations across any channel — ` +
        `stable preferences, constraints, identity, recurring needs, important context. ` +
        `Do NOT capture one-off chit-chat, transient state, or anything sensitive (passwords, full card numbers, government IDs). ` +
        `Each entry is a short third-person statement. Return JSON {"memories":[{"kind":"preference|fact|profile","content":"..."}]} ` +
        `with at most ${MAX_EXTRACT} entries, or {"memories":[]} if nothing durable.`,
      user: transcript.slice(0, 6000),
      maxTokens: 400,
    });
    memories = r.data?.memories ?? [];
    inTok = r.inTok;
    outTok = r.outTok;
    model = r.model;
  } catch {
    return;
  }

  const items = memories
    .map((m) => ({
      kind: ["preference", "fact", "profile"].includes(String(m.kind)) ? String(m.kind) : "fact",
      content: String(m.content ?? "").trim(),
    }))
    .filter((m) => m.content.length > 2 && m.content.length <= 280)
    .slice(0, MAX_EXTRACT);
  if (!items.length) return;

  // Dedup against what we already know (case-insensitive).
  let seen = new Set<string>();
  try {
    const { data: existing } = await admin
      .from("customer_memories")
      .select("content")
      .eq("organization_id", orgId)
      .eq("contact_id", contactId)
      .limit(200);
    seen = new Set(((existing as { content: string }[] | null) ?? []).map((e) => e.content.toLowerCase()));
  } catch {
    /* treat as none seen */
  }
  const fresh = items.filter((m) => !seen.has(m.content.toLowerCase()));
  if (fresh.length) {
    try {
      await admin.from("customer_memories").insert(
        fresh.map((m) => ({ organization_id: orgId, contact_id: contactId, kind: m.kind, content: m.content, source: "agent" })),
      );
    } catch {
      /* memory is best-effort — never break the turn */
    }
  }

  if (model) {
    await meter(admin, { organizationId: orgId, model, feature: "agent_memory", tier: "cheap", inTok, outTok, latencyMs: 0 });
  }
}
