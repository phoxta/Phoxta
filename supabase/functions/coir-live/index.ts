// Phoxta — coir-live: the server half of a Coir Six live class.
//
// Two jobs a browser must never do for itself:
//
//   1. MINT A ROOM TOKEN. The media-server API secret authorises everything, so
//      it stays here. This endpoint decides who may join which room, and — the
//      part that actually matters — whether they may publish video at all. A
//      class has a stage: the mentor and whoever they bring up. Everyone else
//      gets `canPublish: false` in the grant, which the media server enforces,
//      so a learner cannot put themselves on screen by editing the page.
//
//   2. RUN THE HOST ACTIONS. Muting someone, changing their permissions,
//      removing them, closing the room — all server API calls. Each re-checks
//      that the caller really is this class's host (`cs_is_live_host`) before it
//      touches anything, because "the UI only shows this button to hosts" is not
//      a permission system.
//
//   input  { op: "token" | "mute" | "stage" | "remove" | "end" | "recording",
//            organizationId, lessonId, ... }
//   output per op; `token` returns { url, token, role, canPublish }
//
// NOT `authorize()`. That helper requires an `organization_memberships` row, and
// a Coir Six learner is a STUDENT of the school, not staff — every learner would
// get a 403. Tenancy is proved by a `cs_profiles` row instead, which is exactly
// what "is enrolled at this school" means here.
//
// If LIVEKIT_* is unset this answers 501 and the app quietly falls back to its
// presence-only room, so a school that has not set up a media server still has
// a working class page. That fallback is the reason this returns a clean error
// rather than throwing.
import { json, preflight } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { adminClient, userClient } from "../_shared/supabaseAdmin.ts";

type Op = "token" | "mute" | "stage" | "remove" | "end" | "recording";

