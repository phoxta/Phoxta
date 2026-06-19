// Phoxta — domain-manager: attach / verify / buy / remove custom domains for a
// business, entirely from the dashboard. Talks to the Vercel API server-side
// (VERCEL_TOKEN secret) and mirrors state into the `domains` table so
// app_resolve_domain routes the hostname to the right tenant. One function, five
// actions: search | add | status | buy | remove.
//
// Apex domains are paired with www (industry standard): connecting brand.com also
// attaches www.brand.com as a 308 redirect to brand.com (and vice-versa), so both
// resolve. See ../_shared/vercel.ts for the Vercel plumbing.
import { preflight, json } from "../_shared/cors.ts";
import { authorize } from "../_shared/auth.ts";
import { adminClient } from "../_shared/supabaseAdmin.ts";
import {
  vercelConfigured, vercelFetch, normalizeHost, validHost,
  attachDomainPair, detachDomainPair, wwwSibling, CNAME_TARGET,
} from "../_shared/vercel.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

const MARKUP = 1.25; // what we charge over Vercel's wholesale domain price

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    const body = await req.json().catch(() => ({})) as Json;
    const action = body?.action;
    if (!vercelConfigured()) return json({ error: "The domain service isn't configured yet (missing VERCEL_TOKEN)." }, 503);

    const admin = adminClient();
    const projectFor = async (orgId: string) => {
      const { data } = await admin.rpc("app_org_storefront", { p_org: orgId });
      return (data as Json[])?.[0] ?? null;
    };

    // --- search availability + price ----------------------------------------
    if (action === "search") {
      const auth = await authorize(req, body.orgId);
      if (auth.error) return auth.error;
      const host = normalizeHost(body.query);
      if (!validHost(host)) return json({ error: "Enter a domain like yourbrand.com" }, 400);
      const st = await vercelFetch(`/v4/domains/status?name=${encodeURIComponent(host)}`);
      const available = !!st.body?.available;
      let price: number | null = null;
      if (available) {
        const pr = await vercelFetch(`/v4/domains/price?name=${encodeURIComponent(host)}`);
        if (pr.ok && typeof pr.body?.price === "number") price = Math.ceil(pr.body.price * MARKUP);
      }
      return json({ host, available, price });
    }

    // --- add (bring your own domain) ----------------------------------------
    if (action === "add") {
      const auth = await authorize(req, body.orgId);
      if (auth.error) return auth.error;
      const host = normalizeHost(body.hostname);
      if (!validHost(host)) return json({ error: "Enter a valid domain, e.g. shop.yourbrand.com" }, 400);
      const proj = await projectFor(body.orgId);
      if (!proj?.vercel_project_id) return json({ error: "Custom domains aren't available for this business yet." }, 400);

      const att = await attachDomainPair(proj.vercel_project_id, host);
      if (!att.ok) return json({ error: att.error }, 400);

      const { data: existing } = await admin.from("domains").select("id").eq("hostname", host).maybeSingle();
      const vals = { organization_id: body.orgId, hostname: host, kind: "custom", status: "verifying", dns_records: att.records, dns_target: att.records[0]?.value ?? CNAME_TARGET };
      let domainId = existing?.id;
      if (domainId) await admin.from("domains").update(vals).eq("id", domainId);
      else {
        const ins = await admin.from("domains").insert(vals).select("id").single();
        domainId = ins.data?.id;
      }
      return json({ status: "verifying", domainId, records: att.records });
    }

    // --- status (poll verification + cert) ----------------------------------
    if (action === "status") {
      const { data: dom } = await admin.from("domains").select("id, organization_id, hostname").eq("id", body.domainId).maybeSingle();
      if (!dom) return json({ error: "Domain not found." }, 404);
      const auth = await authorize(req, (dom as Json).organization_id);
      if (auth.error) return auth.error;
      const proj = await projectFor((dom as Json).organization_id);
      if (!proj?.vercel_project_id) return json({ error: "Not available." }, 400);
      const host = (dom as Json).hostname;
      const pid = proj.vercel_project_id;

      // Trigger verification for the host and its www↔apex sibling (so both certs issue).
      await vercelFetch(`/v9/projects/${pid}/domains/${host}/verify`, { method: "POST" });
      const sib = wwwSibling(host);
      if (sib) await vercelFetch(`/v9/projects/${pid}/domains/${sib}/verify`, { method: "POST" }).catch(() => {});

      const d = await vercelFetch(`/v9/projects/${pid}/domains/${host}`);
      const cfg = await vercelFetch(`/v6/domains/${host}/config`);
      const verified = !!d.body?.verified;
      const misconfigured = cfg.body?.misconfigured !== false; // false === correctly configured
      const live = verified && !misconfigured;
      if (live) {
        await admin.from("domains").update({ status: "live", tls_status: "issued", verified_at: new Date().toISOString() }).eq("id", body.domainId);
      } else {
        await admin.from("domains").update({ status: "verifying" }).eq("id", body.domainId);
      }
      return json({ status: live ? "live" : "verifying", verified, misconfigured });
    }

    // --- buy (register a new domain through Phoxta) -------------------------
    if (action === "buy") {
      const auth = await authorize(req, body.orgId);
      if (auth.error) return auth.error;
      const host = normalizeHost(body.hostname);
      if (!validHost(host)) return json({ error: "Enter a valid domain." }, 400);
      const proj = await projectFor(body.orgId);
      if (!proj?.vercel_project_id) return json({ error: "Not available for this business." }, 400);

      const pr = await vercelFetch(`/v4/domains/price?name=${encodeURIComponent(host)}`);
      const wholesale = typeof pr.body?.price === "number" ? pr.body.price : null;
      if (wholesale == null) return json({ error: "That domain can't be purchased right now." }, 400);

      const buy = await vercelFetch(`/v4/domains/buy`, { method: "POST", body: JSON.stringify({ name: host, expectedPrice: wholesale, renew: true }) });
      if (!buy.ok) return json({ error: buy.body?.error?.message || "Purchase failed." }, 400);

      await attachDomainPair(proj.vercel_project_id, host); // apex + www redirect
      const expires = buy.body?.domain?.expiresAt ? new Date(buy.body.domain.expiresAt).toISOString() : null;
      await admin.from("domains").upsert(
        { organization_id: body.orgId, hostname: host, kind: "custom", status: "live", tls_status: "issued", source: "purchased", dns_target: CNAME_TARGET, expires_at: expires, verified_at: new Date().toISOString() },
        { onConflict: "hostname" },
      );
      return json({ status: "live", host, charged: Math.ceil(wholesale * MARKUP) });
    }

    // --- remove -------------------------------------------------------------
    if (action === "remove") {
      const { data: dom } = await admin.from("domains").select("id, organization_id, hostname, kind").eq("id", body.domainId).maybeSingle();
      if (!dom) return json({ error: "Domain not found." }, 404);
      const auth = await authorize(req, (dom as Json).organization_id);
      if (auth.error) return auth.error;
      if ((dom as Json).kind !== "subdomain") {
        const proj = await projectFor((dom as Json).organization_id);
        if (proj?.vercel_project_id) await detachDomainPair(proj.vercel_project_id, (dom as Json).hostname);
      }
      await admin.from("domains").delete().eq("id", body.domainId);
      return json({ ok: true });
    }

    return json({ error: "Unknown action." }, 400);
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
