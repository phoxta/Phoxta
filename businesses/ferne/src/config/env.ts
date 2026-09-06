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
    /**
     * Agent endpoint override. Derived from the Supabase URL when unset — the
     * storefront cannot function without that variable anyway, so the in-store
     * advisor can never be silently disabled by a forgotten env var.
     */
    agentUrl:
        read("VITE_AGENT_URL") ??
        (read("VITE_SUPABASE_URL")
            ? `${read("VITE_SUPABASE_URL")!.replace(/\/+$/, "")}/functions/v1/agent-inbound`
            : undefined),
    agentPublicKey: read("VITE_AGENT_PUBLIC_KEY"),
    isDev: import.meta.env.DEV,
} as const;

/** True when the Supabase client has real credentials to talk to. */
export const isBackendConfigured = Boolean(ENV.supabaseUrl && ENV.supabaseAnonKey);
