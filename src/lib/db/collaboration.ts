import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";

// --- Team invitations ------------------------------------------------------
export type Invitation = {
  id: string;
  organization_id: string;
  email: string;
  role: "admin" | "staff" | "viewer";
  status: "pending" | "accepted" | "revoked";
  created_at: string;
  organizations?: { name: string } | null;
};

/** Invitations for a business (RLS: members see their org's invites). */
export async function listInvitations(orgId: string): Promise<{ data: Invitation[]; error: string | null }> {
  const { data, error } = await supabase
    .from("organization_invitations")
    .select("id, organization_id, email, role, status, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  return { data: (data as Invitation[] | null) ?? [], error: friendlyError(error?.message) };
}

/** Invite a teammate by email (RLS: only owners/admins). */
export async function inviteMember(
  orgId: string,
  invitedBy: string,
  email: string,
  role: Invitation["role"],
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("organization_invitations").insert({
    organization_id: orgId,
    invited_by: invitedBy,
    email: email.trim().toLowerCase(),
    role,
  });
  return { error: friendlyError(error?.message) };
}

export async function revokeInvitation(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("organization_invitations")
    .update({ status: "revoked" })
    .eq("id", id);
  return { error: friendlyError(error?.message) };
}

/** Pending invitations addressed to the signed-in user's email. */
export async function listMyInvitations(): Promise<{ data: Invitation[]; error: string | null }> {
  const { data, error } = await supabase
    .from("organization_invitations")
    .select("id, organization_id, email, role, status, created_at, organizations(name)")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  return { data: (data as unknown as Invitation[] | null) ?? [], error: friendlyError(error?.message) };
}

/** Accept an invitation: joins the business via a SECURITY DEFINER function. */
export async function acceptInvitation(id: string): Promise<{ orgId: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc("app_accept_invitation", { p_invitation: id });
  if (error) return { orgId: null, error: friendlyError(error.message) };
  if (!data) return { orgId: null, error: "That invitation is no longer available." };
  return { orgId: data as string, error: null };
}

// --- Notifications ---------------------------------------------------------
export type Notification = {
  id: string;
  title: string;
  body: string;
  kind: "info" | "invite" | "billing" | "network" | "ai";
  link: string | null;
  read: boolean;
  created_at: string;
};

export async function listNotifications(limit = 20): Promise<{ data: Notification[]; error: string | null }> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, title, body, kind, link, read, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return { data: (data as Notification[] | null) ?? [], error: friendlyError(error?.message) };
}

export async function markNotificationRead(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
  return { error: friendlyError(error?.message) };
}

export async function markAllNotificationsRead(): Promise<{ error: string | null }> {
  const { error } = await supabase.from("notifications").update({ read: true }).eq("read", false);
  return { error: friendlyError(error?.message) };
}
