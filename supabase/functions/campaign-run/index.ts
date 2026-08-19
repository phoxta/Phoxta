// Phoxta — campaign-run: drains pending campaign_sends and actually delivers
// them (email via Resend with one-click List-Unsubscribe, SMS via Twilio with
// a STOP notice). Two callers:
//   - a member with { orgId }               → drains that org's queue
//   - the scheduler with x-cron-secret      → drains every org's queue
// Re-checks opt-outs at send time, records per-row status/error, then rolls the
// counts up onto the campaign (status → 'sent' when nothing is left pending).
import { preflight, json } from "../_shared/cors.ts";
import { authorize } from "../_shared/auth.ts";
import { adminClient, type SupabaseClient } from "../_shared/supabaseAdmin.ts";
import { sendEmail, twilioSend } from "../_shared/dispatch.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

const BATCH = 50;
const FN_BASE = "https://ktgleoqvdikngocygdkn.supabase.co/functions/v1";

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const body = (await req.json().catch(() => ({}))) as Json;

    // Auth: trusted scheduler (all orgs) or a signed-in member (their org only).
    const presented = req.headers.get("x-cron-secret");
    const cronSecrets = [Deno.env.get("CRON_SECRET"), Deno.env.get("BILLING_CRON_SECRET")].filter(Boolean);
    const isCron = !!presented && cronSecrets.includes(presented);
    let admin: SupabaseClient;
    let orgId: string | null = null;
    if (isCron) {
      admin = adminClient();
      orgId = body?.orgId ? String(body.orgId) : null; // optional narrowing
    } else {
      const a = await authorize(req, body?.orgId);
      if (a.error) return a.error;
      admin = a.ok.admin;
      orgId = a.ok.org.id;
    }

    let q = admin
      .from("campaign_sends")
      .select("id, organization_id, campaign_id, contact_id, channel, address")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(BATCH);
    if (orgId) q = q.eq("organization_id", orgId);
    const { data: pending } = await q;
    const rows = (pending as Json[]) ?? [];

    const campaigns = new Map<string, Json>();
    const loadCampaign = async (id: string): Promise<Json> => {
      if (!campaigns.has(id)) {
        const { data } = await admin.from("campaigns").select("id, name, subject, body, channel").eq("id", id).maybeSingle();
        campaigns.set(id, data ?? null);
      }
      return campaigns.get(id);
    };

    let sent = 0, failed = 0, skipped = 0;
    const touched = new Set<string>();

    for (const row of rows) {
      touched.add(row.campaign_id);
      const finish = (status: string, error = "") =>
        admin.from("campaign_sends").update({
          status, error,
          sent_at: status === "sent" ? new Date().toISOString() : null,
        }).eq("id", row.id);

      const address = String(row.address || "").trim();
      if (!address) {
        await finish("skipped", "no address");
        skipped++;
        continue;
      }

      // Re-check consent at send time (the queue may be hours old).
      if (row.contact_id) {
        const { data: contact } = await admin
          .from("crm_contacts")
          .select("email_opt_out, sms_opt_out")
          .eq("id", row.contact_id)
          .maybeSingle();
        const c = contact as Json;
        if (c && ((row.channel === "email" && c.email_opt_out) || (row.channel === "sms" && c.sms_opt_out))) {
          await finish("skipped", "opted out");
          skipped++;
          continue;
        }
      }

      const campaign = await loadCampaign(row.campaign_id);
      if (!campaign) {
        await finish("skipped", "campaign missing");
        skipped++;
        continue;
      }

      try {
        if (row.channel === "sms") {
          const r = await twilioSend("sms", address, `${campaign.body} Reply STOP to opt out`);
          if (r.ok || r.status === "simulated") {
            await finish("sent");
            sent++;
          } else {
            await finish("failed", r.errorMessage || "SMS send failed");
            failed++;
          }
        } else {
          // Two different URLs on purpose: the human-visible link must RENDER,
          // and the Supabase gateway forces text/plain + a sandbox CSP on
          // function responses, so it points at the Phoxta page. The RFC 8058
          // one-click header is POSTed by the mail client, which never renders
          // the response, so it targets the function directly.
          const unsubLink = row.contact_id
            ? `https://www.phoxta.com/unsubscribe?c=${row.contact_id}&o=${row.organization_id}&ch=email`
            : "";
          const oneClick = row.contact_id
            ? `${FN_BASE}/unsubscribe?c=${row.contact_id}&o=${row.organization_id}&ch=email`
            : "";
          const text = campaign.body + (unsubLink ? `\n\n—\nUnsubscribe: ${unsubLink}` : "");
          const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
          const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#222">${
            esc(campaign.body).replace(/\n/g, "<br/>")
          }${unsubLink ? `<p style="margin:16px 0 0;font-size:12px;color:#888">—<br/><a href="${unsubLink}">Unsubscribe</a></p>` : ""}</div>`;
          const r = await sendEmail({
            to: [address],
            subject: campaign.subject || campaign.name || "A message from us",
            html, text,
            headers: oneClick
              ? { "List-Unsubscribe": `<${oneClick}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }
              : undefined,
          });
          if (r.ok || r.status === "simulated") {
            await finish("sent");
            sent++;
          } else {
            await finish("failed", r.error || "email send failed");
            failed++;
          }
        }
      } catch (e) {
        await finish("failed", String((e as Error)?.message || e));
        failed++;
      }
    }

    // Roll the per-row outcomes up onto each touched campaign.
    for (const cid of touched) {
      const count = async (status: string): Promise<number> => {
        const { count: n } = await admin
          .from("campaign_sends")
          .select("id", { count: "exact", head: true })
          .eq("campaign_id", cid)
          .eq("status", status);
        return n ?? 0;
      };
      const [nSent, nFailed, nPending] = await Promise.all([count("sent"), count("failed"), count("pending")]);
      // deno-lint-ignore no-explicit-any
      const patch: Record<string, any> = { sent_count: nSent, failed_count: nFailed };
      if (nPending === 0) {
        patch.status = "sent";
        patch.sent_at = new Date().toISOString();
      }
      await admin.from("campaigns").update(patch).eq("id", cid);
    }

    return json({ ok: true, processed: rows.length, sent, failed, skipped, remaining_batch_full: rows.length === BATCH });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
