/**
 * Build-time configuration. Metro inlines EXPO_PUBLIC_* from .env / .env.local,
 * so these are baked into the bundle — public, client-safe values only.
 */
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
/** Pin the build to one school (a white-label build). Empty = the learner picks their school. */
export const BAKED_ORG_ID = process.env.EXPO_PUBLIC_ORG_ID || undefined;
/** Where the bundled images live (the web app serves them from /images). */
export const MEDIA_BASE = process.env.EXPO_PUBLIC_MEDIA_BASE ?? "https://demo.coir-six.phoxta.com";
/** Every school's web address ends with this; the school picker completes it. */
export const SCHOOL_HOST_SUFFIX = ".coir-six.phoxta.com";

export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
