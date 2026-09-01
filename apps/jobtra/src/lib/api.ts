// Jobtra's AI backend moved from a local Express server to a Supabase edge
// function (jobtra-ai) that reuses Phoxta's Gemini key. The app still calls its
// original '/api/...' paths; this rewrites them to the edge function URL. The
// /jobtra page's CSP already allows connect-src to *.supabase.co.
const SUPABASE_URL = ((import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "").replace(/\/+$/, "");
const BASE = `${SUPABASE_URL}/functions/v1/jobtra-ai`;

/** Map an original '/api/<route>' path to the Supabase edge function URL. */
export function apiUrl(path: string): string {
    const route = path.replace(/^\/?api\//, "").replace(/^\/+/, "");
    return `${BASE}/${route}`;
}
