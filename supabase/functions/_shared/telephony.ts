// Phoxta — outbound telephony abuse guards.
//
// Every tenant dials through ONE shared Twilio account (TWILIO_FROM), so an
// unbounded click-to-call endpoint is a toll-fraud vector: a signed-up tenant
// could dial premium-rate international numbers on Phoxta's bill. These helpers
// add the three controls the raw endpoints were missing — destination format
// validation, a country allowlist, and a per-org call rate limit.
import type { SupabaseClient } from "./supabaseAdmin.ts";

/** E.164: leading +, country code 1-9, up to 15 digits total. */
const E164 = /^\+[1-9]\d{7,14}$/;

/** Country calling codes we will dial. Comma-separated E.164 prefixes in
 *  CALLING_ALLOWED_PREFIXES (e.g. "+1,+44,+234"). Unset = allow all, minus the
 *  premium/high-risk ranges below. */
function allowedPrefixes(): string[] {
  return (Deno.env.get("CALLING_ALLOWED_PREFIXES") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Ranges most commonly abused for revenue-share fraud (premium-rate,
 *  satellite, and audiotext). Blocked unless explicitly allowlisted. */
const HIGH_RISK_PREFIXES = [
  "+882", "+883", // international networks
  "+870", "+871", "+872", "+873", "+874", // Inmarsat / satellite
  "+881", // global mobile satellite
  "+979", // international premium rate
  "+808", // international shared cost
];

export type CallCheck = { ok: true; to: string } | { ok: false; error: string };

/** The E.164 form of `raw`, or null when it is not a phone number at all.
 *  Format only — country policy is applied separately by checkDestination. */
export function normalizeE164(raw: unknown): string | null {
  // Strip spaces, dashes, parens and a leading 00 international prefix.
  let to = String(raw ?? "").trim().replace(/[\s()\-.]/g, "");
  if (to.startsWith("00")) to = "+" + to.slice(2);
  return E164.test(to) ? to : null;
}

/** Storage guard for customer_phone. Voice bridges pass a *label* in the caller
 *  field for sessions that have no PSTN number ("web visitor" for the web
 *  widget, "outbound" for AI-placed calls — see the <Parameter name="from">
 *  TwiML in _shared/dispatch.ts). Storing those verbatim makes a conversation
 *  look callable to the console when there is nothing to dial.
 *
 *  Drops labels, keeps numbers: a real E.164 value is canonicalised, and a
 *  human-entered number that merely lacks a country code ("0803 123 4567" from
 *  the callback form) is preserved as typed — losing a lead's callback number
 *  would be worse than storing one the dialler cannot use. Only a value with no
 *  digits at all is treated as a label and dropped. */
export function phoneForStorage(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  const e164 = normalizeE164(s);
  if (e164) return e164;
  return /\d/.test(s) ? s : "";
}

/** Validate and normalise a destination number before it reaches Twilio. */
export function checkDestination(raw: string): CallCheck {
  const normalized = normalizeE164(raw);
  if (!normalized) {
    return { ok: false, error: "Enter the number in international format, e.g. +14155550123." };
  }
  const to = normalized;

  const allow = allowedPrefixes();
  if (allow.length > 0) {
    if (!allow.some((p) => to.startsWith(p))) {
      return { ok: false, error: "Calls to that country aren't enabled for this account." };
    }
    return { ok: true, to };
  }

  if (HIGH_RISK_PREFIXES.some((p) => to.startsWith(p))) {
    return { ok: false, error: "Calls to that number range aren't permitted." };
  }
  return { ok: true, to };
}

/**
 * Per-org outbound call cap (fixed window). Uses the same call_logs the console
 * already writes, so there is no extra table to keep in sync.
 * Override with CALLS_PER_HOUR (default 60).
 */
export async function callRateLimited(admin: SupabaseClient, orgId: string): Promise<boolean> {
  const limit = Number(Deno.env.get("CALLS_PER_HOUR") ?? "60");
  if (!Number.isFinite(limit) || limit <= 0) return false;
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await admin
    .from("call_logs")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("direction", "outbound")
    .gte("created_at", since);
  return (count ?? 0) >= limit;
}
