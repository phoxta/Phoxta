// Phoxta — automation-run: proactive + AI automations. Two modes:
//  - { automationId }         → a member runs one automation now (returns output)
//  - { mode: "cron" } + x-cron-secret → run every DUE scheduled AI automation
// An ai_briefing composes a summary from the business's data (read tools) and emails
// it; an ai_task runs the owner's instruction through the governed write tools.
import { preflight, json } from "../_shared/cors.ts";
import { authorize, requireUser, isAdminRole } from "../_shared/auth.ts";
import { adminClient, type SupabaseClient } from "../_shared/supabaseAdmin.ts";
import { modelFor } from "../_shared/models.ts";
import { runAgent } from "../_shared/anthropic.ts";
import { READ_TOOLS, OWNER_READ_TOOLS, OPERATOR_READ_TOOLS, MEMORY_TOOLS, toolRunner, memoryContext } from "../_shared/tools.ts";
import { WRITE_TOOLS, isWriteTool, executeAction } from "../_shared/actions.ts";
import { meter } from "../_shared/meter.ts";
import { dispatch } from "../_shared/dispatch.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

/** How many due automations one cron tick will run. Bounded so one tenant with a
 *  backlog of scheduled automations cannot monopolise a single five-minute tick. */
const PER_TICK = 25;

async function ownerEmail(admin: SupabaseClient, orgId: string): Promise<string | null> {
  const { data: org } = await admin.from("organizations").select("owner_user_id").eq("id", orgId).maybeSingle();
  const uid = (org as Json)?.owner_user_id;
  if (!uid) return null;
  try {
    const { data } = await admin.auth.admin.getUserById(uid);
    return data?.user?.email ?? null;
  } catch {
    return null;
  }
}

// ── Scheduling (P9) ───────────────────────────────────────────────────────────
// A daily automation should land at run_hour in the OWNER's timezone — "08:00
// where they are", not "twenty hours after it last happened". The wall-clock hour
// is computed with Intl in the automation's IANA zone; DST is handled by reading
// the zone's offset at the guessed instant and correcting for it.

/** Local wall-clock components of a UTC instant in a given IANA zone. Throws if
 *  the zone is invalid (Intl rejects it) — computeNextRun catches that. */
function zonedParts(date: Date, timeZone: string): { y: number; mo: number; d: number; h: number; mi: number; s: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
  const p: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) p[part.type] = part.value;
  let h = Number(p.hour);
  if (h === 24) h = 0; // some engines render midnight as 24
  return { y: Number(p.year), mo: Number(p.month), d: Number(p.day), h, mi: Number(p.minute), s: Number(p.second) };
}

/** The UTC instant at which local wall-clock time in `timeZone` is
 *  y-mo-d hour:00:00. Guess-and-correct by the zone's offset at the guessed
 *  instant — exact outside the ~1h/year DST fold, which does not matter for a
 *  briefing hour. Date.UTC normalises day overflow, so callers may pass d+i. */
function zonedTimeToUtc(y: number, mo: number, d: number, hour: number, timeZone: string): Date {
  const guess = Date.UTC(y, mo - 1, d, hour, 0, 0);
  const local = zonedParts(new Date(guess), timeZone);
  const localAsUtc = Date.UTC(local.y, local.mo - 1, local.d, local.h, local.mi, local.s);
  const offset = localAsUtc - guess; // ms local is ahead of UTC at that instant
  return new Date(guess - offset);
}

/** First instant strictly after `after` at which local time in `timeZone` is
 *  runHour:00. */
function nextHourInZone(runHour: number, timeZone: string, after: Date): Date {
  const base = zonedParts(after, timeZone);
  for (let i = 0; i < 400; i++) {
    const cand = zonedTimeToUtc(base.y, base.mo, base.d + i, runHour, timeZone);
    if (cand.getTime() > after.getTime()) return cand;
  }
  return new Date(after.getTime() + 864e5);
}

/** When a scheduled automation should next run, as a UTC instant.
 *  Daily → the next run_hour:00 in the automation's IANA timezone.
 *  Weekly → the run_hour boundary at least six days out (≈7 days, landing on the
 *  hour rather than drifting by the tick's minutes). A bad/absent timezone falls
 *  back to a plain +1/+7 days, so a typo never wedges the scheduler. */
