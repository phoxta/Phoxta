import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";

// --- Campaigns -------------------------------------------------------------
export type CampaignStatus = "draft" | "scheduled" | "sending" | "sent";
export type Campaign = {
  id: string;
  name: string;
  channel: "email" | "sms";
  subject: string;
  body: string;
  /** "all" or a saved segment id. */
  audience: string;
  status: CampaignStatus;
  scheduled_at: string | null;
  sent_at: string | null;
  recipients: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
};

const CAMPAIGN_SELECT =
  "id, name, channel, subject, body, audience, status, scheduled_at, sent_at, recipients, sent_count, failed_count, created_at";

export async function listCampaigns(orgId: string): Promise<{ data: Campaign[]; error: string | null }> {
  const { data, error } = await supabase
    .from("campaigns")
    .select(CAMPAIGN_SELECT)
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  return { data: (data as Campaign[] | null) ?? [], error: friendlyError(error?.message) };
}

export async function createCampaign(
  orgId: string,
  input: { name: string; channel?: "email" | "sms"; subject?: string; body?: string; audience?: string },
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("campaigns").insert({
    organization_id: orgId,
    name: input.name.trim(),
    channel: input.channel ?? "email",
    subject: input.subject ?? "",
    body: input.body ?? "",
    audience: input.audience ?? "all",
    status: "draft",
  });
  return { error: friendlyError(error?.message) };
}

export async function scheduleCampaign(id: string, scheduledAt: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("campaigns")
    .update({ status: "scheduled", scheduled_at: scheduledAt })
    .eq("id", id);
  return { error: friendlyError(error?.message) };
}

// --- Recipients + real send ------------------------------------------------
/** Minimal contact shape for computing campaign eligibility client-side. */
export type MarketingContact = {
  id: string;
  name: string;
  email: string;
  phone: string;
  email_opt_out: boolean;
  sms_opt_out: boolean;
};

export async function listMarketingContacts(orgId: string): Promise<{ data: MarketingContact[]; error: string | null }> {
  const { data, error } = await supabase
    .from("crm_contacts")
    .select("id, name, email, phone, email_opt_out, sms_opt_out")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  return { data: (data as MarketingContact[] | null) ?? [], error: friendlyError(error?.message) };
}

/**
 * Real campaign send: queue one campaign_sends row per eligible recipient
 * (status "pending"), flip the campaign to "sending", then kick the
 * campaign-run worker to drain them. Unsubscribe footers are appended
 * server-side to every marketing email.
 */
export async function queueCampaignSend(
  orgId: string,
  campaign: { id: string; channel: "email" | "sms" },
  recipients: { contact_id: string; address: string }[],
): Promise<{ error: string | null }> {
  if (recipients.length === 0) return { error: "No eligible recipients." };
  const rows = recipients.map((r) => ({
    organization_id: orgId,
    campaign_id: campaign.id,
    contact_id: r.contact_id,
    channel: campaign.channel,
    address: r.address,
    status: "pending",
  }));
  const { error: insErr } = await supabase.from("campaign_sends").insert(rows);
  if (insErr) return { error: friendlyError(insErr.message) };
  const { error: updErr } = await supabase
    .from("campaigns")
    .update({ status: "sending", recipients: recipients.length })
    .eq("id", campaign.id);
  if (updErr) return { error: friendlyError(updErr.message) };
  // Kick the drainer — if this invoke fails the rows stay pending and the
  // cron-driven worker picks them up on its next pass.
  //
  // It drains fifty a call and answers `remaining_batch_full` when there were
  // more. One call used to be made and the flag ignored, so a campaign to 300
  // people sent fifty now and the rest at five-minute intervals as the cron
  // reached them — which looked, from the console, like a send that stopped.
  // Loop while it says there is more, bounded so a worker that always answers
  // "more" cannot keep a browser tab calling it for ever. Still fire-and-forget:
  // the rows are queued and the cron is the backstop either way.
  void (async () => {
    for (let i = 0; i < CAMPAIGN_DRAIN_MAX_CALLS; i++) {
      const { data, error } = await supabase.functions.invoke("campaign-run", { body: { orgId } });
      if (error || !(data as { remaining_batch_full?: boolean } | null)?.remaining_batch_full) break;
    }
  })().catch(() => {});
  return { error: null };
}

