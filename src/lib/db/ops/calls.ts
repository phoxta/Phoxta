import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";
import { voiceToken } from "@/lib/db/ops/agent";

// Engage → Calls: reads over call_logs plus the browser softphone wiring the
// Inbox already proved out (voice-token → Twilio Voice SDK → voice-outgoing
// TwiML). Kept here so the Calls page and the Inbox share one implementation.

// ---------- Call log ----------
export type CallRow = {
  id: string;
  direction: string;
  outcome: string;
  after_hours: boolean;
  created_at: string;
  recording_url: string | null;
  conversation_id: string | null;
  from_number: string;
  to_number: string;
  duration_sec: number;
  locations: { name: string } | null;
};

export async function listRecentCalls(
  orgId: string,
  opts: { sinceDays?: number; limit?: number } = {},
): Promise<{ data: CallRow[]; error: string | null }> {
  const since = new Date(Date.now() - (opts.sinceDays ?? 30) * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("call_logs")
    .select("id, direction, outcome, after_hours, created_at, recording_url, conversation_id, from_number, to_number, duration_sec, locations(name)")
    .eq("organization_id", orgId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 500);
  return { data: (data as unknown as CallRow[] | null) ?? [], error: friendlyError(error?.message) };
}

// ---------- Recordings ----------
// call_logs.recording_url no longer holds a playable URL. The call-recordings
// bucket is private (0127) and the column carries the object's storage PATH for
// new rows — a legacy row still has the old public URL, which no longer serves.
// Either way the console asks recording-url for a ten-minute signed link; the
// function checks membership, loads the row scoped to the business and parses
// the path out of whichever shape the column holds. Called on demand (a click),
// never for every row in a list: a signed link minted for a row nobody plays is
// a link that exists for nothing.
export async function getRecordingUrl(orgId: string, callLogId: string): Promise<{ url: string | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke("recording-url", { body: { organizationId: orgId, callLogId } });
  if (error) {
    let msg = error.message;
    try {
      const ctx = await (error as { context?: Response }).context?.json?.();
      if (ctx?.error) msg = ctx.error;
    } catch { /* keep generic */ }
    return { url: null, error: friendlyError(msg) };
  }
  const url = (data as { url?: string } | null)?.url ?? null;
  return { url, error: url ? null : "The recording could not be opened." };
}

export type CallStats = {
  total: number;
  inbound: number;
  outbound: number;
  afterHours: number;
  booked: number;
  escalated: number;
};

export function summarizeCalls(rows: CallRow[]): CallStats {
  const s: CallStats = { total: rows.length, inbound: 0, outbound: 0, afterHours: 0, booked: 0, escalated: 0 };
  for (const r of rows) {
    if (r.direction === "inbound") s.inbound += 1;
    else s.outbound += 1;
    if (r.after_hours) s.afterHours += 1;
    if (r.outcome === "booked") s.booked += 1;
    if (r.outcome === "escalated") s.escalated += 1;
  }
  return s;
}

// ---------- Live view (transcript-level, the honest one) ----------
// A voice call in progress IS observable at the transcript level: the Pipecat
// bridge sends each caller turn through the agent, which writes both sides into
// conversation_messages as they happen — so a voice conversation with activity
// in the last couple of minutes is, in all likelihood, a call happening now.
// Audio listen-in/barge is NOT possible with the current wiring (see the Calls
// page's monitoring card), so this deliberately exposes no more than the data
// actually supports.
export type LiveVoiceConversation = {
  id: string;
  customer_name: string;
  customer_phone: string;
  status: string;
  last_message_at: string;
};

export async function listLiveVoiceConversations(
  orgId: string,
  windowSec = 120,
): Promise<{ data: LiveVoiceConversation[]; error: string | null }> {
  const since = new Date(Date.now() - windowSec * 1000).toISOString();
  const { data, error } = await supabase
    .from("conversations")
    .select("id, customer_name, customer_phone, status, last_message_at")
    .eq("organization_id", orgId)
    .eq("channel_type", "voice")
    .eq("is_test", false)
    .neq("status", "closed")
    .gte("last_message_at", since)
    .order("last_message_at", { ascending: false })
    .limit(10);
  return { data: (data as LiveVoiceConversation[] | null) ?? [], error: friendlyError(error?.message) };
}

// ---------- Logging a finished browser call ----------
// Browser calls have no server leg that writes call_logs: voice-outgoing only
// returns TwiML, and place-call is never involved. The console records the
// finished call itself (call_logs RLS allows org members to insert), so a call
// made from the browser lands in the same log as every other call.
export async function logBrowserCall(
  orgId: string,
  to: string,
  durationSec: number,
  conversationId?: string | null,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("call_logs").insert({
    organization_id: orgId,
    conversation_id: conversationId ?? null,
    direction: "outbound",
    to_number: to,
    duration_sec: Math.max(0, Math.round(durationSec)),
    outcome: "completed",
  });
  return { error: friendlyError(error?.message) };
}

// ---------- Browser softphone ----------
// Extracted from the Inbox's "Talk here" wiring so the Calls page shares it:
// voice-token mints a Twilio Voice access token (outgoing-only, scoped to the
// voice-outgoing TwiML app, which dials `To` from the business number), the SDK
// loads lazily, and the operator's microphone/speaker carry the call.
export type Softphone = {
  /** Mute or unmute the operator's microphone. */
  mute: (muted: boolean) => void;
  /** End the call (also destroys the underlying Device). Safe to call twice. */
  hangUp: () => void;
};

export type SoftphoneEvents = {
  /** The customer answered. */
  onAccept?: () => void;
  /** The call is over (any reason). durationSec counts from accept; 0 = never connected. */
  onEnd?: (durationSec: number) => void;
  onError?: (message: string) => void;
};

export async function connectBrowserCall(
  orgId: string,
  to: string,
  ev: SoftphoneEvents,
): Promise<{ phone: Softphone | null; error: string | null }> {
  const { token, error } = await voiceToken(orgId);
  if (error || !token) return { phone: null, error: error ?? "Browser calling isn't configured." };
  try {
    const { Device } = await import("@twilio/voice-sdk");
    const device = new Device(token, { logLevel: "error" });
    const call = await device.connect({ params: { To: to } });
    let acceptedAt = 0;
    let ended = false;
    const end = () => {
      if (ended) return;
      ended = true;
      try {
        call.disconnect();
      } catch {
        /* noop */
      }
      try {
        device.destroy();
      } catch {
        /* noop */
      }
      ev.onEnd?.(acceptedAt ? Math.round((Date.now() - acceptedAt) / 1000) : 0);
    };
    call.on("accept", () => {
      acceptedAt = Date.now();
      ev.onAccept?.();
    });
    call.on("disconnect", end);
    call.on("cancel", end);
    call.on("error", (e: { message?: string }) => {
      ev.onError?.(e?.message ?? "unknown");
      end();
    });
    return {
      phone: {
        mute: (m: boolean) => {
          try {
            call.mute(m);
          } catch {
            /* noop */
          }
        },
        hangUp: end,
      },
      error: null,
    };
  } catch (e) {
    return { phone: null, error: (e as Error)?.message ?? String(e) };
  }
}
