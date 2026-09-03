// Phoxta — the business's own voice, as something a prompt can carry.
//
// A negative list ("never write 'unlock', never write 'elevate'") tells a model
// what to avoid and nothing about who this business is, which is why generic AI
// copy reads as generic even when it avoids every banned word. What is missing
// is the positive half: how these people actually talk, which words their
// customers actually use about them, and what they are ALLOWED to claim.
//
// THE `proof` FIELD IS THE INTERESTING ONE. It is a code-checkable allowlist of
// claims, populated only from real reviews. "Our five-star rated service" is
// either in that list because customers really said it, or it is a sentence
// nobody may write. That turns a prompt instruction into a check.
import type { SupabaseClient } from "./supabaseAdmin.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

export type VoiceSpec = {
  summary?: string;
  personality?: { trait: string; meansInCopy: string; notThis: string }[];
  register?: { formality?: string; person?: string; humour?: string; emoji?: string };
  sentence?: { length?: string; openings?: string; punctuation?: string };
  lexicon?: {
    weSay?: string[];
    weNeverSay?: string[];
    customerWords?: { phrase: string; seenIn: string }[];
  };
  /** What this business may claim, drawn from real reviews and real data. */
  proof?: string[];
  examples?: { context: string; good: string; bad: string; why: string }[];
  evidence?: { claim: string; basis: string; source: string }[];
};

export type VoiceRow = {
  spec: VoiceSpec;
  status: "draft" | "approved" | "archived";
  source: Record<string, number>;
  owner_input: string;
  generated_at: string | null;
};

/** The stored voice, or null when this business has never had one written. */
export async function voiceSpec(admin: SupabaseClient, orgId: string): Promise<VoiceRow | null> {
  const { data, error } = await admin
    .from("org_voice")
    .select("spec, status, source, owner_input, generated_at")
    .eq("organization_id", orgId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as Json;
  if (!row.spec || typeof row.spec !== "object" || !Object.keys(row.spec).length) return null;
  return row as VoiceRow;
}

const list = (v: unknown) => (Array.isArray(v) ? v : []);

/**
 * The voice as a prompt block.
 *
 * An UNAPPROVED voice still gets used — a business that never opened the dialog
 * should still sound like itself — but it is labelled as inferred, both here
 * and in the UI, because a description of someone's voice that they never
 * confirmed is a guess and should not be presented as a fact.
 */
export async function voiceBlock(admin: SupabaseClient, orgId: string): Promise<string> {
  const row = await voiceSpec(admin, orgId);
  if (!row) return "";
  const s = row.spec;
  const parts: string[] = [
    row.status === "approved"
      ? "HOW THIS BUSINESS SOUNDS — confirmed by the owner. Match it."
      : "HOW THIS BUSINESS SOUNDS — inferred from what they have written, not yet confirmed by them. Match it, but do not put words in their mouth.",
  ];
  if (s.summary) parts.push(s.summary);

  const personality = list(s.personality) as VoiceSpec["personality"];
  if (personality?.length) {
    parts.push(
      "Traits:\n" + personality.map((p) => `- ${p.trait}: ${p.meansInCopy}${p.notThis ? ` (not: ${p.notThis})` : ""}`).join("\n"),
    );
  }
  if (s.register) {
    const r = s.register;
    parts.push(
      `Register: ${[r.formality, r.person ? `speaks as "${r.person}"` : "", r.humour, r.emoji ? `emoji ${r.emoji}` : ""].filter(Boolean).join(", ")}.`,
    );
  }
  if (s.sentence) {
    const t = s.sentence;
    parts.push(`Sentences: ${[t.length, t.openings, t.punctuation].filter(Boolean).join(" ")}`.trim());
  }
  const lex = s.lexicon ?? {};
  if (lex.weSay?.length) parts.push(`Words they use: ${lex.weSay.join(", ")}.`);
  if (lex.weNeverSay?.length) parts.push(`Words they never use: ${lex.weNeverSay.join(", ")}.`);
  if (lex.customerWords?.length) {
    // The sleeper feature: real phrases from the inbox and from reviews. Copy
    // that uses the customer's own words is the difference between marketing
    // and recognition, and no tool without access to this inbox can do it.
    parts.push(
      "Phrases their customers actually use (prefer these to your own):\n" +
      lex.customerWords.map((c) => `- "${c.phrase}"${c.seenIn ? ` (from ${c.seenIn})` : ""}`).join("\n"),
    );
  }
  if (s.proof?.length) {
    parts.push(
      "The ONLY claims this business may make about itself — anything else is not theirs to say:\n" +
      s.proof.map((p) => `- ${p}`).join("\n"),
    );
  }
  const examples = list(s.examples) as VoiceSpec["examples"];
  if (examples?.length) {
    parts.push(
      "Examples:\n" + examples.map((e) => `- ${e.context}\n  GOOD: ${e.good}\n  BAD: ${e.bad}`).join("\n"),
    );
  }
  return parts.filter(Boolean).join("\n\n");
}

/**
 * May this business say this?
 *
 * Deliberately conservative and deliberately crude: it looks for the claim's
 * substance in the allowlist rather than trying to judge meaning. A false
 * negative costs a sentence; a false positive is a business publicly claiming
 * an award it does not have.
 */
export function claimAllowed(spec: VoiceSpec | null, claim: string): boolean {
  const c = String(claim ?? "").trim().toLowerCase();
  if (!c) return true;
  const proof = (spec?.proof ?? []).map((p) => p.toLowerCase());
  if (!proof.length) return false;
  return proof.some((p) => p.includes(c) || c.includes(p));
}
