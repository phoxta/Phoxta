import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";

/** Mirrors the live `blueprints` table (marketplace catalog). */
export type Blueprint = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  vertical: string;
  tier: "starter" | "standard" | "premium" | "enterprise";
  price_cents: number;
  currency: string;
  cover_url: string | null;
  demo_url: string | null;
  verified: boolean;
  ai_included: boolean;
  metrics: Record<string, unknown>;
};

const SELECT =
  "id, slug, name, tagline, description, vertical, tier, price_cents, currency, cover_url, demo_url, verified, ai_included, metrics";

export async function listBlueprints(): Promise<{ data: Blueprint[]; error: string | null }> {
  const { data, error } = await supabase
    .from("blueprints")
    .select(SELECT)
    .order("price_cents", { ascending: true });
  return { data: (data as Blueprint[] | null) ?? [], error: friendlyError(error?.message) };
}

export async function getBlueprint(slug: string): Promise<{ data: Blueprint | null; error: string | null }> {
  const { data, error } = await supabase.from("blueprints").select(SELECT).eq("slug", slug).maybeSingle();
  return { data: (data as Blueprint | null) ?? null, error: friendlyError(error?.message) };
}

export type BlueprintScorecard = {
  blueprint_id: string;
  businesses: number;
  orders_90d: number;
  gmv_90d_cents: number;
  reservations_90d: number;
  conversations_90d: number;
  avg_qa_score: number | null;
};

/** Platform-verified per-blueprint activity aggregates (anonymized) — the
 *  trust data no shell-seller can fake. */
export async function getBlueprintScorecards(): Promise<{ data: BlueprintScorecard[]; error: string | null }> {
  const { data, error } = await supabase.rpc("app_blueprint_scorecards");
  return { data: (data as BlueprintScorecard[] | null) ?? [], error: friendlyError(error?.message) };
}

export function formatPrice(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(cents / 100);
}
