import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";

// Proactive + AI automations: scheduled briefings and tasks the AI runs on its own
// (extends the existing automations engine with schedule triggers + AI actions).
export type Automation = {
  id: string;
  name: string;
  trigger: string;
  action: string;
  config: { instruction?: string; channel?: string };
  active: boolean;
  runs: number;
  last_run_at: string | null;
  created_at: string;
};
export type AutomationRun = { id: string; automation_id: string | null; status: string; output: string; created_at: string };

const AI_ACTIONS = ["ai_briefing", "ai_task"];

export async function listAiAutomations(orgId: string): Promise<{ data: Automation[]; error: string | null }> {
  const { data, error } = await supabase
    .from("automations")
    .select("id, name, trigger, action, config, active, runs, last_run_at, created_at")
    .eq("organization_id", orgId)
    .in("action", AI_ACTIONS)
    .order("created_at", { ascending: false });
  return { data: (data as Automation[] | null) ?? [], error: friendlyError(error?.message) };
}

export async function createAiAutomation(
  orgId: string,
  input: { name: string; schedule: "schedule_daily" | "schedule_weekly"; action: "ai_briefing" | "ai_task"; instruction: string; channel: "email" | "dashboard" },
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("automations").insert({
    organization_id: orgId,
    name: input.name,
    trigger: input.schedule,
    action: input.action,
    config: { instruction: input.instruction, channel: input.channel },
    active: true,
  });
  return { error: friendlyError(error?.message) };
}

export async function toggleAutomation(id: string, active: boolean): Promise<{ error: string | null }> {
  const { error } = await supabase.from("automations").update({ active }).eq("id", id);
  return { error: friendlyError(error?.message) };
}

export async function removeAutomation(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("automations").delete().eq("id", id);
  return { error: friendlyError(error?.message) };
}

export async function runAutomation(automationId: string): Promise<{ output: string | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke("automation-run", { body: { automationId } });
  if (error) {
    let msg = error.message;
    try {
      const ctx = await (error as { context?: Response }).context?.json?.();
      if (ctx?.error) msg = ctx.error;
    } catch { /* keep generic */ }
    return { output: null, error: friendlyError(msg) };
  }
  return { output: (data as { output?: string } | null)?.output ?? null, error: null };
}

export async function listAutomationRuns(orgId: string): Promise<{ data: AutomationRun[]; error: string | null }> {
  const { data, error } = await supabase
    .from("automation_runs")
    .select("id, automation_id, status, output, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(15);
  return { data: (data as AutomationRun[] | null) ?? [], error: friendlyError(error?.message) };
}
