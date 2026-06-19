import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";

// Per-tenant storefront content overrides (text + images), keyed by page path.
// Written by Studio's in-context editor; read + applied by the storefront at runtime
// (see businesses/*/src/lib/liveEdit.tsx). Slots are positional (document order).
export type PageSlots = { text?: Record<string, string>; img?: Record<string, string> };

export async function getPageContent(orgId: string, pagePath: string): Promise<{ slots: PageSlots; error: string | null }> {
  const { data, error } = await supabase
    .from("tenant_page_content")
    .select("slots")
    .eq("organization_id", orgId)
    .eq("page_path", pagePath)
    .maybeSingle();
  return { slots: ((data as { slots?: PageSlots } | null)?.slots ?? {}), error: friendlyError(error?.message) };
}

export async function savePageContent(orgId: string, pagePath: string, slots: PageSlots): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("tenant_page_content")
    .upsert({ organization_id: orgId, page_path: pagePath, slots, updated_at: new Date().toISOString() }, { onConflict: "organization_id,page_path" });
  return { error: friendlyError(error?.message) };
}
