// Phoxta — platform-users: user administration for the platform console.
// One function: list | create | recovery | ban | businesses | grant | revoke.
//
// Why an edge function: listing auth users, creating accounts and minting
// password-recovery links are GoTrue ADMIN operations — they need the service
// role and must never ride on tenant RLS. The gate is platform_admins
// membership (the same roster app_is_platform_admin checks), and every write
// is appended to platform_audit so each action has an owner.
//
// `grant` and `revoke` exist because creating an account was only half of
// giving someone access. Every console in the product is reached through
// organization_memberships — that is what listMyOrganizations reads and what
// app_is_org_member enforces — so a freshly created account belongs to nothing
// and lands on "No business to run yet". There was no way to fix that from the
// platform console, or from anywhere else in the product, short of writing the
// row by hand in SQL.
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

/** The roles organization_memberships' CHECK constraint allows. */
const ROLES = ["owner", "admin", "staff", "viewer"];

Deno.serve(async (req): Promise<Response> => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    const body = (await req.json().catch(() => ({}))) as Json;
    const gate = await requirePlatformAdmin(req);
    // Truthiness, not `in`: TypeScript gives the success branch an implicit
  // `error?: undefined`, so `in` does not discriminate and the handler infers
  // `Response | undefined` — which is how a fall-through would hide here.
  if (gate.error) return gate.error;
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
        admin.from("organization_memberships")
          .select("user_id, organization_id, role, organizations(name)").in("user_id", ids),
      ]);
      const nameOf = new Map((profiles.data ?? []).map((p: Json) => [p.id, p.full_name]));
      // Both shapes are returned: `orgs` is the plain list of names the roster
      // already showed, `access` carries the id and role the new grant/revoke
      // controls need. A name is not an id, and revoking wants an id.
      const orgsOf = new Map<string, string[]>();
      const accessOf = new Map<string, Json[]>();
      for (const m of (memberships.data ?? []) as Json[]) {
        const list = orgsOf.get(m.user_id) ?? [];
        if (m.organizations?.name) list.push(m.organizations.name);
        orgsOf.set(m.user_id, list);
        const acc = accessOf.get(m.user_id) ?? [];
        acc.push({ orgId: m.organization_id, name: m.organizations?.name ?? "(removed)", role: m.role });
        accessOf.set(m.user_id, acc);
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
          access: accessOf.get(u.id) ?? [],
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

    // --- businesses: the roster to grant access to -------------------------
    if (body.action === "businesses") {
      const q = String(body.q ?? "").trim();
      let sel = admin.from("organizations").select("id, name, vertical, stage").order("name");
      if (q) sel = sel.ilike("name", `%${q}%`);
      const { data, error } = await sel.limit(200);
      if (error) return json({ error: error.message }, 400);
      return json({ businesses: data ?? [] });
    }

    // --- grant / revoke: membership of a business ---------------------------
    //
    // The role vocabulary is the one the table's own CHECK constraint allows.
    // Anything else is rejected here rather than surfaced as a Postgres
    // constraint violation, which reads to an admin as "something broke".
    if (body.action === "grant" || body.action === "revoke") {
      const userId = String(body.userId ?? "");
      const orgId = String(body.orgId ?? "");
      if (!userId || !orgId) return json({ error: "Which user, and which business?" }, 400);

      // Confirm both ends exist before writing. A membership row pointing at a
      // deleted business is invisible in every list and impossible to remove
      // from the console.
      const [{ data: org }, { data: who }] = await Promise.all([
        admin.from("organizations").select("id, name").eq("id", orgId).maybeSingle(),
        admin.auth.admin.getUserById(userId),
      ]);
      if (!org) return json({ error: "That business no longer exists." }, 404);
      if (!who?.user) return json({ error: "That account no longer exists." }, 404);

      if (body.action === "revoke") {
        const { error } = await admin.from("organization_memberships")
          .delete().eq("organization_id", orgId).eq("user_id", userId);
        if (error) return json({ error: error.message }, 400);
        await audit(admin, actorEmail, "access_revoke", who.user.email ?? userId, { org_id: orgId, org: org.name });
        return json({ ok: true });
      }

      const role = String(body.role ?? "staff");
      if (!ROLES.includes(role)) return json({ error: `Role must be one of ${ROLES.join(", ")}.` }, 400);

      // Upsert, so granting access twice changes the role rather than failing
      // on the primary key — which is what an admin means by doing it again.
      const { error } = await admin.from("organization_memberships")
        .upsert({ organization_id: orgId, user_id: userId, role }, { onConflict: "organization_id,user_id" });
      if (error) return json({ error: error.message }, 400);
      await audit(admin, actorEmail, "access_grant", who.user.email ?? userId, { org_id: orgId, org: org.name, role });
      return json({ ok: true, role });
    }

    return json({ error: "Unknown action." }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Something went wrong." }, 500);
  }
});
