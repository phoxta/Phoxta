// Who is calling an anonymous endpoint, as far as the infrastructure will
// vouch for it. Shared because every public surface that has to recognise a
// repeat visitor — the homepage validator's daily cap, the demo gate's
// five-day pass — needs the same answer, and a forgeable one costs money or
// gives the product away.

/**
 * The visitor's address.
 *
 * `x-forwarded-for` is a list a caller can pre-seed: proxies APPEND, so the
 * LEFTMOST entry is whatever the client sent and the rightmost entries are the
 * ones our own infrastructure wrote. Keying anything on the leftmost value
 * means rotating a single header defeats it outright.
 */
export function callerAddress(req: Request): string {
  // Cloudflare replaces cf-connecting-ip with the true peer on every request,
  // so when it is present it is the one value a caller cannot author.
  const cf = req.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  // Otherwise take the RIGHTMOST hop and nothing else. Everything to its left
  // was written by whoever called us and is therefore forgeable, while the
  // rightmost entry is appended by the proxy actually in front of us. Walking
  // leftwards past a private hop looks more thorough but is worse: on a chain
  // that ends in infrastructure addresses it lands on a shared upstream and
  // quietly buckets every visitor together.
  const chain = (req.headers.get("x-forwarded-for") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return chain[chain.length - 1] ?? req.headers.get("x-real-ip")?.trim() ?? "unknown";
}

/**
 * The visitor's IP, hashed.
 *
 * Recognising "this caller again" is a hash's whole job. It does not need to
 * know who they are, and storing raw addresses would make the tables that key
 * on this a privacy liability for no extra function.
 */
export async function hashIp(req: Request): Promise<string> {
  const raw = callerAddress(req);
  const salt = Deno.env.get("CRON_SECRET") ?? "phoxta";
  const bytes = new TextEncoder().encode(`${salt}:${raw}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}
