import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";

export type TicketStatus = "open" | "pending" | "resolved" | "closed";
export type TicketPriority = "low" | "normal" | "high";
export type Ticket = {
  id: string;
  subject: string;
  customer_name: string;
  customer_email: string;
  status: TicketStatus;
  priority: TicketPriority;
  ai_deflected: boolean;
  created_at: string;
  sentiment: string | null;
  category: string | null;
  ai_summary: string | null;
};
export type TicketMessage = { id: string; author: "customer" | "agent" | "ai"; body: string; created_at: string };

const TICKET_SELECT =
  "id, subject, customer_name, customer_email, status, priority, ai_deflected, created_at, sentiment, category, ai_summary";

export async function listTickets(orgId: string): Promise<{ data: Ticket[]; error: string | null }> {
  const { data, error } = await supabase
    .from("tickets")
    .select(TICKET_SELECT)
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  return { data: (data as Ticket[] | null) ?? [], error: friendlyError(error?.message) };
}

export async function createTicket(
  orgId: string,
  input: { subject: string; customer_name: string; customer_email?: string; priority?: TicketPriority; message?: string },
): Promise<{ ticketId: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from("tickets")
    .insert({
      organization_id: orgId,
      subject: input.subject.trim(),
      customer_name: input.customer_name.trim(),
      customer_email: input.customer_email?.trim() ?? "",
      priority: input.priority ?? "normal",
    })
    .select("id")
    .single();
  if (error || !data) return { ticketId: null, error: friendlyError(error?.message) };

  const ticketId = (data as { id: string }).id;
  if (input.message?.trim()) {
    await supabase.from("ticket_messages").insert({
      organization_id: orgId,
      ticket_id: ticketId,
      author: "customer",
      body: input.message.trim(),
    });
  }
  return { ticketId, error: null };
}

export async function getTicketMessages(ticketId: string): Promise<{ data: TicketMessage[]; error: string | null }> {
  const { data, error } = await supabase
    .from("ticket_messages")
    .select("id, author, body, created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });
  return { data: (data as TicketMessage[] | null) ?? [], error: friendlyError(error?.message) };
}

export async function addTicketMessage(
  orgId: string,
  ticketId: string,
  author: "customer" | "agent" | "ai",
  body: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("ticket_messages")
    .insert({ organization_id: orgId, ticket_id: ticketId, author, body: body.trim() });
  return { error: friendlyError(error?.message) };
}

export async function setTicketStatus(
  id: string,
  status: TicketStatus,
  aiDeflected?: boolean,
): Promise<{ error: string | null }> {
  const patch: Record<string, unknown> = { status };
  if (aiDeflected !== undefined) patch.ai_deflected = aiDeflected;
  const { error } = await supabase.from("tickets").update(patch).eq("id", id);
  return { error: friendlyError(error?.message) };
}

/**
 * Draft an AI reply for a ticket via the `ai-helpdesk` Edge Function. The
 * function holds the model key, checks org access, and meters usage like the
 * main assistant. Returns suggested reply text for an agent to review/send.
 */
export async function draftAiReply(
  orgId: string,
  ticketId: string,
): Promise<{ reply: string | null; confidence: number; error: string | null }> {
  const { data, error } = await supabase.functions.invoke("ai-helpdesk", {
    body: { organizationId: orgId, ticketId },
  });
  if (error) {
    let serverMessage: string | null = null;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === "function") {
        const payload = await ctx.json();
        if (payload?.error) serverMessage = String(payload.error);
      }
    } catch {
      /* generic message below */
    }
    return { reply: null, confidence: 0, error: serverMessage ?? friendlyError(error.message) };
  }
  if (data?.error) return { reply: null, confidence: 0, error: String(data.error) };
  return { reply: data?.reply ?? null, confidence: data?.confidence ?? 0.5, error: null };
}
