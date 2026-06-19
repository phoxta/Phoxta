// Phoxta — verify-domain: proves a business owns a custom domain it linked.
// The owner adds a TXT record at _phoxta-verify.<hostname> = <verification_token>;
// this resolves it and, on match, flips the domain to `live` (TLS issued). The
// CNAME that routes traffic to the storefront deployment is separate (instructed
// in the console). Subdomains are already live and need no check.
import { preflight, json } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { authorize } from "../_shared/auth.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    const body = await req.json().catch(() => ({}));
    const domainId = body?.domainId;
    if (!domainId) return json({ error: "Missing domainId." }, 400);

    const admin = adminClient();
    const { data: dom } = await admin
      .from("domains")
      .select("id, organization_id, hostname, verification_token, kind")
      .eq("id", domainId)
      .maybeSingle();
    if (!dom) return json({ error: "Domain not found." }, 404);
    const d = dom as Json;

    if (d.kind === "subdomain") return json({ status: "live", verified: true });

    // Only members of the owning business may verify it.
    const auth = await authorize(req, d.organization_id);
    if (auth.error) return auth.error;

    const verifyName = `_phoxta-verify.${d.hostname}`;
    let verified = false;
    try {
      const txt = await Deno.resolveDns(verifyName, "TXT");
      verified = txt.some((chunks: string[]) => chunks.join("").includes(d.verification_token));
    } catch (_) {
      verified = false; // NXDOMAIN / not yet propagated
    }

    if (!verified) {
      return json({
        status: "verifying",
        verified: false,
        record: { type: "TXT", name: verifyName, value: d.verification_token },
        hint: "Add the TXT record above, then verify again (DNS can take a few minutes).",
      });
    }

    await admin
      .from("domains")
      .update({ status: "live", tls_status: "issued", verified_at: new Date().toISOString() })
      .eq("id", domainId);
    return json({ status: "live", verified: true });
  } catch (err) {
    console.error("verify-domain error", err);
    return json({ error: "Verification failed. Please try again." }, 500);
  }
});
