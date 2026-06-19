import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";

// Promo / discount codes (per business). Owners manage them here; storefronts
// validate + apply at checkout (server-authoritative via app_place_order).
export type PromoKind = "percent" | "fixed";
export type Promo = {
  id: string;
  code: string;
  kind: PromoKind;
  value: number;       // percent (0-100) or fixed cents
  min_cents: number;
  active: boolean;
  expires_at: string | null;
  created_at: string;
};

const SELECT = "id, code, kind, value, min_cents, active, expires_at, created_at";

export async function listPromos(orgId: string): Promise<{ data: Promo[]; error: string | null }> {
  const { data, error } = await supabase.from("promo_codes").select(SELECT).eq("organization_id", orgId).order("created_at", { ascending: false });
  return { data: (data as Promo[] | null) ?? [], error: friendlyError(error?.message) };
}

export async function createPromo(
  orgId: string,
  input: { code: string; kind: PromoKind; value: number; min_cents?: number; expires_at?: string | null },
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("promo_codes").insert({
    organization_id: orgId,
    code: input.code.trim().toUpperCase(),
    kind: input.kind,
    value: input.value,
    min_cents: input.min_cents ?? 0,
    expires_at: input.expires_at || null,
    active: true,
  });
  return { error: friendlyError(error?.message) };
}

export async function updatePromo(id: string, patch: Partial<Pick<Promo, "active">>): Promise<{ error: string | null }> {
  const { error } = await supabase.from("promo_codes").update(patch).eq("id", id);
  return { error: friendlyError(error?.message) };
}

export async function deletePromo(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("promo_codes").delete().eq("id", id);
  return { error: friendlyError(error?.message) };
}