/** 20 × 50 = a thousand recipients before the cron takes over. */
const CAMPAIGN_DRAIN_MAX_CALLS = 20;

// --- Segments --------------------------------------------------------------
export type Segment = {
  id: string;
  name: string;
  criteria: string;
  contact_ids: string[];
  created_at: string;
};

export async function listSegments(orgId: string): Promise<{ data: Segment[]; error: string | null }> {
  const { data, error } = await supabase
    .from("segments")
    .select("id, name, criteria, contact_ids, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  return { data: (data as Segment[] | null) ?? [], error: friendlyError(error?.message) };
}

export async function createSegment(
  orgId: string,
  input: { name: string; criteria: string; contact_ids: string[] },
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("segments").insert({
    organization_id: orgId,
    name: input.name.trim(),
    criteria: input.criteria,
    contact_ids: input.contact_ids,
  });
  return { error: friendlyError(error?.message) };
}

export async function deleteSegment(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("segments").delete().eq("id", id);
  return { error: friendlyError(error?.message) };
}

// --- Automations -----------------------------------------------------------
export type AutomationTrigger = "contact_created" | "order_paid" | "booking_created" | "ticket_created";
export type AutomationAction = "send_email" | "add_tag" | "create_task" | "notify";
/** send_email templates live in config — {{name}} and {{business}} placeholders. */
export type AutomationConfig = { subject?: string; body?: string; tag?: string };
export type Automation = {
  id: string;
  name: string;
  trigger: AutomationTrigger;
  action: AutomationAction;
  config: AutomationConfig | null;
  active: boolean;
  runs: number;
  last_run_at: string | null;
  created_at: string;
};

/** Marketing automations only — AI briefings/tasks live in the AI Outreach tab. */
export async function listAutomations(orgId: string): Promise<{ data: Automation[]; error: string | null }> {
  const { data, error } = await supabase
    .from("automations")
    .select("id, name, trigger, action, config, active, runs, last_run_at, created_at")
    .eq("organization_id", orgId)
    .not("action", "in", "(ai_briefing,ai_task)")
    .order("created_at", { ascending: false });
  return { data: (data as Automation[] | null) ?? [], error: friendlyError(error?.message) };
}

export async function createAutomation(
  orgId: string,
  input: { name: string; trigger: AutomationTrigger; action: AutomationAction; config?: AutomationConfig; active?: boolean },
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("automations").insert({
    organization_id: orgId,
    name: input.name.trim(),
    trigger: input.trigger,
    action: input.action,
    config: input.config ?? {},
    ...(input.active === undefined ? {} : { active: input.active }),
  });
  return { error: friendlyError(error?.message) };
}

export async function updateAutomation(
  id: string,
  patch: { name?: string; trigger?: AutomationTrigger; action?: AutomationAction; config?: AutomationConfig },
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("automations").update(patch).eq("id", id);
  return { error: friendlyError(error?.message) };
}

export async function deleteAutomation(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("automations").delete().eq("id", id);
  return { error: friendlyError(error?.message) };
}

export async function toggleAutomation(id: string, active: boolean): Promise<{ error: string | null }> {
  const { error } = await supabase.from("automations").update({ active }).eq("id", id);
  return { error: friendlyError(error?.message) };
}

// --- Automation runs (with automation_id so failures can badge the parent) --
export type MarketingRun = {
  id: string;
  automation_id: string | null;
  trigger: string;
  status: "pending" | "running" | "succeeded" | "failed";
  error: string | null;
  created_at: string;
  automations: { name: string } | null;
};

export async function listMarketingRuns(orgId: string, limit = 25): Promise<{ data: MarketingRun[]; error: string | null }> {
  const { data, error } = await supabase
    .from("workflow_runs")
    .select("id, automation_id, trigger, status, error, created_at, automations(name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return { data: (data as unknown as MarketingRun[] | null) ?? [], error: friendlyError(error?.message) };
}
