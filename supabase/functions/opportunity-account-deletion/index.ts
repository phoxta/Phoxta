import { preflight, json } from "../_shared/cors.ts";
import { adminClient, userClient } from "../_shared/supabaseAdmin.ts";

async function clearWorkspaceFiles(
  db: ReturnType<typeof adminClient>,
  orgId: string,
  workspaceId: string,
) {
  const bucket = db.storage.from("phoxta-opportunity-private");
  const prefix = `${orgId}/${workspaceId}`;
  for (let offset = 0; ; ) {
    const listed = await bucket.list(prefix, {
      limit: 100,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (listed.error)
      throw new Error("Private storage could not be enumerated.");
    const paths = (listed.data ?? [])
      .filter((item) => item.id)
      .map((item) => `${prefix}/${item.name}`);
    if (paths.length) {
      const removed = await bucket.remove(paths);
      if (removed.error)
        throw new Error("Private storage could not be cleared.");
    }
    if ((listed.data?.length ?? 0) < 100) break;
    // Deleted rows collapse the page, so continue at the same offset until empty.
  }
}

Deno.serve(async (req) => {
  const early = preflight(req);
  if (early) return early;
  const origin = Deno.env.get("PHOXTA_APP_ORIGIN") ?? "https://www.phoxta.com";
  const allowed = [
    origin,
    ...(Deno.env.get("PHOXTA_ALLOWED_ORIGINS") ?? "")
      .split(",")
      .filter(Boolean),
  ];
  if (
    req.headers.get("origin") &&
    !allowed.includes(req.headers.get("origin")!)
  )
    return json({ error: "Origin not allowed." }, 403);
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const token = (req.headers.get("authorization") ?? "").replace(
    /^Bearer\s+/i,
    "",
  );
  if (!token) return json({ error: "Sign in to continue." }, 401);
  const client = userClient(token);
  const [{ data: auth }, adminCheck] = await Promise.all([
    client.auth.getUser(),
    client.rpc("app_is_platform_admin"),
  ]);
  if (!auth.user || adminCheck.error || adminCheck.data !== true)
    return json({ error: "Platform administrator required." }, 403);
  try {
    const raw = await req.text();
    if (raw.length > 2000) return json({ error: "Request too large." }, 413);
    const body = JSON.parse(raw);
    if (!body.confirmed || typeof body.request_id !== "string")
      return json({ error: "Confirm a valid account deletion request." }, 400);
    const db = adminClient();
    const request = await db
      .from("opportunity_privacy_requests")
      .select("id,user_id,request_type,status")
      .eq("id", body.request_id)
      .single();
    if (
      request.error ||
      request.data.request_type !== "delete_account" ||
      !request.data.user_id
    )
      return json({ error: "Deletion request unavailable." }, 404);
    const account = await db
      .from("opportunity_accounts")
      .select("org_id,billing_status")
      .eq("user_id", request.data.user_id)
      .maybeSingle();
    if (
      account.data &&
      !["free", "canceled", "incomplete_expired"].includes(
        account.data.billing_status,
      )
    ) {
      await db
        .from("opportunity_privacy_requests")
        .update({
          status: "retention_review",
          retention_reason:
            "Cancel or resolve the active subscription before account deletion.",
        })
        .eq("id", body.request_id);
      return json(
        {
          error:
            "Resolve the active subscription before deleting this account.",
        },
        409,
      );
    }
    const workspaces = await db
      .from("opportunity_workspaces")
      .select("id,org_id")
      .eq("owner_user_id", request.data.user_id);
    if (workspaces.error)
      throw new Error("Owned workspaces could not be loaded.");
    for (const workspace of workspaces.data ?? [])
      await clearWorkspaceFiles(db, workspace.org_id, workspace.id);
    const prepared = await db.rpc("opportunity_prepare_account_deletion", {
      p_request: body.request_id,
      p_confirmed: true,
      p_storage_deleted: true,
    });
    if (prepared.error || !prepared.data?.ready)
      throw new Error("Deletion preparation did not complete.");
    const deleted = await db.auth.admin.deleteUser(request.data.user_id, false);
    if (deleted.error) {
      await db
        .from("opportunity_privacy_requests")
        .update({
          status: "retention_review",
          retention_reason:
            "Product data was cleared but identity deletion needs an administrator retry.",
        })
        .eq("id", body.request_id);
      throw new Error("Identity deletion needs a retry.");
    }
    await db
      .from("opportunity_privacy_requests")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", body.request_id);
    return json({ completed: true, receipt: body.request_id });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "account_deletion_failed",
        error_type: error instanceof Error ? error.name : "unknown",
      }),
    );
    return json(
      {
        error:
          error instanceof Error ? error.message : "Account deletion failed.",
      },
      500,
    );
  }
});
