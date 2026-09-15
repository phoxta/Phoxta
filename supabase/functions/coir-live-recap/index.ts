// Phoxta — coir-live-recap: what happened in a class, for the people who need it.
//
// Reads the transcript and the chat of one live session and writes a recap:
// a summary, the key points, the questions that were asked, and any action
// items. Two audiences, and they want the same artefact — the learner who
// missed it, and the one who was there and wants their notes.
//
//   input  { organizationId, lessonId, force? }
//   output { recap: { summary, keyPoints[], questions[], actions[] }, cached }
//
// Cached on the lesson: a recap is deterministic enough that regenerating it
// per viewer would be spending tokens to produce the same paragraphs. `force`
// is host-only, for when a class ran long and the transcript grew after the
// first read.
//
// Metered like every other AI feature: assertWithinCap BEFORE the model,
// meter() after, against this school's org — a class that pushes a tenant over
// its monthly allowance must be refused here, not discovered on the invoice.
import { json, preflight } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { modelFor } from "../_shared/models.ts";
import { callJson } from "../_shared/anthropic.ts";
import { assertWithinCap, CAP_REACHED_MESSAGE, meter } from "../_shared/meter.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Enough of a class to be worth summarising. Below this you get nothing. */
const MIN_CHARS = 400;
/** Roughly an hour of speech. Past this the tail is trimmed, not the head. */
const MAX_CHARS = 48_000;

type Recap = {
  summary: string;
  keyPoints: string[];
  questions: string[];
  actions: string[];
};

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  const t0 = Date.now();

  try {
    const body = (await req.json().catch(() => ({}))) as {
      organizationId?: string;
      lessonId?: string;
      force?: boolean;
    };
    const orgId = String(body.organizationId ?? "");
    const lessonId = String(body.lessonId ?? "");
    if (!UUID_RE.test(orgId)) return json({ error: "Missing school." }, 400);
    if (!lessonId || lessonId.length > 120) return json({ error: "Missing class." }, 400);

    const u = await requireUser(req);
    if ("error" in u) return u.error;
    const admin = adminClient();

    // Enrolled at this school? Same proof as coir-live: a cs_profiles row.
    const { data: profile } = await admin
      .from("cs_profiles")
      .select("user_id")
      .eq("organization_id", orgId)
      .eq("user_id", u.userId)
      .maybeSingle();
    if (!profile) return json({ error: "That class could not be found." }, 404);

    const { data: lesson } = await admin
      .from("cs_live_lessons")
      .select("id, title, description, recap")
      .eq("organization_id", orgId)
      .eq("id", lessonId)
      .maybeSingle();
    if (!lesson) return json({ error: "That class could not be found." }, 404);

    const row = lesson as { title?: string; description?: string; recap?: Recap | null };
    const isHost = (await admin.rpc("cs_is_live_host", { p_org: orgId, p_lesson: lessonId, p_uid: u.userId })).data === true;

    // Everyone shares one recap. Only the host may spend tokens redoing it.
    if (row.recap && !(body.force && isHost)) {
      return json({ recap: row.recap, cached: true });
    }

    const [{ data: lines }, { data: chat }] = await Promise.all([
      admin.from("cs_live_transcript").select("speaker_name, text, said_at")
        .eq("organization_id", orgId).eq("live_lesson_id", lessonId)
        .order("said_at", { ascending: true }).limit(4000),
      admin.from("cs_live_chat").select("author_name, body, created_at")
        .eq("organization_id", orgId).eq("live_lesson_id", lessonId)
        .order("created_at", { ascending: true }).limit(500),
    ]);

    const spoken = ((lines ?? []) as { speaker_name?: string; text?: string }[])
      .map((l) => `${l.speaker_name || "Someone"}: ${l.text ?? ""}`)
      .join("\n");
    const said = ((chat ?? []) as { author_name?: string; body?: string }[])
      .map((c) => `${c.author_name || "Someone"}: ${c.body ?? ""}`)
      .join("\n");

    if (spoken.length + said.length < MIN_CHARS) {
      return json({
        error: "There isn't enough of this class recorded yet to summarise. Turn captions on during the session and try again afterwards.",
      }, 422);
    }

    const allowance = await assertWithinCap(admin, orgId);
    if (!allowance.ok) return json({ error: CAP_REACHED_MESSAGE }, 429);

    // Trim the TAIL, not the head: a class opens with what it is about.
    const transcript = spoken.slice(0, MAX_CHARS);

    const model = modelFor("balanced");
    const system = [
      "You write the recap of an online class for the school that ran it.",
      "Write for a learner who missed it and wants to catch up in two minutes.",
      "Use only what is in the transcript and chat. Never invent a fact, a name, a number or a link.",
      "If something was asked and not answered, put it under questions rather than inventing an answer.",
      "Plain British English, no marketing tone, no filler like 'in this session we explored'.",
      'Return JSON: { "summary": string (2-4 sentences), "keyPoints": string[] (3-6), "questions": string[] (0-5, asked but unresolved), "actions": string[] (0-5, things a learner should do next) }',
    ].join("\n");
    const user = [
      `Class: ${row.title ?? "Live session"}`,
      row.description ? `Description: ${row.description}` : "",
      "",
      "TRANSCRIPT:",
      transcript || "(no speech was captured)",
      "",
      "CHAT:",
      said || "(no messages)",
    ].join("\n");

    const r = await callJson<Recap>({ model, system, user, maxTokens: 900 });
    await meter(admin, {
      organizationId: orgId,
      userId: u.userId,
      model: r.model,
      feature: "coir-live-recap",
      tier: "balanced",
      inTok: r.inTok,
      outTok: r.outTok,
      cacheWriteTok: r.cacheWriteTok,
      cacheReadTok: r.cacheReadTok,
      latencyMs: Date.now() - t0,
    });

    const recap: Recap = {
      summary: String(r.data?.summary ?? "").trim(),
      keyPoints: (r.data?.keyPoints ?? []).map(String).slice(0, 6),
      questions: (r.data?.questions ?? []).map(String).slice(0, 5),
      actions: (r.data?.actions ?? []).map(String).slice(0, 5),
    };
    if (!recap.summary) return json({ error: "The recap came back empty. Try again." }, 502);

    const { error: saveErr } = await admin
      .from("cs_live_lessons")
      .update({ recap })
      .eq("organization_id", orgId)
      .eq("id", lessonId);
    // A recap that could not be cached is still a recap; hand it over.
    if (saveErr) console.warn("coir-live-recap: not cached:", saveErr.message);

    return json({ recap, cached: false });
  } catch (err) {
    console.error("coir-live-recap error", err);
    return json({ error: "The recap could not be written. Please try again." }, 500);
  }
});
