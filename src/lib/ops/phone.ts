// Phoxta — one definition of "is this a number we can actually dial".
//
// Mirrors normalizeE164()/checkDestination() in
// supabase/functions/_shared/telephony.ts. The console must not offer a call
// that the edge function will reject: voice sessions with no PSTN leg store a
// *label* in customer_phone ("web visitor" for the web widget, "outbound" for
// AI-placed calls), which is truthy but undialable — gating the call UI on
// truthiness alone is what surfaced a generic error on the Place call button.

/** E.164: leading +, country code 1-9, up to 15 digits total. */
const E164 = /^\+[1-9]\d{7,14}$/;

/** The dialable E.164 form of `raw`, or null when it is not a phone number.
 *  Use this — never a truthiness check — to decide whether to offer a call. */
export function callablePhone(raw: string | null | undefined): string | null {
  // Strip spaces, dashes, parens and a leading 00 international prefix, the
  // same way the calling backend does.
  let to = (raw ?? "").trim().replace(/[\s()\-.]/g, "");
  if (to.startsWith("00")) to = "+" + to.slice(2);
  return E164.test(to) ? to : null;
}

/** True when `raw` is a number the calling backend will accept. */
export function isCallable(raw: string | null | undefined): boolean {
  return callablePhone(raw) !== null;
}

/** What to show where a phone number is expected. Keeps a human-entered number
 *  visible even if it is not dialable, but never presents a label as a number. */
export function displayPhone(raw: string | null | undefined): string | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  return /\d/.test(s) ? s : null;
}