type Body = {
  op?: Op;
  organizationId?: string;
  lessonId?: string;
  identity?: string;
  trackSid?: string;
  onStage?: boolean;
  url?: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** How long a room token lives. Longer than any class, shorter than a session. */
const TTL_SECONDS = 4 * 60 * 60;
/** How early a learner may walk in, and how long after the end they may return. */
const EARLY_MIN = 15;
const LATE_MIN = 15;
/** A host may open the room well before the hour to set up. */
const HOST_EARLY_MIN = 60;

const env = (k: string) => Deno.env.get(k) ?? "";

// ── the token ───────────────────────────────────────────────────────────────

const b64url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64urlStr = (s: string): string => b64url(new TextEncoder().encode(s));

/**
 * A LiveKit access token: a plain HS256 JWT whose `video` claim is the grant.
 *
 * Hand-rolled rather than pulling `livekit-server-sdk` into Deno — it is a
 * signature over two JSON objects, and the rest of this codebase already signs
 * HMACs with `crypto.subtle` (see `_shared/internalProof.ts`).
 */
async function mintToken(opts: {
  apiKey: string;
  apiSecret: string;
  identity: string;
  name: string;
  metadata: string;
  room: string;
  canPublish: boolean;
  admin: boolean;
  ttl?: number;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: opts.apiKey,
    sub: opts.identity,
    nbf: now - 10,
    exp: now + (opts.ttl ?? TTL_SECONDS),
    jti: crypto.randomUUID(),
    name: opts.name,
    metadata: opts.metadata,
    video: {
      room: opts.room,
      roomJoin: true,
      canPublish: opts.canPublish,
      canSubscribe: true,
      // Chat, reactions and the spotlight ride the data channel, so everyone
      // needs this — including a learner who may not publish media.
      canPublishData: true,
      // The raised hand is a participant attribute, updated by its owner.
      canUpdateOwnMetadata: true,
      roomAdmin: opts.admin,
      roomRecord: opts.admin,
    },
  };
  const head = b64urlStr(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64urlStr(JSON.stringify(payload));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(opts.apiSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${head}.${body}`));
  return `${head}.${body}.${b64url(new Uint8Array(sig))}`;
}

/** The media server's HTTP API lives where its WebSocket URL points. */
const httpBase = (wsUrl: string): string => wsUrl.replace(/^ws:/i, "http:").replace(/^wss:/i, "https:").replace(/\/+$/, "");

/** LiveKit's server API is Twirp: one POST per method, JSON in, JSON out. */
async function rpc(method: string, payload: Record<string, unknown>): Promise<Response> {
  const token = await mintToken({
    apiKey: env("LIVEKIT_API_KEY"),
    apiSecret: env("LIVEKIT_API_SECRET"),
    identity: "phoxta-server",
    name: "Coir Six",
    metadata: "",
    room: String(payload.room ?? ""),
    canPublish: false,
    admin: true,
    ttl: 60,
  });
  return await fetch(`${httpBase(env("LIVEKIT_URL"))}/twirp/livekit.RoomService/${method}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// ── the endpoint ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const op: Op = body.op ?? "token";
    const orgId = String(body.organizationId ?? "");
    const lessonId = String(body.lessonId ?? "");
    if (!UUID_RE.test(orgId)) return json({ error: "Missing school." }, 400);
    if (!lessonId || lessonId.length > 120) return json({ error: "Missing class." }, 400);

    const u = await requireUser(req);
    if ("error" in u) return u.error;
    const userId = u.userId;

    const admin = adminClient();
    // `cs_end_live` and `cs_set_recording` are SECURITY DEFINER functions that
    // check `auth.uid()`. Under the service-role client that is NULL and they
    // refuse, so those two run as the caller — which also re-proves host-ness
    // inside the database rather than trusting this process to have checked.
    const asUser = userClient((req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, ""));

    // Enrolled at this school? A cs_profiles row is what that means here.
    const { data: profile } = await admin
      .from("cs_profiles")
      .select("name, hue, photo_url")
      .eq("organization_id", orgId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!profile) return json({ error: "That class could not be found." }, 404);

    // The lesson, scoped to the school. A wrong tenant is a 404, not a 403 —
    // there is no reason to confirm another school's timetable exists.
    const { data: lesson } = await admin
      .from("cs_live_lessons")
      .select("id, title, room_id, status, starts_at, duration_min")
      .eq("organization_id", orgId)
      .eq("id", lessonId)
      .maybeSingle();
    if (!lesson) return json({ error: "That class could not be found." }, 404);

    const room = String((lesson as { room_id?: string }).room_id ?? "") ||
      `cs-${orgId.replace(/-/g, "")}-${lessonId}`;

    const { data: hostFlag } = await admin.rpc("cs_is_live_host", {
      p_org: orgId,
      p_lesson: lessonId,
      p_uid: userId,
    });
    const isHost = hostFlag === true;

    if (op !== "token" && !isHost) {
      return json({ error: "Only the mentor running this class can do that." }, 403);
    }

    // Host-only, and app-level rather than media-server-level.
    if (op === "recording") {
      const url = String(body.url ?? "");
      if (!/^https?:\/\//i.test(url) || url.length > 2000) return json({ error: "Missing recording." }, 400);
      const { error } = await asUser.rpc("cs_set_recording", { p_org: orgId, p_lesson: lessonId, p_url: url });
      if (error) return json({ error: "The recording could not be published." }, 502);
      return json({ ok: true });
    }

    if (!env("LIVEKIT_URL") || !env("LIVEKIT_API_KEY") || !env("LIVEKIT_API_SECRET")) {
      // Deliberately not an error the learner sees: the app falls back to the
      // presence-only room when this comes back non-2xx.
      return json({ error: "No media server is configured for live classes." }, 501);
    }

    if (op === "token") {
      const startsAt = new Date(String((lesson as { starts_at?: string }).starts_at ?? "")).getTime();
      const durationMin = Number((lesson as { duration_min?: number }).duration_min ?? 60);
      const status = String((lesson as { status?: string }).status ?? "scheduled");
      const now = Date.now();
      const opensAt = startsAt - (isHost ? HOST_EARLY_MIN : EARLY_MIN) * 60_000;
      const closesAt = startsAt + (durationMin + LATE_MIN) * 60_000;

      if (status === "ended") return json({ error: "This class has finished. The recording follows shortly." }, 409);
      // A class that is already running is always open — a session that overruns
      // should not lock out the person trying to rejoin after a dropped wifi.
      if (status !== "live" && (now < opensAt || now > closesAt)) {
        return json(
          { error: now < opensAt ? "This class hasn't opened yet." : "This class is over." },
          409,
        );
      }

      const p = profile as { name?: string; hue?: string; photo_url?: string };
      const token = await mintToken({
        apiKey: env("LIVEKIT_API_KEY"),
        apiSecret: env("LIVEKIT_API_SECRET"),
        identity: userId,
        name: p.name ?? "Learner",
        // The tile needs a name, a tint and a face; the token is the only thing
        // that reaches every other participant, so they travel in it.
        metadata: JSON.stringify({
          name: p.name ?? "Learner",
          hue: p.hue ?? "lilac",
          photoUrl: p.photo_url ?? undefined,
          role: isHost ? "host" : "learner",
        }),
        room,
        // The whole point: only the host starts on stage. Everyone else is
        // promoted by the host, through `stage` below.
        canPublish: isHost,
        admin: isHost,
      });

      return json({ url: env("LIVEKIT_URL"), token, role: isHost ? "host" : "learner", canPublish: isHost, room });
    }

    const identity = String(body.identity ?? "");
    if (op !== "end" && !identity) return json({ error: "Missing participant." }, 400);

    if (op === "mute") {
      const trackSid = String(body.trackSid ?? "");
      if (!trackSid) return json({ error: "Nothing to mute." }, 400);
      const res = await rpc("MutePublishedTrack", { room, identity, track_sid: trackSid, muted: true });
      if (!res.ok) {
        console.error("coir-live mute failed", res.status, await res.text());
        return json({ error: "That didn't go through." }, 502);
      }
      return json({ ok: true });
    }

    if (op === "stage") {
      const onStage = body.onStage === true;
      const res = await rpc("UpdateParticipant", {
        room,
        identity,
        permission: {
          can_subscribe: true,
          can_publish: onStage,
          can_publish_data: true,
          can_update_metadata: true,
        },
      });
      if (!res.ok) {
        console.error("coir-live stage failed", res.status, await res.text());
        return json({ error: "That didn't go through." }, 502);
      }
      return json({ ok: true, onStage });
    }

    if (op === "remove") {
      const res = await rpc("RemoveParticipant", { room, identity });
      if (!res.ok) {
        console.error("coir-live remove failed", res.status, await res.text());
        return json({ error: "That didn't go through." }, 502);
      }
      return json({ ok: true });
    }

    // op === "end": close the room, then close the class.
    const res = await rpc("DeleteRoom", { room });
    if (!res.ok) console.error("coir-live end: DeleteRoom", res.status, await res.text());
    const { error } = await asUser.rpc("cs_end_live", { p_org: orgId, p_lesson: lessonId });
    if (error) console.error("coir-live end: cs_end_live", error.message);
    return json({ ok: true });
  } catch (err) {
    console.error("coir-live error", err);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
