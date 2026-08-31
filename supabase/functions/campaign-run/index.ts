// Phoxta — campaign-run: drains pending campaign_sends and actually delivers
// them (email via Resend with one-click List-Unsubscribe, SMS via Twilio with
// a STOP notice). Two callers:
//   - a member with { orgId }               → drains that org's queue
//   - the scheduler with x-cron-secret      → drains every org's queue
// Re-checks opt-outs at send time, records per-row status/error, then rolls the
// counts up onto the campaign (status → 'sent' when nothing is left pending).
//
// ── WHY THE ROWS ARE CLAIMED ────────────────────────────────────────────────
//
// The console kicks this the moment a campaign is queued (src/lib/db/ops/
// marketing.ts) and the cron tick kicks it every five minutes. Both used to
// SELECT the same fifty pending rows and both sent them: a marketing email to
// the same person twice, which is the complaint that gets a sender domain
// blacklisted. Now the rows are claimed in one statement (app_claim_campaign_
// sends, 0129: pending → sending, FOR UPDATE SKIP LOCKED), so two callers
// divide the queue instead of sharing it.
//
// A row left 'sending' by a run that died is NOT retried: the send may have
// gone out in the instant before the crash, and a duplicate marketing message
// is worse than a missing one. After ten minutes it is failed with a reason the
// console can show, and a person decides.
import { preflight, json } from "../_shared/cors.ts";
import { authorize, isCronRequest } from "../_shared/auth.ts";
import { adminClient, type SupabaseClient } from "../_shared/supabaseAdmin.ts";
import { sendEmail, twilioSend } from "../_shared/dispatch.ts";
import { orgReplyTo } from "../_shared/conversationEmail.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

const BATCH = 50;
const STALE_MINUTES = 10;
const FN_BASE = "https://ktgleoqvdikngocygdkn.supabase.co/functions/v1";

/** PostgREST's "that function does not exist" — the migration is behind the deploy. */
const isMissingFn = (e: { code?: string; message?: string } | null): boolean =>
  !!e && (e.code === "PGRST202" || e.code === "42883" || /schema cache|does not exist/i.test(e.message ?? ""));

async function claimSends(admin: SupabaseClient, orgId: string | null): Promise<{ rows: Json[]; claimed: boolean }> {
  const { data, error } = await admin.rpc("app_claim_campaign_sends", { p_limit: BATCH, p_org: orgId });
  if (!error) return { rows: (data as Json[] | null) ?? [], claimed: true };
  if (!isMissingFn(error)) throw new Error(`claim failed: ${error.message}`);
  // Deploy ahead of migration 0129: the old unclaimed read, said out loud.
  console.warn("[phoxta] campaign-run: app_claim_campaign_sends is missing (apply migration 0129) — reading the queue unclaimed");
  let q = admin
    .from("campaign_sends")
    .select("id, organization_id, campaign_id, contact_id, channel, address")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(BATCH);
  if (orgId) q = q.eq("organization_id", orgId);
  const { data: pending } = await q;
  return { rows: (pending as Json[] | null) ?? [], claimed: false };
}

