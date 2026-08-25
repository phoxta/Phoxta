// Phoxta ops console — SLA + routing policy shapes and the pure first-response
// countdown used by the Inbox queue.
//
// Policies live per business inside `agent_config.escalation` (jsonb, member
// RLS) under the `sla` and `routing` keys — the org-level `branding`/`profile`
// jsonbs are returned to ANONYMOUS storefront resolvers by app_resolve_domain,
// so per-team operational config must not live there. The same keys are read
// server-side by the ops-maintenance cron (breach notifications, round-robin).

export type SlaPolicy = {
  enabled: boolean;
  /** First-response target, minutes from the conversation's creation. */
  first_response_minutes: number;
  /** Resolution target, hours from creation (stored for reporting; the queue
   *  chip only tracks first response in v1). */
  resolution_hours: number;
};

export type RoutingPolicy = { mode: "off" | "round_robin" };

export const DEFAULT_SLA: SlaPolicy = { enabled: false, first_response_minutes: 60, resolution_hours: 24 };
export const DEFAULT_ROUTING: RoutingPolicy = { mode: "off" };

/** Parse the `sla` + `routing` keys out of an escalation jsonb, defaulting hard. */
export function parsePolicies(escalation: unknown): { sla: SlaPolicy; routing: RoutingPolicy } {
  const e = (escalation ?? {}) as { sla?: Partial<SlaPolicy>; routing?: Partial<RoutingPolicy> };
  const frm = Number(e.sla?.first_response_minutes);
  const rh = Number(e.sla?.resolution_hours);
  return {
    sla: {
      enabled: e.sla?.enabled === true,
      first_response_minutes: Number.isFinite(frm) && frm > 0 ? Math.round(frm) : DEFAULT_SLA.first_response_minutes,
      resolution_hours: Number.isFinite(rh) && rh > 0 ? Math.round(rh) : DEFAULT_SLA.resolution_hours,
    },
    routing: { mode: e.routing?.mode === "round_robin" ? "round_robin" : "off" },
  };
}

/** Compact duration for the chip: 34m · 3h · 2d. */
export function slaDuration(ms: number): string {
  const m = Math.max(1, Math.round(ms / 60_000));
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

export type SlaChip = { label: string; tone: "plain" | "warn" | "danger"; overdue: boolean };

/**
 * The first-response countdown for one conversation, or null when no chip
 * applies: policy off, already answered (first_response_at is set — an AI
 * reply counts, it sets the same timestamp), resolved/handled/closed, or
 * snoozed (snoozing parks the clock out of sight; the status filter brings it
 * back when the snooze lifts).
 */
export function firstResponseSla(
  conv: { status: string; first_response_at: string | null; created_at: string },
  sla: SlaPolicy | null | undefined,
  now: number = Date.now(),
): SlaChip | null {
  if (!sla?.enabled) return null;
  if (conv.first_response_at) return null;
  if (conv.status !== "open" && conv.status !== "escalated") return null;
  const windowMs = sla.first_response_minutes * 60_000;
  const due = new Date(conv.created_at).getTime() + windowMs;
  const remaining = due - now;
  if (remaining <= 0) return { label: `Overdue ${slaDuration(-remaining)}`, tone: "danger", overdue: true };
  // Warn once less than 20% of the window is left.
  return {
    label: `Due in ${slaDuration(remaining)}`,
    tone: remaining < windowMs * 0.2 ? "warn" : "plain",
    overdue: false,
  };
}
