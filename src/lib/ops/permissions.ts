// Phoxta ops console — team roles and permission gating.
//
// Roles come straight from `organization_memberships.role`
// (owner | admin | staff | viewer — "staff" is the console's agent role).
//
// ⚠️ HONESTY NOTE — v1 is CLIENT-SIDE gating only. RLS still authorizes on
// membership (any member can write most console tables), so `can()` shapes the
// UI — it hides/disables controls — but it is not a security boundary. Tighten
// the RLS policies per role before treating these as enforcement.

export type OrgRole = "owner" | "admin" | "staff" | "viewer";

export type OrgAction =
  | "manage_settings"          // business name, currency, SLA, routing, locations
  | "manage_team"              // invite members, change roles
  | "manage_billing_support"   // plan, invoices, refund-adjacent actions
  | "use_inbox"                // read + reply in the Inbox
  | "manage_content";          // CMS, saved replies, marketing content

const MATRIX: Record<OrgRole, Record<OrgAction, boolean>> = {
  owner: {
    manage_settings: true,
    manage_team: true,
    manage_billing_support: true,
    use_inbox: true,
    manage_content: true,
  },
  admin: {
    manage_settings: true,
    manage_team: true,
    manage_billing_support: true,
    use_inbox: true,
    manage_content: true,
  },
  // "staff" is the agent seat: works the inbox and content, no settings/team/billing.
  staff: {
    manage_settings: false,
    manage_team: false,
    manage_billing_support: false,
    use_inbox: true,
    manage_content: true,
  },
  // Viewers are read-only everywhere.
  viewer: {
    manage_settings: false,
    manage_team: false,
    manage_billing_support: false,
    use_inbox: false,
    manage_content: false,
  },
};

/** Whether `role` may perform `action`. Unknown roles get viewer treatment. */
export function can(role: OrgRole | string | null | undefined, action: OrgAction): boolean {
  const r = (role ?? "") as OrgRole;
  return (MATRIX[r] ?? MATRIX.viewer)[action];
}

/** Roles an owner/admin may assign to a teammate (the owner seat is immutable). */
export const ASSIGNABLE_ROLES: { value: Exclude<OrgRole, "owner">; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "staff", label: "Agent" },
  { value: "viewer", label: "Viewer" },
];

/** Owner-facing word for a role ("staff" reads as Agent in the console). */
export function roleLabel(role: string): string {
  if (role === "staff") return "Agent";
  return role.charAt(0).toUpperCase() + role.slice(1);
}
