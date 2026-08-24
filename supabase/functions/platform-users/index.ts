// Phoxta — platform-users: user administration for the platform console.
// One function, four actions: list | create | recovery | ban.
//
// Why an edge function: listing auth users, creating accounts and minting
// password-recovery links are GoTrue ADMIN operations — they need the service
// role and must never ride on tenant RLS. The gate is platform_admins
// membership (the same roster app_is_platform_admin checks), and every write
// is appended to platform_audit so each action has an owner.
//
// `recovery` returns the action link AND the email OTP from the same
// generateLink call. That is deliberate: outbound SMTP is currently down, so
// instead of "an email was sent" (which would never arrive) the admin gets the
// credentials to hand to the customer over whatever channel the support
// conversation is already on.
import { preflight, json } from "../_shared/cors.ts";
import { adminClient, userClient } from "../_shared/supabaseAdmin.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

/** Verify the JWT and require platform_admins membership. */
async function requirePlatformAdmin(req: Request) {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return { error: json({ error: "Please sign in again." }, 401) };
  const { data: ud, error: ue } = await userClient(token).auth.getUser();
  if (ue || !ud?.user) return { error: json({ error: "Please sign in again." }, 401) };

  const admin = adminClient();
  const { data: m } = await admin
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", ud.user.id)
    .maybeSingle();
  if (!m) return { error: json({ error: "Only a platform admin can do that." }, 403) };
  return { admin, userId: ud.user.id, email: ud.user.email ?? "" };
}

/** Best-effort audit append — user admin must not fail because logging did. */
async function audit(admin: Json, actorEmail: string, action: string, target: string, detail: Json) {
  try {
    await admin.from("platform_audit").insert({ actor_email: actorEmail, action, target, detail });
  } catch (_) { /* audited actions still ran */ }
}

const PER_PAGE = 50;

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    const body = (await req.json().catch(() => ({}))) as Json;
    const gate = await requirePlatformAdmin(req);
    if ("error" in gate) return gate.error;
    const { admin, email: actorEmail } = gate;

    // --- list: pageable roster + total, enriched with profile + businesses ---
    if (body.action === "list") {
      const page = Math.max(1, Number(body.page) || 1);
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PER_PAGE });
      if (error) return json({ error: error.message }, 400);

      const users = (data?.users ?? []) as Json[];
      const total = (data as Json)?.total ?? users.length;
      const ids = users.map((u) => u.id);

      // Bulk enrich: display name and how many businesses each user belongs to.
      const [profiles, memberships] = await Promise.all([
        admin.from("profiles").select("id, full_name").in("id", ids),
        admin.from("organization_memberships").select("user_id, organizations(name)").in("user_id", ids),
      ]);
      const nameOf = new Map((profiles.data ?? []).map((p: Json) => [p.id, p.full_name]));
      const orgsOf = new Map<string, string[]>();
      for (const m of (memberships.data ?? []) as Json[]) {
        const list = orgsOf.get(m.user_id) ?? [];
        if (m.organizations?.name) list.push(m.organizations.name);
        orgsOf.set(m.user_id, list);
      }

      const q = String(body.q ?? "").trim().toLowerCase();
      const rows = users
        .map((u) => ({
          id: u.id,
          email: u.email ?? "",
          full_name: nameOf.get(u.id) ?? "",
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at ?? null,
          confirmed: !!u.email_confirmed_at,
          banned: !!u.banned_until && new Date(u.banned_until) > new Date(),
          orgs: orgsOf.get(u.id) ?? [],
        }))
        .filter((u) => !q || `${u.email} ${u.full_name} ${u.orgs.join(" ")}`.toLowerCase().includes(q));

      return json({ users: rows, total, page, perPage: PER_PAGE });
    }

    // --- create: a confirmed account, credentials returned exactly once ------
    if (body.action === "create") {
      const email = String(body.email ?? "").trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "Enter a valid email address." }, 400);
      // The project enforces long passwords; a generated one always satisfies it.
      const password = String(body.password ?? "") ||
        crypto.randomUUID().replace(/-/g, "").slice(0, 12) + "-" + crypto.randomUUID().slice(0, 8) + "Aa1";
      if (password.length < 21) return json({ error: "Password must be at least 21 characters." }, 400);

      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: body.fullName ? { full_name: String(body.fullName) } : undefined,
      });
      if (error) return json({ error: error.message }, 400);
      await audit(admin, actorEmail, "user_create", email, { user_id: data.user?.id });
      // Returned once so the admin can hand them over; never stored or logged.
      return json({ ok: true, userId: data.user?.id, email, password });
    }

    // --- recovery: reset link + OTP for the admin to relay -------------------
    if (body.action === "recovery") {
      const email = String(body.email ?? "").trim().toLowerCase();
      if (!email) return json({ error: "Which user? Pass their email." }, 400);
      const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email });
      if (error) return json({ error: error.message }, 400);
      await audit(admin, actorEmail, "user_recovery_link", email, {});
      return json({
        ok: true,
        email,
        link: data.properties?.action_link ?? null,
        otp: data.properties?.email_otp ?? null,
      });
    }

    // --- ban / unban ---------------------------------------------------------
    if (body.action === "ban") {
      const userId = String(body.userId ?? "");
      if (!userId) return json({ error: "Which user? Pass their id." }, 400);
      const ban = body.ban !== false;
      const { error } = await admin.auth.admin.updateUserById(userId, {
        ban_duration: ban ? "876000h" : "none",
      });
      if (error) return json({ error: error.message }, 400);
      await audit(admin, actorEmail, ban ? "user_ban" : "user_unban", userId, {});
      return json({ ok: true, banned: ban });
    }

    return json({ error: "Unknown action." }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Something went wrong." }, 500);
  }
});
