import { supabase } from "@/lib/supabaseClient";
import { trackEvent } from "@/lib/analytics";

// Marketing-site lead capture → the platform-lead edge function
// (platform_leads table + email notification). Used by /contact and
// /startup-school, which previously posted to "#" and dropped every lead.

export type PlatformLeadSource = "contact" | "startup-school" | "careers" | "other";

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

/** Uncontrolled-form handler: reads FormData, submits, reports via callbacks. */
export function leadFormSubmit(
  source: PlatformLeadSource,
  setState: (s: { status: "idle" | "sending" | "sent" | "error"; error?: string }) => void,
) {
  return async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setState({ status: "sending" });
    const { ok, error } = await submitPlatformLead({
      source,
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      message: String(fd.get("message") ?? ""),
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
