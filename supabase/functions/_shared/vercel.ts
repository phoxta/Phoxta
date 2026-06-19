// Shared Vercel API helpers for the domain functions.
const TOKEN = Deno.env.get("VERCEL_TOKEN") ?? "";
const TEAM = Deno.env.get("VERCEL_TEAM_ID") ?? "team_C72u1112eVO7Gqddw02pDjse";

export const vercelConfigured = () => !!TOKEN;
export const CNAME_TARGET = "cname.vercel-dns.com";
export const APEX_IP = "76.76.21.21"; // Vercel's anycast apex A record

export type DnsRecord = { type: string; name: string; value: string };

// deno-lint-ignore no-explicit-any
export async function vercelFetch(path: string, init: RequestInit = {}): Promise<{ ok: boolean; status: number; body: any }> {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`https://api.vercel.com${path}${sep}teamId=${TEAM}`, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

export const normalizeHost = (input: string): string =>
  String(input || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\.$/, "");
export const validHost = (h: string): boolean => /^([a-z0-9-]+\.)+[a-z]{2,}$/.test(h);

/** An apex (root) domain has exactly two labels, e.g. brand.com — not www.brand.com. */
export const isApex = (h: string): boolean => h.split(".").length <= 2;

/** The apex↔www counterpart we also attach so BOTH resolve (industry standard).
 *  apex → www.apex; www.apex → apex; any other subdomain → null (no pair). */
export function wwwSibling(h: string): string | null {
  if (isApex(h)) return `www.${h}`;
  if (h.startsWith("www.")) return h.slice(4);
  return null;
}

/** The DNS record a host needs at the registrar: A @ for an apex, CNAME for a subdomain. */
export function recordsFor(host: string): DnsRecord[] {
  const labels = host.split(".");
  if (labels.length <= 2) return [{ type: "A", name: "@", value: APEX_IP }];
  return [{ type: "CNAME", name: labels.slice(0, labels.length - 2).join("."), value: CNAME_TARGET }];
}

/** Every DNS record needed for a host AND its www↔apex sibling, deduped. */
export function pairRecords(host: string): DnsRecord[] {
  const sib = wwwSibling(host);
  const all = [...recordsFor(host), ...(sib ? recordsFor(sib) : [])];
  const seen = new Set<string>();
  return all.filter((r) => {
    const k = `${r.type}|${r.name}|${r.value}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Attach a host to a project, optionally as a redirect to its canonical sibling.
 *  Treats 409 (already attached) as success. Returns any TXT ownership-verification
 *  records Vercel asks for (when the domain is claimed by another Vercel account). */
export async function attachDomain(
  projectId: string,
  name: string,
  redirectTo?: string,
): Promise<{ ok: boolean; status: number; verification: DnsRecord[]; error: string | null }> {
  const payload: Record<string, unknown> = { name };
  if (redirectTo) { payload.redirect = redirectTo; payload.redirectStatusCode = 308; }
  const res = await vercelFetch(`/v10/projects/${projectId}/domains`, { method: "POST", body: JSON.stringify(payload) });
  const ok = res.ok || res.status === 409;
  // deno-lint-ignore no-explicit-any
  const verification: DnsRecord[] = Array.isArray(res.body?.verification)
    ? res.body.verification.map((v: any) => ({ type: v.type, name: v.domain, value: v.value }))
    : [];
  return { ok, status: res.status, verification, error: ok ? null : (res.body?.error?.message || "Couldn't add that domain.") };
}

/** Attach a custom domain AND its www↔apex sibling (the sibling 308-redirects to the
 *  canonical host the owner typed). Returns the full DNS record set to display. */
export async function attachDomainPair(
  projectId: string,
  host: string,
): Promise<{ ok: boolean; records: DnsRecord[]; error: string | null }> {
  const canonical = await attachDomain(projectId, host);
  if (!canonical.ok) return { ok: false, records: [], error: canonical.error };
  const sib = wwwSibling(host);
  const sibVerification: DnsRecord[] = [];
  if (sib) {
    const r = await attachDomain(projectId, sib, host); // sibling → redirect to canonical
    sibVerification.push(...r.verification);
  }
  const records = [...pairRecords(host), ...canonical.verification, ...sibVerification];
  return { ok: true, records, error: null };
}

/** Detach a host and its www↔apex sibling from a project (best effort). */
export async function detachDomainPair(projectId: string, host: string): Promise<void> {
  await vercelFetch(`/v9/projects/${projectId}/domains/${host}`, { method: "DELETE" });
  const sib = wwwSibling(host);
  if (sib) await vercelFetch(`/v9/projects/${projectId}/domains/${sib}`, { method: "DELETE" });
}
