import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

// The demo gate: the live-demo popup blurs its iframe until the visitor tells
// us who they are, and then leaves them alone for five days.
//
// Recognition is the server's job — it keys the pass on the caller's address
// (hashed) and on the device id below, so clearing a browser or changing
// network doesn't re-ask someone we have already met. What is kept here is a
// cache of the answer, so opening a second demo doesn't wait on a round trip.

/** Keep in step with PASS_DAYS in supabase/functions/demo-access/index.ts. */
export const DEMO_PASS_DAYS = 5;

const DEVICE_KEY = "phoxta-device-id";
const PASS_KEY = "phoxta-demo-pass";

/** The answers we offer for "how did you hear about us". */
export const HEARD_OPTIONS = [
  "Google or another search engine",
  "Instagram, Facebook or X",
  "TikTok or YouTube",
  "LinkedIn",
  "A friend or colleague",
  "Newsletter or podcast",
  "An event or webinar",
  "Other",
] as const;

/** Storage that never throws — private windows and locked-down browsers make
 *  every localStorage call a possible exception, and a demo must still open. */
function readStore(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStore(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* the server still holds the pass by IP */
  }
}

/**
 * A stable id for this browser.
 *
 * The second half of recognition: an address moves when a phone leaves wifi,
 * and an office shares one between everybody. Random and meaningless on
 * purpose — it identifies a browser to our own gate and nothing else.
 */
export function deviceId(): string {
  const existing = readStore(DEVICE_KEY);
  if (existing) return existing;
  const fresh =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  writeStore(DEVICE_KEY, fresh);
  return fresh;
}

/** The cached expiry, if it hasn't run out. */
function cachedPass(): string | null {
  const raw = readStore(PASS_KEY);
  if (!raw) return null;
  const at = Date.parse(raw);
  return Number.isFinite(at) && at > Date.now() ? raw : null;
}

export type DemoPass = { granted: boolean; expiresAt: string | null };

/**
 * Has this visitor been through the gate?
 *
 * Fails OPEN when the backend can't answer. The gate is a lead form, not a
 * paywall: a Supabase blip should cost us a lead, not shut every demo on the
 * site. A definite "no pass" from the server is what locks the popup.
 */
export async function checkDemoAccess(): Promise<DemoPass> {
  const cached = cachedPass();
  if (cached) return { granted: true, expiresAt: cached };
  if (!isSupabaseConfigured) return { granted: true, expiresAt: null };
  try {
    const { data, error } = await supabase.functions.invoke("demo-access", {
      body: { action: "check", device_id: deviceId() },
    });
    if (error) {
      console.warn("[Phoxta] demo gate unreachable — letting the demo through", error.message);
      return { granted: true, expiresAt: null };
    }
    const res = data as { granted?: boolean; expires_at?: string | null };
    if (res?.granted && res.expires_at) writeStore(PASS_KEY, res.expires_at);
    return { granted: Boolean(res?.granted), expiresAt: res?.expires_at ?? null };
  } catch (err) {
    console.warn("[Phoxta] demo gate check failed — letting the demo through", err);
    return { granted: true, expiresAt: null };
  }
}

export type DemoGateInput = {
  name: string;
  email: string;
  phone: string;
  heardAbout: string;
  /** Which demo they were trying to open, for the lead. */
  demoUrl?: string;
  /** Honeypot — leave empty; bots fill it. */
  website?: string;
};

/**
 * Trade the details for a pass. Errors come back as the message to show —
 * telling someone they're in when nothing was recorded is the one outcome
 * worth failing loudly over.
 */
export async function unlockDemoAccess(
  input: DemoGateInput,
): Promise<{ ok: boolean; error: string | null; expiresAt: string | null }> {
  if (!isSupabaseConfigured) return { ok: true, error: null, expiresAt: null };
  const { data, error } = await supabase.functions.invoke("demo-access", {
    body: {
      action: "unlock",
      device_id: deviceId(),
      name: input.name,
      email: input.email,
      phone: input.phone,
      heard_about: input.heardAbout,
      demo_url: input.demoUrl ?? "",
      website: input.website ?? "",
    },
  });
  if (error) {
    let msg = error.message;
    try {
      const ctx = await (error as { context?: Response }).context?.json?.();
      if (ctx?.error) msg = ctx.error;
    } catch {
      /* keep generic */
    }
    return { ok: false, error: msg, expiresAt: null };
  }
  const res = data as { granted?: boolean; expires_at?: string | null; error?: string };
  if (res?.error) return { ok: false, error: res.error, expiresAt: null };
  if (res?.expires_at) writeStore(PASS_KEY, res.expires_at);
  return { ok: true, error: null, expiresAt: res?.expires_at ?? null };
}