/** Rows a dead run left 'sending'. Failed, not retried — see the header. */
async function failStaleSends(admin: SupabaseClient, orgId: string | null): Promise<string[]> {
  const cutoff = new Date(Date.now() - STALE_MINUTES * 60_000).toISOString();
  let q = admin
    .from("campaign_sends")
    .update({ status: "failed", error: "the send did not complete — the worker stopped mid-way; not retried automatically in case it went out" })
    .eq("status", "sending")
    .lt("claimed_at", cutoff);
  if (orgId) q = q.eq("organization_id", orgId);
  const { data } = await q.select("campaign_id");
  return [...new Set(((data as { campaign_id: string }[] | null) ?? []).map((r) => r.campaign_id))];
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  const body = (await req.json().catch(() => ({}))) as Json;

  // Auth: trusted scheduler (all orgs) or a signed-in member (their org only).
  const isCron = isCronRequest(req);
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

  // A heartbeat, so cron_heartbeats proves THIS worker ran rather than only
  // proving the loop that pings it is alive. Scheduled leg only.
  const beat = async (ok: boolean, detail: string) => {
    if (!isCron) return;
    try { await admin.rpc("app_cron_beat", { p_worker: "campaign-run", p_ok: ok, p_detail: detail }); } catch { /* the tick still ran */ }
  };

  try {
    const touched = new Set<string>();
    // Settle the dead first, so their campaigns roll up this tick.
    for (const cid of await failStaleSends(admin, orgId)) touched.add(cid);

    const { rows, claimed } = await claimSends(admin, orgId);

    const campaigns = new Map<string, Json>();
    const loadCampaign = async (id: string): Promise<Json> => {
      if (!campaigns.has(id)) {
        const { data } = await admin.from("campaigns").select("id, name, subject, body, channel").eq("id", id).maybeSingle();
        campaigns.set(id, data ?? null);
      }
      return campaigns.get(id);
    };

    let sent = 0, failed = 0, skipped = 0;
    // WHOSE ADDRESS DOES A REPLY REACH? sendEmail defaults Reply-To to
    // hello@phoxta.com, so a tenant's campaign put PHOXTA's mailbox on mail sent
    // to THEIR customers — and Phoxta dogfoods gmail-sync, so a reply arriving
    // there is ingested and answered by Phoxta's own agent. Resolved once per
    // organisation across the batch rather than per row.
    const replyToCache = new Map<string, string>();
    const replyToFor = async (org: string): Promise<string> => {
      const hit = replyToCache.get(org);
      if (hit !== undefined) return hit;
      const v = await orgReplyTo(admin, org);
      replyToCache.set(org, v);
      return v;
    };

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
          const replyTo = await replyToFor(String(row.organization_id));
          if (!replyTo) {
            await finish("failed", "no address for this business could be found to receive replies — add a billing email in Settings, or connect Google");
            failed++;
            continue;
          }
          const r = await sendEmail({
            to: [address],
            subject: campaign.subject || campaign.name || "A message from us",
            html, text, replyTo,
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

    // Roll the per-row outcomes up onto each touched campaign. 'sending' counts
    // as unsettled: a campaign is not 'sent' while another run still holds
    // some of its rows.
    for (const cid of touched) {
      const count = async (statuses: string[]): Promise<number> => {
        const { count: n } = await admin
          .from("campaign_sends")
          .select("id", { count: "exact", head: true })
          .eq("campaign_id", cid)
          .in("status", statuses);
        return n ?? 0;
      };
      const [nSent, nFailed, nOpen] = await Promise.all([count(["sent"]), count(["failed"]), count(["pending", "sending"])]);
      // deno-lint-ignore no-explicit-any
      const patch: Record<string, any> = { sent_count: nSent, failed_count: nFailed };
      if (nOpen === 0) {
        patch.status = "sent";
        patch.sent_at = new Date().toISOString();
      }
      await admin.from("campaigns").update(patch).eq("id", cid);
    }

    const remaining_batch_full = rows.length === BATCH;
    const detail =
      `${sent} sent, ${failed} failed, ${skipped} skipped of ${rows.length} claimed` +
      (remaining_batch_full ? " (more waiting)" : "") +
      (claimed ? "" : " — UNCLAIMED READ, apply migration 0129");
    // Every claimed row failing is a broken tick (a provider down, keys gone),
    // and a broken tick says so in its status code: the VM log sees only that.
    const totalFailure = rows.length > 0 && sent === 0 && skipped === 0 && failed === rows.length;
    await beat(!totalFailure && claimed, detail);
    return json(
      { ok: !totalFailure, processed: rows.length, sent, failed, skipped, remaining_batch_full, ...(claimed ? {} : { warning: "unclaimed read — apply migration 0129" }) },
      totalFailure ? 502 : 200,
    );
  } catch (err) {
    const msg = String((err as Error)?.message || err);
    await beat(false, msg);
    return json({ error: msg }, 500);
  }
});
