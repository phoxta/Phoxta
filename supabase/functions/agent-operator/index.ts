// Phoxta — agent-operator: the owner's AI operator. One agent per tenant that can
// READ the business's data (RAG + structured) and PERFORM changes via the write
// tools — every write governed by per-tool policy (off/approve/auto), queued for
// approval where required, and audited. Reuses the existing agent runner + metering.
import { preflight, json } from "../_shared/cors.ts";
import { authorize } from "../_shared/auth.ts";
import { modelFor } from "../_shared/models.ts";
import { runAgent } from "../_shared/anthropic.ts";
import { speak, SPEECH_VOICES, type SpeechVoice } from "../_shared/openai.ts";
import { READ_TOOLS, OWNER_READ_TOOLS, OPERATOR_READ_TOOLS, MEMORY_TOOLS, toolRunner, memoryContext } from "../_shared/tools.ts";
import { WRITE_TOOLS, isWriteTool, executeAction } from "../_shared/actions.ts";
import { isAdminRole } from "../_shared/auth.ts";
import { meter } from "../_shared/meter.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const body = await req.json().catch(() => ({})) as Json;
    const orgId: string | undefined = body?.organizationId;
    const a = await authorize(req, orgId);
    if (a.error) return a.error;
    const ctx = a.ok;
    const message = String(body?.message ?? "");
    const history = Array.isArray(body?.history) ? body.history.slice(-8) : [];
    if (!message) return json({ error: "Empty message." }, 400);

    // Voice notes. Declared here rather than in _shared/tools.ts because the
    // audio has to come back to the CALLER as an attachment, not just to the
    // model as a string — the sink below collects what a turn produced.
    const artifacts: { kind: string; path: string; name: string; mime: string; size: number }[] = [];
    const SPEAK_TOOL = {
      name: "speak",
      description:
        "Record a voice note: render a script to audio in the business's speaking voice and attach it to your reply. " +
        "Use whenever the owner asks to HEAR something — a call opening, a pitch, a greeting, how you would offer a " +
        "product, a voicemail script. Write the script exactly as it should be spoken (no stage directions), then call " +
        "this. You CAN produce audio; never tell the owner you cannot.",
      input_schema: {
        type: "object",
        properties: {
          script: { type: "string", description: "The words to say, exactly as spoken." },
          voice: { type: "string", description: `Optional voice: ${SPEECH_VOICES.join(", ")}.` },
          style: { type: "string", description: "Optional delivery note, e.g. 'warm and unhurried'." },
        },
        required: ["script"],
      },
    };

    async function makeVoiceNote(input: Json): Promise<string> {
      const script = String((input as Json)?.script ?? "").trim();
      if (!script) return "No script was given to read.";
      const asked = String((input as Json)?.voice ?? "").toLowerCase();
      const voice = (SPEECH_VOICES as string[]).includes(asked) ? (asked as SpeechVoice) : "alloy";
      const style = String((input as Json)?.style ?? "").trim() || undefined;
      try {
        // Prefer THIS business's configured call voice, so the note sounds like
        // the agent the customer actually hears. Falls back to the project voice.
        const { data: vcfg } = await ctx.admin.from("agent_config")
          .select("voice").eq("organization_id", orgId).maybeSingle();
        const v = (vcfg as Json)?.voice ?? {};
        const orgVoiceId = v?.provider === "cartesia" && v?.voice_id ? String(v.voice_id) : undefined;
        const bytes = await speak(script, voice, style, orgVoiceId);
        const path = `${orgId}/${crypto.randomUUID()}-voice-note.mp3`;
        const { error } = await ctx.admin.storage.from("operator-files")
          .upload(path, bytes, { contentType: "audio/mpeg", upsert: false });
        if (error) throw new Error(error.message);
        artifacts.push({ kind: "audio", path, name: "voice-note.mp3", mime: "audio/mpeg", size: bytes.byteLength });
        // The model gets the script back so its written reply can quote it.
        return `Voice note recorded in the "${voice}" voice and attached to this reply. Script: ${script}`;
      } catch (e) {
        // Say what the owner can DO about it. The raw provider payload is a wall
        // of JSON; the two failures that actually happen are no key and no credit.
        const raw = (e as Error).message ?? "";
        const why = /insufficient_quota|credit_balance_exhausted|billing/i.test(raw)
          ? "the text-to-speech account is out of credit — top it up and I can record this straight away"
          : /OPENAI_API_KEY|not configured/i.test(raw)
            ? "no text-to-speech provider is configured for this project yet"
            : raw;
        // Still hand back the script: the chat can read any message aloud with
        // the browser's own voice (free, no provider), so the owner can hear it
        // even when no recording could be made.
        return `I could not record a saveable voice note: ${why}. Here is exactly what I would say, word for word — ` +
          `press the speaker on this message to hear it read aloud: ${script}`;
      }
    }

    const read = toolRunner(ctx.admin, orgId as string);
    const callerIsAdmin = isAdminRole(ctx.role);
    /**
     * Show a design in the chat.
     *
     * Declared here rather than in _shared/tools.ts for the same reason `speak`
     * is: the picture has to reach the OWNER as an attachment, and a shared
     * read tool can only hand a string back to the model.
     *
     * IT SHOWS THE STORED PICTURE, which is the point. media_url on a scheduled
     * post is exactly this file, so what the owner is shown before approving is
     * the file that will be posted — not a fresh render that might differ from
     * it. A design whose picture is missing says so rather than showing
     * something older.
     */
    const SHOW_DESIGN_TOOL = {
      name: "show_design",
      description:
        "Show the owner one of the business's designs in this chat — it renders as the design itself, live. Use it before scheduling a post so " +
        "they can see what will go out, and whenever they ask what a design looks like. Give the design's title from " +
        "list_designs. It works even for a design that has never been rendered. You CAN show designs; never tell the owner you cannot.",
      input_schema: {
        type: "object",
        properties: { design: { type: "string", description: "The design's title, from list_designs." } },
        required: ["design"],
      },
    };

    async function showDesign(input: Json): Promise<string> {
      const title = String(input?.design ?? "").trim();
      if (!title) return "Which design? Use list_designs to see them.";
      const { data: d } = await ctx.admin.from("designs")
        .select("id, title").eq("organization_id", orgId)
        .ilike("title", `%${title}%`).limit(1).maybeSingle();
      if (!d) return `No design matching "${title}". Use list_designs to see them.`;

      // A REFERENCE, NOT A FILE. The console renders it with the studio's own
      // renderer, so the owner sees the live document rather than a picture of
      // whatever it looked like the last time somebody saved it — and a design
      // that has never been rendered can still be shown, which the old
      // attach-the-PNG version could not do.
      artifacts.push({
        kind: "design",
        path: String((d as Json).id),
        name: String((d as Json).title ?? "Design"),
        mime: "application/x-phoxta-design",
        size: 0,
      });
      return `Showing "${(d as Json).title}" in this reply — the owner can see it.`;
    }

    const runner = async (name: string, input: Json): Promise<string> =>
      name === "speak"
        ? await makeVoiceNote(input)
        : name === "show_design"
        ? await showDesign(input)
        : isWriteTool(name)
          ? await executeAction(ctx.admin, orgId as string, ctx.userId, name, input, callerIsAdmin)
          : await read(name, input);

    const mem = await memoryContext(ctx.admin, orgId as string);
    const { data: cfg } = await ctx.admin.from("agent_config").select("procedures").eq("organization_id", orgId).maybeSingle();
    const procedures = String(cfg?.procedures ?? "").trim();
    const system =
      `You are the AI operator for "${ctx.org.name}" (${ctx.org.vertical || "small business"}). ` +
      `You help the owner run the business. Answer from their real data using the read tools, and make changes using the write tools. ` +
      `You can act across the whole platform: products and orders, CRM contacts, invoices, bookings and reservations, content, support tickets, marketing campaigns, locations, and Google Workspace — and you can reach customers directly by placing phone calls or sending SMS, WhatsApp or email. Reference things by name (e.g. a customer or product) and the tools will resolve them. ` +
      `You can also RECORD AUDIO: the speak tool renders a script to a voice note attached to your reply, so you can let the owner hear a call opening, a pitch or a greeting. If recording is unavailable, still write the script — the chat can read any message aloud in the browser's own voice at no cost. Never say you are unable to produce audio. ` +
      `Be concise and concrete; when you change something, state exactly what changed. Some write actions need the owner's approval — ` +
      `if a tool reports an action was queued, tell the owner to approve it in Agent → Operator. Use the remember tool when the owner shares a lasting preference or fact. Never invent data — always use a tool.` +
      (procedures ? `\n\nOPERATING PROCEDURES (set by the owner — follow exactly):\n${procedures}` : "") +
      (mem ? `\n\nWhat you remember about this business:\n${mem}` : "");

    const t0 = Date.now();
    const model = modelFor("balanced");
    const r = await runAgent({
      model,
      system,
      userMessage: message,
      history,
      tools: [...READ_TOOLS, ...OWNER_READ_TOOLS, ...OPERATOR_READ_TOOLS, ...MEMORY_TOOLS, ...WRITE_TOOLS, SPEAK_TOOL, SHOW_DESIGN_TOOL],
      toolRunner: runner,
      maxTurns: 8,
      maxTokens: 1500,
    });
    await meter(ctx.admin, { organizationId: orgId as string, userId: ctx.userId, model: r.model, feature: "operator", tier: "balanced", inTok: r.inTok, outTok: r.outTok, cacheWriteTok: r.cacheWriteTok, cacheReadTok: r.cacheReadTok, latencyMs: Date.now() - t0 });
    return json({ reply: r.text, toolCalls: r.toolCalls, attachments: artifacts });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
