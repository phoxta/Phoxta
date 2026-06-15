import { supabase } from "@/lib/supabaseClient";

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
  return { data: (data as Blueprint[] | null) ?? [], error: error?.message ?? null };
}

export async function getBlueprint(slug: string): Promise<{ data: Blueprint | null; error: string | null }> {
  const { data, error } = await supabase.from("blueprints").select(SELECT).eq("slug", slug).maybeSingle();
  return { data: (data as Blueprint | null) ?? null, error: error?.message ?? null };
}

export function formatPrice(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(cents / 100);
}
