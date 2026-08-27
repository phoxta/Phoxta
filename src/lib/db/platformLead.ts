import { supabase } from "@/lib/supabaseClient";
import { trackEvent } from "@/lib/analytics";

// Marketing-site lead capture → the platform-lead edge function
// (platform_leads table + email notification). Used by /contact and
// /startup-school, which previously posted to "#" and dropped every lead.

export type PlatformLeadSource = "contact" | "startup-school" | "careers" | "other";

/**
 * What Startup School costs and how long it runs.
 *
 * Held in one place because it appears in three: the hero, the signup form, and
 * the confirmation email the applicant receives. A price quoted differently in
 * an email from the one on the page is the kind of mistake that is spotted by
 * the customer rather than by us.
 *
 * The edge function keeps its own copy for the email it sends -- a Deno
 * function cannot import from src/ -- and carries a comment pointing back here.
 * If this changes, change supabase/functions/platform-lead/index.ts with it.
 */
export const STARTUP_SCHOOL = {
  priceGBP: 500,
  weeks: 2,
  /** Rendered wherever the offer is stated. */
  get price() { return `£${this.priceGBP}`; },
  get duration() { return `${this.weeks} weeks`; },
} as const;

/** Where an applicant is starting from. Sent as part of the message so it
 *  reaches the console without a schema change, and so the team can triage a
 *  cohort at a glance. */
export const STAGES = [
  "Just an idea",
  "Building it now",
  "Already trading",
  "Exploring — not sure yet",
] as const;
export type Stage = (typeof STAGES)[number];

export async function submitPlatformLead(input: {
  source: PlatformLeadSource;
  name: string;
  email: string;
  phone?: string;
  message?: string;
  /** Honeypot — leave empty; bots fill it. */
  website?: string;
}): Promise<{ ok: boolean; error: string | null }> {
  const { data, error } = await supabase.functions.invoke("platform-lead", { body: input });
  if (error) {
    let msg = error.message;
    try {
      const ctx = await (error as { context?: Response }).context?.json?.();
      if (ctx?.error) msg = ctx.error;
    } catch {
      /* keep generic */
    }
    return { ok: false, error: msg };
  }
  if ((data as { error?: string })?.error) return { ok: false, error: (data as { error: string }).error };
  return { ok: true, error: null };
}

/**
 * Uncontrolled-form handler: reads FormData, submits, reports via callbacks.
 *
 * Any field beyond the four the table has is folded into the message as a
 * labelled line. That keeps the console readable -- the team sees "Stage: Just
 * an idea" above the applicant's own words -- without a migration for every
 * question a form decides to ask.
 */
export function leadFormSubmit(
  source: PlatformLeadSource,
  setState: (s: { status: "idle" | "sending" | "sent" | "error"; error?: string }) => void,
  extras: ReadonlyArray<[field: string, label: string]> = [],
) {
  return async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setState({ status: "sending" });
    const prefix = extras
      .map(([field, label]) => [label, String(fd.get(field) ?? "").trim()] as const)
      .filter(([, v]) => v)
      .map(([label, v]) => `${label}: ${v}`)
      .join("\n");
    const own = String(fd.get("message") ?? "").trim();
    const { ok, error } = await submitPlatformLead({
      source,
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      message: [prefix, own].filter(Boolean).join("\n\n"),
      website: String(fd.get("website") ?? ""),
    });
    if (ok) {
      trackEvent("lead_submitted", { source });
      form.reset();
      setState({ status: "sent" });
    } else {
      setState({ status: "error", error: error ?? "Something went wrong — please email us instead." });
    }
  };
}
