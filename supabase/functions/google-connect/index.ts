// Phoxta — google-connect: returns the Google consent URL to connect a business's
// Google Workspace (member-authed), or disconnects it. The actual code→token
// exchange happens in the public `google-oauth` callback.
import { preflight, json } from "../_shared/cors.ts";
import { authorize } from "../_shared/auth.ts";
import { GOOGLE_SCOPES, redirectUri, signState } from "../_shared/google.ts";

const env = (k: string) => Deno.env.get(k) ?? "";

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const body = await req.json().catch(() => ({}));
    const orgId = (body as { organizationId?: string })?.organizationId;
    const action = (body as { action?: string })?.action ?? "url";
    const a = await authorize(req, orgId);
    if (a.error) return a.error;

    if (action === "disconnect") {
      await a.ok.admin.from("google_connections").delete().eq("organization_id", a.ok.org.id);
      return json({ ok: true });
    }

    if (!env("GOOGLE_CLIENT_ID")) return json({ error: "Google isn't configured yet." }, 400);
    const state = await signState({ org: a.ok.org.id, uid: a.ok.userId, exp: Date.now() + 600_000 });
    const params = new URLSearchParams({
      client_id: env("GOOGLE_CLIENT_ID"),
      redirect_uri: redirectUri(),
      response_type: "code",
      scope: GOOGLE_SCOPES,
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state,
    });
    return json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
