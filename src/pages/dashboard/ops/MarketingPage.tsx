import { useMemo, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
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
import { toast, toastError, confirmDanger, reportMutation } from "@/lib/ops/feedback";
import type { OpsContext } from "@/layouts/OperatingLayout";
import { OpsSubNav } from "@/layouts/OpsSubNav";
import PromoCodes from "./PromoCodes";

// ---------------------------------------------------------------------------
type CampaignCopy = { name: string; subject: string; body: string };
type AiSegment = { criteria: string; contact_ids: string[]; rationale: string };

type SectionKey = "campaigns" | "automations" | "outreach" | "promos";

const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: "campaigns", label: "Campaigns" },
  { key: "automations", label: "Automations" },
  { key: "outreach", label: "AI Outreach" },
  { key: "promos", label: "Promo codes" },
];

/** Underlined sub-tab strip: navigation between the four Marketing sections.
 *  Deliberately NOT the rounded pills used for list filters elsewhere, and
 *  visually subordinate to the console shell's tab bar. */
function SectionTabs({ tab, setTab }: { tab: SectionKey; setTab: (k: SectionKey) => void }) {
  function move(e: React.KeyboardEvent, i: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = SECTIONS[(i + (e.key === "ArrowRight" ? 1 : SECTIONS.length - 1)) % SECTIONS.length];
    setTab(next.key);
    document.getElementById(`mk-tab-${next.key}`)?.focus();
  }
  return (
    // Rendered into the console header's pinned block (see OpsSubNav).
    <OpsSubNav>
      <div className="ops-scroll-x border-bottom">
        <div className="d-flex flex-nowrap" role="tablist" aria-label="Marketing sections">
          {SECTIONS.map((s, i) => {
            const active = tab === s.key;
            return (
              <button
                key={s.key}
                id={`mk-tab-${s.key}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`mk-panel-${s.key}`}
                tabIndex={active ? 0 : -1}
                onKeyDown={(e) => move(e, i)}
                onClick={() => setTab(s.key)}
                className={`btn btn-sm rounded-0 bg-transparent text-nowrap px-3 py-2 ops-tap ${active ? "neutral-900 fw-700" : "neutral-500 fw-500"}`}
                style={{ border: "none", borderBottom: `2px solid ${active ? "#212529" : "transparent"}`, marginBottom: -1 }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>
    </OpsSubNav>
  );
}

const RUN_STYLE: Record<string, string> = {
  pending: "bg-neutral-100 neutral-700",
  running: "bg-warning-subtle text-warning",
  succeeded: "bg-success-subtle text-success",
  failed: "bg-danger-subtle text-danger",
};
const TASK_STYLE: Record<string, string> = {
  queued: "bg-neutral-100 neutral-700",
  in_progress: "bg-warning-subtle text-warning",
  done: "bg-success-subtle text-success",
  failed: "bg-danger-subtle text-danger",
  no_answer: "bg-neutral-100 neutral-500",
};
const CAMPAIGN_STYLE: Record<Campaign["status"], string> = {
  draft: "bg-neutral-100 neutral-700",
  scheduled: "bg-warning-subtle text-warning",
  sending: "bg-warning-subtle text-warning",
  sent: "bg-success-subtle text-success",
};

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
export default function MarketingPage() {
  const { orgId, org } = useOutletContext<OpsContext>();
  // The open section lives in the URL, so it survives Back, sharing, and the
  // business switcher (which preserves the pathname + query).
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab");
  const tab = (SECTIONS.some((s) => s.key === requested) ? requested : "campaigns") as SectionKey;
  const setTab = (k: SectionKey) => setParams(k === "campaigns" ? {} : { tab: k });

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

  if (loading) return <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500">Loading…</div>;

  return (
    <div>
      <SectionTabs tab={tab} setTab={setTab} />

      {loadError && <div className="alert alert-warning py-2 px-3 fz-font-md mb-3" role="alert">{loadError}</div>}

      <div id={`mk-panel-${tab}`} role="tabpanel" aria-labelledby={`mk-tab-${tab}`}>
        {tab === "campaigns" && (
          <CampaignsTab
            orgId={orgId}
            campaigns={data?.campaigns ?? []}
            segments={data?.segments ?? []}
            contacts={data?.contacts ?? []}
            reload={reload}
          />
        )}
        {tab === "automations" && (
          <AutomationsTab
            orgId={orgId}
            businessName={org.name}
            automations={data?.automations ?? []}
            runs={data?.runs ?? []}
            reload={reload}
          />
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
// Campaigns: real sends over campaign_sends + campaign-run, saved segments.
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
    <div className="row g-4">
      <div className="col-lg-7">
        <h2 className="fz-font-lg fw-600 mb-3">Campaigns</h2>

        <form onSubmit={addCampaign} className="bg-neutral-0 rounded-4 p-3 border-100 mb-3">
          <div className="row g-2">
            <div className="col-md-5">
              <label className="form-label fz-font-sm fw-500 neutral-500 mb-1" htmlFor="mk-c-name">Campaign name</label>
              <input id="mk-c-name" className="form-control rounded-3" value={cForm.name} onChange={(e) => setCForm({ ...cForm, name: e.target.value })} required />
            </div>
            <div className="col-md-3">
              <label className="form-label fz-font-sm fw-500 neutral-500 mb-1" htmlFor="mk-c-channel">Channel</label>
              <select id="mk-c-channel" className="form-select rounded-3" value={cForm.channel} onChange={(e) => setCForm({ ...cForm, channel: e.target.value as "email" | "sms" })}>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label fz-font-sm fw-500 neutral-500 mb-1" htmlFor="mk-c-audience">Audience</label>
              <select id="mk-c-audience" className="form-select rounded-3" value={cForm.audience} onChange={(e) => setCForm({ ...cForm, audience: e.target.value })}>
                <option value="all">All contacts</option>
                {segments.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.contact_ids?.length ?? 0})</option>)}
              </select>
            </div>
            <div className="col-12">
              <label className="form-label fz-font-sm fw-500 neutral-500 mb-1" htmlFor="mk-c-subject">Subject</label>
              <input id="mk-c-subject" className="form-control rounded-3" value={cForm.subject} onChange={(e) => setCForm({ ...cForm, subject: e.target.value })} />
            </div>
            <div className="col-12">
              <label className="form-label fz-font-sm fw-500 neutral-500 mb-1" htmlFor="mk-c-body">Body</label>
              <textarea id="mk-c-body" className="form-control rounded-3" rows={5} value={cForm.body} onChange={(e) => setCForm({ ...cForm, body: e.target.value })} />
            </div>
            <div className="col-12 d-flex flex-wrap align-items-center gap-2">
              <button type="submit" className="btn btn-dark rounded-3 px-4 text-nowrap flex-shrink-0">Create campaign</button>
              <span className="fz-font-sm neutral-500">Every marketing email automatically includes an unsubscribe footer.</span>
            </div>
          </div>
        </form>

        {sendPrep && (
          <div className="bg-neutral-0 rounded-4 p-3 border-100 mb-3" style={{ boxShadow: "inset 3px 0 0 #212529" }} role="status">
            <div className="fw-600 mb-1">
              Send &quot;{sendPrep.campaign.subject || sendPrep.campaign.name}&quot; to {sendPrep.eligible.length} contact{sendPrep.eligible.length === 1 ? "" : "s"} via {sendPrep.campaign.channel}
            </div>
            <div className="fz-font-sm neutral-500 mb-2">
              {sendPrep.audienceLabel} · {sendPrep.skipped} skipped (no {sendPrep.campaign.channel === "email" ? "email address" : "phone number"} or opted out)
            </div>
            {sendPrep.campaign.body
              ? <div className="p-2 bg-neutral-50 rounded-3 fz-font-sm neutral-700 mb-2" style={{ whiteSpace: "pre-wrap", maxHeight: 180, overflowY: "auto" }}>{sendPrep.campaign.body}</div>
              : <div className="fz-font-sm text-danger mb-2">This campaign has no body — it will send empty.</div>}
            <div className="d-flex flex-wrap gap-2">
              <button type="button" className="btn btn-dark btn-sm rounded-pill px-3 text-nowrap" onClick={confirmSend} disabled={sending || sendPrep.eligible.length === 0}>{sending ? "Queuing…" : `Confirm send to ${sendPrep.eligible.length}`}</button>
              <button type="button" className="btn btn-outline-secondary btn-sm rounded-pill px-3 text-nowrap" onClick={() => setSendPrep(null)} disabled={sending}>Cancel</button>
            </div>
          </div>
        )}

        {campaigns.length === 0 ? (
          <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500">No campaigns yet.</div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {campaigns.map((c) => (
              <div key={c.id} className="bg-neutral-0 rounded-4 p-3 border-100 d-flex flex-wrap align-items-center justify-content-between gap-2">
                <div style={{ minWidth: "12rem" }} className="flex-grow-1">
                  <div className="fw-600">{c.name} <span className="badge bg-neutral-100 neutral-700 fw-500 text-uppercase ms-1">{c.channel}</span></div>
                  <div className="fz-font-sm neutral-500">{statusLine(c)}</div>
                </div>
                <div className="d-flex align-items-center gap-2 flex-shrink-0">
                  <span className={`badge fw-500 text-capitalize ${CAMPAIGN_STYLE[c.status] ?? CAMPAIGN_STYLE.draft}`}>{c.status === "sending" ? "Sending…" : c.status}</span>
                  {(c.status === "draft" || c.status === "scheduled") && (
                    <button type="button" className="btn btn-dark btn-sm rounded-pill px-3" onClick={() => prepareSend(c)}>Send</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* AI helper sits below the operational surface, like Commerce. */}
        <div className="bg-neutral-0 rounded-4 p-3 border-100 mt-3">
          <h3 className="fz-font-sm fw-600 neutral-500 mb-1">✨ Generate campaign</h3>
          <p className="fz-font-sm neutral-500 mb-2">Writes draft copy into the campaign form above — you review and edit before anything is created.</p>
          <div className="row g-2">
            <div className="col-md-6">
              <label className="form-label fz-font-sm fw-500 neutral-500 mb-1" htmlFor="mk-g-goal">Goal</label>
              <input id="mk-g-goal" className="form-control rounded-3" placeholder="e.g. win back lapsed customers" value={genForm.goal} onChange={(e) => setGenForm({ ...genForm, goal: e.target.value })} />
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label fz-font-sm fw-500 neutral-500 mb-1" htmlFor="mk-g-channel">Channel</label>
              <select id="mk-g-channel" className="form-select rounded-3" value={genForm.channel} onChange={(e) => setGenForm({ ...genForm, channel: e.target.value })}>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
            </div>
            <div className="col-6 col-md-3 d-flex align-items-end">
              <button type="button" className="btn btn-dark w-100 rounded-3 text-nowrap" onClick={genCampaign} disabled={genLoading}>{genLoading ? "Writing…" : "Generate"}</button>
            </div>
          </div>
        </div>
      </div>

      <div className="col-lg-5">
        <h2 className="fz-font-lg fw-600 mb-3">Segments</h2>

        {segments.length === 0 ? (
          <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500 fz-font-md">No saved segments yet — build one with AI below, then target it from the campaign form.</div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {segments.map((s) => (
              <div key={s.id} className="bg-neutral-0 rounded-4 p-3 border-100 d-flex flex-wrap align-items-center justify-content-between gap-2">
                <div style={{ minWidth: "10rem" }} className="flex-grow-1">
                  <div className="fw-600">{s.name}</div>
                  <div className="fz-font-sm neutral-500">{s.contact_ids?.length ?? 0} contacts · {s.criteria}</div>
                </div>
                <button type="button" className="btn btn-link btn-sm p-0 text-danger text-decoration-none ops-tap flex-shrink-0" onClick={() => removeSegment(s)}>Delete</button>
              </div>
            ))}
          </div>
        )}

        <div className="bg-neutral-0 rounded-4 p-3 border-100 mt-3">
          <h3 className="fz-font-sm fw-600 neutral-500 mb-1">✨ AI audience builder</h3>
          <label className="form-label fz-font-sm fw-500 neutral-500 mb-1" htmlFor="mk-s-desc">Describe the audience</label>
          <div className="d-flex flex-wrap gap-2">
            <input id="mk-s-desc" className="form-control rounded-3 flex-grow-1" style={{ minWidth: "12rem" }} placeholder="e.g. high-value customers at churn risk" value={segDesc} onChange={(e) => setSegDesc(e.target.value)} />
            <button type="button" className="btn btn-dark rounded-3 px-3 text-nowrap flex-shrink-0" onClick={runSegment} disabled={segLoading}>{segLoading ? "Building…" : "Build"}</button>
          </div>
          {seg && (
            <div className="mt-3 pt-3 border-top">
              <div className="fz-font-md neutral-700 mb-2">
                <span className="fw-600">{seg.criteria}</span> — {seg.count} contacts. <span className="neutral-500">{seg.rationale}</span>
              </div>
              <label className="form-label fz-font-sm fw-500 neutral-500 mb-1" htmlFor="mk-s-name">Segment name</label>
              <div className="d-flex flex-wrap gap-2">
                <input id="mk-s-name" className="form-control rounded-3 flex-grow-1" style={{ minWidth: "12rem" }} placeholder="Segment name" value={segName} onChange={(e) => setSegName(e.target.value)} />
                <button type="button" className="btn btn-dark rounded-3 px-3 text-nowrap flex-shrink-0" onClick={saveSegment}>Save segment</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Automations: recipes, editable email templates, edit/delete, failure badges.
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
    <div className="row g-4">
      <div className="col-12">
        <h2 className="fz-font-lg fw-600 mb-3">Recipes</h2>
        <div className="row g-3">
          {recipeDefs(businessName).map((r) => (
            <div key={r.key} className="col-md-4">
              <div className="bg-neutral-0 rounded-4 p-3 border-100 h-100 d-flex flex-column">
                <h3 className="fz-font-md fw-600 mb-1">{r.title}</h3>
                <div className="fz-font-sm neutral-500 mb-2 flex-grow-1">{r.desc}</div>
                <div>
                  <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-3 text-nowrap" onClick={() => addRecipe(r)} disabled={busyRecipe === r.key}>
                    {busyRecipe === r.key ? "Adding…" : "Add automation"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="col-lg-6">
        <h2 className="fz-font-lg fw-600 mb-3">{editingId ? "Edit automation" : "New automation"}</h2>
        <form onSubmit={submit} className="bg-neutral-0 rounded-4 p-3 border-100">
          <div className="row g-2">
            <div className="col-12">
              <label className="form-label fz-font-sm fw-500 neutral-500 mb-1" htmlFor="mk-a-name">Automation name</label>
              <input id="mk-a-name" className="form-control rounded-3" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="col-6">
              <label className="form-label fz-font-sm fw-500 neutral-500 mb-1" htmlFor="mk-a-trigger">Trigger</label>
              <select id="mk-a-trigger" className="form-select rounded-3" value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value as AutomationTrigger })}>
                {TRIGGERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="col-6">
              <label className="form-label fz-font-sm fw-500 neutral-500 mb-1" htmlFor="mk-a-action">Action</label>
              <select id="mk-a-action" className="form-select rounded-3" value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value as AutomationAction })}>
                {ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
            {form.action === "send_email" && (
              <>
                <div className="col-12">
                  <label className="form-label fz-font-sm fw-500 neutral-500 mb-1" htmlFor="mk-a-subject">Email subject</label>
                  <input id="mk-a-subject" className="form-control rounded-3" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
                </div>
                <div className="col-12">
                  <label className="form-label fz-font-sm fw-500 neutral-500 mb-1" htmlFor="mk-a-body">Email body</label>
                  <textarea id="mk-a-body" className="form-control rounded-3" rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
                  <div className="fz-font-sm neutral-500 mt-1">{PLACEHOLDER_HELP}</div>
                </div>
              </>
            )}
            <div className="col-12 d-flex flex-wrap gap-2">
              <button type="submit" className="btn btn-dark rounded-3 px-4 text-nowrap">{editingId ? "Save changes" : "Add automation"}</button>
              {editingId && <button type="button" className="btn btn-outline-secondary rounded-3 px-3 text-nowrap" onClick={() => { setEditingId(null); setForm(blank); }}>Cancel</button>}
            </div>
          </div>
        </form>
      </div>

      <div className="col-lg-6">
        <h2 className="fz-font-lg fw-600 mb-3">Your automations</h2>
        {automations.length === 0 ? (
          <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500">No automations yet — try a recipe above.</div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {automations.map((a) => {
              const trig = TRIGGERS.find((t) => t.value === a.trigger)?.label ?? a.trigger;
              const act = ACTIONS.find((x) => x.value === a.action)?.label ?? a.action;
              return (
                <div key={a.id} className="bg-neutral-0 rounded-4 p-3 border-100 d-flex align-items-center justify-content-between gap-2 flex-wrap">
                  <div style={{ minWidth: "12rem" }} className="flex-grow-1">
                    <div className="fw-600">
                      {a.name}
                      {lastRunFailed.get(a.id) && <span className="badge bg-danger-subtle text-danger fw-500 ms-2">Last run failed</span>}
                    </div>
                    <div className="fz-font-sm neutral-500">When {trig} → {act}{a.config?.subject ? ` · "${a.config.subject}"` : ""}</div>
                  </div>
                  <div className="d-flex align-items-center gap-3 flex-shrink-0">
                    <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none ops-tap" onClick={() => startEdit(a)}>Edit</button>
                    <button type="button" className="btn btn-link btn-sm p-0 text-danger text-decoration-none ops-tap" onClick={() => remove(a)}>Delete</button>
                    <div className="form-check form-switch m-0">
                      <input className="form-check-input" type="checkbox" aria-label={`${a.name} active`} checked={a.active} onChange={async (e) => { const ok = await reportMutation(toggleAutomation(a.id, e.target.checked), e.target.checked ? "Automation turned on." : "Automation paused."); if (ok) reload(); }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4">
          <h3 className="fz-font-md fw-600 mb-2">Automation runs</h3>
          {runs.length === 0 ? (
            <p className="fz-font-sm neutral-500 mb-0">Nothing yet. Runs start on their own whenever a trigger fires — usually within a few minutes.</p>
          ) : (
            <div className="d-flex flex-column gap-1">
              {runs.slice(0, 8).map((r) => (
                <div key={r.id} className="d-flex flex-wrap align-items-center justify-content-between fz-font-sm gap-2">
                  <span className="neutral-700">{r.automations?.name ?? "Automation"} · {r.trigger.replace("_", " ")} · {new Date(r.created_at).toLocaleString()}</span>
                  <span className={`badge fw-500 text-capitalize flex-shrink-0 ${RUN_STYLE[r.status] ?? RUN_STYLE.pending}`}>{r.status}</span>
                </div>
              ))}
            </div>
          )}
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
    <div className="row g-4">
      <div className="col-lg-6">
        <h2 className="fz-font-lg fw-600 mb-3">Outreach campaigns</h2>
        <form onSubmit={create} className="bg-neutral-0 rounded-4 p-3 border-100 mb-3">
          <div className="row g-2">
            <div className="col-12">
              <label className="form-label fz-font-sm fw-500 neutral-500 mb-1" htmlFor="mk-o-name">Campaign name</label>
              <input id="mk-o-name" className="form-control rounded-3" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="col-6">
              <label className="form-label fz-font-sm fw-500 neutral-500 mb-1" htmlFor="mk-o-type">Type</label>
              <select id="mk-o-type" className="form-select rounded-3" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {OUTBOUND_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="col-6">
              <label className="form-label fz-font-sm fw-500 neutral-500 mb-1" htmlFor="mk-o-channel">Channel</label>
              <select id="mk-o-channel" className="form-select rounded-3" value={form.channel_pref} onChange={(e) => setForm({ ...form, channel_pref: e.target.value })}>
                <option value="call">Call</option>
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
              </select>
            </div>
            <div className="col-12">
              <label className="form-label fz-font-sm fw-500 neutral-500 mb-1" htmlFor="mk-o-goal">Goal</label>
              <input id="mk-o-goal" className="form-control rounded-3" placeholder="e.g. rebook lapsed customers" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} />
            </div>
            <div className="col-12"><button type="submit" className="btn btn-dark rounded-3 px-4 text-nowrap">Create campaign</button></div>
          </div>
        </form>

        <div className="bg-neutral-0 rounded-4 p-3 border-100 mb-2">
          <label className="form-label fz-font-sm fw-500 neutral-500 mb-1" htmlFor="mk-o-audience">Audience (optional — AI-matched before queueing)</label>
          <div className="d-flex flex-wrap gap-2">
            <input
              id="mk-o-audience"
              className="form-control rounded-3 flex-grow-1"
              style={{ minWidth: "12rem" }}
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder={`e.g. "customers who haven't ordered in 60 days" — empty = all ${contacts.length} contacts`}
            />
            <button type="button" className="btn btn-outline-dark rounded-3 px-3 text-nowrap flex-shrink-0" onClick={matchAudience} disabled={matching || !filterActive}>{matching ? "Matching…" : "Match"}</button>
          </div>
          <div role="status" aria-live="polite">
            {filterActive && !filterResolved && <p className="fz-font-sm neutral-500 mt-1 mb-0">Tap Match to see who this will reach — until then the send buttons stay off.</p>}
            {filterResolved && <p className="fz-font-sm neutral-700 mt-1 mb-0">Matched <span className="fw-600">{matched.ids.length}</span> contact(s) for &quot;{matched.desc}&quot;.</p>}
          </div>
        </div>

        {outbound.length === 0 ? (
          <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500">No outreach campaigns yet.</div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {outbound.map((c) => (
              <div key={c.id} className="bg-neutral-0 rounded-4 p-3 border-100 d-flex flex-wrap align-items-center justify-content-between gap-2">
                <div style={{ minWidth: "12rem" }} className="flex-grow-1">
                  <div className="fw-600">{c.name} <span className="badge bg-neutral-100 neutral-700 fw-500 ms-1 text-capitalize">{c.type.replace("_", " ")}</span></div>
                  <div className="fz-font-sm neutral-500">{c.channel_pref} · {c.goal || "—"}</div>
                </div>
                <button
                  type="button"
                  className="btn btn-outline-dark btn-sm rounded-pill px-3 text-nowrap flex-shrink-0"
                  onClick={() => queue(c)}
                  disabled={queuing === c.id || (filterActive && !filterResolved)}
                >
                  {queuing === c.id ? "Queuing…" : targetCount === null ? "Match audience first" : `Queue to ${targetCount}`}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4">
          <h3 className="fz-font-md fw-600 mb-2">Task queue</h3>
          {tasks.length === 0 ? (
            <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500 fz-font-md">No outreach yet. Once a campaign goes out, each call or message shows up here with its result. Booking reminders appear here automatically too.</div>
          ) : (
            // No `overflow-hidden` here: it is !important and would clip the
            // horizontal scroll `.ops-scroll-x` provides on phones.
            <div className="bg-neutral-0 rounded-4 border-100 ops-scroll-x">
              <table className="table mb-0 align-middle" style={{ minWidth: 520 }}>
                <tbody>
                  {tasks.map((t) => (
                    <tr key={t.id}>
                      <td className="py-2 ps-4">
                        <div className="fw-600 fz-font-md">{t.customer_name || "Contact"}</div>
                        <div className="fz-font-sm neutral-500 text-capitalize">{t.type.replace("_", " ")} · {t.channel}{t.outcome ? ` · ${t.outcome}` : ""}</div>
                      </td>
                      <td className="py-2 fz-font-sm neutral-500 text-nowrap">{new Date(t.created_at).toLocaleString()}</td>
                      <td className="py-2 pe-4 text-end"><span className={`badge fw-500 text-capitalize ${TASK_STYLE[t.status] ?? TASK_STYLE.queued}`}>{t.status.replace("_", " ")}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
    <div className="d-flex flex-column gap-4">
      <div>
        <h2 className="fz-font-lg fw-600 mb-3">Proactive briefings &amp; tasks</h2>
        <div className="bg-neutral-0 rounded-4 p-3 border-100">
          <p className="fz-font-sm neutral-500 mb-2">Have the AI run on a schedule — a briefing it emails you, or a task it performs.</p>
          <form onSubmit={create} className="d-flex flex-column gap-2">
            <div>
              <label className="form-label fz-font-sm fw-500 neutral-500 mb-1" htmlFor="mk-p-name">Name</label>
              <input id="mk-p-name" className="form-control rounded-3" placeholder="e.g. Morning briefing" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="row g-2">
              <div className="col-6">
                <label className="form-label fz-font-sm fw-500 neutral-500 mb-1" htmlFor="mk-p-action">What</label>
                <select id="mk-p-action" className="form-select rounded-3" value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value as typeof form.action })}><option value="ai_briefing">AI briefing</option><option value="ai_task">AI task</option></select>
              </div>
              <div className="col-6">
                <label className="form-label fz-font-sm fw-500 neutral-500 mb-1" htmlFor="mk-p-schedule">When</label>
                <select id="mk-p-schedule" className="form-select rounded-3" value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value as typeof form.schedule })}><option value="schedule_daily">Daily</option><option value="schedule_weekly">Weekly</option></select>
              </div>
            </div>
            <div>
              <label className="form-label fz-font-sm fw-500 neutral-500 mb-1" htmlFor="mk-p-instruction">Instruction</label>
              <textarea id="mk-p-instruction" className="form-control rounded-3" rows={3} placeholder={form.action === "ai_task" ? "What should the AI do? (e.g. draft a blog post about this week's new arrivals)" : "What to include (optional — defaults to a full business briefing)"} value={form.instruction} onChange={(e) => setForm({ ...form, instruction: e.target.value })} />
            </div>
            <div>
              <label className="form-label fz-font-sm fw-500 neutral-500 mb-1" htmlFor="mk-p-channel">Deliver to</label>
              <select id="mk-p-channel" className="form-select rounded-3" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value as typeof form.channel })}><option value="email">Email it to me</option><option value="dashboard">Dashboard only</option></select>
            </div>
            <button type="submit" className="btn btn-dark rounded-3 text-nowrap" disabled={busy}>{busy ? "Creating…" : "Create automation"}</button>
          </form>
        </div>
      </div>

      <div>
        <h3 className="fz-font-md fw-600 mb-2">Your scheduled AI automations</h3>
        {autos.length === 0 ? (
          <div className="bg-neutral-0 rounded-4 p-4 border-100 neutral-500 fz-font-md">None yet. Try a daily &quot;Morning briefing&quot;.</div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {autos.map((a) => (
              <div key={a.id} className="bg-neutral-0 rounded-4 p-3 border-100">
                <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
                  <div style={{ minWidth: "12rem" }} className="flex-grow-1">
                    <div className="fw-600">{a.name}</div>
                    <div className="fz-font-sm neutral-500">{actionLabel(a.action)} · {scheduleLabel(a.trigger)}{a.last_run_at ? ` · last run ${new Date(a.last_run_at).toLocaleString()}` : ""}</div>
                  </div>
                  <div className="d-flex align-items-center gap-3 flex-shrink-0">
                    <button type="button" className="btn btn-dark btn-sm rounded-pill px-3 text-nowrap" onClick={() => run(a)} disabled={running === a.id}>{running === a.id ? "Running…" : "Run now"}</button>
                    <div className="form-check form-switch m-0"><input className="form-check-input" type="checkbox" aria-label={`${a.name} active`} checked={a.active} onChange={async (e) => { const ok = await reportMutation(toggleAiAutomation(a.id, e.target.checked), e.target.checked ? "Automation turned on." : "Automation paused."); if (ok) reload(); }} /></div>
                    <button type="button" className="btn btn-link btn-sm p-0 text-danger text-decoration-none ops-tap" onClick={() => remove(a)}>Remove</button>
                  </div>
                </div>
                {output?.id === a.id && <div className="mt-2 p-2 bg-neutral-50 rounded-3 fz-font-sm neutral-900" style={{ whiteSpace: "pre-wrap" }}>{output.text}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="fz-font-md fw-600 mb-2">Recent AI runs</h3>
        {runs.length === 0 ? (
          <p className="neutral-500 fz-font-md mb-0">No runs yet.</p>
        ) : (
          <div className="d-flex flex-column gap-2">
            {runs.slice(0, 6).map((r) => (
              <details key={r.id} className="bg-neutral-0 rounded-3 border-100 p-2">
                <summary className="fz-font-sm neutral-700" style={{ cursor: "pointer" }}>
                  {new Date(r.created_at).toLocaleString()}
                  <span className={`badge fw-500 text-capitalize ms-2 ${RUN_STYLE[r.status] ?? RUN_STYLE.pending}`}>{r.status}</span>
                  <span className="neutral-500"> — {r.output.slice(0, 80)}{r.output.length > 80 ? "…" : ""}</span>
                </summary>
                <div className="fz-font-sm neutral-700 mt-2" style={{ whiteSpace: "pre-wrap" }}>{r.output}</div>
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
