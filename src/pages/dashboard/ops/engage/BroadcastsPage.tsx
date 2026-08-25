import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL } from "@/lib/cache/dashboardQueries";
import {
  listCampaigns,
  createCampaign,
  queueCampaignSend,
  listMarketingContacts,
  listSegments,
  createSegment,
  deleteSegment,
  listAutomations,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  toggleAutomation,
  listMarketingRuns,
  type Campaign,
  type Segment,
  type MarketingContact,
  type Automation,
  type MarketingRun,
  type AutomationTrigger,
  type AutomationAction,
} from "@/lib/db/ops/marketing";
import {
  listCampaigns as listOutboundCampaigns,
  createCampaign as createOutboundCampaign,
  queueCampaign,
  listTasks,
  type OutboundCampaign,
  type OutboundTask,
} from "@/lib/db/ops/agent";
import {
  listAiAutomations,
  createAiAutomation,
  toggleAutomation as toggleAiAutomation,
  removeAutomation,
  runAutomation,
  listAutomationRuns,
  type Automation as AiAutomation,
  type AutomationRun,
} from "@/lib/db/ops/proactive";
import { invokeAction } from "@/lib/db/ops/ai";
import { useEngageOps } from "@/lib/db/ops/engageAreas";
import { toast, toastError, confirmDanger, reportMutation } from "@/lib/ops/feedback";
import { Card, Chip, Empty } from "@/components/dash/Ui";
import PromoCodes from "@/pages/dashboard/ops/PromoCodes";

// ---------------------------------------------------------------------------
// Engage → Broadcasts: the whole former Marketing surface, split into named
// sub-views. "Broadcasts" is the campaigns surface (compose, review, send);
// "Rules" is the legacy trigger→action automations (being succeeded by
// Journeys); AI Outreach and Promo codes moved over with it so nothing the
// old tab could do is lost. All handlers and db calls are ported verbatim.
// ---------------------------------------------------------------------------
type CampaignCopy = { name: string; subject: string; body: string };
type AiSegment = { criteria: string; contact_ids: string[]; rationale: string };

type SectionKey = "broadcasts" | "rules" | "outreach" | "promos";

const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: "broadcasts", label: "Broadcasts" },
  { key: "rules", label: "Rules" },
  { key: "outreach", label: "AI Outreach" },
  { key: "promos", label: "Promo codes" },
];

/** Old /marketing?tab= values keep landing on the right sub-view (the redirect
 *  preserves the search string). */
const LEGACY_TABS: Record<string, SectionKey> = { campaigns: "broadcasts", automations: "rules" };

type ChipTone = "plain" | "blue" | "orange" | "ok" | "warn" | "danger" | "solid" | "line";
const RUN_TONE: Record<string, ChipTone> = {
  pending: "line",
  running: "warn",
  succeeded: "ok",
  failed: "danger",
};
const TASK_TONE: Record<string, ChipTone> = {
  queued: "line",
  in_progress: "warn",
  done: "ok",
  failed: "danger",
  no_answer: "plain",
};
const CAMPAIGN_TONE: Record<Campaign["status"], ChipTone> = {
  draft: "line",
  scheduled: "warn",
  sending: "warn",
  sent: "ok",
};

/** Page-local styles on top of the shared .hrx kit. */
const CSS = `
.bcx-head { display: flex; align-items: center; justify-content: space-between; gap: 10px 12px; flex-wrap: wrap; margin-bottom: 14px; }
.bcx-title { font-size: 20px; font-weight: 600; letter-spacing: -0.02em; margin: 0; }
.bcx-legacy { font-size: 13.5px; color: var(--hrx-muted); background: var(--hrx-soft); border: 1px solid var(--hrx-border-soft); border-radius: 12px; padding: 10px 12px; margin: 0 0 14px; }
.bcx-legacy a { color: var(--hrx-ink); font-weight: 500; }
.mkx-accent { box-shadow: inset 3px 0 0 var(--hrx-ink); }
.mkx-pre { white-space: pre-wrap; background: var(--hrx-soft); border: 1px solid var(--hrx-border-soft); border-radius: 12px; padding: 10px 12px; font-size: 14px; }
.mkx-hint { font-size: 13px; color: var(--hrx-muted); }
.mkx-recipe { background: var(--hrx-soft); border: 1px solid var(--hrx-border-soft); border-radius: 12px; padding: 14px 16px; }
.mkx-recipe .t { font-size: 15px; font-weight: 600; letter-spacing: -0.01em; margin: 0 0 4px; }
.mkx-recipe .d { font-size: 13px; color: var(--hrx-muted); margin: 0 0 12px; }
.mkx-runrow { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px 12px; padding: 9px 0; border-top: 1px solid #f1f2f4; font-size: 13.5px; }
.mkx-runrow:first-of-type { border-top: 0; }
.mkx-runrow .who { min-width: 0; color: var(--hrx-ink); }
.mkx-details { border: 1px solid var(--hrx-border-soft); border-radius: 12px; padding: 10px 12px; background: var(--hrx-soft); }
.mkx-details summary { cursor: pointer; font-size: 13.5px; }
.mkx-details[open] > summary { margin-bottom: 8px; }
.mkx-item { padding: 12px 0; border-top: 1px solid #ececec; }
.mkx-item:first-child { border-top: 0; padding-top: 0; }
.mkx-item:last-child { padding-bottom: 0; }
.mkx-row { display: flex; align-items: center; justify-content: space-between; gap: 10px 12px; flex-wrap: wrap; }
`;

