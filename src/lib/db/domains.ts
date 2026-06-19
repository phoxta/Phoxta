import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";

// Domains for a business (tenant). Each business gets a Phoxta subdomain on
// provision; owners can also LINK their own domain or BUY one — all from the
// dashboard. The `domain-manager` edge function does the real Vercel work (attach
// to the storefront project, read DNS records, verify, issue TLS, register) and
// mirrors state into the `domains` table; app_resolve_domain then routes the host.

export type DnsRecord = { type: string; name: string; value: string };

export type Domain = {
  id: string;
  organization_id: string;
  hostname: string;
  kind: "subdomain" | "custom";
  is_primary: boolean;
  status: "pending" | "verifying" | "live" | "error";
  verification_token: string;
  dns_target: string | null;
  dns_records: DnsRecord[];
  source: string;
  tls_status: "none" | "pending" | "issued";
  verified_at: string | null;
  expires_at: string | null;
  created_at: string;
};

const SELECT =
  "id, organization_id, hostname, kind, is_primary, status, verification_token, dns_target, dns_records, source, tls_status, verified_at, expires_at, created_at";

function normalizeHost(input: string): string {
  return input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\.$/, "");
}

// Invoke the edge function and surface the function's own error message (it
// returns 4xx with { error } for validation problems).
async function invokeDomain<T>(body: Record<string, unknown>): Promise<{ data: T | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke("domain-manager", { body });
  if (error) {
    let msg = error.message;
    try {
      const ctx = await (error as { context?: Response }).context?.json?.();
      if (ctx?.error) msg = ctx.error;
    } catch {
      /* keep generic */
    }
    return { data: null, error: friendlyError(msg) };
  }
  return { data: data as T, error: null };
}

export async function listDomains(orgId: string): Promise<{ data: Domain[]; error: string | null }> {
  const { data, error } = await supabase
    .from("domains")
    .select(SELECT)
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true });
  return { data: (data as Domain[] | null) ?? [], error: friendlyError(error?.message) };
}

/** Link a custom domain: attaches it to the storefront on Vercel and returns the
 *  DNS records the owner must add at their registrar. */
export async function addCustomDomain(
  orgId: string,
  hostname: string,
): Promise<{ domainId: string | null; records: DnsRecord[]; error: string | null }> {
  const host = normalizeHost(hostname);
  if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(host)) {
    return { domainId: null, records: [], error: "Enter a valid domain, e.g. shop.yourbrand.com" };
  }
  const { data, error } = await invokeDomain<{ domainId: string; records: DnsRecord[] }>({ action: "add", orgId, hostname: host });
  return { domainId: data?.domainId ?? null, records: data?.records ?? [], error };
}

/** Re-check verification + TLS for a linked domain. `verified` = ownership confirmed,
 *  `misconfigured` = DNS records not yet detected/correct (so the owner knows why
 *  it isn't live). */
export async function checkDomainStatus(
  domainId: string,
): Promise<{ status: string | null; verified: boolean; misconfigured: boolean; error: string | null }> {
  const { data, error } = await invokeDomain<{ status: string; verified: boolean; misconfigured: boolean }>({ action: "status", domainId });
  return { status: data?.status ?? null, verified: !!data?.verified, misconfigured: data?.misconfigured !== false, error };
}

/** Check whether a domain is available to buy and at what (retail) price. */
export async function searchDomain(
  orgId: string,
  query: string,
): Promise<{ host: string; available: boolean; price: number | null; error: string | null }> {
  const { data, error } = await invokeDomain<{ host: string; available: boolean; price: number | null }>({ action: "search", orgId, query });
  return { host: data?.host ?? normalizeHost(query), available: !!data?.available, price: data?.price ?? null, error };
}

/** Register a new domain through Phoxta and attach it to the storefront. */
export async function buyDomain(orgId: string, hostname: string): Promise<{ status: string | null; charged: number | null; error: string | null }> {
  const { data, error } = await invokeDomain<{ status: string; charged: number }>({ action: "buy", orgId, hostname });
  return { status: data?.status ?? null, charged: data?.charged ?? null, error };
}

/** Start a Stripe Checkout to buy a domain (the buyer pays; the webhook registers
 *  it after payment). Returns a URL to redirect the browser to. */
export async function startDomainPurchase(
  orgId: string,
  hostname: string,
  returnUrl: string,
): Promise<{ url: string | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke("domain-checkout", { body: { orgId, hostname, returnUrl } });
  if (error) {
    let msg = error.message;
    try {
      const ctx = await (error as { context?: Response }).context?.json?.();
      if (ctx?.error) msg = ctx.error;
    } catch {
      /* keep generic */
    }
    return { url: null, error: friendlyError(msg) };
  }
  return { url: (data as { url?: string } | null)?.url ?? null, error: null };
}

export async function setPrimaryDomain(orgId: string, domainId: string): Promise<{ error: string | null }> {
  const clear = await supabase.from("domains").update({ is_primary: false }).eq("organization_id", orgId);
  if (clear.error) return { error: friendlyError(clear.error.message) };
  const { error } = await supabase.from("domains").update({ is_primary: true }).eq("id", domainId);
  return { error: friendlyError(error?.message) };
}

/** Detach from the storefront project (Vercel) and delete the row. */
export async function removeDomain(domainId: string): Promise<{ error: string | null }> {
  const { error } = await invokeDomain({ action: "remove", domainId });
  return { error };
}
