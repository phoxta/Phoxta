// Phoxta — recording-url: a short-lived, member-only link to one call recording.
//
// The call-recordings bucket used to be PUBLIC and call_logs.recording_url held
// the public URL, so anyone who learned a URL — and the path was guessable:
// <org>/<conversation>-<ms>.wav — could listen to a tenant's customer calls with
// no session at all. The bucket is private now (migration 0127), the column
// holds the object's storage PATH for new rows, and this is the only way the
// console turns that path into something an <audio> tag can play: prove
// membership of the business, load the row scoped to it, and mint a signed URL
// that dies in ten minutes.
//
//   input  { organizationId, callLogId }
//   output { url, expiresIn }
//
// Legacy rows still hold the full public-style URL from before the bucket was
// locked. The path is parsed out of those, so old recordings keep playing
// through the same gate rather than through a URL that no longer serves.
import { preflight, json } from "../_shared/cors.ts";
import { authorize } from "../_shared/auth.ts";

const BUCKET = "call-recordings";
/** How long a minted link lives. Long enough to listen to a call, short enough
 *  that a link pasted into a chat is not a permanent leak. */
const TTL_SECONDS = 600;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The storage path a call_logs.recording_url value names, or null.
 *
 * Three shapes reach here: the path itself (new rows), the legacy public URL
 * `<base>/storage/v1/object/public/call-recordings/<path>`, and — defensively —
 * a signed URL of the same bucket. Whatever the shape, the path must sit under
 * THIS org's prefix: the row was loaded scoped to the org, but a path is what
 * gets signed, and a stray value must never sign another tenant's object.
 */
export function recordingPath(value: string, orgId: string): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  let path = raw;
  if (/^https?:\/\//i.test(raw)) {
    const m = raw.match(new RegExp(`/storage/v1/object/(?:public|sign|authenticated)/${BUCKET}/([^?#]+)`, "i"));
    if (!m) return null;
    try {
      path = decodeURIComponent(m[1]);
    } catch {
      return null;
    }
  }
  if (!path.startsWith(`${orgId}/`) || path.includes("..") || path.length > 300) return null;
  return path;
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const body = (await req.json().catch(() => ({}))) as { organizationId?: string; callLogId?: string };
    const callLogId = String(body?.callLogId ?? "");
    if (!UUID_RE.test(callLogId)) return json({ error: "Missing call." }, 400);

    const a = await authorize(req, body?.organizationId);
    if (a.error) return a.error;
    const { admin, org } = a.ok;

    const { data: row } = await admin
      .from("call_logs")
      .select("id, recording_url")
      .eq("id", callLogId)
      .eq("organization_id", org.id)
      .maybeSingle();
    if (!row) return json({ error: "That call could not be found." }, 404);

    const path = recordingPath(String((row as { recording_url?: string | null }).recording_url ?? ""), org.id);
    if (!path) return json({ error: "No recording was captured for this call." }, 404);

    const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(path, TTL_SECONDS);
    if (error || !data?.signedUrl) {
      console.error("[phoxta] recording-url: could not sign", path, error?.message);
      return json({ error: "The recording could not be opened right now." }, 502);
    }
    return json({ url: data.signedUrl, expiresIn: TTL_SECONDS });
  } catch (err) {
    console.error("recording-url error", err);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
