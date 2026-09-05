/**
 * Typed, validated reads of the build-time environment. Vite inlines `VITE_*`
 * at build, so a missing value here is a deployment mistake, not a runtime
 * condition — but the storefront must still boot (against the bundled demo
 * catalogue) so a prospect never sees a blank page.
 */

const read = (key: keyof ImportMetaEnv): string | undefined => {
    const v = import.meta.env[key];
    return typeof v === "string" && v.length > 0 ? v : undefined;
};

export const ENV = {
    supabaseUrl: read("VITE_SUPABASE_URL"),
    supabaseAnonKey: read("VITE_SUPABASE_ANON_KEY"),
    /** When set, the deployment serves exactly one tenant instead of resolving by host. */
    bakedOrgId: read("VITE_ORG_ID"),
    isDev: import.meta.env.DEV,
} as const;

/** True when the Supabase client has real credentials to talk to. */
export const isBackendConfigured = Boolean(ENV.supabaseUrl && ENV.supabaseAnonKey);