function computeNextRun(a: Json, now: Date): Date {
  const weekly = a.trigger === "schedule_weekly";
  const runHour = Math.min(23, Math.max(0, Math.round(Number(a.run_hour ?? 8))));
  const tz = String(a.timezone || "UTC");
  try {
    const after = weekly ? new Date(now.getTime() + 6 * 864e5) : now;
    return nextHourInZone(runHour, tz, after);
  } catch {
    return new Date(now.getTime() + (weekly ? 7 : 1) * 864e5);
  }
}

/** Whether an automation's creator is an owner/admin of the org. Unknown creator
 *  (null, or no membership row) → false, so an unattended write defaults to the
 *  approval queue rather than firing on the tool's own 'auto' policy. */
async function creatorIsAdmin(admin: SupabaseClient, orgId: string, createdBy: string | null | undefined): Promise<boolean> {
  if (!createdBy) return false;
  const { data } = await admin.from("organization_memberships").select("role")
    .eq("organization_id", orgId).eq("user_id", createdBy).maybeSingle();
  return isAdminRole((data as { role?: string } | null)?.role);
}

async function runOne(admin: SupabaseClient, automation: Json, opts: { isAdmin: boolean; actorId: string | null }): Promise<string> {
  const { isAdmin, actorId } = opts;
  const orgId = automation.organization_id;
  const { data: orgRow } = await admin.from("organizations").select("name, vertical").eq("id", orgId).maybeSingle();
  const cfg = automation.config ?? {};
  const isTask = automation.action === "ai_task";
  const instruction = (cfg.instruction && String(cfg.instruction).trim()) ||
    (isTask
      ? "Carry out the task for this business."
      : "Give the owner a short, concrete briefing on the business right now: revenue/orders, anything that needs attention (low stock, unfulfilled orders, pending reservations, open tickets, reviews needing a reply), and one suggestion. Use the read tools; be specific with numbers, a few short lines.");

  const read = toolRunner(admin, orgId);
  const runner = async (name: string, input: Json): Promise<string> =>
    // A1: the automation runs at its CREATOR's role (or, for a manual run, the
    // caller's). A member's run — or a task whose creator we cannot identify — is
    // NOT admin, so any tool set to 'auto' is downgraded to the approval queue
    // rather than firing unattended. Source 'automation' tags every audit row
    // with which leg acted; actorId attributes it to the person behind the row.
    isWriteTool(name)
      ? await executeAction(admin, orgId, actorId, name, input, isAdmin, { source: "automation" })
      : await read(name, input);

  const mem = await memoryContext(admin, orgId);
  // Briefing memory (audit 2026-08-18): briefings used to repeat themselves —
  // feed the previous run's output back so each briefing reports what CHANGED.
  let previous = "";
  if (!isTask) {
    const { data: lastRun } = await admin
      .from("automation_runs")
      .select("output")
      .eq("automation_id", automation.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    previous = String(lastRun?.output ?? "").slice(0, 1500);
  }
  const system =
    `You are the AI operator for "${(orgRow as Json)?.name ?? "this business"}" (${(orgRow as Json)?.vertical ?? "small business"}). ` +
    (isTask
      ? "Carry out the owner's instruction using your tools; write actions may require their approval. "
      : "Produce a concise, concrete briefing from the business's REAL data using the read tools. Plain text, a few short lines. ") +
    "Never invent data — always use a tool." +
    (previous ? `\n\nYour PREVIOUS briefing said:\n${previous}\n\nDo not repeat it — lead with what changed since, and only restate a number when it moved.` : "") +
    (mem ? `\n\nWhat you remember about this business:\n${mem}` : "");

  const t0 = Date.now();
  const model = modelFor("balanced");
  const r = await runAgent({
    model, system, userMessage: instruction,
    tools: isTask
      ? [...READ_TOOLS, ...OWNER_READ_TOOLS, ...OPERATOR_READ_TOOLS, ...MEMORY_TOOLS, ...WRITE_TOOLS]
      : [...READ_TOOLS, ...OWNER_READ_TOOLS, ...OPERATOR_READ_TOOLS, ...MEMORY_TOOLS],
    toolRunner: runner, maxTurns: 6, maxTokens: 1200,
  });
  await meter(admin, { organizationId: orgId, userId: "automation", model: r.model, feature: "automation", tier: "balanced", inTok: r.inTok, outTok: r.outTok, cacheWriteTok: r.cacheWriteTok, cacheReadTok: r.cacheReadTok, latencyMs: Date.now() - t0 });

  const output = r.text || "(no output)";
  if ((cfg.channel ?? "email") === "email") {
    const to = await ownerEmail(admin, orgId);
    if (to) await dispatch("email", to, `${automation.name} · ${(orgRow as Json)?.name ?? "Phoxta"}`, output);
  }
  await admin.from("automation_runs").insert({ organization_id: orgId, automation_id: automation.id, status: "ok", output });
  await admin.from("automations").update({ last_run_at: new Date().toISOString(), runs: (automation.runs ?? 0) + 1 }).eq("id", automation.id);
  return output;
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const body = await req.json().catch(() => ({})) as Json;
    const admin = adminClient();

    if (body?.mode === "cron") {
      const u = await requireUser(req);
      if ("error" in u || u.userId !== "cron") return json({ error: "Cron only." }, 401);

      // Candidates: due scheduled AI automations. A null next_run_at means the row
      // was never scheduled (created before 0128, or brand new) — it is picked up
      // here and given a next_run_at on first sight. Bounded to N per tick.
      const nowIso = new Date().toISOString();
      const { data: candidates, error: candErr } = await admin.from("automations").select("*")
        .in("trigger", ["schedule_daily", "schedule_weekly"]).eq("active", true)
        .in("action", ["ai_briefing", "ai_task"])
        .or(`next_run_at.is.null,next_run_at.lte.${nowIso}`)
        .order("next_run_at", { ascending: true, nullsFirst: true })
        .limit(PER_TICK);
      if (candErr) {
        console.error("[phoxta] automation-run: due query failed:", candErr.message);
        return json({ error: candErr.message }, 500);
      }

      let ran = 0, failed = 0, skipped = 0;
      for (const a of ((candidates as Json[]) ?? [])) {
        // P3 — atomic claim + reschedule in ONE statement. The WHERE re-checks the
        // due condition, so if another tick claimed this row between the select and
        // here the update returns nothing and we skip it: no double run. And
        // next_run_at is advanced BEFORE the work, so a FAILING automation is
        // already scheduled for its next slot and cannot retry every five minutes.
        const next = computeNextRun(a, new Date());
        const { data: claimed } = await admin.from("automations")
          .update({ last_run_at: nowIso, next_run_at: next.toISOString() })
          .eq("id", a.id)
          .or(`next_run_at.is.null,next_run_at.lte.${nowIso}`)
          .select("*")
          .maybeSingle();
        if (!claimed) { skipped++; continue; } // another tick won the race

        const c = claimed as Json;
        const isAdmin = await creatorIsAdmin(admin, c.organization_id, c.created_by);
        try {
          await runOne(admin, c, { isAdmin, actorId: c.created_by ?? null });
          ran++;
        } catch (e) {
          // Do NOT swallow. Record the failure as a run row (so the console shows
          // it) and log it. next_run_at is already advanced by the claim above.
          failed++;
          const msg = String((e as Error)?.message || e);
          console.error("[phoxta] automation-run failed", c.id, msg);
          await admin.from("automation_runs").insert({
            organization_id: c.organization_id, automation_id: c.id, status: "failed", output: msg.slice(0, 2000),
          });
        }
      }
      return json({ ran, failed, skipped });
    }

    const { data: a } = await admin.from("automations").select("*").eq("id", body?.automationId).maybeSingle();
    if (!a) return json({ error: "Automation not found." }, 404);
    const auth = await authorize(req, (a as Json).organization_id);
    if (auth.error) return auth.error;
    // Manual run: the caller's OWN role decides whether 'auto' tools fire or queue.
    // A plain member can trigger an existing automation but cannot have it make an
    // unattended write — the same downgrade the operator applies to a member.
    const output = await runOne(admin, a, { isAdmin: isAdminRole(auth.ok.role), actorId: auth.ok.userId });
    return json({ output });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
