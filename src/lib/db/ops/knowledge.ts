import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";
import { drainEmbeddings } from "@/lib/db/ops/ai";

// Owner-curated knowledge the AI agent retrieves (RAG). Saving a doc enqueues it
// for embedding via the knowledge_docs trigger; we nudge the embed worker too.
export type KnowledgeDoc = { id: string; title: string; content: string; created_at: string };

export async function listKnowledge(orgId: string): Promise<{ data: KnowledgeDoc[]; error: string | null }> {
  const { data, error } = await supabase
    .from("knowledge_docs")
    .select("id, title, content, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  return { data: (data as KnowledgeDoc[] | null) ?? [], error: friendlyError(error?.message) };
}

export async function addKnowledge(orgId: string, title: string, content: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("knowledge_docs").insert({ organization_id: orgId, title, content });
  if (!error) drainEmbeddings();
  return { error: friendlyError(error?.message) };
}

export async function updateKnowledge(id: string, title: string, content: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("knowledge_docs").update({ title, content }).eq("id", id);
  if (!error) drainEmbeddings();
  return { error: friendlyError(error?.message) };
}

export async function removeKnowledge(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("knowledge_docs").delete().eq("id", id);
  return { error: friendlyError(error?.message) };
}
