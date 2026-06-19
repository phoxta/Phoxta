import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";

/** A chat thread belonging to a business. */
export type AiConversation = {
  id: string;
  organization_id: string;
  title: string;
  updated_at: string;
};

/** One turn in a conversation. */
export type AiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

/** Conversations for a business, most recent first (RLS scopes to members). */
export async function listConversations(
  orgId: string,
): Promise<{ data: AiConversation[]; error: string | null }> {
  const { data, error } = await supabase
    .from("ai_conversations")
    .select("id, organization_id, title, updated_at")
    .eq("organization_id", orgId)
    .order("updated_at", { ascending: false });
  return { data: (data as AiConversation[] | null) ?? [], error: friendlyError(error?.message) };
}

/** Full transcript of one conversation, oldest first. */
export async function listMessages(
  conversationId: string,
): Promise<{ data: AiMessage[]; error: string | null }> {
  const { data, error } = await supabase
    .from("ai_messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  return { data: (data as AiMessage[] | null) ?? [], error: friendlyError(error?.message) };
}

/** Tokens this business has spent on the assistant this calendar month. */
export async function getMonthlyTokens(orgId: string): Promise<number> {
  const { data } = await supabase.rpc("app_org_ai_tokens_this_month", { p_org: orgId });
  return typeof data === "number" ? data : Number(data ?? 0);
}

export type AiUsageSummary = { orgId: string; orgName: string; tokens: number; costCents: number };

/** Assistant usage for the current calendar month, grouped per business.
 *  RLS scopes the underlying rows to businesses the user belongs to. */
export async function listAiUsageThisMonth(): Promise<{ data: AiUsageSummary[]; error: string | null }> {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("ai_usage")
    .select("organization_id, input_tokens, output_tokens, cost_cents, organizations(name)")
    .gte("created_at", monthStart.toISOString());
  if (error) return { data: [], error: friendlyError(error.message) };

  type Row = {
    organization_id: string;
    input_tokens: number;
    output_tokens: number;
    cost_cents: number;
    organizations: { name: string } | null;
  };
  const grouped = new Map<string, AiUsageSummary>();
  for (const r of (data as unknown as Row[] | null) ?? []) {
    const cur = grouped.get(r.organization_id) ?? {
      orgId: r.organization_id,
      orgName: r.organizations?.name ?? "Business",
      tokens: 0,
      costCents: 0,
    };
    cur.tokens += (r.input_tokens ?? 0) + (r.output_tokens ?? 0);
    cur.costCents += Number(r.cost_cents ?? 0);
    grouped.set(r.organization_id, cur);
  }
  return { data: [...grouped.values()].sort((a, b) => b.tokens - a.tokens), error: null };
}

export type AskResult = {
  reply: string | null;
  conversationId: string | null;
  error: string | null;
};

/**
 * Send a message to a business's assistant via the `ai-gateway` Edge Function.
 * The gateway holds the model key, checks access, meters usage and persists the
 * transcript; we just pass the user's session (functions.invoke attaches the
 * auth header automatically) and read back the reply.
 */
export async function askAssistant(
  orgId: string,
  message: string,
  conversationId?: string | null,
): Promise<AskResult> {
  const { data, error } = await supabase.functions.invoke("ai-gateway", {
    body: { organizationId: orgId, message, conversationId: conversationId ?? undefined },
  });

  if (error) {
    // The gateway returns a safe { error } body even on non-2xx; prefer it.
    let serverMessage: string | null = null;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === "function") {
        const payload = await ctx.json();
        if (payload?.error) serverMessage = String(payload.error);
      }
    } catch {
      /* fall through to a generic friendly message */
    }
    return { reply: null, conversationId: null, error: serverMessage ?? friendlyError(error.message) };
  }

  if (data?.error) {
    return { reply: null, conversationId: null, error: String(data.error) };
  }
  return {
    reply: data?.reply ?? null,
    conversationId: data?.conversationId ?? null,
    error: null,
  };
}
