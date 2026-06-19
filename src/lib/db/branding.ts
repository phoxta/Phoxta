import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";

// Per-tenant brand/theme. Stored on organizations.branding (jsonb) and read by the
// storefronts via app_resolve_domain, which applies it as CSS variables — so every
// buyer of the same blueprint can look like their own business (logo, palette,
// fonts, shape) without touching code. Owners edit it by hand or generate it with AI.

export type Branding = {
  logo_url?: string;     // primary logo (for light header backgrounds)
  logo_light?: string;   // light/white logo (for dark backgrounds)
  favicon_url?: string;  // browser tab icon
  name?: string;         // display name shown on the storefront (overrides org name)
  tagline?: string;
  description?: string;  // business description (meta description / browser)
  seo?: { title?: string; description?: string; keywords?: string };
  colors?: { primary?: string; accent?: string; bg?: string; text?: string };
  fonts?: { heading?: string; body?: string };
  radius?: string;       // CSS length, e.g. "12px"
};

export const EMPTY_BRANDING: Branding = {
  colors: { primary: "#111111", accent: "#6d5efc", bg: "#ffffff", text: "#111111" },
  fonts: { heading: "Poppins", body: "Inter" },
  radius: "12px",
};

/** A curated set of well-pairing Google Fonts offered in the editor. */
export const FONT_CHOICES = [
  "Inter", "Poppins", "Manrope", "Plus Jakarta Sans", "Outfit", "Sora",
  "DM Sans", "Space Grotesk", "Playfair Display", "Cormorant Garamond",
  "Libre Baskerville", "Lora", "Montserrat", "Work Sans", "Fraunces", "Syne",
];

export async function getBranding(orgId: string): Promise<{ data: Branding; error: string | null }> {
  const { data, error } = await supabase.from("organizations").select("branding").eq("id", orgId).maybeSingle();
  const b = (data as { branding?: Branding } | null)?.branding;
  return { data: b && Object.keys(b).length ? b : { ...EMPTY_BRANDING }, error: friendlyError(error?.message) };
}

export async function saveBranding(orgId: string, branding: Branding): Promise<{ error: string | null }> {
  const { error } = await supabase.from("organizations").update({ branding }).eq("id", orgId);
  return { error: friendlyError(error?.message) };
}

/** Upload a brand asset (logo / favicon) to Storage; returns the public URL.
 *  Stored under the org's folder so RLS scopes writes to members (shared `catalog` bucket). */
export async function uploadBrandImage(orgId: string, file: File): Promise<{ url: string | null; error: string | null }> {
  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  const path = `${orgId}/brand/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("catalog").upload(path, file, { upsert: false, contentType: file.type || undefined });
  if (error) return { url: null, error: friendlyError(error.message) };
  const { data } = supabase.storage.from("catalog").getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

/** AI rebrand: a creative-direction prompt → a cohesive brand the owner can tweak + save. */
export async function aiRebrand(orgId: string, prompt: string): Promise<{ data: Branding | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke("brand-generate", { body: { organizationId: orgId, prompt } });
  if (error) {
    let msg = error.message;
    try { const ctx = await (error as { context?: Response }).context?.json?.(); if (ctx?.error) msg = ctx.error; } catch { /* keep */ }
    return { data: null, error: friendlyError(msg) };
  }
  if ((data as { error?: string })?.error) return { data: null, error: String((data as { error: string }).error) };
  return { data: (data as { branding: Branding }).branding, error: null };
}
