import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";

// --- Campaigns -------------------------------------------------------------
export type CampaignStatus = "draft" | "scheduled" | "sent";
export type Campaign = {
  id: string;
  name: string;
  channel: "email" | "sms";
  subject: string;
  body: string;
  audience: string;
  status: CampaignStatus;
  scheduled_at: string | null;
  sent_at: string | null;
  recipients: number;
  created_at: string;
};

const CAMPAIGN_SELECT =
  "id, name, channel, subject, body, audience, status, scheduled_at, sent_at, recipients, created_at";

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

/** "Send" a campaign: mark sent and record the audience size (contact count). */
export async function sendCampaign(orgId: string, id: string): Promise<{ error: string | null }> {
  const { count } = await supabase
    .from("crm_contacts")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId);
  const { error } = await supabase
    .from("campaigns")
    .update({ status: "sent", sent_at: new Date().toISOString(), recipients: count ?? 0 })
    .eq("id", id);
  return { error: friendlyError(error?.message) };
}

export async function scheduleCampaign(id: string, scheduledAt: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("campaigns")
    .update({ status: "scheduled", scheduled_at: scheduledAt })
    .eq("id", id);
  return { error: friendlyError(error?.message) };
}

// --- Automations -----------------------------------------------------------
export type AutomationTrigger = "contact_created" | "order_paid" | "booking_created" | "ticket_created";
export type AutomationAction = "send_email" | "add_tag" | "create_task" | "notify";
export type Automation = {
  id: string;
  name: string;
  trigger: AutomationTrigger;
  action: AutomationAction;
  active: boolean;
  runs: number;
  created_at: string;
};

export async function listAutomations(orgId: string): Promise<{ data: Automation[]; error: string | null }> {
  const { data, error } = await supabase
    .from("automations")
    .select("id, name, trigger, action, active, runs, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  return { data: (data as Automation[] | null) ?? [], error: friendlyError(error?.message) };
}

export async function createAutomation(
  orgId: string,
  input: { name: string; trigger: AutomationTrigger; action: AutomationAction },
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("automations").insert({
    organization_id: orgId,
    name: input.name.trim(),
    trigger: input.trigger,
    action: input.action,
  });
  return { error: friendlyError(error?.message) };
}

export async function toggleAutomation(id: string, active: boolean): Promise<{ error: string | null }> {
  const { error } = await supabase.from("automations").update({ active }).eq("id", id);
  return { error: friendlyError(error?.message) };
}
