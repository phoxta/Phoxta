import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";

export type ContactStage = "lead" | "prospect" | "customer" | "churned";
export type Contact = {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  stage: ContactStage;
  tags: string[];
  notes: string;
  value_cents: number;
  created_at: string;
  lead_score: number | null;
  churn_risk: number | null;
  ai_summary: string | null;
  scored_at: string | null;
};

const SELECT =
  "id, name, email, phone, company, stage, tags, notes, value_cents, created_at, lead_score, churn_risk, ai_summary, scored_at";

export async function listContacts(orgId: string): Promise<{ data: Contact[]; error: string | null }> {
  const { data, error } = await supabase
    .from("crm_contacts")
    .select(SELECT)
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  return { data: (data as Contact[] | null) ?? [], error: friendlyError(error?.message) };
}

export async function createContact(
  orgId: string,
  input: { name: string; email?: string; phone?: string; company?: string; stage?: ContactStage; value_cents?: number },
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("crm_contacts").insert({
    organization_id: orgId,
    name: input.name.trim(),
    email: input.email?.trim() ?? "",
    phone: input.phone?.trim() ?? "",
    company: input.company?.trim() ?? "",
    stage: input.stage ?? "lead",
    value_cents: input.value_cents ?? 0,
  });
  return { error: friendlyError(error?.message) };
}

export async function updateContactStage(id: string, stage: ContactStage): Promise<{ error: string | null }> {
  const { error } = await supabase.from("crm_contacts").update({ stage }).eq("id", id);
  return { error: friendlyError(error?.message) };
}

export async function deleteContact(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("crm_contacts").delete().eq("id", id);
  return { error: friendlyError(error?.message) };
}