const TRIGGERS: { value: AutomationTrigger; label: string }[] = [
  { value: "contact_created", label: "New contact" },
  { value: "order_paid", label: "Order paid" },
  { value: "booking_created", label: "New booking" },
  { value: "ticket_created", label: "New ticket" },
];
const ACTIONS: { value: AutomationAction; label: string }[] = [
  { value: "send_email", label: "Send email" },
  { value: "add_tag", label: "Add tag" },
  { value: "create_task", label: "Create task" },
  { value: "notify", label: "Notify team" },
];

const OUTBOUND_TYPES = [
  { value: "cold_call", label: "Cold calling" },
  { value: "upsell", label: "Upsell" },
  { value: "cross_sell", label: "Cross-sell" },
  { value: "nurture", label: "Lead nurturing" },
];

// ---------------------------------------------------------------------------
export default function BroadcastsPage() {
  const { orgId, org } = useEngageOps();
  // The open section lives in the URL, so it survives Back, sharing, and the
  // business switcher (which preserves the pathname + query).
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab") ?? "";
  const normalized = LEGACY_TABS[requested] ?? requested;
  const tab = (SECTIONS.some((s) => s.key === normalized) ? normalized : "broadcasts") as SectionKey;
  const setTab = (k: SectionKey) => setParams(k === "broadcasts" ? {} : { tab: k });

  function move(e: React.KeyboardEvent, i: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = SECTIONS[(i + (e.key === "ArrowRight" ? 1 : SECTIONS.length - 1)) % SECTIONS.length];
    setTab(next.key);
    document.getElementById(`bcx-tab-${next.key}`)?.focus();
  }

  const { data, loading, error: loadError, reload } = useCachedData(
    `ops:marketing:${orgId}`,
    async () => {
      const [c, seg, ct, a, r, oc, ot, aa, ar] = await Promise.all([
        listCampaigns(orgId),
        listSegments(orgId),
        listMarketingContacts(orgId),
        listAutomations(orgId),
        listMarketingRuns(orgId),
        listOutboundCampaigns(orgId),
        listTasks(orgId),
        listAiAutomations(orgId),
        listAutomationRuns(orgId),
      ]);
      // Any one of the nine failing would otherwise read as "you have none of these".
      const err = [c, seg, ct, a, r, oc, ot, aa, ar].map((x) => x.error).find(Boolean);
      if (err) throw new Error(err);
      return {
        campaigns: c.data, segments: seg.data, contacts: ct.data, automations: a.data, runs: r.data,
        outbound: oc.data, tasks: ot.data, aiAutos: aa.data, aiRuns: ar.data,
      };
    },
    { ttl: DASHBOARD_TTL },
  );

  if (loading) return <div className="hrx-card hrx-pad text-center" style={{ color: "var(--hrx-muted)" }} role="status">Loading…</div>;

  return (
    <div>
      <style>{CSS}</style>

      {/* ONE header line: title left, the sub-view tabbar right. */}
      <div className="bcx-head">
        <h2 className="bcx-title">Broadcasts</h2>
        <nav className="hrx-tabbar" role="tablist" aria-label="Broadcast sections">
          {SECTIONS.map((s, i) => {
            const active = tab === s.key;
            return (
              <button
                key={s.key}
                id={`bcx-tab-${s.key}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`bcx-panel-${s.key}`}
                tabIndex={active ? 0 : -1}
                onKeyDown={(e) => move(e, i)}
                onClick={() => setTab(s.key)}
                className={`hrx-tab${active ? " active" : ""}`}
              >
                {s.label}
              </button>
            );
          })}
        </nav>
      </div>

      {loadError && <div className="alert alert-warning py-2 px-3 mb-3" style={{ borderRadius: 12, fontSize: 14 }} role="alert">{loadError}</div>}

      <div id={`bcx-panel-${tab}`} role="tabpanel" aria-labelledby={`bcx-tab-${tab}`}>
        {tab === "broadcasts" && (
          <CampaignsTab
            orgId={orgId}
            campaigns={data?.campaigns ?? []}
            segments={data?.segments ?? []}
            contacts={data?.contacts ?? []}
            reload={reload}
          />
        )}
        {tab === "rules" && (
          <>
            <p className="bcx-legacy">
              These simple trigger → action rules keep running, but they&rsquo;re being succeeded by{" "}
              <Link to="../journeys">Journeys</Link> — build new lifecycle automation there.
            </p>
            <AutomationsTab
              orgId={orgId}
              businessName={org?.name ?? ""}
              automations={data?.automations ?? []}
              runs={data?.runs ?? []}
              reload={reload}
            />
          </>
        )}
        {tab === "outreach" && (
          <OutreachTab
            orgId={orgId}
            outbound={data?.outbound ?? []}
            tasks={data?.tasks ?? []}
            contacts={data?.contacts ?? []}
            aiAutos={data?.aiAutos ?? []}
            aiRuns={data?.aiRuns ?? []}
            reload={reload}
          />
        )}
        {tab === "promos" && <PromoCodes orgId={orgId} />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Broadcasts: real sends over campaign_sends + campaign-run, saved segments.
function CampaignsTab({ orgId, campaigns, segments, contacts, reload }: {
  orgId: string;
  campaigns: Campaign[];
  segments: Segment[];
  contacts: MarketingContact[];
  reload: () => void;
}) {
  const [cForm, setCForm] = useState({ name: "", channel: "email" as "email" | "sms", subject: "", body: "", audience: "all" });
  const [genForm, setGenForm] = useState({ goal: "", channel: "email", audience: "all customers" });
  const [genLoading, setGenLoading] = useState(false);
  const [segDesc, setSegDesc] = useState("");
  const [seg, setSeg] = useState<(AiSegment & { count: number }) | null>(null);
  const [segName, setSegName] = useState("");
  const [segLoading, setSegLoading] = useState(false);
  const [sendPrep, setSendPrep] = useState<{
    campaign: Campaign;
    eligible: { contact_id: string; address: string }[];
    skipped: number;
    audienceLabel: string;
  } | null>(null);
  const [sending, setSending] = useState(false);

  async function genCampaign() {
    if (!genForm.goal.trim()) return;
    setGenLoading(true);
    const { data, error } = await invokeAction<CampaignCopy>(orgId, "campaign_copy", genForm);
    setGenLoading(false);
    if (error) toastError(error);
    else if (data) {
      setCForm((f) => ({ ...f, name: data.name, channel: genForm.channel as "email" | "sms", subject: data.subject, body: data.body }));
      toast("Draft copy generated — edit it below before creating the campaign.", "info");
    }
  }

  async function runSegment() {
    if (!segDesc.trim()) return;
    setSegLoading(true);
    const { data, error } = await invokeAction<AiSegment>(orgId, "segment_audience", { description: segDesc });
    setSegLoading(false);
    if (error) toastError(error);
    else if (data) {
      setSeg({ ...data, count: data.contact_ids?.length ?? 0 });
      setSegName(data.criteria || segDesc.trim());
    }
  }

  async function saveSegment() {
    if (!seg) return;
    if (!segName.trim()) { toastError("Give the segment a name."); return; }
    const ok = await reportMutation(
      createSegment(orgId, { name: segName, criteria: seg.criteria || segDesc, contact_ids: seg.contact_ids ?? [] }),
      `Segment "${segName.trim()}" saved.`,
    );
    if (ok) { setSeg(null); setSegDesc(""); setSegName(""); reload(); }
  }

  async function removeSegment(s: Segment) {
    if (!confirmDanger(`Delete the segment "${s.name}"? Campaigns aimed at it will stop reaching anyone.`)) return;
    const ok = await reportMutation(deleteSegment(s.id), "Segment deleted.");
    if (ok) reload();
  }

  async function addCampaign(e: React.FormEvent) {
    e.preventDefault();
    if (!cForm.name.trim()) return;
    const ok = await reportMutation(createCampaign(orgId, cForm), "Campaign created as a draft.");
    if (ok) {
      setCForm({ name: "", channel: "email", subject: "", body: "", audience: "all" });
      reload();
    }
  }

  function prepareSend(c: Campaign) {
    let pool = contacts;
    let audienceLabel = "All contacts";
    if (c.audience && c.audience !== "all") {
      const s = segments.find((x) => x.id === c.audience);
      if (!s) { toastError("The saved segment this campaign targets no longer exists."); return; }
      const ids = new Set(s.contact_ids ?? []);
      pool = contacts.filter((x) => ids.has(x.id));
      audienceLabel = `Segment: ${s.name}`;
    }
    const eligible = pool
      .filter((x) => (c.channel === "email" ? x.email && !x.email_opt_out : x.phone && !x.sms_opt_out))
      .map((x) => ({ contact_id: x.id, address: c.channel === "email" ? x.email : x.phone }));
    setSendPrep({ campaign: c, eligible, skipped: pool.length - eligible.length, audienceLabel });
  }

  async function confirmSend() {
    if (!sendPrep) return;
    const { campaign, eligible } = sendPrep;
    if (eligible.length === 0) { toastError("No eligible recipients — everyone is opted out or missing an address."); return; }
    const label = campaign.subject || campaign.name;
    // No extra confirm dialog: the inline review panel above IS the confirmation,
    // and it shows strictly more (audience, skipped count, body preview).
    setSending(true);
    const ok = await reportMutation(
      queueCampaignSend(orgId, campaign, eligible),
      `Sending "${label}" to ${eligible.length} contact(s)…`,
    );
    setSending(false);
    if (ok) { setSendPrep(null); reload(); }
  }

  const statusLine = (c: Campaign) => {
    if (c.status === "sending") return `Sending… ${c.sent_count} sent · ${c.failed_count} failed of ${c.recipients}`;
    if (c.status === "sent") return `${c.sent_count} sent · ${c.failed_count} failed${c.sent_at ? ` · ${new Date(c.sent_at).toLocaleDateString()}` : ""}`;
    return c.subject || "No subject";
  };

  return (
    <div className="row g-3">
      <div className="col-lg-7 d-flex flex-column gap-3">
        <Card title="New broadcast">
          <form onSubmit={addCampaign}>
            <div className="row g-2">
              <div className="col-md-5">
                <label className="hrx-field mb-0" htmlFor="mk-c-name">
                  <span>Campaign name</span>
                  <input id="mk-c-name" className="form-control" value={cForm.name} onChange={(e) => setCForm({ ...cForm, name: e.target.value })} required />
                </label>
              </div>
              <div className="col-md-3">
                <label className="hrx-field mb-0" htmlFor="mk-c-channel">
                  <span>Channel</span>
                  <select id="mk-c-channel" className="form-select" value={cForm.channel} onChange={(e) => setCForm({ ...cForm, channel: e.target.value as "email" | "sms" })}>
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                  </select>
                </label>
              </div>
              <div className="col-md-4">
                <label className="hrx-field mb-0" htmlFor="mk-c-audience">
                  <span>Audience</span>
                  <select id="mk-c-audience" className="form-select" value={cForm.audience} onChange={(e) => setCForm({ ...cForm, audience: e.target.value })}>
                    <option value="all">All contacts</option>
                    {segments.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.contact_ids?.length ?? 0})</option>)}
                  </select>
                </label>
              </div>
              <div className="col-12">
                <label className="hrx-field mb-0" htmlFor="mk-c-subject">
                  <span>Subject</span>
                  <input id="mk-c-subject" className="form-control" value={cForm.subject} onChange={(e) => setCForm({ ...cForm, subject: e.target.value })} />
                </label>
              </div>
              <div className="col-12">
                <label className="hrx-field mb-0" htmlFor="mk-c-body">
                  <span>Body</span>
                  <textarea id="mk-c-body" className="form-control" rows={5} value={cForm.body} onChange={(e) => setCForm({ ...cForm, body: e.target.value })} />
                </label>
              </div>
              <div className="col-12 d-flex flex-wrap align-items-center gap-2">
                <button type="submit" className="hrx-pill primary flex-shrink-0">Create campaign</button>
                <span className="mkx-hint">Every marketing email automatically includes an unsubscribe footer.</span>
              </div>
            </div>
          </form>
        </Card>

        {sendPrep && (
          <Card
            className="mkx-accent"
            title={<>Send &quot;{sendPrep.campaign.subject || sendPrep.campaign.name}&quot; to {sendPrep.eligible.length} contact{sendPrep.eligible.length === 1 ? "" : "s"} via {sendPrep.campaign.channel}</>}
          >
            <div role="status">
              <div className="mkx-hint mb-2">
                {sendPrep.audienceLabel} · {sendPrep.skipped} skipped (no {sendPrep.campaign.channel === "email" ? "email address" : "phone number"} or opted out)
              </div>
              {sendPrep.campaign.body
                ? <div className="mkx-pre mb-3" style={{ maxHeight: 180, overflowY: "auto" }}>{sendPrep.campaign.body}</div>
                : <div className="text-danger mb-3" style={{ fontSize: 14 }}>This campaign has no body — it will send empty.</div>}
              <div className="d-flex flex-wrap gap-2">
                <button type="button" className="hrx-pill dark" onClick={confirmSend} disabled={sending || sendPrep.eligible.length === 0}>{sending ? "Queuing…" : `Confirm send to ${sendPrep.eligible.length}`}</button>
                <button type="button" className="hrx-pill" onClick={() => setSendPrep(null)} disabled={sending}>Cancel</button>
              </div>
            </div>
          </Card>
        )}

        <Card
          title="Campaigns"
          right={campaigns.length > 0 ? <Chip tone="line">{campaigns.length} campaign{campaigns.length === 1 ? "" : "s"}</Chip> : undefined}
        >
          {campaigns.length === 0 ? (
            <Empty title="No campaigns yet">Create one with the form above — or let ✨ Generate write the first draft for you.</Empty>
          ) : (
            <div>
              {campaigns.map((c) => (
                <div key={c.id} className="hrx-listrow">
                  <div className="main">
                    <p className="t">{c.name}</p>
                    <p className="s">{statusLine(c)}</p>
                  </div>
                  <div className="d-flex align-items-center gap-2 flex-shrink-0 flex-wrap justify-content-end">
                    <Chip tone="line">{c.channel === "sms" ? "SMS" : "Email"}</Chip>
                    <Chip tone={CAMPAIGN_TONE[c.status] ?? "line"}>{c.status === "sending" ? "Sending…" : c.status}</Chip>
                    {(c.status === "draft" || c.status === "scheduled") && (
                      <button type="button" className="btn btn-dark btn-sm rounded-pill px-3" onClick={() => prepareSend(c)}>Send</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* AI helper sits below the operational surface, like Commerce. */}
        <Card title="✨ Generate campaign">
          <p className="mkx-hint mb-3">Writes draft copy into the campaign form above — you review and edit before anything is created.</p>
          <div className="row g-2">
            <div className="col-md-6">
              <label className="hrx-field mb-0" htmlFor="mk-g-goal">
                <span>Goal</span>
                <input id="mk-g-goal" className="form-control" placeholder="e.g. win back lapsed customers" value={genForm.goal} onChange={(e) => setGenForm({ ...genForm, goal: e.target.value })} />
              </label>
            </div>
            <div className="col-6 col-md-3">
              <label className="hrx-field mb-0" htmlFor="mk-g-channel">
                <span>Channel</span>
                <select id="mk-g-channel" className="form-select" value={genForm.channel} onChange={(e) => setGenForm({ ...genForm, channel: e.target.value })}>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                </select>
              </label>
            </div>
            <div className="col-6 col-md-3 d-flex align-items-end">
              <button type="button" className="hrx-pill dark w-100 justify-content-center" onClick={genCampaign} disabled={genLoading}>{genLoading ? "Writing…" : "Generate"}</button>
            </div>
          </div>
        </Card>
      </div>

      <div className="col-lg-5 d-flex flex-column gap-3">
        <Card
          title="Segments"
          right={segments.length > 0 ? <Chip tone="line">{segments.length} saved</Chip> : undefined}
        >
          {segments.length === 0 ? (
            <Empty title="No saved segments yet">Build one with AI below, then target it from the campaign form.</Empty>
          ) : (
            <div>
              {segments.map((s) => (
                <div key={s.id} className="hrx-listrow">
                  <div className="main">
                    <p className="t">{s.name}</p>
                    <p className="s">{s.contact_ids?.length ?? 0} contacts · {s.criteria}</p>
                  </div>
                  <button type="button" className="btn btn-link btn-sm p-0 text-danger text-decoration-none flex-shrink-0" onClick={() => removeSegment(s)}>Delete</button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="✨ AI audience builder">
          <label className="hrx-field mb-0" htmlFor="mk-s-desc">
            <span>Describe the audience</span>
            <div className="d-flex flex-wrap gap-2">
              <input id="mk-s-desc" className="form-control flex-grow-1" style={{ minWidth: "12rem" }} placeholder="e.g. high-value customers at churn risk" value={segDesc} onChange={(e) => setSegDesc(e.target.value)} />
              <button type="button" className="hrx-pill dark flex-shrink-0" onClick={runSegment} disabled={segLoading}>{segLoading ? "Building…" : "Build"}</button>
            </div>
          </label>
          {seg && (
            <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--hrx-border-soft)" }}>
              <div className="mb-3" style={{ fontSize: 14 }}>
                <span className="fw-semibold">{seg.criteria}</span> — {seg.count} contacts. <span style={{ color: "var(--hrx-muted)" }}>{seg.rationale}</span>
              </div>
              <label className="hrx-field mb-0" htmlFor="mk-s-name">
                <span>Segment name</span>
                <div className="d-flex flex-wrap gap-2">
                  <input id="mk-s-name" className="form-control flex-grow-1" style={{ minWidth: "12rem" }} placeholder="Segment name" value={segName} onChange={(e) => setSegName(e.target.value)} />
                  <button type="button" className="hrx-pill dark flex-shrink-0" onClick={saveSegment}>Save segment</button>
                </div>
              </label>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rules (legacy automations): recipes, editable email templates, edit/delete,
// failure badges.
const PLACEHOLDER_HELP = "Placeholders: {{name}} = the contact's name, {{business}} = your business name.";

function recipeDefs(businessName: string): {
  key: string; title: string; desc: string;
  trigger: AutomationTrigger; subject: string; body: string;
}[] {
  const biz = businessName || "our business";
  return [
    {
      key: "welcome",
      title: "Welcome new contacts",
      desc: "Greets every new contact by email the moment they're added.",
      trigger: "contact_created",
      subject: `Welcome to ${biz}!`,
      body: `Hi {{name}},\n\nThanks for connecting with ${biz} — we're glad to have you. If there's anything you need, just reply to this email and a real person will get back to you.\n\n— The ${biz} team`,
    },
    {
      key: "review",
      title: "Post-purchase review ask",
      desc: "Asks for feedback after every paid order.",
      trigger: "order_paid",
      subject: `How was your order from ${biz}?`,
      body: `Hi {{name}},\n\nThanks for your recent order from ${biz}! If you have a minute, we'd love to hear how everything went — your feedback directly shapes what we do next.\n\n— The ${biz} team`,
    },
    {
      key: "booking",
      title: "Booking confirmation nudge",
      desc: "Confirms every new booking by email.",
      trigger: "booking_created",
      subject: `Your booking with ${biz}`,
      body: `Hi {{name}},\n\nWe've received your booking with ${biz} — you're all set. If anything changes or you have questions before then, just reply to this email.\n\n— The ${biz} team`,
    },
  ];
}

function AutomationsTab({ orgId, businessName, automations, runs, reload }: {
  orgId: string;
  businessName: string;
  automations: Automation[];
  runs: MarketingRun[];
  reload: () => void;
}) {
  const blank = { name: "", trigger: "contact_created" as AutomationTrigger, action: "send_email" as AutomationAction, subject: "", body: "" };
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyRecipe, setBusyRecipe] = useState<string | null>(null);

  // Latest run per automation → red badge when the last one failed.
  const lastRunFailed = useMemo(() => {
    const seen = new Map<string, boolean>();
    for (const r of runs) {
      if (r.automation_id && !seen.has(r.automation_id)) seen.set(r.automation_id, r.status === "failed");
    }
    return seen;
  }, [runs]);

  function startEdit(a: Automation) {
    setEditingId(a.id);
    setForm({ name: a.name, trigger: a.trigger, action: a.action, subject: a.config?.subject ?? "", body: a.config?.body ?? "" });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const config = form.action === "send_email" ? { subject: form.subject, body: form.body } : {};
    const ok = editingId
      ? await reportMutation(updateAutomation(editingId, { name: form.name.trim(), trigger: form.trigger, action: form.action, config }), "Automation updated.")
      : await reportMutation(createAutomation(orgId, { name: form.name, trigger: form.trigger, action: form.action, config }), "Automation created.");
    if (ok) {
      setForm(blank);
      setEditingId(null);
      reload();
    }
  }

  async function remove(a: Automation) {
    if (!confirmDanger(`Delete the automation "${a.name}"? It will stop running permanently.`)) return;
    const ok = await reportMutation(deleteAutomation(a.id), "Automation deleted.");
    if (ok) {
      if (editingId === a.id) { setEditingId(null); setForm(blank); }
      reload();
    }
  }

  async function addRecipe(r: ReturnType<typeof recipeDefs>[number]) {
    setBusyRecipe(r.key);
    const ok = await reportMutation(
      createAutomation(orgId, { name: r.title, trigger: r.trigger, action: "send_email", config: { subject: r.subject, body: r.body }, active: true }),
      `"${r.title}" is live.`,
    );
    setBusyRecipe(null);
    if (ok) reload();
  }

  return (
    <div className="d-flex flex-column gap-3">
      <Card title="Recipes">
        <div className="row g-2">
          {recipeDefs(businessName).map((r) => (
            <div key={r.key} className="col-md-4">
              <div className="mkx-recipe h-100 d-flex flex-column">
                <p className="t">{r.title}</p>
                <p className="d flex-grow-1">{r.desc}</p>
                <div>
                  <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-3 text-nowrap" onClick={() => addRecipe(r)} disabled={busyRecipe === r.key}>
                    {busyRecipe === r.key ? "Adding…" : "Add automation"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="row g-3">
        <div className="col-lg-6">
          <Card className={editingId ? "mkx-accent" : undefined} title={editingId ? "Edit automation" : "New automation"}>
            <form onSubmit={submit}>
              <label className="hrx-field" htmlFor="mk-a-name">
                <span>Automation name</span>
                <input id="mk-a-name" className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </label>
              <div className="row g-2">
                <div className="col-6">
                  <label className="hrx-field" htmlFor="mk-a-trigger">
                    <span>Trigger</span>
                    <select id="mk-a-trigger" className="form-select" value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value as AutomationTrigger })}>
                      {TRIGGERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </label>
                </div>
                <div className="col-6">
                  <label className="hrx-field" htmlFor="mk-a-action">
                    <span>Action</span>
                    <select id="mk-a-action" className="form-select" value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value as AutomationAction })}>
                      {ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                    </select>
                  </label>
                </div>
              </div>
              {form.action === "send_email" && (
                <>
                  <label className="hrx-field" htmlFor="mk-a-subject">
                    <span>Email subject</span>
                    <input id="mk-a-subject" className="form-control" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
                  </label>
                  <label className="hrx-field" htmlFor="mk-a-body">
                    <span>Email body</span>
                    <textarea id="mk-a-body" className="form-control" rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
                  </label>
                  <p className="mkx-hint" style={{ marginTop: -8 }}>{PLACEHOLDER_HELP}</p>
                </>
              )}
              <div className="d-flex flex-wrap gap-2">
                <button type="submit" className="hrx-pill primary">{editingId ? "Save changes" : "Add automation"}</button>
                {editingId && <button type="button" className="hrx-pill" onClick={() => { setEditingId(null); setForm(blank); }}>Cancel</button>}
              </div>
            </form>
          </Card>
        </div>

        <div className="col-lg-6 d-flex flex-column gap-3">
          <Card
            title="Your automations"
            right={automations.length > 0 ? <Chip tone="line">{automations.length} automation{automations.length === 1 ? "" : "s"}</Chip> : undefined}
          >
            {automations.length === 0 ? (
              <Empty title="No automations yet">Try a recipe above — it goes live in one click.</Empty>
            ) : (
              <div>
                {automations.map((a) => {
                  const trig = TRIGGERS.find((t) => t.value === a.trigger)?.label ?? a.trigger;
                  const act = ACTIONS.find((x) => x.value === a.action)?.label ?? a.action;
                  return (
                    <div key={a.id} className="hrx-listrow">
                      <div className="main">
                        <p className="t">
                          {a.name}
                          {lastRunFailed.get(a.id) && <span className="ms-2"><Chip tone="danger">Last run failed</Chip></span>}
                        </p>
                        <p className="s">When {trig} → {act}{a.config?.subject ? ` · "${a.config.subject}"` : ""}</p>
                      </div>
                      <div className="d-flex align-items-center gap-3 flex-shrink-0">
                        <button type="button" className="btn btn-link btn-sm p-0 text-secondary text-decoration-none" onClick={() => startEdit(a)}>Edit</button>
                        <button type="button" className="btn btn-link btn-sm p-0 text-danger text-decoration-none" onClick={() => remove(a)}>Delete</button>
                        <div className="form-check form-switch m-0">
                          <input className="form-check-input" type="checkbox" aria-label={`${a.name} active`} checked={a.active} onChange={async (e) => { const ok = await reportMutation(toggleAutomation(a.id, e.target.checked), e.target.checked ? "Automation turned on." : "Automation paused."); if (ok) reload(); }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card title="Automation runs">
            {runs.length === 0 ? (
              <p className="mkx-hint mb-0">Nothing yet. Runs start on their own whenever a trigger fires — usually within a few minutes.</p>
            ) : (
              <div>
                {runs.slice(0, 8).map((r) => (
                  <div key={r.id} className="mkx-runrow">
                    <span className="who">{r.automations?.name ?? "Automation"} · {r.trigger.replace("_", " ")} · {new Date(r.created_at).toLocaleString()}</span>
                    <Chip tone={RUN_TONE[r.status] ?? "line"}>{r.status}</Chip>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AI Outreach: outbound campaigns with mandatory audience pre-flight, task
// queue with timestamps, plus proactive AI briefings/tasks and their runs.
function OutreachTab({ orgId, outbound, tasks, contacts, aiAutos, aiRuns, reload }: {
  orgId: string;
  outbound: OutboundCampaign[];
  tasks: OutboundTask[];
  contacts: MarketingContact[];
  aiAutos: AiAutomation[];
  aiRuns: AutomationRun[];
  reload: () => void;
}) {
  const [form, setForm] = useState({ name: "", type: "cold_call", channel_pref: "call", goal: "" });
  const [audience, setAudience] = useState("");
  const [matched, setMatched] = useState<{ desc: string; ids: string[] } | null>(null);
  const [matching, setMatching] = useState(false);
  const [queuing, setQueuing] = useState<string | null>(null);

  const filterActive = audience.trim().length > 0;
  const filterResolved = matched !== null && matched.desc === audience.trim();
  const targetCount = filterActive ? (filterResolved ? matched.ids.length : null) : contacts.length;

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const ok = await reportMutation(createOutboundCampaign(orgId, form), "Outreach campaign created.");
    if (ok) {
      setForm({ name: "", type: "cold_call", channel_pref: "call", goal: "" });
      reload();
    }
  }

  async function matchAudience() {
    const desc = audience.trim();
    if (!desc) return;
    setMatching(true);
    const { data, error } = await invokeAction<{ contact_ids?: string[] }>(orgId, "segment_audience", { description: desc });
    setMatching(false);
    if (error) { toastError(error); return; }
    const ids = data?.contact_ids ?? [];
    setMatched({ desc, ids });
    toast(`Matched ${ids.length} contact(s).`, "info");
  }

  async function queue(c: OutboundCampaign) {
    let targets = contacts.map((x) => ({ id: x.id, name: x.name, email: x.email, phone: x.phone }));
    if (filterActive) {
      // Mandatory pre-flight: the audience must already be resolved.
      if (!matched || matched.desc !== audience.trim()) { toastError("Choose your audience first — tap Match to see who's included."); return; }
      const ids = new Set(matched.ids);
      targets = targets.filter((t) => ids.has(t.id));
      if (targets.length === 0) { toastError("No contacts match that audience — nothing queued."); return; }
    }
    if (!confirmDanger(`Queue ${targets.length} ${c.channel_pref} task(s) for "${c.name}"? The AI will start working through them.`)) return;
    setQueuing(c.id);
    const { count, error } = await queueCampaign(orgId, c, targets);
    setQueuing(null);
    if (error) toastError(error);
    else {
      toast(`Queued ${count} task(s) for "${c.name}".`);
      reload();
    }
  }

  return (
    <div className="row g-3">
      <div className="col-lg-6 d-flex flex-column gap-3">
        <Card title="New outreach campaign">
          <form onSubmit={create}>
            <label className="hrx-field" htmlFor="mk-o-name">
              <span>Campaign name</span>
              <input id="mk-o-name" className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <div className="row g-2">
              <div className="col-6">
                <label className="hrx-field" htmlFor="mk-o-type">
                  <span>Type</span>
                  <select id="mk-o-type" className="form-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    {OUTBOUND_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </label>
              </div>
              <div className="col-6">
                <label className="hrx-field" htmlFor="mk-o-channel">
                  <span>Channel</span>
                  <select id="mk-o-channel" className="form-select" value={form.channel_pref} onChange={(e) => setForm({ ...form, channel_pref: e.target.value })}>
                    <option value="call">Call</option>
                    <option value="sms">SMS</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">Email</option>
                  </select>
                </label>
              </div>
            </div>
            <label className="hrx-field" htmlFor="mk-o-goal">
              <span>Goal</span>
              <input id="mk-o-goal" className="form-control" placeholder="e.g. rebook lapsed customers" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} />
            </label>
            <button type="submit" className="hrx-pill primary">Create campaign</button>
          </form>
        </Card>

        <Card
          title="Outreach campaigns"
          right={outbound.length > 0 ? <Chip tone="line">{outbound.length} campaign{outbound.length === 1 ? "" : "s"}</Chip> : undefined}
        >
          <label className="hrx-field" htmlFor="mk-o-audience">
            <span>Audience (optional — AI-matched before queueing)</span>
            <div className="d-flex flex-wrap gap-2">
              <input
                id="mk-o-audience"
                className="form-control flex-grow-1"
                style={{ minWidth: "12rem" }}
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder={`e.g. "customers who haven't ordered in 60 days" — empty = all ${contacts.length} contacts`}
              />
              <button type="button" className="hrx-pill flex-shrink-0" onClick={matchAudience} disabled={matching || !filterActive}>{matching ? "Matching…" : "Match"}</button>
            </div>
          </label>
          <div role="status" aria-live="polite">
            {filterActive && !filterResolved && <p className="mkx-hint mt-0 mb-2">Tap Match to see who this will reach — until then the send buttons stay off.</p>}
            {filterResolved && <p className="mt-0 mb-2" style={{ fontSize: 14 }}>Matched <span className="fw-semibold">{matched.ids.length}</span> contact(s) for &quot;{matched.desc}&quot;.</p>}
          </div>

          {outbound.length === 0 ? (
            <Empty title="No outreach campaigns yet">Create one above — the AI works through calls and messages for you.</Empty>
          ) : (
            <div>
              {outbound.map((c) => (
                <div key={c.id} className="hrx-listrow">
                  <div className="main">
                    <p className="t">{c.name}</p>
                    <p className="s">{c.channel_pref} · {c.goal || "—"}</p>
                  </div>
                  <div className="d-flex align-items-center gap-2 flex-shrink-0 flex-wrap justify-content-end">
                    <Chip tone="line">{c.type.replace("_", " ")}</Chip>
                    <button
                      type="button"
                      className="btn btn-outline-dark btn-sm rounded-pill px-3 text-nowrap"
                      onClick={() => queue(c)}
                      disabled={queuing === c.id || (filterActive && !filterResolved)}
                    >
                      {queuing === c.id ? "Queuing…" : targetCount === null ? "Match audience first" : `Queue to ${targetCount}`}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card
          title="Task queue"
          right={tasks.length > 0 ? <Chip tone="line">{tasks.length} task{tasks.length === 1 ? "" : "s"}</Chip> : undefined}
        >
          {tasks.length === 0 ? (
            <Empty title="No outreach yet">Once a campaign goes out, each call or message shows up here with its result. Booking reminders appear here automatically too.</Empty>
          ) : (
            <div className="hrx-tablewrap">
              <table className="hrx-table" style={{ minWidth: 520 }}>
                <thead>
                  <tr>
                    <th>Contact</th>
                    <th>When</th>
                    <th style={{ textAlign: "right" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <div className="fw-semibold">{t.customer_name || "Contact"}</div>
                        <div className="text-capitalize" style={{ color: "var(--hrx-muted)", fontSize: 13 }}>{t.type.replace("_", " ")} · {t.channel}{t.outcome ? ` · ${t.outcome}` : ""}</div>
                      </td>
                      <td className="text-nowrap" style={{ color: "var(--hrx-muted)" }}>{new Date(t.created_at).toLocaleString()}</td>
                      <td style={{ textAlign: "right" }}><Chip tone={TASK_TONE[t.status] ?? "line"}>{t.status.replace("_", " ")}</Chip></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <div className="col-lg-6">
        <ProactiveSection orgId={orgId} autos={aiAutos} runs={aiRuns} reload={reload} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Proactive AI briefings/tasks (absorbed from the old Proactive page).
function ProactiveSection({ orgId, autos, runs, reload }: {
  orgId: string;
  autos: AiAutomation[];
  runs: AutomationRun[];
  reload: () => void;
}) {
  const [form, setForm] = useState<{ name: string; action: "ai_briefing" | "ai_task"; schedule: "schedule_daily" | "schedule_weekly"; instruction: string; channel: "email" | "dashboard" }>({ name: "", action: "ai_briefing", schedule: "schedule_daily", instruction: "", channel: "email" });
  const [busy, setBusy] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const [output, setOutput] = useState<{ id: string; text: string } | null>(null);

  const scheduleLabel = (t: string) => (t === "schedule_weekly" ? "Weekly" : "Daily");
  const actionLabel = (a: string) => (a === "ai_task" ? "AI task" : "AI briefing");

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toastError("Give it a name."); return; }
    setBusy(true);
    const ok = await reportMutation(createAiAutomation(orgId, form), "Scheduled AI automation created.");
    setBusy(false);
    if (ok) {
      setForm({ name: "", action: "ai_briefing", schedule: "schedule_daily", instruction: "", channel: "email" });
      reload();
    }
  }

  async function run(a: AiAutomation) {
    setRunning(a.id);
    setOutput(null);
    const { output: out, error } = await runAutomation(a.id);
    setRunning(null);
    if (error) { toastError(error); return; }
    setOutput({ id: a.id, text: out ?? "" });
    reload();
  }

  async function remove(a: AiAutomation) {
    if (!confirmDanger(`Remove the scheduled automation "${a.name}"?`)) return;
    const ok = await reportMutation(removeAutomation(a.id), "Automation removed.");
    if (ok) reload();
  }

  return (
    <div className="d-flex flex-column gap-3">
      <Card title="Proactive briefings & tasks">
        <p className="mkx-hint mb-3">Have the AI run on a schedule — a briefing it emails you, or a task it performs.</p>
        <form onSubmit={create}>
          <label className="hrx-field" htmlFor="mk-p-name">
            <span>Name</span>
            <input id="mk-p-name" className="form-control" placeholder="e.g. Morning briefing" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <div className="row g-2">
            <div className="col-6">
              <label className="hrx-field" htmlFor="mk-p-action">
                <span>What</span>
                <select id="mk-p-action" className="form-select" value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value as typeof form.action })}><option value="ai_briefing">AI briefing</option><option value="ai_task">AI task</option></select>
              </label>
            </div>
            <div className="col-6">
              <label className="hrx-field" htmlFor="mk-p-schedule">
                <span>When</span>
                <select id="mk-p-schedule" className="form-select" value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value as typeof form.schedule })}><option value="schedule_daily">Daily</option><option value="schedule_weekly">Weekly</option></select>
              </label>
            </div>
          </div>
          <label className="hrx-field" htmlFor="mk-p-instruction">
            <span>Instruction</span>
            <textarea id="mk-p-instruction" className="form-control" rows={3} placeholder={form.action === "ai_task" ? "What should the AI do? (e.g. draft a blog post about this week's new arrivals)" : "What to include (optional — defaults to a full business briefing)"} value={form.instruction} onChange={(e) => setForm({ ...form, instruction: e.target.value })} />
          </label>
          <label className="hrx-field" htmlFor="mk-p-channel">
            <span>Deliver to</span>
            <select id="mk-p-channel" className="form-select" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value as typeof form.channel })}><option value="email">Email it to me</option><option value="dashboard">Dashboard only</option></select>
          </label>
          <button type="submit" className="hrx-pill primary" disabled={busy}>{busy ? "Creating…" : "Create automation"}</button>
        </form>
      </Card>

      <Card
        title="Your scheduled AI automations"
        right={autos.length > 0 ? <Chip tone="line">{autos.length} scheduled</Chip> : undefined}
      >
        {autos.length === 0 ? (
          <Empty title="None yet">Try a daily &quot;Morning briefing&quot;.</Empty>
        ) : (
          <div>
            {autos.map((a) => (
              <div key={a.id} className="mkx-item">
                <div className="mkx-row">
                  <div style={{ minWidth: 0, flex: "1 1 auto" }}>
                    <p className="mb-0 fw-semibold" style={{ fontSize: 15 }}>{a.name}</p>
                    <p className="mb-0 mkx-hint">{actionLabel(a.action)} · {scheduleLabel(a.trigger)}{a.last_run_at ? ` · last run ${new Date(a.last_run_at).toLocaleString()}` : ""}</p>
                  </div>
                  <div className="d-flex align-items-center gap-3 flex-shrink-0">
                    <button type="button" className="btn btn-dark btn-sm rounded-pill px-3 text-nowrap" onClick={() => run(a)} disabled={running === a.id}>{running === a.id ? "Running…" : "Run now"}</button>
                    <div className="form-check form-switch m-0"><input className="form-check-input" type="checkbox" aria-label={`${a.name} active`} checked={a.active} onChange={async (e) => { const ok = await reportMutation(toggleAiAutomation(a.id, e.target.checked), e.target.checked ? "Automation turned on." : "Automation paused."); if (ok) reload(); }} /></div>
                    <button type="button" className="btn btn-link btn-sm p-0 text-danger text-decoration-none" onClick={() => remove(a)}>Remove</button>
                  </div>
                </div>
                {output?.id === a.id && <div className="mkx-pre mt-2">{output.text}</div>}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Recent AI runs">
        {runs.length === 0 ? (
          <p className="mkx-hint mb-0">No runs yet.</p>
        ) : (
          <div className="d-flex flex-column gap-2">
            {runs.slice(0, 6).map((r) => (
              <details key={r.id} className="mkx-details">
                <summary>
                  {new Date(r.created_at).toLocaleString()}
                  <span className="ms-2"><Chip tone={RUN_TONE[r.status] ?? "line"}>{r.status}</Chip></span>
                  <span style={{ color: "var(--hrx-muted)" }}> — {r.output.slice(0, 80)}{r.output.length > 80 ? "…" : ""}</span>
                </summary>
                <div style={{ whiteSpace: "pre-wrap", fontSize: 13.5 }}>{r.output}</div>
              </details>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
