import { supabase } from "@/lib/supabase";

export type StaffRole =
  | "owner"
  | "school_admin"
  | "programme_manager"
  | "lecturer"
  | "mentor"
  | "content_editor"
  | "support"
  | "finance"
  | "launch_coordinator";
export type StaffAssignment = {
  id: string;
  role: StaffRole;
  scope_type: string;
  scope_id: string;
  expires_at: string | null;
};
export const ROLE_LABELS: Record<StaffRole, string> = {
  owner: "Owner",
  school_admin: "School administrator",
  programme_manager: "Programme manager",
  lecturer: "Lecturer",
  mentor: "Mentor",
  content_editor: "Content editor",
  support: "Learner support",
  finance: "Finance",
  launch_coordinator: "Launch coordinator",
};
const PERMISSIONS: Record<StaffRole, string[]> = {
  owner: ["*"],
  school_admin: [
    "workspace",
    "people",
    "operations",
    "content",
    "publish",
    "teaching",
    "support",
    "reports",
    "invite",
    "settings",
  ],
  programme_manager: [
    "workspace",
    "people",
    "operations",
    "teaching",
    "support",
    "reports",
  ],
  lecturer: ["workspace", "content", "teaching", "assess", "reports"],
  mentor: ["workspace", "mentoring"],
  content_editor: ["workspace", "content"],
  support: ["workspace", "support"],
  finance: ["workspace", "finance"],
  launch_coordinator: ["workspace", "launch"],
};
// UI hints only. SQL checks fresh assignments on every read/write.
export function staffCan(
  assignments: StaffAssignment[],
  permission: string,
  scope?: string,
  id?: string,
): boolean {
  return assignments.some(
    (a) =>
      (!a.expires_at || Date.parse(a.expires_at) > Date.now()) &&
      (PERMISSIONS[a.role]?.includes("*") ||
        PERMISSIONS[a.role]?.includes(permission)) &&
      (!scope ||
        a.scope_type === "school" ||
        (a.scope_type === scope && a.scope_id === id)),
  );
}
export async function schoolCommand<T = { ok: boolean }>(
  org: string,
  action: string,
  data: Record<string, unknown> = {},
  teaching = false,
): Promise<T> {
  const result = await supabase.rpc(
    teaching ? "cs_teaching_command" : "cs_school_command",
    { p_org: org, p_action: action, p_data: data },
  );
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}
export async function schoolRows<T>(
  org: string,
  table: string,
  columns = "*",
): Promise<T[]> {
  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .eq("organization_id", org)
    .limit(500);
  if (error) throw new Error(error.message);
  return data as T[];
}
export const schoolTime = (value: string, timeZone?: string) =>
  new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
export function schoolLocalInput(value: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const part = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}
export async function staffAction<T>(
  body: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(
    "startup-school-staff",
    { body },
  );
  if (error) {
    const context = "context" in error ? error.context : null;
    const detail =
      context instanceof Response
        ? await context
            .clone()
            .json()
            .catch(() => null)
        : null;
    throw new Error(detail?.error ?? error.message);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}
export type Intake = {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  capacity: number | null;
  mentor_sessions: number;
  status: string;
  seats_left?: number | null;
  mentor_weekly_min?: number;
  mentor_weekly_max?: number;
};
export type CourseRow = {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  category_id: string;
  mentor_id: string;
};
export type ClassRow = {
  id: string;
  title: string;
  starts_at: string;
  duration_min: number;
  cohort_id: string | null;
  replay_status: string;
  recording_url: string | null;
  cancelled_at: string | null;
};
export type AssignmentRow = {
  id: string;
  title: string;
  course_id: string;
  cohort_id: string | null;
  brief: string;
  rubric: string;
  due_at: string | null;
};
export type SubmissionRow = {
  id: string;
  assignment_id: string;
  user_id: string;
  body: string;
  feedback: string;
  outcome: string;
  submitted_at: string;
};
export type TicketRow = {
  id: string;
  subject: string;
  body: string;
  reply: string;
  status: string;
  user_id: string;
  created_at: string;
};
export type OrderRow = {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  amount_pence: number;
  refunded_pence: number;
  created_at: string;
};
export type AllocationRow = {
  user_id: string;
  blueprint_id: string | null;
  status: string;
  provisioned_org_id: string | null;
  console_included_until?: string | null;
  checklist: Record<string, boolean>;
  investor_status: string;
  investor_consent_at: string | null;
  shared_materials: string;
};
export type NamedRow = { id: string; name: string; user_id?: string };
export type StaffMemberRow = StaffAssignment & {
  user_id: string;
  active: boolean;
};
export type InviteRow = {
  id: string;
  email: string;
  role: StaffRole;
  scope_type: string;
  scope_id: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
};
export type SchoolSettings = {
  access_policy: string;
  cancellation_policy: string;
  completion_policy: string;
  launch_terms: string;
};
