import { track } from "@vercel/analytics";

// One place for funnel events — every money-path CTA reports here.
// Event names are the analytics contract; keep them stable.
export type FunnelEvent =
  | "signup_submitted"
  | "login_submitted"
  | "lead_submitted"
  | "checkout_started"
  | "subscription_started"
  | "plan_cancel_clicked"
  | "demo_opened";

export function trackEvent(name: FunnelEvent, props?: Record<string, string | number>) {
  try {
    track(name, props);
  } catch {
    /* analytics must never break the app */
  }
}
